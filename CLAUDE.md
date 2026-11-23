# CLAUDE.md — 網頁 RPG（web-rpg）

給 Claude（或其他 AI）的專案說明。**設計文件是 `README.md`**（角色、時空、委託、戰鬥規則、多人連線計畫都寫在那裡），動手前先讀相關段落；改了設計就同步更新 README。

## 專案目的
一款直接在瀏覽器玩的回合制 RPG（純 HTML／CSS／JavaScript，放在 GitHub Pages）。玩家在「時空酒館」選一位**適格者**（來自不同時空的角色），接下委託、穿越到各個**時空**探索地圖、解事件、打戰鬥；一輪冒險從委託執照 C 級開始往上爬。正在準備少人數的點對點連線版（PeerJS）。
目前的重點是把戰鬥系統、時空內容和角色做完整，數值都是暫定、可以用戰鬥頁的「測試數值調整」面板即時調。

## 溝通
- 一律用**繁體中文**回覆，並寫出自己做了哪些**假設**。
- 使用者自己上傳到 GitHub（GitHub Pages），Claude 不能 push。

## 文本規則（最重要）
- **不要替適格者（玩家角色）編個性台詞**：`barks`、`arrival`、`asks`、事件台詞只能用使用者提供的文本；沒有就留空（`lines: []`），並告訴使用者哪些事件等他填。
  - 例外：**觀知命**、**霍夫曼**的台詞和專屬對話選項，使用者授權由 Claude 撰寫。
- **NPC 的台詞可以寫**。
- 角色簡介、設定若是使用者寫的，照原文放進去（只修錯字）。

## 專案結構
- 純前端，不用打包工具：`index.html`、`tavern.html`（酒館）、`world.html`（時空地圖）、`battle.html`（戰鬥）。新的 js 檔要在**每個用到它的 html** 加 `<script>`。
- `js/characters/<id>.js`：一個適格者一個檔，註冊到 `RPG.CHARACTERS`。常用掛鉤：`outgoingMult`、`onTurnStart`、`onUnitDeath`、`intercept`、`onEnemyAction`、`onAction`、`chargeNeed`／`onCharge`、`hideUnit`、`drawBattle`、`fxEvents`／`drawFx`、`tune`（測試數值面板）。最新的角色檔（`phantom.js`、`bastian.js`、`youyan.js`）是好範本。
  - 新角色也要加進 `js/kn-stg.js` 的駕駛員技能。
  - **掩體規則**（README「共用規則」的表）：新的位移、直線攻擊、射擊技能都要走 `js/battle.js` 的 `travel`／`rayCover`／`seen`／`clipLine`／`throwLand`，並且標清楚是哪一種（dash 直線位移、leap 跳躍、shot 投射物、line 直線、throw 投擲物）。不要自己從終點往回找落點（會穿牆）。
- `js/maps/<代號>.js`（地圖資料）＋ `js/worlds/<代號>.js`（時空的互動、事件，`MAP.wpScene` 這類掛鉤）。
- `js/battle.js`（戰鬥規則）、`js/battle-ui.js`（畫面）、`js/ai.js`、`js/config.js`（敵人、房間）、`js/enemy-kit.js`（一般敵人的攻擊方式、特有被動；新敵人要在 `ASSIGN` 給一組）、`js/bestiary.js`、`js/items.js`、`js/commissions.js`、`js/bag.js`。
- 連線：`js/net.js`（PeerJS，房主說了算；`?net=local` 用同一個瀏覽器的分頁測試）、`js/watergun.js`、`js/uno.js`。
- `sounds/`：音效與 BGM；新角色沒有專屬音效時先借現有的，並在 README 註明。
- 畫風：時空裡的人用和玩家一樣的方塊（中間放特徵或一個字），除非使用者另外設計。**人形的東西都一樣**（人偶、機械船員、魚變成的人…）：方塊＋各自的特徵（例如機械＝黃銅邊框、鉚釘、上鍊鑰匙），不要畫出手腳身體。

## 新增內容的步驟

**新的頁面**
1. 在根目錄建 `<名稱>.html`，照現有頁面的 `<head>`：`<meta name="build">`、`css/style.css`、需要的 js（`?v=` 版本號交給 `stamp_version.py` 蓋）。
2. 頁面邏輯寫在 `js/<名稱>.js`，掛在全域 `window.RPG`（`const R = window.RPG`），不要用 ES module、不要引入打包工具。
3. 從酒館或其他頁面加入口連結；`a.back` 連回上一頁。
4. 在 README 加一段說明，並把新檔案加進 README 最後的檔案列表。

**新的適格者**
1. 複製一個近期的角色檔當骨架，填 `id／name／letter／color／profile／stats／growth／field／barks／basic／ultimate／hud／passive／upgrades／skills`。
2. 技能數值放在技能物件上，並把重要的數值加進 `tune`。
3. 在 `battle.html`、`world.html`、`tavern.html` 加 `<script>`；在 `js/kn-stg.js` 加駕駛員技能。
4. 台詞留空等使用者給；README 新增「## 角色：○○」一節（使用者的設定原文＋我補的數值、強化、假設）。

**新的時空**
1. `js/maps/<代號>.js` 放地圖（場景、出口、NPC、`arrival`、`asks`、`barks`），`js/worlds/<代號>.js` 放互動邏輯；兩個都加進 `world.html`。
2. 委託寫在 `js/commissions.js`，魔物寫在 `js/config.js`＋`js/bestiary.js`，道具寫在 `js/bag.js`／`js/items.js`。
3. README 的時空段落寫清楚：區域、委託流程、支線、敵人。
4. 時空裡的另一個場景（裏時空、礦井…）：地圖註冊成 `R.MAPS["代號/場景"]`，玩法檔包住原本的掛鉤（`const base = R.WorldHooks.代號`，`if (api.MAP.場景旗標) return ...`），用 `api.changeScene` 換場景；範本是 `lg00412-forge.js`、`mm22330-mine.js`（隨機地形要在**地圖檔**裡照存檔的 seed 產生，因為魔物在時空程式之前就建立了）。

**新的戰役**（很少刷出來、重視演出的試煉 Boss 戰）
1. `js/commissions.js` 的 `WORLDS` 加一個時空、`LIST` 加一張委託，兩個都標 `campaign: true`；酒館的 `boardCampaigns` 會自己用 `CAMPAIGN_CHANCE` 抽（測試：localStorage `rpg.campaignChance` = `1`）。
2. 戰鬥做成試煉 Boss（有自己的 AI、演出），README「戰役」那一節補上內容。
3. 範本：`js/casino.js`（致命賭局）——房間可以用 `preStart`（開戰前）、`onWin`（打贏的獎勵）、`jackpotGoal`（別的勝利條件）、`drawRoom`；不參戰的主持人用 `def.host`（打不到、不畫）。

**完成的標準**：相關頁面打開沒有錯誤、新功能用 Playwright 實際操作過一次、README 已更新、跑過交付流程。

## 測試
- **測試檔、截圖不要放進專案資料夾**：寫在 Claude 的 scratchpad。`shots/` 已被 gitignore，使用者給的參考圖放 `shots/ref-sj/`。
- 用 Playwright 開本機伺服器（`python3 -m http.server -d /home/claude`）測頁面；戰鬥可以用 `battle.html?char=<id>&room=slimes`，`RPG._B` 是目前的戰鬥。
- 沙盒連不到外部 CDN（PeerJS、Google Fonts），相關錯誤可以忽略。

## 交付流程
每次改動程式後：

```bash
cd /home/claude/web-rpg && python3 tools/stamp_version.py && git add -A && git commit -qm "<訊息>" && rm -f ../web-rpg.zip && zip -qr ../web-rpg.zip . -x '.git/*' -x '.gitignore'
```

- commit 訊息結尾附上系統提示要求的 Co-Authored-By／Claude-Session 行。
- 把 `/home/claude/web-rpg.zip` 傳給使用者，並說明這次**新增了哪些檔案**（使用者整包覆蓋上傳）。
- 只改 README 的設定筆記：commit 就好，不用重新打包。
- `stamp_version.py` 會替所有檔案蓋同一個版本號；網頁發現檔案版本不一致會在最上方跳紅色提示（通常是漏傳檔案或瀏覽器快取）。
