const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

// Initialize Firebase Admin
admin.initializeApp();

// Initialize SendGrid with API key from Firebase config
// You'll set this with: firebase functions:config:set sendgrid.key="YOUR_SENDGRID_API_KEY"
const SENDGRID_API_KEY = functions.config().sendgrid?.key;
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

/**
 * Send Canvas Invitation Email
 * 
 * Triggered when a new invitation is added to the database
 * Path: /canvases/{canvasId}/invitations/{invitationId}
 * 
 * Payload:
 * {
 *   email: "recipient@example.com",
 *   role: "viewer" | "editor",
 *   canvasName: "My Canvas",
 *   inviterName: "John Doe",
 *   canvasId: "canvas_123"
 * }
 */
exports.sendCanvasInvitation = functions.database
  .ref('/canvases/{canvasId}/invitations/{invitationId}')
  .onCreate(async (snapshot, context) => {
    try {
      const invitation = snapshot.val();
      const { canvasId } = context.params;
      
      // Validate invitation data
      if (!invitation.email || !invitation.role || !invitation.canvasName || !invitation.inviterName) {
        console.error('Missing required invitation fields:', invitation);
        return null;
      }
      
      // Check if SendGrid is configured
      if (!SENDGRID_API_KEY) {
        console.error('SendGrid API key not configured. Set it with: firebase functions:config:set sendgrid.key="YOUR_KEY"');
        return null;
      }
      
      // Generate canvas link with role
      const canvasLink = `${functions.config().app?.url || 'https://your-app-url.com'}/canvas/${canvasId}?role=${invitation.role}`;
      
      // Email content
      const msg = {
        to: invitation.email,
        from: functions.config().sendgrid?.from || 'noreply@collabcanvasgai.com', // Verified sender in SendGrid
        subject: `${invitation.inviterName} invited you to collaborate on "${invitation.canvasName}"`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Canvas Invitation</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎨 Canvas Invitation</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              
              <p style="font-size: 18px; margin-top: 0;">Hi there! 👋</p>
              
              <p style="font-size: 16px;">
                <strong>${invitation.inviterName}</strong> has invited you to collaborate on their canvas:
              </p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
                <h2 style="margin: 0 0 10px 0; font-size: 20px; color: #667eea;">${invitation.canvasName}</h2>
                <p style="margin: 0; color: #666;">
                  Role: <strong style="color: ${invitation.role === 'editor' ? '#10b981' : '#6b7280'}; text-transform: capitalize;">${invitation.role}</strong>
                  ${invitation.role === 'editor' ? '(Can view & edit)' : '(Can view only)'}
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${canvasLink}" 
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);">
                  Open Canvas →
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <strong>What is CollabCanvasGAI?</strong><br>
                A real-time collaborative canvas where you can create, share, and edit visual content together with your team.
              </p>
              
              <p style="font-size: 12px; color: #999; margin-top: 20px; text-align: center;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
              
            </div>
            
          </body>
          </html>
        `,
        text: `
Hi there!

${invitation.inviterName} has invited you to collaborate on their canvas: "${invitation.canvasName}"

Role: ${invitation.role} ${invitation.role === 'editor' ? '(Can view & edit)' : '(Can view only)'}

Open the canvas here:
${canvasLink}

What is CollabCanvasGAI?
A real-time collaborative canvas where you can create, share, and edit visual content together with your team.

If you didn't expect this invitation, you can safely ignore this email.
        `.trim(),
      };
      
      // Send email
      await sgMail.send(msg);
      console.log(`✅ Invitation email sent to ${invitation.email} for canvas ${invitation.canvasName}`);
      
      // Mark invitation as sent
      await snapshot.ref.update({ 
        sent: true, 
        sentAt: admin.database.ServerValue.TIMESTAMP 
      });
      
      return null;
    } catch (error) {
      console.error('❌ Error sending invitation email:', error);
      
      // Mark invitation as failed
      await snapshot.ref.update({ 
        sent: false, 
        error: error.message,
        errorAt: admin.database.ServerValue.TIMESTAMP
      });
      
      return null;
    }
  });

/**
 * Clean up old invitations
 * Runs daily to remove invitations older than 30 days
 */
exports.cleanupOldInvitations = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const db = admin.database();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    try {
      const canvasesRef = db.ref('canvases');
      const snapshot = await canvasesRef.once('value');
      
      let deletedCount = 0;
      const updates = {};
      
      snapshot.forEach((canvasSnapshot) => {
        const canvasId = canvasSnapshot.key;
        const invitations = canvasSnapshot.child('invitations').val();
        
        if (invitations) {
          Object.entries(invitations).forEach(([invitationId, invitation]) => {
            // Remove if older than 30 days and already sent
            if (invitation.sentAt && invitation.sentAt < thirtyDaysAgo) {
              updates[`canvases/${canvasId}/invitations/${invitationId}`] = null;
              deletedCount++;
            }
          });
        }
      });
      
      if (deletedCount > 0) {
        await db.ref().update(updates);
        console.log(`🧹 Cleaned up ${deletedCount} old invitations`);
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error cleaning up invitations:', error);
      return null;
    }
  });

