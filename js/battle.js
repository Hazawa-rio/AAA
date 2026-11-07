/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/battle.js": "20261107215455" });
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
    get initiative() { return this.initRoll + this.spd; }
  }

  class Battle {
    constructor(cfg, charId, roomId) {
      this.cfg = cfg;
      this.room = cfg.rooms[roomId] || Object.values(cfg.rooms)[0];
      this.units = [];
      const ch = R.CHARACTERS[charId] || Object.values(R.CHARACTERS)[0];
      this.char = ch;
      const ps = this.room.playerStart;
      // 成長系統：等級、數值、技能強化（沒有成長系統或固定角色就用原始數值）
      const grow = R.Progress ? R.Progress.forBattle(ch) : { level: 1, stats: ch.stats, upg: {} };
      this.player = this.add(new Unit("player", ch.id, ch, grow.stats, ps.x, ps.y, cfg.body));
      this.player.level = grow.level;
      this.player.upg = grow.upg;          // 例如 { q1: "split", e2: "linger", w1: "dance" }
      for (const sp of this.room.wave) this.spawnEnemy(sp);

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
      this.dead = false;
      this._timers = new Set();
      ch.init?.(this, this.player);           // 敵人都放好之後才初始化角色（心魔要找空位）
    }

    spawnEnemy(sp) {
      const d = this.cfg.enemies[sp.kind];
      const u = this.add(new Unit("enemy", sp.kind, d, d, sp.x, sp.y, d.r || this.cfg.body));
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
    enemies() { return this.units.filter((u) => u.team === "enemy" && u.alive && !u.demon); }
    mainEnemies() { return this.enemies().filter((u) => !u.part); }
    demons() { return this.units.filter((u) => u.demon && u.alive); }
    // 某個玩家角色能攻擊的目標：心魔只有召喚它的角色打得到
    npcs() { return this.units.filter((u) => u.npc && u.alive); }
    targetsFor(u) { return [...this.enemies(), ...this.demons().filter((d) => d.owner === u), ...this.npcs()]; }
    // 移動半徑 = 速度 × 13；speedBoost 是暫時的速度倍率（例如游擊作戰）
    moveRadius(u) { return u.spd * this.cfg.movePerSpd * (u.state?.speedBoost || 1); }

    // 角色的個性台詞（畫面決定要不要顯示，不會每次都跳）
    bark(u, key, delay = 0) { this.emit({ type: "bark", unit: u, key, delay }); }

    heal(u, amount, note = "") {
      if (!u.alive || amount <= 0) return 0;
      const got = Math.min(amount, u.maxHp - u.hp);
      if (got <= 0) return 0;
      u.hp += got;
      this.say(`${u.name} 回復 ${got} 點生命${note}`);
      this.emit({ type: "heal", unit: u, amount: got });
      return got;
    }
    blocked(u, x, y) {
      return this.units.some((o) => o !== u && o.alive && dist(o.x, o.y, x, y) < (u.r || this.cfg.body) + o.r);
    }
    // 近戰距離：從邊緣算，大型目標不用貼到中心
    reach(a, t) { return dist(a.x, a.y, t.x, t.y) - (t.r - this.cfg.body); }
    skill(id) { return this.char.skills[id]; }

    // ---------- 回合流程 ----------
    start() { this.nextTurn(); }

    newRound() {
      this.round++;
      this.say(`── 第 ${this.round} 回合 ──`);
      if (this.round === 1 && !this.fixedOrder) {
        // 行動順序只在第一回合決定：1d20 + 速度，高的先動；同分比速度，再同分玩家先
        const die = this.cfg.initiativeDie;
        const alive = this.units.filter((u) => u.alive && !u.part && !u.demon);
        for (const u of alive) u.initRoll = 1 + Math.floor(Math.random() * die);
        this.order = alive.sort((a, b) => (b.def.alwaysFirst ? 1 : 0) - (a.def.alwaysFirst ? 1 : 0) ||
          b.initiative - a.initiative || b.spd - a.spd ||
          (a.team === "player" ? -1 : b.team === "player" ? 1 : 0));
        this.say("順序：" + this.order.map((u) => `${u.name}(${u.initRoll}+${u.spd})`).join("、"));
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
      this.char.onTurnStart?.(this, u);       // 玩家角色對「任何單位回合開始」的效果（例如循環試煉的殘影爆炸）
      if (this.checkEnd()) return;
      if (!u.alive) { this.emit(); this.nextTurn(); return; }
      this.tickZones(u);
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
      this.say(`${expired.length} 團煙霧散去了`);
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
      u.level = g.level; u.upg = g.upg;
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
      if (!result) return false;
      this.phase = "over";
      this.result = result;
      this.threats = [];
      this.charges = [];
      this.projectiles = [];
      this.say(result === "win" ? "勝利！" : "被打倒了……");
      this.emit({ type: "over" });
      return true;
    }

    // ---------- 玩家操作 ----------
    // 自己的回合正常消耗；敵人的回合也能行動，但行動點消耗加倍，而且不能放大招
    offTurn() { return this.phase === "enemy"; }
    costMult() { return this.offTurn() ? this.cfg.offTurnMultiplier : 1; }
    canAct() { return this.player.alive && (this.phase === "player" || this.offTurn()); }

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
      this.currentSkill = id;           // 讓 NPC 知道被哪一招打到
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
      try { sk.use(this, u, arg, st); } finally { this.currentSkill = null; }
      u.ap -= cost;
      this.countAction(u, id, cost);
      this.char.onAction?.(this, u, id, cost);
      this.afterPlayerAction();
    }

    endTurn() {
      this.requirePlayerTurn();
      if (this.scripted && !this.inFight) throw new ActionError("教學中不用結束回合");
      this.say(`${this.player.name} 結束回合（保留 ${this.player.ap} 點）`);
      this.nextTurn();
    }

    afterPlayerAction() {
      if (this.checkEnd()) return;
      if (this.scripted && !this.inFight) { this.emit(); this.tutorial?.afterAction?.(); return; }
      // 敵人回合中的行動不會結束任何回合
      if (this.phase === "player" && this.player.ap <= 0 && !this.char.canActFree?.(this, this.player)) this.nextTurn();
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
      if (ult && actionId !== ult) u.charge = Math.min(u.def.skills[ult].charge, u.charge + 1);
    }
    setCooldown(u, key, n) { u.cd[key] = n; u._cdSet.add(key); }

    _move(u, x, y, cost) {
      if (u.ap < cost) throw new ActionError(`行動點不足（需要 ${cost}）`);
      const B = this.cfg.body, A = this.cfg.arena;
      x = Math.min(Math.max(x, B), A.w - B);
      y = Math.min(Math.max(y, B), A.h - B);
      const d = dist(u.x, u.y, x, y);
      if (d > this.moveRadius(u) + 0.5) throw new ActionError("超出移動範圍");
      if (d < 1) throw new ActionError("位置沒有改變");
      if (this.blocked(u, x, y)) throw new ActionError("那裡有其他單位");
      u.facing = Math.atan2(y - u.y, x - u.x);
      u.x = x; u.y = y;
      u.ap -= cost;
      this.emit({ type: "move", unit: u });
    }

    // base = 技能基礎傷害；mult = 額外倍率（例如穿過煙霧 ×1.5）
    damage(src, dst, base, mult = 1, note = "") {
      this.lastEvade = false;
      if (!dst.alive) return 0;
      // 教學 NPC：不受傷，只會講話
      if (dst.npc) { this.tutorial?.onNpcHit?.(this.currentSkill, src); return 0; }
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
      if (k !== 1) note += `（立場 ×${k}）`;
      // 玩家角色的增傷（例如業障纏身）
      if (src === this.player && this.char.outgoingMult) {
        const ex = this.char.outgoingMult(this, src, dst);
        if (ex && ex.mult !== 1) { mult *= ex.mult; note += ex.note || ""; }
      }
      const amount = Math.max(1, Math.round(this.cfg.damage(base, src.atk, dst.df) * mult * k));
      dst.hp = Math.max(0, dst.hp - amount);
      this.say(`${dst.name} 受到 ${amount} 點傷害${note}`);
      this.emit({ type: "damage", unit: dst, amount, boosted: mult * k > 1 });
      if (dst.hp <= 0 && dst.def.noDeath) { this.tutorial?.onNpcDefeated?.(dst); return amount; }   // 血條打光但不會倒下
      if (!dst.alive) this.onDeath(dst);
      return amount;
    }

    onDeath(u) {
      if (u.demon) {
        this.units = this.units.filter((x) => x !== u);
        this.emit({ type: "demonDeath", unit: u });
        u.owner.def.passive?.onDemonDeath?.(this, u.owner, u);
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
        if (!this.units.some((o) => o.alive && dist(o.x, o.y, x, y) < o.r + r + margin)) return { x, y };
      }
      return null;
    }

    // 生成心魔這類特殊單位（不參與回合、不算勝利條件）
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
          if (!o.alive || g.includes(o)) continue;
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
    async telegraph(owner, t, { base, sound, label, missText, mult = 1, onHit, noDamage } = {}) {
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
      if (p.alive && this.hitTest(t, p)) {
        if (noDamage) { result = "hit"; this.emit({ type: "miss", x: p.x, y: p.y, text: "被打中了" }); }
        else {
          const amount = this.damage(owner, p, base, mult);
          if (amount > 0) result = "hit";
          if (amount > 0 && p.alive) onHit?.(p);     // 被打中才有的附加效果（擊退、扣行動點…）
        }
      }
      else { this.say(missText || `${label || "攻擊"}落空了！`); this.emit({ type: "miss", x: p.x, y: p.y }); }
      this.checkEnd();
      return result;
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
        r: opt.r, base: opt.base,
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
