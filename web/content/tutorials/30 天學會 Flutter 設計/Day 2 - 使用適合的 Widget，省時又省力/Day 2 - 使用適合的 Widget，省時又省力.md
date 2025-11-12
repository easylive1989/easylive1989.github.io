# Day 2 - 使用適合的 Widget，省時又省力

新增時間: July 28, 2022 02:51 PM
最後編輯時間: November 12, 2025 12:25 AM
id: 0fdd89a195a44fd5be9bcefe9036d520

![](Mc8kW4x9Q3aRR3RkP5Im_IMG_4417.jpg)

Flutter 是一個可以建構跨平台應用程式的框架，在開發的過程中，我們會透過組合各式各樣 Widget 來實現各式各樣的畫面。隨著需求越來越複雜，View 的程式碼也會需要組裝越多的層 Widget ，導致程式碼越變越長，從而影響了可讀性。

## 舉個例子

當我們今天從客戶那邊收到一個需求，要在 App 中顯示好友清單。Flutter 提供了許多基本 Widget，例如：Container、Row、Column …等，讓開發者透過組合這些 Widget 來完成自己想要的畫面。

![](img_1.png)

[https://dartpad.dev/?id=ce4cdb6143e009d67fad0629d4b5d358](https://dartpad.dev/?id=ce4cdb6143e009d67fad0629d4b5d358)

經過一頓操作之後，我們完成了我們的程式碼，通過了驗收測試，並交付給客戶。經過一個月之後，客戶又提出了另一個需求，要調整這個畫面的設計。此時我們翻開這一長串程式碼，一時間發現不知重何改起，此時我們可以深刻感受到程式碼發出壞味道：[Large Class](https://refactoring.guru/smells/large-class) 。

## 使用適合的 Widget

我們有許多方法可以解決 Large Class，一個最簡單的方法就是：搜尋是否存在適合的內建 Widget。Flutter 內建了許多 Widget，在開發的過程中，我們應該盡量這些內建 Widget 來完成我們的工作，讓我們來使用內建 Widget 來修改上面的例子。

![](img_2.png)

[https://dartpad.dev/?id=3710044cc15b9ec83fc135dcd5a08703](https://dartpad.dev/?id=3710044cc15b9ec83fc135dcd5a08703)

修改之後，可以發現程式碼短了非常多，，也可以透過 Widget 名稱，和其參數概略了解這個 Widget 大概是什麼。由此我們可以發現，使用內建 Widget 有一些好處：

1. 提升可讀性：內建的 Widget 名稱通常也與設計名稱相同
1. 提升可維護性：寫越少代碼，你維護會越輕鬆
如何知道 Flutter 有哪些內建 Widget 呢？大家可以到 [Widget catalog](https://docs.flutter.dev/development/ui/widgets) 或觀看 [Widget of the week](https://www.youtube.com/playlist?list=PLjxrf2q8roU23XGwz3Km7sQZFTdB996iG) 都能學習一些可能自己從沒用過的 Widget。

## 使用第三方套件

萬一今天很不幸的，想實現的功能 Flutter 並未提供，也可以先到 [pub.dev](http://pub.dev/) 找找。與其自己動手造輪子，或許直接使用套件是比較合理的選擇。相比於自己實現功能，直接使用第三方套件也能提升可讀性與可維護性，但是也同時帶來一個缺點：你的程式碼與套件產生了相依性。使用套件可能產生一些問題

1. 由於你的程式引用了套件，當第三方套件發生變化時，你也被迫做出改變，或者當你想升級新版而套件不支援時，也同樣帶來麻煩。
1. 套件中可能有許多你並不需要的東西，使得建置速度變慢，甚至最終應用程式變得臃腫。
使用套件之前，必須評估使用套件帶來的效益是否大過自己實現。如果不是太過複雜的功能，或許可以考慮自己實現。

## 結論

無論是使用 Flutter 內建的 Widget 或第三方套件，都能夠有效的提升程式碼的可維護性。當今天考慮使用第三方套件前，應該謹慎的評估並合理的使用，才能真的享受好處而不是上了賊船。然而，有些情況是 Flutter 提供的 Widget 並不符合設計要求，而第三方套件中也沒有符合需求的套件，所以我們得自己實作。在這種情況下，還是可以透過一些方式來讓程式碼更好維護，我們會在明天討論到這個主題

## 參考

- Large Class：[https://refactoring.guru/smells/large-class](https://refactoring.guru/smells/large-class)
- Widget catalog：[https://docs.flutter.dev/development/ui/widgets](https://docs.flutter.dev/development/ui/widgets)
- Widget of the week：[https://www.youtube.com/playlist?list=PLjxrf2q8roU23XGwz3Km7sQZFTdB996iG](https://www.youtube.com/playlist?list=PLjxrf2q8roU23XGwz3Km7sQZFTdB996iG)

