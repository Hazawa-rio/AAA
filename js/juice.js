/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/juice.js": "20261123215910" });
// 動畫手感層（使用者 11/23：畫面簡約、動畫更好）——戰鬥畫面共用的「打擊感」工具
//   補間＋緩動：R.Juice.tween(物件, {屬性: 目標}, 毫秒, 緩動, {delay, done})
//   畫面震動（創傷值）：shake(0～1)；越大震得越兇，平滑地衰減（取代舊的固定隨機震動）
//   命中停頓：hitstop(毫秒)——畫面停在這一幀（遊戲規則照常跑），停完接著播
//   單位：squash(單位, 寬倍率, 高倍率, 毫秒) 壓扁回彈、flash(單位) 受擊閃白、nudge(單位, 角度, 距離) 往某個方向撲一下再回來
//   粒子：burst(x, y, {n, color, speed, life, size, gravity, shape: spark|dust|shard|feather|wisp, ang, spread, toward})
//   全畫面：dim(濃度, 毫秒) 壓暗（蓄力）、flashScreen(顏色, 毫秒)
//   受到傷害會自動：目標壓扁、閃白、噴一點火花、依傷害比例震動；一次扣很多血（≥ 最大生命 18%）會有短短的命中停頓
//   第一版的樣板：彌華姬的啼哭之雀、伊爾舒的突刺和斬擊（使用者指定）
//   之後要疊 PixiJS 特效畫布（使用者 11/23 決定）：沙盒連不到 CDN，要等 pixi.min.js 放進專案再做
(function () {
  const R = (window.RPG = window.RPG || {});
  const now = () => performance.now();

  // ===== 緩動 =====
  const E = {
    linear: (t) => t,
    outQuad: (t) => 1 - (1 - t) * (1 - t),
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inCubic: (t) => t * t * t,
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    outElastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  };

  // ===== 補間 =====
  let tweens = [];
  function tween(obj, to, ms, ease = "outCubic", o = {}) {
    const tw = { obj, to, from: null, ms: Math.max(1, ms), ease: typeof ease === "function" ? ease : E[ease] || E.outCubic, t0: now() + (o.delay || 0), done: o.done };
    tweens.push(tw);
    return tw;
  }
  function stepTweens(t) {
    if (!tweens.length) return;
    const keep = [];
    for (const tw of tweens) {
      if (t < tw.t0) { keep.push(tw); continue; }
      if (!tw.from) { tw.from = {}; for (const k in tw.to) tw.from[k] = tw.obj[k] ?? 0; }
      const k = Math.min(1, (t - tw.t0) / tw.ms), e = tw.ease(k);
      for (const p in tw.to) tw.obj[p] = tw.from[p] + (tw.to[p] - tw.from[p]) * e;
      if (k < 1) keep.push(tw); else tw.done?.();
    }
    tweens = keep;
  }

  // ===== 畫面震動（創傷值：震動量＝創傷²，平滑的雜訊） =====
  let trauma = 0, lastT = now();
  const shake = (a) => { trauma = Math.min(1, trauma + a); };
  function offset(t, legacyUntil) {
    if (legacyUntil && t < legacyUntil) trauma = Math.max(trauma, 0.42);     // 舊的 shakeUntil 也走這裡
    if (trauma <= 0.001) return null;
    const s = trauma * trauma, n = (f, p) => Math.sin(t / f + p) * 0.6 + Math.sin(t / (f * 0.43) + p * 2.1) * 0.4;
    return { x: 16 * s * n(37, 1.3), y: 16 * s * n(41, 4.7), rot: 0.02 * s * n(53, 2.2) };
  }

  // ===== 命中停頓 =====
  let stopUntil = 0, lastStop = 0;
  function hitstop(ms) { const t = now(); stopUntil = Math.max(stopUntil, t + ms); lastStop = t; }
  const frozen = (t) => t < stopUntil;

  // ===== 單位：壓扁、閃白、撲一下 =====
  const U = new Map();         // id → { sx, sy, ox, oy, flash }
  const st = (u) => { let s = U.get(u.id); if (!s) U.set(u.id, (s = { sx: 1, sy: 1, ox: 0, oy: 0, flash: 0 })); return s; };
  function squash(u, sx, sy, ms = 260) {
    if (!u) return;
    const s = st(u); s.sx = sx; s.sy = sy;
    tween(s, { sx: 1, sy: 1 }, ms, "outElastic");
  }
  function flash(u, ms = 140) { if (!u) return; const s = st(u); s.flash = 1; tween(s, { flash: 0 }, ms, "outQuad"); }
  // 往 ang 方向撲 d 再回來（預備動作：先往反方向縮一點）
  function nudge(u, ang, d = 14, o = {}) {
    if (!u) return;
    const s = st(u), c = Math.cos(ang), n = Math.sin(ang), back = o.back ?? d * 0.4, pre = o.pre ?? 70;
    tween(s, { ox: -c * back, oy: -n * back }, pre, "outQuad", { delay: o.delay || 0 });
    tween(s, { ox: c * d, oy: n * d }, 80, "outExpo", { delay: (o.delay || 0) + pre });
    tween(s, { ox: 0, oy: 0 }, 260, "outCubic", { delay: (o.delay || 0) + pre + 90 });
  }
  const unit = (u) => { const s = U.get(u.id); return s && (s.sx !== 1 || s.sy !== 1 || s.ox || s.oy || s.flash > 0.01) ? s : null; };

  // ===== 粒子 =====
  let parts = [];
  function burst(x, y, o = {}) {
    const n = o.n ?? 10, cols = [].concat(o.color || "#fff");
    for (let i = 0; i < n; i++) {
      const a = o.ang != null ? o.ang + (Math.random() - 0.5) * (o.spread ?? Math.PI * 2) : Math.random() * Math.PI * 2;
      const sp = (o.speed ?? 260) * (0.45 + Math.random() * 0.75);
      let px = x, py = y, vx = Math.cos(a) * sp, vy = Math.sin(a) * sp;
      if (o.toward) { const r = o.radius ?? 90; px = x + Math.cos(a) * r; py = y + Math.sin(a) * r; vx = -Math.cos(a) * sp; vy = -Math.sin(a) * sp; }      // 往中心聚集（蓄力）
      parts.push({ x: px, y: py, vx, vy, t0: now() + (o.delay || 0) * 1000, life: (o.life ?? 520) * (0.6 + Math.random() * 0.6), size: (o.size ?? 5) * (0.6 + Math.random() * 0.8), col: cols[i % cols.length], g: o.gravity ?? 0, drag: o.drag ?? 3.2, shape: o.shape || "spark", rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12 });
    }
  }
  function drawParticles(ctx, t, dt) {
    if (!parts.length) return;
    const keep = [];
    ctx.save();
    for (const p of parts) {
      if (t < p.t0) { keep.push(p); continue; }
      const k = (t - p.t0) / p.life;
      if (k >= 1) continue;
      keep.push(p);
      const f = Math.exp(-p.drag * dt);
      p.vx *= f; p.vy = p.vy * f + p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      const a = 1 - k * k;
      ctx.globalAlpha = a;
      if (p.shape === "spark") {
        // 拉長的火花：沿著速度方向
        const v = Math.hypot(p.vx, p.vy), L = Math.min(26, 3 + v * 0.05) * (1 - k * 0.5);
        ctx.strokeStyle = p.col; ctx.lineWidth = p.size * (1 - k * 0.6); ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - (p.vx / (v || 1)) * L, p.y - (p.vy / (v || 1)) * L); ctx.stroke();
      } else if (p.shape === "shard") {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col;
        const s = p.size * 1.6 * (1 - k * 0.4); ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s * 0.5, s * 0.45); ctx.lineTo(-s * 0.3, -s * 0.5); ctx.closePath(); ctx.fill(); ctx.restore();
      } else if (p.shape === "feather") {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * 0.4); ctx.fillStyle = p.col;
        const s = p.size * 2; ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.32, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.stroke(); ctx.restore();
      } else if (p.shape === "wisp") {
        // 煙霧般的一團（心魔、陰霾）
        ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + k * 1.6), 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - k * 0.5), 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
    parts = keep;
  }

  // ===== 全畫面：壓暗、閃光 =====
  const scr = { dim: 0, flash: 0, col: "#fff" };
  function dim(a, ms = 600, hold = 0) { tween(scr, { dim: a }, 160, "outQuad"); tween(scr, { dim: 0 }, ms, "inOutSine", { delay: 160 + hold }); }
  function flashScreen(col = "#fff", ms = 160, a = 0.55) { scr.col = col; scr.flash = a; tween(scr, { flash: 0 }, ms, "outQuad"); }
  function drawScreen(ctx, w, h) {
    if (scr.dim > 0.005) { ctx.save(); const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.75); g.addColorStop(0, `rgba(8,4,14,${scr.dim * 0.55})`); g.addColorStop(1, `rgba(8,4,14,${scr.dim})`); ctx.fillStyle = g; ctx.fillRect(-40, -40, w + 80, h + 80); ctx.restore(); }
    if (scr.flash > 0.005) { ctx.save(); ctx.globalAlpha = scr.flash; ctx.fillStyle = scr.col; ctx.fillRect(-40, -40, w + 80, h + 80); ctx.restore(); }
  }

  // ===== 每一幀 =====
  function update(t) {
    const dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;
    stepTweens(t);
    trauma = Math.max(0, trauma - dt * 1.6);
    return dt;
  }

  // ===== 受傷的通用反應（battle-ui 的 damage 事件呼叫） =====
  function onDamage(u, amount, src, o = {}) {
    if (!u || !(amount > 0)) return;
    const ratio = amount / Math.max(1, u.maxHp || 100), big = ratio >= 0.18 || o.big;
    const ang = src ? Math.atan2(u.y - src.y, u.x - src.x) : -Math.PI / 2;
    const s = Math.min(0.32, 0.1 + ratio * 0.9);
    squash(u, 1 + s * Math.abs(Math.cos(ang)) - s * 0.5, 1 + s * Math.abs(Math.sin(ang)) - s * 0.5, 300);
    flash(u, big ? 200 : 130);
    burst(u.x, u.y, { n: big ? 12 : 6, color: o.color || ["#fff", "#ffd27a"], speed: big ? 380 : 260, life: 360, size: 3.2, ang, spread: 1.6 });
    shake(Math.min(0.5, 0.06 + ratio * 1.2) * (u.team === "player" ? 1.2 : 1));
    if (big && now() - lastStop > 220) hitstop(o.stop ?? 70);
  }
  // 延遲執行（配合事件的 delay）
  const at = (sec, fn) => (sec > 0 ? setTimeout(fn, sec * 1000) : fn());

  R.Juice = { E, tween, update, shake, offset, hitstop, frozen, squash, flash, nudge, unit, burst, drawParticles, dim, flashScreen, drawScreen, onDamage, at, _dbg: () => ({ tweens: tweens.length, parts: parts.length, trauma, stopUntil }) };
})();
