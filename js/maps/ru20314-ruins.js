/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/maps/ru20314-ruins.js": "20261113040753" });
// 地圖：#RU20314 古代遺跡內部（場景 RU20314/ruins）
// 房間的位置和連接照使用者畫的結構圖（5 列）：
//   藍色＝入口（固定：中間有一塊石台、牆上爬著藤蔓，藤蔓下可能藏一個寶箱）
//   黃色＝寶庫（殲滅矩陣守在這裡）・紅色＝皮普可能的藏身處（每趟隨機一間）
//   最上面的暗紅色＝秘密寶庫（試煉 Boss 超古代兵器・翁爾貢；打倒寶庫的殲滅矩陣之後，封印的門才會打開）
//   其他房間每趟隨機分配成 7 種房間之一；房間之間用長走廊連接，走廊每趟隨機放噴火、鋸片或地刺
(function () {
  const R = (window.RPG = window.RPG || {});
  R.MAPS = R.MAPS || {};

  const X = [650, 1800, 2950, 4100, 5250], Y = [450, 1450, 2500, 3550, 4600];
  const SIZE = {
    r03: [1000, 620],
    r10: [620, 560], r11: [640, 560], r12: [720, 600], r13: [800, 620], r14: [820, 600],
    r20: [680, 540], r21: [560, 700], r22: [720, 640], r23: [860, 640], r24: [900, 700],
    r30: [640, 560], r31: [600, 520], r32: [660, 560], r33: [700, 540], r34: [820, 600],
    r40: [620, 760], r41: [640, 560], r42: [800, 780], r43: [780, 660], r44: [700, 660],
  };
  const ROOMS = {};
  for (const [id, [w, h]] of Object.entries(SIZE)) { const r = Number(id[1]), c = Number(id[2]); ROOMS[id] = { id, row: r, col: c, x: X[c] - w / 2, y: Y[r] - h / 2, w, h, cx: X[c], cy: Y[r] }; }
  const LINKS = [["r03", "r13"], ["r10", "r11"], ["r11", "r12"], ["r12", "r13"], ["r14", "r24"], ["r11", "r21"],
    ["r20", "r21"], ["r21", "r22"], ["r22", "r23"], ["r23", "r24"], ["r20", "r30"], ["r21", "r31"], ["r24", "r34"],
    ["r30", "r31"], ["r31", "r32"], ["r32", "r33"], ["r33", "r34"], ["r31", "r41"], ["r32", "r42"], ["r33", "r43"], ["r34", "r44"],
    ["r40", "r41"], ["r42", "r43"], ["r43", "r44"]];
  const CW = 150;          // 走廊寬
  const CORR = LINKS.map(([a, b]) => {
    const A = ROOMS[a], B = ROOMS[b];
    if (A.row === B.row) { const [L, Rr] = A.col < B.col ? [A, B] : [B, A]; return { id: `${a}-${b}`, a, b, horiz: true, x: L.x + L.w - 12, y: L.cy - CW / 2, w: Rr.x - (L.x + L.w) + 24, h: CW }; }
    const [T, Bt] = A.row < B.row ? [A, B] : [B, A];
    return { id: `${a}-${b}`, a, b, horiz: false, x: T.cx - CW / 2, y: T.y + T.h - 12, w: CW, h: Bt.y - (T.y + T.h) + 24 };
  });
  const ENT = ROOMS.r42, VAULT = ROOMS.r22, SECRET = ROOMS.r03, PIPS = ["r10", "r14"];
  const NORMAL = Object.keys(ROOMS).filter((id) => ![ENT.id, VAULT.id, SECRET.id, ...PIPS].includes(id));
  // 7 種隨機房間
  const TYPES = {
    pillars: "石柱大廳", spikes: "地刺陣", mirrors: "鏡之廳", flames: "火焰祭壇", outpost: "守衛崗哨", nest: "巡弋機關的巢", library: "崩塌的書庫",
  };
  const PLINTH = { x: ENT.cx - 170, y: ENT.cy - 190, w: 340, h: 300 };          // 入口中間的石台
  const VINES = [{ x: ENT.x + 60, y: ENT.y + 120 }, { x: ENT.x + ENT.w - 70, y: ENT.y + ENT.h - 260 }, { x: ENT.x + 90, y: ENT.y + ENT.h - 90 }];

  // 秘密寶庫的走廊被一道封印的門擋住
  const SC = CORR.find((c) => c.id === "r03-r13");
  const SEAL = { x: SC.x - 10, y: Math.round(SC.y + SC.h * 0.35), w: SC.w + 20, h: 70 };
  const MAP = {
    barks: { ongergon: { ilshu: "這肯定是場惡戰...", marika: "看來！有趣的來了！" } },      // 第一次走到翁爾貢面前
    seal: SEAL,
    indoor: true, battleRoom: "ruins", ruins: true,
    bgm: "sounds/bgm-ruins.mp3",
    w: 5900, h: 5100,
    rooms: ROOMS, corridors: CORR, types: TYPES, entrance: ENT, vault: VAULT, secret: SECRET, pipRooms: PIPS, plinth: PLINTH, vines: VINES,
    walk: [...Object.values(ROOMS), ...CORR],
    solids: [PLINTH],
    exit: { x: ENT.cx - 90, y: ENT.y + ENT.h - 40, w: 180, h: 40 },
    arrive: { x: ENT.cx, y: ENT.y + ENT.h - 150 },
    portal: null,
    zone: { dy: 62, r: 46 },
    enemyWander: 110, enemySpeed: 40,
    enemies: [],
    npcs: [],
  };

  // ===== 每一趟隨機：房間的種類、寶箱、陷阱、魔物（存在 trip.qdata.ruins） =====
  MAP.prepare = function (trip) {
    trip.qdata = trip.qdata || {};
    let D = trip.qdata.ruins;
    const rnd = Math.random, pick = (a) => a[Math.floor(rnd() * a.length)];
    if (!D || !D.rooms) {
      const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
      const types = shuffle([...Object.keys(TYPES), ...shuffle(Object.keys(TYPES))].slice(0, NORMAL.length));
      const order = shuffle(NORMAL);
      D = trip.qdata.ruins = Object.assign(trip.qdata.ruins || {}, { rooms: {}, corr: {}, pip: pick(PIPS), chests: [], vaultOpen: false, disarmed: 0, cores: 0 });
      const rel = (rm, fx, fy) => ({ x: Math.round(rm.x + rm.w * fx), y: Math.round(rm.y + rm.h * fy) });
      order.forEach((id, i) => {
        const rm = ROOMS[id], t = types[i % types.length], o = { type: t, pillars: [], lows: [], spikes: [], flames: [], lasers: [], mirrors: [], enemy: null };
        if (t === "pillars") { for (const [fx, fy] of [[0.25, 0.28], [0.75, 0.28], [0.25, 0.72], [0.75, 0.72]]) { const p = rel(rm, fx, fy); o.pillars.push({ x: p.x - 45, y: p.y - 45, w: 90, h: 90 }); } o.enemy = "ruinGuards"; }
        if (t === "spikes") { for (let gx = 0; gx < 3; gx++) for (let gy = 0; gy < 2; gy++) { const p = rel(rm, 0.22 + gx * 0.28, 0.32 + gy * 0.36); o.spikes.push({ x: p.x - 60, y: p.y - 60, w: 120, h: 120, ph: rnd() * 3 }); } }
        if (t === "mirrors") {
          const left = rnd() < 0.5, y0 = rm.y + rm.h * 0.28;
          o.lasers.push({ x: left ? rm.x + 16 : rm.x + rm.w - 16, y: Math.round(y0), dx: left ? 1 : -1, dy: 0.18, broken: false });
          const mx = rm.x + rm.w * (left ? 0.72 : 0.28), my = y0 + 0.18 * Math.abs(mx - (left ? rm.x + 16 : rm.x + rm.w - 16)) / 1.0;
          o.mirrors.push({ x1: mx - 50, y1: my + (left ? -50 : 50), x2: mx + 50, y2: my + (left ? 50 : -50) });
          o.mirrors.push({ x1: rm.x + rm.w * 0.4, y1: rm.y + rm.h * 0.86, x2: rm.x + rm.w * 0.6, y2: rm.y + rm.h * 0.86 });
        }
        if (t === "flames") { for (const fx of [0.32, 0.68]) o.flames.push({ x: Math.round(rm.x + rm.w * fx), y: rm.y + 10, dir: "down", len: Math.round(rm.h * 0.7), fuel: 4, broken: false }); }
        if (t === "outpost") { for (const [fx, fy, w, h] of [[0.3, 0.35, 160, 28], [0.7, 0.35, 160, 28], [0.5, 0.68, 28, 140]]) { const p = rel(rm, fx, fy); o.lows.push({ x: p.x - w / 2, y: p.y - h / 2, w, h }); } o.enemy = "ruinMixed"; }
        if (t === "nest") { for (const [fx, fy] of [[0.3, 0.5], [0.7, 0.5]]) { const p = rel(rm, fx, fy); o.pillars.push({ x: p.x - 45, y: p.y - 45, w: 90, h: 90 }); } o.enemy = "ruinCruisers"; }
        if (t === "library") {
          for (const [fx, fy, w, h] of [[0.28, 0.3, 180, 28], [0.72, 0.55, 180, 28], [0.35, 0.75, 28, 120]]) { const p = rel(rm, fx, fy); o.lows.push({ x: p.x - w / 2, y: p.y - h / 2, w, h }); }
          const p = rel(rm, 0.62, 0.25); o.spikes.push({ x: p.x - 60, y: p.y - 50, w: 120, h: 100, ph: rnd() * 3 });
        }
        // 寶箱：火焰祭壇、地刺陣、崩塌的書庫、鏡之廳比較常有（藏在機關後面）
        const chestChance = { flames: 0.9, spikes: 0.8, library: 0.85, mirrors: 0.7, pillars: 0.35, outpost: 0.3, nest: 0.3 }[t];
        if (rnd() < chestChance) { const p = rel(rm, t === "flames" ? 0.5 : 0.5, t === "flames" ? 0.82 : t === "spikes" ? 0.9 : 0.15); D.chests.push({ id: `c_${id}`, room: id, x: p.x, y: p.y, opened: false }); }
        D.rooms[id] = o;
      });
      // 皮普的藏身處（另一間紅色房間：他之前躲過的地方，有一個寶箱）
      for (const id of PIPS) { const rm = ROOMS[id]; D.rooms[id] = { type: id === D.pip ? "pipHide" : "pipOld", pillars: [], lows: [], spikes: [], flames: [], lasers: [], mirrors: [], enemy: null }; if (id !== D.pip) D.chests.push({ id: `c_${id}`, room: id, x: rm.cx, y: rm.y + rm.h * 0.3, opened: false }); }
      // 入口：藤蔓下面最多一個寶箱
      if (rnd() < 0.5) { const v = pick(VINES); D.chests.push({ id: "c_vine", room: ENT.id, x: v.x, y: v.y + 20, opened: false, vine: true }); }
      // 走廊的陷阱（入口出去的那一條沒有）
      for (const c of CORR) {
        const roll = rnd(), k = c.id === "r32-r42" ? "none" : roll < 0.35 ? "none" : roll < 0.57 ? "flame" : roll < 0.79 ? "saw" : "spikes";
        const o = { k };
        if (k === "flame") { o.fuel = 4; o.broken = false; }
        if (k === "saw") { o.off = false; }
        if (k === "spikes") { o.zones = [0.3, 0.5, 0.7].map((f, i) => ({ f, ph: i * 0.9 })); }
        D.corr[c.id] = o;
      }
    }
    // 把這一趟的內容放進地圖：柱子是障礙物、矮牆是 lowWalls（霍夫曼可以噴過去）、魔物
    MAP.solids = D.vaultOpen ? [PLINTH] : [PLINTH, MAP.seal];          // 打倒寶庫的殲滅矩陣之後，封印的門就開了
    MAP.lowWalls = [];
    MAP.enemies = [];
    for (const [id, o] of Object.entries(D.rooms)) {
      MAP.solids.push(...o.pillars); MAP.lowWalls.push(...o.lows);
      if (o.enemy) { const rm = ROOMS[id]; MAP.enemies.push({ id: `ru_${id}`, kind: o.enemy, x: rm.cx, y: rm.cy + (o.type === "nest" ? 0 : 20) }); }
    }
    // 皮普：失聯的隊員還沒找到的話，就在他的藏身處
    MAP.npcs = [];
    if (trip.accepted?.includes("RU20314-02") && !trip.done?.includes("RU20314-02") && !D.pipFound) {
      const rm = ROOMS[D.pip];
      MAP.npcs.push({ id: "pip", name: "皮普", x: rm.cx + 120, y: rm.cy + 40, color: "#7a8a3a", quests: ["RU20314-02"],
        lines: ["（他縮在牆角，抱著一本畫滿符文的筆記本）……有人？是隊長派你來的嗎？", "外面的機關一直在巡邏。我出不去。"] });
    }
  };
  R.MAPS["RU20314/ruins"] = MAP;
})();
