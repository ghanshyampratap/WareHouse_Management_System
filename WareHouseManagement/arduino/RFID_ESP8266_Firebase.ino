// RFID_ESP8266_Firebase.ino
// ESP8266 (NodeMCU) + RC522 + Firebase Realtime Database
// Upload this code to your ESP8266 boards

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <time.h>

// Pin definitions for NodeMCU
#define SS_PIN  D2   // GPIO4
#define RST_PIN D1   // GPIO5

MFRC522 rfid(SS_PIN, RST_PIN);

// ====== CONFIGURATION - CHANGE THESE ======

// WiFi credentials - CHANGE TO YOUR WIFI
const char* ssid     = "Airtel_Singh's_Wifi";
const char* password = "Singh@12345";

// Firebase database URL (WITHOUT https:// and WITHOUT trailing slash)
const char* FIREBASE_HOST = "warehousemanagementsyste-21664-default-rtdb.firebaseio.com";

// Room configuration
// For ESP #1 (Room A): ROOM_NAME = "Room A"; ESP_ID = "ESP_A";
// For ESP #2 (Room B): ROOM_NAME = "Room B"; ESP_ID = "ESP_B";
const char* ROOM_NAME = "Room A";   // <--- CHANGE THIS for each ESP
const char* ESP_ID    = "ESP_A";    // <--- CHANGE THIS for each ESP

// ==========================================

String uidToString(const MFRC522::Uid &uid) {
  String s = "";
  for (byte i = 0; i < uid.size; i++) {
    if (uid.uidByte[i] < 0x10) s += "0";
    s += String(uid.uidByte[i], HEX);
  }
  s.toUpperCase();
  return "RFID" + s;
}

String firebaseGET(const String &path) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected!");
    return "";
  }

  WiFiClient client;
  HTTPClient http;
  String url = "http://" + String(FIREBASE_HOST) + path;

  http.begin(client, url);
  int code = http.GET();
  String payload = "";
  
  if (code > 0) {
    payload = http.getString();
    Serial.printf("GET %s -> %d\n", path.c_str(), code);
  } else {
    Serial.printf("GET failed: %d\n", code);
  }
  
  http.end();
  return payload;
}

int firebasePUT(const String &path, const String &json) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected!");
    return -1;
  }

  WiFiClient client;
  HTTPClient http;
  String url = "http://" + String(FIREBASE_HOST) + path;

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  int code = http.PUT(json);
  
  Serial.printf("PUT %s -> %d\n", path.c_str(), code);
  http.end();
  return code;
}

int firebasePOST(const String &path, const String &json) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected!");
    return -1;
  }

  WiFiClient client;
  HTTPClient http;
  String url = "http://" + String(FIREBASE_HOST) + path;

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(json);
  
  Serial.printf("POST %s -> %d\n", path.c_str(), code);
  http.end();
  return code;
}

String extractCurrentLocation(const String &json) {
  if (json.length() < 5 || json == "null") return "";
  
  int idx = json.indexOf("\"currentLocation\"");
  if (idx < 0) return "";
  
  int colon = json.indexOf(':', idx);
  int q1 = json.indexOf('"', colon + 1);
  int q2 = json.indexOf('"', q1 + 1);
  
  if (q1 < 0 || q2 <= q1) return "";
  return json.substring(q1 + 1, q2);
}

String extractItemId(const String &json) {
  if (json.length() < 5 || json == "null") return "";
  
  int idx = json.indexOf("\"id\"");
  if (idx < 0) return "";
  
  int colon = json.indexOf(':', idx);
  int q1 = json.indexOf('"', colon + 1);
  int q2 = json.indexOf('"', q1 + 1);
  
  if (q1 < 0 || q2 <= q1) return "";
  return json.substring(q1 + 1, q2);
}

String extractItemName(const String &json) {
  if (json.length() < 5 || json == "null") return "";
  
  int idx = json.indexOf("\"name\"");
  if (idx < 0) return "";
  
  int colon = json.indexOf(':', idx);
  int q1 = json.indexOf('"', colon + 1);
  int q2 = json.indexOf('"', q1 + 1);
  
  if (q1 < 0 || q2 <= q1) return "";
  return json.substring(q1 + 1, q2);
}

void setup() {
  Serial.begin(115200);
  delay(100);
  
  Serial.println();
  Serial.println("=================================");
  Serial.println("  RFID -> Firebase System");
  Serial.println("=================================");
  Serial.print("Room: "); Serial.println(ROOM_NAME);
  Serial.print("ESP ID: "); Serial.println(ESP_ID);
  Serial.println();

  // Initialize SPI and RFID
  SPI.begin();
  rfid.PCD_Init();
  Serial.println("✓ RFID Reader initialized");

  // Connect to WiFi
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("✓ WiFi connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("✗ WiFi connection failed!");
  }
  
  Serial.println();
  Serial.println("Ready! Place RFID tag near reader...");
  Serial.println("=================================");
  Serial.println();
}

void loop() {
  // Check for new RFID card
  if (!rfid.PICC_IsNewCardPresent()) {
    delay(50);
    return;
  }
  
  if (!rfid.PICC_ReadCardSerial()) {
    delay(50);
    return;
  }

  // Get RFID tag
  String rfidTag = uidToString(rfid.uid);
  
  Serial.println("\n--- RFID TAG DETECTED ---");
  Serial.print("Tag: ");
  Serial.println(rfidTag);
  Serial.print("Room: ");
  Serial.println(ROOM_NAME);

  // Search for this RFID in items
  String itemsJson = firebaseGET("/items.json");
  
  String itemId = "";
  String itemName = "";
  String currentLocation = "";
  
  // Parse items JSON to find matching RFID
  int startIdx = 0;
  while (true) {
    int itemStart = itemsJson.indexOf('{', startIdx);
    if (itemStart < 0) break;
    
    int itemEnd = itemsJson.indexOf('}', itemStart);
    if (itemEnd < 0) break;
    
    String itemJson = itemsJson.substring(itemStart, itemEnd + 1);
    
    if (itemJson.indexOf(rfidTag) > 0) {
      itemId = extractItemId(itemJson);
      itemName = extractItemName(itemJson);
      currentLocation = extractCurrentLocation(itemJson);
      break;
    }
    
    startIdx = itemEnd + 1;
  }

  if (itemId == "") {
    Serial.println("✗ Item not found in database!");
    Serial.println("   Add this item first using the web dashboard.");
    rfid.PICC_HaltA();
    delay(2000);
    return;
  }

  Serial.print("Item: ");
  Serial.println(itemName);
  Serial.print("Current Location: ");
  Serial.println(currentLocation);

  // Check if location changed
  if (currentLocation != String(ROOM_NAME)) {
    Serial.println(">>> MOVEMENT DETECTED! <<<");
    
    // Record movement
    unsigned long timestamp = millis();
    String movementJson = "{";
    movementJson += "\"itemId\":\"" + itemId + "\",";
    movementJson += "\"itemName\":\"" + itemName + "\",";
    movementJson += "\"rfidTag\":\"" + rfidTag + "\",";
    movementJson += "\"fromLocation\":\"" + currentLocation + "\",";
    movementJson += "\"toLocation\":\"" + String(ROOM_NAME) + "\",";
    movementJson += "\"timestamp\":" + String(timestamp);
    movementJson += "}";
    
    int postResult = firebasePOST("/movements.json", movementJson);
    
    if (postResult > 0) {
      Serial.println("✓ Movement recorded!");
    }
    
    // Update item location
    String updateJson = "{";
    updateJson += "\"currentLocation\":\"" + String(ROOM_NAME) + "\",";
    updateJson += "\"lastUpdated\":" + String(timestamp);
    updateJson += "}";
    
    int putResult = firebasePUT("/items/" + itemId + ".json", updateJson);
    
    if (putResult > 0) {
      Serial.println("✓ Item location updated!");
    }
    
    // Update room inventories
    firebasePUT("/rooms/roomA/items/" + itemId + ".json", 
                String(ROOM_NAME) == "Room A" ? "true" : "null");
    firebasePUT("/rooms/roomB/items/" + itemId + ".json", 
                String(ROOM_NAME) == "Room B" ? "true" : "null");
    
    Serial.println("✓ Room inventories updated!");
    Serial.println(">>> SYNC COMPLETE! <<<");
    
  } else {
    Serial.println("ℹ Item already in this room. No movement.");
  }

  Serial.println("------------------------\n");

  rfid.PICC_HaltA();
  delay(1000);  // Prevent multiple reads
}
