# Paul's Blog

使用 [Astro](https://astro.build/) 建立的靜態部落格網站，內容來源為 [Think Space](https://think.paul-learning.dev)（`site.config.yaml` 的 `source: think`）：build 時不用 token 讀公開的文章與書（`src/lib/think.ts`，markdown 由 `src/lib/think-markdown.mjs` 畫成 HTML）。`部落格/<分類>` 資料夾的公開文章是文章、`部落格/碎碎念` 是碎碎念、書指定的讀書筆記是那本書的筆記。原本的 Notion 讀取程式還留著，`source: notion` 就換回去。

從 Notion 搬到 Think Space 的一次性 script：`npm run migrate:think`（說明在 `scripts/migrate-to-think.mjs` 開頭；`--dry-run` 只把 markdown 寫到 `scripts/.think-migration-preview/`）。測試：`npm test`。

## 網站

https://paul-learning.dev

## 技術棧

- **框架**: Astro (靜態網站生成)
- **內容來源**: Notion API (`@notionhq/client`)
- **樣式**: 月門水墨：粉牆、墨色、紅日，每頁頂上一片水墨山水（`src/components/Landscape.astro`，手機也顯示）
  - 山水左邊、文章欄外的遠山腳下有一間半掩在煙雨裡的水岸小書齋，只露出屋頂和左邊一片竹林（遠一點的竹子淡一些，一路長到書齋左半邊後面），小碼頭和小舟從霧下淡淡露出（夜裡燈光透出霧）。版面左邊太窄的螢幕和手機不畫它
  - 竹林跟著台中當下的風搖：風速決定往哪邊彎、彎多少、晃多快，陣風越大擺動越忽大忽小（`src/lib/bamboo.mjs`、`src/layouts/bambooSway.js`；風速跟天氣同一個 Open-Meteo 請求）。查不到時吹微風；看不到書齋、分頁在背景時動畫停下；「減少動態」時只靜靜斜著。網址加 `?wind=55`（或 `?wind=55,85,90`：風速、陣風、風從幾度吹來）可以試別的風
  - 首頁就是「所有文章」；舊的 `/archive/` 轉到首頁
  - 文章列表每篇標題前有一張封面：文章開頭（任何文字之前）的那張首圖，build 時縮成小 WebP，平常淡成水墨色、指到才恢復顏色；開頭沒有圖的文章和碎碎念用一塊淡墨暈染加小紅印代替（`leadImage` 在 `src/lib/think-markdown.mjs`，`coverOf` 在 `src/lib/think.ts`）。手機上封面移到每列右邊
  - 山水跟著台中的天氣變：晴、多雲、霧、雨、雷雨、夜晚（`src/layouts/weather.js`，向 Open-Meteo 查，免金鑰；結果在瀏覽器存半小時）。查天氣時訪客的 IP 會被 Open-Meteo 看到
  - 「書架」是暗門後的書櫃：點導覽列的書架，頁面從中間裂開、書架從暗處浮上來；「關於我」用推進山水轉場（`src/layouts/deskFx.js`）
- **部署**: GitHub Pages
  - `public/sw.js` 是退役用的 Service Worker：之前 3D 書房留下的快取會被它清掉並自行解除註冊，過幾個月可以刪掉
  - `public/invoice-scanner/` 是獨立的小工具，不屬於部落格（原樣複製到 `/invoice-scanner/`，`check-blog-nav` 會跳過它）：
    進項發票掃描，整理營業稅 401 申報要用的欄位。電子發票讀左邊 QR Code（zxing-wasm，瀏覽器內解碼）；
    傳統發票、收據拍照後用使用者自己在設定填的 Claude 或 Gemini API key 從瀏覽器辨識。資料存在瀏覽器 localStorage，
    可依申報期別彙總、匯出 CSV。解析與驗證邏輯在 `invoice-core.js`，測試在 `scripts/invoice-scanner.test.mjs`

## 專案結構

```
src/
├── components/       # SiteHead、Landscape（水墨山水）、ArchiveView、Notion block 渲染元件
│   └── notion/       # Notion block 渲染元件
├── layouts/          # DeskLayout：每頁共用（粉牆、山水、刊頭：站名、三個分頁、RSS）
│   ├── deskFx.js     # 頁與頁之間的機關：書架的暗門、關於我的推進山水
│   └── weather.js    # 查台中現在的天氣，決定山水上的雲、霧、雨或月亮
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
