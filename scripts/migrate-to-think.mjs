#!/usr/bin/env node
// Moves the blog's content from Notion into Think Space, once, on Paul's computer:
//   NOTION_API_KEY=… THINK_BASE_URL=https://think.paul-learning.dev THINK_API_TOKEN=… node scripts/migrate-to-think.mjs
//
// - the published articles (Status = Done), 碎碎念 and the books (each book's page content is its 讀書筆記)
// - folders 部落格/<category>, 部落格/碎碎念, 部落格/讀書筆記; every article public, dated and summarised
// - uploaded images and videos are uploaded to Think Space; linked ones stay linked
//
// It can be run again: what Notion id became which Think Space id is kept in scripts/.think-migration.json, and
// what was done is not done again (--redo <notion id>… redoes those pages' bodies). --dry-run writes the markdown
// to scripts/.think-migration-preview/ and changes nothing in Think Space.
import 'dotenv/config';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@notionhq/client';
import YAML from 'yaml';
import { bareId, blocksToMarkdown, mediaOf } from './notion-to-markdown.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const MAP_FILE = join(here, '.think-migration.json');
const PREVIEW_DIR = join(here, '.think-migration-preview');
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const REDO = new Set(args.includes('--redo') ? args.slice(args.indexOf('--redo') + 1).filter((a) => !a.startsWith('--')).map(bareId) : []);

const config = YAML.parse(readFileSync(join(here, '..', 'site.config.yaml'), 'utf8'));
const need = (name) => process.env[name] || fail(`${name} is not set`);
function fail(message) { console.error(message); process.exit(1); }

// NOTION_BASE_URL only for trying the script against a fake Notion
const notion = new Client({ auth: need('NOTION_API_KEY'), ...(process.env.NOTION_BASE_URL ? { baseUrl: process.env.NOTION_BASE_URL } : {}) });
const THINK = DRY ? '' : need('THINK_BASE_URL').replace(/\/$/, '');
const TOKEN = DRY ? '' : need('THINK_API_TOKEN');

/** what was made from what, saved after every step so a stopped run carries on where it was */
const map = existsSync(MAP_FILE)
  ? JSON.parse(readFileSync(MAP_FILE, 'utf8'))
  : { folders: {}, articles: {}, books: {}, media: {} };
const save = () => { if (!DRY) writeFileSync(MAP_FILE, `${JSON.stringify(map, null, 2)}\n`); };

const report = { articles: 0, notes: 0, books: 0, bookNotes: 0, images: 0, videos: 0, linkedImages: 0, skipped: [], failed: [] };

// ---------------------------------------------------------------- Think Space

async function think(method, path, body, raw) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${THINK}${path}`, {
      method,
      headers: { authorization: `Bearer ${TOKEN}`, ...(raw ? { 'content-type': raw.type } : body ? { 'content-type': 'application/json' } : {}) },
      body: raw ? raw.bytes : body ? JSON.stringify(body) : undefined,
    });
    if ((res.status === 429 || res.status >= 500) && attempt < 4) { await sleep(2000 * attempt); continue; }
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${JSON.stringify(data)}`);
    return data;
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function folder(name, parentId) {
  const key = parentId ? `${parentId}/${name}` : name;
  if (map.folders[key]) return map.folders[key];
  if (DRY) return (map.folders[key] = `dry-folder-${Object.keys(map.folders).length}`);
  const existing = (await think('GET', '/api/folders')).find((f) => f.name === name && (f.parentId ?? null) === (parentId ?? null));
  map.folders[key] = existing?.id ?? (await think('POST', '/api/folders', { name, ...(parentId ? { parentId } : {}) })).id;
  save();
  return map.folders[key];
}

// ---------------------------------------------------------------- Notion

async function withRetry(fn) {
  for (let attempt = 1; ; attempt++) {
    try { return await fn(); } catch (err) {
      if (attempt >= 10 || !['rate_limited', 'notionhq_client_request_timeout', 'internal_server_error', 'service_unavailable'].includes(err?.code)) throw err;
      // Notion's rate limit can last longer than a few seconds: back off, as Notion asks (Retry-After when it says)
      const after = Number(err?.headers?.get?.('retry-after'));
      await sleep(after > 0 ? after * 1000 : Math.min(60000, 1000 * 2 ** attempt));
    }
  }
}

async function query(databaseId, filter) {
  const pages = [];
  let cursor;
  do {
    const res = await withRetry(() => notion.databases.query({ database_id: databaseId, start_cursor: cursor, ...(filter ? { filter } : {}) }));
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return pages;
}

async function blocksOf(id) {
  const blocks = [];
  let cursor;
  do {
    const res = await withRetry(() => notion.blocks.children.list({ block_id: id, start_cursor: cursor }));
    for (const b of res.results) {
      // a synced block's content is drawn where it is; a column's too would be, but the blog never drew columns
      if (b.has_children && b.type !== 'child_page' && b.type !== 'child_database') b.children = await blocksOf(b.id);
      blocks.push(b);
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return blocks;
}

const text = (prop) => (prop?.title ?? prop?.rich_text ?? []).map((t) => t.plain_text).join('').trim();
const titleOf = (page) => text(Object.values(page.properties).find((p) => p.type === 'title')) || '未命名';
/** a day in Taipei, as the blog shows it */
const taipeiDay = (iso) => new Date(new Date(iso).getTime() + 8 * 3600_000).toISOString().slice(0, 10);
const dayOf = (start) => (start && /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : start ? taipeiDay(start) : undefined);
const hasContent = (blocks) => blocks.some((b) => b.type !== 'paragraph' || (b.paragraph?.rich_text ?? []).some((t) => t.plain_text.trim()));

// ---------------------------------------------------------------- media

/** an uploaded image or video put into Think Space once (kept by its Notion block id); a linked image stays linked */
async function putMedia(block, page) {
  const data = block[block.type];
  if (data.type === 'external') {
    if (block.type === 'image') { report.linkedImages++; return data.external.url; }
    return null; // a linked video (YouTube…) is turned into a link before converting
  }
  if (map.media[block.id]) return map.media[block.id];
  if (DRY) return block.type === 'image' ? `/api/files/dry-${block.id}/display` : `/api/videos/dry-${block.id}`;
  try {
    // the address Notion gives expires after an hour: the block was just read, so it is fresh
    const res = await fetch(data.file.url);
    if (!res.ok) throw new Error(`download ${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    const type = res.headers.get('content-type')?.split(';')[0] || (block.type === 'image' ? 'image/png' : 'video/mp4');
    if (block.type === 'image') {
      const { id } = await think('POST', '/api/files', undefined, { bytes, type: type.startsWith('image/') ? type : 'image/png' });
      map.media[block.id] = `/api/files/${id}/display`;
      report.images++;
    } else {
      const { id } = await think('POST', '/api/videos', undefined, { bytes, type });
      map.media[block.id] = `/api/videos/${id}`;
      report.videos++;
    }
    save();
    return map.media[block.id];
  } catch (err) {
    report.failed.push(`「${page}」的${block.type === 'image' ? '圖片' : '影片'}：${err.message}`);
    return null;
  }
}

/** a linked video is a link on the blog's page now (YouTube shows a preview there) */
function linkVideos(blocks) {
  return blocks.map((b) => {
    const kids = b.children ? { children: linkVideos(b.children) } : {};
    if (b.type === 'video' && b.video.type === 'external') return { ...b, type: 'bookmark', bookmark: { url: b.video.external.url, caption: b.video.caption ?? [] }, ...kids };
    return { ...b, ...kids };
  });
}

// ---------------------------------------------------------------- articles

/** every page to become an article: made first (empty), so mentions between them can be written */
async function ensureArticle(notionId, title, folderId) {
  const key = bareId(notionId);
  if (map.articles[key]) return map.articles[key].id;
  const id = DRY ? `dry-${key.slice(0, 8)}` : (await think('POST', '/api/articles', { title, body: '', folderId })).id;
  map.articles[key] = { id, done: false };
  save();
  return id;
}

async function fillArticle({ notionId, title, blocks, publishedOn, summary }) {
  const entry = map.articles[bareId(notionId)];
  if (entry.done && !REDO.has(bareId(notionId))) return;
  const media = new Map();
  const converted = linkVideos(blocks);
  let missing = 0;
  for (const b of mediaOf(converted)) {
    const src = await putMedia(b, title);
    if (!src && !(b.type === 'video' && b.video.type === 'external')) missing++;
    media.set(b.id, src);
  }
  const body = blocksToMarkdown(converted, {
    mention: (id) => map.articles[id]?.id,
    media: (b) => media.get(b.id) ?? undefined,
    skip: (type) => report.skipped.push(`「${title}」：${type}`),
  });
  if (DRY) {
    mkdirSync(PREVIEW_DIR, { recursive: true });
    writeFileSync(join(PREVIEW_DIR, `${title.replace(/[\\/:*?"<>|]/g, '_')}.md`), `# ${title}\n\n${body}\n`);
    return;
  }
  const current = await think('GET', `/api/articles/${entry.id}`);
  await think('PATCH', `/api/articles/${entry.id}`, { base: current.version, title, body });
  await think('PATCH', `/api/articles/${entry.id}`, {
    ...(publishedOn ? { publishedOn } : {}), ...(summary ? { summary: summary.slice(0, 1000) } : {}), isPublic: true,
  });
  // a picture that could not be uploaded is tried again next time
  entry.done = missing === 0;
  save();
}

// ---------------------------------------------------------------- run

async function main() {
  const n = config.notion;
  console.log(DRY ? '試跑：不會改 Think Space，markdown 寫到 scripts/.think-migration-preview/' : `搬到 ${THINK}`);

  const [articles, notes, books] = await Promise.all([
    query(n.databaseId, { property: 'Status', status: { equals: 'Done' } }),
    n.notesDatabaseId ? query(n.notesDatabaseId) : [],
    query(n.booksDatabaseId),
  ]);
  console.log(`Notion：${articles.length} 篇文章、${notes.length} 篇碎碎念、${books.length} 本書`);

  const blog = await folder('部落格');
  const pages = [];
  for (const page of articles) {
    const category = page.properties.Category?.select?.name || n.defaultCategory;
    const props = page.properties;
    pages.push({
      kind: 'article', notionId: page.id, title: titleOf(page), folderId: await folder(category, blog),
      publishedOn: dayOf(props['Created time']?.date?.start ?? page.created_time),
      summary: text(props.Summary ?? props['摘要']),
    });
  }
  for (const page of notes) {
    pages.push({ kind: 'note', notionId: page.id, title: titleOf(page), folderId: await folder('碎碎念', blog), publishedOn: taipeiDay(page.created_time) });
  }
  const bookBlocks = new Map();
  for (const page of books) {
    const blocks = await blocksOf(page.id);
    bookBlocks.set(page.id, blocks);
    if (hasContent(blocks)) {
      pages.push({ kind: 'bookNotes', notionId: page.id, title: `${titleOf(page)} 讀書筆記`, folderId: await folder('讀書筆記', blog), blocks,
        publishedOn: page.properties['閱讀時間(月份)']?.date?.start?.slice(0, 10) });
    }
  }

  // made first, so a mention of any of them, in any of them, is written as a mention
  for (const p of pages) await ensureArticle(p.notionId, p.title, p.folderId);
  for (const [i, p] of pages.entries()) {
    process.stdout.write(`\r文章 ${i + 1}/${pages.length}`);
    await fillArticle({ ...p, blocks: p.blocks ?? await blocksOf(p.notionId) });
    report[{ article: 'articles', note: 'notes', bookNotes: 'bookNotes' }[p.kind]]++;
  }
  process.stdout.write('\n');

  for (const [i, page] of books.entries()) {
    process.stdout.write(`\r書 ${i + 1}/${books.length}`);
    await putBook(page, hasContent(bookBlocks.get(page.id)) ? map.articles[bareId(page.id)]?.id : undefined);
    report.books++;
  }
  process.stdout.write('\n');
  printReport();
}

async function putBook(page, notesArticleId) {
  const key = bareId(page.id);
  if (map.books[key]?.done) return;
  const props = page.properties;
  const categories = (props['類型']?.multi_select ?? (props['類型']?.select ? [props['類型'].select] : [])).map((c) => c.name);
  const isbn = text(props.ISBN) || (typeof props.ISBN?.number === 'number' ? String(props.ISBN.number) : '');
  const edit = {
    percent: Math.max(0, Math.min(100, Math.round(props['閱讀進度']?.number ?? 0))),
    ...(props['閱讀時間(月份)']?.date?.start ? { finishedMonth: props['閱讀時間(月份)'].date.start.slice(0, 7) } : {}),
    ...(/^(\d{9}[\dXx]|\d{13})$/.test(isbn.replace(/[-\s]/g, '')) ? { isbn } : {}),
    ...(text(props['備註']) ? { note: text(props['備註']).slice(0, 2000) } : {}),
    ...(notesArticleId ? { notesArticleId } : {}),
  };
  if (isbn && !edit.isbn) report.skipped.push(`「${titleOf(page)}」的 ISBN「${isbn}」格式不對，沒有帶過去`);
  if (DRY) return;
  const id = map.books[key]?.id ?? (await think('POST', '/api/listed-books', {
    title: titleOf(page), ...(categories.length ? { category: categories.join('、') } : {}),
  })).id;
  map.books[key] = { id, done: false };
  save();
  const current = await think('GET', `/api/listed-books/${id}`);
  await think('PATCH', `/api/listed-books/${id}`, { base: current.version, ...edit });
  await think('PATCH', `/api/listed-books/${id}`, { isPublic: true });
  map.books[key].done = true;
  save();
}

function printReport() {
  const r = report;
  console.log('\n— 搬完了 —');
  console.log(`文章 ${r.articles} 篇、碎碎念 ${r.notes} 篇、書 ${r.books} 本（讀書筆記 ${r.bookNotes} 篇）`);
  console.log(`上傳圖片 ${r.images} 張、影片 ${r.videos} 個；外部圖片 ${r.linkedImages} 張照連原站`);
  if (r.skipped.length) console.log(`\n略過（部落格本來就沒畫的，或格式不對的）：\n${[...new Set(r.skipped)].map((s) => `  - ${s}`).join('\n')}`);
  if (r.failed.length) console.log(`\n失敗（再跑一次會重試）：\n${r.failed.map((s) => `  - ${s}`).join('\n')}`);
}

main().catch((err) => { console.error(`\n${err.stack ?? err}`); save(); process.exit(1); });
