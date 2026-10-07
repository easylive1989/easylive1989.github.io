import type { Book } from './notion';

export type BookStatus = 'reading' | 'read' | 'unstarted';
export type BookKind = 'eng' | 'mind' | 'growth' | 'biz' | 'life' | 'other';

export function bookStatus(b: Book): BookStatus {
  if (b.progress >= 100) return 'read';
  if (b.progress > 0) return 'reading';
  return 'unstarted';
}

export function bookFinishedYear(b: Book): number | null {
  if (!b.finishedDate) return null;
  const d = new Date(b.finishedDate);
  if (Number.isNaN(d.getTime())) return null;
  return d.getFullYear();
}

export function bookFinishedQuarter(b: Book): 1 | 2 | 3 | 4 | null {
  if (!b.finishedDate) return null;
  const d = new Date(b.finishedDate);
  if (Number.isNaN(d.getTime())) return null;
  const m = d.getMonth();
  return (Math.floor(m / 3) + 1) as 1 | 2 | 3 | 4;
}

/**
 * The reading list's 類型 in Notion, in the order the shelves and the filter run,
 * each with the kind its books are marked in. A category missing from this list is
 * marked as `other` and goes after all of them.
 */
export const BOOK_CATEGORIES: ReadonlyArray<{ name: string; kind: BookKind }> = [
  { name: '軟體工程', kind: 'eng' },
  { name: '思維模型', kind: 'mind' },
  { name: '自我進化', kind: 'growth' },
  { name: '商業策略', kind: 'biz' },
  { name: '財富人文', kind: 'life' },
];

/** Where a category stands in the shelving order. */
export function categoryRank(name: string | undefined): number {
  const i = BOOK_CATEGORIES.findIndex((c) => c.name === name);
  return i < 0 ? BOOK_CATEGORIES.length : i;
}

export function normaliseKind(rawCategory: string | undefined): BookKind {
  return BOOK_CATEGORIES.find((c) => c.name === rawCategory)?.kind ?? 'other';
}

const PALETTES: Record<BookKind, Array<{ from: string; to: string }>> = {
  eng: [
    { from: '#2a4a70', to: '#0e1f33' },
    { from: '#1c5040', to: '#0a2218' },
    { from: '#3a5566', to: '#1c2c38' },
    { from: '#3a5a6a', to: '#152228' },
    { from: '#1a5a8c', to: '#0a2238' },
    { from: '#1a1a1a', to: '#0a0a0a' },
  ],
  mind: [
    { from: '#1f5d6b', to: '#0d2a32' },
    { from: '#3a6a8c', to: '#152838' },
    { from: '#c87d3a', to: '#5a3818' },
    { from: '#3a6850', to: '#152b22' },
  ],
  biz: [
    { from: '#8c6a3a', to: '#3a2810' },
    { from: '#c7572f', to: '#7a2410' },
    { from: '#4a3a55', to: '#1f1828' },
    { from: '#d6a35a', to: '#7a5320' },
    { from: '#2a4a6a', to: '#0e1c2a' },
    { from: '#7d3a2a', to: '#3a1410' },
  ],
  growth: [
    { from: '#a8688a', to: '#5a2c45' },
    { from: '#3a2a6a', to: '#15102a' },
    { from: '#1a3a3a', to: '#0a1818' },
    { from: '#1a2a5a', to: '#0a0f24' },
  ],
  life: [
    { from: '#4a5a2a', to: '#1f2810' },
    { from: '#2e4a3a', to: '#12201a' },
    { from: '#6b5a2a', to: '#2e2410' },
    { from: '#3a5a4a', to: '#15241c' },
  ],
  other: [
    { from: '#3a4a5a', to: '#15202b' },
    { from: '#5a3a8c', to: '#241540' },
    { from: '#7d6a3a', to: '#3a2f17' },
  ],
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function coverGradient(b: Book): { from: string; to: string; kind: BookKind } {
  const kind = normaliseKind(b.categories[0]);
  const palette = PALETTES[kind];
  const idx = hashString(b.title) % palette.length;
  return { ...palette[idx], kind };
}
