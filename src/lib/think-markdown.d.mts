export function slugify(s: string): string;
export function excerptFrom(parts: string[], max?: number): string;
export function renderThinkMarkdown(markdown: string, hooks: {
  highlight(code: string, lang: string): Promise<string>;
  media(src: string, alt: string): Promise<string>;
  mention(id: string): string | undefined;
}): Promise<{
  html: string;
  toc: { level: 1 | 2 | 3; text: string; id: string }[];
  prose: string[];
  chars: number;
  words: number;
  firstMedia: string | null;
}>;
