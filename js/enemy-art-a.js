/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/enemy-art-a.js": "20261114042342" });
// A 級時空的戰鬥造型和戰鬥背景（目前：#LI44444 李家大宅）
// R.EnemyArt[kind](ctx, u, p, now)；R.Terrains[terrain]：bg(g, W, H) 畫一次、draw(ctx, now, W, H) 每一格都畫
(function () {
  const R = (window.RPG = window.RPG || {});
  const A = (R.EnemyArt = R.EnemyArt || {});
  const T = (R.Terrains = R.Terrains || {});
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function box(ctx, x, y, w, h, fill, stroke, lw = 3, r = 6) { rr(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); } }
  function dot(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  const alive = (ctx, u) => { ctx.globalAlpha = u.alive === false ? 0.3 : 1; };
  const sway = (u, now, k = 2) => Math.sin(now / 520 + (u.x || 0)) * k;

  // ===== 紙紮人：一張紙糊的方塊，畫上去的眼睛、兩團胭脂，頭上一頂紙帽 =====
  A.paperMan = (ctx, u, p, now) => {
    const r = u.r, x = p.x + sway(u, now, 1.5), y = p.y + Math.sin(now / 700 + (u.x || 0)) * 2;     // 輕飄飄的
    alive(ctx, u);
    ctx.fillStyle = "rgba(0,0,0,.15)"; ctx.beginPath(); ctx.ellipse(p.x, p.y + r * 1.15, r * 0.8, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    box(ctx, x - r, y - r, r * 2, r * 2, "#f4f0e6", "#8a8070", 3, r * 0.2);
    // 紙的摺痕和竹骨
    ctx.strokeStyle = "rgba(138,128,112,.45)"; ctx.lineWidth = 1.2;
    for (const k of [-0.4, 0.3]) { ctx.beginPath(); ctx.moveTo(x - r, y + r * k); ctx.lineTo(x + r, y + r * (k + 0.08)); ctx.stroke(); }
    // 畫上去的眼睛（一直在笑）、胭脂、小嘴
    ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 2.2;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(x + s * r * 0.36, y - r * 0.18, r * 0.16, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    dot(ctx, x - r * 0.55, y + r * 0.15, r * 0.17, "rgba(220,40,60,.75)"); dot(ctx, x + r * 0.55, y + r * 0.15, r * 0.17, "rgba(220,40,60,.75)");
    dot(ctx, x, y + r * 0.42, r * 0.09, "#c40a1e");
    // 紙帽
    box(ctx, x - r * 0.9, y - r * 1.35, r * 1.8, r * 0.42, "#1d1d1f", null, 0, 3);
    dot(ctx, x, y - r * 1.4, r * 0.12, "#c40a1e");
    ctx.globalAlpha = 1;
  };
  A.paperMan.top = 26;

  // ===== 試煉 Boss「囍」=====
  // 骨：王小妹的骨骸，披著紅紗（坐在喜轎上的那個）
  A.xiBone = (ctx, u, p, now) => {
    const r = u.r, x = p.x, y = p.y + Math.sin(now / 900) * 3;
    alive(ctx, u);
    ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(p.x, p.y + r * 1.2, r * 0.9, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    // 骨頭：方方的頭骨、肋骨、細細的手骨
    const bone = "#ece6d6", line = "#6a5a4a";
    box(ctx, x - r * 0.55, y - r * 1.05, r * 1.1, r * 0.95, bone, line, 3, r * 0.22);                        // 頭骨
    dot(ctx, x - r * 0.22, y - r * 0.62, r * 0.17, "#1a0a0a"); dot(ctx, x + r * 0.22, y - r * 0.62, r * 0.17, "#1a0a0a");
    ctx.fillStyle = "#1a0a0a"; ctx.beginPath(); ctx.moveTo(x, y - r * 0.45); ctx.lineTo(x - r * 0.07, y - r * 0.32); ctx.lineTo(x + r * 0.07, y - r * 0.32); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = line; ctx.lineWidth = 1.5; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * r * 0.1, y - r * 0.2); ctx.lineTo(x + i * r * 0.1, y - r * 0.12); ctx.stroke(); }
    ctx.strokeStyle = bone; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, y - r * 0.1); ctx.lineTo(x, y + r * 0.9); ctx.stroke();                         // 脊椎
    for (let i = 0; i < 4; i++) { const yy = y + r * 0.05 + i * r * 0.2, w = r * (0.6 - i * 0.08); ctx.beginPath(); ctx.moveTo(x - w, yy + r * 0.08); ctx.quadraticCurveTo(x, yy - r * 0.08, x + w, yy + r * 0.08); ctx.stroke(); }
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * r * 0.5, y); ctx.lineTo(x + s * r * 0.95, y + r * 0.55 + Math.sin(now / 500 + s) * 4); ctx.lineTo(x + s * r * 1.05, y + r * 0.85); ctx.stroke(); }
    // 紅紗：從頭頂披下來，半透明，邊緣一直飄
    ctx.fillStyle = "rgba(200,16,30,.42)"; ctx.strokeStyle = "rgba(232,40,50,.8)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y - r * 1.3);
    for (let i = 0; i <= 10; i++) { const k = i / 10, xx = x - r * 1.35 + k * r * 2.7, yy = y + r * 1.15 + Math.sin(now / 300 + i) * 5 + (i % 2) * 6; ctx.lineTo(xx, yy); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#e8b84a"; ctx.font = `900 ${Math.round(r * 0.42)}px serif`; ctx.textAlign = "center"; ctx.fillText("囍", x, y - r * 1.12);
    ctx.globalAlpha = 1;
  };
  A.xiBone.top = 56;
  // 皮肉：王小妹的皮肉，一團一團蠕動、爬行（戴著新郎的紅花球）
  A.xiFlesh = (ctx, u, p, now) => {
    const r = u.r, x = p.x, y = p.y;
    alive(ctx, u);
    ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.beginPath(); ctx.ellipse(x, y + r * 0.9, r * 1.1, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    // 好幾團肉黏在一起，各自起伏
    const lumps = [[0, 0, 0.95], [-0.6, 0.25, 0.6], [0.62, 0.22, 0.62], [-0.25, -0.55, 0.55], [0.35, -0.5, 0.5]];
    for (const [dx, dy, s] of lumps) {
      const k = 1 + Math.sin(now / 260 + dx * 4 + dy * 3) * 0.06;
      ctx.fillStyle = "#c86a6a"; ctx.strokeStyle = "#5a1a1a"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(x + dx * r, y + dy * r, r * s * k, r * s * 0.85 * k, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    // 血管
    ctx.strokeStyle = "rgba(120,10,20,.7)"; ctx.lineWidth = 1.6;
    for (let i = 0; i < 5; i++) { const a = i * 1.25 + 0.3; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2); ctx.quadraticCurveTo(x + Math.cos(a + 0.4) * r * 0.5, y + Math.sin(a + 0.4) * r * 0.5, x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.7); ctx.stroke(); }
    // 一道裂開的口
    ctx.fillStyle = "#3a0006"; ctx.beginPath(); ctx.ellipse(x, y + r * 0.15, r * 0.35, r * (0.06 + 0.05 * Math.abs(Math.sin(now / 400))), 0, 0, Math.PI * 2); ctx.fill();
    // 新郎的紅花球（斜掛的紅綢）
    ctx.strokeStyle = "#d81424"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x - r * 0.9, y - r * 0.6); ctx.lineTo(x + r * 0.8, y + r * 0.6); ctx.stroke();
    ctx.fillStyle = "#e8263a"; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.beginPath(); ctx.arc(x - r * 0.05 + Math.cos(a) * r * 0.18, y - r * 0.02 + Math.sin(a) * r * 0.18, r * 0.16, 0, Math.PI * 2); ctx.fill(); }
    dot(ctx, x - r * 0.05, y - r * 0.02, r * 0.14, "#b0101a");
    ctx.globalAlpha = 1;
  };
  A.xiFlesh.top = 48;

  // ===== 戰鬥背景：喜堂（試煉 Boss「囍」）=====
  T.xiHall = {
    bg(g, W, H) {
      g.fillStyle = "#2a0608"; g.fillRect(0, 0, W, H);
      g.strokeStyle = "rgba(120,20,30,.35)"; g.lineWidth = 2;
      for (let y = 0; y < H; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      // 後牆的大囍字
      g.fillStyle = "rgba(232,184,74,.16)"; g.font = "900 300px serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("囍", W / 2, H / 2 - 20); g.textBaseline = "alphabetic";
      g.fillStyle = "#4a0a0e"; g.fillRect(0, 0, W, 60);
      for (const x of [80, W - 80]) { g.fillStyle = "#1a0204"; g.fillRect(x - 14, 0, 28, H); }
    },
    draw(ctx, now, W, H) {
      // 紅燭（左右兩排）
      for (const x of [140, W - 140]) for (let i = 0; i < 4; i++) {
        const y = 140 + i * 140;
        ctx.fillStyle = "#c40a1e"; ctx.fillRect(x - 6, y, 12, 34);
        const f = 1 + Math.sin(now / 120 + i + x) * 0.15;
        ctx.fillStyle = "rgba(255,180,60,.25)"; ctx.beginPath(); ctx.arc(x, y - 6, 26 * f, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ffcc5a"; ctx.beginPath(); ctx.ellipse(x, y - 6, 4, 8 * f, 0, 0, Math.PI * 2); ctx.fill();
      }
      // 從天花板垂下來的紅綢
      for (let i = 0; i < 6; i++) { const x = 200 + i * ((W - 400) / 5); ctx.strokeStyle = "rgba(216,20,36,.55)"; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x, 60); ctx.quadraticCurveTo(x + Math.sin(now / 900 + i) * 20, 120, x + 30, 160); ctx.stroke(); }
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.55)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    },
  };

  // ===== 戰鬥背景：夜裡的中式庭院（青磚、紅燈籠、白色的喪幡） =====
  T.mansion = {
    bg(g, W, H) {
      g.fillStyle = "#1e1c1e"; g.fillRect(0, 0, W, H);
      g.strokeStyle = "rgba(90,86,92,.35)"; g.lineWidth = 2;
      for (let y = 0; y < H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); for (let x = (y / 40) % 2 ? 0 : 40; x < W; x += 80) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 40); g.stroke(); } }
      // 上方：屋簷和柱子
      g.fillStyle = "#2a1414"; g.fillRect(0, 0, W, 70);
      g.fillStyle = "#3a1a1a"; for (let x = 60; x < W; x += 240) g.fillRect(x, 0, 26, 110);
      g.fillStyle = "#1a0a0a"; g.fillRect(0, 62, W, 10);
    },
    draw(ctx, now, W, H) {
      // 紅燈籠（輕輕晃）
      for (let i = 0; i < 5; i++) {
        const x = 120 + i * 260 + Math.sin(now / 900 + i) * 4, y = 96;
        ctx.strokeStyle = "#1a0a0a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 66); ctx.lineTo(x, y - 18); ctx.stroke();
        ctx.fillStyle = "rgba(255,80,60,.12)"; ctx.beginPath(); ctx.arc(x, y, 60, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#c4141e"; ctx.beginPath(); ctx.ellipse(x, y, 16, 20, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#e8b84a"; ctx.fillRect(x - 8, y - 22, 16, 4); ctx.fillRect(x - 8, y + 18, 16, 4);
      }
      // 地上飄過的紙錢
      for (let i = 0; i < 9; i++) {
        const t = (now / 9000 + i / 9) % 1, x = (i * 173 + t * 300) % W, y = 140 + ((i * 91) % (H - 180)) + Math.sin(now / 700 + i) * 10;
        ctx.save(); ctx.translate(x, y); ctx.rotate(now / 1200 + i); ctx.fillStyle = "rgba(232,220,170,.55)"; ctx.fillRect(-6, -6, 12, 12); ctx.restore();
      }
      // 四周的黑暗
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.6)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    },
  };

  // ===== #LG00412 傳說的道路 =====
  // 青銅怪鳥：斯廷法羅斯的怪鳥，羽毛是青銅做的
  A.bronzeBird = (ctx, u, p, now) => {
    const r = u.r, x = p.x, y = p.y - 8 + Math.sin(now / 200 + (u.x || 0)) * 4, flap = Math.sin(now / 90 + (u.x || 0));
    alive(ctx, u);
    ctx.fillStyle = "rgba(0,0,0,.15)"; ctx.beginPath(); ctx.ellipse(p.x, p.y + r, r * 0.8, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    for (const s of [-1, 1]) {                                                         // 翅膀（一片一片的青銅羽毛）
      ctx.fillStyle = "#c8963a"; ctx.strokeStyle = "#5a3a10"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + s * r * 0.4, y); ctx.lineTo(x + s * r * 1.6, y - r * (0.5 + flap * 0.5)); ctx.lineTo(x + s * r * 1.3, y + r * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + s * r * (0.4 + i * 0.28), y - r * (0.1 + i * 0.12) * (0.5 + flap * 0.5)); ctx.lineTo(x + s * r * (0.4 + i * 0.28), y + r * 0.15); ctx.stroke(); }
    }
    ctx.fillStyle = "#b8863a"; ctx.beginPath(); ctx.ellipse(x, y, r * 0.65, r * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#5a3a10"; ctx.lineWidth = 3; ctx.stroke();
    dot(ctx, x - r * 0.2, y - r * 0.15, r * 0.1, "#1d1d1f"); dot(ctx, x + r * 0.2, y - r * 0.15, r * 0.1, "#1d1d1f");
    ctx.fillStyle = "#6a6a72"; ctx.beginPath(); ctx.moveTo(x - r * 0.12, y + r * 0.05); ctx.lineTo(x + r * 0.12, y + r * 0.05); ctx.lineTo(x, y + r * 0.45); ctx.closePath(); ctx.fill();   // 鐵喙
    ctx.globalAlpha = 1;
  };
  A.bronzeBird.top = 30;
  // 半人馬：上半身是人（和玩家一樣的方塊），下半身是馬
  A.centaur = (ctx, u, p, now) => {
    const r = u.r, x = p.x, y = p.y, step = Math.sin(now / 160 + (u.x || 0));
    alive(ctx, u);
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(x, y + r * 1.05, r * 1.3, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#4a3018"; ctx.lineWidth = 5;
    for (const [dx, k] of [[-0.9, 1], [-0.55, -1], [0.55, 1], [0.9, -1]]) { ctx.beginPath(); ctx.moveTo(x + dx * r, y + r * 0.35); ctx.lineTo(x + dx * r + step * k * 5, y + r * 1.0); ctx.stroke(); }
    box(ctx, x - r * 1.15, y - r * 0.15, r * 2.3, r * 0.65, "#8a6a4a", "#4a3018", 3, r * 0.3);          // 馬身
    ctx.strokeStyle = "#3a2410"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + r * 1.1, y); ctx.quadraticCurveTo(x + r * 1.5, y + r * 0.1 + step * 4, x + r * 1.45, y + r * 0.55); ctx.stroke();   // 尾巴
    box(ctx, x - r * 1.1, y - r * 1.15, r * 1.0, r * 1.0, "#fffaf0", "#8a6a4a", 3, r * 0.22);            // 上半身（方塊）
    ctx.fillStyle = "#3a2410"; ctx.fillRect(x - r * 1.1, y - r * 1.2, r * 1.0, r * 0.22);                // 頭髮
    dot(ctx, x - r * 0.8, y - r * 0.72, r * 0.06, "#1d1d1f"); dot(ctx, x - r * 0.42, y - r * 0.72, r * 0.06, "#1d1d1f");
    ctx.fillStyle = "#c84a5a"; ctx.beginPath(); ctx.ellipse(x - r * 0.15, y - r * 0.45, r * 0.12, r * 0.18, 0.4, 0, Math.PI * 2); ctx.fill();   // 酒壺
    ctx.globalAlpha = 1;
  };
  A.centaur.top = 32;
  // 不肯認輸的獅子：像真言之口一樣，整隻是白色的大理石，沒有臉（臉的地方是一片光滑的白）
  A.prideLion = (ctx, u, p, now) => {
    const r = u.r, x = p.x, y = p.y + Math.sin(now / 700) * 2;
    alive(ctx, u);
    const W1 = "#f4f1ea", W2 = "#dcd6ca", LN = "#a8a090";
    ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(x, y + r * 0.95, r * 1.2, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    // 身體＋尾巴
    box(ctx, x - r * 0.9, y - r * 0.05, r * 1.8, r * 0.85, W1, LN, 3, r * 0.35);
    ctx.strokeStyle = LN; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + r * 0.85, y + r * 0.2); ctx.quadraticCurveTo(x + r * 1.4, y - r * 0.2 + Math.sin(now / 300) * 6, x + r * 1.3, y - r * 0.55); ctx.stroke();
    dot(ctx, x + r * 1.3, y - r * 0.6, r * 0.12, W2);
    // 鬃毛：一圈刻出來的大理石捲髮
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; dot(ctx, x - r * 0.25 + Math.cos(a) * r * 0.62, y - r * 0.55 + Math.sin(a) * r * 0.58, r * 0.28, i % 2 ? W2 : "#e8e4da"); }
    ctx.strokeStyle = LN; ctx.lineWidth = 1.2; for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; ctx.beginPath(); ctx.arc(x - r * 0.25 + Math.cos(a) * r * 0.62, y - r * 0.55 + Math.sin(a) * r * 0.58, r * 0.16, a, a + 3); ctx.stroke(); }
    // 臉：光滑的一片白，什麼都沒有
    ctx.fillStyle = "#fbfaf6"; ctx.beginPath(); ctx.ellipse(x - r * 0.25, y - r * 0.55, r * 0.4, r * 0.44, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(168,160,144,.6)"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.globalAlpha = 1;
  };
  A.prideLion.top = 54;
  // 酒神狄俄倪索斯：和玩家一樣的方塊（人形的神），頭上一圈葡萄藤冠、臉頰醉紅，手上一杯酒
  A.dionysus = (ctx, u, p, now) => {
    const r = u.r, x = p.x + Math.sin(now / 500) * 3, y = p.y + Math.abs(Math.sin(now / 350)) * -3;      // 搖搖晃晃
    alive(ctx, u);
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(p.x, p.y + r * 1.1, r * 0.9, r * 0.24, 0, 0, Math.PI * 2); ctx.fill();
    box(ctx, x - r, y - r, r * 2, r * 2, "#fffaf0", "#7a3a8a", 4, r * 0.3);
    ctx.fillStyle = "#9a5ab0"; ctx.fillRect(x - r, y + r * 0.25, r * 2, r * 0.75);                          // 紫色的長袍
    ctx.strokeStyle = "#e8c84a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - r, y + r * 0.25); ctx.lineTo(x + r, y + r * 0.25); ctx.stroke();
    // 醉紅的臉頰、瞇瞇眼、笑
    dot(ctx, x - r * 0.5, y - r * 0.05, r * 0.16, "rgba(232,90,110,.6)"); dot(ctx, x + r * 0.5, y - r * 0.05, r * 0.16, "rgba(232,90,110,.6)");
    ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 2.2;
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(x + sd * r * 0.32, y - r * 0.28, r * 0.13, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(x, y + r * 0.02, r * 0.2, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    // 葡萄藤冠
    ctx.strokeStyle = "#5a8a3a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - r * 1.05, y - r * 0.85); ctx.quadraticCurveTo(x, y - r * 1.25, x + r * 1.05, y - r * 0.85); ctx.stroke();
    for (let i = 0; i < 5; i++) { const lx = x - r * 0.9 + i * r * 0.45; ctx.fillStyle = "#6a9a4a"; ctx.beginPath(); ctx.ellipse(lx, y - r * 1.02 - Math.sin(i) * 3, r * 0.16, r * 0.1, i, 0, Math.PI * 2); ctx.fill(); }
    for (let i = 0; i < 6; i++) dot(ctx, x + r * 0.7 + (i % 3) * r * 0.12, y - r * 0.8 + Math.floor(i / 3) * r * 0.13 + (i % 3) * 2, r * 0.08, "#6a2a7a");   // 一串葡萄
    // 手上的酒杯
    const cx = x + r * 1.2, cy = y + r * 0.1 + Math.sin(now / 300) * 3;
    ctx.fillStyle = "#c8a040"; ctx.beginPath(); ctx.moveTo(cx - 10, cy - 8); ctx.lineTo(cx + 10, cy - 8); ctx.quadraticCurveTo(cx + 9, cy + 3, cx, cy + 4); ctx.quadraticCurveTo(cx - 9, cy + 3, cx - 10, cy - 8); ctx.fill();
    ctx.fillStyle = "#6a1a5a"; ctx.beginPath(); ctx.ellipse(cx, cy - 7, 9, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#c8a040"; ctx.fillRect(cx - 1.5, cy + 4, 3, 7);
    ctx.globalAlpha = 1;
  };
  A.dionysus.top = 44;
  // 戰鬥背景：大理石的廣場、柱子、橄欖樹
  T.polis = {
    bg(g, W, H) {
      g.fillStyle = "#e8e2d4"; g.fillRect(0, 0, W, H);
      g.strokeStyle = "rgba(160,150,130,.35)"; g.lineWidth = 2;
      for (let x = 0; x < W; x += 80) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      for (let y = 0; y < H; y += 80) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      g.fillStyle = "#cfc6b0"; g.fillRect(0, 0, W, 70);
      for (let x = 70; x < W; x += 190) { g.fillStyle = "#f4efe4"; g.fillRect(x - 16, 0, 32, 120); g.fillStyle = "#d8d0bc"; for (let k = -10; k <= 10; k += 7) g.fillRect(x + k, 0, 2, 120); g.fillStyle = "#e8e2d4"; g.fillRect(x - 22, 112, 44, 10); }
      for (const [x, y] of [[90, H - 90], [W - 90, H - 110], [W - 120, 300]]) { g.fillStyle = "#6a5a3a"; g.fillRect(x - 5, y, 10, 40); g.fillStyle = "#7a9a5a"; for (const [dx, dy, rr] of [[0, -10, 30], [-22, 4, 22], [22, 2, 24]]) { g.beginPath(); g.arc(x + dx, y + dy, rr, 0, Math.PI * 2); g.fill(); } }
    },
    draw(ctx, now, W, H) { for (let i = 0; i < 6; i++) { const x = (i * 241 + now / 40) % (W + 40) - 20, y = 160 + ((i * 131) % (H - 220)); ctx.fillStyle = "rgba(120,150,80,.5)"; ctx.beginPath(); ctx.ellipse(x, y + Math.sin(now / 500 + i) * 6, 6, 3, now / 600 + i, 0, Math.PI * 2); ctx.fill(); } },
  };

  // ===== #KN59810 克亞貝魯巴斯諾（像素風） =====
  const px = (ctx, x, y, s, rows, pal) => { for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) { const c = pal[rows[j][i]]; if (c) { ctx.fillStyle = c; ctx.fillRect(x + i * s, y + j * s, s, s); } } };
  const JET = ["...a...", "..aba..", ".aabaa.", "aaabaaa", "a.aaa.a", "..c.c.."];
  const GRUNT = [".aaaa.", "abaaba", "aaaaaa", "a.aa.a", "aa..aa"];
  A.pixelJet = (ctx, u, p, now) => { alive(ctx, u); const s = u.r / 3.2; ctx.save(); ctx.translate(p.x, p.y + Math.sin(now / 200 + (u.x || 0)) * 2); ctx.rotate(Math.PI); px(ctx, -3.5 * s, -3 * s, s, JET, { a: "#e83a8a", b: "#fff", c: now % 200 < 100 ? "#ffd84a" : "#ff8a2a" }); ctx.restore(); ctx.globalAlpha = 1; };
  A.pixelJet.top = 24;
  A.pixelGrunt = (ctx, u, p, now) => { alive(ctx, u); const s = u.r / 2.8; px(ctx, p.x - 3 * s, p.y - 2.5 * s + (Math.floor(now / 250) % 2) * 2, s, GRUNT, { a: "#3ab0e8", b: "#1d1d1f" }); ctx.globalAlpha = 1; };
  A.pixelGrunt.top = 22;
  // 銀河大元帥的戰機：紫色的大型戰艦、金色的裝甲、中間一顆閃爍的紅星，頂著一頂元帥帽
  const MARSHAL = ["......aaaa......", "....aabbbbaa....", "..aaabbccbbaaa..", "aaaabbbccbbbaaaa", "addaaabbbbaaadda", "a..aaaaddaaaa..a", ".....aa..aa....."];
  A.galaxyMarshal = (ctx, u, p, now) => {
    alive(ctx, u); const s = u.r / 7.5, y = p.y + Math.sin(now / 300) * 3;
    ctx.fillStyle = "rgba(200,106,255,.18)"; ctx.beginPath(); ctx.ellipse(p.x, y + 4, u.r * 1.3, u.r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    px(ctx, p.x - 8 * s, y - 3.5 * s, s, MARSHAL, { a: "#6a3ab8", b: "#ffd84a", c: Math.floor(now / 150) % 2 ? "#ff3a5a" : "#ffffff", d: "#c8c8e8" });
    ctx.fillStyle = "#1d1d3a"; ctx.fillRect(p.x - 3 * s, y - 6 * s, 6 * s, 2.5 * s); ctx.fillRect(p.x - 4 * s, y - 4 * s, 8 * s, s);        // 元帥帽
    ctx.fillStyle = "#ffd84a"; ctx.font = `900 ${Math.round(s * 2)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("★", p.x, y - 4.8 * s); ctx.textBaseline = "alphabetic";
    ctx.globalAlpha = 1;
  };
  A.galaxyMarshal.top = 50;
  T.arcade = {
    bg(g, W, H) {
      g.fillStyle = "#0a0a24"; g.fillRect(0, 0, W, H);
      g.strokeStyle = "rgba(90,120,255,.18)"; g.lineWidth = 1;
      for (let x = 0; x < W; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      for (let y = 0; y < H; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    },
    draw(ctx, now, W, H) {
      for (let i = 0; i < 40; i++) { const x = (i * 157) % W, y = (i * 91 + now / (6 + (i % 3) * 4)) % H; ctx.fillStyle = i % 3 ? "#8ab0ff" : "#fff"; ctx.fillRect(x, y, 2 + (i % 2), 2 + (i % 2)); }
      ctx.fillStyle = "rgba(0,0,0,.12)"; for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);    // 掃描線
    },
  };
  // ===== 護送戰要保護的東西（R.WardArt[def.art]）：櫥窗、病床、雲團 =====
  const wardBar = (ctx, u, x, y, w = 70, col = "#c98a2a") => {
    if (!u.alive) return;
    ctx.fillStyle = "#ece8df"; ctx.fillRect(x - w / 2, y, w, 7);
    ctx.fillStyle = u.hp / u.maxHp > 0.4 ? col : "#e53935"; ctx.fillRect(x - w / 2, y, w * (u.hp / u.maxHp), 7);
    ctx.strokeStyle = "#3a2a1a"; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2, y, w, 7);
  };
  R.WardArt = {
    // 精品店的櫥窗：金色的框、玻璃反光、裡面擺著包包；破了就是碎玻璃
    window(ctx, u, p, now, h) {
      const w = 92, hh = 70, x = p.x - w / 2, y = p.y - hh / 2;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(x + 4, y + hh, w, 8);
      ctx.fillStyle = "#2a2a30"; ctx.fillRect(x - 6, y - 6, w + 12, hh + 12);
      ctx.fillStyle = "#c8a84a"; ctx.fillRect(x - 6, y - 6, w + 12, 6); ctx.fillRect(x - 6, y + hh, w + 12, 6);
      if (u.alive) {
        const k = u.hp / u.maxHp;
        ctx.fillStyle = "#cfe6f0"; ctx.fillRect(x, y, w, hh);
        ctx.fillStyle = "#8a4a6a"; ctx.fillRect(x + 18, y + 34, 22, 20); ctx.fillStyle = "#c8a84a"; ctx.fillRect(x + 52, y + 30, 24, 24);
        ctx.strokeStyle = "#8a4a6a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + 29, y + 34, 7, Math.PI, 0); ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + 10, y + hh - 10); ctx.lineTo(x + 36, y + 8); ctx.stroke();
        if (k < 0.7) { ctx.strokeStyle = "#5a6a7a"; ctx.lineWidth = 1.5; ctx.beginPath(); const cx = x + w * 0.65, cy = y + hh * 0.4; for (let i = 0; i < (k < 0.4 ? 7 : 4); i++) { const a = i * 0.9 + 0.3; ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 40, cy + Math.sin(a) * 30); } ctx.stroke(); }
      } else {
        ctx.fillStyle = "#1a1a20"; ctx.fillRect(x, y, w, hh);
        ctx.fillStyle = "#cfe6f0"; for (let i = 0; i < 9; i++) { ctx.beginPath(); const bx = x + ((i * 37) % w), by = y + hh - 4 + (i % 3) * 4; ctx.moveTo(bx, by); ctx.lineTo(bx + 8, by - 6); ctx.lineTo(bx + 12, by + 2); ctx.closePath(); ctx.fill(); }
      }
      ctx.restore();
      h.label(u.name, p.x, y + hh + 22, u.alive ? "#3a2a1a" : "#8a8478", 12);
      wardBar(ctx, u, p.x, y - 18);
    },
    // 推著的病床：白色床單、躺著的病人、點滴架
    bed(ctx, u, p, now, h) {
      const w = 96, hh = 46, x = p.x - w / 2, y = p.y - hh / 2;
      ctx.save(); ctx.globalAlpha = u.alive ? 1 : 0.45;
      ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(x + 4, y + hh + 6, w, 8);
      for (const dx of [8, w - 8]) { ctx.fillStyle = "#3a3a3a"; ctx.beginPath(); ctx.arc(x + dx, y + hh + 6, 6, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#b8c0c8"; ctx.fillRect(x, y + hh - 6, w, 8);
      ctx.fillStyle = "#f4f6f8"; h.roundRect(x, y, w, hh - 4, 6); ctx.fill(); ctx.strokeStyle = "#8a96a2"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "#fffaf0"; h.roundRect(x + 6, y + 8, 20, 20, 4); ctx.fill(); ctx.strokeStyle = "#5a8ac8"; ctx.lineWidth = 2; ctx.stroke();      // 病人（方塊）
      ctx.fillStyle = "#cfe0ea"; ctx.fillRect(x + 28, y + 6, w - 36, hh - 16);                                                            // 被子
      ctx.strokeStyle = "#8a96a2"; ctx.beginPath(); ctx.moveTo(x + w + 6, y + hh); ctx.lineTo(x + w + 6, y - 30); ctx.stroke();           // 點滴架
      ctx.fillStyle = u.alive ? "rgba(140,200,240,.85)" : "#8a8a8a"; h.roundRect(x + w - 2, y - 40, 16, 20, 4); ctx.fill();
      if (!u.alive) { ctx.strokeStyle = "#c84a4a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 30, y + 4); ctx.lineTo(x + w - 10, y + hh - 10); ctx.moveTo(x + w - 10, y + 4); ctx.lineTo(x + 30, y + hh - 10); ctx.stroke(); }
      ctx.restore();
      h.label(u.name, p.x, y + hh + 26, u.alive ? "#3a2a1a" : "#8a8478", 12);
      wardBar(ctx, u, p.x, y - 52, 70, "#5a9ac8");
    },
    // 捏好的雲團：圓滾滾的白雲，被吸走會越縮越小
    cloud(ctx, u, p, now, h) {
      const k = u.alive ? 0.55 + 0.45 * (u.hp / u.maxHp) : 0.3, r = (u.r || 34) * k, bob = Math.sin(now / 400 + p.x) * 3;
      ctx.save(); ctx.globalAlpha = u.alive ? 1 : 0.35;
      ctx.fillStyle = "rgba(0,0,0,.12)"; ctx.beginPath(); ctx.ellipse(p.x, p.y + r + 6, r * 1.2, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#b8d0e8"; ctx.lineWidth = 2;
      ctx.beginPath(); for (const [dx, dy, rr] of [[-0.6, 0.15, 0.6], [0.6, 0.15, 0.6], [0, -0.2, 0.75], [-0.25, 0.3, 0.55], [0.25, 0.3, 0.55]]) ctx.moveTo(p.x + dx * r + rr * r, p.y + bob + dy * r), ctx.arc(p.x + dx * r, p.y + bob + dy * r, rr * r, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.restore();
      h.label(u.name, p.x, p.y + r + 24, u.alive ? "#2a4a6a" : "#8a8478", 12);
      wardBar(ctx, u, p.x, p.y - r - 18, 60, "#5ab0e8");
    },
  };
})();
