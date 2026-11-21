/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/progression.js": "20261122024623" });
// 成長系統：經驗值 → 等級 → 數值、強化點、行動值、技能強化
// 目前沒有完整遊戲流程，所以等級可以在「角色成長」介面直接調整；戰鬥勝利也會給一點經驗
// 每個角色的成長存在瀏覽器（localStorage），換頁、重新整理都會保留
(function () {
  const R = window.RPG;

  const P = {
    MAX_LEVEL: 60,
    POINT_EVERY: 5,            // 每 5 等 1 個強化點
    AP_EVERY: 15,              // 每 15 等 +1 行動值
    AP_MAX_BONUS: 4,           // 最多 +4
    EQ_LEVELS: [10, 30, 40, 50],   // 這些等級各可以強化一次 E 或 Q
    W_LEVEL: 20,               // 20 等可以強化大招
    // 一個強化點能加多少（暫定）
    POINT_VALUE: { hp: 10, mp: 10, atk: 2, df: 2, spd: 1 },
    // 沒有另外設定時的每級成長（暫定）
    DEFAULT_GROWTH: { hp: 4, mp: 2, atk: 0.8, df: 0.4, spd: 0.1 },
    STATS: [["hp", "生命"], ["mp", "魔力"], ["atk", "攻擊"], ["df", "防禦"], ["spd", "速度"]],
    TAG_NAMES: { projectile: "投射物", area: "範圍", melee: "近戰", summon: "召喚物", shield: "護盾", buff: "強化" },

    // ---------- 經驗值 ----------
    xpToNext(level) { return 100 + 25 * (level - 1); },
    xpForLevel(level) {
      let s = 0;
      for (let i = 1; i < level; i++) s += this.xpToNext(i);
      return s;
    },
    levelFromXp(xp) {
      let L = 1;
      while (L < this.MAX_LEVEL && xp >= this.xpForLevel(L + 1)) L++;
      return L;
    },

    // ---------- 存取 ----------
    // 冒險中（地圖探索、地圖戰鬥、酒館）用這輪冒險自己的成長：每輪冒險從 Lv 1、沒有寶物重新開始
    // 選角頁、戰鬥測試用原本的測試存檔
    useAdventure: false,
    key(charId) {
      let adv = false;
      try { adv = this.useAdventure && !!localStorage.getItem("rpg.adventure"); } catch (e) { /* 忽略 */ }
      return (adv ? "rpg.adv.build." : "rpg.build.") + charId;
    },
    clearAdventure() {
      try { for (const k of Object.keys(localStorage)) if (k.startsWith("rpg.adv.build.")) localStorage.removeItem(k); } catch (e) { /* 忽略 */ }
    },
    empty() { return { xp: 0, points: { hp: 0, mp: 0, atk: 0, df: 0, spd: 0 }, picks: [], w: null, items: [], route: null, nodes: {}, draws: {} }; },
    load(charId) {
      try {
        const raw = localStorage.getItem(this.key(charId));
        if (raw) return Object.assign(this.empty(), JSON.parse(raw));
      } catch (e) { /* 讀不到就用預設 */ }
      return this.empty();
    },
    save(charId, build) {
      try { localStorage.setItem(this.key(charId), JSON.stringify(build)); } catch (e) { /* 無法儲存就算了 */ }
    },

    // ---------- 計算 ----------
    derive(ch, build) {
      const level = this.levelFromXp(build.xp);
      const growth = Object.assign({}, this.DEFAULT_GROWTH, ch.growth || {});
      const pointsTotal = Math.floor(level / this.POINT_EVERY);
      const pointsUsed = Object.values(build.points).reduce((a, b) => a + b, 0);
      const apBonus = Math.min(this.AP_MAX_BONUS, Math.floor(level / this.AP_EVERY));
      const eqTotal = this.EQ_LEVELS.filter((l) => level >= l).length;
      const base = Object.assign({ mp: 0 }, ch.stats);
      const stats = {};
      const parts = {};
      for (const [k] of this.STATS) {
        const fromLevel = Math.round(growth[k] * (level - 1) * 10) / 10;
        const fromPoints = (build.points[k] || 0) * this.POINT_VALUE[k];
        stats[k] = Math.round(base[k] + fromLevel + fromPoints);
        parts[k] = { base: base[k], level: fromLevel, points: fromPoints };
      }
      stats.ap = base.ap + apBonus;
      // 寶物的數值加成（例如商店賣的普通寶物）
      for (const id of [...(build.items || []).slice(0, 6), ...(build.sig ? [build.sig] : [])]) {      // 第七格：專武
        const it = R.Items?.LIST[id];
        for (const [k, v] of Object.entries(it?.stats || {})) if (k in stats) stats[k] += v;
      }
      // 技能強化：q1 / q2 / e1 / e2 / w1 = 選到的選項 id
      //   有命路的角色（js/fate.js）：Q／E 的強化改由命路決定，舊的 picks 不用；upg._all＝全部拿到的強化 id（R.upHas 用）
      const upg = {};
      const fateOn = !!R.Fate?.routes(ch);
      let fate = null;
      if (fateOn) {
        const F = R.Fate.compute(ch, build, level);
        for (const id of F.ups) { const u = R.Fate.findUp(ch, id); if (u && !upg[u.slot]) upg[u.slot] = id; }
        upg._all = [...F.ups];
        fate = R.Fate.merge(F.mods);
        fate.route = build.route; fate.reached = F.taken;
        if (F.w) { upg.w1 = F.w; upg._all.push(F.w); }               // 大招強化跟著命路
        // 命路的數值效果
        for (const k of ["hp", "mp", "atk", "df", "spd"]) if (fate[k]) stats[k] += fate[k];
        if (fate.hpPct) stats.hp = Math.round(stats.hp * (1 + fate.hpPct));
        if (fate.mpPct) stats.mp = Math.round(stats.mp * (1 + fate.mpPct));
        stats.spd = Math.max(1, stats.spd); stats.df = Math.max(0, stats.df);
      } else for (const p of build.picks) upg[p.skill + p.tier] = p.choice;
      if (!fateOn && build.w) { upg.w1 = build.w; if (upg._all) upg._all.push(build.w); }
      // 有些強化直接加數值（例如霍夫曼的重型設施：防禦 +7）
      for (const id of upg._all || Object.values(upg)) for (const [k, v] of Object.entries(ch.upgradeStats?.[id] || {})) if (k in stats) stats[k] += v;
      const xpFloor = this.xpForLevel(level);
      return {
        level, xp: build.xp,
        xpInto: build.xp - xpFloor,
        xpNeed: level >= this.MAX_LEVEL ? 0 : this.xpToNext(level),
        pointsTotal, pointsUsed, apBonus, eqTotal, eqUsed: build.picks.length,
        wUnlocked: level >= this.W_LEVEL,
        stats, parts, upg, fate, fateOn,
        items: [...(build.items || []).slice(0, 6), ...(build.sig ? [build.sig] : [])],     // 寶物欄（＋第七格專武）
        sig: build.sig || null,
      };
    },

    // 等級降低時，把超出的分配退回
    normalize(ch, build) {
      const d = this.derive(ch, build);
      const notes = [];
      if (d.pointsUsed > d.pointsTotal) {
        build.points = this.empty().points;
        notes.push("強化點超過上限，已全部退回");
      }
      // 命路：等級不夠的節點退回
      if (d.fateOn) {
        for (const L of Object.keys(build.nodes || {})) if (d.level < +L) { delete build.nodes[L]; notes.push(`退回了命路 Lv ${L} 的命運卡`); }
        for (const L of Object.keys(build.draws || {})) if (d.level < +L) delete build.draws[L];
      }
      while (!d.fateOn && build.picks.length > d.eqTotal) {
        const p = build.picks.pop();
        notes.push(`退回了 ${p.skill.toUpperCase()} 的第 ${p.tier} 次強化`);
      }
      if (d.fateOn && build.w) build.w = null;                     // 有命路：大招強化由命路決定
      if (!d.wUnlocked && build.w) { build.w = null; notes.push("退回了大招強化"); }
      return notes;
    },

    setLevel(ch, build, level) {
      build.xp = this.xpForLevel(Math.max(1, Math.min(this.MAX_LEVEL, level)));
      return this.normalize(ch, build);
    },

    addXp(charId, amount) {
      const ch = R.CHARACTERS[charId];
      const build = this.load(charId);
      const before = this.derive(ch, build).level;
      build.xp = Math.min(this.xpForLevel(this.MAX_LEVEL), build.xp + amount);
      this.save(charId, build);
      return { before, after: this.derive(ch, build).level };
    },

    // 戰鬥開始時用：角色在目前成長下的數值與強化（教學版這種固定角色不套用）
    forBattle(ch) {
      if (ch.frozen) return { level: 1, stats: Object.assign({ mp: 0 }, ch.stats), upg: {}, items: [] };
      return this.derive(ch, this.load(ch.id));
    },
  };

  R.Progress = P;
})();
