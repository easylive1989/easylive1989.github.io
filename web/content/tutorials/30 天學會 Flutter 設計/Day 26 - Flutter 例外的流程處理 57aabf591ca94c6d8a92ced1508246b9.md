# Day 26 - Flutter 例外的流程處理

note: 絕不姑息錯誤 讓錯誤要媽通知使用者 要媽通知開發者
id: 26
tag: 設計

開發任何程式時，如何正確的錯誤處理，不只讓讓開發者能更好除錯，也讓程式可以更加穩定。今天就來聊聊如何在 Flutter 中處理例外。

## Exception vs Error

在 Flutter 中，有兩種例外類別，一種是 Exception，而另一種是 Error，類似於 Java 的 Checked Excpetion 與 Runtime Exception，但不同的是，編譯器並不會幫忙檢查。其中 Exception 通常用於，我們知道如何處理並且應該正確處理的錯誤，而另外一種則是不預期的錯誤，例如：OutOfMemoryError、StackOverflowError… 等等，相關的討論可以看[這邊](https://groups.google.com/a/dartlang.org/g/misc/c/lx9CXiV3o30/m/s5l_PwpHUGAJ)。今天就先讓我們針對第一種錯誤來進行討論。

## 非正常流程

在開發的過程中，我們常常會處理一些發生錯誤的流程，例如：購買商品時，而後端因為商品數量不足而回報錯誤。由於可能同時有許多使用者都在購買相同商品，所以比較低的機率使得使用者按下購買按鈕前，商品就已經賣光。在這種情況中，我們可以預期這種錯誤的發生，我們可能也會準備合適的錯誤畫面，讓使用了解狀況。

![it_img_26_1.png](Day%2026%20-%20Flutter%20%E4%BE%8B%E5%A4%96%E7%9A%84%E6%B5%81%E7%A8%8B%E8%99%95%E7%90%86/it_img_26_1.png)

當 QuantityInsuffientException 的例外從 buy 方法拋出時，呼叫 buy 方法的程式碼，也會準好一段例外處理的流程。當例外處理攔截到 Exception 時，就會顯示 Product is sold out 的訊息給使用者，讓使用者知道商品已經賣光。

![it_img_26_2.png](Day%2026%20-%20Flutter%20%E4%BE%8B%E5%A4%96%E7%9A%84%E6%B5%81%E7%A8%8B%E8%99%95%E7%90%86/it_img_26_2.png)

[https://dartpad.dev/?id=d7f905f548a1035b2c0da359ead719a2](https://dartpad.dev/?id=d7f905f548a1035b2c0da359ead719a2)

## 另一種狀況 timeout

在上面的例子中，我們把只處理的 Status code 為 400 的狀況，但有些時候，有可能是使用者正坐在高鐵上，網路不穩定而導致打 API 失敗，如果我們馬上就顯示錯誤畫面給使用者，使用者體驗可能就沒有這好。

![it_img_26_3.png](Day%2026%20-%20Flutter%20%E4%BE%8B%E5%A4%96%E7%9A%84%E6%B5%81%E7%A8%8B%E8%99%95%E7%90%86/it_img_26_3.png)

[https://dartpad.dev/?id=57e8c1e5adbc38ac2c171765962e3383](https://dartpad.dev/?id=57e8c1e5adbc38ac2c171765962e3383)

為了解決這種問題，我們常使用的方法就是 Retry。也就是當失敗時，等一段時間，再試一次。運用這種方式，我們能降低一點網路波動的影響，讓我們的應用程式使用起來更穩定。

![it_img_26_4.png](Day%2026%20-%20Flutter%20%E4%BE%8B%E5%A4%96%E7%9A%84%E6%B5%81%E7%A8%8B%E8%99%95%E7%90%86/it_img_26_4.png)

[https://dartpad.dev/?id=332910b1ae8c3cdda240685134275ba8](https://dartpad.dev/?id=332910b1ae8c3cdda240685134275ba8)

那是否要在每個例外處理的地方都要 Retry 呢？這個答案就不一定了，需要聰明的讀者們依照實際需求來決定，到底我的應用程式需要多穩定，也可以選擇某些功能使用 Retry，某些功能則是直接讓使用者知道發生錯誤。當使用 Retry 的地方多了，我們也可以選擇使用[套件](https://pub.dev/packages/retry)來幫我們 Retry，就不需要自己辛苦的到處實作 Retry 邏輯。

![it_img_26_5.png](Day%2026%20-%20Flutter%20%E4%BE%8B%E5%A4%96%E7%9A%84%E6%B5%81%E7%A8%8B%E8%99%95%E7%90%86/it_img_26_5.png)

[https://dartpad.dev/?id=ac01f65887e1a57f4b0bac802d846c5a](https://dartpad.dev/?id=ac01f65887e1a57f4b0bac802d846c5a)

## 從錯誤中回歸正確狀態

有些時候，我們在 try 中可能會處理很多事情，當其中一行 statement 發生錯誤時，流程就斷在某一處，使得整個應用程式的狀態不正確。例如：使用第三方身份驗證服務時，我們通常也會在後端建立其他與使用者相關的資料。

![it_img_26_6.png](Day%2026%20-%20Flutter%20%E4%BE%8B%E5%A4%96%E7%9A%84%E6%B5%81%E7%A8%8B%E8%99%95%E7%90%86/it_img_26_6.png)

[https://dartpad.dev/?id=0e5842ff0f62f2670514058d062c722b](https://dartpad.dev/?id=0e5842ff0f62f2670514058d062c722b)

假設今天發生了宜種情況：當 firebaseLogin 成功，但是 createuserIfNeed 卻失敗。當這個狀況發生時，由於 firebaseLogin 已經完成，應用程式此時的狀態已經是登入成功，創建使用者失敗，如果使用者繼續使用登入狀態去操作應用程式，就會造成許多不預期的狀況。
為此，除了回報錯誤給使用者之外，我們也應該把登入狀態從應用程式中清除，讓應用程式回歸未登入狀態。

![it_img_26_7.png](Day%2026%20-%20Flutter%20%E4%BE%8B%E5%A4%96%E7%9A%84%E6%B5%81%E7%A8%8B%E8%99%95%E7%90%86/it_img_26_7.png)

[https://dartpad.dev/?id=7ac1a4906b6624c9dde3af109d3ab06a](https://dartpad.dev/?id=7ac1a4906b6624c9dde3af109d3ab06a)

例外處理除了要把讓使用者知道現在發生什麼狀況之外，還必須讓應用程式維持正確的狀態。這樣一來，當我們處理完例外時，應用程式才能正常地繼續使用。否則，每當使用者發生錯誤，就要手動重啟應用程式，只要再發生個幾次，使用者就會感到煩躁，再也不會回來了。

## 結論

當程式執行時，發生錯誤是無可避免的。如何識別錯誤，並正確的處理錯誤，才能讓程式不受錯誤影響，維持正確狀態，提升使用者體驗。今天討論的是如何處理可預期的錯誤，在這種錯誤中，我們通常知道如何做像對應的處置，但有些時候，程式還是會發生一些非預期的狀況，有可能是因為程式寫錯，有可能是因為裝置記憶題不足，明天我們會繼續討論這個問題。

## 參考

- Exception vs Error：[https://groups.google.com/a/dartlang.org/g/misc/c/lx9CXiV3o30/m/s5l_PwpHUGAJ](https://groups.google.com/a/dartlang.org/g/misc/c/lx9CXiV3o30/m/s5l_PwpHUGAJ)
- retry：[https://pub.dev/packages/retry](https://pub.dev/packages/retry)
- Firebase 身份驗證：[https://firebase.google.com/docs/auth](https://firebase.google.com/docs/auth)