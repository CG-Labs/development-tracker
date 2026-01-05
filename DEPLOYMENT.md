# DevTracker Deployment Guide

This guide covers deploying DevTracker to Firebase Hosting and configuring all required services.

## Prerequisites

- Node.js 18 or higher
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase project created at https://console.firebase.google.com
- SendGrid account for email delivery

## Environment Setup

### 1. Create Environment File

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# SendGrid Configuration
VITE_SENDGRID_API_KEY=your_sendgrid_api_key_here
VITE_SENDGRID_FROM_EMAIL=noreply@yourdomain.com
VITE_SENDGRID_FROM_NAME=DevTracker

# Application URL (your Firebase hosting URL)
VITE_APP_URL=https://your-project.web.app
```

### 2. Firebase Configuration

Ensure `src/config/firebase.ts` has your Firebase project credentials.

## SendGrid Email Setup

DevTracker uses SendGrid for sending invitation emails. The email service queues emails in Firestore, which are then processed by a Cloud Function.

### Setting Up SendGrid

1. Create a SendGrid account at https://sendgrid.com
2. Create an API key with full access
3. Verify a sender email address or domain
4. Add the API key to Firebase Functions config:

```bash
firebase functions:config:set sendgrid.api_key="YOUR_SENDGRID_API_KEY"
firebase functions:config:set sendgrid.from_email="noreply@yourdomain.com"
firebase functions:config:set sendgrid.from_name="DevTracker"
```

### Cloud Function for Email Processing

Create a Cloud Function to process the email queue. Add this to your `functions/src/index.ts`:

```typescript
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as sgMail from "@sendgrid/mail";

admin.initializeApp();

const sendgridConfig = functions.config().sendgrid;
sgMail.setApiKey(sendgridConfig.api_key);

export const processEmailQueue = functions.firestore
  .document("emailQueue/{emailId}")
  .onCreate(async (snap, context) => {
    const email = snap.data();

    try {
      await sgMail.send({
        to: email.to,
        from: {
          email: sendgridConfig.from_email,
          name: sendgridConfig.from_name,
        },
        subject: email.subject,
        html: email.html,
        text: email.text,
      });

      await snap.ref.update({
        status: "sent",
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error("Error sending email:", error);
      await snap.ref.update({
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
```

Deploy the function:

```bash
cd functions
npm install @sendgrid/mail
cd ..
firebase deploy --only functions
```

## User Management System

### Role Hierarchy

DevTracker uses a 4-level role hierarchy:

| Role | Description | Permissions |
|------|-------------|-------------|
| Admin | Full system access | All permissions, can manage all users |
| Manager | User management | Can manage users, view audit logs, all development access |
| Editor | Data editing | Can edit units, create notes, generate reports |
| Viewer | Read-only | Can view developments and units, generate reports |

### Admin Emails

Admin emails are configured in `src/services/userService.ts`. Users with these emails automatically get admin access on first login:

```typescript
const ADMIN_EMAILS = ["jcnasher@gmail.com", "jcnasher@outlook.com"];
```

Update this list with your admin email addresses.

### Invite System

- Users cannot sign up without a valid invitation
- Admins and Managers can send invitations
- Invitations are sent via email with magic links
- Invitations expire after 7 days
- Invitations can be resent (generates new token)

## Deploying to Firebase

### 1. Build the Application

```bash
npm run build
```

### 2. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 3. Deploy Hosting

```bash
firebase deploy --only hosting
```

### 4. Full Deployment

```bash
npm run build && firebase deploy
```

## Firestore Security Rules

The security rules enforce:

- Users can only read their own profile (unless admin/manager)
- Only admins can delete users
- Invites are readable by anyone (for magic link validation)
- Email queue can only be created by authenticated users
- Notifications are user-specific
- Audit logs can be created by any authenticated user but only read by admins/managers

## Cleaning Up Orphan Users

If you need to remove orphan users (users in the database without valid Firebase Auth accounts):

1. Log in as an admin
2. Open browser console (F12)
3. Run:

```javascript
// Import and run cleanup
import('/src/scripts/cleanupOrphanUsers.ts')
  .then(m => m.cleanupOrphanUser('user@example.com', 'admin-uid'))
```

Or delete directly from the Firebase Console > Firestore > users collection.

## Troubleshooting

### Emails Not Sending

1. Check Firebase Functions logs for errors
2. Verify SendGrid API key is correct
3. Check sender email is verified in SendGrid
4. Review `emailQueue` collection for failed emails

### Users Can't Access

1. Verify user exists in `users` collection
2. Check `isActive` is `true`
3. Verify role is set correctly
4. Check `allowedDevelopments` if using development restrictions

### Invite Links Not Working

1. Verify `VITE_APP_URL` is correct
2. Check invite status is "pending"
3. Verify invite hasn't expired
4. Ensure email matches the invite email exactly

## Security Considerations

- Never commit `.env` files to version control
- Rotate SendGrid API keys periodically
- Review audit logs regularly
- Monitor failed login attempts
- Keep Firebase SDK updated
