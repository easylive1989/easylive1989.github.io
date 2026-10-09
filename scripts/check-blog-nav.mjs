// Checks every blog page in a build: the blog's name ends its title, and exactly one tab is lit, the one its kind of page sits
// under. The room (index.html) keeps the site's own name. Run after `npm run build`: node scripts/check-blog-nav.mjs [dist]
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

const dist = process.argv[2] ?? 'dist';
const { site } = parse(fs.readFileSync('site.config.yaml', 'utf8'));

// the tab a page sits under, by where it is: the book notes under the bookshelf, everything else that is written under all articles
const expected = (rel) => (rel === 'about/index.html' ? 'about' : rel.startsWith('reading/') ? 'reading' : 'archive');

const pages = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === 'index.html') pages.push(path.relative(dist, p).split(path.sep).join('/'));
  }
})(dist);

const problems = [];
const titleOf = (html) => html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
let checked = 0;
for (const rel of pages) {
  if (rel === 'index.html' || rel.startsWith('study/')) continue; // the room, and the bare bodies the room fetches
  checked++;
  const html = fs.readFileSync(path.join(dist, rel), 'utf8');
  const title = titleOf(html);
  if (!title.endsWith(` | ${site.blogTitle}`)) problems.push(`${rel}: title "${title}"`);
  const lit = [...html.matchAll(/data-tab="(\w+)"[^>]*aria-current="true"/g)].map((m) => m[1]);
  if (lit.length !== 1 || lit[0] !== expected(rel)) problems.push(`${rel}: lit [${lit.join(', ')}], expected ${expected(rel)}`);
  if (/class="(desk-hud|crumbs)"/.test(html)) problems.push(`${rel}: still has the old HUD or crumbs`);
}
const roomTitle = titleOf(fs.readFileSync(path.join(dist, 'index.html'), 'utf8'));
if (roomTitle !== site.title) problems.push(`index.html: title "${roomTitle}", expected "${site.title}"`);

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`ok: ${checked} blog pages`);
