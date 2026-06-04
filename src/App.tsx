import { WorkspaceShell } from "./features/workspace";

export function App() {
  return (
    <main className="flex h-screen min-h-0 flex-col overflow-hidden bg-[var(--theme-surface)] text-stone-950">
      <header className="shrink-0 border-b border-[var(--theme-border)] bg-[var(--theme-surface)] px-6 py-4">
        <h1 className="text-lg font-semibold tracking-normal">MadsChinese</h1>
      </header>

      <WorkspaceShell />
    </main>
  );
}
