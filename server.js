import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local file
dotenv.config({ path: join(__dirname, '.env.local') });

const app = express();
const PORT = process.env.PORT || 3001;

// Log startup info
console.log('🚀 Starting Canny AI Server...');
console.log('📍 Port:', PORT);
console.log('🔑 OpenAI Key:', process.env.OPENAI_API_KEY ? `✅ Found (${process.env.OPENAI_API_KEY.substring(0, 10)}...)` : '❌ Not found');

app.use(cors());
app.use(express.json());

// OpenAI configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/chat
 * Streaming AI chat endpoint for Canny with function calling support
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

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

When you receive an image of the canvas:
- Carefully observe positions, colors, sizes, and arrangements
- Understand spatial relationships (left of, above, around, etc.)
- Respect existing designs when adding new elements
- Consider color harmony and visual balance

When the user asks you to manipulate the canvas, USE the appropriate tools.
Examples:
- "Create 5 blue rectangles" → Use createShape
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

    // Call OpenAI API with function calling and vision support
    // Note: gpt-4o supports both vision and function calling
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',  // Changed from gpt-4-turbo-preview to support vision
      stream: true,
      messages: [systemMessage, ...messages],
      tools: tools,
      tool_choice: 'auto',
      max_tokens: 4096,  // Increased for vision processing
    });

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream the response in AI SDK format
    let chunkCount = 0;
    let toolCalls = [];
    
    try {
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

      // If there were tool calls, send them as a hidden text message with special marker
      if (toolCalls.length > 0) {
        console.log(`✅ Stream complete. Tool calls detected: ${toolCalls.length}`);
        
        // Send tool calls as text with a special prefix that frontend can detect
        const toolCallsMarker = `__TOOL_CALLS__${JSON.stringify(toolCalls)}__END_TOOL_CALLS__`;
        res.write(`0:${JSON.stringify(toolCallsMarker)}\n`);
      } else {
        console.log(`✅ Stream complete. Sent ${chunkCount} text chunks`);
      }
      
      res.end();
    } catch (streamError) {
      console.error('Stream error:', streamError);
      res.end();
    }
  } catch (error) {
    console.error('Chat API error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`🤖 Canny AI server running on http://localhost:${PORT}`);
});

