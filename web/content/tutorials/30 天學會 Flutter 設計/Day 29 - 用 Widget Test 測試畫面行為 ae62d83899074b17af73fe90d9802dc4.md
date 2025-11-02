# Day 29 - 用 Widget Test 測試畫面行為

id: 29

Flutter 是一個開發客端框架，我們在開發過程中寫的大多數的程式碼，都是關於 UI。有如果我們只針對 UI 之外的程式碼做單元測試，有些行爲會變得難以測試到，或者是會使得測試變得異常麻煩且不必要。此時，我們就可以使用 Widget Test 來協助我們進行與 UI 相關的測試。

## Counter 範例

如果大家使用 Flutter 建立新專案，就會獲得一份 Counter App，而其中也包含了基本的 Widget Test。

![it_img_29_1.png](Day%2029%20-%20%E7%94%A8%20Widget%20Test%20%E6%B8%AC%E8%A9%A6%E7%95%AB%E9%9D%A2%E8%A1%8C%E7%82%BA/it_img_29_1.png)

[https://dartpad.dev/?id=020c618ae0aeb6d080e370bd4382a46c](https://dartpad.dev/?id=020c618ae0aeb6d080e370bd4382a46c)

在 test 資料夾中，我們可以找到測試 counter 功能的 Widget Test。與單元測試相似，我們也可以用 3A 原則來寫 Widget Test：準備待測 Widget、與 Widget 進行互動、驗證畫面狀態是否符合期。

![it_img_29_2.png](Day%2029%20-%20%E7%94%A8%20Widget%20Test%20%E6%B8%AC%E8%A9%A6%E7%95%AB%E9%9D%A2%E8%A1%8C%E7%82%BA/it_img_29_2.png)

[https://dartpad.dev/?id=c28a6f6170e7a5a2dba2ba0025843463](https://dartpad.dev/?id=c28a6f6170e7a5a2dba2ba0025843463)

在 Widget Test 中，與單元測試不同的是，我們使用 testWidgets 方法來建立測試，在測試中，會頻繁使用 WidgetTester 協助我們 Flutter 框架互動。比如我們會用 Widget.pumpWidget(…) 來建立想要測試的 Widget，然後使用 WidgetTester.tap(…) 點擊畫面中的某個元素。最後我們使用 expect 來驗證畫面是否有我們預期的元素，以 counter 來說，expect(find.text(’1’), findsOneWidget) 表示我們預期畫面上能找到 1 這個文字。

## 像單元測試一樣 Spy

在單元測試中，我們常常使用 Spy 來驗證類別是否正確與其他類別互動，同樣的，我們也希望能測試 Widget 是否與其他類別正確的互動，假設我們稍微修改一下 counter 的範例，讓 counter 也紀錄一份在 local storage 中，讓下次打開 App 能從上一次的狀態開始計數。

![it_img_29_3.png](Day%2029%20-%20%E7%94%A8%20Widget%20Test%20%E6%B8%AC%E8%A9%A6%E7%95%AB%E9%9D%A2%E8%A1%8C%E7%82%BA/it_img_29_3.png)

[https://dartpad.dev/?id=167328c440e09b6c1f6ae60c7464acc9](https://dartpad.dev/?id=167328c440e09b6c1f6ae60c7464acc9)

此時，我們當除了驗證畫面是否正確之外，我們也希望驗證 Widget 是否有正確的呼叫 LocalStorageRepository。此時我們可使用單元測試的技巧，建立一個 MockLocalStorageRepository，並在測試中利用 Provider 注入這個假的 Repository。

![it_img_29_4.png](Day%2029%20-%20%E7%94%A8%20Widget%20Test%20%E6%B8%AC%E8%A9%A6%E7%95%AB%E9%9D%A2%E8%A1%8C%E7%82%BA/it_img_29_4.png)

[https://dartpad.dev/?id=4122918819fc339b3a387f1721bbd859](https://dartpad.dev/?id=4122918819fc339b3a387f1721bbd859)

最後我們就能利用 verfiy 檢查，當使用者按下 + 按鈕後，畫面除了能找到 1 的文字之外，也有正確的呼叫了 LocalStorageRepository 的 setCounter 方法。

## Routing 測試

Routing 是一種 UI 中常見的行為，當使用者按了某個按鈕，或完成某個操作，都有可能需要使用 Routing 將使用者導向其他頁面。有些時候，一些重要流程會包含許多頁面的切換，此時測試頁面是否正確的轉換了，就是一件重要的事情。讓我們稍微修改一下 counter 的例子，讓今天 + 按鈕不是直接把數字 + 1，而是跳到其他頁面，讓使用者輸入數字，並回頭把數字加到 counter 上。

![it_img_29_5.png](Day%2029%20-%20%E7%94%A8%20Widget%20Test%20%E6%B8%AC%E8%A9%A6%E7%95%AB%E9%9D%A2%E8%A1%8C%E7%82%BA/it_img_29_5.png)

[https://dartpad.dev/?id=90e9763769ae9d14b25816f6adba7ded](https://dartpad.dev/?id=90e9763769ae9d14b25816f6adba7ded)

使用 Widget Test，我們一樣也能測試使用者切換畫面的操作，按下 + 按鈕，跳到 AddPage 並輸入數字，最後回傳結果並加到 countter 上。

![it_img_29_6.png](Day%2029%20-%20%E7%94%A8%20Widget%20Test%20%E6%B8%AC%E8%A9%A6%E7%95%AB%E9%9D%A2%E8%A1%8C%E7%82%BA/it_img_29_6.png)

[https://dartpad.dev/?id=11acccdbf195f0608b53af547e40442e](https://dartpad.dev/?id=11acccdbf195f0608b53af547e40442e)

有些時候，如果 Widget Test 涉及多個頁面，會帶來一些麻煩。想像一下，在上面的例子中，HomePage 依賴某個 Repository，而 AddPage 依賴於另一個 Repository。此時，如果我們想順利進行測試，我們必須同時 Mock 兩個 Repository 並在測試中注入。當 Widget Test 涉及的頁面越多，我們的測試就越難寫。

![it_img_29_7.png](Day%2029%20-%20%E7%94%A8%20Widget%20Test%20%E6%B8%AC%E8%A9%A6%E7%95%AB%E9%9D%A2%E8%A1%8C%E7%82%BA/it_img_29_7.png)

而此時我們可以發現，或許我們測試的範圍太大了。在這邊，我們能把原本的測試拆小，拆成兩個測試案例：

1. 當按下 MyHomePage 的 + 按鈕時，是否能正確 route 到 AddPage
2. 當從 AddPage 回來且帶有數字時，counter 數字是否正確的增加

## 做一個假的 RouteObserver

在開發中，Flutter 提供 RouteObserver 類別讓我們實作，讓我們可以在 App 運行中觀察 Route 的變化，我們在[這篇文章](https://ithelp.ithome.com.tw/articles/10305875)中也有提到，在此不作過多贅述。在 Widget Test 中，我們也能利用這個類別，來驗證是否有正確的 Route。

![it_img_29_8.png](Day%2029%20-%20%E7%94%A8%20Widget%20Test%20%E6%B8%AC%E8%A9%A6%E7%95%AB%E9%9D%A2%E8%A1%8C%E7%82%BA/it_img_29_8.png)

[https://dartpad.dev/?id=cb00828fac11ba0a7787caa0cbc9d269](https://dartpad.dev/?id=cb00828fac11ba0a7787caa0cbc9d269)

在上面的測試中，我們把 observer 放進測試中，在測試執行的最後，我們驗證了 observer 是否有正確的觀測到 addPageRoute 被 push。

## 直接使用 Navigator 做假回傳

在第二個測試中，由於我們再也不會切換到真的 AddPage 了，所以我們理當也不會得到一個合法的回傳。為此，我們可以在測試中操作 Navigator，直接使用 Navigator 把頁面切回上一頁，並且帶入我們想帶入的假資料。

![it_img_29_9.png](Day%2029%20-%20%E7%94%A8%20Widget%20Test%20%E6%B8%AC%E8%A9%A6%E7%95%AB%E9%9D%A2%E8%A1%8C%E7%82%BA/it_img_29_9.png)

[https://dartpad.dev/?id=cb00828fac11ba0a7787caa0cbc9d269](https://dartpad.dev/?id=cb00828fac11ba0a7787caa0cbc9d269)

最後我們就能驗證結果，驗證畫面有正常的加上我們做假的數字。在上面兩個測試案例中，我們可以獨立的測試把 MyHomePage 的行為，而不引入其他頁面的實作，使得這個測試能更加堅固一點，不會因為 AddPage 的改變了實作，使得 MyHomePage 的測試也要修改。如果昨天的文章提到的，測試也需要重構，由於這兩個的測試把細節都暴露在測試中，使得測試並不容易閱讀，所以當完成測試通過之後，我們也必須重構這些測試，增加其可讀性，在這邊就不特別在展示了。

## 結論

Widget Test 能讓我們從使用者的操作的角度來進行測試。由於 Widget Test 並非真正的把 Flutter 框架跑起來，而是只是模擬畫面的執行，所以執行速度不慢，且不像真正的 UI Test 那般不穩定。結合單元測試的技巧，我們能測試 UI 是否有正確的狀態，也能測試 UI 是否正確的與其他元件互動。使用單元測試加上 Widget Test，才能讓我們的 Flutter 程式有完整的測試保護。

## 題外話

值得注意的是 flutter 渲染畫面的概念與遊戲相似，都是每一秒鐘都會重新渲染好幾的 Frame。但在測試中，我們必須使用 WidgetTester.pump() 驅動重新渲染一個 Frame。當我們使用動畫時，可能要好幾個 Frame 才能動畫跑完，此時就需要使用 WidgetTester.pumpAndSettle()，讓 Widget 持續畫到沒有新的 Frame 要更新為止。