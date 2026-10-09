import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import subsetPixelFont from './src/integrations/subsetPixelFont.mjs';
import modulePreload from './src/integrations/modulePreload.mjs';

export default defineConfig({
  site: 'https://paul-learning.dev',
  // /study/{id}/ are bare article bodies for the room to fetch, not pages to land on
  integrations: [sitemap({ filter: (page) => !page.includes('/study/') }), subsetPixelFont(), modulePreload()],
  output: 'static',
  build: {
    inlineStylesheets: 'always',
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          // three.js in a file of its own, so its hash (and a returning visitor's cached copy) only changes when three is upgraded,
          // not every time the room's own script does. Only its core: the addons the room fetches later (GLTFLoader) stay lazy
          manualChunks: (id) => (id.includes('/node_modules/three/build/') ? 'three' : undefined),
        },
      },
    },
    ssr: {
      external: ['@notionhq/client'],
    },
  },
});
