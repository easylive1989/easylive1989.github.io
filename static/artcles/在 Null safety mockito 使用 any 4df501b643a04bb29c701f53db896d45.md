# 在 Null safety mockito 使用 any

新增時間: August 11, 2021 1:07 PM
最後編輯時間: October 3, 2025 12:05 AM
id: 4df501b643a04bb29c701f53db896d45
完成: Yes
類型: Medium
🧩 領域: Flutter (https://www.notion.so/Flutter-aec5ea3a198f49e18989ab7f4c851169?pvs=21)

前陣子 Google release了 Dart 2.12，加入 null safety 特性，不可避免地，升級過後的產品代碼需要進行一些調整，除此之外，測試代碼也必須進行相對應的調整。在測試之中，如果有使用 mockito 中的 any 來 mock 物件方法與回傳，可能會碰到像是下面這種 error。

```dart
type 'Null' is not subtype of type 'your class type' of 'type'
```

為此，官方給出[解決辦法](https://github.com/dart-lang/mockito/blob/master/NULL_SAFETY_README.md#problems-with-typical-mocking-and-stubbing)，讓我們的測試可以繼續使用 any 來進行 mock。

## 解決辦法

1. 在 pubspec.yaml 加入 build_runner
    
    ```dart
    dev_dependencies:
      build_runner: ^1.10.0
    ```
    
2. 在測試中加入 GenerateMock 這個 annotation，並傳入想要 mock 的類別
    
    ```dart
    import 'package:mockito/annotations.dart';
    
    @GenerateMocks([UserApi])
    void main() {
    	...
    }
    ```
    
3. 在專案目錄中執行 build_runner
    
    ```dart
    flutter pub run build_runner build
    ```
    

當做完成以上步驟後，會在測試目錄中看到一個 xxx_test.mock.dart 的 mock 檔案，在原本的測試中 import 這個 mock 檔案後，就可以不在需要自己宣告 mock 類別，並且也可再次使用 any 了。

```dart
import 'package:mockito/annotations.dart';

@GenerateMocks([UserApi])
void main() {
	test('my test', () {
		var mockUserApi = MockUserApi();
		when(mockUserApi.getProfile(any)).thenReturn(Profile());

		...
	});
}
```

## 作法解釋

以原本的 mockito 的做法，mock 類別實作了目標類別，在 nullable 環境中，可以正常的把 any 當成方法參數，但是在 null safety 的環境中，想把 any 傳入 non-nullable 的參數就會造成編譯問題，因為 any 實際回傳的是 null。為了解決這個問題，所以必須透過 build_runner 來產生 mock 檔，透過 build_runner 產生出來的 mock 類別會把原本 non-nullable 的參數拓展成 nullable，以支持傳入 any。

build_runner 這個套件會去偵測 test 中的 @GenerateMock，並取得需要 mock 的目標類別，然後就自動產生對應的 mock 類別，最後在原本測試中引用產生出來的 mock 檔，就能像之前一樣的操作 mock 類別，與之前不同的是，不需要在自己宣告 mock 類別了。

## 自行產生 Mock 類別

除了使用 build_runner 來幫忙產生 mock 類別，其實也是可以自己寫，不一定要使用 build_runner來幫忙產生。當有兩個測試檔案都使用了相同的 mock 類別時，在兩個檔案分別用 GenerateMocks mock 一樣的類別時，build_runner 會產生兩個測試的 mock 檔 ，並包含一樣的 mock 類別，如果自己寫的話，可以使用一份共用的 mock 檔，讓測試代碼稍微乾淨一點。

```dart
class MockUserApi extends Mock implements UserApi {
  @override
  void getProfile(int? userId) =>
      super.noSuchMethod(Invocation.method(#getProfile, [userId]));
}
```

## 更改預設 mock 類別名稱

預設 mock 類別名稱是在原本的類別前面加上 Mock 的前綴，但是想要客製化名稱，則不能使用第一個參數，而是需要改使用 @GenerateMock 的 customMocks 參數。

```dart
import 'package:mockito/annotations.dart';

@GenerateMocks([], customMocks: [MockSpec<UserApi>(as: #OtherMockUserApi)])
void main() {
	...
}
```

## 小結

整體來說，在 null safety 中用 mockito 來 mock 類別的作法還是跟之前差不多，多了一個步驟要使用 build_runner 來幫忙產生 mock 類別。如果自己實作 mock 類別的話，則是需要在 mock 的時候，針對 mock 方法多寫一些代碼。