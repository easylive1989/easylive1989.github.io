import 'package:jaspr/jaspr.dart';
import '../constants/theme.dart';
import '../constants/styles.dart';

/// 教學詳細頁
@client
class TutorialDetail extends StatelessComponent {
  final String seriesId;
  final int day;

  const TutorialDetail({
    required this.seriesId,
    required this.day,
    super.key,
  });

  @override
  Component build(BuildContext context) {
    return div(classes: 'tutorial-detail-page', [
      // 主要內容區
      div(classes: 'tutorial-main', [
        // 教學標題
        header(classes: 'tutorial-header', [
          h1(classes: 'tutorial-title', [text('Day $day - 載入中...')]),
          div(classes: 'tutorial-meta', [
            span([text('⏱️ 載入中...')]),
          ]),
        ]),

        // 教學內容
        div(classes: 'tutorial-content', [
          text('內容載入中...'),
        ]),

        // 上一篇/下一篇導航
        // ArticleNavigation 將在此處顯示
      ]),
    ]);
  }

  @css
  static List<StyleRule> get styles => [
    css('.tutorial-detail-page').styles(
      display: Display.flex,
      minHeight: 100.vh,
    ),

    css('.tutorial-main').styles(
      maxWidth: 900.px,
      padding: Padding.all(AppSpacing.xl3),
      margin: Margin.symmetric(horizontal: Unit.auto),
      flex: Flex(grow: 1),
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
      color: textSecondaryColor,
      fontSize: FontSizes.base,
    ),
  ];
}
