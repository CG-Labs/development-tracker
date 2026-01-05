/**
 * Script to check and fix admin user in Firestore
 *
 * Usage: npx tsx scripts/fixAdminUser.ts YOUR_PASSWORD
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, getDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

// Firebase config - same as in the app
const firebaseConfig = {
  apiKey: "AIzaSyCbFD4XkbHQaIahWiHJ1OuNQwcgCkvtlYc",
  authDomain: "development-tracker-13764.firebaseapp.com",
  projectId: "development-tracker-13764",
  storageBucket: "development-tracker-13764.firebasestorage.app",
  messagingSenderId: "430769368098",
  appId: "1:430769368098:web:0b0b6d049fa630407c6e7b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function main() {
  const password = process.argv[2];
  const email = "jcnasher@gmail.com";

  if (!password) {
    console.log("\nUsage: npx tsx scripts/fixAdminUser.ts YOUR_PASSWORD\n");
    process.exit(1);
  }

  console.log("\n=== Firebase Admin User Fix Script ===\n");

  // Step 1: Sign in to get the UID
  console.log("1. Authenticating with Firebase...\n");

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    console.log(`   Successfully authenticated!`);
    console.log(`   Email: ${email}`);
    console.log(`   Firebase Auth UID: ${uid}\n`);

    // Step 2: Check existing users
    console.log("2. Checking existing users in Firestore...\n");
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));

      if (usersSnapshot.empty) {
        console.log("   No users found in Firestore users collection!\n");
      } else {
        console.log(`   Found ${usersSnapshot.size} user(s):\n`);
        usersSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          console.log(`   - UID: ${docSnap.id}`);
          console.log(`     Email: ${data.email}`);
          console.log(`     Role: ${data.role}`);
          console.log(`     isActive: ${data.isActive}`);
          console.log(`     DisplayName: ${data.displayName || "(not set)"}`);
          console.log("");
        });
      }
    } catch (error: any) {
      console.log("   Could not list users (security rules may block this):", error.code);
      console.log("   Will proceed to create/update your user document...\n");
    }

    // Step 3: Check if user document exists
    console.log("3. Checking if your user document exists...\n");
    const userDocRef = doc(db, "users", uid);

    try {
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        console.log("   User document EXISTS with data:");
        const data = userDoc.data();
        console.log(`     email: ${data.email}`);
        console.log(`     role: ${data.role}`);
        console.log(`     isActive: ${data.isActive}`);
        console.log(`     displayName: ${data.displayName}`);
        console.log("");
      } else {
        console.log("   User document DOES NOT EXIST - will create it\n");
      }

      // Step 4: Create/update the admin user
      console.log("4. Creating/updating admin user document...\n");

      const userData = {
        uid: uid,
        email: email,
        displayName: "Chris Nash",
        role: "admin",
        isActive: true,
        createdAt: userDoc.exists() && userDoc.data()?.createdAt ? userDoc.data()?.createdAt : serverTimestamp(),
        lastLogin: serverTimestamp(),
      };

      await setDoc(userDocRef, userData, { merge: true });
      console.log("   Admin user document created/updated successfully!\n");

      // Step 5: Verify the document
      console.log("5. Verifying the document...\n");
      const verifyDoc = await getDoc(userDocRef);
      if (verifyDoc.exists()) {
        const data = verifyDoc.data();
        console.log("   Document verified:");
        console.log(`     uid: ${data.uid}`);
        console.log(`     email: ${data.email}`);
        console.log(`     displayName: ${data.displayName}`);
        console.log(`     role: ${data.role}`);
        console.log(`     isActive: ${data.isActive}`);
        console.log("");
      }

      // Step 6: Test creating an invite
      console.log("6. Testing invite creation...\n");
      try {
        const testInviteRef = doc(collection(db, "invites"));
        const testInviteData = {
          email: "test-delete-me@example.com",
          role: "viewer",
          invitedBy: uid,
          invitedByEmail: email,
          createdAt: serverTimestamp(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: "pending",
        };

        await setDoc(testInviteRef, testInviteData);
        console.log("   SUCCESS! Test invite created!");
        console.log(`   Invite ID: ${testInviteRef.id}`);

        // Delete the test invite
        await deleteDoc(testInviteRef);
        console.log("   Test invite deleted.\n");

        console.log("   *** INVITE FUNCTIONALITY IS WORKING! ***\n");
      } catch (error: any) {
        console.log("   FAILED to create test invite!");
        console.log(`   Error: ${error.message}`);
        console.log(`   Code: ${error.code}`);
        console.log("\n   This means there's still a security rules issue.\n");
      }

    } catch (error: any) {
      console.log("   Error accessing user document:", error.message);
      console.log("   Code:", error.code);
    }

    console.log("=== Script Complete ===\n");

  } catch (error: any) {
    console.error("\n   Authentication failed:", error.message);
    console.log("   Code:", error.code);
    console.log("\n   Make sure you entered the correct password.\n");
  }

  process.exit(0);
}

main().catch(console.error);
