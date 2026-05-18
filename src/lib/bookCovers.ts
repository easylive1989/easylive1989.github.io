import fs from 'node:fs';
import path from 'node:path';
import type { Book } from './notion';

const CACHE_PATH = path.resolve(process.cwd(), '.cache', 'book-covers.json');

type CacheEntry = { url: string | null; checkedAt: string };
type Cache = Record<string, CacheEntry>;

function normaliseIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, '');
}

function loadCache(): Cache {
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveCache(cache: Cache): void {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

type FetchResult = { url: string | null; transient: boolean };

const GOOGLE_KEY_RAW = process.env.GOOGLE_BOOKS_API_KEY;
const GOOGLE_KEY = GOOGLE_KEY_RAW ? GOOGLE_KEY_RAW.trim() : '';
let googleDiagPrinted = false;

function printGoogleDiagOnce() {
  if (googleDiagPrinted) return;
  googleDiagPrinted = true;
  if (!GOOGLE_KEY) {
    console.log('[covers] Google Books: no GOOGLE_BOOKS_API_KEY in env — anonymous (0/day quota)');
    return;
  }
  // Don't leak the key — just length + first 4 chars to confirm shape.
  console.log(
    `[covers] Google Books: using key (len=${GOOGLE_KEY.length}, prefix=${GOOGLE_KEY.slice(0, 4)}…)`,
  );
}

async function fetchFromGoogleBooks(isbn: string): Promise<FetchResult> {
  printGoogleDiagOnce();
  try {
    const keyParam = GOOGLE_KEY ? `&key=${encodeURIComponent(GOOGLE_KEY)}` : '';
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1${keyParam}`,
      { headers: { 'User-Agent': 'paul-learning.dev cover fetcher' } },
    );
    if (res.status === 429 || res.status >= 500) {
      console.warn(`[covers]  ! Google Books transient ${res.status} for ${isbn}`);
      return { url: null, transient: true };
    }
    if (!res.ok) {
      // 4xx other than 429 — surface body so we can debug auth / referer / IP-restriction issues
      let body = '';
      try { body = (await res.text()).slice(0, 280); } catch {}
      console.warn(`[covers]  ! Google Books ${res.status} for ${isbn}: ${body}`);
      // Treat as transient — don't cache a permanent null when auth might be misconfigured
      return { url: null, transient: true };
    }
    const data: any = await res.json();
    if (data?.error) {
      console.warn(`[covers]  ! Google Books error for ${isbn}: ${data.error.message ?? 'unknown'}`);
      return { url: null, transient: true };
    }
    const links = data?.items?.[0]?.volumeInfo?.imageLinks;
    const raw: string | undefined =
      links?.large || links?.medium || links?.small || links?.thumbnail || links?.smallThumbnail;
    if (!raw) return { url: null, transient: false };
    const url = raw.replace(/^http:/, 'https:').replace(/&edge=curl/, '');
    return { url, transient: false };
  } catch (err: any) {
    console.warn(`[covers]  ! Google Books fetch failed for ${isbn}: ${err?.message ?? err}`);
    return { url: null, transient: true };
  }
}

async function fetchFromOpenLibrary(isbn: string): Promise<FetchResult> {
  const url = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (res.ok) return { url, transient: false };
    if (res.status === 429 || res.status >= 500) return { url: null, transient: true };
    return { url: null, transient: false };
  } catch (err: any) {
    console.warn(`[covers]  ! Open Library fetch failed for ${isbn}: ${err?.message ?? err}`);
    return { url: null, transient: true };
  }
}

async function fetchCover(isbn: string): Promise<FetchResult> {
  const g = await fetchFromGoogleBooks(isbn);
  if (g.url) return g;
  const o = await fetchFromOpenLibrary(isbn);
  if (o.url) return o;
  // No URL found anywhere — mark cacheable only when both lookups were conclusive.
  return { url: null, transient: g.transient && o.transient };
}

export async function enrichBookCovers(books: Book[]): Promise<Book[]> {
  const cache = loadCache();
  let dirty = false;

  const targets = books
    .filter((b) => b.isbn)
    .map((b) => ({ book: b, key: normaliseIsbn(b.isbn!) }))
    .filter(({ key }) => key.length > 0 && !(key in cache));

  if (targets.length > 0) {
    console.log(`[covers] fetching ${targets.length} new cover(s)`);
    const checkedAt = new Date().toISOString();
    // Polite serial fetch — small, one-time cost; avoids rate-spike on rebuild
    for (const { book, key } of targets) {
      const result = await fetchCover(key);
      if (result.transient) {
        // Don't cache — retry on the next build once the upstream recovers
        console.log(`[covers]  ⟳ ${book.title} (transient, will retry next build)`);
        continue;
      }
      cache[key] = { url: result.url, checkedAt };
      dirty = true;
      if (result.url) {
        console.log(`[covers]  ✓ ${book.title}`);
      } else {
        console.log(`[covers]  · ${book.title} (no cover found)`);
      }
    }
  }

  if (dirty) saveCache(cache);

  return books.map((b) => {
    const key = b.isbn ? normaliseIsbn(b.isbn) : '';
    const hit = key ? cache[key] : null;
    return { ...b, coverUrl: hit?.url ?? null };
  });
}
