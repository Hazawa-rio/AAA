/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/characters/miyahime.js": "20261122024623" });
// 角色：彌華姬（卡池角色・若色組組長・毒）
// 三代目若色組組長。男扮女裝隱藏自己是被肅清的初代組長長子的身分；唯一信任的是親手「培養」的人造人最高顧問・渡冥隱子（簡介是使用者寫的）
// 中毒（這個角色帶進來的狀態）：每層每回合扣「姬的最大生命 × 1.2%」，最多 50 層；被中毒的單位在自己的回合開始時扣血，之後少 1 層
// 被動「殘忍手段」：對生命低於 50% 的敵人傷害 +30%（中毒的傷害也算）
// 普攻「射出毒針」：揮動鐵扇，扇形射出三根毒針（傷害很低，每根打中＋1 層中毒）
// Q「致命飛羽」：丟出鐵扇，轉著飛到指定的終點；碰到敵人或牆就停下，原地旋轉後向四周射出一圈毒針（2 層中毒，同一個目標只算一次）
//   強化 1：鴆羽飄然（環狀毒針→毒霧：沒有傷害，＋3 層）／暗烏低飛（射程變長、飛行傷害變高，飛行中打中＋2 層）
//   強化 2：特調劇毒（旋轉爆發的層數 +1）／無孔不入（旋轉爆發穿過牆）
// E「向冥之河」：在身邊召喚顧問渡冥隱子，朝前方噴一口毒霧（緩速＋中毒），然後毒霧和顧問一起消失
//   強化 1：駛向黃泉（姬揮扇子把毒霧搧到遠處）／護衛組長（毒霧擊退敵人）
//   強化 2：無禮懲戒（中毒層數 +1）／效忠之心（使用時回復一點生命）
// W「彌生艷華」：瞄準大範圍裡所有中毒的敵人，蓄力一回合（下一次輪到自己時）連續揮扇射出淬毒苦無，最多 5 發
//   強化（二選一）：啼哭之雀（從扇子裡抽出太刀蓄力，蓄力完瞄準最近的中毒敵人揮出大型刀光：清除命中敵人的中毒，結算剩下中毒傷害的 1.2 倍）
//                    黑冥散華（蓄力完顧問出現在身後，放出和苦無一樣多的毒霧，讓姬一起搧出去）
// 樣子（使用者的設計圖）：姬＝黃色方塊「彌」；顧問＝灰色方塊「冥」；毒霧＝淡紫色的雲；姬搧扇子＝紅色的弧線
// 數值都是暫定；個性台詞之後由使用者提供；音效暫用現有的
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
    return { dx: (t.x - u.x) / L, dy: (t.y - u.y) / L, ang: Math.atan2(t.y - u.y, t.x - u.x), len: L };
  };
  const heavy = (e) => e.def.boss || e.def.bigBar || e.def.trial || e.part || e.def.block;
  const SND = { needle: "sounds/vivilla-throw.mp3", fan: "sounds/alpha-spin.mp3", burst: "sounds/firsler-burst.mp3", mist: "sounds/vivilla-spore.mp3", gust: "sounds/marika-whip.mp3", kunai: "sounds/ilshu-thrust.mp3", draw: "sounds/ilshu-slash.mp3", wave: "sounds/ilshu-slash-strong.mp3", heal: "sounds/guan-chime.mp3" };
  const COL = "#f2b52a", ADV = "#9e9e9e", MIST = "#c6bfe6", MIST_D = "#8f84c4", POI = "#7a5ab8", FAN_RED = "#e8262c";
  const FLY = { r: 2, def: { fly: true } };          // 飛行物：只被真正的障礙物（貨架、柱子）擋住，矮牆擋不住

  // ===== 中毒 =====
  const PZ = { per: 0.012, max: 50, decay: 1 };      // 每層＝姬最大生命的 1.2%；最多 50 層；每次扣血後少 1 層
  const low = (e) => e.hp < e.maxHp * 0.5;
  const canPoison = (e) => e && e.alive && !e.npc && !e.cage;
  function addPoison(b, e, n, delay = 0) {
    if (!canPoison(e) || n <= 0) return 0;
    const before = e.state.poison || 0, after = Math.min(PZ.max, before + n);
    e.state.poison = after;
    if (after > before) b.emit({ type: "buff", unit: e, text: `中毒 +${after - before}（${after}）`, color: POI, delay });
    return after - before;
  }
  // 中毒每回合扣的血（姬的最大生命 × 每層% × 層數；生命低於一半再 +30%）
  function tickAmount(b, e, n) {
    const pl = b.player, k = low(e) ? 1 + C.passive.bonus : 1;
    return Math.max(1, Math.round(n * PZ.per * pl.maxHp * k));
  }
  // 剩下的中毒全部扣完一共會扣多少（每回合少 PZ.decay 層；不消退的話當作每回合少 1 層來算）
  function remaining(b, e) {
    let n = e.state.poison || 0, sum = 0;
    const d = Math.max(1, PZ.decay);
    while (n > 0) { sum += n; n -= d; }
    return sum * PZ.per * b.player.maxHp;
  }
  // 不經過攻擊力、防禦的直接扣血（中毒、毒的結算）
  function poisonHurt(b, e, amount, text, delay = 0) {
    if (!e.alive || e.state.invuln) return 0;
    e.hp = Math.max(0, e.hp - amount);
    b.say(text);
    b.emit({ type: "damage", unit: e, amount, boosted: low(e), delay });
    if (e.def.ai && e.alive) R.AI[e.def.ai]?.onHurt?.(b, e);
    if (e.hp <= 0 && e.def.noDeath) return amount;
    if (!e.alive) b.onDeath(e);
    return amount;
  }
  function tickPoison(b, e) {
    const n = e.state.poison || 0;
    if (!n || !e.alive) return;
    const amt = tickAmount(b, e, n);
    e.state.poison = Math.max(0, n - PZ.decay);
    b.emit({ type: "mhBubble", x: e.x, y: e.y, r: e.r });
    poisonHurt(b, e, amt, `${e.name} 中毒發作（${n} 層），受到 ${amt} 點傷害${low(e) ? "（殘忍手段）" : ""}`);
  }

  // ===== 路徑 =====
  // 從 (x,y) 朝 (dx,dy) 飛 L：第一個碰到的敵人（skip 不算）、或第一面牆；回傳停下的距離
  function ray(b, u, x, y, dx, dy, L, pad = 4, skip) {
    let hit = null, t = L;
    for (const e of b.targetsFor(u)) { if (e === skip || !e.alive) continue; const h = R.geo.rayCircle(x, y, dx, dy, e.x, e.y, e.r + pad); if (h !== null && h > 0 && h < t) { hit = e; t = h; } }
    const A = b.cfg.arena;
    for (let s = 8; s <= t; s += 6) {
      const px = x + dx * s, py = y + dy * s;
      if (px < 2 || py < 2 || px > A.w - 2 || py > A.h - 2 || b.obstacleAt(FLY, px, py)) { hit = null; t = Math.max(0, s - 4); break; }
    }
    return { hit, t, x: x + dx * t, y: y + dy * t };
  }
  // 兩點之間有沒有障礙物
  function clearLine(b, x1, y1, x2, y2) {
    const L = Math.hypot(x2 - x1, y2 - y1);
    for (let s = 10; s < L - 6; s += 8) if (b.obstacleAt(FLY, x1 + ((x2 - x1) / L) * s, y1 + ((y2 - y1) / L) * s)) return false;
    return true;
  }
  const inR = (e, x, y, r) => R.dist(e.x, e.y, x, y) <= r + e.r;

  const C = {
    id: "miyahime",
    name: "彌華姬",
    letter: "彌",
    color: COL,
    role: "遠程・毒（組長）",
    gacha: true,
    profile: "三代目若色組組長，心狠手辣、不擇手段的人。因為身形矮小、聲音中性，透過男扮女裝隱藏自己作為遭到肅清的初代組長長子的身分。善於使用陰險的手段，他的扇子能夠無限地藏入暗器。在人前十分虛偽，實際上從未信任任何人，唯一信任的對象是親自「培養」的人造人最高顧問・渡冥隱子。",
    desc: "三代目若色組組長。用藏著暗器的鐵扇讓敵人層層中毒，召喚顧問渡冥隱子噴出毒霧；對生命低於一半的敵人格外殘忍。",
    style: { role: "遠程・毒（組長）", text: "讓敵人一層一層中毒（最多 50 層）：中毒的敵人每回合扣「姬的最大生命 × 層數 × 1.2%」。毒針、致命飛羽、顧問的毒霧都會疊毒；彌生艷華瞄準所有中毒的敵人，蓄力一回合後射出淬毒苦無。對生命低於一半的敵人傷害 +30%。" },
    stats: { hp: 70, mp: 40, atk: 14, df: 2, spd: 13, ap: 6 },      // 暫定
    growth: { hp: 4, mp: 1, atk: 0.8, df: 0.25, spd: 0.1 },
    mpRegen: 0,
    field: {
      basicRange: 100,
      // 探索技能：射出毒針，迷暈遊蕩的魔物一段時間（不能觸發機關、陷阱）
      q: { name: "暗殺技術", type: "dart", sound: SND.needle, cd: 20, range: 420, speed: 1100, stun: 6, desc: "朝指定方向射出毒針：射中的魔物會暈眩一段時間（暈著的魔物碰到也不會開戰，可以從旁邊溜過去）；毒針沒辦法觸發機關" },
    },
    // 個性台詞（使用者提供；lines 是空的就不會說話）
    barks: {
      needle: { chance: 0.3, lines: [] },
      fan: { chance: 0.5, lines: [] },
      advisor: { chance: 0.7, lines: [] },
      ult: { chance: 0.95, lines: [] },
      release: { chance: 0.95, lines: [] },
      hurt: { chance: 0.3, lines: [] },
    },
    basic: "needle",
    ultimate: "yayoi",
    hud: { left: "plume", center: "yayoi", right: "river" },

    passive: {
      name: "殘忍手段",
      desc: "對生命低於 50% 的敵人造成的傷害 +30%（中毒每回合扣的血也算）",
      bonus: 0.3,
      status(b, u) {
        const n = b.targetsFor(u).filter((e) => e.alive && !e.npc && low(e)).length;
        return { text: n ? `${n} 個敵人生命低於一半・傷害 +${Math.round(C.passive.bonus * 100)}%` : "沒有生命低於一半的敵人", on: n > 0 };
      },
    },

    upgrades: {
      q: {
        skill: "plume",
        tiers: [
          [
            { id: "mist", name: "鴆羽飄然", desc: "旋轉爆發的環狀毒針改成一團範圍更大的毒霧：沒有傷害，但範圍裡的敵人＋3 層中毒" },
            { id: "low", name: "暗烏低飛", desc: "射程 ×1.4、鐵扇飛行時打中的傷害變高，而且飛行中打中的敵人＋2 層中毒" },
          ],
          [
            { id: "brew", name: "特調劇毒", desc: "旋轉爆發施加的中毒層數 +1" },
            { id: "pierce", name: "無孔不入", desc: "旋轉爆發可以穿過牆（貨架、柱子後面的敵人也打得到）" },
          ],
        ],
      },
      e: {
        skill: "river",
        tiers: [
          [
            { id: "yomi", name: "駛向黃泉", desc: "毒霧不會立刻消失：姬揮動扇子，把毒霧搧到更遠的地方，沿路的敵人也會被緩速、中毒" },
            { id: "guard", name: "護衛組長", desc: "毒霧會把敵人擊退" },
          ],
          [
            { id: "punish", name: "無禮懲戒", desc: "毒霧施加的中毒層數 +1" },
            { id: "loyal", name: "效忠之心", desc: "使用時回復一點生命（最大生命的 8%）" },
          ],
        ],
      },
      w: {
        skill: "yayoi",
        tiers: [
          [
            { id: "sparrow", name: "啼哭之雀", desc: "瞄準的回合從扇子中抽出一把太刀蓄力；蓄力完瞄準最近的中毒敵人揮出一道大型刀光（前方扇形＋往前拉長的長條）：清除命中敵人的中毒，並一口氣結算剩下中毒傷害的 1.2 倍" },
            { id: "dark", name: "黑冥散華", desc: "蓄力完畢時顧問出現在姬的身後，放出和苦無一樣多的毒霧，讓姬跟著苦無一起搧出去（每團毒霧：範圍內＋2 層中毒）" },
          ],
        ],
      },
    },

    // ===== 殘忍手段：生命低於一半的敵人傷害 +30% =====
    outgoingMult(b, src, dst) {
      if (!dst || dst === src || !low(dst)) return null;
      return { mult: 1 + C.passive.bonus, note: "（殘忍手段）" };
    },
    // 每個單位回合開始：中毒扣血（Boss 的部位跟著本體一起算）；輪到姬：放出蓄力好的彌生艷華
    onTurnStart(b, unit) {
      const u = b.player;
      for (const e of [unit, ...(unit.parts || [])]) if (e !== u && e.team !== "player" && e.alive && e.state?.poison > 0) tickPoison(b, e);
      if (unit === u && u.alive && u.state.yayoi) C.skills.yayoi.release(b, u);
    },

    tune: [
      ["中毒 每層（姬最大生命的比例）", "char", "poisonPer", 0, 0.05, 0.001],
      ["中毒 最多層數", "char", "poisonMax", 5, 99, 1],
      ["中毒 每回合消退層數", "char", "poisonDecay", 0, 5, 1],
      ["殘忍手段 增傷", "passive", "bonus", 0, 1, 0.05],
      ["射出毒針 每根", "needle", "base", 0, 20, 1],
      ["射出毒針 射程", "needle", "range", 100, 600, 10],
      ["致命飛羽 射程", "plume", "range", 120, 600, 10],
      ["致命飛羽 飛行傷害", "plume", "base", 0, 30, 1],
      ["致命飛羽 環狀毒針傷害", "plume", "ring", 0, 20, 1],
      ["致命飛羽 爆發範圍", "plume", "ringR", 40, 260, 5],
      ["向冥之河 毒霧距離", "river", "radius", 80, 400, 10],
      ["向冥之河 中毒層數", "river", "stacks", 0, 10, 1],
      ["彌生艷華 苦無傷害", "yayoi", "base", 0, 60, 1],
      ["彌生艷華 瞄準範圍", "yayoi", "range", 200, 800, 10],
      ["啼哭之雀 劍氣基礎", "yayoi", "slash", 0, 80, 1],
      ["啼哭之雀 結算倍率", "yayoi", "settle", 0, 3, 0.05],
    ],

    skills: {
      // ---------- 普攻 射出毒針 ----------
      needle: {
        name: "射出毒針", slot: "普攻", key: "a", sound: SND.needle,
        tags: ["projectile"],
        ap: 1, range: 320, base: 3, half: 10, speed: 1000, stacks: 1,
        desc: "揮動鐵扇，扇形射出三根毒針：傷害很低，但每根打中的毒針都讓敵人＋1 層中毒（中毒每回合扣血，最多疊 50 層）",
        get projectileSpeed() { return this.speed; },
        paths(b, u, arg) {
          const d = dirOf(u, arg);
          return [-1, 0, 1].map((i) => { const a = d.ang + i * this.half * DEG; return { a, ...ray(b, u, u.x, u.y, Math.cos(a), Math.sin(a), this.range) }; });
        },
        status() { return { ready: true, cost: this.ap, label: this.name, aim: { type: "enemy", range: this.range, free: true } }; },
        predict(b, u, arg) {
          const t = arg.target;
          if (t && (!t.alive || t.team === u.team)) err("請點選一個敵人");
          return [...new Set(this.paths(b, u, arg).map((p) => p.hit).filter(Boolean))];
        },
        preview(b, u, arg) {
          const ps = this.paths(b, u, arg);
          return { shapes: ps.map((p) => ({ shape: "line", x1: u.x, y1: u.y, x2: p.x, y2: p.y, width: 6, color: POI })), hits: this.predict(b, u, arg) };
        },
        use(b, u, arg) {
          const ps = this.paths(b, u, arg);
          u.facing = dirOf(u, arg).ang;
          b.say(`${u.name}「射出毒針」——鐵扇一揮，三根毒針飛了出去`);
          b.bark(u, "needle");
          b.emit({ type: "sfx", sound: this.sound });
          b.emit({ type: "mhSwing", x: u.x, y: u.y, ang: u.facing, r: 34 });
          const got = new Map();          // 同一個敵人被好幾根打中：中毒合在一起跳一次字
          ps.forEach((p, i) => {
            const fly = p.t / this.speed, dl = i * 0.04;
            b.emit({ type: "mhNeedle", x1: u.x, y1: u.y, x2: p.x, y2: p.y, dur: fly, delay: dl });
            if (!p.hit?.alive) return;
            b.hitDelay = fly + dl;
            b.damage(u, p.hit, this.base, 1, "（毒針）");
            b.hitDelay = 0;
            const g = got.get(p.hit) || { n: 0, at: 0 };
            got.set(p.hit, { n: g.n + this.stacks, at: Math.max(g.at, fly + dl) });
          });
          for (const [e, g] of got) addPoison(b, e, g.n, g.at);
          if (!got.size) b.say("……毒針沒有射中任何人");
        },
      },

      // ---------- Q 致命飛羽 ----------
      plume: {
        name: "致命飛羽", slot: "Q", key: "q", sound: SND.fan,
        tags: ["projectile", "area"],
        ap: 1, cooldown: 2, range: 300, base: 6, lowBase: 11, ring: 3, ringR: 110, stacks: 2, lowStacks: 2, mistR: 140, mistStacks: 3, speed: 520, spin: 0.35,
        desc: "丟出鐵扇，轉著飛到終點；碰到敵人或牆就停下，原地旋轉後向四周射出一圈毒針（範圍裡的敵人＋2 層中毒，同一個目標只算一次）",
        get projectileSpeed() { return this.speed; },
        rng(u) { return this.range * (R.upHas(upg(u), "low") ? 1.4 : 1); },
        // 鐵扇的路線：往終點飛，第一個碰到的敵人或牆就停
        path(b, u, arg) {
          const d = dirOf(u, arg), L = Math.min(this.rng(u), d.len);
          const r = ray(b, u, u.x, u.y, d.dx, d.dy, L, 6);
          return { d, ...r };
        },
        // 旋轉爆發會打到誰
        burst(b, u, p) {
          const mist = R.upHas(upg(u), "mist"), R0 = mist ? this.mistR : this.ringR, thru = R.upHas(upg(u), "pierce");
          return { mist, R0, list: b.targetsFor(u).filter((e) => e.alive && inR(e, p.x, p.y, R0) && (thru || clearLine(b, p.x, p.y, e.x, e.y))) };
        },
        status(b, u) {
          const cd = u.cd.plume || 0;
          if (cd > 0) return { ready: false, cost: this.ap, label: this.name, note: `CD ${cd}`, reason: `冷卻中（還要 ${cd} 次行動）` };
          return { ready: true, cost: this.ap, label: this.name, aim: { type: "point", range: this.rng(u) } };
        },
        predict(b, u, arg) { const p = this.path(b, u, arg); return [...new Set([p.hit, ...this.burst(b, u, p).list].filter(Boolean))]; },
        preview(b, u, arg) {
          const p = this.path(b, u, arg), bs = this.burst(b, u, p);
          return { shapes: [{ shape: "line", x1: u.x, y1: u.y, x2: p.x, y2: p.y, width: 12, color: COL }, { shape: "circle", x: p.x, y: p.y, radius: bs.R0, color: POI }], hits: this.predict(b, u, arg) };
        },
        use(b, u, arg) {
          const p = this.path(b, u, arg), bs = this.burst(b, u, p), lowU = R.upHas(upg(u), "low");
          const fly = Math.max(0.12, p.t / this.speed), at = fly + this.spin;
          u.facing = p.d.ang;
          b.setCooldown(u, "plume", this.cooldown);
          b.say(`${u.name}「致命飛羽」——鐵扇轉著飛了出去${p.hit ? `，打中 ${p.hit.name}` : ""}`);
          b.bark(u, "fan");
          b.emit({ type: "sfx", sound: this.sound });
          b.emit({ type: "mhFan", x1: u.x, y1: u.y, x2: p.x, y2: p.y, dur: fly, spin: this.spin });
          // 飛行中打中
          if (p.hit) {
            b.hitDelay = fly;
            b.damage(u, p.hit, lowU ? this.lowBase : this.base, 1, "（鐵扇）");
            b.hitDelay = 0;
            if (lowU) addPoison(b, p.hit, this.lowStacks, fly);
          }
          // 旋轉爆發
          const extra = R.upHas(upg(u), "brew") ? 1 : 0;
          b.emit({ type: "sfx", sound: bs.mist ? SND.mist : SND.burst, delay: at });
          if (bs.mist) b.emit({ type: "mhMist", x: p.x, y: p.y, r: bs.R0, dur: 1.4, delay: at });
          else b.emit({ type: "mhRing", x: p.x, y: p.y, r: bs.R0, thru: R.upHas(upg(u), "pierce"), delay: at });
          for (const e of bs.list) {
            if (!e.alive) continue;
            if (!bs.mist) { b.hitDelay = at + 0.08; b.damage(u, e, this.ring, 1, "（環狀毒針）"); b.hitDelay = 0; }
            addPoison(b, e, (bs.mist ? this.mistStacks : this.stacks) + extra, at + 0.1);
          }
          b.lockUntil = now() + (at + 0.4) * 1000;
        },
      },

      // ---------- E 向冥之河 ----------
      river: {
        name: "向冥之河", slot: "E", key: "e", sound: SND.mist,
        tags: ["area"],
        ap: 1, cooldown: 3, radius: 210, half: 34, stacks: 2, slow: 0.5, knock: 90, far: 260, farR: 80, heal: 0.08,
        desc: "在身邊召喚顧問渡冥隱子，朝前方噴出一口毒霧：霧裡的敵人緩速 1 回合、＋2 層中毒；然後毒霧和顧問一起消失",
        spot(u, d) { return { x: u.x + d.dx * (u.r + 30), y: u.y + d.dy * (u.r + 30) }; },
        cone(u, d) { const o = this.spot(u, d); return { shape: "sector", x: o.x, y: o.y, ang: d.ang, half: this.half * DEG, radius: this.radius }; },
        // 駛向黃泉：毒霧被搧到遠處（從扇形的尖端再往前 far）
        drift(b, u, d) {
          const o = this.spot(u, d), x1 = o.x + d.dx * this.radius * 0.8, y1 = o.y + d.dy * this.radius * 0.8;
          // 毒霧被搧走時只會被牆擋下（不會停在敵人身上）
          let t = this.far; const A = b.cfg.arena;
          for (let s = 8; s <= this.far; s += 6) { const px = x1 + d.dx * s, py = y1 + d.dy * s; if (px < 2 || py < 2 || px > A.w - 2 || py > A.h - 2 || b.obstacleAt(FLY, px, py)) { t = Math.max(0, s - 6); break; } }
          return { x1, y1, x2: x1 + d.dx * t, y2: y1 + d.dy * t };
        },
        hits(b, u, arg) {
          const d = dirOf(u, arg), c = this.cone(u, d);
          const a = b.targetsFor(u).filter((e) => e.alive && R.geo.inSector(e.x, e.y, c, e.r));
          let bb = [];
          if (R.upHas(upg(u), "yomi")) { const dr = this.drift(b, u, d); bb = b.targetsFor(u).filter((e) => e.alive && !a.includes(e) && R.geo.pointSeg(e.x, e.y, dr.x1, dr.y1, dr.x2, dr.y2) <= this.farR + e.r); }
          return { d, c, a, bb };
        },
        status(b, u) {
          const cd = u.cd.river || 0;
          if (cd > 0) return { ready: false, cost: this.ap, label: this.name, note: `CD ${cd}`, reason: `冷卻中（還要 ${cd} 次行動）` };
          return { ready: true, cost: this.ap, label: this.name, aim: { type: "direction", range: this.radius } };
        },
        predict(b, u, arg) { const h = this.hits(b, u, arg); return [...h.a, ...h.bb]; },
        preview(b, u, arg) {
          const h = this.hits(b, u, arg), shapes = [{ ...h.c, color: POI }];
          if (R.upHas(upg(u), "yomi")) { const dr = this.drift(b, u, h.d); shapes.push({ shape: "line", x1: dr.x1, y1: dr.y1, x2: dr.x2, y2: dr.y2, width: this.farR * 2, color: MIST_D }); }
          return { shapes, hits: [...h.a, ...h.bb] };
        },
        use(b, u, arg) {
          const h = this.hits(b, u, arg), d = h.d, o = this.spot(u, d), up = upg(u);
          const n = this.stacks + (R.upHas(up, "punish") ? 1 : 0), T0 = 0.35;
          u.facing = d.ang;
          b.setCooldown(u, "river", this.cooldown);
          b.say(`${u.name}「向冥之河」——最高顧問・渡冥隱子出現在身旁，朝前方噴出毒霧`);
          b.bark(u, "advisor");
          b.emit({ type: "sfx", sound: this.sound, delay: T0 });
          b.emit({ type: "mhAdvisor", x: o.x, y: o.y, ang: d.ang, dur: 1.3 });
          b.emit({ type: "mhCone", x: o.x, y: o.y, ang: d.ang, half: this.half * DEG, r: this.radius, dur: 1.0, delay: T0 });
          const hit = (e, at) => {
            if (!e.alive) return;
            e.state.slowUntil = b.round + 1; e.state.slowMult = this.slow; e.state.slowLabel = "緩速";
            b.emit({ type: "buff", unit: e, text: "緩速", color: MIST_D, delay: at });
            addPoison(b, e, n, at);
            if (R.upHas(up, "guard") && !heavy(e)) { b.knockback(e, o.x, o.y, this.knock); b.emit({ type: "buff", unit: e, text: "擊退", color: ADV, delay: at }); }
          };
          for (const e of h.a) hit(e, T0 + 0.25);
          let end = T0 + 1.0;
          if (R.upHas(up, "yomi")) {
            const dr = this.drift(b, u, d), T1 = T0 + 0.75;
            b.say(`${u.name} 揮動鐵扇，把毒霧搧向遠處`);
            b.emit({ type: "sfx", sound: SND.gust, delay: T1 });
            b.emit({ type: "mhSwing", x: u.x, y: u.y, ang: d.ang, r: 46, big: true, delay: T1 });
            b.emit({ type: "mhDrift", ...dr, r: this.farR, dur: 0.9, delay: T1 + 0.1 });
            for (const e of h.bb) { const f = Math.min(1, R.dist(e.x, e.y, dr.x1, dr.y1) / Math.max(1, R.dist(dr.x1, dr.y1, dr.x2, dr.y2))); hit(e, T1 + 0.15 + f * 0.7); }
            end = T1 + 1.0;
          }
          if (!h.a.length && !h.bb.length) b.say("……毒霧裡沒有敵人");
          if (R.upHas(up, "loyal")) { b.emit({ type: "sfx", sound: SND.heal, delay: 0.2 }); b.heal(u, Math.max(1, Math.round(u.maxHp * this.heal)), "（效忠之心）"); }
          b.lockUntil = now() + end * 1000;
        },
      },

      // ---------- W 彌生艷華 ----------
      yayoi: {
        name: "彌生艷華", slot: "W", key: "w", ultimate: true, sound: SND.draw,
        tags: ["projectile"],
        ap: 2, charge: 5, range: 460, max: 5, base: 13, stacks: 1, step: 0.16, speed: 900,
        slash: 22, slashR: 340, settle: 1.2, mistR: 80, mistStacks: 2,
        desc: "瞄準大範圍裡所有中毒的敵人，蓄力一回合；下一次輪到自己時連續揮扇射出淬毒苦無（最多 5 發，打中＋1 層中毒）",
        mode(u) { return upg(u).w1 || "base"; },
        marks(b, u) { return b.targetsFor(u).filter((e) => e.alive && e.state.poison > 0 && R.dist(e.x, e.y, u.x, u.y) <= this.range + e.r); },
        status(b, u) {
          const lb = { base: this.name, sparrow: "啼哭之雀", dark: "黑冥散華" }[this.mode(u)];
          if (u.state.yayoi) return { ready: false, cost: this.ap, label: lb, note: "蓄力中", reason: "正在蓄力（下一次輪到自己時發動）" };
          if (u.charge < this.charge) return { ready: false, cost: this.ap, label: lb, note: `${u.charge}/${this.charge}`, reason: `還要 ${this.charge - u.charge} 次行動才能使用` };
          const n = this.marks(b, u).length;
          if (!n) return { ready: false, cost: this.ap, label: lb, note: "沒有目標", reason: "範圍裡沒有中毒的敵人" };
          return { ready: true, cost: this.ap, label: lb, note: `中毒 ${n} 個`, aim: { type: "none" } };
        },
        predict(b, u) { return this.marks(b, u); },
        preview(b, u) { return { shapes: [{ shape: "circle", x: u.x, y: u.y, radius: this.range, color: COL }], hits: this.marks(b, u) }; },
        use(b, u) {
          const m = this.mode(u), list = this.marks(b, u);
          if (!list.length) err("範圍裡沒有中毒的敵人");
          u.charge = 0;
          u.state.yayoi = { mode: m, targets: list, round: b.round };
          b.bark(u, "ult");
          b.emit({ type: "sfx", sound: m === "sparrow" ? SND.draw : SND.fan });
          if (m === "sparrow") b.say(`${u.name}：「彌生艷華・啼哭之雀」——從扇子裡抽出一把太刀，開始蓄力（瞄準 ${list.length} 個中毒的敵人）`);
          else b.say(`${u.name}：「彌生艷華」——鐵扇半開，瞄準 ${list.length} 個中毒的敵人，開始蓄力（下一次輪到自己時發動）`);
          b.emit({ type: "mhAim", x: u.x, y: u.y, r: this.range, dur: 0.9 });
          for (const e of list) b.emit({ type: "buff", unit: e, text: "被瞄準", color: FAN_RED });
        },
        // 蓄力完畢（下一次輪到姬時）
        release(b, u) {
          const S = u.state.yayoi; u.state.yayoi = null;
          b.bark(u, "release");
          if (S.mode === "sparrow") return this.sparrow(b, u);
          const ts = S.targets.filter((e) => e.alive);
          if (!ts.length) { b.say(`${u.name} 蓄力好的苦無……瞄準的敵人都已經倒下了`); return; }
          const dark = S.mode === "dark";
          b.say(`${u.name}：「${dark ? "黑冥散華" : "彌生艷華"}」——連續揮扇，射出淬毒苦無！`);
          const T0 = dark ? 0.6 : 0.2;
          let back = null;
          if (dark) {
            // 顧問出現在姬的身後（離瞄準的敵人們最遠的那一側）
            const cx = ts.reduce((s, e) => s + e.x, 0) / ts.length, cy = ts.reduce((s, e) => s + e.y, 0) / ts.length, a = Math.atan2(u.y - cy, u.x - cx);
            back = { x: u.x + Math.cos(a) * (u.r + 34), y: u.y + Math.sin(a) * (u.r + 34) };
            b.emit({ type: "mhAdvisor", x: back.x, y: back.y, ang: a + Math.PI, dur: T0 + this.max * this.step + 1.0 });
            b.emit({ type: "sfx", sound: SND.mist, delay: 0.3 });
          }
          let i = 0, last = T0;
          for (let k = 0; k < this.max; k++) {
            const live = ts.filter((e) => e.alive);
            if (!live.length) break;
            const e = live[i++ % live.length], at = T0 + k * this.step, fly = R.dist(u.x, u.y, e.x, e.y) / this.speed;
            b.emit({ type: "mhSwing", x: u.x, y: u.y, ang: Math.atan2(e.y - u.y, e.x - u.x), r: 36, delay: at });
            b.emit({ type: "mhKunai", x1: u.x, y1: u.y, x2: e.x, y2: e.y, dur: fly, delay: at });
            b.emit({ type: "sfx", sound: SND.kunai, delay: at });
            b.hitDelay = at + fly;
            b.damage(u, e, this.base, 1, `（淬毒苦無 ${k + 1}）`);
            b.hitDelay = 0;
            addPoison(b, e, this.stacks, at + fly);
            if (dark) {
              b.emit({ type: "mhDrift", x1: back.x, y1: back.y, x2: e.x, y2: e.y, r: this.mistR, dur: fly + 0.9, delay: at });
              for (const x of b.targetsFor(u)) if (x.alive && inR(x, e.x, e.y, this.mistR)) addPoison(b, x, this.mistStacks, at + fly + 0.1);
            }
            last = at + fly;
          }
          b.lockUntil = now() + (last + 0.6) * 1000;
        },
        // 啼哭之雀（使用者 11/22）：瞄準最近的中毒目標，揮出一道大型刀光（使用者的圖２：幾道新月形的刀弧＋一條往前拉長的刀光）
        //   命中：前方的扇形＋沿著方向的長條；清除中毒並一口氣結算
        bladeHalf: 42, bladeLen: 620, bladeWidth: 70,
        bladeHits(b, u, ang) {
          const sec = { x: u.x, y: u.y, ang, half: this.bladeHalf * DEG, radius: this.slashR }, x2 = u.x + Math.cos(ang) * this.bladeLen, y2 = u.y + Math.sin(ang) * this.bladeLen;
          return b.targetsFor(u).filter((e) => e.alive && (R.geo.inSector(e.x, e.y, sec, e.r) || R.geo.pointSeg(e.x, e.y, u.x, u.y, x2, y2) <= this.bladeWidth / 2 + e.r));
        },
        sparrow(b, u) {
          const foes = b.targetsFor(u).filter((e) => e.alive), byD = (a, c) => R.dist(a.x, a.y, u.x, u.y) - R.dist(c.x, c.y, u.x, u.y);
          const tgt = foes.filter((e) => e.state.poison > 0).sort(byD)[0] || foes.sort(byD)[0];
          const ang = tgt ? Math.atan2(tgt.y - u.y, tgt.x - u.x) : (u.facing || 0), T0 = 0.25;
          u.facing = ang;
          const list = this.bladeHits(b, u, ang);
          b.say(`${u.name}：「啼哭之雀」——蓄力完畢，太刀朝${tgt ? ` ${tgt.name} ` : "前方"}揮出一道巨大的刀光！`);
          b.emit({ type: "sfx", sound: SND.wave, delay: T0 });
          b.emit({ type: "mhBlade", x: u.x, y: u.y, ang, r: this.slashR, len: this.bladeLen, w: this.bladeWidth, delay: T0 });
          for (const e of list) {
            const at = T0 + 0.12 + (R.dist(e.x, e.y, u.x, u.y) / this.bladeLen) * 0.3;
            b.hitDelay = at;
            b.damage(u, e, this.slash, 1, "（刀光）");
            b.hitDelay = 0;
            if (!e.alive || !(e.state.poison > 0)) continue;
            const n = e.state.poison, raw = remaining(b, e) * this.settle * (low(e) ? 1 + C.passive.bonus : 1), amt = Math.max(1, Math.round(raw));
            e.state.poison = 0;
            b.emit({ type: "mhBubble", x: e.x, y: e.y, r: e.r + 10, big: true, delay: at + 0.1 });
            poisonHurt(b, e, amt, `${e.name} 的 ${n} 層中毒被刀光一口氣結算：${amt} 點傷害`, at + 0.2);
          }
          if (!list.length) b.say("……刀光沒有砍到敵人");
          b.lockUntil = now() + (T0 + 1.1) * 1000;
        },
      },
    },

    // ===== 畫面 =====
    drawFx(ctx, ev, k) {
      switch (ev.type) {
        case "mhSwing": {
          // 姬揮扇子：紅色的兩道弧線（使用者的設計圖）
          ctx.save(); ctx.translate(ev.x, ev.y); ctx.rotate(ev.ang); ctx.globalAlpha = 1 - k; ctx.lineCap = "round";
          const sw = (k * 1.6 - 0.8) * (ev.big ? 1.2 : 0.9), R0 = ev.r * (ev.big ? 1.6 : 1.2);
          ctx.strokeStyle = FAN_RED; ctx.lineWidth = ev.big ? 6 : 4;
          for (const o of [0, 9]) { ctx.beginPath(); ctx.arc(-o * 0.6, 0, R0 + o, sw - 0.9, sw + 0.4); ctx.stroke(); }
          ctx.restore();
          break;
        }
        case "mhNeedle": {
          const D = ev.dur * 1000, tot = D + 150, p = Math.min(1, (k * tot) / D), a = Math.atan2(ev.y2 - ev.y1, ev.x2 - ev.x1);
          const x = ev.x1 + (ev.x2 - ev.x1) * p, y = ev.y1 + (ev.y2 - ev.y1) * p;
          ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = p >= 1 ? Math.max(0, 1 - (k * tot - D) / 150) : 1;
          ctx.strokeStyle = "rgba(122,90,184,.35)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(0, 0); ctx.stroke();
          ctx.strokeStyle = "#3a3048"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(4, 0); ctx.stroke();
          ctx.fillStyle = POI; ctx.beginPath(); ctx.arc(-12, 0, 2, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          break;
        }
        case "mhFan": {
          // 鐵扇轉著飛到終點，再原地旋轉
          const D = ev.dur * 1000, S = ev.spin * 1000, tot = D + S + 200, T = k * tot, p = Math.min(1, T / D);
          const x = ev.x1 + (ev.x2 - ev.x1) * p, y = ev.y1 + (ev.y2 - ev.y1) * p;
          ctx.save(); ctx.translate(x, y); ctx.rotate(T / 40); ctx.globalAlpha = T > D + S ? Math.max(0, 1 - (T - D - S) / 200) : 1;
          drawFan(ctx, 1);
          ctx.restore();
          break;
        }
        case "mhRing": {
          // 一圈往外射的毒針
          const N = 16, p = Math.min(1, k * 1.6), d = ev.r * p;
          ctx.save(); ctx.translate(ev.x, ev.y); ctx.globalAlpha = k > 0.6 ? (1 - k) / 0.4 : 1;
          ctx.strokeStyle = "rgba(122,90,184,.25)"; ctx.lineWidth = 2; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(0, 0, d, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
          for (let i = 0; i < N; i++) {
            const a = (i / N) * Math.PI * 2; ctx.save(); ctx.rotate(a); ctx.translate(d, 0);
            ctx.strokeStyle = "#3a3048"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(3, 0); ctx.stroke();
            ctx.fillStyle = POI; ctx.beginPath(); ctx.arc(-10, 0, 2, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
          }
          ctx.restore();
          break;
        }
        case "mhMist": drawCloud(ctx, ev.x, ev.y, ev.r * Math.min(1, 0.4 + k * 2), k > 0.6 ? (1 - k) / 0.4 : Math.min(1, k * 5), k); break;
        case "mhDrift": {
          // 毒霧被搧著飄過去（越飄越大，最後散掉）
          const p = Math.min(1, k * 1.25), x = ev.x1 + (ev.x2 - ev.x1) * p, y = ev.y1 + (ev.y2 - ev.y1) * p;
          drawCloud(ctx, x, y, ev.r * (0.7 + p * 0.4), k > 0.75 ? (1 - k) / 0.25 : 0.95, k);
          break;
        }
        case "mhCone": {
          // 顧問噴出的毒霧：從顧問往前擴散的一片雲
          const p = Math.min(1, k * 2.2), fade = k > 0.65 ? (1 - k) / 0.35 : 1;
          for (let i = 0; i < 9; i++) {
            const f = (i % 3 + 1) / 3, side = ((i * 7) % 5 - 2) / 2, a = ev.ang + side * ev.half * 0.7, d = ev.r * f * p * 0.85;
            drawCloud(ctx, ev.x + Math.cos(a) * d, ev.y + Math.sin(a) * d, 26 + f * 34 * p, fade * 0.9, k + i);
          }
          break;
        }
        case "mhAdvisor": {
          // 最高顧問・渡冥隱子：灰色方塊「冥」（使用者的設計圖），淡入、淡出
          const a = k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1;
          ctx.save(); ctx.translate(ev.x, ev.y - (1 - Math.min(1, k * 6)) * 10); ctx.globalAlpha = a;
          const s = 34;
          ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.strokeStyle = ADV; ctx.lineWidth = 3;
          roundRect(ctx, -s / 2, -s / 2, s, s, 7); ctx.fill(); ctx.stroke();
          ctx.fillStyle = ADV; ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("冥", 0, 1);
          ctx.restore();
          break;
        }
        case "mhKunai": {
          const D = ev.dur * 1000, tot = D + 150, p = Math.min(1, (k * tot) / D), a = Math.atan2(ev.y2 - ev.y1, ev.x2 - ev.x1);
          const x = ev.x1 + (ev.x2 - ev.x1) * p, y = ev.y1 + (ev.y2 - ev.y1) * p;
          ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = p >= 1 ? Math.max(0, 1 - (k * tot - D) / 150) : 1;
          ctx.strokeStyle = "rgba(122,90,184,.4)"; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(-6, 0); ctx.stroke();
          ctx.fillStyle = "#2a2430"; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-4, -5); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = "#2a2430"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-16, 0); ctx.stroke();
          ctx.strokeStyle = POI; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-19, 0, 3, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
          break;
        }
        case "mhBlade": {
          // 啼哭之雀的刀光：起點一叢新月形的刀弧，接著一道往前拉長、尾端尖細的刀光
          const p = Math.min(1, k * 2.2), fade = 1 - Math.max(0, k - 0.45) / 0.55;
          ctx.save(); ctx.translate(ev.x, ev.y); ctx.rotate(ev.ang); ctx.globalAlpha = fade; ctx.lineJoin = "round";
          ctx.fillStyle = "rgba(160,72,168,.85)"; ctx.strokeStyle = "#a01870"; ctx.lineWidth = 4;
          const Rr = ev.r * 0.42;
          for (let i = 0; i < 3; i++) {
            const rr = Rr * (0.75 + i * 0.22), sp = 0.9 + i * 0.15, off = -i * 16;
            ctx.beginPath(); ctx.arc(off, 0, rr, -sp * p, sp * p); ctx.arc(off - 18, 0, rr - 10, sp * p, -sp * p, true); ctx.closePath(); ctx.fill(); ctx.stroke();
          }
          const L = ev.len * p;
          ctx.beginPath(); ctx.moveTo(Rr * 0.4, -ev.w * 0.32); ctx.quadraticCurveTo(L * 0.5, -ev.w * 0.2, L, -2); ctx.lineTo(L * 0.62, 4); ctx.quadraticCurveTo(L * 0.4, ev.w * 0.25, Rr * 0.4, ev.w * 0.3);
          ctx.quadraticCurveTo(Rr * 0.9, ev.w * 0.55, Rr * 0.6, ev.w * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(Rr * 0.6, 0); ctx.lineTo(L * 0.9, 0); ctx.stroke();
          ctx.restore();
          break;
        }
        case "mhWave": {
          // 啼哭之雀：太刀的劍氣，一圈往外掃出去的白色刀光
          const p = Math.min(1, k * 2), r = ev.r * (0.2 + 0.8 * p);
          ctx.save(); ctx.translate(ev.x, ev.y); ctx.globalAlpha = 1 - k; ctx.lineCap = "round";
          for (const [w, c, o] of [[18, "rgba(232,38,44,.35)", 0], [8, "#fff", 0], [3, FAN_RED, 6]]) {
            ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(0, 0, r - o, ev.ang - 0.2 + p * 3, ev.ang - 0.2 + p * 3 + Math.PI * 1.9 * p); ctx.stroke();
          }
          ctx.restore();
          break;
        }
        case "mhAim": {
          // 大範圍瞄準：金色的圓往外擴開
          ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = COL; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
          ctx.beginPath(); ctx.arc(ev.x, ev.y, ev.r * Math.min(1, k * 2), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
          break;
        }
        case "mhBubble": {
          // 中毒發作：冒出紫色的泡泡
          ctx.save();
          for (let i = 0; i < (ev.big ? 12 : 6); i++) {
            const a = i * 2.4, d = ev.r * (0.3 + (i % 3) * 0.3), y = -k * (30 + (i % 4) * 10);
            ctx.globalAlpha = (1 - k) * 0.85; ctx.fillStyle = i % 2 ? MIST : POI;
            ctx.beginPath(); ctx.arc(ev.x + Math.cos(a) * d, ev.y + Math.sin(a) * d * 0.5 + y, 3 + (i % 3) * 1.5, 0, Math.PI * 2); ctx.fill();
          }
          ctx.restore();
          break;
        }
      }
      ctx.globalAlpha = 1;
    },
    // 蓄力中：被瞄準的敵人頭上有紅色準星；姬身邊有金色的光（啼哭之雀：手上的太刀）。中毒的敵人頭上冒小泡泡
    drawBattle(ctx, t, b, H) {
      const u = b.player, pos = (x) => (H.pos ? H.pos(x) : x);
      for (const e of b.units) {
        if (!e.alive || !(e.state?.poison > 0) || e === u) continue;
        const p = pos(e);
        ctx.save(); ctx.fillStyle = POI;
        for (let i = 0; i < 3; i++) { const ph = (t / 900 + i / 3) % 1; ctx.globalAlpha = (1 - ph) * 0.7; ctx.beginPath(); ctx.arc(p.x + (i - 1) * 9, p.y - e.r - 6 - ph * 18, 2.5, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
      const S = u?.alive && u.state.yayoi;
      if (!S) return;
      for (const e of S.targets) {
        if (!e.alive) continue;
        const p = pos(e), r = e.r + 12 + Math.sin(t / 160) * 3;
        ctx.save(); ctx.strokeStyle = FAN_RED; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + t / 900; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * (r - 6), p.y + Math.sin(a) * (r - 6)); ctx.lineTo(p.x + Math.cos(a) * (r + 8), p.y + Math.sin(a) * (r + 8)); ctx.stroke(); }
        ctx.restore();
      }
      const p = pos(u);
      ctx.save(); ctx.globalAlpha = 0.5 + Math.sin(t / 200) * 0.2; ctx.strokeStyle = COL; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, u.r + 14, 0, Math.PI * 2); ctx.stroke();
      if (S.mode === "sparrow") {
        // 太刀：從扇子裡抽出來、閃著光
        ctx.globalAlpha = 1; ctx.translate(p.x + u.r * 0.6, p.y - u.r * 0.3); ctx.rotate(-0.9);
        ctx.fillStyle = "#e8eef4"; ctx.strokeStyle = "#5a6070"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, -3); ctx.quadraticCurveTo(30, -7, 56, -2); ctx.lineTo(0, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#2a2430"; ctx.fillRect(-14, -2.5, 14, 5); ctx.fillStyle = COL; ctx.fillRect(-2, -5, 3, 10);
      }
      ctx.restore();
    },
  };
  const OWN_FX = {
    mhSwing: () => 320, mhNeedle: (ev) => ev.dur * 1000 + 150, mhFan: (ev) => (ev.dur + ev.spin) * 1000 + 200, mhRing: () => 520,
    mhMist: (ev) => ev.dur * 1000, mhDrift: (ev) => ev.dur * 1000, mhCone: (ev) => ev.dur * 1000, mhAdvisor: (ev) => ev.dur * 1000,
    mhKunai: (ev) => ev.dur * 1000 + 150, mhWave: () => 700, mhBlade: () => 900, mhAim: (ev) => ev.dur * 1000, mhBubble: (ev) => (ev.big ? 900 : 700),
  };
  C.fxEvents = OWN_FX;
  // 中毒的數值掛在角色上，測試數值面板才調得到
  for (const [k, f] of [["poisonPer", "per"], ["poisonMax", "max"], ["poisonDecay", "decay"]]) Object.defineProperty(C, k, { get: () => PZ[f], set: (v) => { PZ[f] = +v; }, enumerable: true });

  // ===== 畫法 =====
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  // 鐵扇：打開的扇面（黑底、金色的骨、紅色的邊）
  function drawFan(ctx, s) {
    ctx.save(); ctx.scale(s, s);
    ctx.fillStyle = "#2a2430"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 18, -Math.PI * 0.85, -Math.PI * 0.15); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = FAN_RED; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 18, -Math.PI * 0.85, -Math.PI * 0.15); ctx.stroke();
    ctx.strokeStyle = COL; ctx.lineWidth = 1.2;
    for (let i = 0; i <= 5; i++) { const a = -Math.PI * 0.85 + (i / 5) * Math.PI * 0.7; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 17, Math.sin(a) * 17); ctx.stroke(); }
    ctx.fillStyle = COL; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // 毒霧：一團淡紫色的雲（幾個圓疊起來，邊緣慢慢起伏）
  function drawCloud(ctx, x, y, r, alpha, seed) {
    if (alpha <= 0 || r <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = Math.min(1, alpha) * 0.8; ctx.fillStyle = MIST;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + seed * 0.7, d = r * (0.5 + ((i * 37) % 10) / 40), rr = r * (0.3 + ((i * 53) % 10) / 60);
      ctx.beginPath(); ctx.arc(Math.cos(a) * d * 0.9, Math.sin(a) * d * 0.75, rr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  R.CHARACTERS[C.id] = C;
})();
