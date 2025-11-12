# Notion 同步腳本

自動從 Notion Database 同步已完成的文章到 `web/content/` 目錄。

## 功能特性

- ✅ 自動查詢 Notion Database 中狀態為「完成」的文章
- ✅ 將 Notion 內容轉換為 Markdown 格式
- ✅ 下載圖片到本地並轉換路徑
- ✅ 生成符合網站格式的 Front Matter
- ✅ 增量更新（只更新有變動的文章）
- ✅ 自動組織檔案結構

## 安裝

### 1. 安裝 Python 依賴

```bash
cd scripts
pip install -r requirements.txt
```

### 2. 設定 Notion Integration

1. 前往 [Notion Integrations](https://www.notion.so/my-integrations)
2. 建立新的 Integration，取得 API Token
3. 在 Notion 中將以下三個 Database 分享給你的 Integration：
   - 技術分享系列 (2a68303f78f78054a19ee35726cf926d)
   - 30 天輕鬆學會 Flutter 測試 (41d5ffc8ef2d4f7c80d812ba2db5ce8d)
   - Flutter 開發設計雜談 (76aeb1020ede4545bcefe80c245d03fb)

### 3. 設定環境變數

```bash
export NOTION_SECRET="your_notion_api_token_here"
```

或將 Token 加入你的 shell 配置檔（`~/.zshrc` 或 `~/.bashrc`）：

```bash
echo 'export NOTION_SECRET="your_notion_api_token_here"' >> ~/.zshrc
source ~/.zshrc
```

## 使用方式

### 基本用法

從專案根目錄執行：

```bash
python scripts/notion_sync.py
```

### 命令列參數

#### 預覽模式（不實際寫入檔案）

```bash
python scripts/notion_sync.py --dry-run
```

這會顯示將會處理哪些文章，但不會實際建立或修改任何檔案。適合用來測試和預覽。

#### 強制更新所有文章

```bash
python scripts/notion_sync.py --force-update
```

忽略增量更新邏輯，重新下載並更新所有文章。

## Database 對應關係

腳本會自動將三個 Notion Database 的內容同步到對應的目錄：

| Notion Database | 輸出路徑 | 類型 |
|----------------|----------|------|
| 技術分享系列 | `web/content/articles/` | 技術文章 |
| 30 天測試 | `web/content/tutorials/30 天學會 Flutter 測試/` | 教學系列 |
| Flutter 設計 | `web/content/tutorials/30 天學會 Flutter 設計/` | 教學系列 |

## 檔案結構

每篇文章會建立以下結構：

```
web/content/articles/
└── [文章標題]/
    ├── [notion_page_id].md    # Markdown 內容
    ├── image1.png             # 文章中的圖片
    └── image2.jpg

web/content/tutorials/30 天學會 Flutter 測試/
└── Day 1 - [標題]/
    ├── [notion_page_id].md
    └── [圖片檔案]
```

## Markdown Front Matter 格式

每個 Markdown 檔案會包含以下 Front Matter：

```markdown
新增時間: November 15, 2021 10:23 AM
最後編輯時間: October 24, 2025 4:48 PM
id: 74e04f6b90ed4369855df505c99dd0ab
類型: 輸出文章
🧩 領域: Flutter
```

## 增量更新機制

腳本會比對本地檔案的「最後編輯時間」與 Notion 的 `last_edited_time`：

- 如果 Notion 的時間較新 → 重新下載並更新
- 如果時間相同或本地較新 → 跳過（除非使用 `--force-update`）

這樣可以避免不必要的重複下載和處理。

## 支援的 Notion 區塊類型

- ✅ 標題（H1, H2, H3）
- ✅ 段落
- ✅ 程式碼區塊（支援語法標記）
- ✅ 項目清單（無序和有序）
- ✅ 引用
- ✅ 圖片（自動下載）
- ✅ 分隔線
- ✅ 巢狀區塊
- ✅ 文字格式（粗體、斜體、程式碼、刪除線）
- ✅ 連結

## 錯誤處理

- 如果圖片下載失敗，會顯示警告但繼續處理
- 如果頁面處理失敗，會記錄錯誤並繼續處理下一篇
- 執行結束後會顯示統計摘要

## 輸出範例

```
🚀 開始同步 Notion 內容...

📚 處理 Database: articles
   ID: 2a68303f78f78054a19ee35726cf926d
   輸出路徑: web/content/articles

   找到 4 篇已完成的文章

   ⬇️  處理: 在 Flutter App 中整合 Google play In-App-Billing
      📥 下載圖片: image1.png
      📥 下載圖片: image2.jpg
   ✅ 完成: web/content/articles/在 Flutter App 中整合 Google play In-App-Billing/74e04f6b90ed4369855df505c99dd0ab.md

   ⏭️  跳過: 自製 Flutter Tab Bar - 使用 CustomMultiChildLayout (無變更)

==================================================
📊 同步摘要
==================================================
總計: 12 篇
✅ 更新: 3 篇
⏭️  跳過: 8 篇
❌ 錯誤: 1 篇
==================================================
```

## 疑難排解

### 錯誤：找不到 NOTION_SECRET

確認環境變數已正確設定：

```bash
echo $NOTION_SECRET
```

### 錯誤：無法存取 Database

確認你的 Notion Integration 有權限存取這些 Database。在 Notion 中：
1. 開啟 Database
2. 點選右上角的 `...` 選單
3. 選擇「Add connections」
4. 選擇你的 Integration

### 圖片下載失敗

Notion 圖片 URL 有時效性。如果遇到大量圖片下載失敗，可能需要重新執行腳本。

## 自動化建議

可以使用 cron job 或 GitHub Actions 定期執行同步：

### Cron Job 範例（每小時執行一次）

```bash
0 * * * * cd /path/to/project && /usr/bin/python3 scripts/notion_sync.py
```

### GitHub Actions 範例

可以在 `.github/workflows/notion-sync.yml` 建立工作流程，定期同步並自動提交變更。

## 授權

MIT License
