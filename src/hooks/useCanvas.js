import { useState, useEffect, useCallback, useRef } from 'react';
import { subscribeToObjects, lockObject, unlockObject } from '../services/canvasService';
import { DEFAULT_CANVAS_ID } from '../utils/constants';

/**
 * Custom hook for managing canvas state with Firestore sync
 * Handles rectangles, selection, locking, and real-time updates
 */
export function useCanvas(userId, canvasId = DEFAULT_CANVAS_ID) {
  const [rectangles, setRectangles] = useState([]);
  const [selectedRectId, setSelectedRectId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Use refs to track dragging state (avoid stale closures in subscription)
  const isDraggingRef = useRef(false);
  const selectedRectIdRef = useRef(null);
  
  // Keep refs in sync with state
  useEffect(() => {
    selectedRectIdRef.current = selectedRectId;
  }, [selectedRectId]);

  // Subscribe to Firestore objects collection
  useEffect(() => {
    console.log('Setting up Firestore subscription for canvas:', canvasId);
    
    const unsubscribe = subscribeToObjects(canvasId, (objects) => {
      console.log('Received objects from Firestore:', objects.length);
      
      // Update rectangles, but preserve local optimistic updates while dragging
      setRectangles(prevRectangles => {
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
    });

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up Firestore subscription');
      unsubscribe();
    };
  }, [canvasId]);

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
      await lockObject(canvasId, rectId, userId);
      setSelectedRectId(rectId);
      console.log('Rectangle selected and locked:', rectId);
    } catch (error) {
      console.error('Failed to lock rectangle:', error);
    }
  }, [rectangles, userId, canvasId]);

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

  return {
    rectangles,
    setRectangles,
    selectedRectId,
    selectedRectangle,
    selectRectangle,
    deselectRectangle,
    loading,
    setIsDraggingLocal,
  };
}

