/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/sea-art.js": "20261122223322" });
// 水生生物的外型（如此靜謐的蔚藍、原始水域）：照物種畫出本來的樣子
//   R.SeaArt.draw(ctx, name, x, y, s, face, now, col, k)：name＝物種名、s＝大小（大約是身長的一半）、face＝朝向（弧度）、col＝沒有特定配色時用的顏色
//   R.SeaArt.has(name)：有沒有這個物種的專屬外型
//   全部先畫成朝右，再照 face 左右翻
(function () {
  const R = (window.RPG = window.RPG || {});
  const P = Math.PI;
  function ell(ctx, x, y, rx, ry, c, a = 0) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), a, 0, P * 2); ctx.fill(); }
  function poly(ctx, c, pts) { ctx.fillStyle = c; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); }
  function eye(ctx, x, y, r, iris = "#111") { ell(ctx, x, y, r, r, "#fff"); ell(ctx, x + r * 0.25, y, r * 0.55, r * 0.55, iris); }
  function tail(ctx, x, s, w, c, fork = 0.45) { poly(ctx, c, [[x, 0], [x - s * 0.55, -s * fork - w], [x - s * 0.4, 0], [x - s * 0.55, s * fork - w]]); }
  function stripes(ctx, s, xs, c, h = 0.55) { ctx.fillStyle = c; for (const x of xs) ctx.fillRect(x * s - s * 0.06, -s * h, s * 0.12, s * h * 2); }
  const wob = (now, k, a = 0.12) => Math.sin(now / 180 + k) * a;

  // 體型
  function fish(ctx, s, now, k, o) {
    const w = wob(now, k) * s;
    const L = o.len || 1, Hh = o.h || 0.5;
    if (o.dorsal) poly(ctx, o.fin || o.c, [[-s * 0.3 * L, -s * Hh * 0.8], [s * 0.05, -s * (Hh + o.dorsal)], [s * 0.3 * L, -s * Hh * 0.8]]);
    if (o.anal) poly(ctx, o.fin || o.c, [[-s * 0.25 * L, s * Hh * 0.8], [-s * 0.05, s * (Hh + o.anal)], [s * 0.2 * L, s * Hh * 0.8]]);
    tail(ctx, -s * 0.85 * L, s * (o.tail || 1), w, o.fin || o.c, o.fork ?? 0.45);
    ell(ctx, 0, 0, s * L, s * Hh, o.c);
    if (o.belly) { ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, s * L, s * Hh, 0, 0, P * 2); ctx.clip(); ell(ctx, 0, s * Hh * 0.7, s * L, s * Hh * 0.55, o.belly); ctx.restore(); }
    if (o.stripes) { ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, s * L, s * Hh, 0, 0, P * 2); ctx.clip(); stripes(ctx, s, o.stripes, o.sc || "#fff", Hh); ctx.restore(); }
    if (o.spots) { ctx.fillStyle = o.spc || "rgba(255,255,255,.7)"; for (let i = 0; i < o.spots; i++) { const a = i * 2.39, r = Math.sqrt((i + 0.5) / o.spots); ctx.beginPath(); ctx.arc(Math.cos(a) * r * s * L * 0.8, Math.sin(a) * r * s * Hh * 0.75, s * 0.06, 0, P * 2); ctx.fill(); } }
    eye(ctx, s * 0.6 * L, -s * Hh * 0.2, s * (o.eye || 0.13), o.iris);
    o.extra?.(ctx, s, now, k);
  }
  function eel(ctx, s, now, k, o) {
    const n = 14, L = s * (o.len || 2.4);
    ctx.strokeStyle = o.c; ctx.lineCap = "round";
    for (let i = n; i >= 0; i--) {
      const t = i / n, x = L * 0.5 - t * L, y = Math.sin(now / 160 + k + t * 6) * s * 0.18 * t;
      ctx.lineWidth = s * (o.w || 0.32) * (1 - t * 0.55);
      if (i < n) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke(); }
      var px = x, py = y;            // eslint-disable-line no-var
    }
    ctx.lineCap = "butt";
    if (o.crest) { ctx.fillStyle = o.crest; for (let i = 0; i < 8; i++) { const x = L * 0.45 - i * L * 0.12; poly(ctx, o.crest, [[x, -s * 0.12], [x - s * 0.1, -s * (0.45 + (i === 0 ? 0.4 : 0))], [x - s * 0.2, -s * 0.12]]); } }
    if (o.spots) { ctx.fillStyle = o.spc; for (let i = 0; i < 6; i++) { const t = i / 6; ctx.beginPath(); ctx.arc(L * 0.4 - t * L * 0.9, Math.sin(now / 160 + k + t * 6) * s * 0.18 * t, s * 0.06, 0, P * 2); ctx.fill(); } }
    eye(ctx, L * 0.42, -s * 0.05, s * 0.09);
    if (o.teeth) { ctx.fillStyle = "#fff"; poly(ctx, "#fff", [[L * 0.5, s * 0.04], [L * 0.44, s * 0.16], [L * 0.4, s * 0.04]]); }
  }
  function ray(ctx, s, now, k, o) {
    const f = Math.sin(now / 260 + k) * 0.25;
    ctx.strokeStyle = o.c; ctx.lineWidth = s * 0.06; ctx.beginPath(); ctx.moveTo(-s * 0.4, 0); ctx.quadraticCurveTo(-s * 1.1, Math.sin(now / 200 + k) * s * 0.2, -s * 1.7, 0); ctx.stroke();
    poly(ctx, o.c, [[s * 0.55, 0], [s * 0.05, -s * (1.1 + f)], [-s * 0.45, 0], [s * 0.05, s * (1.1 + f)]]);
    if (o.horns) { poly(ctx, o.c, [[s * 0.5, -s * 0.12], [s * 0.85, -s * 0.22], [s * 0.55, -s * 0.02]]); poly(ctx, o.c, [[s * 0.5, s * 0.12], [s * 0.85, s * 0.22], [s * 0.55, s * 0.02]]); }
    if (o.spots) { ctx.fillStyle = o.spc; for (let i = 0; i < 9; i++) { const a = i * 2.4, r = Math.sqrt((i + 0.5) / 9) * 0.7; ctx.beginPath(); ctx.arc(Math.cos(a) * r * s * 0.5, Math.sin(a) * r * s * 0.8, s * 0.07, 0, P * 2); ctx.fill(); } }
    eye(ctx, s * 0.32, -s * 0.18, s * 0.08);
  }
  function shark(ctx, s, now, k, o) {
    const w = wob(now, k, 0.08) * s;
    poly(ctx, o.c, [[-s * 0.1, -s * 0.32], [-s * 0.25, -s * 0.95], [s * 0.2, -s * 0.32]]);                  // 背鰭
    poly(ctx, o.c, [[-s * 0.95, 0], [-s * 1.55, -s * 0.75 - w], [-s * 1.25, 0], [-s * 1.45, s * 0.45 - w]]);    // 尾鰭（上長下短）
    poly(ctx, o.c, [[s * 0.1, s * 0.2], [-s * 0.15, s * 0.7], [s * 0.35, s * 0.25]]);                          // 胸鰭
    ell(ctx, 0, 0, s * 1.1, s * 0.36, o.c);
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, s * 1.1, s * 0.36, 0, 0, P * 2); ctx.clip(); ell(ctx, 0, s * 0.3, s * 1.1, s * 0.25, o.belly || "#e8ecef");
    if (o.spots) { ctx.fillStyle = o.spc; for (let i = 0; i < 18; i++) { ctx.beginPath(); ctx.arc(-s * 0.9 + (i % 9) * s * 0.24, -s * 0.2 + Math.floor(i / 9) * s * 0.18, s * 0.05, 0, P * 2); ctx.fill(); } }
    ctx.restore();
    if (o.hammer) { ctx.fillStyle = o.c; ctx.fillRect(s * 0.9, -s * 0.45, s * 0.22, s * 0.9); eye(ctx, s * 1.01, -s * 0.42, s * 0.07); eye(ctx, s * 1.01, s * 0.42, s * 0.07); }
    else eye(ctx, s * 0.72, -s * 0.08, s * 0.07, "#000");
    if (o.gills) { ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(s * (0.45 - i * 0.07), -s * 0.12); ctx.lineTo(s * (0.42 - i * 0.07), s * 0.12); ctx.stroke(); } }
    if (o.teeth) { ctx.fillStyle = "#fff"; for (let i = 0; i < 4; i++) poly(ctx, "#fff", [[s * (0.95 - i * 0.08), s * 0.14], [s * (0.91 - i * 0.08), s * 0.26], [s * (0.87 - i * 0.08), s * 0.14]]); }
  }
  function whale(ctx, s, now, k, o) {
    const w = wob(now, k, 0.1) * s;
    poly(ctx, o.c, [[-s * 1.05, 0], [-s * 1.45, -s * 0.45 - w], [-s * 1.3, 0], [-s * 1.45, s * 0.45 - w]]);
    if (o.fin) poly(ctx, o.c, [[-s * 0.2, -s * 0.38], [-s * (o.finTall ? 0.1 : 0.3), -s * (o.finTall ? 1.05 : 0.6)], [s * 0.1, -s * 0.38]]);
    ell(ctx, 0, 0, s * 1.15, s * (o.h || 0.42), o.c);
    if (o.belly) { ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, s * 1.15, s * (o.h || 0.42), 0, 0, P * 2); ctx.clip(); ell(ctx, s * 0.1, s * 0.35, s * 1.1, s * 0.22, o.belly); ctx.restore(); }
    if (o.patch) ell(ctx, s * 0.6, -s * 0.12, s * 0.18, s * 0.08, o.patch);
    if (o.melon) ell(ctx, s * 0.85, -s * 0.12, s * 0.35, s * 0.3, o.c);
    if (o.beak) poly(ctx, o.c, [[s * 1.05, -s * 0.05], [s * 1.45, s * 0.02], [s * 1.05, s * 0.12]]);
    if (o.grooves) { ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(s * 0.9, s * (0.1 + i * 0.06)); ctx.lineTo(s * 0.1, s * (0.12 + i * 0.06)); ctx.stroke(); } }
    eye(ctx, s * 0.78, s * 0.02, s * 0.06);
  }
  function turtle(ctx, s, now, k, o) {
    const f = Math.sin(now / 300 + k) * 0.4;
    for (const [x, y, a] of [[s * 0.45, -s * 0.5, -0.6 - f], [s * 0.45, s * 0.5, 0.6 + f], [-s * 0.5, -s * 0.4, -2.4], [-s * 0.5, s * 0.4, 2.4]]) ell(ctx, x, y, s * 0.38, s * 0.13, o.skin || "#8a9a6a", a);
    ell(ctx, s * 0.85, 0, s * 0.25, s * 0.2, o.skin || "#8a9a6a");
    ell(ctx, 0, 0, s * 0.75, s * 0.6, o.c);
    ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.lineWidth = 2; for (const [x, y] of [[0, 0], [-s * 0.35, -s * 0.25], [-s * 0.35, s * 0.25], [s * 0.3, -s * 0.25], [s * 0.3, s * 0.25]]) { ctx.beginPath(); ctx.arc(x, y, s * 0.16, 0, P * 2); ctx.stroke(); }
    if (o.spikes) for (let i = 0; i < 5; i++) poly(ctx, "#3a3a2a", [[-s * 0.5 + i * s * 0.25, -s * 0.12], [-s * 0.4 + i * s * 0.25, -s * 0.38], [-s * 0.3 + i * s * 0.25, -s * 0.12]]);
    eye(ctx, s * 0.95, -s * 0.07, s * 0.06);
    if (o.beak) poly(ctx, "#3a3a2a", [[s * 1.05, -s * 0.02], [s * 1.18, s * 0.08], [s * 1.02, s * 0.12]]);
  }
  function penguin(ctx, s, now, k, o) {
    const b = Math.abs(Math.sin(now / 220 + k)) * s * 0.06;
    ell(ctx, 0, -b, s * 0.45, s * 0.75, o.c || "#1d1d2a");
    ell(ctx, s * 0.08, s * 0.08 - b, s * 0.32, s * 0.6, "#f4f4f8");
    ell(ctx, -s * 0.35, -b, s * 0.12, s * 0.4, o.c || "#1d1d2a", 0.3);
    eye(ctx, s * 0.18, -s * 0.5 - b, s * 0.07);
    poly(ctx, o.beakC || "#f2a020", [[s * 0.35, -s * 0.48 - b], [s * 0.6, -s * 0.42 - b], [s * 0.35, -s * 0.38 - b]]);
    ell(ctx, -s * 0.1, s * 0.75, s * 0.14, s * 0.06, "#f2a020"); ell(ctx, s * 0.15, s * 0.75, s * 0.14, s * 0.06, "#f2a020");
    if (o.puffin) { ell(ctx, s * 0.12, -s * 0.5 - b, s * 0.22, s * 0.16, "#f4f4f8"); poly(ctx, "#e8602a", [[s * 0.3, -s * 0.55 - b], [s * 0.62, -s * 0.45 - b], [s * 0.3, -s * 0.32 - b]]); }
  }
  function seal(ctx, s, now, k, o) {
    const w = Math.sin(now / 250 + k) * 0.2;
    poly(ctx, o.c, [[-s * 0.9, 0], [-s * 1.3, -s * 0.3 + w * s], [-s * 1.3, s * 0.3 + w * s]]);
    ell(ctx, 0, 0, s, s * 0.45, o.c);
    ell(ctx, s * 0.85, -s * 0.1, s * 0.38, s * 0.32, o.c);
    ell(ctx, s * 0.1, s * 0.4, s * 0.3, s * 0.1, o.c, 0.5);
    if (o.spots) { ctx.fillStyle = o.spc; for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.arc(-s * 0.7 + (i % 5) * s * 0.33, (i < 5 ? -1 : 1) * s * 0.15, s * 0.05, 0, P * 2); ctx.fill(); } }
    if (o.tusks) { ctx.fillStyle = "#f4ead0"; poly(ctx, "#f4ead0", [[s * 1.0, s * 0.1], [s * 1.05, s * 0.75], [s * 1.12, s * 0.1]]); ell(ctx, s * 1.05, s * 0.05, s * 0.16, s * 0.12, o.c); }
    if (o.jaw) { ctx.fillStyle = "#7a2a2a"; ctx.fillRect(s * 0.95, 0, s * 0.25, s * 0.08); }
    eye(ctx, s * 1.0, -s * 0.2, s * 0.07, "#000");
  }
  function squid(ctx, s, now, k, o) {
    for (let i = 0; i < 8; i++) {
      const y = (i - 3.5) * s * 0.09; ctx.strokeStyle = o.c; ctx.lineWidth = s * 0.07; ctx.beginPath(); ctx.moveTo(-s * 0.1, y);
      ctx.quadraticCurveTo(-s * 0.6, y + Math.sin(now / 200 + i + k) * s * 0.3, -s * (1.1 + (i % 3) * 0.15), y * 1.8 + Math.sin(now / 150 + i) * s * 0.2); ctx.stroke();
    }
    if (o.web) { ctx.fillStyle = o.web; ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * 0.35); ctx.quadraticCurveTo(-s * 0.9, 0, -s * 0.1, s * 0.35); ctx.fill(); }
    poly(ctx, o.c, [[s * 1.1, 0], [s * 0.7, -s * 0.38], [s * 0.7, s * 0.38]]);
    ell(ctx, s * 0.35, 0, s * 0.6, s * 0.3, o.c);
    eye(ctx, s * 0.05, -s * 0.12, s * (o.bigEye ? 0.16 : 0.09), o.bigEye ? "#1a3a6a" : "#111");
  }
  function jelly(ctx, s, now, k, o) {
    const p = Math.sin(now / 300 + k) * 0.1;
    ctx.save(); ctx.rotate(-P / 2);
    ctx.globalAlpha *= 0.85;
    ctx.fillStyle = o.c; ctx.beginPath(); ctx.ellipse(0, 0, s * (0.7 + p), s * 0.55, 0, P, 0); ctx.fill();
    ctx.strokeStyle = o.c; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const x = -s * 0.55 + i * s * 0.22; ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + Math.sin(now / 200 + i) * s * 0.2, s * 0.6, x, s * 1.3); ctx.stroke(); }
    ctx.restore();
  }
  function seahorse(ctx, s, now, k, o) {
    const b = Math.sin(now / 400 + k) * s * 0.08;
    ctx.save(); ctx.translate(0, b);
    ctx.strokeStyle = o.c; ctx.lineCap = "round"; ctx.lineWidth = s * 0.32;
    ctx.beginPath(); ctx.moveTo(s * 0.1, -s * 0.55); ctx.quadraticCurveTo(-s * 0.35, -s * 0.1, s * 0.05, s * 0.35); ctx.quadraticCurveTo(s * 0.25, s * 0.75, -s * 0.1, s * 0.8); ctx.stroke();
    ctx.lineCap = "butt";
    ell(ctx, s * 0.15, -s * 0.6, s * 0.2, s * 0.15, o.c); poly(ctx, o.c, [[s * 0.25, -s * 0.66], [s * 0.6, -s * 0.6], [s * 0.25, -s * 0.52]]);
    eye(ctx, s * 0.2, -s * 0.64, s * 0.06);
    if (o.leafy) for (let i = 0; i < 5; i++) ell(ctx, -s * 0.2 + (i % 2) * s * 0.4, -s * 0.3 + i * s * 0.25, s * 0.18, s * 0.07, o.leafy, i * 0.8);
    ctx.restore();
  }
  function croc(ctx, s, now, k, o) {
    const w = Math.sin(now / 260 + k) * s * 0.15;
    ctx.fillStyle = o.c; ctx.beginPath(); ctx.moveTo(-s * 0.6, -s * 0.18); ctx.quadraticCurveTo(-s * 1.3, w, -s * 1.8, w * 1.5); ctx.quadraticCurveTo(-s * 1.3, w + s * 0.05, -s * 0.6, s * 0.18); ctx.fill();
    for (const [x, y] of [[s * 0.3, -s * 0.32], [s * 0.3, s * 0.32], [-s * 0.4, -s * 0.3], [-s * 0.4, s * 0.3]]) ell(ctx, x, y, s * 0.16, s * 0.08, o.c);
    ell(ctx, 0, 0, s * 0.75, s * 0.26, o.c);
    ctx.fillRect(s * 0.6, -s * 0.12, s * 0.75, s * 0.24);
    ctx.fillStyle = "rgba(0,0,0,.25)"; for (let i = 0; i < 7; i++) ctx.fillRect(-s * 0.6 + i * s * 0.18, -s * 0.05, s * 0.08, s * 0.1);
    ctx.fillStyle = "#fff"; for (let i = 0; i < 5; i++) poly(ctx, "#fff", [[s * (0.75 + i * 0.12), s * 0.12], [s * (0.8 + i * 0.12), s * 0.2], [s * (0.85 + i * 0.12), s * 0.12]]);
    eye(ctx, s * 0.62, -s * 0.12, s * 0.06, "#c8a020");
  }
  function school(ctx, s, now, k, o) {
    for (let i = 0; i < 9; i++) {
      const a = i * 2.3 + now / 900, r = s * (0.3 + (i % 3) * 0.25);
      ctx.save(); ctx.translate(Math.cos(a) * r, Math.sin(a) * r * 0.6); ctx.scale(0.22, 0.22);
      fish(ctx, s, now, k + i, { c: o.c, belly: "#e8f0f8", len: 1.3, h: 0.32 }); ctx.restore();
    }
  }
  function sunfish(ctx, s, now, k, o) {
    const f = Math.sin(now / 300 + k) * 0.2;
    poly(ctx, o.c, [[-s * 0.1, -s * 0.5], [-s * (0.3 + f), -s * 1.35], [s * 0.2, -s * 0.55]]);
    poly(ctx, o.c, [[-s * 0.1, s * 0.5], [-s * (0.3 - f), s * 1.35], [s * 0.2, s * 0.55]]);
    ell(ctx, 0, 0, s * 0.75, s * 0.68, o.c);
    ctx.fillStyle = o.c; ctx.fillRect(-s * 0.85, -s * 0.45, s * 0.2, s * 0.9);
    eye(ctx, s * 0.45, -s * 0.1, s * 0.08);
  }
  function angler(ctx, s, now, k, o) {
    fish(ctx, s, now, k, { c: o.c, h: 0.62, len: 0.95, eye: 0.08, extra: (c, s) => {
      ctx.strokeStyle = o.c; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s * 0.3, -s * 0.55); ctx.quadraticCurveTo(s * 0.6, -s * 1.3, s * 1.1, -s * 0.9); ctx.stroke();
      const g = ctx.createRadialGradient(s * 1.1, -s * 0.9, 0, s * 1.1, -s * 0.9, s * 0.35); g.addColorStop(0, "rgba(220,250,255,1)"); g.addColorStop(1, "rgba(120,220,255,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s * 1.1, -s * 0.9, s * 0.35, 0, P * 2); ctx.fill();
      ctx.fillStyle = "#fff"; for (let i = 0; i < 5; i++) poly(ctx, "#fff", [[s * (0.95 - i * 0.1), s * 0.05], [s * (0.9 - i * 0.1), s * 0.25], [s * (0.85 - i * 0.1), s * 0.05]]);
    } });
  }
  function lionfish(ctx, s, now, k, o) {
    ctx.strokeStyle = "#f4e8d8"; ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) { const a = -P * 0.9 + i * 0.22; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * s * 1.1, Math.sin(a) * s * 1.1 + Math.sin(now / 200 + i) * 2); ctx.stroke(); }
    for (let i = 0; i < 5; i++) { const a = P * 0.25 + i * 0.25; ell(ctx, Math.cos(a) * s * 0.6, Math.sin(a) * s * 0.6, s * 0.4, s * 0.12, "rgba(216,74,74,.6)", a); }
    fish(ctx, s, now, k, { c: "#d84a4a", stripes: [-0.6, -0.3, 0, 0.3], sc: "#f4e8d8", h: 0.45 });
  }

  // 物種 → 外型
  const SP = {
    小丑魚: (c, s, n, k) => fish(c, s, n, k, { c: "#ff8a2a", stripes: [-0.45, 0.1, 0.55], sc: "#fff", fin: "#e86a1a", h: 0.5 }),
    藍倒吊: (c, s, n, k) => fish(c, s, n, k, { c: "#2a5aff", h: 0.6, dorsal: 0.15, anal: 0.12, fin: "#1a2a6a", extra: (ctx, s) => poly(ctx, "#f2d22a", [[-s * 0.95, 0], [-s * 1.35, -s * 0.4], [-s * 1.2, 0], [-s * 1.35, s * 0.4]]) }),
    獅子魚: (c, s, n, k) => lionfish(c, s, n, k, {}),
    雀鯛: (c, s, n, k) => fish(c, s, n, k, { c: "#4ad8ff", h: 0.5, len: 0.9, fin: "#2aa8e8" }),
    神仙魚: (c, s, n, k) => fish(c, s, n, k, { c: "#f2c200", h: 0.7, len: 0.8, dorsal: 0.6, anal: 0.6, stripes: [-0.2, 0.3], sc: "#3a2a1a", fin: "#e8b000" }),
    七彩神仙: (c, s, n, k) => fish(c, s, n, k, { c: "#e86ab0", h: 0.85, len: 0.8, dorsal: 0.15, anal: 0.15, stripes: [-0.5, -0.2, 0.1, 0.4], sc: "rgba(80,200,255,.55)", fork: 0.3 }),
    蝴蝶魚: (c, s, n, k) => fish(c, s, n, k, { c: "#f2d22a", h: 0.75, len: 0.85, dorsal: 0.2, anal: 0.15, stripes: [0.45], sc: "#1a1a1a", spots: 1, spc: "#1a1a1a" }),
    隆頭魚: (c, s, n, k) => fish(c, s, n, k, { c: "#3ab88a", h: 0.45, len: 1.1, stripes: [-0.3, 0.2], sc: "#e86a8a" }),
    骨舌魚: (c, s, n, k) => fish(c, s, n, k, { c: "#c8b880", h: 0.35, len: 1.5, spots: 14, spc: "rgba(200,80,40,.6)", fork: 0.25 }),
    紅尾鯰: (c, s, n, k) => fish(c, s, n, k, { c: "#3a3a3e", belly: "#f4f0e8", h: 0.4, len: 1.3, fin: "#e84a2a", extra: (ctx, s) => { ctx.strokeStyle = "#3a3a3e"; ctx.lineWidth = 1.5; for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 1.2, 0); ctx.quadraticCurveTo(s * 1.6, d * s * 0.3, s * 1.5, d * s * 0.6); ctx.stroke(); } } }),
    電鰻: (c, s, n, k) => eel(c, s, n, k, { c: "#4a5a3a", len: 2.6, w: 0.34, spots: true, spc: "#f2d22a" }),
    淡水魟: (c, s, n, k) => ray(c, s, n, k, { c: "#5a4a2a", spots: true, spc: "#e8d8a0" }),
    北極鱈: (c, s, n, k) => fish(c, s, n, k, { c: "#8a98a8", belly: "#e8eef4", h: 0.4, len: 1.2, spots: 8, spc: "rgba(60,70,80,.5)", extra: (ctx, s) => { ctx.strokeStyle = "#8a98a8"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s * 1.0, s * 0.3); ctx.lineTo(s * 1.0, s * 0.55); ctx.stroke(); } }),
    冰魚: (c, s, n, k) => fish(c, s, n, k, { c: "rgba(220,240,255,.75)", h: 0.35, len: 1.4, fin: "rgba(200,230,255,.6)", iris: "#3a6a9a" }),
    企鵝: (c, s, n, k) => penguin(c, s, n, k, {}),
    海鸚: (c, s, n, k) => penguin(c, s * 0.8, n, k, { puffin: true }),
    白鯨: (c, s, n, k) => whale(c, s, n, k, { c: "#f0f4f8", melon: true, h: 0.42 }),
    海馬: (c, s, n, k) => seahorse(c, s, n, k, { c: "#e8a03a" }),
    海龍: (c, s, n, k) => seahorse(c, s, n, k, { c: "#c86a8a", leafy: "rgba(200,120,150,.8)" }),
    花園鰻: (c, s, n, k) => eel(c, s * 0.8, n, k, { c: "#f4eedc", len: 2, w: 0.22, spots: true, spc: "#3a3a3a" }),
    皇帶魚: (c, s, n, k) => eel(c, s, n, k, { c: "#d8dce8", len: 3.2, w: 0.3, crest: "#e83a3a" }),
    吸血鬼魷魚: (c, s, n, k) => squid(c, s, n, k, { c: "#8a2a4a", web: "rgba(80,20,40,.8)" }),
    巨口魚: (c, s, n, k) => fish(c, s, n, k, { c: "#2a2a4a", h: 0.4, len: 1.3, eye: 0.08, extra: (ctx, s) => { ctx.fillStyle = "#000"; ctx.beginPath(); ctx.moveTo(s * 1.3, 0); ctx.lineTo(s * 0.5, -s * 0.05); ctx.lineTo(s * 0.5, s * 0.35); ctx.closePath(); ctx.fill(); for (let i = 0; i < 4; i++) poly(ctx, "#fff", [[s * (1.2 - i * 0.18), -s * 0.02], [s * (1.15 - i * 0.18), s * 0.15], [s * (1.1 - i * 0.18), -s * 0.02]]); for (let i = 0; i < 5; i++) ell(ctx, -s * 0.6 + i * s * 0.3, s * 0.3, 2, 2, "#7ae0ff"); } }),
    水母: (c, s, n, k) => jelly(c, s, n, k, { c: "rgba(200,160,255,.75)" }),
    盲鰻: (c, s, n, k) => eel(c, s, n, k, { c: "#c8a0a0", len: 2.2, w: 0.3 }),
    鯨鯊: (c, s, n, k) => shark(c, s, n, k, { c: "#3a5a7a", spots: true, spc: "rgba(255,255,255,.75)", gills: true }),
    鬼蝠魟: (c, s, n, k) => ray(c, s, n, k, { c: "#2a3240", horns: true }),
    黑鮪魚: (c, s, n, k) => fish(c, s, n, k, { c: "#1a2a4a", belly: "#c8d0d8", h: 0.42, len: 1.25, fork: 0.7, extra: (ctx, s) => { for (let i = 0; i < 5; i++) poly(ctx, "#f2d22a", [[-s * (0.3 + i * 0.12), -s * 0.38], [-s * (0.36 + i * 0.12), -s * 0.5], [-s * (0.42 + i * 0.12), -s * 0.38]]); } }),
    鰹魚: (c, s, n, k) => fish(c, s, n, k, { c: "#3a4a6a", belly: "#d8e0e8", h: 0.42, len: 1.15, fork: 0.7, stripes: [], extra: (ctx, s) => { ctx.strokeStyle = "rgba(40,50,80,.6)"; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-s * 0.6, s * (0.05 + i * 0.08)); ctx.lineTo(s * 0.6, s * (0.05 + i * 0.08)); ctx.stroke(); } } }),
    綠蠵龜: (c, s, n, k) => turtle(c, s, n, k, { c: "#6a7a3a" }),
    大鱷龜: (c, s, n, k) => turtle(c, s, n, k, { c: "#4a4a2a", skin: "#5a5a3a", spikes: true, beak: true }),
    雙髻鯊: (c, s, n, k) => shark(c, s, n, k, { c: "#6a7a8a", hammer: true }),
    大白鯊: (c, s, n, k) => shark(c, s, n, k, { c: "#7a8a98", teeth: true, gills: true }),
    翻車魚: (c, s, n, k) => sunfish(c, s, n, k, { c: "#9aa8b8" }),
    沙丁魚群: (c, s, n, k) => school(c, s, n, k, { c: "#7a9ab8" }),
    沙丁魚: (c, s, n, k) => school(c, s, n, k, { c: "#7a9ab8" }),
    海豚: (c, s, n, k) => whale(c, s * 0.85, n, k, { c: "#7a9ab8", belly: "#e0e8f0", fin: true, beak: true, h: 0.36 }),
    旗魚: (c, s, n, k) => fish(c, s, n, k, { c: "#2a4a8a", belly: "#d0d8e8", h: 0.35, len: 1.3, dorsal: 0.6, fin: "#3a6ac8", fork: 0.7, extra: (ctx, s) => poly(ctx, "#2a4a8a", [[s * 1.2, -s * 0.05], [s * 2.0, 0], [s * 1.2, s * 0.05]]) }),
    藍鯨: (c, s, n, k) => whale(c, s, n, k, { c: "#4a6a9a", grooves: true, fin: true, h: 0.36, spots: true }),
    虎鯨: (c, s, n, k) => whale(c, s, n, k, { c: "#14141a", belly: "#f4f4f8", patch: "#f4f4f8", fin: true, finTall: true }),
    鱷魚: (c, s, n, k) => croc(c, s, n, k, { c: "#4a6a3a" }),
    酸漿魷: (c, s, n, k) => squid(c, s, n, k, { c: "#a84a6a", bigEye: true }),
    海象: (c, s, n, k) => seal(c, s, n, k, { c: "#9a7a6a", tusks: true }),
    豹斑海豹: (c, s, n, k) => seal(c, s, n, k, { c: "#8a8a9a", spots: true, spc: "rgba(40,40,50,.6)", jaw: true }),
    海鰻: (c, s, n, k) => eel(c, s, n, k, { c: "#6a7a3a", len: 2.2, w: 0.4, teeth: true, spots: true, spc: "rgba(240,230,120,.7)" }),
    食人魚: (c, s, n, k) => fish(c, s, n, k, { c: "#7a8a9a", belly: "#d83a2a", h: 0.6, len: 0.9, extra: (ctx, s) => { for (let i = 0; i < 4; i++) poly(ctx, "#fff", [[s * (0.85 - i * 0.1), s * 0.15], [s * (0.8 - i * 0.1), s * 0.3], [s * (0.75 - i * 0.1), s * 0.15]]); } }),
    鮟鱇: (c, s, n, k) => angler(c, s, n, k, { c: "#3a3a5a" }),
    // ===== 原始水域 =====
    泥鰍: (c, s, n, k) => eel(c, s, n, k, { c: "#7a6a4a", len: 1.8, w: 0.36, spots: true, spc: "rgba(40,30,20,.5)" }),
    梭魚: (c, s, n, k) => fish(c, s, n, k, { c: "#8a98a8", belly: "#e8eef4", h: 0.26, len: 1.7, fork: 0.6, spots: 10, spc: "rgba(40,50,60,.6)", extra: (ctx, s) => { for (let i = 0; i < 4; i++) poly(ctx, "#fff", [[s * (1.6 - i * 0.12), s * 0.04], [s * (1.55 - i * 0.12), s * 0.16], [s * (1.5 - i * 0.12), s * 0.04]]); } }),
    海豹: (c, s, n, k) => seal(c, s, n, k, { c: "#9a9aa8", spots: true, spc: "rgba(60,60,70,.35)" }),
    蝰魚: (c, s, n, k) => fish(c, s, n, k, { c: "#1e2238", h: 0.32, len: 1.3, eye: 0.1, iris: "#7ae0ff", extra: (ctx, s) => { ctx.strokeStyle = "#e8f0ff"; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(s * (1.25 - i * 0.12), -s * 0.05); ctx.lineTo(s * (1.35 - i * 0.12), s * (0.45 + (i % 2) * 0.15)); ctx.stroke(); } for (let i = 0; i < 6; i++) ell(ctx, -s * 0.8 + i * s * 0.3, s * 0.22, 2, 2, "#7ae0ff"); } }),
    鱷雀鱔: (c, s, n, k) => fish(c, s, n, k, { c: "#6a7a4a", belly: "#c8c8a0", h: 0.28, len: 1.6, spots: 12, spc: "rgba(30,40,20,.6)", extra: (ctx, s) => { ctx.fillStyle = "#6a7a4a"; ctx.fillRect(s * 1.4, -s * 0.07, s * 0.6, s * 0.14); for (let i = 0; i < 4; i++) poly(ctx, "#fff", [[s * (1.95 - i * 0.14), s * 0.07], [s * (1.9 - i * 0.14), s * 0.16], [s * (1.85 - i * 0.14), s * 0.07]]); } }),
    幽靈魚: (c, s, n, k) => { c.globalAlpha *= 0.7; fish(c, s, n, k, { c: "#9ad8f0", h: 0.4, len: 1.1, fin: "rgba(154,216,240,.5)", iris: "#2a6a9a" }); c.globalAlpha /= 0.7; },
    巨齒鯊: (c, s, n, k) => shark(c, s, n, k, { c: "#4a5a68", teeth: true, gills: true, belly: "#c8d0d8" }),
    利維坦鯨: (c, s, n, k) => whale(c, s, n, k, { c: "#34343e", belly: "#8a8a96", h: 0.46, extra: true }) || (() => { for (let i = 0; i < 6; i++) poly(c, "#f4ead0", [[s * (1.05 - i * 0.14), s * 0.08], [s * (1.0 - i * 0.14), s * 0.3], [s * (0.95 - i * 0.14), s * 0.08]]); })(),
    鄧氏魚: (c, s, n, k) => fish(c, s, n, k, { c: "#5a5a6a", h: 0.46, len: 1.3, fork: 0.6, extra: (ctx, s) => { poly(ctx, "#8a8a98", [[s * 1.35, -s * 0.05], [s * 0.6, -s * 0.48], [s * 0.2, -s * 0.2], [s * 0.3, s * 0.3], [s * 1.3, s * 0.2]]); poly(ctx, "#d8d8e0", [[s * 1.3, s * 0.0], [s * 1.15, s * 0.2], [s * 1.05, s * 0.0]]); eye(ctx, s * 0.75, -s * 0.15, s * 0.1, "#c83a2a"); } }),
    恐鱷: (c, s, n, k) => croc(c, s, n, k, { c: "#3a4a2a" }),
    // 滄龍：鱷魚一樣的長頭、四片鰭、尾巴末端是下彎的尾鰭；顏色是蒼幽的藍
    滄龍: (c, s, n, k) => mosaOld(c, s, n, k, { body: "#2a6a9a", fin: "#1e4a6a", belly: "#c8e0f0", eye: true }),
    // 幽靈滄龍（滄龍名片：虎鯨再進化）：同一個外型、拿掉眼睛、換成幽靈魚的顏色（使用者 11/22）
    幽靈滄龍: (c, s, n, k) => { c.globalAlpha *= 0.9; mosaOld(c, s, n, k, { body: "#3f48cc", fin: "#2e36a8", belly: "#8fd3ea", eye: false, glow: true }); c.globalAlpha /= 0.9; },
    // 沉溺原始的蒼幽・滄龍（Boss）：照使用者的圖３——長長的鱷魚嘴張開、一排尖牙、藍色的眼睛和往下流的黑線、背上三片尖鰭、大大的上彎尾鰭、四片划水的鰭
    滄龍・原始: (c, s, n, k) => mosaNew(c, s, n, k),
    燈籠魚: (c, s, n, k) => fish(c, s, n, k, { c: "#2a3a5a", h: 0.4, len: 1.1, eye: 0.16, iris: "#1a2a4a", extra: (ctx, s) => { for (let i = 0; i < 6; i++) { const g = 0.6 + 0.4 * Math.sin(n / 200 + i); ell(ctx, -s * 0.7 + i * s * 0.28, s * 0.3, s * 0.06, s * 0.06, `rgba(140,220,255,${g})`); } } }),
  };
  // 舊的滄龍外型（現在給滄龍名片的幽靈滄龍用）
  function mosaOld(c, s, n, k, o) {
    const w = Math.sin(n / 260 + k) * s * 0.18;
    poly(c, o.fin, [[-s * 1.6, w], [-s * 2.1, w - s * 0.2], [-s * 2.0, w + s * 0.55]]);
    c.fillStyle = o.body; c.beginPath(); c.moveTo(-s * 0.5, -s * 0.25); c.quadraticCurveTo(-s * 1.2, w * 0.5, -s * 1.7, w); c.quadraticCurveTo(-s * 1.2, w * 0.5 + s * 0.15, -s * 0.5, s * 0.25); c.fill();
    for (const [x, y, a] of [[s * 0.35, -s * 0.38, -0.7], [s * 0.35, s * 0.38, 0.7], [-s * 0.45, -s * 0.32, -2.3], [-s * 0.45, s * 0.32, 2.3]]) ell(c, x, y, s * 0.36, s * 0.12, o.fin, a + Math.sin(n / 300 + k) * 0.2);
    ell(c, 0, 0, s * 0.9, s * 0.36, o.body);
    c.save(); c.beginPath(); c.ellipse(0, 0, s * 0.9, s * 0.36, 0, 0, P * 2); c.clip(); ell(c, 0, s * 0.3, s * 0.9, s * 0.2, o.belly); c.restore();
    poly(c, o.body, [[s * 0.75, -s * 0.2], [s * 1.75, -s * 0.06], [s * 1.75, s * 0.1], [s * 0.75, s * 0.24]]);
    for (let i = 0; i < 6; i++) poly(c, "#fff", [[s * (1.7 - i * 0.14), s * 0.06], [s * (1.65 - i * 0.14), s * 0.18], [s * (1.6 - i * 0.14), s * 0.06]]);
    if (o.eye) eye(c, s * 1.0, -s * 0.1, s * 0.07, "#5ad8ff");
    c.fillStyle = o.glow ? "rgba(143,211,234,.7)" : "rgba(160,230,255,.6)"; for (let i = 0; i < 5; i++) c.fillRect(-s * 0.6 + i * s * 0.28, -s * 0.06, s * 0.1, s * 0.04);
  }
  // 新的滄龍（圖３）：朝右畫。s ≈ 身長的四分之一
  function mosaNew(c, s, n, k) {
    const F = "#9ad8ea", E = "#3a4ad0", sw = Math.sin(n / 320 + k), jaw = 0.12 + Math.abs(Math.sin(n / 700 + k)) * 0.1;
    c.save(); c.lineJoin = "round"; c.lineCap = "round"; c.strokeStyle = E; c.lineWidth = Math.max(1.5, s * 0.035); c.fillStyle = F;
    const shape = (f) => { c.beginPath(); f(); c.fill(); c.stroke(); };
    // 尾鰭（大的上葉往後上方，小的下葉）
    shape(() => { c.moveTo(-s * 1.55, -s * 0.15 + sw * s * 0.05); c.quadraticCurveTo(-s * 2.1, -s * 0.9, -s * 2.15, -s * 1.55 + sw * s * 0.1); c.quadraticCurveTo(-s * 2.35, -s * 0.9, -s * 2.4, -s * 0.15); c.quadraticCurveTo(-s * 2.25, s * 0.35, -s * 2.1, s * 0.6); c.quadraticCurveTo(-s * 1.9, s * 0.2, -s * 1.55, s * 0.12); c.closePath(); });
    // 背上的三片尖鰭
    for (const [x, h, lean] of [[-s * 0.15, 0.95, 0.35], [s * 0.35, 1.0, 0.3], [s * 0.85, 0.6, 0.2]])
      shape(() => { c.moveTo(x - s * 0.28, -s * 0.28); c.quadraticCurveTo(x - s * 0.1, -s * (0.28 + h * 0.5), x + s * lean, -s * (0.28 + h) + sw * s * 0.04); c.quadraticCurveTo(x + s * 0.05, -s * 0.55, x + s * 0.18, -s * 0.3); c.closePath(); });
    // 後面的鰭（下方）
    shape(() => { c.moveTo(-s * 0.9, s * 0.25); c.quadraticCurveTo(-s * 1.0, s * 0.7, -s * 0.75 + sw * s * 0.08, s * 1.0); c.quadraticCurveTo(-s * 0.6, s * 0.55, -s * 0.5, s * 0.3); c.closePath(); });
    // 身體（頭粗、往尾巴變細）
    shape(() => { c.moveTo(s * 1.15, -s * 0.18); c.quadraticCurveTo(s * 0.4, -s * 0.48, -s * 0.6, -s * 0.36); c.quadraticCurveTo(-s * 1.25, -s * 0.26, -s * 1.6, -s * 0.12); c.lineTo(-s * 1.6, s * 0.12); c.quadraticCurveTo(-s * 1.1, s * 0.3, -s * 0.4, s * 0.38); c.quadraticCurveTo(s * 0.5, s * 0.46, s * 1.15, s * 0.28); c.closePath(); });
    // 前面的兩片鰭
    shape(() => { c.moveTo(s * 0.55, s * 0.3); c.quadraticCurveTo(s * 0.2, s * 0.62, -s * 0.15 + sw * s * 0.08, s * 0.55); c.quadraticCurveTo(-s * 0.25, s * 0.42, s * 0.1, s * 0.36); c.closePath(); });
    shape(() => { c.moveTo(s * 0.95, s * 0.3); c.quadraticCurveTo(s * 0.9, s * 0.65, s * 0.72 - sw * s * 0.06, s * 0.8); c.quadraticCurveTo(s * 0.62, s * 0.6, s * 0.72, s * 0.34); c.closePath(); });
    // 頭：長長的上顎、下顎（張開）
    const hx = s * 1.05;
    shape(() => { c.moveTo(hx, -s * 0.2); c.quadraticCurveTo(hx + s * 0.4, -s * 0.24, hx + s * 0.95, -s * 0.06 - jaw * s * 0.3); c.lineTo(hx + s * 1.0, s * 0.02 - jaw * s * 0.3); c.lineTo(hx + s * 0.1, s * 0.06); c.closePath(); });
    shape(() => { c.moveTo(hx, s * 0.2); c.quadraticCurveTo(hx + s * 0.4, s * 0.16 + jaw * s * 0.4, hx + s * 0.85, s * 0.18 + jaw * s * 0.6); c.lineTo(hx + s * 0.86, s * 0.28 + jaw * s * 0.6); c.quadraticCurveTo(hx + s * 0.35, s * 0.36 + jaw * s * 0.3, hx - s * 0.05, s * 0.32); c.closePath(); });
    // 牙
    c.fillStyle = "#fff"; c.lineWidth = Math.max(1, s * 0.02);
    for (let i = 0; i < 6; i++) { const x = hx + s * (0.2 + i * 0.13); shape(() => { c.moveTo(x, s * 0.03 - jaw * s * 0.05 * i); c.lineTo(x + s * 0.035, s * 0.12 - jaw * s * 0.05 * i); c.lineTo(x + s * 0.07, s * 0.03 - jaw * s * 0.05 * i); }); }
    for (let i = 0; i < 5; i++) { const x = hx + s * (0.25 + i * 0.13); shape(() => { c.moveTo(x, s * 0.2 + jaw * s * 0.1 * i); c.lineTo(x + s * 0.035, s * 0.1 + jaw * s * 0.1 * i); c.lineTo(x + s * 0.07, s * 0.2 + jaw * s * 0.1 * i); }); }
    // 眼睛：深藍色的眼眶、淺藍色的瞳孔，往下流的黑線、往後的一條線
    c.fillStyle = "#1a1aa8"; c.beginPath(); c.ellipse(hx + s * 0.08, -s * 0.06, s * 0.13, s * 0.08, 0, 0, P * 2); c.fill();
    c.strokeStyle = "#4ab8f0"; c.lineWidth = Math.max(1, s * 0.025); c.beginPath(); c.arc(hx + s * 0.1, -s * 0.06, s * 0.035, 0, P * 2); c.stroke();
    c.strokeStyle = "#1a1aa8"; c.lineWidth = Math.max(1.5, s * 0.04);
    c.beginPath(); c.moveTo(hx + s * 0.04, s * 0.0); c.lineTo(hx + s * 0.05, s * 0.36); c.stroke();
    c.beginPath(); c.moveTo(hx - s * 0.04, -s * 0.04); c.quadraticCurveTo(hx - s * 0.3, s * 0.02, hx - s * 0.45, s * 0.2); c.stroke();
    c.restore();
  }
  // 外型分類（原始水域等其他時空用）：直接指定體型
  const BODY = { fish, eel, ray, shark, whale, turtle, penguin, seal, squid, jelly, seahorse, croc, school, sunfish, angler, lionfish };

  R.SeaArt = {
    SP, BODY,
    has: (name) => !!SP[name],
    // 畫一隻：照 face 左右翻（不旋轉，免得魚倒過來）
    draw(ctx, name, x, y, s, face, now, col, k = 0, body) {
      const f = Math.cos(face || 0) >= 0 ? 1 : -1;
      ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
      if (body) BODY[body.type](ctx, s, now, k, body);
      else if (SP[name]) SP[name](ctx, s, now, k);
      else fish(ctx, s, now, k, { c: col || "#7a9ab8" });
      ctx.restore();
    },
  };
})();
