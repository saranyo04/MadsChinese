import { BaseDirectory, mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

import type { Note } from "../types/notes.types";

const WORKSPACE_DIR = "workspace";
const NOTES_FILE = `${WORKSPACE_DIR}/notes.json`;
const STORAGE_OPTIONS = { baseDir: BaseDirectory.AppData };

export async function loadNotes(): Promise<Note[]> {
  try {
    const contents = await readTextFile(NOTES_FILE, STORAGE_OPTIONS);
    const parsed = JSON.parse(contents);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isNote);
  } catch {
    return [];
  }
}

export async function saveNotes(notes: Note[]): Promise<void> {
  await ensureWorkspaceDirectory();
  await writeTextFile(NOTES_FILE, JSON.stringify(notes, null, 2), STORAGE_OPTIONS);
}

export async function createNote(note: Note): Promise<Note> {
  const notes = await loadNotes();
  const nextNotes = [...notes, note];

  await saveNotes(nextNotes);

  return note;
}

export async function updateNote(note: Note): Promise<Note | null> {
  const notes = await loadNotes();
  const noteIndex = notes.findIndex((existingNote) => existingNote.id === note.id);

  if (noteIndex === -1) {
    return null;
  }

  const nextNotes = [...notes];
  nextNotes[noteIndex] = note;

  await saveNotes(nextNotes);

  return note;
}

export async function deleteNote(id: string): Promise<void> {
  const notes = await loadNotes();
  const nextNotes = notes.filter((note) => note.id !== id);

  await saveNotes(nextNotes);
}

function isNote(value: unknown): value is Note {
  if (!value || typeof value !== "object") {
    return false;
  }

  const note = value as Record<string, unknown>;

  return (
    typeof note.id === "string" &&
    typeof note.title === "string" &&
    typeof note.content === "string" &&
    typeof note.createdAt === "string" &&
    typeof note.updatedAt === "string"
  );
}

async function ensureWorkspaceDirectory(): Promise<void> {
  try {
    await mkdir(WORKSPACE_DIR, { ...STORAGE_OPTIONS, recursive: true });
  } catch {
    // The directory may already exist; writeTextFile will surface real write failures.
  }
}
