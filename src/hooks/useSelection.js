import { useState, useCallback } from 'react';
import { getShapeBounds } from '../utils/canvasUtils';

/**
 * useSelection — Multi-selection state and selection rectangle logic.
 */
export function useSelection() {
  const [selectedShapeIds, setSelectedShapeIds] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectStart, setSelectStart] = useState({ x: 0, y: 0 });
  const [selectCurrent, setSelectCurrent] = useState({ x: 0, y: 0 });

  /**
   * Resolve the selection rectangle on mouseUp.
   * Returns the newly-selected shape IDs (may be empty on click-deselect).
   */
  const resolveSelection = useCallback(
    (shapes, deselectShape) => {
      const minX = Math.min(selectStart.x, selectCurrent.x);
      const maxX = Math.max(selectStart.x, selectCurrent.x);
      const minY = Math.min(selectStart.y, selectCurrent.y);
      const maxY = Math.max(selectStart.y, selectCurrent.y);
      const selectionWidth = maxX - minX;
      const selectionHeight = maxY - minY;

      const MIN_SELECTION_SIZE = 5;
      if (selectionWidth < MIN_SELECTION_SIZE && selectionHeight < MIN_SELECTION_SIZE) {
        deselectShape();
        setSelectedShapeIds([]);
        return [];
      }

      const selected = shapes.filter((shape) => {
        const b = getShapeBounds(shape);
        return !(b.maxX < minX || b.minX > maxX || b.maxY < minY || b.minY > maxY);
      });

      const ids = selected.map((s) => s.id);
      setSelectedShapeIds(ids);
      return ids;
    },
    [selectStart, selectCurrent]
  );

  return {
    selectedShapeIds,
    setSelectedShapeIds,
    isSelecting,
    setIsSelecting,
    selectStart,
    setSelectStart,
    selectCurrent,
    setSelectCurrent,
    resolveSelection,
  };
}
