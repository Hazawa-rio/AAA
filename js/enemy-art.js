/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/enemy-art.js": "20261113040753" });
// 戰鬥畫面：各時空新增的敵人造型（battle-ui 的 drawUnit 會先找這裡）
// R.EnemyArt[kind](ctx, u, p, now)：p＝畫面上的位置（已經算進衝刺、跳躍的偏移）
// 萬聖節旅館：都是「扮演者」——方塊人穿上了戲服；午夜郵局：信裡夾帶的情緒變成的煙霧
(function () {
  const R = (window.RPG = window.RPG || {});
  const A = (R.EnemyArt = R.EnemyArt || {});

  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function body(ctx, x, y, r, stroke, fill = "#fff", lw = 4) { rr(ctx, x - r, y - r, r * 2, r * 2, Math.max(8, r * 0.35)); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
  function eyes(ctx, x, y, r, a, col = "#1d1d1f", s = 0.11) {
    const fx = Math.cos(a) * r * 0.15, fy = Math.sin(a) * r * 0.12;
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x - r * 0.3 + fx, y - r * 0.12 + fy, r * s, 0, Math.PI * 2); ctx.arc(x + r * 0.3 + fx, y - r * 0.12 + fy, r * s, 0, Math.PI * 2); ctx.fill();
  }
  function glyph(ctx, t, x, y, size, col) { ctx.fillStyle = col; ctx.font = `900 ${Math.round(size)}px 'Noto Sans TC', sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(t, x, y); }

  // ===== 萬聖節旅館 =====
  A.werewolfActor = function (ctx, u, p, now) {
    const r = u.r, { x, y } = p;
    ctx.fillStyle = "#7a5a3a";            // 耳朵
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * r * 0.85, y - r * 0.55); ctx.lineTo(x + s * r * 0.55, y - r * 1.45); ctx.lineTo(x + s * r * 0.2, y - r * 0.8); ctx.closePath(); ctx.fill(); }
    body(ctx, x, y, r, "#5a3a22", "#c8a27a");
    ctx.fillStyle = "#efe0c8"; ctx.beginPath(); ctx.ellipse(x + Math.cos(u.facing) * r * 0.2, y + r * 0.3, r * 0.45, r * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3a2214"; ctx.beginPath(); ctx.arc(x + Math.cos(u.facing) * r * 0.2, y + r * 0.12, r * 0.12, 0, Math.PI * 2); ctx.fill();
    eyes(ctx, x, y, r, u.facing, "#d9a01a", 0.13);
    // 背後的拉鍊（戲服）
    ctx.strokeStyle = "rgba(90,58,34,.6)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + r * 0.95, y - r * 0.6); ctx.lineTo(x + r * 0.95, y + r * 0.6); ctx.stroke();
  };
  A.mummyActor = function (ctx, u, p, now) {
    const r = u.r, { x, y } = p;
    body(ctx, x, y, r, "#8a7448", "#efe4c8");
    ctx.save(); rr(ctx, x - r, y - r, r * 2, r * 2, Math.max(8, r * 0.35)); ctx.clip();
    ctx.strokeStyle = "#c8b48a"; ctx.lineWidth = 5;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x - r, y + i * r * 0.32 - r * 0.2); ctx.lineTo(x + r, y + i * r * 0.32 + r * 0.2); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = "#1d1d1f"; ctx.fillRect(x - r * 0.6, y - r * 0.28, r * 1.2, r * 0.3);
    ctx.fillStyle = "#e8d84a"; ctx.beginPath(); ctx.arc(x - r * 0.28, y - r * 0.13, r * 0.09, 0, Math.PI * 2); ctx.arc(x + r * 0.28, y - r * 0.13, r * 0.09, 0, Math.PI * 2); ctx.fill();
    // 垂下來的繃帶
    const sw = Math.sin(now / 300 + u.x) * 6;
    ctx.strokeStyle = "#e0d2ac"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x + r * 0.7, y + r * 0.6); ctx.quadraticCurveTo(x + r * 1.1 + sw, y + r * 1.1, x + r * 0.9 + sw, y + r * 1.5); ctx.stroke();
  };
  A.zombieActor = function (ctx, u, p, now) {
    const r = u.r, x = p.x + Math.sin(now / 420 + u.x) * 2, y = p.y;
    body(ctx, x, y, r, "#3a5a2a", "#a8c890");
    ctx.strokeStyle = "#3a5a2a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - r * 0.5, y + r * 0.5); ctx.lineTo(x - r * 0.2, y + r * 0.35); ctx.lineTo(x + r * 0.1, y + r * 0.55); ctx.lineTo(x + r * 0.45, y + r * 0.38); ctx.stroke();
    ctx.fillStyle = "#1d1d1f"; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.15, r * 0.13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + r * 0.18, y - r * 0.25); ctx.lineTo(x + r * 0.42, y - r * 0.05); ctx.moveTo(x + r * 0.42, y - r * 0.25); ctx.lineTo(x + r * 0.18, y - r * 0.05); ctx.stroke();
    // 往前伸的手
    const a = u.facing;
    ctx.strokeStyle = "#7a9a62"; ctx.lineWidth = 7; ctx.lineCap = "round";
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + Math.cos(a + s * 1.1) * r * 0.8, y + Math.sin(a + s * 1.1) * r * 0.8); ctx.lineTo(x + Math.cos(a + s * 0.45) * r * 1.6, y + Math.sin(a + s * 0.45) * r * 1.6); ctx.stroke(); }
    ctx.lineCap = "butt";
  };
  A.bat = function (ctx, u, p, now) {
    const r = u.r, { x } = p, y = p.y + Math.sin(now / 120 + u.x) * 4, f = Math.sin(now / 70 + u.x);
    ctx.fillStyle = "#4a3a5a";
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * r * 0.5, y); ctx.quadraticCurveTo(x + s * r * 1.6, y - r * (0.6 + f * 0.5), x + s * r * 2, y + r * 0.2); ctx.quadraticCurveTo(x + s * r * 1.3, y + r * 0.1, x + s * r * 0.5, y + r * 0.4); ctx.fill(); }
    ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e53935"; ctx.beginPath(); ctx.arc(x - r * 0.2, y - r * 0.1, r * 0.1, 0, Math.PI * 2); ctx.arc(x + r * 0.2, y - r * 0.1, r * 0.1, 0, Math.PI * 2); ctx.fill();
  };
  A.bat.top = 8;
  A.vampire = function (ctx, u, p, now) {
    const r = u.r, { x, y } = p, w = Math.sin(now / 400) * 4;
    // 披風
    ctx.fillStyle = "#1d1018"; ctx.beginPath(); ctx.moveTo(x - r * 0.9, y - r * 0.9); ctx.lineTo(x - r * 1.7 - w, y + r * 1.25); ctx.lineTo(x + r * 1.7 + w, y + r * 1.25); ctx.lineTo(x + r * 0.9, y - r * 0.9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#8a1a2a"; ctx.beginPath(); ctx.moveTo(x - r * 0.8, y - r * 0.6); ctx.lineTo(x - r * 1.35 - w, y + r * 1.1); ctx.lineTo(x + r * 1.35 + w, y + r * 1.1); ctx.lineTo(x + r * 0.8, y - r * 0.6); ctx.closePath(); ctx.fill();
    // 高領
    ctx.fillStyle = "#1d1018"; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * r * 0.3, y - r * 0.8); ctx.lineTo(x + s * r * 1.25, y - r * 1.5); ctx.lineTo(x + s * r * 1.0, y - r * 0.5); ctx.closePath(); ctx.fill(); }
    body(ctx, x, y, r, "#8a1a2a", "#f4eef2", 5);
    ctx.fillStyle = "#1d1018"; ctx.beginPath(); ctx.moveTo(x - r, y - r * 0.55); ctx.lineTo(x, y - r * 0.1); ctx.lineTo(x + r, y - r * 0.55); ctx.lineTo(x + r, y - r); ctx.lineTo(x - r, y - r); ctx.closePath(); ctx.fill();   // 尖尖的瀏海
    eyes(ctx, x, y + r * 0.08, r, u.facing, "#c62828", 0.12);
    ctx.fillStyle = "#fff"; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * r * 0.22, y + r * 0.35); ctx.lineTo(x + s * r * 0.14, y + r * 0.6); ctx.lineTo(x + s * r * 0.06, y + r * 0.35); ctx.fill(); }
  };
  A.vampire.top = 30;
  // 武士盔甲：戴著頭盔、拿著刀的方塊
  A.samuraiArmor = function (ctx, u, p, now) {
    const r = u.r, { x, y } = p, a = u.facing, stance = u.state?.stance;
    // 刀：平常拿在手上；收刀呼氣時插回腰間的刀鞘
    ctx.save(); ctx.translate(x, y);
    if (stance) {
      ctx.rotate(0.15);
      ctx.fillStyle = "#1d1d24"; ctx.fillRect(-r * 1.5, r * 0.25, r * 2.4, 9);         // 刀鞘
      ctx.fillStyle = "#3a2a1a"; ctx.fillRect(r * 0.9, r * 0.22, r * 0.5, 12);          // 刀柄
      ctx.fillStyle = "#d9a441"; ctx.fillRect(r * 0.86, r * 0.16, 5, 22);
    } else {
      ctx.rotate(a + 0.5);
      ctx.fillStyle = "#3a2a1a"; ctx.fillRect(r * 0.7, -4, r * 0.45, 8);
      ctx.fillStyle = "#d9a441"; ctx.fillRect(r * 1.12, -8, 5, 16);
      ctx.fillStyle = "#e8eef4"; ctx.beginPath(); ctx.moveTo(r * 1.18, -4); ctx.quadraticCurveTo(r * 2.2, -9, r * 2.6, -2); ctx.lineTo(r * 1.18, 4); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#8a9aa8"; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.restore();
    body(ctx, x, y, r, "#1d1d24", "#5a5a68", 5);
    ctx.strokeStyle = "#a83232"; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - r * 0.85, y + r * (0.15 + i * 0.25)); ctx.lineTo(x + r * 0.85, y + r * (0.15 + i * 0.25)); ctx.stroke(); }
    ctx.fillStyle = "#2a2a34"; ctx.beginPath(); ctx.ellipse(x, y - r * 0.85, r * 1.05, r * 0.5, 0, Math.PI, 0); ctx.fill();
    ctx.fillRect(x - r * 1.15, y - r * 0.9, r * 2.3, r * 0.18);
    ctx.strokeStyle = "#d9a441"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - r * 0.15, y - r * 1.15); ctx.quadraticCurveTo(x - r * 0.7, y - r * 1.6, x - r * 0.6, y - r * 2.0); ctx.moveTo(x + r * 0.15, y - r * 1.15); ctx.quadraticCurveTo(x + r * 0.7, y - r * 1.6, x + r * 0.6, y - r * 2.0); ctx.stroke();
    ctx.fillStyle = "#1d1d1f"; ctx.fillRect(x - r * 0.65, y - r * 0.55, r * 1.3, r * 0.42);
    const g = stance ? 1 : 0.6 + 0.4 * Math.sin(now / 300);
    ctx.fillStyle = stance ? "#ff3020" : `rgba(255,80,60,${g})`; ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.34, r * 0.08, 0, Math.PI * 2); ctx.arc(x + r * 0.25, y - r * 0.34, r * 0.08, 0, Math.PI * 2); ctx.fill();
    if (stance) {
      // 呼出的白氣＋紅色的氣場（現在打它會被反擊）
      for (let i = 0; i < 3; i++) { const k = ((now / 1400 + i / 3) % 1); ctx.fillStyle = `rgba(230,236,244,${0.6 * (1 - k)})`; ctx.beginPath(); ctx.arc(x + r * 0.2 + k * r * 0.8, y - r * 0.3 - k * r * 0.6, r * (0.15 + k * 0.25), 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = `rgba(198,40,40,${0.4 + 0.3 * Math.sin(now / 200)})`; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      glyph(ctx, "收刀呼氣", x, y + r * 1.9, 13, "#c62828");
    }
  };
  A.samuraiArmor.top = 50;
  A.greatWhite = function (ctx, u, p, now) {
    const r = u.r, { x, y } = p, a = u.facing;
    // 腳下的地板裂縫（從地板裡游出來）
    ctx.strokeStyle = "rgba(29,29,31,.35)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y + r * 0.7, r * 1.4, r * 0.35, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    // 身體（魚雷形）
    ctx.fillStyle = "#7a98b4"; ctx.beginPath(); ctx.moveTo(r * 1.5, 0); ctx.quadraticCurveTo(r * 0.6, -r * 0.95, -r * 1.2, -r * 0.35); ctx.lineTo(-r * 1.75, -r * 0.8); ctx.lineTo(-r * 1.55, 0); ctx.lineTo(-r * 1.75, r * 0.8); ctx.lineTo(-r * 1.2, r * 0.35); ctx.quadraticCurveTo(r * 0.6, r * 0.95, r * 1.5, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#3a5a78"; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = "#eef2f6"; ctx.beginPath(); ctx.moveTo(r * 1.4, r * 0.05); ctx.quadraticCurveTo(r * 0.4, r * 0.75, -r * 0.9, r * 0.25); ctx.lineTo(r * 1.4, r * 0.05); ctx.fill();
    // 背鰭
    ctx.fillStyle = "#5a7a98"; ctx.beginPath(); ctx.moveTo(r * 0.2, -r * 0.2); ctx.lineTo(-r * 0.3, -r * 1.25); ctx.lineTo(-r * 0.55, -r * 0.25); ctx.closePath(); ctx.fill();
    // 牙
    const open = 0.18;
    ctx.fillStyle = "#3a1a1a"; ctx.beginPath(); ctx.moveTo(r * 1.45, 0); ctx.lineTo(r * 0.85, -r * open); ctx.lineTo(r * 0.85, r * (open + 0.15)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#1d1d1f"; ctx.beginPath(); ctx.arc(r * 0.8, -r * 0.32, r * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // 頭頂露出來的拉鍊（他是扮演者）
    glyph(ctx, "⋯", x, y - r * 1.05, r * 0.5, "#3a5a78");
  };
  A.greatWhite.top = 28;
  // 死神（照使用者的圖）：通體紫色的細長斗篷，兜帽裡除了骷髏臉都是黑的；
  // 右邊是伸出去再垂下來的長袖；鐮刀頂端的菱形燈籠裡燒著藍色的鬼火
  // 動作：swing 揮動鐮刀・raise 舉起鐮刀（鬼火變大）・point 抬起右手指名
  A.reaperFlame = (u, p) => {                    // 鬼火在畫面上的位置（地獄火從這裡射出去）
    const k = u.r / 36, st = u.state || {}, pt = st.poseT ? (performance.now() - st.poseT) / (st.poseDur || 1000) : 2;
    const lift = st.pose === "raise" && pt < 1 ? -22 : 0;
    return { x: p.x + 46 * k, y: p.y + (-74 + lift) * k };
  };
  A.reaper = function (ctx, u, p, now) {
    const r = u.r, x = p.x, y = p.y + Math.sin(now / 500) * 3;
    const st = u.state || {}, pt = st.poseT ? (performance.now() - st.poseT) / (st.poseDur || 1000) : 2, pose = pt < 1 ? st.pose : null;
    const k = r / 36, PUR = "#9a4aa0", INK = "#0a0a0e";
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    const fl = Math.sin(now / 300) * 4, fl2 = Math.sin(now / 260 + 1) * 3;
    // 細長的斗篷
    ctx.fillStyle = PUR; ctx.beginPath();
    ctx.moveTo(-6, -104); ctx.lineTo(16, -82); ctx.lineTo(20, -52); ctx.lineTo(18, 10); ctx.lineTo(24, 40);
    ctx.quadraticCurveTo(40, 60, 54 + fl, 66); ctx.lineTo(4, 62); ctx.quadraticCurveTo(-24, 60, -50 - fl, 68); ctx.quadraticCurveTo(-34, 50, -24, 38);
    ctx.lineTo(-26, -40); ctx.lineTo(-22, -74); ctx.closePath(); ctx.fill();
    // 右邊：伸出去再垂下來的長袖（指名時抬起來）
    if (pose === "point") {
      const a = u.facing || 0;
      ctx.save(); ctx.translate(14, -40); ctx.rotate(a);
      ctx.fillStyle = PUR; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(58, -6); ctx.lineTo(62, 14); ctx.lineTo(48, 26); ctx.lineTo(46, 6); ctx.lineTo(0, 12); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#f4f0e8"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(60, 0); ctx.lineTo(82, -2); ctx.stroke();       // 骨頭手指
      ctx.restore();
    } else {
      ctx.fillStyle = PUR; ctx.beginPath(); ctx.moveTo(14, -48); ctx.lineTo(44, -40); ctx.lineTo(52, -30);
      ctx.quadraticCurveTo(56 + fl2, 0, 50 + fl2, 34); ctx.lineTo(40 + fl2, 22); ctx.lineTo(34, 44 + fl2); ctx.quadraticCurveTo(36, 0, 34, -24); ctx.lineTo(16, -28); ctx.closePath(); ctx.fill();
    }
    // 兜帽裡：全黑，只有骷髏臉
    ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(-14, -60); ctx.lineTo(-4, -80); ctx.lineTo(10, -62); ctx.lineTo(12, -16); ctx.lineTo(4, 30); ctx.lineTo(-12, 30); ctx.lineTo(-18, -16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#f4f0e8"; ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 2.5; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(-12, -60); ctx.quadraticCurveTo(-2, -66, 8, -60); ctx.lineTo(8, -46); ctx.lineTo(4, -42); ctx.lineTo(2, -37); ctx.lineTo(-3, -40); ctx.lineTo(-7, -37); ctx.lineTo(-9, -42); ctx.lineTo(-12, -46); ctx.closePath(); ctx.fill(); ctx.stroke();
    const glow = pose === "raise" || pose === "point";
    ctx.fillStyle = glow ? "#5ab4ff" : INK; ctx.beginPath(); ctx.ellipse(-6, -52, 2.6, 3.4, 0, 0, Math.PI * 2); ctx.ellipse(3, -52, 2.6, 3.4, 0, 0, Math.PI * 2); ctx.fill();
    // 鐮刀（握在垂下的長袖裡）
    let rot = 0, lift = 0;
    if (pose === "swing") rot = Math.sin(pt * Math.PI) * -2.4;
    if (pose === "raise") lift = -22;
    ctx.save(); ctx.translate(46, 14 + lift); ctx.rotate(rot);
    ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 56); ctx.lineTo(0, -70); ctx.stroke();
    ctx.fillStyle = "#1d1d1f"; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(5, 2); ctx.lineTo(0, 26); ctx.lineTo(-5, 2); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -70); ctx.lineTo(9, -88); ctx.lineTo(0, -106); ctx.lineTo(-9, -88); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(6, -96); ctx.quadraticCurveTo(52, -102, 66, -42); ctx.quadraticCurveTo(46, -82, 6, -82); ctx.closePath(); ctx.fill(); ctx.stroke();
    // 燈籠裡的藍色鬼火
    const fs = (pose === "raise" ? 1.9 : 1) * (1 + 0.12 * Math.sin(now / 90));
    ctx.save(); ctx.translate(0, -90); ctx.scale(fs, fs);
    ctx.shadowColor = "#5ab4ff"; ctx.shadowBlur = 12;
    ctx.fillStyle = "#3a8aff"; ctx.beginPath(); ctx.moveTo(0, 10); ctx.quadraticCurveTo(-10, 0, -2, -12); ctx.quadraticCurveTo(0, -4, 4, -18 + Math.sin(now / 120) * 3); ctx.quadraticCurveTo(10, -2, 0, 10); ctx.fill();
    ctx.fillStyle = "#d8f0ff"; ctx.beginPath(); ctx.arc(0, 2, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.restore();
    // 胸前的「衛冕」綬帶
    ctx.fillStyle = "#d9a441"; ctx.save(); ctx.translate(-4, 6); ctx.rotate(-0.5); ctx.fillRect(-20, -4, 40, 8); ctx.restore();
    ctx.restore();
  };
  A.reaper.top = 112;

  // ===== 美食研究所：彈跳噩夢（使用者畫的造型：上下兩片粉紅色的顎、兩排鋸齒牙、三顆眼睛） =====
  A.nightmare = function (ctx, u, p, now) {
    const r = u.r, k = (r * 1.35) / 230, bounce = Math.abs(Math.sin(now / 300 + u.x));
    const open = 8 + 14 * (0.5 + 0.5 * Math.sin(now / 260 + u.x));       // 嘴巴一開一合
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(k * (1 + 0.05 * bounce), k * (1 - 0.05 * bounce));
    ctx.translate(-300, -330);
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    const PINK = "#f4a0c0", INK = "#1d1d1f";
    // 下顎（往下張開）
    ctx.save(); ctx.translate(0, open);
    ctx.beginPath(); ctx.moveTo(72, 345); ctx.bezierCurveTo(55, 470, 140, 575, 300, 578); ctx.bezierCurveTo(440, 580, 525, 470, 515, 395); ctx.lineTo(480, 368);
    ctx.bezierCurveTo(440, 420, 360, 480, 300, 482); ctx.bezierCurveTo(200, 484, 120, 400, 72, 345); ctx.closePath();
    ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = PINK; ctx.lineWidth = 10; ctx.stroke();
    ctx.fillStyle = "#fbe0ea"; ctx.beginPath(); ctx.moveTo(100, 360); ctx.bezierCurveTo(160, 420, 230, 470, 300, 470); ctx.bezierCurveTo(370, 468, 430, 420, 470, 380); ctx.lineTo(300, 400); ctx.closePath(); ctx.fill();
    // 下排牙
    ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(178, 415);
    for (let i = 0; i < 9; i++) ctx.lineTo(205 + i * 28, i % 2 ? 412 : 455 - Math.abs(i - 4) * 4);
    ctx.lineTo(440, 425); ctx.stroke();
    // 下顎上的小眼睛
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(422, 512, 24, 20, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(426, 513, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // 上顎
    ctx.beginPath(); ctx.moveTo(70, 340); ctx.bezierCurveTo(55, 230, 200, 120, 398, 52); ctx.lineTo(410, 66);
    ctx.bezierCurveTo(500, 150, 530, 260, 505, 352); ctx.bezierCurveTo(470, 380, 440, 388, 420, 386); ctx.bezierCurveTo(300, 372, 180, 350, 70, 340); ctx.closePath();
    ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = PINK; ctx.lineWidth = 10; ctx.stroke();
    // 上排牙
    ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(140, 345);
    for (let i = 0; i < 10; i++) ctx.lineTo(165 + i * 29, i % 2 ? 350 : 395 - Math.abs(i - 5) * 3);
    ctx.lineTo(440, 382); ctx.stroke();
    // 兩顆大眼睛（盯著玩家的方向）
    const ex = Math.cos(u.facing || 0) * 5, ey = Math.sin(u.facing || 0) * 5;
    for (const [x, y, rx, ry, pr] of [[395, 182, 42, 44, 5], [150, 272, 44, 40, 7]]) {
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.stroke();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x - 8 + ex, y + 6 + ey, pr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };
  A.nightmare.top = 44;

  // ===== 蒙德里安的理想國 =====
  // 色塊野獸：外觀還是原本的色塊（黑框＋純色），只是長了眼睛
  function blockArt(ctx, u, p, now, fill) {
    const r = u.r, x = p.x, y = p.y + Math.sin(now / 260 + u.x) * 2;
    ctx.fillStyle = "#1d1d1f"; ctx.fillRect(x - r - 6, y - r - 6, r * 2 + 12, r * 2 + 12);
    ctx.fillStyle = fill; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    const ex = Math.cos(u.facing || 0) * r * 0.12, ey = Math.sin(u.facing || 0) * r * 0.12;
    for (const s of [-1, 1]) {
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x + s * r * 0.35, y - r * 0.15, r * 0.24, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = "#1d1d1f"; ctx.beginPath(); ctx.arc(x + s * r * 0.35 + ex, y - r * 0.15 + ey, r * 0.1, 0, Math.PI * 2); ctx.fill();
    }
  }
  for (const k of ["Red", "Blue", "Yellow", "White"]) { A[`blockBeast${k}`] = (ctx, u, p, now) => blockArt(ctx, u, p, now, u.def.color); A[`blockBeast${k}`].top = 18; }
  A.rexBlock = (ctx, u, p, now) => blockArt(ctx, { ...u, r: u.r * 0.8 }, p, now, "#1d1d1f");
  A.rexBlock.top = 14;
  A.blockBird = function (ctx, u, p, now) {
    const r = u.r, x = p.x, y = p.y + Math.sin(now / 150 + u.x) * 3, a = u.facing || 0, f = Math.sin(now / 90 + u.x);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = "#1a3ae8"; ctx.fillRect(-r * 0.4, -r * (1.3 + f * 0.3), r * 0.8, r * 0.8); ctx.fillRect(-r * 0.4, r * (0.5 + f * 0.3), r * 0.8, r * 0.8);     // 翅膀（藍色方塊）
    ctx.fillStyle = "#1d1d1f"; ctx.fillRect(-r * 0.7, -r * 0.6, r * 1.4, r * 1.2);
    ctx.fillStyle = "#f0d800"; ctx.beginPath(); ctx.moveTo(r * 0.7, -r * 0.3); ctx.lineTo(r * 1.4, 0); ctx.lineTo(r * 0.7, r * 0.3); ctx.fill();             // 黃色三角形的嘴
    ctx.fillStyle = "#fff"; ctx.fillRect(r * 0.2, -r * 0.35, r * 0.28, r * 0.28);
    ctx.restore();
  };
  A.blockBird.top = 16;
  // 暗黑霸王龍（照使用者的第二版圖：方塊拼成的霸王龍，紅色方塊的尾巴、腳、爪、眼睛、牙齒）
  // 出場：一塊全黑方塊 → 冒出紅色方塊 → 黑色方塊不屬於霸王龍的部分變白、消失，留下霸王龍的輪廓
  const REX_BLACK = [[515, 42, 155, 98], [430, 88, 85, 90], [515, 172, 167, 55], [430, 175, 85, 60], [340, 177, 145, 143], [340, 320, 97, 77],
    [485, 235, 45, 50], [527, 258, 30, 70], [565, 323, 32, 37], [315, 390, 35, 80], [350, 465, 45, 52], [350, 517, 30, 56]];
  const REX_RED = [[52, 250, 50, 53], [105, 282, 65, 95], [172, 312, 32, 30], [175, 345, 85, 95], [260, 282, 80, 108],      // 尾巴
    [595, 357, 22, 57], [380, 542, 113, 30]];                                                                              // 爪子、腳
  const REX_EYE = [448, 122, 16, 14];
  const REX_TEETH = [[522, 142, 12, 12], [568, 140, 14, 12], [625, 142, 14, 14], [541, 157, 12, 14], [597, 157, 12, 14], [657, 162, 12, 12]];
  const REX_BOX = [300, 42, 382, 531];          // 出場時那塊全黑方塊
  function rexArt(ctx, u, p, now) {
    if (!u._rexT0) u._rexT0 = now;
    const t = (now - u._rexT0) / 1000;
    const k = (u.r * 4.6) / 630, flip = u.facing != null && Math.cos(u.facing) < -0.1 ? -1 : 1;
    const bob = Math.sin(now / 300) * 6, sway = Math.sin(now / 420) * 6;
    // 整隻轉動：它是一整塊連在一起的身體，所以攻擊時是整隻在動
    //   平常＝前後搖晃；撲咬／衝撞＝先往後仰、再整隻往前撲；甩尾＝先蹲低扭身、再整隻轉一圈
    let rot = t > 2 ? Math.sin(now / 520) * 0.06 : 0, dx = 0, dy = 0, sq = 1;
    const P = u.pose;
    if (P && u.alive) {
      const wind = Math.min(1, (now - P.t0) / 450), after = P.hit ? (now - P.hit) / 1000 : -1;
      const ease = (x) => 1 - (1 - x) * (1 - x);
      if (P.k === "lunge") {
        if (after < 0) { rot = -0.32 * ease(wind) + Math.sin(now / 45) * 0.02 * wind; dx = -Math.cos(P.ang) * u.r * 0.25 * wind; dy = -Math.sin(P.ang) * u.r * 0.25 * wind; }
        else if (after < 0.7) {
          const a = after < 0.12 ? after / 0.12 : Math.max(0, 1 - (after - 0.12) / 0.58);
          rot = -0.32 + 0.82 * Math.min(1, after / 0.12) - 0.5 * Math.max(0, (after - 0.12) / 0.58);
          dx = Math.cos(P.ang) * u.r * 0.7 * a; dy = Math.sin(P.ang) * u.r * 0.7 * a;
        } else u.pose = null;
      } else if (P.k === "spin") {
        if (after < 0) { rot = -0.5 * ease(wind) + Math.sin(now / 40) * 0.03 * wind; sq = 1 - 0.1 * wind; }
        else if (after < 0.6) { const a = ease(Math.min(1, after / 0.6)); rot = -0.5 + (Math.PI * 2 + 0.5) * a; sq = 0.9 + 0.1 * a; }
        else u.pose = null;
      }
    }
    ctx.save(); ctx.translate(p.x + dx, p.y + dy); ctx.rotate(rot * flip); ctx.scale(k * flip, k * sq); ctx.translate(-367, -307);
    const rect = (r, fill, stroke, dy = 0) => { ctx.fillStyle = fill; ctx.fillRect(r[0], r[1] + dy, r[2], r[3]); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 6; ctx.strokeRect(r[0], r[1] + dy, r[2], r[3]); } };
    // 1. 全黑方塊（之後變白、消失）
    const box = t < 1.3 ? 1 : Math.max(0, 1 - (t - 1.3) / 0.8);
    if (box > 0) {
      const w = t < 1.3 ? 0 : Math.min(1, (t - 1.3) / 0.4);
      const c = Math.round(29 + (244 - 29) * w);
      ctx.globalAlpha = t < 1.7 ? 1 : box * 2;
      rect(REX_BOX, `rgb(${c},${c},${c - 4})`);
      ctx.globalAlpha = 1;
    }
    // 2. 霸王龍的黑色身體（頭跟著呼吸上下動）
    const B = u.def.king ? "#050507" : "#1d1d1f";
    REX_BLACK.forEach((r, i) => rect(r, B, null, i < 4 ? bob * 0.4 : 0));
    // 嘴巴的縫和牙齒
    ctx.fillStyle = box > 0 && t < 1.3 ? B : "#f4f2ea"; ctx.fillRect(515, 140 + bob * 0.4, 167, 32);
    // 3. 紅色方塊：一個一個冒出來
    const pop = (i) => Math.max(0, Math.min(1, (t - 0.3 - i * 0.1) / 0.25));
    const all = [...REX_RED.map((r, i) => [r, i < 5 ? sway * (1 - i / 5) * 0.6 : 0]), [REX_EYE, bob * 0.4], ...REX_TEETH.map((r) => [r, bob * 0.4])];
    all.forEach(([r, dy], i) => {
      const s = pop(i);
      if (s <= 0) return;
      const cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2 + dy;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
      rect(r, "#e8262c", i < REX_RED.length ? "#1d1d1f" : null, dy);
      ctx.restore();
    });
    ctx.restore();
    if (u.def.king && t > 2) { ctx.strokeStyle = `rgba(232,38,44,${0.3 + 0.3 * Math.sin(now / 200)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y, u.r * 1.6, 0, Math.PI * 2); ctx.stroke(); }
  }
  A.rexDoubt = rexArt; A.rexDoubt.top = 50;
  A.rexKing = rexArt;

  // ===== 午夜郵局：情緒煙霧 =====
  // 幾團會呼吸的煙＋一張臉，身上飄著小字
  const SMOKE = {
    selfBlame: { fill: "#8a7aa8", dark: "#4a3a6a", face: "down", tag: "……" },
    regret: { fill: "#a84a5a", dark: "#5a1a2a", face: "sad", tag: "要是……" },
    longing: { fill: "#6a92cc", dark: "#2a4a80", face: "far", tag: "好想你" },
    joy: { fill: "#f2c84a", dark: "#a87a10", face: "smile", tag: "哈哈" },
    regretBig: { fill: "#a84a5a", dark: "#5a1a2a", face: "sad", tag: "對不起" },
    longingBig: { fill: "#6a92cc", dark: "#2a4a80", face: "far", tag: "還記得嗎" },
    anxiety: { fill: "#e09a4a", dark: "#8a4a10", face: "down", tag: "逾期" },
    finalNotice: { fill: "#d0583e", dark: "#6a1a10", face: "sad", tag: "最後通知" },
  };
  function smoke(kind) {
    const S = SMOKE[kind];
    const f = function (ctx, u, p, now) {
      const r = u.r, x = p.x, y = p.y + Math.sin(now / 380 + u.x) * 4;
      ctx.save();
      // 往上飄散的煙
      for (let i = 0; i < 4; i++) {
        const k = ((now / 1600 + i / 4 + u.x * 0.01) % 1);
        ctx.globalAlpha = (u.alive ? 0.35 : 0.1) * (1 - k);
        ctx.fillStyle = S.fill; ctx.beginPath(); ctx.arc(x + Math.sin(i * 2 + now / 600) * r * 0.5, y - r * 0.8 - k * r * 1.4, r * (0.35 + k * 0.3), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = u.alive ? 0.92 : 0.25;
      ctx.fillStyle = S.fill;
      ctx.beginPath();
      for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + now / 2400, rr2 = r * (0.62 + 0.08 * Math.sin(now / 300 + i * 1.7)); ctx.moveTo(x + Math.cos(a) * r * 0.45 + rr2, y + Math.sin(a) * r * 0.4); ctx.arc(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.4, rr2, 0, Math.PI * 2); }
      ctx.fill();
      ctx.strokeStyle = S.dark; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(x, y, r * 1.02, r * 0.92, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = u.alive ? 1 : 0.3;
      // 臉
      ctx.strokeStyle = S.dark; ctx.fillStyle = S.dark; ctx.lineWidth = 3; ctx.lineCap = "round";
      const e = r * 0.28;
      if (S.face === "smile") {
        ctx.beginPath(); ctx.arc(x - e, y - r * 0.08, r * 0.12, Math.PI, 0); ctx.moveTo(x + e + r * 0.12, y - r * 0.08); ctx.arc(x + e, y - r * 0.08, r * 0.12, 0, Math.PI, true); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y + r * 0.12, r * 0.3, 0.15, Math.PI - 0.15); ctx.stroke();
      } else if (S.face === "far") {
        ctx.beginPath(); ctx.arc(x - e, y - r * 0.1, r * 0.08, 0, Math.PI * 2); ctx.arc(x + e, y - r * 0.1, r * 0.08, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - r * 0.12, y + r * 0.28); ctx.lineTo(x + r * 0.12, y + r * 0.28); ctx.stroke();
        ctx.fillStyle = "rgba(160,200,255,.9)"; ctx.beginPath(); ctx.arc(x + e + 2, y + r * 0.1 + ((now / 900) % 1) * r * 0.4, r * 0.07, 0, Math.PI * 2); ctx.fill();
      } else {
        // 低著頭（自責）／垂眉（悔恨）
        ctx.beginPath(); ctx.moveTo(x - e - r * 0.12, y - r * 0.2); ctx.lineTo(x - e + r * 0.12, y - r * (S.face === "sad" ? 0.32 : 0.1)); ctx.moveTo(x + e + r * 0.12, y - r * 0.2); ctx.lineTo(x + e - r * 0.12, y - r * (S.face === "sad" ? 0.32 : 0.1)); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y + r * 0.45, r * 0.22, Math.PI + 0.3, -0.3); ctx.stroke();
      }
      ctx.lineCap = "butt";
      // 身上飄著的小字
      ctx.globalAlpha = (u.alive ? 0.75 : 0.2) * (0.6 + 0.4 * Math.sin(now / 500 + u.x));
      glyph(ctx, S.tag, x + r * 0.9, y - r * 0.9, Math.max(11, r * 0.42), S.dark);
      ctx.restore();
    };
    f.top = 18;
    return f;
  }
  for (const k of Object.keys(SMOKE)) A[k] = smoke(k);
  // 最後通知：身邊繞著一圈帳單
  const fn = A.finalNotice;
  A.finalNotice = function (ctx, u, p, now) {
    const r = u.r;
    for (let i = 0; i < 6; i++) {
      const a = now / 1400 + (i / 6) * Math.PI * 2, x = p.x + Math.cos(a) * r * 1.35, y = p.y + Math.sin(a) * r * 0.9;
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(now / 500 + i) * 0.4); ctx.globalAlpha = u.alive ? 0.95 : 0.3;
      ctx.fillStyle = "#f4ecd8"; ctx.fillRect(-r * 0.22, -r * 0.3, r * 0.44, r * 0.6); ctx.strokeStyle = "#8a7a5a"; ctx.lineWidth = 1.5; ctx.strokeRect(-r * 0.22, -r * 0.3, r * 0.44, r * 0.6);
      ctx.fillStyle = "#c0392b"; ctx.fillRect(-r * 0.15, -r * 0.2, r * 0.3, r * 0.08);
      ctx.fillStyle = "#8a7a5a"; for (let k = 0; k < 3; k++) ctx.fillRect(-r * 0.15, -r * 0.02 + k * r * 0.1, r * 0.3, 2);
      ctx.restore();
    }
    fn(ctx, u, p, now);
  };
  A.finalNotice.top = fn.top;
  // 地圖探索也用得到（郵局在地圖上畫一樣的煙霧）
  R.EnemyArt.smokeOf = (kind) => SMOKE[kind] || SMOKE.selfBlame;
})();
