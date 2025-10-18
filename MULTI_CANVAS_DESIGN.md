# Multi-Canvas Projects - Design Document

## Overview
Enable users to create and manage multiple separate canvas projects, each with its own set of objects, collaborators, and settings.

---

## 🎯 User Experience Goals

### What Users Want
- Create new canvas projects
- Switch between canvas projects
- Share specific canvas projects with collaborators
- Organize canvases (rename, delete, archive)
- See a dashboard/list of all their canvases

### User Flow
```
Login → Canvas Dashboard → Select/Create Canvas → Work on Canvas
                ↓
         [My Canvases List]
         - Project A (3 collaborators, edited 2h ago)
         - Project B (solo, edited 1d ago)
         - [+ New Canvas]
```

---

## 🏗️ Architecture Changes

### Current Structure
```
Firebase Realtime Database:
  canvases/
    default/
      objects/
        {objectId}/
      cursors/
        {userId}/
      presence/
        {userId}/
```

### Proposed Structure
```
Firebase Realtime Database:
  canvases/
    {canvasId}/           ← Each canvas is isolated
      metadata/
        name: "Project Name"
        createdBy: userId
        createdAt: timestamp
        lastModified: timestamp
        thumbnail: base64 (optional)
      objects/
        {objectId}/
      cursors/
        {userId}/
      presence/
        {userId}/
      permissions/        ← Who can access this canvas
        {userId}: "owner" | "editor" | "viewer"
  
  userCanvases/          ← User's canvas index
    {userId}/
      {canvasId}: {
        name: "Project Name"
        role: "owner" | "editor" | "viewer"
        lastAccessed: timestamp
        starred: boolean
      }
```

---

## 📋 Implementation Task Breakdown

### Phase 1: Data Model & Backend (Foundation)
**Tasks:**
1. **Update Firebase structure**
   - Create `canvases/{canvasId}` structure
   - Create `userCanvases/{userId}` index
   - Migrate existing "default" canvas data
   
2. **Update `canvasService.js`**
   - Add `canvasId` parameter to all functions
   - Add `createCanvas(userId, canvasName)`
   - Add `getCanvasMetadata(canvasId)`
   - Add `updateCanvasMetadata(canvasId, updates)`
   - Add `deleteCanvas(canvasId)`
   - Add `getUserCanvases(userId)`
   - Add `addCanvasPermission(canvasId, userId, role)`
   - Add `removeCanvasPermission(canvasId, userId)`

3. **Update Firebase security rules**
   ```json
   {
     "canvases": {
       "$canvasId": {
         ".read": "auth != null && (
           root.child('canvases').child($canvasId).child('permissions').child(auth.uid).exists() ||
           root.child('userCanvases').child(auth.uid).child($canvasId).exists()
         )",
         ".write": "auth != null && (
           root.child('canvases').child($canvasId).child('permissions').child(auth.uid).val() == 'owner' ||
           root.child('canvases').child($canvasId).child('permissions').child(auth.uid).val() == 'editor'
         )"
       }
     },
     "userCanvases": {
       "$userId": {
         ".read": "auth != null && auth.uid == $userId",
         ".write": "auth != null && auth.uid == $userId"
       }
     }
   }
   ```

**Estimated Complexity:** Medium-High  
**Time Estimate:** 3-4 hours  

---

### Phase 2: Canvas Selection UI
**Tasks:**
1. **Create `CanvasDashboard.jsx` component**
   - Grid/list view of user's canvases
   - Canvas cards with:
     - Thumbnail preview
     - Canvas name
     - Last modified timestamp
     - Collaborator count
     - Actions (Open, Rename, Delete, Share)
   - "Create New Canvas" button
   - Search/filter functionality

2. **Create `CreateCanvasModal.jsx`**
   - Input for canvas name
   - Optional: template selection (blank, grid, etc.)
   - Create button

3. **Update routing**
   - `/` → Canvas Dashboard (if logged in)
   - `/canvas/:canvasId` → Specific canvas
   - Handle invalid/unauthorized canvas IDs

4. **Add canvas switcher in main app**
   - Dropdown/menu to switch between recent canvases
   - "Return to Dashboard" button

**Estimated Complexity:** Medium  
**Time Estimate:** 2-3 hours  

---

### Phase 3: Canvas Context Management
**Tasks:**
1. **Create `useCanvasContext.js` hook**
   - Store current `canvasId` in state
   - Provide `switchCanvas(canvasId)` function
   - Handle canvas loading/unloading

2. **Update `useCanvas.js` hook**
   - Accept `canvasId` parameter
   - Update all Firebase paths to include `canvasId`
   - Handle switching between canvases (cleanup listeners)

3. **Update `useCursors.js` and `usePresence.js`**
   - Accept `canvasId` parameter
   - Update Firebase paths

4. **Update `Canvas.jsx`**
   - Get `canvasId` from route/context
   - Pass `canvasId` to all hooks
   - Show canvas name in header

**Estimated Complexity:** Medium  
**Time Estimate:** 2-3 hours  

---

### Phase 4: Collaboration & Sharing
**Tasks:**
1. **Create `ShareCanvasModal.jsx`**
   - Input for user email/ID
   - Role selector (Editor/Viewer)
   - List of current collaborators
   - Remove collaborator action
   - Copy shareable link

2. **Implement invite system**
   - Option A: Email invites (requires backend/email service)
   - Option B: Shareable links with access codes
   - Option C: Direct user ID sharing (simpler, MVP)

3. **Update presence indicators**
   - Show who's viewing each canvas
   - Canvas-specific presence

**Estimated Complexity:** Medium-High  
**Time Estimate:** 3-4 hours  

---

### Phase 5: Canvas Management
**Tasks:**
1. **Rename canvas**
   - Inline editing in dashboard
   - Update metadata

2. **Delete canvas**
   - Confirmation modal
   - Soft delete (move to trash) vs hard delete
   - Remove from all users' `userCanvases`

3. **Duplicate canvas**
   - Copy all objects to new canvas
   - Preserve styles, but reset positions slightly

4. **Canvas settings**
   - Background color
   - Grid on/off
   - Default permissions for new collaborators

**Estimated Complexity:** Low-Medium  
**Time Estimate:** 2 hours  

---

## 🔄 Migration Strategy

### For Existing Users
1. **Automatic migration on first load:**
   - Detect if user has old "default" canvas data
   - Create a new canvas with ID `default`
   - Copy all existing objects/data
   - Add entry to user's `userCanvases`
   - Show migration success message

2. **Backward compatibility:**
   - Support old URLs without canvas ID → redirect to default canvas
   - Graceful handling of missing canvas IDs

---

## 🎨 UI/UX Considerations

### Dashboard Design
- **Card view** (default): Visual thumbnails, easy to scan
- **List view** (compact): More canvases visible at once
- **Sorting options:** Last modified, name, collaborators
- **Starring/favorites:** Pin important canvases to top

### Canvas Header Updates
- Current canvas name displayed prominently
- Canvas switcher dropdown (recent canvases)
- Share button
- Settings menu (rename, delete, etc.)

### Navigation Flow
```
[Dashboard] → [Canvas View] → [Back to Dashboard]
     ↓              ↓
[New Canvas]   [Switch Canvas]
```

---

## 🚨 Potential Challenges

### 1. Real-time Sync Complexity
- **Challenge:** Multiple users across multiple canvases
- **Solution:** Careful listener management, cleanup on canvas switch

### 2. Performance with Many Canvases
- **Challenge:** User has 100+ canvases
- **Solution:** Pagination, lazy loading, search/filter

### 3. Large Canvas Data
- **Challenge:** Canvas with 10,000+ objects
- **Solution:** 
  - Implement object pagination/chunking
  - Load only visible objects (viewport culling already in place)
  - Thumbnail generation for dashboard (low-res preview)

### 4. Permission Management
- **Challenge:** Complex sharing scenarios
- **Solution:** 
  - Start with simple 3-role system (Owner, Editor, Viewer)
  - Expand later if needed

### 5. URL Structure & Bookmarks
- **Challenge:** Users bookmarking specific canvas URLs
- **Solution:** 
  - Clean URLs: `/canvas/project-name-abc123`
  - Share-friendly slugs

---

## 🧪 Testing Checklist

- [ ] Create new canvas
- [ ] Switch between canvases
- [ ] Delete canvas
- [ ] Rename canvas
- [ ] Share canvas with another user
- [ ] Multiple users editing same canvas
- [ ] Multiple users on different canvases
- [ ] Canvas permissions (viewer can't edit)
- [ ] Migration from single-canvas to multi-canvas
- [ ] Invalid canvas ID handling
- [ ] Offline/online transitions

---

## 🎯 MVP vs Full Feature

### MVP (Launch Quickly)
- ✅ Create new canvas
- ✅ List user's canvases
- ✅ Switch between canvases
- ✅ Delete canvas
- ✅ Basic sharing (by user ID)
- ✅ Automatic migration

### Full Feature (Polish Later)
- ⏳ Thumbnails/previews
- ⏳ Email invites
- ⏳ Shareable links with access codes
- ⏳ Canvas templates
- ⏳ Duplicate canvas
- ⏳ Canvas settings (background, grid)
- ⏳ Starred/favorites
- ⏳ Search/filter

---

## 🚀 Recommended Approach

1. **Start with MVP** - Get core functionality working
2. **Test thoroughly** - Ensure data integrity
3. **Gather feedback** - See how users interact
4. **Iterate** - Add polish features based on usage

**Suggested order:**
1. Phase 1 (Foundation) - Required for everything else
2. Phase 2 (Dashboard UI) - User-facing value
3. Phase 3 (Context) - Connect it all together
4. Test & polish MVP
5. Phase 4 & 5 (if needed)

---

## ❓ Questions to Discuss

1. **Default behavior:** Should new users start with a blank canvas or a dashboard?
2. **Sharing model:** Email invites, shareable links, or direct user ID?
3. **Canvas limits:** Max canvases per user? (prevent abuse)
4. **Naming:** "Canvas", "Project", "Board", "Workspace"?
5. **Templates:** Pre-made canvas layouts? (e.g., brainstorming, wireframe)
6. **Public canvases:** Allow public/unlisted canvases?

---

**Ready to discuss?** Let me know your thoughts on this plan before we start implementing! 🎨

