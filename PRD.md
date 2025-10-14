# CollabCanvas MVP - Product Requirements Document

## Project Overview

**Product Name:** CollabCanvas  
**Objective:** Build a real-time collaborative canvas that proves the foundation is solid for multiplayer design tools

**Scope:** Single shared canvas accessible to all authenticated users

## Success Criteria

The MVP is a **hard gate**. Success means demonstrating bulletproof multiplayer infrastructure over feature richness.

---

## MVP Requirements (Must-Have)

### 1. Canvas Infrastructure

#### 1.1 Canvas Workspace
- **Large workspace** with pan and zoom functionality
- Smooth 60 FPS performance during all interactions
- **Fixed canvas boundaries** with visible border/edge indicators
- Set panning limits to prevent infinite scrolling
- Canvas should feel spacious for testing

#### 1.2 Shape Support
- **Rectangle shapes only** for MVP
- Solid color fill for rectangles
- Rectangles must be creatable via click-and-drag or click interaction
- **Color assignment:** Pseudorandomly assign from a small set of hardcoded colors (3-5 colors)
- No color picker UI required for MVP
- Basic properties: position (x, y), dimensions (width, height), color, createdBy, lockedBy

#### 1.3 Object Manipulation
- **Create objects** on the canvas via click-and-drag
- **Selection:** Click on any rectangle to select it before moving
- **Move objects** by dragging selected rectangles
- **Object locking:** When a user selects/grabs an object, it becomes locked to that user
- Other users cannot grab or move a locked object until the current user releases it
- Objects persist their position after manipulation

#### 1.4 UI/UX Elements
- **Selection feedback:** Selected rectangles display a highlighted border (different color and thickness)
- **Cursor name labels:** Display user names on hover only
  - If multiple cursors overlap, show the label for whichever cursor arrived first
  - If arrival order is indeterminate, pick one pseudorandomly
- **Presence sidebar:** Show list of currently active users
- **Entry flow:** 
  - Unauthenticated users see login page
  - Authenticated users go directly to the canvas

---

### 2. Real-Time Collaboration (Critical)

#### 2.1 Multiplayer Cursors
- Display cursor positions from all connected users
- **Name labels** attached to each cursor
- Cursor positions sync in **<50ms**

#### 2.2 Real-Time Synchronization
- Object changes broadcast to all users
- Objects appear/update **instantly** (<100ms sync time)
- Support **2+ simultaneous users**

#### 2.3 Presence Awareness
- Display **who's currently online**
- Show user connection/disconnection status
- Clear indication of active editors

---

### 3. User Authentication

#### 3.1 User Accounts
- **OAuth authentication via Firebase Auth**
- **Primary provider:** GitHub
- **Future flexibility:** Architecture should support Google OAuth and email/password authentication
- User display name pulled from OAuth profile (fallback to username if display name unavailable)
- Session management handled by Firebase Auth

#### 3.2 User Identification
- Each user has a unique UUID from Firebase Auth
- Username/display name from OAuth profile (fallback to GitHub username)
- Username displayed with cursor (on hover) and in presence list

---

### 4. State Persistence

#### 4.1 Canvas State Management
- Canvas state must **persist** when all users disconnect
- Users returning to the canvas see their previous work
- No data loss on refresh or disconnect

#### 4.2 Reconnection Handling
- Handle disconnects gracefully without breaking the experience
- Automatic state sync on reconnect
- No duplicate objects or sync conflicts on rejoin

---

### 5. Deployment

#### 5.1 Public Accessibility
- Application must be **deployed and publicly accessible**
- URL shareable for multi-user testing
- Recommended platforms: Vercel, Firebase Hosting, or Render

#### 5.2 Reliability
- Must support 5+ concurrent users without degradation
- No crashes under normal testing conditions

---

## Technical Architecture Requirements

### Frontend Stack

**Framework:** React  
**Rendering:** SVG for canvas elements  
**State Management:** React Context or lightweight state library  
**Styling:** CSS-in-JS or Tailwind CSS

### Backend Stack (Selected)

**Primary Backend: Firebase**

#### Why Firebase for MVP:
- Real-time Database or Firestore with built-in real-time sync
- Integrated Firebase Authentication with OAuth providers
- Automatic data synchronization across clients
- Generous free tier (Spark plan) suitable for MVP testing
- Excellent documentation and TypeScript support
- Simple deployment with Firebase Hosting

#### Firebase Architecture:
1. **Firestore Collections:**
   - `canvases/{canvasId}/objects` - stores rectangle data
     - Fields: `id` (composite: userId + timestamp), `x`, `y`, `width`, `height`, `color`, `createdBy` (userId), `lockedBy` (userId or null), `timestamp`
     - **Object ID generation:** Incorporate user ID into object ID to prevent creation conflicts (e.g., `{userId}_{timestamp}`)
   - `canvases/{canvasId}/cursors` - stores real-time cursor positions
     - Fields: `userId`, `x`, `y`, `userName`, `timestamp`, `arrivalTime` (for hover label priority)
   - `canvases/{canvasId}/presence` - tracks active users
     - Fields: `userId`, `userName`, `isOnline`, `lastSeen`

2. **Real-time Listeners:**
   - `onSnapshot()` listener on `objects` subcollection for rectangle sync
   - `onSnapshot()` listener on `cursors` subcollection for multiplayer cursors
   - `onSnapshot()` listener on `presence` subcollection for presence awareness

3. **Authentication:**
   - Firebase Auth with OAuth (GitHub)
   - User display name from OAuth profile or `displayName` field
   - Auth state persistence built-in

### Conflict Resolution

#### Object Manipulation Conflicts
- **Object locking mechanism:** When a user selects an object, set `lockedBy` field to that user's ID
- Locked objects cannot be selected or moved by other users
- Lock is released when user deselects or stops dragging the object
- Visual indicator (e.g., subtle overlay or different border color) for locked objects

#### Object Creation Conflicts
- **Collision prevention:** Object IDs include user ID (e.g., `{userId}_{timestamp}`)
- Simultaneous object creation will generate unique IDs

#### General Approach
- **"Last write wins"** for position updates
- Must document and test conflict scenarios

---

## Testing Scenarios

The MVP will be tested with:

1. **2 users editing simultaneously** - Open in Chrome + Firefox (or Chrome + Chrome Incognito)
2. **One user refreshing mid-edit** - Confirm rectangles persist after page reload
3. **Multiple rectangles being created and moved rapidly** - Test sync performance and conflict resolution
4. **Object locking test** - User A selects/moves an object while User B attempts to grab it (should be prevented)
5. **Cursor hover labels** - Test cursor name label visibility on hover with overlapping cursors
6. **Presence awareness** - Test user connection/disconnection updates in sidebar

### Testing Setup
- **Browser 1:** Chrome (signed in as User A)
- **Browser 2:** Firefox or Incognito (signed in as User B)
- **Network throttling:** Test with Chrome DevTools "Fast 3G" to simulate real conditions
- **Simultaneous actions:** Both users create/move rectangles at the same time

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Frame Rate | 60 FPS during all interactions |
| Object Sync Latency | <100ms |
| Cursor Sync Latency | <50ms |
| Object Capacity | 500+ simple objects without FPS drops |
| Concurrent Users | 5+ users without degradation |

---

## Out of Scope for MVP

The following features are **NOT required** for MVP:
- Multiple shape types (circles, text, lines, polygons)
- Advanced selection (multi-select, drag-to-select, lasso selection)
- Transformations (resize, rotate, skew)
- Layer management (z-index reordering, grouping)
- Delete/duplicate operations
- Color picker UI (colors are pseudorandomly assigned)
- Custom color selection
- Text formatting or text objects
- Lines, arrows, or complex shapes
- AI agent capabilities
- Undo/redo functionality
- Export/import features
- Multiple canvas support
- Canvas sharing/permissions

---

## Development Strategy

### Phase 1: Core Sync (Priority 1)
1. Get two cursors syncing
2. Get objects syncing
3. Handle basic conflicts
4. Persist state

### Phase 2: Basic Interaction (Priority 2)
1. Add pan/zoom
2. Add shape creation
3. Add object movement

### Phase 3: Polish (Priority 3)
1. Optimize performance
2. Add presence indicators
3. Test under load

### Anti-Pattern to Avoid
❌ Building features first, multiplayer last = **FAILURE**  
✅ Multiplayer first, features second = **SUCCESS**

---

## Submission Checklist

- [ ] Canvas with pan/zoom working and visible boundaries
- [ ] Rectangle shapes implemented with pseudorandom color assignment
- [ ] Objects can be created via click-and-drag
- [ ] Click-to-select object interaction working
- [ ] Selected objects show border highlight
- [ ] Object dragging/movement functional
- [ ] Object locking prevents simultaneous manipulation
- [ ] Real-time sync working between 2+ users
- [ ] Multiplayer cursors with name labels on hover
- [ ] Presence sidebar showing who's online
- [ ] Firebase Auth with GitHub OAuth working
- [ ] Login page for unauthenticated users
- [ ] Direct canvas access for authenticated users
- [ ] SVG rendering working smoothly
- [ ] Deployed and publicly accessible
- [ ] Tested with 2+ simultaneous users
- [ ] State persists through disconnect/reconnect
- [ ] Performance targets met (60 FPS, <100ms sync)

---

## Risk Mitigation

### High-Risk Areas
1. **Real-time sync complexity** - Start here first, test early and often
2. **State conflicts** - Implement simple conflict resolution immediately
3. **Performance degradation** - Profile early, optimize render loops
4. **Deployment issues** - Deploy early, test in production environment

### Mitigation Strategies
- Test with multiple browser windows continuously
- Throttle network speed to simulate poor connections
- Test with 3-4 users minimum before submission
- Monitor performance metrics in dev tools

---

## Definition of Success

**MVP passes if:**
- Two users can see each other's cursors moving in real-time
- Creating/moving an object appears instantly for both users
- Refreshing the page doesn't lose canvas state
- The app doesn't crash or lag under basic multi-user testing
