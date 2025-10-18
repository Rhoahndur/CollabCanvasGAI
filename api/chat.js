// Node.js runtime (default for Vercel serverless functions)
const OpenAI = require('openai').default;

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
    const { messages } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not configured');
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // System prompt for Canny
    const systemMessage = {
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
    };

    // Call OpenAI API with streaming
    const stream = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [systemMessage, ...messages],
      stream: true,
    });

    // Set headers for SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream the response
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        // AI SDK expects this specific format
        res.write(`0:${JSON.stringify(content)}\n`);
      }
    }

    res.end();
  } catch (error) {
    console.error('❌ Chat API error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
};

