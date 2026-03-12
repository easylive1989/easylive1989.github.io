import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://paul-learning.dev',
  integrations: [sitemap()],
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
