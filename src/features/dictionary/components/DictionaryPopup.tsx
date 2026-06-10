import { useLayoutEffect, useRef, useState } from "react";

import type { WordSearchResult } from "../types/dictionary.types";

type DictionaryPopupProps = {
  result: WordSearchResult;
  anchorRect: PopupRect;
  containerRect: PopupRect;
};

type PopupRect = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

type PopupSize = {
  height: number;
  width: number;
};

const popupGap = 8;
const boundaryPadding = 8;

export function DictionaryPopup({
  anchorRect,
  result,
  containerRect,
}: DictionaryPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupSize, setPopupSize] = useState<PopupSize | null>(null);
  const entries = result.entries.slice(0, 3);

  useLayoutEffect(() => {
    if (!popupRef.current) {
      return;
    }

    const nextSize = {
      height: popupRef.current.offsetHeight,
      width: popupRef.current.offsetWidth,
    };

    setPopupSize((currentSize) => {
      if (
        currentSize?.height === nextSize.height &&
        currentSize.width === nextSize.width
      ) {
        return currentSize;
      }

      return nextSize;
    });
  }, [result]);

  const width = popupSize?.width ?? 0;
  const height = popupSize?.height ?? 0;
  const left = getHorizontalPosition(anchorRect, containerRect, width);
  const spaceBelow = containerRect.bottom - anchorRect.bottom;
  const showBelow = popupSize ? spaceBelow >= height + popupGap : true;
  const preferredTop = showBelow
    ? anchorRect.bottom - containerRect.top + popupGap
    : anchorRect.top - containerRect.top - height - popupGap;
  const top = clamp(
    preferredTop,
    boundaryPadding,
    containerRect.height - height - boundaryPadding,
  );

  return (
    <div
      ref={popupRef}
      className="pointer-events-none absolute z-20 w-max max-w-[320px] rounded border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--foreground)] shadow-md"
      style={{
        left,
        top,
        visibility: popupSize ? "visible" : "hidden",
      }}
    >
      <div>
        {entries.map((entry) => (
          <div
            className="border-t border-[var(--border)] py-2 first:border-t-0 first:pt-0 last:pb-0"
            key={`${entry.traditional}-${entry.pinyin}-${entry.raw}`}
          >
            <div className="text-xl leading-none">
              {formatChinese(entry.traditional, entry.simplified)}
            </div>
            <div className="mt-1 text-sm font-medium">
              {entry.pinyin.split(/\s+/).map((syllable, index) => (
                <span
                  className={toneClassName(syllable)}
                  key={`${syllable}-${index}`}
                >
                  {stripToneNumber(syllable)}
                  {index < entry.pinyin.split(/\s+/).length - 1 ? " " : ""}
                </span>
              ))}
            </div>
            <div className="mt-1 text-xs font-normal leading-4 text-[var(--muted-foreground)]">
              {entry.definitions.join("; ")}
            </div>
          </div>
        ))}
      </div>

      {result.more ? (
        <div className="mt-2 text-xs text-[var(--muted-foreground)]">
          More entries available
        </div>
      ) : null}
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function getHorizontalPosition(
  anchorRect: PopupRect,
  containerRect: PopupRect,
  popupWidth: number,
) {
  const rightSideLeft = anchorRect.left - containerRect.left;
  const leftSideLeft = anchorRect.left - containerRect.left - popupWidth - popupGap;
  const maxLeft = containerRect.width - popupWidth - boundaryPadding;

  if (rightSideLeft + popupWidth <= containerRect.width - boundaryPadding) {
    return rightSideLeft;
  }

  if (leftSideLeft >= boundaryPadding) {
    return leftSideLeft;
  }

  return clamp(leftSideLeft, boundaryPadding, maxLeft);
}

function formatChinese(traditional: string, simplified: string) {
  if (traditional === simplified) {
    return simplified;
  }

  return `${traditional} ${simplified}`;
}

function stripToneNumber(syllable: string) {
  return syllable.replace(/[1-5]$/, "");
}

function toneClassName(syllable: string) {
  const tone = syllable.match(/[1-5]$/)?.[0];

  switch (tone) {
    case "1":
      return "text-[var(--tone-1)]";
    case "2":
      return "text-[var(--tone-2)]";
    case "3":
      return "text-[var(--tone-3)]";
    case "4":
      return "text-[var(--tone-4)]";
    default:
      return "text-[var(--tone-5)]";
  }
}
