import express from 'express';
import cors from 'cors';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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

    // Set headers for streaming
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    const result = await streamText({
      model: openai('gpt-4-turbo'),
      messages,
      system: `You are Canny, a helpful AI assistant for CollabCanvas - a real-time collaborative whiteboard. 
      
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
    });

    // Stream the response
    for await (const textPart of result.textStream) {
      res.write(textPart);
    }

    res.end();
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

