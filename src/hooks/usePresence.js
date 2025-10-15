import { useState, useEffect, useRef } from 'react';
import { 
  subscribeToPresence, 
  setUserPresence, 
  updatePresenceHeartbeat,
  removePresence
} from '../services/canvasService';
import { DEFAULT_CANVAS_ID, PRESENCE_HEARTBEAT_INTERVAL } from '../utils/constants';
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

  // Helper function to filter active users
  const filterActiveUsers = (presenceData) => {
    const fortyFiveSecondsAgo = Date.now() - 45 * 1000;
    return presenceData.filter(user => 
      user.isOnline && user.lastSeen > fortyFiveSecondsAgo
    );
  };

  // Subscribe to presence updates
  useEffect(() => {
    if (!sessionId || !userId || !userName) return;

    console.log('Setting up presence for user:', userName, 'session:', sessionId);

    // Set user as online
    const userColor = getUserColor(userId);
    setUserPresence(canvasId, sessionId, userId, userName, userColor, true)
      .catch(console.error);

    // Subscribe to presence changes from Firestore
    const unsubscribe = subscribeToPresence(canvasId, (presenceData) => {
      setAllPresenceData(presenceData);
      const activeUsers = filterActiveUsers(presenceData);
      console.log('Active users:', activeUsers.length);
      setOnlineUsers(activeUsers);
    });

    // Client-side polling to re-filter stale users every 5 seconds
    // This ensures the UI updates even if Firestore doesn't send new data
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
        // Tab hidden - update lastSeen but keep online
        updatePresenceHeartbeat(canvasId, sessionId).catch(console.error);
      } else {
        // Tab visible again - refresh presence
        setUserPresence(canvasId, sessionId, userId, userName, userColor, true)
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
      
      // Remove presence document
      removePresence(canvasId, sessionId).catch(console.error);
      
      // Unsubscribe
      unsubscribe();
    };
  }, [sessionId, userId, userName, canvasId]);

  return {
    onlineUsers,
    onlineCount: onlineUsers.length,
  };
}



