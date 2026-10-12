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
assembles them and says which to upload; this document is the procedure around it.

| File in Claude Design | Built from |
|---|---|
| `study.js`, `studyTextures.js`, `studyWorker.js` | `src/scripts/*`, byte for byte |
| `Paul Study.html` | `src/pages/index.astro` with the Astro parts resolved: data from `dist/index.html`, `src/styles/prose.css` inlined, site links absolute, three.js from an unpkg import map, the design system linked from the project's own `_ds/` |

Nothing else in the project is touched: `Paul Study v*.html`, `study-v*.js`, `Paul Park*.html`, `Garden Daily.dc.html`,
`support.js`, `uploads/`, and above all `_ds/` (the bundle holds local stand-ins for two `_ds/` files; uploading them
would replace the real design system with an empty one).

## Steps

1. **Sync a commit, not a working tree.** `git status --short -- src` must be empty. If it is not: commit first when the
   user asked for both, otherwise stop and ask. A commit that is not pushed yet can be synced, but say so: articles, the
   font and the model are fetched from the live site.
2. **Build the bundle** in a directory of its own in the session scratchpad (the script wipes it first):
   `node .claude/skills/sync-claude-design/build-design.mjs <scratchpad>/design-sync`
   - `WARNING: dist/index.html … is older` → `npm run build`, then run it again. Also build first when the user says Notion
     content changed; nothing can detect that.
   - It throws → the page changed in a way the script does not know. Read the message and extend `build-design.mjs`
     (a `swap()`, the `abs()` pass, glue in the page). Never hand-edit the output.
   - `NOTHING TO UPLOAD` → tell the user Claude Design already has this, and stop.
   - Otherwise it prints `upload, in this order: …`. Those files, and only those, are the upload.
3. **Check that it runs**, unless the only difference is in `src/scripts` files already tried on the dev server in this
   session. The printed `source changed since then:` line lists what differs from the last sync; a change to
   `index.astro`, to `build-design.mjs`, or a new `three/addons` import always gets the check:
   1. Copy `.claude/launch.json` to the scratchpad (it is untracked and hand-formatted).
   2. Add `{ "name": "design-sync-check", "runtimeExecutable": "python3", "runtimeArgs": ["-m", "http.server", "4323", "--bind", "127.0.0.1", "--directory", "<bundle>"], "port": 4323 }`.
   3. `preview_start` it and open `http://localhost:4323/Paul%20Study.html`. The door has opened when `#intro` has the
      class `off`. Try whatever changed; the console should hold no errors.
   4. `preview_stop`, and copy `launch.json` back.
4. **Upload**, from the main session (subagents do not have `DesignSync`; load it with ToolSearch `select:DesignSync`).
   First confirm `git rev-parse --short HEAD` is still the commit on the script's `bundle for …` line; rebuild if not.
   Tell the user which files will be overwritten, then:
   - `DesignSync { method: "finalize_plan", projectId, writes: [the printed files], deletes: [], localDir: "<bundle>" }`.
     Its permission prompt is the user's confirmation.
   - `DesignSync { method: "write_files", projectId, planId, files: [{ path: "study.js", localPath: "study.js" }] }`,
     **one file per call**, in the printed order (`Paul Study.html` is spelled with its space).
5. **Record it:** `node .claude/skills/sync-claude-design/build-design.mjs --record <scratchpad>/design-sync`
   This writes `last-sync.json` here: what this checkout last sent, ignored by git. It is not a reading of the project, so
   if a sync may have happened from another machine, upload all four files.
6. Report the commit and the files sent.

## Things that go wrong

| Symptom | Cause and fix |
|---|---|
| ToolSearch finds no `DesignSync` | It exists only in the main session. A subagent hands the bundle back and the main session uploads. |
| `DesignSync` says not authorised | The user must run `/design-login` in an interactive `claude` terminal; a desktop session cannot. |
| `list_projects` does not show the project | It is a regular project, not a design system. Address it by id. |
| `finalize_plan` rejected | `deletes` is required, even as `[]`. |
| `write_files` times out with several files | One per call under the same `planId`; overwriting is idempotent, so retry freely. |
| Room does not load: "Failed to resolve module specifier" or an integrity error | The import map is built from the `three` imports in `src/scripts` and hashed from `node_modules/three`, which must be the version `package.json` pins (`npm ci` if unsure). The local check catches this. |
| Articles, books, the pixel font or the dog are missing right after a sync | They come from the live site and exist there only once the commit is pushed and deployed. |
| The page is listed though no source changed | Notion content changed since the last build. It is live content: upload it. |
| The user says they edited the copy in Claude Design | Overwriting cannot be undone from here. Ask before `finalize_plan`. |
| `src/styles/broadsheet.css` changed | Not part of the sync: Claude Design uses its own `_ds/` stylesheet, of which that file is a port. Say so. |

## Building from a clean worktree

When another chat is editing this checkout (uncommitted changes that are not yours, or `HEAD` moving under you):
`git worktree add --detach <scratchpad>/wt HEAD`, symlink `.env` and `node_modules` into it, copy `.cache/book-covers.json`
and `.notion-cache/` into it (without them the covers drop out and Notion is fetched from scratch), `npm run build`
there, then run **this checkout's** script with `--repo <scratchpad>/wt`. `git worktree remove --force` afterwards.

## Left out on purpose

Analytics, the service worker, canonical/OG tags and favicons are not in the Claude Design page. Its `<title>`
(`Paul Wu · 書房`) is fixed in the script.
