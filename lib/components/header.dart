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
            img(src: '/img/logo.png', alt: 'Logo', classes: 'logo-image'),
            text('Learn with Paul'),
          ]),
        ),

        // Navigation
        nav([
          for (var route in [
            (label: '首頁', path: '/'),
            (label: '教學系列', path: '/tutorials'),
            (label: '關於', path: '/about'),
          ])
            div(classes: activePath == route.path ? 'active' : null, [
              Link(to: route.path, child: text(route.label)),
            ]),
        ]),

        // Social Links
        div(classes: 'social-links', [
          a(
            href: 'https://www.threads.com/@paul.ch.wu',
            target: Target.blank,
            [
              img(src: '/img/threads.svg', alt: 'Threads', classes: 'social-icon'),
            ],
          ),
          a(
            href: 'https://github.com/easylive1989',
            target: Target.blank,
            [
              img(src: '/img/github.svg', alt: 'GitHub', classes: 'social-icon'),
            ],
          ),
          a(
            href: 'https://medium.com/@easylive1989',
            target: Target.blank,
            [
              img(src: '/img/medium.svg', alt: 'Medium', classes: 'social-icon'),
            ],
          ),
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
      alignItems: AlignItems.center,
      gap: Gap.all(AppSpacing.xl),
    ),

    css('.header-logo').styles(
      display: Display.flex,
      alignItems: AlignItems.center,
      gap: Gap.all(AppSpacing.sm),
      color: primaryColor,
      fontSize: FontSizes.xl2,
      fontWeight: FontWeights.bold,
      textDecoration: TextDecoration.none,
    ),

    css('.header-logo .logo-image').styles(
      width: 32.px,
      height: 32.px,
    ),

    css('nav').styles(
      display: Display.flex,
      flex: Flex(grow: 1, shrink: 1, basis: Unit.zero),
      justifyContent: JustifyContent.end,
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

    css('.social-links').styles(
      display: Display.flex,
      alignItems: AlignItems.center,
      gap: Gap.all(AppSpacing.md),
    ),

    css('.social-links a').styles(
      display: Display.flex,
      alignItems: AlignItems.center,
      opacity: 0.7,
    ),

    css('.social-links a:hover').styles(
      opacity: 1.0,
    ),

    css('.social-icon').styles(
      width: 24.px,
      height: 24.px,
    ),
  ];
}
