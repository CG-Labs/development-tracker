import "@testing-library/jest-dom";
import { vi } from "vitest";

// Set test admin emails for userService tests
import.meta.env.VITE_ADMIN_EMAILS = "testadmin@example.com,testadmin2@example.com";
import.meta.env.ADMIN_EMAILS = "testadmin@example.com,testadmin2@example.com";

// Mock Firebase Auth (for backward compatibility during migration)
vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({})),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updateProfile: vi.fn(),
  onAuthStateChanged: vi.fn(() => {
    // Return unsubscribe function
    return vi.fn();
  }),
}));

// Mock Firebase config (for backward compatibility)
vi.mock("../config/firebase", () => ({
  auth: {},
  db: {},
}));

// Mock Azure Cosmos DB
vi.mock("../config/cosmos", () => ({
  cosmosClient: {},
  database: {},
  containers: {
    users: {
      item: vi.fn(() => ({
        read: vi.fn().mockResolvedValue({ resource: null }),
        replace: vi.fn().mockResolvedValue({ resource: {} }),
        delete: vi.fn().mockResolvedValue({}),
      })),
      items: {
        query: vi.fn(() => ({
          fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
          fetchNext: vi.fn().mockResolvedValue({ resources: [], hasMoreResults: false }),
        })),
        create: vi.fn().mockResolvedValue({ resource: {} }),
        upsert: vi.fn().mockResolvedValue({ resource: {} }),
      },
    },
    invites: {
      item: vi.fn(() => ({
        read: vi.fn().mockResolvedValue({ resource: null }),
        replace: vi.fn().mockResolvedValue({ resource: {} }),
        delete: vi.fn().mockResolvedValue({}),
      })),
      items: {
        query: vi.fn(() => ({
          fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
        })),
        create: vi.fn().mockResolvedValue({ resource: {} }),
      },
    },
    notifications: {
      item: vi.fn(() => ({
        read: vi.fn().mockResolvedValue({ resource: null }),
        replace: vi.fn().mockResolvedValue({ resource: {} }),
      })),
      items: {
        query: vi.fn(() => ({
          fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
        })),
        create: vi.fn().mockResolvedValue({ resource: {} }),
      },
    },
    auditLogs: {
      items: {
        query: vi.fn(() => ({
          fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
          fetchNext: vi.fn().mockResolvedValue({ resources: [], hasMoreResults: false }),
        })),
        create: vi.fn().mockResolvedValue({ resource: {} }),
      },
    },
    notes: {
      item: vi.fn(() => ({
        read: vi.fn().mockResolvedValue({ resource: null }),
        replace: vi.fn().mockResolvedValue({ resource: {} }),
        delete: vi.fn().mockResolvedValue({}),
      })),
      items: {
        query: vi.fn(() => ({
          fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
        })),
        create: vi.fn().mockResolvedValue({ resource: {} }),
      },
    },
    developmentCompanies: {
      item: vi.fn(() => ({
        read: vi.fn().mockResolvedValue({ resource: null }),
      })),
      items: {
        query: vi.fn(() => ({
          fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
        })),
        create: vi.fn().mockResolvedValue({ resource: {} }),
      },
    },
    incentiveSchemes: {
      item: vi.fn(() => ({
        read: vi.fn().mockResolvedValue({ resource: null }),
      })),
      items: {
        query: vi.fn(() => ({
          fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
        })),
        create: vi.fn().mockResolvedValue({ resource: {} }),
      },
    },
    settings: {
      item: vi.fn(() => ({
        read: vi.fn().mockResolvedValue({ resource: null }),
      })),
      items: {
        upsert: vi.fn().mockResolvedValue({ resource: {} }),
      },
    },
  },
  getContainer: vi.fn(),
  executeQuery: vi.fn().mockResolvedValue([]),
  getItem: vi.fn().mockResolvedValue(null),
  createItem: vi.fn().mockResolvedValue({}),
  updateItem: vi.fn().mockResolvedValue({}),
  deleteItem: vi.fn().mockResolvedValue(undefined),
}));

// Mock MSAL
vi.mock("@azure/msal-react", () => ({
  useMsal: vi.fn(() => ({
    instance: {
      loginRedirect: vi.fn().mockResolvedValue(undefined),
      logoutRedirect: vi.fn().mockResolvedValue(undefined),
      acquireTokenSilent: vi.fn().mockResolvedValue({ accessToken: "mock-token" }),
      handleRedirectPromise: vi.fn().mockResolvedValue(null),
      initialize: vi.fn().mockResolvedValue(undefined),
    },
    accounts: [],
    inProgress: "none",
  })),
  useIsAuthenticated: vi.fn(() => false),
  MsalProvider: ({ children }: any) => children,
}));

// Mock Azure services
vi.mock("../services/azure/graphEmailService", () => ({
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  getGraphClient: vi.fn(() => ({})),
}));

vi.mock("../services/azure/entraUserService", () => ({
  createGuestUser: vi.fn().mockResolvedValue("mock-user-id"),
  getUserByEmail: vi.fn().mockResolvedValue(null),
  isGuestUser: vi.fn(() => true),
  isMemberUser: vi.fn(() => false),
}));

vi.mock("../services/azure/blobStorageService", () => ({
  uploadBlob: vi.fn().mockResolvedValue("https://mock-blob-url.com/logo.png"),
  deleteBlob: vi.fn().mockResolvedValue(undefined),
  getBlobUrl: vi.fn(() => "https://mock-blob-url.com/logo.png"),
  blobExists: vi.fn().mockResolvedValue(false),
  listBlobs: vi.fn().mockResolvedValue([]),
}));
