# Performance Testing Guide

This guide explains how to test the CollabCanvas application for performance with multiple users and large numbers of objects.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Testing with 500+ Objects](#testing-with-500-objects)
- [Testing with 5+ Concurrent Users](#testing-with-5-concurrent-users)
- [Performance Metrics](#performance-metrics)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

1. **Development Environment**
   - Run the app in development mode: `npm run dev`
   - Ensure `SHOW_FPS_COUNTER` is set to `true` in `src/utils/constants.js`

2. **Firebase Setup**
   - Ensure Firestore is properly configured
   - Check that security rules allow authenticated operations

3. **Browser**
   - Use Chrome or Firefox for best performance profiling tools
   - Enable multiple browser profiles for multi-user testing

---

## Testing with 500+ Objects

### Using the Test Utility

The application includes a built-in test data generator. When running in dev mode with FPS counter enabled:

1. **Open Browser Console**
   - Press F12 or Cmd+Option+I (Mac) / Ctrl+Shift+I (Windows/Linux)

2. **Generate Test Rectangles**
   ```javascript
   // Generate 500 random rectangles
   window.testCanvas.generate500()
   
   // Generate 1000 random rectangles
   window.testCanvas.generate1000()
   
   // Generate a grid of rectangles (e.g., 20x25 = 500)
   window.testCanvas.generateGrid(20, 25)
   ```

3. **Monitor Performance**
   - Watch the FPS counter in the top-left corner
   - Check render time (should be < 16.67ms for 60 FPS)
   - Monitor object count

### Performance Targets
- **FPS:** Should maintain 60 FPS with 500+ objects
- **Render Time:** < 16ms per frame
- **Pan/Zoom:** Smooth interaction with no lag
- **Memory:** No significant memory leaks over 5+ minutes

### Manual Testing Checklist
- [ ] Create 500 objects using test utility
- [ ] Pan around the canvas - should be smooth
- [ ] Zoom in and out - no lag
- [ ] Select and move rectangles - responsive
- [ ] Monitor FPS counter stays at ~60 FPS
- [ ] Check browser memory usage (Chrome DevTools > Memory)
- [ ] Leave canvas idle for 5 minutes - check for memory leaks

---

## Testing with 5+ Concurrent Users

### Setup

You'll need to simulate multiple users accessing the canvas simultaneously. Here are three approaches:

#### Option 1: Multiple Browser Profiles (Recommended)

**Chrome:**
1. Click the profile icon in the top-right
2. Click "Add" to create new profiles
3. Create 5 separate Chrome profiles
4. Open a window for each profile
5. Log in with different GitHub accounts (or same account in different tabs)

**Firefox:**
1. Type `about:profiles` in the address bar
2. Create 5 new profiles
3. Launch Firefox with each profile
4. Log in to the app in each window

#### Option 2: Multiple Browsers
- Use different browsers: Chrome, Firefox, Safari, Edge, Brave
- Log in with the same or different accounts in each
- Arrange windows side-by-side to monitor all simultaneously

#### Option 3: Incognito/Private Windows
- Open 5 incognito/private windows
- Log in to each (if using GitHub OAuth, you'll need different accounts)
- Note: Some browsers limit number of concurrent private windows

### Testing Scenarios

#### Scenario 1: Simultaneous Object Creation
1. Have all 5 users create rectangles at the same time
2. Monitor sync latency (objects should appear in < 100ms)
3. Check for conflicts or duplicate IDs

#### Scenario 2: Simultaneous Object Movement
1. Have each user select and move different rectangles
2. Ensure object locking works (no conflicts)
3. Verify smooth synchronization across all clients

#### Scenario 3: Mixed Interactions
1. User 1: Creates new rectangles
2. User 2: Moves existing rectangles
3. User 3: Pans and zooms
4. User 4: Selects objects
5. User 5: Hovers over cursors
6. Monitor: All users see updates in real-time

#### Scenario 4: Cursor Tracking
1. Move mouse in all 5 windows simultaneously
2. Verify cursors appear with correct labels
3. Check cursor update latency (< 50ms)
4. Test hover label display on cursor overlap

#### Scenario 5: Load Test
1. Generate 500 objects (using test utility in one window)
2. Have all 5 users interact with the canvas
3. Monitor FPS and render time in all windows
4. Verify no performance degradation

### Performance Targets (Multi-User)
- **Object Sync Latency:** < 100ms
- **Cursor Sync Latency:** < 50ms
- **FPS:** Maintained at ~60 FPS across all clients
- **Lock Conflicts:** Zero (object locking should prevent)
- **Presence Updates:** All users visible in sidebar

### Multi-User Testing Checklist
- [ ] 5+ users connected simultaneously
- [ ] All users see each other in presence sidebar
- [ ] Cursor positions sync in real-time
- [ ] Cursor labels display on hover
- [ ] Object creation syncs across all clients
- [ ] Object movement syncs across all clients
- [ ] Object locking prevents conflicts
- [ ] No duplicate objects created
- [ ] Connection status indicator works correctly
- [ ] Reconnection handling works after network interruption
- [ ] No performance degradation with multiple users

---

## Performance Metrics

### Key Metrics to Monitor

1. **Frames Per Second (FPS)**
   - **Target:** 60 FPS
   - **Acceptable:** 55+ FPS under load
   - **Location:** Top-left FPS counter

2. **Render Time**
   - **Target:** < 16.67ms (for 60 FPS)
   - **Acceptable:** < 20ms
   - **Location:** FPS counter display

3. **Object Sync Latency**
   - **Target:** < 100ms
   - **How to measure:** Create object in one window, time until visible in another
   - **Use:** `performance.now()` in console before/after

4. **Cursor Sync Latency**
   - **Target:** < 50ms
   - **How to measure:** Move mouse, observe cursor position in other window
   - **Note:** Should feel real-time

5. **Memory Usage**
   - **Check:** Chrome DevTools > Performance > Memory
   - **Target:** No memory leaks (stable memory over time)
   - **Test:** Run for 10+ minutes with interactions

6. **Network Usage**
   - **Check:** Browser DevTools > Network tab
   - **Note:** Firestore traffic, cursor updates
   - **Target:** Reasonable bandwidth usage

### Using Browser DevTools

#### Chrome DevTools
```
1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record (circle icon)
4. Interact with canvas for 30 seconds
5. Stop recording
6. Analyze:
   - Frames (should be stable ~60 FPS)
   - JS execution time
   - Rendering time
   - Memory usage
```

#### Memory Profiling
```
1. Open DevTools > Memory
2. Take heap snapshot (initial)
3. Interact with canvas for 5 minutes
4. Take another heap snapshot
5. Compare:
   - Memory growth should be minimal
   - No significant object accumulation
```

---

## Troubleshooting

### Low FPS with Many Objects

**Symptoms:** FPS drops below 30 with 500+ objects

**Solutions:**
- Check `useMemo` is working (grid should only recalculate on zoom)
- Verify viewport culling (only visible objects rendered)
- Profile with Chrome DevTools to find bottleneck
- Check for unnecessary re-renders

### High Sync Latency

**Symptoms:** Objects take > 200ms to sync between clients

**Possible Causes:**
- Network latency (check internet connection)
- Firestore throttling (too many writes)
- Browser tab throttling (tab in background)

**Solutions:**
- Ensure cursor updates are throttled to 50ms
- Check Firebase console for quota issues
- Keep browser tabs in foreground during testing
- Verify Firestore indexes are created

### Cursor Lag

**Symptoms:** Cursors jump or lag behind actual position

**Solutions:**
- Verify `CURSOR_UPDATE_THROTTLE` is set to 50ms
- Check network latency
- Ensure cursors use optimistic updates
- Profile network traffic in DevTools

### Memory Leaks

**Symptoms:** Memory usage grows continuously over time

**Solutions:**
- Verify all Firestore listeners are cleaned up (useEffect cleanup)
- Check for event listener leaks (mouseMove, etc.)
- Ensure refs are cleaned up properly
- Use Chrome DevTools Memory profiler to identify

### Object Locking Conflicts

**Symptoms:** Two users can manipulate the same object

**Solutions:**
- Verify object locking logic in `useCanvas` hook
- Check Firestore security rules
- Ensure `lockedBy` field is checked before operations
- Test with rapid concurrent selections

---

## Automated Testing (Future Enhancement)

For continuous performance monitoring, consider:
- Playwright/Puppeteer for automated multi-window testing
- Lighthouse CI for performance budgets
- Firebase Emulator for consistent test environment
- Custom performance monitoring dashboard

---

## Reporting Issues

When reporting performance issues, include:
1. Browser and version
2. Number of objects on canvas
3. Number of concurrent users
4. FPS and render time from counter
5. Chrome DevTools performance profile (if available)
6. Network conditions (WiFi, LTE, etc.)
7. Steps to reproduce

---

## Performance Optimization Checklist

- [x] FPS counter showing real-time performance
- [x] Render time tracking
- [x] useMemo for expensive calculations (viewBox, grid, preview rect)
- [x] Cursor updates throttled to 50ms (20/sec)
- [x] Drag updates throttled to 50ms
- [x] Viewport culling (only render visible objects)
- [x] Code splitting in Vite config
- [x] Firebase operations optimized
- [x] Test utilities for 500+ objects
- [x] Multi-user testing documented

---

## Next Steps

After testing, you may want to:
1. Set up continuous performance monitoring
2. Add automated performance tests
3. Create performance budgets
4. Implement progressive rendering for 1000+ objects
5. Add virtual scrolling for extreme object counts

