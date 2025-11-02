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
          backgroundColor: backgroundColor,
          border: Border.only(
            top: BorderSide(color: borderColor, width: Borders.thin),
            right: BorderSide(color: borderColor, width: Borders.thin),
            bottom: BorderSide(color: borderColor, width: Borders.thin),
            left: BorderSide(color: borderColor, width: Borders.thin),
          ),
          overflow: Overflow.hidden,
          cursor: Cursor.pointer,
        ),

        css('.tutorial-card:hover').styles(
        ),

        // 封面圖片/漸層
        css('.tutorial-card-image').styles(
          width: 100.percent,
          height: 200.px,
          overflow: Overflow.hidden,
          backgroundColor: surfaceColor,
          position: Position.relative(),
        ),

        css('.tutorial-card-gradient').styles(
        ),

        css('.tutorial-card-overlay').styles(
          position: Position.absolute(),
          display: Display.flex,
          alignItems: AlignItems.center,
          justifyContent: JustifyContent.center,
        ),

        css('.tutorial-days-badge').styles(
          padding: Padding.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
          backgroundColor: Color('#CCFFFFFF'),
          color: secondaryColor,
          fontSize: FontSizes.xl3,
          fontWeight: FontWeights.bold,
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
          flexWrap: FlexWrap.wrap,
          margin: Margin.only(bottom: AppSpacing.md),
        ),

        css('.tutorial-card-tags .tag, .tutorial-card-tags .difficulty-tag').styles(
          display: Display.inlineBlock,
          padding: Padding.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
          fontSize: FontSizes.sm,
          fontWeight: FontWeights.semibold,
        ),

        // 難度標籤顏色
        css('.difficulty-beginner').styles(
          backgroundColor: Color('#1A4CAF50'),
          color: Color('#FF4CAF50'),
        ),

        css('.difficulty-intermediate').styles(
          backgroundColor: Color('#1A57B4BA'),
          color: primaryColor,
        ),

        css('.difficulty-advanced').styles(
          backgroundColor: Color('#1AFE4F2D'),
          color: tertiaryColor,
        ),

        css('.tutorial-card-tags .tag').styles(
          backgroundColor: surfaceColor,
          color: textSecondaryColor,
        ),

        // 標題
        css('.tutorial-card-title').styles(
          fontSize: FontSizes.xl2,
          fontWeight: FontWeights.bold,
          color: secondaryColor,
          margin: Margin.only(bottom: AppSpacing.md),
        ),

        css('.tutorial-card:hover .tutorial-card-title').styles(
          color: primaryColor,
        ),

        // 描述
        css('.tutorial-card-description').styles(
          fontSize: FontSizes.base,
          color: textSecondaryColor,
          margin: Margin.only(bottom: AppSpacing.md),
        ),

        // Meta 資訊
        css('.tutorial-card-meta').styles(
          display: Display.flex,
          flexWrap: FlexWrap.wrap,
          fontSize: FontSizes.sm,
          color: textSecondaryColor,
          margin: Margin.only(bottom: AppSpacing.md),
        ),

        css('.tutorial-card-meta .meta-item').styles(
          display: Display.flex,
          alignItems: AlignItems.center,
        ),

        // 進度條
        css('.tutorial-progress-bar').styles(
          width: 100.percent,
          height: 4.px,
          backgroundColor: surfaceColor,
          overflow: Overflow.hidden,
        ),

        css('.tutorial-progress-fill').styles(
          height: 100.percent,
          backgroundColor: primaryColor,
        ),
      ];
}
