/**
 * @vitest-environment node
 *
 * Tests ErrorBoundary component exports and structure.
 */
import { describe, it, expect } from 'vitest';

describe('ErrorBoundary', () => {
  it('exports a default class component', async () => {
    const mod = await import('../../components/ErrorBoundary');
    const ErrorBoundary = mod.default;
    expect(typeof ErrorBoundary).toBe('function');
    // Class components have a prototype with render
    expect(typeof ErrorBoundary.prototype.render).toBe('function');
  });

  it('implements getDerivedStateFromError', async () => {
    const { default: ErrorBoundary } = await import('../../components/ErrorBoundary');
    expect(typeof ErrorBoundary.getDerivedStateFromError).toBe('function');
    const state = ErrorBoundary.getDerivedStateFromError(new Error('test'));
    expect(state.hasError).toBe(true);
  });

  it('implements componentDidCatch', async () => {
    const { default: ErrorBoundary } = await import('../../components/ErrorBoundary');
    expect(typeof ErrorBoundary.prototype.componentDidCatch).toBe('function');
  });

  it('has handleReload and handleReset methods', async () => {
    const { default: ErrorBoundary } = await import('../../components/ErrorBoundary');
    const instance = new ErrorBoundary({});
    expect(typeof instance.handleReload).toBe('function');
    expect(typeof instance.handleReset).toBe('function');
  });

  it('handleReset clears error state', async () => {
    const { default: ErrorBoundary } = await import('../../components/ErrorBoundary');
    const instance = new ErrorBoundary({});
    instance.state = { hasError: true, error: new Error('test'), errorInfo: {} };
    instance.setState = (newState) => {
      Object.assign(instance.state, newState);
    };
    instance.handleReset();
    expect(instance.state.hasError).toBe(false);
    expect(instance.state.error).toBeNull();
    expect(instance.state.errorInfo).toBeNull();
  });
});
