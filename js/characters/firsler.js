/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/characters/firsler.js": "20261113212359" });
// 角色：弗爾斯勒
// 每個技能提供：
//   status(battle, unit) → { ready, cost, label, note, reason, aim }
//     aim.type：enemy（點敵人）/ point（點地面）/ direction（朝方向射）/ none（按下就用）
//   predict(battle, unit, arg) → 會打中哪些敵人（不改變任何東西；不合法就丟 ActionError）
//     有智力的敵人會在攻擊結算前看這個結果決定要不要閃避
//   use(battle, unit, arg) → 執行；不合法就丟 ActionError（行動點由 battle 扣）
// 技能強化（成長系統）：u.upg = { q1, q2, e1, e2, w1 }，值是選到的選項 id
// tags：給之後的寶物系統用（projectile 投射物 / area 範圍），目前只顯示
(function () {
  const R = window.RPG;
  R.CHARACTERS = R.CHARACTERS || {};
  const err = (m) => { throw new R.ActionError(m); };
  const smokes = (b) => b.zones.filter((z) => z.type === "smoke");
  const upg = (u) => u.upg || {};
  const inSmoke = (b, x, y, pad = 0) => smokes(b).some((z) => R.dist(z.x, z.y, x, y) <= z.r + pad);

  // 射線碰到圓：進入與離開的距離（沒碰到回傳 null）
  function rayCircleSpan(ox, oy, dx, dy, cx, cy, r) {
    const fx = ox - cx, fy = oy - cy;
    const b = fx * dx + fy * dy, c = fx * fx + fy * fy - r * r, disc = b * b - c;
    if (disc < 0) return null;
    const s = Math.sqrt(disc), t0 = -b - s, t1 = -b + s;
    if (t1 < 0) return null;
    return { enter: Math.max(0, t0), exit: t1 };
  }
  // 從 (ox,oy) 沿方向前進，maxT 內最先碰到的敵人
  function firstHit(b, ox, oy, dx, dy, maxT) {
    let hit = null, hitT = maxT;
    for (const e of b.enemies()) {
      const t = R.geo.rayCircle(ox, oy, dx, dy, e.x, e.y, e.r);
      if (t !== null && t < hitT) { hit = e; hitT = t; }
    }
    return { hit, t: hitT };
  }
  // 線段（有寬度）會碰到的所有敵人
  const alongSeg = (b, ax, ay, bx, by, width) =>
    b.enemies().filter((e) => R.geo.pointSeg(e.x, e.y, ax, ay, bx, by) <= e.r + width / 2);

  const C = {
    id: "firsler",
    name: "弗爾斯勒",
    color: "#c2477a",
    profile: "外型嬌小的少女，透過菸斗吐出特殊的煙霧並加以操縱，個性傲慢任性，態度相當輕蔑，似乎甚麼都看不起，擅長暗殺，喜歡在煙霧中戲耍對手。",
    desc: "用煙霧配合弩箭的遠程角色。箭穿過煙霧會變強，累積行動後能把所有煙霧化成尖刺一次射出。",
    // 戰鬥風格：酒館名牌架上顯示
    style: { role: "遠程・弩箭與煙霧", text: "先放煙霧、再從遠處射箭的狙擊手。箭矢穿過煙霧會分裂或貫穿，煙霧裡的她也更難被打中；行動累積夠了，就把場上所有煙霧化成尖刺一口氣射出。擅長拉開距離、用煙霧控制戰場。" },
    stats: { hp: 75, mp: 0, atk: 16, df: 5, spd: 12, ap: 6 },
    // 每升一級增加的數值（暫定）
    growth: { hp: 3.5, mp: 2, atk: 0.9, df: 0.3, spd: 0.1 },
    // 地圖探索：普攻距離、Q（以秒冷卻）
    field: {
      basicRange: 80,
      q: { name: "射出箭矢", type: "arrow", sound: "sounds/firsler-load.mp3", cd: 30, range: 720, speed: 900, desc: "朝指定方向射出箭矢，射中遠處的魔物就以迎戰開始戰鬥（之後也能觸發機關）" },
    },
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
      active(b, u) { return inSmoke(b, u.x, u.y); },
      evade(b, u) { return this.active(b, u) ? this.chance : 0; },
      status(b, u) { return this.active(b, u) ? { text: "隱蔽中", on: true } : { text: "未隱蔽", on: false }; },
    },

    // 個性台詞：不會每次都跳（chance 是出現機率）
    barks: {
      shoot: { chance: 0.35, lines: ["哈哈，這下如何？"] },
      split: { chance: 0.7, lines: ["買一送一再送一！"] },
      pierce: { chance: 0.7, lines: ["哇阿，這一發可不得了阿。"] },
      smoke: { chance: 0.35, lines: ["哈阿（吐煙）"] },
      heal: { chance: 0.3, lines: ["感覺不錯。"] },
      ult: { chance: 0.7, lines: ["看老娘這招！"] },
      finale: { chance: 0.85, lines: ["老娘這就送你們上西天！"] },
    },

    // ===== 技能強化樹 =====
    // E、Q 各能強化兩次：第一次強化技能本身，第二次強化附加效果；W 一次。每次二選一
    upgrades: {
      q: {
        skill: "load",
        tiers: [
          [
            { id: "split", name: "分裂箭矢", desc: "箭矢穿過煙霧後，分裂成三支箭矢（每支都有煙霧加成）。同時命中同一個目標時合成一擊，每多中一支傷害再 +25%" },
            { id: "pierce", name: "穿雲之箭", desc: "箭矢穿過煙霧後獲得穿透，路線上的敵人全部命中，傷害提高到 ×2（特效更華麗）" },
          ],
          [
            { id: "guerrilla", name: "游擊作戰", desc: "射出箭矢後，下一個行動的速度 ×1.5（移動範圍變大）" },
            { id: "snipe", name: "遠處狙擊", desc: "上膛後沒有移動就射箭時，射程 ×1.5" },
          ],
        ],
      },
      e: {
        skill: "smoke",
        tiers: [
          [
            { id: "mend", name: "煙霾填補", desc: "自己站在煙霧內行動時，每次行動回復少量生命" },
            { id: "plague", name: "慘白瘟疫", desc: "敵人在煙霧內行動時，每次行動都會受到傷害" },
          ],
          [
            { id: "plume", name: "裊裊之煙", desc: "煙霧團上限 +1" },
            { id: "linger", name: "餘煙不息", desc: "煙霧持續回合 +1" },
          ],
        ],
      },
      w: {
        skill: "burst",
        tiers: [
          [
            { id: "dance", name: "迷煙亂舞", desc: "尖刺射程增加；撞到牆壁會反彈（沒有反彈預覽線），每次反彈多分裂出兩支不反彈的尖刺並延長射程，延長量逐次減少，最多反彈 3 次" },
            { id: "finale", name: "看老娘結束這一切", desc: "所有尖刺飛到自己面前，依尖刺數量射出一發極為強力的穿透飛箭" },
          ],
        ],
      },
    },

    // 數值調整面板：[標籤, 技能 id 或 "passive", 欄位, 最小, 最大, 間距]
    tune: [
      ["隱蔽 打空機率", "passive", "chance", 0, 1, 0.05],
      ["箭 射程", "load", "range", 150, 800, 10],
      ["上膛 冷卻（次行動）", "load", "cooldown", 0, 8, 1],
      ["分裂箭矢 分裂角度（°）", "load", "splitDeg", 3, 45, 1],
      ["分裂箭矢 每多中一支加成", "load", "splitStack", 0, 1, 0.05],
      ["穿雲之箭 傷害倍率", "load", "pierceMult", 1, 4, 0.1],
      ["游擊作戰 速度倍率", "load", "guerrillaMult", 1, 3, 0.1],
      ["遠處狙擊 射程倍率", "load", "snipeMult", 1, 3, 0.1],
      ["煙霧 施放距離", "smoke", "range", 60, 400, 10],
      ["煙霧 半徑", "smoke", "radius", 20, 140, 5],
      ["煙霾填補 每次回血", "smoke", "mendHeal", 0, 20, 1],
      ["慘白瘟疫 基礎傷害", "smoke", "plagueBase", 1, 30, 1],
      ["大招 行動點", "burst", "ap", 0, 6, 1],
      ["大招 尖刺寬度", "burst", "spikeWidth", 4, 60, 2],
      ["迷煙亂舞 延伸射程", "burst", "danceExtra", 0, 600, 10],
      ["看老娘 每根尖刺傷害", "burst", "finalePerSpike", 1, 60, 1],
    ],

    init(b, u) {
      u.state.loaded = false;
      u.charge = 0;                       // 大招開場沒有
    },

    // 行動點用完但還能免費射箭時，不要自動結束回合
    canActFree(b, u) {
      return u.state.loaded && !movedSinceLoad(u);
    },

    // 局內調整成長後：煙霧數量超過新上限時，最舊的消失
    onGrowth(b, u) {
      const max = this.skills.smoke.maxFor(u);
      let list = smokes(b);
      while (list.length > max) {
        const old = list[0];
        b.zones = b.zones.filter((z) => z !== old);
        b.emit({ type: "zoneExpire", zones: [old] });
        list = smokes(b);
      }
    },

    // 每次行動後（自己回合或應急行動都算）
    onAction(b, u, actionId) {
      // 游擊作戰：射箭後的「下一個」行動速度 ×1.5
      if (u.state.guerrillaNext) {
        u.state.guerrillaNext = false;
        u.state.speedBoost = this.skills.load.guerrillaMult;
        b.emit({ type: "buff", unit: u, text: "游擊作戰：速度提升" });
      } else if (u.state.speedBoost) {
        u.state.speedBoost = 0;
      }
      // 煙霾填補：在煙霧裡行動回血
      if (upg(u).e1 === "mend" && inSmoke(b, u.x, u.y) && b.heal(u, this.skills.smoke.mendHeal, "（煙霾填補）") > 0) b.bark(u, "heal");
    },

    // 敵人每次行動時
    onEnemyAction(b, e, from) {
      // 慘白瘟疫：敵人在煙霧裡行動會受到傷害（移動時起點或終點在煙霧裡都算）
      if (upg(b.player).e1 !== "plague" || !e.alive) return;
      if (inSmoke(b, e.x, e.y, e.r * 0.5) || (from && inSmoke(b, from.x, from.y, e.r * 0.5))) {
        b.emit({ type: "plague", unit: e });
        b.damage(b.player, e, this.skills.smoke.plagueBase, 1, "（慘白瘟疫）");
      }
    },

    skills: {
      // ---------- 普攻 ----------
      kick: {
        name: "踢腿", slot: "普攻", key: "a", sound: "sounds/firsler-kick.mp3",
        ap: 1, base: 10, range: 70, size: 56,
        desc: "朝前方踢出，打到面前一小塊方形範圍內的敵人，造成 10 × 攻擊力% 傷害。點敵人直接踢，按 A 可以朝任何方向踢",
        status(b, u) {
          return { ready: true, cost: this.ap, label: this.name, aim: { type: "enemy", range: this.range, free: true } };
        },
        // 方形範圍：面前的一塊正方形（中心在身體前方）
        box(u, arg) {
          const t = arg.target ? arg.target : arg;
          if (!t || !Number.isFinite(t.x)) err("請點選敵人或方向");
          const ang = Math.atan2(t.y - u.y, t.x - u.x);
          return { shape: "rect", x: u.x + Math.cos(ang) * (u.r - 6), y: u.y + Math.sin(ang) * (u.r - 6), ang, length: this.size, width: this.size };
        },
        hits(b, u, box) { return b.targetsFor(u).filter((e) => R.geo.inRect(e.x, e.y, box, e.r * 0.8)); },
        predict(b, u, arg) {
          const t = arg.target;
          if (t && (!t.alive || t.team === u.team)) err("請點選一個敵人");
          if (t && b.reach(u, t) > this.range) err("距離太遠");
          return this.hits(b, u, this.box(u, arg));
        },
        preview(b, u, arg) { const box = this.box(u, arg); return { shapes: [box], hits: this.hits(b, u, box) }; },
        use(b, u, arg) {
          const box = this.box(u, arg);
          u.facing = box.ang;
          b.say(`${u.name} 使用「踢腿」`);
          b.emit({ type: "sfx", sound: this.sound });
          b.emit({ type: "fxShape", shape: box, color: "#c2477a", dur: 320 });
          const hits = this.hits(b, u, box);
          if (!hits.length) {
            b.say("……踢空了");
            b.emit({ type: "miss", x: box.x + Math.cos(box.ang) * this.size / 2, y: box.y + Math.sin(box.ang) * this.size / 2 });
            return;
          }
          for (const t of hits) { b.emit({ type: "kick", unit: u, target: t }); b.damage(u, t, this.base); }
        },
      },

      // ---------- Q 上膛 ----------
      load: {
        name: "上膛", slot: "Q", key: "q", sound: "sounds/firsler-load.mp3",
        tags: ["projectile"],
        ap: 1,
        base: 16, range: 420, smokeMult: 1.5,
        projectileSpeed: 900,               // 箭的飛行速度（畫面與敵人反應時間用）
        cooldown: 2,                        // 暫定：射箭後的冷卻（行動次數）
        // 強化數值（暫定）
        splitDeg: 15, pierceMult: 2, guerrillaMult: 1.5, snipeMult: 1.5,
        splitStack: 0.25,                   // 分裂箭：同一個目標每多中一支，總傷害再 +25%
        desc: "花 1 點上膛。上膛後沒移動可以免費射箭，移動過要 1 點。箭 16 × 攻擊力%，穿過煙霧 ×1.5（不疊加）。射箭後冷卻",
        status(b, u) {
          if (u.state.loaded) {
            const moved = movedSinceLoad(u);
            return {
              ready: true, cost: moved ? 1 : 0, label: "射箭", note: moved ? "已移動" : "免費",
              aim: { type: "direction", range: this.rangeFor(u), preview: "arrow" },
            };
          }
          const cd = u.cd.load || 0;
          if (cd > 0) return { ready: false, cost: this.ap, label: this.name, note: `CD ${cd}`, reason: `冷卻中（還要 ${cd} 次行動）` };
          return { ready: true, cost: this.ap, label: this.name, aim: { type: "none" } };
        },
        // 遠處狙擊：沒移動就射，射程變長
        rangeFor(u) {
          return this.range * (upg(u).q2 === "snipe" && !movedSinceLoad(u) ? this.snipeMult : 1);
        },
        // 箭的路線。回傳 arrows：每支箭的起點、終點、命中（含倍率）、延遲（分裂箭要等主箭飛到）
        path(b, u, arg) {
          const dx0 = arg.x - u.x, dy0 = arg.y - u.y, L = Math.hypot(dx0, dy0);
          if (!(L > 1)) err("請點選射擊方向");
          const dx = dx0 / L, dy = dy0 / L, range = this.rangeFor(u), q1 = upg(u).q1;
          const from = { x: u.x, y: u.y };
          const h = firstHit(b, u.x, u.y, dx, dy, range);
          // 最先進入的煙霧
          let sm = null;
          for (const z of smokes(b)) {
            const span = rayCircleSpan(u.x, u.y, dx, dy, z.x, z.y, z.r);
            if (span && span.enter < range && (!sm || span.enter < sm.enter)) sm = span;
          }
          const at = (t) => ({ x: u.x + dx * t, y: u.y + dy * t });
          const arrows = [];
          const passedBeforeHit = sm && sm.enter < h.t;

          if (q1 === "split" && passedBeforeHit && h.t > sm.exit) {
            // 分裂箭矢：在煙霧另一側分成三支，每支都算穿過煙霧
            const E = at(sm.exit), left = range - sm.exit, rad = (this.splitDeg * Math.PI) / 180;
            arrows.push({ from, to: E, hits: [], boosted: true });
            for (const off of [0, -rad, rad]) {
              const a = Math.atan2(dy, dx) + off, ddx = Math.cos(a), ddy = Math.sin(a);
              const hh = firstHit(b, E.x, E.y, ddx, ddy, left);
              arrows.push({
                from: E, to: { x: E.x + ddx * hh.t, y: E.y + ddy * hh.t }, boosted: true, split: true, delayDist: sm.exit,
                hits: hh.hit ? [{ unit: hh.hit, mult: this.smokeMult, note: "（分裂箭・煙霧 ×1.5）" }] : [],
              });
            }
          } else if (q1 === "pierce" && passedBeforeHit) {
            // 穿雲之箭：進入煙霧後穿透，射程內路線上的敵人全部命中
            const hits = b.enemies()
              .map((e) => ({ e, t: R.geo.rayCircle(u.x, u.y, dx, dy, e.x, e.y, e.r) }))
              .filter((o) => o.t !== null && o.t <= range)
              .sort((a, c) => a.t - c.t)
              .map((o) => ({ unit: o.e, mult: this.pierceMult, note: `（穿雲之箭 ×${this.pierceMult}）` }));
            arrows.push({ from, to: at(range), boosted: true, pierce: true, hits });
          } else {
            // 一般的箭：命中第一個敵人，路線穿過煙霧 ×1.5
            const to = at(h.t);
            const boosted = smokes(b).some((z) => R.geo.pointSeg(z.x, z.y, u.x, u.y, to.x, to.y) <= z.r);
            arrows.push({
              from, to, boosted,
              hits: h.hit ? [{ unit: h.hit, mult: boosted ? this.smokeMult : 1, note: boosted ? "（煙霧 ×1.5）" : "" }] : [],
            });
          }
          return { arrows, dx, dy, range };
        },
        // 分裂箭同時命中同一個目標：合成一次傷害，支數越多倍率越高
        mergeHits(arrows) {
          const out = [], split = new Map();
          for (const a of arrows) for (const h of a.hits) {
            if (!a.split) { out.push(h); continue; }
            split.set(h.unit, (split.get(h.unit) || 0) + 1);
          }
          for (const [unit, n] of split) {
            const mult = this.smokeMult * n * (1 + this.splitStack * (n - 1));
            out.push({ unit, mult, n, note: n > 1 ? `（分裂箭 ${n} 支同時命中 ×${mult.toFixed(2)}）` : "（分裂箭・煙霧 ×1.5）" });
          }
          return out;
        },
        predict(b, u, arg) {
          if (!u.state.loaded) return [];
          return [...new Set(this.path(b, u, arg).arrows.flatMap((a) => a.hits.map((h) => h.unit)))];
        },
        use(b, u, arg) {
          if (!u.state.loaded) {
            u.state.loaded = true;
            u.state.loadPos = { x: u.x, y: u.y };
            b.say(`${u.name} 上膛了`);
            return;
          }
          const { arrows, dx, dy } = this.path(b, u, arg);
          const up = upg(u);
          u.facing = Math.atan2(dy, dx);
          u.state.loaded = false;
          b.setCooldown(u, "load", this.cooldown);
          const boosted = arrows.some((a) => a.boosted);
          const kind = arrows.some((a) => a.pierce) ? "穿雲之箭！" : arrows.some((a) => a.split) ? "箭矢分裂成三支！" : boosted ? "（穿過煙霧！）" : "";
          b.say(`${u.name} 射出箭矢${kind}`);
          b.emit({ type: "arrow", arrows, speed: this.projectileSpeed });
          b.emit({ type: "sfx", sound: this.sound });     // Q 的音效只在射箭時播放
          b.bark(u, arrows.some((a) => a.pierce) ? "pierce" : arrows.some((a) => a.split) ? "split" : "shoot");
          let any = false;
          for (const h of this.mergeHits(arrows)) if (h.unit.alive) { any = true; b.damage(u, h.unit, this.base, h.mult, h.note); }
          if (!any) b.say("……箭沒有射中");
          if (up.q2 === "guerrilla") u.state.guerrillaNext = true;   // 下一個行動速度 ×1.5
        },
      },

      // ---------- E 煙霧吐出 ----------
      smoke: {
        name: "煙霧吐出", slot: "E", key: "e", sound: "sounds/firsler-smoke.mp3",
        tags: ["area"],
        ap: 1, range: 160, radius: 60,      // 暫定：施放距離、煙霧大小
        duration: 3, max: 3, cooldown: 4,
        mendHeal: 4, plagueBase: 6,         // 強化數值（暫定）
        desc: "在身邊放一團煙霧，放下後持續 3 回合，最多 3 團。冷卻 4 次行動",
        maxFor(u) { return this.max + (upg(u).e2 === "plume" ? 1 : 0); },
        durationFor(u) { return this.duration + (upg(u).e2 === "linger" ? 1 : 0); },
        status(b, u) {
          const cd = u.cd.smoke || 0;
          if (cd > 0) return { ready: false, cost: this.ap, label: this.name, note: `CD ${cd}`, reason: `冷卻中（還要 ${cd} 次行動）` };
          return { ready: true, cost: this.ap, label: this.name, note: `${smokes(b).length}/${this.maxFor(u)}`,
            aim: { type: "point", range: this.range, radius: this.radius, preview: "smoke", max: this.maxFor(u) } };
        },
        use(b, u, arg) {
          if (!(R.dist(u.x, u.y, arg.x, arg.y) <= this.range + 0.5)) err("太遠了，只能放在身邊");
          const list = smokes(b);
          if (list.length >= this.maxFor(u)) {        // 超過上限：最舊的那團消失
            const old = list[0];
            b.zones = b.zones.filter((z) => z !== old);
            b.emit({ type: "zoneExpire", zones: [old] });
          }
          b.zones.push({
            id: "z" + Math.random().toString(36).slice(2, 8), type: "smoke", owner: u,
            x: arg.x, y: arg.y, r: this.radius, turnsLeft: this.durationFor(u),
          });
          b.setCooldown(u, "smoke", this.cooldown);
          b.say(`${u.name} 吐出一團煙霧`);
          b.bark(u, "smoke");
          b.emit({ type: "sfx", sound: this.sound });
        },
      },

      // ---------- W 大招 煙霧爆發 ----------
      burst: {
        name: "煙霧爆發", slot: "W", key: "w", sound: "sounds/firsler-burst.mp3",
        tags: ["projectile"],
        ultimate: true,
        ap: 2,                              // 暫定：原本沒有指定行動點消耗
        charge: 7, range: 520, base: 15, spikeWidth: 18,
        projectileSpeed: 1100,
        // 強化數值（暫定）
        danceExtra: 260,                    // 迷煙亂舞：尖刺穿過目標點後再飛多遠
        danceBounceExt: [220, 150, 80],     // 每次反彈延長的射程（逐次減少）
        danceSideDeg: 22,                   // 反彈時分裂出的兩支尖刺的角度
        finalePerSpike: 22,                 // 看老娘結束這一切：每根尖刺給飛箭的基礎傷害
        finaleWidth: 40,
        desc: "需要累積 7 次行動且場上有煙霧。所有煙霧化成尖刺射向指定點，穿透敵人。每命中一根尖刺造成 15 × 攻擊力%，被幾根打中就乘幾倍",
        status(b, u) {
          if (u.charge < this.charge) return { ready: false, cost: this.ap, label: this.name, note: `${u.charge}/${this.charge}`, reason: `還要 ${this.charge - u.charge} 次行動才能使用` };
          if (!smokes(b).length) return { ready: false, cost: this.ap, label: this.name, note: "沒有煙霧", reason: "場上至少要有一團煙霧" };
          const preview = upg(u).w1 === "finale" ? "finale" : "spikes";
          return { ready: true, cost: this.ap, label: this.name, aim: { type: "point", range: this.range, radius: 14, preview } };
        },
        // 每根尖刺：points（折線）、hits、delayDist（從開始到出發飛了多遠，用來排動畫）
        spikes(b, u, arg) {
          if (!(R.dist(u.x, u.y, arg.x, arg.y) <= this.range + 0.5)) err("太遠了");
          const target = { x: arg.x, y: arg.y };
          if (upg(u).w1 === "dance") return smokes(b).flatMap((z) => this.danceSpike(b, z, target));
          return smokes(b).map((z) => ({
            points: [{ x: z.x, y: z.y }, target],
            hits: alongSeg(b, z.x, z.y, target.x, target.y, this.spikeWidth), delayDist: 0,
          }));
        },
        // 迷煙亂舞：從煙霧射向目標點並繼續飛，撞牆反彈
        danceSpike(b, z, target) {
          const A = b.cfg.arena, W = this.spikeWidth;
          let x = z.x, y = z.y;
          let dx = target.x - z.x, dy = target.y - z.y;
          const L0 = Math.hypot(dx, dy) || 1;
          dx /= L0; dy /= L0;
          let left = L0 + this.danceExtra, bounces = 0, traveled = 0;
          const main = { points: [{ x, y }], hits: new Set(), delayDist: 0 };
          const out = [main];
          // 走到牆或用完射程；回傳走了多遠、有沒有撞牆
          const travel = (x0, y0, ddx, ddy, maxL) => {
            let t = maxL, wall = null;
            if (ddx > 1e-9) { const tw = (A.w - x0) / ddx; if (tw < t) { t = tw; wall = "x"; } }
            if (ddx < -1e-9) { const tw = -x0 / ddx; if (tw < t) { t = tw; wall = "x"; } }
            if (ddy > 1e-9) { const tw = (A.h - y0) / ddy; if (tw < t) { t = tw; wall = "y"; } }
            if (ddy < -1e-9) { const tw = -y0 / ddy; if (tw < t) { t = tw; wall = "y"; } }
            return { t: Math.max(0, t), wall };
          };
          for (let guard = 0; guard < 8 && left > 1; guard++) {
            const step = travel(x, y, dx, dy, left);
            const nx = x + dx * step.t, ny = y + dy * step.t;
            for (const e of alongSeg(b, x, y, nx, ny, W)) main.hits.add(e);
            main.points.push({ x: nx, y: ny });
            traveled += step.t; left -= step.t; x = nx; y = ny;
            if (!step.wall || left <= 1) break;
            if (bounces >= this.danceBounceExt.length) break;    // 最多反彈 3 次，第 4 次撞牆就停
            // 反彈：方向鏡射，延長射程，並分裂出兩支不反彈的尖刺
            if (step.wall === "x") dx = -dx; else dy = -dy;
            const ext = this.danceBounceExt[bounces];
            bounces++;
            left += ext;
            const rad = (this.danceSideDeg * Math.PI) / 180, base = Math.atan2(dy, dx);
            for (const off of [-rad, rad]) {
              const a = base + off, sdx = Math.cos(a), sdy = Math.sin(a);
              const st = travel(x, y, sdx, sdy, ext);
              const ex = x + sdx * st.t, ey = y + sdy * st.t;
              out.push({ points: [{ x, y }, { x: ex, y: ey }], hits: new Set(alongSeg(b, x, y, ex, ey, W)), delayDist: traveled, side: true });
            }
          }
          return out.map((s) => ({ ...s, hits: [...s.hits] }));
        },
        // 看老娘結束這一切：尖刺聚到面前，射出一發穿透飛箭
        finalePath(b, u, arg) {
          if (!(R.dist(u.x, u.y, arg.x, arg.y) <= this.range + 0.5)) err("太遠了");
          const a = Math.atan2(arg.y - u.y, arg.x - u.x), dx = Math.cos(a), dy = Math.sin(a);
          const F = { x: u.x + dx * 40, y: u.y + dy * 40 };
          const A = b.cfg.arena;
          let t = 3000;
          if (dx > 1e-9) t = Math.min(t, (A.w - F.x) / dx);
          if (dx < -1e-9) t = Math.min(t, -F.x / dx);
          if (dy > 1e-9) t = Math.min(t, (A.h - F.y) / dy);
          if (dy < -1e-9) t = Math.min(t, -F.y / dy);
          const end = { x: F.x + dx * t, y: F.y + dy * t };
          return { F, end, ang: a, hits: alongSeg(b, F.x, F.y, end.x, end.y, this.finaleWidth), count: smokes(b).length };
        },
        predict(b, u, arg) {
          if (upg(u).w1 === "finale") return this.finalePath(b, u, arg).hits;
          return [...new Set(this.spikes(b, u, arg).flatMap((s) => s.hits))];
        },
        origins(b, u) { return upg(u).w1 === "finale" ? [{ x: u.x, y: u.y }] : smokes(b).map((z) => ({ x: z.x, y: z.y })); },
        use(b, u, arg) {
          const target = { x: arg.x, y: arg.y };
          const list = smokes(b);
          u.facing = Math.atan2(target.y - u.y, target.x - u.x);

          if (upg(u).w1 === "finale") {
            const fp = this.finalePath(b, u, arg);
            b.zones = b.zones.filter((z) => z.type !== "smoke");
            u.charge = 0;
            b.say(`${u.name} 發動「看老娘結束這一切」！${fp.count} 根尖刺凝聚成一發飛箭`);
            b.bark(u, "ult");
            b.bark(u, "finale", 0.75);           // 飛箭射出的時候
            b.emit({ type: "spikes", spikes: list.map((z) => ({ points: [{ x: z.x, y: z.y }, fp.F], delayDist: 0 })), consumed: list, speed: this.projectileSpeed });
            b.emit({ type: "finale", from: fp.F, to: fp.end, width: this.finaleWidth, count: fp.count });
            b.emit({ type: "sfx", sound: this.sound });
            const base = this.finalePerSpike * fp.count;
            if (!fp.hits.length) b.say("……飛箭沒有命中");
            for (const e of fp.hits) if (e.alive) b.damage(u, e, base, 1, `（${fp.count} 根尖刺的飛箭）`);
            return;
          }

          const spikes = this.spikes(b, u, arg);
          b.zones = b.zones.filter((z) => z.type !== "smoke");
          u.charge = 0;
          const extra = spikes.filter((s) => s.side).length;
          b.bark(u, "ult");
          b.say(`${u.name} 發動「煙霧爆發」！${list.length} 根煙霧尖刺射出${extra ? `，反彈分裂出 ${extra} 根` : ""}`);
          b.emit({ type: "spikes", spikes, consumed: list, speed: this.projectileSpeed });
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
