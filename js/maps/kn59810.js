/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/maps/kn59810.js": "20261114042342" });
// 地圖：#KN59810 克亞貝魯巴斯諾（A 級時空）
// 一台空戰射擊街機的內部：南邊是投幣口（傳送門），中間是標題畫面的廣場，北邊是三道關卡門（STAGE 1～3）
// 西邊是卡在接關畫面的房間，東邊是排行榜的牆。地上偶爾有閃爍的亂碼格子（機台的 bug）
(function () {
  const R = (window.RPG = window.RPG || {});
  R.MAPS = R.MAPS || {};
  const W = 2600, H = 1800;
  R.MAPS.KN59810 = {
    indoor: true, battleRoom: "arcade", arcade: true,
    bgm: "sounds/bgm-kn-stg.mp3",            // 地圖的音樂（射擊小遊戲裡是 bgm-kn；兩首對調過）
    w: W, h: H,
    walk: [{ x: 40, y: 40, w: W - 80, h: H - 80 }],
    solids: [{ x: 2380, y: 600, w: 160, h: 560 }],
    gates: [
      { stage: 1, x: 700, y: 260, name: "STAGE 1", col: "#3ab0e8" },
      { stage: 2, x: 1300, y: 260, name: "STAGE 2", col: "#e8c84a" },
      { stage: 3, x: 1900, y: 260, name: "STAGE 3", col: "#e83a8a" },
    ],
    board: { x: 2380, y: 600, w: 160, h: 560 },      // 排行榜的牆
    title: { x: 1300, y: 900 },                      // 標題畫面的廣場
    continueRoom: { x: 80, y: 600, w: 420, h: 560 },
    glitches: [{ id: "g1", x: 1000, y: 1320 }, { id: "g2", x: 1720, y: 620 }, { id: "g3", x: 2250, y: 1560 }],
    rivalScore: 74400,                               // 排行榜第一名「???」的分數
    arrive: { x: 650, y: 1660 },
    portal: { x: 380, y: 1660 },
    zone: { dy: 62, r: 46 },
    shops: [{ id: "pixShop", name: "道具欄", keeper: "像素商人・8bit", x: 1800, y: 1640, color: "#5aff9a", greet: "藥水一瓶，像素藥水。喝下去會發出「嗶嗶」的聲音。" }],
    potions: ["potionHp", "potionMp"],
    enemyWander: 120, enemySpeed: 40,
    enemies: [
      { id: "j1", kind: "jets", x: 1550, y: 1050 },
      { id: "g1e", kind: "grunts", x: 900, y: 1100 },
      { id: "j2", kind: "jets3", x: 2050, y: 1350 },
    ],
    npcs: [
      { id: "keeper", name: "投幣口的看守者", x: 820, y: 1600, color: "#e8c84a", face: "幣", quests: ["KN59810-01"],
        lines: ["投幣請從這裡。……你不是硬幣？那你是怎麼進來的？", "最近有一枚不屬於這裡的硬幣掉了進來。它的面額寫著一個看不懂的數字。"] },
      { id: "aaa", name: "排行榜第一名・AAA", x: 2240, y: 1080, color: "#3ab0e8", face: "Ａ", quests: ["KN59810-02"],
        lines: ["我叫 AAA。因為輸入名字的時候，我按了三次 A。", "第一名本來是我的。直到那個「???」出現。"] },
      { id: "blue", name: "1P 的機師・小藍", x: 290, y: 880, color: "#3a6ae8", face: "藍", quests: ["KN59810-03"],
        lines: ["CONTINUE?……9……8……7……", "我已經在這裡數了好久好久。每次數到 0，又會從 9 開始。"] },
      { id: "p2", name: "等待加入的 2P", x: 1600, y: 1500, color: "#e85a3a", face: "２", quests: ["KN59810-05"],
        lines: ["PRESS START TO JOIN……我在等有人按 START。", "我從開機就在這裡了。我看過很多人玩，也看過那個 ??? 玩。"] },
      { id: "ticket", name: "出票口的小票", x: 1180, y: 1420, color: "#ff9a2a", face: "票", quests: ["KN59810-04"],
        lines: ["（喀啦……喀啦……）出票口在轉，可是一張票也吐不出來。", "打完關卡就該吐票的。這是街機的規矩。"] },
      { id: "cat", name: "像素貓", x: 1100, y: 760, color: "#8a8a9a", face: "貓",
        lines: ["喵。（嗶）", "喵喵。（嗶嗶）"] },
    ],
  };
})();
