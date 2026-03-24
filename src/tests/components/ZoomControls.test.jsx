/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ZoomControls from '../../components/ZoomControls';

const defaultProps = {
  zoom: 1,
  onZoomIn: vi.fn(),
  onZoomOut: vi.fn(),
  onZoomReset: vi.fn(),
  onZoomSet: vi.fn(),
  onFitCanvas: vi.fn(),
  minZoom: 0.1,
  maxZoom: 5,
};

function renderZoom(overrides = {}) {
  const props = { ...defaultProps, ...overrides };
  // Reset all mocks before each render
  Object.values(props).forEach((v) => {
    if (typeof v === 'function' && v.mockClear) v.mockClear();
  });
  return render(<ZoomControls {...props} />);
}

describe('ZoomControls', () => {
  it('displays zoom percentage', () => {
    renderZoom({ zoom: 0.75 });
    const input = screen.getByRole('textbox', { name: /zoom percentage/i });
    expect(input.value).toBe('75');
  });

  it('calls onZoomIn when zoom-in button is clicked', () => {
    const onZoomIn = vi.fn();
    renderZoom({ onZoomIn });
    fireEvent.click(screen.getByRole('button', { name: /zoom in/i }));
    expect(onZoomIn).toHaveBeenCalledOnce();
  });

  it('calls onZoomOut when zoom-out button is clicked', () => {
    const onZoomOut = vi.fn();
    renderZoom({ onZoomOut });
    fireEvent.click(screen.getByRole('button', { name: /zoom out/i }));
    expect(onZoomOut).toHaveBeenCalledOnce();
  });

  it('disables zoom-in at maxZoom', () => {
    renderZoom({ zoom: 5, maxZoom: 5 });
    const btn = screen.getByRole('button', { name: /zoom in/i });
    expect(btn.disabled).toBe(true);
  });

  it('disables zoom-out at minZoom', () => {
    renderZoom({ zoom: 0.1, minZoom: 0.1 });
    const btn = screen.getByRole('button', { name: /zoom out/i });
    expect(btn.disabled).toBe(true);
  });

  it('applies zoom on Enter key in input', () => {
    const onZoomSet = vi.fn();
    renderZoom({ onZoomSet, zoom: 1 });

    const input = screen.getByRole('textbox', { name: /zoom percentage/i });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '150' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onZoomSet).toHaveBeenCalledWith(1.5);
  });

  it('reverts input on Escape key', () => {
    renderZoom({ zoom: 1 });
    const input = screen.getByRole('textbox', { name: /zoom percentage/i });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '200' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(input.value).toBe('100');
  });

  it('calls onFitCanvas when fit button is clicked', () => {
    const onFitCanvas = vi.fn();
    renderZoom({ onFitCanvas });
    fireEvent.click(screen.getByRole('button', { name: /fit canvas/i }));
    expect(onFitCanvas).toHaveBeenCalledOnce();
  });
});
