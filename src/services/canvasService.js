/**
 * Canvas Service - Realtime Database operations for collaborative canvas
 * Handles shapes, cursors, presence, and object locking
 */

import {
  ref,
  set,
  update,
  remove,
  onValue,
  off,
  get,
  query,
  orderByChild,
} from 'firebase/database';
import { realtimeDb } from './firebase';
import { DEFAULT_CANVAS_ID } from '../utils/constants';

// Reference paths for Realtime Database
const getCanvasRef = (canvasId = DEFAULT_CANVAS_ID) => ref(realtimeDb, `canvases/${canvasId}`);
const getObjectsRef = (canvasId = DEFAULT_CANVAS_ID) => ref(realtimeDb, `canvases/${canvasId}/objects`);
const getObjectRef = (canvasId = DEFAULT_CANVAS_ID, objectId) => ref(realtimeDb, `canvases/${canvasId}/objects/${objectId}`);
const getCursorsRef = (canvasId = DEFAULT_CANVAS_ID) => ref(realtimeDb, `canvases/${canvasId}/cursors`);
const getCursorRef = (canvasId = DEFAULT_CANVAS_ID, sessionId) => ref(realtimeDb, `canvases/${canvasId}/cursors/${sessionId}`);
const getPresenceRef = (canvasId = DEFAULT_CANVAS_ID) => ref(realtimeDb, `canvases/${canvasId}/presence`);
const getPresenceSessionRef = (canvasId = DEFAULT_CANVAS_ID, sessionId) => ref(realtimeDb, `canvases/${canvasId}/presence/${sessionId}`);

/**
 * Generate a composite object ID to prevent conflicts
 * Format: {userId}_{timestamp}_{random}
 * The random component ensures uniqueness even if multiple shapes are created in the same millisecond
 */
export const generateObjectId = (userId) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9); // 7-char random string
  return `${userId}_${timestamp}_${random}`;
};

// ============================================================================
// SHAPE OPERATIONS (supports rectangles, circles, polygons, text)
// ============================================================================

/**
 * Create a new shape on the canvas
 * @param {string} canvasId - Canvas ID
 * @param {Object} shapeData - Shape data (type, x, y, color, createdBy, and type-specific props)
 * @returns {Promise<string>} Created shape ID
 */
export const createShape = async (canvasId = DEFAULT_CANVAS_ID, shapeData) => {
  try {
    const objectId = generateObjectId(shapeData.createdBy);
    const objectRef = getObjectRef(canvasId, objectId);
    
    await set(objectRef, {
      ...shapeData,
      id: objectId,
      lockedBy: null,
      lockedByUserName: null,
      timestamp: Date.now(),
    });
    
    console.log('Shape created:', shapeData.type, objectId);
    return objectId;
  } catch (error) {
    console.error('Error creating shape:', error);
    throw error;
  }
};

/**
 * Create a new rectangle on the canvas (backward compatibility)
 * @param {string} canvasId - Canvas ID
 * @param {Object} rectData - Rectangle data {x, y, width, height, color, createdBy}
 * @returns {Promise<string>} Created rectangle ID
 */
export const createRectangle = async (canvasId = DEFAULT_CANVAS_ID, rectData) => {
  return createShape(canvasId, { ...rectData, type: 'rectangle' });
};

/**
 * Update an existing shape
 * @param {string} canvasId - Canvas ID
 * @param {string} shapeId - Shape ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateShape = async (canvasId = DEFAULT_CANVAS_ID, shapeId, updates) => {
  try {
    const objectRef = getObjectRef(canvasId, shapeId);
    await update(objectRef, updates);
    console.log('Shape updated:', shapeId);
  } catch (error) {
    console.error('Error updating shape:', error);
    throw error;
  }
};

/**
 * Update an existing rectangle (backward compatibility)
 * @param {string} canvasId - Canvas ID
 * @param {string} rectId - Rectangle ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateRectangle = async (canvasId = DEFAULT_CANVAS_ID, rectId, updates) => {
  return updateShape(canvasId, rectId, updates);
};

/**
 * Delete a shape
 * @param {string} canvasId - Canvas ID
 * @param {string} shapeId - Shape ID
 * @returns {Promise<void>}
 */
export const deleteShape = async (canvasId = DEFAULT_CANVAS_ID, shapeId) => {
  try {
    const objectRef = getObjectRef(canvasId, shapeId);
    await remove(objectRef);
    console.log('Shape deleted:', shapeId);
  } catch (error) {
    console.error('Error deleting shape:', error);
    throw error;
  }
};

/**
 * Delete a rectangle (backward compatibility)
 * @param {string} canvasId - Canvas ID
 * @param {string} rectId - Rectangle ID
 * @returns {Promise<void>}
 */
export const deleteRectangle = async (canvasId = DEFAULT_CANVAS_ID, rectId) => {
  return deleteShape(canvasId, rectId);
};

/**
 * Lock an object to prevent simultaneous manipulation
 * @param {string} canvasId - Canvas ID
 * @param {string} rectId - Rectangle ID
 * @param {string} userId - User ID acquiring the lock
 * @param {string} userName - User display name
 * @returns {Promise<void>}
 */
export const lockObject = async (canvasId = DEFAULT_CANVAS_ID, rectId, userId, userName = '') => {
  try {
    const objectRef = getObjectRef(canvasId, rectId);
    await update(objectRef, {
      lockedBy: userId,
      lockedByUserName: userName,
    });
    console.log('Object locked:', rectId, 'by', userName);
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
    const objectRef = getObjectRef(canvasId, rectId);
    await update(objectRef, {
      lockedBy: null,
      lockedByUserName: null,
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
 * @param {Function} errorCallback - Optional error callback
 * @returns {Function} Unsubscribe function
 */
export const subscribeToObjects = (canvasId = DEFAULT_CANVAS_ID, callback, errorCallback) => {
  const objectsRef = getObjectsRef(canvasId);
  
  onValue(
    objectsRef,
    (snapshot) => {
      const objects = [];
      const data = snapshot.val();
      
      if (data) {
        Object.keys(data).forEach((key) => {
          objects.push({ id: key, ...data[key] });
        });
      }
      
      callback(objects);
    },
    (error) => {
      console.error('Error subscribing to objects:', error);
      if (errorCallback) {
        errorCallback(error);
      }
    }
  );
  
  // Return unsubscribe function
  return () => {
    off(objectsRef);
  };
};

// ============================================================================
// CURSOR OPERATIONS
// ============================================================================

/**
 * Update cursor position
 * @param {string} canvasId - Canvas ID
 * @param {string} sessionId - Unique session ID for this browser tab
 * @param {string} userId - User ID (for identifying the user)
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} userName - User display name
 * @param {number} arrivalTime - When cursor first appeared
 * @param {boolean} isActive - Whether user is actively dragging (shows cursor to others)
 * @returns {Promise<void>}
 */
export const updateCursor = async (
  canvasId = DEFAULT_CANVAS_ID,
  sessionId,
  userId,
  x,
  y,
  userName,
  arrivalTime,
  isActive = false
) => {
  try {
    const cursorRef = getCursorRef(canvasId, sessionId);
    await set(cursorRef, {
      sessionId,
      userId,
      x,
      y,
      userName,
      timestamp: Date.now(),
      arrivalTime: arrivalTime || Date.now(),
      isActive,
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
  const cursorsRef = getCursorsRef(canvasId);
  
  onValue(
    cursorsRef,
    (snapshot) => {
      const cursors = [];
      const data = snapshot.val();
      
      if (data) {
        Object.keys(data).forEach((key) => {
          cursors.push({ id: key, ...data[key] });
        });
      }
      
      callback(cursors);
    },
    (error) => {
      console.error('Error subscribing to cursors:', error);
    }
  );
  
  // Return unsubscribe function
  return () => {
    off(cursorsRef);
  };
};

/**
 * Remove cursor (on disconnect)
 * @param {string} canvasId - Canvas ID
 * @param {string} sessionId - Unique session ID for this browser tab
 * @returns {Promise<void>}
 */
export const removeCursor = async (canvasId = DEFAULT_CANVAS_ID, sessionId) => {
  try {
    const cursorRef = getCursorRef(canvasId, sessionId);
    await remove(cursorRef);
    console.log('Cursor removed:', sessionId);
  } catch (error) {
    // Silently ignore if cursor doesn't exist or permission denied (already cleaned up)
    if (error.code === 'PERMISSION_DENIED' || error.code === 'permission-denied') {
      console.log('Cursor already removed or not found:', sessionId);
    } else {
      console.error('Error removing cursor:', error);
    }
  }
};

// ============================================================================
// PRESENCE OPERATIONS
// ============================================================================

/**
 * Set user presence (online/offline status)
 * @param {string} canvasId - Canvas ID
 * @param {string} sessionId - Session ID (unique per browser tab)
 * @param {string} userId - User ID
 * @param {string} userName - User display name
 * @param {string} color - User's assigned color
 * @param {boolean} isOnline - Online status
 * @returns {Promise<void>}
 */
export const setUserPresence = async (
  canvasId = DEFAULT_CANVAS_ID,
  sessionId,
  userId,
  userName,
  color,
  isOnline = true,
  isActive = true
) => {
  try {
    const presenceRef = getPresenceSessionRef(canvasId, sessionId);
    await set(presenceRef, {
      sessionId,
      userId,
      userName,
      color,
      isOnline,
      isActive,
      lastSeen: Date.now(),
    });
    console.log('Presence updated:', userName, isOnline ? 'online' : 'offline', isActive ? '(active)' : '(away)');
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
  const presenceRef = getPresenceRef(canvasId);
  
  onValue(
    presenceRef,
    (snapshot) => {
      const presenceData = [];
      const data = snapshot.val();
      
      if (data) {
        Object.keys(data).forEach((key) => {
          presenceData.push({ id: key, ...data[key] });
        });
      }
      
      callback(presenceData);
    },
    (error) => {
      console.error('Error subscribing to presence:', error);
    }
  );
  
  // Return unsubscribe function
  return () => {
    off(presenceRef);
  };
};

/**
 * Update user's lastSeen timestamp (heartbeat)
 * @param {string} canvasId - Canvas ID
 * @param {string} sessionId - Session ID
 * @param {boolean} isActive - Whether the user is actively interacting (default: true)
 * @returns {Promise<void>}
 */
export const updatePresenceHeartbeat = async (canvasId = DEFAULT_CANVAS_ID, sessionId, isActive = true) => {
  try {
    const presenceRef = getPresenceSessionRef(canvasId, sessionId);
    await update(presenceRef, {
      lastSeen: Date.now(),
      isOnline: true,
      isActive,
    });
  } catch (error) {
    console.error('Error updating presence heartbeat:', error);
    // Don't throw - heartbeat failures shouldn't break the app
  }
};

/**
 * Remove a specific presence session
 * @param {string} canvasId - Canvas ID
 * @param {string} sessionId - Session ID to remove
 * @returns {Promise<void>}
 */
export const removePresence = async (canvasId = DEFAULT_CANVAS_ID, sessionId) => {
  try {
    const presenceRef = getPresenceSessionRef(canvasId, sessionId);
    await remove(presenceRef);
    console.log('Presence removed:', sessionId);
  } catch (error) {
    // Silently ignore if presence doesn't exist or permission denied
    if (error.code === 'PERMISSION_DENIED' || error.code === 'permission-denied') {
      console.log('Presence already removed or not found:', sessionId);
    } else {
      console.error('Error removing presence:', error);
    }
  }
};

/**
 * Clean up stale presence sessions (older than 30 seconds)
 * More aggressive cleanup to prevent duplicate entries
 * @param {string} canvasId - Canvas ID
 * @returns {Promise<number>} Number of sessions cleaned up
 */
export const cleanupStalePresence = async (canvasId = DEFAULT_CANVAS_ID) => {
  try {
    const presenceRef = getPresenceRef(canvasId);
    const snapshot = await get(presenceRef);
    
    const thirtySecondsAgo = Date.now() - 30 * 1000;
    const staleSessionIds = [];
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.keys(data).forEach((sessionId) => {
        const session = data[sessionId];
        if (!session.isOnline || session.lastSeen < thirtySecondsAgo) {
          staleSessionIds.push(sessionId);
        }
      });
    }
    
    // Delete stale sessions
    if (staleSessionIds.length > 0) {
      const updates = {};
      staleSessionIds.forEach(sessionId => {
        updates[sessionId] = null; // Setting to null deletes in Realtime Database
      });
      await update(presenceRef, updates);
      console.log(`🧹 Cleaned up ${staleSessionIds.length} stale presence sessions`);
    }
    
    return staleSessionIds.length;
  } catch (error) {
    console.error('Error cleaning up stale presence:', error);
    return 0;
  }
};

// ============================================================================
// TEST/UTILITY FUNCTIONS
// ============================================================================

/**
 * Test Realtime Database connection
 * @returns {Promise<boolean>} True if connection successful
 */
export const testFirestoreConnection = async () => {
  try {
    // Just check if the database reference exists
    if (!realtimeDb) {
      throw new Error('Realtime Database not initialized');
    }
    
    // Try to get a reference to verify the connection
    const testRef = getObjectsRef(DEFAULT_CANVAS_ID);
    if (testRef) {
      console.log('✅ Realtime Database connection test successful!');
      return true;
    }
    
    throw new Error('Could not get Realtime Database reference');
  } catch (error) {
    console.error('❌ Realtime Database connection test failed:', error);
    return false;
  }
};
