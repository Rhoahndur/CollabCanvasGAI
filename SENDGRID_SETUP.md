# SendGrid Email Setup Guide

This guide will help you set up SendGrid for sending canvas invitation emails via Firebase Cloud Functions.

## Step 1: Create SendGrid Account (FREE)

1. Go to https://sendgrid.com/
2. Click "Start for Free"
3. Sign up with your email
4. Verify your email address
5. Complete the account setup

**Free Tier Includes:**
- 100 emails/day forever
- Perfect for canvas invitations!

## Step 2: Verify Sender Email

SendGrid requires you to verify the email address you'll send FROM:

1. Log into SendGrid dashboard
2. Go to **Settings** → **Sender Authentication**
3. Click **"Get Started"** under "Single Sender Verification"
4. Fill in your details:
   - **From Name**: CollabCanvasGAI (or your app name)
   - **From Email**: noreply@yourdomain.com (or your email)
   - **Reply To**: your-email@example.com
   - Other fields as needed
5. Click **"Create"**
6. Check your email and click the verification link
7. Wait for SendGrid to approve (usually instant)

**Note**: For production, consider Domain Authentication for better deliverability.

## Step 3: Create API Key

1. In SendGrid dashboard, go to **Settings** → **API Keys**
2. Click **"Create API Key"**
3. Name it: `CollabCanvasGAI Functions`
4. Choose **"Restricted Access"**
5. Under **Mail Send**, enable:
   - **Mail Send** → Full Access
6. Click **"Create & View"**
7. **COPY THE API KEY NOW** (you won't see it again!)
   - Format: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Step 4: Configure Firebase Functions

Open your terminal and run these commands:

```bash
cd /Users/aleksandrgaun/Downloads/CollabCanvasGAI

# Install dependencies
cd functions
npm install

# Set SendGrid API Key
cd ..
firebase functions:config:set sendgrid.key="YOUR_SENDGRID_API_KEY_HERE"

# Set sender email (must match verified email from Step 2)
firebase functions:config:set sendgrid.from="noreply@yourdomain.com"

# Set your app URL
firebase functions:config:set app.url="https://your-app-url.com"

# Verify configuration
firebase functions:config:get
```

**Example:**
```bash
firebase functions:config:set sendgrid.key="SG.abc123xyz..."
firebase functions:config:set sendgrid.from="noreply@collabcanvasgai.com"
firebase functions:config:set app.url="https://collabcanvasgai.web.app"
```

## Step 5: Deploy Functions

```bash
firebase deploy --only functions
```

This will deploy:
- `sendCanvasInvitation` - Sends emails when invitations are created
- `cleanupOldInvitations` - Runs daily to clean up old invitations

## Step 6: Update ShareCanvasModal

The `ShareCanvasModal.jsx` needs to write invitations to the database instead of directly adding permissions:

```javascript
// In handleInvite function, replace addCanvasPermission with:
const invitationRef = ref(
  realtimeDb,
  `canvases/${canvasId}/invitations/${sanitizedEmail}`
);
await set(invitationRef, {
  email: inviteEmail.trim(),
  role: selectedRole,
  canvasName: canvasName,
  inviterName: user.displayName || user.email,
  canvasId: canvasId,
  createdAt: Date.now(),
  sent: false,
});
```

## Step 7: Test It!

1. Open your app
2. Create or open a canvas
3. Click "Share"
4. Enter an email address
5. Select a role (Viewer/Editor)
6. Click "Send Invite"
7. Check the recipient's email!

## Troubleshooting

### "SendGrid API key not configured"
Run: `firebase functions:config:get`
Make sure `sendgrid.key` is set.

### "Invalid sender email"
The sender email must be verified in SendGrid.
Go to Settings → Sender Authentication → Verify your email.

### "Email not delivered"
- Check SendGrid dashboard → Activity → Email Activity
- Look for bounces or blocks
- Check recipient's spam folder
- Verify sender email is authenticated

### View Function Logs
```bash
firebase functions:log
```

## Cost Breakdown

**SendGrid Free Tier:**
- ✅ 100 emails/day forever
- ✅ No credit card required
- ✅ Email API access
- ✅ Email activity tracking

**Firebase Functions Free Tier:**
- ✅ 2,000,000 invocations/month
- ✅ 400,000 GB-seconds compute time
- ✅ 200,000 CPU-seconds compute time
- ✅ 5GB network egress

**Total Cost: $0** (for typical usage)

## Security Notes

1. **Never commit API keys** to git
   - API keys are stored in Firebase config (encrypted)
   - `.gitignore` excludes `.runtimeconfig.json`

2. **Restrict API key permissions**
   - Only grant "Mail Send" permission
   - No other SendGrid permissions needed

3. **Rate limiting**
   - Free tier: 100 emails/day
   - Functions automatically handle failures
   - Old invitations auto-cleanup after 30 days

## Next Steps

Once email sending works:
- Consider upgrading SendGrid for more emails
- Set up domain authentication for better deliverability
- Add custom email templates
- Track email opens and clicks

---

**Need Help?**
- SendGrid Docs: https://docs.sendgrid.com/
- Firebase Functions: https://firebase.google.com/docs/functions

