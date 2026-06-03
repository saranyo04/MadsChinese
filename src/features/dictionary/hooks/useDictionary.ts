import { useEffect, useState } from "react";

import type { WordSearchResult } from "../types/dictionary.types";
import type {
  DictionaryWorkerRequest,
  DictionaryWorkerResponse,
} from "../types/dictionary-worker.types";

type PendingRequest<T> = {
  reject: (error: Error) => void;
  resolve: (value: T) => void;
};

let worker: Worker | null = null;
let requestId = 0;
let isLoaded = false;
let loadPromise: Promise<void> | null = null;
const pendingRequests = new Map<number, PendingRequest<unknown>>();

export function useDictionary() {
  const [loading, setLoading] = useState(!isLoaded);

  useEffect(() => {
    let isMounted = true;

    loadDictionary()
      .catch((error) => {
        console.error("Dictionary worker startup failed", error);
      })
      .finally(() => {
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
    wordSearch(text: string): Promise<WordSearchResult | null> {
      if (!isLoaded) {
        return Promise.resolve(null);
      }

      return searchDictionary(text);
    },
  };
}

function loadDictionary() {
  if (isLoaded) {
    return Promise.resolve();
  }

  if (!loadPromise) {
    loadPromise = sendWorkerRequest<void>({
      type: "load",
      requestId: nextRequestId(),
    })
      .then(() => {
        isLoaded = true;
      });
  }

  return loadPromise;
}

function searchDictionary(text: string) {
  return sendWorkerRequest<WordSearchResult | null>({
    type: "search",
    requestId: nextRequestId(),
    text,
  });
}

function sendWorkerRequest<T>(request: DictionaryWorkerRequest) {
  return new Promise<T>((resolve, reject) => {
    pendingRequests.set(request.requestId, {
      resolve: resolve as PendingRequest<unknown>["resolve"],
      reject,
    });

    try {
      getWorker().postMessage(request);
    } catch (error) {
      pendingRequests.delete(request.requestId);
      console.error("Dictionary worker postMessage failed", error);
      reject(error instanceof Error ? error : new Error("postMessage failed"));
    }
  });
}

function getWorker() {
  if (!worker) {
    try {
      worker = new Worker(new URL("./dictionary.worker.ts", import.meta.url), {
        type: "module",
      });
    } catch (error) {
      console.error("Dictionary worker initialization failed", error);
      throw error;
    }
    worker.onmessage = handleWorkerMessage;
    worker.onerror = (event) => {
      console.error("Dictionary worker error", event);
    };
    worker.onmessageerror = (event) => {
      console.error("Dictionary worker message error", event);
    };
  }

  return worker;
}

function handleWorkerMessage(event: MessageEvent<DictionaryWorkerResponse>) {
  try {
    const response = event.data;
    const pendingRequest = pendingRequests.get(response.requestId);
    if (!pendingRequest) {
      return;
    }

    pendingRequests.delete(response.requestId);

    if (response.type === "error") {
      console.error("Dictionary worker request failed", response.error);
      pendingRequest.reject(new Error(response.error));
      return;
    }

    if (response.type === "loaded") {
      pendingRequest.resolve(undefined);
      return;
    }

    pendingRequest.resolve(response.result);
  } catch (error) {
    console.error("Dictionary worker message handling failed", error);
  }
}

function nextRequestId() {
  requestId += 1;
  return requestId;
}
