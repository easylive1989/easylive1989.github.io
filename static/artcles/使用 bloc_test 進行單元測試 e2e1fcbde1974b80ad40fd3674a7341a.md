# 使用 bloc_test 進行單元測試

新增時間: August 11, 2021 1:07 PM
最後編輯時間: October 3, 2025 12:05 AM
id: e2e1fcbde1974b80ad40fd3674a7341a
完成: Yes
類型: Medium
🧩 領域: Flutter (https://www.notion.so/Flutter-aec5ea3a198f49e18989ab7f4c851169?pvs=21)

Flutter 有需多狀態管理的套件，包括：Providerd、Redux, Bloc...等。如果想針對這些狀態管理套件寫測試，我們可以使用 test 套件。在寫 Bloc 的測試時，除了可以使用 test 套件之外，還可以使用 [bloc_test](https://pub.dev/packages/bloc_test/example)，今天就來介紹一下 [bloc_test](https://pub.dev/packages/bloc_test/example) 吧。

假設有一個 CounterBloc 會維護 counter 的狀態，並且能送給它 CounterIncreased 的 event 來遞增counter

```dart
class CounterBloc extends Bloc<CounterEvent, CounterState> {
  CounterBloc() : super(CounterInitial(0));

  @override
  Stream<CounterState> mapEventToState(
    CounterEvent event,
  ) async* {
    if(event is CounterIncreased) {
      var newCount = state.count + 1;
      yield CounterIncreasedSuccess(newCount);
    }
  }
}
```

我們先用 [test](https://pub.dev/packages/test) 進行來針對這個 Bloc 測試，在測試之中依照單元測試3A：Arrange, Act, Assert 分成了三個部分，測試 CounterBloc 收到 CounterIncreased 能正常加一，並輸出 CounterIncreasedSuccess 的狀態

```dart
test('counter increase', () {
    var counterBloc = CounterBloc();

    counterBloc.add(CounterIncreased());

    expectLater(counterBloc.stream, emits(CounterIncreasedSuccess(1)));
});
```

## 改寫成 bloc_test

使用 bloc_test 提供的 blocTest 方法進行測試，blocTest 提供了 build, act , expect的接口，分別對應到上述的單元測試3A

```dart
blocTest<CounterBloc, CounterState>(
    'counter increase',
    build: () => CounterBloc(),
    act: (bloc) => bloc.add(CounterIncreased()),
    expect: () => [CounterIncreasedSuccess(1)],
);
```

相對於使用 test 來測試，bloc_test 幫我們隱藏了一些不必要的細節，例如 [counterBloc.stream](http://counterbloc.stream) 和 emits() 這些與待測邏輯不相關的代碼。讓我們能更專注在 bloc 的操作與狀態驗證。

## 一個 Event 產生多個狀態

假設 counter increase 是一個複雜的功能且執行速度慢時，我們通常會需要一個 in progress 的狀態，UI 可以針對這個狀態來顯示 Loading 畫面，讓使用者知道操作正在執行。

```dart
class CounterBloc extends Bloc<CounterEvent, CounterState> {
  CounterBloc() : super(CounterInitial(0));

  @override
  Stream<CounterState> mapEventToState(
    CounterEvent event,
  ) async* {
    if (event is CounterIncreased) {
      yield CounterIncreaseInProgress(state.count);
      var newCount = state.count + 1;
      yield CounterIncreasedSuccess(newCount);
    }
  }
}
```

當 CounterBloc 收到 CounterIncreased 時，會先輸出一個 CounterIncreaseInProgress 的狀態，當 CounterBloc 完成 counter 加一後，再次輸出 CounterIncreasedSuccess 的狀態。

此時我們也需要針對測試進行修改，分別在 test 和 blocTest 的方法中增加 CounterIncreaseInProgress 的驗證。

```dart
blocTest<CounterBloc, CounterState>(
    'counter increase',
    build: () => CounterBloc(),
    act: (bloc) => bloc.add(CounterIncreased()),
    expect: () => [
      CounterIncreaseInProgress(0),
      CounterIncreasedSuccess(1),
    ],
);
```

## 非必要驗證的狀態

好的測試代碼是包含跟待測邏輯相關的代碼，其他不相關的細節應該要盡量隱藏，讓測試意圖直接暴露測試方法中。而 in porgress 的狀態可能會頻繁出現在每個操作之中，我們可以針對驗證 in progess 狀態寫一個測試，但是如果每一個測試都需要驗證 in progress 的狀態就顯得多餘，而且容易混淆測試意圖。

在驗證 counter increase 的測試中，我們可以透過 blocTest 中的忽略 in progress 狀態，藉此來凸顯我們的測試意圖

```dart
blocTest<CounterBloc, CounterState>(
    'counter increase',
    build: () => CounterBloc(),
    act: (bloc) => bloc.add(CounterIncreased()),
    expect: () => [
      CounterIncreasedSuccess(1),
    ],
		skip: 1,
  );
```

## 小結

使用 bloc_test 隱藏了一些不必要的細節，比起使用 test 來進行單元測試，bloc_test 增加了一些測試的可讀性，讓測試意圖可以更清晰，避免測試壞掉時，我們還要從一大堆細節中找出測試的目的是什麼。