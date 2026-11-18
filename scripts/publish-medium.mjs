// Sends the blog's new articles to Medium. Run after a deploy (.github/workflows/medium.yml).
//
// What is "new": an article of Think Space's that medium-published.json does not list. The file is committed, so a
// rebuild never sends an article twice. The first run (no file yet) lists every article there is and sends nothing.
//
// - only articles: 碎碎念 and 讀書筆記 are left out (as src/lib/think.ts tells them apart)
// - an article not yet on the blog (written after the last build) waits for the next run
// - a story is made as a draft unless MEDIUM_PUBLISH_STATUS says public or unlisted; its canonical URL is the blog's
// - at most MEDIUM_MAX_PER_RUN (3) a run, so a mistake cannot flood Medium: its API can make a story, not take it back
//
//   MEDIUM_TOKEN=… node scripts/publish-medium.mjs            send what is new
//   node scripts/publish-medium.mjs --dry-run                 say what would be sent, send nothing, write nothing
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { mediumStory } from './medium-html.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const STATE_FILE = path.join(ROOT, 'medium-published.json');
const NOTES_FOLDER = '碎碎念';
const BOOK_NOTES_FOLDER = '讀書筆記';
const USER_AGENT = 'blog-medium-sync';

export const categorySlug = (name) => createHash('md5').update(name).digest('hex').slice(0, 8);

/** the articles among Think Space's public pages, each with where it is on the blog (as src/lib/think.ts decides) */
export function postsOf(articles, books, { siteUrl, defaultCategory }) {
  const bookNotes = new Set(books.map((b) => b.notesArticleId).filter(Boolean));
  const site = siteUrl.replace(/\/$/, '');
  return articles
    .filter((a) => !bookNotes.has(a.id) && a.category !== NOTES_FOLDER && a.category !== BOOK_NOTES_FOLDER)
    .map((a) => {
      const category = a.category || defaultCategory;
      return {
        id: a.id, title: a.title, body: a.body ?? '', category,
        date: a.publishedOn ?? new Date(a.createdAt).toISOString().slice(0, 10),
        url: `${site}/${categorySlug(category)}/${a.id}/`,
      };
    })
    .sort((x, y) => x.date.localeCompare(y.date));
}

/** the articles the list does not have yet, oldest first */
export const unpublished = (posts, state) => posts.filter((p) => !state.articles[p.id]);

async function getJson(url, headers = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json', 'user-agent': USER_AGENT, ...headers } });
      if (res.ok) return await res.json();
      if (res.status === 404) return null;
      if (res.status < 500 || attempt >= 3) throw Object.assign(new Error(`${url} answered ${res.status}: ${(await res.text()).slice(0, 300)}`), { final: true });
    } catch (err) {
      if (err.final || attempt >= 3) throw err;
    }
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
}

async function loadPosts(config) {
  const base = (process.env.THINK_BASE_URL || config.think.baseUrl).replace(/\/$/, '');
  const [list, books] = await Promise.all([getJson(`${base}/api/public/articles`), getJson(`${base}/api/public/books`)]);
  if (!Array.isArray(list) || !Array.isArray(books)) throw new Error('Think Space gave no list of articles or books');
  const articles = [];
  for (const item of list) {
    const article = await getJson(`${base}/api/articles/${encodeURIComponent(item.id)}`);
    if (article) articles.push(article);
  }
  const posts = postsOf(articles, books, { siteUrl: config.site.url, defaultCategory: config.notion.defaultCategory });
  return { posts, base };
}

async function isLive(url) {
  try {
    return (await fetch(url, { headers: { 'user-agent': USER_AGENT } })).ok;
  } catch {
    return false;
  }
}

async function medium(pathname, token, body) {
  const res = await fetch(`https://api.medium.com/v1${pathname}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      accept: 'application/json',
      'accept-charset': 'utf-8',
      'user-agent': USER_AGENT,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Medium answered ${res.status} for ${pathname}: ${text.slice(0, 300)}`);
  return JSON.parse(text).data;
}

async function discord(message) {
  const hook = process.env.DISCORD_WEBHOOK_URL;
  if (!hook) return;
  try {
    await fetch(hook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: message.slice(0, 1900) }) });
  } catch (err) {
    console.warn(`Discord could not be told: ${err.message}`);
  }
}

const saveState = (state) => fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const config = parse(fs.readFileSync(path.join(ROOT, 'site.config.yaml'), 'utf8'));
  const { posts, base } = await loadPosts(config);

  if (!fs.existsSync(STATE_FILE)) {
    console.log(`First run: the ${posts.length} articles there are now are listed as already there, none is sent.`);
    if (!dryRun) saveState({ articles: Object.fromEntries(posts.map((p) => [p.id, { title: p.title, skipped: 'before-sync' }])) });
    return;
  }
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  const fresh = unpublished(posts, state);
  if (!fresh.length) { console.log('Nothing new for Medium.'); return; }

  const max = Number(process.env.MEDIUM_MAX_PER_RUN) || 3;
  const publishStatus = process.env.MEDIUM_PUBLISH_STATUS || 'draft';
  if (!['draft', 'public', 'unlisted'].includes(publishStatus)) throw new Error(`MEDIUM_PUBLISH_STATUS is ${publishStatus}: it is draft, public or unlisted`);
  const hrefs = new Map(posts.map((p) => [p.id, p.url]));
  const token = process.env.MEDIUM_TOKEN;
  if (!token && !dryRun) throw new Error(`MEDIUM_TOKEN is not set, and ${fresh.length} new articles wait for Medium`);
  let userId;
  const sent = [];
  const failed = [];

  for (const post of fresh.slice(0, max)) {
    if (!(await isLive(post.url))) {
      console.log(`Waits for the next run, not on the blog yet: ${post.title} (${post.url})`);
      continue;
    }
    const content = await mediumStory(
      { title: post.title, body: post.body, canonicalUrl: post.url, siteTitle: config.site.title },
      { image: (src) => (src.startsWith('/api/files/') ? `${base}${src}` : undefined), mention: (id) => hrefs.get(id) },
    );
    if (dryRun) {
      console.log(`Would send as ${publishStatus}: ${post.title} (${post.url}), ${content.length} characters of HTML`);
      continue;
    }
    try {
      userId ??= (await medium('/me', token)).id;
      const story = await medium(`/users/${userId}/posts`, token, {
        title: post.title,
        contentFormat: 'html',
        content,
        canonicalUrl: post.url,
        tags: [post.category.slice(0, 25)],
        publishStatus,
      });
      state.articles[post.id] = { title: post.title, mediumUrl: story.url, status: publishStatus, at: new Date().toISOString() };
      saveState(state); // after each one: a later failure must not lose what was sent
      sent.push({ post, url: story.url });
      console.log(`Sent as ${publishStatus}: ${post.title} → ${story.url}`);
    } catch (err) {
      failed.push({ post, message: err.message });
      console.error(`Could not send ${post.title}: ${err.message}`);
    }
  }
  if (fresh.length > max) console.log(`${fresh.length - max} more wait for the next run (at most ${max} a run).`);

  if (sent.length) {
    const what = publishStatus === 'draft' ? '草稿已送到 Medium，看過後按發佈' : '已發佈到 Medium';
    await discord(`📝 **${what}**\n${sent.map((s) => `- [${s.post.title}](${s.url})`).join('\n')}`);
  }
  if (failed.length) {
    await discord(`❌ **發到 Medium 失敗（下次 build 會再試）**\n${failed.map((f) => `- ${f.post.title}：${f.message}`).join('\n')}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(async (err) => {
    console.error(err.message);
    await discord(`❌ **Medium 同步失敗**\n${err.message}`);
    process.exit(1);
  });
}
