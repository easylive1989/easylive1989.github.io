import fs from 'node:fs';
import path from 'node:path';
import type { NotionBlock } from './notion';

const CACHE_DIR = path.resolve(process.cwd(), '.notion-cache');

// Articles, the reading list's notes and the desk's notes are kept apart, so
// pruning one never throws the others away.
export type BlockBucket = 'blocks' | 'book-blocks' | 'note-blocks';
const dirOf = (bucket: BlockBucket) => path.join(CACHE_DIR, bucket);

interface CachedBlocks {
  lastEditedTime: string;
  blocks: NotionBlock[];
}

export function loadCachedBlocks(
  pageId: string,
  lastEditedTime: string,
  bucket: BlockBucket = 'blocks',
): NotionBlock[] | null {
  const file = path.join(dirOf(bucket), `${pageId}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const cached: CachedBlocks = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (cached.lastEditedTime !== lastEditedTime) return null;
    return cached.blocks;
  } catch {
    return null;
  }
}

export function saveCachedBlocks(
  pageId: string,
  lastEditedTime: string,
  blocks: NotionBlock[],
  bucket: BlockBucket = 'blocks',
): void {
  const dir = dirOf(bucket);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${pageId}.json`);
  const payload: CachedBlocks = { lastEditedTime, blocks };
  fs.writeFileSync(file, JSON.stringify(payload));
}

export function pruneBlockCache(validIds: Set<string>, bucket: BlockBucket = 'blocks'): void {
  const dir = dirOf(bucket);
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const id = file.slice(0, -'.json'.length);
    if (!validIds.has(id)) {
      fs.unlinkSync(path.join(dir, file));
    }
  }
}
