/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/config.js": "20261106185838" });
// 共用數值。角色自己的數值在 js/characters/ 裡。
// 標「暫定」的都只是讓測試能跑的值。
window.RPG = window.RPG || {};

RPG.CONFIG = {
  arena: { w: 1280, h: 720 },
  grid: 40,             // 場地一格的大小
  body: 22,             // 單位碰撞半徑
  movePerSpd: 13,       // 移動半徑 = 速度 × 這個值
  moveCost: 1,          // 自己回合移動一次的行動點
  offTurnMultiplier: 2, // 非自己回合也能行動（大招除外），行動點消耗 × 2
  initiativeDie: 20,    // 行動順序 = 1d20 + 速度，只在第一回合擲一次，之後沿用
  aiDelay: 0.55,        // 敵人每個動作之間的停頓（秒），只影響觀感
  slamLeapTime: 0.45,   // 壓制時史萊姆跳到中心點的時間（秒）
  volume: 0.7,
  bgmVolume: 0.35,
  turnSound: "sounds/turn-start.mp3",   // 輪到自己回合的提示音
  enemyTurnSound: "sounds/enemy-turn.mp3", // 輪到怪物時的警告音效
  enemyTurnDelay: 0.8,                   // 輪到怪物時先停頓幾秒才動手

  // 傷害公式：技能寫的「基礎 × 攻擊力%」解讀為 基礎 × (1 + 攻擊力/100)，再扣防禦，最少 1
  // 要換公式只改這裡
  damage(base, atk, def) {
    return Math.max(1, Math.round(base * (1 + atk / 100) - def));
  },

  enemies: {
    slime: {
      name: "史萊姆", ai: "slime",
      hp: 60, atk: 16, df: 2, spd: 6, ap: 3,        // 暫定
      moveCost: 1,
      // 撞擊：正前方短距離長方形，出現紅框後玩家有 reaction 秒可以閃避
      ram: { ap: 1, length: 110, width: 64, base: 8, reaction: 1.0 },
      // 壓制：遠距離放的大圓，蓄力到「下次輪到史萊姆」才發動，發動時史萊姆跳到中心點
      // cooldown = 發動後要再做幾次行動才能再用
      slam: { ap: 2, range: 340, radius: 115, base: 14, cooldown: 2 },
      sounds: { ram: "sounds/slime-ram.mp3", slam: "sounds/slime-slam.mp3", move: "sounds/slime-move.mp3" },
    },

  // ===== Boss：古代遺跡的殲滅矩陣 =====
    matrixBoss: {
      name: "古代遺跡的殲滅矩陣", ai: "matrixBoss", boss: true,
      hp: 200, atk: 35, df: 10, spd: 10, ap: 13,
      moveCost: 1,                // 整體移動一次的行動點（移動半徑 = 速度 × 13）
      reserveAp: 4,               // 每回合保留給閃避的行動點（在玩家回合閃避一次花 2 點）
      // 閃避機率：攻擊來源距離 ≤ near 時是 minChance，≥ far 時是 maxChance，中間線性變化
      // 每成功閃一次，下一次的機率再 × fatigue（到 Boss 自己的回合重置）
      dodge: { near: 60, far: 450, minChance: 0.1, maxChance: 0.7, fatigue: 0.6 },
      preferDist: 210,            // 想跟玩家保持的距離（核心中心到玩家）
      r: 52,                      // 核心大小
      armLength: 205,             // 觸手長度（核心到矩陣）
      parts: [                    // 三個能量矩陣的方向（角度，0 = 右、90 = 下）
        { name: "左上矩陣", angle: -155 },
        { name: "右上矩陣", angle: -25 },
        { name: "下方矩陣", angle: 90 },
      ],
      part: { kind: "matrixNode", name: "能量矩陣", hp: 85, atk: 35, df: 10, spd: 0, ap: 0, r: 28 },
      // 核心立場：破壞 0 / 1 / 2 / 3 個矩陣時，核心受到的傷害倍率
      coreMult: [0, 0.5, 1, 1.5],
      incomingMult(b, core) {
        const broken = core.parts.filter((p) => !p.alive).length;
        return core.def.coreMult[broken];
      },

      reaction: 1.0,              // 有預告的攻擊（觸手、電流、激光）倒數秒數
      bullet: { speed: 260, r: 6 },   // 光彈飛行速度與大小
      // 以下傷害皆為暫定；weight = AI 選這招的機率權重
      swipe:    { ap: 1, half: 40, extra: 15, base: 8, weight: 3, knockback: 90 },   // 命中會擊退 knockback 距離   // 揮動觸手：以觸手根部為圓心的扇形（半角 40°，半徑 = 觸手長 + extra）
      electric: { ap: 1, radius: 115, base: 7, weight: 3, apDrain: 1 }, // 矩陣周圍電流，命中扣行動點（沒有就不扣）
      shot:     { ap: 1, waves: [1, 2, 1, 2], spread: 12, interval: 0.2, base: 4, weight: 3 }, // 核心射擊 1-2-1-2
      laser:    { ap: 2, width: 70, base: 12, weight: 2 },             // 寬激光
      ring:     { ap: 2, count: 12, base: 4, weight: 2 },               // 所有矩陣環狀擴散光彈
      // 大招：矩陣環狀光彈 + 核心朝三個方向（間隔 120°）射 1-2-1-2
      ult:      { ap: 3, firstRound: 3, every: 3, count: 12, waves: [1, 2, 1, 2], spread: 12, interval: 0.22, base: 4 },
      sounds: {
        tentacle: "sounds/boss-tentacle.mp3",
        electric: "sounds/boss-electric.mp3",
        bullet: "sounds/boss-bullet.mp3",
        laser: "sounds/boss-laser.mp3",
      },
    },
  },

  // ===== 房間 =====
  rooms: {
    tutorial: {
      name: "新手引導", desc: "羽澤璃央的戰鬥系統教學（固定使用伊爾舒）",
      script: "tutorial",              // 由 js/tutorial.js 的劇本控制
      forceChar: "ilshu_tutorial",     // 固定角色，不受選角影響
      playerStart: { x: 640, y: 470 },
      npcStart: { x: 640, y: 380 },
      wave: [],
      help: "跟著羽澤璃央的說明操作<br>對話框：點一下顯示全部，再點一下繼續（也可以按空白鍵）",
    },
    slimes: {
      name: "史萊姆測試房", desc: "3 隻史萊姆",
      playerStart: { x: 640, y: 600 },
      wave: [
        { kind: "slime", x: 330, y: 170 },
        { kind: "slime", x: 640, y: 120 },
        { kind: "slime", x: 950, y: 170 },
      ],
    },
    boss: {
      name: "古代遺跡", desc: "測試 Boss：古代遺跡的殲滅矩陣",
      playerStart: { x: 420, y: 640 },
      wave: [{ kind: "matrixBoss", x: 640, y: 230 }],
      bgm: "sounds/boss-bgm.mp3",
      help: "<b>核心有立場保護</b>：破壞 1 / 2 / 3 個能量矩陣後，核心受到 ×0.5 / ×1 / ×1.5 傷害<br><b>紅色範圍</b>＝觸手、電流、激光，倒數結束時判定<br><b>紅色光彈</b>沒有預告，看到就移動躲開",
    },
  },
};
