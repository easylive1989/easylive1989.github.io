# Dart 非同步介紹(一) - Event Loop

新增時間: August 11, 2021 1:07 PM
最後編輯時間: October 24, 2025 5:25 PM
id: fad780524ae04e6fbadb7c6c280e0f2b
類型: 輸出文章
🧩 領域: Flutter (https://www.notion.so/Flutter-aec5ea3a198f49e18989ab7f4c851169?pvs=21)

![image.png](Dart%20%E9%9D%9E%E5%90%8C%E6%AD%A5%E4%BB%8B%E7%B4%B9(%E4%B8%80)%20-%20Event%20Loop/image.png)

寫Flutter的時候，如果我們需要從後端api拿回資料時，我們會使用一些network相關的package來幫忙，例如：[http](https://pub.dev/packages/http)。我們透過await http.get來讓代碼停在這一行，釋放Thread去做其他工作，直到後端response傳回來後，Thread再從之後的代碼繼續執行，這種非同步的操作只是用在存取api，在很多其他場景中也都會用到，今天就來講講Dart的非同步操作是如何運作的。

## Event Loop與單執行緒

在預設的情況下，Dart只使用一條Thread來執行代碼，Dart用三個東西來完成這件事情：**Event**, **Event Loop**, **Event Queue**。我們可以想像Dart把一段一段的代碼包成Event放在Event Queue的中，當中不管是渲染畫面的代碼、點擊按鈕的callback代碼，或者http response callback代碼。

![](Dart%20%E9%9D%9E%E5%90%8C%E6%AD%A5%E4%BB%8B%E7%B4%B9(%E4%B8%80)%20-%20Event%20Loop/_2021-03-01_3.08.29.png)

所有Event都會放在Event Queue中，然後Event Loop從Event Queue中把Event拿出來執行。我們可以把Event Loop想像成一條Thread裡頭跑著一個無窮迴圈，它會一直不斷的檢查Queue中有沒有Event，有的話就把它拿出來執行，如果沒有的話就一直等待下一個Event的出現。

我們舉一些簡單的例子來看看

```dart
FlatButton(
  onPressed: () => {
	print('Hello World!');
  },
  child: Text("Click me"),
),
```

當FlatButton被宣告的時，onPress不會直接被執行，而是使用者按下FlatButton時，Flutter會在Event Queue中加入一個Click的Event，等待Event Loop處理它。順帶一提，宣告FlatButton的代碼也曾經被放在某個Event中，並被Event Loop執行。

**http範例代碼：**

```dart
var url = 'https://example.com/whatsit/create';
var response = await http.post(url, body: {'name': 'doodle', 'color': 'blue'});
print('Response status: ${response.statusCode}');
print('Response body: ${response.body}');
```

這段代碼執行到 await http.post且送出request之後，Event Loop轉去處理下一個Event。等到成功接收response之後，Dart就會加入剩餘部分代碼的Event到Event Queue中（也就是print的部分
），等待Event Loop處理它。

## await是一種語法糖

在Dart中，await是一種then方法的語法糖，也就是說編譯器會在編譯過程中幫你把await轉換成then的寫法。以上面http範例代碼來說，就會變成下面這樣。

```dart
var url = 'https://example.com/whatsit/create';
http.post(url, body: {'name': 'doodle', 'color': 'blue'})
		.then((response) => {
			print('Response status: ${response.statusCode}');
			print('Response body: ${response.body}');
		}); 
```

## 小心耗時工作

Event Loop會把正在處理的Event處理完以後，才會繼續從Queue中拿下一個Event。當我們在Queue中放入了耗時工作的Event時，例如：壓縮圖片、加密解密..等等，就會造成下一個UI遲遲無法被處理。如果今天下一個Event剛好是渲染UI Event，就會發現畫面開始卡頓，甚至沒有反應，直到Event Loop處理完手上的工作。

但是實際應用場景中難免會有這樣的需求，此時我們可以使用Isolate來解決這類問題，避免占用到渲染UI的時間或者是Click事件的處理，我下次會繼續介紹Isolate如何使用，感謝你耐心的看這邊。