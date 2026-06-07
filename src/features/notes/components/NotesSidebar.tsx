import { useEffect, useRef, useState } from "react";

import type { Note } from "../types/notes.types";

type NotesSidebarProps = {
  hasUnsavedChanges: boolean;
  notes: Note[];
  selectedNoteId: string | null;
  onDeleteNote: (note: Note) => Promise<void>;
  onDiscardAndOpenNote: (note: Note) => void;
  onOpenNote: (note: Note) => void;
  onSaveAndOpenNote: (note: Note) => Promise<void>;
  onSelectNote: (note: Note) => void;
};

export function NotesSidebar({
  hasUnsavedChanges,
  notes,
  selectedNoteId,
  onDeleteNote,
  onDiscardAndOpenNote,
  onOpenNote,
  onSaveAndOpenNote,
}: NotesSidebarProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingSwitchNoteId, setPendingSwitchNoteId] = useState<string | null>(
    null,
  );
  const [searchText, setSearchText] = useState("");
  const pendingSwitchNoteRef = useRef<Note | null>(null);
  const saveSwitchButtonRef = useRef<HTMLButtonElement>(null);
  const trimmedSearchText = searchText.trim().toLowerCase();
  const visibleNotes = trimmedSearchText
    ? notes.filter((note) => note.title.toLowerCase().includes(trimmedSearchText))
    : notes;

  useEffect(() => {
    if (!hasUnsavedChanges) {
      pendingSwitchNoteRef.current = null;
      setPendingSwitchNoteId(null);
    }
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (pendingSwitchNoteId) {
      saveSwitchButtonRef.current?.focus();
    }
  }, [pendingSwitchNoteId]);

  function handleSelectNote() {
    setPendingDeleteId(null);
  }

  function handleOpenNote(note: Note) {
    setPendingDeleteId(null);

    if (hasUnsavedChanges) {
      pendingSwitchNoteRef.current = note;
      setPendingSwitchNoteId(note.id);
      return;
    }

    pendingSwitchNoteRef.current = null;
    setPendingSwitchNoteId(null);
    onOpenNote(note);
  }

  async function handleSaveAndOpenPendingNote() {
    const note = pendingSwitchNoteRef.current;
    if (!note) {
      return;
    }

    await onSaveAndOpenNote(note);
    pendingSwitchNoteRef.current = null;
    setPendingSwitchNoteId(null);
  }

  function handleDiscardAndOpenPendingNote() {
    const note = pendingSwitchNoteRef.current;
    if (!note) {
      return;
    }

    onDiscardAndOpenNote(note);
    pendingSwitchNoteRef.current = null;
    setPendingSwitchNoteId(null);
  }

  function handleCancelOpenNote() {
    pendingSwitchNoteRef.current = null;
    setPendingSwitchNoteId(null);
  }

  async function handleDeleteClick(note: Note) {
    if (pendingDeleteId !== note.id) {
      setPendingDeleteId(note.id);
      return;
    }

    await onDeleteNote(note);
    setPendingDeleteId(null);
  }

  return (
    <aside
      className="m-4 ml-0 flex w-72 shrink-0 flex-col overflow-hidden rounded-md border border-[var(--border)] bg-[var(--sidebar)]"
      onClick={() => setPendingDeleteId(null)}
    >
      <div className="space-y-3 border-b border-[var(--border)] px-4 py-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Notes</h2>
        <input
          type="search"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Search titles..."
          className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-2 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--placeholder)] focus:border-[var(--border-hover)] focus:ring-2 focus:ring-[var(--ring)]"
          onClick={(event) => event.stopPropagation()}
        />
      </div>

      <div className="themed-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
        {pendingSwitchNoteId ? (
          <div
            className="mb-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--muted-foreground)] shadow-sm"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="mb-2 font-medium text-[var(--foreground)]">
              Save changes before opening this note?
            </p>
            <div className="flex gap-1">
              <button
                ref={saveSwitchButtonRef}
                type="button"
                className="rounded bg-[var(--primary)] px-2 py-1 font-medium text-[var(--foreground)] hover:bg-[var(--primary-hover)]"
                onClick={() => void handleSaveAndOpenPendingNote()}
              >
                Save
              </button>
              <button
                type="button"
                className="rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-[var(--muted-foreground)] hover:bg-[var(--sidebar-accent)]"
                onClick={handleDiscardAndOpenPendingNote}
              >
                Discard
              </button>
              <button
                type="button"
                className="rounded px-2 py-1 text-[var(--muted-foreground)] hover:bg-[var(--sidebar-accent)]"
                onClick={handleCancelOpenNote}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {notes.length === 0 ? (
          <div className="px-2 py-3 text-sm text-[var(--muted-foreground)]">
            <p className="font-medium text-[var(--foreground)]">No saved notes yet.</p>
            <p className="mt-1">
              Write in the workspace, then press Save to keep your first note.
            </p>
          </div>
        ) : visibleNotes.length === 0 ? (
          <p className="px-2 py-3 text-sm text-[var(--muted-foreground)]">
            No note titles match your search.
          </p>
        ) : (
          <div className="space-y-1">
            {visibleNotes.map((note) => {
              const isSelected = note.id === selectedNoteId;
              const isConfirmingDelete = note.id === pendingDeleteId;

              return (
                <div
                  key={note.id}
                  className={`group rounded-md border px-3 py-2 ${
                    isSelected
                      ? "border-[var(--sidebar-selected-border)] bg-[var(--sidebar-selected)]"
                      : "border-transparent hover:bg-[var(--sidebar-accent)]"
                  }`}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleSelectNote();
                  }}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    handleOpenNote(note);
                  }}
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--foreground)]">
                        {note.title}
                      </p>
                      <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">
                        {formatUpdatedAt(note.updatedAt)}
                      </p>
                    </div>

                    <button
                      type="button"
                      className={`shrink-0 rounded px-2 py-1 text-xs ${
                        isConfirmingDelete
                          ? "bg-[var(--destructive-subtle)] text-[var(--destructive)]"
                          : "text-[var(--muted-foreground)] hover:bg-[var(--sidebar-selected)] hover:text-[var(--foreground)]"
                      }`}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDeleteClick(note);
                      }}
                    >
                      {isConfirmingDelete ? "Confirm" : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

function formatUpdatedAt(updatedAt: string) {
  const date = new Date(updatedAt);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.toLocaleDateString()} • ${date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}
