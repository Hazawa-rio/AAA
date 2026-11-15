/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/maps/wp00716.js": "20261116002724" });
// 地圖：#WP00716 多利島主題公園（A 級；第一個「先抵達委託區域」的時空）
// 傳送門固定在停車場。停車場往北＝入園廣場、往東＝員工通道、往西＝海灘步道；三條路都能進到水上樂園（委託人都在裡面）
//   入園廣場：買票（或幫失物招領找東西換一條手環）→ 閘門
//   員工通道：躲開巡邏的保全，從後門溜進去（置物櫃裡有備用的手環；幫清潔阿姨拿拖把會拿到員工證，保全就不管你）
//   海灘步道：抱著泳圈（租的，或幫被海鷗搶走薯條的小孩拿回來，他爸爸會借你）游過潟湖，從碼頭的海灘入口進去
// 水上樂園很大：中央大道（更衣室、販賣部、醫護站、志願者服務處）＋四個區域
//   水池區（標準泳池、兒童池、水槍大戰的場地）、滑水道區（滑水道塔、三個落水池）、漂漂河區（一大圈）、造浪池區（超大的造浪池、塑膠尼斯水怪）
// 委託人是樂園的「志願者」；經營的製藥公司不直接露面
(function () {
  const R = (window.RPG = window.RPG || {});
  R.MAPS = R.MAPS || {};
  const BGM = "sounds/bgm-chinon.mp3";            // 暫用（還沒有多利島的 BGM）
  const common = { indoor: true, wp: true, bgm: BGM, zone: { dy: 62, r: 46 }, enemies: [], enemyWander: 120, enemySpeed: 36 };

  // ===== 停車場（傳送門在這裡） =====
  const CAR_COLORS = ["#e84a4a", "#3a8ad8", "#f2f0ea", "#1d1d1f", "#ffd23a", "#3ab86a", "#9a9aa8", "#e88a3a"];
  const cars = [];
  for (const [ri, y] of [330, 620, 910].entries()) {
    let i = 0;
    for (let x = 260; x <= 2140; x += 170) {
      if (x > 1040 && x < 1360) continue;                 // 中間的走道（往北走到入園廣場）
      cars.push({ id: `car${ri}-${i}`, x, y, color: CAR_COLORS[(ri * 5 + i * 3) % CAR_COLORS.length] });
      i++;
    }
  }
  R.MAPS.WP00716 = {
    ...common, wpScene: "parking",
    w: 2400, h: 1500,
    walk: [{ x: 40, y: 40, w: 2320, h: 1420 }],
    cars,
    solids: cars.map((c) => ({ x: c.x - 34, y: c.y - 58, w: 68, h: 116 })),
    shuttle: { x: 1760, y: 1280 },
    exits: [
      { id: "plaza", x: 1080, y: 40, w: 240, h: 50, to: "plaza", label: "入園廣場", arrow: "↑" },
      { id: "beach", x: 40, y: 560, w: 50, h: 260, to: "beach", label: "海灘步道", arrow: "←" },
      { id: "staff", x: 2310, y: 560, w: 50, h: 260, to: "staff", label: "員工通道", arrow: "→" },
    ],
    arrive: { x: 1200, y: 1220 },
    from: { plaza: { x: 1200, y: 160 }, beach: { x: 160, y: 690 }, staff: { x: 2240, y: 690 } },
    portal: { x: 1200, y: 1340 },
    shops: [{ id: "wpVend", name: "停車場的自動販賣機", keeper: "自動販賣機", x: 1500, y: 1340, color: "#3a8ad8", noIcon: true, greet: "（喀噹。）多利島主題公園歡迎您。本機販售：藥水、冰淇淋（會融化，請盡快食用）。" }],
    potions: ["wpIceCream", "potionHp", "potionMp"],
    arrival: null,
    npcs: [
      { id: "wpKeeper", name: "停車場管理員・老陳", x: 880, y: 1240, color: "#5a6a7a",
        lines: ["往北是入園廣場，正門要買票。往東是員工通道，往西是海灘步道——這兩邊不是給遊客走的，但每年都有人想從那裡溜進去。", "這座島上的車位永遠是滿的。可是園區裡的人，好像從來沒有這麼多。", "接駁車？那是載住宿的客人去度假村的。你有加購住宿嗎？"] },
      { id: "wpDriver", name: "找不到車的阿伯", face: "伯", x: 1520, y: 1180, color: "#8a5a3a", lines: ["我的車呢……我記得停在一台黃色的車旁邊……還是白色的？"] },
    ],
  };

  // ===== 入園廣場 =====
  R.MAPS["WP00716/plaza"] = {
    ...common, wpScene: "plaza",
    w: 2000, h: 1400,
    walk: [{ x: 40, y: 40, w: 1920, h: 1320 }],
    gateLine: { y: 300, h: 40 },
    gate: { x: 940, y: 290, w: 160, h: 60 },                         // 閘門（沒有手環過不去）
    booth: { x: 600, y: 440 },                                        // 售票口
    fountain: { x: 1000, y: 820, r: 110 },
    solids: [{ x: 40, y: 300, w: 900, h: 40 }, { x: 1100, y: 300, w: 860, h: 40 }, { x: 510, y: 380, w: 180, h: 70 }, { x: 1520, y: 940, w: 260, h: 60 }],
    pouchSpots: [{ x: 1000, y: 960, t: "噴水池邊" }, { x: 330, y: 640, t: "長椅底下" }, { x: 1420, y: 1200, t: "垃圾桶旁邊" }, { x: 1780, y: 450, t: "置物櫃前面" }, { x: 640, y: 1220, t: "花圃裡" }],
    exits: [
      { id: "park", x: 900, y: 40, w: 200, h: 60, to: "park", label: "水上樂園", arrow: "↑" },
      { id: "parking", x: 900, y: 1300, w: 200, h: 60, to: null, label: "停車場", arrow: "↓" },
    ],
    arrive: { x: 1000, y: 1220 },
    from: { parking: { x: 1000, y: 1220 }, park: { x: 1000, y: 420 } },
    portal: null,
    shops: [{ id: "wpSouvenir", name: "多利島紀念品店", keeper: "店員・小蘭", x: 1600, y: 560, color: "#e84a8a", greet: "歡迎光臨！尼斯水怪鑰匙圈賣完了，下次請早！冰淇淋和藥水還有喔。" }],
    potions: ["wpIceCream", "potionHp", "potionMp"],
    npcs: [
      { id: "wpTicket", name: "售票員・阿綺", x: 600, y: 470, zdy: 70, color: "#3ab86a", lines: ["一日券，一位 150 金幣。手環戴好，閘門才會開喔。"] },
      { id: "wpLost", name: "失物招領・桂姨", x: 300, y: 1000, color: "#8a6a9a", lines: ["每天都有人來問東西掉在哪裡。昨天是一隻假牙，前天是一個前男友。"] },
      { id: "wpResort", name: "度假村服務台・艾琳", x: 1650, y: 1060, zdy: 70, color: "#c8a040", lines: ["多利島度假村，住宿和 outlet 的加購都在這裡辦理。"] },
    ],
  };

  // ===== 員工通道 =====
  R.MAPS["WP00716/staff"] = {
    ...common, wpScene: "staff",
    w: 2200, h: 1300,
    walk: [{ x: 40, y: 40, w: 2120, h: 1220 }],
    solids: [
      { x: 300, y: 370, w: 500, h: 24 }, { x: 950, y: 370, w: 600, h: 24 }, { x: 1700, y: 370, w: 300, h: 24 },          // 上排房間的牆（門在 800～950、1550～1700、2000～2160）
      { x: 300, y: 900, w: 700, h: 24 }, { x: 1150, y: 900, w: 850, h: 24 },                                              // 下排的牆（門在 1000～1150）
      { x: 300, y: 40, w: 24, h: 330 }, { x: 900, y: 40, w: 24, h: 330 }, { x: 1550, y: 40, w: 24, h: 200 },             // 置物間、倉庫的隔間
      { x: 1250, y: 394, w: 24, h: 300 },                                                                                  // 機房的牆
      { x: 600, y: 700, w: 90, h: 90 }, { x: 860, y: 1060, w: 120, h: 80 }, { x: 1500, y: 1100, w: 90, h: 90 }, { x: 420, y: 1120, w: 100, h: 70 },   // 貨箱
    ],
    lockers: { x: 560, y: 120 },             // 置物間（備用的手環）
    mop: { x: 1250, y: 190 },                // 倉庫裡的拖把
    machine: { x: 1600, y: 600, w: 560, h: 280 },
    guards: [
      { id: "g1", path: [{ x: 540, y: 640 }, { x: 1180, y: 640 }], speed: 70 },
      { id: "g2", path: [{ x: 1650, y: 140 }, { x: 1650, y: 300 }, { x: 2080, y: 300 }, { x: 2080, y: 460 }, { x: 1650, y: 460 }], speed: 60 },
      { id: "g3", path: [{ x: 1300, y: 1030 }, { x: 2060, y: 1030 }, { x: 2060, y: 1200 }, { x: 1300, y: 1200 }], speed: 65 },
    ],
    exits: [
      { id: "parking", x: 40, y: 560, w: 50, h: 220, to: null, label: "停車場", arrow: "←" },
      { id: "park", x: 2110, y: 60, w: 50, h: 220, to: "park", label: "水上樂園的後門", arrow: "→" },
    ],
    arrive: { x: 160, y: 670 },
    from: { parking: { x: 160, y: 670 }, park: { x: 2010, y: 170 } },
    portal: null, shops: [], potions: [],
    npcs: [
      { id: "wpCleaner", name: "清潔阿姨・秀蓮", x: 700, y: 1180, color: "#7a8a5a", lines: ["這條通道我掃了二十年，從來沒看過地下室的門開過。……什麼地下室？我什麼都沒說。"] },
    ],
  };

  // ===== 海灘步道 =====
  R.MAPS["WP00716/beach"] = {
    ...common, wpScene: "beach",
    w: 2400, h: 1400,
    walk: [{ x: 40, y: 40, w: 2320, h: 1320 }],
    lagoon: { x: 700, y: 40, w: 1660, h: 640 },                 // 潟湖（沒有泳圈不能下水）
    pier: { x: 2040, y: 60, w: 300, h: 170 },                   // 水上樂園海灘入口的碼頭
    tower: { x: 1400, y: 780 },                                 // 救生員的瞭望台
    solids: [{ x: 1370, y: 750, w: 60, h: 60 }],
    exits: [
      { id: "parking", x: 2310, y: 880, w: 50, h: 260, to: null, label: "停車場", arrow: "→" },
      { id: "wave", x: 2190, y: 60, w: 150, h: 50, to: "wave", label: "水上樂園・海灘入口", arrow: "↑" },
    ],
    arrive: { x: 2220, y: 1010 },
    from: { parking: { x: 2220, y: 1010 }, wave: { x: 2200, y: 180 } },
    portal: null,
    shops: [], potions: [],
    npcs: [
      { id: "wpRental", name: "泳圈出租・阿姐", x: 520, y: 860, color: "#ff7ac8", lines: ["火鶴、甜甜圈、獨角獸，什麼造型都有。租一個 60 金幣，抱著就能游過潟湖。"] },
      { id: "wpKid", name: "哭哭的小孩", face: "童", x: 900, y: 1100, color: "#3a8ad8", lines: ["嗚嗚……海鷗……我的薯條……"] },
    ],
  };

  // ===== 水上樂園・中央大道（從入園廣場、員工通道進來的地方） =====
  R.MAPS["WP00716/park"] = {
    ...common, wpScene: "park",
    w: 2400, h: 1600,
    walk: [{ x: 40, y: 40, w: 2320, h: 1520 }],
    rooms: [
      { id: "m", name: "男更衣室", x: 300, y: 260, w: 260, h: 180, door: { x: 430, y: 470 }, color: "#3a8ad8" },
      { id: "f", name: "女更衣室", x: 640, y: 260, w: 260, h: 180, door: { x: 770, y: 470 }, color: "#e84a8a" },
    ],
    medical: { x: 1500, y: 260, w: 280, h: 150 },
    snack: { x: 1800, y: 900, w: 260, h: 100 }, queue: { x: 2120, y: 1080 },
    solids: [{ x: 300, y: 260, w: 260, h: 180 }, { x: 640, y: 260, w: 260, h: 180 }, { x: 1500, y: 260, w: 280, h: 150 }, { x: 1800, y: 900, w: 260, h: 100 }, { x: 1080, y: 760, w: 240, h: 60 }],
    exits: [
      { id: "wave", x: 1100, y: 40, w: 200, h: 50, to: "wave", label: "造浪池區", arrow: "↑" },
      { id: "river", x: 2310, y: 300, w: 50, h: 220, to: "river", label: "漂漂河區", arrow: "→" },
      { id: "slide", x: 2310, y: 1150, w: 50, h: 220, to: "slide", label: "滑水道區", arrow: "→" },
      { id: "pool", x: 40, y: 640, w: 50, h: 220, to: "pool", label: "水池區", arrow: "←" },
      { id: "staff", x: 40, y: 1250, w: 50, h: 200, to: "staff", label: "員工通道", arrow: "←" },
      { id: "plaza", x: 1100, y: 1540, w: 200, h: 60, to: "plaza", label: "入園廣場", arrow: "↓" },
    ],
    arrive: { x: 1200, y: 1450 },
    from: { plaza: { x: 1200, y: 1450 }, staff: { x: 160, y: 1350 }, wave: { x: 1200, y: 170 }, river: { x: 2230, y: 410 }, slide: { x: 2230, y: 1260 }, pool: { x: 160, y: 750 } },
    portal: null,
    shops: [{ id: "wpSnack", name: "樂園販賣部", keeper: "店員・阿丹", x: 1930, y: 1040, color: "#e88a3a", greet: "熱狗、薯條、冰淇淋——藥水？我們這裡什麼都賣。排隊喔！" }],
    potions: ["wpIceCream", "potionHp", "potionMp"],
    npcs: [
      { id: "xiaorui", name: "志願者・小芮", x: 1300, y: 520, color: "#e84a8a", quests: ["WP00716-01"],
        lines: ["我是樂園的志願者。每天在這裡發問卷、幫忙、泡水，就有錢拿——很好的打工吧？", "這裡的水很特別。泡久了，身體會變得很輕。"] },
      { id: "wpWorker", name: "排隊的上班族", face: "班", x: 2240, y: 1150, color: "#5a6a8a", lines: ["我只請了半天假……這隊伍怎麼一動也不動……"] },
      { id: "wpGuide", name: "園區導覽員・小柚", x: 1200, y: 960, color: "#3ab86a", lines: ["往北是造浪池區、往東北是漂漂河區、往東是滑水道區、往西是水池區。更衣室在西北邊，換上泳裝再玩比較舒服喔！"] },
    ],
  };

  // ===== 造浪池區（超大的造浪池＋塑膠尼斯水怪；海灘入口也在這裡） =====
  R.MAPS["WP00716/wave"] = {
    ...common, wpScene: "wave",
    w: 3200, h: 2600,
    walk: [{ x: 40, y: 40, w: 3120, h: 2520 }],
    wave: { x: 300, y: 260, w: 2600, h: 1900, shallow: 1500 },   // y ≥ shallow 是淺水區（平常只能走到這裡）
    nessie: { x: 1600, y: 380 },
    solids: [],
    gogglesSpots: [{ x: 600, y: 1700 }, { x: 1100, y: 1950 }, { x: 1800, y: 1650 }, { x: 2400, y: 1900 }, { x: 2700, y: 1620 }],
    samples: [{ id: "wave", name: "造浪池", x: 1000, y: 2210 }],
    suspects: [{ x: 700, y: 1800 }, { x: 2300, y: 1750 }],
    exits: [
      { id: "park", x: 1500, y: 2540, w: 200, h: 60, to: "park", label: "中央大道", arrow: "↓" },
      { id: "beach", x: 3110, y: 80, w: 50, h: 200, to: "beach", label: "海灘入口（潟湖）", arrow: "→" },
    ],
    arrive: { x: 1600, y: 2440 },
    from: { park: { x: 1600, y: 2440 }, beach: { x: 3020, y: 180 } },
    portal: null, shops: [], potions: [],
    npcs: [
      { id: "wpLifeguard", name: "救生員・阿浪", x: 1600, y: 2260, color: "#e84a4a", lines: ["造浪池的深水區有尼斯水怪。塑膠的。它會捲起很大的浪——那是設計好的，放心。"] },
    ],
  };

  // ===== 漂漂河區（很大的一圈；水會帶著你順時針漂） =====
  R.MAPS["WP00716/river"] = {
    ...common, wpScene: "river",
    w: 3000, h: 2200,
    walk: [{ x: 40, y: 40, w: 2920, h: 2120 }],
    river: { x: 300, y: 300, w: 2400, h: 1600 },
    island: { x: 560, y: 560, w: 1880, h: 1080 },
    solids: [],
    samples: [{ id: "river", name: "漂漂河", x: 1500, y: 1960 }],
    suspects: [{ x: 430, y: 900 }, { x: 2570, y: 1300 }],
    exits: [{ id: "park", x: 40, y: 1950, w: 50, h: 200, to: "park", label: "中央大道", arrow: "←" }],
    arrive: { x: 160, y: 2050 },
    from: { park: { x: 160, y: 2050 } },
    portal: null, shops: [], potions: [],
    npcs: [
      { id: "wpRiverGuard", name: "救生員・小潮", x: 1500, y: 2060, color: "#e84a4a", lines: ["漂漂河一圈要漂二十分鐘。有人一漂就是一整天，叫都叫不醒。"] },
    ],
  };

  // ===== 滑水道區（滑水道塔＋三條滑水道，各自滑進自己的落水池） =====
  R.MAPS["WP00716/slide"] = {
    ...common, wpScene: "slide",
    w: 2600, h: 2000,
    walk: [{ x: 40, y: 40, w: 2520, h: 1920 }],
    tower: { x: 1300, y: 640 },
    pools: {
      rainbow: { x: 200, y: 1300, w: 520, h: 420, end: { x: 460, y: 1330 } },
      black: { x: 1040, y: 1420, w: 520, h: 420, end: { x: 1300, y: 1450 } },
      funnel: { x: 1880, y: 1300, w: 520, h: 420, end: { x: 2140, y: 1330 } },
    },
    solids: [{ x: 1220, y: 560, w: 160, h: 160 }],
    samples: [{ id: "splash", name: "落水池", x: 1300, y: 1880 }],
    suspects: [{ x: 1150, y: 1600 }, { x: 1450, y: 1700 }],
    exits: [{ id: "park", x: 40, y: 900, w: 50, h: 220, to: "park", label: "中央大道", arrow: "←" }],
    arrive: { x: 160, y: 1010 },
    from: { park: { x: 160, y: 1010 } },
    portal: null, shops: [], potions: [],
    npcs: [
      { id: "haige", name: "志願者・海哥", x: 1080, y: 820, color: "#e88a3a", quests: ["WP00716-03"],
        lines: ["很好！今天的水流也很有精神！", "我在這裡當志願者三個月了！皮膚曬得越黑，身體越輕！"] },
      { id: "wpStudent", name: "高中生・阿哲", x: 1520, y: 820, color: "#3ab86a", lines: ["這座塔我滑過一百次了。要比嗎？"] },
    ],
  };

  // ===== 水池區（標準泳池、兒童池、水槍大戰的場地） =====
  R.MAPS["WP00716/pool"] = {
    ...common, wpScene: "pool",
    w: 2600, h: 2000,
    walk: [{ x: 40, y: 40, w: 2520, h: 1920 }],
    lap: { x: 700, y: 260, w: 1300, h: 600 },                  // 50 公尺標準泳池
    kids: { x: 260, y: 1180, w: 620, h: 420 },
    arena: { x: 1260, y: 1150, w: 1000, h: 620 },               // 水槍大戰的場地
    solids: [{ x: 360, y: 860, w: 200, h: 70 }],
    samples: [{ id: "kids", name: "兒童池", x: 570, y: 1650 }],
    suspects: [{ x: 420, y: 1300 }, { x: 760, y: 1480 }],
    exits: [{ id: "park", x: 2510, y: 900, w: 50, h: 220, to: "park", label: "中央大道", arrow: "→" }],
    arrive: { x: 2440, y: 1010 },
    from: { park: { x: 2440, y: 1010 } },
    portal: null, shops: [], potions: [],
    npcs: [
      { id: "ajing", name: "志願者・阿淨", x: 460, y: 990, color: "#2a8aa8", quests: ["WP00716-02"],
        lines: ["一天驗三十次水。手指頭都被試紙染成彩虹色了。", "水質就是一切。……上面的人是這樣說的。"] },
      { id: "wpLounger", name: "躺椅上的阿伯", face: "伯", x: 1500, y: 960, color: "#8a6a4a", lines: ["年輕人，這裡的太陽曬起來特別舒服。曬著曬著，就忘記自己幾歲了。"] },
      { id: "wpMom", name: "兒童池邊的媽媽", face: "媽", x: 960, y: 1380, color: "#c0507a", lines: ["小宇的蛙鏡掉進造浪池了，他哭得好傷心……"] },
      { id: "wpGunHost", name: "水槍大戰主持・阿翔", x: 1760, y: 1080, color: "#2a8ad8", lines: ["水槍大戰！搶中間的旗子、帶回自己的基地！只能用水槍和水球喔！"] },
    ],
  };
})();
