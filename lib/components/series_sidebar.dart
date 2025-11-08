import 'package:jaspr/jaspr.dart';
import 'package:jaspr_router/jaspr_router.dart';
import '../models/tutorial_series.dart';
import '../models/tutorial.dart';
import '../constants/theme.dart';
import '../constants/styles.dart';

/// 系列側邊欄元件
///
/// 顯示教學系列的所有章節列表，並高亮當前章節
class SeriesSidebar extends StatelessComponent {
  final TutorialSeries series;
  final Tutorial currentTutorial;

  const SeriesSidebar({
    required this.series,
    required this.currentTutorial,
    super.key,
  });

  @override
  Component build(BuildContext context) {
    return aside(
      classes: 'series-sidebar',
      [
        // 系列標題
        div(classes: 'sidebar-header', [
          div(classes: 'sidebar-title', [
            text(series.name),
          ]),

          // 進度指示器
          div(classes: 'sidebar-progress', [
            span(classes: 'progress-text', [
              text('進度: ${currentTutorial.day}/${series.totalDays}'),
            ]),
            div(classes: 'progress-bar', [
              div(classes: 'progress-fill', []),
            ]),
          ]),
        ]),

        // 章節列表
        nav(classes: 'sidebar-nav', [
          for (final tutorial in series.tutorials)
            span(
              classes: tutorial.id == currentTutorial.id ? 'tutorial-item active' : 'tutorial-item',
              [
                Link(
                  to: '/tutorials/${series.id}/${tutorial.day}',
                  child: div(classes: 'tutorial-link', [
                    // Day 編號
                    span(classes: 'tutorial-day', [
                      text('Day ${tutorial.day}'),
                    ]),

                    // 標題
                    span(classes: 'tutorial-name', [
                      text(tutorial.title),
                    ]),
                  ]),
                ),
              ],
            ),
        ]),
      ],
    );
  }

  @css
  static List<StyleRule> get styles => [
    // 側邊欄容器
    css('.series-sidebar').styles(
      display: Display.flex,
      position: Position.sticky(top: 12.px),
      width: 320.px,
      height: 80.vh,
      margin: Margin.all(AppSpacing.md),
      border: Border(color: borderColor, width: Borders.thin),
      flexDirection: FlexDirection.column,
      backgroundColor: surfaceColor,
    ),

    // Header
    css('.sidebar-header').styles(
      padding: Padding.all(AppSpacing.xl),
      border: Border.only(
        bottom: BorderSide(color: borderColor, width: Borders.thin),
      ),
      backgroundColor: backgroundColor,
    ),

    css('.sidebar-title').styles(
      margin: Margin.only(bottom: AppSpacing.md),
      color: secondaryColor,
      fontSize: FontSizes.xl,
      fontWeight: FontWeights.bold,
    ),

    // 進度
    css('.sidebar-progress').styles(
      margin: Margin.only(top: AppSpacing.md),
    ),

    css('.progress-text').styles(
      display: Display.block,
      margin: Margin.only(bottom: AppSpacing.sm),
      color: textSecondaryColor,
      fontSize: FontSizes.sm,
    ),

    css('.progress-bar').styles(
      width: 100.percent,
      height: 6.px,
      overflow: Overflow.hidden,
      backgroundColor: Color('#1A57B4BA'),
    ),

    css('.progress-fill').styles(
      height: 100.percent,
      backgroundColor: primaryColor,
    ),

    // 導航區域
    css('.sidebar-nav').styles(
      overflow: Overflow.auto,
      flexDirection: FlexDirection.column,
      flex: Flex(grow: 1),
    ),

    css('.sidebar-nav::-webkit-scrollbar').styles(
      display: Display.none,
    ),

    // 教學項目
    css('.tutorial-item').styles(
      margin: Margin.only(bottom: AppSpacing.xs),
    ),

    css('.tutorial-link').styles(
      display: Display.flex,
      padding: Padding.all(AppSpacing.md),
      cursor: Cursor.pointer,
      flexDirection: FlexDirection.column,
    ),

    css('.tutorial-item:not(.active) .tutorial-link:hover').styles(
      backgroundColor: backgroundColor,
    ),

    // 當前項目
    css('.tutorial-item.active .tutorial-link').styles(
      color: Color('#FFFFFFFF'),
      backgroundColor: primaryColor,
    ),

    // Day 編號
    css('.tutorial-day').styles(
      color: primaryColor,
      fontSize: FontSizes.xs,
      fontWeight: FontWeights.bold,
      letterSpacing: 0.5.px,
    ),

    css('.tutorial-item.active .tutorial-day').styles(
      color: Color('#FFFFFFFF'),
    ),

    // 標題
    css('.tutorial-name').styles(
      color: textPrimaryColor,
      fontSize: FontSizes.base,
      fontWeight: FontWeights.bold,
    ),

    css('.tutorial-item.active .tutorial-name').styles(
      color: Color('#FFFFFFFF'),
    ),

    // 時間
    css('.tutorial-time').styles(
      color: textSecondaryColor,
      fontSize: FontSizes.xs,
    ),

    css('.tutorial-item.active .tutorial-time').styles(
      color: Color('#CCFFFFFF'),
    ),
  ];
}
