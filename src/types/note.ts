export interface Note {
  id: string;
  unitId: string;
  developmentId: string;
  userId: string;
  userEmail: string;
  userName?: string;
  content: string;
  timestamp: Date;
  edited?: boolean;
  editedAt?: Date;
}

export interface NoteInput {
  unitId: string;
  developmentId: string;
  content: string;
}
