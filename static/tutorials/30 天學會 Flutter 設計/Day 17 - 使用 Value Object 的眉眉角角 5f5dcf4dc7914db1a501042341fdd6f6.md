# Day 17 - 使用 Value Object 的眉眉角角

id: 17

Dart 是強型別語言，我們會宣告各式各樣的物件，來幫助我們完成功能。所有物件最頂層雖然是 [Object](https://api.flutter.dev/flutter/dart-core/Object-class.html)，但實際上使用時，卻能分出許多不同的物件，有 Widget、有 Controller，有些負責打 API，有些負責處理流程。在這之中，我們常常使用到其中之一種的就是 Value Object，讓不同物件之間可以傳遞資料，一個經典的情境就是，當我們打 Web API 取回 json 資料後，我們會把它轉成一個相對應的 Value Object，以便畫面顯示或者使用者操作功能。

```dart
final response = await dio.get("my/api");
return User.fromJson(response.data);
```

在上面的例子中，response.data 是個 dynamic 物件，我們會把 dynamic 物件轉成 User 物件。

## 使用強型別

大多數時候，我們用在外部 API 取回資料物件時，會把它轉成強型別，能讓我們享受幾個好處：

1. 讓我們更清楚每個物件中每個成員的型別，幫助我們正確使用物件成員，也讓我們能在編譯期間更快的發現問題，不必等到實際執行才發現錯誤。
2. 我們也可以在 Value Object 建立一些方法，讓職責更加內聚。

![it_img_18_0_1.png](Day%2017%20-%20%E4%BD%BF%E7%94%A8%20Value%20Object%20%E7%9A%84%E7%9C%89%E7%9C%89%E8%A7%92%E8%A7%92/it_img_18_0_1.png)

## 實現 fromJson

雖然 Dart 有反射功能，但是 Flutter 由於因為一些原因，在 Flutter 禁用反射。所以當我們取回 http reposone 時，我們必須自己針對每個物件實現 fromJson。

![it_img_18_0.png](Day%2017%20-%20%E4%BD%BF%E7%94%A8%20Value%20Object%20%E7%9A%84%E7%9C%89%E7%9C%89%E8%A7%92%E8%A7%92/it_img_18_0.png)

[https://dartpad.dev/?id=71f5603a74f415f800339d3af816a458](https://dartpad.dev/?id=71f5603a74f415f800339d3af816a458)

當我們的程式需要常常與不同 API 互動時，我們會產生大量的 fromJson 程式碼，每個物件中的 fromJson 的細節不同，但整體的行為都是把 dynamic 轉成特定類別。Flutter 雖然沒有反射，但是我們還是有一些辦法來讓我們不用每次都寫一次 fromJson。

## 產生 Json 序列化程式碼

Google 在 [pub.dev](http://pub.dev) 中提供了 json_serializable 套件，讓我們可以自動產生 Json 序列化的程式碼。當我們在程式中引用 json_serializable 與 build_runner 之後，然後在 User 類別上加上 @JsonSerializable ，最後執行 build_runner。

![it_Img_18_1.png](Day%2017%20-%20%E4%BD%BF%E7%94%A8%20Value%20Object%20%E7%9A%84%E7%9C%89%E7%9C%89%E8%A7%92%E8%A7%92/it_Img_18_1.png)

[https://dartpad.dev/?id=8556bc9249cbfd8c31d291170411409d](https://dartpad.dev/?id=8556bc9249cbfd8c31d291170411409d)

```bash
flutter pub run build_runner
```

最後我們可以在檔案中看到自動產生的 user.g.dart 程式碼。

![it_img_18_2.png](Day%2017%20-%20%E4%BD%BF%E7%94%A8%20Value%20Object%20%E7%9A%84%E7%9C%89%E7%9C%89%E8%A7%92%E8%A7%92/it_img_18_2.png)

[https://dartpad.dev/?id=1b68fbc60c6f0e4494632cc8f36db818](https://dartpad.dev/?id=1b68fbc60c6f0e4494632cc8f36db818)

## 使用 freezed

除此了使用 json_serializable 之外，我們也可以選擇使用 [freezed](https://pub.dev/packages/freezed)。freezed 除了能幫我們自動產生 json 序列化的方法之外，也能幫我們產生 Value Object 也常常需要複寫的方法，例如用來比較兩個物件是否相同的 == 運算子，或者是複製並修改的 copyWith 方法。

![it_img_18_3.png](Day%2017%20-%20%E4%BD%BF%E7%94%A8%20Value%20Object%20%E7%9A%84%E7%9C%89%E7%9C%89%E8%A7%92%E8%A7%92/it_img_18_3.png)

[https://dartpad.dev/?id=0265a639151c710f3b3f69836dd9ce77](https://dartpad.dev/?id=0265a639151c710f3b3f69836dd9ce77)

[https://dartpad.dev/?id=32f3dbcc5819c8387b54672562ef0da3](https://dartpad.dev/?id=32f3dbcc5819c8387b54672562ef0da3)

## 避免包山包海的物件

有些時候，我們可能會在兩個頁面使用相同的 API，拿回相同的物件，但用不同的資料來處理每個頁面的畫面或流程。在下面的例子中，UserInfoScreen 與 VipProductListScreen 都會呼叫 User API 取回 User 物件，兩個頁面都分別只使用部分 User 的成員。

![it_img_18_4.png](Day%2017%20-%20%E4%BD%BF%E7%94%A8%20Value%20Object%20%E7%9A%84%E7%9C%89%E7%9C%89%E8%A7%92%E8%A7%92/it_img_18_4.png)

![it_img_18_5.png](Day%2017%20-%20%E4%BD%BF%E7%94%A8%20Value%20Object%20%E7%9A%84%E7%9C%89%E7%9C%89%E8%A7%92%E8%A7%92/it_img_18_5.png)

[https://dartpad.dev/?id=e4e5838f7c188cb545af329f618f8973](https://dartpad.dev/?id=e4e5838f7c188cb545af329f618f8973)

在這上面的例子中，假設今天我們建立了一個新的 API，讓我們可以直接呼叫取得 User 的 isVip，此時當我們想要替換原本 API 時，需要改動的範圍就比較大，因為 VipProductListScreen 直接引用了 User。假設今天 VipProductListScreen 只從 RemoteApi 拿回來只有 isVip，而不是整個 User 物件，那我們就能更容易抽換實作。

![it_img_18_6.png](Day%2017%20-%20%E4%BD%BF%E7%94%A8%20Value%20Object%20%E7%9A%84%E7%9C%89%E7%9C%89%E8%A7%92%E8%A7%92/it_img_18_6.png)

[https://dartpad.dev/?id=8f96dfd25748069648e6aba58bb12fe8](https://dartpad.dev/?id=8f96dfd25748069648e6aba58bb12fe8)

雖然 Value Object 並不繼承任何介面，但讓所有地方都直接使用 User，也是不太符合介面隔離原則的概念。

> 客戶不應被迫使用對其而言無用的方法或功能。
> 

## 結論

在開發的過程中，我們常常會設計各式各樣的 Value Object，如何善用工具節省開發時間，是一項直得研究的課題。雖然 Value Object 很容易使用，但是開發時也要思考一下，是否當前的 Value Object 是最適合的設計，持續的檢視與改善，讓程式永遠維持在一個容易維護的狀態。

## 參考

- JSON and serialization：[https://docs.flutter.dev/development/data-and-backend/json](https://docs.flutter.dev/development/data-and-backend/json)
- json_serializable：[https://pub.dev/packages/json_serializable](https://pub.dev/packages/json_serializable)
- 介面隔離：[https://zh.wikipedia.org/zh-tw/接口隔离原则](https://zh.wikipedia.org/zh-tw/%E6%8E%A5%E5%8F%A3%E9%9A%94%E7%A6%BB%E5%8E%9F%E5%88%99)
- Flutter 反射的相關討論：[https://github.com/flutter/flutter/issues/1150](https://github.com/flutter/flutter/issues/1150)