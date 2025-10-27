# 用 Widget Test 測試 Routing

新增時間: June 7, 2023 10:30 PM
最後編輯時間: October 24, 2025 5:20 PM
id: f610eefa549646aab96181e0d298a492
類型: 輸出文章
🧩 領域: Flutter (https://www.notion.so/Flutter-aec5ea3a198f49e18989ab7f4c851169?pvs=21), 自動化測試 (https://www.notion.so/2968303f78f78006ae84e3befe61029f?pvs=21)

![_206dd02c-3b32-4243-95a6-b8a7669e5acc.jpeg](%E7%94%A8%20Widget%20Test%20%E6%B8%AC%E8%A9%A6%20Routing/_206dd02c-3b32-4243-95a6-b8a7669e5acc.jpeg)

在開發 Flutter 時，我們可以寫 Widget Test 確保功能在我們重構之後，還是保持正常運作。我們會針對許多不同的情境進行測試，其中一種情境是當使用者進行某些操作，或者當某些情況發生，把使用者導到其他頁面，今天就來分享如何使用 Widget Test 驗證 Routing。

## 舉個例子

假設我們有常見的清單頁面，其中列滿了各種狗狗品種，當我們點擊了某一個品種之後，App 會把使用者導向另一個頁面，並向隨機呈現一張該品種的圖片。在這個例子中，我們使用 [DogAPI](https://dog.ceo/dog-api/)，有興趣的觀眾也可以參考看看。

![Route 測試.jpg](%E7%94%A8%20Widget%20Test%20%E6%B8%AC%E8%A9%A6%20Routing/Route_%25E6%25B8%25AC%25E8%25A9%25A6.jpg)

這個需求並不複雜，經過一番操作之後，我們在相對應的 **ListTitle** 上加上 **GestureDetector** 並使用 **Navigator** 把使用者導到下一個頁面，也告訴下一個頁面要顯示哪種品種的狗狗，最後成功在畫面上隨機顯示一張該品種的狗狗圖片。

```dart
class BreedListPage extends StatelessWidget {
  
	...

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: breedList.length,
      itemBuilder: (context, index) {
        return GestureDetector(
          onTap: () => Navigator.of(context).pushNamed(
            "/dog_image",
            arguments: breedList[index],
          ),
          child: ListTile(
            title: Text(breedList[index]),
          ),
        );
      },
    );
  }
}
```

但是當我們完成功能之後，可能會思考，我們該如何進行測試呢？我們該如何功能正確，並且在未來也都持續保持正確呢？

## Arrange 與 Act

對測試熟悉的觀眾，可能很快就能完成 Arrange 與 Act 的部分，關於測試 3A 原則可以參考[這邊](https://dotblogs.com.tw/hatelove/2012/11/07/learning-tdd-in-30-days-day3-how-to-write-a-unit-test-code)。在下面測試中，我們使用 [mocktail](https://pub.dev/packages/mocktail) 套件準備 DogAPI 的回傳結果，顯示 **BreedListPage**，接著我們點擊其中一個品種，一切都輕鬆寫意。

```dart
testWidgets('should open dog image page when click breed tile', (tester) async {
	// Arrange
  MockClient mockClient = MockClient();
  when(() => mockClient.get(Uri.parse("https://dog.ceo/api/breeds/list/all"))).thenAnswer((_) async {
    return Response('{"message": {"affenpinscher": [], "african": [], "airedale": []}, "status": "success"}', 200);
  });

  await tester.pumpWidget(
    MaterialApp(
      home: BreedListPage(client: mockClient)
    ));
  await tester.pump();

	// Act
  await tester.tap(find.text("affenpinscher"));

  // How to assert routing?
  
});

class MockClient extends Mock implements Client {}
```

接下來的問題便是，我們如何驗證 Routing 是否成功呢？

## Mock NavigatorObserver

如果有使用過 [firebase_analytics](https://pub.dev/packages/firebase_analytics) 的觀眾，可能會知道可以使用套件中的 **FirebaseAnalyticsObserver** 協助我們追中使用 Routing 狀況，當 App 進行 Routing 時，會呼叫 [**NavigatorObserver.didPush](https://api.flutter.dev/flutter/widgets/NavigatorObserver/didPush.html)** 方法並透過參數告知當前 **Route** 與上一個 **Route**，此時 firebase_analytics 套件就有機會追蹤使用者的 Routing 行為。

同樣地，我們也可以 mock 一個測試用的 **MockNavigatorObserver**，並驗證 didPush 方法是否有被呼叫，來達到驗證 Routing 的效果，那就讓我們使用 MockRoutingObserver 來驗證一下上述例子吧。

在下面例子中，我們宣告了一個 **MockNavigatorObserver**，並把它傳給 **MaterialApp**，由此我們就能在測試中監聽 App Routing 的狀況。在 Assert 的地方中，我們使用驗證了 mockNavigatorObserver.didPush 是否有被呼叫，除此之外，我們還使用 captureAny() 來捕捉參數，驗證參數中的 **Route** 名稱是否符合預期。

```dart
testWidgets('should open dog image page when click breed tile', (tester) async {
	// Arrange
  ...

	MockNavigatorObserver mockNavigatorObserver = MockNavigatorObserver();
  await tester.pumpWidget(
    MaterialApp(
      home: BreedListPage(client: mockClient),
      navigatorObservers: [mockNavigatorObserver],
   ));
  await tester.pump();

	// Act
  await tester.tap(find.text("affenpinscher"));

  // Assert
  var result = verify(() => mockNavigatorObserver.didPush(captureAny(), any()));
  expect(result.captured[1].settings.name, "/dog_image");
});

class MockNavigatorObserver extends Mock implements NavigatorObserver {}
```

值得注意的是，在例子中我們使用了 captured[1] 來驗證，是因為在測試中，當我們在準備 BreedListPage 時，實際上也進行了一次 Routing，但這次 Routing 我們並不關心，我們關心的是第二次 Routing 結果，所以在上面例子中，我們驗證 captured[1] 的結果。

## 找不到 Routing 錯誤

當我們完成上面測試並運行後，會發現測試還是錯誤的，並在錯誤訊息中發現以下錯誤訊息。

```
Could not find a generator for route RouteSettings("/dog_image", affenpinscher) in the _WidgetsAppState.
Make sure your root app widget has provided a way to generate this route.
```

原因是我們在測試中沒有定義 /dog_image 這個 **Route**，所以當運行測試，程式走到 Navigator.of(context).pushNamed 時，就發生了錯誤。為了解決這個問題，我們只要在測試中給假的 **Route** 即可。

```dart
testWidgets('should open dog image page when click breed tile', (tester) async {
	// Arrange
  ...

  await tester.pumpWidget(
    MaterialApp(
      ...
			routes: {"/dog_image": (_) => const SizedBox()},
   ));
  await tester.pump();

	// Act
  ...

  // Assert
	...
});
```

當我們加上假的 Route 之後，再次運行測試，就能通過測試得到綠燈了。

## 除了驗證測試路徑之外

在上面測試中，我們雖然成功驗證了 Routing 是否符合預期，但是其實還有一件事我們沒有驗證到，那就是我們少驗證了參數，我們除了把使用者導到下一個頁面之外，也會告訴下一個頁面要顯示哪一個品種的狗。在我們完成上面的測試之後，我們想再額外驗證參數其實就相對容易，我們只要加上另外一個 expect 即可。

```dart
testWidgets('should open dog image page when click breed tile', (tester) async {
	// Arrange
  ...

	// Act
  ...

  // Assert
	var result = verify(() => mockNavigatorObserver.didPush(captureAny(), any()));
  expect(result.captured[1].settings.name, DogImagePage.routeName);
  expect(result.captured[1].settings.arguments, "affenpinscher");
});
```

## 自定義 RouteMatcher

當我們完成測試之後，除了重構一下程式碼之外，我們也必須重構一下測試，讓我們的測試保持簡單易懂，在驗證 Routing 的部分，我們可以自定義一個 RouteMatcher 來增加測試可讀性，讓我們不必每次都在測試中把 captured 挖出來一個一個檢查，那就讓我們來重構一下 Assert 的部分吧。

```dart
testWidgets('should open dog image page when click breed tile', (tester) async {
	// Arrange
  ...

	// Act
  ...

  // Assert
	verify(() => mockNavigatorObserver.didPush(
	  captureAny(
	    that: RouteMatcher(
	      routeName: "/dog_image",
	      arguments: "affenpinscher",
	    ),
	  ),
	  any(),
	));
});

class RouteMatcher extends Matcher {
  final String routeName;
  final dynamic arguments;

  RouteMatcher({required this.routeName, this.arguments});

  @override
  Description describe(Description description) {
    return description.add('routeName: $routeName, arguments: $arguments');
  }

  @override
  bool matches(item, Map matchState) {
    return item.settings.name == routeName &&
        item.settings.arguments == arguments;
  }
}
```

我們新增了一個 **RouteMatcher** 來協助比較 **Route** 是否符合預期，此後當我們閱讀 Routing 測試時，就能更直觀的在 Assert 中看到我們預期什麼路徑與參數，增加測試的可讀性，當然我們還可以利用**抽取方法**進一步的調整，讓測試真正變成容易閱讀的需求文件，像是下面程式碼那樣，這邊就不做過多贅述，~~關於這個問題，我們以後會做一集專門講解。~~

```dart
testWidgets('should open dog image page when click breed tile', (tester) async {
	// Arrange
  ...

	// Act
  ...

  // Assert
	routeShouldBe(routeName: "/dog_image", arguments: "affenpinscher");
});
```

## 一定得使用 NavigatorObserver 嗎？

除了使用 **NavigatorObserver** 來測試 Routing，其實也可以直接針對整個 App 測試，我們也就不用做假的 **Route** 與 **MockNavigatorObserver** 了，聽起來好像十分省事，對吧。讓我們簡單地改寫一下測試：

1. 準備兩個頁面所必須使用的資料：狗狗品種清單與隨機一張狗狗圖片
2. 顯示 **MainApp**，而不是 **BreedListPage**
3. 按下其中一個品種
4. 驗證 Image 所顯示的圖片是否符合預期。

```dart
testWidgets('should open dog image page when click breed tile', (tester) async {
  //Arrange
  when(() => mockClient.get(Uri.parse("https://dog.ceo/api/breeds/list/all"))).thenAnswer((_) async {
    return Response( '{"message": {"affenpinscher": [], "african": [], "airedale": []}, "status": "success"}', 200);
  });

  when(() => mockClient.get(Uri.parse("https://dog.ceo/api/breed/african/images/random"))).thenAnswer((_) async {
    return Response( '{"message": "https://images.dog.ceo/breeds/bulldog-boston/n02096585_355.jpg", "status": "success"}', 200);
  });

  await tester.pumpWidget(MainApp(client: mockClient));
  await tester.pump();

  // Act
  await tester.tap(find.text("african"));
  await tester.pumpAndSettle();

  // Assert
  expect(findNetworkImage(tester).url, "https://images.dog.ceo/breeds/bulldog-boston/n02096585_355.jpg");
});

NetworkImage findNetworkImage(WidgetTester tester) => tester.widget<Image>(find.byType(Image)).image as NetworkImage;
```

在上面例子中，測試看起來也更簡單俐落，也更貼近使用者的真實狀況，沒有 **MockNavigatorObserver** 好像看起來更好了。事實上，在這個例子中，也確實如此，使用 **MockNavigatorObserver** 反而增加了不必要的麻煩。

但是在實務上，有時並非如此，當我們的 App 功能越來越多，越來越複雜時，若測試的進入點是整個  App，但是我們卻想測試某個頁面的行為，可能就得做很多準備工作，最後才能進到我們真正想測試的地方，雖然測試很貼近使用者的真實狀況，但同時也變得很難寫，變得脆弱。

## 結論

無論選擇使用 **MockNavigatorObserver** 協助測試，或是直接測試整個 App，我們應該依照當下情況調整，但是不管如何，我們都有義務為功能撰寫測試 ，這是開發人員必要工作之一，測試可以維護產品品質，也增加我們重構時的信心，更可以用來描述產品行為，讓後人可以透過測試案例來了解產品行為，是一石三鳥的好投資。

P.S. 以上程式碼都只有片段，如果有興趣看更完整的 Demo 的觀眾，可以到[這邊](https://github.com/easylive1989/lovely_dog_app/tree/completed)。