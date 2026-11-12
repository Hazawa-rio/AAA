/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/characters/vivilla.js": "20261113040753" });
// 角色：薇薇拉（輔助，第一個使用魔力的角色）
// 技能格式同 firsler.js：status / predict / use；status 可以回傳 mp（魔力消耗，由 battle 扣）
// 蘑菇丟出去之後要過一下才爆炸（飛行＋引信），所以爆炸是非同步結算
(function () {
  const R = window.RPG;
  R.CHARACTERS = R.CHARACTERS || {};
  const err = (m) => { throw new R.ActionError(m); };
  const upg = (u) => u.upg || {};
  const traps = (b) => b.zones.filter((z) => z.type === "trap");
  const giantOf = (b) => b.allies().find((a) => a.kind === "giantShroom") || null;
  const healAmt = (u, base) => Math.round(base * (1 + u.atk / 100));
  const alive = (b) => !b.dead && b.phase !== "over";

  // 巨大蘑菇（召喚物）
  const GIANT = { name: "巨大蘑菇", hp: 1, atk: 0, df: 0, spd: 0, ap: 0, r: 30 };

  const C = {
    id: "vivilla",
    name: "薇薇拉",
    color: "#3d9a5b",
    role: "輔助・使用魔力",
    profile: "居住一處神奇世界的少女，與蘑菇作伴，有些慵懶怕事，不太擅長人際互動，被意外捲入時空亂流後在尋找回家的方法。",
    desc: "使用魔力的輔助角色。投擲會延遲爆炸的蘑菇：炸到敵人會降低防禦，炸到自己人可以回血；還能種下蘑菇陷阱、長出吸引火力的巨大蘑菇。",
    // 戰鬥風格：酒館名牌架上顯示
    style: { role: "輔助・蘑菇（魔力）", text: "站在後排丟蘑菇的輔助。蘑菇會延遲爆炸：炸到敵人降低防禦，炸到自己人回血；再用蘑菇陷阱封住路線、讓巨大蘑菇吸引火力。靠預判敵人的位置取勝。" },
    stats: { hp: 70, mp: 100, atk: 14, df: 4, spd: 11, ap: 6 },     // 暫定
    growth: { hp: 3.2, mp: 3, atk: 0.75, df: 0.3, spd: 0.1 },       // 每升一級（暫定）
    mpRegen: 0.35,                     // 每次輪到自己時回復最大魔力的 35%

    // 被動：血量低於 45% 的目標，治療效果翻倍
    passive: {
      name: "加急治療",
      desc: "對生命低於 45% 的目標，治療效果翻倍",
      threshold: 0.45,
      status(b, u) { return { text: "低血量治療 ×2", on: false }; },
    },

    // 個性台詞（不會每次都跳）
    barks: {
      healOther: { chance: 0.6, lines: ["這可是我親手種的。"] },
      hurt: { chance: 0.25, lines: ["別過來啊...", "我不想玩了..."] },
      run: { chance: 0.5, lines: ["我要回家，和我的蘑菇待在一起..."] },
      dose: { chance: 0.5, lines: ["這個再加上這個..."] },
      ult: { chance: 0.75, lines: ["求求你們趕緊睡著吧..."] },
    },
    // 地圖探索：普攻距離、Q（以秒冷卻）
    field: {
      basicRange: 280,
      q: { name: "拋出蘑菇", type: "heal", sound: "sounds/vivilla-throw.mp3", cd: 45, range: 280, heal: 0.15, self: "我開動了", other: "這個給你...", desc: "拋出蘑菇，少量治療隊友（目前只有自己）" },
    },
    basic: "toss",
    ultimate: "bloom",
    hud: { left: "run", center: "bloom", right: "dose" },

    // ===== 技能強化樹 =====
    upgrades: {
      q: {
        skill: "run",
        tiers: [
          [
            { id: "farm", name: "菇菇農場", desc: "普攻的蘑菇丟到種下的蘑菇上會形成菇菇農場：爆炸範圍變大（×1.6），而且爆炸時會幫範圍內的我方回血" },
            { id: "daze", name: "迷幻菇菇", desc: "菇菇快跑的蘑菇爆炸時，被炸到的敵人下一次輪到時行動點 −1" },
          ],
          [
            { id: "mine", name: "菇菇地雷", desc: "種下的蘑菇感應範圍 ×1.5、爆炸範圍 ×1.3" },
            { id: "sprint", name: "全速奔跑", desc: "菇菇快跑的位移距離 ×2，而且下一個行動的速度 ×1.3" },
          ],
        ],
      },
      e: {
        skill: "dose",
        tiers: [
          [
            { id: "hormone", name: "生長激素", desc: "加大劑量改成：下一次普攻一次拋出三顆蘑菇（每顆都是一般威力）" },
            { id: "concentrate", name: "濃縮劑量", desc: "加大劑量的倍率從 ×1.8 提高到 ×2.5" },
          ],
          [
            { id: "extend", name: "藥效延長", desc: "加大劑量的效果持續兩次普攻" },
            { id: "reflux", name: "魔力回流", desc: "被加大劑量強化的普攻炸到敵人時，回復 15 點魔力" },
          ],
        ],
      },
      w: {
        skill: "bloom",
        tiers: [
          [
            { id: "splash", name: "胞子潑灑", desc: "巨大蘑菇被攻擊時，會主動朝周圍噴出胞子" },
            { id: "thrive", name: "欣欣向榮", desc: "普攻的蘑菇可以幫巨大蘑菇補血（補血量 ×2）" },
          ],
        ],
      },
    },

    tune: [
      ["每回合回復魔力（比例）", "char", "mpRegen", 0, 1, 0.05],
      ["加急治療 生命門檻", "passive", "threshold", 0, 1, 0.05],
      ["投擲 距離", "toss", "range", 100, 500, 10],
      ["投擲 爆炸半徑", "toss", "radius", 30, 160, 5],
      ["投擲 引信（秒）", "toss", "fuse", 0.2, 3, 0.1],
      ["投擲 基礎傷害", "toss", "base", 1, 40, 1],
      ["投擲 補血量", "toss", "heal", 0, 40, 1],
      ["投擲 破防倍率（越小越破）", "toss", "defDownMult", 0.1, 1, 0.05],
      ["菇菇快跑 魔力", "run", "mp", 0, 60, 1],
      ["菇菇快跑 位移距離", "run", "dash", 0, 300, 10],
      ["菇菇快跑 爆炸傷害", "run", "base", 1, 40, 1],
      ["菇菇快跑 減速倍率", "run", "slowMult", 0.1, 1, 0.05],
      ["加大劑量 魔力", "dose", "mp", 0, 60, 1],
      ["加大劑量 倍率", "dose", "mult", 1, 4, 0.1],
      ["菇菇快長 魔力", "bloom", "mp", 0, 100, 1],
      ["巨大蘑菇 生命（自身生命比例）", "bloom", "hpRatio", 0.1, 2, 0.05],
      ["巨大蘑菇 胞子半徑", "bloom", "sporeRadius", 50, 300, 10],
      ["巨大蘑菇 胞子傷害", "bloom", "sporeBase", 1, 30, 1],
      ["巨大蘑菇 持續（回合）", "bloom", "turns", 1, 8, 1],
    ],

    // 薇薇拉的治療：套用被動「加急治療」；治療別人時可能說台詞
    healTo(b, u, target, amount, note) {
      if (!target.alive || target.hp >= target.maxHp) return 0;
      if (target.hp < target.maxHp * this.passive.threshold) { amount *= 2; note += "（加急治療 ×2）"; }
      const n = b.heal(target, amount, note);
      if (n > 0 && target !== u) b.bark(u, "healOther");
      return n;
    },

    init(b, u) {
      u.charge = 0;
      u.state.dose = 0;          // 加大劑量剩幾次
    },

    // 每次行動後：全速奔跑的加速只維持一個行動
    onAction(b, u) {
      if (u.state.sprintNext) {
        u.state.sprintNext = false;
        u.state.speedBoost = this.skills.run.sprintMult;
        b.emit({ type: "buff", unit: u, text: "全速奔跑：速度提升" });
      } else if (u.state.speedBoost) u.state.speedBoost = 0;
    },

    // 任何單位的回合開始：自己回合時巨大蘑菇倒數；敵人回合開始時被胞子打到；陷阱檢查
    onTurnStart(b, unit) {
      const g = giantOf(b);
      if (unit === b.player && g) {
        g.turnsLeft--;
        if (g.turnsLeft <= 0) { b.say("巨大蘑菇枯萎了"); g.hp = 0; b.onDeath(g); }
      }
      if (unit.team === "enemy" && !unit.demon && !unit.cage && g) {
        const B = this.skills.bloom;
        if (R.dist(unit.x, unit.y, g.x, g.y) <= B.sporeRadius + unit.r) this.spore(b, g, [unit]);
      }
      this.checkTraps(b);
    },
    onEnemyAction(b) { this.checkTraps(b); },

    // 巨大蘑菇被打
    onSummonHurt(b, g) {
      if (upg(b.player).w1 === "splash" && g.alive) {
        const B = this.skills.bloom;
        const list = b.enemies().filter((e) => R.dist(e.x, e.y, g.x, g.y) <= B.sporeRadius + e.r);
        b.say("巨大蘑菇被攻擊，噴出胞子！");
        this.spore(b, g, list, true);
      }
    },
    onSummonDeath(b, g) { b.emit({ type: "sfx", sound: this.skills.toss.sounds.boom }); },

    // 胞子：持續傷害＋麻痺（減速）
    spore(b, g, list, burst) {
      const B = this.skills.bloom, u = b.player;
      b.emit({ type: "spore", x: g.x, y: g.y, radius: B.sporeRadius, sound: B.sounds.spore, targets: list });
      for (const e of list) {
        if (!e.alive) continue;
        b.damage(u, e, B.sporeBase, 1, burst ? "（胞子潑灑）" : "（胞子）");
        if (e.alive) this.slow(b, e, B.slowMult);
      }
    },
    slow(b, e, mult) {
      const who = e.parent || e;
      who.state.slowUntil = b.round + 1;
      who.state.slowMult = Math.min(who.state.slowUntil >= b.round && who.state.slowMult ? who.state.slowMult : 1, mult);
      b.emit({ type: "buff", unit: e, text: "麻痺：減速" });
    },

    // 陷阱：範圍內有敵人就爆炸
    checkTraps(b) {
      if (!alive(b)) return;
      for (const z of traps(b)) {
        if (z.fired) continue;
        const near = b.enemies().find((e) => R.dist(e.x, e.y, z.x, z.y) <= z.r + e.r);
        if (near) this.trapBoom(b, z);
      }
    },
    trapBoom(b, z) {
      const u = b.player, S = this.skills.run, up = upg(u);
      z.fired = true;
      b.zones = b.zones.filter((x) => x !== z);
      const radius = z.blast * (z.farm ? S.farmMult : 1);
      b.say(z.farm ? "菇菇農場爆炸了！" : "種下的蘑菇爆炸了！");
      b.emit({ type: "shroomBoom", x: z.x, y: z.y, radius, sound: this.skills.toss.sounds.boom, farm: z.farm });
      for (const e of b.enemies()) {
        if (R.dist(e.x, e.y, z.x, z.y) > radius + e.r) continue;
        b.damage(u, e, S.base, 1, "（菇菇快跑）");
        if (!e.alive) continue;
        this.slow(b, e, S.slowMult);
        if (up.q1 === "daze") {
          const who = e.parent || e;
          who.state.apPenalty = (who.state.apPenalty || 0) + 1;
          b.emit({ type: "buff", unit: e, text: "迷幻：下回合 −1 ★" });
        }
      }
      // 菇菇農場：爆炸時幫我方回血
      if (z.farm) for (const a of [u, ...b.allies()]) if (R.dist(a.x, a.y, z.x, z.y) <= radius + a.r) C.healTo(b, u, a, healAmt(u, S.farmHeal), "（菇菇農場）");
      b.checkEnd();
    },

    skills: {
      // ---------- 普攻 投擲蘑菇 ----------
      toss: {
        name: "投擲蘑菇", slot: "普攻", key: "a",
        aimAlly: true,                     // 點自己或巨大蘑菇：直接丟過去補血
        tags: ["projectile", "area"],
        ap: 1, range: 280, radius: 70, base: 9, heal: 8,
        flight: 0.35, fuse: 0.8,           // 飛行時間＋落地後的引信（秒）
        defDownMult: 0.7,                  // 炸到的敵人防禦 ×0.7（到下一回合結束）
        projectileSpeed: 450,
        hormoneSpread: 70,                 // 生長激素：三顆蘑菇彼此的距離
        sounds: { throw: "sounds/vivilla-throw.mp3", boom: "sounds/vivilla-boom.mp3" },
        desc: "投出蘑菇，落地後過一下才爆炸。炸到敵人造成較低的傷害並降低防禦；炸到自己（或我方）會回血。按 A 可以丟到地面上，點敵人直接丟向敵人",
        status(b, u) {
          const n = u.state.dose || 0;
          const note = n ? (upg(u).e1 === "hormone" ? "三顆" : `×${this.doseMult(u)}`) : "";
          return { ready: true, cost: this.ap, label: this.name, note, aim: { type: "point", range: this.range, preview: "toss" } };
        },
        doseMult(u) { return upg(u).e1 === "concentrate" ? C.skills.dose.multHigh : C.skills.dose.mult; },
        point(b, u, arg) {
          const t = arg.target ? { x: arg.target.x, y: arg.target.y } : arg;
          if (!t || !Number.isFinite(t.x)) err("請點選地面或敵人");
          if (R.dist(u.x, u.y, t.x, t.y) > this.range + (arg.target ? arg.target.r : 0) + 0.5) err("距離太遠");
          return { x: t.x, y: t.y };
        },
        // 這一次會丟出哪些蘑菇
        drops(b, u, arg) {
          const p = this.point(b, u, arg);
          if (u.state.dose && upg(u).e1 === "hormone") {
            const a = Math.atan2(p.y - u.y, p.x - u.x), s = this.hormoneSpread;
            return [p, { x: p.x + Math.cos(a + 2.1) * s, y: p.y + Math.sin(a + 2.1) * s }, { x: p.x + Math.cos(a - 2.1) * s, y: p.y + Math.sin(a - 2.1) * s }];
          }
          return [p];
        },
        predict(b, u, arg) {
          const ps = this.drops(b, u, arg);
          return b.enemies().filter((e) => ps.some((p) => R.dist(e.x, e.y, p.x, p.y) <= this.radius + e.r));
        },
        origins(b, u) { return [{ x: u.x, y: u.y }]; },
        areaCenter(b, u, arg) { return this.point(b, u, arg); },
        use(b, u, arg) {
          const ps = this.drops(b, u, arg), up = upg(u);
          let mult = 1;
          const dosed = (u.state.dose || 0) > 0;
          if (dosed) {
            if (up.e1 !== "hormone") mult = this.doseMult(u);
            u.state.dose--;
          }
          u.facing = Math.atan2(ps[0].y - u.y, ps[0].x - u.x);
          b.say(`${u.name} 丟出${ps.length > 1 ? "三顆" : ""}蘑菇${mult > 1 ? `（加大劑量 ×${mult}）` : ""}`);
          b.emit({ type: "sfx", sound: this.sounds.throw });
          for (const p of ps) b.emit({ type: "shroomThrow", from: { x: u.x, y: u.y }, to: p, flight: this.flight, fuse: this.fuse, radius: this.radius });
          // 菇菇農場：丟在種下的蘑菇上
          if (up.q1 === "farm") for (const z of traps(b)) {
            if (!z.farm && ps.some((p) => R.dist(p.x, p.y, z.x, z.y) <= z.r + 10)) {
              z.farm = true;
              b.say("種下的蘑菇變成了菇菇農場！");
              b.emit({ type: "buff", unit: { x: z.x, y: z.y, r: 10 }, text: "菇菇農場" });
            }
          }
          this.explodeLater(b, u, ps, mult, dosed && up.e2 === "reflux");
        },
        async explodeLater(b, u, ps, mult, reflux) {
          await b.wait(this.flight + this.fuse);
          if (!alive(b)) return;
          let hitEnemy = false;
          for (const p of ps) {
            b.emit({ type: "shroomBoom", x: p.x, y: p.y, radius: this.radius, sound: this.sounds.boom });
            for (const e of b.targetsFor(u)) {
              if (!e.alive || R.dist(e.x, e.y, p.x, p.y) > this.radius + e.r) continue;
              b.damage(u, e, this.base, mult, mult > 1 ? `（加大劑量 ×${mult}）` : "");
              hitEnemy = hitEnemy || !e.demon;
              if (e.alive && !e.cage && !e.npc) {
                e.state.defDownUntil = b.round + 1;
                e.state.defDownMult = this.defDownMult;
                b.emit({ type: "buff", unit: e, text: "破防" });
              }
            }
            // 炸到我方：回血（巨大蘑菇要有「欣欣向榮」）
            if (u.alive && R.dist(u.x, u.y, p.x, p.y) <= this.radius + u.r) C.healTo(b, u, u, healAmt(u, this.heal * mult), "（蘑菇）");
            const g = giantOf(b);
            if (g && upg(u).w1 === "thrive" && R.dist(g.x, g.y, p.x, p.y) <= this.radius + g.r) C.healTo(b, u, g, healAmt(u, this.heal * mult * 2), "（欣欣向榮）");
          }
          if (reflux && hitEnemy) {
            const n = Math.min(u.maxMp - u.mp, C.skills.dose.refluxMp);
            if (n > 0) { u.mp += n; b.say(`魔力回流：回復 ${n} 點魔力`); b.emit({ type: "mpRegen", unit: u, amount: n }); }
          }
          C.checkTraps(b);
          b.checkEnd();
          b.emit();
        },
      },

      // ---------- Q 菇菇快跑 ----------
      run: {
        name: "菇菇快跑", slot: "Q", key: "q",
        tags: ["projectile", "area"],
        ap: 1, mp: 15, cooldown: 2, range: 220, dash: 90,
        trigger: 50, blast: 90, base: 12, slowMult: 0.6, maxTraps: 3, turns: 4,
        farmMult: 1.6, farmHeal: 10, mineTrigger: 1.5, mineBlast: 1.3, sprintMult: 1.3,
        desc: "朝前方丟出一顆蘑菇種在地上，自己往反方向退一小段。範圍內有敵人時蘑菇立刻爆炸，讓敵人麻痺（減速）",
        status(b, u) {
          const cd = u.cd.run || 0;
          if (cd > 0) return { ready: false, cost: this.ap, mp: this.mp, label: this.name, note: `CD ${cd}`, reason: `冷卻中（還要 ${cd} 次行動）` };
          if (u.mp < this.mp) return { ready: false, cost: this.ap, mp: this.mp, label: this.name, note: `${this.mp} MP`, reason: "魔力不足" };
          return { ready: true, cost: this.ap, mp: this.mp, label: this.name, note: `${this.mp} MP`, aim: { type: "point", range: this.range, preview: "run" } };
        },
        sizes(u) {
          const mine = upg(u).q2 === "mine";
          return { trigger: this.trigger * (mine ? this.mineTrigger : 1), blast: this.blast * (mine ? this.mineBlast : 1) };
        },
        dashTo(b, u, p) {
          const d = R.dist(u.x, u.y, p.x, p.y) || 1, ux = (u.x - p.x) / d, uy = (u.y - p.y) / d;
          const A = b.cfg.arena, cage = b.cageOf?.(u);
          let len = this.dash * (upg(u).q2 === "sprint" ? 2 : 1);
          const at = (s) => ({ x: Math.min(Math.max(u.x + ux * s, u.r), A.w - u.r), y: Math.min(Math.max(u.y + uy * s, u.r), A.h - u.r) });
          while (len > 0) {
            const q = at(len);
            if (!b.blocked(u, q.x, q.y) && (!cage || b.inCage(cage, q.x, q.y, b.cfg.body * 0.6))) return q;
            len -= 5;
          }
          return { x: u.x, y: u.y };
        },
        predict(b, u, arg) {
          const s = this.sizes(u);
          return b.enemies().filter((e) => R.dist(e.x, e.y, arg.x, arg.y) <= s.trigger + e.r);
        },
        areaCenter(b, u, arg) { return { x: arg.x, y: arg.y }; },
        use(b, u, arg) {
          if (!Number.isFinite(arg.x)) err("請點選地面");
          const s = this.sizes(u);
          b.setCooldown(u, "run", this.cooldown);
          const from = { x: u.x, y: u.y }, to = this.dashTo(b, u, arg);
          b.say(`${u.name} 使用「菇菇快跑」，種下一顆蘑菇往後跑`);
          b.bark(u, "run");
          b.emit({ type: "sfx", sound: C.skills.toss.sounds.throw });
          b.emit({ type: "shroomThrow", from, to: { x: arg.x, y: arg.y }, flight: 0.3, plant: true });
          u.facing = Math.atan2(arg.y - u.y, arg.x - u.x);
          if (to.x !== u.x || to.y !== u.y) {
            u.x = to.x; u.y = to.y;
            b.emit({ type: "leap", unit: u, from, to, duration: 0.2 });
          }
          if (upg(u).q2 === "sprint") u.state.sprintNext = true;
          // 種下陷阱（太多就移除最舊的）
          const list = traps(b);
          if (list.length >= this.maxTraps) b.zones = b.zones.filter((z) => z !== list[0]);
          b.zones.push({ id: "trap" + Math.random().toString(36).slice(2, 7), type: "trap", owner: u, x: arg.x, y: arg.y, r: s.trigger, blast: s.blast, turnsLeft: this.turns, farm: false });
          C.checkTraps(b);                  // 範圍內已經有敵人：立刻爆炸
        },
      },

      // ---------- E 加大劑量 ----------
      dose: {
        name: "加大劑量", slot: "E", key: "e",
        tags: ["buff"],
        ap: 1, mp: 20, cooldown: 3, mult: 1.8, multHigh: 2.5, refluxMp: 15,
        desc: "強化下一次普攻：傷害與補血量 ×1.8",
        status(b, u) {
          const cd = u.cd.dose || 0;
          if (cd > 0) return { ready: false, cost: this.ap, mp: this.mp, label: this.name, note: `CD ${cd}`, reason: `冷卻中（還要 ${cd} 次行動）` };
          if (u.state.dose) return { ready: false, cost: this.ap, mp: this.mp, label: this.name, note: "生效中", reason: "下一次普攻已經強化了" };
          if (u.mp < this.mp) return { ready: false, cost: this.ap, mp: this.mp, label: this.name, note: `${this.mp} MP`, reason: "魔力不足" };
          return { ready: true, cost: this.ap, mp: this.mp, label: this.name, note: `${this.mp} MP`, aim: { type: "none" } };
        },
        use(b, u) {
          const up = upg(u);
          b.setCooldown(u, "dose", this.cooldown);
          u.state.dose = up.e2 === "extend" ? 2 : 1;
          const what = up.e1 === "hormone" ? "下一次普攻丟出三顆蘑菇" : `下一次普攻 ×${up.e1 === "concentrate" ? this.multHigh : this.mult}`;
          b.say(`${u.name} 加大劑量：${what}${u.state.dose > 1 ? "（兩次）" : ""}`);
          b.bark(u, "dose");
          b.emit({ type: "buff", unit: u, text: "加大劑量" });
        },
      },

      // ---------- W 菇菇快長 ----------
      bloom: {
        name: "菇菇快長", slot: "W", key: "w", ultimate: true,
        tags: ["summon", "area"],
        ap: 2, mp: 40, charge: 6, range: 300,
        hpRatio: 0.6,                      // 巨大蘑菇生命 = 薇薇拉最大生命 × 0.6
        sporeRadius: 140, sporeBase: 7, slowMult: 0.6, turns: 3,
        sounds: { spore: "sounds/vivilla-spore.mp3" },
        desc: "在指定位置長出巨大蘑菇（召喚物）。敵人在周圍開始回合時會被胞子打到並麻痺；會吸引低智力敵人的火力，血量不高會被破壞",
        status(b, u) {
          if (u.charge < this.charge) return { ready: false, cost: this.ap, mp: this.mp, label: this.name, note: `${u.charge}/${this.charge}`, reason: `還要 ${this.charge - u.charge} 次行動才能使用` };
          if (u.mp < this.mp) return { ready: false, cost: this.ap, mp: this.mp, label: this.name, note: `${this.mp} MP`, reason: "魔力不足" };
          return { ready: true, cost: this.ap, mp: this.mp, label: this.name, note: `${this.mp} MP`, aim: { type: "point", range: this.range, preview: "bloom" } };
        },
        predict(b, u, arg) { return b.enemies().filter((e) => R.dist(e.x, e.y, arg.x, arg.y) <= this.sporeRadius + e.r); },
        areaCenter(b, u, arg) { return { x: arg.x, y: arg.y }; },
        use(b, u, arg) {
          if (!Number.isFinite(arg.x)) err("請點選地面");
          const probe = { r: GIANT.r };
          if (b.blocked(probe, arg.x, arg.y)) err("那裡有其他單位，蘑菇長不出來");
          const old = giantOf(b);
          if (old) { b.units = b.units.filter((x) => x !== old); b.emit({ type: "summonDeath", unit: old, quiet: true }); }
          u.charge = 0;
          const g = b.spawnSpecial("player", "giantShroom", GIANT, arg.x, arg.y, { summon: true, decoy: true, owner: u });
          g.maxHp = g.hp = Math.max(10, Math.round(u.maxHp * this.hpRatio));
          g.df = u.df; g.atk = u.atk;
          g.turnsLeft = this.turns;
          b.say(`${u.name} 使用「菇菇快長」！長出了巨大蘑菇（生命 ${g.hp}）`);
          b.bark(u, "ult");
          b.emit({ type: "summon", unit: g });
          // 長出來的瞬間先噴一次胞子
          C.spore(b, g, b.enemies().filter((e) => R.dist(e.x, e.y, g.x, g.y) <= this.sporeRadius + e.r));
        },
      },
    },
  };

  R.CHARACTERS[C.id] = C;
})();
