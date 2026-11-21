/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/maps/sp10101-cool.js": "20261122024623" });
// 地圖：#SP10101 遞廻齒輪鑲嵌之國・下層的冷卻工廠
// 上層所有的機器都靠這裡送上去的冷卻水撐著。西邊是冷卻水槽和主泵，中間是分流閥，北牆是送往上層各區的出水口
// 東邊是主排氣塔；四周的排氣口連著整座城的蒸氣管（蒸氣幽靈在這些口之間跳來跳去）
(function () {
  const R = (window.RPG = window.RPG || {});
  R.MAPS = R.MAPS || {};
  const W = 2800, H = 1800;
  const TANK = { x: 160, y: 300, w: 280, h: 400 };
  const PUMP = { x: 600, y: 500 };
  // 分流閥：a／b 兩個出口（to＝接到哪裡：另一個分流閥，或出水口）
  const JUNC = {
    j1: { x: 900, y: 500, a: "j2", b: "j3" },
    j2: { x: 1200, y: 280, a: "tower", b: "expo" },
    j3: { x: 1200, y: 760, a: "market", b: "drain" },
  };
  const OUTLETS = {
    tower: { x: 1400, y: 120, name: "鐘樓廣場" },
    expo: { x: 2050, y: 120, name: "博覽會會場（繫留塔）" },
    market: { x: 2620, y: 760, name: "齒輪市集" },
    drain: { x: 1200, y: 1100, name: "排水溝" },
  };
  // 排氣口（蒸氣幽靈的家；旁邊有一個小閥門）
  const VENTS = [{ x: 620, y: 1060 }, { x: 980, y: 1420 }, { x: 1560, y: 1300 }, { x: 2060, y: 1520 }, { x: 2480, y: 1160 }, { x: 2480, y: 420 }];
  const STACK = { x: 1820, y: 640, w: 160, h: 160 };             // 主排氣塔
  const LIFT = { x: 400, y: 1600 };
  R.MAPS["SP10101/cool"] = {
    indoor: true, battleRoom: "coolFactory", coolFactory: true, npcInk: "#d8f4ff",
    bgm: "sounds/bgm-ruins.mp3",              // 暫用（還沒有冷卻工廠的 BGM）
    w: W, h: H,
    walk: [{ x: 80, y: 80, w: W - 160, h: H - 160 }],
    solids: [TANK, STACK, { x: PUMP.x - 50, y: PUMP.y - 50, w: 100, h: 100 }],
    tank: TANK, pump: PUMP, junc: JUNC, outlets: OUTLETS, vents: VENTS, stack: STACK, lift: LIFT,
    arrive: { x: 400, y: 1480 },
    portal: null,
    zone: { dy: 62, r: 46 },
    shops: [], potions: [],
    enemyWander: 160, enemySpeed: 40,
    enemies: [
      { id: "spc-e1", kind: "ghosts", x: 1500, y: 1000 },
      { id: "spc-e2", kind: "ghosts3", x: 2300, y: 900 },
      { id: "spc-e3", kind: "ghosts", x: 800, y: 260 },
    ],
    npcs: [
      { id: "foreman", name: "冷卻工廠的工頭・老閥", ...{ x: 560, y: 1440 }, color: "#3a6a8a",
        lines: ["主泵要有人一直搖著才會轉起來。搖滿了，冷卻水就會照分流閥的方向跑。", "分流閥點一下就換一邊。水往哪裡流，地上的管子會告訴你。", "排氣口裡的那些東西？它們會偷轉我的分流閥。煩死了。"],
        asks: { hoffman: [{ q: "這座工廠，是誰設計的？", a: "很久以前一個姓奧本的老師傅。聽說他設計完這裡就不見了。……你認識他？" }] } },
      { id: "stoker", name: "鍋爐工・小炭", ...{ x: 1700, y: 1000 }, color: "#6a4a3a",
        lines: ["上面的人只看得到機器，看不到我們。", "那艘伊卡洛斯號起飛的時候，把繫留塔的冷卻管一起扯斷了。"] },
    ],
  };
})();
