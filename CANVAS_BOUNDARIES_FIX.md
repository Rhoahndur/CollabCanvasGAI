# Canvas Boundaries Fix for Canny AI

## Issues Fixed

### 1. ✅ Canny Can No Longer Place Shapes Outside Canvas
**Problem:** Canny's tools could create/move shapes beyond the 5000x5000 canvas boundaries.

**Solution:** Added comprehensive boundary enforcement to all canvas manipulation tools.

### 2. ⏳ Anonymous Users Fix (Needs Deployment)
**Problem:** "Anonymous" still showing in production (already fixed in code).

**Solution:** Deploy latest code containing the PresenceSidebar.jsx fix.

---

## Technical Changes

### Canvas Boundary Constraints

**Canvas Size:** `5000x5000 pixels` (0,0) to (5000,5000)

**Tools Updated:**
- ✅ `createShape()` - All new shapes constrained to boundaries
- ✅ `updateShapeProperties()` - Position updates constrained
- ✅ `alignShapes()` - Aligned positions constrained
- ✅ `distributeShapes()` - Distributed positions constrained
- ✅ `arrangeInGrid()` - Grid layout constrained to fit within canvas

**Constraint Functions Used:**
```javascript
constrainRectangle(x, y, width, height, CANVAS_WIDTH, CANVAS_HEIGHT)
constrainCircle(x, y, radius, CANVAS_WIDTH, CANVAS_HEIGHT)
clamp(value, min, max)
```

---

## System Prompt Updates

Added to both `server.js` and `api/chat.js`:

```
CRITICAL - Canvas Boundaries:
- The canvas has FIXED boundaries: 0 to 5000 for both X and Y coordinates
- ALL shapes MUST stay within these boundaries (0-5000 for x, 0-5000 for y)
- The tools will automatically constrain shapes to these boundaries
- You CANNOT create or move shapes outside this range
- Treat the canvas as a 5000x5000 pixel space
```

This informs Canny about the constraints and helps it make better decisions.

---

## Files Modified

1. **src/utils/canvasTools.js**
   - Added imports for `CANVAS_WIDTH`, `CANVAS_HEIGHT`, `constrainRectangle`, `constrainCircle`, `clamp`
   - Updated `handleCreateShape()` with boundary checks
   - Updated `handleUpdateShapeProperties()` with boundary checks
   - Updated `handleAlignShapes()` with boundary checks
   - Updated `handleDistributeShapes()` with boundary checks
   - Updated `handleArrangeInGrid()` with boundary checks

2. **server.js**
   - Added "CRITICAL - Canvas Boundaries" section to system prompt

3. **api/chat.js**
   - Added "CRITICAL - Canvas Boundaries" section to system prompt

4. **src/components/CanvasSettingsModal.jsx**
   - Enhanced error logging for debugging canvas background settings

5. **src/services/canvasService.js**
   - Enhanced logging in `updateCanvasMetadata()` for debugging

---

## How Constraints Work

### For Each Tool Operation:

1. **Calculate desired position** (from user request or tool logic)
2. **Apply shape-type-specific constraints:**
   - **Rectangles/Text:** `constrainRectangle()` - ensures entire shape is within bounds
   - **Circles/Polygons:** `constrainCircle()` - ensures circle with radius is within bounds
   - **Custom Polygons:** `clamp()` - ensures center point is within bounds with margin
   - **Other types:** Generic `clamp()` to 0-5000 range
3. **Update shape with constrained position**

### Example:

```javascript
// User asks Canny: "Create a rectangle at (10000, 10000)"

// Without constraints: Shape created at (10000, 10000) - outside canvas!
// With constraints: Shape created at (4950, 4950) - at canvas edge ✅

// The constraint function ensures:
// - x: clamp(10000, 0, 5000-100) = 4900 (accounting for width)
// - y: clamp(10000, 0, 5000-100) = 4900 (accounting for height)
```

---

## Testing Checklist

### Test Canny Boundary Constraints:

- [ ] Ask Canny: "Create 5 rectangles at position (10000, 10000)"
  - Expected: Shapes appear at canvas boundary, not off-screen
  
- [ ] Ask Canny: "Move all shapes to (-1000, -1000)"
  - Expected: Shapes move to (0, 0) or close to it
  
- [ ] Ask Canny: "Arrange 100 shapes in a 10x10 grid"
  - Expected: Grid fits within canvas, shapes don't go outside
  
- [ ] Ask Canny: "Align all shapes to the right"
  - Expected: Shapes align but stay within right boundary
  
- [ ] Ask Canny: "Create a circle with radius 1000 at (4500, 4500)"
  - Expected: Circle constrained so it doesn't extend beyond 5000

### Test Anonymous User Fix:

- [ ] Deploy latest code to production
- [ ] Open production site with incomplete auth data
- [ ] Check presence sidebar for "Anonymous" instead of crash
- [ ] Verify avatar shows "A" instead of error

---

## Deployment Steps

1. **Commit changes:**
   ```bash
   git add src/utils/canvasTools.js server.js api/chat.js src/components/CanvasSettingsModal.jsx src/services/canvasService.js
   git commit -m "Add canvas boundary constraints for Canny + enhanced logging"
   git push
   ```

2. **Deploy to production:**
   - Vercel will automatically deploy on push to main
   - Or manually trigger deployment in Vercel dashboard

3. **Deploy database rules (for canvas settings issue):**
   ```bash
   firebase deploy --only database
   ```

4. **Verify deployment:**
   - Test Canny with extreme coordinates
   - Check that Anonymous users are handled properly
   - Test canvas background settings saving

---

## User Experience Impact

### Before:
- ❌ Canny could create shapes anywhere (even 10000x outside canvas)
- ❌ User could lose track of shapes off-screen
- ❌ Inconsistent behavior between Canny and manual creation
- ❌ "Anonymous" crashes presence sidebar

### After:
- ✅ Canny respects same boundaries as user
- ✅ All shapes stay within 5000x5000 canvas
- ✅ Consistent behavior across all tools
- ✅ No lost shapes off-screen
- ✅ "Anonymous" gracefully handled

---

## Additional Notes

### Why 5000x5000?

From `src/utils/constants.js`:
```javascript
export const CANVAS_WIDTH = 5000;
export const CANVAS_HEIGHT = 5000;
```

This is a fixed canvas size. Users can pan/zoom to view different parts, but all shapes must stay within this boundary.

### Constraint Logic

The same constraint functions used by the regular canvas drag operations are now used by Canny's tools, ensuring **100% consistency** between:
- Manual shape creation
- Manual shape dragging
- Canny shape creation
- Canny shape manipulation

### Performance

The constraint checks are very lightweight (simple math operations) and add negligible overhead to tool execution.

---

## Status

**Canvas Boundaries:** ✅ COMPLETE  
**Anonymous Fix:** ⏳ NEEDS DEPLOYMENT  
**Canvas Settings Debug:** ✅ ENHANCED LOGGING ADDED

Ready for production deployment!

