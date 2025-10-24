# Widget Test 的 tap 原來這樣運作？一探 Flutter 測試點擊的祕密

新增時間: August 23, 2025 9:08 AM
最後編輯時間: August 23, 2025 4:27 PM
id: 2588303f78f780b3a789ccdae073e04a
完成: Yes
類型: Medium
🧩 領域: Flutter (https://www.notion.so/Flutter-aec5ea3a198f49e18989ab7f4c851169?pvs=21)

![robottesting2.png](Widget%20Test%20%E7%9A%84%20tap%20%E5%8E%9F%E4%BE%86%E9%80%99%E6%A8%A3%E9%81%8B%E4%BD%9C%EF%BC%9F%E4%B8%80%E6%8E%A2%20Flutter%20%E6%B8%AC%E8%A9%A6%E9%BB%9E%E6%93%8A%E7%9A%84%E7%A5%95%E5%AF%86/robottesting2.png)

前陣子有同事問我：「WidgetTester 中的 `tap` 方法，到底是點擊卡片的哪個位置？它是真的模擬使用者的點擊行為，還是單純呼叫底層某個 callback 來觸發事件？」當下我其實不太確定，只好回家趕快研究一下。

雖然這些細節在大部分情境下不影響我們的日常測試，但世事難料，總有可能哪天派得上用場。所以趁有空時，就來探索一下這個小細節吧。

今天想和大家分享一個關於 Widget Test 的冷知識。本篇文章會包含不少原始碼，如果你對底層實作細節沒有興趣，可以考慮先跳過。

## WidgetTester 的 tap 方法

首先來看 `tap` 的實作，這應該能回答第一個問題：**`tap` 方法到底是點擊 Widget 的哪個位置？**

從程式碼中可以看到，它實際上呼叫了 `tapAt`，並傳入 `getCenter(...)`。光從名稱就能推測出來：`tap` 點擊的是 **Widget 的中心點**。

```dart
Future<void> tap(
  finders.FinderBase<Element> finder, {
  int? pointer,
  int buttons = kPrimaryButton,
  bool warnIfMissed = true,
  PointerDeviceKind kind = PointerDeviceKind.touch,
}) {
  return tapAt(
    getCenter(finder, warnIfMissed: warnIfMissed, callee: 'tap'),
    pointer: pointer,
    buttons: buttons,
    kind: kind,
  );
}
```

接下來的問題就是：它是怎麼找到「中心點」的？

## 找尋 Widget 中心點

往下追 `getCenter` 的實作，可以看到它呼叫了 `_getElementPoint`，這個方法的功能就是：**計算 Widget 某個位置的 Global 座標**。

```dart
Offset getCenter(
  finders.FinderBase<Element> finder, {
  bool warnIfMissed = false,
  String callee = 'getCenter',
}) {
  return _getElementPoint(
    finder,
    (Size size) => size.center(Offset.zero),
    warnIfMissed: warnIfMissed,
    callee: callee,
  );
}

Offset _getElementPoint(
  finders.FinderBase<Element> finder,
  Offset Function(Size size) sizeToPoint, {
  required bool warnIfMissed,
  required String callee,
}) {
  TestAsyncUtils.guardSync();
  final Iterable<Element> elements = finder.evaluate();
  
  // 省略檢查細節

  final Element element = elements.single;
  final RenderObject? renderObject = element.renderObject;
  
  // 省略檢查細節

  final RenderBox box = element.renderObject! as RenderBox;
  final Offset location = box.localToGlobal(sizeToPoint(box.size));
  
  // 省略 warnIfMissed 細節

  return location;
}
```

總結來說：`getCenter` 並不複雜，它只是透過 finder 找出 Element，再用 RenderBox 算出 Widget 中心點的 Global 座標。

除了 `getCenter`，還有像 `getTopLeft`、`getBottomLeft` 等方法，可以讓我們在測試中指定不同的點擊位置。

## **tapAt 的點擊流程**

找到座標之後，`tap` 會透過 `tapAt` 來模擬點擊。

來看一下主要流程：

1. `tapAt` 先呼叫 `startGesture`，建立一個 `TestGesture`，並執行 `result.down(downLocation)` 來模擬 **手指按下**。
2. 接著呼叫 `gesture.up()` 來模擬 **手指放開**。

```dart
Future<void> tapAt(
  Offset location, {
  int? pointer,
  int buttons = kPrimaryButton,
  PointerDeviceKind kind = PointerDeviceKind.touch,
}) {
  return TestAsyncUtils.guard<void>(() async {
    final TestGesture gesture = await startGesture(
      location,
      pointer: pointer,
      buttons: buttons,
      kind: kind,
    );
    await gesture.up();
  });
}

Future<TestGesture> startGesture(
  Offset downLocation, {
  int? pointer,
  PointerDeviceKind kind = PointerDeviceKind.touch,
  int buttons = kPrimaryButton,
}) async {
  final TestGesture result = _createGesture(pointer: pointer, kind: kind, buttons: buttons);
  if (kind == PointerDeviceKind.trackpad) {
    // 處理觸控板的點擊行為
  } else {
    await result.down(downLocation);
  }
  return result;
}
```

如果你曾經用 Listener 監聽過觸控事件，對這流程應該不陌生：

- 按下時 → `PointerDownEvent`
- 放開時 → `PointerUpEvent`

想實際觀察的人，可以參考[這個範例](https://dartpad.dev/?id=5b0ff587c3653927bdc93e39fddac731)。

## TestGesture 如何發送事件

那這些事件是怎麼真正「傳到 Flutter Framework」的呢？

答案就在 `TestGesture` 的 `down` 與 `up` 方法中。

```dart
Future<void> down(Offset downLocation, {Duration timeStamp = Duration.zero}) async {
  
  // 省略檢查細節
  
  return TestAsyncUtils.guard<void>(() async {
    return _dispatcher(_pointer.down(downLocation, timeStamp: timeStamp));
  });
}
```

這裡 `_dispatcher` 會發送一個 `PointerDownEvent`。在 `TestGesture` 的建構過程中，可以看到它實際上被綁定成 `sendEventToBinding`，最後透過 `WidgetsBinding` 把事件送進 Framework。

```dart
TestGesture _createGesture({
  int? pointer,
  required PointerDeviceKind kind,
  required int buttons,
}) {
  return TestGesture(
    dispatcher: sendEventToBinding,
    kind: kind,
    pointer: pointer ?? _getNextPointer(),
    buttons: buttons,
  );
}

Future<void> sendEventToBinding(PointerEvent event) {
  return TestAsyncUtils.guard<void>(() async {
    binding.handlePointerEvent(event);
  });
}
```

熟悉 Flutter 的人應該對 `WidgetsBinding` 不陌生。我們常用的 `WidgetsBinding.instance.addPostFrameCallback(...)` 就是它的功能之一。

在點擊事件的情境下，Engine 收到事件後，會透過 `WidgetsBinding`（更精確地說是 `GestureBinding`）把事件傳進 Framework，經過像 **GestureArena** 這樣的機制過濾與解析，最後才交給我們常用的 `GestureDetector`。

## 整理一下

整個 `tap` 的執行流程，可以簡單整理如下：

![開發 - Frame 11.jpg](Widget%20Test%20%E7%9A%84%20tap%20%E5%8E%9F%E4%BE%86%E9%80%99%E6%A8%A3%E9%81%8B%E4%BD%9C%EF%BC%9F%E4%B8%80%E6%8E%A2%20Flutter%20%E6%B8%AC%E8%A9%A6%E9%BB%9E%E6%93%8A%E7%9A%84%E7%A5%95%E5%AF%86/%E9%96%8B%E7%99%BC_-_Frame_11.jpg)

1. 呼叫 `WidgetTester.tap`
2. 透過 finder 找到 Element，計算中心點的 Global 座標
3. 呼叫 `tapAt`，傳入座標
4. 建立 `TestGesture` 負責處理點擊
5. 呼叫 `down` → 發送 `PointerDownEvent`
6. 呼叫 `up` → 發送 `PointerUpEvent`

## 小結

透過研究 `WidgetTester.tap` 的實作，我們不僅加深了對 Widget Test 使用方式的理解，也更清楚它是如何與 Flutter Framework 互動。雖然這些細節未必直接影響日常開發，但它可以視為一種「閱讀程式碼的訓練」。在 AI 不斷進步的時代，我們反而更需要具備閱讀、理解 **別人程式碼** 的能力。

每次遇到不熟悉的地方，都是充實知識庫的契機。在追原始碼的過程中，不只能更透徹地理解框架運作，也能從中學到設計思維與程式風格。

希望這篇文章能帶給你一些啟發。如果有任何問題，歡迎留言與我討論，感謝你讀到這裡！