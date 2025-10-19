# Deploying CollabCanvas to Vercel

This guide walks you through deploying your CollabCanvas application to Vercel for public access.

---

## Prerequisites

- ✅ Firebase project set up (Authentication + Firestore)
- ✅ GitHub account
- ✅ Vercel account ([sign up free](https://vercel.com/signup))
- ✅ Application working locally

---

## Step 1: Prepare Firebase for Production

### 1.1 Update Authorized Domains

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Authentication** → **Settings** → **Authorized domains**
4. Add your Vercel domain (you'll get this after deploying):
   - `your-project-name.vercel.app`
   - Any custom domains you plan to use

### 1.2 Deploy Firestore Rules

If you haven't already, deploy your security rules:

```bash
firebase deploy --only firestore:rules
```

This ensures your database is secure and ready for production traffic.

---

## Step 2: Push to GitHub

Vercel deploys from Git repositories. If you haven't already:

### 2.1 Initialize Git Repository

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Ready for deployment"
```

### 2.2 Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Create a new repository (e.g., `collabcanvas`)
3. **DO NOT** initialize with README (you already have one)

### 2.3 Push to GitHub

```bash
# Add remote
git remote add origin https://github.com/YOUR_USERNAME/collabcanvas.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Important:** Make sure `.env.local` is in your `.gitignore` (it already is) - never commit your Firebase credentials!

---

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended for first time)

1. **Go to [vercel.com](https://vercel.com/) and sign in**

2. **Click "Add New..." → "Project"**

3. **Import your GitHub repository:**
   - Click "Import" next to your `collabcanvas` repository
   - If you don't see it, click "Adjust GitHub App Permissions"

4. **Configure Project:**
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (leave as default)
   - **Build Command:** `npm run build` (should auto-detect)
   - **Output Directory:** `dist` (should auto-detect)
   - **Install Command:** `npm install` (should auto-detect)

5. **Add Environment Variables:**
   
   Click "Environment Variables" and add these (from your `.env.local`):
   
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```
   
   **Important:** Add these for all environments (Production, Preview, Development)

6. **Click "Deploy"**

7. **Wait for deployment** (usually 1-2 minutes)

8. **Get your URL:**
   - You'll get a URL like: `https://collabcanvas-xyz123.vercel.app`
   - Copy this URL - you'll need it for Firebase

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (first time)
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - What's your project's name? collabcanvas
# - In which directory is your code located? ./
# - Want to override settings? No

# Add environment variables
vercel env add VITE_FIREBASE_API_KEY
vercel env add VITE_FIREBASE_AUTH_DOMAIN
vercel env add VITE_FIREBASE_PROJECT_ID
vercel env add VITE_FIREBASE_STORAGE_BUCKET
vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID
vercel env add VITE_FIREBASE_APP_ID

# Deploy to production
vercel --prod
```

---

## Step 4: Update Firebase with Vercel Domain

Now that you have your Vercel URL, update Firebase:

### 4.1 Add Authorized Domain

1. Go to Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Click "Add domain"
3. Add your Vercel URL: `collabcanvas-xyz123.vercel.app`
4. Click "Add"

### 4.2 Update GitHub OAuth Redirect

1. Go to your [GitHub OAuth Apps](https://github.com/settings/developers)
2. Find your CollabCanvas OAuth app
3. Update **Authorization callback URL:**
   ```
   https://YOUR_PROJECT_ID.firebaseapp.com/__/auth/handler
   ```
4. Add your Vercel domain to **Homepage URL** (optional)

---

## Step 5: Test Your Deployment

1. **Open your Vercel URL** in a browser
2. **Test authentication:**
   - Click "Sign in with GitHub"
   - Verify OAuth flow works
   - Check you're redirected back to canvas
3. **Test core features:**
   - Create rectangles
   - Move objects
   - Open in another browser/incognito to test multiplayer
4. **Check console for errors** (F12)

---

## Step 6: Set Up Automatic Deployments

Vercel automatically deploys when you push to GitHub!

### Production Deployments (main branch)
```bash
git add .
git commit -m "Your changes"
git push origin main
```
→ Automatically deploys to production URL

### Preview Deployments (feature branches)
```bash
git checkout -b feature/new-feature
git add .
git commit -m "New feature"
git push origin feature/new-feature
```
→ Creates a preview deployment with unique URL

---

## Step 7: Custom Domain (Optional)

### 7.1 Add Custom Domain in Vercel

1. Go to your project in Vercel Dashboard
2. Click **Settings** → **Domains**
3. Add your custom domain (e.g., `canvas.yourdomain.com`)
4. Follow Vercel's instructions to update DNS

### 7.2 Update Firebase

Add your custom domain to Firebase authorized domains:
1. Firebase Console → Authentication → Settings → Authorized domains
2. Add your custom domain

---

## Troubleshooting

### "Authentication Error" after deployment

**Problem:** GitHub OAuth not working

**Solution:**
1. Check Firebase authorized domains includes your Vercel URL
2. Verify GitHub OAuth app callback URL is correct
3. Check environment variables are set in Vercel
4. Clear browser cache and try again

### "Firestore Error: Permission Denied"

**Problem:** Firestore rules not deployed

**Solution:**
```bash
firebase deploy --only firestore:rules
```

### Build fails on Vercel

**Problem:** Missing dependencies or build errors

**Solution:**
1. Check build logs in Vercel dashboard
2. Try building locally: `npm run build`
3. Fix any errors
4. Push fixes to GitHub
5. Vercel will automatically redeploy

### Environment variables not working

**Problem:** `undefined` values in production

**Solution:**
1. Check variable names start with `VITE_` prefix
2. Verify variables are set in Vercel Dashboard → Settings → Environment Variables
3. Redeploy after adding variables:
   ```bash
   # In Vercel dashboard, click "Redeploy"
   # Or push a new commit
   ```

### CSS not loading properly

**Problem:** Styles look broken

**Solution:**
1. Check `vercel.json` is present (already created)
2. Clear browser cache
3. Check browser console for 404 errors
4. Verify build output in `dist/` folder locally

---

## Deployment Checklist

Before sharing your URL:

- [ ] Authentication works (GitHub OAuth)
- [ ] Can create rectangles
- [ ] Can move rectangles
- [ ] Object locking works
- [ ] Multiplayer cursors visible (test with 2 browsers)
- [ ] Presence sidebar shows online users
- [ ] Page refresh maintains state
- [ ] Connection status works
- [ ] No console errors
- [ ] Performance is good (50+ FPS)

---

## Managing Your Deployment

### View Logs
```bash
# View production logs
vercel logs YOUR_DEPLOYMENT_URL

# Or view in Vercel Dashboard → Deployments → Click deployment → Functions tab
```

### Rollback
```bash
# In Vercel Dashboard:
# 1. Go to Deployments
# 2. Find previous working deployment
# 3. Click "..." → "Promote to Production"
```

### Environment Variables
```bash
# List env vars
vercel env ls

# Add new variable
vercel env add VARIABLE_NAME

# Remove variable
vercel env rm VARIABLE_NAME

# After changing env vars, redeploy:
vercel --prod
```

---

## Cost Considerations

### Vercel
- **Free Tier:**
  - Unlimited deployments
  - 100GB bandwidth/month
  - Automatic HTTPS
  - Perfect for hobby projects

### Firebase
- **Free Tier (Spark Plan):**
  - 50,000 reads/day
  - 20,000 writes/day
  - 1GB storage
  - 10GB bandwidth/month
  
**For moderate usage (5-10 concurrent users), free tiers should be sufficient!**

Monitor usage in Firebase Console to avoid overages.

---

## Next Steps

1. ✅ Share your URL with friends to test multiplayer
2. ✅ Monitor Firebase usage in console
3. ✅ Set up custom domain (optional)
4. ✅ Add analytics (optional)
5. ✅ Gather user feedback
6. ✅ Plan additional features

---

## Quick Reference Commands

```bash
# Deploy to production
git push origin main

# Deploy with Vercel CLI
vercel --prod

# View logs
vercel logs

# Check deployment status
vercel ls

# Open project in browser
vercel open
```

---

## Support

- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **Firebase Docs:** [firebase.google.com/docs](https://firebase.google.com/docs)
- **Community:** [vercel.com/discord](https://vercel.com/discord)

---

**Your app is now live and accessible to anyone with the URL!** 🎉

Share your URL and start collaborating in real-time!

