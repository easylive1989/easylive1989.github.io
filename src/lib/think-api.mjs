// Think Space (https://paul.thinkspace.page) as the blog reads it when it is built: with the read-only token in
// THINK_TOKEN, as its owner. Nothing there is public any more, so every request carries the token, and nothing
// the blog shows points back at Think Space: pictures and videos are downloaded (src/lib/think.ts).
//
// What is on the blog: the articles in the top-level folder 部落格 and in its folders one level down.
// - a folder under 部落格 is the article's category (an article right in 部落格 has none)
// - an article with no publishedOn is a draft and is left out, except a book's reading notes, which have no date
// Used by src/lib/think.ts (the site) and scripts/publish-medium.mjs (Medium).

export const ROOT_FOLDER = '部落格';

/** Think Space's address: THINK_BASE_URL, or think.baseUrl in site.config.yaml */
export function thinkBase(config) {
  const url = process.env.THINK_BASE_URL || config?.think?.baseUrl;
  if (!url) throw new Error('THINK_BASE_URL is not set, nor think.baseUrl in site.config.yaml');
  return url.replace(/\/$/, '');
}

/** GET with the token, tried again on a network error or a 5xx; a 404 is null when allowMissing */
export function thinkClient(base, token = process.env.THINK_TOKEN) {
  if (!token) throw new Error('THINK_TOKEN is not set: the blog reads Think Space with its read-only API token');
  const headers = { authorization: `Bearer ${token}`, 'user-agent': 'paul-learning.dev build' };
  return async function get(pathname, { allowMissing = false, method = 'GET' } = {}) {
    for (let attempt = 1; ; attempt++) {
      let res;
      try {
        res = await fetch(`${base}${pathname}`, { method, headers });
      } catch (err) {
        if (attempt < 3) { await new Promise((r) => setTimeout(r, 1000 * attempt)); continue; }
        throw new Error(`Think Space could not be reached (${pathname}): ${err.message}`);
      }
      if (res.ok) return res;
      if (res.status === 404 && allowMissing) return null;
      if (res.status >= 500 && attempt < 3) { await new Promise((r) => setTimeout(r, 1000 * attempt)); continue; }
      if (res.status === 401 || res.status === 403) throw new Error(`Think Space answered ${res.status} for ${pathname}: is THINK_TOKEN a token that has not been revoked?`);
      throw new Error(`Think Space answered ${res.status} for ${pathname}`);
    }
  };
}

/** run fn on every item, a few at a time: Think Space is one small server */
async function eachLimited(items, limit, fn) {
  const queue = [...items];
  await Promise.all(Array.from({ length: limit }, async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) await fn(item);
  }));
}

/**
 * The blog's articles and books.
 * - articles: { id, title, body, publishedOn?, summary?, updatedAt, category? }, only what the blog uses
 *   (no folderId, bookId or the like, so none can reach a page)
 * - books: every book on the shelf (/api/listed-books); notesArticleId only when that article is on the blog
 */
export async function loadBlog(get) {
  const folders = await (await get('/api/folders')).json();
  const root = folders.find((f) => !f.parentId && f.name === ROOT_FOLDER);
  if (!root) throw new Error(`Think Space has no top-level folder named ${ROOT_FOLDER}`);
  const blogFolders = [root, ...folders.filter((f) => f.parentId === root.id)];

  const [listed, books] = await Promise.all([
    Promise.all(blogFolders.map(async (folder) => {
      const items = await (await get(`/api/articles?folder=${encodeURIComponent(folder.id)}`)).json();
      return items.map((item) => ({ id: item.id, category: folder === root ? undefined : folder.name }));
    })),
    get('/api/listed-books').then((r) => r.json()),
  ]);
  const notesIds = new Set(books.map((b) => b.notesArticleId).filter(Boolean));

  const articles = [];
  await eachLimited(listed.flat(), 6, async ({ id, category }) => {
    const res = await get(`/api/articles/${encodeURIComponent(id)}`, { allowMissing: true });
    if (!res) return; // moved or removed since the list was read
    const a = await res.json();
    if (!a.publishedOn && !notesIds.has(a.id)) return; // a draft
    if (a.format === 'html') console.warn(`Think Space article ${a.title} (${a.id}) is HTML, drawn as markdown`);
    articles.push({
      id: a.id, title: a.title ?? '', body: a.body ?? '',
      ...(a.publishedOn ? { publishedOn: a.publishedOn } : {}),
      ...(a.summary ? { summary: a.summary } : {}),
      createdAt: toMs(a.createdAt ?? a.updatedAt), updatedAt: toMs(a.updatedAt),
      ...(category ? { category } : {}),
    });
  });

  const onBlog = new Set(articles.map((a) => a.id));
  return {
    articles,
    books: books.map((b) => ({
      id: b.id, title: b.title ?? '',
      ...(b.author ? { author: b.author } : {}),
      ...(b.category ? { category: b.category } : {}),
      percent: Number(b.percent) || 0,
      ...(b.finishedMonth ? { finishedMonth: b.finishedMonth } : {}),
      ...(b.isbn ? { isbn: b.isbn } : {}),
      ...(b.notesArticleId && onBlog.has(b.notesArticleId) ? { notesArticleId: b.notesArticleId } : {}),
      ...(b.coverFileId ? { coverFileId: b.coverFileId } : {}),
    })),
  };
}

/** a time as milliseconds, whether Think Space gave a number or an ISO string */
function toMs(t) {
  if (typeof t === 'number') return t;
  const ms = Date.parse(t ?? '');
  return Number.isNaN(ms) ? Date.now() : ms;
}
