import 'package:jaspr/jaspr.dart';
import 'package:jaspr_router/jaspr_router.dart';

import 'components/header.dart';
import 'pages/home.dart';
import 'pages/about.dart';

// The main component of your application.
//
// By using multi-page routing, this component will only be built on the server during pre-rendering and
// **not** executed on the client. Instead only the nested page components will be mounted on the client.
class App extends StatelessComponent {
  const App({super.key});

  @override
  Component build(BuildContext context) {
    return div(classes: 'main', [
      const Header(),
      Router(
        routes: [
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
        ],
      ),
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
