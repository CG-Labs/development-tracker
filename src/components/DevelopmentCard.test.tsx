import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import { BrowserRouter } from "react-router-dom";
import { DevelopmentCard } from "./DevelopmentCard";
import type { Development, Unit } from "../types";

// Wrapper for router context
function renderWithRouter(component: React.ReactElement) {
  return render(<BrowserRouter>{component}</BrowserRouter>);
}

// Helper to create a mock unit with all required fields
function createMockUnit(overrides: Partial<Unit> & { salesStatus: Unit["salesStatus"]; constructionStatus: Unit["constructionStatus"] }): Unit {
  return {
    unitNumber: "001",
    type: "Apartment",
    bedrooms: 2,
    listPrice: 350000,
    documentation: {
      bcmsReceived: false,
      landRegistryApproved: false,
      homebondReceived: false,
      sanApproved: false,
      contractIssued: false,
      contractSigned: false,
      saleClosed: false,
    },
    ...overrides,
  };
}

// Mock development data
const mockDevelopment: Development = {
  id: "dev-1",
  name: "Riverside Heights",
  projectNumber: "RH2024",
  status: "Active",
  totalUnits: 6, // Match actual units count
  units: [
    createMockUnit({
      unitNumber: "001",
      salesStatus: "Complete",
      constructionStatus: "Complete",
      listPrice: 350000,
    }),
    createMockUnit({
      unitNumber: "002",
      salesStatus: "Complete",
      constructionStatus: "Complete",
      listPrice: 350000,
    }),
    createMockUnit({
      unitNumber: "003",
      type: "House-Semi",
      bedrooms: 3,
      salesStatus: "For Sale",
      constructionStatus: "In Progress",
      listPrice: 450000,
    }),
    createMockUnit({
      unitNumber: "004",
      type: "House-Semi",
      bedrooms: 3,
      salesStatus: "Under Offer",
      constructionStatus: "In Progress",
      listPrice: 450000,
    }),
    createMockUnit({
      unitNumber: "005",
      type: "Apartment Studio",
      bedrooms: 1,
      salesStatus: "Contracted",
      constructionStatus: "Not Started",
      listPrice: 250000,
    }),
    createMockUnit({
      unitNumber: "006",
      type: "Apartment Studio",
      bedrooms: 1,
      salesStatus: "Not Released",
      constructionStatus: "Not Started",
      listPrice: 250000,
    }),
  ],
};

describe("DevelopmentCard", () => {
  describe("header section", () => {
    it("displays development name", () => {
      renderWithRouter(<DevelopmentCard development={mockDevelopment} index={0} />);

      expect(screen.getByText("Riverside Heights")).toBeInTheDocument();
    });

    it("displays project number", () => {
      renderWithRouter(<DevelopmentCard development={mockDevelopment} index={0} />);

      expect(screen.getByText("RH2024")).toBeInTheDocument();
    });

    it("displays total units count", () => {
      renderWithRouter(<DevelopmentCard development={mockDevelopment} index={0} />);

      expect(screen.getByText("6")).toBeInTheDocument();
      expect(screen.getByText("units")).toBeInTheDocument();
    });
  });

  describe("sales status metrics", () => {
    it("displays complete count", () => {
      renderWithRouter(<DevelopmentCard development={mockDevelopment} index={0} />);

      // 2 units are Complete
      const completeStat = screen.getByText("Complete").closest("div");
      expect(completeStat).toHaveTextContent("2");
    });

    it("displays contracted count", () => {
      renderWithRouter(<DevelopmentCard development={mockDevelopment} index={0} />);

      // 1 unit is Contracted
      const contractedStat = screen.getByText("Contracted").closest("div");
      expect(contractedStat).toHaveTextContent("1");
    });

    it("displays under offer count", () => {
      renderWithRouter(<DevelopmentCard development={mockDevelopment} index={0} />);

      // 1 unit is Under Offer
      const underOfferStat = screen.getByText("Under Offer").closest("div");
      expect(underOfferStat).toHaveTextContent("1");
    });

    it("displays for sale count", () => {
      renderWithRouter(<DevelopmentCard development={mockDevelopment} index={0} />);

      // 1 unit is For Sale
      const forSaleStat = screen.getByText("For Sale").closest("div");
      expect(forSaleStat).toHaveTextContent("1");
    });

    it("displays not released count", () => {
      renderWithRouter(<DevelopmentCard development={mockDevelopment} index={0} />);

      // 1 unit is Not Released
      const notReleasedStat = screen.getByText("Not Released").closest("div");
      expect(notReleasedStat).toHaveTextContent("1");
    });
  });

  describe("construction progress", () => {
    it("displays construction progress percentage", () => {
      renderWithRouter(<DevelopmentCard development={mockDevelopment} index={0} />);

      // 2 complete out of 6 = 33%
      // There might be multiple 33% values (construction and sales)
      const percentages = screen.getAllByText("33%");
      expect(percentages.length).toBeGreaterThan(0);
    });

    it("displays construction complete count", () => {
      renderWithRouter(<DevelopmentCard development={mockDevelopment} index={0} />);

      expect(screen.getByText("2 complete")).toBeInTheDocument();
    });

    it("displays in progress count", () => {
      renderWithRouter(<DevelopmentCard development={mockDevelopment} index={0} />);

      expect(screen.getByText("2 in progress")).toBeInTheDocument();
    });
  });

  describe("sales progress", () => {
    it("displays sales complete percentage", () => {
      renderWithRouter(<DevelopmentCard development={mockDevelopment} index={0} />);

      // Find Sales Complete label and associated percentage
      // 2 complete out of 6 = 33%
      const salesCompleteSection = screen.getByText("Sales Complete").closest("div");
      expect(salesCompleteSection).toHaveTextContent("33%");
    });
  });

  describe("financial summary", () => {
    it("displays GDV", () => {
      renderWithRouter(<DevelopmentCard development={mockDevelopment} index={0} />);

      expect(screen.getByText("GDV")).toBeInTheDocument();
      // Total: 350000*2 + 450000*2 + 250000*2 = 2,100,000
      expect(screen.getByText("€2,100,000")).toBeInTheDocument();
    });

    it("displays sales to date", () => {
      renderWithRouter(<DevelopmentCard development={mockDevelopment} index={0} />);

      expect(screen.getByText("Sales to Date")).toBeInTheDocument();
      // Complete sales: 350000*2 = 700,000
      expect(screen.getByText("€700,000")).toBeInTheDocument();
    });

    it("displays sales percentage of GDV", () => {
      renderWithRouter(<DevelopmentCard development={mockDevelopment} index={0} />);

      // 700000 / 2100000 = 33.33%, rounds to 33%
      expect(screen.getByText("(33%)")).toBeInTheDocument();
    });
  });

  describe("navigation", () => {
    it("renders view details link", () => {
      renderWithRouter(<DevelopmentCard development={mockDevelopment} index={0} />);

      const link = screen.getByRole("link", { name: "View Details" });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/development/dev-1");
    });
  });

  describe("edge cases", () => {
    it("handles development with no units", () => {
      const emptyDevelopment: Development = {
        id: "dev-empty",
        name: "Empty Development",
        projectNumber: "ED001",
        status: "Active",
        totalUnits: 0,
        units: [],
      };

      renderWithRouter(<DevelopmentCard development={emptyDevelopment} index={0} />);

      expect(screen.getByText("Empty Development")).toBeInTheDocument();
      // When totalUnits is 0, percentages will be NaN or 0
      // The component should still render
      expect(screen.getByText("ED001")).toBeInTheDocument();
    });

    it("handles development with priceIncVat field", () => {
      const developmentWithVat: Development = {
        id: "dev-vat",
        name: "VAT Development",
        projectNumber: "VD001",
        status: "Active",
        totalUnits: 1,
        units: [
          createMockUnit({
            unitNumber: "001",
            listPrice: 300000,
            priceIncVat: 350000,
            salesStatus: "Complete",
            constructionStatus: "Complete",
          }),
        ],
      };

      renderWithRouter(<DevelopmentCard development={developmentWithVat} index={0} />);

      // Should use priceIncVat (350000) instead of listPrice (300000)
      // GDV should show €350,000
      const gdvElement = screen.getByText("GDV").closest("div")?.parentElement;
      expect(gdvElement).toHaveTextContent("€350,000");
    });
  });
});
