# Day 3 - Widget 你已經長大了，是該獨立自主了

新增時間: July 28, 2022 02:50 PM
最後編輯時間: November 09, 2025 12:49 PM
id: cc43093c1e7d42039dc485edd681ee59

![](2a68303f-78f7-8079-b632-cabfebd64701.png)

昨天我們提到一個狀況：有些情況是 Flutter 提供的 Widget 並不符合設計要求，而第三方套件中也沒有符合需求的套件，所以我們得自己實作。我們依照設計師所要求，完成了畫面。但是看看這段程式碼，雖然我們完成了功能，如同昨天討論問題一樣，這段程式碼並不具備可讀性和存在壞味道。

![](it_img_2_1.png)

[https://dartpad.dev/?id=4206cf5a29e1aa93c2cd39d31f342130](https://dartpad.dev/?id=4206cf5a29e1aa93c2cd39d31f342130)

## 抽取方法

為了解決這個問題，我們可以使用重構技巧：[抽取方法](https://refactoring.guru/extract-method)，把一長串的程式碼吃拆分成一個一個的私有方法。至此，程式碼也確實提高了可讀性，可從 build 方法可以明顯看出，我們使用 ListView 來 build 出一個一個的 Message，如果再移至 _buildMessage 的定義，就能看到根據不同情況，程式碼會 build 出三種不同設計的 Message Widget。透過使用抽取方法，能夠有效改善程式碼的可讀性。

![](it_img_2_2.png)

[https://dartpad.dev/?id=23f6e6d7019d15f7a4ce9b256b9cacb4](https://dartpad.dev/?id=23f6e6d7019d15f7a4ce9b256b9cacb4)

## 抽取 Widget

除了抽取方法之外，我們也可以透過抽取 Widget 來解決這個問題。抽取 Widget 在概念上與抽取方法別無二致，我們都能藉由給定更清楚的名稱與隱藏實作細節來提升可讀性。

![](it_img_2_3.png)

[https://dartpad.dev/?id=3265ea97bcacb9b50eded2521ac0023f](https://dartpad.dev/?id=3265ea97bcacb9b50eded2521ac0023f)

## 抽取方法  vs 抽取 Widget

雖然在程式碼的可讀性上，兩個做法都可以解決問題。有些時候，使用抽取 Widget 會好一些，由於 Flutter 在重 build 畫面時，可以透過比較 Widget 前後是否一致，來決定是否重用或產生新的，反之如果使用抽取方法則比較難享受到這個好處，想知道原理的朋友，可以參考[這邊](https://medium.com/flutter-community/why-is-flutter-fast-part-1-sublinear-building-317572cd6b47)。另外，抽取 Widget 除了更容易重複使用之外，在 IDE 也會幫忙 highlight Widget 讓程式碼稍微比較容易閱讀。

## 結論

使用抽取 Widget 或者抽取方法，實際上並不會差很多，如何根據實際狀況來衡量使用哪個，就要得靠讀者們在實際工作中自行評估。

## 參考

- 抽取方法：[https://refactoring.guru/extract-method](https://refactoring.guru/extract-method)
- Why is Flutter Fast? — Part 1: Sublinear Building：[https://medium.com/flutter-community/why-is-flutter-fast-part-1-sublinear-building-317572cd6b47](https://medium.com/flutter-community/why-is-flutter-fast-part-1-sublinear-building-317572cd6b47)
- Widgets vs helper methods | Decoding Flutter**：**[https://www.youtube.com/watch?v=IOyq-eTRhvo](https://www.youtube.com/watch?v=IOyq-eTRhvo)


prefer separate widget

1. setState 多 create 幾個 widget 幾乎不會影響效能，但是每次重 build 時，都要重 build 整個畫面則會影響，如果今天畫面上有動畫，就會更頻繁的去重複畫面
1. 可以用 const
1. 分離  widget 也更容易測試
1. BuildContext 可以使用的更準確，省去使用 builder widget
Class have a better default behavior. The only benefit of method is having to write a tiny bit less code. There is no functional benefit. - Remi Rousselet



clean code

不要把 controller 傳進去，讓 Widget 容易重用

注意參數

注意內聚力



不要讓 widget 強制依賴某個 vo 會讓 widget 難以重複利用



如果參數可以往 Widget 內放，就盡量往 Widget 內放

類似於變數 scope 的問題
