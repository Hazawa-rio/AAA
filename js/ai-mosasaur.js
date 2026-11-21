/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/ai-mosasaur.js": "20261122024623" });
// Boss：滄游・滄龍（#AQ00618 如此靜謐的蔚藍・原始水域；蒼幽成為原始獵手之後）
// 使用者 11/22 重做：
//   出場：地圖飄出大量泡沫，背景一道黑影竄出、變成滄龍（樣子照使用者的圖３）
//   啃咬：面前的紅框
//   噴射水柱：嘴巴放出水柱，用扇形掃過去（動畫是大量的泡泡）
//   尾鰭揮掃：甩出好幾道水波
//   呼喊：叫來幽靈魚（不攻擊）；滄龍下一回合會游過去吃掉牠們
//   溺亡（大招）：吃掉幽靈魚的下一回合，從角落離開戰場，再從某個角落鑽出來、穿過中間，
//     身後跟著覆蓋戰場的魚群（使用者的圖４），直線游出去。吃了幾隻魚就衝幾次（不回到中間，沿著直線離開再來一次）；最後回到中間
//   潛伏：藏身水中變成黑影（打不到）；下一次輪到牠時從黑影的位置鑽出來，周圍放出大量的泡泡
(function () {
  const R = (window.RPG = window.RPG || {});
  R.AI = R.AI || {};
  const now = () => performance.now();
  const fxOf = (b) => (b.mosa = b.mosa || { fx: [] });
  const fishOf = (b, u) => b.mainEnemies().filter((e) => e.kind === u.def.call.kind && e.alive);

  R.AI.mosasaur = {
    init(b, u) { u.state.callAt = 2; u.state.lurkAt = 4; u.state.ate = 0; u.state.jetCd = 0; u.state.waveCd = 0; u.state.calledRound = -1; },
    async takeTurn(b, u) {
      const D = u.def;
      if (u.state.jetCd > 0) u.state.jetCd--;
      if (u.state.waveCd > 0) u.state.waveCd--;
      if (u.state.lurk) await this.emerge(b, u);
      // 吃了幽靈魚的下一回合：溺亡
      if (u.state.ate > 0 && u.state.ateRound < b.round) {
        const n = u.state.ate; u.state.ate = 0;
        await this.drown(b, u, n);
        u.ap = 0; return;
      }
      let guard = 0;
      while (u.ap > 0 && u.alive && !b.dead && b.phase !== "over" && guard++ < 10) {
        const t = b.aggroTarget(u) || b.player, fish = fishOf(b, u), d = R.dist(u.x, u.y, t.x, t.y);
        if (fish.length && u.ap >= D.eat.ap && b.round > u.state.calledRound) { await this.eat(b, u, fish); continue; }
        if (!fish.length && !u.state.ate && b.round >= u.state.callAt && u.ap >= D.call.ap) { await this.call(b, u); continue; }
        if (!u.state.ate && b.round >= u.state.lurkAt && u.ap >= D.lurk.ap) { this.lurk(b, u, t); return; }
        if (d <= u.r + t.r + D.bite.length * 0.75 && u.ap >= D.bite.ap) { await this.bite(b, u, t); continue; }
        if (!u.state.jetCd && u.ap >= D.jet.ap && d <= D.jet.radius) { await this.jet(b, u, t); continue; }
        if (!u.state.waveCd && u.ap >= D.waves.ap) { await this.waves(b, u, t); continue; }
        if (!b.enemyMoveToward(u, t, u.r + t.r + 30)) break;
        b.emit();
        await b.wait(b.cfg.aiDelay * 0.6);
      }
      u.ap = 0;
    },
    face(u, t) { u.facing = Math.atan2(t.y - u.y, t.x - u.x); return u.facing; },

    // 啃咬
    async bite(b, u, t) {
      const D = u.def.bite, ang = this.face(u, t);
      b.enemySpend(u, D.ap);
      b.say(`${u.name}張開長長的嘴——${D.name}！`);
      await b.telegraph(u, { shape: "rect", x: u.x, y: u.y, ang, length: u.r + D.length, width: D.width, reaction: D.reaction }, { base: D.base, sound: D.sound, label: `${u.name}的${D.name}` });
    },
    // 噴射水柱：扇形掃過去
    async jet(b, u, t) {
      const D = u.def.jet, ang = this.face(u, t);
      b.enemySpend(u, D.ap);
      u.state.jetCd = D.cooldown + 1;
      b.say(`${u.name}從嘴裡噴出水柱，橫著掃了過來——${D.name}！`);
      const half = (D.half * Math.PI) / 180;
      fxOf(b).fx.push({ k: "jet", x: u.x, y: u.y, ang, half, r: D.radius, t0: now() + D.reaction * 1000 - 250, dur: 900, from: u });
      await b.telegraph(u, { shape: "sector", x: u.x, y: u.y, ang, half, radius: D.radius, reaction: D.reaction }, { base: D.base, sound: D.sound, label: `${u.name}的${D.name}` });
    },
    // 尾鰭揮掃：好幾道水波
    async waves(b, u, t) {
      const D = u.def.waves, ang = this.face(u, t), n = D.count;
      b.enemySpend(u, D.ap);
      u.state.waveCd = D.cooldown + 1;
      b.say(`${u.name}甩動巨大的尾鰭，掃出 ${n} 道水波！`);
      const list = [];
      for (let i = 0; i < n; i++) {
        const a = ang + ((i - (n - 1) / 2) * D.spread * Math.PI) / 180;
        fxOf(b).fx.push({ k: "wave", x: u.x, y: u.y, ang: a, len: D.length, w: D.width, t0: now() + (D.reaction + i * 0.12) * 1000, dur: 700 });
        list.push(b.wait(i * 0.12).then(() => b.telegraph(u, { shape: "rect", x: u.x, y: u.y, ang: a, length: D.length, width: D.width, reaction: D.reaction }, { base: D.base, sound: i ? null : D.sound, label: `${u.name}的${D.name}`, quiet: i > 0 })));
      }
      await Promise.all(list);
    },
    // 呼喊：叫來幽靈魚（不攻擊）
    async call(b, u) {
      const D = u.def.call, A = b.cfg.arena;
      b.enemySpend(u, D.ap);
      u.state.callAt = b.round + D.every;
      u.state.calledRound = b.round;
      b.say(D.line);
      b.emit({ type: "bossUlt", unit: u, text: D.name });
      b.emit({ type: "sfx", sound: "sounds/cangyou-whale.mp3" });
      const n = Math.min(D.count, D.max - fishOf(b, u).length);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, x = Math.min(A.w - 60, Math.max(60, u.x + Math.cos(a) * 200)), y = Math.min(A.h - 60, Math.max(60, u.y + Math.sin(a) * 160));
        const f = b.summonEnemy(D.kind, x, y);
        b.emit({ type: "buff", unit: f, text: "被呼喚了", color: "#5ab8d8" });
      }
      await b.wait(0.9);
      b.emit({ type: "bossUltEnd" });
    },
    // 吃掉幽靈魚：游過去、一口吞下（下一回合放溺亡）
    async eat(b, u, fish) {
      const f = fish.sort((a, c) => R.dist(a.x, a.y, u.x, u.y) - R.dist(c.x, c.y, u.x, u.y))[0];
      b.enemySpend(u, u.def.eat.ap);
      const from = { x: u.x, y: u.y }, a = Math.atan2(f.y - u.y, f.x - u.x), stop = R.dist(u.x, u.y, f.x, f.y) - u.r - f.r + 10;
      if (stop > 0) { u.x += Math.cos(a) * stop; u.y += Math.sin(a) * stop; }
      u.facing = a;
      b.emit({ type: "leap", unit: u, from, to: { x: u.x, y: u.y }, duration: 0.35, height: 6 });
      f.hp = 0; f.alive = false;
      b.units = b.units.filter((x) => x !== f);                 // 被吃掉：直接從戰場上消失
      const oi = b.order.indexOf(f); if (oi >= 0) { b.order.splice(oi, 1); if (oi < b.idx) b.idx--; }
      b.emit({ type: "sfx", sound: "sounds/wolf-bite.mp3", delay: 0.3 });
      fxOf(b).fx.push({ k: "burst", x: f.x, y: f.y, r: 60, t0: now() + 300, dur: 700, n: 14 });
      u.state.ate = (u.state.ate || 0) + 1; u.state.ateRound = b.round;
      b.say(`${u.name}一口吞掉了${f.name}……（吃了 ${u.state.ate} 隻：下一回合會放「${u.def.drown.name}」，衝 ${u.state.ate} 次）`);
      b.emit({ type: "buff", unit: u, text: `吞下幽靈魚 ×${u.state.ate}`, color: "#c0392b" });
      b.checkEnd?.();
      await b.wait(0.5);
    },
    // 潛伏：變成黑影（打不到），下次輪到牠時從黑影的位置鑽出
    lurk(b, u, t) {
      const D = u.def.lurk;
      b.enemySpend(u, D.ap);
      u.state.lurkAt = b.round + D.every;
      u.state.lurk = { x: t.x, y: t.y, from: { x: u.x, y: u.y }, t0: now() };
      b.emit({ type: "dive", unit: u, x: u.x, y: u.y, sound: D.sound });
      u.state.dived = true;
      u.ap = 0;
      b.say(`${u.name}沉進水裡，變成一道黑影……（下次輪到牠時，會從黑影的位置鑽出來）`);
      b.emit();
    },
    async emerge(b, u) {
      const D = u.def.lurk, L = u.state.lurk;
      u.state.lurk = null;
      b.emit({ type: "bossUlt", unit: u, text: D.name });
      b.say(`黑影猛地往上衝——${u.name}鑽出了水面！`);
      fxOf(b).fx.push({ k: "burst", x: L.x, y: L.y, r: D.radius + 40, t0: now() + D.reaction * 1000, dur: 1100, n: 40 });
      await b.telegraph(u, { shape: "circle", x: L.x, y: L.y, radius: D.radius, reaction: D.reaction, burst: true }, { base: D.base, sound: D.sound, label: `${u.name}的${D.name}` });
      b.emit({ type: "bossUltEnd" });
      this.place(b, u, L.x, L.y);
      u.state.dived = false;
      b.emit({ type: "surface", unit: u, x: u.x, y: u.y });
      b.emit({ type: "move", unit: u });
    },
    // 找 (x, y) 附近的空位放下
    place(b, u, x, y) {
      const A = b.cfg.arena, ok = (px, py) => px > u.r && py > u.r && px < A.w - u.r && py < A.h - u.r && !b.blocked(u, px, py);
      if (ok(x, y)) { u.x = x; u.y = y; return; }
      for (let r = 20; r < 500; r += 20) for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (ok(px, py)) { u.x = px; u.y = py; return; } }
    },
    // 溺亡：從角落鑽出來穿過中間，身後跟著覆蓋戰場的魚群；吃了幾隻就衝幾次
    async drown(b, u, n) {
      const D = u.def.drown, A = b.cfg.arena, C = { x: A.w / 2, y: A.h / 2 };
      b.emit({ type: "bossUlt", unit: u, text: D.name });
      b.say(`${u.name}沉進水裡，從戰場的角落游了出去——「${D.name}」！（${n} 次）`);
      b.emit({ type: "dive", unit: u, x: u.x, y: u.y, sound: "sounds/cangyou-bubbles.mp3" });
      u.state.dived = true;
      await b.wait(0.6);
      const corners = [{ x: -60, y: -60 }, { x: A.w + 60, y: -60 }, { x: A.w + 60, y: A.h + 60 }, { x: -60, y: A.h + 60 }];
      let last = -1;
      for (let i = 0; i < n && u.alive && !b.dead && b.phase !== "over"; i++) {
        let ci; do { ci = Math.floor(Math.random() * 4); } while (ci === last);
        last = ci;
        const S = corners[ci], ang = Math.atan2(C.y - S.y, C.x - S.x), len = Math.hypot(A.w, A.h) + 240;
        b.say(i ? `${u.name}沒有回到中間——沿著直線游出去，又從另一個角落鑽了進來！（第 ${i + 1} 次）` : `${u.name}從角落鑽了出來，身後跟著一整片魚群！`);
        fxOf(b).fx.push({ k: "school", x: S.x, y: S.y, ang, len, w: D.width, warn: now(), t0: now() + D.reaction * 1000 - 200, dur: 1300 });
        await b.telegraph(u, { shape: "rect", x: S.x, y: S.y, ang, length: len, width: D.width, reaction: D.reaction }, { base: D.base, sound: D.sound, label: `${u.name}的${D.name}` });
        await b.wait(0.7);
      }
      this.place(b, u, C.x, C.y);
      u.state.dived = false;
      b.emit({ type: "surface", unit: u, x: u.x, y: u.y });
      b.emit({ type: "move", unit: u });
      fxOf(b).fx.push({ k: "burst", x: u.x, y: u.y, r: 140, t0: now(), dur: 900, n: 24 });
      b.emit({ type: "bossUltEnd" });
    },
  };

  // 被呼喚的幽靈魚：不攻擊，只在滄龍身邊游
  R.AI.mosaFish = {
    async takeTurn(b, u) {
      const m = b.mainEnemies().find((e) => e.def.ai === "mosasaur" && e.alive);
      if (m && u.ap >= u.def.moveCost) {
        const a = Math.random() * Math.PI * 2, tgt = { x: m.x + Math.cos(a) * (m.r + 90), y: m.y + Math.sin(a) * (m.r + 70) };
        b.enemyMoveToward(u, tgt, 10);
      }
      u.ap = 0;
    },
  };

  // ===== 畫面 =====
  const A0 = R.EnemyArt || (R.EnemyArt = {});
  A0.mosasaur = (ctx, u, p, now2) => {
    ctx.globalAlpha = u.alive === false ? 0.3 : 1;
    R.SeaArt?.draw(ctx, "滄龍・原始", p.x, p.y + Math.sin(now2 / 500) * 3, u.r * 1.05, u.facing ?? Math.PI, u.alive === false ? 0 : now2, null, 0);
    ctx.globalAlpha = 1;
  };
  A0.mosaFish = (ctx, u, p, now2) => {
    ctx.globalAlpha = u.alive === false ? 0.2 : 1;
    R.SeaArt?.draw(ctx, "幽靈魚", p.x, p.y + Math.sin(now2 / 300 + u.x) * 3, u.r * 0.85, u.facing ?? 0, now2, null, (u.x || 0) / 50);
    ctx.globalAlpha = 1;
  };
  function bubble(ctx, x, y, r, a) {
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(170,220,250,.3)"; ctx.strokeStyle = "rgba(200,240,255,.9)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, Math.PI * 2); ctx.fill();
  }
  const hash = (i) => { const x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); };
  function shadowArt(ctx, x, y, s, face, t, alpha) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.filter = "brightness(0)";
    R.SeaArt?.draw(ctx, "滄龍・原始", x, y, s, face, t, null, 0);
    ctx.restore();
  }
  // 出場動畫：泡沫 → 背景竄出黑影 → 變成滄龍
  const INTRO = 3200;
  function drawIntro(ctx, b, t) {
    const M = b.mosa, k = (t - M.intro) / INTRO, A = b.cfg.arena;
    if (k >= 1) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - k) * 4) * 0.55; ctx.fillStyle = "#020a14"; ctx.fillRect(0, 0, A.w, A.h);
    for (let i = 0; i < 90; i++) {
      const sp = 0.6 + hash(i) * 0.8, y = A.h + 40 - ((k * sp * 1.6 + hash(i + 7)) % 1.3) * (A.h + 120), x = hash(i + 3) * A.w + Math.sin(t / 300 + i) * 10;
      bubble(ctx, x, y, 3 + hash(i + 11) * 10, Math.min(1, (1 - k) * 3) * 0.85);
    }
    // 黑影：從左邊背景竄過來，越來越大
    if (k > 0.3) {
      const q = Math.min(1, (k - 0.3) / 0.5), x = -200 + (A.w / 2 + 200) * q, s = 30 + 50 * q;
      shadowArt(ctx, x, A.h / 2 - 150 + (1 - q) * 120, s, 0, t, Math.min(1, (1 - k) * 4) * 0.85);
    }
    ctx.restore();
  }
  function drawFx(ctx, b, t) {
    const M = b.mosa;
    M.fx = M.fx.filter((f) => t < f.t0 + f.dur);
    for (const f of M.fx) {
      const k = (t - f.t0) / f.dur;
      if (f.k === "school" && t < f.t0) {
        // 溺亡的預告：魚群的影子在角落聚集
        const q = Math.min(1, (t - f.warn) / Math.max(1, f.t0 - f.warn));
        ctx.save(); ctx.globalAlpha = 0.25 + 0.2 * q; ctx.fillStyle = "#04121e";
        ctx.beginPath(); ctx.arc(f.x, f.y, 120 + q * 60, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        continue;
      }
      if (k < 0) continue;
      ctx.save();
      if (f.k === "jet") {
        // 嘴巴噴出的水柱：從扇形的一邊掃到另一邊，沿路一大串泡泡
        const a = f.ang - f.half + f.half * 2 * Math.min(1, k * 1.25), hx = f.x + Math.cos(a) * 40, hy = f.y + Math.sin(a) * 40;
        ctx.globalAlpha = 1 - Math.max(0, k - 0.8) * 5;
        ctx.strokeStyle = "rgba(126,200,240,.55)"; ctx.lineWidth = 46; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(f.x + Math.cos(a) * f.r, f.y + Math.sin(a) * f.r); ctx.stroke();
        ctx.strokeStyle = "rgba(235,250,255,.9)"; ctx.lineWidth = 14; ctx.stroke();
        for (let i = 0; i < 26; i++) { const d = 50 + hash(i) * (f.r - 50), aa = a - (hash(i + 5) * 0.35) * Math.min(1, k * 2); bubble(ctx, f.x + Math.cos(aa) * d, f.y + Math.sin(aa) * d - k * 20, 4 + hash(i + 9) * 8, 0.8 * (1 - k)); }
      } else if (f.k === "wave") {
        const d = f.len * Math.min(1, k * 1.4), cx = f.x + Math.cos(f.ang) * d, cy = f.y + Math.sin(f.ang) * d;
        ctx.translate(cx, cy); ctx.rotate(f.ang); ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = "rgba(160,220,250,.9)"; ctx.lineWidth = 6; ctx.lineCap = "round";
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-i * 18, 0, f.w / 2, -1.1, 1.1); ctx.stroke(); }
      } else if (f.k === "burst") {
        for (let i = 0; i < f.n; i++) { const a = hash(i) * Math.PI * 2, d = f.r * (0.2 + 0.8 * Math.min(1, k * 1.5)) * (0.5 + hash(i + 3) * 0.5); bubble(ctx, f.x + Math.cos(a) * d, f.y + Math.sin(a) * d - k * 40, 4 + hash(i + 7) * 9, 1 - k); }
      } else if (f.k === "school") {
        // 溺亡：滄龍在前面，身後跟著覆蓋戰場的魚群（使用者的圖４：一大片扇形往前推）
        const head = f.len * Math.min(1, k * 1.15), dx = Math.cos(f.ang), dy = Math.sin(f.ang), px = -dy, py = dx;
        ctx.globalAlpha = 1 - Math.max(0, k - 0.85) / 0.15;
        for (let i = 0; i < 70; i++) {
          const back = 60 + hash(i) * 520, side = (hash(i + 13) - 0.5) * f.w * (0.5 + back / 700), d = head - back;
          if (d < 0) continue;
          const x = f.x + dx * d + px * side, y = f.y + dy * d + py * side;
          R.SeaArt?.draw(ctx, "幽靈魚", x, y + Math.sin(t / 200 + i) * 4, 10 + hash(i + 4) * 8, f.ang, t, null, i);
        }
        R.SeaArt?.draw(ctx, "滄龍・原始", f.x + dx * head, f.y + dy * head, 70, f.ang, t, null, 0);
      }
      ctx.restore();
    }
  }
  // 潛伏中的黑影
  function drawLurk(ctx, b, t, H) {
    for (const u of b.mainEnemies()) {
      const L = u.state.lurk; if (!L || !u.alive) continue;
      const q = Math.min(1, (t - L.t0) / 900), x = L.from.x + (L.x - L.from.x) * q, y = L.from.y + (L.y - L.from.y) * q;
      shadowArt(ctx, x, y, u.r * 0.9, Math.atan2(L.y - L.from.y, L.x - L.from.x), t, 0.45 + 0.1 * Math.sin(t / 300));
      H.circle(L.x, L.y, u.def.lurk.radius, "rgba(10,30,60,.7)", "rgba(10,30,60,.08)", 2, [10, 8]);
      H.label("潛伏的黑影：下次輪到滄龍時從這裡鑽出", L.x, L.y - u.def.lurk.radius - 12, "#1a3a6a", 12);
    }
  }

  const V = R.CONFIG?.rooms?.wild?.variants?.mosasaur;
  if (V) {
    // 開戰前：出場動畫（滄龍先藏起來）
    V.preStart = (b) => new Promise((res) => {
      const M = fxOf(b); M.intro = now();
      const boss = b.mainEnemies().find((e) => e.def.ai === "mosasaur");
      if (boss) boss.state.dived = true;
      b.emit({ type: "sfx", sound: "sounds/cangyou-bubbles.mp3" });
      setTimeout(() => b.emit({ type: "sfx", sound: "sounds/cangyou-whale.mp3" }), 1100);
      setTimeout(() => { if (boss) { boss.state.dived = false; b.emit({ type: "surface", unit: boss, x: boss.x, y: boss.y }); } b.say("滄游・滄龍浮上來了"); res(); }, INTRO - 400);
    });
    V.drawRoom = (ctx, t, b, H) => {
      const M = b.mosa; if (!M) return;
      drawLurk(ctx, b, t, H);
      drawFx(ctx, b, t);
      if (M.intro) drawIntro(ctx, b, t);
    };
  }
})();
