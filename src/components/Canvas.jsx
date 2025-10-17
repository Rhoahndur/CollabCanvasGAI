import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_SENSITIVITY,
  DEFAULT_ZOOM,
  PAN_PADDING_PERCENT,
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
  constrainRectangle,
  constrainCircle,
} from '../utils/canvasUtils';
import { testFirestoreConnection, createShape, updateShape, deleteShape, updateCursor, removeCursor, updatePresenceHeartbeat } from '../services/canvasService';
import { useCanvas } from '../hooks/useCanvas';
import { useCursors } from '../hooks/useCursors';
import { useAuth } from '../hooks/useAuth';
import { getRandomColor } from '../utils/colorUtils';
import { setup500Test, generateTestShapes } from '../utils/testData';
import Rectangle from './Rectangle';
import Circle from './Circle';
import Polygon from './Polygon';
import Cursor from './Cursor';
import ShapePalette from './ShapePalette';
import SelectionBox from './SelectionBox';
import ZoomControls from './ZoomControls';
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
    notifyFirestoreActivity,
    setBatchDeleting 
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
  
  // Activity tracking for presence updates
  const lastActivityRef = useRef(Date.now());
  const activityThrottleRef = useRef(null);
  
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
    
    // Add debug helper to inspect shapes
    if (user) {
      window.debugShapes = {
        // List all shapes with full details
        listAll: () => {
          console.log(`📊 Total shapes: ${rectangles.length}`);
          rectangles.forEach((shape, index) => {
            console.log(`\n[${index}] Shape ID: ${shape.id}`);
            console.log('  Type:', shape.type);
            console.log('  Position:', { x: shape.x, y: shape.y });
            console.log('  Size:', shape.width ? { width: shape.width, height: shape.height } : { radius: shape.radius });
            console.log('  Color:', shape.color);
            console.log('  Created by:', shape.createdBy);
            console.log('  Locked by:', shape.lockedBy || 'unlocked');
            console.log('  Rotation:', shape.rotation || 0);
            console.log('  Full data:', JSON.stringify(shape, null, 2));
          });
          return rectangles;
        },
        
        // Inspect a specific shape by ID
        inspect: (id) => {
          const shape = rectangles.find(r => r.id === id);
          if (!shape) {
            console.error(`❌ Shape with ID "${id}" not found`);
            return null;
          }
          console.log('🔍 Shape details:');
          console.log(JSON.stringify(shape, null, 2));
          return shape;
        },
        
        // Find shapes with missing or unusual properties
        findBroken: () => {
          console.log('🔍 Checking for shapes with issues...');
          const issues = [];
          
          rectangles.forEach(shape => {
            const shapeIssues = [];
            
            if (!shape.id) shapeIssues.push('Missing ID');
            if (!shape.type) shapeIssues.push('Missing type');
            if (shape.x === undefined || shape.x === null) shapeIssues.push('Missing x');
            if (shape.y === undefined || shape.y === null) shapeIssues.push('Missing y');
            if (!shape.color) shapeIssues.push('Missing color');
            if (!shape.createdBy) shapeIssues.push('Missing createdBy');
            
            if (shape.type === 'rectangle' && (shape.width === undefined || shape.height === undefined)) {
              shapeIssues.push('Rectangle missing width/height');
            }
            if ((shape.type === 'circle' || shape.type === 'polygon') && shape.radius === undefined) {
              shapeIssues.push('Circle/Polygon missing radius');
            }
            
            if (shapeIssues.length > 0) {
              issues.push({ id: shape.id, issues: shapeIssues, shape });
            }
          });
          
          if (issues.length === 0) {
            console.log('✅ All shapes look good!');
          } else {
            console.log(`⚠️ Found ${issues.length} shape(s) with issues:`);
            issues.forEach(({ id, issues: shapeIssues, shape }) => {
              console.log(`\n  Shape ${id}:`);
              console.log('    Issues:', shapeIssues);
              console.log('    Data:', JSON.stringify(shape, null, 2));
            });
          }
          
          return issues;
        },
        
        // Get current user info
        currentUser: () => {
          console.log('👤 Current user:');
          console.log('  UID:', user?.uid);
          console.log('  Display name:', user?.displayName);
          return user;
        }
      };
      
      // Clean up broken shapes
      window.debugShapes.cleanupBroken = async () => {
        if (!user) {
          console.error('❌ You must be logged in to cleanup shapes');
          return;
        }
        
        console.log('🔧 Starting cleanup of broken shapes...');
        const issues = window.debugShapes.findBroken();
        
        if (issues.length === 0) {
          console.log('✅ No broken shapes found!');
          return { deleted: 0, fixed: 0 };
        }
        
        const shouldDelete = window.confirm(
          `Found ${issues.length} shape(s) with issues.\n\n` +
          `Do you want to DELETE them from the database?\n\n` +
          `Click OK to DELETE or Cancel to keep them.`
        );
        
        let deletedCount = 0;
        let failedCount = 0;
        
        if (shouldDelete) {
          console.log(`🗑️ Deleting ${issues.length} broken shapes...`);
          
          for (const { id, issues: shapeIssues, shape } of issues) {
            try {
              console.log(`  Deleting broken shape ${id}...`);
              console.log(`    Issues: ${shapeIssues.join(', ')}`);
              await deleteShape(undefined, id);
              deletedCount++;
              console.log(`  ✅ Deleted shape ${id}`);
            } catch (error) {
              failedCount++;
              console.error(`  ❌ Failed to delete shape ${id}:`, error);
            }
          }
          
          console.log(`\n✅ Cleanup complete!`);
          console.log(`  Deleted: ${deletedCount}`);
          console.log(`  Failed: ${failedCount}`);
          
          notifyFirestoreActivity();
          
          return { deleted: deletedCount, failed: failedCount };
        } else {
          console.log('❌ Cleanup cancelled by user');
          return { deleted: 0, failed: 0 };
        }
      };
      
      // Force delete a specific shape (bypasses all checks)
      window.debugShapes.forceDelete = async (shapeId) => {
        if (!user) {
          console.error('❌ You must be logged in to delete shapes');
          return false;
        }
        
        const shape = rectangles.find(r => r.id === shapeId);
        if (!shape) {
          console.error(`❌ Shape ${shapeId} not found in local state`);
          return false;
        }
        
        const confirmed = window.confirm(
          `Force delete shape ${shapeId}?\n\n` +
          `This will attempt to delete it directly from Firestore,\n` +
          `even if it's locked or has issues.`
        );
        
        if (!confirmed) {
          console.log('❌ Force delete cancelled');
          return false;
        }
        
        try {
          console.log(`🗑️ Force deleting shape ${shapeId}...`);
          console.log('  Shape data:', JSON.stringify(shape, null, 2));
          
          await deleteShape(undefined, shapeId);
          console.log(`✅ Shape ${shapeId} force deleted from database`);
          
          notifyFirestoreActivity();
          return true;
        } catch (error) {
          console.error(`❌ Failed to force delete shape ${shapeId}:`, error);
          return false;
        }
      };
      
      console.log('🛠️ Debug helpers available:');
      console.log('  - window.debugShapes.listAll() - List all shapes');
      console.log('  - window.debugShapes.inspect(id) - Inspect a specific shape');
      console.log('  - window.debugShapes.findBroken() - Find shapes with missing properties');
      console.log('  - window.debugShapes.cleanupBroken() - Delete all broken shapes');
      console.log('  - window.debugShapes.forceDelete(id) - Force delete a specific shape');
      console.log('  - window.debugShapes.currentUser() - Show current user info');
    }
  }, [user?.uid, rectangles, notifyFirestoreActivity]);
  
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
  
  // Track user activity for presence updates (defined early so other callbacks can use it)
  const trackActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    
    // Throttle presence updates to max once per 3 seconds during active interaction
    // More frequent updates ensure user never appears offline while actively using
    if (activityThrottleRef.current) return;
    
    activityThrottleRef.current = setTimeout(() => {
      activityThrottleRef.current = null;
    }, 3000);
    
    // Update presence to show user is active
    if (sessionId) {
      updatePresenceHeartbeat(undefined, sessionId, true).catch(console.error);
    }
  }, [sessionId]);
  
  // Handle click on background (canvas)
  const handleCanvasMouseDown = useCallback((e) => {
    // Only handle left mouse button
    if (e.button !== 0) return;
    
    if (!svgRef.current) return;
    
    // Track activity for presence
    trackActivity();
    
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
    
    // Track activity for presence
    trackActivity();
    
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
    // Track activity when moving during active operations
    if (isDragging || isResizing || isRotating || isPanning || isDrawing || isSelecting) {
      trackActivity();
    }
    
    // Track cursor position for multiplayer (throttled)
    // Show cursor to others when actively manipulating objects (dragging, resizing, or rotating)
    if (svgRef.current && user && (isDragging || isResizing || isRotating)) {
      const now = Date.now();
      if (now - lastCursorUpdate.current > CURSOR_UPDATE_THROTTLE) {
        const rect = svgRef.current.getBoundingClientRect();
        const canvasPos = screenToCanvas(e.clientX, e.clientY, viewport, rect);
        
        // Update cursor position in Firestore
        updateCursor(
          undefined,
          sessionId,
          user.uid,
          canvasPos.x,
          canvasPos.y,
          user.displayName,
          cursorArrivalTime.current,
          true // isActive - show cursor when manipulating
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
      
      // Clamp to canvas boundaries (with 20% padding)
      const clamped = clampPanOffset(
        newOffsetX,
        newOffsetY,
        viewport.zoom,
        containerSize.width,
        containerSize.height,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        PAN_PADDING_PERCENT
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
            let newX = initial.x + dx;
            let newY = initial.y + dy;
            
            // Constrain to canvas boundaries
            if (r.type === SHAPE_TYPES.RECTANGLE) {
              const constrained = constrainRectangle(newX, newY, r.width, r.height, CANVAS_WIDTH, CANVAS_HEIGHT);
              newX = constrained.x;
              newY = constrained.y;
            } else if (r.type === SHAPE_TYPES.CIRCLE || r.type === SHAPE_TYPES.POLYGON) {
              const constrained = constrainCircle(newX, newY, r.radius, CANVAS_WIDTH, CANVAS_HEIGHT);
              newX = constrained.x;
              newY = constrained.y;
            }
            
            return { ...r, x: newX, y: newY };
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
        
        // Constrain to canvas boundaries
        const constrained = constrainRectangle(newX, newY, newWidth, newHeight, CANVAS_WIDTH, CANVAS_HEIGHT);
        updates = constrained;
      } else if (resizeInitial.type === SHAPE_TYPES.CIRCLE || resizeInitial.type === SHAPE_TYPES.POLYGON) {
        // For circles and polygons, resize by adjusting radius
        const distance = Math.sqrt(dx * dx + dy * dy);
        const direction = resizeHandle === 'e' || resizeHandle === 's' ? 1 : -1;
        let newRadius = Math.max(MIN_CIRCLE_RADIUS, resizeInitial.radius + distance * direction * 0.5);
        
        // Constrain to canvas boundaries (keep center, adjust radius if needed)
        const maxRadiusX = Math.min(resizeInitial.x, CANVAS_WIDTH - resizeInitial.x);
        const maxRadiusY = Math.min(resizeInitial.y, CANVAS_HEIGHT - resizeInitial.y);
        const maxRadius = Math.min(maxRadiusX, maxRadiusY);
        newRadius = Math.min(newRadius, maxRadius);
        
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
    } else if (isRotating && svgRef.current && selectedRectId) {
      // Handle rotation
      const rect = svgRef.current.getBoundingClientRect();
      const canvasPos = screenToCanvas(e.clientX, e.clientY, viewport, rect);
      
      // Get the current shape to find its center
      const shape = rectangles.find(r => r.id === selectedRectId);
      if (!shape) return;
      
      // Calculate center of shape
      let centerX, centerY;
      if (shape.type === SHAPE_TYPES.RECTANGLE) {
        centerX = shape.x + shape.width / 2;
        centerY = shape.y + shape.height / 2;
      } else {
        centerX = shape.x;
        centerY = shape.y;
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
  }, [isPanning, isSelecting, isDrawing, isDragging, isResizing, isRotating, panStart, panOffset, viewport, containerSize, dragStart, dragOffset, draggedShapeIds, dragInitialPositions, resizeStart, resizeHandle, resizeInitial, rotateStart, rotateInitial, selectedRectId, rectangles, user, sessionId, notifyFirestoreActivity, trackActivity]);
  
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
            let x = Math.min(drawStart.x, drawCurrent.x);
            let y = Math.min(drawStart.y, drawCurrent.y);
            let width = dx;
            let height = dy;
            
            // Only create if rectangle meets minimum size
            if (width >= MIN_RECTANGLE_SIZE && height >= MIN_RECTANGLE_SIZE) {
              // Constrain to canvas boundaries
              const constrained = constrainRectangle(x, y, width, height, CANVAS_WIDTH, CANVAS_HEIGHT);
              shapeData = { ...shapeData, ...constrained, rotation: 0 };
              await createShape(undefined, shapeData);
          console.log('Rectangle created successfully');
              notifyFirestoreActivity();
            }
          } else if (selectedTool === SHAPE_TYPES.CIRCLE) {
            // Calculate circle radius from bounding box
            let radius = Math.sqrt(dx * dx + dy * dy) / 2;
            let centerX = (drawStart.x + drawCurrent.x) / 2;
            let centerY = (drawStart.y + drawCurrent.y) / 2;
            
            // Only create if circle meets minimum size
            if (radius >= MIN_CIRCLE_RADIUS) {
              // Constrain to canvas boundaries
              const constrained = constrainCircle(centerX, centerY, radius, CANVAS_WIDTH, CANVAS_HEIGHT);
              shapeData = { ...shapeData, ...constrained, rotation: 0 };
              await createShape(undefined, shapeData);
              console.log('Circle created successfully');
              notifyFirestoreActivity();
            }
          } else if (selectedTool === SHAPE_TYPES.POLYGON) {
            // Calculate polygon radius from bounding box
            let radius = Math.sqrt(dx * dx + dy * dy) / 2;
            let centerX = (drawStart.x + drawCurrent.x) / 2;
            let centerY = (drawStart.y + drawCurrent.y) / 2;
            
            // Only create if polygon meets minimum size
            if (radius >= MIN_POLYGON_RADIUS) {
              // Constrain to canvas boundaries
              const constrained = constrainCircle(centerX, centerY, radius, CANVAS_WIDTH, CANVAS_HEIGHT);
              shapeData = { 
                ...shapeData, 
                x: constrained.x,
                y: constrained.y,
                radius: constrained.radius,
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
      
      // Hide cursor for others
      if (user && sessionId) {
        removeCursor(undefined, sessionId).catch(console.error);
      }
      
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
      
      // Hide cursor for others
      if (user && sessionId) {
        removeCursor(undefined, sessionId).catch(console.error);
      }
      
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
  }, [isPanning, isSelecting, isDrawing, isDragging, isResizing, isRotating, selectStart, selectCurrent, drawStart, drawCurrent, selectedRectId, draggedShapeIds, rectangles, user, sessionId, selectedTool, setIsDraggingLocal, notifyFirestoreActivity, deselectRectangle, trackActivity]);
  
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
    
    // Clamp to canvas boundaries (with 20% padding)
    const clamped = clampPanOffset(
      newOffsetX,
      newOffsetY,
      newZoom,
      containerSize.width,
      containerSize.height,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      PAN_PADDING_PERCENT
    );
    
    setViewport({
      offsetX: clamped.offsetX,
      offsetY: clamped.offsetY,
      zoom: newZoom,
    });
  }, [viewport, containerSize]);
  
  // Programmatic zoom functions (for zoom controls)
  const handleZoomIn = useCallback(() => {
    if (!svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Zoom towards center of viewport
    const centerBeforeZoom = screenToCanvas(centerX, centerY, viewport, rect);
    
    const newZoom = clamp(viewport.zoom * 1.2, MIN_ZOOM, MAX_ZOOM);
    
    const centerAfterZoom = {
      x: (centerX - rect.left) / newZoom,
      y: (centerY - rect.top) / newZoom,
    };
    
    const newOffsetX = viewport.offsetX + (centerBeforeZoom.x - centerAfterZoom.x - viewport.offsetX);
    const newOffsetY = viewport.offsetY + (centerBeforeZoom.y - centerAfterZoom.y - viewport.offsetY);
    
    // Clamp to canvas boundaries (with 20% padding)
    const clamped = clampPanOffset(
      newOffsetX,
      newOffsetY,
      newZoom,
      containerSize.width,
      containerSize.height,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      PAN_PADDING_PERCENT
    );
    
    setViewport({
      offsetX: clamped.offsetX,
      offsetY: clamped.offsetY,
      zoom: newZoom,
    });
  }, [viewport, containerSize]);

  const handleZoomOut = useCallback(() => {
    if (!svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Zoom out from center of viewport
    const centerBeforeZoom = screenToCanvas(centerX, centerY, viewport, rect);
    
    const newZoom = clamp(viewport.zoom / 1.2, MIN_ZOOM, MAX_ZOOM);
    
    const centerAfterZoom = {
      x: (centerX - rect.left) / newZoom,
      y: (centerY - rect.top) / newZoom,
    };
    
    const newOffsetX = viewport.offsetX + (centerBeforeZoom.x - centerAfterZoom.x - viewport.offsetX);
    const newOffsetY = viewport.offsetY + (centerBeforeZoom.y - centerAfterZoom.y - viewport.offsetY);
    
    // Clamp to canvas boundaries (with 20% padding)
    const clamped = clampPanOffset(
      newOffsetX,
      newOffsetY,
      newZoom,
      containerSize.width,
      containerSize.height,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      PAN_PADDING_PERCENT
    );
    
    setViewport({
      offsetX: clamped.offsetX,
      offsetY: clamped.offsetY,
      zoom: newZoom,
    });
  }, [viewport, containerSize]);

  const handleZoomReset = useCallback(() => {
    setViewport({
      zoom: DEFAULT_ZOOM,
      offsetX: 0,
      offsetY: 0,
    });
  }, []);
  
  // Set specific zoom level
  const handleZoomSet = useCallback((newZoom) => {
    if (!svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Get current center point in canvas coordinates
    const centerBeforeZoom = screenToCanvas(centerX, centerY, viewport, rect);
    
    // Clamp zoom to valid range
    const clampedZoom = clamp(newZoom, MIN_ZOOM, MAX_ZOOM);
    
    // Calculate new offset to keep center point in same position
    const centerAfterZoom = {
      x: (centerX - rect.left) / clampedZoom,
      y: (centerY - rect.top) / clampedZoom,
    };
    
    const newOffsetX = viewport.offsetX + (centerBeforeZoom.x - centerAfterZoom.x);
    const newOffsetY = viewport.offsetY + (centerBeforeZoom.y - centerAfterZoom.y);
    
    // Clamp to canvas boundaries (with 20% padding)
    const clamped = clampPanOffset(
      newOffsetX,
      newOffsetY,
      clampedZoom,
      containerSize.width,
      containerSize.height,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      PAN_PADDING_PERCENT
    );
    
    setViewport({
      zoom: clampedZoom,
      offsetX: clamped.offsetX,
      offsetY: clamped.offsetY,
    });
  }, [viewport, containerSize]);

  // Handle clearing all shapes
  const handleClearAll = useCallback(async () => {
    if (!user) return;
    
    console.log('🗑️ CLEAR ALL initiated');
    console.log(`  Total shapes on canvas: ${rectangles.length}`);
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ALL ${rectangles.length} shapes?\n\n` +
      `This action cannot be undone!`
    );
    
    if (!confirmed) {
      console.log('❌ Clear All cancelled by user');
      return;
    }
    
    try {
      console.log('🔍 Checking which shapes can be deleted...');
      
      // Delete all shapes that aren't locked by other users
      const deletableShapes = rectangles.filter(shape => 
        !shape.lockedBy || shape.lockedBy === user.uid
      );
      
      console.log(`  ✅ Deletable shapes: ${deletableShapes.length}`);
      console.log(`  🔒 Locked by others: ${rectangles.length - deletableShapes.length}`);
      
      if (deletableShapes.length === 0) {
        console.log('❌ All shapes are locked by other users');
        alert('All shapes are locked by other users.');
        return;
      }
      
      if (deletableShapes.length < rectangles.length) {
        const lockedCount = rectangles.length - deletableShapes.length;
        const proceed = window.confirm(
          `${lockedCount} shape(s) are locked by other users and cannot be deleted.\n\n` +
          `Delete the remaining ${deletableShapes.length} shape(s)?`
        );
        
        if (!proceed) {
          console.log('❌ Clear All cancelled - user chose not to delete remaining shapes');
          return;
        }
      }
      
      // Clear selection first
      console.log('🔓 Clearing selections...');
      deselectRectangle();
      setSelectedShapeIds([]);
      
      // CRITICAL: Enable batch delete mode to prevent race condition
      console.log('🚨 Enabling batch delete mode (prevents merge logic)');
      setBatchDeleting(true);
      
      // Delete shapes in batches from Firestore
      console.log('🗑️ Starting batch deletion from Firestore...');
      const batchSize = 25;
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < deletableShapes.length; i += batchSize) {
        const batch = deletableShapes.slice(i, i + batchSize);
        console.log(`  Deleting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(deletableShapes.length / batchSize)} (${batch.length} shapes)...`);
        
        const results = await Promise.allSettled(
          batch.map(shape => {
            console.log(`    Deleting shape ${shape.id} from Firestore...`);
            return deleteShape(undefined, shape.id);
          })
        );
        
        // Count successes and failures
        results.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            successCount++;
            console.log(`    ✅ Shape ${batch[idx].id} deleted from database`);
          } else {
            failCount++;
            console.error(`    ❌ Failed to delete shape ${batch[idx].id}:`, result.reason);
          }
        });
        
        console.log(`  ✓ Batch ${Math.floor(i / batchSize) + 1} complete: ${successCount}/${deletableShapes.length} deleted`);
      }
      
      console.log(`✅ Clear All complete!`);
      console.log(`  Successfully deleted from database: ${successCount} shapes`);
      if (failCount > 0) {
        console.warn(`  Failed to delete: ${failCount} shapes`);
      }
      
      // CRITICAL: Disable batch delete mode after a delay to allow Firestore to sync
      setTimeout(() => {
        console.log('🔓 Disabling batch delete mode');
        setBatchDeleting(false);
      }, 1000);
      
      notifyFirestoreActivity();
      
      // Show success message
      if (successCount > 0) {
        alert(`Successfully deleted ${successCount} shape(s) from the database!${failCount > 0 ? `\n\n${failCount} shape(s) failed to delete.` : ''}`);
      }
    } catch (error) {
      console.error('❌ CRITICAL ERROR during Clear All:', error);
      
      // Make sure to disable batch delete mode even on error
      console.log('🔓 Disabling batch delete mode (error cleanup)');
      setBatchDeleting(false);
      
      alert('Failed to clear shapes. Please check the console and try again.');
    }
  }, [rectangles, user, deselectRectangle, setSelectedShapeIds, notifyFirestoreActivity, setBatchDeleting]);

  // Handle generating 10 random shapes
  const handleGenerate500 = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log('🎨 Generating 10 random shapes...');
      await generateTestShapes(10, user.uid);
      notifyFirestoreActivity();
      console.log('✅ 10 shapes generated successfully!');
    } catch (error) {
      console.error('Failed to generate shapes:', error);
      alert('Failed to generate shapes. Please try again.');
    }
  }, [user, notifyFirestoreActivity]);
  
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
      // Track activity on any keypress
      trackActivity();
      
      // Zoom keyboard shortcuts (Ctrl/Cmd + +/- and Ctrl/Cmd + 0)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
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

      // Delete selected shapes when Delete or Backspace is pressed
      if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedRectId || selectedShapeIds.length > 0) && !isDrawing && !isDragging && !isResizing && !isRotating && !isSelecting) {
        e.preventDefault(); // Prevent browser back navigation on Backspace
        
        console.log('🗑️ DELETE KEY PRESSED');
        console.log('  selectedRectId:', selectedRectId);
        console.log('  selectedShapeIds:', selectedShapeIds);
        
        // Determine which shapes to delete
        const shapesToDelete = selectedShapeIds.length > 0 ? selectedShapeIds : [selectedRectId];
        console.log('  shapesToDelete:', shapesToDelete);
        
        // Get full shape details
        const shapeDetails = shapesToDelete.map(id => {
          const shape = rectangles.find(r => r.id === id);
          return { id, shape: shape || 'NOT_FOUND' };
        });
        console.log('  Shape details:', JSON.stringify(shapeDetails, null, 2));
        
        // Filter out locked shapes
        const deletableShapes = shapesToDelete.filter(id => {
          const shape = rectangles.find(r => r.id === id);
          const canDelete = shape && (!shape.lockedBy || shape.lockedBy === user?.uid);
          
          if (!shape) {
            console.warn(`  ❌ Shape ${id} not found in rectangles array`);
          } else if (shape.lockedBy && shape.lockedBy !== user?.uid) {
            console.warn(`  🔒 Shape ${id} locked by another user:`, shape.lockedBy, 'Current user:', user?.uid);
          } else {
            console.log(`  ✅ Shape ${id} can be deleted`);
          }
          
          return canDelete;
        });
        
        console.log('  deletableShapes:', deletableShapes);
        
        if (deletableShapes.length === 0) {
          console.log('❌ Cannot delete - all shapes are locked by other users or not found');
          return;
        }
        
        try {
          console.log('🔓 Deselecting shapes...');
          // Deselect first (will unlock)
          if (selectedRectId) {
            await deselectRectangle();
          }
          setSelectedShapeIds([]);
          
          console.log('🗑️ Deleting shapes from Firestore...');
          // Delete all deletable shapes from Firestore
          const deletePromises = deletableShapes.map(async id => {
            try {
              console.log(`  Deleting shape ${id}...`);
              await deleteShape(undefined, id);
              console.log(`  ✅ Shape ${id} deleted successfully`);
            } catch (err) {
              console.error(`  ❌ Failed to delete shape ${id}:`, err);
              throw err;
            }
          });
          
          await Promise.all(deletePromises);
          console.log(`✅ ${deletableShapes.length} shape(s) deleted successfully`);
          notifyFirestoreActivity();
        } catch (error) {
          console.error('❌ Failed to delete shapes:', error);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedRectId, selectedShapeIds, rectangles, user, isDrawing, isDragging, isResizing, isRotating, isSelecting, deselectRectangle, notifyFirestoreActivity, handleZoomIn, handleZoomOut, handleZoomReset, trackActivity]);
  
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
        onClearAll={handleClearAll}
        onGenerate500={handleGenerate500}
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

      {/* Zoom Controls */}
      <ZoomControls
        zoom={viewport.zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onZoomSet={handleZoomSet}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
      />
    </div>
  );
}

export default Canvas;

