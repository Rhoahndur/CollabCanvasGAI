// Vercel serverless function handler (Node.js runtime)
module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
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

  try {
    // Log for debugging
    console.log('🔍 Received chat request');
    console.log('📦 Body:', JSON.stringify(req.body).substring(0, 100));
    
    const { messages } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not configured');
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    console.log('✅ API key found, initializing OpenAI...');

    // Initialize OpenAI client - handle both ESM and CJS exports
    const OpenAI = require('openai');
    const OpenAIConstructor = OpenAI.default || OpenAI;
    const openai = new OpenAIConstructor({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log('✅ OpenAI initialized, creating completion...');

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
- createShape: Create rectangles, circles, polygons, text, or custom polygons
- alignShapes: Align shapes left, right, top, bottom, center-h, or center-v
- distributeShapes: Evenly distribute shapes horizontally or vertically
- arrangeInGrid: Arrange shapes in a rows x columns grid
- updateShapeProperties: Change color, size, rotation of shapes
- deleteShapes: Delete selected or all shapes (requires confirmation)
- getCanvasInfo: Get information about the canvas state
- selectShapes: Select shapes by type or color

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
- "Create 5 blue rectangles" → Use createShape with centerX/centerY from viewport
- "Create rectangles AROUND the blue circle" → See canvas, identify circle position, use createShape with appropriate coordinates
- "Align them to the left" → Use alignShapes
- "What colors am I using?" → Observe the canvas image and describe colors
- "Make them all red" → Use updateShapeProperties`,
    };

    // Canvas tool definitions for function calling
    const tools = [
      {
        type: 'function',
        function: {
          name: 'createShape',
          description: 'Create a new shape on the canvas',
          parameters: {
            type: 'object',
            properties: {
              shapeType: { type: 'string', enum: ['rectangle', 'circle', 'polygon', 'text', 'customPolygon'] },
              x: { type: 'number' },
              y: { type: 'number' },
              width: { type: 'number' },
              height: { type: 'number' },
              radius: { type: 'number' },
              color: { type: 'string' },
              text: { type: 'string' },
              count: { type: 'number' }
            },
            required: ['shapeType']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'alignShapes',
          description: 'Align selected shapes',
          parameters: {
            type: 'object',
            properties: {
              alignment: { type: 'string', enum: ['left', 'right', 'top', 'bottom', 'center-horizontal', 'center-vertical'] },
              useSelected: { type: 'boolean' }
            },
            required: ['alignment']
          }
        }
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
              useSelected: { type: 'boolean' }
            },
            required: ['direction']
          }
        }
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
              useSelected: { type: 'boolean' }
            },
            required: ['rows', 'columns']
          }
        }
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
              useSelected: { type: 'boolean' }
            }
          }
        }
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
              confirmation: { type: 'boolean' }
            },
            required: ['confirmation']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'getCanvasInfo',
          description: 'Get canvas information',
          parameters: { type: 'object', properties: {} }
        }
      },
      {
        type: 'function',
        function: {
          name: 'selectShapes',
          description: 'Select shapes by criteria',
          parameters: {
            type: 'object',
            properties: {
              shapeType: { type: 'string', enum: ['rectangle', 'circle', 'polygon', 'text', 'customPolygon', 'image', 'all'] },
              color: { type: 'string' }
            }
          }
        }
      }
    ];

    // Call OpenAI API with streaming, tools, and vision support
    // Note: gpt-4o supports both vision and function calling
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',  // Changed from gpt-4-turbo-preview to support vision
      messages: [systemMessage, ...messages],
      tools: tools,
      tool_choice: 'auto',
      stream: true,
      max_tokens: 4096,  // Increased for vision processing
    });

    console.log('✅ Stream created, sending response...');

    // Set headers for SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream the response
    let chunkCount = 0;
    let toolCalls = [];
    
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
                arguments: ''
              }
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

    // If there were tool calls, send them as a special message
    if (toolCalls.length > 0) {
      console.log(`✅ Stream complete. Tool calls detected: ${toolCalls.length}`);
      
      // Send tool calls in AI SDK format
      const toolCallMessage = {
        role: 'assistant',
        content: '',
        tool_calls: toolCalls
      };
      
      res.write(`2:${JSON.stringify(toolCallMessage)}\n`);
    } else {
      console.log(`✅ Stream complete. Sent ${chunkCount} text chunks`);
    }
    
    res.end();
  } catch (error) {
    console.error('❌ Chat API error:', error);
    console.error('❌ Error stack:', error.stack);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: error.stack
    });
  }
};

