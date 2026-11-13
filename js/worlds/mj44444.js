/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/mj44444.js": "20261114042342" });
// #MJ44444 彼岸花盛開的事務所
//   MJ44444-01 第 44444 號：照公告欄的順序到窗口蓋章（錯了從頭來）→ 「因果清點」蓋不下去 → 跟周先生談他放不下的事
//   MJ44444-02 剪不斷的紅線：花田裡六團線，「怨」的剪斷、「緣」的解開（剪錯了，緣變成怨爬出來）→ 打百年的怨念
//   MJ44444-03 百分之九十九點九九：順著變白的彼岸花，找到躲起來的小孩
(function () {
  const R = (window.RPG = window.RPG || {});
  R.WorldHooks = R.WorldHooks || {};

  R.WorldHooks.MJ44444 = function (api) {
    const { MAP, trip, me, toast, text, save, dist, esc } = api;
    const K = R.BKit(api), ctx = api.ctx();
    const Q1 = K.q("MJ44444-01"), Q2 = K.q("MJ44444-02"), Q3 = K.q("MJ44444-03");
    Q1.idx = Q1.idx || 0; Q2.res = Q2.res || {};
    const ctr = (n) => MAP.counters.find((c) => c.n === n);
    const CLERK = (c) => ({ name: `${c.n} 號窗口・${c.clerk}`, color: "#8a1a2a", face: c.clerk });
    const lilies = Array.from({ length: 220 }, (_, i) => ({ x: 70 + ((i * 523) % (MAP.w - 140)), y: MAP.field.y + 40 + ((i * 331) % (MAP.field.h - 80)), s: 9 + (i % 4) * 2 }));
    const rate = () => (K.active("MJ44444-03") && !Q3.found ? "99.99%" : "100%");

    // ===== MJ-01：蓋章 =====
    function counterPanel(c) {
      if (!K.is("MJ44444-01", "mjStamp")) return api.dlg(`${c.n} 號窗口・${c.name}`, CLERK(c), K.is("MJ44444-01", "mjKnot") && c.n === 5 ? "因果還沒斷乾淨，這個章蓋不下去。請先處理亡者放不下的事。這是程序。" : "請抽號碼牌。依程序辦理。");
      const want = MAP.order[Q1.idx];
      if (c.n !== want) {
        const had = Q1.idx; Q1.idx = 0; save(); api.renderHud();
        api.sfx?.("sounds/boss-bullet.mp3");
        return api.dlg(`${c.n} 號窗口・${c.name}`, CLERK(c), `程序錯誤。「${c.name}」不是現在該辦的手續。${had ? `前面蓋的 ${had} 個章，依程序作廢，請從頭辦理。` : "請先看公告欄。"}`, `<button type="button" class="ghost" data-close>……好</button>`);
      }
      if (c.n === MAP.order[3]) {           // 第四個：因果清點，蓋不下去
        api.dlg(`${c.n} 號窗口・${c.name}`, CLERK(c), "（印章舉起來，停在半空中。）……第 44444 號，周先生。您還有一條因果沒有斷乾淨。這個章，蓋不下去。", `<button type="button" class="primary" data-close>去找周先生</button>`);
        K.adv("MJ44444-01", "「因果清點」的章蓋不下去。到等候區，跟周先生談談");
        return;
      }
      Q1.idx++; save(); api.renderHud();
      api.sfx?.("sounds/guan-chime.mp3");
      api.fx.push({ k: "ring", x: c.x, y: c.y + 60, r: 50, color: "#c40a1e", t: performance.now(), dur: 600 });
      api.dlg(`${c.n} 號窗口・${c.name}`, CLERK(c), `（碰。）「${c.name}」，辦理完成。請前往下一個窗口。`, `<button type="button" class="ghost" data-close>好</button>`, `已蓋 ${Q1.idx} 個章`);
    }
    // ===== MJ-01：周先生放不下的事 =====
    const ZHOU = MAP.npcs.find((n) => n.id === "zhou");
    function npcExtra(n) {
      if (n.id !== "zhou" || !K.is("MJ44444-01", "mjKnot")) return "";
      return `<button type="button" class="ghost dlg-ask" data-act="mjZhou"><b>委託</b>：您有什麼放不下的事嗎？</button>`;
    }
    function zhouTalk(msg) {
      api.dlg("等候區", ZHOU, msg || "……我弟弟。三十年前，他把爸爸留下來的老房子賣了。我們吵了一架，之後再也沒說過話。他比我早走了五年，走之前寄了一封信給我。我一直沒打開。",
        `<button type="button" class="ghost dlg-ask" data-act="mjZ" data-k="forgive">「都過去了，原諒他吧。」</button>
         <button type="button" class="ghost dlg-ask" data-act="mjZ" data-k="angry">「他做錯了，您生氣是對的。」</button>
         <button type="button" class="ghost dlg-ask" data-act="mjZ" data-k="letter">「那封信……要不要一起打開？」</button>`);
    }
    function zhouPick(k) {
      if (k === "forgive") return zhouTalk("「原諒？」（他笑了一下。）「說得容易。你們都這麼說。三十年了，我連為什麼生氣都快忘了，可是就是放不下。」");
      if (k === "angry") return zhouTalk("「……對吧。」（他握緊了口袋。）「可是說我是對的，也沒有讓我比較好過。」");
      api.dlgSeq("等候區", [
        { n: ZHOU, text: "（他沉默了很久，從口袋裡拿出一個泛黃的信封，手在抖。）" },
        { n: ZHOU, text: "「哥：那年你的手術費，是賣房子的錢付的。你說過不要我出，所以我沒有說。房子我後來買回來了，鑰匙在信封裡。爸爸的書桌還在原來的位置。」" },
        { n: ZHOU, text: "……這個笨蛋。（他把鑰匙握在手心裡，哭得像個小孩。）……三十年。我氣了他三十年。" },
        { n: ZHOU, text: "（他抬起頭，眼睛紅紅的，可是肩膀鬆了下來。）……可以了。去蓋章吧。我想快點過去——他大概在那邊等很久了。" },
      ], `<button type="button" class="primary" data-close>好</button>`);
      K.adv("MJ44444-01", "周先生放下了。回一號窗口找肆");
    }

    // ===== MJ-02：紅線 =====
    function threadPanel(t) {
      const r = Q2.res[t.id];
      if (r) return toast(r === "ok" ? "這團線已經處理好了" : "這團線……剪錯了。已經散了");
      if (!K.is("MJ44444-02", "mjThread")) return api.dlg("彼岸花田", { name: "紅線", color: "#c40a1e", face: t.kind }, `一團纏在花莖上的紅線，上面寫著「${t.kind}」。`);
      api.dlg("彼岸花田", { name: `紅線・「${t.kind}」`, color: t.kind === "怨" ? "#5a0a1a" : "#e8626c", face: t.kind }, `線上寫著「${t.kind}」。順著線看過去，是${t.who}。`,
        `<button type="button" class="ghost dlg-ask" data-act="mjCut" data-t="${t.id}">✂ 剪斷</button><button type="button" class="ghost dlg-ask" data-act="mjUntie" data-t="${t.id}">🤲 慢慢解開</button>`);
    }
    function doThread(t, how) {
      const right = (t.kind === "怨" && how === "cut") || (t.kind === "緣" && how === "untie");
      if (!right && how === "untie") return api.dlg("彼岸花田", { name: `紅線・「${t.kind}」`, color: "#5a0a1a", face: t.kind }, "你試著解開，可是線越拉越緊，勒得手指發紅。……怨是解不開的，只能剪斷。", `<button type="button" class="primary" data-act="mjCut" data-t="${t.id}">✂ 剪斷</button>`);
      Q2.res[t.id] = right ? "ok" : "bad"; save(); api.renderHud();
      const done = MAP.threads.every((x) => Q2.res[x.id]);
      if (!right) {
        api.closePanel(); toast("剪錯了……「緣」斷掉的地方，冒出了黑紅色的東西——它變成怨了！");
        if (done) K.adv("MJ44444-02");
        setTimeout(() => api.ambushBattle("grudges"), 700);
        return;
      }
      api.sfx?.(how === "cut" ? "sounds/ilshu-slash.mp3" : "sounds/guan-chime.mp3");
      api.fx.push({ k: "ring", x: t.x, y: t.y, r: 60, color: how === "cut" ? "#5a0a1a" : "#ffb0b8", t: performance.now(), dur: 700 });
      api.dlg("彼岸花田", { name: `紅線・「${t.kind}」`, color: "#c40a1e", face: t.kind }, how === "cut" ? "（喀嚓。）線斷掉的地方，冒出一縷黑煙，很快就散了。" : "（你一圈一圈把線解開。線沒有斷，只是鬆鬆地垂下來，像兩隻終於放開的手。）", `<button type="button" class="ghost" data-close>好</button>`);
      if (done) K.adv("MJ44444-02", "六團線都處理完了……整片彼岸花同時轉向了花田中央");
    }

    // ===== MJ-03：小孩 =====
    function update() {
      if (K.is("MJ44444-03", "mjChild") && !Q3.found && dist(me.x, me.y, MAP.child.x, MAP.child.y) < 150 && !Q3.seen) { Q3.seen = true; toast("白色的彼岸花中間，蹲著一個小小的身影"); }
    }
    // 安慰小孩：對話選項（說錯話他會退回去，但不會失敗）
    const KID = { name: "沒有號碼牌的小孩", color: "#a8a0b8", face: "孩" };
    const KIDTALK = {
      start: { t: "……你是來抓我的嗎？", o: [["catch", "「對，跟我回去辦手續。」"], ["stay", "「不是，我是來陪你的。」"]] },
      catch: { t: "（他縮成一團，往花叢裡退了一步。）……我不要。你們都只會說手續、手續。", o: [["stay", "「對不起。我不是來抓你的，我是來陪你的。」"]] },
      stay: { t: "……我在等媽媽。媽媽說，她馬上就來。我不要去那邊，去了她就找不到我了。", o: [["never", "「你媽媽不會來了。」"], ["wait", "「那我陪你在這裡等一下。」"], ["ticket", "「去那邊等也可以。號碼牌上會寫你的名字，媽媽來的時候，找得到你。」"]] },
      never: { t: "（他的眼眶一下子紅了。）……騙人。媽媽說馬上就來。", o: [["wait", "「……對不起。我陪你在這裡等一下，好嗎？」"], ["ticket", "「我是說，她不會來這片花田。可是那邊有一張號碼牌，上面會寫你的名字，她會找到你。」"]] },
      wait: { t: "（你們一起看了一會兒花。）……花都變白了。媽媽說，白色的花是乾淨的意思。……我跑過來的時候，花都會變白。", o: [["ticket", "「那你的號碼牌一定也是乾淨的白色。我們去領一張，寫上你的名字，讓媽媽找得到你。」"], ["stay2", "「你很想媽媽吧。」"]] },
      stay2: { t: "……嗯。媽媽煮的湯很好喝。媽媽會唱歌。……媽媽說，我要乖乖的。", o: [["ticket", "「那我們乖乖去領號碼牌。這樣媽媽來的時候，第一個就找得到你。」"]] },
      ticket: { t: "……真的嗎？號碼牌上，會寫我的名字？媽媽來的時候，找得到我？", o: [["yes", "「真的。我牽你回去，我們一起寫。」"]] },
    };
    function childPanel(k = "start") {
      if (k === "yes") {
        api.dlg("彼岸花田的角落", KID, "（他想了很久，然後伸出小小的手。）……那你牽我回去。不要放開喔。", `<button type="button" class="primary" data-close>牽著他回去</button>`);
        Q3.found = true; save();
        K.adv("MJ44444-03", "找到小孩了。牽著他回統計課找陸");
        return;
      }
      const n = KIDTALK[k];
      api.dlg("彼岸花田的角落", KID, n.t, n.o.map(([id, t]) => `<button type="button" class="ghost dlg-ask" data-act="mjKid" data-k="${id}">${esc(t)}</button>`).join(""));
    }

    // ===== 點擊 =====
    function click(p) {
      const c = MAP.counters.find((x) => Math.abs(p.x - x.x) < 85 && p.y > x.y - 220 && p.y < x.y + 50);
      if (c) { K.reach({ x: c.x, y: c.y + 20 }, 90, () => counterPanel(c)); return true; }
      if (K.hit(p, MAP.board, 80)) { K.reach({ x: MAP.board.x - 70, y: MAP.board.y }, 60, () => api.dlg("公告欄", { name: "公告欄", color: "#8a1a2a", face: "告" }, `【輪迴手續・辦理順序】${MAP.order.map((n) => `${n} 號「${ctr(n).name}」`).join(" → ")}。依程序辦理，順序錯誤者，已辦手續一律作廢。`)); return true; }
      if (K.hit(p, MAP.rateBoard, 70)) { K.reach(MAP.rateBoard, 120, () => toast(`本日輪迴率：${rate()}`)); return true; }
      const t = MAP.threads.find((x) => K.hit(p, x, 60));
      if (t) { K.reach(t, 100, () => threadPanel(t)); return true; }
      if (K.is("MJ44444-03", "mjChild") && K.hit(p, MAP.child, 60) && Q3.seen) { K.reach(MAP.child, 90, () => childPanel()); return true; }
      return false;
    }
    function act(a, b) {
      if (a === "mjZhou") { zhouTalk(); return true; }
      if (a === "mjKid") { childPanel(b.dataset.k); return true; }
      if (a === "mjZ") { zhouPick(b.dataset.k); return true; }
      if (a === "mjCut" || a === "mjUntie") { doThread(MAP.threads.find((x) => x.id === b.dataset.t), a === "mjCut" ? "cut" : "untie"); return true; }
      return false;
    }

    // ===== 畫面 =====
    function drawFloor(now, x0, y0) {
      const O = MAP.office, F = MAP.field;
      ctx.fillStyle = "#e8e0d4"; ctx.fillRect(O.x, O.y, O.w, O.h);
      ctx.strokeStyle = "rgba(120,90,80,.12)"; ctx.lineWidth = 1; for (let x = O.x; x < O.x + O.w; x += 100) { ctx.beginPath(); ctx.moveTo(x, O.y); ctx.lineTo(x, O.y + O.h); ctx.stroke(); }
      ctx.fillStyle = "#2a0a10"; ctx.fillRect(F.x, F.y, F.w, F.h);
      ctx.fillStyle = "#3a1018"; ctx.fillRect(0, F.y - 10, MAP.w, 20);
      // 窗口
      ctx.fillStyle = "#6a3a30"; ctx.fillRect(300, 180, 2000, 60);
      for (const c of MAP.counters) {
        ctx.fillStyle = "#f4ecdc"; api.rr(c.x - 80, c.y - 210, 160, 120, 8); ctx.fill();
        text(`${c.n} 號窗口`, c.x, c.y - 180, "#8a1a2a", 15, 900); text(c.name, c.x, c.y - 154, "#3a2a2a", 13, 900);
        ctx.fillStyle = "#8a1a2a"; ctx.beginPath(); ctx.arc(c.x, c.y - 116, 14, 0, Math.PI * 2); ctx.fill(); text(c.clerk, c.x, c.y - 115, "#fff", 12, 900);
      }
      // 公告欄
      const B = MAP.board; ctx.fillStyle = "#c8a878"; ctx.fillRect(B.x - 20, B.y - 60, 60, 120); text("公告欄", B.x + 10, B.y - 74, "#8a1a2a", 12, 900);
      ctx.fillStyle = "#fff"; ctx.fillRect(B.x - 12, B.y - 50, 44, 100);
      MAP.order.forEach((n, i) => text(`${i + 1}. ${n} 號`, B.x + 10, B.y - 34 + i * 18, "#3a2a2a", 10, 900));
      // 輪迴率
      const RB = MAP.rateBoard; ctx.fillStyle = "#1d1d26"; api.rr(RB.x - 90, RB.y - 40, 180, 64, 8); ctx.fill();
      text("本日輪迴率", RB.x, RB.y - 22, "#c8c8d8", 11, 900); text(rate(), RB.x, RB.y + 6, rate() === "100%" ? "#5aff9a" : "#ff6a6a", 22, 900);
      // 等候區的椅子
      const C = MAP.chairs; for (let r = 0; r < C.rows; r++) for (let i = 0; i < C.cols; i++) { ctx.fillStyle = "#8a7060"; api.rr(C.x + i * 110, C.y + r * 110, 70, 40, 6); ctx.fill(); }
      text("亡者等候區", C.x + 600, C.y - 30, "#6a4a40", 15, 900);
      // 等著辦手續的亡者（半透明，手上拿著號碼牌）
      for (let r = 0; r < C.rows; r++) for (let i = 0; i < C.cols; i++) {
        if ((i * 7 + r * 3) % 5) continue;
        const x = C.x + i * 110 + 35, y = C.y + r * 110 + 4 + Math.sin(now / 900 + i + r) * 2;
        K.human(x, y - 10, "#8a8a9a", "亡", now, { s: 26, alpha: 0.5, fill: "#f0f0f6" });
        text(String(44380 + i * 5 + r * 17), x, y - 34, "#8a7a8a", 9, 700);
      }
      // 彼岸花田
      const whiteOn = K.is("MJ44444-03", "mjChild");
      for (const l of lilies) R.drawLily?.(ctx, l.x, l.y + Math.sin(now / 1500 + l.x) * 1.5, l.s);
      if (whiteOn) for (const t of MAP.trail) for (let i = 0; i < 3; i++) R.drawLily?.(ctx, t.x + (i - 1) * 26, t.y + (i % 2) * 14, 12, "#f4f0ea");
      text("彼岸花田", 220, F.y + 40, "#e8626c", 15, 900);
    }
    function draw(now) {
      // 紅線
      for (const t of MAP.threads) {
        const r = Q2.res[t.id] || (trip.done.includes("MJ44444-02") ? "ok" : null);
        if (r) continue;
        ctx.strokeStyle = t.kind === "怨" ? "#8a0a1a" : "#ff5a6a"; ctx.lineWidth = 2;
        for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(t.x + Math.sin(i * 2.1) * 6, t.y + Math.cos(i * 1.7) * 4, 22 + i * 2, 12 + i, i * 0.5 + now / 3000, 0, Math.PI * 2); ctx.stroke(); }
        text(t.kind, t.x, t.y - 34, t.kind === "怨" ? "#ff8a9a" : "#ffd0d8", 14, 900);
        if (K.is("MJ44444-02", "mjThread")) api.marker(t.x, t.y - 60, now, "#f2c200");
      }
      // 小孩（靠近才看得到）
      if (K.is("MJ44444-03", "mjChild") && Q3.seen) {
        const c = MAP.child;
        K.human(c.x, c.y, "#a8a0b8", "孩", now, { s: 20, alpha: 0.75 + Math.sin(now / 400) * 0.15, fill: "#f4f2f8", k: 1 });
        api.marker(c.x, c.y - 36, now, "#f2c200");
      }
      if (K.is("MJ44444-01", "mjStamp") && Q1.idx === 0) api.marker(MAP.board.x + 10, MAP.board.y - 96, now, "#f2c200");
      if (K.is("MJ44444-01", "mjKnot")) api.marker(ZHOU.x, ZHOU.y - 60, now, "#f2c200");
    }
    function stageText(id, st) {
      if (st?.type === "mjStamp") return `${st.text}（已蓋 ${Q1.idx} 個章）`;
      if (st?.type === "mjThread") return `${st.text}（${Object.keys(Q2.res).length} / 6）`;
      return null;
    }
    function mini(dot, now) {
      const bl = `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`;
      if (K.is("MJ44444-01", "mjKnot")) dot(ZHOU.x, ZHOU.y, 4, bl);
      if (K.is("MJ44444-02", "mjThread")) for (const t of MAP.threads) if (!Q2.res[t.id]) dot(t.x, t.y, 4, bl);
    }
    function drawEnemy(e, now, red) { return K.enemyArt(e, now, red, { grudges: ["grudge", 2], grudges3: ["grudge", 3] }); }
    return { update, click, act, npcExtra, draw, drawFloor, drawEnemy, stageText, mini };
  };
})();
