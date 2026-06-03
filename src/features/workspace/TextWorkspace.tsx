import { useEffect, useRef, useState, type MouseEvent } from "react";
import { X } from "lucide-react";

import { Button } from "../../components/ui/button";
import {
  DictionaryPopup,
  useDictionary,
  type WordSearchResult,
} from "../dictionary";

type PopupState = {
  result: WordSearchResult;
  x: number;
  y: number;
  containerRect: DOMRect;
};

type HoverText = {
  text: string;
  rangeNode: Text;
  rangeOffset: number;
};

export function TextWorkspace() {
  const [text, setText] = useState("");
  const [popup, setPopup] = useState<PopupState | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const savedClientX = useRef(-1);
  const savedClientY = useRef(-1);
  const savedRangeNode = useRef<Node | null>(null);
  const savedRangeOffset = useRef(-1);
  const popX = useRef(0);
  const popY = useRef(0);
  const { wordSearch } = useDictionary();

  useEffect(() => {
    editorRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        window.clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  function clearText() {
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }

    setText("");
    dismissPopup();
  }

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation();

    const clientX = event.clientX;
    const clientY = event.clientY;
    const editorElement = event.currentTarget;
    const containerRect = sectionRef.current?.getBoundingClientRect();

    if (clientX === savedClientX.current && clientY === savedClientY.current) {
      return;
    }

    savedClientX.current = clientX;
    savedClientY.current = clientY;

    const range = document.caretRangeFromPoint?.(clientX, clientY);
    if (!range) {
      dismissPopup();
      return;
    }

    const hoverText = getHoverTextFromRange(
      range,
      editorElement,
      clientX,
      clientY,
    );
    if (!hoverText) {
      dismissPopup();
      return;
    }

    if (
      hoverText.rangeNode === savedRangeNode.current &&
      hoverText.rangeOffset === savedRangeOffset.current
    ) {
      return;
    }

    savedRangeNode.current = hoverText.rangeNode;
    savedRangeOffset.current = hoverText.rangeOffset;

    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
    }

    hoverTimerRef.current = window.setTimeout(() => {
      if (!containerRect) {
        dismissPopup();
        return;
      }

      popX.current = clientX;
      popY.current = clientY;

      const result = wordSearch(hoverText.text);
      if (!result) {
        dismissPopup();
        return;
      }

      highlightMatch(hoverText.rangeNode, hoverText.rangeOffset, result.matchLen);
      setPopup({
        result,
        x: popX.current,
        y: popY.current,
        containerRect,
      });
    }, 50);
  }

  function handleMouseLeave() {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
    }

    dismissPopup();
  }

  function dismissPopup() {
    setPopup(null);
    clearSelection();
    savedClientX.current = -1;
    savedClientY.current = -1;
    savedRangeNode.current = null;
    savedRangeOffset.current = -1;
  }

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-0 flex-1 flex-col gap-4 px-6 py-5"
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={editorRef}
        contentEditable="true"
        suppressContentEditableWarning
        data-placeholder="Paste or type Chinese text here..."
        onInput={(event) => setText(event.currentTarget.textContent ?? "")}
        onMouseMove={handleMouseMove}
        spellCheck={false}
        className="min-h-0 flex-1 resize-none overflow-y-auto whitespace-pre-wrap rounded-md border border-stone-200 bg-white px-6 py-5 text-lg leading-8 text-stone-950 shadow-sm outline-none transition empty:before:pointer-events-none empty:before:text-stone-400 empty:before:content-[attr(data-placeholder)] focus:border-stone-400 focus:ring-4 focus:ring-stone-200/70 placeholder:text-stone-400"
      />

      {popup ? (
        <DictionaryPopup
          containerRect={popup.containerRect}
          result={popup.result}
          x={popup.x}
          y={popup.y}
        />
      ) : null}

      <div className="flex justify-start">
        <Button type="button" variant="outline" onClick={clearText}>
          <X className="size-4" aria-hidden="true" />
          Clear
        </Button>
      </div>
    </section>
  );
}

function getHoverTextFromRange(
  range: Range,
  root: HTMLElement,
  clientX: number,
  clientY: number,
): HoverText | null {
  let rangeNode = range.startContainer;
  let rangeOffset = range.startOffset;

  if (rangeNode.nodeType !== Node.TEXT_NODE) {
    return null;
  }

  const textNode = rangeNode as Text;
  if (rangeOffset === textNode.data.length) {
    const nextNode = findNextTextNode(root, textNode);
    if (!nextNode) {
      return null;
    }

    rangeNode = nextNode;
    rangeOffset = 0;
  }

  if (rangeNode.nodeType !== Node.TEXT_NODE || !root.contains(rangeNode)) {
    return null;
  }

  const normalizedTextNode = rangeNode as Text;
  const character = getCharacterAtOffset(
    normalizedTextNode.textContent ?? "",
    rangeOffset,
  );
  if (!isChineseCharacter(character)) {
    return null;
  }

  if (!isPointOverText(normalizedTextNode, rangeOffset, clientX, clientY)) {
    return null;
  }

  return {
    text: getText(root, normalizedTextNode, rangeOffset, 30),
    rangeNode: normalizedTextNode,
    rangeOffset,
  };
}

function getCharacterAtOffset(text: string, offset: number) {
  const codePoint = text.codePointAt(offset);
  if (!codePoint) {
    return "";
  }

  return String.fromCodePoint(codePoint);
}

function isChineseCharacter(character: string) {
  return /[\u3400-\u9FFF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFFEF\u{20000}-\u{2A6DF}]/u.test(
    character,
  );
}

const HORIZONTAL_TOLERANCE_PX = 4;
const VERTICAL_TOLERANCE_PX = 2;

function isPointOverText(
  textNode: Text,
  offset: number,
  clientX: number,
  clientY: number,
) {
  const character = getCharacterAtOffset(textNode.data, offset);
  if (!character) {
    return false;
  }

  const range = document.createRange();
  range.setStart(textNode, offset);
  range.setEnd(textNode, offset + character.length);

  const rect = range.getBoundingClientRect();
  range.detach();

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    clientX >= rect.left - HORIZONTAL_TOLERANCE_PX &&
    clientX <= rect.right + HORIZONTAL_TOLERANCE_PX &&
    clientY >= rect.top - VERTICAL_TOLERANCE_PX &&
    clientY <= rect.bottom + VERTICAL_TOLERANCE_PX
  );
}

function getText(
  root: HTMLElement,
  startNode: Text,
  offset: number,
  maxLength: number,
) {
  let text = "";
  let hasReachedStartNode = false;
  const nodeIterator = document.createNodeIterator(root, NodeFilter.SHOW_TEXT);
  let node = nodeIterator.nextNode() as Text | null;

  while (node && text.length < maxLength) {
    if (node === startNode) {
      hasReachedStartNode = true;
    }

    if (hasReachedStartNode) {
      const startOffset = node === startNode ? offset : 0;
      text += node.data.substring(startOffset, startOffset + maxLength - text.length);
    }

    node = nodeIterator.nextNode() as Text | null;
  }

  return text;
}

function highlightMatch(rangeStartNode: Text, rangeStartOffset: number, matchLen: number) {
  const rangeEnd = findRangeEnd(rangeStartNode, rangeStartOffset, matchLen);
  if (!rangeEnd) {
    return;
  }

  const range = document.createRange();
  range.setStart(rangeStartNode, rangeStartOffset);
  range.setEnd(rangeEnd.node, rangeEnd.offset);

  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function clearSelection() {
  window.getSelection()?.removeAllRanges();
}

function findRangeEnd(startNode: Text, startOffset: number, length: number) {
  let node: Text | null = startNode;
  let offset = startOffset;
  let remaining = length;

  while (node) {
    const available = node.data.length - offset;
    if (remaining <= available) {
      return {
        node,
        offset: offset + remaining,
      };
    }

    remaining -= available;
    node = findNextTextNode(editorRefFromTextNode(startNode), node);
    offset = 0;
  }

  return null;
}

function editorRefFromTextNode(node: Text) {
  const root = node.parentElement?.closest("[contenteditable='true']");
  return root instanceof HTMLElement ? root : null;
}

function findNextTextNode(root: HTMLElement | null, previous: Text) {
  if (!root) {
    return null;
  }

  const nodeIterator = document.createNodeIterator(
    root,
    NodeFilter.SHOW_TEXT,
  );
  let node = nodeIterator.nextNode();

  while (node && node !== previous) {
    node = nodeIterator.nextNode();
  }

  return nodeIterator.nextNode() as Text | null;
}
