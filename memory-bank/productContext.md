# Product Context

## Why This Project Exists

CollabCanvasGAI was built to **prove that bulletproof multiplayer infrastructure is achievable** before attempting a full-featured collaborative design tool. It started as an MVP validation prototype and has evolved into a feature-rich collaborative canvas demonstrating:

1. **Real-time synchronization works reliably** across multiple users
2. **Conflict resolution is possible** without complex CRDTs or OT algorithms
3. **Performance doesn't degrade** with multiple users and hundreds of objects
4. **Firebase provides sufficient infrastructure** for real-time collaboration at scale
5. **Complex features can be added** without breaking the multiplayer foundation

This project answers the question: *"Can we build a Figma-like multiplayer canvas without the complexity of custom WebSocket servers?"*

**Answer:** Yes. And we can extend it with multiple shape types, transformations, text editing, and more - all while maintaining real-time sync.

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

### User Flow: Creating a Shape
1. User selects desired shape from tool palette (rectangle, circle, polygon, text box)
2. User clicks and drags anywhere on empty canvas
3. Semi-transparent preview shape appears during drag
4. On release, shape is created with pseudorandom color from palette
5. Shape appears instantly for current user (optimistic update)
6. Shape syncs to Firestore and appears for all other users within 100ms
7. For text boxes, inline editor automatically opens for immediate text entry
8. Shape persists forever (or until deleted via Delete key)

### User Flow: Manipulating Shapes
1. User clicks a shape to select it
2. Shape shows blue selection outline with resize/rotate handles
3. Shape is locked to this user (visible to others as "locked")
4. User can:
   - **Drag:** Move the shape to new position
   - **Resize:** Drag corner/edge handles to resize
   - **Rotate:** Drag top handle to rotate
   - **Delete:** Press Delete/Backspace key to remove
   - **Edit text:** Double-click to open inline text editor
5. All changes update optimistically in local state (smooth interaction)
6. Changes sync to Firestore every 200ms during manipulation (throttled)
7. On release, final state syncs to Firestore
8. Object is unlocked and selection outline disappears when cursor leaves

### User Flow: Multi-Select
1. User selects SELECT tool from palette
2. User clicks and drags on empty canvas to draw selection rectangle
3. All shapes within rectangle become selected (blue outlines)
4. User can drag all selected shapes together
5. All selected shapes move in unison
6. Changes sync for all shapes simultaneously

### User Flow: Multiplayer Awareness
1. User sees other users' cursors moving in real-time
2. Hovering near a cursor shows the user's name label
3. When multiple cursors overlap, only the first-arrival label shows
4. Presence sidebar shows list of all currently online users
5. User count updates in real-time as users join/leave

### Navigation & Interaction Modes
The canvas has **multiple interaction modes** determined by tool selection and user input:

1. **SELECT Tool Mode:** 
   - Click shapes → selects them
   - Drag on empty canvas → draws selection rectangle (multi-select)
   - Drag selected shapes → moves them
   - Resize/rotate handles appear on selection

2. **SHAPE Tool Modes (Rectangle, Circle, Polygon, Text):**
   - Click and drag on empty canvas → creates that shape type
   - Automatic tool switch to SELECT after creating text box

3. **Pan Mode:** Hold Shift/Cmd/Ctrl + drag → pans the viewport (works in any tool)

4. **Zoom Mode:** 
   - Scroll wheel → zooms in/out at cursor position
   - Zoom controls UI → buttons for zoom in/out/reset

5. **Text Edit Mode:** Double-click any shape → opens inline text editor

6. **Delete Mode:** Select shape(s) → press Delete/Backspace → removes them

7. **Deselect:** Click empty space OR move cursor off selected shape → deselects

### Visual Feedback System
- **Selected Shape:** Blue outline with resize/rotate handles
- **Multi-selected Shapes:** Multiple blue outlines simultaneously
- **Locked Shape:** Visual indicator showing who locked it
- **Preview Shape:** Semi-transparent with dashed outline during creation
- **Selection Rectangle:** Dashed blue rectangle during multi-select drag
- **Cursor Labels:** User name appears on hover, positioned above cursor
- **Active Cursors:** Other users' cursors show during manipulation (drag/resize/rotate)
- **Connection Status:** Indicator in corner shows "Connected", "Reconnecting", or "Error"
- **FPS Counter:** (Dev mode only) Shows performance metrics
- **Shape Palette:** Left sidebar showing tool selection with active tool highlighted
- **Zoom Controls:** Right sidebar with zoom percentage and buttons
- **Chat Panel:** Right sidebar toggle for AI chat (UI only, no backend)
- **Inline Text Editor:** Overlay editor positioned at shape location with keyboard hints

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
- ✅ User creates tiny shape → Minimum size enforced per shape type
- ✅ User tries to pan beyond canvas → Clamped to 20% padding beyond boundaries
- ✅ User tries to create/move shape outside canvas → Constrained to boundaries
- ✅ User resizes shape to negative dimensions → Minimum size enforced
- ✅ User edits text and clicks away → Changes are saved automatically
- ✅ User is inactive for 30 minutes → Automatically logged out
- ✅ Multiple shapes deleted at once (Clear All) → Batch deletion with confirmation
- ✅ Text box created → Tool automatically switches to SELECT mode

### Known Limitations
- ⚠️ No undo/redo (changes are permanent)
- ⚠️ No duplicate operation (Ctrl+D)
- ⚠️ No custom color picker (pseudorandom colors only)
- ⚠️ No line/arrow shapes yet
- ⚠️ No advanced text formatting (font, size, alignment limited)
- ⚠️ Single canvas (no workspace concept)
- ⚠️ Chat UI exists but no AI backend connected

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

## Future Vision (Beyond Current State)

The MVP has been validated and extended significantly. Potential next steps:

### Immediate Opportunities
- **AI Chat Backend:** Connect chat panel to OpenAI/Anthropic for natural language shape creation
- **Duplicate Operation:** Ctrl+D to duplicate selected shapes
- **Custom Color Picker:** Let users choose specific colors for shapes
- **Line/Arrow Shapes:** Add two-point line drawing with optional arrowheads

### Medium-term Enhancements
- **Undo/Redo:** Action history with operational transformation
- **Multiple Canvas Support:** Workspace concept with canvas list
- **Layer Management:** Z-index reordering and grouping
- **Export:** PNG/SVG export functionality
- **Advanced Text Formatting:** Font picker, size control, alignment options
- **Email/Password Auth:** Third authentication option

### Long-term Vision
- **AI-powered features:** Shape recognition, auto-layout, smart suggestions
- **Voice Collaboration:** Real-time voice chat integration
- **Commenting System:** Threaded discussions on shapes
- **Version History:** Canvas snapshots and rollback
- **Permissions System:** Granular access control per canvas

The foundation is **proven and solid**. Now the focus is on strategic feature additions and AI integration.

---

*This document explains the "why" behind every decision in this project. When in doubt, refer back to the core problems we're solving.*

