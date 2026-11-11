/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/tutorial.js": "20261112021356" });
// 新手引導房的劇本：NPC 羽澤璃央一步一步教戰鬥系統
// 由 battle-ui.js 在房間設定 script: "tutorial" 時呼叫 RPG.Tutorial.attach(battle, ui)
//   ui.dialog(lines) → Promise（玩家點完所有對話後 resolve）
//   ui.bubble(unit, text) → 單位頭上的短暫對話泡泡
(function () {
  const R = window.RPG;

  // 教學 NPC 的數值也固定在這裡，不受平衡調整影響
  const NPC = {
    name: "羽澤璃央", ai: "mentor",
    hp: 50, atk: 20, df: 4, spd: 10, ap: 7, r: 22,
    alwaysFirst: true,             // 必定先手（速度不參與排序）
    moveCost: 1,
    noDeath: true,                 // 血條打光也不會倒下
    // 鐮刀揮砍：扇形，3 秒反應時間
    swing: { ap: 2, radius: 150, halfDeg: 50, base: 10, reaction: 3 },
    sounds: { swing: "sounds/boss-tentacle.mp3" },
  };
  R.TUTORIAL_NPC = NPC;
  const DEMON = { name: "心魔", hp: 1, atk: 0, df: 0, spd: 0, ap: 0, r: 18 };

  const LINES = {
    intro: "你好啊，歡迎來到占位符AAA的戰鬥系統教學，因為我現在只做了戰鬥系統所以只有戰鬥系統的教學",
    move: "首先 你是一個方塊，這個藍色圈圈是你的移動範圍，你可以任意點擊來移動，要到下個階段的時候在我旁邊按E就好了",
    demon: "這是伊爾舒的角色被動，擊殺這些心魔就可以為你疊加陰霾，只要在虛線範圍內就可以點擊心魔來使用普攻",
    ap: "接下來是最重要的行動值，你可以在你的回合內消耗行動值做出不同行動，無論移動、普攻、使用技能都需要行動值，此外，你的大招和技能的冷卻都是按照行動次數去計算的。",
    skills: "你的Q技能可以把心魔拉過來 E技能可以引爆心魔，試試看在你的行動值內疊滿陰霾",
    emergency: "當然，其實你也不一定要在你的回合內行動，如果現在不是你的回合，你還是可以消耗2倍的行動值做出「應急行動」除了大招都能夠應急，不過應急行動是不能減少技能冷卻和充能大招的。",
    fight: "那麼看來你也差不多知道戰鬥機制了，接下來打光我的血條就沒有後續了",
    end: "這個房間就這樣了，你可以換房間測試了。",
    hit: ["你打我幹啥?", "你不會喜歡我吧？", "我只寫了三條文本，別試了"],
    pulled: "你撞到我了",
    blasted: "你炸到我了",
    retry: "行動值用完了，再試一次吧",
    demoHit: "被打中了喔，在倒數結束前離開紅色範圍",
  };

  class Tutorial {
    constructor(b, ui) {
      this.b = b;
      this.ui = ui;
      this.stage = "intro";
      this.waiters = {};
      this.lastHitLine = -1;
      b.tutorial = this;
    }

    get P() { return this.b.player; }
    get maxGloom() { return this.P.def.passive.maxGloom; }

    // ---------- 等待某件事發生 ----------
    waitFor(name) { return new Promise((res) => { this.waiters[name] = res; }); }
    signal(name) { const f = this.waiters[name]; if (f) { delete this.waiters[name]; f(); } }

    // ---------- 畫面上方的目標提示 ----------
    objective() {
      switch (this.stage) {
        case "walk": return "自由移動，走到羽澤璃央旁邊按 E 繼續";
        case "demon1": return "點擊心魔，用普攻（長劍突刺）擊殺它";
        case "challenge": return `在 ${this.P.maxAp} 點行動值內疊滿陰霾（${this.P.state.gloom} / ${this.maxGloom}）`;
        case "demo": return "羽澤璃央要揮鐮刀了！在倒數結束前移出紅色範圍（應急移動消耗 ×2）";
        case "post": return "教學結束，可以自由測試（行動值無限）";
        default: return null;
      }
    }

    // ---------- 主流程 ----------
    async run() {
      const b = this.b, P = this.P, room = b.room;
      b.scripted = true;            // 不用一般的勝負判定
      b.freeAP = true;              // 先不消耗行動點
      b.allowed = new Set();        // 一開始什麼都不能做
      b.phase = "player";
      b.order = [P]; b.idx = 0; b.round = 0;
      this.npc = b.spawnSpecial("enemy", "mentor", NPC, room.npcStart.x, room.npcStart.y, { npc: true, keepAlive: true });
      this.npc.facing = Math.atan2(P.y - this.npc.y, P.x - this.npc.x);
      b.emit();

      await this.ui.dialog([LINES.intro, LINES.move]);

      // 自由移動，到 NPC 旁邊按 E
      this.stage = "walk";
      b.allowed = new Set(["move"]);
      b.emit();
      await this.waitFor("talk");

      // NPC 後退一步，在面前生出心魔
      this.stage = "talk";
      b.allowed = new Set();
      this.stepBack();
      this.spawnInFront();
      await this.ui.dialog([LINES.demon]);
      this.stage = "demon1";
      b.allowed = new Set(["move", P.def.basic]);
      b.emit();
      await this.waitFor("demonKilled");

      // 行動值與技能說明 → 疊滿陰霾挑戰
      this.stage = "talk";
      b.allowed = new Set();
      b.emit();
      await this.ui.dialog([LINES.ap, LINES.skills]);
      this.startChallenge();
      await this.waitFor("challengeDone");
      P.ap = P.maxAp;               // 完成後回復所有行動值
      for (const d of b.demons()) { d.hp = 0; b.units = b.units.filter((x) => x !== d); }
      this.stage = "talk";
      b.allowed = new Set();
      b.emit();
      await this.ui.dialog([LINES.emergency]);

      // 立刻進入戰鬥：NPC 先手，示範揮砍直到玩家閃開一次
      this.stage = "demo";
      b.freeAP = false;
      b.allowed = new Set(["move", ...Object.keys(P.def.skills)]);
      b.inFight = true;
      b.fixedOrder = true;          // 順序固定：NPC 先，玩家後
      b.order = [this.npc, P];
      b.round = 0; b.idx = -1;
      P.ap = P.maxAp;
      b.nextTurn();
    }

    stepBack() {
      const n = this.npc, P = this.P;
      const ang = Math.atan2(n.y - P.y, n.x - P.x);
      for (let d = 70; d >= 10; d -= 10) {
        const x = n.x + Math.cos(ang) * d, y = n.y + Math.sin(ang) * d;
        if (!this.b.blocked(n, x, y) && y > n.r && x > n.r && x < this.b.cfg.arena.w - n.r) {
          n.x = x; n.y = y;
          this.b.emit({ type: "move", unit: n });
          return;
        }
      }
    }

    // NPC 面前（朝玩家的方向）生出心魔
    spawnInFront() {
      const n = this.npc, P = this.P, b = this.b;
      const ang = Math.atan2(P.y - n.y, P.x - n.x), r = 18;
      for (const d of [70, 55, 90, 110]) {
        const x = n.x + Math.cos(ang) * d, y = n.y + Math.sin(ang) * d;
        if (!b.units.some((o) => o.alive && R.dist(o.x, o.y, x, y) < o.r + r + 4)) return this.spawn(x, y);
      }
      const s = b.randomFreeSpot(r, 30);
      if (s) this.spawn(s.x, s.y);
    }
    // 生成心魔：教學自己處理，不依賴角色檔的版本
    spawn(x, y) {
      const b = this.b, P = this.P;
      const d = b.spawnSpecial("enemy", "demon", DEMON, x, y, { demon: true, owner: P });
      b.emit({ type: "demonSpawn", unit: d });
      return d;
    }

    // 在玩家附近找空位：dist 是離玩家的距離
    spawnNear(dist, angles) {
      const b = this.b, P = this.P, A = b.cfg.arena, r = 18;
      const list = angles || Array.from({ length: 16 }, () => Math.random() * Math.PI * 2);
      for (const a of list) {
        const x = P.x + Math.cos(a) * dist, y = P.y + Math.sin(a) * dist;
        if (x < r + 10 || y < r + 10 || x > A.w - r - 10 || y > A.h - r - 10) continue;
        if (b.units.some((o) => o.alive && R.dist(o.x, o.y, x, y) < o.r + r + 6)) continue;
        return this.spawn(x, y);
      }
      return null;
    }

    // ---------- 疊滿陰霾挑戰 ----------
    startChallenge() {
      const b = this.b, P = this.P;
      this.stage = "challenge";
      b.freeAP = false;
      b.allowed = new Set(["move", P.def.basic, "trial", "karma"]);
      P.ap = P.maxAp;
      P.state.gloom = 0;
      P.cd = {};
      for (const d of b.demons()) { d.hp = 0; b.units = b.units.filter((x) => x !== d); }
      // 第一隻：普攻打不到，但用 Q 拉過來後會停在普攻範圍內
      const th = P.def.skills[P.def.basic], tr = P.def.skills.trial;
      const dist = Math.min(th.range + tr.pull - 40, th.range + 120);
      const toNpc = Math.atan2(this.npc.y - P.y, this.npc.x - P.x);
      const angles = [toNpc + Math.PI, toNpc + Math.PI / 2, toNpc - Math.PI / 2, toNpc + 2.4, toNpc - 2.4, toNpc + Math.PI * 0.75];
      if (!this.spawnNear(dist, angles)) this.spawnNear(dist);
      b.emit();
    }

    afterAction() {
      if (this.stage !== "challenge") return;
      const P = this.P;
      if (P.state.gloom >= this.maxGloom) { this.signal("challengeDone"); return; }
      if (P.ap <= 0) {
        this.ui.bubble(this.npc, LINES.retry);
        this.startChallenge();
      }
    }

    // 心魔被擊殺：回傳 true 表示由劇本決定下一隻（不用隨機生成）
    onDemonDeath(u, demon) {
      if (this.stage === "demon1") { setTimeout(() => this.signal("demonKilled"), 400); return true; }
      if (this.stage === "challenge") {
        if (u.state.gloom < this.maxGloom) {
          const th = u.def.skills[u.def.basic];
          this.spawnNear(Math.min(th.range - 30, 70 + Math.random() * 50)) || this.spawnNear(80);
        }
        return true;
      }
      return false;   // 戰鬥中、教學結束後：照一般規則隨機出現
    }

    // ---------- E 鍵：走到 NPC 旁邊推進 ----------
    pressE() {
      if (this.stage !== "walk") return false;
      if (R.dist(this.P.x, this.P.y, this.npc.x, this.npc.y) > this.npc.r + this.P.r + 70) {
        this.ui.bubble(this.npc, "再靠近我一點");
        return true;
      }
      this.signal("talk");
      return true;
    }
    nearNpc() { return this.stage === "walk" && R.dist(this.P.x, this.P.y, this.npc.x, this.npc.y) <= this.npc.r + this.P.r + 70; }

    // ---------- NPC 被打到（沒有傷害，只講話） ----------
    onNpcHit(skill) {
      let text;
      if (this.stage === "post") text = LINES.end;
      else if (skill === "trial") text = LINES.pulled;
      else if (skill === "karma") text = LINES.blasted;
      else {
        let i;
        do { i = Math.floor(Math.random() * LINES.hit.length); } while (i === this.lastHitLine && LINES.hit.length > 1);
        this.lastHitLine = i;
        text = LINES.hit[i];
      }
      this.ui.bubble(this.npc, text);
    }

    // ---------- 示範揮砍：直到玩家閃開一次 ----------
    async runDemo(u) {
      const b = this.b, P = this.P;
      while (b.inFight && !b.dead) {
        P.ap = Math.max(P.ap, P.maxAp);            // 每次重來都補滿，讓玩家有點數應急移動
        u.ap = 99;
        await R.AI.mentor.approach(b, u);          // 先走到攻擊範圍內
        if (!b.inFight || b.dead) return;
        const res = await R.AI.mentor.swing(b, u, { noDamage: true });
        if (b.dead) return;
        if (res === "miss") break;
        this.ui.bubble(u, LINES.demoHit);
        await b.wait(1.4);
      }
      // 暫停，對話後以 50 生命開始正式戰鬥
      const prev = b.phase;
      b.phase = "paused";
      await this.ui.dialog([LINES.fight]);
      b.phase = prev;
      u.npc = false;
      u.maxHp = u.hp = NPC.hp;
      u.ap = u.maxAp;              // 對話完立刻用完整的一個回合開打
      this.stage = "fight";
      // 被動：戰鬥中場上照常有一隻心魔
      if (!b.demons().length) { const s = b.randomFreeSpot(18, 40); if (s) this.spawn(s.x, s.y); }
      b.say(`── 與${u.name}的戰鬥開始 ──`);
      b.emit();
    }

    // ---------- 血條打光：戰鬥結束，不會倒下 ----------
    onNpcDefeated(u) {
      const b = this.b;
      if (this.stage === "post") return;
      this.stage = "post";
      b.inFight = false;
      for (const t of b.threats) t.cancelled = true;
      b.threats = [];
      u.hp = 0;
      u.npc = true;
      b.phase = "player";
      b.order = [this.P]; b.idx = 0;
      b.freeAP = true;
      b.allowed = null;
      this.P.ap = this.P.maxAp;
      b.say(`${u.name} 的血條打光了！教學結束`);
      b.emit({ type: "tutorialEnd" });
      this.ui.dialog([LINES.end]);
    }
  }

  // 教學 NPC 的 AI：只會移動和揮鐮刀
  R.AI = R.AI || {};
  R.AI.mentor = {
    async takeTurn(b, u) {
      const T = b.tutorial;
      if (T && T.stage === "demo") {
        await T.runDemo(u);                   // 示範完會接著用完整的回合開打
        if (!b.inFight || b.dead) return;
        await b.wait(b.cfg.aiDelay);
      }
      const S = u.def.swing;
      let guard = 0;
      while (u.ap > 0 && b.inFight && !b.dead && b.phase !== "over" && guard++ < 12) {
        if (this.inRange(b, u) && u.ap >= S.ap) await this.swing(b, u);
        else if (!this.inRange(b, u) && u.ap >= u.def.moveCost) { if (!this.step(b, u)) break; }
        else break;
        if (u.ap > 0) await b.wait(b.cfg.aiDelay * 0.6);
      }
    },
    inRange(b, u) {
      const p = b.player;
      return R.dist(u.x, u.y, p.x, p.y) <= u.def.swing.radius + p.r * 0.3 - 10;
    },
    // 往玩家走一步，停在揮砍範圍裡面一點的位置
    step(b, u) { return b.enemyMoveToward(u, b.player, u.def.swing.radius * 0.6); },
    // 一直走到揮砍範圍內（示範用，不限行動點）
    async approach(b, u) {
      for (let i = 0; i < 8 && !this.inRange(b, u) && b.inFight && !b.dead; i++) {
        if (!this.step(b, u)) break;
        await b.wait(b.cfg.aiDelay * 0.7);
      }
    },
    async swing(b, u, opts = {}) {
      const S = u.def.swing, p = b.player;
      b.enemySpend(u, S.ap);
      const ang = Math.atan2(p.y - u.y, p.x - u.x);
      u.facing = ang;
      b.say(`${u.name} 舉起了鐮刀！`);
      const sweep = Math.random() < 0.5 ? 1 : -1;     // 鐮刀從哪一側揮過來（只影響動畫）
      return b.telegraph(u, { shape: "sector", x: u.x, y: u.y, ang, half: (S.halfDeg * Math.PI) / 180, radius: S.radius, reaction: S.reaction, kind: "scythe", sweep },
        { base: S.base, sound: u.def.sounds.swing, label: "鐮刀揮砍", noDamage: opts.noDamage });
    },
  };

  R.Tutorial = {
    attach(b, ui) {
      const t = new Tutorial(b, ui);
      // 劇本出錯時直接顯示在畫面上，不要默默卡住
      t.run().catch((e) => {
        console.error(e);
        ui.error?.(`教學發生錯誤：${e.message}。請確認所有檔案都已更新到同一個版本後重新整理。`);
      });
      return t;
    },
  };
})();
