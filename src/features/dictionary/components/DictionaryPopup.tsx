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
  const left = clamp(
    anchorRect.left - containerRect.left,
    boundaryPadding,
    containerRect.width - width - boundaryPadding,
  );
  const spaceAbove = anchorRect.top - containerRect.top;
  const showAbove = popupSize ? spaceAbove >= height + popupGap : true;
  const preferredTop = showAbove
    ? anchorRect.top - containerRect.top - height - popupGap
    : anchorRect.bottom - containerRect.top + popupGap;
  const top = clamp(
    preferredTop,
    boundaryPadding,
    containerRect.height - height - boundaryPadding,
  );

  return (
    <div
      ref={popupRef}
      className="pointer-events-none absolute z-20 max-w-[320px] rounded border border-stone-300 bg-[#FFFFC8] px-3 py-2 text-stone-950 shadow-md"
      style={{ left, top, visibility: popupSize ? "visible" : "hidden" }}
    >
      <div>
        {entries.map((entry) => (
          <div
            className="border-t border-stone-300 py-2 first:border-t-0 first:pt-0 last:pb-0"
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
            <div className="mt-1 text-xs font-normal leading-4 text-stone-800">
              {entry.definitions.join("; ")}
            </div>
          </div>
        ))}
      </div>

      {result.more ? (
        <div className="mt-2 text-xs text-stone-400">More entries available</div>
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
      return "text-red-600";
    case "2":
      return "text-orange-500";
    case "3":
      return "text-green-600";
    case "4":
      return "text-blue-600";
    default:
      return "text-stone-500";
  }
}
