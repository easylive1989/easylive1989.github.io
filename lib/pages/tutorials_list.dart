import 'package:jaspr/jaspr.dart';
import '../constants/theme.dart';
import '../constants/styles.dart';
import '../models/tutorial_series.dart';
import '../components/tutorial_card.dart';

/// 教學系列列表頁
class TutorialsList extends StatelessComponent {
  final List<TutorialSeries> series;

  const TutorialsList({
    required this.series,
    super.key,
  });

  @override
  Component build(BuildContext context) {
    return div(classes: 'tutorials-list-page', [
      div(classes: 'container', [
        h1(classes: 'page-title', [text('🎓 教學系列')]),
        p(classes: 'page-description', [
          text('完整的 Flutter 系列教學，從基礎到進階，step by step 帶你掌握 Flutter 開發技能'),
        ]),

        // 系列列表
        if (series.isEmpty)
          div(classes: 'empty-state', [
            text('目前還沒有教學系列'),
          ])
        else
          div(classes: 'tutorials-grid', [
            for (final tutorialSeries in series)
              TutorialCard(series: tutorialSeries),
          ]),
      ]),
    ]);
  }

  @css
  static List<StyleRule> get styles => [
        css('.tutorials-list-page').styles(
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

        css('.tutorials-grid').styles(
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
