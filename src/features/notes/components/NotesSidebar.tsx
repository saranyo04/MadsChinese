import { useState } from "react";

import type { Note } from "../types/notes.types";

type NotesSidebarProps = {
  notes: Note[];
  selectedNoteId: string | null;
  onDeleteNote: (note: Note) => Promise<void>;
  onOpenNote: (note: Note) => void;
  onSelectNote: (note: Note) => void;
};

export function NotesSidebar({
  notes,
  selectedNoteId,
  onDeleteNote,
  onOpenNote,
  onSelectNote,
}: NotesSidebarProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  function handleSelectNote(note: Note) {
    setPendingDeleteId(null);
    onSelectNote(note);
  }

  function handleOpenNote(note: Note) {
    setPendingDeleteId(null);
    onOpenNote(note);
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
      className="flex w-72 shrink-0 flex-col border-l border-[var(--theme-border)] bg-[var(--theme-notes-surface)]"
      onClick={() => setPendingDeleteId(null)}
    >
      <div className="border-b border-[var(--theme-border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-stone-900">Notes</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {notes.length === 0 ? (
          <p className="px-2 py-3 text-sm text-[var(--theme-notes-muted-text)]">
            No saved notes yet.
          </p>
        ) : (
          <div className="space-y-1">
            {notes.map((note) => {
              const isSelected = note.id === selectedNoteId;
              const isConfirmingDelete = note.id === pendingDeleteId;

              return (
                <div
                  key={note.id}
                  className={`group rounded-md border px-3 py-2 ${
                    isSelected
                      ? "border-[var(--theme-notes-selected-border)] bg-[var(--theme-notes-selected-bg)]"
                      : "border-transparent hover:bg-[var(--theme-notes-hover-bg)]"
                  }`}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleSelectNote(note);
                  }}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    handleOpenNote(note);
                  }}
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-stone-950">
                        {note.title}
                      </p>
                      <p className="mt-1 truncate text-xs text-stone-500">
                        {formatUpdatedAt(note.updatedAt)}
                      </p>
                    </div>

                    <button
                      type="button"
                      className={`shrink-0 rounded px-2 py-1 text-xs ${
                        isConfirmingDelete
                          ? "bg-red-50 text-red-700"
                          : "text-stone-500 hover:bg-[var(--theme-note-action-hover-bg)] hover:text-[var(--theme-note-action-hover-text)]"
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

  return date.toLocaleDateString();
}
