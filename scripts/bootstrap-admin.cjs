/**
 * Bootstrap Admin User Script
 *
 * Creates an admin user directly in Firebase Auth and Firestore.
 * Use this when you need to create the first admin without going through the invite flow.
 *
 * Usage:
 *   node scripts/bootstrap-admin.cjs <email> <password> [displayName]
 *
 * Example:
 *   node scripts/bootstrap-admin.cjs admin@example.com MyPassword123 "Admin User"
 */

const admin = require('firebase-admin');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node scripts/bootstrap-admin.cjs <email> <password> [displayName]');
    console.log('');
    console.log('Example: node scripts/bootstrap-admin.cjs admin@example.com MyPassword123 "Admin User"');
    process.exit(1);
  }

  const email = args[0].toLowerCase();
  const password = args[1];
  const displayName = args[2] || email.split('@')[0];

  if (password.length < 6) {
    console.error('Error: Password must be at least 6 characters');
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

  console.log(`\nBootstrapping admin user: ${email}`);
  console.log('');

  try {
    // Check if user already exists in Firestore
    const usersSnapshot = await db.collection('users')
      .where('email', '==', email)
      .get();

    if (!usersSnapshot.empty) {
      console.error('Error: A user with this email already exists in Firestore');
      process.exit(1);
    }

    // Check if user exists in Firebase Auth
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log('User already exists in Firebase Auth, using existing UID');
    } catch (e) {
      // User doesn't exist in Auth, create them
      console.log('Creating user in Firebase Auth...');
      userRecord = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: displayName,
        emailVerified: true, // Mark as verified since we're bootstrapping
      });
      console.log(`Created Firebase Auth user with UID: ${userRecord.uid}`);
    }

    // Create user profile in Firestore
    console.log('Creating user profile in Firestore...');
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email,
      displayName: displayName,
      role: 'admin',
      status: 'active',
      isActive: true,
      allowedDevelopments: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      passwordSet: true,
    });

    console.log('');
    console.log('✓ Admin user created successfully!');
    console.log('');
    console.log('You can now log in with:');
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
    console.log('');
    console.log('Login at: https://development-tracker-13764.web.app/login');

  } catch (error) {
    console.error('Error creating admin user:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

main();
