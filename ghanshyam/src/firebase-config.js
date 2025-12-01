// Firebase Configuration
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDOqAdSutx3tadRsv0WY2UB2guHohnIVd0",
  authDomain: "warehousemanagementsyste-21664.firebaseapp.com",
  databaseURL: "https://warehousemanagementsyste-21664-default-rtdb.firebaseio.com",
  projectId: "warehousemanagementsyste-21664",
  storageBucket: "warehousemanagementsyste-21664.firebasestorage.app",
  messagingSenderId: "1092738017994",
  appId: "1:1092738017994:web:4b29aa55a6f183b873e233",
  measurementId: "G-5MEFBX6X3Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (optional)
const analytics = getAnalytics(app);

// Initialize Realtime Database
export const database = getDatabase(app);

export default app;
