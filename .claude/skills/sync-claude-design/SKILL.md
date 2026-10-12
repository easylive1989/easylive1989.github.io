---
name: sync-claude-design
description: Use when the user asks to sync the study room back to Claude Design — 「同步回 claude design」, 「同步到 claude design」, "sync to Claude Design", "update Paul Study.html" — usually together with or right after a commit that touched src/scripts/study*.js, src/pages/index.astro, src/styles/prose.css or the room's data.
---

# Sync the study room to Claude Design

## Overview

The 3D study room (the site's home page) has a copy in Claude Design: project **Paul Park 數位遊樂園**,
id `012eca2b-cfa3-49b4-94f3-e252bce17c39`
(<https://claude.ai/design/p/012eca2b-cfa3-49b4-94f3-e252bce17c39?file=Paul+Study.html>).
"Sync back" means: rebuild four files from the repo and **overwrite them in place**. `build-design.mjs` beside this file
does the assembly and says which files to upload; this document is the procedure around it.

| File in Claude Design | Built from |
|---|---|
| `study.js`, `studyTextures.js`, `studyWorker.js` | `src/scripts/*`, byte for byte |
| `Paul Study.html` | `src/pages/index.astro` with the Astro parts resolved: data from `dist/index.html`, site links absolute, three.js from an unpkg import map, the design system linked from the project's own `_ds/` |

Nothing else in the project is touched: `Paul Study v*.html`, `study-v*.js`, `Paul Park*.html`, `Garden Daily.dc.html`,
`support.js`, `uploads/`, `_ds/`.

## Steps

1. **Sync a commit, not a working tree.** `git status --short -- src` must be empty; commit first if the user asked for both.
   If another chat is editing this checkout, build from a clean worktree instead (below).
2. **Fresh data.** Run `npm run build` when `src/lib`, the page or Notion content changed since `dist/` was built (the script
   warns when `dist/index.html` is older than the last such commit).
3. **Build the bundle** into the session scratchpad:
   `node .claude/skills/sync-claude-design/build-design.mjs <scratchpad>/design-sync`
   It prints the files to upload, in order. If it throws, the page changed in a way it does not know: read the message and
   extend the script (a `swap()`, the `abs()` pass, page glue). Never hand-edit the output.
4. **Check it runs** when the page, the script, or a click's behaviour changed: add a temporary entry to `.claude/launch.json`
   (`python3 -m http.server 4323 --bind 127.0.0.1 --directory <bundle>`), `preview_start` it, open `/Paul%20Study.html`, wait
   for the door to open, exercise the change, read the console. Stop the server and restore `launch.json` (untracked,
   hand-formatted: back it up first). A one-line change to a script already checked on the dev server can skip this.
5. **Upload.** Load `DesignSync` (ToolSearch `select:DesignSync`). Say which files will be overwritten, then
   `finalize_plan` with the project id, `writes` = the printed files, `deletes: []`, `localDir` = the bundle. Its
   permission prompt is the user's confirmation. Then `write_files`, **one file per call**, in the printed order.
6. **Record it:** `node .claude/skills/sync-claude-design/build-design.mjs --record <scratchpad>/design-sync`
   (writes `last-sync.json` here, which the next build compares against; it is this checkout's own note, ignored by git).
7. Report the commit and the files sent.

## Things that go wrong

| Symptom | Cause and fix |
|---|---|
| `DesignSync` says not authorised | The user must run `/design-login` in an interactive `claude` terminal; a desktop session cannot. |
| `list_projects` does not show the project | It is a regular project, not a design system. Address it by id; `list_files`, `finalize_plan`, `write_files` work. |
| `finalize_plan` rejected | `deletes` is required, even as `[]`. |
| `write_files` times out with several files | Send one per call under the same `planId`; overwriting is idempotent, so retry freely. |
| Room does not load in Claude Design: "Failed to resolve module specifier" or an integrity error | A `three` import the map lacks, or an installed copy that differs from unpkg. The script builds the map from `src/scripts` and `node_modules/three`; check that `package.json` pins the version it fetched. |
| Articles, books, the pixel font or the dog are missing right after a sync | They are fetched from the live site, and exist there only once the commit is pushed and deployed. |
| A large diff in the page's data nobody asked for | Notion content changed. It is live content: upload it. |
| Covers drop out after building in a worktree | Copy `.cache/book-covers.json` into the worktree before `npm run build`. |
| Signs the Claude Design copy was edited by hand | Overwriting cannot be undone from here. Ask before `finalize_plan`. |

## Building from a clean worktree

`git worktree add --detach <scratchpad>/wt <commit>`, symlink `.env` and `node_modules` into it, copy
`.cache/book-covers.json` into `wt/.cache/`, `npm run build` there, then pass `--repo <scratchpad>/wt` to the script.
`git worktree remove --force` afterwards.

## Not part of the sync

Analytics, the service worker, canonical/OG tags and favicons are left out of the page on purpose. Its `<title>`
(`Paul Wu · 書房`) is fixed in the script.
