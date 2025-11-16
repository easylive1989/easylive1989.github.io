// dart format off
// ignore_for_file: type=lint

// GENERATED FILE, DO NOT MODIFY
// Generated with jaspr_builder

import 'package:jaspr/jaspr.dart';
import 'package:my_website/components/article_card.dart' as prefix0;
import 'package:my_website/components/article_navigation.dart' as prefix1;
import 'package:my_website/components/header.dart' as prefix2;
import 'package:my_website/components/markdown_renderer.dart' as prefix3;
import 'package:my_website/components/series_sidebar.dart' as prefix4;
import 'package:my_website/components/tutorial_card.dart' as prefix5;
import 'package:my_website/pages/article_detail.dart' as prefix6;
import 'package:my_website/pages/articles_list.dart' as prefix7;
import 'package:my_website/pages/tutorial_detail.dart' as prefix8;
import 'package:my_website/pages/tutorials_list.dart' as prefix9;
import 'package:my_website/app.dart' as prefix10;

/// Default [JasprOptions] for use with your jaspr project.
///
/// Use this to initialize jaspr **before** calling [runApp].
///
/// Example:
/// ```dart
/// import 'jaspr_options.dart';
///
/// void main() {
///   Jaspr.initializeApp(
///     options: defaultJasprOptions,
///   );
///
///   runApp(...);
/// }
/// ```
JasprOptions get defaultJasprOptions => JasprOptions(
  clients: {
    prefix3.MarkdownRenderer: ClientTarget<prefix3.MarkdownRenderer>(
      'components/markdown_renderer',
      params: _prefix3MarkdownRenderer,
    ),
  },
  styles: () => [
    ...prefix0.ArticleCard.styles,
    ...prefix1.ArticleNavigation.styles,

    ...prefix2.Header.styles,
    ...prefix3.MarkdownRenderer.styles,
    ...prefix4.SeriesSidebar.styles,
    ...prefix5.TutorialCard.styles,
    ...prefix6.ArticleDetail.styles,
    ...prefix7.ArticlesList.styles,
    ...prefix8.TutorialDetail.styles,
    ...prefix9.TutorialsList.styles,
    ...prefix10.App.styles,
  ],
);

Map<String, dynamic> _prefix3MarkdownRenderer(prefix3.MarkdownRenderer c) => {
  'markdown': c.markdown,
  'enableDartPad': c.enableDartPad,
  'enableCodeHighlight': c.enableCodeHighlight,
  'imageBasePath': c.imageBasePath,
};
