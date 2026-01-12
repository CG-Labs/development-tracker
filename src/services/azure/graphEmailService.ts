/**
 * Microsoft Graph API Email Service
 *
 * Handles sending emails via Microsoft Graph API
 * Replaces SendGrid/Firebase email functionality
 */

import { Client } from '@microsoft/microsoft-graph-client';
import { acquireTokenSilent, graphScopes } from '../../config/azure';
import type { UserRole } from '../../types/roles';
import { ROLE_INFO } from '../../types/roles';

/**
 * Get authenticated Graph API client
 */
export function getGraphClient(): Client {
  return Client.init({
    authProvider: async (done) => {
      try {
        const token = await acquireTokenSilent(graphScopes.mailSend);
        done(null, token);
      } catch (error) {
        done(error as Error, null);
      }
    },
  });
}

/**
 * Generate invitation email HTML
 */
function generateInviteEmailHtml(
  inviteLink: string,
  role: UserRole,
  invitedByName: string
): string {
  const roleInfo = ROLE_INFO[role];

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px 10px 0 0;
            text-align: center;
          }
          .content {
            background: #f8f9fa;
            padding: 30px;
            border: 1px solid #e0e0e0;
            border-top: none;
            border-radius: 0 0 10px 10px;
          }
          .button {
            display: inline-block;
            background: #667eea;
            color: white !important;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
          }
          .role-badge {
            display: inline-block;
            background: #e0e7ff;
            color: #4338ca;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0;">DevTracker Invitation</h1>
        </div>
        <div class="content">
          <h2>Welcome to DevTracker!</h2>
          <p>${invitedByName} has invited you to join DevTracker as <span class="role-badge">${roleInfo.label}</span>.</p>
          <p><strong>Role description:</strong> ${roleInfo.description}</p>
          <p>Click the button below to accept your invitation and create your account:</p>
          <div style="text-align: center;">
            <a href="${inviteLink}" class="button">Accept Invitation</a>
          </div>
          <p style="margin-top: 30px; font-size: 14px; color: #666;">
            <strong>Important:</strong> This invitation link will expire in 7 days.
            If you're unable to access the link, please contact ${invitedByName} for a new invitation.
          </p>
          <p style="font-size: 14px; color: #666;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <code style="background: #e0e0e0; padding: 4px 8px; border-radius: 3px; font-size: 12px; word-break: break-all;">${inviteLink}</code>
          </p>
        </div>
        <div class="footer">
          <p>This email was sent from DevTracker. Please do not reply to this email.</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Send invitation email via Graph API
 */
export async function sendInvitationEmail(
  toEmail: string,
  inviteLink: string,
  role: UserRole,
  inviterName: string
): Promise<void> {
  const client = getGraphClient();

  const message = {
    subject: `You've been invited to DevTracker`,
    body: {
      contentType: 'HTML',
      content: generateInviteEmailHtml(inviteLink, role, inviterName),
    },
    toRecipients: [
      {
        emailAddress: {
          address: toEmail,
        },
      },
    ],
  };

  try {
    // Send email using Microsoft Graph API
    // Uses application permission Mail.Send - sends as service account
    await client.api('/me/sendMail').post({ message });
  } catch (error) {
    console.error('Error sending invitation email:', error);
    throw new Error('Failed to send invitation email');
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  resetLink: string
): Promise<void> {
  const client = getGraphClient();

  const message = {
    subject: 'Reset Your DevTracker Password',
    body: {
      contentType: 'HTML',
      content: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2>Password Reset Request</h2>
            <p>We received a request to reset your password for your DevTracker account.</p>
            <p>Click the link below to reset your password:</p>
            <p><a href="${resetLink}" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
            <p>If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
            <p>This link will expire in 24 hours.</p>
          </body>
        </html>
      `,
    },
    toRecipients: [
      {
        emailAddress: {
          address: toEmail,
        },
      },
    ],
  };

  try {
    await client.api('/me/sendMail').post({ message });
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}
