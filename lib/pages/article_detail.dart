import 'package:jaspr/jaspr.dart';
import '../constants/theme.dart';
import '../constants/styles.dart';
import '../models/article.dart';
import '../components/markdown_renderer.dart';

/// 文章詳細頁
class ArticleDetail extends StatelessComponent {
  final Article article;

  const ArticleDetail({required this.article, super.key});

  @override
  Component build(BuildContext context) {
    // 格式化日期
    final dateStr = article.updatedAt != null
        ? _formatDate(article.updatedAt!)
        : (article.createdAt != null ? _formatDate(article.createdAt!) : '');

    return div(classes: 'article-detail-page', [
      div(classes: 'container', [
        // 文章標題區
        header(classes: 'article-header', [
          // 領域標籤
          if (article.domain != null)
            div(classes: 'article-domain', [
              span(classes: 'domain-tag', [text('🧩 ${article.domain}')]),
            ]),

          // 標題
          h1(classes: 'article-title', [text(article.title)]),

          // Meta 資訊
          div(classes: 'article-meta', [
            if (dateStr.isNotEmpty)
              span(classes: 'meta-item', [text('📅 $dateStr')]),
            if (article.type != null)
              span(classes: 'meta-item', [text('📝 ${article.type}')]),
          ]),
        ]),

        // 文章內容
        div(classes: 'article-content', [
          MarkdownRenderer(
            markdown: article.content,
            imageBasePath: article.directoryName != null
                ? '/content/articles/${article.directoryName}'
                : '/content/articles',
          ),
        ]),
      ]),
    ]);
  }

  String _formatDate(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }

  @css
  static List<StyleRule> get styles => [
    css('.article-detail-page').styles(
      minHeight: 100.vh,
      padding: Padding.symmetric(vertical: AppSpacing.xl3, horizontal: AppSpacing.xl),
    ),

    css('.article-header').styles(
      padding: Padding.only(bottom: AppSpacing.xl),
      margin: Margin.only(bottom: AppSpacing.xl2),
      border: Border.only(
        bottom: BorderSide(color: borderColor, width: Borders.thin),
      ),
    ),

    css('.article-domain').styles(
      margin: Margin.only(bottom: AppSpacing.md),
    ),

    css('.domain-tag').styles(
      display: Display.inlineBlock,
      padding: Padding.symmetric(horizontal: AppSpacing.sm, vertical: 4.px),
      backgroundColor: Color('#E8F6F7'),
      color: primaryColor,
      fontSize: FontSizes.sm,
      fontWeight: FontWeights.medium,
    ),

    css('.article-title').styles(
      margin: Margin.only(bottom: AppSpacing.lg),
      color: secondaryColor,
      fontSize: FontSizes.xl5,
      fontWeight: FontWeights.bold,
    ),

    css('.article-meta').styles(
      display: Display.flex,
      gap: Gap.all(AppSpacing.md),
      color: textSecondaryColor,
      fontSize: FontSizes.base,
      flexWrap: FlexWrap.wrap,
    ),

    css('.meta-item').styles(
      display: Display.flex,
      alignItems: AlignItems.center,
    ),

    css('.article-content').styles(
      color: textPrimaryColor,
      fontSize: FontSizes.lg,
    ),
  ];
}
