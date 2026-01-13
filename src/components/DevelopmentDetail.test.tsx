import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { screen, fireEvent, waitFor } from "@testing-library/dom";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { DevelopmentDetail } from "./DevelopmentDetail";

// Helper to find the filtered unit count
function getFilteredCount(): number {
  // Find the "X of Y units" text by looking for "units" text node
  const unitsText = screen.getByText(/units$/);
  // Get the parent and find the first number (filtered count)
  const parent = unitsText.closest("p");
  if (parent) {
    const text = parent.textContent || "";
    const match = text.match(/(\d+)\s*of\s*(\d+)/);
    if (match) {
      return parseInt(match[1]);
    }
  }
  return -1;
}

// Mock the developments data
vi.mock("../data/realDevelopments", () => ({
  developments: [
    {
      id: "test-dev-1",
      name: "Test Development",
      projectNumber: "TD-001",
      totalUnits: 8,
      units: [
        {
          unitNumber: "1",
          type: "House-Semi",
          bedrooms: 3,
          size: 94,
          constructionStatus: "Complete",
          salesStatus: "Complete",
          listPrice: 350000,
          soldPrice: 345000,
          documentation: { bcmsApprovedDate: "2024-01-15" },
          keyDates: { plannedBcms: "2024-01-10" },
        },
        {
          unitNumber: "2",
          type: "House-Semi",
          bedrooms: 3,
          size: 94,
          constructionStatus: "Complete",
          salesStatus: "Contracted",
          listPrice: 355000,
          documentation: { bcmsApprovedDate: "2024-01-20" },
          keyDates: { plannedBcms: "2024-01-15" },
        },
        {
          unitNumber: "3",
          type: "Apartment",
          bedrooms: 2,
          size: 75,
          constructionStatus: "In Progress",
          salesStatus: "For Sale",
          listPrice: 275000,
          documentation: {},
          keyDates: { plannedBcms: "2024-02-01" },
        },
        {
          unitNumber: "4",
          type: "Apartment",
          bedrooms: 2,
          size: 75,
          constructionStatus: "In Progress",
          salesStatus: "Under Offer",
          listPrice: 280000,
          documentation: {},
          keyDates: {},
        },
        {
          unitNumber: "5",
          type: "House-Detached",
          bedrooms: 4,
          size: 150,
          constructionStatus: "Not Started",
          salesStatus: "Not Released",
          listPrice: 500000,
          documentation: {},
          keyDates: {},
        },
        {
          unitNumber: "6",
          type: "Apartment Studio",
          bedrooms: "Studio",
          size: 45,
          constructionStatus: "Complete",
          salesStatus: "Complete",
          listPrice: 195000,
          soldPrice: 195000,
          documentation: { bcmsApprovedDate: "2024-01-05" },
          keyDates: { plannedBcms: "2024-01-01" },
        },
        {
          unitNumber: "7",
          type: "Duplex Apartment",
          bedrooms: 3,
          size: 120,
          constructionStatus: "In Progress",
          salesStatus: "For Sale",
          listPrice: 425000,
          documentation: {},
          keyDates: { plannedBcms: "2024-03-01" },
        },
        {
          unitNumber: "8",
          type: "House-Terrace",
          bedrooms: 2,
          size: 85,
          constructionStatus: "Complete",
          salesStatus: "Contracted",
          listPrice: 320000,
          documentation: { bcmsApprovedDate: "2024-02-01" },
          keyDates: { plannedBcms: "2024-01-20" },
        },
      ],
    },
  ],
}));

// Mock the notes service
vi.mock("../services/notesService", () => ({
  getNotesCountsForDevelopment: vi.fn().mockResolvedValue(new Map()),
}));

// Mock the auth context
vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    can: () => false, // Disable bulk update for simpler testing
  }),
}));

function renderDevelopmentDetail() {
  return render(
    <MemoryRouter initialEntries={["/development/test-dev-1"]}>
      <Routes>
        <Route path="/development/:id" element={<DevelopmentDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("DevelopmentDetail Filters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render all 8 units initially", async () => {
    renderDevelopmentDetail();

    await waitFor(() => {
      expect(getFilteredCount()).toBe(8);
    });
  });

  it("should show 4 filter dropdowns", async () => {
    renderDevelopmentDetail();

    await waitFor(() => {
      const selects = screen.getAllByRole("combobox");
      expect(selects).toHaveLength(4);
    });
  });

  describe("Unit Type Filter", () => {
    it("should filter by House-Semi type", async () => {
      renderDevelopmentDetail();

      await waitFor(() => {
        expect(getFilteredCount()).toBe(8);
      });

      const typeSelect = screen.getAllByRole("combobox")[0];
      fireEvent.change(typeSelect, { target: { value: "House-Semi" } });

      await waitFor(() => {
        expect(getFilteredCount()).toBe(2);
      });
    });

    it("should filter by Apartment type", async () => {
      renderDevelopmentDetail();

      await waitFor(() => {
        expect(getFilteredCount()).toBe(8);
      });

      const typeSelect = screen.getAllByRole("combobox")[0];
      fireEvent.change(typeSelect, { target: { value: "Apartment" } });

      await waitFor(() => {
        expect(getFilteredCount()).toBe(2);
      });
    });
  });

  describe("Beds Filter", () => {
    it("should filter by 3 Bed", async () => {
      renderDevelopmentDetail();

      await waitFor(() => {
        expect(getFilteredCount()).toBe(8);
      });

      const bedsSelect = screen.getAllByRole("combobox")[1];
      fireEvent.change(bedsSelect, { target: { value: "3 Bed" } });

      await waitFor(() => {
        expect(getFilteredCount()).toBe(3);
      });
    });

    it("should filter by Studio", async () => {
      renderDevelopmentDetail();

      await waitFor(() => {
        expect(getFilteredCount()).toBe(8);
      });

      const bedsSelect = screen.getAllByRole("combobox")[1];
      fireEvent.change(bedsSelect, { target: { value: "Studio" } });

      await waitFor(() => {
        expect(getFilteredCount()).toBe(1);
      });
    });

    it("should filter by 2 Bed", async () => {
      renderDevelopmentDetail();

      await waitFor(() => {
        expect(getFilteredCount()).toBe(8);
      });

      const bedsSelect = screen.getAllByRole("combobox")[1];
      fireEvent.change(bedsSelect, { target: { value: "2 Bed" } });

      await waitFor(() => {
        expect(getFilteredCount()).toBe(3);
      });
    });
  });

  describe("Sales Status Filter", () => {
    it("should filter by Complete sales status", async () => {
      renderDevelopmentDetail();

      await waitFor(() => {
        expect(getFilteredCount()).toBe(8);
      });

      const salesSelect = screen.getAllByRole("combobox")[2];
      fireEvent.change(salesSelect, { target: { value: "Complete" } });

      await waitFor(() => {
        expect(getFilteredCount()).toBe(2);
      });
    });

    it("should filter by For Sale status", async () => {
      renderDevelopmentDetail();

      await waitFor(() => {
        expect(getFilteredCount()).toBe(8);
      });

      const salesSelect = screen.getAllByRole("combobox")[2];
      fireEvent.change(salesSelect, { target: { value: "For Sale" } });

      await waitFor(() => {
        expect(getFilteredCount()).toBe(2);
      });
    });

    it("should filter by Contracted status", async () => {
      renderDevelopmentDetail();

      await waitFor(() => {
        expect(getFilteredCount()).toBe(8);
      });

      const salesSelect = screen.getAllByRole("combobox")[2];
      fireEvent.change(salesSelect, { target: { value: "Contracted" } });

      await waitFor(() => {
        expect(getFilteredCount()).toBe(2);
      });
    });
  });

  describe("BCMS Approved Filter", () => {
    it("should filter by BCMS Approved = Yes", async () => {
      renderDevelopmentDetail();

      await waitFor(() => {
        expect(getFilteredCount()).toBe(8);
      });

      const bcmsSelect = screen.getAllByRole("combobox")[3];
      fireEvent.change(bcmsSelect, { target: { value: "yes" } });

      await waitFor(() => {
        // Units 1, 2, 6, 8 have bcmsApprovedDate
        expect(getFilteredCount()).toBe(4);
      });
    });

    it("should filter by BCMS Approved = No", async () => {
      renderDevelopmentDetail();

      await waitFor(() => {
        expect(getFilteredCount()).toBe(8);
      });

      const bcmsSelect = screen.getAllByRole("combobox")[3];
      fireEvent.change(bcmsSelect, { target: { value: "no" } });

      await waitFor(() => {
        // Units 3, 4, 5, 7 don't have bcmsApprovedDate
        expect(getFilteredCount()).toBe(4);
      });
    });

    it("should have BCMS Yes + No = Total", async () => {
      renderDevelopmentDetail();

      await waitFor(() => {
        expect(getFilteredCount()).toBe(8);
      });

      const bcmsSelect = screen.getAllByRole("combobox")[3];

      // Count Yes
      fireEvent.change(bcmsSelect, { target: { value: "yes" } });
      await waitFor(() => {
        expect(getFilteredCount()).toBe(4);
      });

      // Count No
      fireEvent.change(bcmsSelect, { target: { value: "no" } });
      await waitFor(() => {
        expect(getFilteredCount()).toBe(4);
      });

      // 4 + 4 = 8 (total) - verified!
    });
  });

  describe("Combined Filters", () => {
    it("should apply multiple filters together (AND logic)", async () => {
      renderDevelopmentDetail();

      await waitFor(() => {
        expect(getFilteredCount()).toBe(8);
      });

      const typeSelect = screen.getAllByRole("combobox")[0];
      const salesSelect = screen.getAllByRole("combobox")[2];

      // Filter by House-Semi AND Contracted
      fireEvent.change(typeSelect, { target: { value: "House-Semi" } });
      fireEvent.change(salesSelect, { target: { value: "Contracted" } });

      await waitFor(() => {
        // Only unit 2 matches (House-Semi + Contracted)
        expect(getFilteredCount()).toBe(1);
      });
    });

    it("should show no results when filters have no matches", async () => {
      renderDevelopmentDetail();

      await waitFor(() => {
        expect(getFilteredCount()).toBe(8);
      });

      const typeSelect = screen.getAllByRole("combobox")[0];
      const salesSelect = screen.getAllByRole("combobox")[2];

      // Filter by House-Detached AND Complete (no matches)
      fireEvent.change(typeSelect, { target: { value: "House-Detached" } });
      fireEvent.change(salesSelect, { target: { value: "Complete" } });

      await waitFor(() => {
        expect(getFilteredCount()).toBe(0);
      });
    });

    it("should reset filters when selecting All", async () => {
      renderDevelopmentDetail();

      await waitFor(() => {
        expect(getFilteredCount()).toBe(8);
      });

      const typeSelect = screen.getAllByRole("combobox")[0];

      // Apply filter
      fireEvent.change(typeSelect, { target: { value: "House-Semi" } });
      await waitFor(() => {
        expect(getFilteredCount()).toBe(2);
      });

      // Reset filter
      fireEvent.change(typeSelect, { target: { value: "all" } });
      await waitFor(() => {
        expect(getFilteredCount()).toBe(8);
      });
    });
  });
});
