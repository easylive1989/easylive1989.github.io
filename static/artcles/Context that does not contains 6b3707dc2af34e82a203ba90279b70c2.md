# Context that does not contains ...

新增時間: August 11, 2021 1:07 PM
最後編輯時間: January 1, 2025 8:55 AM
id: 6b3707dc2af34e82a203ba90279b70c2
完成: Yes
類型: Medium
🧩 領域: Flutter (https://www.notion.so/Flutter-aec5ea3a198f49e18989ab7f4c851169?pvs=21)

在開發Flutter的時候，多多少少都會遇到一些error。在眾多error中，多多少少都會遇到的一種error是context中找不到想要的東西，讓我們舉個例子來看看這個錯誤。

## context中找不到Scaffold

以下面這段代碼為例，當按下FloatingActionButton時，畫面顯示"Worlds!"在SnackBar上。當程式執行onPressed callback時，透過Scaffold.of(context)找到ScaffoldState，並呼叫其showSnackBar方法來顯示SnackBar。

![](Context%20that%20does%20not%20contains/_2021-01-31_7.58.31.png)

實際執行並按下FloatingActionButton後會噴error，訊息中提示context不包含Scaffold。

```dart
Scaffold.of() called with a context that does not contain a Scaffold.
```

![](Context%20that%20does%20not%20contains/_2021-01-24_8.41.24.png)

可以發現錯誤是發生在嘗試呼叫Scaffold.of()取得Scaffold的時候，初學者容易在這個地方覺得奇怪，因為Scaffold確實是FloatingActionButton的parent，那為什麼會找不到呢？

## 發生原因

在上一篇BuildContext的文章中提到，of方法會從parent開始一層一層往上找，但是此時的context是這個MyHomePage的context，並非FloatingActionButton的context，所以會找不到Scaffold，以上面的代碼為例，此時畫面的結構是

![](Context%20that%20does%20not%20contains/_2021-01-31_8.24.08.png)

所以當呼叫Scaffold.of()時，程式循著MyHomePage的context往parent一層一層往上找，理所當然是找不到任何ScaffoldState，因為想要的ScaffoldState在child（Context of Scaffold）中。

## 如何解決

1. 把目標UI抽取Widget，並為其取一個合適的名稱。
    
    ![](Context%20that%20does%20not%20contains/_2021-01-31_8.19.05.png)
    
    但是當目標UI沒有重複利用的需求且本身已經夠小的時候，或許可以考慮使用Builder來解決
    
2. 用Builder把Widget包起來
    
    ![](Context%20that%20does%20not%20contains/_2021-01-31_8.11.58.png)
    
    此時就能用Builder中的context來正確取得ScaffoldState。
    

## 不只Scaffold

在開發過程中，我們也常常會用到MediaQuery.of(context)來幫助我們取得畫面的寬高，但是當我們的Widget Tree中沒有MediaQuery時，也同樣的會噴錯。

![](Context%20that%20does%20not%20contains/_2021-02-02_2.02.44.png)

如果在自己的Widget中實作了of方法，也同樣需要在使用的時注意是否有正確的使用，否則就會造成系統出錯而畫面無法正常顯示。

## 小結

如果第一次看到這個錯誤，對初學者的人來說，可能會上網搜尋解法。找到解法貼上來後也可能會一頭霧水，不知道錯誤的原因是什麼，也不知道為什麼這樣寫就會好，改起來總是不安心。希望這篇文章能幫助大家更好地瞭解Flutter，讓代碼寫起來更有信心。