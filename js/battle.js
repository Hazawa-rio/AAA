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
    get alive() { return this.hp > 0; }
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
      this.player = this.add(new Unit("player", ch.id, ch, ch.stats, ps.x, ps.y, cfg.body));
      ch.init?.(this, this.player);
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
    enemies() { return this.units.filter((u) => u.team === "enemy" && u.alive); }
    mainEnemies() { return this.enemies().filter((u) => !u.part); }
    moveRadius(u) { return u.spd * this.cfg.movePerSpd; }
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
      if (this.round === 1) {
        // 行動順序只在第一回合決定：1d20 + 速度，高的先動；同分比速度，再同分玩家先
        const die = this.cfg.initiativeDie;
        const alive = this.units.filter((u) => u.alive && !u.part);
        for (const u of alive) u.initRoll = 1 + Math.floor(Math.random() * die);
        this.order = alive.sort((a, b) => b.initiative - a.initiative || b.spd - a.spd ||
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
      this.say(`輪到 ${u.name}`);
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

    checkEnd() {
      if (this.phase === "over") return true;
      let result = null;
      if (!this.player.alive) result = "lose";
      else if (!this.mainEnemies().length) result = "win";
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
      if (this.offTurn() && actionId && actionId === this.char.ultimate) throw new ActionError("大招只能在自己的回合使用");
    }
    requirePlayerTurn() {
      if (this.phase !== "player") throw new ActionError("現在不是你的回合");
    }

    move(x, y) {
      this.requireCanAct("move");
      const cost = this.cfg.moveCost * this.costMult();
      this._move(this.player, x, y, cost);
      this.countAction(this.player, "move", cost);
      this.afterPlayerAction();
    }

    // 使用技能（含普攻）。技能的 status() 決定能不能用、基本花多少行動點
    useSkill(id, arg = {}) {
      this.requireCanAct(id);
      const u = this.player, sk = this.skill(id);
      if (!sk) throw new ActionError("沒有這個技能");
      const st = sk.status(this, u);
      if (!st.ready) throw new ActionError(st.reason || "現在不能用");
      const cost = st.cost * this.costMult();
      if (u.ap < cost) throw new ActionError(`行動點不足（需要 ${cost}）`);
      // 有智力的敵人看得出攻擊會打到自己，會在結算前花行動點閃避
      if (sk.predict) {
        const hits = sk.predict(this, u, arg, st);           // 不合法會丟 ActionError，此時什麼都還沒扣
        if (hits.length) this.enemyReact(hits, {
          src: u, skill: id,
          repredict: () => { try { return sk.predict(this, u, arg, st); } catch { return []; } },
        });
      }
      sk.use(this, u, arg, st);
      u.ap -= cost;
      this.countAction(u, id, cost);
      this.afterPlayerAction();
    }

    endTurn() {
      this.requirePlayerTurn();
      this.say(`${this.player.name} 結束回合（保留 ${this.player.ap} 點）`);
      this.nextTurn();
    }

    afterPlayerAction() {
      if (this.checkEnd()) return;
      // 敵人回合中的行動不會結束任何回合
      if (this.phase === "player" && this.player.ap <= 0 && !this.char.canActFree?.(this, this.player)) this.nextTurn();
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

    // base = 技能基礎傷害；mult = 額外倍率（例如穿過煙霧 ×1.5）
    damage(src, dst, base, mult = 1, note = "") {
      if (!dst.alive) return 0;
      // 受傷倍率（例如殲滅矩陣的核心立場：依破壞的矩陣數量 0 / 0.5 / 1 / 1.5 倍）
      const k = dst.def.incomingMult ? dst.def.incomingMult(this, dst) : 1;
      if (k === 0) {
        this.say(`立場擋下了攻擊！先破壞能量矩陣`);
        this.emit({ type: "blocked", unit: dst });
        return 0;
      }
      if (k !== 1) note += `（立場 ×${k}）`;
      const amount = Math.max(1, Math.round(this.cfg.damage(base, src.atk, dst.df) * mult * k));
      dst.hp = Math.max(0, dst.hp - amount);
      this.say(`${dst.name} 受到 ${amount} 點傷害${note}`);
      this.emit({ type: "damage", unit: dst, amount, boosted: mult * k > 1 });
      if (!dst.alive) this.onDeath(dst);
      return amount;
    }

    onDeath(u) {
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
      for (const c of this.charges.filter((c) => c.owner === u)) {
        await this.wait(this.cfg.aiDelay);
        if (this.dead) return;
        await this.resolveCharge(c);
        if (this.dead) return;
        if (this.checkEnd()) return;
      }
      await this.wait(this.cfg.aiDelay);
      if (this.dead) return;
      await R.AI[u.def.ai].takeTurn(this, u);
      await this.waitProjectiles();
      if (u.alive && u.ap > 0 && u.def.reserveAp) this.say(`${u.name} 保留了 ${u.ap} 點行動點`);
      if (this.dead || this.phase === "over") return;
      await this.wait(this.cfg.aiDelay * 0.6);
      if (this.dead || this.phase === "over") return;
      this.nextTurn();
    }

    // 敵人每做一次行動，自己的冷卻少 1
    enemySpend(u, cost) {
      u.ap -= cost;
      if (u.state.slamCd > 0) u.state.slamCd--;
    }

    // ---------- 預告攻擊 ----------
    // shape：rect（x,y,ang,length,width）/ sector（x,y,ang,half,radius）/ circle（x,y,radius）
    // 先顯示範圍、等 reaction 秒，再判定玩家有沒有在範圍內
    async telegraph(owner, t, { base, sound, label, missText, mult = 1 } = {}) {
      t.owner = owner;
      t.total = t.reaction;
      t.deadline = performance.now() + t.reaction * 1000;
      this.threats.push(t);
      this.emit({ type: "threat", threat: t });
      await this.wait(t.reaction);
      this.threats = this.threats.filter((x) => x !== t);
      if (this.dead || this.phase === "over") return false;
      if (!owner.alive || (t.source && !t.source.alive)) {   // 倒數中被打倒：攻擊中斷
        this.say(`${label || owner.name + " 的攻擊"}中斷了`);
        this.emit({ type: "threatCancel", threat: t });
        return false;
      }
      this.emit({ type: "strike", ...t, sound });
      const p = this.player;
      if (p.alive && this.hitTest(t, p)) this.damage(owner, p, base, mult);
      else { this.say(missText || `${label || "攻擊"}落空了！`); this.emit({ type: "miss", x: p.x, y: p.y }); }
      this.checkEnd();
      return true;
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
        if (p.alive && dist(b.x, b.y, p.x, p.y) <= b.r + hitR) {
          this.emit({ type: "bulletHit", x: b.x, y: b.y });
          this.damage(b.owner, p, b.base);
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
