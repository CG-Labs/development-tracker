import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UnitDetailModal } from "./UnitDetailModal";
import type { Unit } from "../types";

// Mock the auth context
const mockCurrentUser = {
  uid: "test-user-id",
  email: "test@example.com",
  displayName: "Test User",
};

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    currentUser: mockCurrentUser,
  }),
}));

// Mock audit log service
vi.mock("../services/auditLogService", () => ({
  logChange: vi.fn(() => Promise.resolve()),
}));

// Mock notes service
const mockNotes: Array<{
  id: string;
  content: string;
  userId: string;
  userEmail: string;
  userName?: string;
  timestamp: Date;
  edited?: boolean;
}> = [];

vi.mock("../services/notesService", () => ({
  subscribeToNotes: vi.fn((_unitId, onNotes) => {
    onNotes(mockNotes);
    return vi.fn(); // unsubscribe function
  }),
  addNote: vi.fn(() => Promise.resolve({ id: "new-note-id" })),
  updateNote: vi.fn(() => Promise.resolve()),
  deleteNote: vi.fn(() => Promise.resolve()),
}));

// Mock incentive service
vi.mock("../services/incentiveService", () => ({
  getActiveSchemes: vi.fn(() => Promise.resolve([])),
  checkUnitEligibility: vi.fn(() => ({
    eligible: true,
    requirementsMet: [],
  })),
  formatBenefitValue: vi.fn((value) => `€${value}`),
  calculateTotalBenefitValue: vi.fn(() => 5000),
}));

// Helper to create a mock unit
function createMockUnit(overrides: Partial<Unit> = {}): Unit {
  return {
    unitNumber: "001",
    type: "Apartment",
    bedrooms: 2,
    listPrice: 350000,
    constructionStatus: "In Progress",
    salesStatus: "For Sale",
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

describe("UnitDetailModal", () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();
  const defaultProps = {
    unit: createMockUnit(),
    developmentName: "Test Development",
    developmentId: "dev-123",
    onClose: mockOnClose,
    onSave: mockOnSave,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNotes.length = 0;
  });

  describe("header section", () => {
    it("displays development name", () => {
      render(<UnitDetailModal {...defaultProps} />);

      expect(screen.getByText("Test Development")).toBeInTheDocument();
    });

    it("displays unit number", () => {
      render(<UnitDetailModal {...defaultProps} />);

      expect(screen.getByText("Unit 001")).toBeInTheDocument();
    });

    it("has close button", () => {
      render(<UnitDetailModal {...defaultProps} />);

      expect(screen.getByLabelText("Close modal")).toBeInTheDocument();
    });

    it("calls onClose when close button is clicked", async () => {
      const user = userEvent.setup();
      render(<UnitDetailModal {...defaultProps} />);

      await user.click(screen.getByLabelText("Close modal"));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when clicking backdrop", async () => {
      const user = userEvent.setup();
      render(<UnitDetailModal {...defaultProps} />);

      // Click the backdrop (the outer div)
      const backdrop = document.querySelector(".modal-backdrop");
      if (backdrop) {
        await user.click(backdrop);
      }

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("unit details section", () => {
    it("displays unit type", () => {
      render(<UnitDetailModal {...defaultProps} />);

      expect(screen.getByText("Apartment")).toBeInTheDocument();
    });

    it("displays bedrooms count", () => {
      render(<UnitDetailModal {...defaultProps} />);

      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("displays list price formatted", () => {
      render(<UnitDetailModal {...defaultProps} />);

      expect(screen.getByText("€350,000")).toBeInTheDocument();
    });

    it("displays sold price when available", () => {
      const unitWithSoldPrice = createMockUnit({ soldPrice: 340000 });
      render(<UnitDetailModal {...defaultProps} unit={unitWithSoldPrice} />);

      expect(screen.getByText("€340,000")).toBeInTheDocument();
    });

    it("displays address when available", () => {
      const unitWithAddress = createMockUnit({ address: "123 Main Street" });
      render(<UnitDetailModal {...defaultProps} unit={unitWithAddress} />);

      expect(screen.getByText("123 Main Street")).toBeInTheDocument();
    });

    it("displays placeholder when no address", () => {
      render(<UnitDetailModal {...defaultProps} />);

      expect(screen.getByText("No address specified")).toBeInTheDocument();
    });
  });

  describe("status section", () => {
    it("displays construction status", () => {
      render(<UnitDetailModal {...defaultProps} />);

      // "In Progress" appears in multiple places (status badge and progress marker)
      const inProgressElements = screen.getAllByText("In Progress");
      expect(inProgressElements.length).toBeGreaterThan(0);
    });

    it("displays sales status", () => {
      render(<UnitDetailModal {...defaultProps} />);

      expect(screen.getByText("For Sale")).toBeInTheDocument();
    });
  });

  describe("construction progress section", () => {
    it("displays 0% for Not Started", () => {
      const unit = createMockUnit({ constructionStatus: "Not Started" });
      render(<UnitDetailModal {...defaultProps} unit={unit} />);

      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("displays 50% for In Progress", () => {
      const unit = createMockUnit({ constructionStatus: "In Progress" });
      render(<UnitDetailModal {...defaultProps} unit={unit} />);

      expect(screen.getByText("50%")).toBeInTheDocument();
    });

    it("displays 100% for Complete", () => {
      const unit = createMockUnit({ constructionStatus: "Complete" });
      render(<UnitDetailModal {...defaultProps} unit={unit} />);

      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    it("displays progress markers", () => {
      render(<UnitDetailModal {...defaultProps} />);

      expect(screen.getByText("Not Started")).toBeInTheDocument();
      // "In Progress" appears in multiple places, so use getAllByText
      expect(screen.getAllByText("In Progress").length).toBeGreaterThan(0);
      expect(screen.getByText("Complete")).toBeInTheDocument();
    });
  });

  describe("documentation section", () => {
    it("displays completion documentation items", () => {
      render(<UnitDetailModal {...defaultProps} />);

      expect(screen.getByText("BCMS Received")).toBeInTheDocument();
      expect(screen.getByText("Land Registry Map Approved")).toBeInTheDocument();
      expect(screen.getByText("Homebond Warranty Received")).toBeInTheDocument();
    });

    it("displays sales documentation items", () => {
      render(<UnitDetailModal {...defaultProps} />);

      expect(screen.getByText("SAN (Sales Advice Notice) Approved")).toBeInTheDocument();
      expect(screen.getByText("Contract Issued")).toBeInTheDocument();
      expect(screen.getByText("Contract Signed")).toBeInTheDocument();
      expect(screen.getByText("Sale Closed")).toBeInTheDocument();
    });

    it("shows Yes/No status for documentation items", () => {
      render(<UnitDetailModal {...defaultProps} />);

      // All documentation items are false by default
      const noElements = screen.getAllByText("No");
      expect(noElements.length).toBeGreaterThan(0);
    });
  });

  describe("purchaser information section", () => {
    it("displays purchaser type", () => {
      const unit = createMockUnit({ purchaserType: "Private" });
      render(<UnitDetailModal {...defaultProps} unit={unit} />);

      // Find within the purchaser section
      const purchaserSection = screen.getByText("Purchaser Type").closest("div");
      expect(purchaserSection).toHaveTextContent("Private");
    });

    it("displays Part V status", () => {
      const unit = createMockUnit({ partV: true });
      render(<UnitDetailModal {...defaultProps} unit={unit} />);

      const partVSection = screen.getByText("Part V").closest("div");
      expect(partVSection).toHaveTextContent("Yes");
    });

    it("displays purchaser name when available", () => {
      const unit = createMockUnit({ purchaserName: "John Doe" });
      render(<UnitDetailModal {...defaultProps} unit={unit} />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("displays purchaser phone when available", () => {
      const unit = createMockUnit({ purchaserPhone: "+353 1 234 5678" });
      render(<UnitDetailModal {...defaultProps} unit={unit} />);

      expect(screen.getByText("+353 1 234 5678")).toBeInTheDocument();
    });

    it("displays purchaser email when available", () => {
      const unit = createMockUnit({ purchaserEmail: "buyer@example.com" });
      render(<UnitDetailModal {...defaultProps} unit={unit} />);

      expect(screen.getByText("buyer@example.com")).toBeInTheDocument();
    });
  });

  describe("key dates section", () => {
    it("displays date labels", () => {
      render(<UnitDetailModal {...defaultProps} />);

      expect(screen.getByText("Start Date")).toBeInTheDocument();
      expect(screen.getByText("Completion")).toBeInTheDocument();
      expect(screen.getByText("Snag Date")).toBeInTheDocument();
      expect(screen.getByText("Close Date")).toBeInTheDocument();
    });

    it("displays formatted dates when available", () => {
      const unit = createMockUnit({ startDate: "2024-01-15" });
      render(<UnitDetailModal {...defaultProps} unit={unit} />);

      expect(screen.getByText("15 Jan 2024")).toBeInTheDocument();
    });

    it("displays dash for missing dates", () => {
      render(<UnitDetailModal {...defaultProps} />);

      const dashes = screen.getAllByText("—");
      expect(dashes.length).toBeGreaterThan(0);
    });
  });

  describe("edit mode", () => {
    it("shows Edit Unit button in view mode", () => {
      render(<UnitDetailModal {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Edit Unit" })).toBeInTheDocument();
    });

    it("shows Cancel and Save Changes buttons in edit mode", async () => {
      const user = userEvent.setup();
      render(<UnitDetailModal {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Edit Unit" }));

      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    });

    it("cancels edit mode and reverts changes", async () => {
      const user = userEvent.setup();
      render(<UnitDetailModal {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Edit Unit" }));

      // Make a change to address input
      const addressInput = screen.getByPlaceholderText("Enter address");
      await user.type(addressInput, "New Address");

      // Cancel
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      // Should be back in view mode
      expect(screen.getByRole("button", { name: "Edit Unit" })).toBeInTheDocument();
    });

    it("shows save message when no changes", async () => {
      const user = userEvent.setup();
      render(<UnitDetailModal {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Edit Unit" }));
      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(screen.getByText("No changes to save")).toBeInTheDocument();
      });
    });
  });

  describe("notes section", () => {
    it("displays notes section header", () => {
      render(<UnitDetailModal {...defaultProps} />);

      expect(screen.getByText(/Notes & Comments/)).toBeInTheDocument();
    });

    it("displays add note textarea", () => {
      render(<UnitDetailModal {...defaultProps} />);

      expect(screen.getByPlaceholderText("Add a note...")).toBeInTheDocument();
    });

    it("displays Add Note button", () => {
      render(<UnitDetailModal {...defaultProps} />);

      expect(screen.getByRole("button", { name: /Add Note/i })).toBeInTheDocument();
    });

    it("shows empty state when no notes", () => {
      render(<UnitDetailModal {...defaultProps} />);

      expect(screen.getByText("No notes yet. Be the first to add one!")).toBeInTheDocument();
    });

    it("Add Note button is disabled when textarea is empty", () => {
      render(<UnitDetailModal {...defaultProps} />);

      const addButton = screen.getByRole("button", { name: /Add Note/i });
      expect(addButton).toBeDisabled();
    });

    it("enables Add Note button when text is entered", async () => {
      const user = userEvent.setup();
      render(<UnitDetailModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText("Add a note...");
      await user.type(textarea, "Test note content");

      const addButton = screen.getByRole("button", { name: /Add Note/i });
      expect(addButton).not.toBeDisabled();
    });

    it("shows character count", async () => {
      const user = userEvent.setup();
      render(<UnitDetailModal {...defaultProps} />);

      expect(screen.getByText("0/1000")).toBeInTheDocument();

      const textarea = screen.getByPlaceholderText("Add a note...");
      await user.type(textarea, "Hello");

      expect(screen.getByText("5/1000")).toBeInTheDocument();
    });
  });

  describe("incentive scheme section", () => {
    it("displays incentive scheme section", () => {
      render(<UnitDetailModal {...defaultProps} />);

      expect(screen.getByText("Incentive Scheme")).toBeInTheDocument();
    });

    it("shows no incentive message when none applied", () => {
      render(<UnitDetailModal {...defaultProps} />);

      expect(screen.getByText("No incentive applied")).toBeInTheDocument();
    });
  });

  describe("footer buttons", () => {
    it("displays Close button in view mode", () => {
      render(<UnitDetailModal {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    });

    it("Close button calls onClose", async () => {
      const user = userEvent.setup();
      render(<UnitDetailModal {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Close" }));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("different unit statuses", () => {
    it("renders complete unit correctly", () => {
      const completeUnit = createMockUnit({
        constructionStatus: "Complete",
        salesStatus: "Complete",
        soldPrice: 345000,
        purchaserName: "John Smith",
        purchaserEmail: "john@example.com",
        purchaserPhone: "123456789",
        address: "123 Main St",
        documentation: {
          bcmsReceived: true,
          bcmsReceivedDate: "2024-01-10",
          landRegistryApproved: true,
          landRegistryApprovedDate: "2024-01-15",
          homebondReceived: true,
          homebondReceivedDate: "2024-01-20",
          sanApproved: true,
          sanApprovedDate: "2024-02-01",
          contractIssued: true,
          contractIssuedDate: "2024-02-05",
          contractSigned: true,
          contractSignedDate: "2024-02-10",
          saleClosed: true,
          saleClosedDate: "2024-02-15",
        },
      });

      render(<UnitDetailModal {...defaultProps} unit={completeUnit} />);

      expect(screen.getByText("100%")).toBeInTheDocument();
      expect(screen.getByText("€345,000")).toBeInTheDocument();
      expect(screen.getByText("John Smith")).toBeInTheDocument();
      expect(screen.getByText("123 Main St")).toBeInTheDocument();

      // Check for Yes status on documentation
      const yesElements = screen.getAllByText("Yes");
      expect(yesElements.length).toBeGreaterThan(0);
    });

    it("renders Not Released unit correctly", () => {
      const notReleasedUnit = createMockUnit({
        constructionStatus: "Not Started",
        salesStatus: "Not Released",
      });

      render(<UnitDetailModal {...defaultProps} unit={notReleasedUnit} />);

      expect(screen.getByText("0%")).toBeInTheDocument();
      expect(screen.getByText("Not Released")).toBeInTheDocument();
    });
  });
});
