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
          h2(classes: 'sidebar-title', [
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
          ul(classes: 'tutorial-list', [
            for (final tutorial in series.tutorials)
              li(
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
                      span(classes: 'tutorial-title', [
                        text(tutorial.title),
                      ]),

                      // 閱讀時間
                      span(classes: 'tutorial-time', [
                        text('${tutorial.estimatedReadTime} 分'),
                      ]),
                    ]),
                  ),
                ],
              ),
          ]),
        ]),
      ],
    );
  }

  @css
  static List<StyleRule> get styles => [
        // 側邊欄容器
        css('.series-sidebar').styles(
          width: 320.px,
          height: 100.vh,
          position: Position.sticky(),
          backgroundColor: surfaceColor,
          border: Border.only(right: BorderSide(color: borderColor, width: Borders.thin)),
          overflow: Overflow.auto,
          display: Display.flex,
          flexDirection: FlexDirection.column,
        ),

        // Header
        css('.sidebar-header').styles(
          padding: Padding.all(AppSpacing.xl),
          border: Border.only(bottom: BorderSide(color: borderColor, width: Borders.thin)),
          backgroundColor: backgroundColor,
        ),

        css('.sidebar-title').styles(
          fontSize: FontSizes.xl,
          fontWeight: FontWeights.bold,
          color: secondaryColor,
          margin: Margin.only(bottom: AppSpacing.md),
        ),

        // 進度
        css('.sidebar-progress').styles(
          margin: Margin.only(top: AppSpacing.md),
        ),

        css('.progress-text').styles(
          fontSize: FontSizes.sm,
          color: textSecondaryColor,
          display: Display.block,
          margin: Margin.only(bottom: AppSpacing.sm),
        ),

        css('.progress-bar').styles(
          width: 100.percent,
          height: 6.px,
          backgroundColor: Color('#1A57B4BA'),
          overflow: Overflow.hidden,
        ),

        css('.progress-fill').styles(
          height: 100.percent,
          backgroundColor: primaryColor,
        ),

        // 導航區域
        css('.sidebar-nav').styles(
          flex: Flex(grow: 1),
          overflow: Overflow.auto,
          padding: Padding.all(AppSpacing.md),
        ),

        css('.tutorial-list').styles(
          padding: Padding.zero,
          margin: Margin.zero,
        ),

        // 教學項目
        css('.tutorial-item').styles(
          margin: Margin.only(bottom: AppSpacing.xs),
        ),

        css('.tutorial-link').styles(
          display: Display.flex,
          flexDirection: FlexDirection.column,
          padding: Padding.all(AppSpacing.md),
          cursor: Cursor.pointer,
        ),

        css('.tutorial-item:not(.active) .tutorial-link:hover').styles(
          backgroundColor: backgroundColor,
        ),

        // 當前項目
        css('.tutorial-item.active .tutorial-link').styles(
          backgroundColor: primaryColor,
          color: Color('#FFFFFFFF'),
        ),

        // Day 編號
        css('.tutorial-day').styles(
          fontSize: FontSizes.xs,
          fontWeight: FontWeights.bold,
          color: primaryColor,
          letterSpacing: 0.5.px,
        ),

        css('.tutorial-item.active .tutorial-day').styles(
          color: Color('#FFFFFFFF'),
        ),

        // 標題
        css('.tutorial-title').styles(
          fontSize: FontSizes.sm,
          fontWeight: FontWeights.medium,
          color: textPrimaryColor,
        ),

        css('.tutorial-item.active .tutorial-title').styles(
          color: Color('#FFFFFFFF'),
        ),

        // 時間
        css('.tutorial-time').styles(
          fontSize: FontSizes.xs,
          color: textSecondaryColor,
        ),

        css('.tutorial-item.active .tutorial-time').styles(
          color: Color('#CCFFFFFF'),
        ),
      ];
}
