/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from '../../hooks/useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to light theme when no saved preference', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
    expect(result.current.effectiveTheme).toBe('light');
  });

  it('reads saved preference from localStorage', () => {
    localStorage.setItem('theme-preference', 'dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    expect(result.current.effectiveTheme).toBe('dark');
  });

  it('switches theme and persists to localStorage', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
    expect(result.current.effectiveTheme).toBe('dark');
    expect(localStorage.getItem('theme-preference')).toBe('dark');
  });

  it('applies data-theme attribute to document', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('dark');
    });

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('resolves system theme using matchMedia', () => {
    // matchMedia is mocked to return matches: false (light) in setup.js
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('system');
    });

    expect(result.current.theme).toBe('system');
    // matchMedia mock returns matches: false → light
    expect(result.current.effectiveTheme).toBe('light');
  });

  it('rejects invalid theme values', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('invalid-value');
    });

    // Should remain on the default
    expect(result.current.theme).toBe('light');
  });

  it('returns theme, effectiveTheme, and setTheme', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current).toHaveProperty('theme');
    expect(result.current).toHaveProperty('effectiveTheme');
    expect(typeof result.current.setTheme).toBe('function');
  });
});
