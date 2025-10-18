# Canvas Templates - Specifications

## Overview
Pre-made canvas templates to help users get started quickly. Users can select a template when creating a new canvas.

---

## Template 1: Blank Canvas (Default)

**Name:** Blank Canvas  
**Description:** Start with a completely empty canvas for maximum creativity.  
**Icon:** ⬜ Empty square  

**Contents:**
- No pre-placed shapes
- Default canvas settings

**Use Cases:**
- General purpose drawing
- Freeform collaboration
- Custom designs from scratch

**Implementation:**
```javascript
{
  name: "Blank Canvas",
  icon: "blank",
  description: "Start with a clean slate",
  shapes: []
}
```

---

## Template 2: Brainstorming Board

**Name:** Brainstorming Board  
**Description:** Organized sections for ideas, actions, and questions.  
**Icon:** 💡 Light bulb  

**Contents:**
- **3 colored zones** (rectangles as containers)
- **Labels** (text boxes)
- **Grid layout** for structure

**Layout:**
```
┌─────────────┬─────────────┬─────────────┐
│   💡 Ideas  │  ⚡ Actions │  ❓ Questions│
│             │             │             │
│  (Yellow)   │   (Green)   │   (Blue)    │
│             │             │             │
│             │             │             │
└─────────────┴─────────────┴─────────────┘
```

**Use Cases:**
- Team brainstorming sessions
- Project planning
- Ideation workshops
- Retrospectives

**Implementation:**
```javascript
{
  name: "Brainstorming Board",
  icon: "brainstorm",
  description: "Organized zones for ideas and actions",
  shapes: [
    // Ideas zone (Yellow)
    {
      type: "rectangle",
      x: 100,
      y: 100,
      width: 400,
      height: 500,
      color: "rgba(255, 235, 59, 0.2)",
      rotation: 0,
      zIndex: 1
    },
    {
      type: "text",
      x: 150,
      y: 120,
      width: 300,
      height: 50,
      text: "💡 Ideas",
      fontSize: 24,
      fontWeight: "bold",
      color: "rgba(255, 235, 59, 1)",
      rotation: 0,
      zIndex: 2
    },
    
    // Actions zone (Green)
    {
      type: "rectangle",
      x: 550,
      y: 100,
      width: 400,
      height: 500,
      color: "rgba(76, 175, 80, 0.2)",
      rotation: 0,
      zIndex: 1
    },
    {
      type: "text",
      x: 600,
      y: 120,
      width: 300,
      height: 50,
      text: "⚡ Actions",
      fontSize: 24,
      fontWeight: "bold",
      color: "rgba(76, 175, 80, 1)",
      rotation: 0,
      zIndex: 2
    },
    
    // Questions zone (Blue)
    {
      type: "rectangle",
      x: 1000,
      y: 100,
      width: 400,
      height: 500,
      color: "rgba(33, 150, 243, 0.2)",
      rotation: 0,
      zIndex: 1
    },
    {
      type: "text",
      x: 1050,
      y: 120,
      width: 300,
      height: 50,
      text: "❓ Questions",
      fontSize: 24,
      fontWeight: "bold",
      color: "rgba(33, 150, 243, 1)",
      rotation: 0,
      zIndex: 2
    }
  ]
}
```

---

## Template 3: Wireframe Layout

**Name:** Wireframe Layout  
**Description:** Basic layout guides for UI/UX design and wireframing.  
**Icon:** 📐 Ruler/Triangle  

**Contents:**
- **Header area** (light gray rectangle)
- **Sidebar area** (light gray rectangle)
- **Main content area** (outlined rectangle)
- **Labels** for each section

**Layout:**
```
┌─────────────────────────────────────┐
│          Header Area                │
├──────┬──────────────────────────────┤
│      │                              │
│ Side │    Main Content Area         │
│ bar  │                              │
│      │                              │
│      │                              │
└──────┴──────────────────────────────┘
```

**Use Cases:**
- UI/UX wireframing
- Website layout planning
- App design mockups
- Dashboard designs

**Implementation:**
```javascript
{
  name: "Wireframe Layout",
  icon: "wireframe",
  description: "Layout guides for UI/UX design",
  shapes: [
    // Header
    {
      type: "rectangle",
      x: 100,
      y: 100,
      width: 1200,
      height: 100,
      color: "rgba(200, 200, 200, 0.3)",
      rotation: 0,
      zIndex: 1
    },
    {
      type: "text",
      x: 150,
      y: 130,
      width: 200,
      height: 40,
      text: "Header Area",
      fontSize: 20,
      fontWeight: "normal",
      color: "rgba(100, 100, 100, 1)",
      rotation: 0,
      zIndex: 2
    },
    
    // Sidebar
    {
      type: "rectangle",
      x: 100,
      y: 220,
      width: 250,
      height: 600,
      color: "rgba(200, 200, 200, 0.3)",
      rotation: 0,
      zIndex: 1
    },
    {
      type: "text",
      x: 150,
      y: 250,
      width: 150,
      height: 40,
      text: "Sidebar",
      fontSize: 18,
      fontWeight: "normal",
      color: "rgba(100, 100, 100, 1)",
      rotation: 0,
      zIndex: 2
    },
    
    // Main Content Area (outlined, not filled)
    {
      type: "rectangle",
      x: 370,
      y: 220,
      width: 930,
      height: 600,
      color: "rgba(255, 255, 255, 0)",
      rotation: 0,
      zIndex: 1
    },
    {
      type: "text",
      x: 420,
      y: 250,
      width: 300,
      height: 40,
      text: "Main Content Area",
      fontSize: 20,
      fontWeight: "normal",
      color: "rgba(100, 100, 100, 1)",
      rotation: 0,
      zIndex: 2
    }
  ]
}
```

---

## Template Selector UI

**Modal/Dropdown when creating new canvas:**

```
┌─────────────────────────────────────┐
│   Create New Canvas                 │
├─────────────────────────────────────┤
│                                     │
│  Choose a template:                 │
│                                     │
│  ┌─────┐  ┌─────┐  ┌─────┐        │
│  │ ⬜  │  │ 💡  │  │ 📐  │        │
│  │Blank│  │Brain│  │Wire │        │
│  └─────┘  └─────┘  └─────┘        │
│                                     │
│  Canvas Name: [____________]        │
│                                     │
│  [Cancel]  [Create Canvas]          │
│                                     │
└─────────────────────────────────────┘
```

---

## Implementation Notes

### Phase 1: Simple Templates
- Just create shapes when canvas is created
- No special UI, just a dropdown selector

### Phase 2: Template Gallery (Later)
- Visual previews of each template
- Thumbnail images
- Template descriptions
- "Preview before create" option

### Storage
Templates can be:
1. **Hardcoded** in frontend (simple, fast)
2. **Stored in Firebase** (flexible, can add more templates without code changes)
3. **Hybrid** (default templates hardcoded, custom templates in Firebase)

**Recommendation:** Start with hardcoded templates for MVP, move to Firebase later.

---

## Future Template Ideas

- **Kanban Board** (To Do, In Progress, Done columns)
- **Mind Map** (central node with branches)
- **Flowchart** (with connectors and decision nodes)
- **Calendar/Timeline** (horizontal timeline with markers)
- **Meeting Notes** (agenda, notes, action items sections)
- **SWOT Analysis** (Strengths, Weaknesses, Opportunities, Threats quadrants)

---

## Template Data Structure

```javascript
interface CanvasTemplate {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji or icon name
  thumbnail?: string; // base64 or URL to preview image
  category: 'general' | 'planning' | 'design' | 'analysis';
  shapes: ShapeData[]; // Pre-placed shapes
  settings?: {
    showGrid?: boolean;
    backgroundColor?: string;
    // ... other canvas settings
  };
}
```

---

Ready to implement! 🎨

