# 書房與部落格兩種模式 設計文件

日期：2026-10-09
影響範圍：`src/pages/index.astro`、`src/scripts/study.js`、`src/layouts/DeskLayout.astro`、`src/styles/desk.css`、`src/components/SiteHead.astro`、
`src/lib/study.ts`、新增 `src/lib/profile.ts`、新增 `src/pages/about.astro`、所有用 `DeskLayout` 的頁面、`site.config.yaml`、`src/lib/config.ts`、
新增 `public/assets/my-book-cover.jpg`

## 目標

房間選單裡的「離開書房 → 書單／文章」會跳到另一種樣子的頁面，顯得突兀，又跟書架、書桌重複。改成網站有兩種明確的呈現模式，各自有一個 tab
可以切到另一邊：

- **書房**：現在的 3D 房間。
- **部落格**：傳統部落格形式，頂部有「所有文章」「書架」「關於我」三個 tab，加一個隔開的「我的書房」tab。

頁面本身的內容（所有文章的年份列表、書架的木櫃、文章內頁）一律不動，只換頂部導覽。

## 網址

| 模式 | 頁面 | 網址 |
|---|---|---|
| 書房 | 3D 房間 | `/`（不變，仍是首頁） |
| 部落格 | 所有文章 | `/archive/` |
| 部落格 | 書架 | `/reading/` |
| 部落格 | 關於我 | `/about/`（新增） |
| 部落格 | 內頁 | `/[category]/`、`/[category]/[slug]/`、`/notes/[id]/`、`/reading/[id]/` |

- 書房的「部落格」tab 連到 `/archive/`。
- 部落格的「我的書房」連到 `/`。

## 書房的改動

導覽列從

```
回中心 ┆ 書架 展示架 書桌 遊樂器 ┆ ⋯（離開書房：書單、文章）
```

改成

```
回中心 ┆ 書架 展示架 書桌 遊樂器 ┆ 部落格
```

- 拿掉 `⋯` 按鈕和 `.menu`，在第二條分隔線後加一個 `<a class="opt hz">`，連到 `/archive/`，`title` 是「所有文章、書架、關於我」，
  `--i:7`（照順序進場）。圖示是一本打開的書，跟其他 tab 一樣只在手機版顯示；手機底部列多一格。
- `study.js` 裡 `moreBtn`、`menu`、`closeMenu` 相關的程式一起拿掉；`index.astro` 裡 `#hud .more`、`#hud .menu` 的 CSS 也拿掉。
- 備用連結（`<noscript>`、不支援 WebGL、門卡住）改成「所有文章 · 書架 · 關於我」，原本的 RSS 連結保留。
- 像素字型的子集是 build 時掃 `index.html` 產生的（`src/integrations/subsetPixelFont.mjs`），「部落格」三個字會自動包含，不用另外處理。

## 部落格頂部：刊頭 tab 列

取代 `DeskLayout` 現在左上角的「← 回書房」和麵包屑：

```
保羅的學習筆記                    所有文章  書架  關於我  │ [🚪 我的書房]
                                  ‾‾‾‾‾‾‾‾
```

- 左邊是站名「保羅的學習筆記」，serif 粗體，點了回 `/archive/`。
- 右邊三個 tab 是純文字，目前所在的那個加粗、底下加一條青色（`--color-accent`）底線。
- 一條細分隔線之後是「我的書房」，外框按鈕，前面有門的圖示，hover 時填滿青色。
- 頂部列的寬度和左右留白跟著頁面的紙張（`desk-reading` 或 `desk-wide`），所以會跟紙張左右對齊。
- 跟著頁面捲走，不固定在畫面上；右下角的回到頂端按鈕保留。
- 手機版（≤ 640px）：站名自成一行；第二行是三個 tab，「我的書房」靠右，不顯示分隔線。
- 樣式以 2026-10-09 的 demo（A 刊頭）為準。

### 哪個 tab 亮

`DeskLayout` 新增 `tab` prop（`'archive' | 'reading' | 'about'`），取代 `crumbs`：

| 頁面 | `tab` |
|---|---|
| `archive.astro`、`[category]/index.astro`、`[category]/[slug].astro`、`notes/[id].astro` | `archive` |
| `reading.astro`、`reading/[id].astro` | `reading` |
| `about.astro` | `about` |

麵包屑整個拿掉（`crumbs` prop、`.crumbs` 的 CSS），由 tab 表示人在哪裡。

### 分頁標題

部落格模式的頁面，分頁標題的站名改成「保羅的學習筆記」，例如「所有文章 | 保羅的學習筆記」，`og:title`、`twitter:title` 也一樣。
書房（首頁）維持「保羅的書房」。

- `site.config.yaml` 的 `site` 加 `blogTitle: "保羅的學習筆記"`，`config.ts` 的型別一起補上。
- `SiteHead` 新增 `siteTitle` prop，預設是 `config.site.title`；`DeskLayout` 傳 `config.site.blogTitle` 進去。頂部的站名也讀同一個值。
- RSS（feed 的標題、`<link rel="alternate">` 的 title）維持「保羅的書房」，不改。

### 名稱一致

書單頁的分頁標題從「書單」改成「書架」，跟 tab 一致。頁面內的「讀過的書」等文字不動。

## 關於我 `/about/`

用 `DeskLayout`（`tab="about"`、`width="reading"`），一張紙，由上到下：

1. **開頭**：頭像（`config.author.avatar`）、「Hi, I'm」、名字（`config.author.name`）、「台中 · 歡迎聊合作」。
2. **簡介**：`config.author.bio`。房間自畫像卡片上那段成就摘要（「出了《…》、兩度拿下 iThome 鐵人賽佳作…」）不放；房間的卡片照舊保留它。
3. **我出的書**：書封圖、書名、作者、一句介紹、「購書 ↗」按鈕（天瓏）。
4. **iThome 鐵人賽**：每屆一列：年份、系列名稱（連到 iThome）、「連續三十天、一天一篇」、成績標籤（佳作用金色標籤，鐵人練成用一般標籤），新的在上面。
5. **演講**：每場一列：年份、講題（連到活動頁）、主辦單位，新的在上面。
6. **Find me at**：GitHub、Threads、LinkedIn、Email。

版面以 demo 為準：各區塊之間用細線隔開，區塊標題是青色的小型大寫字；手機版頭像縮小，聯絡方式改成一欄。

### 共用資料 `src/lib/profile.ts`

出的書、鐵人賽、演講、聯絡方式，現在寫死在 `src/lib/study.ts`（`MY_BOOK_URL`、`IRONMAN`、`TALKS`、`ITHOME_SERIES`、`githubLabel()`、
`items.mb` 裡的書名與介紹、`about.tagline`）。搬到新的 `src/lib/profile.ts`，由 `study.ts` 和 `about.astro` 一起讀：

- `MY_BOOK`：書名、作者、一句介紹、購書網址、書封路徑，以及房間 3D 書封用的 `front`（副標、書頂文案、書腰兩行、徽章）。
- `IRONMAN`：`[年份, 成績, 系列, 網址, 是否得獎]`，舊到新（房間依這個順序擺熊）。
- `TALKS`：`[年份, 講題, 主辦, 網址]`，新到舊。
- `ITHOME_SERIES`：系列名稱 → iThome 網址（書桌上的系列書也會用到）。
- `TAGLINE`：「台中 · 歡迎聊合作」。
- `channels(config)`：回傳聯絡方式 `[名稱, 顯示文字, 網址][]`，就是現在的 `githubLabel()`。

搬移之後房間的行為和 build 出來的資料必須完全一樣（可以比對搬移前後 `dist/index.html` 裡的 `study-data` JSON）。

### 書封

- 來源：天瓏網路書店的商品圖 `https://cf-assets2.tenlong.com.tw/products/images/000/227/268/original/9786264140010_bc.jpg`
  （663×929 JPEG，約 130 KB，立體書的照片，看得到書背）。
- 用 `sharp` 縮成寬 360px 的 JPEG，存成 `public/assets/my-book-cover.jpg` commit 進 repo，不直接連天瓏的圖。
- 關於我頁顯示寬度約 120px（手機 96px），加 `width`、`height` 屬性避免版面跳動，`loading="lazy"`。
- 房間裡的 3D 書維持現在的程序化畫法，不換成這張圖。

## 不做的事

- 頁面內容的改版（年份列表、木書架、文章內頁維持原樣）。
- 關於我不放 side project、Playbox。
- 不記住使用者上次在哪個模式；首頁永遠是書房。
- RSS 不改名。
- `desk.css` 開頭那段「從房間不會走到這些頁面」的說明要改成符合新的事實，但不重構其他 CSS。

## 驗證

這個 repo 沒有測試框架。每個 task 完成時：

1. `npm run build` 成功。
2. 用 preview（`astro-preview`，port 4322）逐頁檢查桌機和手機寬度：
   - 部落格每一種頁面的 tab 有亮對、站名和分頁標題是「保羅的學習筆記」。
   - 部落格 →「我的書房」回到房間；房間 →「部落格」到所有文章。
   - 房間導覽列沒有 `⋯`，「部落格」tab 用的是像素字型（字型子集有包含這三個字），手機底部列排得下。
   - 首頁分頁標題仍是「保羅的書房」。
3. 抽出 `profile.ts` 的 task：比對搬移前後 `study-data` JSON 完全相同。
