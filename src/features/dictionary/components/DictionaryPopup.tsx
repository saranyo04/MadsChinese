import type { WordSearchResult } from "../types/dictionary.types";

type DictionaryPopupProps = {
  result: WordSearchResult;
  x: number;
  y: number;
  containerRect: DOMRect;
};

const popupHeight = 120;
const popupWidth = 320;
const cursorGap = 12;

export function DictionaryPopup({
  result,
  x,
  y,
  containerRect,
}: DictionaryPopupProps) {
  const entries = result.entries.slice(0, 3);
  const showAbove = y > popupHeight + cursorGap;
  const left = Math.min(
    Math.max(x - containerRect.left + cursorGap, 8),
    Math.max(containerRect.width - popupWidth - 8, 8),
  );
  const top = showAbove
    ? y - containerRect.top - popupHeight - cursorGap
    : y - containerRect.top + cursorGap;

  return (
    <div
      className="absolute z-20 max-w-[320px] rounded border border-stone-300 bg-[#FFFFC8] px-3 py-2 text-stone-950 shadow-md"
      style={{ left, top }}
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
