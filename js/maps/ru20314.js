/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/maps/ru20314.js": "20261113040753" });
// 地圖：#RU20314 古代遺跡科考隊（B 級時空）
// 南：森林外的草地（傳送門，C 級委託在這裡調查魔物痕跡）
// 中：森林中央的科考隊營地；北：古代遺跡的石門（遺跡內部還在準備中）
// 用室內地圖的引擎（可以走的範圍＋樹幹是圓形的障礙物），森林裡有比較兇的魔物
(function () {
  const R = (window.RPG = window.RPG || {});
  R.MAPS = R.MAPS || {};

  const W = 3200, H = 2600;
  const MEADOW_Y = 2120;                                         // 這條線以南是森林外的草地
  const CAMP = { x: 1600, y: 1350, rx: 420, ry: 320 };           // 營地空地（橢圓）
  const GATE_CLEAR = { x: 1120, y: 100, w: 960, h: 520 };         // 石門前的空地
  const PATH_S = { x: 1470, y: 1600, w: 260, h: 560 };            // 草地 → 營地的小路
  const PATH_N = { x: 1490, y: 560, w: 220, h: 540 };             // 營地 → 石門的小路
  const inRect = (r, x, y, m = 0) => x > r.x - m && x < r.x + r.w + m && y > r.y - m && y < r.y + r.h + m;
  const clear = (x, y, m) => y > MEADOW_Y - 40 - m || ((x - CAMP.x) / (CAMP.rx + m)) ** 2 + ((y - CAMP.y) / (CAMP.ry + m)) ** 2 < 1 || inRect(GATE_CLEAR, x, y, m) || inRect(PATH_S, x, y, m) || inRect(PATH_N, x, y, m);

  // 樹：固定亂數種子撒在森林裡（避開草地、營地、小路、石門前）
  const TREES = [];
  let seed = 20314; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let y = 120; y < MEADOW_Y; y += 120) for (let x = 90; x < W - 60; x += 125) {
    const tx = x + (rnd() - 0.5) * 70, ty = y + (rnd() - 0.5) * 60;
    if (clear(tx, ty, 50)) continue;
    if (rnd() < 0.18) continue;                                   // 留一些林間空隙
    TREES.push({ x: Math.round(tx), y: Math.round(ty), r: 22 + Math.round(rnd() * 8), canopy: 52 + Math.round(rnd() * 20) });
  }
  // 遠離小路的林間空地（魔物的地盤）：把樹清掉一些
  const DENS = [{ x: 560, y: 900, r: 230 }, { x: 2650, y: 1500, r: 230 }, { x: 700, y: 1800, r: 200 }, { x: 2500, y: 650, r: 220 }, { x: 560, y: 380, r: 200 }, { x: 2700, y: 1900, r: 180 }, { x: 420, y: 1960, r: 170 }];
  for (let i = TREES.length - 1; i >= 0; i--) if (DENS.some((d) => Math.hypot(TREES[i].x - d.x, TREES[i].y - d.y) < d.r)) TREES.splice(i, 1);

  const TENTS = [{ x: 1290, y: 1170, w: 150, h: 110, color: "#c8742a" }, { x: 1780, y: 1120, w: 160, h: 110, color: "#3a7a8a" }, { x: 1740, y: 1480, w: 140, h: 100, color: "#7a8a3a" }];
  const CRATES = [{ x: 1340, y: 1500, w: 70, h: 60 }, { x: 1420, y: 1520, w: 56, h: 50 }, { x: 1920, y: 1330, w: 60, h: 60 }];
  const TABLE = { x: 1520, y: 1190, w: 150, h: 70 };
  const GATE = { x: 1400, y: 130, w: 400, h: 190 };
  const PILLARS = [{ x: 1280, y: 220, r: 34 }, { x: 1920, y: 220, r: 34 }, { x: 1250, y: 470, r: 30 }, { x: 1950, y: 470, r: 30 }];

  R.MAPS.RU20314 = {
    barks: { gate: { ilshu: "有種不妙的預感阿..." } },             // 找到隱藏的石門開關
    indoor: true, battleRoom: "ruinsWild", forest: true,
    bgm: "sounds/bgm-chinon.mp3",            // 暫用（還沒有遺跡的 BGM）
    w: W, h: H, meadowY: MEADOW_Y,
    camp: CAMP, tents: TENTS, crates: CRATES, table: TABLE, gate: GATE, pillars: PILLARS, pathS: PATH_S, pathN: PATH_N, gateClear: GATE_CLEAR,
    fire: { x: 1600, y: 1360 },
    walk: [{ x: 60, y: 90, w: W - 120, h: H - 140 }],
    forestTrees: TREES,                      // 樹幹和石柱是圓形障礙物（js/worlds/ru20314.js 的 blocked）；不用 trees，免得被畫成草原的樹
    roundSolids: [...TREES, ...PILLARS],
    solids: [...TENTS, ...CRATES, TABLE, GATE],
    arrive: { x: 1600, y: 2360 },
    portal: { x: 1600, y: 2450 },
    zone: { dy: 62, r: 46 },
    // 森林裡的魔物（B 級：比奇儂鎮的草原兇）
    enemyWander: 160, enemySpeed: 48,
    wolf: { aggro: 250, speed: 150, leash: 560, packs: { forestWolves: 3, edgeWolves: 2 }, howl: "sounds/wolf-howl-short.mp3" },
    enemies: [
      { id: "f1", kind: "forestWolves", x: 560, y: 900 },
      { id: "f2", kind: "mossSlimes", x: 2650, y: 1500 },
      { id: "f3", kind: "mossSlimes", x: 700, y: 1800 },
      { id: "f4", kind: "forestWolves", x: 2500, y: 650 },
      { id: "f5", kind: "mossSlimes", x: 560, y: 380 },
      // 森林邊緣：和奇儂鎮一樣的魔狼、史萊姆
      { id: "e1", kind: "edgeWolves", x: 2700, y: 1900 },
      { id: "e2", kind: "edgeSlimes", x: 420, y: 1960 },
    ],
    // C 級委託：森林外的魔物痕跡（每趟隨機挑 5 個；金屬碎片一定在）
    traces: [
      { id: "metal", x: 2380, y: 2210, title: "青銅色的金屬碎片", text: "草叢裡卡著一片青銅色的金屬碎片，邊緣還在發燙。上面的紋路——和營地北邊那扇石門上的一模一樣。" },
      { id: "claw", x: 860, y: 2090, title: "樹幹上的爪痕", text: "森林邊的樹幹上有三道很深的爪痕，間距比魔狼的爪子寬了一倍。痕跡很新。" },
      { id: "drag", x: 1250, y: 2300, title: "拖行的痕跡", text: "草地上有一條被拖行過的寬痕，一路延伸進森林。被拖走的東西很重。" },
      { id: "burn", x: 2050, y: 2420, title: "燒焦的圓", text: "一圈草被燒焦了。焦痕是完美的圓形，邊緣整齊得像用圓規畫的。" },
      { id: "steps", x: 420, y: 2300, title: "方形的腳印", text: "一排方形的壓痕，一步一步，間距完全相等。不像任何活著的東西會留下的腳印。" },
      { id: "cut", x: 2780, y: 2080, title: "切斷的樹枝", text: "一排低矮的樹枝被齊齊切斷，斷面光滑得像被光切過。" },
      { id: "goo", x: 640, y: 2460, title: "發光的黏液", text: "一灘發著微光的綠色黏液，不是史萊姆的——史萊姆的黏液不會發光，也不會嗡嗡作響。" },
      { id: "rock", x: 2840, y: 2400, title: "被推開的大石頭", text: "一塊比人還高的石頭被推開了好幾步，地上留下兩條平行的溝。" },
    ],
    npcs: [
      { id: "grace", name: "葛瑞絲", x: 1600, y: 1270, color: "#6a7a3a", quests: ["RU20314-01", "RU20314-02"],
        asks: { guan: [{ q: "這座森林的氣，全都往北邊那扇門流過去。", a: "……你也感覺到了？我們的指北針每天中午都會偏三度，偏向石門。" }], hoffman: [{ q: "石門的鉸鏈在哪裡？我沒看到任何鉸鏈。", a: "沒有鉸鏈。沒有縫。我們甚至不確定它是「門」，只是大家都這麼叫。" }] },
        lines: ["科考隊的第一條規則：不要一個人進森林。第二條：真的要進，也要帶三支鉛筆。", "石門後面有聲音。很規律的聲音，像是有東西在走路。"] },
      { id: "sylas", name: "賽勒斯", x: 1880, y: 1290, color: "#3a6a8a", quests: ["RU20314-03"],
        asks: { guan: [{ q: "你的地圖上，遺跡那一格是空白的。", a: "因為我畫不出來。每次畫到石門，筆就斷。這是第十七支了。" }], hoffman: [{ q: "你的比例尺用錯了。這張地圖北邊被壓縮了一成。", a: "……我以為是森林在長大。原來是我的問題？還是森林的問題？" }] },
        lines: ["整座森林我都畫完了，除了石門後面。", "要是能進去，我想畫下遺跡裡的每一條走廊。"] },
      { id: "dora", name: "朵拉", x: 1600, y: 1440, color: "#8a4a2a", quests: ["RU20314-04"],
        asks: { guan: [{ q: "你看機械的眼神，比看人溫柔。", a: "機械不會說謊。……人偶爾也不會，但很少。" }], hoffman: [{ q: "那台守衛機關的關節，用的是三重棘輪？", a: "你也看出來了？！你是哪個學派的？我們可以聊一整晚。" }] },
        lines: ["我剛從城裡拿工具回來。遺跡裡的機關，是我這輩子見過最漂亮的東西。", "「別打壞了」——我知道這句話很難做到。"] },
      { id: "nova", name: "諾娃", x: 1380, y: 1400, color: "#8a5a7a", quests: ["RU20314-05"],
        asks: { guan: [{ q: "你的報告裡，受傷的人比你說出口的多一個。", a: "……那個人是我。我不想寫自己。" }], hoffman: [{ q: "你的報告夾裡，有一份古代機械的草圖。畫得很好。", a: "那是朵拉畫的，她回城裡去拿工具了。她說遺跡的守衛是「無價的研究材料」。我說它是「會開火的東西」。" }] },
        lines: ["每一次受傷，我都會寫進報告裡。報告已經很厚了。", "皮普最後一次無線電，說他聽到石門在「呼吸」。"] },
    ],
  };
})();
