import 'package:jaspr/jaspr.dart';
import '../constants/theme.dart';
import '../constants/styles.dart';

/// 文章列表頁
@client
class ArticlesList extends StatelessComponent {
  const ArticlesList({super.key});

  @override
  Component build(BuildContext context) {
    return div(classes: 'articles-list-page', [
      div(classes: 'container', [
        h1(classes: 'page-title', [text('📝 技術分享')]),
        p(classes: 'page-description', [
          text('分享 Flutter 開發實戰經驗與技術見解'),
        ]),

        // 文章列表將在這裡顯示
        div(classes: 'articles-grid', [
          text('文章載入中...'),
        ]),
      ]),
    ]);
  }

  @css
  static List<StyleRule> get styles => [
        css('.articles-list-page').styles(
          padding: Padding.symmetric(vertical: AppSpacing.xl3, horizontal: AppSpacing.xl),
          minHeight: 100.vh,
        ),

        css('.page-title').styles(
          fontSize: FontSizes.xl5,
          fontWeight: FontWeights.bold,
          color: secondaryColor,
          margin: Margin.only(bottom: AppSpacing.md),
        ),

        css('.page-description').styles(
          fontSize: FontSizes.xl,
          color: textSecondaryColor,
          margin: Margin.only(bottom: AppSpacing.xl2),
        ),
      ];
}
