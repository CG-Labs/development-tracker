import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

// Create a hoisted mock function that can be referenced in vi.mock
const { mockSaveAs } = vi.hoisted(() => ({
  mockSaveAs: vi.fn(),
}));

// Mock file-saver to prevent actual file downloads
vi.mock("file-saver", () => ({
  saveAs: mockSaveAs,
}));

// Mock the developments data
vi.mock("../data/realDevelopments", () => ({
  developments: [
    {
      id: "test-dev-1",
      name: "Test Development",
      projectNumber: "TD-001",
      totalUnits: 2,
      units: [
        {
          unitNumber: "1",
          type: "House-Semi",
          bedrooms: 3,
          constructionStatus: "Complete",
          salesStatus: "Complete",
          listPrice: 350000,
          soldPrice: 345000,
          address: "1 Test Street",
          purchaserType: "Private",
          partV: false,
          documentation: {
            bcmsApprovedDate: "2024-01-15",
            homebondApprovedDate: "2024-01-20",
            berApprovedDate: "2024-01-25",
            fcComplianceReceivedDate: "2024-02-01",
          },
          keyDates: {
            plannedBcms: "2024-01-10",
            plannedClose: "2024-02-15",
          },
        },
        {
          unitNumber: "2",
          type: "Apartment",
          bedrooms: 2,
          constructionStatus: "In Progress",
          salesStatus: "For Sale",
          listPrice: 275000,
          address: "2 Test Street",
          purchaserType: "Private",
          partV: false,
          documentation: {},
          keyDates: {},
        },
      ],
    },
  ],
}));

// Import the service after mocks are set up
import { exportUnitsToExcel, getExportColumns } from "./excelExportService";

describe("Excel Export Service", () => {
  beforeEach(() => {
    mockSaveAs.mockClear();
  });

  it("should export development units to Excel without errors", async () => {
    // Should not throw
    await expect(exportUnitsToExcel("test-dev-1")).resolves.not.toThrow();

    // Verify saveAs was called
    expect(mockSaveAs).toHaveBeenCalledTimes(1);
  }, 10000); // Increase timeout for ExcelJS operations

  it("should create blob with correct MIME type", async () => {
    await exportUnitsToExcel("test-dev-1");

    const call = (mockSaveAs as Mock).mock.calls[0];
    const blob = call[0] as Blob;

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  }, 10000);

  it("should use correct filename format for single development", async () => {
    await exportUnitsToExcel("test-dev-1");

    const filename = (mockSaveAs as Mock).mock.calls[0][1] as string;
    expect(filename).toMatch(/Test_Development_Export_\d{4}-\d{2}-\d{2}\.xlsx/);
  }, 10000);

  it("should use correct filename format when exporting all developments", async () => {
    await exportUnitsToExcel(); // No ID = export all

    const filename = (mockSaveAs as Mock).mock.calls[0][1] as string;
    expect(filename).toMatch(/Units_Export_\d{4}-\d{2}-\d{2}\.xlsx/);
  }, 10000);

  it("should throw error for non-existent development", async () => {
    await expect(exportUnitsToExcel("non-existent-id")).rejects.toThrow(
      "Development with ID non-existent-id not found"
    );
  });

  it("should create non-empty blob (Excel file has content)", async () => {
    await exportUnitsToExcel("test-dev-1");

    const blob = (mockSaveAs as Mock).mock.calls[0][0] as Blob;
    // Excel files with content should be at least a few KB
    expect(blob.size).toBeGreaterThan(1000);
  }, 10000);

  it("should return correct export columns", () => {
    const columns = getExportColumns();

    expect(columns).toContain("Development Name");
    expect(columns).toContain("Unit Number");
    expect(columns).toContain("Unit Type");
    expect(columns).toContain("Bedrooms");
    expect(columns).toContain("Sales Status");
    expect(columns).toContain("Construction Status");
    expect(columns).toContain("List Price");
    expect(columns.length).toBeGreaterThan(20);
  });
});
