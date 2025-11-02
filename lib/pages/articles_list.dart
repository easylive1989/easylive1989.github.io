import 'package:jaspr/jaspr.dart';
import '../constants/theme.dart';
import '../constants/styles.dart';
import '../models/article.dart';
import '../components/article_card.dart';

/// 文章列表頁
class ArticlesList extends StatelessComponent {
  final List<Article> articles;

  const ArticlesList({
    required this.articles,
    super.key,
  });

  @override
  Component build(BuildContext context) {
    return div(classes: 'articles-list-page', [
      div(classes: 'container', [
        h1(classes: 'page-title', [text('📝 技術分享')]),
        p(classes: 'page-description', [
          text('分享 Flutter 開發實戰經驗與技術見解'),
        ]),

        // 文章列表
        if (articles.isEmpty)
          div(classes: 'empty-state', [
            text('目前還沒有文章'),
          ])
        else
          div(classes: 'articles-grid', [
            for (final article in articles)
              ArticleCard(article: article),
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

        css('.articles-grid').styles(
          display: Display.grid,
          gap: Gap.all(AppSpacing.xl),
        ),

        css('.empty-state').styles(
          textAlign: TextAlign.center,
          padding: Padding.all(AppSpacing.xl3),
          color: textSecondaryColor,
          fontSize: FontSizes.xl,
        ),
      ];
}
