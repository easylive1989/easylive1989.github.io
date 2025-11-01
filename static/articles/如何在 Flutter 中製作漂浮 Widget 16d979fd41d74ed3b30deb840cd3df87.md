# 如何在 Flutter 中製作漂浮 Widget

新增時間: October 11, 2021 9:51 PM
最後編輯時間: October 24, 2025 5:22 PM
id: 16d979fd41d74ed3b30deb840cd3df87
類型: 輸出文章
🧩 領域: Flutter (https://www.notion.so/Flutter-aec5ea3a198f49e18989ab7f4c851169?pvs=21)

![image.png](%E5%A6%82%E4%BD%95%E5%9C%A8%20Flutter%20%E4%B8%AD%E8%A3%BD%E4%BD%9C%E6%BC%82%E6%B5%AE%20Widget/image.png)

今天在工作中碰到一個需求，需要顯示漂浮 Widget，類似於 Dialog 那樣漂浮於畫面之上，但是需要客製自己的 Widget。於是自己做了一些研究，研究如何製作這種漂浮於畫面最上層的 Widget，本篇就來分享一下兩種製作漂浮 Widget 的方式。

## 使用 Stack

自己一開始想到最簡單的辦法是，透過在外層使用 Stack，並在 Stack 放入 child 與漂浮 Widget，讓漂浮 Widget 蓋在 child 之上，達到漂浮 Widget 可以漂浮在 child 之上，最後提供一個控制顯示的方法，讓使用端可以傳入客製化 Widget。

```dart
class FloatingWidgetState extends State<FloatingWidget> {
  Widget? _floatingWidget;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        if (_floatingWidget != null)
          Center(
            child: _floatingWidget,
          ),
      ],
    );
  }

  void show(Widget child) {
    setState(() {
      _floatingWidget = child;
    });
  }
}
```

在 Widget 中提供 of 方法讓使用端更方便使用

```dart
class FloatingWidget extends StatefulWidget {
  final Widget child;

  const FloatingWidget({Key? key, required this.child}) : super(key: key);

  @override
  FloatingWidgetState createState() => FloatingWidgetState();
}
```

使用端則是可以透過 context 找到 FloatingWidget，並呼叫 show() 傳入客製化 Widget 並顯示畫面上層。

```dart
class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: FloatingWidget(
        child: Scaffold(
          appBar: AppBar(title: Text("Floating Widget Example")),
          body: Builder(
            builder: (context) {
              return ElevatedButton(
                onPressed: () {
                  FloatingWidget.of(context).show(
                    Card(
                      elevation: 5.0,
                      child: Padding(
                          padding: EdgeInsets.all(8),
                          child: Text("My Floating Widget")),
                      color: Colors.blue,
                    ),
                  );
                },
                child: Text("Click Me"),
              );
            },
          ),
        ),
      ),
    );
  }
}
```

使用 Stack 的做法有個缺點，根據放置 FloatingWidget 的地方不同，它能蓋住的層級也會不同。如果想讓所有 Route 都能使用 FloatingWidget，就需要把 FloatingWidget 放在 MaterialApp 之上。但是若把 Stack 直接放在 MaterialApp 之外，執行時就會報錯，會需要額外處理。

## 使用 Overlay

Flutter 定義好的 MaterialApp 中包了很多東西，其中就包含了 Overlay 這個 Widget，透過這個 Widget，我們可以客製我們想要的 Widget，並使之漂浮於畫面最上層。

```dart
Overlay.of(context)?.insert(
  OverlayEntry(
    builder: (context) {
      return Text("My Floating Widget");
    },
  ),
);
```

當要移除時，則需要使用剛剛 insert 進去的 OverlayEntry，所以使用端需要暫存 OverlayEntry。

```dart
class MyApp extends StatelessWidget {
  final OverlayEntry _overlayEntry = OverlayEntry(
    builder: (context) {
      return Center(
        child: Card(
          elevation: 5.0,
          child: Padding(
            padding: EdgeInsets.all(8),
            child: Text("My Floating Widget"),
          ),
          color: Colors.blue,
        ),
      );
    },
  );

  MyApp({Key? key}) : super(key: key);

  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("Floating Widget Example")),
      body: Builder(
        builder: (context) {
          return ElevatedButton(
            onPressed: () {
              if (_overlayEntry.mounted) {
                _overlayEntry.remove();
              } else {
                Overlay.of(context)!.insert(_overlayEntry);
              }
            },
            child: Text("Click Me"),
          );
        },
      ),
    );
  }
}
```

使用 Overlay 做法相對於 Stack 作法來說，使用上比較方便一點。但免不了還是有一些缺點。使用 OverlayEntry 所產生的 Floating Widget 會漂浮於畫面最上層，甚至是所有 route 之上。當使用端 insert 了一個 Floating Widget，如果沒有先移除這個 Floating Widget 就 route 到其他頁面，就會發現 Floating Widget 仍舊漂浮於新頁面之上。所以使用 Overlay 做法時，會需要花一些心思控制 Floating Widget 的顯示與隱藏時機，讓 UI 顯示邏輯更合理。

## 小結

其實在 [pub.dev](http://pub.dev) 上已經有不少套件能顯示客製的漂浮 Widget 了，我自己最後也是直接使用套件。畢竟套件若能完美貼合自己的需求，那就沒有必要再自己造一個輪子了。但是經過一些研究，才發現還有 Overlay 這個 Widget 存在，也對 Flutter 更瞭解了一些。