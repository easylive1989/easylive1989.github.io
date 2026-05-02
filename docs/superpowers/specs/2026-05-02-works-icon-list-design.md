# 作品集展開 Icon 列 設計文件

日期：2026-05-02
影響範圍：`src/components/AuthorCard.astro`、`src/styles/global.css`、`site.config.yaml`、`public/assets/`

## 目標

在 `AuthorCard` 現有的社群圖示列（github / threads / email）後面，加入一個「作品集」toggle icon。點擊後在同一列往右滑出 5 個作品連結 icon（App Store / Google Play / Stock / Timer / Playbox）；再點一次收合。讓網站訪客能從首頁直接進入這些作品。

## 行為與互動

預設狀態：

```
[github] [threads] [email] [works ▸]
```

展開後（同列延伸）：

```
[github] [threads] [email] [works (active)] [appstore] [googleplay] [stock] [timer] [playbox]
                                              ↑↑↑ 從左滑入 ↑↑↑
```

- **觸發**：只有點 `works` icon 本身可切換展開／收合。不支援 click outside、不支援 Esc。
- **動畫**：作品 icons 從 works toggle 位置往右滑出。`max-width: 0 → auto` + `opacity: 0 → 1` + `translateX(-8px) → 0`，250ms ease-out。收合反向。
- **Toggle 視覺**：展開時 `works` icon 加 active 樣式 — 圓形背景，light mode `rgba(0,0,0,0.06)`、dark mode `rgba(255,255,255,0.1)`。
- **持久化**：無。每次重新載入頁面預設都收合。
- **a11y**：`aria-expanded` 隨狀態切換；每個 icon `aria-label` 標明名稱。

## 資料設定（site.config.yaml）

把 playbox 從 `links` 移到新的 `works`：

```yaml
author:
  links:
    - type: github
      url: "https://github.com/easylive1989"
    - type: threads
      url: "https://www.threads.com/@paul.ch.wu"
    - type: email
      url: "mailto:hello@example.com"
  works:
    - type: appstore
      url: "https://apps.apple.com/no/developer/cheng-hua-wu/id1837458942"
    - type: googleplay
      url: "https://play.google.com/store/apps/developer?id=Paul+Wu&hl=zh_TW"
    - type: stock
      url: "https://paul-learning.dev/tools/stock"
    - type: timer
      url: "https://paul-learning.dev/tools/YouTube-sport-timer"
    - type: playbox
      url: "https://easylive1989.github.io/paul-playbox/"
```

`AuthorCard.astro` 內 `iconMap` 擴充加上：`works`、`appstore`、`googleplay`、`stock`、`timer`，每個對應一個 SVG 與 label。新增 `playbox.svg` 取代現有 `gamepad.png`；確認除了 `iconMap['playbox']` 之外無其他引用後刪除 `gamepad.png`。

## SVG 圖示（單色，24×24 viewBox）

全部為 `viewBox="0 0 24 24"`、單色填充（黑或 `currentColor`），與既有 github/threads/email/email.svg 同風格。dark mode 透過現有的 `filter: invert(1)` 反相。

| Icon 檔名 | 視覺描述 | Label |
|---|---|---|
| `works.svg` | 工具箱：方形箱體 + 上方提把弧線 + 中間開合線 | 作品集 |
| `appstore.svg` | Apple App Store「A」字 — 圓圈內一個 A 字、下方有一橫線 | App Store |
| `googleplay.svg` | 三角形 play 按鈕（左上→左下→右中），單色填充 | Google Play |
| `stock.svg` | 股票走勢折線圖：柱狀圖底 + 折線往右上 + 小箭頭 | 股票工具 |
| `timer.svg` | 圓形碼錶：上方按鈕 + 左上掛環 + 指針指向 12 偏右 | YouTube Sport Timer |
| `playbox.svg` | 遊戲手把：雙握把 + 中間十字鍵 + 兩個圓鈕 | Paul Playbox |

顯示尺寸：20×20（與既有 icons 一致）。

## 元件結構（AuthorCard.astro）

把目前 `<div class="author-links">` 區塊改寫成：

```astro
<div class="author-links">
  {config.author.links.map((link) => {
    const icon = iconMap[link.type];
    return (
      <a href={link.url} target="_blank" rel="noopener noreferrer" aria-label={icon?.label ?? link.type}>
        <img src={`${import.meta.env.BASE_URL}${icon?.src}`} alt={icon?.label ?? link.type} width="20" height="20" />
      </a>
    );
  })}

  <button class="works-toggle" id="works-toggle" aria-label="作品集" aria-expanded="false">
    <img src={`${import.meta.env.BASE_URL}assets/works.svg`} alt="作品集" width="20" height="20" />
  </button>

  <div class="works-list" id="works-list">
    {config.author.works.map((work) => {
      const icon = iconMap[work.type];
      return (
        <a href={work.url} target="_blank" rel="noopener noreferrer" aria-label={icon?.label ?? work.type}>
          <img src={`${import.meta.env.BASE_URL}${icon?.src}`} alt={icon?.label ?? work.type} width="20" height="20" />
        </a>
      );
    })}
  </div>
</div>
```

JS（沿用現有 `<script is:inline>` 區塊風格）：

```js
(function() {
  var btn = document.getElementById('works-toggle');
  var list = document.getElementById('works-list');
  if (btn && list) {
    btn.addEventListener('click', function() {
      var expanded = list.classList.toggle('expanded');
      btn.classList.toggle('active', expanded);
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
  }
})();
```

## CSS（global.css 內 `.author-links` 區塊附近）

```css
.works-toggle {
  background: none;
  border: 0;
  padding: 4px;
  border-radius: 50%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  transition: background 0.2s, color 0.2s, transform 0.2s;
}

.works-toggle:hover {
  color: var(--color-text);
  transform: translateY(-2px);
}

.works-toggle.active {
  background: rgba(0, 0, 0, 0.06);
}

[data-theme="dark"] .works-toggle.active {
  background: rgba(255, 255, 255, 0.1);
}

.works-list {
  display: flex;
  gap: 1rem;
  overflow: hidden;
  max-width: 0;
  opacity: 0;
  transform: translateX(-8px);
  transition: max-width 250ms ease-out, opacity 250ms ease-out, transform 250ms ease-out;
}

.works-list.expanded {
  max-width: 500px;
  opacity: 1;
  transform: translateX(0);
}

[data-theme="dark"] .works-toggle img,
[data-theme="dark"] .works-list img {
  filter: invert(1);
}
```

備註：`.author-links` 已是 flex；`works-toggle` 與 `works-list` 直接放進去即可。`works-list` 用 `gap: 1rem` 與容器既有 gap 一致。

## 邊界與決策

- **手機 / 窄螢幕**：`.author-links` 是 flex（無 `flex-wrap` 設定，依瀏覽器預設 `nowrap`）。如果展開時超出寬度，會在水平方向溢出容器。要避免溢出，需在 `.author-links` 加 `flex-wrap: wrap`，讓 `.works-list` 自然 wrap 到下一列。實作時會在 `.author-links` 加 `flex-wrap: wrap; row-gap: 0.5rem;`。
- **JS 失效**：works toggle 仍會出現但無反應；`.works-list` 因 `max-width: 0` 不會閃現。可接受（與現有 about-toggle 風險一致）。
- **持久化**：不持久。
- **既有 about-toggle**：與本功能無交互影響。

## 驗收方式

本地 `npm run dev`，手動驗證：

1. 預設只看到 github / threads / email / works 四個 icons
2. 點 works → 5 個作品 icons 從左滑入；works icon 出現圓形灰底
3. 再點 works → 滑回左方並隱藏；works icon 灰底消失
4. 切換 dark mode：6 個新 icon 都正確反相
5. 視窗縮到 iPhone 寬（375px）：展開時自然 wrap 到下一列，不溢出
6. 鍵盤聚焦 works button，按 Enter / Space 也能切換（button 預設行為）

## 不在本次範圍

- 不加作品集 icon 的 hover tooltip（只用 `aria-label`）
- 不持久化展開狀態
- 不變更 author 卡片其他部分（avatar、bio、about-toggle 內容）
- 不改 RSS、theme toggle
