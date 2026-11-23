/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/enemy-art-d.js": "20261123215910" });
// A 級時空（遞廻齒輪鑲嵌之國、如此靜謐的蔚藍）的戰鬥造型和戰鬥背景
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
  const fx = (u) => (u.facing != null ? Math.cos(u.facing) : 0);
  // 齒輪（cx, cy, 半徑, 齒數, 角度）
  function gear(ctx, x, y, r, n, a, fill, stroke) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) { const t = a + (i / (n * 2)) * Math.PI * 2, rr2 = i % 2 ? r : r * 1.22; const t2 = a + ((i + 1) / (n * 2)) * Math.PI * 2; ctx.lineTo(x + Math.cos(t) * rr2, y + Math.sin(t) * rr2); ctx.lineTo(x + Math.cos(t2) * rr2, y + Math.sin(t2) * rr2); }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.lineWidth = 2; ctx.strokeStyle = stroke; ctx.stroke(); }
    dot(ctx, x, y, r * 0.35, stroke || "#3a2a10");
  }
  R.drawGear = gear;
  // 一團蒸氣
  function puff(ctx, x, y, r, now, k = 0, a = 0.55) {
    ctx.fillStyle = `rgba(240,240,236,${a})`;
    for (let i = 0; i < 5; i++) { const t = now / 500 + i * 1.3 + k; ctx.beginPath(); ctx.arc(x + Math.cos(t) * r * 0.45, y + Math.sin(t * 1.3) * r * 0.3 - i * r * 0.12, r * (0.45 + (i % 3) * 0.12), 0, Math.PI * 2); ctx.fill(); }
  }
  R.drawPuff = puff;

  // ===== 遞廻齒輪鑲嵌之國 =====
  // 轟鳴蒸氣犬：黃銅的狗，背上一根煙囪
  A.steamHound = (ctx, u, p, now) => {
    const r = u.r, x = p.x, y = p.y + bob(u, now), f = fx(u) >= 0 ? 1 : -1;
    alive(ctx, u);
    for (const lx of [-0.55, -0.2, 0.25, 0.6]) { ctx.fillStyle = "#4a3a20"; ctx.fillRect(x + lx * r - 4, y + r * 0.35, 8, r * 0.5 + Math.sin(now / 90 + lx * 5) * 3); }
    box(ctx, x - r, y - r * 0.55, r * 2, r * 1.0, "#b8862a", "#4a3010", 3, r * 0.3);
    for (let i = 0; i < 5; i++) dot(ctx, x - r * 0.75 + i * r * 0.38, y - r * 0.38, 2.5, "#4a3010");     // 鉚釘
    box(ctx, x + f * r * 0.7 - r * 0.42, y - r * 0.95, r * 0.84, r * 0.7, "#c89a3a", "#4a3010", 3, 6);    // 頭
    dot(ctx, x + f * r * 0.88, y - r * 0.68, r * 0.11, "#ff5a2a");
    ctx.fillStyle = "#3a3a3e"; ctx.fillRect(x - f * r * 0.4 - 6, y - r * 1.2, 12, r * 0.7);               // 煙囪
    if (u.alive !== false) puff(ctx, x - f * r * 0.4, y - r * 1.35, r * 0.4, now, x);
    ctx.globalAlpha = 1;
  };
  // 鉚釘砲車：有履帶的方箱子，上面一門砲
  A.rivetTank = (ctx, u, p, now) => {
    const r = u.r, x = p.x, y = p.y + bob(u, now, 0.8), a = u.facing ?? Math.PI / 2;
    alive(ctx, u);
    box(ctx, x - r * 1.05, y + r * 0.25, r * 2.1, r * 0.55, "#2a2a2e", "#111", 2, r * 0.25);
    for (let i = 0; i < 6; i++) dot(ctx, x - r * 0.85 + i * r * 0.34, y + r * 0.52, 4, ((now / 120 + i) | 0) % 2 ? "#6a6a6e" : "#4a4a4e");
    box(ctx, x - r * 0.85, y - r * 0.55, r * 1.7, r * 0.9, "#8a6a3a", "#3a2a10", 3, 8);
    ctx.save(); ctx.translate(x, y - r * 0.15); ctx.rotate(a); ctx.fillStyle = "#3a3a3e"; ctx.fillRect(0, -7, r * 1.2, 14); ctx.fillStyle = "#c8962a"; ctx.fillRect(r * 1.1, -9, 8, 18); ctx.restore();
    gear(ctx, x, y - r * 0.15, r * 0.32, 8, now / 400, "#d8a840", "#4a3010");
    ctx.globalAlpha = 1;
  };
  // 蒸氣幽靈：一團蒸氣，上面浮著一個「？」（沒被做出來的點子）
  A.steamGhost = (ctx, u, p, now) => {
    const r = u.r, x = p.x, y = p.y + bob(u, now, 4);
    ctx.globalAlpha = u.alive === false ? 0.25 : 0.9;
    puff(ctx, x, y + r * 0.2, r * 1.1, now, x, 0.75);
    ctx.fillStyle = "#2a3a4a"; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.05, r * 0.12, 0, Math.PI * 2); ctx.arc(x + r * 0.3, y - r * 0.05, r * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#2a3a4a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y + r * 0.35, r * 0.2, Math.PI * 1.1, Math.PI * 1.9, true); ctx.stroke();
    ctx.fillStyle = "#f2c200"; ctx.font = `900 ${Math.round(r * 0.8)}px sans-serif`; ctx.textAlign = "center"; ctx.fillText("？", x, y - r * 0.85 + Math.sin(now / 300) * 3);
    ctx.globalAlpha = 1;
  };
  // 制動人偶船員：和玩家一樣的方塊（中間一個「偶」字），加上機械的特徵：黃銅的邊框、四角的鉚釘、側邊轉動的上鍊鑰匙、頭上一個小齒輪
  A.automatonCrew = (ctx, u, p, now) => {
    const r = u.r, x = p.x, y = p.y + bob(u, now, 1.5);
    alive(ctx, u);
    ctx.save(); ctx.translate(x + r * 1.05, y); ctx.rotate(u.alive === false ? 0 : now / 160);      // 上鍊鑰匙
    ctx.strokeStyle = "#c8962a"; ctx.lineWidth = Math.max(2, r * 0.14); ctx.beginPath(); ctx.moveTo(-r * 0.3, 0); ctx.lineTo(r * 0.3, 0); ctx.moveTo(0, -r * 0.3); ctx.lineTo(0, r * 0.3); ctx.stroke(); ctx.restore();
    gear(ctx, x, y - r * 1.05, r * 0.3, 8, u.alive === false ? 0 : -now / 300, "#d8a840", "#4a3010");
    box(ctx, x - r, y - r, r * 2, r * 2, "#efe6d2", "#8a6a2a", 4, Math.max(5, r * 0.3));
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) dot(ctx, x + dx * r * 0.72, y + dy * r * 0.72, Math.max(1.5, r * 0.09), "#8a6a2a");
    ctx.fillStyle = "#8a6a2a"; ctx.font = `900 ${Math.round(r * 0.8)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("偶", x, y); ctx.textBaseline = "alphabetic";
    ctx.globalAlpha = 1;
  };
  // 伊卡洛斯號：全機械的蒸氣飛艇。單位的位置＝地上的影子，飛艇畫在上面（高度越高越往上、影子越小）
  //   黃銅的艇身、兩側的機械翼（一片一片的金屬羽毛）、尾巴的螺旋槳、底下一直往下噴的蒸氣
  A.icarus = (ctx, u, p, now) => {
    const r = u.r, alt = u.state?.alt ?? 2, x = p.x, lift = 30 + alt * 16, y = p.y - lift + bob(u, now, 3);
    alive(ctx, u);
    ctx.fillStyle = `rgba(0,0,0,${0.32 - alt * 0.03})`; ctx.beginPath(); ctx.ellipse(p.x, p.y + r * 0.3, r * (1.3 - alt * 0.06), r * (0.42 - alt * 0.02), 0, 0, Math.PI * 2); ctx.fill();
    if (u.alive !== false) for (let i = 0; i < 2 + alt; i++) puff(ctx, x + (i - (1 + alt) / 2) * r * 0.35, y + r * 0.55 + ((now / 6 + i * 37) % lift), r * 0.28, now, i, 0.4);   // 往下噴的蒸氣
    // 機械翼（金屬羽毛，越飛越高越張開）
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) {
      const a = s * (0.25 + i * 0.12 + alt * 0.03) + Math.sin(now / 260) * 0.06 * s;
      ctx.save(); ctx.translate(x + s * r * 0.55, y - r * 0.1); ctx.rotate(a + (s < 0 ? Math.PI : 0));
      box(ctx, 0, -6, r * (1.05 - i * 0.08), 12, i % 2 ? "#d8a840" : "#e8c060", "#5a3a0a", 2, 5); ctx.restore();
    }
    // 艇身
    ctx.fillStyle = "#b8862a"; ctx.beginPath(); ctx.ellipse(x, y, r * 1.05, r * 0.52, 0, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = "#4a3010"; ctx.stroke();
    ctx.strokeStyle = "rgba(74,48,16,.55)"; ctx.lineWidth = 2; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(x + k * r * 0.32, y, r * 0.08, r * 0.5, 0, 0, Math.PI * 2); ctx.stroke(); }
    for (let k = 0; k < 7; k++) dot(ctx, x - r * 0.8 + k * r * 0.27, y - r * 0.32, 2.5, "#4a3010");
    // 吊艙（鍋爐的火、舷窗）
    box(ctx, x - r * 0.45, y + r * 0.3, r * 0.9, r * 0.42, "#6a4a2a", "#2a1a0a", 3, 6);
    const fell = u.state?.fell;
    dot(ctx, x, y + r * 0.5, r * 0.13, fell ? `rgba(255,${90 + 60 * Math.sin(now / 80)},20,1)` : "#e8682a");
    for (const dx of [-0.28, 0.28]) dot(ctx, x + dx * r, y + r * 0.5, r * 0.07, "#ffe8a0");
    // 尾巴的螺旋槳
    ctx.save(); ctx.translate(x - r * 1.1, y); ctx.rotate(now / 40); ctx.fillStyle = "#3a3a3e"; ctx.fillRect(-4, -r * 0.4, 8, r * 0.8); ctx.restore();
    gear(ctx, x + r * 0.15, y - r * 0.05, r * 0.2, 9, now / 300, "#e8c060", "#4a3010");
    ctx.fillStyle = "#fff4dc"; ctx.font = `900 ${Math.round(r * 0.22)}px sans-serif`; ctx.textAlign = "center"; ctx.fillText("ICARUS", x + r * 0.55, y + r * 0.08);
    ctx.globalAlpha = 1;
  };
  // 發明不出來的點子：一大團蒸氣，裡面浮著半張設計圖、好幾個問號
  A.ideaGhost = (ctx, u, p, now) => {
    const r = u.r, x = p.x, y = p.y + bob(u, now, 5);
    ctx.globalAlpha = u.alive === false ? 0.25 : 0.92;
    puff(ctx, x, y, r * 1.5, now, 0, 0.7);
    ctx.save(); ctx.translate(x, y - r * 0.1); ctx.rotate(Math.sin(now / 900) * 0.1);
    box(ctx, -r * 0.7, -r * 0.5, r * 1.4, r * 0.95, "rgba(60,110,170,.9)", "#e8f0f8", 2, 3);
    ctx.strokeStyle = "rgba(232,240,248,.8)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(-r * 0.2, 0, r * 0.25, 0, Math.PI * 1.4); ctx.moveTo(r * 0.1, -r * 0.3); ctx.lineTo(r * 0.55, -r * 0.3); ctx.moveTo(r * 0.1, -r * 0.1); ctx.lineTo(r * 0.45, -r * 0.1); ctx.stroke();
    ctx.fillStyle = "#e83a3a"; ctx.font = `900 ${Math.round(r * 0.28)}px sans-serif`; ctx.textAlign = "center"; ctx.fillText("退件", r * 0.25, r * 0.35);
    ctx.restore();
    for (let i = 0; i < 4; i++) { const t = now / 700 + i * 1.6; ctx.fillStyle = "#f2c200"; ctx.font = `900 ${Math.round(r * 0.4)}px sans-serif`; ctx.textAlign = "center"; ctx.fillText("？", x + Math.cos(t) * r * 1.1, y + Math.sin(t) * r * 0.7 - r * 0.2); }
    ctx.globalAlpha = 1;
  };

  // ===== 如此靜謐的蔚藍：戰鬥時是「人的樣子」（方塊），帶著魚的特徵 =====
  function person(ctx, u, p, now, o) {
    const r = u.r, x = p.x, y = p.y + bob(u, now, 2.5);
    alive(ctx, u);
    o.under?.(x, y, r);
    box(ctx, x - r, y - r, r * 2, r * 2, o.fill || "#f4f8ff", o.line, 4, Math.max(6, r * 0.35));
    ctx.fillStyle = o.line; ctx.font = `900 ${Math.round(r * 0.78)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(o.ch, x, y); ctx.textBaseline = "alphabetic";
    o.extra?.(x, y, r);
    ctx.globalAlpha = 1;
  }
  const fin = (ctx, x, y, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - r * 0.3, y - r); ctx.lineTo(x + r * 0.1, y - r * 1.55); ctx.lineTo(x + r * 0.45, y - r); ctx.closePath(); ctx.fill(); };
  const teeth = (ctx, x, y, r) => { ctx.fillStyle = "#fff"; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x - r * 0.6 + i * r * 0.3, y + r * 0.55); ctx.lineTo(x - r * 0.45 + i * r * 0.3, y + r * 0.85); ctx.lineTo(x - r * 0.3 + i * r * 0.3, y + r * 0.55); ctx.fill(); } };
  A.piranha = (ctx, u, p, now) => person(ctx, u, p, now, { line: "#c84a3a", ch: "食", fill: "#fff0ec", extra: (x, y, r) => { fin(ctx, x, y, r, "#c84a3a"); teeth(ctx, x, y, r); } });
  A.moray = (ctx, u, p, now) => person(ctx, u, p, now, { line: "#6a7a3a", ch: "鰻", fill: "#f4f6e8",
    under: (x, y, r) => { ctx.strokeStyle = "#6a7a3a"; ctx.lineWidth = r * 0.4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x, y + r); for (let i = 1; i <= 6; i++) ctx.lineTo(x + Math.sin(now / 200 + i) * r * 0.5, y + r + i * r * 0.22); ctx.stroke(); ctx.lineCap = "butt"; },
    extra: (x, y, r) => { teeth(ctx, x, y, r); ctx.fillStyle = "#f2c200"; ctx.beginPath(); ctx.moveTo(x - r * 0.9, y - r); ctx.lineTo(x - r * 0.6, y - r * 1.4); ctx.lineTo(x - r * 0.3, y - r); ctx.fill(); } });        // 謝幕的小帽子
  A.leopardSeal = (ctx, u, p, now) => person(ctx, u, p, now, { line: "#6a6a7a", ch: "豹", fill: "#eef0f4",
    extra: (x, y, r) => { ctx.fillStyle = "rgba(40,40,50,.45)"; for (const [dx, dy] of [[-0.6, -0.5], [0.5, -0.6], [-0.5, 0.5], [0.6, 0.4], [0, 0.7]]) { ctx.beginPath(); ctx.arc(x + dx * r, y + dy * r, r * 0.1, 0, Math.PI * 2); ctx.fill(); } } });
  A.angler = (ctx, u, p, now) => person(ctx, u, p, now, { line: "#3a3a5a", ch: "鮟", fill: "#e8e8f4",
    extra: (x, y, r) => { ctx.strokeStyle = "#3a3a5a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x + r * 0.2, y - r * 1.8, x + r * 0.8, y - r * 1.5); ctx.stroke();
      const g = ctx.createRadialGradient(x + r * 0.8, y - r * 1.5, 0, x + r * 0.8, y - r * 1.5, r * 0.6); g.addColorStop(0, "rgba(200,240,255,1)"); g.addColorStop(1, "rgba(120,200,255,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + r * 0.8, y - r * 1.5, r * 0.6, 0, Math.PI * 2); ctx.fill(); teeth(ctx, x, y, r); } });
  // 上流・大白鯊：戴紅面具的劊子手（方塊，中間「鯊」，背上一片背鰭、手邊一把刀）
  A.whiteShark = (ctx, u, p, now) => person(ctx, u, p, now, { line: "#5a6a7a", ch: "鯊", fill: "#f0f2f6",
    under: (x, y, r) => { fin(ctx, x - r * 0.1, y, r, "#6a7a8a"); },
    extra: (x, y, r) => { ctx.fillStyle = "rgba(200,40,40,.9)"; ctx.fillRect(x - r * 0.85, y - r * 0.55, r * 1.7, r * 0.3); ctx.strokeStyle = "#e8e8f0"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + r * 1.05, y + r * 0.4); ctx.lineTo(x + r * 1.4, y - r * 0.6); ctx.stroke(); teeth(ctx, x, y, r); } });
  // 虎鯨：沒有臉的飼育員（方塊上沒有字），背後的影子是一隻虎鯨
  A.orcaStar = (ctx, u, p, now) => {
    const r = u.r, x = p.x, y = p.y + bob(u, now, 2);
    alive(ctx, u);
    ctx.save(); ctx.globalAlpha *= 0.85; ctx.translate(x, y + r * 0.2); ctx.scale(1.9, 1);
    ctx.fillStyle = "#14141a"; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.5); ctx.lineTo(r * 0.15, -r * 1.25); ctx.lineTo(r * 0.35, -r * 0.45); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-r * 0.9, 0); ctx.lineTo(-r * 1.35, -r * 0.4); ctx.lineTo(-r * 1.35, r * 0.4); ctx.fill();
    ctx.fillStyle = "#f4f4f8"; ctx.beginPath(); ctx.ellipse(r * 0.5, -r * 0.12, r * 0.18, r * 0.08, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(r * 0.1, r * 0.3, r * 0.5, r * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    box(ctx, x - r * 0.45, y - r * 0.55, r * 0.9, r * 0.9, "#f4f4f8", "#1a1a22", 4, 8);             // 沒有臉的飼育員
    ctx.fillStyle = "#6a7a8a"; ctx.fillRect(x + r * 0.5, y - r * 0.1, r * 0.3, r * 0.35); ctx.strokeStyle = "#3a4a5a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + r * 0.65, y - r * 0.1, r * 0.15, Math.PI, 0); ctx.stroke();   // 空桶子
    ctx.globalAlpha = 1;
  };
  // 戰鬥背景：水缸裡（幽暗的藍、慢慢往上飄的泡泡、玻璃外面的眼睛）
  T.tank = {
    bg(g, W, H) {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#123a5a"); gr.addColorStop(1, "#040a14"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.strokeStyle = "rgba(160,220,255,.08)"; g.lineWidth = 3; for (let k = 0; k < 9; k++) { g.beginPath(); for (let x = 0; x <= W; x += 30) g.lineTo(x, 60 + k * 80 + Math.sin(x / 80 + k) * 10); g.stroke(); }
      g.strokeStyle = "rgba(200,235,255,.35)"; g.lineWidth = 8; g.strokeRect(20, 20, W - 40, H - 40);
    },
    draw(ctx, now, W, H) {
      for (let i = 0; i < 18; i++) { const x = (i * 157) % W + Math.sin(now / 900 + i) * 12, y = H - ((now / 30 + i * 61) % (H + 30)); ctx.strokeStyle = "rgba(200,235,255,.45)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 3 + (i % 3) * 2, 0, Math.PI * 2); ctx.stroke(); }
      // 玻璃外面的眼睛（觀眾）
      for (let i = 0; i < 8; i++) { const x = 60 + i * ((W - 120) / 7), y = i % 2 ? 36 : H - 36, o = 0.25 + 0.25 * Math.sin(now / 700 + i * 1.7); ctx.fillStyle = `rgba(255,255,255,${o})`; ctx.beginPath(); ctx.ellipse(x - 8, y, 5, 3, 0, 0, Math.PI * 2); ctx.ellipse(x + 8, y, 5, 3, 0, 0, Math.PI * 2); ctx.fill(); }
    },
  };

  // ===== 原始水域：照物種本來的樣子（js/sea-art.js） =====
  const WILD = { wSardine: "沙丁魚群", wIcefish: "冰魚", wLantern: "燈籠魚", wLoach: "泥鰍", wBarracuda: "梭魚", wSeal: "海豹", wViper: "蝰魚", wGar: "鱷雀鱔", wGhostFish: "幽靈魚",
    megalodon: "巨齒鯊", livyatan: "利維坦鯨", dunkleosteus: "鄧氏魚", deinosuchus: "恐鱷", mosasaur: "滄龍" };
  for (const [kind, sp] of Object.entries(WILD)) A[kind] = (ctx, u, p, now) => {
    ctx.globalAlpha = u.alive === false ? 0.3 : 1;
    const big = u.r >= 50;
    R.SeaArt?.draw(ctx, sp, p.x, p.y + bob(u, now, 2), u.r * (big ? 0.75 : 0.85), u.facing ?? 0, u.alive === false ? 0 : now, null, (u.x || 0) / 50);
    ctx.globalAlpha = 1;
  };
  T.wildwater = {
    bg(g, W, H) {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#0e3a4a"); gr.addColorStop(1, "#06141c"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = "rgba(40,80,60,.35)"; for (let i = 0; i < 14; i++) { const x = (i * 97) % W; g.beginPath(); g.moveTo(x, H); g.quadraticCurveTo(x + 20, H - 120, x - 10, H - 200 - (i % 4) * 30); g.lineTo(x + 8, H); g.fill(); }
      g.strokeStyle = "rgba(200,235,255,.12)"; g.lineWidth = 6; g.strokeRect(20, 20, W - 40, H - 40);      // 看起來還是一個大水缸
    },
    draw(ctx, now, W, H) {
      ctx.strokeStyle = "rgba(255,255,255,.05)"; ctx.lineWidth = 3;
      for (let k = 0; k < 6; k++) { ctx.beginPath(); for (let x = 0; x <= W; x += 40) ctx.lineTo(x, 80 + k * 110 + Math.sin(x / 90 + now / 800 + k) * 12); ctx.stroke(); }
      for (let i = 0; i < 12; i++) { const x = (i * 173) % W, y = H - ((now / 28 + i * 71) % (H + 30)); ctx.strokeStyle = "rgba(200,235,255,.35)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 2 + (i % 3) * 2, 0, Math.PI * 2); ctx.stroke(); }
    },
  };

  // 戰鬥背景：黃銅平台（齒輪城）、冷卻工廠
  T.brass = {
    bg(g, W, H) {
      g.fillStyle = "#3a2c1c"; g.fillRect(0, 0, W, H);
      g.fillStyle = "#6a5030"; g.fillRect(60, 40, W - 120, H - 80);
      g.strokeStyle = "rgba(30,20,10,.45)"; g.lineWidth = 2; for (let x = 60; x < W - 60; x += 120) { g.beginPath(); g.moveTo(x, 40); g.lineTo(x, H - 40); g.stroke(); }
      g.fillStyle = "rgba(30,20,10,.5)"; for (let x = 70; x < W - 60; x += 40) { g.beginPath(); g.arc(x, 52, 3, 0, Math.PI * 2); g.arc(x, H - 52, 3, 0, Math.PI * 2); g.fill(); }
      for (const [x, y, r] of [[120, 120, 70], [W - 140, 160, 90], [160, H - 130, 60], [W - 120, H - 110, 70]]) gear(g, x, y, r, 12, 0.2, "rgba(200,150,60,.25)", "rgba(40,28,12,.4)");
    },
    draw(ctx, now, W, H) { for (let i = 0; i < 6; i++) puff(ctx, (i * 251) % W, H - ((now / 25 + i * 130) % (H + 80)), 20, now, i, 0.18); },
  };
  T.coolant = {
    bg(g, W, H) {
      g.fillStyle = "#1a2a34"; g.fillRect(0, 0, W, H);
      g.strokeStyle = "rgba(90,170,210,.25)"; g.lineWidth = 2; for (let y = 0; y < H; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      for (const y of [90, H - 90]) { g.fillStyle = "#4a6a7a"; g.fillRect(0, y - 16, W, 32); g.fillStyle = "rgba(160,220,255,.4)"; g.fillRect(0, y - 4, W, 8); }
      for (const x of [140, W - 140]) { g.fillStyle = "#3a5a6a"; g.fillRect(x - 18, 0, 36, H); }
    },
    draw(ctx, now, W, H) { for (let i = 0; i < 14; i++) { const x = (i * 97 + now / 20) % W; ctx.fillStyle = "rgba(160,230,255,.5)"; ctx.fillRect(x, 86, 10, 8); ctx.fillRect(W - x, H - 94, 10, 8); } },
  };
})();
