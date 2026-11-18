// Think Space's markdown → the plain HTML Medium takes through its API. Pure: where a picture is on the web and
// where a mentioned page is on the blog are given by the caller. Medium keeps only a few tags (headings, p, a,
// strong, em, blockquote, pre, lists, figure, hr), so anything else is turned into one of those:
// - a table has no place on Medium: it stays as its markdown text in a <pre>
// - a video is a link back to the article on the blog
// - colors are dropped, raw HTML is shown as text
import { Marked } from 'marked';

const COLORS = 'red|blue|green|orange|purple';
const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * hooks:
 * - image(src): the picture's absolute address, or undefined (the picture is left out)
 * - mention(id): the mentioned page's absolute address on the blog, or undefined (only its words stay)
 * - canonicalUrl: the article on the blog, where a video sends the reader
 */
export async function thinkMarkdownToMediumHtml(markdown, hooks) {
  const marked = new Marked({
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
        renderer(t) { return this.parser.parseInline(t.tokens); },
      },
    ],
    renderer: {
      // the title is the page's <h1>; Medium has two sizes of heading under it
      heading({ tokens, depth }) {
        return `<h${depth === 1 ? 3 : 4}>${this.parser.parseInline(tokens)}</h${depth === 1 ? 3 : 4}>\n`;
      },
      code({ text }) { return `<pre>${escape(text)}</pre>\n`; },
      image({ href, text }) {
        if (/^\/api\/videos\//.test(href)) return `<a href="${escape(hooks.canonicalUrl)}">（影片請到原文觀看）</a>`;
        const src = /^https?:\/\//.test(href) ? href : hooks.image(href);
        if (!src) return '';
        return `<figure><img src="${escape(src)}" alt="${escape(text)}" />${text ? `<figcaption>${escape(text)}</figcaption>` : ''}</figure>`;
      },
      paragraph({ tokens }) {
        const kept = tokens.filter((t) => !(t.type === 'text' && !t.text.trim()));
        const inner = this.parser.parseInline(tokens);
        if (kept.length === 1 && kept[0].type === 'image' && inner.startsWith('<figure>')) return `${inner}\n`;
        return inner.trim() ? `<p>${inner}</p>\n` : '';
      },
      link({ href, tokens }) {
        const text = this.parser.parseInline(tokens);
        if (!/^(https?:|mailto:)/i.test(href)) return text;
        return `<a href="${escape(href)}">${text}</a>`;
      },
      html({ text }) { return escape(text); },
      table({ raw }) { return `<pre>${escape(raw.trim())}</pre>\n`; },
    },
  });
  return marked.parse(markdown ?? '');
}

/** the whole story as Medium wants it: the title first, the text, then a line that says where it was first written */
export async function mediumStory({ title, body, canonicalUrl, siteTitle }, hooks) {
  const html = await thinkMarkdownToMediumHtml(body, { ...hooks, canonicalUrl });
  return `<h1>${escape(title)}</h1>\n${html}<hr />\n<p><em>原文發表於 <a href="${escape(canonicalUrl)}">${escape(siteTitle)}</a></em></p>\n`;
}
