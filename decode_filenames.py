#!/usr/bin/env python3
import os
import urllib.parse
from pathlib import Path

def decode_filenames(base_path):
    """遍歷目錄並解碼所有包含 % 的檔案名稱"""
    renamed_count = 0

    for root, dirs, files in os.walk(base_path):
        # 先處理檔案
        for file in files:
            if '%' in file:
                old_path = os.path.join(root, file)
                new_file = urllib.parse.unquote(file)
                new_path = os.path.join(root, new_file)

                if old_path != new_path:
                    os.rename(old_path, new_path)
                    print(f"✓ Renamed: {file} -> {new_file}")
                    renamed_count += 1

        # 再處理目錄名稱（需要從最深層開始，避免路徑問題）
        for dir_name in dirs:
            if '%' in dir_name:
                old_dir_path = os.path.join(root, dir_name)
                new_dir_name = urllib.parse.unquote(dir_name)
                new_dir_path = os.path.join(root, new_dir_name)

                if old_dir_path != new_dir_path:
                    os.rename(old_dir_path, new_dir_path)
                    print(f"✓ Renamed directory: {dir_name} -> {new_dir_name}")
                    renamed_count += 1

    return renamed_count

if __name__ == '__main__':
    base_path = 'public/static'
    print(f"開始解碼 {base_path} 目錄中的檔案名稱...")
    print("-" * 60)

    count = decode_filenames(base_path)

    print("-" * 60)
    print(f"完成！共重新命名 {count} 個檔案/目錄")
