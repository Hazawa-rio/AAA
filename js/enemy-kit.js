/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/enemy-kit.js": "20261122223322" });
// 一般敵人的「攻擊方式」和「特有被動」（Boss 有自己的 AI，不在這裡）
// 攻擊方式（style）：wolf／gunner 這兩種 AI 讀 def.style，沒設定就是原本的打法
//   近戰（wolf）：charge 衝撞・hitRun 打帶跑・sweep 揮掃・frenzy 連咬
//   遠程（gunner）：burst 連射・spread 散射・lob 拋射・snipe 狙擊
// 特有被動（trait）：battle.js 在受傷、造成傷害、回合開始、倒下時問這裡
// 哪個敵人用哪一種寫在最下面的 ASSIGN（數值都暫定）；敵人的被動說明是 NPC 文本，可以直接改
(function () {
  const R = (window.RPG = window.RPG || {});
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const STYLES = {
    charge: { name: "衝撞", desc: "飛撲改成更長的衝撞，撞到會把人撞飛" },
    hitRun: { name: "打帶跑", desc: "咬完一口就往後退開" },
    sweep: { name: "揮掃", desc: "近身時改成揮掃自己周圍一圈" },
    frenzy: { name: "連咬", desc: "撕咬比較輕、但行動點花得少，一回合咬好幾下" },
    burst: { name: "連射", desc: "一次射出三發會飛的彈（看得到、可以走位躲開），每發比較輕" },
    spread: { name: "散射", desc: "三道射擊扇形散開" },
    lob: { name: "拋射", desc: "往你腳下丟東西，落點一圈都會被打到" },
    snipe: { name: "狙擊", desc: "瞄得久一點，射得更遠、更重" },
  };

  // 特有被動：每個 hook 都可以不寫
  //   incoming(b, u, src) → 受到的傷害倍率（< 1 減傷）；outgoing(b, u, dst) → 造成的傷害倍率
  //   evade(b, u, src) → 打空的機率；afterHit(b, src, dst, amount, side)；turnStart(b, u)；death(b, u)
  const TRAITS = {
    pack: { name: "群狼", desc: "場上每多一隻同種的同伴，傷害 +12%（最多 +36%）", per: 0.12, max: 3,
      outgoing(b, u) { const n = Math.min(this.max, b.units.filter((x) => x !== u && x.alive && x.kind === u.kind).length); return 1 + n * this.per; } },
    thickHide: { name: "厚皮", desc: "每一回合受到的第一下攻擊 ×0.6", mult: 0.6,
      incoming(b, u) { if (u.state.hideRound === b.round) return 1; u.state.hideRound = b.round; return this.mult; } },
    regen: { name: "再生", desc: "自己的回合開始時，回復最大生命的 6%", pct: 0.06,
      turnStart(b, u) { if (u.hp < u.maxHp) b.heal(u, Math.max(1, Math.round(u.maxHp * this.pct)), "（再生）"); } },
    enrage: { name: "暴怒", desc: "生命低於一半時，傷害 +30%", mult: 1.3,
      outgoing(b, u) { return u.hp < u.maxHp / 2 ? this.mult : 1; },
      turnStart(b, u) { if (u.hp < u.maxHp / 2 && !u.state.enraged) { u.state.enraged = true; b.say(`${u.name} 暴怒了！`); b.emit({ type: "buff", unit: u, text: "暴怒", color: "#c62828" }); } } },
    evasive: { name: "輕盈", desc: "從遠處（220 以外）打來的攻擊，有 20% 會被閃過", chance: 0.2, far: 220,
      evade(b, u, src) { return src && dist(src, u) > this.far ? this.chance : 0; } },
    lifesteal: { name: "吸血", desc: "造成傷害時，回復傷害的一半", pct: 0.5,
      afterHit(b, src, dst, amount, side) { if (side === "out" && src.alive && amount > 0) b.heal(src, Math.max(1, Math.round(amount * this.pct)), "（吸血）"); } },
    thorns: { name: "反刺", desc: "近身打牠的人會被反彈 3 點傷害", dmg: 3, near: 160,
      afterHit(b, src, dst, amount, side) {
        if (side !== "in" || !src || src.team !== "player" || !src.alive || src.summon || dist(src, dst) > this.near) return;
        src.hp = Math.max(0, src.hp - this.dmg);
        b.say(`${src.name} 被 ${dst.name} 的反刺扎到，受到 ${this.dmg} 點傷害`);
        b.emit({ type: "damage", unit: src, amount: this.dmg });
        if (src === b.player && src.hp <= 0) b.char.onLethal?.(b, src);
        if (!src.alive) b.onDeath(src);
      } },
    ambush: { name: "先手", desc: "這場戰鬥的第一次攻擊傷害 ×1.5", mult: 1.5,
      outgoing(b, u) { if (u.state.ambushed) return 1; u.state.ambushed = true; return this.mult; } },
    armor: { name: "裝甲", desc: "受到的傷害 ×0.8", mult: 0.8, incoming() { return this.mult; } },
    deathBurst: { name: "臨死爆裂", desc: "倒下時原地爆開（半徑 100，先出現預告），站太近會被炸到", radius: 100, base: 12, reaction: 0.7,
      death(b, u) {
        // 牠已經倒下了：用一個替身來放預告（預告的主人倒下會中斷，所以不能用牠自己）
        const ghost = { alive: true, name: u.name, atk: u.atk, team: "enemy", def: u.def, state: {}, x: u.x, y: u.y, r: u.r, kind: u.kind };
        b.say(`${u.name} 的身體開始膨脹……`);
        b.telegraph(ghost, { shape: "circle", x: u.x, y: u.y, radius: this.radius, reaction: this.reaction }, { base: this.base, sound: u.def.sounds?.slam, label: `${u.name} 的臨死爆裂` });
      } },
  };

  // 哪個敵人用哪種攻擊方式、哪個被動（數值暫定）
  const ASSIGN = {
    // 奇儂鎮、科考隊
    slime: { trait: "regen" }, mossSlime: { trait: "regen" }, wolf: { trait: "pack" }, forestWolf: { trait: "pack" },
    pirate: { style: "charge", trait: "enrage" }, pirateGunner: { style: "snipe", trait: "ambush" },
    ruinCruiser: { style: "snipe", trait: "armor" },
    // 永遠萬聖節旅館
    ghostActor: { style: "hitRun", trait: "evasive" }, werewolfActor: { style: "frenzy", trait: "pack" },
    mummyActor: { style: "sweep", trait: "thickHide" }, zombieActor: { style: "frenzy", trait: "lifesteal" },
    bat: { style: "hitRun", trait: "lifesteal" },
    // 午夜郵局
    selfBlame: { style: "lob", trait: "thorns" }, regret: { trait: "enrage" }, longing: { style: "burst", trait: "evasive" },
    joy: { style: "hitRun", trait: "evasive" }, anxiety: { style: "burst", trait: "enrage" },
    // 蒙德里安的理想國
    blockBeastRed: { style: "charge", trait: "thickHide" }, blockBeastBlue: { style: "charge", trait: "thickHide" },
    blockBeastYellow: { style: "charge", trait: "thickHide" }, blockBeastWhite: { style: "charge", trait: "thickHide" },
    blockBird: { style: "hitRun", trait: "evasive" }, rexBlock: { trait: "thickHide" },
    // 燈塔小鎮、月台、黑原市、生態盒
    blockBear: { style: "sweep", trait: "thickHide" },
    ticketBot: { trait: "armor" }, dodger: { style: "hitRun", trait: "ambush" },
    rogueDrone: { style: "burst", trait: "deathBurst" },
    jumpSpider: { trait: "ambush" }, aphid: { trait: "regen" },
    // B 級
    skyCatcher: { style: "spread", trait: "evasive" }, stitched: { style: "sweep", trait: "regen" },
    wSardine: { style: "frenzy", trait: "pack" }, wIcefish: { style: "hitRun", trait: "evasive" }, wLantern: { style: "frenzy", trait: "pack" }, wLoach: { style: "hitRun", trait: "evasive" },
    wBarracuda: { style: "charge", trait: "ambush" }, wSeal: { style: "charge", trait: "thickHide" }, wViper: { style: "snipe", trait: "ambush" }, wGar: { style: "charge", trait: "armor" }, wGhostFish: { style: "hitRun", trait: "evasive" },
    piranha: { style: "frenzy", trait: "pack" }, moray: { style: "hitRun", trait: "ambush" }, leopardSeal: { style: "charge", trait: "enrage" }, angler: { style: "snipe", trait: "evasive" },
    steamHound: { style: "charge", trait: "armor" }, rivetTank: { style: "snipe", trait: "thickHide" }, steamGhost: { style: "hitRun", trait: "evasive" }, automatonCrew: { style: "frenzy", trait: "deathBurst" },
    sporeMole: { style: "frenzy", trait: "deathBurst" }, hyphaBeast: { style: "charge", trait: "ambush" }, looter: { style: "charge", trait: "enrage" },
    eraAgent: { style: "snipe", trait: "ambush" }, grudge: { style: "sweep", trait: "lifesteal" },
    // A 級
    paperMan: { style: "hitRun", trait: "evasive" }, bronzeBird: { style: "spread", trait: "thorns" },
    centaur: { style: "charge", trait: "enrage" }, pixelJet: { style: "burst", trait: "evasive" },
    pixelGrunt: { style: "frenzy", trait: "armor" },
  };
  const E = R.CONFIG?.enemies || {};
  for (const [k, v] of Object.entries(ASSIGN)) if (E[k]) Object.assign(E[k], v);

  const traitOf = (u) => (u?.def?.trait && TRAITS[u.def.trait]) || null;
  R.EnemyKit = {
    STYLES, TRAITS, ASSIGN, traitOf,
    // battle.damage 用：回傳 { mult, note }
    incoming(b, dst, src) {
      const T = traitOf(dst); if (!T?.incoming || dst.team !== "enemy") return null;
      const m = T.incoming(b, dst, src); return m !== 1 ? { mult: m, note: `（${T.name}）` } : null;
    },
    outgoing(b, src, dst) {
      const T = traitOf(src); if (!T?.outgoing || src.team !== "enemy") return null;
      const m = T.outgoing(b, src, dst); return m !== 1 ? { mult: m, note: `（${T.name}）` } : null;
    },
    evade(b, dst, src) { const T = traitOf(dst); return T?.evade && dst.team === "enemy" ? T.evade(b, dst, src) : 0; },
    afterHit(b, src, dst, amount) {
      const A = traitOf(src); if (A?.afterHit && src.team === "enemy") A.afterHit(b, src, dst, amount, "out");
      const D = traitOf(dst); if (D?.afterHit && dst.team === "enemy") D.afterHit(b, src, dst, amount, "in");
    },
    turnStart(b, u) { const T = traitOf(u); if (T?.turnStart && u.team === "enemy" && u.alive) T.turnStart(b, u); },
    death(b, u) { const T = traitOf(u); if (T?.death && u.team === "enemy") T.death(b, u); },
    // 圖鑑和戰鬥畫面用的一行說明
    describe(def) {
      const s = def?.style && STYLES[def.style], t = def?.trait && TRAITS[def.trait];
      return { style: s ? `${s.name}：${s.desc}` : "", trait: t ? `${t.name}：${t.desc}` : "" };
    },
  };
})();
