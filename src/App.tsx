import { TextWorkspace } from "./features/workspace/TextWorkspace";

export function App() {
  return (
    <main className="flex min-h-screen flex-col bg-stone-50 text-stone-950">
      <header className="border-b border-stone-200 bg-white/85 px-6 py-4 backdrop-blur">
        <h1 className="text-lg font-semibold tracking-normal">MadsChinese</h1>
      </header>

      <TextWorkspace />
    </main>
  );
}
