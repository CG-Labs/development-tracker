export type ConstructionStatus = "Not Started" | "In Progress" | "Complete";

export type SalesStatus = "Not Released" | "For Sale" | "Under Offer" | "Contracted" | "Complete";

export type UnitType = "House-Semi" | "House-Detached" | "House-Terrace" | "Apartment" | "Duplex Apartment" | "Apartment Studio";

export interface DocumentationChecklist {
  // Completion Documentation
  bcmsReceived: boolean;
  bcmsReceivedDate?: string;
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
}

export interface Development {
  id: string;
  name: string;
  projectNumber: string;
  totalUnits: number;
  units: Unit[];
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
