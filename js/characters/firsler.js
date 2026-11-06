// 角色：弗爾斯勒
// 每個技能提供：
//   status(battle, unit) → { ready, cost, label, note, reason, aim }
//     aim.type：enemy（點敵人）/ point（點地面）/ direction（朝方向射）/ none（按下就用）
//   predict(battle, unit, arg) → 會打中哪些敵人（不改變任何東西；不合法就丟 ActionError）
//     有智力的敵人會在攻擊結算前看這個結果決定要不要閃避
//   use(battle, unit, arg) → 執行；不合法就丟 ActionError（行動點由 battle 扣）
(function () {
  const R = window.RPG;
  R.CHARACTERS = R.CHARACTERS || {};
  const err = (m) => { throw new R.ActionError(m); };
  const smokes = (b) => b.zones.filter((z) => z.type === "smoke");

  const C = {
    id: "firsler",
    name: "弗爾斯勒",
    color: "#c2477a",
    desc: "用煙霧配合弩箭的遠程角色。箭穿過煙霧會變強，累積行動後能把所有煙霧化成尖刺一次射出。",
    stats: { hp: 75, atk: 16, df: 5, spd: 12, ap: 6 },
    basic: "kick",
    ultimate: "burst",
    // HUD 位置：左小圈 / 中間大圈 / 右小圈
    hud: { left: "load", center: "burst", right: "smoke" },

    // 被動：站在煙霧團裡時隱蔽，受到攻擊有一定機率打空
    passive: {
      name: "隱於霧中",
      desc: "站在煙霧團中時進入隱蔽狀態，受到攻擊時 50% 判定為打空",
      chance: 0.5,
      evadeText: "隱於霧中，攻擊打空了！",
      evadeLabel: "隱蔽",
      active(b, u) { return smokes(b).some((z) => R.dist(z.x, z.y, u.x, u.y) <= z.r); },
      evade(b, u) { return this.active(b, u) ? this.chance : 0; },
      status(b, u) { return this.active(b, u) ? { text: "隱蔽中", on: true } : { text: "未隱蔽", on: false }; },
    },

    // 數值調整面板：[標籤, 技能 id 或 "passive", 欄位, 最小, 最大, 間距]
    tune: [
      ["隱蔽 打空機率", "passive", "chance", 0, 1, 0.05],
      ["箭 射程", "load", "range", 150, 800, 10],
      ["上膛 冷卻（次行動）", "load", "cooldown", 0, 8, 1],
      ["煙霧 施放距離", "smoke", "range", 60, 400, 10],
      ["煙霧 半徑", "smoke", "radius", 20, 140, 5],
      ["大招 行動點", "burst", "ap", 0, 6, 1],
      ["大招 尖刺寬度", "burst", "spikeWidth", 4, 60, 2],
    ],

    init(b, u) {
      u.state.loaded = false;
      u.charge = 0;                       // 大招開場沒有
    },

    // 行動點用完但還能免費射箭時，不要自動結束回合
    canActFree(b, u) {
      return u.state.loaded && !movedSinceLoad(u);
    },

    skills: {
      // ---------- 普攻 ----------
      kick: {
        name: "踢腿", slot: "普攻", sound: "sounds/firsler-kick.mp3",
        ap: 1, base: 10, range: 70,
        desc: "近距離，造成 10 × 攻擊力% 傷害",
        status(b, u) {
          return { ready: true, cost: this.ap, label: this.name, aim: { type: "enemy", range: this.range } };
        },
        predict(b, u, arg) {
          const t = arg.target;
          if (!t || !t.alive || t.team === u.team) err("請點選一個敵人");
          if (b.reach(u, t) > this.range) err("距離太遠");
          return [t];
        },
        use(b, u, arg) {
          const t = arg.target;
          u.facing = Math.atan2(t.y - u.y, t.x - u.x);
          b.say(`${u.name} 使用「踢腿」`);
          b.emit({ type: "sfx", sound: this.sound });
          if (b.reach(u, t) > this.range) {          // 目標閃開了
            b.say("……踢空了");
            b.emit({ type: "miss", x: t.x, y: t.y });
            return;
          }
          b.emit({ type: "kick", unit: u, target: t });
          b.damage(u, t, this.base);
        },
      },

      // ---------- Q 上膛 ----------
      load: {
        name: "上膛", slot: "Q", key: "q", sound: "sounds/firsler-load.mp3",
        ap: 1,
        base: 16, range: 420, smokeMult: 1.5,
        projectileSpeed: 900,               // 箭的飛行速度（畫面與敵人反應時間用）
        cooldown: 2,                        // 暫定：射箭後的冷卻（行動次數）
        desc: "花 1 點上膛。上膛後沒移動可以免費射箭，移動過要 1 點。箭 16 × 攻擊力%，穿過煙霧 ×1.5（不疊加）。射箭後冷卻",
        status(b, u) {
          if (u.state.loaded) {
            const moved = movedSinceLoad(u);
            return {
              ready: true, cost: moved ? 1 : 0, label: "射箭", note: moved ? "已移動" : "免費",
              aim: { type: "direction", range: this.range, preview: "arrow" },
            };
          }
          const cd = u.cd.load || 0;
          if (cd > 0) return { ready: false, cost: this.ap, label: this.name, note: `CD ${cd}`, reason: `冷卻中（還要 ${cd} 次行動）` };
          return { ready: true, cost: this.ap, label: this.name, aim: { type: "none" } };
        },
        // 射箭：朝指定方向，命中第一個敵人
        path(b, u, arg) {
          const dx0 = arg.x - u.x, dy0 = arg.y - u.y, L = Math.hypot(dx0, dy0);
          if (!(L > 1)) err("請點選射擊方向");
          const dx = dx0 / L, dy = dy0 / L;
          let hit = null, hitT = this.range;
          for (const e of b.enemies()) {
            const t = R.geo.rayCircle(u.x, u.y, dx, dy, e.x, e.y, e.r);
            if (t !== null && t < hitT) { hit = e; hitT = t; }
          }
          const to = { x: u.x + dx * hitT, y: u.y + dy * hitT };
          const boosted = smokes(b).some((z) => R.geo.pointSeg(z.x, z.y, u.x, u.y, to.x, to.y) <= z.r);
          return { hit, to, boosted, dx, dy };
        },
        predict(b, u, arg) {
          if (!u.state.loaded) return [];
          const p = this.path(b, u, arg);
          return p.hit ? [p.hit] : [];
        },
        use(b, u, arg) {
          if (!u.state.loaded) {
            u.state.loaded = true;
            u.state.loadPos = { x: u.x, y: u.y };
            b.say(`${u.name} 上膛了`);
            return;
          }
          const { hit, to, boosted, dx, dy } = this.path(b, u, arg);
          u.facing = Math.atan2(dy, dx);
          u.state.loaded = false;
          b.setCooldown(u, "load", this.cooldown);
          b.say(`${u.name} 射出箭矢${boosted ? "（穿過煙霧！）" : ""}`);
          b.emit({ type: "arrow", from: { x: u.x, y: u.y }, to, boosted, speed: this.projectileSpeed });
          b.emit({ type: "sfx", sound: this.sound });     // Q 的音效只在射箭時播放
          if (hit) b.damage(u, hit, this.base, boosted ? this.smokeMult : 1, boosted ? "（煙霧 ×1.5）" : "");
          else b.say("……箭沒有射中");
        },
      },

      // ---------- E 煙霧吐出 ----------
      smoke: {
        name: "煙霧吐出", slot: "E", key: "e", sound: "sounds/firsler-smoke.mp3",
        ap: 1, range: 160, radius: 60,      // 暫定：施放距離、煙霧大小
        duration: 3, max: 3, cooldown: 4,
        desc: "在身邊放一團煙霧，放下後持續 3 回合，最多 3 團。冷卻 4 次行動",
        status(b, u) {
          const cd = u.cd.smoke || 0;
          if (cd > 0) return { ready: false, cost: this.ap, label: this.name, note: `CD ${cd}`, reason: `冷卻中（還要 ${cd} 次行動）` };
          return { ready: true, cost: this.ap, label: this.name, note: `${smokes(b).length}/${this.max}`,
            aim: { type: "point", range: this.range, radius: this.radius, preview: "smoke" } };
        },
        use(b, u, arg) {
          if (!(R.dist(u.x, u.y, arg.x, arg.y) <= this.range + 0.5)) err("太遠了，只能放在身邊");
          const list = smokes(b);
          if (list.length >= this.max) {        // 超過上限：最舊的那團消失
            const old = list[0];
            b.zones = b.zones.filter((z) => z !== old);
            b.emit({ type: "zoneExpire", zones: [old] });
          }
          b.zones.push({
            id: "z" + Math.random().toString(36).slice(2, 8), type: "smoke", owner: u,
            x: arg.x, y: arg.y, r: this.radius, turnsLeft: this.duration,
          });
          b.setCooldown(u, "smoke", this.cooldown);
          b.say(`${u.name} 吐出一團煙霧`);
          b.emit({ type: "sfx", sound: this.sound });
        },
      },

      // ---------- W 大招 煙霧爆發 ----------
      burst: {
        name: "煙霧爆發", slot: "W", key: "w", sound: "sounds/firsler-burst.mp3",
        ultimate: true,
        ap: 2,                              // 暫定：原本沒有指定行動點消耗
        charge: 7, range: 520, base: 15, spikeWidth: 18,
        projectileSpeed: 1100,
        desc: "需要累積 7 次行動且場上有煙霧。所有煙霧化成尖刺射向指定點，穿透敵人。每命中一根尖刺造成 15 × 攻擊力%，被幾根打中就乘幾倍",
        status(b, u) {
          if (u.charge < this.charge) return { ready: false, cost: this.ap, label: this.name, note: `${u.charge}/${this.charge}`, reason: `還要 ${this.charge - u.charge} 次行動才能使用` };
          if (!smokes(b).length) return { ready: false, cost: this.ap, label: this.name, note: "沒有煙霧", reason: "場上至少要有一團煙霧" };
          return { ready: true, cost: this.ap, label: this.name, aim: { type: "point", range: this.range, radius: 14, preview: "spikes" } };
        },
        spikes(b, u, arg) {
          if (!(R.dist(u.x, u.y, arg.x, arg.y) <= this.range + 0.5)) err("太遠了");
          const target = { x: arg.x, y: arg.y };
          return smokes(b).map((z) => {
            const hits = b.enemies().filter((e) =>
              R.geo.pointSeg(e.x, e.y, z.x, z.y, target.x, target.y) <= e.r + this.spikeWidth / 2);
            return { from: { x: z.x, y: z.y }, to: target, hits };
          });
        },
        predict(b, u, arg) {
          return [...new Set(this.spikes(b, u, arg).flatMap((s) => s.hits))];
        },
        origins(b) { return smokes(b).map((z) => ({ x: z.x, y: z.y })); },   // 尖刺從煙霧射出
        use(b, u, arg) {
          const target = { x: arg.x, y: arg.y };
          const list = smokes(b);
          const spikes = this.spikes(b, u, arg);
          b.zones = b.zones.filter((z) => z.type !== "smoke");
          u.charge = 0;
          u.facing = Math.atan2(target.y - u.y, target.x - u.x);
          b.say(`${u.name} 發動「煙霧爆發」！${list.length} 根煙霧尖刺射出`);
          b.emit({ type: "spikes", spikes, consumed: list });
          b.emit({ type: "sfx", sound: this.sound });
          // 每個敵人依命中的尖刺數量結算一次：單根傷害 × 根數
          const count = new Map();
          for (const s of spikes) for (const e of s.hits) count.set(e, (count.get(e) || 0) + 1);
          if (!count.size) b.say("……尖刺沒有命中任何敵人");
          for (const [e, n] of count) if (e.alive) b.damage(u, e, this.base, n, `（命中 ${n} 根尖刺）`);
        },
      },
    },
  };

  function movedSinceLoad(u) {
    const p = u.state.loadPos;
    return !p || Math.hypot(u.x - p.x, u.y - p.y) > 0.5;
  }

  R.CHARACTERS[C.id] = C;
})();
