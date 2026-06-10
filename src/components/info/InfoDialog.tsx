import { X } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

type InfoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function InfoDialog({ open, onOpenChange }: InfoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Info</DialogTitle>
        </DialogHeader>

        <DialogClose
          aria-label="Close info"
          className="absolute right-4 top-4 rounded-md p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </DialogClose>

        <div className="themed-scrollbar mt-7 min-h-0 flex-1 space-y-6 overflow-y-auto pr-2 text-sm leading-6">
          <section className="space-y-2">
            <h2 className="font-semibold text-[var(--foreground)]">
              Dictionary popup
            </h2>
            <p className="text-[var(--muted-foreground)]">
              Type or paste text into the workspace and hover Chinese words for quick dictionary lookups. 
              The headword shows the matched Chinese word, pinyin shows its pronunciation, 
              and definitions for studying.
            </p>
            <p className="text-[var(--muted-foreground)]">
              Pinyin colors indicate Mandarin tones:
            </p>

          <ul className="mt-1 space-y-1 text-sm">
            <li><span className="text-[var(--tone-1)]">First tone</span> syllables are shown in red.</li>
            <li><span className="text-[var(--tone-2)]">Second tone</span> syllables are shown in orange.</li>
            <li><span className="text-[var(--tone-3)]">Third tone</span> syllables are shown in green.</li>
            <li><span className="text-[var(--tone-4)]">Fourth tone</span> syllables are shown in blue.</li>
            <li><span className="text-[var(--tone-5)]">Neutral tone</span> syllables are shown in gray.</li>
          </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-[var(--foreground)]">
              Keyboard shortcuts
            </h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[var(--muted-foreground)]">
              <dt className="font-medium text-[var(--foreground)]">
                Ctrl/Cmd + S
              </dt>
              <dd>Save note</dd>
              <dt className="font-medium text-[var(--foreground)]">
                Ctrl/Cmd + T
              </dt>
              <dd>New note</dd>
            </dl>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-[var(--foreground)]">
              Basic usage
            </h2>
            <ul className="space-y-1 text-[var(--muted-foreground)]">
              <li>
                <strong className="font-medium text-[var(--foreground)]">
                  Save
                </strong>{" "}
                updates the current note or creates one for an unattached
                workspace.
              </li>
              <li>
                <strong className="font-medium text-[var(--foreground)]">
                  Save as New
                </strong>{" "}
                creates a separate note from the current title and content.
              </li>
              <li>
                <strong className="font-medium text-[var(--foreground)]">
                  New Note
                </strong>{" "}
                opens a blank, unattached workspace.
              </li>
              <li>
                <strong className="font-medium text-[var(--foreground)]">
                  Import PDF
                </strong>{" "}
                extracts text into the workspace, while 
                <strong className="font-medium text-[var(--foreground)]"> Export PDF </strong> 
                saves the current note as a PDF.
              </li>
            </ul>
            <p>
              Unsaved workspace content is preserved automatically and restored
              when the app starts again.
            </p>
          </section>

          <footer className="space-y-1 border-t border-[var(--border)] pt-4 text-center text-[var(--muted-foreground)]">
            <p>Version 0.1.0</p>
            <p>Made with ♥ by Saranyo</p>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
