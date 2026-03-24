// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('reportError', () => {
  let spy;

  beforeEach(() => {
    vi.resetModules();
    spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    spy.mockRestore();
  });

  it('exports reportError function', async () => {
    const { reportError } = await import('../../utils/errorHandler');
    expect(typeof reportError).toBe('function');
  });

  it('logs structured error with component > action prefix', async () => {
    const { reportError } = await import('../../utils/errorHandler');
    reportError(new Error('test'), { component: 'Canvas', action: 'draw' });
    expect(spy).toHaveBeenCalledWith('[Canvas > draw]', 'test', {});
  });

  it('handles string errors by wrapping in Error', async () => {
    const { reportError } = await import('../../utils/errorHandler');
    reportError('string error');
    expect(spy.mock.calls[0][1]).toBe('string error');
  });

  it('uses [app] prefix when no context given', async () => {
    const { reportError } = await import('../../utils/errorHandler');
    reportError(new Error('fail'));
    expect(spy.mock.calls[0][0]).toBe('[app]');
  });

  it('passes extra context fields through', async () => {
    const { reportError } = await import('../../utils/errorHandler');
    reportError(new Error('fail'), { component: 'X', canvasId: 'c1', userId: 'u1' });
    expect(spy.mock.calls[0][2]).toEqual({ canvasId: 'c1', userId: 'u1' });
  });

  it('uses component-only prefix when action is missing', async () => {
    const { reportError } = await import('../../utils/errorHandler');
    reportError(new Error('fail'), { component: 'Canvas' });
    expect(spy.mock.calls[0][0]).toBe('[Canvas]');
  });

  it('uses action-only prefix when component is missing', async () => {
    const { reportError } = await import('../../utils/errorHandler');
    reportError(new Error('fail'), { action: 'save' });
    expect(spy.mock.calls[0][0]).toBe('[save]');
  });
});
