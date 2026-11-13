/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/tr00088.js": "20261114045024" });
// #TR00088 不停歇的月台：四座月台＋一節車廂
//   閘門：要感應周遊券才會開（閘門旁邊可以買一張，整趟都能用）
//   上車：在月台邊「跳上車」→ 車廂；在車廂裡點座位「小睡一會」→ 醒來就到了下一座月台（逆時針：南→東→北→西→南）
//   TR00088-01 錯過月台的旅客：老先生跟著你，睡醒到了東月台就一起下車
//   TR00088-02 第四千節車廂的市場：搬著米拉的貨（走得慢）在南月台交給葛倫
//   TR00088-03 攔截逃票客：月台上會有逃票客亂跑（跳閘門、往列車衝），碰到就算抓到；抓三個之後去車廂後面攔老大
(function () {
  const R = (window.RPG = window.RPG || {});
  R.WorldHooks = R.WorldHooks || {};
  const PASS_PRICE = 30;

  R.WorldHooks.TR00088 = function (api) {
    const { MAP, trip, run, me, CM, BAG, toast, inRect, text, save, openPanel, closePanel, dist, esc } = api;
    const ctx = api.ctx();
    const MAIN = R.MAPS.TR00088, ORDER = MAIN.order, NAMES = MAIN.names;
    const TRAIN = !!MAP.trainCar, DIR = MAP.platform || null;
    const active = (id) => trip.accepted.includes(id) && !trip.done.includes(id);
    const stageOf = (id) => (active(id) ? CM.stage(trip, id) : null);
    trip.qdata = trip.qdata || {};
    const D = (trip.qdata.rail = trip.qdata.rail || { pass: false, from: "S", follow: false, oldmanHome: false, cargo: false, caught: 0 });
    const near = (p, r) => dist(me.x, me.y, p.x, p.y) < r;
    const reach = (p, r, fn) => { if (near(p, r)) fn(); else api.goTo(p, { type: "hook", reach: r - 20, fn }); };
    const sceneOf = (d) => (d === "S" ? null : d);
    const nextOf = (d) => ORDER[(ORDER.indexOf(d) + 1) % ORDER.length];

    // 老先生：跟著你的時候，車廂裡就不再畫成 NPC；送到東月台之後，站在小梅旁邊
    const dropNpc = (id) => { const i = MAP.npcs.findIndex((n) => n.id === id); if (i >= 0) MAP.npcs.splice(i, 1); };
    if (D.follow || D.oldmanHome || trip.done.includes("TR00088-01")) dropNpc("oldman");
    // 交完貨就把箱子收走
    if (trip.done.includes("TR00088-02") && BAG.count(run.items, "miraGoods")) { BAG.remove(run.items, "miraGoods", 9); save(); }
    const pal = { x: me.x - 44, y: me.y + 10 };          // 跟在後面的老先生

    // ===== 逃票客（只在月台上；委託進行中才會出現） =====
    const dodgers = [];
    if (DIR && stageOf("TR00088-03")?.type === "trDodgers") {
      const left = stageOf("TR00088-03").need - D.caught;
      for (let i = 0; i < Math.min(2, left); i++) {
        const g = MAP.gates[(i * 2 + 1) % MAP.gates.length];
        dodgers.push({ x: g.x + 40, y: MAP.plat.y + MAP.plat.h - 60, vx: 0, vy: 0, t: Math.random() * 3, face: 0, jump: 0 });
      }
      if (dodgers.length) setTimeout(() => toast(`${MAP.platName}上有 ${dodgers.length} 個逃票客在亂跑！碰到就算抓到`), 600);
    }
    function catchDodger(d, how) {
      const i = dodgers.indexOf(d); if (i < 0) return;
      dodgers.splice(i, 1); D.caught++;
      const st = stageOf("TR00088-03"), done = st && D.caught >= st.need;
      if (done) CM.advance(trip, "TR00088-03");
      save();
      api.bark("catchDodger");
      toast(done ? `${how}第三個了！逃票客說：「老大在車廂最後面……」回車廂找他` : `${how}逃票客乖乖補了票（${D.caught} / ${st?.need || 3}）`);
    }
    // 攻擊模式的普攻打到逃票客＝攔下來
    function basicHit(test) { for (const d of [...dodgers]) if (test(d.x, d.y, 16)) catchDodger(d, "攔下來了！"); }
    function updateDodgers(dt, now) {
      const P = MAP.plat;
      for (let i = dodgers.length - 1; i >= 0; i--) {
        const d = dodgers[i], dp = dist(me.x, me.y, d.x, d.y);
        if (dp < 36) { catchDodger(d, "抓到了！"); continue; }
        // 離玩家近就逃，遠就在月台上亂晃
        d.t -= dt;
        let ax = 0, ay = 0;
        if (dp < 260) { ax = (d.x - me.x) / dp; ay = (d.y - me.y) / dp; }
        else if (d.t <= 0) { d.t = 1 + Math.random() * 2; const a = Math.random() * Math.PI * 2; d.vx = Math.cos(a); d.vy = Math.sin(a); }
        const sp = dp < 260 ? me.speed * 0.78 : 70;
        const vx = dp < 260 ? ax : d.vx, vy = dp < 260 ? ay : d.vy;
        let nx = d.x + vx * sp * dt, ny = d.y + vy * sp * dt;
        // 被逼到牆邊：沿著牆滑開（不然永遠抓不到也太難）
        nx = Math.max(P.x + 20, Math.min(P.x + P.w - 20, nx)); ny = Math.max(P.y + 20, Math.min(P.y + P.h - 20, ny));
        if (nx === d.x && ny === d.y) { nx += (Math.random() - 0.5) * 40 * dt; }
        d.face = Math.atan2(ny - d.y, nx - d.x); d.x = nx; d.y = ny;
      }
    }

    // ===== 互動 =====
    function gatePanel(g) {
      if (D.pass) { toast("嗶——周遊券。閘門開了"); return; }
      openPanel("閘門", `<p class="wx-p">閘門關著。旁邊的機器上寫著：「環狀周遊券・一趟到底都能用」。</p>
        <p class="tv-note">價格：${PASS_PRICE} 金幣（你有 ${run.gold} 金幣）</p>
        <div class="tv-row"><button type="button" class="primary" data-act="trPass" ${run.gold < PASS_PRICE ? "disabled" : ""}>買一張周遊券</button></div>
        ${run.gold < PASS_PRICE ? `<p class="tv-note">錢不夠的話，可以先從大廳的門回酒館（沒完成的委託不算失敗，之後可以再接）。</p>` : ""}`);
    }
    function boardPanel() {
      openPanel(`${MAP.platName}・月台邊`, `<p class="wx-p">列車從你面前呼嘯而過。它不會停——但車門一直開著，月台邊的人一個接一個跳上去。</p>
        ${D.follow ? `<p class="tv-note">老先生拉著你的袖子：「這次我跟緊你。」</p>` : ""}
        <div class="tv-row"><button type="button" class="primary" data-act="trBoard">跳上車</button></div>`);
    }
    function napPanel() {
      const nxt = nextOf(D.from);
      openPanel("找個位子坐下", `<p class="wx-p">座位很軟，列車晃得剛剛好。</p>
        <p class="wx-p">你從${esc(NAMES[D.from])}上車——小睡一會的話，醒來會是 <b>${esc(NAMES[nxt])}</b>。</p>
        ${D.follow ? `<p class="tv-note">老先生已經在你旁邊打呼了。</p>` : ""}${D.cargo ? `<p class="tv-note">米拉的貨放在腳邊。</p>` : ""}
        <div class="tv-row"><button type="button" class="primary" data-act="trNap">小睡一會</button></div>`);
    }
    function nap() {
      closePanel();
      const nxt = nextOf(D.from);
      let note = "";
      if (nxt === "E" && D.follow && stageOf("TR00088-01")?.type === "trEscort") { D.follow = false; D.oldmanHome = true; CM.advance(trip, "TR00088-01"); note = "（老先生醒了，跟著你一起下車）"; }
      D.from = nxt; save();
      trip.lastResult = `zzz……醒來的時候，列車正經過${NAMES[nxt]}。你跳下了車${note}`;
      api.changeScene(sceneOf(nxt), { ...MAIN.board, y: MAIN.board.y + 40 }, `zzz……${NAMES[nxt]}`);
    }
    function click(p) {
      if (TRAIN) {
        if (p.y < MAP.seatsTop.y + MAP.seatsTop.h || p.y > MAP.seatsBottom.y) {
          const seat = { x: p.x, y: p.y < 400 ? 290 : 470 };
          reach(seat, 110, napPanel);
          return true;
        }
        return false;
      }
      const g = MAP.gates.find((x) => inRect({ x: x.x - 10, y: x.y - 10, w: x.w + 20, h: x.h + 20 }, p.x, p.y));
      if (g) { reach({ x: g.x + g.w / 2, y: me.y < g.y ? g.y - 30 : g.y + g.h + 30 }, 90, () => gatePanel(g)); return true; }
      if (p.y < MAP.plat.y + 40) { reach(MAP.board, 110, boardPanel); return true; }
      return false;
    }
    function act(a) {
      if (a === "trPass") {
        if (run.gold < PASS_PRICE) return true;
        run.gold -= PASS_PRICE; D.pass = true; save(); api.renderHud(); closePanel();
        toast("買了一張環狀周遊券。閘門的燈變綠了");
        return true;
      }
      if (a === "trBoard") { closePanel(); D.from = DIR; save(); api.changeScene("train", MAP_TRAIN_ARRIVE(), "跳上車"); return true; }
      if (a === "trNap") { nap(); return true; }
      return false;
    }
    const MAP_TRAIN_ARRIVE = () => R.MAPS["TR00088/train"].arrive;
    function blocked(x, y, h) {
      if (TRAIN || D.pass) return false;
      return MAP.gates?.some((g) => x + h > g.x && x - h < g.x + g.w && y + h > g.y && y - h < g.y + g.h);
    }

    function update(dt, now) {
      // 剛跟老先生說完話：他開始跟著你
      if (stageOf("TR00088-01")?.type === "trEscort" && !D.follow) { D.follow = true; dropNpc("oldman"); save(); toast("老先生揉揉眼睛，跟在你後面"); }
      // 剛跟米拉說完話：拿到貨
      if (stageOf("TR00088-02")?.type === "trCargo" && !D.cargo) {
        if (BAG.add(run.items, "miraGoods", 1)) { D.cargo = true; save(); toast("米拉把一箱用報紙包著的貨交給你。搬著走得比較慢"); }
      }
      // 搬著貨到了南月台的大廳 → 可以交給葛倫（下一步是回報）
      if (DIR === "S" && D.cargo && stageOf("TR00088-02")?.type === "trCargo") { CM.advance(trip, "TR00088-02"); save(); toast("南月台到了！把貨交給大廳的葛倫"); }
      if (trip.done.includes("TR00088-02") && D.cargo) { D.cargo = false; BAG.remove(run.items, "miraGoods", 9); save(); }
      // 跟著的老先生
      const tx = me.x - 44, ty = me.y + 10, d = dist(pal.x, pal.y, tx, ty);
      if (d > 4) { const k = Math.min(1, (dt * 6)); pal.x += (tx - pal.x) * k; pal.y += (ty - pal.y) * k; }
      if (DIR) updateDodgers(dt, now);
    }
    function speedMul() { return D.cargo ? 0.75 : 1; }
    function stageText(id, st) {
      if (!st) return null;
      if (st.type === "trEscort") return `${st.text}（現在：${TRAIN ? `車上・從${NAMES[D.from]}上車` : NAMES[DIR]}）`;
      if (st.type === "trCargo") return `${st.text}（現在：${TRAIN ? `車上・從${NAMES[D.from]}上車` : NAMES[DIR]}）`;
      if (st.type === "trDodgers") return `${st.text}（${D.caught} / ${st.need}）`;
      return null;
    }

    // ===== 繪圖 =====
    function car(x, y, w, h, now) {
      ctx.fillStyle = "#7a5a3a"; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#5a3e24"; ctx.fillRect(x, y + h - 16, w, 16);
      ctx.fillStyle = "#9ad0f0"; for (let k = 0; k < 5; k++) ctx.fillRect(x + 30 + k * 82, y + 26, 56, 44);
      ctx.fillStyle = "#3a2410"; ctx.fillRect(x + w / 2 - 26, y + 18, 52, h - 34);
      ctx.fillStyle = "rgba(255,240,200,.6)"; ctx.fillRect(x + w / 2 - 20, y + 24, 40, h - 46);
      ctx.fillStyle = "#c8a24a"; ctx.fillRect(x, y + 8, w, 6);
    }
    function person(x, y, coat, cap, now, run2) {
      const b = run2 ? Math.abs(Math.sin(now / 90)) * 4 : 0;
      ctx.fillStyle = "rgba(0,0,0,.15)"; ctx.beginPath(); ctx.ellipse(x, y + 16, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fffaf0"; ctx.fillRect(x - 13, y - 13 - b, 26, 26); ctx.strokeStyle = coat; ctx.lineWidth = 3; ctx.strokeRect(x - 13, y - 13 - b, 26, 26);
      ctx.fillStyle = coat; ctx.fillRect(x - 13, y + 2 - b, 26, 11);
      if (cap) { ctx.fillStyle = cap; ctx.fillRect(x - 12, y - 19 - b, 24, 8); }
    }
    function drawFloor(now, x0, y0) {
      if (TRAIN) return drawCar(now, x0, y0);
      ctx.fillStyle = "#2a2a30"; ctx.fillRect(x0, y0, 1280, 720);
      // 軌道＋一直在跑的列車
      ctx.fillStyle = "#4a4038"; ctx.fillRect(0, 60, MAP.w, 250);
      ctx.fillStyle = "#6a6a70"; ctx.fillRect(0, 270, MAP.w, 8); ctx.fillRect(0, 100, MAP.w, 8);
      const o = (now / 4) % 480;
      for (let x = -480; x < MAP.w + 480; x += 480) car(x - o + 4, 120, 472, 150, now);
      // 月台
      const P = MAP.plat;
      ctx.fillStyle = "#b8b4ac"; ctx.fillRect(P.x, P.y, P.w, P.h);
      ctx.strokeStyle = "rgba(0,0,0,.08)"; ctx.lineWidth = 1; for (let x = P.x; x < P.x + P.w; x += 64) { ctx.beginPath(); ctx.moveTo(x, P.y); ctx.lineTo(x, P.y + P.h); ctx.stroke(); }
      ctx.fillStyle = "#e8c23a"; ctx.fillRect(P.x, P.y + 6, P.w, 18);
      ctx.fillStyle = "rgba(0,0,0,.15)"; for (let x = P.x + 4; x < P.x + P.w; x += 14) ctx.fillRect(x, P.y + 10, 5, 10);
      // 站名牌
      ctx.fillStyle = "#fff"; ctx.fillRect(P.x + 240, P.y + 70, 220, 60); ctx.strokeStyle = "#2a3a5a"; ctx.lineWidth = 4; ctx.strokeRect(P.x + 240, P.y + 70, 220, 60);
      text(MAP.platName, P.x + 350, P.y + 92, "#2a3a5a", 20, 900);
      text(`← ${NAMES[ORDER[(ORDER.indexOf(DIR) + 3) % 4]]}　　${NAMES[nextOf(DIR)]} →`, P.x + 350, P.y + 118, "#5a6a7a", 11, 700);
      // 自動販賣機（在月台上）
      const V = MAP.vending;
      ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.fillRect(V.x - 34, V.y + 30, 76, 14);
      ctx.fillStyle = "#c0392b"; ctx.fillRect(V.x - 38, V.y - 70, 76, 104); ctx.strokeStyle = "#6a1a10"; ctx.lineWidth = 3; ctx.strokeRect(V.x - 38, V.y - 70, 76, 104);
      ctx.fillStyle = "#e8f4fa"; ctx.fillRect(V.x - 30, V.y - 62, 60, 50);
      const cans = ["#7a4a2a", "#e8262c", "#4a8fe0", "#4caf50", "#f0c800", "#7a4a2a"];
      cans.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(V.x - 26 + (i % 3) * 19, V.y - 56 + Math.floor(i / 3) * 24, 13, 18); });
      ctx.fillStyle = "#1d1d1f"; ctx.fillRect(V.x - 24, V.y + 8, 48, 14);
      ctx.fillStyle = `rgba(255,240,170,${0.5 + 0.3 * Math.sin(now / 400)})`; ctx.fillRect(V.x + 18, V.y - 6, 8, 8);
      text("自動販賣機", V.x, V.y - 84, "#fff", 12, 900);
      // 閘門＋欄杆
      ctx.fillStyle = "#8a8e96"; for (const r of MAP.rails) ctx.fillRect(r.x, r.y, r.w, r.h);
      for (const g of MAP.gates) {
        ctx.fillStyle = "#b8bcc4"; ctx.fillRect(g.x, g.y, g.w, g.h);
        ctx.fillStyle = "#5a5e66"; ctx.fillRect(g.x - 14, g.y + 4, 14, g.h - 8); ctx.fillRect(g.x + g.w, g.y + 4, 14, g.h - 8);
        ctx.fillStyle = D.pass ? "#4caf50" : "#e53935"; ctx.fillRect(g.x - 10, g.y + 10, 6, 6);
        if (!D.pass) { ctx.fillStyle = "#e53935"; ctx.fillRect(g.x, g.y + g.h / 2 - 6, g.w / 2 - 4, 12); ctx.fillRect(g.x + g.w / 2 + 4, g.y + g.h / 2 - 6, g.w / 2 - 4, 12); }
      }
      text(D.pass ? "閘門（周遊券）" : "閘門（點一下買周遊券）", 1000, MAP.gates[0].y + MAP.gates[0].h + 18, "#fff", 12, 900);
      // 大廳
      const Hh = MAP.hall;
      ctx.fillStyle = "#d8d0c0"; ctx.fillRect(Hh.x, Hh.y, Hh.w, Hh.h);
      for (let y = Hh.y; y < Hh.y + Hh.h; y += 60) for (let x = Hh.x; x < Hh.x + Hh.w; x += 60) if (((x + y) / 60) % 2 < 1) { ctx.fillStyle = "#cec6b4"; ctx.fillRect(x, y, 60, 60); }
      // 東月台：老先生回家了，站在小梅旁邊
      if (DIR === "E" && D.oldmanHome) { person(1050, 1000, "#7a6a5a", "#5a4a3a", now); text("老先生", 1050, 970, "#3a2a1a", 11, 900); }
    }
    function drawCar(now, x0, y0) {
      ctx.fillStyle = "#3a2410"; ctx.fillRect(x0, y0, 1280, 720);
      // 窗戶：外面的風景一直往後跑
      for (let x = 80; x < MAP.w; x += 260) {
        ctx.fillStyle = "#9ad0f0"; ctx.fillRect(x, 40, 200, 100);
        ctx.save(); ctx.beginPath(); ctx.rect(x, 40, 200, 100); ctx.clip();
        ctx.fillStyle = "#6a9a5a"; ctx.fillRect(x, 110, 200, 30);
        const o = (now / 3 + x) % 160; ctx.fillStyle = "#5a4a3a"; for (let k = -1; k < 3; k++) ctx.fillRect(x + 200 - o - k * 160, 50, 6, 90);
        ctx.restore(); ctx.strokeStyle = "#1d1208"; ctx.lineWidth = 6; ctx.strokeRect(x, 40, 200, 100);
      }
      // 地板、座位
      ctx.fillStyle = "#b08a5a"; ctx.fillRect(0, 160, MAP.w, 450);
      for (let y = 250; y < 510; y += 26) { ctx.fillStyle = (y / 26) % 2 < 1 ? "#a88252" : "#b48e5e"; ctx.fillRect(0, y, MAP.w, 26); }
      for (const row of [MAP.seatsTop, MAP.seatsBottom]) for (let x = 100; x < MAP.w - 60; x += 140) {
        ctx.fillStyle = "#3a6a5a"; ctx.fillRect(x, row.y, 110, row.h); ctx.fillStyle = "#2a5a4a"; ctx.fillRect(x, row === MAP.seatsTop ? row.y : row.y + row.h - 18, 110, 18);
      }
      text("點座位：小睡一會（醒來就是下一座月台）", 300, 225, "#fff2d0", 12, 900);
      // 第四千節車廂的市場
      ctx.fillStyle = "#c8742a"; ctx.fillRect(2160, 520, 300, 70); ctx.fillStyle = "#fff"; for (let x = 2160; x < 2460; x += 30) ctx.fillRect(x, 520, 15, 16);
      text("第四千節車廂的市場", 2310, 560, "#fff", 13, 900);
      ctx.fillStyle = "#1d1208"; ctx.fillRect(0, 600, MAP.w, 160);
    }
    function draw(now) {
      if (D.follow) { person(pal.x, pal.y, "#7a6a5a", "#5a4a3a", now, api.moving()); text("老先生", pal.x, pal.y - 28, "#3a2a1a", 11, 900); }
      if (D.cargo) { ctx.fillStyle = "#8a6a3a"; ctx.fillRect(me.x - 14, me.y - 44, 28, 22); ctx.strokeStyle = "#4a3418"; ctx.lineWidth = 2; ctx.strokeRect(me.x - 14, me.y - 44, 28, 22); ctx.fillStyle = "#e8e2d0"; ctx.fillRect(me.x - 10, me.y - 40, 12, 8); }
      for (const d of dodgers) {
        if (R.EnemyArt?.dodger) R.EnemyArt.dodger(ctx, { r: 14, x: d.x, facing: d.face, alive: true, def: {} }, { x: d.x, y: d.y }, now);
        text("逃票客", d.x, d.y - 30, "#c0392b", 11, 900);
      }
    }
    function drawEnemy(e, now, red) {
      if (e.kind !== "ticketBots" || !R.EnemyArt?.ticketBot) return false;
      R.EnemyArt.ticketBot(ctx, { r: 18, x: e.x, alive: true, def: {} }, { x: e.x, y: e.y }, now);
      if (red) { ctx.strokeStyle = "#e53935"; ctx.lineWidth = 3; ctx.strokeRect(e.x - 26, e.y - 26, 52, 52); }
      text("×2", e.x + 26, e.y - 24, "#3a4a5a", 11, 900);
      return true;
    }
    function mini(dot, now) {
      const blink = `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`;
      for (const d of dodgers) dot(d.x, d.y, 3.5, "#e53935");
      if (DIR) dot(MAP.vending.x, MAP.vending.y, 3, "#c0392b");
      if (DIR && (D.follow || D.cargo || stageOf("TR00088-02")?.type === "talk" || stageOf("TR00088-01")?.type === "talk" && CM.progressOf(trip, "TR00088-01") === 1 || stageOf("TR00088-03")?.type === "talk")) dot(MAP.board.x, MAP.board.y, 4, blink);
    }
    // 沒有周遊券、錢也不夠買：可以先從大廳的門回酒館（不會被卡住）
    const retreat = () => (!D.pass && run.gold < PASS_PRICE ? `身上的錢不夠買周遊券（要 ${PASS_PRICE} 金幣）` : null);
    return { update, click, act, draw, drawFloor, drawEnemy, mini, stageText, speedMul, blocked, basicHit, retreat, dbg: { dodgers, D } };
  };
})();
