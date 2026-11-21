/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/uno.js": "20261122024623" });
// 酒館桌上的牌：UNO（單機＝和電腦玩；連線＝懸掛電話的房間一起玩，房主說了算）
//   R.Uno.open(env)：env = { me: { id, name }, net（R.Net，連線時）, members（連線時的房間成員）, chat(text)（送聊天）, onClose() }
//   房規（開局前房主決定）：
//     stack      ＝+2／+4（／+8）可以疊加（疊的牌要 ≥ 上一張的罰抽數；疊不上就把累積的全部抽走）
//     sameNum    ＝同數字可以連出（出了一張數字牌後，手上同數字的牌可以接著出，按「結束出牌」才換人）
//     noLastAction＝禁止用功能牌（跳過、迴轉、+2、變色、+4、+8）當最後一張
//     unoBy      ＝喊 UNO 的方式："button"（按鍵）／"chat"（在聊天欄打 UNO）
//     plus8      ＝加入特殊的 +8 牌（兩張，黑色、可以變色）
//   喊 UNO：剩兩張、輪到你的時候可以先喊，或剛剩一張時馬上喊；下一個人動作之前還沒喊＝罰抽 2 張
//   連線：房主跑整局（電腦也是房主算），每次變動把「每個人看得到的樣子」各自發過去（手牌只發給本人）
//     其他人送動作（"unoA"）；房主發畫面（"unoV"）；有人掉線＝他的位子暫時被跳過（牌還在）；房主掉線＝牌局暫停
(function () {
  const R = (window.RPG = window.RPG || {});
  const COLORS = ["r", "y", "g", "b"];
  const CNAME = { r: "紅", y: "黃", g: "綠", b: "藍", w: "黑" };
  const CCOL = { r: "#e84a4a", y: "#f2c200", g: "#3ab86a", b: "#2a8ad8", w: "#1d1d1f" };
  const DRAW = { "+2": 2, "+4": 4, "+8": 8 };
  const isDigit = (c) => /^[0-9]$/.test(c.v);
  const isAction = (c) => !isDigit(c);
  const label = (c) => ({ skip: "⊘", rev: "⇄", wild: "W" }[c.v] || c.v);
  const cardName = (c) => `${c.c === "w" ? "" : CNAME[c.c]}${{ skip: "跳過", rev: "迴轉", wild: "變色", "+2": "+2", "+4": "+4", "+8": "+8" }[c.v] || c.v}`;
  const DEFAULT_RULES = { stack: true, sameNum: true, noLastAction: false, unoBy: "button", plus8: false };

  // ===== 規則（房主／單機才會跑） =====
  function newDeck(rules) {
    const d = []; let n = 0;
    const add = (c, v) => d.push({ id: ++n, c, v });
    for (const c of COLORS) { add(c, "0"); for (let k = 0; k < 2; k++) { for (let i = 1; i <= 9; i++) add(c, String(i)); add(c, "skip"); add(c, "rev"); add(c, "+2"); } }
    for (let k = 0; k < 4; k++) { add("w", "wild"); add("w", "+4"); }
    if (rules.plus8) for (let k = 0; k < 2; k++) add("w", "+8");
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
    return d;
  }
  function Game(seats, rules) {
    const g = { seats, rules, deck: newDeck(rules), discard: [], turn: 0, dir: 1, color: null, pending: 0, chain: null, drawn: null, winner: null, log: [], v: 0 };
    for (const s of seats) { s.hand = []; s.uno = false; s.unoNeed = false; }
    for (let k = 0; k < 7; k++) for (const s of seats) give(g, s, 1);
    let first; do { first = take(g); if (first.c === "w") { g.deck.unshift(first); first = null; } } while (!first);   // 第一張不能是黑色的牌（黑色的塞回牌堆底）
    g.discard.push(first); g.color = first.c;
    g.turn = Math.floor(Math.random() * seats.length);
    log(g, `牌局開始！第一張是${cardName(first)}，由 ${seats[g.turn].name} 先出`);
    return g;
  }
  function take(g) {
    if (!g.deck.length) { const top = g.discard.pop(); g.deck = g.discard.sort(() => Math.random() - 0.5); g.discard = [top]; }
    return g.deck.pop() || null;                 // 牌真的被抽光了（極少見）：就不抽
  }
  const give = (g, s, n) => { for (let k = 0; k < n; k++) { const c = take(g); if (c) s.hand.push(c); } };
  const top = (g) => g.discard[g.discard.length - 1];
  function log(g, t) { g.log.push(t); if (g.log.length > 30) g.log.shift(); g.v++; }
  const live = (g) => g.seats.filter((s) => !s.away);
  function nextIdx(g, from, steps = 1) {
    let i = from;
    for (let k = 0; k < steps; k++) { let guard = 0; do { i = (i + g.dir + g.seats.length) % g.seats.length; guard++; } while (g.seats[i].away && guard <= g.seats.length); }
    return i;
  }
  function canPlay(g, si, card) {
    const s = g.seats[si], R0 = g.rules, t = top(g);
    if (g.winner != null || si !== g.turn || !s.hand.includes(card)) return false;
    if (R0.noLastAction && s.hand.length === 1 && isAction(card)) return false;
    if (g.chain) return isDigit(card) && card.v === g.chain;
    if (g.drawn && card.id !== g.drawn) return false;
    if (g.pending > 0) return !!(R0.stack && DRAW[card.v] && DRAW[card.v] >= (DRAW[t.v] || 0));
    if (card.c === "w") return true;
    return card.c === g.color || card.v === t.v;
  }
  // 有人動作之前：上一個剩一張卻沒喊 UNO 的人罰抽 2 張
  function checkUno(g, actor) {
    for (const s of g.seats) if (s !== g.seats[actor] && s.unoNeed && !s.uno) { s.unoNeed = false; give(g, s, 2); log(g, `${s.name} 忘記喊 UNO！罰抽 2 張`); }
  }
  function advance(g, steps = 1) {
    g.chain = null; g.drawn = null;
    g.turn = nextIdx(g, g.turn, steps);
    // 不能疊加的時候：+2／+4 直接讓下一個人抽、跳過他
    if (g.pending > 0 && !g.rules.stack) { const s = g.seats[g.turn]; give(g, s, g.pending); log(g, `${s.name} 抽了 ${g.pending} 張，跳過`); g.pending = 0; g.turn = nextIdx(g, g.turn); }
    for (const s of g.seats) if (s.hand.length > 1) { s.uno = false; s.unoNeed = false; }
  }
  function play(g, si, cardId, color) {
    const s = g.seats[si], card = s.hand.find((c) => c.id === cardId);
    if (!card || !canPlay(g, si, card)) return false;
    checkUno(g, si);
    s.hand.splice(s.hand.indexOf(card), 1);
    g.discard.push(card);
    g.color = card.c === "w" ? (COLORS.includes(color) ? color : "r") : card.c;
    log(g, `${s.name} 出了${cardName(card)}${card.c === "w" ? `，指定${CNAME[g.color]}色` : ""}`);
    if (s.hand.length === 1) s.unoNeed = true;
    if (!s.hand.length) { g.winner = si; log(g, `${s.name} 出完了！${s.name} 贏了！`); return true; }
    let steps = 1;
    if (card.v === "skip") steps = 2;
    if (card.v === "rev") { g.dir *= -1; if (live(g).length === 2) steps = 2; }
    if (DRAW[card.v]) g.pending += DRAW[card.v];
    // 同數字連出：手上還有同數字的牌，就可以接著出
    if (g.rules.sameNum && isDigit(card) && s.hand.some((c) => c.v === card.v && !(g.rules.noLastAction && s.hand.length === 1 && isAction(c)))) { g.chain = card.v; g.drawn = null; g.v++; return true; }
    advance(g, steps);
    return true;
  }
  function draw(g, si) {
    if (g.winner != null || si !== g.turn || g.chain || g.drawn) return false;
    checkUno(g, si);
    const s = g.seats[si];
    if (g.pending > 0) { give(g, s, g.pending); log(g, `${s.name} 抽了累積的 ${g.pending} 張`); g.pending = 0; advance(g); return true; }
    const c = take(g);
    if (!c) { log(g, `牌堆空了，${s.name} 跳過`); advance(g); return true; }
    s.hand.push(c); log(g, `${s.name} 抽了一張牌`);
    s.uno = false; s.unoNeed = false;
    if (canPlayIgnoringDrawn(g, si, c)) { g.drawn = c.id; g.v++; } else advance(g);
    return true;
  }
  function canPlayIgnoringDrawn(g, si, c) { const d = g.drawn; g.drawn = null; const ok = canPlay(g, si, c); g.drawn = d; return ok; }
  function pass(g, si) {
    if (si !== g.turn) return false;
    if (g.chain) { log(g, `${g.seats[si].name} 結束出牌`); advance(g); return true; }
    if (g.drawn) { log(g, `${g.seats[si].name} 不出抽到的牌`); advance(g); return true; }
    return false;
  }
  function callUno(g, si) {
    const s = g.seats[si];
    if (s.uno || s.hand.length > 2 || (s.hand.length === 2 && g.turn !== si)) return false;
    s.uno = true; s.unoNeed = false; log(g, `${s.name}：「UNO！」`);
    return true;
  }

  // ===== 電腦 =====
  function cpuMove(g, si) {
    const s = g.seats[si];
    if (s.hand.length <= 2 && !s.uno && Math.random() < 0.85 && (s.hand.length === 1 || g.turn === si)) callUno(g, si);
    if (g.turn !== si || g.winner != null) return;
    const playable = s.hand.filter((c) => canPlay(g, si, c));
    if (!playable.length) { if (g.chain || g.drawn) pass(g, si); else draw(g, si); return; }
    const score = (c) => (c.c === "w" ? 0 : 10) + (c.c === g.color ? 3 : 0) + (isAction(c) ? 2 : 0) + (g.chain ? 20 : 0);
    const c = playable.sort((a, b) => score(b) - score(a))[0];
    const counts = { r: 0, y: 0, g: 0, b: 0 }; for (const h of s.hand) if (h.c !== "w") counts[h.c]++;
    const best = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    if (s.hand.length === 2 && !s.uno && Math.random() < 0.85) callUno(g, si);
    play(g, si, c.id, best);
  }

  // ===== 每個人看得到的樣子 =====
  function viewFor(g, si) {
    const me = g.seats[si];
    return {
      v: g.v, seats: g.seats.map((s, i) => ({ name: s.name, n: s.hand.length, cpu: !!s.cpu, away: !!s.away, uno: s.uno, me: i === si })),
      top: top(g), color: g.color, dir: g.dir, turn: g.turn, pending: g.pending, chain: g.chain, drawn: g.turn === si ? g.drawn : null,
      hand: me ? me.hand : [], playable: me ? me.hand.filter((c) => canPlay(g, si, c)).map((c) => c.id) : [], rules: g.rules, winner: g.winner, log: g.log.slice(-8), deck: g.deck.length,
      canUno: !!me && !me.uno && (me.hand.length === 1 || (me.hand.length === 2 && g.turn === si)),
    };
  }

  // ===== 畫面 =====
  function open(env) {
    const NET = env.net?.online ? env.net : null, HOST = !NET || NET.isHost, GUEST = !!NET && !NET.isHost;
    const wrap = document.createElement("div");
    wrap.className = "uno-wrap";
    wrap.style.cssText = "position:fixed;inset:0;z-index:300;background:rgba(18,40,28,.92);display:flex;align-items:center;justify-content:center;font-family:'Noto Sans TC',sans-serif";
    wrap.innerHTML = `<div class="uno-box" style="position:relative;width:min(1100px,96vw);height:min(720px,92vh);background:radial-gradient(ellipse at center,#2f7a4a,#1d5a34);border:6px solid #8a5a2a;border-radius:24px;color:#fff;padding:14px 18px;box-sizing:border-box;display:flex;flex-direction:column;gap:10px;overflow:hidden"></div>`;
    document.body.appendChild(wrap);
    const box = wrap.querySelector(".uno-box");
    const S = { g: null, view: null, rules: { ...DEFAULT_RULES }, cpus: NET ? 0 : 2, pick: null, hostLost: false, mySeat: 0 };
    const offs = [];
    const me = env.me;
    const btn = (act, text, extra = "", style = "") => `<button type="button" data-u="${act}" ${extra} style="font:700 14px 'Noto Sans TC',sans-serif;padding:8px 16px;border-radius:999px;border:2px solid #fff;background:${style || "#fff"};color:${style ? "#fff" : "#1d5a34"};cursor:pointer">${text}</button>`;
    function cardHtml(c, opts = {}) {
      const bg = CCOL[c.c], big = opts.big;
      const w = big ? 96 : 64, h = big ? 140 : 94;
      const wild = c.c === "w" ? `<div style="position:absolute;inset:${big ? 26 : 18}px ${big ? 14 : 9}px;border-radius:50%;background:conic-gradient(#e84a4a 0 25%,#f2c200 0 50%,#3ab86a 0 75%,#2a8ad8 0)"></div>` : `<div style="position:absolute;inset:${big ? 22 : 15}px ${big ? 10 : 7}px;border-radius:50%;background:#fff;transform:rotate(-25deg) scaleY(.8)"></div>`;
      return `<div data-card="${c.id}" style="position:relative;flex:none;width:${w}px;height:${h}px;border-radius:10px;background:${bg};border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.35);${opts.play ? "cursor:pointer;" : opts.dim ? "opacity:.55;" : ""}${opts.play ? "transform:translateY(-10px);outline:3px solid #ffe48a;" : ""}">
        ${wild}<div style="position:absolute;inset:0;display:grid;place-items:center;font:900 ${big ? 40 : 26}px sans-serif;color:${c.c === "w" ? "#fff" : bg};-webkit-text-stroke:${c.c === "w" ? "1.5px #1d1d1f" : "0"};text-shadow:${c.c === "w" ? "0 2px 0 #1d1d1f" : "none"}">${label(c)}</div>
        <div style="position:absolute;left:5px;top:3px;font:900 ${big ? 16 : 12}px sans-serif;color:#fff">${label(c)}</div></div>`;
    }
    const back = (n) => `<div style="flex:none;width:34px;height:50px;border-radius:6px;background:#1d1d1f;border:2px solid #fff;display:grid;place-items:center;font:900 10px sans-serif;color:#e84a4a">UNO</div>`;
    const rulesText = (r) => [r.stack ? "+2／+4 可以疊加" : "+2／+4 不能疊加", r.sameNum ? "同數字可以連出" : "同數字不能連出", r.noLastAction ? "禁止功能牌當最後一張" : "功能牌可以當最後一張", r.unoBy === "chat" ? "在聊天欄打 UNO 喊" : "按 UNO 鍵喊", r.plus8 ? "有特殊的 +8 牌" : "沒有 +8 牌"].join("・");

    // --- 開局前：設定房規 ---
    function renderSetup() {
      if (GUEST) {
        box.innerHTML = `<h2 style="margin:0">桌上的牌：UNO</h2><p>等房主決定房規、開始牌局……</p>${S.rules ? `<p style="opacity:.8">${rulesText(S.rules)}</p>` : ""}<div style="margin-top:auto">${btn("close", "離開牌桌")}</div>`;
        return;
      }
      const humans = NET ? env.members.length : 1, total = humans + S.cpus;
      const tg = (k, on, a, b) => `<label style="display:flex;gap:8px;align-items:center;cursor:pointer"><input type="checkbox" data-r="${k}" ${on ? "checked" : ""}> ${on ? a : b}</label>`;
      box.innerHTML = `<h2 style="margin:0">桌上的牌：UNO</h2>
        <p style="margin:0;opacity:.85">${NET ? `房間裡的 ${humans} 個人一起玩` : "和電腦玩"}；不夠的位置可以讓電腦補上（2～6 人）。房規由${NET ? "房主" : "你"}決定：</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;background:rgba(0,0,0,.2);padding:14px 18px;border-radius:12px">
          ${tg("stack", S.rules.stack, "+2／+4 可以疊加", "+2／+4 可以疊加")}
          ${tg("sameNum", S.rules.sameNum, "同數字可以連出", "同數字可以連出")}
          ${tg("noLastAction", S.rules.noLastAction, "禁止用功能牌當最後一張", "禁止用功能牌當最後一張")}
          ${tg("plus8", S.rules.plus8, "加入特殊的 +8 牌（兩張）", "加入特殊的 +8 牌（兩張）")}
          <div>喊 UNO 的方式：${btn("unoBy-button", "按 UNO 鍵", "", S.rules.unoBy === "button" ? "#e84a4a" : "")} ${btn("unoBy-chat", "在聊天欄打 UNO", "", S.rules.unoBy === "chat" ? "#e84a4a" : "")}</div>
          <div>電腦補位：${btn("cpu-", "－")} <b style="font-size:18px">${S.cpus}</b> ${btn("cpu+", "＋")}（共 ${total} 人）</div>
        </div>
        <p style="margin:0;opacity:.8">喊 UNO：剩兩張、輪到你時可以先喊，或剛剩一張時馬上喊；下一個人動作之前還沒喊，罰抽 2 張</p>
        <div style="margin-top:auto;display:flex;gap:10px">${btn("start", "開始牌局", total < 2 || total > 6 ? "disabled" : "", "#e84a4a")}${btn("close", "離開牌桌")}</div>`;
      box.querySelectorAll("[data-r]").forEach((el) => el.addEventListener("change", () => { S.rules[el.dataset.r] = el.checked; renderSetup(); }));
    }
    // --- 牌局 ---
    function render() {
      const V = S.view;
      if (!V) return renderSetup();
      const n = V.seats.length, myIdx = V.seats.findIndex((s) => s.me);
      const myTurn = V.turn === myIdx && V.winner == null;
      const others = V.seats.map((s, i) => ({ ...s, i })).filter((s) => !s.me);
      const t = V.top;
      const status = V.winner != null ? `${V.seats[V.winner].name} 贏了！` : myTurn ? (V.chain ? `同數字連出中（${V.chain}）：還要出就點牌，不出就按「結束出牌」` : V.drawn ? "抽到的牌可以出，或按「不出」" : V.pending ? `被罰抽 ${V.pending} 張！${V.rules.stack ? "可以疊一張罰抽牌，或按「抽牌」全部抽走" : ""}` : "輪到你了") : `輪到 ${V.seats[V.turn].name}`;
      box.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><b>UNO</b><span style="font-size:12px;opacity:.75">${rulesText(V.rules)}</span>${btn("close", "離開牌桌")}</div>
        <div style="display:flex;justify-content:center;gap:14px;flex-wrap:wrap">${others.map((s) => `<div style="background:${V.turn === s.i ? "rgba(255,228,138,.3)" : "rgba(0,0,0,.25)"};border:2px solid ${V.turn === s.i ? "#ffe48a" : "transparent"};border-radius:12px;padding:8px 12px;min-width:120px;text-align:center;${s.away ? "opacity:.45" : ""}">
            <div style="font-weight:900">${esc(s.name)}${s.cpu ? "（電腦）" : ""}${s.away ? "（暫時離開）" : ""}</div>
            <div style="display:flex;justify-content:center;gap:-10px;margin:6px 0">${Array.from({ length: Math.min(s.n, 8) }, () => back()).join("").replace(/<div style="flex:none;width:34px/g, '<div style="margin-left:-18px;flex:none;width:34px')}</div>
            <div>${s.n} 張${s.uno ? ` <b style="color:#ffe48a">UNO！</b>` : ""}</div></div>`).join("")}</div>
        <div style="flex:1;display:flex;align-items:center;justify-content:center;gap:30px">
          <div style="text-align:center">${btn("draw", `<div style="width:84px;height:124px;border-radius:10px;background:#1d1d1f;border:3px solid #fff;display:grid;place-items:center;font:900 20px sans-serif;color:#e84a4a">UNO</div>`, myTurn && !V.chain && !V.drawn ? "" : "disabled", "transparent")}<div style="font-size:12px;opacity:.8">牌堆 ${V.deck} 張</div></div>
          <div style="text-align:center">${cardHtml(t, { big: true })}<div style="margin-top:6px">現在的顏色：<b style="color:${CCOL[V.color]};background:#fff;padding:0 8px;border-radius:999px">${CNAME[V.color]}</b></div></div>
          <div style="max-width:300px;font-size:13px;line-height:1.6;background:rgba(0,0,0,.25);border-radius:10px;padding:8px 10px">
            <div>方向：${V.dir > 0 ? "順時針 ↻" : "逆時針 ↺"}${V.pending ? `　<b style="color:#ffe48a">累積罰抽 ${V.pending}</b>` : ""}</div>
            ${V.log.map((l) => `<div style="opacity:.85">${esc(l)}</div>`).join("")}</div>
        </div>
        <div style="text-align:center;font-weight:900;font-size:18px;color:${myTurn ? "#ffe48a" : "#fff"}">${esc(status)}</div>
        ${S.pick ? `<div style="display:flex;gap:10px;justify-content:center;align-items:center">指定顏色：${COLORS.map((c) => `<button type="button" data-u="color" data-c="${c}" style="width:54px;height:54px;border-radius:50%;border:3px solid #fff;background:${CCOL[c]};cursor:pointer"></button>`).join("")}${btn("cancelPick", "取消")}</div>` : ""}
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding-top:8px;min-height:110px;align-items:flex-end">${V.hand.map((c) => cardHtml(c, { play: myTurn && V.playable.includes(c.id), dim: myTurn && !V.playable.includes(c.id) })).join("")}</div>
        <div style="display:flex;gap:10px;justify-content:center;align-items:center">
          ${myTurn && (V.chain || V.drawn) ? btn("pass", V.chain ? "結束出牌" : "不出") : ""}
          ${myTurn && V.pending && !V.chain ? btn("draw", `抽 ${V.pending} 張`) : ""}
          ${V.rules.unoBy === "button" ? btn("uno", "UNO！", V.canUno ? "" : "disabled", V.canUno ? "#e84a4a" : "") : `<span style="opacity:.8;font-size:13px">喊 UNO：在下面的聊天欄打「UNO」</span>`}
          ${V.winner != null && HOST ? btn("again", "再一局", "", "#e84a4a") : ""}
          <span style="opacity:.75">你的手牌：${V.hand.length} 張</span>
        </div>
        ${S.hostLost ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,.65);display:grid;place-items:center;font:900 26px sans-serif">房主斷線了，牌局暫停</div>` : ""}`;
    }
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

    // --- 房主：送畫面、電腦行動 ---
    let cpuT = null;
    function sync() {
      const g = S.g; if (!g) return;
      S.view = viewFor(g, S.mySeat);
      if (NET) for (const [i, s] of g.seats.entries()) if (s.pid && s.pid !== NET.myId) NET.sendTo(s.pid, { t: "unoV", v: viewFor(g, i) });
      render();
      clearTimeout(cpuT);
      const cur = g.seats[g.turn];
      // 電腦：輪到它，或它剛剩一張要喊 UNO
      if (g.winner == null && (cur.cpu || cur.away)) cpuT = setTimeout(() => { if (cur.away) { if (g.pending || g.chain || g.drawn) { g.chain = null; g.drawn = null; } log(g, `${cur.name} 暫時離開，跳過`); advance(g); } else cpuMove(g, g.turn); sync(); }, cur.away ? 400 : 900 + Math.random() * 500);
    }
    function start() {
      const seats = [];
      if (NET) for (const m of env.members) seats.push({ name: m.name, pid: m.id });
      else seats.push({ name: me.name, pid: "me" });
      for (let i = 0; i < S.cpus; i++) seats.push({ name: `電腦${i + 1}`, cpu: true });
      for (let i = seats.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [seats[i], seats[j]] = [seats[j], seats[i]]; }
      S.g = Game(seats, { ...S.rules });
      S.mySeat = seats.findIndex((s) => s.pid === (NET ? NET.myId : "me"));
      if (NET) NET.send({ t: "unoStart", rules: S.rules });
      sync();
    }
    function hostAct(si, a) {
      const g = S.g; if (!g) return;
      let ok = false;
      if (a.a === "play") ok = play(g, si, a.id, a.color);
      else if (a.a === "draw") ok = draw(g, si);
      else if (a.a === "pass") ok = pass(g, si);
      else if (a.a === "uno") ok = callUno(g, si);
      if (ok) sync();
    }
    // 自己的動作：房主直接算；其他人送給房主
    function act(a) { if (HOST) hostAct(S.mySeat, a); else NET.send({ t: "unoA", act: a }); }
    // 聊天欄打 UNO
    function chatUno(text, fromId) {
      if (!/^\s*uno\s*[!！]*\s*$/i.test(text)) return;
      if (HOST && S.g && S.g.rules.unoBy === "chat") { const si = S.g.seats.findIndex((s) => s.pid === (fromId || (NET ? NET.myId : "me"))); if (si >= 0 && callUno(S.g, si)) sync(); }
    }

    if (NET) {
      if (HOST) {
        offs.push(NET.on("unoA", (m, from) => { const si = S.g?.seats.findIndex((s) => s.pid === from); if (si >= 0) hostAct(si, m.act); }));
        offs.push(NET.on("unoJoin", (m, from) => { if (S.g) { const si = S.g.seats.findIndex((s) => s.pid === from); if (si >= 0) { S.g.seats[si].away = false; sync(); } } else NET.sendTo(from, { t: "unoRules", rules: S.rules }); }));
        offs.push(NET.on("unoLeave", (m, from) => away(from)));
        offs.push(NET.on("left", (m, from) => away(from)));
      } else {
        offs.push(NET.on("unoV", (m) => { S.view = m.v; render(); }));
        offs.push(NET.on("unoRules", (m) => { S.rules = m.rules; if (!S.view) renderSetup(); }));
        offs.push(NET.on("unoStart", (m) => { S.rules = m.rules; }));
        offs.push(NET.on("unoEnd", () => { S.view = null; renderSetup(); }));
        offs.push(NET.on("hostLost", () => { S.hostLost = true; render(); }));
        NET.send({ t: "unoJoin" });
      }
    }
    function away(pid) { const s = S.g?.seats.find((x) => x.pid === pid); if (s) { s.away = true; log(S.g, `${s.name} 暫時離開了牌桌`); sync(); } }

    box.addEventListener("click", (e) => {
      const card = e.target.closest("[data-card]");
      if (card && S.view) {
        const id = Number(card.dataset.card), c = S.view.hand.find((x) => x.id === id);
        if (!c || !S.view.playable.includes(id)) return;
        if (c.c === "w") { S.pick = id; return render(); }
        return act({ a: "play", id });
      }
      const b = e.target.closest("[data-u]"); if (!b || b.disabled) return;
      const u = b.dataset.u;
      if (u === "close") return close();
      if (u === "start") return start();
      if (u === "cpu+") { S.cpus = Math.min(5, S.cpus + 1); return renderSetup(); }
      if (u === "cpu-") { S.cpus = Math.max(0, S.cpus - 1); return renderSetup(); }
      if (u.startsWith("unoBy-")) { S.rules.unoBy = u.slice(6); return renderSetup(); }
      if (u === "color") { const id = S.pick; S.pick = null; return act({ a: "play", id, color: b.dataset.c }); }
      if (u === "cancelPick") { S.pick = null; return render(); }
      if (u === "draw") return act({ a: "draw" });
      if (u === "pass") return act({ a: "pass" });
      if (u === "uno") return act({ a: "uno" });
      if (u === "again") { S.view = null; S.g = null; if (NET) NET.send({ t: "unoEnd" }); return renderSetup(); }
    });
    function close() {
      clearTimeout(cpuT);
      if (NET) { if (HOST) NET.send({ t: "unoEnd" }); else NET.send({ t: "unoLeave" }); }
      for (const f of offs) f();
      wrap.remove(); R._uno = null;
      env.onClose?.();
    }
    renderSetup();
    const api = { close, chatUno, get state() { return S; } };
    R._uno = api;                       // 測試用、聊天欄打 UNO 用
    return api;
  }
  R.Uno = { open, rules: DEFAULT_RULES, _engine: { Game, play, draw, pass, callUno, canPlay, cpuMove, viewFor } };
})();
