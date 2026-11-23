/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/ai-icarus.js": "20261123215910" });
// Boss：伊卡洛斯號（#SP10101 遞廻齒輪鑲嵌之國・SP10101-03）
// 一台全機械的蒸氣飛艇：越是飛行，越是往下噴射蒸氣、傾倒廢料、放下制動人偶船員
//   高度：每輪到它一次就升高 1（最多 maxAlt）。高度越高——
//     飛行（移動）時沿路往下噴的蒸氣越多（每一格高度一團）
//     傾倒的廢料越多（1 + 高度的一半）
//     高度 3 以上，一次放下兩個人偶船員
//     受到的傷害越少（飛太高，打不太到：每一格高度 −5%）
//   融化的翅膀：生命第一次低於一半時，鍋爐的鉚釘噴飛，伊卡洛斯號一路掉回高度 1（那一回合的行動點少一半）
(function () {
  const R = (window.RPG = window.RPG || {});
  R.AI = R.AI || {};
  R.AI.icarus = {
    init(b, u) { u.state.alt = 0; u.state.callAt = 2; u.state.scrapCd = 0; },
    async takeTurn(b, u) {
      const D = u.def;
      if (u.state.scrapCd > 0) u.state.scrapCd--;
      if (!u.state.fell && u.hp < u.maxHp / 2) {
        u.state.fell = true; u.state.alt = 0; u.ap = Math.ceil(u.ap / 2);
        b.say(`${u.name} 的鍋爐鉚釘噴飛了——像融化的翅膀一樣，整艘飛艇往下掉！`);
        b.emit({ type: "bossUlt", unit: u, text: "融化的翅膀", style: "fall" });
        b.emit({ type: "sfx", sound: "sounds/explosion.mp3" });
        await b.wait(1.2);
        b.emit({ type: "bossUltEnd" });
      }
      if (u.state.alt < D.maxAlt) {
        u.state.alt++;
        b.say(`${u.name} 的螺旋槳轉得更快了——高度 ${u.state.alt}`);
        b.emit({ type: "buff", unit: u, text: `高度 ${u.state.alt}`, color: "#e8862a" });
      }
      let guard = 0;
      while (u.ap > 0 && u.alive && !b.dead && b.phase !== "over" && guard++ < 8) {
        const t = b.aggroTarget(u);
        const crew = b.mainEnemies().filter((e) => e.kind === D.crew.kind && e.alive).length;
        if (b.round >= u.state.callAt && crew < D.crew.max && u.ap >= D.crew.ap) await this.crew(b, u, t, crew);
        else if (!(u.state.scrapCd > 0) && u.ap >= D.scrap.ap) await this.scrap(b, u, t);
        else if (u.ap >= D.fly.ap) await this.fly(b, u, t);
        else break;
        b.emit();
        if (u.ap > 0) await b.wait(b.cfg.aiDelay);
      }
      u.ap = 0;
    },
    // 飛行：往目標飛過去，沿路往下噴蒸氣（高度越高噴越多團）
    async fly(b, u, t) {
      const D = u.def.fly, from = { x: u.x, y: u.y };
      if (!b.enemyMoveToward(u, t, 90)) { b.enemySpend(u, D.ap); return; }
      const n = Math.max(1, u.state.alt);
      b.say(`${u.name} 飛過頭頂，往下噴出${n > 2 ? "大量的" : ""}蒸氣！`);
      const spots = [];
      for (let i = 0; i < n; i++) { const k = n === 1 ? 1 : i / (n - 1); spots.push({ x: from.x + (u.x - from.x) * k + (Math.random() - 0.5) * 40, y: from.y + (u.y - from.y) * k + (Math.random() - 0.5) * 40 }); }
      await Promise.all(spots.map((s, i) => b.wait(i * 0.08).then(() => b.telegraph(u, { shape: "circle", x: s.x, y: s.y, radius: D.radius, reaction: D.reaction },
        { base: D.base, sound: i ? null : D.sound, label: `${u.name} 的${D.name}`, quiet: i > 0 }))));
    },
    // 傾倒廢料：落在目標腳下和附近
    async scrap(b, u, t) {
      const D = u.def.scrap, A = b.cfg.arena;
      b.enemySpend(u, D.ap);
      u.state.scrapCd = D.cooldown + 1;
      const n = 1 + Math.ceil(u.state.alt / 2);
      b.say(`${u.name} 打開貨艙——${D.name}！（${n} 處）`);
      const spots = [{ x: t.x, y: t.y }];
      for (let i = 0; i < 40 && spots.length < n; i++) {
        const x = Math.min(A.w - 60, Math.max(60, t.x + (Math.random() - 0.5) * 520)), y = Math.min(A.h - 60, Math.max(60, t.y + (Math.random() - 0.5) * 400));
        if (spots.some((s) => R.dist(s.x, s.y, x, y) < D.radius * 1.6)) continue;
        spots.push({ x, y });
      }
      await Promise.all(spots.map((s, i) => b.wait(i * 0.1).then(() => b.telegraph(u, { shape: "circle", x: s.x, y: s.y, radius: D.radius, reaction: D.reaction },
        { base: D.base, sound: i ? null : D.sound, label: `落下的${D.short || "廢料"}`, quiet: i > 0 }))));
    },
    // 放下制動人偶船員（高度 3 以上一次兩個）
    async crew(b, u, t, have) {
      const D = u.def.crew, A = b.cfg.arena;
      b.enemySpend(u, D.ap);
      u.state.callAt = b.round + D.every;
      const n = Math.min(D.max - have, u.state.alt >= 3 ? 2 : 1);
      b.say(D.line);
      b.emit({ type: "sfx", sound: D.sound });
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        b.summonEnemy(D.kind, Math.min(A.w - 80, Math.max(80, u.x + Math.cos(a) * 120)), Math.min(A.h - 80, Math.max(80, u.y + Math.sin(a) * 100)));
      }
      await b.wait(0.5);
    },
  };
})();
