# Day 4 測試替身與依賴注入

新增時間: August 04, 2023 03:52 PM
最後編輯時間: November 09, 2025 12:52 PM
id: 51d7a7b24f834a349495634fbe77feb2

![](2a68303f-78f7-80d5-8810-d11be2f1ae3e.png)

在昨天文章中，我們直接測試了 UserRepository 的 get 方法，在測試中直接呼叫遠端伺服器取得 User 資訊，但是為了測試的**可重複性**，我們必須修改一下程式與測試，讓測試無論在什麼狀況都可以穩定執行，為了調整測試，我們需要兩樣東西的協助才能完成：**測試替身**與**依賴注入**。

## 做一個假實作

在原本的測試中，get 方法直接使用 http 套件去呼叫遠端 API，但是在測試中，為了讓測試穩定，我們必須想辦法讓在測試中，把 http 套件替換成假的 http，一個由我們全權控制的 http，讓我們可以控制它回傳假的 User 資料，也可以控制它失敗，所以我們必須測試中做一個假的 Client。

```dart
class StubClient implements Client {
  final http.Response response;

  StubClient(this.response);

  @override
  Future<http.Response> get(Uri url, {Map<String, String>? headers}) async {
    return response;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) {}
}
```

現在我們有了一個假的 Client 了，現在我們得想辦法把它放進 UserRepository 中取代 http。

## 注入假實作

讓我們回顧一下先前的 UserRepository 實作，在原本 get 方法實作中，UserRepository 直接使用 http 呼叫遠端 Server 的 API。

```dart
class UserRepository {
  Future<User> get(int userId) async {
    var response = await http.get(Uri.parse("https://jsonplaceholder.typicode.com/users/$userId"));
	
    return User.fromJson(jsonDecode(response.body));
  }
}
```

為了讓我們可以把假的 Client 放近 UserRepository 裡面取代 http，我們透過 UserRepository 建構子傳入 Client。在測試中，我們可放入假的 Client，在正式程式碼中，我們也能放入真的 Client，讓 UserRepository 可以正式 App 中呼叫遠端伺服器存取 User 資料。

```dart
class UserRepository {
  final Client _client;

  UserRepository(Client client) : _client = client;

  Future<User> get(int userId) async {
    var response = await _client.get(Uri.parse("https://jsonplaceholder.typicode.com/users/$userId"));
    return User.fromJson(jsonDecode(response.body));
  }
}
```

## 調整測試

最後我們調整一下測試，使用 StubClient 搭上一個假的 Response。在修改後的測試中，我們在製作，在這個測試中，我們可以制定任何 Response ，然後最後就可以根據假的 Response 驗證結果。

```dart
main() {
  test("get user ok from api", () async {
    var fakeClient = StubClient(Response("{\"id\":1, \"name\": \"Tom\"}", 200));
    
    var userRepository = UserRepository(fakeClient);

    var user = await userRepository.get(1);

    expect(user, User(id: 1, name: "Tom"));
  });
}
```

這個修改過的測試呼叫 get 時，不再跟遠端伺服器互動，而是直接從 StubClient 中取得回傳值。最後，我們的單元測試無論在什麼狀況下，都可以穩定執行成功，再也不會受到其他因數影響導致失敗，測試無論執行幾次，或在誰的電腦上執行，都能有正確的結果。

在我們上面例子中的假實作，我們把假的 Client 命名為 StubClient，那 Stub 是什麼呢？

## Stub 是什麼？

在單元測試中，為了測試的穩定，我們會需要各式各樣的假物件來協助測試，這些假的測試物件也稱為**測試替身**。Stub 就是一種測試替身，專門做假資料提供給 SUT，讓 SUT 可以走到預期的情境，最後驗證 SUT 的回傳值或狀態。

![](Untitled.png)

出處:[http://xunitpatterns.com/Test Double.html](http://xunitpatterns.com/Test%20Double.html)

在上面的圖中，我們一樣會在 Setup、Exercise、Verify 可以對應到 3A 原則的 Arrange、Act、Assert，在使用 Stub 的情境中，我們在 Act 階段，建立了 Stub 塞給 SUT，呼叫 SUT 執行之後，最後在 Verify 階段驗證 SUT 身上的屬性或回傳值。

## 測試替身不只一種

測試替身有很多種，除了 **Stub** 之外，包括 **Dummy**、**Fake**、**Mock**、**Spy**，他們分別在不同的測試場景中發揮功用。

Mock：驗證 SUT 與其依賴的互動行為

Fake：可以取代真正實作的簡單實作

Spy：提供假資料給 SUT，最後驗證 Spy 身上的狀態

Dummy：對於測試沒有影響的假物件

上面只是簡單介紹了測試替身的功用，在未來幾天裡，我們會更詳細的介紹其中幾種，有興趣的觀眾朋友也可以參考[ xUnit Patterns 網站](http://xunitpatterns.com/Test%20Double.html)。

## 依賴注入

光有測試替身是不夠的，我們還得想辦法把替身交給 SUT，讓 SUT 可以與我們的測試替身互動。在上面的例子中，，我們把 StubClient 放入 UserRepository 的方式也稱為依賴注入。在正式程式碼中，常見的方式就是透過套件或框架支援，在物件生成的時候自動透過建構子注入到物件中，在測試中，我們也只要從建構子傳入假物件即可，避免物件間直接耦合造成無法測試。

使用依賴注入除了讓我們測試可以具備可測試性之外，依賴注入也在設計上提供了許多好處

1. 分離製造與組合依賴的職責
1. 分離控管依賴的生命週期的職責
1. 對物件的攔截
由於本系列文章主軸還是在測試，所以就不過多敘述，有興趣的朋友可以參考[**依賴注入：原理、實作與設計模式**](https://www.tenlong.com.tw/products/9789864344987)

## 小結

只有當程式具備可測試性，我們才能夠寫測試來保護它。在實務上，我們常常需要測試替身的輔助，但是光有測試替身，如果程式本身並不支援的話，也是巧婦難為無米之炊。所以我們在設計之初，就該考慮程式的可測試性，避免造成測試的麻煩。





也為了讓我們可以把假物件注入待測物件中，我們必須待測物件符合依賴反轉原則，

> 高層次的模組不依賴於低層次的模組的實現細節
- 依賴反轉原則



[http://xunitpatterns.com/Test Double.html](http://xunitpatterns.com/Test%20Double.html)

[https://stackoverflow.com/questions/28295625/mockito-spy-vs-mock](https://stackoverflow.com/questions/28295625/mockito-spy-vs-mock)

[https://martinfowler.com/articles/mocksArentStubs.html](https://martinfowler.com/articles/mocksArentStubs.html)

[https://dotblogs.com.tw/hatelove/2012/11/29/learning-tdd-in-30-days-day7-unit-testing-stub-mock-and-fake-object-introduction](https://dotblogs.com.tw/hatelove/2012/11/29/learning-tdd-in-30-days-day7-unit-testing-stub-mock-and-fake-object-introduction)
