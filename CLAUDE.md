# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述

這是 Paul 的個人品牌網站 (https://learnwithpaul.dev/)，使用 Jaspr 框架（Dart 的全端 web 框架）建置。網站採用靜態網站生成（SSG）模式，並部署到 GitHub Pages。

## 開發指令

### 本地開發
```bash
# 啟動開發伺服器
jaspr serve

# 開發伺服器會運行在 http://localhost:8080
```

### 建置
```bash
# 建置靜態網站
jaspr build

# 輸出位置: build/jaspr/
```

### 依賴管理
```bash
# 安裝依賴
dart pub get

# 安裝 Jaspr CLI
dart pub global activate jaspr_cli
```

## 架構說明

### Jaspr 框架特性

- **靜態模式 (Static Mode)**: 專案配置為 `mode: static`，會在建置時預渲染所有頁面
- **伺服器端與客戶端分離**:
  - `lib/main.dart`: 僅在伺服器端執行，負責預渲染
  - 使用 `@client` 註解的元件（如 `Home`）會編譯成 JavaScript 並在客戶端掛載

### 路由架構

路由定義在 `lib/app.dart` 中使用 `jaspr_router`：
- `/` → `Home` 頁面
- `/about` → `About` 頁面

`App` 元件僅在伺服器端建置，不會在客戶端執行。巢狀的 `Home` 和 `About` 元件會在客戶端掛載。

### CSS 樣式系統

- 使用 `@css` 註解定義樣式，會自動渲染到 `<head>` 中
- 樣式使用 type-safe 的 CSS bindings，支援巢狀和串接
- 全域樣式定義在 `lib/main.dart` 的 `Document.styles`
- 元件樣式定義在各自元件的 `styles` getter 中

### 目錄結構

```
lib/
├── main.dart           # 伺服器端入口，定義 Document 結構
├── app.dart            # 根元件，定義路由
├── components/         # 可重用元件
│   ├── header.dart     # 導航 header
│   └── counter.dart    # 範例互動元件
├── pages/             # 頁面元件
│   ├── home.dart      # 首頁 (標記為 @client)
│   └── about.dart     # 關於頁面
└── constants/         # 常數定義
    └── theme.dart     # 主題色彩
```

### 部署流程

GitHub Actions workflow (`.github/workflows/deploy.yml`) 會在推送到 `master` 分支時：
1. 安裝 Flutter 和 Jaspr CLI
2. 執行 `jaspr build` 建置靜態網站
3. 將 `build/jaspr/` 目錄部署到 GitHub Pages

自訂網域 `learnwithpaul.dev` 透過 `web/CNAME` 檔案配置。

## 重要注意事項

- **伺服器 vs 客戶端**: 注意元件執行環境，使用 `@client` 註解標記需要在客戶端執行的元件
- **靜態模式限制**: 在 static mode 下，所有路徑必須在建置時已知
- **樣式定義**: 必須使用 `@css` 註解和 `List<StyleRule>` 型別才能正確渲染
- **路由導航**: 使用 `Link` 元件（from `jaspr_router`）而非普通的 `<a>` 標籤以支援客戶端路由
