/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/characters/cangyou.js": "20261112021356" });
// 角色：蒼幽（神秘的少年，似乎來自某個水族館，和幽靈一樣的魚兒作伴）
// 魔力角色。方塊比較小（和霍夫曼相反）：身體的判定也比較小，比較難被打中
// 被動「安慰劑」：泡泡被魚群吃掉時，自己少量回血
// 普攻「泡沫散射」：前方細長扇形丟出 7 顆泡泡，打中敵人就破裂造成傷害，沒打中的留在場上（敵人走過去會踩破）
// Q「召喚魚群」：左右各召喚一隻幽靈魚（召喚物，會被打死）。魚有自己的回合（排在蒼幽後面），吃掉身邊的泡泡、找敵人撞過去；
//   吃 15 顆泡泡進化成幽靈墨魚（多了遠距離噴墨：麻痺），再吃 15 顆變成幽靈虎鯨（傷害變高，噴墨變成衝刺啃咬）
//   魚群已經在場上時再用一次＝「魚群出擊」：魚群立刻行動一次
// E「海馬先生」：丟出海馬先生，跟著自己或指定的隊友，每次輪到蒼幽時吐泡泡給護盾
// W「蝠鱝夫人」：向前丟出大蝠鱝，撞擊路上的敵人，飛到底向周圍噴射泡泡
// 數值都是暫定；個性台詞之後由使用者提供
(function () {
  const R = window.RPG;
  R.CHARACTERS = R.CHARACTERS || {};
  const err = (m) => { throw new R.ActionError(m); };
  const DEG = Math.PI / 180;
  const upg = (u) => u.upg || {};
  const now = () => performance.now();
  const dirOf = (u, arg) => {
    const t = arg.target ? arg.target : arg;
    if (!t || !Number.isFinite(t.x)) err("請點選方向");
    const L = Math.hypot(t.x - u.x, t.y - u.y);
    if (L < 1) err("請點選方向");
    return { dx: (t.x - u.x) / L, dy: (t.y - u.y) / L, ang: Math.atan2(t.y - u.y, t.x - u.x) };
  };
  const SND = { bubble: "sounds/cangyou-bubbles.mp3", whale: "sounds/cangyou-whale.mp3" };   // 一串泡泡的聲音、鯨魚的歌聲

  // 魚群的三個階段（r＝身體判定；hp＝蒼幽最大生命的比例。魚群會被打死，打死就要重養）
  const STAGES = [
    { name: "幽靈魚", ap: 2, ram: 6, swim: 200, size: 1, r: 11, hp: 0.22 },
    { name: "幽靈墨魚", ap: 3, ram: 8, swim: 220, size: 1.25, r: 16, hp: 0.4, ink: { range: 340, base: 4, slow: 0.6, cd: 2 } },
    { name: "幽靈虎鯨", ap: 4, ram: 13, swim: 260, size: 1.6, r: 26, hp: 0.7, bite: { range: 420, base: 18, cd: 2 } },
  ];
  const fishOf = (u) => (u.state.fish || []).filter((f) => f.alive);

  const C = {
    id: "cangyou",
    name: "蒼幽",
    letter: "蒼",
    color: "#1f3a8a",
    role: "遠距離・召喚",
    gacha: true,
    drawScale: 0.8,                    // 方塊比較小
    bodyScale: 0.78,                   // 判定也比較小：比較難被打中
    profile: "神秘的少年，似乎來自某個水族館，和幽靈一樣的魚兒作伴，明明是血氣方剛的年紀卻沒什麼精神氣色，但一些外在的刺激可以激活他的動力。",
    desc: "和幽靈魚作伴的少年。丟出的泡泡打中會破裂、沒打中會留在場上；幽靈魚會吃掉泡泡、撞擊敵人，吃夠了會進化成墨魚、虎鯨。海馬先生每回合吐泡泡給護盾。身體比較小，比較難被打中。",
    stats: { hp: 70, mp: 110, atk: 13, df: 3, spd: 12, ap: 6 },     // 暫定
    growth: { hp: 3, mp: 3.5, atk: 0.8, df: 0.25, spd: 0.1 },
    mpRegen: 0.25,
    field: {
      basicRange: 260,
      // 探索技能：放出小魚去探路，附近的魔物會跟著小魚走一段距離
      q: { name: "放小魚探路", type: "lure", sound: SND.bubble, cd: 30, range: 520, speed: 170, radius: 210, follow: 420, linger: 2.5, desc: "朝指定方向放出一隻幽靈小魚。小魚附近的魔物會被吸引，跟著小魚走一段距離（之後一陣子不會追人）" },
    },
    basic: "foam",
    ultimate: "manta",
    hud: { left: "school", center: "manta", right: "seahorse" },

    passive: {
      name: "安慰劑",
      desc: "泡泡被魚群吃掉時，自己回復少量生命（每顆 1）",
      heal: 1,
      status(b, u) {
        const fish = fishOf(u);
        return { text: fish.length ? fish.map((f) => `${STAGES[f.stage].name} ${f.eaten}`).join("、") : "還沒有魚群", on: fish.length > 0 };
      },
    },

    upgrades: {
      q: {
        skill: "school",
        tiers: [
          [
            { id: "glutton", name: "貪吃魚群", desc: "進化需要的泡泡變少：10 顆變墨魚、20 顆變虎鯨" },
            { id: "trio", name: "第三條魚", desc: "召喚魚群時多一隻幽靈魚（在身後）" },
          ],
          [
            { id: "fangs", name: "幽靈之牙", desc: "魚群造成的傷害 ×1.3" },
            { id: "sugar", name: "糖衣安慰劑", desc: "安慰劑：每顆泡泡回復 2 生命" },
          ],
        ],
      },
      e: {
        skill: "seahorse",
        tiers: [
          [
            { id: "thick", name: "厚實泡泡", desc: "海馬先生給的護盾 ×1.5" },
            { id: "spit", name: "多吐一點", desc: "海馬先生吐護盾時，也朝最近的敵人吐 3 顆泡泡" },
          ],
          [
            { id: "loyal", name: "忠實的海馬", desc: "海馬先生多待 2 回合" },
            { id: "soothe", name: "泡泡浴", desc: "海馬先生吐護盾時，也回復 3 生命" },
          ],
        ],
      },
      w: {
        skill: "manta",
        tiers: [
          [
            { id: "storm", name: "泡沫暴雨", desc: "蝠鱝夫人噴射的泡泡從 12 顆變成 20 顆" },
            { id: "escort", name: "夫人的護衛", desc: "蝠鱝夫人每撞到一個敵人，蒼幽獲得 6 護盾" },
          ],
        ],
      },
    },

    tune: [
      ["每回合回復魔力（比例）", "char", "mpRegen", 0, 1, 0.05],
      ["安慰劑 每顆回復", "passive", "heal", 0, 10, 1],
      ["泡沫散射 距離", "foam", "range", 100, 500, 10],
      ["泡沫散射 每顆傷害", "foam", "base", 1, 20, 1],
      ["泡沫散射 泡泡數", "foam", "count", 1, 15, 1],
      ["召喚魚群 魔力", "school", "mp", 0, 80, 1],
      ["海馬先生 護盾", "seahorse", "shield", 1, 40, 1],
      ["蝠鱝夫人 撞擊傷害", "manta", "base", 1, 40, 1],
    ],

    // ===== 泡泡 =====
    // 場上的泡泡用 b.zones（type: "bubble"），蒼幽的回合數到了就破掉
    bubbles(b) { return b.zones.filter((z) => z.type === "bubble"); },
    dropBubble(b, u, x, y, delay = 0) {
      const A = b.cfg.arena;
      x = Math.max(16, Math.min(A.w - 16, x)); y = Math.max(16, Math.min(A.h - 16, y));
      b.zones.push({ id: "bb" + Math.random().toString(36).slice(2, 7), type: "bubble", owner: u, x, y, r: 14, base: 3, turnsLeft: 3, born: now() + delay * 1000 });
      const all = this.bubbles(b);
      if (all.length > 40) b.zones = b.zones.filter((z) => z !== all[0]);   // 最多 40 顆：最舊的先破
    },
    // 一顆泡泡沿著直線飛：打到第一個敵人就破裂造成傷害，沒打到就留在終點
    shootBubbles(b, u, list, base, note, delay = 0) {
      const out = [];
      for (const s of list) {
        let hit = null, t = s.len;
        for (const e of b.targetsFor(u)) { const h = R.geo.rayCircle(s.x, s.y, s.dx, s.dy, e.x, e.y, e.r + 8); if (h !== null && h >= 0 && h < t) { hit = e; t = h; } }
        out.push({ x1: s.x, y1: s.y, x2: s.x + s.dx * t, y2: s.y + s.dy * t, pop: !!hit });
        if (hit) b.damage(u, hit, base, 1, note);
        else this.dropBubble(b, u, s.x + s.dx * t, s.y + s.dy * t, delay + 0.35);
      }
      b.emit({ type: "bubbles", list: out, delay });
      return out.filter((o) => o.pop).length;
    },
    // 敵人走過留在場上的泡泡：踩破
    onEnemyAction(b, e, from) {
      if (!from || !e.alive) return;
      for (const z of this.bubbles(b)) {
        if (R.geo.pointSeg(z.x, z.y, from.x, from.y, e.x, e.y) > z.r + e.r * 0.6) continue;
        b.zones = b.zones.filter((x) => x !== z);
        b.emit({ type: "bubbles", list: [{ x1: z.x, y1: z.y, x2: z.x, y2: z.y, pop: true }] });
        if (e.alive) b.damage(b.player, e, z.base, 1, "（踩破泡泡）");
      }
    },

    // ===== 魚群 =====
    need(u, stage) { return (upg(u).q1 === "glutton" ? [10, 20] : [15, 30])[stage]; },
    eat(b, u, f, test) {
      let n = 0;
      for (const z of this.bubbles(b)) if (z.born <= now() + 2000 && test(z)) { b.zones = b.zones.filter((x) => x !== z); n++; }
      if (!n) return 0;
      f.eaten += n;
      f.munch = now();
      const per = upg(u).q2 === "sugar" ? 2 : this.passive.heal;
      if (per > 0 && u.hp < u.maxHp) b.heal(u, n * per, `（安慰劑：${STAGES[f.stage].name}吃了 ${n} 顆泡泡）`);
      // 一次只進化一階（不會一口氣從小魚跳成虎鯨）：同一回合進化過就等下一回合
      if (f.stage < 2 && f.eaten >= this.need(u, f.stage) && f.evoRound !== b.round) {
        f.evoRound = b.round;
        const old = STAGES[f.stage].name;
        f.stage++;
        const S = STAGES[f.stage], mx = Math.max(5, Math.round(u.maxHp * S.hp));
        f.hp += mx - f.maxHp; f.maxHp = mx; f.r = S.r; f.name = S.name; f.maxAp = S.ap;      // 進化：變大、生命上限變高（多出來的直接補上）、行動點變多
        b.say(`${old}進化成了${S.name}！`);
        b.emit({ type: "buff", unit: f, text: `進化：${S.name}`, color: "#3a7bd5" });
        b.emit({ type: "fishEvolve", x: f.x, y: f.y, stage: f.stage });
        if (f.stage === 2) b.emit({ type: "sfx", sound: SND.whale });
      }
      return n;
    },
    // 游到 (x, y)：魚群是場上的單位（會擋路、會被打），被擋住就停在前面一點
    swim(b, f, x, y, dur = 0.45) {
      const A = b.cfg.arena, from = { x: f.x, y: f.y };
      x = Math.max(f.r, Math.min(A.w - f.r, x)); y = Math.max(f.r, Math.min(A.h - f.r, y));
      const L = R.dist(from.x, from.y, x, y);
      if (L < 1) return;
      f.face = Math.atan2(y - from.y, x - from.x);
      let to = null;
      for (let s = L; s > 4; s -= 6) { const px = from.x + ((x - from.x) * s) / L, py = from.y + ((y - from.y) * s) / L; if (!b.blocked(f, px, py)) { to = { x: px, y: py }; break; } }
      if (!to) return;
      f.x = to.x; f.y = to.y;
      b.emit({ type: "leap", unit: f, from, to, duration: dur, height: 4 });
    },
    // 魚的一個動作，回傳花掉的行動點（0＝沒事做）。ap＝現在還有幾點
    fishAct(b, u, f, i, ap = 9) {
      const S = STAGES[f.stage], mult = upg(u).q2 === "fangs" ? 1.3 : 1;
      // 先吃掉身邊的泡泡（不花行動點）
      this.eat(b, u, f, (z) => R.dist(z.x, z.y, f.x, f.y) <= 120);
      const foes = b.targetsFor(u).filter((e) => e.alive);
      if (!foes.length) {
        // 沒有敵人：去吃最近的泡泡
        const z = this.bubbles(b).sort((a, c) => R.dist(a.x, a.y, f.x, f.y) - R.dist(c.x, c.y, f.x, f.y))[0];
        if (!z) return 0;
        const d = R.dist(z.x, z.y, f.x, f.y), k = Math.min(1, S.swim / d), fx0 = f.x, fy0 = f.y;
        this.swim(b, f, f.x + (z.x - f.x) * k, f.y + (z.y - f.y) * k);
        this.eat(b, u, f, (q) => R.geo.pointSeg(q.x, q.y, fx0, fy0, f.x, f.y) <= 50);
        return 1;
      }
      const e = foes.sort((a, c) => R.dist(a.x, a.y, f.x, f.y) - R.dist(c.x, c.y, f.x, f.y))[0];
      const d = R.dist(e.x, e.y, f.x, f.y), near = e.r + 18 * S.size;
      // 墨魚：遠距離噴墨（麻痺），2 點
      if (S.ink && !f.cd && ap >= 2 && d > 140 && d <= S.ink.range) {
        f.cd = S.ink.cd; f.face = Math.atan2(e.y - f.y, e.x - f.x);
        b.say(`${S.name}朝 ${e.name} 噴墨！`);
        b.emit({ type: "ink", x1: f.x, y1: f.y, x2: e.x, y2: e.y });
        b.damage(u, e, S.ink.base, mult, "（噴墨）");
        if (e.alive) { e.state.slowUntil = b.round + 1; e.state.slowMult = S.ink.slow; b.emit({ type: "buff", unit: e, text: "麻痺", color: "#2a2a4a" }); }
        return 2;
      }
      // 虎鯨：衝刺啃咬，2 點
      if (S.bite && !f.cd && ap >= 2 && d <= S.bite.range) {
        f.cd = S.bite.cd;
        const fx0 = f.x, fy0 = f.y, ang = Math.atan2(f.y - e.y, f.x - e.x) + [0, -0.7, 0.7][i % 3];
        this.swim(b, f, e.x + Math.cos(ang) * near, e.y + Math.sin(ang) * near, 0.3);
        f.face = Math.atan2(e.y - f.y, e.x - f.x);
        this.eat(b, u, f, (q) => R.geo.pointSeg(q.x, q.y, fx0, fy0, f.x, f.y) <= 60);
        b.say(`${S.name}衝刺啃咬 ${e.name}！`);
        b.emit({ type: "sfx", sound: SND.whale, rate: 1.6 });
        b.emit({ type: "bite", x: e.x, y: e.y, delay: 0.3 });
        b.damage(u, e, S.bite.base, mult, "（衝刺啃咬）");
        return 2;
      }
      // 已經貼著敵人：撞擊，1 點
      if (d <= near + 6) {
        f.face = Math.atan2(e.y - f.y, e.x - f.x);
        b.emit({ type: "fishRam", x: e.x, y: e.y });
        b.damage(u, e, S.ram, mult, `（${S.name}撞擊）`);
        return 1;
      }
      // 游過去（第二、三隻魚從旁邊繞過去，不會疊在一起），1 點
      const side = [0, -0.7, 0.7][i % 3], ang = Math.atan2(f.y - e.y, f.x - e.x) + side;
      const dest = { x: e.x + Math.cos(ang) * near, y: e.y + Math.sin(ang) * near }, dd = R.dist(dest.x, dest.y, f.x, f.y), k = dd > 0 ? Math.min(1, S.swim / dd) : 0;
      const fx0 = f.x, fy0 = f.y;
      this.swim(b, f, f.x + (dest.x - f.x) * k, f.y + (dest.y - f.y) * k);
      f.face = Math.atan2(e.y - f.y, e.x - f.x);
      this.eat(b, u, f, (q) => R.geo.pointSeg(q.x, q.y, fx0, fy0, f.x, f.y) <= 50);
      return fx0 === f.x && fy0 === f.y ? 0 : 1;     // 被擋住游不動就結束
    },
    // 魚自己的回合：照行動點一個動作一個動作做（小魚 2、墨魚 3、虎鯨 4）
    async summonTurn(b, f) {
      if (f.kind !== "ghostFish") return;
      const u = b.player, i = fishOf(u).indexOf(f);
      if (f.cd > 0) f.cd--;
      for (let guard = 0; guard < 8 && f.alive && f.ap > 0; guard++) {
        const cost = this.fishAct(b, u, f, i, f.ap);
        if (!cost) break;
        f.ap -= cost;
        b.emit();
        await b.wait(0.55);
        if (b.phase === "over" || b.dead) return;
      }
      f.ap = 0;
    },
    // 魚群出擊：每隻魚馬上做兩個動作（不用行動點）
    schoolAct(b, u) {
      fishOf(u).forEach((f, i) => { for (let k = 0; k < 2 && f.alive; k++) if (!this.fishAct(b, u, f, i)) break; });
    },
    // 放出一隻小幽靈魚（場上的召喚物：會被攻擊、會吸引敵人的火力）
    spawnFish(b, u, x, y) {
      const S = STAGES[0], probe = { r: S.r };
      let spot = null;
      for (let k = 0; k < 24 && !spot; k++) { const a = k * 2.4, d = k ? 18 + k * 6 : 0, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d; if (!b.blocked(probe, px, py)) spot = { x: px, y: py }; }
      if (!spot) return null;
      const f = b.spawnSpecial("player", "ghostFish", { name: S.name, hp: 1, atk: 0, df: 0, spd: 0, ap: 0, r: S.r }, spot.x, spot.y,
        { summon: true, decoy: true, owner: u, eaten: 0, stage: 0, cd: 0, face: u.facing ?? -Math.PI / 2, born: Math.random() * 1000 });
      f.maxHp = f.hp = Math.max(5, Math.round(u.maxHp * S.hp)); f.df = u.df; f.r = S.r; f.maxAp = S.ap; f.ap = 0;
      f.spd = u.spd;
      (u.state.fish = fishOf(u)).push(f);
      b.joinOrder(f, u);                      // 排在蒼幽後面，有自己的回合
      return f;
    },
    onSummonDeath(b, f) {
      if (f.kind !== "ghostFish") return;
      const u = b.player;
      u.state.fish = fishOf(u);
      b.say(`${f.name}被打散了……（吃掉的泡泡 ${f.eaten} 顆，要重新養）`);
    },

    // ===== 海馬先生 =====
    onTurnStart(b, unit) {
      if (unit !== b.player) return;
      const h = unit.state.seahorse;
      if (!h) return;
      const t = h.follow?.alive ? h.follow : unit;
      const sk = this.skills.seahorse, up = upg(unit);
      const amt = Math.round((sk.shield + unit.atk * 0.3) * (up.e1 === "thick" ? 1.5 : 1));
      b.emit({ type: "seaPuff", unit: t });
      b.addShield(t, amt, "（海馬先生吐的泡泡）");
      if (up.e2 === "soothe") b.heal(t, 3, "（泡泡浴）");
      if (up.e1 === "spit") {
        const e = b.targetsFor(unit).filter((x) => x.alive).sort((a, c) => R.dist(a.x, a.y, t.x, t.y) - R.dist(c.x, c.y, t.x, t.y))[0];
        if (e) {
          const a = Math.atan2(e.y - t.y, e.x - t.x);
          this.shootBubbles(b, unit, [-0.12, 0, 0.12].map((o) => ({ x: t.x, y: t.y, dx: Math.cos(a + o), dy: Math.sin(a + o), len: 300 })), 3, "（海馬先生的泡泡）");
        }
      }
      h.turns--;
      if (h.turns <= 0) { unit.state.seahorse = null; b.say("海馬先生游走了"); }
    },

    skills: {
      // ---------- 普攻 泡沫散射 ----------
      foam: {
        name: "泡沫散射", slot: "普攻", key: "a", sound: SND.bubble,
        tags: ["projectile"],
        ap: 1, range: 270, halfDeg: 16, count: 7, base: 3,
        desc: "朝前方細長扇形丟出 7 顆泡泡。泡泡打中敵人會破裂造成傷害，沒打中會留在場上（敵人走過會踩破；幽靈魚會吃掉）",
        rays(u, arg) {
          const d = dirOf(u, arg), n = this.count, half = this.halfDeg * DEG, out = [];
          for (let i = 0; i < n; i++) {
            const a = d.ang + (n > 1 ? -half + (2 * half * i) / (n - 1) : 0);
            out.push({ x: u.x, y: u.y, dx: Math.cos(a), dy: Math.sin(a), len: this.range * (0.82 + 0.18 * ((i * 37) % 7) / 6) });
          }
          return { d, out };
        },
        status(b, u) { return { ready: true, cost: this.ap, label: this.name, aim: { type: "enemy", range: this.range, free: true, sector: { radius: this.range, half: this.halfDeg * DEG } } }; },
        predict(b, u, arg) {
          const t = arg.target;
          if (t && (!t.alive || t.team === u.team)) err("請點選一個敵人");
          const sec = { x: u.x, y: u.y, ang: dirOf(u, arg).ang, half: this.halfDeg * DEG, radius: this.range };
          return b.targetsFor(u).filter((e) => R.geo.inSector(e.x, e.y, sec, e.r));
        },
        preview(b, u, arg) {
          const { out } = this.rays(u, arg);
          return { shapes: out.map((s) => ({ shape: "line", x1: s.x, y1: s.y, x2: s.x + s.dx * s.len, y2: s.y + s.dy * s.len, width: 12 })), hits: this.predict(b, u, arg) };
        },
        use(b, u, arg) {
          const { d, out } = this.rays(u, arg);
          u.facing = d.ang;
          b.say(`${u.name}「泡沫散射」`);
          b.emit({ type: "sfx", sound: this.sound });
          const n = C.shootBubbles(b, u, out, this.base, "（泡泡破裂）");
          if (!n) b.say("泡泡飄在空中……");
        },
      },

      // ---------- Q 召喚魚群 ----------
      school: {
        name: "召喚魚群", slot: "Q", key: "q", sound: SND.bubble,
        tags: ["summon"],
        ap: 1, mp: 20, cooldown: 2,
        desc: "在左右兩邊各召喚一隻幽靈魚（召喚物，會被攻擊，被打死就要重養）。魚有自己的回合（排在蒼幽後面，小魚 2 行動點）：吃掉身邊的泡泡、找敵人撞過去；吃 15 顆進化成幽靈墨魚（3 行動點，遠距離噴墨麻痺），再吃 15 顆變成幽靈虎鯨（4 行動點，傷害更高，衝刺啃咬）。一回合只會進化一階。魚群沒有全滅時再用＝只補小魚補滿；魚群全員都在＝「魚群出擊」：每隻魚馬上做兩個動作",
        slots(u) { return upg(u).q1 === "trio" ? 3 : 2; },
        status(b, u) {
          const cd = u.cd.school || 0, n = fishOf(u).length, label = n >= this.slots(u) ? "魚群出擊" : n ? "補充小魚" : this.name;
          if (cd > 0) return { ready: false, cost: this.ap, mp: this.mp, label, note: `CD ${cd}`, reason: `冷卻中（還要 ${cd} 次行動）` };
          if (u.mp < this.mp) return { ready: false, cost: this.ap, mp: this.mp, label, note: `${this.mp} MP`, reason: "魔力不足" };
          return { ready: true, cost: this.ap, mp: this.mp, label, note: `${this.mp} MP`, aim: { type: "none" } };
        },
        predict() { return []; },
        preview(b, u) { return { shapes: [{ shape: "circle", x: u.x, y: u.y, radius: 80, color: "#3a7bd5" }], hits: [] }; },
        use(b, u) {
          b.setCooldown(u, "school", this.cooldown);
          b.emit({ type: "sfx", sound: this.sound });
          const have = fishOf(u).length, slots = this.slots(u);
          if (have >= slots) { b.say(`${u.name}：魚群出擊`); C.schoolAct(b, u); return; }
          const a = u.facing ?? -Math.PI / 2, px = -Math.sin(a), py = Math.cos(a);
          const spots = [[px * 60, py * 60], [-px * 60, -py * 60], [-Math.cos(a) * 60, -Math.sin(a) * 60]].slice(0, slots);
          let n = 0;
          for (const [ox, oy] of spots) if (fishOf(u).length < slots && !fishOf(u).some((f) => R.dist(f.x, f.y, u.x + ox, u.y + oy) < 30)) { const f = C.spawnFish(b, u, u.x + ox, u.y + oy); if (f) { n++; b.emit({ type: "summon", unit: f }); } }
          b.say(have ? `${u.name}「召喚魚群」：補了 ${n} 隻小魚` : `${u.name}「召喚魚群」：幽靈魚游了出來`);
        },
      },

      // ---------- E 海馬先生 ----------
      seahorse: {
        name: "海馬先生", slot: "E", key: "e", sound: SND.bubble,
        tags: ["summon", "shield"],
        ap: 1, mp: 25, cooldown: 3, range: 320, shield: 8, turns: 4,
        desc: "丟出海馬先生，跟著自己（或點選範圍內的隊友），每次輪到蒼幽時吐泡泡給護盾（持續 4 回合）",
        pick(b, u, arg) {
          const near = Number.isFinite(arg?.x) ? b.allies().filter((a) => a.alive && R.dist(a.x, a.y, arg.x, arg.y) <= a.r + 30 && R.dist(a.x, a.y, u.x, u.y) <= this.range)[0] : null;
          return near || u;
        },
        status(b, u) {
          const cd = u.cd.seahorse || 0;
          if (cd > 0) return { ready: false, cost: this.ap, mp: this.mp, label: this.name, note: `CD ${cd}`, reason: `冷卻中（還要 ${cd} 次行動）` };
          if (u.mp < this.mp) return { ready: false, cost: this.ap, mp: this.mp, label: this.name, note: `${this.mp} MP`, reason: "魔力不足" };
          return { ready: true, cost: this.ap, mp: this.mp, label: this.name, note: `${this.mp} MP`, aim: b.allies().length ? { type: "point", range: this.range } : { type: "none" } };
        },
        predict() { return []; },
        preview(b, u, arg) { const t = this.pick(b, u, arg); return { shapes: [{ shape: "circle", x: t.x, y: t.y, radius: (t.r || 20) + 22, color: "#3a7bd5" }], hits: [], allies: [t] }; },
        use(b, u, arg) {
          const t = this.pick(b, u, arg);
          b.setCooldown(u, "seahorse", this.cooldown);
          u.state.seahorse = { follow: t, turns: this.turns + (upg(u).e2 === "loyal" ? 2 : 0), born: now() };
          b.emit({ type: "sfx", sound: this.sound });
          b.say(`${u.name} 丟出了海馬先生${t === u ? "" : `，跟著 ${t.name}`}`);
          // 丟出去的時候先吐一次
          const amt = Math.round((this.shield + u.atk * 0.3) * (upg(u).e1 === "thick" ? 1.5 : 1));
          b.emit({ type: "seaPuff", unit: t });
          b.addShield(t, amt, "（海馬先生吐的泡泡）");
        },
      },

      // ---------- W 蝠鱝夫人 ----------
      manta: {
        name: "蝠鱝夫人", slot: "W", key: "w", ultimate: true, sound: SND.bubble,
        tags: ["summon", "projectile", "area"],
        ap: 2, mp: 35, charge: 5, range: 380, width: 116, base: 12, spray: 12, sprayLen: 160, sprayBase: 3,
        desc: "向前方丟出一隻大蝠鱝（寬 116），撞擊路上的敵人，飛到底時向周圍噴射 12 顆泡泡（打中破裂，沒打中留在場上）",
        path(u, arg) { const d = dirOf(u, arg); return { d, x2: u.x + d.dx * this.range, y2: u.y + d.dy * this.range }; },
        status(b, u) {
          if (u.charge < this.charge) return { ready: false, cost: this.ap, mp: this.mp, label: this.name, note: `${u.charge}/${this.charge}`, reason: `還要 ${this.charge - u.charge} 次行動才能使用` };
          if (u.mp < this.mp) return { ready: false, cost: this.ap, mp: this.mp, label: this.name, note: `${this.mp} MP`, reason: "魔力不足" };
          return { ready: true, cost: this.ap, mp: this.mp, label: this.name, note: `${this.mp} MP`, aim: { type: "direction" } };
        },
        predict(b, u, arg) { const p = this.path(u, arg); return b.targetsFor(u).filter((e) => R.geo.pointSeg(e.x, e.y, u.x, u.y, p.x2, p.y2) <= this.width / 2 + e.r); },
        preview(b, u, arg) {
          const p = this.path(u, arg);
          return { shapes: [{ shape: "line", x1: u.x, y1: u.y, x2: p.x2, y2: p.y2, width: this.width }, { shape: "circle", x: p.x2, y: p.y2, radius: this.sprayLen }], hits: this.predict(b, u, arg) };
        },
        areaCenter(b, u, arg) { const p = this.path(u, arg); return { x: p.x2, y: p.y2 }; },
        use(b, u, arg) {
          const p = this.path(u, arg), hits = this.predict(b, u, arg);
          u.charge = 0; u.facing = p.d.ang;
          b.say(`${u.name}「蝠鱝夫人」！`);
          b.emit({ type: "sfx", sound: SND.whale });
          b.emit({ type: "manta", x1: u.x, y1: u.y, x2: p.x2, y2: p.y2 });
          for (const e of hits) if (e.alive) b.damage(u, e, this.base, 1, "（蝠鱝撞擊）");
          if (upg(u).w1 === "escort" && hits.length) b.addShield(u, 6 * hits.length, "（夫人的護衛）");
          const n = upg(u).w1 === "storm" ? 20 : this.spray, list = [];
          for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + p.d.ang; list.push({ x: p.x2, y: p.y2, dx: Math.cos(a), dy: Math.sin(a), len: this.sprayLen * (0.7 + 0.3 * ((i * 53) % 10) / 10) }); }
          setTimeout(() => b.emit({ type: "sfx", sound: this.sound }), 600);
          C.shootBubbles(b, u, list, this.sprayBase, "（蝠鱝噴射的泡泡）", 0.6);
        },
      },
    },

    // ===== 畫面 =====
    fxEvents: {
      bubbles: (ev) => 520,
      ink: () => 600,
      bite: () => 450,
      fishRam: () => 380,
      manta: () => 700,
      seaPuff: () => 700,
      fishEvolve: () => 900,
    },
    drawFx(ctx, ev, k, t, H) {
      switch (ev.type) {
        case "bubbles":
          for (const s of ev.list) {
            const q = Math.min(1, k / 0.7), x = s.x1 + (s.x2 - s.x1) * q, y = s.y1 + (s.y2 - s.y1) * q;
            if (s.pop && q >= 1) { ctx.globalAlpha = 1 - (k - 0.7) / 0.3; for (let i = 0; i < 6; i++) { const a = i * 1.05; H.line(x + Math.cos(a) * 8, y + Math.sin(a) * 8, x + Math.cos(a) * 16, y + Math.sin(a) * 16, "#7ec8f0", 2); } }
            else if (q < 1) { ctx.globalAlpha = 1; drawBubble(ctx, x, y, 9, t); }
          }
          break;
        case "ink": {
          const q = Math.min(1, k * 1.6);
          ctx.globalAlpha = 1 - k * 0.6; H.line(ev.x1, ev.y1, ev.x1 + (ev.x2 - ev.x1) * q, ev.y1 + (ev.y2 - ev.y1) * q, "#2a2a4a", 7);
          if (q >= 1) { ctx.fillStyle = "rgba(30,30,60,.55)"; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(ev.x2 + Math.cos(i * 1.3) * 14, ev.y2 + Math.sin(i * 1.3) * 10, 9, 0, Math.PI * 2); ctx.fill(); } }
          break;
        }
        case "bite": case "fishRam": {
          const big = ev.type === "bite";
          H.circle(ev.x, ev.y, (big ? 34 : 22) + k * 18, big ? "#1f3a8a" : "#7ec8f0", null, big ? 5 : 3);
          if (big) { ctx.strokeStyle = "#e8f4ff"; ctx.lineWidth = 3; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(ev.x + i * 9 - 4, ev.y - 14); ctx.lineTo(ev.x + i * 9, ev.y - 4); ctx.lineTo(ev.x + i * 9 + 4, ev.y - 14); ctx.stroke(); } }
          break;
        }
        case "manta": {
          const q = Math.min(1, k / 0.85), x = ev.x1 + (ev.x2 - ev.x1) * q, y = ev.y1 + (ev.y2 - ev.y1) * q, a = Math.atan2(ev.y2 - ev.y1, ev.x2 - ev.x1);
          ctx.globalAlpha = q >= 1 ? 1 - (k - 0.85) / 0.15 : 0.85;
          drawManta(ctx, x, y, a, t);
          break;
        }
        case "seaPuff": {
          const u = ev.unit;
          for (let i = 0; i < 5; i++) { const q = (k + i * 0.18) % 1; ctx.globalAlpha = 1 - q; drawBubble(ctx, u.x + 26 - q * 26 + Math.sin(i * 2) * 8, u.y - 30 + q * 20, 6 + i, t); }
          H.circle(u.x, u.y, (u.r || 20) + 10 + k * 10, "#7ec8f0", null, 3);
          break;
        }
        case "fishEvolve": H.circle(ev.x, ev.y, 30 + k * 50, "#3a7bd5", null, 4); H.label(STAGES[ev.stage].name, ev.x, ev.y - 40 - k * 20, "#1f3a8a", 14); break;
      }
    },
    // 魚群（召喚物）：自己畫，血條＋吃了幾顆
    drawSummon(ctx, f, t, H) {
      if (f.kind !== "ghostFish") return false;
      const p = H.pos(f), S = STAGES[f.stage], y = p.y + Math.sin(t / 380 + f.born) * 4;
      drawFish(ctx, p.x, y, f.face || 0, f.stage, t, f.munch && t - f.munch < 900);
      const w = 18 + S.r * 1.4, by = p.y + S.r + 14;
      ctx.fillStyle = "rgba(29,29,31,.15)"; ctx.fillRect(p.x - w / 2, by, w, 4);
      ctx.fillStyle = "#3a7bd5"; ctx.fillRect(p.x - w / 2, by, (w * Math.max(0, f.hp)) / f.maxHp, 4);
      ctx.globalAlpha = 0.8; H.label(`${S.name}・${f.eaten}`, p.x, by + 12, "#1f3a8a", 10); ctx.globalAlpha = 1;
      return true;
    },
    summonInfo(f) {
      if (f.kind !== "ghostFish") return null;
      const S = STAGES[f.stage], next = f.stage < 2 ? `${C.need(f.owner, f.stage)} 顆進化成${STAGES[f.stage + 1].name}` : "已經是最終型態";
      return [["生命", `${f.hp} / ${f.maxHp}`], ["吃了", `${f.eaten} 顆泡泡（${next}）`], ["行動點", S.ap], ["撞擊", S.ram], ...(S.ink ? [["噴墨", `${S.ink.range} 內，麻痺`]] : []), ...(S.bite ? [["衝刺啃咬", `${S.bite.range} 內，傷害 ${S.bite.base}`]] : []), ["說明", "會吸引敵人的火力；被打死就要重養"]];
    },
    drawBattle(ctx, t, b, H) {
      const u = b.player;
      // 留在場上的泡泡
      for (const z of b.zones) if (z.type === "bubble" && t >= z.born) { ctx.globalAlpha = z.turnsLeft <= 0 ? 0.55 : 0.9; drawBubble(ctx, z.x, z.y + Math.sin(t / 500 + z.x) * 3, z.r * 0.8, t); }
      ctx.globalAlpha = 1;
      // 海馬先生
      const h = u.state.seahorse;
      if (h) {
        const fo = h.follow?.alive ? h.follow : u, p = H.pos ? H.pos(fo) : fo;
        drawSeahorse(ctx, p.x + (fo.r || 20) + 14, p.y - (fo.r || 20) - 6 + Math.sin(t / 300) * 4, t);
      }
    },
  };

  // ---------- 畫圖 ----------
  function drawBubble(ctx, x, y, r, t) {
    ctx.save();
    ctx.fillStyle = "rgba(170,220,250,.28)"; ctx.strokeStyle = "rgba(90,160,220,.9)"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // 魚群：畫的時候頭朝上（-y），再轉到面向的方向。大小照設定圖：小魚 ≈ 40、墨魚 ≈ 62、虎鯨 ≈ 107
  const FILL = "#3f48cc", EDGE = "#8fd3ea";
  function drawFish(ctx, x, y, a, stage, t, munch) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2);
    ctx.globalAlpha *= 0.9;
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, [24, 34, 60][stage]); glow.addColorStop(0, "rgba(143,211,234,.45)"); glow.addColorStop(1, "rgba(143,211,234,0)");
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, [24, 34, 60][stage], 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = FILL; ctx.strokeStyle = EDGE; ctx.lineWidth = 2; ctx.lineJoin = "round";
    const wag = Math.sin(t / 130);
    if (stage === 0) {
      // 小魚：細長的橢圓身體＋三角形尾巴
      ctx.save(); ctx.translate(0, 9); ctx.rotate(wag * 0.3);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-7.5, 12); ctx.lineTo(7.5, 12); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      ctx.beginPath(); ctx.ellipse(0, -5, 5.5, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = EDGE; ctx.beginPath(); ctx.arc(-1, -13, 1.4, 0, Math.PI * 2); ctx.fill();
    } else if (stage === 1) {
      // 墨魚：圓角長方形身體，前面四條彎彎的觸手（外側兩條大、內側兩條小）
      ctx.lineWidth = 2.6; ctx.strokeStyle = EDGE;
      for (const [sx, big] of [[-1, 1], [1, 1], [-1, 0], [1, 0]]) {
        const sw = Math.sin(t / 200 + sx + big) * 2;
        ctx.beginPath();
        if (big) { ctx.moveTo(sx * 10, -14); ctx.quadraticCurveTo(sx * 16 + sw, -24, sx * 12 + sw, -33); }
        else { ctx.moveTo(sx * 4, -14); ctx.quadraticCurveTo(sx * 6 + sw, -22, sx * 3, -25); }
        ctx.stroke();
      }
      ctx.lineWidth = 2;
      roundRect(ctx, -12, -14, 24, 42, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = EDGE; ctx.beginPath(); ctx.arc(-6, -6, 1.8, 0, Math.PI * 2); ctx.arc(6, -6, 2.2, 0, Math.PI * 2); ctx.fill();
    } else {
      // 虎鯨：長身體、兩塊淺色眼斑、中間一條白線、會擺動的胸鰭、尾鰭
      const fin = wag * 0.28;
      for (const sx of [-1, 1]) {
        ctx.save(); ctx.translate(sx * 16, -28); ctx.rotate(-sx * (0.45 + fin));
        roundRect(ctx, sx > 0 ? 0 : -10, 0, 10, 34, 3); ctx.fill(); ctx.stroke(); ctx.restore();
      }
      ctx.save(); ctx.translate(0, 44); ctx.rotate(wag * 0.12);
      ctx.beginPath(); ctx.moveTo(0, -4); ctx.quadraticCurveTo(-14, 6, -30, 12); ctx.quadraticCurveTo(-8, 10, 0, 8); ctx.quadraticCurveTo(8, 10, 30, 12); ctx.quadraticCurveTo(14, 6, 0, -4); ctx.fill(); ctx.stroke(); ctx.restore();
      ctx.beginPath(); ctx.moveTo(-17, -40); ctx.quadraticCurveTo(-17, -52, 0, -52); ctx.quadraticCurveTo(17, -52, 17, -40); ctx.lineTo(17, 18); ctx.quadraticCurveTo(10, 34, 3, 44); ctx.lineTo(-3, 44); ctx.quadraticCurveTo(-10, 34, -17, 18); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = EDGE;
      ctx.beginPath(); ctx.ellipse(-10, -38, 2.4, 6, 0, 0, Math.PI * 2); ctx.ellipse(10, -38, 2.4, 6, -0.15, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, -10, 1.8, 15, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (munch) { ctx.strokeStyle = EDGE; ctx.lineWidth = 1.5; const fy = [-20, -36, -54][stage]; ctx.beginPath(); ctx.arc(0, fy, 4, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function drawSeahorse(ctx, x, y, t) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = "rgba(240,190,90,.9)"; ctx.strokeStyle = "#a8641a"; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -12); ctx.quadraticCurveTo(8, -12, 6, -4); ctx.quadraticCurveTo(2, 2, 5, 8); ctx.quadraticCurveTo(6, 15, 0, 15); ctx.quadraticCurveTo(-4, 12, 0, 10);
    ctx.quadraticCurveTo(-4, 4, -3, -4); ctx.quadraticCurveTo(-4, -10, 0, -12); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5, -10); ctx.lineTo(12, -9); ctx.lineTo(6, -6); ctx.fill(); ctx.stroke();     // 嘴
    ctx.fillStyle = "#3a2a10"; ctx.beginPath(); ctx.arc(2, -8, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    drawBubble(ctx, x + 14, y - 16 - ((t / 40) % 14), 3.5, t);
  }
  // 蝠鱝夫人：淺藍色的大圓弧身體、兩隻大眼睛、一條細長的尾巴（照設定圖，寬約 116）
  function drawManta(ctx, x, y, a, t) {
    const flap = Math.sin(t / 110);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2);
    ctx.strokeStyle = FILL; ctx.lineWidth = 2.5; ctx.lineJoin = "round";
    // 尾巴（細長、彎彎的兩條線）
    ctx.beginPath(); ctx.moveTo(-1, 34);
    for (let i = 1; i <= 8; i++) ctx.lineTo(Math.sin(i * 0.8 + t / 120) * 4 * (i / 8) - 2, 34 + i * 9.5);
    ctx.stroke();
    ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(1, 34);
    for (let i = 1; i <= 8; i++) ctx.lineTo(Math.sin(i * 0.8 + t / 120) * 4 * (i / 8) + 1, 34 + i * 9.5);
    ctx.stroke();
    // 身體：翅尖隨拍動上下
    const tip = 4 + flap * 6;
    ctx.fillStyle = "#9ad8ea"; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-57, 6 + tip);
    ctx.quadraticCurveTo(-60, -22, -30, -32); ctx.quadraticCurveTo(0, -42, 30, -32); ctx.quadraticCurveTo(60, -20, 57, 10 + tip);
    ctx.quadraticCurveTo(54, 21, 44, 18); ctx.quadraticCurveTo(26, 16, 16, 20); ctx.quadraticCurveTo(6, 28, 0, 35);
    ctx.quadraticCurveTo(-6, 28, -16, 18); ctx.quadraticCurveTo(-30, 16, -44, 15); ctx.quadraticCurveTo(-56, 16, -57, 6 + tip);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // 眼睛
    for (const sx of [-1, 1]) {
      ctx.strokeStyle = "#1aa3e8"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx * 26, -16, 4.5, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#1aa3e8"; ctx.beginPath(); ctx.arc(sx * 26 + 1, -15, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  R.CHARACTERS[C.id] = C;
})();
