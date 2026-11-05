# 網頁 RPG — 戰鬥測試（單機版）

純前端，不需要伺服器：**直接雙擊 `index.html` 就能玩**。也可以原封不動放上 GitHub Pages。

> 之前的連網版（Python 伺服器＋選角主頁）保存在 git 標籤 `online-prototype`，需要時可以 `git checkout online-prototype` 找回來。

## 規則

- **回合順序**：每回合依「速度」由高到低排序。
- **行動點（★）**：每到自己回合補滿。移動、普攻、技能都花行動點。
- **非自己回合**：只能用「雙倍行動點」移動閃避，所以自己回合要不要留點數是個取捨。

### 史萊姆（測試用敵人）

低智力：輪到它時一定把 3 點行動點全部用完，不會留點數。每一點的選擇順序：

1. **壓制**：技能就緒、玩家在撞擊距離外但在施放距離內 → 在玩家位置畫出大範圍的**紅色虛線圓**開始蓄力，**下次輪到史萊姆時跳到圓心落下**。玩家可以趁自己的回合走出去。圓心被人佔住時，史萊姆會落在旁邊最近的空位。
2. **撞擊**：玩家夠近 → 朝玩家畫出**紅色長方形框**，中間倒數 1 秒，這 1 秒內點藍圈可以花雙倍行動點閃避。
3. **移動**：都不行就往玩家靠近。
4. 連移動都沒辦法 → 愣在原地，點數浪費掉。

**冷卻**：壓制落下後，史萊姆要再做 2 次行動才能再用。每做一次移動或撞擊就少 1。

## 調數值

- 頁面最下方的「測試數值調整」可以即時改反應時間、範圍、冷卻等數值，按「重新開始戰鬥」重來。重新整理頁面會還原。
- 要正式保存，改 `js/config.js`。目前標「暫定」的數值都等角色設計好再定。

## 檔案

```
index.html        戰鬥頁
css/style.css     樣式
js/config.js      所有數值（角色、技能、史萊姆）
js/battle.js      戰鬥規則（回合、行動點、閃避、撞擊/壓制結算），不碰畫面
js/ai.js          敵人 AI（目前只有史萊姆）
js/main.js        畫面、操作、數值調整面板
sounds/           音效
```

新增敵人：在 `config.js` 的 `enemies` 加數值，在 `ai.js` 加一個同名的 AI，再把它放進 `wave`。

規則（`battle.js`）和畫面（`main.js`）是分開的，之後做連網時可以把規則搬到伺服器。

在瀏覽器的 Console 輸入 `RPG.getBattle()` 可以看到目前戰鬥的完整狀態。

## 放上 GitHub Pages

不需要任何設定檔，用「從分支發佈」就好：

1. **`index.html` 要在 repo 的最外層**（打開 repo 首頁就要直接看到 `index.html`、`js/`、`css/`、`sounds/`）。
   如果看到的是一個 `web-rpg/` 資料夾、檔案在裡面，網站就會找不到頁面。
2. repo 的 **Settings → Pages → Build and deployment**：
   - Source：**Deploy from a branch**
   - Branch：**main**，資料夾 **/ (root)**，按 Save
3. 等 1～2 分鐘，網址是 `https://你的帳號.github.io/repo名稱/`。之後每次推送都會自動更新。

`.nojekyll` 這個空檔案是讓 GitHub 不要用 Jekyll 處理網站，保留就好。

## 音效

| 檔案 | 用途 | 來源 |
|---|---|---|
| `sounds/slime-ram.mp3` | 史萊姆撞擊 | floraphonic「slime splatter 1」（Pixabay） |
| `sounds/slime-slam.mp3` | 史萊姆壓制落地 | Universfield「slime impact」（Pixabay） |
| `sounds/slime-move.mp3` | 史萊姆移動 | hamster2000「balloon bop medium」（Pixabay） |

右上角可以開關音效（會記住），音量在「測試數值調整」裡。換音效只要改 `js/config.js` 的 `sounds`。
