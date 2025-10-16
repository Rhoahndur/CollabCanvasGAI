import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_SENSITIVITY,
  DEFAULT_ZOOM,
  PAN_PADDING,
  GRID_SIZE,
  GRID_COLOR,
  BOUNDARY_COLOR,
  BOUNDARY_WIDTH,
  SHOW_FPS_COUNTER,
  FPS_UPDATE_INTERVAL,
  MIN_RECTANGLE_SIZE,
  MIN_CIRCLE_RADIUS,
  MIN_POLYGON_RADIUS,
  MIN_SHAPE_SIZE,
  CURSOR_UPDATE_THROTTLE,
  DRAG_UPDATE_THROTTLE,
  SHAPE_TYPES,
  TOOL_TYPES,
  DEFAULT_POLYGON_SIDES,
} from '../utils/constants';
import {
  screenToCanvas,
  clampPanOffset,
  clamp,
  calculateFPS,
  isPointInRect,
} from '../utils/canvasUtils';
import { testFirestoreConnection, createShape, updateShape, deleteShape, updateCursor, removeCursor } from '../services/canvasService';
import { useCanvas } from '../hooks/useCanvas';
import { useCursors } from '../hooks/useCursors';
import { useAuth } from '../hooks/useAuth';
import { getRandomColor } from '../utils/colorUtils';
import { setup500Test } from '../utils/testData';
import Rectangle from './Rectangle';
import Circle from './Circle';
import Polygon from './Polygon';
import Cursor from './Cursor';
import ShapePalette from './ShapePalette';
import SelectionBox from './SelectionBox';
import './Canvas.css';

/**
 * Canvas component - SVG-based collaborative canvas with pan and zoom
 */
function Canvas({ sessionId, onlineUsersCount = 0 }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  
  // Auth and canvas state
  const { user } = useAuth();
  const { 
    rectangles, 
    setRectangles, 
    selectedRectId, 
    selectRectangle, 
    deselectRectangle, 
    loading: canvasLoading,
    error: canvasError,
    connectionStatus,
    setIsDraggingLocal,
    notifyFirestoreActivity 
  } = useCanvas(user?.uid, user?.displayName);
  const { cursors } = useCursors(sessionId);
  
  // Viewport state (pan and zoom)
  const [viewport, setViewport] = useState({
    offsetX: 0,
    offsetY: 0,
    zoom: DEFAULT_ZOOM,
  });
  
  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  
  // Rectangle creation state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 });
  
  // Rectangle dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [draggedShapeIds, setDraggedShapeIds] = useState([]); // For multi-shape drag
  const [dragInitialPositions, setDragInitialPositions] = useState({}); // Store initial positions of all dragged shapes
  
  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null); // 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [resizeInitial, setResizeInitial] = useState(null); // Initial shape dimensions
  
  // Rotation state
  const [isRotating, setIsRotating] = useState(false);
  const [rotateStart, setRotateStart] = useState({ x: 0, y: 0 });
  const [rotateInitial, setRotateInitial] = useState(0); // Initial rotation angle
  
  // Selected drawing tool
  const [selectedTool, setSelectedTool] = useState(TOOL_TYPES.SELECT);
  
  // Multiple selected shape IDs (for multi-select with SELECT tool)
  const [selectedShapeIds, setSelectedShapeIds] = useState([]);
  
  // Selection rectangle (for multi-select)
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectStart, setSelectStart] = useState({ x: 0, y: 0 });
  const [selectCurrent, setSelectCurrent] = useState({ x: 0, y: 0 });
  
  // FPS and performance monitoring
  const [fps, setFps] = useState(0);
  const [renderTime, setRenderTime] = useState(0);
  const frameTimesRef = useRef([]);
  const lastFpsUpdateRef = useRef(Date.now());
  const renderStartRef = useRef(Date.now());
  
  // Container dimensions
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  // Firestore connection status
  const [firestoreStatus, setFirestoreStatus] = useState('testing');
  
  // Cursor tracking
  const lastCursorUpdate = useRef(0);
  const cursorArrivalTime = useRef(Date.now());
  
  // Drag update tracking (for throttling real-time updates)
  const lastDragUpdate = useRef(0);
  
  // Track if user actually interacted (dragged/resized/rotated) vs just clicked
  const didInteractRef = useRef(false);
  
  // Test Firestore connection on mount
  useEffect(() => {
    const testConnection = async () => {
      const success = await testFirestoreConnection();
      setFirestoreStatus(success ? 'connected' : 'error');
    };
    testConnection();
  }, []);
  
  // Setup test utilities in dev mode
  useEffect(() => {
    if (SHOW_FPS_COUNTER && user?.uid) {
      setup500Test(user.uid);
      console.log('🧪 Performance test utilities loaded. Check window.testCanvas');
    }
  }, [user?.uid]);
  
  // Update container size on mount and resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  // FPS and render time monitoring
  useEffect(() => {
    if (!SHOW_FPS_COUNTER) return;
    
    let animationFrameId;
    
    const updateFps = (timestamp) => {
      // Track render time
      const renderEnd = performance.now();
      const currentRenderTime = renderEnd - renderStartRef.current;
      
      frameTimesRef.current.push(timestamp);
      
      // Keep only last second of frame times
      const oneSecondAgo = timestamp - 1000;
      frameTimesRef.current = frameTimesRef.current.filter(t => t > oneSecondAgo);
      
      // Update FPS and render time display periodically
      if (timestamp - lastFpsUpdateRef.current > FPS_UPDATE_INTERVAL) {
        setFps(calculateFPS(frameTimesRef.current));
        setRenderTime(Math.round(currentRenderTime * 100) / 100);
        lastFpsUpdateRef.current = timestamp;
      }
      
      renderStartRef.current = performance.now();
      animationFrameId = requestAnimationFrame(updateFps);
    };
    
    animationFrameId = requestAnimationFrame(updateFps);
    
    return () => cancelAnimationFrame(animationFrameId);
  }, []);
  
  // Handle click on background (canvas)
  const handleCanvasMouseDown = useCallback((e) => {
    // Only handle left mouse button
    if (e.button !== 0) return;
    
    if (!svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const canvasPos = screenToCanvas(e.clientX, e.clientY, viewport, rect);
    
    // Check if holding Shift/Cmd/Ctrl for pan
    const shouldPan = e.shiftKey || e.metaKey || e.ctrlKey;
    
    if (shouldPan) {
      // Start panning
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setPanOffset({ x: viewport.offsetX, y: viewport.offsetY });
    } else if (selectedTool === TOOL_TYPES.SELECT) {
      // Start selection rectangle (multi-select)
      setIsSelecting(true);
      setSelectStart(canvasPos);
      setSelectCurrent(canvasPos);
    } else {
      // Start drawing shape (deselect any selected)
      deselectRectangle();
      setSelectedShapeIds([]);
      setIsDrawing(true);
      setDrawStart(canvasPos);
      setDrawCurrent(canvasPos);
    }
    
    // Prevent text selection while dragging
    e.preventDefault();
  }, [viewport, selectedTool, deselectRectangle]);
  
  // Handle click on rectangle (selection happens on mouse down, this is just for compatibility)
  const handleRectangleClick = useCallback((rectId, e) => {
    e.stopPropagation();
    // Selection now handled in mouse down
  }, []);
  
  // Handle mouse down on rectangle (for dragging)
  const handleRectangleMouseDown = useCallback((rectId, e) => {
    e.stopPropagation();
    
    if (!svgRef.current) return;
    
    const rect = rectangles.find(r => r.id === rectId);
    if (!rect) return;
    
    // Can't drag if locked by another user
    if (rect.lockedBy && rect.lockedBy !== user?.uid) {
      return;
    }
    
    // Determine which shapes to drag
    let shapesToDrag = [];
    if (selectedShapeIds.length > 0 && selectedShapeIds.includes(rectId)) {
      // Multi-select drag: drag all selected shapes
      shapesToDrag = selectedShapeIds;
    } else {
      // Single shape drag
      if (selectedRectId !== rectId) {
        selectRectangle(rectId);
      }
      shapesToDrag = [rectId];
    }
    
    // Start dragging
    const svgRect = svgRef.current.getBoundingClientRect();
    const canvasPos = screenToCanvas(e.clientX, e.clientY, viewport, svgRect);
    
    // Store initial positions of all shapes being dragged
    const initialPositions = {};
    shapesToDrag.forEach(id => {
      const shape = rectangles.find(r => r.id === id);
      if (shape) {
        initialPositions[id] = { x: shape.x, y: shape.y };
      }
    });
    
    setDragStart(canvasPos);
    setDragOffset({ x: rect.x, y: rect.y }); // Offset for the clicked shape
    setDraggedShapeIds(shapesToDrag);
    setDragInitialPositions(initialPositions);
    
    // Reset interaction flag
    didInteractRef.current = false;
    
    // Set dragging flags AFTER setting positions to prevent race condition
    setIsDragging(true);
    setIsDraggingLocal(true); // Tell hook we're dragging
    
    e.preventDefault();
  }, [rectangles, user, selectedRectId, selectedShapeIds, selectRectangle, viewport, setIsDraggingLocal]);
  
  // Handle resize start
  const handleResizeStart = useCallback((handle, e) => {
    if (!svgRef.current || !selectedRectId) return;
    
    const shape = rectangles.find(r => r.id === selectedRectId);
    if (!shape) return;
    
    const svgRect = svgRef.current.getBoundingClientRect();
    const canvasPos = screenToCanvas(e.clientX, e.clientY, viewport, svgRect);
    
    setResizeHandle(handle);
    setResizeStart(canvasPos);
    setResizeInitial({ ...shape }); // Store initial shape state
    setIsResizing(true);
    setIsDraggingLocal(true); // Prevent Firestore updates during resize
    
    e.preventDefault();
  }, [selectedRectId, rectangles, viewport, setIsDraggingLocal]);
  
  // Handle rotation start
  const handleRotateStart = useCallback((e) => {
    if (!svgRef.current || !selectedRectId) return;
    
    const shape = rectangles.find(r => r.id === selectedRectId);
    if (!shape) return;
    
    const svgRect = svgRef.current.getBoundingClientRect();
    const canvasPos = screenToCanvas(e.clientX, e.clientY, viewport, svgRect);
    
    setRotateStart(canvasPos);
    setRotateInitial(shape.rotation || 0);
    setIsRotating(true);
    setIsDraggingLocal(true); // Prevent Firestore updates during rotation
    
    e.preventDefault();
  }, [selectedRectId, rectangles, viewport, setIsDraggingLocal]);
  
  // Handle mouse move for panning, drawing, dragging, and cursor tracking
  const handleMouseMove = useCallback((e) => {
    // Track cursor position for multiplayer (throttled)
    // Only show cursor to others when actively dragging
    if (svgRef.current && user && isDragging) {
      const now = Date.now();
      if (now - lastCursorUpdate.current > CURSOR_UPDATE_THROTTLE) {
        const rect = svgRef.current.getBoundingClientRect();
        const canvasPos = screenToCanvas(e.clientX, e.clientY, viewport, rect);
        
        // Update cursor position in Firestore (only when dragging)
        updateCursor(
          undefined,
          sessionId,
          user.uid,
          canvasPos.x,
          canvasPos.y,
          user.displayName,
          cursorArrivalTime.current,
          true // isActive - show cursor when dragging
        ).then(() => {
          // Notify of successful Firestore operation (for connection detection)
          notifyFirestoreActivity();
        }).catch(console.error);
        
        lastCursorUpdate.current = now;
      }
    }
    
    if (isPanning) {
      // Handle panning
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      
      // Calculate new offset (inverted because we're moving the viewport)
      const newOffsetX = panOffset.x - dx / viewport.zoom;
      const newOffsetY = panOffset.y - dy / viewport.zoom;
      
      // Clamp to canvas boundaries
      const clamped = clampPanOffset(
        newOffsetX,
        newOffsetY,
        viewport.zoom,
        containerSize.width,
        containerSize.height,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        PAN_PADDING
      );
      
      setViewport(prev => ({
        ...prev,
        offsetX: clamped.offsetX,
        offsetY: clamped.offsetY,
      }));
    } else if (isSelecting && svgRef.current) {
      // Handle drawing selection rectangle
      const rect = svgRef.current.getBoundingClientRect();
      const canvasPos = screenToCanvas(e.clientX, e.clientY, viewport, rect);
      setSelectCurrent(canvasPos);
    } else if (isDrawing && svgRef.current) {
      // Handle drawing shape
      const rect = svgRef.current.getBoundingClientRect();
      const canvasPos = screenToCanvas(e.clientX, e.clientY, viewport, rect);
      setDrawCurrent(canvasPos);
    } else if (isDragging && svgRef.current && (selectedRectId || draggedShapeIds.length > 0)) {
      // Handle dragging selected shapes (single or multiple)
      const rect = svgRef.current.getBoundingClientRect();
      const canvasPos = screenToCanvas(e.clientX, e.clientY, viewport, rect);
      
      const dx = canvasPos.x - dragStart.x;
      const dy = canvasPos.y - dragStart.y;
      
      // Mark that we actually moved the shape(s)
      didInteractRef.current = true;
      
      // Optimistic update (update local state immediately for smooth dragging)
      setRectangles(prev => prev.map(r => {
        if (draggedShapeIds.includes(r.id)) {
          // Move this shape by the same delta
          const initial = dragInitialPositions[r.id];
          if (initial) {
            return { ...r, x: initial.x + dx, y: initial.y + dy };
          }
        }
        return r;
      }));
      
      // Send throttled updates to Firestore during drag for real-time sync
      const now = Date.now();
      if (now - lastDragUpdate.current > DRAG_UPDATE_THROTTLE) {
        draggedShapeIds.forEach(id => {
          const shape = rectangles.find(r => r.id === id);
          const initial = dragInitialPositions[id];
          if (shape && initial) {
            updateShape(undefined, id, {
              x: initial.x + dx,
              y: initial.y + dy,
            }).catch(console.error);
          }
        });
        lastDragUpdate.current = now;
      }
    } else if (isResizing && svgRef.current && selectedRectId && resizeInitial) {
      // Handle resizing selected shape
      const rect = svgRef.current.getBoundingClientRect();
      const canvasPos = screenToCanvas(e.clientX, e.clientY, viewport, rect);
      
      const dx = canvasPos.x - resizeStart.x;
      const dy = canvasPos.y - resizeStart.y;
      
      // Calculate new dimensions based on handle and shape type
      let updates = {};
      
      if (resizeInitial.type === SHAPE_TYPES.RECTANGLE) {
        const { x, y, width, height } = resizeInitial;
        let newX = x, newY = y, newWidth = width, newHeight = height;
        
        // Handle corner and edge resizing
        if (resizeHandle.includes('w')) {
          newX = x + dx;
          newWidth = width - dx;
        } else if (resizeHandle.includes('e')) {
          newWidth = width + dx;
        }
        
        if (resizeHandle.includes('n')) {
          newY = y + dy;
          newHeight = height - dy;
        } else if (resizeHandle.includes('s')) {
          newHeight = height + dy;
        }
        
        // Enforce minimum size
        if (newWidth < MIN_RECTANGLE_SIZE) {
          newWidth = MIN_RECTANGLE_SIZE;
          newX = x + width - MIN_RECTANGLE_SIZE;
        }
        if (newHeight < MIN_RECTANGLE_SIZE) {
          newHeight = MIN_RECTANGLE_SIZE;
          newY = y + height - MIN_RECTANGLE_SIZE;
        }
        
        updates = { x: newX, y: newY, width: newWidth, height: newHeight };
      } else if (resizeInitial.type === SHAPE_TYPES.CIRCLE || resizeInitial.type === SHAPE_TYPES.POLYGON) {
        // For circles and polygons, resize by adjusting radius
        const distance = Math.sqrt(dx * dx + dy * dy);
        const direction = resizeHandle === 'e' || resizeHandle === 's' ? 1 : -1;
        let newRadius = resizeInitial.radius + (distance * direction);
        
        // Enforce minimum radius
        const minRadius = resizeInitial.type === SHAPE_TYPES.CIRCLE ? MIN_CIRCLE_RADIUS : MIN_POLYGON_RADIUS;
        if (newRadius < minRadius) {
          newRadius = minRadius;
        }
        
        updates = { radius: newRadius };
      }
      
      // Mark that we actually resized the shape
      didInteractRef.current = true;
      
      // Optimistic update
      setRectangles(prev => prev.map(r => 
        r.id === selectedRectId 
          ? { ...r, ...updates }
          : r
      ));
    } else if (isRotating && svgRef.current && selectedRectId && resizeInitial) {
      // Handle rotation
      const rect = svgRef.current.getBoundingClientRect();
      const canvasPos = screenToCanvas(e.clientX, e.clientY, viewport, rect);
      
      // Calculate center of shape
      let centerX, centerY;
      if (resizeInitial.type === SHAPE_TYPES.RECTANGLE) {
        centerX = resizeInitial.x + resizeInitial.width / 2;
        centerY = resizeInitial.y + resizeInitial.height / 2;
      } else {
        centerX = resizeInitial.x;
        centerY = resizeInitial.y;
      }
      
      // Calculate angle from center to current mouse position
      const angle = Math.atan2(canvasPos.y - centerY, canvasPos.x - centerX) * (180 / Math.PI);
      const startAngle = Math.atan2(rotateStart.y - centerY, rotateStart.x - centerX) * (180 / Math.PI);
      const rotation = rotateInitial + (angle - startAngle);
      
      // Mark that we actually rotated the shape
      didInteractRef.current = true;
      
      // Optimistic update
      setRectangles(prev => prev.map(r => 
        r.id === selectedRectId 
          ? { ...r, rotation }
          : r
      ));
    }
  }, [isPanning, isSelecting, isDrawing, isDragging, isResizing, isRotating, panStart, panOffset, viewport, containerSize, dragStart, dragOffset, draggedShapeIds, dragInitialPositions, resizeStart, resizeHandle, resizeInitial, rotateStart, rotateInitial, selectedRectId, rectangles, user, sessionId, notifyFirestoreActivity]);
  
  // Handle mouse up to stop panning, finish drawing, or finish dragging
  const handleMouseUp = useCallback(async () => {
    if (isPanning) {
      setIsPanning(false);
    } else if (isSelecting) {
      setIsSelecting(false);
      
      // Calculate selection rectangle bounds
      const minX = Math.min(selectStart.x, selectCurrent.x);
      const maxX = Math.max(selectStart.x, selectCurrent.x);
      const minY = Math.min(selectStart.y, selectCurrent.y);
      const maxY = Math.max(selectStart.y, selectCurrent.y);
      
      // Find all shapes that intersect with selection rectangle
      const selected = rectangles.filter(shape => {
        let shapeLeft, shapeRight, shapeTop, shapeBottom;
        
        if (shape.type === SHAPE_TYPES.RECTANGLE) {
          shapeLeft = shape.x;
          shapeRight = shape.x + shape.width;
          shapeTop = shape.y;
          shapeBottom = shape.y + shape.height;
        } else if (shape.type === SHAPE_TYPES.CIRCLE || shape.type === SHAPE_TYPES.POLYGON) {
          shapeLeft = shape.x - shape.radius;
          shapeRight = shape.x + shape.radius;
          shapeTop = shape.y - shape.radius;
          shapeBottom = shape.y + shape.radius;
        } else {
          // Legacy shapes without type - assume rectangle
          shapeLeft = shape.x;
          shapeRight = shape.x + (shape.width || 0);
          shapeTop = shape.y;
          shapeBottom = shape.y + (shape.height || 0);
        }
        
        // Check if selection rectangle intersects with shape
        return !(shapeRight < minX || shapeLeft > maxX || shapeBottom < minY || shapeTop > maxY);
      });
      
      setSelectedShapeIds(selected.map(s => s.id));
      console.log(`Selected ${selected.length} shapes`);
    } else if (isDrawing) {
      setIsDrawing(false);
      
      const dx = Math.abs(drawCurrent.x - drawStart.x);
      const dy = Math.abs(drawCurrent.y - drawStart.y);
      
      // Create shape based on selected tool
      if (user) {
        try {
          const color = getRandomColor();
          let shapeData = {
            type: selectedTool,
            color,
            createdBy: user.uid,
          };
          
          if (selectedTool === SHAPE_TYPES.RECTANGLE) {
            // Calculate rectangle dimensions
            const x = Math.min(drawStart.x, drawCurrent.x);
            const y = Math.min(drawStart.y, drawCurrent.y);
            const width = dx;
            const height = dy;
            
            // Only create if rectangle meets minimum size
            if (width >= MIN_RECTANGLE_SIZE && height >= MIN_RECTANGLE_SIZE) {
              shapeData = { ...shapeData, x, y, width, height, rotation: 0 };
              await createShape(undefined, shapeData);
              console.log('Rectangle created successfully');
              notifyFirestoreActivity();
            }
          } else if (selectedTool === SHAPE_TYPES.CIRCLE) {
            // Calculate circle radius from bounding box
            const radius = Math.sqrt(dx * dx + dy * dy) / 2;
            const centerX = (drawStart.x + drawCurrent.x) / 2;
            const centerY = (drawStart.y + drawCurrent.y) / 2;
            
            // Only create if circle meets minimum size
            if (radius >= MIN_CIRCLE_RADIUS) {
              shapeData = { ...shapeData, x: centerX, y: centerY, radius, rotation: 0 };
              await createShape(undefined, shapeData);
              console.log('Circle created successfully');
              notifyFirestoreActivity();
            }
          } else if (selectedTool === SHAPE_TYPES.POLYGON) {
            // Calculate polygon radius from bounding box
            const radius = Math.sqrt(dx * dx + dy * dy) / 2;
            const centerX = (drawStart.x + drawCurrent.x) / 2;
            const centerY = (drawStart.y + drawCurrent.y) / 2;
            
            // Only create if polygon meets minimum size
            if (radius >= MIN_POLYGON_RADIUS) {
              shapeData = { 
                ...shapeData, 
                x: centerX, 
                y: centerY, 
                radius, 
                sides: DEFAULT_POLYGON_SIDES,
                rotation: 0
              };
              await createShape(undefined, shapeData);
              console.log('Polygon created successfully');
              notifyFirestoreActivity();
            }
          }
        } catch (error) {
          console.error('Failed to create shape:', error);
        }
      }
    } else if (isDragging && (selectedRectId || draggedShapeIds.length > 0)) {
      setIsDragging(false);
      setIsDraggingLocal(false); // Tell hook we stopped dragging
      
      // Hide cursor for others (set isActive to false)
      if (user && sessionId) {
        removeCursor(undefined, sessionId).catch(console.error);
      }
      
      // Reset drag state to prevent stale offset on next drag
      setDragStart({ x: 0, y: 0 });
      setDragOffset({ x: 0, y: 0 });
      
      // If we didn't actually drag (just clicked), deselect the shape
      if (!didInteractRef.current) {
        if (draggedShapeIds.length === 1) {
          // Single shape click - deselect
          deselectRectangle();
        }
        // For multi-select, keep selection on click
      } else {
        // Sync all dragged shapes to Firestore
        if (user) {
          try {
            await Promise.all(
              draggedShapeIds.map(id => {
                const shape = rectangles.find(r => r.id === id);
                if (shape) {
                  return updateShape(undefined, id, {
                    x: shape.x,
                    y: shape.y,
                  });
                }
                return Promise.resolve();
              })
            );
            console.log(`${draggedShapeIds.length} shape(s) position updated in Firestore`);
            notifyFirestoreActivity(); // Notify of successful operation
          } catch (error) {
            console.error('Failed to update shape positions:', error);
          }
        }
      }
      
      // Clear multi-drag state
      setDraggedShapeIds([]);
      setDragInitialPositions({});
    } else if (isResizing && selectedRectId) {
      setIsResizing(false);
      setIsDraggingLocal(false);
      
      // Reset resize state
      setResizeHandle(null);
      setResizeStart({ x: 0, y: 0 });
      setResizeInitial(null);
      
      // Get the shape's current dimensions from local state
      const shape = rectangles.find(r => r.id === selectedRectId);
      if (shape && user) {
        try {
          // Sync to Firestore (different fields for different shape types)
          let updates = {};
          if (shape.type === SHAPE_TYPES.RECTANGLE) {
            updates = { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
          } else if (shape.type === SHAPE_TYPES.CIRCLE || shape.type === SHAPE_TYPES.POLYGON) {
            updates = { radius: shape.radius };
          }
          
          await updateShape(undefined, selectedRectId, updates);
          console.log('Shape dimensions updated in Firestore');
          notifyFirestoreActivity();
        } catch (error) {
          console.error('Failed to update shape dimensions:', error);
        }
      }
    } else if (isRotating && selectedRectId) {
      setIsRotating(false);
      setIsDraggingLocal(false);
      
      // Reset rotation state
      setRotateStart({ x: 0, y: 0 });
      setRotateInitial(0);
      
      // Get the shape's current rotation from local state
      const shape = rectangles.find(r => r.id === selectedRectId);
      if (shape && user) {
        try {
          // Sync to Firestore
          await updateShape(undefined, selectedRectId, {
            rotation: shape.rotation || 0,
          });
          console.log('Shape rotation updated in Firestore');
          notifyFirestoreActivity();
        } catch (error) {
          console.error('Failed to update shape rotation:', error);
        }
      }
    }
  }, [isPanning, isSelecting, isDrawing, isDragging, isResizing, isRotating, selectStart, selectCurrent, drawStart, drawCurrent, selectedRectId, draggedShapeIds, rectangles, user, sessionId, selectedTool, setIsDraggingLocal, notifyFirestoreActivity, deselectRectangle]);
  
  // Handle mouse wheel for zooming
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    
    if (!svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    
    // Get mouse position in canvas coordinates before zoom
    const mouseBeforeZoom = screenToCanvas(
      e.clientX,
      e.clientY,
      viewport,
      rect
    );
    
    // Calculate new zoom level
    const zoomDelta = -e.deltaY * ZOOM_SENSITIVITY;
    const newZoom = clamp(viewport.zoom * (1 + zoomDelta), MIN_ZOOM, MAX_ZOOM);
    
    // Calculate new offset to keep mouse position stable
    // We want the point under the mouse to stay in the same place
    const mouseAfterZoom = {
      x: (e.clientX - rect.left) / newZoom,
      y: (e.clientY - rect.top) / newZoom,
    };
    
    const newOffsetX = viewport.offsetX + (mouseBeforeZoom.x - mouseAfterZoom.x - viewport.offsetX);
    const newOffsetY = viewport.offsetY + (mouseBeforeZoom.y - mouseAfterZoom.y - viewport.offsetY);
    
    // Clamp to canvas boundaries
    const clamped = clampPanOffset(
      newOffsetX,
      newOffsetY,
      newZoom,
      containerSize.width,
      containerSize.height,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      PAN_PADDING
    );
    
    setViewport({
      offsetX: clamped.offsetX,
      offsetY: clamped.offsetY,
      zoom: newZoom,
    });
  }, [viewport, containerSize]);
  
  // Add global mouse event listeners for panning, selecting, drawing, dragging, resizing, and rotating
  useEffect(() => {
    if (isPanning || isSelecting || isDrawing || isDragging || isResizing || isRotating) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isPanning, isSelecting, isDrawing, isDragging, isResizing, isRotating, handleMouseMove, handleMouseUp]);
  
  // Add keyboard event listener for Delete key
  useEffect(() => {
    const handleKeyDown = async (e) => {
      // Delete selected shapes when Delete or Backspace is pressed
      if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedRectId || selectedShapeIds.length > 0) && !isDrawing && !isDragging && !isResizing && !isRotating && !isSelecting) {
        e.preventDefault(); // Prevent browser back navigation on Backspace
        
        // Determine which shapes to delete
        const shapesToDelete = selectedShapeIds.length > 0 ? selectedShapeIds : [selectedRectId];
        
        // Filter out locked shapes
        const deletableShapes = shapesToDelete.filter(id => {
          const shape = rectangles.find(r => r.id === id);
          return shape && (!shape.lockedBy || shape.lockedBy === user?.uid);
        });
        
        if (deletableShapes.length === 0) {
          console.log('Cannot delete - all shapes are locked by other users');
          return;
        }
        
        try {
          // Deselect first (will unlock)
          if (selectedRectId) {
            await deselectRectangle();
          }
          setSelectedShapeIds([]);
          
          // Delete all deletable shapes from Firestore
          await Promise.all(
            deletableShapes.map(id => deleteShape(undefined, id))
          );
          console.log(`${deletableShapes.length} shape(s) deleted successfully`);
          notifyFirestoreActivity();
        } catch (error) {
          console.error('Failed to delete shapes:', error);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedRectId, selectedShapeIds, rectangles, user, isDrawing, isDragging, isResizing, isRotating, isSelecting, deselectRectangle, notifyFirestoreActivity]);
  
  // Calculate viewBox for SVG (memoized)
  const viewBox = useMemo(() => 
    `${viewport.offsetX} ${viewport.offsetY} ${containerSize.width / viewport.zoom} ${containerSize.height / viewport.zoom}`,
    [viewport.offsetX, viewport.offsetY, viewport.zoom, containerSize.width, containerSize.height]
  );
  
  // Calculate preview rectangle during drawing (memoized)
  const previewRect = useMemo(() => {
    if (!isDrawing) return null;
    return {
      x: Math.min(drawStart.x, drawCurrent.x),
      y: Math.min(drawStart.y, drawCurrent.y),
      width: Math.abs(drawCurrent.x - drawStart.x),
      height: Math.abs(drawCurrent.y - drawStart.y),
    };
  }, [isDrawing, drawStart.x, drawStart.y, drawCurrent.x, drawCurrent.y]);
  
  // Generate grid lines (memoized - only recalculate when zoom changes)
  const gridLines = useMemo(() => {
    const lines = [];
    
    // Vertical lines
    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={CANVAS_HEIGHT}
          stroke={GRID_COLOR}
          strokeWidth={1 / viewport.zoom}
        />
      );
    }
    
    // Horizontal lines
    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
      lines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={CANVAS_WIDTH}
          y2={y}
          stroke={GRID_COLOR}
          strokeWidth={1 / viewport.zoom}
        />
      );
    }
    
    return lines;
  }, [viewport.zoom]);
  
  // Viewport culling: only render rectangles visible in current viewport (memoized)
  const visibleRectangles = useMemo(() => {
    // Calculate visible area with buffer for smooth panning
    const bufferSize = 200; // pixels of buffer around viewport
    const viewportLeft = viewport.offsetX - bufferSize;
    const viewportTop = viewport.offsetY - bufferSize;
    const viewportRight = viewport.offsetX + (containerSize.width / viewport.zoom) + bufferSize;
    const viewportBottom = viewport.offsetY + (containerSize.height / viewport.zoom) + bufferSize;
    
    // Filter rectangles that intersect with viewport
    return rectangles.filter(rect => {
      const rectRight = rect.x + rect.width;
      const rectBottom = rect.y + rect.height;
      
      // Check if rectangle intersects with viewport
      return !(
        rect.x > viewportRight ||
        rectRight < viewportLeft ||
        rect.y > viewportBottom ||
        rectBottom < viewportTop
      );
    });
  }, [rectangles, viewport.offsetX, viewport.offsetY, viewport.zoom, containerSize.width, containerSize.height]);
  
  return (
    <div className="canvas-container" ref={containerRef}>
      {/* Shape Palette */}
      <ShapePalette 
        selectedTool={selectedTool} 
        onSelectTool={setSelectedTool} 
      />
      
      {/* Loading overlay */}
      {canvasLoading && (
        <div className="canvas-loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading canvas...</p>
        </div>
      )}
      
      {/* Error overlay */}
      {canvasError && (
        <div className="canvas-error-overlay">
          <div className="error-content">
            <div className="error-icon">⚠️</div>
            <h3>Connection Error</h3>
            <p>{canvasError}</p>
            <p className="error-hint">Please check your internet connection and refresh the page.</p>
          </div>
        </div>
      )}
      
      <svg
        ref={svgRef}
        className="canvas-svg"
        viewBox={viewBox}
        onMouseDown={handleCanvasMouseDown}
        onWheel={handleWheel}
        style={{ 
          cursor: isPanning ? 'grabbing' : isDragging ? 'move' : isDrawing ? 'crosshair' : 'crosshair'
        }}
      >
        {/* Canvas background */}
        <rect
          x={0}
          y={0}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          fill="#1a1a1a"
        />
        
        {/* Grid */}
        <g className="canvas-grid">
          {gridLines}
        </g>
        
        {/* Canvas boundary */}
        <rect
          x={0}
          y={0}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          fill="none"
          stroke={BOUNDARY_COLOR}
          strokeWidth={BOUNDARY_WIDTH / viewport.zoom}
        />
        
        {/* Canvas content */}
        <g className="canvas-content">
          {/* Render only visible shapes (viewport culling for performance) */}
          {visibleRectangles.map((shape) => {
            const shapeProps = {
              key: shape.id,
              ...shape,
              isSelected: shape.id === selectedRectId || selectedShapeIds.includes(shape.id),
              isLocked: shape.lockedBy !== null && shape.lockedBy !== user?.uid,
              lockedByUserName: shape.lockedByUserName,
              onClick: handleRectangleClick,
              onMouseDown: handleRectangleMouseDown,
            };
            
            // Render appropriate component based on shape type
            if (shape.type === SHAPE_TYPES.CIRCLE) {
              return <Circle {...shapeProps} />;
            } else if (shape.type === SHAPE_TYPES.POLYGON) {
              return <Polygon {...shapeProps} />;
            } else {
              // Default to rectangle (including legacy shapes without type field)
              return <Rectangle {...shapeProps} />;
            }
          })}
          
          {/* Selection box with resize and rotation handles */}
          {selectedRectId && !isDrawing && (
            <SelectionBox
              shape={rectangles.find(r => r.id === selectedRectId)}
              zoom={viewport.zoom}
              onResizeStart={handleResizeStart}
              onRotateStart={handleRotateStart}
            />
          )}
          
          {/* Preview shape while drawing */}
          {isDrawing && previewRect && (() => {
            const dx = Math.abs(drawCurrent.x - drawStart.x);
            const dy = Math.abs(drawCurrent.y - drawStart.y);
            
            if (selectedTool === SHAPE_TYPES.RECTANGLE && 
                previewRect.width >= MIN_RECTANGLE_SIZE && 
                previewRect.height >= MIN_RECTANGLE_SIZE) {
              return (
                <rect
                  x={previewRect.x}
                  y={previewRect.y}
                  width={previewRect.width}
                  height={previewRect.height}
                  fill={getRandomColor()}
                  opacity={0.5}
                  stroke="#fff"
                  strokeWidth={2 / viewport.zoom}
                  strokeDasharray={`${10 / viewport.zoom} ${5 / viewport.zoom}`}
                  className="preview-shape"
                  style={{ pointerEvents: 'none' }}
                />
              );
            } else if (selectedTool === SHAPE_TYPES.CIRCLE) {
              const radius = Math.sqrt(dx * dx + dy * dy) / 2;
              const centerX = (drawStart.x + drawCurrent.x) / 2;
              const centerY = (drawStart.y + drawCurrent.y) / 2;
              
              if (radius >= MIN_CIRCLE_RADIUS) {
                return (
                  <circle
                    cx={centerX}
                    cy={centerY}
                    r={radius}
                    fill={getRandomColor()}
                    opacity={0.5}
                    stroke="#fff"
                    strokeWidth={2 / viewport.zoom}
                    strokeDasharray={`${10 / viewport.zoom} ${5 / viewport.zoom}`}
                    className="preview-shape"
                    style={{ pointerEvents: 'none' }}
                  />
                );
              }
            } else if (selectedTool === SHAPE_TYPES.POLYGON) {
              const radius = Math.sqrt(dx * dx + dy * dy) / 2;
              const centerX = (drawStart.x + drawCurrent.x) / 2;
              const centerY = (drawStart.y + drawCurrent.y) / 2;
              
              if (radius >= MIN_POLYGON_RADIUS) {
                // Calculate polygon points
                const points = [];
                const angleStep = (Math.PI * 2) / DEFAULT_POLYGON_SIDES;
                const startAngle = -Math.PI / 2;
                
                for (let i = 0; i < DEFAULT_POLYGON_SIDES; i++) {
                  const angle = startAngle + angleStep * i;
                  const px = centerX + radius * Math.cos(angle);
                  const py = centerY + radius * Math.sin(angle);
                  points.push(`${px},${py}`);
                }
                
                return (
                  <polygon
                    points={points.join(' ')}
                    fill={getRandomColor()}
                    opacity={0.5}
                    stroke="#fff"
                    strokeWidth={2 / viewport.zoom}
                    strokeDasharray={`${10 / viewport.zoom} ${5 / viewport.zoom}`}
                    className="preview-shape"
                    style={{ pointerEvents: 'none' }}
                  />
                );
              }
            }
            return null;
          })()}
          
          {/* Selection rectangle while multi-selecting */}
          {isSelecting && (() => {
            const x = Math.min(selectStart.x, selectCurrent.x);
            const y = Math.min(selectStart.y, selectCurrent.y);
            const width = Math.abs(selectCurrent.x - selectStart.x);
            const height = Math.abs(selectCurrent.y - selectStart.y);
            
            return (
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill="rgba(100, 108, 255, 0.1)"
                stroke="#646cff"
                strokeWidth={2 / viewport.zoom}
                strokeDasharray={`${5 / viewport.zoom} ${3 / viewport.zoom}`}
                className="selection-rectangle"
                style={{ pointerEvents: 'none' }}
              />
            );
          })()}
          
          {/* Other users' cursors - render in separate layer */}
          <g className="cursors-layer">
            {cursors.map((cursor) => (
              <Cursor
                key={cursor.sessionId}
                userId={cursor.userId}
                x={cursor.x}
                y={cursor.y}
                userName={cursor.userName}
              />
            ))}
          </g>
        </g>
      </svg>
      
      {/* Connection status indicator */}
      <div className={`connection-status connection-status-${connectionStatus}`}>
        {connectionStatus === 'connecting' && (
          <>
            <span className="status-dot"></span>
            <span>Connecting...</span>
          </>
        )}
        {connectionStatus === 'connected' && (
          <>
            <span className="status-dot"></span>
            <span>Connected</span>
          </>
        )}
        {connectionStatus === 'reconnecting' && (
          <>
            <span className="status-dot"></span>
            <span>Reconnecting...</span>
          </>
        )}
        {connectionStatus === 'offline' && (
          <>
            <span className="status-dot"></span>
            <span>Offline</span>
          </>
        )}
        {connectionStatus === 'error' && (
          <>
            <span className="status-dot"></span>
            <span>Connection Error</span>
          </>
        )}
      </div>
      
      {/* FPS Counter */}
      {SHOW_FPS_COUNTER && (
        <div className="fps-counter">
          <div className="fps-value">{fps} FPS</div>
          <div className="fps-render">Render: {renderTime}ms</div>
          <div className="fps-objects">
            Objects: {visibleRectangles.length}/{rectangles.length}
            {visibleRectangles.length < rectangles.length && ' (culled)'}
          </div>
          <div className="fps-zoom">Zoom: {(viewport.zoom * 100).toFixed(0)}%</div>
          <div className="fps-pos">
            Pos: ({Math.round(viewport.offsetX)}, {Math.round(viewport.offsetY)})
          </div>
          <div className={`fps-firestore ${firestoreStatus}`}>
            Firestore: {firestoreStatus === 'connected' ? '✓' : firestoreStatus === 'error' ? '✗' : '...'}
          </div>
        </div>
      )}
      
      {/* Canvas info overlay */}
      <div className="canvas-info">
        <p>🎨 {selectedRectId ? 'Drag to move selected rectangle!' : 'Click rectangles to select • Drag to create'}</p>
        <p className="canvas-hint">Hold Shift/Cmd to pan • Scroll to zoom • Click empty space to deselect</p>
        <p className="canvas-size">{rectangles.length} objects • {onlineUsersCount} {onlineUsersCount === 1 ? 'user' : 'users'} online • {CANVAS_WIDTH} × {CANVAS_HEIGHT}px</p>
      </div>
    </div>
  );
}

export default Canvas;

