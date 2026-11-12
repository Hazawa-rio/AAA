/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/enemy-art-b.js": "20261113040753" });
// B 級時空（雲端上的海洋、有點偏執的急診室、或許是魔法森林、比爾哈頓廣場、童年時的黑市、彼岸花盛開的事務所）的戰鬥造型和戰鬥背景
// R.EnemyArt[kind](ctx, u, p, now)；R.Terrains[terrain]：bg(g, W, H) 畫一次、draw(ctx, now, W, H) 每一格都畫
(function () {
  const R = (window.RPG = window.RPG || {});
  const A = (R.EnemyArt = R.EnemyArt || {});
  const T = (R.Terrains = R.Terrains || {});
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function box(ctx, x, y, w, h, fill, stroke, lw = 3, r = 6) { rr(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); } }
  function dot(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  const alive = (ctx, u) => { ctx.globalAlpha = u.alive === false ? 0.3 : 1; };
  const bob = (u, now, k = 1.5) => Math.sin(now / 380 + (u.x || 0)) * k;
  const fx = (u) => (u.facing != null ? Math.cos(u.facing) : 0) * 0.2;
  // 人類：和玩家一樣的方塊（米白色、彩色邊框、中間一個字），再加上各自的特徵
  //   o.line＝邊框和字的顏色、o.ch＝中間的字、o.fill＝方塊底色、o.under(x, y, r, f)＝畫在方塊後面、o.extra(x, y, r, f)＝畫在方塊前面
  function person(ctx, u, p, now, o) {
    const r = u.r, x = p.x, y = p.y + bob(u, now), f = fx(u) * r;
    alive(ctx, u);
    o.under?.(x, y, r, f);
    box(ctx, x - r, y - r, r * 2, r * 2, o.fill || "#fffaf0", o.line, 4, Math.max(6, r * 0.35));
    if (o.ch) { ctx.fillStyle = o.ink || o.line; ctx.font = `900 ${Math.round(r * (o.ch.length > 1 ? 0.55 : 0.78))}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(o.ch, x + f * 0.5, y - r * 0.02); ctx.textBaseline = "alphabetic"; }
    o.extra?.(x, y, r, f);
    ctx.globalAlpha = 1;
  }
  const label = (ctx, t, x, y, size, col = "#fff") => { ctx.fillStyle = col; ctx.font = `900 ${Math.round(size)}px sans-serif`; ctx.textAlign = "center"; ctx.fillText(t, x, y); };

  // ===== 雲端上的海洋 =====
  const goggles = (ctx, x, y, r, line) => { box(ctx, x - r * 0.85, y - r * 0.82, r * 1.7, r * 0.34, "rgba(180,230,255,.9)", line, 2, 5); };   // 潛水鏡（方塊上緣）
  A.skyCatcher = (ctx, u, p, now) => person(ctx, u, p, now, { line: "#3a6a9a", extra(x, y, r) {
    goggles(ctx, x, y, r, "#1a2a4a");
    ctx.strokeStyle = "#e8f4ff"; ctx.lineWidth = 2;                                                            // 捕雲網
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + r * 1.05, y + i * 5); ctx.lineTo(x + r * 1.6, y + i * 8); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(x + r * 1.3, y - r * 0.4); ctx.lineTo(x + r * 1.3, y + r * 0.4); ctx.stroke();
  } });
  A.catcherBoss = (ctx, u, p, now) => person(ctx, u, p, now, { line: "#2a4a7a", extra(x, y, r) {
    ctx.fillStyle = "#c0392b"; rr(ctx, x - r * 0.95, y - r * 1.25, r * 1.9, r * 0.36, 5); ctx.fill();           // 紅色頭巾
    ctx.beginPath(); ctx.moveTo(x - r * 0.95, y - r * 1.1); ctx.lineTo(x - r * 1.4, y - r * 0.8); ctx.lineTo(x - r * 1.2, y - r * 1.2); ctx.fill();
    goggles(ctx, x, y, r, "#0a1a3a");
    box(ctx, x + r * 0.9, y - r * 0.05, r * 0.9, r * 0.55, "#8a9aaa", "#0a1a3a", 3, 4);                       // 吸雲機
    for (let i = 0; i < 3; i++) dot(ctx, x + r * 1.95 + Math.sin(now / 150 + i) * 6, y + r * 0.1 + i * 6, 6 - i, "rgba(240,248,255,.95)");
  } });
  // ===== 急診室 =====
  const stitchLine = (ctx, x, y, r, pts) => {
    ctx.strokeStyle = "#5a2a3a"; ctx.lineWidth = 1.6;
    for (const [x0, y0, x1, y1] of pts) {
      ctx.beginPath(); ctx.moveTo(x + r * x0, y + r * y0); ctx.lineTo(x + r * x1, y + r * y1); ctx.stroke();
      for (let k = 0.1; k < 1; k += 0.16) { const sx = x + r * (x0 + (x1 - x0) * k), sy = y + r * (y0 + (y1 - y0) * k); ctx.beginPath(); ctx.moveTo(sx - 3, sy + 3); ctx.lineTo(sx + 3, sy - 3); ctx.stroke(); }
    }
  };
  A.stitched = (ctx, u, p, now) => person(ctx, u, p, now, { line: "#9a7a8a", fill: "#f4eef2", under(x, y, r) {
    // 多出來的手臂（方塊伸出來的小方塊）
    box(ctx, x - r * 1.6, y - r * 0.15 + Math.sin(now / 260) * 2, r * 0.75, r * 0.32, "#f4eef2", "#9a7a8a", 3, 4);
    box(ctx, x + r * 0.85, y + r * 0.35 + Math.sin(now / 300 + 1) * 2, r * 0.75, r * 0.32, "#f4eef2", "#9a7a8a", 3, 4);
    box(ctx, x - r * 0.3, y - r * 1.55, r * 0.32, r * 0.7, "#f4eef2", "#9a7a8a", 3, 4);
  }, extra(x, y, r) { stitchLine(ctx, x, y, r, [[-0.92, -0.55, -0.5, -0.92], [0.5, 0.92, 0.92, 0.5]]); } });
  A.surgeonBoss = (ctx, u, p, now) => person(ctx, u, p, now, { line: "#2a8a7a", extra(x, y, r) {
    box(ctx, x - r * 0.95, y - r * 1.3, r * 1.9, r * 0.42, "#2a8a7a", "#0a3a32", 2, 6);                       // 手術帽
    box(ctx, x - r * 0.75, y + r * 0.44, r * 1.5, r * 0.42, "#9ad8c8", "#0a3a32", 2, 4);                       // 口罩
    label(ctx, "100.00000%", x, y + r * 0.74, r * 0.24, "#0a3a32");
    ctx.strokeStyle = "#c9ced6"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + r * 1.05, y + r * 0.3); ctx.lineTo(x + r * 1.7, y - r * 0.4 + Math.sin(now / 200) * 3); ctx.stroke();   // 手術刀
  } });
  // ===== 或許是魔法森林 =====
  A.sporeMole = (ctx, u, p, now) => {
    const r = u.r, x = p.x, y = p.y + bob(u, now);
    alive(ctx, u);
    box(ctx, x - r, y - r * 0.6, r * 2, r * 1.4, "#6a5a5a", "#2a1a1a", 3, r * 0.5);
    box(ctx, x - r * 0.3, y - r * 0.2, r * 0.6, r * 0.4, "#e8a0b0", "#2a1a1a", 2, 6);                      // 鼻子
    for (const [dx, h, c] of [[-0.5, 0.7, "#b86ad8"], [0.1, 0.95, "#9ad8ff"], [0.6, 0.6, "#b86ad8"]]) {   // 背上長出來的蘑菇
      const gl = 0.6 + 0.4 * Math.sin(now / 300 + dx * 5);
      ctx.fillStyle = "#e8dcc8"; ctx.fillRect(x + r * dx - 3, y - r * 0.6 - r * h * 0.6, 6, r * h * 0.6);
      ctx.globalAlpha = (u.alive === false ? 0.3 : 1) * gl; dot(ctx, x + r * dx, y - r * 0.6 - r * h * 0.6, r * 0.32, c); ctx.globalAlpha = u.alive === false ? 0.3 : 1;
    }
    ctx.globalAlpha = 1;
  };
  A.sporeKing = (ctx, u, p, now) => {
    const r = u.r, x = p.x, y = p.y + bob(u, now, 2.5);
    alive(ctx, u);
    for (let i = 0; i < 6; i++) { const a = i * 1.05 + now / 900; ctx.strokeStyle = "#7a4a9a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y + r * 0.3); ctx.quadraticCurveTo(x + Math.cos(a) * r * 1.2, y + r * 0.6, x + Math.cos(a) * r * 1.6, y + r * 0.9 + Math.sin(a) * 6); ctx.stroke(); }   // 菌絲
    ctx.fillStyle = "#e8dcc8"; ctx.fillRect(x - r * 0.3, y - r * 0.2, r * 0.6, r * 0.9);
    const gl = 0.55 + 0.45 * Math.sin(now / 260);
    ctx.fillStyle = `rgba(150,60,200,${0.25 * gl})`; ctx.beginPath(); ctx.arc(x, y - r * 0.4, r * 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#7a2aa0"; ctx.strokeStyle = "#2a0a3a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y - r * 0.35, r * 1.15, r * 0.7, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (const [dx, dy] of [[-0.6, -0.6], [0, -0.85], [0.55, -0.55], [-0.25, -0.45], [0.3, -0.7]]) dot(ctx, x + r * dx, y + r * dy, r * 0.1, "#e8f0a0");
    dot(ctx, x - r * 0.12, y + r * 0.15, r * 0.07, "#e8f0a0"); dot(ctx, x + r * 0.12, y + r * 0.15, r * 0.07, "#e8f0a0");
    ctx.globalAlpha = 1;
  };
  // ===== 比爾哈頓廣場 =====
  const mask = (ctx, x, y, r) => { ctx.fillStyle = "#1d1d1f"; rr(ctx, x - r * 0.98, y + r * 0.46, r * 1.96, r * 0.4, 4); ctx.fill(); };   // 遮臉的頭巾
  A.looter = (ctx, u, p, now) => person(ctx, u, p, now, { line: "#8a5a3a", extra(x, y, r) {
    mask(ctx, x, y, r);
    ctx.strokeStyle = "#a87a4a"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x + r * 1.0, y + r * 0.7); ctx.lineTo(x + r * 1.6, y - r * 0.8); ctx.stroke(); ctx.lineCap = "butt";   // 球棒
  } });
  A.instigator = (ctx, u, p, now) => person(ctx, u, p, now, { line: "#6a3a2a", extra(x, y, r) {
    mask(ctx, x, y, r);
    ctx.strokeStyle = "#8a8e96"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - r * 1.05, y + r * 0.8); ctx.lineTo(x - r * 1.6, y - r * 0.9); ctx.stroke();   // 鐵管
    box(ctx, x + r * 1.05, y - r * 0.5, r * 0.42, r * 0.66, "#3a7a3a", "#1d1d1f", 2, 3);                       // 汽油彈
    dot(ctx, x + r * 1.26, y - r * 0.66 + Math.sin(now / 90) * 2, r * 0.15, "#ff8a2a");
    label(ctx, "收據", x - r * 1.2, y - r * 1.15, r * 0.3, "#6a3a2a");
  } });
  // ===== 童年時的黑市 =====
  const shades = (ctx, x, y, r) => { ctx.fillStyle = "#1d1d1f"; rr(ctx, x - r * 0.85, y - r * 0.78, r * 0.75, r * 0.3, 4); ctx.fill(); rr(ctx, x + r * 0.1, y - r * 0.78, r * 0.75, r * 0.3, 4); ctx.fill(); ctx.fillRect(x - r * 0.12, y - r * 0.68, r * 0.24, r * 0.07); };
  const armband = (ctx, x, y, r, t) => { ctx.fillStyle = "#c0392b"; ctx.fillRect(x - r, y + r * 0.5, r * 2, r * 0.3); label(ctx, t, x, y + r * 0.73, r * 0.24); };
  A.eraAgent = (ctx, u, p, now) => person(ctx, u, p, now, { line: "#3a3a4a", extra(x, y, r) { shades(ctx, x, y, r); armband(ctx, x, y, r, "2026"); } });
  A.eraCaptain = (ctx, u, p, now) => person(ctx, u, p, now, { line: "#1d1d2a", extra(x, y, r) {
    box(ctx, x - r * 1.05, y - r * 1.4, r * 2.1, r * 0.5, "#1d1d2a", "#000", 2, 4);                           // 軍帽
    ctx.fillRect(x - r * 1.2, y - r * 0.95, r * 2.4, r * 0.12);
    ctx.fillStyle = "#e8b84a"; ctx.fillRect(x - r * 0.16, y - r * 1.32, r * 0.32, r * 0.26);
    shades(ctx, x, y, r); armband(ctx, x, y, r, "活在現在");
  } });
  // ===== 彼岸花盛開的事務所 =====
  function grudgeArt(ctx, u, p, now, big) {
    const r = u.r, x = p.x, y = p.y + bob(u, now, 3);
    alive(ctx, u);
    const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 1.3);
    g.addColorStop(0, big ? "rgba(90,0,20,.95)" : "rgba(138,26,42,.9)"); g.addColorStop(1, "rgba(60,0,10,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#e8262c"; ctx.lineWidth = 2;                                                         // 紅線
    for (let i = 0; i < (big ? 7 : 4); i++) { const a = i * 0.9 + now / 700; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.5, x + Math.cos(a + 0.6) * r * 1.7, y + Math.sin(a + 0.6) * r * 1.2); ctx.stroke(); }
    dot(ctx, x - r * 0.25, y - r * 0.1, r * 0.12, "#ffd0d0"); dot(ctx, x + r * 0.25, y - r * 0.1, r * 0.12, "#ffd0d0");
    if (big) for (let i = 0; i < 5; i++) { const a = i * 1.26 + now / 1500; lily(ctx, x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 0.8, 7); }
    ctx.globalAlpha = 1;
  }
  function lily(ctx, x, y, s, col) {      // 彼岸花：細長往後捲的紅色花瓣（col：白色的彼岸花）
    ctx.strokeStyle = col || "#e8262c"; ctx.lineWidth = 1.6;
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * s, y + Math.sin(a) * s - s * 0.6, x + Math.cos(a) * s * 1.2, y + Math.sin(a) * s * 0.4); ctx.stroke(); }
    dot(ctx, x, y, s * 0.18, col ? "#d8d0c8" : "#c40a1e");
  }
  A.grudge = (ctx, u, p, now) => grudgeArt(ctx, u, p, now, false);
  A.grudgeSpirit = (ctx, u, p, now) => grudgeArt(ctx, u, p, now, true);
  R.drawLily = lily;

  // ===== 戰鬥背景 =====
  T.skysea = {
    bg(g, W, H) {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#9ed4f8"); gr.addColorStop(1, "#5aa8e8"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 14; i++) { const x = (i * 211) % W, y = 80 + ((i * 137) % (H - 120)); g.fillStyle = "rgba(255,255,255,.55)"; for (const [dx, dy, r] of [[0, 0, 26], [24, -8, 20], [-22, -4, 18], [8, 10, 22]]) { g.beginPath(); g.arc(x + dx, y + dy, r, 0, Math.PI * 2); g.fill(); } }
    },
    draw(ctx, now, W, H) { for (let i = 0; i < 10; i++) { const y = H - ((now / 30 + i * 90) % (H + 40)), x = (i * 137) % W + Math.sin(now / 600 + i) * 10; ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 4 + (i % 3) * 2, 0, Math.PI * 2); ctx.stroke(); } },
  };
  T.ward = {
    bg(g, W, H) {
      g.fillStyle = "#eef4f2"; g.fillRect(0, 0, W, H);
      g.strokeStyle = "rgba(42,138,122,.18)"; g.lineWidth = 2; for (let x = 0; x < W; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      g.strokeStyle = "rgba(42,138,122,.5)"; g.lineWidth = 3; g.beginPath();
      for (let x = 0; x <= W; x += 4) { const k = (x % 220) / 220, yy = 40 - (k > 0.1 && k < 0.16 ? 8 : 0) - (k > 0.3 && k < 0.33 ? -10 : 0) - (k > 0.33 && k < 0.36 ? 34 : 0) - (k > 0.36 && k < 0.39 ? -14 : 0) - (k > 0.55 && k < 0.66 ? 12 * Math.sin(((k - 0.55) / 0.11) * Math.PI) : 0); x ? g.lineTo(x, yy) : g.moveTo(x, yy); }   // 心電圖：P-QRS-T
      g.stroke();
    },
    draw() {},
  };
  T.mine = {
    bg(g, W, H) {
      g.fillStyle = "#1a1626"; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 26; i++) { const x = (i * 197) % W, y = (i * 113) % H, c = i % 3 ? "155,90,220" : "120,210,255"; const gr = g.createRadialGradient(x, y, 0, x, y, 60); gr.addColorStop(0, `rgba(${c},.35)`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(x - 60, y - 60, 120, 120); g.fillStyle = `rgba(${c},.9)`; g.beginPath(); g.ellipse(x, y, 10, 6, 0, Math.PI, 0); g.fill(); g.fillStyle = "#d8ccb8"; g.fillRect(x - 2, y, 4, 9); }
    },
    draw(ctx, now, W, H) { for (let i = 0; i < 16; i++) { const y = (now / 40 + i * 70) % H, x = (i * 151) % W + Math.sin(now / 700 + i) * 20; ctx.fillStyle = `rgba(${i % 2 ? "190,120,255" : "150,230,255"},.5)`; ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill(); } },
  };
  T.plaza = {
    bg(g, W, H) {
      g.fillStyle = "#c8bca8"; g.fillRect(0, 0, W, H);
      g.strokeStyle = "rgba(90,70,50,.18)"; g.lineWidth = 2; for (let y = 0; y < H; y += 48) for (let x = (y / 48) % 2 ? 0 : 48; x < W; x += 96) g.strokeRect(x, y, 96, 48);
      for (let i = 0; i < 8; i++) { g.fillStyle = "rgba(255,255,255,.75)"; g.save(); g.translate((i * 173) % W, 60 + (i * 251) % (H - 100)); g.rotate((i % 5 - 2) * 0.3); g.fillRect(-18, -12, 36, 24); g.restore(); }   // 散落的傳單
    },
    draw(ctx, now, W, H) { for (let i = 0; i < 4; i++) { const x = ((now / 50 + i * 330) % (W + 300)) - 150, y = 120 + i * 140; const gr = ctx.createRadialGradient(x, y, 0, x, y, 120); gr.addColorStop(0, "rgba(230,230,200,.28)"); gr.addColorStop(1, "rgba(230,230,200,0)"); ctx.fillStyle = gr; ctx.fillRect(x - 120, y - 120, 240, 240); } },   // 飄過去的催淚瓦斯
  };
  T.market = {
    bg(g, W, H) {
      g.fillStyle = "#2a2430"; g.fillRect(0, 0, W, H);
      g.fillStyle = "#3a3240"; for (let x = 0; x < W; x += 160) g.fillRect(x, 0, 6, H);
      for (let i = 0; i < 9; i++) { const x = 60 + i * 140, c = ["#e8b84a", "#4ab8e8", "#e84a8a", "#8ae84a"][i % 4]; g.fillStyle = c; g.globalAlpha = 0.25; g.fillRect(x, 20, 100, 30); g.globalAlpha = 1; g.strokeStyle = c; g.lineWidth = 2; g.strokeRect(x, 20, 100, 30); }   // 攤位的燈箱
    },
    draw(ctx, now, W) { for (let i = 0; i < 9; i++) { ctx.globalAlpha = 0.15 + 0.15 * Math.sin(now / 300 + i * 2); ctx.fillStyle = ["#e8b84a", "#4ab8e8", "#e84a8a", "#8ae84a"][i % 4]; ctx.fillRect(60 + i * 140, 20, 100, 30); } ctx.globalAlpha = 1; },
  };
  T.lily = {
    bg(g, W, H) {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#2a1418"); gr.addColorStop(1, "#4a1a20"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 70; i++) { const x = (i * 97) % W, y = (i * 61) % H; g.strokeStyle = "#3a5a2a"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y + 14); g.lineTo(x, y); g.stroke(); lily(g, x, y, 8); }
    },
    draw(ctx, now, W, H) { for (let i = 0; i < 8; i++) { const y = H - ((now / 60 + i * 100) % (H + 40)), x = (i * 167) % W + Math.sin(now / 500 + i) * 18; ctx.fillStyle = "rgba(232,38,44,.55)"; ctx.beginPath(); ctx.ellipse(x, y, 5, 2, now / 400 + i, 0, Math.PI * 2); ctx.fill(); } },
  };
})();
