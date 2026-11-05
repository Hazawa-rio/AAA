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
  // 不會移動。每回合把 13 點行動點用完：
  //   1 點：揮動觸手（扇形，有預告）、矩陣電流（圓形，有預告）、核心射擊 1-2-1-2 光彈（沒預告）
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

      // 大招就緒就先放
      if (b.round >= u.state.ultReady && u.ap >= D.ult.ap) {
        await this.ultimate(b, u);
        u.state.ultReady = b.round + D.ult.every;
        if (ok()) await b.wait(b.cfg.aiDelay);
      }

      let last = null, guard = 0;
      while (u.ap > 0 && ok() && guard++ < 30) {
        const p = b.player;
        const dCore = R.dist(u.x, u.y, p.x, p.y);
        const opts = [];
        const add = (id, w) => { if (u.ap >= D[id].ap) opts.push([id, id === last ? w * 0.4 : w]); };
        if (dCore <= D.swipe.radius + 60) add("swipe", D.swipe.weight + 1);
        if (matrices().some((m) => R.dist(m.x, m.y, p.x, p.y) <= D.electric.radius + 90)) add("electric", D.electric.weight + 1);
        add("shot", D.shot.weight);
        add("laser", D.laser.weight);
        if (matrices().length) add("ring", D.ring.weight);
        if (!opts.length) break;

        let r = Math.random() * opts.reduce((a, o) => a + o[1], 0), pick = opts[0][0];
        for (const [id, w] of opts) { if ((r -= w) <= 0) { pick = id; break; } }
        last = pick;
        await this[pick](b, u);
        if (ok() && u.ap > 0) await b.wait(b.cfg.aiDelay * 0.6);
      }
    },

    // 從核心邊緣朝某方向的起點
    edge(u, ang, extra = 0) {
      return { x: u.x + Math.cos(ang) * (u.r + extra), y: u.y + Math.sin(ang) * (u.r + extra) };
    },
    aim(u, p) { return Math.atan2(p.y - u.y, p.x - u.x); },

    async swipe(b, u) {
      const S = u.def.swipe;
      b.enemySpend(u, S.ap);
      const ang = this.aim(u, b.player);
      b.say(`${u.name} 揚起觸手！`);
      await b.telegraph(u, { shape: "sector", x: u.x, y: u.y, ang, half: (S.half * Math.PI) / 180, radius: S.radius, reaction: u.def.reaction, kind: "tentacle" },
        { base: S.base, sound: u.def.sounds.tentacle, label: "觸手橫掃" });
    },

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
