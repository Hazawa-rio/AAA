// 戰鬥規則（不碰畫面）。畫面透過 battle.on(fn) 收到事件後重畫。
// 角色技能寫在 js/characters/，敵人 AI 寫在 js/ai.js，這裡只提供共用的規則。
(function () {
  const R = window.RPG;
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));
  R.dist = dist;
  R.sleep = sleep;

  // ---------- 幾何 ----------
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
  };
  R.geo = geo;

  class ActionError extends Error {}
  R.ActionError = ActionError;

  let nextId = 1;
  class Unit {
    constructor(team, kind, def, stats, x, y) {
      this.id = "u" + nextId++;
      this.team = team;
      this.kind = kind;
      this.def = def;              // 角色或敵人的設定（技能數值即時讀這裡）
      this.name = def.name;
      this.x = x; this.y = y;
      this.maxHp = this.hp = stats.hp;
      this.atk = stats.atk; this.df = stats.df; this.spd = stats.spd;
      this.maxAp = this.ap = stats.ap;
      this.facing = team === "player" ? -Math.PI / 2 : Math.PI / 2;
      this.state = {};             // 角色/敵人自己的狀態（上膛、蓄力…）
      this.cd = {};                // 冷卻：技能 id → 還要幾次行動
      this._cdSet = new Set();     // 這次行動剛設定的冷卻，不要馬上扣
      this.actions = 0;            // 累計行動次數
      this.charge = 0;             // 大招充能（行動次數）
      this.initRoll = 0;           // 本回合 d20 擲出的點數
    }
    get alive() { return this.hp > 0; }
    get initiative() { return this.initRoll + this.spd; }
  }

  class Battle {
    constructor(cfg, charId) {
      this.cfg = cfg;
      this.units = [];
      const ch = R.CHARACTERS[charId] || Object.values(R.CHARACTERS)[0];
      this.char = ch;
      this.player = this.add(new Unit("player", ch.id, ch, ch.stats, cfg.arena.w / 2, cfg.arena.h - 100));
      ch.init?.(this, this.player);
      for (const sp of cfg.wave) {
        const d = cfg.enemies[sp.kind];
        this.add(new Unit("enemy", sp.kind, d, d, sp.x, sp.y));
      }
      this.round = 0;
      this.order = [];
      this.idx = -1;
      this.phase = "idle";        // player / enemy / reaction / over
      this.result = null;
      this.charges = [];          // 敵人蓄力中的範圍攻擊（壓制）
      this.zones = [];            // 場上的區域效果（煙霧…）
      this.threat = null;         // 正在倒數、可以閃避的攻擊（撞擊）
      this.log = [];
      this.listeners = new Set();
      this.dead = false;
    }

    add(u) { this.units.push(u); return u; }
    on(fn) { this.listeners.add(fn); }
    emit(ev) { if (!this.dead) for (const f of this.listeners) f(ev || { type: "update" }); }
    say(t) { this.log.push(t); if (this.log.length > 100) this.log.shift(); }
    destroy() { this.dead = true; this.listeners.clear(); clearTimeout(this._reactionTimer); }

    get current() { return this.order[this.idx]; }
    enemies() { return this.units.filter((u) => u.team === "enemy" && u.alive); }
    moveRadius(u) { return u.spd * this.cfg.movePerSpd; }
    blocked(u, x, y) {
      return this.units.some((o) => o !== u && o.alive && dist(o.x, o.y, x, y) < this.cfg.body * 2);
    }
    skill(id) { return this.char.skills[id]; }

    // ---------- 回合流程 ----------
    start() { this.nextTurn(); }

    newRound() {
      this.round++;
      // 區域效果到期
      const expired = this.zones.filter((z) => this.round >= z.expiresRound);
      if (expired.length) {
        this.zones = this.zones.filter((z) => !expired.includes(z));
        this.say(`${expired.length} 團煙霧散去了`);
        this.emit({ type: "zoneExpire", zones: expired });
      }
      // 行動順序：1d20 + 速度，高的先動；同分比速度，再同分玩家先
      const die = this.cfg.initiativeDie;
      const alive = this.units.filter((u) => u.alive);
      for (const u of alive) u.initRoll = 1 + Math.floor(Math.random() * die);
      this.order = alive.sort((a, b) => b.initiative - a.initiative || b.spd - a.spd ||
        (a.team === "player" ? -1 : b.team === "player" ? 1 : 0));
      this.idx = 0;
      this.say(`── 第 ${this.round} 回合 ──`);
      this.say("順序：" + this.order.map((u) => `${u.name}(${u.initRoll}+${u.spd})`).join("、"));
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
      this.say(`輪到 ${u.name}`);
      if (u.team === "player") {
        this.phase = "player";
        this.emit({ type: "turn", unit: u });
      } else {
        this.phase = "enemy";
        this.emit({ type: "turn", unit: u });
        this.runEnemyTurn(u);
      }
    }

    checkEnd() {
      if (this.phase === "over") return true;
      let result = null;
      if (!this.player.alive) result = "lose";
      else if (!this.enemies().length) result = "win";
      if (!result) return false;
      this.phase = "over";
      this.result = result;
      this.threat = null;
      this.charges = [];
      this.say(result === "win" ? "勝利！" : "被打倒了……");
      this.emit({ type: "over" });
      return true;
    }

    // ---------- 玩家操作 ----------
    requirePlayerTurn() {
      if (this.phase !== "player") throw new ActionError("現在不是你的回合");
    }

    move(x, y) {
      this.requirePlayerTurn();
      this._move(this.player, x, y, this.cfg.moveCost);
      this.countAction(this.player, "move", this.cfg.moveCost);
      this.afterPlayerAction();
    }

    // 使用技能（含普攻）。技能的 status() 決定能不能用、花多少行動點
    useSkill(id, arg = {}) {
      this.requirePlayerTurn();
      const u = this.player, sk = this.skill(id);
      if (!sk) throw new ActionError("沒有這個技能");
      const st = sk.status(this, u);
      if (!st.ready) throw new ActionError(st.reason || "現在不能用");
      if (u.ap < st.cost) throw new ActionError(`行動點不足（需要 ${st.cost}）`);
      sk.use(this, u, arg, st);     // 不合法會丟 ActionError，此時什麼都還沒扣
      u.ap -= st.cost;
      this.countAction(u, id, st.cost);
      this.afterPlayerAction();
    }

    endTurn() {
      this.requirePlayerTurn();
      this.say(`${this.player.name} 結束回合（保留 ${this.player.ap} 點）`);
      this.nextTurn();
    }

    afterPlayerAction() {
      if (this.checkEnd()) return;
      if (this.player.ap <= 0 && !this.char.canActFree?.(this, this.player)) this.nextTurn();
      else this.emit();
    }

    // 每做一次「有消耗行動點」的行動：冷卻 -1、大招充能 +1
    // 不花行動點的行動（例如上膛後免費射箭）不算
    countAction(u, actionId, apSpent) {
      u.actions++;
      if (!(apSpent > 0)) { u._cdSet.clear(); return; }
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

    // 非自己回合：雙倍消耗行動點閃避
    dodge(x, y) {
      if (this.phase !== "reaction" || !this.threat) throw new ActionError("現在不能閃避");
      if (this.threat.dodged) throw new ActionError("這次已經閃避過了");
      const cost = this.cfg.moveCost * this.cfg.dodgeMultiplier;
      this._move(this.player, x, y, cost);
      this.countAction(this.player, "dodge", cost);
      this.threat.dodged = true;
      this.say(`${this.player.name} 消耗 ${cost} 點緊急閃避！`);
      this.emit();
      setTimeout(() => this._reactionDone && this._reactionDone(), 250);
    }

    endure() {
      if (this.phase === "reaction" && this._reactionDone) this._reactionDone();
    }

    // base = 技能基礎傷害；mult = 額外倍率（例如穿過煙霧 ×1.5）
    damage(src, dst, base, mult = 1, note = "") {
      const amount = Math.max(1, Math.round(this.cfg.damage(base, src.atk, dst.df) * mult));
      dst.hp = Math.max(0, dst.hp - amount);
      this.say(`${dst.name} 受到 ${amount} 點傷害${note}`);
      this.emit({ type: "damage", unit: dst, amount, boosted: mult > 1 });
      if (!dst.alive) { this.say(`${dst.name} 倒下了`); this.emit({ type: "death", unit: dst }); }
      return amount;
    }

    // ---------- 敵人回合 ----------
    async runEnemyTurn(u) {
      for (const c of this.charges.filter((c) => c.owner === u)) {
        await sleep(this.cfg.aiDelay);
        if (this.dead) return;
        await this.resolveCharge(c);
        if (this.dead) return;
        if (this.checkEnd()) return;
      }
      await sleep(this.cfg.aiDelay);
      if (this.dead) return;
      await R.AI[u.def.ai].takeTurn(this, u);
      if (this.dead || this.phase === "over") return;
      await sleep(this.cfg.aiDelay * 0.6);
      if (this.dead) return;
      this.nextTurn();
    }

    // 敵人每做一次行動，自己的冷卻少 1
    enemySpend(u, cost) {
      u.ap -= cost;
      if (u.state.slamCd > 0) u.state.slamCd--;
    }

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
            u.x = nx; u.y = ny; u.facing = ang;
            this.enemySpend(u, cost);
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
      this.threat = {
        kind: "ram", owner: u, x: u.x + Math.cos(ang) * B, y: u.y + Math.sin(ang) * B, ang,
        length: r.length, width: r.width,
        total: r.reaction, deadline: performance.now() + r.reaction * 1000, dodged: false,
      };
      this.phase = "reaction";
      this.say(`${u.name} 準備撞擊！`);
      this.emit({ type: "threat" });

      await new Promise((res) => {
        this._reactionDone = res;
        this._reactionTimer = setTimeout(res, r.reaction * 1000);
      });
      clearTimeout(this._reactionTimer);
      this._reactionDone = null;
      if (this.dead) return;

      const t = this.threat;
      this.threat = null;
      this.phase = "enemy";
      this.emit({ type: "strike", shape: "rect", ...t });
      const p = this.player;
      if (p.alive && geo.inRect(p.x, p.y, t, B * 0.5)) this.damage(u, p, r.base);
      else { this.say(`${u.name} 的撞擊落空了！`); this.emit({ type: "miss", x: p.x, y: p.y }); }
      this.checkEnd();
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
      await sleep(leapTime);
      if (this.dead) return;

      this.charges = this.charges.filter((x) => x !== c);
      u.state.slamPending = false;
      u.state.slamCd = u.def.slam.cooldown;
      u.x = land.x; u.y = land.y;
      u.facing = Math.atan2(land.y - from.y, land.x - from.x) || u.facing;
      this.say(`${u.name} 的「壓制」落下！`);
      this.emit({ type: "strike", shape: "circle", unit: u, x: c.x, y: c.y, radius: c.radius });
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
