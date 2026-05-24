#!/usr/bin/env node
/**
 * Migrate hardcoded Side Projects + Playbox data from src/pages/index.astro
 * into Notion databases.
 *
 * Usage:
 *   node scripts/migrate-side-projects-playbox.mjs
 *
 * Requires:
 *   NOTION_API_KEY in env (or .env) — integration must be shared with both
 *   target databases.
 *
 * Idempotent: re-running archives existing pages and recreates them.
 */
import 'dotenv/config';
import { Client } from '@notionhq/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const NOTION_API_KEY = process.env.NOTION_API_KEY;
if (!NOTION_API_KEY) {
  console.error('✗ NOTION_API_KEY not set in env / .env');
  process.exit(1);
}

const SIDE_PROJECTS_DB = '36a8303f78f780c39eb7cecbce962dbf';
const PLAYBOX_DB       = '36a8303f78f7802881dcf2ac4296063e';
const NOTION_VERSION   = '2022-06-28';
const USER_AGENT       = 'paul-learning.dev migration script (https://github.com/easylive1989)';

const notion = new Client({ auth: NOTION_API_KEY });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Retry helper — Cloudflare in front of file_uploads will occasionally 403
// repeated requests; also handle 408/429/5xx with exponential backoff.
async function fetchWithRetry(url, options, label, attempts = 4) {
  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      const retryable = res.status === 403 || res.status === 408 ||
                        res.status === 429 || res.status >= 500;
      if (!retryable) return res;
      const body = await res.text().catch(() => '');
      const backoff = Math.min(1000 * 2 ** i, 8000);
      console.warn(`  ⚠ ${label} → ${res.status}, retrying in ${backoff}ms (${i + 1}/${attempts}) ${body.slice(0, 100).replace(/\s+/g, ' ')}`);
      await sleep(backoff);
    } catch (err) {
      lastErr = err;
      const backoff = Math.min(1000 * 2 ** i, 8000);
      console.warn(`  ⚠ ${label} threw ${err.message}, retrying in ${backoff}ms (${i + 1}/${attempts})`);
      await sleep(backoff);
    }
  }
  if (lastErr) throw lastErr;
  // last attempt without catching
  return fetch(url, options);
}

// ─────────────────────────────────────────────────────────────────
// File upload helpers (direct fetch — SDK v2.3 has no fileUploads)
//
// Cloudflare's WAF in front of Notion's upload endpoint 403s single POSTs
// whose multipart body is "too large" (empirically around ≥1 MB). The free
// Notion plan doesn't allow multi-part upload, so for raster images we
// pre-shrink anything above SHRINK_THRESHOLD with sharp — playbox card
// thumbnails only render at 480×270 anyway, the original full-resolution
// PNGs are wasted bandwidth.
// ─────────────────────────────────────────────────────────────────
const SHRINK_THRESHOLD = 800 * 1024;   // 800 KB
const MAX_DIMENSION    = 1280;          // px (long edge)

async function maybeShrinkImage(filePath, contentType) {
  if (!contentType.startsWith('image/') || contentType === 'image/svg+xml') {
    return filePath;
  }
  const stats = await fs.promises.stat(filePath);
  if (stats.size < SHRINK_THRESHOLD) return filePath;

  const ext = path.extname(filePath).toLowerCase() || '.png';
  const tmpDir = path.join(ROOT, '.cache', 'migration-images');
  fs.mkdirSync(tmpDir, { recursive: true });
  const out = path.join(tmpDir, `shrunk-${path.basename(filePath, ext)}${ext}`);

  let pipeline = sharp(filePath).resize({
    width: MAX_DIMENSION,
    height: MAX_DIMENSION,
    fit: 'inside',
    withoutEnlargement: true,
  });
  if (contentType === 'image/png') {
    pipeline = pipeline.png({ quality: 80, compressionLevel: 9 });
  } else if (contentType === 'image/jpeg') {
    pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });
  } else if (contentType === 'image/webp') {
    pipeline = pipeline.webp({ quality: 80 });
  }
  await pipeline.toFile(out);
  const newSize = (await fs.promises.stat(out)).size;
  console.log(`  · shrunk ${path.basename(filePath)} ${(stats.size / 1024).toFixed(0)} KB → ${(newSize / 1024).toFixed(0)} KB`);
  return out;
}

async function uploadFileToNotion(filePath, filename, contentType) {
  const effectivePath = await maybeShrinkImage(filePath, contentType);
  return uploadFileSinglePart(effectivePath, filename, contentType);
}

async function uploadFileSinglePart(filePath, filename, contentType) {
  const createRes = await fetchWithRetry(
    'https://api.notion.com/v1/file_uploads',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': NOTION_VERSION,
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      body: JSON.stringify({ filename, content_type: contentType }),
    },
    `create ${filename}`,
  );
  if (!createRes.ok) {
    throw new Error(`file_uploads create failed: ${createRes.status} ${await createRes.text()}`);
  }
  const upload = await createRes.json();

  const fileBuffer = await fs.promises.readFile(filePath);
  const form = new FormData();
  form.append('file', new Blob([fileBuffer], { type: contentType }), filename);

  const sendRes = await fetchWithRetry(
    upload.upload_url,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': NOTION_VERSION,
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      body: form,
    },
    `send ${filename}`,
  );
  if (!sendRes.ok) {
    throw new Error(`file_uploads send failed: ${sendRes.status} ${await sendRes.text()}`);
  }
  return upload.id;
}


async function downloadToTemp(url, filename) {
  const tmpDir = path.join(ROOT, '.cache', 'migration-images');
  fs.mkdirSync(tmpDir, { recursive: true });
  const dest = path.join(tmpDir, filename);
  if (fs.existsSync(dest)) return dest;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: ${url} (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return dest;
}

// ─────────────────────────────────────────────────────────────────
// Schema setup
// ─────────────────────────────────────────────────────────────────
async function setupSideProjectsSchema() {
  const db = await notion.databases.retrieve({ database_id: SIDE_PROJECTS_DB });
  const titleEntry = Object.entries(db.properties).find(([, p]) => p.type === 'title');
  const titleName = titleEntry?.[0];

  const properties = {};
  if (titleName && titleName !== '標題') {
    properties[titleName] = { name: '標題', title: {} };
  } else if (!titleName) {
    properties['標題'] = { title: {} };
  }
  properties['副標']        = { rich_text: {} };
  properties['描述']        = { rich_text: {} };
  properties['平台']        = {
    multi_select: {
      options: [
        { name: 'iOS',      color: 'blue' },
        { name: 'Android',  color: 'green' },
        { name: 'Web',      color: 'purple' },
        { name: 'Line Bot', color: 'pink' },
      ],
    },
  };
  properties['標籤']        = {
    multi_select: {
      options: [
        { name: 'Flutter',     color: 'blue' },
        { name: 'Dart',        color: 'blue' },
        { name: 'Supabase',    color: 'green' },
        { name: 'React',       color: 'default' },
        { name: 'FastAPI',     color: 'green' },
        { name: 'Vanilla JS',  color: 'yellow' },
        { name: '.NET',        color: 'purple' },
        { name: 'MongoDB',     color: 'green' },
        { name: 'TypeScript',  color: 'blue' },
        { name: 'Python',      color: 'yellow' },
      ],
    },
  };
  properties['狀態']        = {
    select: {
      options: [
        { name: '活著',   color: 'green' },
        { name: '已關閉', color: 'gray'  },
        { name: '封存',   color: 'default' },
      ],
    },
  };
  properties['Icon']        = { rich_text: {} };
  properties['Icon 背景色'] = { rich_text: {} };
  properties['GitHub 網址'] = { url: {} };
  properties['主連結']      = { url: {} };
  properties['封面圖']      = { files: {} };
  properties['排序']        = { number: { format: 'number' } };

  await notion.databases.update({ database_id: SIDE_PROJECTS_DB, properties });
  console.log('✓ Side Project schema ready');
}

async function setupPlayboxSchema() {
  const db = await notion.databases.retrieve({ database_id: PLAYBOX_DB });
  const titleEntry = Object.entries(db.properties).find(([, p]) => p.type === 'title');
  const titleName = titleEntry?.[0];

  const properties = {};
  if (titleName && titleName !== '名稱') {
    properties[titleName] = { name: '名稱', title: {} };
  } else if (!titleName) {
    properties['名稱'] = { title: {} };
  }
  properties['連結']  = { url: {} };
  properties['截圖']  = { files: {} };
  properties['排序']  = { number: { format: 'number' } };

  await notion.databases.update({ database_id: PLAYBOX_DB, properties });
  console.log('✓ Playbox schema ready');
}

// ─────────────────────────────────────────────────────────────────
// Data (mirrored from src/pages/index.astro hardcoded values)
// ─────────────────────────────────────────────────────────────────
const sideProjects = [
  {
    title:       'Lorescape',
    subtitle:    '沉浸式歷史探索',
    description: '用 AI 當你的隨身歷史導覽，把眼前的石頭、巷弄、廟宇的故事娓娓道來。從 0 完整流程上架 iOS / Android。',
    platforms:   ['iOS', 'Android'],
    tags:        ['Flutter', 'Dart', 'Supabase'],
    status:      '活著',
    icon:        '',
    iconBg:      '',
    github:      'https://github.com/easylive1989/instant_explore',
    mainUrl:     'https://lorescape.app/',
    coverRemote: 'https://lorescape.app/images/hero-bg.jpg',
    coverFilename:    'lorescape-hero.jpg',
    coverContentType: 'image/jpeg',
    order: 1,
  },
  {
    title:       '台股趨勢分析',
    subtitle:    '',
    description: '從 TWSE 抓盤後資料、自己畫圖、找有趣的價量訊號。每天自己也在看。',
    platforms:   ['Web'],
    tags:        ['React', 'FastAPI'],
    status:      '活著',
    icon:        '▲',
    iconBg:      'var(--bento-accent)',
    github:      'https://github.com/easylive1989/publixia',
    mainUrl:     'https://stock.paul-learning.dev/',
    order: 2,
  },
  {
    title:       'YouTube 運動計時器',
    subtitle:    '',
    description: '看 YouTube 運動影片時疊加的區間計時器，幫忙在固定秒數提醒換動作。',
    platforms:   ['Web'],
    tags:        ['Vanilla JS'],
    status:      '活著',
    icon:        '◆',
    iconBg:      '#2eb88a',
    github:      'https://github.com/easylive1989/youtube-sport-timer',
    mainUrl:     'https://paul-learning.dev/youtube-sport-timer/',
    order: 3,
  },
  {
    title:       '小遊戲機器人',
    subtitle:    '',
    description: '用 Line 跟朋友 / 群組玩五子棋、象棋、井字遊戲、海戰棋、猜數字的機器人。輸入「玩五子棋」就開戰。',
    platforms:   ['Line Bot'],
    tags:        ['.NET', 'MongoDB'],
    status:      '活著',
    icon:        '🎲',
    iconBg:      '#7d3a55',
    github:      'https://github.com/easylive1989/LittleFlowerBot',
    mainUrl:     'https://github.com/easylive1989/LittleFlowerBot/blob/master/HOW%20TO%20PLAY.md',
    order: 4,
  },
  {
    title:       '今彩 539 分析',
    subtitle:    '',
    description: '抓今彩 539 開獎資料、看號碼分布跟出現頻率。純粹自己想看數字、不是要中獎。',
    platforms:   ['Web'],
    tags:        ['React', 'TypeScript', 'Python'],
    status:      '活著',
    icon:        '▤',
    iconBg:      '#c8a45a',
    github:      'https://github.com/easylive1989/ito539_analytics',
    mainUrl:     'https://paul-learning.dev/ito539_analytics/',
    order: 5,
  },
];

const playboxGames = [
  { name: 'Flutter Breakout',  url: 'https://easylive1989.github.io/paul-playbox/flutter_breakout/',    imageFile: 'src/assets/breakout.png',          contentType: 'image/png',     order: 1 },
  { name: 'Flutter Tetris',    url: 'https://easylive1989.github.io/paul-playbox/flutter_tetris/',      imageFile: 'src/assets/tetris.png',            contentType: 'image/png',     order: 2 },
  { name: 'Player NS Shaft',   url: 'https://easylive1989.github.io/paul-playbox/player_ns_shaft/',     imageFile: 'src/assets/ns_shaft.png',          contentType: 'image/png',     order: 3 },
  { name: 'Ray World Game',    url: 'https://easylive1989.github.io/paul-playbox/ray_world_game/',      imageFile: 'src/assets/ray_world.png',         contentType: 'image/png',     order: 4 },
  { name: 'Water Sort Puzzle', url: 'https://easylive1989.github.io/paul-playbox/water_sort_puzzle/',   imageFile: 'src/assets/water_sort_puzzle.png', contentType: 'image/png',     order: 5 },
  { name: 'Tiny Swords RTS',   url: 'https://easylive1989.github.io/paul-playbox/tiny_swords/',         imageFile: 'src/assets/tiny_swords.png',       contentType: 'image/png',     order: 6 },
  { name: 'Stock Trading',     url: 'https://easylive1989.github.io/paul-playbox/stock_trading_game/',  imageFile: 'src/assets/stock_trading.png',     contentType: 'image/png',     order: 7 },
  { name: 'Water Bottle Flip', url: 'https://easylive1989.github.io/paul-playbox/water_bottle_flip/',   imageFile: 'public/assets/water_bottle_flip.svg', contentType: 'image/svg+xml', order: 8 },
  { name: 'Sokoban',           url: 'https://easylive1989.github.io/paul-playbox/sokoban/',             imageFile: 'public/assets/sokoban.svg',        contentType: 'image/svg+xml', order: 9 },
];

// ─────────────────────────────────────────────────────────────────
// Migration
// ─────────────────────────────────────────────────────────────────
async function archiveAllPages(databaseId) {
  let cursor;
  do {
    const res = await notion.databases.query({ database_id: databaseId, start_cursor: cursor });
    for (const page of res.results) {
      await notion.pages.update({ page_id: page.id, archived: true });
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
}

async function getExistingSideProjectTitles() {
  const titles = new Set();
  let cursor;
  do {
    const res = await notion.databases.query({ database_id: SIDE_PROJECTS_DB, start_cursor: cursor });
    for (const page of res.results) {
      const arr = page.properties?.['標題']?.title;
      if (Array.isArray(arr) && arr.length > 0) {
        titles.add(arr.map((t) => t.plain_text ?? '').join('').trim());
      }
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return titles;
}

async function migrateSideProjects() {
  // Resume-friendly: skip projects whose pages already exist (matched by 標題).
  const existing = await getExistingSideProjectTitles();
  if (existing.size > 0) {
    console.log(`  found ${existing.size} existing Side Project page(s), will skip those`);
  }

  for (const p of sideProjects) {
    if (existing.has(p.title)) {
      console.log(`⏭  skip (already exists): ${p.title}`);
      continue;
    }

    let coverUploadId = null;
    if (p.coverRemote) {
      console.log(`  ↓ downloading ${p.coverRemote}`);
      const localPath = await downloadToTemp(p.coverRemote, p.coverFilename);
      console.log(`  ↑ uploading ${p.coverFilename} to Notion`);
      coverUploadId = await uploadFileToNotion(localPath, p.coverFilename, p.coverContentType);
    }

    const properties = {
      '標題':       { title: [{ text: { content: p.title } }] },
      '副標':       p.subtitle
        ? { rich_text: [{ text: { content: p.subtitle } }] }
        : { rich_text: [] },
      '描述':       { rich_text: [{ text: { content: p.description } }] },
      '平台':       { multi_select: p.platforms.map((n) => ({ name: n })) },
      '標籤':       { multi_select: p.tags.map((n) => ({ name: n })) },
      '狀態':       { select: { name: p.status } },
      'Icon':       p.icon
        ? { rich_text: [{ text: { content: p.icon } }] }
        : { rich_text: [] },
      'Icon 背景色': p.iconBg
        ? { rich_text: [{ text: { content: p.iconBg } }] }
        : { rich_text: [] },
      'GitHub 網址': p.github  ? { url: p.github  } : { url: null },
      '主連結':     p.mainUrl ? { url: p.mainUrl } : { url: null },
      '排序':       { number: p.order },
    };
    if (coverUploadId) {
      properties['封面圖'] = {
        files: [
          {
            name: p.coverFilename,
            type: 'file_upload',
            file_upload: { id: coverUploadId },
          },
        ],
      };
    }

    await notion.pages.create({
      parent: { database_id: SIDE_PROJECTS_DB },
      properties,
    });
    console.log(`✓ Side Project: ${p.title}`);

    // Polite delay between Notion writes.
    await sleep(400);
  }
}

async function getExistingPlayboxTitles() {
  const titles = new Set();
  let cursor;
  do {
    const res = await notion.databases.query({ database_id: PLAYBOX_DB, start_cursor: cursor });
    for (const page of res.results) {
      const arr = page.properties?.['名稱']?.title;
      if (Array.isArray(arr) && arr.length > 0) {
        titles.add(arr.map((t) => t.plain_text ?? '').join('').trim());
      }
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return titles;
}

async function migratePlaybox() {
  // Resume-friendly: if a previous run partially succeeded, skip games whose
  // pages already exist (matched by 名稱). Run `notion-clean-playbox` first
  // to start fresh.
  const existing = await getExistingPlayboxTitles();
  if (existing.size > 0) {
    console.log(`  found ${existing.size} existing Playbox page(s), will skip those`);
  }

  for (const g of playboxGames) {
    if (existing.has(g.name)) {
      console.log(`⏭  skip (already exists): ${g.name}`);
      continue;
    }

    const absPath = path.join(ROOT, g.imageFile);
    if (!fs.existsSync(absPath)) {
      throw new Error(`Image not found: ${absPath}`);
    }
    const filename = path.basename(g.imageFile);
    console.log(`  ↑ uploading ${filename}`);
    const uploadId = await uploadFileToNotion(absPath, filename, g.contentType);

    await notion.pages.create({
      parent: { database_id: PLAYBOX_DB },
      properties: {
        '名稱': { title: [{ text: { content: g.name } }] },
        '連結': { url: g.url },
        '截圖': {
          files: [
            {
              name: filename,
              type: 'file_upload',
              file_upload: { id: uploadId },
            },
          ],
        },
        '排序': { number: g.order },
      },
    });
    console.log(`✓ Playbox: ${g.name}`);

    // Polite delay — Cloudflare WAF in front of the file_uploads endpoint
    // 403s on burst uploads without it.
    await sleep(600);
  }
}

async function main() {
  console.log('=== Setting up schemas ===');
  await setupSideProjectsSchema();
  await setupPlayboxSchema();

  console.log('\n=== Migrating Side Projects ===');
  await migrateSideProjects();

  console.log('\n=== Migrating Playbox ===');
  await migratePlaybox();

  console.log('\n✓ All done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
