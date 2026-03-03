import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, onValue, update, get } from 'firebase/database';
import {
  startLockCleanup,
  forceUnlockObject,
  unlockAllByUser,
} from '../../services/lockCleanupService';

describe('lockCleanupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('startLockCleanup', () => {
    it('returns a no-op function for null canvasId', () => {
      const cleanup = startLockCleanup(null);
      expect(typeof cleanup).toBe('function');
      expect(onValue).not.toHaveBeenCalled();
    });

    it('subscribes to presence and sets up cleanup interval', () => {
      const cleanup = startLockCleanup('canvas1');
      expect(onValue).toHaveBeenCalled();
      expect(typeof cleanup).toBe('function');
    });

    it('cleanup function stops monitoring', () => {
      const cleanup = startLockCleanup('canvas1');
      cleanup();
      // Should not throw
    });
  });

  describe('forceUnlockObject', () => {
    it('calls update to null out lock fields', async () => {
      await forceUnlockObject('canvas1', 'obj1');
      expect(ref).toHaveBeenCalled();
      expect(update).toHaveBeenCalledWith(expect.anything(), {
        lockedBy: null,
        lockedByUserName: null,
      });
    });
  });

  describe('unlockAllByUser', () => {
    it('does nothing when no objects exist', async () => {
      get.mockResolvedValueOnce({ exists: () => false, val: () => null });
      await unlockAllByUser('canvas1', 'user1');
      expect(update).not.toHaveBeenCalled();
    });

    it('unlocks objects locked by the given user', async () => {
      get.mockResolvedValueOnce({
        exists: () => true,
        val: () => ({
          obj1: { lockedBy: 'user1', lockedByUserName: 'User 1' },
          obj2: { lockedBy: 'user2', lockedByUserName: 'User 2' },
          obj3: { lockedBy: 'user1', lockedByUserName: 'User 1' },
        }),
      });

      await unlockAllByUser('canvas1', 'user1');
      expect(update).toHaveBeenCalledWith(expect.anything(), {
        'obj1/lockedBy': null,
        'obj1/lockedByUserName': null,
        'obj3/lockedBy': null,
        'obj3/lockedByUserName': null,
      });
    });
  });
});
