/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/maps/aq00618.js": "20261122024623" });
// 地圖：#AQ00618 如此靜謐的蔚藍（A 級）——燈光幽暗的大型水族館，一個所有生命都在互相觀賞的地方
// 大廳四周是五個大水缸：珊瑚礁、雨林、寒帶（北邊三個）、暖海（西）、深海（東）；中間是表演廳（餵食秀的舞台）；南邊是入口（傳送門）
// 水缸的玻璃可以直接穿過去，也不會溺水——但水缸裡的魚是人，外面的人變成了魚
// 導覽圖上寫著六個水缸，第六個「大洋」怎麼找都找不到：因為大廳本身就是大洋水缸（外面的人，就是大洋裡的魚）
(function () {
  const R = (window.RPG = window.RPG || {});
  R.MAPS = R.MAPS || {};
  const W = 3600, H = 2600;
  // 水缸：water＝水的顏色、glass＝玻璃的顏色；fish＝缸裡的生物（在缸裡看是人：ch＝方塊中間的字）
  const TANKS = [
    { id: "coral", name: "珊瑚礁", x: 160, y: 160, w: 960, h: 640, water: "#1f6a8a", glass: "#8ae0ff",
      fish: [{ n: "小丑魚", ch: "丑", c: "#ff8a3a" }, { n: "藍倒吊", ch: "藍", c: "#3a7aff" }, { n: "獅子魚", ch: "獅", c: "#d84a4a" }, { n: "雀鯛", ch: "雀", c: "#7ae0ff" }, { n: "神仙魚", ch: "仙", c: "#f2c200" }] },
    { id: "rain", name: "雨林", x: 1320, y: 160, w: 960, h: 640, water: "#2a5a3a", glass: "#a8f0b0",
      fish: [{ n: "骨舌魚", ch: "骨", c: "#a8a070" }, { n: "紅尾鯰", ch: "鯰", c: "#c86a3a" }, { n: "七彩神仙", ch: "彩", c: "#e86ab0" }, { n: "淡水魟", ch: "魟", c: "#6a5a3a" }, { n: "電鰻", ch: "電", c: "#5a6a3a" }] },
    { id: "polar", name: "寒帶", x: 2480, y: 160, w: 960, h: 640, water: "#4a7a9a", glass: "#e0f4ff",
      fish: [{ n: "企鵝", ch: "企", c: "#2a2a3a" }, { n: "北極鱈", ch: "鱈", c: "#9aa8b8" }, { n: "冰魚", ch: "冰", c: "#c8e8ff" }, { n: "海鸚", ch: "鸚", c: "#e86a3a" }, { n: "白鯨", ch: "白", c: "#e8f0f4" }] },
    { id: "warm", name: "暖海", x: 160, y: 1040, w: 760, h: 880, water: "#1a7a8a", glass: "#9af0e0",
      fish: [{ n: "蝴蝶魚", ch: "蝶", c: "#f2d22a" }, { n: "海馬", ch: "馬", c: "#e8a03a" }, { n: "花園鰻", ch: "鰻", c: "#e8e0c8" }, { n: "隆頭魚", ch: "隆", c: "#3ab88a" }, { n: "海龍", ch: "龍", c: "#c86a8a" }] },
    { id: "deep", name: "深海", x: 2680, y: 1040, w: 760, h: 880, water: "#0a1430", glass: "#5a6ab0",
      fish: [{ n: "皇帶魚", ch: "帶", c: "#c8c8d8" }, { n: "吸血鬼魷魚", ch: "魷", c: "#8a2a4a" }, { n: "巨口魚", ch: "口", c: "#3a3a5a" }, { n: "水母", ch: "母", c: "#c8a0ff" }, { n: "盲鰻", ch: "盲", c: "#a88a8a" }] },
  ];
  // 大廳（＝大洋水缸）裡的「人」，在水缸裡往外看會變成大洋的生物
  const OCEAN = [
    { n: "鯨鯊", c: "#4a6a8a" }, { n: "鬼蝠魟", c: "#2a3a4a" }, { n: "黑鮪魚", c: "#3a4a6a" }, { n: "綠蠵龜", c: "#5a8a4a" }, { n: "雙髻鯊", c: "#6a7a8a" },
    { n: "翻車魚", c: "#9aa8b8" }, { n: "沙丁魚群", c: "#c8d8e8" }, { n: "海豚", c: "#7a9ab8" }, { n: "旗魚", c: "#3a5a9a" }, { n: "鰹魚", c: "#5a6a8a" },
  ];
  const STAGE = { x: 1380, y: 1080, w: 840, h: 520 };               // 表演廳的舞台（可以走上去）
  const CAGE = { x: 1800, y: 1160 };                                 // 後台的籠子（餵食秀的「餌」關在這裡）
  // 上流沙龍（西南角的貴賓席）：稀少或強大的生物＝這個觀賞社會的上層階級；餵食秀的「名單」在這裡決定
  const SALON = { x: 200, y: 2020, w: 900, h: 420 };
  const LIST_DESK = { x: 650, y: 2120 };
  // 館長室（雨林和寒帶水缸之間的走廊盡頭）
  const OFFICE = { x: 2380, y: 300 };
  // 暖海水缸的「餵食秀」：三根柱子上綁著今晚的餌（在缸裡看是人）；劊子手從缸的北邊走下來
  const POSTS = [{ x: 330, y: 1500 }, { x: 540, y: 1700 }, { x: 760, y: 1480 }];
  // 館長的三張舊照片（AQ00618-06）
  const PHOTOS = [{ id: "ph1", x: 3260, y: 1820, where: "深海" }, { id: "ph2", x: 260, y: 700, where: "珊瑚礁" }, { id: "ph3", x: 1060, y: 2070, where: "上流沙龍" }];
  const BOARD = { x: 1400, y: 2140, w: 180, h: 70 };                  // 館內導覽圖
  const PILLARS = [{ x: 1180, y: 900, w: 70, h: 70 }, { x: 2350, y: 900, w: 70, h: 70 }, { x: 1180, y: 1960, w: 70, h: 70 }, { x: 2350, y: 1960, w: 70, h: 70 }];
  const C = (t, dx = 0, dy = 0) => { const T = TANKS.find((q) => q.id === t); return { x: T.x + T.w / 2 + dx, y: T.y + T.h / 2 + dy }; };

  R.MAPS.AQ00618 = {
    indoor: true, battleRoom: "aquarium", aquarium: true, npcInk: "#d8ecff",
    bgm: "sounds/bgm-post.mp3",              // 暫用（還沒有水族館的 BGM）
    w: W, h: H,
    walk: [{ x: 80, y: 80, w: W - 160, h: H - 160 }],
    miniWalk: [{ x: 80, y: 80, w: W - 160, h: H - 160 }],
    solids: [BOARD, ...PILLARS],
    tanks: TANKS, ocean: OCEAN, wildDoor: { x: 3420, y: 2300 }, salon: SALON, listDesk: LIST_DESK, office: OFFICE, posts: POSTS, photos: PHOTOS, showStage: STAGE, cage: CAGE, board: BOARD, pillars: PILLARS,
    // 聚光燈（餵食秀前的巡場；被照到就會被「請回觀眾席」）
    spots: [{ x: 1380, y: 1080, a0: 0.35, a1: 1.45, period: 5200 }, { x: 2220, y: 1080, a0: 1.7, a1: 2.8, period: 6100 }, { x: 1800, y: 1060, a0: 0.9, a1: 2.25, period: 4300 },
      { x: 1800, y: 1240, a0: -2.7, a1: -0.45, period: 5600 }],     // 往北照（從北邊水缸溜過來也會被照到）
    arrive: { x: 1800, y: 2260 },
    portal: { x: 1800, y: 2400 },
    zone: { dy: 62, r: 46 },
    shops: [], potions: [],
    enemyWander: 150, enemySpeed: 40,
    // 掠食者（待在自己的水缸裡）
    enemies: [
      { id: "aq-e1", kind: "morays", ...C("coral", -200, 80) }, { id: "aq-e2", kind: "piranhas", ...C("rain", 120, 60) },
      { id: "aq-e3", kind: "piranhas", ...C("rain", -260, -100) }, { id: "aq-e4", kind: "seals", ...C("polar", 0, 60) },
      { id: "aq-e5", kind: "anglers", ...C("deep", 0, 200) }, { id: "aq-e6", kind: "seals", ...C("polar", 300, -120) },
    ],
    // 使用者授權 Claude 寫觀知命、霍夫曼的台詞
    arrival: {
      guan: "水好安靜。……可是這裡的每一雙眼睛，都在看著別的眼睛。",
      hoffman: "沒有一個水缸聽得到幫浦的聲音。那這些水，是誰在換的？",
    },
    npcs: [
      // 上層階級（稀少或強大的生物）：在大廳看是穿著體面的人，在水缸裡往外看是牠們本來的樣子
      { id: "nWhite", name: "上流・大白鯊", face: "鯊", x: 330, y: 2200, color: "#6a7a8a", noble: true, ocean: { n: "大白鯊", c: "#8a9aa8" },
        lines: ["吃，和被吃。這裡的規矩就這麼簡單。我只是比較擅長前面那個。", "今晚暖海的表演，是我負責的。請務必從缸裡面看——那邊的角度比較好。"] },
      { id: "nBlue", name: "上流・藍鯨", face: "藍", x: 560, y: 2330, color: "#2a5a9a", noble: true, ocean: { n: "藍鯨", c: "#3a6aa8" },
        lines: ["我什麼都不用做。光是被看著，大家就會讓路。", "名單？那種東西，我只負責簽名。吃小東西太累了，我比較喜歡看。"] },
      { id: "nCroc", name: "上流・鱷魚", face: "鱷", x: 820, y: 2200, color: "#4a6a3a", noble: true, ocean: { n: "鱷魚", c: "#4a6a3a" },
        lines: ["我不是海裡的東西。可是在這裡，夠強就有位子。", "優勝劣汰。弱小的被選上名單，強大的坐在這裡挑——這不是殘忍，是自然。"] },
      { id: "nSquid", name: "上流・酸漿魷", face: "魷", x: 980, y: 2360, color: "#8a3a5a", noble: true, ocean: { n: "酸漿魷", c: "#a84a6a" },
        lines: ["稀少，就是價值。這座館裡見過我的人，比見過館長的還少。", "我的眼睛是這裡最大的。所以我看得最清楚——每一場表演，我都沒有錯過。"] },
      { id: "nTurtle", name: "上流・大鱷龜", face: "龜", x: 400, y: 2400, color: "#5a5a3a", noble: true, ocean: { n: "大鱷龜", c: "#5a5a3a" },
        lines: ["我活得比你們都久。久到我記得，這裡以前沒有餵食秀。", "是觀眾想看。我們只是……給他們看。"] },
      { id: "nWalrus", name: "上流・海象", face: "象", x: 760, y: 2400, color: "#8a6a5a", noble: true, ocean: { n: "海象", c: "#8a6a5a" },
        lines: ["寒帶的那些企鵝？牠們上個月才上過名單。運氣不好。", "我負責準備餌。從缸裡看，牠們會哭——所以我都在缸外面看。"] },
      { id: "guide", name: "館內導覽員・汐", face: "汐", x: 1640, y: 2180, color: "#4a8ab8", quests: ["AQ00618-01", "AQ00618-06"], ocean: { n: "鬼蝠魟", c: "#2a3a4a" },
        homeLines: ["……館長？不……您不是。您是館長小時候的樣子。那個一直站在深海玻璃前面的孩子。", "那些一直跟著您的魚，以前也住在這裡。牠們在外面，有好好地被看著嗎？", "歡迎回家。……導覽圖上的路，您應該比我還熟吧。"],
        lines: ["歡迎光臨。請安靜參觀——這裡的生物，很在意有沒有人在看牠們。", "導覽圖上寫著六個水缸。我在這裡工作很久了，第六個，我一次也沒有看過。", "水缸的玻璃？可以直接走進去喔。不會濕，也不會溺水。……大家都是這樣進進出出的。"],
        asks: {
          guan: [{ q: "你在這裡工作多久了？", a: "……很久了。久到我已經想不起來，是我在看水缸，還是水缸在看我。" }],
          hoffman: [{ q: "水族館的維生系統在哪裡？", a: "維生系統？……您是說，讓大家活著的東西嗎？我想，是『有人在看』吧。" }],
        } },
      { id: "clown", name: "小丑魚團長・波波", face: "丑", x: 700, y: 360, species: "小丑魚", color: "#ff8a3a", quests: ["AQ00618-02"], tank: "coral",
        homeLines: ["是你！你以前都會來看我們排練。整個水族館，只有你在我們好好跳舞的時候鼓掌。", "你出去以後，就沒有人那樣鼓掌了。"],
        lines: ["我們每天都在練習。練習被看見。", "外面的人都只看大魚。大魚會吃東西，吃東西比較好看。"] },
      { id: "lantern", name: "深海的燈籠魚・小燈", face: "燈", x: 3060, y: 1300, species: "燈籠魚", color: "#8ab8ff", quests: ["AQ00618-03"], tank: "deep",
        homeLines: ["……你的光變暗了。以前你站在玻璃外面的時候，我在這裡都看得到。", "妹妹說她記得你。她說，你是唯一一個看著我們、卻不是在等餵食秀的人。"],
        lines: ["在深海裡，光是用來騙人的。可是我的光，只是想讓人看見我。", "餵食秀的時候，大家都會來。那是這裡最熱鬧的時候。"] },
      { id: "keeper", name: "沒有臉的飼育員", face: "　", x: 2080, y: 1700, color: "#6a7a8a", noble: true, ocean: { n: "虎鯨", c: "#1a1a22" },
        homeLines: ["……", "（沒有臉的飼育員轉向你，停了很久）", "你回來了。觀眾一直記得你。"],
        lines: ["……", "（他在餵食秀的舞台旁邊站著。手上的桶子是空的）", "今晚的餌，已經準備好了。"] },
      { id: "seahorse", name: "暖海的海馬爸爸・阿浪", face: "馬", x: 700, y: 1200, species: "海馬", color: "#e8a03a", quests: ["AQ00618-04"], tank: "warm",
        lines: ["在缸外面看，今晚的表演是大白鯊在吃魚。", "在缸裡面看……你進來就知道了。"] },
      { id: "penguin", name: "寒帶的企鵝・小白", face: "企", x: 2700, y: 400, species: "企鵝", color: "#2a2a3a", quests: ["AQ00618-05"], tank: "polar",
        lines: ["我們上個月上過名單。少了三隻。", "名單是在西南角的沙龍裡決定的。我們進不去——我們不夠稀少，也不夠強。"] },
      { id: "kid", name: "趴在玻璃上的小孩", face: "孩", x: 1060, y: 900, color: "#c86a8a",
        homeLines: ["大哥哥，你身邊那些魚是幽靈嗎？", "牠們一直在看水缸。好像很想回去。"],
        lines: ["魚魚在看我。", "如果我走進去，我也會變成魚嗎？那魚魚會變成什麼？"] },
    ],
  };
})();
