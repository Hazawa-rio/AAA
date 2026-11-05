// 共用數值。角色自己的數值在 js/characters/ 裡。
// 標「暫定」的都只是讓測試能跑的值。
window.RPG = window.RPG || {};

RPG.CONFIG = {
  arena: { w: 1000, h: 560 },
  grid: 40,             // 場地一格的大小
  body: 22,             // 單位碰撞半徑
  movePerSpd: 13,       // 移動半徑 = 速度 × 這個值
  moveCost: 1,          // 自己回合移動一次的行動點
  offTurnMultiplier: 2, // 非自己回合也能行動（大招除外），行動點消耗 × 2
  initiativeDie: 20,    // 每回合行動順序 = 1d20 + 速度
  aiDelay: 0.55,        // 敵人每個動作之間的停頓（秒），只影響觀感
  slamLeapTime: 0.45,   // 壓制時史萊姆跳到中心點的時間（秒）
  volume: 0.7,

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
  },

  // 測試房間：敵人種類與位置
  wave: [
    { kind: "slime", x: 260, y: 130 },
    { kind: "slime", x: 500, y: 90 },
    { kind: "slime", x: 740, y: 130 },
  ],
};
