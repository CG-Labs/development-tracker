export type ConstructionStatus = "Not Started" | "In Progress" | "Complete";

export type SalesStatus = "Not Released" | "For Sale" | "Under Offer" | "Contracted" | "Complete";

export type DevelopmentStatus = "Active" | "Completed" | "Archived";

export type UnitType = "House-Semi" | "House-Detached" | "House-Terrace" | "Apartment" | "Duplex Apartment" | "Apartment Studio";

export type PurchaserType = "Private" | "Council" | "AHB" | "Other";

export interface DocumentationChecklist {
  // Completion Documentation
  bcmsReceived: boolean;
  bcmsReceivedDate?: string;
  plannedBcmsDate?: string;
  landRegistryApproved: boolean;
  landRegistryApprovedDate?: string;
  homebondReceived: boolean;
  homebondReceivedDate?: string;

  // Sales Documentation
  sanApproved: boolean;
  sanApprovedDate?: string;
  contractIssued: boolean;
  contractIssuedDate?: string;
  contractSigned: boolean;
  contractSignedDate?: string;
  saleClosed: boolean;
  saleClosedDate?: string;
}

export type IncentiveStatus = "eligible" | "applied" | "claimed" | "expired";

export interface Unit {
  unitNumber: string;
  type: UnitType;
  bedrooms: number;
  constructionStatus: ConstructionStatus;
  salesStatus: SalesStatus;
  startDate?: string;
  completionDate?: string;
  listPrice: number;
  soldPrice?: number;
  snagDate?: string;
  closeDate?: string;
  documentation: DocumentationChecklist;
  // Additional fields from Excel
  partV?: boolean;
  buyerType?: string;
  occupancy?: string;
  size?: number;
  priceExVat?: number;
  priceIncVat?: number;
  desnagDate?: string;
  plannedCloseDate?: string;
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

export interface Development {
  id: string;
  name: string;
  projectNumber: string;
  totalUnits: number;
  units: Unit[];
  status: DevelopmentStatus;
  description?: string;
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
