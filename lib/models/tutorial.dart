/// 單篇教學模型
class Tutorial {
  /// 教學唯一識別碼
  final String id;

  /// 所屬系列 ID
  final String seriesId;

  /// Day 編號（如 1, 2, 3...）
  final int day;

  /// 教學標題
  final String title;

  /// 完整標題（包含 Day 編號，如 "Day 1 - 標題"）
  final String fullTitle;

  /// 教學內容 (Markdown)
  final String content;

  /// 摘要
  final String? excerpt;

  /// 封面圖片路徑
  final String? coverImage;

  /// 相關資源路徑
  final List<String> assets;

  /// 閱讀時間（分鐘）
  final int estimatedReadTime;

  /// 上一篇教學 ID
  String? previousId;

  /// 下一篇教學 ID
  String? nextId;

  /// 目錄名稱（用於建構圖片路徑）
  final String? directoryName;

  Tutorial({
    required this.id,
    required this.seriesId,
    required this.day,
    required this.title,
    required this.fullTitle,
    required this.content,
    this.excerpt,
    this.coverImage,
    this.assets = const [],
    int? estimatedReadTime,
    this.previousId,
    this.nextId,
    this.directoryName,
  }) : estimatedReadTime = estimatedReadTime ?? _calculateReadTime(content);

  /// 從 Markdown 檔案解析教學
  ///
  /// Markdown 格式範例：
  /// ```markdown
  /// # Day 1 - 大家都喜歡簡單的程式碼，但是簡單卻不容易
  ///
  /// id: 1
  ///
  /// [教學內容...]
  /// ```
  factory Tutorial.fromMarkdown(
    String markdown,
    String seriesId,
    String filename, {
    String? directoryName,
  }) {
    final lines = markdown.split('\n');

    String? fullTitle;
    String? id;
    int? day;
    final contentLines = <String>[];

    bool inFrontMatter = false;
    bool pastFrontMatter = false;

    for (var i = 0; i < lines.length; i++) {
      final line = lines[i].trim();

      // 解析標題（包含 Day 編號）
      if (line.startsWith('# ') && fullTitle == null) {
        fullTitle = line.substring(2).trim();

        // 從標題提取 Day 編號
        final dayMatch = RegExp(r'Day\s*(\d+)', caseSensitive: false).firstMatch(fullTitle);
        if (dayMatch != null) {
          day = int.tryParse(dayMatch.group(1)!);
        }

        inFrontMatter = true;
        continue;
      }

      // 跳過空白行
      if (line.isEmpty && inFrontMatter && !pastFrontMatter) {
        continue;
      }

      // 解析 metadata
      if (inFrontMatter && !pastFrontMatter) {
        if (line.startsWith('id:')) {
          id = line.split(':')[1].trim();
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

    // 如果沒有 day，從檔名提取
    day ??= _extractDayFromFilename(filename);

    // 如果沒有 id，使用 day 作為 id
    id ??= day.toString();

    // 組合內容
    final content = contentLines.join('\n').trim();

    // 從完整標題提取純標題（移除 "Day X - " 部分）
    String title = fullTitle ?? '無標題';
    final titleMatch = RegExp(r'Day\s*\d+\s*-\s*(.+)', caseSensitive: false).firstMatch(title);
    if (titleMatch != null) {
      title = titleMatch.group(1)!.trim();
    }

    // 生成摘要
    final excerpt = _generateExcerpt(content);

    return Tutorial(
      id: '$seriesId-day-$day',
      seriesId: seriesId,
      day: day,
      title: title,
      fullTitle: fullTitle ?? '無標題',
      content: content,
      excerpt: excerpt,
      directoryName: directoryName,
    );
  }

  /// 從檔名提取 Day 編號
  static int _extractDayFromFilename(String filename) {
    final match = RegExp(r'Day\s*(\d+)', caseSensitive: false).firstMatch(filename);
    if (match != null) {
      return int.tryParse(match.group(1)!) ?? 1;
    }
    return 1;
  }

  /// 生成摘要
  static String _generateExcerpt(String content, {int maxLength = 150}) {
    var plainText = content
        .replaceAll(RegExp(r'#+\s'), '')
        .replaceAll(RegExp(r'\*\*(.+?)\*\*'), r'$1')
        .replaceAll(RegExp(r'\*(.+?)\*'), r'$1')
        .replaceAll(RegExp(r'\[(.+?)\]\(.+?\)'), r'$1')
        .replaceAll(RegExp(r'```[\s\S]*?```'), '')
        .replaceAll(RegExp(r'`(.+?)`'), r'$1')
        .trim();

    if (plainText.length <= maxLength) {
      return plainText;
    }

    return '${plainText.substring(0, maxLength)}...';
  }

  /// 計算閱讀時間
  static int _calculateReadTime(String content) {
    final wordCount = content.length;
    final minutes = (wordCount / 200).ceil();
    return minutes < 1 ? 1 : minutes;
  }

  /// 轉換為 JSON
  Map<String, dynamic> toJson() => {
        'id': id,
        'seriesId': seriesId,
        'day': day,
        'title': title,
        'fullTitle': fullTitle,
        'content': content,
        'excerpt': excerpt,
        'coverImage': coverImage,
        'assets': assets,
        'estimatedReadTime': estimatedReadTime,
        'previousId': previousId,
        'nextId': nextId,
      };

  @override
  String toString() => 'Tutorial(day: $day, title: $title, series: $seriesId)';
}
