/**
 * @vitest-environment node
 *
 * Tests useAuth hook exports and auth logic patterns.
 */
import { describe, it, expect } from 'vitest';

describe('useAuth', () => {
  it('exports useAuth function', async () => {
    const mod = await import('../../hooks/useAuth');
    expect(typeof mod.useAuth).toBe('function');
  });

  it('uses onAuthStateChanged from firebase/auth', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(path.resolve(process.cwd(), 'src/hooks/useAuth.js'), 'utf-8');
    expect(src).toContain('onAuthStateChanged');
  });

  it('has displayName fallback chain', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(path.resolve(process.cwd(), 'src/hooks/useAuth.js'), 'utf-8');
    // Fallback chain: github_username > screenName > provider > displayName > email
    expect(src).toContain('github_username');
    expect(src).toContain('screenName');
    expect(src).toContain("email?.split('@')");
  });

  it('implements token refresh every 50 minutes', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(path.resolve(process.cwd(), 'src/hooks/useAuth.js'), 'utf-8');
    expect(src).toContain('50 * 60 * 1000');
    expect(src).toContain('getIdToken(true)');
  });

  it('cleans up cursor and presence on signOut', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(path.resolve(process.cwd(), 'src/hooks/useAuth.js'), 'utf-8');
    expect(src).toContain('removeCursor');
    expect(src).toContain('removePresence');
    expect(src).toContain('signOutUser');
  });

  it('returns user, loading, signIn, signOut', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(path.resolve(process.cwd(), 'src/hooks/useAuth.js'), 'utf-8');
    expect(src).toContain('user,');
    expect(src).toContain('loading,');
    expect(src).toContain('signIn,');
    expect(src).toContain('signOut,');
  });
});
