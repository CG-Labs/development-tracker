export type ConstructionStatus = "Not Started" | "In Progress" | "Complete";

export type SalesStatus = "Not Released" | "For Sale" | "Under Offer" | "Contracted" | "Complete";

export type UnitType = "House-Semi" | "House-Detached" | "House-Terrace" | "Apartment" | "Duplex Apartment" | "Apartment Studio";

export interface DocumentationChecklist {
  contractSigned: boolean;
  loanApproved: boolean;
  bcmsSubmitted: boolean;
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
