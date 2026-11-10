/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/config.js": "20261110175453" });
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

// 房間設定：有 variants 的房間（Boss 測試房）用選到的 Boss 覆蓋
RPG.resolveRoom = function (cfg, roomId, variant) {
  const base = cfg.rooms[roomId] || Object.values(cfg.rooms)[0];
  if (!base.variants) return base;
  const keys = Object.keys(base.variants);
  const v = base.variants[variant] ? variant : keys[0];
  return Object.assign({}, base, base.variants[v], { variant: v, roomName: base.name });
};
