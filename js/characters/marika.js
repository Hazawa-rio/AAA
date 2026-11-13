/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/characters/marika.js": "20261113145157" });
// 角色：瑪莉卡（索德綜合學院埃里托德分校的優秀畢業生，用蛇腹劍）
// 魔力角色：只有在「燃火狀態」下，普攻和所有技能才會花魔力
// 被動「烈火之舞」：燃火狀態下，所有攻擊都會在攻擊範圍留下火焰；敵人在火焰裡移動、或回合開始時站在火焰裡，就會被燒傷（傷害隨攻擊力提高）
// 普攻「鞭打」：細長扇形，甩動蛇腹劍打兩下；燃火時變成「火舌折磨」：範圍更大，一次打四下
// Q「抓取」：伸長蛇腹劍，把遠處的敵人勾到面前（Boss 太重勾不動，只會受傷）
// E「燃起火焰」：花魔力進入燃火狀態；燃火中再用一次＝延長燃火的回合
// W「薩拉曼達」：對前方的圓形範圍連續揮鞭八下
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
  const ablaze = (u) => (u.state.fireTurns || 0) > 0;
  const heavy = (e) => e.def.boss || e.def.bigBar || e.def.trial || e.part || e.def.block;
  const WHIP = "sounds/marika-whip.mp3", FIRE = "sounds/marika-fire.mp3", SLASH = "sounds/ilshu-slash.mp3";
  // 連續揮打：甩鞭聲和揮刀聲交替（蛇腹劍甩出去像鞭子、收回來是劍刃），每一下的間隔對上動畫
  const lashSounds = (b, n, gap = 0.26) => { for (let i = 0; i < n; i++) b.emit({ type: "sfx", sound: i % 2 ? SLASH : WHIP, delay: i * gap }); };

  const C = {
    id: "marika",
    name: "瑪莉卡",
    letter: "瑪",
    color: "#d8402a",
    role: "中距離・蛇腹劍",
    gacha: true,
    profile: "索德綜合學院埃里托德分校的優秀畢業生，有些過度熱情，喜歡熱血沸騰的感覺，不拘小節性格奔放的學姊，用大開大合的動作甩動蛇腹劍，當她的劍燃起烈火後她會更加興奮，像是舞動一樣的揮動劍刃。",
    desc: "用蛇腹劍的學姊。細長的鞭打一次打兩下、把遠處的敵人勾到面前；花魔力燃起火焰之後，所有攻擊都會留下燒傷敵人的火焰，普攻變成一次打四下的「火舌折磨」。",
    // 戰鬥風格：酒館名牌架上顯示
    style: { role: "中距離・蛇腹劍（魔力）", text: "大開大合甩動蛇腹劍的學姊。平常一鞭打兩下，還能把遠處的敵人勾到面前；燃起火焰之後，每一擊都在地上留下燒傷敵人的火焰，普攻變成四連的「火舌折磨」，但每一招都要花魔力。越打越熱，也越燒魔力。" },
    stats: { hp: 82, mp: 100, atk: 16, df: 4, spd: 11, ap: 6 },     // 暫定
    growth: { hp: 3.5, mp: 3, atk: 0.9, df: 0.3, spd: 0.1 },
    mpRegen: 0.25,                     // 每次輪到自己時回復最大魔力的 25%
    field: {
      basicRange: 190,
      // 探索技能：伸出燃燒的蛇腹劍，在遠處點燃一簇火，把附近的魔物嚇跑（也能點燃機關）
      q: { name: "遠距離點火", type: "ignite", scareSay: "退縮可是我們學院的禁忌！", sound: WHIP, fireSound: FIRE, cd: 25, range: 360, radius: 70, scare: 110, duration: 8, desc: "伸出燃燒的蛇腹劍，在遠處點燃一簇火（8 秒）：附近的魔物會被嚇跑，一陣子不敢追人" },
    },
    // 個性台詞（使用者提供）
    barks: {
      whip: { chance: 0.3, lines: ["接招！"] },
      ignite: { chance: 0.85, lines: ["燃起來了啊！"] },
      extend: { chance: 0.75, lines: ["還沒有結束！"] },
      fireWhip: { chance: 0.4, lines: ["哈哈！熱血沸騰的感覺啊！"] },
      grab: { chance: 0.6, lines: ["給我過來吧！"] },
      grabHeavy: { chance: 0.8, lines: ["被擋開了？"] },
      out: { chance: 0.85, lines: ["我的烈火可還沒燒完！"] },
      ult: { chance: 0.95, lines: ["感受吧！埃里托德蛇腹劍派的最終奧義！烈火蠑螈－薩拉曼達！"] },
      hurt: { chance: 0.3, lines: ["有意思...！"] },
      burn: { chance: 0.3, lines: ["這會很燙的！"] },
    },
    basic: "whip",
    ultimate: "salamander",
    hud: { left: "grab", center: "salamander", right: "ignite" },

    passive: {
      name: "烈火之舞",
      desc: "燃火狀態下，所有攻擊都會在攻擊範圍留下火焰：敵人在火焰裡移動、或回合開始時站在火焰裡就會被燒傷（傷害隨攻擊力提高）",
      base: 5, radius: 62, turns: 2,
      status(b, u) { const n = u.state.fireTurns || 0; return { text: n > 0 ? `燃火中（還有 ${n} 回合）` : "沒有燃火", on: n > 0 }; },
    },

    upgrades: {
      q: {
        skill: "grab",
        tiers: [
          [
            { id: "bind", name: "鎖鏈纏身", desc: "被抓取勾過來的敵人麻痺 1 回合（移動距離變短）" },
            { id: "longChain", name: "延伸鏈節", desc: "抓取的距離 ×1.35" },
          ],
          [
            { id: "spinPull", name: "迴旋收劍", desc: "抓取把敵人勾過來之後，順勢在身邊甩一圈（打到身邊所有敵人）" },
            { id: "hotHook", name: "熾熱勾爪", desc: "燃火狀態下，抓取的整條路線都會留下火焰" },
          ],
        ],
      },
      e: {
        skill: "ignite",
        tiers: [
          [
            { id: "wildfire", name: "燎原", desc: "烈火之舞留下的火焰範圍 ×1.4" },
            { id: "embers", name: "餘燼", desc: "烈火之舞留下的火焰多燒 1 回合" },
          ],
          [
            { id: "frenzy", name: "狂熱", desc: "燃火狀態下，造成的傷害 ×1.15" },
            { id: "steady", name: "穩定燃燒", desc: "燃火狀態下，普攻和技能消耗的魔力 −40%" },
          ],
        ],
      },
      w: {
        skill: "salamander",
        tiers: [
          [
            { id: "dozen", name: "十二連鞭", desc: "薩拉曼達揮鞭的次數從 8 下變成 12 下（每下傷害稍低）" },
            { id: "stage", name: "灼熱舞台", desc: "薩拉曼達一定會留下大片火焰（就算沒有燃火）；燃火時火焰更大" },
          ],
        ],
      },
    },

    // ===== 燃火：花魔力 =====
    fireCost(u, base) { return Math.round(base * (upg(u).e2 === "steady" ? 0.6 : 1)); },
    // 技能的魔力：燃火中才要付；魔力不夠就照一般版本出招，火也會熄
    costOf(b, u, base) { if (!ablaze(u)) return 0; const c = this.fireCost(u, base); return u.mp >= c ? c : 0; },
    useFire(b, u, base) {
      if (!ablaze(u)) return false;
      const c = this.fireCost(u, base);
      if (u.mp >= c) return true;
      u.state.fireTurns = 0;
      b.say(`${u.name} 的魔力不夠了，劍上的火熄了`); b.emit({ type: "buff", unit: u, text: "火熄了", color: "#8a8478" }); b.bark(u, "out", 0.4);
      return false;
    },
    // 烈火之舞：在攻擊範圍留下火焰
    leaveFire(b, u, x, y, big = 1) {
      const P = this.passive, up = upg(u);
      const r = P.radius * (up.e1 === "wildfire" ? 1.4 : 1) * big, turns = P.turns + (up.e1 === "embers" ? 1 : 0);
      b.zones.push({ id: "fz" + Math.random().toString(36).slice(2, 7), type: "fire", owner: u, x, y, r, base: P.base, turnsLeft: turns, burned: {} });
    },
    burn(b, z, e) {
      const key = `${e.id}:${b.round}`;
      if (z.burned[key]) return;
      z.burned[key] = 1;
      b.emit({ type: "buff", unit: e, text: "燒傷", color: "#e8781e" });
      if (b.player.alive) b.bark(b.player, "burn", 0.3);
      b.damage(b.player, e, z.base, 1, "（烈火之舞・燒傷）");
    },
    inFire(b, x, y, r) { return b.zones.filter((z) => z.type === "fire" && R.dist(z.x, z.y, x, y) <= z.r + r * 0.5); },
    // 敵人移動：走進或穿過火焰就燒傷
    onEnemyAction(b, e, from) {
      if (!from || !e.alive) return;
      for (const z of b.zones) if (z.type === "fire" && R.geo.pointSeg(z.x, z.y, from.x, from.y, e.x, e.y) <= z.r + e.r * 0.5) this.burn(b, z, e);
    },
    onTurnStart(b, unit) {
      if (unit === b.player) {
        if (ablaze(unit)) { unit.state.fireTurns--; if (!unit.state.fireTurns) { b.bark(unit, "out", 0.4); b.say(`${unit.name} 劍上的火熄了`); b.emit({ type: "buff", unit, text: "火熄了", color: "#8a8478" }); } }
        return;
      }
      if (unit.team === "enemy" && unit.alive) for (const z of this.inFire(b, unit.x, unit.y, unit.r)) this.burn(b, z, unit);
    },
    outgoingMult(b, src) { return ablaze(src) && upg(src).e2 === "frenzy" ? { mult: 1.15, note: "（狂熱）" } : null; },

    tune: [
      ["每回合回復魔力（比例）", "char", "mpRegen", 0, 1, 0.05],
      ["烈火之舞 火焰傷害", "passive", "base", 1, 30, 1],
      ["烈火之舞 火焰半徑", "passive", "radius", 20, 160, 2],
      ["鞭打 距離", "whip", "radius", 80, 400, 10],
      ["鞭打 每下基礎", "whip", "base", 0, 30, 0.5],
      ["鞭打 攻擊力加成", "whip", "atkScale", 0, 1, 0.01],
      ["火舌折磨 每下基礎", "whip", "fireBase", 0, 30, 0.5],
      ["火舌折磨 攻擊力加成", "whip", "fireScale", 0, 1, 0.01],
      ["火舌折磨 魔力", "whip", "mp", 0, 40, 1],
      ["抓取 距離", "grab", "range", 100, 600, 10],
      ["燃起火焰 魔力", "ignite", "mp", 0, 80, 1],
      ["燃起火焰 回合", "ignite", "turns", 1, 6, 1],
      ["薩拉曼達 每下基礎", "salamander", "base", 0, 20, 0.5],
      ["薩拉曼達 攻擊力加成", "salamander", "atkScale", 0, 1, 0.01],
    ],

    skills: {
      // ---------- 普攻 鞭打（燃火：火舌折磨） ----------
      whip: {
        name: "鞭打", slot: "普攻", key: "a", sound: WHIP, fireSound: FIRE,
        tags: ["melee"],
        ap: 1, radius: 210, halfDeg: 13, base: 3, atkScale: 0.24, hits: 2,       // 每下基礎＝base＋攻擊力×atkScale（初始打史萊姆每下約 6）
        fireName: "火舌折磨", fireRadius: 240, fireHalfDeg: 30, fireBase: 2.6, fireScale: 0.21, fireHits: 4, mp: 8,   // 火舌折磨每下約 5
        desc: "甩動蛇腹劍，打到細長扇形範圍裡的敵人兩次。燃火狀態下變成「火舌折磨」：範圍更大，一次揮打四次（消耗魔力）",
        lit(b, u) { return ablaze(u) && u.mp >= C.fireCost(u, this.mp); },
        shape(b, u, arg) {
          const d = dirOf(u, arg), f = this.lit(b, u);
          return { shape: "sector", x: u.x, y: u.y, ang: d.ang, half: (f ? this.fireHalfDeg : this.halfDeg) * DEG, radius: f ? this.fireRadius : this.radius };
        },
        status(b, u) {
          const f = this.lit(b, u), r = f ? this.fireRadius : this.radius, half = (f ? this.fireHalfDeg : this.halfDeg) * DEG, mp = C.costOf(b, u, this.mp);
          return { ready: true, cost: this.ap, mp, label: f ? this.fireName : this.name, note: f ? `${mp} MP` : undefined, aim: { type: "enemy", range: r, free: true, sector: { radius: r, half } } };
        },
        predict(b, u, arg) {
          const t = arg.target;
          if (t && (!t.alive || t.team === u.team)) err("請點選一個敵人");
          const sec = this.shape(b, u, arg);
          if (t && b.reach(u, t) > sec.radius) err("距離太遠");
          return b.targetsFor(u).filter((e) => R.geo.inSector(e.x, e.y, sec, e.r));
        },
        preview(b, u, arg) { return { shapes: [this.shape(b, u, arg)], hits: this.predict(b, u, arg) }; },
        use(b, u, arg) {
          const fire = C.useFire(b, u, this.mp), sec = this.shape(b, u, arg), n = fire ? this.fireHits : this.hits;
          u.facing = sec.ang;
          b.say(`${u.name} ${fire ? "甩動燃燒的蛇腹劍——「火舌折磨」" : "甩動蛇腹劍「鞭打」"}`);
          b.bark(u, fire ? "fireWhip" : "whip");
          lashSounds(b, n);
          if (fire) b.emit({ type: "sfx", sound: this.fireSound });
          b.emit({ type: "lash", x: u.x, y: u.y, ang: sec.ang, half: sec.half, radius: sec.radius, hits: n, fire });
          const hits = b.targetsFor(u).filter((e) => R.geo.inSector(e.x, e.y, sec, e.r));
          if (!hits.length) { b.say("……揮空了"); b.emit({ type: "miss", x: u.x + Math.cos(sec.ang) * sec.radius * 0.7, y: u.y + Math.sin(sec.ang) * sec.radius * 0.7 }); }
          // 每一下的傷害數字跟著動畫一下一下跳出來
          for (let i = 0; i < n; i++) { b.hitDelay = i * 0.26 + 0.12; for (const e of hits) if (e.alive) b.damage(u, e, fire ? this.fireBase + u.atk * this.fireScale : this.base + u.atk * this.atkScale, 1, n > 1 ? `（第 ${i + 1} 下）` : ""); }
          b.hitDelay = 0;
          if (fire) for (const k of [0.45, 0.85]) C.leaveFire(b, u, u.x + Math.cos(sec.ang) * sec.radius * k, u.y + Math.sin(sec.ang) * sec.radius * k, 0.8);
        },
      },

      // ---------- Q 抓取 ----------
      grab: {
        name: "抓取", slot: "Q", key: "q", sound: WHIP,
        tags: ["melee"],
        ap: 1, cooldown: 2, range: 380, width: 36, base: 6, mp: 8,
        desc: "伸長蛇腹劍，把直線上第一個敵人勾到自己面前（Boss 太重勾不動，只會受傷）",
        rng(u) { return this.range * (upg(u).q1 === "longChain" ? 1.35 : 1); },
        path(b, u, arg) {
          const d = dirOf(u, arg), L = this.rng(u);
          let hit = null, t = L;
          for (const e of b.targetsFor(u)) { const h = R.geo.rayCircle(u.x, u.y, d.dx, d.dy, e.x, e.y, e.r + this.width / 2); if (h !== null && h > 0 && h < t) { hit = e; t = h; } }
          return { d, hit, to: { x: u.x + d.dx * t, y: u.y + d.dy * t } };
        },
        status(b, u) {
          const cd = u.cd.grab || 0, mp = C.costOf(b, u, this.mp);
          if (cd > 0) return { ready: false, cost: this.ap, mp, label: this.name, note: `CD ${cd}`, reason: `冷卻中（還要 ${cd} 次行動）` };
          return { ready: true, cost: this.ap, mp, label: this.name, note: mp ? `${mp} MP` : undefined, aim: { type: "enemy", range: this.rng(u), free: true } };
        },
        predict(b, u, arg) { const p = this.path(b, u, arg); return p.hit ? [p.hit] : []; },
        preview(b, u, arg) { const p = this.path(b, u, arg); return { shapes: [{ shape: "line", x1: u.x, y1: u.y, x2: p.to.x, y2: p.to.y, width: this.width }], hits: p.hit ? [p.hit] : [] }; },
        use(b, u, arg) {
          const fire = C.useFire(b, u, this.mp), p = this.path(b, u, arg);
          u.facing = p.d.ang;
          b.setCooldown(u, "grab", this.cooldown);
          b.emit({ type: "sfx", sound: this.sound });
          b.emit({ type: "grab", from: { x: u.x, y: u.y }, to: p.to, fire });
          if (fire && upg(u).q2 === "hotHook") for (let k = 0.25; k < 1; k += 0.3) C.leaveFire(b, u, u.x + (p.to.x - u.x) * k, u.y + (p.to.y - u.y) * k, 0.7);
          if (!p.hit) { b.say(`${u.name} 伸長蛇腹劍——什麼都沒勾到`); b.emit({ type: "miss", x: p.to.x, y: p.to.y }); return; }
          const e = p.hit;
          b.say(`${u.name} 伸長蛇腹劍「抓取」${e.name}！`);
          b.bark(u, heavy(e) ? "grabHeavy" : "grab", 0.3);
          if (!heavy(e)) {
            // 勾到面前：沿著直線往回拉，停在第一個能站的位置
            const from = { x: e.x, y: e.y }, want = u.r + e.r + 12;
            let to = from;
            for (let s = want; s < R.dist(u.x, u.y, e.x, e.y); s += 8) { const x = u.x + p.d.dx * s, y = u.y + p.d.dy * s; if (!b.blocked(e, x, y)) { to = { x, y }; break; } }
            if (to !== from) { e.x = to.x; e.y = to.y; b.emit({ type: "leap", unit: e, from, to, duration: 0.25 }); b.emit({ type: "move", unit: e }); }
            if (upg(u).q1 === "bind") { e.state.slowUntil = b.round + 1; e.state.slowMult = 0.5; b.emit({ type: "buff", unit: e, text: "麻痺", color: "#7a3fb0" }); }
          } else b.say(`${e.name} 太重了，勾不動！`);
          b.damage(u, e, this.base);
          if (fire) C.leaveFire(b, u, e.x, e.y, 0.8);
          if (upg(u).q2 === "spinPull") {
            const ring = { shape: "circle", x: u.x, y: u.y, radius: 120 };
            b.emit({ type: "lash", x: u.x, y: u.y, ang: p.d.ang, half: Math.PI, radius: 120, hits: 1, fire });
            for (const x of b.targetsFor(u)) if (x.alive && R.dist(x.x, x.y, u.x, u.y) <= ring.radius + x.r) b.damage(u, x, this.base, 1, "（迴旋收劍）");
          }
        },
      },

      // ---------- E 燃起火焰 ----------
      ignite: {
        name: "燃起火焰", slot: "E", key: "e", sound: FIRE,
        tags: ["buff"],
        ap: 1, mp: 30, extendMp: 20, turns: 3,
        desc: "消耗魔力，讓蛇腹劍燃起烈火，進入燃火狀態（3 回合）；燃火中再用一次＝延長燃火的回合。燃火時普攻和所有技能都會消耗魔力，普攻變成「火舌折磨」",
        status(b, u) {
          const ext = ablaze(u), mp = ext ? C.fireCost(u, this.extendMp) : this.mp;
          if (u.mp < mp) return { ready: false, cost: this.ap, mp, label: ext ? "延續火焰" : this.name, note: `${mp} MP`, reason: "魔力不足" };
          return { ready: true, cost: this.ap, mp, label: ext ? "延續火焰" : this.name, note: `${mp} MP`, aim: { type: "none" } };
        },
        predict() { return []; },
        preview(b, u) { return { shapes: [{ shape: "circle", x: u.x, y: u.y, radius: u.r + 26, color: "#e8781e" }], hits: [] }; },
        use(b, u) {
          const ext = ablaze(u);
          u.state.fireTurns = (ext ? u.state.fireTurns : 0) + this.turns;
          b.bark(u, ext ? "extend" : "ignite");
          b.say(ext ? `${u.name} 往劍上添了一把火：燃火延長到 ${u.state.fireTurns} 回合` : `${u.name} 的蛇腹劍燃起了烈火！（燃火 ${this.turns} 回合）`);
          b.emit({ type: "sfx", sound: this.sound });
          b.emit({ type: "buff", unit: u, text: ext ? "火焰延續" : "燃火！", color: "#e8781e" });
          b.emit({ type: "fxShape", shape: { shape: "circle", x: u.x, y: u.y, radius: 70 }, color: "#e8781e", dur: 600 });
        },
      },

      // ---------- W 薩拉曼達 ----------
      salamander: {
        name: "薩拉曼達", slot: "W", key: "w", ultimate: true, sound: WHIP, fireSound: FIRE,
        tags: ["area", "melee"],
        // 每下傷害＝base＋攻擊力×atkScale（多段攻擊的基礎值太小時，攻擊力幾乎沒影響，所以讓攻擊力直接加進基礎值）
        // 初始攻擊 16、打防禦 2 的敵人：每下約 5；十二連鞭每下約 4
        ap: 2, charge: 5, dist: 160, radius: 130, base: 3, atkScale: 0.19, hits: 8, dozenBase: 2.4, dozenScale: 0.15, mp: 20,
        desc: "對前方的圓形範圍連續揮鞭八下",
        n(u) { return upg(u).w1 === "dozen" ? 12 : this.hits; },
        circle(u, arg) { const d = dirOf(u, arg); return { shape: "circle", x: u.x + d.dx * this.dist, y: u.y + d.dy * this.dist, radius: this.radius, ang: d.ang }; },
        status(b, u) {
          const mp = C.costOf(b, u, this.mp);
          if (u.charge < this.charge) return { ready: false, cost: this.ap, mp, label: this.name, note: `${u.charge}/${this.charge}`, reason: `還要 ${this.charge - u.charge} 次行動才能使用` };
          return { ready: true, cost: this.ap, mp, label: this.name, note: mp ? `${mp} MP` : undefined, aim: { type: "direction" } };
        },
        predict(b, u, arg) { const c = this.circle(u, arg); return b.targetsFor(u).filter((e) => R.dist(e.x, e.y, c.x, c.y) <= c.radius + e.r); },
        preview(b, u, arg) { const c = this.circle(u, arg); return { shapes: [c], hits: this.predict(b, u, arg) }; },
        areaCenter(b, u, arg) { const c = this.circle(u, arg); return { x: c.x, y: c.y }; },
        use(b, u, arg) {
          const fire = C.useFire(b, u, this.mp), c = this.circle(u, arg), n = this.n(u), base = n > this.hits ? this.dozenBase + u.atk * this.dozenScale : this.base + u.atk * this.atkScale;
          u.charge = 0; u.facing = c.ang;
          b.say(`${u.name}：「薩拉曼達」！`);
          b.bark(u, "ult");
          lashSounds(b, n);
          if (fire) b.emit({ type: "sfx", sound: this.fireSound });
          // 跳到空中，同時甩出三條蛇腹劍
          const air = 0.26 * n + 0.24;
          b.emit({ type: "leap", unit: u, from: { x: u.x, y: u.y }, to: { x: u.x, y: u.y }, duration: air, height: 64 });
          b.emit({ type: "lash", x: u.x, y: u.y, ang: c.ang, half: 0.7, radius: this.dist + this.radius, hits: n, fire, circle: c, multi: 3, lift: 64 });
          const hits = this.predict(b, u, arg);
          for (let i = 0; i < n; i++) { b.hitDelay = i * 0.26 + 0.12; for (const e of hits) if (e.alive) b.damage(u, e, base, 1, `（第 ${i + 1} 下）`); }
          b.hitDelay = 0;
          if (fire || upg(u).w1 === "stage") C.leaveFire(b, u, c.x, c.y, (c.radius / C.passive.radius) * (fire ? 1 : 0.75));
        },
      },
    },
  };

  R.CHARACTERS[C.id] = C;
})();
