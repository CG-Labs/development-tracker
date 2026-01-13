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
 * Subscribe to real-time notes updates using Cosmos DB change feed
 * Polls every 2 seconds for changes
 */
export function subscribeToNotes(
  unitId: string,
  callback: (notes: Note[]) => void,
  onError?: (error: Error) => void
): () => void {
  let active = true;
  let continuationToken: string | undefined;

  async function poll() {
    // Initial load
    try {
      const initialNotes = await getNotes(unitId);
      callback(initialNotes);
    } catch (error) {
      console.error("Error loading initial notes:", error);
      onError?.(error as Error);
    }

    // Start polling for changes
    while (active) {
      try {
        // Use change feed to detect changes
        const iterator = containers.notes.items.readChangeFeed({
          partitionKey: unitId,
          continuationToken,
          startFromBeginning: false,
        });

        if (iterator.hasMoreResults) {
          const response = await iterator.readNext();

          // If there are changes, reload all notes
          if (response.result && response.result.length > 0) {
            const updatedNotes = await getNotes(unitId);
            callback(updatedNotes);
          }

          continuationToken = response.continuationToken;
        }
      } catch (error) {
        console.error("Error in notes subscription:", error);
        onError?.(error as Error);
      }

      // Poll every 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  poll();

  // Return unsubscribe function
  return () => {
    active = false;
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
