#!/usr/bin/env python3
"""
RFID Integration Script for Automated Dispatch System
This script reads RFID tags and updates Firebase Realtime Database
"""

import firebase_admin
from firebase_admin import credentials, db
import time
import os
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

# Initialize Firebase Admin SDK
def initialize_firebase():
    """Initialize Firebase Admin SDK with credentials"""
    try:
        cred_path = os.getenv('FIREBASE_CREDENTIALS_PATH', './firebase-adminsdk.json')
        database_url = os.getenv('FIREBASE_DATABASE_URL')
        
        if not os.path.exists(cred_path):
            print("❌ Error: Firebase credentials file not found!")
            print(f"   Looking for: {cred_path}")
            print("\n📋 Setup Instructions:")
            print("   1. Go to Firebase Console")
            print("   2. Project Settings > Service Accounts")
            print("   3. Click 'Generate New Private Key'")
            print(f"   4. Save the file as '{cred_path}'")
            return False
        
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred, {
            'databaseURL': database_url
        })
        
        print("✅ Firebase Admin SDK initialized successfully!")
        return True
    
    except Exception as e:
        print(f"❌ Error initializing Firebase: {e}")
        return False


def get_item_by_rfid(rfid_tag):
    """Get item details from Firebase by RFID tag"""
    try:
        items_ref = db.reference('items')
        items = items_ref.get()
        
        if items:
            for item_id, item_data in items.items():
                if item_data.get('rfidTag') == rfid_tag:
                    return item_id, item_data
        return None, None
    
    except Exception as e:
        print(f"❌ Error fetching item: {e}")
        return None, None


def record_movement(item_id, item_name, rfid_tag, from_location, to_location):
    """Record item movement in Firebase"""
    try:
        # Create movement record
        movements_ref = db.reference('movements')
        new_movement = movements_ref.push({
            'itemId': item_id,
            'itemName': item_name,
            'rfidTag': rfid_tag,
            'fromLocation': from_location,
            'toLocation': to_location,
            'timestamp': int(time.time() * 1000)
        })
        
        # Update item location
        item_ref = db.reference(f'items/{item_id}')
        item_ref.update({
            'currentLocation': to_location,
            'lastUpdated': int(time.time() * 1000)
        })
        
        # Update room inventories
        from_room_key = "roomA" if from_location == "Room A" else "roomB"
        to_room_key = "roomA" if to_location == "Room A" else "roomB"
        
        # Remove from old room
        from_room_ref = db.reference(f'rooms/{from_room_key}/items/{item_id}')
        from_room_ref.delete()
        
        # Add to new room
        to_room_ref = db.reference(f'rooms/{to_room_key}/items/{item_id}')
        to_room_ref.set(True)
        
        print(f"✅ Movement recorded: {item_name} from {from_location} to {to_location}")
        return True
    
    except Exception as e:
        print(f"❌ Error recording movement: {e}")
        return False


def simulate_rfid_read(rfid_tag, detected_room):
    """
    Simulate RFID tag detection
    In real implementation, this would read from actual RFID hardware
    
    Args:
        rfid_tag: The RFID tag detected
        detected_room: The room where the tag was detected ("Room A" or "Room B")
    """
    print(f"\n🔍 RFID Tag Detected: {rfid_tag} in {detected_room}")
    
    # Get item from database
    item_id, item_data = get_item_by_rfid(rfid_tag)
    
    if not item_id:
        print(f"⚠️  Unknown RFID tag: {rfid_tag}")
        print("   This tag is not registered in the system.")
        return False
    
    current_location = item_data.get('currentLocation')
    item_name = item_data.get('name')
    
    print(f"📦 Item: {item_name}")
    print(f"   Current Location: {current_location}")
    print(f"   Detected in: {detected_room}")
    
    # Check if item location has changed
    if current_location != detected_room:
        print(f"🚀 Item moved! Recording movement...")
        record_movement(item_id, item_name, rfid_tag, current_location, detected_room)
    else:
        print(f"ℹ️  Item is already in {detected_room}. No movement recorded.")
    
    return True


def read_rfid_hardware():
    """
    Read RFID tag from hardware
    
    IMPLEMENTATION GUIDE:
    =====================
    
    For RC522 RFID Reader:
    ----------------------
    1. Install library: pip install mfrc522
    2. Connect RFID reader to GPIO pins
    3. Use this code:
    
        from mfrc522 import SimpleMFRC522
        reader = SimpleMFRC522()
        
        try:
            print("Hold RFID tag near reader...")
            id, text = reader.read()
            return str(id)
        except Exception as e:
            print(f"Error reading RFID: {e}")
            return None
    
    For USB RFID Reader:
    -------------------
    1. Install library: pip install evdev (Linux) or pyserial (cross-platform)
    2. Detect USB device
    3. Read input stream
    
    For Serial RFID Reader:
    ----------------------
    1. Install: pip install pyserial
    2. Use this code:
    
        import serial
        ser = serial.Serial('/dev/ttyUSB0', 9600)
        rfid_tag = ser.readline().decode().strip()
        return rfid_tag
    
    CURRENT IMPLEMENTATION:
    ----------------------
    This function currently uses simulated input for demonstration.
    Replace with actual hardware reading code above.
    """
    
    # SIMULATION MODE - Replace with actual hardware code
    print("\n" + "="*60)
    print("⚠️  SIMULATION MODE - No RFID hardware detected")
    print("="*60)
    print("\nEnter RFID tag manually (or 'quit' to exit):")
    print("Example tags: RFID001, RFID002, RFID003")
    
    rfid_tag = input("RFID Tag: ").strip()
    
    if rfid_tag.lower() == 'quit':
        return None
    
    if not rfid_tag:
        return None
    
    # Ask for detected room
    print("\nWhich room was this detected in?")
    print("1. Room A")
    print("2. Room B")
    
    room_choice = input("Enter (1 or 2): ").strip()
    
    if room_choice == '1':
        detected_room = "Room A"
    elif room_choice == '2':
        detected_room = "Room B"
    else:
        print("❌ Invalid room selection")
        return None, None
    
    return rfid_tag, detected_room


def main():
    """Main function to run RFID monitoring"""
    print("\n" + "="*60)
    print("🏭 AUTOMATED DISPATCH SYSTEM - RFID Integration")
    print("="*60)
    print()
    
    # Initialize Firebase
    if not initialize_firebase():
        return
    
    print("\n✅ System ready! Monitoring for RFID tags...")
    print("   Press Ctrl+C to stop")
    print()
    
    try:
        while True:
            # Read RFID tag from hardware
            result = read_rfid_hardware()
            
            if result is None:
                print("\n👋 Exiting...")
                break
            
            rfid_tag, detected_room = result
            
            if rfid_tag and detected_room:
                # Process the detected tag
                simulate_rfid_read(rfid_tag, detected_room)
            
            # Small delay between reads
            time.sleep(1)
    
    except KeyboardInterrupt:
        print("\n\n👋 System stopped by user")
    
    except Exception as e:
        print(f"\n❌ Error: {e}")


if __name__ == "__main__":
    main()
