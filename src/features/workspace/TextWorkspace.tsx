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
  anchorRect: PopupRect;
  containerRect: PopupRect;
};

type HoverText = {
  originalText: string;
  text: string;
  rangeNode: Text;
  rangeOffset: number;
};

type PopupRect = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

export function TextWorkspace() {
  const [popup, setPopup] = useState<PopupState | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const savedClientX = useRef(-1);
  const savedClientY = useRef(-1);
  const savedRangeNode = useRef<Node | null>(null);
  const savedRangeOffset = useRef(-1);
  const hoverClientX = useRef(0);
  const hoverClientY = useRef(0);
  const hoverSelectionText = useRef<string | null>(null);
  const lookupRequestId = useRef(0);
  const isMouseDown = useRef(false);
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

  useEffect(() => {
    function handleWindowMouseUp() {
      isMouseDown.current = false;
    }

    window.addEventListener("mouseup", handleWindowMouseUp);

    return () => {
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, []);

  function clearText() {
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }

    dismissPopup();
  }

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation();

    if (isMouseDown.current || event.buttons !== 0) {
      suspendHover();
      return;
    }

    const clientX = event.clientX;
    const clientY = event.clientY;
    const editorElement = event.currentTarget;

    if (clientX === savedClientX.current && clientY === savedClientY.current) {
      return;
    }

    savedClientX.current = clientX;
    savedClientY.current = clientY;

    const range = document.caretRangeFromPoint?.(clientX, clientY);
    if (!range) {
      dismissPopupOutsideGrace(clientX, clientY);
      return;
    }

    const hoverText = getHoverTextFromRange(
      range,
      editorElement,
      clientX,
      clientY,
    );
    if (!hoverText) {
      dismissPopupOutsideGrace(clientX, clientY);
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
    hoverClientX.current = clientX;
    hoverClientY.current = clientY;
    lookupRequestId.current += 1;
    const currentLookupRequestId = lookupRequestId.current;

    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
    }

    hoverTimerRef.current = window.setTimeout(async () => {
      const containerRect = sectionRef.current?.getBoundingClientRect();
      if (!containerRect) {
        dismissPopup();
        return;
      }

      const result = await wordSearch(hoverText.text);
      if (currentLookupRequestId !== lookupRequestId.current) {
        return;
      }

      if (!result) {
        dismissPopup();
        return;
      }

      const anchorRect = highlightMatch(
        hoverText.rangeNode,
        hoverText.rangeOffset,
        getHighlightLength(hoverText.originalText, result.matchLen),
        hoverSelectionText,
      );
      if (!anchorRect) {
        dismissPopup();
        return;
      }

      setPopup({
        result,
        anchorRect: rectToObject(anchorRect),
        containerRect: rectToObject(containerRect),
      });
    }, 50);
  }

  function handleMouseLeave() {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
    }

    dismissPopup();
  }

  function handleMouseDown() {
    isMouseDown.current = true;
    hoverSelectionText.current = null;
    suspendHover();
  }

  function handleMouseUp() {
    isMouseDown.current = false;
  }

  function dismissPopup() {
    setPopup(null);
    clearSelection(hoverSelectionText);
    resetHoverState();
  }

  function dismissPopupOutsideGrace(clientX: number, clientY: number) {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
    }

    const dx = hoverClientX.current - clientX;
    const dy = hoverClientY.current - clientY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= HOVER_GRACE_DISTANCE_PX) {
      return;
    }

    dismissPopup();
  }

  function suspendHover() {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
    }

    setPopup(null);
    resetHoverState();
  }

  function resetHoverState() {
    savedClientX.current = -1;
    savedClientY.current = -1;
    savedRangeNode.current = null;
    savedRangeOffset.current = -1;
    hoverClientX.current = 0;
    hoverClientY.current = 0;
    lookupRequestId.current += 1;
  }

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 py-5"
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={editorRef}
        contentEditable="true"
        suppressContentEditableWarning
        data-placeholder="Paste or type Chinese text here..."
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        spellCheck={false}
        className="min-h-0 flex-1 resize-none overflow-y-auto whitespace-pre-wrap rounded-md border border-stone-200 bg-white px-6 py-5 text-lg leading-8 text-stone-950 shadow-sm outline-none transition empty:before:pointer-events-none empty:before:text-stone-400 empty:before:content-[attr(data-placeholder)] focus:border-stone-400 focus:ring-4 focus:ring-stone-200/70 placeholder:text-stone-400"
      />

      {popup ? (
        <DictionaryPopup
          anchorRect={popup.anchorRect}
          containerRect={popup.containerRect}
          result={popup.result}
        />
      ) : null}

      <div className="flex shrink-0 justify-start">
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

  const originalText = getText(root, normalizedTextNode, rangeOffset, 30);

  return {
    originalText,
    text: originalText.replace(zwnj, ""),
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
  return /[\u25CB\u3400-\u9FFF\uF900-\uFAFF\uFF21-\uFF3A\uFF41-\uFF5A\u{20000}-\u{2A6DF}]/u.test(
    character,
  );
}

const zwnj = /\u200c/g;
const HORIZONTAL_TOLERANCE_PX = 10;
const VERTICAL_TOLERANCE_PX = 4;
const HOVER_GRACE_DISTANCE_PX = 2;

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

function highlightMatch(
  rangeStartNode: Text,
  rangeStartOffset: number,
  matchLen: number,
  hoverSelectionText: { current: string | null },
) {
  const rangeEnd = findRangeEnd(rangeStartNode, rangeStartOffset, matchLen);
  if (!rangeEnd) {
    return null;
  }

  const range = document.createRange();
  range.setStart(rangeStartNode, rangeStartOffset);
  range.setEnd(rangeEnd.node, rangeEnd.offset);
  const anchorRect = getFirstVisibleRangeRect(range);
  if (!anchorRect) {
    range.detach();
    return null;
  }

  const selection = window.getSelection();
  if (!selection) {
    range.detach();
    return null;
  }

  if (
    !selection.isCollapsed &&
    hoverSelectionText.current !== selection.toString()
  ) {
    range.detach();
    return null;
  }

  selection.removeAllRanges();
  selection.addRange(range);
  hoverSelectionText.current = selection.toString();

  return anchorRect;
}

function clearSelection(hoverSelectionText: { current: string | null }) {
  if (hoverSelectionText.current === null) {
    return;
  }

  const selection = window.getSelection();
  if (!selection) {
    hoverSelectionText.current = null;
    return;
  }

  if (
    selection.isCollapsed ||
    hoverSelectionText.current === selection.toString()
  ) {
    selection.removeAllRanges();
  }

  hoverSelectionText.current = null;
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

function getFirstVisibleRangeRect(range: Range) {
  const rects = Array.from(range.getClientRects());
  return rects.find((rect) => rect.width > 0 && rect.height > 0) ?? null;
}

function rectToObject(rect: DOMRect | DOMRectReadOnly): PopupRect {
  return {
    bottom: rect.bottom,
    height: rect.height,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    width: rect.width,
  };
}

function getHighlightLength(originalText: string, matchLen: number) {
  let index = 0;

  for (let count = 0; count < matchLen; count++) {
    while (originalText[index] === "\u200c") {
      index++;
    }

    index++;
  }

  return index;
}
