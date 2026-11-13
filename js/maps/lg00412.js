/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/maps/lg00412.js": "20261114042342" });
// 地圖：#LG00412 傳說的道路（A 級時空）
// 西半邊是雅典式的城邦：北邊雅典娜神殿、中間市集（廣場）、西邊柱廊（哲學家）、西北的獅子洞、南邊城門外是傳送門
// 東半邊（出了城的東門）是神話的荒野：東北是鎖著普羅米修斯的山崖、中間是冥河渡口、東南是西西弗斯的山坡
(function () {
  const R = (window.RPG = window.RPG || {});
  R.MAPS = R.MAPS || {};
  const W = 4000, H = 2200;
  const COLS = [];
  for (let y = 720; y <= 1300; y += 116) COLS.push({ x: 180, y, r: 22 }, { x: 520, y, r: 22 });     // 柱廊的柱子
  const TEMPLE = [{ x: 800, y: 120, w: 260, h: 40 }, { x: 1140, y: 120, w: 260, h: 40 }, { x: 800, y: 120, w: 40, h: 300 }, { x: 1360, y: 120, w: 40, h: 300 },
    { x: 800, y: 380, w: 260, h: 40 }, { x: 1140, y: 380, w: 260, h: 40 }];
  const GATE = [{ x: 1800, y: 40, w: 36, h: 960 }, { x: 1800, y: 1200, w: 36, h: 960 }];
  R.MAPS.LG00412 = {
    indoor: true, battleRoom: "polis", polis: true,
    bgm: "sounds/bgm-lg.mp3",
    w: W, h: H,
    plain: { x: 2900, y: 1700, w: 1060, h: 460 },  // 西西弗斯山坡東邊的平原（石頭滾下山以後會一路滾過去）
    walk: [{ x: 40, y: 40, w: W - 80, h: H - 80 }],
    solids: [...TEMPLE, ...GATE, { x: 980, y: 940, w: 80, h: 50 }, { x: 1140, y: 940, w: 80, h: 50 }],
    roundSolids: [...COLS, { x: 2520, y: 360, r: 70 }],
    temple: { x: 800, y: 120, w: 600, h: 300 }, templeWalls: TEMPLE, gateWalls: GATE, cols: COLS,
    altar: { x: 1100, y: 230 },                     // 雅典娜的祭壇（橄欖枝放這裡）
    agora: { x: 1100, y: 1080, r: 320 },            // 市集廣場
    stoa: { x: 150, y: 680, w: 400, h: 660 },        // 柱廊
    barrel: { x: 720, y: 1560 },                    // 第歐根尼的木桶
    den: { x: 330, y: 330 },                        // 獅子洞
    styx: { x: 2080, y: 560, w: 110, h: 1200 },     // 冥河（裝飾）
    cliff: { x: 2520, y: 360 },                     // 鎖著普羅米修斯的山崖
    prometheus: { x: 2520, y: 470 },
    hill: { x: 2560, y: 880, w: 320, h: 1240, top: 980, bottom: 1960, cx: 2720 },   // 西西弗斯的山坡
    // 荷米斯會出現的地方（市集一帶）
    hermesSpots: [{ x: 820, y: 900 }, { x: 1380, y: 900 }, { x: 1420, y: 1280 }, { x: 780, y: 1300 }, { x: 1100, y: 760 }, { x: 1100, y: 1460 }],
    vine: { x: 3500, y: 1820 },                    // 東邊平原的葡萄藤
    feast: { x: 1100, y: 1110 },                   // 市集中央：擺餐宴的地方
    stalls: [{ x: 880, y: 1200, name: "橄欖油", col: "#9aaa4a" }, { x: 1320, y: 1200, name: "陶罐", col: "#c8784a" }, { x: 1100, y: 1340, name: "無花果", col: "#8a4a8a" }],
    arrive: { x: 1100, y: 2060 },
    portal: { x: 860, y: 2080 },
    zone: { dy: 62, r: 46 },
    shops: [{ id: "agoraShop", name: "市集的藥草攤", keeper: "攤販・忒拉", x: 1300, y: 1560, color: "#9aaa4a", greet: "藥水？這是用阿斯克勒庇俄斯神殿後面的藥草熬的。……喝了會不會變成神？不會。" }],
    potions: ["potionHp", "potionMp"],
    enemyWander: 120, enemySpeed: 36,
    enemies: [
      { id: "b1", kind: "birds", x: 2300, y: 820 },
      { id: "b2", kind: "birds", x: 2350, y: 1750 },
      { id: "b3", kind: "birds3", x: 2850, y: 600 },
      { id: "c1", kind: "centaurs", x: 1500, y: 1750 },
    ],
    npcs: [
      { id: "archon", name: "執政官・克里昂", x: 1100, y: 1230, color: "#5a4a8a", quests: ["LG00412-01"],
        lines: ["眾神的考驗每年都來，一次比一次不講道理。", "去年的考驗是「讓海水變甜」。我們到現在還在洗鹽。"] },
      { id: "priestess", name: "雅典娜的祭司・菲莉亞", x: 1100, y: 480, color: "#7a9a4a", quests: ["LG00412-02"],
        lines: ["雅典娜大人是智慧的女神。……所以祂不會來幫我們找東西，祂會說「自己想」。", "神殿裡不准跑步。也不准飛。"] },
      { id: "ferryman", name: "冥河的擺渡人・卡戎", x: 2200, y: 1200, color: "#3a3a4a", face: "渡", quests: ["LG00412-03"],
        lines: ["上船要一枚銀幣。……開玩笑的，你還活著，我不載。", "眾神罰人，從來不問罰到什麼時候。"] },
      { id: "socrates", name: "蘇格拉底", x: 360, y: 800, color: "#6a6a7a", face: "蘇",
        lines: ["我唯一知道的事，就是我一無所知。", "你說的「正確」，是什麼意思呢？"] },
      { id: "aristotle", name: "亞里斯多德", x: 360, y: 1200, color: "#4a6a8a", face: "亞",
        lines: ["邊走邊想，想得比較快。", "如果 A 是 B，B 是 C，那 A 是什麼？"] },
      { id: "diogenes", name: "第歐根尼", x: 790, y: 1530, color: "#8a6a4a", face: "第",
        lines: ["你擋到我的陽光了。", "我在找一個誠實的人。……你不是。"] },
      { id: "maina", name: "酒神的女信徒・邁娜", x: 860, y: 1440, color: "#7a3a8a", quests: ["LG00412-05"],
        lines: ["酒神大人說，今晚想在市集吃飯。……祂每天都這麼說。", "喝酒的時候要唱歌，唱歌的時候要跳舞，跳舞的時候……要喝酒。"] },
      { id: "kros", name: "半人馬・克洛斯", x: 1980, y: 1560, color: "#8a6a4a",
        lines: ["我是好的半人馬。……今天還沒喝醉的那種。", "那邊那兩個？昨天喝太多了，見人就踢。別理他們。"] },
      { id: "sisyphus", name: "西西弗斯", x: 2580, y: 2040, color: "#c8784a", face: "西", quests: ["LG00412-04"],
        lines: ["你好你好！今天的天氣很適合推石頭！", "大家都覺得我很可憐。……為什麼？"] },
    ],
  };
})();
