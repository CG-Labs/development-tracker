import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UnitDetailModal } from "./UnitDetailModal";
import type { Unit } from "../types";
import * as auditLogService from "../services/auditLogService";
import * as notesService from "../services/notesService";
import * as incentiveService from "../services/incentiveService";

// Mock the auth context
let mockCurrentUser: { uid: string; email: string; displayName: string } | null = {
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

let mockNotesErrorCallback: ((error: Error) => void) | null = null;

vi.mock("../services/notesService", () => ({
  subscribeToNotes: vi.fn((_unitId, onNotes, onError) => {
    mockNotesErrorCallback = onError;
    onNotes(mockNotes);
    return vi.fn(); // unsubscribe function
  }),
  addNote: vi.fn(() => Promise.resolve({ id: "new-note-id" })),
  updateNote: vi.fn(() => Promise.resolve()),
  deleteNote: vi.fn(() => Promise.resolve()),
}));

// Mock incentive service
const mockIncentiveSchemes = [
  {
    id: "scheme-1",
    name: "First Time Buyer",
    description: "Scheme for first time buyers",
    benefits: [
      { type: "Cash Discount", value: 5000, currency: "EUR" },
      { type: "Free Upgrades", value: 2000, currency: "EUR" },
    ],
    requirements: [
      { type: "salesStatus", operator: "equals", value: "For Sale", description: "Must be for sale" },
    ],
    isActive: true,
    startDate: "2024-01-01",
  },
];

vi.mock("../services/incentiveService", () => ({
  getActiveSchemes: vi.fn(() => Promise.resolve([])),
  checkUnitEligibility: vi.fn(() => ({
    eligible: true,
    requirementsMet: [
      { description: "Must be for sale", met: true },
    ],
  })),
  formatBenefitValue: vi.fn((value) => `€${value}`),
  calculateTotalBenefitValue: vi.fn(() => 5000),
}));

// Get mocked functions
const mockLogChange = auditLogService.logChange as ReturnType<typeof vi.fn>;
const mockAddNote = notesService.addNote as ReturnType<typeof vi.fn>;
const mockUpdateNote = notesService.updateNote as ReturnType<typeof vi.fn>;
const mockDeleteNote = notesService.deleteNote as ReturnType<typeof vi.fn>;
const mockGetActiveSchemes = incentiveService.getActiveSchemes as ReturnType<typeof vi.fn>;

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
    mockCurrentUser = {
      uid: "test-user-id",
      email: "test@example.com",
      displayName: "Test User",
    };
    mockGetActiveSchemes.mockResolvedValue([]);
    mockAddNote.mockResolvedValue({ id: "new-note-id" });
    mockUpdateNote.mockResolvedValue(undefined);
    mockDeleteNote.mockResolvedValue(undefined);
    mockLogChange.mockResolvedValue(undefined);
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

      expect(screen.getByText("2 Bed")).toBeInTheDocument();
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

      expect(screen.getByText("BCMS Submit")).toBeInTheDocument();
      expect(screen.getByText("BCMS Approved")).toBeInTheDocument();
      expect(screen.getByText("Homebond Submit")).toBeInTheDocument();
      expect(screen.getByText("Land Map Submit")).toBeInTheDocument();
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

      expect(screen.getByText("Planned BCMS")).toBeInTheDocument();
      expect(screen.getByText("Actual BCMS")).toBeInTheDocument();
      expect(screen.getByText("Planned Close")).toBeInTheDocument();
      expect(screen.getByText("Actual Close")).toBeInTheDocument();
    });

    it("displays formatted dates when available", () => {
      const unit = createMockUnit({ keyDates: { plannedBcms: "2024-01-15" } });
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
          bcmsApprovedDate: "2024-01-10",
          homebondApprovedDate: "2024-01-20",
          sanApprovedDate: "2024-02-01",
          contractIssuedDate: "2024-02-05",
          contractSignedDate: "2024-02-10",
          saleClosedDate: "2024-02-15",
        },
      });

      render(<UnitDetailModal {...defaultProps} unit={completeUnit} />);

      expect(screen.getByText("100%")).toBeInTheDocument();
      expect(screen.getByText("€345,000")).toBeInTheDocument();
      expect(screen.getByText("John Smith")).toBeInTheDocument();
      expect(screen.getByText("123 Main St")).toBeInTheDocument();

      // Check for Yes status on documentation (format is "Yes - [date]")
      const yesElements = screen.getAllByText(/^Yes -/);
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

  describe("notes with existing notes", () => {
    it("displays existing notes", () => {
      mockNotes.push({
        id: "note-1",
        content: "This is a test note",
        userId: "other-user-id",
        userEmail: "other@example.com",
        userName: "Other User",
        timestamp: new Date("2024-01-15T10:30:00"),
        edited: false,
      });

      render(<UnitDetailModal {...defaultProps} />);

      expect(screen.getByText("This is a test note")).toBeInTheDocument();
      expect(screen.getByText("Other User")).toBeInTheDocument();
    });

    it("shows (You) label for own notes", () => {
      mockNotes.push({
        id: "note-1",
        content: "My own note",
        userId: "test-user-id",
        userEmail: "test@example.com",
        userName: "Test User",
        timestamp: new Date("2024-01-15T10:30:00"),
      });

      render(<UnitDetailModal {...defaultProps} />);

      expect(screen.getByText("(You)")).toBeInTheDocument();
    });

    it("shows edited indicator for edited notes", () => {
      mockNotes.push({
        id: "note-1",
        content: "Edited note",
        userId: "other-user-id",
        userEmail: "other@example.com",
        timestamp: new Date("2024-01-15T10:30:00"),
        edited: true,
      });

      render(<UnitDetailModal {...defaultProps} />);

      expect(screen.getByText("(edited)")).toBeInTheDocument();
    });

    it("displays note count in header when notes exist", () => {
      mockNotes.push(
        {
          id: "note-1",
          content: "Note 1",
          userId: "user-1",
          userEmail: "user1@example.com",
          timestamp: new Date(),
        },
        {
          id: "note-2",
          content: "Note 2",
          userId: "user-2",
          userEmail: "user2@example.com",
          timestamp: new Date(),
        }
      );

      render(<UnitDetailModal {...defaultProps} />);

      expect(screen.getByText(/Notes & Comments \(2\)/)).toBeInTheDocument();
    });

    it("shows edit and delete buttons for own notes", () => {
      mockNotes.push({
        id: "note-1",
        content: "My note",
        userId: "test-user-id",
        userEmail: "test@example.com",
        timestamp: new Date(),
      });

      render(<UnitDetailModal {...defaultProps} />);

      expect(screen.getByTitle("Edit")).toBeInTheDocument();
      expect(screen.getByTitle("Delete")).toBeInTheDocument();
    });

    it("does not show edit/delete buttons for other users notes", () => {
      mockNotes.push({
        id: "note-1",
        content: "Other user note",
        userId: "other-user-id",
        userEmail: "other@example.com",
        timestamp: new Date(),
      });

      render(<UnitDetailModal {...defaultProps} />);

      expect(screen.queryByTitle("Edit")).not.toBeInTheDocument();
      expect(screen.queryByTitle("Delete")).not.toBeInTheDocument();
    });
  });

  describe("add note functionality", () => {
    it("adds note successfully", async () => {
      const user = userEvent.setup();
      render(<UnitDetailModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText("Add a note...");
      await user.type(textarea, "New test note");
      await user.click(screen.getByRole("button", { name: /Add Note/i }));

      await waitFor(() => {
        expect(mockAddNote).toHaveBeenCalledWith({
          unitId: "001",
          developmentId: "dev-123",
          content: "New test note",
          userId: "test-user-id",
          userEmail: "test@example.com",
          userName: "Test User",
        });
      });

      await waitFor(() => {
        expect(screen.getByText("Note added successfully!")).toBeInTheDocument();
      });
    });

    it("shows adding state while submitting", async () => {
      const user = userEvent.setup();
      mockAddNote.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ id: "new-id" }), 100)));
      render(<UnitDetailModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText("Add a note...");
      await user.type(textarea, "Test note");
      await user.click(screen.getByRole("button", { name: /Add Note/i }));

      expect(screen.getByText("Adding...")).toBeInTheDocument();
    });

    it("clears textarea after adding note", async () => {
      const user = userEvent.setup();
      render(<UnitDetailModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText("Add a note...");
      await user.type(textarea, "Test note");
      await user.click(screen.getByRole("button", { name: /Add Note/i }));

      await waitFor(() => {
        expect(textarea).toHaveValue("");
      });
    });

    it("shows error when add note fails", async () => {
      const user = userEvent.setup();
      mockAddNote.mockRejectedValue(new Error("Network error"));
      render(<UnitDetailModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText("Add a note...");
      await user.type(textarea, "Test note");
      await user.click(screen.getByRole("button", { name: /Add Note/i }));

      await waitFor(() => {
        expect(screen.getByText("Failed to add note. Please try again.")).toBeInTheDocument();
      });
    });

    it("shows error when user is not logged in", async () => {
      mockCurrentUser = null;
      const user = userEvent.setup();
      render(<UnitDetailModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText("Add a note...");
      await user.type(textarea, "Test note");
      await user.click(screen.getByRole("button", { name: /Add Note/i }));

      await waitFor(() => {
        expect(screen.getByText("You must be logged in to add notes.")).toBeInTheDocument();
      });
    });

    it("shows error when developmentId is missing", async () => {
      const user = userEvent.setup();
      render(<UnitDetailModal {...defaultProps} developmentId={undefined} />);

      const textarea = screen.getByPlaceholderText("Add a note...");
      await user.type(textarea, "Test note");
      await user.click(screen.getByRole("button", { name: /Add Note/i }));

      await waitFor(() => {
        expect(screen.getByText("Error: Development ID not found.")).toBeInTheDocument();
      });
    });

    it("does not add empty notes", async () => {
      const user = userEvent.setup();
      render(<UnitDetailModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText("Add a note...");
      await user.type(textarea, "   ");
      await user.click(screen.getByRole("button", { name: /Add Note/i }));

      expect(mockAddNote).not.toHaveBeenCalled();
    });
  });

  describe("edit note functionality", () => {
    it("enters edit mode when edit button is clicked", async () => {
      const user = userEvent.setup();
      mockNotes.push({
        id: "note-1",
        content: "Original content",
        userId: "test-user-id",
        userEmail: "test@example.com",
        timestamp: new Date(),
      });

      render(<UnitDetailModal {...defaultProps} />);

      await user.click(screen.getByTitle("Edit"));

      // Should show edit textarea with original content
      const editTextarea = screen.getByDisplayValue("Original content");
      expect(editTextarea).toBeInTheDocument();
    });

    it("saves edited note", async () => {
      const user = userEvent.setup();
      mockNotes.push({
        id: "note-1",
        content: "Original content",
        userId: "test-user-id",
        userEmail: "test@example.com",
        timestamp: new Date(),
      });

      render(<UnitDetailModal {...defaultProps} />);

      await user.click(screen.getByTitle("Edit"));

      const editTextarea = screen.getByDisplayValue("Original content");
      await user.clear(editTextarea);
      await user.type(editTextarea, "Updated content");

      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => {
        expect(mockUpdateNote).toHaveBeenCalledWith("note-1", "Updated content");
      });
    });

    it("cancels edit mode", async () => {
      const user = userEvent.setup();
      mockNotes.push({
        id: "note-1",
        content: "Original content",
        userId: "test-user-id",
        userEmail: "test@example.com",
        timestamp: new Date(),
      });

      render(<UnitDetailModal {...defaultProps} />);

      await user.click(screen.getByTitle("Edit"));
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      // Should exit edit mode
      expect(screen.queryByDisplayValue("Original content")).not.toBeInTheDocument();
      expect(screen.getByText("Original content")).toBeInTheDocument();
    });

    it("shows error when update fails", async () => {
      const user = userEvent.setup();
      mockUpdateNote.mockRejectedValue(new Error("Update failed"));
      mockNotes.push({
        id: "note-1",
        content: "Original content",
        userId: "test-user-id",
        userEmail: "test@example.com",
        timestamp: new Date(),
      });

      render(<UnitDetailModal {...defaultProps} />);

      await user.click(screen.getByTitle("Edit"));
      const editTextarea = screen.getByDisplayValue("Original content");
      await user.clear(editTextarea);
      await user.type(editTextarea, "Updated");
      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => {
        expect(screen.getByText("Failed to update note. Please try again.")).toBeInTheDocument();
      });
    });
  });

  describe("delete note functionality", () => {
    it("shows delete confirmation when delete button is clicked", async () => {
      const user = userEvent.setup();
      mockNotes.push({
        id: "note-1",
        content: "Note to delete",
        userId: "test-user-id",
        userEmail: "test@example.com",
        timestamp: new Date(),
      });

      render(<UnitDetailModal {...defaultProps} />);

      await user.click(screen.getByTitle("Delete"));

      expect(screen.getByText("Are you sure you want to delete this note?")).toBeInTheDocument();
    });

    it("deletes note when confirmed", async () => {
      const user = userEvent.setup();
      mockNotes.push({
        id: "note-1",
        content: "Note to delete",
        userId: "test-user-id",
        userEmail: "test@example.com",
        timestamp: new Date(),
      });

      render(<UnitDetailModal {...defaultProps} />);

      await user.click(screen.getByTitle("Delete"));
      await user.click(screen.getByRole("button", { name: "Delete" }));

      await waitFor(() => {
        expect(mockDeleteNote).toHaveBeenCalledWith("note-1");
      });
    });

    it("cancels delete when cancel is clicked", async () => {
      const user = userEvent.setup();
      mockNotes.push({
        id: "note-1",
        content: "Note to delete",
        userId: "test-user-id",
        userEmail: "test@example.com",
        timestamp: new Date(),
      });

      render(<UnitDetailModal {...defaultProps} />);

      await user.click(screen.getByTitle("Delete"));

      // Find cancel button in the delete confirmation
      const cancelButtons = screen.getAllByRole("button", { name: "Cancel" });
      await user.click(cancelButtons[cancelButtons.length - 1]);

      expect(mockDeleteNote).not.toHaveBeenCalled();
      expect(screen.queryByText("Are you sure you want to delete this note?")).not.toBeInTheDocument();
    });

    it("shows error when delete fails", async () => {
      const user = userEvent.setup();
      mockDeleteNote.mockRejectedValue(new Error("Delete failed"));
      mockNotes.push({
        id: "note-1",
        content: "Note to delete",
        userId: "test-user-id",
        userEmail: "test@example.com",
        timestamp: new Date(),
      });

      render(<UnitDetailModal {...defaultProps} />);

      await user.click(screen.getByTitle("Delete"));
      await user.click(screen.getByRole("button", { name: "Delete" }));

      await waitFor(() => {
        expect(screen.getByText("Failed to delete note. Please try again.")).toBeInTheDocument();
      });
    });
  });

  describe("save changes with actual modifications", () => {
    it("saves address change", async () => {
      const user = userEvent.setup();
      render(<UnitDetailModal {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Edit Unit" }));

      const addressInput = screen.getByPlaceholderText("Enter address");
      await user.type(addressInput, "123 New Street");

      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(mockLogChange).toHaveBeenCalledWith(expect.objectContaining({
          action: "update",
          entityType: "unit",
          changes: expect.arrayContaining([
            expect.objectContaining({
              field: "address",
              newValue: "123 New Street",
            }),
          ]),
        }));
      });
    });

    it("calls onSave callback with updated unit", async () => {
      const user = userEvent.setup();
      render(<UnitDetailModal {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Edit Unit" }));

      const addressInput = screen.getByPlaceholderText("Enter address");
      await user.type(addressInput, "123 New Street");

      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
          address: "123 New Street",
        }));
      });
    });

    it("shows success message after save", async () => {
      const user = userEvent.setup();
      render(<UnitDetailModal {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Edit Unit" }));

      const addressInput = screen.getByPlaceholderText("Enter address");
      await user.type(addressInput, "123 New Street");

      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(screen.getByText("Changes saved and logged successfully!")).toBeInTheDocument();
      });
    });

    it("shows saving state while saving", async () => {
      const user = userEvent.setup();
      // Use a longer delay to ensure we can catch the saving state
      let resolvePromise: () => void;
      const savePromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockLogChange.mockImplementation(() => savePromise);
      render(<UnitDetailModal {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Edit Unit" }));

      const addressInput = screen.getByPlaceholderText("Enter address");
      await user.type(addressInput, "123 New Street");

      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      // Wait for the saving state to appear
      await waitFor(() => {
        expect(screen.getByText("Saving...")).toBeInTheDocument();
      });

      // Resolve the save to clean up
      resolvePromise!();
    });

    it("shows error when save fails", async () => {
      const user = userEvent.setup();
      mockLogChange.mockRejectedValue(new Error("Save failed"));
      render(<UnitDetailModal {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Edit Unit" }));

      const addressInput = screen.getByPlaceholderText("Enter address");
      await user.type(addressInput, "123 New Street");

      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(screen.getByText("Failed to save changes. Please try again.")).toBeInTheDocument();
      });
    });

    it("changes purchaser type", async () => {
      const user = userEvent.setup();
      render(<UnitDetailModal {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Edit Unit" }));

      const purchaserSelect = screen.getByDisplayValue("Private");
      await user.selectOptions(purchaserSelect, "Council");

      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(mockLogChange).toHaveBeenCalledWith(expect.objectContaining({
          changes: expect.arrayContaining([
            expect.objectContaining({
              field: "purchaserType",
              newValue: "Council",
            }),
          ]),
        }));
      });
    });

    it("changes Part V status", async () => {
      const user = userEvent.setup();
      render(<UnitDetailModal {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Edit Unit" }));

      const partVSelect = screen.getByDisplayValue("No");
      await user.selectOptions(partVSelect, "yes");

      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(mockLogChange).toHaveBeenCalledWith(expect.objectContaining({
          changes: expect.arrayContaining([
            expect.objectContaining({
              field: "partV",
              newValue: true,
            }),
          ]),
        }));
      });
    });

    it("changes purchaser name", async () => {
      const user = userEvent.setup();
      render(<UnitDetailModal {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Edit Unit" }));

      const nameInput = screen.getByPlaceholderText("Enter purchaser name");
      await user.type(nameInput, "John Smith");

      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(mockLogChange).toHaveBeenCalledWith(expect.objectContaining({
          changes: expect.arrayContaining([
            expect.objectContaining({
              field: "purchaserName",
              newValue: "John Smith",
            }),
          ]),
        }));
      });
    });
  });

  describe("documentation editing", () => {
    it("shows date inputs in edit mode", async () => {
      const user = userEvent.setup();
      render(<UnitDetailModal {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Edit Unit" }));

      // Should have date inputs for documentation items
      const dateInputs = document.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBeGreaterThan(0);
    });

    it("can set documentation date", async () => {
      const user = userEvent.setup();
      render(<UnitDetailModal {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Edit Unit" }));

      // Find the first date input and set a value
      const dateInputs = document.querySelectorAll('input[type="date"]');
      const firstDateInput = dateInputs[0] as HTMLInputElement;

      await user.type(firstDateInput, "2024-02-15");

      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(mockLogChange).toHaveBeenCalled();
      });
    });
  });

  describe("incentive scheme functionality", () => {
    it("displays scheme selector in edit mode", async () => {
      const user = userEvent.setup();
      mockGetActiveSchemes.mockResolvedValue(mockIncentiveSchemes);
      render(<UnitDetailModal {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Edit Unit" }));

      await waitFor(() => {
        // There should be multiple select elements in edit mode
        const selects = screen.getAllByRole("combobox");
        expect(selects.length).toBeGreaterThan(0);
      });
    });

    it("displays scheme benefits when scheme is applied", async () => {
      mockGetActiveSchemes.mockResolvedValue(mockIncentiveSchemes);
      const unitWithIncentive = createMockUnit({
        appliedIncentive: "scheme-1",
        incentiveStatus: "eligible",
      });

      render(<UnitDetailModal {...defaultProps} unit={unitWithIncentive} />);

      await waitFor(() => {
        expect(screen.getByText("First Time Buyer")).toBeInTheDocument();
      });
    });

    it("displays eligibility requirements", async () => {
      mockGetActiveSchemes.mockResolvedValue(mockIncentiveSchemes);
      const unitWithIncentive = createMockUnit({
        appliedIncentive: "scheme-1",
        incentiveStatus: "eligible",
      });

      render(<UnitDetailModal {...defaultProps} unit={unitWithIncentive} />);

      await waitFor(() => {
        expect(screen.getByText("Requirements")).toBeInTheDocument();
      });
    });

    it("shows incentive status badge", async () => {
      mockGetActiveSchemes.mockResolvedValue(mockIncentiveSchemes);
      const unitWithIncentive = createMockUnit({
        appliedIncentive: "scheme-1",
        incentiveStatus: "claimed",
      });

      render(<UnitDetailModal {...defaultProps} unit={unitWithIncentive} />);

      await waitFor(() => {
        expect(screen.getByText("claimed")).toBeInTheDocument();
      });
    });

    it("allows changing incentive status in edit mode", async () => {
      const user = userEvent.setup();
      mockGetActiveSchemes.mockResolvedValue(mockIncentiveSchemes);
      const unitWithIncentive = createMockUnit({
        appliedIncentive: "scheme-1",
        incentiveStatus: "eligible",
      });

      render(<UnitDetailModal {...defaultProps} unit={unitWithIncentive} />);

      await user.click(screen.getByRole("button", { name: "Edit Unit" }));

      await waitFor(() => {
        const statusSelect = screen.getByDisplayValue("Eligible");
        expect(statusSelect).toBeInTheDocument();
      });
    });
  });

  describe("date editing", () => {
    it("shows date inputs for key dates in edit mode", async () => {
      const user = userEvent.setup();
      render(<UnitDetailModal {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Edit Unit" }));

      // Should have date inputs
      const dateInputs = document.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBeGreaterThan(0);
    });

    it("saves date changes", async () => {
      const user = userEvent.setup();
      render(<UnitDetailModal {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Edit Unit" }));

      // Find Start Date section and its date input
      const dateInputs = document.querySelectorAll('input[type="date"]');
      const startDateInput = dateInputs[0] as HTMLInputElement;

      await user.type(startDateInput, "2024-03-15");

      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(mockLogChange).toHaveBeenCalled();
      });
    });
  });

  describe("notes subscription error handling", () => {
    it("handles notes subscription error", async () => {
      render(<UnitDetailModal {...defaultProps} />);

      // Trigger the error callback
      if (mockNotesErrorCallback) {
        mockNotesErrorCallback(new Error("Subscription failed"));
      }

      await waitFor(() => {
        expect(screen.getByText("Error loading notes. Check console for details.")).toBeInTheDocument();
      });
    });
  });

  describe("modal interaction", () => {
    it("stops propagation when clicking inside modal", async () => {
      const user = userEvent.setup();
      render(<UnitDetailModal {...defaultProps} />);

      // Click inside the modal content
      const modalContent = screen.getByText("Unit Details").closest("section");
      if (modalContent) {
        await user.click(modalContent);
      }

      // onClose should not be called
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe("purchaser contact links", () => {
    it("renders phone link when phone is available", () => {
      const unit = createMockUnit({ purchaserPhone: "0871234567" });
      render(<UnitDetailModal {...defaultProps} unit={unit} />);

      const phoneLink = screen.getByRole("link", { name: "0871234567" });
      expect(phoneLink).toHaveAttribute("href", "tel:0871234567");
    });

    it("renders email link when email is available", () => {
      const unit = createMockUnit({ purchaserEmail: "buyer@test.com" });
      render(<UnitDetailModal {...defaultProps} unit={unit} />);

      const emailLink = screen.getByRole("link", { name: "buyer@test.com" });
      expect(emailLink).toHaveAttribute("href", "mailto:buyer@test.com");
    });
  });

  describe("documentation dates display", () => {
    it("displays documentation dates when completed", () => {
      const unit = createMockUnit({
        documentation: {
          bcmsApprovedDate: "2024-02-15",
        },
      });

      render(<UnitDetailModal {...defaultProps} unit={unit} />);

      expect(screen.getByText("15 Feb 2024")).toBeInTheDocument();
    });
  });
});
