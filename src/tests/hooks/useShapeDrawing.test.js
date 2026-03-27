/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShapeDrawing } from '../../hooks/useShapeDrawing';

describe('useShapeDrawing', () => {
  it('initializes with defaults', () => {
    const { result } = renderHook(() => useShapeDrawing());
    expect(result.current.isDrawing).toBe(false);
    expect(result.current.drawStart).toEqual({ x: 0, y: 0 });
    expect(result.current.drawCurrent).toEqual({ x: 0, y: 0 });
    expect(result.current.previewRect).toBeNull();
  });

  it('computes previewRect when drawing', () => {
    const { result } = renderHook(() => useShapeDrawing());
    act(() => {
      result.current.setIsDrawing(true);
      result.current.setDrawStart({ x: 100, y: 100 });
      result.current.setDrawCurrent({ x: 200, y: 250 });
    });
    expect(result.current.previewRect).toEqual({
      x: 100,
      y: 100,
      width: 100,
      height: 150,
    });
  });

  it('normalizes coordinates for right-to-left drawing', () => {
    const { result } = renderHook(() => useShapeDrawing());
    act(() => {
      result.current.setIsDrawing(true);
      result.current.setDrawStart({ x: 300, y: 400 });
      result.current.setDrawCurrent({ x: 100, y: 200 });
    });
    expect(result.current.previewRect).toEqual({
      x: 100,
      y: 200,
      width: 200,
      height: 200,
    });
  });

  it('updates previewRect as drawCurrent changes', () => {
    const { result } = renderHook(() => useShapeDrawing());
    act(() => {
      result.current.setIsDrawing(true);
      result.current.setDrawStart({ x: 0, y: 0 });
      result.current.setDrawCurrent({ x: 50, y: 50 });
    });
    expect(result.current.previewRect.width).toBe(50);
    act(() => result.current.setDrawCurrent({ x: 100, y: 75 }));
    expect(result.current.previewRect).toEqual({ x: 0, y: 0, width: 100, height: 75 });
  });

  it('returns null previewRect when drawing stops', () => {
    const { result } = renderHook(() => useShapeDrawing());
    act(() => {
      result.current.setIsDrawing(true);
      result.current.setDrawStart({ x: 10, y: 10 });
      result.current.setDrawCurrent({ x: 50, y: 50 });
    });
    expect(result.current.previewRect).not.toBeNull();
    act(() => result.current.setIsDrawing(false));
    expect(result.current.previewRect).toBeNull();
  });

  it('handles zero-size drawing', () => {
    const { result } = renderHook(() => useShapeDrawing());
    act(() => {
      result.current.setIsDrawing(true);
      result.current.setDrawStart({ x: 100, y: 100 });
      result.current.setDrawCurrent({ x: 100, y: 100 });
    });
    expect(result.current.previewRect).toEqual({ x: 100, y: 100, width: 0, height: 0 });
  });

  it('exposes all state setters', () => {
    const { result } = renderHook(() => useShapeDrawing());
    expect(typeof result.current.setIsDrawing).toBe('function');
    expect(typeof result.current.setDrawStart).toBe('function');
    expect(typeof result.current.setDrawCurrent).toBe('function');
  });
});
