/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/maps/mm22330.js": "20261113145157" });
// 地圖：#MM22330 或許是魔法森林（B 級時空）
// 一座礦洞：礦脈裡長的是會發光的蘑菇。南邊是礦坑入口和精靈的蘑菇屋村，中間是發光的礦道，北邊是最深處的菇群（暗掉了）
// 沒有菇光的地方伸手不見五指（只看得到自己身邊一小圈）
(function () {
  const R = (window.RPG = window.RPG || {});
  R.MAPS = R.MAPS || {};
  const W = 2800, H = 2200;
  // 岩柱（圓形障礙物）
  const ROCKS = [{ x: 420, y: 1300, r: 90 }, { x: 900, y: 1100, r: 70 }, { x: 1500, y: 1250, r: 100 }, { x: 2100, y: 1150, r: 80 }, { x: 2500, y: 1400, r: 90 },
    { x: 600, y: 800, r: 80 }, { x: 1200, y: 760, r: 60 }, { x: 2000, y: 700, r: 90 }, { x: 2550, y: 600, r: 70 }, { x: 300, y: 500, r: 70 }];
  R.MAPS.MM22330 = {
    indoor: true, battleRoom: "mine", dark: true,
    bgm: "sounds/bgm-mm.mp3",
    w: W, h: H,
    walk: [{ x: 40, y: 60, w: W - 80, h: H - 120 }],
    solids: [], roundSolids: ROCKS, rocks: ROCKS,
    village: { x: 400, y: 1520, w: 1700, h: 620 },
    // 發光的菇群（光源）：north＝最深處的菇群（委託完成前是暗的）
    lights: [
      { x: 560, y: 1700, r: 260, col: "#9ad8ff" }, { x: 1250, y: 1640, r: 280, col: "#c8a0ff" }, { x: 1850, y: 1780, r: 260, col: "#9affc8" },
      { x: 260, y: 1050, r: 200, col: "#9ad8ff" }, { x: 1150, y: 1350, r: 180, col: "#ffd88a" }, { x: 1800, y: 1000, r: 200, col: "#9affc8" }, { x: 2450, y: 1050, r: 180, col: "#c8a0ff" },
      { x: 800, y: 300, r: 260, col: "#9ad8ff", north: true }, { x: 1350, y: 250, r: 300, col: "#c8a0ff", north: true }, { x: 1950, y: 300, r: 260, col: "#9affc8", north: true },
    ],
    growths: [{ id: "g1", x: 860, y: 430 }, { id: "g2", x: 1380, y: 470 }, { id: "g3", x: 1900, y: 440 }],         // 吸光的寄生菇
    houses: [{ id: "h1", x: 760, y: 1640, col: "#d84a4a" }, { id: "h2", x: 1060, y: 1820, col: "#4a8ad8" }, { id: "h3", x: 1480, y: 1660, col: "#d8a04a" }, { id: "h4", x: 1720, y: 1900, col: "#8a4ad8" }],
    burrow: { x: 2280, y: 1700 },                                                                        // 鼴鼠洞
    // 孢子雨季：七種顏色的孢子（紫色最後才出現；吸到會想睡）
    spores: [
      { id: "red", name: "紅", col: "#ff4a4a", x: 320, y: 820 }, { id: "orange", name: "橙", col: "#ff9a2a", x: 1000, y: 950 }, { id: "yellow", name: "黃", col: "#ffe02a", x: 1700, y: 820 },
      { id: "green", name: "綠", col: "#4aff7a", x: 2400, y: 860 }, { id: "blue", name: "藍", col: "#4ab0ff", x: 2300, y: 1500 }, { id: "indigo", name: "靛", col: "#5a5aff", x: 700, y: 1350 },
      { id: "purple", name: "紫", col: "#c04aff", x: 1500, y: 1050, sleepy: true },
    ],
    sleepyClouds: [{ x: 1300, y: 1050, r: 110 }, { x: 2250, y: 1300, r: 100 }, { x: 650, y: 1050, r: 90 }],      // 飄著紫色孢子的地方
    arrive: { x: 420, y: 2000 },
    portal: { x: 200, y: 2000 },
    zone: { dy: 62, r: 46 },
    shops: [{ id: "elfShop", name: "精靈雜貨", keeper: "精靈・菇婆", x: 1950, y: 1580, color: "#5a3a8a", greet: "蘑菇做的藥水，喝起來有點土味。效果很好喔。" }],
    potions: ["potionHp", "potionMp"],
    enemyWander: 130, enemySpeed: 34,
    enemies: [
      { id: "m1", kind: "moles", x: 1000, y: 600 },
      { id: "m2", kind: "moles", x: 2300, y: 1000 },
      { id: "m3", kind: "moles3", x: 1600, y: 500 },
    ],
    npcs: [
      { id: "joe", name: "礦工・老喬", x: 520, y: 1880, color: "#7a5a3a", quests: ["MM22330-01"],
        lines: ["這座礦洞挖不到礦石，只挖得到蘑菇。我挖了四十年，一顆礦石都沒看過。", "暗的地方別亂走。暗處的東西，看得到你，你看不到牠。"] },
      { id: "tina", name: "菇類學者・蒂娜", x: 1300, y: 1960, color: "#c04a8a", quests: ["MM22330-02"],
        lines: ["每一朵發光菇的顏色都不一樣，就像每個人的聲音都不一樣。", "孢子雨季是菇菇們的婚禮。……這樣說好像有點奇怪。"] },
      { id: "xunxun", name: "精靈・蕈蕈", x: 920, y: 1720, color: "#4a9a6a", quests: ["MM22330-03"],
        lines: ["蘑菇屋是活的。早上它會伸懶腰，門會變大一點點。", "人類說這裡是礦洞。我們說這裡是森林。也許都對。"] },
    ],
  };
})();
