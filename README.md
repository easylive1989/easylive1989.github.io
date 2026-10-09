# Paul's Blog

使用 [Astro](https://astro.build/) 建立的靜態部落格網站，內容來源為 Notion 資料庫。

## 網站

https://paul-learning.dev

## 技術棧

- **框架**: Astro (靜態網站生成)
- **內容來源**: Notion API (`@notionhq/client`)
- **首頁**: three.js 做的 3D 書房（互動式，內容在建置時從 Notion 抓好）
  - 左牆書架靠展示架的那一格是「閱讀書單」裡讀完的書，依類型分區；書的 Notion 頁面裡有筆記的，抽出來就能翻，沒寫的只有書名頁。另一格是裝飾書
  - 寫的東西都在書桌：系列在桌上的書架，最新的幾篇是桌上的稿紙
- **部署**: GitHub Pages
  - GitHub Pages 每個檔案只給 10 分鐘快取，所以有 Service Worker（`public/sw.js`）：hash 過的檔案優先讀快取，頁面優先走網路，去過的書房離線也打得開。要拿掉它，就部署一個在 activate 時刪快取並 `unregister()` 的 `sw.js`

## 專案結構

```
src/
├── components/       # SiteHead、ArchiveView、Notion block 渲染元件
│   └── notion/       # Notion block 渲染元件
├── integrations/     # build 後處理：Cubic 11 像素字型縮成書房用到的字、替拆出去的 chunk 加 modulepreload
├── layouts/          # DeskLayout：內容頁共用（木桌底、紙張、部落格的刊頭：站名、三個分頁、「書房」回 3D 書房）
├── lib/              # 工具函式 (Notion API、資料處理、圖片等)
│   ├── study.ts      # 把 Notion 資料對應到書房裡的物件（書架、展示架、書桌）
│   └── profile.ts    # 他是誰：寫的書、鐵人賽、演講、聯絡方式；書房和關於我頁共用
├── pages/            # 頁面路由
│   ├── index.astro          # 首頁：3D 書房
│   ├── archive.astro        # 文章彙整
│   ├── reading.astro        # 書單（書架）
│   ├── about.astro          # 關於我：書、鐵人賽、演講、哪裡找得到他
│   ├── reading/[id].astro   # 一本讀完的書的筆記
│   ├── notes/               # 碎碎念：列表與單則
│   ├── study/[id].astro     # 書房裡翻開的內文（裸片段，給書房 fetch；不進 sitemap）
│   ├── rss.xml.ts           # RSS feed
│   └── [category]/
│       ├── index.astro      # 分類文章列表
│       └── [slug].astro     # 文章內頁
├── scripts/
│   ├── study.js          # 書房場景與互動 (three.js)
│   ├── studyTextures.js  # 程序化貼圖（木紋、灰泥、地板……），不碰 DOM，Worker 也能跑
│   └── studyWorker.js    # 在 Worker 裡畫上面那些貼圖，開頁時主執行緒不被卡住
└── styles/           # broadsheet.css (設計系統)、desk.css (內容頁共用)、
                      # 各頁樣式 (prose / reading / archive)
scripts/
└── check-blog-nav.mjs    # 建置後檢查每個部落格頁：站名、亮著的分頁，書房維持本名
```

## 開發

### 環境變數

在根目錄建立 `.env` 檔案，設定 Notion API 相關變數。

### 指令

```bash
npm install          # 安裝依賴
npm run dev          # 啟動開發伺服器
npm run build        # 建置靜態網站
npm run preview      # 預覽建置結果
npm run check:nav    # 建置後檢查部落格每頁的標題與分頁（先 npm run build）
```
