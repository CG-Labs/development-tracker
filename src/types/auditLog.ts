export type AuditAction = "create" | "update" | "delete" | "bulk_update" | "note_added" | "note_edited" | "note_deleted";
export type EntityType = "unit" | "development" | "note";

export interface AuditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
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

export interface AuditLogFilters {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  developmentId?: string;
  action?: AuditAction;
}
