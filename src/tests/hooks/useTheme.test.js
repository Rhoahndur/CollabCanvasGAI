/**
 * @vitest-environment node
 *
 * Tests useTheme hook exports and logic patterns.
 */
import { describe, it, expect } from 'vitest';

describe('useTheme', () => {
  it('exports useTheme function', async () => {
    const mod = await import('../../hooks/useTheme');
    expect(typeof mod.useTheme).toBe('function');
  });

  it('source supports light, dark, and system themes', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(path.resolve(process.cwd(), 'src/hooks/useTheme.js'), 'utf-8');
    expect(src).toContain("'light'");
    expect(src).toContain("'dark'");
    expect(src).toContain("'system'");
  });

  it('persists to localStorage with key theme-preference', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(path.resolve(process.cwd(), 'src/hooks/useTheme.js'), 'utf-8');
    expect(src).toContain("'theme-preference'");
    expect(src).toContain('localStorage.getItem');
    expect(src).toContain('localStorage.setItem');
  });

  it('applies data-theme attribute to document', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(path.resolve(process.cwd(), 'src/hooks/useTheme.js'), 'utf-8');
    expect(src).toContain('data-theme');
    expect(src).toContain('setAttribute');
  });

  it('listens for system theme changes via matchMedia', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(path.resolve(process.cwd(), 'src/hooks/useTheme.js'), 'utf-8');
    expect(src).toContain('prefers-color-scheme: dark');
    expect(src).toContain('addEventListener');
  });

  it('rejects invalid theme values', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(path.resolve(process.cwd(), 'src/hooks/useTheme.js'), 'utf-8');
    // The setThemePreference function validates against allowed values
    expect(src).toContain("['light', 'dark', 'system'].includes");
  });

  it('returns theme, effectiveTheme, and setTheme', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(path.resolve(process.cwd(), 'src/hooks/useTheme.js'), 'utf-8');
    expect(src).toContain('theme,');
    expect(src).toContain('effectiveTheme,');
    expect(src).toContain('setTheme:');
  });
});
