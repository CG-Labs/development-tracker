import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { DevelopmentCompany, CreateCompanyInput } from "../types/company";

const COLLECTION_NAME = "developmentCompanies";

// Convert Firestore document to DevelopmentCompany
function docToCompany(
  docId: string,
  data: Record<string, unknown>
): DevelopmentCompany {
  return {
    id: docId,
    name: data.name as string,
    registeredAddress: data.registeredAddress as DevelopmentCompany["registeredAddress"],
    companyNumber: data.companyNumber as string,
    active: data.active as boolean,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : new Date(data.createdAt as string),
    createdBy: data.createdBy as string,
  };
}

// Get all companies
export async function getCompanies(): Promise<DevelopmentCompany[]> {
  const companiesRef = collection(db, COLLECTION_NAME);
  const q = query(companiesRef, orderBy("name", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => docToCompany(doc.id, doc.data()));
}

// Get active companies only
export async function getActiveCompanies(): Promise<DevelopmentCompany[]> {
  const companies = await getCompanies();
  return companies.filter((c) => c.active);
}

// Get a single company by ID
export async function getCompany(id: string): Promise<DevelopmentCompany | null> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return docToCompany(docSnap.id, docSnap.data());
}

// Create a new company
export async function createCompany(
  input: CreateCompanyInput,
  userId: string
): Promise<DevelopmentCompany> {
  const companiesRef = collection(db, COLLECTION_NAME);

  const docData = {
    name: input.name,
    registeredAddress: input.registeredAddress,
    companyNumber: input.companyNumber,
    active: input.active,
    createdAt: Timestamp.now(),
    createdBy: userId,
  };

  const docRef = await addDoc(companiesRef, docData);

  return {
    id: docRef.id,
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
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, updates);
}

// Delete a company
export async function deleteCompany(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

// Toggle company active status
export async function toggleCompanyActive(
  id: string,
  active: boolean
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, { active });
}
