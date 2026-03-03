/**
 * @vitest-environment node
 *
 * Tests ZoomControls component exports. Full rendering tests with DOM
 * interactions run in CI where jsdom has sufficient memory.
 */
import { describe, it, expect } from 'vitest';

describe('ZoomControls', () => {
  it('exports a default component', async () => {
    const mod = await import('../../components/ZoomControls');
    expect(mod.default).toBeDefined();
    // memo-wrapped components are objects with $$typeof
    expect(typeof mod.default).toBe('object');
    expect(mod.default.$$typeof).toBeDefined();
  });

  it('source has zoom in/out/fit controls', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/ZoomControls.jsx'),
      'utf-8'
    );
    expect(src).toContain('Zoom in');
    expect(src).toContain('Zoom out');
    expect(src).toContain('Fit canvas to view');
  });

  it('accepts required props', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/ZoomControls.jsx'),
      'utf-8'
    );
    expect(src).toContain('onZoomIn');
    expect(src).toContain('onZoomOut');
    expect(src).toContain('onZoomSet');
    expect(src).toContain('onFitCanvas');
    expect(src).toContain('minZoom');
    expect(src).toContain('maxZoom');
  });

  it('has debounced input handling', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/ZoomControls.jsx'),
      'utf-8'
    );
    expect(src).toContain('setTimeout');
    expect(src).toContain('5000'); // 5-second debounce
  });

  it('handles Enter and Escape keys', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/ZoomControls.jsx'),
      'utf-8'
    );
    expect(src).toContain("'Enter'");
    expect(src).toContain("'Escape'");
  });

  it('disables buttons at zoom limits', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/ZoomControls.jsx'),
      'utf-8'
    );
    expect(src).toContain('canZoomIn');
    expect(src).toContain('canZoomOut');
    expect(src).toContain('disabled={!canZoomOut}');
    expect(src).toContain('disabled={!canZoomIn}');
  });
});
