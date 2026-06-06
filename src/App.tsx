import { WorkspaceShell } from "./features/workspace";

export function App() {
  return (
    <main className="flex h-screen min-h-0 flex-col overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <WorkspaceShell />
    </main>
  );
}
