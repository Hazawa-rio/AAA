/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/maps/hw01031.js": "20261110175453" });
// 地圖：#HW01031 永遠萬聖節旅館（室內）
// 1F：左邊是大廳（傳送門、紫色地毯、櫃台和公關），中間的走廊往上通到後院墓園的門、左牆是上 2F 的樓梯，右邊是自助餐廳
// 後院墓園是另一個場景（HW01031/yard）
(function () {
  const R = (window.RPG = window.RPG || {});
  R.MAPS = R.MAPS || {};

  const ROOMS = {
    lobby: { x: 80, y: 1115, w: 660, h: 745 },
    back: { x: 80, y: 720, w: 660, h: 365 },          // 櫃台後面（只有員工）
    hall: { x: 740, y: 1460, w: 1740, h: 400 },
    corridor: { x: 920, y: 240, w: 400, h: 1230 },
    link: { x: 1320, y: 1340, w: 220, h: 130 },
    restaurant: { x: 1520, y: 600, w: 1460, h: 1140 },
  };
  const COUNTER = { x: 80, y: 1085, w: 660, h: 30 };
  const CABINET = { x: 292, y: 860, w: 208, h: 170 };
  const CARPET = { x: 140, y: 1208, w: 572, h: 280 };
  const TABLES = [
    { x: 1720, y: 732, w: 120, h: 148 }, { x: 2240, y: 828, w: 180, h: 192 }, { x: 1760, y: 1068, w: 120, h: 172 },
  ];
  const CHAIRS = [
    { x: 1610, y: 812, w: 56, h: 56 }, { x: 1890, y: 776, w: 60, h: 60 }, { x: 2140, y: 932, w: 60, h: 56 },
    { x: 2470, y: 892, w: 64, h: 66 }, { x: 1645, y: 1155, w: 56, h: 56 }, { x: 1915, y: 1125, w: 64, h: 64 },
  ];
  const BUFFET = [
    { x: 2800, y: 652, w: 110, h: 136 }, { x: 2852, y: 920, w: 90, h: 180 }, { x: 2848, y: 1248, w: 92, h: 132 }, { x: 2872, y: 1488, w: 88, h: 172 },
  ];

  R.MAPS.HW01031 = {
    indoor: true, scare: true, battleRoom: "scare",
    bgm: "sounds/bgm-hotel.mp3",
    w: 3060, h: 1920,
    rooms: ROOMS, counter: COUNTER, cabinet: CABINET, carpet: CARPET, tables: TABLES, chairs: CHAIRS, buffet: BUFFET,
    door: { x: 960, y: 190, w: 260, h: 60 },           // 往後院墓園
    stairs: { x: 852, y: 320, w: 68, h: 340 },          // 上 2F（還沒做）
    walk: [ROOMS.lobby, ROOMS.hall, ROOMS.corridor, ROOMS.link, ROOMS.restaurant],
    solids: [...TABLES, ...CHAIRS, ...BUFFET],
    arrive: { x: 420, y: 1640 },
    portal: { x: 420, y: 1720 },
    fromYard: { x: 1120, y: 330 },
    zone: { dy: 62, r: 46 },
    npcs: [
      { id: "haihai", name: "骸骸", x: 300, y: 1040, zdy: 130, color: "#d9731e", quests: ["HW01031-02"],
        asks: {"guan": [{"q": "今天是第幾年的萬聖節？我算算……卦象說，是永遠。", "a": "答對了！您是第一位答對的客人！請收下這顆南瓜糖，沒有過期，因為今天永遠是今天。"}], "hoffman": [{"q": "櫃台後面那個鑰匙櫃的鎖，是我見過最好的機關鎖之一。", "a": "嘻嘻，那是骨骨經理親手做的！他說骨頭最適合拿來做彈簧。"}]},
        lines: ["歡迎光臨永遠萬聖節旅館！請問今天是第幾年的萬聖節呢？", "您的房卡……咦，房卡又被木乃伊纏起來了。"] },
      { id: "kuku", name: "骷骷", x: 560, y: 1040, zdy: 130, color: "#7a3fb0", quests: ["HW01031-04"],
        asks: {"guan": [{"q": "你的笑聲裡有一股陰氣，不過是好的那種。", "a": "喀喀喀！好的陰氣！這句話可以印在宣傳單上嗎？"}], "hoffman": [{"q": "你的下顎關節磨損得很厲害，要不要我幫你上點油？", "a": "喀……喀喀？哎呀，原來是這個聲音！我一直以為是我的笑點太低了。"}]},
        lines: ["喀喀喀！今晚的嚇人比賽，您報名了嗎？", "笑一個嘛！喀喀喀！"] },
      { id: "gugu", name: "骨骨", x: 620, y: 1560, color: "#3a3a4a", quests: ["HW01031-01", "HW01031-05"],
        asks: {"guan": [{"q": "經理，這間旅館的風水是我見過最陰的。恭喜。", "a": "感謝您的讚美。本館致力於維持最高品質的陰森。"}], "hoffman": [{"q": "樓梯間的幽靈扮演者，是你們特別安排的嗎？", "a": "是自發性的。他們很敬業，我們也不好意思叫他們下班。請小心別被嚇破膽。"}]},
        lines: ["本館的領結規定是骨盆以上、頸椎以下。", "樓梯間的幽靈扮演者們很敬業，請小心別被嚇破膽。"] },
      { id: "gege", name: "骼骼", x: 1600, y: 1420, color: "#4a8a6a", quests: ["HW01031-03"],
        asks: {"guan": [{"q": "地板這麼亮，照得出人的氣色。你今天氣色不錯。", "a": "我沒有氣色。我是骷髏。……不過，謝謝。"}], "hoffman": [{"q": "拖把頭可以換成旋轉式的，省一半力氣。", "a": "旋轉式……你能做嗎？我拖了三百年的地，手臂骨都磨細了。"}]},
        lines: ["地板要拖到能照出骨頭的程度。", "自助餐區的地板總是黏黏的。是史萊姆扮演者又來吃東西了吧。"] },
    ],
  };

  // 後院墓園：喪屍們比較喜歡睡在這裡的墳墓裡
  const GRAVES = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) GRAVES.push({ x: 360 + c * 300 + (r % 2) * 90, y: 360 + r * 300, w: 70, h: 44 });
  R.MAPS["HW01031/yard"] = {
    indoor: true, scare: true, battleRoom: "scare", yard: true,
    bgm: "sounds/bgm-hotel.mp3",
    w: 2400, h: 1500,
    graves: GRAVES,
    walk: [{ x: 60, y: 60, w: 2280, h: 1380 }],
    solids: GRAVES,
    trees: [{ x: 200, y: 220, r: 50 }, { x: 2200, y: 260, r: 56 }, { x: 2160, y: 1180, r: 48 }, { x: 180, y: 1160, r: 52 }],
    backDoor: { x: 1070, y: 1400, w: 260, h: 60 },
    arrive: { x: 1200, y: 1320 },
    portal: null,
    zone: { dy: 62, r: 46 },
    npcs: [],
  };
})();
