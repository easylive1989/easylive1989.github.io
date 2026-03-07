import 'dotenv/config';
import { Client } from '@notionhq/client';
import { loadConfig } from './config';
import { fetchDatabase, fetchPageBlocks, type Article, type NotionBlock } from './notion';
import { replaceImageUrls, downloadImages } from './images';
import { categorySlug } from './category';
import path from 'node:path';

function getNotionClient(): Client | null {
  const token = process.env.NOTION_API_KEY;
  if (!token) {
    console.warn('NOTION_API_KEY not set — returning empty data');
    return null;
  }
  return new Client({ auth: token });
}

export interface Category {
  name: string;
  slug: string;
}

export async function getAllArticles(): Promise<Article[]> {
  const config = loadConfig();
  const client = getNotionClient();
  if (!client) return [];
  return fetchDatabase(client, config.notion.databaseId);
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
  blocks: NotionBlock[];
  categorySlug: string;
  categoryName: string;
}

export async function getArticle(
  catSlug: string,
  articleId: string,
): Promise<ArticleWithContent | null> {
  const client = getNotionClient();
  if (!client) return null;

  const articles = await getAllArticles();
  const article = articles.find((a) => a.id === articleId);

  if (!article || categorySlug(article.category) !== catSlug) return null;

  const rawBlocks = await fetchPageBlocks(client, article.id);
  const { blocks, imageMap } = replaceImageUrls(rawBlocks, catSlug, articleId);

  const publicDir = path.resolve(process.cwd(), 'public');
  const distDir = path.resolve(process.cwd(), 'dist');
  await downloadImages(imageMap, publicDir, distDir);

  return {
    article,
    blocks,
    categorySlug: catSlug,
    categoryName: article.category,
  };
}

export async function getAllArticlesForStaticPaths(): Promise<
  { categorySlug: string; articleId: string }[]
> {
  const articles = await getAllArticles();
  return articles.map((a) => ({
    categorySlug: categorySlug(a.category),
    articleId: a.id,
  }));
}
