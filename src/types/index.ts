export type ConstructionStatus = "Not Started" | "In Progress" | "Complete";

export type SalesStatus = "Available" | "Reserved" | "Sale Agreed" | "Sold";

export interface DocumentationChecklist {
  contractSigned: boolean;
  loanApproved: boolean;
  bcmsSubmitted: boolean;
}

export interface Unit {
  unitNumber: string;
  type: "Detached" | "Semi-Detached" | "Terraced" | "Apartment";
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
  sold: number;
  available: number;
  reserved: number;
  saleAgreed: number;
}
