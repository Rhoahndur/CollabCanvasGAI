import { useState, useRef, useCallback } from 'react';
import { SHAPE_TYPES } from '../utils/constants';
import { screenToCanvas } from '../utils/canvasUtils';

/**
 * useShapeTransform — Drag, resize, and rotate state + start handlers.
 */
export function useShapeTransform({
  svgRef,
  shapes,
  user,
  selectedShapeId,
  selectedShapeIds,
  selectShape,
  viewport,
  setIsDraggingLocal,
  userRole,
  trackActivity,
}) {
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [draggedShapeIds, setDraggedShapeIds] = useState([]);
  const [dragInitialPositions, setDragInitialPositions] = useState({});

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [resizeInitial, setResizeInitial] = useState(null);

  // Rotate state
  const [isRotating, setIsRotating] = useState(false);
  const [rotateStart, setRotateStart] = useState({ x: 0, y: 0 });
  const [rotateInitial, setRotateInitial] = useState(0);

  // Track if user actually moved/resized/rotated vs just clicked
  const didInteractRef = useRef(false);

  const handleShapeMouseDown = useCallback(
    (shapeId, e) => {
      e.stopPropagation();
      if (!svgRef.current) return;
      trackActivity();

      const shape = shapes.find((s) => s.id === shapeId);
      if (!shape) return;

      if (userRole === 'viewer') return;
      if (shape.lockedBy && shape.lockedBy !== user?.uid) return;

      let shapesToDrag = [];
      if (selectedShapeIds.length > 0 && selectedShapeIds.includes(shapeId)) {
        shapesToDrag = selectedShapeIds;
      } else {
        if (selectedShapeId !== shapeId) selectShape(shapeId);
        shapesToDrag = [shapeId];
      }

      const svgRect = svgRef.current.getBoundingClientRect();
      const canvasPos = screenToCanvas(e.clientX, e.clientY, viewport, svgRect);

      const initialPositions = {};
      shapesToDrag.forEach((id) => {
        const s = shapes.find((sh) => sh.id === id);
        if (s) {
          if (s.type === SHAPE_TYPES.CUSTOM_POLYGON) {
            initialPositions[id] = { vertices: s.vertices.map((v) => ({ x: v.x, y: v.y })) };
          } else {
            initialPositions[id] = { x: s.x, y: s.y };
          }
        }
      });

      setDragStart(canvasPos);
      setDragOffset({ x: shape.x, y: shape.y });
      setDraggedShapeIds(shapesToDrag);
      setDragInitialPositions(initialPositions);
      didInteractRef.current = false;
      setIsDragging(true);
      setIsDraggingLocal(true);
      e.preventDefault();
    },
    [
      svgRef,
      shapes,
      user,
      selectedShapeId,
      selectedShapeIds,
      selectShape,
      viewport,
      setIsDraggingLocal,
      userRole,
      trackActivity,
    ]
  );

  const handleResizeStart = useCallback(
    (handle, e) => {
      if (!svgRef.current || !selectedShapeId) return;
      if (userRole === 'viewer') return;

      const shape = shapes.find((s) => s.id === selectedShapeId);
      if (!shape) return;

      const svgRect = svgRef.current.getBoundingClientRect();
      const canvasPos = screenToCanvas(e.clientX, e.clientY, viewport, svgRect);

      setResizeHandle(handle);
      setResizeStart(canvasPos);
      setResizeInitial({ ...shape });
      setIsResizing(true);
      setIsDraggingLocal(true);
      e.preventDefault();
    },
    [svgRef, selectedShapeId, shapes, viewport, setIsDraggingLocal, userRole]
  );

  const handleRotateStart = useCallback(
    (e) => {
      if (!svgRef.current || !selectedShapeId) return;
      if (userRole === 'viewer') return;

      const shape = shapes.find((s) => s.id === selectedShapeId);
      if (!shape) return;

      const svgRect = svgRef.current.getBoundingClientRect();
      const canvasPos = screenToCanvas(e.clientX, e.clientY, viewport, svgRect);

      setRotateStart(canvasPos);
      setRotateInitial(shape.rotation || 0);
      setIsRotating(true);
      setIsDraggingLocal(true);
      e.preventDefault();
    },
    [svgRef, selectedShapeId, shapes, viewport, setIsDraggingLocal, userRole]
  );

  return {
    // Drag
    isDragging,
    setIsDragging,
    dragStart,
    setDragStart,
    dragOffset,
    setDragOffset,
    draggedShapeIds,
    setDraggedShapeIds,
    dragInitialPositions,
    setDragInitialPositions,
    // Resize
    isResizing,
    setIsResizing,
    resizeHandle,
    setResizeHandle,
    resizeStart,
    setResizeStart,
    resizeInitial,
    setResizeInitial,
    // Rotate
    isRotating,
    setIsRotating,
    rotateStart,
    setRotateStart,
    rotateInitial,
    setRotateInitial,
    // Ref
    didInteractRef,
    // Handlers
    handleShapeMouseDown,
    handleResizeStart,
    handleRotateStart,
  };
}
