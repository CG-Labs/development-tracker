import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock file-saver to prevent actual file downloads
vi.mock("file-saver", () => ({
  saveAs: vi.fn(),
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

describe("Excel Export Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export development units to Excel without errors", async () => {
    const { exportUnitsToExcel } = await import("./excelExportService");
    const { saveAs } = await import("file-saver");

    // Should not throw
    await expect(exportUnitsToExcel("test-dev-1")).resolves.not.toThrow();

    // Verify saveAs was called
    expect(saveAs).toHaveBeenCalledTimes(1);
  });

  it("should create blob with correct MIME type", async () => {
    const { exportUnitsToExcel } = await import("./excelExportService");
    const { saveAs } = await import("file-saver");

    await exportUnitsToExcel("test-dev-1");

    const call = vi.mocked(saveAs).mock.calls[0];
    const blob = call[0] as Blob;

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  });

  it("should use correct filename format for single development", async () => {
    const { exportUnitsToExcel } = await import("./excelExportService");
    const { saveAs } = await import("file-saver");

    await exportUnitsToExcel("test-dev-1");

    const filename = vi.mocked(saveAs).mock.calls[0][1] as string;
    expect(filename).toMatch(/Test_Development_Export_\d{4}-\d{2}-\d{2}\.xlsx/);
  });

  it("should use correct filename format when exporting all developments", async () => {
    const { exportUnitsToExcel } = await import("./excelExportService");
    const { saveAs } = await import("file-saver");

    await exportUnitsToExcel(); // No ID = export all

    const filename = vi.mocked(saveAs).mock.calls[0][1] as string;
    expect(filename).toMatch(/Units_Export_\d{4}-\d{2}-\d{2}\.xlsx/);
  });

  it("should throw error for non-existent development", async () => {
    const { exportUnitsToExcel } = await import("./excelExportService");

    await expect(exportUnitsToExcel("non-existent-id")).rejects.toThrow(
      "Development with ID non-existent-id not found"
    );
  });

  it("should create non-empty blob (Excel file has content)", async () => {
    const { exportUnitsToExcel } = await import("./excelExportService");
    const { saveAs } = await import("file-saver");

    await exportUnitsToExcel("test-dev-1");

    const blob = vi.mocked(saveAs).mock.calls[0][0] as Blob;
    // Excel files with content should be at least a few KB
    expect(blob.size).toBeGreaterThan(1000);
  });

  it("should return correct export columns", async () => {
    const { getExportColumns } = await import("./excelExportService");

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
