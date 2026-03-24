import { useState, useCallback } from 'react';
import { SHAPE_TYPES, TOOL_TYPES } from '../utils/constants';
import { getRandomColor } from '../utils/colorUtils';
import { createShape } from '../services/canvasService';
import { reportError } from '../utils/errorHandler';

/**
 * useCustomPolygon — Manages vertex-by-vertex custom polygon drawing.
 */
export function useCustomPolygon({
  user,
  canvasId,
  recordAction,
  notifyFirestoreActivity,
  setSelectedTool,
}) {
  const [isDrawingCustomPolygon, setIsDrawingCustomPolygon] = useState(false);
  const [customPolygonVertices, setCustomPolygonVertices] = useState([]);

  const handleFinishCustomPolygon = useCallback(async () => {
    if (customPolygonVertices.length < 3 || !user) {
      console.warn(
        'Cannot create custom polygon: need at least 3 vertices and user must be logged in'
      );
      return;
    }

    try {
      const color = getRandomColor();
      const shapeData = {
        type: SHAPE_TYPES.CUSTOM_POLYGON,
        vertices: customPolygonVertices,
        color,
        createdBy: user.uid,
        rotation: 0,
        zIndex: Date.now(),
      };

      const shapeId = await createShape(canvasId, shapeData);
      recordAction({ type: 'create', shapeId, shapeData });
      notifyFirestoreActivity();

      setIsDrawingCustomPolygon(false);
      setCustomPolygonVertices([]);
      setSelectedTool(TOOL_TYPES.SELECT);
    } catch (error) {
      reportError(error, { component: 'useCustomPolygon', action: 'handleFinishCustomPolygon' });
    }
  }, [
    customPolygonVertices,
    user,
    canvasId,
    recordAction,
    notifyFirestoreActivity,
    setSelectedTool,
  ]);

  return {
    isDrawingCustomPolygon,
    setIsDrawingCustomPolygon,
    customPolygonVertices,
    setCustomPolygonVertices,
    handleFinishCustomPolygon,
  };
}
