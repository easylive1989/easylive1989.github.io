# Flutter Notification 事件機制研究

新增時間: August 31, 2021 1:46 PM
最後編輯時間: October 24, 2025 5:22 PM
id: 349055b3e6dc43c5976af586d01cbe81
類型: 輸出文章
🧩 領域: Flutter (https://www.notion.so/Flutter-aec5ea3a198f49e18989ab7f4c851169?pvs=21)

![image.png](Flutter%20Notification%20%E4%BA%8B%E4%BB%B6%E6%A9%9F%E5%88%B6%E7%A0%94%E7%A9%B6/image.png)

## 什麼是 Notification 事件

當 CustomScrollView 或 ListView 開始滑動時，可以使用 NotificationListener 捕捉  ScrollStartNotification 的 Notification 事件。這些 Widget 會在滾動開始、進行中、結束時，發出各式各的 Notification 事件。

```dart
ScrollStartNotification(metrics: metrics, context: context);

ScrollUpdateNotification(metrics: metrics, context: context, scrollDelta: scrollDelta);

ScrollEndNotification(metrics: metrics, context: context);
```

## 如何送出 Notification 事件

送 Notification 事件的方式很簡單，以上面的 ScrollEndNotification 事件為例，只要呼叫 Notification 身上的 dispatch 方法，Notification 就會以同步的方式往上傳遞 Notification 事件。

```dart
ScrollEndNotification(metrics: metrics, context: context).dispatch(context);
```

## Dispatch Notification 事件

dispatch 是 Notification 這個抽象類別身上的一個方法，主要功能是送通知給上層 Widget。當 dispatch 被呼叫時，它沿著 Element Tree 一路往上，遇到 NotificationListener 時，就會呼叫 NotificationListener 的 _dispatch。（這邊的 _dispatch 不同於 Notification 身上的 dispatch）

```dart
abstract class Notification {

  @protected
  @mustCallSuper
  bool visitAncestor(Element element) {
    if (element is StatelessElement) {
      final StatelessWidget widget = element.widget;
      if (widget is NotificationListener<Notification>) {
        if (widget._dispatch(this, element)) // that function checks the type dynamically
          return false;
      }
    }
    return true;
  }

  void dispatch(BuildContext? target) {
    // The `target` may be null if the subtree the notification is supposed to be
    // dispatched in is in the process of being disposed.
    target?.visitAncestorElements(visitAncestor);
  }

  ...
}
```

## Notification 事件傳遞

當 _dispatch 被呼叫時，它嘗試呼叫傳入的 onNotification 的 callback。onNotification callback 會回傳 bool 值，用以決定這個 Notification 事件是否繼續往上通知，如果回傳 true，表示阻斷這個 Notification 事件繼續往上，這個 Notification 就不會被更外層的 NotificationListener 收到了。相反的，如果回傳 false，則會繼續往上傳遞這個 Notification 事件。

```dart
class NotificationListener<T extends Notification> extends StatelessWidget {
  
	...
	
  final NotificationListenerCallback<T>? onNotification;

  bool _dispatch(Notification notification, Element element) {
    if (onNotification != null && notification is T) {
      final bool result = onNotification!(notification);
      return result == true; // so that null and false have the same effect
    }
    return false;
  }

}
```

比方說以下面這段代碼為例，當使用者按下 Click me 按鈕送出 MyNotification 之後，最靠近 Button  的 NotificationListener 會收到 Notification，並印出 "Receive notification inside"，隨即回傳了 true，也終止了事件繼續往上傳遞，外層 NotificationListener 也就收不到 Notification，在 Console 就只會印出 "Receive notification inside"，而沒有印出 "Receive notification outside"。

```dart
class MyNotificationWidget extends StatelessWidget {
  const MyNotificationWidget({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return NotificationListener<MyNotification>(
      onNotification: (notification) {
        print("Receive notification outside");
        return false;
      },
      child: NotificationListener<MyNotification>(
        onNotification: (notification) {
          print("Receive notification inside");
          return true;
        },
        child: Builder(
          builder: (context) {
            return TextButton(
              child: Text("Click me"),
              onPressed: () {
                MyNotification().dispatch(context);
              },
            );
          },
        ),
      ),
    );
  }
}
```

## 客製化 Notification 事件

除了 Scroll 的 Notification 事件，我們也可以定義自己的 Notification 事件

```dart
class MyNotifcation extends Notification {}
```

在需要的時候，使用 Notification 身上的 dispatch 發送事件

```dart
MyNotifcation().dispatch(context);
```

最後在 Widget 中使用 NotificationListener 接收事件

```dart
@override
Widget build(BuildContext context) {
  return NotificationListener<MyNotification>(
    onNotification: (notification) {
      setState(() {
        _count++;
      });
      return false;
    },
    child: Text(
      'count: $_count',
      style: Theme.of(context).textTheme.headline4,
    ),
  );
}
```

## 小結

Notification 事件提供了一種機制讓子層 Widget 通知父層 Widget，用法也相當的簡單，且可以通知多個 NotificationListener，不過需要注意的是，Notification 事件通知的方式是同步的，所以盡量不要再 onNotification 中執行耗時的操作，否則可能會影響畫面更新。