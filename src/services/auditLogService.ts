/**
 * Audit Log Service - Cosmos DB Implementation
 *
 * Handles audit logging with pagination via continuation tokens
 */

import { containers } from "../config/cosmos";
import {
  queryAll,
  queryWithPagination,
  createItem,
  generateId,
} from "./azure/cosmosHelpers";
import type { AuditLogEntry, AuditLogFilters, AuditChange, AuditAction, EntityType } from "../types/auditLog";

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
  const id = generateId();
  const auditLog = {
    id,
    ...params,
    timestamp: new Date().toISOString(),
  };

  await createItem(containers.auditLogs, auditLog);
  return id;
}

export interface GetAuditLogsResult {
  entries: AuditLogEntry[];
  continuationToken?: string;
  hasMore: boolean;
}

export async function getAuditLogs(
  filters: AuditLogFilters = {},
  pageSize: number = 50,
  continuationToken?: string
): Promise<GetAuditLogsResult> {
  const conditions: string[] = [];
  const parameters: Array<{ name: string; value: any }> = [];

  // Add filters
  if (filters.startDate) {
    conditions.push('c.timestamp >= @startDate');
    parameters.push({ name: '@startDate', value: filters.startDate.toISOString() });
  }
  if (filters.endDate) {
    // Add 1 day to include the end date fully
    const endOfDay = new Date(filters.endDate);
    endOfDay.setHours(23, 59, 59, 999);
    conditions.push('c.timestamp <= @endDate');
    parameters.push({ name: '@endDate', value: endOfDay.toISOString() });
  }
  if (filters.userId) {
    conditions.push('c.userId = @userId');
    parameters.push({ name: '@userId', value: filters.userId });
  }
  if (filters.developmentId) {
    conditions.push('c.developmentId = @developmentId');
    parameters.push({ name: '@developmentId', value: filters.developmentId });
  }
  if (filters.action) {
    conditions.push('c.action = @action');
    parameters.push({ name: '@action', value: filters.action });
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sqlQuery = `SELECT * FROM c ${whereClause} ORDER BY c.timestamp DESC`;

  const result = await queryWithPagination<any>(
    containers.auditLogs,
    sqlQuery,
    parameters,
    pageSize,
    continuationToken
  );

  const entries = result.items.map((data) => ({
    id: data.id,
    timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
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
  }));

  return {
    entries,
    continuationToken: result.continuationToken,
    hasMore: result.hasMore,
  };
}

export async function getAllUsers(): Promise<{ id: string; email: string; name: string }[]> {
  const logs = await queryAll<any>(
    containers.auditLogs,
    'SELECT * FROM c ORDER BY c.timestamp DESC'
  );

  const usersMap = new Map<string, { id: string; email: string; name: string }>();
  logs.forEach((log) => {
    if (log.userId && !usersMap.has(log.userId)) {
      usersMap.set(log.userId, {
        id: log.userId,
        email: log.userEmail || "",
        name: log.userName || "",
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
