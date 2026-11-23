/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/casino.js": "20261123215910" });
// 戰役 #DG00777 致命賭局（A 級）：大莊家斯賓沃迪的賭桌
// 斯賓沃迪是 Boss 兼委託人，但他不參戰：像主持人一樣站在賭桌後面，用對話框說話（打不到、不會倒）
// 勝利條件：累積獎金到 100 萬（b.jackpot）→ 他會問要不要「加注」：
//   站到「加注」的範圍＝他用手把獎金條推回零，進入第二階段，玩到 1000 萬（獎金全部 ×10，他開始出千）
//   站到「收手」的範圍＝直接贏
// 這場不給金幣，給「籌碼」（打贏後在賭場地圖上消費）；開戰前可以賭上生命，賭越多、加注贏的話，籌碼越多
// **選擇都不用選項視窗**：地上出現幾個範圍＋倒數（準備時間只能移動、不花行動點），時間到站在哪一格就是選哪個
// 他的回合輪流開一種賭局（數值都暫定）：
//   轉拉霸機：他的臉就是拉霸機，三格各召喚一隻籌碼小怪（點數越高越強，打倒拿那個點數的獎金）；轉到骷髏＝炸彈
//   比大小：兩顆骰子蓋進杯子搖，站到「大」或「小」；猜中拿獎金，猜錯骰子爆炸、冒出籌碼小怪（7 點＝莊家通殺）
//   21 點：每個玩家照順序玩，站到「要牌」或「停牌」；停牌照點數拿獎金，爆牌＝玩家身上爆炸、向四周射出會反彈的撲克牌
//   柏青哥：地面突出釘子，上面掉下彈珠；打到玩家會爆炸，每顆滾到最底下拿獎金
//   猜位子：用杯子蓋住一個玩家，再拿出兩個杯子快速交換；被蓋住的玩家點一個杯子猜自己在哪；猜錯＝所有杯子噴火柱、天上掉火球
//   死亡輪盤（大招，每 5 次）：所有玩家被傳送到輪盤中間，準備時間內走到一格「下注」；手槍轉完射那一格，沒被射到的拿獎金
// 第二階段的出千：敲自己的頭轉出三個骷髏、抓住快掉到底的彈珠放回上面、死亡輪盤結束後拿槍射玩家、每隔一段時間丟飛鏢或三張回旋撲克牌
// 外觀（照使用者的草稿，用圖形拼）：拉霸機的頭（黑色、金色菱格、三格視窗＝表情：7、骷髏、DIE、炸彈、葡萄）、右邊的拉桿、
//   紅色領結、白襯衫、暗紅色的西裝；兩隻漂浮的手（白手套、四根手指）
// 多人的時候「每個玩家」都要玩（比大小、21 點）；目前單人，players() 只會有自己
(function () {
  const R = (window.RPG = window.RPG || {});
  const C = R.CONFIG;
  if (!C) return;
  const E = C.enemies;
  const GOAL = 1000000, GOAL2 = 10000000;
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  const dist = (a, b, c, d) => Math.hypot(a - c, b - d);

  // ===== 數值（暫定） =====
  const CHIPS = {
    1: { kind: "chip1", name: "白籌碼・1", col: "#f4f0e6", edge: "#3a6ab8", hp: 60, atk: 20, value: 20000 },
    5: { kind: "chip5", name: "紅籌碼・5", col: "#d8323a", edge: "#f4f0e6", hp: 80, atk: 22, value: 50000 },
    25: { kind: "chip25", name: "綠籌碼・25", col: "#2a9a4a", edge: "#f4f0e6", hp: 105, atk: 25, value: 100000 },
    100: { kind: "chip100", name: "黑籌碼・100", col: "#1d1d22", edge: "#e8c050", hp: 140, atk: 28, value: 200000 },
  };
  // 第二階段：所有獎金 ×10
  const PRIZE = { dice: 150000, perPoint: 10000, blackjack: 400000, ball: 20000, shell: 200000, roulette: 100000 };
  const WAGERS = [{ pct: 0, chips: 100, label: "不賭" }, { pct: 0.1, chips: 150, label: "賭上 10% 生命" }, { pct: 0.25, chips: 220, label: "賭上 25% 生命" }];
  const RAISE_MULT = 2.5;                 // 加注之後贏：籌碼 ×2.5
  const PREP = { wager: 10, dice: 10, bj: 10, roulette: 10, shell: 10, raise: 10 };   // 準備時間（秒）
  const P2 = { cheatSlot: 0.6, grab: 0.5, harass: 9 };   // 第二階段：敲頭的機率、抓彈珠的機率、每幾秒丟一次飛鏢／撲克牌
  // 拉霸機的格子：哪個圖案叫出哪一種籌碼（骷髏＝炸彈）
  const REEL = [{ sym: "grape", chip: 1, w: 4 }, { sym: "bomb", chip: 5, w: 3 }, { sym: "die", chip: 25, w: 2 }, { sym: "seven", chip: 100, w: 1 }, { sym: "skull", chip: 0, w: 2 }];

  // ===== 敵人 =====
  E.spinwardy = { name: "大莊家斯賓沃迪", ai: "dealer", host: true, bigBar: true, jackpotBar: true, color: "#8a1a24", hp: 999, atk: 26, df: 0, spd: 30, ap: 1, moveCost: 9, r: 18, alwaysFirst: true };
  for (const [pts, c] of Object.entries(CHIPS)) {
    E[c.kind] = { name: c.name, ai: "wolf", color: c.col === "#f4f0e6" ? "#3a6ab8" : c.col, hp: c.hp, atk: c.atk, df: 4 + Math.log10(+pts) * 2, spd: 11, ap: 3, moveCost: 1, r: 22 + Math.log10(+pts) * 4, flank: 0.7, chipValue: c.value, chipPts: +pts,
      bite: { name: "籌碼撞擊", ap: 1, length: 90, width: 70, base: 14 + Math.log10(+pts) * 3, reaction: 0.85, sound: "sounds/coin-toss.mp3" },
      pounce: { name: "滾過來", ap: 2, length: 300, width: 64, base: 16 + Math.log10(+pts) * 3, reaction: 1.0, cooldown: 2, sound: "sounds/coin-toss.mp3" },
      sounds: { move: "sounds/coin-toss.mp3" } };
  }
  if (R.EnemyKit?.ASSIGN) {                         // 籌碼的攻擊方式：高點數的會衝撞（enemy-kit 已經套用過一次了，這裡自己套）
    const A = { chip1: { style: "frenzy" }, chip5: { style: "hitRun" }, chip25: { style: "charge" }, chip100: { style: "charge", trait: "armor" } };
    Object.assign(R.EnemyKit.ASSIGN, A); for (const [k, v] of Object.entries(A)) Object.assign(E[k], v);
  }

  // ===== 房間：賭桌 =====
  C.rooms.casino = {
    name: "致命賭局", desc: "大莊家斯賓沃迪的賭桌", hidden: true, terrain: "casino", bgm: "sounds/casino-bgm.mp3",
    retreat: null, xp: 1600, gold: [0, 0], playerStart: { x: 640, y: 640 },
    wave: [{ kind: "spinwardy", x: 640, y: 84 }],
    jackpotGoal: GOAL, winText: "贏下了致命賭局！",
    help: "<b>大莊家斯賓沃迪</b>不參戰（打不到）：輪流開賭局——轉拉霸機（籌碼小怪）、比大小、21 點、柏青哥、猜位子、死亡輪盤（大招）。要選擇的時候，地上會出現範圍和倒數：<b>時間到站在哪一格就是選哪個</b>。累積獎金到 <b>100 萬</b>後可以加注到 1000 萬",
    // 開戰前：賭上生命（站到範圍裡）
    preStart: (b) => wagerPrompt(b),
    onStart(b) { cs(b); b.jackpotHold = true; hostSay(b, pick(LINES.open)); },
    drawRoom(ctx, now, b, H) { drawOver(ctx, now, b, H); },
    // 打贏：照開場賭的生命、有沒有加注給籌碼（存在這一趟，賭場地圖上用）
    onWin(b, trip) {
      const S = cs(b), w = WAGERS[S.wager || 0], chips = Math.round(w.chips * (S.phase === 2 ? RAISE_MULT : 1));
      trip.qdata = trip.qdata || {};
      const Q = (trip.qdata.casino = trip.qdata.casino || { chips: 0 });
      Q.chips = (Q.chips || 0) + chips; Q.won = true; Q.wager = w.pct; Q.raised = S.phase === 2;
      return `<span class="reward coin">獲得 ${chips} 枚籌碼（開場${w.pct ? `賭上 ${w.pct * 100}% 生命` : "沒有下注"}${S.phase === 2 ? `、加注到 1000 萬 ×${RAISE_MULT}` : ""}）・到賭場的兌換櫃台使用</span>`;
    },
  };

  // ===== 台詞（NPC：老謀深算、追求刺激的賭徒） =====
  const LINES = {
    open: ["歡迎光臨。這張桌子上只賭一樣東西——你還能不能站著離開。", "放輕鬆。賭局最美的地方，就是誰都不知道下一張牌是什麼。……包括我。"],
    wager: "開局之前，要不要先加點籌碼？用你的命。站到你想下的那一格——我只收一點點，剛好讓你心跳加速的那一點點。",
    wagerYes: ["好！就是這個表情！", "下注了。現在，你的命跟我的獎金綁在一起了。"],
    wagerNo: ["保守。很聰明。……也很無聊。"],
    slot: ["來，拉一把。看看今天的運氣站在誰那邊。", "叮叮叮——我最喜歡這個聲音了。"],
    slotSkull: ["哎呀，骷髏。這一格，算你的。"],
    knock: ["咚、咚。……這台機器有時候需要一點鼓勵。", "別這樣看我。敲一敲頭，運氣就來了——我的運氣。"],
    dice: ["兩顆骰子，一個杯子。大，還是小？站過去。", "猜錯了也沒關係——骰子會替我說話。"],
    diceWin: ["猜中了？哼，運氣不錯嘛。"],
    diceLose: ["猜錯了。砰。"],
    diceNone: ["不下注？在我的桌上，不選也是一種選擇——錯的那種。"],
    seven: ["七點。莊家通殺。……這可不是我作弊，是骰子喜歡我。"],
    bj: ["二十一點。貪心一點的人，通常死得比較快。", "要牌，還是停牌？這是你今天做過最重要的決定。"],
    bjBust: ["爆了！哈哈哈，就是這種瞬間！"],
    bjStand: ["停在這裡？……好吧，拿去。"],
    bj21: ["二十一點整。……我開始喜歡你了。"],
    pachinko: ["彈珠會往哪裡掉？神也不知道。所以才好玩。", "別擋路——讓它們滾到底，你就有錢拿。"],
    grab: ["欸，這顆還沒玩夠。", "回去。"],
    shell: ["來玩個小遊戲。你就是今天的獎品——猜猜看，你在哪一個杯子裡？", "眼睛跟好。我的手，可是比你的眼睛快。"],
    shellWin: ["……你看得到？不，你是猜的。猜對也算。"],
    shellLose: ["錯了！杯子們，生氣吧！"],
    roulette: ["該來點真正刺激的了。十二格，一顆子彈。站到你覺得安全的那一格。", "轉吧，命運的輪盤！選一格——選錯的人，就是答案。"],
    rouletteLive: ["活下來的人，拿錢。"],
    shoot: ["誰說輪盤停了，槍就不能響？"],
    harass: ["手癢。", "接著！"],
    chipDown: ["喔？那一枚可不便宜。", "好手氣。"],
    half: ["已經一半了？……你讓我越來越興奮了。"],
    raise: "一百萬。……你可以帶著它走。或者——我們把桌子掀高一點？一千萬。站到「加注」那一格，我們繼續。",
    raiseYes: ["哈哈哈！就是你了！從現在起，我也不打算守規矩了。", "好、好、好！零。從零開始。一千萬，賭你的全部。"],
    raiseNo: ["收手了？……可惜。不過，知道什麼時候停，也是一種本事。"],
    win: ["一百萬……拿去吧。輸給一個敢賭的人，不算輸。", "精彩。這才叫賭局。籌碼收好——賭場的大門為你開著。"],
    win2: ["一千萬。……我出千了，你還是贏了。今天，我輸得心服口服。"],
  };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  // ===== 賭局的狀態（掛在戰鬥上） =====
  function cs(b) {
    if (!b.cs) b.cs = { face: ["grape", "seven", "grape"], say: null, hands: [{ x: 520, y: 120, tx: 520, ty: 120 }, { x: 760, y: 120, tx: 760, ty: 120 }], turn: 0, last: null, wager: 0, half: false, lever: 0, spin: null, dice: null, pegs: null, balls: [], wheel: null, cards: null, booms: [],
      phase: 1, busy: false, zone: null, shell: null, push: null, knock: 0, flying: [] };
    if (b.jackpot == null) b.jackpot = 0;
    return b.cs;
  }
  const host = (b) => b.units.find((u) => u.def.host);
  const players = (b) => b.units.filter((u) => u.team === "player" && !u.summon && !u.ward && u.alive);
  const mult = (b) => (cs(b).phase === 2 ? 10 : 1);
  const goalOf = (b) => b.jackpotGoalNow || GOAL;
  const over = (b) => b.dead || b.phase === "over";
  function hostSay(b, text, face) {
    const S = cs(b);
    S.say = { text, t: performance.now() };
    if (face) S.face = face;
    b.say(`大莊家斯賓沃迪：「${text}」`);
  }
  function hands(b, l, r) { const S = cs(b); if (l) { S.hands[0].tx = l.x; S.hands[0].ty = l.y; } if (r) { S.hands[1].tx = r.x; S.hands[1].ty = r.y; } }
  const restHands = (b) => hands(b, { x: 520, y: 120 }, { x: 760, y: 120 });
  function prize(b, amount, x, y, why) {
    if (over(b)) return;
    amount *= mult(b);
    b.jackpot = (b.jackpot || 0) + amount;
    b.emit({ type: "miss", x, y, text: `+${fmt(amount)}` });
    b.say(`累積獎金 +${fmt(amount)}（${why}）：${fmt(b.jackpot)} / ${fmt(goalOf(b))}`);
    const S = cs(b);
    if (!S.half && b.jackpot >= GOAL / 2 && b.jackpot < GOAL && S.phase === 1) { S.half = true; hostSay(b, pick(LINES.half), ["seven", "seven", "seven"]); }
    if (S.phase === 1 && b.jackpot >= GOAL && !S.raiseAsked) { S.raisePending = true; if (!S.busy) runRaise(b); }
    if (S.phase === 2 && b.jackpot >= GOAL2) hostSay(b, pick(LINES.win2), ["seven", "seven", "seven"]);
    b.checkEnd();
  }
  // 爆炸（特效＋圓形範圍判定，沒有預告：用在「已經發生」的爆炸）
  function boom(b, x, y, radius, base, label) {
    const S = cs(b), h = host(b);
    S.booms.push({ x, y, r: radius, t: performance.now() });
    b.emit({ type: "strike", kind: "bellRing", shape: "circle", x, y, radius, sound: "sounds/explosion.mp3" });
    for (const p of players(b)) if (dist(p.x, p.y, x, y) <= radius + p.r * 0.5) { b.say(`${label}炸到了 ${p.name}！`); b.damage(h, p, base); }
    for (const a of b.allies()) if (a.alive && dist(a.x, a.y, x, y) <= radius) b.damage(h, a, base);
  }
  function spawnChip(b, pts, x, y) {
    const c = CHIPS[pts]; if (!c) return null;
    return b.summonEnemy(c.kind, Math.max(80, Math.min(1200, x)), Math.max(180, Math.min(600, y)));
  }

  // ===== 用站位選擇：地上出現幾個範圍＋倒數，時間到站在哪一格就是選哪個 =====
  //   zones：[{ id, label, sub, x, y, w, h（長方形）或 r（圓形）, col }]；def＝沒站在任何一格時算哪個
  //   準備時間內只能移動、不花行動點（b.moveOnly、b.freeAP）
  const inZone = (z, p) => (z.r != null ? dist(p.x, p.y, z.x, z.y) <= z.r : p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h);
  async function zoneChoice(b, { title, zones, secs, def }) {
    const S = cs(b);
    S.zone = { title, list: zones, end: performance.now() + secs * 1000, secs };
    b.freeAP = true; b.moveOnly = true; b.emit({ type: "zoneChoice" });
    await b.wait(secs);
    b.freeAP = false; b.moveOnly = false;
    const out = new Map();
    for (const p of players(b)) { const z = zones.find((z) => inZone(z, p)); out.set(p, z ? z.id : def); }
    S.zone = null; b.emit({ type: "zoneChoice" });
    return out;
  }

  // ===== 開場：賭上生命 =====
  async function wagerPrompt(b) {
    const S = cs(b), p = b.player;
    hostSay(b, LINES.wager, ["die", "skull", "seven"]);
    const zones = WAGERS.map((w, i) => ({ id: i, label: w.label, sub: w.pct ? `-${Math.round(p.maxHp * w.pct)} 生命・籌碼 ${w.chips}` : `籌碼 ${w.chips}`, x: 150 + i * 340, y: 330, w: 300, h: 200, col: ["#8a8a90", "#e8a040", "#e8262c"][i] }));
    const pickd = await zoneChoice(b, { title: "要不要賭上一點生命？站到你想下注的那一格", zones, secs: PREP.wager, def: 0 });
    S.wager = pickd.get(p) ?? 0;
    const w = WAGERS[S.wager];
    if (w.pct) {
      const loss = Math.min(p.hp - 1, Math.round(p.maxHp * w.pct));
      p.hp -= loss;
      b.emit({ type: "damage", unit: p, amount: loss, text: `賭上 -${loss}` });
      b.say(`${p.name} 賭上了 ${loss} 點生命（打贏拿 ${w.chips} 枚籌碼）`);
      hostSay(b, pick(LINES.wagerYes), ["seven", "seven", "seven"]);
    } else hostSay(b, pick(LINES.wagerNo), ["grape", "grape", "grape"]);
  }

  // ===== 一百萬：加注嗎？ =====
  async function runRaise(b) {
    const S = cs(b);
    if (S.raiseAsked || over(b)) return;
    S.raiseAsked = true; S.raisePending = false; S.busy = true;
    try {
      hostSay(b, LINES.raise, ["seven", "die", "seven"]);
      const zones = [{ id: "stop", label: "收手", sub: "帶著 100 萬離開", x: 180, y: 360, w: 360, h: 220, col: "#8a8a90" },
        { id: "raise", label: "加注", sub: `玩到 1000 萬・籌碼 ×${RAISE_MULT}`, x: 740, y: 360, w: 360, h: 220, col: "#e8262c" }];
      const res = await zoneChoice(b, { title: "加注到 1000 萬？站到你的答案上", zones, secs: PREP.raise, def: "stop" });
      if (over(b)) return;
      if ([...res.values()].includes("raise")) {
        hostSay(b, pick(LINES.raiseYes), ["skull", "seven", "skull"]);
        // 用手把獎金條推回零
        S.push = { t: performance.now(), from: b.jackpot };
        hands(b, null, { x: 1100, y: 26 });
        const t0 = performance.now(), from = b.jackpot;
        while (performance.now() - t0 < 1400 && !over(b)) { const k = (performance.now() - t0) / 1400; b.jackpot = Math.round(from * (1 - k)); hands(b, null, { x: 1100 - k * 900, y: 26 }); b.emit({ type: "jackpot" }); await b.wait(0.05); }
        b.jackpot = 0; S.push = null; S.phase = 2; b.jackpotGoalNow = GOAL2; b.jackpotHold = false;
        b.say("── 第二階段：累積獎金推回零，目標 1000 萬（獎金 ×10）。大莊家開始出千了 ──");
        b.emit({ type: "bossUlt", unit: host(b), text: "加注・1000 萬" });
        await b.wait(1.2); b.emit({ type: "bossUltEnd" });
        restHands(b);
        harassLoop(b);
      } else {
        hostSay(b, pick(LINES.raiseNo), ["grape", "seven", "grape"]);
        b.jackpotHold = false; b.checkEnd();
      }
    } finally { S.busy = false; }
  }

  // ===== 第二階段：每隔一段時間丟飛鏢或三張回旋撲克牌 =====
  async function harassLoop(b) {
    const S = cs(b);
    let n = 0;
    while (!over(b)) {
      await b.wait(P2.harass);
      if (over(b)) return;
      if (S.busy || S.zone || S.shell) continue;
      const p = pick(players(b)); if (!p) continue;
      if (Math.random() < 0.3) hostSay(b, pick(LINES.harass));
      if (n++ % 2 === 0) await darts(b, p); else await boomerangs(b, p);
    }
  }
  async function darts(b, p) {
    const u = host(b), from = cs(b).hands[0];
    b.emit({ type: "buff", unit: u, text: "飛鏢", color: "#e8c050" });
    b.say("大莊家斯賓沃迪丟出了三支飛鏢！");
    for (let i = 0; i < 3 && !over(b); i++) {
      hands(b, { x: 380 + i * 60, y: 140 }, null);
      const ang = Math.atan2(p.y - from.y, p.x - from.x) + (i - 1) * 0.08;
      b.telegraph(u, { shape: "rect", x: from.x, y: from.y, ang, length: 1100, width: 22, reaction: 0.55 }, { base: 13, label: "飛鏢", sound: "sounds/wolf-bite.mp3", quiet: true });
      await b.wait(0.25);
    }
    await b.wait(0.7);
    restHands(b);
  }
  // 三張回旋撲克牌：飛出去再飛回手上，去程、回程各打一次
  async function boomerangs(b, p) {
    const S = cs(b), u = host(b), h = S.hands[1];
    b.emit({ type: "buff", unit: u, text: "回旋撲克牌", color: "#e8c050" });
    b.say("大莊家斯賓沃迪甩出了三張回旋撲克牌！");
    const base = Math.atan2(p.y - h.y, p.x - h.x);
    const cards = [-0.35, 0, 0.35].map((da) => ({ x: h.x, y: h.y, ang: base + da, d: 0, back: false, hitOut: new Set(), hitBack: new Set() }));
    S.flying = cards;
    const SPEED = 640, RANGE = 620;
    while (cards.some((c) => !c.done) && !over(b)) {
      const dt = 0.03;
      for (const c of cards) {
        if (c.done) continue;
        if (!c.back) { c.d += SPEED * dt; c.x = h.x + Math.cos(c.ang) * c.d; c.y = h.y + Math.sin(c.ang) * c.d; if (c.d >= RANGE) c.back = true; }
        else { const dx = h.x - c.x, dy = h.y - c.y, L = Math.hypot(dx, dy); if (L < 20) { c.done = true; continue; } c.x += (dx / L) * SPEED * dt; c.y += (dy / L) * SPEED * dt; }
        for (const q of players(b)) { const set = c.back ? c.hitBack : c.hitOut; if (!set.has(q) && dist(q.x, q.y, c.x, c.y) < q.r + 14) { set.add(q); b.damage(u, q, 12, 1, "（回旋撲克牌）"); } }
      }
      await b.wait(0.03);
    }
    S.flying = [];
  }

  // ===== 斯賓沃迪的回合 =====
  R.AI = R.AI || {};
  R.AI.dealer = {
    init(b, u) { u.state.invuln = true; cs(b); },
    async takeTurn(b, u) {
      const S = cs(b);
      u.ap = 0;
      if (S.raisePending) { await runRaise(b); if (over(b)) return; }
      S.turn++;
      let game;
      if (S.turn % 5 === 0) game = "roulette";
      else if (S.turn === 1) game = "slot";
      else {
        const chips = b.mainEnemies().filter((e) => e.def.chipValue).length;
        let pool = ["slot", "dice", "blackjack", "pachinko", "shell"].filter((g) => g !== S.last);
        if (chips >= 4) pool = pool.filter((g) => g !== "slot");
        if (!chips && S.last !== "slot") pool.push("slot");          // 場上沒有籌碼：比較常轉拉霸機
        game = pick(pool);
      }
      S.last = game;
      S.busy = true;
      try { await GAMES[game](b, u); } catch (e) { console.error(e); }
      finally { S.busy = false; b.moveOnly = false; b.freeAP = false; b.cutscene = false; S.zone = null; for (const p of b.units) if (p.state?.casinoHidden) p.state.casinoHidden = false; }
      restHands(b);
      if (S.raisePending && !over(b)) await runRaise(b);
    },
    onUnitDeath(b, u, dead) {
      if (!dead.def.chipValue) return;
      prize(b, dead.def.chipValue, dead.x, dead.y, `打倒${dead.name}`);
      if (Math.random() < 0.35 && !over(b)) hostSay(b, pick(LINES.chipDown));
    },
  };

  const GAMES = {
    // ---- 轉拉霸機（第二階段：可能敲頭出千，轉出三個骷髏） ----
    async slot(b, u) {
      const S = cs(b);
      b.emit({ type: "buff", unit: u, text: "轉拉霸機", color: "#e8c050" });
      hostSay(b, pick(LINES.slot));
      hands(b, null, { x: 735, y: 50 });
      await b.wait(0.5);
      S.lever = performance.now();                          // 拉下拉桿
      const tot = REEL.reduce((a, r) => a + r.w, 0);
      const roll = () => { let x = Math.random() * tot; for (const r of REEL) { x -= r.w; if (x <= 0) return r; } return REEL[0]; };
      const cheat = S.phase === 2 && Math.random() < P2.cheatSlot;
      const skull = REEL.find((r) => r.sym === "skull");
      const res = cheat ? [skull, skull, skull] : [roll(), roll(), roll()];
      S.spin = { t: performance.now(), stop: [1.0, 1.5, 2.0], res: res.map((r) => r.sym) };
      if (cheat) {                                           // 出千：轉到一半敲自己的頭
        await b.wait(0.8);
        hands(b, { x: 600, y: 10 }, null);
        await b.wait(0.3);
        S.knock = performance.now(); hostSay(b, pick(LINES.knock));
        await b.wait(1.1);
      } else await b.wait(2.2);
      S.spin = null; S.face = res.map((r) => r.sym);
      restHands(b);
      const xs = [380, 640, 900];
      for (let i = 0; i < 3; i++) {
        const r = res[i];
        if (r.chip) { const c = spawnChip(b, r.chip, xs[i] + (Math.random() - 0.5) * 80, 240 + Math.random() * 80); if (c) b.say(`拉霸機吐出了 ${c.name}（打倒拿 ${fmt(c.def.chipValue * mult(b))}）`); }
      }
      const skulls = res.filter((r) => r.sym === "skull").length;
      if (skulls) {
        if (!cheat) hostSay(b, pick(LINES.slotSkull), ["skull", "skull", "skull"]);
        for (let i = 0; i < skulls && !over(b); i++) {
          const p = pick(players(b)); if (!p) break;
          await b.telegraph(u, { shape: "circle", x: p.x, y: p.y, radius: 110, reaction: 1.0 }, { base: 22, label: "骷髏炸彈", sound: "sounds/explosion.mp3" });
        }
      }
      if (res.every((r) => r.sym === "seven")) hostSay(b, "七、七、七！……今天的運氣，全都站到我這邊來了。", ["seven", "seven", "seven"]);
    },

    // ---- 比大小：站到「大」或「小」 ----
    async dice(b, u) {
      const S = cs(b), CX = 640, CY = 250;
      b.emit({ type: "buff", unit: u, text: "比大小", color: "#e8c050" });
      hostSay(b, pick(LINES.dice), ["grape", "die", "grape"]);
      const d = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
      S.dice = { x: CX, y: CY, vals: d, stage: "roll", t: performance.now() };
      b.emit({ type: "sfx", sound: "sounds/dice.mp3" });
      hands(b, { x: CX - 70, y: CY - 30 }, { x: CX + 70, y: CY - 30 });
      await b.wait(0.9);
      S.dice.stage = "cover"; S.dice.t = performance.now();
      await b.wait(0.5);
      S.dice.stage = "shake"; S.dice.t = performance.now();
      b.emit({ type: "sfx", sound: "sounds/dice.mp3" });
      const zones = [{ id: "small", label: "小", sub: "2～6", x: 60, y: 360, w: 520, h: 320, col: "#2a8ae8" }, { id: "big", label: "大", sub: "8～12", x: 700, y: 360, w: 520, h: 320, col: "#e8262c" }];
      const shakeEnd = b.wait(1.3);
      const res = await zoneChoice(b, { title: "大還是小？站過去（7 點＝莊家通殺）", zones, secs: PREP.dice, def: null });
      await shakeEnd;
      S.dice.stage = "open"; S.dice.t = performance.now();
      hands(b, { x: CX - 20, y: CY - 120 }, null);
      await b.wait(0.7);
      const sum = d[0] + d[1];
      b.say(`開！${d[0]} ＋ ${d[1]} ＝ ${sum}${sum === 7 ? "（莊家通殺）" : sum >= 8 ? "（大）" : "（小）"}`);
      const truth = sum === 7 ? "seven" : sum >= 8 ? "big" : "small";
      let lost = false;
      for (const [p, g] of res) {
        if (g === truth) { hostSay(b, pick(LINES.diceWin), ["grape", "seven", "grape"]); prize(b, PRIZE.dice, p.x, p.y - 40, `${p.name} 猜中了`); }
        else { lost = true; if (!g) hostSay(b, pick(LINES.diceNone)); }
      }
      if (lost && !over(b)) {
        hostSay(b, pick(truth === "seven" ? LINES.seven : LINES.diceLose), ["bomb", "bomb", "bomb"]);
        S.dice.stage = "boom"; S.dice.t = performance.now();
        // 骰子照點數爆炸：兩顆骰子的點數加起來＝爆幾下（一顆一顆接著炸，有幾下瞄準猜錯的人）
        const losers = [...res].filter(([, g]) => g !== truth).map(([p]) => p);
        b.say(`骰子照點數爆炸：${d[0]} ＋ ${d[1]} ＝ ${sum} 下！`);
        const blasts = [];
        for (let i = 0; i < sum; i++) {
          const aim = losers.length && i % 3 === 0 ? losers[(i / 3) % losers.length | 0] : null;
          const a = Math.random() * Math.PI * 2, r = 60 + Math.random() * 300;
          const x = aim ? aim.x + (Math.random() - 0.5) * 60 : CX + Math.cos(a) * r, y = aim ? aim.y + (Math.random() - 0.5) * 60 : Math.max(180, CY + 80 + Math.sin(a) * r * 0.8);
          blasts.push(b.telegraph(u, { shape: "circle", x, y, radius: 75, reaction: 0.9 + i * 0.18 }, { base: 12, label: "骰子爆炸", sound: "sounds/explosion.mp3", quiet: true }));
        }
        await Promise.all(blasts);
        if (!over(b)) { spawnChip(b, 5, CX - 140, CY + 40); spawnChip(b, 5, CX + 140, CY + 40); b.say("爆炸的骰子裡滾出了兩枚紅籌碼！"); }
      }
      await b.wait(0.6);
      S.dice = null;
    },

    // ---- 21 點：站到「要牌」或「停牌」 ----
    async blackjack(b, u) {
      const S = cs(b);
      b.emit({ type: "buff", unit: u, text: "21 點", color: "#e8c050" });
      hostSay(b, pick(LINES.bj), ["die", "seven", "die"]);
      const suits = ["♠", "♥", "♦", "♣"], ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
      const deck = []; for (const s of suits) for (const r of ranks) deck.push({ r, s });
      const draw = () => deck.splice(Math.floor(Math.random() * deck.length), 1)[0];
      const total = (cards) => { let t = 0, a = 0; for (const c of cards) { if (c.r === "A") { a++; t += 11; } else t += ["J", "Q", "K"].includes(c.r) ? 10 : +c.r; } while (t > 21 && a) { t -= 10; a--; } return t; };
      for (const p of players(b)) {
        if (over(b)) return;
        const cards = [draw(), draw()];
        S.cards = { p, cards };
        hands(b, { x: p.x - 60, y: p.y - 90 }, null);
        let t = total(cards);
        while (t < 21 && !over(b)) {
          S.cards.total = t;
          const zones = [{ id: "hit", label: "要牌", sub: `現在 ${t} 點`, x: 120, y: 330, w: 440, h: 330, col: "#e8262c" }, { id: "stand", label: "停牌", sub: `拿 ${fmt((t === 21 ? PRIZE.blackjack : t * PRIZE.perPoint) * mult(b))}`, x: 720, y: 330, w: 440, h: 330, col: "#2a9a4a" }];
          const res = await zoneChoice(b, { title: `21 點・${p.name}：要牌還是停牌？（爆牌＝身上爆炸）`, zones, secs: PREP.bj, def: "stand" });
          if (res.get(p) !== "hit") break;
          cards.push(draw()); t = total(cards); S.cards = { p, cards, total: t };
          b.say(`${p.name} 要牌：${cards[cards.length - 1].r}${cards[cards.length - 1].s}（${t} 點）`);
          await b.wait(0.4);
        }
        if (over(b)) return;
        if (t > 21) {
          hostSay(b, pick(LINES.bjBust), ["bomb", "skull", "bomb"]);
          b.say(`${p.name} 爆牌了（${t} 點）！`);
          boom(b, p.x, p.y, 70, 20, "爆牌");
          for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; b.spawnBullet(u, p.x + Math.cos(a) * 60, p.y + Math.sin(a) * 60, a, { speed: 420, r: 12, base: 12, text: pick(["A", "K", "Q", "J", "♠", "♥"]), color: "#f4f0e6", bounce: 2 }); }
          await b.waitProjectiles();
        } else {
          const amount = t === 21 ? PRIZE.blackjack : t * PRIZE.perPoint;
          hostSay(b, pick(t === 21 ? LINES.bj21 : LINES.bjStand), t === 21 ? ["seven", "seven", "seven"] : ["grape", "seven", "grape"]);
          prize(b, amount, p.x, p.y - 50, `${p.name} 停在 ${t} 點`);
        }
        await b.wait(0.6);
      }
      S.cards = null;
    },

    // ---- 柏青哥（第二階段：抓住快掉到底的彈珠放回去） ----
    async pachinko(b, u) {
      const S = cs(b), A = b.cfg.arena;
      b.emit({ type: "buff", unit: u, text: "柏青哥", color: "#e8c050" });
      hostSay(b, pick(LINES.pachinko), ["grape", "grape", "seven"]);
      const pegs = [];
      for (let row = 0; row < 6; row++) for (let col = 0; col < 10; col++) {
        const x = 110 + col * 118 + (row % 2) * 59, y = 210 + row * 76;
        if (x < A.w - 60) pegs.push({ x, y, r: 9 });
      }
      S.pegs = { list: pegs, t: performance.now() };
      await b.wait(0.8);
      hands(b, { x: 300, y: 130 }, { x: 980, y: 130 });
      const balls = (S.balls = []);
      for (let i = 0; i < 7; i++) balls.push({ x: 140 + Math.random() * (A.w - 280), y: 130 - i * 90, vx: (Math.random() - 0.5) * 80, vy: 0, r: 15, done: false });
      let t = 0, saidGrab = false;
      while (balls.some((q) => !q.done) && t < 14 && !over(b)) {
        const dt = 0.03; t += dt;
        for (const q of balls) {
          if (q.done) continue;
          if (q.y < 130) { q.y += 300 * dt; continue; }
          q.vy += 520 * dt; q.x += q.vx * dt; q.y += q.vy * dt;
          if (q.x < q.r) { q.x = q.r; q.vx = Math.abs(q.vx) * 0.7; } if (q.x > A.w - q.r) { q.x = A.w - q.r; q.vx = -Math.abs(q.vx) * 0.7; }
          for (const g of pegs) {
            const d = dist(q.x, q.y, g.x, g.y), m = q.r + g.r;
            if (d < m && d > 0) {
              const nx = (q.x - g.x) / d, ny = (q.y - g.y) / d, vn = q.vx * nx + q.vy * ny;
              q.x = g.x + nx * m; q.y = g.y + ny * m;
              if (vn < 0) { q.vx -= 1.6 * vn * nx; q.vy -= 1.6 * vn * ny; q.vx += (Math.random() - 0.5) * 60; q.vy *= 0.6; }
            }
          }
          for (const p of players(b)) if (dist(q.x, q.y, p.x, p.y) < q.r + p.r * 0.75) { q.done = true; boom(b, q.x, q.y, 55, 16, "彈珠"); break; }
          // 出千：抓住快到底的彈珠，放回上面
          if (!q.done && S.phase === 2 && !q.grabbed && q.y > A.h - 110) {
            q.grabbed = true;
            if (Math.random() < P2.grab) {
              hands(b, { x: q.x, y: q.y }, null);
              S.grabFx = { x: q.x, y: q.y, t: performance.now() };
              q.x = 160 + Math.random() * (A.w - 320); q.y = 130; q.vx = (Math.random() - 0.5) * 80; q.vy = 0;
              if (!saidGrab) { saidGrab = true; hostSay(b, pick(LINES.grab)); }
            }
          }
          if (!q.done && q.y > A.h - q.r) { q.done = true; prize(b, PRIZE.ball, q.x, A.h - 40, "彈珠滾到底了"); }
        }
        await b.wait(dt);
      }
      await b.wait(0.4);
      S.balls = []; S.pegs = null;
    },

    // ---- 猜位子：蓋住一個玩家，三個杯子快速交換；被蓋住的玩家點一個杯子 ----
    async shell(b, u) {
      const S = cs(b), p = pick(players(b)); if (!p) return;
      b.emit({ type: "buff", unit: u, text: "猜位子", color: "#e8c050" });
      hostSay(b, pick(LINES.shell), ["grape", "seven", "grape"]);
      b.cutscene = true;                                     // 被蓋住：不能動、不能出手
      const slots = [{ x: 400, y: 380 }, { x: 640, y: 380 }, { x: 880, y: 380 }];
      // 先蓋住玩家，再把他（連杯子）放到中間那一格
      const cups = [{ x: p.x, y: p.y - 300, hold: true }, { x: 160, y: -60 }, { x: 1120, y: -60 }];
      S.shell = { cups, p, stage: "cover", t: performance.now(), pick: null };
      p.state.casinoHidden = true;                           // 被蓋住的玩家看不見
      hands(b, { x: p.x, y: p.y - 80 }, null);
      for (let k = 0; k < 20; k++) { cups[0].y += (p.y - cups[0].y) * 0.25; await b.wait(0.025); }
      cups[0].y = p.y;
      await b.wait(0.3);
      const order = [1, 0, 2];                              // 杯子 i 一開始放在哪一格（被蓋住的在中間）
      for (let k = 0; k < 24; k++) {
        cups.forEach((c, i) => { const s = slots[order[i]]; c.x += (s.x - c.x) * 0.2; c.y += (s.y - c.y) * 0.2; });
        p.x = cups[0].x; p.y = cups[0].y; await b.wait(0.025);
      }
      cups.forEach((c, i) => { const s = slots[order[i]]; c.x = s.x; c.y = s.y; });
      restHands(b);
      // 快速交換（第二階段更快、更多次）
      S.shell.stage = "shuffle";
      const swaps = S.phase === 2 ? 12 : 8, dur = S.phase === 2 ? 0.26 : 0.34;
      for (let n = 0; n < swaps && !over(b); n++) {
        const a = Math.floor(Math.random() * 3), c2 = (a + 1 + Math.floor(Math.random() * 2)) % 3;
        const ia = order.indexOf(a), ib = order.indexOf(c2);
        const A0 = { ...slots[a] }, B0 = { ...slots[c2] }, t0 = performance.now();
        while (performance.now() - t0 < dur * 1000) {
          const k = (performance.now() - t0) / (dur * 1000), e = k * k * (3 - 2 * k), arc = Math.sin(k * Math.PI) * 70;
          cups[ia].x = A0.x + (B0.x - A0.x) * e; cups[ia].y = A0.y - arc;
          cups[ib].x = B0.x + (A0.x - B0.x) * e; cups[ib].y = B0.y + arc;
          p.x = cups[0].x; p.y = cups[0].y; await b.wait(0.02);
        }
        order[ia] = c2; order[ib] = a;
        cups[ia].x = B0.x; cups[ia].y = B0.y; cups[ib].x = A0.x; cups[ib].y = A0.y;
      }
      p.x = cups[0].x; p.y = cups[0].y;
      // 點一個杯子猜（有準備時間）
      S.shell.stage = "pick"; S.shell.end = performance.now() + PREP.shell * 1000; S.shell.slots = slots;
      await b.wait(PREP.shell);
      const guess = S.shell.pick, truth = order[0];
      S.shell.stage = "reveal"; S.shell.t = performance.now();
      b.cutscene = false; p.state.casinoHidden = false;
      await b.wait(0.6);
      if (guess === truth) {
        hostSay(b, pick(LINES.shellWin), ["grape", "seven", "grape"]);
        prize(b, PRIZE.shell, p.x, p.y - 50, `${p.name} 猜中自己在哪個杯子`);
      } else {
        hostSay(b, pick(LINES.shellLose), ["bomb", "skull", "bomb"]);
        b.say(guess == null ? `${p.name} 沒有選杯子` : `${p.name} 猜錯了（在第 ${truth + 1} 個杯子）`);
        // 所有杯子向上噴火柱，接著火球往下掉
        S.shell.stage = "fire"; S.shell.t = performance.now();
        await Promise.all(slots.map((s) => b.telegraph(u, { shape: "circle", x: s.x, y: s.y, radius: 80, reaction: 0.7 }, { base: 22, label: "火柱", sound: "sounds/explosion.mp3", quiet: true })));
        if (!over(b)) {
          const balls = [];
          for (let i = 0; i < 9; i++) { const q = pick(players(b)) || p; const x = i < 3 ? q.x + (Math.random() - 0.5) * 160 : 120 + Math.random() * 1040, y = i < 3 ? q.y + (Math.random() - 0.5) * 120 : 220 + Math.random() * 440; balls.push(b.telegraph(u, { shape: "circle", x, y, radius: 75, reaction: 1.0 + i * 0.12 }, { base: 16, label: "火球", sound: "sounds/explosion.mp3", quiet: true })); }
          await Promise.all(balls);
        }
      }
      await b.wait(0.5);
      S.shell = null;
    },

    // ---- 死亡輪盤（大招）：傳送到中間，走到一格「下注」；第二階段結束後還會拿槍射人 ----
    async roulette(b, u) {
      const S = cs(b), CX = 640, CY = 400, RAD = 330, HUB = 60;
      b.emit({ type: "bossUlt", unit: u, text: "死亡輪盤" });
      hostSay(b, pick(LINES.roulette), ["skull", "skull", "skull"]);
      S.wheel = { x: CX, y: CY, r: RAD, t: performance.now(), dur: 0, a0: -Math.PI / 2, a1: -Math.PI / 2, slot: -1, fired: false, prep: true, end: performance.now() + PREP.roulette * 1000 };
      // 所有玩家被傳送到輪盤中間
      players(b).forEach((p, i) => { p.x = CX + (i - (players(b).length - 1) / 2) * 40; p.y = CY; b.emit({ type: "move", unit: p }); });
      b.say("所有人被傳送到輪盤中間！走到一格站好——那就是你的賭注");
      b.freeAP = true; b.moveOnly = true; b.emit({});
      await b.wait(PREP.roulette);
      b.freeAP = false; b.moveOnly = false;
      b.emit({ type: "bossUltEnd" });
      if (over(b)) return;
      const slotOf = (p) => { const d = dist(p.x, p.y, CX, CY); if (d <= HUB || d > RAD) return Math.floor(Math.random() * 12); return Math.floor((((Math.atan2(p.y - CY, p.x - CX) + Math.PI / 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 6)); };
      const bets = new Map(players(b).map((p) => [p, slotOf(p)]));
      // 站在正中間（或跑出輪盤）的人：被隨便塞進一格
      for (const [p, s] of bets) { const d = dist(p.x, p.y, CX, CY); if (d <= HUB || d > RAD) { const a = -Math.PI / 2 + ((s + 0.5) / 12) * Math.PI * 2; p.x = CX + Math.cos(a) * 200; p.y = CY + Math.sin(a) * 200; b.emit({ type: "move", unit: p }); b.say(`${p.name} 沒選好，被推進了第 ${s + 1} 格`); } }
      for (const [p, s] of bets) b.say(`${p.name} 站在第 ${s + 1} 格`);
      b.cutscene = true;                                     // 轉槍到開槍：不能再移動
      const slot = Math.floor(Math.random() * 12), turns = 3 + Math.floor(Math.random() * 2), spinT = 2.6;
      Object.assign(S.wheel, { prep: false, t: performance.now(), dur: spinT, a1: -Math.PI / 2 + ((slot + 0.5) / 12) * Math.PI * 2 + Math.PI * 2 * turns, slot });
      hands(b, { x: CX - 40, y: CY - 30 }, null);
      await b.wait(spinT + 0.2);
      restHands(b);
      const ang = -Math.PI / 2 + ((slot + 0.5) / 12) * Math.PI * 2;
      b.say(`輪盤停在第 ${slot + 1} 格！`);
      // 被射的那一格：直接開槍（大家站的位置就是賭注，不能再躲）
      const shot = { shape: "sector", x: CX, y: CY, ang, half: Math.PI / 12, radius: RAD, reaction: 0.6 };
      await b.telegraph(u, shot, { base: 38, label: "死亡輪盤", sound: "sounds/pirate-gun.mp3", quiet: true });
      S.wheel.fired = performance.now();
      b.cutscene = false;
      for (const [p, s] of bets) {
        if (s === slot) hostSay(b, "砰。……運氣這種東西，借了總是要還的。", ["skull", "die", "skull"]);
        else if (p.alive) prize(b, PRIZE.roulette, p.x, p.y - 50, `${p.name} 在輪盤下活了下來`);
      }
      if ([...bets.values()].every((s) => s !== slot)) hostSay(b, pick(LINES.rouletteLive), ["seven", "seven", "seven"]);
      await b.wait(0.8);
      S.wheel = null;
      // 第二階段：輪盤結束後，拿槍射玩家
      if (S.phase === 2 && !over(b)) {
        hostSay(b, pick(LINES.shoot), ["skull", "skull", "skull"]);
        S.gun = { t: performance.now() };
        for (const p of players(b)) {
          if (over(b)) break;
          const ang2 = Math.atan2(p.y - 140, p.x - 640);
          S.gun.ang = ang2;
          await b.telegraph(u, { shape: "rect", x: 640, y: 140, ang: ang2, length: 1200, width: 40, reaction: 0.8 }, { base: 26, label: "莊家的左輪", sound: "sounds/pirate-gun.mp3" });
        }
        S.gun = null;
      }
    },
  };

  // ===== 畫：地板（賭桌）＝ R.Terrains.casino；上層（斯賓沃迪、手、彈珠、對話框）＝ drawRoom =====
  const T = (R.Terrains = R.Terrains || {});
  T.casino = {
    bg(g, W, H) {
      const gr = g.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, W * 0.7);
      gr.addColorStop(0, "#1f7a4a"); gr.addColorStop(1, "#0e4a2a");
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 2600; i++) { g.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,.025)" : "rgba(0,0,0,.04)"; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
      g.strokeStyle = "#c8a040"; g.lineWidth = 6; g.strokeRect(14, 14, W - 28, H - 28);
      g.strokeStyle = "rgba(232,192,80,.45)"; g.lineWidth = 2; g.strokeRect(26, 26, W - 52, H - 52);
      g.strokeStyle = "rgba(232,192,80,.35)"; g.lineWidth = 3; g.beginPath(); g.arc(W / 2, 50, 320, 0.12 * Math.PI, 0.88 * Math.PI); g.stroke();   // 莊家前面的弧線
      g.fillStyle = "rgba(232,192,80,.22)"; g.font = "900 34px 'Noto Sans TC', sans-serif"; g.textAlign = "center"; g.fillText("致 命 賭 局", W / 2, H - 50);
      for (const [x, y, t] of [[200, 640, "21"], [1080, 640, "大／小"], [200, 200, "♠"], [1080, 200, "♥"]]) { g.strokeStyle = "rgba(255,255,255,.18)"; g.lineWidth = 2; g.strokeRect(x - 40, y - 56, 80, 112); g.fillStyle = "rgba(255,255,255,.18)"; g.font = "900 26px sans-serif"; g.fillText(t, x, y + 9); }
    },
    draw(ctx, now) {
      const b = R._B; if (!b?.cs) return;
      const S = b.cs;
      // 死亡輪盤（地上）
      if (S.wheel) drawWheel(ctx, now, S.wheel);
      // 站位選擇的範圍
      if (S.zone) {
        const left = Math.max(0, (S.zone.end - now) / 1000), blink = left < 1.5 ? 0.5 + 0.5 * Math.sin(now / 80) : 1;
        for (const z of S.zone.list) {
          const on = players(b).some((p) => inZone(z, p));
          ctx.save(); ctx.globalAlpha = on ? 0.45 : 0.25 * blink; ctx.fillStyle = z.col;
          if (z.r != null) { ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.fill(); } else ctx.fillRect(z.x, z.y, z.w, z.h);
          ctx.globalAlpha = 1; ctx.strokeStyle = z.col; ctx.lineWidth = on ? 6 : 3; ctx.setLineDash(on ? [] : [12, 8]);
          if (z.r != null) { ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.stroke(); } else ctx.strokeRect(z.x, z.y, z.w, z.h);
          ctx.setLineDash([]);
          const cx = z.r != null ? z.x : z.x + z.w / 2, cy = z.r != null ? z.y : z.y + z.h / 2;
          ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = 5; ctx.strokeStyle = "rgba(0,0,0,.6)";
          ctx.font = "900 40px 'Noto Sans TC', sans-serif"; ctx.strokeText(z.label, cx, cy - 12); ctx.fillStyle = "#fff8e0"; ctx.fillText(z.label, cx, cy - 12);
          if (z.sub) { ctx.font = "700 16px 'Noto Sans TC', sans-serif"; ctx.strokeText(z.sub, cx, cy + 24); ctx.fillText(z.sub, cx, cy + 24); }
          ctx.font = "900 26px Impact, sans-serif"; ctx.fillStyle = left < 2 ? "#ff5a4a" : "#ffe080"; ctx.strokeText(left.toFixed(1), cx, cy + 56); ctx.fillText(left.toFixed(1), cx, cy + 56);     // 倒數（上方的提示淡出後還看得到）
          ctx.restore();
        }
      }
      // 柏青哥的釘子
      if (S.pegs) { const k = Math.min(1, (now - S.pegs.t) / 400); for (const g of S.pegs.list) { ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(g.x + 3, g.y + 4, g.r, g.r * 0.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#c8ccd4"; ctx.beginPath(); ctx.arc(g.x, g.y - 6 * k, g.r * k, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(g.x - 3, g.y - 9 * k, 3 * k, 0, Math.PI * 2); ctx.fill(); } }
      // 爆炸的痕跡
      S.booms = S.booms.filter((q) => now - q.t < 700);
      for (const q of S.booms) { const k = (now - q.t) / 700; ctx.fillStyle = `rgba(255,140,40,${0.5 * (1 - k)})`; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (0.6 + k * 0.6), 0, Math.PI * 2); ctx.fill(); }
    },
  };

  function drawWheel(ctx, now, w) {
    ctx.save(); ctx.translate(w.x, w.y);
    ctx.globalAlpha = 0.82;
    for (let i = 0; i < 12; i++) {
      const a0 = -Math.PI / 2 + (i / 12) * Math.PI * 2, a1 = a0 + Math.PI / 6;
      ctx.fillStyle = i % 2 ? "#1d1d22" : "#b81e28"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, w.r, a0, a1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#e8c050"; ctx.lineWidth = 2; ctx.stroke();
      const am = (a0 + a1) / 2; ctx.fillStyle = "#f4e8c8"; ctx.font = "900 26px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(i + 1), Math.cos(am) * (w.r - 34), Math.sin(am) * (w.r - 34));
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#e8c050"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, w.r, 0, Math.PI * 2); ctx.stroke();
    // 中間的左輪手槍：轉一圈慢下來，停在要射的那一格
    const k = Math.min(1, (now - w.t) / (w.dur * 1000)), e = 1 - Math.pow(1 - k, 3);
    const ang = w.a0 + (w.a1 - w.a0) * e;
    ctx.fillStyle = "#2a2a30"; ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#e8c050"; ctx.lineWidth = 3; ctx.stroke();
    ctx.rotate(ang);
    ctx.fillStyle = "#6a6e78"; ctx.fillRect(0, -9, 110, 18);                      // 槍管
    ctx.fillStyle = "#4a4e58"; ctx.beginPath(); ctx.arc(10, 0, 24, 0, Math.PI * 2); ctx.fill();   // 彈巢
    ctx.fillStyle = "#1d1d22"; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.beginPath(); ctx.arc(10 + Math.cos(a) * 13, Math.sin(a) * 13, 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#6a3a1a"; ctx.beginPath(); ctx.moveTo(-14, -6); ctx.lineTo(-60, 14); ctx.lineTo(-50, 30); ctx.lineTo(-6, 14); ctx.closePath(); ctx.fill();   // 握把
    if (w.fired && now - w.fired < 300) { ctx.fillStyle = "#ffe080"; ctx.beginPath(); ctx.arc(120, 0, 22, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  // 表情（拉霸機的三格）
  function sym(ctx, s, x, y, h) {
    ctx.save(); ctx.translate(x, y);
    if (s === "seven") { ctx.fillStyle = "#d8202a"; ctx.font = `900 ${h * 0.9}px Impact, 'Arial Black', sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("7", 0, 2); }
    else if (s === "die") { ctx.fillStyle = "#c81e28"; ctx.fillRect(-h * 0.42, -h * 0.2, h * 0.84, h * 0.4); ctx.fillStyle = "#fff"; ctx.font = `900 ${h * 0.28}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("DIE", 0, 1); }
    else if (s === "skull") {
      ctx.fillStyle = "#f4ead8"; ctx.beginPath(); ctx.arc(0, -h * 0.08, h * 0.32, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-h * 0.18, h * 0.12, h * 0.36, h * 0.18);
      ctx.fillStyle = "#1d1d1f"; ctx.beginPath(); ctx.arc(-h * 0.12, -h * 0.08, h * 0.08, 0, Math.PI * 2); ctx.arc(h * 0.12, -h * 0.08, h * 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(-h * 0.02, h * 0.04, h * 0.04, h * 0.06); for (const dx of [-0.1, 0, 0.1]) ctx.fillRect(dx * h - 1, h * 0.16, 2, h * 0.12);
    } else if (s === "bomb") {
      ctx.fillStyle = "#1d1d22"; ctx.beginPath(); ctx.arc(0, h * 0.06, h * 0.28, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#8a6a3a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(h * 0.14, -h * 0.16); ctx.quadraticCurveTo(h * 0.3, -h * 0.34, h * 0.2, -h * 0.4); ctx.stroke();
      ctx.fillStyle = "#ffb020"; ctx.beginPath(); ctx.arc(h * 0.2, -h * 0.42, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.arc(-h * 0.1, -h * 0.04, h * 0.07, 0, Math.PI * 2); ctx.fill();
    } else if (s === "grape") {
      ctx.fillStyle = "#7a3ab8"; for (const [dx, dy] of [[-0.14, -0.1], [0.0, -0.12], [0.14, -0.1], [-0.07, 0.04], [0.07, 0.04], [0, 0.18]]) { ctx.beginPath(); ctx.arc(dx * h, dy * h, h * 0.1, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#3a8a3a"; ctx.beginPath(); ctx.ellipse(h * 0.08, -h * 0.28, h * 0.1, h * 0.05, -0.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  const SYMS = ["grape", "bomb", "die", "seven", "skull"];

  // 白手套（四根手指：拇指＋三根）
  function glove(ctx, x, y, flip, now) {
    ctx.save(); ctx.translate(x, y + Math.sin(now / 400 + flip) * 4); ctx.scale(flip ? -1 : 1, 1);
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(6, 44, 24, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fbfbf6"; ctx.strokeStyle = "#8a8a90"; ctx.lineWidth = 2;
    for (const [dx, h] of [[-9, 26], [1, 30], [11, 26]]) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(dx - 4.5, -h, 9, h + 6, 4.5) : ctx.rect(dx - 4.5, -h, 9, h + 6); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-16, -4, 34, 26, 9) : ctx.rect(-16, -4, 34, 26); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.translate(-14, 6); ctx.rotate(-0.8); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-4.5, -20, 9, 22, 4.5) : ctx.rect(-4.5, -20, 9, 22); ctx.fill(); ctx.stroke(); ctx.restore();   // 拇指
    ctx.strokeStyle = "#c8c8cc"; ctx.lineWidth = 1.5; for (const dx of [-6, 1, 8]) { ctx.beginPath(); ctx.moveTo(dx, 4); ctx.lineTo(dx, 14); ctx.stroke(); }
    ctx.fillStyle = "#e8e4dc"; ctx.fillRect(-14, 20, 30, 7);                       // 袖口
    ctx.restore();
  }

  // 斯賓沃迪（畫在賭桌後面）
  function drawHost(ctx, now, b, u) {
    const S = cs(b), x = 640, y = 84, sc = 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    // 暗紅色的西裝（V 字）＋白襯衫
    ctx.fillStyle = "#5a0e14"; ctx.beginPath(); ctx.moveTo(-110, 40); ctx.lineTo(110, 40); ctx.lineTo(130, 150); ctx.lineTo(-130, 150); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#8a1a22"; ctx.beginPath(); ctx.moveTo(-100, 40); ctx.lineTo(-20, 150); ctx.lineTo(-80, 150); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(100, 40); ctx.lineTo(20, 150); ctx.lineTo(80, 150); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#eef4f8"; ctx.beginPath(); ctx.moveTo(-60, 40); ctx.lineTo(60, 40); ctx.lineTo(0, 140); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#7a828a"; ctx.fillRect(-30, 70, 6, 26); ctx.fillRect(24, 70, 6, 26);
    ctx.fillStyle = "#e82a2a"; ctx.beginPath(); ctx.moveTo(0, 50); ctx.lineTo(-26, 38); ctx.lineTo(-26, 64); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(0, 50); ctx.lineTo(26, 38); ctx.lineTo(26, 64); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.arc(0, 50, 7, 0, Math.PI * 2); ctx.fill();   // 領結
    // 拉霸機的頭
    ctx.fillStyle = "#1a1a1e"; ctx.fillRect(-82, -60, 164, 96);
    ctx.save(); ctx.beginPath(); ctx.rect(-82, -60, 164, 30); ctx.clip(); ctx.strokeStyle = "#a8883a"; ctx.lineWidth = 2;   // 金色菱格
    for (let i = -10; i < 12; i++) { ctx.beginPath(); ctx.moveTo(-82 + i * 18, -60); ctx.lineTo(-82 + i * 18 + 30, -30); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-82 + i * 18 + 30, -60); ctx.lineTo(-82 + i * 18, -30); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = "#e8c050"; ctx.beginPath(); ctx.arc(-66, -42, 4, 0, Math.PI * 2); ctx.arc(66, -42, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#e8c050"; ctx.lineWidth = 4; ctx.strokeRect(-82, -60, 164, 96);
    ctx.fillStyle = S.phase === 2 ? `rgb(${200 + 55 * Math.sin(now / 200)},60,40)` : "#e8c050"; ctx.fillRect(-76, -28, 152, 58);                // 視窗的金框（第二階段：發紅光）
    const spin = S.spin;
    for (let i = 0; i < 3; i++) {
      const cx = -50 + i * 50;
      ctx.fillStyle = "#e8f0f6"; ctx.fillRect(cx - 22, -24, 44, 50);
      ctx.save(); ctx.beginPath(); ctx.rect(cx - 22, -24, 44, 50); ctx.clip();
      if (spin && (now - spin.t) / 1000 < spin.stop[i]) {
        const off = ((now - spin.t) / 40) % SYMS.length;
        for (let k = -1; k <= 1; k++) sym(ctx, SYMS[(Math.floor(off) + k + SYMS.length * 4) % SYMS.length], cx, 1 + (k - (off % 1)) * 40, 38);
      } else sym(ctx, spin ? spin.res[i] : S.face[i], cx, 1, 40);
      ctx.restore();
    }
    // 拉桿
    const pull = S.lever && now - S.lever < 600 ? Math.sin(((now - S.lever) / 600) * Math.PI) : 0;
    ctx.fillStyle = "#c8a040"; ctx.fillRect(84, -10, 10, 22);
    ctx.save(); ctx.translate(92, 0); ctx.rotate(0.15 + pull * 1.2); ctx.fillStyle = "#e8c050"; ctx.fillRect(-3, -66, 6, 66); ctx.fillStyle = "#e82a2a"; ctx.beginPath(); ctx.arc(0, -70, 9, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.restore();
    ctx.fillStyle = "#f4e8c8"; ctx.font = "900 13px 'Noto Sans TC', sans-serif"; ctx.textAlign = "center"; ctx.fillText("大莊家斯賓沃迪（不參戰・打不到）", x, y + 168);
  }

  function drawOver(ctx, now, b, H) {
    const S = cs(b), u = host(b);
    if (u) { u.x = 640; u.y = 84; }                       // 他站在賭桌後面，不會被推走
    drawHost(ctx, now, b, u);
    // 骰子＋杯子
    const D = S.dice;
    if (D) {
      const k = (now - D.t) / 1000;
      const showDice = D.stage === "roll" || D.stage === "open" || D.stage === "boom";
      if (showDice) for (let i = 0; i < 2; i++) {
        const tumble = D.stage === "roll" ? Math.max(0, 1 - k / 0.8) : 0;
        const dx = D.x - 30 + i * 60 + Math.sin(now / 40 + i) * 20 * tumble, dy = D.y + Math.cos(now / 50 + i) * 14 * tumble;
        ctx.save(); ctx.translate(dx, dy); ctx.rotate(tumble * (now / 80 + i));
        ctx.fillStyle = "#fffdf8"; ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 2; ctx.fillRect(-18, -18, 36, 36); ctx.strokeRect(-18, -18, 36, 36);
        const v = tumble > 0 ? 1 + (Math.floor(now / 70 + i) % 6) : D.vals[i];
        const P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[v];
        ctx.fillStyle = v === 1 ? "#d8202a" : "#1d1d1f"; for (const [px, py] of P) { ctx.beginPath(); ctx.arc(px * 9, py * 9, 3.6, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
      if (D.stage === "cover" || D.stage === "shake" || D.stage === "wait" || (D.stage === "open" && k < 0.5)) {
        const lift = D.stage === "open" ? k * 240 : D.stage === "cover" ? Math.max(0, 1 - k / 0.4) * 80 : 0;
        const sh = D.stage === "shake" ? Math.sin(now / 35) * 18 : 0;
        ctx.save(); ctx.translate(D.x + sh, D.y - lift);
        ctx.fillStyle = "#a81e28"; ctx.beginPath(); ctx.moveTo(-60, 30); ctx.lineTo(-44, -54); ctx.lineTo(44, -54); ctx.lineTo(60, 30); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#e8c050"; ctx.lineWidth = 4; ctx.stroke(); ctx.fillStyle = "#e8c050"; ctx.fillRect(-46, -60, 92, 10);
        ctx.restore();
        if (D.stage === "wait") { ctx.fillStyle = "#f4e8c8"; ctx.font = "900 16px 'Noto Sans TC', sans-serif"; ctx.textAlign = "center"; ctx.fillText("大？還是小？", D.x, D.y + 60); }
      }
      if (D.stage === "open" || D.stage === "boom") { const s = D.vals[0] + D.vals[1]; ctx.fillStyle = "#ffe080"; ctx.font = "900 22px 'Noto Sans TC', sans-serif"; ctx.textAlign = "center"; ctx.fillText(`${s}${s === 7 ? "・莊家通殺" : s >= 8 ? "・大" : "・小"}`, D.x, D.y + 56); }
    }
    // 21 點：牌攤在玩家頭上
    if (S.cards?.p) {
      const p = H.pos(S.cards.p), n = S.cards.cards.length;
      S.cards.cards.forEach((c, i) => {
        const cx = p.x + (i - (n - 1) / 2) * 30, cy = p.y - 80;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate((i - (n - 1) / 2) * 0.08);
        ctx.fillStyle = "#fffdf8"; ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 2; ctx.fillRect(-15, -21, 30, 42); ctx.strokeRect(-15, -21, 30, 42);
        ctx.fillStyle = c.s === "♥" || c.s === "♦" ? "#c62828" : "#1d1d1f"; ctx.font = "900 13px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(c.r, 0, -6); ctx.fillText(c.s, 0, 9);
        ctx.restore();
      });
    }
    // 柏青哥的彈珠
    for (const q of S.balls || []) {
      if (q.done || q.y < -20) continue;
      const g = ctx.createRadialGradient(q.x - 5, q.y - 5, 2, q.x, q.y, q.r); g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#8a909a");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(232,38,44,.5)"; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(q.x, q.y, q.r + 6, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    // 準備時間的倒數（站位選擇、死亡輪盤、猜位子）
    const cd = S.zone ? { title: S.zone.title, end: S.zone.end, secs: S.zone.secs } : S.wheel?.prep ? { title: "走到一格站好——那就是你的賭注（站在正中間會被隨便塞進一格）", end: S.wheel.end, secs: PREP.roulette, at: { x: S.wheel.x, y: S.wheel.y } } : S.shell?.stage === "pick" ? { title: `${S.shell.p.name}：你在哪一個杯子裡？點一個杯子`, end: S.shell.end, secs: PREP.shell, at: { x: 640, y: 470 } } : null;
    if (cd) {
      const left = Math.max(0, (cd.end - now) / 1000), shown = (cd.secs || 10) - left;
      // 小倒數：一直顯示（輪盤中間、杯子下面）
      if (cd.at) { ctx.save(); ctx.font = "900 34px Impact, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = 5; ctx.strokeStyle = "rgba(0,0,0,.7)"; ctx.strokeText(left.toFixed(1), cd.at.x, cd.at.y); ctx.fillStyle = left < 2 ? "#ff5a4a" : "#ffe080"; ctx.fillText(left.toFixed(1), cd.at.x, cd.at.y); ctx.restore(); }
    }
    // 上方的黑底提示：出現 2.5 秒後慢慢淡出（不要一直擋住斯賓沃迪的臉）
    const fade = cd ? 1 - Math.min(1, Math.max(0, ((cd.secs || 10) - Math.max(0, (cd.end - now) / 1000) - 2.5) / 1.5)) : 0;
    if (cd && fade > 0) {
      const left = Math.max(0, (cd.end - now) / 1000);
      ctx.save(); ctx.globalAlpha = fade; ctx.fillStyle = "rgba(20,6,8,.82)"; ctx.fillRect(240, 236, 800, 52); ctx.strokeStyle = "#e8c050"; ctx.lineWidth = 2; ctx.strokeRect(240, 236, 800, 52);
      ctx.fillStyle = "#f4e8d0"; ctx.font = "700 17px 'Noto Sans TC', sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(cd.title, 256, 262);
      ctx.fillStyle = left < 1.5 ? "#ff5a4a" : "#ffe080"; ctx.font = "900 30px Impact, sans-serif"; ctx.textAlign = "right"; ctx.fillText(left.toFixed(1), 1028, 263);
      ctx.restore();
    }
    // 猜位子的杯子
    const SH = S.shell;
    if (SH) {
      const lift = SH.stage === "reveal" || SH.stage === "fire" ? Math.min(1, (now - SH.t) / 400) * 110 : 0;
      SH.cups.forEach((c, i) => {
        const slotI = SH.slots ? SH.slots.findIndex((s) => Math.abs(s.x - c.x) < 2 && Math.abs(s.y - c.y) < 2) : -1;
        const picked = SH.stage !== "cover" && SH.stage !== "shuffle" && SH.pick != null && slotI === SH.pick;
        ctx.save(); ctx.translate(c.x, c.y - lift);
        ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(4, 34 + lift, 52, 14, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#a81e28"; ctx.beginPath(); ctx.moveTo(-54, 34); ctx.lineTo(-38, -56); ctx.lineTo(38, -56); ctx.lineTo(54, 34); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = picked ? "#ffe080" : "#e8c050"; ctx.lineWidth = picked ? 7 : 4; ctx.stroke(); ctx.fillStyle = "#e8c050"; ctx.fillRect(-40, -62, 80, 10);
        if (SH.stage === "pick" && slotI >= 0) { ctx.fillStyle = "#fff8e0"; ctx.font = "900 26px Impact, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(slotI + 1), 0, -10); }
        if (SH.stage === "fire") { const k = (now - SH.t) / 700; if (k < 1.2) { const g = ctx.createLinearGradient(0, -60, 0, -360); g.addColorStop(0, "rgba(255,200,60,.9)"); g.addColorStop(1, "rgba(255,60,20,0)"); ctx.fillStyle = g; ctx.fillRect(-26, -360 * Math.min(1, k * 2), 52, 360 * Math.min(1, k * 2)); } }
        ctx.restore();
      });
    }
    // 回旋撲克牌
    for (const c of S.flying || []) { if (c.done) continue; ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(now / 60); ctx.fillStyle = "#fffdf8"; ctx.strokeStyle = "#c62828"; ctx.lineWidth = 2; ctx.fillRect(-11, -16, 22, 32); ctx.strokeRect(-11, -16, 22, 32); ctx.fillStyle = "#c62828"; ctx.font = "900 13px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("♥", 0, 1); ctx.restore(); }
    // 第二階段：拿槍射人
    if (S.gun?.ang != null) { ctx.save(); ctx.translate(640, 140); ctx.rotate(S.gun.ang); ctx.fillStyle = "#6a6e78"; ctx.fillRect(0, -7, 80, 14); ctx.fillStyle = "#4a4e58"; ctx.beginPath(); ctx.arc(8, 0, 16, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    // 抓彈珠、敲頭的特效
    if (S.grabFx && now - S.grabFx.t < 500) { const k = (now - S.grabFx.t) / 500; ctx.strokeStyle = `rgba(255,224,128,${1 - k})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(S.grabFx.x, S.grabFx.y, 20 + k * 40, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = `rgba(255,224,128,${1 - k})`; ctx.font = "900 18px 'Noto Sans TC', sans-serif"; ctx.textAlign = "center"; ctx.fillText("抓住了！", S.grabFx.x, S.grabFx.y - 40); }
    if (S.knock && now - S.knock < 700) { const k = (now - S.knock) / 700; ctx.fillStyle = `rgba(255,248,224,${1 - k})`; ctx.font = "900 34px 'Noto Sans TC', sans-serif"; ctx.textAlign = "center"; ctx.fillText("咚！", 560, 20 - k * 20); }
    // 兩隻漂浮的手
    for (let i = 0; i < 2; i++) { const h = S.hands[i]; h.x += (h.tx - h.x) * 0.12; h.y += (h.ty - h.y) * 0.12; glove(ctx, h.x, h.y, i === 0 ? 0 : 1, now); }
    // 對話框（在他旁邊）
    const sy = S.say;
    if (sy) {
      const age = (now - sy.t) / 1000, dur = 2.5 + sy.text.length * 0.1;
      if (age < dur) {
        const n = Math.min(sy.text.length, Math.floor(age * 30));
        const text = sy.text.slice(0, n), a = Math.min(1, (dur - age) * 3);
        ctx.save(); ctx.globalAlpha = a; ctx.font = "700 15px 'Noto Sans TC', sans-serif";
        const lines = []; let cur = ""; for (const ch of text) { if (ctx.measureText(cur + ch).width > 330) { lines.push(cur); cur = ""; } cur += ch; } lines.push(cur);
        const bx = 790, by = 50, bw = 360, bh = 26 + Math.max(1, Math.ceil(sy.text.length / 21)) * 21;
        ctx.fillStyle = "rgba(30,10,12,.92)"; ctx.strokeStyle = "#e8c050"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, 10) : ctx.rect(bx, by, bw, bh); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx, by + 30); ctx.lineTo(bx - 18, by + 40); ctx.lineTo(bx, by + 44); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#f4e8d0"; ctx.textAlign = "left"; ctx.textBaseline = "top";
        lines.forEach((l, i) => ctx.fillText(l, bx + 14, by + 12 + i * 21));
        ctx.restore();
      }
    }
  }

  // ===== 籌碼小怪的樣子 =====
  const A = (R.EnemyArt = R.EnemyArt || {});
  for (const [pts, c] of Object.entries(CHIPS)) {
    A[c.kind] = (ctx, u, p, now) => {
      const r = u.r, spin = now / 300 + u.x * 0.01;
      ctx.save(); ctx.globalAlpha = u.alive ? 1 : 0.3;
      ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(p.x + 3, p.y + r * 0.8, r, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c.col; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = c.edge; ctx.lineWidth = r * 0.22;
      for (let i = 0; i < 8; i++) { const a = spin + (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.88, a, a + 0.28); ctx.stroke(); }
      ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.62, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = c.col === "#f4f0e6" ? "#1d1d1f" : c.edge === "#e8c050" ? "#e8c050" : "#fffdf8";
      ctx.font = `900 ${r * (pts.length > 2 ? 0.55 : 0.7)}px Impact, 'Arial Black', sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(pts, p.x, p.y + r * 0.12);
      ctx.fillStyle = c.col === "#1d1d22" ? "#e8262c" : "#1d1d1f";                 // 小小的兇眼睛
      ctx.beginPath(); ctx.ellipse(p.x - r * 0.25, p.y - r * 0.32, r * 0.1, r * 0.06, 0.4, 0, Math.PI * 2); ctx.ellipse(p.x + r * 0.25, p.y - r * 0.32, r * 0.1, r * 0.06, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };
    A[c.kind].top = 14;
  }

  // 猜位子：點一個杯子（在戰鬥畫面上直接點，不是選項視窗）
  document.addEventListener("pointerdown", (e) => {
    const b = R._B, SH = b?.cs?.shell;
    if (!SH || SH.stage !== "pick") return;
    const cv = document.getElementById("arena"); if (!cv || e.target !== cv) return;
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * (cv.width / r.width), y = (e.clientY - r.top) * (cv.height / r.height);
    const i = SH.slots.findIndex((s) => dist(x, y, s.x, s.y - 10) < 75);
    e.stopPropagation(); e.preventDefault();
    if (i >= 0) { SH.pick = i; b.say(`${SH.p.name} 選了第 ${i + 1} 個杯子`); }
  }, true);
  for (const ev of ["mousedown", "click"]) document.addEventListener(ev, (e) => { if (R._B?.cs?.shell?.stage === "pick" && e.target === document.getElementById("arena")) { e.stopPropagation(); e.preventDefault(); } }, true);

  R.Casino = { CHIPS, PRIZE, WAGERS, GOAL, GOAL2, GAMES, cs, LINES, runRaise, zoneChoice, darts, boomerangs, PREP, P2 };
})();
