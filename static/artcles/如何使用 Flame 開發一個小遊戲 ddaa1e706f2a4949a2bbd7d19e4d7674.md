# 如何使用 Flame 開發一個小遊戲

新增時間: January 1, 2023 11:37 AM
最後編輯時間: October 24, 2025 4:48 PM
id: ddaa1e706f2a4949a2bbd7d19e4d7674
類型: 輸出文章
🧩 領域: Flutter (https://www.notion.so/Flutter-aec5ea3a198f49e18989ab7f4c851169?pvs=21)

![carl-raw-m3hn2Kn5Bns-unsplash.jpg](%E5%A6%82%E4%BD%95%E4%BD%BF%E7%94%A8%20Flame%20%E9%96%8B%E7%99%BC%E4%B8%80%E5%80%8B%E5%B0%8F%E9%81%8A%E6%88%B2/carl-raw-m3hn2Kn5Bns-unsplash.jpg)

來到了 2023 年，今年就來學點不同的東西。本身興趣之一就是喜歡打電動，所以打從學寫程式以來，一直都有想自己寫遊戲的想法，但是一直都懶得去實現。自從學了 Flutter 之後，隱隱覺得 [Flutter](https://docs.flame-engine.org/1.4.0/index.html) 的渲染模式其實跟遊戲十分相似，也從許多文章或影片中得知 Flame 這個基於 Flutter 的遊戲引擎，今天就來學學如何製作一個小遊戲吧 🕹️。

## 引入 Flame

當然第一步最重要的就是，把 flame 套件引入到我們的專案中

```bash
flutter pub add flame
```

當我們執行下面命令後，我們就能在 pubspec.yml 中發現多了 flame

```yaml
dependencies:
  flutter:
    sdk: flutter
  flame: ^1.5.0
```

## 使用 GameWidget

開始使用 Flame 之後，第一個面對的 Widget 是 `GameWidget`，如同我們在 Flutter 中使用的各式各樣的 Widget，這個 `GameWidget` 也能直接被放在我們的 Flutter 程式中。GameWidget 有一個必要的參數：`Game`，可以想像成是整個遊戲最外層的 Component，有點類似於 Flutter 的 `MaterialApp`。

```dart
void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: GameWidget(
        game: MyGame(),
      ),
    );
  }
}

class MyGame extends FlameGame {}
```

當我們執行上面這段程式碼後，會發現程式雖然可以執行，畫面卻是一片空白。這也是正常的，來為畫面加上一些東西吧。

```dart
class MyGame extends FlameGame {
  @override
  Future<void> onLoad() async {
    camera.zoom = 4;
    await add(Knight(
      position: size / 2,
      anchor: Anchor.center,
      size: Vector2(120, 80),e
    ));
  }
}

class Knight extends PositionComponent {
  Knight({super.position, super.size, super.anchor});

  @override
  Future<void> onLoad() async {
    var animation = await SpriteAnimation.load(
      "knight_idle.png",
      SpriteAnimationData.sequenced(
        amount: 10,
        stepTime: 0.1,
        textureSize: Vector2(120, 80),
      ),
    );
    await add(SpriteAnimationComponent(
      animation: animation,
      size: size,
    ));
  }
}
```

在上面我們中在 onLoad 中加入一個騎士的待機圖，當執行之後就會在畫面上看到騎士待機站立的遊戲畫面。

![knight_idle.gif](%E5%A6%82%E4%BD%95%E4%BD%BF%E7%94%A8%20Flame%20%E9%96%8B%E7%99%BC%E4%B8%80%E5%80%8B%E5%B0%8F%E9%81%8A%E6%88%B2/knight_idle.gif)

## 為騎士加上不同動作

如果只有看著騎士在畫面上站著不動，這也不能算是個遊戲吧。為了讓他有點遊戲的感覺，我們可以加上一個行為：當點擊畫面，騎士就進行攻擊。

為了讓騎士有更多動作，首先我們需要先修改一下動畫，使用 `SpriteAnimationGroupComponent` 針對不同行為，使用不同的動畫。透過設定 `SpriteAnimationGroupComponent` 的 current 變數，來決定當下要播放靜止站立的動畫，或攻擊的動畫。

```dart
@override
Future<void> onLoad() async {
  var idleAnimation = await SpriteAnimation.load(
    "knight_idle.png",
    SpriteAnimationData.sequenced(
      amount: 10,
      stepTime: 0.1,
      textureSize: Vector2(120, 80),
    ),
  );

  var attackAnimation = await SpriteAnimation.load(
    "knight_attacking.png",
    SpriteAnimationData.sequenced(
      amount: 10,
      stepTime: 0.1,
      textureSize: Vector2(120, 80),
      loop: false,
    ),
  );

  await add(_animations = SpriteAnimationGroupComponent<KnightBehavior>(
    current: KnightBehavior.idle,
    size: size,
    animations: {
      KnightBehavior.idle: idleAnimation,
      KnightBehavior.attack: attackAnimation
    },
  ));
}
```

![螢幕錄影_2023-01-02_上午10_27_10_AdobeExpress.gif](%E5%A6%82%E4%BD%95%E4%BD%BF%E7%94%A8%20Flame%20%E9%96%8B%E7%99%BC%E4%B8%80%E5%80%8B%E5%B0%8F%E9%81%8A%E6%88%B2/%25E8%259E%25A2%25E5%25B9%2595%25E9%258C%2584%25E5%25BD%25B1_2023-01-02_%25E4%25B8%258A%25E5%258D%258810_27_10_AdobeExpress.gif)

## 新增點擊操作

當我們的騎士可以支援多種不同的動作之後，下一步就是指定觸發條件了，讓程式知道什麼時候要播放靜止站立的動畫，什麼時候要播放攻擊動畫。當使用者點擊畫面時，騎士就播放攻擊動畫。為此，我們需要修改幾個地方，以收取點擊事件。

- `MyGame` 加上 `HasTappableComponents`

```dart
class MyGame extends FlameGame with HasTappableComponents {
}
```

- `Knight` 加上 `TapCallbacks` 並覆寫 `onTapUp` 與 `containsLocalPoint`

```dart
class Knight extends PositionComponent with TapCallbacks {

  @override
  Future<void> onLoad() async {}

  @override
  bool containsLocalPoint(Vector2 point) => true;

  @override
  void onTapUp(TapUpEvent event) {
    _animations.current = KnightBehavior.attack;
  }
}
```

我們可以把點擊之後的行為放在 onTapUp 的方法中，指定 `SpriteAnimationGroupComponent` 的 current 變數為 KnightBehavior.attack，騎士就會在點擊之後，進入攻擊狀態。

## 更進一步

在我們新增點擊操作之後，我們可以紀錄騎士進行了幾次攻擊，並顯示在畫面上，變成一個簡單的點擊計數小遊戲，就像 Flutter 專案預設的 App 一樣。

首先，我們在 `MyGame` 中加上 count 變數紀錄次數

```dart
class MyGame extends FlameGame with HasTappableComponents {
  int count = 0;
}
```

然後在 `Knight` 加上 `HasGameRef<MyGame>` ，讓我們可以修改 `MyGame` 中的 counter

```dart
class Knight extends PositionComponent with TapCallbacks, HasGameRef<MyGame> {

  @override
  void onTapUp(TapUpEvent event) {
		if (_animations.current == KnightBehavior.idle) {
      _animations.current = KnightBehavior.attack;
      gameRef.count++;
    }
  }
  
}
```

最後在 `MyGame` 的 onLoad 中加上一個 `Counter` 用來顯示次數。`Counter` 類似於 `Knight` 也是一個 Component，在 `Counter` 的 onLoad 中加上一個 `TextComponent` 顯示文字，並在複寫 update 方法，Flame 會在遊戲進行時，持續呼叫每個 Component 的 update 方法，讓我們可以更新 Component 的畫面，我們可以透過 update 方法持續更新最新計數了。

```dart
class MyGame extends FlameGame with HasTappableComponents {
  int count = 0;

  @override
  Future<void> onLoad() async {
    camera.zoom = 4;
    await add(Knight(
      position: size / 2,
      anchor: Anchor.center,
      size: Vector2(120, 80),
    ));
    await add(Counter(
      position: size / 2..sub(Vector2(0, 20)),
      anchor: Anchor.center,
    ));
  }
}

class Counter extends PositionComponent with HasGameRef<MyGame> {
  Counter({super.position, super.size, super.anchor});

  late TextComponent _text;

  @override
  Future<void> onLoad() async {
    await add(_text = TextComponent(
      anchor: anchor,
      textRenderer: TextPaint(
        style: const TextStyle(color: Colors.white, fontSize: 10),
      ),
    ));
  }

  @override
  void update(double dt) {
    _text.text = "Knight has attacked ${gameRef.count} times";
  }
}
```

![螢幕錄影_2023-01-02_上午10_57_43_AdobeExpress.gif](%E5%A6%82%E4%BD%95%E4%BD%BF%E7%94%A8%20Flame%20%E9%96%8B%E7%99%BC%E4%B8%80%E5%80%8B%E5%B0%8F%E9%81%8A%E6%88%B2/%25E8%259E%25A2%25E5%25B9%2595%25E9%258C%2584%25E5%25BD%25B1_2023-01-02_%25E4%25B8%258A%25E5%258D%258810_57_43_AdobeExpress.gif)

## 結論

Flame 是基於 Flutter 框架之上的遊戲引擎，其中我們會碰到許多各式各樣的 Component，透過組合不同的 Component 完成各式各樣的遊戲效果，感覺有點像是在 Flutter 中組合各種不同的 Widget 來製作各式各樣的畫面。為了完成這個點擊小遊戲，我們使用了許多 Component，例如：`FlameGame` 、`SpriteAnimationGroupComponent`、`TextComponent` …等等，文章中的程式放在[這邊](https://github.com/easylive1989/knight_counter_demo)，有興趣的朋友也可以參考看看。