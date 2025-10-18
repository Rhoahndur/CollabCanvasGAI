# Phase 1 & 2 Testing Guide

## 🎯 Testing Multi-Canvas System

This guide will help you test all the new multi-canvas features we just implemented.

---

## 🚀 Quick Start

### 1. Start the Application

```bash
npm run dev
```

Then open `http://localhost:5173` in your browser.

### 2. Sign In

- Use GitHub or Google OAuth to sign in
- **First-time behavior**: If you have existing canvas data, it will auto-migrate

---

## 📋 Test Checklist

### ✅ Phase 1: Backend & Migration

#### Auto-Migration (for existing users)
- [ ] Sign in with your existing account
- [ ] Check browser console for migration logs
- [ ] Verify your existing shapes are still visible
- [ ] Dashboard should show "My First Canvas" with your data

#### New User Experience
- [ ] Sign in with a brand new account (different provider)
- [ ] Dashboard should show empty state
- [ ] "No canvases yet" message appears
- [ ] "Create Your First Canvas" button visible

---

### ✅ Phase 2: Dashboard UI

#### Dashboard Display
- [ ] Dashboard shows after login (not canvas directly)
- [ ] Canvas count shows correctly (e.g., "2 canvases")
- [ ] Search box and view toggle buttons visible
- [ ] "+ New Canvas" button in top right
- [ ] "Sign Out" button visible

#### Canvas Cards
- [ ] Each canvas shows as a card with thumbnail
- [ ] Canvas name displays correctly
- [ ] Role badge shows (owner/editor/viewer)
- [ ] Last accessed time displays (e.g., "2h ago", "3d ago")
- [ ] Hover effect works (card lifts up, border changes color)

#### Search & Filter
- [ ] Type in search box
- [ ] Canvas list filters in real-time
- [ ] "No canvases found" message when no matches
- [ ] Clear search shows all canvases again

#### View Toggle
- [ ] Click grid view button (◫)
- [ ] Cards display in responsive grid
- [ ] Click list view button (☰)
- [ ] Cards display in horizontal list layout

---

### ✅ Canvas Creation

#### Opening the Modal
- [ ] Click "+ New Canvas" button
- [ ] Modal appears with overlay
- [ ] Modal title: "Create New Canvas"
- [ ] Close button (×) in top right
- [ ] Click outside modal to close (optional test)

#### Canvas Name Input
- [ ] Type canvas name in input field
- [ ] Try clicking "Create Canvas" with empty name
- [ ] Error message: "Please enter a canvas name"
- [ ] Type a valid name (no error)

#### Template Selection
- [ ] Three template cards visible:
  - ⬜ Blank Canvas
  - 💡 Brainstorming Board
  - 📐 Wireframe Layout
- [ ] Click each template (border highlights in blue)
- [ ] Selected template has blue border and background

#### Creating Canvas
- [ ] Fill in name: "Test Canvas 1"
- [ ] Select "Blank Canvas" template
- [ ] Click "Create Canvas" button
- [ ] Modal closes
- [ ] Dashboard reloads
- [ ] New canvas opens automatically
- [ ] Canvas is empty (no shapes)

#### Template Testing

**Blank Canvas:**
- [ ] Create canvas with "Blank Canvas" template
- [ ] Canvas opens empty
- [ ] No pre-existing shapes

**Brainstorming Board:**
- [ ] Create canvas with "Brainstorming Board" template
- [ ] Canvas opens with 3 colored zones:
  - Yellow "💡 Ideas" section on left
  - Green "⚡ Actions" section in middle
  - Blue "❓ Questions" section on right
- [ ] Each zone has a label text

**Wireframe Layout:**
- [ ] Create canvas with "Wireframe Layout" template
- [ ] Canvas opens with layout guides:
  - Gray header area at top
  - Gray sidebar on left
  - Main content area on right
- [ ] Each area has a label

#### Canvas Limit
- [ ] Create your first canvas (1/2)
- [ ] Create your second canvas (2/2)
- [ ] Warning appears: "⚠️ You have 2 of 2 canvases"
- [ ] Try to create a third canvas
- [ ] Error message: "Maximum 2 canvases allowed"
- [ ] "Create Canvas" button disabled

---

### ✅ Canvas Navigation

#### Opening a Canvas
- [ ] From dashboard, click any canvas card
- [ ] Canvas view loads
- [ ] Canvas objects appear (if any)
- [ ] Header shows "← Dashboard" button
- [ ] No "Sign Out" button in canvas view (it's on dashboard)

#### Back to Dashboard
- [ ] Click "← Dashboard" button in canvas header
- [ ] Dashboard loads
- [ ] Canvas list shows all canvases
- [ ] Opened canvas moves to top (most recent)

#### Multiple Canvas Switching
- [ ] Open Canvas A
- [ ] Create a red rectangle
- [ ] Go back to dashboard
- [ ] Open Canvas B
- [ ] Canvas B should be empty (no red rectangle)
- [ ] Create a blue circle
- [ ] Go back to dashboard
- [ ] Open Canvas A again
- [ ] Red rectangle should still be there (blue circle not)

---

### ✅ Canvas Management

#### Renaming Canvas (Owner Only)
- [ ] Hover over canvas card
- [ ] Click menu button (⋮) in top right
- [ ] Menu appears with "✏️ Rename" option
- [ ] Click "Rename"
- [ ] Canvas name becomes an input field
- [ ] Type new name
- [ ] Press Enter or click outside
- [ ] Name updates immediately

Alternative rename:
- [ ] Click "Rename" from menu
- [ ] Input appears
- [ ] Type new name
- [ ] Name updates in dashboard

#### Deleting Canvas (Owner Only)
- [ ] Click menu button (⋮) on a canvas card
- [ ] Click "🗑️ Delete" option
- [ ] Confirmation dialog appears
- [ ] Message: "Delete '[Canvas Name]'? This cannot be undone."
- [ ] Click "Cancel" - nothing happens
- [ ] Click menu again, click "Delete"
- [ ] Click "OK" - canvas is deleted
- [ ] Dashboard updates (canvas removed)
- [ ] Canvas count decreases

---

### ✅ Multi-Canvas Data Isolation

This is the most important test! Each canvas must have completely separate data.

#### Test Setup
1. Create two canvases: "Canvas A" and "Canvas B"

#### Test Objects
- [ ] Open Canvas A
- [ ] Create 3 rectangles
- [ ] Go back to dashboard
- [ ] Open Canvas B
- [ ] Verify Canvas B is empty (no rectangles from Canvas A)
- [ ] Create 2 circles
- [ ] Go back and open Canvas A
- [ ] Verify Canvas A still has 3 rectangles (no circles from Canvas B)

#### Test Cursors (Multi-Browser)
- [ ] Open Canvas A in Browser 1
- [ ] Open Canvas A in Browser 2 (same user or different)
- [ ] Move mouse in Browser 1
- [ ] Verify cursor shows in Browser 2 (on Canvas A)
- [ ] Open Canvas B in Browser 2
- [ ] Move mouse in Browser 1 (Canvas A)
- [ ] Verify cursor does NOT show in Browser 2 (Canvas B)

#### Test Presence
- [ ] Open Canvas A in Browser 1
- [ ] Open Canvas A in Browser 2
- [ ] Verify online user count = 2 in both browsers
- [ ] Switch Browser 2 to Canvas B
- [ ] Verify Canvas A (Browser 1) shows online count = 1
- [ ] Verify Canvas B (Browser 2) shows online count = 1

---

### ✅ Permissions (Future Testing)

Currently, all canvases are owned by the creator. In Phase 3, we'll test:
- [ ] Sharing canvas with editor role
- [ ] Editor can create/edit/delete objects
- [ ] Editor can rename canvas (owner only)
- [ ] Editor cannot delete canvas (owner only)
- [ ] Sharing canvas with viewer role
- [ ] Viewer can see objects (read-only)
- [ ] Viewer cannot create/edit/delete objects

---

## 🐛 Known Issues to Watch For

### Issue 1: Migration Not Running
**Symptom**: Existing canvas doesn't appear after login  
**Fix**: Check browser console for migration logs  
**Workaround**: Manually refresh the page

### Issue 2: Canvas Not Loading
**Symptom**: Empty canvas when it should have objects  
**Check**: 
- Verify canvasId in browser console
- Check Firebase Console > Realtime Database
- Look for `canvases/{canvasId}/objects`

### Issue 3: Permission Errors
**Symptom**: "Permission denied" errors in console  
**Fix**: Security rules deployed? Check Firebase Console > Rules
**Command**: `firebase deploy --only database`

---

## 🧪 Browser Console Debugging

### Useful Console Commands

**Check canvas list:**
```javascript
import { getUserCanvases } from './services/canvasService';
const user = firebase.auth().currentUser;
const canvases = await getUserCanvases(user.uid);
console.log('My canvases:', canvases);
```

**Check migration status:**
```javascript
import { getMigrationStatus } from './services/canvasMigration';
const user = firebase.auth().currentUser;
const status = await getMigrationStatus(user.uid);
console.log('Migration status:', status);
```

**Manual migration (if needed):**
```javascript
import { autoMigrate } from './services/canvasMigration';
const user = firebase.auth().currentUser;
await autoMigrate(user.uid, user.displayName);
console.log('Migration complete!');
```

---

## ✅ Expected Results Summary

After completing all tests:

1. **Dashboard works perfectly**
   - Shows all canvases
   - Search and view toggle work
   - Canvas creation works with all templates
   - Rename and delete work

2. **Navigation is smooth**
   - Dashboard → Canvas → Dashboard transitions work
   - Back button always returns to dashboard
   - Canvas opens correctly when clicked

3. **Data isolation is perfect**
   - Each canvas has separate objects
   - Cursors are canvas-specific
   - Presence is canvas-specific
   - Switching canvases loads correct data

4. **Limits are enforced**
   - Maximum 2 canvases per user
   - Clear warning messages
   - Cannot exceed limit

---

## 📝 Bug Reporting

If you find any issues, please note:
1. What were you doing?
2. What did you expect to happen?
3. What actually happened?
4. Any console errors?
5. Browser and OS version?

---

## 🎉 Ready for Phase 3!

Once all tests pass, we're ready to implement:
- Canvas sharing (email invites & shareable links)
- Collaborator management
- Role permissions (editor/viewer)
- Canvas settings

**Estimated Phase 3 Time:** ~2-3 hours

