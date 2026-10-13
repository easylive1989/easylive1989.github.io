# 雪見的和室 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 加第三個世界 `snow`：窗外是版畫畫法的雪中湖景，房間是坐在榻榻米上的和室；鴨子改成三間輪流。

**Architecture:** 沿用兩間房間的做法：`src/scripts/studySnowRoom.js` 是第三個房間模組（`build(kit) → { parts, opening, sink, lamp }`，動態載入），
`studyTextures.js` 多兩個畫雪景的函式，`study.js` 的 `WORLDS` 多一筆、鴨子照順序表輪。新的是「下沉」：房間可以回報 `sink`，`show()` 據此把
書桌、椅子、邊桌三組整組往下移；原本寫死在書桌高度的東西（桌面陰影、檯燈的光與光暈、dock 的書桌角落）先改成跟著書桌那一組。

**Tech Stack:** Astro 5、three.js 0.184、Vite dynamic import、Canvas 2D 程序化貼圖。

**Spec:** `docs/superpowers/specs/2026-10-13-snow-washitsu-design.md`（沿用 `docs/superpowers/specs/2026-10-12-ink-study-room-design.md` 定下的房間介面、只建看得到的那間、重放開門）

## Global Constraints

- `lake`、`ink` 兩個世界的外觀不變：Task 1 前後各自的物件清單必須完全相同。
- 世界的順序：`lake` → `ink` → `snow` → `lake`。`localStorage` 的 key 是 `study-scenery`，值只有 `ink`、`snow` 有意義，其餘都當 `lake`。
- 下沉量：書桌 `0.44`、椅子 `0.375`、邊桌 `0.32`（公尺），只在 `snow` 生效，每次 `show()` 都照當下那間重設。書架、展示架、電視不動。
- 和室的鴨居在 `2.05`；後牆兩個開間 `[-2.88, -0.1]`、`[0.02, 2.88]`，各四扇障子、中間兩扇推開。
- 顏色。窗外：天 `#46566a` → `#7b8894` → `#c5cbd0`、輪廓線 `#26323d`、遠山 `#f2f4f4` → `#a9b8c4`、丘 `#e6eaec`／`#bcc8cf`、水 `#5d7284` → `#22303d`、
  霞 `#e4e8ea`、燈 `#f2c86b`、雪 `#ffffff`。房間：聚樂 `#cbbd95`、檜 `#caa878`、杉 `#9c7a52`、桐 `#d8c095`、欅 `#a56e3e`、深色框 `#5f4a33`、紙 `#e9e2cf`。
- 雪的落法：速度 `0.22`、左右飄 `0.28`、顆粒 `0.038`（落葉是 `0.45`、`0.7`、`0.05`）。
- 文案：掛軸寫 `日々是好日`；鴨子的提示維持 `換個景色`；載入失敗的 toast 維持 `另一間書房進不去，重新整理頁面再試一次`。
- 和室不改三間共用的材質顏色，用自己的材質（名字以 `snow-` 開頭）。
- 開工前先把 spec 和這份計畫各 commit 一次（`docs: design a Japanese room for the lake under snow`、`docs: plan the Japanese room`）。
- 每個 task 完成時 commit 到 `master`，訊息照 repo 的 `feat(room): …` 風格，結尾加 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。**不要 push**，等使用者要求。
- 暫時加的 `window.__dbg` 不能進 commit：它只留在工作目錄的 `study.js`，每個 commit 只 `git add` 該 task 列出的檔案；commit 後用
  `git grep -c __dbg HEAD -- src/scripts` 確認沒有輸出。動到 `study.js` 的 task（1、2、7）在 commit 前先把那一行拿掉。
- 指令都在 repo 根目錄執行。沒有測試框架：每個 task 的「測試」是下面「檢查工具」的瀏覽器檢查，加上 `npm run build` 和 `npm run check:nav` 通過。

## Review Focus

spec 沒逐條寫、但最容易咬到人的五種情況：

1. **從雪見切走之後還留著上一間的東西**：書桌、椅子、邊桌要回到原本的高度，檯燈的光回到燈罩旁，落葉恢復原本的速度和大小；
   下一間載入失敗、門重開在雪見時，下沉反而不能被還原。→ Task 1 Step 6、Task 6 Step 3 的檢查 C。
2. **書桌沉下去之後拿起稿紙或系列書**：要到眼前，放回去時落在沉下去的桌面上。→ Task 5 Step 3 的檢查 C。
3. **書桌沉下去之後的鏡頭**：dock 的「書桌」和「點桌上的筆電」都要對準沉下去的位置，不是半空中。→ Task 1 Step 6、Task 5 Step 3 的檢查 B。
4. **記住的世界認不得**（舊值、空字串、被改過）：開湖景，不丟錯。→ Task 2 Step 5 的檢查 C。
5. **鴨子在障子邊緣的判定**：視線穿過關著的障子或鴨居上方的小壁點不到，穿過推開的那一段才行。→ Task 3 Step 3 的檢查 C。

## 檔案與責任

| 檔案 | 動作 | 責任 | Task |
|---|---|---|---|
| `src/scripts/study.js` | 改 | `sink`／`lamp`／`fall` 的套用、跟著書桌走的陰影和燈、鴨子的順序表、`WORLDS.snow` | 1、2 |
| `src/scripts/studyTextures.js` | 改 | `SNOWS`、`paintSnowView`、`paintSnowWater` | 2 |
| `src/scripts/studySnowRoom.js` | 新增 | 和室 | 2–6 |
| `.claude/skills/sync-claude-design/build-design.mjs`、`SKILL.md` | 改 | 同步的腳本從五個變六個 | 7 |
| `README.md` | 改 | `src/scripts/` 檔案樹多一行 | 7 |
| `src/scripts/wa-demo.js` | 刪 | 定案用的 demo（未進版控） | 7 |

**順序：** 1 → 2 → 3，之後 4、5、6 可以任意順序，7 最後。

## 檢查工具

**開房間。** `preview_start {name: "astro-dev-alt"}`，開 `http://localhost:4331/`（改檔案後一兩秒內 `navigate` 可能失敗，等兩秒重送）。
門開了的判準：`document.getElementById('intro').classList.contains('off')`。

**瀏覽器面板在背景時每秒只有約 3 格。** 所以：不要用「幾秒後應該看到什麼」當判準，改查狀態（class、`getObjectByName`、`localStorage`）；
鏡頭飛一趟要將近一分鐘，等 `__dbg.controls.enabled` 變回 `true`（走進來的那一趟結束）之後直接設鏡頭；滑鼠事件用程式送。

**除錯把手。** `src/scripts/study.js` 最後加一行，只留在工作目錄：

```js
window.__dbg = { THREE, scene, camera, renderer, controls, WORLDS, turnWorld, show, prepare };
```

**小工具。** 每次重新整理之後貼一次：

```js
window.__t = (() => { const { THREE, scene, camera, renderer, controls } = __dbg, cv = renderer.domElement, tip = document.getElementById('tip');
  const seen = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  const at = o => { scene.updateMatrixWorld(true); camera.updateMatrixWorld(); const r = cv.getBoundingClientRect(), c = (o.isVector3 ? o.clone() : new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3())).project(camera); return { clientX:r.left + (c.x + 1) / 2 * r.width, clientY:r.top + (1 - c.y) / 2 * r.height, bubbles:true }; };
  return {
    // every visible mesh, sprite and cloud of points: kind, name, materials, vertices, whether it casts a shadow, where it is
    manifest:() => { const out = []; scene.updateMatrixWorld(true); scene.traverse(o => { if (!(o.isMesh || o.isSprite || o.isPoints) || !seen(o)) return; const p = o.getWorldPosition(new THREE.Vector3()); out.push([o.type, o.name, [].concat(o.material).map(m => m.name || m.type).join('+'), o.geometry.attributes.position.count, +o.castShadow, ...p.toArray().map(v => v.toFixed(3))].join('|')); }); return out.sort(); },
    y:n => +scene.getObjectByName(n).getWorldPosition(new THREE.Vector3()).y.toFixed(3),
    look:(target, pos) => { controls.target.set(...target); camera.position.set(...pos); controls.update(); },
    hover:o => { cv.dispatchEvent(new PointerEvent('pointermove', at(o))); return tip.style.opacity === '1' ? tip.textContent : null; },
    click:o => { const p = at(o); cv.dispatchEvent(new PointerEvent('pointerdown', p)); cv.dispatchEvent(new PointerEvent('pointerup', p)); },
    built:() => Object.keys(__dbg.WORLDS).filter(k => __dbg.WORLDS[k].room),
  }; })();
```

`hover`／`click` 的參數可以是場景裡的物件，也可以是一個世界座標的 `THREE.Vector3`。

**指定世界開門。** `localStorage.setItem('study-scenery', 'snow')`（或 `'ink'`、`removeItem`）之後 `location.reload()`。

**把門留住拍照。** `const real = __dbg.WORLDS.snow.builder; __dbg.WORLDS.snow.builder = () => new Promise(r => setTimeout(r, 7000)).then(real);` 之後再 `__dbg.turnWorld()`。
讓它失敗則是 `__dbg.WORLDS.snow.builder = async () => { throw new Error('test'); }`。

---

### Task 1: 舞台準備

做完之後 `lake` 和 `ink` 看起來和現在一樣，但舞台已經能讓一間房間說「書桌沉 44 cm、燈在這裡、飄的東西這樣落」，鴨子也照順序表輪。

**Files:**
- Modify: `src/scripts/study.js`

**Interfaces:**
- Produces: 房間回傳值的兩個可有可無欄位 `sink: { desk?, chair?, side? }`（公尺）與 `lamp: [x, y, z]`（書桌那一組的座標）；世界的可有可無欄位
  `fall: { speed?, sway?, size? }`；模組層的 `ORDER`（世界名稱的陣列）、`setLamp(at?)`、`fall`、`lampGlow`。

- [ ] **Step 1: 拿掉 demo 的 hook，讓 `study.js` 回到 HEAD**

`git diff src/scripts/study.js` 應該只有結尾多出的一行 `if (new URLSearchParams(location.search).has('wa')) import('./wa-demo.js')…`。確認之後：

```bash
git checkout -- src/scripts/study.js && git status --short src
```

Expected: 只剩 `?? src/scripts/wa-demo.js`（demo 檔留著當形狀的參考，Task 7 才刪；從這一步起 `?wa` 不再有作用）。

- [ ] **Step 2: 記下改動前兩個世界的物件清單，並看著新功能還不存在**

加上除錯把手。`localStorage.removeItem('study-scenery'); location.reload();`，門開了、吉利載入之後（`__dbg.scene.getObjectByName('dog').children.length` 是 1）貼上小工具，然後：

```js
localStorage.setItem('manifest-lake', JSON.stringify(__t.manifest())); __dbg.turnWorld(); 'lake recorded'
```

等到 `__t.built()` 是 `['lake', 'ink']` 而且門開了：

```js
(() => { localStorage.setItem('manifest-ink', JSON.stringify(__t.manifest())); const { WORLDS, show, scene } = __dbg, r = WORLDS.ink.room; r.sink = { desk:.44, chair:.375, side:.32 }; r.lamp = [2.56, .935, -2.33]; WORLDS.ink.fall = { speed:.2, sway:.25, size:.035 }; show('ink');
  let leaf; scene.traverse(o => { if (o.isPoints && o.material.alphaTest) leaf = o.material.size; }); return { laptop:__t.y('laptop'), cushion:__t.y('seat-cushion'), stack:__t.y('stack-book'), leaf }; })()
```

Expected（RED，功能還沒做）：`{ laptop: 0.785, cushion: 0.47, stack: 0.64, leaf: 0.05 }`，也就是設了 `sink` 和 `fall` 也沒有任何東西動。

- [ ] **Step 3: 檯燈的光、光暈、桌面的陰影跟著書桌那一組**

把

```js
const lampLight2 = new THREE.PointLight(0xffa850, .8, 3.5, 1.6); lampLight2.position.set(2.42, DY + .5, -2.25); room.add(lampLight2);
```

換成

```js
const lampLight2 = new THREE.PointLight(0xffa850, .8, 3.5, 1.6); desk.add(lampLight2); // the desk's lamp: on the desk's group, so that it goes where the desk goes (setLamp, below, places it)
```

把

```js
halo([2.4, DY + .52, -2.27], .5, .16);
```

換成

```js
// The glow round the desk's lamp is on the desk's group too. Where the light and its glow are, in the desk's own frame: by the shade of
// the western lamp, unless the room on show keeps its lamp somewhere else.
const lampGlow = halo([0, 0, 0], .5, .16); desk.add(lampGlow);
const setLamp = at => { lampLight2.position.set(...(at || [2.42, DY + .5, -2.25])); lampGlow.position.set(...(at || [2.4, DY + .52, -2.27])); };
setLamp();
```

把 `const DT = DY + .0265;` 下一行結尾的

```js
.forEach(([x, z, w, d]) => decal(aoRad, w, d, [x, DT, z], FL, .7));
```

換成

```js
.forEach(([x, z, w, d]) => desk.add(decal(aoRad, w, d, [x, DT, z], FL, .7))); // on the desk's group: where the desk goes, so do the shadows of what stands on it
```

- [ ] **Step 4: 飄的東西、下沉、燈，每次 `show()` 都照當下那間重設；鴨子照順序表輪**

在 `const points = new THREE.Points(pGeo, pMat); points.frustumCulled = false; room.add(points);` 那行之後加：

```js
let fall = FALL; // how what is in the air falls just now: a world may have something other than leaves there, falling its own way
```

在 `WORLDS` 的結尾 `};` 之後加：

```js
const ORDER = ['lake', 'ink']; // the duck's round
```

`show()` 的最後一行

```js
  sky.material.color.set(w.sky); scene.background.set(w.back); pMat.color.set(w.leaf); renderer.shadowMap.needsUpdate = true; }
```

換成

```js
  sky.material.color.set(w.sky); scene.background.set(w.back); pMat.color.set(w.leaf); fall = w.fall ? { ...FALL, ...w.fall } : FALL; pMat.size = fall.size;
  // A room where one sits on the floor has the desk, the chair and the side table sink, with all that is on them, and may keep its lamp
  // somewhere else on the desk. These are set to the room's own every time one goes on show, so that nothing is left over from the last.
  const sink = w.room.sink || {}; desk.position.y = 0 - (sink.desk || 0); chair.position.y = 0 - (sink.chair || 0); side.position.y = 0 - (sink.side || 0); setLamp(w.room.lamp);
  renderer.shadowMap.needsUpdate = true; }
```

`turnWorld()` 裡的

```js
  const to = world === 'ink' ? 'lake' : 'ink', fresh = !WORLDS[to].room; let ok = true;
```

換成

```js
  const to = ORDER[(ORDER.indexOf(world) + 1) % ORDER.length], fresh = !WORLDS[to].room; let ok = true;
```

迴圈裡落葉那一行的 `FALL.speed` 換成 `fall.speed`，`FALL.sway` 換成 `fall.sway`（各一處）。

開頁那段的

```js
  let first = (() => { try { return localStorage.getItem(SKEY); } catch { return null; } })() === 'ink' ? 'ink' : 'lake';
```

換成

```js
  const kept = (() => { try { return localStorage.getItem(SKEY); } catch { return null; } })(); let first = ORDER.includes(kept) ? kept : 'lake';
```

同一段裡的警告文字 `'the Chinese study would not open, so the door opens on the lake'` 換成 `'the room the page was left in would not open, so the door opens on the lake'`。

- [ ] **Step 5: dock 的「書桌」跟著書桌那一組**

`ZONES` 裡的

```js
  desk:    { at:[DX, DY + .2, DZ], from:[-.1, .6, 1], d:2.2 },
```

換成

```js
  desk:    { at:[DX, DY + .2, DZ], from:[-.1, .6, 1], d:2.2, on:desk }, // `on`: the group this corner belongs to. If it has sunk, the camera looks that much lower
```

`goZone()` 第一行結尾的 `dir = new THREE.Vector3(...z.from).normalize();` 後面接上：

```js
 if (z.on) at.y += z.on.position.y;
```

- [ ] **Step 6: 瀏覽器檢查**

重新整理（湖景開門），貼上小工具。

**兩個世界的清單不變。**

```js
(() => { const diff = (key) => { const a = JSON.parse(localStorage.getItem(key)), b = __t.manifest(), count = l => l.reduce((m, s) => m.set(s, (m.get(s) || 0) + 1), new Map()), A = count(a), B = count(b); return { before:a.length, after:b.length, gone:[...A].filter(([s, n]) => (B.get(s) || 0) < n).map(([s]) => s), added:[...B].filter(([s, n]) => (A.get(s) || 0) < n).map(([s]) => s) }; }; window.__diff = diff; return diff('manifest-lake'); })()
```

Expected: `before` 等於 `after`，`gone`、`added` 都是空的。接著 `__dbg.turnWorld()`，門開了之後 `__diff('manifest-ink')`：同樣全空。

**新功能（GREEN）。** 還在 `ink`：

```js
(() => { const { WORLDS, show, scene, THREE } = __dbg, r = WORLDS.ink.room, desk = scene.getObjectByName('desk'), read = () => { scene.updateMatrixWorld(true); let leaf, light, glow; const shadows = [];
    scene.traverse(o => { if (o.isPoints && o.material.alphaTest) leaf = o.material.size; if (o.parent !== desk) return; const p = o.getWorldPosition(new THREE.Vector3()).toArray().map(v => +v.toFixed(3)); if (o.isPointLight) light = p; else if (o.isSprite) glow = p; else if (o.isMesh && !o.name) shadows.push(p[1]); });
    return { laptop:__t.y('laptop'), cushion:__t.y('seat-cushion'), stack:__t.y('stack-book'), leaf, light, glow, shadows }; };
  r.sink = { desk:.44, chair:.375, side:.32 }; r.lamp = [2.56, .935, -2.33]; WORLDS.ink.fall = { speed:.2, sway:.25, size:.035 }; show('ink'); const sunk = read();
  delete r.sink; delete r.lamp; delete WORLDS.ink.fall; show('ink'); return { sunk, back:read() }; })()
```

Expected:
`sunk` 是 `{ laptop: 0.345, cushion: 0.095, stack: 0.32, leaf: 0.035, light: [2.56, 0.495, -2.33], glow: [2.56, 0.495, -2.33], shadows: [四個 0.346 或 0.347] }`（實際是 `0.7865 − 0.44 = 0.3465`，剛好在進位邊界，兩個值都算對）；
`back` 是 `{ laptop: 0.785, cushion: 0.47, stack: 0.64, leaf: 0.05, light: [2.42, 1.26, -2.25], glow: [2.4, 1.28, -2.27], shadows: [四個 0.786 或 0.787] }`。

**dock 的書桌角落（Review Focus 3）。** 等 `__dbg.controls.enabled` 是 `true`，再

```js
(() => { const { WORLDS, show } = __dbg; WORLDS.ink.room.sink = { desk:.44 }; show('ink'); document.querySelector('#hud [data-zone=desk]').click(); return 'flying to the desk'; })()
```

等 `__dbg.controls.enabled` 再變回 `true`（約一分鐘），`+__dbg.controls.target.y.toFixed(2)` 應該是 `0.52`（`0.76 + 0.2 − 0.44`）。
然後 `delete __dbg.WORLDS.ink.room.sink; __dbg.show('ink');`。

**鴨子照舊兩間輪。** `__dbg.turnWorld()` 兩次，`localStorage.getItem('study-scenery')` 依序是 `lake`、`ink`。console 沒有錯誤。
最後 `['manifest-lake', 'manifest-ink', 'study-scenery'].forEach(k => localStorage.removeItem(k))`。

- [ ] **Step 7: build 與 commit**

把 `window.__dbg` 那一行拿掉。

```bash
grep -n "__dbg" src/scripts/*.js; npm run build 2>&1 | tail -2 && npm run check:nav 2>&1 | tail -1
git add src/scripts/study.js
git commit -m "$(cat <<'EOF'
refactor(room): let a room sink the desk, move the lamp and change what falls outside

The lamp's light, its glow and the contact shadows on the desk hang on the
desk's group now, and the dock's desk corner follows it, so a room can ask
for the desk, the chair and the side table to sink with all that is on them.
A world can say how what is in the air falls. Each is set afresh whenever a
room goes on show. The duck goes round a list of worlds.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

Expected: grep 沒有輸出；build 結尾 `[build] Complete!`；`ok: 127 blog pages`。

---

### Task 2: 雪見的窗外，鴨子三間輪流

做完之後鴨子點第三下會到 `snow`：窗外是雪景、飄的是雪，房間暫時只有一片地板。

**Files:**
- Modify: `src/scripts/studyTextures.js`（接在 `paintInkWater` 之後）
- Create: `src/scripts/studySnowRoom.js`（暫時的最小版本）
- Modify: `src/scripts/study.js`

**Interfaces:**
- Consumes: Task 1 的 `ORDER`、世界的 `fall`。
- Produces: `SNOWS = { sky, key, flake }`、`paintSnowView(c, { seed = 11, islet = true, feather = 0 })`、`paintSnowWater(c, view, { seed = 19 })`；
  `WORLDS.snow`；`buildSnowRoom(kit) → { parts, opening }`（Task 3 整個換掉內容，介面多 `sink`、`lamp`）。

- [ ] **Step 1: 看著它還不存在（RED）**

加上除錯把手，重新整理，貼上小工具：`({ snow: !!__dbg.WORLDS.snow })`。Expected: `{ snow: false }`。

- [ ] **Step 2: 兩個畫圖函式**

`src/scripts/studyTextures.js`，在 `paintInkWater` 的結尾 `}` 之後加：

```js

// The lake under snow, as a woodblock print: flat colour inside a keyline, a sky that shades off downwards, bars of mist. It keeps the
// lake's layout (the water from 55% down, the high ground on the left). What there is to look at is kept low and to the right of the
// middle: the room this is seen from has a low lintel, and from the middle of that room only so much of the sheet shows through its screens.
export const SNOWS = { sky:'#46566a', key:'#26323d', flake:'#ffffff' };
export function paintSnowView(c, { seed = 11, islet = true, feather = 0 } = {}) {
  const x = c.getContext('2d'), w = c.width, h = c.height, R = rng(seed), KEY = SNOWS.key, SHORE = h * .55;
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.lineJoin = x.lineCap = 'round';
  const grad = (y0, y1, stops) => { const g = x.createLinearGradient(0, y0, 0, y1); stops.forEach(([t, cc]) => g.addColorStop(t, cc)); return g; };
  const blob = (bx, by, rx, ry, cc, a = 1) => { x.globalAlpha = a; x.fillStyle = cc; x.beginPath(); x.ellipse(bx, by, rx, ry, 0, 0, 6.2832); x.fill(); x.globalAlpha = 1; };
  // a range: all that lies under a profile, down to its foot, in one colour, with a keyline along its top
  const range = (yf, foot, fill) => { const N = 200, pts = []; for (let i = 0; i <= N; i++) pts.push([i / N * w, Math.min(foot, yf(i / N))]);
    x.beginPath(); x.moveTo(0, foot); pts.forEach(p => x.lineTo(p[0], p[1])); x.lineTo(w, foot); x.closePath(); x.fillStyle = fill; x.fill();
    x.strokeStyle = KEY; x.lineWidth = 1.4; x.globalAlpha = .6; x.beginPath(); let pen = false; pts.forEach(([px, py]) => { if (py >= foot - 1) { pen = false; return; } pen ? x.lineTo(px, py) : x.moveTo(px, py); pen = true; }); x.stroke(); x.globalAlpha = 1; };
  const ridge = (ps, foot) => t => h * (foot - ps.reduce((m, [pc, pw, ph]) => Math.max(m, ph * Math.exp(-Math.pow(Math.abs(t - pc) / pw, 1.7))), 0)) + (R() - .5) * 1.5;
  const bank = t => SHORE - h * .05 * Math.pow(Math.max(0, 1 - t * 2.2), .8); // the top of the near shore, which falls away from the left
  // a pine: a trunk, four tiers of needles, and a cap of snow on each
  const pine = (tx, by, H) => { x.strokeStyle = '#2a2622'; x.lineWidth = Math.max(1.2, H * .05); x.beginPath(); x.moveTo(tx, by); x.lineTo(tx + H * .08, by - H); x.stroke();
    for (let i = 0; i < 4; i++) { const k = .4 + i * .18, rx = H * (.34 - i * .06), cy = by - H * k; blob(tx + H * .08 * k, cy, rx, H * .07, '#2f4a3c'); blob(tx + H * .08 * k - 1, cy - H * .035, rx * .9, H * .04, '#f4f6f6'); } };

  // the sky, darkest overhead; a far range all white, blue-grey at its foot; bars of mist; the near hills
  x.fillStyle = grad(0, SHORE, [[0, SNOWS.sky], [.25 / .55, '#7b8894'], [1, '#c5cbd0']]); x.fillRect(0, 0, w, SHORE + 2);
  range(ridge([[.08, .09, .13], [.24, .07, .1], [.42, .08, .12], [.6, .07, .09], [.8, .08, .12], [.95, .06, .1]], .5), h * .52, grad(h * .36, h * .52, [[0, '#f2f4f4'], [1, '#a9b8c4']]));
  for (let i = 0; i < 5; i++) { const bw = 120 + R() * 220, bx = R() * (w - bw), by = h * (.39 + R() * .1), bh = 9 + R() * 7; x.globalAlpha = .8; x.fillStyle = '#e4e8ea'; x.beginPath(); x.roundRect ? x.roundRect(bx, by, bw, bh, bh / 2) : x.rect(bx, by, bw, bh); x.fill(); } x.globalAlpha = 1;
  range(ridge([[0, .1, .2], [.13, .07, .15], [.27, .08, .1], [.97, .05, .12]], .555), SHORE + 2, '#e6eaec');
  range(ridge([[.02, .07, .12], [.17, .06, .085], [.33, .07, .05], [.995, .035, .085]], .56), SHORE + 2, '#bcc8cf');
  // the water: a ground of slate, ripples as short bars of white or of the keyline, the shore drawn once
  x.fillStyle = grad(SHORE, h, [[0, '#5d7284'], [1, '#22303d']]); x.fillRect(0, SHORE, w, h - SHORE);
  for (let i = 0; i < 70; i++) { const ly = SHORE + 3 + R() * R() * (h - SHORE) * .9, lx = R() * w, len = 20 + R() * 110; x.globalAlpha = .1 + R() * .22; x.fillStyle = R() < .7 ? '#ffffff' : KEY; x.fillRect(lx, ly, len, 1 + R() * 1.2); } x.globalAlpha = 1;
  x.strokeStyle = KEY; x.lineWidth = 1.2; x.globalAlpha = .45; x.beginPath(); x.moveTo(0, SHORE + 1); x.lineTo(w, SHORE + 1); x.stroke(); x.globalAlpha = 1;
  // pines along the near shore, and on the headland at the right edge
  for (let i = 0; i < 16; i++) { const t = .01 + R() * .44, bx = t * w, by = bank(t) - R() * h * .05; pine(bx, by + 4, h * (.06 + R() * .06)); }
  for (let i = 0; i < 4; i++) pine(w * (.9 + i * .03), SHORE - h * (.02 + i * .018), h * (.08 + R() * .03));
  // an islet off the shore, where the open screens look: pines, a hut under snow with its lamp lit; and a boat further out
  if (islet) { const cx = w * .47, by = SHORE - 1; blob(cx, SHORE + 3, 78, 9, '#bcc8cf'); [-52, -38, 44, 58].forEach((dx, i) => pine(cx + dx, SHORE + 1, h * (.07 + (i % 2) * .025)));
    x.fillStyle = '#5f4634'; x.fillRect(cx - 22, by - 20, 44, 20); x.fillStyle = '#f2c86b'; x.fillRect(cx - 5, by - 14, 10, 9);
    x.beginPath(); x.moveTo(cx - 32, by - 18); x.lineTo(cx - 10, by - 42); x.lineTo(cx + 10, by - 42); x.lineTo(cx + 32, by - 18); x.closePath(); x.fillStyle = '#f6f8f8'; x.fill(); x.strokeStyle = KEY; x.lineWidth = 1.2; x.globalAlpha = .6; x.stroke();
    const bx = w * .67, bt = SHORE + h * .11; x.fillStyle = KEY; x.globalAlpha = .9; x.beginPath(); x.moveTo(bx - 24, bt - 4); x.quadraticCurveTo(bx, bt + 8, bx + 26, bt - 5); x.lineTo(bx + 18, bt + 1); x.quadraticCurveTo(bx, bt + 6, bx - 17, bt + 1); x.closePath(); x.fill();
    [[[11, -1], [14, -9], [17, -1]], [[9, -9], [14, -13], [19, -9]]].forEach(tri => { x.beginPath(); tri.forEach(([dx, dy], i) => i ? x.lineTo(bx + dx, bt + dy) : x.moveTo(bx + dx, bt + dy)); x.fill(); }); x.globalAlpha = 1; }
  // snow in the air, all over the sheet
  for (let i = 0; i < 300; i++) blob(R() * w, R() * h, .8 + R() * 1.6, .8 + R() * 1.6, '#ffffff', .35 + R() * .5);
  // as on the other lakes: a view laid over the edge of another gives way to it along its own left edge
  if (feather) { const edge = x.createLinearGradient(0, 0, w * feather, 0); edge.addColorStop(0, 'rgba(0,0,0,1)'); edge.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalCompositeOperation = 'destination-out'; x.fillStyle = edge; x.fillRect(0, 0, w * feather, h); x.globalCompositeOperation = 'source-over'; }
}

// The water between the house and the print: the slate the sheet ends on, darker as it comes under the eye, with a few bars of ripple.
// Tiles from side to side.
export function paintSnowWater(c, view, { seed = 19 } = {}) {
  const x = c.getContext('2d'), w = c.width, h = c.height, R = rng(seed);
  const [r, g, b] = cnv(1, 1, lx => lx.drawImage(view, 0, view.height - 6, view.width, 6, 0, 0, 1, 1)).getContext('2d').getImageData(0, 0, 1, 1).data;
  const grad = x.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, `rgb(${r},${g},${b})`); grad.addColorStop(1, `rgb(${Math.round(r * .8)},${Math.round(g * .82)},${Math.round(b * .85)})`);
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.fillStyle = grad; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i++) { const by = R() * h, len = 14 + R() * 50, bx = R() * w, th = 1 + R(); x.globalAlpha = .08 + R() * .14; x.fillStyle = R() < .6 ? '#ffffff' : SNOWS.key; [-w, 0, w].forEach(dx => x.fillRect(bx + dx, by, len, th)); }
  x.globalAlpha = 1;
}
```

- [ ] **Step 3: 暫時的 `src/scripts/studySnowRoom.js`**

```js
// The Japanese room that goes with the lake under snow. For now only a floor to stand on: its screens and its furniture come next.
export default function buildSnowRoom(kit) {
  const { THREE, mk, std, room } = kit, parts = [];
  const floor = mk(new THREE.PlaneGeometry(6, 5.6), std('snow-tatami', '#bdb686', { roughness:.95 }), 'snow-tatami', [0, 0, .2], [-Math.PI / 2, 0, 0]); floor.castShadow = false; room.add(floor); parts.push(floor);
  return { parts, opening:(x, y) => y > 0 && y < 2.03 && x > -2.145 && x < -.835 };
}
```

- [ ] **Step 4: `study.js`：第三個世界**

第 4 行的 import，把 `paintInkView, paintInkWater, SKY, INKS, crtMask` 換成 `paintInkView, paintInkWater, paintSnowView, paintSnowWater, SKY, INKS, SNOWS, crtMask`。

`/* ================= worlds ================= */` 下面那四行註解換成：

```js
// A world is what lies outside and the room that goes with it: the lake in autumn seen from the western study; the same lake as a
// landscape in ink, where the sky is paper and the leaves are the red of the sun, seen from a Chinese one; and the lake under snow, as a
// print, seen from a Japanese room where one sits on the floor. The rubber duck on the jetty goes round them, and the page remembers which
// it was left in. Only the world the door opens on is built. Another is built the first time it is asked for, behind the door, which is
// shut and pushed open again; after that it is kept, and the worlds that have been built change places at once.
```

`WORLDS` 裡 `ink` 那一筆（兩行）之後加：

```js
  snow:{ sky:SNOWS.sky, back:SNOWS.sky, leaf:SNOWS.flake, fall:{ speed:.22, sway:.28, size:.038 }, builder:async () => (await within(15000, import('./studySnowRoom.js'))).default,
    paint:(far, side, near) => { paintSnowView(far); paintSnowView(side, { seed:23, islet:false, feather:.1 }); paintSnowWater(near, far); } },
```

`const ORDER = ['lake', 'ink']; // the duck's round` 換成 `const ORDER = ['lake', 'ink', 'snow']; // the duck's round`。

- [ ] **Step 5: 瀏覽器檢查**

**檢查 A：三間依序輪流（GREEN）。** 湖景開門，貼上小工具。連續三次：`__dbg.turnWorld()`，等門開著而且 `localStorage.getItem('study-scenery')` 換了值之後讀它。Expected: 依序 `ink`、`snow`、`lake`；`__t.built()` 最後是 `['lake', 'ink', 'snow']`；
`performance.getEntriesByType('resource').some(e => /studySnowRoom/.test(e.name))` 在第二次之前是 `false`，之後是 `true`。

**檢查 B：雪見的樣子。** 切到 `snow`：

```js
(() => { const { scene } = __dbg; let leaf, col; scene.traverse(o => { if (o.isPoints && o.material.alphaTest) { leaf = o.material.size; col = '#' + o.material.color.getHexString(); } }); return { leaf, col, sky:'#' + scene.background.getHexString(), floor:scene.getObjectByName('snow-tatami').visible }; })()
```

Expected: `{ leaf: 0.038, col: '#ffffff', sky: '#46566a', floor: true }`。截圖：沒有牆（下一個 task 才有），整片雪景：雪山、左岸的雪松、右半邊小島上點著燈的茅屋、小船、雪點。
切回 `lake` 之後同一段的 `leaf` 是 `0.05`、`col` 是 `#d4782e`。

**檢查 C：記住的值（Review Focus 4）。** 依序試三個值，每次 `localStorage.setItem('study-scenery', v); location.reload();`，門開了之後貼小工具、讀 `__t.built()`：
`'snow'` → `['snow']`；`'wa'` → `['lake']`；`''` → `['lake']`。console 沒有錯誤。

**檢查 D：輪到的那間載不下來。** 湖景開門，`__dbg.WORLDS.ink.builder = async () => { throw new Error('test'); }; __dbg.turnWorld();`，門重新打開之後：
`document.getElementById('toast').textContent` 是 `另一間書房進不去，重新整理頁面再試一次`，`localStorage.getItem('study-scenery')` 是 `null`，`__t.built()` 是 `['lake']`。
再點一次（`__dbg.turnWorld()`）還是試 `ink`、還是失敗。最後 `localStorage.removeItem('study-scenery')`。

- [ ] **Step 6: build 與 commit**

把 `window.__dbg` 那一行拿掉。

```bash
grep -n "__dbg" src/scripts/*.js; npm run build 2>&1 | tail -2 && npm run check:nav 2>&1 | tail -1; ls dist/_astro | grep -i -E "inkroom|snowroom"; grep -c "studySnowRoom" dist/index.html
git add src/scripts/study.js src/scripts/studyTextures.js src/scripts/studySnowRoom.js
git commit -m "$(cat <<'EOF'
feat(room): let the duck go on to a third world, the lake under snow

The lake as a woodblock print in winter: a white range under a slate sky,
pines under snow, a hut on an islet with its lamp lit. Snow falls where the
leaves did, slower and straighter. The duck now goes round three worlds;
the Japanese room that belongs to this one is only a floor so far.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

Expected: grep 沒有輸出；build 與 check:nav 通過；`dist/_astro` 有 `studyInkRoom.<hash>.js` 和 `studySnowRoom.<hash>.js`；`dist/index.html` 裡 0 次。

---

### Task 3: 和室的殼

**Files:**
- Modify: `src/scripts/studySnowRoom.js`（整個檔案換掉）

**Interfaces:**
- Consumes: `kit` 的 `THREE, Q, M, col, rng, mk, box, cyl, rod, std, pbr, ctex, roomUV, weld, woodTex, plasterTex, decal, aoLin, room, FDOOR`。
- Produces（檔案內部，Task 4–6 會用）：`piece(parent, name, fill)`、`lone(parent, o)`、`K`、`DROP = { desk:.44, chair:.375, side:.32 }`、`sink`（可變的物件）、`lamp`（`let`）、
  材質 `juraku, hinoki, sugi, kiri, keyaki, dark, paper`。回傳 `{ parts, opening, sink, lamp }`。場景裡的名字：`snow-tatami`、`snow-shell`、`snow-kakejiku`。

- [ ] **Step 1: 看著它還不存在（RED）**

除錯把手還在工作目錄。`localStorage.setItem('study-scenery', 'snow'); location.reload();`，貼上小工具：

```js
Object.fromEntries(['snow-tatami', 'snow-shell', 'snow-kakejiku', 'snow-bookcase', 'snow-alcove', 'snow-table', 'snow-book-stand', 'snow-andon', 'snow-bonsai', 'snow-frame', 'snow-frame-feet', 'snow-tv-stand', 'snow-zaisu', 'snow-low-stand'].map(n => [n, !!__dbg.scene.getObjectByName(n)]))
```

Expected: 只有 `snow-tatami` 是 `true`，其餘都是 `false`（這一份 RED 也算 Task 4–6 的）。

- [ ] **Step 2: 寫 `src/scripts/studySnowRoom.js`**

```js
// The Japanese room that goes with the lake under snow: tatami, earthen walls between cedar posts, paper screens along the water, and
// furniture for sitting on the floor. Nothing here is built until that world is first wanted (study.js, WORLDS). The bookcase, the
// display shelves and the TV's stand keep every surface where the western room has it. The desk, the chair and the side table do not:
// each of those groups sinks, with all that is on it, while this room is on show (`sink`), and their frames are built for where they
// will be then: the table's legs are only as long as from its top to the floor it comes down to.
export default function buildSnowRoom(kit) {
  const { THREE, Q, M, col, rng, mk, box, cyl, rod, std, pbr, ctex, roomUV, weld, woodTex, plasterTex, decal, aoLin, room } = kit;
  const parts = [], sink = {}; let lamp; // `sink`: how far each sunk group goes down; `lamp`: where the light is, in the desk's own frame
  const DROP = { desk:.44, chair:.375, side:.32 };
  // one piece of the room: built into a group of its own under `parent`, so that it shares the coordinates of whatever stands on it
  // there, then drawn as one mesh per material
  const piece = (parent, name, fill) => { const g = new THREE.Group(); g.name = name; parent.add(g); fill(g); weld(g); parts.push(g); return g; };
  const lone = (parent, o) => { parent.add(o); parts.push(o); return o; }; // what has to stay a mesh, or a group, of its own
  const K = Q.low ? .5 : 1; // the low tier paints this room's own sheets at half size

  /* ================= materials ================= */
  const juraku = std('snow-juraku', '#cbbd95', { ...plasterTex, roughness:1 }); // earthen plaster: the walls' relief, sand-coloured
  const hinoki = pbr('snow-hinoki', '#caa878', { ...woodTex, roughness:.55, clearcoat:.2, clearcoatRoughness:.4 }), sugi = pbr('snow-sugi', '#9c7a52', { ...woodTex, roughness:.7 });
  const kiri = pbr('snow-kiri', '#d8c095', { ...woodTex, roughness:.6, clearcoat:.15, clearcoatRoughness:.5 }), keyaki = pbr('snow-keyaki', '#a56e3e', { ...woodTex, roughness:.4, clearcoat:.55, clearcoatRoughness:.22 }), dark = pbr('snow-dark', '#5f4a33', { ...woodTex, roughness:.5, clearcoat:.3 });
  const paper = std('snow-paper', '#e9e2cf', { roughness:.95 });

  /* ================= the shell ================= */
  // The lintel the screens hang from, the plane of the back wall, and its two bays. Each bay has four screens on two tracks, the middle
  // two slid back behind the outer two, so half of it stands open.
  const KAMOI = 2.05, Z = -2.55, BAYS = [[-2.88, -.1], [.02, 2.88]], PH = KAMOI - .02;
  function shell() { const F = kit.FDOOR;
    // tatami. One sheet is 2 m × 2 m: a mat across the top, and below it the halves of the two mats of the next row, set off by half a mat
    const tatami = ctex(1024 * K, 1024 * K, (x, w) => { const R = rng(3), m = w / 2, u = w / 1024;
      for (let r = 0; r < 2; r++) { const y0 = r * m; x.fillStyle = r ? '#b9b382' : '#bdb686'; x.fillRect(0, y0, w, m);
        for (let i = 0; i < 520; i++) { x.globalAlpha = .05 + R() * .08; x.fillStyle = R() < .5 ? '#6f6a3e' : '#e2dcae'; x.fillRect(0, y0 + R() * m, w, u); } // rush, woven along the mat
        for (let i = 0; i < 1400; i++) { x.globalAlpha = .04 + R() * .06; x.fillStyle = '#5c5a34'; x.fillRect(R() * w, y0 + R() * m, u, (2 + R() * 3) * u); } x.globalAlpha = 1;
        x.fillStyle = '#2b3327'; x.fillRect(0, y0, w, 14 * u); x.fillRect(0, y0 + m - 14 * u, w, 14 * u); // the cloth borders down the long sides
        x.fillStyle = 'rgba(30,30,20,.55)'; x.fillRect((r ? m : 0) - 1.5 * u, y0 + 14 * u, 3 * u, m - 28 * u); if (!r) x.fillRect(w - 1.5 * u, y0 + 14 * u, 3 * u, m - 28 * u); } }, false);
    tatami.wrapS = tatami.wrapT = THREE.RepeatWrapping; tatami.repeat.set(3, 2.8);
    const floor = mk(new THREE.PlaneGeometry(6, 5.6), std('snow-tatami', '#ffffff', { map:tatami, roughness:.95 }), 'snow-tatami', [0, 0, .2], [-Math.PI / 2, 0, 0]); floor.castShadow = false; lone(room, floor);
    // a paper screen, drawn at 256 px to the metre: a frame, a grid of thin bars three across and eight down, a board along the foot.
    // The paper glows with the day behind it.
    const PW = .7, shojiTex = ctex(Math.round(PW * 256 * K), Math.round(PH * 256 * K), (x, cw, ch) => { x.save(); x.scale(K, K); const w = cw / K, h = ch / K, f = 9, wood = '#5f4a33', kh = .32 * 256;
      x.fillStyle = '#f5f0e3'; x.fillRect(0, 0, w, h); x.fillStyle = wood; x.fillRect(0, 0, w, f); x.fillRect(0, h - f, w, f); x.fillRect(0, 0, f, h); x.fillRect(w - f, 0, f, h);
      x.fillStyle = '#7a6142'; x.fillRect(f, h - f - kh, w - 2 * f, kh); x.fillStyle = wood; x.fillRect(f, h - f - kh - 4, w - 2 * f, 4);
      const top = f, bot = h - f - kh - 4; for (let i = 1; i < 3; i++) x.fillRect(f + (w - 2 * f) * i / 3 - 1.5, top, 3, bot - top); for (let j = 1; j < 8; j++) x.fillRect(f, top + (bot - top) * j / 8 - 1.5, w - 2 * f, 3); x.restore(); }, false);
    const shoji = new THREE.MeshStandardMaterial({ name:'snow-shoji', map:shojiTex, emissive:col('#fff1d6'), emissiveMap:shojiTex, emissiveIntensity:.55, roughness:.9 });
    const ceilM = pbr('snow-ceiling', '#bfa074', { ...woodTex, roughness:.85 }), deckM = pbr('snow-engawa', '#a67c4c', { ...woodTex, roughness:.4, clearcoat:.5, clearcoatRoughness:.25 });
    piece(room, 'snow-shell', g => {
      // three walls of earthen plaster; the side walls stop at the back one
      [-3.05, 3.05].forEach(x => g.add(roomUV(box(.1, 2.8, 5.6, juraku, 'wall', [x, 1.4, .2])))); g.add(roomUV(box(6.2, 2.8, .1, juraku, 'wall', [0, 1.4, 3.05])));
      // overhead: boards on thin battens, and a cornice round the walls
      g.add(box(6.2, .1, 5.7, ceilM, 'ceiling', [0, 2.85, .15])); for (let i = 0; i < 12; i++) g.add(box(6, .03, .035, sugi, 'batten', [0, 2.785, -2.3 + i * .47], null, 0));
      [-2.95, 2.95].forEach(x => g.add(box(.05, .06, 5.5, sugi, 'cornice', [x, 2.77, .2], null, 2))); [-2.47, 2.95].forEach(z => g.add(box(6, .06, .05, sugi, 'cornice', [0, 2.77, z], null, 0)));
      // posts: at the ends and the middle of the back wall, twice along the right wall, and in the two front corners; and the rail that
      // runs round the room at the head of the screens
      [[-2.94, Z], [-.04, Z], [2.94, Z], [2.94, -.7], [2.94, 1.3], [2.94, 2.94], [-2.94, 2.94]].forEach(([x, z]) => g.add(box(.12, 2.8, .12, hinoki, 'post', [x, 1.4, z], null, 1)));
      [-2.975, 2.975].forEach(x => g.add(box(.03, .09, 5.5, hinoki, 'nageshi', [x, KAMOI + .045, .2], null, 2))); g.add(box(6, .09, .03, hinoki, 'nageshi', [0, KAMOI + .045, 2.975], null, 0));
      // the back: a lintel, plaster above it, a sill; and the screens
      g.add(box(6.1, .1, .14, hinoki, 'kamoi', [0, KAMOI + .05, Z], null, 0)); g.add(roomUV(box(6.1, 2.8 - KAMOI - .1, .1, juraku, 'wall', [0, (2.8 + KAMOI + .1) / 2, Z]))); g.add(box(6.1, .03, .14, hinoki, 'shikii', [0, .002, Z], null, 0));
      BAYS.forEach(([a, b]) => { const pw = (b - a) / 4; [[0, 0], [0, .035], [3, .035], [3, 0]].forEach(([slot, dz]) => g.add(mk(new THREE.BoxGeometry(pw - .004, PH, .026), shoji, 'shoji', [a + (slot + .5) * pw, PH / 2 + .01, Z - .02 + dz]))); });
      // the veranda along the water, 2 cm proud of the jetty, which goes on from it
      g.add(box(6.1, .04, .58, deckM, 'engawa', [0, -.02, -2.91], null, 0));
      // the door into the house: two paper doors on the front wall, a frame round each and a round pull
      const fx = F.x0 - .02, fw = .86, fh = KAMOI - .02; [0, 1].forEach(i => { const cx = fx + (i + .5) * fw, cz = 2.98 - i * .012; g.add(box(fw, fh, .03, paper, 'fusuma', [cx, fh / 2 + .01, cz]));
        [[-fw / 2 + .012, 0, .024, fh], [fw / 2 - .012, 0, .024, fh], [0, fh / 2 - .012, fw, .024], [0, -fh / 2 + .012, fw, .024]].forEach(([dx, dy, bw, bh]) => g.add(box(bw, bh, .034, sugi, 'fusuma-frame', [cx + dx, fh / 2 + .01 + dy, cz - .002])));
        g.add(cyl(.028, .028, .012, 20, M.brass, 'fusuma-pull', [fx + (i ? .14 : fw - .14) + i * fw, .92, cz - .02], [Math.PI / 2, 0, 0])); }); });
    // a hanging scroll on the left wall, by the paper doors: a line of Zen in whatever regular script the machine has
    { const W = .34, H = 1.2, cw = Math.round(W * 520), ch = Math.round(H * 520), KAI = '"Kaiti TC", "BiauKai", "DFKai-SB", "Kaiti SC", "Songti TC", serif';
      const tex = ctex(Math.round(cw * K), Math.round(ch * K), x => { x.save(); x.scale(K, K); x.fillStyle = '#7f8b7c'; x.fillRect(0, 0, cw, ch); x.fillStyle = '#b9b08f'; x.fillRect(cw * .1, ch * .13, cw * .8, ch * .7); x.fillStyle = '#efe8d6'; x.fillRect(cw * .17, ch * .17, cw * .66, ch * .62);
        x.fillStyle = '#1b1d20'; x.textAlign = 'center'; x.textBaseline = 'middle'; const fs = ch * .62 / 5.6; x.font = `600 ${fs}px ${KAI}`; [...'日々是好日'].forEach((c, i) => x.fillText(c, cw / 2, ch * .17 + fs * (.8 + i * 1.02)));
        x.fillStyle = '#c2272d'; x.fillRect(cw * .2, ch * .79 - fs * .55, fs * .38, fs * .38); x.restore(); }, false);
      const g = new THREE.Group(); g.name = 'snow-kakejiku'; g.position.set(-2.994, 1.42, 2.3); g.rotation.y = Math.PI / 2;
      const sheet = mk(new THREE.PlaneGeometry(W, H), std('snow-kakejiku', '#ffffff', { map:tex, roughness:.9 }), 'kakejiku', [0, 0, .006]); sheet.castShadow = false; g.add(sheet);
      g.add(cyl(.007, .007, W + .02, 8, dark, 'kakejiku-rod', [0, H / 2, .008], [0, 0, Math.PI / 2])); g.add(cyl(.013, .013, W + .06, 10, dark, 'kakejiku-rod', [0, -H / 2, .013], [0, 0, Math.PI / 2])); lone(room, g); }
    // contact shadows at the foot and the head of the walls, as light as the Chinese study's (the back has no wall to its foot)
    parts.push(decal(aoLin, 5.5, .55, [2.995, .28, .25], [0, -Math.PI / 2, Math.PI], .27), decal(aoLin, 6, .55, [0, .28, 2.994], [0, Math.PI, Math.PI], .27));
    parts.push(decal(aoLin, 6, .5, [0, 2.54, -2.494], [0, 0, 0], .22), decal(aoLin, 5.5, .5, [2.995, 2.54, .25], [0, -Math.PI / 2, 0], .22), decal(aoLin, 6, .5, [0, 2.54, 2.994], [0, Math.PI, 0], .22)); }

  shell();
  // the open half of the left bay, in the plane of the back wall: the duck out on the jetty answers only through it
  const [a, b] = BAYS[0], pw = (b - a) / 4;
  return { parts, sink, lamp, opening:(x, y) => y > 0 && y < PH && x > a + pw + .04 && x < a + 3 * pw - .04 };
}
```

- [ ] **Step 3: 瀏覽器檢查**

從 `snow` 開門（`localStorage` 還是 `snow`），貼上小工具。

**檢查 A：殼在（GREEN）。**

```js
({ parts:['snow-tatami', 'snow-shell', 'snow-kakejiku'].map(n => !!__dbg.scene.getObjectByName(n)), shell:__dbg.scene.getObjectByName('snow-shell').children.map(m => m.name).sort(), built:__t.built(), wall:!!__dbg.scene.getObjectByName('wall-left') })
```

Expected: `parts` 是 `[true, true, true]`；`shell` 是 `['brass', 'snow-ceiling', 'snow-engawa', 'snow-hinoki', 'snow-juraku', 'snow-paper', 'snow-shoji', 'snow-sugi']`；`built` 是 `['snow']`；`wall` 是 `false`。

**檢查 B：長相。** 等 `__dbg.controls.enabled` 是 `true`。中央視角截圖：榻榻米、土牆和柱、長押、天花的竿緣、後牆兩個開間的障子各開一半、緣側接棧橋、右邊開間看得到小島上的茅屋。
家具骨架還沒有（書、展品、筆電、電視浮在原位）是正常的。再 `__t.look([-3, 1.4, 2.3], [-1, 1.5, 1.2])` 截圖：掛軸上是「日々是好日」，旁邊是襖。console 沒有錯誤。

**檢查 C：鴨子的判定（Review Focus 5）。**

```js
(() => { const o = __dbg.WORLDS.snow.room.opening; return [o(-1.5, 1), o(-2.5, 1), o(-.4, 1), o(-1.5, 2.1), o(-1.5, -.1), o(1.4, 1)]; })()
```

Expected: `[true, false, false, false, false, false]`（推開的那一段、左邊關著的障子、右邊關著的障子、鴨居上方、地面以下、右邊開間）。
再用 `__t.hover(__dbg.scene.getObjectByName('rubber-duck'))`：回傳 `換個景色`。

**檢查 D：另外兩間沒被動到。** `localStorage.removeItem('study-scenery'); location.reload();`，門開了之後 `!!__dbg.scene.getObjectByName('snow-shell')` 是 `false`。

- [ ] **Step 4: build 與 commit**

```bash
npm run build 2>&1 | tail -2 && npm run check:nav 2>&1 | tail -1
git add src/scripts/studySnowRoom.js
git commit -m "$(cat <<'EOF'
feat(room): give the lake under snow a Japanese room to be seen from

Tatami, earthen walls between cedar posts, a ceiling of boards on battens.
The back wall is paper screens in two bays, each standing half open on a
veranda that the jetty goes on from; the door into the house is two paper
doors, and a scroll hangs by them. The duck answers through the open screens.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
git grep -c __dbg HEAD -- src/scripts
```

Expected: build 與 check:nav 通過；最後一個指令沒有輸出。

---

### Task 4: 本棚與床脇

**Files:**
- Modify: `src/scripts/studySnowRoom.js`

**Interfaces:**
- Consumes: Task 3 的 `piece`、`kiri`、`keyaki`、`sugi`、`dark`、`paper`、`juraku`；`kit` 的 `shelf, disp, LV, bays, SZ1, BZ, DL, DW, DD`。
- Produces: 場景裡的 `snow-bookcase`、`snow-alcove`。

- [ ] **Step 1: 加 `bookcase()` 和 `alcove()`**

在 `shell();` 那行之前加：

```js
  /* ================= 本棚: the bookcase ================= */
  // Boards where the western bookcase has them, between solid ends, with a thin back. Its top board stops with the books: the bay in the
  // corner is an alcove here, with a head of its own.
  function bookcase() { const { shelf, LV, bays, SZ1, BZ } = kit;
    piece(shelf, 'snow-bookcase', g => { LV.forEach(y => g.add(box(.4, .035, SZ1 - BZ, kiri, 'shelf-board', [-2.81, y, (BZ + SZ1) / 2])));
      bays.slice(1).forEach(z => g.add(box(.4, 2.58, .03, kiri, 'shelf-end', [-2.81, 1.29, z], null, 1))); g.add(box(.014, 2.5, SZ1 - BZ, sugi, 'shelf-back', [-2.99, 1.33, (BZ + SZ1) / 2], null, 1)); }); }

  /* ================= 床脇: the display shelves as an alcove ================= */
  // Laid out in the display shelves' own frame: x across the bay (the room's back wall is at +x, the bookcase at −x), z out from the wall.
  // A low cupboard with paper doors, its top the first of the four levels; a board right across for the second; then two boards set off
  // against each other and tied by a strut, the upper one with a lip at its free end. Each board is under everything that stands at its
  // level. A post of polished log on the bookcase's side, a sleeve of wall on the other, a beam across the head.
  function alcove() { const { disp, DL, DW, DD } = kit, hw = DW / 2, zc = DD / 2 - .02, d = DD - .04;
    piece(disp, 'snow-alcove', g => {
      [DL[0], DL[1]].forEach(y => g.add(box(DW, .035, DD, kiri, 'display-shelf', [0, y, DD / 2])));
      g.add(box(hw + .5, .03, d, keyaki, 'display-shelf', [(-hw + .5) / 2, DL[2] + .0025, zc])); g.add(box(hw + .36, .03, d, keyaki, 'display-shelf', [(hw - .36) / 2, DL[3] + .0025, zc]));
      g.add(box(.025, DL[3] - DL[2] - .03, .025, keyaki, 'strut', [.485, (DL[2] + DL[3]) / 2 + .0025, zc], null, 1)); g.add(box(.02, .03, d, keyaki, 'lip', [-.35, DL[3] + .0325, zc], null, 2));
      g.add(box(DW, .76, DD - .03, kiri, 'cupboard', [0, .4, (DD - .03) / 2]));
      [-1, 1].forEach(sd => { const cx = sd * DW / 4, w = DW / 2 - .03; g.add(box(w, .62, .012, paper, 'cupboard-door', [cx, .4, DD - .022]));
        [[0, .31, w, .02], [0, -.31, w, .02], [-w / 2 + .01, 0, .02, .62], [w / 2 - .01, 0, .02, .62]].forEach(([dx, dy, bw, bh]) => g.add(box(bw, bh, .018, dark, 'cupboard-frame', [cx + dx, .4 + dy, DD - .02])));
        g.add(cyl(.018, .018, .008, 16, dark, 'cupboard-pull', [cx - sd * (w / 2 - .07), .4, DD - .012], [Math.PI / 2, 0, 0])); });
      g.add(box(.04, 2.6, DD, juraku, 'sleeve', [hw + .02, 1.3, DD / 2])); g.add(cyl(.055, .055, 2.62, 18, keyaki, 'tokobashira', [-hw - .03, 1.31, DD - .05])); g.add(box(DW + .1, .07, .05, kiri, 'head', [0, 2.52, DD - .03], null, 0)); }); }
```

把 `shell();` 改成 `shell(); bookcase(); alcove();`。

- [ ] **Step 2: 瀏覽器檢查**

從 `snow` 開門，貼上小工具。

```js
({ bookcase:__dbg.scene.getObjectByName('snow-bookcase').children.map(m => m.name).sort(), alcove:__dbg.scene.getObjectByName('snow-alcove').children.map(m => m.name).sort(), west:!!__dbg.scene.getObjectByName('shelf-board') })
```

Expected: `bookcase` 是 `['snow-kiri', 'snow-sugi']`；`alcove` 是 `['snow-dark', 'snow-juraku', 'snow-keyaki', 'snow-kiri', 'snow-paper']`；`west` 是 `false`。

等 `__dbg.controls.enabled` 是 `true`。`__t.look([-2.8, 1.3, -1.8], [-.5, 1.5, -1.45])` 截圖：四層展品都站在板子上（最上兩層是錯開的違棚，束沒有穿過任何展品）；下面是貼紙門的地袋；
左邊一根圓的床柱，右邊一道袖壁。`__t.look([-2.63, 1.35, -.3], [.2, 1.4, .1])` 截圖：每本書都站在層板上，開間兩端是側板，分類銅牌在層板前緣。

每件展品都點得到：

```js
__dbg.scene.getObjectByName('display-shelves').children.filter(o => o.userData.pick && o.userData.pick.type === 'item').map(o => __t.hover(o))
```

Expected: 十個字串，沒有 `null`。

- [ ] **Step 3: commit**

```bash
npm run build 2>&1 | tail -2
git add src/scripts/studySnowRoom.js
git commit -m "$(cat <<'EOF'
feat(room): stand the books in a paulownia bookcase and the exhibits in an alcove, in the Japanese room

The bookcase keeps its boards between solid ends. The display shelves are an
alcove: a low cupboard with paper doors, a board right across, then two boards
set off against each other and tied by a strut, between a post of polished
log and a sleeve of wall.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
git grep -c __dbg HEAD -- src/scripts
```

Expected: build 通過；最後一個指令沒有輸出。

---

### Task 5: 座卓和桌上的東西，書桌那一組下沉

**Files:**
- Modify: `src/scripts/studySnowRoom.js`

**Interfaces:**
- Consumes: Task 3 的 `piece`、`DROP`、`sink`、`lamp`、`kiri`、`keyaki`、`dark`；Task 1 的 `sink.desk`／`lamp` 的套用；`kit` 的 `desk, rack, portrait, pf, DX, DY, DZ, RKW, RKD`。
- Produces: 場景裡的 `snow-table`、`snow-book-stand`、`snow-andon`、`snow-bonsai`、`snow-frame`、`snow-frame-feet`；回傳值的 `sink.desk = 0.44`、`lamp = [2.56, DY + .175, -2.33]`。

- [ ] **Step 1: 加 `table()`**

在 `shell();` 那行之前加：

```js
  /* ================= 座卓: the desk as a low table, and what stands on it that is this room's own ================= */
  // The top is the western desk's. Its group sinks until that top is a floor-sitter's height, so the legs are only as long as from the
  // top to the floor it comes down to, and everything here is set out in the group's frame as it is before it sinks.
  function table() { const { desk, rack, portrait, pf, DX, DY, DZ, RKW, RKD } = kit, top = DY - .025, leg = top - DROP.desk;
    sink.desk = DROP.desk; lamp = [2.56, DY + .175, -2.33]; // the light is in the andon's paper
    piece(desk, 'snow-table', g => { g.add(box(2.15, .05, .95, keyaki, 'desk-top', [DX, DY, DZ]));
      [-1, 1].forEach(sx => [-1, 1].forEach(sz => g.add(box(.09, leg, .09, keyaki, 'table-leg', [DX + sx * .94, DROP.desk + leg / 2, DZ + sz * .37], null, 1))));
      [-1, 1].forEach(sz => g.add(box(1.8, .05, .025, keyaki, 'table-apron', [DX, top - .035, DZ + sz * .37], null, 0))); [-1, 1].forEach(sx => g.add(box(.025, .05, .66, keyaki, 'table-apron', [DX + sx * .94, top - .035, DZ], null, 2)));
      // a cup of tea on its saucer, where the pen lay
      g.add(cyl(.055, .048, .008, 20, dark, 'saucer', [2.15, DY + .029, -1.72])); g.add(cyl(.036, .03, .07, 20, pbr('snow-cup', '#e4e0d2', { roughness:.25, clearcoat:.8 }), 'cup', [2.15, DY + .068, -1.72])); g.add(cyl(.031, .031, .002, 20, std('snow-tea', '#8a9440', { roughness:.2 }), 'tea', [2.15, DY + .1, -1.72])); });
    // the stand the series are in: the western rack's shape, in paulownia
    piece(rack, 'snow-book-stand', g => { g.add(box(RKW, .018, RKD, kiri, 'rack-base', [0, .009, 0])); g.add(box(RKW - .036, .12, .014, kiri, 'rack-back', [0, .078, -RKD / 2 + .007])); [-1, 1].forEach(sd => g.add(box(.018, .19, RKD, kiri, 'rack-end', [sd * (RKW / 2 - .009), .113, 0]))); });
    // 行灯: a box of paper in a wooden frame, standing where the lamp stood
    const glow = new THREE.MeshStandardMaterial({ name:'snow-andon-paper', color:col('#f6ead0'), emissive:col('#ffb866'), emissiveIntensity:.7, roughness:.9 });
    piece(desk, 'snow-andon', g => { g.position.set(2.56, DY + .025, -2.33); g.add(box(.14, .02, .14, dark, 'andon-base', [0, .01, 0])); g.add(box(.14, .014, .14, dark, 'andon-head', [0, .283, 0]));
      [-1, 1].forEach(sx => [-1, 1].forEach(sz => g.add(box(.012, .27, .012, dark, 'andon-post', [sx * .058, .15, sz * .058], null, 1)))); g.add(mk(new THREE.BoxGeometry(.104, .23, .104), glow, 'andon-paper', [0, .15, 0])); });
    // 盆栽: a pine in a shallow pot, where the plant stood
    piece(desk, 'snow-bonsai', g => { g.position.set(.74, DY + .025, -2.2); const bark = std('snow-bark', '#4a3628', { roughness:.9 }), needle = std('snow-needles', '#2f5a3a', { roughness:.8 });
      g.add(box(.17, .04, .11, pbr('snow-pot', '#34454f', { roughness:.3, clearcoat:.7 }), 'pot', [0, .02, 0])); g.add(box(.15, .006, .09, std('snow-soil', '#3a2a1c', { roughness:1 }), 'soil', [0, .042, 0]));
      [[[-.03, .04, 0], [.012, .12, .01], .009], [[.012, .12, .01], [-.02, .19, -.005], .0075], [[-.02, .19, -.005], [.03, .255, 0], .006]].forEach(([a0, b0, r]) => g.add(rod(a0, b0, r, bark, 'trunk')));
      [[.055, .15, .012, .055], [-.05, .215, 0, .05], [.04, .275, 0, .045]].forEach(([px, py, pz, r]) => { const m = mk(new THREE.SphereGeometry(r, 14, 10), needle, 'pad', [px, py, pz]); m.scale.set(1, .38, .8); g.add(m); }); });
    // the portrait in a plain dark frame, on two feet
    piece(pf, 'snow-frame', g => { [-.108, .108].forEach(px => g.add(box(.02, .27, .024, dark, 'frame', [px, 0, .001], null, 1))); [-.134, .134].forEach(py => g.add(box(.236, .02, .024, dark, 'frame', [0, py, .001], null, 0))); });
    piece(portrait, 'snow-frame-feet', g => { [-.09, .09].forEach(px => g.add(box(.022, .03, .1, dark, 'foot', [px, .015, -.02], null, 2))); }); }
```

把呼叫那行加上 `table();`（例如 `shell(); bookcase(); alcove(); table();`）。

- [ ] **Step 2: 瀏覽器檢查 A：建出來了，而且沉下去了**

從 `snow` 開門，貼上小工具。

```js
(() => { const { scene, THREE, WORLDS } = __dbg, desk = scene.getObjectByName('desk'); scene.updateMatrixWorld(true); let light, glow; const shadows = [];
  scene.traverse(o => { if (o.parent !== desk) return; const p = o.getWorldPosition(new THREE.Vector3()).toArray().map(v => +v.toFixed(3)); if (o.isPointLight) light = p; else if (o.isSprite) glow = p; else if (o.isMesh && !o.name) shadows.push(p[1]); });
  const legs = new THREE.Box3().setFromObject(scene.getObjectByName('snow-table'));
  return { parts:['snow-table', 'snow-book-stand', 'snow-andon', 'snow-bonsai', 'snow-frame', 'snow-frame-feet'].map(n => !!scene.getObjectByName(n)), sink:WORLDS.snow.room.sink, laptop:__t.y('laptop'), tableFoot:+legs.min.y.toFixed(3), tableTop:+legs.max.y.toFixed(3), light, glow, shadows, cushion:__t.y('seat-cushion') }; })()
```

Expected: `parts` 六個 `true`；`sink` 是 `{ desk: 0.44 }`；`laptop` 是 `0.345`；`tableFoot` 是 `0`、`tableTop` 是 `0.423`（茶杯頂端：`0.76 + 0.068 + 0.035 − 0.44`）；
`light` 和 `glow` 都是 `[2.56, 0.495, -2.33]`；`shadows` 四個 `0.346` 或 `0.347`；`cushion` 還是 `0.47`（椅子是下一個 task）。

- [ ] **Step 3: 瀏覽器檢查 B、C：鏡頭和拿東西**

等 `__dbg.controls.enabled` 是 `true`。

**檢查 B（Review Focus 3）。** `__t.look([1.675, .45, -2.0], [1.45, 1.3, -.2])` 截圖：筆電、三張稿紙、三本系列書平放在矮桌上；行燈有光暈、貼著桌面；盆栽在書立左邊；
自畫像在深色木框裡；茶杯沒有壓到稿紙。接著 `__t.click(__dbg.scene.getObjectByName('laptop'))`，等 `__dbg.controls.enabled` 回到 `true`：
面板標題（`document.querySelector('#pbody h2').textContent`）是 `GitHub 活動`，而且 `__dbg.controls.target.y` 介於 `0.3` 和 `0.6`（對準沉下去的筆電，不是 0.8 以上）。按 Esc 關掉。
再 `document.querySelector('#hud [data-zone=desk]').click()`，飛完之後 `+__dbg.controls.target.y.toFixed(2)` 是 `0.52`。

**檢查 C（Review Focus 2）。** `__t.click(__dbg.scene.getObjectByName('draft-d1'))`：`document.body.classList.contains('immerse')` 是 `true`；等稿紙飛到眼前
（`document.getElementById('reader').classList.contains('vis')` 是 `true`）。送一個 Esc：`window.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }))`，
等 `immerse` 變回 `false`，`__t.y('draft-d1')` 應該是 `0.347`（`0.76 + 0.027 − 0.44`）。對 `book-s1` 做一樣的事：放回去之後 `__t.y('book-s1')` 和拿起來之前相同。

**切走會還原（Review Focus 1 的一半）。** `__dbg.turnWorld()` 到 `lake`，門開了之後 `__t.y('laptop')` 是 `0.785`。

- [ ] **Step 4: commit**

```bash
npm run build 2>&1 | tail -2
git add src/scripts/studySnowRoom.js
git commit -m "$(cat <<'EOF'
feat(room): sit at a low table in the Japanese room

The desk's group sinks until its top is a floor-sitter's height, with the
laptop, the pages, the portrait and the books on it, and stands on four short
legs. On it the lamp is a box of paper in a frame, the plant a pine in a
shallow pot, and there is a cup of tea where the pen lay.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
git grep -c __dbg HEAD -- src/scripts
```

Expected: build 通過；最後一個指令沒有輸出。

---

### Task 6: 電視台、座椅、矮台，椅子和邊桌下沉

**Files:**
- Modify: `src/scripts/studySnowRoom.js`

**Interfaces:**
- Consumes: Task 3 的 `piece`、`DROP`、`sink`、`kiri`、`keyaki`、`dark`；`kit` 的 `tvc, chair, side, CW, CD`。
- Produces: 場景裡的 `snow-tv-stand`、`snow-zaisu`、`snow-low-stand`；回傳值的 `sink.chair = 0.375`、`sink.side = 0.32`。

- [ ] **Step 1: 加 `stand()` 和 `seats()`**

在 `shell();` 那行之前加：

```js
  /* ================= the stand under the TV ================= */
  // Two ends and three boards, the boards where the western cabinet has its top, its shelf and its bottom, and a rail across the back.
  // This one does not sink: the TV stays at the height it was.
  function stand() { const { tvc, CW, CD } = kit;
    piece(tvc, 'snow-tv-stand', g => { [-1, 1].forEach(sd => g.add(box(.022, .76, CD, kiri, 'stand-end', [sd * (CW / 2 - .011), .38, 0], null, 1)));
      g.add(box(CW + .02, .03, CD + .02, kiri, 'stand-top', [0, .775, 0])); g.add(box(CW - .05, .018, CD - .03, kiri, 'stand-shelf', [0, .4, -.01])); g.add(box(CW - .044, .025, CD, kiri, 'stand-shelf', [0, .0625, 0])); g.add(box(CW - .044, .09, .014, kiri, 'stand-rail', [0, .71, -CD / 2 + .01], null, 0)); }); }

  /* ================= 座椅子 and a low stand: the armchair and the side table ================= */
  // Both groups sink. The chair is a board on the floor with a back that leans away; the armchair's cushion is its pad, and the dog is
  // asleep on it. The side table is a top on two boards, its top where the pile of books needs it once the group is down.
  function seats() { const { chair, side } = kit; sink.chair = DROP.chair; sink.side = DROP.side;
    piece(chair, 'snow-zaisu', g => { const y0 = DROP.chair; g.add(box(.66, .04, .64, keyaki, 'zaisu-seat', [0, y0 + .02, 0]));
      g.add(box(.56, .5, .025, keyaki, 'zaisu-back', [0, y0 + .28, -.39], [-.28, 0, 0], 1)); g.add(box(.6, .035, .04, dark, 'zaisu-rail', [0, y0 + .525, -.46], [-.28, 0, 0], 0)); });
    piece(side, 'snow-low-stand', g => { const y0 = DROP.side; g.add(box(.52, .04, .52, kiri, 'stand-top', [0, .6, 0])); [-1, 1].forEach(sd => g.add(box(.035, .58 - y0, .44, kiri, 'stand-leg', [sd * .2, y0 + (.58 - y0) / 2, 0], null, 1))); }); }
```

把呼叫那行補齊成 `shell(); bookcase(); alcove(); table(); stand(); seats();`。

- [ ] **Step 2: 瀏覽器檢查 A、B**

從 `snow` 開門，貼上小工具。

**檢查 A。**

```js
(() => { const { scene, THREE, WORLDS } = __dbg; scene.updateMatrixWorld(true); const foot = n => +new THREE.Box3().setFromObject(scene.getObjectByName(n)).min.y.toFixed(3);
  return { parts:['snow-tv-stand', 'snow-zaisu', 'snow-low-stand'].map(n => !!scene.getObjectByName(n)), sink:WORLDS.snow.room.sink, cushion:__t.y('seat-cushion'), stack:__t.y('stack-book'), zaisuFoot:foot('snow-zaisu'), standFoot:foot('snow-low-stand'), tvFoot:foot('snow-tv-stand'), dog:scene.getObjectByName('dog').children.length, west:['cab-top', 'chair-frame', 'side-top'].map(n => !!scene.getObjectByName(n)) }; })()
```

Expected: `parts` 三個 `true`；`sink` 是 `{ desk: 0.44, chair: 0.375, side: 0.32 }`；`cushion` 是 `0.095`；`stack` 是 `0.32`；
`zaisuFoot`、`standFoot`、`tvFoot` 都是 `0`；`dog` 是 `1`（等它載入）；`west` 三個 `false`。

**檢查 B：長相。** 等 `__dbg.controls.enabled` 是 `true`。`__t.look([2.4, .35, -.3], [1.2, 1.25, 1.9])` 截圖：吉利睡在貼地的座椅上，靠背沒有穿過牠；旁邊的矮台上是那疊書。
`__t.look([.055, .6, -2.2], [.3, 1.2, -.5])` 截圖：電視在台面上，主機和手把在中層，卡帶在底層，線都接著。`__t.hover(__dbg.scene.getObjectByName('crt-tv'))` 是 `遊樂器`；
`__t.hover(new __dbg.THREE.Vector3(.406, .41, -2.2))`（電視台的右側板）也是 `遊樂器`。

- [ ] **Step 3: 瀏覽器檢查 C：切走與失敗（Review Focus 1）**

`__dbg.turnWorld()` 到 `lake`（第一次會重放開門）。門開了之後：

```js
(() => { let leaf; __dbg.scene.traverse(o => { if (o.isPoints && o.material.alphaTest) leaf = o.material.size; }); return { laptop:__t.y('laptop'), cushion:__t.y('seat-cushion'), stack:__t.y('stack-book'), leaf, light:+__dbg.scene.getObjectByName('desk').children.find(o => o.isPointLight).getWorldPosition(new __dbg.THREE.Vector3()).y.toFixed(3) }; })()
```

Expected: `{ laptop: 0.785, cushion: 0.47, stack: 0.64, leaf: 0.05, light: 1.26 }`。

再繞回 `snow`（`__dbg.turnWorld()` 兩次，中間等門開）。在 `snow` 裡讓下一間失敗：
`__dbg.WORLDS.lake.room = null; __dbg.WORLDS.lake.builder = async () => { throw new Error('test'); }; __dbg.turnWorld();`，門重新打開之後：
`__t.y('laptop')` 是 `0.345`、`__t.y('seat-cushion')` 是 `0.095`（還在雪見，下沉沒有被動到），toast 是 `另一間書房進不去，重新整理頁面再試一次`，
`localStorage.getItem('study-scenery')` 還是 `snow`。檢查完重新整理頁面。

- [ ] **Step 4: commit**

```bash
npm run build 2>&1 | tail -2
git add src/scripts/studySnowRoom.js
git commit -m "$(cat <<'EOF'
feat(room): put the dog on a floor chair in the Japanese room, and the TV on a paulownia stand

The chair's group and the side table's sink. The chair is a board on the
floor with a back that leans away, the armchair's cushion its pad; the side
table is a top on two boards. The TV's stand keeps its three boards where
they were.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
git grep -c __dbg HEAD -- src/scripts
```

Expected: build 通過；最後一個指令沒有輸出。

---

### Task 7: 收尾

**Files:**
- Delete: `src/scripts/wa-demo.js`（未進版控）
- Modify: `.claude/skills/sync-claude-design/build-design.mjs`、`.claude/skills/sync-claude-design/SKILL.md`、`README.md`

**Interfaces:**
- Consumes: 前面全部。Produces: 無新介面。

- [ ] **Step 1: 輕量模式**

`localStorage.setItem('study-scenery', 'snow')`，開 `http://localhost:4331/?quality=low`，貼上小工具：

```js
({ low:document.body.classList.contains('lite'), built:__t.built(), tatami:__dbg.scene.getObjectByName('snow-tatami').material.map.image.width, laptop:__t.y('laptop') })
```

Expected: `{ low: true, built: ['snow'], tatami: 512, laptop: 0.345 }`。截圖：和室完整，障子的組子和榻榻米的緣都還在。
`__dbg.turnWorld()`（到 `lake`，重放開門）：門開了之後西式書房完整、`__t.y('laptop')` 是 `0.785`。
還原：開 `http://localhost:4331/?quality=high`，然後 `localStorage.removeItem('study-quality')`。

- [ ] **Step 2: 手機寬度**

`resize_window {preset: "mobile"}`，`localStorage.setItem('study-scenery', 'snow'); location.reload();`。門開了之後截圖：底部 dock 六格都在，畫面是和室。
依序點四個角落（`document.querySelector('#hud [data-zone=shelf]').click()`，`shelf` 換成 `display`、`desk`、`tv`），每次確認那一顆有 `on` 的 class；
最後一個飛完之後截圖。把門留住（見「檢查工具」，對象是 `lake`）再 `__dbg.turnWorld()`：`document.body.classList.contains('in')` 是 `false`、畫面是那扇門；門開了之後 dock 回來。
看完 `resize_window {preset: "desktop"}`，清掉 `study-quality` 和 `study-scenery`。

- [ ] **Step 3: 和室加進場景的東西沒有暴增**

三間都建好之後：

```js
Object.fromEntries(Object.keys(__dbg.WORLDS).map(k => { let n = 0; __dbg.WORLDS[k].room.parts.forEach(p => p.traverse(o => { if (o.isMesh || o.isSprite) n++; })); return [k, n]; }))
```

Expected: `snow` 的數字不高於 `lake` 的（`lake` 約 151、`ink` 約 54）。比較高的話，列出每個 `snow-` 開頭的群組底下有幾個 mesh，找出沒共用材質的地方。

- [ ] **Step 4: 刪 demo，拿掉除錯把手**

```bash
rm src/scripts/wa-demo.js; git checkout -- src/scripts/study.js; grep -rn "wa-demo\|__dbg" src; git status --short
```

Expected: grep 沒有輸出；`git status` 只剩 `?? .claude/launch.json`。（`study.js` 在 Task 2 之後沒有該留下的改動，所以直接還原成 HEAD。）

- [ ] **Step 5: `build-design.mjs`、`SKILL.md`、`README.md`**

`.claude/skills/sync-claude-design/build-design.mjs`：
- `//   study.js, studyWestRoom.js, studyInkRoom.js, studyTextures.js, studyWorker.js  <- src/scripts/*, verbatim` 換成
  `//   study.js, studyWestRoom.js, studyInkRoom.js, studySnowRoom.js, studyTextures.js, studyWorker.js  <- src/scripts/*, verbatim`
- `const SCRIPTS = ['study.js', 'studyWestRoom.js', 'studyInkRoom.js', 'studyTextures.js', 'studyWorker.js'],` 換成
  `const SCRIPTS = ['study.js', 'studyWestRoom.js', 'studyInkRoom.js', 'studySnowRoom.js', 'studyTextures.js', 'studyWorker.js'],`
- `     study.js, studyWestRoom.js, studyInkRoom.js, studyTextures.js and studyWorker.js are the files in src/scripts/, unchanged. -->` 換成
  `     study.js, studyWestRoom.js, studyInkRoom.js, studySnowRoom.js, studyTextures.js and studyWorker.js are the files in src/scripts/, unchanged. -->`
- `[...['studyTextures.js', 'studyWestRoom.js', 'studyInkRoom.js', 'study.js', 'studyWorker.js'].filter(` 換成
  `[...['studyTextures.js', 'studyWestRoom.js', 'studyInkRoom.js', 'studySnowRoom.js', 'study.js', 'studyWorker.js'].filter(`

`.claude/skills/sync-claude-design/SKILL.md`：
- `rebuild six files from the repo` 換成 `rebuild seven files from the repo`
- `` | `study.js`, `studyWestRoom.js`, `studyInkRoom.js`, `studyTextures.js`, `studyWorker.js` | `` 換成
  `` | `study.js`, `studyWestRoom.js`, `studyInkRoom.js`, `studySnowRoom.js`, `studyTextures.js`, `studyWorker.js` | ``
- `upload all six files` 換成 `upload all seven files`

`README.md`：在

```
│   ├── studyInkRoom.js   # 配水墨山水的中式書齋，第一次點橡皮鴨切過去時才載入
```

之後加一行

```
│   ├── studySnowRoom.js  # 配雪景的和室（坐在榻榻米上），輪到它時才載入
```

- [ ] **Step 6: 建置後的網站、build、commit**

```bash
npm run build 2>&1 | tail -2 && npm run check:nav 2>&1 | tail -1; ls dist/_astro | grep -i -E "inkroom|snowroom"; grep -c "studySnowRoom" dist/index.html
```

Expected: 通過；兩個房間的 chunk 都在；`dist/index.html` 裡 0 次。

`preview_start {name: "astro-preview"}`（`http://localhost:4322/`）：全新訪客開門是湖景。建置後的網站沒有除錯把手，鴨子要真的點：鏡頭走到中央之後，牠在畫面寬 37%、高 65% 附近
（800 × 646 的截圖上約是 (297, 421)）；先 hover，`document.getElementById('tip').textContent` 是 `換個景色` 再點。點三次，每次等門開，`localStorage.getItem('study-scenery')` 依序是
`ink`、`snow`、`lake`；停在 `snow` 重新整理直接是和室；console 沒有錯誤。看完 `preview_stop`，清掉 `study-scenery`。

```bash
git add README.md .claude/skills/sync-claude-design/build-design.mjs .claude/skills/sync-claude-design/SKILL.md
git commit -m "$(cat <<'EOF'
chore: carry the Japanese room's script to Claude Design, and list it in the README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
git status --short
```

Expected: 只剩 `?? .claude/launch.json`。（真的同步到 Claude Design 不在這份計畫裡，等使用者說「同步回 claude design」。）
