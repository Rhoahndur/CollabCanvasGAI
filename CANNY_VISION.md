# Canny Vision: AI That Can See Your Canvas! 👁️

## Overview

Canny now has **GPT-4 Vision** integrated with **smart auto-detection**! It automatically captures and analyzes the canvas when your message suggests visual understanding would help.

No buttons to press, no manual switches - just talk naturally and Canny will "look" when needed!

---

## How It Works

```
You: "Create rectangles around the blue circle"
  ↓
🔍 Smart Detection: "around" + "circle" = Vision needed!
  ↓
📸 Auto-capture: SVG → Canvas → PNG (base64)
  ↓
🤖 Canny sees canvas + reads your message
  ↓
👁️ Understands: "Ah! Blue circle at x:250, y:300, radius:50"
  ↓
🛠️ Uses tools: createShape with calculated positions
  ↓
✨ Result: Rectangles perfectly arranged around the circle!
```

---

## When Vision Activates

### Automatic Triggers

Vision automatically activates when your message contains:

**1. Demonstrative References**
- "this", "that", "these", "those"
- Examples: "Move **these** shapes", "Color **that** circle"

**2. Spatial Relationships**
- "around", "near", "next to", "beside", "between"
- "above", "below", "left of", "right of"
- Examples: "Create circles **around** the square", "Place **between** those two"

**3. Existing State References**
- "existing", "current", "already there"
- Examples: "Match the **existing** pattern", "Complement what's **already** there"

**4. Visual Queries**
- "what color", "how many", "where is", "which"
- Examples: "**What colors** am I using?", "**How many** circles are there?"

**5. Visual Relationships**
- "match", "complement", "similar to", "mirror"
- Examples: "**Match** the colors", "Create a **similar** pattern"

**6. Color References**
- Mentioning specific colors (blue, red, green, etc.)
- Examples: "Around the **blue** circle", "Next to the **red** rectangle"

**7. Spatial Analysis**
- "empty space", "gap", "fill"
- Examples: "**Fill** the empty space", "Use the **gap** on the right"

---

## What Canny Can Do With Vision

### 1. **Spatial Commands** 🎯
Create shapes with perfect positioning:

```
"Create 5 circles around the blue rectangle"
"Add a square next to those shapes"
"Place rectangles between the two circles"
"Fill the empty space on the right side"
```

### 2. **Visual Queries** 🔍
Ask about your canvas:

```
"What colors am I using?"
"How many shapes are on the canvas?"
"Where is the red circle?"
"Describe the current layout"
```

### 3. **Visual Relationships** 🎨
Work with existing designs:

```
"Match the colors of those shapes"
"Complement the existing pattern"
"Create a mirror image of this"
"Make a border around everything"
```

### 4. **Design Assistance** ✨
Get creative suggestions:

```
"What would make this balanced?"
"Suggest where to add more elements"
"How can I improve the symmetry?"
"What's missing from this design?"
```

### 5. **Complex Arrangements** 🏗️
Multi-step spatial operations:

```
"Create a flower pattern using the existing circle as center"
"Arrange shapes to form a face"
"Build a house structure with these rectangles"
```

---

## Visual Feedback

### Vision Indicator

When Canny uses vision, you'll see an animated indicator:

```
┌─────────────────────────────────────┐
│ 👁️ Understanding spatial relationships │  ← Animated pulsing
└─────────────────────────────────────┘
```

**Indicator Messages:**
- "Looking at the canvas..."
- "Understanding spatial relationships"
- "Analyzing visual design"
- "Examining current canvas state"
- "Analyzing canvas to answer your question"

### Chat Input Update

The input placeholder changes to:
```
"Ask Canny... (I can see the canvas! 👁️)"
```

---

## Technical Details

### Canvas Capture

**Process:**
1. SVG element cloned (no modification to original)
2. Converted to Canvas element
3. White background added (for transparency)
4. Exported as PNG base64
5. Optimized to max 1024x768px

**Performance:**
- Capture time: ~100-200ms
- Image size: ~50-150KB
- Format: PNG, base64 encoded

### Smart Detection Algorithm

```javascript
// Example keywords
const VISION_KEYWORDS = [
  'this', 'that', 'around', 'near', 'existing',
  'match', 'complement', 'what color', 'empty space',
  'blue', 'red', 'green', // colors
  // ... 40+ keywords total
];

// Heuristics
- Questions with spatial context
- Commands with positional references
- Visual arrangement requests
```

### GPT-4o Model

**Capabilities:**
- ✅ Vision (images)
- ✅ Function calling (tools)
- ✅ Streaming responses
- ✅ 4096 token output

**Upgrade from GPT-4 Turbo:**
- Added vision support
- Maintained function calling
- Better multimodal understanding

---

## Examples

### Example 1: Spatial Arrangement

**User:** "Create 5 red circles around the blue rectangle"

**Behind the Scenes:**
1. 👁️ Vision triggers (keywords: "around", "blue", "rectangle")
2. 📸 Captures canvas
3. 🤖 Canny analyzes: Blue rectangle at (400, 300), size 100x60
4. 🧮 Calculates positions: 5 circles evenly around rectangle
5. 🛠️ Calls: `createShape` with 5 circle definitions
6. ✅ Result: Perfectly arranged circles!

**Canny's Response:**
> "I can see your blue rectangle in the center! I've created 5 red circles arranged around it in a circular pattern. They're evenly spaced and should complement your design nicely! 🎨"

---

### Example 2: Visual Query

**User:** "What colors am I using?"

**Behind the Scenes:**
1. 👁️ Vision triggers (keyword: "what colors")
2. 📸 Captures canvas
3. 🤖 Canny analyzes all visible shapes
4. 🎨 Identifies color palette
5. 💬 Responds with findings

**Canny's Response:**
> "Looking at your canvas, you're using a nice color palette! I see:
> - Blue (#3B82F6) - used in 3 circles
> - Red (#EF4444) - used in 2 rectangles
> - Yellow (#F59E0B) - used in 1 polygon
> 
> It's a primary color scheme with good contrast! 🎨"

---

### Example 3: Complex Design

**User:** "Create a flower pattern with the existing circle as the center"

**Behind the Scenes:**
1. 👁️ Vision triggers ("existing", "circle", "center")
2. 📸 Captures canvas
3. 🤖 Identifies center circle position and size
4. 🧮 Calculates petal positions (circles around center)
5. 🛠️ Creates 6-8 circles as "petals"
6. ✅ Beautiful flower pattern!

**Canny's Response:**
> "I see your circle at (500, 400)! I've created a flower pattern around it with 8 red circles as petals, arranged evenly in a circle. Added a bit of color harmony too! 🌸"

---

## Cost Considerations

### API Pricing (Approximate)

**Text-Only Request:**
- Input: ~500 tokens
- Output: ~150 tokens
- Cost: ~$0.005 per request

**With Vision:**
- Input: ~500 tokens + image (~1000 tokens equivalent)
- Output: ~150 tokens
- Cost: ~$0.015-0.030 per request

**Smart Detection Benefit:**
- Only uses vision when needed (~30-40% of requests)
- Saves ~60% on API costs vs. always-on vision
- Better user experience (faster when vision not needed)

---

## Configuration

### Adjusting Vision Sensitivity

To make vision activate more/less often, edit `canvasCapture.js`:

```javascript
// Add more keywords
const VISION_KEYWORDS = [
  ...existing,
  'custom', 'keyword', 'here'
];

// Adjust image size
captureCanvasImage(svg, {
  maxWidth: 1024,  // Increase for higher quality
  maxHeight: 768   // Increase for higher quality
});
```

### Disabling Vision

If needed, you can disable vision by:

```javascript
// In ChatPanel.jsx
const useVision = false; // Always false
// OR
const useVision = shouldUseVision(input) && false;
```

---

## Troubleshooting

### Vision Not Activating

**Problem:** Canny doesn't capture canvas when expected

**Solutions:**
1. Check console for `👁️ Vision detected!` log
2. Try more explicit keywords: "**look at** the canvas"
3. Verify `svgRef` is passed to ChatPanel
4. Check browser console for capture errors

### Canvas Capture Fails

**Problem:** Error during canvas capture

**Solutions:**
1. Check SVG element exists: `svgRef.current`
2. Verify SVG has content (not empty)
3. Check browser console for CORS errors
4. Ensure images on canvas have CORS enabled

### Slow Performance

**Problem:** Vision requests take too long

**Solutions:**
1. Reduce image size in `captureCanvasImage` options
2. Limit canvas complexity (fewer shapes)
3. Check network speed (base64 image upload)
4. Consider local caching for repeated queries

### High API Costs

**Problem:** Unexpected API costs

**Solutions:**
1. Review keyword list - too many triggers?
2. Monitor vision activation frequency
3. Add specific keywords instead of broad ones
4. Consider user confirmation for expensive operations

---

## Future Enhancements

Potential improvements:

1. **Selective Capture**
   - Capture only viewport, not entire canvas
   - Capture only selected shapes
   - Zoom-aware capture

2. **Vision Cache**
   - Cache recent captures
   - Reuse if canvas unchanged
   - Reduce API calls

3. **Manual Override**
   - Button to force vision
   - Button to disable vision
   - Per-session toggle

4. **Advanced Analysis**
   - OCR for text recognition
   - Shape detection algorithms
   - Color palette extraction

5. **Multi-Frame Analysis**
   - Before/after comparisons
   - Animation understanding
   - Progress tracking

---

## Conclusion

Canny Vision transforms your canvas assistant from a command executor to a true creative collaborator! 🎨👁️

**Key Benefits:**
- ✅ No manual activation needed
- ✅ Understands spatial context
- ✅ Works with existing tools
- ✅ Cost-effective (smart detection)
- ✅ Seamless user experience

**Try it yourself:**
1. Create some shapes
2. Ask: "Create rectangles around these circles"
3. Watch Canny see and respond intelligently!

Happy creating! 🚀✨

