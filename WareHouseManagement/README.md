# 🏭 Automated Dispatch System - Complete Setup Guide

## 📋 Table of Contents
1. [Quick Start (React Dashboard)](#quick-start)
2. [Firebase Setup](#firebase-setup)
3. [Hardware Setup (ESP8266 + RFID)](#hardware-setup)
4. [Python RFID Integration (Alternative)](#python-alternative)
5. [Testing & Demo](#testing--demo)
6. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start (React Dashboard)

### Step 1: Install Dependencies

```bash
cd /Users/mj/Desktop/ghanshyam
npm install
```

### Step 2: Enable Firebase Realtime Database

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **warehousemanagementsyste-21664**
3. Click **"Realtime Database"** in left sidebar
4. Click **"Create Database"**
5. Choose location (e.g., US or Asia)
6. Start in **"Test mode"** for now
7. Click **"Enable"**

**IMPORTANT:** Update your Database Rules for testing:
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```
⚠️ Note: These are open rules for demo. For production, use proper authentication.

### Step 3: Start React Dashboard

```bash
npm run dev
```

The dashboard will open at: **http://localhost:3000**

### Step 4: Initialize Demo Data

1. Open the dashboard
2. Click **"Show Controls"** button
3. Click **"Initialize Demo Data"** button
4. You'll see 3 sample items in Room A

✅ **Dashboard is now running!**

---

## 🔥 Firebase Setup

Your Firebase config is already set up in `src/firebase-config.js`.

### Verify Database URL

Your current database URL should be:
```
https://warehousemanagementsyste-21664-default-rtdb.firebaseio.com
```

If you see errors, verify this URL in Firebase Console:
1. Go to Firebase Console
2. Realtime Database section
3. Copy the URL shown at the top

### Database Structure

The app creates this structure automatically:
```
├── items/
│   └── {itemId}
│       ├── id: string
│       ├── rfidTag: string
│       ├── name: string
│       ├── currentLocation: "Room A" | "Room B"
│       └── lastUpdated: timestamp
├── movements/
│   └── {movementId}
│       ├── itemId: string
│       ├── itemName: string
│       ├── rfidTag: string
│       ├── fromLocation: string
│       ├── toLocation: string
│       └── timestamp: timestamp
└── rooms/
    ├── roomA/
    │   └── items/
    └── roomB/
        └── items/
```

---

## 🔧 Hardware Setup (ESP8266 + RFID)

### What You Need

- **2x NodeMCU ESP8266** boards
- **2x RC522 RFID Reader** modules
- **RFID tags/cards** (at least 3-5)
- **Jumper wires**
- **USB cables** (for programming ESP8266)
- **Arduino IDE** software

### Hardware Connections

Connect RC522 to NodeMCU:

```
RC522 Pin  →  NodeMCU Pin
============================
SDA        →  D2 (GPIO4)
SCK        →  D5 (GPIO14)
MOSI       →  D7 (GPIO13)
MISO       →  D6 (GPIO12)
IRQ        →  Not connected
GND        →  GND
RST        →  D1 (GPIO5)
3.3V       →  3V3
```

⚠️ **IMPORTANT:** Use 3.3V, NOT 5V! RC522 is not 5V tolerant.

### Software Setup (Arduino IDE)

#### 1. Install Arduino IDE
Download from: https://www.arduino.cc/en/software

#### 2. Install ESP8266 Board Support

1. Open Arduino IDE
2. Go to **File → Preferences**
3. In "Additional Board Manager URLs", add:
   ```
   http://arduino.esp8266.com/stable/package_esp8266com_index.json
   ```
4. Click **OK**
5. Go to **Tools → Board → Boards Manager**
6. Search for **"ESP8266"**
7. Install **"esp8266 by ESP8266 Community"**

#### 3. Install Required Libraries

Go to **Sketch → Include Library → Manage Libraries**, then install:
- **MFRC522** (by GithubCommunity)

#### 4. Configure Arduino Code

Create a new file: `RFID_ESP8266_Firebase.ino`

Copy this code (FIXED VERSION):

```cpp
// RFID_ESP8266_Firebase.ino
// ESP8266 (NodeMCU) + RC522 + Firebase Realtime Database

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

// WiFi credentials
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
```

#### 5. Upload to ESP8266

**For ESP #1 (Room A):**
1. In the code, set:
   ```cpp
   const char* ROOM_NAME = "Room A";
   const char* ESP_ID    = "ESP_A";
   ```
2. Connect NodeMCU via USB
3. Select **Tools → Board → NodeMCU 1.0 (ESP-12E Module)**
4. Select **Tools → Port → /dev/cu.usbserial-XXXX** (your port)
5. Click **Upload** button (→)
6. Wait for "Done uploading"

**For ESP #2 (Room B):**
1. Change code to:
   ```cpp
   const char* ROOM_NAME = "Room B";
   const char* ESP_ID    = "ESP_B";
   ```
2. Connect second NodeMCU
3. Select correct port
4. Upload

#### 6. Monitor Serial Output

1. Click **Tools → Serial Monitor**
2. Set baud rate to **115200**
3. You should see:
   ```
   WiFi connected!
   Ready! Place RFID tag near reader...
   ```

---

## 🎯 Testing & Demo

### Test Scenario 1: Web Dashboard Only (No Hardware)

1. Start React dashboard: `npm run dev`
2. Click "Show Controls"
3. Click "Initialize Demo Data"
4. Click "Simulate Movement"
5. Select an item and move it from Room A to Room B
6. Watch real-time updates on dashboard!

### Test Scenario 2: Hardware Integration

1. Make sure React dashboard is running
2. Power on both ESP8266 boards
3. Check Serial Monitor - should show "WiFi connected"
4. Place an RFID tag near ESP #1 (Room A reader)
5. Watch Serial Monitor - should show "Item detected"
6. Check dashboard - item should appear in Room A
7. Move the same tag to ESP #2 (Room B reader)
8. Watch dashboard - item moves to Room B automatically!
9. Check "Movement History" table for logs

### Demo Flow

**Setup:**
- ESP #1 in "Room A" (first concrete room)
- ESP #2 in "Room B" (second concrete room, 6 feet apart)
- Dashboard open on screen

**Demo Steps:**
1. Show dashboard with items in Room A
2. Pick up glass box with RFID tag
3. ESP #1 detects tag in Room A (shown on Serial Monitor)
4. Walk 6 feet to Room B
5. Place glass box near ESP #2
6. ESP #2 detects tag in Room B
7. Dashboard instantly updates:
   - Glass box disappears from Room A
   - Glass box appears in Room B
   - New entry in Movement History
8. Repeat with other items!

---

## 🐛 Troubleshooting

### React Dashboard Issues

**Problem:** `npm install` fails
```bash
# Try clearing cache
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**Problem:** Firebase connection errors
- Check Firebase Console → Realtime Database is enabled
- Verify database URL in `src/firebase-config.js`
- Check database rules are set to allow read/write

**Problem:** "Cannot find module" errors
```bash
npm install firebase react react-dom
```

### ESP8266 Issues

**Problem:** ESP8266 not showing in Ports
- Install CH340 driver (for clone NodeMCU boards)
- Try different USB cable (must be data cable, not charge-only)
- Press reset button on NodeMCU

**Problem:** WiFi won't connect
- Check SSID and password are correct
- Make sure WiFi is 2.4GHz (ESP8266 doesn't support 5GHz)
- Move ESP closer to router

**Problem:** RFID reader not working
- Check all wiring connections
- Verify 3.3V power (NOT 5V!)
- Try different RFID tags
- Test with simple RFID example sketch first

**Problem:** Firebase updates not working
- Check database URL (no https://, no trailing slash)
- Verify database rules allow write access
- Check Serial Monitor for error messages
- Test Firebase URL in browser: 
  `http://warehousemanagementsyste-21664-default-rtdb.firebaseio.com/items.json`

### Python Script Issues (if using)

**Problem:** Firebase Admin SDK import errors
```bash
cd rfid-integration
pip install -r requirements.txt
```

**Problem:** Credentials file not found
- Download service account key from Firebase Console
- Save as `firebase-adminsdk.json` in rfid-integration folder
- Copy `.env.example` to `.env` and update values

---

## 📁 Project Structure

```
ghanshyam/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── firebase-config.js       # ✓ Already configured
│   ├── components/
│   │   ├── Dashboard.jsx
│   │   └── Dashboard.css
│   ├── services/
│   │   └── firebaseService.js
│   └── hooks/
│       └── useFirebase.js
└── rfid-integration/
    ├── requirements.txt
    ├── rfid_reader.py           # Alternative to ESP8266
    ├── hardware_examples.py
    └── .env.example
```

---

## ✅ Success Checklist

- [ ] Firebase Realtime Database enabled
- [ ] React dashboard running (`npm run dev`)
- [ ] Demo data initialized
- [ ] Can simulate movements in dashboard
- [ ] ESP8266 boards programmed (optional)
- [ ] RFID hardware connected (optional)
- [ ] WiFi credentials updated in Arduino code
- [ ] Both ESPs connect to WiFi
- [ ] RFID tags trigger detection
- [ ] Dashboard shows real-time updates

---

## 🎓 Next Steps

1. **Start with dashboard only** - Test all features without hardware
2. **Set up one ESP8266** - Get familiar with RFID reading
3. **Add second ESP8266** - Complete the two-room setup
4. **Customize** - Add your own items, change styling, add features

## 📞 Support

If you run into issues:
1. Check Serial Monitor output
2. Verify Firebase database structure
3. Test each component separately
4. Check troubleshooting section above

---

**Good luck with your demo! 🚀**
