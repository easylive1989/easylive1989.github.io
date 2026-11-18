import { test } from 'node:test';
import assert from 'node:assert/strict';
import { thinkMarkdownToMediumHtml, mediumStory } from './medium-html.mjs';
import { postsOf, unpublished, categorySlug } from './publish-medium.mjs';

const hooks = {
  image: (src) => (src.startsWith('/api/files/') ? `https://think.example${src}` : undefined),
  mention: (id) => (id === 'pub' ? 'https://blog.example/abc/pub/' : undefined),
  canonicalUrl: 'https://blog.example/abc/a1/',
};
const html = (md) => thinkMarkdownToMediumHtml(md, hooks);

test('headings become Medium\'s two sizes, under the title', async () => {
  assert.equal(await html('# 準備\n\n## 安裝\n\n#### 很深'), '<h3>準備</h3>\n<h4>安裝</h4>\n<h4>很深</h4>\n');
});

test('code is a plain <pre>, escaped', async () => {
  assert.equal(await html('```dart\nList<int> a = [];\n```'), '<pre>List&lt;int&gt; a = [];</pre>\n');
});

test('a Think Space picture gets its address on the web; a video sends the reader to the blog', async () => {
  assert.equal(await html('![截圖](/api/files/F1/display)'),
    '<figure><img src="https://think.example/api/files/F1/display" alt="截圖" /><figcaption>截圖</figcaption></figure>\n');
  assert.equal(await html('![](https://x.example/a.png)'), '<figure><img src="https://x.example/a.png" alt="" /></figure>\n');
  assert.equal(await html('![](/api/videos/V1)'), '<p><a href="https://blog.example/abc/a1/">（影片請到原文觀看）</a></p>\n');
  assert.equal(await html('![](/somewhere/else.png)'), '');
});

test('mentions of public pages link to the blog; others keep their words; colors are dropped', async () => {
  assert.equal(await html('看 [[pub|那篇]] 與 [[hidden|私人的]]，{{red|很重要}}'),
    '<p>看 <a href="https://blog.example/abc/pub/">那篇</a> 與 私人的，很重要</p>\n');
});

test('a table stays as its text; raw HTML is shown, not run; a relative link keeps only its words', async () => {
  assert.equal(await html('| a | b |\n|---|---|\n| 1 | 2 |'), '<pre>| a | b |\n|---|---|\n| 1 | 2 |</pre>\n');
  assert.match(await html('<script>alert(1)</script>'), /&lt;script&gt;/);
  assert.equal(await html('[這裡](/abc/)與[那裡](https://x.example)'), '<p>這裡與<a href="https://x.example">那裡</a></p>\n');
});

test('a story opens with its title and ends with where it was first written', async () => {
  const story = await mediumStory({ title: 'A & B', body: '內文', canonicalUrl: hooks.canonicalUrl, siteTitle: '保羅的學習筆記' }, hooks);
  assert.equal(story,
    '<h1>A &amp; B</h1>\n<p>內文</p>\n<hr />\n<p><em>原文發表於 <a href="https://blog.example/abc/a1/">保羅的學習筆記</a></em></p>\n');
});

test('only articles are posts: 碎碎念 and 讀書筆記 are left out, and each knows where it is on the blog', () => {
  const articles = [
    { id: 'a1', title: '文章', body: 'x', category: 'Flutter', publishedOn: '2026-02-01', createdAt: 0 },
    { id: 'a2', title: '沒分類', body: 'x', createdAt: Date.UTC(2026, 0, 5) },
    { id: 'n1', title: '碎念', body: 'x', category: '碎碎念', createdAt: 0 },
    { id: 'b1', title: '書的筆記', body: 'x', category: '隨便', createdAt: 0 },
    { id: 'b2', title: '沒掛上書的筆記', body: 'x', category: '讀書筆記', createdAt: 0 },
  ];
  const posts = postsOf(articles, [{ id: 'book', notesArticleId: 'b1' }], { siteUrl: 'https://blog.example/', defaultCategory: '開發日常' });
  assert.deepEqual(posts.map((p) => p.id), ['a2', 'a1']); // oldest first
  assert.equal(posts[1].url, `https://blog.example/${categorySlug('Flutter')}/a1/`);
  assert.equal(posts[0].category, '開發日常');
  assert.equal(posts[0].date, '2026-01-05');
});

test('what the list already has is not new', () => {
  const posts = [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }];
  const state = { articles: { a1: { skipped: 'before-sync' }, a3: { mediumUrl: 'https://medium.com/p/1' } } };
  assert.deepEqual(unpublished(posts, state).map((p) => p.id), ['a2']);
});
