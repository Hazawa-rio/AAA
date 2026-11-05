# 網頁 RPG — 戰鬥測試（單機版）

純前端，不需要伺服器：**直接雙擊 `index.html` 就能玩**，也可以原封不動放上 GitHub Pages。

流程：`index.html` 選角 → `battle.html` 測試房間（3 隻史萊姆）。

## 共用規則

- **行動順序**：每回合開始時，所有單位擲 1d20 ＋ 速度，高的先動（同分比速度，再同分玩家先）。
- **行動點（★）**：每到自己回合補滿。移動、普攻、技能都花行動點。
- **非自己回合**：敵人的回合中（包含撞擊倒數時）也可以做任何行動，但行動點消耗 ×2，大招除外。自己回合沒用完的點數就是留給這時候用的。被攻擊時不會跳出提示，要自己看紅框。
- **冷卻 / 充能**：進入冷卻後，每做一次「有消耗行動點」的行動就減 1（移動、攻擊、技能、閃避都算；上膛後免費射箭這種不花行動點的不算）。大招充能也用同樣方式累積。
- **傷害公式**：`基礎 × (1 + 攻擊力/100) − 防禦`，最少 1。寫在 `js/config.js` 的 `damage()`，換公式只改那裡。

## 角色：弗爾斯勒

生命 75・攻擊 16・防禦 5・速度 12・行動點 6

| 鍵 | 技能 | ★ | 說明 |
|---|---|---|---|
| 普攻 | 踢腿 | 1 | 近距離，10 × 攻擊力% |
| Q | 上膛 | 1 | 進入上膛（頭上出現標示）。上膛後沒移動可免費射箭，移動過射箭要 1 點。箭 16 × 攻擊力%，路線穿過煙霧 ×1.5（不疊加）。射箭後冷卻 |
| E | 煙霧吐出 | 1 | 在身邊放一團煙霧，2 回合後消失，最多 3 團（放第 4 團時最舊的消失）。冷卻 4 次行動 |
| W | 煙霧爆發 | 2（暫定） | 開場沒有，累積 7 次行動且場上有煙霧才能用。所有煙霧化成尖刺射向指定點，穿透敵人，每根尖刺對沿路敵人造成 15 × 攻擊力% |

Q 進入上膛後再按一次 Q 就是瞄準射箭，瞄準時會預覽路線、命中的敵人，穿過煙霧會顯示 ×1.5。

## 敵人：史萊姆

低智力，輪到它時一定把 3 點行動點用完：

1. **壓制**：玩家在撞擊距離外、施放距離內 → 紅色虛線圓蓄力，下次輪到它時跳到圓心落下。
2. **撞擊**：玩家夠近 → 紅色長方形框，倒數 1 秒後打中框內的人。倒數中把它打倒，撞擊就會中斷。
3. **移動**：往玩家靠近，被其他史萊姆擋住會繞過去。

壓制落下後要再做 2 次行動才能再用。

## 調數值

`battle.html` 最下方的「測試數值調整」可以即時改大部分數值，按「重新開始戰鬥」重來。重新整理會還原；要保存請改設定檔：

- `js/config.js`：共用規則、傷害公式、史萊姆、測試房間配置
- `js/characters/firsler.js`：弗爾斯勒的屬性與技能

## 檔案

```
index.html               選角頁（js/home.js、css/home.css）
battle.html              戰鬥頁（js/battle-ui.js、css/style.css）
js/config.js             共用數值、史萊姆
js/battle.js             戰鬥規則（回合、行動點、冷卻、閃避、敵人動作），不碰畫面
js/characters/firsler.js 弗爾斯勒的技能（規則＋數值）
js/ai.js                 敵人 AI
assets/icons/            技能圖示、上膛標示
sounds/                  音效
```

**新增角色**：在 `js/characters/` 複製一份角色檔改內容，然後在 `index.html` 和 `battle.html` 加一行 `<script>` 載入它，選角頁會自動出現。

在瀏覽器 Console 輸入 `RPG.getBattle()` 可以看到目前戰鬥的完整狀態。

## 放上 GitHub Pages

1. **`index.html` 要在 repo 的最外層**（打開 repo 首頁就要直接看到 `index.html`、`js/`、`css/`、`sounds/`）。
2. repo 的 **Settings → Pages → Build and deployment**：Source 選 **Deploy from a branch**，Branch 選 **main**、資料夾 **/ (root)**，按 Save。
3. 等 1～2 分鐘，網址是 `https://你的帳號.github.io/repo名稱/`。之後每次推送都會自動更新。

`.nojekyll` 這個空檔案是讓 GitHub 不要用 Jekyll 處理網站，保留就好。

## 音效

| 檔案 | 用途 |
|---|---|
| `sounds/slime-ram.mp3` | 史萊姆撞擊（floraphonic「slime splatter 1」，Pixabay） |
| `sounds/slime-slam.mp3` | 史萊姆壓制落地（Universfield「slime impact」，Pixabay） |
| `sounds/slime-move.mp3` | 史萊姆移動（hamster2000「balloon bop medium」，Pixabay） |
| `sounds/firsler-smoke.mp3` | 弗爾斯勒 E 煙霧吐出 |
| `sounds/firsler-load.mp3` | 弗爾斯勒 Q 射箭（上膛本身沒有聲音） |
| `sounds/firsler-burst.mp3` | 弗爾斯勒 W 煙霧爆發 |

右上角可以開關音效，音量在「測試數值調整」裡。

> 之前的連網版（Python 伺服器）保存在 git 標籤 `online-prototype`。
