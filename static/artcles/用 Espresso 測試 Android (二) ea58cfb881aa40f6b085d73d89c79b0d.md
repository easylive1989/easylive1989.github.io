# 用 Espresso 測試 Android (二)

新增時間: August 11, 2021 1:07 PM
最後編輯時間: October 2, 2025 11:59 PM
id: ea58cfb881aa40f6b085d73d89c79b0d
完成: Yes
類型: Medium
🧩 領域: Android (https://www.notion.so/Android-18e9de92e8644fbb8595e64231704917?pvs=21)

在 Test Android App by Use Espresso (一) 中，提到 Espresso API 的操作的流程 Find View、Perform Action和Check。觀察程式後，可以發現不管是Perform a Action還是Check，都需要先找到View。

## **1. Find View by Other Attribute**

```
onView(withId(R.id.button))
```

這裡演示了onView()最基本的例子，找到一個id為R.id.button的View

```
onView(withText("MyButton"))
```

但是有時候並非所有View都有設定id，此時我們可以使用上面這種方式。透過指定View上的文字來找到對應的View。

這時你可能會有疑問，若我有很多button都有相同的文字呢?

## **2. Find View by Multiple Matcher**

在這種情況，如果還是使用withText(String)來搜尋View的話，測試就會發出[AmbiguousViewMatcherExceptio](https://stackoverflow.com/questions/29656562/espresso-ambiguousviewmatcherexception-when-trying-to-click-a-navigation-button)n導致測試失敗。

此時我們就需要更多的條件，用來更明確的指出我們需要某一個特定的View。

```
onView(allOf(withId(R.id.button), withText("MyButton")))
```

透過allOf(Matcher<? **super** T>… matchers)，我們可以指定更多的條件來獲取我們所需要的那個唯一的View。