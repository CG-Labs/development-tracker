/**
 * Check if user exists
 */

const admin = require('firebase-admin');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');

async function main() {
  const email = process.argv[2]?.toLowerCase();

  if (!email) {
    console.log('Usage: node scripts/check-user.cjs <email>');
    process.exit(1);
  }

  const serviceAccount = require(SERVICE_ACCOUNT_PATH);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  const db = admin.firestore();

  // Check users collection
  const usersSnapshot = await db.collection('users')
    .where('email', '==', email)
    .get();

  if (!usersSnapshot.empty) {
    console.log('\n=== User Found in Firestore ===');
    usersSnapshot.forEach(doc => {
      console.log('ID:', doc.id);
      console.log('Data:', JSON.stringify(doc.data(), null, 2));
    });
  } else {
    console.log('\nNo user found in Firestore with email:', email);
  }

  // Check invites
  const invitesSnapshot = await db.collection('invites')
    .where('email', '==', email)
    .get();

  if (!invitesSnapshot.empty) {
    console.log('\n=== Invites Found ===');
    invitesSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ${doc.id}: status=${data.status}, role=${data.role}`);
    });
  }

  // Check Firebase Auth
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log('\n=== Firebase Auth User ===');
    console.log('UID:', userRecord.uid);
    console.log('Email:', userRecord.email);
    console.log('Created:', userRecord.metadata.creationTime);
  } catch (e) {
    console.log('\nNo Firebase Auth user found for:', email);
  }

  process.exit(0);
}

main();
