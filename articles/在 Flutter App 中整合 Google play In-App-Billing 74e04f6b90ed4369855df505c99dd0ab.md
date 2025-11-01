# 在 Flutter App 中整合 Google play In-App-Billing

新增時間: November 15, 2021 10:23 AM
最後編輯時間: October 24, 2025 4:48 PM
id: 74e04f6b90ed4369855df505c99dd0ab
類型: 輸出文章
🧩 領域: Flutter (https://www.notion.so/Flutter-aec5ea3a198f49e18989ab7f4c851169?pvs=21)

想在 App 上賺錢有兩種方式，一種是讓 App 本身是付費下載，另一種則是應用程式內購買。如果選擇應用程式內購買的話，在 iOS 上需要整合 Apple In App Purchase，而在 Google Play 上的話，則是需要整合 Google In App Billing，以下簡稱 Google IAB，本篇主要紀錄一下整合 Google IAB 的過程。

# 後台設定

在開始整合 Google IAB 之前，需要先準備一個 Google 開發者帳號。當準備好之後，就能使用該開發者帳號登入 Google Play Console ，進入到**應用程式內產品**的的選單中，點選建立產品，然後就可以新增可購買項目。設定完成後並啟用產品，表示這個產品已經上架販售。

![截圖 2021-11-18 上午12.01.53.png](%E5%9C%A8%20Flutter%20App%20%E4%B8%AD%E6%95%B4%E5%90%88%20Google%20play%20In-App-Billing/%E6%88%AA%E5%9C%96_2021-11-18_%E4%B8%8A%E5%8D%8812.01.53.png)

當購買項目設定完成後，重新整理該頁面就會看到剛剛設定好的購買項目的列表。其中的產品 ID 是表示該購買項目的唯一 ID，稍後也會在程式碼使用中，用以獲取購買項目的詳細資訊。

![截圖 2021-11-18 上午12.05.52.png](%E5%9C%A8%20Flutter%20App%20%E4%B8%AD%E6%95%B4%E5%90%88%20Google%20play%20In-App-Billing/%E6%88%AA%E5%9C%96_2021-11-18_%E4%B8%8A%E5%8D%8812.05.52.png)

值得注意的是，在設定購買項目之前，需要先上傳包含內購權限的 apk 到 Google Play 上。沒有完成這一步，在設定購買項目的頁面出會發現下面這個訊息，Google Play 提醒你需要上傳有內購權限的 apk。若是 App 還沒有準備要上架，可以先上傳 apk 到內部測試群組。

![截圖 2021-11-17 上午8.47.18.png](%E5%9C%A8%20Flutter%20App%20%E4%B8%AD%E6%95%B4%E5%90%88%20Google%20play%20In-App-Billing/%E6%88%AA%E5%9C%96_2021-11-17_%E4%B8%8A%E5%8D%888.47.18.png)

除了自己手動到 Google Play 的後台去設定產品，開發人員也可以透過 [Google In App Products API](https://developers.google.com/android-publisher/api-ref/rest/v3/inappproducts) 對產品列表做新增修改刪除，方便開發者客製化自己的後台產品上架流程。

# 整合 Google Play In App Billing

### 安裝套件

在 pub.dev 上，與應用程式內購買的相關的套件有不少，我們選擇使用 Flutter 官方提供的 in_app_purchase。這個套件除了可以用來整合 Google IAB，也同時包含了 Apple IAP。

[**in_app_purchase | Flutter Package***A storefront-independent API for purchases in Flutter apps. This plugin supports in-app purchases ( IAP) through an…*pub.dev](https://pub.dev/packages/in_app_purchase)

in_app_purchase 在 Google IAB 功能實作是基於 Android BillingClient。所以在整合的時候，可以適時參考 [整合 Android BillingClient](https://developer.android.com/google/play/billing/integrate) 的文章，有助於更了解 Google IAB 的核心流程。

### 啟用 PendingPurchase

在 2019 年的 Google I/O 上，Google 宣布 Google Play 將提供 Pending Transactions 功能，讓使用者擁有更多樣的付款方式。在整合 Google IAB 時，我們需要在 main 方法中加上 enablePendingPurchase 的程式碼，讓 App 支援 Pending Transactions 功能。

```dart
void main() {
  if (defaultTargetPlatform == TargetPlatform.android) {
    InAppPurchaseAndroidPlatformAddition.enablePendingPurchases();
  }
  runApp(MyApp());
}
```

### 確保與 Google Play 正常連線

App 透過這個 API 來確保與 Google Play 正常連線。當手機上沒有 Google Play 或者 Google Play 尚未登入之類的情況，這個 API 回傳的就會是 false。而回傳 false 時，App 也就無法正常購買產品，甚至連產品列表都無法獲得。

```dart
await InAppPurchase.instance.isAvailable();
```

### 獲取產品列表

透過這個 API，App 可以獲取產品的詳細資訊，像是價格與貨幣資訊 ...等。其中需要把產品 ID 列表做為參數傳給這個 API，這個產品 ID 列表需要與 Google Play Console 中設定的一致。取得的回傳值 ProductDetails 也會是稍後購買產品 API 的參數。

```dart
var productIds = ["prodcut_1", "product_2"];
ProductDetailsResponse response =
    await InAppPurchase.instance.queryProductDetails(productIds);
if (response.notFoundIDs.isNotEmpty) {
  // Handle the error.
}
List<ProductDetails> products = response.productDetails;
```

### 購買產品

in_app_purchase 套件提供兩個 API 讓開發者實現購買功能： buyConsumable 和 buyNonConsumable。如何選擇要使用哪個方法，需要開發人員根據產品販售策略來決定。以下是一些比較簡單的原則提供大家參考。

- 當產品會重複販售給使用者多次，使用 buyConsumable。
- 當產品只能販售給每個使用一次，使用 buyNonConsumable。

```dart
final PurchaseParam purchaseParam = PurchaseParam(productDetails: productDetails);
if (_isConsumable(productDetails)) {
  InAppPurchase.instance.buyConsumable(purchaseParam: purchaseParam);
} else {
	InAppPurchase.instance.buyNonConsumable(purchaseParam: purchaseParam);
}
```

除此之外，這兩個方法在實作購買流程上會有些許不同，如果是使用 buyNonConsumable 購買產品後，購買成功後需要呼叫 completePurchase，讓 Google Play 知道此次購買已經完成，而 buyConsumable 則不強制。

```dart
await InAppPurchase.instance.completePurchase(purchaseDetails);
```

若是使用 buyNonConsumable 後未呼叫 completePurchase，則會造成 Google Play 認為此筆購買未完成，將導致該筆付款在 3 天後退還給使用者。

### 等待完成購買流程

當呼叫了購買 API 之後，就需要透過 purchaseStream 來監聽購買的狀態，無論是使用者取消購買、購買成功、付款失敗 ...等，都會透過 purchaseStream 來通知 App 購買的狀態。

```dart
_subscription = InAppPurchase.instance.purchaseStream.listen((purchaseDetailsList) {
  _listenToPurchaseUpdated(purchaseDetailsList);
}
```

而我們能從 PurchaseDetail 中的 status 確認購買狀態並決定 App 相應的行為，例如：處於 PurchaseStatus.pending 時要顯示等待畫面、處於 PurchaseStatus.purchased 時顯示購買成功 ...等，開發者需要依照實際需求實作。

```dart
void _listenToPurchaseUpdated(List<PurchaseDetails> purchaseDetailsList) {
  purchaseDetailsList.forEach((PurchaseDetails purchaseDetails) async {
    if (purchaseDetails.status == PurchaseStatus.pending) {
      // handle pending
    } 

    if (purchaseDetails.status == PurchaseStatus.error) {
      // handle error
    } 

    if(purchaseDetails.status == PurchaseStatus.purchased || 
       purchaseDetails.status == PurchaseStatus.restored) {
      // handle purchased
    }
  });
}
```

Google 在整合 BillingClient 的文章中有提到，當購買成功時，建議把購買成功時的 Purchase Token 送到後端，後端能夠透過 [Google Purchase API](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products/get) 驗證訂單是否合法，在合法的狀況才把產品交付給使用者。

```dart
if (purchaseDetails.status == PurchaseStatus.purchased || 
    purchaseDetails.status == PurchaseStatus.restored) {
  bool valid = await _verifyPurchase(purchaseDetails);
  if (valid) {
    _deliverProduct(purchaseDetails);
  } else {
    _handleInvalidPurchase(purchaseDetails);
  }
}
```

以上講解的是從 App 端接收訂單資訊並處理，而 Google Play 也提供了另一種從後端處理訂單資訊方式。Google Play 可以透過 Google Pub / Sub 傳送訂單資訊給後端，讓後端接收訂單資訊並驗證訂單，App 則可以省去呼叫後端驗證的工作，更詳細的實作可以參考[這邊](https://developer.android.com/google/play/billing/getting-ready#configure-rtdn)。

# 測試購買流程

當寫完程式碼之後，我們理所當然地需要在測試機裝 Debug 版本測試一下。為了讓 Google Play 允許 Debug 版本也可以測試 Google IAB，我們必須在 Google Play 後台設定**授權測試**，在設定中的帳號使用測試信用卡付費，能夠避免實際付費。透過這個方法，我們就不必頻繁的上傳 App 到 Google Play 上測試，能夠增加開發速度。

![截圖 2021-11-17 上午10.00.43.png](%E5%9C%A8%20Flutter%20App%20%E4%B8%AD%E6%95%B4%E5%90%88%20Google%20play%20In-App-Billing/%E6%88%AA%E5%9C%96_2021-11-17_%E4%B8%8A%E5%8D%8810.00.43.png)

當授權測試帳號設定完成後，需要先到測試機上的 Google Play 登入該帳號。測試付款流程時，就會看到付款選項中出現 Test Card 的選單。點開之後有更多付款選項，可以用來測試不同的情境，像是 Slow test card 的選項就可以用來測試 Pending 的情況。

![Screenshot_20211117_101352-2.png](%E5%9C%A8%20Flutter%20App%20%E4%B8%AD%E6%95%B4%E5%90%88%20Google%20play%20In-App-Billing/Screenshot_20211117_101352-2.png)

![Screenshot_20211117_101442-2.png](%E5%9C%A8%20Flutter%20App%20%E4%B8%AD%E6%95%B4%E5%90%88%20Google%20play%20In-App-Billing/Screenshot_20211117_101442-2.png)

最後要提醒的是，如果是使用模擬器來測試，請確保模擬器上有 Google Play 且登入想要用來測試的帳號，這樣才能夠正常測試。否則在確保與 Google Play 連線的步驟會不成功，導致後續流程無法進行。開發人員可以在 AVD Manager 中確認模擬器是否含有 Google Play。

# 結論

本篇紀錄了在 Flutter 上整合 Google IAB 的過程，從商店設定、簡化的流程處理到如何測試付費。其中在流程處理的部分，實際應用上可能會有許多場景需要特別處理，例如：不同支付方式的 Pending 處理、退款的後續處理流程、例外狀況的處理 ...等，需要開發者根據實際情況中思考如何處理。

# 參考

- 整合 Android BillingClient：[https://developer.android.com/google/play/billing/integrate](https://developer.android.com/google/play/billing/integrate)
- 測試 Google IAB：[https://developer.android.com/google/play/billing/test](https://developer.android.com/google/play/billing/test)