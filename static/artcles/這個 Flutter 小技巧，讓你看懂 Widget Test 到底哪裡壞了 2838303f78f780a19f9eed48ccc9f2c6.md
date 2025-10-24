# 這個 Flutter 小技巧，讓你看懂 Widget Test 到底哪裡壞了

新增時間: October 5, 2025 4:39 PM
最後編輯時間: October 5, 2025 8:28 PM
id: 2838303f78f780a19f9eed48ccc9f2c6
完成: Yes
類型: Medium
🧩 領域: Flutter (https://www.notion.so/Flutter-aec5ea3a198f49e18989ab7f4c851169?pvs=21)

![](https://images.unsplash.com/photo-1501163109389-abf37ca1276a?ixlib=rb-4.1.0&q=85&fm=jpg&crop=entropy&cs=srgb)

在 Flutter 開發中，我們除了寫程式之外，也會需要寫一些測試來確保功能沒有問題。Flutter SDK 內建提供了 Unit Test、Widget Test 與 Integration Test 三種測試工具供開發人員使用。這三種工具分別有些不同特性，Unit Test 無論是執行速度或是錯誤訊息清晰度，都要比 Integration Test 要來得好很多。

在 Flutter 開發中，除了撰寫功能程式碼之外，撰寫測試也是確保應用穩定性的重要一環。Flutter SDK 內建提供了三種測試工具：**Unit Test**、**Widget Test** 與 **Integration Test**。這三者的主要差異在於測試的層級與執行效能，其中 **Unit Test** 速度最快、錯誤訊息最清晰；而 **Integration Test**

涵蓋範圍最廣，但速度最慢、維護成本也最高。

![[https://docs.flutter.dev/testing/overview](https://docs.flutter.dev/testing/overview)](%E9%80%99%E5%80%8B%20Flutter%20%E5%B0%8F%E6%8A%80%E5%B7%A7%EF%BC%8C%E8%AE%93%E4%BD%A0%E7%9C%8B%E6%87%82%20Widget%20Test%20%E5%88%B0%E5%BA%95%E5%93%AA%E8%A3%A1%E5%A3%9E%E4%BA%86/image.png)

[https://docs.flutter.dev/testing/overview](https://docs.flutter.dev/testing/overview)

相較之下，**Widget Test** 的執行速度僅略慢於 Unit Test，但其錯誤訊息往往不夠直覺。例如，下列訊息僅指出某個 Widget 找不到，卻無法明確告訴我們原因：

```bash
Expected: no matching candidates
  Actual: _TextWidgetFinder:<Found 1 widget with text "1": [
            Text("1", debugLabel: (englishLike headlineMedium 2021).merge((blackMountainView
headlineMedium).apply), inherit: false, color: Color(alpha: 1.0000, red: 0.1137, green: 0.1059,
blue: 0.1255, colorSpace: ColorSpace.sRGB), family: Roboto, size: 28.0, weight: 400, letterSpacing:
0.0, baseline: alphabetic, height: 1.3x, leadingDistribution: even, decoration: Color(alpha: 1.0000,
red: 0.1137, green: 0.1059, blue: 0.1255, colorSpace: ColorSpace.sRGB) TextDecoration.none,
dependencies: [DefaultSelectionStyle, DefaultTextStyle, MediaQuery]),
```

造成測試失敗的原因可能很多：邏輯錯誤、畫面未刷新、Widget 被遮擋 ……單靠這樣的訊息，很難快速定位問題，也因此 Widget Test 維護成本較高。

## 使用 debugDumpApp 顯示 Widget Tree

若上網搜尋「如何除錯 Widget Test」，很容易找到 Flutter 提供的 `debugDumpApp` API。這個工具可以輸出整個 Widget Tree，理論上可協助我們檢查畫面結構是否正確（[完整範例在這裡](https://dartpad.dev/?id=97d3dae3a802cc1d3076998ca6c43772)）。

```bash
AutomatedTestWidgetsFlutterBinding - DEBUG MODE
[root]
└View(state: _ViewState#f6410)
 └RawView
  └_RawViewInternal-[_DeprecatedRawViewKey TestFlutterView#36943](renderObject: _ReusableRenderView#62b88)
   └_ViewScope
    └_PipelineOwnerScope
     └_MediaQueryFromView(state: _MediaQueryFromViewState#8f554)
      └MediaQuery(MediaQueryData(size: Size(800.0, 600.0), devicePixelRatio: 3.0, textScaler: no scaling, platformBrightness: Brightness.light, padding: EdgeInsets.zero, viewPadding: EdgeInsets.zero, viewInsets: EdgeInsets.zero, systemGestureInsets: EdgeInsets.zero, alwaysUse24HourFormat: false, accessibleNavigation: false, highContrast: false, onOffSwitchLabels: false, disableAnimations: false, invertColors: false, boldText: false, navigationMode: traditional, gestureSettings: DeviceGestureSettings(touchSlop: null), displayFeatures: [], supportsShowingSystemContextMenu: false))
       └FocusTraversalGroup(policy: ReadingOrderTraversalPolicy#9bb45, state: _FocusTraversalGroupState#c8c8d)
        └Focus(debugLabel: "FocusTraversalGroup", focusNode: _FocusTraversalGroupNode#1ee5d(FocusTraversalGroup [IN FOCUS PATH]), state: _FocusState#deea3)
         └_FocusInheritedScope
          └_FocusScopeWithExternalFocusNode(debugLabel: "View Scope", focusNode: FocusScopeNode#98f92(View Scope [IN FOCUS PATH]), dependencies: [_FocusInheritedScope], state: _FocusScopeState#7ba60)
           └_FocusInheritedScope
            └MyApp
     
```

但實際使用後會發現，這份輸出往往冗長又難以閱讀。即使是一個簡單的 Counter App，Widget Tree 也可能超過兩百行，每行還充滿細節資訊。因此，透過 `debugDumpApp` 來排查畫面問題在實務上並不方便。

那麼，我們該怎麼辦？在介紹解法之前，先來認識另一種測試方式——**Golden Test**。

## 什麼是 Golden Test

除了常見的 Unit Test、Widget Test 與 Integration Test 之外，Flutter 還有第四種測試：**Golden Test**。它不是用程式邏輯比對結果，而是透過**畫面比對**的方式確認 UI 是否異動。

Golden Test 的原理很簡單：

1. 先將正確的畫面狀態儲存為基準圖（snapshot）。
2. 下次執行測試時，再將目前畫面與基準圖比較。
3. 若畫面有任何變化，就會自動產生差異圖檔，讓開發者快速檢查變動位置。

使用方式也很直觀：

```dart
expect(find.byType(MaterialApp), matchesGoldenFile("snapshot.png"));
```

若結果不同，Flutter 會在 snapshot.png 旁邊自動產生比較結果，使用者就能確認變動是否預期：

```bash
test
├── failures
│   ├── snapshot_isolatedDiff.png
│   ├── snapshot_maskedDiff.png
│   ├── snapshot_masterImage.png
│   ├── snapshot_testImage.png
├── snapshot.png
└── widget_test.dart
```

如果確認畫面變動是預期內的修改，只需執行以下指令即可更新基準圖：

```dart
flutter test --update-goldens
```

聰明的你可能已經想到：我們能否利用 Golden Test 的特性，讓 Widget Test 也能快速檢查畫面呢？

## 使用 matchesGoldenFile 直接顯示畫面

在 Widget Test 中，我們雖然不是真的在做 Golden Test，但其實還是可以使用 `matchesGoldenFile` 來將當前的畫面結果印出來。印出來之後，我們就能更快的檢查畫面是不是符合預期，而不用看 `debugDumpApp` 的那一長串資料了。

雖然在 Widget Test 中我們並非真正執行 Golden Test，但仍可透過 `matchesGoldenFile` 來**輸出當前畫面結果**。

這樣一來，我們就能以圖像的方式檢查畫面是否如預期，而不必苦讀 `debugDumpApp` 的長篇輸出。

![snapshot.png](%E9%80%99%E5%80%8B%20Flutter%20%E5%B0%8F%E6%8A%80%E5%B7%A7%EF%BC%8C%E8%AE%93%E4%BD%A0%E7%9C%8B%E6%87%82%20Widget%20Test%20%E5%88%B0%E5%BA%95%E5%93%AA%E8%A3%A1%E5%A3%9E%E4%BA%86/snapshot.png)

儘管測試環境中使用的字型可能與真實 App 不同（例如無法顯示文字或 Icon），但大部分畫面元素仍足以協助我們判斷 UI 是否正常。

下次當 Widget Test 報錯卻不知從何下手時，試著加入 `matchesGoldenFile`，你可能能立刻看出問題所在。

**注意事項**：`matchesGoldenFile` 在 Widget Test 只是一種用來 Debug 的手段，不適合一直放在測試中，務必在問題解決之後移除。

## 小結

Widget Test 是在速度與真實性之間取得平衡的測試方式，能快速驗證 App 的行為並提升測試覆蓋率。然而，它的除錯難度也較高。

在進行逐步除錯（debug）之前，不妨先透過 `matchesGoldenFile` 生成畫面快照，快速比對結果。這個簡單的技巧，常能讓你瞬間發現問題根源。