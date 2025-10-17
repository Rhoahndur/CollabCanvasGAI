import { useState, useEffect, useCallback, useRef } from 'react';
import { subscribeToObjects, lockObject, unlockObject } from '../services/canvasService';
import { DEFAULT_CANVAS_ID } from '../utils/constants';

/**
 * Custom hook for managing canvas state with Firestore sync
 * Handles shapes (rectangles, circles, polygons), selection, locking, and real-time updates
 */
export function useCanvas(userId, userName = '', canvasId = DEFAULT_CANVAS_ID) {
  const [rectangles, setRectangles] = useState([]); // Note: named 'rectangles' for backward compatibility, but holds all shape types
  const [selectedRectId, setSelectedRectId] = useState(null); // Note: named 'selectedRectId' for backward compatibility, but works for all shapes
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'error'
  
  // Use refs to track dragging state (avoid stale closures in subscription)
  const isDraggingRef = useRef(false);
  const selectedRectIdRef = useRef(null);
  const lastUpdateTimeRef = useRef(Date.now());
  const connectionCheckIntervalRef = useRef(null);
  const isBatchDeletingRef = useRef(false); // Track when we're doing batch deletions
  
  // Keep refs in sync with state
  useEffect(() => {
    selectedRectIdRef.current = selectedRectId;
  }, [selectedRectId]);

  // Subscribe to Firestore objects collection
  useEffect(() => {
    console.log('Setting up Firestore subscription for canvas:', canvasId);
    setConnectionStatus('connecting');
    setError(null);
    
    let unsubscribe;
    
    try {
      unsubscribe = subscribeToObjects(canvasId, (objects) => {
        console.log('Received objects from Firestore:', objects.length);
        
        // Update last update time for connection monitoring
        lastUpdateTimeRef.current = Date.now();
        
        // Update connection status to connected
        setConnectionStatus('connected');
        setError(null);
        
        // Update rectangles, but preserve local optimistic updates while dragging
        setRectangles(prevRectangles => {
          // If batch deleting, ALWAYS use Firestore data (don't merge)
          if (isBatchDeletingRef.current) {
            console.log('Batch delete mode: using fresh Firestore data', objects.length);
            return objects;
          }
          
          // If not dragging, just use Firestore data
          if (!isDraggingRef.current) {
            return objects;
          }
          
          // If dragging, merge: keep local position for selected, use Firestore for others
          const currentSelectedId = selectedRectIdRef.current;
          const selectedRect = prevRectangles.find(r => r.id === currentSelectedId);
          
          if (!selectedRect || !currentSelectedId) {
            return objects;
          }
          
          // Update all rectangles from Firestore except the one being dragged
          return objects.map(rect => 
            rect.id === currentSelectedId && selectedRect
              ? { ...rect, x: selectedRect.x, y: selectedRect.y } // Keep local position
              : rect // Use Firestore data
          );
        });
        
        setLoading(false);
      }, (err) => {
        // Error callback
        console.error('Firestore subscription error:', err);
        setError(err.message || 'Failed to sync with server');
        setConnectionStatus('error');
        setLoading(false);
      });
    } catch (err) {
      console.error('Failed to set up Firestore subscription:', err);
      setError(err.message || 'Failed to connect to server');
      setConnectionStatus('error');
      setLoading(false);
    }

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up Firestore subscription');
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [canvasId]);
  
  // Monitor connection health and detect reconnection
  useEffect(() => {
    // Check for stale connections every 5 seconds
    connectionCheckIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
      
      // If we haven't received an update in over 15 seconds and we're supposedly connected
      if (timeSinceLastUpdate > 15000 && connectionStatus === 'connected') {
        console.warn('Connection may be stale, no updates in 15 seconds');
        setConnectionStatus('reconnecting');
      }
      // If we were reconnecting but have received recent updates, mark as connected
      else if (timeSinceLastUpdate < 5000 && connectionStatus === 'reconnecting') {
        console.log('Connection restored!');
        setConnectionStatus('connected');
      }
    }, 5000);
    
    return () => {
      if (connectionCheckIntervalRef.current) {
        clearInterval(connectionCheckIntervalRef.current);
      }
    };
  }, [connectionStatus]);

  // Select a rectangle and lock it
  const selectRectangle = useCallback(async (rectId) => {
    if (!userId) return;
    
    const rect = rectangles.find(r => r.id === rectId);
    
    // Don't select if locked by another user
    if (rect && rect.lockedBy && rect.lockedBy !== userId) {
      console.log('Cannot select - locked by another user');
      return;
    }
    
    try {
      // Lock the object
      await lockObject(canvasId, rectId, userId, userName);
      setSelectedRectId(rectId);
      console.log('Rectangle selected and locked:', rectId);
    } catch (error) {
      console.error('Failed to lock rectangle:', error);
    }
  }, [rectangles, userId, userName, canvasId]);

  // Deselect current rectangle and unlock it
  const deselectRectangle = useCallback(async () => {
    if (!selectedRectId) return;
    
    try {
      // Unlock the object
      await unlockObject(canvasId, selectedRectId);
      setSelectedRectId(null);
      console.log('Rectangle deselected and unlocked');
    } catch (error) {
      console.error('Failed to unlock rectangle:', error);
    }
  }, [selectedRectId, canvasId]);

  // Cleanup: unlock on unmount if selected
  useEffect(() => {
    return () => {
      if (selectedRectId) {
        unlockObject(canvasId, selectedRectId).catch(console.error);
      }
    };
  }, [selectedRectId, canvasId]);

  // Get selected rectangle object
  const selectedRectangle = rectangles.find(r => r.id === selectedRectId) || null;

  // Function to set dragging state
  const setIsDraggingLocal = useCallback((dragging) => {
    isDraggingRef.current = dragging;
  }, []);

  // Function to notify of successful Firestore operations (for connection detection)
  const notifyFirestoreActivity = useCallback(() => {
    lastUpdateTimeRef.current = Date.now();
    // If we were in a bad state but just had successful activity, mark as connected
    if (connectionStatus === 'reconnecting' || connectionStatus === 'error') {
      setConnectionStatus('connected');
      setError(null);
    }
  }, [connectionStatus]);
  
  // Function to set batch deleting mode (prevents merge logic during mass deletions)
  const setBatchDeleting = useCallback((isDeleting) => {
    console.log('Batch delete mode:', isDeleting);
    isBatchDeletingRef.current = isDeleting;
  }, []);

  return {
    rectangles,
    setRectangles,
    selectedRectId,
    selectedRectangle,
    selectRectangle,
    deselectRectangle,
    loading,
    error,
    connectionStatus,
    setIsDraggingLocal,
    notifyFirestoreActivity,
    setBatchDeleting,
  };
}

