/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/enemy-art-c.js": "20261112021356" });
// C 級時空（燈塔小鎮、不停歇的月台、黑原市、巨人的生態盒）的戰鬥造型和戰鬥背景
// R.EnemyArt[kind](ctx, u, p, now)：p＝畫面上的位置；R.Terrains[terrain]：bg(g, W, H) 畫一次、draw(ctx, now, W, H) 每一格都畫
// 地圖上也會用 R.EnemyArt 畫小一點的魔物（js/worlds/*.js 的 drawEnemy）
(function () {
  const R = (window.RPG = window.RPG || {});
  const A = (R.EnemyArt = R.EnemyArt || {});
  const T = (R.Terrains = R.Terrains || {});

  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function box(ctx, x, y, w, h, fill, stroke, lw = 4, r = 6) { rr(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); } }
  function dot(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  const fx = (u) => (u.facing != null ? Math.cos(u.facing) : 0) * 0.18;
  const alive = (ctx, u) => { ctx.globalAlpha = u.alive === false ? 0.3 : 1; };

  // ===== 燈塔小鎮：熊 =====
  function bear(ctx, u, p, now, mom) {
    const r = u.r, { x } = p, y = p.y + Math.sin(now / 420 + (u.x || 0)) * 1.5, f = fx(u) * r;
    alive(ctx, u);
    const fur = mom ? "#6a3e1e" : "#8a5a32", dark = "#3a2210";
    box(ctx, x - r * 0.95, y - r * 1.05, r * 0.6, r * 0.6, fur, dark, 3, 3);                 // 方形的耳朵
    box(ctx, x + r * 0.35, y - r * 1.05, r * 0.6, r * 0.6, fur, dark, 3, 3);
    box(ctx, x - r, y - r * 0.8, r * 2, r * 1.8, fur, dark, 4, 5);
    box(ctx, x - r * 0.42 + f, y - r * 0.05, r * 0.84, r * 0.6, "#d8b48a", dark, 2.5, 4);  // 方形的口鼻
    ctx.fillStyle = dark; ctx.fillRect(x - r * 0.12 + f, y + r * 0.02, r * 0.24, r * 0.16);
    ctx.fillRect(x - r * 0.5 + f, y - r * 0.38, r * 0.16, r * 0.16); ctx.fillRect(x + r * 0.34 + f, y - r * 0.38, r * 0.16, r * 0.16);
    if (mom) {                                                                                 // 熊媽媽：脖子上的紅色圍巾、頭上的雪
      ctx.fillStyle = "#c0392b"; ctx.fillRect(x - r, y + r * 0.55, r * 2, r * 0.26); ctx.fillRect(x + r * 0.5, y + r * 0.55, r * 0.3, r * 0.6);
      ctx.fillStyle = "#fff"; ctx.fillRect(x - r * 0.7, y - r * 0.86, r * 1.4, r * 0.14);
    }
    bearPaws(ctx, u, x, y, r, now, fur, dark);
    ctx.globalAlpha = 1;
  }
  // 熊掌：平常垂在兩側；撲擊＝高高舉起一隻熊掌，再往前揮下去（留下三道爪痕）；橫掃＝兩隻熊掌繞著身體揮一圈
  function paw(ctx, px, py, ang, r, fur, dark) {
    ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
    box(ctx, -r * 0.3, -r * 0.3, r * 0.6, r * 0.6, fur, dark, 3, 4);
    ctx.fillStyle = "#e8dcc8"; for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(r * 0.28, k * r * 0.18 - r * 0.06); ctx.lineTo(r * 0.5, k * r * 0.2); ctx.lineTo(r * 0.28, k * r * 0.18 + r * 0.06); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  function clawTrail(ctx, cx, cy, rad, a0, a1, r, k) {
    ctx.strokeStyle = `rgba(255,255,255,${0.85 * (1 - k)})`; ctx.lineWidth = 3; ctx.lineCap = "round";
    for (const d of [-0.18, 0, 0.18]) { ctx.beginPath(); ctx.arc(cx, cy, rad + d * r, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke(); }
  }
  function bearPaws(ctx, u, x, y, r, now, fur, dark) {
    const a = u.facing ?? Math.PI / 2, P = u.alive === false ? null : u.pose;
    const after = P?.hit ? (now - P.hit) / 1000 : -1;
    if (P && P.k === "lunge" && after < 0.45) {
      const side = Math.cos(a) >= 0 ? 1 : -1, lift = Math.min(1, (now - P.t0) / 300);
      if (after < 0) {                                      // 舉起熊掌（微微發抖）
        paw(ctx, x - side * r * 1.05, y + r * 0.55, Math.PI / 2, r, fur, dark);
        paw(ctx, x + side * r * 1.15 + Math.sin(now / 40) * 2, y - r * (0.2 + 1.0 * lift), -Math.PI / 2 + side * 0.4, r, fur, dark);
      } else {                                              // 往前揮下去
        const k = Math.min(1, after / 0.15), start = Math.atan2(-1, side * 0.6), aa = start + (a - start) * k;
        const px = x + Math.cos(aa) * r * 1.6, py = y + Math.sin(aa) * r * 1.6;
        paw(ctx, x - side * r * 1.05, y + r * 0.55, Math.PI / 2, r, fur, dark);
        clawTrail(ctx, x, y, r * 1.6, start, aa, r, Math.max(0, (after - 0.15) / 0.3));
        paw(ctx, px, py, aa, r, fur, dark);
      }
      return;
    }
    if (P && P.k === "spin" && after < 0.55) {
      if (after < 0) {                                      // 兩隻熊掌往後拉、蓄力
        for (const s of [-1, 1]) paw(ctx, x + s * r * 1.2, y - r * 0.2 + Math.sin(now / 50) * 2, s > 0 ? -0.6 : Math.PI + 0.6, r, fur, dark);
      } else {                                              // 繞著身體揮一圈
        const k = Math.min(1, after / 0.4), base = -Math.PI / 2 + k * Math.PI * 2;
        clawTrail(ctx, x, y, r * 1.5, -Math.PI / 2, base, r, Math.max(0, (after - 0.4) / 0.15));
        for (const s of [0, Math.PI]) paw(ctx, x + Math.cos(base + s) * r * 1.5, y + Math.sin(base + s) * r * 1.5, base + s + Math.PI / 2, r, fur, dark);
      }
      return;
    }
    if (P && after >= 0.55) u.pose = null;
    for (const s of [-1, 1]) paw(ctx, x + s * r * 1.05, y + r * 0.55 + Math.sin(now / 300 + s) * 1.5, Math.PI / 2, r * 0.9, fur, dark);
  }
  A.blockBear = (ctx, u, p, now) => bear(ctx, u, p, now, false); A.blockBear.top = 34;
  A.blockBearMom = (ctx, u, p, now) => bear(ctx, u, p, now, true); A.blockBearMom.top = 52;

  // ===== 不停歇的月台：剪票機、逃票客 =====
  A.ticketBot = function (ctx, u, p, now) {
    const r = u.r, { x, y } = p;
    alive(ctx, u);
    box(ctx, x - r * 0.9, y - r, r * 1.8, r * 2, "#c8ced6", "#3a4a5a", 4, 5);
    ctx.fillStyle = "#2a3a4a"; ctx.fillRect(x - r * 0.6, y - r * 0.7, r * 1.2, r * 0.42);                 // 螢幕
    ctx.fillStyle = Math.floor(now / 500) % 2 ? "#e8262c" : "#4caf50"; ctx.fillRect(x - r * 0.5, y - r * 0.62, r * 0.3, r * 0.26);
    ctx.fillStyle = "#e8c23a"; ctx.fillRect(x + r * 0.05, y - r * 0.6, r * 0.45, r * 0.08);
    // 兩片閘門（開開關關）
    const o = (Math.sin(now / 300) * 0.5 + 0.5) * r * 0.5;
    ctx.fillStyle = "#e8262c"; ctx.fillRect(x - r * 0.9 - o, y + r * 0.1, r * 0.75, r * 0.3); ctx.fillRect(x + r * 0.15 + o, y + r * 0.1, r * 0.75, r * 0.3);
    ctx.globalAlpha = 1;
  };
  A.ticketBot.top = 20;
  function person(ctx, u, p, now, cap, coat) {
    const r = u.r, { x } = p, y = p.y + Math.abs(Math.sin(now / 160 + (u.x || 0))) * -2, f = fx(u) * r;
    alive(ctx, u);
    box(ctx, x - r, y - r, r * 2, r * 2, "#fffaf0", coat, 4, Math.max(6, r * 0.35));
    ctx.fillStyle = coat; ctx.fillRect(x - r, y + r * 0.2, r * 2, r * 0.8);                                   // 外套
    ctx.fillStyle = cap; rr(ctx, x - r * 0.9, y - r * 1.1, r * 1.8, r * 0.55, 6); ctx.fill();                   // 帽子
    ctx.fillRect(x + (f >= 0 ? 0 : -r * 1.2), y - r * 0.68, r * 1.2, r * 0.18);                               // 帽簷
    ctx.fillStyle = "#1d1d1f"; ctx.fillRect(x - r * 0.4 + f, y - r * 0.2, r * 0.18, r * 0.2); ctx.fillRect(x + r * 0.22 + f, y - r * 0.2, r * 0.18, r * 0.2);
    ctx.globalAlpha = 1;
  }
  A.dodger = (ctx, u, p, now) => person(ctx, u, p, now, "#3a3a44", "#6a6a72"); A.dodger.top = 24;
  A.dodgerBoss = function (ctx, u, p, now) {
    person(ctx, u, p, now, "#b8321e", "#3a3a44");
    // 口袋裡叮噹響的硬幣
    for (let i = 0; i < 3; i++) dot(ctx, p.x - u.r * 0.6 + i * u.r * 0.5, p.y + u.r * 0.55 + Math.sin(now / 120 + i) * 2, u.r * 0.12, "#d9a441");
  };
  A.dodgerBoss.top = 30;

  // ===== 黑原市：無人機、無人計程車 =====
  A.rogueDrone = function (ctx, u, p, now) {
    const r = u.r, { x } = p, y = p.y - 6 + Math.sin(now / 200 + (u.x || 0)) * 3;
    alive(ctx, u);
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(x, p.y + r * 0.9, r * 0.9, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#2a3a4a"; ctx.lineWidth = 4;
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx * r * 0.85, y + dy * r * 0.6); ctx.stroke();
      ctx.strokeStyle = "rgba(42,58,74,.45)"; ctx.lineWidth = 2;
      const a = now / 30 + dx; ctx.beginPath(); ctx.moveTo(x + dx * r * 0.85 - Math.cos(a) * r * 0.42, y + dy * r * 0.6 - Math.sin(a) * r * 0.12); ctx.lineTo(x + dx * r * 0.85 + Math.cos(a) * r * 0.42, y + dy * r * 0.6 + Math.sin(a) * r * 0.12); ctx.stroke();
      ctx.strokeStyle = "#2a3a4a"; ctx.lineWidth = 4;
    }
    box(ctx, x - r * 0.5, y - r * 0.36, r, r * 0.72, u.def?.color || "#3a5a7a", "#1d2a38", 3, 5);
    dot(ctx, x + fx(u) * r * 1.5, y, r * 0.16, Math.floor(now / 300) % 2 ? "#e8262c" : "#ff8a80");
    ctx.globalAlpha = 1;
  };
  A.rogueDrone.top = 18;
  A.tourNav = function (ctx, u, p, now) {
    const r = u.r, { x } = p, y = p.y - 8 + Math.sin(now / 260) * 4, flip = u.facing != null && Math.cos(u.facing) < -0.1 ? -1 : 1;
    alive(ctx, u);
    ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(x, p.y + r * 0.95, r * 1.2, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.scale(flip, 1);
    box(ctx, -r * 1.3, -r * 0.55, r * 2.6, r * 1.1, "#e8b81e", "#5a4208", 4, r * 0.3);               // 車身
    box(ctx, -r * 0.7, -r * 1.0, r * 1.5, r * 0.6, "#e8b81e", "#5a4208", 4, r * 0.2);                // 車頂
    ctx.fillStyle = "#9ad0f0"; ctx.fillRect(-r * 0.55, -r * 0.92, r * 0.55, r * 0.42); ctx.fillRect(r * 0.08, -r * 0.92, r * 0.6, r * 0.42);
    ctx.fillStyle = "#1d1d1f"; ctx.fillRect(-r * 0.4, -r * 1.18, r * 0.8, r * 0.2); ctx.fillStyle = "#fff"; ctx.font = `900 ${Math.round(r * 0.16)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("TOUR", 0, -r * 1.08);
    // 推進器（沒有輪子，浮在空中）
    for (const dx of [-0.85, 0.85]) { ctx.fillStyle = "#3a3a44"; ctx.fillRect(dx * r - r * 0.25, r * 0.5, r * 0.5, r * 0.2); ctx.fillStyle = `rgba(120,200,255,${0.5 + 0.4 * Math.sin(now / 60)})`; ctx.fillRect(dx * r - r * 0.18, r * 0.7, r * 0.36, r * 0.18); }
    // 前燈＝眼睛（導航系統很興奮）
    dot(ctx, r * 1.18, -r * 0.1, r * 0.13, "#fff8c0");
    ctx.restore();
    ctx.globalAlpha = 1;
  };
  A.tourNav.top = 48;

  // ===== 巨人的生態盒：跳蛛、蚜蟲 =====
  A.jumpSpider = function (ctx, u, p, now) {
    const r = u.r, { x, y } = p, a = u.facing ?? Math.PI / 2;
    alive(ctx, u);
    ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
      const b = a + s * (0.7 + i * 0.45), w = Math.sin(now / 90 + i) * 0.08;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(b + w) * r * 1.0, y + Math.sin(b + w) * r * 1.0); ctx.lineTo(x + Math.cos(b + w) * r * 1.5, y + Math.sin(b + w) * r * 1.5 + r * 0.3); ctx.stroke();
    }
    dot(ctx, x - Math.cos(a) * r * 0.5, y - Math.sin(a) * r * 0.5, r * 0.8, "#2a2a30");
    dot(ctx, x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2, r * 0.62, "#3a3a44");
    // 大大的前眼
    for (const s of [-1, 1]) { const ex = x + Math.cos(a) * r * 0.55 + Math.cos(a + Math.PI / 2) * s * r * 0.22, ey = y + Math.sin(a) * r * 0.55 + Math.sin(a + Math.PI / 2) * s * r * 0.22; dot(ctx, ex, ey, r * 0.2, "#1d1d1f"); dot(ctx, ex - r * 0.06, ey - r * 0.06, r * 0.07, "#fff"); }
    ctx.globalAlpha = 1;
  };
  A.jumpSpider.top = 20;
  A.aphid = function (ctx, u, p, now) {
    const r = u.r, { x } = p, y = p.y + Math.sin(now / 300 + (u.x || 0)) * 1.5, f = fx(u) * r;
    alive(ctx, u);
    ctx.fillStyle = "#6aa83a"; ctx.strokeStyle = "#3a6a1a"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.1, r * 0.85, r, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#9ad06a"; ctx.beginPath(); ctx.ellipse(x - r * 0.25, y - r * 0.2, r * 0.3, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    dot(ctx, x - r * 0.25 + f, y - r * 0.55, r * 0.1, "#1d1d1f"); dot(ctx, x + r * 0.25 + f, y - r * 0.55, r * 0.1, "#1d1d1f");
    ctx.globalAlpha = 1;
  };
  A.aphid.top = 18;

  // ===== 古代遺跡：守衛機關（灰色方塊身體、紅色 V 字、能量槌矛）、巡弋機關（會飛的三角形） =====
  A.ruinGuard = function (ctx, u, p, now) {
    const r = u.r, { x } = p, y = p.y + Math.sin(now / 500 + (u.x || 0)) * 1.2, side = (u.facing != null && Math.cos(u.facing) < -0.1) ? -1 : 1;
    alive(ctx, u);
    ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(x, p.y + r * 0.95, r, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    // 能量槌矛（握在旁邊，紅色菱形的矛頭）
    const P = u.pose, hx = x + side * r * 1.25;
    ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(hx, y + r * 1.0); ctx.lineTo(hx, y - r * 1.25); ctx.stroke();
    const glow = 0.6 + 0.4 * Math.sin(now / 160);
    ctx.fillStyle = `rgba(232,38,44,${glow})`; ctx.strokeStyle = "#e8262c"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(hx, y - r * 1.95); ctx.lineTo(hx + r * 0.28, y - r * 1.5); ctx.lineTo(hx, y - r * 1.05); ctx.lineTo(hx - r * 0.28, y - r * 1.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx, y - r * 1.95); ctx.lineTo(hx, y - r * 1.05); ctx.stroke();
    // 身體
    box(ctx, x - r, y - r * 0.85, r * 2, r * 1.7, "#7a7e86", "#1d1d1f", 3.5, r * 0.3);
    ctx.strokeStyle = "#e8262c"; ctx.lineWidth = 3.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x - r * 0.65, y - r * 0.2); ctx.lineTo(x, y + r * 0.35); ctx.lineTo(x + r * 0.65, y - r * 0.2); ctx.stroke();
    ctx.fillStyle = "#e8262c"; ctx.beginPath(); ctx.moveTo(x - r * 0.2, y - r * 0.05); ctx.lineTo(x, y - r * 0.32); ctx.lineTo(x + r * 0.2, y - r * 0.05); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  };
  A.ruinGuard.top = 66;
  A.ruinCruiser = function (ctx, u, p, now) {
    const r = u.r, a = u.facing ?? Math.PI / 2, x = p.x, y = p.y - 10 + Math.sin(now / 300 + (u.x || 0)) * 5;
    alive(ctx, u);
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(p.x, p.y + r * 0.9, r * 0.9, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    // 尾翼
    ctx.fillStyle = "#6a6e78"; ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-r * 0.6, r * 0.2); ctx.lineTo(-r * 1.3, r * 0.75); ctx.lineTo(-r * 0.2, r * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke();
    // 三角形的機身（尖端朝前）
    ctx.fillStyle = "#8a8e98"; ctx.beginPath(); ctx.moveTo(r * 1.4, 0); ctx.lineTo(-r * 0.9, -r * 0.75); ctx.lineTo(-r * 0.6, r * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#e8262c"; ctx.lineWidth = 3; ctx.setLineDash([r * 0.3, r * 0.22]); ctx.beginPath(); ctx.moveTo(-r * 0.45, -r * 0.05); ctx.lineTo(r * 0.9, 0); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(-r * 0.5, 0, r * 0.2, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(232,38,44,${0.5 + 0.5 * Math.sin(now / 140)})`; ctx.beginPath(); ctx.arc(-r * 0.2, 0, r * 0.95, 0.35, 1.1); ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  };
  A.ruinCruiser.top = 30;

  // ===== 超古代兵器・翁爾貢（使用者的圖）：灰色五角形的身體、紅色 H、雙肩的能量炮（紅色圓球）、能量雙刃長槍 =====
  function dblSpear(ctx, x, y, ang, L, r) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = Math.max(3, r * 0.08); ctx.beginPath(); ctx.moveTo(-L / 2, 0); ctx.lineTo(L / 2, 0); ctx.stroke();
    ctx.fillStyle = "#e8262c";
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * L / 2, 0); ctx.lineTo(s * (L / 2 - r * 0.55), -r * 0.16); ctx.lineTo(s * (L / 2 + r * 0.9), 0); ctx.lineTo(s * (L / 2 - r * 0.55), r * 0.16); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  A.ongergon = function (ctx, u, p, now) {
    const r = u.r, x = p.x, y = p.y + Math.sin(now / 420) * 2, f = u.facing ?? Math.PI / 2, st = u.state || {};
    const pose = st.pose && now - st.poseT < st.poseDur ? st.pose : null, stun = R.getBattle?.() && st.stunUntil >= R.getBattle().round;
    alive(ctx, u);
    ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.beginPath(); ctx.ellipse(x, p.y + r * 1.05, r * 1.1, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    const shL = { x: x - r * 0.92, y: y - r * 0.32 }, shR = { x: x + r * 0.92, y: y - r * 0.32 };
    // 噴射突刺：雙肩往後噴雷射
    if (pose === "dash") for (const sh of [shL, shR]) { ctx.strokeStyle = `rgba(232,38,44,${0.6 + 0.4 * Math.sin(now / 40)})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(sh.x - Math.cos(f) * r * 3.4, sh.y - Math.sin(f) * r * 3.4); ctx.stroke(); }
    // 大招：雙肩的雷射往兩邊掃
    if (pose === "plunge") { const k = (now - st.poseT) / 1000; for (const [sh, s] of [[shL, -1], [shR, 1]]) { const a = (s < 0 ? Math.PI : 0) + Math.sin(k * 2.2) * 0.9 * s; ctx.strokeStyle = "rgba(232,38,44,.75)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(sh.x + Math.cos(a) * 1600, sh.y + Math.sin(a) * 1600); ctx.stroke(); } }
    // 長槍在身體後面（平常）
    const blocking = now - (st.blockT || 0) < 650;
    if (!pose && !blocking) dblSpear(ctx, x + r * 0.55, y, f + 0.9, r * 3.2, r);
    // 身體：五角形＋裡面細長的六角形
    ctx.fillStyle = "#7a7e88"; ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(x, y - r * 1.05); ctx.lineTo(x + r * 0.95, y - r * 0.32); ctx.lineTo(x + r * 0.62, y + r * 0.9); ctx.lineTo(x - r * 0.62, y + r * 0.9); ctx.lineTo(x - r * 0.95, y - r * 0.32); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - r * 0.92); ctx.lineTo(x + r * 0.5, y - r * 0.45); ctx.lineTo(x + r * 0.5, y + r * 0.55); ctx.lineTo(x, y + r * 1.0); ctx.lineTo(x - r * 0.5, y + r * 0.55); ctx.lineTo(x - r * 0.5, y - r * 0.45); ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = "#e8262c"; ctx.lineWidth = Math.max(3, r * 0.1); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x - r * 0.24, y - r * 0.08); ctx.lineTo(x - r * 0.24, y + r * 0.34); ctx.moveTo(x + r * 0.24, y - r * 0.08); ctx.lineTo(x + r * 0.24, y + r * 0.34); ctx.moveTo(x - r * 0.24, y + r * 0.13); ctx.lineTo(x + r * 0.24, y + r * 0.13); ctx.stroke();
    ctx.strokeStyle = "#8a1018"; ctx.beginPath(); ctx.moveTo(x + r * 0.1, y - r * 0.6); ctx.lineTo(x + r * 0.08, y - r * 0.35); ctx.moveTo(x - r * 0.12, y + r * 0.5); ctx.lineTo(x - r * 0.14, y + r * 0.72); ctx.stroke();
    // 雙肩的能量炮
    const hot = pose === "orbs" || pose === "plunge" || pose === "dash";
    for (const sh of [shL, shR]) { ctx.fillStyle = "#8a8e98"; ctx.beginPath(); ctx.arc(sh.x, sh.y, r * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = stun ? "#7a3a3a" : hot ? `rgba(255,${80 + Math.round(80 * Math.sin(now / 60))},80,1)` : "#e8262c"; ctx.beginPath(); ctx.arc(sh.x, sh.y, r * 0.22, 0, Math.PI * 2); ctx.fill(); }
    // 長槍的動作
    if (blocking) {                                                   // 正面的投射物：在面前旋轉雙刃擋下
      const cx = x + Math.cos(f) * r * 1.35, cy = y + Math.sin(f) * r * 1.35;
      ctx.fillStyle = "rgba(232,38,44,.18)"; ctx.beginPath(); ctx.arc(cx, cy, r * 1.4, 0, Math.PI * 2); ctx.fill();
      dblSpear(ctx, cx, cy, now / 28, r * 2.6, r);
    } else if (pose === "spin") dblSpear(ctx, x, y, now / 45, r * 3.4, r);
    else if (pose === "poke") { const k = Math.abs(Math.sin((now - st.poseT) / 90)); dblSpear(ctx, x + Math.cos(f) * r * (0.8 + k * 1.2), y + Math.sin(f) * r * (0.8 + k * 1.2), f, r * 3.2, r); }
    else if (pose === "dash" || pose === "throw" || pose === "orbs") dblSpear(ctx, x + Math.cos(f) * r * 0.9, y + Math.sin(f) * r * 0.9, f, r * 3.2, r);
    else if (pose === "plunge") dblSpear(ctx, x, y + r * 1.2, Math.PI / 2, r * 3, r);
    // 暈眩：頭上轉圈的星星
    if (stun) for (let i = 0; i < 4; i++) { const a = now / 300 + (i * Math.PI) / 2; ctx.fillStyle = "#f0c800"; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.8, y - r * 1.25 + Math.sin(a) * r * 0.25, 5, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  };
  A.ongergon.top = 62;
  // 能量水晶（紅色的菱形，裡面有暗紅色的裂紋）
  function crystal(ctx, c, now) {
    const { x, y, r } = c;
    if (c.broken) { ctx.fillStyle = "#6a6a64"; for (let i = 0; i < 5; i++) { const a = i * 1.3; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8 + 10); ctx.lineTo(x + Math.cos(a) * 22, y + Math.sin(a) * 14 + 14); ctx.lineTo(x + Math.cos(a + 0.4) * 16, y + Math.sin(a + 0.4) * 10 + 16); ctx.closePath(); ctx.fill(); } return; }
    const g = 0.75 + 0.25 * Math.sin(now / 300 + x);
    ctx.fillStyle = `rgba(232,38,44,${g})`; ctx.strokeStyle = "#6a6a64"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, y - r * 1.6); ctx.lineTo(x + r * 0.62, y); ctx.lineTo(x, y + r * 1.6); ctx.lineTo(x - r * 0.62, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#8a1018"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + 2, y - r * 1.3); ctx.lineTo(x - 6, y - r * 0.8); ctx.lineTo(x + 5, y - r * 0.4); ctx.lineTo(x - 4, y); ctx.lineTo(x + 6, y + r * 0.5); ctx.lineTo(x - 2, y + r * 1.2); ctx.stroke();
  }
  R.drawCrystal = crystal;

  // ===== 戰鬥背景 =====
  const seeded = (s) => () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  // 雪地：雪堆、腳印；會飄雪
  T.snow = {
    bg(g, W, H) {
      const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, "#e8f0f6"); grd.addColorStop(1, "#f6f9fb");
      g.fillStyle = grd; g.fillRect(0, 0, W, H);
      const rnd = seeded(5);
      for (let i = 0; i < 18; i++) { g.fillStyle = rnd() < 0.5 ? "rgba(170,195,215,.25)" : "rgba(255,255,255,.7)"; g.beginPath(); g.ellipse(rnd() * W, rnd() * H, 60 + rnd() * 90, 20 + rnd() * 26, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = "rgba(120,150,175,.25)";
      for (let i = 0; i < 14; i++) { const x = 100 + i * 80, y = 600 - i * 30 + Math.sin(i) * 20; g.fillRect(x, y, 14, 10); g.fillRect(x + 24, y + 14, 14, 10); }
      // 遠方的燈塔
      g.fillStyle = "rgba(90,120,150,.25)"; g.fillRect(W - 120, 20, 40, 120); g.beginPath(); g.moveTo(W - 130, 20); g.lineTo(W - 100, 0); g.lineTo(W - 70, 20); g.fill();
    },
    draw(ctx, now, W, H) {
      ctx.fillStyle = "rgba(255,255,255,.85)";
      for (let i = 0; i < 90; i++) {
        const sp = 40 + (i % 7) * 12, x = ((i * 137 + now / 1000 * 30 * ((i % 3) + 1)) % (W + 40)) - 20, y = ((i * 251 + now / 1000 * sp) % (H + 20)) - 10;
        ctx.beginPath(); ctx.arc(x + Math.sin(now / 700 + i) * 8, y, 1.5 + (i % 3), 0, Math.PI * 2); ctx.fill();
      }
    },
  };
  // 列車車廂：木頭地板、兩側的座位、窗外的風景一直往後跑
  T.train = {
    bg(g, W, H) {
      g.fillStyle = "#b08a5a"; g.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += 26) { g.fillStyle = (y / 26) % 2 ? "#a88252" : "#b48e5e"; g.fillRect(0, y, W, 26); }
      g.fillStyle = "#5a3a1a"; g.fillRect(0, 0, W, 70); g.fillRect(0, H - 50, W, 50);                 // 牆
      g.fillStyle = "#3a6a5a"; for (let x = 40; x < W; x += 200) { g.fillRect(x, 70, 120, 34); g.fillRect(x, H - 84, 120, 34); }   // 座位
      g.strokeStyle = "rgba(0,0,0,.2)"; g.lineWidth = 2; g.strokeRect(W / 2 - 3, 0, 6, H);              // 車廂中線
    },
    draw(ctx, now, W) {
      // 窗戶（上面那面牆）：窗外的電線桿往後跑
      for (let x = 20; x < W; x += 200) {
        ctx.fillStyle = "#9ad0f0"; ctx.fillRect(x + 10, 10, 160, 46);
        ctx.save(); ctx.beginPath(); ctx.rect(x + 10, 10, 160, 46); ctx.clip();
        ctx.fillStyle = "#6a9a5a"; ctx.fillRect(x + 10, 42, 160, 14);
        ctx.fillStyle = "#5a4a3a"; const o = (now / 4) % 120; for (let k = -1; k < 3; k++) ctx.fillRect(x + 170 - o - k * 120 + 10, 12, 5, 44);
        ctx.restore();
        ctx.strokeStyle = "#3a2410"; ctx.lineWidth = 4; ctx.strokeRect(x + 10, 10, 160, 46);
      }
    },
  };
  // 古代遺跡：石板地、柱子（大掩體）、矮牆（小掩體）、地刺（偶數回合刺出來）、牆上的雷射發射器和鏡子
  function ruinFloor(g, W, H) {
    g.fillStyle = "#8a8070"; g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 80) for (let x = (y / 80) % 2 ? -40 : 0; x < W; x += 80) { g.fillStyle = ((x + y) / 40) % 3 < 1 ? "#958b7a" : "#857b6a"; g.fillRect(x + 2, y + 2, 76, 76); }
    g.strokeStyle = "rgba(90,200,220,.18)"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke();   // 地上的古代紋路
  }
  T.ruins = {
    bg(g, W, H, room) {
      ruinFloor(g, W, H);
      for (const o of room.spikes || []) {
        g.fillStyle = "#6a6258"; g.fillRect(o.x, o.y, o.w, o.h); g.strokeStyle = "#4a4238"; g.lineWidth = 2; g.strokeRect(o.x, o.y, o.w, o.h);
        g.fillStyle = "#2a2620"; for (let yy = o.y + 15; yy < o.y + o.h; yy += 30) for (let xx = o.x + 15; xx < o.x + o.w; xx += 30) { g.beginPath(); g.arc(xx, yy, 4, 0, Math.PI * 2); g.fill(); }
      }
      for (const o of room.lowWalls || []) { g.fillStyle = "rgba(0,0,0,.2)"; g.fillRect(o.x + 4, o.y + 6, o.w, o.h); g.fillStyle = "#a89a80"; g.fillRect(o.x, o.y, o.w, o.h); g.strokeStyle = "#5a5040"; g.lineWidth = 2; g.strokeRect(o.x, o.y, o.w, o.h); }
      for (const o of room.obstacles || []) {
        g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(o.x + 8, o.y + 10, o.w, o.h);
        g.fillStyle = "#b8ac94"; g.fillRect(o.x, o.y, o.w, o.h); g.strokeStyle = "#5a5040"; g.lineWidth = 3; g.strokeRect(o.x, o.y, o.w, o.h);
        g.fillStyle = "#c8bca4"; g.fillRect(o.x + 6, o.y + 6, o.w - 12, o.h - 12);
      }
    },
    draw(ctx, now, W, H, room) {
      const B = R.getBattle?.();
      if (B?.spikesOut()) for (const o of room.spikes || []) {
        ctx.fillStyle = "#d8d4cc"; ctx.strokeStyle = "#4a4238"; ctx.lineWidth = 1.5;
        for (let yy = o.y + 15; yy < o.y + o.h; yy += 30) for (let xx = o.x + 15; xx < o.x + o.w; xx += 30) { ctx.beginPath(); ctx.moveTo(xx - 7, yy + 6); ctx.lineTo(xx, yy - 14); ctx.lineTo(xx + 7, yy + 6); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      }
      for (const c of B?.crystals || []) crystal(ctx, c, now);
      for (const m of room.mirrors || []) { ctx.strokeStyle = "#9ad8ec"; ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(m.x1, m.y1); ctx.lineTo(m.x2, m.y2); ctx.stroke(); }
      for (const L of room.lasers || []) {
        const pts = R.Ruins.laserPath(L.x, L.y, L.dx, L.dy, room.mirrors, { x: 0, y: 0, w: W, h: H });
        ctx.strokeStyle = `rgba(232,38,44,${0.65 + 0.3 * Math.sin(now / 90)})`; ctx.lineWidth = 4; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
        ctx.fillStyle = "#6a6e78"; ctx.beginPath(); ctx.arc(L.x, L.y, 16, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#e8262c"; ctx.beginPath(); ctx.arc(L.x, L.y, 7, 0, Math.PI * 2); ctx.fill();
      }
    },
  };
  R.ruinFloor = ruinFloor;
  // 月台：水泥地  // 月台：水泥地、黃色的導盲磚，上面是列車經過
  T.platform = {
    bg(g, W, H) {
      g.fillStyle = "#b8b4ac"; g.fillRect(0, 0, W, H);
      g.strokeStyle = "rgba(0,0,0,.08)"; g.lineWidth = 1; for (let x = 0; x < W; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      g.fillStyle = "#e8c23a"; g.fillRect(0, 96, W, 22); g.fillStyle = "rgba(0,0,0,.15)"; for (let x = 6; x < W; x += 16) for (let y = 100; y < 116; y += 8) g.fillRect(x, y, 4, 4);
      g.fillStyle = "#3a3a40"; g.fillRect(0, 0, W, 90);
    },
    draw(ctx, now, W) {
      const o = (now / 6) % 320;
      for (let x = -320; x < W + 320; x += 320) {
        const cx = x - o; ctx.fillStyle = "#7a5a3a"; ctx.fillRect(cx + 6, 6, 308, 78); ctx.fillStyle = "#9ad0f0"; for (let k = 0; k < 4; k++) ctx.fillRect(cx + 24 + k * 72, 18, 50, 30);
        ctx.fillStyle = "#3a2410"; ctx.fillRect(cx + 150, 52, 30, 32);
      }
    },
  };
  // 城市的街道：柏油路、斑馬線；飛天車的影子掠過
  T.city = {
    bg(g, W, H) {
      g.fillStyle = "#4a4e56"; g.fillRect(0, 0, W, H);
      g.fillStyle = "#8a8e96"; g.fillRect(0, 0, W, 60); g.fillRect(0, H - 60, W, 60);                     // 人行道
      g.fillStyle = "#e8e4d8"; for (let x = 0; x < W; x += 80) g.fillRect(x + 20, H / 2 - 4, 40, 8);   // 車道線
      for (let y = 90; y < H - 90; y += 40) g.fillRect(W - 260, y, 160, 20);                             // 斑馬線
      g.fillStyle = "rgba(255,255,255,.08)"; for (let x = 0; x < W; x += 60) g.fillRect(x, 0, 2, 60);
    },
    draw(ctx, now, W, H) {
      const k = (now / 5200) % 1;
      ctx.fillStyle = "rgba(0,0,0,.14)"; ctx.beginPath(); ctx.ellipse(-200 + k * (W + 400), H * 0.35, 120, 34, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,.1)"; ctx.beginPath(); ctx.ellipse(W + 200 - ((k + 0.5) % 1) * (W + 400), H * 0.7, 90, 26, 0, 0, Math.PI * 2); ctx.fill();
      // 紅綠燈
      const lit = Math.floor(now / 2000) % 3;
      ctx.fillStyle = "#1d1d1f"; ctx.fillRect(W - 60, 6, 46, 18);
      ["#e8262c", "#f0c800", "#4caf50"].forEach((c, i) => { ctx.fillStyle = i === lit ? c : "rgba(255,255,255,.15)"; ctx.beginPath(); ctx.arc(W - 52 + i * 15, 15, 5, 0, Math.PI * 2); ctx.fill(); });
    },
  };
  // 生態盒的土壤：落葉、小石子；遠方是巨大的玻璃牆
  T.soil = {
    bg(g, W, H) {
      g.fillStyle = "#6a4a2e"; g.fillRect(0, 0, W, H);
      const rnd = seeded(33);
      for (let i = 0; i < 300; i++) { g.fillStyle = rnd() < 0.5 ? "rgba(40,24,10,.35)" : "rgba(160,120,80,.3)"; g.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 5, 2 + rnd() * 4); }
      for (let i = 0; i < 10; i++) {
        const x = rnd() * W, y = rnd() * H, a = rnd() * Math.PI;
        g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = rnd() < 0.5 ? "rgba(160,110,40,.55)" : "rgba(120,140,50,.5)";
        g.beginPath(); g.ellipse(0, 0, 70 + rnd() * 40, 24, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = "rgba(60,40,10,.4)"; g.lineWidth = 2; g.beginPath(); g.moveTo(-70, 0); g.lineTo(70, 0); g.stroke(); g.restore();
      }
      g.fillStyle = "rgba(200,230,240,.25)"; g.fillRect(0, 0, W, 40); g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(0, 36, W, 4);
    },
  };
})();
