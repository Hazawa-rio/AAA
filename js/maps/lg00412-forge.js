/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/maps/lg00412-forge.js": "20261113212359" });
// 地圖：#LG00412-2 赫菲斯托斯的鍛造場（傳說的道路的裏時空；完成傳說的道路全部的委託才打得開）
// 火山肚子裡的鍛造場：北邊中間是鐵砧（赫菲斯托斯），西北是熔爐和風箱，東北是淬火的水槽，南半邊是礦坑（有會噴發的熔岩口）
(function () {
  const R = (window.RPG = window.RPG || {});
  R.MAPS = R.MAPS || {};
  const W = 2400, H = 1700;
  R.MAPS["LG00412/forge"] = {
    indoor: true, battleRoom: "polis", forge: true,
    bgm: "sounds/bgm-lg.mp3",
    w: W, h: H,
    walk: [{ x: 40, y: 40, w: W - 80, h: H - 80 }],
    anvil: { x: 1200, y: 470 },                                 // 鐵砧（赫菲斯托斯站在後面）
    furnace: { x: 460, y: 380 },                                // 熔爐和風箱
    trough: { x: 1940, y: 430 },                                // 淬火的水槽
    mine: { x: 200, y: 900, w: 2000, h: 700 },                  // 礦坑
    // 礦石可能出現的地方（每一趟隨機挑三個，種類也隨機）
    oreSpots: [{ x: 360, y: 1060 }, { x: 640, y: 1380 }, { x: 980, y: 1120 }, { x: 1420, y: 1440 }, { x: 1720, y: 1080 }, { x: 2040, y: 1340 }, { x: 1200, y: 1520 }],
    // 熔岩池（圓形障礙物）
    lava: [{ x: 820, y: 900, r: 70 }, { x: 1560, y: 900, r: 80 }, { x: 300, y: 1450, r: 70 }, { x: 2140, y: 1000, r: 60 }],
    solids: [{ x: 1130, y: 450, w: 140, h: 60 }, { x: 330, y: 260, w: 260, h: 150 }, { x: 1850, y: 390, w: 180, h: 70 }],
    get roundSolids() { return this.lava; },
    exit: { x: 1110, y: H - 80, w: 180, h: 40 },
    arrive: { x: 1200, y: H - 200 },
    portal: null,
    zone: { dy: 62, r: 46 },
    shops: [], potions: [],
    enemyWander: 110, enemySpeed: 40,
    enemies: [],
    npcs: [
      { id: "hephaestus", name: "鍛造之神・赫菲斯托斯", x: 1200, y: 360, color: "#c8641a", face: "赫",
        lines: ["……又是一個從上面掉下來的。", "要武器？自己動手。風箱、礦坑、淬火槽都在那裡。神不幫懶人打鐵。"] },
    ],
  };
})();
