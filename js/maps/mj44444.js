/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/maps/mj44444.js": "20261113212359" });
// 地圖：#MJ44444 彼岸花盛開的事務所（B 級時空）
// 北：事務所的辦理窗口（一號～五號）和公告欄；中：亡者的等候區、統計課；南：彼岸花田（傳送門）
(function () {
  const R = (window.RPG = window.RPG || {});
  R.MAPS = R.MAPS || {};
  const W = 2600, H = 2200;
  // 窗口：號碼和業務（辦理順序照公告欄，跟號碼不一樣）
  const COUNTERS = [
    { n: 1, name: "身分核對", x: 500, y: 300, clerk: "肆" },
    { n: 2, name: "遺物登記", x: 900, y: 300, clerk: "伍" },
    { n: 3, name: "輪迴分發", x: 1300, y: 300, clerk: "拾" },
    { n: 4, name: "生平結算", x: 1700, y: 300, clerk: "柒" },
    { n: 5, name: "因果清點", x: 2100, y: 300, clerk: "捌" },
  ];
  R.MAPS.MJ44444 = {
    indoor: true, battleRoom: "lily",
    bgm: "sounds/bgm-mj.mp3",
    w: W, h: H,
    walk: [{ x: 40, y: 60, w: W - 80, h: H - 120 }],
    office: { x: 40, y: 60, w: W - 80, h: 1180 },
    field: { x: 40, y: 1240, w: W - 80, h: 900 },
    counters: COUNTERS,
    order: [1, 4, 2, 5, 3],                                 // 公告欄上的辦理順序
    board: { x: 2420, y: 560 },                             // 公告欄
    rateBoard: { x: 2300, y: 760 },                         // 統計課的輪迴率看板
    solids: [{ x: 300, y: 180, w: 2000, h: 60 }, { x: 2400, y: 500, w: 60, h: 120 }],
    chairs: { x: 500, y: 880, cols: 12, rows: 3 },
    // 彼岸花田裡的紅線（怨＝剪斷、緣＝解開）
    threads: [
      { id: "t1", kind: "怨", x: 500, y: 1500, who: "被騙走積蓄的老人，對那個騙子" },
      { id: "t2", kind: "緣", x: 900, y: 1780, who: "爸爸，和還在世的女兒" },
      { id: "t3", kind: "怨", x: 1300, y: 1450, who: "被搶走功勞的工程師，對他的上司" },
      { id: "t4", kind: "緣", x: 1650, y: 1900, who: "兩個吵架以後再也沒說過話的老朋友" },
      { id: "t5", kind: "怨", x: 2000, y: 1550, who: "被背叛的妻子，對她的丈夫" },
      { id: "t6", kind: "緣", x: 2300, y: 1850, who: "等了一輩子的人，和他等的人" },
    ],
    // 小孩走過的地方，彼岸花會變白
    trail: [{ x: 600, y: 1350 }, { x: 760, y: 1420 }, { x: 980, y: 1560 }, { x: 1180, y: 1680 }, { x: 1420, y: 1760 }, { x: 1700, y: 1720 }, { x: 1960, y: 1820 }, { x: 2160, y: 1960 }],
    child: { x: 2320, y: 2030 },
    arrive: { x: 520, y: 2040 },
    portal: { x: 300, y: 2040 },
    zone: { dy: 62, r: 46 },
    shops: [{ id: "kiosk", name: "事務所的福利社", keeper: "辦事員・玖", x: 700, y: 760, color: "#8a1a2a", greet: "依程序，福利社也要抽號碼牌。……您是唯一的客人，請直接說。" }],
    potions: ["potionHp", "potionMp"],
    enemyWander: 120, enemySpeed: 32,
    enemies: [
      { id: "g1", kind: "grudges", x: 700, y: 1950 },
      { id: "g2", kind: "grudges3", x: 1900, y: 1350 },
    ],
    npcs: [
      { id: "si", name: "一號窗口・肆", x: 500, y: 380, color: "#8a1a2a", face: "肆", quests: ["MJ44444-01"],
        lines: ["請抽號碼牌。依程序辦理。", "本所的輪迴率，一直維持在百分之百。"] },
      { id: "zhou", name: "第 44444 號・周先生", x: 1060, y: 1000, color: "#6a6a7a", face: "周",
        lines: ["我在這裡坐三天了。每個窗口都說，要先去別的窗口。", "……我口袋裡有一封信。我不想打開。"] },
      { id: "ling", name: "剪線師・阿綾", x: 720, y: 1400, color: "#c40a1e", quests: ["MJ44444-02"],
        lines: ["彼岸花開在亡者走過的路上。花開，葉就落；葉長，花就謝。花和葉，永遠見不到面。", "剪刀是用來剪怨的。緣，要用手解。"] },
      { id: "lu", name: "統計課課長・陸", x: 2200, y: 900, color: "#4a4a6a", face: "陸", quests: ["MJ44444-03"],
        lines: ["數字不會說謊。可是數字也不會說話。", "五百年來，輪迴率一直是百分之百。"] },
    ],
  };
})();
