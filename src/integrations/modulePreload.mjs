// Astro writes a page's module script as one <script src>, and the chunks it imports (three.js, split off in astro.config.mjs) are only
// asked for once that script has arrived and been parsed: a round trip lost on a slow phone. After the build every page gets a
// <link rel="modulepreload"> in its head for each chunk its module scripts import statically, so all of them download together.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// a static import or re-export of a sibling chunk, as Rollup writes them at the top of a chunk; never import(…), which stays lazy
const STATIC_IMPORT = /\b(?:import|export)\s*(?:[^'"();]*?\bfrom\s*)?["'](\.{1,2}\/[^"']+\.js)["']/g;

export default function modulePreload() {
  return {
    name: 'module-preload',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const out = fileURLToPath(dir);
        // every chunk a script pulls in before it runs, depth first: /_astro/a.js -> [/_astro/b.js, …]
        const deps = (src, seen = new Set()) => {
          const file = path.join(out, src);
          if (!fs.existsSync(file)) return seen;
          for (const [, spec] of fs.readFileSync(file, 'utf8').matchAll(STATIC_IMPORT)) {
            const dep = new URL(spec, `http://site${src}`).pathname;
            if (!seen.has(dep)) { seen.add(dep); deps(dep, seen); }
          }
          return seen;
        };
        const pages = fs.readdirSync(out, { recursive: true }).filter((f) => f.endsWith('.html'));
        let n = 0;
        for (const page of pages) {
          const file = path.join(out, page);
          const html = fs.readFileSync(file, 'utf8');
          const srcs = [...html.matchAll(/<script type="module" src="(\/[^"]+)"/g)].map((m) => m[1]);
          const links = [...new Set(srcs.flatMap((s) => [...deps(s)]))].map((d) => `<link rel="modulepreload" href="${d}">`);
          if (!links.length) continue;
          fs.writeFileSync(file, html.replace('</head>', links.join('') + '</head>'));
          n++;
        }
        logger.info(`modulepreload added to ${n} page(s)`);
      },
    },
  };
}
