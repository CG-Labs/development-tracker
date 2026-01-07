# Firebase + React App Development Skill

## Project: Development Tracker
**Build Duration:** Multiple sessions
**Stack:** React + TypeScript + Firebase (Auth, Firestore, Hosting) + Vite
**Purpose:** Property development portfolio management with user roles and permissions

---

## Executive Summary

This document captures lessons learned from building the Development Tracker application. It serves as a reference guide for future Firebase + React projects, documenting what worked well, what caused issues, and how problems were resolved.

---

## Part 1: What Was Done Correctly

### 1.1 Project Architecture

**Modular Service Layer**
```
src/
├── services/           # Business logic separated from UI
│   ├── userService.ts
│   ├── developmentService.ts
│   ├── excelExportService.ts
│   └── auditService.ts
├── contexts/           # React contexts for global state
│   └── AuthContext.tsx
├── components/         # UI components
├── types/              # TypeScript interfaces
└── config/             # Firebase configuration
```

**Why this worked:**
- Services are testable independently of React
- Clear separation of concerns
- Easy to refactor without touching UI
- TypeScript catches errors at compile time

**Role-Based Permission System**
```typescript
// types/roles.ts - Centralized permission definitions
export const ROLE_PERMISSIONS: Record<Permission, UserRole[]> = {
  manageUsers: ["admin"],
  editUnit: ["admin", "manager", "editor"],
  viewUnit: ["admin", "manager", "editor", "viewer"],
  // ... etc
};

export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[permission]?.includes(role) ?? false;
}
```

**Why this worked:**
- Single source of truth for permissions
- Easy to audit who can do what
- Permission checks are consistent across the app
- Adding new permissions is straightforward

### 1.2 Firebase Configuration

**Environment-Based Configuration**
```typescript
// config/firebase.ts
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  // ...
};
```

**Why this worked:**
- Secrets not committed to git
- Easy to switch between environments
- Vite handles env variable injection at build time

### 1.3 Data Export/Import

**Excel Export with Instructions Sheet**
```typescript
// Include an Instructions sheet in exports
const instructionsData = [
  ["READ-ONLY COLUMNS (Do not modify):"],
  ["- Development Name: Used to identify the development"],
  ["- Unit Number: Used to identify the unit"],
  ["EDITABLE COLUMNS:"],
  // ... detailed guidance
];
```

**Why this worked:**
- Users understand what they can/cannot modify
- Reduces support requests
- Import validation catches errors early
- Round-trip data integrity maintained

### 1.4 Admin Bootstrap Script

**Direct Admin Creation Script**
```javascript
// scripts/bootstrap-admin.cjs
// Creates admin user directly in Firebase Auth + Firestore
// Bypasses invite flow for initial setup
```

**Why this worked:**
- Solves chicken-and-egg problem (need admin to invite admin)
- Can recover from locked-out situations
- Useful for development/testing
- Clear usage instructions in script header

---

## Part 2: What Was Done Incorrectly (And How It Was Fixed)

### 2.1 Firebase Magic Link Authentication

**CRITICAL ISSUE: Password Setup After Magic Link Sign-In**

**The Problem:**
Firebase's `updatePassword()` requires "recent authentication." When we separated the magic link sign-in from password setup into two steps, the session became "stale" and password updates failed.

**Original Broken Flow:**
```
1. User clicks magic link
2. signInWithEmailLink() succeeds
3. User sees "Welcome!" message
4. User navigates to password setup page
5. updatePassword() FAILS - "requires-recent-login"
```

**The Fix - Single Form Approach:**
```typescript
// CompleteSignup.tsx - Combined form
const handleSignup = async (e: React.FormEvent) => {
  // Collect email, name, AND password in single form

  // Step 1: Sign in with magic link
  const result = await signInWithEmailLink(auth, email, window.location.href);

  // Step 2: Set password IMMEDIATELY while session is fresh
  await updatePassword(result.user, password);  // Works!

  // Step 3: Create user profile
  await setDoc(doc(db, "users", result.user.uid), { ... });
};
```

**Lesson Learned:**
> Firebase authentication operations that require recent login MUST happen immediately after sign-in. Never separate these into multiple steps/pages.

---

### 2.2 Firestore Sync Race Conditions

**CRITICAL ISSUE: "Access Denied" After Successful Signup**

**The Problem:**
After CompleteSignup created the user profile and redirected to the dashboard, the AuthContext's `onAuthStateChanged` would fire and try to load the profile. Sometimes Firestore hadn't synced yet, returning `null`, which triggered "Access Denied."

**Original Broken Code:**
```typescript
// AuthContext.tsx
const loadUserWithProfile = async (user: User) => {
  const profile = await getUserProfile(user.uid);

  if (!profile) {
    // IMMEDIATELY denies access - no retry!
    setAccessDenied("no_invite");
    return null;
  }
  // ...
};
```

**The Fix - Retry Logic:**
```typescript
const loadUserWithProfile = async (user: User) => {
  let profile = await getUserProfile(user.uid);

  if (!profile) {
    // Retry up to 3 times with 500ms delay
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      profile = await getUserProfile(user.uid);
      if (profile) break;
    }
  }

  if (!profile) {
    setAccessDenied("no_invite");
    return null;
  }
  // ...
};
```

**Lesson Learned:**
> Firestore writes are not instantly available for reads. Always implement retry logic when reading data that was just written, especially after redirects.

---

### 2.3 Firebase Admin SDK vs Client SDK

**ISSUE: Invite Emails Not Being Sent**

**The Problem:**
We created a test script using Firebase Admin SDK's `generateSignInWithEmailLink()` and expected it to send emails. It doesn't - it only generates the link.

**What Each SDK Does:**

| Operation | Admin SDK | Client SDK |
|-----------|-----------|------------|
| Generate magic link | `generateSignInWithEmailLink()` - Returns URL only | N/A |
| Send magic link email | N/A | `sendSignInLinkToEmail()` - Sends email |
| Create user | `auth().createUser()` | `createUserWithEmailAndPassword()` |
| Set password | `auth().updateUser()` | `updatePassword()` |

**Lesson Learned:**
> Firebase Admin SDK is for server-side operations and doesn't send emails. Use Client SDK's `sendSignInLinkToEmail()` for email delivery, or implement your own email service with Admin SDK.

---

### 2.4 Authentication State Management

**ISSUE: Multiple Auth State Sources**

**The Problem:**
Having both `onAuthStateChanged` listener AND manual state updates led to race conditions and inconsistent state.

**Best Practice:**
```typescript
// Let onAuthStateChanged be the SINGLE source of truth
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Load profile and set state HERE
      const authUser = await loadUserWithProfile(user);
      setCurrentUser(authUser);
    } else {
      setCurrentUser(null);
    }
    setLoading(false);
  });
  return unsubscribe;
}, []);
```

**Lesson Learned:**
> Use `onAuthStateChanged` as the single source of truth for authentication state. Don't manually set auth state elsewhere - let the listener handle it.

---

## Part 3: Firebase-Specific Best Practices

### 3.1 Firestore Data Modeling

**User Profiles Structure:**
```typescript
interface UserProfile {
  uid: string;                    // Match Firebase Auth UID
  email: string;                  // Lowercase, for queries
  displayName?: string;
  role: UserRole;
  status: UserStatus;
  isActive: boolean;              // Quick access control check
  allowedDevelopments?: string[]; // Array for flexible access
  passwordSet?: boolean;          // Track signup completion
  createdAt: Timestamp;
  lastLogin?: Timestamp;
}
```

**Key Decisions:**
- Store `uid` in document for queries
- Use `isActive` boolean for quick checks (not just status)
- `passwordSet` tracks magic link flow completion
- Timestamps for audit trail

### 3.2 Firestore Security Rules Pattern

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isAdmin() {
      return isAuthenticated() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated() && (isOwner(userId) || isAdmin());
      allow write: if isAdmin();
    }

    // Invites collection
    match /invites/{inviteId} {
      allow read: if true;  // Anyone with link can read
      allow create: if isAdmin();
      allow update: if isAuthenticated();  // Accept invite
    }
  }
}
```

### 3.3 Error Handling Pattern

```typescript
try {
  await someFirebaseOperation();
} catch (err) {
  let errorMessage = "An unexpected error occurred.";

  if (err instanceof Error) {
    const errorCode = (err as { code?: string }).code || err.message;

    // Map Firebase error codes to user-friendly messages
    if (errorCode.includes("invalid-action-code")) {
      errorMessage = "This link has expired. Please request a new one.";
    } else if (errorCode.includes("requires-recent-login")) {
      errorMessage = "Session expired. Please sign in again.";
    } else if (errorCode.includes("permission-denied")) {
      errorMessage = "You don't have permission to perform this action.";
    }
    // ... etc
  }

  setError(errorMessage);
}
```

---

## Part 4: React Patterns That Worked

### 4.1 Context Provider Pattern

```typescript
// AuthContext.tsx
interface AuthContextType {
  currentUser: AuthUser | null;
  loading: boolean;
  accessDenied: AccessDenialReason;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: Permission) => boolean;
  // ... etc
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
```

### 4.2 Loading States

```typescript
// Always show loading state while auth initializes
if (loading) {
  return <LoadingSpinner />;
}

// Then check auth state
if (!currentUser) {
  return <Navigate to="/login" />;
}

// Then render protected content
return <Dashboard />;
```

### 4.3 Form Validation Pattern

```typescript
const [error, setError] = useState<string | null>(null);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);  // Clear previous errors

  // Client-side validation first
  if (password.length < 8) {
    setError("Password must be at least 8 characters.");
    return;
  }

  if (password !== confirmPassword) {
    setError("Passwords do not match.");
    return;
  }

  // Then attempt the operation
  try {
    await performOperation();
  } catch (err) {
    setError(mapErrorToMessage(err));
  }
};
```

---

## Part 5: Deployment Workflow

### 5.1 Build and Deploy Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting

# Deploy specific services
firebase deploy --only firestore:rules
firebase deploy --only functions
```

### 5.2 Pre-Deployment Checklist

1. **Run build locally first**
   ```bash
   npm run build
   ```
   Fix any TypeScript/build errors before deploying.

2. **Check for console errors**
   Run the production build locally:
   ```bash
   npm run preview
   ```

3. **Verify environment variables**
   Ensure all `VITE_*` variables are set correctly.

4. **Test critical flows**
   - Login/logout
   - User invitation
   - Data operations

### 5.3 Git Workflow

```bash
# Stage changes
git add -A

# Check what's staged
git status

# Commit with descriptive message
git commit -m "Fix: Description of what was fixed

- Detail 1
- Detail 2"

# Push to remote
git push

# Deploy
firebase deploy --only hosting
```

---

## Part 6: Debugging Strategies

### 6.1 Firebase Auth Issues

**Check Auth State:**
```typescript
import { getAuth } from "firebase/auth";
const auth = getAuth();
console.log("Current user:", auth.currentUser);
console.log("User email:", auth.currentUser?.email);
console.log("User UID:", auth.currentUser?.uid);
```

**Check if Magic Link is Valid:**
```typescript
import { isSignInWithEmailLink } from "firebase/auth";
console.log("Is sign-in link:", isSignInWithEmailLink(auth, window.location.href));
```

### 6.2 Firestore Issues

**Check Document Exists:**
```typescript
const docSnap = await getDoc(doc(db, "users", uid));
console.log("Document exists:", docSnap.exists());
console.log("Document data:", docSnap.data());
```

**Query Debugging:**
```typescript
const q = query(collection(db, "users"), where("email", "==", email));
const snapshot = await getDocs(q);
console.log("Query results:", snapshot.size);
snapshot.forEach(doc => console.log(doc.id, doc.data()));
```

### 6.3 Admin SDK Scripts

Create utility scripts for debugging/fixing data:

```javascript
// scripts/check-user.cjs
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

async function checkUser(email) {
  // Check Auth
  try {
    const user = await admin.auth().getUserByEmail(email);
    console.log("Auth user:", user.uid, user.email);
  } catch (e) {
    console.log("No auth user found");
  }

  // Check Firestore
  const db = admin.firestore();
  const snap = await db.collection('users').where('email', '==', email).get();
  snap.forEach(doc => console.log("Firestore:", doc.id, doc.data()));
}

checkUser(process.argv[2]);
```

---

## Part 7: Common Pitfalls to Avoid

### 7.1 Authentication Pitfalls

| Pitfall | Solution |
|---------|----------|
| Separating magic link sign-in from password setup | Combine into single form, set password immediately |
| Not waiting for auth state to initialize | Always check `loading` before rendering |
| Manual auth state management | Use `onAuthStateChanged` as single source of truth |
| Not handling all Firebase error codes | Create comprehensive error mapping |

### 7.2 Firestore Pitfalls

| Pitfall | Solution |
|---------|----------|
| Reading immediately after writing | Implement retry logic with delays |
| Not using transactions for related writes | Use `batch` or `transaction` for atomic operations |
| Storing arrays that grow unbounded | Use subcollections for large/growing data |
| Not indexing query fields | Create composite indexes as needed |

### 7.3 React Pitfalls

| Pitfall | Solution |
|---------|----------|
| useEffect with missing dependencies | Use ESLint rules, add all dependencies |
| State updates after unmount | Use `isMounted` flag or cleanup functions |
| Re-renders causing infinite loops | Memoize callbacks with useCallback |
| Context causing unnecessary re-renders | Split contexts by update frequency |

---

## Part 8: Testing Checklist

### 8.1 Authentication Flow Testing

- [ ] New user can receive invite email
- [ ] Magic link opens signup form
- [ ] Password validation works (min length, match)
- [ ] Signup completes and redirects to dashboard
- [ ] Existing user can login with email/password
- [ ] Password reset flow works
- [ ] Logout clears all state
- [ ] Deactivated user cannot login
- [ ] Invalid magic link shows appropriate error

### 8.2 Permission Testing

- [ ] Admin can access all features
- [ ] Manager can access assigned developments
- [ ] Editor can edit but not delete
- [ ] Viewer is read-only
- [ ] Unauthorized access shows appropriate message

### 8.3 Data Operations Testing

- [ ] Create operations work and appear immediately
- [ ] Update operations persist correctly
- [ ] Delete operations cascade appropriately
- [ ] Excel export produces valid file
- [ ] Excel import validates and applies changes
- [ ] Audit log captures all changes

---

## Part 9: Future Improvements

### 9.1 Recommended Enhancements

1. **Add Email Verification**
   - Require email verification before full access
   - Send verification email after signup

2. **Implement Refresh Tokens**
   - Handle token expiration gracefully
   - Auto-refresh without user interaction

3. **Add Offline Support**
   - Enable Firestore persistence
   - Queue operations when offline
   - Sync when connection restored

4. **Improve Error Monitoring**
   - Integrate error tracking (Sentry, etc.)
   - Log errors with context
   - Alert on critical failures

5. **Add Rate Limiting**
   - Limit login attempts
   - Limit API calls per user
   - Implement backoff strategies

### 9.2 Performance Optimizations

1. **Lazy Load Routes**
   ```typescript
   const Dashboard = lazy(() => import('./pages/Dashboard'));
   ```

2. **Paginate Large Lists**
   ```typescript
   const q = query(collection(db, 'units'),
     orderBy('createdAt'),
     limit(50),
     startAfter(lastVisible)
   );
   ```

3. **Cache Frequently Accessed Data**
   ```typescript
   // Use React Query or SWR for caching
   const { data, isLoading } = useQuery('developments', fetchDevelopments);
   ```

---

## Quick Reference Card

### Firebase Auth Operations
```typescript
// Sign in with email/password
await signInWithEmailAndPassword(auth, email, password);

// Sign in with magic link
await signInWithEmailLink(auth, email, window.location.href);

// Set password (must be immediately after sign-in)
await updatePassword(auth.currentUser, newPassword);

// Send password reset
await sendPasswordResetEmail(auth, email);

// Sign out
await signOut(auth);
```

### Firestore Operations
```typescript
// Create document
await setDoc(doc(db, 'collection', 'id'), data);

// Update document
await updateDoc(doc(db, 'collection', 'id'), { field: value });

// Delete document
await deleteDoc(doc(db, 'collection', 'id'));

// Query documents
const q = query(collection(db, 'users'), where('role', '==', 'admin'));
const snapshot = await getDocs(q);
```

### Essential Imports
```typescript
// Firebase Auth
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

// Firestore
import { getFirestore, doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
```

---

## Conclusion

This skill document captures the key learnings from building the Development Tracker application. The most critical lessons are:

1. **Firebase password operations require recent authentication** - never separate sign-in from password setup
2. **Firestore has sync delays** - always implement retry logic when reading after writes
3. **Use onAuthStateChanged as single source of truth** - don't manually manage auth state
4. **Separate concerns** - services for business logic, contexts for state, components for UI
5. **Plan for errors** - comprehensive error handling improves user experience

Apply these lessons to future Firebase + React projects to avoid the same pitfalls and build more robust applications.

---

*Generated from Development Tracker project - January 2026*
