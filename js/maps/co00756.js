/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/maps/co00756.js": "20261113212359" });
// 地圖：#CO00756 雲端上的海洋（B 級時空）
// 上面是雲做的港口（酒館的門、潛水用品店），往下是天空色的海：沒有水的阻力，但會浮起來、要換氣
// 中層有可以捏的雲床、能換氣的空氣雲；最底下是深海雲層（破洞、天空捕手的吸雲管）
(function () {
  const R = (window.RPG = window.RPG || {});
  R.MAPS = R.MAPS || {};
  const W = 2800, H = 2600, SURF = 520;
  R.MAPS.CO00756 = {
    indoor: true, battleRoom: "skysea", skySea: true,
    bgm: "sounds/bgm-chinon.mp3",            // 用現有的
    w: W, h: H, surf: SURF,
    walk: [{ x: 40, y: 60, w: W - 80, h: H - 120 }],
    solids: [],
    harbor: { x: 160, y: 120, w: 2480, h: 330 },                  // 雲做的港口
    floorY: 2380,                                                  // 深海雲層的上緣
    beds: [{ id: "b1", x: 620, y: 1450 }, { id: "b2", x: 1420, y: 1620 }, { id: "b3", x: 2220, y: 1420 }],     // 可以捏的雲床
    airs: [{ x: 400, y: 1100 }, { x: 1800, y: 1250 }, { x: 1000, y: 1950 }, { x: 2400, y: 2050 }],               // 空氣雲（換氣）
    hole: { x: 1400, y: 2440 },                                    // 最底層的破洞
    hoses: [{ id: "h1", x: 520, y: 2430 }, { id: "h2", x: 1980, y: 2440 }, { id: "h3", x: 2560, y: 2420 }],      // 天空捕手的吸雲管
    ship: { x: 2380, y: 300 },                                     // 天空捕手的船（港口東邊的海面上）
    rare: [
      { id: "sunfish", name: "晴空翻車魚", y0: 900, y1: 1200, color: "#ffe08a", size: 30 },
      { id: "betta", name: "晚霞鬥魚", y0: 1500, y1: 1800, color: "#ff8a6a", size: 22 },
      { id: "eel", name: "極光鰻", y0: 2080, y1: 2340, color: "#8affd8", size: 26 },
    ],
    arrive: { x: 700, y: 300 },
    portal: { x: 420, y: 300 },
    zone: { dy: 62, r: 46 },
    shops: [{ id: "dive", name: "雲朵潛水用品店", keeper: "老闆・棉棉", x: 1500, y: 260, color: "#4a9ad8", greet: "潛水用具都是雲朵捏的，輕、軟、不會漏氣——大部分時候。藥水也有喔。" }],
    potions: ["potionHp", "potionMp"],
    enemyWander: 140, enemySpeed: 40,
    enemies: [
      { id: "c1", kind: "catchers", x: 900, y: 2250 },
      { id: "c2", kind: "catchers", x: 2000, y: 2200 },
      { id: "c3", kind: "catchers3", x: 2500, y: 1700 },
    ],
    npcs: [
      { id: "langhua", name: "浪花", x: 1000, y: 330, color: "#4a9ad8", quests: ["CO00756-01"],
        lines: ["雲朵最底層一破洞，下面的世界就會下大雨。我們修補工就是這片海的屋頂工人。", "雲很好捏。捏久了，手會有點涼涼的。"] },
      { id: "laohe", name: "老賀", x: 2000, y: 340, color: "#3a5a7a", quests: ["CO00756-02"],
        lines: ["這片海的魚，我一條都沒抓到過。網子會穿過去，魚鉤會被吐出來。我是漁夫，我只是喜歡看。", "最近那群天空捕手開船來，用管子吸深海的雲。雲是魚的食物，也是下面世界的屋頂。"] },
      { id: "xiaocheng", name: "小澄", x: 1250, y: 380, color: "#d8884a", quests: ["CO00756-03"],
        lines: ["抓不到的魚，至少拍得到。我在做一本這片海的魚類圖鑑。", "稀有的魚很怕人。不要追，停下來等牠。"] },
    ],
  };
})();
