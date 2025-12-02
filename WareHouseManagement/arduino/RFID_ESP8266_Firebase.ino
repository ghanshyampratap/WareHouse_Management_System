// RoomA.ino  (Upload to NodeMCU for Room A)
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <SPI.h>
#include <MFRC522.h>
#include <time.h>
#include <vector>

#define SS_PIN  D2
#define RST_PIN D1

MFRC522 rfid(SS_PIN, RST_PIN);

// ===== CONFIG =====
const char* ssid     = "Airtel_Singh's_Wifi"; // <-- REPLACE
const char* password = "Singh@12345";        // <-- REPLACE
const char* FIREBASE_HOST = "warehousemanagementsyste-21664-default-rtdb.firebaseio.com"; // <-- REPLACE if needed

const char* ROOM_NAME = "Room A";
const char* ESP_ID    = "ESP_A";

const char* NTP_SERVER = "pool.ntp.org";
const long GMT_OFFSET_SEC = 19800; // IST
const int DAYLIGHT_OFFSET_SEC = 0;

unsigned long lastItemsLoad = 0;
const unsigned long ITEMS_REFRESH_MS = 5UL * 60UL * 1000UL; // 5 minutes

// Debounce per-board
String lastSeenTag = "";
unsigned long lastSeenMs = 0;
const unsigned long DEBOUNCE_MS = 300; // 300 ms

// Per-item cooldown after a movement is recorded
const unsigned long MIN_MOVE_INTERVAL_MS = 800; // 800 ms

struct ItemEntry {
  String rfidTag;
  String id;
  String name;
  String currentLocation;
  unsigned long lastMovementMs;
};

std::vector<ItemEntry> registeredItems;

// ===== helpers =====
String uidToString(const MFRC522::Uid &uid) {
  String s = "";
  for (byte i = 0; i < uid.size; i++) {
    if (uid.uidByte[i] < 0x10) s += "0";
    s += String(uid.uidByte[i], HEX);
  }
  s.toUpperCase();
  return "RFID" + s;
}

void printUIDRaw(const MFRC522::Uid &uid) {
  Serial.print("UID bytes: ");
  for (byte i = 0; i < uid.size; i++) {
    if (uid.uidByte[i] < 0x10) Serial.print("0");
    Serial.print(uid.uidByte[i], HEX);
    Serial.print(" ");
  }
  Serial.println();
}

String normalizeTag(const String &raw) {
  String s = raw;
  s.trim();
  s.toUpperCase();
  return s;
}

String stripPrefix(const String &tag) {
  if (tag.startsWith("RFID")) return tag.substring(4);
  return tag;
}

// ===== Firebase REST helpers =====
String firebaseGET(const String &path) {
  if (WiFi.status() != WL_CONNECTED) return "";
  WiFiClientSecure client; client.setInsecure();
  HTTPClient http;
  String url = "https://" + String(FIREBASE_HOST) + path;
  http.begin(client, url);
  http.setTimeout(15000);
  http.addHeader("Accept", "application/json");
  int code = http.GET();
  String payload = "";
  if (code > 0) payload = http.getString();
  else Serial.printf("GET failed: %d\n", code);
  http.end();
  return payload;
}

int firebasePUT(const String &path, const String &json) {
  if (WiFi.status() != WL_CONNECTED) return -1;
  WiFiClientSecure client; client.setInsecure();
  HTTPClient http;
  String url = "https://" + String(FIREBASE_HOST) + path;
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  int code = http.PUT(json);
  http.end();
  return code;
}

int firebasePOST(const String &path, const String &json) {
  if (WiFi.status() != WL_CONNECTED) return -1;
  WiFiClientSecure client; client.setInsecure();
  HTTPClient http;
  String url = "https://" + String(FIREBASE_HOST) + path;
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(json);
  http.end();
  return code;
}

// ===== JSON extract helpers =====
String extractField(const String &json, const String &field) {
  int idx = json.indexOf(field);
  if (idx < 0) return "";
  int colon = json.indexOf(':', idx);
  int q1 = json.indexOf('"', colon + 1);
  int q2 = json.indexOf('"', q1 + 1);
  if (q1 < 0 || q2 <= q1) return "";
  return json.substring(q1 + 1, q2);
}
String extractItemId(const String &json) { return extractField(json, "\"id\""); }
String extractItemName(const String &json) { return extractField(json, "\"name\""); }
String extractCurrentLocation(const String &json) { return extractField(json, "\"currentLocation\""); }

// ===== Load registered items into local cache =====
void loadRegisteredTags() {
  Serial.println("Loading registered items from Firebase...");
  String itemsJson = firebaseGET("/items.json");
  if (itemsJson.length() < 5 || itemsJson == "null") {
    Serial.println("No items or failed to fetch items.json");
    registeredItems.clear();
    lastItemsLoad = millis();
    return;
  }

  registeredItems.clear();
  int pos = 0;
  while (true) {
    int rfIdx = itemsJson.indexOf("\"rfidTag\"", pos);
    if (rfIdx < 0) break;
    int objStart = itemsJson.lastIndexOf('{', rfIdx);
    int objEnd = itemsJson.indexOf('}', rfIdx);
    if (objStart < 0 || objEnd < 0) { pos = rfIdx + 1; continue; }

    String itemJson = itemsJson.substring(objStart, objEnd + 1);
    String id = extractItemId(itemJson);
    String name = extractItemName(itemJson);
    String loc  = extractCurrentLocation(itemJson);
    String rtag = extractField(itemJson, "\"rfidTag\"");
    rtag = normalizeTag(rtag);

    if (rtag.length() > 0 && id.length() > 0) {
      ItemEntry e; e.rfidTag = rtag; e.id = id; e.name = name; e.currentLocation = loc; e.lastMovementMs = 0;
      registeredItems.push_back(e);
      Serial.print("Loaded: ["); Serial.print(rtag); Serial.print("] -> "); Serial.println(name);
    }

    pos = objEnd + 1;
  }

  lastItemsLoad = millis();
  Serial.printf("Total loaded: %d\n", (int)registeredItems.size());
  Serial.println("---------------------------------");
}

// ===== Find with fallback reload =====
bool findRegisteredItem(const String &rawTag, ItemEntry &outEntry, size_t &indexOut) {
  String t = normalizeTag(rawTag);
  String tNo = stripPrefix(t);

  for (size_t i = 0; i < registeredItems.size(); ++i) {
    String stored = registeredItems[i].rfidTag;
    String storedNo = stripPrefix(stored);
    if (stored == t || stored == tNo || storedNo == t || storedNo == tNo) {
      outEntry = registeredItems[i];
      indexOut = i;
      return true;
    }
  }

  // reload once and retry
  Serial.println("Local lookup failed - reloading items and retrying...");
  loadRegisteredTags();
  for (size_t i = 0; i < registeredItems.size(); ++i) {
    String stored = registeredItems[i].rfidTag;
    String storedNo = stripPrefix(stored);
    if (stored == t || stored == tNo || storedNo == t || storedNo == tNo) {
      outEntry = registeredItems[i];
      indexOut = i;
      return true;
    }
  }
  return false;
}

// ===== Unregistered logging =====
void logUnregistered(const String &rfidTag) {
  time_t now_sec = time(nullptr);
  unsigned long long epoch_ms = (unsigned long long)now_sec * 1000ULL + (unsigned long)(millis() % 1000);
  String j = "{";
  j += "\"rfidTag\":\"" + rfidTag + "\",";
  j += "\"detectedAt\":" + String(epoch_ms);
  j += "}";
  firebasePOST("/unregisteredReads.json", j);
}

void setup() {
  Serial.begin(115200);
  delay(100);
  SPI.begin();
  rfid.PCD_Init();

  Serial.println();
  Serial.println("RFID -> Firebase (Room A)");
  Serial.print("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) { delay(500); Serial.print("."); attempts++; }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) { Serial.println("WiFi connected"); Serial.println(WiFi.localIP()); }
  else Serial.println("WiFi connection failed");

  Serial.println("Syncing time (NTP)...");
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);
  time_t now = time(nullptr);
  int tries = 0;
  while (now < 1600000000 && tries < 20) { delay(500); Serial.print("."); now = time(nullptr); tries++; }
  if (now >= 1600000000) { struct tm t; gmtime_r(&now,&t); Serial.print("\nTime: "); Serial.println(asctime(&t)); }
  else Serial.println("\nNTP failed");

  loadRegisteredTags();
  Serial.println("Ready! Place RFID tag near reader...");
}

void loop() {
  if (!rfid.PICC_IsNewCardPresent()) { delay(50); return; }
  if (!rfid.PICC_ReadCardSerial()) { delay(50); return; }

  String rfidTag = uidToString(rfid.uid);
  rfidTag.toUpperCase();
  printUIDRaw(rfid.uid);

  unsigned long nowMs = millis();
  if (lastSeenTag.length() > 0 && rfidTag == lastSeenTag && (nowMs - lastSeenMs) < DEBOUNCE_MS) {
    rfid.PICC_HaltA();
    delay(150);
    return;
  }

  Serial.print("Normalized Tag: "); Serial.println(rfidTag);
  Serial.print("Room: "); Serial.println(ROOM_NAME);

  lastSeenTag = rfidTag;
  lastSeenMs = nowMs;

  if (millis() - lastItemsLoad > ITEMS_REFRESH_MS) loadRegisteredTags();

  ItemEntry entry;
  size_t idx = 0;
  if (!findRegisteredItem(rfidTag, entry, idx)) {
    Serial.println("✖ Tag NOT registered in database. Logging and ignoring.");
    logUnregistered(rfidTag);
    rfid.PICC_HaltA();
    delay(800);
    return;
  }

  Serial.print("Item found: "); Serial.println(entry.name);

  // prevent tiny duplicates using local movement timestamp
  if (nowMs - registeredItems[idx].lastMovementMs < MIN_MOVE_INTERVAL_MS) {
    Serial.println("⏱ Movement recently recorded for this item locally — ignoring small duplicate.");
    rfid.PICC_HaltA();
    delay(150);
    return;
  }

  // --- Fetch latest item data from Firebase to avoid stale cache issues ---
  String singleItemJson = firebaseGET("/items/" + entry.id + ".json");

  String latestLocation = entry.currentLocation; // fallback
  if (singleItemJson.length() > 5 && singleItemJson != "null") {
    String extracted = extractCurrentLocation(singleItemJson);
    if (extracted.length() > 0) {
      latestLocation = extracted;
      registeredItems[idx].currentLocation = latestLocation;
    }
  } else {
    Serial.println("Warning: failed to fetch single item from DB, using cached location.");
  }

  Serial.print("Current (live) Location: ");
  Serial.println(latestLocation);

  if (latestLocation != String(ROOM_NAME)) {
    Serial.println(">>> MOVEMENT DETECTED (live check)! <<<");

    time_t now_sec = time(nullptr);
    unsigned long long epoch_ms = (unsigned long long)now_sec * 1000ULL + (unsigned long)(millis() % 1000);
    struct tm tinfo; gmtime_r(&now_sec, &tinfo);
    Serial.print("Timestamp (ms): "); Serial.println(epoch_ms);
    Serial.print("Time (UTC): "); Serial.print(asctime(&tinfo));

    String movementJson = "{";
    movementJson += "\"itemId\":\"" + entry.id + "\",";
    movementJson += "\"itemName\":\"" + entry.name + "\",";
    movementJson += "\"rfidTag\":\"" + rfidTag + "\",";
    movementJson += "\"fromLocation\":\"" + latestLocation + "\",";
    movementJson += "\"toLocation\":\"" + String(ROOM_NAME) + "\",";
    movementJson += "\"timestamp\":" + String(epoch_ms);
    movementJson += "}";
    int postResult = firebasePOST("/movements.json", movementJson);
    if (postResult > 0) Serial.println("✓ Movement recorded!");

    String updateJson = "{";
    updateJson += "\"currentLocation\":\"" + String(ROOM_NAME) + "\",";
    updateJson += "\"lastUpdated\":" + String(epoch_ms);
    updateJson += "}";
    int putResult = firebasePUT("/items/" + entry.id + ".json", updateJson);
    if (putResult > 0) {
      Serial.println("✓ Item location updated!");
      registeredItems[idx].currentLocation = String(ROOM_NAME);
      registeredItems[idx].lastMovementMs = millis();
      lastItemsLoad = millis();
    }

    firebasePUT("/rooms/roomA/items/" + entry.id + ".json", String(ROOM_NAME) == "Room A" ? "true" : "null");
    firebasePUT("/rooms/roomB/items/" + entry.id + ".json", String(ROOM_NAME) == "Room B" ? "true" : "null");

    Serial.println("✓ Sync complete");
  } else {
    Serial.println("ℹ Item already in this room (live). No movement.");
    registeredItems[idx].lastMovementMs = millis();
  }

  rfid.PICC_HaltA();
  delay(150);
}
