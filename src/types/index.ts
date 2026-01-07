export type ConstructionStatus = "Not Started" | "In Progress" | "Complete";

export type SalesStatus = "Not Released" | "For Sale" | "Under Offer" | "Contracted" | "Complete";

export type DevelopmentStatus = "Active" | "Completed" | "Archived";

export type UnitType = "House-Semi" | "House-Detached" | "House-Terrace" | "Apartment" | "Duplex Apartment" | "Apartment Studio";

export type PurchaserType = "Private" | "Council" | "AHB" | "Other";

export type BedroomType = "Studio" | "1 Bed" | "2 Bed" | "3 Bed" | "4 Bed" | "5 Bed" | "6 Bed" | "7 Bed";

export interface DocumentationChecklist {
  // Completion Documentation (Yes/No derived from date)
  bcmsSubmitDate?: string;
  bcmsApprovedDate?: string;
  homebondSubmitDate?: string;
  homebondApprovedDate?: string;
  berApprovedDate?: string;
  fcComplianceReceivedDate?: string;

  // Sales Documentation (Yes/No derived from date)
  sanApprovedDate?: string;
  contractIssuedDate?: string;
  contractSignedDate?: string;
  saleClosedDate?: string;

  // Legacy boolean fields (kept for backwards compatibility during migration)
  bcmsReceived?: boolean;
  bcmsReceivedDate?: string;
  plannedBcmsDate?: string;
  landRegistryApproved?: boolean;
  landRegistryApprovedDate?: string;
  homebondReceived?: boolean;
  homebondReceivedDate?: string;
  sanApproved?: boolean;
  contractIssued?: boolean;
  contractSigned?: boolean;
  saleClosed?: boolean;
}

export interface UnitDates {
  plannedBcms?: string;
  actualBcms?: string;
  plannedClose?: string;
  actualClose?: string;
}

export type IncentiveStatus = "eligible" | "applied" | "claimed" | "expired";

export interface Unit {
  unitNumber: string;
  type: UnitType;
  bedrooms: number | string; // Can be number or string like "Studio", "1 Bed", etc.
  constructionStatus: ConstructionStatus;
  salesStatus: SalesStatus;
  listPrice: number;
  soldPrice?: number;
  documentation: DocumentationChecklist;
  // Key Dates (simplified)
  keyDates?: UnitDates;
  // Legacy date fields (kept for backwards compatibility)
  startDate?: string;
  completionDate?: string;
  snagDate?: string;
  closeDate?: string;
  desnagDate?: string;
  plannedCloseDate?: string;
  // Additional fields from Excel
  partV?: boolean;
  buyerType?: string;
  occupancy?: string;
  size?: number; // Area in m²
  priceExVat?: number;
  priceIncVat?: number;
  // Purchaser information
  address?: string;
  purchaserType?: PurchaserType;
  purchaserName?: string;
  purchaserPhone?: string;
  purchaserEmail?: string;
  // Incentive information
  appliedIncentive?: string; // scheme ID
  incentiveStatus?: IncentiveStatus;
  // Developer and construction details
  developerCompanyId?: string;
  constructionUnitType?: string;
  constructionPhase?: string;
}

export type Currency = "GBP" | "EUR";

export interface VatRates {
  "House-Semi": number;
  "House-Detached": number;
  "House-Terrace": number;
  "Apartment": number;
  "Duplex Apartment": number;
  "Apartment Studio": number;
  [key: string]: number;
}

export const DEFAULT_VAT_RATES: VatRates = {
  "House-Semi": 13.5,
  "House-Detached": 13.5,
  "House-Terrace": 13.5,
  "Apartment": 13.5,
  "Duplex Apartment": 13.5,
  "Apartment Studio": 13.5,
};

export interface Development {
  id: string;
  name: string;
  projectNumber: string;
  totalUnits: number;
  units: Unit[];
  status: DevelopmentStatus;
  description?: string;
  currency?: Currency;
  vatRates?: VatRates;
}

export interface PortfolioStats {
  totalDevelopments: number;
  totalUnits: number;
  notReleased: number;
  forSale: number;
  underOffer: number;
  contracted: number;
  complete: number;
}
