import 'package:jaspr/jaspr.dart';
import '../services/markdown_service.dart';
import '../constants/theme.dart';
import '../constants/styles.dart';

/// Markdown 渲染元件
///
/// 在客戶端動態解析並渲染 Markdown 內容
/// 支援 DartPad 嵌入和程式碼語法高亮
@client
class MarkdownRenderer extends StatelessComponent {
  final String markdown;
  final bool enableDartPad;
  final bool enableCodeHighlight;

  const MarkdownRenderer({
    required this.markdown,
    this.enableDartPad = true,
    this.enableCodeHighlight = true,
    super.key,
  });

  @override
  Component build(BuildContext context) {
    // 將 Markdown 轉換為 HTML
    final html = MarkdownService.toHtml(
      markdown,
      enableDartPad: enableDartPad,
      enableCodeHighlight: enableCodeHighlight,
    );

    return div(
      classes: 'markdown-content',
      [
        // 使用 raw HTML 渲染
        div(
          classes: 'markdown-body',
          [raw(html)],
        ),
      ],
    );
  }

  @css
  static List<StyleRule> get styles => [
        // Markdown 內容容器
        css('.markdown-content').styles(
          width: 100.percent,
          maxWidth: 800.px,
          margin: Margin.symmetric(horizontal: Unit.auto),
        ),

        css('.markdown-body').styles(
          fontSize: FontSizes.base,
          color: textPrimaryColor,
        ),

        // DartPad 容器樣式
        css('.dartpad-container').styles(
          margin: Margin.only(top: AppSpacing.xl, bottom: AppSpacing.xl),
          border: Border.only(
            top: BorderSide(color: borderColor, width: Borders.thin),
            right: BorderSide(color: borderColor, width: Borders.thin),
            bottom: BorderSide(color: borderColor, width: Borders.thin),
            left: BorderSide(color: borderColor, width: Borders.thin),
          ),
          overflow: Overflow.hidden,
        ),

        css('.dartpad-header').styles(
          display: Display.flex,
          justifyContent: JustifyContent.spaceBetween,
          alignItems: AlignItems.center,
          padding: Padding.all(AppSpacing.md),
          backgroundColor: surfaceColor,
          border: Border.only(bottom: BorderSide(color: borderColor, width: Borders.thin)),
        ),

        css('.dartpad-title').styles(
          fontSize: FontSizes.base,
          fontWeight: FontWeights.semibold,
          color: secondaryColor,
        ),

        css('.dartpad-open-link').styles(
          fontSize: FontSizes.sm,
          color: primaryColor,
          textDecoration: TextDecoration.none,
        ),

        css('.dartpad-open-link:hover').styles(
          color: secondaryColor,
        ),

        css('.dartpad-iframe').styles(
          width: 100.percent,
          height: 600.px,
          display: Display.block,
        ),

        // 表格樣式
        css('.markdown-body table').styles(
          width: 100.percent,
          margin: Margin.only(top: AppSpacing.md, bottom: AppSpacing.md),
        ),

        css('.markdown-body th, .markdown-body td').styles(
          padding: Padding.all(AppSpacing.sm),
          border: Border.only(
            top: BorderSide(color: borderColor, width: Borders.thin),
            right: BorderSide(color: borderColor, width: Borders.thin),
            bottom: BorderSide(color: borderColor, width: Borders.thin),
            left: BorderSide(color: borderColor, width: Borders.thin),
          ),
          textAlign: TextAlign.left,
        ),

        css('.markdown-body th').styles(
          backgroundColor: surfaceColor,
          fontWeight: FontWeights.semibold,
          color: secondaryColor,
        ),

        css('.markdown-body tr:hover').styles(
          backgroundColor: Color('#0D57B4BA'),
        ),

        // 引用區塊強化樣式
        css('.markdown-body blockquote').styles(
          backgroundColor: Color('#0D57B4BA'),
          padding: Padding.all(AppSpacing.md),
        ),

        // 圖片樣式
        css('.markdown-body img').styles(
          maxWidth: 100.percent,
          height: Unit.auto,
          margin: Margin.only(top: AppSpacing.md, bottom: AppSpacing.md),
        ),

        // 程式碼區塊樣式增強
        css('.markdown-body pre').styles(
          position: Position.relative(),
        ),

        // 行內程式碼強化
        css('.markdown-body code:not(pre code)').styles(
          fontWeight: FontWeights.medium,
        ),
      ];
}
