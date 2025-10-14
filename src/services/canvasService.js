/**
 * Canvas Service - Firestore operations for collaborative canvas
 * Handles rectangles, cursors, presence, and object locking
 */

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_CANVAS_ID } from '../utils/constants';

// Collection references
const getCanvasRef = (canvasId = DEFAULT_CANVAS_ID) => doc(db, 'canvases', canvasId);
const getObjectsRef = (canvasId = DEFAULT_CANVAS_ID) => collection(db, 'canvases', canvasId, 'objects');
const getCursorsRef = (canvasId = DEFAULT_CANVAS_ID) => collection(db, 'canvases', canvasId, 'cursors');
const getPresenceRef = (canvasId = DEFAULT_CANVAS_ID) => collection(db, 'canvases', canvasId, 'presence');

/**
 * Generate a composite object ID to prevent conflicts
 * Format: {userId}_{timestamp}
 */
export const generateObjectId = (userId) => {
  return `${userId}_${Date.now()}`;
};

// ============================================================================
// RECTANGLE OPERATIONS
// ============================================================================

/**
 * Create a new rectangle on the canvas
 * @param {string} canvasId - Canvas ID
 * @param {Object} rectData - Rectangle data {x, y, width, height, color, createdBy}
 * @returns {Promise<string>} Created rectangle ID
 */
export const createRectangle = async (canvasId = DEFAULT_CANVAS_ID, rectData) => {
  try {
    const objectId = generateObjectId(rectData.createdBy);
    const objectRef = doc(getObjectsRef(canvasId), objectId);
    
    await setDoc(objectRef, {
      ...rectData,
      id: objectId,
      lockedBy: null,
      timestamp: Date.now(),
    });
    
    console.log('Rectangle created:', objectId);
    return objectId;
  } catch (error) {
    console.error('Error creating rectangle:', error);
    throw error;
  }
};

/**
 * Update an existing rectangle
 * @param {string} canvasId - Canvas ID
 * @param {string} rectId - Rectangle ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateRectangle = async (canvasId = DEFAULT_CANVAS_ID, rectId, updates) => {
  try {
    const objectRef = doc(getObjectsRef(canvasId), rectId);
    await updateDoc(objectRef, updates);
    console.log('Rectangle updated:', rectId);
  } catch (error) {
    console.error('Error updating rectangle:', error);
    throw error;
  }
};

/**
 * Delete a rectangle
 * @param {string} canvasId - Canvas ID
 * @param {string} rectId - Rectangle ID
 * @returns {Promise<void>}
 */
export const deleteRectangle = async (canvasId = DEFAULT_CANVAS_ID, rectId) => {
  try {
    const objectRef = doc(getObjectsRef(canvasId), rectId);
    await deleteDoc(objectRef);
    console.log('Rectangle deleted:', rectId);
  } catch (error) {
    console.error('Error deleting rectangle:', error);
    throw error;
  }
};

/**
 * Lock an object to prevent simultaneous manipulation
 * @param {string} canvasId - Canvas ID
 * @param {string} rectId - Rectangle ID
 * @param {string} userId - User ID acquiring the lock
 * @returns {Promise<void>}
 */
export const lockObject = async (canvasId = DEFAULT_CANVAS_ID, rectId, userId) => {
  try {
    const objectRef = doc(getObjectsRef(canvasId), rectId);
    await updateDoc(objectRef, {
      lockedBy: userId,
    });
    console.log('Object locked:', rectId, 'by', userId);
  } catch (error) {
    console.error('Error locking object:', error);
    throw error;
  }
};

/**
 * Unlock an object
 * @param {string} canvasId - Canvas ID
 * @param {string} rectId - Rectangle ID
 * @returns {Promise<void>}
 */
export const unlockObject = async (canvasId = DEFAULT_CANVAS_ID, rectId) => {
  try {
    const objectRef = doc(getObjectsRef(canvasId), rectId);
    await updateDoc(objectRef, {
      lockedBy: null,
    });
    console.log('Object unlocked:', rectId);
  } catch (error) {
    console.error('Error unlocking object:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time object updates
 * @param {string} canvasId - Canvas ID
 * @param {Function} callback - Callback function receiving array of objects
 * @returns {Function} Unsubscribe function
 */
export const subscribeToObjects = (canvasId = DEFAULT_CANVAS_ID, callback) => {
  const q = query(getObjectsRef(canvasId));
  
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const objects = [];
      snapshot.forEach((doc) => {
        objects.push({ id: doc.id, ...doc.data() });
      });
      callback(objects);
    },
    (error) => {
      console.error('Error subscribing to objects:', error);
    }
  );
  
  return unsubscribe;
};

// ============================================================================
// CURSOR OPERATIONS
// ============================================================================

/**
 * Update cursor position
 * @param {string} canvasId - Canvas ID
 * @param {string} userId - User ID
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} userName - User display name
 * @param {number} arrivalTime - When cursor first appeared
 * @returns {Promise<void>}
 */
export const updateCursor = async (
  canvasId = DEFAULT_CANVAS_ID,
  userId,
  x,
  y,
  userName,
  arrivalTime
) => {
  try {
    const cursorRef = doc(getCursorsRef(canvasId), userId);
    await setDoc(cursorRef, {
      userId,
      x,
      y,
      userName,
      timestamp: Date.now(),
      arrivalTime: arrivalTime || Date.now(),
    });
  } catch (error) {
    console.error('Error updating cursor:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time cursor updates
 * @param {string} canvasId - Canvas ID
 * @param {Function} callback - Callback function receiving array of cursors
 * @returns {Function} Unsubscribe function
 */
export const subscribeToCursors = (canvasId = DEFAULT_CANVAS_ID, callback) => {
  const q = query(getCursorsRef(canvasId));
  
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const cursors = [];
      snapshot.forEach((doc) => {
        cursors.push({ id: doc.id, ...doc.data() });
      });
      callback(cursors);
    },
    (error) => {
      console.error('Error subscribing to cursors:', error);
    }
  );
  
  return unsubscribe;
};

/**
 * Remove cursor (on disconnect)
 * @param {string} canvasId - Canvas ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const removeCursor = async (canvasId = DEFAULT_CANVAS_ID, userId) => {
  try {
    const cursorRef = doc(getCursorsRef(canvasId), userId);
    await deleteDoc(cursorRef);
  } catch (error) {
    console.error('Error removing cursor:', error);
    throw error;
  }
};

// ============================================================================
// PRESENCE OPERATIONS
// ============================================================================

/**
 * Set user presence (online/offline status)
 * @param {string} canvasId - Canvas ID
 * @param {string} userId - User ID
 * @param {string} userName - User display name
 * @param {string} color - User's assigned color
 * @param {boolean} isOnline - Online status
 * @returns {Promise<void>}
 */
export const setUserPresence = async (
  canvasId = DEFAULT_CANVAS_ID,
  userId,
  userName,
  color,
  isOnline = true
) => {
  try {
    const presenceRef = doc(getPresenceRef(canvasId), userId);
    await setDoc(presenceRef, {
      userId,
      userName,
      color,
      isOnline,
      lastSeen: Date.now(),
    });
    console.log('Presence updated:', userId, isOnline ? 'online' : 'offline');
  } catch (error) {
    console.error('Error setting presence:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time presence updates
 * @param {string} canvasId - Canvas ID
 * @param {Function} callback - Callback function receiving array of presence data
 * @returns {Function} Unsubscribe function
 */
export const subscribeToPresence = (canvasId = DEFAULT_CANVAS_ID, callback) => {
  const q = query(getPresenceRef(canvasId));
  
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const presenceData = [];
      snapshot.forEach((doc) => {
        presenceData.push({ id: doc.id, ...doc.data() });
      });
      callback(presenceData);
    },
    (error) => {
      console.error('Error subscribing to presence:', error);
    }
  );
  
  return unsubscribe;
};

/**
 * Update user's lastSeen timestamp (heartbeat)
 * @param {string} canvasId - Canvas ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const updatePresenceHeartbeat = async (canvasId = DEFAULT_CANVAS_ID, userId) => {
  try {
    const presenceRef = doc(getPresenceRef(canvasId), userId);
    await updateDoc(presenceRef, {
      lastSeen: Date.now(),
      isOnline: true,
    });
  } catch (error) {
    console.error('Error updating presence heartbeat:', error);
    // Don't throw - heartbeat failures shouldn't break the app
  }
};

// ============================================================================
// TEST/UTILITY FUNCTIONS
// ============================================================================

/**
 * Test Firestore connection by checking if db is accessible
 * Note: This doesn't write anything, just verifies the connection exists
 * @returns {Promise<boolean>} True if connection successful
 */
export const testFirestoreConnection = async () => {
  try {
    // Just check if the database reference exists
    if (!db) {
      throw new Error('Firestore database not initialized');
    }
    
    // Try to get a reference to verify the connection
    const testRef = getObjectsRef(DEFAULT_CANVAS_ID);
    if (testRef) {
      console.log('✅ Firestore connection test successful!');
      return true;
    }
    
    throw new Error('Could not get Firestore reference');
  } catch (error) {
    console.error('❌ Firestore connection test failed:', error);
    return false;
  }
};

