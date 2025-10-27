import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://easylive1989.github.io',
  integrations: [react()],
  markdown: {
    shikiConfig: {
      theme: 'dracula',
      wrap: true
    }
  }
});
