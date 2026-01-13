import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  limit,
  startAfter,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { AuditLogEntry, AuditLogFilters, AuditChange, AuditAction, EntityType } from "../types/auditLog";

const AUDIT_LOGS_COLLECTION = "auditLogs";

interface LogChangeParams {
  userId: string;
  userEmail: string;
  userName: string;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  changes: AuditChange[];
  developmentId?: string;
  developmentName?: string;
  unitNumber?: string;
}

export async function logChange(params: LogChangeParams): Promise<string> {
  const docRef = await addDoc(collection(db, AUDIT_LOGS_COLLECTION), {
    ...params,
    timestamp: Timestamp.now(),
  });
  return docRef.id;
}

function docToAuditLogEntry(doc: QueryDocumentSnapshot<DocumentData>): AuditLogEntry {
  const data = doc.data();
  return {
    id: doc.id,
    timestamp: data.timestamp?.toDate() || new Date(),
    userId: data.userId || "",
    userEmail: data.userEmail || "",
    userName: data.userName || "",
    action: data.action || "update",
    entityType: data.entityType || "unit",
    entityId: data.entityId || "",
    changes: data.changes || [],
    developmentId: data.developmentId,
    developmentName: data.developmentName,
    unitNumber: data.unitNumber,
  };
}

export interface GetAuditLogsResult {
  entries: AuditLogEntry[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export async function getAuditLogs(
  filters: AuditLogFilters = {},
  pageSize: number = 50,
  lastDocument?: QueryDocumentSnapshot<DocumentData>
): Promise<GetAuditLogsResult> {
  const constraints = [];

  // Add filters
  if (filters.startDate) {
    constraints.push(where("timestamp", ">=", Timestamp.fromDate(filters.startDate)));
  }
  if (filters.endDate) {
    // Add 1 day to include the end date fully
    const endOfDay = new Date(filters.endDate);
    endOfDay.setHours(23, 59, 59, 999);
    constraints.push(where("timestamp", "<=", Timestamp.fromDate(endOfDay)));
  }
  if (filters.userId) {
    constraints.push(where("userId", "==", filters.userId));
  }
  if (filters.developmentId) {
    constraints.push(where("developmentId", "==", filters.developmentId));
  }
  if (filters.action) {
    constraints.push(where("action", "==", filters.action));
  }

  // Order by timestamp descending
  constraints.push(orderBy("timestamp", "desc"));

  // Pagination
  constraints.push(limit(pageSize + 1)); // Get one extra to check if there are more

  if (lastDocument) {
    constraints.push(startAfter(lastDocument));
  }

  const q = query(collection(db, AUDIT_LOGS_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  const docs = snapshot.docs;
  const hasMore = docs.length > pageSize;
  const entries = docs.slice(0, pageSize).map(docToAuditLogEntry);
  const lastDoc = docs.length > 0 ? docs[Math.min(docs.length - 1, pageSize - 1)] : null;

  return { entries, lastDoc, hasMore };
}

export async function getAllUsers(): Promise<{ id: string; email: string; name: string }[]> {
  const q = query(collection(db, AUDIT_LOGS_COLLECTION), orderBy("timestamp", "desc"));
  const snapshot = await getDocs(q);

  const usersMap = new Map<string, { id: string; email: string; name: string }>();
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.userId && !usersMap.has(data.userId)) {
      usersMap.set(data.userId, {
        id: data.userId,
        email: data.userEmail || "",
        name: data.userName || "",
      });
    }
  });

  return Array.from(usersMap.values());
}

export function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

export function exportToCSV(entries: AuditLogEntry[]): string {
  const headers = ["Date/Time", "User", "Action", "Entity Type", "Development", "Unit", "Field", "Old Value", "New Value"];
  const rows: string[][] = [];

  entries.forEach((entry) => {
    const baseRow = [
      entry.timestamp.toLocaleString("en-GB"),
      entry.userEmail,
      entry.action,
      entry.entityType,
      entry.developmentName || "",
      entry.unitNumber || "",
    ];

    if (entry.changes.length === 0) {
      rows.push([...baseRow, "-", "-", "-"]);
    } else {
      entry.changes.forEach((change) => {
        rows.push([
          ...baseRow,
          change.field,
          formatAuditValue(change.oldValue),
          formatAuditValue(change.newValue),
        ]);
      });
    }
  });

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  return csvContent;
}

export function downloadCSV(entries: AuditLogEntry[], filename: string = "audit-log.csv"): void {
  const csv = exportToCSV(entries);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
