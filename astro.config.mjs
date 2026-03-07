import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://paul-learning.dev',
  integrations: [sitemap()],
  output: 'static',
  vite: {
    ssr: {
      external: ['@notionhq/client'],
    },
  },
});
