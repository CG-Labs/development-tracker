# Service Migration Patterns: Firestore → Cosmos DB

This document provides copy-paste patterns for migrating each Firestore operation to Cosmos DB.

## Import Changes

### Before (Firestore)
```typescript
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../config/firebase";
```

### After (Cosmos DB)
```typescript
import { containers } from "../config/cosmos";
import {
  queryAll,
  queryWithPagination,
  getItemById,
  createItem,
  replaceItem,
  upsertItem,
  deleteItem,
  generateId,
} from "./azure/cosmosHelpers";
```

## Pattern 1: Get Single Document by ID

### Firestore
```typescript
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  return {
    uid: docSnap.id,
    email: data.email,
    displayName: data.displayName,
    role: data.role,
    isActive: data.isActive !== false,
    createdAt: data.createdAt?.toDate() || new Date(),
  };
}
```

### Cosmos DB
```typescript
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const user = await getItemById<any>(containers.users, uid, uid);

  if (!user) {
    return null;
  }

  return {
    uid: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    isActive: user.isActive !== false,
    createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
  };
}
```

## Pattern 2: Query with Filter

### Firestore
```typescript
export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  const q = query(
    collection(db, "users"),
    where("email", "==", email.toLowerCase())
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    uid: doc.id,
    ...data,
  };
}
```

### Cosmos DB
```typescript
export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  const users = await queryAll<any>(
    containers.users,
    'SELECT * FROM c WHERE c.email = @email',
    [{ name: '@email', value: email.toLowerCase() }]
  );

  if (users.length === 0) {
    return null;
  }

  const user = users[0];
  return {
    uid: user.id,
    ...user,
  };
}
```

## Pattern 3: Query All Documents with Ordering

### Firestore
```typescript
export async function getAllUsers(): Promise<UserProfile[]> {
  const q = query(
    collection(db, "users"),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      uid: doc.id,
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      createdAt: data.createdAt?.toDate(),
    };
  });
}
```

### Cosmos DB
```typescript
export async function getAllUsers(): Promise<UserProfile[]> {
  const users = await queryAll<any>(
    containers.users,
    'SELECT * FROM c ORDER BY c.createdAt DESC'
  );

  return users.map((user) => ({
    uid: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt ? new Date(user.createdAt) : undefined,
  }));
}
```

## Pattern 4: Create Document

### Firestore
```typescript
export async function createUserProfile(uid: string, data: any): Promise<void> {
  const docRef = doc(db, "users", uid);
  await setDoc(docRef, {
    ...data,
    createdAt: serverTimestamp(),
  });
}
```

### Cosmos DB
```typescript
export async function createUserProfile(uid: string, data: any): Promise<void> {
  await createItem(containers.users, {
    id: uid,
    uid: uid, // Partition key value
    ...data,
    createdAt: new Date().toISOString(),
  });
}
```

## Pattern 5: Create Document with Auto-Generated ID

### Firestore
```typescript
export async function createNotification(data: any): Promise<string> {
  const docRef = await addDoc(collection(db, "notifications"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}
```

### Cosmos DB
```typescript
export async function createNotification(data: any): Promise<string> {
  const id = generateId();
  await createItem(containers.notifications, {
    id,
    ...data,
    createdAt: new Date().toISOString(),
  });
  return id;
}
```

## Pattern 6: Update Document

### Firestore
```typescript
export async function updateLastLogin(uid: string): Promise<void> {
  const docRef = doc(db, "users", uid);
  await updateDoc(docRef, {
    lastLogin: serverTimestamp(),
  });
}
```

### Cosmos DB
```typescript
export async function updateLastLogin(uid: string): Promise<void> {
  const user = await getItemById<any>(containers.users, uid, uid);
  if (!user) return;

  await replaceItem(containers.users, uid, uid, {
    ...user,
    lastLogin: new Date().toISOString(),
  });
}
```

## Pattern 7: Delete Document

### Firestore
```typescript
export async function deleteUser(uid: string): Promise<void> {
  const docRef = doc(db, "users", uid);
  await deleteDoc(docRef);
}
```

### Cosmos DB
```typescript
export async function deleteUser(uid: string): Promise<void> {
  await deleteItem(containers.users, uid, uid);
}
```

## Pattern 8: Pagination (Cursor-Based)

### Firestore
```typescript
export async function getAuditLogs(
  pageSize: number = 50,
  lastDocument?: any
): Promise<{ logs: AuditLog[]; lastDoc: any; hasMore: boolean }> {
  const constraints = [
    orderBy("timestamp", "desc"),
    limit(pageSize + 1),
  ];

  if (lastDocument) {
    constraints.push(startAfter(lastDocument));
  }

  const q = query(collection(db, "auditLogs"), ...constraints);
  const snapshot = await getDocs(q);

  const docs = snapshot.docs;
  const hasMore = docs.length > pageSize;
  const logs = docs.slice(0, pageSize).map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  return {
    logs,
    lastDoc: docs[pageSize - 1],
    hasMore,
  };
}
```

### Cosmos DB
```typescript
export async function getAuditLogs(
  pageSize: number = 50,
  continuationToken?: string
): Promise<{ logs: AuditLog[]; continuationToken?: string; hasMore: boolean }> {
  const result = await queryWithPagination<any>(
    containers.auditLogs,
    'SELECT * FROM c ORDER BY c.timestamp DESC',
    [],
    pageSize,
    continuationToken
  );

  return {
    logs: result.items.map(item => ({
      id: item.id,
      ...item,
    })),
    continuationToken: result.continuationToken,
    hasMore: result.hasMore,
  };
}
```

## Pattern 9: Real-Time Listener (onSnapshot)

### Firestore
```typescript
export function subscribeToNotes(
  unitId: string,
  callback: (notes: Note[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(
    collection(db, "notes"),
    where("unitId", "==", unitId)
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const notes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      notes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      callback(notes);
    },
    (error) => {
      console.error("Error in notes subscription:", error);
      onError?.(error);
    }
  );

  return unsubscribe;
}
```

### Cosmos DB (Change Feed)
```typescript
export function subscribeToNotes(
  unitId: string,
  callback: (notes: Note[]) => void,
  onError?: (error: Error) => void
): () => void {
  let active = true;
  let continuationToken: string | undefined;

  async function poll() {
    while (active) {
      try {
        // Initial load
        if (!continuationToken) {
          const notes = await queryAll<any>(
            containers.notes,
            'SELECT * FROM c WHERE c.unitId = @unitId ORDER BY c.timestamp DESC',
            [{ name: '@unitId', value: unitId }]
          );
          callback(notes);
        }

        // Poll for changes using change feed
        const iterator = containers.notes.items.readChangeFeed({
          partitionKey: unitId,
          continuationToken,
        });

        if (iterator.hasMoreResults) {
          const response = await iterator.readNext();
          if (response.result && response.result.length > 0) {
            // Fetch all notes again when changes detected
            const notes = await queryAll<any>(
              containers.notes,
              'SELECT * FROM c WHERE c.unitId = @unitId ORDER BY c.timestamp DESC',
              [{ name: '@unitId', value: unitId }]
            );
            callback(notes);
          }
          continuationToken = response.continuationToken;
        }
      } catch (error) {
        console.error("Error in notes subscription:", error);
        onError?.(error as Error);
      }

      // Poll every 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  poll();

  return () => {
    active = false;
  };
}
```

## Pattern 10: Complex Query with Multiple Filters

### Firestore
```typescript
export async function getFilteredAuditLogs(
  filters: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    developmentId?: string;
  }
): Promise<AuditLog[]> {
  const constraints = [];

  if (filters.startDate) {
    constraints.push(where("timestamp", ">=", Timestamp.fromDate(filters.startDate)));
  }
  if (filters.endDate) {
    constraints.push(where("timestamp", "<=", Timestamp.fromDate(filters.endDate)));
  }
  if (filters.userId) {
    constraints.push(where("userId", "==", filters.userId));
  }

  constraints.push(orderBy("timestamp", "desc"));

  const q = query(collection(db, "auditLogs"), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}
```

### Cosmos DB
```typescript
export async function getFilteredAuditLogs(
  filters: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    developmentId?: string;
  }
): Promise<AuditLog[]> {
  const conditions: string[] = [];
  const parameters: Array<{ name: string; value: any }> = [];

  if (filters.startDate) {
    conditions.push('c.timestamp >= @startDate');
    parameters.push({ name: '@startDate', value: filters.startDate.toISOString() });
  }
  if (filters.endDate) {
    conditions.push('c.timestamp <= @endDate');
    parameters.push({ name: '@endDate', value: filters.endDate.toISOString() });
  }
  if (filters.userId) {
    conditions.push('c.userId = @userId');
    parameters.push({ name: '@userId', value: filters.userId });
  }
  if (filters.developmentId) {
    conditions.push('c.developmentId = @developmentId');
    parameters.push({ name: '@developmentId', value: filters.developmentId });
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sqlQuery = `SELECT * FROM c ${whereClause} ORDER BY c.timestamp DESC`;

  const logs = await queryAll<any>(containers.auditLogs, sqlQuery, parameters);

  return logs.map(log => ({
    id: log.id,
    ...log,
  }));
}
```

## Timestamp Handling

### Firestore → Cosmos DB
- **serverTimestamp()** → `new Date().toISOString()`
- **Timestamp.fromDate(date)** → `date.toISOString()`
- **data.timestamp?.toDate()** → `new Date(data.timestamp)`

### Storage
- Firestore stores as Timestamp objects
- Cosmos DB stores as ISO 8601 strings
- Convert to Date objects when needed in application

## Partition Key Guidelines

| Container | Partition Key | Rationale |
|-----------|---------------|-----------|
| users | `/uid` | Point reads by user ID |
| invites | `/email` | Queries scoped to email |
| notifications | `/userId` | All queries by user |
| auditLogs | `/userId` | Most queries filter by user |
| notes | `/unitId` | Real-time updates per unit |
| developmentCompanies | `/id` | Small dataset, simple key |
| incentiveSchemes | `/id` | Small dataset, simple key |
| settings | `/id` | Single document |

**Important:** Always include partition key value when reading/updating/deleting items.

## Migration Checklist by File

### userService.ts (Priority: CRITICAL)
- [ ] Replace Firestore imports with Cosmos DB
- [ ] Update getUserProfile (line 63-91)
- [ ] Update getUserProfileByEmail (line 93-125)
- [ ] Update getAllUsers (line 127-177)
- [ ] Update createUserFromInvite (line 206-260)
- [ ] Update createAdminUserProfile (line 262-303)
- [ ] Update updateUserProfile (line 305-356)
- [ ] Update updateLastLogin (line 93-103)
- [ ] Update createUserInvite (line 509-588) - ALSO update to use Graph API email
- [ ] Update getInviteById (line 590-633)
- [ ] Update getPendingInviteByEmail (line 635-667)
- [ ] Update getAllInvites (line 669-717)
- [ ] Update markInviteAsAccepted (line 719-744)
- [ ] Update createNotification (line 800-842)
- [ ] Update getUserNotifications (line 844-896)
- [ ] Update getUnreadNotificationCount (line 898-930)
- [ ] Update markNotificationAsRead (line 932-957)

**Special Note:** Lines 556-560 use `sendSignInLinkToEmail` - replace with `sendInvitationEmail` from graphEmailService

### notesService.ts (Priority: HIGH)
- [ ] Replace Firestore imports
- [ ] Update addNote (line 32-75)
- [ ] Update getNotes (line 77-107)
- [ ] Update subscribeToNotes (line 109-151) - **Use change feed pattern**
- [ ] Update updateNote (line 153-178)
- [ ] Update deleteNote (line 180-195)
- [ ] Update getNotesCount (line 197-215)

### auditLogService.ts (Priority: HIGH)
- [ ] Replace Firestore imports
- [ ] Update logChange (line 29-80)
- [ ] Update getAuditLogs (line 82-217) - **Use queryWithPagination**
- [ ] Update getAllUsers (line 219-241)

### companyService.ts (Priority: MEDIUM)
- [ ] Replace Firestore imports
- [ ] Update getCompanies (line 15-44)
- [ ] Update getActiveCompanies (line 46-75)
- [ ] Update getCompany (line 77-92)
- [ ] Update createCompany (line 94-128)
- [ ] Update updateCompany (line 130-151)
- [ ] Update deleteCompany (line 153-167)
- [ ] Update toggleCompanyActive (line 169-191)

### incentiveService.ts (Priority: MEDIUM)
- [ ] Replace Firestore imports
- [ ] Update createIncentiveScheme (line 34-62)
- [ ] Update getIncentiveSchemes (line 64-93)
- [ ] Update getActiveSchemes (line 95-124)
- [ ] Update getIncentiveScheme (line 126-145)
- [ ] Update updateIncentiveScheme (line 147-170)
- [ ] Update deleteIncentiveScheme (line 172-184)

## Testing Updates

### Mock Setup (src/test/setup.ts)

Add Azure mocks:

```typescript
// Mock MSAL
vi.mock('@azure/msal-react', () => ({
  useMsal: vi.fn(() => ({
    instance: {
      loginRedirect: vi.fn(),
      logoutRedirect: vi.fn(),
      acquireTokenSilent: vi.fn(),
    },
    accounts: [],
    inProgress: 'none',
  })),
  useIsAuthenticated: vi.fn(() => false),
  MsalProvider: ({ children }: any) => children,
}));

// Mock Cosmos DB
vi.mock('../config/cosmos', () => ({
  containers: {
    users: {
      item: vi.fn(() => ({
        read: vi.fn(),
        replace: vi.fn(),
        delete: vi.fn(),
      })),
      items: {
        query: vi.fn(() => ({
          fetchAll: vi.fn(() => ({ resources: [] })),
        })),
        create: vi.fn(),
      },
    },
    // Repeat for other containers
  },
}));
```

## Quick Reference

| Firestore Function | Cosmos DB Equivalent |
|-------------------|----------------------|
| `getDoc(docRef)` | `getItemById(container, id, partitionKey)` |
| `setDoc(docRef, data)` | `createItem(container, { id, ...data })` |
| `addDoc(collection, data)` | `createItem(container, { id: generateId(), ...data })` |
| `updateDoc(docRef, updates)` | Read → Merge → `replaceItem(...)` |
| `deleteDoc(docRef)` | `deleteItem(container, id, partitionKey)` |
| `getDocs(query(...))` | `queryAll(container, sqlQuery, params)` |
| `onSnapshot(query, callback)` | Change feed with polling |
| `startAfter(lastDoc)` | `queryWithPagination(..., continuationToken)` |
| `serverTimestamp()` | `new Date().toISOString()` |
| `Timestamp.fromDate(date)` | `date.toISOString()` |
| `timestamp.toDate()` | `new Date(timestamp)` |

## Common Pitfalls

1. **Forgetting partition key** - All item operations require partition key
2. **Not adding `id` field** - Cosmos DB requires `id` field on all documents
3. **Timestamp formats** - Use ISO strings, convert to Date when needed
4. **Cross-partition queries** - Expensive, avoid if possible
5. **Pagination tokens** - Opaque strings, don't try to parse
6. **Change feed delay** - 2-second polling may miss very rapid changes
7. **Query syntax** - SQL-like, not Firestore method chains
