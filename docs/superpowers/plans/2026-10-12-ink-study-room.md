# 水墨山水的中式書齋 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 橡皮鴨切到水墨山水時，房間也換成中式書齋（白粉牆、月洞門、冰裂紋檻窗、明式家具）；開頁只建看得到的那一間，第一次切到另一間時回到門前重放開門動畫。

**Architecture:** `src/scripts/study.js` 留下舞台和兩間共用的東西；西式書房專屬的建構程式原封不動搬進 `src/scripts/studyWestRoom.js`，中式書齋寫在
`src/scripts/studyInkRoom.js`。兩個模組介面相同：`build(kit) → { parts, opening }`，家具骨架掛在展品所在的父群組上，所以展品不動。`study.js` 的
`WORLDS` 把「窗外的畫」和「房間」綁成一個世界，`prepare` 要用才建、`show` 對調兩邊 `parts` 的 `visible`；大張貼圖改成只畫被要走的那幾張。

**Tech Stack:** Astro 5（靜態輸出）、three.js 0.184、Vite 的 dynamic import（中式書齋自己一個 chunk）、Canvas 2D 程序化貼圖。

**Spec:** `docs/superpowers/specs/2026-10-12-ink-study-room-design.md`

## Global Constraints

- 西式書房和秋天湖景的外觀不變。唯一允許的差別：木頭零件上木紋的取樣位置（`box()` 用一條共用的亂數序列替每個零件挑貼圖位移，建構順序一變位移就變；肉眼是同一間房間）。
- 支撐面不動：中式家具的層板、桌面、櫃面高度和位置跟西式完全相同。不搬動任何能點的東西，也不動吉利、坐墊、書堆。
- 世界只有兩個：`lake`（秋天湖景＋西式書房，預設）、`ink`（水墨山水＋中式書齋）。`localStorage` 的 key 是 `study-scenery`，值是 `ink` 才算水墨，其餘都是湖景。
- 開頁只建當下那個世界的房間。第一次切到還沒建的世界：回到關著的門，建好再重放開門。兩間都建過之後切換是瞬間的；建過的房間不釋放。
- 顏色：白粉牆 `#ece7da`、樑柱 `#2c1b14`、家具紫檀 `#45251a`、較深的 `#2e1812`、石 `#70767a`、青磚 `#4e5559`、望板 `#a89c86`、紙 `#ece4cf`、裱邊 `#d8ceb4`、墨 `#1b1d20`、印 `#c2272d`。
- 月洞門：圓心 (−1.45, 0.92)、半徑 1.05。檻窗開口等於 `WIN`（x 0.05–2.65、y 1.0–2.5）。
- 文案：切換失敗的 toast 是 `另一間書房暫時進不去，等一下再試`；立軸寫 `學而時習之`、`不亦說乎`；鴨子的提示維持 `換個景色`。
- 中式書齋不改兩間共用的材質（`M.wood`、`M.woodD`、`M.woodL`…）的顏色，用自己的材質。
- 開工前先把 spec 和這份計畫各 commit 一次（`docs: design a Chinese study for the ink landscape`、`docs: plan the Chinese study`）。
- 每個 task 完成時 commit 到 `master`，訊息照 repo 的 `feat(room): …` 風格，結尾加 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。**不要 push**，等使用者要求。
- 暫時加的 `window.__dbg` 不能進 commit：每個 task commit 前 `grep -n "__dbg" src/scripts/*.js` 必須沒有輸出。
- 指令都在 repo 根目錄執行。這個 repo 沒有測試框架：每個 task 的「測試」是下面「檢查工具」裡的瀏覽器檢查，加上 `npm run build` 成功（會向 Notion 抓資料，需要 `.env`）。

## Review Focus

spec 沒寫、但最容易咬到人的五種情況，各自釘在負責的 task 上：

1. **門還沒開完就再點一次鴨子（或連點兩下）**：只能切換一次，不能疊出兩次建構或兩扇門。→ Task 2 Step 8 的檢查 B。
2. **面板開著、或鏡頭停在某個角落時點鴨子**：門關上前面板要收起；門再打開時鏡頭從入口走進來，dock 上沒有殘留亮著的角落。→ Task 2 Step 8 的檢查 B。
3. **鴨子在月洞門邊緣的點擊判定**：視線穿過白牆（門洞上方、圓弧外側的牆腳）不能點到鴨子，穿過門洞才行。→ Task 3 Step 3 的檢查 C。
4. **輕量模式從水墨開門、再切回湖景**：半尺寸的貼圖照樣畫得出來，門照樣重放，西式書房完整。→ Task 8 Step 1。
5. **手機寬度下重放開門**：底部 dock 要跟著門一起退場、再一顆一顆回來；門後的中式書齋四個角落都飛得到。→ Task 8 Step 2。

## 檔案與責任

| 檔案 | 動作 | 責任 | Task |
|---|---|---|---|
| `src/scripts/studyTextures.js` | 改 | `paintSheets(low, keys)`：只畫指定的大張貼圖 | 1 |
| `src/scripts/studyWorker.js` | 改 | 把 `keys` 傳給 `paintSheets` | 1 |
| `src/scripts/studyWestRoom.js` | 新增 | 西式書房專屬的殼、家具骨架、檯燈、盆栽、牆上的接觸陰影（從 `study.js` 搬來） | 1 |
| `src/scripts/study.js` | 改 | 舞台、共用物件、`kit`、`WORLDS`、開門與重放 | 1、2 |
| `src/pages/index.astro` | 改 | 門的 CSS 多兩個狀態（`snap`、`again`），讓它可以重放 | 2 |
| `src/scripts/studyInkRoom.js` | 新增 | 中式書齋 | 2–7 |
| `.claude/skills/sync-claude-design/build-design.mjs`、`SKILL.md` | 改 | 同步到 Claude Design 的腳本從三個變五個 | 8 |
| `README.md` | 改 | `src/scripts/` 檔案樹多兩行 | 8 |
| `src/scripts/inkroom-demo.js` | 刪 | 定案用的 demo（未進版控） | 8 |

**順序：** 1 → 2 → 3，之後 4–7 可以任意順序，8 最後。

## 檢查工具

每個 task 的檢查都用這幾樣，這裡定義一次。

**開房間。** `preview_start {name: "astro-dev-alt"}`，開 `http://localhost:4331/`（改檔案後一兩秒內 `navigate` 可能失敗，等兩秒重送）。
分頁被藏起來時畫面不會動，先 `tabs_select`。門開了的判準：`document.getElementById('intro').classList.contains('off')` 是 `true`。

**除錯把手。** 在 `src/scripts/study.js` 最後加一行（Task 1 用第一種，Task 2 起用第二種），**commit 前刪掉**：

```js
window.__dbg = { THREE, scene, camera, renderer };
window.__dbg = { THREE, scene, camera, renderer, WORLDS, turnWorld };
```

**物件清單。** 場景裡每個看得到的 mesh、sprite、points 各一行（種類、名字、材質、頂點數、是否投影、世界座標），排序後回傳：

```js
window.__manifest = () => { const { scene, THREE } = __dbg, seen = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; }, out = [];
  scene.updateMatrixWorld(true);
  scene.traverse(o => { if (!(o.isMesh || o.isSprite || o.isPoints) || !seen(o)) return; const p = o.getWorldPosition(new THREE.Vector3());
    out.push([o.type, o.name, [].concat(o.material).map(m => m.name || m.type).join('+'), o.geometry.attributes.position.count, +o.castShadow, ...p.toArray().map(v => v.toFixed(3))].join('|')); });
  return out.sort(); };
```

**指定世界開門。** `localStorage.setItem('study-scenery', 'ink')`（或 `removeItem`）之後 `location.reload()`。

**切換世界。** 鴨子在畫面上只有幾個像素，檢查時直接呼叫 `__dbg.turnWorld()`；每個會改到點擊判定的 task 另外真的點一次鴨子。

**看角落。** `document.querySelector('#hud [data-zone=shelf]').click()`，`shelf` 可換成 `display`、`desk`、`tv`；飛到定位約 1.2 秒，等 2 秒再截圖。
圈椅和方几在右前方，一般寬度看不到：`resize_window {width: 1440, height: 820}` 之後從回中心的視角看，看完 `resize_window {preset: "desktop"}`。

---

### Task 1: 把西式書房搬出 `study.js`

純搬家：做完之後畫面和現在一樣，但西式書房是由 `buildWestRoom(kit)` 建出來的，大張貼圖也只畫被要走的那幾張。

**Files:**
- Modify: `src/scripts/studyTextures.js`（`paintSheets`，約 L451–L458）
- Modify: `src/scripts/studyWorker.js`
- Create: `src/scripts/studyWestRoom.js`
- Modify: `src/scripts/study.js`

**Interfaces:**
- Produces: `paintSheets(low, keys = 全部)`；`buildWestRoom(kit) → { parts: Object3D[], opening(x, y): boolean }`；`study.js` 模組層的 `kit`（欄位見 Step 5 的 E16）、`paintClaimed(): Promise<void>`、`halo()` 會回傳它建的 sprite。
- 後面的 task 依賴：`kit` 的欄位名稱、`parts`／`opening` 這兩個屬性名。

- [ ] **Step 1: 拿掉 demo 的 hook，讓 `study.js` 回到 HEAD**

`git diff src/scripts/study.js` 應該只有結尾多出的一行 `if (new URLSearchParams(location.search).has('inkroom')) import('./inkroom-demo.js')…`。確認之後：

```bash
git checkout -- src/scripts/study.js && git status --short src
```

Expected: 只剩 `?? src/scripts/inkroom-demo.js`（demo 檔留著當形狀的參考，Task 8 才刪；從這一步起 `?inkroom` 不再有作用）。

- [ ] **Step 2: 記下搬家前的物件清單**

在 `study.js` 最後加 `window.__dbg = { THREE, scene, camera, renderer };`。開 `http://localhost:4331/`，先讓它從湖景開門：

```js
localStorage.removeItem('study-scenery'); location.reload();
```

門開了、而且吉利載入之後（`__dbg.scene.getObjectByName('dog').children.length` 是 1）執行「檢查工具」的 `__manifest` 定義，接著：

```js
(() => { const m = __manifest(); localStorage.setItem('manifest-before', JSON.stringify(m)); return m.length; })()
```

Expected: 回傳一個數字（幾百）。記下來。

- [ ] **Step 3: `paintSheets` 只畫被指定的幾張**

`src/scripts/studyTextures.js`，把

```js
// The sheets the room's materials are built on, at full size or, for the low tier, half. Worth a worker: together they are most of the
// time it takes to open the room.
export function paintSheets(low) {
  const s = low ? 1 : 0;
  return { wood:woodGrain({ size:[1024, 512][s] }), plaster:plaster({ size:[1024, 512][s] }), fabric:weave({ size:[512, 256][s] }),
    metal:brushedMetal(), plastic:agedPlastic(), floor:plankFloor({ size:[1536, 768][s] }) };
}
```

換成

```js
// The sheets the rooms' materials are built on, at full size or, for the low tier, half: all of them, or only those named. Worth a worker:
// together they are most of the time it takes to open a room.
const SHEETS = {
  wood:s => woodGrain({ size:[1024, 512][s] }), plaster:s => plaster({ size:[1024, 512][s] }), fabric:s => weave({ size:[512, 256][s] }),
  metal:() => brushedMetal(), plastic:() => agedPlastic(), floor:s => plankFloor({ size:[1536, 768][s] }),
};
export function paintSheets(low, keys = Object.keys(SHEETS)) {
  const s = low ? 1 : 0, out = {};
  for (const k of keys) out[k] = SHEETS[k](s);
  return out;
}
```

`src/scripts/studyWorker.js` 整個檔案換成

```js
import { paintSheets } from './studyTextures.js';

// Paints the rooms' big procedural sheets off the main thread. One message in ({ low, keys }), one message out: each sheet asked for, its
// canvases as ImageBitmaps, transferred rather than copied, ready to drop into the textures study.js has already built its materials on.
self.onmessage = ({ data }) => {
  const sets = paintSheets(data.low, data.keys), out = {}, transfer = [];
  for (const k in sets) { out[k] = {}; for (const ch in sets[k]) { const b = sets[k][ch].transferToImageBitmap(); out[k][ch] = b; transfer.push(b); } }
  self.postMessage(out, transfer);
};
```

- [ ] **Step 4: 建 `src/scripts/studyWestRoom.js`**

內容全部是 `study.js` 現有的程式，只做三種改寫：`room.add(x)`／`shelf.add(x)`… 換成 `put(room, x)`…（同時記進 `parts`）；`M.wall`、`M.wallL`、`M.ceil`、`M.glass`
換成這個檔案自己的 `wall`、`wallL`、`ceil`、`glassM`；`decal()`、`halo()` 的回傳值收進 `parts`。數字一個都不改。

```js
// The western study that goes with the lake in autumn: plastered walls, a plank floor, a mullioned window, and the frames of its furniture
// (the bookcase, the display shelves and their cupboard, the desk, the TV stand, the armchair, the side table). It is built the first time
// that world is wanted (study.js, WORLDS). What rests on the furniture (the books, the exhibits, the laptop, the TV, the dog on its cushion)
// belongs to neither room and stays in study.js; each frame is hung on the group its contents are in, so the two share coordinates.
export default function buildWestRoom(kit) {
  const { THREE, renderer, C, M, col, rng, cnv, texOf, ctex, mk, box, cyl, rod, std, pbr, lite, sheet, roomUV, weld, mergeGeometries, rboxGeo, plasterTex, grit, decal, aoLin, halo, dispAt } = kit;
  const { room, shelf, disp, desk, rack, tvc, chair, side, portrait, pf } = kit;
  const { LV, bays, SZ0, SZ1, BZ, DL, DW, DD, DX, DY, DZ, CW, CH, CD, RKW, RKD, WIN, WZ, DOOR, DCX, FDOOR } = kit;
  const parts = [], put = (parent, o) => { parent.add(o); parts.push(o); return o; };
  // the plaster's colour, laid over the relief that every room's walls share
  const plasterMap = sheet('plaster', 'color', [.4, .4]);
  const wall = std('wall', '#544739', { ...plasterTex, map:plasterMap, roughness:1 }), wallL = std('wall-light', '#665645', { ...plasterTex, map:plasterMap, roughness:1 });
  const ceil = std('ceiling', '#7d6f5e', { ...plasterTex, roughness:1 }); // painted flat: the walls' mottling would be most of a phone's screen
  const glassM = new THREE.MeshPhysicalMaterial(lite({ name:'glass', color:col('#c8d8d4'), transparent:true, opacity:.14, roughness:.04, metalness:0, depthWrite:false, clearcoat:1 }));

  /* ================= room shell ================= */
  // one 3 m tile of 12.5 cm boards, laid twice each way
  const [floorMap, floorNormal, floorRough] = ['color', 'normal', 'rough'].map(ch => { const t = sheet('floor', ch, [2, 2]); t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; });
  // the boards stop at the outer face of the back wall, where the deck takes over; the tile keeps its scale
  const floorGeo = new THREE.PlaneGeometry(6, 5.6); for (let i = 0, uv = floorGeo.attributes.uv; i < uv.count; i++) uv.setY(i, uv.getY(i) * 5.6 / 6);
  put(room, mk(floorGeo, new THREE.MeshPhysicalMaterial(lite({ name:'floor', map:floorMap, normalMap:floorNormal, normalScale:new THREE.Vector2(.7, .7), roughnessMap:floorRough, roughness:1, clearcoat:.25, clearcoatRoughness:.35 })), 'floor', [0,0,.2], [-Math.PI/2,0,0]));
  put(room, roomUV(box(.1, 2.8, 6, wall, 'wall-left', [-3.05,1.4,0])));
  put(room, roomUV(box(.1, 2.8, 6, wall, 'wall-right', [3.05,1.4,0])));
  // back wall with the door and window openings
  put(room, roomUV(box(DOOR.x0 + 3.05, 2.8, .1, wall, 'wall-back', [(DOOR.x0 - 3.05)/2,1.4,-2.55])));
  put(room, roomUV(box(.05 - DOOR.x1, 2.8, .1, wall, 'wall-back', [(DOOR.x1 + .05)/2,1.4,-2.55])));
  put(room, roomUV(box(DOOR.x1 - DOOR.x0, 2.8 - DOOR.y1, .1, wall, 'wall-back', [(DOOR.x0 + DOOR.x1)/2,(2.8 + DOOR.y1)/2,-2.55])));
  put(room, roomUV(box(.4, 2.8, .1, wall, 'wall-back', [2.85,1.4,-2.55])));
  put(room, roomUV(box(2.6, 1.0, .1, wall, 'wall-back', [1.35,.5,-2.55])));
  put(room, roomUV(box(2.6, .3, .1, wall, 'wall-back', [1.35,2.65,-2.55])));
  // the front wall, behind the eye: whole, the door into the house only laid on it (it stays shut, so there is nothing to see through it)
  put(room, roomUV(box(6.2, 2.8, .1, wall, 'wall-front', [0,1.4,3.05])));
  put(room, roomUV(box(6.2, .1, 5.7, ceil, 'ceiling', [0,2.85,.15])));
  // crown + skirting
  [[-3,0,'x'],[3,0,'x']].forEach(([x]) => { put(room, box(.08, .12, 6, M.cream, 'crown', [x*.985,2.74,0])); put(room, box(.05, .14, 6, M.woodD, 'skirting', [x*.99,.07,0])); });
  [-2.48, 2.98].forEach(z => put(room, box(6, .12, .08, M.cream, 'crown', [0,2.74,z])));
  [[-3, DOOR.x0 - .04], [DOOR.x1 + .04, 3]].forEach(([a, b]) => put(room, box(b - a, .14, .05, M.woodD, 'skirting', [(a + b)/2,.07,-2.48])));
  [[-3, FDOOR.x0 - .04], [FDOOR.x1 + .04, 3]].forEach(([a, b]) => put(room, box(b - a, .14, .05, M.woodD, 'skirting', [(a + b)/2,.07,2.98])));

  /* ================= bookshelf (left wall): its carcass ================= */
  put(shelf, box(.4, 2.72, SZ1 - BZ + .03, M.woodD, 'shelf-carcass-back', [-2.98,1.36,(BZ+SZ1)/2]));
  bays.forEach(z => put(shelf, box(.4, 2.72, .05, M.wood, 'shelf-divider', [-2.81,1.36,z])));
  LV.forEach((y, i) => { const z0 = i === LV.length - 1 ? SZ0 : BZ; put(shelf, box(.4, .035, SZ1 - z0, M.wood, 'shelf-board', [-2.81,y,(z0+SZ1)/2])); }); // only the top board runs the whole length
  put(shelf, box(.42, .18, SZ1 - SZ0 + .05, M.wood, 'shelf-cornice', [-2.8,2.68,(SZ0+SZ1)/2]));
  LV.slice(1).forEach(y => { const s = mk(new THREE.BoxGeometry(.02, .01, SZ1 - BZ), new THREE.MeshBasicMaterial({ name:'led', color:col('#b98450') }), 'led-strip', [-2.63, y - .025, (BZ+SZ1)/2]); s.castShadow = false; put(shelf, s); });

  /* ================= display shelves: back, boards, cupboard, downlights ================= */
  put(disp, roomUV(box(DW, 1.75, .02, wallL, 'display-back', [0, 1.675, .01])));
  DL.forEach(y => put(disp, box(DW, .035, DD, M.woodL, 'display-shelf', [0, y, DD/2])));
  const cabinet = new THREE.Group(); cabinet.name = 'cabinet'; put(disp, cabinet);
  cabinet.add(box(DW, .78, DD + .01, M.wood, 'display-cabinet', [0, .39, (DD + .01)/2]));
  [-.315, .315].forEach(x => cabinet.add(box(.6, .64, .012, M.woodD, 'cabinet-door', [x, .41, DD + .016], null, 1)));
  [-.06, .06].forEach(x => cabinet.add(cyl(.012, .012, .05, 8, M.brass, 'knob', [x, .46, DD + .03], [Math.PI/2,0,0])));
  [-.3, .3].forEach(x => { const s = mk(new THREE.CircleGeometry(.03, 16), new THREE.MeshBasicMaterial({ color:col('#ffe2b0') }), 'downlight', [x, 2.531, .2], [Math.PI/2,0,0]); put(disp, s); });
  [-.3, .3].forEach(x => parts.push(halo(dispAt(x, 2.48, .2), .16, .18)));

  /* ================= game cabinet ================= */
  // a seventies TV stand: a paler teak with a tighter grain and a brighter lacquer than the rest of the room, hardboard at the back
  const teak = pbr('teak', '#c48c58', { map:sheet('wood', 'color', [.8, 1.6]), normalMap:sheet('wood', 'normal', [.8, 1.6]), roughnessMap:sheet('wood', 'rough', [.8, 1.6]), normalScale:new THREE.Vector2(.35, .35), roughness:.45, clearcoat:.6, clearcoatRoughness:.18 });
  const hardboard = std('hardboard', '#3b2b1f', { normalMap:grit, roughness:.92 });
  [-1, 1].forEach(sx => put(tvc, box(.025, CH - .05, CD, teak, 'cab-side', [sx*(CW/2 - .0125), .05 + (CH - .05)/2, 0])));
  put(tvc, box(CW + .02, .03, CD + .02, teak, 'cab-top', [0, CH - .015 + .02, 0]));
  put(tvc, box(CW, .025, CD, teak, 'cab-bottom', [0, .0625, 0]));
  put(tvc, box(CW - .05, .018, CD - .03, teak, 'cab-shelf', [0, .4, -.01]));
  put(tvc, box(CW, CH - .05, .012, hardboard, 'cab-back', [0, .05 + (CH - .05)/2, -CD/2 + .006]));
  put(tvc, box(CW, .04, .02, teak, 'cab-plinth', [0, .03, CD/2 - .02]));
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a, b]) => put(tvc, cyl(.012, .009, .05, 10, teak, 'cab-foot', [a*(CW/2 - .04), .025, b*(CD/2 - .04)])));

  /* ================= window ================= */
  const wf = new THREE.Group(); wf.name = 'window'; put(room, wf);
  wf.add(box(WIN.x1 - WIN.x0 + .1, .08, .14, M.woodD, 'window-frame', [1.35, WIN.y1 + .02, WZ]));
  wf.add(box(WIN.x1 - WIN.x0 + .1, .08, .14, M.woodD, 'window-frame', [1.35, WIN.y0, WZ]));
  [WIN.x0, WIN.x1].forEach(x => wf.add(box(.08, WIN.y1 - WIN.y0, .14, M.woodD, 'window-frame', [x, (WIN.y0+WIN.y1)/2, WZ])));
  [.917, 1.783].forEach(x => wf.add(box(.05, WIN.y1 - WIN.y0, .08, M.woodD, 'mullion', [x, (WIN.y0+WIN.y1)/2, WZ])));
  [1.55, 2.08].forEach(y => wf.add(box(WIN.x1 - WIN.x0, .045, .08, M.woodD, 'transom', [1.35, y, WZ])));
  const glass = mk(new THREE.PlaneGeometry(WIN.x1 - WIN.x0, WIN.y1 - WIN.y0), glassM, 'glass', [1.35, (WIN.y0+WIN.y1)/2, WZ - .02]); glass.castShadow = false; wf.add(glass);
  wf.add(box(WIN.x1 - WIN.x0 + .4, .04, .1, M.cream, 'sill', [1.35, WIN.y0 - .02, -2.5]));
  [WIN.x0 - .1, WIN.x1 + .1].forEach(x => wf.add(roomUV(box(.12, WIN.y1 - WIN.y0 + .3, .12, wallL, 'reveal', [x, (WIN.y0+WIN.y1)/2, -2.5]))));

  /* ================= door ================= */
  // an open doorway in the back wall: a frame and a threshold, no leaf
  const df = new THREE.Group(); df.name = 'door'; put(room, df);
  [DOOR.x0, DOOR.x1].forEach(x => df.add(box(.08, DOOR.y1, .14, M.woodD, 'door-frame', [x, DOOR.y1/2, WZ])));
  df.add(box(DOOR.x1 - DOOR.x0 + .16, .08, .14, M.woodD, 'door-frame', [DCX, DOOR.y1 + .02, WZ]));
  df.add(box(DOOR.x1 - DOOR.x0 + .08, .03, .2, M.woodD, 'threshold', [DCX, .008, WZ - .01]));

  /* ================= the front corner: the door into the house, and two paintings ================= */
  // The front wall is only ever seen from the bookshelf's side of the room, and then only its corner end: the door is there, and the
  // paintings hang on the stretch of the left wall between that corner and the bookshelf. No sun reaches either wall, so none of it throws
  // a shadow, and it is drawn as one mesh per material.
  const fw = new THREE.Group(); fw.name = 'front-corner'; put(room, fw);
  const FZ = 3, FCX = (FDOOR.x0 + FDOOR.x1)/2, FW = FDOOR.x1 - FDOOR.x0;
  [FDOOR.x0, FDOOR.x1].forEach(x => fw.add(box(.08, FDOOR.y1, .1, M.woodD, 'door-casing', [x, FDOOR.y1/2, FZ - .01])));
  fw.add(box(FW + .16, .08, .1, M.woodD, 'door-casing', [FCX, FDOOR.y1 + .02, FZ - .01]));
  fw.add(box(FW, FDOOR.y1, .04, M.wood, 'door-leaf', [FCX, FDOOR.y1/2, FZ - .02], null, 1));
  [[1.5, .8], [.55, .7]].forEach(([y, h]) => fw.add(box(FW - .2, h, .014, M.wood, 'door-panel', [FCX, y, FZ - .047], null, 1)));
  // the knob on the side away from the hinges, which are by the corner
  fw.add(cyl(.028, .028, .012, 16, M.brass, 'door-rose', [FDOOR.x1 - .08, .98, FZ - .046], [Math.PI/2,0,0]));
  fw.add(cyl(.01, .01, .03, 8, M.brass, 'door-knob', [FDOOR.x1 - .08, .98, FZ - .065], [Math.PI/2,0,0]));
  fw.add(mk(new THREE.SphereGeometry(.026, 16, 12), M.brass, 'door-knob', [FDOOR.x1 - .08, .98, FZ - .09]));
  // a painting is a canvas of its own at 4 px a centimetre, in a frame standing just off the left wall
  const painting = (w, h, z, y, frame, draw) => { fw.add(box(.03, h + .07, w + .07, frame, 'picture-frame', [-2.985, y, z]));
    fw.add(mk(new THREE.PlaneGeometry(w, h), std('painting', '#fff', { map:ctex(Math.round(w*400), Math.round(h*400), draw, false), roughness:.85 }), 'painting', [-2.969, y, z], [0, Math.PI/2, 0])); };
  // hills going blue towards a low sun, in a gilt frame
  painting(.62, .44, 2.5, 1.55, M.brass, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h*.7); g.addColorStop(0, '#34506a'); g.addColorStop(.6, '#b98a73'); g.addColorStop(1, '#e8b47a'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = '#f6dfae'; x.beginPath(); x.arc(w*.68, h*.5, h*.08, 0, Math.PI*2); x.fill();
    [['#7b8a78', .52, .07, 1.7], ['#55665a', .64, .06, 2.9], ['#33423a', .78, .05, 4.3]].forEach(([c, b, a, f]) => { x.fillStyle = c; x.beginPath(); x.moveTo(0, h);
      for (let i = 0; i <= 40; i++) { const u = i/40; x.lineTo(u*w, h*(b - a*Math.sin(u*f + b*9) - a*.5*Math.sin(u*f*2.3))); } x.lineTo(w, h); x.fill(); });
    const r = rng(7); x.globalAlpha = .06; for (let i = 0; i < 300; i++) { x.fillStyle = r() < .5 ? '#fff' : '#000'; x.fillRect(r()*w, r()*h, 2 + r()*6, 1); } x.globalAlpha = 1; });
  // two soft fields of colour, one over the other, in dark wood
  painting(.28, .36, 1.92, 1.5, M.woodD, (x, w, h) => { x.fillStyle = '#3b2420'; x.fillRect(0, 0, w, h);
    [['#b0442e', .07, .48], ['#d79a3e', .6, .32]].forEach(([c, y0, hh]) => { x.fillStyle = c; x.globalAlpha = .35; for (let k = 0; k < 4; k++) x.fillRect(w*.1 + k*1.5, h*y0 + k*1.5, w*.8 - k*3, h*hh - k*3); });
    x.globalAlpha = 1; });
  weld(fw).traverse(o => { o.castShadow = false; });

  /* ================= desk: its frame, and what stands on it that is this room's own ================= */
  put(desk, box(2.15, .05, .95, M.wood, 'desk-top', [DX, DY, DZ]));
  put(desk, box(2.05, .14, .05, M.woodD, 'desk-apron', [DX, DY - .1, DZ + .44]));
  [[.7,-2.42],[2.64,-2.42],[.7,-1.58],[2.64,-1.58]].forEach(([x,z]) => put(desk, box(.06, DY - .025, .06, M.woodD, 'desk-leg', [x, (DY - .025)/2, z])));
  put(desk, box(1.94, .03, .04, M.woodD, 'stretcher', [DX, .15, -2.4]));
  put(desk, box(.6, .1, .01, M.woodL, 'drawer', [DX, DY - .1, DZ + .468])); put(desk, cyl(.012, .012, .03, 8, M.brass, 'drawer-pull', [DX, DY - .1, DZ + .48], [Math.PI/2,0,0]));
  // the rack the series stand in
  put(rack, box(RKW, .018, RKD, M.woodL, 'rack-base', [0, .009, 0])); put(rack, box(RKW - .036, .12, .014, M.woodL, 'rack-back', [0, .078, -RKD/2 + .007]));
  [-1, 1].forEach(s => put(rack, box(.018, .19, RKD, M.woodL, 'rack-end', [s * (RKW/2 - .009), .113, 0])));
  // a snake plant at the rack's left end: a glazed pot on its saucer, and a rosette of blades, the inner ones tallest
  const plant = new THREE.Group(); plant.name = 'potted-plant'; plant.position.set(.74, DY + .025, -2.2); put(desk, plant);
  const potM = pbr('pot', C.cream, { roughness:.4, clearcoat:.8, clearcoatRoughness:.15 });
  plant.add(cyl(.06, .05, .012, 32, potM, 'saucer', [0,.006,0])); plant.add(cyl(.058, .042, .1, 32, potM, 'pot', [0,.062,0]));
  plant.add(mk(new THREE.TorusGeometry(.057, .006, 10, 32), potM, 'pot-rim', [0,.112,0], [Math.PI/2,0,0]));
  plant.add(cyl(.054, .054, .004, 24, std('soil', '#2a1d14', { roughness:1 }), 'soil', [0,.106,0]));
  // each blade is a strip pinched to a point, creased down its middle and bowed away from the heart of the plant; banded across, with a pale margin
  const bladeTex = texOf(cnv(32, 128, (x, w, h) => { const R = rng(7); x.fillStyle = '#2c5733'; x.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3 + R()*6) { x.fillStyle = 'rgba(132,170,112,' + (.25 + R()*.4) + ')'; x.fillRect(0, y, w, 1 + R()*3); }
    x.fillStyle = '#c9b65a'; x.fillRect(0, 0, 4, h); x.fillRect(w - 4, 0, 4, h); }));
  const bladeR = rng(31), blades = [];
  for (let i = 0; i < 11; i++) {
    const inner = i < 4, H = inner ? .26 + bladeR()*.08 : .15 + bladeR()*.1, W = .046 + bladeR()*.014, a = i*2.4 + bladeR()*.5, bow = inner ? .05 + bladeR()*.08 : .18 + bladeR()*.16, tw = (bladeR() - .5)*.9;
    const g = new THREE.PlaneGeometry(1, 1, 2, 8), p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const u = p.getX(k), v = p.getY(k) + .5, w = W * Math.min(1, .55 + v*1.5) * Math.pow(1 - Math.pow(v, 2.2), .8), c = Math.cos(tw*v), s = Math.sin(tw*v), z = -Math.abs(u)*w*.5;
      p.setXYZ(k, u*w*c + z*s, v*H, z*c - u*w*s + bow*Math.pow(v, 1.6)*H); }
    g.computeVertexNormals(); g.rotateY(a); const r = inner ? .008 : .024 + bladeR()*.01; g.translate(Math.sin(a)*r, .106, Math.cos(a)*r); blades.push(g);
  }
  plant.add(mk(mergeGeometries(blades), std('blade', '#fff', { map:bladeTex, roughness:.55, side:THREE.DoubleSide }), 'blades'));
  put(desk, rod([2.26, DY + .033, -1.74], [2.42, DY + .033, -1.8], .006, M.ink, 'pen'));
  // right lamp
  const lampR = new THREE.Group(); lampR.name = 'side-lamp'; lampR.position.set(2.56, DY + .025, -2.33); put(desk, lampR);
  lampR.add(cyl(.07, .08, .025, 32, M.brass, 'lamp-base', [0,.012,0])); lampR.add(rod([0,.02,0], [0,.5,0], .009, M.brass, 'lamp-stem'));
  // the arm runs right to the apex of the shade, which hangs from a brass cap there
  lampR.add(rod([0,.5,0], [-.16,.572,.06], .008, M.brass, 'lamp-gooseneck')); lampR.add(cyl(.012, .02, .022, 24, M.brass, 'lamp-cap', [-.16,.562,.06]));
  const pleats = texOf(cnv(256, 8, (x, w, h) => { for (let i = 0; i < 32; i++) { const g = x.createLinearGradient(i*8, 0, i*8 + 8, 0); g.addColorStop(0, '#8f8f8f'); g.addColorStop(.45, '#fff'); g.addColorStop(1, '#a9a9a9'); x.fillStyle = g; x.fillRect(i*8, 0, 8, h); } }));
  lampR.add(mk(new THREE.ConeGeometry(.11, .1, 64, 1, true), std('pleated-shade', '#e8d3a8', { map:pleats, emissiveMap:pleats, roughness:.9, side:THREE.DoubleSide, emissive:col('#ffb15a'), emissiveIntensity:.35 }), 'pleated-shade', [-.16,.52,.06]));
  // the portrait's brass edges and the leg it leans on
  [[.1,0],[-.1,0]].forEach(([x]) => put(pf, box(.012, .25, .02, M.brass, 'frame-edge', [x,0,.003]))); [[.125],[-.125]].forEach(([y]) => put(pf, box(.21, .012, .02, M.brass, 'frame-edge', [0,y,.003])));
  put(portrait, rod([0,.01,-.07], [0,.2,-.005], .006, M.brass, 'easel-leg'));

  /* ================= armchair: all of it but the cushion ================= */
  [[-.3,-.28],[.3,-.28],[-.3,.3],[.3,.3]].forEach(([x,z]) => put(chair, box(.05, .32, .05, M.woodD, 'chair-leg', [x,.16,z])));
  put(chair, mk(rboxGeo(.72, .14, .7, .04), M.fabricD, 'chair-frame', [0,.36,0]));
  put(chair, mk(rboxGeo(.66, .62, .14, .05), M.fabric, 'chair-back', [0,.8,-.31], [-.12,0,0]));
  [-.34, .34].forEach(x => { put(chair, mk(rboxGeo(.09, .22, .62, .035), M.fabricD, 'chair-arm', [x,.55,0])); put(chair, box(.1, .04, .66, M.woodL, 'arm-rest', [x,.66,.01])); });

  /* ================= side table ================= */
  put(side, box(.6, .04, .5, M.wood, 'side-top', [0,.6,0])); [[-.26,-.21],[.26,-.21],[-.26,.21],[.26,.21]].forEach(([x,z]) => put(side, box(.04, .58, .04, M.woodD, 'side-leg', [x,.29,z])));
  put(side, box(.5, .12, .04, M.woodD, 'side-drawer', [0,.52,.23]));

  /* ================= contact shadows on the walls, and under the shelves' boards ================= */
  [[-3, DOOR.x0], [DOOR.x1, 3]].forEach(([a, b]) => parts.push(decal(aoLin, b - a, .55, [(a + b)/2, .28, -2.494], [0, 0, Math.PI], .6)));
  parts.push(decal(aoLin, 6, .55, [2.995, .28, 0], [0, -Math.PI/2, Math.PI], .6), decal(aoLin, 6, .5, [0, 2.54, -2.494], [0, 0, 0], .5), decal(aoLin, 6, .5, [2.995, 2.54, 0], [0, -Math.PI/2, 0], .5));
  parts.push(decal(aoLin, 6, .55, [0, .28, 2.994], [0, Math.PI, Math.PI], .6), decal(aoLin, 6, .5, [0, 2.54, 2.994], [0, Math.PI, 0], .5));
  LV.slice(1, 8).forEach(y => parts.push(decal(aoLin, SZ1 - BZ, .12, [-2.788, y - .02, (BZ + SZ1)/2], [0, Math.PI/2, Math.PI], .55)));
  [...DL.slice(1), LV[7]].forEach(y => parts.push(decal(aoLin, DW, .12, [-2.957, y - .02, (SZ0 + BZ)/2], [0, Math.PI/2, Math.PI], .55)));

  // the doorway onto the jetty, in the plane of the back wall
  return { parts, opening:(x, y) => x > DOOR.x0 + .04 && x < DOOR.x1 - .04 && y > 0 && y < DOOR.y1 };
}
```

- [ ] **Step 5: 改 `src/scripts/study.js`**

以下每一項都用引號裡的文字找到那幾行（行號是動手前的，改了前面後面會跟著移）。「刪掉」的行都已經在 Step 4 的檔案裡。

**E1**（L4 之後）加一行 import：

```js
import buildWestRoom from './studyWestRoom.js';
```

**E2**（L77–L84 的第一個 `const M = {`）刪掉兩行：開頭是 `  wall:std('wall', C.wall,` 的那行，和開頭是 `  glass:new THREE.MeshStandardMaterial(` 的那行。

**E3**（L147–L161）把從 `const STAND_IN =` 到 `})();`（`sheetsReady` 的結尾）整段換成：

```js
const STAND_IN = { color:'#bdbdbd', normal:'#8080ff', rough:'#ffffff' }, slots = [];
const sheet = (key, ch, rep = [1, 1]) => { const t = texOf(cnv(2, 2, (x, w, h) => { x.fillStyle = STAND_IN[ch]; x.fillRect(0, 0, w, h); }), rep, ch === 'color'); slots.push([key, ch, t]); return t; };
// Paints the sheets that have been claimed since it last ran, and only those: everything the room at the door is made of, and later
// whatever a room built behind the door asks for besides.
async function paintClaimed() {
  const mine = slots.splice(0); if (!mine.length) return;
  const keys = [...new Set(mine.map(s => s[0]))];
  let sets = null, w = null;
  if (typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined') {
    try { sets = await new Promise((res, rej) => { w = new Worker(new URL('./studyWorker.js', import.meta.url), { type:'module' }); w.onmessage = e => res(e.data); w.onerror = rej; w.postMessage({ low:Q.low, keys }); }); }
    catch (err) { console.warn('painting the room\'s sheets on the main thread instead', err); }
  }
  if (!sets) sets = paintSheets(Q.low, keys);
  // Uploaded here and now rather than on the next frame: in Chromium a worker's bitmaps live on its GPU context and go when it does, and
  // the next frame can be a long way off (a tab opened in the background, shaders still compiling). Only then is the worker let go.
  mine.forEach(([key, ch, t]) => { t.dispose(); t.image = sets[key][ch]; t.needsUpdate = true; renderer.initTexture(t); });
  w?.terminate();
}
const sheetsReady = (async () => { await null; await paintClaimed(); })(); // once the whole room is built, and every slot claimed
```

**E4**（L164–L165）把 `// one 2.5 m sheet of plaster, painted two shades by the material colours` 和下一行的 `const plasterTex = …` 換成：

```js
// one 2.5 m sheet of plaster: its relief and its roughness are every room's; the western walls lay its colour over them
const plasterTex = { normalMap:sheet('plaster', 'normal', [.4, .4]), roughnessMap:sheet('plaster', 'rough', [.4, .4]), normalScale:new THREE.Vector2(.55, .55) };
```

**E5**（L174–L186 的 `Object.assign(M, {`）刪掉三行：開頭是 `  wall: std('wall',`、`  wallL: std('wall-light',`、`  glass: new THREE.MeshPhysicalMaterial(` 的那三行。

**E6**（L188–L212）把 `/* ================= room shell ================= */` 之後、到 `/* ================= bookshelf (left wall) ================= */` 之前的全部內容換成：

```js
// The walls, the floor and the ceiling are a room's own (studyWestRoom.js, studyInkRoom.js). What both keep to is where the openings are:
// the doorway onto the jetty in the back wall, and the door into the house in the front one.
const DOOR = { x0:-2, x1:-.9, y1:2.15 }, FDOOR = { x0:-2.8, x1:-1.96, y1:2.05 };

```

**E7**（L218–L222）刪掉開頭是這些的五行：`shelf.add(box(.4, 2.72, SZ1 - BZ + .03`、`bays.forEach(z => shelf.add(box(.4, 2.72, .05`、`LV.forEach((y, i) => { const z0 =`、
`shelf.add(box(.42, .18,`、`LV.slice(1).forEach(y => { const s = mk(new THREE.BoxGeometry(.02, .01,`。

**E8**（L384–L390）刪掉開頭是這些的七行：`disp.add(roomUV(box(DW, 1.75,`、`DL.forEach(y => disp.add(box(DW, .035,`、`const cabinet =`、`cabinet.add(box(DW, .78,`、
`[-.315, .315].forEach(`、`[-.06, .06].forEach(x => cabinet.add(`、`[-.3, .3].forEach(x => { const s = mk(new THREE.CircleGeometry(`。

**E9**（L599–L608）刪掉從 `// a seventies TV stand:` 那行註解到 `[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a, b]) => tvc.add(cyl(.012, .009, .05, 10, teak, 'cab-foot'` 那行，共十行。
`const tvc = …` 和 `const CW = .7, CH = .77, CD = .42;` 留著。

**E10**（L701–L710）把從 `const wf = new THREE.Group(); wf.name = 'window';` 到 `[WIN.x0 - .1, WIN.x1 + .1].forEach(x => wf.add(roomUV(box(.12,` 那行，共十行，換成一行：

```js
const WZ = -2.55; // the plane of the back wall, where its openings are
```

**E11**（L712–L717）把

```js
/* ================= door + deck ================= */
// an open doorway in the back wall: a frame and a threshold, no leaf
const DCX = (DOOR.x0 + DOOR.x1)/2, df = new THREE.Group(); df.name = 'door'; room.add(df);
```

和它後面三行（開頭是 `[DOOR.x0, DOOR.x1].forEach(x => df.add(`、`df.add(box(DOOR.x1 - DOOR.x0 + .16`、`df.add(box(DOOR.x1 - DOOR.x0 + .08`）換成：

```js
/* ================= deck ================= */
const DCX = (DOOR.x0 + DOOR.x1)/2; // the middle of the doorway: the jetty and the duck are set out from it
```

**E12**（L739–L767）刪掉整段「the front corner」：從 `/* ================= the front corner: the door into the house, and two paintings ================= */` 到 `weld(fw).traverse(o => { o.castShadow = false; });`。

**E13**（書桌，L772–L853）刪掉：
- 開頭是 `desk.add(box(2.15, .05, .95`、`desk.add(box(2.05, .14, .05`、`[[.7,-2.42],[2.64,-2.42]`、`desk.add(box(1.94, .03, .04`、`desk.add(box(.6, .1, .01` 的五行；
- 開頭是 `rack.add(box(RKW, .018, RKD` 和 `[-1, 1].forEach(k => rack.add(box(.018, .19, RKD` 的兩行；
- 從 `// a snake plant at the rack's left end` 到 `plant.add(mk(mergeGeometries(blades),` 那行（整株盆栽）；
- `const pen = rod(` 那行；
- 從 `// right lamp` 到 `const shadeR = mk(new THREE.ConeGeometry(` 那行（整盞檯燈）；
- 開頭是 `[[.1,0],[-.1,0]].forEach(([x]) => pf.add(` 和 `portrait.add(rod([0,.01,-.07]` 的兩行。

留著的：`const desk`、`const DY = .76, DZ = -2.0, DX = 1.675;`、`rack` 群組和它裡面的系列書、`const RKW = .38, RKD = .22, BH = .29, BT = .105;`、筆電、稿紙、
`portrait`／`pf`／`portrait-frame` 那塊板子和 `tag(portrait, …)`。

**E14**（扶手椅與邊桌，L857–L881）刪掉開頭是這些的行：`[[-.3,-.28],[.3,-.28],[-.3,.3],[.3,.3]].forEach(([x,z]) => chair.add(`、`chair.add(mk(rboxGeo(.72, .14, .7`、
`chair.add(mk(rboxGeo(.66, .62, .14`、`[-.34, .34].forEach(x => { chair.add(`、`side.add(box(.6, .04, .5`、`side.add(box(.5, .12, .04`。
留著 `seatCushion` 那行、`dog`、`side` 群組和 `stack-book` 那行。

**E15**（光暈與接觸陰影，L914–L946）：
- `const halo = (p, size, op) => { … room.add(sp); };` 的結尾改成 `room.add(sp); return sp; };`
- 刪掉 `[-.3, .3].forEach(x => halo(dispAt(x, 2.48, .2), .16, .18));`
- 把 `[[-3, DOOR.x0], [DOOR.x1, 3]].forEach(([a, b]) => { decal(aoLin, b - a, .45, … ); decal(aoLin, b - a, .55, … ); });` 換成只留地板那一條：

```js
[[-3, DOOR.x0], [DOOR.x1, 3]].forEach(([a, b]) => decal(aoLin, b - a, .45, [(a + b)/2, .005, -2.27], [-Math.PI/2, 0, Math.PI], .8));
```

- 刪掉開頭是這些的七行：`decal(aoLin, 6, .55, [2.995, .28, 0]`、`decal(aoLin, 6, .5, [0, 2.54, -2.494]`、`decal(aoLin, 6, .5, [2.995, 2.54, 0]`、`decal(aoLin, 6, .55, [0, .28, 2.994]`、
  `decal(aoLin, 6, .5, [0, 2.54, 2.994]`、`LV.slice(1, 8).forEach(y => decal(`、`[...DL.slice(1), LV[7]].forEach(y => decal(`。

**E16**（緊接在 `/* ================= UI ================= */` 之前）加：

```js
/* ================= the room itself ================= */
// What a room's builder is handed (studyWestRoom.js, studyInkRoom.js): the tools everything here is made with, the groups its furniture
// hangs its frames on, so that they share the coordinates of what stands on them, and the sizes both rooms keep to.
const kit = { THREE, renderer, Q, C, M, col, rng, cnv, texOf, ctex, mk, box, cyl, rod, std, pbr, lite, sheet, roomUV, weld, mergeGeometries, rboxGeo,
  woodTex, plasterTex, grit, decal, aoLin, halo, dispAt,
  room, shelf, disp, desk, rack, tvc, chair, side, portrait, pf,
  LV, bays, SZ0, SZ1, BZ, DL, DW, DD, DX, DY, DZ, CW, CH, CD, RKW, RKD, WIN, WZ, DOOR, DCX, FDOOR };
const westRoom = buildWestRoom(kit);

```

- [ ] **Step 6: 確認沒有漏搬的東西**

```bash
grep -nE "M\.(wall|ceil|glass)|floorMap|teak|lampR|(^|[^A-Za-z])(wf|df|plant|cabinet)\." src/scripts/study.js
```

Expected: 沒有輸出。（`fw` 不在清單裡：閱讀器裡有同名的屬性。）

- [ ] **Step 7: 比對物件清單**

`study.js` 最後的 `window.__dbg = { THREE, scene, camera, renderer };` 還在。重新整理 `http://localhost:4331/`，門開了、吉利載入之後，執行 `__manifest` 的定義，再：

```js
(() => { const a = JSON.parse(localStorage.getItem('manifest-before')), b = __manifest(), count = l => l.reduce((m, s) => m.set(s, (m.get(s) || 0) + 1), new Map()), A = count(a), B = count(b);
  return { before:a.length, after:b.length, gone:[...A].filter(([s, n]) => (B.get(s) || 0) < n).map(([s]) => s), added:[...B].filter(([s, n]) => (A.get(s) || 0) < n).map(([s]) => s) }; })()
```

Expected: `before` 等於 `after`，`gone` 和 `added` 都是空陣列。不是的話，`gone` 列的是漏搬的、`added` 列的是搬錯的，照名字回 Step 4／5 修。

接著 `read_console_messages {onlyErrors: true}`：除了 `cloudflareinsights` 的 CORS 之外沒有錯誤。再看四個角落（「檢查工具」的看角落）各截一張圖，和搬家前的樣子一致。
最後 `localStorage.removeItem('manifest-before')`。

- [ ] **Step 8: build 與 commit**

刪掉 `study.js` 最後的 `window.__dbg` 那行，然後：

```bash
grep -n "__dbg" src/scripts/*.js; npm run build 2>&1 | tail -5
```

Expected: grep 沒有輸出；build 結尾是 `[build] Complete!`。

```bash
git add src/scripts/study.js src/scripts/studyWestRoom.js src/scripts/studyTextures.js src/scripts/studyWorker.js
git commit -m "$(cat <<'EOF'
refactor(room): build the western study from a module of its own

The walls, the window, the door frames and the frames of the furniture move
out of study.js into studyWestRoom.js, which builds them from a kit of the
stage's tools, groups and sizes and returns what it added. What stands on
the furniture stays in study.js. The big sheets are now painted only for
the keys that have been claimed, so a room that is not built costs nothing.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 兩個世界、只建當下那間、切換時重放開門

做完之後：湖景開門不建也不下載中式書齋；鴨子第一次切換會回到門前重放開門；從水墨開門不建西式書房。中式書齋這時只有一片灰地板（Task 3 才有殼）。

**Files:**
- Create: `src/scripts/studyInkRoom.js`（暫時的最小版本）
- Modify: `src/scripts/study.js`
- Modify: `src/pages/index.astro`（`#intro.off` 那條規則之後，約 L244）

**Interfaces:**
- Consumes: Task 1 的 `kit`、`buildWestRoom`、`paintClaimed`。
- Produces（`study.js` 模組層）：`WORLDS`（`lake`、`ink`，各有 `sky`、`back`、`leaf`、`paint`、`build`，建好後多 `room`、`sheets`）、`world`（目前世界的名字或 `null`）、
  `prepare(name): Promise<void>`、`show(name): void`、`turnWorld(): Promise<void>`、`shutDoor(): Promise<void>`、`walkIn(): void`、`ENTRY`（鏡頭在門口的位置）。
- Produces（`studyInkRoom.js`）：`export default function buildInkRoom(kit) → { parts, opening }`，Task 3 會整個換掉內容但介面不變。

- [ ] **Step 1: 暫時的 `src/scripts/studyInkRoom.js`**

```js
// The Chinese study that goes with the landscape in ink. For now only a floor to stand on: its walls and its furniture come next.
export default function buildInkRoom(kit) {
  const { THREE, mk, std, room } = kit, parts = [];
  const floor = mk(new THREE.PlaneGeometry(6, 5.6), std('ink-floor', '#6f7477', { roughness:.85 }), 'ink-floor', [0, 0, .2], [-Math.PI/2, 0, 0]); floor.castShadow = false; room.add(floor); parts.push(floor);
  return { parts, opening:(x, y) => y > 0 && Math.hypot(x + 1.45, y - .92) < 1.01 };
}
```

- [ ] **Step 2: `study.js`：鏡頭在門口的位置有名字**

把 `camera.position.set(1.6, 1.9, 3.6);` 換成：

```js
const ENTRY = new THREE.Vector3(1.6, 1.9, 3.6); // just inside the door into the house: where the eye is when that door opens
camera.position.copy(ENTRY);
```

- [ ] **Step 3: `study.js`：`SCENERY` 換成 `WORLDS`**

刪掉 Task 1 加的 `const sheetsReady = (async () => { await null; await paintClaimed(); })(); …` 那一行，和 `const westRoom = buildWestRoom(kit);` 那一行。

把從註解 `// What lies outside the window and the door, and the leaves that fall past them. There are two views of it:` 開始、到
`const turnScenery = () => { … };` 那行為止的整段（`SKEY`、`SCENERY`、`setScenery`、開頁那次 `setScenery(…)`、`turnScenery`）換成：

```js
/* ================= worlds ================= */
// A world is what lies outside and the room that goes with it: the lake in autumn seen from the western study, and the same lake as a
// landscape in ink, where the sky is paper and the leaves are the red of the sun, seen from a Chinese one. The rubber duck on the jetty
// changes one for the other, and the page remembers which it was left in. Only the world the door opens on is built. The other is built
// the first time it is asked for, behind the door, which is shut and pushed open again; after that both are kept, and change places at once.
const SKEY = 'study-scenery', sceneryTex = [outsideTex, sideTex, waterTex];
const within = (ms, p) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('no answer in ' + ms + ' ms')), ms))]);
const WORLDS = {
  lake:{ sky:SKY.top, back:scene.background.getHex(), leaf:FALL.part, build:async () => buildWestRoom(kit),
    paint:(far, side, near) => { paintLakeView(far, { trees:FALL.trees }); paintLakeView(side, { trees:FALL.trees, seed:23, boathouse:false, feather:.1 }); paintNearWater(near, far, { trees:FALL.trees }); } },
  ink:{ sky:INKS.paper, back:INKS.paper, leaf:INKS.seal, build:async () => (await within(15000, import('./studyInkRoom.js'))).default(kit),
    paint:(far, side, near) => { paintInkView(far); paintInkView(side, { seed:23, pavilion:false, feather:.1 }); paintInkWater(near, far); } },
};
// `turning`: the door is shut, and the duck is not listened to. The empty sheets the views' textures were made with go to whichever is painted first
let world = null, turning = true, blank = sceneryTex.map(t => t.image);
// builds a world's room and paints its view, the first time either is wanted; nothing of it shows yet
async function prepare(name) { const w = WORLDS[name];
  if (!w.room) { const r = await w.build(); r.parts.forEach(o => { o.visible = false; }); w.room = r; }
  if (!w.sheets) { w.sheets = blank || sceneryTex.map(t => cnv(t.image.width, t.image.height)); blank = null; w.paint(...w.sheets); } }
// puts a prepared world on show, and the other one away
function show(name) { const w = WORLDS[world = name];
  for (const k in WORLDS) if (WORLDS[k].room) WORLDS[k].room.parts.forEach(o => { o.visible = k === name; });
  sceneryTex.forEach((t, i) => { t.image = w.sheets[i]; t.needsUpdate = true; });
  sky.material.color.set(w.sky); scene.background.set(w.back); pMat.color.set(w.leaf); renderer.shadowMap.needsUpdate = true; }
// The duck's doing. A world that has been built is put on show at once. One that has not is built behind the door; if it cannot be
// (its script would not load), the door opens again on the world it shut on.
async function turnWorld() { if (turning) return; turning = true;
  const to = world === 'ink' ? 'lake' : 'ink', fresh = !WORLDS[to].room; let ok = true;
  if (fresh) await shutDoor();
  try { await prepare(to); show(to);
    if (fresh) { ajar(); await Promise.all([paintClaimed().then(ajar), renderer.compileAsync(scene, camera).catch(() => {}).then(ajar)]); }
    try { localStorage.setItem(SKEY, to); } catch {} }
  catch (err) { ok = false; console.warn('the other room would not open', err); }
  if (fresh) walkIn();
  if (!ok) toast('另一間書房暫時進不去，等一下再試');
  turning = false; }
```

緊接在後面的 `let partN = Q.low ? Math.ceil(PN / 2) : PN; pGeo.setDrawRange(0, partN);` 留著不動。

- [ ] **Step 4: `study.js`：鴨子的判定問當前世界**

把

```js
const viaDoor = ({ origin:o, direction:d }) => { const k = (WZ - o.z) / d.z, x = o.x + d.x * k, y = o.y + d.y * k; return d.z < 0 && x > DOOR.x0 + .04 && x < DOOR.x1 - .04 && y > 0 && y < DOOR.y1; };
```

換成

```js
const viaDoor = ({ origin:o, direction:d }) => { const k = (WZ - o.z) / d.z, r = world && WORLDS[world].room; return !!r && d.z < 0 && r.opening(o.x + d.x * k, o.y + d.y * k); };
```

`pointerup` 的處理裡，把 `else if (p.type === 'scenery') turnScenery();` 換成 `else if (p.type === 'scenery') turnWorld();`。

`judge` 的第一行 `if (!Q.armed || Q.low || Q.judged || tween || document.hidden) return;` 換成（門後建房間的那幾格不算進評分）：

```js
  if (!Q.armed || Q.low || Q.judged || tween || turning || document.hidden) return;
```

- [ ] **Step 5: `study.js`：門可以再關一次**

把檔案接近結尾的這一段

```js
// the shaders are built while the sheets are still being painted; the room opens once both are done
// the door on the loading screen swings a little wider as each of the three is done: the room built, its shaders, its sheets
const introEl = $('intro'), door = n => { introEl.dataset.s = Math.max(n, +introEl.dataset.s || 0); }; let doorN = 0; const ajar = () => door(++doorN);
ajar();
renderer.compileAsync(scene, camera).catch(() => {}).then(() => { ajar(); renderer.setAnimationLoop(loop); });
sheetsReady.then(ajar);
Promise.all([sheetsReady, new Promise(r => setTimeout(r, 300))]).then(() => { flyTo(HOME.tgt, HOME.pos, 2.2); Q.armed = true; door(4); introEl.classList.add('off'); document.body.classList.add('in');
  loadDog().catch(err => console.warn('the dog stayed off the chair', err)); }); // the room first, then the dog
```

換成

```js
/* ================= the door ================= */
// The loading screen is the study's door. It swings a little wider as each of three things is done (the room built, its shaders, its
// sheets), then all the way, and the eye walks in. That happens when the page opens, and again whenever the duck asks for a room that has
// not been built: the screen goes back to the door, shut, and the room is built behind it.
const introEl = $('intro'), door = n => { introEl.dataset.s = Math.max(n, +introEl.dataset.s || 0); }; let doorN = 0; const ajar = () => door(++doorN);
function walkIn() { camera.position.copy(ENTRY); controls.target.copy(HOME.tgt); flyTo(HOME.tgt, HOME.pos, 2.2); focused = false; setZone(null);
  door(4); introEl.classList.remove('again'); introEl.classList.add('off'); introEl.style.pointerEvents = ''; document.body.classList.add('in'); }
// Back to the door, shut. Whatever was held up to read is put down first; the dock goes once the door has covered it, and comes back in
// button by button when the door opens, as it did the first time.
const shutDoor = () => new Promise(done => {
  if (panel.classList.contains('open')) { panel.classList.remove('open'); document.body.classList.remove('reading'); }
  tip.style.opacity = 0; hoverRoot = null;
  introEl.classList.add('snap'); introEl.dataset.s = 0; doorN = 0; void introEl.offsetWidth; introEl.classList.remove('snap'); // shut, without swinging back
  introEl.style.pointerEvents = 'auto'; introEl.classList.add('again'); introEl.classList.remove('off');
  setTimeout(() => { document.body.classList.remove('in'); done(); }, 400); });
// The door opens on the world the room was left in. If that is the Chinese study and its script will not load, on the lake instead (and
// the page goes on remembering the study, to try again next time). The shaders are built while the sheets are still being painted; the
// room opens once the sheets are in.
(async () => {
  let first = (() => { try { return localStorage.getItem(SKEY); } catch { return null; } })() === 'ink' ? 'ink' : 'lake';
  try { await prepare(first); }
  catch (err) { if (first === 'lake') throw err; console.warn('the Chinese study would not open, so the door opens on the lake', err); await prepare(first = 'lake'); }
  show(first); ajar();
  renderer.compileAsync(scene, camera).catch(() => {}).then(() => { ajar(); renderer.setAnimationLoop(loop); });
  await Promise.all([paintClaimed().then(ajar), new Promise(r => setTimeout(r, 300))]);
  walkIn(); Q.armed = true; turning = false;
  loadDog().catch(err => console.warn('the dog stayed off the chair', err)); // the room first, then the dog
})();
```

- [ ] **Step 6: `index.astro`：門的兩個新狀態**

在 `#intro.off { opacity: 0; pointer-events: none !important; }` 那行之後加：

```css
  /* Going back to the door for a room that is not built yet (study.js, shutDoor): `snap` puts the leaf shut and the door back to its own
     size without swinging either, and `again` brings the screen up at once, not after the wait the first opening fades out on */
  #intro.snap, #intro.snap * { transition: none !important; }
  #intro.again { transition: opacity .35s; }
```

- [ ] **Step 7: 加除錯把手**

`study.js` 最後加 `window.__dbg = { THREE, scene, camera, renderer, WORLDS, turnWorld };`。

- [ ] **Step 8: 瀏覽器檢查**

**檢查 A：全新訪客只有西式書房。** `localStorage.removeItem('study-scenery'); location.reload();`，門開了之後：

```js
({ built:Object.keys(__dbg.WORLDS).filter(k => __dbg.WORLDS[k].room), ink:!!__dbg.scene.getObjectByName('ink-floor'), wall:!!__dbg.scene.getObjectByName('wall-left'),
   chunk:performance.getEntriesByType('resource').some(e => /studyInkRoom/.test(e.name)) })
```

Expected: `{ built:['lake'], ink:false, wall:true, chunk:false }`。

**檢查 B：第一次切換重放開門，而且只切一次（Review Focus 1、2）。** 先讓鏡頭離開中心：`document.querySelector('#hud [data-zone=desk]').click()`，等 2 秒。然後連叫兩次：

```js
__dbg.turnWorld(); __dbg.turnWorld(); 'asked twice'
```

約 0.7 秒後截圖，並執行 `({ off:intro.classList.contains('off'), s:intro.dataset.s })`（`intro` 是 `document.getElementById('intro')`）。
Expected: 畫面是那扇門（關著或剛開一點），`off` 是 `false`。

再等 6 秒（建構、編 shader、鏡頭走進來）：

```js
({ off:document.getElementById('intro').classList.contains('off'), built:Object.keys(__dbg.WORLDS).filter(k => __dbg.WORLDS[k].room), stored:localStorage.getItem('study-scenery'),
   inkFloor:__dbg.scene.getObjectByName('ink-floor').visible, wall:__dbg.scene.getObjectByName('wall-left').visible, zone:!!document.querySelector('#hud [data-zone].on'),
   home:__dbg.camera.position.distanceTo(new __dbg.THREE.Vector3(1.05, 1.72, 2.1)) < .05, inDock:document.body.classList.contains('in') })
```

Expected: `{ off:true, built:['lake','ink'], stored:'ink', inkFloor:true, wall:false, zone:false, home:true, inDock:true }`。截圖：窗外是水墨山水，地板是灰的，沒有牆，書和展品浮在原位（殼是下一個 task）。
`stored` 是 `ink` 而不是切了兩次回到 `lake`，就表示第二次呼叫被擋掉了。

**檢查 C：兩間都建過之後是瞬間的。** `__dbg.turnWorld(); 'ok'`，0.3 秒後：

```js
({ off:document.getElementById('intro').classList.contains('off'), wall:__dbg.scene.getObjectByName('wall-left').visible, inkFloor:__dbg.scene.getObjectByName('ink-floor').visible, stored:localStorage.getItem('study-scenery') })
```

Expected: `{ off:true, wall:true, inkFloor:false, stored:'lake' }`，截圖是完整的西式書房。

**檢查 D：從水墨開門不建西式書房。** `localStorage.setItem('study-scenery', 'ink'); location.reload();`，門開了之後：

```js
({ built:Object.keys(__dbg.WORLDS).filter(k => __dbg.WORLDS[k].room), wall:!!__dbg.scene.getObjectByName('wall-left'), floor:!!__dbg.scene.getObjectByName('floor'), desk:!!__dbg.scene.getObjectByName('desk-top') })
```

Expected: `{ built:['ink'], wall:false, floor:false, desk:false }`。接著 `__dbg.turnWorld()`，0.7 秒後是那扇門，再 5 秒後門開了、是完整的西式書房（木地板有木紋，不是灰色的 2×2 替身）。

**檢查 E：真的點鴨子。** 回到中心視角，把滑鼠移到棧橋上的鴨子，游標變成手指、提示是「換個景色」，點下去會切換；把滑鼠移到門框旁邊的牆上（鴨子被牆擋住的角度）沒有反應。

**檢查 F：載不下來。** 暫時把 `WORLDS.ink` 的 `build` 改成 `build:async () => { throw new Error('test'); },`。
- `localStorage.removeItem('study-scenery'); location.reload();`，門開了之後 `__dbg.turnWorld()`，5 秒後：`off` 是 `true`、`document.getElementById('toast').textContent` 是
  `另一間書房暫時進不去，等一下再試`、`localStorage.getItem('study-scenery')` 是 `null`、畫面是西式書房。
- `localStorage.setItem('study-scenery', 'ink'); location.reload();`：門照樣打開，是西式書房和湖景，console 有一則 `the Chinese study would not open` 的警告，`localStorage.getItem('study-scenery')` 還是 `ink`。

檢查完把 `build` 改回 `build:async () => (await within(15000, import('./studyInkRoom.js'))).default(kit),`，並 `localStorage.removeItem('study-scenery')`。

- [ ] **Step 9: build 與 commit**

刪掉 `window.__dbg` 那行。

```bash
grep -n "__dbg\|new Error('test')" src/scripts/*.js; npm run build 2>&1 | tail -5; ls dist/_astro | grep -i inkroom; grep -c "studyInkRoom" dist/index.html
```

Expected: 第一個 grep 沒有輸出；build 成功；`dist/_astro` 裡有一個 `studyInkRoom.<hash>.js`；`dist/index.html` 裡出現 0 次（沒有被 preload）。

```bash
git add src/scripts/study.js src/scripts/studyInkRoom.js src/pages/index.astro
git commit -m "$(cat <<'EOF'
feat(room): build only the room the door opens on, and shut the door to build the other

The view outside and the room that goes with it are now one world. The door
opens on the world the page was left in and builds nothing of the other; the
first time the duck asks for it the screen goes back to the door, the room is
built behind it and the door is pushed open again. After that both are kept
and change places at once. The Chinese study is a script of its own, fetched
when it is first wanted; if it will not load the door opens on the lake.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 中式的殼

**Files:**
- Modify: `src/scripts/studyInkRoom.js`（整個檔案換掉）

**Interfaces:**
- Consumes: `kit` 的 `THREE, Q, M, col, rng, mk, box, cyl, rod, std, pbr, ctex, roomUV, weld, woodTex, plasterTex, decal, aoLin, room, WIN, FDOOR`。
- Produces（檔案內部，Task 4–7 會用）：`piece(parent, name, fill)`（把 `fill(g)` 加進去的東西 `weld` 成每種材質一個 mesh，並記進 `parts`）、`lone(parent, o)`、
  `seg(x, a, b, c, d)`、`K`（輕量模式是 0.5）、材質 `plaster, timber, rose, roseD, matte, stone, brick, boards`、`GATE`。
  場景裡的名字：`ink-floor`、`ink-shell`、`ink-gate-trim`、`ink-scroll`（三個）。

- [ ] **Step 1: 寫 `src/scripts/studyInkRoom.js`**

```js
// The Chinese study that goes with the landscape in ink: a white wall with a moon gate and a lattice window, timbers overhead, and Ming
// furniture standing where the western room's does. Nothing here is built until that world is first wanted (study.js, WORLDS). Every
// surface that something rests on (a shelf's boards, the table's top, the stand under the TV) is where the western room has it, so the
// books and the exhibits, which belong to neither room, never move.
export default function buildInkRoom(kit) {
  const { THREE, Q, M, col, rng, mk, box, cyl, rod, std, pbr, ctex, roomUV, weld, woodTex, plasterTex, decal, aoLin, room } = kit;
  const parts = [];
  // one piece of the room: built into a group of its own under `parent`, so that it shares the coordinates of whatever stands on it
  // there, then drawn as one mesh per material
  const piece = (parent, name, fill) => { const g = new THREE.Group(); g.name = name; parent.add(g); fill(g); weld(g); parts.push(g); return g; };
  const lone = (parent, o) => { parent.add(o); parts.push(o); return o; }; // what has to stay a mesh, or a group, of its own
  const seg = (x, a, b, c, d) => { x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); };
  const K = Q.low ? .5 : 1; // the low tier paints this room's own sheets at half size

  /* ================= materials ================= */
  const plaster = std('ink-plaster', '#ece7da', { ...plasterTex, roughness:1 }); // whitewash: the plaster's relief with no colour of its own over it
  const timber = pbr('ink-timber', '#2c1b14', { ...woodTex, roughness:.6, clearcoat:.25, clearcoatRoughness:.4 }), matte = std('ink-rafter', '#2a1b15', { roughness:.9 });
  const rose = pbr('ink-rosewood', '#45251a', { ...woodTex, roughness:.45, clearcoat:.5, clearcoatRoughness:.25 }), roseD = pbr('ink-rosewood-dark', '#2e1812', { ...woodTex, roughness:.5, clearcoat:.4, clearcoatRoughness:.3 });
  const stone = std('ink-stone', '#70767a', { roughness:.95 }), brick = std('ink-brick', '#4e5559', { roughness:.9 }), boards = std('ink-boards', '#a89c86', { roughness:1 });
  // the floor: grey bricks half a metre square, four each way to a sheet
  const tiles = ctex(1024 * K, 1024 * K, (x, w) => { const R = rng(7), n = 4, s = w / n, u = w / 1024;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { x.fillStyle = `hsl(${195 + R() * 20}, ${4 + R() * 4}%, ${36 + R() * 9}%)`; x.fillRect(i * s, j * s, s, s);
      for (let q = 0; q < 220; q++) { x.globalAlpha = .04 + R() * .07; x.fillStyle = R() < .5 ? '#000' : '#fff'; const r = (1 + R() * 5) * u; x.beginPath(); x.ellipse(i * s + R() * s, j * s + R() * s, r * (1 + R() * 2), r, R() * 3, 0, 6.3); x.fill(); } x.globalAlpha = 1; }
    x.fillStyle = 'rgba(18,20,22,.8)'; for (let i = 0; i <= n; i++) { x.fillRect(i * s - 2 * u, 0, 4 * u, w); x.fillRect(0, i * s - 2 * u, w, 4 * u); } }, false);
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set(3, 2.8);

  /* ================= lattice ================= */
  // White lines on nothing, drawn in metres: alphaTest cuts the pane out of them, and the material stains them. The sun throws their shadow.
  const PX = 512 * K;
  const lattice = (w, h, draw) => new THREE.MeshStandardMaterial({ name:'ink-lattice', color:col('#33211a'), alphaTest:.4, side:THREE.DoubleSide, roughness:.6,
    map:ctex(Math.round(w * PX), Math.round(h * PX), (x, cw, ch) => { x.clearRect(0, 0, cw, ch); x.save(); x.scale(PX, PX); x.strokeStyle = '#fff'; x.lineCap = 'square'; draw(x, w, h); x.restore(); }, false) });
  const pane = (w, h, draw, p) => mk(new THREE.PlaneGeometry(w, h), lattice(w, h, draw), 'lattice', p);
  // cracked ice: the pane is split by a chord, and each piece again, until the pieces are small. A chord runs from the longest edge of a
  // piece to the edge across from it (the one whose middle stands furthest off the first one's line), so no piece is cut into slivers.
  const ice = seed => (x, w, h) => { const R = rng(seed), todo = [[[0, 0], [w, 0], [w, h], [0, h]]], done = [];
    const area = p => Math.abs(p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0)) / 2, len = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    for (let guard = 0; todo.length && guard < 3000; guard++) { const p = todo.pop(), n = p.length; if (area(p) < .03 * (.6 + R() * .8)) { done.push(p); continue; }
      const mid = q => [(p[q][0] + p[(q + 1) % n][0]) / 2, (p[q][1] + p[(q + 1) % n][1]) / 2];
      let i = 0, L = 0; for (let q = 0; q < n; q++) { const l = len(p[q], p[(q + 1) % n]); if (l > L) { L = l; i = q; } }
      let j = -1, D = -1; const e = p[(i + 1) % n], nx = -(e[1] - p[i][1]) / L, ny = (e[0] - p[i][0]) / L;
      for (let q = 0; q < n; q++) { if (q === i) continue; const m = mid(q), d = Math.abs((m[0] - p[i][0]) * nx + (m[1] - p[i][1]) * ny); if (d > D) { D = d; j = q; } }
      const cut = (q, t) => { const a = p[q], b = p[(q + 1) % n]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }, ci = cut(i, .3 + R() * .4), cj = cut(j, .3 + R() * .4);
      const A = [ci], B = [cj]; for (let q = (i + 1) % n; ; q = (q + 1) % n) { A.push(p[q]); if (q === j) break; } A.push(cj);
      for (let q = (j + 1) % n; ; q = (q + 1) % n) { B.push(p[q]); if (q === i) break; } B.push(ci); todo.push(A, B); }
    x.lineWidth = .02; done.forEach(p => { x.beginPath(); p.forEach(([px, py], q) => q ? x.lineTo(px, py) : x.moveTo(px, py)); x.closePath(); x.stroke(); });
    x.lineWidth = .04; x.strokeRect(.02, .02, w - .04, h - .04); };

  /* ================= scrolls ================= */
  // Paper between two rods, hung flat on a wall. The sheet is its mount, and inside the mount the picture, which `draw` paints in a box
  // w × h at 520 px to the metre. The lettering is in whatever regular script the machine has; a machine with none sets it in its serif.
  const INK = '#1b1d20', SEAL = '#c2272d', KAI = '"Kaiti TC", "BiauKai", "DFKai-SB", "Kaiti SC", "Songti TC", serif';
  const scrollMat = (W, H, draw) => { const w = Math.round(W * 520), h = Math.round(H * 520), mx = Math.round(w * .09), top = Math.round(h * .1), bot = Math.round(h * .14);
    return std('ink-scroll', '#ffffff', { roughness:.9, map:ctex(Math.round(w * K), Math.round(h * K), x => { x.save(); x.scale(K, K); x.fillStyle = '#d8ceb4'; x.fillRect(0, 0, w, h); x.fillStyle = '#ece4cf'; x.fillRect(mx, top, w - 2 * mx, h - top - bot);
      x.translate(mx, top); x.beginPath(); x.rect(0, 0, w - 2 * mx, h - top - bot); x.clip(); draw(x, w - 2 * mx, h - top - bot); x.restore(); }, false) }); };
  // `p` is the middle of the sheet; it faces +z, turned by `ry`
  const scroll = (W, H, p, ry, draw) => { const g = new THREE.Group(); g.name = 'ink-scroll'; g.position.set(...p); g.rotation.y = ry;
    const paper = mk(new THREE.PlaneGeometry(W, H), scrollMat(W, H, draw), 'scroll-paper', [0, 0, .006]); paper.castShadow = false; g.add(paper);
    g.add(cyl(.008, .008, W + .02, 8, timber, 'scroll-rod', [0, H / 2, .008], [0, 0, Math.PI / 2])); g.add(cyl(.014, .014, W + .07, 10, timber, 'scroll-rod', [0, -H / 2, .014], [0, 0, Math.PI / 2]));
    return lone(room, g); };
  const seal = (x, px, py, s = 15) => { x.globalAlpha = .9; x.fillStyle = SEAL; x.fillRect(px, py, s, s); x.globalAlpha = 1; };
  // three stalks of bamboo, the nearest darkest, each a run of joints; leaves in clusters over them
  const bamboo = (x, w, h) => { const R = rng(5); x.strokeStyle = INK; x.lineCap = 'round';
    [[.3, 5, .9], [.55, 3.5, .55], [.72, 2.5, .35]].forEach(([bx, lw, a], s) => { x.globalAlpha = a; x.lineWidth = lw; const lean = (s - 1) * .05 + .03;
      for (let y = h - 4; y > h * .08;) { const l = 46 + R() * 26; seg(x, bx * w + (h - y) * lean, y, bx * w + (h - y + l) * lean, y - l + 3); y -= l; } });
    x.fillStyle = INK; for (let i = 0; i < 26; i++) { const lx = w * (.2 + R() * .65), ly = h * (.06 + R() * .5), a = -1.2 + R() * 1.6, l = 18 + R() * 20; x.globalAlpha = .45 + R() * .5;
      x.save(); x.translate(lx, ly); x.rotate(a); x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(l * .5, -4, l, 0); x.quadraticCurveTo(l * .5, 4, 0, 0); x.fill(); x.restore(); }
    seal(x, w * .76, h * .88); };
  // three ranges, each fading out at its foot, and a hut under a tree on the near bank
  const hills = (x, w, h) => { const R = rng(12);
    [[.34, .1, .3], [.46, .07, .55], [.6, .05, .85]].forEach(([base, amp, a], q) => { x.globalAlpha = a * .7; x.beginPath(); x.moveTo(0, h * (base + .16));
      for (let i = 0; i <= 30; i++) { const u = i / 30; x.lineTo(u * w, h * (base - amp * Math.abs(Math.sin(u * (2.2 + q) + q * 1.7)) - R() * .008)); } x.lineTo(w, h * (base + .16));
      const g = x.createLinearGradient(0, h * (base - amp), 0, h * (base + .16)); g.addColorStop(0, q ? INK : '#55626a'); g.addColorStop(1, 'rgba(236,228,207,0)'); x.fillStyle = g; x.fill(); });
    x.globalAlpha = .85; x.strokeStyle = INK; x.lineWidth = 2; seg(x, w * .2, h * .8, w * .5, h * .79); seg(x, w * .3, h * .8, w * .32, h * .73); x.lineWidth = 6; seg(x, w * .27, h * .735, w * .37, h * .73); seal(x, w * .78, h * .08); };
  // lines of characters set down the sheet, the first on the right
  const writing = lines => (x, w, h) => { const n = Math.max(...lines.map(l => l.length)), fs = Math.min(w / (lines.length + .6), h / (n + 1.2)); x.fillStyle = INK; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `600 ${fs}px ${KAI}`; x.globalAlpha = .88;
    lines.forEach((l, c) => [...l].forEach((ch, r) => x.fillText(ch, w - fs * (.8 + c * 1.05), fs * (.9 + r * 1.02)))); seal(x, fs * .35, h - fs * .9, fs * .4); };

  /* ================= the shell ================= */
  // The moon gate: a circle in the back wall that the floor cuts off, so that its foot is a metre of threshold.
  const GATE = { x:-1.45, y:.92, r:1.05 };
  function shell() { const W = kit.WIN, F = kit.FDOOR, half = r => Math.sqrt(r * r - GATE.y * GATE.y);
    // the gate's arc at radius `r`, from the floor on one side over the top to the floor on the other: left to right, or back again
    const arc = (s, r, over) => s.absarc(GATE.x, GATE.y, r, Math.atan2(-GATE.y, over ? -half(r) : half(r)), Math.atan2(-GATE.y, over ? half(r) : -half(r)), over);
    const floor = mk(new THREE.PlaneGeometry(6, 5.6), std('ink-floor', '#ffffff', { map:tiles, roughness:.85 }), 'ink-floor', [0, 0, .2], [-Math.PI / 2, 0, 0]); floor.castShadow = false; lone(room, floor);
    piece(room, 'ink-shell', g => {
      // three walls, whitewashed; the side walls stop at the back one
      [-3.05, 3.05].forEach(x => g.add(roomUV(box(.1, 2.8, 5.6, plaster, 'wall', [x, 1.4, .2])))); g.add(roomUV(box(6.2, 2.8, .1, plaster, 'wall', [0, 1.4, 3.05])));
      // overhead: boards on rafters on two beams, and a plate round the head of the walls
      g.add(box(6.2, .1, 5.7, boards, 'ceiling', [0, 2.85, .15]));
      [-.7, 1.3].forEach(z => g.add(box(6, .22, .18, timber, 'beam', [0, 2.69, z], null, 0)));
      for (let i = 0; i < 19; i++) g.add(box(.06, .07, 5.5, matte, 'rafter', [-2.85 + i * 5.7 / 18, 2.765, .2], null, 2));
      [-2.96, 2.96].forEach(x => g.add(box(.08, .18, 5.5, timber, 'plate', [x, 2.6, .2], null, 2))); [-2.46, 2.96].forEach(z => g.add(box(6, .18, .08, timber, 'plate', [0, 2.6, z], null, 0)));
      // columns on stone bases: under the beams along the right wall, and in three of the corners (the bookcase fills the fourth)
      [[2.93, -.7], [2.93, 1.3], [2.93, 2.93], [2.93, -2.45], [-2.93, -2.45]].forEach(([x, z]) => { g.add(cyl(.1, .1, 2.7, 20, timber, 'column', [x, 1.4, z])); g.add(cyl(.15, .17, .1, 20, stone, 'plinth', [x, .05, z])); });
      // the back wall, 20 cm thick, with the gate and the window cut out of it
      const sh = new THREE.Shape(); sh.moveTo(-3.05, 0); sh.lineTo(GATE.x - half(GATE.r), 0); arc(sh, GATE.r, true); sh.lineTo(3.05, 0); sh.lineTo(3.05, 2.8); sh.lineTo(-3.05, 2.8); sh.closePath();
      const hole = new THREE.Path(); hole.moveTo(W.x0, W.y0); hole.lineTo(W.x0, W.y1); hole.lineTo(W.x1, W.y1); hole.lineTo(W.x1, W.y0); hole.closePath(); sh.holes.push(hole);
      const wg = new THREE.ExtrudeGeometry(sh, { depth:.2, bevelEnabled:false, curveSegments:64 }); wg.translate(0, 0, -2.7); g.add(mk(wg, plaster, 'wall-back'));
      g.add(box(2 * half(GATE.r) + .1, .04, .3, stone, 'threshold', [GATE.x, .005, -2.6]));
      // the window: four leaves, the outer two shut and latticed, the middle two folded away
      const wy = (W.y0 + W.y1) / 2, wh = W.y1 - W.y0, wx = (W.x0 + W.x1) / 2, lw = (W.x1 - W.x0) / 4, wz = -2.6;
      [W.y0, W.y1].forEach(y => g.add(box(W.x1 - W.x0 + .12, .07, .22, timber, 'window-frame', [wx, y, wz], null, 0)));
      for (let i = 0; i <= 4; i++) g.add(box(i % 4 ? .05 : .07, wh, i % 4 ? .08 : .22, timber, 'window-frame', [W.x0 + i * lw, wy, wz], null, 1));
      [0, 3].forEach(i => g.add(pane(lw - .05, wh - .07, ice(11 + i * 7), [W.x0 + (i + .5) * lw, wy, wz])));
      g.add(box(W.x1 - W.x0 + .3, .04, .14, stone, 'sill', [wx, W.y0 - .05, -2.46]));
      // the door into the house: two leaves of plank, a brass boss and a ring on each
      const cx = (F.x0 + F.x1) / 2, fw = F.x1 - F.x0, fh = F.y1, fz = 2.985;
      [F.x0 - .04, F.x1 + .04].forEach(x => g.add(box(.09, fh + .05, .09, timber, 'door-jamb', [x, (fh + .05) / 2, fz])));
      g.add(box(fw + .34, .1, .1, timber, 'door-head', [cx, fh + .05, fz], null, 0)); g.add(box(fw + .17, .06, .1, timber, 'door-sill', [cx, .03, fz], null, 0));
      [-1, 1].forEach(s => { g.add(box(fw / 2 - .004, fh - .06, .035, roseD, 'door-leaf', [cx + s * fw / 4, fh / 2 + .03, fz + .01], null, 1));
        g.add(cyl(.045, .045, .008, 24, M.brass, 'door-boss', [cx + s * .07, 1.05, fz - .012], [Math.PI / 2, 0, 0])); g.add(mk(new THREE.TorusGeometry(.032, .005, 8, 24), M.brass, 'door-ring', [cx + s * .07, 1.02, fz - .02])); }); });
    // the gate's trim of grey brick, proud of the wall on both faces. The sun rakes along its inner face, and the shadow map cannot tell
    // that from shade, so it takes no shadow.
    const ring = new THREE.Shape(), R2 = GATE.r + .09; ring.moveTo(GATE.x - half(R2), 0); arc(ring, R2, true); ring.lineTo(GATE.x + half(GATE.r), 0); arc(ring, GATE.r, false); ring.closePath();
    const rg = new THREE.ExtrudeGeometry(ring, { depth:.26, bevelEnabled:false, curveSegments:64 }); rg.translate(0, 0, -2.73);
    const trim = mk(rg, brick, 'ink-gate-trim'); trim.receiveShadow = false; lone(room, trim);
    // bamboo on the pier between the gate and the window; hills and a line of the Analects on the left wall, by the door into the house
    scroll(.3, .98, [-.24, 1.78, -2.497], 0, bamboo); scroll(.34, 1.05, [-2.994, 1.62, 2.5], Math.PI / 2, hills); scroll(.26, .9, [-2.994, 1.62, 1.95], Math.PI / 2, writing(['學而時習之', '不亦說乎']));
    // contact shadows at the foot and the head of the walls: light ones, where the western room's are heavy, for these walls are white
    const foot = half(R2);
    [[-3, GATE.x - foot], [GATE.x + foot, 3]].forEach(([a, b]) => parts.push(decal(aoLin, b - a, .55, [(a + b) / 2, .28, -2.494], [0, 0, Math.PI], .27)));
    parts.push(decal(aoLin, 5.5, .55, [2.995, .28, .25], [0, -Math.PI / 2, Math.PI], .27), decal(aoLin, 6, .55, [0, .28, 2.994], [0, Math.PI, Math.PI], .27));
    parts.push(decal(aoLin, 6, .5, [0, 2.54, -2.494], [0, 0, 0], .22), decal(aoLin, 5.5, .5, [2.995, 2.54, .25], [0, -Math.PI / 2, 0], .22), decal(aoLin, 6, .5, [0, 2.54, 2.994], [0, Math.PI, 0], .22)); }

  shell();
  // the moon gate, in the plane of the back wall: the duck out on the jetty answers only through it
  return { parts, opening:(x, y) => y > 0 && Math.hypot(x - GATE.x, y - GATE.y) < GATE.r - .04 };
}
```

- [ ] **Step 2: 加除錯把手，從水墨開門**

`study.js` 最後加 `window.__dbg = { THREE, scene, camera, renderer, WORLDS, turnWorld };`，然後 `localStorage.setItem('study-scenery', 'ink'); location.reload();`。

- [ ] **Step 3: 瀏覽器檢查**

**檢查 A：殼在。**

```js
({ parts:['ink-floor', 'ink-shell', 'ink-gate-trim'].map(n => !!__dbg.scene.getObjectByName(n)), scrolls:(() => { let n = 0; __dbg.scene.traverse(o => { if (o.name === 'ink-scroll') n++; }); return n; })(),
   shellMeshes:__dbg.scene.getObjectByName('ink-shell').children.map(m => m.name).sort() })
```

Expected: `parts` 是 `[true, true, true]`，`scrolls` 是 3，`shellMeshes` 是每種材質一個：`brass`、`ink-boards`、`ink-lattice`（兩個）、`ink-plaster`、`ink-rafter`、`ink-rosewood-dark`、`ink-stone`、`ink-timber`。

**檢查 B：長相。** 回中心視角截圖：白牆、月洞門框住棧橋和鴨子、右邊四扇檻窗（外側兩扇冰裂紋）、門窗之間的墨竹立軸、天花的樑和椽、青灰方磚。
家具骨架還沒有（書、展品、筆電、電視浮在原位）是正常的。再看 `shelf` 角落（左牆遠端能看到兩幅立軸和板門的一角）。console 沒有錯誤。

**檢查 C：月洞門的點擊判定（Review Focus 3）。**

```js
(() => { const o = __dbg.WORLDS.ink.room.opening; return [o(-1.45, 1), o(-1.45, 2.05), o(-2.3, .3), o(-.5, .92), o(-1.45, -.1)]; })()
```

Expected: `[true, false, false, true, false]`（門洞中央、門洞上方的牆、圓弧外側的牆腳、門洞右緣內側、地面以下）。
再真的點一次：中心視角下游標移到鴨子上會變手指，點下去回到湖景（瞬間或重放開門，看西式書房建過沒有）。

**檢查 D：湖景沒被動到。** `localStorage.removeItem('study-scenery'); location.reload();`，門開了之後 `!!__dbg.scene.getObjectByName('ink-shell')` 是 `false`，截圖是原本的西式書房。

- [ ] **Step 4: build 與 commit**

刪掉 `window.__dbg` 那行。

```bash
grep -n "__dbg" src/scripts/*.js; npm run build 2>&1 | tail -5
git add src/scripts/studyInkRoom.js
git commit -m "$(cat <<'EOF'
feat(room): give the ink landscape a Chinese study to be seen from

White walls on a floor of grey brick, beams and rafters overhead, and in the
back wall a moon gate onto the jetty and a window of four leaves, the outer
two latticed in cracked ice. Three scrolls hang on the walls and the door
into the house is two leaves of plank. The duck answers through the gate.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

Expected: grep 沒有輸出，build 成功。

---

### Task 4: 書格

**Files:**
- Modify: `src/scripts/studyInkRoom.js`

**Interfaces:**
- Consumes: Task 3 的 `piece`、`rose`；`kit` 的 `shelf, LV, bays, SZ0, SZ1, BZ`。
- Produces: 場景裡的 `ink-bookcase`。

- [ ] **Step 1: 加 `bookcase()`**

在 `shell();` 那行之前（`function shell() { … }` 之後）加：

```js
  /* ================= 書格: the bookcase as open stands ================= */
  // The boards are where the western bookcase has them. What holds them is a post at the front and the back of each bay's ends, with
  // nothing behind the books or beside them, so the white wall shows through. Under the lowest board an apron runs from post to post.
  function bookcase() { const { shelf, LV, bays, SZ0, SZ1, BZ } = kit;
    piece(shelf, 'ink-bookcase', g => {
      LV.forEach((y, i) => { const z0 = i === LV.length - 1 ? SZ0 : BZ; g.add(box(.4, .035, SZ1 - z0, rose, 'shelf-board', [-2.81, y, (z0 + SZ1) / 2])); }); // only the top board runs the whole length, over the display shelves too
      bays.slice(1).forEach(z => [-2.635, -2.985].forEach(x => g.add(box(.045, 2.57, .045, rose, 'post', [x, 1.285, z], null, 1))));
      for (let i = 1; i < bays.length - 1; i++) { const a = bays[i], b = bays[i + 1];
        g.add(box(.016, .045, b - a - .045, rose, 'apron', [-2.632, .06, (a + b) / 2], null, 2));
        [a + .07, b - .07].forEach(z => g.add(box(.016, .08, .1, rose, 'apron-head', [-2.632, .043, z], null, 2))); } }); }
```

把 `shell();` 改成 `shell(); bookcase();`。

- [ ] **Step 2: 瀏覽器檢查**

加除錯把手，從水墨開門（`localStorage.setItem('study-scenery', 'ink'); location.reload();`）。

```js
(() => { const g = __dbg.scene.getObjectByName('ink-bookcase'); return { meshes:g.children.map(m => m.name), westBoard:!!__dbg.scene.getObjectByName('shelf-board') }; })()
```

Expected: `{ meshes:['ink-rosewood'], westBoard:false }`（西式書櫃沒被建出來）。

`shelf` 角落截圖：每本書都站在層板上（沒有浮空或陷進板子），開間兩端有前後立柱，書後面是白牆，分類銅牌貼在層板前緣，最下層板子下面有牙板。
點一本書，照常被拿下來翻開；按 Esc 放回去。

- [ ] **Step 3: commit**

刪掉 `window.__dbg`，`grep -n "__dbg" src/scripts/*.js` 沒有輸出，然後：

```bash
git add src/scripts/studyInkRoom.js
git commit -m "$(cat <<'EOF'
feat(room): stand the books on open shelves in the Chinese study

The boards are where the western bookcase has them, so no book moves; they
are held by posts at the ends of each bay, with no back and no sides.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: 博古架

**Files:**
- Modify: `src/scripts/studyInkRoom.js`

**Interfaces:**
- Consumes: Task 3 的 `piece`、`rose`、`roseD`；`kit` 的 `disp, DL, DW, DD, M, THREE, mk, box, cyl, pbr`。
- Produces: 場景裡的 `ink-curio`。

- [ ] **Step 1: 加 `curio()`**

在 `shell();` 那行之前加：

```js
  /* ================= 博古架: the display shelves as a stand of unequal compartments, over a cupboard ================= */
  // Laid out in the display shelves' own frame: x across the bay, z out from the wall. The four boards are where the western shelves have
  // them. Three of the levels are broken by an upright, each at a different place and none where an exhibit stands, and the one
  // compartment that holds nothing has a step in it, and a vase.
  function curio() { const { disp, DL, DW, DD } = kit, hx = DW / 2 - .0225, d = DD - .03, head = 2.5325; // `head`: the underside of the bookcase's top board, which runs on over this bay
    const celadon = pbr('ink-celadon', '#a9c4b4', { roughness:.18, clearcoat:1, clearcoatRoughness:.1 });
    piece(disp, 'ink-curio', g => {
      DL.forEach(y => g.add(box(DW, .035, DD, rose, 'display-shelf', [0, y, DD / 2])));
      [-hx, hx].forEach(x => [.0225, DD - .0225].forEach(z => g.add(box(.045, 2.57, .045, rose, 'post', [x, 1.285, z], null, 1))));
      [[3, .14], [2, 0], [0, -.05]].forEach(([i, x]) => { const y0 = DL[i] + .0175, y1 = i < 3 ? DL[i + 1] - .0175 : head; g.add(box(.022, y1 - y0, d, rose, 'upright', [x, (y0 + y1) / 2, DD / 2], null, 1)); });
      g.add(box(.345, .022, d, rose, 'step', [.47, 1.03, DD / 2], null, 0)); g.add(box(.022, .22, d, rose, 'upright', [.3, .928, DD / 2], null, 1));
      // the cupboard: two doors that meet on a bar, a round brass plate over the join with a pull either side, and an apron between its feet
      g.add(box(DW - .05, .62, DD - .02, rose, 'cupboard', [0, .47, DD / 2]));
      [-1, 1].forEach(s => g.add(box(DW / 2 - .075, .54, .012, roseD, 'cupboard-door', [s * (DW / 4 - .008), .47, DD - .004], null, 1)));
      g.add(box(.03, .56, .016, rose, 'cupboard-bar', [0, .47, DD - .002], null, 1));
      g.add(cyl(.055, .055, .004, 28, M.brass, 'cupboard-plate', [0, .5, DD + .008], [Math.PI / 2, 0, 0])); [-.02, .02].forEach(x => g.add(box(.008, .055, .004, M.brass, 'cupboard-pull', [x, .47, DD + .012])));
      g.add(box(DW - .09, .05, .016, rose, 'apron', [0, .135, DD - .03], null, 0));
      const profile = [[0, 0], [.034, 0], [.038, .015], [.058, .1], [.06, .135], [.046, .165], [.02, .182], [.019, .198], [.027, .205]].map(([r, y]) => new THREE.Vector2(r, y));
      g.add(mk(new THREE.LatheGeometry(profile, 32), celadon, 'vase', [.12, DL[0] + .0175, .2])); }); }
```

把呼叫那行改成 `shell(); bookcase(); curio();`（Task 4 還沒做的話是 `shell(); curio();`）。

- [ ] **Step 2: 瀏覽器檢查**

加除錯把手，從水墨開門。

```js
(() => { const g = __dbg.scene.getObjectByName('ink-curio'); return { meshes:g.children.map(m => m.name).sort(), westCabinet:!!__dbg.scene.getObjectByName('cabinet') }; })()
```

Expected: `{ meshes:['brass', 'ink-celadon', 'ink-rosewood', 'ink-rosewood-dark'], westCabinet:false }`。

`display` 角落截圖：四層展品都站在板子上；立板沒有穿過任何展品（最上層在雪山和棋盤之間，第二層在鐘和領獎台之間，最下層在錄影帶右邊）；右下那格有一階和一只青瓷瓶；
下櫃是對開門加圓銅面葉。逐一把滑鼠移到每件展品上，提示都出得來；點一件，面板照常打開。

- [ ] **Step 3: commit**

刪掉 `window.__dbg`，grep 沒有輸出，然後：

```bash
git add src/scripts/studyInkRoom.js
git commit -m "$(cat <<'EOF'
feat(room): show the exhibits on a curio stand in the Chinese study

The display shelves keep their four boards; uprights break three of the
levels at different places, clear of every exhibit, and the empty
compartment gets a step and a celadon vase. Below is a cupboard whose two
doors meet under a round brass plate.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 畫案和桌上的東西

**Files:**
- Modify: `src/scripts/studyInkRoom.js`

**Interfaces:**
- Consumes: Task 3 的 `piece`、`rose`、`roseD`；`kit` 的 `desk, rack, portrait, pf, DX, DY, DZ, RKW, RKD, THREE, mk, box, cyl, rod, std, pbr, col, rng`。
- Produces: 場景裡的 `ink-table`、`ink-book-box`、`ink-lamp`、`ink-orchid`、`ink-screen-frame`、`ink-screen-stand`。

- [ ] **Step 1: 加 `table()`**

在 `shell();` 那行之前加：

```js
  /* ================= 畫案: the desk as a painting table, and what stands on it that is this room's own ================= */
  // The top is the western desk's, to the centimetre. Under it: legs set in from the ends, a long apron front and back with a spandrel at
  // each leg, and two stretchers between the legs at each end. No drawer.
  function table() { const { desk, rack, portrait, pf, DX, DY, DZ, RKW, RKD } = kit, top = DY - .025, lx = .8, lz = .4;
    const clay = std('ink-clay', '#5b3a2e', { roughness:.7 }), cane = std('ink-bamboo', '#a98b55', { roughness:.6 }), soot = pbr('ink-inkstone', '#1c1e20', { roughness:.5, clearcoat:.3 }), wet = pbr('ink-wet-ink', '#060708', { roughness:.08, clearcoat:1 });
    piece(desk, 'ink-table', g => {
      g.add(box(2.15, .05, .95, rose, 'desk-top', [DX, DY, DZ]));
      [-1, 1].forEach(sx => { [-1, 1].forEach(sz => { g.add(box(.055, top, .055, rose, 'table-leg', [DX + sx * lx, top / 2, DZ + sz * lz], null, 1));
          g.add(box(.16, .11, .016, rose, 'table-spandrel', [DX + sx * lx, top - .075, DZ + sz * (lz + .02)], null, 0)); });
        [.3, .46].forEach(y => g.add(box(.03, .03, 2 * lz, rose, 'table-stretcher', [DX + sx * lx, y, DZ], null, 2))); });
      [-1, 1].forEach(sz => g.add(box(2.05, .05, .016, rose, 'table-apron', [DX, top - .03, DZ + sz * (lz + .02)], null, 0)));
      // an inkstone with ink in its well, a brush laid on a rest shaped like three peaks, and a pot of brushes behind the laptop's left
      g.add(box(.12, .022, .17, soot, 'inkstone', [2.12, DY + .036, -1.7])); g.add(cyl(.038, .038, .003, 24, wet, 'ink', [2.12, DY + .0485, -1.72]));
      g.add(box(.11, .022, .022, clay, 'brush-rest', [2.34, DY + .036, -1.66])); [-.035, 0, .035].forEach((dx, i) => g.add(mk(new THREE.ConeGeometry(.014, i === 1 ? .04 : .028, 12), clay, 'brush-rest', [2.34 + dx, DY + .047 + (i === 1 ? .018 : .012), -1.66])));
      g.add(rod([2.2, DY + .034, -1.6], [2.36, DY + .066, -1.67], .0045, cane, 'brush')); g.add(rod([2.36, DY + .066, -1.67], [2.39, DY + .072, -1.683], .0055, soot, 'brush-tip'));
      g.add(cyl(.038, .038, .1, 24, cane, 'brush-pot', [1.4, DY + .075, -2.3]));
      [[-.012, .01, -.1], [.014, -.006, .12], [0, .014, .02]].forEach(([dx, dz, lean]) => { g.add(rod([1.4 + dx, DY + .05, -2.3 + dz], [1.4 + dx + lean * .2, DY + .25, -2.3 + dz], .004, cane, 'brush')); g.add(rod([1.4 + dx + lean * .2, DY + .25, -2.3 + dz], [1.4 + dx + lean * .23, DY + .28, -2.3 + dz], .005, soot, 'brush-tip')); }); });
    // the box the series stand in: the western rack's shape, in rosewood
    piece(rack, 'ink-book-box', g => { g.add(box(RKW, .018, RKD, rose, 'rack-base', [0, .009, 0])); g.add(box(RKW - .036, .12, .014, rose, 'rack-back', [0, .078, -RKD / 2 + .007]));
      [-1, 1].forEach(s => g.add(box(.018, .19, RKD, rose, 'rack-end', [s * (RKW / 2 - .009), .113, 0]))); });
    // The lamp: a paper lantern of six sides hung from the arm of a stand. The lantern is where the western lamp's shade is, for the
    // light and its glow are the stage's and stay put.
    const paper = new THREE.MeshStandardMaterial({ name:'ink-lamp-paper', color:col('#f3e2bd'), emissive:col('#ffb15a'), emissiveIntensity:.6, roughness:.9 });
    piece(desk, 'ink-lamp', g => { g.position.set(2.56, DY + .025, -2.33);
      g.add(box(.11, .022, .11, rose, 'lamp-base', [0, .011, 0])); g.add(box(.022, .62, .022, rose, 'lamp-stem', [0, .32, 0], null, 1)); g.add(rod([0, .62, 0], [-.18, .625, .068], .009, rose, 'lamp-arm'));
      g.add(rod([-.16, .62, .06], [-.16, .585, .06], .003, soot, 'lamp-cord')); g.add(cyl(.055, .055, .14, 6, paper, 'lamp-paper', [-.16, .51, .06]));
      [.585, .435].forEach(y => g.add(cyl(.06, .06, .012, 6, roseD, 'lamp-cap', [-.16, y, .06]))); g.add(cyl(.005, .003, .06, 8, std('ink-tassel', '#c2272d', { roughness:.8 }), 'lamp-tassel', [-.16, .4, .06])); });
    // an orchid in a clay pot, where the snake plant stands: long narrow leaves that rise and fall over, and one stalk in flower
    piece(desk, 'ink-orchid', g => { g.position.set(.74, DY + .025, -2.2); const R = rng(31), leaf = std('ink-orchid-leaf', '#3f6e3c', { roughness:.55, side:THREE.DoubleSide });
      g.add(cyl(.052, .04, .07, 6, clay, 'pot', [0, .035, 0])); g.add(cyl(.046, .046, .004, 12, std('ink-soil', '#2a1d14', { roughness:1 }), 'soil', [0, .068, 0]));
      for (let i = 0; i < 11; i++) { const H = .2 + R() * .16, Wd = .011 + R() * .006, a = i * 2.4 + R() * .5, bow = .35 + R() * .5, geo = new THREE.PlaneGeometry(1, 1, 1, 10), p = geo.attributes.position;
        for (let q = 0; q < p.count; q++) { const u = p.getX(q), v = p.getY(q) + .5; p.setXYZ(q, u * Wd * Math.sin(Math.PI * (.12 + v * .86)), H * (v - bow * .55 * v * v), bow * H * v * v * .9 + .006); }
        geo.computeVertexNormals(); geo.rotateY(a); g.add(mk(geo, leaf, 'orchid-leaf', [0, .068, 0])); }
      g.add(rod([0, .068, 0], [.03, .3, .02], .0025, std('ink-orchid-stalk', '#6b7d3e'), 'orchid-stalk')); [[.012, .2, .012], [.022, .25, .02], [.032, .3, .018]].forEach(p => g.add(mk(new THREE.SphereGeometry(.011, 10, 8), std('ink-orchid-bloom', '#efe7c9', { roughness:.6 }), 'orchid-bloom', p))); });
    // the portrait, out of its brass edges and into a table screen: a wooden frame round the panel, and two feet on a rail
    piece(pf, 'ink-screen-frame', g => { [-.108, .108].forEach(x => g.add(box(.024, .274, .026, rose, 'screen-frame', [x, 0, .001], null, 1))); [-.134, .134].forEach(y => g.add(box(.24, .024, .026, rose, 'screen-frame', [0, y, .001], null, 0))); });
    piece(portrait, 'ink-screen-stand', g => { [-.1, .1].forEach(x => g.add(box(.028, .05, .12, rose, 'screen-foot', [x, .025, -.02], null, 2))); g.add(box(.2, .02, .03, rose, 'screen-rail', [0, .02, -.012], null, 0)); }); }
```

把呼叫那行加上 `table();`（例如 `shell(); bookcase(); curio(); table();`）。

- [ ] **Step 2: 瀏覽器檢查**

加除錯把手，從水墨開門。

```js
['ink-table', 'ink-book-box', 'ink-lamp', 'ink-orchid', 'ink-screen-frame', 'ink-screen-stand'].map(n => !!__dbg.scene.getObjectByName(n)).concat(['desk-leg', 'side-lamp', 'potted-plant', 'pen'].map(n => !!__dbg.scene.getObjectByName(n)))
```

Expected: 前六個 `true`，後四個 `false`。

`desk` 角落截圖：筆電、三張稿紙、三本系列書都平放在桌面上；紙燈的燈罩有光暈；蘭花在書匣左邊；自畫像在木框裡、兩隻腳站在桌上；筆筒、硯台、擱在筆架上的毛筆沒有壓到稿紙或筆電。
點筆電、自畫像、一張稿紙、一本系列書，都照常打開。

- [ ] **Step 3: commit**

刪掉 `window.__dbg`，grep 沒有輸出，然後：

```bash
git add src/scripts/studyInkRoom.js
git commit -m "$(cat <<'EOF'
feat(room): write at a painting table in the Chinese study

The desk's top stays where it is, on legs set in from its ends. On it the
lamp is a paper lantern hung from a stand, the plant an orchid, the portrait
stands in a table screen, and there is an inkstone, a brush on its rest and
a pot of brushes.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: 矮几、圈椅、方几

**Files:**
- Modify: `src/scripts/studyInkRoom.js`

**Interfaces:**
- Consumes: Task 3 的 `piece`、`rose`、`roseD`；`kit` 的 `tvc, chair, side, CW, CD, THREE, mk, box, cyl, rod`。
- Produces: 場景裡的 `ink-stand`、`ink-chair`、`ink-side-table`。

- [ ] **Step 1: 加 `stand()` 和 `seats()`**

在 `shell();` 那行之前加：

```js
  /* ================= the stand under the TV ================= */
  // Four legs and three boards, the boards where the western cabinet has its top, its shelf and its bottom: the TV, the console and the
  // cartridges stay where they are. Open at the back; a low rail round three sides of the middle board.
  function stand() { const { tvc, CW, CD } = kit, hx = CW / 2 - .02, hz = CD / 2 - .02;
    piece(tvc, 'ink-stand', g => {
      [-1, 1].forEach(sx => [-1, 1].forEach(sz => g.add(box(.04, .76, .04, rose, 'stand-leg', [sx * hx, .38, sz * hz], null, 1))));
      g.add(box(CW + .02, .03, CD + .02, rose, 'stand-top', [0, .775, 0])); g.add(box(CW - .05, .018, CD - .03, rose, 'stand-shelf', [0, .4, -.01])); g.add(box(CW - .01, .025, CD - .01, rose, 'stand-shelf', [0, .0625, 0]));
      [-1, 1].forEach(s => { g.add(box(CW - .08, .04, .014, rose, 'stand-apron', [0, .74, s * hz], null, 0)); g.add(box(.014, .04, CD - .08, rose, 'stand-apron', [s * hx, .74, 0], null, 2));
        g.add(box(.014, .03, CD - .08, rose, 'stand-rail', [s * hx, .47, 0], null, 2)); });
      g.add(box(CW - .08, .03, .014, rose, 'stand-rail', [0, .47, -hz], null, 0)); }); }

  /* ================= 圈椅 and 方几: the armchair and the side table ================= */
  // The chair keeps the armchair's cushion, and the dog asleep on it. Round it: a seat frame, front legs that run up to the ends of the
  // arms and back legs that run up to the rail, the rail itself in one horseshoe from arm to arm over the back, a splat, a spindle under
  // each arm, and stretchers low down. The table keeps its top's height: a waist under the top, four legs, a stretcher on each side.
  function seats() { const { chair, side } = kit;
    piece(chair, 'ink-chair', g => {
      g.add(box(.7, .05, .66, rose, 'chair-seat', [0, .39, 0]));
      [-1, 1].forEach(s => { g.add(cyl(.022, .022, .72, 12, rose, 'chair-leg', [s * .31, .36, .29])); g.add(cyl(.022, .022, .9, 12, rose, 'chair-leg', [s * .29, .45, -.29]));
        g.add(rod([s * .33, .415, 0], [s * .352, .775, .02], .012, rose, 'chair-spindle')); g.add(box(.028, .025, .58, rose, 'chair-stretcher', [s * .3, .15, 0], null, 2)); g.add(box(.012, .05, .52, rose, 'chair-apron', [s * .31, .34, 0], null, 2)); });
      const rail = [[-.37, .7, .37], [-.345, .715, .28], [-.355, .76, .05], [-.29, .9, -.27], [0, .97, -.345], [.29, .9, -.27], [.355, .76, .05], [.345, .715, .28], [.37, .7, .37]].map(p => new THREE.Vector3(...p));
      g.add(mk(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rail), 48, .019, 10), rose, 'chair-rail'));
      g.add(box(.15, .56, .014, rose, 'chair-splat', [0, .69, -.325], [-.055, 0, 0], 1));
      g.add(box(.62, .03, .035, rose, 'chair-stretcher', [0, .1, .29], null, 0)); g.add(box(.58, .025, .028, rose, 'chair-stretcher', [0, .1, -.29], null, 0)); g.add(box(.56, .05, .012, rose, 'chair-apron', [0, .34, .3], null, 0)); });
    piece(side, 'ink-side-table', g => {
      g.add(box(.52, .04, .52, rose, 'table-top', [0, .6, 0])); g.add(box(.45, .03, .45, roseD, 'table-waist', [0, .565, 0]));
      [-1, 1].forEach(sx => [-1, 1].forEach(sz => g.add(box(.04, .58, .04, rose, 'table-leg', [sx * .23, .29, sz * .23], null, 1))));
      [-1, 1].forEach(s => { g.add(box(.42, .025, .025, rose, 'table-stretcher', [0, .2, s * .23], null, 0)); g.add(box(.025, .025, .42, rose, 'table-stretcher', [s * .23, .2, 0], null, 2)); }); }); }
```

把呼叫那行補齊成 `shell(); bookcase(); curio(); table(); stand(); seats();`。

- [ ] **Step 2: 瀏覽器檢查**

加除錯把手，從水墨開門。

```js
['ink-stand', 'ink-chair', 'ink-side-table'].map(n => !!__dbg.scene.getObjectByName(n)).concat(['cab-top', 'chair-frame', 'side-top'].map(n => !!__dbg.scene.getObjectByName(n)), [!!__dbg.scene.getObjectByName('seat-cushion'), __dbg.scene.getObjectByName('dog').children.length])
```

Expected: `[true, true, true, false, false, false, true, 1]`（最後一個要等吉利載入）。

`tv` 角落截圖：電視在几面上，主機和手把在中層板上，卡帶在底層板上，線都還接著。點電視照常進遊樂器選單，Esc 出來。
`resize_window {width: 1440, height: 820}`，回中心視角截圖：右前方是圈椅，吉利睡在坐墊上、沒有被椅圈或靠背板穿過；旁邊的方几上是那疊書。看完 `resize_window {preset: "desktop"}`。

- [ ] **Step 3: commit**

刪掉 `window.__dbg`，grep 沒有輸出，然後：

```bash
git add src/scripts/studyInkRoom.js
git commit -m "$(cat <<'EOF'
feat(room): put the TV on a low stand and the dog on a round-backed chair in the Chinese study

The stand's three boards are where the western cabinet has its top, shelf
and bottom. The chair keeps the armchair's cushion, with a horseshoe rail
round it; the side table keeps its top's height on four legs and a waist.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: 收尾

**Files:**
- Delete: `src/scripts/inkroom-demo.js`（未進版控）
- Modify: `.claude/skills/sync-claude-design/build-design.mjs`（L3、L16、L117、L162）
- Modify: `.claude/skills/sync-claude-design/SKILL.md`（L13、L18、L55）
- Modify: `README.md`（`src/scripts/` 的檔案樹，L43–L45）

**Interfaces:**
- Consumes: 前面全部。
- Produces: 無新介面。

- [ ] **Step 1: 輕量模式（Review Focus 4）**

加除錯把手。`localStorage.setItem('study-scenery', 'ink')`，開 `http://localhost:4331/?quality=low`。門開了之後：

```js
({ low:document.body.classList.contains('lite'), built:Object.keys(__dbg.WORLDS).filter(k => __dbg.WORLDS[k].room), floorMap:__dbg.scene.getObjectByName('ink-floor').material.map.image.width })
```

Expected: `{ low:true, built:['ink'], floorMap:512 }`。截圖：中式書齋完整，花窗的線條還在（沒有因為解析度減半而斷掉）。

`__dbg.turnWorld()`，0.7 秒後是那扇門，6 秒後門開了：西式書房完整，木地板、牆面都有貼圖。再 `__dbg.turnWorld()`：瞬間回中式書齋。

檢查完還原：開 `http://localhost:4331/?quality=high`，然後 `localStorage.removeItem('study-quality'); localStorage.removeItem('study-scenery');`。

- [ ] **Step 2: 手機寬度（Review Focus 5）**

`resize_window {preset: "mobile"}`，`localStorage.setItem('study-scenery', 'ink'); location.reload();`。門開了之後截圖：底部 dock 六格都在，畫面是中式書齋。
依序 `shelf`、`display`、`desk`、`tv` 各飛一次、各截一張：四個角落都看得到該看的家具。
`__dbg.turnWorld()`：0.7 秒後截圖是那扇門，而且 dock 不見了；門開了之後 dock 一顆一顆回來，畫面是西式書房。
看完 `resize_window {preset: "desktop"}`，並清掉 `study-quality`（手機模擬的觸控裝置可能被記成輕量模式）和 `study-scenery` 兩個 key。

- [ ] **Step 3: draw call 沒有暴增**

桌機寬度、一般模式，兩個世界各自回中心視角後各取一次：

```js
__dbg.renderer.info.render.calls
```

Expected: 水墨的數字不高於湖景的數字（中式的零件都 `weld` 過，西式的沒有）。比較高的話，找出沒進 `piece` 的零件：列出每個名字以 `ink-` 開頭的群組底下有幾個 mesh。

- [ ] **Step 4: 刪 demo**

```bash
rm src/scripts/inkroom-demo.js; grep -rn "inkroom" src
```

Expected: 沒有輸出。

- [ ] **Step 5: `build-design.mjs`**

- L3：`//   study.js, studyTextures.js, studyWorker.js  <- src/scripts/*, verbatim` 換成
  `//   study.js, studyWestRoom.js, studyInkRoom.js, studyTextures.js, studyWorker.js  <- src/scripts/*, verbatim`
- L16：`const SCRIPTS = ['study.js', 'studyTextures.js', 'studyWorker.js'], PAGE = 'Paul Study.html';` 換成
  `const SCRIPTS = ['study.js', 'studyWestRoom.js', 'studyInkRoom.js', 'studyTextures.js', 'studyWorker.js'], PAGE = 'Paul Study.html';`
- L117：`     study.js, studyTextures.js and studyWorker.js are the files in src/scripts/, unchanged. -->` 換成
  `     study.js, studyWestRoom.js, studyInkRoom.js, studyTextures.js and studyWorker.js are the files in src/scripts/, unchanged. -->`
- L162：`[...['studyTextures.js', 'study.js', 'studyWorker.js'].filter(f => changed.includes(f)), PAGE]` 換成（被 import 的先上傳）
  `[...['studyTextures.js', 'studyWestRoom.js', 'studyInkRoom.js', 'study.js', 'studyWorker.js'].filter(f => changed.includes(f)), PAGE]`

- [ ] **Step 6: `SKILL.md`**

- L13：`rebuild four files from the repo` 換成 `rebuild six files from the repo`
- L18：`` | `study.js`, `studyTextures.js`, `studyWorker.js` | `src/scripts/*`, byte for byte | `` 換成
  `` | `study.js`, `studyWestRoom.js`, `studyInkRoom.js`, `studyTextures.js`, `studyWorker.js` | `src/scripts/*`, byte for byte | ``
- L55：`upload all four files` 換成 `upload all six files`

- [ ] **Step 7: `README.md`**

把

```
│   ├── study.js          # 書房場景與互動 (three.js)
```

換成

```
│   ├── study.js          # 書房的舞台：鏡頭、兩間房間共用的東西（書、展品、桌上與櫃上的東西）、互動、切換世界 (three.js)
│   ├── studyWestRoom.js  # 配秋天湖景的西式書房：牆、窗、家具骨架
│   ├── studyInkRoom.js   # 配水墨山水的中式書齋，第一次點橡皮鴨切過去時才載入
```

- [ ] **Step 8: 最後一次完整檢查、build、commit**

刪掉 `window.__dbg`。

```bash
grep -n "__dbg" src/scripts/*.js; npm run build 2>&1 | tail -5; ls dist/_astro | grep -i inkroom; grep -c "studyInkRoom" dist/index.html
```

Expected: grep 沒有輸出；build 成功；有 `studyInkRoom.<hash>.js`；`dist/index.html` 裡 0 次。

`preview_start {name: "astro-preview"}`（`http://localhost:4322/`，供應 `dist/`）：全新訪客開門是湖景；點鴨子重放開門到中式書齋；重新整理直接是中式書齋；console 沒有錯誤。

```bash
git add README.md .claude/skills/sync-claude-design/build-design.mjs .claude/skills/sync-claude-design/SKILL.md
git commit -m "$(cat <<'EOF'
chore: carry the two room scripts to Claude Design, and list them in the README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
git status --short
```

Expected: 只剩 `?? .claude/launch.json`。commit 之後 `node .claude/skills/sync-claude-design/build-design.mjs <scratchpad>/design-sync` 應該列出五個腳本要上傳
（真的同步到 Claude Design 不在這份計畫裡，等使用者說「同步回 claude design」）。
