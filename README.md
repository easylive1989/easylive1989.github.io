# Paul's Blog

使用 [Astro](https://astro.build/) 建立的靜態部落格網站，內容來源為 Notion 資料庫。

## 網站

https://paul-learning.dev

## 技術棧

- **框架**: Astro (靜態網站生成)
- **內容來源**: Notion API (`@notionhq/client`)
- **首頁**: three.js 做的 3D 書房（互動式，內容在建置時從 Notion 抓好）
- **部署**: GitHub Pages

## 專案結構

```
src/
├── components/       # SiteHead、ArchiveView、Notion block 渲染元件
│   └── notion/       # Notion block 渲染元件
├── layouts/          # DeskLayout：內容頁共用（木桌底、紙張、「回書房」HUD）
├── lib/              # 工具函式 (Notion API、資料處理、圖片等)
│   └── study.ts      # 把 Notion 資料對應到書房裡的物件（書架、展示架、書桌）
├── pages/            # 頁面路由
│   ├── index.astro          # 首頁：3D 書房
│   ├── archive.astro        # 文章彙整
│   ├── reading.astro        # 書單（書架）
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
```
