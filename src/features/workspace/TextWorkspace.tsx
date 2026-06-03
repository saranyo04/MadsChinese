import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { Button } from "../../components/ui/button";

export function TextWorkspace() {
  const [text, setText] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    editorRef.current?.focus();
  }, []);

  function clearText() {
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }

    setText("");
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-5">
      <div
        ref={editorRef}
        contentEditable="true"
        suppressContentEditableWarning
        data-placeholder="Paste or type Chinese text here..."
        onInput={(event) => setText(event.currentTarget.textContent ?? "")}
        spellCheck={false}
        className="min-h-0 flex-1 resize-none overflow-y-auto whitespace-pre-wrap rounded-md border border-stone-200 bg-white px-6 py-5 text-lg leading-8 text-stone-950 shadow-sm outline-none transition empty:before:pointer-events-none empty:before:text-stone-400 empty:before:content-[attr(data-placeholder)] focus:border-stone-400 focus:ring-4 focus:ring-stone-200/70 placeholder:text-stone-400"
      />

      <div className="flex justify-start">
        <Button type="button" variant="outline" onClick={clearText}>
          <X className="size-4" aria-hidden="true" />
          Clear
        </Button>
      </div>
    </section>
  );
}
