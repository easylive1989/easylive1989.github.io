import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blocksToMarkdown, mediaOf, notionPageOf, richText } from './notion-to-markdown.mjs';

const t = (content, annotations = {}, link) => ({
  type: 'text', plain_text: content, text: { content, link: link ? { url: link } : null }, annotations, href: link ?? null,
});
const block = (type, data = {}, children) => ({ type, [type]: data, has_children: !!children, ...(children ? { children } : {}) });
const p = (...items) => block('paragraph', { rich_text: items });

function convert(blocks, { pages = {}, media = {} } = {}) {
  const skipped = [];
  const md = blocksToMarkdown(blocks, {
    mention: (id) => pages[id],
    media: (b) => media[b.id],
    skip: (type) => skipped.push(type),
  });
  return { md, skipped };
}

test('paragraphs, headings and inline marks', () => {
  const { md } = convert([
    block('heading_1', { rich_text: [t('大標')] }),
    p(t('有 '), t('粗體 ', { bold: true }), t('斜體', { italic: true }), t('、'), t('刪掉', { strikethrough: true }), t('與 '), t('code`x', { code: true })),
    block('heading_3', { rich_text: [t('小標')] }),
  ]);
  assert.equal(md, '# 大標\n\n有 **粗體** *斜體*、~~刪掉~~與 ``code`x``\n\n### 小標');
});

test('text is taken literally: markdown marks and Think Space syntax are escaped', () => {
  const { md } = convert([p(t('a*b_c [[x|y]] {{red|z}} <b>')), p(t('# 不是標題')), p(t('1. 不是清單'))]);
  assert.equal(md, 'a\\*b\\_c \\[\\[x|y\\]\\] {\\{red|z}} \\<b>\n\n\\# 不是標題\n\n1\\. 不是清單');
});

test('lists keep their nesting, numbering and what is inside them', () => {
  const { md } = convert([
    block('bulleted_list_item', { rich_text: [t('一')] }, [
      block('bulleted_list_item', { rich_text: [t('一之一')] }),
      block('code', { rich_text: [t('void main() {}')], language: 'dart' }),
    ]),
    block('bulleted_list_item', { rich_text: [t('二')] }),
    block('numbered_list_item', { rich_text: [t('第一步')] }),
    block('numbered_list_item', { rich_text: [t('第二步')] }, [block('image', {}, undefined)]),
    p(t('之後')),
    block('numbered_list_item', { rich_text: [t('重新從一開始')] }),
  ].map((b, i) => ({ ...b, id: `b${i}` })), { media: {} });
  assert.equal(md, [
    '- 一\n\n  - 一之一\n\n  ```dart\n  void main() {}\n  ```\n- 二',
    '1. 第一步\n2. 第二步',
    '之後',
    '1. 重新從一開始',
  ].join('\n\n'));
});

test('images and videos are put where they were uploaded, with their captions', () => {
  const blocks = [
    { ...block('image', { type: 'file', file: { url: 'https://s3/x.png' }, caption: [t('截圖 [1]')] }), id: 'i1' },
    { ...block('video', { type: 'file', file: { url: 'https://s3/x.mov' }, caption: [] }), id: 'v1' },
    { ...block('image', { type: 'file', file: { url: 'https://s3/gone.png' }, caption: [] }), id: 'i2' },
  ];
  assert.deepEqual(mediaOf([p(t('x')), ...blocks]).map((b) => b.id), ['i1', 'v1', 'i2']);
  const { md, skipped } = convert(blocks, { media: { i1: '/api/files/F1/display', v1: '/api/videos/V1' } });
  assert.equal(md, '![截圖 ［1］](/api/files/F1/display)\n\n![](/api/videos/V1)');
  assert.deepEqual(skipped, ['image (not uploaded)']);
});

test('mentions and links to migrated pages become mentions; others keep only their words', () => {
  const pages = { aaaaaaaabbbbccccddddeeeeeeeeeeee: 'think1' };
  const mention = (id, words) => ({ type: 'mention', plain_text: words, mention: { type: 'page', page: { id } }, annotations: {} });
  const { md } = convert([
    p(mention('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '另一|篇'), t('、'), mention('ffffffff-bbbb-cccc-dddd-eeeeeeeeeeee', '沒搬的')),
    p(t('看這篇', {}, 'https://www.notion.so/Title-aaaaaaaabbbbccccddddeeeeeeeeeeee'), t(' 和 '), t('外站', {}, 'https://flutter.dev/a(b)')),
    p(t('私人頁', {}, '/0123456789abcdef0123456789abcdef')),
  ], { pages });
  assert.equal(md, '[[think1|另一｜篇]]、沒搬的\n\n[[think1|看這篇]] 和 [外站](https://flutter.dev/a%28b%29)\n\n私人頁');
  assert.equal(notionPageOf('https://example.com/aaaaaaaabbbbccccddddeeeeeeeeeeee'), null);
});

test('quotes, callouts, toggles, dividers, bookmarks and tables', () => {
  const { md } = convert([
    block('quote', { rich_text: [t('第一段')] }, [p(t('第二段'))]),
    block('callout', { rich_text: [t('PART 1 開始')], icon: { type: 'emoji', emoji: '💼' } }, [p(t('內容'))]),
    block('toggle', { rich_text: [t('展開')] }, [p(t('藏著的'))]),
    block('divider'),
    block('bookmark', { url: 'https://dartpad.dev/?id=1', caption: [] }),
    block('table', { has_column_header: true }, [
      block('table_row', { cells: [[t('欄')], [t('值')]] }),
      block('table_row', { cells: [[t('a|b')], [t('1')]] }),
    ]),
  ]);
  assert.equal(md, [
    '> 第一段\n>\n> 第二段',
    '## 💼 PART 1 開始',
    '內容',
    '**展開**',
    '藏著的',
    '---',
    '[https://dartpad.dev/?id=1](https://dartpad.dev/?id=1)',
    '| 欄 | 值 |\n| --- | --- |\n| a\\|b | 1 |',
  ].join('\n\n'));
});

test('what the blog does not draw is left out and reported', () => {
  const { md, skipped } = convert([block('column_list', {}, []), block('child_database'), p(t('留下'))]);
  assert.equal(md, '留下');
  assert.deepEqual(skipped, ['column_list', 'child_database']);
});

test('a line break inside a paragraph stays a line break', () => {
  assert.equal(richText([t('上\n下')], { mention: () => undefined }), '上\\\n下');
});
