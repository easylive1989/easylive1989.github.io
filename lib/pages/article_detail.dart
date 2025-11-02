import 'package:jaspr/jaspr.dart';
import '../components/markdown_renderer.dart';
import '../constants/theme.dart';
import '../constants/styles.dart';

/// 文章詳細頁
@client
class ArticleDetail extends StatelessComponent {
  final String articleId;

  const ArticleDetail({required this.articleId, super.key});

  @override
  Component build(BuildContext context) {
    return article(classes: 'article-detail-page', [
      div(classes: 'container', [
        // 文章標題區
        header(classes: 'article-header', [
          h1(classes: 'article-title', [text('載入中...')]),
          div(classes: 'article-meta', [
            span([text('📅 載入中...')]),
            span([text('⏱️ 載入中...')]),
          ]),
        ]),

        // 文章內容
        div(classes: 'article-content', [
          text('內容載入中...'),
        ]),
      ]),
    ]);
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

    css('.article-title').styles(
      margin: Margin.only(bottom: AppSpacing.lg),
      color: secondaryColor,
      fontSize: FontSizes.xl5,
      fontWeight: FontWeights.bold,
    ),

    css('.article-meta').styles(
      display: Display.flex,
      color: textSecondaryColor,
      fontSize: FontSizes.base,
    ),
  ];
}
