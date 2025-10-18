# Database Structure - Fresh Start

## 📊 Complete Database Schema

This document shows the exact structure your Firebase Realtime Database will have after using the app.

---

## 🏗️ Root Structure

```
{
  "canvases": { ... },      // All canvas data
  "userCanvases": { ... }   // User's canvas index (for fast lookups)
}
```

---

## 📦 Canvas Data Structure

### Path: `/canvases/{canvasId}/`

```json
{
  "canvases": {
    "userId_1234567890_abc123": {
      "metadata": {
        "name": "My First Canvas",
        "createdBy": "user_github_123",
        "createdAt": 1234567890000,
        "lastModified": 1234567890000,
        "template": "blank"
      },
      "permissions": {
        "user_github_123": "owner",
        "user_google_456": "editor",
        "user_github_789": "viewer"
      },
      "objects": {
        "user_github_123_1234567891_xyz": {
          "id": "user_github_123_1234567891_xyz",
          "type": "rectangle",
          "x": 100,
          "y": 100,
          "width": 200,
          "height": 150,
          "color": "rgba(100, 108, 255, 0.3)",
          "rotation": 0,
          "createdBy": "user_github_123",
          "lockedBy": null,
          "lockedByUserName": null,
          "timestamp": 1234567891000,
          "zIndex": 1234567891000
        },
        "user_github_123_1234567892_abc": {
          "id": "user_github_123_1234567892_abc",
          "type": "circle",
          "x": 300,
          "y": 200,
          "radius": 50,
          "color": "rgba(255, 82, 82, 0.3)",
          "rotation": 0,
          "createdBy": "user_github_123",
          "lockedBy": null,
          "lockedByUserName": null,
          "timestamp": 1234567892000,
          "zIndex": 1234567892000
        },
        "user_github_123_1234567893_def": {
          "id": "user_github_123_1234567893_def",
          "type": "text",
          "x": 400,
          "y": 100,
          "width": 200,
          "height": 100,
          "text": "Hello World",
          "fontSize": 16,
          "fontWeight": "normal",
          "fontStyle": "normal",
          "textColor": "rgba(255, 255, 255, 1)",
          "color": "rgba(255, 255, 255, 0)",
          "rotation": 0,
          "createdBy": "user_github_123",
          "lockedBy": null,
          "lockedByUserName": null,
          "timestamp": 1234567893000,
          "zIndex": 1234567893000
        }
      },
      "cursors": {
        "session_1234567890_xyz": {
          "sessionId": "session_1234567890_xyz",
          "userId": "user_github_123",
          "userName": "Alex",
          "x": 500,
          "y": 300,
          "color": "#646cff",
          "timestamp": 1234567894000,
          "isActive": true
        }
      },
      "presence": {
        "session_1234567890_xyz": {
          "sessionId": "session_1234567890_xyz",
          "userId": "user_github_123",
          "userName": "Alex",
          "color": "#646cff",
          "isOnline": true,
          "lastSeen": 1234567895000,
          "isActive": true
        }
      }
    }
  }
}
```

---

## 👤 User Canvas Index

### Path: `/userCanvases/{userId}/`

```json
{
  "userCanvases": {
    "user_github_123": {
      "userId_1234567890_abc123": {
        "name": "My First Canvas",
        "role": "owner",
        "lastAccessed": 1234567890000,
        "starred": false
      },
      "userId_1234567891_def456": {
        "name": "Brainstorming Board",
        "role": "owner",
        "lastAccessed": 1234567891000,
        "starred": true
      }
    },
    "user_google_456": {
      "userId_1234567890_abc123": {
        "name": "My First Canvas",
        "role": "editor",
        "lastAccessed": 1234567892000,
        "starred": false
      }
    }
  }
}
```

---

## 🎨 Shape Types & Properties

### Rectangle
```json
{
  "type": "rectangle",
  "x": 100,              // Top-left x
  "y": 100,              // Top-left y
  "width": 200,
  "height": 150,
  "color": "rgba(...)",
  "rotation": 0,         // Degrees
  "text": "Optional",    // Optional text label
  "fontSize": 16,
  "fontWeight": "normal",
  "fontStyle": "normal",
  "textColor": "rgba(...)"
}
```

### Circle
```json
{
  "type": "circle",
  "x": 300,              // Center x
  "y": 200,              // Center y
  "radius": 50,
  "color": "rgba(...)",
  "rotation": 0,
  "text": "Optional"
}
```

### Polygon (Pentagon)
```json
{
  "type": "polygon",
  "x": 500,              // Center x
  "y": 300,              // Center y
  "radius": 60,
  "sides": 5,
  "color": "rgba(...)",
  "rotation": 0,
  "text": "Optional"
}
```

### Text Box
```json
{
  "type": "text",
  "x": 400,              // Top-left x
  "y": 100,              // Top-left y
  "width": 200,
  "height": 100,
  "text": "Hello World",
  "fontSize": 16,
  "fontWeight": "normal",
  "fontStyle": "normal",
  "textColor": "rgba(255, 255, 255, 1)",
  "color": "rgba(255, 255, 255, 0)",  // Background (transparent by default)
  "rotation": 0
}
```

### Image
```json
{
  "type": "image",
  "x": 600,              // Center x
  "y": 400,              // Center y
  "width": 200,
  "height": 150,
  "imageUrl": "data:image/jpeg;base64,...",  // Base64 data URL
  "rotation": 0
}
```

### Custom Polygon
```json
{
  "type": "custom_polygon",
  "vertices": [
    { "x": 100, "y": 100 },
    { "x": 200, "y": 150 },
    { "x": 180, "y": 250 },
    { "x": 80, "y": 200 }
  ],
  "color": "rgba(...)",
  "rotation": 0,
  "text": "Optional"
}
```

---

## 🔐 Permission Levels

### Owner
- **Can:** Create, read, update, delete objects
- **Can:** Rename canvas
- **Can:** Delete canvas
- **Can:** Manage permissions (add/remove users)
- **Can:** Change canvas settings

### Editor
- **Can:** Create, read, update, delete objects
- **Cannot:** Rename canvas
- **Cannot:** Delete canvas
- **Cannot:** Manage permissions

### Viewer
- **Can:** Read objects (view only)
- **Cannot:** Create, update, delete objects
- **Cannot:** Rename or delete canvas
- **Cannot:** Manage permissions

---

## 📏 Canvas Limits & Constraints

### User Limits
- **Max canvases per user:** 2
- **Max canvas name length:** 50 characters

### Canvas Dimensions
```javascript
CANVAS_WIDTH: 3000
CANVAS_HEIGHT: 2000
VIEWPORT_WIDTH: 1920
VIEWPORT_HEIGHT: 1080
```

### Object Constraints
- **Min size (rectangles/text):** 20x20
- **Min radius (circles/polygons):** 10
- **Boundary enforcement:** Objects constrained to canvas bounds
- **Z-index:** Timestamp-based layer ordering

---

## 🎯 Template Structures

### Blank Canvas
```json
{
  "metadata": {
    "template": "blank"
  },
  "objects": {}  // Empty
}
```

### Brainstorming Board
```json
{
  "metadata": {
    "template": "brainstorm"
  },
  "objects": {
    // 3 colored zones with labels
    "...": { "type": "rectangle", "color": "rgba(255, 235, 59, 0.2)", ... },
    "...": { "type": "text", "text": "💡 Ideas", ... },
    "...": { "type": "rectangle", "color": "rgba(76, 175, 80, 0.2)", ... },
    "...": { "type": "text", "text": "⚡ Actions", ... },
    "...": { "type": "rectangle", "color": "rgba(33, 150, 243, 0.2)", ... },
    "...": { "type": "text", "text": "❓ Questions", ... }
  }
}
```

### Wireframe Layout
```json
{
  "metadata": {
    "template": "wireframe"
  },
  "objects": {
    // Header, sidebar, content areas
    "...": { "type": "rectangle", "color": "rgba(200, 200, 200, 0.3)", ... },
    "...": { "type": "text", "text": "Header Area", ... },
    "...": { "type": "rectangle", "color": "rgba(200, 200, 200, 0.3)", ... },
    "...": { "type": "text", "text": "Sidebar", ... },
    "...": { "type": "rectangle", "color": "rgba(255, 255, 255, 0)", ... },
    "...": { "type": "text", "text": "Main Content Area", ... }
  }
}
```

---

## 🔄 Real-Time Data Flow

### Canvas Objects
```
User creates shape
  ↓
Canvas.jsx calls createShape(canvasId, shapeData)
  ↓
canvasService.js writes to /canvases/{canvasId}/objects/{objectId}
  ↓
Realtime Database syncs to all clients
  ↓
useCanvas hook receives update
  ↓
Canvas re-renders with new shape
```

### Cursors
```
User moves mouse (with isDragging or isResizing or isRotating)
  ↓
Canvas.jsx calls updateCursor(canvasId, sessionId, x, y, ...)
  ↓
canvasService.js writes to /canvases/{canvasId}/cursors/{sessionId}
  ↓
Realtime Database syncs (throttled, 100ms)
  ↓
useCursors hook receives update
  ↓
Cursor component renders at new position
```

### Presence
```
User opens canvas
  ↓
usePresence hook calls setUserPresence(canvasId, sessionId, ...)
  ↓
canvasService.js writes to /canvases/{canvasId}/presence/{sessionId}
  ↓
Heartbeat updates every 10 seconds
  ↓
subscribeToPresence listens for changes
  ↓
PresenceSidebar displays online users
```

---

## 📊 Data Size Estimates

### Empty Canvas
- **Metadata:** ~200 bytes
- **Permissions:** ~100 bytes per user
- **User Index Entry:** ~150 bytes
- **Total:** ~500 bytes

### Canvas with 10 Shapes
- **Metadata:** ~200 bytes
- **Permissions:** ~100 bytes per user
- **Objects:** ~300 bytes per shape = 3KB
- **User Index Entry:** ~150 bytes
- **Total:** ~3.5 KB

### Canvas with 100 Shapes
- **Metadata:** ~200 bytes
- **Permissions:** ~100 bytes per user
- **Objects:** ~300 bytes per shape = 30KB
- **User Index Entry:** ~150 bytes
- **Total:** ~30.5 KB

### Cursors & Presence
- **Per User:** ~200 bytes
- **10 Users:** ~2 KB
- **Cleaned up on disconnect**

---

## 🗑️ Data Cleanup

### Automatic Cleanup:
- **Cursors:** Removed on session disconnect (onDisconnect hook)
- **Presence:** Removed on session disconnect (onDisconnect hook)
- **Stale Presence:** Cleaned on canvas load (30s timeout)

### Manual Cleanup (Not Implemented Yet):
- **Deleted Canvas:** All canvas data removed (metadata, permissions, objects)
- **Removed User:** Permission and user index entry removed

---

## ✅ Validation Rules

### Canvas Creation:
- ✅ User must be authenticated
- ✅ Canvas name not empty
- ✅ User has < 2 canvases
- ✅ Template is valid ('blank', 'brainstorm', 'wireframe')

### Object Creation:
- ✅ User must be authenticated
- ✅ User has permission (owner or editor)
- ✅ Object has valid type
- ✅ Object has required properties
- ✅ Object within canvas bounds

### Permission Changes:
- ✅ User must be owner
- ✅ Target user exists
- ✅ Role is valid ('owner', 'editor', 'viewer')

---

## 🎯 Summary

**Your database is now:**
- ✅ Clean and empty
- ✅ Security rules deployed
- ✅ Ready for fresh canvases
- ✅ Structured for multi-canvas
- ✅ Optimized for real-time collaboration

**Start the app and create your first canvas!** 🚀

