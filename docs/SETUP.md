# CollabCanvas Setup & Deployment Guide

This guide covers everything you need to set up and deploy CollabCanvas.

---

## Table of Contents
1. [Getting Started](#getting-started)
2. [Firebase Setup](#firebase-setup)
3. [SendGrid Setup (Email)](#sendgrid-setup)
4. [Canny AI Setup](#canny-ai-setup)
5. [Local Development](#local-development)
6. [Deployment](#deployment)

---

## Getting Started

### Prerequisites
- Node.js v18 or higher
- npm or yarn
- Firebase account
- OpenAI API key (for Canny)

### Installation

```bash
# Clone the repository
cd /path/to/CollabCanvasGAI

# Install dependencies
npm install

# Install server dependencies
cd api
npm install
cd ..
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com

# OpenAI (for Canny AI Assistant)
OPENAI_API_KEY=your_openai_api_key

# SendGrid (for email invitations)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=your_verified_sender_email
```

---

## Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `CollabCanvas` (or your choice)
4. Enable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click **Get Started**
3. Enable **Google** sign-in provider
4. Enable **GitHub** sign-in provider (optional)
   - You'll need to create a GitHub OAuth App
   - Add callback URL: `https://YOUR_PROJECT.firebaseapp.com/__/auth/handler`

### 3. Create Firestore Database

1. Go to **Firestore Database**
2. Click **Create database**
3. Choose **Production mode**
4. Select a location (choose closest to your users)
5. Click **Enable**

### 4. Create Realtime Database

1. Go to **Realtime Database**
2. Click **Create Database**
3. Choose **United States** (or your preferred location)
4. Start in **locked mode** (we'll add rules)
5. Click **Enable**

### 5. Configure Security Rules

#### Firestore Rules
Copy the rules from `firestore.rules` file, or use:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Canvas objects - require authentication
    match /canvases/{canvasId}/objects/{objectId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

#### Realtime Database Rules
Copy the rules from `database.rules.json`, or use:

```json
{
  "rules": {
    "canvases": {
      "$canvasId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "userCanvases": {
      "$userId": {
        ".read": "auth != null && auth.uid == $userId",
        ".write": "auth != null && auth.uid == $userId"
      }
    },
    "cursors": {
      "$canvasId": {
        ".read": "auth != null",
        "$userId": {
          ".write": "auth != null && auth.uid == $userId"
        }
      }
    },
    "presence": {
      "$canvasId": {
        ".read": "auth != null",
        "$userId": {
          ".write": "auth != null && auth.uid == $userId"
        }
      }
    }
  }
}
```

### 6. Get Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll to **Your apps** section
3. Click the web icon `</>`
4. Register your app
5. Copy the configuration values to your `.env.local`

---

## SendGrid Setup

SendGrid is used for sending email invitations to collaborate on canvases.

### 1. Create SendGrid Account

1. Go to [SendGrid](https://sendgrid.com/)
2. Sign up for a free account (100 emails/day)

### 2. Verify Sender Email

1. Go to **Settings** > **Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill in your email details
4. Check your email and verify

### 3. Create API Key

1. Go to **Settings** > **API Keys**
2. Click **Create API Key**
3. Name it `CollabCanvas` (or your choice)
4. Select **Full Access** or **Mail Send** permission
5. Click **Create & View**
6. Copy the API key (you won't see it again!)
7. Add to `.env.local`:
   ```
   SENDGRID_API_KEY=SG.xxxxx
   SENDGRID_FROM_EMAIL=your_verified_email@domain.com
   ```

### 4. Deploy Email Function

The email sending is handled by Firebase Functions:

```bash
cd functions
npm install
firebase deploy --only functions
```

---

## Canny AI Setup

Canny is the AI assistant that can manipulate the canvas and see what's on it.

### 1. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Go to **API Keys**
4. Click **Create new secret key**
5. Copy the key and add to `.env.local`:
   ```
   OPENAI_API_KEY=sk-xxxxx
   ```

### 2. Configure Model

Canny uses GPT-4o (with vision) by default. If you want to change the model, edit:
- `server.js` (for local development)
- `api/chat.js` (for production/Vercel)

### 3. Features

Canny can:
- **Create shapes** (rectangles, circles, polygons, text)
- **Arrange shapes** (align, distribute, grid layout)
- **Modify shapes** (change colors, sizes, rotation)
- **Delete shapes** (selected or all)
- **See the canvas** (using GPT-4 Vision)
- **Answer questions** about the canvas

---

## Local Development

### Start Development Server

```bash
# Terminal 1: Start Vite dev server
npm run dev

# Terminal 2: Start API server (for Canny)
npm run server

# Or start both at once:
npm run dev:all
```

The app will be available at `http://localhost:5173`

### Development Tools

- **Hot Module Replacement (HMR)**: Changes reflect immediately
- **React DevTools**: Install browser extension for debugging
- **Firebase Emulators** (optional): Test without using production data

```bash
firebase emulators:start
```

---

## Deployment

### Vercel Deployment (Recommended)

#### 1. Install Vercel CLI

```bash
npm install -g vercel
```

#### 2. Login to Vercel

```bash
vercel login
```

#### 3. Deploy

```bash
# First deployment
vercel

# Production deployment
vercel --prod
```

#### 4. Configure Environment Variables

In Vercel Dashboard:
1. Go to your project
2. Click **Settings** > **Environment Variables**
3. Add all variables from `.env.local`
4. Redeploy if needed

#### 5. Configure Custom Domain (Optional)

1. Go to **Settings** > **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions

### Alternative: Firebase Hosting

```bash
# Build the app
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

---

## Troubleshooting

### Common Issues

**Firebase connection errors:**
- Check that all environment variables are set correctly
- Verify Firebase rules allow authenticated access
- Check browser console for specific error messages

**Canny not responding:**
- Verify OpenAI API key is valid
- Check that `server.js` is running (for local dev)
- Check Vercel function logs (for production)

**Email invitations not sending:**
- Verify SendGrid API key and sender email
- Check Firebase Functions logs
- Ensure sender email is verified in SendGrid

**Canvas not loading:**
- Check browser console for errors
- Verify you're authenticated
- Check Firebase Realtime Database rules

**Canvas background settings not saving:**

1. **Check console logs** when saving settings:
   - Success: `✅ Canvas settings saved successfully`
   - Error: `❌ Failed to save settings: PERMISSION_DENIED`

2. **Verify database rules are deployed:**
   ```bash
   firebase deploy --only database
   ```

3. **Check permissions in Firebase Console:**
   - Navigate to: `canvases/{canvasId}/permissions`
   - Should see: `{userId}: "owner"` or `{userId}: "editor"`
   - Also check: `userCanvases/{userId}/{canvasId}/role`

4. **Common causes:**
   - Database rules not deployed to production
   - User doesn't have owner/editor permissions
   - Incorrect Firebase project configuration

### Getting Help

- Check the browser console for error messages
- Review Firebase Console logs
- Check Vercel function logs (for production)
- Review `running_log.txt` for implementation details
- For permission issues, verify your role in the canvas

---

## Next Steps

After setup is complete:
1. Review [FEATURES.md](./FEATURES.md) for feature documentation
2. Check [TECHNICAL.md](./TECHNICAL.md) for architecture details
3. See [CHANGELOG.md](./CHANGELOG.md) for implementation history
4. Read the main [README.md](../README.md) for project overview

