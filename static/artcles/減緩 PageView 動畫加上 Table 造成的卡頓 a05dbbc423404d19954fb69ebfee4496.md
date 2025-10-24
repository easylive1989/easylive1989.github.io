# 減緩 PageView 動畫加上 Table 造成的卡頓

新增時間: June 24, 2023 11:24 PM
最後編輯時間: October 24, 2025 5:20 PM
id: a05dbbc423404d19954fb69ebfee4496
類型: 輸出文章
🧩 領域: Flutter (https://www.notion.so/Flutter-aec5ea3a198f49e18989ab7f4c851169?pvs=21)

![mateus-campos-felipe-ebRHyE2u3X4-unsplash.jpg](%E6%B8%9B%E7%B7%A9%20PageView%20%E5%8B%95%E7%95%AB%E5%8A%A0%E4%B8%8A%20Table%20%E9%80%A0%E6%88%90%E7%9A%84%E5%8D%A1%E9%A0%93/mateus-campos-felipe-ebRHyE2u3X4-unsplash.jpg)

最近我們新增了一個顯示球員詳細資訊的頁面，當我們完成第一版程式碼，開始調整細節時，我們發現了畫面滑動似乎不太順暢。

![改善前_AdobeExpress.gif](%E6%B8%9B%E7%B7%A9%20PageView%20%E5%8B%95%E7%95%AB%E5%8A%A0%E4%B8%8A%20Table%20%E9%80%A0%E6%88%90%E7%9A%84%E5%8D%A1%E9%A0%93/%25E6%2594%25B9%25E5%2596%2584%25E5%2589%258D_AdobeExpress.gif)

每個球員訊息彈跳視窗是靜態，外層使用了 PageView 加上一些的特效，使得畫面在滑動時會頻繁的 setState，造成了整個彈跳視窗卡頓，使用者體驗不佳，就像遊戲效能不好一樣會掉幀，嚴重一點可能會讓人不舒服。今天就來分享如何快速有效的解決這個問題吧。

# 釐清問題

首先，想要有效的解決問題，釐清問題是第一步。為了要了解我們畫面卡頓的問題根源，我們使用 Flutter 提供的 DevTools 並在實體手機上運行 Profile 模式，Profile 模式是讓 App 運行效能接近 Release 模式同時又能搜集運行資訊的一種模式。當我們執行程式並開起 DevTools 之後，可以觀察到 App 運行時，每一個 Frame 效能到底如何。

### Dev tools

在  Dev Tools 面板中，可以發現在大多數 Frame 中，UI phase 與 Raster phase 都花了很多時間，這通常表示問題可能有很多個，但是我們今天先研究 UI phase 花過久時間的問題吧。

![Screen Shot 2023-07-03 at 1.23.37 PM.png](%E6%B8%9B%E7%B7%A9%20PageView%20%E5%8B%95%E7%95%AB%E5%8A%A0%E4%B8%8A%20Table%20%E9%80%A0%E6%88%90%E7%9A%84%E5%8D%A1%E9%A0%93/Screen_Shot_2023-07-03_at_1.23.37_PM.png)

在面板中清楚看到了 Build 和 Layout 畫面的操作各花了多久時間，我們可以初步了解問題可能發生在哪邊，但是只有這些資訊，顯然不夠我們解決問題。

### 啟用 Track Widget Builds

為了更深入了解問題出在哪邊，我們可以在 Dev Tools 的右上角打開 Enhance Tracing，並且勾選 Track Widget Builds，這個功能可以提供更詳細的時間，提供每一個 Widget 在每一個 Frame 中所花費的時間。

![Screen Shot 2023-07-03 at 1.36.51 PM.png](%E6%B8%9B%E7%B7%A9%20PageView%20%E5%8B%95%E7%95%AB%E5%8A%A0%E4%B8%8A%20Table%20%E9%80%A0%E6%88%90%E7%9A%84%E5%8D%A1%E9%A0%93/Screen_Shot_2023-07-03_at_1.36.51_PM.png)

### 觀察 Widget Build 火焰圖

當我們啟用 Track Widget Build 之後，我們再繼續操作一下手機，讓手機繼續執行幾個 Frame，我們就能這些新產生的報告找到 Timeline Events，在 Timeline Events 中， DevTools 顯示在這個 Frame 中 Build Widget 所花費的時間，能更直觀地看到時間到底花在哪個 Widget 上了。

![Screen Shot 2023-07-03 at 1.24.21 PM.png](%E6%B8%9B%E7%B7%A9%20PageView%20%E5%8B%95%E7%95%AB%E5%8A%A0%E4%B8%8A%20Table%20%E9%80%A0%E6%88%90%E7%9A%84%E5%8D%A1%E9%A0%93/Screen_Shot_2023-07-03_at_1.24.21_PM.png)

### 分析問題

從火焰圖中我們可以得知，PlayerInfoGameLogView 花費的時間佔了很大一部份比例，而且每一個 Frame 都是這種狀況。這表示畫面滑動的時候，每一個 Frame 都在重新建立這個 Widget。雖然我們滑動需要頻繁的 setState，畫面其實是不變的，數值並不會在滑動過程中有變化，應該要可以使用重複使用之前已經 Build 好的 Widget，但是顯然 Flutter 不這麼認為，而是辛苦的每一個 Frame 都Rebuild 新的 Widget。

# 解決問題

為了更準確解決 PlayerInfoGameLogView 被頻繁建立的問題，也為了讓讀者們可以一起同樂，我們先在 Dartpad 準備有問題的範例程式 [[連結](https://dartpad.dev/?id=9bf6ba724ce6b3c62c9c490905b2fbbf)]，有興趣的讀者也可以試試看。讓我們看一下程式碼，在範例程式中，當我們滑動 PageView 時，PageView 頻繁的呼叫 itemBuilder 來更新畫面，讓 PageView 中的每一個 Item 可以隨著滑動改變大小，但是這麼做也使得 GameLogView 頻繁的被 Rebuild，即便每次傳進去的 gameLogs 是一模一樣的。

```dart
class MyApp extends StatelessWidget {
  const MyApp({super.key, required this.players});

  final List<Player> players;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: PlayerPageView(
        itemCount: players.length,
        itemBuilder: (BuildContext context, int index) {
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            alignment: Alignment.center,
            child: GameLogView(gameLogs: players[index].gameLogs),
          );
        },
      ),
    );
  }
}
```

讓我們看一下這段範例程式碼的效能分析，與正式程式碼的效能差不多，在 UI phase 階段所花的時間都偏高。

![Screen Shot 2023-07-07 at 1.46.59 PM.png](%E6%B8%9B%E7%B7%A9%20PageView%20%E5%8B%95%E7%95%AB%E5%8A%A0%E4%B8%8A%20Table%20%E9%80%A0%E6%88%90%E7%9A%84%E5%8D%A1%E9%A0%93/Screen_Shot_2023-07-07_at_1.46.59_PM.png)

### 只在資料變化時 Rebuild

最終，我希望 Flutter 不要總是 Rebuild GameLogView，而達到這個目標，我們可以把 gameLogs 放在 Provider 中，然後需要使用 gameLogs 的地方呼叫 context.watch 去存取並監聽 gameLogs，這樣一來就能讓 Widget 不需要一層一層傳遞 gameLogs，最外層的 GameLogView 也就可以加上 const 修飾詞，讓 Flutter 知道這是一個固定的 Widget，避免 Flutter 總是 Rebuild 它。

```dart
class MyApp extends StatelessWidget {
  const MyApp({super.key, required this.players});

  final List<Player> players;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: PlayerPageView(
        itemCount: players.length,
        itemBuilder: (BuildContext context, int index) {
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            alignment: Alignment.center,
            child: Provider<List<GameLog>>.value(
              value: players[index].gameLogs,
              child: const GameLogView(),
            ),
          );
        },
      ),
    );
  }
}

class _GameLogTable extends StatelessWidget {
  const _GameLogTable();

  @override
  Widget build(BuildContext context) {
    var gameLogs = context.watch<List<GameLog>>();
    return Table(
      ...
    );
  }
}
```

當我們調整好程式碼之後，PageView 執行 setState 之後，GameLog 就不會 Rebuild，而是會重複使用已經建好的 Widget，有興趣的觀眾也可以在 GameLogView 的 build 方法印 log 觀察看看。最後讓我們看一下問題解決之後的範例程式碼的效能分析，在少數幾個 Frame 中，UI phase 花的時間是超時的，剩下大部分時間都是在標準以內。

![Screen Shot 2023-07-07 at 1.44.26 PM.png](%E6%B8%9B%E7%B7%A9%20PageView%20%E5%8B%95%E7%95%AB%E5%8A%A0%E4%B8%8A%20Table%20%E9%80%A0%E6%88%90%E7%9A%84%E5%8D%A1%E9%A0%93/Screen_Shot_2023-07-07_at_1.44.26_PM.png)

如果實際上運行解決後的範例程式之後 [[連結](https://dartpad.dev/?id=fdc0e92365fade89d5253647a4710b2d)]，可以發現滑動的過程中比較順了，但還是有一些時刻會感受到卡頓。

### 尚未解決的卡頓

當我們使用 Provider 提升效能之後，我們發現第一次 Build  GameLogView 的時候還是會超時，使得下一個 GameLog 顯示時，畫面會出現明顯卡頓。此時我們暫時沒有比較好的辦法可以解決問題，因為 Table 目前沒有提供 builder 的方法，當渲染比較大的 Table 時，所有欄位都會在第一時間被建立，無論他有沒有出現在畫面上，使得 UI phase 的時間還是會比較長，也就是我們上面效能分析所顯示的狀況。

### 應用在產品程式碼中

當我們把這個做法放回產品程式碼中，並再次檢測 App 效能，可以發現超時的 UI phase 大幅減少，更多的是超時的 Raster phase，這也表示我們方法有效這個畫面的效能。

![調整後.png](%E6%B8%9B%E7%B7%A9%20PageView%20%E5%8B%95%E7%95%AB%E5%8A%A0%E4%B8%8A%20Table%20%E9%80%A0%E6%88%90%E7%9A%84%E5%8D%A1%E9%A0%93/%25E8%25AA%25BF%25E6%2595%25B4%25E5%25BE%258C.png)

# 結論

過早優化是萬惡之源，當我們發現效能問題時，透過釐清與分析問題，找到並解決瓶頸，在能花最小的力氣獲得最大的增益。如果我們再開發的時候為了使用 const 而寫了很多不必要的程式碼，除了浪費時間之外，也降低程式碼的可讀性，獲得的增益可能微乎其微。