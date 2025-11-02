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
            (label: '關於', path: '/about'),
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
          backgroundColor: backgroundColor,
          border: Border.only(bottom: BorderSide(color: borderColor, width: Borders.thin)),
          position: Position.sticky(),
          zIndex: ZIndex(1000),
        ),

        css('.header-content').styles(
          display: Display.flex,
          alignItems: AlignItems.center,
          justifyContent: JustifyContent.spaceBetween,
          maxWidth: ContainerWidths.xl2,
          margin: Margin.symmetric(horizontal: Unit.auto),
          padding: Padding.symmetric(horizontal: AppSpacing.xl, vertical: AppSpacing.md),
        ),

        css('.header-logo').styles(
          fontSize: FontSizes.xl2,
          fontWeight: FontWeights.bold,
          color: primaryColor,
          textDecoration: TextDecoration.none,
        ),

        css('nav').styles(
          display: Display.flex,
        ),

        css('nav a').styles(
          display: Display.block,
          padding: Padding.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.sm),
          color: textPrimaryColor,
          textDecoration: TextDecoration.none,
          fontWeight: FontWeights.medium,
        ),

        css('nav a:hover').styles(
          backgroundColor: surfaceColor,
          color: primaryColor,
        ),

        css('nav div.active a').styles(
          backgroundColor: primaryColor,
          color: Color('#FFFFFFFF'),
        ),
      ];
}
