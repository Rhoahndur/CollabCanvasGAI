import { memo } from 'react';
import './ZoomControls.css';

/**
 * ZoomControls component - Provides zoom in/out buttons and zoom level display
 * Alternative to mousewheel zoom for browsers with gesture conflicts (like Safari)
 */
const ZoomControls = memo(function ZoomControls({ 
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  minZoom,
  maxZoom,
}) {
  const zoomPercentage = Math.round(zoom * 100);
  const canZoomIn = zoom < maxZoom;
  const canZoomOut = zoom > minZoom;

  return (
    <div className="zoom-controls">
      <button
        className="zoom-btn zoom-out"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        title="Zoom Out (Ctrl + -)"
        aria-label="Zoom out"
      >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      
      <button
        className="zoom-reset"
        onClick={onZoomReset}
        title="Reset Zoom (Ctrl + 0)"
        aria-label={`Reset zoom to 100%. Current: ${zoomPercentage}%`}
      >
        {zoomPercentage}%
      </button>
      
      <button
        className="zoom-btn zoom-in"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        title="Zoom In (Ctrl + +)"
        aria-label="Zoom in"
      >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
});

export default ZoomControls;

