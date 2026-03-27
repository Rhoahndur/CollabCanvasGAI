import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get, set } from 'firebase/database';
import { autoMigrate } from '../../services/canvasMigration';

vi.mock('../../utils/errorHandler', () => ({
  reportError: vi.fn(),
}));

// Helper: queue sequential get() return values
function mockGetSequence(...snapshots) {
  snapshots.forEach((snap) => {
    get.mockResolvedValueOnce(snap);
  });
}

function snap(exists, val = null) {
  return { exists: () => exists, val: () => val };
}

describe('canvasMigration — autoMigrate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips migration when user already has canvas list', async () => {
    // needsMigration: userCanvases exists → false
    mockGetSequence(snap(true, { 'main-canvas': {} }));

    await autoMigrate('user1', 'Test User');

    expect(get).toHaveBeenCalledTimes(1);
    expect(set).not.toHaveBeenCalled();
  });

  it('skips migration when no default canvas objects exist', async () => {
    // needsMigration: no userCanvases, no default objects → false
    mockGetSequence(snap(false), snap(false));

    await autoMigrate('user1', 'Test User');

    expect(set).not.toHaveBeenCalled();
  });

  it('creates user entry for empty default canvas', async () => {
    // autoMigrate → needsMigration: needs migration
    mockGetSequence(snap(false), snap(true));
    // migrateToMultiCanvas → needsMigration: needs migration
    mockGetSequence(snap(false), snap(true));
    // migrateToMultiCanvas → get old canvas: empty
    mockGetSequence(snap(false));

    await autoMigrate('user1', 'Test User');

    expect(set).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: 'My First Canvas', role: 'owner' })
    );
  });

  it('performs full migration with metadata + permissions for canvas owner', async () => {
    const canvasData = {
      objects: {
        shape1: { createdBy: 'user1' },
        shape2: { createdBy: 'user1' },
      },
    };

    // autoMigrate → needsMigration
    mockGetSequence(snap(false), snap(true));
    // migrateToMultiCanvas → needsMigration
    mockGetSequence(snap(false), snap(true));
    // migrateToMultiCanvas → old canvas data
    mockGetSequence(snap(true, canvasData));

    await autoMigrate('user1', 'Test User');

    // metadata + permissions + userCanvases = 3 set calls
    expect(set).toHaveBeenCalledTimes(3);
    // Verify metadata was written
    expect(set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: 'My First Canvas', createdBy: 'user1' })
    );
    // Verify owner permission
    expect(set).toHaveBeenCalledWith(expect.anything(), 'owner');
  });

  it('assigns viewer role when current user differs from original owner', async () => {
    const canvasData = {
      objects: {
        shape1: { createdBy: 'original-owner' },
        shape2: { createdBy: 'original-owner' },
        shape3: { createdBy: 'user2' },
      },
    };

    // autoMigrate → needsMigration
    mockGetSequence(snap(false), snap(true));
    // migrateToMultiCanvas → needsMigration
    mockGetSequence(snap(false), snap(true));
    // migrateToMultiCanvas → old canvas data
    mockGetSequence(snap(true, canvasData));

    await autoMigrate('user2', 'User Two');

    // metadata + owner permission + owner canvas list + viewer permission + viewer canvas list = 5
    expect(set).toHaveBeenCalledTimes(5);
    // Current user gets viewer role
    expect(set).toHaveBeenCalledWith(expect.anything(), 'viewer');
    expect(set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ role: 'viewer' })
    );
  });

  it('handles existing metadata (partial migration)', async () => {
    const canvasData = {
      metadata: { name: 'Old Canvas' },
      objects: {},
    };

    // autoMigrate → needsMigration
    mockGetSequence(snap(false), snap(true));
    // migrateToMultiCanvas → needsMigration
    mockGetSequence(snap(false), snap(true));
    // migrateToMultiCanvas → old canvas data with metadata
    mockGetSequence(snap(true, canvasData));

    await autoMigrate('user1', 'Test User');

    // Should add user canvas entry + possibly set permissions = 2 calls
    expect(set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: 'Old Canvas', role: 'owner' })
    );
  });

  it('determines original owner by most-created objects', async () => {
    const canvasData = {
      objects: {
        s1: { createdBy: 'alice' },
        s2: { createdBy: 'alice' },
        s3: { createdBy: 'alice' },
        s4: { createdBy: 'bob' },
      },
    };

    // autoMigrate → needsMigration
    mockGetSequence(snap(false), snap(true));
    // migrateToMultiCanvas → needsMigration
    mockGetSequence(snap(false), snap(true));
    // migrateToMultiCanvas → old canvas data
    mockGetSequence(snap(true, canvasData));

    await autoMigrate('bob', 'Bob');

    // Alice should be owner (most objects)
    expect(set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ createdBy: 'alice' })
    );
  });

  it('swallows errors without throwing', async () => {
    get.mockRejectedValueOnce(new Error('Firebase down'));

    await expect(autoMigrate('user1', 'Test User')).resolves.toBeUndefined();
  });

  it('reports errors via reportError', async () => {
    const { reportError } = await import('../../utils/errorHandler');
    get.mockRejectedValueOnce(new Error('Network error'));

    await autoMigrate('user1', 'Test User');

    expect(reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ component: 'canvasMigration' })
    );
  });
});
