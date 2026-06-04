import { useEffect, useRef, useState } from "react";

import { NotesSidebar } from "../notes/components/NotesSidebar";
import {
  createNote,
  deleteNote,
  loadNotes,
  updateNote,
} from "../notes/storage/notesStorage";
import type { Note } from "../notes/types/notes.types";
import { TextWorkspace } from "./TextWorkspace";
import { useWorkspaceShortcuts } from "./workspaceShortcuts";

export function WorkspaceShell() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [isEasterEggVisible, setIsEasterEggVisible] = useState(false);
  const easterEggTimerRef = useRef<number | null>(null);

  useEffect(() => {
    void refreshNotes();
  }, []);

  useEffect(() => {
    return () => {
      if (easterEggTimerRef.current) {
        window.clearTimeout(easterEggTimerRef.current);
      }
    };
  }, []);

  useWorkspaceShortcuts({
    onSave: handleSave,
    onNewNote: handleNewNote,
    showEasterEgg,
  });

  async function refreshNotes() {
    const loadedNotes = await loadNotes();

    loadedNotes.sort(
      (firstNote, secondNote) =>
        new Date(secondNote.updatedAt).getTime() -
        new Date(firstNote.updatedAt).getTime(),
    );

    setNotes(loadedNotes);
  }

  async function handleSave() {
    const now = new Date().toISOString();

    if (currentNoteId === null) {
      const newId = createNoteId();
      const title = resolveNoteTitle(noteTitle, notes);
      const note: Note = {
        id: newId,
        title,
        content: editorContent,
        createdAt: now,
        updatedAt: now,
      };

      await createNote(note);
      await refreshNotes();
      setCurrentNoteId(newId);
      setSelectedNoteId(newId);
      setNoteTitle(title);
      return;
    }

    const existingNote = notes.find((note) => note.id === currentNoteId);
    if (!existingNote) {
      return;
    }

    const title = resolveNoteTitle(noteTitle, notes, currentNoteId);
    const updatedNote: Note = {
      ...existingNote,
      title,
      content: editorContent,
      updatedAt: now,
    };
    const savedNote = await updateNote(updatedNote);

    if (!savedNote) {
      return;
    }

    await refreshNotes();
    setSelectedNoteId(updatedNote.id);
    setNoteTitle(title);
  }

  async function handleSaveAsNew() {
    const now = new Date().toISOString();
    const newId = createNoteId();
    const title = resolveNoteTitle(noteTitle, notes);
    const note: Note = {
      id: newId,
      title,
      content: editorContent,
      createdAt: now,
      updatedAt: now,
    };

    await createNote(note);
    await refreshNotes();
    setCurrentNoteId(newId);
    setSelectedNoteId(newId);
    setNoteTitle(title);
  }

  function handleNewNote() {
    setEditorContent("");
    setNoteTitle("");
    setCurrentNoteId(null);
    setSelectedNoteId(null);
  }

  function handleSelectNote(note: Note) {
    setSelectedNoteId(note.id);
  }

  function handleOpenNote(note: Note) {
    setEditorContent(note.content);
    setNoteTitle(note.title);
    setCurrentNoteId(note.id);
    setSelectedNoteId(note.id);
  }

  async function handleDeleteNote(note: Note) {
    await deleteNote(note.id);
    await refreshNotes();

    if (currentNoteId === note.id) {
      setEditorContent("");
      setNoteTitle("");
      setCurrentNoteId(null);
    }

    if (selectedNoteId === note.id) {
      setSelectedNoteId(null);
    }
  }

  function showEasterEgg() {
    if (easterEggTimerRef.current) {
      window.clearTimeout(easterEggTimerRef.current);
    }

    setIsEasterEggVisible(true);
    easterEggTimerRef.current = window.setTimeout(() => {
      setIsEasterEggVisible(false);
    }, 2500);
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <TextWorkspace
        editorContent={editorContent}
        noteTitle={noteTitle}
        onEditorContentChange={setEditorContent}
        onNewNote={handleNewNote}
        onNoteTitleChange={setNoteTitle}
        onSave={handleSave}
        onSaveAsNew={handleSaveAsNew}
      />

      <NotesSidebar
        notes={notes}
        selectedNoteId={selectedNoteId}
        onDeleteNote={handleDeleteNote}
        onOpenNote={handleOpenNote}
        onSelectNote={handleSelectNote}
      />

      <div
        className={`pointer-events-none fixed bottom-5 right-5 z-50 rounded-md border border-stone-200 bg-white/95 px-4 py-3 text-right shadow-lg transition duration-500 ${
          isEasterEggVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-2 opacity-0"
        }`}
      >
        <p className="text-lg font-semibold text-stone-950">wo ai ni!!!</p>
        <p className="text-sm text-stone-500">我爱你</p>
      </div>
    </div>
  );
}

function createNoteId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `note-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function resolveNoteTitle(title: string, notes: Note[], excludeId?: string) {
  const trimmedTitle = title.trim();
  if (trimmedTitle) {
    return trimmedTitle;
  }

  const usedTitles = new Set(
    notes
      .filter((note) => note.id !== excludeId)
      .map((note) => note.title),
  );

  if (!usedTitles.has("Untitled")) {
    return "Untitled";
  }

  let index = 1;
  while (usedTitles.has(`Untitled (${index})`)) {
    index++;
  }

  return `Untitled (${index})`;
}
