/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/kt33233.js": "20261112133137" });
// #KT33233 巨人的生態盒：你非常非常小；兩隻大魔王打不了，只能跑
//   恐怖的大魔王・長戟大兜蟲（右盒）：沿路線巡邏，看到你就衝過來
//   邪惡大魔王・長頸鹿鉅鍬形蟲（左盒）：睡在糧倉上，每隔一陣子翻身睜眼；睜眼時看到你就衝過來
//   被抓到：扣 20% 生命、被丟回去（扛著的東西會掉）
//   巨大的果凍（右盒）：大到吃不完，點一下吃一口回 25% 生命；但咬的聲音會被大魔王聽到
//     （兜蟲直接衝過來；鍬形蟲被果凍的味道吵醒，守在牆洞旁邊一陣子，大顎會從洞裡伸過來）
//   KT33233-01 穿過牆上的小洞：帶圓圓到果凍罐 → 扛回西瓜蟲的家
//   KT33233-02 邪惡大魔王的午睡：趁鍬形蟲睡著，從糧倉一粒一粒搬穀子回螞蟻窩
(function () {
  const R = (window.RPG = window.RPG || {});
  R.WorldHooks = R.WorldHooks || {};

  R.WorldHooks.KT33233 = function (api) {
    const { MAP, trip, run, me, CM, BAG, toast, inRect, text, save, openPanel, dist, esc } = api;
    const ctx = api.ctx();
    const active = (id) => trip.accepted.includes(id) && !trip.done.includes(id);
    const stageOf = (id) => (active(id) ? CM.stage(trip, id) : null);
    trip.qdata = trip.qdata || {};
    const D = (trip.qdata.box = trip.qdata.box || { follow: false, pot: false, potHome: false, grain: false, grains: 0, bites: 0 });
    const near = (p, r) => dist(me.x, me.y, p.x, p.y) < r;
    const reach = (p, r, fn) => { if (near(p, r)) fn(); else api.goTo(p, { type: "hook", reach: r - 20, fn }); };
    const L = MAP.left, Rb = MAP.right, HOLE = MAP.hole;
    const inLeft = (x) => x < HOLE.x + HOLE.w / 2;
    const roundyNpc = MAP.npcs.find((n) => n.id === "roundy");
    const dropNpc = () => { const i = MAP.npcs.indexOf(roundyNpc); if (i >= 0) MAP.npcs.splice(i, 1); };
    const restoreNpc = () => { if (!MAP.npcs.includes(roundyNpc)) MAP.npcs.push(roundyNpc); };
    if (D.follow) dropNpc();
    const pal = { x: me.x - 40, y: me.y + 20 };
    let noise = 0, grace = 0;

    // ===== 兩隻大魔王 =====
    const stag = { x: MAP.stag.x, y: MAP.stag.y, face: Math.PI / 2, st: "sleep", t: Math.random() * 5, guard: 0 };
    const BP = MAP.beetle.path;
    const beetle = { x: BP[0].x, y: BP[0].y, i: 1, face: 0, st: "patrol", t: 0 };
    const kingSpeed = () => me.speed * 0.93;
    const clampBox = (k, box) => { k.x = Math.max(box.x + 60, Math.min(box.x + box.w - 60, k.x)); k.y = Math.max(box.y + 60, Math.min(box.y + box.h - 60, k.y)); };
    function moveTo(k, tx, ty, sp, dt) { const d = dist(k.x, k.y, tx, ty); if (d < 2) return true; const s = Math.min(d, sp * dt); k.face = Math.atan2(ty - k.y, tx - k.x); k.x += Math.cos(k.face) * s; k.y += Math.sin(k.face) * s; return d <= sp * dt; }
    function caught(king, who) {
      const loss = Math.round(api.maxHp() * 0.2);
      run.hp = Math.max(1, run.hp - loss);
      let lost = "";
      if (D.pot) { D.pot = false; lost = "果凍罐掉回了原地。"; }
      if (D.grain) { D.grain = false; lost = "穀子掉了。"; }
      const to = who === "stag" ? { x: 1040, y: 1480 } : { x: 1280, y: 1010 };
      me.x = to.x; me.y = to.y; me.target = null; pal.x = to.x - 40; pal.y = to.y + 20;
      grace = Date.now() + 3500; run.grace = Date.now() + 3000;
      king.st = who === "stag" ? "return" : "return";
      save(); api.renderHud();
      api.bark("kingHit", 3000);
      toast(`${who === "stag" ? "邪惡大魔王的大顎夾住了你——" : "恐怖的大魔王用角把你挑了起來——"}你被丟了出去！（生命 -${loss}）${lost}`);
    }
    function updateStag(dt) {
      const k = stag, H0 = MAP.stag.home, safe = Date.now() < grace;
      k.t += dt;
      if (k.st === "sleep" && k.t > 9) { k.st = "awake"; k.t = 0; }
      else if (k.st === "awake") { if (!safe && inLeft(me.x) && dist(k.x, k.y, me.x, me.y) < MAP.stag.vision) { k.st = "chase"; k.t = 0; toast("邪惡大魔王翻身的時候看到你了！快跑！"); api.bark("kingChase"); } else if (k.t > 3.5) { k.st = "sleep"; k.t = 0; } }
      else if (k.st === "chase") {
        if (safe || !inLeft(me.x) || k.t > 4.5 || dist(k.x, k.y, me.x, me.y) > MAP.stag.vision * 1.7) { k.st = "return"; k.t = 0; }
        else { moveTo(k, me.x, me.y, kingSpeed(), dt); clampBox(k, L); if (dist(k.x, k.y, me.x, me.y) < 78) caught(k, "stag"); }
      } else if (k.st === "return") { if (moveTo(k, H0.x, H0.y, 140, dt)) { k.st = "sleep"; k.t = 0; k.face = Math.PI / 2; } }
      else if (k.st === "guard") {
        const g = { x: HOLE.x - 120, y: HOLE.y + HOLE.h / 2 };
        moveTo(k, g.x, g.y, 200, dt); if (dist(k.x, k.y, g.x, g.y) < 4) k.face = 0;
        if (!safe && dist(me.x, me.y, HOLE.x + HOLE.w / 2, HOLE.y + HOLE.h / 2) < 140 && dist(k.x, k.y, g.x, g.y) < 30) caught(k, "stag");
        if (k.t > 10) { k.st = "return"; k.t = 0; }
      }
    }
    function updateBeetle(dt) {
      const k = beetle, safe = Date.now() < grace;
      k.t += dt;
      if (k.st === "patrol") {
        const t = BP[k.i]; if (moveTo(k, t.x, t.y, 85, dt)) k.i = (k.i + 1) % BP.length;
        if (!safe && !inLeft(me.x) && dist(k.x, k.y, me.x, me.y) < MAP.beetle.vision) { k.st = "chase"; k.t = 0; toast("恐怖的大魔王發現你了！快跑！"); api.bark("kingChase"); }
      } else if (k.st === "chase") {
        if (safe || inLeft(me.x) || k.t > 4.5) { k.st = "return"; k.t = 0; }
        else { moveTo(k, me.x, me.y, kingSpeed(), dt); clampBox(k, Rb); if (dist(k.x, k.y, me.x, me.y) < 82) caught(k, "beetle"); }
      } else if (k.st === "return") { const t = BP[k.i]; if (moveTo(k, t.x, t.y, 120, dt)) { k.st = "patrol"; k.t = 0; } }
    }

    // ===== 巨大的果凍 =====
    let lastBite = 0;
    function bite() {
      if (Date.now() - lastBite < 700) return;
      if (run.hp >= api.maxHp()) { toast("肚子已經飽了（生命是滿的）。果凍還是一樣大"); return; }
      lastBite = Date.now();
      api.heal(Math.round(api.maxHp() * 0.25), "偷吃了一口巨大的果凍");
      api.bark("jelly");
      D.bites++; noise += 1; save(); api.renderHud();
      if (noise >= 3) {
        noise = 0;
        if (Math.random() < 0.5 || stag.st === "guard") { beetle.st = "chase"; beetle.t = 0; setTimeout(() => { toast("咕嚕——恐怖的大魔王聽到咬果凍的聲音，衝過來了！"); api.bark("kingChase"); }, 900); }
        else { stag.st = "guard"; stag.t = 0; setTimeout(() => toast("左邊的盒子傳來喀啦喀啦的聲音……邪惡大魔王被果凍的味道吵醒，守在牆洞旁邊！"), 900); }
      }
    }

    // ===== 委託 =====
    function update(dt, now) {
      noise = Math.max(0, noise - dt / 6);
      // 第一次看到巨大的果凍（這輪冒險只說一次）
      if (!api.hasFlag("ktJellySee") && dist(me.x, me.y, MAP.jelly.x, MAP.jelly.y) < MAP.jelly.r + 260) { api.setFlag("ktJellySee"); api.bark("jellySee"); }
      updateStag(dt); updateBeetle(dt);
      const s1 = stageOf("KT33233-01");
      if (s1?.type === "ktEscort" && !D.follow) { D.follow = true; dropNpc(); save(); toast("圓圓一路滾著跟上來"); }
      if (D.follow) { const tx = me.x - 40, ty = me.y + 20; pal.x += (tx - pal.x) * Math.min(1, dt * 5); pal.y += (ty - pal.y) * Math.min(1, dt * 5); }
      if (s1?.type === "ktEscort" && near(MAP.pot, 130)) { CM.advance(trip, "KT33233-01"); D.pot = true; save(); toast("圓圓：「就是這個！」你把果凍罐扛了起來——好重。鑽回左邊的盒子吧"); }
      if (s1?.type === "ktPot" && !D.pot && near(MAP.pot, 100)) { D.pot = true; save(); toast("重新扛起了果凍罐"); }
      if (s1?.type === "ktPot" && D.pot && near(MAP.colony, 150)) {
        D.pot = false; D.potHome = true; D.follow = false; restoreNpc();
        const fin = CM.advance(trip, "KT33233-01"); save();
        toast(fin ? "委託完成！" : "果凍罐回家了！西瓜蟲們圍了上來。跟圓圓說一聲吧");
      }
      if (stageOf("KT33233-02")?.type === "ktGrain" && D.grain && near(MAP.antNest, 130)) {
        D.grain = false; D.grains++;
        const st = stageOf("KT33233-02"), done = D.grains >= st.need;
        if (done) CM.advance(trip, "KT33233-02");
        save(); toast(done ? "第五粒！螞蟻們歡呼了起來（很小聲）。告訴小隊長吧" : `螞蟻們接過穀子扛進窩裡（${D.grains} / ${st.need}）`);
      }
    }
    function click(p) {
      const J = MAP.jelly;
      if (dist(p.x, p.y, J.x, J.y) < J.r + 20) { reach({ x: J.x, y: J.y + J.r + 30 }, 80, bite); return true; }
      if (dist(p.x, p.y, MAP.granary.x, MAP.granary.y) < 90) {
        reach({ x: MAP.granary.x, y: MAP.granary.y + 90 }, 90, () => {
          if (stageOf("KT33233-02")?.type !== "ktGrain") { toast("一大堆穀子。每一粒都比你的頭還大"); return; }
          if (D.grain) { toast("一次只扛得動一粒"); return; }
          D.grain = true; save(); toast("扛起一粒穀子。別吵醒牠……");
        });
        return true;
      }
      return false;
    }
    const speedMul = () => (D.pot ? 0.6 : D.grain ? 0.8 : 1);
    function blocked(x, y, h) { for (const c of MAP.roundSolids) if (dist(x, y, c.x, c.y) < c.r + h * 0.8) return true; return false; }
    function stageText(id, st) {
      if (!st) return null;
      if (st.type === "ktGrain") return `${st.text}（${D.grains} / ${st.need}${D.grain ? "・扛著一粒" : ""}）`;
      if (st.type === "ktPot" && !D.pot) return "果凍罐掉了！回右邊的盒子重新扛起來";
      return null;
    }

    // ===== 繪圖 =====
    function drawFloor(now, x0, y0) {
      ctx.fillStyle = "#c8dce4"; ctx.fillRect(x0, y0, 1280, 720);
      for (const B of [L, Rb]) {
        ctx.fillStyle = "#6a4a2e"; ctx.fillRect(B.x, B.y, B.w, B.h);
        let s = B.x; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
        for (let i = 0; i < 260; i++) { ctx.fillStyle = rnd() < 0.5 ? "rgba(40,24,10,.35)" : "rgba(160,120,80,.3)"; ctx.fillRect(B.x + rnd() * B.w, B.y + rnd() * B.h, 4 + rnd() * 8, 3 + rnd() * 6); }
        for (let i = 0; i < 9; i++) {
          const x = B.x + 100 + rnd() * (B.w - 200), y = B.y + 100 + rnd() * (B.h - 200), a = rnd() * Math.PI;
          ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = rnd() < 0.5 ? "rgba(170,120,40,.6)" : "rgba(110,140,50,.55)";
          ctx.beginPath(); ctx.ellipse(0, 0, 160, 60, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "rgba(60,40,10,.4)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-160, 0); ctx.lineTo(160, 0); ctx.stroke(); ctx.restore();
        }
        ctx.strokeStyle = "rgba(220,240,250,.8)"; ctx.lineWidth = 10; ctx.strokeRect(B.x - 5, B.y - 5, B.w + 10, B.h + 10);
      }
      // 中間的玻璃牆＋小洞
      ctx.fillStyle = "rgba(200,230,240,.85)"; ctx.fillRect(L.x + L.w, 0, Rb.x - L.x - L.w, MAP.h);
      ctx.fillStyle = "#4a3420"; ctx.fillRect(HOLE.x, HOLE.y, HOLE.w, HOLE.h);
      ctx.strokeStyle = "#2a1a0a"; ctx.lineWidth = 3; ctx.strokeRect(HOLE.x + 10, HOLE.y, HOLE.w - 20, HOLE.h);
      text("牆上的小洞", HOLE.x + HOLE.w / 2, HOLE.y - 14, "#2a4a5a", 12, 900);
      // 樹枝、小石頭
      for (const t of MAP.twigs) { ctx.fillStyle = "#7a5a32"; ctx.fillRect(t.x, t.y, t.w, t.h); ctx.fillStyle = "rgba(255,255,255,.15)"; ctx.fillRect(t.x, t.y, t.w, 6); }
      for (const p of MAP.pebbles) { ctx.fillStyle = "#8a8680"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#a8a49c"; ctx.beginPath(); ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.45, 0, Math.PI * 2); ctx.fill(); }
      // 西瓜蟲的家、螞蟻窩、糧倉
      const C = MAP.colony; ctx.fillStyle = "rgba(120,140,50,.8)"; ctx.beginPath(); ctx.ellipse(C.x, C.y, 120, 60, 0, 0, Math.PI * 2); ctx.fill(); text("西瓜蟲的家", C.x, C.y - 72, "#fff", 12, 900);
      if (D.potHome || trip.done.includes("KT33233-01")) drawPot(C.x + 40, C.y - 10);
      const A = MAP.antNest; ctx.fillStyle = "#8a6a4a"; ctx.beginPath(); ctx.ellipse(A.x, A.y, 90, 46, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#2a1a0a"; ctx.beginPath(); ctx.ellipse(A.x, A.y - 6, 18, 10, 0, 0, Math.PI * 2); ctx.fill(); text("螞蟻窩", A.x, A.y - 58, "#fff", 12, 900);
      const G = MAP.granary; for (let i = 0; i < 12; i++) { ctx.fillStyle = "#e8c87a"; ctx.strokeStyle = "#a8883a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(G.x - 60 + (i % 4) * 40, G.y - 20 + Math.floor(i / 4) * 26, 18, 12, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      text("糧倉", G.x, G.y + 60, "#fff", 12, 900);
      // 巨大的果凍
      const J = MAP.jelly;
      ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(J.x + 14, J.y + J.r * 0.7, J.r * 1.1, J.r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(232,70,110,.82)"; ctx.beginPath(); ctx.ellipse(J.x, J.y, J.r, J.r * 0.82 + Math.sin(now / 400) * 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,200,215,.6)"; ctx.beginPath(); ctx.ellipse(J.x - J.r * 0.35, J.y - J.r * 0.35, J.r * 0.3, J.r * 0.18, -0.4, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < Math.min(8, D.bites); i++) { ctx.fillStyle = "rgba(255,230,235,.7)"; ctx.beginPath(); ctx.arc(J.x - 60 + i * 17, J.y + J.r * 0.62, 8, 0, Math.PI); ctx.fill(); }
      text("巨大的果凍（吃不完）", J.x, J.y - J.r - 14, "#fff", 13, 900);
      // 被搬走的果凍罐
      if (active("KT33233-01") && !D.pot && !D.potHome) drawPot(MAP.pot.x, MAP.pot.y);
    }
    function drawPot(x, y) {
      ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(x, y + 22, 26, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(232,106,138,.9)"; ctx.fillRect(x - 22, y - 20, 44, 40); ctx.fillStyle = "#e8e4d8"; ctx.fillRect(x - 25, y - 28, 50, 10);
      ctx.strokeStyle = "#8a2a4a"; ctx.lineWidth = 2; ctx.strokeRect(x - 22, y - 20, 44, 40);
    }
    function pillbug(x, y, now, rolling) {
      ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(x, y + 14, 18, 5, 0, 0, Math.PI * 2); ctx.fill();
      if (rolling) { ctx.fillStyle = "#6a7a8a"; ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#3a4a5a"; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x, y, 14, now / 120 + i * 2, now / 120 + i * 2 + 1); ctx.stroke(); } return; }
      ctx.fillStyle = "#6a7a8a"; ctx.beginPath(); ctx.ellipse(x, y, 22, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#3a4a5a"; ctx.lineWidth = 2; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 7, y - 13); ctx.lineTo(x + i * 7, y + 13); ctx.stroke(); }
    }
    function drawBeetle(k, now) {
      const s = 1;
      ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(k.face);
      ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(-10, 20, 120, 60, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#1d1208"; ctx.lineWidth = 7;
      for (const sy of [-1, 1]) for (let i = 0; i < 3; i++) { const w = Math.sin(now / 90 + i * 2) * (k.st === "chase" ? 10 : 4); ctx.beginPath(); ctx.moveTo(-40 + i * 40, sy * 30); ctx.lineTo(-50 + i * 44 + w, sy * 80); ctx.lineTo(-60 + i * 50 + w, sy * 100); ctx.stroke(); }
      ctx.fillStyle = "#b8a050"; ctx.beginPath(); ctx.ellipse(-30, 0, 90 * s, 58, 0, 0, Math.PI * 2); ctx.fill();          // 鞘翅（長戟大兜蟲是黃褐色的）
      ctx.strokeStyle = "#5a4a1a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-120, 0); ctx.lineTo(40, 0); ctx.stroke();
      for (let i = 0; i < 7; i++) { ctx.fillStyle = "rgba(40,30,10,.5)"; ctx.beginPath(); ctx.arc(-90 + i * 18, (i % 2 ? 1 : -1) * 26, 5, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#1d1208"; ctx.beginPath(); ctx.ellipse(62, 0, 36, 40, 0, 0, Math.PI * 2); ctx.fill();               // 前胸
      ctx.beginPath(); ctx.moveTo(70, -10); ctx.lineTo(250, -6); ctx.quadraticCurveTo(262, 0, 250, 6); ctx.lineTo(70, 10); ctx.closePath(); ctx.fill();   // 上面的長角
      ctx.fillStyle = "#3a2a14"; ctx.fillRect(120, -12, 6, 4); ctx.fillRect(160, -10, 6, 4);
      ctx.fillStyle = "#1d1208"; ctx.beginPath(); ctx.moveTo(92, 6); ctx.lineTo(190, 18); ctx.lineTo(184, 26); ctx.lineTo(90, 18); ctx.closePath(); ctx.fill();   // 下面的短角
      ctx.fillStyle = k.st === "chase" ? "#e8262c" : "#c8a24a"; ctx.beginPath(); ctx.arc(96, -16, 5, 0, Math.PI * 2); ctx.arc(96, 16, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (k.st === "patrol") { ctx.strokeStyle = "rgba(232,38,44,.18)"; ctx.lineWidth = 3; ctx.setLineDash([10, 10]); ctx.beginPath(); ctx.arc(k.x, k.y, MAP.beetle.vision, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      text(k.st === "chase" ? "恐怖的大魔王（衝過來了！）" : "恐怖的大魔王・長戟大兜蟲", k.x, k.y - 110, k.st === "chase" ? "#e8262c" : "#fff", 13, 900);
    }
    function drawStag(k, now) {
      const asleep = k.st === "sleep";
      ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(k.face);
      ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(-10, 20, 110, 56, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#1d1208"; ctx.lineWidth = 6;
      for (const sy of [-1, 1]) for (let i = 0; i < 3; i++) { const w = asleep ? 0 : Math.sin(now / 90 + i * 2) * (k.st === "chase" ? 10 : 3); ctx.beginPath(); ctx.moveTo(-40 + i * 36, sy * 28); ctx.lineTo(-48 + i * 40 + w, sy * 76); ctx.lineTo(-56 + i * 46 + w, sy * 96); ctx.stroke(); }
      ctx.fillStyle = "#3a2410"; ctx.beginPath(); ctx.ellipse(-36, 0, 80, 50, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#1d1208"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-116, 0); ctx.lineTo(30, 0); ctx.stroke();
      ctx.fillStyle = "#2a1a0a"; ctx.beginPath(); ctx.ellipse(48, 0, 30, 34, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(70, -18, 36, 36);
      // 很長很長的大顎（像長頸鹿的脖子），尖端往內彎，內側有鋸齒
      const open = asleep ? 0.05 : k.st === "chase" ? 0.18 + Math.abs(Math.sin(now / 120)) * 0.12 : 0.12;
      for (const sy of [-1, 1]) {
        ctx.save(); ctx.translate(100, sy * 12); ctx.rotate(sy * open);
        ctx.fillStyle = "#4a2a10"; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(190, -sy * 4 - 4); ctx.quadraticCurveTo(214, -sy * 14, 206, -sy * 26); ctx.lineTo(188, sy * 2); ctx.lineTo(0, 6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#2a1a0a"; for (let i = 1; i < 6; i++) ctx.fillRect(i * 30, -sy * 8 - 3, 6, 6);
        ctx.restore();
      }
      ctx.fillStyle = asleep ? "#1d1208" : "#e8262c"; ctx.beginPath(); ctx.arc(80, -20, 5, 0, Math.PI * 2); ctx.arc(80, 20, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (asleep) { const z = (now / 900) % 1; ctx.globalAlpha = 1 - z; text("Z", k.x + 60 + z * 30, k.y - 80 - z * 40, "#e8e4d8", 20, 900); text("z", k.x + 90 + z * 20, k.y - 110 - z * 30, "#e8e4d8", 14, 900); ctx.globalAlpha = 1; }
      if (k.st === "awake") { ctx.fillStyle = `rgba(232,38,44,${0.08 + 0.05 * Math.sin(now / 150)})`; ctx.beginPath(); ctx.arc(k.x, k.y, MAP.stag.vision, 0, Math.PI * 2); ctx.fill(); }
      const lab = asleep ? "邪惡大魔王・長頸鹿鉅鍬形蟲（睡著了）" : k.st === "awake" ? "邪惡大魔王（翻身了！別被看到）" : k.st === "guard" ? "邪惡大魔王（守在牆洞旁）" : k.st === "chase" ? "邪惡大魔王（衝過來了！）" : "邪惡大魔王";
      text(lab, k.x, k.y - 104, asleep ? "#fff" : "#e8262c", 13, 900);
    }
    function draw(now) {
      if (D.follow) pillbug(pal.x, pal.y, now, api.moving());
      if (D.pot) drawPot(me.x, me.y - 46);
      if (D.grain) { ctx.fillStyle = "#e8c87a"; ctx.strokeStyle = "#a8883a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(me.x, me.y - 40, 20, 13, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    }
    function drawTop(now) {
      drawStag(stag, now); drawBeetle(beetle, now);
      if (noise > 0.5) text("咕嚕咕嚕……".slice(0, 2 + Math.round(noise) * 2), MAP.jelly.x, MAP.jelly.y + MAP.jelly.r + 40, "#e8262c", 13, 900);
    }
    function drawEnemy(e, now, red) {
      const A = R.EnemyArt; if (!A) return false;
      if (e.kind === "spiders") { for (let i = 0; i < 2; i++) A.jumpSpider(ctx, { r: 13, facing: e.face || 0, alive: true, def: {} }, { x: e.x + (i ? 22 : -22), y: e.y + (i ? 6 : -6) }, now); }
      else if (e.kind === "aphids") { for (let i = 0; i < 3; i++) A.aphid(ctx, { r: 11, x: e.x + i * 7, facing: 0, alive: true, def: {} }, { x: e.x - 24 + i * 24, y: e.y + (i % 2) * 10 }, now); }
      else return false;
      if (red) { ctx.strokeStyle = "#e53935"; ctx.lineWidth = 3; ctx.strokeRect(e.x - 46, e.y - 30, 92, 60); }
      return true;
    }
    function mini(dot, now) {
      const blink = `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`;
      dot(stag.x, stag.y, 6, stag.st === "sleep" ? "#6a4a2a" : "#e8262c");
      dot(beetle.x, beetle.y, 6, beetle.st === "chase" ? "#e8262c" : "#b8a050");
      dot(MAP.jelly.x, MAP.jelly.y, 5, "#e8467e");
      const s1 = stageOf("KT33233-01")?.type;
      if (s1 === "ktEscort" || (s1 === "ktPot" && !D.pot)) dot(MAP.pot.x, MAP.pot.y, 4, blink);
      if (s1 === "ktPot" && D.pot) dot(MAP.colony.x, MAP.colony.y, 4, blink);
      if (stageOf("KT33233-02")?.type === "ktGrain") dot(D.grain ? MAP.antNest.x : MAP.granary.x, D.grain ? MAP.antNest.y : MAP.granary.y, 4, blink);
    }
    return { update, click, draw, drawFloor, drawTop, drawEnemy, mini, stageText, speedMul, blocked, dbg: { stag, beetle, D } };
  };
})();
