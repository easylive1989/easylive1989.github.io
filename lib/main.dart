// The entrypoint for the **server** environment.
//
// The [main] method will only be executed on the server during pre-rendering.
// To run code on the client, use the @client annotation.

// Server-specific jaspr import.
import 'package:jaspr/server.dart';

// Imports the [App] component.
import 'app.dart';

// This file is generated automatically by Jaspr, do not remove or edit.
import 'jaspr_options.dart';

// Import theme and styles
import 'constants/theme.dart';
import 'constants/styles.dart';

void main() {
  // Initializes the server environment with the generated default options.
  Jaspr.initializeApp(
    options: defaultJasprOptions,
  );

  // Starts the app.
  //
  // [Document] renders the root document structure (<html>, <head> and <body>)
  // with the provided parameters and components.
  runApp(
    Document(
      title: 'Learn with Paul - Flutter 技術分享與教學',
      meta: {
        'description': '深入淺出的 Flutter 技術文章與完整系列教學，幫助你掌握 Flutter 開發技能。包含實戰經驗分享、設計模式、測試策略等內容。',
        'keywords': 'Flutter, Dart, 技術分享, 教學, 開發, 程式設計, Mobile App, iOS, Android',
        'author': 'Paul',
        'og:title': 'Learn with Paul - Flutter 技術分享與教學',
        'og:description': '深入淺出的 Flutter 技術文章與完整系列教學，幫助你掌握 Flutter 開發技能',
        'og:type': 'website',
        'twitter:card': 'summary_large_image',
        'twitter:title': 'Learn with Paul - Flutter 技術分享與教學',
        'twitter:description': '深入淺出的 Flutter 技術文章與完整系列教學',
      },
      styles: [
        // Import Inter font for modern, clean typography
        css.import(
          'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap',
        ),

        // Reset & Base styles
        css('*, *::before, *::after').styles(
          boxSizing: BoxSizing.borderBox,
        ),

        css('html').styles(
          fontSize: 16.px,
        ),

        css('html, body').styles(
          width: 100.percent,
          minHeight: 100.vh,
          padding: Padding.zero,
          margin: Margin.zero,
          color: textPrimaryColor,
          fontFamily: fontPrimary,
          backgroundColor: backgroundColor,
        ),

        // Typography - 簡潔清晰的標題層級
        css('h1, h2, h3, h4, h5, h6').styles(
          margin: Margin.zero,
          color: secondaryColor,
          fontWeight: FontWeights.bold,
        ),

        css('h1').styles(
          margin: Margin.only(bottom: AppSpacing.xl),
          fontSize: FontSizes.xl5,
        ),

        css('h2').styles(
          margin: Margin.only(bottom: AppSpacing.lg, top: AppSpacing.xl2),
          fontSize: FontSizes.xl4,
        ),

        css('h3').styles(
          margin: Margin.only(bottom: AppSpacing.md, top: AppSpacing.xl),
          fontSize: FontSizes.xl3,
        ),

        css('h4').styles(
          margin: Margin.only(bottom: AppSpacing.md, top: AppSpacing.lg),
          fontSize: FontSizes.xl2,
        ),

        css('h5').styles(
          margin: Margin.only(bottom: AppSpacing.sm, top: AppSpacing.lg),
          fontSize: FontSizes.xl,
        ),

        css('h6').styles(
          margin: Margin.only(bottom: AppSpacing.sm, top: AppSpacing.md),
          fontSize: FontSizes.lg,
        ),

        // Paragraph
        css('p').styles(
          margin: Margin.only(bottom: AppSpacing.md),
          color: textPrimaryColor,
        ),

        // Links - 使用主題色
        css('a').styles(
          cursor: Cursor.pointer,
          color: primaryColor,
          textDecoration: TextDecoration.none,
        ),

        css('a:hover').styles(
          color: secondaryColor,
        ),

        // Code & Pre
        css('code').styles(
          padding: Padding.symmetric(horizontal: AppSpacing.xs, vertical: 2.px),
          color: tertiaryColor,
          fontFamily: fontMono,
          fontSize: FontSizes.sm,
          backgroundColor: surfaceColor,
        ),

        css('pre').styles(
          padding: Padding.all(AppSpacing.md),
          margin: Margin.only(bottom: AppSpacing.md),
          border: Border.only(
            top: BorderSide(color: borderColor, width: Borders.thin),
            right: BorderSide(color: borderColor, width: Borders.thin),
            bottom: BorderSide(color: borderColor, width: Borders.thin),
            left: BorderSide(color: borderColor, width: Borders.thin),
          ),
          overflow: Overflow.auto,
          fontFamily: fontMono,
          fontSize: FontSizes.sm,
          backgroundColor: surfaceColor,
        ),

        css('pre code').styles(
          padding: Padding.zero,
          backgroundColor: Color('#00000000'),
        ),

        // Lists
        css('ul, ol').styles(
          padding: Padding.only(left: AppSpacing.xl),
          margin: Margin.only(bottom: AppSpacing.md),
        ),

        css('li').styles(
          margin: Margin.only(bottom: AppSpacing.sm),
        ),

        // Images
        css('img').styles(
          display: Display.block,
          height: Unit.auto,
          maxWidth: 100.percent,
        ),

        // Horizontal rule - 簡潔線條
        css('hr').styles(
          margin: Margin.only(top: AppSpacing.xl, bottom: AppSpacing.xl),
          border: Border.only(
            top: BorderSide(color: borderColor, width: Borders.thin),
          ),
        ),

        // Blockquote
        css('blockquote').styles(
          padding: Padding.only(left: AppSpacing.lg),
          margin: Margin.only(top: AppSpacing.md, bottom: AppSpacing.md),
          border: Border.only(
            left: BorderSide(color: primaryColor, width: Borders.thick),
          ),
          color: textSecondaryColor,
          fontStyle: FontStyle.italic,
        ),
      ],
      body: App(),
    ),
  );
}
