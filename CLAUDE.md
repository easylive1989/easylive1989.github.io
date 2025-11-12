# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述

這是 Paul 的個人品牌網站 (https://learnwithpaul.dev/)，使用 Jaspr 框架（Dart 的全端 web 框架）建置。網站採用靜態網站生成（SSG）模式，並部署到 GitHub Pages。

## 開發指令

### 本地開發
```bash
# 使用 fvm 執行 dart 指令（專案使用 Flutter 版本管理）
fvm dart pub get

# 啟動開發伺服器
jaspr serve
# 開發伺服器運行在 http://localhost:8080
```

### 建置與部署
```bash
# 建置靜態網站
jaspr build
# 輸出位置: build/jaspr/

# 安裝 Jaspr CLI（若尚未安裝）
dart pub global activate jaspr_cli
```

### Notion 內容同步
```bash
# 設定環境變數（必須）
export NOTION_SECRET="your_notion_api_token"

# 預覽模式（不實際寫入檔案）
python3 scripts/notion_sync.py --dry-run

# 執行同步（從 Notion 下載內容到 web/content/）
python3 scripts/notion_sync.py

# 強制更新所有文章（忽略增量判斷）
python3 scripts/notion_sync.py --force-update

# 安裝 Python 依賴
cd scripts && pip3 install -r requirements.txt
```

## 架構說明

### Jaspr 靜態模式與動態路由生成

**核心概念**: 專案在靜態模式下實現了「偽動態路由」

1. **建置時內容載入** (`lib/main.dart`):
   ```dart
   void main() async {
     final content = await ContentLoader.loadAll();  // 載入所有 Markdown
     runApp(Document(body: App(content: content)));
   }
   ```

2. **動態路由生成** (`lib/app.dart`):
   ```dart
   class App extends StatelessComponent {
     final ContentData content;

     @override
     Component build(BuildContext context) {
       final routes = <Route>[
         // 為每篇文章動態生成路由
         for (final article in content.articles)
           Route(path: '/articles/${article.id}', ...),

         // 為每個教學動態生成路由
         for (final series in content.series)
           for (final tutorial in series.tutorials)
             Route(path: '/tutorials/${series.id}/${tutorial.day}', ...),
       ];
       return Router(routes: routes);
     }
   }
   ```

3. **結果**: Jaspr 在建置時為每個路由預渲染靜態 HTML

### 伺服器端與客戶端執行環境

**執行時機**:
- `lib/main.dart`: 僅在建置時的伺服器端執行
- `lib/app.dart`: 伺服器端執行（路由定義）
- `@client` 註解的元件: 編譯為 JavaScript，在瀏覽器端執行

**@client 使用策略**:
- `Home` 頁面: 標記為 `@client`（預留互動功能）
- `MarkdownRenderer`: 標記為 `@client`（在客戶端解析 Markdown、嵌入 DartPad）

### 內容管理系統架構

**資料流向**:
```
Notion Database (3 個 databases)
    ↓ Python 腳本 (scripts/notion_sync.py)
    ↓ - 查詢狀態為「完成」的頁面（使用 select 過濾）
    ↓ - 轉換 Notion Blocks → Markdown
    ↓ - 下載圖片到本地
    ↓ - 生成 Front Matter
web/content/
    ├── articles/[文章標題]/[文章標題].md + 圖片
    └── tutorials/[系列名稱]/Day X - [標題]/Day X - [標題].md + 圖片
    ↓ Dart ContentLoader (lib/services/content_loader.dart)
    ↓ - 遞迴掃描 .md 檔案（recursive: true）
    ↓ - 解析 Front Matter
    ↓ - 建立 Article/Tutorial/TutorialSeries 物件
Static HTML Pages
```

**目錄結構規範**:
```
web/content/
├── articles/
│   └── [文章標題]/
│       ├── [文章標題].md       # ⚠️ 檔名必須與目錄名稱相同
│       └── [圖片檔案]
└── tutorials/
    └── [系列名稱]/
        └── Day [N] - [標題]/
            ├── Day [N] - [標題].md  # ⚠️ 檔名必須與目錄名稱相同
            └── [圖片檔案]
```

### Markdown Front Matter 格式

**標準格式**:
```markdown
# 標題

新增時間: October 30, 2024 8:20 AM
最後編輯時間: October 26, 2025 9:38 PM
id: 12f8303f78f7805baacbff6d139421f6
類型: Medium
🧩 領域: Flutter

[內容正文...]
```

**解析邏輯** (`Article.fromMarkdown()` / `Tutorial.fromMarkdown()`):
1. 第一個 `# ` 開頭的行作為標題（必須存在）
2. 標題後的連續非空白行解析為 metadata（格式：`key: value`）
3. 遇到不含 `:` 的行時，視為內容開始
4. 日期格式必須為: `"Month Day, Year HH:MM AM/PM"`

### ID 與 URL 生成規則

**Article ID**:
1. 優先使用 Front Matter 中的 `id` 欄位
2. 若無，從檔名提取 32 字元的十六進位 hash
3. URL: `/articles/{article.id}`

**Tutorial ID**:
- 格式: `{seriesId}-day-{dayNumber}`
- URL: `/tutorials/{series.id}/{tutorial.day}` (使用 day 編號而非完整 ID，更簡潔)

**Series ID**:
- 從目錄名稱生成：小寫 + 空格轉連字號 + 移除非字母數字字元
- 例如: `"30 天學會 Flutter 測試"` → `"30-天學會-flutter-測試"`

### CSS 樣式系統

**三層樣式架構**:

1. **全域樣式** (`lib/main.dart` 的 `Document.styles`)
2. **元件樣式** (使用 `@css` 註解)
3. **設計 token** (`lib/constants/theme.dart`, `lib/constants/styles.dart`)

**自動收集機制**:
- Jaspr 建置時掃描所有 `@css` 註解
- 生成 `jaspr_options.dart`，合併所有樣式
- 注入到 `<head>` 中

**範例**:
```dart
@css
static List<StyleRule> get styles => [
  css('.my-class')
    .box(width: 100.px, height: 100.px)
    .background(color: Colors.blue)
    .text(color: Colors.white),
];
```

### Notion 同步系統

**Database 對應關係**:
```python
DATABASES = {
    "articles": {
        "id": "2a68303f78f78054a19ee35726cf926d",
        "output_path": "web/content/articles",
    },
    "tutorial_testing": {
        "id": "41d5ffc8ef2d4f7c80d812ba2db5ce8d",
        "output_path": "web/content/tutorials/30 天學會 Flutter 測試",
    },
    "tutorial_design": {
        "id": "76aeb1020ede4545bcefe80c245d03fb",
        "output_path": "web/content/tutorials/30 天學會 Flutter 設計",
    }
}
```

**增量更新邏輯**:
1. 讀取本地 Markdown 的 `最後編輯時間`
2. 比較與 Notion 的 `last_edited_time`
3. 若 Notion 時間較新 → 重新下載
4. 使用 `--force-update` 可忽略此判斷

**支援的 Notion Block 類型**:
- 段落、標題 (H1-H3)、程式碼、清單、引用、圖片、分隔線
- Rich Text 格式: 粗體、斜體、行內程式碼、刪除線、連結
- 巢狀區塊（遞迴處理）

**檔案命名規則**:
- 移除不合法字元: `<>:"/\|?*`
- 教學類型: 自動標準化為 `Day [N] - [標題]`
- Markdown 檔名 = 目錄名稱

## 關鍵整合點

### 1. ContentLoader → 路由生成

**流程**: `main.dart` 載入內容 → 傳遞給 `App` → 動態生成路由定義

**注意**: 所有內容必須在建置時載入，無法在執行時動態新增路由

### 2. Markdown 解析 → 客戶端渲染

**為何在客戶端解析?**
- 減少伺服器端建置時間
- 支援 DartPad 動態嵌入（`_embedDartPad()`）
- 未來可擴充互動功能

**流程**:
```
伺服器端傳遞純文字 Markdown
    ↓
客戶端 MarkdownRenderer (@client)
    ↓ markdown 套件解析
    ↓ _embedDartPad() (偵測 dartpad.dev 連結)
    ↓ _fixImagePaths() (加上 basePath)
    ↓ raw() 注入 HTML
```

### 3. 圖片路徑處理

**問題**: Markdown 中圖片使用相對路徑（`![](image.png)`），需轉換為網站絕對路徑

**解決方案**:
```dart
// MarkdownService._fixImagePaths()
// 1. 偵測 <img> 標籤
// 2. 跳過遠端 URL
// 3. 本地路徑加上 basePath 前綴
```

**使用**:
```dart
// 文章
MarkdownRenderer(
  markdown: article.content,
  imageBasePath: '/content/articles',
)

// 教學
MarkdownRenderer(
  markdown: tutorial.content,
  imageBasePath: '/content/tutorials/${series.name}',
)
```

⚠️ **已知問題**: `imageBasePath` 未包含到具體文章/教學目錄，可能導致圖片路徑錯誤

### 4. Tutorial 前後連結

**設計**: `TutorialSeries` 在建構時自動設定每個 Tutorial 的 `previousId` 和 `nextId`

```dart
void _linkTutorials() {
  for (var i = 0; i < tutorials.length; i++) {
    if (i > 0) tutorials[i].previousId = tutorials[i - 1].id;
    if (i < tutorials.length - 1) tutorials[i].nextId = tutorials[i + 1].id;
  }
}
```

## 重要開發慣例

### 使用 fvm 執行 Dart 指令

專案使用 Flutter Version Management (fvm) 管理 Flutter 版本。除了技術名詞之外，盡量使用繁體中文回覆。

**正確**:
```bash
fvm dart pub get
fvm dart run bin/script.dart
fvm dart analyze
```

**錯誤**:
```bash
dart pub get  # 可能使用錯誤的 Dart 版本
```

### 小步驟、小改動的開發方式

**工作流程**:
1. 收到需求後，先釐清需求（使用 AskUserQuestion）
2. 將需求拆解為小任務（使用 TodoWrite）
3. 一次專注一個 task，完成後再進行下一個
4. 由使用者決定要先執行哪個 task

### 路由導航規則

- 使用 `Link` 元件（from `jaspr_router`）而非 `<a>` 標籤
- 文章: `/articles/{article.id}`
- 教學: `/tutorials/{series.id}/{tutorial.day}`

### ContentLoader 的遞迴掃描

**重要**: `list()` 必須設定 `recursive: true` 以掃描子目錄

```dart
// 正確
await for (final entity in articlesDir.list(recursive: true)) {
  if (entity is File && entity.path.endsWith('.md')) { ... }
}

// 錯誤（無法掃描子目錄）
await for (final entity in articlesDir.list()) { ... }
```

### 檔名與目錄名稱一致性

**關鍵規則**: Markdown 檔案名稱必須與所在目錄名稱相同

```
✅ 正確:
articles/自製 Flutter Tab Bar/自製 Flutter Tab Bar.md

❌ 錯誤:
articles/自製 Flutter Tab Bar/article.md
articles/自製 Flutter Tab Bar/12f8303f78f7805b.md
```

這是因為 Python 腳本使用 `output_dir.name` 作為檔名:
```python
output_file = output_dir / f"{output_dir.name}.md"
```

## 部署流程

GitHub Actions (`.github/workflows/deploy.yml`) 會在推送到 `master` 分支時：
1. 設定 Flutter 環境
2. 安裝 Jaspr CLI: `dart pub global activate jaspr_cli`
3. 取得依賴: `dart pub get`
4. 建置: `jaspr build --verbose`
5. 將 `build/jaspr/` 部署到 GitHub Pages

**輸出結構**:
```
build/jaspr/
├── index.html
├── articles/[article-id]/index.html
├── tutorials/[series-id]/[day]/index.html
├── content/              # 複製自 web/content/
├── styles.css            # 合併的樣式
└── main.dart.js          # 客戶端程式碼
```

## 非顯而易見的設計決策

### 為什麼 Tutorial 使用 Day 編號而非 ID 作為 URL？

**優點**:
- URL 更簡潔: `/tutorials/flutter-testing/1`
- 更易於手動輸入和分享
- Day 編號對使用者更有意義

**實作**: 透過 `series.getTutorialByDay(day)` 查詢

### 為什麼內容在建置時載入？

**原因**:
- 靜態網站生成模式的要求
- 所有路由必須在建置時已知
- 避免執行時的 I/O 操作

### 為什麼 MarkdownRenderer 使用 @client？

**原因**:
1. 減少伺服器端建置時間
2. 支援 DartPad 動態嵌入
3. 預留客戶端互動功能擴充空間

**代價**: 首次載入時有短暫的 Markdown 解析延遲

## 常見問題

### Notion 同步失敗

1. 確認環境變數: `echo $NOTION_SECRET`
2. 確認 Notion Integration 有權限存取 Database（在 Notion 中分享給 Integration）
3. 查看 Python 腳本輸出的錯誤訊息

### 文章/教學未顯示

1. 檢查檔案是否在正確位置（`web/content/articles/` 或 `web/content/tutorials/`）
2. 檔名是否與目錄名稱相同
3. Front Matter 格式是否正確（第一行必須是 `# 標題`）
4. 對於教學，檔名是否符合 `Day [N] - ` 格式

### 圖片無法顯示

1. 檢查圖片是否與 Markdown 檔案在同一目錄
2. Markdown 中使用相對路徑（僅檔名）: `![](image.png)`
3. 檢查 `imageBasePath` 設定是否正確

### 建置錯誤

1. 確認使用 `fvm dart pub get` 安裝依賴
2. 檢查 `jaspr_options.dart` 是否正確生成
3. 查看建置輸出中的具體錯誤訊息
4. 嘗試清除快取: `jaspr clean` 或 `fvm dart run build_runner clean`
