/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/maps/dg00777.js": "20261123215910" });
// 地圖：#DG00777 致命賭局（A 級・戰役）＝大莊家斯賓沃迪的賭場
// 一到這裡就直接坐上賭桌（js/worlds/dg00777.js 會馬上開戰）；打贏之後才能在賭場裡走動、用籌碼消費
// 中間：大莊家的賭桌；東：籌碼兌換櫃台（斯賓沃迪在旁邊）；西：一排拉霸機；南：酒館的門
(function () {
  const R = (window.RPG = window.RPG || {});
  R.MAPS = R.MAPS || {};
  const W = 2400, H = 1600;
  const TABLE = { x: 950, y: 560, w: 500, h: 300 };
  const COUNTER = { x: 1880, y: 420, w: 360, h: 120 };
  const SLOTS = [0, 1, 2, 3, 4].map((i) => ({ x: 160 + i * 130, y: 300, w: 90, h: 120 }));
  const ROULETTE = [{ x: 520, y: 1050, r: 110 }, { x: 1880, y: 1050, r: 110 }];
  R.MAPS.DG00777 = {
    indoor: true, battleRoom: "casino",
    bgm: "sounds/casino-bgm.mp3",
    w: W, h: H,
    walk: [{ x: 40, y: 100, w: W - 80, h: H - 160 }],
    table: TABLE, counter: COUNTER, slots: SLOTS, roulette: ROULETTE,
    solids: [TABLE, COUNTER, ...SLOTS, ...ROULETTE.map((r) => ({ x: r.x - r.r, y: r.y - r.r, w: r.r * 2, h: r.r * 2 }))],
    arrive: { x: 1200, y: 960 },
    portal: { x: 1200, y: 1450 },
    zone: { dy: 62, r: 46 },
    shops: [], potions: [],
    enemies: [],
    npcs: [
      { id: "spinwardy", name: "大莊家斯賓沃迪", face: "7", x: 1780, y: 640, color: "#8a1a24", quests: ["DG00777-01"],
        lines: ["籌碼收好了嗎？在這間賭場裡，它比金幣好用。", "賭桌我一直留著。……你什麼時候想再心跳一次，就坐下來。", "我這輩子贏過很多人。可是讓我玩得這麼開心的，你是第一個。"] },
      { id: "croupier", name: "荷官・露露", face: "荷", x: 1700, y: 360, color: "#2a6a4a",
        lines: ["兌換櫃台在這裡。籌碼換東西，不找零。", "老闆說，今天的客人可以拿最好的貨。……你到底跟他賭了什麼？"] },
      { id: "gambler", name: "輸到只剩襯衫的賭客", face: "賭", x: 560, y: 520, color: "#6a6a6e",
        lines: ["我只要再贏一把……就一把……", "別看拉霸機的眼睛。它在看你。"] },
      { id: "bouncer", name: "門口的保鑣", face: "保", x: 1360, y: 1440, color: "#2a2a30",
        lines: ["賭輸的人走這扇門。賭贏的人……也走這扇門。", "老闆心情很好。很久沒看到他這樣笑了。"] },
    ],
  };
})();
