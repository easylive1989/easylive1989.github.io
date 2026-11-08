import type { NotionBlock } from './notion';

/**
 * What a page says about itself to a search engine, a feed reader or a link preview, when Notion holds no summary for it:
 * the opening of its text, and its first picture.
 */

/** Blocks whose words are the page's prose; headings, code and tables say little on their own. */
const PROSE = new Set(['paragraph', 'bulleted_list_item', 'numbered_list_item', 'quote', 'callout', 'to_do', 'toggle']);
const SKIP_CHILDREN = new Set(['code', 'table', 'column_list', 'synced_block', 'child_page', 'child_database']);

function textOf(block: NotionBlock): string {
  const data = (block as any)[block.type];
  const rich = Array.isArray(data?.rich_text) ? data.rich_text : [];
  return rich
    .map((t: any) => t.plain_text ?? '')
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The first `max` or so characters of the page's prose. It stops at the end of a sentence when one ends past the middle of
 * that length, and otherwise cuts and adds an ellipsis. Empty when the page has no prose.
 */
export function excerptOf(blocks: NotionBlock[], max = 120): string {
  const parts: string[] = [];
  let len = 0;
  const walk = (list: NotionBlock[]) => {
    for (const b of list) {
      if (len > max * 2) return;
      if (PROSE.has(b.type)) {
        const t = textOf(b);
        // a line that is only a link says nothing a reader can use
        if (t && !/^https?:\/\/\S+$/.test(t)) {
          parts.push(t);
          len += t.length;
        }
      }
      if (b.children?.length && !SKIP_CHILDREN.has(b.type)) walk(b.children);
    }
  };
  walk(blocks);

  const text = parts.join(' ');
  const chars = [...text];
  if (chars.length <= max) return text;
  const head = chars.slice(0, max).join('');
  const end = Math.max(...['。', '！', '？', '!', '?'].map((p) => head.lastIndexOf(p)));
  if (end >= max * 0.5) return head.slice(0, end + 1);
  return head.replace(/[，、；：,;:\s]+$/, '') + '…';
}

/** The path of the page's first picture once it has been downloaded (`/assets/…`), or null. */
export function firstImageOf(blocks: NotionBlock[]): string | null {
  for (const b of blocks) {
    if (b.type === 'image') {
      const img = (b as any).image;
      const url: string | undefined = img?.file?.url ?? img?.external?.url;
      if (url?.startsWith('/assets/')) return url;
    }
    if (b.children?.length) {
      const inner = firstImageOf(b.children);
      if (inner) return inner;
    }
  }
  return null;
}
