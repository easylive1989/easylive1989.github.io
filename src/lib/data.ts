import 'dotenv/config';
import { Client } from '@notionhq/client';
import { loadConfig } from './config';
import {
  fetchDatabase,
  fetchPageBlocks,
  fetchBooksDatabase,
  type Article,
  type NotionBlock,
  type Book,
} from './notion';
import { fetchSideProjects, type SideProject } from './sideProjects';
import { fetchPlayboxGames, type PlayboxGame } from './playbox';
import { enrichBookCovers } from './bookCovers';
import { replaceImageUrls, downloadImages } from './images';
import { categorySlug } from './category';
import {
  loadCachedBlocks,
  saveCachedBlocks,
  pruneBlockCache,
} from './notionCache';
import { createHash } from 'node:crypto';
import path from 'node:path';

const isProductionBuild = (): boolean => process.env.NODE_ENV === 'production';

function getNotionClient(): Client | null {
  const token = process.env.NOTION_API_KEY;
  if (!token) {
    if (isProductionBuild()) {
      throw new Error('NOTION_API_KEY not set — aborting production build');
    }
    console.warn('NOTION_API_KEY not set — returning empty data');
    return null;
  }
  // Default is 60s; large database queries have timed out at that limit.
  return new Client({ auth: token, timeoutMs: 120_000 });
}

export interface Category {
  name: string;
  slug: string;
}

let cachedArticles: Article[] | null = null;

export async function getAllArticles(): Promise<Article[]> {
  if (cachedArticles) return cachedArticles;
  const config = loadConfig();
  const client = getNotionClient();
  if (!client) return [];
  const articles = await fetchDatabase(client, config.notion.databaseId);

  if (isProductionBuild()) {
    const min = config.build.minArticles ?? 1;
    if (articles.length < min) {
      throw new Error(
        `Fetched ${articles.length} articles from Notion, below minimum ${min} — aborting production build`,
      );
    }
    pruneBlockCache(new Set(articles.map((a) => a.id)));
  }

  cachedArticles = articles;
  return cachedArticles;
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

  let rawBlocks = loadCachedBlocks(article.id, article.lastEditedTime);
  if (!rawBlocks) {
    rawBlocks = await fetchPageBlocks(client, article.id);
    saveCachedBlocks(article.id, article.lastEditedTime, rawBlocks);
  }
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

let cachedBooks: Book[] | null = null;

export async function getAllBooks(): Promise<Book[]> {
  if (cachedBooks) return cachedBooks;
  const config = loadConfig();
  const client = getNotionClient();
  if (!client || !config.notion.booksDatabaseId) return [];
  const raw = await fetchBooksDatabase(client, config.notion.booksDatabaseId);

  if (isProductionBuild()) {
    const min = config.build.minBooks ?? 1;
    if (raw.length < min) {
      throw new Error(
        `Fetched ${raw.length} books from Notion, below minimum ${min} — aborting production build`,
      );
    }
  }

  cachedBooks = await enrichBookCovers(raw);
  return cachedBooks;
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

// ─────────────────────────────────────────────────────────────────
// Side Projects & Playbox — fetched from Notion, with image download
// ─────────────────────────────────────────────────────────────────

function getNotionFileLocalPath(remoteUrl: string, bucket: string): string {
  const urlObj = new URL(remoteUrl);
  // Notion's signed S3 URLs include the original filename in the path; hash
  // origin + pathname so re-signed URLs of the same file resolve to the
  // same cached local copy.
  const basePath = urlObj.origin + urlObj.pathname;
  const hash = createHash('md5').update(basePath).digest('hex').slice(0, 12);
  const ext = path.extname(urlObj.pathname).toLowerCase() || '.png';
  return `/assets/notion/${bucket}/${hash}${ext}`;
}

let cachedSideProjects: SideProject[] | null = null;

export async function getAllSideProjects(): Promise<SideProject[]> {
  if (cachedSideProjects) return cachedSideProjects;
  const config = loadConfig();
  const client = getNotionClient();
  if (!client || !config.notion.sideProjectsDatabaseId) return [];

  const raw = await fetchSideProjects(client, config.notion.sideProjectsDatabaseId);

  const imageMap: Record<string, string> = {};
  const enriched = raw.map((p) => {
    if (!p.coverUrl) return p;
    const localPath = getNotionFileLocalPath(p.coverUrl, 'side-projects');
    imageMap[p.coverUrl] = localPath;
    return { ...p, coverUrl: localPath };
  });

  const publicDir = path.resolve(process.cwd(), 'public');
  const distDir = path.resolve(process.cwd(), 'dist');
  await downloadImages(imageMap, publicDir, distDir);

  cachedSideProjects = enriched;
  return cachedSideProjects;
}

let cachedPlayboxGames: PlayboxGame[] | null = null;

export async function getAllPlayboxGames(): Promise<PlayboxGame[]> {
  if (cachedPlayboxGames) return cachedPlayboxGames;
  const config = loadConfig();
  const client = getNotionClient();
  if (!client || !config.notion.playboxDatabaseId) return [];

  const raw = await fetchPlayboxGames(client, config.notion.playboxDatabaseId);

  const imageMap: Record<string, string> = {};
  const enriched = raw.map((g) => {
    if (!g.imageUrl) return g;
    const localPath = getNotionFileLocalPath(g.imageUrl, 'playbox');
    imageMap[g.imageUrl] = localPath;
    return { ...g, imageUrl: localPath };
  });

  const publicDir = path.resolve(process.cwd(), 'public');
  const distDir = path.resolve(process.cwd(), 'dist');
  await downloadImages(imageMap, publicDir, distDir);

  cachedPlayboxGames = enriched;
  return cachedPlayboxGames;
}
