import fs from 'node:fs';
import path from 'node:path';
import { codeToHtml, bundledLanguages, type BundledLanguage } from 'shiki';
import { loadConfig } from './config';
import { categorySlug } from './category';
import { responsiveImage, IMAGE_SIZES } from './images';
import { excerptFrom, renderThinkMarkdown } from './think-markdown.mjs';
import type { Article, Book, Note } from './notion';
import type { ArticleMeta } from './articleMeta';

/**
 * The blog's content from Think Space (https://think.paul-learning.dev), read when the site is built, with no token:
 * the public articles (GET /api/public/articles, then each by id) and the public books (GET /api/public/books).
 * - an article in 部落格/碎碎念 is one of the 碎碎念
 * - an article a book names as its notes is that book's 讀書筆記
 * - every other public article is a post, in the category of the folder it is in
 */

export interface Content {
  /** drawn from Think Space's markdown */
  html?: string;
  /** from Notion, drawn by NotionRenderer */
  blocks?: import('./notion').NotionBlock[];
  meta: ArticleMeta;
  excerpt(max?: number): string;
  /** the first downloaded picture (`/assets/…`), for link previews */
  firstImage: string | null;
}

interface ThinkArticle {
  id: string; title: string; body: string; category?: string; publishedOn?: string; summary?: string;
  createdAt: number; updatedAt: number;
}
interface ThinkBook {
  id: string; title: string; author?: string; category?: string; percent: number; finishedMonth?: string; isbn?: string;
  note?: string; notesArticleId?: string;
}
export interface ThinkBookRecord extends Book { notesArticleId?: string }

const NOTES_FOLDER = '碎碎念';
const BOOK_NOTES_FOLDER = '讀書筆記';
const isProductionBuild = () => process.env.NODE_ENV === 'production';

function baseUrl(): string {
  const url = process.env.THINK_BASE_URL || loadConfig().think?.baseUrl;
  if (!url) throw new Error('THINK_BASE_URL is not set, nor think.baseUrl in site.config.yaml');
  return url.replace(/\/$/, '');
}

async function get(pathname: string, { allowMissing = false } = {}): Promise<Response | null> {
  for (let attempt = 1; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${baseUrl()}${pathname}`, { headers: { accept: 'application/json' } });
    } catch (err: any) {
      if (attempt < 3) { await new Promise((r) => setTimeout(r, 1000 * attempt)); continue; }
      throw new Error(`Think Space could not be reached (${pathname}): ${err.message}`);
    }
    if (res.ok) return res;
    if (res.status === 404 && allowMissing) return null;
    if (res.status >= 500 && attempt < 3) { await new Promise((r) => setTimeout(r, 1000 * attempt)); continue; }
    throw new Error(`Think Space answered ${res.status} for ${pathname}`);
  }
}
const json = async <T>(pathname: string): Promise<T> => (await (await get(pathname))!.json()) as T;

const iso = (ms: number) => new Date(ms).toISOString();

interface Loaded {
  posts: { article: Article; body: string }[];
  notes: { note: Note; body: string }[];
  books: ThinkBookRecord[];
  bookNotes: Map<string, { body: string; updatedAt: string }>;
  /** where a public page is on the blog, by its Think Space id */
  hrefs: Map<string, string>;
}

let loading: Promise<Loaded> | null = null;
const load = () => (loading ??= loadAll());

async function loadAll(): Promise<Loaded> {
  const config = loadConfig();
  const [list, books] = await Promise.all([
    json<{ id: string; updatedAt: number }[]>('/api/public/articles'),
    json<ThinkBook[]>('/api/public/books'),
  ]);

  // a few at a time: Think Space is one small server
  const articles: ThinkArticle[] = [];
  const queue = [...list];
  await Promise.all(Array.from({ length: 6 }, async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      const res = await get(`/api/articles/${encodeURIComponent(item.id)}`, { allowMissing: true });
      if (res) articles.push((await res.json()) as ThinkArticle); // made hidden since the list was read
    }
  }));

  const notesOf = new Map(books.filter((b) => b.notesArticleId).map((b) => [b.notesArticleId!, b.id]));
  const loaded: Loaded = { posts: [], notes: [], books: [], bookNotes: new Map(), hrefs: new Map() };
  const BASE = (import.meta.env?.BASE_URL ?? '/').replace(/\/?$/, '/');
  for (const a of articles) {
    const createdTime = a.publishedOn ?? iso(a.createdAt).slice(0, 10);
    const bookId = notesOf.get(a.id);
    if (bookId) {
      loaded.bookNotes.set(bookId, { body: a.body, updatedAt: iso(a.updatedAt) });
      loaded.hrefs.set(a.id, `${BASE}reading/${bookId}/`);
    } else if (a.category === NOTES_FOLDER) {
      loaded.notes.push({ note: { id: a.id, title: a.title, createdTime, lastEditedTime: iso(a.updatedAt) }, body: a.body });
      loaded.hrefs.set(a.id, `${BASE}notes/${a.id}/`);
    } else if (a.category !== BOOK_NOTES_FOLDER) {
      const category = a.category || config.notion.defaultCategory;
      loaded.posts.push({
        article: { id: a.id, title: a.title, category, createdTime, lastEditedTime: iso(a.updatedAt), summary: a.summary ?? '' },
        body: a.body,
      });
      loaded.hrefs.set(a.id, `${BASE}${categorySlug(category)}/${a.id}/`);
    }
  }
  const newestFirst = (x: string, y: string) => y.localeCompare(x);
  loaded.posts.sort((x, y) => newestFirst(x.article.createdTime, y.article.createdTime));
  loaded.notes.sort((x, y) => newestFirst(x.note.createdTime, y.note.createdTime));
  loaded.books = books.map((b) => ({
    id: b.id, title: b.title, progress: b.percent,
    lastEditedTime: loaded.bookNotes.get(b.id)?.updatedAt ?? '',
    categories: b.category ? b.category.split('、').filter(Boolean) : [],
    finishedDate: b.finishedMonth ? `${b.finishedMonth}-01` : null,
    isbn: b.isbn ?? null,
    ...(b.notesArticleId && loaded.bookNotes.has(b.id) ? { notesArticleId: b.notesArticleId } : {}),
  }));

  if (isProductionBuild()) {
    const min = config.build.minArticles ?? 1;
    if (loaded.posts.length < min) throw new Error(`Think Space has ${loaded.posts.length} public articles, below minimum ${min} — aborting production build`);
    const minBooks = config.build.minBooks ?? 1;
    if (loaded.books.length < minBooks) throw new Error(`Think Space has ${loaded.books.length} public books, below minimum ${minBooks} — aborting production build`);
  }
  return loaded;
}

export const thinkArticles = async () => (await load()).posts.map((p) => p.article);
export const thinkNotes = async () => (await load()).notes.map((n) => n.note);
export const thinkBooks = async () => (await load()).books;

export async function thinkArticleBody(id: string): Promise<string | undefined> {
  return (await load()).posts.find((p) => p.article.id === id)?.body;
}
export async function thinkNoteBodies(): Promise<Map<string, string>> {
  return new Map((await load()).notes.filter((n) => n.body.trim()).map((n) => [n.note.id, n.body]));
}
export async function thinkBookNotes(): Promise<Map<string, string>> {
  return new Map([...(await load()).bookNotes].filter(([, n]) => n.body.trim()).map(([id, n]) => [id, n.body]));
}

// ---------------------------------------------------------------- drawing

const ASSETS = '/assets/think';

/** a Think Space picture or video, kept in public/ (cached between builds) and dist/ */
async function download(src: string, id: string): Promise<string | null> {
  const publicDir = path.resolve(process.cwd(), 'public');
  const distDir = path.resolve(process.cwd(), 'dist');
  const dir = path.join(publicDir, ASSETS);
  fs.mkdirSync(dir, { recursive: true });
  let file = fs.readdirSync(dir).find((f) => f.startsWith(`${id}.`));
  if (!file) {
    const res = await get(src, { allowMissing: true });
    if (!res) {
      const msg = `Think Space has no ${src}`;
      if (isProductionBuild()) throw new Error(msg);
      console.warn(msg);
      return null;
    }
    const type = res.headers.get('content-type')?.split(';')[0] ?? '';
    const ext = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'video/mp4': 'mp4', 'video/webm': 'webm' }[type] ?? 'bin';
    file = `${id}.${ext}`;
    fs.writeFileSync(path.join(dir, file), Buffer.from(await res.arrayBuffer()));
  }
  const dist = path.join(distDir, ASSETS, file);
  if (fs.existsSync(distDir) && !fs.existsSync(dist)) {
    fs.mkdirSync(path.dirname(dist), { recursive: true });
    fs.copyFileSync(path.join(dir, file), dist);
  }
  return `${ASSETS}/${file}`;
}

const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

async function highlight(code: string, lang: string): Promise<string> {
  const known: BundledLanguage | 'text' = lang in bundledLanguages ? (lang as BundledLanguage) : 'text';
  // code always sits on the dark ink plate, so only the dark theme is emitted
  return codeToHtml(code, { lang: known, theme: 'github-dark' });
}

/** a page's markdown drawn as the blog's HTML, its pictures and videos downloaded */
export async function drawThink(markdown: string): Promise<Content> {
  const { hrefs } = await load();
  const BASE = (import.meta.env?.BASE_URL ?? '/').replace(/\/$/, '');
  let firstImage: string | null = null;
  const media = async (src: string, alt: string) => {
    const video = /^\/api\/videos\/([A-Za-z0-9_-]+)$/.exec(src);
    if (video) {
      const local = await download(src, video[1]);
      return local ? `<div class="video-container"><video controls preload="metadata"><source src="${attr(BASE + local)}" /></video></div>` : '';
    }
    const file = /^\/api\/files\/([A-Za-z0-9_-]+)\/display$/.exec(src);
    let url = src;
    let extra = '';
    if (file) {
      const local = await download(src, file[1]);
      if (!local) return '';
      const out = await responsiveImage(local);
      firstImage ??= local;
      url = `${BASE}${out.src}`;
      const srcset = out.variants.length > 1 ? out.variants.map((v) => `${BASE}${v.src} ${v.width}w`).join(', ') : '';
      extra = `${srcset ? ` srcset="${attr(srcset)}" sizes="${IMAGE_SIZES}"` : ''}${out.width ? ` width="${out.width}" height="${out.height}"` : ''}`;
    } else if (!/^https?:\/\//.test(src)) return '';
    return `<figure><img src="${attr(url)}"${extra} alt="${attr(alt || 'Article image')}" loading="lazy" decoding="async" />${alt ? `<figcaption>${attr(alt)}</figcaption>` : ''}</figure>`;
  };
  const out = await renderThinkMarkdown(markdown, { highlight, media, mention: (id: string) => hrefs.get(id) });

  // Mixed-language read speed, as for the Notion pages: Chinese ~350 chars/min, English ~220 words/min
  const cjk = out.chars - out.words;
  const readMinutes = Math.max(1, Math.round((Math.max(0, cjk) + out.words * 1.6) / 350));
  return {
    html: out.html,
    meta: { chars: out.chars, words: out.words, readMinutes, toc: out.toc },
    excerpt: (max = 120) => excerptFrom(out.prose, max),
    firstImage,
  };
}
