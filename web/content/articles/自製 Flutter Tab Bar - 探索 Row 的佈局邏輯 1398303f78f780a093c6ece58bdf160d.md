# 自製 Flutter Tab Bar - 探索  Row 的佈局邏輯

新增時間: November 9, 2024 9:12 AM
最後編輯時間: October 24, 2025 5:18 PM
id: 1398303f78f780a093c6ece58bdf160d
類型: 輸出文章
🧩 領域: Flutter (https://www.notion.so/Flutter-aec5ea3a198f49e18989ab7f4c851169?pvs=21)

![image.png](%E8%87%AA%E8%A3%BD%20Flutter%20Tab%20Bar%20-%20%E6%8E%A2%E7%B4%A2%20Row%20%E7%9A%84%E4%BD%88%E5%B1%80%E9%82%8F%E8%BC%AF/image.png)

在上一篇文章中，我們製作 Tab Bar 時，曾嘗試使用 Row + Expanded 來完成，但是最終使用 AnimatedSize 套上動畫時，結果卻不如預期，Tab Bar 並沒有在切換 Tab 時顯示動畫，今天我們就來深入暸解到底發生了什麼。文章中，我們會分析 Row 的原始碼，了解 Row 的行為，嘗試理解到底是哪邊有問題。

## 軟體開發的抽象洩漏

為什麼我們要研究底層框架的邏輯呢？我們用了框架，用了套件，不就是為了讓開發更容易嗎？我們不需要認識 Flutter 怎麼把文字、圖片顯示在畫面上，我們不需要事先了解隱藏在背後的複雜邏輯才能開始開發，只需要簡單的用 Widget 定義畫面細節，框架幫我們把這些複雜的邏輯簡化成易用的抽象操作，讓我們得以使用這些簡化的抽象操作迅速上手。

確實在一開始，我們不需要知道這麼多就可以開發，但有時事實不如預期那樣發展，有一定經驗的開發者一定知道，若我們持續開發，總是會碰到一些不知道如何解決問題。例如：當 Container 放在 MaterialApp 的 home 時，無論 Container 寬高怎麼設定，最終 Container 最終都會跟畫面一樣大。又好比某個畫面在顯示的過程中卡頓不順暢時，我們如果對 Flutter 的渲染方式沒有一定了解，可能就沒有一個解決問題的方向。

雖然框架與套件盡力的封裝複雜的操作，讓開發人員方便使用，但還是無可避免的會因為一些原因導致我們必須更深入了解實作細節，在 LeSS in Action 的課程中，老師就曾經提到這個問題，認為這是一種無可避免的抽象洩漏。所以身為一個開發人員，**我們必須持續學習，保持對事物的好奇心，探索事物的內在本質**，在未來的某一天，這些內功都會派上用場的。

現在讓我們回歸正題，來一起研究 Row 的實作細節吧。

## Row 的繼承關係

首先打開 Row 的原始碼，我們可以發現它繼承了 Flex，Flex 有兩個實作，分別是大家都十分熟悉的 Row 與 Column，兩者差別其實只在於**方向**而已。

```dart
class Row extends Flex {
  const Row({
    super.key,
    super.mainAxisAlignment,
    super.mainAxisSize,
    super.crossAxisAlignment,
    super.textDirection,
    super.verticalDirection,
    super.textBaseline,
    super.children,
  }) : super(
    direction: Axis.horizontal,
  );
}

class Column extends Flex {
  const Column({
    super.key,
    super.mainAxisAlignment,
    super.mainAxisSize,
    super.crossAxisAlignment,
    super.textDirection,
    super.verticalDirection,
    super.textBaseline,
    super.children,
  }) : super(
    direction: Axis.vertical,
  );
}
```

若是再往上延伸，就會看到 Flex 繼承了 MultiChildRenderObjectWidget，我們先前使用的 CustomMultiChildLayout 也同樣繼承了 MultiChildRenderObjectWidget。CustomMultiChildLayout 與 MultiChildRenderObjectWidget 的功能很像，前者只是把後者封裝成更簡單容易使用的 Widget。那 MultiChildRenderObjectWidget 是什麼呢？

簡單來說，MultiChildRenderObjectWidget 接受一群 Widget 作為輸入，我們可以透過各種不同的實作來規劃這群 Widget 如何佈局，例如：使用 [Stack](https://api.flutter.dev/flutter/widgets/Stack-class.html) 決定每個 Widget 的位置，或是使用 [Row](https://api.flutter.dev/flutter/widgets/Row-class.html) 來橫向依序排列每個 Widget。

在實作 MultiChildRenderObjectWidget 過程中， 具體實作類別會覆寫 createRenderObject 來建立各自對應的 RenderObject，用以實現剛剛提到的各種佈局邏輯。以 Flex 來說，createRenderObject 就會建立 RenderFlex，若想了解 Flex 的佈局邏輯，也就得深入研究 RenderFlex。

```dart
class Flex extends MultiChildRenderObjectWidget {
  @override
  RenderFlex createRenderObject(BuildContext context) {
    return RenderFlex(
      direction: direction,
      mainAxisAlignment: mainAxisAlignment,
      mainAxisSize: mainAxisSize,
      crossAxisAlignment: crossAxisAlignment,
      textDirection: getEffectiveTextDirection(context),
      verticalDirection: verticalDirection,
      textBaseline: textBaseline,
      clipBehavior: clipBehavior,
    );
  }
}
```

註：接下來會看到許多像下方程式碼那樣的判斷方向邏輯，由於我們這邊先只有探討 Row 的行為，所以可以只看 Axis.horizontal 的邏輯即可。

```dart
double _getMainSize(Size size) {
  return switch (_direction) {
    Axis.horizontal => size.width,
    Axis.vertical => size.height,
  };
}
```

## RenderFlex 如何限制子 Widget

繞了一這麽大一圈，我們終於知道要去 RenderFlex 裡面找 Row 的佈局邏輯，那接著就能開始研究最初的問題：**為什麼 AnimatedSize 在 Row + Expanded 中不起作用呢？**

在 RenderFlex 中，處理佈局的方法為 performLayout。在 performLayout 方法中，除去一些前置的狀態檢查邏輯之外，最先呼叫的是邏輯是 _computeSizes 方法。_computeSizes 最主要的任務就是處理「Constraints go down. Sizes go up.」，給定每個子 Widget 的限制，取回每個子 Widget 最終使用的大小。在 _computeSizes 方法中有幾段邏輯，讓我們一一細看。

首先，透過 while 迴圈處理每一個子 Widget。這邊有段  if 邏輯，當子 Widget 的 flex 大於 0 的時候，並不會直接的使用 layoutChild 來決定子 Widget 的大小，而是只有在 flex 為 0 的時候，才會直接使用 layoutChild 來取得子 Widget 大小。

設定 flex 的方式也就是我們熟悉的 Flexible 與 Expanded。

```dart
while (child != null) {
  final FlexParentData childParentData = child.parentData! as FlexParentData;
  final int flex = _getFlex(child);
  if (flex > 0) {
    totalFlex += flex;
    lastFlexChild = child;
  } else {
    final BoxConstraints innerConstraints = switch ((stretched, _direction)) {
      (true,  Axis.horizontal) => BoxConstraints.tightFor(height: constraints.maxHeight),
      (true,  Axis.vertical)   => BoxConstraints.tightFor(width: constraints.maxWidth),
      (false, Axis.horizontal) => BoxConstraints(maxHeight: constraints.maxHeight),
      (false, Axis.vertical)   => BoxConstraints(maxWidth: constraints.maxWidth),
    };
    final Size childSize = layoutChild(child, innerConstraints);
    allocatedSize += _getMainSize(childSize);
    crossSize = math.max(crossSize, _getCrossSize(childSize));
  }
  assert(child.parentData == childParentData);
  child = childParentData.nextSibling;
}
```

這邊我們暫時假設 stretched 為 false，我們就能推算出：當我們使用 Row 並且沒有特別設定 flex 的話，RenderFlex 給的限制就是 BoxConstraints(maxHeight: constraints.maxHeight)。給定的 BoxConstraints 只設定了最大高度，沒有設定 maxWidth，使得子 Widget 可以在 0 到 double.infinity **之間選擇大小，簡而言之就是，愛多大就多大，甚至可能給出超過 Row 本身大小的 Size，也就會造成我們常見的跑版錯誤。

## 子 Widget 加上 Flexible 時

上面看到的邏輯分岔中，當 flex 大於 0 時，並不會直接使用 layoutChild 取得大小，而是只有記錄一下 totalFlex 與 lastFlexChild 就結束了，為什麼呢？原因應該也挺好想像的，因為使用了 flex 就表示我們要按比例來分配剩餘空間，我們肯定得先知道總共要**分成幾分**與**剩餘空間大小**，才能知道每個 Widget 要給多大。

接著我們繼續往下看，在第二段 while 迴圈中，我們就能看到處理 flex 的邏輯了。在下方展示的邏輯中，minChildExtent 與 maxChildExtent 決定了寬度。當 fit 被設定為 FlexFit.tight 的時候，minChildExtent 也就等於 maxChildExtent，使得子 Widget 被強制為 maxChildExtent 大小。

```dart
while (child != null) {
  final int flex = _getFlex(child);
  if (flex > 0) {
    final double maxChildExtent = switch (canFlex) {
      true when child == lastFlexChild => freeSpace - allocatedFlexSpace,
      true => spacePerFlex * flex,
      false => double.infinity,
    };
    final double minChildExtent = switch (_getFit(child)) {
      FlexFit.tight => maxChildExtent,
      FlexFit.loose => 0.0,
    };
    assert(minChildExtent.isFinite);
    final double minCrossSize = stretched ? _getCrossSize(constraints.biggest) : 0.0;
    final BoxConstraints innerConstraints = switch (_direction) {
      Axis.horizontal => constraints.copyWith(minHeight: minCrossSize, minWidth: minChildExtent, maxWidth: maxChildExtent),
      Axis.vertical   => constraints.copyWith(minWidth: minCrossSize, minHeight: minChildExtent, maxHeight: maxChildExtent),
    };
    final Size childSize = layoutChild(child, innerConstraints);
    final double childMainSize = _getMainSize(childSize);
    assert(childMainSize <= maxChildExtent);
    allocatedSize += childMainSize;
    allocatedFlexSpace += maxChildExtent;
    crossSize = math.max(crossSize, _getCrossSize(childSize));
  }
  final FlexParentData childParentData = child.parentData! as FlexParentData;
  child = childParentData.nextSibling;
}
```

那什麼時候 fit 會是 FlexFit.tight 呢？其實就是使用 Expanded 的時候。也就是說，當使用 Expanded 時，每個包了 Expanded 的子 Widget 會被強制依照 flex 比例分配剩餘空間，也就是 switch 邏輯中的 `spacePerFlex * flex`。

```dart
class Expanded extends Flexible {
  const Expanded({
    super.key,
    super.flex,
    required super.child,
  }) : super(fit: FlexFit.tight);
}
```

而子 Widget 若是使用了 Flexible，並維持預設值，讓 fit 是 FlexFit.loose 時，Flex 會允許子 Widget 在 [ 0, `spacePerFlex * flex` ] 之間任意決定大小，並不像 Expanded 一樣強制撐到 flex 設定的比例。

```dart
class Flexible extends ParentDataWidget<FlexParentData> {
  const Flexible({
    super.key,
    this.flex = 1,
    this.fit = FlexFit.loose,
    required super.child,
  });
}
```

決定 flex > 0 的子 Widget 的大小之後，_computeSizes 的工作也基本完成。接下來的工作就是 Flex 如何安排每個子 Widget 的位置。到這邊我們已經基本了解 Row 如何設定子 Widget 的大小，我們也暫時獲得足夠的資訊來回答我們先前的問題，所以先讓我們暫停在這邊，剩餘的部分，有機會再讀者們分享。

## 回顧 Row 的行為

看到現在，讓我們快速回顧一下，當我們使用 Row 的時候，程式會優先計算沒有使用 flex 為 0 的子 Widget，並且讓這些子 Widget 想使用多大的空間就使用多大的空間。接著才是將剩餘的空間依比例分配給其他使用 Flexible 或 Expanded 設定 flex 的子 Widget。

這裡其實有一件很有趣的事，假設 Row 中同時存在使用 Flexible 的子 Widget 與使用 Expanded 的子 Widget 時，如果使用 Flexible 的子 Widget 沒有用滿 flex 設定比例的空間，那剩下使用 Expanded 的子 Widget 如何分配剩餘空間呢？難道 Expanded 還得知道 Flexible 省下了多少空間沒用，進而把佔滿嗎？讓我們來實驗一下。

首先是第一種情境：**Flexible 中的子 Widget 內容長到足以填滿 flex 設定的比例大小**。

```dart
Row(children: [
  Expanded(
    child: Container(color: Colors.red, child: const Text("Item 1")),
  ),
  Expanded(
    child: Container(color: Colors.green, child: const Text("Item 2")),
  ),
  Flexible(
    child: Container(color: Colors.blue, child: const Text("Long Long Long Long Long Item 3")),
  ),
  Expanded(
    child: Container(color: Colors.yellow, child: const Text("Item 4")),
  ),
])
```

運行之後我們可以發現，畫面確實如預期一樣的平均分配了子 Widget 的空間。在這個情況中 Flexible 跟 Expanded 一起平均分配了空間。

![截圖 2024-11-17 下午5.00.04.png](%E8%87%AA%E8%A3%BD%20Flutter%20Tab%20Bar%20-%20%E6%8E%A2%E7%B4%A2%20Row%20%E7%9A%84%E4%BD%88%E5%B1%80%E9%82%8F%E8%BC%AF/%25E6%2588%25AA%25E5%259C%2596_2024-11-17_%25E4%25B8%258B%25E5%258D%25885.00.04.png)

接著是讓我們看看另外一個狀況：**Flexible 中的子 Widget 內容不足以填滿 flex 設定的比例大小**。

```dart
Row(children: [
  Expanded(
    child: Container(color: Colors.red, child: const Text("Item 1")),
  ),
  Expanded(
    child: Container(color: Colors.green, child: const Text("Item 2")),
  ),
  Flexible(
    child: Container(color: Colors.blue, child: const Text("Item 3")),
  ),
  Expanded(
    child: Container(color: Colors.yellow, child: const Text("Item 4")),
  ),
])
```

運行之後我們就會發現，Flexible 中的 Widget 確實沒有佔滿整個 flex 設定的比例大小，但同時也發現 Expanded 並沒有去填滿 Flexible 所留下的空間，而是按照原本計算的大小來撐開而已。Flexible 沒有佔滿的部分，就真的放著沒有去使用了。

![截圖 2024-11-17 下午5.00.16.png](%E8%87%AA%E8%A3%BD%20Flutter%20Tab%20Bar%20-%20%E6%8E%A2%E7%B4%A2%20Row%20%E7%9A%84%E4%BD%88%E5%B1%80%E9%82%8F%E8%BC%AF/%25E6%2588%25AA%25E5%259C%2596_2024-11-17_%25E4%25B8%258B%25E5%258D%25885.00.16.png)

## 小結

今天我們一起研究了 Row 一些佈局邏輯，也再一次認識了「Constraints go down. Sizes go up.」如何在 Flutter 框架中實踐，也發現了 Row 同時使用 Flexible 與 Expanded 可能會有的狀況。

了解了 Row 的運作機制之後，根據我們看到的佈局邏輯，理論上 AnimatedSize 在 Row + Expanded 的組合中使用也要能正常出現動畫效果，那為什麼事實卻不是如此呢？我們在下一篇文章中會繼續探討這個問題，最後我們會發現 Row + Expanded 其實也能完成我們最初想要的行為，那就讓我們下次見吧。

## 參考

- RenderFlex 原始碼：https://github.com/flutter/flutter/blob/master/packages/flutter/lib/src/rendering/flex.dart