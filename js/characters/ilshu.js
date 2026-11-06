// 角色：伊爾舒
// 被動「直面心魔」：場上會有一隻只有伊爾舒打得到的心魔（1 血、不會自己動）。
// 打倒心魔獲得一層陰霾（最多 10 層），然後在地圖上隨機的位置再出現一隻。
// 數值都是暫定，可以在戰鬥頁的數值面板調整。
(function () {
  const R = window.RPG;
  R.CHARACTERS = R.CHARACTERS || {};
  const err = (m) => { throw new R.ActionError(m); };
  const demonOf = (b, u) => b.demons().find((d) => d.owner === u) || null;
  const gloomMult = (u, per) => 1 + (u.state.gloom || 0) * per;
  // 扇形範圍內的目標（從 u 朝 ang）
  const inSector = (b, u, ang, radius, half) =>
    b.targetsFor(u).filter((e) => R.geo.inSector(e.x, e.y, { x: u.x, y: u.y, ang, radius, half }, e.r));

  const DEMON = { name: "心魔", hp: 1, atk: 0, df: 0, spd: 0, ap: 0, r: 18 };

  function spawnDemon(b, u) {
    const spot = b.randomFreeSpot(DEMON.r, 40);
    if (!spot) return null;
    const d = b.spawnSpecial("enemy", "demon", DEMON, spot.x, spot.y, { demon: true, owner: u });
    b.emit({ type: "demonSpawn", unit: d });
    return d;
  }

  const C = {
    id: "ilshu",
    name: "伊爾舒",
    color: "#4b3f8f",
    desc: "與心魔共存的劍士。擊破心魔累積陰霾強化劍技，也能把心魔拉過來撞擊敵人，或直接引爆。",
    stats: { hp: 100, atk: 18, df: 7, spd: 9, ap: 6 },          // 暫定
    basic: "thrust",
    ultimate: "ult",
    hud: { left: "trial", center: "ult", right: "karma" },

    passive: {
      name: "直面心魔",
      desc: "場上會出現一隻 1 血、不會移動、只有伊爾舒能攻擊的心魔。擊殺心魔獲得一層陰霾（最多 10 層），並在地圖上隨機再出現一隻",
      maxGloom: 10,
      sound: "sounds/ilshu-demon.mp3",              // 心魔被擊殺、被引爆
      status(b, u) { return { text: `陰霾 ${u.state.gloom} / ${this.maxGloom}`, on: u.state.gloom > 0, gloom: u.state.gloom }; },
      onDemonDeath(b, u, demon) {
        b.emit({ type: "sfx", sound: this.sound });
        if (!demon.noGloom) {
          if (u.state.gloom < this.maxGloom) u.state.gloom++;
          b.say(`心魔被擊破，${u.name} 獲得一層陰霾（${u.state.gloom} / ${this.maxGloom}）`);
          b.emit({ type: "gloom", unit: u, gloom: u.state.gloom });
        }
        spawnDemon(b, u);
        b.say("新的心魔出現了");
      },
    },

    init(b, u) {
      u.state.gloom = 0;
      u.charge = 0;
      spawnDemon(b, u);
    },

    tune: [
      ["陰霾 上限", "passive", "maxGloom", 1, 20, 1],
      ["突刺 基礎傷害", "thrust", "base", 1, 40, 1],
      ["突刺 距離", "thrust", "range", 60, 300, 10],
      ["突刺 每層陰霾增傷", "thrust", "gloomBonus", 0, 0.3, 0.01],
      ["試煉 拉動距離", "trial", "pull", 50, 500, 10],
      ["試煉 撞擊傷害", "trial", "base", 1, 40, 1],
      ["試煉 冷卻（次行動）", "trial", "cooldown", 0, 8, 1],
      ["業障 爆炸半徑", "karma", "radius", 40, 250, 5],
      ["業障 基礎傷害", "karma", "base", 1, 50, 1],
      ["業障 冷卻（次行動）", "karma", "cooldown", 0, 8, 1],
      ["大招 半徑", "ult", "radius", 80, 320, 10],
      ["大招 扇形半角（°）", "ult", "halfDeg", 15, 90, 5],
      ["大招 第二斬每層陰霾增傷", "ult", "gloomBonus", 0, 0.4, 0.01],
      ["大招 充能（次行動）", "ult", "charge", 1, 12, 1],
      ["大招 第三斬基礎傷害", "ult", "thirdBase", 1, 60, 1],
    ],

    skills: {
      // ---------- 普攻 長劍突刺 ----------
      thrust: {
        name: "長劍突刺", slot: "普攻", sound: "sounds/ilshu-thrust.mp3",
        ap: 1, base: 12, range: 150, halfDeg: 9, gloomBonus: 0.08,
        desc: "指向敵人，朝那個方向刺出細長的扇形，範圍內都會被打到。每層陰霾 +8% 傷害",
        status(b, u) {
          return { ready: true, cost: this.ap, label: this.name,
            aim: { type: "enemy", range: this.range, sector: { radius: this.range, half: (this.halfDeg * Math.PI) / 180 } } };
        },
        hits(b, u, ang) { return inSector(b, u, ang, this.range, (this.halfDeg * Math.PI) / 180); },
        predict(b, u, arg) {
          const t = arg.target;
          if (!t || !t.alive || t.team === u.team) err("請點選一個敵人");
          if (!b.targetsFor(u).includes(t)) err("打不到這個目標");
          if (b.reach(u, t) > this.range) err("距離太遠");
          return this.hits(b, u, Math.atan2(t.y - u.y, t.x - u.x));
        },
        use(b, u, arg, st) {
          // 方向在出手瞬間決定；敵人如果閃開，就照新位置判定
          const t = arg.target, ang = Math.atan2(t.y - u.y, t.x - u.x);
          u.facing = ang;
          const hits = this.hits(b, u, ang);
          b.say(`${u.name} 使用「長劍突刺」`);
          b.emit({ type: "sfx", sound: this.sound });
          b.emit({ type: "slash", unit: u, ang, radius: this.range, half: (this.halfDeg * Math.PI) / 180, style: "thrust" });
          if (!hits.length) { b.say("……刺空了"); b.emit({ type: "miss", x: t.x, y: t.y }); }
          const m = gloomMult(u, this.gloomBonus);
          for (const e of hits) if (e.alive) b.damage(u, e, this.base, m, u.state.gloom ? `（陰霾 ×${m.toFixed(2)}）` : "");
        },
      },

      // ---------- Q 試煉 ----------
      trial: {
        name: "試煉", slot: "Q", key: "q",
        ap: 1, pull: 220, base: 12, cooldown: 2, projectileSpeed: 600,
        desc: "讓心魔朝自己飛過來一段距離，路上撞到的敵人受到傷害",
        status(b, u) {
          const cd = u.cd.trial || 0;
          if (cd > 0) return { ready: false, cost: this.ap, label: this.name, note: `CD ${cd}`, reason: `冷卻中（還要 ${cd} 次行動）` };
          if (!demonOf(b, u)) return { ready: false, cost: this.ap, label: this.name, note: "沒有心魔", reason: "場上沒有心魔" };
          return { ready: true, cost: this.ap, label: this.name, aim: { type: "none" } };
        },
        // 心魔的路線：朝伊爾舒直線移動，停在她面前或拉動距離用完
        path(b, u) {
          const d = demonOf(b, u);
          if (!d) err("場上沒有心魔");
          const L = R.dist(d.x, d.y, u.x, u.y), ux = (u.x - d.x) / L, uy = (u.y - d.y) / L;
          let len = Math.max(0, Math.min(this.pull, L - (u.r + d.r + 4)));
          // 終點不能卡在別的單位裡：往回退到空位
          const free = (s) => !b.units.some((o) => o !== d && o !== u && o.alive && R.dist(o.x, o.y, d.x + ux * s, d.y + uy * s) < o.r + d.r);
          while (len > 0 && !free(len)) len -= 4;
          const to = { x: d.x + ux * len, y: d.y + uy * len };
          const hits = b.enemies().filter((e) => R.geo.pointSeg(e.x, e.y, d.x, d.y, to.x, to.y) <= e.r + d.r);
          return { d, from: { x: d.x, y: d.y }, to, hits };
        },
        predict(b, u) { return this.path(b, u).hits; },
        origins(b, u) { const d = demonOf(b, u); return d ? [{ x: d.x, y: d.y }] : []; },
        use(b, u) {
          const { d, from, to, hits } = this.path(b, u);
          d.x = to.x; d.y = to.y;
          b.setCooldown(u, "trial", this.cooldown);
          b.say(`${u.name} 使用「試煉」，心魔朝她逼近`);
          b.emit({ type: "demonPull", unit: d, from, to, speed: this.projectileSpeed });
          for (const e of hits) if (e.alive) b.damage(u, e, this.base, 1, "（被心魔撞上）");
        },
      },

      // ---------- E 業障 ----------
      karma: {
        name: "業障", slot: "E", key: "e",
        ap: 1, radius: 110, base: 20, cooldown: 3,
        desc: "引爆目前的心魔，對周圍的敵人造成傷害。這樣消滅的心魔不會給陰霾",
        status(b, u) {
          const cd = u.cd.karma || 0;
          if (cd > 0) return { ready: false, cost: this.ap, label: this.name, note: `CD ${cd}`, reason: `冷卻中（還要 ${cd} 次行動）` };
          if (!demonOf(b, u)) return { ready: false, cost: this.ap, label: this.name, note: "沒有心魔", reason: "場上沒有心魔" };
          return { ready: true, cost: this.ap, label: this.name, aim: { type: "none" } };
        },
        hits(b, u, d) { return b.enemies().filter((e) => R.dist(e.x, e.y, d.x, d.y) <= this.radius + e.r); },
        predict(b, u) { const d = demonOf(b, u); return d ? this.hits(b, u, d) : []; },
        origins(b, u) { const d = demonOf(b, u); return d ? [{ x: d.x, y: d.y }] : []; },
        use(b, u) {
          const d = demonOf(b, u);
          if (!d) err("場上沒有心魔");
          const hits = this.hits(b, u, d);
          b.setCooldown(u, "karma", this.cooldown);
          b.say(`${u.name} 引爆了心魔「業障」！`);
          b.emit({ type: "explode", x: d.x, y: d.y, radius: this.radius, color: "#5b3fa8" });
          for (const e of hits) if (e.alive) b.damage(u, e, this.base);
          d.noGloom = true;
          d.hp = 0;
          b.onDeath(d);
        },
      },

      // ---------- W 大招 走出陰影 ----------
      ult: {
        name: "走出陰影", slot: "W", key: "w", ultimate: true,
        ap: 2, charge: 6, radius: 170, halfDeg: 50, base: 18, gloomBonus: 0.15,
        thirdBase: 24,                     // 陰霾滿層時的第三斬（暫定）
        sounds: { slash: "sounds/ilshu-slash.mp3", strong: "sounds/ilshu-slash-strong.mp3" },
        desc: "朝指定方向揮出寬扇形的二連斬，第二斬每層陰霾 +15% 傷害。陰霾滿層時消耗所有陰霾，額外打出強力的第三斬",
        status(b, u) {
          if (u.charge < this.charge) return { ready: false, cost: this.ap, label: this.name, note: `${u.charge}/${this.charge}`, reason: `還要 ${this.charge - u.charge} 次行動才能使用` };
          return { ready: true, cost: this.ap, label: this.name,
            aim: { type: "direction", range: this.radius, sector: { radius: this.radius, half: (this.halfDeg * Math.PI) / 180 } } };
        },
        hits(b, u, ang) { return inSector(b, u, ang, this.radius, (this.halfDeg * Math.PI) / 180); },
        predict(b, u, arg) {
          if (!(R.dist(u.x, u.y, arg.x, arg.y) > 1)) err("請點選方向");
          return this.hits(b, u, Math.atan2(arg.y - u.y, arg.x - u.x));
        },
        use(b, u, arg) {
          const ang = Math.atan2(arg.y - u.y, arg.x - u.x), half = (this.halfDeg * Math.PI) / 180;
          u.facing = ang;
          u.charge = 0;
          b.say(`${u.name} 發動「走出陰影」！`);
          const before = new Set(b.targetsFor(u));     // 第一斬後新出現的心魔不算在第二斬裡
          // 第一斬
          b.emit({ type: "slash", unit: u, ang, radius: this.radius, half, style: "wide", n: 0 });
          b.emit({ type: "sfx", sound: this.sounds.slash });
          let hits = this.hits(b, u, ang);
          for (const e of hits) if (e.alive) b.damage(u, e, this.base, 1, "（第一斬）");
          // 第二斬：陰霾增傷（第一斬打倒心魔得到的陰霾也算）
          b.emit({ type: "slash", unit: u, ang, radius: this.radius, half, style: "wide", n: 1 });
          b.emit({ type: "sfx", sound: this.sounds.slash, delay: 0.24 });
          hits = this.hits(b, u, ang).filter((e) => before.has(e));
          const m = gloomMult(u, this.gloomBonus);
          for (const e of hits) if (e.alive) b.damage(u, e, this.base, m, `（第二斬・陰霾 ×${m.toFixed(2)}）`);
          if (!hits.length) b.say("……第二斬沒有命中");

          // 陰霾滿層：消耗所有陰霾，打出第三斬（以消耗前的層數增傷）
          const max = C.passive.maxGloom;
          if (u.state.gloom >= max) {
            const m3 = gloomMult(u, this.gloomBonus);
            b.say(`${u.name} 吞下所有陰霾，揮出第三斬！`);
            b.emit({ type: "slash", unit: u, ang, radius: this.radius * 1.15, half: half * 1.1, style: "strong", n: 2 });
            b.emit({ type: "sfx", sound: this.sounds.strong, delay: 0.52 });
            const hits3 = this.hits(b, u, ang).filter((e) => before.has(e));
            for (const e of hits3) if (e.alive) b.damage(u, e, this.thirdBase, m3, `（第三斬・陰霾 ×${m3.toFixed(2)}）`);
            if (!hits3.length) b.say("……第三斬沒有命中");
            u.state.gloom = 0;
            b.emit({ type: "gloomSpent", unit: u });
          }
        },
      },
    },
  };

  R.CHARACTERS[C.id] = C;
})();
