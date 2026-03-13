import rss from '@astrojs/rss';
import { getAllArticles } from '../lib/data';
import { loadConfig } from '../lib/config';
import { categorySlug } from '../lib/category';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const config = loadConfig();
  const articles = await getAllArticles();

  return rss({
    title: config.site.title,
    description: config.site.description,
    site: context.site ?? config.site.url,
    items: articles.map((article) => ({
      title: article.title,
      pubDate: new Date(article.createdTime),
      link: `/${categorySlug(article.category)}/${article.id}/`,
    })),
  });
}
