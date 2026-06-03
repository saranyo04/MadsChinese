import { useEffect, useState } from "react";

import { ZhongwenDictionary } from "../lib/lookup";
import type { WordSearchResult } from "../types/dictionary.types";

type KeywordMap = Record<string, number>;

let dictionaryPromise: Promise<ZhongwenDictionary> | null = null;
let loadedDictionary: ZhongwenDictionary | null = null;

export function useDictionary() {
  const [dictionary, setDictionary] = useState<ZhongwenDictionary | null>(
    loadedDictionary,
  );
  const [loading, setLoading] = useState(!loadedDictionary);

  useEffect(() => {
    let isMounted = true;

    loadDictionary()
      .then((loaded) => {
        if (isMounted) {
          setDictionary(loaded);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    loading,
    wordSearch(text: string): WordSearchResult | null {
      return dictionary?.wordSearch(text) ?? null;
    },
  };
}

function loadDictionary() {
  if (loadedDictionary) {
    return Promise.resolve(loadedDictionary);
  }

  if (!dictionaryPromise) {
    dictionaryPromise = loadDictionaryData().then(
      ([wordDict, wordIndex, grammarKeywords, vocabKeywords]) => {
        loadedDictionary = new ZhongwenDictionary(
          wordDict,
          wordIndex,
          grammarKeywords,
          vocabKeywords,
        );

        return loadedDictionary;
      },
    );
  }

  return dictionaryPromise;
}

async function loadDictionaryData(): Promise<
  [string, string, KeywordMap, KeywordMap]
> {
  const [wordDict, wordIndex, grammarKeywords, vocabKeywords] =
    await Promise.all([
      fetchDictionaryText("cedict_ts.u8"),
      fetchDictionaryText("cedict.idx"),
      fetchDictionaryJson("grammarKeywordsMin.json"),
      fetchDictionaryJson("vocabularyKeywordsMin.json"),
    ]);

  return [wordDict, wordIndex, grammarKeywords, vocabKeywords];
}

function dictionaryAssetPath(fileName: string) {
  return import.meta.env.DEV ? `/${fileName}` : `./${fileName}`;
}

async function fetchDictionaryText(fileName: string) {
  const response = await fetch(dictionaryAssetPath(fileName));
  if (!response.ok) {
    throw new Error(`Unable to load ${fileName}`);
  }

  return response.text();
}

async function fetchDictionaryJson(fileName: string): Promise<KeywordMap> {
  const response = await fetch(dictionaryAssetPath(fileName));
  if (!response.ok) {
    throw new Error(`Unable to load ${fileName}`);
  }

  return response.json();
}
