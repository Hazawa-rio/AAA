/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/bc00003.js": "20261113212359" });
// #BC00003 黑原市：街道、大樓、天橋；委託用的飛天車
//   飛天車：停在南邊廣場的停機坪。最多坐七人，多人時要指名一位駕駛（目前一個人出發＝自己開）
//           坐上去之後可以飛過大樓、移動變快；回到停機坪才能降落
//   BC00003-01 失控的無人計程車：開飛天車追上在城市上空繞圈的計程車，並排飛一會兒 → 跳上去打導航系統
//   BC00003-02 天橋下的送貨無人機：無人機會躲開人（走近就往反方向逃，走遠又飄回天橋底下）→ 趕進便利商店門口的送貨點
(function () {
  const R = (window.RPG = window.RPG || {});
  R.WorldHooks = R.WorldHooks || {};
  const SEATS = 7;

  R.WorldHooks.BC00003 = function (api) {
    const { MAP, trip, run, me, CH, CM, toast, inRect, text, save, openPanel, closePanel, dist, esc } = api;
    let taxiSaid = false;          // 追上計程車的台詞只說一次
    const ctx = api.ctx();
    const active = (id) => trip.accepted.includes(id) && !trip.done.includes(id);
    const stageOf = (id) => (active(id) ? CM.stage(trip, id) : null);
    trip.qdata = trip.qdata || {};
    const D = (trip.qdata.city = trip.qdata.city || { car: false, driver: null, delivered: 0, taxi: 0, grip: 0 });
    const near = (p, r) => dist(me.x, me.y, p.x, p.y) < r;
    const reach = (p, r, fn) => { if (near(p, r)) fn(); else api.goTo(p, { type: "hook", reach: r - 20, fn }); };

    // ===== 飛天車 =====
    function padPanel() {
      if (D.car) {
        openPanel("飛天車・停機坪", `<p class="wx-p">停機坪的燈閃了兩下：「可以降落。」</p><div class="tv-row"><button type="button" class="primary" data-act="bcLand">降落</button></div>`);
        return;
      }
      const party = [CH];              // 目前一次只出發一位適格者；之後多人出發時，這裡會列出全部的人
      openPanel("飛天車・停機坪", `<p class="wx-p">交通局的飛天車：圓圓的車身、四具推進器、車頂寫著「黑原市交通局」。</p>
        <p class="tv-note">座位：${party.length} / ${SEATS}（最多七人）。多人時要指名一位駕駛，其他人坐在後面。</p>
        <p class="wx-p">指名駕駛：</p>
        <div class="tv-row">${party.map((c) => `<button type="button" class="primary" data-act="bcBoard" data-d="${c.id}">${esc(c.name)}${c.id === CH.id ? "（你）" : ""}</button>`).join("")}</div>`);
    }
    function board(driver) {
      closePanel(); D.car = true; D.driver = driver; save(); api.renderHud();
      toast("引擎嗡嗡地響了起來。飛天車浮了起來——現在可以飛過大樓了");
      api.bark("board");
    }
    function land() {
      closePanel(); D.car = false; D.grip = 0; save(); api.renderHud();
      me.x = MAP.pad.x; me.y = MAP.pad.y + 50;
      toast("飛天車穩穩地停回停機坪");
    }

    // ===== 失控的無人計程車 =====
    const TP = MAP.taxiPath;
    const taxi = { x: TP[0].x, y: TP[0].y, i: 1, face: 0 };
    const taxiOn = () => stageOf("BC00003-01")?.type === "bcTaxi" || stageOf("BC00003-01")?.type === "talk";
    function updateTaxi(dt) {
      const t = TP[taxi.i], d = dist(taxi.x, taxi.y, t.x, t.y), sp = 270 * dt;
      if (d <= sp) { taxi.x = t.x; taxi.y = t.y; taxi.i = (taxi.i + 1) % TP.length; }
      else { taxi.face = Math.atan2(t.y - taxi.y, t.x - taxi.x); taxi.x += Math.cos(taxi.face) * sp; taxi.y += Math.sin(taxi.face) * sp; }
      if (stageOf("BC00003-01")?.type !== "bcTaxi") return;
      if (D.car && dist(me.x, me.y, taxi.x, taxi.y) < 120) { if (!taxiSaid) { taxiSaid = true; api.bark("taxi"); } D.grip = Math.min(1.6, D.grip + dt); }
      else D.grip = Math.max(0, D.grip - dt * 0.5);
      if (D.grip >= 1.5) {
        D.grip = 0; CM.advance(trip, "BC00003-01"); save();
        toast("並排了！你打開車門，跳上了計程車——");
        const st = CM.stage(trip, "BC00003-01");
        setTimeout(() => api.questBattle({ id: "BC00003-01", st }), 700);
      }
    }

    // ===== 天橋下的送貨無人機 =====
    const U = MAP.under, Z = MAP.dropZone, AV = MAP.avenue;
    const herdOn = () => stageOf("BC00003-02")?.type === "bcHerd";
    const drones = [];
    if (active("BC00003-02")) {
      const left = 6 - D.delivered;
      for (let i = 0; i < left; i++) drones.push({ x: U.x + 20 + (i % 3) * 60, y: U.y + 40 + Math.floor(i / 3) * 90, ph: Math.random() * 6 });
    }
    function updateDrones(dt, now) {
      if (!herdOn()) return;
      for (let i = drones.length - 1; i >= 0; i--) {
        const d = drones[i], dp = dist(me.x, me.y, d.x, d.y);
        if (dp < 230) { const k = (1 - dp / 230) * 210 * dt + 40 * dt; d.x += ((d.x - me.x) / (dp || 1)) * k; d.y += ((d.y - me.y) / (dp || 1)) * k * 0.6; }
        else if (dp > 420) { const hx = U.x + U.w / 2 + Math.sin(d.ph) * 50, hy = U.y + U.h / 2 + Math.cos(d.ph) * 60, dh = dist(d.x, d.y, hx, hy); if (dh > 6) { d.x += ((hx - d.x) / dh) * 45 * dt; d.y += ((hy - d.y) / dh) * 45 * dt; } }
        d.x = Math.max(AV.x + 30, Math.min(AV.x + AV.w - 30, d.x)); d.y = Math.max(AV.y + 26, Math.min(AV.y + AV.h - 26, d.y));
        if (inRect(Z, d.x, d.y)) {
          drones.splice(i, 1); D.delivered++;
          const st = stageOf("BC00003-02"), done = st && D.delivered >= st.need;
          if (done) CM.advance(trip, "BC00003-02");
          save();
          toast(done ? "第五台！送貨點的燈全亮了。回去告訴蘇吧" : `一台無人機鑽進了送貨點，嗶嗶兩聲開始送貨（${D.delivered} / ${st?.need || 5}）`);
        }
      }
    }

    function click(p) {
      if (dist(p.x, p.y, MAP.pad.x, MAP.pad.y) < 80) { reach(MAP.pad, 140, padPanel); return true; }
      return false;
    }
    function act(a, b) {
      if (a === "bcBoard") { board(b.dataset.d); return true; }
      if (a === "bcLand") { land(); return true; }
      return false;
    }
    function update(dt, now) {
      if (taxiOn()) updateTaxi(dt);
      updateDrones(dt, now);
    }
    const fly = () => !!D.car;
    const speedMul = () => (D.car ? 1.8 : 1);
    function stageText(id, st) {
      if (!st) return null;
      if (st.type === "bcTaxi") return D.car ? `${st.text}${D.grip > 0 ? `（並排中 ${Math.round((D.grip / 1.5) * 100)}%）` : ""}` : "先到南邊廣場的停機坪，坐上飛天車";
      if (st.type === "bcHerd") return `${st.text}（${D.delivered} / ${st.need}）`;
      return null;
    }

    // ===== 繪圖 =====
    function drawFloor(now, x0, y0) {
      ctx.fillStyle = "#50545c"; ctx.fillRect(x0, y0, 1280, 720);
      // 人行道（街區的邊）
      ctx.fillStyle = "#8a8e96";
      for (const [xa, xb] of MAP.xs) for (const [ya, yb] of MAP.ys) ctx.fillRect(xa, ya, xb - xa, yb - ya);
      // 車道線、斑馬線
      ctx.fillStyle = "rgba(232,228,216,.8)";
      for (let x = 60; x < MAP.w; x += 90) ctx.fillRect(x, MAP.avenue.y + MAP.avenue.h / 2 - 4, 46, 8);
      for (const [, xb] of MAP.xs.slice(0, 3)) for (let y = MAP.avenue.y + 14; y < MAP.avenue.y + MAP.avenue.h - 10; y += 30) ctx.fillRect(xb + 20, y, 100, 14);
      // 廣場
      const P = MAP.plaza; ctx.fillStyle = "#a8a49a"; ctx.fillRect(P.x, P.y, P.w, P.h);
      ctx.strokeStyle = "rgba(0,0,0,.08)"; ctx.lineWidth = 1; for (let x = P.x; x < P.x + P.w; x += 60) { ctx.beginPath(); ctx.moveTo(x, P.y); ctx.lineTo(x, P.y + P.h); ctx.stroke(); }
      // 停機坪
      const pd = MAP.pad;
      ctx.fillStyle = "#3a3e46"; ctx.beginPath(); ctx.arc(pd.x, pd.y, 70, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#f0c800"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(pd.x, pd.y, 60, 0, Math.PI * 2); ctx.stroke();
      text("H", pd.x, pd.y + 2, "#f0c800", 40, 900); text("飛天車停機坪", pd.x, pd.y - 84, "#fff", 13, 900);
      if (!D.car) drawCar(pd.x, pd.y - 4, now, false);
      // 天橋底下的陰影
      ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.fillRect(U.x - 10, U.y, U.w + 20, U.h);
      // 送貨點
      ctx.strokeStyle = herdOn() ? `rgba(47,143,106,${0.6 + 0.4 * Math.sin(now / 250)})` : "rgba(47,143,106,.5)"; ctx.lineWidth = 5; ctx.setLineDash([14, 10]); ctx.strokeRect(Z.x, Z.y, Z.w, Z.h); ctx.setLineDash([]);
      text("送貨點", Z.x + Z.w / 2, Z.y + 18, "#2f8f6a", 14, 900);
    }
    function drawCar(x, y, now, flying) {
      const h = flying ? 26 + Math.sin(now / 200) * 4 : 0;
      ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(x, y + 26, 46, 13, 0, 0, Math.PI * 2); ctx.fill();
      const cy = y - h;
      ctx.fillStyle = "#e8e4d8"; ctx.strokeStyle = "#3a5a8a"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(x, cy, 52, 30, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#9ad0f0"; ctx.beginPath(); ctx.ellipse(x, cy - 8, 34, 16, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "#3a5a8a"; ctx.fillRect(x - 40, cy + 6, 80, 6);
      for (const [dx, dy] of [[-48, -18], [48, -18], [-48, 20], [48, 20]]) {
        ctx.fillStyle = "#3a3e46"; ctx.beginPath(); ctx.ellipse(x + dx, cy + dy, 14, 7, 0, 0, Math.PI * 2); ctx.fill();
        if (flying) { ctx.strokeStyle = "rgba(120,200,255,.7)"; ctx.lineWidth = 2; const a = now / 40 + dx; ctx.beginPath(); ctx.moveTo(x + dx - Math.cos(a) * 14, cy + dy - Math.sin(a) * 5); ctx.lineTo(x + dx + Math.cos(a) * 14, cy + dy + Math.sin(a) * 5); ctx.stroke(); }
      }
      return cy;
    }
    // 坐上飛天車：畫車（駕駛＝玩家，從窗戶看得到）
    function drawMe(now) {
      if (!D.car) return false;
      const cy = drawCar(me.x, me.y, now, true);
      ctx.fillStyle = "#fffaf0"; ctx.fillRect(me.x - 9, cy - 18, 18, 14); ctx.strokeStyle = CH.color; ctx.lineWidth = 2; ctx.strokeRect(me.x - 9, cy - 18, 18, 14);
      text(CH.letter || CH.name[0], me.x, cy - 11, CH.color, 10, 900);
      text(`駕駛：${CH.name}・1 / ${SEATS}`, me.x, cy - 46, "#fff", 11, 900);
      return true;
    }
    function drawTaxi(now) {
      if (!taxiOn() && !(stageOf("BC00003-01")?.type === "boss")) return;
      const T = stageOf("BC00003-01")?.type === "boss" ? { x: 1700, y: 1250, face: Math.sin(now / 800) } : taxi;
      if (R.EnemyArt?.tourNav) R.EnemyArt.tourNav(ctx, { r: 26, facing: T.face, alive: true, def: {} }, { x: T.x, y: T.y - 30 }, now);
      text("失控的無人計程車", T.x, T.y - 90, "#e8b81e", 12, 900);
      if (D.grip > 0) { ctx.strokeStyle = "#f0c800"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(T.x, T.y - 30, 56, -Math.PI / 2, -Math.PI / 2 + (D.grip / 1.5) * Math.PI * 2); ctx.stroke(); }
    }
    function draw(now) {
      for (const d of drones) {
        const y = d.y + Math.sin(now / 200 + d.ph) * 4;
        ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(d.x, d.y + 18, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#2f8f6a"; ctx.fillRect(d.x - 12, y - 8, 24, 16); ctx.strokeStyle = "#1a5a3a"; ctx.lineWidth = 2; ctx.strokeRect(d.x - 12, y - 8, 24, 16);
        ctx.strokeStyle = "#3a3e46"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(d.x - 20, y - 12); ctx.lineTo(d.x + 20, y - 12); ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.fillRect(d.x - 6, y - 4, 12, 7); ctx.fillStyle = "#e8262c"; ctx.fillRect(d.x - 2, y - 2, 4, 3);
        if (dist(me.x, me.y, d.x, d.y) < 230) text("！", d.x, y - 24, "#2f8f6a", 14, 900);
      }
    }
    function drawTop(now) {
      // 天橋（在玩家上面）
      const O = MAP.overpass;
      ctx.fillStyle = "rgba(160,164,172,.92)"; ctx.fillRect(O.x, O.y, O.w, O.h);
      ctx.fillStyle = "#6a6e76"; ctx.fillRect(O.x, O.y, 10, O.h); ctx.fillRect(O.x + O.w - 10, O.y, 10, O.h);
      ctx.strokeStyle = "rgba(0,0,0,.15)"; ctx.lineWidth = 2; for (let y = O.y + 20; y < O.y + O.h; y += 24) { ctx.beginPath(); ctx.moveTo(O.x + 10, y); ctx.lineTo(O.x + O.w - 10, y); ctx.stroke(); }
      text("天橋", O.x + O.w / 2, O.y - 12, "#fff", 13, 900);
      drawTaxi(now);
      // 黑原塔的塔尖（比飛天車還高）
      const tw = MAP.buildings.find((b) => b.tall);
      if (tw) { ctx.fillStyle = "rgba(58,74,90,.85)"; ctx.fillRect(tw.x + tw.w / 2 - 30, tw.y + tw.h / 2 - 120, 60, 120); ctx.fillStyle = `rgba(232,38,44,${0.5 + 0.5 * Math.sin(now / 300)})`; ctx.beginPath(); ctx.arc(tw.x + tw.w / 2, tw.y + tw.h / 2 - 124, 8, 0, Math.PI * 2); ctx.fill(); }
    }
    function drawEnemy(e, now, red) {
      if (!R.EnemyArt?.rogueDrone) return false;
      const n = e.kind === "drones3" ? 3 : 2;
      for (let i = 0; i < n; i++) R.EnemyArt.rogueDrone(ctx, { r: 14, x: e.x + i * 9, facing: 0, alive: true, def: { color: "#3a5a7a" } }, { x: e.x + (i - (n - 1) / 2) * 30, y: e.y + (i % 2) * 10 }, now);
      if (red) { ctx.strokeStyle = "#e53935"; ctx.lineWidth = 3; ctx.strokeRect(e.x - 50, e.y - 34, 100, 66); }
      text(`×${n}`, e.x + 46, e.y - 30, "#3a5a7a", 11, 900);
      return true;
    }
    function mini(dot, now) {
      const blink = `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`;
      dot(MAP.pad.x, MAP.pad.y, 4, "#f0c800");
      if (taxiOn()) dot(taxi.x, taxi.y, 4.5, blink);
      for (const d of drones) dot(d.x, d.y, 2.5, "#2f8f6a");
      if (herdOn()) dot(Z.x + Z.w / 2, Z.y + Z.h / 2, 4, blink);
    }
    return { update, click, act, draw, drawFloor, drawTop, drawEnemy, drawMe, mini, stageText, speedMul, fly, dbg: { taxi, drones, D } };
  };
})();
