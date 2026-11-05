// 敵人 AI。每種敵人一個 takeTurn(battle, unit)。
(function () {
  const R = window.RPG;
  R.AI = R.AI || {};

  // 史萊姆：低智力，只會在自己的回合把行動點全部用完（不會留點數）
  R.AI.slime = {
    async takeTurn(b, u) {
      const d0 = u.def;
      let guard = 0;
      while (u.ap > 0 && u.alive && !b.dead && b.phase !== "over" && guard++ < 12) {
        const p = b.player;
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
          b.shiftGroup(u, dx, dy);
          b.enemySpend(u, D.moveCost);
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
      const cost = u.def.moveCost * b.cfg.offTurnMultiplier;
      if (u.ap < cost) return;
      const src = info.src, ang0 = Math.atan2(u.y - src.y, u.x - src.x), R0 = b.moveRadius(u);
      const still = () => info.repredict().filter((h) => h === u || h.parent === u).length;
      for (const off of [Math.PI / 2, -Math.PI / 2, Math.PI / 3, -Math.PI / 3, (2 * Math.PI) / 3, (-2 * Math.PI) / 3, 0]) {
        for (const f of [1, 0.7, 0.45]) {
          const dx = Math.cos(ang0 + off) * R0 * f, dy = Math.sin(ang0 + off) * R0 * f;
          if (!b.canShiftGroup(u, dx, dy)) continue;
          b.shiftGroup(u, dx, dy);
          if (still() === 0) {
            u.ap -= cost;
            b.say(`${u.name} 消耗 ${cost} 點行動點閃避了攻擊！`);
            b.emit({ type: "move", unit: u });
            b.emit({ type: "enemyDodge", unit: u });
            return;
          }
          b.shiftGroup(u, -dx, -dy);
        }
      }
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
        { base: S.base, sound: u.def.sounds.tentacle, label: "觸手橫掃" });
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
        { base: E.base, sound: u.def.sounds.electric, label: `${m.name} 的電流` });
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
      b.say(`⚠ ${u.name} 發動「殲滅矩陣」！`);
      b.emit({ type: "bossUlt", unit: u });
      const ms = u.parts.filter((m) => m.alive);
      for (const m of ms) this.ringFrom(b, u, m, U.count, U.base);
      b.emit({ type: "pulse", units: ms });
      const a0 = this.aim(u, b.player);
      const dirs = [a0, a0 + (Math.PI * 2) / 3, a0 - (Math.PI * 2) / 3];
      await this.volley(b, u, dirs, U.waves, U.spread * 2, U.interval, U.base);
    },
  };
})();
