// Think Space's markdown → the blog's HTML, drawn the way the Notion blocks were (same classes, headings one level
// down, code in its plate, a link on its own line as a bookmark). Pure: highlighting code, putting pictures and
// videos in place and finding where a mention leads are given by the caller.
import { Marked } from 'marked';

const COLORS = 'red|blue|green|orange|purple';
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
          if (m) return { type: 'color', raw: m[0], tokens: this.lexer.inlineTokens(m[2]) };
        },
        // the blog draws no colors: only the words
        renderer(t) { return this.parser.parseInline(t.tokens); },
      },
    ],
    async walkTokens(t) {
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
      else if (t.type === 'blockquote') walk(t.tokens, inProse);
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
