/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/characters/guan.js": "20261110175453" });
// 角色：觀知命（卜卦人）
// 吉位／兇位是場上的區域（zones 的 lucky / unlucky）。站在吉位時護盾更多；從吉位打兇位的敵人傷害更高
// 數值都是暫定
(function () {
  const R = window.RPG;
  R.CHARACTERS = R.CHARACTERS || {};
  const err = (m) => { throw new R.ActionError(m); };
  const upg = (u) => u.upg || {};
  const zonesOf = (b, type) => b.zones.filter((z) => z.type === type);
  const inZone = (b, type, x, y) => zonesOf(b, type).some((z) => R.dist(z.x, z.y, x, y) <= z.r);
  const dirOf = (u, arg) => {
    const t = arg.target ? arg.target : arg;
    if (!t || !Number.isFinite(t.x)) err("請點選方向");
    const L = Math.hypot(t.x - u.x, t.y - u.y);
    if (L < 1) err("請點選方向");
    return { dx: (t.x - u.x) / L, dy: (t.y - u.y) / L, ang: Math.atan2(t.y - u.y, t.x - u.x) };
  };

  const C = {
    id: "guan",
    name: "觀知命",
    letter: "觀",
    color: "#2f6fd6",
    role: "輔助・卜卦",
    gacha: true,
    profile: "本名乾默存，是一位巧算天機的卜卦人，自認參透命運有著高昂的自信，會不問意願的去卜算他人的命運，會滔滔不絕一些難懂的名詞",
    desc: "卜卦人。能把戰場分成吉位和兇位：站在吉位時護盾更多，從吉位攻擊兇位的敵人傷害更高；替自己和隊友卜吉卦加護盾、替敵人卜兇卦讓他們虛弱。",
    stats: { hp: 72, mp: 0, atk: 14, df: 5, spd: 10, ap: 6 },        // 暫定
    growth: { hp: 3.3, mp: 2, atk: 0.8, df: 0.3, spd: 0.1 },
    field: {
      basicRange: 90,
      q: { name: "趨吉避凶", type: "luck", sound: "sounds/guan-chime.mp3", cd: 40, duration: 60,
        desc: "占卜一個吉卦，一段時間內好事比較容易發生、壞事比較不容易發生（目前只有旅館樓梯口：被嚇到的機率減半）" },
    },
    basic: "talisman",
    ultimate: "array",
    hud: { left: "omen", center: "array", right: "yinyang" },
    // 個性台詞（自信過頭的卜卦人，滿口術語）
    barks: {
      omen: { chance: 0.5, lines: ["卦象已成，吉凶自明。", "乾為天，坤為地——你們的命，我替你們算好了。", "不用謝，這一卦本來就該卜。"] },
      yinyang: { chance: 0.5, lines: ["陰陽兩儀，各安其位。", "此處為吉，彼處為兇。站錯了位置，可別怪天命。"] },
      talisman: { chance: 0.15, lines: ["急急如律令。", "金剛護體——不是給我自己的。"] },
      ult: { chance: 0.8, lines: ["乾坤挪移，天命在我！", "太極生兩儀，兩儀生四象——看清楚了，這就是命運的形狀。"] },
      hurt: { chance: 0.25, lines: ["……這一卦，我算漏了？", "不可能，今日明明宜出行。"] },
      healOther: { chance: 0.5, lines: ["你的面相帶吉，再撐一下。"] },
    },

    passive: {
      name: "天明道法",
      desc: "身處吉位時，獲得的護盾量 ×1.5",
      mult: 1.5,
      status(b, u) { const on = inZone(b, "lucky", u.x, u.y); return { text: on ? "身處吉位：護盾 ×1.5" : "不在吉位", on }; },
    },

    // ===== 技能強化樹 =====
    upgrades: {
      q: {
        skill: "omen",
        tiers: [
          [
            { id: "luckyAura", name: "大吉之勢", desc: "身上有吉卦護盾時，造成的傷害 ×1.2" },
            { id: "doomOmen", name: "大凶之兆", desc: "被卜了兇卦的敵人使用指向攻擊時，有 40% 機率方向偏掉" },
          ],
          [
            { id: "fortune", name: "好運到來", desc: "趨吉避凶額外再去除 1 個負面狀態" },
            { id: "calamity", name: "大難臨頭", desc: "趨吉避凶的範圍 ×1.4" },
          ],
        ],
      },
      e: {
        skill: "yinyang",
        tiers: [
          [
            { id: "double", name: "好事成雙", desc: "在吉位內行動時，回復 5% 最大生命" },
            { id: "jinx", name: "噩運連連", desc: "整隻都在兇位範圍內的敵人（試煉 Boss 除外）輪到時會被禁錮、跳過行動；但吉凶位只持續 1 回合" },
          ],
          [
            { id: "fullLuck", name: "滿運天", desc: "吉位打兇位的增傷從 ×1.35 提高到 ×1.7" },
            { id: "greatEvil", name: "大惡天", desc: "吉位和兇位的範圍 ×1.35" },
          ],
        ],
      },
      w: {
        skill: "array",
        tiers: [
          [
            { id: "bless", name: "天仙賜福", desc: "乾坤挪移：陣法內的我方解除所有負面狀態" },
            { id: "calamityGod", name: "難神降禍", desc: "乾坤挪移會消耗掉吉位和兇位，陰陽陣持續轉動 2 回合，敵人在陣裡輪到時受到傷害" },
          ],
        ],
      },
    },
    // 敵人的指向攻擊偏掉（大凶之兆）
    deflect(b, e) {
      if (upg(b.player).q1 !== "doomOmen" || !(e.state.cursedUntil >= b.round) || Math.random() >= 0.4) return 0;
      return (Math.random() < 0.5 ? -1 : 1) * (25 + Math.random() * 20) * Math.PI / 180;
    },
    onAction(b, u, id, cost) {
      if (upg(u).e1 === "double" && cost > 0 && u.alive && inZone(b, "lucky", u.x, u.y) && u.hp < u.maxHp) b.heal(u, Math.max(1, Math.round(u.maxHp * 0.05)), "（好事成雙）");
    },
    // 任何單位回合開始：噩運連連的禁錮、難神降禍的陰陽陣
    onTurnStart(b, unit) {
      if (unit.team !== "enemy" || !unit.alive) return;
      const up = upg(b.player);
      if (up.e1 === "jinx" && !unit.def.trial && !b.room.trial && zonesOf(b, "unlucky").some((z) => R.dist(z.x, z.y, unit.x, unit.y) + unit.r <= z.r)) unit.state.imprisoned = true;
      for (const z of zonesOf(b, "taijiField")) if (R.dist(z.x, z.y, unit.x, unit.y) <= z.r + unit.r) { b.emit({ type: "fxShape", shape: { shape: "circle", x: unit.x, y: unit.y, radius: unit.r + 10 }, color: "#7a3fb0", dur: 400 }); b.damage(b.player, unit, z.base, 1, "（難神降禍）"); }
    },
    // 從吉位攻擊兇位：傷害增加（battle.damage 會問）
    positionMult(b, src, dst) {
      let mult = 1, note = "";
      if (inZone(b, "lucky", src.x, src.y) && inZone(b, "unlucky", dst.x, dst.y)) { const k = upg(src).e2 === "fullLuck" ? C.skills.yinyang.bonusHigh : C.skills.yinyang.bonus; mult *= k; note += `（吉位打兇位 ×${k}）`; }
      if (upg(src).q1 === "luckyAura" && src.shield > 0 && src.state.blessed) { mult *= 1.2; note += "（大吉之勢）"; }
      return { mult, note };
    },
    giveShield(b, u, a, base, note) {
      const s = this.shieldOf(b, u, base);
      const got = b.addShield(a, s.amount, `${note}${s.note}`);
      if (a === u && got) u.state.blessed = true;
      return got;
    },
    shieldOf(b, u, base) {
      const lucky = inZone(b, "lucky", u.x, u.y);
      return { amount: Math.round(base * (1 + u.atk / 100) * (lucky ? this.passive.mult : 1)), note: lucky ? "（天明道法 ×1.5）" : "" };
    },
    // 我方（自己＋召喚物、馬車）
    friends(b, u) { return [u, ...b.allies()]; },

    tune: [
      ["天明道法 護盾倍率", "passive", "mult", 1, 3, 0.1],
      ["金剛咒符 射程", "talisman", "range", 100, 600, 10],
      ["金剛咒符 傷害", "talisman", "base", 1, 30, 1],
      ["金剛咒符 隊友護盾", "talisman", "shield", 0, 30, 1],
      ["趨吉避凶 半徑", "omen", "radius", 60, 400, 10],
      ["趨吉避凶 護盾", "omen", "shield", 0, 40, 1],
      ["趨吉避凶 虛弱倍率", "omen", "weakMult", 0.1, 1, 0.05],
      ["陰陽兩和 吉位半徑", "yinyang", "luckyR", 40, 250, 5],
      ["陰陽兩和 兇位距離", "yinyang", "dist", 100, 500, 10],
      ["陰陽兩和 增傷", "yinyang", "bonus", 1, 3, 0.05],
      ["乾坤挪移 大吉護盾", "array", "shield", 0, 80, 1],
      ["乾坤挪移 大兇虛弱倍率", "array", "weakMult", 0.1, 1, 0.05],
    ],

    skills: {
      // ---------- 普攻 金剛咒符 ----------
      talisman: {
        name: "金剛咒符", slot: "普攻", key: "a", sound: "sounds/vivilla-throw.mp3",
        tags: ["projectile"],
        ap: 1, range: 320, base: 7, shield: 8, projectileSpeed: 800,
        desc: "射出一張射程中等的符咒，打到第一個敵人（傷害不高）。打到隊友會給少量護盾（不能給自己）",
        status(b, u) { return { ready: true, cost: this.ap, label: this.name, aim: { type: "enemy", range: this.range, free: true } }; },
        path(b, u, arg) {
          const d = dirOf(u, arg);
          let hit = null, t = this.range;
          for (const e of [...b.targetsFor(u), ...b.allies()]) {
            const h = R.geo.rayCircle(u.x, u.y, d.dx, d.dy, e.x, e.y, e.r);
            if (h !== null && h < t && h > 0) { hit = e; t = h; }
          }
          return { d, hit, to: { x: u.x + d.dx * t, y: u.y + d.dy * t } };
        },
        predict(b, u, arg) {
          if (arg.target && b.reach(u, arg.target) > this.range) err("距離太遠");
          const p = this.path(b, u, arg); return p.hit && p.hit.team === "enemy" ? [p.hit] : [];
        },
        preview(b, u, arg) {
          const p = this.path(b, u, arg);
          return { shapes: [{ shape: "line", x1: u.x, y1: u.y, x2: p.to.x, y2: p.to.y, width: 14 }], hits: p.hit?.team === "enemy" ? [p.hit] : [], allies: p.hit && p.hit.team !== "enemy" ? [p.hit] : [] };
        },
        use(b, u, arg) {
          const p = this.path(b, u, arg);
          u.facing = p.d.ang;
          b.say(`${u.name} 射出「金剛咒符」`);
          b.emit({ type: "sfx", sound: this.sound });
          b.emit({ type: "talisman", from: { x: u.x, y: u.y }, to: p.to, dur: Math.max(200, (R.dist(u.x, u.y, p.to.x, p.to.y) / this.projectileSpeed) * 1000) });
          if (!p.hit) { b.say("……符咒落空了"); b.emit({ type: "miss", x: p.to.x, y: p.to.y }); return; }
          if (p.hit.team === "enemy") b.damage(u, p.hit, this.base);
          else { C.giveShield(b, u, p.hit, this.shield, "（金剛咒符）"); b.bark(u, "healOther"); }
        },
      },

      // ---------- Q 趨吉避凶 ----------
      omen: {
        name: "趨吉避凶", slot: "Q", key: "q", sound: "sounds/guan-chime.mp3",
        tags: ["area"],
        ap: 1, cooldown: 2, radius: 170, shield: 10, cleanseBonus: 0.6, weakMult: 0.75,
        desc: "替範圍內的自己和隊友卜吉卦：給護盾，同時去除 1 個負面狀態（去除成功護盾更多）；替範圍內的敵人卜兇卦：虛弱（造成的傷害降低）",
        status(b, u) {
          const cd = u.cd.omen || 0;
          if (cd > 0) return { ready: false, cost: this.ap, label: this.name, note: `CD ${cd}`, reason: `冷卻中（還要 ${cd} 次行動）` };
          return { ready: true, cost: this.ap, label: this.name, aim: { type: "none" } };
        },
        rad(u) { return this.radius * (upg(u).q2 === "calamity" ? 1.4 : 1); },
        hits(b, u) { return b.enemies().filter((e) => R.dist(e.x, e.y, u.x, u.y) <= this.rad(u) + e.r); },
        predict(b, u) { return []; },
        preview(b, u) { return { shapes: [{ shape: "circle", x: u.x, y: u.y, radius: this.rad(u) }], hits: this.hits(b, u), allies: C.friends(b, u).filter((a) => a !== u && R.dist(a.x, a.y, u.x, u.y) <= this.rad(u) + a.r) }; },
        areaCenter(b, u) { return { x: u.x, y: u.y }; },
        use(b, u) {
          b.setCooldown(u, "omen", this.cooldown);
          b.say(`${u.name} 使用「趨吉避凶」`);
          b.emit({ type: "sfx", sound: this.sound });
          b.bark(u, "omen");
          const R0 = this.rad(u);
          b.emit({ type: "fxShape", shape: { shape: "circle", x: u.x, y: u.y, radius: R0 }, color: "#d4a017", dur: 600 });
          for (const a of C.friends(b, u)) {
            if (R.dist(a.x, a.y, u.x, u.y) > R0 + a.r) continue;
            const gone = [];
            if (a === u || !a.ward) for (let i = 0; i < (upg(u).q2 === "fortune" ? 2 : 1); i++) { const g = b.cleanse(a); if (g) gone.push(g); }
            if (gone.length) b.emit({ type: "buff", unit: a, text: `吉卦：去除${gone.join("、")}`, color: "#b8860b" });
            C.giveShield(b, u, a, this.shield * (gone.length ? 1 + this.cleanseBonus : 1), `（吉卦${gone.length ? "・去除" + gone.join("、") : ""}）`);
          }
          for (const e of this.hits(b, u)) { b.weaken(e, this.weakMult, 1, "兇卦：虛弱"); (e.parent || e).state.cursedUntil = b.round + 1; }
        },
      },

      // ---------- E 陰陽兩和 ----------
      yinyang: {
        name: "陰陽兩和", slot: "E", key: "e", sound: "sounds/guan-chime.mp3",
        tags: ["area"],
        ap: 1, cooldown: 3, luckyR: 110, unluckyR: 100, dist: 270, turns: 2, bonus: 1.35, bonusHigh: 1.7,
        size(u) { return upg(u).e2 === "greatEvil" ? 1.35 : 1; },
        desc: "自己周圍變成吉位，前方固定距離的地方變成兇位（持續 2 回合）。從吉位攻擊兇位的敵人傷害增加",
        status(b, u) {
          const cd = u.cd.yinyang || 0;
          if (cd > 0) return { ready: false, cost: this.ap, label: this.name, note: `CD ${cd}`, reason: `冷卻中（還要 ${cd} 次行動）` };
          return { ready: true, cost: this.ap, label: this.name, aim: { type: "direction" } };
        },
        spots(b, u, arg) {
          const d = dirOf(u, arg);
          return { d, lucky: { x: u.x, y: u.y }, unlucky: { x: u.x + d.dx * this.dist, y: u.y + d.dy * this.dist } };
        },
        predict(b, u) { return []; },
        preview(b, u, arg) {
          const s = this.spots(b, u, arg);
          return {
            shapes: [
              { shape: "circle", x: s.lucky.x, y: s.lucky.y, radius: this.luckyR * this.size(u), color: "#d4a017", label: "吉" },
              { shape: "circle", x: s.unlucky.x, y: s.unlucky.y, radius: this.unluckyR * this.size(u), color: "#8a1a24", label: "兇" },
            ],
            hits: b.enemies().filter((e) => R.dist(e.x, e.y, s.unlucky.x, s.unlucky.y) <= this.unluckyR * this.size(u)),
          };
        },
        use(b, u, arg) {
          const s = this.spots(b, u, arg);
          u.facing = s.d.ang;
          b.setCooldown(u, "yinyang", this.cooldown);
          b.zones = b.zones.filter((z) => !((z.type === "lucky" || z.type === "unlucky") && z.owner === u));
          const k = this.size(u), turns = upg(u).e1 === "jinx" ? 1 : this.turns;
          b.zones.push({ id: "lk" + Math.random().toString(36).slice(2, 7), type: "lucky", owner: u, x: s.lucky.x, y: s.lucky.y, r: this.luckyR * k, turnsLeft: turns });
          b.zones.push({ id: "uk" + Math.random().toString(36).slice(2, 7), type: "unlucky", owner: u, x: s.unlucky.x, y: s.unlucky.y, r: this.unluckyR * k, turnsLeft: turns });
          b.bark(u, "yinyang");
          b.say(`${u.name} 使用「陰陽兩和」：身邊成了吉位，前方成了兇位`);
          b.emit({ type: "sfx", sound: this.sound });
        },
      },

      // ---------- W 乾坤挪移 ----------
      array: {
        name: "乾坤挪移", slot: "W", key: "w", ultimate: true, sound: "sounds/guan-chime.mp3",
        tags: ["area"],
        ap: 2, charge: 5, shield: 24, weakMult: 0.55, weakRounds: 2, fieldBase: 9,
        desc: "以吉位和兇位連線的最遠距離為直徑，旋轉畫出一個陰陽陣：陣裡的我方得到大吉（較多護盾），敵人得到大兇（額外虛弱）。要先有吉位和兇位",
        circle(b, u) {
          const L = zonesOf(b, "lucky").find((z) => z.owner === u), U = zonesOf(b, "unlucky").find((z) => z.owner === u);
          if (!L || !U) return null;
          const D = R.dist(L.x, L.y, U.x, U.y) || 1, dx = (U.x - L.x) / D, dy = (U.y - L.y) / D;
          const a = { x: L.x - dx * L.r, y: L.y - dy * L.r }, c = { x: U.x + dx * U.r, y: U.y + dy * U.r };
          return { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2, radius: R.dist(a.x, a.y, c.x, c.y) / 2 };
        },
        status(b, u) {
          if (u.charge < this.charge) return { ready: false, cost: this.ap, label: this.name, note: `${u.charge}/${this.charge}`, reason: `還要 ${this.charge - u.charge} 次行動才能使用` };
          if (!this.circle(b, u)) return { ready: false, cost: this.ap, label: this.name, note: "沒有吉凶位", reason: "要先用「陰陽兩和」做出吉位和兇位" };
          return { ready: true, cost: this.ap, label: this.name, aim: { type: "none" } };
        },
        predict(b, u) { return []; },
        preview(b, u) {
          const c = this.circle(b, u);
          if (!c) return null;
          return { shapes: [{ shape: "circle", ...c }], hits: b.enemies().filter((e) => R.dist(e.x, e.y, c.x, c.y) <= c.radius + e.r), allies: C.friends(b, u).filter((a) => a !== u && R.dist(a.x, a.y, c.x, c.y) <= c.radius + a.r) };
        },
        areaCenter(b, u) { const c = this.circle(b, u); return c ? { x: c.x, y: c.y } : { x: u.x, y: u.y }; },
        use(b, u) {
          const c = this.circle(b, u);
          if (!c) err("要先有吉位和兇位");
          u.charge = 0;
          b.say(`${u.name} 使用「乾坤挪移」！`);
          b.bark(u, "ult");
          b.emit({ type: "sfx", sound: this.sound });
          b.emit({ type: "taiji", x: c.x, y: c.y, r: c.radius });
          for (const a of C.friends(b, u)) {
            if (R.dist(a.x, a.y, c.x, c.y) > c.radius + a.r) continue;
            if (upg(u).w1 === "bless" && (a === u || !a.ward)) { const gone = []; for (let g = b.cleanse(a); g; g = b.cleanse(a)) gone.push(g); if (gone.length) b.emit({ type: "buff", unit: a, text: `天仙賜福：去除${gone.join("、")}`, color: "#b8860b" }); }
            C.giveShield(b, u, a, this.shield, "（大吉）");
          }
          if (upg(u).w1 === "calamityGod") {
            b.zones = b.zones.filter((z) => !((z.type === "lucky" || z.type === "unlucky") && z.owner === u));
            b.zones.push({ id: "tj" + Math.random().toString(36).slice(2, 7), type: "taijiField", owner: u, x: c.x, y: c.y, r: c.radius, base: this.fieldBase, turnsLeft: 2 });
            b.say("吉位和兇位捲進了陰陽陣，陣法持續轉動（難神降禍）");
          }
          for (const e of b.enemies()) if (R.dist(e.x, e.y, c.x, c.y) <= c.radius + e.r) b.weaken(e, this.weakMult, this.weakRounds, "大兇：虛弱");
        },
      },
    },
  };

  R.CHARACTERS[C.id] = C;
})();
