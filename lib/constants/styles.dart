import 'package:jaspr/jaspr.dart';

// ===== Typography 系統 =====

// 字體家族
const fontPrimary = FontFamily.list([
  FontFamily('Inter'),
  FontFamily('-apple-system'),
  FontFamily('BlinkMacSystemFont'),
  FontFamily('Segoe UI'),
  FontFamilies.sansSerif,
]);

const fontMono = FontFamily.list([
  FontFamily('Fira Code'),
  FontFamily('Monaco'),
  FontFamily('Consolas'),
  FontFamilies.monospace,
]);

// 字體大小
class FontSizes {
  static Unit get xs => 0.75.rem;
  static Unit get sm => 0.875.rem;
  static Unit get base => 1.rem;
  static Unit get lg => 1.125.rem;
  static Unit get xl => 1.25.rem;
  static Unit get xl2 => 1.5.rem;
  static Unit get xl3 => 1.875.rem;
  static Unit get xl4 => 2.25.rem;
  static Unit get xl5 => 3.rem;
  static Unit get xl6 => 3.75.rem;
}

// 字重
class FontWeights {
  static const FontWeight normal = FontWeight.w400;
  static const FontWeight medium = FontWeight.w500;
  static const FontWeight semibold = FontWeight.w600;
  static const FontWeight bold = FontWeight.w700;
}

// 行高
class LineHeights {
  static const double tight = 1.25;
  static const double normal = 1.5;
  static const double relaxed = 1.75;
  static const double loose = 2.0;
}

// ===== Spacing 系統 =====

class AppSpacing {
  static Unit get zero => Unit.zero;
  static Unit get xs => 0.25.rem;
  static Unit get sm => 0.5.rem;
  static Unit get md => 1.rem;
  static Unit get lg => 1.5.rem;
  static Unit get xl => 2.rem;
  static Unit get xl2 => 3.rem;
  static Unit get xl3 => 4.rem;
  static Unit get xl4 => 6.rem;
  static Unit get xl5 => 8.rem;
}

// ===== Border 系統 =====

class Borders {
  static Unit get thin => 1.px;
  static Unit get medium => 2.px;
  static Unit get thick => 4.px;
}

class BorderRadii {
  static Unit get none => Unit.zero;
  static Unit get sm => 4.px;
  static Unit get md => 8.px;
  static Unit get lg => 12.px;
  static Unit get xl => 16.px;
  static Unit get full => 9999.px;
}

// ===== Shadow 系統 =====

class Shadows {
  static BoxShadow get sm => BoxShadow(
    offsetX: Unit.zero,
    offsetY: 1.px,
    blur: 2.px,
    color: const Color('#1A000000'),
  );

  static BoxShadow get md => BoxShadow(
    offsetX: Unit.zero,
    offsetY: 4.px,
    blur: 6.px,
    spread: (-1).px,
    color: const Color('#1A000000'),
  );

  static BoxShadow get lg => BoxShadow(
    offsetX: Unit.zero,
    offsetY: 10.px,
    blur: 15.px,
    spread: (-3).px,
    color: const Color('#1A000000'),
  );

  static BoxShadow get xl => BoxShadow(
    offsetX: Unit.zero,
    offsetY: 20.px,
    blur: 25.px,
    spread: (-5).px,
    color: const Color('#1A000000'),
  );
}

// ===== Transition 系統 =====

class Transitions {
  static const Duration fast = Duration(milliseconds: 150);
  static const Duration normal = Duration(milliseconds: 300);
  static const Duration slow = Duration(milliseconds: 500);
}

// ===== Breakpoints (響應式設計) =====

class Breakpoints {
  static const String sm = '640px';
  static const String md = '768px';
  static const String lg = '1024px';
  static const String xl = '1280px';
  static const String xl2 = '1536px';
}

// ===== Container 寬度 =====

class ContainerWidths {
  static Unit get sm => 640.px;
  static Unit get md => 768.px;
  static Unit get lg => 1024.px;
  static Unit get xl => 1280.px;
  static Unit get xl2 => 1536.px;
}
