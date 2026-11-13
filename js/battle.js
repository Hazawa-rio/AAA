/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/battle.js": "20261114045024" });
// 戰鬥規則（不碰畫面）。畫面透過 battle.on(fn) 收到事件後重畫。
// 角色技能寫在 js/characters/，敵人 AI 寫在 js/ai.js，這裡只提供共用的規則。
(function () {
  const R = window.RPG;
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));
  R.dist = dist;
  R.sleep = sleep;

  // ---------- 幾何 ----------
  const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  const geo = {
    // 點到線段的距離
    pointSeg(px, py, ax, ay, bx, by) {
      const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
      const t = L2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L2)) : 0;
      return dist(px, py, ax + dx * t, ay + dy * t);
    },
    // 射線（單位方向 dx,dy）碰到圓的最近距離，沒碰到回傳 null
    rayCircle(ax, ay, dx, dy, cx, cy, r) {
      const fx = ax - cx, fy = ay - cy;
      const b = fx * dx + fy * dy, c = fx * fx + fy * fy - r * r;
      const disc = b * b - c;
      if (disc < 0) return null;
      const t = -b - Math.sqrt(disc);
      return t >= 0 ? t : (c <= 0 ? 0 : null);
    },
    // 點是否在旋轉長方形內（從 (x,y) 沿 ang 延伸 length，寬 width）
    inRect(px, py, t, margin) {
      const dx = px - t.x, dy = py - t.y, c = Math.cos(t.ang), s = Math.sin(t.ang);
      const along = dx * c + dy * s, across = -dx * s + dy * c;
      return along >= -margin && along <= t.length + margin && Math.abs(across) <= t.width / 2 + margin;
    },
    // 點是否在扇形內（圓心 x,y、朝 ang、半角 half、半徑 radius）
    inSector(px, py, t, margin) {
      const d = dist(px, py, t.x, t.y);
      if (d > t.radius + margin) return false;
      if (d <= margin) return true;
      return angDiff(Math.atan2(py - t.y, px - t.x), t.ang) <= t.half + Math.asin(Math.min(1, margin / d));
    },
    angDiff,
  };
  R.geo = geo;

  class ActionError extends Error {}
  R.ActionError = ActionError;

  let nextId = 1;
  class Unit {
    constructor(team, kind, def, stats, x, y, r) {
      this.id = "u" + nextId++;
      this.team = team;
      this.kind = kind;
      this.def = def;              // 角色或敵人的設定（技能數值即時讀這裡）
      this.name = def.name;
      this.x = x; this.y = y;
      this.r = r;                  // 碰撞半徑（Boss 核心比較大）
      this.maxHp = this.hp = stats.hp;
      this.maxMp = this.mp = stats.mp || 0;
      this.atk = stats.atk; this.df = stats.df; this.spd = stats.spd;
      this.maxAp = this.ap = stats.ap;
      this.facing = team === "player" ? -Math.PI / 2 : Math.PI / 2;
      this.state = {};             // 角色/敵人自己的狀態（上膛、蓄力…）
      this.cd = {};                // 冷卻：技能 id → 還要幾次行動
      this._cdSet = new Set();     // 這次行動剛設定的冷卻，不要馬上扣
      this.actions = 0;            // 累計行動次數
      this.charge = 0;             // 大招充能（行動次數）
      this.initRoll = 0;           // d20 擲出的點數
      this.part = false;           // 是否為 Boss 的部位（不參與回合）
      this.parent = null;
      this.parts = [];
    }
    get alive() { return this.hp > 0 || !!this.keepAlive; }   // keepAlive：教學 NPC 這種不會倒下的單位
    get initiative() { return this.initRoll + this.spd + (this.initMod || 0); }
  }

  class Battle {
    // variant：有多個選擇的房間（Boss 測試房）要用哪一個
    constructor(cfg, charId, roomId, variant) {
      this.cfg = cfg;
      this.room = R.resolveRoom ? R.resolveRoom(cfg, roomId, variant) : cfg.rooms[roomId] || Object.values(cfg.rooms)[0];
      this.units = [];
      const ch = R.CHARACTERS[charId] || Object.values(R.CHARACTERS)[0];
      this.char = ch;
      const ps = this.room.playerStart;
      // 成長系統：等級、數值、技能強化（沒有成長系統或固定角色就用原始數值）
      const grow = R.Progress ? R.Progress.forBattle(ch) : { level: 1, stats: ch.stats, upg: {} };
      this.player = this.add(new Unit("player", ch.id, ch, grow.stats, ps.x, ps.y, cfg.body * (ch.bodyScale || 1)));   // 蒼幽比較小：比較難被打中
      this.player.level = grow.level;
      this.player.upg = grow.upg;          // 例如 { q1: "split", e2: "linger", w1: "dance" }
      this.player.items = grow.items || []; // 寶物欄（最多 6 格）
      this.crystals = (this.room.crystals || []).map((c) => ({ ...c, broken: false }));   // 例如翁爾貢的房間：邊緣的能量水晶
      if (R.Items?.onStart) R.Items.onStart(this, this.player);          // 例如天才的1%靈感：投射技能的射程變長
      for (const sp of this.room.wave) this.spawnEnemy(sp);
      // 護送戰：要保護的馬車（會被敵人的攻擊打到，不參與回合）
      this.wards = [];
      for (const w of this.room.escort ? this.room.wagons || [] : []) {
        const d = { ...this.room.wagon, ...w, hp: w.hp || this.room.wagon.hp, atk: 0, df: 0, spd: 0, ap: 0 };
        const u = this.add(new Unit("ally", "wagon", d, d, w.x, w.y, d.r || 34));
        u.ward = true;
        this.wards.push(u);
      }

      this.round = 0;
      this.order = [];
      this.idx = -1;
      this.phase = "idle";        // player / enemy / over
      this.result = null;
      this.charges = [];          // 蓄力到下次回合才發動的攻擊（史萊姆壓制）
      this.zones = [];            // 場上的區域效果（煙霧…）
      this.threats = [];          // 正在倒數的預告攻擊（長方形 / 扇形 / 圓形）
      this.projectiles = [];      // 飛行中的光彈
      this.log = [];
      this.listeners = new Set();
      this.bushes = this.makeBushes();   // 地形：草原的草叢
      this.dead = false;
      this._timers = new Set();
      ch.init?.(this, this.player);           // 敵人都放好之後才初始化角色（心魔要找空位）
    }

    spawnEnemy(sp) {
      const d = this.cfg.enemies[sp.kind];
      const u = this.add(new Unit("enemy", sp.kind, d, d, sp.x, sp.y, d.r || this.cfg.body));
      u.home = { x: sp.x, y: sp.y };       // 出生點（復活時用）
      // Boss 的部位（例如能量矩陣）：可以被攻擊，但不參與行動順序
      for (const pd of d.parts || []) {
        const a = (pd.angle * Math.PI) / 180;
        const p = this.add(new Unit("enemy", d.part.kind || "part", d.part, d.part,
          sp.x + Math.cos(a) * d.armLength, sp.y + Math.sin(a) * d.armLength, d.part.r || this.cfg.body));
        p.name = pd.name;
        p.part = true;
        p.parent = u;
        p.angle = a;
        u.parts.push(p);
      }
      R.AI[d.ai]?.init?.(this, u);
      return u;
    }

    add(u) { this.units.push(u); return u; }
    on(fn) { this.listeners.add(fn); }
    // 畫面那邊就算出錯，也不能讓戰鬥流程卡住
    emit(ev) {
      if (this.dead) return;
      if (ev && this.bushes?.length) this.cutBushes(ev);
      for (const f of this.listeners) {
        try { f(ev || { type: "update" }); } catch (e) { console.error(e); }
      }
    }
    say(t) { this.log.push(t); if (this.log.length > 120) this.log.shift(); }
    destroy() {
      this.dead = true;
      this.listeners.clear();
      for (const t of this._timers) clearTimeout(t);
      clearInterval(this._projTimer);
      this.projectiles = [];
    }
    wait(s) {
      return new Promise((res) => {
        const id = setTimeout(() => { this._timers.delete(id); res(); }, s * 1000);
        this._timers.add(id);
      });
    }

    get current() { return this.order[this.idx]; }
    // 一般敵人（不含心魔這種特殊目標）
    enemies() { return this.units.filter((u) => u.team === "enemy" && u.alive && !u.demon && !u.cage); }
    cages() { return this.units.filter((u) => u.cage && u.alive); }
    mainEnemies() { return this.enemies().filter((u) => !u.part); }
    demons() { return this.units.filter((u) => u.demon && u.alive); }
    // 某個玩家角色能攻擊的目標：心魔只有召喚它的角色打得到
    npcs() { return this.units.filter((u) => u.npc && u.alive); }
    targetsFor(u) { return [...this.enemies().filter((e) => !e.state?.dived), ...this.cages(), ...this.demons().filter((d) => d.owner === u), ...this.npcs()]; }
    // 困住玩家的聖牢籠
    cageOf(u) { return this.cages().find((c) => c.holds === u) || null; }
    inCage(c, x, y, margin = 0) { return Math.abs(x - c.x) <= c.size / 2 - margin && Math.abs(y - c.y) <= c.size / 2 - margin; }
    // 移動半徑 = 速度 × 13；speedBoost 是暫時的速度倍率（例如游擊作戰）
    // 移動半徑：速度 × 倍率（游擊作戰加速、麻痺減速…）
    moveRadius(u) { return u.spd * this.cfg.movePerSpd * (u.state?.speedBoost || 1) * (this.slowed(u) ? u.state.slowMult : 1); }
    // 麻痺（減速）、破防：在 until 那一回合結束前有效
    slowed(u) { return !!u.state && u.state.slowUntil >= this.round; }
    defOf(u) { return u.state?.defDownUntil >= this.round ? Math.round(u.df * u.state.defDownMult) : u.df; }
    // 我方的召喚物（例如薇薇拉的巨大蘑菇）：會被敵人的攻擊打到、吸引低智力敵人
    allies() { return this.units.filter((u) => (u.summon || u.ward) && u.alive); }
    // 敵人要打誰：低智力的敵人會被附近的召喚物吸引
    aggroTarget(e) {
      const p = this.player;
      if (this.room.escort && !e.def.ignoreWards) return this.escortTarget(e);      // 護送戰：一般敵人都衝向要保護的東西（玩家靠近時改打玩家）
      // 被召喚物打到而惹火（例如蒼幽的幽靈魚）：不管智力高低，先反擊那隻召喚物
      const pv = e.state?.provokedBy;
      if (pv && pv.alive && e.state.provokedUntil >= this.round) return pv;
      if (!e.def.lowIntel) return p;
      let best = p, bd = dist(e.x, e.y, p.x, p.y) - (e.def.decoyBias ?? 150);
      for (const a of this.allies()) {
        const d = dist(e.x, e.y, a.x, a.y);
        if (a.decoy && d < bd) { best = a; bd = d; }
      }
      return best;
    }

    // 角色的個性台詞（畫面決定要不要顯示，不會每次都跳）
    bark(u, key, delay = 0) { if (u === this.player) key = this.char.barkKey?.(this, u, key) || key; this.emit({ type: "bark", unit: u, key, delay }); }   // barkKey：角色換事件名（例如魘受傷＝yanHurt）

    heal(u, amount, note = "") {
      if (!u.alive || amount <= 0) return 0;
      // 角色無法回復（例如悠魘變身成魘）
      if (this.char.noHeal?.(this, u)) { this.emit({ type: "miss", x: u.x, y: u.y, text: "無法回復" }); return 0; }
      const got = Math.min(amount, u.maxHp - u.hp);
      if (got <= 0) return 0;
      u.hp += got;
      this.say(`${u.name} 回復 ${got} 點生命${note}`);
      this.emit({ type: "heal", unit: u, amount: got });
      return got;
    }
    // 護盾：先扣護盾再扣生命（上限＝最大生命的 maxShieldRatio）
    addShield(u, amount, note = "") {
      if (!u.alive || amount <= 0) return 0;
      const cap = Math.round(u.maxHp * (this.cfg.maxShieldRatio || 0.8));
      const got = Math.max(0, Math.min(Math.round(amount), cap - (u.shield || 0)));
      if (got <= 0) return 0;
      u.shield = (u.shield || 0) + got;
      this.say(`${u.name} 獲得 ${got} 點護盾${note}`);
      this.emit({ type: "shieldGain", unit: u, amount: got });
      return got;
    }
    // 虛弱：造成的傷害變低（到 until 那一回合結束前）
    weaken(u, mult, rounds = 1, text = "虛弱") {
      const who = u.parent || u;
      if (!who.alive) return;
      const until = this.round + rounds;
      who.state.weakMult = who.state.weakUntil >= this.round ? Math.min(who.state.weakMult, mult) : mult;
      who.state.weakUntil = Math.max(who.state.weakUntil || 0, until);
      this.emit({ type: "buff", unit: u, text, color: "#7a3fb0" });
    }
    weakOf(u) { const w = u.parent || u; return w.state?.weakUntil >= this.round ? w.state.weakMult : 1; }
    // 有沒有負面狀態可以解除（例如乳酸飲料要先確認）
    hasDebuff(u) { const s = u.state || {}, r = this.round; return s.flawUntil >= r || s.slowUntil >= r || s.defDownUntil >= r || s.weakUntil >= r || !!s.apPenalty; }
    // 去除一個負面狀態（破綻、麻痺、破防、虛弱、扣行動點），回傳去掉的名稱
    cleanse(u) {
      const s = u.state;
      if (s.flawUntil >= this.round) { s.flawUntil = 0; return "破綻"; }
      if (s.slowUntil >= this.round) { s.slowUntil = 0; return "麻痺"; }
      if (s.defDownUntil >= this.round) { s.defDownUntil = 0; return "破防"; }
      if (s.weakUntil >= this.round) { s.weakUntil = 0; return "虛弱"; }
      if (s.apPenalty) { s.apPenalty = 0; return "行動點減少"; }
      return null;
    }
    // 能站的範圍：例如海上的戰鬥，玩家只能在船上（room.walk 長方形）
    // 房間裡的障礙物（例如理性倉庫的貨架、遺跡的柱子）：誰都不能站上去（會飛的古代巡弋機關也一樣）
    // 遺跡的矮牆：地上走的（玩家、守衛機關）不能站上去；會飛的巡弋機關飛得過去
    obstacleAt(u, x, y) {
      const r = (u.r || this.cfg.body) * 0.85, hit = (o) => x + r > o.x && x - r < o.x + o.w && y + r > o.y && y - r < o.y + o.h;
      if (this.room.obstacles?.some(hit)) return this.room.terrain === "ruins" ? "柱子" : "貨架";
      if (!u.def?.fly && this.room.lowWalls?.some(hit)) return "矮牆";
      return null;
    }
    onObstacle(u, x, y) { return !!this.obstacleAt(u, x, y); }
    // 掩體：兩點之間的直線有沒有被障礙物擋住
    coverBetween(a, b) {
      const O = this.room.obstacles;
      if (!O) return false;
      const d = dist(a.x, a.y, b.x, b.y), n = Math.ceil(d / 8);
      for (let i = 1; i < n; i++) { const x = a.x + ((b.x - a.x) * i) / n, y = a.y + ((b.y - a.y) * i) / n; if (O.some((o) => x > o.x && x < o.x + o.w && y > o.y && y < o.y + o.h)) return true; }
      return false;
    }
    // 矮牆（小掩體）：擋住地上走的（玩家、守衛機關），投擲物飛得過去；擋得住敵人的射擊（巡弋機關的子彈）
    lowCoverBetween(a, b) {
      const O = this.room.lowWalls;
      if (!O?.length) return false;
      const d = dist(a.x, a.y, b.x, b.y), n = Math.ceil(d / 8);
      for (let i = 1; i < n; i++) { const x = a.x + ((b.x - a.x) * i) / n, y = a.y + ((b.y - a.y) * i) / n; if (O.some((o) => x > o.x && x < o.x + o.w && y > o.y && y < o.y + o.h)) return true; }
      return false;
    }
    // 古代遺跡的機關（回合開始時）：地刺偶數回合刺出來、雷射一直開著
    spikesOut() { return !!this.room.spikes?.length && this.round % 2 === 0; }
    laserPaths() {
      const A = { x: 0, y: 0, w: 1280, h: 720 };
      return (this.room.lasers || []).map((L) => R.Ruins.laserPath(L.x, L.y, L.dx, L.dy, this.room.mirrors, A));
    }
    roomHazards() {
      if (!R.Ruins || !(this.room.spikes?.length || this.room.lasers?.length)) return;
      const src = { atk: 16, team: "hazard", name: "機關", state: {}, def: {} };
      const paths = this.laserPaths();
      for (const u of this.units.filter((x) => x.alive && !x.part && !x.ward)) {
        const r = u.r || this.cfg.body;
        if (this.spikesOut() && !u.def?.fly && this.room.spikes.some((o) => u.x + r * 0.5 > o.x && u.x - r * 0.5 < o.x + o.w && u.y + r * 0.5 > o.y && u.y - r * 0.5 < o.y + o.h)) {
          this.say(`地刺刺了出來！`); this.emit({ type: "buff", unit: u, text: "地刺", color: "#8a8478" }); this.damage(src, u, 10, 1, "（地刺）");
        }
        if (u.alive && paths.some((pts) => R.Ruins.distToPath(u.x, u.y, pts) < r * 0.7)) { this.emit({ type: "buff", unit: u, text: "雷射", color: "#e8262c" }); this.damage(src, u, 9, 1, "（雷射）"); }
      }
      this.checkEnd();
    }
    walkOk(u, x, y) {
      if (this.onObstacle(u, x, y)) return false;
      const w = this.room.walk;
      if (!w || u.team !== "player") return true;
      const m = (u.r || this.cfg.body) * 0.7 * (this.char.drawScale || 1);     // 霍夫曼的方塊比較大：離船邊也要遠一點
      return x >= w.x + m && x <= w.x + w.w - m && y >= w.y + m && y <= w.y + w.h - m;
    }
    // 站在不能站的地方（例如船外的海上）：移到最近能站的位置
    unstick(u) {
      if (this.walkOk(u, u.x, u.y)) return;
      if (this.onObstacle(u, u.x, u.y)) {        // 卡在貨架上：移到旁邊最近的空地
        for (let r = 8; r < 300; r += 8) for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2, x = u.x + Math.cos(a) * r, y = u.y + Math.sin(a) * r;
          if (!this.onObstacle(u, x, y)) { u.x = x; u.y = y; return; }
        }
        return;
      }
      const w = this.room.walk;
      if (!w) return;
      const m = (u.r || this.cfg.body) * 0.7 * (this.char.drawScale || 1) + 1;
      u.x = Math.min(Math.max(u.x, w.x + m), w.x + w.w - m);
      u.y = Math.min(Math.max(u.y, w.y + m), w.y + w.h - m);
      this.say(`${u.name} 回到了船上`);
    }
    blocked(u, x, y) {
      if (!this.walkOk(u, x, y)) return true;
      return this.units.some((o) => o !== u && o.alive && !o.cage && !o.state?.dived && dist(o.x, o.y, x, y) < (u.r || this.cfg.body) + o.r);
    }
    // 近戰距離：從邊緣算，大型目標不用貼到中心
    reach(a, t) { return dist(a.x, a.y, t.x, t.y) - (t.r - this.cfg.body); }
    skill(id) { return this.char.skills[id]; }

    // ---------- 回合流程 ----------
    start() { this.room.onStart?.(this); if (this.room.escort) this.startEscort(); else this.nextTurn(); }      // onStart：房間自己的玩法（例如酒神的酒杯）

    // ---------- 護送戰（特殊戰鬥）：沒有回合 ----------
    // 行動點每 apEvery 秒 +1；每 tickEvery 秒算一次「玩家回合開始」（魔力回復、煙霧計時…）
    // 敵人各自每隔幾秒行動一次；照時間表出現；時間內全部打倒、保住 need 輛馬車就成功
    startEscort() {
      const E = this.room;
      this.realtime = true;
      this.round = 1;
      this.order = [this.player];
      this.idx = 0;
      this.phase = "player";
      this.escortStart = performance.now();
      this.escortWaves = E.waves.map((w) => ({ ...w, done: false }));
      this.player.ap = this.player.maxAp;
      this.say(`${E.words?.start || "護送開始！"}限時 ${E.duration} 秒，行動點每 ${E.apEvery} 秒 +1`);
      this.emit({ type: "turn", unit: this.player });
      let lastAp = performance.now(), lastTick = performance.now();
      this._escortTimer = setInterval(() => {
        if (this.dead || this.phase === "over") { clearInterval(this._escortTimer); return; }
        const now = performance.now(), t = this.escortTime();
        // 魔狼照時間表出現
        for (const w of this.escortWaves) if (!w.done && t >= w.t) {
          w.done = true;
          this.say(w.say || E.words?.wave || "魔狼群衝向車隊！");
          for (const sp of w.list) this.runRealtimeEnemy(this.spawnEnemy(sp));
          this.emit({ type: "wave" });
        }
        if (now - lastAp >= E.apEvery * 1000) {
          lastAp += E.apEvery * 1000;
          const u = this.player;
          if (u.alive && u.ap < u.maxAp) { u.ap++; this.emit({ type: "apGain", unit: u }); }
        }
        if (now - lastTick >= E.tickEvery * 1000) {
          lastTick += E.tickEvery * 1000;
          this.round++;
          const u = this.player;
          if (u.def.mpRegen && u.mp < u.maxMp) { const n = Math.min(u.maxMp - u.mp, Math.round(u.maxMp * u.def.mpRegen)); u.mp += n; this.emit({ type: "mpRegen", unit: u, amount: n }); }
          this.char.onTurnStart?.(this, u);
          this.tickZones(u);
        }
        E.onTick?.(this, t, 0.1);                 // 護送戰自己的機制（例如海底的氧氣區）
        this.checkEnd();
        this.emit();
      }, 100);
      this._timers.add(this._escortTimer);
    }
    escortTime() { return this.escortStart ? (performance.now() - this.escortStart) / 1000 : 0; }
    escortLeft() { return Math.max(0, this.room.duration - this.escortTime()); }
    // 即時行動的敵人：每隔幾秒做一個動作（不用行動點）
    async runRealtimeEnemy(u) {
      const [a, b] = this.room.enemyAct;
      await this.wait(0.6 + Math.random() * 0.8);
      while (!this.dead && this.phase !== "over" && u.alive) {
        u.ap = u.maxAp;
        // 沒有「一個動作」版本的 AI（例如船長型的 Boss、槍手）：給 2 點行動點跑一次回合
        try { const ai = R.AI[u.def.ai]; if (ai.actOnce) await ai.actOnce(this, u); else { u.ap = Math.min(u.maxAp, 2); await ai.takeTurn(this, u); } } catch (e) { console.error(e); }
        this.emit();
        await this.wait(a + Math.random() * (b - a));
      }
    }
    // 護送戰的目標：玩家靠近就咬玩家，否則咬最近的馬車
    escortTarget(u) {
      const p = this.player, carts = this.wards.filter((w) => w.alive);
      if (p.alive && (dist(u.x, u.y, p.x, p.y) < 170 || !carts.length)) return p;
      return carts.sort((a, b) => dist(u.x, u.y, a.x, a.y) - dist(u.x, u.y, b.x, b.y))[0];
    }

    newRound() {
      this.round++;
      this.say(`── 第 ${this.round} 回合 ──`);
      this.roomHazards();
      if (this.round === 1 && !this.fixedOrder) {
        // 行動順序只在第一回合決定：1d20 + 速度，高的先動；同分比速度，再同分玩家先
        const die = this.cfg.initiativeDie;
        const alive = this.units.filter((u) => u.alive && !u.part && !u.demon);
        for (const u of alive) u.initRoll = 1 + Math.floor(Math.random() * die);
        this.order = alive.sort((a, b) => (b.def.alwaysFirst ? 1 : 0) - (a.def.alwaysFirst ? 1 : 0) ||
          b.initiative - a.initiative || b.spd - a.spd ||
          (a.team === "player" ? -1 : b.team === "player" ? 1 : 0));
        this.say("順序：" + this.order.map((u) => `${u.name}(${u.initRoll}+${u.spd}${u.initMod ? (u.initMod > 0 ? "+" : "") + u.initMod : ""})`).join("、"));
      } else {
        // 之後沿用第一回合的順序，只移除倒下的單位
        this.order = this.order.filter((u) => u.alive);
      }
      this.idx = 0;
    }

    nextTurn() {
      if (this.checkEnd()) return;
      this.idx++;
      if (this.idx >= this.order.length) this.newRound();
      while (!this.current.alive) {
        this.idx++;
        if (this.idx >= this.order.length) this.newRound();
      }
      const u = this.current;
      u.ap = u.maxAp;
      // 上一次被扣的「下回合行動點」（例如沉重試煉）
      if (u.state.apPenalty) {
        const n = Math.min(u.ap, u.state.apPenalty);
        u.ap -= n; u.state.apPenalty = 0;
        if (n) this.emit({ type: "apDrain", unit: u, amount: n });
      }
      this.say(`輪到 ${u.name}${u.ap < u.maxAp ? `（行動點 ${u.ap} / ${u.maxAp}）` : ""}`);
      // 魔力：自己的回合開始時回復
      // mpRegen：最大魔力的比例（例如 0.35 = 35%）
      if (u === this.player && u.def.mpRegen && u.mp < u.maxMp) {
        const n = Math.min(u.maxMp - u.mp, Math.round(u.maxMp * u.def.mpRegen));
        u.mp += n;
        this.emit({ type: "mpRegen", unit: u, amount: n });
      }
      this.char.onTurnStart?.(this, u);       // 玩家角色對「任何單位回合開始」的效果（例如循環試煉的殘影爆炸）
      // 場上單位對「任何單位回合開始」的效果（例如聖牢籠在敵人回合傷害被困住的玩家）
      for (const e of [...this.units]) if (e.alive && e !== u && e.def.ai) R.AI[e.def.ai]?.onAnyTurnStart?.(this, e, u);
      if (this.checkEnd()) return;
      if (!u.alive) { this.emit(); this.nextTurn(); return; }
      // 被禁錮（例如觀知命的噩運連連）：跳過這次行動
      if (u.team === "enemy" && u.state.imprisoned) {
        u.state.imprisoned = false;
        this.say(`${u.name} 被禁錮了，動彈不得`);
        this.emit({ type: "buff", unit: u, text: "禁錮", color: "#8a1a24" });
        this.tickZones(u);
        this.phase = "enemy"; this.emit();
        this.wait(0.6).then(() => { if (this.phase !== "over" && !this.dead) this.nextTurn(); });
        return;
      }
      this.tickZones(u);
      // 有自己回合的召喚物（例如蒼幽的魚群）：交給角色檔行動，做完換下一位
      if (u.summon && u !== this.player && this.char.summonTurn) {
        this.phase = "summon";
        this.emit({ type: "turn", unit: u });
        Promise.resolve(this.char.summonTurn(this, u)).catch((e) => console.error(e)).then(() => { if (this.phase !== "over" && !this.dead) { this.emit(); this.nextTurn(); } });
        return;
      }
      if (u.team === "player") this.unstick(u);
      if (u.team === "player") {
        this.phase = "player";
        this.emit({ type: "turn", unit: u });
      } else {
        this.phase = "enemy";
        this.emit({ type: "turn", unit: u });
        this.runEnemyTurn(u);
      }
    }

    // 區域效果以「放置者自己的回合」計算，放下的那一回合不算
    // 例：第 1 回合放下、持續 3 回合 → 第 2、3、4 回合都還在，第 5 回合輪到放置者時消散
    tickZones(owner) {
      const expired = [];
      for (const z of this.zones) {
        if (z.owner !== owner) continue;
        if (z.turnsLeft <= 0) expired.push(z);
        else z.turnsLeft--;
      }
      if (!expired.length) return;
      this.zones = this.zones.filter((z) => !expired.includes(z));
      const names = { smoke: "團煙霧散去了", trap: "顆種下的蘑菇枯萎了", lucky: "個吉位消失了", unlucky: "個兇位消失了", taijiField: "個陰陽陣停止了轉動" };
      for (const t of new Set(expired.map((z) => z.type))) this.say(`${expired.filter((z) => z.type === t).length} ${names[t] || "個區域效果消失了"}`);
      this.emit({ type: "zoneExpire", zones: expired });
    }

    // 局內調整成長：立刻套用到玩家身上（不重開戰鬥）
    // 生命、魔力、行動點上限增加多少，目前值就跟著加多少；降低時不超過新上限
    applyGrowth() {
      const u = this.player, ch = this.char;
      const g = R.Progress.forBattle(ch);
      const before = { level: u.level, upg: JSON.stringify(u.upg) };
      const dHp = g.stats.hp - u.maxHp, dMp = (g.stats.mp || 0) - u.maxMp, dAp = g.stats.ap - u.maxAp;
      u.maxHp = g.stats.hp; if (u.alive) u.hp = Math.max(1, Math.min(u.maxHp, u.hp + Math.max(0, dHp)));
      u.maxMp = g.stats.mp || 0; u.mp = Math.max(0, Math.min(u.maxMp, u.mp + Math.max(0, dMp)));
      u.maxAp = g.stats.ap; u.ap = Math.max(0, Math.min(u.maxAp, u.ap + Math.max(0, dAp)));
      u.atk = g.stats.atk; u.df = g.stats.df; u.spd = g.stats.spd;
      u.level = g.level; u.upg = g.upg; u.items = g.items || [];
      // 煙霧上限變小時，最舊的煙霧消失
      ch.onGrowth?.(this, u);
      if (u.level !== before.level) this.say(`${u.name} 的等級變成 Lv ${u.level}`);
      if (JSON.stringify(u.upg) !== before.upg) this.say(`${u.name} 的技能強化改變了`);
      this.emit({ type: "growth", unit: u, level: u.level, up: u.level > before.level });
    }

    checkEnd() {
      if (this.phase === "over") return true;
      let result = null;
      if (!this.player.alive) result = "lose";
      else if (!this.scripted && !this.mainEnemies().length) result = "win";   // 劇本房間（教學）由劇本決定結束
      if (this.room.escort && result !== "lose") {
        result = null;
        const alive = this.wards.filter((w) => w.alive).length;
        const allOut = this.escortWaves?.every((w) => w.done);
        const W = this.room.words || {}, unit = W.unit || "輛", noun = W.noun || "馬車";
        if (alive < this.room.need) { this.finish("escortFail", `${noun}只剩 ${alive} ${unit}……${W.fail || "護送失敗"}`); return true; }
        // goalWin：自己的勝利條件（例如把病床推到走廊的另一頭），打光敵人不算贏
        if (this.room.goalWin) {
          if (this.room.goalWin(this)) { this.finish("win", `${W.win || "成功了！"}保住了 ${alive} ${unit}${noun}`); return true; }
          if (this.escortLeft() <= 0) { this.finish("escortFail", W.timeUp || "時間到了……"); return true; }
          return false;
        }
        // surviveWin：撐到時間結束就算贏（例如守住精品店：暴民會一直來）
        if (this.room.surviveWin && this.escortLeft() <= 0) { this.finish("win", `${W.win || "撐住了！"}保住了 ${alive} ${unit}${noun}`); return true; }
        if (allOut && !this.mainEnemies().length) { this.finish("win", `${W.win || "擊退了所有魔狼！"}保住了 ${alive} ${unit}${noun}`); return true; }
        if (this.escortLeft() <= 0) { this.finish("escortFail", W.timeUp || "時間到了……魔狼還在攻擊車隊，護送失敗"); return true; }
        return false;
      }
      if (!result) return false;
      this.finish(result, result === "win" ? "勝利！" : "被打倒了……");
      return true;
    }
    // 結束戰鬥（勝利、戰敗，或從地圖小怪戰撤退成功 "fled"）
    finish(result, text) {
      if (this.phase === "over") return;
      this.phase = "over";
      this.result = result;
      this.threats = [];
      this.charges = [];
      this.projectiles = [];
      if (text) this.say(text);
      this.emit({ type: "over" });
    }

    // ---------- 玩家操作 ----------
    // 自己的回合正常消耗；敵人的回合也能行動，但行動點消耗加倍，而且不能放大招
    offTurn() { return this.phase === "enemy"; }
    costMult() { return this.offTurn() ? this.cfg.offTurnMultiplier : 1; }
    // cutscene：Boss 變身這類演出中，玩家暫時不能行動
    canAct() { return this.player.alive && !this.cutscene && (this.phase === "player" || this.offTurn()); }

    requireCanAct(actionId) {
      if (!this.canAct()) throw new ActionError("現在不能行動");
      if (this.allowed && !this.allowed.has(actionId)) throw new ActionError("教學中還不能使用");
      if (this.offTurn() && actionId && actionId === this.char.ultimate) throw new ActionError("大招只能在自己的回合使用");
    }
    requirePlayerTurn() {
      if (this.phase !== "player") throw new ActionError("現在不是你的回合");
    }

    move(x, y) {
      this.requireCanAct("move");
      const cost = this.freeAP ? 0 : this.cfg.moveCost * this.costMult();   // freeAP：教學中不消耗行動點
      this._move(this.player, x, y, cost);
      this.countAction(this.player, "move", cost);
      this.char.onAction?.(this, this.player, "move", cost);     // 角色強化的「行動後」效果
      this.enemyAfterPlayer("move");
      this.afterPlayerAction();
    }

    // 使用技能（含普攻）。技能的 status() 決定能不能用、基本花多少行動點
    useSkill(id, arg = {}) {
      this.requireCanAct(id);
      const u = this.player, sk = this.skill(id);
      if (!sk) throw new ActionError("沒有這個技能");
      const st = sk.status(this, u);
      if (!st.ready) throw new ActionError(st.reason || "現在不能用");
      const cost = this.freeAP ? 0 : st.cost * this.costMult();
      if (u.ap < cost) throw new ActionError(`行動點不足（需要 ${cost}）`);
      const mp = st.mp || 0;                     // 魔力消耗
      if (u.mp < mp) throw new ActionError(`魔力不足（需要 ${mp}）`);
      this.currentSkill = id;           // 讓 NPC 知道被哪一招打到
      this.skillSeq = (this.skillSeq || 0) + 1;
      // 有智力的敵人看得出攻擊會打到自己，會在結算前花行動點閃避
      if (sk.predict) {
        const hits = sk.predict(this, u, arg, st);           // 不合法會丟 ActionError，此時什麼都還沒扣
        if (hits.length) this.enemyReact(hits, {
          src: u, skill: id,
          origins: sk.origins ? sk.origins(this, u, arg) : [{ x: u.x, y: u.y }],   // 攻擊從哪裡飛過來
          speed: sk.projectileSpeed || 0,                                          // 飛行速度（近戰為 0）
          repredict: () => { try { return sk.predict(this, u, arg, st); } catch { return []; } },
        });
      }
      // 範圍技能的中心（輝煌之冠這類寶物用）：要在技能用掉心魔之前先記下
      const center = sk.tags?.includes("area") ? this.areaCenter(sk, u, arg) : null;
      try { sk.use(this, u, arg, st); } finally { this.currentSkill = null; }
      u.ap -= cost;
      if (mp) u.mp -= mp;
      this.countAction(u, id, cost);
      this.char.onAction?.(this, u, id, cost);
      if (R.Items && u.items?.length) R.Items.afterSkill(this, u, sk, center);
      this.enemyAfterPlayer(id);
      this.afterPlayerAction();
    }

    areaCenter(sk, u, arg) {
      if (sk.areaCenter) return sk.areaCenter(this, u, arg);
      const o = sk.origins?.(this, u, arg);
      if (o?.length) return o[0];
      if (arg && Number.isFinite(arg.x)) return { x: arg.x, y: arg.y };
      return { x: u.x, y: u.y };
    }

    // 玩家每做完一個動作，有智力的敵人可能會反應（例如受難之日搶先揮劍）
    enemyAfterPlayer(actionId) {
      if (this.phase === "over") return;
      for (const e of this.mainEnemies()) R.AI[e.def.ai]?.afterPlayerAction?.(this, e, actionId);
    }

    endTurn() {
      this.requirePlayerTurn();
      if (this.realtime) throw new ActionError("護送戰沒有回合，行動點每 1.5 秒會自己回復");
      if (this.scripted && !this.inFight) throw new ActionError("教學中不用結束回合");
      this.say(`${this.player.name} 結束回合（保留 ${this.player.ap} 點）`);
      this.char.onTurnEnd?.(this, this.player);
      this.nextTurn();
    }

    afterPlayerAction() {
      // 角色的長演出（例如蒼幽的靜謐遊行、悠魘的咕哩咕妞）還沒播完：等演出結束再結算、換回合
      const wait = (this.lockUntil || 0) - (typeof performance !== "undefined" ? performance.now() : Date.now());
      if (wait > 0) { this.emit(); clearTimeout(this._lockWait); this._lockWait = setTimeout(() => this.afterPlayerAction(), Math.min(wait, 400) + 30); return; }
      if (this.checkEnd()) return;
      if (this.scripted && !this.inFight) { this.emit(); this.tutorial?.afterAction?.(); return; }
      if (this.realtime) { this.emit(); return; }        // 護送戰：沒有回合
      // 敵人回合中的行動不會結束任何回合
      if (this.phase === "player" && this.player.ap <= 0 && !this.char.canActFree?.(this, this.player)) { this.char.onTurnEnd?.(this, this.player); this.nextTurn(); }
      else this.emit();
    }

    // 自己回合內每做一次「有消耗行動點」的行動：冷卻 -1、大招充能 +1
    // 不算的：不花行動點的行動（例如上膛後免費射箭）、非自己回合的應急行動
    // （教學中不消耗行動點的階段照樣會算，不然冷卻永遠不會好）
    countAction(u, actionId, apSpent) {
      u.actions++;
      if (this.offTurn() || !(apSpent > 0 || this.freeAP)) { u._cdSet.clear(); return; }
      for (const k of Object.keys(u.cd)) if (u.cd[k] > 0 && !u._cdSet.has(k)) u.cd[k]--;
      u._cdSet.clear();
      const ult = u.def.ultimate;
      if (ult && actionId !== ult && !this.char.noCharge?.(this, u, actionId)) {
        const need = this.char.chargeNeed?.(this, u) ?? u.def.skills[ult].charge, before = u.charge;      // chargeNeed：角色強化改變大招要的充能（例如悠魘）
        u.charge = Math.min(need, u.charge + 1);
        if (u.charge !== before) this.char.onCharge?.(this, u, u.charge);
      }
    }
    setCooldown(u, key, n) { u.cd[key] = n; u._cdSet.add(key); }

    _move(u, x, y, cost) {
      if (u.ap < cost) throw new ActionError(`行動點不足（需要 ${cost}）`);
      const B = this.cfg.body, A = this.cfg.arena;
      x = Math.min(Math.max(x, B), A.w - B);
      y = Math.min(Math.max(y, B), A.h - B);
      // 只能在船上：點到海上就停在船邊
      const W = this.room.walk;
      if (W && u.team === "player") { const m = B * 0.7 + 0.5; x = Math.min(Math.max(x, W.x + m), W.x + W.w - m); y = Math.min(Math.max(y, W.y + m), W.y + W.h - m); }
      const d = dist(u.x, u.y, x, y);
      if (d > this.moveRadius(u) + 0.5) throw new ActionError("超出移動範圍");
      if (d < 1) throw new ActionError("位置沒有改變");
      if (this.onObstacle(u, x, y)) throw new ActionError(`那裡有${this.obstacleAt(u, x, y)}`);
      if (this.blocked(u, x, y)) throw new ActionError("那裡有其他單位");
      const cage = this.cageOf(u);
      if (cage && !this.inCage(cage, x, y, B * 0.6)) throw new ActionError(`被聖牢籠困住了！攻擊牢籠 ${cage.hp} 次才能出去`);
      u.facing = Math.atan2(y - u.y, x - u.x);
      u.x = x; u.y = y;
      u.ap -= cost;
      this.emit({ type: "move", unit: u });
      if (u === this.player) this.room.onPlayerMove?.(this, u);          // 房間自己的玩法（例如走到酒杯上就喝掉）
    }

    // base = 技能基礎傷害；mult = 額外倍率（例如穿過煙霧 ×1.5）
    damage(src, dst, base, mult = 1, note = "") {
      this.lastEvade = false;
      if (!dst.alive) return 0;
      // 教學 NPC：不受傷，只會講話
      if (dst.npc) { this.tutorial?.onNpcHit?.(this.currentSkill, src); return 0; }
      // 演出中的無敵（例如受難之日變身）
      if (dst.state.dived) return 0;                 // 潛到地底（例如大白鯊的深海狂潛）：打不到，也不會露出位置
      // 格擋（例如翁爾貢：正面的投射物被旋轉的雙刃擋下）
      if (dst.def.blockHit?.(this, dst, src)) { this.say(`${dst.name} 在面前旋轉雙刃，擋下了攻擊！`); this.emit({ type: "miss", x: dst.x, y: dst.y, text: "格擋" }); return 0; }
      if (dst.state.invuln) { this.emit({ type: "miss", x: dst.x, y: dst.y, text: "無效" }); return 0; }
      // 角色攔下這次攻擊（例如悠魘的魔導法陣：我方打不到法陣裡的敵人，攻擊打在法陣上）
      if (this.char.intercept?.(this, src, dst, base, mult)) return 0;
      // 聖牢籠：不看傷害，每被打一次扣 1
      if (dst.cage) {
        dst.hp = Math.max(0, dst.hp - 1);
        this.say(`聖牢籠被攻擊（還要 ${dst.hp} 次）`);
        this.emit({ type: "damage", unit: dst, amount: 1, text: dst.hp ? `牢籠 ${dst.hp}` : "牢籠破碎" });
        if (!dst.alive) this.onDeath(dst);
        return 1;
      }
      // 草叢隱蔽（敵我都適用）
      const T = this.room.terrain && this.cfg.terrain?.[this.room.terrain];
      if (T?.evade && !dst.def.bigBar && this.bushOf(dst) && Math.random() < T.evade) {
        this.lastEvade = true;
        this.say(`${dst.name} 躲在草叢裡，攻擊打空了！`);
        this.emit({ type: "miss", x: dst.x, y: dst.y, text: "草叢" });
        return 0;
      }
      // 被動閃避（例如弗爾斯勒「隱於霧中」：隱蔽時 50% 打空）
      const evade = dst.def.passive?.evade?.(this, dst) || 0;
      if (evade > 0 && Math.random() < evade) {
        this.lastEvade = true;
        this.say(`${dst.name} ${dst.def.passive.evadeText || "閃過了攻擊"}`);
        this.emit({ type: "miss", x: dst.x, y: dst.y, text: dst.def.passive.evadeLabel || "MISS" });
        return 0;
      }
      // 受傷倍率（例如殲滅矩陣的核心立場：依破壞的矩陣數量 0 / 0.5 / 1 / 1.5 倍）
      const k = dst.def.incomingMult ? dst.def.incomingMult(this, dst) : 1;
      if (k === 0) {
        this.say(`立場擋下了攻擊！先破壞能量矩陣`);
        this.emit({ type: "blocked", unit: dst });
        return 0;
      }
      if (k !== 1) note += dst.def.incomingNote ? dst.def.incomingNote(k) : `（立場 ×${k}）`;
      // 破綻（例如被翁爾貢打到）：受到的傷害變多
      if (dst.state.flawUntil >= this.round) { mult *= dst.state.flawMult || 1.3; note += "（破綻）"; }
      // 角色的格擋（例如巴斯提安「不退之門」：正面受到的傷害變少，擋下來的累積成壓力）
      let guardK = 0;
      if (dst === this.player && this.char.guard) { const g = this.char.guard(this, src, dst); if (g && g.mult !== 1) { mult *= g.mult; note += g.note || ""; guardK = g.mult; } }
      // 玩家角色的增傷（例如業障纏身）
      if (src === this.player && this.char.outgoingMult) {
        const ex = this.char.outgoingMult(this, src, dst);
        if (ex && ex.mult !== 1) { mult *= ex.mult; note += ex.note || ""; }
      }
      // 虛弱的攻擊者：傷害變低
      const wk = src ? this.weakOf(src) : 1;
      if (wk !== 1) { mult *= wk; note += "（虛弱）"; }
      // 寶物的增傷（例如奇幻燒瓶）
      if (src?.team === "player" && src.items?.length && R.Items) mult *= R.Items.dmgMult(this, src, dst);
      // 角色的增傷（例如觀知命：從吉位打兇位）
      if (src?.team === "player" && src.def.positionMult) {
        const ex = src.def.positionMult(this, src, dst);
        if (ex && ex.mult !== 1) { mult *= ex.mult; note += ex.note || ""; }
      }
      const df = this.defOf(dst);
      if (df < dst.df) note += "（破防）";
      let amount = Math.max(1, Math.round(this.cfg.damage(base, src.atk, df) * mult * k));
      if (guardK > 0) this.char.onGuard?.(this, dst, src, Math.round(amount * (1 - guardK) / guardK));
      // 護盾先吸收
      if (dst.shield > 0) {
        const ab = Math.min(dst.shield, amount);
        dst.shield -= ab; amount -= ab;
        this.say(`${dst.name} 的護盾擋下 ${ab} 點傷害${dst.shield ? `（還剩 ${dst.shield}）` : "（護盾破了）"}`);
        this.emit({ type: "shieldHit", unit: dst, amount: ab, broke: !dst.shield });
        if (amount <= 0) return 0;
      }
      dst.hp = Math.max(0, dst.hp - amount);
      this.say(`${dst.name} 受到 ${amount} 點傷害${note}`);
      // 生命歸零時角色可以撐住（例如魘：變回一半生命的悠）
      if (dst === this.player && dst.hp <= 0) this.char.onLethal?.(this, dst);
      this.emit({ type: "damage", unit: dst, amount, boosted: mult * k > 1, delay: this.hitDelay || 0 });   // hitDelay：連擊時每一下的傷害數字錯開出現
      if (dst === this.player && dst.alive) this.bark(dst, "hurt");          // 受傷台詞（角色有設定才會跳）
      if (dst.def.ai && dst.alive) R.AI[dst.def.ai]?.onHurt?.(this, dst);
      if (dst.summon && dst.alive && R.Items) R.Items.onSummonHurt(this, dst, src);
      if (dst === this.player && dst.alive && dst.items?.length && R.Items) R.Items.onHurt(this, dst, src);
      if (src === this.player && dst !== src && src.items?.length && R.Items) R.Items.onHit(this, src, dst);       // 例如凡塔黑
      if (dst.summon && dst.alive) this.char.onSummonHurt?.(this, dst, src);   // 例如胞子潑灑    // 例如受難之日扣到一定生命就變身
      if (dst.hp <= 0 && dst.def.noDeath) { this.tutorial?.onNpcDefeated?.(dst); return amount; }   // 血條打光但不會倒下
      if (!dst.alive) this.onDeath(dst);
      return amount;
    }

    onDeath(u) {
      // Boss 倒下時，它生出來的小怪一起消失（例如彈跳噩夢的粉色史萊姆）
      if (u.def?.meltOnDeath) for (const e of this.units) if (e.alive && u.def.meltOnDeath.includes(e.kind)) { e.hp = 0; e.alive = false; this.say(`${e.name} 融化了`); this.emit({ type: "death", unit: e }); }
      if (u.ward) {
        const left = this.wards.filter((w) => w.alive).length;
        this.say(`${u.name}${this.room.words?.broken || "被破壞了"}！（還剩 ${left} ${this.room.words?.unit || "輛"}）`);
        this.emit({ type: "wardDeath", unit: u });
        return;
      }
      if (u.summon) {
        this.units = this.units.filter((x) => x !== u);
        this.say(`${u.name} 被破壞了`);
        this.emit({ type: "summonDeath", unit: u });
        this.char.onSummonDeath?.(this, u);
        return;
      }
      if (u.demon) {
        this.units = this.units.filter((x) => x !== u);
        this.emit({ type: "demonDeath", unit: u });
        u.owner.def.passive?.onDemonDeath?.(this, u.owner, u);
        return;
      }
      if (u.cage) {
        this.say("聖牢籠被打破了！");
        this.emit({ type: "cageBreak", unit: u });
        return;
      }
      if (u.part) {
        const left = u.parent.parts.filter((p) => p.alive).length;
        this.say(`${u.name} 被破壞了！${left ? `核心立場減弱（還剩 ${left} 個矩陣）` : "核心立場完全瓦解！"}`);
      } else this.say(`${u.name} 倒下了`);
      this.emit({ type: "death", unit: u });
      // Boss 本體倒下：部位一起停止
      for (const p of u.parts) if (p.alive) { p.hp = 0; this.emit({ type: "death", unit: p }); }
      // 死掉的敵人：它蓄力中的範圍一起移除
      const gone = this.charges.filter((c) => c.owner === u);
      if (gone.length) {
        this.charges = this.charges.filter((c) => c.owner !== u);
        u.state.slamPending = false;
        this.say(`${u.name} 的「壓制」蓄力消失了`);
        this.emit({ type: "chargeCancel", charges: gone });
      }
      // 其他敵人對「有單位倒下」的反應（例如受難之日：教徒倒下扣生命、馬上復活）
      for (const e of this.mainEnemies()) R.AI[e.def.ai]?.onUnitDeath?.(this, e, u);
    }

    // 把單位從 (ox,oy) 往外推 distance，撞牆或撞到其他單位就停在能停的地方
    knockback(u, ox, oy, distance) {
      const A = this.cfg.arena;
      const ang = Math.atan2(u.y - oy, u.x - ox);
      for (let d = distance; d >= 5; d -= 5) {
        const x = Math.min(Math.max(u.x + Math.cos(ang) * d, u.r), A.w - u.r);
        const y = Math.min(Math.max(u.y + Math.sin(ang) * d, u.r), A.h - u.r);
        if (this.blocked(u, x, y)) continue;
        u.x = x; u.y = y;
        this.emit({ type: "knockback", unit: u });
        return true;
      }
      return false;
    }

    // 隨機找一個空位（離其他單位、牆邊都有一點距離）
    randomFreeSpot(r, margin = 30) {
      const A = this.cfg.arena;
      for (let i = 0; i < 200; i++) {
        const x = r + margin + Math.random() * (A.w - 2 * (r + margin));
        const y = r + margin + Math.random() * (A.h - 2 * (r + margin));
        if (!this.units.some((o) => o.alive && !o.cage && dist(o.x, o.y, x, y) < o.r + r + margin)) return { x, y };
      }
      return null;
    }

    // 生成心魔這類特殊單位（不參與回合、不算勝利條件）
    // 把新單位排進行動順序：排在 after 後面（同一個 after 後面的依召喚順序排）
    joinOrder(u, after) {
      if (!this.order.length || this.order.includes(u)) return;
      let i = this.order.indexOf(after);
      if (i < 0) { this.order.push(u); return; }
      while (this.order[i + 1]?.owner === after) i++;
      this.order.splice(i + 1, 0, u);
      if (i + 1 <= this.idx) this.idx++;
    }
    spawnSpecial(team, kind, def, x, y, extra) {
      const u = this.add(new Unit(team, kind, def, def, x, y, def.r || this.cfg.body));
      Object.assign(u, extra);
      return u;
    }

    // ---------- 敵人在玩家回合的反應 ----------
    enemyReact(hits, info) {
      for (const e of this.mainEnemies()) R.AI[e.def.ai]?.react?.(this, e, hits, info);
    }

    // ---------- 多部位單位（Boss）整體移動 ----------
    group(u) { return [u, ...u.parts]; }   // 本體和所有部位（被破壞的矩陣也還掛在觸手上）
    canShiftGroup(u, dx, dy) {
      const A = this.cfg.arena, g = this.group(u);
      for (const m of g) {
        const x = m.x + dx, y = m.y + dy;
        if (x < m.r || y < m.r || x > A.w - m.r || y > A.h - m.r) return false;
        for (const o of this.units) {
          if (!o.alive || g.includes(o) || o.cage) continue;
          if (dist(o.x, o.y, x, y) < o.r + m.r) return false;
        }
      }
      return true;
    }
    shiftGroup(u, dx, dy) { for (const m of this.group(u)) { m.x += dx; m.y += dy; } }

    // ---------- 敵人回合 ----------
    async runEnemyTurn(u) {
      // 輪到怪物：先播警告音效、停頓一下，讓玩家看清楚是誰要動
      this.emit({ type: "enemyWarn", unit: u, sound: this.cfg.enemyTurnSound, duration: this.cfg.enemyTurnDelay });
      await this.wait(this.cfg.enemyTurnDelay);
      if (this.dead) return;
      let first = true;
      for (const c of this.charges.filter((c) => c.owner === u)) {
        if (!first) await this.wait(this.cfg.aiDelay);
        first = false;
        if (this.dead) return;
        await this.resolveCharge(c);
        if (this.dead) return;
        if (this.checkEnd()) return;
      }
      if (!first) await this.wait(this.cfg.aiDelay);
      if (this.dead) return;
      await R.AI[u.def.ai].takeTurn(this, u);
      if (this.scripted && !this.inFight) return;     // 教學戰鬥已經結束
      await this.waitProjectiles();
      if (u.alive && u.ap > 0 && u.def.reserveAp) this.say(`${u.name} 保留了 ${u.ap} 點行動點`);
      if (this.dead || this.phase === "over") return;
      await this.wait(this.cfg.aiDelay * 0.6);
      if (this.dead || this.phase === "over") return;
      this.nextTurn();
    }

    // 敵人每做一次行動，自己的冷卻少 1
    // from：移動前的位置（移動時，起點或終點在煙霧裡都算）
    enemySpend(u, cost, from) {
      u.ap -= cost;
      if (u.state.slamCd > 0) u.state.slamCd--;
      this.char.onEnemyAction?.(this, u, from);     // 玩家角色的強化對「敵人行動」的效果（例如慘白瘟疫）
    }

    // ---------- 預告攻擊 ----------
    // shape：rect（x,y,ang,length,width）/ sector（x,y,ang,half,radius）/ circle（x,y,radius）
    // 先顯示範圍、等 reaction 秒，再判定玩家有沒有在範圍內
    // 回傳 "hit" / "miss"，被中斷時回傳 false。noDamage：只判定不扣血（教學示範用）
    // quiet：沒打中時不顯示 MISS、不寫紀錄（一次放很多發的攻擊用）
    async telegraph(owner, t, { base, sound, label, missText, hitText, mult = 1, onHit, onAny, noDamage, quiet } = {}) {
      t.owner = owner;
      t.total = t.reaction;
      t.deadline = performance.now() + t.reaction * 1000;
      this.threats.push(t);
      this.emit({ type: "threat", threat: t });
      await this.wait(t.reaction);
      this.threats = this.threats.filter((x) => x !== t);
      if (this.dead || this.phase === "over" || t.cancelled) return false;
      if (!owner.alive || (t.source && !t.source.alive)) {   // 倒數中被打倒：攻擊中斷
        this.say(`${label || owner.name + " 的攻擊"}中斷了`);
        this.emit({ type: "threatCancel", threat: t });
        return false;
      }
      this.emit({ type: "strike", ...t, sound });
      const p = this.player;
      let result = "miss";
      // 躲在貨架後面：直線的攻擊（長方形）被擋住
      const covered = t.shape === "rect" && this.coverBetween(owner, p) && this.coverBetween({ x: t.x, y: t.y }, p);
      const lowCovered = t.shape === "rect" && t.shot && this.lowCoverBetween(owner, p);           // 矮牆擋射擊
      if ((covered || lowCovered) && p.alive && this.hitTest(t, p)) { this.say(`${p.name} 躲在${lowCovered && !covered ? "矮牆" : this.room.terrain === "ruins" ? "柱子" : "貨架"}後面，${label || "攻擊"}被擋住了！`); this.emit({ type: "miss", x: p.x, y: p.y, text: "掩護" }); }
      else if (p.alive && this.hitTest(t, p)) {
        if (noDamage) { result = "hit"; this.emit({ type: "miss", x: p.x, y: p.y, text: hitText || "被打中了" }); onHit?.(p); }
        else {
          const amount = this.damage(owner, p, base, mult);
          if (amount > 0) result = "hit";
          if (amount > 0 && p.alive) onHit?.(p);     // 被打中才有的附加效果（擊退、扣行動點…）
          if (amount > 0) onAny?.(p);
        }
      }
      else if (!quiet) { this.say(missText || `${label || "攻擊"}落空了！`); this.emit({ type: "miss", x: p.x, y: p.y }); }
      // 我方召喚物也會被打到
      if (!noDamage) for (const a of this.allies()) if (this.hitTest(t, a) && this.damage(owner, a, base, mult) > 0) onAny?.(a);
      this.checkEnd();
      return result;
    }

    // ---------- 地形：草叢 ----------
    // 隨機生成；站在草叢裡的單位（敵我都一樣）受到攻擊時有機率打空
    // 任何攻擊的範圍碰到草叢就會把它一起破壞（破壞要一點時間，這一擊仍然算隱蔽）
    makeBushes() {
      const T = this.room.terrain && this.cfg.terrain?.[this.room.terrain];
      if (!T || !T.bushes) return [];
      const A = this.cfg.arena, [n0, n1] = T.bushes, [r0, r1] = T.bushR;
      const n = n0 + Math.floor(Math.random() * (n1 - n0 + 1));
      const keep = [this.player, ...this.units.filter((u) => u.team === "enemy")];
      const out = [];
      for (let tries = 0; out.length < n && tries < 400; tries++) {
        const r = r0 + Math.random() * (r1 - r0);
        const x = r + 30 + Math.random() * (A.w - 2 * (r + 30)), y = r + 30 + Math.random() * (A.h - 2 * (r + 30));
        if (keep.some((u) => dist(u.x, u.y, x, y) < r + u.r + 30)) continue;      // 不要一開場就有人在草叢裡
        if (out.some((o) => dist(o.x, o.y, x, y) < o.r + r + 20)) continue;
        out.push({ id: "bush" + nextId++, x, y, r, seed: Math.random() * 1000 });
      }
      return out;
    }
    bushOf(u) { return this.bushes.find((g) => !g.cutAt && dist(u.x, u.y, g.x, g.y) <= g.r) || this.bushes.find((g) => g.cutAt && performance.now() - g.cutAt < 900 && dist(u.x, u.y, g.x, g.y) <= g.r); }
    // 看攻擊事件的範圍，碰到的草叢標記成被破壞
    cutBushes(ev) {
      const seg = (ax, ay, bx, by, w = 10) => (g) => geo.pointSeg(g.x, g.y, ax, ay, bx, by) <= g.r * 0.8 + w;
      const circ = (x, y, rad) => (g) => dist(g.x, g.y, x, y) <= rad + g.r * 0.6;
      const tests = [];
      switch (ev.type) {
        case "strike":
          if (ev.shape === "rect" || ev.shape === "sector" || ev.radius) tests.push((g) => this.hitTest(ev, { x: g.x, y: g.y, r: g.r * 1.2 }));
          break;
        case "slash": {
          const o = ev.origin || ev.unit;
          tests.push((g) => geo.inSector(g.x, g.y, { x: o.x, y: o.y, radius: ev.radius, ang: ev.ang, half: ev.half }, g.r * 0.6));
          break;
        }
        case "arrow": for (const a of ev.arrows || []) tests.push(seg(a.from.x, a.from.y, a.to.x, a.to.y)); break;
        case "spikes": for (const sp of ev.spikes || []) for (let i = 1; i < sp.points.length; i++) tests.push(seg(sp.points[i - 1].x, sp.points[i - 1].y, sp.points[i].x, sp.points[i].y)); break;
        case "finale": tests.push(seg(ev.from.x, ev.from.y, ev.to.x, ev.to.y, (ev.width || 40) / 2)); break;
        case "explode": case "shroomBoom": case "spore": case "bellWave": case "pillar": tests.push(circ(ev.x, ev.y, ev.radius)); break;
        case "kick": if (ev.target) tests.push(circ(ev.target.x, ev.target.y, 10)); break;
        case "bulletHit": tests.push(circ(ev.x, ev.y, 8)); break;
        default: return;
      }
      const now = performance.now(), cut = [];
      for (const g of this.bushes) if (!g.cutAt && tests.some((f) => f(g))) { g.cutAt = now; cut.push(g); }
      if (!cut.length) return;
      this.say(`草叢被攻擊破壞了（${cut.length} 叢）`);
      // 先讓這一擊算完隱蔽，再真的移除
      setTimeout(() => { this.bushes = this.bushes.filter((g) => !cut.includes(g)); this.emit(); }, 900);
      for (const f of this.listeners) { try { f({ type: "bushCut", bushes: cut }); } catch (e) { console.error(e); } }
    }

    hitTest(t, u) {
      const m = u.r * 0.5;
      if (t.shape === "rect") return geo.inRect(u.x, u.y, t, m);
      if (t.shape === "sector") return geo.inSector(u.x, u.y, t, m);
      return dist(u.x, u.y, t.x, t.y) <= t.radius + m;
    }

    // ---------- 光彈（沒有預告，會在場上飛，可以移動躲開） ----------
    spawnBullet(owner, x, y, ang, opt) {
      this.projectiles.push({
        id: "p" + nextId++, owner, x, y, ang,
        vx: Math.cos(ang) * opt.speed, vy: Math.sin(ang) * opt.speed,
        r: opt.r, base: opt.base, text: opt.text, color: opt.color,
      });
      if (!this._projTimer) {
        let last = performance.now();
        this._projTimer = setInterval(() => {
          const now = performance.now();
          this.stepProjectiles(Math.min(0.05, (now - last) / 1000));
          last = now;
        }, 16);
      }
    }

    stepProjectiles(dt) {
      if (this.dead || this.phase === "over") this.projectiles = [];
      const A = this.cfg.arena, p = this.player, hitR = p.r * 0.7;
      const keep = [];
      for (const b of this.projectiles) {
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < -30 || b.y < -30 || b.x > A.w + 30 || b.y > A.h + 30) continue;
        if (p.alive && !b.passed && dist(b.x, b.y, p.x, p.y) <= b.r + hitR) {
          this.damage(b.owner, p, b.base);
          if (this.lastEvade) { b.passed = true; keep.push(b); continue; }   // 打空：光彈穿過去
          this.emit({ type: "bulletHit", x: b.x, y: b.y });
          continue;
        }
        keep.push(b);
      }
      this.projectiles = keep;
      if (!keep.length) { clearInterval(this._projTimer); this._projTimer = null; }
      this.checkEnd();
    }

    async waitProjectiles() {
      while (this.projectiles.length && !this.dead && this.phase !== "over") await this.wait(0.05);
    }

    // ---------- 史萊姆用的動作 ----------
    enemyMoveToward(u, target, stopAt) {
      const cost = u.def.moveCost;
      if (u.ap < cost) return false;
      const d = dist(u.x, u.y, target.x, target.y);
      const ang0 = Math.atan2(target.y - u.y, target.x - u.x);
      const B = this.cfg.body, A = this.cfg.arena;
      // 正面被擋住時稍微偏一點角度繞過去（多隻史萊姆時常發生）
      for (const off of [0, 0.35, -0.35, 0.7, -0.7]) {
        const ang = ang0 + off;
        for (let step = Math.min(this.moveRadius(u), d - stopAt); step > 5; step -= 10) {
          const nx = Math.min(Math.max(u.x + Math.cos(ang) * step, B), A.w - B);
          const ny = Math.min(Math.max(u.y + Math.sin(ang) * step, B), A.h - B);
          if (!this.blocked(u, nx, ny)) {
            const from = { x: u.x, y: u.y };
            u.x = nx; u.y = ny; u.facing = ang;
            this.enemySpend(u, cost, from);
            this.say(`${u.name} 移動`);
            this.emit({ type: "move", unit: u });
            return true;
          }
        }
      }
      return false;
    }

    // ---------- 魔狼用的動作 ----------
    // 長方形撲擊：有預告；dash = 結算後衝到終點
    async enemyLunge(u, target, spec, label, dash) {
      this.enemySpend(u, spec.ap);
      let ang = Math.atan2(target.y - u.y, target.x - u.x);
      const B = u.r;
      // 玩家角色可以讓指向攻擊偏掉（例如觀知命的大凶之兆）
      const dv = this.char.deflect?.(this, u);
      if (dv) { ang += dv; this.say(`${u.name} 的攻擊方向偏掉了（大凶之兆）`); this.emit({ type: "buff", unit: u, text: "方向偏了", color: "#8a1a24" }); }
      u.facing = ang;
      this.say(`${u.name} 準備${label}！`);
      if (u.def.rex || u.def.paw) u.pose = { k: "lunge", t0: performance.now(), ang, hit: 0 };          // 霸王龍：整隻往後仰、再往前撲（畫圖用）
      const t = { shape: "rect", x: u.x + Math.cos(ang) * B * 0.6, y: u.y + Math.sin(ang) * B * 0.6, ang, length: spec.length, width: spec.width, reaction: spec.reaction, lunge: !spec.ranged, shot: !!spec.ranged, words: this.pickWords(u, spec), blood: !!spec.blood };
      const res = await this.telegraph(u, t, { base: spec.base, sound: spec.sound || u.def.sounds?.ram, label: `${u.name} 的${label}`, quiet: target !== this.player });
      if (u.pose) u.pose.hit = performance.now();
      if (dash && res !== false && u.alive && !this.dead && this.phase !== "over") {
        const A = this.cfg.arena, from = { x: u.x, y: u.y };
        let to = null;
        for (let d = spec.length - B; d > 20; d -= 12) {
          const x = Math.min(Math.max(t.x + Math.cos(ang) * d, u.r), A.w - u.r), y = Math.min(Math.max(t.y + Math.sin(ang) * d, u.r), A.h - u.r);
          if (!this.blocked(u, x, y)) { to = { x, y }; break; }
        }
        if (to) {
          this.emit({ type: "leap", unit: u, from, to, duration: 0.22 });
          await this.wait(0.22);
          if (u.alive) { u.x = to.x; u.y = to.y; this.emit({ type: "move", unit: u }); }
        }
      }
      return res;
    }
    // 會噴出文字的攻擊（例如午夜郵局的情緒煙霧）：從 spec.words 隨機挑一句，說出來、打出去
    pickWords(u, spec) {
      if (!spec.words?.length) return null;
      const w = spec.words[Math.floor(Math.random() * spec.words.length)];
      this.say(`${u.name}：「${w}」`);
      return w;
    }
    // 以自己為中心的圓形攻擊（有預告）
    async enemySpin(u, spec, label) {
      this.enemySpend(u, spec.ap);
      this.say(`${u.name} 準備${label}！`);
      if (u.def.rex || u.def.paw) u.pose = { k: "spin", t0: performance.now(), hit: 0 };                   // 霸王龍：蹲低蓄力、再整隻轉一圈
      const res = await this.telegraph(u, { shape: "circle", x: u.x, y: u.y, radius: spec.radius, reaction: spec.reaction, follow: u, words: this.pickWords(u, spec), blood: !!spec.blood }, { base: spec.base, sound: spec.sound || u.def.sounds?.slam, label: `${u.name} 的${label}` });
      if (u.pose) u.pose.hit = performance.now();
      return res;
    }
    // 戰鬥中叫來的敵人：排在行動順序最後面
    summonEnemy(kind, x, y) {
      const e = this.spawnEnemy({ kind, x, y });
      e.initRoll = 1 + Math.floor(Math.random() * this.cfg.initiativeDie);
      if (this.realtime) this.runRealtimeEnemy(e);
      else this.order.push(e);
      this.emit({ type: "move", unit: e });
      return e;
    }

    // 撞擊：顯示紅框 → 等反應時間 → 結算
    async enemyRam(u, target) {
      const r = u.def.ram, B = this.cfg.body;
      this.enemySpend(u, r.ap);
      const ang = Math.atan2(target.y - u.y, target.x - u.x);
      u.facing = ang;
      this.say(`${u.name} 準備撞擊！`);
      await this.telegraph(u, {
        shape: "rect", x: u.x + Math.cos(ang) * B, y: u.y + Math.sin(ang) * B, ang,
        length: r.length, width: r.width, reaction: r.reaction, lunge: true,
      }, { base: r.base, sound: u.def.sounds?.ram, label: `${u.name} 的撞擊` });
    }

    // 壓制：宣告範圍，等到這個敵人下次的回合開始才發動
    declareSlam(u, target) {
      const s = u.def.slam;
      this.enemySpend(u, s.ap);
      u.facing = Math.atan2(target.y - u.y, target.x - u.x);
      this.charges.push({ kind: "slam", owner: u, x: target.x, y: target.y, radius: s.radius, base: s.base });
      u.state.slamPending = true;
      this.say(`${u.name} 開始蓄力「壓制」！下次輪到它時發動`);
      this.emit({ type: "charge" });
    }

    // 壓制落下：史萊姆跳到壓制中心點，落地時結算傷害
    async resolveCharge(c) {
      const u = c.owner;
      if (c.kind !== "slam") return R.AI[u.def.ai].resolveCharge(this, c);   // 其他敵人自己的蓄力招式
      if (!u.alive) { this.charges = this.charges.filter((x) => x !== c); return; }
      this.say(`${u.name} 跳起來壓向目標！`);
      const from = { x: u.x, y: u.y };
      const land = this.landingSpot(u, c.x, c.y, from);
      const leapTime = this.cfg.slamLeapTime;
      this.emit({ type: "leap", unit: u, from, to: land, duration: leapTime });
      await this.wait(leapTime);
      if (this.dead || this.phase === "over") return;
      if (!u.alive) return;         // 跳躍中被打倒（範圍已在倒下時移除）

      this.charges = this.charges.filter((x) => x !== c);
      u.state.slamPending = false;
      u.state.slamCd = u.def.slam.cooldown;
      u.x = land.x; u.y = land.y;
      u.facing = Math.atan2(land.y - from.y, land.x - from.x) || u.facing;
      this.say(`${u.name} 的「壓制」落下！`);
      this.emit({ type: "strike", shape: "circle", owner: u, x: c.x, y: c.y, radius: c.radius, sound: u.def.sounds?.slam });
      const p = this.player;
      if (p.alive && dist(p.x, p.y, c.x, c.y) <= c.radius + this.cfg.body * 0.5) this.damage(u, p, c.base);
      else { this.say("壓制落空了！"); this.emit({ type: "miss", x: c.x, y: c.y }); }
      for (const a of this.allies()) if (dist(a.x, a.y, c.x, c.y) <= c.radius + a.r * 0.5) this.damage(u, a, c.base);
    }

    // 落點優先是中心；被佔住時往史萊姆原本的方向退到最近的空位
    landingSpot(u, cx, cy, from) {
      if (!this.blocked(u, cx, cy)) return { x: cx, y: cy };
      const d = dist(cx, cy, from.x, from.y) || 1;
      const ux = (from.x - cx) / d, uy = (from.y - cy) / d;
      for (let step = 4; step <= d; step += 4) {
        const x = cx + ux * step, y = cy + uy * step;
        if (!this.blocked(u, x, y)) return { x, y };
      }
      return { x: from.x, y: from.y };
    }
  }

  R.Battle = Battle;
})();
