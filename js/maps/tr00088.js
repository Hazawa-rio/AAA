/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/maps/tr00088.js": "20261114045024" });
// 地圖：#TR00088 不停歇的月台（C 級時空）
// 四座月台（南＝抵達的地方、東、北、西）長得都一樣：上面是一直在跑的列車，中間是月台（有自動販賣機），
// 下面隔著一排閘門是大廳。列車車廂是另一個場景：找個位子小睡一會，醒來就到了下一座月台（逆時針：南→東→北→西→南）
(function () {
  const R = (window.RPG = window.RPG || {});
  R.MAPS = R.MAPS || {};

  const W = 2000, H = 1300;
  const PLAT = { x: 60, y: 300, w: 1880, h: 450 };              // 月台
  const HALL = { x: 60, y: 830, w: 1880, h: 410 };              // 大廳
  const GATE_Y = 750, GATE_H = 80;
  const GATES = [640, 880, 1120, 1360].map((x, i) => ({ id: `g${i}`, x, y: GATE_Y, w: 80, h: GATE_H }));
  // 閘門之間的欄杆（擋路）
  const RAILS = [];
  let gx = 60;
  for (const g of GATES) { RAILS.push({ x: gx, y: GATE_Y + 20, w: g.x - gx, h: 40 }); gx = g.x + g.w; }
  RAILS.push({ x: gx, y: GATE_Y + 20, w: 1940 - gx, h: 40 });

  const NAMES = { S: "南月台", E: "東月台", N: "北月台", W: "西月台" };
  const npcAt = {
    S: [
      { id: "carlo", name: "卡洛", x: 560, y: 980, color: "#3a5a8a", quests: ["TR00088-01"],
        asks: { guan: [{ q: "你揮旗子的手，從來沒有放下來過吧。", a: "放下來的話，列車會以為沒有人在等它。……它其實不會停。但我還是揮。" }], hoffman: [{ q: "這條環狀軌道的周長，大約要繞多久？", a: "睡一覺。不管你睡多久，醒來都剛好到下一座月台。這是列車的規矩。" }] },
        lines: ["列車永遠不停，但永遠有人上車、下車。", "我在南月台揮了一輩子旗子。"] },
      { id: "glen", name: "葛倫", x: 1500, y: 1000, color: "#7a5a2a", quests: ["TR00088-02"],
        lines: ["我在等車上的商人交貨。她說她會「在列車經過的時候」交給我。……列車每天都經過。", "地面上的人買車上的貨，車上的人買地面上的貨。我們就這樣做了三代生意。"] },
    ],
    E: [
      { id: "mei", name: "小梅", x: 1000, y: 1000, color: "#c0507a", quests: ["TR00088-01"],
        lines: ["爺爺說他會在東月台下車。他說了三圈了。", "每一次列車經過，我都以為下一節車廂裡就是他。"] },
    ],
    N: [{ id: "newsie", name: "北月台的報攤老闆", x: 1000, y: 1000, color: "#5a6a3a", lines: ["報紙？今天的、明天的、繞了一圈回來的昨天的，都有。", "車上出生的孩子，第一次下車都會跌倒。地面不會晃，他們不習慣。"] }],
    W: [{ id: "sweeper", name: "西月台的清潔員", x: 1000, y: 1000, color: "#4a7a7a", lines: ["列車經過的時候會掉下很多東西：車票、橘子皮、還有一次掉下了一整個婚禮。", "最近有一群人專門跳閘門，把我剛掃好的地都踩髒了。"] }],
  };
  function platform(dir) {
    return {
      indoor: true, battleRoom: "train", platform: dir, platName: NAMES[dir],
      bgm: "sounds/bgm-post.mp3",            // 暫用（還沒有月台的 BGM）
      w: W, h: H, plat: PLAT, hall: HALL, gates: GATES, rails: RAILS,
      walk: [PLAT, HALL, ...GATES],
      solids: [...RAILS],
      board: { x: 1000, y: 330 },                                  // 跳上列車的地方（月台邊）
      vending: { x: 1700, y: 400 },
      arrive: dir === "S" ? { x: 1000, y: 1120 } : { x: 1000, y: 400 },
      portal: dir === "S" ? { x: 1000, y: 1200 } : null,
      zone: { dy: 62, r: 46 },
      shops: [{ id: `vend${dir}`, name: "自動販賣機", keeper: "自動販賣機", x: 1700, y: 400, color: "#c0392b", noIcon: true, greet: "（喀噹。）歡迎光臨。本機販售：熱可可、乳酸飲料、鋁罐可樂，還有藥水。" }],
      potions: ["hotCocoa", "lactoDrink", "colaCan", "potionHp", "potionMp"],
      barks: { catchDodger: { firsler: "給老娘乖乖交錢！", marika: "膽小鬼！上哪去！" } },          // 抓到逃票客時說的話
      // 第一次抵達（南月台）時說的話
      arrival: dir === "S" ? { ilshu: "這台火車...就這麼一直行駛著嗎...", vivilla: "火車行駛的聲音好吵啊...", cangyou: "這台火車，要多久才會離站呢？" } : null,
      enemyWander: 120, enemySpeed: 34,
      enemies: dir === "N" ? [{ id: "tbN1", kind: "ticketBots", x: 400, y: 520 }] : dir === "W" ? [{ id: "tbW1", kind: "ticketBots", x: 1500, y: 560 }] : dir === "E" ? [{ id: "tbE1", kind: "ticketBots", x: 300, y: 1000 }] : [],
      npcs: npcAt[dir],
    };
  }
  R.MAPS.TR00088 = platform("S");
  R.MAPS["TR00088/E"] = platform("E");
  R.MAPS["TR00088/N"] = platform("N");
  R.MAPS["TR00088/W"] = platform("W");
  R.MAPS.TR00088.order = ["S", "E", "N", "W"];
  R.MAPS.TR00088.names = NAMES;

  // 列車的車廂：中間是走道，上下兩排座位（點座位＝小睡一會）
  R.MAPS["TR00088/train"] = {
    indoor: true, battleRoom: "train", trainCar: true,
    arrival: { firsler: "好長的車廂，老娘可以在這裡跑上一輩子！", ilshu: "深不見底呢", cangyou: "真想躺著睡一覺啊..." },     // 這輪冒險第一次上車時說的話
    bgm: "sounds/bgm-post.mp3",
    w: 3000, h: 760,
    walk: [{ x: 60, y: 250, w: 2880, h: 260 }],
    seatsTop: { y: 170, h: 80 }, seatsBottom: { y: 510, h: 80 },
    solids: [],
    arrive: { x: 300, y: 380 },
    portal: null,
    zone: { dy: 62, r: 46 },
    enemies: [],
    npcs: [
      { id: "otis", name: "歐提斯", x: 900, y: 380, color: "#2a3a5a", quests: ["TR00088-03"],
        asks: { ilshu: [{ q: "你沒有想過下車嗎？", a: "出了列車，那又是一個陌生的世界了阿..." }], firsler: [{ q: "老娘最擅長的就是逮人！", a: "這些逃票客每個都比您高呢...", quest: true }], guan: [{ q: "你剪的每一張票，你都記得。", a: "記得。四十年，三百萬張。有一張是我自己的——出生那天，我媽媽替我買的。" }], hoffman: [{ q: "你的剪票鉗咬合角度歪了零點五度。", a: "……四十年來第一個發現的人。那是我故意的，這樣我剪的洞，一看就知道是我剪的。" }] },
        lines: ["剪票剪了四十年，從沒漏剪過一張。……直到那群逃票客出現。", "車廂是我的家，車票是我的信。每一張都要剪。"] },
      { id: "oldman", name: "睡過頭的老先生", x: 1600, y: 300, color: "#7a6a5a", quests: ["TR00088-01"],
        lines: ["呼……呼……（睡得很熟）", "……東月台……再五分鐘……"] },
      { id: "mira", name: "米拉", x: 2300, y: 460, color: "#8a6a3a", quests: ["TR00088-02"],
        asks: { vivilla: [{ q: "你收外面的蘑菇嗎?", a: "看上去很新奇，我收了！", gold: 3 }], guan: [{ q: "你從沒踩過不會晃的地面。", a: "沒有。我聽說地面是「靜止」的。……那不會很可怕嗎？" }], hoffman: [{ q: "你的秤，砝碼被列車晃得少了兩克。", a: "所以我都多給兩克。列車上的生意，靠的是信用。" }] },
        lines: ["歡迎來到第四千節車廂的市場！今天有剛從北邊農田經過時摘的蘋果。", "我出生在這節車廂，我媽媽也是。我們家的地址是「第四千節車廂，左邊第三個座位」。"] },
      { id: "kidT", name: "車上的小孩", x: 600, y: 470, color: "#4a8fb0",
        lines: ["我在數車廂。數到第一萬兩千節的時候，數到自己這一節了。", "地面上的人為什麼要下車？下車以後要去哪裡？"] },
    ],
  };
})();
