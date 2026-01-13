import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { Note } from "../types/note";

const NOTES_COLLECTION = "notes";

interface AddNoteParams {
  unitId: string;
  developmentId: string;
  content: string;
  userId: string;
  userEmail: string;
  userName?: string;
}

export async function addNote(params: AddNoteParams): Promise<string> {
  const docRef = await addDoc(collection(db, NOTES_COLLECTION), {
    unitId: params.unitId,
    developmentId: params.developmentId,
    content: params.content,
    userId: params.userId,
    userEmail: params.userEmail,
    userName: params.userName || null,
    timestamp: Timestamp.now(),
    edited: false,
  });
  return docRef.id;
}

export async function getNotes(unitId: string): Promise<Note[]> {
  const q = query(
    collection(db, NOTES_COLLECTION),
    where("unitId", "==", unitId),
    orderBy("timestamp", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    unitId: doc.data().unitId,
    developmentId: doc.data().developmentId,
    userId: doc.data().userId,
    userEmail: doc.data().userEmail,
    userName: doc.data().userName || undefined,
    content: doc.data().content,
    timestamp: doc.data().timestamp?.toDate() || new Date(),
    edited: doc.data().edited || false,
    editedAt: doc.data().editedAt?.toDate() || undefined,
  }));
}

export function subscribeToNotes(
  unitId: string,
  callback: (notes: Note[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  // Note: Removed orderBy to avoid requiring composite index
  // Notes will be sorted client-side instead
  const q = query(
    collection(db, NOTES_COLLECTION),
    where("unitId", "==", unitId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notes = snapshot.docs.map((doc) => ({
        id: doc.id,
        unitId: doc.data().unitId,
        developmentId: doc.data().developmentId,
        userId: doc.data().userId,
        userEmail: doc.data().userEmail,
        userName: doc.data().userName || undefined,
        content: doc.data().content,
        timestamp: doc.data().timestamp?.toDate() || new Date(),
        edited: doc.data().edited || false,
        editedAt: doc.data().editedAt?.toDate() || undefined,
      }));
      // Sort client-side: newest first
      notes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      callback(notes);
    },
    (error) => {
      console.error("Error subscribing to notes:", error);
      if (onError) onError(error);
    }
  );
}

export async function updateNote(noteId: string, content: string): Promise<void> {
  const noteRef = doc(db, NOTES_COLLECTION, noteId);
  await updateDoc(noteRef, {
    content,
    edited: true,
    editedAt: Timestamp.now(),
  });
}

export async function deleteNote(noteId: string): Promise<void> {
  const noteRef = doc(db, NOTES_COLLECTION, noteId);
  await deleteDoc(noteRef);
}

export async function getUserNotes(userId: string): Promise<Note[]> {
  const q = query(
    collection(db, NOTES_COLLECTION),
    where("userId", "==", userId),
    orderBy("timestamp", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    unitId: doc.data().unitId,
    developmentId: doc.data().developmentId,
    userId: doc.data().userId,
    userEmail: doc.data().userEmail,
    userName: doc.data().userName || undefined,
    content: doc.data().content,
    timestamp: doc.data().timestamp?.toDate() || new Date(),
    edited: doc.data().edited || false,
    editedAt: doc.data().editedAt?.toDate() || undefined,
  }));
}

export async function getNotesCount(unitId: string): Promise<number> {
  const q = query(
    collection(db, NOTES_COLLECTION),
    where("unitId", "==", unitId)
  );
  const snapshot = await getDocs(q);
  return snapshot.size;
}

export async function getNotesCountsForDevelopment(
  developmentId: string
): Promise<Map<string, number>> {
  const q = query(
    collection(db, NOTES_COLLECTION),
    where("developmentId", "==", developmentId)
  );
  const snapshot = await getDocs(q);

  const counts = new Map<string, number>();
  snapshot.docs.forEach((doc) => {
    const unitId = doc.data().unitId;
    counts.set(unitId, (counts.get(unitId) || 0) + 1);
  });

  return counts;
}
