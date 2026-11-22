import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderThinkMarkdown, excerptFrom, leadImage } from '../src/lib/think-markdown.mjs';

const hooks = {
  highlight: async (code, lang) => `<pre data-lang="${lang}">${code}</pre>`,
  media: async (src, alt) => (src.startsWith('/api/videos/') ? `<VIDEO ${src}>` : `<FIG ${src} ${alt}>`),
  mention: (id) => (id === 'pub' ? '/abc/pub/' : undefined),
  picture: async (src) => (src === '/api/files/GONE/display' ? null : `/assets${src}`),
};
const render = (md) => renderThinkMarkdown(md, hooks);

test('headings sit one level under the page title, with anchors and a table of contents', async () => {
  const out = await render('# 準備\n\n## 安裝 Flutter\n\n#### 很深');
  assert.match(out.html, /<h2 id="準備" class="heading-anchor-target"><a href="#準備" class="anchor-link" aria-hidden="true">#<\/a>準備<\/h2>/);
  assert.match(out.html, /<h3 id="安裝-flutter"/);
  assert.match(out.html, /<h5 id="很深"/);
  assert.deepEqual(out.toc, [{ level: 1, text: '準備', id: '準備' }, { level: 2, text: '安裝 Flutter', id: '安裝-flutter' }]);
});

test('code goes through the highlighter inside the blog\'s code block', async () => {
  const out = await render('```dart\nvoid main() {}\n```');
  assert.equal(out.html.trim(),
    '<div class="code-block"><div class="code-header"><span class="code-language">dart</span></div><pre data-lang="dart">void main() {}</pre></div>');
});

test('a picture or video on its own is a figure, not a paragraph', async () => {
  const out = await render('![截圖](/api/files/F1/display)\n\n![](/api/videos/V1)');
  assert.equal(out.html.trim(), '<FIG /api/files/F1/display 截圖>\n<VIDEO /api/videos/V1>');
  assert.equal(out.firstMedia, '/api/files/F1/display');
});

test('mentions of public pages link to them; others keep their words', async () => {
  const out = await render('看 [[pub|那篇]] 與 [[hidden|私人的]]');
  assert.equal(out.html.trim(), '<p>看 <a href="/abc/pub/">那篇</a> 與 私人的</p>');
});

test('links open elsewhere; a line that is only a link is a bookmark, and DartPad is embedded', async () => {
  const out = await render('看 [Flutter](https://flutter.dev)\n\n[https://pub.dev/packages/x](https://pub.dev/packages/x)\n\n[https://dartpad.dev/?id=1](https://dartpad.dev/?id=1)');
  assert.match(out.html, /<a href="https:\/\/flutter.dev" target="_blank" rel="noopener noreferrer">Flutter<\/a>/);
  assert.match(out.html, /<div class="bookmark"><a href="https:\/\/pub.dev\/packages\/x" target="_blank" rel="noopener noreferrer"><span class="bookmark-text"><span class="bookmark-title">pub.dev\/packages\/x<\/span><\/span><span class="bookmark-arrow" aria-hidden="true">↗<\/span><\/a><\/div>/);
  assert.match(out.html, /<div class="dartpad-container"><iframe src="https:\/\/dartpad.dev\/\?id=1" title="DartPad" loading="lazy"><\/iframe><\/div>/);
});

test('raw HTML is shown as text, never run', async () => {
  const out = await render('<script>alert(1)</script>\n\n文字 <img src=x onerror=alert(1)>');
  assert.doesNotMatch(out.html, /<script|<img/);
});

test('tables are wrapped as the blog draws them', async () => {
  const out = await render('| 欄 | 值 |\n| --- | --- |\n| [[pub\\|那篇]] | {{red\\|1}} |');
  assert.match(out.html, /^<div class="table-wrapper"><table>/);
  assert.match(out.html, /<th scope="col">欄<\/th>/);
  assert.match(out.html, /<td><a href="\/abc\/pub\/">那篇<\/a><\/td>/);
  assert.match(out.html, /<td><span class="text-red">1<\/span><\/td>/);
});

test('the prose for an excerpt and the reading time', async () => {
  const out = await render('# 標題\n\n第一段，說了**一些**事。\n\n```js\nx()\n```\n\n- 清單項目\n\n[https://a.dev](https://a.dev)');
  assert.deepEqual(out.prose, ['第一段，說了一些事。', '清單項目']);
  assert.ok(out.chars > 10);
  assert.equal(excerptFrom(['短句。'], 120), '短句。');
  assert.equal(excerptFrom(['一'.repeat(200)], 10), `${'一'.repeat(10)}…`);
});

test('the 首圖 is the picture a body opens with, before any words', () => {
  assert.equal(leadImage('![](/api/files/kcm_O-1/display)\n\n工程師或多或少…'), '/api/files/kcm_O-1/display');
  assert.equal(leadImage('\n![封面](https://images.unsplash.com/photo-1?ixlib=rb-4.1.0&q=85)\n\n文字'), 'https://images.unsplash.com/photo-1?ixlib=rb-4.1.0&q=85');
  assert.equal(leadImage('在軟體開發中有個 Baby Step 原則。\n\n![](/api/files/l18F/display)'), null);
  assert.equal(leadImage('![](/api/videos/abc)\n\n影片不是封面'), null);
  assert.equal(leadImage(''), null);
});

// ---------------------------------------------------------------- Think Space's newer formats (2026-11-22)

const BOOKMARK = '> [!BOOKMARK] https://example.com/a%28b%29/%E6%96%87\n> ![](/api/files/IMG1/display)\n> **Example \\*Page\\* \\[\\[x|y\\]\\]**\n> 一行說明 \\{\\{red|不是顏色\\}\\}';

test('a bookmark with a picture, title and description is a card that opens elsewhere', async () => {
  const out = await render(BOOKMARK);
  assert.doesNotMatch(out.html, /blockquote|\[!BOOKMARK\]/);
  assert.match(out.html, /^<div class="bookmark bookmark-card"><a href="https:\/\/example.com\/a%28b%29\/%E6%96%87" target="_blank" rel="noopener noreferrer">/);
  assert.match(out.html, /<span class="bookmark-image"><img src="\/assets\/api\/files\/IMG1\/display" alt="" loading="lazy" decoding="async" \/><\/span>/);
  assert.match(out.html, /<span class="bookmark-title">Example \*Page\* \[\[x\|y\]\]<\/span>/);
  assert.match(out.html, /<span class="bookmark-desc">一行說明 \{\{red\|不是顏色\}\}<\/span>/);
  assert.match(out.html, /<span class="bookmark-url">example.com\/a\(b\)\/文<\/span>/);
  // its picture is not the page's first picture, and its lines are not prose
  assert.equal(out.firstMedia, null);
  assert.deepEqual(out.prose, []);
});

test('a bookmark that is only an address is a card without a picture', async () => {
  const out = await render('前面\n\n> [!BOOKMARK] https://flutter.dev/\n\n後面');
  assert.match(out.html, /<div class="bookmark bookmark-card"><a href="https:\/\/flutter.dev\/"[^>]*><span class="bookmark-text"><span class="bookmark-title">flutter.dev<\/span><\/span><span class="bookmark-arrow" aria-hidden="true">↗<\/span><\/a><\/div>/);
  assert.doesNotMatch(out.html, /<img/);
  assert.deepEqual(out.prose, ['前面', '後面']);
});

test('a bookmark whose picture cannot be downloaded is drawn without it', async () => {
  const out = await render('> [!BOOKMARK] https://a.dev/\n> ![](/api/files/GONE/display)\n> **A**');
  assert.match(out.html, /bookmark-card/);
  assert.doesNotMatch(out.html, /<img|bookmark-image/);
});

test('a quote that is not exactly a bookmark is an ordinary quote', async () => {
  for (const md of [
    '> [!BOOKMARK] javascript:alert(1)\n> **A**',
    '> [!BOOKMARK] https://a.dev/\n> 說明一\n> 說明二',
    '> [!BOOKMARK] https://a.dev/\n> ![](https://evil.example/x.png)',
  ]) {
    const out = await render(md);
    assert.match(out.html, /^<blockquote>/, md);
    assert.doesNotMatch(out.html, /bookmark-card|href="javascript/, md);
  }
});

test('the alert markers color a quote, and their line is not shown', async () => {
  const colors = { NOTE: 'blue', TIP: 'green', IMPORTANT: 'purple', WARNING: 'yellow', CAUTION: 'red' };
  for (const [mark, color] of Object.entries(colors)) {
    const out = await render(`> [!${mark}]\n> 小心 **這裡**`);
    assert.equal(out.html.trim(), `<blockquote class="quote-${color}">\n<p>小心 <strong>這裡</strong></p>\n</blockquote>`);
    assert.deepEqual(out.prose, ['小心 這裡']);
  }
  const lower = await render('> [!tip]\n> 小寫也算');
  assert.match(lower.html, /<blockquote class="quote-green">/);
  const plain = await render('> 一般的引言');
  assert.match(plain.html, /^<blockquote>\n<p>一般的引言<\/p>/);
});

test('a marker with nothing after it is shown as it is', async () => {
  const out = await render('> [!WARNING]');
  assert.match(out.html, /^<blockquote>/);
  assert.match(out.html, /\[!WARNING\]/);
});

test('every text color Think Space has is drawn, in a table too', async () => {
  const names = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'indigo', 'purple', 'pink', 'brown', 'gray'];
  const out = await render(names.map((n) => `{{${n}|字${n}}}`).join(' '));
  for (const n of names) assert.match(out.html, new RegExp(`<span class="text-${n}">字${n}</span>`));
  assert.doesNotMatch(out.html, /\{\{/);
  const unknown = await render('{{black|不是}}');
  assert.match(unknown.html, /\{\{black\|不是\}\}/);
  const nested = await render('{{red|**粗** 與 [[pub|那篇]]}}');
  assert.match(nested.html, /<span class="text-red"><strong>粗<\/strong> 與 <a href="\/abc\/pub\/">那篇<\/a><\/span>/);
});

test('markers do not count in the reading time', async () => {
  const marked = await render('> [!TIP]\n> 內容\n\n> [!BOOKMARK] https://a.dev/\n> **ABC title**');
  const bare = await render('> 內容');
  assert.equal(marked.chars, bare.chars);
  assert.equal(marked.words, bare.words);
});
