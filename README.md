# Learn with Paul

使用 [Astro](https://astro.build/) 建立的靜態部落格網站，內容來源為 Notion 資料庫。

## 網站

https://easylive1989.github.io/

## 技術棧

- **框架**: Astro (靜態網站生成)
- **內容來源**: Notion API (`@notionhq/client`)
- **測試**: Vitest (單元測試) + Playwright (E2E 測試)
- **部署**: GitHub Pages

## 專案結構

```
src/
├── components/       # Astro 元件
│   └── notion/       # Notion block 渲染元件
├── layouts/          # 頁面佈局
├── lib/              # 工具函式 (Notion API、資料處理、圖片等)
├── pages/            # 頁面路由
│   ├── index.astro          # 首頁 (文章系列列表)
│   └── [series]/
│       ├── index.astro      # 系列文章列表
│       └── [slug].astro     # 文章內頁
└── styles/           # 全域樣式
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
npm run test         # 執行單元測試
npm run test:e2e     # 執行 E2E 測試
```
