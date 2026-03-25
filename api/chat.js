const { z } = require('zod');

// --- CORS & Rate Limiting Configuration ---
const ALLOWED_ORIGINS = [
  'https://collabcanvas.vercel.app',
  'https://collabcanvasgai.vercel.app',
  'https://collab-canvas-gai.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

// Simple in-memory rate limiting (20 req/min per IP)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// --- Request Body Validation ---
const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.union([
    z.string().max(50_000, 'Message content too long'),
    z.array(z.object({}).passthrough()), // Allow vision content arrays
  ]),
});

const chatRequestSchema = z.object({
  messages: z
    .array(messageSchema)
    .min(1, 'At least one message is required')
    .max(100, 'Too many messages'),
});

// Vercel serverless function config — extend timeout for slow free-tier models
module.exports.config = {
  maxDuration: 60, // seconds (Hobby plan max)
};

// Vercel serverless function handler (Node.js runtime)
module.exports = async function handler(req, res) {
  // Enable CORS — restrict to known origins
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const clientIp =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  try {
    // Validate request body
    const parseResult = chatRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        issues: parseResult.error.issues.map((i) => i.message),
      });
    }

    const { messages } = parseResult.data;

    if (!process.env.OPENROUTER_API_KEY) {
      console.error('❌ OpenRouter API key not configured');
      return res.status(500).json({ error: 'OpenRouter API key not configured' });
    }

    console.log('✅ API key found, initializing OpenRouter...');

    // Initialize OpenAI-compatible client pointed at OpenRouter
    const OpenAI = require('openai');
    const OpenAIConstructor = OpenAI.default || OpenAI;
    const openai = new OpenAIConstructor({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://collabcanvasgai.vercel.app',
        'X-Title': 'CollabCanvas',
      },
    });

    console.log('✅ OpenRouter initialized, creating completion...');

    // System prompt for Canny with tool usage and vision instructions
    const systemMessage = {
      role: 'system',
      content: `You are Canny, a helpful AI assistant for CollabCanvas - a real-time collaborative whiteboard with VISION capabilities! 👁️
      
Your role:
- Help users manipulate the canvas using the tools provided
- SEE the canvas when images are provided and understand spatial relationships
- Suggest creative ideas based on what you see
- Be friendly, concise, and encouraging
- Use emojis occasionally to be more personable

You have the following tools to manipulate the canvas:
- createShape: Create rectangles, circles, polygons, text, or custom polygons (simple, uses count for horizontal lines)
- createShapesBatch: Create multiple shapes at SPECIFIC x,y positions in ONE call (use this for patterns, circles, drawings, precise arrangements)
- alignShapes: Align shapes left, right, top, bottom, center-h, or center-v
- distributeShapes: Evenly distribute shapes horizontally or vertically
- arrangeInGrid: Arrange shapes in a rows x columns grid
- updateShapeProperties: Change color, size, rotation of shapes
- deleteShapes: Delete selected or all shapes (requires confirmation)
- getCanvasInfo: Get information about the canvas state
- selectShapes: Select shapes by type or color

CRITICAL - Canvas Boundaries:
- The canvas has FIXED boundaries: 0 to 5000 for both X and Y coordinates
- ALL shapes MUST stay within these boundaries (0-5000 for x, 0-5000 for y)
- The tools will automatically constrain shapes to these boundaries
- You CANNOT create or move shapes outside this range
- Treat the canvas as a 5000x5000 pixel space

IMPORTANT - Creating shapes in the user's viewport:
- The user's current viewport center is provided as (centerX, centerY) in the context
- ALWAYS prefer to create new shapes near the viewport center where the user is looking
- This creates a better UX - shapes appear where the user can see them immediately
- ONLY ignore this guidance when the request explicitly specifies a different location
- Examples:
  * "Create 5 rectangles" → Create them around (centerX, centerY)
  * "Create shapes in the top left" → Create in top left as requested
  * "Add rectangles around that circle" → Use vision to locate circle, create around it
  * "Delete all shapes" → Delete everywhere (location not relevant)

When you receive an image of the canvas:
- Carefully observe positions, colors, sizes, and arrangements
- Understand spatial relationships (left of, above, around, etc.)
- Respect existing designs when adding new elements
- Consider color harmony and visual balance

When the user asks you to manipulate the canvas, USE the appropriate tools.
Examples:
- "Create 5 blue rectangles" → Use createShape with count:5 (creates horizontal line)
- "Draw a circle outline using small circles" → Use createShapesBatch with calculated positions (e.g., 12 circles at angles 0°, 30°, 60°, etc.)
- "Create rectangles AROUND the blue circle" → See canvas, identify circle position, calculate positions, use createShapesBatch
- "Align them to the left" → Use alignShapes
- "What colors am I using?" → Observe the canvas image and describe colors
- "Make them all red" → Use updateShapeProperties
- "Draw a smiley face" → Use createShapesBatch to position circles for eyes, mouth arc, etc.

IMPORTANT - Creating Grids:
When users ask for a "grid" or "rows and columns" layout, you MUST use TWO tools in sequence:
1. FIRST: Create the shapes using createShape with count=(rows × columns)
   Example: "3x3 grid" = createShape with count=9
2. SECOND: Arrange them using arrangeInGrid with rows and columns
   Example: arrangeInGrid with rows=3, columns=3

Grid Examples:
- "Make a grid of 3x3 squares" → createShape(shapeType='rectangle', count=9) THEN arrangeInGrid(rows=3, columns=3)
- "Create a 2x4 grid of circles" → createShape(shapeType='circle', count=8) THEN arrangeInGrid(rows=2, columns=4)
- "Arrange these in a 3x3 grid" → arrangeInGrid(rows=3, columns=3) only (shapes already exist)`,
    };

    // Canvas tool definitions for function calling
    const tools = [
      {
        type: 'function',
        function: {
          name: 'createShape',
          description:
            'Create a new shape on the canvas. Use count for simple horizontal lines only. For text shapes, ALWAYS provide the text parameter with the desired content.',
          parameters: {
            type: 'object',
            properties: {
              shapeType: {
                type: 'string',
                enum: ['rectangle', 'circle', 'polygon', 'text', 'customPolygon'],
                description: 'Type of shape to create',
              },
              x: { type: 'number', description: 'X coordinate (optional, defaults to center)' },
              y: { type: 'number', description: 'Y coordinate (optional, defaults to center)' },
              width: { type: 'number', description: 'Width for rectangles and text boxes' },
              height: { type: 'number', description: 'Height for rectangles and text boxes' },
              radius: { type: 'number', description: 'Radius for circles and polygons' },
              color: { type: 'string', description: 'Color in hex format (e.g., #646cff)' },
              text: {
                type: 'string',
                description: 'REQUIRED for text shapes - the actual text content to display',
              },
              count: {
                type: 'number',
                description: 'Number of shapes to create in a horizontal line (default: 1)',
              },
            },
            required: ['shapeType'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'createShapesBatch',
          description:
            'Create multiple shapes at specific x,y positions in one call. Perfect for patterns (circle outlines, grids, drawings). Calculate positions using math (e.g., circle: x = centerX + radius*cos(angle), y = centerY + radius*sin(angle)). You can see the canvas and calculate exact coordinates.',
          parameters: {
            type: 'object',
            properties: {
              shapes: {
                type: 'array',
                description: 'Array of shapes with specific positions',
                items: {
                  type: 'object',
                  properties: {
                    shapeType: {
                      type: 'string',
                      enum: ['rectangle', 'circle', 'polygon', 'text', 'customPolygon'],
                    },
                    x: { type: 'number', description: 'X position (required)' },
                    y: { type: 'number', description: 'Y position (required)' },
                    width: { type: 'number' },
                    height: { type: 'number' },
                    radius: { type: 'number' },
                    color: { type: 'string' },
                    text: { type: 'string' },
                  },
                  required: ['shapeType', 'x', 'y'],
                },
              },
            },
            required: ['shapes'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'alignShapes',
          description: 'Align selected shapes',
          parameters: {
            type: 'object',
            properties: {
              alignment: {
                type: 'string',
                enum: ['left', 'right', 'top', 'bottom', 'center-horizontal', 'center-vertical'],
              },
              useSelected: { type: 'boolean' },
            },
            required: ['alignment'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'distributeShapes',
          description: 'Evenly distribute shapes',
          parameters: {
            type: 'object',
            properties: {
              direction: { type: 'string', enum: ['horizontal', 'vertical'] },
              spacing: { type: 'number' },
              useSelected: { type: 'boolean' },
            },
            required: ['direction'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'arrangeInGrid',
          description: 'Arrange shapes in a grid',
          parameters: {
            type: 'object',
            properties: {
              rows: { type: 'number' },
              columns: { type: 'number' },
              spacing: { type: 'number' },
              useSelected: { type: 'boolean' },
            },
            required: ['rows', 'columns'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'updateShapeProperties',
          description: 'Update shape properties',
          parameters: {
            type: 'object',
            properties: {
              color: { type: 'string' },
              width: { type: 'number' },
              height: { type: 'number' },
              radius: { type: 'number' },
              rotation: { type: 'number' },
              useSelected: { type: 'boolean' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'deleteShapes',
          description: 'Delete shapes',
          parameters: {
            type: 'object',
            properties: {
              useSelected: { type: 'boolean' },
              confirmation: { type: 'boolean' },
            },
            required: ['confirmation'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getCanvasInfo',
          description: 'Get canvas information',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'selectShapes',
          description: 'Select shapes by criteria',
          parameters: {
            type: 'object',
            properties: {
              shapeType: {
                type: 'string',
                enum: ['rectangle', 'circle', 'polygon', 'text', 'customPolygon', 'image', 'all'],
              },
              color: { type: 'string' },
            },
          },
        },
      },
    ];

    // Call OpenRouter API with streaming and tool support
    const model = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-nano-12b-v2-vl:free';
    const stream = await openai.chat.completions.create({
      model,
      messages: [systemMessage, ...messages],
      tools: tools,
      tool_choice: 'auto',
      stream: true,
      max_tokens: 4096, // Increased for vision processing
    });

    console.log('✅ Stream created, sending response...');

    // Set headers for SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream the response
    let chunkCount = 0;
    const toolCalls = [];

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      // Handle text content
      const content = delta?.content || '';
      if (content) {
        chunkCount++;
        // AI SDK v3 expects this specific format for text
        res.write(`0:${JSON.stringify(content)}\n`);
      }

      // Handle tool calls
      if (delta?.tool_calls) {
        for (const toolCall of delta.tool_calls) {
          const index = toolCall.index;

          // Initialize tool call if it's new
          if (!toolCalls[index]) {
            toolCalls[index] = {
              id: toolCall.id || `call_${Date.now()}_${index}`,
              type: 'function',
              function: {
                name: toolCall.function?.name || '',
                arguments: '',
              },
            };
          }

          // Append to function name if provided
          if (toolCall.function?.name) {
            toolCalls[index].function.name = toolCall.function.name;
          }

          // Append to arguments
          if (toolCall.function?.arguments) {
            toolCalls[index].function.arguments += toolCall.function.arguments;
          }
        }
      }
    }

    // If there were tool calls, send them using the custom marker format
    // (The AI SDK's data format is incompatible with our setup, so we use the marker approach)
    if (toolCalls.length > 0) {
      console.log(`✅ Stream complete. Tool calls detected: ${toolCalls.length}`);

      // Send tool calls as a hidden text message with special marker
      // This matches the format in server.js and is parsed by the frontend
      const toolCallsMarker = `__TOOL_CALLS__${JSON.stringify(toolCalls)}__END_TOOL_CALLS__`;
      res.write(`0:${JSON.stringify(toolCallsMarker)}\n`);
    } else {
      console.log(`✅ Stream complete. Sent ${chunkCount} text chunks`);
    }

    res.end();
  } catch (error) {
    console.error('❌ Chat API error:', error.message, error.status, error.code);
    return res.status(error.status || 500).json({
      error: error.message || 'Internal server error',
    });
  }
};
