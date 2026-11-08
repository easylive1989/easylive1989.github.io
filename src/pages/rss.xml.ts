import rss from '@astrojs/rss';
import { getAllArticles, getArticle, getAllNotes, getNoteBodies, getNoteContent } from '../lib/data';
import { loadConfig } from '../lib/config';
import { categorySlug } from '../lib/category';
import type { APIContext } from 'astro';

// The feed: every article and every 碎碎念 with something written under its title, newest first, each with a few lines
// of what it says (Notion's summary, or the opening of the text) so a reader sees more than a title.
export async function GET(context: APIContext) {
  const config = loadConfig();
  const [articles, notes, bodies] = await Promise.all([getAllArticles(), getAllNotes(), getNoteBodies()]);

  const articleItems = await Promise.all(
    articles.map(async (article) => {
      const slug = categorySlug(article.category);
      const excerpt = article.summary ? '' : ((await getArticle(slug, article.id))?.content.excerpt(160) ?? '');
      return {
        title: article.title,
        pubDate: new Date(article.createdTime),
        link: `/${slug}/${article.id}/`,
        description: article.summary || excerpt || undefined,
        categories: [article.category],
      };
    }),
  );
  const noteItems = await Promise.all(notes
    .filter((n) => bodies.has(n.id))
    .map(async (note) => ({
      title: note.title,
      pubDate: new Date(note.createdTime),
      link: `/notes/${note.id}/`,
      description: (await getNoteContent(note.id)).excerpt(160) || undefined,
      categories: ['碎碎念'],
    })));

  return rss({
    title: config.site.title,
    description: config.site.description,
    site: context.site ?? config.site.url,
    items: [...articleItems, ...noteItems].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime()),
  });
}
