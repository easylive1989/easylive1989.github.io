import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

export interface AuthorLink {
  type: string;
  url: string;
}

export interface Author {
  name: string;
  avatar: string;
  bio: string;
  links: AuthorLink[];
  works: AuthorLink[];
}

export interface SiteConfig {
  site: {
    title: string;
    /** The blog's name, in its masthead and at the end of its pages' titles. */
    blogTitle: string;
    description: string;
    url: string;
  };
  author: Author;
  /** where the posts and 碎碎念 come from (src/lib/think-api.mjs) */
  think: {
    /** overridden by THINK_BASE_URL */
    baseUrl: string;
    /** the category of an article right in 部落格, in none of its folders */
    defaultCategory: string;
  };
  build: {
    schedule: string;
    minArticles?: number;
  };
}

let cached: SiteConfig | null = null;

export function loadConfig(): SiteConfig {
  if (cached) return cached;

  const configPath = path.resolve(process.cwd(), 'site.config.yaml');
  const raw = fs.readFileSync(configPath, 'utf-8');
  const parsed = parse(raw) as SiteConfig;
  cached = parsed;
  return parsed;
}
