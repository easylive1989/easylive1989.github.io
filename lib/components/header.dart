import 'package:jaspr/jaspr.dart';
import 'package:jaspr_router/jaspr_router.dart';

import '../constants/theme.dart';
import '../constants/styles.dart';

class Header extends StatelessComponent {
  const Header({super.key});

  @override
  Component build(BuildContext context) {
    var activePath = context.url;

    return header([
      div(classes: 'header-content', [
        // Logo
        Link(
          to: '/',
          child: div(classes: 'header-logo', [
            text('Learn with Paul'),
          ]),
        ),

        // Navigation
        nav([
          for (var route in [
            (label: '首頁', path: '/'),
            (label: '技術分享', path: '/articles'),
            (label: '教學系列', path: '/tutorials'),
          ])
            div(classes: activePath == route.path ? 'active' : null, [
              Link(to: route.path, child: text(route.label)),
            ]),
        ]),
      ]),
    ]);
  }

  @css
  static List<StyleRule> get styles => [
    css('header').styles(
      position: Position.sticky(),
      zIndex: ZIndex(1000),
      border: Border.only(
        bottom: BorderSide(color: borderColor, width: Borders.thin),
      ),
      backgroundColor: backgroundColor,
    ),

    css('.header-content').styles(
      display: Display.flex,
      maxWidth: ContainerWidths.xl2,
      padding: Padding.symmetric(horizontal: AppSpacing.xl, vertical: AppSpacing.md),
      margin: Margin.symmetric(horizontal: Unit.auto),
      justifyContent: JustifyContent.spaceBetween,
      alignItems: AlignItems.center,
    ),

    css('.header-logo').styles(
      color: primaryColor,
      fontSize: FontSizes.xl2,
      fontWeight: FontWeights.bold,
      textDecoration: TextDecoration.none,
    ),

    css('nav').styles(
      display: Display.flex,
    ),

    css('nav a').styles(
      display: Display.block,
      padding: Padding.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.sm),
      color: textPrimaryColor,
      fontWeight: FontWeights.medium,
      textDecoration: TextDecoration.none,
    ),

    css('nav a:hover').styles(
      color: primaryColor,
      backgroundColor: surfaceColor,
    ),

    css('nav div.active a').styles(
      color: Color('#FFFFFFFF'),
      backgroundColor: primaryColor,
    ),
  ];
}
