# 如何用 Github Action 建置 Flutter Android App

新增時間: August 15, 2021 2:58 PM
最後編輯時間: October 3, 2025 12:05 AM
id: b95a311f7549498ca192c4dd9a4538e8
完成: Yes
類型: Medium
🧩 領域: Flutter (https://www.notion.so/Flutter-aec5ea3a198f49e18989ab7f4c851169?pvs=21)

手動建置與上傳 app 是一件滿麻煩的事情，在最理想的狀況下，我們希望當我們確保程式沒有問題之後，合併回主線就可以開始自動建置並上傳到 google play 上。為了達到這個目的，我使用 Github Action 來幫我建置 flutter app，今天就來分享一下我如何自動化這些麻煩事。

## 加入建置 Flutter 的 Step

透過使用第三方的 action：[subosito/flutter-action](https://github.com/subosito/flutter-action)，我們就可以使用 flutter 的命令來建置 flutter app。

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-java@v1
        with:
          java-version: '12.x'
 	  - uses: subosito/flutter-action@v1
        with:
          channel: 'stable'
      - run: flutter pub get
      - run: flutter test
      - run: flutter build appbundle
```

當用這上面這段代碼去建置時，會發現因為缺少 keystore 檔案與 google-service.json 而建置失敗。這些檔案因為需要保密的緣故，所以並沒有上傳到 Github 的 repository 中。為此，我們必須想個辦法讓 Github 可以保存這些保密的檔案。

## 保密 keystore 與 google-service.json

由於這些 keystore 檔案和 google-service.json 裡面放著重要的資料，不能放在直接 git repository，以防被其他人拿到並盜用你的名義簽署 app 或者使用 google 服務。但是當你建構你的自動化 app 建置流程，這些檔案又是必不可少的，否則就會建置失敗。

為了在 github 上保密這些資料，github 也向其他各式各樣的 CI 工具一樣，提供了 secret 讓我們可以放一些重要的資料，例如：DB 的連線字串、API 的 token ...等等。但是 secret 目前是提供以文字形式的方式儲存這些保密資料，所以我們必須把 keystore 檔案和 google-services.json 檔轉換成文字形式，然後才能放到 secret 中。

1. 在 local 端把檔案轉換成 base64 的格式
    
    ```bash
    openssl base64 -in your-input-file -out your-output-file
    ```
    
2. 把轉換出來的 base64 文字加到 Github Secret 中，同時也把
    
    ![截圖 2021-08-15 下午1.47.30.png](%E5%A6%82%E4%BD%95%E7%94%A8%20Github%20Action%20%E5%BB%BA%E7%BD%AE%20Flutter%20Android%20App/%E6%88%AA%E5%9C%96_2021-08-15_%E4%B8%8B%E5%8D%881.47.30.png)
    
3. 把 base64 文字在 step 中轉回檔案，如此一來，建置時就能拿到這些重要檔案
    
    ```yaml
    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
    	  ...
    	  - run: echo $ANDROID_KEY_STORE | base64 -di > android/app/key.jks
      		env:
        		ANDROID_KEY_STORE: ${{ secrets.ANDROID_KEY_STORE }}
    	  - run: echo $GOOGLE_SERVICE | base64 -di > android/app/google-services.jon
      		env:
        		GOOGLE_SERVICE: ${{ secrets.GOOGLE_SERVICE }}
    	  ...
    ```
    

## 保密其他重要資料

除了 keystore 外，還有重要的資料，像是 store password, key password, key alias，我們也需要一起放進 secret 中，讓建置時可以從 secret 中拿到這些資料。

![Pasted image 20210815142324.png](%E5%A6%82%E4%BD%95%E7%94%A8%20Github%20Action%20%E5%BB%BA%E7%BD%AE%20Flutter%20Android%20App/Pasted_image_20210815142324.png)

修改 github action，在建置時把這些 secret 放進環境變數中

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      ...
      - run: flutter build appbundle
	  	env:
  		  KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
  		  KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
  		  STORE_PASSWORD: ${{ secrets.STORE_PASSWORD }}

```

最後修改 build.gradle，build.gradle 從環境變數中使用這些資料。

```
signingConfigs {
	release {
 		storeFile = file("key.jks")
 		storePassword System.getenv("STORE_PASSWORD")
 		keyAlias System.getenv("KEY_ALIAS")
 		keyPassword System.getenv("KEY_PASSWORD")
 	}
}
```

當以上都做完之後，Github Action 就能正常的建置出 flutter android app 了。

## 下載建置出來的 app

當建置完成後，檔案實際上還是存在 Github Action 的 Runner 中。為了拿到最後建置出來的檔案，我們必須再加上一個 step，把檔案上傳到 artifact 中。這樣我們就在建置完成之後，就能從 Github 網頁上下載到剛剛建置的檔案。

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      ...
	  - name: upload appbundle
  		uses: actions/upload-artifact@v2
  		with:
    	  name: app bundle
    	  path: build/app/outputs/bundle/release/app-release.aab

```

## 下一步

把 app 建置出來並放到 artifact 後，我們就能從 github 上下載到 app，把這個 app 上傳到 google play 的後台，讓 user 可以下載。可以發現後面我們還是需要手動上傳到 google play，為了也把這段自動化，我會在下一篇中紀錄如何把 app 自動上傳到 google play 上。

## 參考

- [完整的 workflow](https://github.com/easylive1989/LittleFlowerApp/blob/master/.github/workflows/build.yml)
- [Github Action Doc](https://docs.github.com/en/actions/guides/storing-workflow-data-as-artifacts#uploading-build-and-test-artifacts)