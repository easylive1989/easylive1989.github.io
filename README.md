# Paul's Blog

使用 [Astro](https://astro.build/) 建立的靜態部落格網站，內容來源為 Notion 資料庫。

## 網站

https://paul-learning.dev

## 技術棧

- **框架**: Astro (靜態網站生成)
- **內容來源**: Notion API (`@notionhq/client`)
- **樣式**: 月門水墨：粉牆、墨色、紅日，每頁頂上一片水墨山水（`src/components/Landscape.astro`，手機也顯示）
  - 首頁就是「所有文章」；舊的 `/archive/` 轉到首頁
  - 「書架」是暗門後的書櫃：點導覽列的書架，頁面從中間裂開、書架從暗處浮上來；「關於我」用推進山水轉場（`src/layouts/deskFx.js`）
- **部署**: GitHub Pages
  - `public/sw.js` 是退役用的 Service Worker：之前 3D 書房留下的快取會被它清掉並自行解除註冊，過幾個月可以刪掉

## 專案結構

```
src/
├── components/       # SiteHead、Landscape（水墨山水）、ArchiveView、Notion block 渲染元件
│   └── notion/       # Notion block 渲染元件
├── layouts/          # DeskLayout：每頁共用（粉牆、山水、刊頭：站名、三個分頁、RSS）
│   └── deskFx.js     # 頁與頁之間的機關：書架的暗門、關於我的推進山水
├── lib/              # 工具函式 (Notion API、資料處理、圖片等)
│   ├── excerpt.ts    # 沒有摘要的頁面，從內文開頭取描述、取第一張圖當分享圖
│   └── profile.ts    # 他是誰：寫的書、鐵人賽、演講、聯絡方式（關於我頁）
├── pages/            # 頁面路由
│   ├── index.astro          # 首頁：所有文章
│   ├── reading.astro        # 書架（暗門後的書櫃）
│   ├── about.astro          # 關於我：書、鐵人賽、演講、哪裡找得到他
│   ├── reading/[id].astro   # 一本讀完的書的筆記
│   ├── notes/[id].astro     # 一則碎碎念
│   ├── rss.xml.ts           # RSS feed（文章與碎碎念，附摘要）
│   └── [category]/
│       ├── index.astro      # 分類文章列表
│       └── [slug].astro     # 文章內頁
└── styles/           # broadsheet.css (設計系統)、desk.css (共用，月門水墨的色調)、
                      # 各頁樣式 (prose / reading / archive / heat)
scripts/
└── check-blog-nav.mjs    # 建置後檢查每一頁：站名、亮著的分頁、/archive/ 轉到首頁
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
npm run check:nav    # 建置後檢查每頁的標題與分頁（先 npm run build）
```
