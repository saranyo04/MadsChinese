import { useEffect, useRef, useState } from "react";
import { ChevronDown, Settings as SettingsIcon } from "lucide-react";

import { SettingsDialog } from "../../components/settings/SettingsDialog";
import { Button } from "../../components/ui/button";
import {
  applyTheme,
  getInitialTheme,
  getThemeById,
  loadThemes,
  saveSelectedThemeId,
  type ThemeDefinition,
} from "../../lib/theme/theme";
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
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [statusDate, setStatusDate] = useState(() => new Date());
  const [themes, setThemes] = useState<ThemeDefinition[]>([]);
  const [activeThemeId, setActiveThemeId] = useState("");
  const easterEggTimerRef = useRef<number | null>(null);

  useEffect(() => {
    void refreshNotes();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function refreshThemes() {
      const loadedThemes = await loadThemes();
      const initialTheme = getInitialTheme(loadedThemes);

      if (initialTheme) {
        applyTheme(initialTheme);
      }

      if (isMounted) {
        setThemes(loadedThemes);
        setActiveThemeId(initialTheme?.id ?? "");
      }
    }

    void refreshThemes();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStatusDate(new Date());
    }, 60000);

    return () => {
      window.clearInterval(timer);
    };
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

  const currentNote = currentNoteId
    ? notes.find((note) => note.id === currentNoteId)
    : null;
  const hasUnsavedChanges = currentNote
    ? currentNote.title !== noteTitle || currentNote.content !== editorContent
    : noteTitle.trim().length > 0 || editorContent.length > 0;

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

  async function handleToolbarSave() {
    setIsSaveMenuOpen(false);
    await handleSave();
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

  async function handleToolbarSaveAsNew() {
    setIsSaveMenuOpen(false);
    await handleSaveAsNew();
  }

  function handleNewNote() {
    setIsSaveMenuOpen(false);
    setEditorContent("");
    setNoteTitle("");
    setCurrentNoteId(null);
    setSelectedNoteId(null);
  }

  function handleSelectTheme(themeId: string) {
    const theme = getThemeById(themes, themeId);

    if (!theme) {
      return;
    }

    applyTheme(theme);
    saveSelectedThemeId(theme.id);
    setActiveThemeId(theme.id);
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

  async function handleSaveAndOpenNote(note: Note) {
    const noteIdBeforeSave = currentNoteId;

    await handleSave();

    if (note.id !== noteIdBeforeSave) {
      handleOpenNote(note);
    }
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-[var(--border)] bg-[var(--background)]">
        <div className="flex h-16 items-center gap-2.5 px-6">
          <div className="flex items-center gap-2.5">
            <div
              className="relative flex"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setIsSaveMenuOpen(false);
                }
              }}
            >
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-r-none border-r-0 px-4 py-2 font-semibold hover:bg-[var(--accent)]"
                onClick={() => void handleToolbarSave()}
              >
                Save
              </Button>
              <button
                type="button"
                aria-label="More save options"
                className="h-10 rounded-r-md border border-l-0 border-[var(--border)] bg-[var(--secondary)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                onClick={() => setIsSaveMenuOpen((isOpen) => !isOpen)}
              >
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </button>

              {isSaveMenuOpen ? (
                <div className="absolute left-0 top-10 z-20 w-32 rounded-md border border-[var(--border)] bg-[var(--card)] py-1 text-sm shadow-md">
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-[var(--foreground)] hover:bg-[var(--sidebar-accent)]"
                    onClick={() => void handleToolbarSave()}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-[var(--foreground)] hover:bg-[var(--sidebar-accent)]"
                    onClick={() => void handleToolbarSaveAsNew()}
                  >
                    Save as New
                  </button>
                </div>
              ) : null}
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-10 px-4 py-2 hover:bg-[var(--accent)]"
              onClick={handleNewNote}
            >
              New Note
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-10 px-4 py-2 hover:bg-[var(--accent)]"
            >
              Upload PDF
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            aria-label="Open settings"
            className="ml-auto h-10 w-10 px-0 py-2 hover:bg-[var(--accent)]"
            onClick={() => {
              setIsSaveMenuOpen(false);
              setIsSettingsDialogOpen(true);
            }}
          >
            <SettingsIcon className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="flex min-h-7 items-center justify-end gap-2 border-t border-[var(--border)] px-6 text-xs text-[var(--muted-foreground)]">
          <span>{formatStatusDate(statusDate)}</span>
          <span>·</span>
          <span>{formatStatusTime(statusDate)}</span>
          <span>·</span>
          <span
            className={
              hasUnsavedChanges ? "font-medium text-[var(--foreground)]" : undefined
            }
          >
            {hasUnsavedChanges ? "Unsaved" : "Saved"}
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <TextWorkspace
          editorContent={editorContent}
          noteTitle={noteTitle}
          onEditorContentChange={setEditorContent}
          onNoteTitleChange={setNoteTitle}
          onSave={handleSave}
        />

        <NotesSidebar
          notes={notes}
          hasUnsavedChanges={hasUnsavedChanges}
          selectedNoteId={selectedNoteId}
          onDeleteNote={handleDeleteNote}
          onDiscardAndOpenNote={handleOpenNote}
          onOpenNote={handleOpenNote}
          onSaveAndOpenNote={handleSaveAndOpenNote}
          onSelectNote={handleSelectNote}
        />
      </div>

      <div
        className={`pointer-events-none fixed bottom-5 right-5 z-50 rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-right shadow-lg transition duration-500 ${
          isEasterEggVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-2 opacity-0"
        }`}
      >
        <p className="text-lg font-semibold text-[var(--foreground)]">wo ai ni!!!</p>
        <p className="text-sm text-[var(--muted-foreground)]">我爱你</p>
      </div>

      <SettingsDialog
        activeThemeId={activeThemeId}
        onOpenChange={setIsSettingsDialogOpen}
        onSelectTheme={handleSelectTheme}
        open={isSettingsDialogOpen}
        themes={themes}
      />
    </div>
  );
}

function formatStatusDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatStatusTime(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
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
