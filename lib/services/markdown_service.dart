import 'package:markdown/markdown.dart' as md;

/// Markdown 解析服務
///
/// 提供 Markdown 轉 HTML 的功能，並支援：
/// - DartPad 自動嵌入
/// - 程式碼語法高亮
/// - 自訂樣式
class MarkdownService {
  /// 將 Markdown 轉換為 HTML
  ///
  /// [markdown]: Markdown 字串
  /// [enableDartPad]: 是否啟用 DartPad 自動嵌入（預設為 true）
  /// [enableCodeHighlight]: 是否啟用程式碼高亮（預設為 true）
  /// [imageBasePath]: 圖片資源的基礎路徑（如 '/content/articles' 或 '/content/tutorials/系列名稱'）
  static String toHtml(
    String markdown, {
    bool enableDartPad = true,
    bool enableCodeHighlight = true,
    String? imageBasePath,
  }) {
    // 使用 markdown 套件轉換為 HTML
    var html = md.markdownToHtml(
      markdown,
      extensionSet: md.ExtensionSet.gitHubWeb,
      inlineSyntaxes: [
        // 可以加入自訂的 inline syntax
      ],
    );

    // 處理 DartPad 嵌入
    if (enableDartPad) {
      html = _embedDartPad(html);
    }

    // 處理程式碼高亮
    if (enableCodeHighlight) {
      html = _addCodeHighlight(html);
    }

    // 修正圖片和影片路徑
    if (imageBasePath != null) {
      html = _fixMediaPaths(html, basePath: imageBasePath);
    }

    return html;
  }

  /// 自動偵測 dartpad.dev 連結並轉換為 iframe 嵌入
  ///
  /// 會將以下格式的連結轉換為 iframe：
  /// - <a href="https://dartpad.dev/?id=xxx">...</a>
  /// - <a href="https://dartpad.dev/xxx">...</a>
  static String _embedDartPad(String html) {
    // 正則表達式匹配 dartpad.dev 連結
    final dartpadLinkRegex = RegExp(
      r'<a[^>]*href=["\x27]https?://dartpad\.dev/([^"\x27]*)["\x27][^>]*>([^<]*)</a>',
      caseSensitive: false,
    );

    // 替換為 iframe
    html = html.replaceAllMapped(dartpadLinkRegex, (match) {
      final url = 'https://dartpad.dev/${match.group(1)}';
      final linkText = match.group(2);

      return '''
<div class="dartpad-container">
  <div class="dartpad-header">
    <span class="dartpad-title">$linkText</span>
    <a href="$url" target="_blank" rel="noopener noreferrer" class="dartpad-open-link">
      在新視窗開啟 ↗
    </a>
  </div>
  <iframe
    src="$url"
    class="dartpad-iframe"
    frameborder="0"
    loading="lazy"
  ></iframe>
</div>
''';
    });

    // 也處理純文字中的 dartpad.dev URL（不在 <a> 標籤中）
    final dartpadUrlRegex = RegExp(
      r'https?://dartpad\.dev/[^\s<>"]+',
      caseSensitive: false,
    );

    html = html.replaceAllMapped(dartpadUrlRegex, (match) {
      final url = match.group(0)!;

      // 檢查是否已經在 <a> 或 <iframe> 標籤中
      if (html.substring(0, match.start).contains('<a') ||
          html.substring(0, match.start).contains('<iframe')) {
        return url; // 不重複處理
      }

      return '''
<div class="dartpad-container">
  <div class="dartpad-header">
    <span class="dartpad-title">DartPad</span>
    <a href="$url" target="_blank" rel="noopener noreferrer" class="dartpad-open-link">
      在新視窗開啟 ↗
    </a>
  </div>
  <iframe
    src="$url"
    class="dartpad-iframe"
    frameborder="0"
    loading="lazy"
  ></iframe>
</div>
''';
    });

    return html;
  }

  /// 為程式碼區塊添加語法高亮所需的 class
  ///
  /// 實際的高亮會由前端的 highlight.js 或 prism.js 處理
  static String _addCodeHighlight(String html) {
    // 為 <code> 標籤添加 language- class
    final codeBlockRegex = RegExp(
      r'<code class="language-(\w+)">',
    );

    html = html.replaceAllMapped(codeBlockRegex, (match) {
      final language = match.group(1);
      return '<code class="language-$language hljs">';
    });

    // 為沒有語言標註的程式碼區塊添加預設 class
    html = html.replaceAll(
      '<code>',
      '<code class="hljs">',
    );

    return html;
  }

  /// 提取 Markdown 中的所有圖片 URL
  static List<String> extractImageUrls(String markdown) {
    final imageRegex = RegExp(
      r'!\[([^\]]*)\]\(([^)]+)\)',
    );

    final matches = imageRegex.allMatches(markdown);
    return matches.map((m) => m.group(2)!).toList();
  }

  /// 提取 Markdown 中的所有連結
  static List<Map<String, String>> extractLinks(String markdown) {
    final linkRegex = RegExp(
      r'\[([^\]]+)\]\(([^)]+)\)',
    );

    final matches = linkRegex.allMatches(markdown);
    return matches
        .map((m) => {
              'text': m.group(1)!,
              'url': m.group(2)!,
            })
        .toList();
  }

  /// 從 Markdown 中移除前置信息（Front Matter）
  ///
  /// 支援 YAML 格式的 front matter:
  /// ```
  /// ---
  /// title: xxx
  /// ---
  /// ```
  static String removeFrontMatter(String markdown) {
    final frontMatterRegex = RegExp(
      r'^---\s*\n(.*?)\n---\s*\n',
      multiLine: true,
      dotAll: true,
    );

    return markdown.replaceFirst(frontMatterRegex, '');
  }

  /// 計算 Markdown 的字數
  static int countWords(String markdown) {
    // 移除 markdown 語法
    var plainText = markdown
        .replaceAll(RegExp(r'#+\s'), '')
        .replaceAll(RegExp(r'\*\*(.+?)\*\*'), r'$1')
        .replaceAll(RegExp(r'\*(.+?)\*'), r'$1')
        .replaceAll(RegExp(r'\[(.+?)\]\(.+?\)'), r'$1')
        .replaceAll(RegExp(r'```[\s\S]*?```'), '')
        .replaceAll(RegExp(r'`(.+?)`'), r'$1');

    // 計算字數（中文字符 + 英文單字）
    final chineseChars = RegExp(r'[\u4e00-\u9fa5]').allMatches(plainText).length;
    final englishWords =
        plainText.split(RegExp(r'\s+')).where((w) => w.isNotEmpty && RegExp(r'[a-zA-Z]').hasMatch(w)).length;

    return chineseChars + englishWords;
  }

  /// 修正 Markdown 轉換後的媒體檔案路徑（圖片和影片）
  ///
  /// 將相對路徑的圖片和影片轉換為絕對路徑 `{basePath}/{路徑}`
  /// 遠端 URL（http:// 或 https://）保持不變
  ///
  /// [html]: 待處理的 HTML 字串
  /// [basePath]: 媒體資源的基礎路徑（如 '/content/articles' 或 '/content/tutorials/系列名稱'）
  static String _fixMediaPaths(String html, {required String basePath}) {
    // 處理 <img> 標籤
    final imgRegex = RegExp(r'<img([^>]*)src=["\x27]([^"\x27]+)["\x27]([^>]*)>');

    html = html.replaceAllMapped(imgRegex, (match) {
      final beforeSrc = match.group(1) ?? '';
      final src = match.group(2) ?? '';
      final afterSrc = match.group(3) ?? '';

      // 如果是遠端 URL（http:// 或 https://），不處理
      if (src.startsWith('http://') || src.startsWith('https://')) {
        return match.group(0)!;
      }

      // 相對路徑：需要轉換為絕對路徑
      // 1. URL 解碼（處理 %E5%9C... 等編碼）
      final decodedSrc = Uri.decodeFull(src);

      // 2. 轉換為絕對路徑
      final absoluteSrc = '$basePath/$decodedSrc';

      return '<img${beforeSrc}src="$absoluteSrc"$afterSrc>';
    });

    // 處理 <video> 標籤
    final videoRegex = RegExp(r'<video([^>]*)src=["\x27]([^"\x27]+)["\x27]([^>]*)>');

    html = html.replaceAllMapped(videoRegex, (match) {
      final beforeSrc = match.group(1) ?? '';
      final src = match.group(2) ?? '';
      final afterSrc = match.group(3) ?? '';

      // 如果是遠端 URL（http:// 或 https://），不處理
      if (src.startsWith('http://') || src.startsWith('https://')) {
        return match.group(0)!;
      }

      // 相對路徑：需要轉換為絕對路徑
      // 1. URL 解碼（處理 %E5%9C... 等編碼）
      final decodedSrc = Uri.decodeFull(src);

      // 2. 轉換為絕對路徑
      final absoluteSrc = '$basePath/$decodedSrc';

      return '<video${beforeSrc}src="$absoluteSrc"$afterSrc>';
    });

    return html;
  }
}

/// DartPad 嵌入配置
class DartPadConfig {
  /// DartPad iframe 高度
  static const String defaultHeight = '600px';

  /// DartPad iframe 寬度
  static const String defaultWidth = '100%';

  /// 是否顯示控制台
  static const bool showConsole = true;

  /// 主題 (light/dark)
  static const String theme = 'light';
}
