# Flutter Theme 切換效果研究

新增時間: June 23, 2023 11:19 PM
最後編輯時間: October 2, 2025 11:49 PM
id: cfabe2e638ef4210bdc9660155dcdfa5
完成: Yes
類型: Medium
🧩 領域: Flutter (https://www.notion.so/Flutter-aec5ea3a198f49e18989ab7f4c851169?pvs=21)

![_fd765116-9712-4098-b0e3-e0cde699eff3.jpeg](Flutter%20Theme%20%E5%88%87%E6%8F%9B%E6%95%88%E6%9E%9C%E7%A0%94%E7%A9%B6/_fd765116-9712-4098-b0e3-e0cde699eff3.jpeg)

許多 App 都會支持 Light 模式與 Dark 模式，增加使用者體驗，為了做到這個功能，我們可以使用內建 Theme 加上 StatefulWidget 或其他狀態管理套件，就可以輕鬆完成 Light 模式與 Dark 模式。讓我們看看一個簡單的例子。

## 簡單的切換主題

```dart
main() {
  runApp(const MainApp());
}

class MainApp extends StatefulWidget {
  const MainApp({super.key});

  @override
  State<MainApp> createState() => _MainAppState();
}

class _MainAppState extends State<MainApp> {
  bool isDark = false;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      theme: isDark ? ThemeData.dark() : ThemeData.light(),
      home: Scaffold(
        body: const Center(
          child: Text("Hello World"),
        ),
        floatingActionButton: FloatingActionButton(
          child: const Icon(Icons.refresh),
          onPressed: () => setState(() => isDark = !isDark),
        ),
      ),
    );
  }
}
```

我們在 StatefulWidget 中維護了 isDark 變數，當使用者按下左下角按鈕時，就會更新 isDark，並設定不同模式的 ThemeData 給 MaterialApp，藉此達到切換 Light / Dark 模式的效果，而在切換過程中，Flutter 也會幫我們用漸變的方式切換主題，而不是一瞬間就切換完成，增加視覺效果。

![Discuss - Theme switch.jpg](Flutter%20Theme%20%E5%88%87%E6%8F%9B%E6%95%88%E6%9E%9C%E7%A0%94%E7%A9%B6/Discuss_-_Theme_switch.jpg)

## 自定義的 ThemeExtension

有些時候，當我們的設計不是遵循 Material Design 的話，Flutter 提供的 Theme 就會不足以完成我們的需求，此時我們就會使用 ThemeExtension 的功能來擴充 Theme，讓整個 App 都可以使用一致的設計。下面是一段我們自定義的 ThemeExtension，其中除了自定義的顏色設計之外，我們還需要實作 copyWith 與 lerp 方法。

```dart
class MyThemeExtension extends ThemeExtension<MyThemeExtension> {
  final Color backgroundColor;

  MyThemeExtension(this.backgroundColor);

  @override
  ThemeExtension<MyThemeExtension> copyWith() {
    // TODO: implement copyWith
    throw UnimplementedError();
  }

  @override
  ThemeExtension<MyThemeExtension> lerp(covariant MyThemeExtension other, double t) {
    // TODO: implement lerp
    throw UnimplementedError();
  }
}
```

還記得剛剛提到的，切換 Light / Dark 模式時，Flutter 會用漸變的方式，讓畫面漸漸的從 Light 模式轉變為 Dark 模式 (其實動畫時間很短，一下次就轉換完成 XD)，為了讓自定義的 ThemeExtension 也能享受到這個效果，實作 lerp 方法就很重要了。lerp 方法會傳入要轉換的 Theme 與動畫時間，讓我們可以自行決定顏色在轉換過程中如何變化，在這邊我們簡單地使用 Color.lerp 來協助做線性轉換即可。

```dart
@override
ThemeExtension<MyThemeExtension> lerp(covariant MyThemeExtension other, double t) {
  return MyThemeExtension(
    Color.lerp(backgroundColor, other.backgroundColor, t)!,
  );
}
```

當我們實作了 lerp 方法之後，再次打開 App 切換 Light / Dark 模式，會發現我們自定義的顏色也能在切換過程中有平滑的視覺效果。

![Discuss - Theme Switch 2.jpg](Flutter%20Theme%20%E5%88%87%E6%8F%9B%E6%95%88%E6%9E%9C%E7%A0%94%E7%A9%B6/Discuss_-_Theme_Switch_2.jpg)

完整效果請參考[這邊](https://dartpad.dev/?id=1264772a9ffa905f346a1d2c5a8c02a6)。

## 更酷炫的切換動畫

在研究 Light / Dark 模式切換的過程中，發現了很特別切換效果，詳細可以參考[這邊](https://stackoverflow.com/questions/60897816/how-to-add-animation-for-theme-switching-in-flutter)。當使用者切換模式時，畫面會由左上角開始轉換，並往右下角輻射，直到所有畫面都轉換完成，讓我們直接看看下面圖片。

![螢幕錄影_2023-06-24_上午12_04_38_AdobeExpress.gif](Flutter%20Theme%20%E5%88%87%E6%8F%9B%E6%95%88%E6%9E%9C%E7%A0%94%E7%A9%B6/%25E8%259E%25A2%25E5%25B9%2595%25E9%258C%2584%25E5%25BD%25B1_2023-06-24_%25E4%25B8%258A%25E5%258D%258812_04_38_AdobeExpress.gif)

與 Flutter 預設的切換方式不同，這種切換方式更令人眼睛一亮，讓我們來看看這是如何做到的。其實要做到這個效果也並不複雜，主要原理是使用 Stack + ClipPath 來完成，簡單來說就是，先在 Stack 中疊上 Light 模式 Widget，然後再疊上被 ClipPath 裁切過的 Dark 模式 Widget，最後透過動畫來慢慢放大被裁切的 Dark 模式 Widget，最後填滿的畫面。如此一來，就能完成這個酷炫的 Light / Dark 模式切換效果。

```dart
@override
Widget build(BuildContext context) {
  return AnimatedBuilder(
    animation: _animationController,
    builder: (BuildContext context, Widget? child) {
      return Stack(
        children: [
          Theme(
            data: _getTheme(widget.isDark),
            child: widget.builder(context),
          ),
          ClipPath(
            clipper: CircularClipper(
              1.5 * MediaQuery.of(context).size.height * _animationController.value,
              Offset.zero,
            ),
            child: Theme(
              data: _getTheme(!widget.isDark),
              child: widget.builder(context),
            ),
          ),
        ],
      );
    },
  );
}
```

完整效果請參考[這邊](https://dartpad.dev/?id=883cd4304e8f0a032d5d3a3f87dced70)。

## 小結

為 App 增加一些轉場特效，像是我們今天分享的 Light / Dark 模式切換，或者是 Routing 時的 Transition 效果，都能有效增加使用者體驗，讓 App 看起來更加精緻。