import 'package:jaspr/jaspr.dart';
import 'package:jaspr_router/jaspr_router.dart';

import '../constants/theme.dart';
import '../constants/styles.dart';

/// 首頁
///
/// 展示 Hero section、最新文章、教學系列
@client
class Home extends StatefulComponent {
  const Home({super.key});

  @override
  State<Home> createState() => HomeState();
}

class HomeState extends State<Home> {
  @override
  Component build(BuildContext context) {
    return div(classes: 'home-page', [
      // Hero Section
      _buildHeroSection(),

      // 最新文章區
      _buildLatestArticlesSection(),

      // 教學系列區
      _buildTutorialSeriesSection(),

      // CTA Section
      _buildCTASection(),
    ]);
  }

  /// Hero Section
  Component _buildHeroSection() {
    return section(classes: 'hero-section', [
      div(classes: 'hero-content', [
        h1(classes: 'hero-title', [
          text('Learn with Paul'),
        ]),

        p(classes: 'hero-subtitle', [
          text('Flutter 開發者的技術分享與教學平台'),
        ]),

        p(classes: 'hero-description', [
          text('深入淺出的技術文章、完整的系列教學，幫助你掌握 Flutter 開發技能'),
        ]),

        div(classes: 'hero-actions', [
          Link(
            to: '/about',
            child: button(classes: 'btn btn-primary', [
              text('關於我'),
            ]),
          ),
        ]),
      ]),
    ]);
  }

  /// 最新文章區
  Component _buildLatestArticlesSection() {
    return section(classes: 'section latest-articles', [
      div(classes: 'container', [
        div(classes: 'section-header', [
          h2(classes: 'section-title', [text('📝 最新技術分享')]),
        ]),

        // 這裡將顯示最新文章卡片
        // 實際內容將在路由系統完成後動態載入
        div(classes: 'articles-grid', [
          _buildArticlePlaceholder(
            '自製 Flutter Tab Bar',
            'Flutter',
            '深入探討如何使用 CustomMultiChildLayout 創建客製化的 Tab Bar 元件...',
          ),
        ]),
      ]),
    ]);
  }

  /// 教學系列區
  Component _buildTutorialSeriesSection() {
    return section(classes: 'section tutorial-series', [
      div(classes: 'container', [
        div(classes: 'section-header', [
          h2(classes: 'section-title', [text('📚 系列教學課程')]),
        ]),

        div(classes: 'series-grid', [
          _buildSeriesPlaceholder(
            '30 天學會 Flutter 設計',
            '深入學習 Flutter 設計相關知識，包含 Widget、狀態管理、架構模式等主題',
            '30 篇',
            '中級',
          ),
          _buildSeriesPlaceholder(
            '30 天學會 Flutter 測試',
            '完整的 Flutter 測試實戰教學，涵蓋單元測試、Widget 測試和整合測試',
            '30 篇',
            '中級',
          ),
        ]),
      ]),
    ]);
  }

  /// CTA Section
  Component _buildCTASection() {
    return section(classes: 'cta-section', [
      div(classes: 'cta-content', [
        h2(classes: 'cta-title', [text('準備好開始學習了嗎？')]),
        p(classes: 'cta-description', [
          text('選擇一個系列教學，立即開始你的 Flutter 學習之旅'),
        ]),
        Link(
          to: '/about',
          child: button(classes: 'btn btn-large btn-primary', [
            text('了解更多'),
          ]),
        ),
      ]),
    ]);
  }

  /// 文章佔位卡片（臨時）
  Component _buildArticlePlaceholder(String title, String tag, String excerpt) {
    return article(classes: 'article-placeholder', [
      span(classes: 'article-tag', [text(tag)]),
      h3(classes: 'article-title', [text(title)]),
      p(classes: 'article-excerpt', [text(excerpt)]),
      div(classes: 'article-meta', [
        span([text('⏱️ 5 分鐘')]),
        span([text('📅 2024/10/30')]),
      ]),
    ]);
  }

  /// 系列佔位卡片（臨時）
  Component _buildSeriesPlaceholder(String name, String description, String count, String difficulty) {
    return article(classes: 'series-placeholder', [
      div(classes: 'series-badge', [text(count)]),
      h3(classes: 'series-title', [text(name)]),
      p(classes: 'series-description', [text(description)]),
      div(classes: 'series-meta', [
        span(classes: 'difficulty-badge', [text(difficulty)]),
      ]),
    ]);
  }

  @css
  static List<StyleRule> get styles => [
    // 首頁容器
    css('.home-page').styles(
      width: 100.percent,
      minHeight: 100.vh,
    ),

    // Hero Section
    css('.hero-section').styles(
      padding: Padding.symmetric(vertical: AppSpacing.xl5, horizontal: AppSpacing.xl),
      color: Color('#FFFFFFFF'),
      textAlign: TextAlign.center,
    ),

    css('.hero-content').styles(
      maxWidth: ContainerWidths.lg,
      margin: Margin.symmetric(horizontal: Unit.auto),
    ),

    css('.hero-title').styles(
      margin: Margin.only(bottom: AppSpacing.lg),
      color: Color('#FFFFFFFF'),
      fontSize: FontSizes.xl6,
      fontWeight: FontWeights.bold,
    ),

    css('.hero-subtitle').styles(
      margin: Margin.only(bottom: AppSpacing.md),
      fontSize: FontSizes.xl2,
      fontWeight: FontWeights.medium,
    ),

    css('.hero-description').styles(
      margin: Margin.only(bottom: AppSpacing.xl2),
      opacity: 0.9,
      fontSize: FontSizes.xl,
    ),

    css('.hero-actions').styles(
      display: Display.flex,
      flexWrap: FlexWrap.wrap,
      justifyContent: JustifyContent.center,
    ),

    // Buttons
    css('.btn').styles(
      display: Display.inlineBlock,
      padding: Padding.symmetric(horizontal: AppSpacing.xl, vertical: AppSpacing.md),
      cursor: Cursor.pointer,
      fontSize: FontSizes.lg,
      fontWeight: FontWeights.semibold,
      textDecoration: TextDecoration.none,
    ),

    css('.btn-primary').styles(
      color: primaryColor,
      backgroundColor: Color('#FFFFFFFF'),
    ),

    css('.btn-secondary').styles(
      border: Border.only(
        top: BorderSide(color: Color('#FFFFFFFF'), width: Borders.medium),
        right: BorderSide(color: Color('#FFFFFFFF'), width: Borders.medium),
        bottom: BorderSide(color: Color('#FFFFFFFF'), width: Borders.medium),
        left: BorderSide(color: Color('#FFFFFFFF'), width: Borders.medium),
      ),
      color: Color('#FFFFFFFF'),
    ),

    css('.btn-secondary:hover').styles(
      backgroundColor: Color('#1AFFFFFF'),
    ),

    css('.btn-large').styles(
      padding: Padding.symmetric(horizontal: AppSpacing.xl2, vertical: AppSpacing.lg),
      fontSize: FontSizes.xl,
    ),

    // Section
    css('.section').styles(
      padding: Padding.symmetric(vertical: AppSpacing.xl4, horizontal: AppSpacing.xl),
    ),

    css('.container').styles(
      maxWidth: ContainerWidths.xl,
      margin: Margin.symmetric(horizontal: Unit.auto),
    ),

    css('.section-header').styles(
      display: Display.flex,
      margin: Margin.only(bottom: AppSpacing.xl2),
      justifyContent: JustifyContent.spaceBetween,
      alignItems: AlignItems.center,
    ),

    css('.section-title').styles(
      color: secondaryColor,
      fontSize: FontSizes.xl4,
      fontWeight: FontWeights.bold,
    ),

    css('.section-link').styles(
      color: primaryColor,
      fontSize: FontSizes.lg,
      fontWeight: FontWeights.semibold,
    ),

    css('.section-link:hover').styles(
      color: secondaryColor,
    ),

    // Grid
    css('.articles-grid, .series-grid').styles(
      display: Display.grid,
    ),

    // Placeholder cards
    css('.article-placeholder, .series-placeholder').styles(
      padding: Padding.all(AppSpacing.xl),
      border: Border.only(
        top: BorderSide(color: borderColor, width: Borders.thin),
        right: BorderSide(color: borderColor, width: Borders.thin),
        bottom: BorderSide(color: borderColor, width: Borders.thin),
        left: BorderSide(color: borderColor, width: Borders.thin),
      ),
      backgroundColor: backgroundColor,
    ),

    css('.article-tag').styles(
      display: Display.inlineBlock,
      padding: Padding.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
      margin: Margin.only(bottom: AppSpacing.md),
      color: primaryColor,
      fontSize: FontSizes.sm,
      fontWeight: FontWeights.semibold,
      backgroundColor: Color('#1A57B4BA'),
    ),

    css('.article-title, .series-title').styles(
      margin: Margin.only(bottom: AppSpacing.md),
      color: secondaryColor,
      fontSize: FontSizes.xl2,
      fontWeight: FontWeights.bold,
    ),

    css('.article-excerpt, .series-description').styles(
      margin: Margin.only(bottom: AppSpacing.md),
      color: textSecondaryColor,
      fontSize: FontSizes.base,
    ),

    css('.article-meta, .series-meta').styles(
      display: Display.flex,
      color: textSecondaryColor,
      fontSize: FontSizes.sm,
    ),

    css('.series-badge').styles(
      display: Display.inlineBlock,
      padding: Padding.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
      margin: Margin.only(bottom: AppSpacing.md),
      color: Color('#FFFFFFFF'),
      fontSize: FontSizes.lg,
      fontWeight: FontWeights.bold,
      backgroundColor: primaryColor,
    ),

    css('.difficulty-badge').styles(
      padding: Padding.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
      color: primaryColor,
      fontSize: FontSizes.sm,
      fontWeight: FontWeights.semibold,
      backgroundColor: Color('#1A57B4BA'),
    ),

    // CTA Section
    css('.cta-section').styles(
      padding: Padding.symmetric(vertical: AppSpacing.xl4, horizontal: AppSpacing.xl),
      color: Color('#FFFFFFFF'),
      textAlign: TextAlign.center,
    ),

    css('.cta-content').styles(
      maxWidth: ContainerWidths.md,
      margin: Margin.symmetric(horizontal: Unit.auto),
    ),

    css('.cta-title').styles(
      margin: Margin.only(bottom: AppSpacing.lg),
      color: Color('#FFFFFFFF'),
      fontSize: FontSizes.xl4,
      fontWeight: FontWeights.bold,
    ),

    css('.cta-description').styles(
      margin: Margin.only(bottom: AppSpacing.xl2),
      opacity: 0.9,
      fontSize: FontSizes.xl,
    ),
  ];
}
