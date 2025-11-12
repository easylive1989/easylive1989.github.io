# 用 Flutter Web 製作 Chrome Extension 待讀文章看板

新增時間: November 09, 2025 06:27 AM
最後編輯時間: November 09, 2025 06:30 AM
id: 2a68303f78f780b79bebded637e6589c

有一陣子沒寫文章了，趁著前陣子剛完成了[鐵人賽](https://ithelp.ithome.com.tw/users/20129825/ironman/4992)，趁著開始比較有空閒，就來更新一下最近學到的新東西XD。

![](wesley-tingey-snNHKZ-mGfE-unsplash.jpg)

在日常生活和工作中，每當看到一些不錯的文章，想要晚一點再看時，我們可以使用 Notion 官方推出的 Chrome Extension：[Notion Web Clipper](https://chrome.google.com/webstore/detail/notion-web-clipper/knheggckgoiihginacbkhaalnibhilkk)，快速的把文章儲存到 Notion 中的某個資料庫，等到有空閑的時間，我就能從資料庫中找到那篇想讀的文章。有時候，我們會記得回來看資料庫是否有未讀的文章，但更多是，在我們有空的時候，我們早就不記得資料庫中有一些文章正等著我們去讀，然後把這寶貴的空閒時間浪費掉了。

# 難以維持習慣

有時，我們學了新東西，一開始比較有熱情，可以讓新習慣維持一陣子。但是，有時候我們會忘記，有時候我們會懶惰，一次兩次的失敗，我們漸漸開始無心維持新習慣，最後就慢慢地回到舊的習慣。如同[最小阻力之路](https://www.books.com.tw/products/0010696380)中提到的，在大自然中，能量會往阻力最小的路線前進，這個道理也同樣適用於人。大多時候，我們所選做的決定，所選擇的方向，也都是自然而然地從阻力最小的方向去走。當我們嘗試建立新的習慣，總會帶來一些阻力，越是平常根本不做的事情，阻力越大，時間一長，我們自然而然的就會回到阻力最小的舊習慣。

# 讓執行習慣毫不費勁

那我們如何減小新習慣的阻力呢？我們可以運用[原子習慣](https://www.books.com.tw/products/0010822522)中提到的一個技巧：**習慣堆疊。**

> 把新習慣放到每天已經習慣做的事情綁在一起。

於是我觀察我自己的原有的習慣，發現自己每天早上都一定會透過 Chrome 擴充功能的 [Google Mail Checker](https://chrome.google.com/webstore/detail/google-mail-checker/mihcahmgecmbnbcchbopgniflfhgnkff) 處理信件，並使用 [Feedly Notifier](https://chrome.google.com/webstore/detail/feedly-notifier/egikgfbhipinieabdmcpigejkaomgjgb) 看看自己訂閱的 RSS 有沒有什麼新文章。於是，我從商店中找找看是否有適用的擴充功能，看看有沒有像是 Mail Checker 一樣，可以顯示 Notion Daatabase 中還有多少待讀文章，但比較可惜的是大多擴充功能都是強化原本 Notion Web 版使用體驗。最後，我決定自己使用 Flutter Web 來做一個自用的 Chrome 擴充功能。

# 建立 Chrome Extension

之前我們透過 [Notion API 更新資料庫](https://easylive1989.medium.com/%E5%88%A9%E7%94%A8-notion-api-%E8%87%AA%E5%8B%95%E6%9B%B4%E6%96%B0%E6%AC%84%E4%BD%8D-318eac43008e)，這次也同樣需要使用 Notion API 來幫助我們取得待讀清單，再加上用 Flutter Web 建立 Chrome 擴充功能，把所有未讀文章放在擴充功能畫面上。

首先我們得先建立一個 Flutter Project

```bash
flutter create notion_assistant
```

在 web 資料夾放入 manifest.json，和加上 index.html 取代原本檔案

```bash
{
    "name": "Notion Assistant",
    "version": "0.1",
    "manifest_version": 2,
    "browser_action" :{
        "default_popup": "index.html",
        "default_icon" : "icons/Icon-192.png"
    },
    "icons": {
        "16": "icons/Icon-192.png"
    }
}
```

```html
<html style="height: 300px; width: 300px">
<head>
  <meta charset="UTF-8" />
  <title>Notion Assistant</title>
</head>
<body>
<script src="main.dart.js" type="application/javascript"></script>
</body>
</html>
```

當我們用 flutter  build 出 web app 時，flutter 會把畫面的部分建成 main.dart.js，同時使用 —[web-renderer](https://docs.flutter.dev/development/platform-integration/web/renderers) 讓 flutter 用 html + css 來渲染畫面。

```html
flutter build web --web-renderer html
```

最後我們打開 Chrome 擴充功能設定 ( chrome://extensions )，從右上角開啟開發人員模式並載入未封裝項目，選擇 build/web 資料夾中的建置結果，我們就能在 Chrome 擴充功能中看到 Flutter 預設的 counter app。

![](%E6%88%AA%E5%9C%96_2022-11-06_%E4%B8%8B%E5%8D%8812.13.39.png)

此時，我們就能開始針對自己的需求製作畫面了擴充功能的畫面了，之後就是根據個人需求整畫面與 API 的使用了，以我自己來說，就是顯示待讀文章列表。

![](%E6%88%AA%E5%9C%96_2022-11-06_%E4%B8%8A%E5%8D%8810.42.04.png)

# 畫面以外的功能

當我們只想知道還有多少未讀文章，每次都要點開擴充功能才能知道，不免有些麻煩，此時，我們可以使用 Chrome 擴充功能的 Background Job 幫我們定期呼叫 API，並更新 count 到 badge 上。第一步我們得先稍微修改一個 manifest.json，增加 background 的設定。

```json
{
    "background": {
        "persistent": true,
        "scripts": ["background.js"]
    },
}
```

接下來我們就得想辦法產生 background.js 了。如果稍微會寫 Javascript 的朋友，這邊可以考慮根據自己的需求，直接使用 Javascript 實作 background.js。但是在這邊，讓我們嘗試用 Dart 來製作 background.js 吧，也因為同樣是使用 Dart ，所以我們可以共用製作畫面時 Dart 程式碼，讓我們省一點功夫。

# 用 Dart 製作 background.js

Dart SDK 中，有提供[工具](https://dart.dev/tools/dart2js)讓我們能把 Dart 轉換成 Javascript，用這個工具我們就能先寫一份 background.dart，再透過他幫我轉成 Javascript。在 background.dart 中，import dart:js 之後，我們可以拿到 context，並用 context 呼叫到 [Chrome API](https://developer.chrome.com/docs/extensions/reference/browserAction/#badge)，並透過其設定 Badge 的上的文字與顏色。

```bash
import 'dart:async';
import 'dart:js';

void main() {
  _setBadge(1);
  Timer.periodic(const Duration(seconds: 300), (timer) async {
    _setBadge(2);
  });
}

void _setBadge(int count) {
  var badgeText = JsObject.jsify({"text": "$count"});
  var badgeBackgroundColor = JsObject.jsify({"color": "#D00218"});
  context["chrome"]["browserAction"].callMethod("setBadgeText", [badgeText]);
  context["chrome"]["browserAction"].callMethod("setBadgeBackgroundColor", [badgeBackgroundColor]);
}
```

上面示範程式碼只有展示如何設定 Badge，實際則是需要根據自身需求，決定設定什麼文字到 Badge 上，我們這邊就不過多展示，有興趣有可以直接到 [https://github.com/easylive1989/notion_assistant](https://github.com/easylive1989/notion_assistant) 中查看。

當寫完 background.dart 之後，最後在呼叫指令產生 background.js 即可。

```bash
dart compile js lib/background.dart -o background.js
```

最後我們就能成功的在 Chrome 擴充功能的圖示上看到 Badge 了。

![](%E6%88%AA%E5%9C%96_2022-11-06_%E4%B8%8B%E5%8D%8810.53.05.png)

# 結論

當我們從書上或他人身上學到新的方法，通常無法直接的複製到自己身上，畢竟自身的環境或習慣與他人並不完全一樣。想要讓新方法融入自己的生活，必定得耐心思考與嘗試一番，經過不斷地調整與實驗，最終才能找到適合自己的工作方式，讓我們花費最少心力，把重要的注意力放在更重要的事情上。

# 參考

- Repository：[https://github.com/easylive1989/notion_assistant](https://github.com/easylive1989/notion_assistant)