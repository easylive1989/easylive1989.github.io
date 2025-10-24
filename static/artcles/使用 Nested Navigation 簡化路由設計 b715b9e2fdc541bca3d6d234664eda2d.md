# 使用 Nested Navigation 簡化路由設計

新增時間: April 23, 2022 10:41 AM
最後編輯時間: October 2, 2025 11:53 PM
id: b715b9e2fdc541bca3d6d234664eda2d
完成: Yes
類型: Medium
🧩 領域: Flutter (https://www.notion.so/Flutter-aec5ea3a198f49e18989ab7f4c851169?pvs=21)

Flutter 習慣在最頂層的 MaterialApp 或 CupertinoApp 中統一定義整個 app 的路由管理。當我們把所有頁面的路由管理都放在最頂層時，就會讓它變得很長，不容易維護。或許應該適時思考，是否某些頁面的路由不應該被管理在最頂層。今天就來分享工作上遇到的一個情境，以及它存在什麼問題，而我們又是如何解決的。

## 舉個例子

假設我們需要實作一個搜尋附近裝置並傳輸檔案到該裝置的需求，一開始我們會搜尋附近裝置，完成之後，畫面會顯示可選擇的裝置清單給使用者進行選擇，當使用者完成選擇之後，畫面會列出檔案清單讓使用者選擇，當使用者選完檔案並按下 Transfer 按鈕後進行傳輸工作。當傳輸工作完成時，回到最一開始的頁面，並顯示 Transfer success 的訊息讓使用者知道。

![nested navigation.drawio.png](%E4%BD%BF%E7%94%A8%20Nested%20Navigation%20%E7%B0%A1%E5%8C%96%E8%B7%AF%E7%94%B1%E8%A8%AD%E8%A8%88/nested_navigation.drawio.png)

## 用 Top-Level Navigation 方式實作

我們設計了三個頁面，分別是 SearchDevicesPage、SelectDevicePage 和 SelectFilePage，三個頁面的工作分別是搜尋裝置、讓使用者選擇裝置和 讓使用者選擇檔案，每個頁面都是定義在頂層的路由。為此，我們在路由管理中有了起始頁面 Home 與傳輸檔案所需要的三個頁面。

```dart
Route _onGenerateRoute(RouteSettings routeSettings) {
  if (routeSettings.name == HomePage.routeName) {
    return MaterialPageRoute(builder: (BuildContext context) => const HomePage());
  } else if (routeSettings.name == SearchDevicesPage.routeName) {
    return MaterialPageRoute<TransferResult>(
      builder: (BuildContext context) => const SearchDevicesPage(),
      settings: routeSettings,
    );
  } else if (routeSettings.name == SelectDevicePage.routeName) {
    return MaterialPageRoute<TransferResult>(
      builder: (BuildContext context) => const SelectDevicePage(),
      settings: routeSettings,
    );
  } else if (routeSettings.name == SelectFilePage.routeName) {
    return MaterialPageRoute<TransferResult>(
      builder: (BuildContext context) => const SelectFilePage(),
      settings: routeSettings,
    );
  }
  throw RouteNotFoundException("Need to implement ${routeSettings.name}");
}
```

當使用者在 Home 頁面中按下 + 按鈕，想要傳輸檔案時，程式會先打開 SearchDevicesPage 並開始搜尋附近的裝置。當搜尋完成並且使用者按下 Next 按鈕後，程式會開啟下一個頁面：SelectDevicePage，並把搜尋到的裝置清單傳給下一個頁面顯示。

```dart
Future _openSelectDevicePage(BuildContext context, List<Device> devices) async {
  Navigator.of(context).pushNamed(SelectDevicePage.routeName, arguments: devices);
}
```

在 SelectDevicePage 中，畫面會顯示裝置清單。當使用者選擇任一裝置後按下 Next，程式就會開啟下一個頁面：SelectFilePage，並且把使用者選擇的裝置傳給它。

```dart
Future _openSelectFilePage(BuildContext context) async {
  Navigator.of(context).pushNamed(SelectFilePage.routeName, arguments: selectedDevice);
}
```

當使用者來來到 SelectFilePage 時，畫面會顯示檔案清單。當使用者選擇任一檔案後按下 Next，程式會使用上一個頁面給的裝置與這個頁面選擇的檔案進行傳輸工作。當傳輸工作完成之後，把傳輸結果往回傳遞。

```dart
await _transfer(selectedDevice, selectedFile!);
Navigator.pop(context, TransferResult.success);
```

當 Navigator.pop 執行後，首先回到的是 SelectDevicePage 的 _openSelectDevicePage 方法中。我們需要修改這個方法，讓他可以取得從 SelectFilePage 得到傳輸的結果，並把他回傳給上一頁。

```dart
Future _openSelectFilePage(BuildContext context) async {
  TransferResult? transferResult = await Navigator.of(context).pushNamed<TransferResult>(SelectFilePage.routeName, arguments: selectedDevice);
  Navigator.pop(context, transferResult);
}
```

同樣的 SearchDevicesPage 也需要進行修改，同樣的讓他可以把結果帶回給 HomePage。

```dart
Future _openSelectDevicePage(BuildContext context, List<Device> devices) async {
  TransferResult? transferResult = await Navigator.of(context).pushNamed<TransferResult>(SelectDevicePage.routeName, arguments: devices);
  Navigator.of(context).pop(transferResult);
}
```

在 HomePage 中，當程式從 SearchDevicesPage 回來時，就可以取得傳輸檔案的結果，並決定畫面如何顯示。以下面程式碼來說，當傳輸成功時，我們會在畫面上顯示一個 Snackbar 訊息提示傳輸成功。

```dart
Future _openSearchDevicePage(BuildContext context) async {
  TransferResult? transferResult = await Navigator.of(context).pushNamed<TransferResult>(SearchDevicesPage.routeName);
  if (transferResult == TransferResult.success) {
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Transfer success")));
  }
}
```

[完整程式碼](https://github.com/easylive1989/transfer_file/tree/pop_with_result)

## 作法分析

這種設計可能存在一些問題

- 頁面會被強迫知道他不需要的資訊

以上面的例子來說，SelectFilePage 本身的工作應該是讓使用者選擇檔案，但是他卻也同時必須儲存使用者選擇的裝置，只為了完成傳輸的工作。或許我們可以把傳輸的工作移到 HomePage，但是這樣一來，我們也會需要把使用者選擇的裝置和檔案往回傳，同樣的造成 SelectDevicePage 也需要知道檔案的資訊，兩種做法都無可避免的導致某些頁面知道他不需要知道的資訊。

```dart
Future _openTransferFilePage(BuildContext context) async {
  File? file = await Navigator.of(context).pushNamed<File>(SelectFilePage.routeName);
  if (file != null) {
    Navigator.pop(context, TransferAction(selectedDevice!, file));
  }
}
```

- 流程路徑上的每個頁面都需要知道如何處理結果

在上面例子中，每個頁面都會需要接回 TransferFileResult，並在 Navigator.pop() 中往回帶，這也表示每個頁面都需要知道 TransferResult 的存在，以及決定如何處理它。但實際上只有 HomePage 是真正需要的人，決定這個結果的是 SelectFilePage，它跟 HomePage 隔了兩個頁面，導致中間的頁面需要幫忙傳遞它們不需要的資訊。 

```dart
TransferResult? transferResult = await Navigator.of(context).pushNamed<TransferResult>(...);
Navigator.pop(context, transferResult);
```

這些問題容易導致這些頁面無法重複使用，假設今天多了一種需求：同樣的選擇 Device，同樣的選擇檔案，最後卻是要傳送檔案資訊的文字，而不是傳送檔案本身。如果依照原本的設計修改的話，就會變成需要把最後的行為抽成方法或類別，把他從第一個頁面一路往下一個頁面傳，直到最後一個頁面，但是這個傳遞參數跟中間過程的頁面的工作毫無關係，他只是為了最後一個頁面需要而幫忙傳遞，提高了頁面之間的耦合度。

## 用 Nested Navigation 實作

為了解決這個問題，我們使用 [Nest Navigation](https://docs.flutter.dev/cookbook/effects/nested-nav) 來處理，讓頁面只知道自己需要的訊息，並且輸出他工作後的結果，至於如何使用就讓使用方來決定。

我們使用上面的例子進行修改，先創建一個 TransferFileFlow，並在其中使用 Navigator Widget，給定一個 GlobalKey 放進 Navigator 中，我們需要使用 GlobalKey 來進行 Nested Navigator 的頁面切換。

```dart
class TransferFileFlow extends StatefulWidget {
  static const String routeName = "transfer-file-flow";

  const TransferFileFlow({Key? key}) : super(key: key);

  @override
  State<TransferFileFlow> createState() => _TransferFileFlowState();
}

class _TransferFileFlowState extends State<TransferFileFlow> {
  final GlobalKey<NavigatorState> _nestedNavigatorKey = GlobalKey<NavigatorState>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Navigator(
        key: _nestedNavigatorKey,
        initialRoute: SearchDevicesPage.routeName,
        onGenerateRoute: _onGenerateRoute,
      ),
    );
  }
}
```

在 Navigator 中傳入 _onGenerateRoute，定義 TransferFileFlow 各個頁面的路由與實際頁面的關係。並把相對應的 callback 傳入實際頁面中，讓每一個頁面完成工作時可以通知 TransferFileFlow，讓 TransferFileFlow 可以切換到下一個頁面。比如說 SelectDevicePage 就傳入了 _onDeviceSelected，當使用者選擇了任一裝置後，就會呼叫 _onDeviceSelected，而 TransferFileFlow 就進行流程的下一步了。

```dart
Route _onGenerateRoute(RouteSettings routeSettings) {
  if (routeSettings.name == SearchDevicesPage.routeName) {
    return MaterialPageRoute(
      builder: (BuildContext context) => SearchDevicesPage(
        onBack: _onSearchDevicesPageClose,
        onDevicesSearched: _onDevicesSearched,
      ),
    );
  } else if (routeSettings.name == SelectDevicePage.routeName) {
    return MaterialPageRoute(
      builder: (BuildContext context) => SelectDevicePage(
        searchedDevices: searchedDevices,
        onDeviceSelected: _onDeviceSelected,
      ),
    );
  } else if (routeSettings.name == SelectFilePage.routeName) {
    return MaterialPageRoute(
      builder: (BuildContext context) => SelectFilePage(
        onFileSelected: _onFileSelected,
      ),
    );
  }
  throw RouteNotFoundException("Need to implement ${routeSettings.name}");
}
```

在每個 callback 中，TransferFileFlow 接收每一個頁面的輸出，並暫存在自己身上。在最後一個頁面完成之後，就進行傳輸檔案的動作。

```dart
void _onDevicesSearched(List<Device> devices) {
  searchedDevices = devices;
  _nestedNavigatorKey.currentState?.pushNamed(SelectDevicePage.routeName);
}

void _onDeviceSelected(Device device) {
  selectedDevice = device;
  _nestedNavigatorKey.currentState?.pushNamed(SelectFilePage.routeName);
}

Future _onFileSelected(File file) async {
  selectedFile = file;
  await _transfer(selectedDevice, selectedFile);
  Navigator.of(context).pop(TransferResult.success);
}
```

當整個 TransferFileFlow 的流程完成之後，TransferFileFlow 就會回傳 TransferResult 給 HomePage。中間也不存在任何頁面幫忙傳遞結果，而是 TransferFileFlow 送出結果，HomePage 下一秒收到後就馬上使用。

```dart
Future _openTransferFileFlow(BuildContext context) async {
  TransferResult? transferResult = await Navigator.of(context).pushNamed<TransferResult>(TransferFileFlow.routeName);
  if (transferResult != null) {
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Transfer success")));
  }
}
```

至於原本頂層路由管理就會只剩下 HomePage 與 TransferFlow，也會變得簡單一些。

```dart
Route _onGenerateRoute(RouteSettings routeSettings) {
  if (routeSettings.name == HomePage.routeName) {
    return MaterialPageRoute(builder: (BuildContext context) => const HomePage());
  } else if (routeSettings.name == TransferFileFlow.routeName) {
    return MaterialPageRoute<TransferResult>(builder: (BuildContext context) => const TransferFileFlow());
  }
  throw RouteNotFoundException("Need to implement ${routeSettings.name}");
}
```

[完整程式碼](https://github.com/easylive1989/transfer_file/tree/nested_navigator)

## 作法分析

- 傳遞給頁面的參數恰好是頁面所需要的

使用 Nested Navigation，把控制流程的的工作轉交給 TransferFileFlow，由 TransferFileFlow 把頁面需要的參數直接傳給它，頁面再也不需要幫忙傳遞任何參數。以上面的例子來說，我們再也不需要把使用者選擇的 Device 傳給 SelectFilePage 了，讓 SelectDevicePage 處理完之後傳給 TransferFileFlow，SelectFilePage 只要專注地處理使用者選擇的 File，並把使用者選擇的 File 傳給 TransferFileFlow，最後由 TransferFileFlow 組合資訊並完成工作。

- 頁面無須處理與流程相關的邏輯

頁面做完工作之後，也只需要專注的輸出結果給 Flow，由 Flow 來蒐集必要資訊，用以完成傳輸工作，並決定傳輸結果。當今天多了另一個類似需求，我們就可以創建另一個 Flow，該 Flow 可以根據需求來組合需要的頁面，最後再進行不同的操作，讓頁面不會因為與前後頁面之間的耦合導致難以重複使用。

## 結論

Nested Navigation 十分適合使用在這種固定流程的工作上，如果頁面沒辦法單獨提供功能，而是需要多個頁面共同組合出一個功能的話，就很適合使用 Nested Navigation 這種做法。當一個頁面能提供完整的功能，例如顯示比賽資訊，顯示裝置詳細資訊，或者是更新使用暱稱這種單一頁面就可以完成的，或許就不太需要特別使用 Nested Navigation。

## 參考

- [https://docs.flutter.dev/cookbook/effects/nested-nav](https://docs.flutter.dev/cookbook/effects/nested-nav)