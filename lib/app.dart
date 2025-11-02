import 'package:jaspr/jaspr.dart';
import 'package:jaspr_router/jaspr_router.dart';

import 'components/header.dart';
import 'pages/home.dart';
import 'pages/about.dart';
import 'pages/articles_list.dart';
import 'pages/article_detail.dart';
import 'pages/tutorial_detail.dart';
import 'services/content_loader.dart';

// The main component of your application.
//
// By using multi-page routing, this component will only be built on the server during pre-rendering and
// **not** executed on the client. Instead only the nested page components will be mounted on the client.
class App extends StatelessComponent {
  final ContentData content;

  const App({required this.content, super.key});

  @override
  Component build(BuildContext context) {
    // Generate routes dynamically based on content
    final routes = <Route>[
      // 首頁
      Route(
        path: '/',
        title: 'Learn with Paul - Flutter 技術分享與教學',
        builder: (context, state) => const Home(),
      ),

      // 關於頁面
      Route(
        path: '/about',
        title: '關於 - Learn with Paul',
        builder: (context, state) => const About(),
      ),

      // 文章列表頁
      Route(
        path: '/articles',
        title: '技術分享 - Learn with Paul',
        builder: (context, state) => ArticlesList(articles: content.articles),
      ),

      // 為每篇文章生成路由
      for (final article in content.articles)
        Route(
          path: '/articles/${article.id}',
          title: '${article.title} - Learn with Paul',
          builder: (context, state) => ArticleDetail(article: article),
        ),

      // 為每個教學生成路由
      for (final series in content.series)
        for (final tutorial in series.tutorials)
          Route(
            path: '/tutorials/${series.id}/${tutorial.day}',
            title: '${tutorial.fullTitle} - ${series.name}',
            builder: (context, state) => TutorialDetail(
              tutorial: tutorial,
              series: series,
            ),
          ),
    ];

    return div(classes: 'main', [
      const Header(),
      Router(routes: routes),
    ]);
  }

  // Defines the css styles for elements of this component.
  //
  // By using the @css annotation, these will be rendered automatically to css inside the <head> of your page.
  // Must be a variable or getter of type [List<StyleRule>].
  @css
  static List<StyleRule> get styles => [
    css('.main', [
      // The '&' refers to the parent selector of a nested style rules.
      css('&').styles(
        display: Display.flex,
        height: 100.vh,
        flexDirection: FlexDirection.column,
      ),
      css('section').styles(
        display: Display.flex,
        flexDirection: FlexDirection.column,
      ),
    ]),
  ];
}
