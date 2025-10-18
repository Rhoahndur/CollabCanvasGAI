import { useState, useEffect, useRef } from 'react';
import { 
  subscribeToPresence, 
  setUserPresence, 
  updatePresenceHeartbeat,
  removePresence,
  cleanupStalePresence
} from '../services/canvasService';
import { DEFAULT_CANVAS_ID, PRESENCE_HEARTBEAT_INTERVAL, PRESENCE_TIMEOUT } from '../utils/constants';
import { getUserColor } from '../utils/colorUtils';

/**
 * Custom hook for managing user presence
 * Handles online status, heartbeat, and visibility changes
 */
export function usePresence(sessionId, userId, userName, canvasId = DEFAULT_CANVAS_ID) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [allPresenceData, setAllPresenceData] = useState([]);
  const heartbeatIntervalRef = useRef(null);
  const filterIntervalRef = useRef(null);

  // Helper function to filter active users and deduplicate by sessionId
  const filterActiveUsers = (presenceData) => {
    const timeoutThreshold = Date.now() - PRESENCE_TIMEOUT; // 30 second timeout
    
    // Deduplicate by sessionId first (in case Firestore sends duplicates)
    const sessionMap = new Map();
    presenceData.forEach(user => {
      // Keep the most recent data for each sessionId
      const existing = sessionMap.get(user.sessionId);
      if (!existing || user.lastSeen > existing.lastSeen) {
        sessionMap.set(user.sessionId, user);
      }
    });
    
    // Filter to only active sessions (within timeout threshold)
    const activeUsers = Array.from(sessionMap.values()).filter(user => 
      user.isOnline && user.lastSeen > timeoutThreshold
    );
    
    return activeUsers;
  };

  // Subscribe to presence updates
  useEffect(() => {
    // Don't connect if no canvasId (e.g., on dashboard)
    if (!sessionId || !userId || !userName || !canvasId) {
      console.log('⏸️ Skipping presence setup (no canvasId or missing params)');
      return;
    }

    console.log('Setting up presence for user:', userName, 'session:', sessionId, 'canvas:', canvasId);

    // Clean up stale sessions on mount (especially helpful for Safari and duplicate sessions)
    cleanupStalePresence(canvasId).then((cleanedCount) => {
      console.log(`🧹 Initial cleanup removed ${cleanedCount} stale sessions`);
      
      // Set user as online after cleanup completes
      const userColor = getUserColor(userId);
      setUserPresence(canvasId, sessionId, userId, userName, userColor, true)
        .catch(console.error);
    }).catch(console.error);
    // Subscribe to presence changes from Firestore
    const unsubscribe = subscribeToPresence(canvasId, (presenceData) => {
      setAllPresenceData(presenceData);
      const activeUsers = filterActiveUsers(presenceData);
      console.log('Active users:', activeUsers.length);
      setOnlineUsers(activeUsers);
    });

    // Client-side polling to re-filter stale users every 5 seconds
    // This ensures the UI updates even if Firestore doesn't send new data
    // Using 5 seconds to avoid premature filtering while heartbeat is in flight
    filterIntervalRef.current = setInterval(() => {
      setAllPresenceData(prevData => {
        const activeUsers = filterActiveUsers(prevData);
        setOnlineUsers(activeUsers);
        return prevData;
      });
    }, 5000); // Re-filter every 5 seconds

    // Start heartbeat to keep presence alive
    heartbeatIntervalRef.current = setInterval(() => {
      updatePresenceHeartbeat(canvasId, sessionId)
        .catch(console.error);
    }, PRESENCE_HEARTBEAT_INTERVAL);

    // Handle visibility changes (tab switching)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab hidden - mark as away (online but not active)
        updatePresenceHeartbeat(canvasId, sessionId, false).catch(console.error);
      } else {
        // Tab visible again - mark as active
        const userColor = getUserColor(userId);
        setUserPresence(canvasId, sessionId, userId, userName, userColor, true, true)
          .catch(console.error);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle page unload/refresh - cleanup presence immediately
    const handleBeforeUnload = () => {
      // Remove presence document immediately
      removePresence(canvasId, sessionId).catch(() => {
        // Ignore errors during unload
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      console.log('Cleaning up presence for session:', sessionId);
      
      // Clear intervals
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (filterIntervalRef.current) {
        clearInterval(filterIntervalRef.current);
      }
      
      // Remove listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Remove presence document immediately
      removePresence(canvasId, sessionId).catch(console.error);
      
      // Unsubscribe from Firestore
      unsubscribe();
    };
  }, [sessionId, userId, userName, canvasId]);

  return {
    onlineUsers,
    onlineCount: onlineUsers.length,
  };
}



