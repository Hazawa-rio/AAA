/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/mm22330.js": "20261113040753" });
// #MM22330 或許是魔法森林
//   黑暗：沒有菇光的地方只看得到身邊一小圈（行囊裡有「發光的蘑菇傘」會亮一點）
//   紫色孢子：走進飄著紫色孢子的地方（或採到紫色孢子）會很想睡，走路變慢
//   MM22330-01 不再發光的菇群：拔掉三團寄生菇 → 打寄生菇王 → 北邊的菇群重新亮起來
//   MM22330-02 孢子雨季：收集七種顏色的孢子（紫色最後才出現）
//   MM22330-03 蘑菇屋的灰斑：刷掉四間蘑菇屋的灰斑 → 趕走鼴鼠洞的鼴鼠群
(function () {
  const R = (window.RPG = window.RPG || {});
  R.WorldHooks = R.WorldHooks || {};

  R.WorldHooks.MM22330 = function (api) {
    const { MAP, trip, run, me, BAG, toast, text, save, dist } = api;
    const K = R.BKit(api), ctx = api.ctx();
    const Q1 = K.q("MM22330-01"), Q2 = K.q("MM22330-02"), Q3 = K.q("MM22330-03");
    Q1.pulled = Q1.pulled || {}; Q2.got = Q2.got || {}; Q3.spots = Q3.spots || {};
    const northLit = () => trip.done.includes("MM22330-01") || K.stage("MM22330-01")?.type === "report";
    let sleepy = 0, sleepMsg = 0;
    const SPOTS = 2;                                             // 每間屋子的灰斑數
    const rain = Array.from({ length: 90 }, (_, i) => ({ x: (i * 977) % MAP.w, y: (i * 613) % MAP.h, s: 18 + (i % 5) * 7, col: MAP.spores[i % 7].col, ph: i }));
    const dark = document.createElement("canvas");

    // ===== 更新 =====
    function update(dt) {
      if (sleepy > 0) sleepy -= dt;
      const inCloud = MAP.sleepyClouds.some((c) => dist(me.x, me.y, c.x, c.y) < c.r);
      if (inCloud) { if (sleepy < 4) sleepy = 4; if (Date.now() > sleepMsg) { sleepMsg = Date.now() + 8000; toast("吸到紫色的孢子了……好想睡……（走路變慢）"); } }
      // 孢子雨季：走過去碰到就收進樣本瓶
      if (K.is("MM22330-02", "mmSpore")) for (const s of MAP.spores) {
        if (Q2.got[s.id] || (s.sleepy && !sixDone())) continue;
        if (dist(me.x, me.y, s.x, s.y) < 56) {
          Q2.got[s.id] = true; save(); api.renderHud();
          api.fx.push({ k: "ring", x: s.x, y: s.y, r: 50, color: s.col, t: performance.now(), dur: 700 });
          const n = Object.keys(Q2.got).length;
          if (s.sleepy) { sleepy = 14; toast("採到紫色的孢子了……眼皮好重……"); }
          if (n >= 7) K.adv("MM22330-02", "七種顏色都收集到了！回去找蒂娜");
          else if (!s.sleepy) toast(`採到${s.name}色的孢子（${n} / 7）${n === 6 ? "——礦道中間飄起了紫色的光" : ""}`);
        }
      }
    }
    const sixDone = () => MAP.spores.filter((s) => !s.sleepy && Q2.got[s.id]).length >= 6;
    const speedMul = () => (sleepy > 0 ? 0.55 : 1);

    // ===== 點擊 =====
    function click(p) {
      const g = MAP.growths.find((x) => K.hit(p, x, 60));
      if (g) { K.reach(g, 100, () => pull(g)); return true; }
      const h = MAP.houses.find((x) => K.hit(p, { x: x.x, y: x.y - 40 }, 80));
      if (h) { K.reach(h, 120, () => scrub(h)); return true; }
      return false;
    }
    function pull(g) {
      if (!K.is("MM22330-01", "mmCut")) return toast(Q1.pulled[g.id] ? "這裡的寄生菇已經拔掉了" : "一團紫色的東西長在發光菇的根上，一跳一跳的");
      if (Q1.pulled[g.id]) return toast("這團已經拔掉了");
      Q1.pulled[g.id] = true; save(); api.renderHud();
      api.sfx?.("sounds/vivilla-spore.mp3");
      api.fx.push({ k: "ring", x: g.x, y: g.y, r: 70, color: "#c04aff", t: performance.now(), dur: 700 });
      const n = Object.keys(Q1.pulled).length;
      if (n >= 3) K.adv("MM22330-01", "三團寄生菇都拔掉了……最深處傳來一陣低沉的蠕動聲");
      else toast(`拔掉了一團寄生菇。根上的光，一點一點流回發光菇裡（${n} / 3）`);
    }
    function scrub(h) {
      if (!K.is("MM22330-03", "mmHouse")) return api.dlg("蘑菇屋", { name: "蘑菇屋", color: h.col, face: "屋" }, Q3.spots[h.id] >= SPOTS || trip.done.includes("MM22330-03") ? "（屋子伸了個懶腰，門好像變大了一點。）" : "（一間會呼吸的蘑菇屋。傘蓋上有幾塊灰色的斑點。）");
      const k = Q3.spots[h.id] || 0;
      if (k >= SPOTS) return toast("這間已經刷乾淨了。屋子在發出很小聲的呼嚕聲");
      Q3.spots[h.id] = k + 1; save(); api.renderHud();
      api.fx.push({ k: "ring", x: h.x, y: h.y - 50, r: 50, color: "#ffffff", t: performance.now(), dur: 500 });
      const n = MAP.houses.filter((x) => (Q3.spots[x.id] || 0) >= SPOTS).length;
      if (n >= MAP.houses.length) K.adv("MM22330-03", "四間蘑菇屋都乾淨了。去村子東邊的鼴鼠洞，把鼴鼠群趕走");
      else toast(k + 1 >= SPOTS ? `刷乾淨了！屋子抖了一下——好像很癢（${n} / 4）` : "刷掉了一塊灰斑。輕一點，屋子會癢");
    }

    // ===== 畫面 =====
    function shroom(x, y, s, col, glow = true, now = 0) {
      ctx.fillStyle = "#e8e0d0"; ctx.fillRect(x - s * 0.18, y - s * 0.6, s * 0.36, s * 0.6);
      if (glow) { ctx.fillStyle = col + "55"; ctx.beginPath(); ctx.arc(x, y - s * 0.7, s * (1.1 + Math.sin(now / 700 + x) * 0.05), 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = glow ? col : "#4a4a52"; ctx.beginPath(); ctx.ellipse(x, y - s * 0.65, s * 0.7, s * 0.4, 0, Math.PI, 0); ctx.fill();
    }
    function drawFloor(now, x0, y0) {
      ctx.fillStyle = "#2a2430"; ctx.fillRect(x0, y0, 1280, 720);
      // 土的紋路
      ctx.fillStyle = "rgba(255,255,255,.035)";
      for (let i = 0; i < 160; i++) { const x = (i * 997) % MAP.w, y = (i * 571) % MAP.h; ctx.beginPath(); ctx.ellipse(x, y, 40, 14, 0, 0, Math.PI * 2); ctx.fill(); }
      // 精靈村的地面
      const V = MAP.village; ctx.fillStyle = "#3a3448"; api.rr(V.x, V.y, V.w, V.h, 60); ctx.fill();
      text("精靈的蘑菇屋村", V.x + 150, V.y + 30, "#c8b8e8", 15, 900);
      text("最深處的菇群", 1350, 110, "#8a7aa8", 15, 900);
      // 岩柱
      for (const r of MAP.rocks) { ctx.fillStyle = "#4a4250"; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#5a5262"; ctx.beginPath(); ctx.arc(r.x - r.r * 0.25, r.y - r.r * 0.25, r.r * 0.6, 0, Math.PI * 2); ctx.fill(); }
      // 菇群
      for (const L of MAP.lights) {
        const on = !L.north || northLit();
        for (let i = 0; i < 6; i++) shroom(L.x + Math.cos(i * 1.7) * L.r * 0.35, L.y + Math.sin(i * 2.3) * L.r * 0.2 + 20, 26 + (i % 3) * 10, L.col, on, now);
      }
      // 寄生菇
      for (const g of MAP.growths) {
        if (Q1.pulled[g.id] || trip.done.includes("MM22330-01")) continue;
        const p = 1 + Math.sin(now / 200 + g.x) * 0.1;
        ctx.fillStyle = "#7a2aa8"; ctx.beginPath(); ctx.arc(g.x, g.y, 26 * p, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#c04aff"; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(g.x + Math.cos(i * 1.3) * 22, g.y + Math.sin(i * 1.3) * 16, 7, 0, Math.PI * 2); ctx.fill(); }
      }
      // 蘑菇屋
      for (const h of MAP.houses) {
        ctx.fillStyle = "#efe4cc"; api.rr(h.x - 34, h.y - 70, 68, 70, 14); ctx.fill();
        ctx.fillStyle = "#7a5a3a"; api.rr(h.x - 12, h.y - 38, 24, 38, 10); ctx.fill();
        ctx.fillStyle = "#ffe8a0"; ctx.beginPath(); ctx.arc(h.x + 20, h.y - 50, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = h.col; ctx.beginPath(); ctx.ellipse(h.x, h.y - 74, 70, 46, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = "#ffffff"; for (const [dx, dy] of [[-30, -92], [12, -104], [34, -84]]) { ctx.beginPath(); ctx.arc(h.x + dx, h.y + dy, 7, 0, Math.PI * 2); ctx.fill(); }
        // 灰斑（委託期間）
        const st3 = K.stage("MM22330-03")?.type, left = st3 === "talk" || st3 === "mmHouse" ? SPOTS - (Q3.spots[h.id] || 0) : 0;
        ctx.fillStyle = "rgba(110,110,120,.9)"; for (let i = 0; i < left; i++) { ctx.beginPath(); ctx.arc(h.x - 24 + i * 40, h.y - 82 + (i % 2) * 10, 11, 0, Math.PI * 2); ctx.fill(); }
      }
      // 鼴鼠洞
      const b = MAP.burrow; ctx.fillStyle = "#1a1418"; ctx.beginPath(); ctx.ellipse(b.x, b.y, 60, 30, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#5a4a3a"; ctx.lineWidth = 6; ctx.stroke();
      text("鼴鼠洞", b.x, b.y + 50, "#a89a88", 12, 900);
      // 紫色孢子雲
      for (const c of MAP.sleepyClouds) { ctx.fillStyle = "rgba(192,74,255,.16)"; ctx.beginPath(); ctx.arc(c.x, c.y, c.r + Math.sin(now / 900 + c.x) * 8, 0, Math.PI * 2); ctx.fill(); }
    }
    function draw(now) {
      // 孢子雨
      for (const r of rain) {
        const y = (r.y + now / 1000 * r.s) % MAP.h, x = r.x + Math.sin(now / 1500 + r.ph) * 20;
        ctx.fillStyle = r.col; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      }
      // 孢子樣本
      if (K.is("MM22330-02", "mmSpore")) for (const s of MAP.spores) {
        if (Q2.got[s.id] || (s.sleepy && !sixDone())) continue;
        const p = 1 + Math.sin(now / 300 + s.x) * 0.15;
        ctx.fillStyle = s.col + "66"; ctx.beginPath(); ctx.arc(s.x, s.y, 34 * p, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = s.col; ctx.beginPath(); ctx.arc(s.x, s.y, 14, 0, Math.PI * 2); ctx.fill();
        text(`${s.name}色的孢子`, s.x, s.y - 46, "#f4eefc", 12, 900);
      }
      if (K.is("MM22330-01", "mmCut")) for (const g of MAP.growths) if (!Q1.pulled[g.id]) api.marker(g.x, g.y - 60, now, "#f2c200");
      if (K.is("MM22330-03", "mmHouse")) for (const h of MAP.houses) if ((Q3.spots[h.id] || 0) < SPOTS) api.marker(h.x, h.y - 140, now, "#f2c200");
      if (sleepy > 0) text("Zzz", me.x + 22, me.y - 52 - Math.sin(now / 400) * 4, "#c8a0ff", 14, 900);
    }
    // 黑暗：菇光和自己身邊以外都是暗的
    function drawTop(now) {
      const m = ctx.getTransform(), cw = ctx.canvas.width, ch = ctx.canvas.height;
      if (dark.width !== cw || dark.height !== ch) { dark.width = cw; dark.height = ch; }
      const d = dark.getContext("2d");
      d.globalCompositeOperation = "source-over"; d.clearRect(0, 0, cw, ch);
      d.fillStyle = "rgba(6,4,12,.93)"; d.fillRect(0, 0, cw, ch);
      d.globalCompositeOperation = "destination-out";
      const hole = (x, y, r) => {
        const sx = m.a * x + m.e, sy = m.d * y + m.f, sr = r * m.a;
        if (sx < -sr || sy < -sr || sx > cw + sr || sy > ch + sr) return;
        const g = d.createRadialGradient(sx, sy, sr * 0.35, sx, sy, sr);
        g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
        d.fillStyle = g; d.beginPath(); d.arc(sx, sy, sr, 0, Math.PI * 2); d.fill();
      };
      hole(me.x, me.y, BAG.count(run.items, "glowCap") ? 300 : 210);
      for (const L of MAP.lights) if (!L.north || northLit()) hole(L.x, L.y, L.r * (1 + Math.sin(now / 900 + L.x) * 0.04));
      if (K.is("MM22330-02", "mmSpore")) for (const s of MAP.spores) if (!Q2.got[s.id] && (!s.sleepy || sixDone())) hole(s.x, s.y, 70);
      for (const g of MAP.growths) if (!Q1.pulled[g.id] && !trip.done.includes("MM22330-01")) hole(g.x, g.y, 50);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(dark, 0, 0);
      if (sleepy > 0) { ctx.fillStyle = `rgba(120,60,180,${Math.min(0.25, sleepy * 0.03)})`; ctx.fillRect(0, 0, cw, ch); }
      ctx.restore();
    }
    function stageText(id, st) {
      if (st?.type === "mmCut") return `${st.text}（${Object.keys(Q1.pulled).length} / 3）`;
      if (st?.type === "mmSpore") return `${st.text}（${Object.keys(Q2.got).length} / 7）`;
      if (st?.type === "mmHouse") return `${st.text}（${MAP.houses.filter((x) => (Q3.spots[x.id] || 0) >= SPOTS).length} / 4）`;
      return null;
    }
    function mini(dot, now) {
      const bl = `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`;
      if (K.is("MM22330-01", "mmCut")) for (const g of MAP.growths) if (!Q1.pulled[g.id]) dot(g.x, g.y, 4, bl);
      if (K.is("MM22330-02", "mmSpore")) for (const s of MAP.spores) if (!Q2.got[s.id] && (!s.sleepy || sixDone())) dot(s.x, s.y, 4, s.col);
      if (K.is("MM22330-03", "mmHouse")) for (const h of MAP.houses) if ((Q3.spots[h.id] || 0) < SPOTS) dot(h.x, h.y, 4, bl);
    }
    function drawEnemy(e, now, red) {
      // 被寄生的鼴鼠：身後飄著孢子
      for (let i = 0; i < 4; i++) { const k = ((now / 1200) + i / 4) % 1; ctx.fillStyle = `rgba(160,160,170,${0.5 * (1 - k)})`; ctx.beginPath(); ctx.arc(e.x - 20 + i * 12, e.y - 20 - k * 40, 6 + k * 8, 0, Math.PI * 2); ctx.fill(); }
      return K.enemyArt(e, now, red, { moles: ["sporeMole", 2], moles3: ["sporeMole", 3] });
    }
    return { update, click, draw, drawTop, drawFloor, drawEnemy, stageText, mini, speedMul, _sleepy: () => sleepy };
  };
})();
