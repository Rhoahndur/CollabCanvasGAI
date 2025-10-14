import { useState, useRef, useEffect, useCallback } from 'react';
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
} from '../utils/constants';
import {
  screenToCanvas,
  clampPanOffset,
  clamp,
  calculateFPS,
} from '../utils/canvasUtils';
import './Canvas.css';

/**
 * Canvas component - SVG-based collaborative canvas with pan and zoom
 */
function Canvas() {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  
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
  
  // FPS monitoring
  const [fps, setFps] = useState(0);
  const frameTimesRef = useRef([]);
  const lastFpsUpdateRef = useRef(Date.now());
  
  // Container dimensions
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
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
  
  // FPS monitoring
  useEffect(() => {
    if (!SHOW_FPS_COUNTER) return;
    
    let animationFrameId;
    
    const updateFps = (timestamp) => {
      frameTimesRef.current.push(timestamp);
      
      // Keep only last second of frame times
      const oneSecondAgo = timestamp - 1000;
      frameTimesRef.current = frameTimesRef.current.filter(t => t > oneSecondAgo);
      
      // Update FPS display periodically
      if (timestamp - lastFpsUpdateRef.current > FPS_UPDATE_INTERVAL) {
        setFps(calculateFPS(frameTimesRef.current));
        lastFpsUpdateRef.current = timestamp;
      }
      
      animationFrameId = requestAnimationFrame(updateFps);
    };
    
    animationFrameId = requestAnimationFrame(updateFps);
    
    return () => cancelAnimationFrame(animationFrameId);
  }, []);
  
  // Handle mouse down for panning
  const handleMouseDown = useCallback((e) => {
    // Only pan with left mouse button
    if (e.button !== 0) return;
    
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    setPanOffset({ x: viewport.offsetX, y: viewport.offsetY });
    
    // Prevent text selection while dragging
    e.preventDefault();
  }, [viewport.offsetX, viewport.offsetY]);
  
  // Handle mouse move for panning
  const handleMouseMove = useCallback((e) => {
    if (!isPanning) return;
    
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
  }, [isPanning, panStart, panOffset, viewport.zoom, containerSize]);
  
  // Handle mouse up to stop panning
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);
  
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
  
  // Add global mouse event listeners for panning
  useEffect(() => {
    if (isPanning) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isPanning, handleMouseMove, handleMouseUp]);
  
  // Calculate viewBox for SVG
  const viewBox = `${viewport.offsetX} ${viewport.offsetY} ${containerSize.width / viewport.zoom} ${containerSize.height / viewport.zoom}`;
  
  // Generate grid lines
  const renderGrid = () => {
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
  };
  
  return (
    <div className="canvas-container" ref={containerRef}>
      <svg
        ref={svgRef}
        className="canvas-svg"
        viewBox={viewBox}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
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
          {renderGrid()}
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
        
        {/* Canvas content will go here */}
        <g className="canvas-content">
          {/* Rectangles, cursors, etc. will be rendered here */}
        </g>
      </svg>
      
      {/* FPS Counter */}
      {SHOW_FPS_COUNTER && (
        <div className="fps-counter">
          <div className="fps-value">{fps} FPS</div>
          <div className="fps-zoom">Zoom: {(viewport.zoom * 100).toFixed(0)}%</div>
          <div className="fps-pos">
            Pos: ({Math.round(viewport.offsetX)}, {Math.round(viewport.offsetY)})
          </div>
        </div>
      )}
      
      {/* Canvas info overlay */}
      <div className="canvas-info">
        <p>🎨 Canvas ready! Pan with mouse drag, zoom with scroll wheel.</p>
        <p className="canvas-size">Canvas: {CANVAS_WIDTH} × {CANVAS_HEIGHT}px</p>
      </div>
    </div>
  );
}

export default Canvas;

