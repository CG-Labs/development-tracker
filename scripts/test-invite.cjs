/**
 * Test script to send a Firebase Magic Link invite
 *
 * Usage:
 *   node scripts/test-invite.js <email> [role]
 *
 * Example:
 *   node scripts/test-invite.js test@example.com viewer
 *
 * Before running:
 *   1. Download service account key from Firebase Console:
 *      - Go to: https://console.firebase.google.com/project/development-tracker-13764/settings/serviceaccounts/adminsdk
 *      - Click "Generate new private key"
 *      - Save as: scripts/serviceAccountKey.json
 *   2. Run this script
 */

const admin = require('firebase-admin');
const path = require('path');

// Configuration
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');
const APP_URL = 'https://development-tracker-13764.web.app';

// Admin user info (simulating the inviter)
// These are placeholders - in production, use actual admin credentials
const ADMIN_UID = 'system-test';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_NAME = 'System Admin';

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: node scripts/test-invite.js <email> [role]');
    console.log('');
    console.log('Roles: admin, editor, viewer (default: viewer)');
    console.log('');
    console.log('Example: node scripts/test-invite.js test@example.com editor');
    process.exit(1);
  }

  const email = args[0].toLowerCase();
  const role = args[1] || 'viewer';

  if (!['admin', 'editor', 'viewer'].includes(role)) {
    console.error('Invalid role. Must be: admin, editor, or viewer');
    process.exit(1);
  }

  // Check for service account file
  try {
    require(SERVICE_ACCOUNT_PATH);
  } catch (e) {
    console.error('Service account key not found!');
    console.error('');
    console.error('Please download it from Firebase Console:');
    console.error('1. Go to: https://console.firebase.google.com/project/development-tracker-13764/settings/serviceaccounts/adminsdk');
    console.error('2. Click "Generate new private key"');
    console.error('3. Save the file as: scripts/serviceAccountKey.json');
    process.exit(1);
  }

  // Initialize Firebase Admin
  const serviceAccount = require(SERVICE_ACCOUNT_PATH);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  const db = admin.firestore();

  console.log(`\nSending invite to: ${email}`);
  console.log(`Role: ${role}`);
  console.log('');

  try {
    // Check if user already exists
    const usersSnapshot = await db.collection('users')
      .where('email', '==', email)
      .get();

    if (!usersSnapshot.empty) {
      console.error('Error: A user with this email already exists');
      process.exit(1);
    }

    // Check for existing pending invite
    const invitesSnapshot = await db.collection('invites')
      .where('email', '==', email)
      .where('status', '==', 'pending')
      .get();

    if (!invitesSnapshot.empty) {
      console.error('Error: There is already a pending invite for this email');
      console.log('Tip: Cancel the existing invite first, or use a different email');
      process.exit(1);
    }

    // Create invite record
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const inviteData = {
      email: email,
      role: role,
      allowedDevelopments: null,
      invitedBy: ADMIN_UID,
      invitedByEmail: ADMIN_EMAIL,
      invitedByName: ADMIN_NAME,
      inviteeName: null,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    };

    const docRef = await db.collection('invites').add(inviteData);
    console.log(`Invite created with ID: ${docRef.id}`);

    // Generate the magic link
    const actionCodeSettings = {
      url: `${APP_URL}/complete-signup?inviteId=${docRef.id}`,
      handleCodeInApp: true,
    };

    const signInLink = await admin.auth().generateSignInWithEmailLink(
      email,
      actionCodeSettings
    );

    console.log('\n✓ Invite created successfully!');
    console.log('');
    console.log('The user should receive an email from Firebase.');
    console.log('');
    console.log('If email is not received, they can use this direct link:');
    console.log('');
    console.log(signInLink);
    console.log('');
    console.log(`Invite expires: ${expiresAt.toLocaleDateString()}`);

    // Log audit event
    await db.collection('auditLogs').add({
      action: 'user_invited',
      performedBy: ADMIN_UID,
      details: { email, role },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

  } catch (error) {
    console.error('Error sending invite:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

main();
