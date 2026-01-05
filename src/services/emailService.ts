/**
 * Email Service for DevTracker
 *
 * This service queues emails in Firestore for processing.
 * Emails are sent via SendGrid using Firebase Cloud Functions.
 *
 * Setup Instructions:
 * 1. Add your SendGrid API key to Firebase Functions config
 * 2. Deploy the Cloud Function that processes the emailQueue collection
 * 3. See DEPLOYMENT.md for full instructions
 */

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";

const EMAIL_QUEUE_COLLECTION = "emailQueue";

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface QueuedEmail extends EmailData {
  status: "pending" | "sent" | "failed";
  createdAt: ReturnType<typeof serverTimestamp>;
  sentAt?: Date;
  error?: string;
}

/**
 * Queue an email to be sent via SendGrid
 */
async function queueEmail(emailData: EmailData): Promise<string> {
  const queuedEmail: Omit<QueuedEmail, "sentAt" | "error"> = {
    ...emailData,
    status: "pending",
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, EMAIL_QUEUE_COLLECTION), queuedEmail);
  return docRef.id;
}

/**
 * Generate the invite email HTML template
 */
function generateInviteEmailHtml(params: {
  inviteeName: string;
  inviterName: string;
  inviterEmail: string;
  role: string;
  inviteLink: string;
  expiresAt: Date;
}): string {
  const { inviteeName, inviterName, inviterEmail, role, inviteLink, expiresAt } = params;
  const expiryDate = expiresAt.toLocaleDateString("en-IE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to DevTracker</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">DevTracker</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Development Portfolio Manager</p>
  </div>

  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
    <h2 style="color: #1e293b; margin-top: 0;">You're Invited!</h2>

    <p>Hello${inviteeName ? ` ${inviteeName}` : ""},</p>

    <p><strong>${inviterName}</strong> (${inviterEmail}) has invited you to join DevTracker as a <strong style="color: #8b5cf6;">${role}</strong>.</p>

    <p>DevTracker is a development portfolio management system that helps track construction progress, sales, and documentation across multiple property developments.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Accept Invitation
      </a>
    </div>

    <p style="color: #64748b; font-size: 14px;">
      This invitation will expire on <strong>${expiryDate}</strong>.
    </p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">

    <p style="color: #64748b; font-size: 13px; margin-bottom: 0;">
      If you didn't expect this invitation, you can safely ignore this email.
      <br><br>
      If the button doesn't work, copy and paste this link into your browser:
      <br>
      <a href="${inviteLink}" style="color: #0ea5e9; word-break: break-all;">${inviteLink}</a>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p style="margin: 0;">&copy; ${new Date().getFullYear()} DevTracker. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text version of invite email
 */
function generateInviteEmailText(params: {
  inviteeName: string;
  inviterName: string;
  inviterEmail: string;
  role: string;
  inviteLink: string;
  expiresAt: Date;
}): string {
  const { inviteeName, inviterName, inviterEmail, role, inviteLink, expiresAt } = params;
  const expiryDate = expiresAt.toLocaleDateString("en-IE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
You're Invited to DevTracker!

Hello${inviteeName ? ` ${inviteeName}` : ""},

${inviterName} (${inviterEmail}) has invited you to join DevTracker as a ${role}.

DevTracker is a development portfolio management system that helps track construction progress, sales, and documentation across multiple property developments.

Click the link below to accept your invitation:
${inviteLink}

This invitation will expire on ${expiryDate}.

If you didn't expect this invitation, you can safely ignore this email.

---
DevTracker - Development Portfolio Manager
  `.trim();
}

/**
 * Send an invite email
 */
export async function sendInviteEmail(params: {
  toEmail: string;
  inviteeName?: string;
  inviterName: string;
  inviterEmail: string;
  role: string;
  token: string;
  expiresAt: Date;
}): Promise<string> {
  const appUrl = import.meta.env.VITE_APP_URL || "https://development-tracker-13764.web.app";
  const inviteLink = `${appUrl}/invite/${params.token}`;

  const emailHtml = generateInviteEmailHtml({
    inviteeName: params.inviteeName || "",
    inviterName: params.inviterName,
    inviterEmail: params.inviterEmail,
    role: params.role,
    inviteLink,
    expiresAt: params.expiresAt,
  });

  const emailText = generateInviteEmailText({
    inviteeName: params.inviteeName || "",
    inviterName: params.inviterName,
    inviterEmail: params.inviterEmail,
    role: params.role,
    inviteLink,
    expiresAt: params.expiresAt,
  });

  return queueEmail({
    to: params.toEmail,
    subject: `${params.inviterName} invited you to join DevTracker`,
    html: emailHtml,
    text: emailText,
  });
}

/**
 * Generate notification email for when an invite is accepted
 */
export async function sendInviteAcceptedEmail(params: {
  toEmail: string;
  adminName: string;
  newUserName: string;
  newUserEmail: string;
  role: string;
}): Promise<string> {
  const { adminName, newUserName, newUserEmail, role } = params;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invite Accepted</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #10b981; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
    <h2 style="color: white; margin: 0;">Invitation Accepted!</h2>
  </div>

  <p>Hello ${adminName},</p>

  <p>Great news! <strong>${newUserName}</strong> (${newUserEmail}) has accepted your invitation and joined DevTracker as a <strong>${role}</strong>.</p>

  <p>They now have access to the system based on their assigned role and developments.</p>

  <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
    - DevTracker
  </p>
</body>
</html>
  `.trim();

  return queueEmail({
    to: params.toEmail,
    subject: `${newUserName} has joined DevTracker`,
    html,
    text: `Hello ${adminName},\n\n${newUserName} (${newUserEmail}) has accepted your invitation and joined DevTracker as a ${role}.\n\n- DevTracker`,
  });
}
