# CollabCanvas MVP - Final Testing Checklist

## Pre-Testing Setup
- [ ] Application running locally (`npm run dev`)
- [ ] Firebase project configured correctly
- [ ] Firestore rules deployed
- [ ] GitHub OAuth enabled
- [ ] 2+ browser windows/profiles ready
- [ ] Test user accounts available

---

## 1. Authentication & User Flow

### GitHub OAuth Login
- [ ] Unauthenticated users see login page
- [ ] "Sign in with GitHub" button works
- [ ] OAuth popup appears
- [ ] User can authorize app
- [ ] Successful login redirects to canvas
- [ ] User display name shows correctly (or username as fallback)
- [ ] User avatar appears in header

### Auth State Persistence
- [ ] Refresh page keeps user logged in
- [ ] Authenticated users go directly to canvas (skip login)
- [ ] "Sign Out" button works
- [ ] Sign out redirects to login page
- [ ] Sign out cleans up presence properly

---

## 2. Canvas Infrastructure

### Initial Load
- [ ] Canvas renders without errors
- [ ] Grid appears correctly
- [ ] Canvas boundaries are visible
- [ ] Loading state appears briefly
- [ ] Connection status shows "Connected"
- [ ] No console errors

### Pan & Zoom
- [ ] Click and drag pans the canvas (with Shift/Cmd held)
- [ ] Mouse wheel zooms in/out
- [ ] Zoom centers on cursor position
- [ ] Pan is constrained to canvas boundaries
- [ ] Can't pan beyond visible edges
- [ ] Zoom min/max limits work (0.1x - 5x)
- [ ] Smooth 60 FPS performance while panning
- [ ] Smooth 60 FPS performance while zooming

---

## 3. Object Creation & Rendering

### Rectangle Creation
- [ ] Click and drag creates a rectangle
- [ ] Rectangle appears immediately (optimistic update)
- [ ] Minimum size enforced (20x20px)
- [ ] Rectangles smaller than minimum don't create
- [ ] Rectangle has pseudorandom color
- [ ] Color comes from predefined palette (3-5 colors)
- [ ] Multiple rectangles can be created
- [ ] Rectangles save to Firestore successfully
- [ ] Rectangles persist after page refresh

### Multi-User Creation
- [ ] User A creates rectangle
- [ ] Rectangle appears in User B's canvas < 100ms
- [ ] Both users see same rectangle
- [ ] No duplicate IDs created
- [ ] Each rectangle has unique composite ID (`userId_timestamp`)
- [ ] Colors assigned independently per rectangle

---

## 4. Object Selection & Movement

### Click-to-Select Workflow
- [ ] Click rectangle to select it
- [ ] Selected rectangle shows highlighted border
- [ ] Border color is distinct (different from object color)
- [ ] Border is visible and clear
- [ ] Only one rectangle selected at a time
- [ ] Click another rectangle switches selection
- [ ] Click empty space deselects

### Object Locking
- [ ] Selected object locks to user immediately
- [ ] Lock stored in Firestore (`lockedBy` field)
- [ ] Other users see locked indicator on object
- [ ] Other users cannot select locked object
- [ ] Hover over locked object shows "not-allowed" cursor
- [ ] Lock displays owner's name
- [ ] Click empty space unlocks object
- [ ] Sign out/disconnect unlocks objects

### Object Movement
- [ ] Drag selected rectangle to move it
- [ ] Movement is smooth (60 FPS)
- [ ] Position updates locally immediately (optimistic)
- [ ] Position syncs to Firestore on mouse up
- [ ] Other users see movement in real-time
- [ ] Movement sync latency < 100ms
- [ ] Throttled updates during drag (every 50ms)
- [ ] Final position accurate after sync
- [ ] No jitter or lag during drag
- [ ] Movement works at different zoom levels

### Conflict Prevention
- [ ] User A selects rectangle → locks to A
- [ ] User B cannot select/move same rectangle
- [ ] User B sees lock indicator
- [ ] User A releases → unlocks immediately
- [ ] User B can now select it
- [ ] No race conditions
- [ ] No lost updates
- [ ] Clean lock/unlock cycle

---

## 5. Multiplayer Cursors

### Cursor Rendering
- [ ] Other users' cursors appear as SVG elements
- [ ] Cursor is distinct arrow/pointer shape
- [ ] Cursor has user's assigned color
- [ ] Current user's cursor is NOT rendered
- [ ] Cursors render at correct positions
- [ ] Cursors move smoothly
- [ ] Cursor positions sync in < 75ms

### Cursor Labels
- [ ] User name labels show ON HOVER only
- [ ] Label appears above/beside cursor
- [ ] Label is readable (good contrast)
- [ ] Label doesn't flicker
- [ ] Label doesn't interfere with cursor tracking
- [ ] Label disappears when not hovering

### Cursor Overlap Resolution
- [ ] Multiple cursors can overlap
- [ ] When overlapping, show label for first arrival
- [ ] Label priority based on `arrivalTime`
- [ ] Only one label shown when overlapping
- [ ] No competing/flickering labels
- [ ] Resolution is deterministic

### Cursor Cleanup
- [ ] Cursors disappear when users disconnect
- [ ] Cursors removed within 40 seconds of inactivity
- [ ] No ghost cursors remain
- [ ] Reconnecting user's cursor reappears

---

## 6. Presence Awareness

### Presence Sidebar
- [ ] Sidebar appears on right side
- [ ] Shows list of online users
- [ ] Displays user names
- [ ] Shows user count
- [ ] Current user appears in list
- [ ] User count is accurate
- [ ] Each browser session counted separately

### Presence Updates
- [ ] New user appears in sidebar < 5 seconds
- [ ] User disconnect removes from sidebar < 40 seconds
- [ ] Heartbeat keeps users online (30s intervals)
- [ ] Tab switching doesn't remove user
- [ ] Browser closing removes user quickly
- [ ] Multiple tabs from same user = multiple sessions
- [ ] Safari users show correctly (not duplicated)

### User Count Accuracy
- [ ] 1 user → shows "1 user online"
- [ ] 2 users → shows "2 users online"
- [ ] Proper singular/plural ("user" vs "users")
- [ ] Count matches presence sidebar
- [ ] Count updates in real-time

---

## 7. State Persistence & Reconnection

### Data Persistence
- [ ] Canvas state persists after refresh
- [ ] All rectangles reload correctly
- [ ] Positions accurate after reload
- [ ] Colors preserved
- [ ] No duplicate objects on reload
- [ ] Last state always recoverable

### Reconnection Handling
- [ ] Disconnect network → status shows "Reconnecting"
- [ ] Reconnect network → status shows "Connected"
- [ ] Objects sync after reconnection
- [ ] No data loss during disconnect
- [ ] App continues working offline (cached data)
- [ ] Reconnection is automatic

### Connection Status Indicator
- [ ] Shows "Connecting..." initially
- [ ] Changes to "Connected" when ready
- [ ] Shows "Reconnecting..." on network issues
- [ ] Shows "Error" on persistent failures
- [ ] Color-coded status (green, yellow, red)
- [ ] Visible in top-right corner

---

## 8. Performance Targets

### FPS Performance (Dev Mode)
- [ ] FPS counter visible in top-left
- [ ] Shows current FPS
- [ ] Shows render time
- [ ] Shows object count (visible/total)
- [ ] Maintains 60 FPS with < 50 objects
- [ ] Maintains 55+ FPS with 100 objects
- [ ] Maintains 50+ FPS with 200+ objects
- [ ] Viewport culling working (shows "Objects: 30/216 (culled)")
- [ ] Pan/zoom smooth at all object counts

### Sync Latency
- [ ] Object creation sync < 100ms
- [ ] Object movement sync < 100ms
- [ ] Cursor updates sync < 75ms
- [ ] Presence updates sync < 5 seconds

### Browser Compatibility
- [ ] Works in Chrome (latest)
- [ ] Works in Firefox (latest)
- [ ] Works in Safari (latest)
- [ ] Safari loads in < 5 seconds (not 20-30s)
- [ ] No browser-specific bugs

### Large Canvas Testing
- [ ] Generate 500 objects (window.testCanvas.generate500())
- [ ] FPS stays 50+ with 500 objects
- [ ] Pan/zoom still smooth
- [ ] No memory leaks over 5 minutes
- [ ] No performance degradation

---

## 9. Error Handling

### Error Boundary
- [ ] React errors caught gracefully
- [ ] Error boundary shows friendly message
- [ ] "Reload Page" button works
- [ ] "Try Again" button works
- [ ] Error details shown in dev mode
- [ ] No white screen of death

### Network Errors
- [ ] Firestore errors handled gracefully
- [ ] Auth errors show user-friendly messages
- [ ] Connection lost → shows status
- [ ] Quota exceeded → shows error
- [ ] Permission denied → shows error

### Edge Cases
- [ ] Empty canvas (no objects) works fine
- [ ] 1000+ objects handled (with viewport culling)
- [ ] Rapid clicking doesn't break app
- [ ] Simultaneous edits don't conflict
- [ ] Browser refresh during drag recovers gracefully

---

## 10. UI/UX Polish

### Visual Feedback
- [ ] Instructions visible at bottom
- [ ] Clear hover states on rectangles
- [ ] Cursor changes appropriately (pointer, move, not-allowed)
- [ ] Loading spinner during initial load
- [ ] Smooth animations
- [ ] No jarring transitions

### Usability
- [ ] Instructions are clear
- [ ] Login flow is intuitive
- [ ] Canvas controls are discoverable
- [ ] Keyboard shortcuts work (Shift for pan)
- [ ] Help text is accurate
- [ ] No confusing UI elements

### Accessibility
- [ ] Color contrast sufficient
- [ ] Text is readable
- [ ] Interactive elements have good hit targets
- [ ] Keyboard navigation works where applicable

---

## 11. Multi-User Scenarios

### 2 User Test
- [ ] User A and User B can see each other
- [ ] Both in presence sidebar
- [ ] Cursors visible to each other
- [ ] Cursor labels show on hover
- [ ] A creates object → B sees it
- [ ] B moves object → A sees it
- [ ] Object locking prevents conflicts
- [ ] Chat/collaboration feels natural

### 5 User Test
- [ ] Open 5 browser windows/profiles
- [ ] All 5 users in presence sidebar
- [ ] All cursors visible
- [ ] No performance degradation
- [ ] Sync still fast (< 100ms)
- [ ] FPS maintained (55+)
- [ ] No lag or stuttering

### Stress Test
- [ ] 2 users creating objects simultaneously
- [ ] 2 users moving different objects simultaneously
- [ ] Rapid create/move/delete actions
- [ ] No data loss
- [ ] No race conditions
- [ ] System remains stable

---

## 12. Production Readiness

### Build & Deploy
- [ ] `npm run build` completes without errors
- [ ] Build output in `dist/` folder
- [ ] Assets properly minified
- [ ] Source maps generated (or disabled for production)
- [ ] `npm run deploy` works
- [ ] Firebase hosting deploys successfully

### Production Checks
- [ ] FPS counter NOT visible in production
- [ ] Console.log statements removed in production
- [ ] Error messages user-friendly (not technical)
- [ ] Performance is good
- [ ] All features work in deployed version

### Security
- [ ] Firestore rules deployed
- [ ] Auth required for all operations
- [ ] `.env.local` not in Git
- [ ] Firebase config not exposed insecurely
- [ ] CORS configured if needed

---

## Final Sign-Off

**Date Tested:** _______________

**Tester:** _______________

**Browser:** _______________

**Issues Found:** _______________

**Ready for Production:** [ ] YES [ ] NO

**Notes:**
```
(Add any additional observations or concerns here)
```

---

## Scoring

Total Items: ~180

**MVP Criteria:**
- **Critical (Must Pass):** 150+ items ✅
- **Important (Should Pass):** 165+ items ✅
- **Perfect (All Pass):** 180 items ✅

**Current Score:** _____ / 180 (___%)

---

## Next Steps

If any critical items fail:
1. Document the issue in GitHub Issues
2. Prioritize by severity
3. Fix and re-test
4. Update this checklist

If all critical items pass:
- 🎉 **MVP is complete!**
- Deploy to production
- Monitor for issues
- Gather user feedback
- Plan next features

---

**Remember:** This is an MVP. Not everything needs to be perfect, but core functionality must work reliably for multiple users in real-time.

