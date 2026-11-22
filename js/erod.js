/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/erod.js": "20261122223322" });
// 戰役「命運的考驗」（S 級）：命運的見證者・厄羅德（使用者 11/22 的設計）
//   為命運卡帶來考驗的見證者之一，自身也是考驗。方塊人形＋A 字形的兜帽（使用者的圖１），眼睛和兜帽上的寶石照型態變色
//   行動點非常多（8 點）、動作頻繁；四把武器＝四個型態，自己判斷切換（圖２）：
//     烈火權杖（火焰：高主動、遠程、射程較短）・湧泉聖杯（水流：後撤、炮台、蓄力長；聖杯漂在頭上）
//     颶風寶劍（風暴：高機動、快速斬擊、一次只鎖一個目標）・黃金戰槌（大地：低機動、蓄力大範圍；雙手＝畫在身體正前方，不畫手）
//   換型態：對應顏色的周圍擊退（不造成傷害）
//   沒有特殊的弱化機制：玩家要把握四個型態的缺點
//   打倒之後：大量金幣、從四張特殊命運卡選一張（js/tarot.js）
// 數值都是暫定（Claude）；行動點每個技能 1～3 點，一回合最多演 ~14 秒
(function () {
  const R = (window.RPG = window.RPG || {});
  const C = R.CONFIG;
  if (!C) return;
  const E = C.enemies;
  const now = () => performance.now();
  const dist = (a, b, c, d) => Math.hypot(a - c, b - d);
  const rad = (d) => (d * Math.PI) / 180;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const hash = (i) => { const x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); };

  // ===== 型態 =====
  const FORMS = {
    fire: { n: "火焰型態", w: "烈火權杖", c: "#ff3a2a", c2: "#ff9a2a", sound: "sounds/marika-fire.mp3" },
    water: { n: "水流型態", w: "湧泉聖杯", c: "#2a8aff", c2: "#9ad8ff", sound: "sounds/cangyou-bubbles.mp3" },
    storm: { n: "風暴型態", w: "颶風寶劍", c: "#7ae8b0", c2: "#d8fff0", sound: "sounds/ilshu-slash.mp3" },
    earth: { n: "大地型態", w: "黃金戰槌", c: "#ffc820", c2: "#fff0a0", sound: "sounds/bastian-impact-1.mp3" },
  };
  // ===== 數值（暫定） =====
  const S = {
    ult: 18,                 // 大招：累積花掉的行動點到這個數
    minTurns: 2,             // 一個型態至少待幾個回合（避免一直換）
    turnCap: 14,             // 一回合最多演幾秒
    shift: { ap: 1, radius: 230, push: 150 },
    fire: {
      barrage: { ap: 1, n: 5, spread: 9, speed: 520, range: 520, r: 13, base: 13 },
      jet: { ap: 1, length: 560, width: 90, reaction: 0.95, base: 22 },
      rain: { ap: 2, n: 6, radius: 72, reaction: 1.15, base: 18 },
      orbit: { ap: 1, n: 12, speed: 300, range: 560, r: 13, base: 12, spin: 0.7 },
      dragon: { ap: 3, width: 150, reaction: 2.2, base: 38, burst: 36, speed: 380, r: 12, burstBase: 12 },
    },
    water: {
      wave: { ap: 2, half: 52, radius: 520, reaction: 1.45, base: 26, push: 90 },
      jet: { ap: 1, length: 780, width: 70, reaction: 1.25, base: 24 },
      bomb: { ap: 1, hops: 3, radius: 62, reaction: 0.95, base: 16 },
      ring: { ap: 1, radius: 340, push: 170 },
      geyser: { ap: 3, drops: 3, radius: 95, reaction: 1.15, base: 26 },
      keep: 420,             // 太近就後撤
    },
    storm: {
      boost: 2.4,            // 移動倍率
      reach: 95,             // 貼上去之後的距離
      dashMax: 380,          // 技能附帶的貼近距離
      combo: { ap: 1, half: 62, radius: 160, reaction: 0.65, base: 14, push: 50 },
      chop: { ap: 1, length: 210, width: 72, reaction: 0.7, base: 20, push: 60 },
      upper: { ap: 1, half: 40, radius: 175, reaction: 0.62, base: 16, push: 95 },
      thrust: { ap: 1, n: 3, length: 240, width: 46, reaction: [0.62, 0.45, 0.45], base: 10, push: 30 },
      tornado: { ap: 3, side: 380, width: 90, reaction: 0.75, base: 18, slash: 0.5 },
    },
    earth: {
      boost: 0.55,
      raise: { ap: 1, n: 4, size: 64, max: 9 },
      smash: { ap: 2, half: 62, radius: 460, reaction: 1.35, base: 42, rocks: 6, rockSpeed: 300, rockRange: 300, rockBase: 12 },
      pound: { ap: 1, radius: 160, reaction: 1.15, base: 34 },
      leap: { ap: 3, radius: 230, reaction: 1.6, base: 44, spikes: 8, ring: 300, spikeR: 55, spikeReaction: 0.6, spikeBase: 20, keep: 4 },
    },
  };

  E.erod = {
    name: "命運的見證者・厄羅德", ai: "erod", bigBar: true, color: "#2a2a8a",
    hp: 2800, atk: 30, df: 12, spd: 16, ap: 8, moveCost: 1, r: 46, alwaysFirst: false,
  };

  const fxOf = (b) => (b.erod = b.erod || { fx: [] });
  const fx = (b, o) => fxOf(b).fx.push(Object.assign({ t0: now() }, o));
  const say = (b, u, s) => b.say(`${u.name}：「${s}」`);
  const LINES = {
    open: ["命運卡上的每一個字，都有人替它作證。……今天輪到我替你作證。", "四把武器，四種考驗。拿到牌的人，總得先翻過來看看背面。"],
    shift: { fire: ["權杖。燒掉你多餘的猶豫。", "火會替你決定方向。"], water: ["聖杯。退一步，看清楚。", "水不追人。它只是等你走進來。"], storm: ["寶劍。別眨眼。", "風不會告訴你下一刀從哪裡來。"], earth: ["戰槌。站穩。", "大地很慢——慢到你以為自己來得及。"] },
    ult: { fire: "燃起來吧，焚盡命運的火龍。", water: "聖杯滿溢——抬頭看。", storm: "風暴裡沒有規則。", earth: "大地，回應我。" },
    down: "……考驗結束了。牌是你的了，翻開它吧。",
  };

  // ===== AI =====
  R.AI.erod = {
    init(b, u) {
      const s = u.state;
      s.form = "fire"; s.formTurns = 0; s.gauge = 0; s.last = { fire: 0, water: -1, storm: -2, earth: -3 }; s.turn = 0; s.used = {};
    },
    spend(b, u, n) { b.enemySpend(u, n); u.state.gauge += n; },
    face(u, t) { u.facing = Math.atan2(t.y - u.y, t.x - u.x); return u.facing; },
    pose(u, k, ang, extra) { u.pose = Object.assign({ k, t0: now(), ang: ang ?? u.facing, hit: 0 }, extra); },
    hitPose(u, delay = 0) { const p = u.pose; setTimeout(() => { if (u.pose === p) p.hit = now(); }, delay); },
    over(b, u) { return !u.alive || b.dead || b.phase === "over"; },

    async takeTurn(b, u) {
      const s = u.state, t0 = now();
      if (s.form == null) this.init(b, u);
      s.turn++; s.used = {};
      if (s.turn === 1) say(b, u, pick(LINES.open));
      // 換型態：在這個型態待夠了、照距離挑一個（有遲滯：至少 minTurns 回合）
      if (s.formTurns >= S.minTurns && u.ap >= S.shift.ap) { const nf = this.pickForm(b, u); if (nf !== s.form) await this.shift(b, u, nf); }
      s.formTurns++;
      u.state.speedBoost = s.form === "storm" ? S.storm.boost : s.form === "earth" ? S.earth.boost : 1;
      let guard = 0;
      while (u.ap > 0 && !this.over(b, u) && guard++ < 16 && now() - t0 < S.turnCap * 1000) {
        const t = b.aggroTarget(u) || b.player;
        if (!t?.alive) break;
        if (s.gauge >= S.ult && u.ap >= 3) { s.gauge = 0; await this.ult(b, u, t); continue; }
        const did = await this[s.form](b, u, t);
        if (!did) break;
        await b.wait(0.12);
      }
      u.ap = 0;
    },
    pickForm(b, u) {
      const p = b.player, d = dist(u.x, u.y, p.x, p.y), s = u.state;
      let cand = d > 440 ? ["fire", "water", "storm"] : d < 240 ? ["storm", "earth", "water"] : ["fire", "water", "storm", "earth"];
      cand = cand.filter((f) => f !== s.form);
      // 最久沒用過的優先（加一點隨機）
      cand.sort((a, c) => s.last[a] - s.last[c] + (Math.random() - 0.5) * 1.2);
      return cand[0];
    },
    async shift(b, u, nf) {
      const s = u.state, F = FORMS[nf], D = S.shift;
      this.spend(b, u, D.ap);
      s.last[s.form] = s.turn;
      s.form = nf; s.formTurns = 0;
      b.say(`${u.name}換上了${F.w}——${F.n}！`);
      say(b, u, pick(LINES.shift[nf]));
      this.pose(u, "shift");
      b.emit({ type: "sfx", sound: "sounds/guan-chime.mp3" });
      fx(b, { k: "ring", x: u.x, y: u.y, r: D.radius, col: F.c, dur: 650 });
      b.emit({ type: "buff", unit: u, text: F.n, color: F.c });
      await b.wait(0.35);
      // 周圍擊退（不造成傷害）
      const p = b.player;
      if (p.alive && dist(p.x, p.y, u.x, u.y) <= D.radius + p.r * 0.5) { b.knockback(p, u.x, u.y, D.push); b.emit({ type: "miss", x: p.x, y: p.y, text: "擊退" }); }
      for (const a of b.allies()) if (dist(a.x, a.y, u.x, u.y) <= D.radius) b.knockback(a, u.x, u.y, D.push);
      await b.wait(0.3);
    },
    once(u, k) { if (u.state.used[k]) return false; return true; },
    mark(u, k) { u.state.used[k] = (u.state.used[k] || 0) + 1; },
    // 移動到某個點（照移動半徑，花 1 點）
    moveTo(b, u, x, y, stop = 10) { return b.enemyMoveToward(u, { x, y }, stop); },
    place(b, u, x, y) {
      const A = b.cfg.arena, ok = (px, py) => px > u.r && py > u.r && px < A.w - u.r && py < A.h - u.r && !b.blocked(u, px, py);
      if (ok(x, y)) return { x, y };
      for (let r = 16; r < 400; r += 16) for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (ok(px, py)) return { x: px, y: py }; }
      return { x: u.x, y: u.y };
    },
    async dash(b, u, x, y, dur = 0.18) {
      const to = this.place(b, u, x, y), from = { x: u.x, y: u.y };
      if (dist(to.x, to.y, from.x, from.y) < 4) return;
      u.facing = Math.atan2(to.y - from.y, to.x - from.x);
      b.emit({ type: "leap", unit: u, from, to, duration: dur, height: 4 });
      fx(b, { k: "streak", x: from.x, y: from.y, x2: to.x, y2: to.y, col: FORMS[u.state.form].c, dur: 380 });
      await b.wait(dur);
      if (u.alive) { u.x = to.x; u.y = to.y; b.emit({ type: "move", unit: u }); }
    },
    push(b, u, n) { return (p) => b.knockback(p, u.x, u.y, n); },

    // ---------- 火焰型態 ----------
    async fire(b, u, t) {
      const D = S.fire, d = dist(u.x, u.y, t.x, t.y);
      if (d > 600 && u.ap >= 1 && this.once(u, "fmove")) { this.mark(u, "fmove"); return this.moveTo(b, u, t.x, t.y, 420); }
      const opts = [];
      if ((u.state.used.barrage || 0) < 2) opts.push("barrage", "barrage");
      if (this.once(u, "jet") && d <= D.jet.length) opts.push("jet");
      if (this.once(u, "rain") && u.ap >= D.rain.ap) opts.push("rain");
      if (this.once(u, "orbit") && d < 380) opts.push("orbit", "orbit");
      if (!opts.length) return d > 360 && this.once(u, "fmove2") ? (this.mark(u, "fmove2"), this.moveTo(b, u, t.x, t.y, 320)) : false;
      const k = pick(opts); this.mark(u, k);
      await this["f_" + k](b, u, t);
      return true;
    },
    async f_barrage(b, u, t) {
      const D = S.fire.barrage, ang = this.face(u, t);
      this.spend(b, u, D.ap);
      this.pose(u, "cast", ang); this.hitPose(u, 250);
      b.emit({ type: "sfx", sound: "sounds/marika-fire.mp3" });
      for (let i = 0; i < D.n; i++) {
        if (this.over(b, u)) return;
        const a = Math.atan2(t.y - u.y, t.x - u.x) + rad((Math.random() - 0.5) * 2 * D.spread);
        b.spawnBullet(u, u.x + Math.cos(a) * u.r, u.y + Math.sin(a) * u.r, a, { speed: D.speed, range: D.range, r: D.r, base: D.base, kind: "erodFire" });
        await b.wait(0.12);
      }
      await b.wait(0.2);
    },
    async f_jet(b, u, t) {
      const D = S.fire.jet, ang = this.face(u, t);
      this.spend(b, u, D.ap);
      b.say(`${u.name}舉起烈火權杖——噴射火焰！`);
      this.pose(u, "cast", ang); this.hitPose(u, D.reaction * 1000);
      fx(b, { k: "flame", x: u.x, y: u.y, ang, len: D.length, w: D.width, t0: now() + D.reaction * 1000 - 120, dur: 700 });
      await b.telegraph(u, { shape: "rect", x: u.x, y: u.y, ang, length: D.length, width: D.width, reaction: D.reaction, shot: true }, { base: D.base, sound: "sounds/marika-fire.mp3", label: `${u.name}的噴射火焰` });
    },
    async f_rain(b, u, t) {
      const D = S.fire.rain, A = b.cfg.arena;
      this.spend(b, u, D.ap);
      b.say(`${u.name}把權杖指向天空——火球雨！`);
      this.pose(u, "raise"); this.hitPose(u, D.reaction * 1000);
      const pts = [{ x: t.x, y: t.y }];
      for (let i = 1; i < D.n; i++) { const a = Math.random() * Math.PI * 2, r = 90 + Math.random() * 200; pts.push({ x: Math.min(A.w - 40, Math.max(40, t.x + Math.cos(a) * r)), y: Math.min(A.h - 40, Math.max(40, t.y + Math.sin(a) * r)) }); }
      const list = pts.map((p, i) => b.wait(i * 0.1).then(() => {
        fx(b, { k: "fall", x: p.x, y: p.y, t0: now() + D.reaction * 1000 - 380, dur: 380 });
        fx(b, { k: "boom", x: p.x, y: p.y, r: D.radius * 1.2, t0: now() + D.reaction * 1000, dur: 650 });
        return b.telegraph(u, { shape: "circle", x: p.x, y: p.y, radius: D.radius, reaction: D.reaction }, { base: D.base, sound: i ? null : "sounds/explosion.mp3", label: `${u.name}的火球雨`, quiet: i > 0 });
      }));
      await Promise.all(list);
    },
    async f_orbit(b, u, t) {
      const D = S.fire.orbit;
      this.spend(b, u, D.ap);
      b.say(`${u.name}身邊燃起一圈火球——向四周擴散！`);
      this.pose(u, "raise");
      const a0 = Math.random() * Math.PI;
      fx(b, { k: "orbit", unit: u, n: D.n, a0, dur: D.spin * 1000 });
      await b.wait(D.spin);
      if (this.over(b, u)) return;
      b.emit({ type: "sfx", sound: "sounds/marika-fire.mp3" });
      const a1 = a0 + D.spin * 4;
      for (let i = 0; i < D.n; i++) { const a = a1 + (i / D.n) * Math.PI * 2; b.spawnBullet(u, u.x + Math.cos(a) * (u.r + 30), u.y + Math.sin(a) * (u.r + 30), a, { speed: D.speed, range: D.range, r: D.r, base: D.base, kind: "erodFire" }); }
      await b.wait(0.35);
    },

    // ---------- 水流型態 ----------
    async water(b, u, t) {
      const D = S.water, d = dist(u.x, u.y, t.x, t.y);
      // 後撤：太近就往反方向退
      if (d < D.keep && (u.state.used.retreat || 0) < 2) {
        this.mark(u, "retreat");
        const a = Math.atan2(u.y - t.y, u.x - t.x), A = b.cfg.arena;
        let x = u.x + Math.cos(a) * 400, y = u.y + Math.sin(a) * 400;
        if (x < 120 || x > A.w - 120) x = A.w - x;
        if (y < 120 || y > A.h - 120) y = Math.min(A.h - 120, Math.max(120, y));
        if (d < 300 && this.once(u, "ring") && u.ap >= 2) { this.mark(u, "ring"); await this.w_ring(b, u, t); return true; }
        if (this.moveTo(b, u, x, y, 10)) { b.say(`${u.name}往後退開`); return true; }
      }
      const opts = [];
      if (this.once(u, "jet")) opts.push("jet");
      if (this.once(u, "wave") && u.ap >= D.wave.ap && d <= D.wave.radius + 40) opts.push("wave");
      if ((u.state.used.bomb || 0) < 2) opts.push("bomb");
      if (this.once(u, "ring") && d < D.ring.radius) opts.push("ring");
      if (!opts.length) return false;
      const k = pick(opts); this.mark(u, k);
      await this["w_" + k](b, u, t);
      return true;
    },
    async w_jet(b, u, t) {
      const D = S.water.jet, ang = this.face(u, t);
      this.spend(b, u, D.ap);
      b.say(`湧泉聖杯傾斜了——噴射水柱！`);
      this.pose(u, "pour", ang); this.hitPose(u, D.reaction * 1000);
      fx(b, { k: "wjet", x: u.x, y: u.y - u.r * 1.4, ang, len: D.length, w: D.width, t0: now() + D.reaction * 1000 - 120, dur: 750 });
      await b.telegraph(u, { shape: "rect", x: u.x, y: u.y, ang, length: D.length, width: D.width, reaction: D.reaction, shot: true }, { base: D.base, sound: "sounds/cangyou-bubbles.mp3", label: `${u.name}的噴射水柱` });
    },
    async w_wave(b, u, t) {
      const D = S.water.wave, ang = this.face(u, t), half = rad(D.half);
      this.spend(b, u, D.ap);
      b.say(`聖杯湧出大片的水——大範圍水波！`);
      this.pose(u, "pour", ang); this.hitPose(u, D.reaction * 1000);
      fx(b, { k: "wave", x: u.x, y: u.y, ang, half, r: D.radius, t0: now() + D.reaction * 1000 - 100, dur: 800 });
      await b.telegraph(u, { shape: "sector", x: u.x, y: u.y, ang, half, radius: D.radius, reaction: D.reaction }, { base: D.base, sound: "sounds/cangyou-whale.mp3", label: `${u.name}的水波`, onHit: this.push(b, u, D.push) });
    },
    async w_bomb(b, u, t) {
      const D = S.water.bomb;
      this.spend(b, u, D.ap);
      b.say(`${u.name}丟出一顆會彈跳的水彈！`);
      this.pose(u, "pour", this.face(u, t));
      // 一跳一跳往玩家的方向：每一跳落地前才決定落點（朝著玩家現在的位置）
      let from = { x: u.x, y: u.y - u.r * 1.4 };
      for (let i = 0; i < D.hops && !this.over(b, u); i++) {
        const p = b.player, a = Math.atan2(p.y - from.y, p.x - from.x), dd = Math.min(dist(from.x, from.y, p.x, p.y), 300);
        const to = { x: from.x + Math.cos(a) * dd, y: from.y + Math.sin(a) * dd };
        fx(b, { k: "bomb", x: from.x, y: from.y, x2: to.x, y2: to.y, dur: D.reaction * 1000 });
        fx(b, { k: "splash", x: to.x, y: to.y, r: D.radius, t0: now() + D.reaction * 1000, dur: 500 });
        await b.telegraph(u, { shape: "circle", x: to.x, y: to.y, radius: D.radius, reaction: D.reaction }, { base: D.base, sound: "sounds/cangyou-bubbles.mp3", label: `${u.name}的水彈`, quiet: true });
        from = to;
      }
    },
    // 擴散水波圓環：不造成傷害，只會擊退
    async w_ring(b, u, t) {
      const D = S.water.ring;
      this.spend(b, u, D.ap);
      b.say(`聖杯周圍擴散出一圈水波——（只會擊退）`);
      this.pose(u, "pour", u.facing);
      fx(b, { k: "wring", x: u.x, y: u.y, r: D.radius, dur: 900 });
      fx(b, { k: "wring", x: u.x, y: u.y, r: D.radius * 0.6, t0: now() + 200, dur: 800 });
      b.emit({ type: "sfx", sound: "sounds/cangyou-bubbles.mp3" });
      await b.wait(0.55);
      const p = b.player;
      if (p.alive && dist(p.x, p.y, u.x, u.y) <= D.radius + p.r * 0.5) { b.knockback(p, u.x, u.y, D.push); b.emit({ type: "miss", x: p.x, y: p.y, text: "被水波推開" }); }
      for (const a of b.allies()) if (dist(a.x, a.y, u.x, u.y) <= D.radius) b.knockback(a, u.x, u.y, D.push);
      await b.wait(0.3);
    },

    // ---------- 風暴型態 ----------
    async storm(b, u, t) {
      const opts = ["combo", "chop", "upper", "thrust"].filter((k) => k !== u.state.lastSlash && (u.state.used[k] || 0) < 2);
      if (!opts.length) return false;
      const k = pick(opts); this.mark(u, k); u.state.lastSlash = k;
      // 貼上去（技能的一部分）：太遠就先用一般移動拉近
      const D = S.storm, d = dist(u.x, u.y, t.x, t.y);
      if (d > D.dashMax + D.reach) { if (!this.moveTo(b, u, t.x, t.y, D.reach)) return false; if (u.ap < 1) return true; }
      await this.closeIn(b, u, t);
      await this["s_" + k](b, u, t);
      return true;
    },
    async closeIn(b, u, t) {
      const D = S.storm, d = dist(u.x, u.y, t.x, t.y);
      if (d <= D.reach + t.r + 10) return;
      const a = Math.atan2(t.y - u.y, t.x - u.x), go = Math.min(d - D.reach, D.dashMax);
      await this.dash(b, u, u.x + Math.cos(a) * go, u.y + Math.sin(a) * go, 0.16);
    },
    async s_combo(b, u, t) {
      const D = S.storm.combo, half = rad(D.half);
      this.spend(b, u, D.ap);
      b.say(`${u.name}左右連斬！`);
      for (const side of [-1, 1]) {
        if (this.over(b, u)) return;
        await this.closeIn(b, u, b.player);
        const ang = this.face(u, b.player) + side * 0.35;
        this.pose(u, "slash", ang, { side }); this.hitPose(u, D.reaction * 1000);
        fx(b, { k: "wind", x: u.x, y: u.y, ang, r: D.radius, side, t0: now() + D.reaction * 1000 - 60, dur: 380 });
        await b.telegraph(u, { shape: "sector", x: u.x, y: u.y, ang, half, radius: D.radius, reaction: D.reaction }, { base: D.base, sound: "sounds/ilshu-slash.mp3", label: `${u.name}的連斬`, onHit: this.push(b, u, D.push) });
      }
    },
    async s_chop(b, u, t) {
      const D = S.storm.chop, ang = this.face(u, t);
      this.spend(b, u, D.ap);
      b.say(`${u.name}高舉颶風寶劍——下劈！`);
      this.pose(u, "chop", ang); this.hitPose(u, D.reaction * 1000);
      fx(b, { k: "wind", x: u.x + Math.cos(ang) * 60, y: u.y + Math.sin(ang) * 60, ang, r: D.length * 0.6, side: 0, t0: now() + D.reaction * 1000 - 60, dur: 380 });
      await b.telegraph(u, { shape: "rect", x: u.x, y: u.y, ang, length: D.length, width: D.width, reaction: D.reaction }, { base: D.base, sound: "sounds/ilshu-slash-strong.mp3", label: `${u.name}的下劈`, onHit: this.push(b, u, D.push) });
    },
    async s_upper(b, u, t) {
      const D = S.storm.upper, ang = this.face(u, t), half = rad(D.half);
      this.spend(b, u, D.ap);
      b.say(`${u.name}由下往上一挑！`);
      this.pose(u, "upper", ang); this.hitPose(u, D.reaction * 1000);
      fx(b, { k: "wind", x: u.x, y: u.y, ang, r: D.radius, side: 1, up: true, t0: now() + D.reaction * 1000 - 60, dur: 420 });
      await b.telegraph(u, { shape: "sector", x: u.x, y: u.y, ang, half, radius: D.radius, reaction: D.reaction }, { base: D.base, sound: "sounds/ilshu-slash.mp3", label: `${u.name}的上挑`, onHit: this.push(b, u, D.push) });
    },
    async s_thrust(b, u, t) {
      const D = S.storm.thrust;
      this.spend(b, u, D.ap);
      b.say(`${u.name}連續突刺！`);
      for (let i = 0; i < D.n && !this.over(b, u); i++) {
        const ang = this.face(u, b.player);
        this.pose(u, "thrust", ang); this.hitPose(u, D.reaction[i] * 1000);
        fx(b, { k: "pierce", x: u.x, y: u.y, ang, len: D.length, t0: now() + D.reaction[i] * 1000 - 60, dur: 260 });
        await b.telegraph(u, { shape: "rect", x: u.x, y: u.y, ang, length: D.length, width: D.width, reaction: D.reaction[i] }, { base: D.base, sound: "sounds/ilshu-thrust.mp3", label: `${u.name}的突刺`, quiet: i > 0, onHit: this.push(b, u, D.push) });
        // 每一刺往前踏一步
        if (u.alive) { const to = this.place(b, u, u.x + Math.cos(ang) * 40, u.y + Math.sin(ang) * 40); u.x = to.x; u.y = to.y; b.emit({ type: "move", unit: u }); }
      }
    },

    // ---------- 大地型態 ----------
    async earth(b, u, t) {
      const D = S.earth, d = dist(u.x, u.y, t.x, t.y), mine = (b.room.obstacles || []).filter((o) => o.erod).length;
      const opts = [];
      if (this.once(u, "raise") && mine < D.raise.max) opts.push("raise");
      if (this.once(u, "smash") && u.ap >= D.smash.ap && d <= D.smash.radius) opts.push("smash", "smash");
      if ((u.state.used.pound || 0) < 2 && d <= D.pound.radius + 40) opts.push("pound", "pound");
      if (!opts.length) {
        if (d > D.smash.radius && (u.state.used.emove || 0) < 2) { this.mark(u, "emove"); return this.moveTo(b, u, t.x, t.y, 300); }
        return false;
      }
      const k = pick(opts); this.mark(u, k);
      await this["e_" + k](b, u, t);
      return true;
    },
    // 用把柄震動大地：隆起變成掩體（不會隆起在單位身上）
    async e_raise(b, u, t) {
      const D = S.earth.raise, A = b.cfg.arena;
      this.spend(b, u, D.ap);
      b.say(`${u.name}用黃金戰槌的把柄敲了敲地面——大地隆起了！`);
      this.pose(u, "tap");
      b.emit({ type: "sfx", sound: "sounds/slime-slam.mp3" });
      await b.wait(0.4);
      const O = (b.room.obstacles = b.room.obstacles || []);
      let made = 0;
      for (let i = 0; i < 40 && made < D.n; i++) {
        const a = Math.random() * Math.PI * 2, r = 130 + Math.random() * 200, x = t.x + Math.cos(a) * r, y = t.y + Math.sin(a) * r, h = D.size / 2;
        if (x < 60 || y < 60 || x > A.w - 60 || y > A.h - 60) continue;
        const o = { x: x - h, y: y - h, w: D.size, h: D.size, erod: true, t0: now() };
        if (b.units.some((q) => q.alive && !q.part && dist(q.x, q.y, x, y) < q.r + D.size * 0.8)) continue;
        if (O.some((p) => Math.abs(p.x - o.x) < D.size + 8 && Math.abs(p.y - o.y) < D.size + 8)) continue;
        O.push(o); made++;
        fx(b, { k: "dust", x, y, r: D.size, dur: 600 });
      }
      b.emit({ type: "move", unit: u });
      await b.wait(0.3);
    },
    // 巨槌砸出震波：多 0.4 秒的反應時間、傷害特別高；範圍裡隆起的地面被炸碎、噴出石塊
    async e_smash(b, u, t) {
      const D = S.earth.smash, ang = this.face(u, t), half = rad(D.half);
      this.spend(b, u, D.ap);
      b.say(`${u.name}高高舉起黃金戰槌——震波！`);
      this.pose(u, "lift", ang); this.hitPose(u, D.reaction * 1000);
      fx(b, { k: "quake", x: u.x, y: u.y, ang, half, r: D.radius, t0: now() + D.reaction * 1000, dur: 700 });
      const res = await b.telegraph(u, { shape: "sector", x: u.x, y: u.y, ang, half, radius: D.radius, reaction: D.reaction }, { base: D.base, sound: "sounds/bastian-impact-2.mp3", label: `${u.name}的震波` });
      if (res === false) return;
      // 震波結算之後：範圍裡的隆起被炸碎，石塊往外噴
      const O = b.room.obstacles || [], broken = O.filter((o) => o.erod && b.hitTest({ shape: "sector", x: u.x, y: u.y, ang, half, radius: D.radius }, { x: o.x + o.w / 2, y: o.y + o.h / 2, r: o.w / 2 }));
      if (!broken.length) return;
      b.room.obstacles = O.filter((o) => !broken.includes(o));
      b.emit({ type: "sfx", sound: "sounds/explosion.mp3" });
      b.say(`隆起的地面被震碎，石塊四處飛散！`);
      for (const o of broken) {
        const cx = o.x + o.w / 2, cy = o.y + o.h / 2, a0 = Math.atan2(cy - u.y, cx - u.x);
        fx(b, { k: "dust", x: cx, y: cy, r: o.w, dur: 600 });
        for (let i = 0; i < D.rocks; i++) { const a = a0 + ((i - (D.rocks - 1) / 2) / D.rocks) * 1.8; b.spawnBullet(u, cx + Math.cos(a) * 20, cy + Math.sin(a) * 20, a, { speed: D.rockSpeed, range: D.rockRange, r: 12, base: D.rockBase, kind: "erodRock" }); }
      }
      b.emit({ type: "move", unit: u });
      await b.wait(0.3);
    },
    async e_pound(b, u, t) {
      const D = S.earth.pound;
      this.spend(b, u, D.ap);
      b.say(`${u.name}把戰槌往身邊一砸！`);
      this.pose(u, "lift", u.facing); this.hitPose(u, D.reaction * 1000);
      fx(b, { k: "quake", x: u.x, y: u.y, ang: 0, half: Math.PI, r: D.radius, t0: now() + D.reaction * 1000, dur: 600 });
      await b.telegraph(u, { shape: "circle", x: u.x, y: u.y, radius: D.radius, reaction: D.reaction, follow: u }, { base: D.base, sound: "sounds/bastian-impact-1.mp3", label: `${u.name}的槌擊` });
    },

    // ---------- 大招 ----------
    async ult(b, u, t) {
      const f = u.state.form, F = FORMS[f];
      const name = { fire: "焚命火龍", water: "聖杯湧泉", storm: "颶風劍舞", earth: "大地隆刺" }[f];
      b.emit({ type: "bossUlt", unit: u, text: name });
      say(b, u, LINES.ult[f]);
      try { await this["u_" + f](b, u, t, F); } finally { b.emit({ type: "bossUltEnd" }); }
    },
    // 火龍：蓄力幾秒，放出拖著火焰軌跡的火龍；撞到戰場邊緣炸開成無數火球席捲全圖
    async u_fire(b, u, t) {
      const D = S.fire.dragon, A = b.cfg.arena, ang = this.face(u, t);
      this.spend(b, u, D.ap);
      this.pose(u, "charge", ang); this.hitPose(u, D.reaction * 1000);
      fx(b, { k: "charge", unit: u, col: FORMS.fire.c, dur: D.reaction * 1000 });
      // 到邊緣的距離
      const dx = Math.cos(ang), dy = Math.sin(ang);
      const tx = dx > 0 ? (A.w - u.x) / dx : dx < 0 ? -u.x / dx : Infinity, ty = dy > 0 ? (A.h - u.y) / dy : dy < 0 ? -u.y / dy : Infinity;
      const len = Math.max(80, Math.min(tx, ty)), ex = u.x + dx * len, ey = u.y + dy * len;
      fx(b, { k: "dragon", x: u.x, y: u.y, ang, len, t0: now() + D.reaction * 1000 - 150, dur: 650 });
      b.emit({ type: "sfx", sound: "sounds/marika-fire.mp3" });
      const res = await b.telegraph(u, { shape: "rect", x: u.x, y: u.y, ang, length: len, width: D.width, reaction: D.reaction, shot: true }, { base: D.base, sound: "sounds/explosion.mp3", label: `${u.name}的焚命火龍` });
      if (res === false) return;
      await b.wait(0.25);
      // 撞到邊緣：炸開成無數火球，往戰場裡面席捲
      fx(b, { k: "boom", x: ex, y: ey, r: 200, dur: 800 });
      b.emit({ type: "sfx", sound: "sounds/explosion.mp3" });
      const back = ang + Math.PI;
      for (let i = 0; i < D.burst; i++) {
        const a = back + (i / (D.burst - 1) - 0.5) * rad(170) + (Math.random() - 0.5) * 0.05;
        b.spawnBullet(u, ex + Math.cos(a) * 10, ey + Math.sin(a) * 10, a, { speed: D.speed * (0.8 + Math.random() * 0.45), r: D.r, base: D.burstBase, kind: "erodFire" });
      }
      await b.wait(0.6);
    },
    // 聖杯湧泉：沖天水柱，從天上鎖定玩家落下（每一道落下前才瞄準玩家現在的位置）；最後一道留到下次輪到厄羅德時才落下
    async u_water(b, u, t) {
      const D = S.water.geyser;
      this.spend(b, u, D.ap);
      this.pose(u, "geyser");
      fx(b, { k: "geyser", unit: u, dur: 1400 });
      b.emit({ type: "sfx", sound: "sounds/cangyou-whale.mp3" });
      b.say(`湧泉聖杯噴出一道沖天水柱——水從天上落下來了，一直跟著你！`);
      await b.wait(0.9);
      for (let i = 0; i < D.drops && !this.over(b, u); i++) {
        const p = b.player;
        fx(b, { k: "drop", x: p.x, y: p.y, r: D.radius, t0: now() + D.reaction * 1000 - 320, dur: 700 });
        await b.telegraph(u, { shape: "circle", x: p.x, y: p.y, radius: D.radius, reaction: D.reaction }, { base: D.base, sound: "sounds/cangyou-bubbles.mp3", label: `落下的水柱`, quiet: i > 0 });
      }
      if (this.over(b, u)) return;
      const p = b.player;
      b.charges.push({ kind: "erodFall", owner: u, x: p.x, y: p.y, radius: D.radius, base: D.base, label: "水柱還在天上・下次輪到厄羅德時落下（快離開）" });
      b.emit({ type: "charge" });
    },
    async resolveCharge(b, c) {
      b.charges = b.charges.filter((x) => x !== c);
      const u = c.owner;
      if (!u.alive || c.kind !== "erodFall") return;
      fx(b, { k: "drop", x: c.x, y: c.y, r: c.radius, t0: now(), dur: 700 });
      b.emit({ type: "strike", shape: "circle", owner: u, x: c.x, y: c.y, radius: c.radius, sound: "sounds/cangyou-bubbles.mp3" });
      const p = b.player;
      if (p.alive && dist(p.x, p.y, c.x, c.y) <= c.radius + p.r * 0.5) b.damage(u, p, c.base, 1, "（落下的水柱）");
      else { b.say("水柱落空了！"); b.emit({ type: "miss", x: c.x, y: c.y }); }
      await b.wait(0.4);
    },
    // 颶風劍舞：龍捲風包覆自身（受到的傷害 ×0.7），照 1→2→3→4→1 的路線來回衝刺（使用者的圖８），中間隨機插入斬擊
    async u_storm(b, u, t) {
      const D = S.storm.tornado, A = b.cfg.arena, h = D.side / 2;
      this.spend(b, u, D.ap);
      u.state.tornado = true;
      fx(b, { k: "tornado", unit: u, dur: 9000, until: () => !u.state.tornado });
      b.emit({ type: "sfx", sound: "sounds/alpha-spin.mp3" });
      b.say(`${u.name}被龍捲風包覆——接下來的劍招無法預測！`);
      await b.wait(0.6);
      const cl = (x, y) => ({ x: Math.min(A.w - 60, Math.max(60, x)), y: Math.min(A.h - 60, Math.max(60, y)) });
      const c = { x: b.player.x, y: b.player.y };
      // 圖８：1 左下、2 右上、3 左上、4 右下
      let pts = [cl(c.x - h, c.y + h), cl(c.x + h, c.y - h), cl(c.x - h, c.y - h), cl(c.x + h, c.y + h)];
      if (Math.random() < 0.5) pts = pts.map((p) => ({ x: 2 * c.x - p.x, y: p.y }));        // 左右鏡像（每次不一樣）
      const route = [...pts, pts[0]];
      try {
        await this.dash(b, u, route[0].x, route[0].y, 0.2);
        for (let i = 1; i < route.length && !this.over(b, u); i++) {
          const a = route[i - 1], z = route[i], ang = Math.atan2(z.y - a.y, z.x - a.x), len = dist(a.x, a.y, z.x, z.y);
          u.facing = ang; this.pose(u, "thrust", ang); this.hitPose(u, D.reaction * 1000);
          await b.telegraph(u, { shape: "rect", x: u.x, y: u.y, ang, length: len, width: D.width, reaction: D.reaction }, { base: D.base, sound: "sounds/ilshu-slash-strong.mp3", label: `${u.name}的劍舞`, quiet: true, mult: 1.2 });
          if (this.over(b, u)) break;
          await this.dash(b, u, z.x, z.y, 0.14);
          if (Math.random() < D.slash && !this.over(b, u)) {          // 隨機插入一刀
            const k = pick(["upper", "chop"]), Sx = S.storm[k], ang2 = this.face(u, b.player);
            this.pose(u, k === "chop" ? "chop" : "upper", ang2); this.hitPose(u, Sx.reaction * 1000);
            fx(b, { k: "wind", x: u.x, y: u.y, ang: ang2, r: Sx.radius || Sx.length * 0.6, side: 1, t0: now() + Sx.reaction * 1000 - 60, dur: 380 });
            const shape = k === "chop" ? { shape: "rect", x: u.x, y: u.y, ang: ang2, length: Sx.length, width: Sx.width } : { shape: "sector", x: u.x, y: u.y, ang: ang2, half: rad(Sx.half), radius: Sx.radius };
            await b.telegraph(u, Object.assign(shape, { reaction: Sx.reaction }), { base: Sx.base, sound: "sounds/ilshu-slash.mp3", label: `${u.name}的劍舞`, quiet: true, mult: 1.2, onHit: this.push(b, u, Sx.push) });
          }
        }
      } finally { u.state.tornado = false; }
    },
    // 大地隆刺：起跳猛擊玩家的位置，周圍一圈刺出隆起的地面（留下幾根當掩體）
    async u_earth(b, u, t) {
      const D = S.earth.leap, A = b.cfg.arena, c = { x: t.x, y: t.y };
      this.spend(b, u, D.ap);
      this.pose(u, "lift", this.face(u, t)); this.hitPose(u, D.reaction * 1000);
      b.say(`${u.name}高高躍起——！`);
      fx(b, { k: "quake", x: c.x, y: c.y, ang: 0, half: Math.PI, r: D.radius, t0: now() + D.reaction * 1000, dur: 700 });
      const from = { x: u.x, y: u.y };
      setTimeout(() => b.emit({ type: "leap", unit: u, from, to: this.place(b, u, c.x, c.y), duration: 0.45, height: 120 }), D.reaction * 1000 - 450);
      const res = await b.telegraph(u, { shape: "circle", x: c.x, y: c.y, radius: D.radius, reaction: D.reaction }, { base: D.base, sound: "sounds/bastian-impact-2.mp3", label: `${u.name}的猛擊` });
      if (this.over(b, u)) return;
      const land = this.place(b, u, c.x, c.y); u.x = land.x; u.y = land.y; b.emit({ type: "move", unit: u });
      if (res === false) return;
      // 一圈地刺
      const pts = [];
      for (let i = 0; i < D.spikes; i++) { const a = (i / D.spikes) * Math.PI * 2 + Math.random() * 0.3; pts.push({ x: Math.min(A.w - 50, Math.max(50, u.x + Math.cos(a) * D.ring)), y: Math.min(A.h - 50, Math.max(50, u.y + Math.sin(a) * D.ring)) }); }
      for (const p of pts) fx(b, { k: "spike", x: p.x, y: p.y, r: D.spikeR, t0: now() + D.spikeReaction * 1000, dur: 900 });
      await Promise.all(pts.map((p, i) => b.telegraph(u, { shape: "circle", x: p.x, y: p.y, radius: D.spikeR, reaction: D.spikeReaction }, { base: D.spikeBase, sound: i ? null : "sounds/slime-slam.mp3", label: `隆起的地刺`, quiet: true })));
      // 留下幾根變成隆起的地面
      const O = (b.room.obstacles = b.room.obstacles || []), sz = S.earth.raise.size;
      for (const p of pts.sort(() => Math.random() - 0.5).slice(0, Math.max(0, Math.min(D.keep, 12 - O.filter((o) => o.erod).length)))) {
        if (b.units.some((q) => q.alive && !q.part && dist(q.x, q.y, p.x, p.y) < q.r + sz * 0.8)) continue;
        O.push({ x: p.x - sz / 2, y: p.y - sz / 2, w: sz, h: sz, erod: true, t0: now() });
      }
      b.emit({ type: "move", unit: u });
    },
  };

  // 龍捲風包覆：受到的傷害變少
  E.erod.incomingMult = (b, u) => (u.state.tornado ? 0.7 : 1);
  E.erod.incomingNote = (k) => (k < 1 ? "（龍捲風）" : "");

  // ===== 畫：厄羅德（使用者的圖１：白色方塊＋A 字形的深藍兜帽；兜帽上的寶石、方塊上的眼睛照型態變色） =====
  const A0 = R.EnemyArt || (R.EnemyArt = {});
  const ease = (x) => 1 - (1 - x) * (1 - x);
  function poseK(u, t) {
    const P = u.pose; if (!P) return { k: null, w: 0, a: -1 };
    const w = Math.min(1, (t - P.t0) / 380), a = P.hit ? (t - P.hit) / 1000 : -1;
    if (a > 0.7) { u.pose = null; return { k: null, w: 0, a: -1 }; }
    return { k: P.k, w, a, ang: P.ang, side: P.side || 1 };
  }
  // 武器（照使用者的圖２）。以握把為原點，往上（-y）畫
  function scepter(ctx, s) {
    ctx.strokeStyle = "#e8302a"; ctx.lineWidth = s * 0.07; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0, s * 0.7); ctx.lineTo(0, -s * 0.9); ctx.stroke();
    ctx.lineWidth = s * 0.05; ctx.fillStyle = "#8a0a1a"; ctx.strokeStyle = "#ff3a2a";
    ctx.beginPath(); ctx.moveTo(-s * 0.16, -s * 0.86); ctx.lineTo(0, -s * 1.08); ctx.lineTo(s * 0.16, -s * 0.86); ctx.lineTo(s * 0.12, -s * 0.72); ctx.lineTo(-s * 0.12, -s * 0.72); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (const x of [-0.1, 0.1]) { ctx.beginPath(); ctx.arc(x * s, -s * 1.14, s * 0.08, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    const y = -s * 1.32, r = s * 0.12;
    ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 2, q = i % 2 ? r * 0.35 : r; ctx.lineTo(Math.cos(a) * q, y + Math.sin(a) * q); } ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  function chalice(ctx, s) {
    ctx.fillStyle = "#3a46c8"; ctx.strokeStyle = "#1aa0e8"; ctx.lineWidth = s * 0.05; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 0.5); ctx.lineTo(s * 0.3, -s * 0.5); ctx.lineTo(s * 0.08, -s * 0.05); ctx.lineTo(s * 0.26, s * 0.42); ctx.lineTo(-s * 0.26, s * 0.42); ctx.lineTo(-s * 0.08, -s * 0.05); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -s * 0.5, s * 0.3, s * 0.07, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.08, s * 0.02); ctx.lineTo(0, -s * 0.12); ctx.lineTo(s * 0.08, s * 0.02); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, s * 0.02); ctx.lineTo(0, s * 0.42); ctx.stroke();
  }
  function sword(ctx, s) {
    ctx.fillStyle = "#cfe8d8"; ctx.strokeStyle = "#b8c8dc"; ctx.lineWidth = s * 0.035; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(0, -s * 1.6); ctx.lineTo(s * 0.07, -s * 1.48); ctx.lineTo(s * 0.06, -s * 0.12); ctx.lineTo(-s * 0.06, -s * 0.12); ctx.lineTo(-s * 0.07, -s * 1.48); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.32, -s * 0.1); ctx.quadraticCurveTo(0, -s * 0.2, s * 0.32, -s * 0.1); ctx.quadraticCurveTo(0, 0, -s * 0.32, -s * 0.1); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.05, -s * 0.06); ctx.lineTo(s * 0.05, -s * 0.06); ctx.lineTo(s * 0.04, s * 0.3); ctx.lineTo(s * 0.12, s * 0.42); ctx.lineTo(-s * 0.12, s * 0.42); ctx.lineTo(-s * 0.04, s * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  function hammer(ctx, s) {
    ctx.fillStyle = "#ffc818"; ctx.strokeStyle = "#ffe020"; ctx.lineWidth = s * 0.05; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.rect(-s * 0.05, -s * 0.95, s * 0.1, s * 1.55); ctx.fill(); ctx.stroke();
    const dia = (cx, cy, w, h) => { ctx.beginPath(); ctx.moveTo(cx, cy - h); ctx.lineTo(cx + w, cy); ctx.lineTo(cx, cy + h); ctx.lineTo(cx - w, cy); ctx.closePath(); ctx.fill(); ctx.stroke(); };
    dia(-s * 0.18, -s * 1.0, s * 0.26, s * 0.3); dia(s * 0.22, -s * 1.1, s * 0.36, s * 0.48);
  }
  A0.erod = (ctx, u, p, t) => {
    const dead = u.alive === false, form = u.state.form || "fire", F = FORMS[form], s = u.r * 1.25;
    const f = Math.cos(u.facing ?? 0) < 0 ? -1 : 1, P = dead ? { k: null } : poseK(u, t);
    ctx.save(); ctx.globalAlpha = dead ? 0.35 : 1;
    ctx.translate(p.x, p.y + Math.sin(t / 520) * 2);
    // 換型態：身體縮一下
    if (P.k === "shift") { const q = Math.sin(Math.min(1, P.w) * Math.PI) * 0.12; ctx.scale(1 + q, 1 - q); }
    // 兜帽後面的兩條「A」（深藍＋亮藍邊）
    ctx.fillStyle = "#14106a"; ctx.strokeStyle = "#4a5ae0"; ctx.lineWidth = s * 0.06; ctx.lineJoin = "round";
    const leg = (k) => {
      ctx.beginPath();
      ctx.moveTo(k * s * 0.02, -s * 1.02); ctx.lineTo(k * s * 0.16, -s * 1.16);
      ctx.lineTo(k * s * 1.0, s * 0.86); ctx.lineTo(k * s * 0.66, s * 0.82); ctx.lineTo(k * s * 0.52, s * 0.5);
      ctx.lineTo(k * s * 0.1, -s * 0.62); ctx.closePath(); ctx.fill(); ctx.stroke();
    };
    leg(-1); leg(1);
    // 白色的方塊
    ctx.fillStyle = "#fbfbff"; ctx.strokeStyle = "#7090c0"; ctx.lineWidth = s * 0.045;
    const bx = -s * 0.44, by = -s * 0.4, bw = s * 0.88, bh = s * 0.92;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, s * 0.1) : ctx.rect(bx, by, bw, bh); ctx.fill(); ctx.stroke();
    // 兜帽前面的菱形和寶石
    ctx.fillStyle = "#14106a"; ctx.strokeStyle = "#4a5ae0";
    ctx.beginPath(); ctx.moveTo(0, -s * 0.78); ctx.lineTo(s * 0.3, -s * 0.42); ctx.lineTo(0, -s * 0.02); ctx.lineTo(-s * 0.3, -s * 0.42); ctx.closePath(); ctx.fill(); ctx.stroke();
    const glow = 0.6 + 0.4 * Math.sin(t / 260);
    ctx.shadowColor = F.c; ctx.shadowBlur = 12 * glow;
    ctx.fillStyle = F.c; ctx.beginPath(); ctx.ellipse(0, -s * 0.44, s * 0.1, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    // 眼睛（朝向那一側）
    ctx.beginPath(); ctx.ellipse(f * s * 0.2, -s * 0.0, s * 0.09, s * 0.11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // 武器
    ctx.save();
    if (form === "water") {
      // 聖杯漂在頭上；傾倒時往目標方向歪
      const tilt = P.k === "pour" ? (P.a < 0 ? 0.6 * ease(P.w) : 0.6 * Math.max(0, 1 - P.a / 0.6)) * (Math.cos(P.ang) < 0 ? -1 : 1) : P.k === "geyser" ? 0 : Math.sin(t / 700) * 0.08;
      ctx.translate(0, -s * 1.55 + Math.sin(t / 380) * 4); ctx.rotate(tilt);
      chalice(ctx, s * 0.75);
    } else if (form === "earth") {
      // 戰槌雙手拿：畫在身體正前方（不畫手）；舉起→砸下
      let rot = -0.25, lift = 0;
      if (P.k === "lift") { if (P.a < 0) { rot = -0.25 - 1.6 * ease(P.w); lift = -s * 0.25 * P.w; } else { const q = Math.min(1, P.a / 0.12); rot = -1.85 + 2.6 * q; lift = -s * 0.25 * (1 - q); } }
      if (P.k === "tap") rot = -0.1 + Math.sin(P.w * Math.PI * 3) * 0.1;
      ctx.translate(f * s * 0.15, s * 0.42 + lift); ctx.scale(f, 1); ctx.rotate(rot);
      hammer(ctx, s * 0.95);
    } else {
      // 右手（朝向那一側）
      ctx.translate(f * s * 0.72, s * 0.2); ctx.scale(f, 1);
      if (form === "fire") {
        let rot = 0.1;
        if (P.k === "cast") rot = P.a < 0 ? 0.1 + 0.6 * ease(P.w) : 0.7 - 0.9 * Math.min(1, P.a / 0.15);
        if (P.k === "raise" || P.k === "charge") rot = -0.15 + Math.sin(t / 90) * 0.04;
        ctx.rotate(rot); scepter(ctx, s * 0.8);
      } else {
        let rot = 0.35;
        if (P.k === "slash") rot = P.a < 0 ? (P.side > 0 ? -1.2 : 1.6) * ease(P.w) : (P.side > 0 ? -1.2 + 3 * Math.min(1, P.a / 0.12) : 1.6 - 3 * Math.min(1, P.a / 0.12));
        if (P.k === "chop") rot = P.a < 0 ? -0.9 * ease(P.w) : -0.9 + 2.6 * Math.min(1, P.a / 0.1);
        if (P.k === "upper") rot = P.a < 0 ? 2.2 * ease(P.w) : 2.2 - 2.8 * Math.min(1, P.a / 0.1);
        if (P.k === "thrust") rot = 1.57 - (P.a < 0 ? 0 : Math.sin(Math.min(1, P.a / 0.2) * Math.PI) * 0.05);
        ctx.rotate(rot); sword(ctx, s * 0.7);
      }
    }
    ctx.restore();
    ctx.restore(); ctx.globalAlpha = 1;
  };
  A0.erod.top = 90;

  // ===== 投射物：火球（使用者的圖３左上那顆）、石塊 =====
  R.ProjArt = R.ProjArt || {};
  R.ProjArt.erodFire = (ctx, b, t) => {
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.ang + Math.PI);
    ctx.fillStyle = "rgba(255,120,40,.25)"; ctx.beginPath(); ctx.arc(0, 0, b.r * 1.9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ee1c24"; ctx.beginPath(); ctx.moveTo(b.r * 3, Math.sin(t / 60 + b.x) * 2); ctx.quadraticCurveTo(b.r * 0.8, -b.r * 1.1, 0, -b.r); ctx.arc(0, 0, b.r, -Math.PI / 2, Math.PI / 2, true); ctx.quadraticCurveTo(b.r * 0.8, b.r * 1.1, b.r * 3, Math.sin(t / 60 + b.x) * 2); ctx.fill();
    ctx.fillStyle = "#8a0014"; ctx.beginPath(); ctx.arc(-b.r * 0.1, 0, b.r * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  R.ProjArt.erodRock = (ctx, b, t) => {
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(t / 120 + b.x);
    ctx.fillStyle = "#8a6a3a"; ctx.strokeStyle = "#e8c050"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-b.r, -b.r * 0.4); ctx.lineTo(-b.r * 0.2, -b.r); ctx.lineTo(b.r, -b.r * 0.5); ctx.lineTo(b.r * 0.7, b.r * 0.8); ctx.lineTo(-b.r * 0.6, b.r * 0.9); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  };

  // ===== 特效 =====
  function flameTongue(ctx, len, w, t, seed) {
    // 使用者的圖３：大片火焰往前捲（亮紅外層、暗紅的捲曲）
    ctx.fillStyle = "#ee1c24";
    ctx.beginPath(); ctx.moveTo(0, -w * 0.25);
    for (let i = 0; i <= 10; i++) { const x = (i / 10) * len, q = Math.sin((i / 10) * Math.PI) * w * 0.55 + Math.sin(t / 70 + i * 1.7 + seed) * w * 0.12; ctx.lineTo(x, -q); }
    for (let i = 10; i >= 0; i--) { const x = (i / 10) * len, q = Math.sin((i / 10) * Math.PI) * w * 0.55 + Math.sin(t / 80 + i * 1.3 + seed) * w * 0.12; ctx.lineTo(x, q); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#8a0014"; ctx.lineWidth = w * 0.1; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(len * 0.05, 0); ctx.bezierCurveTo(len * 0.35, -w * 0.3, len * 0.6, w * 0.3, len * 0.92, Math.sin(t / 90) * w * 0.1); ctx.stroke();
  }
  // 火龍（使用者的圖４：橘色的龍身、四周暗紅的火焰）
  function dragon(ctx, x, y, ang, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    const arm = (a, l, wob) => { ctx.save(); ctx.rotate(a + Math.sin(t / 110 + wob) * 0.12); ctx.fillStyle = "#8a0014"; ctx.strokeStyle = "#ee1c24"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -s * 0.12); ctx.quadraticCurveTo(l * 0.5, -s * 0.5, l, -s * 0.15); ctx.quadraticCurveTo(l * 0.8, s * 0.05, l * 0.55, -s * 0.02); ctx.quadraticCurveTo(l * 0.3, s * 0.1, 0, s * 0.12); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); };
    for (const [a, l, w] of [[2.3, s * 1.1, 0], [-2.3, s * 1.1, 1], [1.5, s * 0.9, 2], [-1.5, s * 0.9, 3], [Math.PI, s * 1.3, 4]]) arm(a, l, w);
    ctx.fillStyle = "#ee5a00"; ctx.strokeStyle = "#ee1c24"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(s * 1.2, 0); ctx.quadraticCurveTo(s * 0.4, -s * 0.28, -s * 0.9, -s * 0.06); ctx.quadraticCurveTo(-s * 1.3, 0, -s * 0.9, s * 0.06); ctx.quadraticCurveTo(s * 0.4, s * 0.28, s * 1.2, 0); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.1, 0); ctx.quadraticCurveTo(s * 0.2, -s * 0.8, s * 0.5, -s * 0.9); ctx.quadraticCurveTo(s * 0.35, -s * 0.4, s * 0.4, -s * 0.05); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.1, 0); ctx.quadraticCurveTo(s * 0.2, s * 0.8, s * 0.5, s * 0.9); ctx.quadraticCurveTo(s * 0.35, s * 0.4, s * 0.4, s * 0.05); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  // 水彈（使用者的圖５：淡藍的水滴，一圈圈波紋）
  function droplet(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = "#9ad8ea"; ctx.strokeStyle = "#1aa0e8"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(s * 0.1, -s); ctx.quadraticCurveTo(s * 0.9, s * 0.2, s * 0.6, s * 0.6); ctx.quadraticCurveTo(0, s * 0.95, -s * 0.8, s * 0.4); ctx.quadraticCurveTo(-s * 0.6, -s * 0.2, s * 0.1, -s); ctx.fill(); ctx.stroke();
    for (const q of [-0.3, 0.1, 0.45]) { ctx.beginPath(); ctx.moveTo(-s * 0.7, s * q); ctx.bezierCurveTo(-s * 0.3, s * (q + 0.2), s * 0.1, s * (q - 0.2), s * 0.65, s * q); ctx.stroke(); }
    ctx.restore();
  }
  // 風的斬擊（使用者的圖７：三道淡綠的弧形箭頭）
  function windArcs(ctx, r, side, a) {
    ctx.strokeStyle = `rgba(160,230,190,${a})`; ctx.lineWidth = 5; ctx.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      const rr = r * (0.55 + i * 0.22), a0 = -0.9, a1 = 0.9;
      ctx.beginPath(); ctx.arc(0, 0, rr, a0, a1); ctx.stroke();
      const end = side >= 0 ? a1 : a0, ex = Math.cos(end) * rr, ey = Math.sin(end) * rr, dir = end + (side >= 0 ? Math.PI / 2 : -Math.PI / 2);
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - Math.cos(dir - 0.5) * 14, ey - Math.sin(dir - 0.5) * 14); ctx.moveTo(ex, ey); ctx.lineTo(ex - Math.cos(dir + 0.5) * 14, ey - Math.sin(dir + 0.5) * 14); ctx.stroke();
    }
  }
  function drawFx(ctx, b, t) {
    const M = b.erod;
    M.fx = M.fx.filter((f) => t < f.t0 + f.dur && !(f.until && f.until()));
    for (const f of M.fx) {
      const k = (t - f.t0) / f.dur;
      if (k < 0) continue;
      ctx.save();
      if (f.k === "ring" || f.k === "wring") {
        const r = f.r * ease(Math.min(1, k * 1.3));
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.k === "wring" ? "#5ab8f0" : f.col; ctx.lineWidth = f.k === "wring" ? 10 : 14;
        ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 3; ctx.strokeStyle = "#fff"; ctx.beginPath(); ctx.arc(f.x, f.y, r * 0.92, 0, Math.PI * 2); ctx.stroke();
      } else if (f.k === "flame") {
        ctx.translate(f.x, f.y); ctx.rotate(f.ang); ctx.globalAlpha = k < 0.8 ? 1 : (1 - k) * 5;
        flameTongue(ctx, f.len * Math.min(1, k * 3), f.w, t, 0);
      } else if (f.k === "boom" || f.k === "splash") {
        const r = f.r * ease(Math.min(1, k * 1.6));
        ctx.globalAlpha = 1 - k;
        if (f.k === "boom") {
          ctx.fillStyle = "rgba(255,160,40,.55)"; ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "rgba(238,28,36,.7)"; ctx.beginPath(); ctx.arc(f.x, f.y, r * 0.6, 0, Math.PI * 2); ctx.fill();
          for (let i = 0; i < 10; i++) { const a = hash(i + f.x) * Math.PI * 2, d = r * (0.8 + hash(i) * 0.5); ctx.fillStyle = "#ffd040"; ctx.fillRect(f.x + Math.cos(a) * d - 3, f.y + Math.sin(a) * d - 3, 6, 6); }
        } else {
          ctx.strokeStyle = "#5ab8f0"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.stroke();
          for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, d = r * 0.9; ctx.fillStyle = "#9ad8ff"; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d - k * 20, 5, 0, Math.PI * 2); ctx.fill(); }
        }
      } else if (f.k === "fall") {
        const y = f.y - 400 * (1 - k);
        R.ProjArt.erodFire(ctx, { x: f.x, y, ang: Math.PI / 2, r: 16 }, t);
      } else if (f.k === "orbit") {
        const u = f.unit; if (!u.alive) { ctx.restore(); continue; }
        for (let i = 0; i < f.n; i++) { const a = f.a0 + k * f.dur / 1000 * 4 + (i / f.n) * Math.PI * 2, d = u.r + 30; R.ProjArt.erodFire(ctx, { x: u.x + Math.cos(a) * d, y: u.y + Math.sin(a) * d, ang: a + Math.PI / 2, r: 12 }, t); }
      } else if (f.k === "charge") {
        const u = f.unit; ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t / 60);
        ctx.strokeStyle = f.col; ctx.lineWidth = 4;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(u.x, u.y, u.r + 20 + ((k * 3 + i / 3) % 1) * 90 * (1 - k), 0, Math.PI * 2); ctx.stroke(); }
      } else if (f.k === "dragon") {
        const d = f.len * Math.min(1, k * 1.2), x = f.x + Math.cos(f.ang) * d, y = f.y + Math.sin(f.ang) * d;
        for (let i = 0; i < 14; i++) { const q = d - i * 34; if (q < 0) break; ctx.globalAlpha = (1 - i / 14) * 0.9; R.ProjArt.erodFire(ctx, { x: f.x + Math.cos(f.ang) * q + Math.sin(t / 50 + i) * 8, y: f.y + Math.sin(f.ang) * q + Math.cos(t / 60 + i) * 8, ang: f.ang, r: 16 - i * 0.7 }, t); }
        ctx.globalAlpha = 1; dragon(ctx, x, y, f.ang, 70, t);
      } else if (f.k === "wjet") {
        // 使用者的圖６：聖杯噴出的水柱（淡藍、深藍的邊、波浪形）
        ctx.translate(f.x, f.y); ctx.rotate(f.ang); ctx.globalAlpha = k < 0.8 ? 1 : (1 - k) * 5;
        const L = f.len * Math.min(1, k * 3);
        ctx.fillStyle = "#1aa0e8"; ctx.strokeStyle = "#3a46c8"; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(0, -f.w * 0.2);
        for (let i = 0; i <= 12; i++) { const x = (i / 12) * L; ctx.lineTo(x, -f.w * 0.5 - Math.sin(i * 1.2 + t / 90) * f.w * 0.15); }
        for (let i = 12; i >= 0; i--) { const x = (i / 12) * L; ctx.lineTo(x, f.w * 0.5 + Math.sin(i * 1.1 + t / 80) * f.w * 0.15); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
      } else if (f.k === "wave") {
        ctx.globalAlpha = 1 - k;
        for (let i = 0; i < 3; i++) { const r = f.r * Math.min(1, k * 1.3 - i * 0.12); if (r <= 0) continue; ctx.strokeStyle = i ? "#9ad8ff" : "#2a8aff"; ctx.lineWidth = 10 - i * 3; ctx.beginPath(); ctx.arc(f.x, f.y, r, f.ang - f.half, f.ang + f.half); ctx.stroke(); }
      } else if (f.k === "bomb") {
        const x = f.x + (f.x2 - f.x) * k, y = f.y + (f.y2 - f.y) * k - Math.sin(k * Math.PI) * 120;
        ctx.globalAlpha = 0.3; ctx.fillStyle = "#0a2a4a"; ctx.beginPath(); ctx.ellipse(f.x + (f.x2 - f.x) * k, f.y + (f.y2 - f.y) * k, 16, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1; droplet(ctx, x, y, 20);
      } else if (f.k === "geyser") {
        const u = f.unit, h = 700 * Math.min(1, k * 2);
        ctx.globalAlpha = k < 0.7 ? 1 : (1 - k) / 0.3;
        ctx.fillStyle = "#1aa0e8"; ctx.strokeStyle = "#3a46c8"; ctx.lineWidth = 5;
        const cx = u.x, cy = u.y - u.r * 1.9;
        ctx.beginPath(); ctx.moveTo(cx - 18, cy);
        for (let i = 0; i <= 10; i++) ctx.lineTo(cx - 18 - Math.sin(i + t / 80) * 8 - i * 2, cy - (i / 10) * h);
        for (let i = 10; i >= 0; i--) ctx.lineTo(cx + 18 + Math.sin(i * 1.3 + t / 90) * 8 + i * 2, cy - (i / 10) * h);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      } else if (f.k === "drop") {
        // 天上落下的水柱
        const h = 700 * (1 - Math.min(1, k * 2.2));
        ctx.globalAlpha = k < 0.6 ? 0.95 : (1 - k) / 0.4;
        ctx.fillStyle = "#1aa0e8"; ctx.strokeStyle = "#3a46c8"; ctx.lineWidth = 4;
        ctx.fillRect(f.x - f.r * 0.45, f.y - 720, f.r * 0.9, 720 - h); ctx.strokeRect(f.x - f.r * 0.45, f.y - 720, f.r * 0.9, 720 - h);
        if (k > 0.4) { ctx.strokeStyle = "#9ad8ff"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (k - 0.3) * 1.6, 0, Math.PI * 2); ctx.stroke(); }
      } else if (f.k === "streak") {
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.col; ctx.lineWidth = 8; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke();
      } else if (f.k === "wind") {
        ctx.translate(f.x, f.y); ctx.rotate(f.ang); if (f.up) ctx.scale(1, -1);
        windArcs(ctx, f.r * (0.7 + 0.3 * k), f.side, 1 - k);
      } else if (f.k === "pierce") {
        ctx.translate(f.x, f.y); ctx.rotate(f.ang); ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = "#c8f0dc"; ctx.lineWidth = 6; ctx.lineCap = "round";
        for (const o of [-10, 0, 10]) { ctx.beginPath(); ctx.moveTo(40, o); ctx.lineTo(f.len * (0.6 + 0.4 * k), o * 0.3); ctx.stroke(); }
      } else if (f.k === "tornado") {
        const u = f.unit; if (!u.alive) { ctx.restore(); continue; }
        ctx.translate(u.x, u.y); ctx.globalAlpha = 0.75;
        for (let i = 0; i < 6; i++) { const r = u.r + 18 + i * 9, a = t / (90 + i * 25) + i; ctx.strokeStyle = i % 2 ? "#d8fff0" : "#7ae8b0"; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, -i * 6, r, r * 0.45, 0, a, a + 4.2); ctx.stroke(); }
      } else if (f.k === "quake") {
        const r = f.r * ease(Math.min(1, k * 1.4));
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = "#ffc820"; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(f.x, f.y, r, f.ang - f.half, f.ang + f.half); ctx.stroke();
        ctx.strokeStyle = "#8a6a2a"; ctx.lineWidth = 3;
        for (let i = 0; i < 9; i++) { const a = f.ang - f.half + (i + 0.5) / 9 * f.half * 2; ctx.beginPath(); ctx.moveTo(f.x + Math.cos(a) * 30, f.y + Math.sin(a) * 30); ctx.lineTo(f.x + Math.cos(a + 0.05) * r * 0.5, f.y + Math.sin(a + 0.05) * r * 0.5); ctx.lineTo(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r); ctx.stroke(); }
      } else if (f.k === "spike") {
        const h = f.r * 1.4 * Math.min(1, k * 5) * (k > 0.7 ? (1 - k) / 0.3 : 1);
        ctx.fillStyle = "#c8a040"; ctx.strokeStyle = "#ffe080"; ctx.lineWidth = 2;
        for (const o of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.moveTo(f.x + o * f.r - f.r * 0.25, f.y + f.r * 0.2); ctx.lineTo(f.x + o * f.r, f.y + f.r * 0.2 - h * (o ? 0.7 : 1)); ctx.lineTo(f.x + o * f.r + f.r * 0.25, f.y + f.r * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      } else if (f.k === "dust") {
        ctx.globalAlpha = (1 - k) * 0.7; ctx.fillStyle = "#b89a6a";
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, d = f.r * 0.4 + k * f.r * 0.6; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, 10 * (1 - k) + 4, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.restore();
    }
  }
  // 隆起的地面（掩體）
  function drawRaised(ctx, b, t) {
    for (const o of b.room.obstacles || []) {
      if (!o.erod) continue;
      const q = Math.min(1, (t - (o.t0 || 0)) / 300), cx = o.x + o.w / 2, cy = o.y + o.h / 2, h = o.h * q;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.fillRect(o.x + 4, o.y + o.h - 4, o.w, 10);
      ctx.fillStyle = "#7a5a32"; ctx.fillRect(o.x, o.y + o.h - h, o.w, h);
      ctx.fillStyle = "#a8844a"; ctx.fillRect(o.x, o.y + o.h - h, o.w, Math.min(h, 16));
      ctx.strokeStyle = "#ffd860"; ctx.lineWidth = 2; ctx.strokeRect(o.x, o.y + o.h - h, o.w, h);
      ctx.strokeStyle = "rgba(40,24,8,.6)"; ctx.beginPath(); ctx.moveTo(cx - 18, cy + 8); ctx.lineTo(cx - 6, cy - 2); ctx.lineTo(cx - 9, cy + 14); ctx.moveTo(cx + 4, cy + 18); ctx.lineTo(cx + 12, cy + 4); ctx.lineTo(cx + 20, cy + 10); ctx.stroke();
      ctx.restore();
    }
  }
  // 出場：兜帽的寶石依序亮出四個顏色
  const INTRO = 2600;
  function drawIntro(ctx, b, t) {
    const k = (t - b.erod.intro) / INTRO, A = b.cfg.arena;
    if (k >= 1) return;
    const u = b.mainEnemies().find((e) => e.def.ai === "erod");
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - k) * 3) * 0.6; ctx.fillStyle = "#04040c"; ctx.fillRect(0, 0, A.w, A.h);
    if (u) {
      const order = ["fire", "water", "storm", "earth"], i = Math.min(3, Math.floor(k * 4.4));
      ctx.globalAlpha = Math.min(1, (1 - k) * 3);
      order.forEach((f, j) => { if (j > i) return; const a = -Math.PI / 2 + (j / 4) * Math.PI * 2 + k * 2; ctx.fillStyle = FORMS[f].c; ctx.shadowColor = FORMS[f].c; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(u.x + Math.cos(a) * 110, u.y + Math.sin(a) * 110, 14, 0, Math.PI * 2); ctx.fill(); });
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#e8e0ff"; ctx.font = "900 30px 'Noto Sans TC', sans-serif"; ctx.textAlign = "center";
      ctx.fillText("命運的見證者・厄羅德", A.w / 2, A.h - 90);
    }
    ctx.restore();
  }

  // ===== 地形：鐵與骨的大教堂 =====
  R.Terrains = R.Terrains || {};
  R.Terrains.cathedral = {
    bg(g, W, H) {
      g.fillStyle = "#1c1a22"; g.fillRect(0, 0, W, H);
      for (let x = 0; x < W; x += 80) for (let y = 0; y < H; y += 80) { g.fillStyle = (x / 80 + y / 80) % 2 ? "#26232e" : "#211e28"; g.fillRect(x + 1, y + 1, 78, 78); }
      // 紅地毯
      g.fillStyle = "#4a0e14"; g.fillRect(W / 2 - 90, 0, 180, H); g.strokeStyle = "#c8a040"; g.lineWidth = 3; g.strokeRect(W / 2 - 90, -4, 180, H + 8);
      // 頂上的玫瑰窗：四個顏色（四把武器）
      const cx = W / 2, cy = 70, cols = ["#ff3a2a", "#2a8aff", "#7ae8b0", "#ffc820"];
      for (let i = 0; i < 8; i++) { g.fillStyle = cols[i % 4]; g.globalAlpha = 0.35; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 64, (i / 8) * Math.PI * 2, ((i + 1) / 8) * Math.PI * 2); g.closePath(); g.fill(); }
      g.globalAlpha = 1; g.strokeStyle = "#8a8070"; g.lineWidth = 5; g.beginPath(); g.arc(cx, cy, 64, 0, Math.PI * 2); g.stroke();
      // 兩側的鐵柱和骨頭
      for (const x of [40, W - 40]) for (let y = 120; y < H - 60; y += 150) {
        g.fillStyle = "#3a3a44"; g.fillRect(x - 16, y - 34, 32, 68); g.strokeStyle = "#6a6a78"; g.lineWidth = 2; g.strokeRect(x - 16, y - 34, 32, 68);
        g.fillStyle = "#e8e0cc"; g.beginPath(); g.ellipse(x, y + 50, 18, 6, 0, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(x - 18, y + 50, 6, 0, Math.PI * 2); g.arc(x + 18, y + 50, 6, 0, Math.PI * 2); g.fill();
      }
      for (let i = 0; i < 2600; i++) { g.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,.02)" : "rgba(0,0,0,.05)"; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
    },
  };

  // ===== 房間 =====
  C.rooms.erod = {
    name: "命運的考驗", desc: "命運的見證者・厄羅德", hidden: true, terrain: "cathedral", bgm: "sounds/bgm-erod.mp3",
    retreat: null, xp: 3200, gold: [1500, 1800], playerStart: { x: 640, y: 600 },
    wave: [{ kind: "erod", x: 640, y: 210 }], winText: "通過了命運的考驗！",
    help: "<b>命運的見證者・厄羅德</b>：行動點很多、動作頻繁，會自己切換四把武器（換的時候周圍擊退，不會受傷）。<br>"
      + "<b style='color:#e8302a'>火焰（烈火權杖）</b>：火球射程短、火焰噴射、火球雨、環繞火球；大招＝火龍撞到邊緣炸開成整片火球<br>"
      + "<b style='color:#2a6ae8'>水流（湧泉聖杯）</b>：會後撤，蓄力長；水波、水柱、會彈跳的水彈、只擊退的水環；大招＝天上的水柱一直跟著你落下<br>"
      + "<b style='color:#2a9a6a'>風暴（颶風寶劍）</b>：移動很快、出招預告很短，斬擊會把你推開再貼上來；大招＝龍捲風包覆（受傷變少）＋來回衝刺<br>"
      + "<b style='color:#b08a00'>大地（黃金戰槌）</b>：很慢、蓄力久但傷害特別高；地面隆起變成掩體，震波會把它炸成石塊；大招＝跳起來猛擊＋一圈地刺<br>"
      + "沒有特殊的弱化機制：抓住每個型態的缺點",
    preStart: (b) => new Promise((res) => {
      const M = fxOf(b); M.intro = now();
      b.emit({ type: "sfx", sound: "sounds/guan-chime.mp3" });
      setTimeout(() => { b.say("命運的見證者・厄羅德：「" + pick(LINES.open) + "」"); res(); }, INTRO - 300);
    }),
    onStart(b) { fxOf(b); b.room.obstacles = []; },
    drawRoom(ctx, t, b, H) {
      const M = fxOf(b);
      drawRaised(ctx, b, t);
      drawFx(ctx, b, t);
      if (M.intro) drawIntro(ctx, b, t);
    },
    // 打贏：大量金幣（房間的 gold）＋這一趟記下「要選特殊命運卡」（回到時空地圖時跳出來）
    onWin(b, trip) {
      trip.qdata = trip.qdata || {};
      const Q = (trip.qdata.erod = trip.qdata.erod || {});
      Q.won = true; if (!Q.card) Q.pending = true;
      b.say(`命運的見證者・厄羅德：「${LINES.down}」`);
      return `<span class="reward quest">命運的見證者留下了四張特殊命運卡——回到大教堂時選一張</span>`;
    },
  };
  R.Erod = { FORMS, S };
})();
