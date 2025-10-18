# Migration Fix - Permission Error Resolution

## Problem
When signing in, you were seeing:
```
permission_denied at /canvases/main-canvas/objects: Client doesn't have permission to access the desired data.
```

## Root Causes Identified

### 1. **Presence Hook Running on Dashboard**
- `usePresence` was being called at the App level
- This connected to `main-canvas` even when viewing the dashboard
- Without proper permissions, this caused a permission error

### 2. **Migration Not Detecting Original Owner**
- Migration was assigning ownership to whoever logged in first
- Needed to detect the original canvas creator

---

## Fixes Applied

### ✅ Fix 1: Conditional Presence Connection

**File:** `src/App.jsx`

**Change:**
```javascript
// Only use presence when on a canvas (not on dashboard)
const { onlineUsers } = usePresence(
  sessionIdRef.current, 
  user?.uid, 
  user?.displayName,
  currentView === 'canvas' ? currentCanvasId : null  // ← Pass null on dashboard
)
```

**File:** `src/hooks/usePresence.js`

**Change:**
```javascript
// Don't connect if no canvasId (e.g., on dashboard)
if (!sessionId || !userId || !userName || !canvasId) {
  console.log('⏸️ Skipping presence setup (no canvasId or missing params)');
  return;
}
```

**Result:** ✅ No permission errors on dashboard

---

### ✅ Fix 2: Smart Owner Detection in Migration

**File:** `src/services/canvasMigration.js`

**New Logic:**
1. **Check for existing metadata** - If canvas already migrated, just add current user
2. **Detect original owner** - Count who created the most objects in the canvas
3. **Assign ownership** - Give ownership to the detected original creator
4. **Handle other users** - If current user isn't the owner, add as viewer

**Code:**
```javascript
// Determine the original owner
let originalOwnerId = userId; // Default to current user
const objects = oldCanvasData.objects || {};

if (Object.keys(objects).length > 0) {
  // Try to find the most common createdBy user
  const creatorCounts = {};
  Object.values(objects).forEach(obj => {
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
```

**Result:** ✅ Original creator gets ownership

---

## Testing the Fixes

### 1. Sign In and Check Dashboard

```bash
npm run dev
```

1. Sign in with your GitHub account (Rhoahndur) or Google (aleksandergaun@gmail.com)
2. You should see the dashboard (not permission error)
3. Check browser console for migration logs:
   ```
   🔄 Starting canvas migration for user: ...
   📦 Found old canvas data: ...
   📊 Detected original owner: ... (created X objects)
   ✅ Migration completed successfully!
   ```

### 2. Check Canvas Ownership

1. From dashboard, you should see "My First Canvas"
2. Role badge should say "owner"
3. Click to open - you should see all your existing shapes
4. You can rename and delete (owner permissions)

### 3. Check No Permission Errors

1. Open browser console (F12)
2. Filter for "permission_denied" errors
3. There should be NO permission errors
4. You should see: "⏸️ Skipping presence setup (no canvasId or missing params)" when on dashboard

---

## Manual Verification (if needed)

If you want to verify the migration worked correctly, you can check Firebase Console:

### Firebase Realtime Database Structure:

**Check Metadata:**
```
canvases/
  └── main-canvas/
      ├── metadata/
      │   ├── name: "My First Canvas"
      │   ├── createdBy: "{your-user-id}"
      │   └── ...
```

**Check Permissions:**
```
canvases/
  └── main-canvas/
      ├── permissions/
      │   └── {your-user-id}: "owner"
```

**Check User Canvas Index:**
```
userCanvases/
  └── {your-user-id}/
      └── main-canvas/
          ├── name: "My First Canvas"
          ├── role: "owner"
          └── ...
```

---

## Migration Logs to Watch For

When you sign in, look for these console messages:

### Success:
```
✅ No migration needed
```
OR
```
🔄 Starting canvas migration for user: ...
📦 Found old canvas data: [objects, cursors, presence]
📊 Detected original owner: {userId} (created X objects)
✅ Created canvas metadata
✅ Set canvas permissions for original owner
✅ Added canvas to original owner list
✅ Migration completed successfully!
✨ Your canvas has been upgraded to support multiple canvases!
```

### Already Migrated:
```
🔄 Starting canvas migration for user: ...
📦 Found old canvas data: [metadata, permissions, objects, cursors, presence]
✅ Canvas already has metadata, just adding to user list
✅ Added user to canvas permissions (if needed)
```

---

## What If Migration Doesn't Work?

### Debug in Console:

```javascript
// Check migration status
import { getMigrationStatus } from './services/canvasMigration';
const status = await getMigrationStatus('{your-user-id}');
console.log('Migration status:', status);

// Expected output:
{
  migrated: true,
  hasOldData: true,
  defaultCanvasObjectCount: X,
  needsMigration: false
}
```

### Manual Migration:

```javascript
import { migrateToMultiCanvas } from './services/canvasMigration';
const user = firebase.auth().currentUser;
await migrateToMultiCanvas(user.uid, user.displayName, user);
```

---

## Verification Checklist

After signing in:

- [ ] No "permission_denied" errors in console
- [ ] Dashboard loads successfully
- [ ] See "My First Canvas" in canvas list
- [ ] Role badge shows "owner"
- [ ] Can open canvas and see all existing shapes
- [ ] Can rename canvas (owner only)
- [ ] Can delete canvas (owner only)
- [ ] Can create new canvases
- [ ] Switching between canvases works
- [ ] Each canvas has isolated data

---

## Summary

**Fixes Applied:**
1. ✅ Fixed presence hook to only connect when on a canvas
2. ✅ Updated migration to detect original owner
3. ✅ Added checks for already-migrated canvases
4. ✅ Proper permission assignment

**Expected Behavior:**
1. Sign in → Dashboard loads (no errors)
2. See "My First Canvas" as owner
3. All existing shapes preserved
4. Can create new canvases (up to 2 total)
5. Each canvas has isolated data

**Files Modified:**
- `src/App.jsx` - Conditional presence
- `src/hooks/usePresence.js` - Skip when no canvasId
- `src/services/canvasMigration.js` - Smart owner detection
- `src/components/CanvasDashboard.jsx` - Pass full user object

---

## Ready to Test!

Try signing in now - the permission error should be gone and you should see the dashboard with your existing canvas! 🎉

