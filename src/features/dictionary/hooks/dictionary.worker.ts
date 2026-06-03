import { DictionaryLookup } from "../lib/lookup";
import type {
  DictionaryWorkerRequest,
  DictionaryWorkerResponse,
} from "../types/dictionary-worker.types";

type KeywordMap = Record<string, number>;

let dictionary: DictionaryLookup | null = null;
let dictionaryPromise: Promise<DictionaryLookup> | null = null;

self.onmessage = async (event: MessageEvent<DictionaryWorkerRequest>) => {
  const request = event.data;

  try {
    if (request.type === "load") {
      await loadDictionary();
      postResponse({
        type: "loaded",
        requestId: request.requestId,
      });
      return;
    }

    if (request.type === "search") {
      const loadedDictionary = dictionary ?? (await loadDictionary());
      postResponse({
        type: "searchResult",
        requestId: request.requestId,
        result: loadedDictionary.wordSearch(request.text),
      });
    }
  } catch (error) {
    console.error("Dictionary worker request crashed", error);
    postResponse({
      type: "error",
      requestId: request.requestId,
      error: error instanceof Error ? error.message : "Dictionary worker error",
    });
  }
};

function postResponse(response: DictionaryWorkerResponse) {
  try {
    self.postMessage(response);
  } catch (error) {
    console.error("Dictionary worker response postMessage failed", error);
  }
}

function loadDictionary() {
  if (dictionary) {
    return Promise.resolve(dictionary);
  }

  if (!dictionaryPromise) {
    dictionaryPromise = loadDictionaryData().then(
      ([wordDict, wordIndex, grammarKeywords, vocabKeywords]) => {
        dictionary = new DictionaryLookup(
          wordDict,
          wordIndex,
          grammarKeywords,
          vocabKeywords,
        );

        return dictionary;
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
  return import.meta.env.DEV ? `/${fileName}` : `../${fileName}`;
}

async function fetchDictionaryText(fileName: string) {
  const assetPath = dictionaryAssetPath(fileName);
  const response = await fetch(assetPath);
  if (!response.ok) {
    throw new Error(`Unable to load ${fileName} from ${assetPath}`);
  }

  return response.text();
}

async function fetchDictionaryJson(fileName: string): Promise<KeywordMap> {
  const assetPath = dictionaryAssetPath(fileName);
  const response = await fetch(assetPath);
  if (!response.ok) {
    throw new Error(`Unable to load ${fileName} from ${assetPath}`);
  }

  return response.json();
}
