import type { NotionBlock } from './notion';

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

function richTextOf(block: any): any[] {
  const data = block[block.type];
  if (!data) return [];
  if (Array.isArray(data.rich_text)) return data.rich_text;
  if (Array.isArray(data.caption)) return data.caption;
  return [];
}

function plainTextOf(block: any): string {
  const rt = richTextOf(block);
  return rt.map((t: any) => t.plain_text ?? '').join('');
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w一-鿿-]/g, '')
    .replace(/^-+|-+$/g, '');
}

function walk(blocks: NotionBlock[], visit: (b: NotionBlock) => void): void {
  for (const b of blocks) {
    visit(b);
    if (b.children?.length) walk(b.children, visit);
  }
}

export function extractToc(blocks: NotionBlock[]): TocItem[] {
  const toc: TocItem[] = [];
  for (const b of blocks) {
    let level: 1 | 2 | 3 | null = null;
    if (b.type === 'heading_1') level = 1;
    else if (b.type === 'heading_2') level = 2;
    else if (b.type === 'heading_3') level = 3;
    if (!level) continue;
    const text = plainTextOf(b as any);
    if (!text.trim()) continue;
    toc.push({ level, text, id: slugify(text) });
  }
  return toc;
}

export function computeMeta(blocks: NotionBlock[]): ArticleMeta {
  let chars = 0;
  let asciiWords = 0;
  walk(blocks, (b) => {
    if (b.type === 'image' || b.type === 'video' || b.type === 'divider' || b.type === 'bookmark') return;
    const text = plainTextOf(b as any);
    if (!text) return;
    chars += [...text].length;
    asciiWords += (text.match(/[A-Za-z0-9]+/g) ?? []).length;
  });

  // Mixed-language read speed:
  //   Chinese ~350 chars/min, English ~220 words/min.
  // Approximate by treating each CJK char as 1 unit and each ascii word as ~1.6 chars equivalent.
  const cjkChars = chars - asciiWords;
  const equivalentChars = Math.max(0, cjkChars) + asciiWords * 1.6;
  const readMinutes = Math.max(1, Math.round(equivalentChars / 350));

  const toc = extractToc(blocks);
  return { chars, words: asciiWords, readMinutes, toc };
}
