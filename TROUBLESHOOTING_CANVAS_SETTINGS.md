# Troubleshooting: Canvas Background Settings Not Saving

## Problem
Canvas background settings aren't being saved in production.

## Diagnostic Steps

### 1. Check Console Logs
Open browser console (F12) when saving settings. Look for:

**Success case:**
```
💾 Saving canvas settings: { canvasId, backgroundColor, gridVisible }
📝 updateCanvasMetadata called: { ... }
📝 Flattened updates: { ... }
✅ Canvas settings saved successfully
```

**Error case:**
```
❌ Failed to save settings: Error: PERMISSION_DENIED
Error code: PERMISSION_DENIED
Error message: ...
```

### 2. Check Firebase Realtime Database Rules

The issue is likely that the database rules aren't deployed to production.

**To check:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Realtime Database → Rules
4. Verify the rules match `database.rules.json`

**To deploy rules:**
```bash
firebase deploy --only database
```

### 3. Verify Permissions Structure

Check that your canvas has proper permissions set:

**In Firebase Console:**
1. Go to Realtime Database
2. Navigate to: `canvases/{your-canvas-id}/permissions`
3. Should see: `{userId}: "owner"` or `{userId}: "editor"`

**Also check:**
- `userCanvases/{userId}/{canvasId}/role` should be "owner" or "editor"

### 4. Common Issues

#### Issue: PERMISSION_DENIED
**Cause:** Database rules not deployed or incorrect
**Fix:**
```bash
firebase deploy --only database
```

#### Issue: Settings save but don't persist
**Cause:** `getCanvasMetadata` not reading settings correctly
**Check:** Console logs when loading canvas

#### Issue: Settings save locally but not in production
**Cause:** Different Firebase project or rules not deployed
**Fix:**
1. Verify `.env` has production Firebase config
2. Deploy rules: `firebase deploy --only database`
3. Check Firebase Console that rules are updated

### 5. Metadata Write Rule

The rule that controls metadata writes (line 9 in `database.rules.json`):

```json
".write": "auth != null && (
  root.child('canvases').child($canvasId).child('permissions').child(auth.uid).val() == 'owner' || 
  root.child('canvases').child($canvasId).child('permissions').child(auth.uid).val() == 'editor' || 
  root.child('userCanvases').child(auth.uid).child($canvasId).child('role').val() == 'owner' || 
  root.child('userCanvases').child(auth.uid).child($canvasId).child('role').val() == 'editor' || 
  !root.child('canvases').child($canvasId).child('metadata').exists()
)"
```

This checks:
- User has "owner" permission in `canvases/{canvasId}/permissions/{userId}`
- OR user has "editor" permission in `canvases/{canvasId}/permissions/{userId}`
- OR user has "owner" role in `userCanvases/{userId}/{canvasId}/role`
- OR user has "editor" role in `userCanvases/{userId}/{canvasId}/role`
- OR metadata doesn't exist yet (for initial creation)

### 6. Quick Fix Commands

```bash
# Deploy database rules
firebase deploy --only database

# Check if rules are valid
firebase deploy --only database --dry-run

# View current rules in production
firebase database:get /.settings/rules
```

## Resolution

After adding debug logs and deploying rules, check the console output when saving settings. The detailed logs will show exactly where the process fails.

**Expected behavior:**
- Settings save without errors
- Success message appears
- Background color changes immediately
- Settings persist after page reload

**If still not working:**
1. Share the console error logs
2. Verify Firebase project configuration
3. Check that you're the canvas owner or editor
4. Ensure you're connected to the internet
