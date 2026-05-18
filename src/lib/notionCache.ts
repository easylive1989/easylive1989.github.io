import fs from 'node:fs';
import path from 'node:path';
import type { NotionBlock } from './notion';

const CACHE_DIR = path.resolve(process.cwd(), '.notion-cache');
const BLOCKS_DIR = path.join(CACHE_DIR, 'blocks');

interface CachedBlocks {
  lastEditedTime: string;
  blocks: NotionBlock[];
}

export function loadCachedBlocks(
  pageId: string,
  lastEditedTime: string,
): NotionBlock[] | null {
  const file = path.join(BLOCKS_DIR, `${pageId}.json`);
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
): void {
  fs.mkdirSync(BLOCKS_DIR, { recursive: true });
  const file = path.join(BLOCKS_DIR, `${pageId}.json`);
  const payload: CachedBlocks = { lastEditedTime, blocks };
  fs.writeFileSync(file, JSON.stringify(payload));
}

export function pruneBlockCache(validIds: Set<string>): void {
  if (!fs.existsSync(BLOCKS_DIR)) return;
  for (const file of fs.readdirSync(BLOCKS_DIR)) {
    if (!file.endsWith('.json')) continue;
    const id = file.slice(0, -'.json'.length);
    if (!validIds.has(id)) {
      fs.unlinkSync(path.join(BLOCKS_DIR, file));
    }
  }
}
