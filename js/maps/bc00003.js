/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/maps/bc00003.js": "20261113040753" });
// 地圖：#BC00003 黑原市（C 級時空）
// 棋盤狀的街道：中間一條東西向的大道（上面有一座天橋），南邊是廣場（酒館的門、飛天車的停機坪）
// 委託要用的飛天車（最多七人；多人時指名一位駕駛）停在廣場上：坐上去可以飛過大樓
(function () {
  const R = (window.RPG = window.RPG || {});
  R.MAPS = R.MAPS || {};

  const W = 3200, H = 2400;
  const XS = [[40, 500], [640, 1500], [1640, 2500], [2640, 3160]];      // 街區（東西）
  const YS = [[40, 500], [620, 1150], [1350, 1950]];                    // 街區（南北）
  const AVENUE = { x: 40, y: 1150, w: W - 80, h: 200 };                  // 大道
  const PLAZA = { x: 40, y: 2070, w: W - 80, h: 290 };                   // 南邊的廣場
  const ROOFS = ["#4a4e5a", "#5a5e6a", "#3a4a5a", "#6a6e7a", "#4a5a6a"];
  const NAMES = { "1,2": "交通局", "3,1": "便利商店", "2,0": "黑原塔", "0,1": "公寓", "2,2": "停車大樓", "1,0": "電視台" };
  const BUILD = [];
  XS.forEach(([x0, x1], i) => YS.forEach(([y0, y1], j) => {
    const m = 40, name = NAMES[`${i},${j}`] || null;
    BUILD.push({ x: x0 + m, y: y0 + m, w: x1 - x0 - m * 2, h: y1 - y0 - m * 2, roof: name === "便利商店" ? "#2f8f6a" : name === "交通局" ? "#3a5a8a" : ROOFS[(i * 3 + j) % ROOFS.length], name, tall: name === "黑原塔" });
  }));

  R.MAPS.BC00003 = {
    indoor: true, battleRoom: "city", city: true,
    arrival: { firsler: "嗚哇，會飛的車", ilshu: "好熱鬧阿...感覺不賴...", vivilla: "這裡我有點喜歡...", cangyou: "大城市...好久沒來過這樣的地方了..." },                          // 這輪冒險第一次抵達時說的話
    barks: {
      board: { firsler: "阿哈哈，飛起來了飛起來了！", ilshu: "飛到天上原來是這種感覺嗎？", vivilla: "太高了不行不行放我下來...", marika: "喔喔！像是騎著獅鷲的感覺！", cangyou: "我可以開嗎？" },
      taxi: { marika: "直接撞上去！沒問題的吧！" },          // 開飛天車追上無人計程車的時候
    },       // 坐上飛天車時說的話
    bgm: "sounds/bgm-lab.mp3",               // 暫用（還沒有黑原市的 BGM）
    w: W, h: H, avenue: AVENUE, plaza: PLAZA, xs: XS, ys: YS,
    walk: [{ x: 40, y: 40, w: W - 80, h: H - 80 }],
    buildings: BUILD,
    overpass: { x: 2040, y: 1090, w: 160, h: 320 },               // 天橋（跨過大道；底下是無人機躲的地方）
    under: { x: 2040, y: 1150, w: 160, h: 200 },
    dropZone: { x: 2700, y: 1170, w: 380, h: 160 },               // 便利商店門口的送貨點
    pad: { x: 1150, y: 2200 },                                    // 飛天車的停機坪
    // 失控的無人計程車在城市上空繞的路線
    taxiPath: [{ x: 800, y: 300 }, { x: 2900, y: 280 }, { x: 2950, y: 1700 }, { x: 1900, y: 1780 }, { x: 1700, y: 820 }, { x: 900, y: 900 }, { x: 300, y: 1700 }, { x: 260, y: 600 }],
    arrive: { x: 600, y: 2240 },
    portal: { x: 420, y: 2280 },
    zone: { dy: 62, r: 46 },
    shops: [{ id: "store", name: "便利商店", keeper: "店長・蘇", x: 2900, y: 1100, color: "#2f8f6a", greet: "歡迎光臨！貨送不出去，倉庫都塞滿了，藥水打八折——不對，我們沒有打折。" }],
    potions: ["potionHp", "potionMp", "hotCocoa"],
    enemyWander: 150, enemySpeed: 46,
    enemies: [
      { id: "d1", kind: "drones", x: 570, y: 900 },
      { id: "d2", kind: "drones", x: 1570, y: 300 },
      { id: "d3", kind: "drones3", x: 2560, y: 1650 },
      { id: "d4", kind: "drones", x: 1200, y: 1250 },
    ],
    npcs: [
      { id: "oda", name: "小田", x: 1070, y: 2010, color: "#3a5a8a", quests: ["BC00003-01"],
        asks: { guan: [{ q: "你的工作證背面，寫著一行字。", a: "「不要相信任何會自己決定路線的東西」。……是前輩寫的。他現在在天上，不是那個意思，他在飛天車的維修部。" }], hoffman: [{ q: "這座城市的導航系統，是用什麼地圖資料訓練的？", a: "觀光局的導覽手冊。……我現在知道為什麼了。" }] },
        lines: ["交通局的實習生第一天就遇到這種事。我想回學校。", "那台計程車在天上繞了三天，乘客說風景很好，可是他們想回家。"] },
      { id: "su", name: "蘇", x: 2840, y: 1110, color: "#2f8f6a", quests: ["BC00003-02"],
        asks: { guan: [{ q: "你店裡的貨架，排得像一張八卦圖。", a: "那是無人機的停靠格！……現在全空了，它們都躲在天橋底下。" }], hoffman: [{ q: "「避開人群」的參數，閾值設成了兩公尺？", a: "原本是兩公尺。有人改成了兩百公尺。……整條街都是人群。" }] },
        lines: ["送貨無人機被設定成「避開人群」——結果它們連我都避開。", "天橋底下擠了一整群，像一窩怕生的鴿子。"] },
      { id: "walker", name: "路人", x: 1700, y: 2240, color: "#6a6e7a",
        lines: ["紅綠燈現在會跟你說「請稍候，正在思考」。", "上禮拜我的外送被無人機送到了月球……好吧，是送到了「月球大樓」，但我住在「月亮大樓」。"] },
    ],
  };
})();
