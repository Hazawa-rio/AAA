/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/characters/ilshu.js": "20261112144644" });
// 角色：伊爾舒
// 被動「直面心魔」：場上會有一隻只有伊爾舒打得到的心魔（1 血、不會自己動）。
// 打倒心魔獲得一層陰霾（最多 5 層），然後在地圖上隨機的位置再出現一隻。
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

  const upg = (u) => u.upg || {};
  const DEG = Math.PI / 180;
  // 從任意點（例如心魔的位置）朝 ang 的扇形範圍內的目標
  const inSectorAt = (b, u, x, y, ang, radius, half, skip) =>
    b.targetsFor(u).filter((e) => e !== skip && R.geo.inSector(e.x, e.y, { x, y, ang, radius, half }, e.r));
  const free = (b, who, ignore, x, y, r) => (b.walkOk ? b.walkOk(who, x, y) : true) &&
    !b.units.some((o) => o !== who && !ignore.includes(o) && o.alive && !o.cage && R.dist(o.x, o.y, x, y) < o.r + r);

  const C = {
    id: "ilshu",
    name: "伊爾舒",
    color: "#4b3f8f",
    profile: "看著心事重重的女劍士，某段放不下的過往是她深埋心中的心魔，精神有些不穩定，有時會喃喃自語，只有舞劍時能稍微感到平靜。",
    desc: "與心魔共存的劍士。擊破心魔累積陰霾強化劍技，也能把心魔拉過來撞擊敵人，或直接引爆。",
    // 戰鬥風格：酒館名牌架上顯示
    style: { role: "近戰・劍士", text: "與心魔共存的劍士，貼身連斬是她的本行。擊破心魔累積陰霾，陰霾越多、第三斬越重；心魔本身也是武器——拉過來撞擊敵人，或乾脆引爆。越打越兇的前線角色。" },
    stats: { hp: 100, mp: 0, atk: 18, df: 7, spd: 9, ap: 6 },          // 暫定
    growth: { hp: 4.5, mp: 2, atk: 0.9, df: 0.45, spd: 0.08 },      // 每升一級（暫定）
    // 地圖探索：普攻距離、Q（以秒冷卻）
    field: {
      basicRange: 150,
      q: { name: "疑心病", type: "sense", sound: "sounds/ilshu-demon.mp3", cd: 25, charge: 1.2, radius: 520, yes: "我感到有些不適", no: "看來是想多了", desc: "蓄力一下，感測周遭有沒有陷阱或魔物" },
    },
    basic: "thrust",
    ultimate: "ult",
    hud: { left: "trial", center: "ult", right: "karma" },

    passive: {
      name: "直面心魔",
      desc: "場上會出現一隻 1 血、不會移動、只有伊爾舒能攻擊的心魔。擊殺心魔獲得一層陰霾（最多 5 層），並在地圖上隨機再出現一隻",
      maxGloom: 5,
      sound: "sounds/ilshu-demon.mp3",              // 心魔被擊殺、被引爆
      status(b, u) { return { text: `陰霾 ${u.state.gloom} / ${this.maxGloom}`, on: u.state.gloom > 0, gloom: u.state.gloom }; },
      spawnAt(b, u, x, y) {   // 指定位置生成心魔（教學用）
        const d = b.spawnSpecial("enemy", "demon", DEMON, x, y, { demon: true, owner: u });
        b.emit({ type: "demonSpawn", unit: d });
        return d;
      },
      onDemonDeath(b, u, demon) {
        b.emit({ type: "sfx", sound: this.sound });
        if (!demon.noGloom) {
          if (u.state.gloom < this.maxGloom) u.state.gloom++;
          b.say(`心魔被擊破，${u.name} 獲得一層陰霾（${u.state.gloom} / ${this.maxGloom}）`);
          b.emit({ type: "gloom", unit: u, gloom: u.state.gloom });
          if (!demon.repaid) b.bark(u, "demonKill");
        }
        if (b.tutorial?.onDemonDeath?.(u, demon)) return;   // 教學劇本自己決定下一隻出現在哪
        spawnDemon(b, u);
        b.say("新的心魔出現了");
      },
    },

    // 個性台詞：不會每次都跳（chance 是出現機率）
    barks: {
      demonKill: { chance: 0.3, lines: ["一個又一個，最終纏上我的身上..."] },
      trial: { chance: 0.4, lines: ["糾纏著我的痛苦，永恆不變的..."] },
      heavy: { chance: 0.6, lines: ["即使沒有意義，依舊在殺死無法逃避的命運..."] },
      karma: { chance: 0.5, lines: ["業障終究由我承擔..."] },
      ult: { chance: 0.7, lines: ["某天，我會跨越這一切..."] },
      third: { chance: 0.9, lines: ["此時此刻，這份痛苦停止了一瞬"] },
      guiltThird: { chance: 0.9, lines: ["共舞吧，這份我的痛苦。"] },
    },

    // ===== 技能強化樹 =====
    upgrades: {
      q: {
        skill: "trial",
        tiers: [
          [
            { id: "reverse", name: "逆行試煉", desc: "不再把心魔拉過來，改成伊爾舒衝向心魔（最遠 320），停在心魔旁邊，路上的敵人受到撞擊傷害" },
            { id: "heavy", name: "千鈞試煉", desc: "心魔最遠飛 480，撞到第一個敵人就停下並把它擊退；飛得越遠傷害越高（每 100 距離 +40%）" },
          ],
          [
            { id: "cycle", name: "循環試煉", desc: "試煉後在起點留下殘影，下一個敵人回合開始時爆炸（範圍 80、10 基礎傷害）" },
            { id: "burden", name: "沉重試煉", desc: "被試煉撞到的敵人，下一次輪到它時行動點 −1" },
          ],
        ],
      },
      e: {
        skill: "karma",
        tiers: [
          [
            { id: "abyss", name: "深淵業障", desc: "引爆時消耗所有陰霾，每層爆炸半徑 +18、傷害 +20%" },
            { id: "repay", name: "償還", desc: "引爆的心魔也會給 1 層陰霾，但爆炸傷害 ×0.7" },
          ],
          [
            { id: "mark", name: "業障纏身", desc: "被炸到的敵人到下一回合結束前，受到伊爾舒的傷害 ×1.25" },
            { id: "penance", name: "懺悔", desc: "每炸到一個敵人回復 5 點生命" },
          ],
        ],
      },
      w: {
        skill: "ult",
        tiers: [
          [
            { id: "chain", name: "斬斷枷鎖", desc: "陰霾 3 層以上就能打出第三斬，只消耗 3 層" },
            { id: "guilt", name: "負罪前行", desc: "心魔移動到伊爾舒正對面、剛好在斬擊範圍外的位置，朝伊爾舒的方向揮出同樣的大招（黑色斬擊）。場上要有心魔" },
          ],
        ],
      },
    },

    init(b, u) {
      u.state.gloom = 0;
      u.charge = 0;
      spawnDemon(b, u);
    },

    // 循環試煉：殘影在下一個敵人回合開始時爆炸
    onTurnStart(b, unit) {
      if (unit.team !== "enemy" || unit.demon) return;
      const u = b.player, sk = this.skills.trial;
      const echoes = b.zones.filter((z) => z.type === "echo" && z.owner === u);
      if (!echoes.length) return;
      b.zones = b.zones.filter((z) => !echoes.includes(z));
      for (const z of echoes) {
        b.say("心魔的殘影爆炸了");
        b.emit({ type: "explode", x: z.x, y: z.y, radius: z.r, color: "#5b3fa8" });
        b.emit({ type: "sfx", sound: this.passive.sound });
        for (const e of b.enemies()) if (R.dist(e.x, e.y, z.x, z.y) <= z.r + e.r) b.damage(u, e, sk.echoBase, 1, "（循環試煉的殘影）");
      }
    },

    // 業障纏身：被標記的敵人受到伊爾舒的傷害提高
    outgoingMult(b, u, dst) {
      if (dst.state?.karmaMark >= b.round) return { mult: this.skills.karma.markMult, note: `（業障纏身 ×${this.skills.karma.markMult}）` };
      return null;
    },

    tune: [
      ["陰霾 上限", "passive", "maxGloom", 1, 10, 1],
      ["突刺 基礎傷害", "thrust", "base", 1, 40, 1],
      ["突刺 距離", "thrust", "range", 60, 300, 10],
      ["突刺 每層陰霾增傷", "thrust", "gloomBonus", 0, 0.3, 0.01],
      ["試煉 拉動距離", "trial", "pull", 50, 500, 10],
      ["試煉 撞擊傷害", "trial", "base", 1, 40, 1],
      ["試煉 冷卻（次行動）", "trial", "cooldown", 0, 8, 1],
      ["逆行試煉 衝刺距離", "trial", "dashMax", 100, 600, 10],
      ["千鈞試煉 飛行距離", "trial", "heavyPull", 100, 800, 10],
      ["千鈞試煉 每距離增傷", "trial", "heavyPerDist", 0, 0.01, 0.0005],
      ["千鈞試煉 擊退距離", "trial", "heavyKnock", 0, 200, 10],
      ["循環試煉 殘影範圍", "trial", "echoRadius", 30, 200, 5],
      ["循環試煉 殘影傷害", "trial", "echoBase", 1, 40, 1],
      ["業障 爆炸半徑", "karma", "radius", 40, 250, 5],
      ["業障 基礎傷害", "karma", "base", 1, 50, 1],
      ["業障 冷卻（次行動）", "karma", "cooldown", 0, 8, 1],
      ["深淵業障 每層半徑", "karma", "abyssRadius", 0, 50, 1],
      ["深淵業障 每層增傷", "karma", "abyssDmg", 0, 0.6, 0.05],
      ["償還 傷害倍率", "karma", "repayMult", 0.2, 1, 0.05],
      ["業障纏身 增傷倍率", "karma", "markMult", 1, 2, 0.05],
      ["懺悔 每個敵人回血", "karma", "penanceHeal", 0, 20, 1],
      ["大招 半徑", "ult", "radius", 80, 320, 10],
      ["大招 扇形半角（°）", "ult", "halfDeg", 15, 90, 5],
      ["大招 第二斬每層陰霾增傷", "ult", "gloomBonus", 0, 0.4, 0.01],
      ["大招 充能（次行動）", "ult", "charge", 1, 12, 1],
      ["大招 第三斬基礎傷害", "ult", "thirdBase", 1, 60, 1],
      ["斬斷枷鎖 第三斬門檻", "ult", "chainCost", 1, 5, 1],
    ],

    skills: {
      // ---------- 普攻 長劍突刺 ----------
      thrust: {
        name: "長劍突刺", slot: "普攻", key: "a", sound: "sounds/ilshu-thrust.mp3",
        tags: ["melee"],
        ap: 1, base: 12, range: 150, halfDeg: 9, gloomBonus: 0.08,
        desc: "指向敵人，朝那個方向刺出細長的扇形，範圍內都會被打到。每層陰霾 +8% 傷害",
        status(b, u) {
          return { ready: true, cost: this.ap, label: this.name,
            aim: { type: "enemy", range: this.range, free: true, sector: { radius: this.range, half: this.halfDeg * DEG } } };
        },
        hits(b, u, ang) { return inSector(b, u, ang, this.range, this.halfDeg * DEG); },
        predict(b, u, arg) {
          const t = arg.target;
          if (!t) { if (!Number.isFinite(arg.x)) err("請點選敵人或方向"); return this.hits(b, u, Math.atan2(arg.y - u.y, arg.x - u.x)); }
          if (!t.alive || t.team === u.team) err("請點選一個敵人");
          if (!b.targetsFor(u).includes(t)) err("打不到這個目標");
          if (b.reach(u, t) > this.range) err("距離太遠");
          return this.hits(b, u, Math.atan2(t.y - u.y, t.x - u.x));
        },
        use(b, u, arg, st) {
          // 方向在出手瞬間決定；敵人如果閃開，就照新位置判定（按 A 點地面：朝那個方向刺）
          const t = arg.target || { x: arg.x, y: arg.y }, ang = Math.atan2(t.y - u.y, t.x - u.x);
          u.facing = ang;
          const hits = this.hits(b, u, ang);
          b.say(`${u.name} 使用「長劍突刺」`);
          b.emit({ type: "sfx", sound: this.sound });
          b.emit({ type: "slash", unit: u, ang, radius: this.range, half: this.halfDeg * DEG, style: "thrust" });
          if (!hits.length) { b.say("……刺空了"); b.emit({ type: "miss", x: t.x, y: t.y }); }
          const m = gloomMult(u, this.gloomBonus);
          for (const e of hits) if (e.alive) b.damage(u, e, this.base, m, u.state.gloom ? `（陰霾 ×${m.toFixed(2)}）` : "");
        },
      },

      // ---------- Q 試煉 ----------
      trial: {
        name: "試煉", slot: "Q", key: "q",
        tags: ["summon"],
        ap: 1, pull: 220, base: 12, cooldown: 2, projectileSpeed: 600,
        // 強化數值（暫定）
        dashMax: 320,                       // 逆行試煉：衝刺最遠距離
        heavyPull: 480, heavyPerDist: 0.004, heavyKnock: 90,   // 千鈞試煉
        echoRadius: 80, echoBase: 10,       // 循環試煉：殘影
        desc: "讓心魔朝自己飛過來一段距離，路上撞到的敵人受到傷害",
        status(b, u) {
          const cd = u.cd.trial || 0;
          if (cd > 0) return { ready: false, cost: this.ap, label: this.name, note: `CD ${cd}`, reason: `冷卻中（還要 ${cd} 次行動）` };
          if (!demonOf(b, u)) return { ready: false, cost: this.ap, label: this.name, note: "沒有心魔", reason: "場上沒有心魔" };
          return { ready: true, cost: this.ap, label: upg(u).q1 === "reverse" ? "逆行試煉" : upg(u).q1 === "heavy" ? "千鈞試煉" : this.name, aim: { type: "none" } };
        },
        // 路線：mover 從 from 移到 to，撞到 hits；r 是移動物的半徑（畫預覽用）
        path(b, u) {
          const d = demonOf(b, u);
          if (!d) err("場上沒有心魔");
          const q1 = upg(u).q1;
          if (q1 === "reverse") {
            // 逆行試煉：伊爾舒衝向心魔
            const L = R.dist(u.x, u.y, d.x, d.y), ux = (d.x - u.x) / L, uy = (d.y - u.y) / L;
            let len = Math.max(0, Math.min(this.dashMax, L - (u.r + d.r + 4)));
            const A = b.cfg.arena;
            // 被聖牢籠困住時，衝刺會撞上牢籠停下來（只能衝到框邊）
            const cage = b.cageOf?.(u);
            const ok = (s) => free(b, u, [d], u.x + ux * s, u.y + uy * s, u.r) &&
              (!cage || b.inCage(cage, u.x + ux * s, u.y + uy * s, b.cfg.body * 0.6));
            const want = len;
            while (len > 0 && !ok(len)) len -= 4;
            const blockedByCage = !!cage && len < want && !b.inCage(cage, u.x + ux * want, u.y + uy * want, b.cfg.body * 0.6);
            const to = { x: Math.min(Math.max(u.x + ux * len, u.r), A.w - u.r), y: Math.min(Math.max(u.y + uy * len, u.r), A.h - u.r) };
            const hits = b.targetsFor(u).filter((e) => !e.demon && R.geo.pointSeg(e.x, e.y, u.x, u.y, to.x, to.y) <= e.r + u.r);
            return { d, mover: u, from: { x: u.x, y: u.y }, to, hits, r: u.r, dist: len, caged: blockedByCage };
          }
          const L = R.dist(d.x, d.y, u.x, u.y), ux = (u.x - d.x) / L, uy = (u.y - d.y) / L;
          const ok = (s) => free(b, d, [u], d.x + ux * s, d.y + uy * s, d.r);
          if (q1 === "heavy") {
            // 千鈞試煉：撞到第一個敵人就停
            let len = Math.max(0, Math.min(this.heavyPull, L - (u.r + d.r + 4)));
            let first = null, firstT = len;
            for (const e of b.targetsFor(u)) {
              if (e.demon) continue;
              const t = R.geo.rayCircle(d.x, d.y, ux, uy, e.x, e.y, e.r + d.r);
              if (t !== null && t < firstT) { first = e; firstT = t; }
            }
            len = first ? Math.max(0, firstT - 2) : len;
            if (!first) while (len > 0 && !ok(len)) len -= 4;
            const to = { x: d.x + ux * len, y: d.y + uy * len };
            return { d, mover: d, from: { x: d.x, y: d.y }, to, hits: first ? [first] : [], r: d.r, dist: len, heavy: true };
          }
          let len = Math.max(0, Math.min(this.pull, L - (u.r + d.r + 4)));
          while (len > 0 && !ok(len)) len -= 4;
          const to = { x: d.x + ux * len, y: d.y + uy * len };
          const hits = b.targetsFor(u).filter((e) => !e.demon && R.geo.pointSeg(e.x, e.y, d.x, d.y, to.x, to.y) <= e.r + d.r);
          return { d, mover: d, from: { x: d.x, y: d.y }, to, hits, r: d.r, dist: len };
        },
        predict(b, u) { return this.path(b, u).hits; },
        origins(b, u) {
          if (upg(u).q1 === "reverse") return [{ x: u.x, y: u.y }];
          const d = demonOf(b, u); return d ? [{ x: d.x, y: d.y }] : [];
        },
        use(b, u) {
          const pa = this.path(b, u), up = upg(u);
          b.setCooldown(u, "trial", this.cooldown);
          if (pa.mover === u) {
            u.facing = Math.atan2(pa.to.y - u.y, pa.to.x - u.x);
            u.x = pa.to.x; u.y = pa.to.y;
            b.say(`${u.name} 使用「逆行試煉」，衝向心魔${pa.caged ? "……但被聖牢籠擋住了" : ""}`);
            b.emit({ type: "leap", unit: u, from: pa.from, to: pa.to, duration: 0.22 });
            b.emit({ type: "demonPull", unit: u, from: pa.from, to: pa.to });
          } else {
            pa.d.x = pa.to.x; pa.d.y = pa.to.y;
            b.say(pa.heavy ? `${u.name} 使用「千鈞試煉」，心魔猛然撞了過去` : `${u.name} 使用「試煉」，心魔朝她逼近`);
            b.emit({ type: "demonPull", unit: pa.d, from: pa.from, to: pa.to, speed: this.projectileSpeed });
          }
          b.bark(u, pa.heavy ? "heavy" : "trial");
          const mult = pa.heavy ? 1 + pa.dist * this.heavyPerDist : 1;
          for (const e of pa.hits) {
            if (!e.alive) continue;
            b.damage(u, e, this.base, mult, pa.heavy ? `（千鈞試煉・飛了 ${Math.round(pa.dist)} ×${mult.toFixed(2)}）` : pa.mover === u ? "（被伊爾舒撞上）" : "（被心魔撞上）");
            if (pa.heavy && e.alive && !e.part && b.knockback(e, pa.to.x, pa.to.y, this.heavyKnock)) b.say(`${e.name} 被撞飛了`);
            if (up.q2 === "burden" && e.alive && !e.npc) {
              const who = e.parent || e;
              who.state.apPenalty = (who.state.apPenalty || 0) + 1;
              b.say(`${who.name} 被沉重的試煉壓住，下次行動點 −1`);
              b.emit({ type: "buff", unit: e, text: "沉重：下回合 −1 ★" });
            }
          }
          // 循環試煉：起點留下殘影
          if (up.q2 === "cycle") {
            b.zones.push({ id: "echo" + Math.random().toString(36).slice(2, 7), type: "echo", owner: u, x: pa.from.x, y: pa.from.y, r: this.echoRadius, turnsLeft: 99 });
            b.say("起點留下了心魔的殘影");
          }
        },
      },

      // ---------- E 業障 ----------
      karma: {
        name: "業障", slot: "E", key: "e",
        tags: ["area", "summon"],
        ap: 1, radius: 110, base: 20, cooldown: 3,
        // 強化數值（暫定）
        abyssRadius: 18, abyssDmg: 0.2, repayMult: 0.7, markMult: 1.25, penanceHeal: 5,
        desc: "引爆目前的心魔，對周圍的敵人造成傷害。這樣消滅的心魔不會給陰霾",
        status(b, u) {
          const cd = u.cd.karma || 0;
          if (cd > 0) return { ready: false, cost: this.ap, label: this.name, note: `CD ${cd}`, reason: `冷卻中（還要 ${cd} 次行動）` };
          if (!demonOf(b, u)) return { ready: false, cost: this.ap, label: this.name, note: "沒有心魔", reason: "場上沒有心魔" };
          const note = upg(u).e1 === "abyss" && u.state.gloom ? `半徑 ${this.radiusFor(u)}` : "";
          return { ready: true, cost: this.ap, label: this.name, note, aim: { type: "none" } };
        },
        radiusFor(u) { return this.radius + (upg(u).e1 === "abyss" ? (u.state.gloom || 0) * this.abyssRadius : 0); },
        hits(b, u, d) { const r = this.radiusFor(u); return b.targetsFor(u).filter((e) => !e.demon && R.dist(e.x, e.y, d.x, d.y) <= r + e.r); },
        predict(b, u) { const d = demonOf(b, u); return d ? this.hits(b, u, d) : []; },
        origins(b, u) { const d = demonOf(b, u); return d ? [{ x: d.x, y: d.y }] : []; },
        use(b, u) {
          const d = demonOf(b, u), up = upg(u);
          if (!d) err("場上沒有心魔");
          const hits = this.hits(b, u, d), radius = this.radiusFor(u);
          b.setCooldown(u, "karma", this.cooldown);
          let mult = 1, note = "";
          if (up.e1 === "abyss" && u.state.gloom) {
            mult = 1 + u.state.gloom * this.abyssDmg;
            note = `（深淵業障・${u.state.gloom} 層陰霾 ×${mult.toFixed(2)}）`;
            b.say(`${u.name} 把 ${u.state.gloom} 層陰霾灌進心魔`);
            u.state.gloom = 0;
            b.emit({ type: "gloomSpent", unit: u });
          } else if (up.e1 === "repay") { mult = this.repayMult; note = `（償還 ×${this.repayMult}）`; }
          b.say(`${u.name} 引爆了心魔「業障」！`);
          b.bark(u, "karma");
          b.emit({ type: "explode", x: d.x, y: d.y, radius, color: "#5b3fa8" });
          for (const e of hits) {
            if (!e.alive) continue;
            b.damage(u, e, this.base, mult, note);
            if (up.e2 === "mark" && e.alive) { e.state.karmaMark = b.round + 1; b.emit({ type: "buff", unit: e, text: "業障纏身" }); }
          }
          if (up.e2 === "penance" && hits.length) b.heal(u, this.penanceHeal * hits.length, "（懺悔）");
          if (up.e1 === "repay") d.repaid = true; else d.noGloom = true;
          d.hp = 0;
          b.onDeath(d);
        },
      },

      // ---------- W 大招 走出陰影 ----------
      ult: {
        name: "走出陰影", slot: "W", key: "w", ultimate: true,
        tags: ["melee"],
        ap: 2, charge: 6, radius: 170, halfDeg: 50, base: 18, gloomBonus: 0.15,
        thirdBase: 24,                     // 陰霾滿層時的第三斬（暫定）
        chainCost: 3,                      // 斬斷枷鎖：幾層陰霾就能第三斬（只消耗這麼多）
        sounds: { slash: "sounds/ilshu-slash.mp3", strong: "sounds/ilshu-slash-strong.mp3" },
        desc: "朝指定方向揮出寬扇形的二連斬，第二斬每層陰霾 +15% 傷害。陰霾滿層時消耗所有陰霾，額外打出強力的第三斬",
        status(b, u) {
          if (u.charge < this.charge) return { ready: false, cost: this.ap, label: this.name, note: `${u.charge}/${this.charge}`, reason: `還要 ${this.charge - u.charge} 次行動才能使用` };
          return { ready: true, cost: this.ap, label: this.name,
            aim: { type: "direction", range: this.radius, sector: { radius: this.radius, half: this.halfDeg * DEG } } };
        },
        hits(b, u, ang) { return inSector(b, u, ang, this.radius, this.halfDeg * DEG).filter((e) => !(upg(u).w1 === "guilt" && e === demonOf(b, u))); },
        // 負罪前行：心魔站到正對面（斬擊範圍外），朝伊爾舒揮同樣的斬擊
        partner(b, u, ang) {
          if (upg(u).w1 !== "guilt") return null;
          const d = demonOf(b, u);
          if (!d) return null;
          const A = b.cfg.arena, far = this.radius + d.r + 8;
          const x = Math.min(Math.max(u.x + Math.cos(ang) * far, d.r), A.w - d.r);
          const y = Math.min(Math.max(u.y + Math.sin(ang) * far, d.r), A.h - d.r);
          return { d, x, y, ang: Math.atan2(u.y - y, u.x - x) };
        },
        partnerHits(b, u, pt, scale = 1) {
          return inSectorAt(b, u, pt.x, pt.y, pt.ang, this.radius * scale, this.halfDeg * DEG * (scale > 1 ? 1.1 : 1), pt.d);
        },
        thirdReady(u) {
          const need = upg(u).w1 === "chain" ? this.chainCost : u.def.passive.maxGloom;
          return (u.state.gloom || 0) >= need;
        },
        predict(b, u, arg) {
          if (!(R.dist(u.x, u.y, arg.x, arg.y) > 1)) err("請點選方向");
          const ang = Math.atan2(arg.y - u.y, arg.x - u.x);
          const pt = this.partner(b, u, ang);
          return [...new Set([...this.hits(b, u, ang), ...(pt ? this.partnerHits(b, u, pt) : [])])];
        },
        use(b, u, arg) {
          const ang = Math.atan2(arg.y - u.y, arg.x - u.x), half = this.halfDeg * DEG;
          u.facing = ang;
          u.charge = 0;
          const pt = this.partner(b, u, ang);
          b.say(`${u.name} 發動「走出陰影」！`);
          b.bark(u, "ult");
          if (pt) {
            const from = { x: pt.d.x, y: pt.d.y };
            pt.d.x = pt.x; pt.d.y = pt.y;
            b.say("心魔繞到了對面，一起揮出斬擊");
            b.emit({ type: "demonPull", unit: pt.d, from, to: { x: pt.x, y: pt.y } });
          }
          const before = new Set(b.targetsFor(u));     // 第一斬後新出現的心魔不算在之後的斬擊裡
          const slash = (n, style, scale, base, mult, label) => {
            b.emit({ type: "slash", unit: u, ang, radius: this.radius * scale, half: half * (scale > 1 ? 1.1 : 1), style, n });
            let hits = inSector(b, u, ang, this.radius * scale, half * (scale > 1 ? 1.1 : 1)).filter((e) => !(pt && e === pt.d));
            if (n) hits = hits.filter((e) => before.has(e));
            for (const e of hits) if (e.alive) b.damage(u, e, base, mult, label);
            let total = hits.length;
            if (pt && pt.d.alive) {
              b.emit({ type: "slash", unit: pt.d, origin: { x: pt.x, y: pt.y }, ang: pt.ang, radius: this.radius * scale, half: half * (scale > 1 ? 1.1 : 1), style, n, dark: true });
              let h2 = this.partnerHits(b, u, pt, scale);
              if (n) h2 = h2.filter((e) => before.has(e));
              for (const e of h2) if (e.alive) b.damage(u, e, base, mult, label.replace("）", "・心魔）"));
              total += h2.length;
            }
            return total;
          };
          // 第一斬
          b.emit({ type: "sfx", sound: this.sounds.slash });
          slash(0, "wide", 1, this.base, 1, "（第一斬）");
          // 第二斬：陰霾增傷（第一斬打倒心魔得到的陰霾也算）
          b.emit({ type: "sfx", sound: this.sounds.slash, delay: 0.24 });
          const m = gloomMult(u, this.gloomBonus);
          if (!slash(1, "wide", 1, this.base, m, `（第二斬・陰霾 ×${m.toFixed(2)}）`)) b.say("……第二斬沒有命中");

          // 第三斬：陰霾滿層（斬斷枷鎖：3 層）時消耗陰霾，以消耗前的層數增傷
          if (this.thirdReady(u)) {
            const m3 = gloomMult(u, this.gloomBonus);
            b.say(`${u.name} 吞下陰霾，揮出第三斬！`);
            b.bark(u, pt ? "guiltThird" : "third", 0.52);
            b.emit({ type: "sfx", sound: this.sounds.strong, delay: 0.52 });
            if (!slash(2, "strong", 1.15, this.thirdBase, m3, `（第三斬・陰霾 ×${m3.toFixed(2)}）`)) b.say("……第三斬沒有命中");
            u.state.gloom = upg(u).w1 === "chain" ? Math.max(0, u.state.gloom - this.chainCost) : 0;
            if (u.state.gloom) b.say(`消耗 ${this.chainCost} 層陰霾（剩 ${u.state.gloom} 層）`);
            else b.emit({ type: "gloomSpent", unit: u });
          }
        },
      },
    },
  };

  R.CHARACTERS[C.id] = C;
})();
