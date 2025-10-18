import { Configuration, OpenAIApi } from 'openai-edge';
import { OpenAIStream, StreamingTextResponse } from 'ai';

// OpenAI configuration
const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);

// Vercel serverless function handler
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not configured');
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
    
    // Return streaming response
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('❌ Chat API error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
}

// Vercel Edge Config (optional, for better performance)
export const config = {
  runtime: 'edge',
};

