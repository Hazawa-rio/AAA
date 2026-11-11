/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/config.js": "20261112030517" });
// 共用數值。角色自己的數值在 js/characters/ 裡。
// 標「暫定」的都只是讓測試能跑的值。
window.RPG = window.RPG || {};

const WOLF_HELP = "<b>魔狼</b>：成群行動。<b>撕咬</b>＝貼身的短紅框・<b>飛撲</b>＝很長的紅框，打完會衝到終點<br><b>草叢</b>：站在裡面的單位（敵我都一樣）受到攻擊時 40% 打空；任何攻擊碰到草叢都會把它破壞";

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
      lowIntel: true,            // 低智力：會被召喚物（例如巨大蘑菇）吸引
      hp: 60, atk: 16, df: 2, spd: 6, ap: 3,        // 暫定
      moveCost: 1,
      // 撞擊：正前方短距離長方形，出現紅框後玩家有 reaction 秒可以閃避
      ram: { ap: 1, length: 110, width: 64, base: 8, reaction: 1.0 },
      // 壓制：遠距離放的大圓，蓄力到「下次輪到史萊姆」才發動，發動時史萊姆跳到中心點
      // cooldown = 發動後要再做幾次行動才能再用
      slam: { ap: 2, range: 340, radius: 115, base: 14, cooldown: 2 },
      sounds: { ram: "sounds/slime-ram.mp3", slam: "sounds/slime-slam.mp3", move: "sounds/slime-move.mp3" },
      drops: [{ item: "slimeGel", chance: 0.7 }],   // 打倒後掉落（地圖戰鬥才有）
    },

    // 彈跳噩夢：會動的布丁進了微波爐變成的小 Boss（史萊姆的變體，越彈越大）
    nightmare: {
      name: "彈跳噩夢", ai: "nightmare", bigBar: true, meltOnDeath: ["pinkSlime"], color: "#e87aa8", fill: "rgba(244,160,192,.16)",
      hp: 220, atk: 17, df: 4, spd: 8, ap: 4, r: 40,       // 暫定（Lv 1～10 單人打得過）
      // 泡泡糖：往四周噴出好幾團泡泡糖（紅色圓圈），黏在地上的會變成粉色史萊姆
      gum: { ap: 2, every: 3, first: 2, count: 5, range: 330, radius: 58, base: 10, reaction: 1.1, spawn: 2, max: 3 },
      moveCost: 1,
      ram: { ap: 1, length: 130, width: 80, base: 9, reaction: 1.0 },
      slam: { ap: 2, range: 420, radius: 140, base: 14, cooldown: 1 },
      sounds: { ram: "sounds/slime-ram.mp3", slam: "sounds/slime-slam.mp3", move: "sounds/slime-move.mp3" },
      drops: [{ item: "slimeGel", chance: 1, n: 2 }],
    },

    // 粉色史萊姆：彈跳噩夢噴出來的泡泡糖黏在地上變成的
    pinkSlime: {
      name: "粉色史萊姆", ai: "slime", lowIntel: true, color: "#e86aa0", fill: "rgba(244,160,192,.25)",
      hp: 26, atk: 11, df: 1, spd: 6, ap: 2, moveCost: 1,
      ram: { ap: 1, length: 100, width: 60, base: 7, reaction: 1.0 },
      slam: { ap: 2, range: 300, radius: 100, base: 10, cooldown: 3 },
      sounds: { ram: "sounds/slime-ram.mp3", slam: "sounds/slime-slam.mp3", move: "sounds/slime-move.mp3" },
    },

  // ===== 海盜（追查搶劫漁船的海盜） =====
    // 海盜：沿用魔狼的 AI（成群包抄、貼身揮刀、遠距離跳幫）
    pirate: {
      name: "海盜", ai: "wolf", lowIntel: true,
      hp: 45, atk: 14, df: 3, spd: 9, ap: 3, moveCost: 1,      // 暫定
      bite: { name: "揮刀", ap: 1, length: 85, width: 70, base: 11, reaction: 0.9, sound: "sounds/pirate-slash.mp3" },
      pounce: { name: "跳幫", ap: 2, length: 240, width: 60, base: 13, reaction: 1.0, cooldown: 2, sound: "sounds/wolf-pounce.mp3" },
      flank: 0.8,
      sounds: { move: "sounds/slime-move.mp3" },
    },
    // 萬聖節旅館的幽靈扮演者：披著白床單到處嚇人（旅館的戰鬥是互相嚇唬：傷害＝驚嚇值）
    ghostActor: {
      name: "幽靈扮演者", ai: "wolf", lowIntel: true,
      hp: 40, atk: 12, df: 2, spd: 9, ap: 3, moveCost: 1, r: 30,      // 暫定
      bite: { name: "「哇！」", ap: 1, length: 90, width: 80, base: 10, reaction: 0.9, sound: "sounds/ilshu-demon.mp3" },
      pounce: { name: "飄過來", ap: 2, length: 260, width: 70, base: 12, reaction: 1.0, cooldown: 2, sound: "sounds/wolf-move.mp3" },
      flank: 0.9,
      sounds: { move: "sounds/slime-move.mp3" },
    },
    // ===== 萬聖節旅館的扮演者們（旅館的戰鬥是互相嚇唬：傷害＝驚嚇值） =====
    werewolfActor: {
      name: "狼人扮演者", ai: "wolf", lowIntel: true, color: "#7a5a3a",
      hp: 46, atk: 13, df: 2, spd: 10, ap: 3, moveCost: 1, r: 30,      // 暫定
      bite: { name: "對著臉嚎叫", ap: 1, length: 95, width: 80, base: 11, reaction: 0.9, sound: "sounds/wolf-howl-short.mp3", words: ["嗷嗚——！"] },
      pounce: { name: "四腳著地撲過來", ap: 2, length: 270, width: 70, base: 13, reaction: 1.0, cooldown: 2, sound: "sounds/wolf-pounce.mp3" },
      flank: 0.9, sounds: { move: "sounds/wolf-move.mp3" },
    },
    mummyActor: {
      name: "木乃伊扮演者", ai: "wolf", lowIntel: true, color: "#b89a5a",
      hp: 56, atk: 12, df: 3, spd: 6, ap: 3, moveCost: 1, r: 30,
      bite: { name: "繃帶甩過來", ap: 1, length: 120, width: 70, base: 11, reaction: 1.0, sound: "sounds/ilshu-slash.mp3", words: ["還——給——我——"] },
      pounce: { name: "拖著腳逼近", ap: 2, length: 190, width: 80, base: 12, reaction: 1.2, cooldown: 2, sound: "sounds/slime-move.mp3" },
      flank: 0.6, sounds: { move: "sounds/slime-move.mp3" },
    },
    zombieActor: {
      name: "喪屍住戶", ai: "wolf", lowIntel: true, color: "#5a8a4a",
      hp: 40, atk: 12, df: 2, spd: 6, ap: 3, moveCost: 1, r: 28,
      bite: { name: "「蛋糕……」", ap: 1, length: 90, width: 80, base: 10, reaction: 1.0, sound: "sounds/wolf-bite.mp3", words: ["蛋——糕——"] },
      pounce: { name: "撲向蛋糕", ap: 2, length: 200, width: 80, base: 12, reaction: 1.2, cooldown: 3, sound: "sounds/wolf-pounce.mp3" },
      flank: 1.1, sounds: { move: "sounds/slime-move.mp3" },
    },
    bat: {
      name: "蝙蝠眷屬", ai: "wolf", lowIntel: true, color: "#4a3a5a",
      hp: 16, atk: 9, df: 1, spd: 12, ap: 3, moveCost: 1, r: 20,
      bite: { name: "吱吱亂叫", ap: 1, length: 80, width: 60, base: 7, reaction: 0.8, sound: "sounds/wolf-bite.mp3", words: ["吱！"] },
      pounce: { name: "俯衝", ap: 2, length: 260, width: 50, base: 9, reaction: 0.9, cooldown: 2, sound: "sounds/wolf-pounce.mp3" },
      flank: 1.2, sounds: { move: "sounds/wolf-move.mp3" },
    },
    // 302 號房的吸血伯爵：披風一甩、蝙蝠群、叫來蝙蝠眷屬
    vampire: {
      name: "吸血伯爵", ai: "captain", bigBar: true, color: "#8a1a2a",
      hp: 200, atk: 16, df: 5, spd: 9, ap: 4, moveCost: 1, r: 32,      // 暫定（C 級）
      sweep: { name: "披風一甩", ap: 2, radius: 135, base: 14, reaction: 1.0, cooldown: 1, sound: "sounds/ilshu-slash-strong.mp3", words: ["跪下吧！"] },
      shot: { name: "放出蝙蝠群", ranged: true, ap: 2, length: 600, width: 46, base: 13, reaction: 1.0, cooldown: 1, sound: "sounds/wolf-pounce.mp3", words: ["吾乃夜之伯爵！", "陽光？不存在的！"] },
      call: { kind: "bat", ap: 2, every: 3, max: 2, line: "飛吧，我的孩子們！" },
      sounds: { move: "sounds/wolf-move.mp3" },
    },
    // 午夜嚇人比賽的三位 Boss（連戰，各別都不算很強）
    samuraiArmor: {
      name: "武士盔甲", ai: "samurai", bigBar: true, color: "#3a3a48",
      hp: 120, atk: 15, df: 7, spd: 7, ap: 4, moveCost: 1, r: 32,      // 暫定：黑馬選手，盔甲很硬、動作慢
      bite: { name: "斬", ap: 1, length: 110, width: 70, base: 11, reaction: 0.9, sound: "sounds/ilshu-slash.mp3" },
      spin: { name: "迴旋斬", ap: 2, radius: 135, base: 13, reaction: 1.1, cooldown: 1, sound: "sounds/alpha-spin.mp3", words: ["喝！"] },
      rend: { name: "居合・一閃", ap: 2, length: 380, width: 46, base: 15, reaction: 1.0, cooldown: 2, sound: "sounds/ilshu-slash-strong.mp3", words: ["一閃。"] },
      // 收刀呼氣：這一回合不再動作；被打就立刻反擊「鬼一文字」
      stance: { name: "收刀呼氣", ap: 1, every: 3, range: 520, sound: "sounds/firsler-smoke.mp3" },
      counter: { name: "鬼一文字", length: 760, width: 300, base: 24, reaction: 0.55, sound: "sounds/ilshu-slash-strong.mp3" },
      sounds: { move: "sounds/robot-move.mp3" },
    },
    greatWhite: {
      name: "大白鯊", ai: "shark", bigBar: true, color: "#5a7a98",
      hp: 130, atk: 16, df: 3, spd: 11, ap: 4, moveCost: 1, r: 36,     // 暫定：熱門選手，又快又兇
      bite: { name: "大口一咬", ap: 1, length: 110, width: 90, base: 12, reaction: 0.9, sound: "sounds/wolf-bite.mp3", words: ["噹噹——噹噹——"] },
      spin: { name: "甩尾", ap: 2, radius: 140, base: 12, reaction: 1.0, cooldown: 1, sound: "sounds/alpha-spin.mp3" },
      rend: { name: "破地衝出", ap: 2, length: 460, width: 90, base: 15, reaction: 1.1, cooldown: 2, sound: "sounds/alpha-rend.mp3", words: ["噹噹噹噹！"] },
      // 深海狂潛：潛進地底（打不到、看不到），地上留下預告圓圈，下次輪到牠時從那裡衝出來
      dive: { name: "深海狂潛", ap: 2, every: 3, radius: 120, base: 18, sound: "sounds/slime-slam.mp3" },
      sounds: { move: "sounds/slime-move.mp3" },
    },
    reaper: {
      name: "死神", ai: "reaper", bigBar: true, color: "#9a4aa0",
      hp: 170, atk: 16, df: 4, spd: 9, ap: 4, moveCost: 1, r: 36,      // 暫定：衛冕選手
      sweep: { name: "揮動鐮刀", ap: 2, radius: 150, base: 14, reaction: 1.1, cooldown: 1, sound: "sounds/ilshu-slash-strong.mp3" },
      shot: { name: "地獄火", ap: 2, length: 620, width: 44, base: 13, reaction: 1.0, cooldown: 1, sound: "sounds/firsler-burst.mp3" },
      mark: { name: "你是下一個！", ap: 1, every: 3, last: 3, sound: "sounds/ilshu-demon.mp3" },
      ult: { name: "你的靈魂歸我所有！", warn: "哈哈哈哈哈哈！墮入地獄吧！！", count: 12, radius: 85, base: 14, reaction: 1.3, sound: "sounds/ilshu-demon.mp3" },
      call: { kind: "ghostActor", ap: 2, every: 3, max: 2, line: "來吧，迷途的亡魂。" },
      sounds: { move: "sounds/wolf-move.mp3" },
    },

    // ===== 午夜郵局：信裡夾帶的情緒變成的煙霧（會噴出文字攻擊） =====
    selfBlame: {
      name: "自責", ai: "gunner", color: "#6a5a8a",
      hp: 34, atk: 12, df: 2, spd: 7, ap: 3, moveCost: 1, r: 28, keep: 190,       // 暫定
      shot: { name: "喃喃自語", ranged: true, ap: 2, length: 520, width: 34, base: 11, reaction: 1.1, sound: "sounds/ilshu-demon.mp3", words: ["都是我的錯", "我不夠好", "又搞砸了", "對不起"] },
      sounds: { move: "sounds/slime-move.mp3" },
    },
    regret: {
      name: "悔恨", ai: "wolf", color: "#8a2a3a",
      hp: 48, atk: 15, df: 3, spd: 7, ap: 3, moveCost: 1, r: 32,
      bite: { name: "沉重的嘆息", ap: 1, length: 100, width: 90, base: 13, reaction: 1.0, sound: "sounds/slime-ram.mp3", words: ["要是那時候……", "為什麼沒說出口"] },
      pounce: { name: "壓上來", ap: 2, length: 230, width: 84, base: 14, reaction: 1.1, cooldown: 2, sound: "sounds/slime-slam.mp3", words: ["早知道就……"] },
      flank: 0.7, sounds: { move: "sounds/slime-move.mp3" },
    },
    longing: {
      name: "思念", ai: "gunner", color: "#3a6ab0",
      hp: 30, atk: 12, df: 2, spd: 8, ap: 3, moveCost: 1, r: 26, keep: 260,
      shot: { name: "寄不出去的話", ranged: true, ap: 2, length: 660, width: 26, base: 11, reaction: 1.0, sound: "sounds/guan-chime.mp3", words: ["好想你", "你過得好嗎", "再見一面就好"] },
      sounds: { move: "sounds/slime-move.mp3" },
    },
    joy: {
      name: "快樂", ai: "wolf", color: "#d9a01a",
      hp: 28, atk: 9, df: 1, spd: 11, ap: 3, moveCost: 1, r: 24,
      bite: { name: "笑聲", ap: 1, length: 90, width: 70, base: 8, reaction: 0.9, sound: "sounds/slime-ram.mp3", words: ["哈哈哈！"] },
      pounce: { name: "蹦過來", ap: 2, length: 260, width: 60, base: 9, reaction: 1.0, cooldown: 2, sound: "sounds/slime-slam.mp3", words: ["好開心！", "今天真好！"] },
      flank: 1.2, sounds: { move: "sounds/slime-move.mp3" },
    },
    regretBig: {
      name: "信裡的悔恨", ai: "captain", bigBar: true, color: "#8a2a3a",
      hp: 210, atk: 16, df: 4, spd: 8, ap: 4, moveCost: 1, r: 44,     // 暫定（C 級 Boss）
      sweep: { name: "後悔的漩渦", ap: 2, radius: 150, base: 14, reaction: 1.1, cooldown: 1, sound: "sounds/slime-slam.mp3", words: ["對不起"] },
      shot: { name: "沒說出口的話", ranged: true, ap: 2, length: 620, width: 44, base: 13, reaction: 1.0, cooldown: 1, sound: "sounds/ilshu-demon.mp3", words: ["我不該那樣說", "原諒我", "那天我錯了"] },
      call: { kind: "selfBlame", ap: 2, every: 3, max: 2, line: "……都是我的錯。" },
      sounds: { move: "sounds/slime-move.mp3" },
    },
    longingBig: {
      name: "堆積的思念", ai: "captain", bigBar: true, color: "#3a6ab0",
      hp: 190, atk: 15, df: 4, spd: 8, ap: 4, moveCost: 1, r: 44,
      sweep: { name: "沉積的回憶", ap: 2, radius: 150, base: 13, reaction: 1.1, cooldown: 1, sound: "sounds/slime-slam.mp3", words: ["還記得嗎"] },
      shot: { name: "寄不到的信", ranged: true, ap: 2, length: 660, width: 40, base: 13, reaction: 1.0, cooldown: 1, sound: "sounds/guan-chime.mp3", words: ["收件人不詳", "查無此人", "請轉交給……"] },
      call: { kind: "longing", ap: 2, every: 3, max: 2, line: "還有好多話沒說。" },
      sounds: { move: "sounds/slime-move.mp3" },
    },
    // 火槍手：保持距離開火（很長很細的紅框）
    pirateGunner: {
      name: "海盜火槍手", ai: "gunner",
      hp: 35, atk: 14, df: 2, spd: 8, ap: 3, moveCost: 1,      // 暫定
      shot: { name: "開火", ranged: true, ap: 2, length: 620, width: 30, base: 12, reaction: 1.1, sound: "sounds/pirate-gun.mp3" },
      keep: 200,                  // 太近就往後退
      sounds: { move: "sounds/slime-move.mp3" },
    },
    // 海盜船長・黑鰭（Boss）
    pirateCaptain: {
      name: "海盜船長・黑鰭", ai: "captain", bigBar: true,
      hp: 260, atk: 18, df: 6, spd: 10, ap: 4, moveCost: 1, r: 30,     // 暫定（C 級：單人 Lv 1～10）
      sweep: { ap: 2, radius: 130, base: 14, reaction: 1.0, cooldown: 1, sound: "sounds/ilshu-slash-strong.mp3" },     // 橫掃：自己周圍
      shot: { ranged: true, ap: 2, length: 620, width: 34, base: 15, reaction: 1.0, cooldown: 1, sound: "sounds/pirate-gun.mp3" },   // 火槍
      call: { ap: 2, every: 3, max: 2 },                                                                            // 「上啊！」叫來海盜
      sounds: { move: "sounds/slime-move.mp3" },
    },

  // ===== 變異發泡水母：用怪異樹莓當餌釣上來的稀世珍品 =====
    // 平常躲在海裡，只在船邊探出紅色的變異硬殼（防禦非常高）向船上噴泡沫
    // 每隔幾回合跳出海面、在空中揮動觸手灑下大量泡沫——這時脆弱的本體露出來（防禦很低），到牠下次行動前都打得動
    jelly: {
      name: "變異發泡水母", ai: "jelly", bigBar: true,
      hp: 240, atk: 16, df: 2, spd: 8, ap: 4, r: 40,  // 暫定
      shellDf: 40,                // 硬殼的防禦
      foam: { ap: 2, count: 3, radius: 70, base: 12, reaction: 1.1, spread: 140 },     // 從船邊噴泡沫（瞄準玩家附近）
      burst: { ap: 4, count: 8, radius: 72, base: 13, reaction: 1.4, every: 3 },      // 跳出海面灑泡沫
      sounds: { slam: "sounds/slime-slam.mp3", move: "sounds/slime-move.mp3" },
    },

  // ===== 魔狼：草原上成群行動，看到人就撲上來 =====
    wolf: {
      name: "魔狼", ai: "wolf",
      lowIntel: true,
      hp: 50, atk: 15, df: 2, spd: 9, ap: 3,         // 暫定
      moveCost: 1,
      // 撕咬：貼身的短長方形（有預告）
      bite: { ap: 1, length: 90, width: 60, base: 12, reaction: 0.8, sound: "sounds/wolf-bite.mp3" },
      // 飛撲：遠距離長方形，結算後魔狼衝到終點（有預告）
      pounce: { ap: 2, length: 280, width: 64, base: 16, reaction: 1.0, cooldown: 2, sound: "sounds/wolf-pounce.mp3" },
      flank: 0.9,                 // 成群行動：多隻時從不同方向包抄（弧度）
      sounds: { move: "sounds/wolf-move.mp3" },
      drops: [{ item: "wolfFang", chance: 0.5 }, { item: "wolfMeat", chance: 0.65 }],
    },
    // 異變魔狼領頭：吃了怪異樹莓的魔狼。體型更大，身體兩側長出對稱的骨刃
    // C 級時空的 Boss：單人 Lv 1～10 打得過（多人之後會有依人數調整難度的機制）
    alphaWolf: {
      name: "異變魔狼領頭", ai: "alphaWolf", bigBar: true,
      hp: 300, atk: 18, df: 5, spd: 10, ap: 4,       // 暫定
      moveCost: 1, r: 42,
      bite: { ap: 1, length: 110, width: 76, base: 12, reaction: 0.9, sound: "sounds/wolf-bite.mp3" },
      // 雙刃迴旋：以自己為中心的大圓（兩側骨刃一起轉）
      spin: { ap: 2, radius: 160, base: 16, reaction: 1.1, cooldown: 1, sound: "sounds/alpha-spin.mp3" },
      // 撕裂撲擊：很長的長方形，結算後衝到終點
      rend: { ap: 2, length: 360, width: 96, base: 18, reaction: 1.1, cooldown: 2, sound: "sounds/alpha-rend.mp3" },
      // 狼嚎：叫來一隻魔狼（場上魔狼少於 2 隻時，每 4 回合最多一次）
      howl: { ap: 2, every: 4, max: 2, sound: "sounds/wolf-howl.mp3" },
      sounds: { move: "sounds/wolf-move.mp3" },
      drops: [{ item: "wolfFang", chance: 1, n: 3 }, { item: "wolfMeat", chance: 1, n: 2 }],
    },

  // ===== Boss：古代遺跡的殲滅矩陣 =====
    matrixBoss: {
      name: "古代遺跡的殲滅矩陣", ai: "matrixBoss", boss: true,
      hp: 200, atk: 35, df: 10, spd: 10, ap: 13,
      moveCost: 1,                // 整體移動一次的行動點（移動半徑 = 速度 × 13）
      reserveAp: 4,               // 每回合保留給閃避的行動點（在玩家回合閃避一次花 2 點）
      // 閃避機率：攻擊來源距離 ≤ near 時是 minChance，≥ far 時是 maxChance，中間線性變化
      // 每成功閃一次，下一次的機率再 × fatigue（到 Boss 自己的回合重置）
      dodge: { near: 60, far: 450, minChance: 0.1, maxChance: 0.7, fatigue: 0.6, minSharp: 0.3, maxSharp: 0.8 },   // sharp：選到正確方向的機率
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

  // ===== 試煉 Boss：受難之日（給 40 等左右的玩家） =====
    // 第一階段不會移動；扣掉 45% 生命後進入第二階段「褻瀆者的受難之日」
    passion: {
      name: "受難之日", name2: "褻瀆者的受難之日", ai: "passion", boss: true, bigBar: true,
      hp: 3200, atk: 60, df: 14, spd: 14, ap: 7,           // 暫定
      r: 46,
      moveCost: 1,               // 第二階段才會移動（移動半徑 = 速度 × 13）
      reserveAp: 2,              // 第一階段：留給「搶先出手」；第二階段：留給閃避
      phase2At: 0.55,            // 生命剩 55%（扣掉 45%）時變身
      reaction: 1.1,             // 有預告的攻擊倒數秒數
      preemptChance: 0.35,       // 第一階段：玩家回合靠近時，花雙倍行動點搶先揮劍的機率（每個玩家回合最多一次）
      dodge: { near: 60, far: 450, minChance: 0.1, maxChance: 0.6, fatigue: 0.6, minSharp: 0.4, maxSharp: 0.85 },
      preferDist: 260,           // 第二階段想跟玩家保持的距離
      // 揮砍：往上下左右其中一個方向（第二階段兩個方向）揮出大範圍斬擊
      slash: { ap: 1, length: 560, width: 300, base: 40, weight: 3 },
      // 制裁：劍尖指向玩家的細長雷射（第二階段連射三發）
      judgment: { ap: 1, width: 34, base: 30, weight: 3, shots2: 3, interval2: 0.45, reaction2: 0.8 },
      // 無序者的救贖：把劍插進地面蓄力，下次輪到它時從自己往外擴散到全圖的同心圓
      redemption: { ap: 2, first: 70, band: 56, gap: 92, base: 36, heal: 30, weight: 2, cooldown: 2 },
      // 這便是苦難：舉起右手，指尖連續放出兩道（第二階段三道）擴散圓環
      suffering: { ap: 1, radius: 290, base: 22, count: 2, count2: 3, gapMin: 0.4, gapMax: 0.7, weight: 2 },
      // 受苦的詛咒：教徒或教皇倒下時馬上復活一隻（行動點不夠就扣 2% 生命）。第二階段失去這招
      curse: { ap: 2, hpCost: 0.02 },
      minionLoss: { cultist: 0.03, pope: 0.1 },   // 教徒、教皇被擊殺時，偽神失去的生命比例
      // 大招「神的狂怒」：變身時立刻使用，之後每 5 回合一次。全地圖隨機降下 13 道光柱
      ult: { ap: 3, every: 5, count: 13, radius: 78, base: 30, interval: 0.28, reaction: 1.1, aimEvery: 3 },
      xpNote: "建議 Lv 40",
      sounds: {
        slash: "sounds/ilshu-slash-strong.mp3",
        laser: "sounds/boss-laser.mp3",
        bell: "sounds/passion-bell.mp3",
      },
    },
    cultist: {
      name: "復甦的混亂教徒", ai: "cultist", minion: "cultist",
      lowIntel: true,            // 低智力：會被召喚物吸引
      hp: 130, atk: 48, df: 10, spd: 10, ap: 2,            // 暫定
      moveCost: 1,
      // 揮砍十字架：前方扇形，有預告
      swing: { ap: 1, radius: 100, half: 55, base: 18, reaction: 0.9 },
      buffPer: 0.3, buffMax: 3,   // 被教皇的圓環碰到：傷害 +30%（最多 3 層）
      sounds: { swing: "sounds/boss-tentacle.mp3" },
    },
    pope: {
      name: "復甦的混亂教皇", ai: "pope", minion: "pope",
      hp: 220, atk: 44, df: 12, spd: 8, ap: 3,             // 暫定
      moveCost: 1,
      // 擴散圓環：以自己為中心，打到玩家造成傷害，碰到教徒讓教徒變強
      ring: { ap: 1, radius: 230, base: 20, reaction: 1.0 },
      // 聖牢籠：框住一塊區域，困在裡面無法離開，自己回合以外的每個敵人回合開始都受傷，被攻擊 5 次才破
      cage: { ap: 2, size: 200, hits: 5, base: 20, reaction: 1.4 },
      keepDist: 240,
      sounds: { bell: "sounds/passion-bell.mp3" },
    },
    holyCage: { name: "聖牢籠", ai: "cage", hp: 5, atk: 44, df: 0, spd: 0, ap: 0 },
  },

  // ===== 房間 =====
  // 地形：房間設定 terrain 指定
  terrain: {
    grass: {
      bushes: [3, 5],          // 草叢數量（隨機）
      bushR: [46, 66],         // 草叢半徑
      evade: 0.4,              // 站在草叢裡受到攻擊時打空的機率（敵我都一樣）
    },
  },
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
      bgm: "sounds/bgm-battle.mp3",
      xp: 150,                         // 勝利獲得的經驗值（暫定）
      coins: 30,                       // 勝利獲得的時空幣（局外貨幣，暫定）
      playerStart: { x: 640, y: 600 },
      wave: [
        { kind: "slime", x: 330, y: 170 },
        { kind: "slime", x: 640, y: 120 },
        { kind: "slime", x: 950, y: 170 },
      ],
    },
    // 地圖探索撞到魔物時的戰鬥（不出現在房間列表）；variant = 地圖上魔物群的種類
    encounter: {
      name: "遭遇戰", desc: "地圖探索中的戰鬥", hidden: true,
      // 可以撤退：離最近的敵人越遠，成功率越高（near 以內最低、far 以外最高）；失敗會直接結束回合
      retreat: { min: 0.15, max: 0.9, near: 120, far: 650 },
      terrain: "grass",            // 草原：草地背景、隨機草叢
      bgm: "sounds/bgm-battle.mp3",  // 一般戰鬥通用 BGM
      help: '<b>草叢</b>：站在裡面的單位（敵我都一樣）受到攻擊時 40% 打空；任何攻擊碰到草叢都會把它破壞<br><b>紅色方框</b>＝撞擊，倒數結束時打中框內<br><b>紅色虛線圓</b>＝壓制，下次輪到那隻史萊姆時落下',
      variants: {
        grassSlimes: {
          name: "草原的魔物", desc: "兩隻史萊姆（暫用）", xp: 40, gold: [12, 20],
          playerStart: { x: 640, y: 600 },
          wave: [{ kind: "slime", x: 480, y: 170 }, { kind: "slime", x: 800, y: 170 }],
        },
        slimePack: {
          name: "草原的魔物群", desc: "三隻史萊姆（暫用）", xp: 70, gold: [20, 35],
          playerStart: { x: 640, y: 600 },
          wave: [{ kind: "slime", x: 330, y: 170 }, { kind: "slime", x: 640, y: 120 }, { kind: "slime", x: 950, y: 170 }],
        },
        wolfPack: {
          name: "魔狼群", desc: "兩隻魔狼", xp: 60, gold: [18, 28],
          playerStart: { x: 640, y: 600 },
          wave: [{ kind: "wolf", x: 520, y: 150 }, { kind: "wolf", x: 760, y: 150 }],
          help: WOLF_HELP,
        },
        wolfPack3: {
          name: "魔狼群", desc: "三隻魔狼", xp: 90, gold: [26, 40],
          playerStart: { x: 640, y: 600 },
          wave: [{ kind: "wolf", x: 360, y: 170 }, { kind: "wolf", x: 640, y: 120 }, { kind: "wolf", x: 920, y: 170 }],
          help: WOLF_HELP,
        },
        alphaWolf: {
          name: "果樹下的異變魔狼", desc: "異變魔狼領頭與一隻魔狼", level: "建議 Lv 5～10", xp: 400, gold: [90, 120],
          bgm: "sounds/boss-bgm.mp3",          // 和古代遺跡同一首
          playerStart: { x: 640, y: 620 },
          wave: [{ kind: "alphaWolf", x: 640, y: 190 }, { kind: "wolf", x: 380, y: 230 }],
          help: WOLF_HELP + "<br><b>雙刃迴旋</b>＝以領頭為中心的大圓・<b>撕裂撲擊</b>＝很長的紅框，打完會衝到終點",
        },
      },
    },
    // 追查海盜：搭老伯恩的船突襲海盜船（玩家只能在自己的船上）
    pirates: {
      name: "西岸礁石後的海盜船", desc: "追查海盜：突襲", hidden: true,
      terrain: "sea", bgm: "sounds/bgm-battle.mp3",
      walk: { x: 200, y: 250, w: 480, h: 220 },
      pirateShip: { x: 850, y: 210, w: 380, h: 300 },
      retreat: { min: 0.15, max: 0.9, near: 120, far: 650 },
      xp: 350, gold: [60, 90],
      playerStart: { x: 440, y: 360 },
      wave: [{ kind: "pirateCaptain", x: 1100, y: 360 }, { kind: "pirate", x: 900, y: 270 }, { kind: "pirate", x: 900, y: 450 }, { kind: "pirateGunner", x: 1040, y: 250 }],
      help: "<b>只能在自己的船上移動</b>，海盜會跳過來。<b>海盜</b>：揮刀（短紅框）、跳幫（長紅框並衝過來）・<b>火槍手</b>：保持距離開火（很長很細的紅框）・<b>黑鰭</b>：橫掃（自己周圍的圓）、火槍、叫來手下",
    },
    // 海上釣魚釣到的變異發泡水母：玩家只能在船上移動
    // 萬聖節旅館：沒有真正意義的戰鬥，是用技能和武器互相嚇唬（沒有血條，只有驚嚇值）
    scare: {
      name: "嚇唬", desc: "萬聖節旅館的戰鬥", hidden: true, scare: true,
      terrain: "hotel", bgm: "sounds/bgm-battle.mp3",
      retreat: { min: 0.15, max: 0.9, near: 120, far: 650 },
      help: "<b>這裡沒有血條</b>：受到攻擊會累積<b>驚嚇值</b>，滿了就<b>嚇破膽</b>；回復＝降低驚嚇值。<b>幽靈扮演者</b>：「哇！」（短紅框）、飄過來（長紅框並衝過來）",
      variants: {
        ghostActor: {
          name: "幽靈扮演者", desc: "樓梯間跳出來的幽靈扮演者", xp: 45, gold: [10, 18],
          playerStart: { x: 640, y: 600 },
          wave: [{ kind: "ghostActor", x: 640, y: 170 }],
        },
        ghostPair: {
          name: "幽靈扮演者們", desc: "兩個幽靈扮演者", xp: 80, gold: [18, 30],
          playerStart: { x: 640, y: 600 },
          wave: [{ kind: "ghostActor", x: 480, y: 160 }, { kind: "ghostActor", x: 800, y: 160 }],
        },
        werewolf: {
          name: "太入戲的狼人", desc: "櫃檯前不肯排隊的狼人扮演者", xp: 50, gold: [10, 16], retreat: null,
          playerStart: { x: 640, y: 600 },
          wave: [{ kind: "werewolfActor", x: 640, y: 170 }],
        },
        mummy: {
          name: "抱著床單的木乃伊", desc: "不肯交出床單的木乃伊扮演者", xp: 55, gold: [10, 16],
          playerStart: { x: 640, y: 600 },
          wave: [{ kind: "mummyActor", x: 640, y: 170 }],
        },
        zombies: {
          name: "聞到蛋糕的喪屍", desc: "衝向腦漿蛋糕的喪屍住戶", xp: 60, gold: [8, 14],
          playerStart: { x: 640, y: 600 },
          wave: [{ kind: "zombieActor", x: 500, y: 160 }, { kind: "zombieActor", x: 780, y: 180 }],
        },
        vampire: {
          name: "302 號房的吸血伯爵", desc: "302 號房的吸血伯爵", xp: 260, gold: [50, 70], retreat: null,
          bgm: "sounds/boss-bgm.mp3",
          playerStart: { x: 640, y: 620 },
          wave: [{ kind: "vampire", x: 640, y: 190 }, { kind: "bat", x: 460, y: 230 }],
          help: "<b>吸血伯爵</b>：披風一甩（自己周圍的圓）、放出蝙蝠群（很長的紅框，伯爵不會衝出去）、叫來蝙蝠眷屬。把他嚇到滿意為止",
        },
        // 午夜嚇人比賽：連續四場（不能撤退；驚嚇值會延續到下一場）
        contest1: {
          intro: "骷骷：「喀喀喀！午夜嚇人比賽，預賽開始！參賽者有點多，評審請自求多福！」",
          name: "午夜嚇人比賽・預賽", desc: "一波報名的小怪", xp: 90, gold: [16, 24], retreat: null,
          playerStart: { x: 640, y: 600 },
          wave: [{ kind: "ghostActor", x: 420, y: 170 }, { kind: "werewolfActor", x: 640, y: 140 }, { kind: "ghostActor", x: 860, y: 170 }, { kind: "zombieActor", x: 640, y: 280 }],
          help: "<b>連續戰鬥</b>：四場比賽中間不回地圖，驚嚇值會延續到下一場，也不能撤退",
        },
        contest2: {
          intro: "骷骷：「黑馬選手——武士盔甲！聽說它收刀呼氣的時候，千萬別出手！」",
          name: "黑馬選手・武士盔甲", desc: "戴著頭盔、拿著刀的方塊", xp: 120, gold: [20, 30], retreat: null,
          playerStart: { x: 640, y: 600 },
          wave: [{ kind: "samuraiArmor", x: 640, y: 190 }],
          help: "<b>武士盔甲</b>：盔甲很硬、動作慢。迴旋斬（自己周圍的圓）、居合・一閃（很長很細的紅框，砍完會衝過去）",
        },
        contest3: {
          intro: "骷骷：「熱門選手——大白鯊！咦，牠跑哪去了？評審，小心腳下！」",
          name: "熱門選手・大白鯊", desc: "從地板裡衝出來的大白鯊", xp: 130, gold: [20, 30], retreat: null,
          playerStart: { x: 640, y: 600 },
          wave: [{ kind: "greatWhite", x: 640, y: 190 }],
          help: "<b>大白鯊</b>：又快又兇。甩尾（自己周圍的圓）、破地衝出（很長很寬的紅框，衝過去）",
        },
        contest4: {
          intro: "骷骷：「衛冕選手——死神！連勝七千多年的傳說！被他指到的人……喀、喀喀……」",
          name: "衛冕選手・死神", desc: "會把住戶移到「地獄」的死神", xp: 180, gold: [30, 45], retreat: null,
          bgm: "sounds/boss-bgm.mp3",
          playerStart: { x: 640, y: 620 },
          wave: [{ kind: "reaper", x: 640, y: 190 }],
          help: "<b>死神</b>：鐮刀橫掃（自己周圍的圓）、勾魂（很長的紅框）、叫來亡魂（幽靈扮演者）",
        },
      },
    },
    // 午夜郵局：信裡夾帶的情緒變成的煙霧
    post: {
      name: "午夜郵局", desc: "午夜郵局的戰鬥", hidden: true,
      terrain: "post", bgm: "sounds/bgm-battle.mp3",
      retreat: { min: 0.15, max: 0.9, near: 120, far: 650 },
      help: "<b>情緒煙霧</b>會噴出文字攻擊。<b>自責</b>、<b>思念</b>：保持距離噴字（很長的紅框）・<b>悔恨</b>：貼身的嘆息、壓上來・<b>快樂</b>：又快又吵",
      variants: {
        selfBlame: { name: "自責", desc: "兩團自責", xp: 60, gold: [10, 18], playerStart: { x: 640, y: 600 }, wave: [{ kind: "selfBlame", x: 460, y: 170 }, { kind: "selfBlame", x: 820, y: 170 }] },
        regret: { name: "悔恨", desc: "悔恨和自責", xp: 70, gold: [12, 20], playerStart: { x: 640, y: 600 }, wave: [{ kind: "regret", x: 640, y: 180 }, { kind: "selfBlame", x: 900, y: 150 }] },
        longing: { name: "思念", desc: "兩團思念", xp: 60, gold: [10, 18], playerStart: { x: 640, y: 600 }, wave: [{ kind: "longing", x: 380, y: 150 }, { kind: "longing", x: 900, y: 150 }] },
        joy: { name: "快樂", desc: "三團快樂", xp: 55, gold: [10, 18], playerStart: { x: 640, y: 600 }, wave: [{ kind: "joy", x: 420, y: 180 }, { kind: "joy", x: 640, y: 140 }, { kind: "joy", x: 860, y: 180 }] },
        letterRegret: {
          name: "信裡的悔恨", desc: "道歉信裡夾帶的悔恨", xp: 240, gold: [40, 60], retreat: null, bgm: "sounds/boss-bgm.mp3",
          playerStart: { x: 640, y: 620 }, wave: [{ kind: "regretBig", x: 640, y: 200 }],
          help: "<b>信裡的悔恨</b>：後悔的漩渦（自己周圍的圓）、沒說出口的話（很長的紅框）、叫來自責",
        },
        hoard: {
          name: "堆積的思念", desc: "黑貓藏寶處的思念", xp: 220, gold: [40, 60], retreat: null, bgm: "sounds/boss-bgm.mp3",
          playerStart: { x: 640, y: 620 }, wave: [{ kind: "longingBig", x: 640, y: 200 }],
          help: "<b>堆積的思念</b>：沉積的回憶（自己周圍的圓）、寄不到的信（很長的紅框）、叫來思念",
        },
      },
    },
    // 美食研究所：微波爐室裡的戰鬥
    lab: {
      name: "微波爐室", desc: "美食研究所的戰鬥", hidden: true,
      bgm: "sounds/bgm-battle.mp3",
      variants: {
        nightmare: {
          name: "彈跳噩夢", desc: "會動的布丁在微波爐裡變成的小 Boss，蹦進了理性倉庫", xp: 260, gold: [60, 80], treasure: "horrorGel",
          bgm: "sounds/boss-bgm.mp3", terrain: "warehouse",
          // 理性倉庫的貨架：不能站上去，可以躲在後面擋住直線的攻擊（撞擊）
          obstacles: [
            { x: 230, y: 360, w: 230, h: 48 }, { x: 820, y: 360, w: 230, h: 48 },
            { x: 560, y: 470, w: 160, h: 44 },
            { x: 110, y: 540, w: 48, h: 150 }, { x: 1122, y: 540, w: 48, h: 150 },
          ],
          playerStart: { x: 640, y: 620 },
          wave: [{ kind: "nightmare", x: 640, y: 200 }],
          help: "<b>理性倉庫</b>：貨架不能站上去，<b>躲在貨架後面可以擋住撞擊</b>（直線的紅框）。<b>彈跳噩夢</b>：撞擊、壓制（遠處的大圓，下次輪到它時跳過去）、<b>噴泡泡糖</b>（周圍好幾個紅圈，黏在地上的會變成粉色史萊姆，最多 3 隻）。打倒後得到稀有寶物「恐怖黏液」",
        },
      },
    },
    jellyfish: {
      name: "海上的變異發泡水母", desc: "釣魚委託：怪異樹莓釣出的稀世珍品", hidden: true,
      terrain: "sea", bgm: "sounds/bgm-battle.mp3",
      walk: { x: 400, y: 250, w: 480, h: 220 },       // 船（玩家只能站在這裡）
      xp: 250, gold: [150, 150],         // 稀世珍品的收購價
      playerStart: { x: 640, y: 360 },
      wave: [{ kind: "jelly", x: 640, y: 160 }],
      treasure: "mutantShell",    // 打倒後得到的寶物
      help: "<b>只能在船上移動</b>。發泡水母平常只在船邊探出<b>紅色硬殼</b>（防禦非常高）噴泡沫；每隔幾回合會<b>跳出海面</b>灑下大量泡沫，這時脆弱的本體露出來，趁機攻擊！<br><b>紅色虛線圓</b>＝泡沫落點",
    },
    // 護送戰（特殊戰鬥）：沒有回合，行動點每 1.5 秒 +1；在時間內擊退攻擊馬車的魔狼，至少要保住 need 輛馬車
    escort: {
      name: "護送醃漬馬車", desc: "護送戰", hidden: true, escort: true,
      terrain: "grass", bgm: "sounds/bgm-battle.mp3",
      retreat: { min: 0.15, max: 0.9, near: 120, far: 650 },
      xp: 120, gold: [30, 45],
      duration: 90,               // 限時（秒）
      apEvery: 1.5,               // 每幾秒 +1 行動點
      tickEvery: 9,               // 每幾秒算一次「回合開始」（約等於回滿 6 點行動點的時間）（魔力回復、煙霧持續時間…）
      enemyAct: [1.8, 3.0],       // 魔狼每隔幾秒行動一次（隨機）
      wagon: { name: "醃漬馬車", hp: 120, r: 34 },
      wagons: [{ x: 470, y: 380 }, { x: 640, y: 380 }, { x: 810, y: 380 }],
      need: 2,                    // 至少保住幾輛
      playerStart: { x: 640, y: 500 },
      wave: [],
      waves: [                    // t = 開始後第幾秒出現
        { t: 1, list: [{ kind: "wolf", x: 80, y: 160 }, { kind: "wolf", x: 80, y: 600 }] },
        { t: 22, list: [{ kind: "wolf", x: 1200, y: 140 }, { kind: "wolf", x: 1200, y: 620 }] },
        { t: 45, list: [{ kind: "wolf", x: 640, y: 60 }, { kind: "wolf", x: 300, y: 680 }, { kind: "wolf", x: 980, y: 680 }] },
      ],
      help: "<b>護送戰</b>：沒有回合，行動點每 1.5 秒 +1。魔狼會衝向馬車，時間內打倒所有魔狼，而且至少保住 2 輛馬車就成功<br>" + "<b>草叢</b>：站在裡面的單位受到攻擊時 40% 打空；攻擊碰到草叢會把它破壞",
    },
    boss: {
      name: "Boss 測試房", desc: "選擇要挑戰的 Boss",
      // 可以選擇的 Boss：房間設定會用選到的那一個覆蓋
      variants: {
        matrix: {
          name: "古代遺跡", desc: "古代遺跡的殲滅矩陣", level: "建議 Lv 15 上下",
          xp: 800, coins: 80,
          playerStart: { x: 420, y: 640 },
          wave: [{ kind: "matrixBoss", x: 640, y: 230 }],
          bgm: "sounds/boss-bgm.mp3",
          help: "<b>核心有立場保護</b>：破壞 1 / 2 / 3 個能量矩陣後，核心受到 ×0.5 / ×1 / ×1.5 傷害<br><b>紅色範圍</b>＝觸手、電流、激光，倒數結束時判定<br><b>紅色光彈</b>沒有預告，看到就移動躲開",
        },
        passion: {
          name: "受難之日", desc: "試煉 Boss：受難之日", level: "建議 Lv 40 上下", trial: true,
          xp: 3000, coins: 250,
          reward: "crown",                 // 擊敗後獲得的寶物
          playerStart: { x: 640, y: 660 },
          wave: [
            { kind: "passion", x: 640, y: 235 },
            { kind: "pope", x: 640, y: 420 },
            { kind: "cultist", x: 420, y: 340 },
            { kind: "cultist", x: 860, y: 340 },
            { kind: "cultist", x: 290, y: 520 },
            { kind: "cultist", x: 990, y: 520 },
          ],
          bgm: "sounds/passion-bgm.mp3",
          help: "<b>教徒、教皇</b>倒下時偽神失去 3% / 10% 生命，但會馬上被復活<br><b>聖牢籠</b>：被框住就出不去，攻擊牢籠 5 次打破<br><b>同心圓</b>：站在兩圈之間的空隙就不會被打到<br>扣掉 45% 生命後進入第二階段",
        },
      },
    },
  },
};

// ===== 衍生的敵人和房間（用現有的敵人改數值） =====
(function (C) {
  const E = C.enemies, Rm = C.rooms;
  // #RU20314 古代遺跡科考隊：森林裡的魔物（B 級時空，比草原的強）
  E.mossSlime = Object.assign({}, E.slime, { name: "苔蘚史萊姆", color: "#4a7a3a", fill: "rgba(90,140,70,.22)", hp: 95, atk: 20, df: 5, spd: 7 });       // 暫定
  E.forestWolf = Object.assign({}, E.wolf, { name: "林狼", hp: 85, atk: 19, df: 4, spd: 10 });                                                       // 暫定
  Rm.ruinsWild = Object.assign({}, Rm.encounter, {
    name: "遺跡外的森林", desc: "古代遺跡外的森林",
    variants: {
      mossSlimes: { name: "森林的魔物", desc: "三隻苔蘚史萊姆", xp: 140, gold: [30, 45], playerStart: { x: 640, y: 600 }, wave: [{ kind: "mossSlime", x: 330, y: 170 }, { kind: "mossSlime", x: 640, y: 120 }, { kind: "mossSlime", x: 950, y: 170 }] },
      forestWolves: { name: "林狼群", desc: "三隻林狼", xp: 170, gold: [35, 50], playerStart: { x: 640, y: 600 }, wave: [{ kind: "forestWolf", x: 360, y: 170 }, { kind: "forestWolf", x: 640, y: 120 }, { kind: "forestWolf", x: 920, y: 170 }], help: WOLF_HELP },
    },
  });
  // 森林外圍也有奇儂鎮常見的魔狼和史萊姆（同一個物種，圖鑑會在兩個時空都列出來）
  Rm.ruinsWild.variants.edgeWolves = Object.assign({}, Rm.encounter.variants.wolfPack, { name: "森林邊的魔狼", desc: "從奇儂鎮那邊也看得到的魔狼" });
  Rm.ruinsWild.variants.edgeSlimes = Object.assign({}, Rm.encounter.variants.slimePack, { name: "森林邊的史萊姆", desc: "草地上的史萊姆" });

  // ===== #MD01921 蒙德里安的理想國：被「看成」別的東西的色塊 =====
  // 色塊野獸：被看成野獸的色塊（外觀還是原本的色塊）
  const BEAST = { ai: "wolf", hp: 70, atk: 16, df: 4, spd: 9, ap: 3, moveCost: 1, r: 30, flank: 0.9,          // 暫定（B 級）
    bite: { name: "撞上來", ap: 1, length: 100, width: 80, base: 13, reaction: 0.9, sound: "sounds/slime-ram.mp3" },
    pounce: { name: "撲擊", ap: 2, length: 260, width: 76, base: 15, reaction: 1.0, cooldown: 2, sound: "sounds/wolf-pounce.mp3" },
    sounds: { move: "sounds/slime-move.mp3" } };
  for (const [k, name, color] of [["Red", "紅色", "#e8262c"], ["Blue", "藍色", "#1a3ae8"], ["Yellow", "黃色", "#f0d800"], ["White", "白色", "#f4f4f0"]]) {
    E[`blockBeast${k}`] = Object.assign({}, BEAST, { name: `${name}的色塊野獸`, color, block: true, species: "blockBeast" });
  }
  E.blockBird = { name: "方塊鳥", ai: "wolf", lowIntel: true, color: "#1d1d1f", hp: 42, atk: 14, df: 2, spd: 12, ap: 3, moveCost: 1, r: 22, flank: 1.3,
    bite: { name: "啄", ap: 1, length: 90, width: 56, base: 11, reaction: 0.8, sound: "sounds/wolf-bite.mp3" },
    pounce: { name: "俯衝", ap: 2, length: 300, width: 50, base: 13, reaction: 0.9, cooldown: 2, sound: "sounds/wolf-pounce.mp3" },
    sounds: { move: "sounds/wolf-move.mp3" } };
  // 霸王龍：看大家怎麼看它
  E.rexBlock = { name: "3×5 的黑色方形", ai: "slime", color: "#1d1d1f", fill: "rgba(29,29,31,.12)", hp: 70, atk: 14, df: 3, spd: 6, ap: 3, moveCost: 1, r: 34, block: true,
    ram: { ap: 1, length: 110, width: 80, base: 10, reaction: 1.0 }, slam: { ap: 2, range: 320, radius: 110, base: 13, cooldown: 3 },
    sounds: { ram: "sounds/slime-ram.mp3", slam: "sounds/slime-slam.mp3", move: "sounds/slime-move.mp3" } };
  E.rexDoubt = { name: "自我懷疑的暗黑霸王龍", ai: "alphaWolf", bigBar: true, color: "#1d1d1f", rex: true,
    hp: 420, atk: 24, df: 7, spd: 10, ap: 4, moveCost: 1, r: 26,                                                  // 暫定（B 級 Boss；體型小很多）
    bite: { name: "咬", ap: 1, length: 120, width: 90, base: 16, reaction: 0.9, sound: "sounds/wolf-bite.mp3" },
    spin: { name: "甩尾", ap: 2, radius: 160, base: 18, reaction: 1.0, cooldown: 1, sound: "sounds/alpha-spin.mp3" },
    rend: { name: "衝撞", ap: 2, length: 420, width: 100, base: 20, reaction: 1.1, cooldown: 2, sound: "sounds/dino-roar.mp3" },
    sounds: { move: "sounds/robot-move.mp3" } };
  E.rexKing = { name: "十分恐怖的暗黑霸王龍之王", ai: "alphaWolf", boss: false, bigBar: true, color: "#0a0a0c", rex: true, king: true,
    hp: 3000, atk: 56, df: 14, spd: 14, ap: 7, moveCost: 1, r: 52,                                               // 暫定：數值接近 S 級的受難之日
    bite: { name: "吞噬", ap: 1, length: 150, width: 120, base: 38, reaction: 0.9, sound: "sounds/wolf-bite.mp3" },
    spin: { name: "毀滅甩尾", ap: 2, radius: 230, base: 44, reaction: 1.0, cooldown: 1, sound: "sounds/alpha-spin.mp3" },
    rend: { name: "王者衝撞", ap: 3, length: 640, width: 170, base: 54, reaction: 1.1, cooldown: 2, sound: "sounds/dino-roar.mp3" },
    howl: { ap: 3, every: 3, max: 2, kind: "rexBlock", line: "畫布上的黑色方形都站了起來！", sound: "sounds/wolf-howl-short.mp3" },
    sounds: { move: "sounds/robot-move.mp3" } };
  const canvasBase = { name: "蒙德里安的理想國", desc: "畫布上的戰鬥", hidden: true, terrain: "canvas", bgm: "sounds/bgm-battle.mp3",
    retreat: { min: 0.15, max: 0.9, near: 120, far: 650 } };
  const beast = (k) => ({ name: "色塊野獸", desc: "被看成野獸的色塊", xp: 150, gold: [30, 45], playerStart: { x: 640, y: 600 }, wave: [{ kind: `blockBeast${k}`, x: 640, y: 170 }] });
  Rm.canvas = Object.assign({}, canvasBase, {
    variants: {
      beastRed: beast("Red"), beastBlue: beast("Blue"), beastYellow: beast("Yellow"), beastWhite: beast("White"),
      predators: { name: "毛毛蟲的天敵", desc: "三隻方塊鳥", xp: 200, gold: [35, 50], retreat: null, playerStart: { x: 640, y: 600 },
        wave: [{ kind: "blockBird", x: 380, y: 150 }, { kind: "blockBird", x: 640, y: 110 }, { kind: "blockBird", x: 900, y: 150 }],
        help: "<b>保護毛毛蟲</b>：把三隻方塊鳥趕走，毛毛蟲才能安心結繭" },
      rexBlock: { name: "3×5 的黑色方形", desc: "大家都不再認為它是霸王龍了", xp: 160, gold: [30, 45], retreat: null, playerStart: { x: 640, y: 620 }, wave: [{ kind: "rexBlock", x: 640, y: 200 }] },
      rexDoubt: { name: "自我懷疑的暗黑霸王龍", desc: "還有人認為它是霸王龍", xp: 520, gold: [80, 110], retreat: null, bgm: "sounds/boss-bgm.mp3", playerStart: { x: 640, y: 620 }, wave: [{ kind: "rexDoubt", x: 640, y: 200 }],
        help: "<b>自我懷疑的暗黑霸王龍</b>：咬、甩尾（自己周圍的圓）、衝撞（很長很寬的紅框）。說服更多居民，它就會更弱" },
      rexKing: { name: "十分恐怖的暗黑霸王龍之王", desc: "所有人都深信它是霸王龍", xp: 2400, gold: [400, 500], retreat: null, treasure: "vantaBlack", bgm: "sounds/boss-bgm.mp3", playerStart: { x: 640, y: 640 }, wave: [{ kind: "rexKing", x: 640, y: 200 }],
        help: "<b>十分恐怖的暗黑霸王龍之王</b>：沒有人改變看法時的完全體，強度接近 S 級的受難之日。吞噬、毀滅甩尾、王者衝撞、叫來黑色方形。打倒後得到傳奇寶物「凡塔黑」" },
    },
  });
  // #RT00317 午夜郵局：堆積如山的帳單
  E.anxiety = {
    name: "焦慮", ai: "gunner", color: "#c8702a",
    hp: 32, atk: 12, df: 2, spd: 9, ap: 3, moveCost: 1, r: 26, keep: 220,         // 暫定
    shot: { name: "催繳", ranged: true, ap: 2, length: 560, width: 30, base: 11, reaction: 1.0, sound: "sounds/ilshu-demon.mp3", words: ["逾期未繳", "請立即繳納", "最後期限：昨天"] },
    sounds: { move: "sounds/slime-move.mp3" },
  };
  E.finalNotice = {
    name: "最後通知", ai: "captain", bigBar: true, color: "#b8321e",
    hp: 230, atk: 16, df: 5, spd: 8, ap: 4, moveCost: 1, r: 44,                   // 暫定（C 級 Boss）
    sweep: { name: "滯納金", ap: 2, radius: 150, base: 14, reaction: 1.1, cooldown: 1, sound: "sounds/slime-slam.mp3", words: ["利息", "滯納金"] },
    shot: { name: "催繳單", ranged: true, ap: 2, length: 640, width: 44, base: 13, reaction: 1.0, cooldown: 1, sound: "sounds/ilshu-demon.mp3", words: ["最後通知", "金額：一顆小行星", "收件人：未來的你"] },
    call: { kind: "anxiety", ap: 2, every: 3, max: 2, line: "還有下一張。永遠還有下一張。" },
    sounds: { move: "sounds/slime-move.mp3" },
  };
  Rm.post.variants.anxiety = { name: "焦慮", desc: "兩團焦慮", xp: 60, gold: [10, 18], playerStart: { x: 640, y: 600 }, wave: [{ kind: "anxiety", x: 460, y: 170 }, { kind: "anxiety", x: 820, y: 170 }] };
  Rm.post.variants.finalNotice = {
    name: "最後通知", desc: "堆積如山的帳單黏成的怪物", xp: 250, gold: [40, 60], retreat: null, bgm: "sounds/boss-bgm.mp3",
    playerStart: { x: 640, y: 620 }, wave: [{ kind: "finalNotice", x: 640, y: 200 }],
    help: "<b>最後通知</b>：滯納金（自己周圍的圓）、催繳單（很長的紅框）、叫來焦慮",
  };

  // ===== C 級時空（燈塔小鎮、不停歇的月台、黑原市、巨人的生態盒）=====
  const C_RETREAT = { min: 0.15, max: 0.9, near: 120, far: 650 };
  const cRoom = (name, desc, terrain, bgm, variants, help) => ({ name, desc, hidden: true, terrain, bgm: bgm || "sounds/bgm-battle.mp3", retreat: C_RETREAT, help, variants });
  // #SN00512 燈塔小鎮：熊（森林裡的熊，在這裡長成了方塊）
  E.blockBear = { name: "熊", ai: "wolf", paw: true, color: "#7a4a2a", hp: 58, atk: 15, df: 3, spd: 8, ap: 3, moveCost: 1, r: 30, flank: 0.7,      // 暫定（C 級）
    bite: { name: "熊掌拍", ap: 1, length: 95, width: 80, base: 12, reaction: 0.9, sound: "sounds/bear-roar.mp3" },
    pounce: { name: "撲倒", ap: 2, length: 240, width: 76, base: 14, reaction: 1.0, cooldown: 2, sound: "sounds/bear-roar.mp3" },
    sounds: { move: "sounds/slime-move.mp3" }, drops: [{ item: "snowPelt", chance: 0.6 }] };
  E.blockBearMom = { name: "被吵醒的熊媽媽", ai: "alphaWolf", bigBar: true, paw: true, color: "#5a3218", hp: 280, atk: 17, df: 5, spd: 8, ap: 4, moveCost: 1, r: 46,   // 暫定（C 級 Boss）
    bite: { name: "熊掌拍", ap: 1, length: 120, width: 96, base: 13, reaction: 0.9, sound: "sounds/bear-roar.mp3" },
    spin: { name: "熊掌橫掃", ap: 2, radius: 160, base: 15, reaction: 1.1, cooldown: 1, sound: "sounds/bear-roar.mp3" },
    rend: { name: "冰面滑撞", ap: 2, length: 380, width: 110, base: 17, reaction: 1.1, cooldown: 2, sound: "sounds/bear-roar.mp3" },
    howl: { ap: 2, every: 4, max: 2, kind: "blockBear", line: "熊媽媽吼了一聲，雪堆裡鑽出一隻熊！", sound: "sounds/bear-roar.mp3" },
    sounds: { move: "sounds/slime-move.mp3" }, drops: [{ item: "snowPelt", chance: 1, n: 2 }] };
  Rm.snowWild = cRoom("燈塔小鎮的雪地", "暴風雪裡的戰鬥", "snow", null, {
    bears: { name: "熊", desc: "兩隻熊", xp: 60, gold: [14, 22], playerStart: { x: 640, y: 600 }, wave: [{ kind: "blockBear", x: 480, y: 170 }, { kind: "blockBear", x: 800, y: 170 }] },
    bears3: { name: "熊群", desc: "三隻熊", xp: 90, gold: [20, 32], playerStart: { x: 640, y: 600 }, wave: [{ kind: "blockBear", x: 340, y: 170 }, { kind: "blockBear", x: 640, y: 120 }, { kind: "blockBear", x: 940, y: 170 }] },
    bearMom: { name: "被吵醒的熊媽媽", desc: "冰鈴草旁邊冬眠的熊媽媽", xp: 240, gold: [40, 60], retreat: null, bgm: "sounds/boss-bgm.mp3", playerStart: { x: 640, y: 620 }, wave: [{ kind: "blockBearMom", x: 640, y: 200 }],
      help: "<b>被吵醒的熊媽媽</b>：熊掌拍（貼身紅框）、熊掌橫掃（自己周圍的圓）、冰面滑撞（很長的紅框，撞完會滑到終點）、吼叫叫來熊" },
  }, "<b>熊</b>：熊掌拍＝貼身紅框・撲倒＝很長的紅框，撲完會衝到終點");
  // #TR00088 不停歇的月台：流浪的剪票機器人、逃票客
  E.ticketBot = { name: "流浪的剪票機", ai: "slime", color: "#5a6a7a", fill: "rgba(90,106,122,.15)", hp: 52, atk: 14, df: 4, spd: 6, ap: 3, moveCost: 1, r: 28, block: true,    // 暫定
    ram: { name: "剪票", ap: 1, length: 100, width: 70, base: 10, reaction: 1.0 }, slam: { name: "閘門落下", ap: 2, range: 300, radius: 100, base: 12, cooldown: 3 },
    sounds: { ram: "sounds/firsler-load.mp3", slam: "sounds/slime-slam.mp3", move: "sounds/robot-move.mp3" }, drops: [{ item: "oldTicket", chance: 0.7 }] };
  E.dodger = { name: "逃票客", ai: "wolf", lowIntel: true, color: "#6a6a72", hp: 34, atk: 13, df: 2, spd: 11, ap: 3, moveCost: 1, r: 22, flank: 1.2,       // 暫定
    bite: { name: "推擠", ap: 1, length: 80, width: 64, base: 10, reaction: 0.8, sound: "sounds/firsler-kick.mp3" },
    pounce: { name: "跳閘", ap: 2, length: 260, width: 56, base: 12, reaction: 0.9, cooldown: 2, sound: "sounds/wolf-pounce.mp3" },
    sounds: { move: "sounds/slime-move.mp3" } };
  E.dodgerBoss = { name: "逃票客老大・跳閘的傑克", ai: "captain", bigBar: true, color: "#b8321e", hp: 240, atk: 16, df: 5, spd: 11, ap: 4, moveCost: 1, r: 32,   // 暫定（C 級 Boss）
    sweep: { name: "迴旋踢", ap: 2, radius: 130, base: 14, reaction: 1.0, cooldown: 1, sound: "sounds/firsler-kick.mp3" },
    shot: { name: "彈硬幣", ranged: true, ap: 2, length: 600, width: 30, base: 13, reaction: 1.0, cooldown: 1, sound: "sounds/coin-toss.mp3" },
    call: { kind: "dodger", ap: 2, every: 3, max: 2, line: "傑克吹了聲口哨：「兄弟們，這節車廂沒人剪票！」" },
    sounds: { move: "sounds/slime-move.mp3" } };
  Rm.train = cRoom("不停歇的列車", "車廂裡的戰鬥", "train", null, {
    ticketBots: { name: "流浪的剪票機", desc: "兩台離開崗位的剪票機", terrain: "platform", xp: 60, gold: [14, 22], playerStart: { x: 640, y: 560 }, wave: [{ kind: "ticketBot", x: 460, y: 200 }, { kind: "ticketBot", x: 820, y: 200 }] },
    dodgerBoss: { name: "逃票客老大", desc: "跳閘的傑克", xp: 240, gold: [40, 60], retreat: null, bgm: "sounds/boss-bgm.mp3", playerStart: { x: 640, y: 560 }, wave: [{ kind: "dodgerBoss", x: 640, y: 220 }],
      help: "<b>跳閘的傑克</b>：迴旋踢（自己周圍的圓）、彈硬幣（很長的紅框）、叫來逃票客" },
  });
  // #BC00003 黑原市：失控的無人機、以為自己是觀光巴士的導航系統
  E.rogueDrone = { name: "失控的巡邏無人機", ai: "gunner", color: "#3a5a7a", hp: 32, atk: 13, df: 2, spd: 10, ap: 3, moveCost: 1, r: 24, keep: 220,     // 暫定
    shot: { name: "警示雷射", ranged: true, ap: 2, length: 560, width: 26, base: 11, reaction: 1.0, sound: "sounds/boss-laser.mp3" },
    sounds: { move: "sounds/robot-move.mp3" }, drops: [{ item: "droneChip", chance: 0.6 }] };
  E.tourNav = { name: "以為自己是觀光巴士的導航系統", ai: "captain", bigBar: true, color: "#e8b81e", hp: 250, atk: 16, df: 5, spd: 10, ap: 4, moveCost: 1, r: 40,   // 暫定（C 級 Boss）
    sweep: { name: "急轉彎", ap: 2, radius: 150, base: 14, reaction: 1.1, cooldown: 1, sound: "sounds/robot-move.mp3", words: ["前方右轉", "前方……再右轉"] },
    shot: { name: "導覽廣播", ranged: true, ap: 2, length: 620, width: 40, base: 13, reaction: 1.0, cooldown: 1, sound: "sounds/boss-electric.mp3", words: ["左手邊是黑原市立博物館！", "右手邊是全市最高的紅綠燈！", "本次導覽延長三天！"] },
    call: { kind: "rogueDrone", ap: 2, every: 3, max: 2, line: "「各位旅客，請看左手邊——我們的導覽無人機！」" },
    sounds: { move: "sounds/robot-move.mp3" } };
  Rm.city = cRoom("黑原市的街道", "城市裡的戰鬥", "city", null, {
    drones: { name: "失控的無人機", desc: "兩台巡邏無人機", xp: 60, gold: [14, 22], playerStart: { x: 640, y: 600 }, wave: [{ kind: "rogueDrone", x: 460, y: 170 }, { kind: "rogueDrone", x: 820, y: 170 }] },
    drones3: { name: "失控的無人機群", desc: "三台巡邏無人機", xp: 90, gold: [20, 32], playerStart: { x: 640, y: 600 }, wave: [{ kind: "rogueDrone", x: 340, y: 170 }, { kind: "rogueDrone", x: 640, y: 120 }, { kind: "rogueDrone", x: 940, y: 170 }] },
    tourNav: { name: "失控的無人計程車", desc: "以為自己是觀光巴士的導航系統", xp: 240, gold: [40, 60], retreat: null, bgm: "sounds/boss-bgm.mp3", playerStart: { x: 640, y: 620 }, wave: [{ kind: "tourNav", x: 640, y: 200 }],
      help: "<b>導航系統</b>：急轉彎（自己周圍的圓）、導覽廣播（很長的紅框）、叫來導覽無人機" },
  });
  // #KT33233 巨人的生態盒：跳蛛、蚜蟲（大魔王打不了，所以不在這裡）
  E.jumpSpider = { name: "跳蛛", ai: "wolf", color: "#2a2a30", hp: 40, atk: 15, df: 2, spd: 12, ap: 3, moveCost: 1, r: 22, flank: 1.0,       // 暫定
    bite: { name: "咬", ap: 1, length: 80, width: 60, base: 11, reaction: 0.8, sound: "sounds/wolf-bite.mp3" },
    pounce: { name: "大跳躍", ap: 2, length: 340, width: 60, base: 14, reaction: 0.9, cooldown: 2, sound: "sounds/wolf-pounce.mp3" },
    sounds: { move: "sounds/wolf-move.mp3" } };
  E.aphid = Object.assign({}, E.slime, { name: "蚜蟲", color: "#6aa83a", fill: "rgba(120,190,70,.2)", hp: 30, atk: 12, df: 1, spd: 7, r: 22, species: "aphid" });
  Rm.soil = cRoom("生態盒的土壤上", "落葉和土壤之間的戰鬥", "soil", null, {
    spiders: { name: "跳蛛", desc: "兩隻跳蛛", xp: 60, gold: [14, 22], playerStart: { x: 640, y: 600 }, wave: [{ kind: "jumpSpider", x: 480, y: 170 }, { kind: "jumpSpider", x: 800, y: 170 }] },
    aphids: { name: "蚜蟲群", desc: "三隻蚜蟲", xp: 50, gold: [10, 18], playerStart: { x: 640, y: 600 }, wave: [{ kind: "aphid", x: 340, y: 170 }, { kind: "aphid", x: 640, y: 120 }, { kind: "aphid", x: 940, y: 170 }] },
  });

  // ===== #RU20314 古代遺跡內部：守衛機關（能量槌矛）、巡弋機關（會飛、射雷射） =====
  E.ruinGuard = { name: "古代守衛機關", ai: "alphaWolf", color: "#5a5e66", hp: 120, atk: 20, df: 8, spd: 8, ap: 4, moveCost: 1, r: 32,      // 暫定（B 級）
    bite: { name: "能量槌矛・刺", ap: 1, length: 170, width: 56, base: 15, reaction: 0.9, sound: "sounds/ilshu-thrust.mp3" },
    spin: { name: "能量槌矛・掃", ap: 2, radius: 150, base: 16, reaction: 1.1, cooldown: 1, sound: "sounds/boss-electric.mp3" },
    rend: { name: "槌擊衝鋒", ap: 2, length: 320, width: 90, base: 18, reaction: 1.1, cooldown: 2, sound: "sounds/robot-move.mp3" },
    sounds: { move: "sounds/robot-move.mp3" }, drops: [{ item: "ruinCore", chance: 0.5 }] };
  E.ruinCruiser = { name: "古代巡弋機關", ai: "gunner", fly: true, color: "#6a6e78", hp: 70, atk: 18, df: 5, spd: 12, ap: 3, moveCost: 1, r: 26, keep: 260,   // 暫定
    shot: { name: "巡弋雷射", ranged: true, ap: 2, length: 660, width: 28, base: 14, reaction: 1.0, sound: "sounds/boss-laser.mp3" },
    sounds: { move: "sounds/robot-move.mp3" }, drops: [{ item: "ruinCore", chance: 0.4 }] };
  const RUIN_HELP = "<b>柱子</b>（大掩體）：不能站，躲在後面擋得住攻擊・<b>矮牆</b>（小掩體）：走得過去、投擲物飛得過去，但擋得住敵人的射擊・<b>地刺</b>：偶數回合開始時刺出來・<b>雷射</b>：回合開始時站在光線上會受傷（會被鏡子反射）";
  Rm.ruins = cRoom("古代遺跡", "遺跡裡的戰鬥", "ruins", null, {
    ruinGuards: { name: "古代守衛機關", desc: "兩台守衛機關", xp: 180, gold: [35, 55], randomLayout: true, playerStart: { x: 640, y: 620 }, wave: [{ kind: "ruinGuard", x: 460, y: 170 }, { kind: "ruinGuard", x: 820, y: 170 }] },
    ruinCruisers: { name: "古代巡弋機關", desc: "三台巡弋機關", xp: 170, gold: [35, 55], randomLayout: true, playerStart: { x: 640, y: 620 }, wave: [{ kind: "ruinCruiser", x: 340, y: 150 }, { kind: "ruinCruiser", x: 640, y: 110 }, { kind: "ruinCruiser", x: 940, y: 150 }] },
    ruinMixed: { name: "遺跡的守衛", desc: "守衛機關和巡弋機關", xp: 200, gold: [40, 60], randomLayout: true, playerStart: { x: 640, y: 620 }, wave: [{ kind: "ruinGuard", x: 640, y: 170 }, { kind: "ruinCruiser", x: 360, y: 130 }, { kind: "ruinCruiser", x: 920, y: 130 }] },
  }, RUIN_HELP);

  // ===== #RU20314 古代遺跡的秘密寶庫：試煉 Boss「超古代兵器・翁爾貢」 =====
  // 雙肩是能量炮（雷射、光彈）、武器是能量雙刃長槍。速度和行動點很多、擅長閃避；正面受到投射物攻擊會在面前旋轉雙刃擋下來
  // 傷害不算太高，但被打到會掛上 2 回合的「破綻」（受到的傷害變多）
  // 弱點：引誘它用「噴射突刺」撞上房間邊緣的能量水晶 → 暈眩 1 回合，那一回合受到 1.5 倍傷害
  E.ongergon = {
    name: "超古代兵器・翁爾貢", ai: "ongergon", bigBar: true, color: "#7a7e86",
    hp: 900, atk: 22, df: 10, spd: 18, ap: 8, moveCost: 1, r: 42,                                  // 暫定（試煉 Boss）
    dodge: { near: 60, far: 400, minChance: 0.2, maxChance: 0.75, fatigue: 0.6, minSharp: 0.4, maxSharp: 0.85 },
    flaw: { rounds: 2, mult: 1.3 },                                                                // 破綻：2 回合，受到的傷害 ×1.3
    stun: { rounds: 1, mult: 1.5 },                                                                // 撞上能量水晶：暈眩 1 回合，受到 1.5 倍傷害
    blockDeg: 75,                                                                                  // 正面幾度以內的投射物會被旋轉的雙刃擋下
    spin: { name: "迴旋斬擊", ap: 2, radius: 175, base: 12, reaction: 1.0, cooldown: 1, sound: "sounds/alpha-spin.mp3" },
    poke: { name: "槍尖連戳", ap: 2, length: 250, width: 54, base: 7, hits: 3, reaction: 0.75, sound: "sounds/ilshu-thrust.mp3" },
    dash: { name: "噴射突刺", ap: 3, width: 110, base: 14, reaction: 1.3, cooldown: 2, sound: "sounds/hoffman-jet.mp3" },
    throw: { name: "投擲長槍", ranged: true, ap: 2, length: 760, width: 40, base: 13, reaction: 1.0, cooldown: 2, sound: "sounds/wolf-pounce.mp3" },
    orbs: { name: "肩炮光彈", ap: 2, count: 3, radius: 62, spread: 170, base: 9, reaction: 1.0, cooldown: 1, sound: "sounds/boss-bullet.mp3" },
    ult: { name: "執行-徹底清除", ap: 3, firstRound: 3, every: 4, bands: 6, base: 12, reaction: 1.25, sound: "sounds/boss-laser.mp3" },
    sounds: { move: "sounds/robot-move.mp3" },
    // 正面的投射物：旋轉雙刃擋下（暈眩時擋不了）
    blockHit(b, u, src) {
      if (!src || src.team !== "player" || u.state.stunUntil >= b.round) return false;
      const sk = b.currentSkill && b.char.skills[b.currentSkill];
      if (!sk?.tags?.includes("projectile")) return false;
      let d = Math.abs(Math.atan2(src.y - u.y, src.x - u.x) - (u.facing ?? Math.PI / 2)) % (Math.PI * 2); if (d > Math.PI) d = Math.PI * 2 - d;
      if (d > (this.blockDeg * Math.PI) / 180) return false;
      u.state.blockT = performance.now();
      return true;
    },
    incomingMult(b, u) { return u.state.vulnUntil >= b.round ? this.stun.mult : 1; },
    incomingNote(k) { return `（暈眩 ×${k}）`; },
  };
  Rm.boss.variants.ongergon = {
    name: "超古代兵器・翁爾貢", desc: "試煉 Boss：古代遺跡的秘密寶庫", level: "建議 Lv 30 上下", trial: true,
    xp: 2400, coins: 200, terrain: "ruins", retreat: null,
    crystals: [{ x: 60, y: 190, r: 30 }, { x: 1220, y: 190, r: 30 }, { x: 60, y: 560, r: 30 }, { x: 1220, y: 560, r: 30 }, { x: 640, y: 36, r: 30 }],
    playerStart: { x: 640, y: 620 }, wave: [{ kind: "ongergon", x: 640, y: 250 }],
    bgm: "sounds/bgm-ongergon.mp3",
    help: "<b>超古代兵器・翁爾貢</b>：速度和行動點很多、擅長閃避；<b>正面</b>的投射物會被旋轉的雙刃擋下，從側面或背後打。被它打到會掛上 2 回合的<b>破綻</b>（受到的傷害變多）<br><b>噴射突刺</b>：雙肩往後噴雷射，一路衝到房間的邊緣——站在<b>能量水晶</b>前面引誘它撞上去，它會暈眩 1 回合、受到 1.5 倍傷害<br>大招<b>「執行-徹底清除」</b>：槍尖戳進地面，雙肩的雷射分兩波掃過房間（橫條紅框）",
  };
})(RPG.CONFIG);

// 房間設定：有 variants 的房間（Boss 測試房）用選到的 Boss 覆蓋
RPG.resolveRoom = function (cfg, roomId, variant) {
  const base = cfg.rooms[roomId] || Object.values(cfg.rooms)[0];
  if (!base.variants) return base;
  const keys = Object.keys(base.variants);
  const v = base.variants[variant] ? variant : keys[0];
  const out = Object.assign({}, base, base.variants[v], { variant: v, roomName: base.name });
  // 隨機的戰鬥場地（例如古代遺跡：柱子、矮牆、地刺、雷射）：同一頁只抽一次，戰鬥規則和畫面才會一樣
  if (out.randomLayout && RPG.Ruins) Object.assign(out, RPG._ruinLayout = RPG._ruinLayout || RPG.Ruins.battleLayout(out));
  return out;
};

// ===== 古代遺跡的共用工具：雷射的反射路線、戰鬥場地的隨機配置 =====
RPG.Ruins = {
  // 從 (x, y) 朝 (dx, dy) 射出的雷射：碰到鏡子（線段）就反射，碰到 box 的邊就停。回傳折線的點
  laserPath(x, y, dx, dy, mirrors, box, maxBounce = 5) {
    const pts = [{ x, y }];
    let last = null;
    for (let k = 0; k <= maxBounce; k++) {
      let best = null, bt = Infinity;
      for (const m of mirrors || []) {
        if (m === last) continue;
        const ex = m.x2 - m.x1, ey = m.y2 - m.y1, den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-9) continue;
        const t = ((m.x1 - x) * ey - (m.y1 - y) * ex) / den, u = ((m.x1 - x) * dy - (m.y1 - y) * dx) / den;
        if (t > 0.5 && u >= 0 && u <= 1 && t < bt) { bt = t; best = m; }
      }
      // 到 box 的邊
      const tx = dx > 0 ? (box.x + box.w - x) / dx : dx < 0 ? (box.x - x) / dx : Infinity;
      const ty = dy > 0 ? (box.y + box.h - y) / dy : dy < 0 ? (box.y - y) / dy : Infinity;
      const tb = Math.min(tx, ty);
      if (!best || bt >= tb) { pts.push({ x: x + dx * tb, y: y + dy * tb }); break; }
      x += dx * bt; y += dy * bt; pts.push({ x, y });
      // 反射：d − 2(d·n)n
      let nx = -(best.y2 - best.y1), ny = best.x2 - best.x1; const nl = Math.hypot(nx, ny); nx /= nl; ny /= nl;
      const dot = dx * nx + dy * ny; dx -= 2 * dot * nx; dy -= 2 * dot * ny;
      last = best;
    }
    return pts;
  },
  // 點到折線的距離
  distToPath(px, py, pts) {
    let best = Infinity;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], vx = b.x - a.x, vy = b.y - a.y, L = vx * vx + vy * vy || 1;
      const t = Math.max(0, Math.min(1, ((px - a.x) * vx + (py - a.y) * vy) / L));
      best = Math.min(best, Math.hypot(px - (a.x + vx * t), py - (a.y + vy * t)));
    }
    return best;
  },
  // 戰鬥場地：柱子（大掩體，不能站、擋攻擊）、矮牆（小掩體：可以走過去、投擲物飛得過去，但擋得住敵人的射擊）、地刺（偶數回合刺出來）、雷射（一直開著）
  battleLayout(room) {
    const W = 1280, H = 720, rnd = Math.random, keep = [room.playerStart, ...(room.wave || [])];
    const free = (x, y, w, h, pad = 70) => keep.every((p) => p.x < x - pad || p.x > x + w + pad || p.y < y - pad || p.y > y + h + pad);
    const out = { obstacles: [], lowWalls: [], spikes: [], lasers: [], mirrors: [] };
    const all = () => [...out.obstacles, ...out.lowWalls, ...out.spikes];
    const clear = (x, y, w, h) => all().every((o) => x > o.x + o.w + 40 || x + w < o.x - 40 || y > o.y + o.h + 40 || y + h < o.y - 40);
    const place = (list, w, h, tries = 40) => { for (let i = 0; i < tries; i++) { const x = 120 + rnd() * (W - 240 - w), y = 110 + rnd() * (H - 230 - h); if (free(x, y, w, h) && clear(x, y, w, h)) { list.push({ x: Math.round(x), y: Math.round(y), w, h }); return true; } } return false; };
    const n = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    for (let i = n(1, 3); i > 0; i--) place(out.obstacles, 70, 70);                                    // 柱子
    for (let i = n(1, 3); i > 0; i--) rnd() < 0.5 ? place(out.lowWalls, 150, 26) : place(out.lowWalls, 26, 130);   // 矮牆
    for (let i = n(0, 2); i > 0; i--) place(out.spikes, 120, 120);                                      // 地刺
    if (rnd() < 0.6) {                                                                                   // 雷射發射器（牆上），有時候有一面鏡子
      const left = rnd() < 0.5, y = 160 + rnd() * 300;
      const L = { x: left ? 18 : W - 18, y: Math.round(y), dx: left ? 1 : -1, dy: (rnd() - 0.5) * 0.5 };
      const l = Math.hypot(L.dx, L.dy); L.dx /= l; L.dy /= l;
      out.lasers.push(L);
      if (rnd() < 0.6) { const mx = W / 2 + (rnd() - 0.5) * 300, my = L.y + L.dy / L.dx * (mx - L.x); if (my > 120 && my < H - 120) out.mirrors.push({ x1: mx - 40, y1: my - 40, x2: mx + 40, y2: my + 40 * (rnd() < 0.5 ? 1 : -1) }); }
    }
    return out;
  },
};
