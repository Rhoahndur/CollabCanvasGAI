# Deploying Canny AI to Vercel

This guide explains how to deploy the CollabCanvas application with Canny AI assistant to Vercel.

## Architecture Overview

The application now uses **Vercel Serverless Functions** for the Canny AI backend:

- **Frontend**: React app (Vite) → Deployed to Vercel's CDN
- **Backend API**: `/api/chat.cjs` → Vercel Serverless Function (CommonJS)
- **Database**: Firebase Realtime Database (unchanged)
- **Auth**: Firebase Auth (unchanged)

## Benefits of This Architecture

✅ **Secure**: API keys stored as environment variables on Vercel  
✅ **Simple**: No separate backend server to manage  
✅ **Scalable**: Serverless functions auto-scale  
✅ **Cost-effective**: Pay only for what you use  
✅ **Reliable**: Node.js runtime with full npm module support  

## How It Works

### Development Mode
- Frontend runs on `http://localhost:5173` (Vite)
- Backend runs on `http://localhost:3001` (Express server)
- ChatPanel uses `http://localhost:3001/api/chat`

### Production Mode (Vercel)
- Frontend is served as static files
- Backend becomes `/api/chat` serverless function (Node.js runtime)
- ChatPanel uses `/api/chat` (same domain, no CORS issues!)

## Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Add Vercel serverless function for Canny"
git push origin main
```

### 2. Deploy to Vercel

#### Option A: Via Vercel CLI
```bash
npm install -g vercel
vercel login
vercel
```

#### Option B: Via Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Select your GitHub repository
4. Vercel will auto-detect Vite configuration

### 3. Set Environment Variables

In your Vercel project settings:

**Firebase Configuration** (Frontend - prefix with `VITE_`):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_DATABASE_URL`

**OpenAI API Key** (Backend - no prefix):
- `OPENAI_API_KEY` ← Your OpenAI API key

### 4. Deploy
```bash
vercel --prod
```

Your app will be live at `https://your-project.vercel.app`!

## Files Structure

```
CollabCanvasGAI/
├── api/
│   └── chat.js                 # Vercel serverless function
├── src/
│   ├── components/
│   │   └── ChatPanel.jsx       # Uses /api/chat endpoint
│   └── ...
├── server.js                   # Local dev server (not deployed)
├── vercel.json                 # Vercel configuration
└── .env.local                  # Local development only (gitignored)
```

## Important Notes

### What Gets Deployed?
✅ Frontend (`dist/` folder after build)  
✅ API functions (`api/` folder)  
❌ `server.js` (only used locally)  
❌ `node_modules/`, `.env.local`  

### Environment Variables
- **`.env.local`**: Local development only (gitignored)
- **Vercel Dashboard**: Production environment variables
- **Never commit** `.env.local` or any file with secrets!

### Testing Before Deployment
```bash
# Test locally
npm run dev        # Terminal 1: Frontend
npm run server     # Terminal 2: Backend

# Build and preview
npm run build
npm run preview
```

## Troubleshooting

### "OpenAI API key not configured"
→ Check that `OPENAI_API_KEY` is set in Vercel environment variables (no `VITE_` prefix!)

### "CORS error"
→ Shouldn't happen! Both frontend and API are on same domain in production

### "Function timeout"
→ Increase timeout in `vercel.json` (default is 10s for hobby tier)

### "Module not found"
→ Make sure all dependencies are in `package.json` and `npm install` was run

## Monitoring

View logs in Vercel Dashboard:
1. Go to your project
2. Click "Functions" tab
3. Click on `/api/chat`
4. View real-time logs

## Cost Estimate

**Free Tier Limits (Vercel Hobby)**:
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ 100 serverless function invocations/day
- ✅ 10s max function duration

**OpenAI Costs** (Pay-as-you-go):
- GPT-4 Turbo: ~$0.01 per message
- Set usage limits in OpenAI dashboard!

## Next Steps

1. ✅ Convert Express server to Vercel function
2. ✅ Update ChatPanel to use correct endpoint
3. ✅ Configure vercel.json for API routes
4. 🔄 Deploy to Vercel
5. 🔄 Set environment variables
6. 🔄 Test Canny in production!

## Local Development

You can still use the Express server for local development:

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run server
```

Or run both together:
```bash
npm run dev:all
```

The `ChatPanel` component automatically detects the environment and uses the correct endpoint.

---

🎉 **You're all set!** Your entire app (frontend + Canny AI) will be on Vercel with secure API key handling.

