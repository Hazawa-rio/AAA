/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/maps/sn00512.js": "20261113145157" });
// 地圖：#SN00512 燈塔小鎮（C 級時空）
// 北邊是積雪的針葉林（柴房、林子深處長冰鈴草的地方，熊在林子裡遊蕩）
// 中間是小鎮（藥鋪、雜貨店、民宅），東邊海岬上是燈塔，南邊是結冰的港口（冰上鑿了釣魚的洞）
// 用室內地圖的引擎：整片雪地都能走，房子、燈塔、樹幹是障礙物（樹幹在 js/worlds/sn00512.js 的 blocked）
(function () {
  const R = (window.RPG = window.RPG || {});
  R.MAPS = R.MAPS || {};

  const W = 2800, H = 2200;
  const ICE_Y = 1760;                                            // 這條線以南是結冰的港口
  const FOREST = { x: 60, y: 60, w: 1500, h: 760 };              // 北邊的森林
  const HOUSES = [
    { x: 760, y: 1000, w: 190, h: 150, roof: "#b84a3a", name: "葛蕾塔的藥鋪" },
    { x: 1080, y: 960, w: 170, h: 140, roof: "#3a6a8a" },
    { x: 1500, y: 1000, w: 200, h: 150, roof: "#8a6a2a", name: "雜貨店" },
    { x: 1820, y: 940, w: 160, h: 140, roof: "#5a7a3a" },
    { x: 860, y: 1360, w: 170, h: 130, roof: "#7a4a7a" },
    { x: 1640, y: 1360, w: 180, h: 140, roof: "#3a5a8a" },
    { x: 1940, y: 1330, w: 150, h: 130, roof: "#a8642a" },
  ];
  const SHED = { x: 300, y: 640, w: 170, h: 110 };                 // 森林邊的柴房
  const LIGHT = { x: 2480, y: 560, r: 92 };                       // 燈塔（圓形）
  const PIER = { x: 1300, y: 1700, w: 200, h: 380 };               // 碼頭（酒館的門在這裡）

  // 針葉林：固定亂數種子（避開柴房、林子深處的空地、小路）
  const TREES = [];
  let seed = 512; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const CLEAR = [{ x: 260, y: 200, r: 170 }, { x: 390, y: 700, r: 170 }, { x: 760, y: 420, r: 130 }, { x: 1150, y: 300, r: 140 }];
  const PATH = { x: 380, y: 700, w: 1300, h: 120 };              // 柴房 → 小鎮的雪路
  for (let y = FOREST.y + 50; y < FOREST.y + FOREST.h; y += 110) for (let x = FOREST.x + 40; x < FOREST.x + FOREST.w; x += 120) {
    const tx = x + (rnd() - 0.5) * 60, ty = y + (rnd() - 0.5) * 50;
    if (CLEAR.some((c) => Math.hypot(tx - c.x, ty - c.y) < c.r) || (tx > PATH.x - 30 && ty > PATH.y - 40)) continue;
    if (rnd() < 0.2) continue;
    TREES.push({ x: Math.round(tx), y: Math.round(ty), r: 18 + Math.round(rnd() * 6), size: 50 + Math.round(rnd() * 18) });
  }
  // 東北邊的雪原也有幾棵
  for (const [x, y] of [[1900, 200], [2050, 340], [2200, 180], [1760, 420], [2650, 260], [2100, 640]]) TREES.push({ x, y, r: 20, size: 58 });

  R.MAPS.SN00512 = {
    indoor: true, battleRoom: "snowWild", snowTown: true,
    arrival: { ilshu: "好冷...卻又好溫暖...", vivilla: "啊阿...好冷啊...我要回家...", marika: "哇...好冷的地方..." },     // 這輪冒險第一次抵達時說的話
    // 事件台詞：aggro＝被熊盯上；herb＝摘到冰鈴草；iceFish＝冰上釣到魚
    barks: { aggro: { marika: "如此巨大的野獸！來決鬥吧！" }, herb: { vivilla: "摸起來好冰啊..." }, iceFish: { cangyou: "夥伴回應我了！" } },
    bgm: "sounds/bgm-chinon.mp3",            // 暫用（還沒有燈塔小鎮的 BGM）
    w: W, h: H, iceY: ICE_Y,
    forest: FOREST, houses: HOUSES, shed: SHED, light: LIGHT, pier: PIER, path: PATH,
    walk: [{ x: 40, y: 40, w: W - 80, h: 2040 - 40 }],
    forestTrees: TREES,
    roundSolids: [...TREES, LIGHT],
    buildings: HOUSES,
    solids: [SHED],
    // 冰上的釣魚洞
    holes: [{ id: "h1", x: 760, y: 1930 }, { id: "h2", x: 1100, y: 1990 }, { id: "h3", x: 2180, y: 1940 }],
    herb: { x: 250, y: 190 },                                     // 冰鈴草（林子最深處）
    lightDoor: { x: 2480, y: 690 },                               // 燈塔的門
    arrive: { x: 1400, y: 1820 },
    portal: { x: 1400, y: 1980 },
    zone: { dy: 62, r: 46 },
    // 熊：在林子和雪原裡遊蕩，看到人會追過來（跟魔狼一樣）
    wolf: { aggro: 230, speed: 120, leash: 520, packs: { bears: 2, bears3: 3 }, howl: "sounds/bear-roar.mp3" },
    enemyWander: 120, enemySpeed: 36,
    enemies: [
      { id: "b1", kind: "bears", x: 760, y: 420 },
      { id: "b2", kind: "bears", x: 1150, y: 300 },
      { id: "b3", kind: "bears3", x: 2150, y: 420 },
      { id: "b4", kind: "bears", x: 560, y: 1500 },
    ],
    shops: [{ id: "general", name: "雜貨店", keeper: "雜貨店的老闆娘", x: 1600, y: 1200, color: "#8a6a2a", greet: "外面冷吧？熱湯沒有，藥水倒是有。櫃檯上那瓶雪花？放了三個冬天都沒融，你要的話算你便宜一點。" }],
    potions: ["potionHp", "potionMp"],
    npcs: [
      { id: "lia", name: "莉亞", x: 2400, y: 770, color: "#c0392b", quests: ["SN00512-01", "SN00512-03"],
        asks: { ilshu: [{ q: "一切都會好上的...肯定的...", a: "雖然不清楚你在說甚麼，但是謝謝姐姐。" }], guan: [{ q: "你父親的病，不是因為冷。是因為他一直在等某艘船。", a: "……媽媽的船。十年前出海就沒回來。他說燈只要一直亮著，她總有一天看得到。" }], hoffman: [{ q: "燈塔的旋轉機構是純機械的？沒有馬達？", a: "爸爸說馬達會凍住，發條不會。每隔一陣子就要上一次，他上了三十年。" }] },
        lines: ["燈不能熄。一次都不行。", "爸爸說，燈塔的光不是照路的，是告訴海上的人：「這裡有人在等你」。"] },
      { id: "hakon", name: "哈康", x: 1820, y: 1830, color: "#3a6a8a", quests: ["SN00512-02"],
        asks: { cangyou: [{ q: "魚兒是可以感受到人的心意的！", a: "那麼這幾天，我想是我表達不足了？" }], guan: [{ q: "你鬍子上的冰，三天沒融了。", a: "四天。我在等它長成冰柱，好拿來當釣竿。……開玩笑的。" }], hoffman: [{ q: "冰層的厚度大約四十公分，可以承受一頭熊。", a: "你量過？……那我就放心了。上個月有一頭真的走上來過。" }] },
        lines: ["船出不去，就在冰上鑿洞。日子總要過。", "冰下面的魚也很冷。所以咬鉤咬得慢。要有耐心。"] },
      { id: "greta", name: "葛蕾塔", x: 855, y: 1190, color: "#7a4a2a", quests: ["SN00512-04"],
        asks: { vivilla: [{ q: "來點蘑菇嗎?", a: "不了，謝謝你的好意，孩子。" }], firsler: [{ q: "終於有些有趣的了！", a: "孩子，見你那麼有活力，我也放心你能帶回冰鈴草了", back: "老娘不是小孩子！", quest: true }], guan: [{ q: "你的藥櫃裡，有一格是空的。", a: "冰鈴草那一格。那種草只在暴風雪最大的時候開花，我老了，走不進林子了。" }], hoffman: [{ q: "你的蒸餾器漏氣了。左邊第二個接頭。", a: "……漏了三年了。我一直以為是我鼻子的問題。" }] },
        lines: ["鼻子紅不是因為冷，是因為我每天要聞上百種藥草。", "燈塔守那個老傢伙，三十年沒生過病。這次是真的累倒了。"] },
      { id: "kid", name: "雪人小孩", x: 1300, y: 1250, color: "#4a8fb0",
        lines: ["我在堆一隻熊！……可是真的熊好像在看我。", "暴風雪最大的時候，燈塔的光會變成一條一條的，像在跟人說話。"] },
    ],
  };

  // 燈塔頂樓（值班的時候進來）：透鏡在中間，發條、油桶、航海日誌靠牆，窗外是海
  R.MAPS["SN00512/lamp"] = {
    indoor: true, battleRoom: "snowWild", lampRoom: true,
    barks: { ship: { ilshu: "現在那麼晚了...卻還如此奔波嗎..." } },        // 值班時窗外有船經過
    bgm: "sounds/bgm-chinon.mp3",
    w: 1400, h: 980,
    walk: [{ x: 160, y: 140, w: 1080, h: 720 }],
    solids: [{ x: 620, y: 380, w: 160, h: 160 }],
    lens: { x: 700, y: 460 },
    stations: {
      wind: { x: 300, y: 260, name: "發條", tip: "上發條：燈才會轉" },
      oil: { x: 1100, y: 260, name: "油桶", tip: "添油：油燒完燈就熄" },
      lensSpot: { x: 700, y: 640, name: "透鏡", tip: "擦透鏡：雪和鹽會讓燈變暗" },
      log: { x: 820, y: 250, name: "航海日誌", tip: "看到窗外有船經過，就在日誌上記一筆" },
    },
    window: { x: 480, y: 140, w: 680, h: 40 },                    // 日誌就在窗戶下面
    stairs: { x: 1080, y: 780, w: 160, h: 80 },                 // 下樓的樓梯
    arrive: { x: 1120, y: 720 },
    portal: null,
    zone: { dy: 62, r: 46 },
    npcs: [],
    enemies: [],
  };
})();
