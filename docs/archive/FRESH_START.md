# Fresh Database Start Guide

## ✅ Database Cleared - Ready for Fresh Start!

Your Firebase Realtime Database has been cleared and security rules have been redeployed. Here's what will happen when you start the app with an empty database.

---

## 🔒 Security Rules Deployed

**Status:** ✅ Successfully deployed

**Rules Structure:**
```
✅ canvases/{canvasId}/
   ├── metadata/     (read: has permission, write: owner/editor)
   ├── permissions/  (read: has permission, write: owner only)
   ├── objects/      (read: has permission, write: owner/editor)
   ├── cursors/      (read: has permission, write: any auth user)
   └── presence/     (read: has permission, write: any auth user)

✅ userCanvases/{userId}/
   └── {canvasId}/   (read/write: own data only)
```

---

## 📊 What Will Happen When You Sign In

### First-Time User Flow:

#### 1. **Sign In**
```
User signs in → App.jsx loads → Dashboard component mounts
```

#### 2. **Migration Check** (CanvasDashboard.jsx)
```javascript
await autoMigrate(user.uid, user.displayName, user);
```

**Result:**
- Checks `userCanvases/{userId}` → Empty (new user)
- Checks `canvases/main-canvas/objects` → Empty (no data)
- **No migration needed** ✅
- Console: `"⚠️ No data to migrate - creating empty canvas entry"`

#### 3. **Dashboard Displays**
```
┌─────────────────────────────────────────────────┐
│  My Canvases  (0 canvases)      [+ New Canvas]  │
│                                   [Sign Out]      │
├─────────────────────────────────────────────────┤
│                                                   │
│                    🎨                             │
│              No canvases yet                      │
│     Create your first canvas to get started!     │
│                                                   │
│         [+ Create Your First Canvas]             │
│                                                   │
└─────────────────────────────────────────────────┘
```

#### 4. **Create First Canvas**
When you click "Create Your First Canvas":

1. Modal opens with template options
2. Enter name (e.g., "My First Canvas")
3. Select template (Blank, Brainstorm, or Wireframe)
4. Click "Create Canvas"

**Database Structure Created:**
```
canvases/
  └── {userId}_{timestamp}_{random}/
      ├── metadata/
      │   ├── name: "My First Canvas"
      │   ├── createdBy: "{userId}"
      │   ├── createdAt: {timestamp}
      │   ├── lastModified: {timestamp}
      │   └── template: "blank" (or "brainstorm"/"wireframe")
      │
      ├── permissions/
      │   └── {userId}: "owner"
      │
      └── objects/
          └── {objectId}/  (if template != blank)
              ├── type: "rectangle"
              ├── x, y, width, height
              ├── color
              ├── createdBy
              └── ...

userCanvases/
  └── {userId}/
      └── {canvasId}/
          ├── name: "My First Canvas"
          ├── role: "owner"
          ├── lastAccessed: {timestamp}
          └── starred: false
```

---

## 🎯 Expected Console Logs

### On Sign In (Fresh Database):

```
Setting up presence for user: {userName} session: {sessionId}
⏸️ Skipping presence setup (no canvasId or missing params)  // ← On dashboard
🔄 Starting canvas migration for user: {userId} {userName}
⚠️ No data to migrate - creating empty canvas entry
✅ No migration needed
```

### On Creating First Canvas:

```
✅ Canvas created: {canvasId} My First Canvas
📦 Template shapes created (if template != blank)
✅ Canvas opened
```

### On Opening Canvas:

```
Setting up presence for user: {userName} session: {sessionId} canvas: {canvasId}
Setting up Firestore subscription for canvas: {canvasId}
🟢 Connected to Realtime Database
```

---

## 🧪 Testing Checklist

### Dashboard (Empty State):
- [ ] Sign in successfully
- [ ] See "No canvases yet" message
- [ ] See "Create Your First Canvas" button
- [ ] No permission errors in console
- [ ] Console shows "⏸️ Skipping presence setup"

### Create First Canvas:
- [ ] Click "+ New Canvas" or "Create Your First Canvas"
- [ ] Modal opens
- [ ] Enter canvas name
- [ ] Select "Blank Canvas" template
- [ ] Click "Create Canvas"
- [ ] Canvas opens automatically
- [ ] Canvas is empty (no shapes)

### Create Canvas with Template:
- [ ] Create "Brainstorming Board" template
- [ ] See 3 colored zones (Yellow, Green, Blue)
- [ ] See labels ("💡 Ideas", "⚡ Actions", "❓ Questions")
- [ ] Go back to dashboard
- [ ] Create "Wireframe Layout" template
- [ ] See layout guides (Header, Sidebar, Content)
- [ ] Go back to dashboard

### Dashboard (With Canvases):
- [ ] See canvas cards in grid
- [ ] Each card shows thumbnail, name, role, time
- [ ] Canvas count shows correctly (e.g., "2 canvases")
- [ ] Search works
- [ ] Grid/List toggle works
- [ ] Click card opens canvas

### Canvas Functionality:
- [ ] Create shapes (rectangles, circles, polygons)
- [ ] Create text boxes
- [ ] Move, resize, rotate shapes
- [ ] Delete shapes
- [ ] Undo/Redo works
- [ ] Layer control works

### Multi-Canvas Isolation:
- [ ] Create Canvas A with red rectangle
- [ ] Go back to dashboard
- [ ] Create Canvas B with blue circle
- [ ] Open Canvas A → Only red rectangle (no blue circle)
- [ ] Open Canvas B → Only blue circle (no red rectangle)

---

## 🔍 Verify Database Structure

### Check in Firebase Console:

1. Go to Firebase Console: https://console.firebase.google.com/project/collabcanvasgai
2. Navigate to Realtime Database
3. After creating your first canvas, you should see:

```
{
  "canvases": {
    "{your-canvas-id}": {
      "metadata": {
        "name": "My First Canvas",
        "createdBy": "{your-user-id}",
        "createdAt": 1234567890,
        "lastModified": 1234567890,
        "template": "blank"
      },
      "permissions": {
        "{your-user-id}": "owner"
      },
      "objects": {
        // Empty if blank template
        // Or contains template shapes
      }
    }
  },
  "userCanvases": {
    "{your-user-id}": {
      "{your-canvas-id}": {
        "name": "My First Canvas",
        "role": "owner",
        "lastAccessed": 1234567890,
        "starred": false
      }
    }
  }
}
```

---

## 🚀 Quick Start Commands

### 1. Start the App:
```bash
npm run dev
```

### 2. Open in Browser:
```
http://localhost:5173
```

### 3. Sign In:
- Use GitHub OAuth
- Or Google OAuth

### 4. Create Your First Canvas:
1. Click "+ New Canvas"
2. Name it (e.g., "Test Canvas")
3. Select a template
4. Click "Create Canvas"

### 5. Test Multi-Canvas:
1. Create a second canvas
2. Add different shapes to each
3. Switch between them
4. Verify data isolation

---

## ⚠️ Important Notes

### Security Rules:
- ✅ **Read Access:** Must have permission or be in user's canvas list
- ✅ **Write Access (objects):** Owner or editor role only
- ✅ **Write Access (permissions):** Owner only
- ✅ **Cursors/Presence:** Any authenticated user

### Canvas Limit:
- **Maximum:** 2 canvases per user
- **Warning:** Shows when you have 1 canvas
- **Error:** Blocks creation when you have 2 canvases

### Data Structure:
- **Canvas ID Format:** `{userId}_{timestamp}_{random}`
- **Object ID Format:** `{userId}_{timestamp}_{random}`
- **Ensures uniqueness** across all users

### No Migration Issues:
- ✅ Fresh database = No migration needed
- ✅ No old `main-canvas` to worry about
- ✅ Clean slate for testing

---

## 🎯 Expected Behavior Summary

| Action | Expected Result | Console Log |
|--------|----------------|-------------|
| Sign in | Dashboard loads, empty state | "⏸️ Skipping presence setup" |
| Create canvas | Modal opens, template selector | "Creating canvas..." |
| Submit modal | Canvas created, opens automatically | "✅ Canvas created: {id}" |
| Add shape | Shape appears, syncs to DB | "Rectangle created successfully" |
| Go to dashboard | Canvas list shows, back button works | "Loading canvases..." |
| Create 2nd canvas | Success (under limit) | "✅ Canvas created" |
| Try 3rd canvas | Error message, button disabled | "Maximum 2 canvases allowed" |
| Switch canvases | Data isolated, correct shapes load | "Setting up subscription for canvas: {id}" |

---

## 🐛 What If Something Goes Wrong?

### Problem: Permission Errors
**Solution:**
```bash
firebase deploy --only database
```

### Problem: Can't Create Canvas
**Check:**
1. Console for errors
2. Firebase Authentication (logged in?)
3. Network tab (API calls succeeding?)

### Problem: Canvas Not Loading
**Check:**
1. Console: "Setting up Firestore subscription"
2. Firebase Console: Does canvas exist in DB?
3. Network: Any failed requests?

### Debug Commands:
```javascript
// Check auth
firebase.auth().currentUser

// Check canvases
import { getUserCanvases } from './services/canvasService';
await getUserCanvases(firebase.auth().currentUser.uid)

// Check canvas metadata
import { getCanvasMetadata } from './services/canvasService';
await getCanvasMetadata('{canvas-id}')
```

---

## ✅ You're Ready!

Your database is clean and ready for a fresh start. The security rules are deployed and the app is configured correctly.

**Next Steps:**
1. Start the app: `npm run dev`
2. Sign in
3. Create your first canvas
4. Test multi-canvas features

Everything should work perfectly! 🎉

