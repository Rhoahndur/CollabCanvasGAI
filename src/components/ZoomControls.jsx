import { memo, useState, useEffect, useRef } from 'react';
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
  onZoomSet,
  onFitCanvas,
  minZoom,
  maxZoom,
}) {
  const zoomPercentage = Math.round(zoom * 100);
  const [inputValue, setInputValue] = useState(String(zoomPercentage));
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef(null);
  const updateTimerRef = useRef(null);
  
  // Update input when zoom changes externally (but not while editing)
  useEffect(() => {
    if (!isEditing) {
      setInputValue(String(Math.round(zoom * 100)));
    }
  }, [zoom, isEditing]);
  
  // Handle input change with debounced update
  const handleInputChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, ''); // Only allow digits
    setInputValue(value);
    
    // Clear existing timer
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }
    
    // Set new timer for 5 second debounce
    updateTimerRef.current = setTimeout(() => {
      applyZoomValue(value);
    }, 5000);
  };
  
  // Apply zoom value
  const applyZoomValue = (value) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      const newZoom = Math.max(minZoom * 100, Math.min(maxZoom * 100, numValue)) / 100;
      if (onZoomSet) {
        onZoomSet(newZoom);
      }
      setInputValue(String(Math.round(newZoom * 100)));
    } else {
      // Reset to current zoom if invalid
      setInputValue(String(Math.round(zoom * 100)));
    }
    setIsEditing(false);
  };
  
  // Handle input blur
  const handleInputBlur = () => {
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }
    applyZoomValue(inputValue);
  };
  
  // Handle input focus
  const handleInputFocus = () => {
    setIsEditing(true);
    // Select all text for easy editing
    if (inputRef.current) {
      inputRef.current.select();
    }
  };
  
  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
      applyZoomValue(inputValue);
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setInputValue(String(Math.round(zoom * 100)));
      setIsEditing(false);
      inputRef.current?.blur();
    }
  };
  
  // Handle fit canvas button click
  const handleFitCanvas = () => {
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }
    if (onFitCanvas) {
      onFitCanvas();
    }
    setIsEditing(false);
  };
  
  const canZoomIn = zoom < maxZoom;
  const canZoomOut = zoom > minZoom;

  return (
    <div className="zoom-controls">
      <div className="zoom-controls-main">
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
        
        <div className="zoom-input-container">
          <input
            ref={inputRef}
            type="text"
            className="zoom-input"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            title="Click to edit zoom percentage"
            aria-label="Zoom percentage"
          />
          <span className="zoom-percent-sign">%</span>
        </div>
        
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
      
      {/* Fit Canvas button */}
      <button
        className="zoom-btn zoom-fit"
        onClick={handleFitCanvas}
        title="Fit entire canvas in view"
        aria-label="Fit canvas to view"
      >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
});

export default ZoomControls;

