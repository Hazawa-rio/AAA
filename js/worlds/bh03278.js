/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/bh03278.js": "20261113145157" });
// #BH03278 比爾哈頓廣場
//   催淚瓦斯：白色的煙會慢慢飄。走進去會咳嗽（走路變慢）；扛著醫療物資走進去，箱子會掉回補給車
//   BH03278-01 廣場上的醫療站：從補給車搬三箱醫療物資到醫療站
//   BH03278-02 兩年前的收據：問店員、主持人、警官 → 對圍著店的人說出查到的事（選對的話）→ 打煽動者
//   BH03278-03 瓦斯散了以後：幫五個咳到睜不開眼的人沖眼睛（不分哪一邊）
(function () {
  const R = (window.RPG = window.RPG || {});
  R.WorldHooks = R.WorldHooks || {};

  R.WorldHooks.BH03278 = function (api) {
    const { MAP, trip, me, toast, text, save, dist, esc } = api;
    const K = R.BKit(api), ctx = api.ctx();
    const Q1 = K.q("BH03278-01"), Q2 = K.q("BH03278-02"), Q3 = K.q("BH03278-03");
    Q1.n = Q1.n || 0; Q2.asked = Q2.asked || {}; Q3.done = Q3.done || {};
    const gas = MAP.gas.map((g) => ({ ...g }));
    let cough = 0, coughMsg = 0;

    // ===== 證詞 =====
    const TESTIMONY = {
      clerk: { q: "問收據的事", lines: [
        "那張收據？……是真的。兩年前那位議員來過，我記得，他買了很多東西。",
        "刷的是他自己的卡還是公家的錢，我不知道。我們店只看卡有沒有過。",
        "我只是在這裡打工的。老闆看到人群就從後門跑了，留下我顧店。",
        "那些人說要「讓議員付出代價」。……可是議員又不在店裡。"] },
      host: { q: "問收據的事", lines: [
        "我們上台講的是兩件事：稅太高，還有那些出國訪問的豪華排場。",
        "那張收據不是我們印的。昨天有幾個人在人群裡發傳單，發完就喊「去精品店」。",
        "他們不是我們的人。我們排過隊形，那幾張臉我沒見過。",
        "我們要的是議員出來說明。不是搶一家店。"] },
      officer: { q: "問收據的事", lines: [
        "收據的那筆錢，議會的財務報告裡查得到。有沒有報公帳——那是議會該公開的事。",
        "發傳單的那幾個人，我們盯了一整天。他們不在抗議的隊伍裡，也不是我們的人。",
        "……瓦斯的事，我知道外面怎麼說。用多少、什麼時候用，不是我能決定的。",
        "但我看到的，我會照實寫進報告裡。"] },
    };
    function npcExtra(n) {
      if (!TESTIMONY[n.id] || !K.is("BH03278-02", "bhAsk")) return "";
      return `<button type="button" class="ghost dlg-ask" data-act="bhAsk" data-n="${n.id}"><b>委託</b>：${esc(TESTIMONY[n.id].q)}${Q2.asked[n.id] ? "（問過了）" : ""}</button>`;
    }
    function ask(id) {
      const n = MAP.npcs.find((x) => x.id === id), T = TESTIMONY[id];
      const first = !Q2.asked[id];
      Q2.asked[id] = true; save(); api.renderHud();
      const all = Object.keys(TESTIMONY).every((k) => Q2.asked[k]);
      api.dlgSeq(n.name, T.lines.map((t) => ({ n, text: t })), `<button type="button" class="primary" data-close>${all && first ? "都問清楚了" : "謝謝"}</button>`);
      if (all && first) K.adv("BH03278-02", "三個人都問過了。到精品店前，對圍著店的人說出你查到的事");
    }
    // ===== 對人群說話 =====
    const SAY = [
      { id: "fake", t: "「那張收據是假的！大家被騙了！」", r: "「假的？我們都看過了，上面還有店章！」人群更吵了。……店員自己都說收據是真的。" },
      { id: "home", t: "「抗議沒有用的，大家回家吧。」", r: "「你懂什麼？稅金是你在繳嗎？」好幾個人朝你丟了寶特瓶。……他們生氣的事是真的，不能叫他們別生氣。" },
      { id: "truth", t: "「收據是真的，議員要說清楚。可是這家店和店員跟這件事無關——發傳單的人不是抗議的人，也不是警察。搶這家店，議員一毛錢都不會少。」", ok: true },
    ];
    function crowdPanel(msg) {
      const crowd = { name: "圍著精品店的人群", color: "#8a5a3a", face: "群" };
      api.dlg("精品店前", crowd, msg || "人群把精品店圍得水洩不通。有人拿著球棒，有人拿著那張收據的傳單。有人在喊：「議員買得起，我們就拿得起！」", SAY.map((s) => `<button type="button" class="ghost dlg-ask" data-act="bhSay" data-s="${s.id}">${esc(s.t)}</button>`).join(""));
    }
    function say(id) {
      const s = SAY.find((x) => x.id === id);
      if (!s.ok) return crowdPanel(s.r);
      api.dlg("精品店前", { name: "圍著精品店的人群", color: "#8a5a3a", face: "群" }, "……人群安靜了下來。有人低頭看了看手上的傳單，把它摺起來放進口袋。「……那我們去議會門口。」「對，去議會門口。」", `<button type="button" class="primary" data-close>繼續</button>`);
      K.adv("BH03278-02", "大部分的人往議會的方向走了。可是有一個人沒有走……");
    }

    // ===== 更新：瓦斯、搬箱子 =====
    function update(dt) {
      for (const g of gas) {
        g.x += g.vx * dt; g.y += g.vy * dt;
        if (g.x < 500 || g.x > 2200) g.vx *= -1;
        if (g.y < 650 || g.y > 1600) g.vy *= -1;
      }
      if (cough > 0) cough -= dt;
      const inGas = gas.some((g) => dist(me.x, me.y, g.x, g.y) < g.r);
      if (inGas) {
        if (Q1.carry) { Q1.carry = false; save(); api.renderHud(); toast("咳——咳咳！箱子掉了，被路過的志工撿回補給車……再搬一次，記得繞開白煙"); }
        if (cough < 2) cough = 2.5;
        if (Date.now() > coughMsg) { coughMsg = Date.now() + 6000; api.bark?.("gas"); toast("催淚瓦斯！眼睛好痛……（走路變慢）"); }
      }
      if (Q1.carry && dist(me.x, me.y, MAP.tent.x, MAP.tent.y) < 140) {
        Q1.carry = false; Q1.n++; save(); api.renderHud();
        api.fx.push({ k: "ring", x: MAP.tent.x, y: MAP.tent.y, r: 80, color: "#c84a4a", t: performance.now(), dur: 700 });
        if (Q1.n >= 3) K.adv("BH03278-01", "三箱都送到了。回去找瑪蓮");
        else toast(`送到一箱醫療物資（${Q1.n} / 3）`);
      }
    }
    const speedMul = () => (cough > 0 ? 0.6 : 1) * (Q1.carry ? 0.75 : 1);

    // ===== 點擊 =====
    function click(p) {
      if (K.hit(p, MAP.truck, 90)) { K.reach(MAP.truck, 130, takeCrate); return true; }
      if (K.hit(p, MAP.crowd, 120) && K.is("BH03278-02", "bhTruth")) { K.reach(MAP.crowd, 160, () => crowdPanel()); return true; }
      const c = MAP.coughers.find((x) => K.hit(p, x, 50));
      if (c && K.is("BH03278-03", "bhRinse")) { K.reach(c, 90, () => rinse(c)); return true; }
      return false;
    }
    function takeCrate() {
      if (!K.is("BH03278-01", "bhCrate")) return toast("補給車上堆著紗布和生理食鹽水，車身寫著「醫療用，請勿搶奪」");
      if (Q1.carry) return toast("一次只扛得動一箱");
      Q1.carry = true; save(); api.renderHud();
      toast("扛起一箱醫療物資。走得比較慢，繞開白色的煙");
    }
    function rinse(c) {
      if (Q3.done[c.id]) return toast(`${c.name}眨了眨眼睛，對你點點頭`);
      Q3.done[c.id] = true; save(); api.renderHud();
      api.fx.push({ k: "ring", x: c.x, y: c.y, r: 50, color: "#8ad8ff", t: performance.now(), dur: 600 });
      const n = Object.keys(Q3.done).length;
      const LINES = { c1: "謝謝……我們剛剛還在喊口號，現在連話都說不出來。", c2: "……謝謝。我才剛畢業，第一天上班就遇到這個。", c3: "我只是來送便當的！便當還在車上……", c4: "我送了四十年的信。稅單我送過最多。……謝謝你。", c5: "盾牌擋不住煙。……別跟別人說我哭了，是瓦斯。" };
      api.dlg("沖眼睛", { name: c.name, color: c.col, face: c.name[0] }, LINES[c.id], `<button type="button" class="primary" data-close>好</button>`, `${c.side}（${n} / 5）`);
      if (n >= 5) K.adv("BH03278-03", "五個人都沖好眼睛了。回去找荷莉");
    }
    function act(a, b) {
      if (a === "bhAsk") { ask(b.dataset.n); return true; }
      if (a === "bhSay") { say(b.dataset.s); return true; }
      return false;
    }

    // ===== 畫面 =====
    const person = (x, y, col, now, k = 0, ch = "民") => K.human(x, y, col, ch, now, { s: 22, k });
    function drawFloor(now, x0, y0) {
      ctx.fillStyle = "#cfc6b4"; ctx.fillRect(x0, y0, 1280, 720);
      // 石板
      ctx.strokeStyle = "rgba(90,80,60,.15)"; ctx.lineWidth = 2;
      for (let x = Math.floor(x0 / 120) * 120; x < x0 + 1280; x += 120) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + 720); ctx.stroke(); }
      for (let y = Math.floor(y0 / 120) * 120; y < y0 + 720; y += 120) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + 1280, y); ctx.stroke(); }
      // 廣場中央的噴水池
      ctx.fillStyle = "#9ab8c8"; ctx.beginPath(); ctx.arc(1400, 1150, 90, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#8a8070"; ctx.lineWidth = 10; ctx.stroke();
      // 精品店
      const S = MAP.shop0; ctx.fillStyle = "#2a2a30"; ctx.fillRect(S.x, S.y, S.w, S.h);
      ctx.fillStyle = "#e8d8a0"; ctx.fillRect(S.x + 40, S.y + S.h - 90, S.w - 80, 70);
      ctx.fillStyle = "#c8a84a"; ctx.fillRect(S.x, S.y, S.w, 50); text("BOUTIQUE", S.x + S.w / 2, S.y + 28, "#2a2a30", 20, 900);
      // 舞台
      const T = MAP.stage; ctx.fillStyle = "#8a4a3a"; ctx.fillRect(T.x, T.y, T.w, T.h); ctx.fillStyle = "#f2e6c8"; ctx.fillRect(T.x + 20, T.y + 20, T.w - 40, 40);
      text("降稅！公開外交花費！", T.x + T.w / 2, T.y + 42, "#8a2a1a", 14, 900);
      // 封鎖線
      for (const b of MAP.barricades) { ctx.fillStyle = "#3a4a6a"; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.fillStyle = "#f2c200"; for (let y = b.y; y < b.y + b.h; y += 40) ctx.fillRect(b.x, y, b.w, 14); }
      for (let i = 0; i < 12; i++) person(2420 + (i % 2) * 40, 340 + i * 90, "#3a4a7a", now, i, "警");
      text("警察的封鎖線", 2440, 270, "#3a4a7a", 13, 900);
      // 醫療站
      const tn = MAP.tent; ctx.fillStyle = "#f4f0ea"; ctx.beginPath(); ctx.moveTo(tn.x - 110, tn.y + 40); ctx.lineTo(tn.x, tn.y - 70); ctx.lineTo(tn.x + 110, tn.y + 40); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#c84a4a"; ctx.fillRect(tn.x - 10, tn.y - 30, 20, 50); ctx.fillRect(tn.x - 25, tn.y - 15, 50, 20);
      text("志工醫療站", tn.x, tn.y + 64, "#c84a4a", 13, 900);
      // 補給車
      const tr = MAP.truck; ctx.fillStyle = "#e8e8e8"; api.rr(tr.x - 90, tr.y - 50, 180, 90, 10); ctx.fill(); ctx.fillStyle = "#c84a4a"; ctx.fillRect(tr.x - 8, tr.y - 30, 16, 40); ctx.fillRect(tr.x - 20, tr.y - 18, 40, 16);
      ctx.fillStyle = "#2a2a30"; ctx.beginPath(); ctx.arc(tr.x - 50, tr.y + 44, 16, 0, Math.PI * 2); ctx.arc(tr.x + 50, tr.y + 44, 16, 0, Math.PI * 2); ctx.fill();
      text("補給車", tr.x, tr.y + 80, "#5a5a5a", 13, 900);
      // 舞台前的群眾、圍著店的人群
      for (let i = 0; i < 18; i++) person(200 + (i % 6) * 50, 860 + Math.floor(i / 6) * 50, ["#d8a04a", "#c86a4a", "#4a8ac8"][i % 3], now, i, "抗");
      const st2 = K.stage("BH03278-02")?.type, calmed = trip.done.includes("BH03278-02") || st2 === "boss" || st2 === "report";
      const cn = calmed ? 4 : 22;
      for (let i = 0; i < cn; i++) { const a = Math.PI * (0.05 + 0.9 * (i / cn)), rr = 210 + (i % 3) * 40; person(1400 + Math.cos(a) * rr * 1.4, 400 + Math.sin(a) * rr * 0.6, ["#5a4a3a", "#8a5a3a", "#6a6a5a"][i % 3], now, i, "眾"); }
      if (!calmed) text("「議員買得起，我們就拿得起！」", 1400, 640 + Math.sin(now / 500) * 3, "#6a2a1a", 13, 900);
    }
    function draw(now) {
      // 催淚瓦斯
      for (const g of gas) for (let i = 0; i < 5; i++) { ctx.fillStyle = "rgba(245,245,240,.35)"; ctx.beginPath(); ctx.arc(g.x + Math.cos(i * 1.3 + now / 1500) * g.r * 0.35, g.y + Math.sin(i * 1.7 + now / 1700) * g.r * 0.25, g.r * 0.6, 0, Math.PI * 2); ctx.fill(); }
      // 咳嗽的人
      for (const c of MAP.coughers) {
        const ok = Q3.done[c.id] || trip.done.includes("BH03278-03");
        K.human(c.x, c.y, c.col, c.ch, now, { s: 28, k: c.x }); text(c.name, c.x, c.y - 30, "#3a2a1a", 11, 700);
        if (!ok && K.active("BH03278-03")) { text("咳咳…", c.x + 40, c.y + 4 - Math.abs(Math.sin(now / 200)) * 4, "#6a6a6a", 11, 900); if (K.is("BH03278-03", "bhRinse")) api.marker(c.x, c.y - 56, now, "#f2c200"); }
      }
      if (Q1.carry) { ctx.fillStyle = "#e8e0d0"; ctx.strokeStyle = "#8a6a3a"; ctx.lineWidth = 3; api.rr(me.x - 18, me.y - 70, 36, 26, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#c84a4a"; ctx.fillRect(me.x - 3, me.y - 66, 6, 18); ctx.fillRect(me.x - 9, me.y - 60, 18, 6); }
      if (K.is("BH03278-01", "bhCrate")) api.marker(Q1.carry ? MAP.tent.x : MAP.truck.x, (Q1.carry ? MAP.tent.y : MAP.truck.y) - 100, now, "#f2c200");
      if (K.is("BH03278-02", "bhTruth")) api.marker(MAP.crowd.x, MAP.crowd.y - 60, now, "#f2c200");
      if (K.is("BH03278-02", "bhAsk")) for (const id of Object.keys(TESTIMONY)) if (!Q2.asked[id]) { const n = MAP.npcs.find((x) => x.id === id); api.marker(n.x, n.y - 70, now, "#f2c200"); }
      if (cough > 0) text("咳咳！", me.x + 24, me.y - 50, "#8a8a8a", 13, 900);
    }
    function stageText(id, st) {
      if (st?.type === "bhCrate") return `${st.text}（${Q1.n} / 3）${Q1.carry ? "・扛著一箱" : ""}`;
      if (st?.type === "bhAsk") return `${st.text}（${Object.keys(Q2.asked).length} / 3）`;
      if (st?.type === "bhRinse") return `${st.text}（${Object.keys(Q3.done).length} / 5）`;
      return null;
    }
    function mini(dot, now) {
      const bl = `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`;
      for (const g of gas) dot(g.x, g.y, 5, "rgba(255,255,255,.8)");
      if (K.is("BH03278-01", "bhCrate")) { dot(MAP.truck.x, MAP.truck.y, 4, bl); dot(MAP.tent.x, MAP.tent.y, 4, bl); }
      if (K.is("BH03278-02", "bhTruth")) dot(MAP.crowd.x, MAP.crowd.y, 5, bl);
      if (K.is("BH03278-03", "bhRinse")) for (const c of MAP.coughers) if (!Q3.done[c.id]) dot(c.x, c.y, 4, bl);
    }
    function drawEnemy(e, now, red) { return K.enemyArt(e, now, red, { looters: ["looter", 2], looters3: ["looter", 3] }); }
    return { update, click, act, npcExtra, draw, drawFloor, drawEnemy, stageText, mini, speedMul };
  };
})();
