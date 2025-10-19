import { useState, useEffect, useCallback, useRef } from 'react';
import { subscribeToCursors, removeCursor } from '../services/canvasService';
import { DEFAULT_CANVAS_ID } from '../utils/constants';

/**
 * Custom hook for managing cursor state with Firestore sync
 * Handles real-time cursor positions for all users/sessions
 */
export function useCursors(currentSessionId, canvasId = DEFAULT_CANVAS_ID) {
  const [cursors, setCursors] = useState([]);
  const [allCursorsData, setAllCursorsData] = useState([]);
  const filterIntervalRef = useRef(null);

  // Helper function to filter active cursors (not stale and actively dragging)
  const filterActiveCursors = (cursorsData, currentSession) => {
    const fortyFiveSecondsAgo = Date.now() - 45 * 1000;
    return cursorsData.filter(c => 
      c.sessionId !== currentSession && // Don't show our own cursor
      c.timestamp > fortyFiveSecondsAgo && // Only show recent cursors
      c.isActive === true // Only show cursors of users actively dragging
    );
  };

  // Subscribe to Firestore cursors collection
  useEffect(() => {
    if (!currentSessionId) return;
    
    // console.log('Setting up cursor subscription for canvas:', canvasId);
    
    const unsubscribe = subscribeToCursors(canvasId, (allCursors) => {
      setAllCursorsData(allCursors);
      const activeCursors = filterActiveCursors(allCursors, currentSessionId);
      // console.log('Active cursors from Firestore:', activeCursors.length);
      setCursors(activeCursors);
    });

    // Client-side polling to re-filter stale cursors every 5 seconds
    filterIntervalRef.current = setInterval(() => {
      setAllCursorsData(prevData => {
        const activeCursors = filterActiveCursors(prevData, currentSessionId);
        setCursors(activeCursors);
        return prevData;
      });
    }, 5000); // Re-filter every 5 seconds

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up cursor subscription');
      if (filterIntervalRef.current) {
        clearInterval(filterIntervalRef.current);
      }
      unsubscribe();
    };
  }, [currentSessionId, canvasId]);

  // Cleanup: remove cursor on unmount and page unload
  useEffect(() => {
    if (!currentSessionId) return;

    // Handle page unload/refresh - cleanup cursor immediately
    const handleBeforeUnload = () => {
      removeCursor(canvasId, currentSessionId).catch(() => {
        // Ignore errors during unload
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      console.log('Cleaning up cursor for session:', currentSessionId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Remove cursor on component unmount
      removeCursor(canvasId, currentSessionId).catch(() => {
        // Ignore errors during cleanup
      });
    };
  }, [currentSessionId, canvasId]);

  /**
   * Check if cursors overlap (within threshold)
   */
  const getCursorsAtPosition = useCallback((x, y, threshold = 30) => {
    return cursors.filter(cursor => {
      const dx = cursor.x - x;
      const dy = cursor.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < threshold;
    });
  }, [cursors]);

  /**
   * Get which cursor should show label at a position (based on arrivalTime)
   */
  const shouldShowLabel = useCallback((cursor) => {
    const overlapping = getCursorsAtPosition(cursor.x, cursor.y);
    
    if (overlapping.length <= 1) {
      return false; // No overlap, don't force show (hover will handle)
    }
    
    // Multiple cursors overlap - show label for earliest arrival
    const earliest = overlapping.reduce((prev, curr) => 
      curr.arrivalTime < prev.arrivalTime ? curr : prev
    );
    
    return earliest.sessionId === cursor.sessionId;
  }, [getCursorsAtPosition]);

  return {
    cursors,
    shouldShowLabel,
  };
}

