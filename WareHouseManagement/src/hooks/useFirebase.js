import { useState, useEffect } from 'react';
import { 
  subscribeToItems, 
  subscribeToMovements, 
  subscribeToRoomInventory 
} from '../services/firebaseService';

// Hook to get all items
export const useItems = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToItems((data) => {
      setItems(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { items, loading };
};

// Hook to get movement history
export const useMovements = () => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToMovements((data) => {
      setMovements(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { movements, loading };
};

// Hook to get room inventory
export const useRoomInventory = (roomName) => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToRoomInventory(roomName, (data) => {
      setInventory(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [roomName]);

  return { inventory, loading };
};
