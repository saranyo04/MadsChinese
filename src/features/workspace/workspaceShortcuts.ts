import { useEffect, useRef } from "react";

type WorkspaceShortcutsOptions = {
  onSave: () => Promise<void> | void;
  onNewNote: () => void;
  showEasterEgg: () => void;
};

const EASTER_EGG_SEQUENCE = "madhurjya";
const BUFFER_LENGTH = 32;

export function useWorkspaceShortcuts({
  onSave,
  onNewNote,
  showEasterEgg,
}: WorkspaceShortcutsOptions) {
  const keyBuffer = useRef("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      const isCommandKey = event.ctrlKey || event.metaKey;

      if (isCommandKey && key === "s") {
        event.preventDefault();
        void onSave();
        return;
      }

      if (isCommandKey && key === "t") {
        event.preventDefault();
        onNewNote();
        return;
      }

      if (
        event.isComposing ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        !/^[a-z]$/.test(key)
      ) {
        return;
      }

      keyBuffer.current = `${keyBuffer.current}${key}`.slice(-BUFFER_LENGTH);

      if (keyBuffer.current.includes(EASTER_EGG_SEQUENCE)) {
        keyBuffer.current = "";
        showEasterEgg();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onSave, onNewNote, showEasterEgg]);
}
