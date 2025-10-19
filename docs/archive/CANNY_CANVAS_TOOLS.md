# Canny AI Canvas Tools

## Overview

Canny is now a **fully-powered canvas assistant** that can manipulate the canvas directly! Instead of just answering questions, Canny can create shapes, arrange objects, align elements, and more through OpenAI's function calling.

## What Canny Can Do

### 1. **Create Shapes** (`createShape`)
Create any type of shape on the canvas.

**Examples:**
- "Create 5 blue rectangles"
- "Add 3 red circles"
- "Make 10 rectangles and space them out"
- "Create a yellow text box that says 'Hello'"

**Parameters:**
- `shapeType`: rectangle, circle, polygon, text, customPolygon
- `count`: How many to create
- `color`: Hex color (e.g., "#FF0000")
- `x`, `y`: Position (defaults to viewport center)
- `width`, `height`: Size for rectangles/text
- `radius`: Size for circles/polygons
- `text`: Content for text shapes

---

### 2. **Align Shapes** (`alignShapes`)
Align shapes along an edge or center.

**Examples:**
- "Align these shapes to the left"
- "Center them horizontally"
- "Align to the top"

**Alignments:**
- `left`, `right`, `top`, `bottom`
- `center-horizontal`, `center-vertical`

---

### 3. **Distribute Shapes** (`distributeShapes`)
Evenly space shapes with equal gaps.

**Examples:**
- "Distribute them horizontally"
- "Space them out vertically"
- "Evenly distribute with 50px spacing"

**Parameters:**
- `direction`: horizontal or vertical
- `spacing`: Gap between shapes (optional, auto-calculated)

---

### 4. **Arrange in Grid** (`arrangeInGrid`)
Organize shapes into rows and columns.

**Examples:**
- "Arrange in a 2x3 grid"
- "Make a 4 by 4 grid"
- "Organize in 3 rows and 5 columns"

**Parameters:**
- `rows`: Number of rows
- `columns`: Number of columns
- `spacing`: Gap between shapes (default 20px)

---

### 5. **Update Properties** (`updateShapeProperties`)
Change shape colors, sizes, rotation.

**Examples:**
- "Make them all red"
- "Change the color to #00FF00"
- "Rotate 45 degrees"
- "Make them bigger (width 200, height 150)"

**Properties:**
- `color`: New fill color
- `width`, `height`: New size
- `radius`: New radius
- `rotation`: Angle in degrees

---

### 6. **Delete Shapes** (`deleteShapes`)
Remove shapes from the canvas.

**Examples:**
- "Delete these shapes"
- "Remove all shapes"
- "Clear the canvas"

**Safety:** Canny will ask for confirmation before deleting.

---

### 7. **Get Canvas Info** (`getCanvasInfo`)
Query the canvas state.

**Examples:**
- "How many shapes are there?"
- "What's on the canvas?"
- "Show me the canvas info"

**Returns:**
- Total shape count
- Selected shape count
- Shapes by type
- Viewport info

---

### 8. **Select Shapes** (`selectShapes`)
Select shapes by type or color.

**Examples:**
- "Select all rectangles"
- "Select the blue shapes"
- "Select all circles"

**Parameters:**
- `shapeType`: rectangle, circle, polygon, text, image, or all
- `color`: Filter by color

---

## How It Works

### Architecture

```
User: "Create 5 blue rectangles"
  ↓
ChatPanel (frontend)
  ↓
API Endpoint (/api/chat)
  ↓
OpenAI (GPT-4 with tools)
  ↓ [Decides to use createShape tool]
  ↓
API streams tool call back
  ↓
ChatPanel.experimental_onToolCall()
  ↓
executeCanvasTool() [canvasTools.js]
  ↓
Canvas operations (create, update, delete)
  ↓
Firebase Realtime Database
  ↓
Canvas updates in real-time
  ↓
Canny: "✅ Created 5 rectangles"
```

### Function Calling Flow

1. **User sends message** → Chat API
2. **OpenAI decides** to use a tool (or not)
3. **Tool call streamed** back to frontend
4. **ChatPanel executes** tool with canvas context
5. **Tool modifies** canvas via Firebase
6. **Result sent** back to OpenAI
7. **Canny responds** with confirmation

---

## Technical Implementation

### Files Created/Modified

#### 1. **`src/utils/canvasTools.js`** (NEW)
- Defines all 8 canvas tools
- OpenAI function schemas
- Tool execution handlers
- Helper functions for bounds calculation

#### 2. **`api/chat.js`** (UPDATED)
- Added `tools` parameter to OpenAI call
- Updated system prompt for tool usage
- Tool call streaming in response handler

#### 3. **`src/components/ChatPanel.jsx`** (UPDATED)
- Added canvas operation props
- Imported `executeCanvasTool`
- Added `experimental_onToolCall` handler
- Updated welcome message

#### 4. **`src/components/Canvas.jsx`** (UPDATED)
- Created Canny wrapper functions
- Passed canvas state and operations to ChatPanel
- Added viewport center calculation

---

## Context Object

Every tool receives a context object:

```javascript
{
  shapes,              // All shapes on canvas
  selectedShapeIds,    // Currently selected shapes
  createShape,         // Create new shape
  updateShape,         // Update existing shape
  deleteShape,         // Delete shape
  selectShape,         // Select a shape
  deselectShape,       // Deselect shapes
  viewport,            // { offsetX, offsetY, zoom, centerX, centerY }
  canvasId,            // Canvas ID
  userId               // Current user ID
}
```

---

## Selected vs All Shapes

Most tools support `useSelected` parameter:
- `useSelected: true` (default) → Only affects selected shapes
- `useSelected: false` → Affects all shapes

**Examples:**
- "Align **these** to the left" → Selected only
- "Align **all shapes** to the left" → All shapes
- "Make **them** red" → Selected only  
- "Make **everything** red" → All shapes

Canny is smart enough to understand context!

---

## Tool Result Format

Every tool returns:

```javascript
{
  success: true/false,
  message: "Human-readable result",
  data: { /* operation details */ }
}
```

Example:
```javascript
{
  success: true,
  message: "Created 5 rectangles",
  data: {
    count: 5,
    shapes: [...]
  }
}
```

---

## Safety Features

1. **Delete Confirmation**
   - Tools requiring `confirmation: true` parameter
   - Prevents accidental deletion

2. **Locked Shape Protection**
   - Tools respect object locks
   - Won't modify shapes locked by other users

3. **User Context**
   - All shapes created have `createdBy` field
   - Tracks ownership and permissions

4. **Error Handling**
   - Try/catch in all tool handlers
   - Returns error messages instead of crashing

---

## Example Workflows

### Workflow 1: Create and Organize
```
User: "Create 12 blue rectangles"
Canny: ✅ Created 12 rectangles

User: "Arrange them in a 3x4 grid"
Canny: ✅ Arranged 12 shapes in a 3x4 grid

User: "Make them all green"
Canny: ✅ Updated 12 shapes
```

### Workflow 2: Select and Modify
```
User: "How many shapes are there?"
Canny: 📊 You have 25 shapes on the canvas

User: "Select all circles"
Canny: ✅ Selected 8 shapes

User: "Make them red and rotate 45 degrees"
Canny: ✅ Updated 8 shapes
```

### Workflow 3: Complex Alignment
```
User: "Create 10 rectangles"
Canny: ✅ Created 10 rectangles

User: "Align them vertically"
Canny: ✅ Aligned 10 shapes to center-vertical

User: "Distribute them horizontally with 30px spacing"
Canny: ✅ Distributed 10 shapes horizontally
```

---

## Testing Checklist

- [ ] Create shapes (various types)
- [ ] Align shapes (all 6 alignments)
- [ ] Distribute shapes (horizontal/vertical)
- [ ] Arrange in grid (various sizes)
- [ ] Update properties (color, size, rotation)
- [ ] Delete shapes (with confirmation)
- [ ] Get canvas info
- [ ] Select shapes (by type, by color)
- [ ] Test with selected shapes
- [ ] Test with all shapes
- [ ] Test error handling
- [ ] Test with locked shapes
- [ ] Test multi-user scenarios

---

## Troubleshooting

### Tool not executing?
- Check browser console for `🔧 Canny is calling tool:` logs
- Verify canvasId and user are defined
- Check for Firebase permission errors

### Shapes appearing in wrong location?
- Verify viewport calculation in Canvas.jsx
- Check that centerX/centerY are calculated correctly

### OpenAI not calling tools?
- Update system prompt if needed
- Try more explicit commands ("Use createShape to...")
- Check OpenAI API logs in backend

### Tool returns error?
- Check console for error details
- Verify all required parameters provided
- Check Firebase rules for permission issues

---

## Future Enhancements

Potential additions:
- **Group/Ungroup** shapes
- **Duplicate** selected shapes
- **Move** shapes by offset
- **Resize** shapes proportionally
- **Copy/Paste** between canvases
- **Export** canvas as image
- **Undo/Redo** operations
- **Snap to Grid** alignment
- **Color Palette** management
- **Shape Templates** (star, arrow, etc.)

---

## Conclusion

Canny is now a **true canvas co-pilot**! 🚀

Instead of just explaining features, Canny can:
- ✅ **Create** what you need
- ✅ **Organize** your workspace
- ✅ **Modify** designs instantly
- ✅ **Clean up** clutter
- ✅ **Answer** questions about canvas state

Try it out with natural language commands and watch Canny bring your canvas to life! 🎨✨

