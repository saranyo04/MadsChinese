import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

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
  hoveredCharacterRect: PopupRect;
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

type TextWorkspaceProps = {
  editorContent: string;
  noteTitle: string;
  onEditorContentChange: (content: string) => void;
  onNoteTitleChange: (title: string) => void;
  onSave: () => Promise<void>;
};

export function TextWorkspace({
  editorContent,
  noteTitle,
  onEditorContentChange,
  onNoteTitleChange,
  onSave,
}: TextWorkspaceProps) {
  const [popup, setPopup] = useState<PopupState | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
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
    const editor = editorRef.current;
    if (!editor || editor.innerText === editorContent) {
      return;
    }

    if (editorContent) {
      editor.innerText = editorContent;
    } else {
      editor.innerHTML = "";
    }

    dismissPopup();
  }, [editorContent]);

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

  function handleEditorInput() {
    onEditorContentChange(editorRef.current?.innerText ?? "");
  }

  function handleTitleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    void onSave();
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
      const containerRect = workspaceRef.current?.getBoundingClientRect();
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

      const highlightLength = getHighlightLength(
        hoverText.originalText,
        result.matchLen,
      );
      const anchorRect = getMatchAnchorRect(
        hoverText.rangeNode,
        hoverText.rangeOffset,
        highlightLength,
        hoverText.hoveredCharacterRect,
      );
      const isHighlighted = highlightMatch(
        hoverText.rangeNode,
        hoverText.rangeOffset,
        highlightLength,
        hoverSelectionText,
      );
      if (!isHighlighted) {
        dismissPopup();
        return;
      }

      setPopup({
        result,
        anchorRect,
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
      className="relative flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 py-4"
      onMouseLeave={handleMouseLeave}
    >
      <input
        type="text"
        value={noteTitle}
        onChange={(event) => onNoteTitleChange(event.target.value)}
        onKeyDown={handleTitleKeyDown}
        placeholder="Note title..."
        className="h-10 shrink-0 rounded-md border border-[var(--border)] bg-[var(--paper)] px-3 text-sm text-[var(--foreground)] shadow-sm outline-none transition placeholder:text-[var(--placeholder)] focus:border-[var(--border-hover)] focus:ring-2 focus:ring-[var(--ring)]"
      />

      <div ref={workspaceRef} className="relative min-h-0 min-w-0 flex-1">
        <div
          ref={editorRef}
          contentEditable="true"
          suppressContentEditableWarning
          data-placeholder={`Paste or type Chinese text here.
- Hover words to see dictionary definitions
- Save notes to access them later from the sidebar
- You can even put a title!

Shortcuts:
- Ctrl + S → Save Note
- Ctrl + T → New Note`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onInput={handleEditorInput}
          spellCheck={false}
          className="h-full min-h-0 w-full resize-none overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-[var(--border)] bg-[var(--paper)] px-6 py-6 text-lg leading-8 text-[var(--paper-foreground)] shadow outline-none transition empty:before:pointer-events-none empty:before:text-[var(--placeholder)] empty:before:content-[attr(data-placeholder)] focus:border-[var(--border-hover)] focus:ring-4 focus:ring-[var(--ring)] placeholder:text-[var(--placeholder)]"
        />

        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-md">
          {popup ? (
            <DictionaryPopup
              anchorRect={popup.anchorRect}
              containerRect={popup.containerRect}
              result={popup.result}
            />
          ) : null}
        </div>
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
  const normalizedPosition = normalizeCaretPosition(
    range,
    root,
    clientX,
    clientY,
  );
  if (!normalizedPosition) {
    return null;
  }

  const normalizedTextNode = normalizedPosition.textNode;
  const rangeOffset = normalizedPosition.offset;
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
    hoveredCharacterRect: rectToObject(normalizedPosition.rect),
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
const HORIZONTAL_TOLERANCE_PX = 4;
const VERTICAL_TOLERANCE_PX = 4;
const HOVER_GRACE_DISTANCE_PX = 2;

function isPointOverText(
  textNode: Text,
  offset: number,
  clientX: number,
  clientY: number,
) {
  return Boolean(getCharacterRectAtOffset(textNode, offset)) &&
    isPointOverCharacter(textNode, offset, clientX, clientY);
}

function normalizeCaretPosition(
  range: Range,
  root: HTMLElement,
  clientX: number,
  clientY: number,
) {
  if (!root.contains(range.startContainer)) {
    return null;
  }

  return findHoveredCharacterPosition(
    getCaretCharacterCandidates(range, root),
    clientX,
    clientY,
  );
}

type TextPosition = {
  textNode: Text;
  offset: number;
};

type CharacterHitCandidate = TextPosition & {
  distance: number;
  rect: DOMRect;
};

function getCaretCharacterCandidates(range: Range, root: HTMLElement) {
  const textNodes = getTextNodes(root);
  const rangeNode = range.startContainer;
  const rangeOffset = range.startOffset;

  if (rangeNode.nodeType === Node.TEXT_NODE) {
    const textNode = rangeNode as Text;
    const candidates: Array<TextPosition | null> = [
      { textNode, offset: rangeOffset },
      { textNode, offset: rangeOffset - 1 },
    ];

    if (rangeOffset <= 0) {
      candidates.push(findPreviousCharacterPosition(textNodes, textNode));
    }

    if (rangeOffset >= textNode.data.length) {
      candidates.push(findNextCharacterPosition(textNodes, textNode));
    }

    return uniqueValidTextPositions(candidates);
  }

  return uniqueValidTextPositions([
    findNextCharacterPositionFromBoundary(textNodes, range),
    findPreviousCharacterPositionFromBoundary(textNodes, range),
  ]);
}

function getTextNodes(root: HTMLElement) {
  const textNodes: Text[] = [];
  const nodeIterator = document.createNodeIterator(root, NodeFilter.SHOW_TEXT);
  let node = nodeIterator.nextNode() as Text | null;

  while (node) {
    if (node.data.length > 0) {
      textNodes.push(node);
    }

    node = nodeIterator.nextNode() as Text | null;
  }

  return textNodes;
}

function findPreviousCharacterPosition(textNodes: Text[], textNode: Text) {
  const index = textNodes.indexOf(textNode);
  const previousTextNode = index > 0 ? textNodes[index - 1] : null;
  const root = editorRefFromTextNode(textNode);

  return previousTextNode && root && isSameLine(root, textNode, previousTextNode)
    ? {
        textNode: previousTextNode,
        offset: previousTextNode.data.length - 1,
      }
    : null;
}

function findNextCharacterPosition(textNodes: Text[], textNode: Text) {
  const index = textNodes.indexOf(textNode);
  const nextTextNode =
    index >= 0 && index < textNodes.length - 1 ? textNodes[index + 1] : null;
  const root = editorRefFromTextNode(textNode);

  return nextTextNode && root && isSameLine(root, textNode, nextTextNode)
    ? { textNode: nextTextNode, offset: 0 }
    : null;
}

function findNextCharacterPositionFromBoundary(
  textNodes: Text[],
  range: Range,
) {
  for (const textNode of textNodes) {
    if (compareTextPointToRange(textNode, 0, range) >= 0) {
      return { textNode, offset: 0 };
    }
  }

  return null;
}

function findPreviousCharacterPositionFromBoundary(
  textNodes: Text[],
  range: Range,
) {
  let previousPosition: TextPosition | null = null;

  for (const textNode of textNodes) {
    if (compareTextPointToRange(textNode, textNode.data.length, range) <= 0) {
      previousPosition = {
        textNode,
        offset: textNode.data.length - 1,
      };
    }
  }

  return previousPosition;
}

function compareTextPointToRange(textNode: Text, offset: number, range: Range) {
  const pointRange = document.createRange();
  pointRange.setStart(textNode, offset);
  pointRange.collapse(true);
  const result = pointRange.compareBoundaryPoints(Range.START_TO_START, range);
  pointRange.detach();

  return result;
}

function uniqueValidTextPositions(positions: Array<TextPosition | null>) {
  const uniquePositions: TextPosition[] = [];

  for (const position of positions) {
    if (
      position &&
      position.offset >= 0 &&
      position.offset < position.textNode.data.length &&
      !uniquePositions.some(
        (item) =>
          item.textNode === position.textNode && item.offset === position.offset,
      )
    ) {
      uniquePositions.push(position);
    }
  }

  return uniquePositions;
}

function findHoveredCharacterPosition(
  positions: TextPosition[],
  clientX: number,
  clientY: number,
) {
  let closestCandidate: CharacterHitCandidate | null = null;

  for (const position of positions) {
    const candidate = getCharacterHitCandidate(
      position.textNode,
      position.offset,
      clientX,
      clientY,
    );

    if (
      candidate &&
      (!closestCandidate || candidate.distance < closestCandidate.distance)
    ) {
      closestCandidate = candidate;
    }
  }

  return closestCandidate;
}

function getCharacterHitCandidate(
  textNode: Text,
  offset: number,
  clientX: number,
  clientY: number,
) {
  if (!isPointOverCharacter(textNode, offset, clientX, clientY)) {
    return null;
  }

  const rect = getCharacterRectAtOffset(textNode, offset);
  if (!rect) {
    return null;
  }

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = centerX - clientX;
  const dy = centerY - clientY;

  return {
    textNode,
    offset,
    distance: Math.sqrt(dx * dx + dy * dy),
    rect,
  };
}

function isPointOverCharacter(
  textNode: Text,
  offset: number,
  clientX: number,
  clientY: number,
) {
  const rect = getCharacterRectAtOffset(textNode, offset);
  if (!rect) {
    return false;
  }

  return (
    clientX >= rect.left - HORIZONTAL_TOLERANCE_PX &&
    clientX <= rect.right + HORIZONTAL_TOLERANCE_PX &&
    clientY >= rect.top - VERTICAL_TOLERANCE_PX &&
    clientY <= rect.bottom + VERTICAL_TOLERANCE_PX
  );
}

function getCharacterRectAtOffset(textNode: Text, offset: number) {
  if (offset < 0 || offset >= textNode.data.length) {
    return null;
  }

  const character = getCharacterAtOffset(textNode.data, offset);
  if (!character) {
    return null;
  }

  const range = document.createRange();
  range.setStart(textNode, offset);
  range.setEnd(textNode, offset + character.length);

  const rect = range.getBoundingClientRect();
  range.detach();

  return rect.width > 0 && rect.height > 0 ? rect : null;
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
      if (!isSameLine(root, startNode, node)) {
        break;
      }

      const startOffset = node === startNode ? offset : 0;
      text += getTextUntilHardBreak(
        node,
        startOffset,
        maxLength - text.length,
      );

      if (hasHardBreakAfterOffset(node, startOffset)) {
        break;
      }
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
    return false;
  }

  const range = document.createRange();
  range.setStart(rangeStartNode, rangeStartOffset);
  range.setEnd(rangeEnd.node, rangeEnd.offset);
  const selection = window.getSelection();
  if (!selection) {
    range.detach();
    return false;
  }

  if (
    !selection.isCollapsed &&
    hoverSelectionText.current !== selection.toString()
  ) {
    range.detach();
    return false;
  }

  selection.removeAllRanges();
  selection.addRange(range);
  hoverSelectionText.current = selection.toString();

  return true;
}

function getMatchAnchorRect(
  rangeStartNode: Text,
  rangeStartOffset: number,
  matchLen: number,
  hoveredCharacterRect: PopupRect,
) {
  const rangeEnd = findRangeEnd(rangeStartNode, rangeStartOffset, matchLen);
  if (!rangeEnd) {
    return hoveredCharacterRect;
  }

  const range = document.createRange();
  range.setStart(rangeStartNode, rangeStartOffset);
  range.setEnd(rangeEnd.node, rangeEnd.offset);

  const rects = Array.from(range.getClientRects()).filter(
    (rect) => rect.width > 0 && rect.height > 0,
  );
  range.detach();

  if (rects.length === 0) {
    return hoveredCharacterRect;
  }

  const hoveredCenterX =
    hoveredCharacterRect.left + hoveredCharacterRect.width / 2;
  const hoveredCenterY =
    hoveredCharacterRect.top + hoveredCharacterRect.height / 2;
  const containingRect = rects.find(
    (rect) =>
      hoveredCenterX >= rect.left &&
      hoveredCenterX <= rect.right &&
      hoveredCenterY >= rect.top &&
      hoveredCenterY <= rect.bottom,
  );

  if (containingRect) {
    return rectToObject(containingRect);
  }

  const closestRect = rects.reduce((closest, rect) => {
    const closestCenterY = closest.top + closest.height / 2;
    const rectCenterY = rect.top + rect.height / 2;

    return Math.abs(rectCenterY - hoveredCenterY) <
      Math.abs(closestCenterY - hoveredCenterY)
      ? rect
      : closest;
  });

  return rectToObject(closestRect);
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
    const lineBreakIndex = node.data.indexOf("\n", offset);
    const available =
      (lineBreakIndex === -1 ? node.data.length : lineBreakIndex) - offset;
    if (remaining <= available) {
      return {
        node,
        offset: offset + remaining,
      };
    }

    if (lineBreakIndex !== -1) {
      return null;
    }

    remaining -= available;
    node = findNextTextNode(editorRefFromTextNode(startNode), node, startNode);
    offset = 0;
  }

  return null;
}

function editorRefFromTextNode(node: Text) {
  const root = node.parentElement?.closest("[contenteditable='true']");
  return root instanceof HTMLElement ? root : null;
}

function findNextTextNode(
  root: HTMLElement | null,
  previous: Text,
  flowStart?: Text,
) {
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

  const nextNode = nodeIterator.nextNode() as Text | null;
  if (
    nextNode &&
    flowStart &&
    (!root || !isSameLine(root, flowStart, nextNode))
  ) {
    return null;
  }

  return nextNode;
}

function isSameLine(root: HTMLElement, firstNode: Text, secondNode: Text) {
  return getLineContainer(root, firstNode) === getLineContainer(root, secondNode);
}

function getLineContainer(root: HTMLElement, node: Text) {
  let current: Node | null = node;

  while (current?.parentNode && current.parentNode !== root) {
    current = current.parentNode;
  }

  return current;
}

function getTextUntilHardBreak(node: Text, offset: number, maxLength: number) {
  const lineBreakIndex = node.data.indexOf("\n", offset);
  const endOffset =
    lineBreakIndex === -1
      ? offset + maxLength
      : Math.min(lineBreakIndex, offset + maxLength);

  return node.data.substring(offset, endOffset);
}

function hasHardBreakAfterOffset(node: Text, offset: number) {
  return node.data.indexOf("\n", offset) !== -1;
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
