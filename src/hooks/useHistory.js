import { useState, useCallback, useRef } from 'react';

/**
 * useHistory hook - Simple undo/redo for collaborative canvas
 * 
 * Note: In a real-time collaborative environment, undo/redo is complex because:
 * - Multiple users can edit simultaneously
 * - Firebase is the source of truth
 * - We can't "undo" other users' actions
 * 
 * This implementation provides a simple action queue for the current user only.
 * It tracks action IDs and allows reverting recent actions by deleting/restoring them.
 */

const MAX_HISTORY_SIZE = 20; // Keep last 20 actions

export const useHistory = () => {
  const [undoStack, setUndoStack] = useState([]); // Actions that can be undone
  const [redoStack, setRedoStack] = useState([]); // Actions that can be redone
  const isProcessingRef = useRef(false); // Prevent recording during undo/redo
  
  /**
   * Record an action (e.g., shape creation, deletion)
   * @param {Object} action - { type: 'create'|'delete', shapeId, shapeData }
   */
  const recordAction = useCallback((action) => {
    if (isProcessingRef.current) return;
    
    setUndoStack(prev => {
      const newStack = [...prev, { ...action, timestamp: Date.now() }];
      // Limit stack size
      if (newStack.length > MAX_HISTORY_SIZE) {
        newStack.shift();
      }
      return newStack;
    });
    
    // Clear redo stack when new action is performed
    setRedoStack([]);
  }, []);
  
  /**
   * Get the last action from undo stack
   */
  const popUndo = useCallback(() => {
    if (undoStack.length === 0) return null;
    
    isProcessingRef.current = true;
    const action = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, action]);
    
    // Reset flag
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 100);
    
    return action;
  }, [undoStack]);
  
  /**
   * Get the last action from redo stack
   */
  const popRedo = useCallback(() => {
    if (redoStack.length === 0) return null;
    
    isProcessingRef.current = true;
    const action = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, action]);
    
    // Reset flag
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 100);
    
    return action;
  }, [redoStack]);
  
  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);
  
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  
  return {
    recordAction,
    popUndo,
    popRedo,
    clearHistory,
    canUndo,
    canRedo,
  };
};

export default useHistory;

