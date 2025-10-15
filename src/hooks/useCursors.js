import { useState, useEffect, useCallback } from 'react';
import { subscribeToCursors, removeCursor } from '../services/canvasService';
import { DEFAULT_CANVAS_ID } from '../utils/constants';

/**
 * Custom hook for managing cursor state with Firestore sync
 * Handles real-time cursor positions for all users/sessions
 */
export function useCursors(currentSessionId, canvasId = DEFAULT_CANVAS_ID) {
  const [cursors, setCursors] = useState([]);

  // Subscribe to Firestore cursors collection
  useEffect(() => {
    if (!currentSessionId) return;
    
    console.log('Setting up cursor subscription for canvas:', canvasId);
    
    const unsubscribe = subscribeToCursors(canvasId, (allCursors) => {
      // Filter out current session's cursor (we don't render our own)
      const otherCursors = allCursors.filter(c => c.sessionId !== currentSessionId);
      console.log('Received cursors from Firestore:', otherCursors.length);
      setCursors(otherCursors);
    });

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up cursor subscription');
      unsubscribe();
    };
  }, [currentSessionId, canvasId]);

  // Cleanup: remove cursor on unmount
  useEffect(() => {
    return () => {
      if (currentSessionId) {
        // Silently remove cursor on cleanup
        removeCursor(canvasId, currentSessionId).catch(() => {
          // Ignore errors during cleanup
        });
      }
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

