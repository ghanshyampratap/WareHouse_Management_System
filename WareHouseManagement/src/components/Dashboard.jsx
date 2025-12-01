import React, { useState } from 'react';
import { useItems, useMovements, useRoomInventory } from '../hooks/useFirebase';
import { addItem, recordMovement, initializeDemoData } from '../services/firebaseService';
import './Dashboard.css';

const Dashboard = () => {
  const { items } = useItems();
  const { movements } = useMovements();
  const { inventory: roomAInventory } = useRoomInventory("Room A");
  const { inventory: roomBInventory } = useRoomInventory("Room B");
  
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showSimulateForm, setShowSimulateForm] = useState(false);
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  
  // Form states
  const [selectedItemId, setSelectedItemId] = useState('');
  const [targetRoom, setTargetRoom] = useState('Room B');
  const [newItemName, setNewItemName] = useState('');
  const [newItemRFID, setNewItemRFID] = useState('');
  const [newItemLocation, setNewItemLocation] = useState('Room A');

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleSimulateMovement = async (e) => {
    e.preventDefault();
    
    if (!selectedItemId) {
      alert('Please select an item');
      return;
    }

    const item = items.find(i => i.id === selectedItemId);
    if (!item) {
      alert('Item not found');
      return;
    }

    if (item.currentLocation === targetRoom) {
      alert(`Item is already in ${targetRoom}`);
      return;
    }

    const result = await recordMovement(
      item.id,
      item.name,
      item.rfidTag,
      item.currentLocation,
      targetRoom
    );

    if (result.success) {
      alert(`✅ Movement recorded: ${item.name} moved from ${item.currentLocation} to ${targetRoom}`);
      setShowSimulateForm(false);
      setSelectedItemId('');
    } else {
      alert(`❌ Error: ${result.error}`);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    
    if (!newItemName || !newItemRFID) {
      alert('Please fill in all fields');
      return;
    }

    const result = await addItem(newItemRFID, newItemName, newItemLocation);

    if (result.success) {
      alert(`✅ Item added: ${newItemName}`);
      setShowAddItemForm(false);
      setNewItemName('');
      setNewItemRFID('');
    } else {
      alert(`❌ Error: ${result.error}`);
    }
  };

  const handleInitializeDemoData = async () => {
    console.log('🚀 Initialize button clicked!');
    console.log('Current items count:', items.length);
    
    if (items.length > 0) {
      const confirm = window.confirm('Items already exist. This will not add duplicate demo data. Continue?');
      if (!confirm) {
        console.log('User cancelled');
        return;
      }
    }

    console.log('Calling initializeDemoData...');
    try {
      const result = await initializeDemoData();
      console.log('Result:', result);
      
      if (result.success) {
        alert('✅ ' + result.message);
      } else {
        alert('❌ Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error in handleInitializeDemoData:', error);
      alert('❌ Error: ' + error.message);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="header">
        <h1>🏭 Automated Dispatch System</h1>
        <p>Real-time RFID Warehouse Management</p>
        <div className="status-badge">
          <span className="status-indicator"></span>
          <span>System Online - Monitoring Active</span>
        </div>
      </header>

      {/* Admin Panel */}
      <div className="admin-panel">
        <div className="admin-header">
          <h2 className="section-title">
            🛠️ Control Panel
          </h2>
          <button 
            className="btn btn-warning"
            onClick={() => setShowAdminPanel(!showAdminPanel)}
          >
            {showAdminPanel ? '▲ Hide Controls' : '▼ Show Controls'}
          </button>
        </div>

        {showAdminPanel && (
          <>
            <div className="admin-actions">
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setShowAddItemForm(!showAddItemForm);
                  setShowSimulateForm(false);
                }}
              >
                ➕ Add New Item
              </button>
              
              <button 
                className="btn btn-success"
                onClick={() => {
                  setShowSimulateForm(!showSimulateForm);
                  setShowAddItemForm(false);
                }}
              >
                🔄 Simulate Movement
              </button>
              
              <button 
                className="btn btn-warning"
                onClick={handleInitializeDemoData}
              >
                🎯 Initialize Demo Data
              </button>
            </div>

            {/* Add Item Form */}
            {showAddItemForm && (
              <form className="simulate-form" onSubmit={handleAddItem}>
                <h3>Add New Item</h3>
                <div className="form-group">
                  <label>Item Name</label>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="e.g., Glass Box #4"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>RFID Tag</label>
                  <input
                    type="text"
                    value={newItemRFID}
                    onChange={(e) => setNewItemRFID(e.target.value)}
                    placeholder="e.g., RFID004"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Initial Location</label>
                  <select
                    value={newItemLocation}
                    onChange={(e) => setNewItemLocation(e.target.value)}
                  >
                    <option value="Room A">Room A</option>
                    <option value="Room B">Room B</option>
                  </select>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    Add Item
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowAddItemForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Simulate Movement Form */}
            {showSimulateForm && (
              <form className="simulate-form" onSubmit={handleSimulateMovement}>
                <h3>Simulate Item Movement</h3>
                <div className="form-group">
                  <label>Select Item</label>
                  <select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    required
                  >
                    <option value="">-- Select an item --</option>
                    {items.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.rfidTag}) - Currently in {item.currentLocation}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Move To</label>
                  <select
                    value={targetRoom}
                    onChange={(e) => setTargetRoom(e.target.value)}
                    required
                  >
                    <option value="Room A">Room A</option>
                    <option value="Room B">Room B</option>
                  </select>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-success">
                    Simulate Movement
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowSimulateForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      {/* Rooms Section */}
      <div className="rooms-section">
        {/* Room A */}
        <div className="room-card room-a">
          <div className="room-header">
            <h2 className="room-title">📦 Room A</h2>
            <span className="item-count">{roomAInventory.length} Items</span>
          </div>
          
          {roomAInventory.length > 0 ? (
            <ul className="items-list">
              {roomAInventory.map(item => (
                <li key={item.id} className="item">
                  <div className="item-name">{item.name}</div>
                  <div className="item-details">
                    <span className="rfid-tag">{item.rfidTag}</span>
                    <span className="timestamp">
                      {formatTimestamp(item.lastUpdated)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <p>No items in Room A</p>
            </div>
          )}
        </div>

        {/* Room B */}
        <div className="room-card room-b">
          <div className="room-header">
            <h2 className="room-title">📦 Room B</h2>
            <span className="item-count">{roomBInventory.length} Items</span>
          </div>
          
          {roomBInventory.length > 0 ? (
            <ul className="items-list">
              {roomBInventory.map(item => (
                <li key={item.id} className="item">
                  <div className="item-name">{item.name}</div>
                  <div className="item-details">
                    <span className="rfid-tag">{item.rfidTag}</span>
                    <span className="timestamp">
                      {formatTimestamp(item.lastUpdated)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <p>No items in Room B</p>
            </div>
          )}
        </div>
      </div>

      {/* Movement History */}
      <section className="movements-section">
        <h2 className="section-title">
          📊 Movement History
          <span className="item-count">{movements.length} Records</span>
        </h2>
        
        {movements.length > 0 ? (
          <table className="movements-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>RFID Tag</th>
                <th>Movement</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {movements.map(movement => (
                <tr key={movement.id}>
                  <td>{movement.itemName}</td>
                  <td>
                    <span className="rfid-tag">{movement.rfidTag}</span>
                  </td>
                  <td>
                    <span className="movement-arrow">
                      {movement.fromLocation}
                      <span className="arrow-icon">→</span>
                      {movement.toLocation}
                    </span>
                  </td>
                  <td className="timestamp">
                    {formatTimestamp(movement.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p>No movements recorded yet</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
