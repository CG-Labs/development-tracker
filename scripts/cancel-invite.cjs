/**
 * Cancel pending invite by email
 */

const admin = require('firebase-admin');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');

async function main() {
  const email = process.argv[2]?.toLowerCase();

  if (!email) {
    console.log('Usage: node scripts/cancel-invite.cjs <email>');
    process.exit(1);
  }

  const serviceAccount = require(SERVICE_ACCOUNT_PATH);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  const db = admin.firestore();

  const snapshot = await db.collection('invites')
    .where('email', '==', email)
    .where('status', '==', 'pending')
    .get();

  if (snapshot.empty) {
    console.log('No pending invite found for:', email);
    process.exit(0);
  }

  for (const doc of snapshot.docs) {
    await doc.ref.update({ status: 'cancelled' });
    console.log(`Cancelled invite: ${doc.id}`);
  }

  console.log('Done!');
  process.exit(0);
}

main();
