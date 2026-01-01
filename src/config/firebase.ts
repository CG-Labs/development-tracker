import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCbFD4XkbHQaIahWiHJ1OuNQwcgCkvtlYc",
  authDomain: "development-tracker-13764.firebaseapp.com",
  projectId: "development-tracker-13764",
  storageBucket: "development-tracker-13764.firebasestorage.app",
  messagingSenderId: "430769368098",
  appId: "1:430769368098:web:0b0b6d049fa630407c6e7b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
