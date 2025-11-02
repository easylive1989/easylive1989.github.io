# Day 6 - 用 NotificationListener 處理按鈕事件

id: 6
tag: 設計

在昨天的文章中，我們討論了兩種實現按鈕行為的方法。大多數的情況下，我們可以直接透過傳遞 onTap 參數解決。但是軟體會隨著需求不斷地演進，在昨天的例子中，假設需求多了一個按鈕，此時我們需要把新按鈕的事件處理一層一層傳遞至 GameActionSection 中，使得我們不得不修改每一層 Widget。

![it_img_6_1.png](Day%206%20-%20%E7%94%A8%20NotificationListener%20%E8%99%95%E7%90%86%E6%8C%89%E9%88%95%E4%BA%8B%E4%BB%B6/it_img_6_1.png)

[https://dartpad.dev/?id=428479322a5666614b1e5def43ea4e78](https://dartpad.dev/?id=428479322a5666614b1e5def43ea4e78)

![it_img_6_1_1.png](Day%206%20-%20%E7%94%A8%20NotificationListener%20%E8%99%95%E7%90%86%E6%8C%89%E9%88%95%E4%BA%8B%E4%BB%B6/it_img_6_1_1.png)

以上面這個例子來說，除了原本的 onPurchaseButtonTap 之外，我們修改了大部分 Widget，為了新增 onCheckButtonTap。如果將來預計在 GameActionSection 上面新增越來越多的操作，那我們就不得不頻繁的修改不相關的 Widget。

## 使用 BuildContext 解決嗎？

若我們嘗試使用昨天主題中的另外一個作法：使用 BuildContext 呼叫方法來。在這個作法中，我們可以在 Widget 中新增操作，並且保證只修改相關的 Widget，而缺點在昨天的文章中討論過了，就不再次贅述。今天我們來聊聊另外一個作法，可以保有 BuildContext 解法的好處，並且有效解決 BuildContext 作法耦合過高的問題。

## NotificationListener

Flutter 提供的眾多 Widget，有一個 Widget 叫做 [NotificationListener](https://api.flutter.dev/flutter/widgets/NotificationListener-class.html)，他可以被用來接收從子 Widget 派送出來的 Notification，然後執行使用者定義的操作。最直接的例子就是，當我們想知道使用者是否正在滑動畫面上的 ListView 的時候，就可以用 NotificationListener 來接收 ScrollNotification。

![it_img_6_2.png](Day%206%20-%20%E7%94%A8%20NotificationListener%20%E8%99%95%E7%90%86%E6%8C%89%E9%88%95%E4%BA%8B%E4%BB%B6/it_img_6_2.png)

[https://dartpad.dev/?id=ea83de65e9a49cad81afc93426a37f4e](https://dartpad.dev/?id=ea83de65e9a49cad81afc93426a37f4e)

## 客製 Notification

利用 NotificationListener 和自定義的 GameNotification，我們就能在 GameButton 中派送 PurchaseGameNotification 或 CheckGameNotification，然後 GameListScreen 使用 NotificationListener 去監聽 GameNotification，當收到 Notification 時，執行 buyGame 或 checkGame。

![it_img_6_3.png](Day%206%20-%20%E7%94%A8%20NotificationListener%20%E8%99%95%E7%90%86%E6%8C%89%E9%88%95%E4%BA%8B%E4%BB%B6/it_img_6_3.png)

[https://dartpad.dev/?id=ea83de65e9a49cad81afc93426a37f4e](https://dartpad.dev/?id=ea83de65e9a49cad81afc93426a37f4e)

![it_img_6_4.png](Day%206%20-%20%E7%94%A8%20NotificationListener%20%E8%99%95%E7%90%86%E6%8C%89%E9%88%95%E4%BA%8B%E4%BB%B6/it_img_6_4.png)

透過 Notification 來處理按鈕觸發的事件，我們就能避免層層傳遞按鈕事件。讓使用者按下按鈕時，按鈕送出相對應 Notification，而上層的 Widget 可以自行決定是否監聽 Notification。以上面的例子來說，GameButtonSection 能在任何地方重複使用，而無需擔心是否有人接收 Notification，使用起來也比較靈活。

## 結論

使用 Notification 來處理按鈕事件，可以避免按鈕 Widget 與執行方法的 Widget 耦合，保持設計彈性，當需求是新增操作時，只要定義新的 Notification 並在適當的地方送出與接收，就能最小幅度的修改的程式碼。但是相反的，程式碼相比於傳遞 onTap 的作法，就沒有這麼直接易懂。選擇哪個作法，需要根據當下的需求情境，選擇使用合適的作法。

## 參考

- NotificationListener: [https://api.flutter.dev/flutter/widgets/NotificationListener-class.html](https://api.flutter.dev/flutter/widgets/NotificationListener-class.html)