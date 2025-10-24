# 初探Flutter Widget Test

新增時間: August 11, 2021 1:07 PM
最後編輯時間: October 3, 2025 12:04 AM
id: 3c907ffe50cd4a81b82b52ffb7d309ec
完成: Yes
類型: Medium
🧩 領域: Flutter (https://www.notion.so/Flutter-aec5ea3a198f49e18989ab7f4c851169?pvs=21)

Flutter可以使用 [test](https://pub.dev/packages/test) 來幫助我們寫單元測試，透過單元測試來幫忙檢查我們的核心邏輯是否正確。在我們實作需求或者是重構代碼時，常常會修改到過去已經寫好的代碼，當我們改壞邏輯時時，單元測試也能發出警訊，提醒我們改動可能有問題。

Flutter是個前端框架，需求常常是需要表現在畫面上，在這種情境中，我們比較難使用單元測試來驗證畫面是否正確，為了解決這個問題，我們可以使用Flutter提供的Widget Test來幫助我們寫一些可以驗證畫面的測試。

## Counter Ｗidget範例

當使用 flutter create 創建一個project，裡面會自帶一個counter範例。在這個範例中，畫面中央會有當前的counter，每當我們按下 + 按鈕後，counter就會加1，如下圖所示。

![](%E5%88%9D%E6%8E%A2Flutter%20Widget%20Test/widget_test.png)

## 第一個Widget Test

在剛剛創建出來的flutter proejct中，裡頭也包含了一個Widget Test，測試的正是按下 ＋ 按鈕後並在畫面上把 0 變成 1 ，也就是這個範例的核心邏輯。

```dart
void main() {
  testWidgets('Counter increments smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(MyApp());

    expect(find.text('0'), findsOneWidget);
    expect(find.text('1'), findsNothing);

    await tester.tap(find.byIcon(Icons.add));
    await tester.pump();

    expect(find.text('0'), findsNothing);
    expect(find.text('1'), findsOneWidget);
  });
}
```

在main中，testWidgets表示一個測試，第一個參數是測試敘述，第二個參數則是實際的測試內容。在這個測試內容中，呼叫pumpWidget來建立與渲染ＭyApp。

```dart
await tester.pumpWidget(MyApp());
```

當MyApp建立起來之後，就可以使用find方法來幫助找到想要的Widget。透過 find.text()來找到畫面中的包含 0 和 1 文字的Widget，透過expect驗證結果是否符合預期。以這個範例來說，當MyApp剛開起來時，因為還沒點下 + 按鈕，所以畫面應該是 0 而不是 1，所以能夠使用find.text()找到一個 0 的 Text Widget，找不到 1 的Text Widget。

```dart
expect(find.text('0'), findsOneWidget);
expect(find.text('1'), findsNothing);
```

同樣地，也能透過 find.byIcon()來找到icon widget，找到之後就能用tester.tap來按下它。除了find.text()與find.byIcon()，find中還提供各式各樣的方法來幫助我們容易的找到我們想要的Widget，例如：find.byKey()、find.byWidget()… 等。

```dart
await tester.tap(find.byIcon(Icons.add));
```

在這邊值得一提的是Widget Test不會幫我們自動rebuild widget，所以按下 + 按鈕後，State裡頭的 _counter 已經成功變成 1 了，但是MyApp也不會把 1 顯示在畫面上，此時需要呼叫test.pump()來觸發rebuild。

```dart
await tester.pump();
```

最後就是驗證畫面上存在包含 1 的Text Widget，而不是 0 的Text Widget

```dart
expect(find.text('0'), findsNothing);
expect(find.text('1'), findsOneWidget);
```

## 複雜的情境

Counter範例是一個簡單的情境，相對的我們要對他寫Widget Test也不會太過困難。但在實際的開發過程中，我們會碰到各式各樣的狀況，例如：如何隔離網路讓測試可以總是使用我們想要的資料測試，又或者是如何在畫面切換情境中測試。未來我會跟大家分享一些自己在實際情境中碰到的一些例子，與我的處理方式。

## 結論

單元測試可以幫我們驗證狀態是否符合預期，Widget Test則是可以幫我們驗證畫面是否符合預期。雖然Widget Test除了驗證畫面，也同時驗證了邏輯。但是並不代表我們可以用Widget Test取代單元測試，反而是我們應該要用Widget Test專注在畫面上的驗證，更多是關注在給定狀態後畫面是否符合預期，減少驗證邏輯上的變化，讓單元測試專注在測試核心邏輯上面，兩者應該是相輔相成。