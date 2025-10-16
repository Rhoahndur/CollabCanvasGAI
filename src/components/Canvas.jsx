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
  CURSOR_UPDATE_THROTTLE,
  DRAG_UPDATE_THROTTLE,
} from '../utils/constants';
import {
  screenToCanvas,
  clampPanOffset,
  clamp,
  calculateFPS,
  isPointInRect,
} from '../utils/canvasUtils';
import { testFirestoreConnection, createRectangle, updateRectangle, updateCursor, removeCursor } from '../services/canvasService';
import { useCanvas } from '../hooks/useCanvas';
import { useCursors } from '../hooks/useCursors';
import { useAuth } from '../hooks/useAuth';
import { getRandomColor } from '../utils/colorUtils';
import { setup500Test } from '../utils/testData';
import Rectangle from './Rectangle';
import Cursor from './Cursor';
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
    } else {
      // Start drawing rectangle (deselect any selected)
      deselectRectangle();
      setIsDrawing(true);
      setDrawStart(canvasPos);
      setDrawCurrent(canvasPos);
    }
    
    // Prevent text selection while dragging
    e.preventDefault();
  }, [viewport, deselectRectangle]);
  
  // Handle click on rectangle
  const handleRectangleClick = useCallback((rectId, e) => {
    e.stopPropagation();
    
    const rect = rectangles.find(r => r.id === rectId);
    if (!rect) return;
    
    // Check if locked by another user
    if (rect.lockedBy && rect.lockedBy !== user?.uid) {
      console.log('Rectangle is locked by another user');
      return;
    }
    
    // Select the rectangle
    selectRectangle(rectId);
  }, [rectangles, user, selectRectangle]);
  
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
    
    // If not selected, select it first
    if (selectedRectId !== rectId) {
      selectRectangle(rectId);
    }
    
    // Start dragging - ALWAYS use the current rectangle's position
    const svgRect = svgRef.current.getBoundingClientRect();
    const canvasPos = screenToCanvas(e.clientX, e.clientY, viewport, svgRect);
    
    // Set drag state with current rectangle's actual position
    setDragStart(canvasPos);
    setDragOffset({ x: rect.x, y: rect.y });
    
    // Set dragging flags AFTER setting positions to prevent race condition
    setIsDragging(true);
    setIsDraggingLocal(true); // Tell hook we're dragging
    
    e.preventDefault();
  }, [rectangles, user, selectedRectId, selectRectangle, viewport, setIsDraggingLocal]);
  
  // Handle mouse leave on rectangle (auto-deselect when cursor leaves)
  const handleRectangleMouseLeave = useCallback((rectId, e) => {
    e.stopPropagation();
    
    // Only deselect if:
    // 1. This is the currently selected rectangle
    // 2. We're not actively dragging it
    if (rectId === selectedRectId && !isDragging) {
      deselectRectangle();
    }
  }, [selectedRectId, isDragging, deselectRectangle]);
  
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
    } else if (isDrawing && svgRef.current) {
      // Handle drawing rectangle
      const rect = svgRef.current.getBoundingClientRect();
      const canvasPos = screenToCanvas(e.clientX, e.clientY, viewport, rect);
      setDrawCurrent(canvasPos);
    } else if (isDragging && svgRef.current && selectedRectId) {
      // Handle dragging selected rectangle
      const rect = svgRef.current.getBoundingClientRect();
      const canvasPos = screenToCanvas(e.clientX, e.clientY, viewport, rect);
      
      const dx = canvasPos.x - dragStart.x;
      const dy = canvasPos.y - dragStart.y;
      
      const newX = dragOffset.x + dx;
      const newY = dragOffset.y + dy;
      
      // Optimistic update (update local state immediately for smooth dragging)
      setRectangles(prev => prev.map(r => 
        r.id === selectedRectId 
          ? { ...r, x: newX, y: newY }
          : r
      ));
      
      // Send throttled updates to Firestore during drag for real-time sync
      const now = Date.now();
      if (now - lastDragUpdate.current > DRAG_UPDATE_THROTTLE) {
        updateRectangle(undefined, selectedRectId, {
          x: newX,
          y: newY,
        }).catch(console.error);
        lastDragUpdate.current = now;
      }
    }
  }, [isPanning, isDrawing, isDragging, panStart, panOffset, viewport, containerSize, dragStart, dragOffset, selectedRectId, user, sessionId, notifyFirestoreActivity]);
  
  // Handle mouse up to stop panning, finish drawing, or finish dragging
  const handleMouseUp = useCallback(async () => {
    if (isPanning) {
      setIsPanning(false);
    } else if (isDrawing) {
      setIsDrawing(false);
      
      // Calculate rectangle dimensions
      const x = Math.min(drawStart.x, drawCurrent.x);
      const y = Math.min(drawStart.y, drawCurrent.y);
      const width = Math.abs(drawCurrent.x - drawStart.x);
      const height = Math.abs(drawCurrent.y - drawStart.y);
      
      // Only create if rectangle meets minimum size
      if (width >= MIN_RECTANGLE_SIZE && height >= MIN_RECTANGLE_SIZE && user) {
        try {
          const color = getRandomColor();
          await createRectangle(undefined, {
            x,
            y,
            width,
            height,
            color,
            createdBy: user.uid,
          });
          console.log('Rectangle created successfully');
          notifyFirestoreActivity(); // Notify of successful operation
        } catch (error) {
          console.error('Failed to create rectangle:', error);
        }
      }
    } else if (isDragging && selectedRectId) {
      setIsDragging(false);
      setIsDraggingLocal(false); // Tell hook we stopped dragging
      
      // Hide cursor for others (set isActive to false)
      if (user && sessionId) {
        removeCursor(undefined, sessionId).catch(console.error);
      }
      
      // Reset drag state to prevent stale offset on next drag
      setDragStart({ x: 0, y: 0 });
      setDragOffset({ x: 0, y: 0 });
      
      // Get the rectangle's current position from local state
      const rect = rectangles.find(r => r.id === selectedRectId);
      if (rect && user) {
        try {
          // Sync to Firestore
          await updateRectangle(undefined, selectedRectId, {
            x: rect.x,
            y: rect.y,
          });
          console.log('Rectangle position updated in Firestore');
          notifyFirestoreActivity(); // Notify of successful operation
        } catch (error) {
          console.error('Failed to update rectangle position:', error);
        }
      }
    }
  }, [isPanning, isDrawing, isDragging, drawStart, drawCurrent, selectedRectId, rectangles, user, sessionId, setIsDraggingLocal, notifyFirestoreActivity]);
  
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
  
  // Add global mouse event listeners for panning, drawing, and dragging
  useEffect(() => {
    if (isPanning || isDrawing || isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isPanning, isDrawing, isDragging, handleMouseMove, handleMouseUp]);
  
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
          {/* Render only visible rectangles (viewport culling for performance) */}
          {visibleRectangles.map((rect) => (
            <Rectangle
              key={rect.id}
              {...rect}
              isSelected={rect.id === selectedRectId}
              isLocked={rect.lockedBy !== null && rect.lockedBy !== user?.uid}
              lockedByUserName={rect.lockedByUserName}
              onClick={handleRectangleClick}
              onMouseDown={handleRectangleMouseDown}
              onMouseLeave={handleRectangleMouseLeave}
            />
          ))}
          
          {/* Preview rectangle while drawing */}
          {previewRect && previewRect.width >= MIN_RECTANGLE_SIZE && previewRect.height >= MIN_RECTANGLE_SIZE && (
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
              className="preview-rectangle"
              style={{ pointerEvents: 'none' }}
            />
          )}
          
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

