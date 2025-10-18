/**
 * Canvas Migration Service
 * Migrates existing single-canvas data to multi-canvas structure
 */

import { ref, get, set, remove } from 'firebase/database';
import { realtimeDb } from './firebase';
import { DEFAULT_CANVAS_ID } from '../utils/constants';

/**
 * Check if user needs migration
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if migration needed
 */
export const needsMigration = async (userId) => {
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
    console.error('Error checking migration status:', error);
    return false;
  }
};

/**
 * Migrate existing canvas data to multi-canvas structure
 * @param {string} userId - User ID
 * @param {string} userName - User display name
 * @returns {Promise<boolean>} True if migration successful
 */
export const migrateToMultiCanvas = async (userId, userName) => {
  try {
    console.log('🔄 Starting canvas migration for user:', userId);
    
    // Check if migration needed
    const shouldMigrate = await needsMigration(userId);
    if (!shouldMigrate) {
      console.log('✅ No migration needed');
      return true;
    }
    
    const now = Date.now();
    const oldCanvasRef = ref(realtimeDb, `canvases/${DEFAULT_CANVAS_ID}`);
    const oldCanvasSnapshot = await get(oldCanvasRef);
    
    if (!oldCanvasSnapshot.exists()) {
      console.log('⚠️ No data to migrate');
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
    console.log('📦 Found old canvas data:', Object.keys(oldCanvasData));
    
    // Create metadata for the default canvas
    const metadata = {
      name: 'My First Canvas',
      createdBy: userId,
      createdAt: now,
      lastModified: now,
      template: 'blank',
    };
    
    await set(ref(realtimeDb, `canvases/${DEFAULT_CANVAS_ID}/metadata`), metadata);
    console.log('✅ Created canvas metadata');
    
    // Set permissions
    await set(ref(realtimeDb, `canvases/${DEFAULT_CANVAS_ID}/permissions/${userId}`), 'owner');
    console.log('✅ Set canvas permissions');
    
    // Add canvas to user's canvas list
    await set(ref(realtimeDb, `userCanvases/${userId}/${DEFAULT_CANVAS_ID}`), {
      name: 'My First Canvas',
      role: 'owner',
      lastAccessed: now,
      starred: false,
    });
    console.log('✅ Added canvas to user list');
    
    // Clean up any stale presence/cursor data (keep objects)
    // This is optional - we can keep the old structure and it will work with new structure
    
    console.log('✅ Migration completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

/**
 * Auto-migration wrapper - checks and migrates if needed
 * Called on app startup
 * @param {string} userId - User ID
 * @param {string} userName - User display name
 * @returns {Promise<void>}
 */
export const autoMigrate = async (userId, userName) => {
  try {
    const shouldMigrate = await needsMigration(userId);
    if (shouldMigrate) {
      console.log('🔄 Auto-migration triggered');
      await migrateToMultiCanvas(userId, userName);
      
      // Show user a notification (optional)
      console.log('✨ Your canvas has been upgraded to support multiple canvases!');
    }
  } catch (error) {
    // Don't fail app startup if migration fails
    console.error('⚠️ Auto-migration failed (non-critical):', error);
  }
};

/**
 * Get migration status for debugging
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Migration status object
 */
export const getMigrationStatus = async (userId) => {
  try {
    const userCanvasesRef = ref(realtimeDb, `userCanvases/${userId}`);
    const userCanvasesSnapshot = await get(userCanvasesRef);
    
    const defaultCanvasRef = ref(realtimeDb, `canvases/${DEFAULT_CANVAS_ID}/objects`);
    const defaultCanvasSnapshot = await get(defaultCanvasRef);
    
    const hasUserCanvases = userCanvasesSnapshot.exists();
    const hasDefaultCanvasData = defaultCanvasSnapshot.exists();
    const objectCount = hasDefaultCanvasData 
      ? Object.keys(defaultCanvasSnapshot.val() || {}).length 
      : 0;
    
    return {
      migrated: hasUserCanvases,
      hasOldData: hasDefaultCanvasData,
      defaultCanvasObjectCount: objectCount,
      needsMigration: !hasUserCanvases && hasDefaultCanvasData,
    };
  } catch (error) {
    console.error('Error getting migration status:', error);
    return {
      migrated: false,
      hasOldData: false,
      defaultCanvasObjectCount: 0,
      needsMigration: false,
      error: error.message,
    };
  }
};

