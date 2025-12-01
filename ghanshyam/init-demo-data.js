// Initialize Firebase Demo Data
// Run this script to populate your Firebase database with test data

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push } from 'firebase/database';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDOqAdSutx3tadRsv0WY2UB2guHohnIVd0",
  authDomain: "warehousemanagementsyste-21664.firebaseapp.com",
  databaseURL: "https://warehousemanagementsyste-21664-default-rtdb.firebaseio.com",
  projectId: "warehousemanagementsyste-21664",
  storageBucket: "warehousemanagementsyste-21664.firebasestorage.app",
  messagingSenderId: "1092738017994",
  appId: "1:1092738017994:web:4b29aa55a6f183b873e233"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const demoItems = [
  {
    rfidTag: "RFID001",
    name: "Glass Box #1",
    currentLocation: "Room A"
  },
  {
    rfidTag: "RFID002",
    name: "Glass Box #2",
    currentLocation: "Room A"
  },
  {
    rfidTag: "RFID003",
    name: "Product Package A",
    currentLocation: "Room A"
  },
  {
    rfidTag: "RFID004",
    name: "Electronics Box",
    currentLocation: "Room B"
  },
  {
    rfidTag: "RFID005",
    name: "Medical Supplies",
    currentLocation: "Room A"
  },
  {
    rfidTag: "RFID006",
    name: "Tool Kit",
    currentLocation: "Room B"
  }
];

const demoMovements = [
  {
    itemName: "Electronics Box",
    rfidTag: "RFID004",
    fromLocation: "Room A",
    toLocation: "Room B",
    timestamp: Date.now() - 3600000 // 1 hour ago
  },
  {
    itemName: "Tool Kit",
    rfidTag: "RFID006",
    fromLocation: "Room A",
    toLocation: "Room B",
    timestamp: Date.now() - 1800000 // 30 minutes ago
  },
  {
    itemName: "Glass Box #2",
    rfidTag: "RFID002",
    fromLocation: "Room B",
    toLocation: "Room A",
    timestamp: Date.now() - 900000 // 15 minutes ago
  }
];

async function initializeDemoData() {
  console.log('🚀 Initializing Firebase with demo data...\n');

  try {
    // Clear existing data
    console.log('📝 Clearing existing data...');
    await set(ref(database, 'items'), null);
    await set(ref(database, 'movements'), null);
    await set(ref(database, 'rooms'), null);
    console.log('✅ Cleared!\n');

    // Add items
    console.log('📦 Adding items...');
    const itemsRef = ref(database, 'items');
    const roomAItems = {};
    const roomBItems = {};

    for (const item of demoItems) {
      const newItemRef = push(itemsRef);
      const itemId = newItemRef.key;
      
      const itemData = {
        id: itemId,
        rfidTag: item.rfidTag,
        name: item.name,
        currentLocation: item.currentLocation,
        lastUpdated: Date.now()
      };
      
      await set(newItemRef, itemData);
      console.log(`   ✓ Added: ${item.name} (${item.rfidTag}) in ${item.currentLocation}`);
      
      // Track room inventory
      if (item.currentLocation === "Room A") {
        roomAItems[itemId] = true;
      } else {
        roomBItems[itemId] = true;
      }
    }
    console.log('✅ All items added!\n');

    // Set room inventories
    console.log('🏠 Setting room inventories...');
    await set(ref(database, 'rooms/roomA/items'), roomAItems);
    await set(ref(database, 'rooms/roomB/items'), roomBItems);
    console.log(`   ✓ Room A: ${Object.keys(roomAItems).length} items`);
    console.log(`   ✓ Room B: ${Object.keys(roomBItems).length} items`);
    console.log('✅ Room inventories set!\n');

    // Add movement history
    console.log('📊 Adding movement history...');
    const movementsRef = ref(database, 'movements');
    
    for (const movement of demoMovements) {
      const newMovementRef = push(movementsRef);
      const movementData = {
        id: newMovementRef.key,
        itemName: movement.itemName,
        rfidTag: movement.rfidTag,
        fromLocation: movement.fromLocation,
        toLocation: movement.toLocation,
        timestamp: movement.timestamp
      };
      
      await set(newMovementRef, movementData);
      console.log(`   ✓ ${movement.itemName}: ${movement.fromLocation} → ${movement.toLocation}`);
    }
    console.log('✅ Movement history added!\n');

    console.log('🎉 SUCCESS! Demo data initialized!\n');
    console.log('📍 Summary:');
    console.log(`   • Total Items: ${demoItems.length}`);
    console.log(`   • Room A Items: ${Object.keys(roomAItems).length}`);
    console.log(`   • Room B Items: ${Object.keys(roomBItems).length}`);
    console.log(`   • Movement Records: ${demoMovements.length}`);
    console.log('\n✨ Your dashboard should now show all the data!');
    console.log('   Refresh your browser if needed.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing demo data:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeDemoData();
