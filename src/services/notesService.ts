/**
 * Notes Service - Cosmos DB Implementation
 *
 * Handles unit notes with real-time updates via change feed
 */

import { containers } from "../config/cosmos";
import {
  queryAll,
  createItem,
  replaceItem,
  deleteItem,
  generateId,
} from "./azure/cosmosHelpers";
import type { Note } from "../types/note";

interface AddNoteParams {
  unitId: string;
  developmentId: string;
  content: string;
  userId: string;
  userEmail: string;
  userName?: string;
}

export async function addNote(params: AddNoteParams): Promise<string> {
  const id = generateId();
  const note = {
    id,
    unitId: params.unitId,
    developmentId: params.developmentId,
    content: params.content,
    userId: params.userId,
    userEmail: params.userEmail,
    userName: params.userName || null,
    timestamp: new Date().toISOString(),
    edited: false,
  };

  await createItem(containers.notes, note);
  return id;
}

export async function getNotes(unitId: string): Promise<Note[]> {
  const notes = await queryAll<any>(
    containers.notes,
    'SELECT * FROM c WHERE c.unitId = @unitId ORDER BY c.timestamp DESC',
    [{ name: '@unitId', value: unitId }]
  );

  return notes.map((note) => ({
    id: note.id,
    unitId: note.unitId,
    developmentId: note.developmentId,
    userId: note.userId,
    userEmail: note.userEmail,
    userName: note.userName || undefined,
    content: note.content,
    timestamp: note.timestamp ? new Date(note.timestamp) : new Date(),
    edited: note.edited || false,
    editedAt: note.editedAt ? new Date(note.editedAt) : undefined,
  }));
}

/**
 * Subscribe to real-time notes updates using polling
 * Polls every 2 seconds for changes
 */
export function subscribeToNotes(
  unitId: string,
  callback: (notes: Note[]) => void,
  onError?: (error: Error) => void
): () => void {
  let active = true;
  let intervalId: ReturnType<typeof setInterval>;

  async function pollNotes() {
    try {
      const notes = await getNotes(unitId);
      if (active) {
        callback(notes);
      }
    } catch (error) {
      console.error("Error polling notes:", error);
      if (active) {
        onError?.(error as Error);
      }
    }
  }

  // Initial load
  pollNotes();

  // Set up polling interval (every 2 seconds)
  intervalId = setInterval(() => {
    if (active) {
      pollNotes();
    }
  }, 2000);

  // Return unsubscribe function
  return () => {
    active = false;
    clearInterval(intervalId);
  };
}

export async function updateNote(noteId: string, content: string): Promise<void> {
  // Find the note to get the partition key (unitId)
  const allNotes = await queryAll<any>(
    containers.notes,
    'SELECT * FROM c WHERE c.id = @id',
    [{ name: '@id', value: noteId }]
  );

  if (allNotes.length === 0) {
    throw new Error("Note not found");
  }

  const note = allNotes[0];
  await replaceItem(containers.notes, noteId, note.unitId, {
    ...note,
    content,
    edited: true,
    editedAt: new Date().toISOString(),
  });
}

export async function deleteNote(noteId: string): Promise<void> {
  // Find the note to get the partition key (unitId)
  const allNotes = await queryAll<any>(
    containers.notes,
    'SELECT * FROM c WHERE c.id = @id',
    [{ name: '@id', value: noteId }]
  );

  if (allNotes.length === 0) return;

  const note = allNotes[0];
  await deleteItem(containers.notes, noteId, note.unitId);
}

export async function getUserNotes(userId: string): Promise<Note[]> {
  const notes = await queryAll<any>(
    containers.notes,
    'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.timestamp DESC',
    [{ name: '@userId', value: userId }]
  );

  return notes.map((note) => ({
    id: note.id,
    unitId: note.unitId,
    developmentId: note.developmentId,
    userId: note.userId,
    userEmail: note.userEmail,
    userName: note.userName || undefined,
    content: note.content,
    timestamp: note.timestamp ? new Date(note.timestamp) : new Date(),
    edited: note.edited || false,
    editedAt: note.editedAt ? new Date(note.editedAt) : undefined,
  }));
}

export async function getNotesCount(unitId: string): Promise<number> {
  const notes = await queryAll<any>(
    containers.notes,
    'SELECT * FROM c WHERE c.unitId = @unitId',
    [{ name: '@unitId', value: unitId }]
  );
  return notes.length;
}

export async function getNotesCountsForDevelopment(
  developmentId: string
): Promise<Map<string, number>> {
  const notes = await queryAll<any>(
    containers.notes,
    'SELECT * FROM c WHERE c.developmentId = @developmentId',
    [{ name: '@developmentId', value: developmentId }]
  );

  const counts = new Map<string, number>();
  notes.forEach((note) => {
    const unitId = note.unitId;
    counts.set(unitId, (counts.get(unitId) || 0) + 1);
  });

  return counts;
}
