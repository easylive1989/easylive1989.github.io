// dart format off
// ignore_for_file: type=lint

// GENERATED FILE, DO NOT MODIFY
// Generated with jaspr_builder

import 'package:jaspr/jaspr.dart';
import 'package:my_website/components/counter.dart' as prefix0;
import 'package:my_website/components/header.dart' as prefix1;
import 'package:my_website/pages/about.dart' as prefix2;
import 'package:my_website/app.dart' as prefix3;

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
  clients: {prefix3.App: ClientTarget<prefix3.App>('app')},
  styles: () => [
    ...prefix0.CounterState.styles,
    ...prefix1.Header.styles,
    ...prefix2.About.styles,
    ...prefix3.AppState.styles,
  ],
);
