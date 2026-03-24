/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '../../hooks/useAuth';

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('starts in loading state with no user', () => {
    // Keep the default mock (calls cb(null) immediately)
    const { result } = renderHook(() => useAuth());
    // After the sync callback fires, loading should be false and user null
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('sets user when auth state changes to signed-in user', async () => {
    const mockUser = {
      uid: 'u1',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: 'https://example.com/photo.jpg',
      providerData: [],
      reloadUserInfo: {},
    };

    onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(mockUser);
      return vi.fn();
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual({
      uid: 'u1',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: 'https://example.com/photo.jpg',
    });
  });

  it('uses displayName fallback chain (email prefix)', async () => {
    const mockUser = {
      uid: 'u2',
      email: 'jane@gmail.com',
      displayName: null,
      photoURL: null,
      providerData: [],
      reloadUserInfo: {},
    };

    onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(mockUser);
      return vi.fn();
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.user).not.toBeNull();
    });

    expect(result.current.user.displayName).toBe('jane');
  });

  it('sets user to null on sign out', async () => {
    onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(null);
      return vi.fn();
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
  });

  it('rejects user with no valid displayName', async () => {
    const mockUser = {
      uid: 'u3',
      email: null,
      displayName: null,
      photoURL: null,
      providerData: [],
      reloadUserInfo: {},
    };

    onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(mockUser);
      return vi.fn();
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // No valid displayName available → user should be null
    expect(result.current.user).toBeNull();
  });

  it('returns user, loading, signIn, signOut', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current).toHaveProperty('user');
    expect(result.current).toHaveProperty('loading');
    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.signOut).toBe('function');
  });
});
