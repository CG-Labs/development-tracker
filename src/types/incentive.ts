export interface IncentiveBenefit {
  type: string; // "White Goods Voucher", "Flooring Voucher", "Cash Back", etc.
  value: number; // e.g., 5000
  currency: string; // "GBP" or "EUR"
}

export type IncentiveRequirementType =
  | "contract_signed_days"
  | "sale_closed_days"
  | "bcms_days"
  | "custom";

export interface IncentiveRequirement {
  description: string;
  type: IncentiveRequirementType;
  value?: number; // e.g., 21 for "within 21 days"
  reference?: string; // e.g., "contract_issue" or "bcms_date"
}

export interface IncentiveScheme {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  benefits: IncentiveBenefit[];
  requirements: IncentiveRequirement[];
  validFrom?: Date;
  validTo?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
}

export type IncentiveStatus = "eligible" | "applied" | "claimed" | "expired";

export interface IncentiveSchemeFormData {
  name: string;
  description?: string;
  active: boolean;
  benefits: IncentiveBenefit[];
  requirements: IncentiveRequirement[];
  validFrom?: string;
  validTo?: string;
}
