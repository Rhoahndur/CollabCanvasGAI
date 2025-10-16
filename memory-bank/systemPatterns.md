# System Patterns

## Architecture Overview

CollabCanvasGAI follows a **component-based architecture** with React as the view layer and Firebase as the backend. The system is organized into clear layers with separation of concerns.

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │ Components │──│   Hooks    │──│  Services  │       │
│  └────────────┘  └────────────┘  └────────────┘       │
│         │              │                 │              │
└─────────┼──────────────┼─────────────────┼──────────────┘
          │              │                 │
          └──────────────┴─────────────────┘
                         │
                    ┌────▼────┐
                    │ Firebase │
                    └─────────┘
```

## Key Design Patterns

### 1. Custom Hooks Pattern
**Location:** `src/hooks/`

Each major feature area has a dedicated custom hook that encapsulates:
- State management
- Firestore subscriptions
- Business logic
- Side effects

**Hooks:**
- `useAuth` - Authentication state and user management
- `useCanvas` - Rectangle state, selection, locking, Firestore sync
- `useCursors` - Multiplayer cursor tracking and label visibility
- `usePresence` - User presence awareness and heartbeat

**Benefits:**
- Reusable logic across components
- Clear separation of concerns
- Easier testing and debugging
- Avoid prop drilling

**Example Pattern:**
```javascript
export function useCanvas(userId, userName, canvasId) {
  const [rectangles, setRectangles] = useState([]);
  const [selectedRectId, setSelectedRectId] = useState(null);
  
  // Subscribe to Firestore
  useEffect(() => {
    const unsubscribe = subscribeToObjects(canvasId, (objects) => {
      setRectangles(objects);
    });
    return () => unsubscribe();
  }, [canvasId]);
  
  // Return state and actions
  return {
    rectangles,
    selectedRectId,
    selectRectangle,
    deselectRectangle,
  };
}
```

### 2. Service Layer Pattern
**Location:** `src/services/`

All Firebase operations are centralized in service modules:
- `firebase.js` - Firebase initialization and configuration
- `canvasService.js` - CRUD operations for canvas objects

**Benefits:**
- Single source of truth for Firebase operations
- Easy to mock for testing
- Consistent error handling
- Decoupled from React components

**Example Pattern:**
```javascript
export async function createRectangle(canvasId, rectData) {
  const docRef = doc(db, `canvases/${canvasId}/objects`, rectId);
  await setDoc(docRef, {
    ...rectData,
    timestamp: serverTimestamp(),
  });
}
```

### 3. Real-time Subscription Pattern
**Location:** Throughout hooks

Firestore `onSnapshot` listeners provide automatic real-time updates:

```javascript
useEffect(() => {
  const unsubscribe = onSnapshot(
    collection(db, `canvases/${canvasId}/objects`),
    (snapshot) => {
      const objects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(objects);
    },
    (error) => errorCallback(error)
  );
  
  return () => unsubscribe();
}, [canvasId]);
```

**Pattern Rules:**
- Always return unsubscribe function for cleanup
- Use error callback for connection monitoring
- Update local state immediately on snapshot
- Handle initial load vs. subsequent updates differently

### 4. Optimistic Update Pattern
**Location:** `Canvas.jsx` (drag handling)

For smooth UX, update local state immediately before Firestore sync:

```javascript
// 1. Update local state (instant)
setRectangles(prev => prev.map(r => 
  r.id === selectedRectId 
    ? { ...r, x: newX, y: newY }
    : r
));

// 2. Throttled sync to Firestore (200ms)
if (now - lastDragUpdate.current > DRAG_UPDATE_THROTTLE) {
  updateRectangle(canvasId, selectedRectId, { x: newX, y: newY });
  lastDragUpdate.current = now;
}

// 3. Final sync on mouse up
await updateRectangle(canvasId, selectedRectId, { x: rect.x, y: rect.y });
```

**Critical:** During drag, prevent Firestore updates from overwriting local position:
```javascript
if (isDraggingRef.current) {
  return objects.map(rect => 
    rect.id === selectedId && selectedRect
      ? { ...rect, x: selectedRect.x, y: selectedRect.y } // Keep local
      : rect // Use Firestore
  );
}
```

### 5. Viewport Transformation Pattern
**Location:** `Canvas.jsx`, `canvasUtils.js`

SVG viewBox handles pan and zoom transformations:

```javascript
// viewBox = "offsetX offsetY width/zoom height/zoom"
const viewBox = `${viewport.offsetX} ${viewport.offsetY} ${containerSize.width / viewport.zoom} ${containerSize.height / viewport.zoom}`;
```

**Coordinate Transformations:**
```javascript
// Screen to canvas coordinates
export function screenToCanvas(screenX, screenY, viewport, svgRect) {
  const x = ((screenX - svgRect.left) / viewport.zoom) + viewport.offsetX;
  const y = ((screenY - svgRect.top) / viewport.zoom) + viewport.offsetY;
  return { x, y };
}
```

**Benefits:**
- Hardware-accelerated transformations
- No manual matrix math
- Zoom toward cursor position works naturally
- Crisp rendering at any zoom level

### 6. Object Locking Pattern
**Location:** `useCanvas.js`, `canvasService.js`

Prevent simultaneous manipulation with Firestore-backed locks:

```javascript
// Lock on selection
await lockObject(canvasId, rectId, userId, userName);
setSelectedRectId(rectId);

// Check lock before allowing drag
if (rect.lockedBy && rect.lockedBy !== userId) {
  console.log('Cannot drag - locked by another user');
  return;
}

// Unlock on deselect or disconnect
await unlockObject(canvasId, rectId);
```

**Auto-release on disconnect:**
```javascript
const presenceRef = doc(db, `canvases/${canvasId}/presence`, sessionId);
await onDisconnect(presenceRef).update({ isOnline: false });
```

### 7. Viewport Culling Pattern
**Location:** `Canvas.jsx`

Only render objects visible in current viewport:

```javascript
const visibleRectangles = useMemo(() => {
  const bufferSize = 200; // Buffer around viewport
  const viewportLeft = viewport.offsetX - bufferSize;
  const viewportTop = viewport.offsetY - bufferSize;
  const viewportRight = viewport.offsetX + (containerSize.width / viewport.zoom) + bufferSize;
  const viewportBottom = viewport.offsetY + (containerSize.height / viewport.zoom) + bufferSize;
  
  return rectangles.filter(rect => {
    const rectRight = rect.x + rect.width;
    const rectBottom = rect.y + rect.height;
    
    return !(
      rect.x > viewportRight ||
      rectRight < viewportLeft ||
      rect.y > viewportBottom ||
      rectBottom < viewportTop
    );
  });
}, [rectangles, viewport, containerSize]);
```

**Impact:** 85% reduction in rendered objects with 500+ rectangles.

### 8. Session-Based Presence Pattern
**Location:** `usePresence.js`, `useCursors.js`

Each browser tab gets a unique session ID:

```javascript
const sessionId = useRef(`${userId}_${Date.now()}_${Math.random()}`);
```

**Why:** Prevents duplicate cursors when same user has multiple tabs open.

**Cleanup:**
```javascript
// Set isOnline: false on disconnect
await onDisconnect(presenceRef).update({ isOnline: false });

// Remove stale presence entries (lastSeen > 40 seconds)
const staleThreshold = Date.now() - 40000;
const staleUsers = presenceList.filter(p => p.lastSeen < staleThreshold);
```

### 9. Component Memoization Pattern
**Location:** `Rectangle.jsx`, `Cursor.jsx`

Prevent unnecessary re-renders with React.memo:

```javascript
const Rectangle = React.memo(({ 
  id, x, y, width, height, color, 
  isSelected, isLocked, onClick, onMouseDown, onMouseLeave 
}) => {
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={color}
      // ... other props
    />
  );
});
```

**Critical for performance:** Without memo, every rectangle re-renders on every viewport change.

### 10. Error Boundary Pattern
**Location:** `ErrorBoundary.jsx`

Catch and display React errors gracefully:

```javascript
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('React error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <div>Something went wrong</div>;
    }
    return this.props.children;
  }
}
```

**Wraps:** Entire app in `App.jsx`

## Component Relationships

### Data Flow
```
App.jsx
  ├─ useAuth() → user, signIn, signOut
  │
  ├─ LoginPage.jsx (if !user)
  │    └─ Calls signIn()
  │
  └─ Canvas.jsx (if user)
       ├─ useCanvas(userId, userName)
       │    ├─ Subscribes to objects collection
       │    ├─ Manages selection state
       │    └─ Returns rectangles, selectRectangle, deselectRectangle
       │
       ├─ useCursors(sessionId)
       │    ├─ Subscribes to cursors collection
       │    └─ Returns cursors, shouldShowLabel
       │
       ├─ Renders Rectangle.jsx for each visible rectangle
       │    ├─ onClick → selectRectangle(id)
       │    ├─ onMouseDown → start dragging
       │    └─ onMouseLeave → deselectRectangle()
       │
       └─ Renders Cursor.jsx for each other user's cursor
            └─ Shows label if shouldShowLabel(cursor)

PresenceSidebar.jsx
  └─ usePresence(sessionId, userId, userName)
       ├─ Subscribes to presence collection
       ├─ Sets current user as online
       ├─ Heartbeat every 30 seconds
       └─ Returns presenceList
```

### Event Propagation
```
Canvas Background (SVG)
  ├─ onMouseDown → handleCanvasMouseDown
  │    ├─ If Shift/Cmd/Ctrl → start panning
  │    └─ Else → start drawing rectangle
  │
  ├─ onMouseMove → handleMouseMove
  │    ├─ Update cursor position (throttled 75ms)
  │    ├─ If panning → update viewport
  │    ├─ If drawing → update preview rectangle
  │    └─ If dragging → update selected rectangle position
  │
  ├─ onMouseUp → handleMouseUp
  │    ├─ If was drawing → create rectangle in Firestore
  │    └─ If was dragging → sync final position to Firestore
  │
  └─ onWheel → handleWheel
       └─ Update zoom level and viewport offset

Rectangle (SVG rect)
  ├─ onClick → handleRectangleClick
  │    ├─ e.stopPropagation() (don't trigger canvas click)
  │    └─ selectRectangle(id)
  │
  ├─ onMouseDown → handleRectangleMouseDown
  │    ├─ e.stopPropagation()
  │    └─ Start dragging (sets isDragging = true)
  │
  └─ onMouseLeave → handleRectangleMouseLeave
       └─ If selected && !isDragging → deselectRectangle()
```

**Key Pattern:** `e.stopPropagation()` prevents rectangle events from bubbling to canvas.

## State Management Strategy

### Local State (useState)
- Viewport (offsetX, offsetY, zoom)
- Interaction modes (isPanning, isDrawing, isDragging)
- Temporary UI state (FPS counter, loading overlays)

### Firestore State (via hooks)
- Rectangles (persisted, synced across users)
- Cursors (ephemeral, deleted on disconnect)
- Presence (semi-persistent, cleaned up after 40 seconds)

### Refs (useRef)
- DOM references (svgRef, containerRef)
- Timing (lastCursorUpdate, lastDragUpdate)
- Flags to avoid stale closures (isDraggingRef, selectedRectIdRef)

**Pattern:** Use refs for values needed in Firestore subscription callbacks to avoid stale closures.

## Performance Optimization Patterns

1. **useMemo for expensive calculations**
   - viewBox string
   - visibleRectangles (viewport culling)
   - grid lines
   - preview rectangle

2. **React.memo for components**
   - Rectangle component
   - Cursor component

3. **Throttling**
   - Cursor updates: 75ms (13 updates/second)
   - Drag updates during drag: 200ms
   - Final sync on mouse up: immediate

4. **Code splitting**
   - React bundle separate from Firebase bundle
   - Vite handles automatically

5. **Viewport culling**
   - Only render rectangles in visible area + 200px buffer
   - 85% reduction with 500+ objects

## Naming Conventions

### Components
- PascalCase: `Canvas.jsx`, `Rectangle.jsx`
- Default export: `export default Canvas`

### Hooks
- camelCase with "use" prefix: `useCanvas`, `useCursors`
- Named export: `export function useCanvas() {}`

### Services
- camelCase: `canvasService.js`, `firebase.js`
- Named exports: `export async function createRectangle() {}`

### Utils
- camelCase: `canvasUtils.js`, `colorUtils.js`
- Named exports: `export function screenToCanvas() {}`

### Constants
- SCREAMING_SNAKE_CASE: `CANVAS_WIDTH`, `MIN_ZOOM`
- Named exports: `export const CANVAS_WIDTH = 5000`

---

*These patterns are proven to work in production. When extending the app, follow these established patterns for consistency and maintainability.*

