import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadBlog, thinkClient } from '../src/lib/think-api.mjs';
import { blogPictures } from './publish-medium.mjs';

const t = Date.parse('2026-11-01T00:00:00Z');
const folders = [
  { id: 'root', name: '部落格' }, { id: 'dev', name: '開發日常', parentId: 'root' }, { id: 'bn', name: '讀書筆記', parentId: 'root' },
  { id: 'deep', name: '更深', parentId: 'dev' }, { id: 'other', name: '部落格', parentId: 'x' },
];
const articles = {
  a1: { id: 'a1', title: '分類裡的', body: 'b', publishedOn: '2026-11-20', folderId: 'dev', createdAt: t, updatedAt: t },
  a2: { id: 'a2', title: '根目錄的', body: 'b', publishedOn: '2026-11-21', createdAt: t, updatedAt: '2026-11-22T00:00:00Z' },
  draft: { id: 'draft', title: '草稿', body: 'b', createdAt: t, updatedAt: t },
  n1: { id: 'n1', title: '筆記', body: 'b', publishedOn: '2026-11-02', bookId: 'b1', playedTo: 3, createdAt: t, updatedAt: t },
  deep: { id: 'deep', title: '太深', body: 'b', publishedOn: '2026-11-01', createdAt: t, updatedAt: t },
};
const inFolder = { root: ['a2'], dev: ['a1', 'draft'], bn: ['n1'], deep: ['deep'], other: [] };
const fakeGet = async (pathname, { allowMissing } = {}) => {
  const u = new URL(pathname, 'http://x');
  const body = u.pathname === '/api/folders' ? folders
    : u.pathname === '/api/articles' ? (inFolder[u.searchParams.get('folder')] ?? []).map((id) => ({ id }))
    : articles[u.pathname.replace('/api/articles/', '')];
  if (!body) { if (allowMissing) return null; throw new Error(`404 ${pathname}`); }
  return { json: async () => body };
};

test('the blog is 部落格 and its folders one level down; a folder is the category; drafts are left out', async () => {
  const got = await loadBlog(fakeGet);
  const byId = Object.fromEntries(got.map((a) => [a.id, a]));
  assert.deepEqual(Object.keys(byId).sort(), ['a1', 'a2', 'n1']);
  assert.equal(byId.a1.category, '開發日常');
  assert.equal(byId.a2.category, undefined);
  assert.equal(byId.a2.updatedAt, Date.parse('2026-11-22T00:00:00Z'));
  assert.equal(byId.n1.category, '讀書筆記');
  for (const a of got) for (const key of ['folderId', 'bookId', 'playedTo']) assert.ok(!(key in a), `${key} is kept out`);
});

test('every request carries the token, and there is none without it', async () => {
  const saved = process.env.THINK_TOKEN;
  delete process.env.THINK_TOKEN;
  assert.throws(() => thinkClient('http://x'), /THINK_TOKEN/);
  process.env.THINK_TOKEN = saved ?? '';
  const realFetch = globalThis.fetch;
  let seen;
  globalThis.fetch = async (url, init) => { seen = { url, init }; return new Response('[]', { status: 200 }); };
  try {
    await thinkClient('https://think.example', 'tsk_1')('/api/folders');
    assert.equal(seen.url, 'https://think.example/api/folders');
    assert.equal(seen.init.headers.authorization, 'Bearer tsk_1');
  } finally { globalThis.fetch = realFetch; }
});

test('Medium gets a picture from the blog\'s copy, never from Think Space', async () => {
  const get = async (pathname) => ({ headers: new Headers({ 'content-type': pathname.includes('P1') ? 'image/png' : 'application/octet-stream' }) });
  const map = await blogPictures('![](/api/files/P1/display) ![](/api/files/X9/display)', get, 'https://blog.example/');
  assert.equal(map.get('P1'), 'https://blog.example/assets/think/P1.png');
  assert.equal(map.get('X9'), undefined);
});
