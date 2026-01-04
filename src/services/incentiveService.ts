import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { IncentiveScheme, IncentiveSchemeFormData } from "../types/incentive";
import type { Unit } from "../types";

const COLLECTION_NAME = "incentiveSchemes";

function timestampToDate(timestamp: Timestamp | Date | undefined): Date | undefined {
  if (!timestamp) return undefined;
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  return timestamp;
}

function schemeFromFirestore(doc: { id: string; data: () => Record<string, unknown> }): IncentiveScheme {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name as string,
    description: data.description as string | undefined,
    active: data.active as boolean,
    benefits: data.benefits as IncentiveScheme["benefits"],
    requirements: data.requirements as IncentiveScheme["requirements"],
    validFrom: timestampToDate(data.validFrom as Timestamp | undefined),
    validTo: timestampToDate(data.validTo as Timestamp | undefined),
    createdBy: data.createdBy as string,
    createdAt: timestampToDate(data.createdAt as Timestamp) || new Date(),
    updatedAt: timestampToDate(data.updatedAt as Timestamp | undefined),
  };
}

export async function createIncentiveScheme(
  scheme: IncentiveSchemeFormData,
  userId: string
): Promise<string> {
  const docData = {
    ...scheme,
    validFrom: scheme.validFrom ? Timestamp.fromDate(new Date(scheme.validFrom)) : null,
    validTo: scheme.validTo ? Timestamp.fromDate(new Date(scheme.validTo)) : null,
    createdBy: userId,
    createdAt: Timestamp.now(),
  };

  const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);
  return docRef.id;
}

export async function getIncentiveSchemes(): Promise<IncentiveScheme[]> {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => schemeFromFirestore({ id: doc.id, data: () => doc.data() }));
}

export async function getActiveSchemes(): Promise<IncentiveScheme[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("active", "==", true),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => schemeFromFirestore({ id: doc.id, data: () => doc.data() }));
}

export async function getIncentiveScheme(id: string): Promise<IncentiveScheme | null> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return schemeFromFirestore({ id: docSnap.id, data: () => docSnap.data() });
}

export async function updateIncentiveScheme(
  id: string,
  updates: Partial<IncentiveSchemeFormData>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const updateData: Record<string, unknown> = {
    ...updates,
    updatedAt: Timestamp.now(),
  };

  if (updates.validFrom !== undefined) {
    updateData.validFrom = updates.validFrom
      ? Timestamp.fromDate(new Date(updates.validFrom))
      : null;
  }
  if (updates.validTo !== undefined) {
    updateData.validTo = updates.validTo
      ? Timestamp.fromDate(new Date(updates.validTo))
      : null;
  }

  await updateDoc(docRef, updateData);
}

export async function deleteIncentiveScheme(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  requirementsMet: { description: string; met: boolean; reason?: string }[];
}

export function checkUnitEligibility(
  unit: Unit,
  scheme: IncentiveScheme
): EligibilityResult {
  const requirementsMet: EligibilityResult["requirementsMet"] = [];

  for (const req of scheme.requirements) {
    let met = false;
    let reason = "";

    switch (req.type) {
      case "contract_signed_days": {
        if (!unit.documentation.contractIssuedDate || !unit.documentation.contractSignedDate) {
          reason = "Contract dates not available";
        } else {
          const issuedDate = new Date(unit.documentation.contractIssuedDate);
          const signedDate = new Date(unit.documentation.contractSignedDate);
          const daysDiff = Math.floor(
            (signedDate.getTime() - issuedDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (req.value && daysDiff <= req.value) {
            met = true;
          } else {
            reason = `Contract signed ${daysDiff} days after issue (max ${req.value} days)`;
          }
        }
        break;
      }
      case "sale_closed_days": {
        const refDate = req.reference === "bcms_date"
          ? unit.documentation.bcmsReceivedDate
          : unit.documentation.contractIssuedDate;

        if (!refDate || !unit.documentation.saleClosedDate) {
          reason = "Required dates not available";
        } else {
          const startDate = new Date(refDate);
          const closeDate = new Date(unit.documentation.saleClosedDate);
          const daysDiff = Math.floor(
            (closeDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (req.value && daysDiff <= req.value) {
            met = true;
          } else {
            reason = `Sale closed ${daysDiff} days after reference (max ${req.value} days)`;
          }
        }
        break;
      }
      case "bcms_days": {
        if (!unit.documentation.bcmsReceivedDate) {
          reason = "BCMS date not available";
        } else {
          // Check if BCMS received within X days of planned date
          const plannedDate = unit.documentation.plannedBcmsDate;
          if (!plannedDate) {
            reason = "Planned BCMS date not set";
          } else {
            const planned = new Date(plannedDate);
            const received = new Date(unit.documentation.bcmsReceivedDate);
            const daysDiff = Math.floor(
              (received.getTime() - planned.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (req.value && daysDiff <= req.value) {
              met = true;
            } else {
              reason = `BCMS received ${daysDiff} days after planned (max ${req.value} days)`;
            }
          }
        }
        break;
      }
      case "custom":
        // Custom requirements need manual verification
        met = false;
        reason = "Manual verification required";
        break;
    }

    requirementsMet.push({
      description: req.description,
      met,
      reason: met ? undefined : reason,
    });
  }

  const allMet = requirementsMet.every((r) => r.met);
  const failedReqs = requirementsMet.filter((r) => !r.met);

  return {
    eligible: allMet,
    reason: allMet ? undefined : failedReqs.map((r) => r.reason).join("; "),
    requirementsMet,
  };
}

export function calculateTotalBenefitValue(scheme: IncentiveScheme): number {
  return scheme.benefits.reduce((sum, b) => sum + b.value, 0);
}

export function formatBenefitValue(value: number, currency: string): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
