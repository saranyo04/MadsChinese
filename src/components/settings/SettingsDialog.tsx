import { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";

import type { ThemeDefinition } from "../../lib/theme/theme";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  themes: ThemeDefinition[];
  activeThemeId: string;
  onSelectTheme: (themeId: string) => void;
};

export function SettingsDialog({
  open,
  onOpenChange,
  themes,
  activeThemeId,
  onSelectTheme,
}: SettingsDialogProps) {
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const activeTheme = themes.find((theme) => theme.id === activeThemeId);

  useEffect(() => {
    if (!open) {
      setIsThemeMenuOpen(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <DialogClose
          aria-label="Close settings"
          className="absolute right-4 top-4 rounded-md p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </DialogClose>

        <section className="mt-7 space-y-2">
          <span
            className="text-sm font-semibold text-[var(--foreground)]"
            id="theme-select-label"
          >
            Themes
          </span>

          <div className="space-y-1.5">
            <button
              aria-controls="theme-select-menu"
              aria-expanded={isThemeMenuOpen}
              aria-labelledby="theme-select-label"
              className="flex h-10 w-full items-center justify-between rounded-md border border-[var(--border)] bg-[var(--secondary)] px-3 text-left text-sm text-[var(--foreground)] transition-colors hover:border-[var(--border-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              type="button"
              onClick={() => setIsThemeMenuOpen((isOpen) => !isOpen)}
            >
              <span>{activeTheme?.name ?? "Select theme"}</span>
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>

            <div className="min-h-56">
              <div
                className={`max-h-56 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--card)] py-1 text-sm shadow-md ${
                  isThemeMenuOpen ? "block" : "hidden"
                }`}
                id="theme-select-menu"
              >
                {themes.map((theme) => (
                  <button
                    className={`block w-full px-3 py-2 text-left transition-colors hover:bg-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                      theme.id === activeThemeId
                        ? "font-medium text-[var(--foreground)]"
                        : "text-[var(--foreground)]"
                    }`}
                    key={theme.id}
                    type="button"
                    onClick={() => {
                      onSelectTheme(theme.id);
                      setIsThemeMenuOpen(false);
                    }}
                  >
                    {theme.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}
