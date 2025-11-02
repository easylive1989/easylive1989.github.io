import 'package:jaspr/jaspr.dart';
import 'package:jaspr_router/jaspr_router.dart';
import '../models/tutorial.dart';
import '../constants/theme.dart';
import '../constants/styles.dart';

/// 文章導航元件
///
/// 顯示上一篇/下一篇按鈕，用於教學系列的連續閱讀
class ArticleNavigation extends StatelessComponent {
  final Tutorial? previousTutorial;
  final Tutorial? nextTutorial;
  final String seriesId;

  const ArticleNavigation({
    this.previousTutorial,
    this.nextTutorial,
    required this.seriesId,
    super.key,
  });

  @override
  Component build(BuildContext context) {
    return nav(
      classes: 'article-navigation',
      [
        // 上一篇
        if (previousTutorial != null)
          Link(
            to: '/tutorials/$seriesId/${previousTutorial!.day}',
            child: div(classes: 'nav-item nav-prev', [
              span(classes: 'nav-label', [text('← 上一篇')]),
              span(classes: 'nav-title', [text(previousTutorial!.title)]),
              span(classes: 'nav-day', [text('Day ${previousTutorial!.day}')]),
            ]),
          )
        else
          div(classes: 'nav-item nav-placeholder', []),

        // 下一篇
        if (nextTutorial != null)
          Link(
            to: '/tutorials/$seriesId/${nextTutorial!.day}',
            child: div(classes: 'nav-item nav-next', [
              span(classes: 'nav-label', [text('下一篇 →')]),
              span(classes: 'nav-title', [text(nextTutorial!.title)]),
              span(classes: 'nav-day', [text('Day ${nextTutorial!.day}')]),
            ]),
          )
        else
          div(classes: 'nav-item nav-placeholder', []),
      ],
    );
  }

  @css
  static List<StyleRule> get styles => [
        // 導航容器
        css('.article-navigation').styles(
          display: Display.flex,
          justifyContent: JustifyContent.spaceBetween,
          margin: Margin.only(top: AppSpacing.xl3, bottom: AppSpacing.xl),
          padding: Padding.all(AppSpacing.xl),
          backgroundColor: surfaceColor,
          border: Border.only(
            top: BorderSide(color: borderColor, width: Borders.thin),
            right: BorderSide(color: borderColor, width: Borders.thin),
            bottom: BorderSide(color: borderColor, width: Borders.thin),
            left: BorderSide(color: borderColor, width: Borders.thin),
          ),
        ),

        // 導航項目
        css('.nav-item').styles(
          display: Display.flex,
          flexDirection: FlexDirection.column,
          padding: Padding.all(AppSpacing.lg),
          border: Border.only(
            top: BorderSide(color: borderColor, width: Borders.thin),
            right: BorderSide(color: borderColor, width: Borders.thin),
            bottom: BorderSide(color: borderColor, width: Borders.thin),
            left: BorderSide(color: borderColor, width: Borders.thin),
          ),
          backgroundColor: backgroundColor,
          flex: Flex(grow: 1),
          maxWidth: 48.percent,
          cursor: Cursor.pointer,
        ),

        // 佔位元素（當沒有上一篇或下一篇時）
        css('.nav-placeholder').styles(
          visibility: Visibility.hidden,
        ),

        // 上一篇（左對齊）
        css('.nav-prev').styles(
          alignItems: AlignItems.start,
          textAlign: TextAlign.left,
        ),

        // 下一篇（右對齊）
        css('.nav-next').styles(
          alignItems: AlignItems.end,
          textAlign: TextAlign.right,
        ),

        // 標籤（上一篇/下一篇）
        css('.nav-label').styles(
          fontSize: FontSizes.sm,
          fontWeight: FontWeights.semibold,
          color: primaryColor,
          letterSpacing: 0.5.px,
        ),

        // 標題
        css('.nav-title').styles(
          fontSize: FontSizes.lg,
          fontWeight: FontWeights.semibold,
          color: secondaryColor,
        ),

        css('.nav-item:hover .nav-title').styles(
          color: primaryColor,
        ),

        // Day 標籤
        css('.nav-day').styles(
          fontSize: FontSizes.xs,
          color: textSecondaryColor,
        ),
      ];
}
