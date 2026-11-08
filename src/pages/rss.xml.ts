import rss from '@astrojs/rss';
import { getAllArticles, getArticle, getAllNotes, getNoteBodies } from '../lib/data';
import { loadConfig } from '../lib/config';
import { categorySlug } from '../lib/category';
import { excerptOf } from '../lib/excerpt';
import type { APIContext } from 'astro';

// The feed: every article and every 碎碎念 with something written under its title, newest first, each with a few lines
// of what it says (Notion's summary, or the opening of the text) so a reader sees more than a title.
export async function GET(context: APIContext) {
  const config = loadConfig();
  const [articles, notes, bodies] = await Promise.all([getAllArticles(), getAllNotes(), getNoteBodies()]);

  const articleItems = await Promise.all(
    articles.map(async (article) => {
      const slug = categorySlug(article.category);
      const blocks = article.summary ? [] : ((await getArticle(slug, article.id))?.blocks ?? []);
      return {
        title: article.title,
        pubDate: new Date(article.createdTime),
        link: `/${slug}/${article.id}/`,
        description: article.summary || excerptOf(blocks, 160) || undefined,
        categories: [article.category],
      };
    }),
  );
  const noteItems = notes
    .filter((n) => bodies.has(n.id))
    .map((note) => ({
      title: note.title,
      pubDate: new Date(note.createdTime),
      link: `/notes/${note.id}/`,
      description: excerptOf(bodies.get(note.id)!, 160) || undefined,
      categories: ['碎碎念'],
    }));

  return rss({
    title: config.site.title,
    description: config.site.description,
    site: context.site ?? config.site.url,
    items: [...articleItems, ...noteItems].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime()),
  });
}
