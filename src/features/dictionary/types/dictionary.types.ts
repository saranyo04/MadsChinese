export type DictionaryEntry = {
  traditional: string;
  simplified: string;
  pinyin: string;
  definitions: string[];
  matchedText: string;
  raw: string;
};

export type WordSearchResult = {
  entries: DictionaryEntry[];
  matchLen: number;
  more?: boolean;
};
