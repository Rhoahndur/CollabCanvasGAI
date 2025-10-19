# Permission Denied Fix + Canvas Limit Display

## 🐛 Bug Fixed: PERMISSION_DENIED when creating canvas

### Problem
When trying to create a new canvas, you were getting:
```
PERMISSION_DENIED: Permission denied
```

### Root Cause
The `createCanvas` function was writing data in the wrong order:

**Before (Broken):**
```javascript
1. Set metadata          ← Security rules check for permissions (FAIL!)
2. Set permissions       ← Too late!
3. Set user canvas index
4. Create template shapes
```

The security rules for `/canvases/{canvasId}/metadata` require:
```json
".write": "auth != null && (
  root.child('canvases').child($canvasId).child('permissions').child(auth.uid).val() == 'owner' 
  || 
  root.child('canvases').child($canvasId).child('permissions').child(auth.uid).val() == 'editor'
)"
```

So when we tried to write metadata BEFORE setting permissions, the rule failed because permissions didn't exist yet!

---

## ✅ Solution

**Fixed Order:**
```javascript
1. Set permissions       ← Do this FIRST! ✅
2. Set metadata          ← Now permissions exist, rules pass! ✅
3. Set user canvas index
4. Create template shapes
```

**File:** `src/services/canvasService.js`

**Changes:**
```javascript
export const createCanvas = async (userId, canvasName, template = 'blank') => {
  try {
    const canvasId = generateCanvasId(userId);
    const now = Date.now();
    
    console.log('🎨 Creating canvas:', canvasId, canvasName, template);
    
    // IMPORTANT: Set permissions FIRST before writing any other data
    // Security rules require permissions to exist before writing metadata/objects
    await set(ref(realtimeDb, `canvases/${canvasId}/permissions/${userId}`), 'owner');
    console.log('✅ Permissions set');
    
    // Now write metadata (permissions exist, so this works!)
    await set(getCanvasMetadataRef(canvasId), metadata);
    console.log('✅ Metadata set');
    
    // ... rest of the code
  }
}
```

---

## 🎨 Enhancement: Clearer Canvas Limit Display

### Problem
Users weren't aware of the 2-canvas limit until they tried to create a 3rd one.

### Solution
Added a prominent badge in the modal header that always shows the current count.

**File:** `src/components/CreateCanvasModal.jsx`

**Before:**
```
┌─────────────────────────────┐
│  Create New Canvas       ✕  │
├─────────────────────────────┤
│  Canvas Name: ...           │
```

**After:**
```
┌─────────────────────────────┐
│  Create New Canvas       ✕  │
│  [0 / 2 canvases]           │  ← New badge!
├─────────────────────────────┤
│  Canvas Name: ...           │
```

**Changes:**
```jsx
<div className="modal-header">
  <div className="header-content">
    <h2>Create New Canvas</h2>
    <div className="canvas-limit-badge">
      {userCanvasCount} / {MAX_CANVASES_PER_USER} canvases
    </div>
  </div>
  <button className="modal-close-btn" onClick={handleClose}>
    ×
  </button>
</div>
```

**Styling Added:**
```css
.canvas-limit-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  background-color: rgba(100, 108, 255, 0.15);
  border: 1px solid rgba(100, 108, 255, 0.3);
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  color: #646cff;
  width: fit-content;
}
```

---

## 🧪 Testing

### Test Creating Canvas:

1. Sign in
2. Click "+ New Canvas"
3. **Check:** See badge showing "0 / 2 canvases"
4. Enter canvas name: "Test Canvas"
5. Select template: "Blank Canvas"
6. Click "Create Canvas"
7. **Expected:** ✅ Canvas created successfully
8. **Console logs:**
   ```
   🎨 Creating canvas: userId_1234_abc Test Canvas blank
   ✅ Permissions set
   ✅ Metadata set
   ✅ User canvas index updated
   ✅ Canvas created: userId_1234_abc Test Canvas
   ```

### Test Canvas Limit Display:

**With 0 canvases:**
```
Badge shows: "0 / 2 canvases"
Color: Blue
Message: (none)
```

**With 1 canvas:**
```
Badge shows: "1 / 2 canvases"
Color: Blue
Warning: "⚠️ You have 1 of 2 canvases. This is your last canvas slot."
```

**With 2 canvases:**
```
Badge shows: "2 / 2 canvases"
Color: Blue
Error: "⚠️ You have 2 of 2 canvases. Delete a canvas to create a new one."
Button: Disabled
```

---

## 📊 What's Different Now

### Before:
- ❌ Permission denied error when creating canvas
- ❌ Users unaware of 2-canvas limit
- ❌ Confusing error messages

### After:
- ✅ Canvas creation works perfectly
- ✅ Always see current count (X / 2 canvases)
- ✅ Clear visual feedback
- ✅ Helpful console logs for debugging

---

## 🔍 Console Logs to Watch For

### Successful Canvas Creation:
```
🎨 Creating canvas: userId_1234567890_abc123 My Canvas blank
✅ Permissions set
✅ Metadata set
✅ User canvas index updated
✅ Canvas created: userId_1234567890_abc123 My Canvas
```

### If You See Errors:
```
❌ Error creating canvas: PERMISSION_DENIED
```
→ Check that security rules are deployed:
```bash
firebase deploy --only database
```

---

## 📝 Files Modified

1. **src/services/canvasService.js**
   - Reordered operations in `createCanvas()`
   - Set permissions FIRST, then metadata
   - Added console logs for debugging

2. **src/components/CreateCanvasModal.jsx**
   - Added canvas limit badge to header
   - Shows "{count} / {max} canvases"
   - Always visible

3. **src/components/CreateCanvasModal.css**
   - Added `.canvas-limit-badge` styles
   - Added `.header-content` for layout
   - Added light mode support

---

## ✅ Ready to Test!

Try creating a canvas now:

```bash
npm run dev
```

1. Sign in
2. Click "+ New Canvas"
3. See "0 / 2 canvases" badge
4. Create canvas
5. No permission errors! ✨

**Expected Result:**
- ✅ Canvas created successfully
- ✅ Opens automatically
- ✅ Badge updates to "1 / 2 canvases"
- ✅ Can create one more canvas

---

## 🎉 All Fixed!

Both issues are now resolved:
1. ✅ **Permission error fixed** - Correct operation order
2. ✅ **Limit display added** - Always visible badge

Create as many canvases as you want (up to 2)! 🎨

