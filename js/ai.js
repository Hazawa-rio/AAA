/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/ai.js": "20261113212359" });
// 敵人 AI。每種敵人一個 takeTurn(battle, unit)。
(function () {
  const R = window.RPG;
  R.AI = R.AI || {};

  // ---------- 共用：有智力的 Boss 在玩家回合閃避 ----------
  // 閃避就是一次真正的移動（和玩家的應急移動一樣），不是無敵：
  // 判斷不一定準，移動完還在攻擊範圍內就照樣受傷
  function dodge(b, u, hits, info) {
    const mine = hits.filter((h) => h === u || h.parent === u);
    if (!mine.length) return;
    const cost = u.def.moveCost * b.cfg.offTurnMultiplier;
    if (u.ap < cost) return;
    // 不是每次都閃：攻擊從越遠的地方飛來，越來得及反應；近身攻擊很難閃。連續閃避會越來越難
    const V = u.def.dodge;
    const near = Math.min(...mine.flatMap((h) => info.origins.map((o) => Math.max(0, R.dist(o.x, o.y, h.x, h.y) - h.r))));
    const k = Math.max(0, Math.min(1, (near - V.near) / (V.far - V.near)));
    const chance = (V.minChance + (V.maxChance - V.minChance) * k) * Math.pow(V.fatigue, u.state.dodges || 0);
    if (Math.random() >= chance) return;
    // 攻擊快到的時候才動（畫面上看起來是在攻擊靠近時閃開）
    const delay = info.speed ? Math.min(0.8, (near / info.speed) * 0.65) : 0.05;
    const src = info.src, ang0 = Math.atan2(u.y - src.y, u.x - src.x), R0 = b.moveRadius(u);
    const still = () => info.repredict().filter((h) => h === u || h.parent === u).length;
    const opts = [];
    for (const off of [Math.PI / 2, -Math.PI / 2, Math.PI / 3, -Math.PI / 3, (2 * Math.PI) / 3, (-2 * Math.PI) / 3, 0]) {
      for (const f of [1, 0.7, 0.45]) {
        const dx = Math.cos(ang0 + off) * R0 * f, dy = Math.sin(ang0 + off) * R0 * f;
        if (!b.canShiftGroup(u, dx, dy)) continue;
        b.shiftGroup(u, dx, dy);
        opts.push({ dx, dy, left: still() });
        b.shiftGroup(u, -dx, -dy);
      }
    }
    if (!opts.length) return;
    // 看得清楚（攻擊從遠處來）就比較會選到好的方向，否則常常亂躲
    const sharp = V.minSharp + (V.maxSharp - V.minSharp) * k;
    let pick;
    if (Math.random() < sharp) {
      const best = Math.min(...opts.map((o) => o.left));
      const good = opts.filter((o) => o.left === best);
      pick = good[Math.floor(Math.random() * good.length)];
    } else pick = opts[Math.floor(Math.random() * opts.length)];
    b.shiftGroup(u, pick.dx, pick.dy);
    u.ap -= cost;
    u.state.dodges = (u.state.dodges || 0) + 1;
    b.say(pick.left ? `${u.name} 消耗 ${cost} 點行動點閃避……但沒有完全躲開！` : `${u.name} 消耗 ${cost} 點行動點閃避了攻擊！`);
    b.emit({ type: "move", unit: u });
    b.emit({ type: "enemyDodge", unit: u, group: b.group(u), delay, failed: !!pick.left });
  }

  // 史萊姆：低智力，只會在自己的回合把行動點全部用完（不會留點數）
  R.AI.slime = {
    async takeTurn(b, u) {
      const d0 = u.def;
      let guard = 0;
      while (u.ap > 0 && u.alive && !b.dead && b.phase !== "over" && guard++ < 12) {
        const p = b.aggroTarget(u);                  // 低智力：附近有召喚物（例如巨大蘑菇）就先打它
        const d = R.dist(u.x, u.y, p.x, p.y);
        const ramReach = d0.ram.length + b.cfg.body;   // 中心到中心的撞擊距離
        const slamReady = !u.state.slamPending && !(u.state.slamCd > 0) && u.ap >= d0.slam.ap;

        if (slamReady && d > ramReach && d <= d0.slam.range) {
          b.declareSlam(u, p);                       // 有距離、技能好了 → 壓制
        } else if (d <= ramReach && u.ap >= d0.ram.ap) {
          await b.enemyRam(u, p);                    // 夠近 → 撞擊
        } else if (b.enemyMoveToward(u, p, ramReach * 0.7)) {
          // 太遠 → 往玩家靠近
        } else {
          b.say(`${u.name} 呆呆地愣在原地`);         // 什麼都做不了，點數直接浪費掉
          u.ap = 0;
        }
        b.emit();
        if (u.ap > 0) await b.wait(b.cfg.aiDelay);
      }
    },
  };

  // ===== 彈跳噩夢（史萊姆的變體）：撞擊、壓制，加上往四周噴泡泡糖 =====
  // 泡泡糖：好幾個紅圈（一個一定瞄準玩家），黏在地上的泡泡糖會鼓起來變成粉色史萊姆
  R.AI.nightmare = {
    init(b, u) { u.state.gumAt = u.def.gum.first; },
    async takeTurn(b, u) {
      const D = u.def, G = D.gum, p = b.player, A = b.cfg.arena;
      if (b.round >= u.state.gumAt && u.ap >= G.ap && !u.state.slamPending) {
        u.state.gumAt = b.round + G.every;
        b.enemySpend(u, G.ap);
        b.say(`${u.name} 張開長滿鋸齒的大嘴，往四周噴出泡泡糖！`);
        const spots = [];
        if (R.dist(u.x, u.y, p.x, p.y) <= G.range + 60) spots.push({ x: p.x, y: p.y });
        let tries = 0;
        while (spots.length < G.count && tries++ < 80) {
          const a = Math.random() * Math.PI * 2, r = 110 + Math.random() * (G.range - 110);
          const x = u.x + Math.cos(a) * r, y = u.y + Math.sin(a) * r;
          if (x < 50 || y < 50 || x > A.w - 50 || y > A.h - 50) continue;
          if (b.onObstacle({ r: 20 }, x, y) || spots.some((s) => R.dist(s.x, s.y, x, y) < G.radius * 1.4)) continue;
          spots.push({ x, y });
        }
        b.emit({ type: "gumSpit", unit: u, spots });
        await Promise.all(spots.map((s, i) => b.telegraph(u, { shape: "circle", x: s.x, y: s.y, radius: G.radius, reaction: G.reaction, gum: true }, { base: G.base, sound: i ? null : D.sounds?.slam, label: "泡泡糖", quiet: i > 0 })));
        if (!u.alive || b.dead || b.phase === "over") return;
        b.emit({ type: "gumStick", spots });
        let n = Math.min(G.spawn, G.max - b.mainEnemies().filter((e) => e.kind === "pinkSlime").length);
        const made = [];
        for (const s of spots.slice().sort(() => Math.random() - 0.5)) {
          if (n <= 0) break;
          if (b.blocked({ r: 22, team: "enemy" }, s.x, s.y)) continue;
          made.push(b.summonEnemy("pinkSlime", s.x, s.y)); n--;
        }
        if (made.length) b.say(`黏在地上的泡泡糖鼓了起來，變成了${made.length} 隻粉色史萊姆！`);
        b.emit();
        if (u.ap > 0) await b.wait(b.cfg.aiDelay);
      }
      if (u.ap > 0 && u.alive) await R.AI.slime.takeTurn(b, u);
    },
  };

  // ===== Boss：古代遺跡的殲滅矩陣 =====
  // 有智力：
  //   - 會整體移動（核心＋觸手＋矩陣一起），保持在能用觸手、電流打到玩家的距離
  //   - 每回合保留 reserveAp 點行動點，在玩家回合被瞄準時花雙倍行動點閃避
  //   1 點：揮動觸手（以觸手根部為圓心的扇形，有預告）、矩陣電流（有預告）、核心射擊 1-2-1-2 光彈（沒預告）
  //   2 點：寬激光（有預告）、所有矩陣環狀光彈（沒預告）
  //   大招：至少隔 3 回合，矩陣環狀光彈 + 核心朝三個方向射 1-2-1-2
  R.AI.matrixBoss = {
    init(b, u) {
      u.state.ultReady = u.def.ult.firstRound;     // 第幾回合起可以放大招
    },

    async takeTurn(b, u) {
      const D = u.def;
      const ok = () => u.alive && !b.dead && b.phase !== "over";
      const matrices = () => u.parts.filter((p) => p.alive);
      u.state.dodges = 0;                           // 這一輪成功閃避的次數（越閃越累）
      const budget = () => u.ap - D.reserveAp;      // 保留給閃避的點數不動用
      let moves = 0;

      // 大招就緒就先放
      if (b.round >= u.state.ultReady && budget() >= D.ult.ap) {
        await this.ultimate(b, u);
        u.state.ultReady = b.round + D.ult.every;
        if (ok()) await b.wait(b.cfg.aiDelay);
      }

      let last = null, guard = 0;
      while (budget() > 0 && ok() && guard++ < 30) {
        const p = b.player;
        const dCore = R.dist(u.x, u.y, p.x, p.y);
        const opts = [];
        const add = (id, w) => { if (budget() >= (D[id]?.ap ?? 1)) opts.push([id, id === last ? w * 0.4 : w]); };
        const arm = this.bestArm(b, u);
        if (arm) add("swipe", D.swipe.weight + 2);
        if (matrices().some((m) => R.dist(m.x, m.y, p.x, p.y) <= D.electric.radius + 30)) add("electric", D.electric.weight + 2);
        add("shot", D.shot.weight);
        add("laser", D.laser.weight);
        if (matrices().length) add("ring", D.ring.weight);
        // 離太遠：往玩家靠近（每回合最多移動 2 次）
        if (moves < 2 && dCore > D.preferDist + 40) add("approach", 5);
        if (!opts.length) break;

        let r = Math.random() * opts.reduce((a, o) => a + o[1], 0), pick = opts[0][0];
        for (const [id, w] of opts) { if ((r -= w) <= 0) { pick = id; break; } }
        last = pick;
        if (pick === "approach") {
          moves++;
          if (!this.moveToward(b, u, p, D.preferDist)) moves = 9;    // 動不了就不再嘗試
        } else await this[pick](b, u);
        if (ok() && budget() > 0) await b.wait(b.cfg.aiDelay * 0.6);
      }
    },

    // 整體移動到離目標約 want 的位置
    moveToward(b, u, target, want) {
      const D = u.def;
      if (u.ap < D.moveCost) return false;
      const d = R.dist(u.x, u.y, target.x, target.y);
      const ang0 = Math.atan2(target.y - u.y, target.x - u.x);
      const step0 = Math.min(b.moveRadius(u), Math.max(0, d - want));
      if (step0 < 15) return false;
      for (const off of [0, 0.4, -0.4, 0.8, -0.8, 1.2, -1.2]) {
        for (const f of [1, 0.7, 0.45]) {
          const dx = Math.cos(ang0 + off) * step0 * f, dy = Math.sin(ang0 + off) * step0 * f;
          if (!b.canShiftGroup(u, dx, dy)) continue;
          const from = { x: u.x, y: u.y };
          b.shiftGroup(u, dx, dy);
          b.enemySpend(u, D.moveCost, from);
          b.say(`${u.name} 移動了`);
          b.emit({ type: "move", unit: u });
          return true;
        }
      }
      return false;
    },

    // 玩家回合被瞄準：花雙倍行動點整體閃開
    react(b, u, hits, info) {
      if (!u.alive) return;
      const mine = hits.filter((h) => h === u || h.parent === u);
      if (!mine.length) return;
      // 只打到核心、而且立場擋得住 → 不必躲
      if (mine.every((h) => h === u) && u.def.incomingMult(b, u) === 0) return;
      dodge(b, u, hits, info);
    },

    // ---------- 觸手 ----------
    // 觸手根部：核心邊緣、朝這條觸手的方向
    root(u, arm) { return { x: u.x + Math.cos(arm.angle) * u.r, y: u.y + Math.sin(arm.angle) * u.r }; },
    // 觸手（含末端矩陣）能掃到的距離
    swipeRadius(u) { return u.def.armLength - u.r + u.def.part.r + u.def.swipe.extra; },
    // 選一條揮得到玩家、而且轉動角度最小的觸手
    bestArm(b, u) {
      const p = b.player, rad = this.swipeRadius(u);
      let best = null, bestDiff = Infinity;
      for (const arm of u.parts) {
        const o = this.root(u, arm);
        if (R.dist(o.x, o.y, p.x, p.y) > rad + p.r * 0.5) continue;
        const diff = R.geo.angDiff(Math.atan2(p.y - o.y, p.x - o.x), arm.angle);
        if (diff < bestDiff) { best = arm; bestDiff = diff; }
      }
      return best;
    },

    async swipe(b, u) {
      const S = u.def.swipe, arm = this.bestArm(b, u);
      if (!arm) return;
      b.enemySpend(u, S.ap);
      const o = this.root(u, arm), p = b.player;
      const ang = Math.atan2(p.y - o.y, p.x - o.x), half = (S.half * Math.PI) / 180;
      b.say(`${u.name} 揚起了${arm.name.replace("矩陣", "")}的觸手！`);
      await b.telegraph(u, { shape: "sector", x: o.x, y: o.y, ang, half, radius: this.swipeRadius(u), reaction: u.def.reaction, kind: "tentacle", arm },
        {
          base: S.base, sound: u.def.sounds.tentacle, label: "觸手橫掃",
          onHit: (pl) => { if (b.knockback(pl, o.x, o.y, S.knockback)) b.say(`${pl.name} 被觸手擊退了`); },
        });
    },

    // 從核心邊緣朝某方向的起點
    edge(u, ang, extra = 0) {
      return { x: u.x + Math.cos(ang) * (u.r + extra), y: u.y + Math.sin(ang) * (u.r + extra) };
    },
    aim(u, p) { return Math.atan2(p.y - u.y, p.x - u.x); },

    async electric(b, u) {
      const E = u.def.electric, p = b.player;
      const m = u.parts.filter((x) => x.alive).sort((a, c) => R.dist(a.x, a.y, p.x, p.y) - R.dist(c.x, c.y, p.x, p.y))[0];
      if (!m) return;
      b.enemySpend(u, E.ap);
      b.say(`${m.name} 開始蓄積電流！`);
      await b.telegraph(u, { shape: "circle", x: m.x, y: m.y, radius: E.radius, reaction: u.def.reaction, kind: "electric", source: m },
        {
          base: E.base, sound: u.def.sounds.electric, label: `${m.name} 的電流`,
          onHit: (pl) => {
            if (pl.ap <= 0) return;
            pl.ap = Math.max(0, pl.ap - E.apDrain);
            b.say(`${pl.name} 被電流麻痺，失去 ${E.apDrain} 點行動點`);
            b.emit({ type: "apDrain", unit: pl, amount: E.apDrain });
          },
        });
    },

    async laser(b, u) {
      const L = u.def.laser;
      b.enemySpend(u, L.ap);
      const ang = this.aim(u, b.player), o = this.edge(u, ang, -10);
      b.say(`${u.name} 的核心開始聚集激光！`);
      await b.telegraph(u, { shape: "rect", x: o.x, y: o.y, ang, length: 1400, width: L.width, reaction: u.def.reaction, kind: "laser" },
        { base: L.base, sound: u.def.sounds.laser, label: "激光" });
    },

    // 一串 1-2-1-2 的光彈（每一波隔 interval 秒）
    async volley(b, u, angles, waves, spread, interval, base) {
      const B = u.def.bullet, sp = (spread * Math.PI) / 180;
      for (const n of waves) {
        if (!u.alive || b.dead || b.phase === "over") return;
        for (const a0 of angles) {
          const list = n === 1 ? [a0] : [a0 - sp / 2, a0 + sp / 2];
          for (const a of list) { const o = this.edge(u, a); b.spawnBullet(u, o.x, o.y, a, { speed: B.speed, r: B.r, base }); }
        }
        b.emit({ type: "sfx", sound: u.def.sounds.bullet });
        await b.wait(interval);
      }
    },

    ringFrom(b, u, m, count, base) {
      const B = u.def.bullet, off = Math.random() * Math.PI * 2;
      for (let i = 0; i < count; i++) {
        const a = off + (i / count) * Math.PI * 2;
        b.spawnBullet(m, m.x + Math.cos(a) * m.r, m.y + Math.sin(a) * m.r, a, { speed: B.speed * 0.8, r: B.r, base });
      }
    },

    async shot(b, u) {
      const S = u.def.shot;
      b.enemySpend(u, S.ap);
      b.say(`${u.name} 的核心射出光彈`);
      await this.volley(b, u, [this.aim(u, b.player)], S.waves, S.spread * 2, S.interval, S.base);
    },

    async ring(b, u) {
      const G = u.def.ring;
      const ms = u.parts.filter((m) => m.alive);
      if (!ms.length) return;
      b.enemySpend(u, G.ap);
      b.say(`能量矩陣同時釋放環狀光彈！`);
      for (const m of ms) this.ringFrom(b, u, m, G.count, G.base);
      b.emit({ type: "sfx", sound: u.def.sounds.bullet });
      b.emit({ type: "pulse", units: ms });
      await b.wait(0.4);
    },

    async ultimate(b, u) {
      const U = u.def.ult;
      b.enemySpend(u, U.ap);
      b.say(`【警告】${u.name} 開始火力掃蕩！`);
      b.emit({ type: "bossUlt", unit: u, text: `${u.name}開始火力掃蕩` });
      const ms = u.parts.filter((m) => m.alive);
      for (const m of ms) this.ringFrom(b, u, m, U.count, U.base);
      b.emit({ type: "pulse", units: ms });
      const a0 = this.aim(u, b.player);
      const dirs = [a0, a0 + (Math.PI * 2) / 3, a0 - (Math.PI * 2) / 3];
      await this.volley(b, u, dirs, U.waves, U.spread * 2, U.interval, U.base);
      await b.waitProjectiles();                  // 光彈全部飛完才算大招結束
      b.emit({ type: "bossUltEnd", unit: u });
    },
  };

  // ===== 試煉 Boss：受難之日 =====
  const PI = Math.PI;
  const DIRS = [0, PI / 2, PI, -PI / 2];          // 右、下、左、上
  const rand = (a, b) => a + Math.random() * (b - a);
  const weighted = (opts) => {
    let r = Math.random() * opts.reduce((a, o) => a + o[1], 0);
    for (const [id, w] of opts) if ((r -= w) <= 0) return id;
    return opts[0][0];
  };

  R.AI.passion = {
    init(b, u) {
      u.state.phase = 1;
      u.state.ultReady = Infinity;      // 第一階段沒有大招
      u.state.redeemReady = 2;          // 第 2 回合起才會用無序者的救贖
    },
    ok(b, u) { return u.alive && !b.dead && b.phase !== "over" && !u.state.transforming; },
    p2(u) { return u.state.phase === 2; },

    // 位置：握劍的左手（畫面左側）、舉起的右手指尖（畫面右側）
    hand(u) { return { x: u.x - 64, y: u.y + 18 }; },
    tip(u, ang) { const h = this.hand(u); return { x: h.x + Math.cos(ang) * 150, y: h.y + Math.sin(ang) * 150 }; },
    fingertip(u) { return { x: u.x + 82, y: u.y - 66 }; },

    slashRect(u, ang) { const S = u.def.slash; return { shape: "rect", x: u.x, y: u.y, ang, length: S.length, width: S.width }; },
    // 玩家在哪些方向的斬擊範圍內
    dirsHitting(b, u) {
      const p = b.player;
      return DIRS.filter((a) => R.geo.inRect(p.x, p.y, this.slashRect(u, a), p.r * 0.5));
    },
    pickDirs(b, u, n) {
      const hit = this.dirsHitting(b, u);
      const out = [];
      // 智力高：大多會選打得到玩家的方向
      if (hit.length && Math.random() < 0.8) out.push(hit[Math.floor(Math.random() * hit.length)]);
      while (out.length < n) {
        const a = DIRS[Math.floor(Math.random() * 4)];
        if (!out.includes(a)) out.push(a);
      }
      return out;
    },

    async takeTurn(b, u) {
      const D = u.def;
      u.state.dodges = 0;
      const budget = () => u.ap - D.reserveAp;
      let last = null, guard = 0, moves = 0;
      if (this.p2(u) && b.round >= u.state.ultReady && budget() >= D.ult.ap) {
        await this.ultimate(b, u);
        if (this.ok(b, u)) await b.wait(b.cfg.aiDelay);
      }
      while (budget() > 0 && this.ok(b, u) && guard++ < 20) {
        const p = b.player, opts = [];
        const add = (id, w) => { if (budget() >= D[id].ap) opts.push([id, id === last ? w * 0.4 : w]); };
        const sword = !u.state.plunged;            // 劍插在地上時不能揮劍、不能用劍尖
        if (sword) {
          add("slash", this.dirsHitting(b, u).length || this.p2(u) ? D.slash.weight + 1 : 0.4);
          add("judgment", D.judgment.weight);
          if (b.round >= u.state.redeemReady) add("redemption", D.redemption.weight);
        }
        const f = this.fingertip(u);
        add("suffering", R.dist(f.x, f.y, p.x, p.y) <= D.suffering.radius + 60 ? D.suffering.weight + 2 : D.suffering.weight * 0.5);
        if (this.p2(u) && moves < 2 && R.dist(u.x, u.y, p.x, p.y) > D.preferDist + 60 && u.ap >= D.moveCost) opts.push(["approach", 4]);
        if (!opts.length) break;
        const pick = weighted(opts);
        last = pick;
        if (pick === "approach") {
          moves++;
          if (!R.AI.matrixBoss.moveToward(b, u, p, D.preferDist)) moves = 9;
        } else await this[pick](b, u);
        if (this.ok(b, u) && budget() > 0) await b.wait(b.cfg.aiDelay * 0.6);
      }
    },

    // ---------- 揮砍 ----------
    async slash(b, u, { cost, dirs } = {}) {
      const D = u.def, S = D.slash;
      b.enemySpend(u, cost ?? S.ap);
      dirs = dirs || this.pickDirs(b, u, this.p2(u) ? 2 : 1);
      const names = { 0: "右", [PI / 2]: "下", [PI]: "左", [-PI / 2]: "上" };
      b.say(`${u.name} 舉起反十字劍，朝${dirs.map((a) => names[a]).join("、")}方揮砍！`);
      b.emit({ type: "bossPose", unit: u, pose: "slash", angs: dirs, dur: D.reaction * 1000 + 600 });
      await Promise.all(dirs.map((ang) => b.telegraph(u, { ...this.slashRect(u, ang), reaction: D.reaction, kind: "passionSlash" },
        { base: S.base, sound: D.sounds.slash, label: "揮砍" })));
    },

    // ---------- 制裁：劍尖雷射 ----------
    async judgment(b, u) {
      const D = u.def, J = D.judgment, n = this.p2(u) ? J.shots2 : 1;
      b.enemySpend(u, J.ap);
      b.say(n > 1 ? `${u.name} 的劍尖連續指向你——「制裁」×${n}！` : `${u.name} 的劍尖指向你——「制裁」！`);
      const list = [];
      for (let i = 0; i < n && this.ok(b, u); i++) {
        const h = this.hand(u), p = b.player, ang = Math.atan2(p.y - h.y, p.x - h.x), o = this.tip(u, ang);
        const reaction = n > 1 ? J.reaction2 : D.reaction;
        b.emit({ type: "bossPose", unit: u, pose: "aim", ang, dur: reaction * 1000 + 300 });
        list.push(b.telegraph(u, { shape: "rect", x: o.x, y: o.y, ang, length: 1500, width: J.width, reaction, kind: "judgment" },
          { base: J.base, sound: D.sounds.laser, label: "制裁" }));
        if (i < n - 1) await b.wait(J.interval2);
      }
      await Promise.all(list);
    },

    // ---------- 無序者的救贖：插劍蓄力，下次輪到它時擴散到全圖的同心圓 ----------
    redemption(b, u) {
      const D = u.def, X = D.redemption;
      b.enemySpend(u, X.ap);
      const bands = [];
      for (let r = X.first; r < 1500; r += X.band + X.gap) bands.push([r, r + X.band]);
      b.charges.push({ kind: "redemption", owner: u, x: u.x, y: u.y, bands, base: X.base, heal: X.heal });
      u.state.plunged = true;
      u.state.redeemReady = b.round + X.cooldown + 1;
      b.say(`${u.name} 把劍插進地面——「無序者的救贖」蓄力中！站到圓圈之間的空隙`);
      b.emit({ type: "charge" });
    },
    async resolveCharge(b, c) {
      const u = c.owner;
      b.charges = b.charges.filter((x) => x !== c);
      if (!u.alive) return;
      b.say(`「無序者的救贖」擴散開來！`);
      b.emit({ type: "redemption", x: c.x, y: c.y, bands: c.bands, sound: u.def.sounds.bell });
      await b.wait(0.55);
      u.state.plunged = false;
      if (b.dead || b.phase === "over") return;
      const inBand = (t) => { const d = R.dist(t.x, t.y, c.x, c.y); return c.bands.some(([a, z]) => d + t.r * 0.5 >= a && d - t.r * 0.5 <= z); };
      const p = b.player;
      if (p.alive && inBand(p)) b.damage(u, p, c.base, 1, "（無序者的救贖）");
      else { b.say("站在空隙裡，躲過了救贖的圓圈"); b.emit({ type: "miss", x: p.x, y: p.y }); }
      for (const m of b.mainEnemies()) if (m.def.minion && inBand(m)) b.heal(m, c.heal, "（無序者的救贖）");
      b.checkEnd();
    },

    // ---------- 這便是苦難：指尖的擴散圓環 ----------
    async suffering(b, u) {
      const D = u.def, F = D.suffering, n = this.p2(u) ? F.count2 : F.count;
      b.enemySpend(u, F.ap);
      b.say(`${u.name} 舉起右手——「這便是苦難」`);
      b.emit({ type: "bossPose", unit: u, pose: "raise", dur: 2200 + n * 600 });
      const list = [];
      for (let i = 0; i < n && this.ok(b, u); i++) {
        const o = this.fingertip(u);
        list.push(b.telegraph(u, { shape: "circle", x: o.x, y: o.y, radius: F.radius, reaction: 0.9, kind: "bellRing" },
          { base: F.base, sound: D.sounds.bell, label: "苦難的圓環" }));
        if (i < n - 1) await b.wait(rand(F.gapMin, F.gapMax));
      }
      await Promise.all(list);
    },

    // ---------- 受苦的詛咒：教徒、教皇倒下時馬上復活 ----------
    onUnitDeath(b, u, dead) {
      if (!dead.def.minion || dead.state.sacrificed || !u.alive || this.p2(u) || u.state.transforming) return;
      const loss = Math.round(u.maxHp * u.def.minionLoss[dead.def.minion]);
      u.hp = Math.max(1, u.hp - loss);
      b.say(`${dead.name} 倒下，${u.name} 失去 ${loss} 點生命`);
      b.emit({ type: "damage", unit: u, amount: loss, text: `-${loss}（${dead.def.minion === "pope" ? "教皇" : "教徒"}）` });
      this.onHurt(b, u);
      if (!u.state.transforming) this.curse(b, u, dead);
    },
    async curse(b, u, m) {
      const C = u.def.curse;
      await b.wait(0.7);
      if (!u.alive || b.dead || b.phase === "over" || this.p2(u) || u.state.transforming || m.alive) return;
      b.emit({ type: "bossPose", unit: u, pose: "raise", dur: 1300 });
      if (u.ap >= C.ap) u.ap -= C.ap;
      else {
        const cost = Math.max(1, Math.round(u.maxHp * C.hpCost));
        u.hp = Math.max(1, u.hp - cost);
        b.say(`${u.name} 行動點不足，以 ${cost} 點生命發動「受苦的詛咒」`);
        b.emit({ type: "damage", unit: u, amount: cost, text: `-${cost}（詛咒）` });
      }
      const spot = !b.blocked(m, m.home.x, m.home.y) ? m.home : b.randomFreeSpot(m.r, 20) || m.home;
      m.x = spot.x; m.y = spot.y;
      m.hp = m.maxHp;
      m.state = {};
      m.cd = {};
      R.AI[m.def.ai]?.init?.(b, m);
      if (!b.order.includes(m)) b.order.push(m);
      b.say(`${u.name} 舉起右手——「受苦的詛咒」，${m.name} 復甦了`);
      b.emit({ type: "revive", unit: m, by: u });
      this.onHurt(b, u);
    },

    // ---------- 第一階段：玩家靠近時花雙倍行動點搶先揮劍 ----------
    afterPlayerAction(b, u) {
      if (b.phase !== "player" || this.p2(u) || u.state.transforming || u.state.plunged) return;
      if (u.state.preemptRound === b.round) return;
      const cost = u.def.slash.ap * b.cfg.offTurnMultiplier;
      if (u.ap < cost) return;
      const dirs = this.dirsHitting(b, u);
      if (!dirs.length || Math.random() >= u.def.preemptChance) return;
      u.state.preemptRound = b.round;
      b.say(`${u.name} 看穿了你的動作，消耗 ${cost} 點行動點搶先出手！`);
      this.slash(b, u, { cost, dirs: [dirs[0]] });
    },

    // 第二階段：會閃避
    react(b, u, hits, info) {
      if (!u.alive || !this.p2(u) || u.state.transforming || u.state.plunged) return;
      dodge(b, u, hits, info);
    },

    // ---------- 變身 ----------
    onHurt(b, u) {
      if (this.p2(u) || u.state.transforming || !u.alive) return;
      if (u.hp <= u.maxHp * u.def.phase2At) this.transform(b, u);
    },
    async transform(b, u) {
      const D = u.def;
      u.state.transforming = true;
      u.state.invuln = true;
      b.cutscene = true;
      // 正在進行的攻擊、蓄力全部取消
      const mine = (x) => x.owner === u || x.owner?.def?.minion;
      for (const t of b.threats) if (mine(t)) { t.cancelled = true; b.emit({ type: "threatCancel", threat: t }); }
      b.threats = b.threats.filter((t) => !mine(t));
      const gone = b.charges.filter(mine);
      if (gone.length) { b.charges = b.charges.filter((c) => !mine(c)); b.emit({ type: "chargeCancel", charges: gone }); }
      u.state.plunged = false;
      b.say(`${u.name} 高舉反十字劍……`);
      b.emit({ type: "bossPose", unit: u, pose: "raiseSword", dur: 3200 });
      await b.wait(0.9);
      if (b.dead) return;
      // 教徒、教皇化作向上的光柱
      const minions = b.mainEnemies().filter((m) => m.def.minion);
      for (const m of minions) {
        m.state.sacrificed = true;
        b.emit({ type: "sacrifice", unit: m });
        m.hp = 0;
        b.onDeath(m);
      }
      b.emit({ type: "sfx", sound: D.sounds.laser, rate: 0.55 });
      if (minions.length) b.say("所有的教徒與教皇化作光柱，被吸進了劍中");
      await b.wait(1.1);
      if (b.dead) return;
      b.emit({ type: "orb", unit: u, dur: 1400 });
      b.say(`${u.name} 被紅色的光球包覆……`);
      await b.wait(1.4);
      if (b.dead) return;
      u.state.phase = 2;
      u.name = D.name2;
      u.r = 52;
      u.state.invuln = false;
      u.state.transforming = false;
      b.cutscene = false;
      b.say(`「${D.name2}」降臨！`);
      b.emit({ type: "phase2", unit: u });
      await this.ultimate(b, u, { free: true });
      u.state.ultReady = b.round + D.ult.every;
    },

    // ---------- 大招：神的狂怒 ----------
    async ultimate(b, u, { free } = {}) {
      const D = u.def, U = D.ult, A = b.cfg.arena;
      if (!free) b.enemySpend(u, U.ap);
      u.state.ultReady = b.round + U.every;
      b.say(`【警告】受難之日已然降臨——「神的狂怒」`);
      b.emit({ type: "bossUlt", unit: u, text: "受難之日已然降臨", style: "passion" });
      b.emit({ type: "bossPose", unit: u, pose: "raiseSword", dur: U.count * U.interval * 1000 + 1500 });
      const list = [];
      for (let i = 0; i < U.count && u.alive && !b.dead && b.phase !== "over"; i++) {
        const p = b.player;
        let x, y;
        if (i % U.aimEvery === 0) { x = p.x + rand(-40, 40); y = p.y + rand(-40, 40); }    // 每幾發瞄準玩家一次
        else { x = rand(U.radius, A.w - U.radius); y = rand(U.radius, A.h - U.radius); }
        x = Math.min(Math.max(x, 20), A.w - 20); y = Math.min(Math.max(y, 20), A.h - 20);
        list.push(b.telegraph(u, { shape: "circle", x, y, radius: U.radius, reaction: U.reaction, kind: "pillar", rate: 0.75 },
          { base: U.base, sound: D.sounds.laser, label: "神的狂怒", quiet: true }));
        await b.wait(U.interval);
      }
      await Promise.all(list);
      b.emit({ type: "bossUltEnd", unit: u });
    },
  };

  // ===== 復甦的混亂教徒：只會移動和揮砍十字架 =====
  R.AI.cultist = {
    async takeTurn(b, u) {
      const S = u.def.swing;
      let guard = 0;
      while (u.ap > 0 && u.alive && !b.dead && b.phase !== "over" && guard++ < 10) {
        const p = b.aggroTarget(u), d = R.dist(u.x, u.y, p.x, p.y);
        if (d <= S.radius + p.r * 0.5 && u.ap >= S.ap) await this.swing(b, u, p);
        else if (!b.enemyMoveToward(u, p, S.radius * 0.6)) { b.say(`${u.name} 停在原地`); u.ap = 0; }
        b.emit();
        if (u.ap > 0) await b.wait(b.cfg.aiDelay * 0.8);
      }
    },
    mult(u) { return 1 + (u.state.buff || 0) * u.def.buffPer; },
    async swing(b, u, target) {
      const S = u.def.swing, p = target || b.player, ang = Math.atan2(p.y - u.y, p.x - u.x);
      b.enemySpend(u, S.ap);
      u.facing = ang;
      const m = this.mult(u);
      b.say(`${u.name} 揮起十字架！${m > 1 ? `（強化 ×${m.toFixed(1)}）` : ""}`);
      await b.telegraph(u, { shape: "sector", x: u.x, y: u.y, ang, half: (S.half * PI) / 180, radius: S.radius, reaction: S.reaction, kind: "crossSwing" },
        { base: S.base, mult: m, sound: u.def.sounds.swing, label: `${u.name} 的揮砍` });
    },
  };

  // ===== 復甦的混亂教皇：擴散圓環、聖牢籠 =====
  R.AI.pope = {
    async takeTurn(b, u) {
      const D = u.def;
      let guard = 0, rang = false;
      while (u.ap > 0 && u.alive && !b.dead && b.phase !== "over" && guard++ < 10) {
        const p = b.player, d = R.dist(u.x, u.y, p.x, p.y);
        const cultistsNear = b.mainEnemies().some((c) => c.def.minion === "cultist" && R.dist(c.x, c.y, u.x, u.y) <= D.ring.radius + c.r);
        if (!b.cages().length && u.ap >= D.cage.ap && d < 560 && Math.random() < 0.55) await this.cage(b, u);
        else if (!rang && u.ap >= D.ring.ap && (d <= D.ring.radius + 40 || cultistsNear)) { rang = true; await this.ring(b, u); }
        else if (d > D.keepDist + 60 && b.enemyMoveToward(u, p, D.keepDist)) { /* 靠近 */ }
        else if (!rang && u.ap >= D.ring.ap) { rang = true; await this.ring(b, u); }
        else { u.ap = 0; }
        b.emit();
        if (u.ap > 0) await b.wait(b.cfg.aiDelay * 0.8);
      }
    },
    async ring(b, u) {
      const G = u.def.ring;
      b.enemySpend(u, G.ap);
      b.say(`${u.name} 敲響聖鐘，擴散出圓環`);
      const res = await b.telegraph(u, { shape: "circle", x: u.x, y: u.y, radius: G.radius, reaction: G.reaction, kind: "bellRing", source: u },
        { base: G.base, sound: u.def.sounds.bell, label: "教皇的圓環" });
      if (res === false || !u.alive) return;
      // 碰到的教徒變強
      for (const c of b.mainEnemies()) {
        if (c.def.minion !== "cultist" || R.dist(c.x, c.y, u.x, u.y) > G.radius + c.r) continue;
        c.state.buff = Math.min(c.def.buffMax, (c.state.buff || 0) + 1);
        b.emit({ type: "buff", unit: c, text: `強化 ×${(1 + c.state.buff * c.def.buffPer).toFixed(1)}` });
      }
    },
    async cage(b, u) {
      const G = u.def.cage, p = b.player, S = G.size;
      b.enemySpend(u, G.ap);
      const cx = p.x, cy = p.y;
      b.say(`${u.name} 舉起權杖——「聖牢籠」！離開框框的範圍`);
      await b.telegraph(u, { shape: "rect", x: cx - S / 2, y: cy, ang: 0, length: S, width: S, reaction: G.reaction, kind: "cage", source: u },
        {
          noDamage: true, sound: u.def.sounds.bell, label: "聖牢籠", hitText: "被聖牢籠困住！", missText: "逃出了聖牢籠的範圍！",
          onHit: (pl) => this.makeCage(b, u, cx, cy, S, pl),
        });
    },
    makeCage(b, u, cx, cy, S, pl) {
      const G = u.def.cage, m = b.cfg.body;
      // 玩家只擦到邊：牢籠中心挪一點，讓玩家整個在裡面
      cx = Math.min(Math.max(cx, pl.x - (S / 2 - m)), pl.x + (S / 2 - m));
      cy = Math.min(Math.max(cy, pl.y - (S / 2 - m)), pl.y + (S / 2 - m));
      const c = b.spawnSpecial("enemy", "holyCage", b.cfg.enemies.holyCage, cx, cy, { cage: true, size: S, holds: pl, base: G.base });
      c.r = S / 2;
      c.hp = c.maxHp = G.hits;
      b.say(`${pl.name} 被聖牢籠困住了！攻擊牢籠 ${G.hits} 次才能出去`);
      b.emit({ type: "cage", unit: c });
    },
  };

  // ===== 聖牢籠：每個敵人回合開始時，傷害被困住的玩家 =====
  R.AI.cage = {
    onAnyTurnStart(b, c, u) {
      if (u.team !== "enemy" || u.cage || u.demon || u.part) return;
      const p = c.holds;
      if (!p || !p.alive) return;
      if (!b.inCage(c, p.x, p.y)) { c.holds = null; c.hp = 0; b.emit({ type: "cageBreak", unit: c }); return; }
      b.emit({ type: "cageTick", unit: c });
      b.damage(c, p, c.base, 1, "（聖牢籠）");
    },
  };

  // ===== 魔狼 =====
  // 低智力、成群行動：多隻時從不同方向包抄目標；夠近就撕咬，有距離就飛撲
  // 護送戰裡會優先衝向馬車（玩家靠近時改咬玩家）
  const wolfTarget = (b, u) => (b.room.escort ? b.escortTarget(u) : b.aggroTarget(u));
  // 包抄的位置：依這隻狼在狼群裡的順序，從目標的不同側面靠近
  function flankPoint(b, u, t, want) {
    const pack = b.mainEnemies().filter((e) => e.def.ai === "wolf");
    const i = pack.indexOf(u), n = pack.length;
    const base = Math.atan2(u.y - t.y, u.x - t.x);
    const off = n > 1 ? (i - (n - 1) / 2) * (u.def.flank || 0.8) : 0;
    const A = b.cfg.arena;
    return { x: Math.min(Math.max(t.x + Math.cos(base + off) * want, 30), A.w - 30), y: Math.min(Math.max(t.y + Math.sin(base + off) * want, 30), A.h - 30) };
  }
  R.AI.wolf = {
    // 一個動作；回傳 false 表示什麼都做不了
    async actOnce(b, u) {
      const D = u.def, t = wolfTarget(b, u);
      if (!t) { u.ap = 0; return false; }
      const d = R.dist(u.x, u.y, t.x, t.y);
      const reach = D.bite.length + (t.r || b.cfg.body) * 0.6;
      if (u.state.pounceCd > 0 && b.realtime) u.state.pounceCd--;
      if (!(u.state.pounceCd > 0) && u.ap >= D.pounce.ap && d > reach && d <= D.pounce.length + (t.r || 0) * 0.5) {
        u.state.pounceCd = D.pounce.cooldown;
        await b.enemyLunge(u, t, D.pounce, D.pounce.name || "飛撲", true);
        return true;
      }
      if (d <= reach && u.ap >= D.bite.ap) { await b.enemyLunge(u, t, D.bite, D.bite.name || "撕咬", false); return true; }
      const goal = flankPoint(b, u, t, reach * 0.75);
      if (b.enemyMoveToward(u, goal, 6)) return true;
      if (b.enemyMoveToward(u, t, reach * 0.7)) return true;
      b.say(u.kind === "wolf" ? `${u.name} 低吼著繞圈` : `${u.name} 在原地打量著你`);
      u.ap = 0;
      return false;
    },
    async takeTurn(b, u) {
      if (u.state.pounceCd > 0) u.state.pounceCd--;
      let guard = 0;
      while (u.ap > 0 && u.alive && !b.dead && b.phase !== "over" && guard++ < 10) {
        const ok = await this.actOnce(b, u);
        b.emit();
        if (!ok) break;
        if (u.ap > 0) await b.wait(b.cfg.aiDelay);
      }
    },
  };

  // ===== 異變魔狼領頭 =====
  // 吃了怪異樹莓而變異：體型更大、兩側長出骨刃
  //   撕咬（1 點）・雙刃迴旋（2 點，自己周圍的大圓）・撕裂撲擊（2 點，很長的長方形，結算後衝過去）
  //   狼嚎（2 點）：場上魔狼少於 2 隻時叫來一隻，每 3 回合最多一次
  R.AI.alphaWolf = {
    init(b, u) { u.state.howlAt = 2; },
    async actOnce(b, u) {
      const D = u.def, t = wolfTarget(b, u);
      if (!t) { u.ap = 0; return false; }
      const d = R.dist(u.x, u.y, t.x, t.y);
      const reach = D.bite.length + (t.r || b.cfg.body) * 0.6;
      const wolves = b.mainEnemies().filter((e) => (D.howl?.kind ? e.kind === D.howl.kind : e.def.ai === "wolf")).length;
      if (D.howl && b.round >= u.state.howlAt && wolves < D.howl.max && u.ap >= D.howl.ap) {
        b.enemySpend(u, D.howl.ap);
        u.state.howlAt = b.round + D.howl.every;
        b.say(D.howl.line ? `${u.name}：${D.howl.line}` : `${u.name} 仰天長嚎！魔狼從草叢裡竄了出來`);
        b.emit({ type: "sfx", sound: D.howl.sound });
        const A = b.cfg.arena, side = Math.random() < 0.5 ? 60 : A.w - 60;
        b.summonEnemy(D.howl.kind || "wolf", side, 120 + Math.random() * (A.h - 240));
        return true;
      }
      if (!(u.state.spinCd > 0) && u.ap >= D.spin.ap && d <= D.spin.radius - 10) {
        u.state.spinCd = D.spin.cooldown + 1;
        await b.enemySpin(u, D.spin, D.spin.name || "雙刃迴旋");
        return true;
      }
      if (!(u.state.rendCd > 0) && u.ap >= D.rend.ap && d > reach && d <= D.rend.length) {
        u.state.rendCd = D.rend.cooldown + 1;
        await b.enemyLunge(u, t, D.rend, D.rend.name || "撕裂撲擊", true);
        return true;
      }
      if (d <= reach && u.ap >= D.bite.ap) { await b.enemyLunge(u, t, D.bite, D.bite.name || "撕咬", false); return true; }
      if (b.enemyMoveToward(u, t, reach * 0.7)) return true;
      u.ap = 0;
      return false;
    },
    async takeTurn(b, u) {
      if (u.state.spinCd > 0) u.state.spinCd--;
      if (u.state.rendCd > 0) u.state.rendCd--;
      let guard = 0;
      while (u.ap > 0 && u.alive && !b.dead && b.phase !== "over" && guard++ < 10) {
        const ok = await this.actOnce(b, u);
        b.emit();
        if (!ok) break;
        if (u.ap > 0) await b.wait(b.cfg.aiDelay);
      }
    },
  };

  // ===== 午夜嚇人比賽：黑馬選手武士盔甲 =====
  // 跟異變魔狼領頭一樣的斬、迴旋斬、居合・一閃，再加上「收刀呼氣」：
  //   收刀進入呼氣狀態（這一回合不再動作）；這時候被打，會立刻反擊大範圍斬擊「鬼一文字」
  R.AI.samurai = {
    init(b, u) { R.AI.alphaWolf.init(b, u); u.state.stanceAt = 2; },
    async takeTurn(b, u) {
      const S = u.def.stance;
      if (u.state.stance) { u.state.stance = false; b.say(`${u.name} 緩緩吐出一口氣，重新握好了刀`); b.emit({ type: "buff", unit: u, text: "呼——", color: "#8a9aa8" }); }
      const d = R.dist(u.x, u.y, b.player.x, b.player.y);
      if (b.round >= u.state.stanceAt && u.ap >= S.ap && d <= S.range) {
        u.state.stanceAt = b.round + S.every;
        b.enemySpend(u, S.ap);
        u.state.stance = true;
        b.say(`${u.name} 收刀入鞘，深深地吸了一口氣……（現在出手，會被反擊！）`);
        b.emit({ type: "buff", unit: u, text: "收刀呼氣", color: "#c62828" });
        b.emit({ type: "sfx", sound: S.sound });
        u.ap = 0;
        b.emit();
        return;
      }
      await R.AI.alphaWolf.takeTurn(b, u);
    },
    onHurt(b, u) {
      if (!u.state.stance || u.state.countering || !u.alive) return;
      u.state.stance = false;
      u.state.countering = true;
      this.counter(b, u).finally(() => { u.state.countering = false; });
    },
    async counter(b, u) {
      const C = u.def.counter, t = b.player;
      const ang = Math.atan2(t.y - u.y, t.x - u.x);
      u.facing = ang;
      b.say(`${u.name} 的刀出鞘了——「${C.name}」！`);
      b.emit({ type: "bossUlt", unit: u, text: C.name, style: "samurai" });
      const tg = { shape: "rect", x: u.x - Math.cos(ang) * 40, y: u.y - Math.sin(ang) * 40, ang, length: C.length, width: C.width, reaction: C.reaction, bigSlash: true };
      await b.telegraph(u, tg, { base: C.base, sound: C.sound, label: `${u.name} 的${C.name}` });
      b.emit({ type: "bossUltEnd" });
      b.emit();
    },
  };

  // ===== 午夜嚇人比賽：熱門選手大白鯊 =====
  // 咬、甩尾、破地衝出，再加上「深海狂潛」：潛進地底（打不到、看不到），
  //   地上留下預告的圓圈；下次輪到牠時從那裡衝出來
  R.AI.shark = {
    init(b, u) { R.AI.alphaWolf.init(b, u); u.state.diveAt = 2; },
    async takeTurn(b, u) {
      const D = u.def.dive;
      if (!u.state.dived && b.round >= u.state.diveAt && u.ap >= D.ap) {
        u.state.diveAt = b.round + D.every;
        b.enemySpend(u, D.ap);
        const t = b.aggroTarget(u) || b.player;
        b.emit({ type: "dive", unit: u, x: u.x, y: u.y, sound: D.sound });
        u.state.dived = true;
        b.charges.push({ kind: "dive", owner: u, x: t.x, y: t.y, radius: D.radius, base: D.base });
        b.say(`${u.name} 一頭鑽進了地板裡……不見了！地上浮現了一圈漣漪（下次輪到牠時會從那裡衝出來）`);
        u.ap = 0;
        b.emit({ type: "charge" });
        return;
      }
      await R.AI.alphaWolf.takeTurn(b, u);
    },
    async resolveCharge(b, c) {
      const u = c.owner, D = u.def.dive;
      b.charges = b.charges.filter((x) => x !== c);
      if (!u.alive) return;
      b.emit({ type: "bossUlt", unit: u, text: D.name });
      b.say(`地板下傳來轟隆聲——「${D.name}」！`);
      await b.telegraph(u, { shape: "circle", x: c.x, y: c.y, radius: c.radius, reaction: 0.35, burst: true }, { base: c.base, sound: D.sound, label: `${u.name} 的${D.name}` });
      b.emit({ type: "bossUltEnd" });
      // 從洞裡探出頭（找最近的空位）
      let to = { x: c.x, y: c.y };
      u.state.dived = false;
      if (b.blocked(u, to.x, to.y)) {
        for (let r = 20; r < 400; r += 20) { let ok = null; for (let i = 0; i < 12 && !ok; i++) { const a = (i / 12) * Math.PI * 2, x = c.x + Math.cos(a) * r, y = c.y + Math.sin(a) * r; if (!b.blocked(u, x, y) && x > u.r && y > u.r && x < b.cfg.arena.w - u.r && y < b.cfg.arena.h - u.r) ok = { x, y }; } if (ok) { to = ok; break; } }
      }
      u.x = to.x; u.y = to.y;
      b.emit({ type: "surface", unit: u, x: u.x, y: u.y });
      b.emit({ type: "move", unit: u });
    },
  };

  // ===== 午夜嚇人比賽：衛冕選手死神 =====
  //   揮動鐮刀（自己周圍的圓）・舉起鐮刀，用鐮刀上的火焰發射地獄火（很長的紅框）
  //   抬起右手「你是下一個！」：指定玩家或玩家的召喚物為收割目標，之後的攻擊都瞄準它
  //   打中收割目標 → 不花行動點，立刻舉起鐮刀發射大量地獄火「你的靈魂歸我所有！」
  //   叫來亡魂（幽靈扮演者）
  R.AI.reaper = {
    init(b, u) { u.state.markAt = 1; u.state.callAt = 2; },
    pose(b, u, pose, dur) { u.state.pose = pose; u.state.poseT = performance.now(); u.state.poseDur = dur * 1000; b.emit(); },
    target(b, u) { const m = u.state.mark; return m && m.alive ? m : b.aggroTarget(u); },
    async takeTurn(b, u) {
      const D = u.def;
      if (u.state.sweepCd > 0) u.state.sweepCd--;
      if (u.state.fireCd > 0) u.state.fireCd--;
      if (u.state.mark && (!u.state.mark.alive || b.round > u.state.markUntil)) { u.state.mark = null; }
      let guard = 0;
      while (u.ap > 0 && u.alive && !b.dead && b.phase !== "over" && guard++ < 8) {
        const t = this.target(b, u), d = R.dist(u.x, u.y, t.x, t.y);
        const crew = b.mainEnemies().filter((e) => e.kind === D.call.kind).length;
        if (!u.state.mark && b.round >= u.state.markAt && u.ap >= D.mark.ap) {
          b.enemySpend(u, D.mark.ap);
          u.state.markAt = b.round + D.mark.every;
          const cands = [b.player, ...b.allies().filter((a) => a.summon)].filter((x) => x.alive);
          const m = cands.length > 1 && Math.random() < 0.5 ? cands[1 + Math.floor(Math.random() * (cands.length - 1))] : b.player;
          u.state.mark = m; u.state.markUntil = b.round + D.mark.last;
          u.facing = Math.atan2(m.y - u.y, m.x - u.x);
          this.pose(b, u, "point", 1.4);
          b.say(`${u.name} 抬起右手，指向 ${m.name}——「${D.mark.name}」`);
          b.emit({ type: "buff", unit: m, text: "收割目標", color: "#c62828" });
          b.emit({ type: "sfx", sound: D.mark.sound });
          await b.wait(0.9);
        } else if (b.round >= u.state.callAt && crew < D.call.max && u.ap >= D.call.ap) {
          b.enemySpend(u, D.call.ap);
          u.state.callAt = b.round + D.call.every;
          b.say(`${u.name}：「${D.call.line}」`);
          const A = b.cfg.arena;
          b.summonEnemy(D.call.kind, Math.random() < 0.5 ? 90 : A.w - 90, 120 + Math.random() * (A.h * 0.45));
        } else if (!(u.state.sweepCd > 0) && u.ap >= D.sweep.ap && d <= D.sweep.radius - 10) {
          u.state.sweepCd = D.sweep.cooldown + 1;
          await this.swing(b, u);
        } else if (!(u.state.fireCd > 0) && u.ap >= D.shot.ap && d <= D.shot.length) {
          u.state.fireCd = D.shot.cooldown + 1;
          await this.fire(b, u, t);
        } else if (!b.enemyMoveToward(u, t, D.sweep.radius * 0.6)) break;
        if (u.state.reapNow && u.alive && !b.dead && b.phase !== "over") { u.state.reapNow = false; await this.ult(b, u); }
        b.emit();
        if (u.ap > 0) await b.wait(b.cfg.aiDelay);
      }
      u.ap = 0;
    },
    onAny(b, u) { return (x) => { if (x === u.state.mark) u.state.reapNow = true; }; },
    async swing(b, u) {
      const S = u.def.sweep;
      b.enemySpend(u, S.ap);
      this.pose(b, u, "swing", 1.6);
      b.say(`${u.name} 揮動鐮刀！`);
      await b.telegraph(u, { shape: "circle", x: u.x, y: u.y, radius: S.radius, reaction: S.reaction, follow: u }, { base: S.base, sound: S.sound, label: `${u.name} 的${S.name}`, onAny: this.onAny(b, u) });
    },
    async fire(b, u, t) {
      const S = u.def.shot, ang = Math.atan2(t.y - u.y, t.x - u.x);
      b.enemySpend(u, S.ap);
      u.facing = ang;
      this.pose(b, u, "raise", 1.8);
      b.say(`${u.name} 舉起鐮刀，刀尖的火焰暴漲——「${S.name}」！`);
      const from = R.EnemyArt?.reaperFlame ? R.EnemyArt.reaperFlame(u, u) : { x: u.x, y: u.y };
      await b.telegraph(u, { shape: "rect", x: u.x + Math.cos(ang) * u.r * 0.6, y: u.y + Math.sin(ang) * u.r * 0.6, ang, length: S.length, width: S.width, reaction: S.reaction, fire: "blue", fromX: from.x, fromY: from.y }, { base: S.base, sound: S.sound, label: `${u.name} 的${S.name}`, quiet: t !== b.player, onAny: this.onAny(b, u) });
    },
    // 大招：你的靈魂歸我所有！（不花行動點）
    async ult(b, u) {
      const U = u.def.ult, A = b.cfg.arena, p = b.player;
      u.state.mark = null;
      this.pose(b, u, "raise", 3.4);
      b.say(`${u.name} 舉起鐮刀——「${U.name}」`);
      b.emit({ type: "bossUlt", unit: u, text: U.warn, style: "reaper" });           // 橫幅顯示的是警告：「哈哈哈哈哈哈！墮入地獄吧！！」
      b.say(`${u.name}：「${U.warn}」`);
      b.emit({ type: "sfx", sound: U.sound });
      await b.wait(0.8);
      const spots = [{ x: p.x, y: p.y }];
      for (let i = 0; i < 40 && spots.length < U.count; i++) {
        const x = 80 + Math.random() * (A.w - 160), y = 80 + Math.random() * (A.h - 160);
        if (spots.some((s) => R.dist(s.x, s.y, x, y) < U.radius * 1.5)) continue;
        spots.push({ x, y });
      }
      await Promise.all(spots.map((s, i) => b.wait(i * 0.06).then(() => b.telegraph(u, { shape: "circle", x: s.x, y: s.y, radius: U.radius, reaction: U.reaction, fire: "blue", fromX: R.EnemyArt?.reaperFlame?.(u, u).x, fromY: R.EnemyArt?.reaperFlame?.(u, u).y }, { base: U.base, sound: i ? null : u.def.shot.sound, label: "地獄火", quiet: i > 0 }))));
      b.emit({ type: "bossUltEnd" });
    },
  };

  // ===== 古代遺跡的秘密寶庫：超古代兵器・翁爾貢（試煉 Boss） =====
  //   迴旋斬擊・槍尖連戳・噴射突刺（雙肩往後噴雷射，一路衝到房間邊緣；途中可能迴旋斬或連戳）
  //   投擲長槍・肩炮光彈・大招「執行-徹底清除」（槍尖戳進地面，雙肩的雷射分兩波掃過房間）
  //   被它打到＝破綻 2 回合；噴射突刺撞上能量水晶＝暈眩 1 回合、受到 1.5 倍傷害
  R.AI.ongergon = {
    init(b, u) { u.state.ultAt = u.def.ult.firstRound; },
    react(b, u, hits, info) { if (!u.alive || u.state.stunUntil >= b.round || u.state.busy) return; dodge(b, u, hits, info); },
    pose(b, u, pose, dur) { u.state.pose = pose; u.state.poseT = performance.now(); u.state.poseDur = dur * 1000; b.emit(); },
    face(u, t) { u.facing = Math.atan2(t.y - u.y, t.x - u.x); },
    // 音效可以是一組：給 i 就輪流，不給就隨機
    snd(s, i) { return Array.isArray(s) ? s[i == null ? Math.floor(Math.random() * s.length) : i % s.length] : s; },
    flaw(b, u) {
      const F = u.def.flaw;
      // 打中：已經有破綻的目標再被打中＝破防（防禦變低）；沒有的話掛上破綻
      return (x) => {
        if (!x.alive) return;
        const fresh = !(x.state.flawUntil >= b.round);
        if (!fresh) this.breach(b, u, x);
        x.state.flawUntil = b.round + F.rounds; x.state.flawMult = F.mult;
        if (fresh) { b.say(`${x.name} 露出了破綻（${F.rounds} 回合內受到的傷害 ×${F.mult}）`); b.emit({ type: "buff", unit: x, text: "破綻", color: "#e8262c" }); }
      };
    },
    // 破防：防禦變低（槍尖連戳、或打在破綻上）
    breach(b, u, x) {
      const Bd = u.def.breach;
      if (!Bd || !x.alive) return;
      const fresh = !(x.state.defDownUntil >= b.round);
      x.state.defDownUntil = b.round + Bd.rounds; x.state.defDownMult = Bd.mult;
      if (fresh) { b.say(`${x.name} 被破防了（防禦 ×${Bd.mult}）`); b.emit({ type: "buff", unit: x, text: "破防", color: "#b05a1e" }); }
    },
    async takeTurn(b, u) {
      const D = u.def;
      u.state.dodges = 0;
      if (u.state.stunUntil >= b.round) { b.say(`${u.name} 還在暈眩中，動不了！`); b.emit({ type: "buff", unit: u, text: "暈眩", color: "#f0c800" }); u.ap = 0; return; }
      for (const k of ["spinCd", "dashCd", "throwCd", "orbCd"]) if (u.state[k] > 0) u.state[k]--;
      if (b.round >= u.state.ultAt && u.ap >= D.ult.ap) { u.state.ultAt = b.round + D.ult.every; b.enemySpend(u, D.ult.ap); await this.ult(b, u); }
      let guard = 0;
      while (u.ap > 0 && u.alive && !b.dead && b.phase !== "over" && guard++ < 10) {
        if (u.state.stunUntil >= b.round) break;
        const t = b.aggroTarget(u) || b.player, d = R.dist(u.x, u.y, t.x, t.y);
        this.face(u, t);
        if (!(u.state.spinCd > 0) && u.ap >= D.spin.ap && d <= D.spin.radius - 10) { u.state.spinCd = D.spin.cooldown + 1; b.enemySpend(u, D.spin.ap); await this.spin(b, u, D.spin.reaction); }
        else if (!(u.state.dashCd > 0) && u.ap >= D.dash.ap && (d > 220 || Math.random() < 0.35)) { u.state.dashCd = D.dash.cooldown + 1; b.enemySpend(u, D.dash.ap); await this.dash(b, u, t); }
        else if (u.ap >= D.poke.ap && d <= D.poke.length + (t.r || 20)) { b.enemySpend(u, D.poke.ap); await this.poke(b, u, t, D.poke.hits); }
        else if (!(u.state.throwCd > 0) && u.ap >= D.throw.ap && d > 300 && d <= D.throw.length) { u.state.throwCd = D.throw.cooldown + 1; b.enemySpend(u, D.throw.ap); await this.throwSpear(b, u, t); }
        else if (!(u.state.orbCd > 0) && u.ap >= D.orbs.ap) { u.state.orbCd = D.orbs.cooldown + 1; b.enemySpend(u, D.orbs.ap); await this.orbs(b, u, t); }
        else if (!b.enemyMoveToward(u, t, D.poke.length * 0.7)) break;
        b.emit();
        if (u.ap > 0) await b.wait(b.cfg.aiDelay * 0.7);
      }
      u.ap = 0;
    },
    async spin(b, u, reaction) {
      const S = u.def.spin;
      this.pose(b, u, "spin", reaction + 0.6);
      b.say(`${u.name}：迴旋斬擊`);
      await b.telegraph(u, { shape: "circle", x: u.x, y: u.y, radius: S.radius, reaction, follow: u }, { base: S.base, sound: this.snd(S.sound), label: `${u.name} 的${S.name}`, onAny: this.flaw(b, u) });
    },
    async poke(b, u, t, n) {
      const P = u.def.poke;
      b.say(`${u.name}：槍尖連戳`);
      for (let i = 0; i < n && u.alive && !b.dead; i++) {
        this.face(u, t);
        const ang = u.facing + (i - 1) * 0.12;
        this.pose(b, u, "poke", 0.9);
        await b.telegraph(u, { shape: "rect", x: u.x + Math.cos(ang) * u.r * 0.6, y: u.y + Math.sin(ang) * u.r * 0.6, ang, length: P.length, width: P.width, reaction: i ? P.reaction * 0.6 : P.reaction, lunge: true }, { base: P.base, sound: this.snd(P.sound, i), label: `${u.name} 的${P.name}`, quiet: i > 0, onAny: ((f) => (x) => { this.breach(b, u, x); f(x); })(this.flaw(b, u)) });   // 槍尖連戳：刺穿防禦
      }
    },
    // 噴射突刺：預告一路到房間邊緣的長框；途中可能迴旋斬或連戳；撞上能量水晶就停下來暈眩
    async dash(b, u, t) {
      const Dd = u.def.dash, A = b.cfg.arena, ang = Math.atan2(t.y - u.y, t.x - u.x), dx = Math.cos(ang), dy = Math.sin(ang);
      u.facing = ang;
      const tx = dx > 0 ? (A.w - u.r - u.x) / dx : dx < 0 ? (u.r - u.x) / dx : Infinity, ty = dy > 0 ? (A.h - u.r - u.y) / dy : dy < 0 ? (u.r - u.y) / dy : Infinity;
      let len = Math.max(60, Math.min(tx, ty)), hitC = null;
      for (const c of b.crystals || []) {
        if (c.broken) continue;
        const along = (c.x - u.x) * dx + (c.y - u.y) * dy, off = Math.abs((c.x - u.x) * dy - (c.y - u.y) * dx);
        if (along > 0 && off < c.r + Dd.width / 2 && along - c.r - u.r < len) { len = Math.max(40, along - c.r - u.r * 0.6); hitC = c; }
      }
      this.pose(b, u, "dash", Dd.reaction + 1.2);
      b.say(`${u.name} 的雙肩往後噴出雷射——「${Dd.name}」！`);
      await b.telegraph(u, { shape: "rect", x: u.x, y: u.y, ang, length: len + u.r, width: Dd.width, reaction: Dd.reaction }, { base: Dd.base, sound: Dd.sound, label: `${u.name} 的${Dd.name}`, onAny: this.flaw(b, u) });
      if (!u.alive || b.dead) return;
      u.state.busy = true;
      const go = async (k) => { const from = { x: u.x, y: u.y }, to = { x: u.x + dx * len * k, y: u.y + dy * len * k }; b.emit({ type: "leap", unit: u, from, to, duration: 0.18 }); await b.wait(0.18); u.x = to.x; u.y = to.y; b.emit({ type: "move", unit: u }); };
      const mid = Math.random();
      if (len > 260 && mid < 0.55) {
        await go(0.5); len *= 0.5;
        if (mid < 0.3) await this.spin(b, u, 0.6); else await this.poke(b, u, t, 1);
      }
      if (!u.alive || b.dead) { u.state.busy = false; return; }
      await go(1);
      u.state.busy = false;
      if (hitC) {
        hitC.broken = true;
        const S = u.def.stun;
        u.state.stunUntil = b.round + S.rounds; u.state.vulnUntil = b.round + S.rounds;
        b.say(`${u.name} 撞碎了能量水晶！暈眩了（${S.rounds} 回合，受到 ${S.mult} 倍傷害）`);
        b.emit({ type: "crystalBreak", x: hitC.x, y: hitC.y, unit: u });
        b.emit({ type: "buff", unit: u, text: "暈眩！", color: "#f0c800" });
        u.ap = 0;
      }
    },
    async throwSpear(b, u, t) {
      const T = u.def.throw, ang = Math.atan2(t.y - u.y, t.x - u.x);
      u.facing = ang; this.pose(b, u, "throw", T.reaction + 0.6);
      b.say(`${u.name} 擲出了雙刃長槍！`);
      await b.telegraph(u, { shape: "rect", x: u.x + Math.cos(ang) * u.r * 0.6, y: u.y + Math.sin(ang) * u.r * 0.6, ang, length: T.length, width: T.width, reaction: T.reaction, shot: true }, { base: T.base, sound: T.sound, label: `${u.name} 的${T.name}`, onAny: this.flaw(b, u) });
    },
    async orbs(b, u, t) {
      const O = u.def.orbs, A = b.cfg.arena;
      this.pose(b, u, "orbs", O.reaction + 0.4);
      b.say(`${u.name} 的雙肩亮起——肩炮光彈！`);
      const spots = [{ x: t.x, y: t.y }];
      for (let i = 0; spots.length < O.count && i < 30; i++) { const a = Math.random() * Math.PI * 2, r = O.spread * (0.6 + Math.random() * 0.5), x = t.x + Math.cos(a) * r, y = t.y + Math.sin(a) * r; if (x > 40 && y > 40 && x < A.w - 40 && y < A.h - 40) spots.push({ x, y }); }
      await Promise.all(spots.map((s, i) => b.wait(i * 0.12).then(() => b.telegraph(u, { shape: "circle", x: s.x, y: s.y, radius: O.radius, reaction: O.reaction }, { base: O.base, sound: i ? null : O.sound, label: "肩炮光彈", quiet: i > 0, onAny: this.flaw(b, u) }))));
    },
    // 大招：執行-徹底清除（橫條紅框分兩波掃過房間）
    async ult(b, u) {
      const U = u.def.ult, A = b.cfg.arena, H = A.h / U.bands;
      u.state.busy = true;
      this.pose(b, u, "plunge", U.reaction * 2 + 1.6);
      b.say(`${u.name} 把槍尖戳進地面——「${U.name}」`);
      b.emit({ type: "bossUlt", unit: u, text: U.name });
      await b.wait(0.7);
      const first = Math.random() < 0.5 ? 0 : 1;
      for (const w of [first, 1 - first]) {
        const bands = []; for (let i = w; i < U.bands; i += 2) bands.push(i);
        await Promise.all(bands.map((i, k) => b.telegraph(u, { shape: "rect", x: 0, y: H * i + H / 2, ang: 0, length: A.w, width: H - 6, reaction: U.reaction }, { base: U.base, sound: k ? null : U.sound, label: U.name, quiet: k > 0, onAny: this.flaw(b, u) })));
        if (!u.alive || b.dead) break;
      }
      b.emit({ type: "bossUltEnd" });
      u.state.busy = false;
    },
  };

  // ===== 變異發泡水母（海上釣魚） =====
  // mode：shell＝在船邊探出紅色硬殼（防禦 shellDf）；air＝跳出海面（本體露出，防禦很低，到下次行動前都打得動）
  function jellyEdgeSpot(b, u) {
    const w = b.room.walk, out = u.r + 18, A = b.cfg.arena;
    for (let i = 0; i < 20; i++) {
      const side = Math.floor(Math.random() * 4);
      let x, y;
      if (side === 0) { x = w.x + 30 + Math.random() * (w.w - 60); y = w.y - out; }
      else if (side === 1) { x = w.x + 30 + Math.random() * (w.w - 60); y = w.y + w.h + out; }
      else if (side === 2) { x = w.x - out; y = w.y + 30 + Math.random() * (w.h - 60); }
      else { x = w.x + w.w + out; y = w.y + 30 + Math.random() * (w.h - 60); }
      x = Math.min(Math.max(x, u.r), A.w - u.r); y = Math.min(Math.max(y, u.r), A.h - u.r);
      if (!b.blocked(u, x, y)) return { x, y };
    }
    return { x: u.x, y: u.y };
  }
  // 船上的隨機一點
  function onBoat(b, pad = 30) {
    const w = b.room.walk;
    return { x: w.x + pad + Math.random() * (w.w - pad * 2), y: w.y + pad + Math.random() * (w.h - pad * 2) };
  }
  async function surfaceAt(b, u, to, mode) {
    const from = { x: u.x, y: u.y };
    u.state.mode = mode;
    u.df = mode === "air" ? u.def.df : u.def.shellDf;
    b.emit({ type: "leap", unit: u, from, to, duration: 0.35 });
    await b.wait(0.35);
    u.x = to.x; u.y = to.y;
    b.emit({ type: "move", unit: u });
  }
  R.AI.jelly = {
    init(b, u) { u.state.mode = "shell"; u.df = u.def.shellDf; u.state.burstAt = 3; const p = jellyEdgeSpot(b, u); u.x = p.x; u.y = p.y; },
    async takeTurn(b, u) {
      const D = u.def, p = b.player;
      // 跳出海面：灑下大量泡沫，本體露出來
      if (b.round >= u.state.burstAt && u.ap >= D.burst.ap) {
        u.state.burstAt = b.round + D.burst.every;
        b.enemySpend(u, D.burst.ap);
        await surfaceAt(b, u, jellyEdgeSpot(b, u), "air");
        b.say(`${u.name} 跳出海面，揮動觸手灑下大量泡沫！牠脆弱的本體露出來了`);
        const spots = [{ x: p.x, y: p.y }];
        while (spots.length < D.burst.count) spots.push(onBoat(b));
        await Promise.all(spots.map((s) => b.telegraph(u, { shape: "circle", x: s.x, y: s.y, radius: D.burst.radius, reaction: D.burst.reaction }, { base: D.burst.base, sound: D.sounds?.slam, label: "泡沫", quiet: s !== spots[0] })));
        return;            // 停在空中，到下次行動前都打得動
      }
      // 平常：潛回海裡，從船邊另一處探出硬殼噴泡沫
      await surfaceAt(b, u, jellyEdgeSpot(b, u), "shell");
      b.say(`${u.name} 從船邊探出紅色硬殼`);
      while (u.ap >= D.foam.ap && u.alive && !b.dead && b.phase !== "over") {
        b.enemySpend(u, D.foam.ap);
        b.say(`${u.name} 向船上噴出泡沫！`);
        const w = b.room.walk, m = 24;
        const near = () => ({ x: Math.min(Math.max(p.x + (Math.random() - 0.5) * D.foam.spread * 2, w.x + m), w.x + w.w - m), y: Math.min(Math.max(p.y + (Math.random() - 0.5) * D.foam.spread * 2, w.y + m), w.y + w.h - m) });
        const spots = [{ x: p.x, y: p.y }];
        while (spots.length < D.foam.count) spots.push(near());
        await Promise.all(spots.map((s, i) => b.telegraph(u, { shape: "circle", x: s.x, y: s.y, radius: D.foam.radius, reaction: D.foam.reaction }, { base: D.foam.base, sound: i ? null : D.sounds?.slam, label: "泡沫", quiet: i > 0 })));
        if (u.ap > 0) await b.wait(b.cfg.aiDelay);
      }
    },
  };

  // ===== 海盜火槍手：保持距離開火 =====
  R.AI.gunner = {
    async takeTurn(b, u) {
      const D = u.def;
      let guard = 0;
      while (u.ap > 0 && u.alive && !b.dead && b.phase !== "over" && guard++ < 8) {
        const t = b.aggroTarget(u), d = R.dist(u.x, u.y, t.x, t.y);
        if (d < D.keep && u.ap >= 1) {
          // 往遠離目標的方向退
          const a = Math.atan2(u.y - t.y, u.x - t.x);
          if (!b.enemyMoveToward(u, { x: u.x + Math.cos(a) * 200, y: u.y + Math.sin(a) * 200 }, 0)) break;
        } else if (u.ap >= D.shot.ap && d <= D.shot.length) await b.enemyLunge(u, t, D.shot, D.shot.name, false);
        else if (!b.enemyMoveToward(u, t, D.keep + 40)) break;
        b.emit();
        if (u.ap > 0) await b.wait(b.cfg.aiDelay);
      }
      u.ap = 0;
    },
  };

  // ===== 海盜船長・黑鰭：橫掃、火槍、叫來手下 =====
  // 網狀彈幕（D.web）：先展開成一張網，再一波一波往四周射出文字彈
  async function webBurst(b, u, W) {
    b.enemySpend(u, W.ap);
    b.say(`${u.name}：${W.line || `${W.name}！`}`);
    b.emit({ type: "web", unit: u, radius: W.radius || 260, spokes: W.count, color: W.color, dur: (W.reaction || 1) * 1000 });
    if (W.sound) b.emit({ type: "sfx", sound: W.sound });
    await b.wait(W.reaction || 1);                        // 網展開的時間＝反應時間
    for (let w = 0; w < W.waves; w++) {
      if (!u.alive || b.dead || b.phase === "over") break;
      const off = (w % 2) * (Math.PI / W.count) + Math.random() * 0.15;     // 每一波錯開半格，留縫可以鑽
      for (let i = 0; i < W.count; i++) {
        const a = off + (i / W.count) * Math.PI * 2;
        b.spawnBullet(u, u.x + Math.cos(a) * u.r, u.y + Math.sin(a) * u.r, a, { speed: W.speed, r: W.r || 12, base: W.base, text: W.words[(i + w * 3) % W.words.length], color: W.color });
      }
      if (W.sound) b.emit({ type: "sfx", sound: W.sound });
      await b.wait(W.interval || 0.6);
    }
    await b.waitProjectiles();
  }

  R.AI.captain = {
    init(b, u) { u.state.callAt = 2; u.state.webCd = 2; },          // 網狀彈幕最快第二回合才用
    async takeTurn(b, u) {
      const D = u.def;
      if (u.state.sweepCd > 0) u.state.sweepCd--;
      if (u.state.shotCd > 0) u.state.shotCd--;
      if (u.state.webCd > 0) u.state.webCd--;
      let guard = 0;
      while (u.ap > 0 && u.alive && !b.dead && b.phase !== "over" && guard++ < 8) {
        const t = b.aggroTarget(u), d = R.dist(u.x, u.y, t.x, t.y);
        const callKind = D.call.kind || "pirate";
        const crew = b.mainEnemies().filter((e) => e.kind === callKind).length;
        if (D.web && !(u.state.webCd > 0) && u.ap >= D.web.ap) {
          u.state.webCd = D.web.cooldown + 1;
          await webBurst(b, u, D.web);
        } else if (b.round >= u.state.callAt && crew < D.call.max && u.ap >= D.call.ap) {
          b.enemySpend(u, D.call.ap);
          u.state.callAt = b.round + D.call.every;
          b.say(D.call.line ? `${u.name}：「${D.call.line}」` : `${u.name}：「上啊！把他們扔進海裡！」`);
          const sh = b.room.pirateShip, A = b.cfg.arena;
          if (sh) b.summonEnemy(callKind, sh.x + 40 + Math.random() * 60, sh.y + 40 + Math.random() * (sh.h - 80));
          else b.summonEnemy(callKind, Math.random() < 0.5 ? 90 : A.w - 90, 120 + Math.random() * (A.h * 0.45));
        } else if (!(u.state.sweepCd > 0) && u.ap >= D.sweep.ap && d <= D.sweep.radius - 10) {
          u.state.sweepCd = D.sweep.cooldown + 1;
          await b.enemySpin(u, D.sweep, D.sweep.name || "橫掃");
        } else if (!(u.state.shotCd > 0) && u.ap >= D.shot.ap && d <= D.shot.length) {
          u.state.shotCd = D.shot.cooldown + 1;
          await b.enemyLunge(u, t, D.shot, D.shot.name || "火槍", false);
        } else if (!b.enemyMoveToward(u, t, D.sweep.radius * 0.6)) break;
        b.emit();
        if (u.ap > 0) await b.wait(b.cfg.aiDelay);
      }
      u.ap = 0;
    },
  };

  // ===== 試煉 Boss「囍」：骨和皮肉（兩個同時存在）=====
  // 同生共死（一個倒下，另一個 revive.turns 回合後把它拉回來）、形影不離（靠近時骨減傷、皮肉回血，寫在 config）、紅線（骨的回合開始時）
  R.AI.xi = {
    partner(b, u) { return b.units.find((x) => x !== u && x.kind === u.def.partnerKind); },
    init(b, u) { R.AI.captain.init(b, u); if (!u.def.web) u.state.webCd = 999; },
    onUnitDeath(b, u, dead) {
      if (!u.alive || dead !== this.partner(b, u)) return;
      u.state.reviveIn = u.def.revive.turns;
      b.say(`${u.name}：「……還沒拜完堂。」（${u.def.revive.turns} 回合後，${dead.name} 會被拉回來）`);
      b.emit({ type: "buff", unit: u, text: `${u.def.revive.turns} 回合後拉回${dead.name}`, color: "#c40a1e" });
    },
    async takeTurn(b, u) {
      const P = this.partner(b, u), D = u.def;
      // 同生共死
      if (P && !P.alive && u.state.reviveIn > 0) {
        u.state.reviveIn--;
        if (u.state.reviveIn <= 0) {
          const a = Math.random() * Math.PI * 2;
          let spot = { x: u.x + Math.cos(a) * 110, y: u.y + Math.sin(a) * 110 };
          if (b.blocked(P, spot.x, spot.y)) spot = b.randomFreeSpot?.(P.r, 20) || spot;
          P.x = spot.x; P.y = spot.y;
          P.hp = Math.round(P.maxHp * D.revive.ratio);
          P.state = {}; P.cd = {};
          R.AI[P.def.ai]?.init?.(b, P);
          b.joinOrder(P, u);
          b.say(`${u.name} 用紅線把 ${P.name} 拉了回來——「同生共死」`);
          b.emit({ type: "revive", unit: P, by: u });
          b.emit({ type: "sfx", sound: "sounds/youyan-grow.mp3" });
          await b.wait(0.6);
        } else b.emit({ type: "buff", unit: u, text: `${u.state.reviveIn} 回合後拉回${P.name}`, color: "#c40a1e" });
      }
      // 形影不離：皮肉靠著骨頭回血
      if (D.regen && P?.alive && R.dist(u.x, u.y, P.x, P.y) <= D.near && u.hp < u.maxHp) {
        const n = Math.round(u.maxHp * D.regen); u.hp = Math.min(u.maxHp, u.hp + n);
        b.say(`${u.name} 靠著 ${P.name}，傷口慢慢長了回來（+${n}）`);
        b.emit({ type: "heal", unit: u, amount: n });
      }
      // 紅線：骨和皮肉之間拉出一條紅線
      const T = D.thread;
      if (T && P?.alive && u.ap >= T.ap && b.player.alive) {
        const ang = Math.atan2(P.y - u.y, P.x - u.x), len = R.dist(u.x, u.y, P.x, P.y);
        b.enemySpend(u, T.ap);
        b.say(`${u.name} 和 ${P.name} 之間，拉出了一條紅線`);
        await b.telegraph(u, { shape: "rect", x: u.x, y: u.y, ang, length: len, width: T.width, reaction: T.reaction }, { base: T.base, sound: T.sound, label: T.name });
      }
      if (!u.alive || b.dead || b.phase === "over") return;
      await R.AI.captain.takeTurn(b, u);
    },
  };
})();
