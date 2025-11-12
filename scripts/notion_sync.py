#!/usr/bin/env python3
"""
Notion 同步腳本
從 Notion Database 同步已完成的文章到 web/content/ 目錄
"""

import os
import sys
import re
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any
import shutil

import requests
from notion_client import Client
import frontmatter

# Database 配置
DATABASES = {
    "articles": {
        "id": "2a68303f78f78054a19ee35726cf926d",
        "output_path": "web/content/articles",
        "type": "article"
    },
    "tutorial_testing": {
        "id": "41d5ffc8ef2d4f7c80d812ba2db5ce8d",
        "output_path": "web/content/tutorials/30 天學會 Flutter 測試",
        "type": "tutorial"
    },
    "tutorial_design": {
        "id": "76aeb1020ede4545bcefe80c245d03fb",
        "output_path": "web/content/tutorials/30 天學會 Flutter 設計",
        "type": "tutorial"
    }
}


class NotionSync:
    """Notion 同步主類別"""

    def __init__(self, token: str, dry_run: bool = False, force_update: bool = False):
        """
        初始化同步器

        Args:
            token: Notion API token
            dry_run: 預覽模式，不實際寫入檔案
            force_update: 強制更新所有文章
        """
        self.client = Client(auth=token)
        self.dry_run = dry_run
        self.force_update = force_update
        self.project_root = Path(__file__).parent.parent
        self.stats = {
            "total": 0,
            "updated": 0,
            "skipped": 0,
            "errors": 0
        }

    def sync_all(self):
        """同步所有 Database"""
        print("🚀 開始同步 Notion 內容...\n")

        for db_name, config in DATABASES.items():
            print(f"📚 處理 Database: {db_name}")
            print(f"   ID: {config['id']}")
            print(f"   輸出路徑: {config['output_path']}\n")

            try:
                self.sync_database(config)
            except Exception as e:
                print(f"❌ 錯誤: {e}\n")
                self.stats["errors"] += 1

        self.print_summary()

    def sync_database(self, config: Dict[str, str]):
        """
        同步單個 Database

        Args:
            config: Database 配置
        """
        # 查詢已完成的頁面
        pages = self.query_completed_pages(config["id"])
        print(f"   找到 {len(pages)} 篇已完成的文章\n")

        for page in pages:
            self.stats["total"] += 1
            try:
                self.process_page(page, config)
            except Exception as e:
                print(f"   ❌ 處理失敗: {e}")
                self.stats["errors"] += 1

    def query_completed_pages(self, database_id: str) -> List[Dict]:
        """
        查詢 Database 中狀態為「完成」的頁面

        Args:
            database_id: Database ID

        Returns:
            頁面列表
        """
        # 移除 database_id 中的破折號
        clean_id = database_id.replace("-", "")

        try:
            response = self.client.databases.query(
                database_id=clean_id,
                filter={
                    "property": "狀態",
                    "select": {
                        "equals": "完成"
                    }
                }
            )
            return response["results"]
        except Exception as e:
            print(f"   ⚠️  警告: 無法使用狀態過濾，嘗試查詢所有頁面... ({e})")
            # 如果無法使用狀態過濾，嘗試查詢所有頁面
            try:
                response = self.client.databases.query(database_id=clean_id)
                return response["results"]
            except Exception as e2:
                print(f"   ❌ 查詢失敗: {e2}")
                return []

    def process_page(self, page: Dict, config: Dict[str, str]):
        """
        處理單個頁面

        Args:
            page: Notion 頁面物件
            config: Database 配置
        """
        # 取得頁面屬性
        page_id = page["id"].replace("-", "")
        title = self.get_page_title(page)
        created_time = page["created_time"]
        last_edited_time = page["last_edited_time"]

        # 取得其他屬性
        properties = self.extract_properties(page)

        # 決定輸出路徑
        output_dir = self.get_output_directory(title, config, properties)
        # 使用目錄名稱作為檔案名（例如：Day 1 - 標題.md 或 標題.md）
        output_file = output_dir / f"{output_dir.name}.md"

        # 檢查是否需要更新
        if not self.force_update and output_file.exists():
            if self.should_skip_update(output_file, last_edited_time):
                print(f"   ⏭️  跳過: {title} (無變更)")
                self.stats["skipped"] += 1
                return

        print(f"   ⬇️  處理: {title}")

        # 取得頁面內容
        blocks = self.get_page_blocks(page_id)

        # 轉換為 Markdown
        content, images = self.blocks_to_markdown(blocks, page_id)

        # 下載圖片
        if images and not self.dry_run:
            self.download_images(images, output_dir)

        # 生成 Front Matter
        front_matter = self.generate_front_matter(
            page_id, created_time, last_edited_time, properties
        )

        # 建立完整的 Markdown 內容（加入標題）
        full_content = f"# {title}\n\n{front_matter}\n\n{content}"

        # 寫入檔案
        if not self.dry_run:
            output_dir.mkdir(parents=True, exist_ok=True)
            output_file.write_text(full_content, encoding="utf-8")
            print(f"   ✅ 完成: {output_file.relative_to(self.project_root)}")
        else:
            print(f"   👀 預覽: {output_file.relative_to(self.project_root)}")

        self.stats["updated"] += 1

    def get_page_title(self, page: Dict) -> str:
        """取得頁面標題"""
        try:
            title_property = page["properties"].get("Name") or page["properties"].get("標題")
            if title_property and title_property["title"]:
                return "".join([t["plain_text"] for t in title_property["title"]])
        except:
            pass
        return "Untitled"

    def extract_properties(self, page: Dict) -> Dict[str, Any]:
        """提取頁面屬性"""
        properties = {}
        props = page["properties"]

        # 嘗試提取常見屬性
        for key, value in props.items():
            prop_type = value["type"]

            if prop_type == "select" and value["select"]:
                properties[key] = value["select"]["name"]
            elif prop_type == "multi_select":
                properties[key] = [item["name"] for item in value["multi_select"]]
            elif prop_type == "rich_text" and value["rich_text"]:
                properties[key] = "".join([t["plain_text"] for t in value["rich_text"]])
            elif prop_type == "number" and value["number"]:
                properties[key] = value["number"]

        return properties

    def get_output_directory(self, title: str, config: Dict, properties: Dict) -> Path:
        """決定輸出目錄"""
        base_path = self.project_root / config["output_path"]

        # 清理標題（移除不合法的檔名字元）
        clean_title = re.sub(r'[<>:"/\\|?*]', '', title)

        # 如果是教學，檢查是否有 Day 編號
        if config["type"] == "tutorial":
            # 嘗試從標題或屬性中提取 Day 編號
            day_match = re.search(r'Day\s*(\d+)', title, re.IGNORECASE)
            if day_match:
                day_num = int(day_match.group(1))
                clean_title = f"Day {day_num} - {re.sub(r'Day\s*\d+\s*[-:]?\s*', '', title, flags=re.IGNORECASE).strip()}"

        return base_path / clean_title

    def should_skip_update(self, file_path: Path, last_edited_time: str) -> bool:
        """檢查是否應該跳過更新"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                post = frontmatter.load(f)
                existing_time = post.get('最後編輯時間')
                if existing_time:
                    # 將 Notion 時間轉換為可比較的格式
                    notion_time = datetime.fromisoformat(last_edited_time.replace('Z', '+00:00'))
                    # 嘗試解析現有時間
                    try:
                        existing_dt = datetime.strptime(existing_time, "%B %d, %Y %I:%M %p")
                        # 由於沒有時區資訊，假設是 UTC
                        return notion_time.replace(tzinfo=None) <= existing_dt
                    except:
                        pass
        except:
            pass
        return False

    def get_page_blocks(self, page_id: str) -> List[Dict]:
        """取得頁面的所有區塊"""
        blocks = []
        start_cursor = None

        while True:
            response = self.client.blocks.children.list(
                block_id=page_id,
                start_cursor=start_cursor
            )
            blocks.extend(response["results"])

            if not response["has_more"]:
                break
            start_cursor = response["next_cursor"]

        return blocks

    def blocks_to_markdown(self, blocks: List[Dict], page_id: str) -> tuple[str, List[tuple]]:
        """
        將 Notion blocks 轉換為 Markdown

        Returns:
            (markdown_content, images_list)
            images_list: [(url, filename), ...]
        """
        markdown_lines = []
        images = []

        for block in blocks:
            block_type = block["type"]

            if block_type == "paragraph":
                text = self.rich_text_to_markdown(block["paragraph"]["rich_text"])
                markdown_lines.append(text)
                markdown_lines.append("")

            elif block_type.startswith("heading_"):
                level = int(block_type.split("_")[1])
                text = self.rich_text_to_markdown(block[block_type]["rich_text"])
                markdown_lines.append(f"{'#' * level} {text}")
                markdown_lines.append("")

            elif block_type == "code":
                language = block["code"]["language"]
                code_text = self.rich_text_to_markdown(block["code"]["rich_text"])
                markdown_lines.append(f"```{language}")
                markdown_lines.append(code_text)
                markdown_lines.append("```")
                markdown_lines.append("")

            elif block_type == "bulleted_list_item":
                text = self.rich_text_to_markdown(block["bulleted_list_item"]["rich_text"])
                markdown_lines.append(f"- {text}")

            elif block_type == "numbered_list_item":
                text = self.rich_text_to_markdown(block["numbered_list_item"]["rich_text"])
                markdown_lines.append(f"1. {text}")

            elif block_type == "quote":
                text = self.rich_text_to_markdown(block["quote"]["rich_text"])
                markdown_lines.append(f"> {text}")
                markdown_lines.append("")

            elif block_type == "image":
                image_url, filename = self.process_image_block(block)
                if image_url:
                    images.append((image_url, filename))
                    markdown_lines.append(f"![]({filename})")
                    markdown_lines.append("")

            elif block_type == "divider":
                markdown_lines.append("---")
                markdown_lines.append("")

            # 處理有子區塊的情況
            if block.get("has_children"):
                child_blocks = self.get_page_blocks(block["id"])
                child_markdown, child_images = self.blocks_to_markdown(child_blocks, page_id)
                images.extend(child_images)
                # 為子內容增加縮排
                for line in child_markdown.split("\n"):
                    if line:
                        markdown_lines.append(f"  {line}")
                    else:
                        markdown_lines.append("")

        return "\n".join(markdown_lines), images

    def rich_text_to_markdown(self, rich_text: List[Dict]) -> str:
        """將 Notion rich text 轉換為 Markdown"""
        result = []

        for text_obj in rich_text:
            text = text_obj["plain_text"]
            annotations = text_obj["annotations"]

            # 套用格式
            if annotations["code"]:
                text = f"`{text}`"
            if annotations["bold"]:
                text = f"**{text}**"
            if annotations["italic"]:
                text = f"*{text}*"
            if annotations["strikethrough"]:
                text = f"~~{text}~~"

            # 處理連結
            if text_obj.get("href"):
                text = f"[{text}]({text_obj['href']})"

            result.append(text)

        return "".join(result)

    def process_image_block(self, block: Dict) -> tuple[Optional[str], Optional[str]]:
        """處理圖片區塊"""
        image_data = block["image"]
        image_type = image_data["type"]

        if image_type == "external":
            url = image_data["external"]["url"]
        elif image_type == "file":
            url = image_data["file"]["url"]
        else:
            return None, None

        # 生成檔名
        filename = os.path.basename(url.split("?")[0])
        if not filename or "." not in filename:
            # 使用區塊 ID 作為檔名
            ext = ".png"  # 預設副檔名
            filename = f"{block['id']}{ext}"

        return url, filename

    def download_images(self, images: List[tuple], output_dir: Path):
        """下載圖片到指定目錄"""
        for url, filename in images:
            try:
                output_path = output_dir / filename
                if output_path.exists():
                    continue  # 已存在，跳過

                response = requests.get(url, timeout=30)
                response.raise_for_status()

                output_dir.mkdir(parents=True, exist_ok=True)
                output_path.write_bytes(response.content)
                print(f"      📥 下載圖片: {filename}")
            except Exception as e:
                print(f"      ⚠️  圖片下載失敗 ({filename}): {e}")

    def generate_front_matter(
        self,
        page_id: str,
        created_time: str,
        last_edited_time: str,
        properties: Dict
    ) -> str:
        """生成 Markdown Front Matter"""
        # 轉換時間格式
        created = datetime.fromisoformat(created_time.replace('Z', '+00:00'))
        edited = datetime.fromisoformat(last_edited_time.replace('Z', '+00:00'))

        created_str = created.strftime("%B %d, %Y %I:%M %p")
        edited_str = edited.strftime("%B %d, %Y %I:%M %p")

        # 建立 Front Matter
        fm_lines = [
            f"新增時間: {created_str}",
            f"最後編輯時間: {edited_str}",
            f"id: {page_id}"
        ]

        # 加入其他屬性
        if "類型" in properties:
            fm_lines.append(f"類型: {properties['類型']}")

        if "🧩 領域" in properties:
            fm_lines.append(f"🧩 領域: {properties['🧩 領域']}")

        return "\n".join(fm_lines)

    def print_summary(self):
        """印出同步摘要"""
        print("\n" + "=" * 50)
        print("📊 同步摘要")
        print("=" * 50)
        print(f"總計: {self.stats['total']} 篇")
        print(f"✅ 更新: {self.stats['updated']} 篇")
        print(f"⏭️  跳過: {self.stats['skipped']} 篇")
        print(f"❌ 錯誤: {self.stats['errors']} 篇")
        print("=" * 50)

        if self.dry_run:
            print("\n💡 這是預覽模式，未實際寫入檔案")


def main():
    """主程式"""
    parser = argparse.ArgumentParser(description="Notion 內容同步工具")
    parser.add_argument("--dry-run", action="store_true", help="預覽模式，不實際寫入檔案")
    parser.add_argument("--force-update", action="store_true", help="強制更新所有文章")
    args = parser.parse_args()

    # 取得 API Token
    token = os.environ.get("NOTION_SECRET")
    if not token:
        print("❌ 錯誤: 請設定環境變數 NOTION_SECRET")
        print("   範例: export NOTION_SECRET='your_token_here'")
        sys.exit(1)

    # 執行同步
    syncer = NotionSync(token, dry_run=args.dry_run, force_update=args.force_update)
    syncer.sync_all()


if __name__ == "__main__":
    main()
