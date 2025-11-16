import 'package:jaspr/jaspr.dart';
import '../constants/theme.dart';
import '../constants/styles.dart';

/// About 頁面
class About extends StatelessComponent {
  const About({super.key});

  @override
  Component build(BuildContext context) {
    return div(classes: 'about-page', [
      div(classes: 'container', [
        h1(classes: 'page-title', [text('👋 關於我')]),

        div(classes: 'about-content', [
          p(classes: 'about-paragraph', [
            text('我是 Paul，從事軟體開發超過十年，目前主要開發 Flutter App，熱愛學習各種軟體工程的知識，不斷優化產品內外品質與工作流程。'),
          ]),

          p(classes: 'about-paragraph', [
            text('平常喜歡閱讀各類書籍，透過持續學習，把新的想法帶進專案和團隊合作中。也常常從中得到一些靈感，幫助我在設計產品時更貼近使用者的角度。'),
          ]),

          p(classes: 'about-paragraph', [
            text('我會不定時分享開發技巧與心得，內容主要關於 Flutter / 極限編程 / 軟體工程 ......等議題，透過輸出幫助自己持續精進軟體開發藝術。'),
          ]),
        ]),
      ]),
    ]);
  }

  @css
  static List<StyleRule> get styles => [
    css('.about-page').styles(
      padding: Padding.symmetric(vertical: AppSpacing.xl3, horizontal: AppSpacing.xl),
    ),

    css('.container').styles(
      maxWidth: ContainerWidths.md,
      margin: Margin.symmetric(horizontal: Unit.auto),
    ),

    css('.page-title').styles(
      fontSize: FontSizes.xl5,
      fontWeight: FontWeights.bold,
      color: secondaryColor,
      margin: Margin.only(bottom: AppSpacing.xl2),
    ),

    css('.about-content').styles(
      backgroundColor: backgroundColor,
      padding: Padding.all(AppSpacing.xl2),
    ),

    css('.about-paragraph').styles(
      fontSize: FontSizes.lg,
      color: textPrimaryColor,
      margin: Margin.only(bottom: AppSpacing.lg),
    ),

    css('.about-paragraph:last-child').styles(
      margin: Margin.only(bottom: Unit.zero),
    ),
  ];
}
