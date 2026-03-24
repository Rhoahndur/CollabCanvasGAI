/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewport } from '../../hooks/useViewport';

function createRefs() {
  const svgRef = {
    current: {
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  };
  const containerRef = {
    current: {
      getBoundingClientRect: () => ({ width: 800, height: 600 }),
    },
  };
  return { svgRef, containerRef };
}

describe('useViewport', () => {
  it('initializes with default viewport', () => {
    const { svgRef, containerRef } = createRefs();
    const { result } = renderHook(() => useViewport(svgRef, containerRef));
    expect(result.current.viewport.zoom).toBe(1);
    expect(result.current.viewport.offsetX).toBe(0);
    expect(result.current.viewport.offsetY).toBe(0);
  });

  it('provides all expected controls', () => {
    const { svgRef, containerRef } = createRefs();
    const { result } = renderHook(() => useViewport(svgRef, containerRef));
    expect(typeof result.current.handleZoomIn).toBe('function');
    expect(typeof result.current.handleZoomOut).toBe('function');
    expect(typeof result.current.handleZoomReset).toBe('function');
    expect(typeof result.current.handleZoomSet).toBe('function');
    expect(typeof result.current.handleFitCanvas).toBe('function');
  });

  it('resets zoom to defaults', () => {
    const { svgRef, containerRef } = createRefs();
    const { result } = renderHook(() => useViewport(svgRef, containerRef));
    act(() => result.current.handleZoomIn());
    act(() => result.current.handleZoomReset());
    expect(result.current.viewport.zoom).toBe(1);
    expect(result.current.viewport.offsetX).toBe(0);
    expect(result.current.viewport.offsetY).toBe(0);
  });

  it('zooms in increases zoom level', () => {
    const { svgRef, containerRef } = createRefs();
    const { result } = renderHook(() => useViewport(svgRef, containerRef));
    act(() => result.current.handleZoomIn());
    expect(result.current.viewport.zoom).toBeGreaterThan(1);
  });

  it('zooms out decreases zoom level', () => {
    const { svgRef, containerRef } = createRefs();
    const { result } = renderHook(() => useViewport(svgRef, containerRef));
    act(() => result.current.handleZoomIn());
    const zoomedIn = result.current.viewport.zoom;
    act(() => result.current.handleZoomOut());
    expect(result.current.viewport.zoom).toBeLessThan(zoomedIn);
  });

  it('computes viewBox string with 4 parts', () => {
    const { svgRef, containerRef } = createRefs();
    const { result } = renderHook(() => useViewport(svgRef, containerRef));
    const parts = result.current.viewBox.split(' ');
    expect(parts).toHaveLength(4);
    parts.forEach((p) => expect(Number(p)).not.toBeNaN());
  });

  it('isPanning defaults to false', () => {
    const { svgRef, containerRef } = createRefs();
    const { result } = renderHook(() => useViewport(svgRef, containerRef));
    expect(result.current.isPanning).toBe(false);
  });

  it('handleZoomSet sets specific zoom level', () => {
    const { svgRef, containerRef } = createRefs();
    const { result } = renderHook(() => useViewport(svgRef, containerRef));
    act(() => result.current.handleZoomSet(2.0));
    expect(result.current.viewport.zoom).toBe(2.0);
  });

  it('attaches wheel event listener to SVG element', () => {
    const { svgRef, containerRef } = createRefs();
    renderHook(() => useViewport(svgRef, containerRef));
    expect(svgRef.current.addEventListener).toHaveBeenCalledWith('wheel', expect.any(Function), {
      passive: false,
    });
  });
});
