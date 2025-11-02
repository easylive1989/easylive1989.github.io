import 'package:jaspr/jaspr.dart';
import 'package:jaspr_router/jaspr_router.dart';
import '../models/tutorial_series.dart';
import '../constants/theme.dart';
import '../constants/styles.dart';

/// 教學系列卡片元件
///
/// 顯示教學系列的摘要資訊，包括名稱、天數、總時長、難度等
class TutorialCard extends StatelessComponent {
  final TutorialSeries series;

  const TutorialCard({required this.series, super.key});

  @override
  Component build(BuildContext context) {
    return Link(
      to: '/tutorials/${series.id}/1', // 連結到第一天
      child: div(
        classes: 'tutorial-card',
        [
          // 封面圖片（如果有）
          if (series.coverImage != null)
            div(classes: 'tutorial-card-image', [
              img(
                src: series.coverImage!,
                alt: series.name,
              ),
            ])
          else
            // 預設漸層背景
            div(classes: 'tutorial-card-image tutorial-card-gradient', [
              div(classes: 'tutorial-card-overlay', [
                span(classes: 'tutorial-days-badge', [
                  text('${series.totalDays} 天'),
                ]),
              ]),
            ]),

          // 內容區域
          div(classes: 'tutorial-card-content', [
            // 難度標籤
            div(classes: 'tutorial-card-tags', [
              span(
                classes: 'difficulty-tag difficulty-${series.difficulty}',
                [text(SeriesDifficulty.getLabel(series.difficulty))],
              ),
              ...series.tags.map((tag) => span(classes: 'tag', [text(tag)])),
            ]),

            // 系列名稱
            h3(classes: 'tutorial-card-title', [
              text(series.name),
            ]),

            // 描述
            p(classes: 'tutorial-card-description', [
              text(series.description),
            ]),

            // Meta 資訊
            div(classes: 'tutorial-card-meta', [
              // 總天數
              span(classes: 'meta-item', [
                text('📚 ${series.totalDays} 篇'),
              ]),

              // 總閱讀時間
              span(classes: 'meta-item', [
                text('⏱️ ${series.totalReadTime} 分鐘'),
              ]),

              // 進度（示例：可以後續加入使用者進度追蹤）
              span(classes: 'meta-item', [
                text('🎯 開始學習'),
              ]),
            ]),

            // 進度條（示例）
            div(classes: 'tutorial-progress-bar', [
              div(
                classes: 'tutorial-progress-fill',
                [],
              ),
            ]),
          ]),
        ],
      ),
    );
  }

  @css
  static List<StyleRule> get styles => [
    // 卡片容器
    css('.tutorial-card').styles(
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

    css('.tutorial-card:hover').styles(),

    // 封面圖片/漸層
    css('.tutorial-card-image').styles(
      position: Position.relative(),
      width: 100.percent,
      height: 200.px,
      overflow: Overflow.hidden,
      backgroundColor: surfaceColor,
    ),

    css('.tutorial-card-gradient').styles(),

    css('.tutorial-card-overlay').styles(
      display: Display.flex,
      position: Position.absolute(),
      justifyContent: JustifyContent.center,
      alignItems: AlignItems.center,
    ),

    css('.tutorial-days-badge').styles(
      padding: Padding.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
      color: secondaryColor,
      fontSize: FontSizes.xl3,
      fontWeight: FontWeights.bold,
      backgroundColor: Color('#CCFFFFFF'),
    ),

    css('.tutorial-card-image img').styles(
      width: 100.percent,
      height: 100.percent,
    ),

    // 內容區域
    css('.tutorial-card-content').styles(
      padding: Padding.all(AppSpacing.lg),
    ),

    // 標籤區域
    css('.tutorial-card-tags').styles(
      display: Display.flex,
      margin: Margin.only(bottom: AppSpacing.md),
      flexWrap: FlexWrap.wrap,
    ),

    css('.tutorial-card-tags .tag, .tutorial-card-tags .difficulty-tag').styles(
      display: Display.inlineBlock,
      padding: Padding.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
      fontSize: FontSizes.sm,
      fontWeight: FontWeights.semibold,
    ),

    // 難度標籤顏色
    css('.difficulty-beginner').styles(
      color: Color('#FF4CAF50'),
      backgroundColor: Color('#1A4CAF50'),
    ),

    css('.difficulty-intermediate').styles(
      color: primaryColor,
      backgroundColor: Color('#1A57B4BA'),
    ),

    css('.difficulty-advanced').styles(
      color: tertiaryColor,
      backgroundColor: Color('#1AFE4F2D'),
    ),

    css('.tutorial-card-tags .tag').styles(
      color: textSecondaryColor,
      backgroundColor: surfaceColor,
    ),

    // 標題
    css('.tutorial-card-title').styles(
      margin: Margin.only(bottom: AppSpacing.md),
      color: secondaryColor,
      fontSize: FontSizes.xl2,
      fontWeight: FontWeights.bold,
    ),

    css('.tutorial-card:hover .tutorial-card-title').styles(
      color: primaryColor,
    ),

    // 描述
    css('.tutorial-card-description').styles(
      margin: Margin.only(bottom: AppSpacing.md),
      color: textSecondaryColor,
      fontSize: FontSizes.base,
    ),

    // Meta 資訊
    css('.tutorial-card-meta').styles(
      display: Display.flex,
      margin: Margin.only(bottom: AppSpacing.md),
      flexWrap: FlexWrap.wrap,
      color: textSecondaryColor,
      fontSize: FontSizes.sm,
    ),

    css('.tutorial-card-meta .meta-item').styles(
      display: Display.flex,
      alignItems: AlignItems.center,
    ),

    // 進度條
    css('.tutorial-progress-bar').styles(
      width: 100.percent,
      height: 4.px,
      overflow: Overflow.hidden,
      backgroundColor: surfaceColor,
    ),

    css('.tutorial-progress-fill').styles(
      height: 100.percent,
      backgroundColor: primaryColor,
    ),
  ];
}
