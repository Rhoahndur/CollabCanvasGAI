import { useState, useEffect, useCallback } from 'react';
import { subscribeToObjects } from '../services/canvasService';
import { DEFAULT_CANVAS_ID } from '../utils/constants';

/**
 * Custom hook for managing canvas state with Firestore sync
 * Handles rectangles, selection, and real-time updates
 */
export function useCanvas(canvasId = DEFAULT_CANVAS_ID) {
  const [rectangles, setRectangles] = useState([]);
  const [selectedRectId, setSelectedRectId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Subscribe to Firestore objects collection
  useEffect(() => {
    console.log('Setting up Firestore subscription for canvas:', canvasId);
    
    const unsubscribe = subscribeToObjects(canvasId, (objects) => {
      console.log('Received objects from Firestore:', objects.length);
      setRectangles(objects);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up Firestore subscription');
      unsubscribe();
    };
  }, [canvasId]);

  // Select a rectangle
  const selectRectangle = useCallback((rectId) => {
    setSelectedRectId(rectId);
  }, []);

  // Deselect current rectangle
  const deselectRectangle = useCallback(() => {
    setSelectedRectId(null);
  }, []);

  // Get selected rectangle object
  const selectedRectangle = rectangles.find(r => r.id === selectedRectId) || null;

  return {
    rectangles,
    selectedRectId,
    selectedRectangle,
    selectRectangle,
    deselectRectangle,
    loading,
  };
}

