# Product Context

## Why This Project Exists

CollabCanvasGAI was built to **prove that bulletproof multiplayer infrastructure is achievable** before attempting a full-featured collaborative design tool. It's a validation prototype that demonstrates:

1. **Real-time synchronization works reliably** across multiple users
2. **Conflict resolution is possible** without complex CRDTs or OT algorithms
3. **Performance doesn't degrade** with multiple users and hundreds of objects
4. **Firebase provides sufficient infrastructure** for real-time collaboration at scale

This project answers the question: *"Can we build a Figma-like multiplayer canvas without the complexity of custom WebSocket servers?"*

## Problems It Solves

### 1. Multiplayer Proof of Concept
**Problem:** Collaborative editing is notoriously difficult. Most projects fail by building features first and adding multiplayer as an afterthought.

**Solution:** This project takes the opposite approach: multiplayer-first architecture. Every feature is built with collaboration in mind from day one.

### 2. Real-time Synchronization
**Problem:** Users need to see changes from other users instantly (<100ms) or the experience feels broken.

**Solution:** 
- Firestore `onSnapshot` listeners provide automatic real-time updates
- Optimistic updates for dragging provide instant local feedback
- Throttled Firestore writes during drag prevent excessive database load

### 3. Conflict Prevention
**Problem:** When multiple users try to move the same object, race conditions create a chaotic experience.

**Solution:**
- **Object locking mechanism:** When User A selects an object, it's locked to them
- Other users see a visual indicator that the object is locked
- Locked objects cannot be selected or moved until released
- Locks automatically release on disconnect (using Firebase `onDisconnect()`)

### 4. State Persistence
**Problem:** Users expect their work to persist through refreshes, disconnects, and browser restarts.

**Solution:**
- All canvas data stored in Firestore (not local state)
- Firestore offline persistence enabled (IndexedDB caching)
- Users rejoining see the exact canvas state they left
- No data loss on disconnect or refresh

### 5. Performance at Scale
**Problem:** Canvas performance degrades rapidly with hundreds of objects and multiple users.

**Solution:**
- **Viewport culling:** Only render objects visible in current viewport (85% reduction)
- **React.memo** on Rectangle component prevents unnecessary re-renders
- **Throttled updates:** Cursor updates limited to 75ms, drag updates to 200ms
- **Code splitting:** React and Firebase loaded as separate bundles
- **SVG rendering:** Hardware-accelerated, crisp at any zoom level

## How It Should Work

### User Flow: First-Time User
1. **Landing:** User visits the app URL
2. **Authentication:** Sees login page with "Sign in with GitHub" button
3. **OAuth:** Clicks button → GitHub OAuth flow → authenticated
4. **Canvas:** Immediately redirected to shared canvas with all existing rectangles visible
5. **Exploration:** User can pan, zoom, create rectangles, and see other users' cursors
6. **Collaboration:** Other users' actions appear in real-time

### User Flow: Creating a Rectangle
1. User clicks and drags anywhere on empty canvas
2. Semi-transparent preview rectangle appears during drag
3. On release, rectangle is created with pseudorandom color from palette
4. Rectangle appears instantly for current user (optimistic update)
5. Rectangle syncs to Firestore and appears for all other users within 100ms
6. Rectangle persists forever (or until manually deleted in Firestore Console)

### User Flow: Moving a Rectangle
1. User clicks a rectangle to select it
2. Rectangle shows blue selection outline
3. Rectangle is locked to this user (visible to others as "locked")
4. User drags the rectangle to new position
5. Position updates optimistically in local state (smooth dragging)
6. Position syncs to Firestore every 200ms during drag (throttled)
7. On release, final position syncs to Firestore
8. Object is unlocked and selection outline disappears when cursor leaves

### User Flow: Multiplayer Awareness
1. User sees other users' cursors moving in real-time
2. Hovering near a cursor shows the user's name label
3. When multiple cursors overlap, only the first-arrival label shows
4. Presence sidebar shows list of all currently online users
5. User count updates in real-time as users join/leave

### Navigation & Interaction Modes
The canvas has **multiple interaction modes** determined by user input:

1. **Drawing Mode:** Click and drag on empty canvas → creates rectangle
2. **Select Mode:** Click on existing rectangle → selects it (shows outline)
3. **Drag Mode:** Click and drag selected rectangle → moves it
4. **Pan Mode:** Hold Shift/Cmd/Ctrl + drag → pans the viewport
5. **Zoom Mode:** Scroll wheel → zooms in/out at cursor position
6. **Deselect:** Click empty space OR move cursor off selected rectangle → deselects

### Visual Feedback System
- **Selected Rectangle:** Blue outline, thicker border
- **Locked Rectangle:** Visual indicator showing who locked it
- **Preview Rectangle:** Semi-transparent with dashed outline during creation
- **Cursor Labels:** User name appears on hover, positioned above cursor
- **Connection Status:** Indicator in corner shows "Connected", "Reconnecting", or "Error"
- **FPS Counter:** (Dev mode only) Shows performance metrics

## User Experience Goals

### Feel
The app should feel **instant and responsive**:
- No lag between user action and visual feedback
- Other users' actions appear seamlessly, not jarring
- Smooth 60 FPS animations during pan, zoom, and drag
- Natural cursor tracking that doesn't feel delayed

### Simplicity
The interface is intentionally minimal:
- No complex menus or toolbars (just the canvas)
- Keyboard shortcuts for power users (Shift to pan)
- Intuitive: if you've used any drawing app, you know how this works
- Clear visual hints: cursor style changes to indicate mode

### Collaboration
Users should **feel connected** to others on the canvas:
- See exactly what others are doing in real-time
- Object locking prevents frustration (no fighting over objects)
- Presence sidebar creates sense of shared workspace
- Cursor names create identity and accountability

### Reliability
The experience should be **rock-solid**:
- Connection status always visible (no mystery failures)
- Graceful handling of network interruptions
- Clear error messages when something goes wrong
- Loading states prevent confusion during initial sync

## Edge Cases & Constraints

### Handled Edge Cases
- ✅ User selects object, another user tries to select it → Second user blocked
- ✅ User is dragging, loses connection → Drag completes locally, syncs when reconnected
- ✅ User refreshes while dragging → Lock released via `onDisconnect()`
- ✅ Multiple cursors overlap → Only first-arrival label shown
- ✅ User creates tiny rectangle → Minimum size enforced (20×20px)
- ✅ User tries to pan beyond canvas → Clamped to boundaries

### Known Limitations
- ⚠️ No delete operation (must use Firestore Console)
- ⚠️ No undo/redo (changes are permanent)
- ⚠️ No multi-select (only one rectangle at a time)
- ⚠️ GitHub OAuth only (Google/email not yet implemented)
- ⚠️ Single canvas (no workspace concept)

## Success Metrics

### Quantitative
- **Sync Latency:** Average time for changes to appear for other users (<100ms target)
- **Cursor Latency:** Average time for cursor updates to propagate (<50ms target, 75ms actual)
- **Frame Rate:** Maintain 60 FPS during all interactions with 500+ objects
- **Concurrent Users:** Support 5+ simultaneous users without degradation
- **Uptime:** App remains stable during extended testing sessions

### Qualitative
- **Feels instant:** Users don't perceive lag in their own actions
- **Feels connected:** Users feel like they're in a shared space
- **Feels reliable:** Users trust their changes will persist
- **Feels polished:** UI is clean and professional

## Future Vision (Post-MVP)

If this MVP succeeds, potential next steps:
- Additional shape types (circles, lines, text)
- Delete and duplicate operations
- Undo/redo with operational transformation
- Multiple canvas support (workspaces)
- Custom color picker
- Layer management and z-index
- Export to PNG/SVG
- AI-powered features (shape recognition, auto-layout)

But for now, the focus is **proving the foundation is solid**.

---

*This document explains the "why" behind every decision in this project. When in doubt, refer back to the core problems we're solving.*

