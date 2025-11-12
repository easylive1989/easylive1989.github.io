import 'package:jaspr/jaspr.dart';
import 'package:jaspr_router/jaspr_router.dart';
import '../models/article.dart';
import '../constants/theme.dart';
import '../constants/styles.dart';

/// 文章卡片元件
///
/// 顯示文章的摘要資訊，包括標題、摘要、領域、閱讀時間等
class ArticleCard extends StatelessComponent {
  final Article article;

  const ArticleCard({required this.article, super.key});

  @override
  Component build(BuildContext context) {
    return Link(
      to: '/articles/${article.id}',
      child: div(
        classes: 'article-card',
        [
          // 封面圖片（如果有）
          if (article.coverImage != null)
            div(classes: 'article-card-image', [
              img(
                src: article.coverImage!,
                alt: article.title,
              ),
            ]),

          // 內容區域
          div(classes: 'article-card-content', [
            // 領域標籤
            if (article.domain != null)
              span(classes: 'article-card-tag', [
                text(article.domain!),
              ]),

            // 標題
            h3(classes: 'article-card-title', [
              text(article.title),
            ]),

            // 摘要
            if (article.excerpt != null)
              p(classes: 'article-card-excerpt', [
                text(article.excerpt!),
              ]),

            // Meta 資訊
            div(classes: 'article-card-meta', [
              // 日期
              if (article.updatedAt != null || article.createdAt != null)
                span(classes: 'meta-item', [
                  text('📅 ${_formatDate(article.updatedAt ?? article.createdAt!)}'),
                ]),

              // 類型
              if (article.type != null)
                span(classes: 'meta-item', [
                  text('📝 ${article.type}'),
                ]),
            ]),
          ]),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.year}/${date.month.toString().padLeft(2, '0')}/${date.day.toString().padLeft(2, '0')}';
  }

  @css
  static List<StyleRule> get styles => [
    // 卡片容器
    css('.article-card').styles(
      display: Display.block,
      border: Border.only(
        top: BorderSide(color: borderColor, width: Borders.thin),
        right: BorderSide(color: borderColor, width: Borders.thin),
        bottom: BorderSide(color: borderColor, width: Borders.thin),
        left: BorderSide(color: borderColor, width: Borders.thin),
      ),
      overflow: Overflow.hidden,
      cursor: Cursor.pointer,
      backgroundColor: backgroundColor,
    ),

    css('.article-card:hover').styles(),

    // 封面圖片
    css('.article-card-image').styles(
      width: 100.percent,
      height: 200.px,
      overflow: Overflow.hidden,
      backgroundColor: surfaceColor,
    ),

    css('.article-card-image img').styles(
      width: 100.percent,
      height: 100.percent,
    ),

    // 內容區域
    css('.article-card-content').styles(
      padding: Padding.all(AppSpacing.lg),
    ),

    // 標籤
    css('.article-card-tag').styles(
      display: Display.inlineBlock,
      padding: Padding.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
      margin: Margin.only(bottom: AppSpacing.sm),
      color: primaryColor,
      fontSize: FontSizes.sm,
      fontWeight: FontWeights.semibold,
      backgroundColor: Color('#1A57B4BA'),
    ),

    // 標題
    css('.article-card-title').styles(
      margin: Margin.only(bottom: AppSpacing.md),
      color: secondaryColor,
      fontSize: FontSizes.xl2,
      fontWeight: FontWeights.bold,
    ),

    css('.article-card:hover .article-card-title').styles(
      color: primaryColor,
    ),

    // 摘要
    css('.article-card-excerpt').styles(
      margin: Margin.only(bottom: AppSpacing.md),
      color: textSecondaryColor,
      fontSize: FontSizes.base,
    ),

    // Meta 資訊
    css('.article-card-meta').styles(
      display: Display.flex,
      flexWrap: FlexWrap.wrap,
      color: textSecondaryColor,
      fontSize: FontSizes.sm,
    ),

    css('.article-card-meta .meta-item').styles(
      display: Display.flex,
      alignItems: AlignItems.center,
    ),
  ];
}
