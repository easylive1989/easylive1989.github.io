/// 技術分享文章模型
class Article {
  /// 文章唯一識別碼
  final String id;

  /// 文章標題
  final String title;

  /// 文章內容 (Markdown)
  final String content;

  /// 新增時間
  final DateTime? createdAt;

  /// 最後編輯時間
  final DateTime? updatedAt;

  /// 文章類型 (如 Medium, Blog, etc.)
  final String? type;

  /// 領域標籤 (如 Flutter, Dart, etc.)
  final String? domain;

  /// 摘要 (從內容前 200 字生成)
  final String? excerpt;

  /// 封面圖片路徑
  final String? coverImage;

  /// 相關資源路徑 (圖片、影片等)
  final List<String> assets;

  /// 閱讀時間（分鐘）
  final int estimatedReadTime;

  Article({
    required this.id,
    required this.title,
    required this.content,
    this.createdAt,
    this.updatedAt,
    this.type,
    this.domain,
    this.excerpt,
    this.coverImage,
    this.assets = const [],
    int? estimatedReadTime,
  }) : estimatedReadTime = estimatedReadTime ?? _calculateReadTime(content);

  /// 從 Markdown 檔案解析文章
  ///
  /// Markdown 格式範例：
  /// ```markdown
  /// # 標題
  ///
  /// 新增時間: October 30, 2024 8:20 AM
  /// 最後編輯時間: October 26, 2025 9:38 PM
  /// id: 12f8303f78f7805baacbff6d139421f6
  /// 類型: Medium
  /// 🧩 領域: Flutter
  ///
  /// [文章內容...]
  /// ```
  factory Article.fromMarkdown(String markdown, String filename) {
    final lines = markdown.split('\n');

    String? title;
    String? id;
    DateTime? createdAt;
    DateTime? updatedAt;
    String? type;
    String? domain;
    final contentLines = <String>[];

    bool inFrontMatter = false;
    bool pastFrontMatter = false;

    for (var i = 0; i < lines.length; i++) {
      final line = lines[i].trim();

      // 解析標題
      if (line.startsWith('# ') && title == null) {
        title = line.substring(2).trim();
        inFrontMatter = true;
        continue;
      }

      // 跳過空白行
      if (line.isEmpty && inFrontMatter) {
        continue;
      }

      // 解析 metadata
      if (inFrontMatter && !pastFrontMatter) {
        if (line.startsWith('新增時間:') || line.startsWith('新增日期:')) {
          createdAt = _parseDate(line.split(':').skip(1).join(':').trim());
        } else if (line.startsWith('最後編輯時間:') || line.startsWith('更新時間:')) {
          updatedAt = _parseDate(line.split(':').skip(1).join(':').trim());
        } else if (line.startsWith('id:')) {
          id = line.split(':')[1].trim();
        } else if (line.startsWith('類型:')) {
          type = line.split(':')[1].trim();
        } else if (line.contains('領域:')) {
          domain = line.split(':')[1].trim();
        } else if (line.isNotEmpty && !line.contains(':')) {
          // 開始進入內容區
          pastFrontMatter = true;
          contentLines.add(lines[i]);
        }
      } else {
        // 已過 front matter，收集內容
        contentLines.add(lines[i]);
      }
    }

    // 如果沒有 id，從檔名提取
    id ??= _extractIdFromFilename(filename);

    // 組合內容
    final content = contentLines.join('\n').trim();

    // 生成摘要
    final excerpt = _generateExcerpt(content);

    return Article(
      id: id,
      title: title ?? '無標題',
      content: content,
      createdAt: createdAt,
      updatedAt: updatedAt,
      type: type,
      domain: domain,
      excerpt: excerpt,
    );
  }

  /// 解析日期字串
  static DateTime? _parseDate(String dateStr) {
    try {
      // 嘗試解析 "October 30, 2024 8:20 AM" 格式
      // 簡化處理：這裡僅示範，實際可能需要更複雜的解析
      final parts = dateStr.split(' ');
      if (parts.length >= 3) {
        // TODO: 實作完整的日期解析
        return DateTime.now(); // 暫時返回當前時間
      }
    } catch (e) {
      // 解析失敗
    }
    return null;
  }

  /// 從檔名提取 ID
  static String _extractIdFromFilename(String filename) {
    // 從類似 "文章標題 12f8303f78f7805baacbff6d139421f6.md" 提取 ID
    final match = RegExp(r'[a-f0-9]{32}').firstMatch(filename);
    if (match != null) {
      return match.group(0)!;
    }
    // 如果沒有找到，使用檔名作為 ID
    return filename.replaceAll('.md', '').replaceAll(' ', '-');
  }

  /// 生成摘要（前 200 字）
  static String _generateExcerpt(String content, {int maxLength = 200}) {
    // 移除 markdown 語法
    var plainText = content
        .replaceAll(RegExp(r'#+\s'), '') // 移除標題符號
        .replaceAll(RegExp(r'\*\*(.+?)\*\*'), r'$1') // 移除粗體
        .replaceAll(RegExp(r'\*(.+?)\*'), r'$1') // 移除斜體
        .replaceAll(RegExp(r'\[(.+?)\]\(.+?\)'), r'$1') // 移除連結
        .replaceAll(RegExp(r'```[\s\S]*?```'), '') // 移除程式碼區塊
        .replaceAll(RegExp(r'`(.+?)`'), r'$1') // 移除行內程式碼
        .trim();

    if (plainText.length <= maxLength) {
      return plainText;
    }

    return '${plainText.substring(0, maxLength)}...';
  }

  /// 計算閱讀時間（假設每分鐘 200 字）
  static int _calculateReadTime(String content) {
    final wordCount = content.length;
    final minutes = (wordCount / 200).ceil();
    return minutes < 1 ? 1 : minutes;
  }

  /// 轉換為 JSON
  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'content': content,
        'createdAt': createdAt?.toIso8601String(),
        'updatedAt': updatedAt?.toIso8601String(),
        'type': type,
        'domain': domain,
        'excerpt': excerpt,
        'coverImage': coverImage,
        'assets': assets,
        'estimatedReadTime': estimatedReadTime,
      };

  @override
  String toString() => 'Article(id: $id, title: $title, domain: $domain)';
}
