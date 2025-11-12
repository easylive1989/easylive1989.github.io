import 'package:jaspr/jaspr.dart';
import '../constants/theme.dart';
import '../constants/styles.dart';
import '../models/tutorial.dart';
import '../models/tutorial_series.dart';
import '../components/markdown_renderer.dart';
import '../components/series_sidebar.dart';
import '../components/article_navigation.dart';

/// 教學詳細頁
class TutorialDetail extends StatelessComponent {
  final Tutorial tutorial;
  final TutorialSeries series;

  const TutorialDetail({
    required this.tutorial,
    required this.series,
    super.key,
  });

  @override
  Component build(BuildContext context) {
    return div(classes: 'tutorial-detail-page', [
      // 系列側邊欄
      SeriesSidebar(
        series: series,
        currentTutorial: tutorial,
      ),

      // 主要內容區
      div(classes: 'tutorial-main', [
        // 系列資訊
        div(classes: 'series-info', [
          span(classes: 'series-name', [text(series.name)]),
          span(classes: 'series-progress', [
            text('Day ${tutorial.day} / ${series.totalDays}'),
          ]),
        ]),

        // 教學標題
        header(classes: 'tutorial-header', [
          h1(classes: 'tutorial-title', [text(tutorial.fullTitle)]),
        ]),

        // 教學內容
        div(classes: 'tutorial-content', [
          MarkdownRenderer(
            markdown: tutorial.content,
            imageBasePath: tutorial.directoryName != null
                ? '/content/tutorials/${series.name}/${tutorial.directoryName}'
                : '/content/tutorials/${series.name}',
          ),
        ]),

        // 上一篇/下一篇導航
        ArticleNavigation(
          seriesId: series.id,
          previousTutorial: tutorial.previousId != null ? series.getTutorialById(tutorial.previousId!) : null,
          nextTutorial: tutorial.nextId != null ? series.getTutorialById(tutorial.nextId!) : null,
        ),
      ]),
    ]);
  }

  @css
  static List<StyleRule> get styles => [
    css('.tutorial-detail-page').styles(
      display: Display.flex,
    ),

    css('.tutorial-main').styles(
      padding: Padding.all(AppSpacing.xl3),
      margin: Margin.symmetric(horizontal: Unit.auto),
      overflow: Overflow.auto,
      flex: Flex(grow: 1),
    ),

    css('.tutorial-main::-webkit-scrollbar').styles(
      display: Display.none,
    ),

    css('.series-info').styles(
      display: Display.flex,
      padding: Padding.all(AppSpacing.md),
      margin: Margin.only(bottom: AppSpacing.xl),
      justifyContent: JustifyContent.spaceBetween,
      alignItems: AlignItems.center,
      backgroundColor: Color('#F8FAFB'),
    ),

    css('.series-name').styles(
      color: primaryColor,
      fontSize: FontSizes.base,
      fontWeight: FontWeights.semibold,
    ),

    css('.series-progress').styles(
      color: textSecondaryColor,
      fontSize: FontSizes.sm,
    ),

    css('.tutorial-header').styles(
      padding: Padding.only(bottom: AppSpacing.xl),
      margin: Margin.only(bottom: AppSpacing.xl2),
      border: Border.only(
        bottom: BorderSide(color: borderColor, width: Borders.thin),
      ),
    ),

    css('.tutorial-title').styles(
      margin: Margin.only(bottom: AppSpacing.lg),
      color: secondaryColor,
      fontSize: FontSizes.xl4,
      fontWeight: FontWeights.bold,
    ),

    css('.tutorial-meta').styles(
      display: Display.flex,
      gap: Gap.all(AppSpacing.md),
      color: textSecondaryColor,
      fontSize: FontSizes.base,
    ),

    css('.meta-item').styles(
      display: Display.flex,
      alignItems: AlignItems.center,
    ),

    css('.tutorial-content').styles(
      margin: Margin.only(bottom: AppSpacing.xl2),
      color: textPrimaryColor,
      fontSize: FontSizes.lg,
    ),
  ];
}
