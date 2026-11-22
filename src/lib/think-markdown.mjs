// Think Space's markdown → the blog's HTML, drawn the way the Notion blocks were (same classes, headings one level
// down, code in its plate, a link on its own line as a bookmark). Pure: highlighting code, putting pictures and
// videos in place and finding where a mention leads are given by the caller.
import { Marked } from 'marked';

// every color Think Space's `{{<color>|…}}` may name (its shared/src/text-color.ts TEXT_COLORS)
const COLORS = 'red|orange|yellow|green|teal|blue|indigo|purple|pink|brown|gray';
// a quote's color, from GitHub's alert marker alone on its first line (Think Space's shared/src/quote-color.ts)
const QUOTE_MARKS = { NOTE: 'blue', TIP: 'green', IMPORTANT: 'purple', WARNING: 'yellow', CAUTION: 'red' };
const QUOTE_MARK = new RegExp(`^[ \\t]*\\[!(${Object.keys(QUOTE_MARKS).join('|')})\\][ \\t]*$`, 'i');
const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** a heading's anchor, as the Notion headings had */
export function slugify(s) {
  return s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w一-鿿-]/g, '').replace(/^-+|-+$/g, '');
}

/** the words of inline tokens, marks and links taken off */
function plainOf(tokens) {
  return (tokens ?? []).map((t) => {
    if (t.type === 'mention') return t.label;
    if (t.tokens) return plainOf(t.tokens);
    if (t.type === 'image' || t.type === 'br') return t.type === 'br' ? ' ' : '';
    if (t.type === 'escape') return t.text;
    return t.text ?? '';
  }).join('');
}

const ONLY = (tokens, type) => {
  const kept = (tokens ?? []).filter((t) => !(t.type === 'text' && !t.text.trim()));
  return kept.length === 1 && kept[0].type === type ? kept[0] : null;
};
const isBareLink = (t) => !!t && /^https?:\/\//.test(t.href) && (plainOf(t.tokens) === t.href || plainOf(t.tokens).trim() === '');

/**
 * The first `max` or so characters of the prose: to the end of a sentence past the middle of that length, else cut
 * with an ellipsis (as the Notion pages' excerpts were)
 */
export function excerptFrom(parts, max = 120) {
  const chars = [...parts.join(' ')];
  if (chars.length <= max) return chars.join('');
  const head = chars.slice(0, max).join('');
  const end = Math.max(...['。', '！', '？', '!', '?'].map((p) => head.lastIndexOf(p)));
  if (end >= max * 0.5) return head.slice(0, end + 1);
  return head.replace(/[，、；：,;:\s]+$/, '') + '…';
}

/**
 * hooks:
 * - highlight(code, lang): the code's HTML (shiki)
 * - media(src, alt): the HTML of a picture or a video (`/api/videos/…`), downloaded or linked
 * - mention(id): where a mentioned page is on the blog, or undefined (only its words stay)
 * - picture(src): where a bookmark's picture (`/api/files/…/display`) is on the blog, or null to draw it without one
 *
 * Gives the HTML, the table of contents (levels 1–3 of the markdown), the prose (for an excerpt), the number of
 * characters and ASCII words (for the reading time) and the first picture's markdown address.
 */
/**
 * The picture a body opens with, before any words: its 首圖, which the list shows as the article's cover. A Think Space file
 * (`/api/files/…/display`) or a picture on the web; a picture further down is part of the text, not a cover.
 */
export function leadImage(body) {
  const m = /^!\[[^\]]*\]\(<?([^)\s>]+)>?(?:\s+"[^"]*")?\)/.exec(body.trimStart());
  return m && (/^\/api\/files\/[A-Za-z0-9_-]+\/display$/.test(m[1]) || /^https?:\/\//.test(m[1])) ? m[1] : null;
}

export async function renderThinkMarkdown(markdown, hooks) {
  const toc = [];
  let firstMedia = null;
  const marked = new Marked({
    async: true,
    gfm: true,
    extensions: [
      {
        name: 'mention', level: 'inline',
        start: (src) => src.indexOf('[['),
        tokenizer(src) {
          const m = /^\[\[([A-Za-z0-9_-]+)\\?\|((?:\\.|[^\]\n])*)\]\]/.exec(src);
          if (m) return { type: 'mention', raw: m[0], id: m[1], label: m[2].replace(/\\(.)/g, '$1') };
        },
        renderer: (t) => {
          if (!t.label) return '';
          const href = hooks.mention(t.id);
          return href ? `<a href="${escape(href)}">${escape(t.label)}</a>` : escape(t.label);
        },
      },
      {
        name: 'color', level: 'inline',
        start: (src) => src.indexOf('{{'),
        tokenizer(src) {
          const m = new RegExp(`^\\{\\{(${COLORS})\\\\?\\|((?:(?!\\}\\})[^\\n])+)\\}\\}`).exec(src);
          if (m) return { type: 'color', raw: m[0], color: m[1], tokens: this.lexer.inlineTokens(m[2]) };
        },
        renderer(t) { return `<span class="text-${t.color}">${this.parser.parseInline(t.tokens)}</span>`; },
      },
    ],
    async walkTokens(t) {
      if (t.type === 'blockquote') {
        // reshaped before anything is awaited, so that what is walked next is what is drawn
        shapeQuote(t, marked);
        if (t.bookmark?.image) t.bookmark.picture = await hooks.picture?.(`/api/files/${t.bookmark.image}/display`);
      }
      if (t.type === 'code') t.highlighted = await hooks.highlight(t.text, t.lang || 'text');
      if (t.type === 'image') {
        firstMedia ??= t.href;
        t.media = await hooks.media(t.href, t.text);
      }
    },
    renderer: {
      heading({ tokens, depth }) {
        const text = plainOf(tokens);
        const id = slugify(text);
        if (depth <= 3 && text.trim()) toc.push({ level: depth, text, id });
        const level = Math.min(6, depth + 1);
        return `<h${level} id="${escape(id)}" class="heading-anchor-target"><a href="#${escape(id)}" class="anchor-link" aria-hidden="true">#</a>${this.parser.parseInline(tokens)}</h${level}>\n`;
      },
      code(t) {
        return `<div class="code-block"><div class="code-header"><span class="code-language">${escape(t.lang || 'plain text')}</span></div>${t.highlighted}</div>\n`;
      },
      image(t) { return t.media; },
      paragraph({ tokens }) {
        const image = ONLY(tokens, 'image');
        if (image) return `${image.media}\n`;
        const link = ONLY(tokens, 'link');
        if (isBareLink(link)) return bookmark(link.href);
        return `<p>${this.parser.parseInline(tokens)}</p>\n`;
      },
      link({ href, tokens }) {
        const text = this.parser.parseInline(tokens);
        if (!/^(https?:|mailto:|\/|#)/i.test(href)) return text;
        const external = /^https?:/i.test(href);
        return `<a href="${escape(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${text}</a>`;
      },
      html({ text }) { return escape(text); },
      blockquote(t) {
        if (t.bookmark) return bookmarkCard(t.bookmark);
        return `<blockquote${t.color ? ` class="quote-${t.color}"` : ''}>\n${this.parser.parse(t.tokens)}</blockquote>\n`;
      },
      table({ header, rows }) {
        const cell = (c, tag) => `<${tag}${tag === 'th' ? ' scope="col"' : ''}>${this.parser.parseInline(c.tokens)}</${tag}>`;
        return `<div class="table-wrapper"><table><thead><tr>${header.map((c) => cell(c, 'th')).join('')}</tr></thead>`
          + `<tbody>${rows.map((r) => `<tr>${r.map((c) => cell(c, 'td')).join('')}</tr>`).join('')}</tbody></table></div>\n`;
      },
    },
  });

  const html = await marked.parse(markdown ?? '');

  // what is read: the prose for an excerpt, every word for the reading time
  const tokens = marked.lexer(markdown ?? '');
  const prose = [];
  let all = '';
  const walk = (list, inProse) => {
    for (const t of list) {
      if (t.type === 'paragraph' || (t.type === 'text' && t.tokens)) {
        const words = plainOf(t.tokens).replace(/\s+/g, ' ').trim();
        all += words;
        if (inProse && words && !/^https?:\/\/\S+$/.test(words)) prose.push(words);
      } else if (t.type === 'heading') all += plainOf(t.tokens);
      else if (t.type === 'code') all += t.text;
      else if (t.type === 'table') all += [...t.header, ...t.rows.flat()].map((c) => plainOf(c.tokens)).join('');
      else if (t.type === 'list') for (const item of t.items) walk(item.tokens, inProse);
      else if (t.type === 'blockquote') {
        shapeQuote(t, marked);
        if (!t.bookmark) walk(t.tokens, inProse);
      }
    }
  };
  walk(tokens, true);
  const words = (all.match(/[A-Za-z0-9]+/g) ?? []).length;
  return { html, toc, prose, chars: [...all].length, words, firstMedia };
}

function bookmark(url) {
  if (url.includes('dartpad.dev')) {
    return `<div class="dartpad-container"><iframe src="${escape(url)}" title="DartPad" loading="lazy"></iframe></div>\n`;
  }
  const shown = url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  return `<div class="bookmark"><a href="${escape(url)}" target="_blank" rel="noopener noreferrer"><span class="bookmark-text"><span class="bookmark-title">${escape(shown)}</span></span><span class="bookmark-arrow" aria-hidden="true">↗</span></a></div>\n`;
}

// ---------------------------------------------------------------- Think Space's quotes that are more than quotes

/**
 * A quote whose first line is an alert marker and nothing else (`> [!TIP]`) is a colored quote, drawn without that
 * line; a quote that is exactly a bookmark is a bookmark. Anything else stays an ordinary quote. Marks the token once.
 */
function shapeQuote(t, marked) {
  if (t.shaped) return;
  t.shaped = true;
  const text = t.text ?? '';
  const bookmark = bookmarkOf(text);
  if (bookmark) {
    t.bookmark = bookmark;
    t.tokens = []; // its picture is no figure and its words no prose
    return;
  }
  const [first, ...rest] = text.split('\n');
  const mark = QUOTE_MARK.exec(first);
  if (mark && rest.join('\n').trim()) {
    t.color = QUOTE_MARKS[mark[1].toUpperCase()];
    t.tokens = marked.lexer(rest.join('\n'));
  }
}

// A bookmark (Think Space's shared/src/bookmark.ts), Notion's link card:
//   > [!BOOKMARK] https://example.com/page
//   > ![](/api/files/<id>/display)      the page's picture, kept by Think Space (optional)
//   > **The page's title**               (optional)
//   > Its description, one line          (optional)
// The title and description are escaped markdown: read as words, never as marks, mentions or colors.
const BOOKMARK_LINE = /^[ \t]*\[!BOOKMARK\][ \t]+(\S+)[ \t]*$/i;
const BOOKMARK_IMAGE = /^!\[\]\(\/api\/files\/([A-Za-z0-9_-]{1,64})\/display\)$/;
const BOOKMARK_TITLE = /^\*\*(.+)\*\*$/;
const unescapeText = (s) => s.replace(/\\([!-/:-@[-`{-~])/g, '$1');
const oneLine = (s) => s.replace(/\s+/g, ' ').trim();

function bookmarkAddress(raw) {
  let u;
  try { u = new URL(raw); } catch { return undefined; }
  if ((u.protocol !== 'http:' && u.protocol !== 'https:') || u.username || u.password || !u.hostname) return undefined;
  return u.href;
}

export function bookmarkOf(text) {
  const lines = text.replace(/\n+$/, '').split('\n').map((l) => l.trim());
  const first = BOOKMARK_LINE.exec(lines.shift() ?? '');
  const url = first && bookmarkAddress(first[1]);
  if (!url) return null;
  const b = { url, title: '', description: '' };
  const image = lines[0] !== undefined ? BOOKMARK_IMAGE.exec(lines[0]) : null;
  if (image) { b.image = image[1]; lines.shift(); }
  const title = lines[0] !== undefined ? BOOKMARK_TITLE.exec(lines[0]) : null;
  if (title) { b.title = oneLine(unescapeText(title[1])); lines.shift(); }
  if (lines.length > 0) {
    if (lines.length > 1 || !lines[0]) return null;
    if (lines[0].startsWith('![') || BOOKMARK_TITLE.test(lines[0])) return null;
    b.description = oneLine(unescapeText(lines[0]));
  }
  return b;
}

/** an address as people read it: no scheme or www, percent-escapes decoded where they can be */
function shownAddress(url) {
  let shown = url;
  try { shown = decodeURI(url); } catch { /* as it is */ }
  return shown.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

function bookmarkCard(b) {
  const shown = shownAddress(b.url);
  const picture = b.picture ? `<span class="bookmark-image"><img src="${escape(b.picture)}" alt="" loading="lazy" decoding="async" /></span>` : '';
  const text = b.title
    ? `<span class="bookmark-title">${escape(b.title)}</span>${b.description ? `<span class="bookmark-desc">${escape(b.description)}</span>` : ''}<span class="bookmark-url">${escape(shown)}</span>`
    : `<span class="bookmark-title">${escape(shown)}</span>${b.description ? `<span class="bookmark-desc">${escape(b.description)}</span>` : ''}`;
  return `<div class="bookmark bookmark-card"><a href="${escape(b.url)}" target="_blank" rel="noopener noreferrer">${picture}<span class="bookmark-text">${text}</span>${picture ? '' : '<span class="bookmark-arrow" aria-hidden="true">↗</span>'}</a></div>\n`;
}
