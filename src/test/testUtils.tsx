import { render, type RenderOptions } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { vi } from "vitest";
import type { ReactElement, ReactNode } from "react";
import type { UserRole } from "../types/roles";

// Mock auth context value
export interface MockAuthContextValue {
  currentUser: {
    uid: string;
    email: string;
    displayName: string;
    role: UserRole;
    isActive: boolean;
    allowedDevelopments?: string[];
  } | null;
  loading: boolean;
  accessDenied: "no_invite" | "deactivated" | "no_profile" | null;
  pendingInvite: null;
  notifications: [];
  unreadCount: number;
  login: ReturnType<typeof vi.fn>;
  signupWithInvite: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  resetPassword: ReturnType<typeof vi.fn>;
  can: (permission: string) => boolean;
  refreshUserProfile: ReturnType<typeof vi.fn>;
  refreshNotifications: ReturnType<typeof vi.fn>;
  markNotificationRead: ReturnType<typeof vi.fn>;
  markAllNotificationsRead: ReturnType<typeof vi.fn>;
  validateInviteToken: ReturnType<typeof vi.fn>;
  clearAccessDenied: ReturnType<typeof vi.fn>;
}

export function createMockAuthContext(
  overrides: Partial<MockAuthContextValue> = {}
): MockAuthContextValue {
  return {
    currentUser: {
      uid: "test-uid",
      email: "test@example.com",
      displayName: "Test User",
      role: "editor",
      isActive: true,
    },
    loading: false,
    accessDenied: null,
    pendingInvite: null,
    notifications: [],
    unreadCount: 0,
    login: vi.fn(),
    signupWithInvite: vi.fn(),
    logout: vi.fn(),
    resetPassword: vi.fn(),
    can: vi.fn(() => true),
    refreshUserProfile: vi.fn(),
    refreshNotifications: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
    validateInviteToken: vi.fn(),
    clearAccessDenied: vi.fn(),
    ...overrides,
  };
}

// Wrapper component that provides router context
// eslint-disable-next-line react-refresh/only-export-components
function AllTheProviders({ children }: { children: ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

// Custom render function with router
export function renderWithRouter(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

// Mock development data for testing
export const mockDevelopment = {
  id: "dev-1",
  name: "Test Development",
  projectNumber: "TD001",
  status: "Active" as const,
  totalUnits: 10,
  units: [
    {
      id: "unit-1",
      unitNumber: "001",
      type: "2 Bed Apartment",
      block: "A",
      floor: 1,
      bedrooms: 2,
      bathrooms: 1,
      squareMeters: 75,
      listPrice: 350000,
      salesStatus: "Complete" as const,
      constructionStatus: "Complete" as const,
    },
    {
      id: "unit-2",
      unitNumber: "002",
      type: "2 Bed Apartment",
      block: "A",
      floor: 1,
      bedrooms: 2,
      bathrooms: 1,
      squareMeters: 75,
      listPrice: 350000,
      salesStatus: "For Sale" as const,
      constructionStatus: "In Progress" as const,
    },
    {
      id: "unit-3",
      unitNumber: "003",
      type: "3 Bed House",
      block: "B",
      floor: 0,
      bedrooms: 3,
      bathrooms: 2,
      squareMeters: 120,
      listPrice: 450000,
      salesStatus: "Under Offer" as const,
      constructionStatus: "In Progress" as const,
    },
    {
      id: "unit-4",
      unitNumber: "004",
      type: "3 Bed House",
      block: "B",
      floor: 0,
      bedrooms: 3,
      bathrooms: 2,
      squareMeters: 120,
      listPrice: 450000,
      salesStatus: "Contracted" as const,
      constructionStatus: "Not Started" as const,
    },
    {
      id: "unit-5",
      unitNumber: "005",
      type: "1 Bed Apartment",
      block: "A",
      floor: 2,
      bedrooms: 1,
      bathrooms: 1,
      squareMeters: 50,
      listPrice: 250000,
      salesStatus: "Not Released" as const,
      constructionStatus: "Not Started" as const,
    },
  ],
};

export { vi };
