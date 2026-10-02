import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://paul-learning.dev',
  // /study/{id}/ are bare article bodies for the room to fetch, not pages to land on
  integrations: [sitemap({ filter: (page) => !page.includes('/study/') })],
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
