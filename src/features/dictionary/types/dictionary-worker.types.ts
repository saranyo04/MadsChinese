import type { WordSearchResult } from "./dictionary.types";

export type DictionaryWorkerRequest =
  | {
      type: "load";
      requestId: number;
    }
  | {
      type: "search";
      requestId: number;
      text: string;
    };

export type DictionaryWorkerResponse =
  | {
      type: "loaded";
      requestId: number;
    }
  | {
      type: "searchResult";
      requestId: number;
      result: WordSearchResult | null;
    }
  | {
      type: "error";
      requestId: number;
      error: string;
    };
