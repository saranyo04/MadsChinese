import type {
  DictionaryEntry,
  WordSearchResult,
} from "../types/dictionary.types";

type KeywordMap = Record<string, number>;

export class DictionaryLookup {
  private cache: Record<string, string[]> = {};

  constructor(
    private wordDict: string,
    private wordIndex: string,
    private grammarKeywords: KeywordMap,
    private vocabKeywords: KeywordMap,
  ) {}

  static find(needle: string, haystack: string) {
    let beg = 0;
    let end = haystack.length - 1;

    while (beg < end) {
      const mi = Math.floor((beg + end) / 2);
      const i = haystack.lastIndexOf("\n", mi) + 1;

      const mis = haystack.substring(i, i + needle.length);
      if (needle < mis) {
        end = i - 1;
      } else if (needle > mis) {
        beg = haystack.indexOf("\n", mi + 1) + 1;
      } else {
        return haystack.substring(i, haystack.indexOf("\n", mi + 1));
      }
    }

    return null;
  }

  hasGrammarKeyword(keyword: string) {
    return this.grammarKeywords[keyword];
  }

  hasVocabKeyword(keyword: string) {
    return this.vocabKeywords[keyword];
  }

  wordSearch(text: string, max = 7): WordSearchResult | null {
    const entries: DictionaryEntry[] = [];
    let word = text;
    let count = 0;
    let matchLen = 0;
    let more = false;

    while (word.length > 0) {
      let indexEntry = this.cache[word];

      if (!indexEntry) {
        const foundEntry = DictionaryLookup.find(`${word},`, this.wordIndex);
        if (!foundEntry) {
          this.cache[word] = [];
          continue;
        }

        indexEntry = foundEntry.split(",");
        this.cache[word] = indexEntry;
      }

      for (let index = 1; index < indexEntry.length; index++) {
        const offset = Number(indexEntry[index]);
        const dictionaryLine = this.wordDict.substring(
          offset,
          this.wordDict.indexOf("\n", offset),
        );

        if (count >= max) {
          more = true;
          word = "";
          break;
        }

        const parsedEntry = parseDictionaryLine(dictionaryLine, word);
        if (parsedEntry) {
          count++;
          if (matchLen === 0) {
            matchLen = word.length;
          }

          entries.push(parsedEntry);
        }
      }

      word = word.substring(0, word.length - 1);
    }

    if (entries.length === 0) {
      return null;
    }

    return {
      entries,
      matchLen,
      more: more || undefined,
    };
  }
}

function parseDictionaryLine(
  line: string,
  matchedText: string,
): DictionaryEntry | null {
  const entry = line.match(/^([^\s]+?)\s+([^\s]+?)\s+\[(.*?)\]\s*\/(.+)\/\r?$/);
  if (!entry) {
    return null;
  }

  return {
    traditional: entry[1],
    simplified: entry[2],
    pinyin: entry[3],
    definitions: entry[4].split("/").filter(Boolean),
    matchedText,
    raw: line,
  };
}
