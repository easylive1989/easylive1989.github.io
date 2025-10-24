# Day 23 學會 Widget Test 用法只是開始

備註: 測試狀態管理 測試通知 測試時間流逝

經過了十幾天的文章，我們介紹了 Finder 用法、模擬使用者操作與如何驗證方式，最後其實觀眾朋友可以發現，Widget Test 在測試的架構上與單元測試基本上沒什麼差異，執行速度也只比單元測試慢一點點。所有可以用在單元測試上的技巧，例如依賴注入或測試替身，也同樣的可以用在 Widget Test 中，讓開發人員可以精準控制 Widget Test。

## 難在與畫面相關

雖然我們介紹了十幾天的 Widget Test 相關議題，但其實這只是 Widget Test 的開始，真正開始寫 Widget Test 之後，可能會碰到許多大大小小的問題。由於 Widget Test 本身與畫面高度相關，但是在測試過程中我們是看不到畫面的，所以有時候當測試發生錯誤時，我們可能不太好排查問題在哪邊。

在昨天的文章中，我們介紹了如何處理 Widget Test 中的跑版錯誤，但除此之外，還有許多在 Widget Test 可能會遇到的問題點，今天就來補充一下吧。

## 找不到 Builder 中的 Widget

假設我們有一個很長 ListView 列表，當中顯示 100 個項目。[[範例程式](https://dartpad.dev/?id=93afb3874931e8915155122cfdb3b4f8)]

![](https://github.com/easylive1989/images/blob/master/static/images/2023IThome/Day22/1.gif?raw=true)

如果測試中嘗試用 Finder 去找出列表中的第 99 項目來驗證時，會發現 Finder 找不不到想要的 Widget，那為什麼會發生這種情況呢？

```dart
testWidgets("find item 99", (tester) async {
  await tester.pumpWidget(const MyApp());

  expect(find.text("Title 99"), findsOneWidget);
});
```

![](https://github.com/easylive1989/images/blob/master/static/images/2023IThome/Day22/2.png?raw=true)

因為 ListView.builder 為了節省資源，畫面並不會在第一時間就把所有 Widget 建出來，而是等到畫面滑到那個位置的時候，才會去建立 Widget，所以也導致 Finder  找不到 Widget。就像真實的使用者一開打程式也看不到第 99 的項目，必須往下一定距離後才會出現，所以在測試中必須也在模擬向下滑動來讓第 99 個項目出現。

```dart
testWidgets("find item 99", (tester) async {
  await tester.pumpWidget(const MyApp());

  await tester.fling(find.byType(ListView), const Offset(0, -100), 10000);
  await tester.pumpAndSettle();

  expect(find.text("Title 99"), findsOneWidget);
});
```

## 未結束的 Timer

有時候我們會有任務需要延遲執行，例如：在畫面中放了一個 5 秒後會消失的 Hello World。[[範例程式](https://dartpad.dev/?id=f49d01a10702d3e3de3aeef1253336a5)]

![](https://github.com/easylive1989/images/blob/master/static/images/2023IThome/Day22/3.gif?raw=true)

如果我只想測試畫面中有沒有出現 Hello World，我們就會很簡單的像下面例子那樣。

```dart
testWidgets("show hello world", (tester) async {
  await tester.pumpWidget(const MyApp());

  expect(find.text("Hello World"), findsOneWidget);
});
```

但是實際執行卻發生了錯誤，為什麼呢？如果我們看錯訊息會發現，因為測試結束時還有 Pending 的 Timer 還在等待沒結束，以上面程式來說，就是五秒後要消失的任務還沒執行，裡頭的 Timer 在測試結束時還殘留。

![](https://github.com/easylive1989/images/blob/master/static/images/2023IThome/Day22/4.png?raw=true)

而解決的辦法也很簡單，我們可以直接在測試的最後呼叫 WidgetTester 的 pump 方法加上時間，讓 Widget Test 直接往前五秒，讓等待的 Timer 執行完成。

```dart
testWidgets("show hello world", (tester) async {
  await tester.pumpWidget(const MyApp());

  expect(find.text("Hello World"), findsOneWidget);

  await tester.pump((const Duration(seconds: 5)));
});
```

## 在測試中處理文字

在處理圖片的測試的文章中，我們提到可以用 flutter_gen 來產生圖片常數，同樣的道理，放在驗證文字的情境中，我們也可以使用相同的技巧，避免在程式與測試中寫死重複的文字。假設我們使用 Flutter 官方文件中的方式處理文字，我們會在 MaterialApp 中設定 localizationsDelegates 設定翻譯。

```dart
MaterialApp(
  localizationsDelegates: AppLocalizations.localizationsDelegates,
	supportedLocales: AppLocalizations.supportedLocales,
	...
)
```

在測試中，我們也可以根據不同語言，建立測試中所使用語言的 Localizations 物件，在下面的例子中，我們就建立了英文的 Localization 物件，直接拿著物件中的 hello_world 來驗證，我們想要測試的是畫面中是否有出現正確資訊，而不是文字翻譯的對錯與否。

```dart
testWidgets("show hello world", (tester) async {
  var localization = await AppLocalizations.delegate.load(const Locale("en"));

  await tester.pumpWidget(const MyApp());

  expect(find.text(localization.hello_world), findsOneWidget);
})
```

這樣還有個優點，當文字內容發生改變時，我們只要更新了文字檔裡面的文字即可，測試並不需要跟著修改。在處理多國語言的問題上，除了官方內建處理方式，還有各種不同套件也可以協助處理，例如：[easy_localization](https://pub.dev/packages/easy_localization)，相信也是可以用類似的方法處理。

## 小結

今天是介紹 Widget Test 的最後一天，補充了一些 Widget Test 會遇到什麼問題，不過問題肯定不只這樣，像是使用了 [visibility_detector](https://pub.dev/packages/visibility_detector) 後，如果沒有仔細閱讀文件，可能也會在 Widget Test 遇到錯誤。Widget Test 雖然很強大，可以讓我們用簡單的 API 直接從使用者的角度測試程式的完整行為，但是也如一開始提到的，Widget Test 與畫面高度相關，使得要了解測試 API 比較多，碰到問題也比較難解決，需要多寫才能掌握。

Widget Test 的部分就介紹到這邊，在未來的幾天中，我們會聊一些跟測試相關的議題，諸如，為什麼要寫測試或我該測試什麼 …等等，有興趣的觀眾朋友還歡迎繼續追蹤。