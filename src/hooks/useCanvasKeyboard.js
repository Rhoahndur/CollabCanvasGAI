import { useEffect } from 'react';
import { TOOL_TYPES } from '../utils/constants';
import { createShape, deleteShape } from '../services/canvasService';
import { reportError } from '../utils/errorHandler';

/**
 * useCanvasKeyboard — Attaches the global keydown listener for all canvas keyboard shortcuts.
 */
export function useCanvasKeyboard({
  user,
  canvasId,
  shapes,
  selectedShapeId,
  selectedShapeIds,
  setSelectedShapeIds,
  deselectShape,
  selectShape,
  // Drawing flags
  isDrawing,
  isDragging,
  isResizing,
  isRotating,
  isSelecting,
  // Custom polygon
  isDrawingCustomPolygon,
  customPolygonVertices,
  setIsDrawingCustomPolygon,
  setCustomPolygonVertices,
  setSelectedTool,
  handleFinishCustomPolygon,
  // Clipboard
  clipboard,
  setClipboard,
  // Zoom
  handleZoomIn,
  handleZoomOut,
  handleZoomReset,
  // Z-order
  handleSendToFront,
  handleSendToBack,
  // Undo/Redo
  popUndo,
  popRedo,
  recordAction,
  // Misc
  notifyFirestoreActivity,
  trackActivity,
  userRole,
}) {
  useEffect(() => {
    const handleKeyDown = async (e) => {
      trackActivity();

      // Custom polygon: Enter/Escape
      if (isDrawingCustomPolygon) {
        if (e.key === 'Enter' && customPolygonVertices.length >= 3) {
          e.preventDefault();
          handleFinishCustomPolygon();
          return;
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setIsDrawingCustomPolygon(false);
          setCustomPolygonVertices([]);
          setSelectedTool(TOOL_TYPES.SELECT);
          return;
        }
      }

      const hasModifier = e.ctrlKey || e.metaKey;
      const hasSelection = selectedShapeId || selectedShapeIds.length > 0;
      const notInteracting =
        !isDrawing && !isDragging && !isResizing && !isRotating && !isSelecting;

      // Zoom shortcuts (Ctrl/Cmd + +/- and Ctrl/Cmd + 0)
      if (hasModifier && !e.shiftKey && !e.altKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          handleZoomIn();
          return;
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          handleZoomOut();
          return;
        } else if (e.key === '0') {
          e.preventDefault();
          handleZoomReset();
          return;
        }
      }

      // Copy (Ctrl/Cmd + C)
      if (hasModifier && e.key.toLowerCase() === 'c' && hasSelection && notInteracting) {
        e.preventDefault();
        const shapesToCopy = selectedShapeIds.length > 0 ? selectedShapeIds : [selectedShapeId];
        const copiedShapes = shapes
          .filter((s) => shapesToCopy.includes(s.id))
          .map((shape) => ({
            ...shape,
            id: undefined,
            timestamp: undefined,
            lockedBy: null,
            lockedByUserName: null,
          }));
        setClipboard(copiedShapes);
        return;
      }

      // Paste (Ctrl/Cmd + V)
      if (hasModifier && e.key.toLowerCase() === 'v' && clipboard.length > 0 && notInteracting) {
        e.preventDefault();
        if (userRole === 'viewer') return;

        try {
          const newShapeIds = [];
          const pasteOffset = 20;
          if (selectedShapeId) await deselectShape();
          setSelectedShapeIds([]);

          for (const shapeData of clipboard) {
            const pastedShape = {
              ...shapeData,
              x: shapeData.x + pasteOffset,
              y: shapeData.y + pasteOffset,
              createdBy: user.uid,
            };
            const newId = await createShape(canvasId, pastedShape);
            newShapeIds.push(newId);
          }

          if (newShapeIds.length === 1) {
            setTimeout(() => selectShape(newShapeIds[0]), 100);
          } else {
            setTimeout(() => setSelectedShapeIds(newShapeIds), 100);
          }

          setClipboard(
            clipboard.map((shape) => ({
              ...shape,
              x: shape.x + pasteOffset,
              y: shape.y + pasteOffset,
            }))
          );
          notifyFirestoreActivity();
        } catch (error) {
          reportError(error, { component: 'useCanvasKeyboard', action: 'paste' });
        }
        return;
      }

      // Duplicate (Ctrl/Cmd + D)
      if (hasModifier && e.key.toLowerCase() === 'd' && hasSelection && notInteracting) {
        e.preventDefault();
        if (userRole === 'viewer') return;

        const shapesToDuplicate =
          selectedShapeIds.length > 0 ? selectedShapeIds : [selectedShapeId];
        try {
          const newShapeIds = [];
          const duplicateOffset = 20;
          if (selectedShapeId) await deselectShape();
          setSelectedShapeIds([]);

          for (const shapeId of shapesToDuplicate) {
            const shape = shapes.find((s) => s.id === shapeId);
            if (!shape) continue;
            const duplicatedShape = {
              ...shape,
              x: shape.x + duplicateOffset,
              y: shape.y + duplicateOffset,
              createdBy: user.uid,
              lockedBy: null,
              lockedByUserName: null,
            };
            delete duplicatedShape.id;
            delete duplicatedShape.timestamp;
            const newId = await createShape(canvasId, duplicatedShape);
            newShapeIds.push(newId);
          }

          if (newShapeIds.length === 1) {
            setTimeout(() => selectShape(newShapeIds[0]), 100);
          } else {
            setTimeout(() => setSelectedShapeIds(newShapeIds), 100);
          }
          notifyFirestoreActivity();
        } catch (error) {
          reportError(error, { component: 'useCanvasKeyboard', action: 'duplicate' });
        }
        return;
      }

      // Delete / Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && hasSelection && notInteracting) {
        e.preventDefault();
        if (userRole === 'viewer') return;

        const shapesToDelete = selectedShapeIds.length > 0 ? selectedShapeIds : [selectedShapeId];
        const deletableShapes = shapesToDelete.filter((id) => {
          const shape = shapes.find((s) => s.id === id);
          return shape && (!shape.lockedBy || shape.lockedBy === user?.uid);
        });
        if (deletableShapes.length === 0) return;

        try {
          if (selectedShapeId) await deselectShape();
          setSelectedShapeIds([]);

          const deletePromises = deletableShapes.map(async (id) => {
            const shapeToDelete = shapes.find((s) => s.id === id);
            await deleteShape(canvasId, id);
            if (shapeToDelete) {
              recordAction({ type: 'delete', shapeId: id, shapeData: shapeToDelete });
            }
          });
          await Promise.all(deletePromises);
          notifyFirestoreActivity();
        } catch (error) {
          reportError(error, { component: 'useCanvasKeyboard', action: 'delete' });
        }
        return;
      }

      // Bring to front (Ctrl/Cmd + ])
      if (hasModifier && e.key === ']' && hasSelection && notInteracting) {
        e.preventDefault();
        handleSendToFront();
        return;
      }

      // Send to back (Ctrl/Cmd + [)
      if (hasModifier && e.key === '[' && hasSelection && notInteracting) {
        e.preventDefault();
        handleSendToBack();
        return;
      }

      // Undo (Ctrl/Cmd + Z)
      if (hasModifier && e.key === 'z' && !e.shiftKey && notInteracting) {
        e.preventDefault();
        const action = popUndo();
        if (!action) return;

        try {
          if (action.type === 'create') {
            await deleteShape(canvasId, action.shapeId);
          } else if (action.type === 'delete') {
            await createShape(canvasId, action.shapeData);
          }
          notifyFirestoreActivity();
        } catch (error) {
          reportError(error, { component: 'useCanvasKeyboard', action: 'undo' });
        }
        return;
      }

      // Redo (Ctrl/Cmd + R or Ctrl/Cmd + Shift + Z)
      if (
        (hasModifier && e.key === 'r') ||
        (hasModifier && e.shiftKey && e.key === 'z' && notInteracting)
      ) {
        e.preventDefault();
        const action = popRedo();
        if (!action) return;

        try {
          if (action.type === 'create') {
            await createShape(canvasId, action.shapeData);
          } else if (action.type === 'delete') {
            await deleteShape(canvasId, action.shapeId);
          }
          notifyFirestoreActivity();
        } catch (error) {
          reportError(error, { component: 'useCanvasKeyboard', action: 'redo' });
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedShapeId,
    selectedShapeIds,
    shapes,
    user,
    canvasId,
    isDrawing,
    isDragging,
    isResizing,
    isRotating,
    isSelecting,
    isDrawingCustomPolygon,
    customPolygonVertices,
    clipboard,
    deselectShape,
    selectShape,
    notifyFirestoreActivity,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleFinishCustomPolygon,
    handleSendToFront,
    handleSendToBack,
    trackActivity,
    userRole,
    popUndo,
    popRedo,
    recordAction,
    setClipboard,
    setSelectedShapeIds,
    setIsDrawingCustomPolygon,
    setCustomPolygonVertices,
    setSelectedTool,
  ]);
}
