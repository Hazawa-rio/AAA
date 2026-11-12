/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/characters/bastian.js": "20261113040753" });
// 角色：巴斯提安（昇華角色・近戰・塔盾）
// 一座已經陷落的城的守門人，背著比門板還寬的塔盾和一把短矛
// 被動「不退之門」：面向的正前方（±60°）受到的傷害 ×0.65；擋下來的傷害累積成「壓力」（上限 60）
//   面向＝最後一次移動或出招的方向；往後退，背就露出來了
// 普攻「盾擊」：用塔盾往前砸，打到前方短矩形裡的敵人，並把它們往後推
// Q「破城衝鋒」：舉盾往前衝，撞到第一個敵人就停下來，把它撞開（Boss 太重撞不動）
// E「立盾」：把塔盾插在指定方向（轉身），獲得護盾；到下一回合之前正面的減傷變成 ×0.4
// W「城門崩落」：把塔盾高高舉起砸向地面，釋放所有壓力：身邊一圈的敵人受到傷害、被震開、下一回合少 1 行動點
// 數值都是暫定；個性台詞之後由使用者提供
(function () {
  const R = window.RPG;
  R.CHARACTERS = R.CHARACTERS || {};
  const err = (m) => { throw new R.ActionError(m); };
  const DEG = Math.PI / 180;
  const upg = (u) => u.upg || {};
  const dirOf = (u, arg) => {
    const t = arg.target ? arg.target : arg;
    if (!t || !Number.isFinite(t.x)) err("請點選方向");
    const L = Math.hypot(t.x - u.x, t.y - u.y);
    if (L < 1) err("請點選方向");
    return { dx: (t.x - u.x) / L, dy: (t.y - u.y) / L, ang: Math.atan2(t.y - u.y, t.x - u.x) };
  };
  const heavy = (e) => e.def.boss || e.def.bigBar || e.def.trial || e.part || e.def.block;
  const angDiff = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return Math.abs(d); };
  const braced = (b, u) => u.state.braceTurn === true;          // 立盾：持續到自己的下一個回合開始
  // 塔盾的鈍擊聲（使用者提供）：impact-1 比較短促、impact-2 比較沉
  const HIT1 = "sounds/bastian-impact-1.mp3", HIT2 = "sounds/bastian-impact-2.mp3";
  const SND = { bash: HIT1, charge: HIT2, plant: HIT1, quake: HIT2, quakeBoom: "sounds/vivilla-boom.mp3", block: HIT1, run: "sounds/slime-ram.mp3" };

  // 把敵人沿著方向推開（推到第一個站不下的位置就停）
  function push(b, e, ang, d) {
    if (!e.alive || heavy(e) || d <= 0) return false;
    const from = { x: e.x, y: e.y };
    let to = null;
    for (let s = 8; s <= d; s += 8) { const x = from.x + Math.cos(ang) * s, y = from.y + Math.sin(ang) * s; if (b.blocked(e, x, y) || b.onObstacle(e, x, y)) break; to = { x, y }; }
    if (!to) return false;
    const A = b.cfg.arena, m = e.r + 4;
    to.x = Math.min(Math.max(to.x, m), A.w - m); to.y = Math.min(Math.max(to.y, m), A.h - m);
    e.x = to.x; e.y = to.y;
    b.emit({ type: "leap", unit: e, from, to, duration: 0.2 });
    b.emit({ type: "move", unit: e });
    return true;
  }

  const C = {
    id: "bastian",
    name: "巴斯提安",
    letter: "巴",
    color: "#9a6a2a",
    role: "近戰・塔盾",
    gacha: true,
    profile: "一座已經不存在的城的守門人。城早就陷落了，他卻還背著那面比門板還寬的塔盾到處走，說只要盾還在，門就還在。話很少，習慣站在所有人的前面。",
    desc: "背著塔盾的守門人。正面挨打只受六成傷害，擋下來的傷害累積成壓力；舉盾衝鋒撞開敵人、把盾插在地上轉身面對危險，最後把累積的壓力一口氣砸回去。",
    style: { role: "近戰・塔盾（壓力）", text: "正面挨打只受六成傷害的守門人，擋下來的傷害會累積成「壓力」。盾擊和破城衝鋒把敵人推開、撞開；立盾讓他轉身面對危險、獲得護盾。壓力夠多時，「城門崩落」把盾砸向地面，把挨過的打一次奉還給身邊所有敵人。往後退會把背露出來。" },
    stats: { hp: 118, mp: 40, atk: 14, df: 7, spd: 9, ap: 6 },     // 暫定
    growth: { hp: 5, mp: 1, atk: 0.8, df: 0.5, spd: 0.08 },
    mpRegen: 0,
    field: {
      basicRange: 120,
      // 探索技能：舉盾往前衝一小段（可以跨過矮牆）
      q: { name: "舉盾衝刺", type: "jet", sound: SND.charge, cd: 20, dist: 160, desc: "舉起塔盾往前衝一小段距離（可以跨過矮牆）" },
    },
    // 個性台詞（使用者提供；lines 是空的就不會說話）
    barks: {
      bash: { chance: 0.3, lines: [] },
      charge: { chance: 0.6, lines: [] },
      chargeHeavy: { chance: 0.8, lines: [] },
      brace: { chance: 0.7, lines: [] },
      guard: { chance: 0.25, lines: [] },
      back: { chance: 0.6, lines: [] },
      ult: { chance: 0.95, lines: [] },
      hurt: { chance: 0.3, lines: [] },
    },
    basic: "bash",
    ultimate: "gatefall",
    hud: { left: "charge", center: "gatefall", right: "brace" },

    passive: {
      name: "不退之門",
      desc: "面向的正前方（左右各 60°）受到的傷害 ×0.65，擋下來的傷害累積成「壓力」（上限 60）。面向＝最後一次移動或出招的方向。立盾的時候正面 ×0.4",
      half: 60, mult: 0.65, braceMult: 0.4, cap: 60,
      status(b, u) { const p = u.state.pressure || 0; return { text: `壓力 ${p} / ${C.passive.cap}${braced(b, u) ? "・立盾中" : ""}`, on: p > 0 }; },
    },

    upgrades: {
      q: {
        skill: "charge",
        tiers: [
          [
            { id: "ram", name: "破城槌", desc: "破城衝鋒的距離 ×1.4" },
            { id: "bulldoze", name: "推土前進", desc: "破城衝鋒撞到敵人後不停下，推著它一起衝到底（Boss 除外）" },
          ],
          [
            { id: "daze", name: "震懾", desc: "被破城衝鋒撞到的敵人破防 1 回合（防禦 ×0.6）" },
            { id: "momentum", name: "趁勢", desc: "破城衝鋒撞到敵人時，退還 1 行動點" },
          ],
        ],
      },
      e: {
        skill: "brace",
        tiers: [
          [
            { id: "plate", name: "重甲", desc: "立盾給的護盾 ×1.5" },
            { id: "spikes", name: "盾面倒刺", desc: "立盾中，從正面打中自己的敵人受到反刺傷害" },
          ],
          [
            { id: "allround", name: "全向警戒", desc: "立盾中，所有方向都算正面" },
            { id: "rampart", name: "穩如城牆", desc: "立盾時解除 1 個負面狀態，並獲得 8 點壓力" },
          ],
        ],
      },
      w: {
        skill: "gatefall",
        tiers: [
          [
            { id: "aftershock", name: "餘震", desc: "城門崩落的範圍 ×1.3，被震到的敵人麻痺 1 回合" },
            { id: "repay", name: "全數奉還", desc: "城門崩落把壓力轉成傷害的比例 ×1.6" },
          ],
        ],
      },
    },

    // ===== 不退之門：正面減傷、累積壓力 =====
    front(b, u, src) {
      if (!src || src === u || !Number.isFinite(src.x)) return false;
      if (braced(b, u) && upg(u).e2 === "allround") return true;
      return angDiff(Math.atan2(src.y - u.y, src.x - u.x), u.facing) <= C.passive.half * DEG;
    },
    guard(b, src, dst) {
      if (dst !== b.player) return null;
      if (!this.front(b, dst, src)) { if (src && src !== dst && Number.isFinite(src.x)) b.bark(dst, "back", 0.2); return null; }
      const m = braced(b, dst) ? C.passive.braceMult : C.passive.mult;
      return { mult: m, note: braced(b, dst) ? "（立盾）" : "（正面格擋）" };
    },
    onGuard(b, dst, src, blocked) {
      const P = C.passive, before = dst.state.pressure || 0;
      dst.state.pressure = Math.min(P.cap, before + Math.max(1, blocked));
      if (dst.state.pressure !== before) b.emit({ type: "buff", unit: dst, text: `壓力 +${dst.state.pressure - before}`, color: "#9a6a2a" });
      b.emit({ type: "sfx", sound: SND.block });
      b.bark(dst, "guard", 0.2);
      // 盾面倒刺
      if (braced(b, dst) && upg(dst).e1 === "spikes" && src?.alive && src.team !== dst.team) { b.hitDelay = 0.25; b.damage(dst, src, 6, 1, "（盾面倒刺）"); b.hitDelay = 0; }
    },
    onTurnStart(b, unit) {
      if (unit !== b.player) return;
      unit.state.braceTurn = false;
    },

    tune: [
      ["不退之門 正面倍率", "passive", "mult", 0.1, 1, 0.05],
      ["不退之門 立盾倍率", "passive", "braceMult", 0.1, 1, 0.05],
      ["不退之門 正面角度（單邊）", "passive", "half", 20, 180, 5],
      ["壓力上限", "passive", "cap", 10, 200, 5],
      ["盾擊 基礎", "bash", "base", 0, 40, 1],
      ["盾擊 推開距離", "bash", "push", 0, 200, 5],
      ["破城衝鋒 距離", "charge", "dist", 80, 500, 10],
      ["破城衝鋒 基礎", "charge", "base", 0, 40, 1],
      ["立盾 護盾（防禦倍數）", "brace", "dfScale", 0, 6, 0.1],
      ["城門崩落 基礎", "gatefall", "base", 0, 60, 1],
      ["城門崩落 壓力轉傷害", "gatefall", "perPressure", 0, 2, 0.05],
      ["城門崩落 半徑", "gatefall", "radius", 60, 400, 10],
    ],

    skills: {
      // ---------- 普攻 盾擊 ----------
      bash: {
        name: "盾擊", slot: "普攻", key: "a", sound: SND.bash,
        tags: ["melee"],
        ap: 1, length: 120, width: 120, base: 13, push: 45,
        desc: "用塔盾往前砸，打到前方短矩形裡的敵人，並把它們往後推",
        shape(u, arg) { const d = dirOf(u, arg); return { shape: "rect", x: u.x + d.dx * u.r * 0.5, y: u.y + d.dy * u.r * 0.5, ang: d.ang, length: this.length, width: this.width }; },
        status() { return { ready: true, cost: this.ap, label: this.name, aim: { type: "enemy", range: this.length + 10, free: true } }; },
        predict(b, u, arg) {
          const t = arg.target;
          if (t && (!t.alive || t.team === u.team)) err("請點選一個敵人");
          const s = this.shape(u, arg);
          return b.targetsFor(u).filter((e) => R.geo.inRect(e.x, e.y, s, e.r));
        },
        preview(b, u, arg) { return { shapes: [this.shape(u, arg)], hits: this.predict(b, u, arg) }; },
        use(b, u, arg) {
          const s = this.shape(u, arg), hits = this.predict(b, u, arg);
          u.facing = s.ang;
          b.say(`${u.name} 舉起塔盾「盾擊」`);
          b.bark(u, "bash");
          b.emit({ type: "sfx", sound: this.sound });
          b.emit({ type: "bsBash", x: u.x, y: u.y, ang: s.ang, length: this.length, width: this.width });
          if (!hits.length) { b.say("……砸空了"); b.emit({ type: "miss", x: u.x + Math.cos(s.ang) * this.length * 0.7, y: u.y + Math.sin(s.ang) * this.length * 0.7 }); return; }
          for (const e of hits) { b.damage(u, e, this.base); push(b, e, s.ang, this.push); }
        },
      },

      // ---------- Q 破城衝鋒 ----------
      charge: {
        name: "破城衝鋒", slot: "Q", key: "q", sound: SND.charge,
        tags: ["melee"],
        ap: 1, cooldown: 2, dist: 240, base: 15, knock: 90,
        desc: "舉盾往指定方向衝，撞到第一個敵人就停下來，把它撞開（Boss 太重撞不動，只會受傷）",
        rng(u) { return this.dist * (upg(u).q1 === "ram" ? 1.4 : 1); },
        path(b, u, arg) {
          const d = dirOf(u, arg), L = this.rng(u);
          let hit = null, t = L;
          for (const e of b.targetsFor(u)) { const h = R.geo.rayCircle(u.x, u.y, d.dx, d.dy, e.x, e.y, e.r + u.r); if (h !== null && h > 0 && h < t) { hit = e; t = h; } }
          // 停的位置：撞到的敵人前面，或是路上第一個站不下的地方
          let stop = { x: u.x, y: u.y };
          const end = hit ? Math.max(0, t - 4) : L;
          for (let s = 8; s <= end; s += 8) { const x = u.x + d.dx * s, y = u.y + d.dy * s; if (b.onObstacle(u, x, y) || b.blocked(u, x, y)) break; stop = { x, y }; }
          return { d, hit, stop };
        },
        status(b, u) {
          const cd = u.cd.charge || 0;
          if (cd > 0) return { ready: false, cost: this.ap, label: this.name, note: `CD ${cd}`, reason: `冷卻中（還要 ${cd} 次行動）` };
          return { ready: true, cost: this.ap, label: this.name, aim: { type: "direction", range: this.rng(u) } };
        },
        predict(b, u, arg) { const p = this.path(b, u, arg); return p.hit ? [p.hit] : []; },
        preview(b, u, arg) { const p = this.path(b, u, arg); return { shapes: [{ shape: "line", x1: u.x, y1: u.y, x2: u.x + p.d.dx * this.rng(u), y2: u.y + p.d.dy * this.rng(u), width: u.r * 2 }], hits: p.hit ? [p.hit] : [] }; },
        use(b, u, arg) {
          const p = this.path(b, u, arg), from = { x: u.x, y: u.y };
          u.facing = p.d.ang;
          b.setCooldown(u, "charge", this.cooldown);
          b.emit({ type: "sfx", sound: SND.run });
          const e = p.hit;
          // 推土前進：先把敵人推到終點前面
          if (e && upg(u).q1 === "bulldoze" && !heavy(e)) {
            const L = this.rng(u), go = Math.max(0, L - R.dist(u.x, u.y, e.x, e.y) + e.r);
            push(b, e, p.d.ang, go);
            const stop = { x: e.x - p.d.dx * (e.r + u.r + 4), y: e.y - p.d.dy * (e.r + u.r + 4) };
            if (!b.blocked(u, stop.x, stop.y) && !b.onObstacle(u, stop.x, stop.y)) p.stop = stop;
          }
          if (R.dist(from.x, from.y, p.stop.x, p.stop.y) > 4) { u.x = p.stop.x; u.y = p.stop.y; b.emit({ type: "leap", unit: u, from, to: { ...p.stop }, duration: 0.22 }); b.emit({ type: "move", unit: u }); }
          b.emit({ type: "bsCharge", x1: from.x, y1: from.y, x2: u.x, y2: u.y });
          if (!e) { b.say(`${u.name} 舉盾衝了出去——什麼都沒撞到`); return; }
          b.say(`${u.name}「破城衝鋒」撞上了 ${e.name}！`);
          b.emit({ type: "sfx", sound: this.sound, delay: 0.18 });
          b.bark(u, heavy(e) ? "chargeHeavy" : "charge", 0.2);
          b.hitDelay = 0.2;
          b.damage(u, e, this.base);
          b.hitDelay = 0;
          if (heavy(e)) b.say(`${e.name} 太重了，撞不動！`);
          else if (upg(u).q1 !== "bulldoze") push(b, e, p.d.ang, this.knock);
          if (upg(u).q2 === "daze" && e.alive) { e.state.defDownUntil = b.round + 1; e.state.defDownMult = 0.6; b.emit({ type: "buff", unit: e, text: "破防", color: "#b0603f" }); }
          if (upg(u).q2 === "momentum") { u.ap += 1; b.emit({ type: "buff", unit: u, text: "趁勢 +1", color: "#9a6a2a" }); }
        },
      },

      // ---------- E 立盾 ----------
      brace: {
        name: "立盾", slot: "E", key: "e", sound: SND.plant,
        tags: ["shield"],
        ap: 1, cooldown: 1, dfScale: 2.2,
        desc: "把塔盾插在指定的方向（轉身面向那裡），獲得護盾（防禦 × 2.2）；到下一回合之前，正面受到的傷害 ×0.4",
        amount(u) { return Math.round(u.df * this.dfScale * (upg(u).e1 === "plate" ? 1.5 : 1)); },
        status(b, u) {
          const cd = u.cd.brace || 0;
          if (cd > 0) return { ready: false, cost: this.ap, label: this.name, note: `CD ${cd}`, reason: `冷卻中（還要 ${cd} 次行動）` };
          return { ready: true, cost: this.ap, label: this.name, note: `護盾 ${this.amount(u)}`, aim: { type: "direction" } };
        },
        predict() { return []; },
        preview(b, u, arg) {
          const d = dirOf(u, arg), H = C.passive.half * DEG, all = upg(u).e2 === "allround";
          return { shapes: [all ? { shape: "circle", x: u.x, y: u.y, radius: 90, color: "#9a6a2a" } : { shape: "sector", x: u.x, y: u.y, ang: d.ang, half: H, radius: 110, color: "#9a6a2a" }], hits: [] };
        },
        use(b, u, arg) {
          const d = dirOf(u, arg);
          u.facing = d.ang;
          u.state.braceTurn = true;
          b.setCooldown(u, "brace", this.cooldown);
          b.say(`${u.name} 把塔盾插在地上「立盾」`);
          b.bark(u, "brace");
          b.emit({ type: "sfx", sound: this.sound });
          b.emit({ type: "bsPlant", x: u.x, y: u.y, ang: d.ang });
          b.addShield(u, this.amount(u), "（立盾）");
          if (upg(u).e2 === "rampart") {
            const gone = b.cleanse?.(u);
            if (gone) b.emit({ type: "buff", unit: u, text: `解除${gone}`, color: "#3d9a5b" });
            u.state.pressure = Math.min(C.passive.cap, (u.state.pressure || 0) + 8);
            b.emit({ type: "buff", unit: u, text: "壓力 +8", color: "#9a6a2a" });
          }
        },
      },

      // ---------- W 城門崩落 ----------
      gatefall: {
        name: "城門崩落", slot: "W", key: "w", ultimate: true, sound: SND.quake,
        tags: ["area", "melee"],
        ap: 2, charge: 5, base: 16, perPressure: 0.55, radius: 170, knock: 70,
        desc: "把塔盾高高舉起砸向地面，釋放所有壓力：身邊一圈的敵人受到傷害（基礎＋壓力 × 0.55）、被震開，下一回合少 1 行動點",
        rad(u) { return this.radius * (upg(u).w1 === "aftershock" ? 1.3 : 1); },
        power(u) { return this.base + (u.state.pressure || 0) * this.perPressure * (upg(u).w1 === "repay" ? 1.6 : 1); },
        status(b, u) {
          if (u.charge < this.charge) return { ready: false, cost: this.ap, label: this.name, note: `${u.charge}/${this.charge}`, reason: `還要 ${this.charge - u.charge} 次行動才能使用` };
          return { ready: true, cost: this.ap, label: this.name, note: `壓力 ${u.state.pressure || 0}`, aim: { type: "none" } };
        },
        predict(b, u) { const r = this.rad(u); return b.targetsFor(u).filter((e) => R.dist(e.x, e.y, u.x, u.y) <= r + e.r); },
        preview(b, u) { return { shapes: [{ shape: "circle", x: u.x, y: u.y, radius: this.rad(u) }], hits: this.predict(b, u) }; },
        use(b, u) {
          const r = this.rad(u), base = this.power(u), pr = u.state.pressure || 0;
          u.charge = 0; u.state.pressure = 0;
          b.say(`${u.name}：「城門崩落」！（釋放壓力 ${pr}）`);
          b.bark(u, "ult");
          b.emit({ type: "leap", unit: u, from: { x: u.x, y: u.y }, to: { x: u.x, y: u.y }, duration: 0.5, height: 46 });
          b.emit({ type: "sfx", sound: this.sound, delay: 0.45 });
          b.emit({ type: "sfx", sound: SND.quakeBoom, delay: 0.5 });
          b.emit({ type: "bsQuake", x: u.x, y: u.y, radius: r, pressure: pr, delay: 0.45 });
          const hits = this.predict(b, u);
          b.hitDelay = 0.5;
          for (const e of hits) {
            if (!e.alive) continue;
            b.damage(u, e, base, 1, pr ? `（壓力 ${pr}）` : "");
            if (!e.alive) continue;
            push(b, e, Math.atan2(e.y - u.y, e.x - u.x), this.knock);
            e.state.apPenalty = (e.state.apPenalty || 0) + 1;
            b.emit({ type: "buff", unit: e, text: "行動點 −1", color: "#7a3fb0" });
            if (upg(u).w1 === "aftershock") { e.state.slowUntil = b.round + 1; e.state.slowMult = 0.5; b.emit({ type: "buff", unit: e, text: "麻痺", color: "#7a3fb0" }); }
          }
          b.hitDelay = 0;
        },
      },
    },

    // ===== 畫面 =====
    fxEvents: { bsBash: () => 320, bsCharge: () => 420, bsPlant: () => 600, bsQuake: () => 900 },
    drawFx(ctx, ev, k, t) {
      switch (ev.type) {
        case "bsBash": {
          // 塔盾往前砸的殘影
          const L = ev.length * (0.4 + 0.6 * Math.min(1, k * 2));
          ctx.save(); ctx.translate(ev.x, ev.y); ctx.rotate(ev.ang); ctx.globalAlpha = 1 - k;
          ctx.fillStyle = "rgba(154,106,42,.25)"; ctx.fillRect(0, -ev.width / 2, L, ev.width);
          ctx.fillStyle = "#c8a060"; ctx.strokeStyle = "#5a3a10"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.rect(L - 14, -ev.width * 0.42, 14, ev.width * 0.84); ctx.fill(); ctx.stroke();
          ctx.restore();
          break;
        }
        case "bsCharge": {
          ctx.globalAlpha = 1 - k; ctx.strokeStyle = "rgba(154,106,42,.55)"; ctx.lineWidth = 26; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(ev.x1, ev.y1); ctx.lineTo(ev.x2, ev.y2); ctx.stroke(); ctx.lineCap = "butt";
          for (let i = 0; i < 6; i++) { const a = Math.atan2(ev.y2 - ev.y1, ev.x2 - ev.x1) + Math.PI + (i - 2.5) * 0.25; ctx.fillStyle = "rgba(120,100,70,.5)"; ctx.beginPath(); ctx.arc(ev.x1 + Math.cos(a) * 20 * (1 + k * 2), ev.y1 + Math.sin(a) * 20 * (1 + k * 2), 6 * (1 - k), 0, Math.PI * 2); ctx.fill(); }
          break;
        }
        case "bsPlant": {
          ctx.globalAlpha = 1 - k * 0.8; ctx.strokeStyle = "#9a6a2a"; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.arc(ev.x, ev.y, 46 + k * 30, ev.ang - 1.05, ev.ang + 1.05); ctx.stroke();
          break;
        }
        case "bsQuake": {
          // 地面裂開的圈＋往外的裂痕
          ctx.globalAlpha = 1 - k; ctx.strokeStyle = "#7a4a1a"; ctx.lineWidth = 6;
          ctx.beginPath(); ctx.arc(ev.x, ev.y, ev.radius * Math.min(1, k * 1.8), 0, Math.PI * 2); ctx.stroke();
          ctx.lineWidth = 3;
          for (let i = 0; i < 10; i++) { const a = i * 0.63 + 0.2, r = ev.radius * Math.min(1, k * 2); ctx.beginPath(); ctx.moveTo(ev.x + Math.cos(a) * 20, ev.y + Math.sin(a) * 20); ctx.lineTo(ev.x + Math.cos(a + 0.12) * r * 0.55, ev.y + Math.sin(a + 0.12) * r * 0.55); ctx.lineTo(ev.x + Math.cos(a - 0.05) * r, ev.y + Math.sin(a - 0.05) * r); ctx.stroke(); }
          break;
        }
      }
      ctx.globalAlpha = 1;
    },
    // 塔盾：畫在自己面向的那一側（立盾時變大、變亮），壓力在旁邊用一條小槽表示
    drawBattle(ctx, t, b, H) {
      const u = b.player;
      if (!u?.alive) return;
      const p = H.pos ? H.pos(u) : u, br = braced(b, u), a = u.facing, half = C.passive.half * DEG;
      ctx.save();
      ctx.globalAlpha = br ? 0.95 : 0.6; ctx.strokeStyle = br ? "#d8a040" : "#9a6a2a"; ctx.lineWidth = br ? 8 : 5;
      if (br && upg(u).e2 === "allround") { ctx.beginPath(); ctx.arc(p.x, p.y, u.r + 12, 0, Math.PI * 2); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, u.r + 12, a - half, a + half); ctx.stroke(); }
      const pr = u.state.pressure || 0;
      if (pr > 0) {
        const w = 6, h = 34, x = p.x - u.r - 18, y = p.y - h / 2;
        ctx.globalAlpha = 1; ctx.fillStyle = "rgba(29,29,31,.25)"; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "#c8742a"; ctx.fillRect(x, y + h * (1 - pr / C.passive.cap), w, h * pr / C.passive.cap);
      }
      ctx.restore();
    },
  };

  R.CHARACTERS[C.id] = C;
})();
