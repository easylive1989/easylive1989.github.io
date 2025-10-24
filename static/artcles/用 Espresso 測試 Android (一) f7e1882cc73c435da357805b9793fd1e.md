# 用 Espresso 測試 Android (一)

新增時間: August 11, 2021 1:07 PM
最後編輯時間: October 2, 2025 11:59 PM
id: f7e1882cc73c435da357805b9793fd1e
完成: Yes
類型: Medium
🧩 領域: Android (https://www.notion.so/Android-18e9de92e8644fbb8595e64231704917?pvs=21)

# **Import Espresso**

Add the following dependency to app/build.gradle

```
androidTestCompile 'com.android.support.test.espresso:espresso-core:3.0.1'
```

# **Espresso Basic Usage**

Espresso提供了十分簡潔的API，幾乎是一行程式碼就能代表一個UI操作。

假設我們有一個id為R.id.button的Button與R.id.text的TextView。當Button被按下時，TextView會顯示Hello World。我們可以針對這個功能寫一個簡單的測試。

```
//按下 R.id.button
onView(withId(R.id.button)).perform(click());

//確認 R.id.text上顯示Hello World
onView(withId(R.id.text)).check(matches(withText("Hello World")));
```

觀察上面的例子，我們發現程式碼可以分成三個部分 :

## **1. Find a View :**

```
onView(withId(R.id.button)).perform(click());
```

透過onView(Matcher<View>)找到一個ViewInteraction。之後我們便可以透過ViewInteraction去操作這個View或者是Check他的狀態。

我們在找View時，可以透過許多方式去獲得一個唯一的View，例如:

- withId(int)指定Resource id
- withText(String)指定View中的文字

## **2. Perform a Action**

```
onView(with(R.id.button)).perform(click());
```

找到View對應的ViewInteraction之後，透過ViewInteraction.perform(ViewAction)去操作View，例如 :

- click()模擬點擊View
- typeText(String)模擬輸入文字到View上
- scrollTo()模擬滑動螢幕直到View出現

## **3. Check**

```
onView(withId(R.id.text)).check(matches(withText("Hello World")));
```

當我們模擬了一系列的UI操作之後，我們就得確認App的UI是否如我們預期。透過ViewInteraction.check(matches(Matcher<? **super** View>))，我們便可以驗證UI的狀態。

## **Reference**

1. [https://developer.android.com/training/testing/espresso/index.html](https://developer.android.com/training/testing/espresso/index.html)