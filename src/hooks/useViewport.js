import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_SENSITIVITY,
  DEFAULT_ZOOM,
  PAN_PADDING_PERCENT,
} from '../utils/constants';
import { screenToCanvas, clampPanOffset, clamp } from '../utils/canvasUtils';

/**
 * useViewport — Manages viewport state (pan, zoom), wheel events, and container sizing.
 */
export function useViewport(svgRef, containerRef) {
  const [viewport, setViewport] = useState({
    offsetX: 0,
    offsetY: 0,
    zoom: DEFAULT_ZOOM,
  });

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
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
  }, [containerRef]);

  // Handle mouse wheel for zooming
  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();
      if (!svgRef.current) return;

      const rect = svgRef.current.getBoundingClientRect();
      const mouseBeforeZoom = screenToCanvas(e.clientX, e.clientY, viewport, rect);
      const zoomDelta = -e.deltaY * ZOOM_SENSITIVITY;
      const newZoom = clamp(viewport.zoom * (1 + zoomDelta), MIN_ZOOM, MAX_ZOOM);

      const mouseAfterZoom = {
        x: (e.clientX - rect.left) / newZoom,
        y: (e.clientY - rect.top) / newZoom,
      };

      const newOffsetX =
        viewport.offsetX + (mouseBeforeZoom.x - mouseAfterZoom.x - viewport.offsetX);
      const newOffsetY =
        viewport.offsetY + (mouseBeforeZoom.y - mouseAfterZoom.y - viewport.offsetY);

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

      setViewport({ offsetX: clamped.offsetX, offsetY: clamped.offsetY, zoom: newZoom });
    },
    [viewport, containerSize, svgRef]
  );

  // Attach wheel event listener with passive: false
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [handleWheel, svgRef]);

  // Helper for zoom-from-center logic
  const zoomFromCenter = useCallback(
    (factor) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const centerBefore = screenToCanvas(centerX, centerY, viewport, rect);
      const newZoom = clamp(viewport.zoom * factor, MIN_ZOOM, MAX_ZOOM);
      const centerAfter = {
        x: (centerX - rect.left) / newZoom,
        y: (centerY - rect.top) / newZoom,
      };
      const newOffsetX = viewport.offsetX + (centerBefore.x - centerAfter.x - viewport.offsetX);
      const newOffsetY = viewport.offsetY + (centerBefore.y - centerAfter.y - viewport.offsetY);
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
      setViewport({ offsetX: clamped.offsetX, offsetY: clamped.offsetY, zoom: newZoom });
    },
    [viewport, containerSize, svgRef]
  );

  const handleZoomIn = useCallback(() => zoomFromCenter(1.2), [zoomFromCenter]);
  const handleZoomOut = useCallback(() => zoomFromCenter(1 / 1.2), [zoomFromCenter]);

  const handleZoomReset = useCallback(() => {
    setViewport({ zoom: DEFAULT_ZOOM, offsetX: 0, offsetY: 0 });
  }, []);

  const handleZoomSet = useCallback(
    (newZoom) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const centerBefore = screenToCanvas(centerX, centerY, viewport, rect);
      const clampedZoom = clamp(newZoom, MIN_ZOOM, MAX_ZOOM);
      const centerAfter = {
        x: (centerX - rect.left) / clampedZoom,
        y: (centerY - rect.top) / clampedZoom,
      };
      const newOffsetX = viewport.offsetX + (centerBefore.x - centerAfter.x);
      const newOffsetY = viewport.offsetY + (centerBefore.y - centerAfter.y);
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
      setViewport({ zoom: clampedZoom, offsetX: clamped.offsetX, offsetY: clamped.offsetY });
    },
    [viewport, containerSize, svgRef]
  );

  const handleFitCanvas = useCallback(() => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const padding = 0.9;
    const zoomX = (rect.width * padding) / CANVAS_WIDTH;
    const zoomY = (rect.height * padding) / CANVAS_HEIGHT;
    const fitZoom = Math.min(zoomX, zoomY, MAX_ZOOM);
    const newOffsetX = (CANVAS_WIDTH - rect.width / fitZoom) / 2;
    const newOffsetY = (CANVAS_HEIGHT - rect.height / fitZoom) / 2;
    setViewport({ zoom: fitZoom, offsetX: newOffsetX, offsetY: newOffsetY });
  }, [svgRef]);

  // Calculate viewBox for SVG
  const viewBox = useMemo(
    () =>
      `${viewport.offsetX} ${viewport.offsetY} ${containerSize.width / viewport.zoom} ${containerSize.height / viewport.zoom}`,
    [viewport.offsetX, viewport.offsetY, viewport.zoom, containerSize.width, containerSize.height]
  );

  return {
    viewport,
    setViewport,
    isPanning,
    setIsPanning,
    panStart,
    setPanStart,
    panOffset,
    setPanOffset,
    containerSize,
    viewBox,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleZoomSet,
    handleFitCanvas,
  };
}
