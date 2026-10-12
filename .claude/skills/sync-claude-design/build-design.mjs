// Assembles the Claude Design copy of the study room from the repo (see SKILL.md beside this file):
//   Paul Study.html  <- src/pages/index.astro with the Astro bits resolved
//   study.js, studyTextures.js, studyWorker.js  <- src/scripts/*, verbatim
//
//   node build-design.mjs <outDir> [--repo <dir>]   build the bundle into <outDir> (wiped first) and say what to upload
//   node build-design.mjs --record <outDir>         after a successful upload: remember what was sent, for the next comparison
//
// It throws rather than guess whenever the page has changed in a way it does not know: fix the swaps below, not the output.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2), flag = n => { const i = args.indexOf(n); return i < 0 ? null : args.splice(i, 2)[1]; };
const recordDir = flag('--record'), repoArg = flag('--repo'), outArg = args[0];
const SCRIPTS = ['study.js', 'studyTextures.js', 'studyWorker.js'], PAGE = 'Paul Study.html';
const LAST = path.join(import.meta.dirname, 'last-sync.json');
const sha = (f, algo = 'sha256', enc = 'hex') => createHash(algo).update(fs.readFileSync(f)).digest(enc);
const syncedFrom = html => (html.match(/Synced from the site repo \(easylive1989\.github\.io @ ([^)]*)\)/) || [])[1];

if (recordDir) {
  const rec = { commit: syncedFrom(fs.readFileSync(path.join(recordDir, PAGE), 'utf8')), at: new Date().toISOString(), files: Object.fromEntries(SCRIPTS.map(f => [f, sha(path.join(recordDir, f))])) };
  fs.writeFileSync(LAST, JSON.stringify(rec, null, 2) + '\n');
  console.log(`recorded: Claude Design is at ${rec.commit}`);
  process.exit(0);
}
if (!outArg) { console.error('usage: node build-design.mjs <outDir> [--repo <dir>]   |   node build-design.mjs --record <outDir>'); process.exit(1); }

const repo = path.resolve(repoArg || execSync('git rev-parse --show-toplevel').toString().trim());
const out = path.resolve(outArg);
const DS = '_ds/broadsheet-3a61f2b6-e8fb-49df-93ee-70e37496893a';
const read = p => fs.readFileSync(path.join(repo, p), 'utf8');
const git = c => execSync('git ' + c, { cwd: repo }).toString().trim();
const dirty = git('status --porcelain -- src');
const commit = git('rev-parse --short HEAD') + (dirty ? ' plus uncommitted changes' : '');

/* ---- data: the Notion snapshot the last build baked into the page ---- */
const dist = read('dist/index.html');
const data = JSON.parse(dist.match(/<script type="application\/json" id="study-data">([\s\S]*?)<\/script>/)[1]);
const origin = data.site.url.replace(/\/$/, '');
const abs = u => (/^\/(?!\/)/.test(u) ? origin + u : u);
for (const k of Object.keys(data.site)) if (typeof data.site[k] === 'string') data.site[k] = abs(data.site[k]);
data.about.avatar = abs(data.about.avatar);
const json = JSON.stringify(data, null, 1).replace(/</g, '\\u003c');
const leftover = json.match(/"(?:href|src)=\\"\/|"\/[a-z]/g);
if (leftover) throw new Error('root-relative URLs left in the data (give them a line in the abs() pass): ' + leftover.join(' '));

/* ---- three.js: every module the room's scripts name, from unpkg at the installed version, with the installed copies' hashes ---- */
// (the published files are the installed ones, so their hashes are too; a module that names another by a relative path brings it along)
const three = path.join(repo, 'node_modules/three'), CDN = `https://unpkg.com/three@${JSON.parse(fs.readFileSync(path.join(three, 'package.json'), 'utf8')).version}/`;
const fileOf = spec => (spec === 'three' ? 'build/three.module.js' : spec.replace(/^three\/addons\//, 'examples/jsm/'));
const imports = {}, integrity = {};
const hashIn = file => { if (integrity[CDN + file]) return; integrity[CDN + file] = 'sha384-' + sha(path.join(three, file), 'sha384', 'base64');
  for (const [, rel] of fs.readFileSync(path.join(three, file), 'utf8').matchAll(/(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g)) { const dep = path.posix.join(path.posix.dirname(file), rel); if (fs.existsSync(path.join(three, dep))) hashIn(dep); } };
for (const f of SCRIPTS) for (const [, spec] of read('src/scripts/' + f).matchAll(/(?:from\s*|import\s*\(\s*|import\s+)['"](three(?:\/[^'"]+)?)['"]/g)) {
  if (spec !== 'three' && !spec.startsWith('three/addons/')) throw new Error('a three.js import this script cannot map: ' + spec);
  imports[spec] = CDN + fileOf(spec); hashIn(fileOf(spec)); }
const importMap = JSON.stringify({ imports, integrity }, null, 2);

/* ---- page: markup and styles out of index.astro ---- */
const astro = read('src/pages/index.astro');
let body = astro.match(/<body class="study-body">\n([\s\S]*?)\n\s*<\/body>/)[1];
// the page's own assets (the pixel font) are served by the site, so their root-relative url()s point back at it
const pageCss = astro.match(/<style is:global>\n([\s\S]*?)\n<\/style>/)[1].replace(/url\("\/(?!\/)/g, `url("${origin}/`);
const cssLeft = pageCss.match(/url\(\s*['"]?\/(?!\/)[^)]*\)/g);
if (cssLeft) throw new Error('root-relative url() left in the page css: ' + cssLeft.join(' '));
// every occurrence: the dock and the noscript note both carry the site links
const swap = (from, to) => { if (!body.includes(from)) throw new Error('index.astro changed, not found: ' + from); body = body.split(from).join(to); };
swap('<style is:inline>', '<style>');
swap('href={`${BASE}reading/`}', `href="${data.site.reading}"`);
swap('href={`${BASE}archive/`}', `href="${data.site.archive}"`);
swap('href={`${BASE}about/`}', `href="${data.site.about}"`);
swap('href="/rss.xml"', `href="${data.site.rss}"`);
// the door's way out when the script cannot load: Astro hands that script BASE, here it is the site itself
swap('<script is:inline define:vars={{ BASE }}>\n      (() => {', `<script>\n      (() => {\n        const BASE = ${JSON.stringify(origin + '/')};`);
swap('<script type="application/json" id="study-data" is:inline set:html={json} />', `<script type="application/json" id="study-data">\n${json}\n</script>`);
swap('<script is:inline>', '<script>');
body = body.replace(/<script>\s*import '\.\.\/scripts\/study\.js';\s*<\/script>/, m => `<!-- Preview glue, not in the repo: article bodies are fetched from the live site, and their image paths are
         root-relative there, so they are pointed back at the site. -->
    <script>
      (() => {
        const site = ${JSON.stringify(origin)}, f = window.fetch;
        window.fetch = (u, o) => f(u, o).then(r => typeof u === 'string' && u.startsWith(site + '/study/') && r.ok
          ? r.text().then(t => new Response(t.replace(/\\b(src|href|poster)="\\/(?!\\/)/g, '$1="' + site + '/'), { status: r.status, headers: { 'content-type': 'text/html' } }))
          : r);
      })();
    </script>

    <!-- More preview glue: the room fetches its scanned model from /models/ on its own site, so the loader is pointed back there. -->
    <script type="module">
      import { DefaultLoadingManager } from 'three';
      DefaultLoadingManager.setURLModifier(u => u.startsWith('/models/') ? ${JSON.stringify(origin)} + u : u);
    </script>

    <script type="module" src="study.js"></script>`);
const astroLeft = body.replace(json, '').match(/is:inline|set:html|define:vars|=\{|\$\{BASE\}|\.\.\/scripts/g);
if (astroLeft) throw new Error('Astro syntax left in the body (it needs a swap above): ' + astroLeft.join(' '));
const rootLeft = body.replace(json, '').match(/\b(?:href|src|action|poster)="\/(?!\/)[^"]*"/g);
if (rootLeft) throw new Error('root-relative links left in the body (they need a swap above): ' + rootLeft.join(' '));
// the scripts are uploaded as they are, so a root-relative path inside them needs glue in the page: /models/ has it, anything else is new
const pathsLeft = SCRIPTS.flatMap(f => [...read('src/scripts/' + f).matchAll(/['"`](\/(?!models\/)[a-z][\w-]*\/[^'"`\s]*)['"`]/g)].map(m => `${f}: ${m[1]}`));
if (pathsLeft.length) throw new Error('root-relative paths in the scripts with no glue in the page: ' + pathsLeft.join(', '));
body = body.replace(/^ {4}/gm, '');

const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Paul Wu · 書房</title>
<!-- Synced from the site repo (easylive1989.github.io @ ${commit}).
     This page is src/pages/index.astro with the Astro parts resolved: the Notion content is a snapshot, site links are
     absolute, and three.js comes from the import map instead of the bundler.
     study.js, studyTextures.js and studyWorker.js are the files in src/scripts/, unchanged. -->
<link rel="stylesheet" href="${DS}/styles.css">
<script src="${DS}/_ds_bundle.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;600;700&family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
<script type="importmap">
${importMap}
</script>
<style>
/* ================= src/styles/prose.css ================= */
${read('src/styles/prose.css').trim()}

/* ================= the room (index.astro) ================= */
${pageCss.replace(/^ {2}/gm, '')}
</style>
</head>
<body class="study-body">
${body}
</body>
</html>
`;

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, DS), { recursive: true });
fs.writeFileSync(path.join(out, PAGE), html);
for (const f of SCRIPTS) fs.copyFileSync(path.join(repo, 'src/scripts', f), path.join(out, f));

// Local stand-ins for the design system files the project already holds (never uploaded): the repo's port of the
// stylesheet plus the few base rules the port leaves out, and an empty bundle.
fs.writeFileSync(path.join(out, DS, 'styles.css'), read('src/styles/broadsheet.css') + `
figure { margin: 0; }
figcaption { font-size: 11px; margin-top: var(--space-1); color: color-mix(in srgb, var(--color-text) 55%, transparent); }
.btn svg { display: block; }
`);
fs.writeFileSync(path.join(out, DS, '_ds_bundle.js'), '');

/* ---- what to upload: the page always (its header names the commit), a script only if it differs from what was last sent ---- */
const last = fs.existsSync(LAST) ? JSON.parse(fs.readFileSync(LAST, 'utf8')) : null;
const changed = SCRIPTS.filter(f => !last || last.files[f] !== sha(path.join(out, f)));
console.log(`bundle for ${commit} in ${out}`);
console.log(last ? `Claude Design was last synced at ${last.commit} (${last.at.slice(0, 10)})` : 'no record of an earlier sync: upload every file');
console.log('upload, in this order: ' + [...['studyTextures.js', 'study.js', 'studyWorker.js'].filter(f => changed.includes(f)), PAGE].join(', '));
if (dirty) console.log('WARNING: src/ has uncommitted changes, and they are in this bundle');
const built = fs.statSync(path.join(repo, 'dist/index.html')).mtimeMs, dataCommit = +git('log -1 --format=%ct -- src/lib src/pages/index.astro') * 1000;
if (built < dataCommit) console.log(`WARNING: dist/index.html (${new Date(built).toISOString()}) is older than the last commit to src/lib or the page: run npm run build first, or the data is stale`);
