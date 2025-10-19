import { ref, onValue, update, get } from 'firebase/database';
import { realtimeDb } from './firebase';

/**
 * Lock Cleanup Service
 * Automatically releases stale locks when users disconnect or become inactive
 * 
 * Features:
 * - Monitors user presence
 * - Auto-unlocks objects when users disconnect
 * - Cleans up locks after inactivity timeout
 * - Prevents "orphaned locks" from crashed/force-closed tabs
 */

const LOCK_TIMEOUT_MS = 30000; // 30 seconds of inactivity
const CLEANUP_INTERVAL_MS = 10000; // Check every 10 seconds

/**
 * Start monitoring locks for a canvas and auto-cleanup stale ones
 * 
 * @param {string} canvasId - Canvas ID to monitor
 * @returns {Function} Cleanup function to stop monitoring
 */
export function startLockCleanup(canvasId) {
  if (!canvasId) return () => {};
  
  const objectsRef = ref(realtimeDb, `canvases/${canvasId}/objects`);
  const presenceRef = ref(realtimeDb, `canvases/${canvasId}/presence`);
  
  let activeUsers = new Set();
  let lastActivity = new Map(); // userId -> timestamp
  
  // Track active users via presence
  const presenceUnsubscribe = onValue(presenceRef, (snapshot) => {
    const presenceData = snapshot.val();
    activeUsers.clear();
    lastActivity.clear();
    
    if (presenceData) {
      Object.entries(presenceData).forEach(([sessionId, data]) => {
        if (data.userId && data.isActive) {
          activeUsers.add(data.userId);
          lastActivity.set(data.userId, data.lastActivity || Date.now());
        }
      });
    }
    
    // console.log(`🔍 Active users on canvas: ${activeUsers.size}`);
  });
  
  // Periodically check for stale locks
  const cleanupInterval = setInterval(async () => {
    try {
      const objectsSnapshot = await get(objectsRef);
      if (!objectsSnapshot.exists()) return;
      
      const objects = objectsSnapshot.val();
      const now = Date.now();
      const updates = {};
      let cleanedCount = 0;
      
      Object.entries(objects).forEach(([objectId, object]) => {
        if (!object.lockedBy) return; // Not locked
        
        const lockUserId = object.lockedBy;
        const isUserActive = activeUsers.has(lockUserId);
        const userLastActivity = lastActivity.get(lockUserId) || 0;
        const inactiveTime = now - userLastActivity;
        
        // Unlock if:
        // 1. User is no longer in active users list (disconnected)
        // 2. User has been inactive for more than LOCK_TIMEOUT_MS
        if (!isUserActive || inactiveTime > LOCK_TIMEOUT_MS) {
          updates[`${objectId}/lockedBy`] = null;
          updates[`${objectId}/lockedByUserName`] = null;
          cleanedCount++;
          
          console.log(
            `🧹 Cleaning stale lock on object ${objectId}:`,
            isUserActive ? `User inactive for ${Math.round(inactiveTime / 1000)}s` : 'User disconnected'
          );
        }
      });
      
      // Apply all unlocks in a single batch update
      if (cleanedCount > 0) {
        await update(objectsRef, updates);
        console.log(`✅ Cleaned ${cleanedCount} stale lock(s)`);
      }
    } catch (error) {
      console.error('❌ Error cleaning stale locks:', error);
    }
  }, CLEANUP_INTERVAL_MS);
  
  // Return cleanup function
  return () => {
    presenceUnsubscribe();
    clearInterval(cleanupInterval);
    console.log('🛑 Lock cleanup stopped');
  };
}

/**
 * Manually unlock an object (for force-unlock scenarios)
 * 
 * @param {string} canvasId - Canvas ID
 * @param {string} objectId - Object ID to unlock
 */
export async function forceUnlockObject(canvasId, objectId) {
  try {
    const objectRef = ref(realtimeDb, `canvases/${canvasId}/objects/${objectId}`);
    await update(objectRef, {
      lockedBy: null,
      lockedByUserName: null,
    });
    console.log(`🔓 Force-unlocked object: ${objectId}`);
  } catch (error) {
    console.error('❌ Error force-unlocking object:', error);
    throw error;
  }
}

/**
 * Clean all locks for a specific user (useful when user signs out)
 * 
 * @param {string} canvasId - Canvas ID
 * @param {string} userId - User ID whose locks to clear
 */
export async function unlockAllByUser(canvasId, userId) {
  try {
    const objectsRef = ref(realtimeDb, `canvases/${canvasId}/objects`);
    const objectsSnapshot = await get(objectsRef);
    
    if (!objectsSnapshot.exists()) return;
    
    const objects = objectsSnapshot.val();
    const updates = {};
    let unlockedCount = 0;
    
    Object.entries(objects).forEach(([objectId, object]) => {
      if (object.lockedBy === userId) {
        updates[`${objectId}/lockedBy`] = null;
        updates[`${objectId}/lockedByUserName`] = null;
        unlockedCount++;
      }
    });
    
    if (unlockedCount > 0) {
      await update(objectsRef, updates);
      console.log(`🔓 Unlocked ${unlockedCount} object(s) for user ${userId}`);
    }
  } catch (error) {
    console.error('❌ Error unlocking objects for user:', error);
    throw error;
  }
}

