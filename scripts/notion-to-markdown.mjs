// Notion blocks → the markdown Think Space keeps (and the blog draws). Only what the blog draws today is carried over;
// anything else is reported as skipped. Pure: uploads and the Notion → Think Space id map are given by the caller.

/** a Notion id without its dashes, as it appears in links */
export const bareId = (id) => String(id).replace(/-/g, '').toLowerCase();

/** text taken literally: markdown's marks, Think Space's [[mentions]] and {{colors}} escaped */
export function literal(text) {
  return text.replace(/[\\*_`<[\]~]/g, '\\$&').replace(/\{(?=\{)/g, '{\\');
}

/** a line that would otherwise start a heading, quote, list or rule */
function guardLineStart(line) {
  return line.replace(/^(\s*)([#>+-]|\d+\.)(?=\s|$)/, (_m, space, mark) =>
    `${space}${/^\d/.test(mark) ? mark.replace('.', '\\.') : `\\${mark}`}`);
}

/** a mention's label, as Think Space writes it: brackets and bars become full-width */
const mentionLabel = (label) => label.replace(/\[/g, '［').replace(/\]/g, '］').replace(/\|/g, '｜').replace(/\n/g, ' ');

/** the Notion page a link points at, when it is one of the workspace's */
export function notionPageOf(url) {
  if (!url) return null;
  if (!(url.startsWith('/') || /^https?:\/\/([\w-]+\.)?notion\.(so|com|site)\//.test(url))) return null;
  const m = url.split(/[?#]/)[0].match(/([0-9a-f]{32})$/i) ?? url.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return m ? bareId(m[1]) : '';
}

/** wraps text in a mark, keeping the spaces around it outside (`** x**` is not bold) */
function wrap(text, mark) {
  const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  return m[2] ? `${m[1]}${mark}${m[2]}${mark}${m[3]}` : text;
}

function inlineCode(text) {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((t) => t.length));
  const fence = '`'.repeat(longest + 1);
  const pad = text.startsWith('`') || text.endsWith('`') ? ' ' : '';
  return `${fence}${pad}${text}${pad}${fence}`;
}

/**
 * rich text → inline markdown. ctx.mention(notionId) gives the Think Space id of a migrated page (undefined: the
 * page was not migrated, and only its words stay)
 */
export function richText(items, ctx) {
  return (items ?? []).map((item) => {
    const words = item.plain_text ?? item.text?.content ?? '';
    if (item.type === 'mention') {
      const page = item.mention?.page?.id ?? item.mention?.database?.id;
      const target = page ? ctx.mention(bareId(page)) : undefined;
      if (target) return `[[${target}|${mentionLabel(words)}]]`;
      return literal(words);
    }
    if (item.type === 'equation') return inlineCode(item.equation?.expression ?? words);
    const a = item.annotations ?? {};
    let text = a.code ? inlineCode(words) : literal(words).replace(/\n/g, '\\\n');
    if (a.italic) text = wrap(text, '*');
    if (a.bold) text = wrap(text, '**');
    if (a.strikethrough) text = wrap(text, '~~');
    const url = item.text?.link?.url ?? item.href;
    if (url) {
      const page = notionPageOf(url);
      if (page === null) text = `[${text}](${url.replace(/[()\s]/g, urlChar)})`;
      else if (page && ctx.mention(page)) text = `[[${ctx.mention(page)}|${mentionLabel(words)}]]`;
    }
    return text;
  }).join('');
}

/** a character that would end a markdown link's address */
const urlChar = (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`;

const plain = (items) => (items ?? []).map((t) => t.plain_text ?? '').join('');

/** the language Think Space's code blocks name */
function language(lang) {
  if (!lang || lang === 'plain text') return '';
  const known = { 'c#': 'cs', 'c++': 'cpp', shell: 'bash', 'objective-c': 'objc' };
  return known[lang] ?? lang.replace(/\s+/g, '-');
}

function codeBlock(text, lang) {
  const longest = Math.max(2, ...(text.match(/^`{3,}/gm) ?? []).map((t) => t.length));
  const fence = '`'.repeat(longest + 1);
  return `${fence}${language(lang)}\n${text.replace(/\n$/, '')}\n${fence}`;
}

const indent = (text, by) => text.split('\n').map((l) => (l ? by + l : l)).join('\n');

/** the media of a page (images and videos uploaded to Notion, or linked), in order, children included */
export function mediaOf(blocks) {
  const found = [];
  const walk = (list) => {
    for (const b of list ?? []) {
      if (b.type === 'image' || b.type === 'video') found.push(b);
      walk(b.children);
    }
  };
  walk(blocks);
  return found;
}

const SKIPPED = new Set(['column_list', 'column', 'child_database', 'link_to_page', 'child_page', 'table_of_contents',
  'breadcrumb', 'synced_block', 'template', 'unsupported', 'link_preview', 'audio', 'file', 'pdf']);

/**
 * blocks → markdown. ctx:
 * - mention(notionId): the Think Space id of a migrated page, else undefined
 * - media(block): the address the image or video was put at (undefined: it could not be, and it is skipped)
 * - skip(type, block): told of what is left out
 */
export function blocksToMarkdown(blocks, ctx) {
  const parts = [];
  let list = null; // the kind of list the previous block was in, so items stay together
  let number = 0;
  for (const block of blocks ?? []) {
    const md = blockToMarkdown(block, ctx, () => ++number);
    const kind = block.type === 'bulleted_list_item' || block.type === 'to_do' ? 'bullet'
      : block.type === 'numbered_list_item' ? 'number' : null;
    if (kind !== 'number') number = 0;
    if (md === null) continue;
    if (kind && kind === list) parts[parts.length - 1] += `\n${md}`;
    else parts.push(md);
    list = kind;
  }
  return parts.join('\n\n');
}

function children(block, ctx) {
  return block.children?.length ? blocksToMarkdown(block.children, ctx) : '';
}

function blockToMarkdown(block, ctx, nextNumber) {
  const data = block[block.type] ?? {};
  const text = () => richText(data.rich_text, ctx);
  switch (block.type) {
    case 'paragraph': {
      const body = text().split('\n').map(guardLineStart).join('\n');
      const sub = children(block, ctx);
      if (!body && !sub) return null;
      return sub ? `${body}\n\n${sub}` : body;
    }
    case 'heading_1': case 'heading_2': case 'heading_3': case 'heading_4': {
      const level = Number(block.type.slice(-1));
      const head = `${'#'.repeat(level)} ${text().replace(/\\\n/g, ' ')}`;
      // a toggle heading's content follows it
      const sub = children(block, ctx);
      return sub ? `${head}\n\n${sub}` : head;
    }
    case 'bulleted_list_item': case 'numbered_list_item': case 'to_do': {
      const marker = block.type === 'numbered_list_item' ? `${nextNumber()}.`
        : block.type === 'to_do' ? `- [${data.checked ? 'x' : ' '}]` : '-';
      const pad = ' '.repeat(block.type === 'to_do' ? 2 : marker.length + 1);
      const first = text().split('\n').map((l, i) => (i ? pad + l : guardListText(l))).join('\n');
      const sub = children(block, ctx);
      return `${marker} ${first}${sub ? `\n\n${indent(sub, pad)}` : ''}`;
    }
    case 'quote': {
      const body = [text(), children(block, ctx)].filter(Boolean).join('\n\n');
      return body.split('\n').map((l) => (l ? `> ${l}` : '>')).join('\n');
    }
    case 'callout': {
      // the books' 「💼 PART …」 callouts: a heading (decided with Paul), its content after it
      const icon = data.icon?.type === 'emoji' ? `${data.icon.emoji} ` : '';
      const head = `## ${icon}${text().replace(/\\\n/g, ' ')}`;
      const sub = children(block, ctx);
      return sub ? `${head}\n\n${sub}` : head;
    }
    case 'toggle': {
      const head = text() ? `**${text()}**` : '';
      return [head, children(block, ctx)].filter(Boolean).join('\n\n') || null;
    }
    case 'code':
      return codeBlock(plain(data.rich_text), data.language);
    case 'equation':
      return codeBlock(data.expression ?? '', 'latex');
    case 'divider':
      return '---';
    case 'image': case 'video': {
      const src = ctx.media(block);
      if (!src) {
        ctx.skip(`${block.type} (not uploaded)`, block);
        return null;
      }
      const alt = mentionLabel(plain(data.caption)).replace(/\n/g, ' ');
      return `![${alt}](${src})`;
    }
    case 'bookmark': case 'embed': {
      const url = data.url;
      if (!url) return null;
      const caption = richText(data.caption, ctx);
      return `[${caption || literal(url)}](${url.replace(/[()\s]/g, urlChar)})`;
    }
    case 'table':
      return table(block, ctx);
    default:
      ctx.skip(SKIPPED.has(block.type) ? block.type : `${block.type} (unknown)`, block);
      return null;
  }
}

/** a list item's text, which a nested marker or a number would turn into another list */
const guardListText = (line) => line.replace(/^([+-]|\d+\.)(?=\s)/, (m) => (/^\d/.test(m) ? m.replace('.', '\\.') : `\\${m}`));

function table(block, ctx) {
  const rows = (block.children ?? []).filter((r) => r.type === 'table_row')
    .map((r) => r.table_row.cells.map((cell) => richText(cell, ctx).replace(/\\\n/g, ' ').replace(/\|/g, '\\|')));
  if (rows.length === 0) return null;
  const width = Math.max(...rows.map((r) => r.length));
  const line = (cells) => `| ${Array.from({ length: width }, (_, i) => cells[i] ?? '').join(' | ')} |`;
  const [head, ...body] = block.table?.has_column_header === false ? [Array(width).fill(''), ...rows] : rows;
  return [line(head), line(Array(width).fill('---')), ...body.map(line)].join('\n');
}
