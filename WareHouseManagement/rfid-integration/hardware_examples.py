#!/usr/bin/env python3
"""
Hardware-Specific RFID Integration Examples
This file contains implementation examples for different RFID hardware
"""

# ==============================================================================
# EXAMPLE 1: RC522 RFID Reader (Most Common for Raspberry Pi)
# ==============================================================================
"""
Hardware: RC522 RFID Reader Module
Connection: SPI Interface to Raspberry Pi
Price: ~$5-10

def read_rc522():
    from mfrc522 import SimpleMFRC522
    import RPi.GPIO as GPIO
    
    reader = SimpleMFRC522()
    
    try:
        print("Waiting for RFID tag...")
        id, text = reader.read()
        rfid_tag = str(id)
        print(f"Tag detected: {rfid_tag}")
        return rfid_tag
    
    except Exception as e:
        print(f"Error: {e}")
        return None
    
    finally:
        GPIO.cleanup()
"""

# ==============================================================================
# EXAMPLE 2: USB RFID Reader (Plug and Play)
# ==============================================================================
"""
Hardware: USB RFID Reader (HID Keyboard Emulation)
Connection: USB Port
Price: ~$15-30

def read_usb_rfid():
    import sys
    
    # USB RFID readers typically emulate keyboard input
    # They send the RFID tag as if it were typed
    
    print("Scan RFID tag...")
    rfid_tag = input()  # Reader sends tag as keyboard input
    
    if rfid_tag:
        print(f"Tag detected: {rfid_tag}")
        return rfid_tag
    
    return None

# For advanced USB reading without keyboard emulation:
def read_usb_advanced():
    from evdev import InputDevice, categorize, ecodes
    
    # Find RFID reader device (usually /dev/input/eventX)
    device = InputDevice('/dev/input/event0')
    
    rfid_tag = ""
    
    for event in device.read_loop():
        if event.type == ecodes.EV_KEY:
            key_event = categorize(event)
            if key_event.keystate == 1:  # Key down
                if key_event.keycode == 'KEY_ENTER':
                    return rfid_tag
                else:
                    # Convert key to character
                    rfid_tag += key_event.keycode.replace('KEY_', '')
    
    return None
"""

# ==============================================================================
# EXAMPLE 3: Serial RFID Reader (UART/RS232)
# ==============================================================================
"""
Hardware: Serial RFID Reader Module
Connection: UART/Serial Port
Price: ~$10-20

def read_serial_rfid():
    import serial
    import time
    
    # Configure serial port
    # On Windows: 'COM3', 'COM4', etc.
    # On Linux/Mac: '/dev/ttyUSB0', '/dev/ttyACM0', etc.
    
    ser = serial.Serial(
        port='/dev/ttyUSB0',
        baudrate=9600,
        timeout=1
    )
    
    print("Waiting for RFID tag...")
    
    while True:
        if ser.in_waiting > 0:
            # Read line from serial port
            line = ser.readline().decode('utf-8').strip()
            
            if line:
                print(f"Tag detected: {line}")
                return line
        
        time.sleep(0.1)
    
    return None
"""

# ==============================================================================
# EXAMPLE 4: Multiple RFID Readers (Two Rooms Setup)
# ==============================================================================
"""
For your specific use case with Room A and Room B:
Setup two RFID readers, one at each room entrance

def monitor_two_rooms():
    import threading
    from mfrc522 import SimpleMFRC522
    
    # Initialize two readers on different SPI buses or GPIO pins
    reader_room_a = SimpleMFRC522(bus=0, device=0)
    reader_room_b = SimpleMFRC522(bus=0, device=1)
    
    def monitor_room_a():
        while True:
            try:
                id, text = reader_room_a.read()
                rfid_tag = str(id)
                print(f"Room A: Tag {rfid_tag} detected")
                # Process with your Firebase function
                simulate_rfid_read(rfid_tag, "Room A")
            except:
                pass
    
    def monitor_room_b():
        while True:
            try:
                id, text = reader_room_b.read()
                rfid_tag = str(id)
                print(f"Room B: Tag {rfid_tag} detected")
                # Process with your Firebase function
                simulate_rfid_read(rfid_tag, "Room B")
            except:
                pass
    
    # Start monitoring both rooms in parallel
    thread_a = threading.Thread(target=monitor_room_a)
    thread_b = threading.Thread(target=monitor_room_b)
    
    thread_a.start()
    thread_b.start()
    
    thread_a.join()
    thread_b.join()
"""

# ==============================================================================
# EXAMPLE 5: ESP32/Arduino with RFID (IoT Approach)
# ==============================================================================
"""
Hardware: ESP32/ESP8266 + RC522 RFID Reader
Connection: WiFi enabled, sends data to Firebase directly
Price: ~$15-25

Arduino/ESP32 Code (C++):
-------------------------

#include <WiFi.h>
#include <FirebaseESP32.h>
#include <MFRC522.h>

#define SS_PIN 5
#define RST_PIN 22

MFRC522 rfid(SS_PIN, RST_PIN);
FirebaseData firebaseData;

void setup() {
  Serial.begin(115200);
  SPI.begin();
  rfid.PCD_Init();
  
  // Connect to WiFi
  WiFi.begin("YOUR_SSID", "YOUR_PASSWORD");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
  
  // Initialize Firebase
  Firebase.begin("DATABASE_URL", "DATABASE_SECRET");
}

void loop() {
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return;
  }
  
  // Read RFID tag
  String rfidTag = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    rfidTag += String(rfid.uid.uidByte[i], HEX);
  }
  
  Serial.println("Tag: " + rfidTag);
  
  // Send to Firebase
  Firebase.setString(firebaseData, "/rfid_scans/" + rfidTag, "Room A");
  
  rfid.PICC_HaltA();
  delay(1000);
}

This approach eliminates the need for a Python script entirely!
"""

# ==============================================================================
# RECOMMENDED SETUP FOR YOUR PROJECT
# ==============================================================================
"""
Budget Option (~$20-30):
- 2x RC522 RFID Readers ($10-20)
- 1x Raspberry Pi Zero W ($10-15) or use existing computer
- RFID tags/cards ($5 for 10 tags)

Implementation:
1. Connect both RFID readers to Raspberry Pi
2. Run the Python script (rfid_reader.py)
3. Each reader monitors one room
4. Script updates Firebase when movement detected

Mid-Range Option (~$50-70):
- 2x USB RFID Readers ($30-40)
- Any computer with USB ports
- RFID tags/cards ($5)

Implementation:
1. Plug USB readers into computer
2. Configure each reader for a specific room
3. Run Python script
4. Much easier setup, no GPIO wiring needed

IoT Option (~$40-60):
- 2x ESP32 + RC522 modules ($30-40)
- RFID tags/cards ($5)

Implementation:
1. Program ESP32 with Arduino IDE
2. Each ESP32 directly updates Firebase via WiFi
3. No computer needed after programming
4. Most elegant solution for permanent installation
"""
