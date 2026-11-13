/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/maps/bh03278.js": "20261113212359" });
// 地圖：#BH03278 比爾哈頓廣場（B 級時空）
// 南：廣場入口（傳送門）、志工醫療站；北：被包圍的精品店；西：抗議的舞台；東：警察的封鎖線；東南：補給車
// 廣場上飄著催淚瓦斯（白色的煙）：走進去會咳嗽、走路變慢；扛著醫療物資走進去，箱子會掉
(function () {
  const R = (window.RPG = window.RPG || {});
  R.MAPS = R.MAPS || {};
  const W = 2800, H = 2000;
  R.MAPS.BH03278 = {
    indoor: true, battleRoom: "plaza",
    bgm: "sounds/bgm-bh.mp3",
    w: W, h: H,
    walk: [{ x: 40, y: 60, w: W - 80, h: H - 120 }],
    shop0: { x: 1150, y: 110, w: 500, h: 250 },                   // 精品店
    stage: { x: 150, y: 640, w: 300, h: 160 },                    // 抗議的舞台
    barricades: [{ x: 2330, y: 300, w: 40, h: 420 }, { x: 2330, y: 860, w: 40, h: 520 }],     // 警察的封鎖線（中間留一個口）
    solids: [{ x: 1150, y: 110, w: 500, h: 250 }, { x: 150, y: 640, w: 300, h: 160 }, { x: 2330, y: 300, w: 40, h: 420 }, { x: 2330, y: 860, w: 40, h: 520 }],
    tent: { x: 720, y: 1620 },                                    // 志工醫療站
    truck: { x: 2460, y: 1740 },                                  // 補給車
    crowd: { x: 1400, y: 520 },                                   // 圍著精品店的人群
    checkpoint: { x: 1590, y: 1390, w: 40, h: 570 },              // 南邊的臨時封鎖線：補給車和醫療站之間，定時開關（關著的時候走不過去，要繞北邊穿過瓦斯）
    // 催淚瓦斯（會慢慢飄）
    gas: [{ x: 1300, y: 1150, r: 140, vx: 18, vy: 6 }, { x: 1900, y: 1450, r: 120, vx: -14, vy: -8 }, { x: 900, y: 1000, r: 110, vx: 10, vy: 12 }, { x: 1700, y: 850, r: 130, vx: -10, vy: 10 }],
    // 咳到睜不開眼的人（不分哪一邊）
    coughers: [
      { id: "c1", ch: "學", name: "舉牌子的大學生", side: "抗議的人", x: 620, y: 1100, col: "#d8a04a", runner: true },
      { id: "c2", ch: "警", name: "年輕的警員", side: "警察", x: 1770, y: 1060, col: "#3a4a7a", argue: true },
      { id: "c3", ch: "送", name: "路過的外送員", side: "路人", x: 1500, y: 1500, col: "#5a9a5a", runner: true },
      { id: "c4", ch: "郵", name: "退休的郵差爺爺", side: "抗議的人", x: 1650, y: 1060, col: "#d8a04a", argue: true },
      { id: "c5", ch: "盾", name: "拿盾牌的警員", side: "警察", x: 2200, y: 1300, col: "#3a4a7a" },
    ],
    arrive: { x: 520, y: 1820 },
    portal: { x: 300, y: 1820 },
    zone: { dy: 62, r: 46 },
    shops: [{ id: "kiosk", name: "沒關門的書報攤", keeper: "老闆・老龐", x: 1900, y: 1820, color: "#8a6a3a", greet: "我在這裡擺攤三十年，革命看過兩次。藥水照賣，不漲價。" }],
    potions: ["potionHp", "potionMp"],
    enemyWander: 120, enemySpeed: 36,
    enemies: [
      { id: "l1", kind: "looters", x: 1000, y: 420 },
      { id: "l2", kind: "looters", x: 1850, y: 420 },
      { id: "l3", kind: "looters3", x: 1400, y: 760 },
    ],
    npcs: [
      { id: "malin", name: "志工醫護・瑪蓮", x: 840, y: 1660, color: "#c84a4a", quests: ["BH03278-01"],
        lines: ["在這個帳篷裡，沒有立場，只有傷口。", "催淚瓦斯的煙很重，會往低的地方流。蹲下來反而更嗆。"] },
      { id: "ivan", name: "記者・伊凡", x: 560, y: 900, color: "#4a6a8a", quests: ["BH03278-02"],
        lines: ["我只寫查證過的事。這在今天的廣場上，是最難的一件事。", "憤怒是真的。可是憤怒也會被人拿去用。"] },
      { id: "holly", name: "老師・荷莉", x: 360, y: 960, color: "#8a4a8a", quests: ["BH03278-03"],
        lines: ["我們要的很簡單：稅金花在哪裡，要說清楚。", "出國訪問住總統套房、包整架專機，學校的屋頂卻漏水三年。你說，我們該不該問？"] },
      { id: "clerk", name: "精品店店員・小羅", x: 1720, y: 440, color: "#a86a8a",
        lines: ["老闆早就跑了。留我在這裡顧店。", "我只是在這裡打工的。這個月的薪水還沒領到。"] },
      { id: "host", name: "舞台主持人・阿麥", x: 420, y: 560, color: "#d8a04a",
        lines: ["我們的訴求寫在牌子上：降稅、公開外交花費。就這兩條。", "麥克風借你？不用了？好吧。"] },
      { id: "officer", name: "警官・葛蘭", x: 2240, y: 800, color: "#3a4a7a",
        lines: ["封鎖線後面是議會。我的工作是守住這條線。", "我也繳稅。……這句話，我不能在值勤的時候說。"] },
    ],
  };
})();
