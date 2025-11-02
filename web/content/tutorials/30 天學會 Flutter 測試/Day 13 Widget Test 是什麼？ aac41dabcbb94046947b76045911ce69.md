# Day 13 Widget Test 是什麼？

今天我們要從單元測試進入 Widget Test 的部分了，我們花了十幾天的時間介紹 Dart 的單元測試，也介紹了許多測試相關的概念與技巧，單元測試是最容易寫的測試，其中的概念多多少少也可以運用在 Widget Test 或其他類型測試中，讓我們直接開始介紹 Widget Test 吧。

## 什麼是 Widget Test

在 [Flutter 官方文件](https://docs.flutter.dev/testing/overview#widget-tests)中介紹 Widget Test 是一種 [Component Test](https://martinfowler.com/bliki/ComponentTest.html)，透過模擬使用者操作 UI 的行為，然後驗證畫面結果是否符合預期，有點像是 End to End 測試。在 Widget Test 中，雖然測試會模擬使用者的操作畫面，但實際上在執行 Widget Test 並不會真的看到畫面，也不會真的去打遠端 Server 的 API，所以 Widget Test 的執行速度十分接近單元測試。

|  | Unit | Widget | Integration |
| --- | --- | --- | --- |
| Confidence | Low | Higher | Highest |
| Maintenance cost | Low | Higher | Highest |
| Dependencies | Few | More | Most |
| Execution speed | Quick | Quick | Slow |

出處：[https://docs.flutter.dev/testing/overview](https://docs.flutter.dev/testing/overview)

## 為什麼要寫 Widget Test

Flutter 是一個 UI 框架，在開發的時候，假設架構使用 Clean Architecture，我們雖然可以把邏輯都封裝到 Adapter 層或 Use Case 層，甚至 Entity 層，但是 UI 層還是多少會存在著操作 Adapter 層 API 的整合邏輯。此時，使用 Widget Test 來測試，才能測試到這些整合邏輯，也會比單元測試要來的接近實際情況。

那Widget Test 是不是可以取代單元測試呢？答案顯然不是，Widget Test 看起來美好，實際繼上還是有許多不方便的地方，像是除錯比較不方便，或者隨著測試的越外層，測試需要準備的資料也越多，寫起測試來肯定不像單元測試那樣順暢，維護比較麻煩。但是其實這些問題，隨著我們的持續增加我們的測試經驗與技巧，再加上善用 IDE 工具，還是能減少撰寫 Widget Test 的時間，降低開發成本。

## 最簡單的例子

在我們用 flutter 建新專案時，裡頭預設就會包含一個簡單的例子與 Widget Test，讓我們來看看這個簡單的例子。

![](https://raw.githubusercontent.com/easylive1989/images/master/static/images/2023IThome/Day13/1.jpg)

在這個簡單的例子中，每當使用者按一次按鈕，畫面中的數字就會加 1。在範例測試中，也是依循著這個邏輯。

```dart
void main() {
  testWidgets('Counter increments smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp());

    expect(find.text('0'), findsOneWidget);
    expect(find.text('1'), findsNothing);

    await tester.tap(find.byIcon(Icons.add));
    await tester.pump();

    expect(find.text('0'), findsNothing);
    expect(find.text('1'), findsOneWidget);
  });
}
```

與單元測試類似，我們一樣是把 Widget Test 的測試案例放在 main 方法中，但是與單元測試不一樣的是，Widget Test 使用 testWidgets 方法來測試，而不是 test。在 testWidgets 的第二個參數會傳入非同步方法，這個非同步方法中有一個 WidgetTester 的參數，這個 WidgetTester 就是我們主要拿來與 Widget 互動的工具。

與單元測試建立 SUT 類似，我們在 Widget Test 中，需要決定要測試哪個 Widget，然後用 WidgetTester.pumpWidget 將 Widget 畫出來。

```dart
await tester.pumpWidget(const MyApp());
```

接著就可以用 tester.tap 模擬使用者點擊 Icon，再 tap 方法中，我們需要使用 Finder 幫我們找出 Icon，把他傳入 tap 方法中，讓程式執行點擊後的動作，使 count 加 1。

```dart
await tester.tap(find.byIcon(Icons.add));

```

雖然我們成功地把 count + 1，但是在測試中的畫面還是維持 0，因為 Widget Test 並不會自己刷新畫面，需要我們呼叫 WidgetTester.pump 方法，主動通知 WidgetTester 刷新畫面。

```dart
await tester.pump();
```

最後我們就可以用 expect 來驗證畫面數字是不是變成 1 了

```dart
expect(find.text('1'), findsOneWidget);
```

上面這個例子是十分簡單的 Widget Test 範例，在未來的幾天文章中，我們會介紹如何 Finder 找出各種不同的 Widget 與如何模擬各種使用者操作，透過組合 Finder 與 WidgetTester ，我們就能模擬大部分的情境了。

## 單元測試 vs Widget Test

- **一樣是 3A 原則**

Widget Test 與單元測試在測試的結構上，兩者並沒有多大差別。在單元測試中，我們思考的是要怎麼測試 SUT 的行為，呼叫哪些方法，驗證哪些狀態。來到 Widget Test，我們則是在思考要測試哪個畫面的行為，點擊哪些按鈕，驗證畫面上出現哪些元素，本質上一樣是 3A 原則。

- **測試的角度不同**

寫單元測試時，只要熟悉單元測試的概念，即便不熟悉 Dart 語法或 API，我們寫起來也不會有太大問題，因為單元測試是測試邏輯，對於語言的依賴度不大。但是寫 Widget Test 時，我們測試的角度就是從畫面出發，思考使用者與畫面如何互動，最後在畫面上產生何種結果，這就與單元測試有很大不同。

- **需要學會的測試 API 變多了**

在單元測試中，我們使用的測試 API 基本上只有 expect 與測試替身，但是在 Widget Test 中，我們除了單元測試會用到的 API 之外，我們還要了解如何使用 Finder 找到想要找的 Widget，也要會使用 WidgetTester 的各種 API 模擬使用者操作，學習成本上多了不少。

## 小結

今天是介紹 Widget Test 的第一天，在開發 Flutter 程式的過程中，如果只有使用單元測試，一個完整的使用者行為，可能就會被拆分成好幾段段不同測試，適時使用 Widget Test 反而會比較好測試，維護測試簡單一點。

為什麼需要 Widget Test

假若我們都是使用最嚴謹單元測試的話，我們必須在測試中隔離 UI 的部分，Flutter 是一個 UI 的框架，也就是說我們在測試中不該使用到 Flutter。但不幸的是，有些時候，行為與 UI 可能會緊密相關，當我們去除了 UI 部分，反而會使得測試變得囉唆，甚至失去意義。

沒啥間測試是假議題

熟練測試 寫得快 不花時間

包括善用工具

Live template 快捷鍵

3A 原則並不限制於的單元測試，連同之後我們會討論到 Widget，或者 BDD 等，架構上都是符合 3A 原則的，把在測試中清楚的表達 3A 原則也有助於測試的可讀性，之後我們會談論這個部分。

Widget Test 並不是要測試 Widget 有沒有正常工作，而是我們有沒有正確的使用 Widget，正卻的把這些 Widget 組合起來完成我們的需求

相比於前幾天提到的單元測試，在測試金字塔中 Widget 測試，要比單元測試更上層，穩定度與執行速度較慢。

但是 Flutter 的 Widget 實際上並沒有真正的把畫面渲染出來，所以執行速度與穩定度會相當的接近單元測試，十分適合在開發 Flutter 的過程中一定程度的取代單元測試。

[https://docs.flutter.dev/cookbook/testing/widget/introduction](https://docs.flutter.dev/cookbook/testing/widget/introduction)