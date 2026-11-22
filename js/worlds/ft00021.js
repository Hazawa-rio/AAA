/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/maps/ft00021.js": "20261122223322" });
// 地圖：#FT00021 命運的考驗（S 級・戰役）＝鐵與骨的大教堂
// 一到這裡就直接開戰（js/worlds/ft00021.js）；打贏之後選一張特殊命運卡（js/tarot.js），再找厄羅德回報
// 北：祭壇（命運的見證者・厄羅德）；中間：紅地毯；南：酒館的門
(function () {
  const R = (window.RPG = window.RPG || {});
  R.MAPS = R.MAPS || {};
  const W = 1800, H = 1400;
  const ALTAR = { x: 700, y: 200, w: 400, h: 120 };
  const PILLARS = [0, 1, 2, 3].flatMap((i) => [{ x: 380, y: 420 + i * 220, w: 70, h: 70 }, { x: W - 450, y: 420 + i * 220, w: 70, h: 70 }]);
  R.MAPS.FT00021 = {
    indoor: true, battleRoom: "erod",
    bgm: "sounds/bgm-erod.mp3",
    w: W, h: H,
    walk: [{ x: 40, y: 100, w: W - 80, h: H - 160 }],
    altar: ALTAR, pillars: PILLARS,
    solids: [ALTAR, ...PILLARS],
    arrive: { x: 900, y: 1150 },
    portal: { x: 900, y: 1290 },
    zone: { dy: 62, r: 46 },
    shops: [], potions: [],
    enemies: [],
    npcs: [
      { id: "erod", name: "命運的見證者・厄羅德", face: "厄", x: 900, y: 400, color: "#2a2a8a", quests: ["FT00021-01"],
        lines: ["牌已經發下去了。翻開之後，它就是你的命運——包括背面。", "四把武器，我都放下了。……接下來替你作證的，是你自己。", "命運卡不會說謊。它只是從來不把話說完。"] },
    ],
  };
})();
