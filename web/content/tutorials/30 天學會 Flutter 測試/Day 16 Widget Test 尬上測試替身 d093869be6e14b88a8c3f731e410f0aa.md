# Day 16 Widget Test 尬上測試替身

大多時候，我們在開發 Flutter 程式時，我們都會依賴遠端 Server 或第三方協作，無論是獲取使用者資訊，或者其他重要資料。我們會直接呼叫遠端 Server 的 Web API，或者是透過套件去使用第三方的 API。在討論單元測試時，我們有談論到如何用測試替身去隔離這些依賴，而同樣的，同樣的 Widget Test 也可以，今天就來談談如何在 Widget Test 中使用測試替身吧。

## 呼叫 API

假設我們有一個顯示狗狗的各種品種的 Widget，在這個範例中我們會使用 [Dog API](https://dog.ceo/dog-api/) 取得品種的列表。

![Untitled](Day%2016%20Widget%20Test%20%E5%B0%AC%E4%B8%8A%E6%B8%AC%E8%A9%A6%E6%9B%BF%E8%BA%AB/Untitled.png)

實作一個 DogBreedsWidget 中，然後在 Widget 中建立 DogRepository 並呼叫 get 方法，最後由 FutureBuilder 等待與顯示畫面。[[範例連結](https://dartpad.dev/?id=2112109aa06767cb408c9c77f67bfb8c)]

```dart
class DogBreedsWidget extends StatelessWidget {
  const DogBreedsWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<String>>(
      future: DogRepository().get(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const CircularProgressIndicator();
        }

        return ListView.builder(
          itemCount: snapshot.data!.length,
          itemBuilder: (context, index) {
            return ListTile(
              title: Text(snapshot.data![index]),
            );
          },
        );
      },
    );
  }
}

class DogRepository {
  Future<List<String>> get() async {
    var response = await http.get(Uri.parse("https://dog.ceo/api/breeds/list/all"));
    return jsonDecode(response.body)["message"].keys.toList();
  }
}
```

如果我們直接為這個 Widget 寫 Widget Test 並執行，然後就會發現測試出現紅燈。

```dart
void main() {
  testWidgets("show breed in dog app", (tester) async {
    await tester.pumpWidget(const MaterialApp(home: DogBreedsWidget()));

    expect(find.text("affenpinscher"), findsOneWidget);
    expect(find.text("african"), findsOneWidget);
    expect(find.text("airedale"), findsOneWidget);
  });
}
```

我們仔細看錯誤訊息的話，會發現 Widget Test 與單元測試不同，在 Widget Test 中並不會真的去打遠端 API，而是需要我們做假資料給他的。

```
Warning: At least one test in this suite creates an HttpClient. When
running a test suite that uses TestWidgetsFlutterBinding, all HTTP
requests will return status code 400, and no network request will
actually be made. Any test expecting a real network connection and
status code will fail.
To test code that needs an HttpClient, provide your own HttpClient
implementation to the code under test, so that your test can
consistently provide a testable response to the code under test.
```

## 注入 DogRepository 到 Widget 中

讓我們稍微修改一下程式碼，與單元測試的注入技巧一樣，把 DogRepository 傳入 Widget 中，讓 Widget 使用傳入的外部依賴，這樣一來，當我們測試 Widget 時，就能控制結果了。[[範例連結](https://dartpad.dev/?id=f5f93ee63223615b2f3c29bbad49bb1f)]

```dart
class DogBreedsWidget extends StatelessWidget {
  const DogBreedsWidget({super.key, required this.dogRepository});

  final DogRepository dogRepository;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<String>>(
      future: dogRepository.get(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const CircularProgressIndicator();
        }

        return ListView.builder(
          itemCount: snapshot.data!.length,
          itemBuilder: (context, index) {
            return ListTile(
              title: Text(snapshot.data![index]),
            );
          },
        );
      },
    );
  }
}
```

同時，我們也修改測試，增加 MockDogRepository 做假資料，在測試中傳入 DogBreedsWidget 中，驗證結果部分沒有變動。

```dart
@GenerateNiceMocks([MockSpec<DogRepository>()])
void main() {
  testWidgets("show breed in dog app", (tester) async {
    MockDogRepository mockDogRepository = MockDogRepository();
    when(mockDogRepository.get()).thenAnswer(
      (invocation) async => ["affenpinscher", "african", "airedale"],
    );

    await tester.pumpWidget(MaterialApp(home: DogBreedsWidget(dogRepository: mockDogRepository)));
    await tester.pump();

    expect(find.text("affenpinscher"), findsOneWidget);
    expect(find.text("african"), findsOneWidget);
    expect(find.text("airedale"), findsOneWidget);
  });
}
```

最後我們也成功得到一個綠燈了。

## 層層注入的麻煩

在其他框架例如 C# 的 .NET Core 或 Java 的 Spring Boot 中，都自帶有依賴注入，只要我們在類別的建構子定義好依賴，框架就會在需要的時候幫我們注入，我們幾乎不需要手動 new 一個類別。

但是在 Flutter 中，由於 Flutter 的宣告式 UI 設計，讓我們開發畫面的時後，都必須在程式碼中 new Widget，然後管理 Widget 之間的上下層關係。也因為每個 Widget 都是自己 new 出來的，所以如果要從建構子注入依賴，也只能手動注入。像是上面例子，假設 DogBreedsWidget 外面還有一個 AnimalWidget 和 LiveBeingWidget 的話，那我們要怎麼把 DogRepository 交給 DogBreedsWidget 呢？

![Discuss - Repository passing issue.jpg](Day%2016%20Widget%20Test%20%E5%B0%AC%E4%B8%8A%E6%B8%AC%E8%A9%A6%E6%9B%BF%E8%BA%AB/Discuss_-_Repository_passing_issue.jpg)

我們在 main 方法建立所有依賴，然後把依賴傳給第一層 LiveBeingWidget，LiveBeingWidget 傳給第二層 AnimalWidget，以此累推，無窮無盡。當專案一大，帶來的維護麻煩肯定是超乎想像。

為了處理這個問題，我們通常會找一些套件例如：Provider 或 getIt 來處理依賴注入，或者是使用 riverpod、Bloc 這種本身也提供依賴注入功能的狀態管理套件。

## 使用 Provider

如果我們使用 Provider 來修改一下，讓 DogBreedsWidget 不再傳入 DogRepository，而是從 Provider 身上取得。正式程式中，就可以在最上層 Widget 包上 Provider，此後在 Widget 的任何地方就都能使用 [context.read](http://context.read) 取得 Repository 了。[[範例連結](https://dartpad.dev/?id=e7ab076476a74d8188ee6d976f4a3af6)]

```dart
main() {
  runApp(
    Provider(
      create: (context) => DogRepository(),
      child: const MaterialApp(home: DogBreedsWidget()),
    ),
  );
}

class DogBreedsWidget extends StatelessWidget {
  const DogBreedsWidget({super.key});

  @override
  Widget build(BuildContext context) {
    var repository = context.read<DogRepository>();

    return Scaffold(
			body: FutureBuilder<List<String>>(
		    future: repository.get(),
		    builder: (context, snapshot) {
		      ...
		    },
			),
		);
  }
}
```

而測試這邊也可以在 pumpWidget 時，再多包一個 Provider 注入 MockDogRepository，以達到控制輸入的目的。

```dart
@GenerateNiceMocks([MockSpec<DogRepository>()])
void main() {
  testWidgets("show breed in dog app", (tester) async {
    var mockDogRepository = MockDogRepository();
    when(mockDogRepository.get()).thenAnswer(
      (invocation) async => ["affenpinscher", "african", "airedale"],
    );

    await tester.pumpWidget(Provider<DogRepository>.value(
      value: mockDogRepository,
      child: const MaterialApp(home: DogBreedsWidget()),
    ));

    await tester.pump();

    expect(find.text("affenpinscher"), findsOneWidget);
    expect(find.text("african"), findsOneWidget);
    expect(find.text("airedale"), findsOneWidget);
  });
}
```

## 以 get_it 改寫

但如果開發者是使用 get_it 的話，就比較接近傳統依賴注入的 [Service Locator 模式](https://zh.wikipedia.org/zh-tw/%E6%9C%8D%E5%8A%A1%E5%AE%9A%E4%BD%8D%E5%99%A8%E6%A8%A1%E5%BC%8F)，Widget 會直接使用 getIt 取得依賴，而非透過 BuildContext 的協助。[[範例連結](https://gist.github.com/easylive1989/990f852383196ac1bffbd059dcf75139)]

```dart
class DogBreedsWidget extends StatelessWidget {
  const DogBreedsWidget({super.key});

  @override
  Widget build(BuildContext context) {
    var repository = getIt<DogRepository>();

    return FutureBuilder<List<String>>(
      future: repository.get(),
      builder: (context, snapshot) {
        ...
      },
    );
  }
}
```

在測試中，get_it 就不是使用包 Widget 的方式處理依賴，而是需要呼叫 getIt 的 register 方法，主動將依賴放到 DI 容器中。

```dart
@GenerateNiceMocks([MockSpec<DogRepository>()])
void main() {
  late MockDogRepository mockDogRepository;

  setUp(() {
    mockDogRepository = MockDogRepository();
    getIt.registerSingleton<DogRepository>(mockDogRepository);
  });

  testWidgets("show breed in dog app", (tester) async {
    when(mockDogRepository.get()).thenAnswer(
      (invocation) async => ["affenpinscher", "african", "airedale"],
    );

    await tester.pumpWidget(const MaterialApp(home: DogBreedsWidget()));

    await tester.pumpAndSettle();

    expect(find.text("affenpinscher"), findsOneWidget);
    expect(find.text("african"), findsOneWidget);
    expect(find.text("airedale"), findsOneWidget);
  });
}
```

## 小結

無論是使用 Provider 或 get_it，或者是其他依賴注入套件，都能解決 Widget Test 的依賴注入問題。但是相比於單元測試來說，Widget Test 處理起來還是稍微麻煩一點，我們需要在測試中使用依賴注入的套件來設定依賴，讓 Widget 在測試中能正確使用假資料。雖然麻煩，但我們卻獲得了比單元測試更接近真實的測試，同時保有單元測試的穩定性與快速執行的優點。

## 不只有 Repository

雖然在我們的例子中，我們都是用這些狀態管理套件來管理 Repository，但在實務中，我們也會用來管理 Controller/Presenter/ViewModel，甚至是 Use Case。

![Untitled](Day%2016%20Widget%20Test%20%E5%B0%AC%E4%B8%8A%E6%B8%AC%E8%A9%A6%E6%9B%BF%E8%BA%AB/Untitled%201.png)

## Provider 的小小限制

雖然在我們的例子中，我們都把 Provider 拿來放 Repository，但是 Provider 也可以拿來被拓展成狀態管理套件，例如：[flutter_bloc](https://pub.dev/packages/flutter_bloc)。但是當我們用 Provider 

Provider 的機制看似很好的解決了注入的問題，但有時還是會碰到一些限制。當我們的依賴需要動態建立時，可能還是會在 Widget 中 new 出一個實例，此時外層 Widget 的測試依舊會碰到無法注入假依賴的問題。

![Discuss - Frame 3 (4).jpg](Day%2016%20Widget%20Test%20%E5%B0%AC%E4%B8%8A%E6%B8%AC%E8%A9%A6%E6%9B%BF%E8%BA%AB/Discuss_-_Frame_3_(4).jpg)

在這個例子中，UserListWidget 使用 Provider 建立 UserDetailRepository 並帶入 userId，當 UserWidget 需要 UserDetailRepository 時，就可以直接用 [context.read](http://context.read) 存取。但是當我們想直接測試 UserListWidget 就會，UserDetailRepository 就變成阻礙，因為 UserDetailRepository 是直接在 UserListWidget 中建立的，使得我們難以作假 UserDetailRepository，但若是我們改採用 get_it 則是可以使用 factory 處理，讓設計可以有更多選擇空間。