/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/characters/hoffman.js": "20261113212359" });
// 角色：霍夫曼（怪鼠機關屋的主人）
// 被動「時間壓縮」：回合結束時消耗所有剩下的行動點存起來（最多 5）；滿了也照樣消耗
// 大招「壓縮加速機」：把存起來的行動點換回來，展開齒輪領域，普攻變成在領域裡直線來回撞擊
// 數值都是暫定
(function () {
  const R = window.RPG;
  R.CHARACTERS = R.CHARACTERS || {};
  const err = (m) => { throw new R.ActionError(m); };
  const alive = (b) => !b.dead && b.phase !== "over";
  const DEG = Math.PI / 180;
  const dirOf = (u, arg) => {
    const t = arg.target ? arg.target : arg;
    if (!t || !Number.isFinite(t.x)) err("請點選方向");
    const L = Math.hypot(t.x - u.x, t.y - u.y);
    if (L < 1) err("請點選方向");
    return { dx: (t.x - u.x) / L, dy: (t.y - u.y) / L, ang: Math.atan2(t.y - u.y, t.x - u.x) };
  };
  const upg = (u) => u.upg || {};
  const domainOf = (b, u) => b.zones.find((z) => z.type === "gearField" && z.owner === u) || null;
  // 沿著 from→to 找最後一個能站的位置（可以穿過其他單位）
  function landing(b, u, from, to) {
    const A = b.cfg.arena, D = R.dist(from.x, from.y, to.x, to.y);
    for (let s = D; s >= 0; s -= 6) {
      const k = D ? s / D : 0;
      const x = Math.min(Math.max(from.x + (to.x - from.x) * k, u.r), A.w - u.r), y = Math.min(Math.max(from.y + (to.y - from.y) * k, u.r), A.h - u.r);
      if (!b.blocked(u, x, y)) return { x, y };
    }
    return { x: u.x, y: u.y };
  }

  const C = {
    id: "hoffman",
    name: "霍夫曼",
    letter: "霍",
    color: "#a8784e",
    drawScale: 1.22,
    role: "近戰・機關",
    gacha: true,
    profile: "怪鼠機關屋的主人，沉著冷靜經驗老道，帶著許多特製的發明，其中最強悍的技術便是時空緻密技術，能夠壓縮自己的時間實現超高速行動。",
    desc: "機關屋的主人。回合結束時把剩下的行動點壓縮存起來，用壓縮加速機一口氣換回來，在齒輪領域裡以亞光速來回撞擊。",
    // 戰鬥風格：酒館名牌架上顯示
    style: { role: "突進・時間壓縮", text: "把時間壓縮來用的機關屋主人。回合結束時把沒用完的行動點存起來，用壓縮加速機一口氣換回來，在齒輪領域裡以亞光速來回撞擊。方塊大、容易被打中，要算好爆發的時機。" },
    stats: { hp: 95, mp: 0, atk: 16, df: 8, spd: 9, ap: 6 },          // 暫定
    growth: { hp: 4.2, mp: 2, atk: 0.85, df: 0.45, spd: 0.08 },
    field: {
      basicRange: 90,
      q: { name: "噴氣裝置", type: "jet", sound: "sounds/hoffman-jet.mp3", cd: 20, dist: 170,
        desc: "朝指定方向短距離噴射位移，可以跨過特定的矮牆" },
    },
    basic: "wrench",
    ultimate: "compress",
    hud: { left: "jet", center: "compress", right: "gear" },
    // 個性台詞（沉著、老練的發明家）
    barks: {
      jet: { chance: 0.35, lines: ["壓力正常。", "噴嘴角度，沒問題。"] },
      gear: { chance: 0.35, lines: ["去吧。記得回來。", "第三號齒輪，出發。"] },
      compress: { chance: 0.6, lines: ["多出來的時間，我收下了。", "不急。時間這種東西，存著總有用處。"] },
      ult: { chance: 0.8, lines: ["時空緻密，啟動。", "接下來的幾秒鐘——由我說了算。"] },
      dash: { chance: 0.12, lines: ["太慢了。", "跟上。"] },
      hurt: { chance: 0.25, lines: ["嗯，外殼還撐得住。", "記下來，下次加厚。"] },
    },
    // 強化直接加的數值
    upgradeStats: { heavy: { df: 7 } },
    // ===== 技能強化樹 =====
    upgrades: {
      q: {
        skill: "jet",
        tiers: [
          [
            { id: "steam", name: "灼熱蒸汽", desc: "噴氣位移時噴出蒸氣，路線附近的敵人受到傷害" },
            { id: "pump", name: "時間泵動", desc: "有壓縮的時間時，消耗 1 層讓噴射距離 ×1.6，而且可以跳出聖牢籠" },
          ],
          [
            { id: "light", name: "輕量設施", desc: "噴氣裝置冷卻 −1" },
            { id: "heavy", name: "重型設施", desc: "防禦 +7" },
          ],
        ],
      },
      e: {
        skill: "gear",
        tiers: [
          [
            { id: "spin", name: "持續運轉", desc: "飛盤飛回來時，把回程打到的敵人擊退一小段距離" },
            { id: "hard", name: "堅硬齒輪", desc: "飛盤不再飛回來，但傷害 ×1.6" },
          ],
          [
            { id: "jetDisc", name: "蒸氣噴射", desc: "飛盤射程 ×1.35" },
            { id: "steel", name: "鋼鐵改造", desc: "飛盤變大（打擊範圍 ×1.6）" },
          ],
        ],
      },
      w: {
        skill: "compress",
        tiers: [
          [
            { id: "shuttle", name: "超壓縮穿梭", desc: "領域 ×1.3。左右兩邊的邊緣出現 0.77 秒前和 0.66 秒後的霍夫曼，跟著一起移動，亞光速撞擊時一起撞（傷害 ×0.6），和領域一起消失" },
            { id: "suppress", name: "超光速制壓", desc: "大招不再能亞光速撞擊：在領域內高速移動，把領域外一定範圍的敵人吸進領域，接著躍起下砸，消耗所有行動點，每點都增加傷害" },
          ],
        ],
      },
    },

    passive: {
      name: "時間壓縮",
      desc: "回合結束後消耗所有剩下的行動點存起來（最多存 5 點；存滿了也照樣消耗）",
      max: 5,
      status(b, u) { const n = u.state.stored || 0; return { text: `已壓縮 ${n} / ${this.max}`, on: n > 0 }; },
    },
    init(b, u) { u.state.stored = 0; },
    onTurnEnd(b, u) {
      const left = u.ap;
      if (left > 0) {
        const before = u.state.stored || 0;
        u.state.stored = Math.min(this.passive.max, before + left);
        u.ap = 0;
        b.say(`時間壓縮：消耗剩下的 ${left} 點行動點（已壓縮 ${u.state.stored} / ${this.passive.max}${u.state.stored - before < left ? "，存滿了" : ""}）`);
        b.emit({ type: "buff", unit: u, text: `壓縮 +${u.state.stored - before}`, color: "#2f6fd6" });
        if (u.state.stored > before) b.bark(u, "compress");
      }
      this.endDomain(b, u);
    },
    onAction(b, u) { if (u.ap <= 0 && !u.state.suppressing) this.endDomain(b, u); },
    // 亞光速撞擊（含超壓縮穿梭的分身一起撞）不能充能大招
    noCharge(b, u, id) { return id === "wrench" && !!domainOf(b, u) && upg(u).w1 !== "suppress"; },
    canActFree(b, u) { return !!u.state.suppressing; },      // 演出結束前不要自動結束回合
    endDomain(b, u) {
      const z = domainOf(b, u);
      if (!z) return;
      b.zones = b.zones.filter((x) => x !== z);
      u.state.clones = null;
      b.say("齒輪領域消失了");
      b.emit({ type: "zoneExpire", zones: [] });
    },

    tune: [
      ["時間壓縮 上限", "passive", "max", 1, 10, 1],
      ["變形扳手 半徑", "wrench", "radius", 40, 200, 5],
      ["變形扳手 傷害", "wrench", "base", 1, 40, 1],
      ["亞光速撞擊 傷害", "wrench", "dashBase", 1, 40, 1],
      ["噴氣裝置 距離", "jet", "dash", 50, 400, 10],
      ["齒輪飛盤 射程", "gear", "range", 100, 600, 10],
      ["齒輪飛盤 傷害", "gear", "base", 1, 40, 1],
      ["齒輪飛盤 停留（秒）", "gear", "hover", 0, 4, 0.1],
      ["壓縮加速機 領域半徑", "compress", "radius", 100, 500, 10],
    ],

    skills: {
      // ---------- 普攻 變形扳手（領域中：亞光速撞擊） ----------
      wrench: {
        name: "變形扳手", slot: "普攻", key: "a", sound: "sounds/hoffman-wrench.mp3", dashSound: "sounds/hoffman-jet.mp3",
        tags: ["melee"],
        ap: 1, radius: 95, halfDeg: 50, base: 12, dashBase: 14, dashWidth: 50,
        desc: "朝前方揮動扳手，打到小範圍扇形內的敵人。壓縮加速機的領域中變成「亞光速撞擊」：直線撞到領域邊緣，路上的敵人都會被撞到",
        status(b, u) {
          if (domainOf(b, u) && upg(u).w1 !== "suppress") return { ready: true, cost: this.ap, label: "亞光速撞擊", note: "領域中", aim: { type: "direction" } };
          return { ready: true, cost: this.ap, label: this.name, aim: { type: "enemy", range: this.radius, free: true, sector: { radius: this.radius, half: this.halfDeg * DEG } } };
        },
        sector(u, arg) { const d = dirOf(u, arg); return { shape: "sector", x: u.x, y: u.y, ang: d.ang, half: this.halfDeg * DEG, radius: this.radius }; },
        // 亞光速撞擊：從自己沿方向撞到領域邊緣
        dashPath(b, u, arg) {
          const z = domainOf(b, u), d = dirOf(u, arg);
          const fx = u.x - z.x, fy = u.y - z.y, bq = fx * d.dx + fy * d.dy, c = fx * fx + fy * fy - (z.r - u.r) * (z.r - u.r);
          const t = -bq + Math.sqrt(Math.max(0, bq * bq - c));
          if (!(t > 20)) err("已經在領域邊緣了，往領域裡面撞");
          const to = landing(b, u, { x: u.x, y: u.y }, { x: u.x + d.dx * t, y: u.y + d.dy * t });
          const hits = b.targetsFor(u).filter((e) => R.geo.pointSeg(e.x, e.y, u.x, u.y, u.x + d.dx * t, u.y + d.dy * t) <= e.r + this.dashWidth / 2);
          return { d, to, end: { x: u.x + d.dx * t, y: u.y + d.dy * t }, hits };
        },
        predict(b, u, arg) {
          if (domainOf(b, u) && upg(u).w1 !== "suppress") return this.dashPath(b, u, arg).hits;
          const t = arg.target;
          if (t && (!t.alive || t.team === u.team)) err("請點選一個敵人");
          if (t && b.reach(u, t) > this.radius) err("距離太遠");
          const sec = this.sector(u, arg);
          return b.targetsFor(u).filter((e) => R.geo.inSector(e.x, e.y, sec, e.r));
        },
        preview(b, u, arg) {
          if (domainOf(b, u) && upg(u).w1 !== "suppress") {
            const p = this.dashPath(b, u, arg);
            return { shapes: [{ shape: "line", x1: u.x, y1: u.y, x2: p.end.x, y2: p.end.y, width: this.dashWidth, color: "#2f6fd6" }, { shape: "circle", x: p.to.x, y: p.to.y, radius: u.r, color: "#2f6fd6" }], hits: p.hits };
          }
          return { shapes: [this.sector(u, arg)], hits: this.predict(b, u, arg) };
        },
        use(b, u, arg) {
          if (domainOf(b, u) && upg(u).w1 !== "suppress") {
            const p = this.dashPath(b, u, arg), from = { x: u.x, y: u.y };
            u.facing = p.d.ang;
            b.say(`${u.name} 亞光速撞擊！`);
            b.emit({ type: "sfx", sound: this.dashSound });
            b.emit({ type: "afterimage", from, to: p.to });
            u.x = p.to.x; u.y = p.to.y;
            b.emit({ type: "leap", unit: u, from, to: p.to, duration: 0.12 });
            b.bark(u, "dash");
            const hitSet = new Set(p.hits);
            for (const e of p.hits) if (e.alive) b.damage(u, e, this.dashBase, 1, "（亞光速）");
            // 超壓縮穿梭：0.77 秒前和 0.66 秒後的自己跟著一起撞
            for (const cl of u.state.clones || []) {
              const a = { x: from.x + cl.dx, y: from.y + cl.dy }, c = { x: p.to.x + cl.dx, y: p.to.y + cl.dy };
              b.emit({ type: "afterimage", from: a, to: c });
              for (const e of b.targetsFor(u)) if (e.alive && !hitSet.has(e) && R.geo.pointSeg(e.x, e.y, a.x, a.y, c.x, c.y) <= e.r + this.dashWidth / 2) { hitSet.add(e); b.damage(u, e, this.dashBase, 0.6, `（${cl.label}的霍夫曼）`); }
            }
            return;
          }
          const sec = this.sector(u, arg);
          u.facing = sec.ang;
          b.say(`${u.name} 揮動「變形扳手」`);
          b.emit({ type: "sfx", sound: this.sound });
          b.emit({ type: "fxShape", shape: sec, color: "#a8784e", dur: 320 });
          const hits = b.targetsFor(u).filter((e) => R.geo.inSector(e.x, e.y, sec, e.r));
          if (!hits.length) { b.say("……揮空了"); b.emit({ type: "miss", x: u.x + Math.cos(sec.ang) * 60, y: u.y + Math.sin(sec.ang) * 60 }); }
          for (const e of hits) if (e.alive) b.damage(u, e, this.base);
        },
      },

      // ---------- Q 噴氣裝置 ----------
      jet: {
        name: "噴氣裝置", slot: "Q", key: "q", sound: "sounds/hoffman-jet.mp3",
        tags: [],
        ap: 1, cooldown: 2, dash: 170, steamBase: 8, steamWidth: 90,
        cd(u) { return this.cooldown - (upg(u).q2 === "light" ? 1 : 0); },
        pumped(u) { return upg(u).q1 === "pump" && (u.state.stored || 0) >= 1; },
        len(u) { return this.dash * (this.pumped(u) ? 1.6 : 1); },
        desc: "距離不遠的噴射位移，可以直接越過擋路的單位",
        status(b, u) {
          const cd = u.cd.jet || 0;
          if (cd > 0) return { ready: false, cost: this.ap, label: this.name, note: `CD ${cd}`, reason: `冷卻中（還要 ${cd} 次行動）` };
          return { ready: true, cost: this.ap, label: this.name, note: this.pumped(u) ? "泵動" : undefined, aim: { type: "point", range: this.len(u) } };
        },
        to(b, u, arg) {
          if (!Number.isFinite(arg.x)) err("請點選地面");
          const D = R.dist(u.x, u.y, arg.x, arg.y);
          const L = this.len(u), k = D > L ? L / D : 1;
          const p = landing(b, u, { x: u.x, y: u.y }, { x: u.x + (arg.x - u.x) * k, y: u.y + (arg.y - u.y) * k });
          if (R.dist(p.x, p.y, u.x, u.y) < 5) err("那裡沒辦法落地");
          const cage = b.cageOf?.(u);
          if (cage && !this.pumped(u) && !b.inCage(cage, p.x, p.y, b.cfg.body * 0.6)) err("被聖牢籠困住了（時間泵動可以跳出去）");
          return p;
        },
        predict() { return []; },
        steamHits(b, u, a, c) { return upg(u).q1 === "steam" ? b.targetsFor(u).filter((e) => R.geo.pointSeg(e.x, e.y, a.x, a.y, c.x, c.y) <= e.r + this.steamWidth / 2) : []; },
        preview(b, u, arg) { const p = this.to(b, u, arg); return { shapes: [{ shape: "line", x1: u.x, y1: u.y, x2: p.x, y2: p.y, width: upg(u).q1 === "steam" ? this.steamWidth : 10, color: "#a8784e" }, { shape: "circle", x: p.x, y: p.y, radius: u.r, color: "#a8784e" }], hits: this.steamHits(b, u, u, p) }; },
        use(b, u, arg) {
          const p = this.to(b, u, arg), from = { x: u.x, y: u.y }, pumped = this.pumped(u);
          b.setCooldown(u, "jet", this.cd(u));
          if (pumped) { u.state.stored--; b.say(`時間泵動：消耗 1 層壓縮時間（剩 ${u.state.stored}）`); }
          u.facing = Math.atan2(p.y - u.y, p.x - u.x);
          b.say(`${u.name} 使用「噴氣裝置」`);
          b.emit({ type: "sfx", sound: this.sound });
          const steam = this.steamHits(b, u, from, p);
          u.x = p.x; u.y = p.y;
          b.emit({ type: "leap", unit: u, from, to: p, duration: 0.3 });
          b.bark(u, "jet");
          if (upg(u).q1 === "steam") {
            b.emit({ type: "fxShape", shape: { shape: "line", x1: from.x, y1: from.y, x2: p.x, y2: p.y, width: this.steamWidth }, color: "#e8e8ee", dur: 600 });
            for (const e of steam) if (e.alive) b.damage(u, e, this.steamBase, 1, "（灼熱蒸汽）");
          }
        },
      },

      // ---------- E 齒輪飛盤 ----------
      gear: {
        name: "齒輪飛盤", slot: "E", key: "e", sound: "sounds/hoffman-gear.mp3",
        tags: ["projectile"],
        ap: 1, cooldown: 2, range: 340, width: 40, base: 10, speed: 760, hover: 1.4, knock: 45,
        rng(u) { return this.range * (upg(u).e2 === "jetDisc" ? 1.35 : 1); },
        wid(u) { return this.width * (upg(u).e2 === "steel" ? 1.6 : 1); },
        desc: "射出齒輪飛盤，飛到底停一下再直線飛回手上，去程和回程路上的敵人都會被打到。飛盤在外面時移動，可以改變回程的路線",
        status(b, u) {
          const cd = u.cd.gear || 0;
          if (u.state.disc) return { ready: false, cost: this.ap, label: this.name, note: "飛行中", reason: "飛盤還沒回來" };
          if (cd > 0) return { ready: false, cost: this.ap, label: this.name, note: `CD ${cd}`, reason: `冷卻中（還要 ${cd} 次行動）` };
          return { ready: true, cost: this.ap, label: this.name, aim: { type: "direction" } };
        },
        end(b, u, arg) {
          const d = dirOf(u, arg), A = b.cfg.arena;
          let t = this.rng(u);
          // 撞到場地邊緣就停
          while (t > 20 && (u.x + d.dx * t < 10 || u.y + d.dy * t < 10 || u.x + d.dx * t > A.w - 10 || u.y + d.dy * t > A.h - 10)) t -= 10;
          return { d, x: u.x + d.dx * t, y: u.y + d.dy * t };
        },
        lineHits(b, u, a, c) { return b.targetsFor(u).filter((e) => R.geo.pointSeg(e.x, e.y, a.x, a.y, c.x, c.y) <= e.r + this.wid(u) / 2); },
        predict(b, u, arg) { const e = this.end(b, u, arg); return this.lineHits(b, u, u, e); },
        preview(b, u, arg) {
          const e = this.end(b, u, arg);
          return { shapes: [{ shape: "line", x1: u.x, y1: u.y, x2: e.x, y2: e.y, width: this.wid(u), color: "#5a6070" }, { shape: "circle", x: e.x, y: e.y, radius: this.wid(u) / 2, color: "#5a6070", label: upg(u).e1 === "hard" ? "飛盤停在這裡（不會飛回來）" : "飛盤停在這裡，再飛回手上" }], hits: this.lineHits(b, u, u, e) };
        },
        use(b, u, arg) {
          const e = this.end(b, u, arg);
          u.facing = e.d.ang;
          b.setCooldown(u, "gear", this.cooldown);
          b.say(`${u.name} 射出「齒輪飛盤」`);
          b.emit({ type: "sfx", sound: this.sound });
          b.bark(u, "gear");
          this.fly(b, u, { x: u.x, y: u.y }, { x: e.x, y: e.y });
        },
        // 去程 → 停留 → 回程（回程朝霍夫曼當下的位置）
        async fly(b, u, from, to) {
          const hard = upg(u).e1 === "hard", W = this.wid(u);
          const disc = (u.state.disc = { x: from.x, y: from.y, back: false, size: W / 40 });
          const hit = new Set(), step = 0.03;
          let vx = 0, vy = 0;
          const strike = () => {
            for (const e of b.targetsFor(u)) {
              if (!e.alive || hit.has(e) || R.dist(e.x, e.y, disc.x, disc.y) > e.r + W / 2) continue;
              hit.add(e);
              b.damage(u, e, this.base, hard ? 1.6 : 1, disc.back ? "（回程）" : hard ? "（堅硬齒輪）" : "");
              // 持續運轉：回程把敵人沿著飛盤前進的方向推開
              if (disc.back && upg(u).e1 === "spin" && e.alive && !e.def.immovable) b.knockback(e, e.x - vx, e.y - vy, this.knock);
            }
          };
          const D = R.dist(from.x, from.y, to.x, to.y), dur = D / this.speed;
          for (let t = 0; t < dur; t += step) {
            await b.wait(step);
            if (!alive(b)) { u.state.disc = null; return; }
            const k = Math.min(1, (t + step) / dur);
            disc.x = from.x + (to.x - from.x) * k; disc.y = from.y + (to.y - from.y) * k;
            strike(); b.checkEnd();
          }
          if (hard) { u.state.disc = null; b.say("堅硬齒輪：飛盤沒有飛回來"); b.emit(); return; }
          await b.wait(this.hover);
          if (!alive(b)) { u.state.disc = null; return; }
          disc.back = true; hit.clear();
          b.emit({ type: "sfx", sound: this.sound });
          for (let i = 0; i < 400; i++) {
            await b.wait(step);
            if (!alive(b)) { u.state.disc = null; return; }
            const d = R.dist(disc.x, disc.y, u.x, u.y), sp = this.speed * step;
            if (d <= sp + 4) break;
            vx = ((u.x - disc.x) / d) * 20; vy = ((u.y - disc.y) / d) * 20;
            disc.x += ((u.x - disc.x) / d) * sp; disc.y += ((u.y - disc.y) / d) * sp;
            strike(); b.checkEnd();
          }
          u.state.disc = null;
          b.say("齒輪飛盤回到手上");
          b.emit();
        },
      },

      // ---------- W 壓縮加速機 ----------
      compress: {
        name: "壓縮加速機", slot: "W", key: "w", ultimate: true, sound: "sounds/hoffman-gear.mp3",
        tags: ["area", "buff"],
        ap: 4, charge: 6, radius: 260, pullRange: 170, slamBase: 6, slamPerAp: 3,
        rad(u) { return this.radius * (upg(u).w1 === "shuttle" ? 1.3 : 1); },
        desc: "消耗 4 點行動點和時間壓縮存下的點數，存下多少就加回多少行動點，並以自己為中心展開藍色的齒輪領域：普攻變成「亞光速撞擊」。行動點用光或回合結束時領域消失",
        status(b, u) {
          if (u.charge < this.charge) return { ready: false, cost: this.ap, label: this.name, note: `${u.charge}/${this.charge}`, reason: `還要 ${this.charge - u.charge} 次行動才能使用` };
          if (domainOf(b, u)) return { ready: false, cost: this.ap, label: this.name, note: "領域中", reason: "領域已經展開了" };
          return { ready: true, cost: this.ap, label: this.name, note: `+${u.state.stored || 0} ★`, aim: { type: "none" } };
        },
        predict() { return []; },
        pulls(b, u) { const r = this.rad(u); return upg(u).w1 === "suppress" ? b.enemies().filter((e) => { const d = R.dist(e.x, e.y, u.x, u.y); return d > r - e.r && d <= r + this.pullRange && !e.def.immovable; }) : []; },
        preview(b, u) {
          const r = this.rad(u), sup = upg(u).w1 === "suppress";
          const shapes = [{ shape: "circle", x: u.x, y: u.y, radius: r, color: "#2f6fd6" }];
          if (sup) shapes.push({ shape: "circle", x: u.x, y: u.y, radius: r + this.pullRange, color: "#7fa8e8" });
          return { shapes, hits: sup ? b.enemies().filter((e) => R.dist(e.x, e.y, u.x, u.y) <= r + this.pullRange + e.r) : [], note: `加回 ${u.state.stored || 0} 點行動點${sup ? `・下砸傷害隨行動點增加` : ""}`, nx: u.x, ny: u.y - 50 };
        },
        areaCenter(b, u) { return { x: u.x, y: u.y }; },
        use(b, u) {
          u.charge = 0;
          const gain = u.state.stored || 0;
          u.state.stored = 0;
          u.ap += gain;
          const r = this.rad(u), z = { id: "gf" + Math.random().toString(36).slice(2, 7), type: "gearField", owner: u, x: u.x, y: u.y, r, turnsLeft: 99 };
          b.zones.push(z);
          b.say(`${u.name} 啟動「壓縮加速機」！${gain ? `壓縮的時間釋放：行動點 +${gain}` : ""}`);
          b.bark(u, "ult");
          b.emit({ type: "sfx", sound: this.sound });
          if (gain) b.emit({ type: "buff", unit: u, text: `+${gain} ★`, color: "#2f6fd6" });
          // 超壓縮穿梭：左右兩邊的邊緣出現 0.77 秒前、0.66 秒後的霍夫曼
          if (upg(u).w1 === "shuttle") {
            u.state.clones = [{ dx: -(r - u.r), dy: 0, label: "0.77 秒前", lag: 0.77 }, { dx: r - u.r, dy: 0, label: "0.66 秒後", lead: 0.66 }];
            b.say("領域的左右兩邊出現了 0.77 秒前和 0.66 秒後的霍夫曼");
          }
          // 超光速制壓：把領域外的敵人吸進來，躍起下砸（消耗所有行動點；扣掉大招本身的 3 點之後）
          if (upg(u).w1 === "suppress") {
            const spend = Math.max(0, u.ap - this.ap);
            u.ap -= spend;
            u.state.suppressing = true;
            b.cutscene = true;                      // 演出中不能行動
            this.suppress(b, u, z, spend);
          }
        },
        // 超光速制壓的演出：在領域裡高速移動、慢慢把敵人往內拉 → 高高躍起 → 下砸（藍色震盪）
        async suppress(b, u, z, spend) {
          const r = z.r, pulls = this.pulls(b, u).map((e) => {
            const d = R.dist(e.x, e.y, z.x, z.y) || 1;
            return { e, from: { x: e.x, y: e.y }, to: { x: z.x + ((e.x - z.x) / d) * (r - e.r - 8), y: z.y + ((e.y - z.y) / d) * (r - e.r - 8) } };
          });
          const ok = () => !b.dead && b.phase !== "over";
          b.say(`${u.name} 在齒輪領域裡高速移動！`);
          b.emit({ type: "sfx", sound: "sounds/hoffman-jet.mp3" });
          b.emit({ type: "suction", x: z.x, y: z.y, r, units: pulls.map((p) => p.e), duration: 1.7 });
          // 1) 高速移動 1.6 秒，同時慢慢把範圍內的敵人往內拉
          const T = 1.6, step = 0.08;
          let lastHop = 0;
          for (let t = 0; t < T; t += step) {
            await b.wait(step);
            if (!ok()) return C.endSuppress(b, u);
            const k = Math.min(1, (t + step) / T), ease = k * k * (3 - 2 * k);
            for (const p of pulls) if (p.e.alive) { p.e.x = p.from.x + (p.to.x - p.from.x) * ease; p.e.y = p.from.y + (p.to.y - p.from.y) * ease; }
            if (t - lastHop >= 0.16) {
              lastHop = t;
              const a = Math.random() * Math.PI * 2, d = (r - u.r) * (0.3 + Math.random() * 0.65);
              const to = landing(b, u, { x: u.x, y: u.y }, { x: z.x + Math.cos(a) * d, y: z.y + Math.sin(a) * d });
              b.emit({ type: "afterimage", from: { x: u.x, y: u.y }, to });
              u.x = to.x; u.y = to.y; u.facing = a;
            }
            b.emit();
          }
          for (const p of pulls) if (p.e.alive) { const spot = landing(b, p.e, p.from, p.to); p.e.x = spot.x; p.e.y = spot.y; }
          if (pulls.length) b.say(`${pulls.filter((p) => p.e.alive).map((p) => p.e.name).join("、")} 被吸進了領域`);
          // 回到領域中心
          const c = landing(b, u, { x: u.x, y: u.y }, { x: z.x, y: z.y });
          b.emit({ type: "afterimage", from: { x: u.x, y: u.y }, to: c });
          u.x = c.x; u.y = c.y;
          await b.wait(0.15);
          if (!ok()) return C.endSuppress(b, u);
          // 2) 高高躍起
          b.say(`${u.name} 高高躍起——`);
          b.emit({ type: "sfx", sound: "sounds/hoffman-jet.mp3" });
          b.emit({ type: "leap", unit: u, from: c, to: c, duration: 0.95, height: 300 });
          await b.wait(0.95);
          if (!ok()) return C.endSuppress(b, u);
          // 3) 下砸：藍色震盪
          const base = this.slamBase + this.slamPerAp * spend;
          b.emit({ type: "sfx", sound: "sounds/hoffman-gear.mp3" });
          b.emit({ type: "blueQuake", x: u.x, y: u.y, r });
          b.say(`下砸！（消耗 ${spend} 點行動點）`);
          for (const e of b.enemies()) if (e.alive && R.dist(e.x, e.y, u.x, u.y) <= r + e.r) b.damage(u, e, base, 1, "（超光速制壓）");
          await b.wait(0.7);
          C.endSuppress(b, u);
        },
      },
    },
    endSuppress(b, u) {
      u.state.suppressing = false;
      b.cutscene = false;
      if (b.checkEnd()) return;
      if (u.ap <= 0 && b.phase === "player") { this.onTurnEnd(b, u); b.nextTurn(); }
      else b.emit();
    },
  };

  R.CHARACTERS[C.id] = C;
})();
