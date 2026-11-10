/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/hw01031.js": "20261110175453" });
// #HW01031 永遠萬聖節旅館：1F 和後院墓園的繪圖、換場景、樓梯間的幽靈扮演者
(function () {
  const R = (window.RPG = window.RPG || {});
  R.WorldHooks = R.WorldHooks || {};

  const GHOST_CHANCE = 0.4;      // 經過樓梯時跳出幽靈扮演者的機率
  const GHOST_CD = 20000;        // 跳出來之後至少隔多久才會再跳（毫秒）

  R.WorldHooks.HW01031 = function (api) {
    const { MAP, run, me, toast, inRect, text, rr } = api;
    const ctx = api.ctx();
    const YARD = !!MAP.yard;
    const stairsZone = YARD ? null : { x: 920, y: MAP.stairs.y, w: 150, h: MAP.stairs.h };
    let wasIn = stairsZone ? inRect(stairsZone, me.x, me.y) : false;

    function update() {
      if (YARD) {
        if (me.y > MAP.backDoor.y - 12 && me.x > MAP.backDoor.x && me.x < MAP.backDoor.x + MAP.backDoor.w) api.changeScene(null, R.MAPS.HW01031.fromYard, "回到旅館");
        return;
      }
      if (me.y < MAP.door.y + MAP.door.h + 22 && me.x > MAP.door.x && me.x < MAP.door.x + MAP.door.w) { api.changeScene("yard", R.MAPS["HW01031/yard"].arrive, "後院墓園"); return; }
      // 經過樓梯：可能有幽靈扮演者跳出來嚇人
      const inS = inRect(stairsZone, me.x, me.y);
      if (inS && !wasIn && !run.scared && Date.now() > (run.cd.ghost || 0) && Date.now() > (run.grace || 0) && Math.random() < GHOST_CHANCE * (api.lucky?.() ? 0.5 : 1)) {
        run.cd.ghost = Date.now() + GHOST_CD;
        api.save();
        api.ambushBattle(Math.random() < 0.35 ? "ghostPair" : "ghostActor");
      }
      wasIn = inS;
    }
    function click(p) {
      if (YARD) {
        if (inRect(MAP.backDoor, p.x, p.y)) { api.goTo({ x: p.x, y: MAP.backDoor.y + 20 }, null); return true; }
        const g = MAP.graves.find((r) => inRect({ x: r.x - 10, y: r.y - 30, w: r.w + 20, h: r.h + 40 }, p.x, p.y));
        if (g) { toast(g.zzz ? "墳墓裡傳來打呼聲。喪屍住戶睡得正熟" : "墓碑上寫著：「這裡不提供喪屍套房，請自備墳墓」"); return true; }
        return false;
      }
      if (inRect(MAP.door, p.x, p.y)) { api.goTo({ x: p.x, y: MAP.door.y + MAP.door.h + 10 }, null); return true; }
      if (inRect({ x: MAP.stairs.x - 20, y: MAP.stairs.y, w: MAP.stairs.w + 40, h: MAP.stairs.h }, p.x, p.y)) { toast("通往 2F 的樓梯。2F 還在準備中"); return true; }
      return false;
    }

    // ===== 繪圖 =====
    function wall(r) { ctx.strokeStyle = "#2a1424"; ctx.lineWidth = 12; ctx.strokeRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12); }
    function pumpkin(x, y, s, now) {
      ctx.fillStyle = "#e8781e"; ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#a84e10"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, s * 0.4, s * 0.8, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#4a7a2a"; ctx.fillRect(x - 3, y - s * 0.8 - 8, 6, 9);
      ctx.fillStyle = `rgba(255,${200 + 40 * Math.sin(now / 160 + x)},80,.95)`;
      ctx.beginPath(); ctx.moveTo(x - s * 0.5, y - s * 0.15); ctx.lineTo(x - s * 0.25, y - s * 0.4); ctx.lineTo(x - s * 0.1, y - s * 0.15); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + s * 0.5, y - s * 0.15); ctx.lineTo(x + s * 0.25, y - s * 0.4); ctx.lineTo(x + s * 0.1, y - s * 0.15); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - s * 0.5, y + s * 0.2); ctx.lineTo(x + s * 0.5, y + s * 0.2); ctx.lineTo(x, y + s * 0.45); ctx.fill();
    }
    function web(x, y, s, flipX, flipY) {
      ctx.save(); ctx.translate(x, y); ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      ctx.strokeStyle = "rgba(230,225,240,.45)"; ctx.lineWidth = 1.5;
      for (let i = 0; i <= 4; i++) { const a = (i / 4) * Math.PI / 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s); ctx.stroke(); }
      for (let k = 1; k <= 3; k++) { ctx.beginPath(); for (let i = 0; i <= 4; i++) { const a = (i / 4) * Math.PI / 2, rr2 = (s * k) / 3.3; i ? ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2) : ctx.moveTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } ctx.stroke(); }
      ctx.restore();
    }
    function drawHotel(now, x0, y0) {
      ctx.fillStyle = "#2a1424"; ctx.fillRect(x0, y0, 1280, 720);
      const RM = MAP.rooms;
      for (const r of Object.values(RM)) wall(r);
      // 地板
      for (const k of ["lobby", "back", "hall", "corridor", "link"]) {
        const r = RM[k];
        ctx.fillStyle = k === "back" ? "#8a7488" : "#c4b0c0"; ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = "rgba(0,0,0,.18)"; ctx.lineWidth = 1;
        for (let y = r.y + 40; y < r.y + r.h; y += 40) { ctx.beginPath(); ctx.moveTo(r.x, y); ctx.lineTo(r.x + r.w, y); ctx.stroke(); }
      }
      const rs = RM.restaurant;
      for (let y = rs.y; y < rs.y + rs.h; y += 60) for (let x = rs.x; x < rs.x + rs.w; x += 60) { ctx.fillStyle = ((x - rs.x) / 60 + (y - rs.y) / 60) % 2 ? "#a898a8" : "#ece4d8"; ctx.fillRect(x, y, Math.min(60, rs.x + rs.w - x), Math.min(60, rs.y + rs.h - y)); }
      // 紫色地毯
      const cp = MAP.carpet;
      ctx.fillStyle = "#6b3f8f"; ctx.fillRect(cp.x, cp.y, cp.w, cp.h);
      ctx.strokeStyle = "#9a6ac0"; ctx.lineWidth = 6;
      ctx.save(); ctx.beginPath(); ctx.rect(cp.x, cp.y, cp.w, cp.h); ctx.clip();
      for (let x = cp.x - cp.h; x < cp.x + cp.w; x += 40) { ctx.beginPath(); ctx.moveTo(x, cp.y + cp.h); ctx.lineTo(x + cp.h, cp.y); ctx.stroke(); }
      ctx.restore();
      ctx.strokeStyle = "#d9a441"; ctx.lineWidth = 4; ctx.strokeRect(cp.x, cp.y, cp.w, cp.h);
      // 櫃台、鑰匙櫃
      const ct = MAP.counter;
      ctx.fillStyle = "#c8742a"; ctx.fillRect(ct.x, ct.y, ct.w, ct.h); ctx.fillStyle = "#e8a050"; ctx.fillRect(ct.x, ct.y, ct.w, 8);
      const cb = MAP.cabinet;
      ctx.fillStyle = "#151015"; ctx.fillRect(cb.x, cb.y, cb.w, cb.h);
      ctx.fillStyle = "#d9a441"; for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) ctx.fillRect(cb.x + 20 + i * 30, cb.y + 22 + j * 38, 8, 14);
      // 餐桌、椅子、自助餐台
      for (const t of MAP.tables) { ctx.fillStyle = "#e8c23a"; ctx.fillRect(t.x, t.y, t.w, t.h); ctx.strokeStyle = "#a8861a"; ctx.lineWidth = 4; ctx.strokeRect(t.x, t.y, t.w, t.h); ctx.fillStyle = "#fff6e0"; ctx.beginPath(); ctx.arc(t.x + t.w / 2, t.y + t.h / 2, 16, 0, Math.PI * 2); ctx.fill(); }
      for (const c of MAP.chairs) { ctx.fillStyle = "#f2d45a"; ctx.fillRect(c.x, c.y, c.w, c.h); ctx.strokeStyle = "#a8861a"; ctx.lineWidth = 3; ctx.strokeRect(c.x, c.y, c.w, c.h); }
      const food = ["#c0392b", "#7a3fb0", "#3a9a4a", "#e8781e"];
      MAP.buffet.forEach((b, i) => {
        ctx.fillStyle = "#b8b8c0"; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.strokeStyle = "#6a6a74"; ctx.lineWidth = 4; ctx.strokeRect(b.x, b.y, b.w, b.h);
        for (let k = 0; k < 3; k++) { ctx.fillStyle = food[(i + k) % 4]; ctx.beginPath(); ctx.ellipse(b.x + b.w / 2, b.y + 28 + k * ((b.h - 50) / 2), b.w * 0.3, 12, 0, 0, Math.PI * 2); ctx.fill(); }
      });
      // 往後院的門、上 2F 的樓梯（藍）
      const d = MAP.door;
      ctx.fillStyle = "#2a6fae"; ctx.fillRect(d.x, d.y, d.w, d.h); ctx.strokeStyle = "#5ab4f0"; ctx.lineWidth = 5; ctx.strokeRect(d.x, d.y, d.w, d.h);
      ctx.strokeStyle = "#173a5a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(d.x + d.w / 2, d.y); ctx.lineTo(d.x + d.w / 2, d.y + d.h); ctx.stroke();
      text("後院墓園", d.x + d.w / 2, d.y - 16, "#9fd4ff", 13, 900);
      const s = MAP.stairs;
      ctx.fillStyle = "#2a6fae"; ctx.fillRect(s.x, s.y, s.w, s.h); ctx.strokeStyle = "#5ab4f0"; ctx.lineWidth = 4; ctx.strokeRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = "#173a5a"; ctx.lineWidth = 3; for (let y = s.y + 28; y < s.y + s.h; y += 28) { ctx.beginPath(); ctx.moveTo(s.x, y); ctx.lineTo(s.x + s.w, y); ctx.stroke(); }
      text("2F", s.x + s.w / 2, s.y - 16, "#9fd4ff", 13, 900);
      // 裝飾：南瓜燈、蜘蛛網
      for (const [x, y, z] of [[120, 1160, 20], [700, 1160, 20], [120, 1820, 18], [960, 1440, 16], [2440, 1820, 18], [1560, 640, 18]]) pumpkin(x, y, z, now);
      web(RM.corridor.x, RM.corridor.y, 90, false, false); web(RM.restaurant.x + RM.restaurant.w, RM.restaurant.y, 110, true, false); web(RM.lobby.x, RM.lobby.y + RM.lobby.h, 80, false, true);
      // 骼骼的拖把痕
      ctx.strokeStyle = "rgba(200,40,60,.5)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(1470, 1440); for (let i = 1; i <= 8; i++) ctx.lineTo(1470 + i * 26, 1440 + Math.sin(i * 1.4) * 14); ctx.stroke();
    }
    function drawYard(now, x0, y0) {
      ctx.fillStyle = "#151d18"; ctx.fillRect(x0, y0, 1280, 720);
      const w = MAP.walk[0];
      ctx.fillStyle = "#2f3f33"; ctx.fillRect(w.x, w.y, w.w, w.h);
      let seed = 3; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
      ctx.strokeStyle = "rgba(120,150,110,.35)"; ctx.lineWidth = 1.5;
      for (let i = 0; i < 500; i++) { const x = w.x + rnd() * w.w, y = w.y + rnd() * w.h; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2, y - 7); ctx.stroke(); }
      // 鐵欄杆
      ctx.strokeStyle = "#0e0e12"; ctx.lineWidth = 5; ctx.strokeRect(w.x, w.y, w.w, w.h);
      for (let x = w.x; x <= w.x + w.w; x += 40) { ctx.beginPath(); ctx.moveTo(x, w.y); ctx.lineTo(x, w.y - 26); ctx.stroke(); }
      // 霧
      for (let i = 0; i < 6; i++) { const fx = ((now / 60 + i * 420) % (w.w + 600)) - 300; ctx.fillStyle = "rgba(200,210,230,.06)"; ctx.beginPath(); ctx.ellipse(w.x + fx, w.y + 200 + i * 200, 260, 60, 0, 0, Math.PI * 2); ctx.fill(); }
      // 墓碑、土堆
      MAP.graves.forEach((g, i) => {
        g.zzz = i % 4 === 1;
        ctx.fillStyle = "#3a2a20"; ctx.beginPath(); ctx.ellipse(g.x + g.w / 2, g.y + g.h + 30, g.w * 0.6, 26, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#8a8a92"; rr(g.x, g.y - 20, g.w, g.h + 20, 26); ctx.fill(); ctx.strokeStyle = "#4a4a52"; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = "#5a5a62"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(g.x + g.w / 2, g.y - 6); ctx.lineTo(g.x + g.w / 2, g.y + 22); ctx.moveTo(g.x + g.w / 2 - 12, g.y + 4); ctx.lineTo(g.x + g.w / 2 + 12, g.y + 4); ctx.stroke();
        if (g.zzz) { const k = (now / 1400 + i) % 1; text("z", g.x + g.w + 10 + k * 18, g.y - 10 - k * 30, `rgba(200,220,255,${1 - k})`, 14 + k * 8, 900); }
      });
      // 樹
      for (const t of MAP.trees) { ctx.fillStyle = "#1a1418"; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#2a2024"; ctx.lineWidth = 6; for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.x + Math.cos(a) * t.r * 1.5, t.y + Math.sin(a) * t.r * 1.5); ctx.stroke(); } }
      // 回旅館的門
      const d = MAP.backDoor;
      ctx.fillStyle = "#2a6fae"; ctx.fillRect(d.x, d.y, d.w, d.h); ctx.strokeStyle = "#5ab4f0"; ctx.lineWidth = 5; ctx.strokeRect(d.x, d.y, d.w, d.h);
      text("回旅館", d.x + d.w / 2, d.y - 16, "#9fd4ff", 13, 900);
      for (const [x, y] of [[700, 1300], [1700, 1300]]) pumpkin(x, y, 18, now);
    }
    return {
      update, click,
      drawFloor: YARD ? drawYard : drawHotel,
      drawTop() {
        // 樓梯間有點陰森（提示可能會有東西跳出來）
        if (!YARD) { ctx.fillStyle = "rgba(60,0,80,.10)"; ctx.fillRect(stairsZone.x - 70, stairsZone.y, stairsZone.w + 70, stairsZone.h); }
      },
    };
  };
})();
