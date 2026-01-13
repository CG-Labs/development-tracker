/**
 * Company Service - Cosmos DB Implementation
 *
 * Handles development company management
 */

import { containers } from "../config/cosmos";
import {
  queryAll,
  getItemById,
  createItem,
  replaceItem,
  deleteItem,
  generateId,
} from "./azure/cosmosHelpers";
import type { DevelopmentCompany, CreateCompanyInput } from "../types/company";

// Convert Cosmos document to DevelopmentCompany
function docToCompany(data: any): DevelopmentCompany {
  return {
    id: data.id,
    name: data.name as string,
    registeredAddress: data.registeredAddress as DevelopmentCompany["registeredAddress"],
    companyNumber: data.companyNumber as string,
    active: data.active as boolean,
    createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
    createdBy: data.createdBy as string,
  };
}

// Get all companies
export async function getCompanies(): Promise<DevelopmentCompany[]> {
  const companies = await queryAll<any>(
    containers.developmentCompanies,
    'SELECT * FROM c ORDER BY c.name ASC'
  );

  return companies.map(docToCompany);
}

// Get active companies only
export async function getActiveCompanies(): Promise<DevelopmentCompany[]> {
  const companies = await queryAll<any>(
    containers.developmentCompanies,
    'SELECT * FROM c WHERE c.active = true ORDER BY c.name ASC'
  );

  return companies.map(docToCompany);
}

// Get a single company by ID
export async function getCompany(id: string): Promise<DevelopmentCompany | null> {
  const company = await getItemById<any>(containers.developmentCompanies, id, id);

  if (!company) {
    return null;
  }

  return docToCompany(company);
}

// Create a new company
export async function createCompany(
  input: CreateCompanyInput,
  userId: string
): Promise<DevelopmentCompany> {
  const id = generateId();

  const companyData = {
    id,
    name: input.name,
    registeredAddress: input.registeredAddress,
    companyNumber: input.companyNumber,
    active: input.active,
    createdAt: new Date().toISOString(),
    createdBy: userId,
  };

  await createItem(containers.developmentCompanies, companyData);

  return {
    id,
    ...input,
    createdAt: new Date(),
    createdBy: userId,
  };
}

// Update an existing company
export async function updateCompany(
  id: string,
  updates: Partial<CreateCompanyInput>
): Promise<void> {
  const company = await getItemById<any>(containers.developmentCompanies, id, id);

  if (!company) {
    throw new Error("Company not found");
  }

  await replaceItem(containers.developmentCompanies, id, id, {
    ...company,
    ...updates,
  });
}

// Delete a company
export async function deleteCompany(id: string): Promise<void> {
  await deleteItem(containers.developmentCompanies, id, id);
}

// Toggle company active status
export async function toggleCompanyActive(
  id: string,
  active: boolean
): Promise<void> {
  const company = await getItemById<any>(containers.developmentCompanies, id, id);

  if (!company) {
    throw new Error("Company not found");
  }

  await replaceItem(containers.developmentCompanies, id, id, {
    ...company,
    active,
  });
}
