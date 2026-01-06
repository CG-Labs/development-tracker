export interface DevelopmentCompany {
  id: string;
  name: string;
  registeredAddress: {
    line1: string;
    line2?: string;
    city: string;
    county?: string;
    postcode: string;
    country: string;
  };
  companyNumber: string;
  active: boolean;
  createdAt: Date;
  createdBy: string;
}

export interface CreateCompanyInput {
  name: string;
  registeredAddress: {
    line1: string;
    line2?: string;
    city: string;
    county?: string;
    postcode: string;
    country: string;
  };
  companyNumber: string;
  active: boolean;
}
