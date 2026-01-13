import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import { BrowserRouter } from "react-router-dom";
import { Dashboard } from "./Dashboard";

// Mock the development data
vi.mock("../data/realDevelopments", () => ({
  developments: [
    {
      id: "dev-1",
      name: "Active Development 1",
      projectNumber: "AD001",
      status: "Active",
      totalUnits: 5,
      units: [
        { id: "u1", salesStatus: "Complete", constructionStatus: "Complete", listPrice: 100000 },
        { id: "u2", salesStatus: "For Sale", constructionStatus: "In Progress", listPrice: 100000 },
        { id: "u3", salesStatus: "Under Offer", constructionStatus: "In Progress", listPrice: 100000 },
        { id: "u4", salesStatus: "Contracted", constructionStatus: "Not Started", listPrice: 100000 },
        { id: "u5", salesStatus: "Not Released", constructionStatus: "Not Started", listPrice: 100000 },
      ],
    },
    {
      id: "dev-2",
      name: "Active Development 2",
      projectNumber: "AD002",
      status: "Active",
      totalUnits: 3,
      units: [
        { id: "u6", salesStatus: "Complete", constructionStatus: "Complete", listPrice: 200000 },
        { id: "u7", salesStatus: "Complete", constructionStatus: "Complete", listPrice: 200000 },
        { id: "u8", salesStatus: "For Sale", constructionStatus: "In Progress", listPrice: 200000 },
      ],
    },
    {
      id: "dev-3",
      name: "Archived Development",
      projectNumber: "AR001",
      status: "Archived",
      totalUnits: 2,
      units: [
        { id: "u9", salesStatus: "Complete", constructionStatus: "Complete", listPrice: 150000 },
        { id: "u10", salesStatus: "Complete", constructionStatus: "Complete", listPrice: 150000 },
      ],
    },
  ],
}));

// Mock child components to simplify testing
vi.mock("./ProgressMonitoring", () => ({
  ProgressMonitoring: () => <div data-testid="progress-monitoring">Progress Monitoring</div>,
}));

vi.mock("./CashFlowMonitoring", () => ({
  CashFlowMonitoring: () => <div data-testid="cashflow-monitoring">Cash Flow Monitoring</div>,
}));

// Wrapper for router context
function renderWithRouter(component: React.ReactElement) {
  return render(<BrowserRouter>{component}</BrowserRouter>);
}

describe("Dashboard", () => {
  describe("portfolio overview section", () => {
    it("renders portfolio overview heading", () => {
      renderWithRouter(<Dashboard />);

      expect(screen.getByText("Portfolio Overview")).toBeInTheDocument();
    });

    it("displays correct total developments count (active only)", () => {
      renderWithRouter(<Dashboard />);

      // Only 2 active developments, not the archived one
      const developmentsCard = screen.getByText("Developments").closest("div");
      expect(developmentsCard).toHaveTextContent("2");
    });

    it("displays correct total units count (from active developments)", () => {
      renderWithRouter(<Dashboard />);

      // 5 + 3 = 8 units from active developments
      const unitsCard = screen.getByText("Total Units").closest("div");
      expect(unitsCard).toHaveTextContent("8");
    });

    it("displays complete stat card with correct label", () => {
      renderWithRouter(<Dashboard />);

      // 1 complete from dev-1 + 2 complete from dev-2 = 3
      // Look for the stat card label "Complete" (multiple might exist in development cards)
      const completeLabels = screen.getAllByText("Complete");
      expect(completeLabels.length).toBeGreaterThan(0);
    });

    it("displays contracted stat card label", () => {
      renderWithRouter(<Dashboard />);

      const contractedLabels = screen.getAllByText("Contracted");
      expect(contractedLabels.length).toBeGreaterThan(0);
    });

    it("displays under offer stat card label", () => {
      renderWithRouter(<Dashboard />);

      const underOfferLabels = screen.getAllByText("Under Offer");
      expect(underOfferLabels.length).toBeGreaterThan(0);
    });

    it("displays for sale stat card label", () => {
      renderWithRouter(<Dashboard />);

      const forSaleLabels = screen.getAllByText("For Sale");
      expect(forSaleLabels.length).toBeGreaterThan(0);
    });

    it("displays not released stat card label", () => {
      renderWithRouter(<Dashboard />);

      const notReleasedLabels = screen.getAllByText("Not Released");
      expect(notReleasedLabels.length).toBeGreaterThan(0);
    });
  });

  describe("active developments section", () => {
    it("renders active developments heading", () => {
      renderWithRouter(<Dashboard />);

      expect(screen.getByText("Active Developments")).toBeInTheDocument();
    });

    it("displays active project count", () => {
      renderWithRouter(<Dashboard />);

      expect(screen.getByText("2 active projects")).toBeInTheDocument();
    });

    it("renders development cards for active developments only", () => {
      renderWithRouter(<Dashboard />);

      expect(screen.getByText("Active Development 1")).toBeInTheDocument();
      expect(screen.getByText("Active Development 2")).toBeInTheDocument();
      expect(screen.queryByText("Archived Development")).not.toBeInTheDocument();
    });
  });

  describe("monitoring sections", () => {
    it("renders progress monitoring component", () => {
      renderWithRouter(<Dashboard />);

      expect(screen.getByTestId("progress-monitoring")).toBeInTheDocument();
    });

    it("renders cash flow monitoring component", () => {
      renderWithRouter(<Dashboard />);

      expect(screen.getByTestId("cashflow-monitoring")).toBeInTheDocument();
    });
  });

  describe("stat cards", () => {
    it("displays complete percentage subtitle", () => {
      renderWithRouter(<Dashboard />);

      // 3 complete out of 8 = 37.5%, rounded to 38%
      expect(screen.getByText("38% of total")).toBeInTheDocument();
    });
  });
});
