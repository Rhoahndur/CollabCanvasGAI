# CollabCanvas MVP - Task List & PR Breakdown

## Key Architectural Decisions

**Rendering:** SVG-based canvas (not HTML Canvas API)  
**Frontend:** React with Vite  
**Backend:** Firebase (Firestore + Auth)  
**Authentication:** GitHub OAuth (primary), architecture supports Google/email  
**Canvas:** Fixed boundaries with visible borders and panning limits  
**Colors:** Pseudorandom assignment from 3-5 hardcoded colors  
**Object IDs:** Composite format `{userId}_{timestamp}` to prevent conflicts  
**Object Locking:** Lock objects when selected to prevent simultaneous manipulation  
**Cursor Labels:** Display on hover only, with overlap resolution via `arrivalTime`  
**Presence UI:** Sidebar (not floating panel)  

---

## Project File Structure

```
collabcanvas/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Canvas.jsx (SVG-based rendering)
│   │   ├── Rectangle.jsx (SVG rectangle component)
│   │   ├── Cursor.jsx (SVG cursor component)
│   │   ├── PresenceSidebar.jsx (sidebar for online users)
│   │   ├── LoginPage.jsx (authentication page)
│   │   └── AuthButton.jsx
│   ├── hooks/
│   │   ├── useCanvas.js
│   │   ├── useCursors.js
│   │   ├── usePresence.js
│   │   └── useAuth.js
│   ├── services/
│   │   ├── firebase.js
│   │   └── canvasService.js
│   ├── utils/
│   │   ├── canvasUtils.js
│   │   ├── colorUtils.js (pseudorandom color assignment)
│   │   └── constants.js
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
├── .env.local
├── .gitignore
├── package.json
├── vite.config.js
├── firebase.json
├── .firebaserc
└── README.md
```

---

## PR #1: Project Setup & Firebase Configuration
**Branch:** `setup/initial-config`  
**Goal:** Initialize React app with Firebase and authentication

### Tasks:
- [ ] **1.1: Initialize React project with Vite**
  - Files: `package.json`, `vite.config.js`, `index.html`, `main.jsx`
  - Actions: Run `npm create vite@latest`, select React + JavaScript
  - Install dependencies: `react`, `react-dom`

- [ ] **1.2: Install Firebase dependencies**
  - Files: `package.json`
  - Actions: Run `npm install firebase`

- [ ] **1.3: Create Firebase project & get credentials**
  - Files: `.env.local` (create)
  - Actions: 
    - Create Firebase project in console
    - Enable Firestore Database
    - Enable Firebase Authentication (GitHub provider - primary for MVP)
    - Architecture should support adding Google OAuth and email/password later
    - Copy config to `.env.local`

- [ ] **1.4: Set up Firebase service**
  - Files: `src/services/firebase.js` (create)
  - Actions: 
    - Initialize Firebase app
    - Export `auth`, `db` instances
    - Set up Firestore with proper settings

- [ ] **1.5: Configure environment variables**
  - Files: `.env.local`, `.gitignore`
  - Actions:
    - Add Firebase config variables to `.env.local`
    - Ensure `.env.local` is in `.gitignore`

- [ ] **1.6: Create basic app shell**
  - Files: `src/App.jsx`, `src/App.css`, `src/main.jsx`
  - Actions:
    - Create basic App component structure
    - Set up CSS reset and basic styling

**Acceptance Criteria:**
- Firebase connection established
- No console errors
- App runs with `npm run dev`

---

## PR #2: Authentication System
**Branch:** `feature/authentication`  
**Goal:** Implement OAuth login with GitHub (with architecture for future providers)

### Tasks:
- [ ] **2.1: Create authentication hook**
  - Files: `src/hooks/useAuth.js` (create)
  - Actions:
    - Create custom hook for auth state
    - Handle `onAuthStateChanged` listener
    - Return `user`, `loading`, `signIn`, `signOut` functions
    - Extract display name from OAuth profile (fallback to GitHub username)

- [ ] **2.2: Build LoginPage component**
  - Files: `src/components/LoginPage.jsx` (create)
  - Actions:
    - Show "Sign in with GitHub" button when logged out
    - Use `signInWithPopup` for OAuth flow
    - Style as landing/login page
    - Architecture should allow adding Google/email buttons later

- [ ] **2.3: Create authentication service functions**
  - Files: `src/services/firebase.js` (update)
  - Actions:
    - Add `signInWithGitHub()` function
    - Add `signOutUser()` function
    - Add `GithubAuthProvider` setup
    - Structure to easily add GoogleAuthProvider later

- [ ] **2.4: Integrate auth into App**
  - Files: `src/App.jsx` (update)
  - Actions:
    - Use `useAuth` hook
    - Show LoginPage component when not authenticated
    - Show canvas directly when authenticated
    - Display loading state during auth check
    - Add sign out button in canvas view

- [ ] **2.5: Style authentication UI**
  - Files: `src/App.css` (update), `src/components/LoginPage.jsx` (update)
  - Actions:
    - Style login page with modern UI
    - Style GitHub sign-in button
    - Add user info display in canvas view
    - Style sign-out button

**Acceptance Criteria:**
- Users can sign in with GitHub
- User display name appears after login (or username as fallback)
- Auth state persists on refresh
- Authenticated users go directly to canvas
- Unauthenticated users see login page
- Users can sign out

---

## PR #3: Canvas Infrastructure & Pan/Zoom
**Branch:** `feature/canvas-infrastructure`  
**Goal:** Build SVG-based canvas workspace with pan and zoom

### Tasks:
- [ ] **3.1: Create Canvas component shell**
  - Files: `src/components/Canvas.jsx` (create)
  - Actions:
    - Create SVG-based canvas container
    - Set up viewBox for pan/zoom transformations
    - Add canvas wrapper div for event handling

- [ ] **3.2: Implement pan functionality**
  - Files: `src/components/Canvas.jsx` (update), `src/utils/canvasUtils.js` (create)
  - Actions:
    - Track mouse down/move/up events
    - Update SVG viewBox for panning
    - **Implement panning limits** to prevent infinite scrolling
    - Clamp pan offset to canvas boundaries

- [ ] **3.3: Implement zoom functionality**
  - Files: `src/components/Canvas.jsx` (update)
  - Actions:
    - Handle wheel event for zoom
    - Zoom toward cursor position using viewBox transformation
    - Set min/max zoom limits (0.1x - 5x)

- [ ] **3.4: Create canvas coordinate system**
  - Files: `src/utils/canvasUtils.js` (update)
  - Actions:
    - Add `screenToCanvas(x, y, viewport)` function
    - Add `canvasToScreen(x, y, viewport)` function
    - Handle coordinate transformations

- [ ] **3.5: Add viewport state management and boundaries**
  - Files: `src/components/Canvas.jsx` (update)
  - Actions:
    - Track viewport state (offsetX, offsetY, zoom)
    - **Render visible canvas boundaries** (border/edge indicators)
    - Render grid or background within boundaries
    - Add performance monitoring (FPS counter for testing)

- [ ] **3.6: Define constants**
  - Files: `src/utils/constants.js` (create)
  - Actions:
    - Define **fixed canvas size** (e.g., 5000x5000 or similar)
    - Define canvas boundary limits
    - Define zoom limits, pan sensitivity
    - Define rectangle defaults
    - Define hardcoded colors for pseudorandom assignment (3-5 colors)

**Acceptance Criteria:**
- SVG canvas renders at 60 FPS
- Users can pan by dragging with enforced limits
- Users can zoom with mouse wheel
- **Canvas boundaries are visible**
- Panning is constrained to canvas boundaries
- Coordinate system works correctly

---

## PR #4: Firestore Schema & Canvas Service
**Branch:** `feature/firestore-schema`  
**Goal:** Set up Firestore collections and canvas data service

### Tasks:
- [ ] **4.1: Create Firestore security rules**
  - Files: `firestore.rules` (create), Firebase Console
  - Actions:
    - Set rules for `canvases/{canvasId}/objects`
    - Set rules for `canvases/{canvasId}/cursors`
    - Set rules for `canvases/{canvasId}/presence`
    - Require authentication for all operations

- [ ] **4.2: Create canvas service layer**
  - Files: `src/services/canvasService.js` (create)
  - Actions:
    - Create `createRectangle(canvasId, rectData)` function
    - **Generate object IDs** using `{userId}_{timestamp}` to prevent conflicts
    - Create `updateRectangle(canvasId, rectId, updates)` function
    - Create `lockObject(canvasId, rectId, userId)` function
    - Create `unlockObject(canvasId, rectId)` function
    - Create `deleteRectangle(canvasId, rectId)` function (future use)
    - Create `subscribeToObjects(canvasId, callback)` function

- [ ] **4.3: Define data models**
  - Files: `src/utils/constants.js` (update)
  - Actions:
    - Define Rectangle shape: `{ id (composite: userId_timestamp), x, y, width, height, color, createdBy, lockedBy, timestamp }`
    - Define Cursor shape: `{ userId, x, y, userName, timestamp, arrivalTime }`
    - Define Presence shape: `{ userId, userName, isOnline, lastSeen }`

- [ ] **4.4: Test Firestore connection**
  - Files: `src/services/canvasService.js` (update)
  - Actions:
    - Add test write to Firestore
    - Verify data appears in Firebase Console
    - Add error handling for Firestore operations

**Acceptance Criteria:**
- Firestore collections created
- Security rules in place
- Canvas service functions work
- Data persists in Firebase Console

---

## PR #5: Rectangle Creation & Rendering
**Branch:** `feature/rectangle-creation`  
**Goal:** Allow users to create and render SVG rectangles

### Tasks:
- [ ] **5.1: Create Rectangle component**
  - Files: `src/components/Rectangle.jsx` (create)
  - Actions:
    - Render SVG `<rect>` element
    - Handle rectangle styling (fill color)
    - Support selection highlight (border)
    - Apply transformations for pan/zoom

- [ ] **5.2: Create color utility**
  - Files: `src/utils/colorUtils.js` (create)
  - Actions:
    - Create `getRandomColor()` function
    - **Pseudorandomly select from 3-5 hardcoded colors**
    - No color picker UI needed

- [ ] **5.3: Implement rectangle creation**
  - Files: `src/components/Canvas.jsx` (update)
  - Actions:
    - Add click-and-drag to create rectangles
    - Calculate rectangle dimensions during drag
    - **Assign pseudorandom color on creation**
    - Call `canvasService.createRectangle()` on mouse up with composite ID

- [ ] **5.4: Set up canvas state hook**
  - Files: `src/hooks/useCanvas.js` (create)
  - Actions:
    - Manage local rectangles state
    - Subscribe to Firestore objects collection
    - Handle real-time updates from Firestore
    - Update local state when new objects arrive
    - Track locked objects

- [ ] **5.5: Render rectangles from state**
  - Files: `src/components/Canvas.jsx` (update)
  - Actions:
    - Loop through rectangles and render Rectangle components
    - Render as SVG elements within the canvas SVG
    - Apply viewport transformations via viewBox
    - Optimize rendering (only render visible objects)

- [ ] **5.6: Add visual feedback during creation**
  - Files: `src/components/Canvas.jsx` (update)
  - Actions:
    - Show preview rectangle (SVG) while dragging
    - Change cursor style during creation
    - Add minimum size validation (e.g., 20x20px)

**Acceptance Criteria:**
- Users can click and drag to create rectangles
- Rectangles are assigned pseudorandom colors
- Rectangles appear on canvas immediately as SVG elements
- Rectangles save to Firestore with composite IDs
- Multiple rectangles can be created
- Rectangles render at 60 FPS

---

## PR #6: Rectangle Movement & Selection
**Branch:** `feature/rectangle-movement`  
**Goal:** Allow users to select and move rectangles with object locking

### Tasks:
- [ ] **6.1: Implement click-to-select**
  - Files: `src/components/Canvas.jsx` (update), `src/utils/canvasUtils.js` (update)
  - Actions:
    - Add `isPointInRect(x, y, rect)` utility function
    - Detect clicks on rectangles (users must click to select before dragging)
    - Track selected rectangle ID in state
    - **Highlight selected rectangle** with border (different color and thickness)

- [ ] **6.2: Implement object locking**
  - Files: `src/components/Canvas.jsx` (update), `src/services/canvasService.js` (update)
  - Actions:
    - **Lock object when user selects it** by setting `lockedBy` field
    - Prevent other users from selecting/moving locked objects
    - **Unlock object when user deselects or releases it**
    - Visual indicator for locked objects (e.g., subtle overlay)

- [ ] **6.3: Implement rectangle dragging**
  - Files: `src/components/Canvas.jsx` (update)
  - Actions:
    - Track drag start position
    - Calculate delta during drag
    - Only allow dragging of selected (and locked) rectangles
    - Update rectangle position in local state (optimistic)
    - Show visual feedback during drag

- [ ] **6.4: Sync rectangle position to Firestore**
  - Files: `src/components/Canvas.jsx` (update), `src/services/canvasService.js` (update)
  - Actions:
    - Call `updateRectangle()` on mouse up
    - Use Firestore transactions for atomic updates
    - Add debouncing to prevent excessive writes
    - Release lock (clear `lockedBy`) when done

- [ ] **6.5: Handle edge cases**
  - Files: `src/components/Canvas.jsx` (update)
  - Actions:
    - Prevent dragging while creating new rectangle
    - Handle deselection (click empty space) and unlock object
    - **Prevent selection of objects locked by other users**
    - Show feedback when trying to select locked object

- [ ] **6.6: Add visual polish**
  - Files: `src/components/Canvas.jsx` (update), `src/App.css` (update)
  - Actions:
    - Change cursor to "move" when hovering over unlocked rectangles
    - Change cursor to "not-allowed" when hovering over locked rectangles
    - Add selection outline with distinct styling
    - Smooth drag animation

**Acceptance Criteria:**
- Users must **click to select** rectangles before dragging
- Selected rectangles show **highlighted border**
- **Object locking prevents simultaneous manipulation**
- Users can drag selected (locked) rectangles
- Position updates sync to Firestore
- Objects unlock when released
- Movement feels smooth at 60 FPS
- No jitter or lag during drag

---

## PR #7: Multiplayer Cursors
**Branch:** `feature/multiplayer-cursors`  
**Goal:** Display real-time cursor positions for all users

### Tasks:
- [ ] **7.1: Create cursor service functions**
  - Files: `src/services/canvasService.js` (update)
  - Actions:
    - Create `updateCursor(canvasId, userId, x, y, userName, arrivalTime)` function
    - Create `subscribeToCursors(canvasId, callback)` function
    - Track `arrivalTime` for cursor hover label priority
    - Add cursor cleanup on disconnect

- [ ] **7.2: Create Cursor component**
  - Files: `src/components/Cursor.jsx` (create)
  - Actions:
    - Render SVG cursor icon
    - **Display user name label on hover only**
    - Position based on canvas coordinates
    - Style with unique color per user
    - Handle label visibility logic

- [ ] **7.3: Create cursors hook**
  - Files: `src/hooks/useCursors.js` (create)
  - Actions:
    - Subscribe to cursors collection in Firestore
    - Update local cursors state in real-time
    - Filter out current user's cursor
    - Handle cursor cleanup for disconnected users

- [ ] **7.4: Track and broadcast cursor position**
  - Files: `src/components/Canvas.jsx` (update)
  - Actions:
    - Add mousemove listener
    - Throttle cursor updates (every 50ms max)
    - Convert screen coordinates to canvas coordinates
    - Call `updateCursor()` to broadcast position

- [ ] **7.5: Implement cursor overlap resolution**
  - Files: `src/components/Canvas.jsx` (update), `src/hooks/useCursors.js` (update)
  - Actions:
    - Detect when multiple cursors overlap
    - **Show label for cursor that arrived first** (use `arrivalTime`)
    - If arrival order indeterminate, pick pseudorandomly
    - Only show one label when cursors overlap

- [ ] **7.6: Render other users' cursors**
  - Files: `src/components/Canvas.jsx` (update)
  - Actions:
    - Map through cursors and render Cursor components as SVG
    - Apply viewport transformations
    - Assign unique colors to each user
    - Add smooth interpolation for cursor movement

- [ ] **7.7: Implement cursor cleanup**
  - Files: `src/hooks/useCursors.js` (update)
  - Actions:
    - Use Firebase `onDisconnect()` to remove cursor
    - Clean up Firestore listener on unmount
    - Remove stale cursors (older than 5 seconds)

**Acceptance Criteria:**
- Other users' cursors appear in real-time as SVG elements
- Cursor positions sync in <50ms
- **User names display on hover only**
- **Cursor overlap shows only one label** (first arrival or pseudorandom)
- Current user's cursor is not rendered
- Cursors disappear when users disconnect

---

## PR #8: Presence Awareness System
**Branch:** `feature/presence-awareness`  
**Goal:** Show who is currently online and active

### Tasks:
- [ ] **8.1: Create presence service functions**
  - Files: `src/services/canvasService.js` (update)
  - Actions:
    - Create `setUserPresence(canvasId, userId, userName, isOnline)` function
    - Create `subscribeToPresence(canvasId, callback)` function
    - Use `onDisconnect()` to set isOnline = false automatically

- [ ] **8.2: Create presence hook**
  - Files: `src/hooks/usePresence.js` (create)
  - Actions:
    - Subscribe to presence collection
    - Update presence list state
    - Set current user as online on mount
    - Clean up on unmount

- [ ] **8.3: Create PresenceSidebar component**
  - Files: `src/components/PresenceSidebar.jsx` (create)
  - Actions:
    - Display list of online users
    - Show user names with online indicator
    - Add user count
    - **Style as sidebar** (not floating panel)

- [ ] **8.4: Integrate presence into App**
  - Files: `src/components/Canvas.jsx` (update), `src/App.jsx` (update)
  - Actions:
    - Use `usePresence` hook
    - Set user as online when canvas loads
    - Update presence on auth state changes
    - Render PresenceSidebar component

- [ ] **8.5: Add heartbeat mechanism**
  - Files: `src/hooks/usePresence.js` (update)
  - Actions:
    - Update lastSeen timestamp every 30 seconds
    - Clean up users with lastSeen > 2 minutes ago
    - Handle browser tab visibility changes

**Acceptance Criteria:**
- Online users appear in **presence sidebar**
- User count is accurate
- Users disappear from sidebar on disconnect
- Presence updates in real-time
- Current user appears in sidebar

---

## PR #9: State Persistence & Reconnection
**Branch:** `feature/state-persistence`  
**Goal:** Ensure canvas state persists through disconnects and refreshes

### Tasks:
- [ ] **9.1: Verify Firestore persistence**
  - Files: `src/services/firebase.js` (update)
  - Actions:
    - Enable Firestore offline persistence
    - Test data persists after refresh
    - Ensure objects load on reconnection

- [ ] **9.2: Handle reconnection scenarios**
  - Files: `src/hooks/useCanvas.js` (update)
  - Actions:
    - Detect when Firestore reconnects
    - Resync canvas state on reconnection
    - Show connection status indicator (optional)

- [ ] **9.3: Test disconnection handling**
  - Files: Testing only (no file changes)
  - Actions:
    - Test with browser refresh
    - Test with network disconnect/reconnect
    - Test with all users leaving and rejoining
    - Verify no duplicate objects created

- [ ] **9.4: Add loading states**
  - Files: `src/components/Canvas.jsx` (update), `src/App.jsx` (update)
  - Actions:
    - Show loading spinner while Firestore syncs
    - Handle empty canvas state
    - Display error messages if sync fails

- [ ] **9.5: Optimize initial load**
  - Files: `src/hooks/useCanvas.js` (update)
  - Actions:
    - Load objects once on mount
    - Use Firestore query limits if needed
    - Add pagination for large canvases (future enhancement)

**Acceptance Criteria:**
- Canvas state persists after refresh
- Objects appear after all users disconnect and rejoin
- No data loss during disconnection
- Reconnection is seamless
- Loading states are clear

---

## PR #10: Performance Optimization & Testing
**Branch:** `feature/performance-optimization`  
**Goal:** Ensure 60 FPS and handle performance targets

### Tasks:
- [ ] **10.1: Add performance monitoring**
  - Files: `src/components/Canvas.jsx` (update), `src/utils/canvasUtils.js` (update)
  - Actions:
    - Add FPS counter (dev mode only)
    - Monitor render times
    - Track Firestore operation latency

- [ ] **10.2: Optimize canvas rendering**
  - Files: `src/components/Canvas.jsx` (update)
  - Actions:
    - Implement dirty rectangle rendering
    - Only redraw when state changes
    - Use `useMemo` for expensive calculations
    - Debounce viewport updates during pan/zoom

- [ ] **10.3: Optimize Firestore operations**
  - Files: `src/services/canvasService.js` (update)
  - Actions:
    - Batch write operations where possible
    - Add local caching for frequently accessed data
    - Throttle cursor updates to max 20/second
    - Use Firestore indexes for queries

- [ ] **10.4: Test with 500+ objects**
  - Files: Testing script (optional: `src/utils/testData.js`)
  - Actions:
    - Create script to generate 500 rectangles
    - Verify canvas maintains 60 FPS
    - Test pan/zoom with large object count
    - Profile render performance

- [ ] **10.5: Test with 5+ concurrent users**
  - Files: Testing only (no file changes)
  - Actions:
    - Open 5 browser windows/tabs
    - Simulate simultaneous editing
    - Verify sync latency <100ms
    - Check for memory leaks

- [ ] **10.6: Optimize bundle size**
  - Files: `vite.config.js` (update)
  - Actions:
    - Enable code splitting
    - Analyze bundle with rollup-plugin-visualizer
    - Remove unused dependencies
    - Lazy load components if needed

**Acceptance Criteria:**
- Canvas maintains 60 FPS with 500+ objects
- Object sync latency <100ms
- Cursor sync latency <50ms
- 5+ users without performance degradation
- No memory leaks during extended use

---

## PR #11: Deployment & Final Polish
**Branch:** `feature/deployment`  
**Goal:** Deploy to production and finalize MVP

### Tasks:
- [ ] **11.1: Set up Firebase Hosting**
  - Files: `firebase.json` (create), `.firebaserc` (create)
  - Actions:
    - Run `firebase init hosting`
    - Configure build directory (dist)
    - Set up deployment script in package.json

- [ ] **11.2: Configure production environment**
  - Files: `.env.production` (create), `vite.config.js` (update)
  - Actions:
    - Add production Firebase config
    - Set up environment-specific settings
    - Configure CORS if needed

- [ ] **11.3: Build and deploy**
  - Files: `package.json` (update)
  - Actions:
    - Run `npm run build`
    - Run `firebase deploy`
    - Test deployed app with multiple users
    - Verify all features work in production

- [ ] **11.4: Create README documentation**
  - Files: `README.md` (update)
  - Actions:
    - Add setup instructions
    - Document architecture overview
    - Add deployed link
    - Include screenshots/demo GIF
    - List features and tech stack

- [ ] **11.5: Final testing checklist**
  - Files: Testing only (no file changes)
  - Actions:
    - [ ] 2 users can see each other's cursors (SVG)
    - [ ] Cursor name labels show on hover only
    - [ ] Overlapping cursors show correct label
    - [ ] Creating rectangle appears for both users with pseudorandom colors
    - [ ] Click-to-select highlights rectangle with border
    - [ ] Selected object locks to user
    - [ ] Other users cannot grab locked objects
    - [ ] Moving rectangle syncs in real-time
    - [ ] Object unlocks when released
    - [ ] Refresh persists canvas state
    - [ ] Login with GitHub OAuth works
    - [ ] Display name or username shows correctly
    - [ ] Unauthenticated users see login page
    - [ ] Authenticated users go directly to canvas
    - [ ] Presence sidebar shows online users
    - [ ] Canvas boundaries are visible
    - [ ] Panning is limited to boundaries
    - [ ] Performance targets met (60 FPS, <100ms sync, <50ms cursor sync)

- [ ] **11.6: Add error boundaries and user feedback**
  - Files: `src/App.jsx` (update), `src/components/Canvas.jsx` (update)
  - Actions:
    - Add React error boundary
    - Show user-friendly error messages
    - Add toast notifications for actions (optional)
    - Handle edge cases gracefully

**Acceptance Criteria:**
- App is deployed and publicly accessible
- README is complete and accurate
- All MVP requirements are met
- Testing checklist is 100% complete
- Production app is stable

---

## Summary

**Total PRs:** 11  
**Critical Path:** PRs 1-4 must be completed first, then 5-8 in parallel, then 9-11

### PR Dependencies:
- PR #1 → PR #2 → PR #3
- PR #4 (requires PR #1, #2)
- PR #5 (requires PR #3, #4)
- PR #6 (requires PR #5)
- PR #7 (requires PR #4, can parallel with #5, #6)
- PR #8 (requires PR #4, can parallel with #5, #6, #7)
- PR #9 (requires PR #5, #6, #7, #8)
- PR #10 (requires all previous PRs)
- PR #11 (requires all previous PRs)

### Recommended Order:
1. **Phase 1:** PRs #1, #2, #3, #4 (Foundation)
2. **Phase 2:** PRs #5, #6, #7 (Core Features)
3. **Phase 3:** PRs #8, #9, #10, #11 (Polish & Deploy)