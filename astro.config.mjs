import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://paul-learning.dev',
  // 所有文章 moved to the site's root; /archive/ is kept as a page that sends old links and bookmarks there (and stays out of the sitemap)
  redirects: { '/archive': '/' },
  integrations: [sitemap({ filter: (page) => !page.endsWith('/archive/') })],
  output: 'static',
  build: {
    inlineStylesheets: 'always',
  },
  vite: {
    ssr: {
      external: ['@notionhq/client'],
    },
  },
});
