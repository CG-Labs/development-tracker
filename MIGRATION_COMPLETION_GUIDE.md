# Migration Completion Guide

## Current Status: 70% Complete

This document describes the remaining work to complete the Azure migration.

## What's Been Completed

### ✅ Infrastructure (100%)
- Bicep templates for all Azure resources
- Naming convention: `ce-devtracker-labs-*`
- Modules: App Service, Cosmos DB, Storage, Key Vault
- GitHub Actions workflow for CI/CD
- Deployment documentation

### ✅ Authentication (100%)
- MSAL.js configuration
- AzureAuthContext (replaces Firebase AuthContext)
- Login component updated for Azure AD
- App.tsx wrapped with MsalProvider
- Graph API email service
- Entra guest user service

### ✅ Azure Services (100%)
- Cosmos DB client and query helpers
- Blob Storage service
- Migration scripts (Firebase → Cosmos)
- Service wrapper utilities

### ⏳ Data Layer (20%)
- Cosmos DB helpers created
- Migration script created
- Service files still using Firebase (need migration)

### ⏳ Components (30%)
- Login updated
- App.tsx updated
- LogoUploadModal needs Blob Storage update
- CompleteSignup needs Azure AD update

## Remaining Work

### 1. Complete Service File Migrations (HIGH PRIORITY)

Each service file needs to be updated from Firestore to Cosmos DB. Here's the pattern:

#### Example: userService.ts Migration Pattern

**BEFORE (Firestore):**
```typescript
import { doc, getDoc, setDoc, query, where, collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";

export async function getUserProfile(uid: string) {
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() };
}
```

**AFTER (Cosmos DB):**
```typescript
import { containers } from "../config/cosmos";
import { getItemById } from "./azure/cosmosHelpers";

export async function getUserProfile(uid: string) {
  const user = await getItemById(containers.users, uid, uid);
  return user;
}
```

#### Files Needing Migration

1. **src/services/userService.ts** (509 lines)
   - Replace all Firestore calls with Cosmos DB
   - Update `sendSignInLinkToEmail` → `sendInvitationEmail` (Graph API)
   - Partition key: `uid` for users, `email` for invites

2. **src/services/notesService.ts** (150+ lines)
   - Replace `onSnapshot` → Cosmos DB change feed
   - Partition key: `unitId`
   - Implement 2-second polling for real-time updates

3. **src/services/auditLogService.ts** (200+ lines)
   - Replace `startAfter` pagination → continuation tokens
   - Partition key: `userId`
   - Use `queryWithPagination` helper

4. **src/services/companyService.ts**
   - Replace all Firestore imports
   - Partition key: `id`

5. **src/services/incentiveService.ts**
   - Replace all Firestore imports
   - Partition key: `id`

### 2. Update LogoUploadModal (MEDIUM PRIORITY)

**File:** `src/components/LogoUploadModal.tsx`

**Changes needed:**
```typescript
// BEFORE
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// AFTER
import { uploadBlob } from "../services/azure/blobStorageService";
import { containers } from "../config/cosmos";

// In handleUpload function:
// BEFORE
const storage = getStorage(app);
const storageRef = ref(storage, `company-logo/logo-${Date.now()}`);
await uploadBytes(storageRef, selectedFile);
const downloadURL = await getDownloadURL(storageRef);

// AFTER
const blobName = `logo-${Date.now()}.${selectedFile.name.split('.').pop()}`;
const downloadURL = await uploadBlob(selectedFile, blobName);

// Save to Cosmos DB instead of Firestore
await containers.settings.items.upsert({
  id: "company",
  logoUrl: downloadURL,
  updatedAt: new Date().toISOString()
});
```

### 3. Update CompleteSignup Component (MEDIUM PRIORITY)

**File:** `src/components/CompleteSignup.tsx`

This component handles the invite acceptance flow. Currently uses Firebase Auth magic links. Needs update to:
1. Use Azure AD authentication
2. Create Entra guest user via Graph API
3. Store profile in Cosmos DB

**Key changes:**
- Remove Firebase Auth imports
- Use `createGuestUser` from entraUserService
- Use MSAL for authentication state
- Update profile creation to use Cosmos DB

### 4. Fix Test Imports (LOW PRIORITY)

Several test files have import errors. This is likely due to Testing Library version changes.

**Files to fix:**
- src/components/*.test.tsx
- src/contexts/AuthContext.test.tsx

**Possible fixes:**
```typescript
// If screen is missing
import { screen } from '@testing-library/dom';

// Or update @testing-library/react version
npm install @testing-library/react@latest --legacy-peer-deps
```

### 5. Update Test Mocks (MEDIUM PRIORITY)

**File:** `src/test/setup.ts`

Currently mocks Firebase. Need to add Azure mocks:

```typescript
// Mock MSAL
vi.mock('@azure/msal-react', () => ({
  useMsal: vi.fn(() => ({
    instance: {},
    accounts: [],
    inProgress: 'none'
  })),
  useIsAuthenticated: vi.fn(() => false),
  MsalProvider: ({ children }: any) => children,
}));

// Mock Cosmos DB
vi.mock('../config/cosmos', () => ({
  containers: {
    users: { items: { query: vi.fn(), create: vi.fn() } },
    // ... other containers
  },
}));

// Mock Graph API
vi.mock('../services/azure/graphEmailService', () => ({
  sendInvitationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));
```

## Build Validation

Current build status: **FAILING** due to:
1. Testing Library import errors (test files)
2. Service files still using Firebase (need migration)

Expected after completion: **PASSING**

```bash
# To validate:
npm run build
npm run test:run
npm run lint
```

## Deployment Checklist (Post-Code Completion)

Once code is complete:

1. Deploy infrastructure:
   ```bash
   cd infrastructure
   az deployment sub create --template-file main.bicep --parameters @parameters/labs.bicepparam
   ```

2. Create App Registration and configure permissions

3. Update `.env` with Azure resource details

4. Run migration script:
   ```bash
   node scripts/migration/migrate-firestore-to-cosmos.mjs
   ```

5. Configure GitHub secrets

6. Push to GitHub (triggers deployment)

7. Test all features at https://ce-devtracker-labs-app.azurewebsites.net

8. Monitor for 1-2 weeks before planning PROD deployment

## Time Estimates

**Remaining Development Work:**
- Service file migrations: 6-8 hours
- Component updates: 2-3 hours
- Test fixes: 1-2 hours
- Build validation: 30 minutes
- **Total: 10-14 hours**

**Deployment & Testing:**
- Infrastructure deployment: 30 minutes
- App Registration setup: 30 minutes
- Data migration: 1-2 hours
- Application deployment: 30 minutes
- E2E testing: 2-3 hours
- **Total: 5-7 hours**

**Grand Total: 15-21 hours to complete migration**

## Support Resources

- **Migration Plan:** `C:\Users\jamie.mckenzie\.claude\plans\happy-inventing-kahan.md`
- **Deployment Guide:** `AZURE_DEPLOYMENT_GUIDE.md`
- **Migration README:** `AZURE_MIGRATION_README.md`
- **Status:** `MIGRATION_STATUS.md`
- **Azure Naming Skill:** `C:\Users\jamie.mckenzie\.claude\skills\azure-naming-convention.md`

## Questions or Issues?

Review the comprehensive plan files and deployment guides. All architecture decisions, patterns, and step-by-step instructions are documented.
