export interface TocItem {
  level: 1 | 2 | 3;
  text: string;
  id: string;
}

export interface ArticleMeta {
  chars: number;
  words: number;
  readMinutes: number;
  toc: TocItem[];
}
