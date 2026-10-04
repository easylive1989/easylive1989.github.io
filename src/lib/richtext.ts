export interface RichTextItem {
  type: string;
  text: {
    content: string;
    link: { url: string } | null;
  };
  annotations: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color: string;
  };
  plain_text: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// A link to another page of the Notion workspace opens for nobody but its owner,
// so it is set as plain text.
function isNotionLink(url: string): boolean {
  return url.startsWith('/') || /^https?:\/\/([\w-]+\.)?notion\.(so|com|site)\//.test(url);
}

export function renderRichText(richText: RichTextItem[]): string {
  return richText
    .map((item) => {
      let text = escapeHtml(item.text?.content ?? item.plain_text ?? '');

      if (item.annotations.code) {
        text = `<code>${text}</code>`;
      }
      if (item.annotations.italic) {
        text = `<em>${text}</em>`;
      }
      if (item.annotations.bold) {
        text = `<strong>${text}</strong>`;
      }
      if (item.annotations.strikethrough) {
        text = `<s>${text}</s>`;
      }
      if (item.annotations.underline) {
        text = `<u>${text}</u>`;
      }

      if (item.text?.link && !isNotionLink(item.text.link.url)) {
        text = `<a href="${escapeHtml(item.text.link.url)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
      }

      return text;
    })
    .join('');
}
