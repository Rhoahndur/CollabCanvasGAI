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
  onDisconnect,
} from 'firebase/database';
import { realtimeDb } from './firebase';
import { DEFAULT_CANVAS_ID } from '../utils/constants';

// Reference paths for Realtime Database
const getCanvasRef = (canvasId = DEFAULT_CANVAS_ID) => ref(realtimeDb, `canvases/${canvasId}`);
const getCanvasMetadataRef = (canvasId = DEFAULT_CANVAS_ID) => ref(realtimeDb, `canvases/${canvasId}/metadata`);
const getCanvasPermissionsRef = (canvasId = DEFAULT_CANVAS_ID) => ref(realtimeDb, `canvases/${canvasId}/permissions`);
const getObjectsRef = (canvasId = DEFAULT_CANVAS_ID) => ref(realtimeDb, `canvases/${canvasId}/objects`);
const getObjectRef = (canvasId = DEFAULT_CANVAS_ID, objectId) => ref(realtimeDb, `canvases/${canvasId}/objects/${objectId}`);
const getCursorsRef = (canvasId = DEFAULT_CANVAS_ID) => ref(realtimeDb, `canvases/${canvasId}/cursors`);
const getCursorRef = (canvasId = DEFAULT_CANVAS_ID, sessionId) => ref(realtimeDb, `canvases/${canvasId}/cursors/${sessionId}`);
const getPresenceRef = (canvasId = DEFAULT_CANVAS_ID) => ref(realtimeDb, `canvases/${canvasId}/presence`);
const getPresenceSessionRef = (canvasId = DEFAULT_CANVAS_ID, sessionId) => ref(realtimeDb, `canvases/${canvasId}/presence/${sessionId}`);
const getUserCanvasesRef = (userId) => ref(realtimeDb, `userCanvases/${userId}`);
const getUserCanvasRef = (userId, canvasId) => ref(realtimeDb, `userCanvases/${userId}/${canvasId}`);

// ============================================================================
// CONNECTION MONITORING
// ============================================================================

/**
 * Monitor Realtime Database connection status
 * @param {Function} callback - Called with connection status (true/false)
 * @returns {Function} Unsubscribe function
 */
export const monitorConnection = (callback) => {
  const connectedRef = ref(realtimeDb, '.info/connected');
  
  const unsubscribe = onValue(connectedRef, (snapshot) => {
    const connected = snapshot.val() === true;
    // console.log(connected ? '🟢 Connected to Realtime Database' : '🔴 Disconnected from Realtime Database');
    callback(connected);
  });
  
  return unsubscribe;
};

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
    
    // console.log('Shape created:', shapeData.type, objectId);
    return objectId;
  } catch (error) {
    console.error('Error creating shape:', error);
    throw error;
  }
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
    // console.log('Shape updated:', shapeId);
  } catch (error) {
    console.error('Error updating shape:', error);
    throw error;
  }
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
    // console.log('Shape deleted:', shapeId);
  } catch (error) {
    console.error('Error deleting shape:', error);
    throw error;
  }
};

/**
 * Lock an object to prevent simultaneous manipulation
 * @param {string} canvasId - Canvas ID
 * @param {string} objectId - Object ID
 * @param {string} userId - User ID acquiring the lock
 * @param {string} userName - User display name
 * @returns {Promise<void>}
 */
export const lockObject = async (canvasId = DEFAULT_CANVAS_ID, objectId, userId, userName = '') => {
  try {
    const objectRef = getObjectRef(canvasId, objectId);
    await update(objectRef, {
      lockedBy: userId,
      lockedByUserName: userName,
    });
    // console.log('Object locked:', objectId, 'by', userName);
  } catch (error) {
    console.error('Error locking object:', error);
    throw error;
  }
};

/**
 * Unlock an object
 * @param {string} canvasId - Canvas ID
 * @param {string} objectId - Object ID
 * @returns {Promise<void>}
 */
export const unlockObject = async (canvasId = DEFAULT_CANVAS_ID, objectId) => {
  try {
    const objectRef = getObjectRef(canvasId, objectId);
    await update(objectRef, {
      lockedBy: null,
      lockedByUserName: null,
    });
    // console.log('Object unlocked:', objectId);
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
    
    // Set up automatic cleanup on disconnect (only once per session)
    // Note: This is idempotent - calling multiple times won't create multiple cleanup handlers
    if (isActive) {
      await onDisconnect(cursorRef).remove();
    }
    
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
    // console.log('Cursor removed:', sessionId);
  } catch (error) {
    // Silently ignore if cursor doesn't exist or permission denied (already cleaned up)
    if (error.code === 'PERMISSION_DENIED' || error.code === 'permission-denied') {
      // console.log('Cursor already removed or not found:', sessionId);
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
    
    // Set up automatic cleanup on disconnect
    await onDisconnect(presenceRef).remove();
    // console.log('🔌 Auto-cleanup configured for presence:', userName);
    
    // Set the presence data
    await set(presenceRef, {
      sessionId,
      userId,
      userName,
      color,
      isOnline,
      isActive,
      lastSeen: Date.now(),
    });
    // console.log('Presence updated:', userName, isOnline ? 'online' : 'offline', isActive ? '(active)' : '(away)');
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
    // console.log('Presence removed:', sessionId);
  } catch (error) {
    // Silently ignore if presence doesn't exist or permission denied
    if (error.code === 'PERMISSION_DENIED' || error.code === 'permission-denied') {
      // console.log('Presence already removed or not found:', sessionId);
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
      // console.log(`🧹 Cleaned up ${staleSessionIds.length} stale presence sessions`);
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
      // console.log('✅ Realtime Database connection test successful!');
      return true;
    }
    
    throw new Error('Could not get Realtime Database reference');
  } catch (error) {
    console.error('❌ Realtime Database connection test failed:', error);
    return false;
  }
};

// ============================================================================
// CANVAS MANAGEMENT (Multi-Canvas Support)
// ============================================================================

/**
 * Generate a unique canvas ID
 * @param {string} userId - User ID
 * @returns {string} Unique canvas ID
 */
export const generateCanvasId = (userId) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${userId}_${timestamp}_${random}`;
};

/**
 * Create a new canvas
 * @param {string} userId - Owner user ID
 * @param {string} canvasName - Canvas name
 * @param {string} [template='blank'] - Template type ('blank', 'brainstorm', 'wireframe')
 * @returns {Promise<string>} Canvas ID
 */
export const createCanvas = async (userId, canvasName, template = 'blank') => {
  try {
    const canvasId = generateCanvasId(userId);
    const now = Date.now();
    
    // console.log('🎨 Creating canvas:', canvasId, canvasName, template);
    
    // IMPORTANT: Set permissions FIRST before writing any other data
    // Security rules require permissions to exist before writing metadata/objects
    await set(ref(realtimeDb, `canvases/${canvasId}/permissions/${userId}`), 'owner');
    // console.log('✅ Permissions set');
    
    // Canvas metadata
    const metadata = {
      name: canvasName,
      createdBy: userId,
      createdAt: now,
      lastModified: now,
      template,
    };
    
    // Set canvas metadata (now permissions exist, so this will work)
    await set(getCanvasMetadataRef(canvasId), metadata);
    // console.log('✅ Metadata set');
    
    // Add canvas to user's canvas list
    await set(getUserCanvasRef(userId, canvasId), {
      name: canvasName,
      role: 'owner',
      lastAccessed: now,
      starred: false,
    });
    // console.log('✅ User canvas index updated');
    
    // Initialize template shapes if not blank
    if (template !== 'blank') {
      const templateShapes = getTemplateShapes(template, userId);
      if (templateShapes.length > 0) {
        const objectsRef = getObjectsRef(canvasId);
        for (const shape of templateShapes) {
          const objectId = generateObjectId(userId);
          await set(ref(realtimeDb, `canvases/${canvasId}/objects/${objectId}`), {
            ...shape,
            id: objectId,
            timestamp: now,
          });
        }
      }
    }
    
    // console.log('✅ Canvas created:', canvasId, canvasName);
    return canvasId;
  } catch (error) {
    console.error('❌ Error creating canvas:', error);
    throw error;
  }
};

/**
 * Get template shapes based on template type
 * @param {string} template - Template type
 * @param {string} userId - User ID (for createdBy field)
 * @returns {Array} Array of shape objects
 */
const getTemplateShapes = (template, userId) => {
  const baseShape = {
    createdBy: userId,
    rotation: 0,
    lockedBy: null,
    lockedByUserName: null,
  };
  
  if (template === 'brainstorm') {
    return [
      // Ideas zone (Yellow)
      { ...baseShape, type: 'rectangle', x: 100, y: 100, width: 400, height: 500, color: 'rgba(255, 235, 59, 0.2)', zIndex: Date.now() },
      { ...baseShape, type: 'text', x: 150, y: 120, width: 300, height: 50, text: '💡 Ideas', fontSize: 24, fontWeight: 'bold', textColor: 'rgba(255, 235, 59, 1)', zIndex: Date.now() + 1 },
      // Actions zone (Green)
      { ...baseShape, type: 'rectangle', x: 550, y: 100, width: 400, height: 500, color: 'rgba(76, 175, 80, 0.2)', zIndex: Date.now() + 2 },
      { ...baseShape, type: 'text', x: 600, y: 120, width: 300, height: 50, text: '⚡ Actions', fontSize: 24, fontWeight: 'bold', textColor: 'rgba(76, 175, 80, 1)', zIndex: Date.now() + 3 },
      // Questions zone (Blue)
      { ...baseShape, type: 'rectangle', x: 1000, y: 100, width: 400, height: 500, color: 'rgba(33, 150, 243, 0.2)', zIndex: Date.now() + 4 },
      { ...baseShape, type: 'text', x: 1050, y: 120, width: 300, height: 50, text: '❓ Questions', fontSize: 24, fontWeight: 'bold', textColor: 'rgba(33, 150, 243, 1)', zIndex: Date.now() + 5 },
    ];
  } else if (template === 'wireframe') {
    return [
      // Header
      { ...baseShape, type: 'rectangle', x: 100, y: 100, width: 1200, height: 100, color: 'rgba(200, 200, 200, 0.3)', zIndex: Date.now() },
      { ...baseShape, type: 'text', x: 150, y: 130, width: 200, height: 40, text: 'Header Area', fontSize: 20, textColor: 'rgba(100, 100, 100, 1)', zIndex: Date.now() + 1 },
      // Sidebar
      { ...baseShape, type: 'rectangle', x: 100, y: 220, width: 250, height: 600, color: 'rgba(200, 200, 200, 0.3)', zIndex: Date.now() + 2 },
      { ...baseShape, type: 'text', x: 150, y: 250, width: 150, height: 40, text: 'Sidebar', fontSize: 18, textColor: 'rgba(100, 100, 100, 1)', zIndex: Date.now() + 3 },
      // Main Content
      { ...baseShape, type: 'rectangle', x: 370, y: 220, width: 930, height: 600, color: 'rgba(255, 255, 255, 0)', zIndex: Date.now() + 4 },
      { ...baseShape, type: 'text', x: 420, y: 250, width: 300, height: 40, text: 'Main Content Area', fontSize: 20, textColor: 'rgba(100, 100, 100, 1)', zIndex: Date.now() + 5 },
    ];
  }
  
  return []; // blank template
};

/**
 * Get canvas metadata
 * @param {string} canvasId - Canvas ID
 * @returns {Promise<Object>} Canvas metadata
 */
export const getCanvasMetadata = async (canvasId) => {
  try {
    const snapshot = await get(getCanvasMetadataRef(canvasId));
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting canvas metadata:', error);
    throw error;
  }
};

/**
 * Request access to a canvas via shared link
 * Automatically grants viewer access if canvas exists
 * @param {string} canvasId - Canvas ID
 * @param {string} userId - User ID requesting access
 * @param {string} userName - User display name
 * @returns {Promise<Object>} { success: boolean, role: string, canvasName: string }
 */
export const requestCanvasAccess = async (canvasId, userId, userName) => {
  try {
    // Check if user already has access
    const userCanvasRef = getUserCanvasRef(userId, canvasId);
    const userCanvasSnapshot = await get(userCanvasRef);
    
    if (userCanvasSnapshot.exists()) {
      // User already has access
      const canvasData = userCanvasSnapshot.val();
      return { 
        success: true, 
        role: canvasData.role,
        canvasName: canvasData.name,
        alreadyHadAccess: true
      };
    }
    
    // Check if canvas exists
    const canvasMetadata = await getCanvasMetadata(canvasId);
    if (!canvasMetadata) {
      return { success: false, error: 'Canvas not found' };
    }
    
    // Grant viewer access to the user
    const role = 'viewer';
    await addCanvasPermission(canvasId, userId, role, canvasMetadata.name);
    
    return { 
      success: true, 
      role,
      canvasName: canvasMetadata.name,
      alreadyHadAccess: false
    };
  } catch (error) {
    console.error('❌ Error requesting canvas access:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Duplicate a canvas
 * @param {string} sourceCanvasId - Canvas ID to duplicate
 * @param {string} userId - User ID (must be owner)
 * @param {string} newName - Name for the duplicated canvas
 * @returns {Promise<string>} New canvas ID
 */
export const duplicateCanvas = async (sourceCanvasId, userId, newName) => {
  try {
    // Verify user is owner of source canvas by checking their userCanvases
    const userCanvasRef = getUserCanvasRef(userId, sourceCanvasId);
    const userCanvasSnapshot = await get(userCanvasRef);
    
    if (!userCanvasSnapshot.exists()) {
      throw new Error('Canvas not found in your list');
    }
    
    const userCanvasData = userCanvasSnapshot.val();
    if (userCanvasData.role !== 'owner') {
      throw new Error('Only the owner can duplicate the canvas');
    }
    
    // Get source canvas data
    const sourceCanvasSnapshot = await get(getCanvasRef(sourceCanvasId));
    if (!sourceCanvasSnapshot.exists()) {
      throw new Error('Source canvas not found');
    }
    
    const sourceData = sourceCanvasSnapshot.val();
    
    // Generate new canvas ID
    const timestamp = Date.now();
    const newCanvasId = `canvas_${userId}_${timestamp}`;
    
    // Create new canvas with duplicated data
    const newCanvasData = {
      metadata: {
        name: newName,
        createdBy: userId,
        createdAt: timestamp,
        lastModified: timestamp,
        template: sourceData.metadata?.template || 'blank',
        settings: {
          backgroundColor: sourceData.metadata?.settings?.backgroundColor || '#1a1a1a',
          gridVisible: sourceData.metadata?.settings?.gridVisible !== false,
          ...sourceData.metadata?.settings,
        },
      },
      permissions: {
        [userId]: 'owner',
      },
      objects: {},
      cursors: {},
      presence: {},
    };
    
    // Copy all objects with slight position offset
    if (sourceData.objects) {
      const offsetX = 20; // Offset duplicated objects by 20px
      const offsetY = 20;
      
      Object.entries(sourceData.objects).forEach(([oldId, obj]) => {
        // Skip objects with invalid data
        if (!obj || typeof obj !== 'object') {
          console.warn(`Skipping invalid object during duplication: ${oldId}`);
          return;
        }
        
        // Ensure x and y are valid numbers
        const objX = typeof obj.x === 'number' && !isNaN(obj.x) ? obj.x : 0;
        const objY = typeof obj.y === 'number' && !isNaN(obj.y) ? obj.y : 0;
        
        // Generate new ID for duplicated object
        const newId = generateObjectId(userId);
        
        // Copy object with offset position
        newCanvasData.objects[newId] = {
          ...obj,
          id: newId,
          x: objX + offsetX,
          y: objY + offsetY,
          createdBy: userId,
          lockedBy: null,
          lockedByUserName: null,
          timestamp: timestamp,
        };
      });
    }
    
    // Save new canvas
    await set(getCanvasRef(newCanvasId), newCanvasData);
    
    // Add to user's canvas list
    await set(getUserCanvasRef(userId, newCanvasId), {
      name: newName,
      role: 'owner',
      lastAccessed: timestamp,
      starred: false,
    });
    
    // console.log('✅ Canvas duplicated:', sourceCanvasId, '→', newCanvasId);
    return newCanvasId;
  } catch (error) {
    console.error('❌ Error duplicating canvas:', error);
    throw error;
  }
};

/**
 * Update canvas metadata
 * @param {string} canvasId - Canvas ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateCanvasMetadata = async (canvasId, updates) => {
  try {
    await update(getCanvasMetadataRef(canvasId), {
      ...updates,
      lastModified: Date.now(),
    });
    // console.log('✅ Canvas metadata updated:', canvasId);
  } catch (error) {
    console.error('❌ Error updating canvas metadata:', error);
    throw error;
  }
};

/**
 * Delete a canvas
 * @param {string} canvasId - Canvas ID
 * @param {string} userId - User ID (must be owner)
 * @returns {Promise<void>}
 */
export const deleteCanvas = async (canvasId, userId) => {
  try {
    // Verify user is owner
    const permissionsSnapshot = await get(ref(realtimeDb, `canvases/${canvasId}/permissions/${userId}`));
    if (!permissionsSnapshot.exists() || permissionsSnapshot.val() !== 'owner') {
      throw new Error('Only the owner can delete the canvas');
    }
    
    // Delete entire canvas
    await remove(getCanvasRef(canvasId));
    
    // Remove from all users' canvas lists
    const permissionsRef = getCanvasPermissionsRef(canvasId);
    const permissionsSnap = await get(permissionsRef);
    if (permissionsSnap.exists()) {
      const permissions = permissionsSnap.val();
      const userIds = Object.keys(permissions);
      
      for (const uid of userIds) {
        await remove(getUserCanvasRef(uid, canvasId));
      }
    }
    
    // console.log('✅ Canvas deleted:', canvasId);
  } catch (error) {
    console.error('❌ Error deleting canvas:', error);
    throw error;
  }
};

/**
 * Get all canvases for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of canvas data
 */
export const getUserCanvases = async (userId) => {
  try {
    const snapshot = await get(getUserCanvasesRef(userId));
    if (!snapshot.exists()) {
      return [];
    }
    
    const canvasesData = snapshot.val();
    const canvases = [];
    const orphanedCanvases = [];
    
    for (const [canvasId, canvasInfo] of Object.entries(canvasesData)) {
      try {
        // Verify canvas exists and user has permission
        const canvasRef = ref(realtimeDb, `canvases/${canvasId}/metadata`);
        const canvasSnapshot = await get(canvasRef);
        
        if (!canvasSnapshot.exists()) {
          // console.warn(`⚠️ Canvas ${canvasId} metadata not found, marking as orphaned`);
          orphanedCanvases.push(canvasId);
          continue;
        }
        
        // Canvas exists, add to list
        canvases.push({
          id: canvasId,
          ...canvasInfo,
        });
      } catch (err) {
        // If permission denied or other error, skip this canvas
        // console.warn(`⚠️ Cannot access canvas ${canvasId}:`, err.message);
        orphanedCanvases.push(canvasId);
      }
    }
    
    // Clean up orphaned canvas references
    if (orphanedCanvases.length > 0) {
      // console.log(`🧹 Cleaning up ${orphanedCanvases.length} orphaned canvas references`);
      for (const canvasId of orphanedCanvases) {
        try {
          await remove(getUserCanvasRef(userId, canvasId));
          // console.log(`✅ Removed orphaned canvas reference: ${canvasId}`);
        } catch (cleanupErr) {
          console.error(`❌ Failed to clean up ${canvasId}:`, cleanupErr);
        }
      }
    }
    
    // Sort by lastAccessed (most recent first)
    canvases.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
    
    return canvases;
  } catch (error) {
    console.error('❌ Error getting user canvases:', error);
    throw error;
  }
};

/**
 * Add canvas permission for a user
 * @param {string} canvasId - Canvas ID
 * @param {string} userId - User ID to grant permission
 * @param {string} role - Role ('owner', 'editor', 'viewer')
 * @param {string} canvasName - Canvas name (for user's canvas list)
 * @returns {Promise<void>}
 */
/**
 * Toggle starred status for a canvas
 * @param {string} canvasId - Canvas ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} New starred status
 */
export const toggleCanvasStarred = async (canvasId, userId) => {
  try {
    const userCanvasRef = getUserCanvasRef(userId, canvasId);
    const snapshot = await get(userCanvasRef);
    
    if (!snapshot.exists()) {
      throw new Error('Canvas not found in user\'s list');
    }
    
    const currentStarred = snapshot.val().starred || false;
    const newStarred = !currentStarred;
    
    await update(userCanvasRef, {
      starred: newStarred,
    });
    
    // console.log('⭐ Canvas starred status toggled:', canvasId, newStarred);
    return newStarred;
  } catch (error) {
    console.error('❌ Error toggling starred status:', error);
    throw error;
  }
};

/**
 * Get user's role for a specific canvas
 * @param {string} canvasId - Canvas ID
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} User's role ('owner', 'editor', 'viewer') or null if no access
 */
export const getUserRole = async (canvasId, userId) => {
  try {
    // Try to get role from userCanvases first (faster)
    const userCanvasSnapshot = await get(getUserCanvasRef(userId, canvasId));
    if (userCanvasSnapshot.exists()) {
      return userCanvasSnapshot.val().role;
    }
    
    // Fallback: check canvas permissions
    const permissionSnapshot = await get(ref(realtimeDb, `canvases/${canvasId}/permissions/${userId}`));
    if (permissionSnapshot.exists()) {
      return permissionSnapshot.val();
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

export const addCanvasPermission = async (canvasId, userId, role, canvasName) => {
  try {
    // Add permission to canvas
    await set(ref(realtimeDb, `canvases/${canvasId}/permissions/${userId}`), role);
    
    // Add canvas to user's canvas list
    await set(getUserCanvasRef(userId, canvasId), {
      name: canvasName,
      role,
      lastAccessed: Date.now(),
      starred: false,
    });
    
    // console.log('✅ Canvas permission added:', canvasId, userId, role);
  } catch (error) {
    console.error('❌ Error adding canvas permission:', error);
    throw error;
  }
};

/**
 * Remove canvas permission for a user
 * @param {string} canvasId - Canvas ID
 * @param {string} userId - User ID to remove
 * @returns {Promise<void>}
 */
export const removeCanvasPermission = async (canvasId, userId) => {
  try {
    // Remove permission from canvas
    await remove(ref(realtimeDb, `canvases/${canvasId}/permissions/${userId}`));
    
    // Remove canvas from user's canvas list
    await remove(getUserCanvasRef(userId, canvasId));
    
    // console.log('✅ Canvas permission removed:', canvasId, userId);
  } catch (error) {
    console.error('❌ Error removing canvas permission:', error);
    throw error;
  }
};

/**
 * Update user's last accessed time for a canvas
 * @param {string} userId - User ID
 * @param {string} canvasId - Canvas ID
 * @returns {Promise<void>}
 */
export const updateCanvasAccess = async (userId, canvasId) => {
  try {
    await update(getUserCanvasRef(userId, canvasId), {
      lastAccessed: Date.now(),
    });
  } catch (error) {
    // Silently fail - not critical
    // console.warn('Warning: Could not update canvas access time:', error);
  }
};
