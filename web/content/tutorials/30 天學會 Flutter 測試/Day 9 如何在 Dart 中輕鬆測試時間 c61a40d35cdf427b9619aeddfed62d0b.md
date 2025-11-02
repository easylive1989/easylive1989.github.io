# Day 9 如何在 Dart 中輕鬆測試時間

備註: clock

無論什麼樣的產品，或多或少都會需要時間，可能用來提示使用者，也可能用來計算優惠，說到這裡，聰明的觀眾朋友也就不難猜到今天想討論的一種情境：**時間**。當我們的測試與時間有關時，我們會採用 Stub 的方式做假時間，但是除此之外，在 Dart 中，我們還有可以使用套件來幫忙，話不多說，就先舉個例子吧。

## 舉個例子

在 Dart 中，若我們想取得時間，最簡單的方式是透過 DateTime，使用 DateTime 的 now 方法可取得當下時間，若我們想對時間做加減，也可以使用 DateTime 的 add 處理。DateTime 的 now 方法是一個靜態方法，十分方便，在程式的每個角落都可以直接使用。

```dart
var now = DateTime.now();

var tomorrow = now.add(Duration(days: 1));
```

讓我們修改一下購買商品的例子，假設公司歡慶新年，贈送給每個使用者一張新年折價券，讓使用者在購買商品的時候可以帶入折價券，只限在 1/1 當天購買商品時才可以用，在其他時間則無法使用。

```dart
class PurchaseProductService {
  final ProductRepository productRepository;
  final WalletRepository walletRepository;

  PurchaseProductService(this.productRepository, this.walletRepository);

  Future<void> execute(Product product, NewYearCoupon? coupon) async {
    var now = DateTime.now();
    if (_isUseCoupon(coupon) && !_isFirstOfJanuary(now)) {
      throw CouponInvalidException();
    }

    var wallet = await walletRepository.get();
    if (product.price > wallet.money) {
      throw MoneyNotEnoughException();
    }

    productRepository.purchase(product, coupon);
  }

  bool _isFirstOfJanuary(DateTime now) => now.month == 1 && now.day == 1;

  bool _isUseCoupon(NewYearCoupon? coupon) => coupon != null;
}
```

當我們寫完程式，就準備開始寫測試來了，經過一番操作，測試也終於完成。

```dart
@GenerateNiceMocks([MockSpec<ProductRepository>(), MockSpec<WalletRepository>()])
main() {
  test("use coupon when purchase product", () async {
    var mockProductRepository = MockProductRepository();
    var mockWalletRepository = MockWalletRepository();

    var purchaseProductService = PurchaseProductService(mockProductRepository, mockWalletRepository);

    await purchaseProductService.execute(
        const Product(100), 
        NewYearCoupon());

    verify(mockProductRepository.purchase(
        const Product(100), 
        NewYearCoupon()),
    ).called(1);
  });
}
```

但實際執行後，測試卻是失敗的，execute 方法丟出了 CouponInvalidException，這時我們才想到，今天不是 1 月 1 號，所以測試才錯了。[[範例連結](https://gist.github.com/easylive1989/bd7d59b1675f7c608a43cee7408edfde)]

![Untitled](Day%209%20%E5%A6%82%E4%BD%95%E5%9C%A8%20Dart%20%E4%B8%AD%E8%BC%95%E9%AC%86%E6%B8%AC%E8%A9%A6%E6%99%82%E9%96%93/Untitled.png)

## DateTime 難以測試

DateTime 的 now 方法就如同前面所說，是個靜態方法，如果我們沒有作假 DateTime，在實際執行測試時，就會依照當下的時間來測試，如果當下的間剛好符合測試要求，順利通過了，結果過兩天，這個測試又錯了，又過兩天，這個測試又通過了，就會造成 RD 無法得知道理是程式錯了，還是測試有問題，違反了單元測試的可重複性原則。

![3379008-PH.jpg](Day%209%20%E5%A6%82%E4%BD%95%E5%9C%A8%20Dart%20%E4%B8%AD%E8%BC%95%E9%AC%86%E6%B8%AC%E8%A9%A6%E6%99%82%E9%96%93/3379008-PH.jpg)

有些語言有套件可以協助我們作假靜態方法，但是在 Dart 中沒有，所以我們必須自己想辦法處理。

## 注入 TimerRepository

針對這個問題，我們手裡已經有許多方法可以應變，我們選擇注入的方式，建立一個 TimeRepository，其中包含取得 now 的方法，最後注入 PurchaseProductService 使用。

```dart
class TimeRepository {
   DateTime now() => DateTime.now(); 
}

class PurchaseProductService {
  final ProductRepository productRepository;
  final WalletRepository walletRepository;
  final TimeRepository timeRepository;

  PurchaseProductService(this.productRepository, this.walletRepository, this.timeRepository);

  Future<void> execute(Product product, NewYearCoupon? coupon) async {
    var now = timeRepository.now();
    if (_isUseCoupon(coupon) && !_isFirstOfJanuary(now)) {
      throw CouponInvalidException();
    }

    ...
  }
}
```

測試的時候就能透過 MockTimeRepository 來做假 now 的時間，最後得到一個綠燈。

```dart
main() {
  test("use coupon when purchase product", () {
    ...

    var mockTimerRepository = MockTimerRepository();

    when(mockTimerRepository.now()).thenAnswer((_) async => DateTime.parse("2023-01-01"));
    
		...
  });
}
```

跟先前談過的一樣，如果這段是 Legacy Code，我們不打算改動太大範圍，使用 Extract And Override 也能解決問題。在時間問題上，除了使用修改設計之外，Dart 官方有提供方便的時間套件，讓我們可以更好的處理這個問題。[[範例連結](https://gist.github.com/easylive1989/581d75fad68315f8d7bb2b6b92f0b46e)]

## clock 套件

[clock](https://pub.dev/packages/clock) 是 Dart 官方開發的的時間套件，主要功能是封裝了 DateTime，並且提供可測試接口，讓我們能可以在不修改程式碼的情況下，在測試中植入假時間，使用上我們只要把 [DateTime.now](http://DateTime.now)() 變成 clock.now()。

```dart
 class PurchaseProductService {
  ...

  Future<void> execute(Product product, NewYearCoupon? coupon) async {
    var now = clock.now();
    if (_isUseCoupon(coupon) && !_isFirstOfJanuary(now)) {
      throw CouponInvalidException();
    }

    ...
  }
}
```

測試的時候，我們在測試主體外圍包一個 withClock 並設定時間當下時間，實際執行的時候 clock 的 now 方法取得的時間就會是 withClock 中設定的時間。雖然 clock 與 DateTime 一樣都是靜態方法，但是不同的是 clock 在設計之初就有提供測試接口，讓開發時不必為了時間而多一個依賴，也能輕鬆測試。

```dart
@GenerateNiceMocks([MockSpec<ProductRepository>(), MockSpec<WalletRepository>()])
main() {
  test("use coupon when purchase product", () async {

    withClock(Clock.fixed(DateTime.parse('2023-01-01')), () async {

      var mockProductRepository = MockProductRepository();
      var mockWalletRepository = MockWalletRepository();

      when(mockWalletRepository.get()).thenAnswer((_) async => Wallet(100));

      var purchaseProductService = PurchaseProductService(mockProductRepository, mockWalletRepository);

      await purchaseProductService.execute(
          const Product(100),
          NewYearCoupon());

      verify(mockProductRepository.purchase(
          const Product(100),
          NewYearCoupon()),
      ).called(1);

    });

  });
}
```

[[範例連結](https://gist.github.com/easylive1989/3008aea390455a660a7732bff4665dd2)]

## 相對時間的的測試

在上面的例子中，我們的商業邏輯與特定時間點相關，所以我們不得不在測試的時候給定絕對時間。但是有些時間相關的需求只需要處理時間差的問題即可，這是什麼意思呢？讓我們修改一下需求，當使用者購買商品時，只要優惠券沒有過期，就能照常使用。

```dart
class PurchaseProductService {

  ....

  Future<void> execute(Product product, Coupon? coupon) async {
    var now = DateTime.now();
    if (coupon?.expiredAt.isBefore(now) ?? false) {
      throw CouponInvalidException();
    }

		...
  }
}
```

我們在寫測試的時候，就可以直接使用 DateTime 的 now 方法加上額外時間，模擬優惠未到期的情況。相反的，也可以 DateTime.now() 扣掉一些時間，模擬到期的情況。

```dart
@GenerateNiceMocks([MockSpec<ProductRepository>(), MockSpec<WalletRepository>()])
main() {
  test("use coupon when purchase product", () async {
    ...
    

    const product = Product(100);
    var coupon = Coupon(
			discount: 0.5, 
			expiredAt: DateTime.now().add(const Duration(days: 10),
		));

    await purchaseProductService.execute(product, coupon);

    verify(mockProductRepository.purchase(product, coupon)).called(1);
  });
}
```

[[範例連結](https://gist.github.com/easylive1989/1c3a0f407cc430c8febfe69526ab88da)]

## 靜態方法用與不用

DateTime 的 now 是框架提供的靜態方法，當我們需要取得時間時，無可避免地就得用它，畢竟我們不太可能自己再花時間實現一個取時間的程式碼，對吧，框架都提供了，我們又何必重造輪子呢？但是從上面的例子來說，我們應該也能感受到靜態方法對於程式碼的可測性是有負面效果的。那我們是不是不該使用靜態方法呢？答案顯然不是，畢竟如果靜態方法只有壞處沒有好處的話，也早就消失在語言特性當中了。

那什麼東西適合使用靜態方法呢？除了 DateTime 之外，其實我們在程式中也時常會見到靜態方法，例如：dart:math 中的各種 min、max …等數學運算方法，或者是 int.parse 這種轉換型別的工廠方法，都是適合可以使用靜態方法的例子。

## 小結

時間處理幾乎任何種類的產品都會遇到的問題，若語言本身的時間 API 沒有提供測試接口，那我們在設計之初就得考慮程式碼的可測試性。而在 Dart 中善用 clock 套件，我們能更簡單的解決時間 API 的靜態方法帶來的問題，讓程式具備在測試決定時間的能力。