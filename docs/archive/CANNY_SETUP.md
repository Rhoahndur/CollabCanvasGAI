# 🤖 Canny AI Setup Guide

Canny is your AI assistant for CollabCanvas, powered by Vercel AI SDK and OpenAI.

## 🚀 Quick Setup

### 1. Install Dependencies (Already Done ✅)
```bash
npm install ai @ai-sdk/openai zod express cors dotenv
```

### 2. Get an OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Click **"Create new secret key"**
5. Copy the key (starts with `sk-...`)

### 3. Add API Key to Environment

Add this line to your `.env.local` file:

```bash
# OpenAI API Key for Canny AI Assistant
OPENAI_API_KEY=sk-your-actual-api-key-here

# API URL (for local development)
VITE_API_URL=http://localhost:3001
```

### 4. Start the Services

**Option A: Run Both Services (Recommended)**
```bash
npm run dev:all
```

**Option B: Run Separately**

Terminal 1 (Backend):
```bash
npm run server
```

Terminal 2 (Frontend):
```bash
npm run dev
```

### 5. Test Canny

1. Open your app at `http://localhost:5173`
2. Look for the **Canny** button at the bottom center
3. Click to open the chat panel
4. Ask Canny a question like:
   - "How do I add shapes?"
   - "What keyboard shortcuts are available?"
   - "Give me some creative project ideas"

---

## 🎨 What Canny Can Do

Canny knows all about CollabCanvas and can help with:

✅ **Feature explanations** - How to use tools and features
✅ **Creative suggestions** - Ideas for your canvas projects
✅ **Keyboard shortcuts** - Productivity tips
✅ **Collaboration tips** - Working with others
✅ **Troubleshooting** - Help with common issues

---

## 🔧 Customization

### Change AI Model

Edit `server.js` line 24:
```javascript
model: openai('gpt-4-turbo'),  // or 'gpt-3.5-turbo', 'gpt-4', etc.
```

### Modify Personality

Edit the `system` prompt in `server.js` (lines 26-42) to change Canny's personality and knowledge.

### Change Streaming Behavior

The AI SDK handles streaming automatically. Responses appear word-by-word in real-time!

---

## 🚢 Production Deployment

### Vercel (Recommended)

1. Deploy your main app to Vercel as usual
2. The backend (`server.js`) can be deployed as a **Vercel Serverless Function**
3. Update `VITE_API_URL` in production environment to your Vercel URL

### Alternative: Separate Backend

Deploy `server.js` to any Node.js host (Railway, Render, Fly.io, etc.) and point `VITE_API_URL` to that URL.

---

## 📊 Cost Estimation

**OpenAI Pricing (as of 2024):**
- GPT-4 Turbo: ~$0.01 per 1K input tokens, ~$0.03 per 1K output tokens
- GPT-3.5 Turbo: ~$0.0005 per 1K input tokens, ~$0.0015 per 1K output tokens

**Typical chat message:** ~500 tokens (~$0.02 with GPT-4 Turbo)

💡 **Tip:** Start with GPT-3.5 Turbo for development, upgrade to GPT-4 for production.

---

## 🐛 Troubleshooting

### "Failed to fetch" Error
- Make sure the backend is running (`npm run server`)
- Check that `VITE_API_URL` points to `http://localhost:3001`
- Verify CORS is enabled in `server.js`

### "OpenAI API key not configured"
- Double-check your `.env.local` file has `OPENAI_API_KEY`
- Restart the backend server after adding the key
- Make sure the key starts with `sk-`

### Messages Not Streaming
- Check browser console for errors
- Verify `@ai-sdk/openai` and `ai` packages are installed
- Try refreshing the page

---

## 🎯 Next Steps

- ✅ Canny is ready to chat!
- 🎨 Customize the system prompt to fit your needs
- 🚀 Deploy to production when ready
- 📈 Monitor OpenAI usage at [platform.openai.com/usage](https://platform.openai.com/usage)

**Have fun building with Canny!** 🎉

