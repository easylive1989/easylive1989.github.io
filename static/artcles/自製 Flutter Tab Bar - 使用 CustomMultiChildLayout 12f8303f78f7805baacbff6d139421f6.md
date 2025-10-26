# 自製 Flutter Tab Bar - 使用 CustomMultiChildLayout

新增時間: October 30, 2024 8:20 AM
最後編輯時間: October 26, 2025 9:38 PM
id: 12f8303f78f7805baacbff6d139421f6
類型: Medium
🧩 領域: Flutter (https://www.notion.so/Flutter-aec5ea3a198f49e18989ab7f4c851169?pvs=21)

![image.png](%E8%87%AA%E8%A3%BD%20Flutter%20Tab%20Bar%20-%20%E4%BD%BF%E7%94%A8%20CustomMultiChildLayout/image.png)

在產品開發上我們常常使用 Tab Bar 來切換不同分類的內容，使用 Tab Bar 可以讓使用者快速找到想要的內容，提升效率。一般來說，我們可以使用 Flutter 內建 TabBar 來完成，即便我們希望的樣式與預設的不同，也能透過參數調整或額外加工來調整成想要的結果。

![image.png](%E8%87%AA%E8%A3%BD%20Flutter%20Tab%20Bar%20-%20%E4%BD%BF%E7%94%A8%20CustomMultiChildLayout/image%201.png)

[https://api.flutter.dev/flutter/material/TabBar-class.html](https://api.flutter.dev/flutter/material/TabBar-class.html)

但是若碰上內建 TabBar 無法符合設計需求，我們通常就上 [pub.dev](http://pub.dev) 搜尋，看看有沒有人已經提供相同功能的套件。在找不到呢，我們也就只能自己做了，而這次碰到 Tab Bar 設計就剛好是最後一種狀況，這也給了筆者一個嘗試的機會。

![images.png](%E8%87%AA%E8%A3%BD%20Flutter%20Tab%20Bar%20-%20%E4%BD%BF%E7%94%A8%20CustomMultiChildLayout/images.png)

## 了解 Tab Bar 行為

首先先來簡單分析一下這個特別的 Tab Bar 的行為：

1. 被選到 Tab 佔據他所需要的寬度，剩下的寬度由那些未被選到的 Tab 平均分配
2. 被選到的 Tab 擁有不同的文字
3. 當使用者點選其他 Tab 時，透過淡入淡與放大縮小來變化 Tab 樣式

[ori.mov](%E8%87%AA%E8%A3%BD%20Flutter%20Tab%20Bar%20-%20%E4%BD%BF%E7%94%A8%20CustomMultiChildLayout/ori.mov)

分析不只讓我們更清楚要完成什麼需求，將需求拆成一個一個的小需求，我們就能解決多個簡單的小問題，最後集合解決原本的大問題。這也能讓我們優先處理最有價值的部分，用最快的時間產出最有價值的部分，這也是開發人員必備的 Divide and Conquer 技巧。

## 從最重要的功能開始

如果我們先不考慮動畫，我們可很容易地完成兩項要求。首先利用 Row 來放置每個一個 Tab，接著用 Expanded 包住其他沒被選到的 Tab，使得這些沒被選到的 Tab 以平均分配的形式來排列。(為了讓程式碼簡短一些些，筆者拿掉了一些例如圓角或粗體等不重要的細節)

```dart
class MyTabBar extends StatefulWidget {
  const MyTabBar({super.key});

  @override
  State<MyTabBar> createState() => _MyTabBarState();
}

class _MyTabBarState extends State<MyTabBar> {
  int currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    const tabLength = 4;
    return Container(
      padding: const EdgeInsets.all(4),
      color: const Color(0xFFE6E6E6),
      child: Row(
        children: [
          for (int index = 0; index < tabLength; index++)
            currentIndex == index
                ? Container(
                    padding: const EdgeInsets.all(8),
                    color: const Color(0xFF510E59),
                    child: Text(
                      "Selected Tab $index",
                      style: const TextStyle(color: Colors.white),
                    ),
                  )
                : Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => currentIndex = index),
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        color: const Color(0xFFE6E6E6),
                        child: Text("Tab $index", textAlign: TextAlign.center),
                      ),
                    ),
                  )
        ],
      ),
    );
  }
}
```

這個版本相當簡單，當使用者選到某個 Tab 之後，被選到的 Tab 一瞬間就換了樣式。

[https://dartpad.dev/?id=e2b032cb7cf8392af5a1f0ea4c4a11fb](https://dartpad.dev/?id=e2b032cb7cf8392af5a1f0ea4c4a11fb)

[v1.mov](%E8%87%AA%E8%A3%BD%20Flutter%20Tab%20Bar%20-%20%E4%BD%BF%E7%94%A8%20CustomMultiChildLayout/v1.mov)

以迭代的方式完成功能，避免**一口氣花很多時間**完成最終版本。這有幾個好處，以 Tab Bar 的例子來說，我們用熟練的工具快速完成了一個非動畫版本的 Tab Bar，這時候其實最重要的功能已經完成，即便最後時間來不及直接上線的話，也不會造成功能有使用上的問題。

在開發這個功能的過程中，筆者也是先完成到這邊，接著轉頭去完成其他部分的工作。等到其他更重要的工作完成的差不多之後，才又回頭來思考如何實現 Tab Bar 動畫，接著讓我們來看看怎麼完成吧。

## 嘗試加上動畫

當我們想加動畫時，我們除了使用 AnimationController 自定義之外，還有其他更簡單的方式。Flutter 內建提供許多好用的動畫 Widget，例如：[AnimatedSwitcher](https://api.flutter.dev/flutter/widgets/AnimatedSwitcher-class.html)、[AnimatedContainer](https://api.flutter.dev/flutter/widgets/AnimatedContainer-class.html) ……等。筆者最一開始也是打算在 Row 的基礎上加上 [AnimatedSize](https://api.flutter.dev/flutter/widgets/AnimatedSize-class.html) 來完成動畫的部分，但是天不從人願，代誌不是憨人想得那麼簡單，加上 AnimatedSize 沒有任何效果。

```dart
Row(
  children: [
    for (int index = 0; index < tabLength; index++)
      currentIndex == index
          ? AnimatedSize(
              duration: const Duration(milliseconds: 300),
              child: Container(
                padding: const EdgeInsets.all(8),
                color: const Color(0xFF510E59),
                child: Text(
                  "Selected Tab $index",
                  style: const TextStyle(color: Colors.white),
                ),
              ),
            )
          : Expanded(
              child: AnimatedSize(
                duration: const Duration(milliseconds: 300),
                child: GestureDetector(
                  onTap: () => setState(() => currentIndex = index),
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    color: const Color(0xFFE6E6E6),
                    child: Text(
                      "Tab $index",
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              ),
          )
  ],
)
```

但是我們若是再嘗試一下，加上 AnimatedSize 但拿掉 Expanded 的話，會發現其實 AnimatedSize 是有效果的，顯然是 Row 的某些機制造成了問題，~~關於為什麼沒有效果以後我們會做一期專門的影片逕行講解~~。但是我們也不能接受這個版本，因為我們需要沒被選取的 Tab 平均分配寬度。

```dart
Row(
  children: [
    for (int index = 0; index < tabLength; index++)
      currentIndex == index
          ? AnimatedSize(
              duration: const Duration(milliseconds: 300),
              child: Container(
                padding: const EdgeInsets.all(8),
                color: const Color(0xFF510E59),
                child: Text(
                  "Selected Tab $index",
                  style: const TextStyle(color: Colors.white),
                ),
              ),
            )
          : AnimatedSize(
              duration: const Duration(milliseconds: 300),
              child: GestureDetector(
                onTap: () => setState(() => currentIndex = index),
                child: Container(
                  padding: const EdgeInsets.all(8),
                  color: const Color(0xFFE6E6E6),
                  child: Text(
                    "Tab $index",
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            )
  ],
)
```

[v2.mov](%E8%87%AA%E8%A3%BD%20Flutter%20Tab%20Bar%20-%20%E4%BD%BF%E7%94%A8%20CustomMultiChildLayout/v2.mov)

[https://dartpad.dev/?id=3e6285459821b93834d6bdfbd1308827](https://dartpad.dev/?id=3e6285459821b93834d6bdfbd1308827)

事情到了這邊，顯然我們無法使用 Row 完成這個 Tab Bar 設計了，那我們還有什麼辦法呢？有的，我們可以用 [CustomMultiChildLayout](https://api.flutter.dev/flutter/widgets/CustomMultiChildLayout-class.html) 自製一個簡單的 Row，一個為這個特殊的 Tab Bar 佈局而生的 Row。

## 使用 CustomMultiChildLayout + AnimatedSize

使用 CustomMultiChildLayout 方法並不複雜，CustomMultiChildLayout 有個 children 參數可以傳入複數個 Widget，這邊我們就傳入各個包有 AnimatedSize 的 Tab，並且用 LayoutId 這個 Widget 包住 Tab 並指定 id。指定 id 的目的是為了讓等等在排列佈局的時候可以取得相對應得子 Widget。

```dart
class MyTabBar extends StatefulWidget {
  const MyTabBar({super.key});

  @override
  State<MyTabBar> createState() => _MyTabBarState();
}

class _MyTabBarState extends State<MyTabBar> {
  int currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    const tabLength = 4;
    return Container(
      padding: const EdgeInsets.all(4),
      color: const Color(0xFFE6E6E6),
      child: CustomMultiChildLayout(
        delegate: _MyTabBarLayoutDelegate(
          selectedIndex: currentIndex,
          length: tabLength,
        ),
        children: <Widget>[
          for (int index = 0; index < tabLength; index++)
            LayoutId(
              id: index,
              child: GestureDetector(
                onTap: () => setState(() => currentIndex = index),
                child: currentIndex == index
                    ? AnimatedSize(
                        duration: const Duration(milliseconds: 300),
                        child: Text(
                          "Selected Tab $index",
                          style: const TextStyle(color: Colors.white),
                        ),
                      )
                    : AnimatedSize(
                        duration: const Duration(milliseconds: 300),
                        child: Text("Tab $index", textAlign: TextAlign.center),
                      ),
              ),
            ),
        ],
      ),
    );
  }
}
```

接著我們需要實作 MultiChildLayoutDelegate 定義各個子 Widget 的位置，這邊就需要一些簡單的數學計算了。首先，我們要實作 performLayout(Size size) 方法，我們必須在這個方法中設定子 Widget 的大小與位置。雖說是設定子 Widget 的大小，實際上是告訴子 Widget 一個**大小限制**，也就是 Constraint。

## 實作 MultiChildLayoutDelegate

在 Flutter 框架設計中有句話：「[**Constraints go down. Size go up. Parent sets position.**](https://docs.flutter.dev/ui/layout/constraints)」，這句話充分體現了 Flutter 的排版的核心機制，而 performLayout 方法所要處理的就恰恰是這一句話，筆者曾在社群聊天時分享過一個例子：

想像一下，假設今天公司要辦員工旅遊，福委想知道總共有多少員工與員工家屬要參加，這時福委就通知每個員工說：「每個人可以帶 0 ~ 3」個家屬，而這就是 Constraints go down。當員工回家問親戚朋友，最終得到總共幾人參加後，員工把這人數回報給福委，這就是 Size go up。最後福委就能根據回報的資訊得知總共有多少人，也就能安排每個員工與家屬的梯次、機票、車位等資訊，也就是 Parent sets position。

讓我們來看點實際例子。

還記得我們特殊 Tab Bar 的第一個要求嗎？

**被選到 Tab 佔據他所需要的寬度，剩下的寬度由那些未被選到的 Tab 平均分配**

若想完成這個需求，我們首先得先知道被選到 Tab 的寬度，在 performLayout 方法的第一行，我們就呼叫了 layoutChild 並帶入被選到的 Tab 的 id 與 Constraints，這個 Constrains 告訴了被選到的 Tab 最大可以到多大。

```dart
class _MyTabBarLayoutDelegate extends MultiChildLayoutDelegate {
  _MyTabBarLayoutDelegate({
    required this.selectedIndex,
    required this.length,
  });

  final int selectedIndex;
  final int length;

  @override
  void performLayout(Size size) {
    final selectedSize = layoutChild(
        selectedIndex,
        BoxConstraints(
          maxWidth: size.width,
          maxHeight: size.height,
        ));

    final otherChildWidth = (size.width - selectedSize.width) / (length - 1);
    
    double currentWidth = 0;
    for (int index = 0; index < length; index++) {
      if (index == selectedIndex) {
        positionChild(index, Offset(currentWidth, 0));
        currentWidth += selectedSize.width;
      } else {
        layoutChild(
            index,
            BoxConstraints(
              minWidth: otherChildWidth,
              maxWidth: otherChildWidth,
              maxHeight: size.height,
            ));
        positionChild(index, Offset(currentWidth, 0));
        currentWidth += otherChildWidth;
      }
    }
  }

  @override
  bool shouldRelayout(_MyTabBarLayoutDelegate oldDelegate) {
    return oldDelegate.selectedIndex != selectedIndex ||
        oldDelegate.length != length;
  }
}
```

得到大小之後，我們就能計算出其他沒被選到的 Tab 應該要多大，並在 layoutChild 的時候嚴格指定其寬度（把 minWidth 與 maxWidth 設定為相同值）。

最後我們知道每個子 Widget 大小為多少之後，我們就能準確的設定其座標。透過 positionChild 方法指定每個子 Widget 的位置，我們也就能完成特製的 Row 了。

完成之後，我們測試一個就能看到切換 Tab 時，Tab 有伸縮的動畫了。

[https://dartpad.dev/?id=52542730fde0265f1690f3b29f5b12c6](https://dartpad.dev/?id=52542730fde0265f1690f3b29f5b12c6)

[v4.mov](%E8%87%AA%E8%A3%BD%20Flutter%20Tab%20Bar%20-%20%E4%BD%BF%E7%94%A8%20CustomMultiChildLayout/v4.mov)

最後我們還想讓 Tab 的背景顏色也有淡入淡出的動畫效果時，我們只要簡單的把 Container 修改為 AnimatedContainer 就好，我們就能看到變大變小的同時也有淡入淡出的效果了。

[https://dartpad.dev/?id=e5d78a92bdf62adc25df2d580348c661](https://dartpad.dev/?id=e5d78a92bdf62adc25df2d580348c661)

[v4.mov](%E8%87%AA%E8%A3%BD%20Flutter%20Tab%20Bar%20-%20%E4%BD%BF%E7%94%A8%20CustomMultiChildLayout/v4%201.mov)

## 小結

今天分享了如何在 Flutter 中自訂 Tab Bar 特效，透過分析 Tab Bar 的行為，我們展示如何逐步實現功能，包括使用 Row 和 Expanded 佈局，以及後續添加動畫效果。最終，採用 CustomMultiChildLayout 和 AnimatedSize 實現了一個符合設計需求的 Tab Bar，確保選中 Tab 的寬度動態變化，最後再加上 AnimatedContainer 實現背景顏色的淡入淡出效果。