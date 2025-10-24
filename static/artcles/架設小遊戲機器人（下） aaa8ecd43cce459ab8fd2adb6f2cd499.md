# 架設小遊戲機器人（下）

新增時間: August 11, 2021 1:07 PM
最後編輯時間: October 3, 2025 4:32 PM
id: aaa8ecd43cce459ab8fd2adb6f2cd499
完成: Yes
類型: Medium
🧩 領域: C# / .NET (https://www.notion.so/C-NET-b6fcf2cf4b5744158d0ff3dc8ebbca2a?pvs=21)

延續上一篇，這篇繼續補完實作小遊戲機器人中碰到的各種問題，有些是為了學習，有些是為了繞過限制，有些則是為了自己奇怪的目的？無論如何，隨著機器人的功能越來越多，也陸續在不同的時間點上碰上不同的問題，前前後後為了解決這些問題，花了不少時間，也是一段充滿樂趣的過程，就讓我在這篇文章中把剩下問題在這篇介紹完吧。

## 訊息推送失敗？？

當使用機器人一陣子之後，某一天開始，訊息無法正常推送，仔細看了log才發現，原來訊息推送次數已達上限，因為 LINE 的免費方案有推送訊息的次數限制。知道這個限制之後，本來是想放棄機器人了，畢竟一個機器人的使用頻率不高，但是 LINE 付費方案又需要每個月幾百塊，自己覺得不是很划算。

後來經過朋友推薦，得知 LINE Notify 這個服務，這是一個可以透過 LINE Notify 幫忙推送訊息的服務，Server 端只要實作 OAuth 2.0 去對接 LINE Notify，就能夠透過 LINE Notify 來免費送訊息。機器人只要取得群組的發送訊息用的 LINE Notify token，就能使用這個 token 經由 LINE Notify 來轉傳訊息。使用了 LINE Notify 來傳送訊息，雖然可以實現免費無限制推送訊息，使用時會需要在群組中加入機器人與 LINE Notify，不免有些不便，但是為了免費，只好犧牲了方便性。

## 想要 Public Repository

由於專案是放在 Github 且是公開的，所以一些像是 DB、Redis 的位置或是 LINE 的 Token，這些比較私密的資訊不能直接放在 appsetting.json 中。為了解決這個問題，我把這些資訊移進 Github 的 Secret 中，並且在 Github Actions 執行時，從 Secret 中把這些資訊拿出來，再透過 Docker 的 ARG 參數傳入，讓 Server 在 Docker 中啟動時可以取得這些重要資訊。

## Heroku 的套件

除了 Redis 之外，Heroku 也還有許多 Add-on 可以增加 App 功能，像是 PostgreQL 來做為 Server 的 DB，或者是 Papertrail 來看 Log。使用上也建議看完 Heroku 的官方說明文件，不然像我一樣碰到 Redis 的位置每隔一小段時間就會改變，導致 Server 無法正常運行。

## 小結

在寫這個機器人的過程當中，很多事情都是從零開始，邊學邊使用自己完全沒碰過的技術，所以一路建起來也是坑坑洞洞，最後進化成一個可以帶來樂趣的機器人，也因此學到了很多，謝謝看到這邊的大家，最後附上我的 [Github Repository](https://github.com/easylive1989/LittleFlowerBot)。