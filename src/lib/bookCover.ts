import type { Book } from './notion';

export type BookStatus = 'reading' | 'read' | 'unstarted';
export type BookKind = 'tech' | 'design' | 'non' | 'fic' | 'other';

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

const KIND_KEYWORDS: Array<[BookKind, string[]]> = [
  ['tech',   ['技術', 'tech', 'programming', '程式', '軟體', '工程']],
  ['design', ['設計', '管理', 'design', 'management']],
  ['non',    ['非虛構', '社會', '歷史', '科普', 'non-fiction', 'nonfiction', '財經', '商業']],
  ['fic',    ['小說', 'fiction', '文學', '散文', '詩']],
];

export function normaliseKind(rawCategory: string | undefined): BookKind {
  if (!rawCategory) return 'other';
  const lower = rawCategory.toLowerCase();
  for (const [kind, keywords] of KIND_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) return kind;
  }
  return 'other';
}

const PALETTES: Record<BookKind, Array<{ from: string; to: string }>> = {
  tech: [
    { from: '#2a4a70', to: '#0e1f33' },
    { from: '#1c5040', to: '#0a2218' },
    { from: '#3a5566', to: '#1c2c38' },
    { from: '#3a5a6a', to: '#152228' },
    { from: '#1a5a8c', to: '#0a2238' },
    { from: '#1a1a1a', to: '#0a0a0a' },
  ],
  design: [
    { from: '#1f5d6b', to: '#0d2a32' },
    { from: '#3a6a8c', to: '#152838' },
    { from: '#c87d3a', to: '#5a3818' },
    { from: '#3a6850', to: '#152b22' },
  ],
  non: [
    { from: '#8c6a3a', to: '#3a2810' },
    { from: '#c7572f', to: '#7a2410' },
    { from: '#4a3a55', to: '#1f1828' },
    { from: '#d6a35a', to: '#7a5320' },
    { from: '#2a4a6a', to: '#0e1c2a' },
    { from: '#7d3a2a', to: '#3a1410' },
  ],
  fic: [
    { from: '#a8688a', to: '#5a2c45' },
    { from: '#3a2a6a', to: '#15102a' },
    { from: '#1a3a3a', to: '#0a1818' },
    { from: '#1a2a5a', to: '#0a0f24' },
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
