/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/cd02016.js": "20261114045024" });
// #CD02016 童年時的黑市
//   CD02016-01 混進來的人：問四個新來的人兩個問題，指認臥底（真的懷念過的人記得細節；臥底只背得出年表）→ 打時代蓋世太保
//   CD02016-02 分配童年：照客人的描述，從倉庫的架上拿對的玻璃罐交給他們（一次一罐）
//   CD02016-03 缺了一位主理人：訂三條規矩 → 守住鐵門（打隊長）
(function () {
  const R = (window.RPG = window.RPG || {});
  R.WorldHooks = R.WorldHooks || {};

  R.WorldHooks.CD02016 = function (api) {
    const { MAP, trip, me, toast, text, save, esc } = api;
    const K = R.BKit(api), ctx = api.ctx();
    const Q1 = K.q("CD02016-01"), Q2 = K.q("CD02016-02"), Q3 = K.q("CD02016-03");
    Q1.heard = Q1.heard || {}; Q2.given = Q2.given || {}; Q3.rules = Q3.rules || {};
    const suspect = (id) => MAP.suspects.find((s) => s.id === id);
    const npc = (id) => MAP.npcs.find((n) => n.id === id);
    // 臥底被指認以後：跑到倉庫後門
    const placeSpy = () => { if (Q1.caught || trip.done.includes("CD02016-01")) Object.assign(npc("s3"), { x: MAP.backDoor.x - 80, y: MAP.backDoor.y - 60, name: "臥底・王先生", color: "#2a2a3a" }); };
    placeSpy();

    // ===== CD-01：找臥底 =====
    function npcExtra(n) {
      const s = suspect(n.id);
      if (!s || !K.is("CD02016-01", "cdSpy")) return "";
      return `<button type="button" class="ghost dlg-ask" data-act="cdQ" data-n="${n.id}" data-k="a1"><b>問</b>：2016 年的夏天，你在做什麼？</button>
        <button type="button" class="ghost dlg-ask" data-act="cdQ" data-n="${n.id}" data-k="a2"><b>問</b>：那年最熱的一天，你在哪裡？</button>
        <button type="button" class="ghost dlg-ask" data-act="cdAccuse" data-n="${n.id}" style="border-color:#c0392b"><b style="color:#c0392b">指認</b>：你就是臥底！</button>`;
    }
    function askQ(id, k) {
      const n = npc(id), s = suspect(id);
      Q1.heard[id + k] = true; save();
      api.dlg(n.name, n, s[k], npcExtra(n));
    }
    function accuse(id) {
      const n = npc(id), s = suspect(id);
      const heard = MAP.suspects.filter((x) => Q1.heard[x.id + "a1"] || Q1.heard[x.id + "a2"]).length;
      if (heard < 4) return api.dlg(n.name, { name: "阿凱", color: "#4a6a9a", face: "凱" }, "等等，四個人都問過了嗎？冤枉了一個真的在懷念的人，他就再也不敢來了。", `<button type="button" class="ghost" data-close>先去問問</button>`);
      if (!s.spy) {
        Q1.wrong = (Q1.wrong || 0) + 1; save();
        return api.dlg(n.name, n, "……我？我只是……我只是很想念那個夏天而已。（他的眼眶紅了。周圍的人看你的眼神變得很冷。）", `<button type="button" class="ghost" data-close>對不起……</button>`, "指認錯了。再想想：誰說的是細節，誰說的是年表？");
      }
      Q1.caught = true; save();
      api.dlg(n.name, { ...n, name: "臥底・王先生", color: "#2a2a3a" }, "……被發現了啊。你們這些人，記得的都是些沒用的小事。冰棒、棉被、公車上的歌。（他往倉庫後門跑，一邊對著袖口說話。）", `<button type="button" class="primary" data-close>追上去</button>`);
      placeSpy();
      K.adv("CD02016-01", "他往倉庫後門跑了！");
    }

    // ===== CD-02：分配童年 =====
    function jarPanel(j) {
      if (!K.is("CD02016-02", "cdJar")) return api.dlg("倉庫的架子", { name: "玻璃罐", color: j.col, face: "罐" }, `標籤：「${j.name}」。打開蓋子聞一下——${j.smell}。`);
      if (Object.values(Q2.given).includes(j.id)) return toast("這罐已經交給主人了");
      if (Q2.carry === j.id) return toast("你手上拿的就是這罐");
      Q2.carry = j.id; save(); api.renderHud();
      toast(`拿起了「${j.name}」（${j.smell}）`);
    }
    function customerPanel(c, msg) {
      const done = Q2.given[c.id];
      const j = MAP.jars.find((x) => x.id === Q2.carry);
      const opts = done ? `<button type="button" class="ghost" data-close>好</button>`
        : j ? `<button type="button" class="primary" data-act="cdGive" data-c="${c.id}">把「${esc(j.name)}」交給他</button><button type="button" class="ghost" data-close>再想想</button>`
        : `<button type="button" class="ghost" data-close>去倉庫找找</button>`;
      api.dlg("來領童年的客人", { name: c.name, color: c.col, face: c.name[0] }, msg || (done ? "（他抱著罐子，閉著眼睛，好像在聽什麼很遠的聲音。）" : c.says), opts, done ? "" : j ? "" : "手上沒有罐子。先到北邊的倉庫架上拿一罐。");
    }
    function give(c) {
      const j = MAP.jars.find((x) => x.id === Q2.carry);
      if (!j) return;
      Q2.carry = null;
      if (j.id !== c.jar) { save(); api.renderHud(); return customerPanel(c, `（他打開罐子聞了一下，愣住了。）……這不是我的童年。「${j.name}」……很好，可是不是我的。（罐子放回架上了）`); }
      Q2.given[c.id] = j.id; save(); api.renderHud();
      api.sfx?.("sounds/guan-chime.mp3");
      const n = Object.keys(Q2.given).length;
      customerPanel(c, `（他打開罐子，深深吸了一口氣。）……就是這個。${j.smell}。……謝謝你。`);
      if (n >= 4) K.adv("CD02016-02", "四罐童年都交到主人手上了。回去找小楓");
    }

    // ===== CD-03：三條規矩 =====
    const RULES = [
      { id: "r1", q: "懷念的東西，要怎麼分？", a: ["誰先來誰先拿，賣完就沒了", "照每個人自己的童年分，不搶別人的"] },
      { id: "r2", q: "抓到臥底，怎麼辦？", a: ["趕出去，以後都不准來", "請他坐下來，問他有沒有一個值得懷念的夏天"] },
      { id: "r3", q: "這個黑市，是為了什麼存在？", a: ["讓大家可以一直活在過去", "讓大家帶著過去，好好活在現在"] },
    ];
    function rulesPanel() {
      const all = RULES.every((r) => Q3.rules[r.id] != null);
      api.openPanel("主理人的三條規矩", `<p class="wx-p">桂婆婆把一塊木板和一支粉筆交給你：「規矩沒有對錯。是你訂的，大家就會照著做。」</p>
        ${RULES.map((r, i) => `<p class="wx-p"><b>第 ${i + 1} 條：${esc(r.q)}</b></p><div class="tv-row" style="flex-wrap:wrap">${r.a.map((a, k) => `<button type="button" class="${Q3.rules[r.id] === k ? "primary" : "ghost"}" data-act="cdRule" data-r="${r.id}" data-k="${k}">${esc(a)}</button>`).join("")}</div>`).join("")}
        <div class="tv-row"><button type="button" class="primary" data-act="cdRulesOk" ${all ? "" : "disabled"}>寫上木板，掛在鐵門後面</button></div>`);
    }
    const ruleText = () => RULES.map((r, i) => `${i + 1}. ${r.a[Q3.rules[r.id] ?? 1]}`);

    // ===== 點擊 =====
    function click(p) {
      const j = MAP.jars.find((x) => K.hit(p, x, 50));
      if (j) { K.reach({ x: j.x, y: j.y + 110 }, 60, () => jarPanel(j)); return true; }
      const c = MAP.customers.find((x) => K.hit(p, x, 50));
      if (c) { K.reach(c, 90, () => (K.is("CD02016-02", "cdJar") || Q2.given[c.id] ? customerPanel(c) : api.dlg("客人", { name: c.name, color: c.col, face: c.name[0] }, "我在等倉庫開門。今天，有一罐是我的。"))); return true; }
      if (K.hit(p, MAP.gate, 100) && K.is("CD02016-03", "cdRules")) { K.reach({ x: MAP.gate.x, y: MAP.gate.y - 80 }, 80, rulesPanel); return true; }
      return false;
    }
    function act(a, b) {
      if (a === "cdQ") { askQ(b.dataset.n, b.dataset.k); return true; }
      if (a === "cdAccuse") { accuse(b.dataset.n); return true; }
      if (a === "cdGive") { give(MAP.customers.find((x) => x.id === b.dataset.c)); return true; }
      if (a === "cdRule") { Q3.rules[b.dataset.r] = +b.dataset.k; save(); rulesPanel(); return true; }
      if (a === "cdRulesOk") { api.closePanel(); K.adv("CD02016-03", "規矩掛上去了。……鐵門外傳來整齊的腳步聲"); return true; }
      return false;
    }

    // ===== 畫面 =====
    function jar(x, y, col, now) {
      ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.strokeStyle = "#8a7a6a"; ctx.lineWidth = 2; api.rr(x - 16, y - 22, 32, 40, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = col; ctx.globalAlpha = 0.7 + Math.sin(now / 500 + x) * 0.2; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = "#8a6a3a"; ctx.fillRect(x - 12, y - 28, 24, 8);
    }
    function drawFloor(now, x0, y0) {
      ctx.fillStyle = "#3a3028"; ctx.fillRect(x0, y0, 1280, 720);
      ctx.fillStyle = "rgba(255,220,160,.04)"; for (let i = 0; i < 80; i++) ctx.fillRect((i * 733) % MAP.w, (i * 419) % MAP.h, 90, 4);
      // 燈串
      for (let r = 0; r < 4; r++) { const y = 620 + r * 300; for (let x = 100; x < MAP.w; x += 60) { ctx.fillStyle = ["#ffd88a", "#ff8a8a", "#8ad8ff", "#c8ff8a"][(x / 60 + r) % 4 | 0]; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(now / 400 + x + r); ctx.beginPath(); ctx.arc(x, y + Math.sin(x / 140) * 18, 5, 0, Math.PI * 2); ctx.fill(); } }
      ctx.globalAlpha = 1;
      // 倉庫：架子＋玻璃罐
      const S = MAP.shelf; ctx.fillStyle = "#6a5040"; ctx.fillRect(S.x - 20, S.y - 60, S.w + 40, 160);
      ctx.fillStyle = "#8a6a50"; ctx.fillRect(S.x, S.y, S.w, S.h);
      text("倉庫・2016 年的童年", S.x + S.w / 2, S.y - 34, "#f2e0c0", 15, 900);
      for (const j of MAP.jars) { const used = Object.values(Q2.given).includes(j.id) || Q2.carry === j.id; ctx.globalAlpha = used ? 0.3 : 1; jar(j.x, j.y, j.col, now); ctx.globalAlpha = 1; text(j.name, j.x, j.y + 34, "#f2e0c0", 10, 700); }
      // 攤位
      for (const s of MAP.stallsB) {
        ctx.fillStyle = "#5a4232"; ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = s.col; ctx.fillRect(s.x, s.y - 26, s.w, 26);
        text(s.name, s.x + s.w / 2, s.y - 12, "#2a1a10", 12, 900);
        for (let i = 0; i < 5; i++) { ctx.fillStyle = s.col; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(s.x + 30 + i * 50, s.y + 45, 12, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
      }
      // 鐵門、後門
      const g = MAP.gate; ctx.fillStyle = "#5a5a62"; ctx.fillRect(g.x - 140, g.y - 30, 280, 60);
      ctx.strokeStyle = "#3a3a42"; ctx.lineWidth = 4; for (let x = g.x - 130; x < g.x + 140; x += 24) { ctx.beginPath(); ctx.moveTo(x, g.y - 30); ctx.lineTo(x, g.y + 30); ctx.stroke(); }
      text("鐵門", g.x, g.y - 46, "#e8d8c0", 13, 900);
      if (trip.done.includes("CD02016-03") || K.stage("CD02016-03")?.type === "boss" || K.stage("CD02016-03")?.type === "report") {
        ctx.fillStyle = "#c8a878"; ctx.fillRect(g.x + 160, g.y - 150, 300, 100);
        ruleText().forEach((t, i) => text(t, g.x + 310, g.y - 126 + i * 26, "#3a2010", 11, 900));
      }
      const bd = MAP.backDoor; ctx.fillStyle = "#2a2a30"; ctx.fillRect(bd.x, bd.y - 70, 40, 140); text("後門", bd.x - 30, bd.y - 86, "#e8d8c0", 12, 900);
    }
    function draw(now) {
      for (const c of MAP.customers) {
        K.human(c.x, c.y, c.col, c.ch, now, { s: 32, k: c.x }); text(c.name, c.x, c.y - 30, "#f2e0c0", 12, 900);
        if (Q2.given[c.id]) { const j = MAP.jars.find((x) => x.id === Q2.given[c.id]); jar(c.x + 30, c.y + 6, j.col, now); }
        else if (K.is("CD02016-02", "cdJar")) api.marker(c.x, c.y - 56, now, "#f2c200");
      }
      if (Q2.carry) { const j = MAP.jars.find((x) => x.id === Q2.carry); jar(me.x, me.y - 64, j.col, now); }
      if (K.is("CD02016-01", "cdSpy")) for (const s of MAP.suspects) { const n = npc(s.id); if (!(Q1.heard[s.id + "a1"] || Q1.heard[s.id + "a2"])) api.marker(n.x, n.y - 60, now, "#f2c200"); }
      if (K.is("CD02016-03", "cdRules")) api.marker(MAP.gate.x, MAP.gate.y - 80, now, "#f2c200");
    }
    function stageText(id, st) {
      if (st?.type === "cdSpy") return `${st.text}（問過 ${MAP.suspects.filter((x) => Q1.heard[x.id + "a1"] || Q1.heard[x.id + "a2"]).length} / 4）`;
      if (st?.type === "cdJar") { const j = MAP.jars.find((x) => x.id === Q2.carry); return `${st.text}（${Object.keys(Q2.given).length} / 4）${j ? `・拿著「${j.name}」` : ""}`; }
      return null;
    }
    function mini(dot, now) {
      const bl = `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`;
      if (K.is("CD02016-02", "cdJar")) for (const c of MAP.customers) if (!Q2.given[c.id]) dot(c.x, c.y, 4, bl);
      if (K.is("CD02016-03", "cdRules")) dot(MAP.gate.x, MAP.gate.y, 5, bl);
    }
    function drawEnemy(e, now, red) { return K.enemyArt(e, now, red, { agents: ["eraAgent", 2], agents3: ["eraAgent", 3] }); }
    return { click, act, npcExtra, draw, drawFloor, drawEnemy, stageText, mini };
  };
})();
