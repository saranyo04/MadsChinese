import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { ChevronDown, Settings as SettingsIcon } from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

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
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const [isImportingPdf, setIsImportingPdf] = useState(false);
  const [pdfImportError, setPdfImportError] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfExportNotice, setPdfExportNotice] = useState<string | null>(null);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [statusDate, setStatusDate] = useState(() => new Date());
  const [themes, setThemes] = useState<ThemeDefinition[]>([]);
  const [activeThemeId, setActiveThemeId] = useState("");
  const easterEggTimerRef = useRef<number | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

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
    setIsFileMenuOpen(false);
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
    setIsFileMenuOpen(false);
    await handleSaveAsNew();
  }

  function handleNewNote() {
    setIsSaveMenuOpen(false);
    setIsFileMenuOpen(false);
    setEditorContent("");
    setNoteTitle("");
    setCurrentNoteId(null);
    setSelectedNoteId(null);
  }

  function handleImportPdfClick() {
    setIsFileMenuOpen(false);
    setPdfImportError(null);
    setPdfExportNotice(null);
    pdfInputRef.current?.click();
  }

  async function handleExportPdfClick() {
    setIsFileMenuOpen(false);
    setPdfImportError(null);
    setPdfExportNotice(null);

    const exportTitle = noteTitle.trim() || "Untitled Note";

    let selectedPath: string | null;
    try {
      selectedPath = await save({
        defaultPath: `${sanitizePdfFileName(exportTitle)}.pdf`,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
    } catch (error) {
      console.error("PDF save dialog failed", error);
      setPdfExportNotice("Could not open the PDF save dialog.");
      return;
    }

    if (!selectedPath) {
      return;
    }

    setIsExportingPdf(true);

    try {
      const pdfBytes = await createWorkspacePdf(exportTitle, editorContent);
      await writeFile(ensurePdfExtension(selectedPath), pdfBytes);
      setPdfExportNotice("PDF exported successfully.");
    } catch (error) {
      console.error("PDF export failed", error);
      setPdfExportNotice("Could not export this note as a PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  }

  async function handlePdfFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!isPdfFile(file)) {
      setPdfImportError("Please choose a PDF file.");
      return;
    }

    setIsImportingPdf(true);
    setPdfImportError(null);

    try {
      const extractedText = await extractPdfText(file);

      if (!extractedText.trim()) {
        setPdfImportError(
          "No selectable text was found in this PDF. Scanned PDFs are not supported yet.",
        );
        return;
      }

      setEditorContent(extractedText);

      if (currentNoteId === null) {
        setNoteTitle(getPdfNoteTitle(file.name));
      }
    } catch (error) {
      console.error("PDF import failed", error);
      setPdfImportError("Could not extract text from this PDF.");
    } finally {
      setIsImportingPdf(false);
    }
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
                onClick={() => {
                  setIsFileMenuOpen(false);
                  setIsSaveMenuOpen((isOpen) => !isOpen);
                }}
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

            <div
              className="relative"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setIsFileMenuOpen(false);
                }
              }}
            >
              <Button
                type="button"
                variant="outline"
                className="h-10 px-4 py-2 hover:bg-[var(--accent)]"
                aria-expanded={isFileMenuOpen}
                onClick={() => {
                  setIsSaveMenuOpen(false);
                  setIsFileMenuOpen((isOpen) => !isOpen);
                }}
              >
                File
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </Button>

              {isFileMenuOpen ? (
                <div className="absolute left-0 top-10 z-20 w-36 rounded-md border border-[var(--border)] bg-[var(--card)] py-1 text-sm shadow-md">
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-[var(--foreground)] hover:bg-[var(--sidebar-accent)] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isImportingPdf}
                    onClick={handleImportPdfClick}
                  >
                    {isImportingPdf ? "Importing..." : "Import PDF"}
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-[var(--foreground)] hover:bg-[var(--sidebar-accent)] disabled:cursor-not-allowed disabled:text-[var(--muted-foreground)] disabled:opacity-60"
                    disabled={isExportingPdf}
                    onClick={() => void handleExportPdfClick()}
                  >
                    {isExportingPdf ? "Exporting..." : "Export PDF"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            aria-label="Open settings"
            className="ml-auto h-10 w-10 px-0 py-2 hover:bg-[var(--accent)]"
            onClick={() => {
              setIsSaveMenuOpen(false);
              setIsFileMenuOpen(false);
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

      {pdfImportError ? (
        <div className="fixed bottom-5 left-5 z-50 max-w-sm rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--foreground)] shadow-lg">
          {pdfImportError}
        </div>
      ) : null}

      {pdfExportNotice ? (
        <div className="fixed bottom-20 left-5 z-50 max-w-sm rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--foreground)] shadow-lg">
          {pdfExportNotice}
        </div>
      ) : null}

      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => void handlePdfFileChange(event)}
      />

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

async function extractPdfText(file: File) {
  const { PDF } = await import("@libpdf/core");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await PDF.load(bytes);
  const pages: string[] = [];

  for (const page of pdf.getPages()) {
    const { text } = page.extractText();
    pages.push(text);
  }

  return normalizePdfImportedText(pages.join("\n\n"));
}

async function createWorkspacePdf(title: string, content: string) {
  const { PDF, rgb } = await import("@libpdf/core");
  const pdf = PDF.create();
  const fontBytes = await loadPdfExportFont();
  const font = pdf.fonts.embed(fontBytes);
  const color = rgb(0, 0, 0);
  const margin = 54;
  const titleSize = 16;
  const bodySize = 12;
  const titleLineHeight = 22;
  const bodyLineHeight = 17;
  let page = pdf.addPage({ size: "a4" });
  let y = page.height - margin;
  const contentWidth = page.width - margin * 2;

  function addPage() {
    page = pdf.addPage({ size: "a4" });
    y = page.height - margin;
  }

  function ensureLineSpace(lineHeight: number) {
    if (y < margin + lineHeight) {
      addPage();
    }
  }

  function drawLine(line: string, size: number, lineHeight: number) {
    ensureLineSpace(lineHeight);
    page.drawText(line, {
      x: margin,
      y,
      size,
      font,
      color,
    });
    y -= lineHeight;
  }

  function advanceBlankLine(lineHeight: number) {
    ensureLineSpace(lineHeight);
    y -= lineHeight;
  }

  const normalizedTitle = normalizePdfExportText(title);
  for (const line of wrapPdfTextLine(normalizedTitle, font, titleSize, contentWidth)) {
    drawLine(line, titleSize, titleLineHeight);
  }

  advanceBlankLine(bodyLineHeight);

  const normalizedContent = normalizePdfExportText(content).replace(/\t/g, "    ");
  for (const rawLine of normalizedContent.split(/\r?\n/)) {
    if (rawLine.length === 0) {
      advanceBlankLine(bodyLineHeight);
      continue;
    }

    for (const line of wrapPdfTextLine(rawLine, font, bodySize, contentWidth)) {
      drawLine(line, bodySize, bodyLineHeight);
    }
  }

  return pdf.save({ subsetFonts: true });
}

async function loadPdfExportFont() {
  const response = await fetch(PDF_EXPORT_FONT_PATH);

  if (!response.ok) {
    throw new Error(`Could not load PDF export font: ${response.status}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

function wrapPdfTextLine(
  line: string,
  font: { getTextWidth(text: string, fontSize: number): number },
  fontSize: number,
  maxWidth: number,
) {
  const characters = Array.from(line);
  const wrappedLines: string[] = [];
  let currentLine = "";

  for (const character of characters) {
    const nextLine = `${currentLine}${character}`;

    if (currentLine && font.getTextWidth(nextLine, fontSize) > maxWidth) {
      wrappedLines.push(currentLine);
      currentLine = character;
      continue;
    }

    currentLine = nextLine;
  }

  if (currentLine) {
    wrappedLines.push(currentLine);
  }

  return wrappedLines.length > 0 ? wrappedLines : [""];
}

function normalizePdfImportedText(text: string) {
  let listNumber = 1;
  let normalized = text.replace(
    /(^|\n)(\u0000+)\.\s/g,
    (_match, lineStart: string) => `${lineStart}${listNumber++}. `,
  );

  for (const [from, to] of PDF_TEXT_REPLACEMENTS) {
    normalized = normalized.split(from).join(to);
  }

  return normalized
    .replace(/\uFB00/g, "ff")
    .replace(/\uFB01/g, "fi")
    .replace(/\uFB02/g, "fl")
    .replace(/\uFB03/g, "ffi")
    .replace(/\uFB04/g, "ffl");
}

function normalizePdfExportText(text: string) {
  return normalizePdfImportedText(text).replace(/\u0000/g, "");
}

const PDF_TEXT_REPLACEMENTS: Array<[string, string]> = [
  ["\u0000rst", "first"],
  ["o\u0000cials", "officials"],
  ["o\u0000cial", "official"],
  ["di\u0000cult", "difficult"],
  ["e\u0000ciency", "efficiency"],
  ["in\u0000ation", "inflation"],
  ["\u0000nancial", "financial"],
  ["\u0000nance", "finance"],
  ["\u0000fth", "fifth"],
  ["\u0000owed", "flowed"],
  ["arti\u0000cial", "artificial"],
  ["\u0000sheries", "fisheries"],
  ["\u0000uctuations", "fluctuations"],
  ["\u0000scal", "fiscal"],
  ["\u0000rm", "firm"],
  ["pro\u0000ts", "profits"],
  ["uni\u0000ed", "unified"],
  ["signi\u0000cantly", "significantly"],
];

const PDF_EXPORT_FONT_PATH = "/fonts/NotoSansCJKsc-Regular.otf";

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function getPdfNoteTitle(fileName: string) {
  return fileName.replace(/\.pdf$/i, "").trim() || "Untitled";
}

function sanitizePdfFileName(fileName: string) {
  const sanitized = fileName
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");

  return sanitized || "Untitled Note";
}

function ensurePdfExtension(filePath: string) {
  return filePath.toLowerCase().endsWith(".pdf") ? filePath : `${filePath}.pdf`;
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
