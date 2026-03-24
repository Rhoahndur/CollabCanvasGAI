import { useState, useMemo } from 'react';

/**
 * useShapeDrawing — Drawing state for creating new shapes by click-and-drag.
 */
export function useShapeDrawing() {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 });

  // Preview rectangle during drawing
  const previewRect = useMemo(() => {
    if (!isDrawing) return null;
    return {
      x: Math.min(drawStart.x, drawCurrent.x),
      y: Math.min(drawStart.y, drawCurrent.y),
      width: Math.abs(drawCurrent.x - drawStart.x),
      height: Math.abs(drawCurrent.y - drawStart.y),
    };
  }, [isDrawing, drawStart.x, drawStart.y, drawCurrent.x, drawCurrent.y]);

  return {
    isDrawing,
    setIsDrawing,
    drawStart,
    setDrawStart,
    drawCurrent,
    setDrawCurrent,
    previewRect,
  };
}
