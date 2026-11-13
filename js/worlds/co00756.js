/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/co00756.js": "20261113212359" });
// #CO00756 雲端上的海洋
//   海＝天空的藍色：在海裡移動沒有水的阻力（速度照常），但其他都像水：停下來會慢慢浮上去、要換氣（氧氣用完會一直掉血）
//   換氣：浮到海面（港口）或游進空氣雲。這裡的魚怎樣都抓不到（打下去會從指縫溜走）
//   CO00756-01 海底的破洞：到中層的雲床捏三團雲 → 潛到最底層，把雲捏進破洞
//   CO00756-02 天空捕手：剪斷三根插在深海雲層的吸雲管 → 上捕手的船打頭目
//   CO00756-03 抓不到，只拍得到：帶潛水相機拍三種稀有魚（靠太近牠們會逃；停下來、手不晃才拍得清楚）
(function () {
  const R = (window.RPG = window.RPG || {});
  R.WorldHooks = R.WorldHooks || {};

  R.WorldHooks.CO00756 = function (api) {
    const { MAP, trip, run, me, BAG, toast, text, save, dist, esc } = api;
    const K = R.BKit(api), ctx = api.ctx();
    const S = (trip.qdata.sea = trip.qdata.sea || { o2: 100 });
    const SURF = MAP.surf, FLOOR = MAP.floorY;
    const under = () => me.y > SURF;
    const Q1 = K.q("CO00756-01"), Q2 = K.q("CO00756-02"), Q3 = K.q("CO00756-03");
    Q1.clouds = Q1.clouds || 0; Q1.beds = Q1.beds || {}; Q2.cut = Q2.cut || {}; Q3.shots = Q3.shots || {};
    let still = 0, lastX = me.x, lastY = me.y, hurtT = 0, warned = false, fishMsg = 0;
    const flashes = [];

    // ===== 魚群（抓不到）和稀有魚 =====
    const schools = [];
    for (let i = 0; i < 9; i++) schools.push({ cx: 300 + ((i * 613) % 2200), cy: 700 + ((i * 397) % 1600), rx: 220 + (i % 3) * 80, ry: 60 + (i % 4) * 30, sp: 0.2 + (i % 4) * 0.07, n: 5 + (i % 4), col: ["#ffffff", "#ffe6f0", "#e6f6ff", "#fff6d8"][i % 4], ph: i });
    const fishPos = (s, k, now) => { const a = now / 1000 * s.sp + s.ph + k * 0.18; return { x: s.cx + Math.cos(a) * s.rx + Math.sin(k * 2.1) * 14, y: s.cy + Math.sin(a * 2) * s.ry + Math.cos(k * 1.7) * 10, a: a + Math.PI / 2 }; };
    const rares = MAP.rare.map((r, i) => ({ ...r, x: 500 + i * 800, y: (r.y0 + r.y1) / 2, hx: 500 + i * 800, vx: 0, vy: 0, flee: 0, ph: i * 2 }));

    // ===== 換氣 =====
    function updateAir(dt) {
      const moved = dist(me.x, me.y, lastX, lastY);
      still = api.moving() || (moved > 0.5 && !under()) ? 0 : still + dt;      // 浮力造成的飄動不算手晃 lastX = me.x; lastY = me.y;
      if (!under()) { S.o2 = Math.min(100, S.o2 + 30 * dt); warned = false; return; }
      // 浮力：停下來就慢慢浮上去
      if (!api.moving() && !api.isBusy() && me.y > SURF + 10) me.y -= 16 * dt;
      const air = MAP.airs.find((a) => dist(me.x, me.y, a.x, a.y) < 90);
      if (air) { S.o2 = Math.min(100, S.o2 + 25 * dt); return; }
      const depth = (me.y - SURF) / (FLOOR - SURF);
      S.o2 = Math.max(0, S.o2 - (1.4 + depth * 1.4) * dt);
      if (S.o2 < 25 && !warned) { warned = true; toast("氧氣快用完了——浮到海面，或游進空氣雲換氣"); }
      if (S.o2 <= 0) {
        hurtT += dt;
        if (hurtT >= 1) {
          hurtT = 0;
          const n = Math.min(Math.round(api.maxHp() * 0.05), Math.max(0, run.hp - 1));
          if (n > 0) { run.hp -= n; save(); api.renderHud(); api.fx.push({ k: "num", x: me.x, y: me.y - 40, text: `-${n}`, color: "#e53935", t: performance.now(), dur: 900 }); }
        }
      }
    }
    function updateRares(dt, now) {
      for (const f of rares) {
        const d = dist(me.x, me.y, f.x, f.y);
        if (d < 170 && f.flee <= 0 && K.is("CO00756-03", "coPhoto")) { f.flee = 1.2; const a = Math.atan2(f.y - me.y, f.x - me.x); f.vx = Math.cos(a) * 280; f.vy = Math.sin(a) * 200; }
        if (f.flee > 0) { f.flee -= dt; f.x += f.vx * dt; f.y += f.vy * dt; }
        else { f.x += (f.hx + Math.sin(now / 2600 + f.ph) * 380 - f.x) * dt * 0.6; f.y += ((f.y0 + f.y1) / 2 + Math.sin(now / 1700 + f.ph) * (f.y1 - f.y0) * 0.4 - f.y) * dt * 0.6; }
        f.x = Math.max(80, Math.min(MAP.w - 80, f.x)); f.y = Math.max(f.y0 - 60, Math.min(f.y1 + 60, f.y));
      }
    }
    function update(dt, now) { updateAir(dt); updateRares(dt, now); }

    // ===== 點擊 =====
    function click(p) {
      // 稀有魚：拍照
      if (K.is("CO00756-03", "coPhoto")) {
        const f = rares.find((x) => dist(p.x, p.y, x.x, x.y) < x.size + 30);
        if (f) { photo(f); return true; }
      }
      // 雲床：捏一團雲
      const bed = MAP.beds.find((b) => dist(p.x, p.y, b.x, b.y) < 80);
      if (bed) { K.reach(bed, 110, () => knead(bed)); return true; }
      // 破洞：補
      if (dist(p.x, p.y, MAP.hole.x, MAP.hole.y) < 90 && K.stage("CO00756-01")?.type !== "escort") { K.reach(MAP.hole, 120, patch); return true; }      // 委託進行到「護送」時，讓地圖的委託地點接手
      // 吸雲管：剪斷
      const h = MAP.hoses.find((x) => dist(p.x, p.y, x.x, x.y - 60) < 70);
      if (h) { K.reach({ x: h.x, y: h.y - 40 }, 100, () => cut(h)); return true; }
      return false;
    }
    function knead(bed) {
      if (!K.is("CO00756-01", "coCloud")) return api.dlg("深海的雲床", { name: "雲床", color: "#4a9ad8", face: "雲" }, "一大片 Q 彈的雲。手按下去，它就照你的手形凹下去，過一會兒才慢慢彈回來。", "");
      if (Q1.beds[bed.id]) return toast("這片雲床已經捏過了，換一片吧");
      Q1.beds[bed.id] = true; Q1.clouds++; save(); api.renderHud?.();
      api.fx.push({ k: "ring", x: bed.x, y: bed.y, r: 60, color: "#ffffff", t: performance.now(), dur: 700 });
      if (Q1.clouds >= 3) K.adv("CO00756-01", "捏好三團雲了。潛到最底層的破洞——把雲團送進去（小心氧氣）");
      else toast(`捏了一團雲（${Q1.clouds} / 3）`);
    }
    function patch() {
      if (!K.is("CO00756-01", "coPatch")) return toast(K.active("CO00756-01") ? "先去中層的雲床捏三團雲" : "最底層的雲朵被啃出了一個洞，可以看到底下灰灰的世界");
      Q1.patched = (Q1.patched || 0) + 1; save(); api.renderHud?.();
      api.fx.push({ k: "ring", x: MAP.hole.x, y: MAP.hole.y, r: 70 + Q1.patched * 10, color: "#e8f4ff", t: performance.now(), dur: 700 });
      if (Q1.patched >= 3) K.adv("CO00756-01", "破洞補好了！雲朵慢慢長在一起，底下的天空亮了起來");
      else toast(`把一團雲捏進破洞（${Q1.patched} / 3）`);
    }
    function cut(h) {
      if (!K.is("CO00756-02", "coHose")) return toast("一根粗粗的管子插在雲層裡，嗡嗡地吸著深海的雲");
      if (Q2.cut[h.id]) return toast("這根已經剪斷了");
      Q2.cut[h.id] = true; save(); api.renderHud?.();
      api.fx.push({ k: "ring", x: h.x, y: h.y - 60, r: 50, color: "#e53935", t: performance.now(), dur: 600 });
      const n = Object.keys(Q2.cut).length;
      if (n >= 3) K.adv("CO00756-02", "三根吸雲管都剪斷了！捕手的船在港口東邊的海面上");
      else toast(`剪斷了一根吸雲管（${n} / 3）——管子裡的雲噴了出來，慢慢落回雲層`);
    }
    function photo(f) {
      if (!BAG.count(run.items, "divingCamera")) return toast("沒有相機……");
      if (Q3.shots[f.id]) return toast(`${f.name}已經拍過了`);
      const d = dist(me.x, me.y, f.x, f.y);
      if (d > 380) return toast("太遠了，拍不清楚——再靠近一點（但不要靠太近，牠會逃）");
      if (still < 0.6 || api.moving()) return toast("手在晃，照片糊掉了——停下來再拍");
      if (f.flee > 0) return toast("牠在逃，拍到的只有一條尾巴");
      Q3.shots[f.id] = true; save(); api.renderHud?.();
      flashes.push({ x: f.x, y: f.y, t: performance.now() });
      api.sfx?.("sounds/guan-chime.mp3");
      const n = Object.keys(Q3.shots).length;
      if (n >= 3) K.adv("CO00756-03", `拍到${f.name}了！三種稀有魚都拍到了，回去給小澄看`);
      else toast(`喀嚓！拍到${f.name}了（${n} / 3）`);
    }
    // 魚抓不到：普攻打到魚群＝從指縫溜走
    function basicHit(test) {
      if (Date.now() < fishMsg) return;
      const now = performance.now();
      for (const s of schools) for (let k = 0; k < s.n; k++) { const q = fishPos(s, k, now); if (test(q.x, q.y, 10)) { fishMsg = Date.now() + 3000; toast("魚從指縫間溜走了。這片海的魚，什麼手段都抓不到"); return; } }
    }

    // ===== 畫面 =====
    function drawFloor(now, x0, y0) {
      ctx.fillStyle = "#cfeaff"; ctx.fillRect(x0, y0, 1280, 720);
      // 海面以上：天空和雲做的港口
      const sky = ctx.createLinearGradient(0, 0, 0, SURF); sky.addColorStop(0, "#f2f9ff"); sky.addColorStop(1, "#d8eeff");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, MAP.w, SURF);
      // 海：越深越藍
      const sea = ctx.createLinearGradient(0, SURF, 0, MAP.h); sea.addColorStop(0, "#a8d8ff"); sea.addColorStop(0.5, "#6ab4f0"); sea.addColorStop(1, "#3a86d8");
      ctx.fillStyle = sea; ctx.fillRect(0, SURF, MAP.w, MAP.h - SURF);
      // 光線
      for (let i = 0; i < 7; i++) { const x = 200 + i * 400 + Math.sin(now / 3000 + i) * 40; ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.beginPath(); ctx.moveTo(x, SURF); ctx.lineTo(x + 120, SURF); ctx.lineTo(x + 260, 1900); ctx.lineTo(x + 60, 1900); ctx.closePath(); ctx.fill(); }
      // 海面的波紋
      ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 3; ctx.beginPath();
      for (let x = 0; x <= MAP.w; x += 20) { const y = SURF + Math.sin(x / 60 + now / 500) * 5; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      // 雲做的港口
      const H = MAP.harbor;
      for (let x = H.x; x < H.x + H.w; x += 70) for (const [dy, r] of [[40, 70], [H.h - 40, 80], [H.h / 2, 90]]) { ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(x + 35, H.y + dy, r * 0.8, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#ffffff"; ctx.fillRect(H.x, H.y + 30, H.w, H.h - 60);
      text("雲朵港", H.x + 130, H.y + 40, "#8ab8d8", 16, 900);
      // 天空捕手的船
      const sh = MAP.ship;
      ctx.fillStyle = "#5a4a3a"; ctx.beginPath(); ctx.moveTo(sh.x - 120, sh.y + 120); ctx.lineTo(sh.x + 140, sh.y + 120); ctx.lineTo(sh.x + 100, sh.y + 190); ctx.lineTo(sh.x - 90, sh.y + 190); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#2a4a7a"; ctx.fillRect(sh.x - 10, sh.y - 20, 8, 140); ctx.fillStyle = "#e8e0d0"; ctx.beginPath(); ctx.moveTo(sh.x - 2, sh.y - 10); ctx.lineTo(sh.x + 90, sh.y + 70); ctx.lineTo(sh.x - 2, sh.y + 90); ctx.closePath(); ctx.fill();
      text("天空捕手的船", sh.x, sh.y + 150, "#fff", 13, 900);
      // 深海雲層
      for (let x = 0; x < MAP.w; x += 60) { ctx.fillStyle = "#f4f9ff"; ctx.beginPath(); ctx.arc(x + 30, FLOOR + 20 + Math.sin(x) * 8, 52, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#f4f9ff"; ctx.fillRect(0, FLOOR + 30, MAP.w, MAP.h - FLOOR);
      // 破洞（補好了就看不到）
      const ho = MAP.hole, fixed = trip.done.includes("CO00756-01") || (Q1.patched || 0) >= 3 || K.stage("CO00756-01")?.type === "report";
      if (!fixed) { const k = 1 - (Q1.patched || 0) / 3; ctx.fillStyle = "#6a7a8a"; ctx.beginPath(); ctx.ellipse(ho.x, ho.y, 90 * k + 10, 40 * k + 6, 0, 0, Math.PI * 2); ctx.fill(); text("破洞", ho.x, ho.y - 60, "#3a5a7a", 13, 900); }
      // 吸雲管
      const hoseOn = !trip.done.includes("CO00756-02");
      if (hoseOn) for (const h of MAP.hoses) {
        const cutDone = Q2.cut?.[h.id];
        ctx.strokeStyle = "#7a8a9a"; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(h.x, h.y);
        if (cutDone) ctx.lineTo(h.x + 10, h.y - 140); else ctx.bezierCurveTo(h.x, h.y - 700, sh.x - 100, sh.y + 900, sh.x - 40, sh.y + 180);
        ctx.stroke();
        if (!cutDone) for (let i = 0; i < 3; i++) { const k = ((now / 1500) + i / 3) % 1; ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.beginPath(); ctx.arc(h.x, h.y - k * 500, 8, 0, Math.PI * 2); ctx.fill(); }
      }
      // 雲床、空氣雲
      for (const b of MAP.beds) {
        const used = Q1.beds?.[b.id];
        for (const [dx, dy, r] of [[-40, 0, 44], [0, -16, 52], [44, 4, 42]]) { ctx.fillStyle = used ? "rgba(255,255,255,.55)" : "#ffffff"; ctx.beginPath(); ctx.arc(b.x + dx, b.y + dy + Math.sin(now / 900 + b.x) * 4, r, 0, Math.PI * 2); ctx.fill(); }
        text(used ? "捏過了" : "雲床", b.x, b.y + 50, "#4a7aa8", 12, 900);
      }
      for (const a of MAP.airs) { const p = 1 + Math.sin(now / 500 + a.x) * 0.06; ctx.strokeStyle = "rgba(255,255,255,.95)"; ctx.lineWidth = 3; ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.arc(a.x, a.y, 60 * p, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); text("空氣雲", a.x, a.y, "#4a7aa8", 12, 900); }
    }
    function drawFish(x, y, a, s, col) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-s * 0.8, 0); ctx.lineTo(-s * 1.4, -s * 0.5); ctx.lineTo(-s * 1.4, s * 0.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#1d1d1f"; ctx.beginPath(); ctx.arc(s * 0.5, -s * 0.1, Math.max(1.2, s * 0.08), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    function draw(now) {
      for (const s of schools) for (let k = 0; k < s.n; k++) { const q = fishPos(s, k, now); drawFish(q.x, q.y, Math.atan2(Math.cos(now / 1000 * s.sp * 2 + s.ph) * s.ry * 2, -Math.sin(now / 1000 * s.sp + s.ph) * s.rx) , 9, s.col); }
      if (K.active("CO00756-03")) for (const f of rares) {
        const shot = Q3.shots[f.id];
        ctx.globalAlpha = shot ? 0.5 : 1;
        drawFish(f.x, f.y, f.flee > 0 ? Math.atan2(f.vy, f.vx) : Math.cos(now / 2600 + f.ph) > 0 ? 0 : Math.PI, f.size, f.color);
        ctx.globalAlpha = 1;
        text(shot ? `${f.name}（拍到了）` : f.name, f.x, f.y - f.size - 14, "#1a3a5a", 12, 900);
        if (!shot && K.is("CO00756-03", "coPhoto")) api.marker(f.x, f.y - f.size - 30, now, "#f2c200");
      }
      for (let i = flashes.length - 1; i >= 0; i--) { const k = (now - flashes[i].t) / 600; if (k > 1) { flashes.splice(i, 1); continue; } ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - k)})`; ctx.beginPath(); ctx.arc(flashes[i].x, flashes[i].y, 40 + k * 60, 0, Math.PI * 2); ctx.fill(); }
      // 任務標記
      if (K.is("CO00756-01", "coCloud")) for (const b of MAP.beds) if (!Q1.beds[b.id]) api.marker(b.x, b.y - 70, now, "#f2c200");
      if (K.is("CO00756-01", "coPatch")) api.marker(MAP.hole.x, MAP.hole.y - 90, now, "#f2c200");
      if (K.is("CO00756-02", "coHose")) for (const h of MAP.hoses) if (!Q2.cut[h.id]) api.marker(h.x, h.y - 120, now, "#f2c200");
      // 氧氣（在海裡的時候顯示在頭上）
      if (under()) {
        // 雲做的潛水頭盔
        ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.strokeStyle = "rgba(255,255,255,.95)"; ctx.lineWidth = 2;
        for (const [dx, dy, r] of [[-14, -40, 13], [0, -46, 16], [14, -40, 13]]) { ctx.beginPath(); ctx.arc(me.x + dx, me.y + dy + Math.sin(now / 400 + dx) * 1.5, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
        const col = S.o2 < 25 ? "#e53935" : "#1aa3e8";
        K.bar(me.x, me.y - 64, 70, S.o2 / 100, col);
        text(`氧氣 ${Math.ceil(S.o2)}`, me.x, me.y - 74, col, 11, 900);
        if (Math.random() < 0.05) api.fx.push({ k: "ring", x: me.x + 8, y: me.y - 30, r: 6, color: "#ffffff", t: now, dur: 600 });
      }
    }
    function stageText(id, st) {
      if (id === "CO00756-01" && st?.type === "coCloud") return `${st.text}（${Q1.clouds} / 3）`;
      if (id === "CO00756-01" && st?.type === "coPatch") return `${st.text}（${Q1.patched || 0} / 3）`;
      if (id === "CO00756-02" && st?.type === "coHose") return `${st.text}（${Object.keys(Q2.cut).length} / 3）`;
      if (id === "CO00756-03" && st?.type === "coPhoto") return `${st.text}（${Object.keys(Q3.shots).length} / 3）`;
      return null;
    }
    function mini(dot, now) {
      const bl = `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`;
      if (K.is("CO00756-01", "coCloud")) for (const b of MAP.beds) if (!Q1.beds[b.id]) dot(b.x, b.y, 4, bl);
      if (K.is("CO00756-01", "coPatch")) dot(MAP.hole.x, MAP.hole.y, 5, bl);
      if (K.is("CO00756-02", "coHose")) for (const h of MAP.hoses) if (!Q2.cut[h.id]) dot(h.x, h.y, 4, bl);
      for (const a of MAP.airs) dot(a.x, a.y, 3, "#ffffff");
    }
    function drawEnemy(e, now, red) { return K.enemyArt(e, now, red, { catchers: ["skyCatcher", 2], catchers3: ["skyCatcher", 3] }); }
    // 聽完小澄的委託：拿到潛水相機
    function giveCamera() {
      if (K.is("CO00756-03", "coPhoto") && !BAG.count(run.items, "divingCamera")) { BAG.add(run.items, "divingCamera", 1); save(); toast("小澄把潛水相機借給你了"); }
      if (trip.done.includes("CO00756-03") && BAG.count(run.items, "divingCamera")) { BAG.remove(run.items, "divingCamera", 1); save(); }     // 委託完成：相機還給小澄
    }
    return { _rares: rares, update(dt, now) { giveCamera(); update(dt, now); }, click, draw, drawFloor, drawEnemy, stageText, mini, basicHit };
  };
})();
