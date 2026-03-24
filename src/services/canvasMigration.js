/**
 * Canvas Migration Service
 * Migrates existing single-canvas data to multi-canvas structure
 */

import { ref, get, set, remove } from 'firebase/database';
import { realtimeDb } from './firebase';
import { DEFAULT_CANVAS_ID } from '../utils/constants';
import { reportError } from '../utils/errorHandler';

/**
 * Check if user needs migration
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if migration needed
 */
const needsMigration = async (userId) => {
  try {
    // Check if user already has canvas list
    const userCanvasesRef = ref(realtimeDb, `userCanvases/${userId}`);
    const userCanvasesSnapshot = await get(userCanvasesRef);

    if (userCanvasesSnapshot.exists()) {
      // User already migrated
      return false;
    }

    // Check if default canvas has any data
    const defaultCanvasRef = ref(realtimeDb, `canvases/${DEFAULT_CANVAS_ID}/objects`);
    const defaultCanvasSnapshot = await get(defaultCanvasRef);

    // Migration needed if default canvas has objects
    return defaultCanvasSnapshot.exists();
  } catch (error) {
    reportError(error, { component: 'canvasMigration', action: 'needsMigration' });
    return false;
  }
};

/**
 * Migrate existing canvas data to multi-canvas structure
 * @param {string} userId - User ID
 * @param {string} userName - User display name
 * @param {Object} user - Full user object with providerData
 * @returns {Promise<boolean>} True if migration successful
 */
const migrateToMultiCanvas = async (userId, userName, user = null) => {
  try {
    // Check if migration needed
    const shouldMigrate = await needsMigration(userId);
    if (!shouldMigrate) {
      return true;
    }

    const now = Date.now();
    const oldCanvasRef = ref(realtimeDb, `canvases/${DEFAULT_CANVAS_ID}`);
    const oldCanvasSnapshot = await get(oldCanvasRef);

    if (!oldCanvasSnapshot.exists()) {
      // Create empty user canvas list
      await set(ref(realtimeDb, `userCanvases/${userId}/${DEFAULT_CANVAS_ID}`), {
        name: 'My First Canvas',
        role: 'owner',
        lastAccessed: now,
        starred: false,
      });
      return true;
    }

    const oldCanvasData = oldCanvasSnapshot.val();

    // Check if metadata already exists (migration already happened)
    const existingMetadata = oldCanvasData.metadata;
    if (existingMetadata) {
      // Add canvas to user's canvas list if not already there
      await set(ref(realtimeDb, `userCanvases/${userId}/${DEFAULT_CANVAS_ID}`), {
        name: existingMetadata.name || 'My First Canvas',
        role: 'owner',
        lastAccessed: now,
        starred: false,
      });

      // Add user to permissions if not already there
      const existingPermissions = oldCanvasData.permissions || {};
      if (!existingPermissions[userId]) {
        await set(ref(realtimeDb, `canvases/${DEFAULT_CANVAS_ID}/permissions/${userId}`), 'owner');
      }

      return true;
    }

    // Determine the original owner
    // Check objects to find who created them
    let originalOwnerId = userId; // Default to current user
    const objects = oldCanvasData.objects || {};

    if (Object.keys(objects).length > 0) {
      // Try to find the most common createdBy user
      const creatorCounts = {};
      Object.values(objects).forEach((obj) => {
        if (obj.createdBy) {
          creatorCounts[obj.createdBy] = (creatorCounts[obj.createdBy] || 0) + 1;
        }
      });

      // Get the user who created the most objects
      if (Object.keys(creatorCounts).length > 0) {
        originalOwnerId = Object.keys(creatorCounts).reduce((a, b) =>
          creatorCounts[a] > creatorCounts[b] ? a : b
        );
      }
    }

    // Create metadata for the default canvas
    const metadata = {
      name: 'My First Canvas',
      createdBy: originalOwnerId,
      createdAt: now,
      lastModified: now,
      template: 'blank',
    };

    await set(ref(realtimeDb, `canvases/${DEFAULT_CANVAS_ID}/metadata`), metadata);

    // Set permissions for original owner
    await set(
      ref(realtimeDb, `canvases/${DEFAULT_CANVAS_ID}/permissions/${originalOwnerId}`),
      'owner'
    );

    // Add canvas to original owner's canvas list
    await set(ref(realtimeDb, `userCanvases/${originalOwnerId}/${DEFAULT_CANVAS_ID}`), {
      name: 'My First Canvas',
      role: 'owner',
      lastAccessed: now,
      starred: false,
    });

    // If current user is different from original owner, add them as editor
    if (userId !== originalOwnerId) {
      await set(ref(realtimeDb, `canvases/${DEFAULT_CANVAS_ID}/permissions/${userId}`), 'viewer');
      await set(ref(realtimeDb, `userCanvases/${userId}/${DEFAULT_CANVAS_ID}`), {
        name: 'My First Canvas',
        role: 'viewer',
        lastAccessed: now,
        starred: false,
      });
    }

    return true;
  } catch (error) {
    reportError(error, { component: 'canvasMigration', action: 'migrateToMultiCanvas' });
    throw error;
  }
};

/**
 * Auto-migration wrapper - checks and migrates if needed
 * Called on app startup
 * @param {string} userId - User ID
 * @param {string} userName - User display name
 * @param {Object} user - Full user object
 * @returns {Promise<void>}
 */
export const autoMigrate = async (userId, userName, user = null) => {
  try {
    const shouldMigrate = await needsMigration(userId);
    if (shouldMigrate) {
      await migrateToMultiCanvas(userId, userName, user);

      // Show user a notification (optional)
    }
  } catch (error) {
    // Don't fail app startup if migration fails
    reportError(error, { component: 'canvasMigration', action: 'autoMigrate' });
  }
};
