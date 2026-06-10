import { BaseDirectory, mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

const WORKSPACE_DIR = "workspace";
const DRAFT_FILE = `${WORKSPACE_DIR}/draft.json`;
const STORAGE_OPTIONS = { baseDir: BaseDirectory.AppData };
const DRAFT_VERSION = 1;

export type WorkspaceDraft = {
  version: 1;
  title: string;
  content: string;
  currentNoteId: string | null;
  updatedAt: string;
};

export async function loadWorkspaceDraft(): Promise<WorkspaceDraft | null> {
  try {
    const contents = await readTextFile(DRAFT_FILE, STORAGE_OPTIONS);
    const parsed = JSON.parse(contents);

    return isWorkspaceDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveWorkspaceDraft(
  draft: Omit<WorkspaceDraft, "version" | "updatedAt">,
): Promise<WorkspaceDraft> {
  const nextDraft: WorkspaceDraft = {
    ...draft,
    version: DRAFT_VERSION,
    updatedAt: new Date().toISOString(),
  };

  await ensureWorkspaceDirectory();
  await writeTextFile(
    DRAFT_FILE,
    JSON.stringify(nextDraft, null, 2),
    STORAGE_OPTIONS,
  );

  return nextDraft;
}

function isWorkspaceDraft(value: unknown): value is WorkspaceDraft {
  if (!value || typeof value !== "object") {
    return false;
  }

  const draft = value as Record<string, unknown>;

  return (
    draft.version === DRAFT_VERSION &&
    typeof draft.title === "string" &&
    typeof draft.content === "string" &&
    (typeof draft.currentNoteId === "string" || draft.currentNoteId === null) &&
    typeof draft.updatedAt === "string"
  );
}

async function ensureWorkspaceDirectory() {
  try {
    await mkdir(WORKSPACE_DIR, { ...STORAGE_OPTIONS, recursive: true });
  } catch {
    // The directory may already exist; writeTextFile will surface real write failures.
  }
}
