# Day 19 測試 Routing 回傳值

昨天談到了如何測試頁面導轉，當使用者點了按鈕，我們就能驗證是否跳轉到新的頁面。而今天要繼續聊聊下半段，當使用者在新頁面完成任務後，帶著回傳值跳轉回上一個頁面，並且讓上一個頁面知道任務完成狀況，進而顯示任務完成畫面。

## 調整聊天室功能

在昨天的例子中，當使用者建完聊天室後，畫面會跳轉回上一頁面後，就只是單純地在畫面上顯示新的聊天室列表。讓我們修改一下需求，當使用者建完聊天室後，除了更新聊天室列表之外，還要多顯示一個 SnackBar 訊息，讓使用者知道聊天室建立成功。

![Discuss - 建立聊天室成功訊息.jpg](Day%2019%20%E6%B8%AC%E8%A9%A6%20Routing%20%E5%9B%9E%E5%82%B3%E5%80%BC/Discuss_-_%25E5%25BB%25BA%25E7%25AB%258B%25E8%2581%258A%25E5%25A4%25A9%25E5%25AE%25A4%25E6%2588%2590%25E5%258A%259F%25E8%25A8%258A%25E6%2581%25AF.jpg)

為了完成這個需求，我們可以在聊天室建立成功後，透過 Navigator.pop 回傳建立成功的聊天室名稱。

```dart
Navigator.of(context).pop(_nameController.text);
```

接收到結果的**聊天室列表頁面**就顯示成功訊息，這邊就只展示部分程式碼，完整的可以參考[這邊](https://dartpad.dev/?id=ca861fc4fbaece90bc6f5f9dc6853a2b)。

```dart
var createdChatRoomName = await Navigator.of(context).pushNamed("/create");
if (mounted && createdChatRoomName != null) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("$createdChatRoomName 建立成功")));
}
```

## 直接測試

最容易方式就是延續昨天第一個版本的測試，在**聊天室列表頁面**中，實際打開**建立聊天室頁面**，然後輸入名稱，按下建立，最終驗證訊息有出現在畫面上。

```dart
@GenerateNiceMocks([MockSpec<ChatRoomRepository>(), MockSpec<FriendRepository>()])
main() {
  testWidgets("show chat room created message", (tester) async {
    await tester.pumpWidget(MultiProvider(
      providers: [
        Provider<ChatRoomRepository>(create: (context) => MockChatRoomRepository()),
        Provider<FriendRepository>(create: (context) => MockFriendRepository()),
      ],
      child: const MyApp(),
    ));

    await tester.tap(find.byIcon(Icons.add));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.byWidgetPredicate((widget) => widget is TextField && widget.decoration?.labelText == "聊天室名稱"),
      "地球暖化討論群",
    );

    await tester.tap(find.text("建立"));
    await tester.pumpAndSettle();

    expect(find.text("地球暖化討論群 建立成功"), findsOneWidget);

  });
}
```

與昨天類似的問題，我們有沒有其他辦法測試呢？其實也是有的，讓我們繼續看看不同做法吧。

## 使用 Navigator 設定回傳

在昨天 Route 到**建立聊天室頁面**的測試中，我們使用 MockNavigatorObserver 確認 Route 事件是不是真的有發生，以此來確立按鈕行為否正確，避免真的打開**建立聊天室頁面**。回到今天的測試中，我們想測試成功訊息，但是我沒有真正的打開**建立聊天室頁面**，怎麼讓**聊天室列表頁面**的邏輯繼續往下呢？

```dart
// 如何讓 pushNamed 返回，使得程式可以繼續往下
var createdChatRoomName = await Navigator.of(context).pushNamed("/create");
```

答案其實很簡單，**建立聊天室頁面**怎麼做，在測試中就怎麼做，也就是我們在測試中呼叫 Navigator 的 pop 方法

```dart
Navigator.of(context).pop("地球暖化討論群");
```

## 用 GlobalKey 取得 Navigator

接下來要問的問題就是，那我要怎麼在測試中拿到 Navigator 呢？Navigator 也是一個 Widget，在正式程式碼中，當我們使用 MaterialApp 這個 Widget 時，裡面就已經包含一個 Navigator 了。而在 MaterialApp 的參數中，有一個 navigatorKey 的參數，讓使用端可以自己設定 Navigator 的 Key。當我們設定了 GlobalKey 給 Navigator 我們就能從 GlobalKey 中取得 Navigator ( 準確來說是 NavigatorState )。

```dart
var navigatorKey = GlobalKey<NavigatorState>();

navigatorKey.currentState?.pop();
```

所以我們調整一下測試，新增一個 GlobalKey 並傳給 MaterialApp。

```dart
@GenerateNiceMocks([MockSpec<ChatRoomRepository>()])
main() {
  testWidgets("open create chat room page", (tester) async {
    var navigatorKey = GlobalKey<NavigatorState>();

    await tester.pumpWidget(
      Provider<ChatRoomRepository>(
        create: (context) => MockChatRoomRepository(),
        child: MaterialApp(
          home: const ChatRoomListPage(),
          navigatorKey: navigatorKey,
          onGenerateRoute: dummyRouteGenerator,
        ),
      ),
    );
  });
}
```

接著我們就能用這個 GlobalKey 取回 Navigator，然後就可以呼叫 pop 方法並設定回傳值，最後就執行測試，得到綠燈。

```dart
@GenerateNiceMocks([MockSpec<ChatRoomRepository>()])
main() {
  testWidgets("open create chat room page", (tester) async {
    var navigatorKey = GlobalKey<NavigatorState>();

    await tester.pumpWidget(
      Provider<ChatRoomRepository>(
        create: (context) => MockChatRoomRepository(),
        child: MaterialApp(
          home: const ChatRoomListPage(),
          navigatorKey: navigatorKey,
          onGenerateRoute: dummyRouteGenerator,
        ),
      ),
    );

    await tester.tap(find.byIcon(Icons.add));
    await tester.pumpAndSettle();

    navigatorKey.currentState?.pop("地球暖化討論群");
    await tester.pumpAndSettle();

    expect(find.text("地球暖化討論群 建立成功"), findsOneWidget);
  });
}
```

如果我們比較使用 Navigator 的測試與一開始的測試會發現，好像用 Navigator 的測試也沒有簡單很多。昨天例子也是類似的情況，我們直接測試兩個頁面的協作，好像也比使用 MockNavigatorObserver 要來得簡單，那到底寫得這麼麻煩有什麼好處呢？

## 整合型測試 vs 隔離型測試

回到最一開始的測試目的，我們想測試都是**聊天室列表頁面**的行為。

1. 點擊 ㊉ 按鈕，Route 到**建立聊天室頁面**
2. 當從**建立聊天室頁面**回來時，要顯示成功訊息

這當中其實我們一點都不關心**建立聊天室頁面**，無論是**建立聊天室頁面**的 UI 長什麼樣子，有沒有建立按鈕，有幾個輸入框，聊天室名稱有沒有規則限制 …等等。在第一版的測試中，測試會同時知道**聊天室列表頁面**與**建立聊天室頁面**，為了方便，我們暫時稱呼其為**整合型測試**。而在使用 MockObserver 與 Navigator 的測試中，測試不需要真的知道**建立聊天室頁面**，只需要知道 Route 路徑即可，讓我們暫時稱呼其為**隔離型測試。**

### 頁面發生變化時

在整合型的測試裡，測試過程中真的打開**建立聊天室頁面**，我們必須準備頁面需要的資料，也就是 FriendRepository。假設今天**建立聊天室頁面**的行為變得複雜，多了其他依賴時，測試也必須跟著調整，當聊天室名稱有一定規則，不能重複，或者建立過程中還需要去開其他頁面協作時，整合型的測試就會變得複雜，因為真實的建立流程就是這麼複雜。無論**聊天室列表頁面**或**建立聊天室頁面**的行為發生變化，這個測試都很有可能要跟著調整。

相反的，在使用 Navigator/NavigatorObserver 版本的測試中，**聊天室列表頁面**的測試複雜度不會受到**建立聊天室頁面**的行為影響，無論未來**建立聊天室頁面**的行為如何變化，只要他們之間輸入輸出沒發生改變，測試也不會需要調整。

就像單元測試一樣，我們之所以使用測試替身，就是希望我們可以單純的測試該類別的行為。如果我們在單元測試中，SUT 的依賴都跟正式程式碼用的一樣的話，需要測試的行為可能就會倍數性的成長，在聊天室的測試也是一樣的道理。

### 如何選擇策略

其實我們倒也不是一開始就得在兩種做法中選擇一條走到底，而是可以混合著使用，當今天頁面需求不那麼複雜時，先使用整合型版本的測試。當需求開始變得複雜的時候，我們再來調整成隔離型的測試也不遲。只要團隊有在兩種測試策略中切換得能力，需要的時候再來調整即可。

## 小結

今天介紹了 Route 測試的頁面返回情境，跟頁面跳轉一樣，我們展示了兩種不同的做法，整合型的作法與隔離型的作法。隔離型的 Route 測試雖然寫起來比較複雜，但是不容易受到其他頁面的需求異動而跟著異動，缺點就是寫法上比較麻煩。反之，整合型的作法寫起來比較快，但是未來如果碰上其他頁面的需求異動，測試就也得跟著調整，如何選擇最好還是根據當下情境決定。

## 重複測試

那重複測試會造成什麼問題？我們測的地方越多，不是對程式越有保護嗎？答案肯定不是，測試跟財富一樣，你不理財，才不理你，測試是需要我們花時間去維護的，所以如果測試能力相同的兩組測試，數量較少的肯定比較好，畢竟數量少，我們維護的成本也比較低

[測試維護成本圖？]

## 避免重複測試同樣行為？

主要

```dart

```

實際測試下來，可能會發現我們需要準備聊天室列表頁面的資料，也需要準備建立聊天室頁面的資料，就需要作假比較多東西，讓測試變得比較難寫。還有另外一個問題就是，當我們在製作建立聊天室功能時，也肯定為這個流程加上了測試，與上述的測試就重複測試了建立聊天室這一段。

當我們修改建立聊天室功能時，除了修改它自己本身的測試，也不得不修改這個測試，雖然我們這個測試的主要目的並非測試建立聊天室，但是在測試過程中，無可避免地在測了一次。

那我們有沒有辦法避免呢？答案肯定是有的，接下來就讓我們來看看怎麼調整吧