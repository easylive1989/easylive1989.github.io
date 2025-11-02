# Day 14 - 使用 Extension 偽裝成外部類別的方法

id: 14

開發時，我們時常使用框架或套件的 API 幫助我們完成需求。使用外部 API 時，我們常常會根據需求，使用外部物件的狀態或方法。

![it_img_14_0.png](Day%2014%20-%20%E4%BD%BF%E7%94%A8%20Extension%20%E5%81%BD%E8%A3%9D%E6%88%90%E5%A4%96%E9%83%A8%E9%A1%9E%E5%88%A5%E7%9A%84%E6%96%B9%E6%B3%95/it_img_14_0.png)

[https://dartpad.dev/?id=2df0ffe731895985bac15b96774feac8](https://dartpad.dev/?id=2df0ffe731895985bac15b96774feac8)

由於我們並沒有外部物件的修改權，所以當使用的行為變得複雜或者常常用到時，我們會把這些行為封裝在 Utils 或 Helper。

![it_img_14_1.png](Day%2014%20-%20%E4%BD%BF%E7%94%A8%20Extension%20%E5%81%BD%E8%A3%9D%E6%88%90%E5%A4%96%E9%83%A8%E9%A1%9E%E5%88%A5%E7%9A%84%E6%96%B9%E6%B3%95/it_img_14_1.png)

[https://dartpad.dev/?id=d210965ff52ec9aba9282d7764b03d4e](https://dartpad.dev/?id=d210965ff52ec9aba9282d7764b03d4e)

## 迪米特法則

在第一段程式碼中，我們為了取得螢幕的寬高，使用了 MediaQuery.of(context).size.width。這段程式碼使得 HomePage 除了認識 BuildContext 之外，還需知道 MediaQuery 與其內部細節，也就違反了[迪米特法則](https://zh.wikipedia.org/zh-tw/得墨忒耳定律)。如果 BuildContext 是我們自己建立的類別，為了解決問題，我們可以在 BuildContext 加入 screenWidth 與 screenHeight 方法來封裝這段操作。

```dart
context.screenWidth(0.5)
context.screenHeight(0.5)
```

但困難的是，無論是 BuildContext 或 MediaQuery 都是 Flutter 框架提供的物件，我們無法對它進行修改。所以我們常常使用 Utils 或 Helper 來解決這類問題。在 Dart 中，我們除了可以使用 Uitls 來解決，還可以使用 Extension 來改善。

## 使用 Extension

Dart 提供 extension 方法，讓我們能把寫自己方法，並把它掛在我們想要的類別身上，即使這個類別是外部物件，功能也跟 C# 的 Extension 如出一徹。

![it_img_14_2.png](Day%2014%20-%20%E4%BD%BF%E7%94%A8%20Extension%20%E5%81%BD%E8%A3%9D%E6%88%90%E5%A4%96%E9%83%A8%E9%A1%9E%E5%88%A5%E7%9A%84%E6%96%B9%E6%B3%95/it_img_14_2.png)

[https://dartpad.dev/?id=e3b8ae39e5f9ffeb99a5bccbda09a9c4](https://dartpad.dev/?id=e3b8ae39e5f9ffeb99a5bccbda09a9c4)

當我們完成了 Extension 並掛在 BuildContext 身上之後，就會發現就好像直接在 BuildContext 有 screenWidth 和 screenHeight 方法，能讓程式碼變得更加簡潔，提升可讀性。

![it_img_14_3.png](Day%2014%20-%20%E4%BD%BF%E7%94%A8%20Extension%20%E5%81%BD%E8%A3%9D%E6%88%90%E5%A4%96%E9%83%A8%E9%A1%9E%E5%88%A5%E7%9A%84%E6%96%B9%E6%B3%95/it_img_14_3.png)

## 另一個例子

我們常常使用 List 的一些操作，例如：map、where …等等，透過這些操作來達到轉換或過濾 List 的目的。在下面這段程式碼中，我們希望找出 interviewees 和 acceptedInterviewees 的交集，藉此知道誰才是最後要招聘的人。

![it_img_14_4.png](Day%2014%20-%20%E4%BD%BF%E7%94%A8%20Extension%20%E5%81%BD%E8%A3%9D%E6%88%90%E5%A4%96%E9%83%A8%E9%A1%9E%E5%88%A5%E7%9A%84%E6%96%B9%E6%B3%95/it_img_14_4.png)

此時我們能透過使用 extension 並給他一個適合的名字，達到簡短且有效表達的程式碼。

![it_img_14_5.png](Day%2014%20-%20%E4%BD%BF%E7%94%A8%20Extension%20%E5%81%BD%E8%A3%9D%E6%88%90%E5%A4%96%E9%83%A8%E9%A1%9E%E5%88%A5%E7%9A%84%E6%96%B9%E6%B3%95/it_img_14_5.png)

## 結論

有很多時候，我們無可避免地必須使用外部物件來完成功能，導致許多時候，我們的程式碼寫法會受限於外部物件的 API，讓程式碼可能不那麼好讀。當我們嘗試使用 Utils 來解決時，可以先思考是否能用 Extension 來完成，提升程式碼可讀性。

## 參考

- 迪米特法則：[https://zh.wikipedia.org/zh-tw/得墨忒耳定律](https://zh.wikipedia.org/zh-tw/%E5%BE%97%E5%A2%A8%E5%BF%92%E8%80%B3%E5%AE%9A%E5%BE%8B)
- Dart Extension：[https://dart.dev/guides/language/extension-methods](https://dart.dev/guides/language/extension-methods)