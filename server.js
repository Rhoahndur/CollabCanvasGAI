import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import cors from 'cors';
import { Configuration, OpenAIApi } from 'openai-edge';
import { OpenAIStream, StreamingTextResponse } from 'ai';

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
const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);

/**
 * POST /api/chat
 * Streaming AI chat endpoint for Canny
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // Call OpenAI API
    const response = await openai.createChatCompletion({
      model: 'gpt-4-turbo-preview',
      stream: true,
      messages: [
        {
          role: 'system',
          content: `You are Canny, a helpful AI assistant for CollabCanvas - a real-time collaborative whiteboard. 
      
Your role:
- Help users with questions about using the canvas
- Suggest creative ideas for their projects
- Be friendly, concise, and encouraging
- Use emojis occasionally to be more personable

Canvas features you can help with:
- Drawing shapes (rectangles, circles, polygons)
- Adding text boxes with formatting
- Uploading and manipulating images
- Multi-selecting and moving objects
- Rotating and resizing shapes
- Real-time collaboration with other users
- Keyboard shortcuts (Ctrl+D to duplicate, Delete to remove)`,
        },
        ...messages,
      ],
    });

    // Convert the response to a stream
    const stream = OpenAIStream(response);
    
    // Pipe the stream to the response
    const reader = stream.getReader();
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
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

