# Day 12 - 用 Nested Navigation 處理耦合的頁面

note: 讓頁面可重複使用 也增加可讀性
id: 12
tag: 設計

隨著功能越來越多，App 的頁面也會越來越多，我們常常就會引入路由管理設計。在 Flutter 中，我們會在 MaterialApp 裡面定義整個 App 的路由，透過 Navigator 使用 push 和 pop 來決定當前頁面。有時候我們會發現，有些流程需要複數的頁面組合再一起，才能完成一個完整的使用者行為。

## 舉個例子

假設我們有一個傳輸檔案的需求，如下圖所示，在這個需求中，我們需要讓使用者選擇裝置與檔案，最後傳輸。

![it_img_13_1.png](Day%2012%20-%20%E7%94%A8%20Nested%20Navigation%20%E8%99%95%E7%90%86%E8%80%A6%E5%90%88%E7%9A%84%E9%A0%81%E9%9D%A2/it_img_13_1.png)

在這個例子中，我們可以發現一些問題：由於頁面的切換是一層一層的 push 疊上去，當流程結束時，也就只能一層一層的 pop 回來。而在需求中，我們需要把傳輸結果顯示在一開始的畫面上，所以在 pop 的過程中，我們也需要把結果夾帶回來。

![it_img_13_2.png](Day%2012%20-%20%E7%94%A8%20Nested%20Navigation%20%E8%99%95%E7%90%86%E8%80%A6%E5%90%88%E7%9A%84%E9%A0%81%E9%9D%A2/it_img_13_2.png)

[https://dartpad.dev/?id=d7bfd62a06a0d9ab1d1a74ab154503ef](https://dartpad.dev/?id=d7bfd62a06a0d9ab1d1a74ab154503ef)

## 耦合的頁面

我們從程式碼中可以發現，Search Devices 和 Select Device 頁面中，除了實現自身頁面的功能之外，還需要幫忙傳遞結果。

![it_img_13_3.png](Day%2012%20-%20%E7%94%A8%20Nested%20Navigation%20%E8%99%95%E7%90%86%E8%80%A6%E5%90%88%E7%9A%84%E9%A0%81%E9%9D%A2/it_img_13_3.png)

![it_img_13_4.png](Day%2012%20-%20%E7%94%A8%20Nested%20Navigation%20%E8%99%95%E7%90%86%E8%80%A6%E5%90%88%E7%9A%84%E9%A0%81%E9%9D%A2/it_img_13_4.png)

最後在 HomePage 取得 isTransferOk 結果，並把 Transfer success 顯示在畫面上。

![it_img_13_5.png](Day%2012%20-%20%E7%94%A8%20Nested%20Navigation%20%E8%99%95%E7%90%86%E8%80%A6%E5%90%88%E7%9A%84%E9%A0%81%E9%9D%A2/it_img_13_5.png)

這會造成什麼問題呢？Search Devices 和 Select Device 頁面在 pushNamed 時，必須得知道下一個頁面想回傳什麼結果。假設今天我們想顯示更多傳輸結果，成功、沒有權限、無法連線 …等更多結果時，我們必須連帶一起修改。

也因為這個原因，導致 Search Devices 和 Select Device 頁面難以被重複只用，因為他與某個特定的傳輸結果耦合，我們很難其他流程中重複使用這個頁面。

## 使用 Nested Navigation

為了解決這個問題，我們建立了一個 TransferFileFlow 的頁面，並使用 [Nested Navigation](https://docs.flutter.dev/cookbook/effects/nested-nav) 來管理 Search Devices、Select Device 和 Select File 頁面。在執行流程的過程中，每個頁面會專注於完成自己的工作，並把工作結果傳回給 TransferFileFlow，由 TransferFileFlow 來決定下一步是什麼。最終，TransferFileFlow 會統合所有資訊，完成傳輸，並把結果告訴 Home 頁面。

![it_img_13_6.png](Day%2012%20-%20%E7%94%A8%20Nested%20Navigation%20%E8%99%95%E7%90%86%E8%80%A6%E5%90%88%E7%9A%84%E9%A0%81%E9%9D%A2/it_img_13_6.png)

透過 Nested Navigation 的作法，TransferFileFlow 把相對應的 callback 傳入 Search Devices、Select Device 和 Select File 頁面，當每個子頁面完成工作時，則呼叫 callback 通知 TransferFileFlow，也就是“搜尋裝置結果”、“使用者選擇的裝置” 與 “使用者選擇的檔案”。最後 TransferFileFlow 則是負責組合這些資訊，完成傳輸工作。

## 分離控制流程的職責

Nested Navigation 的作法有個好處，它把控制流程的職責從 Search Devices、Select Device 和 Select File 頁面中拆出來了，並放在 TransferFileFlow 中，原本的子頁面就只要專注在如何完成當前頁面的工作即可。這也使得這些子頁面可以在其他流程中被重複使用。

![it_img_13_7.png](Day%2012%20-%20%E7%94%A8%20Nested%20Navigation%20%E8%99%95%E7%90%86%E8%80%A6%E5%90%88%E7%9A%84%E9%A0%81%E9%9D%A2/it_img_13_7.png)

假設今天我們有一個刪除檔案的流程，我們就能重複使用 Select File 頁面，只要給他相對應的 callback，當頁面完成工作時，就會通知結果。正因為 Select File 頁面不參與任何頁面轉換或流程控制，也就讓我們有機會在任何流程中重複使用。

## 結論

Nested Navigation 十分適合使用在這種固定流程的工作上，如果頁面沒辦法單獨提供功能，而是需要多個頁面共同組合出一個功能的話，就很適合使用 Nested Navigation 這種做法。當一個頁面能提供完整的功能，例如顯示比賽資訊，顯示裝置詳細資訊，或者是更新使用暱稱這種單一頁面就可以完成的，或許就不太需要使用 Nested Navigation。

## 參考

- 耦合：[https://zh.wikipedia.org/zh-tw/耦合性_(計算機科學)](https://zh.wikipedia.org/zh-tw/%E8%80%A6%E5%90%88%E6%80%A7_(%E8%A8%88%E7%AE%97%E6%A9%9F%E7%A7%91%E5%AD%B8))
- Nested Navigation：[https://docs.flutter.dev/cookbook/effects/nested-nav](https://docs.flutter.dev/cookbook/effects/nested-nav)

Flutter 在最頂層的 MaterialApp 中統一定義整個 app 的路由管理。當我們把所有頁面的路由管理都放在最頂層時，就會讓它變得很長，不容易維護。或許應該適時思考，是否某些頁面的路由不應該被管理在最頂層。今天就來分享工作上遇到的一個情境，以及它存在什麼問題，而我們又是如何解決的。

，讓頁面只知道自己需要的訊息，並且輸出他工作後的結果，至於如何使用就讓使用方來決定。

我們使用上面的例子進行修改，先創建一個 TransferFileFlow，並在其中使用 Navigator Widget，給定一個 GlobalKey 放進 Navigator 中，我們需要使用 GlobalKey 來進行 Nested Navigator 的頁面切換。