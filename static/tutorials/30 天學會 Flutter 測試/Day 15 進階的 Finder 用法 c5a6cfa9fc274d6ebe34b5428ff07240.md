# Day 15 進階的 Finder 用法

昨天介紹了怎麼用 Finder 與 Matcher 來驗證 Widget 有沒有出現在畫面，也介紹幾種基本的 Finder 用法，和如何解決 Widget 重複的問題。今天會接續昨天的內容，繼續探討 Finder 更多的用法，話不多說，我們馬上開始。

## 舉個例子

假設我們有一個顯示電器商品詳細資訊的頁面，在頁面中會顯示各式各樣的資訊，包括電器型號、電器長寬高、價格、剩餘數量 …等等。[[範例程式](https://dartpad.dev/?id=a45636e30c4badd2b46cda677f66699f)]

![截圖 2023-09-29 下午1.40.16.png](Day%2015%20%E9%80%B2%E9%9A%8E%E7%9A%84%20Finder%20%E7%94%A8%E6%B3%95/%25E6%2588%25AA%25E5%259C%2596_2023-09-29_%25E4%25B8%258B%25E5%258D%25881.40.16.png)

假設我們想測試畫面上的剩餘數量是 60 這件事情，經過昨天的練習，我們馬上會發現畫面上有兩個 60，我們必須得驗證兩個 60。

```dart
testWidgets("quantity should be correct", (tester) async {
  await tester.pumpWidget(const ProductInfoPage());

  expect(find.text("60"), findsNWidgets(2));
});
```

雖然測試通過了，但是仔細一看，測試目的與測試內容並不相符合，我們是想測試剩餘數量，但是因為畫面上出現了兩個 60，使我們不得連同商品的寬一起驗證。

## 組合式 Finder

當畫面上有相同 Widget 重複出現時，我們除了可以使用之前介紹的 byType 或 byKey 處理，但是在上面這個例子中，我們重複的並不是 Widget，而是文字本身。如果我們用 byType 拿回來的東西是 _WidgetTypeFinder，這個 Finder 沒有辦法幫助我們驗證結果是不是 “60”。同樣的 byKey 拿回來的是 _KeyFinder 也沒有辦法解決問題。

此時我們就必須依靠比較特別的 Finder：find.ancestor，顧名思義，這個 Finder 與 Widget 祖先有關。簡單來說，使用 find.ancestor 方法可以幫助我們找到具備指定祖先的 Widget，說起來還是有點複雜，讓我們修改一下上面測試吧，從實際案例中說明吧。

```dart
testWidgets("quantity should be correct", (tester) async {
  await tester.pumpWidget(const ProductInfoPage());

  expect(
      find.ancestor(
        of: find.text("60"),
        matching: find.byType(ProductQuantity),
      ),
      findsOneWidget);
});
```

在上面的測試中，我們使用 find.ancestor，在 of 參數中傳入我們想找的 Widget，而 matching 參數則是指定想找的 Widget 有指定的祖先。讓我們看看下圖，Text(”60”) 這個 Widget 出現兩次，但是透過指定特聽祖先，我們就能過濾掉存在於 ProductWidth 中的 Text(”60”)，找到 ProductQuantity 中的 Text(”60”)。

![Discuss - ancestor (2).jpg](Day%2015%20%E9%80%B2%E9%9A%8E%E7%9A%84%20Finder%20%E7%94%A8%E6%B3%95/Discuss_-_ancestor_(2).jpg)

與 ancestor 類似方法還有一個，那就是 find.descendant，當我們理解了 ancestor 的用法後，我們就不難理解 descendant 了。同樣的在顯示商品資訊的需求中，畫面有三個 ProductSize，其中一個是顯示產品的寬，如果我們想找到顯示產品的寬的 ProductSize 時，我們就能用 descendant 指定存在特定子孫。

```dart
find.descendant(
  of: find.byType(ProductSize),
  matching: find.text("寬"),
)
```

![Discuss - descendant.jpg](Day%2015%20%E9%80%B2%E9%9A%8E%E7%9A%84%20Finder%20%E7%94%A8%E6%B3%95/Discuss_-_descendant.jpg)

當畫面變得越來越複雜，相同 Widget 被用在越來越多地方，想找到指定 Widget 就變得有些難度，幸好 Widget Test 的 Finder 設計得十分方便，讓我們可以不用花太多力氣就能找到想要的 Widget。但是有些時候，光是使用 Finder，還不夠達到我們的需求，需要真的拿到 Widget 的時後怎麼辦呢？讓我們繼續看下去。

## 驗證 Widget 的屬性

除了驗證 Widget 是否存在，有時我們會需要驗證 Widget 上的屬性是否符合預期。讓我們修改一下需求，在商品資訊畫面中，當數量低於 10 個時，數量文字的顏色要顯示成紅色 [[範例程式](https://dartpad.dev/?id=4363977def7f163c2a55f6c847985b2c)]。這時除了驗證剩餘數量是否顯示正確之外，可能還需要驗證數字的顏色到底對不對。

![截圖 2023-09-29 下午1.53.21.png](Day%2015%20%E9%80%B2%E9%9A%8E%E7%9A%84%20Finder%20%E7%94%A8%E6%B3%95/%25E6%2588%25AA%25E5%259C%2596_2023-09-29_%25E4%25B8%258B%25E5%258D%25881.53.21.png)

我們回顧之前學到的技巧，都是在講如何確認 Widget 有出現在畫面中，但是好像沒看到可以確認顏色有沒有出現在畫面中的 API，那我們要怎麼驗證顏色呢？讓我們先想一想，顏色的資訊是定義在哪邊？顏色資訊是放在 Text 中的 TextStyle 屬性中，所以我們驗證的方式就是確認 TextStyle 中的 color 是不是符合預期，那就來寫測試驗證顏色吧。

```dart
Text(
  quantity.toString(),
  style: TextStyle(color: quantity < 10 ? Colors.red : Colors.black),
),
```

首先，我們一樣得先用 Finder 找出目標 Widget，接著我們必須使用 Finder 身上的 evaluate 方法取得 Element List，先等一下，什麼是 Element 呢？簡單來說，Element 是 Flutter 框架中的核心，當中包含 Widget 與 RenderObject，控管狀態並決定何時更新畫面的元件，本次鐵人賽中也有許多優秀鐵人有詳細解釋，我們這邊暫不多討論，不然篇幅會過長。

```dart
var text = find.text("5").evaluate().single.widget as Text;
```

讓我們回到 evaluate 方法回傳 Element List 這邊，由於 Finder 可能會找到許多符合條件的 Widget，所以 evaluate 方法回傳的自然也是 List，但是在這個測試中，我們很確定 Text(”5”) 只會有一個，所以我們直接使用 List 的 single 方法取得唯一一個 Element，再從 Element 身上取得 Widget，並強制轉型成我們預期的類型。

```dart
testWidgets("quantity should be correct", (tester) async {
  await tester.pumpWidget(const ProductInfoPage());

  var text = find.text("5").evaluate().single.widget as Text;

  expect(text.style?.color, isSameColorAs(Colors.red));
});
```

最後我們就能拿到 Text 本人，並驗證 Text 身上的 TextStyle 中的 color 是不是紅色。除了上面這種寫法之外，WidgetTester 也有提供 API 讓我們直接取得 Widget，裡頭實作一樣是使用 evaluate 方法來取得 Widget，但可以讓寫法變得比較簡潔。

```dart
testWidgets("quantity should be correct", (tester) async {
  ...

  var text = tester.widget<Text>(find.text("5"));

  ...
});
```

其實當我們在呼叫 expect 加上 findsOneWidget 驗證 Widget 否出現在畫面上時，裡頭也是用 evaluate 方法拿回 Element List 並檢查數量是否符合預期的。

## 驗證順序是誰的工作

假設我們有一個使用者列表，我們希望畫面上的列表順序是按照使用者字母名稱來排序 [[範例程式](https://dartpad.dev/?id=3afc3270a0d96076ab3b7b4d8b3b9cd9)]。假設我們想驗證畫面上的使用者名稱真的有依照字母排序，我們該如何測試呢？有興趣的觀眾朋友也可以先試試看再繼續往下看。

![截圖 2023-09-29 下午4.23.23.png](Day%2015%20%E9%80%B2%E9%9A%8E%E7%9A%84%20Finder%20%E7%94%A8%E6%B3%95/%25E6%2588%25AA%25E5%259C%2596_2023-09-29_%25E4%25B8%258B%25E5%258D%25884.23.23.png)

其實方法有很多種，最簡單的方式，就是用 byType 方法找出所有 Text，再用 WidgetTester 的 widgetList 取得 Text 本人，然後我們就能檢查這群 Text 的 data 排法是否符合預期了。

```dart
testWidgets("user should order by alphabetic", (tester) async {
  await tester.pumpWidget(const UserListPage(
    users: ["Paul", "Alex", "John", "Mary", "Bill", "Cindy", "David"],
  ));

  var texts = tester.widgetList<Text>(find.byType(Text));

  expect(
    texts.map((text) => text.data),
    ["Alex", "Bill", "Cindy", "David", "John", "Mary", "Paul"],
  );
});
```

當然測試方法不只一種，聰明的觀眾肯定能想到更好的辦法測試。但是我們必須小心一件事，跟單元測試一樣，當我們發現不好測試的時候，有可能是設計的問題。

### 職責分離

在上面這個例子中，如果我們的程式架構有分層的話，我們大可以把排序工作交給更內層，更核心的類別去處理，讓 View 專心處理如何組成畫面即可。這樣一來我們就能簡單地用單元測試來測試排序，而不用動用到 Widget Test 了。

## 其他各種不同 Finder

其實還有一個十分強大的 Finder：byWidgetPredicate，這個方法可以傳入一個 Predicate 的 lambda，當 Finder 呼叫 evaluate 得到結果時，讓開發人員可以在測試中動態的決定 Finder 能找到什麼樣的 Widget。

```dart
find.byWidgetPredicate((widget) => widget is Text && widget.data == "Alex");
```

以上面這個例子來說，就會找回一個型別為 Text 且裡頭文字是 “Alex” 的 Widget。當 Finder 提供的大部分 API 都不好用時，我們可以考慮使用 byWidgetPredicate。

## 小結

Widget Tester 驗證結果主要是透過 Finder，有許多不同的 Finder 分別提供不一樣的功能，這些 Finder 甚至可以組合再一起使用，能應付各式各樣的情況。在寫 Widget Test 的過程中，熟悉 Finder 的用法幾乎是不可或缺的。

把排序工作從 Widget 身上抽離

在這裡我們無法直接

錯誤圖片

那我們要怎麼處理呢？

畫面上顯示朋友清單，上面有幾個排序方法，讓使用者用 名字排序，國家排序等等

用 Widget Test 側順序 

我們是否可以用單元測試順序

可以

但是會發現，我把本來放在 View 的操作邏輯寫在單元測試裡了

這方法是可以測試 Controller 裡面的邏輯是否正確

## 再次使用隔離框架戰術

那有沒有辦法讓我們隔離 Controller 進行測試呢？

其實也是有的，但是由於 Flutter 框架特性，為了做到這件事，我們大多時候必須在測試中，依靠依賴注入的套件協助

以 riverpod 來說，我們就得 override provider，同樣的使用 GetIt 或者 GetX 的觀眾，也能在測試準備工作中，透過這些套件注入假的 provider 或 controller

## 小結

相比於單元測試，Widget Test 的驗證方式比較複雜，不同的測試，可能需要的驗證方式也不同，學習起來難度比較高，需要靈活運用 FInder。隨著我們 Widget Test 越寫越熟練，我們

有時可能需要思考畫面上出現多個相同元件時，我們要怎麼驗證，有時又可能是 

廢案

相反的，除了 find子孫 之外，我們還有 find祖先 方法可以使用，顧名思義，這個方法可以協助我們定位 parent 中包含 xxx 文字的祖先。當然也不一定只能找文字的祖先，而是可以組合前一個段落的基本 find 方法，例如：find.byIcon，find.byKey …等，可以有非常多種變化，觀眾們也可以自己嘗試看看。

或expect 的第二個參數型態為 dynamic，類似於 Javascript 的動態型別，expect 根據第二個參數傳入不同類型的類別，很智慧的用不同的方式驗證結果。在 Widget Test 驗證時，主要使用，會才會去呼叫 _TextFinder 的。