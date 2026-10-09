// Cubic 11 covers some ten thousand characters (400 KB); the room shows about a thousand, and all of them are known once the site is
// built: the page (its Notion content is baked in) and the room's script (its own labels and messages). So after the build the font is
// cut down to those, saved under its content hash, and the page pointed at it. `astro dev` keeps serving the whole font.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const FONT = '/fonts/cubic-11/Cubic_11.woff2';
const PAGES = ['index.html']; // the pages whose @font-face uses it

export default function subsetPixelFont() {
  return {
    name: 'subset-pixel-font',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const out = fileURLToPath(dir);
        const pages = PAGES.map((p) => path.join(out, p));
        const scripts = fs.readdirSync(path.join(out, '_astro')).filter((f) => f.endsWith('.js')).map((f) => path.join(out, '_astro', f));
        // printable ASCII always, whatever the content happens to use
        let text = String.fromCharCode(...Array.from({ length: 95 }, (_, i) => 32 + i));
        for (const f of [...pages, ...scripts]) text += fs.readFileSync(f, 'utf8');
        const chars = [...new Set(text)].join('');

        const full = fs.readFileSync(path.join(out, FONT));
        const cut = await subsetFont(full, chars, { targetFormat: 'woff2' });
        const name = FONT.replace(/\.woff2$/, `.${createHash('sha256').update(cut).digest('hex').slice(0, 8)}.woff2`);
        fs.writeFileSync(path.join(out, name), cut);
        for (const p of pages) fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replaceAll(FONT, name));
        logger.info(`Cubic 11 cut to ${[...chars].length} characters: ${Math.round(full.length / 1024)} KB -> ${Math.round(cut.length / 1024)} KB (${name})`);
      },
    },
  };
}
