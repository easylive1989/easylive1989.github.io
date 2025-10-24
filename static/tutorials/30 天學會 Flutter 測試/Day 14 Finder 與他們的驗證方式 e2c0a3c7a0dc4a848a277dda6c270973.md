# Day 14 Finder 與他們的驗證方式

在昨天的文章中，我們簡單認識了 Widget Test 什麼，也簡單介紹了一個 Widget Test 例子，但是這肯定遠遠不夠，在昨天的例子中，我們運用 find.text 來確認畫面中是否有預期的文字，驗證最終結果是否符合預期。但是 Finder 可不只能用來找畫面上的文字，今天就來介紹 Finder 基礎用法吧。

## 驗證 Finder 結果

在 Widget Test 中，我們可以直接使用靜態變數 find 來取得 Finder，可以用來找到各式各樣的 Widget。值得注意的是，我們呼叫 Finder 身上的方法得到的物件並非 Widget 本身，以 find.text() 來說，回傳實作的型別是 _TextFinder ( 前面的底線表示該類別為私有類別 )，不同的方法取回的 Finder 型別也不同，根據想找到 Widget 而定。

當我們呼叫 find.text 得到 Finder 後，與單元測試一樣是用 expect 驗證結果，但是在設定預期值則必須使用 Widget Test 專用的 Matcher。在下面的例子中，我們是使用 findsOneWidget，顧名思義，我們預期找到一個 Widget。

```dart
expect(find.text("Hello World"), findsOneWidget);
```

findsOneWidget 是一個型別為 _FindsWidgetMatcher 的靜態變數，根據不同的測試情境，還有 findsNothing、findsNWidgets、findsAtLeastNWidgets …等，都是用來檢查畫面中的 Widget 數量是否正確。

再來讓我們繼續看看 Finder 的用法吧。

## 基本 Find 方法

Finder 除了可以用來找畫面上的文字之外，我們可也可以找 Icon，更可以找某個 Widget 類別，甚至我們能直接取得 Widget 本人，讀取 Widget。當我們用 Finder 的方法找到結果時，可以拿來驗證，也可以拿來模擬使用者互動。

```dart
find.byIcon(Icons.clear);

find.byType(ListTile);
```

以下面這個畫面來舉例，這是一個讓使用者可以更新名字與地址的功能，當使用者按下 Submit 之後，會跳出更新成功的訊息。[[範例連結](https://dartpad.dev/?id=b0c36eeedc6bc6195309044edce82ec9)]

![Untitled](Day%2014%20Finder%20%E8%88%87%E4%BB%96%E5%80%91%E7%9A%84%E9%A9%97%E8%AD%89%E6%96%B9%E5%BC%8F/Untitled.png)

我們可以用 find.byIcon 方法尋找畫面中是否存在正確的 Icon

```dart
testWidgets('Counter increments smoke test', (WidgetTester tester) async {
  await tester.pumpWidget(const MyApp());

  expect(find.byIcon(Icons.abc_outlined), findsOneWidget);
  expect(find.byIcon(Icons.signpost), findsOneWidget);
});
```

也可以用 find.byType 方法尋找畫面中是否出現兩個 Submit 按鈕

```dart
testWidgets('Counter increments smoke test', (tester) async {
  await tester.pumpWidget(const MyApp());

  expect(find.byType(ElevatedButton), findsNWidgets(2));
});
```

不過以上這些測試只是舉例，展示一下 Finder 的用法，大多時候，只要畫面細節不具備重要意義，我們大多不太會檢查畫面細節。

## 驗證行為

我們大多時候更想驗證功能是正確，以上面例子來說，我們會想驗證使用者按下 Submit 按鈕之後，畫面有沒有出現更新成功的訊息。

```dart
testWidgets('Counter increments smoke test', (tester) async {
  await tester.pumpWidget(const MyApp());

  await tester.tap(find.byType(ElevatedButton));
  await tester.pump();

  expect(find.text("更新成功"), findsOneWidget);
});
```

但是當我們寫完測試並執行後，測試出現了紅燈，因為畫面上有兩個 ElevatedButton，但是測試不知道要選哪個來按。

```
══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
The following assertion was thrown running a test:
The finder "2 widgets with text "Submit" (ignoring offstage widgets): [Text("Submit", dependencies:
[DefaultSelectionStyle, DefaultTextStyle, MediaQuery]), Text("Submit", dependencies:
[DefaultSelectionStyle, DefaultTextStyle, MediaQuery])]" (used in a call to "tap()") ambiguously
found multiple matching widgets. The "tap()" method needs a single target.
```

在 Widget Test 中，有很多方法可以處理這個問題，由於我們知道畫面上有兩個按鈕，而我們想按的是第一個，那我們可以簡單地在 find.byType() 加上 first，選擇第一個按鈕來點。

```dart
await tester.tap(find.byType(ElevatedButton).first);
```

但是其實使用 first 來解決並不理想，還記得我們前面提到的測試可讀性嗎？當閱讀測試的人讀到這邊，看到 first 八成不會知道 first 是什麼？還得回頭去翻產品程式碼才會知道是編輯名字的提交按鈕。

## 用 byKey 提升測試可讀性

在這個例子上，我們也可以稍微修改一下程式碼，在目標 Widget 上加上 Key。

```dart
ElevatedButton(
  key: ValueKey("name-edit-submit-btn")
  onPressed: () => _showSuccess(context),
  child: const Text("Submit"),
)
```

就像是 React 中在 DOM 元素上標記 data-testid 一樣，可以在測試中用 data-testid 找到相對應的 Component。在 Flutter 中，Key 除了可以解決 Widget 渲染的問題，也可以讓我們在測試中使用 find.byKey 去找到想要的 Widget。

```dart
testWidgets('Counter increments smoke test', (tester) async {
  await tester.pumpWidget(const MyApp());

  await tester.tap(find.byKey(ValueKey("name-edit-submit-btn")));
  await tester.pump();

  expect(find.text("更新成功"), findsOneWidget);
});
```

除了可以解決 Widget 重複的問題，我們也能同時提升測試的可讀性，測試自己就能表達模擬使用者按哪個按鈕。

## 抽取獨立 Widget

除此之外我們也可以用使用**抽取 Widget** 將 Submit 按鈕獨立抽成一個 Widget，就像抽取方法我們必須給一個適合的方法名稱一樣，我們也能給剛抽出來的 Widget 給一個適合的名字。[[範例連結](https://gist.github.com/easylive1989/88069a560a90317884f5371b0d9650c8)]

```dart
class EditNameSubmitButton extends StatelessWidget {
  const EditNameSubmitButton({super.key});

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: () => _showSuccess(context),
      child: const Text("Submit"),
    );
  }

  void _showSuccess(BuildContext context) async {
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text("更新成功")));
  }
}
```

當我們測試時，就可以直接用 byType 方法找到 EditNameSubmitButton。

```dart
testWidgets('Counter increments smoke test', (tester) async {
  await tester.pumpWidget(const MyApp());

  await tester.tap(find.byType(EditNameSubmitButton));
  await tester.pump();

  expect(find.text("更新成功"), findsOneWidget);
});
```

## byKey 或 byType

byKey 和 byType 都能解決重複 Widget 問題，那我們該怎麼選擇呢？其實我們應該從程式碼來判斷，當一群 Widget 的職責足夠內聚，我們可以把這群 Widget 抽成另一個 Widget，根據其功能來給一個合適的名稱，最後我們就可以用 byType 來測試。反之，當今天 Widget 之間關聯性比較小，我們很難抽出一個獨立有意義的 Widget，就比較傾向於在目標 Widget 上加上 Key ，解決測試麻煩。

只要情況允許，比較推薦使用抽取 Widget，因為抽取一個獨立 Widget 不只有助於測試，也有助於閱讀程式碼，讓簡化 Widget 的職責，就像我們會用抽取方法來隱藏實作細節，抽取 Widget 也會隱藏實作細節，無論是 UI 的細節或功能上的細節。以上面的例子來說，在 EditNameSubmitButton 的實作中只有一個 ElevatedButton，可能就沒什麼必要，因為 EditNameSubmitButton 幾乎等同於 ElevatedButton，此時抽取 Widget 就沒有太大好處。

## 小結

今天介紹了基本的 Finder 與如何在 Widget Test 中驗證結果，也討論到了如何在測試中避免重複 Widget 帶來的麻煩。在 Finder 的用法上還有許多更進階的用法，也會在明天繼續討論，也歡迎有問題留言一起討論。