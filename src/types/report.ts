// Report Generator Types

export type ReportCategory =
  | "executive"
  | "sales"
  | "construction"
  | "financial"
  | "documentation"
  | "forecasting"
  | "comparison"
  | "custom";

export type ReportFormat = "pdf" | "excel" | "word" | "screen";

export type ChartType = "bar" | "line" | "pie" | "stacked" | "area" | "none";

export type TrafficLightStatus = "green" | "amber" | "red" | "grey";

export interface ReportFilter {
  developments?: string[];
  salesStatus?: string[];
  constructionStatus?: string[];
  unitTypes?: string[];
  purchaserTypes?: string[];
  dateRange?: {
    field: string;
    from?: string;
    to?: string;
  };
  priceRange?: {
    min?: number;
    max?: number;
  };
  bedroomRange?: {
    min?: number;
    max?: number;
  };
  partV?: boolean;
  incentiveStatus?: string[];
  documentationStatus?: {
    field: keyof DocumentationFilterFields;
    completed: boolean;
  }[];
}

export interface DocumentationFilterFields {
  bcmsReceived: boolean;
  landRegistryApproved: boolean;
  homebondReceived: boolean;
  sanApproved: boolean;
  contractIssued: boolean;
  contractSigned: boolean;
  saleClosed: boolean;
}

export interface ReportColumn {
  id: string;
  label: string;
  field: string;
  width?: number;
  format?: "text" | "number" | "currency" | "date" | "percentage" | "boolean" | "status";
  aggregation?: "sum" | "avg" | "count" | "min" | "max";
  sortable?: boolean;
  trafficLight?: TrafficLightConfig;
}

export interface TrafficLightConfig {
  type: "date" | "value" | "status";
  greenCondition?: string;
  amberCondition?: string;
  redCondition?: string;
}

export interface ReportSection {
  id: string;
  type: "summary" | "table" | "chart" | "text" | "metrics" | "header";
  title?: string;
  columns?: ReportColumn[];
  chartConfig?: ChartConfig;
  metrics?: MetricConfig[];
  content?: string;
  groupBy?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ChartConfig {
  type: ChartType;
  xAxis: string;
  yAxis: string[];
  stacked?: boolean;
  showLegend?: boolean;
  showValues?: boolean;
  colors?: string[];
}

export interface MetricConfig {
  id: string;
  label: string;
  field: string;
  calculation: "count" | "sum" | "avg" | "percentage";
  format: "number" | "currency" | "percentage";
  compareField?: string;
  trafficLight?: TrafficLightConfig;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  icon: string;
  sections: ReportSection[];
  defaultFilters?: ReportFilter;
  defaultFormat: ReportFormat;
  availableFormats: ReportFormat[];
  requiredFields?: string[];
  tags?: string[];
}

export interface SavedReport {
  id: string;
  templateId: string;
  name: string;
  description?: string;
  filters: ReportFilter;
  customSections?: ReportSection[];
  createdBy: string;
  createdAt: Date;
  lastRun?: Date;
  schedule?: ReportSchedule;
}

export interface ReportSchedule {
  frequency: "daily" | "weekly" | "monthly";
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  recipients: string[];
  format: ReportFormat;
  active: boolean;
}

export interface ReportResult {
  template: ReportTemplate;
  filters: ReportFilter;
  generatedAt: Date;
  data: ReportData;
}

export interface ReportData {
  summary?: Record<string, number | string>;
  rows: Record<string, unknown>[];
  totals?: Record<string, number>;
  charts?: ChartData[];
  metadata?: {
    totalRecords: number;
    filteredRecords: number;
    generationTime: number;
  };
}

export interface ChartData {
  id: string;
  type: ChartType;
  data: Array<{ name: string; [key: string]: string | number }>;
}

// Drag and drop builder types
export interface DragItem {
  id: string;
  type: "column" | "section" | "metric" | "chart";
  data: ReportColumn | ReportSection | MetricConfig | ChartConfig;
}

export interface BuilderState {
  selectedColumns: ReportColumn[];
  sections: ReportSection[];
  filters: ReportFilter;
  groupBy?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Available fields for report building
export interface AvailableField {
  id: string;
  label: string;
  category: "unit" | "development" | "purchaser" | "documentation" | "financial" | "dates";
  type: "text" | "number" | "currency" | "date" | "boolean" | "status";
  path: string;
}

export const AVAILABLE_FIELDS: AvailableField[] = [
  // Development fields
  { id: "developmentName", label: "Development Name", category: "development", type: "text", path: "developmentName" },
  { id: "projectNumber", label: "Project Number", category: "development", type: "text", path: "projectNumber" },

  // Unit fields
  { id: "unitNumber", label: "Unit Number", category: "unit", type: "text", path: "unitNumber" },
  { id: "type", label: "Unit Type", category: "unit", type: "text", path: "type" },
  { id: "bedrooms", label: "Bedrooms", category: "unit", type: "number", path: "bedrooms" },
  { id: "size", label: "Size (sq ft)", category: "unit", type: "number", path: "size" },
  { id: "constructionStatus", label: "Construction Status", category: "unit", type: "status", path: "constructionStatus" },
  { id: "salesStatus", label: "Sales Status", category: "unit", type: "status", path: "salesStatus" },
  { id: "partV", label: "Part V", category: "unit", type: "boolean", path: "partV" },
  { id: "buyerType", label: "Buyer Type", category: "unit", type: "text", path: "buyerType" },

  // Financial fields
  { id: "listPrice", label: "List Price", category: "financial", type: "currency", path: "listPrice" },
  { id: "soldPrice", label: "Sold Price", category: "financial", type: "currency", path: "soldPrice" },
  { id: "priceExVat", label: "Price (Ex VAT)", category: "financial", type: "currency", path: "priceExVat" },
  { id: "priceIncVat", label: "Price (Inc VAT)", category: "financial", type: "currency", path: "priceIncVat" },

  // Date fields
  { id: "startDate", label: "Start Date", category: "dates", type: "date", path: "startDate" },
  { id: "completionDate", label: "Completion Date", category: "dates", type: "date", path: "completionDate" },
  { id: "snagDate", label: "Snag Date", category: "dates", type: "date", path: "snagDate" },
  { id: "desnagDate", label: "De-snag Date", category: "dates", type: "date", path: "desnagDate" },
  { id: "closeDate", label: "Close Date", category: "dates", type: "date", path: "closeDate" },
  { id: "plannedCloseDate", label: "Planned Close Date", category: "dates", type: "date", path: "plannedCloseDate" },

  // Purchaser fields
  { id: "purchaserName", label: "Purchaser Name", category: "purchaser", type: "text", path: "purchaserName" },
  { id: "purchaserType", label: "Purchaser Type", category: "purchaser", type: "text", path: "purchaserType" },
  { id: "purchaserEmail", label: "Purchaser Email", category: "purchaser", type: "text", path: "purchaserEmail" },
  { id: "purchaserPhone", label: "Purchaser Phone", category: "purchaser", type: "text", path: "purchaserPhone" },
  { id: "address", label: "Address", category: "purchaser", type: "text", path: "address" },

  // Documentation fields
  { id: "bcmsReceived", label: "BCMS Received", category: "documentation", type: "boolean", path: "documentation.bcmsReceived" },
  { id: "bcmsReceivedDate", label: "BCMS Received Date", category: "documentation", type: "date", path: "documentation.bcmsReceivedDate" },
  { id: "landRegistryApproved", label: "Land Registry Approved", category: "documentation", type: "boolean", path: "documentation.landRegistryApproved" },
  { id: "homebondReceived", label: "Homebond Received", category: "documentation", type: "boolean", path: "documentation.homebondReceived" },
  { id: "sanApproved", label: "SAN Approved", category: "documentation", type: "boolean", path: "documentation.sanApproved" },
  { id: "contractIssued", label: "Contract Issued", category: "documentation", type: "boolean", path: "documentation.contractIssued" },
  { id: "contractSigned", label: "Contract Signed", category: "documentation", type: "boolean", path: "documentation.contractSigned" },
  { id: "saleClosed", label: "Sale Closed", category: "documentation", type: "boolean", path: "documentation.saleClosed" },

  // Incentive fields
  { id: "appliedIncentive", label: "Applied Incentive", category: "financial", type: "text", path: "appliedIncentive" },
  { id: "incentiveStatus", label: "Incentive Status", category: "financial", type: "status", path: "incentiveStatus" },
];
