import { WorkspaceShell } from "./features/workspace";

export function App() {
  return (
    <main className="flex h-screen min-h-0 flex-col overflow-hidden bg-[var(--theme-surface)] text-stone-950">
      <WorkspaceShell />
    </main>
  );
}
