import { ref, push, set, onValue, get, update } from 'firebase/database';
import { database } from '../firebase-config';

/**
 * Database Schema:
 * 
 * /items/{itemId}
 *   - rfidTag: string
 *   - name: string
 *   - currentLocation: "Room A" | "Room B"
 *   - lastUpdated: timestamp
 * 
 * /movements/{movementId}
 *   - itemId: string
 *   - itemName: string
 *   - rfidTag: string
 *   - fromLocation: string
 *   - toLocation: string
 *   - timestamp: timestamp
 * 
 * /rooms/
 *   - roomA: { items: {itemId: true} }
 *   - roomB: { items: {itemId: true} }
 */

// Add a new item to the system
export const addItem = async (rfidTag, itemName, initialLocation = "Room A") => {
  try {
    console.log(`Adding item: ${itemName} (${rfidTag}) to ${initialLocation}`);
    
    const itemsRef = ref(database, 'items');
    const newItemRef = push(itemsRef);
    const itemId = newItemRef.key;
    
    const itemData = {
      id: itemId,
      rfidTag: rfidTag,
      name: itemName,
      currentLocation: initialLocation,
      lastUpdated: Date.now()
    };
    
    await set(newItemRef, itemData);
    console.log(`✓ Item added with ID: ${itemId}`);
    
    // Add item to room inventory
    const roomKey = initialLocation === "Room A" ? "roomA" : "roomB";
    const roomItemRef = ref(database, `rooms/${roomKey}/items/${itemId}`);
    await set(roomItemRef, true);
    
    return { success: true, itemId, data: itemData };
  } catch (error) {
    console.error("Error adding item:", error);
    return { success: false, error: error.message };
  }
};

// Record item movement between rooms
export const recordMovement = async (itemId, itemName, rfidTag, fromLocation, toLocation) => {
  try {
    // Create movement record
    const movementsRef = ref(database, 'movements');
    const newMovementRef = push(movementsRef);
    
    const movementData = {
      id: newMovementRef.key,
      itemId: itemId,
      itemName: itemName,
      rfidTag: rfidTag,
      fromLocation: fromLocation,
      toLocation: toLocation,
      timestamp: Date.now()
    };
    
    await set(newMovementRef, movementData);
    
    // Update item location
    const itemRef = ref(database, `items/${itemId}`);
    await update(itemRef, {
      currentLocation: toLocation,
      lastUpdated: Date.now()
    });
    
    // Update room inventories
    const fromRoomKey = fromLocation === "Room A" ? "roomA" : "roomB";
    const toRoomKey = toLocation === "Room A" ? "roomA" : "roomB";
    
    const fromRoomItemRef = ref(database, `rooms/${fromRoomKey}/items/${itemId}`);
    const toRoomItemRef = ref(database, `rooms/${toRoomKey}/items/${itemId}`);
    
    await set(fromRoomItemRef, null); // Remove from old room
    await set(toRoomItemRef, true);   // Add to new room
    
    return { success: true, movementId: newMovementRef.key };
  } catch (error) {
    console.error("Error recording movement:", error);
    return { success: false, error: error.message };
  }
};

// Get item by RFID tag
export const getItemByRFID = async (rfidTag) => {
  try {
    const itemsRef = ref(database, 'items');
    const snapshot = await get(itemsRef);
    
    if (snapshot.exists()) {
      const items = snapshot.val();
      const foundItem = Object.values(items).find(item => item.rfidTag === rfidTag);
      return foundItem || null;
    }
    return null;
  } catch (error) {
    console.error("Error getting item by RFID:", error);
    return null;
  }
};

// Subscribe to items updates
export const subscribeToItems = (callback) => {
  const itemsRef = ref(database, 'items');
  return onValue(itemsRef, (snapshot) => {
    const data = snapshot.val();
    const itemsArray = data ? Object.values(data) : [];
    callback(itemsArray);
  });
};

// Subscribe to movements updates
export const subscribeToMovements = (callback) => {
  const movementsRef = ref(database, 'movements');
  return onValue(movementsRef, (snapshot) => {
    const data = snapshot.val();
    const movementsArray = data ? Object.values(data).sort((a, b) => b.timestamp - a.timestamp) : [];
    callback(movementsArray);
  });
};

// Subscribe to room inventory
export const subscribeToRoomInventory = (roomName, callback) => {
  const roomKey = roomName === "Room A" ? "roomA" : "roomB";
  const roomRef = ref(database, `rooms/${roomKey}/items`);
  
  return onValue(roomRef, async (snapshot) => {
    const itemIds = snapshot.val();
    if (!itemIds) {
      callback([]);
      return;
    }
    
    // Fetch full item details
    const itemsRef = ref(database, 'items');
    const itemsSnapshot = await get(itemsRef);
    const allItems = itemsSnapshot.val() || {};
    
    const roomItems = Object.keys(itemIds)
      .map(itemId => allItems[itemId])
      .filter(item => item); // Filter out null/undefined
    
    callback(roomItems);
  });
};

// Initialize demo data (for testing)
export const initializeDemoData = async () => {
  try {
    console.log('🚀 Starting demo data initialization...');
    
    // Check if data already exists
    const itemsRef = ref(database, 'items');
    console.log('Checking existing items...');
    const snapshot = await get(itemsRef);
    
    if (snapshot.exists()) {
      console.log("Demo data already exists");
      return { success: true, message: "Data already exists" };
    }
    
    console.log('No existing data found. Creating demo items...');
    
    // Add sample items with more variety
    const items = [
      { rfid: "RFID001", name: "Glass Box #1", location: "Room A" },
      { rfid: "RFID002", name: "Glass Box #2", location: "Room A" },
      { rfid: "RFID003", name: "Product Package A", location: "Room A" },
      { rfid: "RFID004", name: "Electronics Box", location: "Room B" },
      { rfid: "RFID005", name: "Medical Supplies", location: "Room A" },
      { rfid: "RFID006", name: "Tool Kit", location: "Room B" },
      { rfid: "RFID007", name: "Spare Parts Container", location: "Room A" },
      { rfid: "RFID008", name: "Documents Box", location: "Room B" }
    ];
    
    console.log(`Adding ${items.length} demo items...`);
    for (const item of items) {
      await addItem(item.rfid, item.name, item.location);
    }
    
    console.log('✓ All items added successfully!');
    
    // Wait a bit for items to be created
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Add some demo movements
    console.log("Adding demo movement history...");
    const allItems = await get(itemsRef);
    const itemsData = allItems.val();
    
    if (itemsData) {
      const itemsArray = Object.values(itemsData);
      
      // Simulate some past movements
      const movements = [
        { item: itemsArray[3], from: "Room A", to: "Room B", timeAgo: 3600000 }, // 1 hour ago
        { item: itemsArray[5], from: "Room A", to: "Room B", timeAgo: 1800000 }, // 30 min ago
        { item: itemsArray[7], from: "Room A", to: "Room B", timeAgo: 600000 }   // 10 min ago
      ];
      
      for (const mov of movements) {
        if (mov.item) {
          const movementsRef = ref(database, 'movements');
          const newMovementRef = push(movementsRef);
          
          await set(newMovementRef, {
            id: newMovementRef.key,
            itemId: mov.item.id,
            itemName: mov.item.name,
            rfidTag: mov.item.rfidTag,
            fromLocation: mov.from,
            toLocation: mov.to,
            timestamp: Date.now() - mov.timeAgo
          });
        }
      }
      console.log('✓ Movement history added!');
    }
    
    console.log('✅ Demo data initialization complete!');
    return { success: true, message: "Demo data initialized with 8 items and movement history!" };
  } catch (error) {
    console.error("❌ Error initializing demo data:", error);
    console.error("Error details:", error.message, error.stack);
    return { success: false, error: error.message };
  }
};
