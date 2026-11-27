import { categorySlug } from './category';
import type { Article, Note } from './types';
import { drawThink, thinkArticleBody, thinkArticles, thinkNoteBodies, thinkNotes, type Content } from './think';

export type { Content } from './think';

export interface Category {
  name: string;
  slug: string;
}

let cachedArticles: Article[] | null = null;

export async function getAllArticles(): Promise<Article[]> {
  return (cachedArticles ??= await thinkArticles());
}

export async function getAllCategories(): Promise<Category[]> {
  const articles = await getAllArticles();
  const seen = new Set<string>();
  const categories: Category[] = [];

  for (const article of articles) {
    if (!article.category || seen.has(article.category)) continue;
    seen.add(article.category);
    categories.push({ name: article.category, slug: categorySlug(article.category) });
  }

  return categories;
}

export async function getArticlesByCategory(slug: string): Promise<Article[]> {
  const articles = await getAllArticles();
  return articles.filter((a) => categorySlug(a.category) === slug);
}

export interface ArticleWithContent {
  article: Article;
  content: Content;
  categorySlug: string;
  categoryName: string;
}

export async function getArticle(catSlug: string, articleId: string): Promise<ArticleWithContent | null> {
  const article = (await getAllArticles()).find((a) => a.id === articleId);
  if (!article || categorySlug(article.category) !== catSlug) return null;
  return { article, content: await drawThink((await thinkArticleBody(article.id)) ?? ''), categorySlug: catSlug, categoryName: article.category };
}

// ─────────────────────────────────────────────────────────────────
// The desk's notes — 部落格/碎碎念, newest first
// ─────────────────────────────────────────────────────────────────

let cachedNotes: Note[] | null = null;

export async function getAllNotes(): Promise<Note[]> {
  return (cachedNotes ??= await thinkNotes());
}

let cachedNoteBodies: Promise<Map<string, string>> | null = null;

/** The body of every note that has one, by note id. */
export function getNoteBodies(): Promise<Map<string, string>> {
  return (cachedNoteBodies ??= thinkNoteBodies());
}

/** One note's body, drawn: its pictures downloaded and pointed at their local copies. */
export async function getNoteContent(noteId: string): Promise<Content> {
  return drawThink((await getNoteBodies()).get(noteId) ?? '');
}

export async function getAllArticlesForStaticPaths(): Promise<{ categorySlug: string; articleId: string }[]> {
  const articles = await getAllArticles();
  return articles.map((a) => ({ categorySlug: categorySlug(a.category), articleId: a.id }));
}
