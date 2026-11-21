/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/maps/sp10101.js": "20261122024623" });
// 地圖：#SP10101 遞廻齒輪鑲嵌之國（A 級）——霍夫曼原本的時空，上層：齒輪城
// 整座城是一塊一塊浮在蒸氣深谷上的平台（5 × 4），平台之間只能靠橋過去：
//   齒輪橋：平台邊上的大齒輪帶著一條長長的橋臂，點齒輪（站在同一塊平台上）就轉 90°。橋臂指向隔壁平台才走得過去
//           兩條橋臂撞在一起（例如兩邊的齒輪都伸向同一個縫）就卡住，哪一條都不能走
//   鐵橋：固定的橋。有些鐵橋上有蒸氣噴嘴，噴氣的時候過不去；平台上的蒸氣閥會關掉某個噴嘴、同時讓另一個地方的噴嘴開始噴
//   斷橋：中間斷了一截（矮牆），只有霍夫曼的噴氣裝置跨得過去（捷徑，不是必要的路）
// 東南角的升降梯通往下層的冷卻工廠（js/maps/sp10101-cool.js）
// 幾何（平台、橋臂、碰撞、能不能走）都寫在這裡（R.Gears），時空程式和測試用的解題器共用
(function () {
  const R = (window.RPG = window.RPG || {});
  R.MAPS = R.MAPS || {};
  const S = 600, G = 220, OFF = 120, COLS = 5, ROWS = 4;
  const W = OFF * 2 + COLS * S + (COLS - 1) * G, H = OFF * 2 + ROWS * S + (ROWS - 1) * G;
  const INSET = 70, ARM_L = 320, ARM_W = 110, HUB = 60, BRIDGE_W = 150;
  const plat = (i, j) => ({ x: OFF + i * (S + G), y: OFF + j * (S + G), w: S, h: S, i, j });
  const PLATS = []; for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) PLATS.push(plat(i, j));
  const pAt = (i, j) => PLATS[j * COLS + i];
  // 方向：0 東、1 南、2 西、3 北
  const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
  const SIDE = { E: 0, S: 1, W: 2, N: 3 };
  const DIR_NAME = ["東", "南", "西", "北"];

  // 平台的名字（城裡的街區）
  const NAMES = {
    "0,0": "發條工坊街", "1,0": "齒輪市集", "2,0": "鐘樓廣場", "3,0": "氣壓管塔", "4,0": "全國博覽會場",
    "0,1": "鉚釘巷", "1,1": "蒸氣浴場", "2,1": "專利局", "3,1": "飛艇碼頭", "4,1": "廢棄的試作倉庫",
    "0,2": "舊鑄造廠", "1,2": "發明家協會", "2,2": "壓力計廣場", "3,2": "鍋爐街", "4,2": "煤倉",
    "0,3": "下水管口", "1,3": "怪鼠機關屋", "2,3": "南門廣場", "3,3": "黃銅大道", "4,3": "冷卻工廠的升降梯",
  };

  // ===== 齒輪橋 =====
  //   p＝齒輪所在的平台、side＝在平台的哪一邊、dir0＝一開始橋臂指的方向
  const GEARS = [
    { id: "g1", p: [1, 3], side: "W", dir0: 3 },
    { id: "g2", p: [0, 2], side: "E", dir0: 1 },
    { id: "g3", p: [2, 2], side: "W", dir0: 0 },
    { id: "g4", p: [1, 2], side: "E", dir0: 2 },
    { id: "g5", p: [2, 1], side: "W", dir0: 3 },
    { id: "g6", p: [3, 1], side: "E", dir0: 0 },
    { id: "g7", p: [4, 1], side: "W", dir0: 2 },
    { id: "g8", p: [0, 0], side: "E", dir0: 1 },
    { id: "g9", p: [2, 0], side: "E", dir0: 3 },
    { id: "g10", p: [0, 2], side: "N", dir0: 0 },
    { id: "g11", p: [1, 3], side: "N", dir0: 3 },
    { id: "g12", p: [2, 3], side: "N", dir0: 2 },
    { id: "g13", p: [3, 2], side: "N", dir0: 1 },
    { id: "g14", p: [0, 1], side: "N", dir0: 2 },
    { id: "g15", p: [0, 3], side: "N", dir0: 2 },
  ];
  for (const g of GEARS) {
    const P = pAt(g.p[0], g.p[1]), s = SIDE[g.side];
    g.side = s;
    g.x = P.x + S / 2 + DX[s] * (S / 2 - INSET);
    g.y = P.y + S / 2 + DY[s] * (S / 2 - INSET);
    g.to = [g.p[0] + DX[s], g.p[1] + DY[s]];          // 橋臂指向「外面」的時候通到哪一塊平台
  }
  // 橋臂的長方形（from＝從中心往外多遠開始；碰撞時不算齒輪中間的軸）
  function armRect(g, dir, from = 0) {
    const a = from, b = ARM_L;
    if (DX[dir]) { const x1 = g.x + DX[dir] * a, x2 = g.x + DX[dir] * b; return { x: Math.min(x1, x2), y: g.y - ARM_W / 2, w: Math.abs(x2 - x1), h: ARM_W }; }
    const y1 = g.y + DY[dir] * a, y2 = g.y + DY[dir] * b; return { x: g.x - ARM_W / 2, y: Math.min(y1, y2), w: ARM_W, h: Math.abs(y2 - y1) };
  }
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const inR = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

  // ===== 鐵橋（固定）：a、b＝兩塊平台；nozzle＝橋上的蒸氣噴嘴；broken＝斷橋（只有霍夫曼跨得過去）=====
  const BRIDGES = [
    { a: [1, 3], b: [2, 3] }, { a: [2, 3], b: [3, 3] },
    { a: [3, 3], b: [4, 3], nozzle: "n1" },
    { a: [3, 2], b: [4, 2], broken: true },
    { a: [0, 1], b: [1, 1], nozzle: "n2" },
    { a: [2, 1], b: [3, 1] },
    { a: [1, 0], b: [2, 0], nozzle: "n3" },
    { a: [3, 0], b: [4, 0], nozzle: "n5" },
    { a: [1, 1], b: [1, 2] },
    { a: [2, 1], b: [2, 2], nozzle: "n4" },
    { a: [3, 0], b: [3, 1] },
    { a: [3, 2], b: [3, 3] },
    { a: [4, 2], b: [4, 3] },
  ];
  for (const b of BRIDGES) {
    const A = pAt(b.a[0], b.a[1]), B = pAt(b.b[0], b.b[1]);
    if (b.a[1] === b.b[1]) b.rect = { x: A.x + S - 20, y: A.y + S / 2 - BRIDGE_W / 2, w: G + 40, h: BRIDGE_W };
    else b.rect = { x: A.x + S / 2 - BRIDGE_W / 2, y: A.y + S - 20, w: BRIDGE_W, h: G + 40 };
    b.horiz = b.a[1] === b.b[1];
    b.x = b.rect.x + b.rect.w / 2; b.y = b.rect.y + b.rect.h / 2;
    // 斷橋：中間缺 80（矮牆擋住；霍夫曼的噴氣裝置可以跨過去）
    if (b.broken) b.gapRect = b.horiz ? { x: b.x - 40, y: b.rect.y, w: 80, h: BRIDGE_W } : { x: b.rect.x, y: b.y - 40, w: BRIDGE_W, h: 80 };
  }
  // 蒸氣噴嘴：on0＝一開始有沒有在噴
  const NOZZLES = { n1: { on0: true }, n2: { on0: false }, n3: { on0: true }, n4: { on0: true }, n5: { on0: false } };
  for (const b of BRIDGES) if (b.nozzle) NOZZLES[b.nozzle].bridge = b;
  // 蒸氣閥：轉一下就把 flips 裡的噴嘴全部反過來（關掉一個、另一個就開始噴）
  const VALVES = [
    { id: "v1", p: [3, 3], dx: 120, dy: -160, flips: ["n1", "n2"] },
    { id: "v2", p: [2, 2], dx: 150, dy: 150, flips: ["n4", "n5"] },
    { id: "v3", p: [1, 1], dx: -150, dy: -150, flips: ["n3", "n5"] },
  ];
  for (const v of VALVES) { const P = pAt(v.p[0], v.p[1]); v.x = P.x + S / 2 + v.dx; v.y = P.y + S / 2 + v.dy; }

  // ===== 狀態 → 哪些橋臂能走 =====
  //   st＝{ dirs: { g1: 3, … }, noz: { n1: true, … } }
  function fresh() { const dirs = {}, noz = {}; for (const g of GEARS) dirs[g.id] = g.dir0; for (const [k, n] of Object.entries(NOZZLES)) noz[k] = n.on0; return { dirs, noz }; }
  function arms(st) {
    const list = GEARS.map((g) => ({ g, dir: st.dirs[g.id], rect: armRect(g, st.dirs[g.id]), core: armRect(g, st.dirs[g.id], HUB), jam: false }));
    for (let i = 0; i < list.length; i++) for (let k = i + 1; k < list.length; k++) if (overlap(list[i].core, list[k].core)) { list[i].jam = true; list[k].jam = true; list[i].with = list[k].g.id; list[k].with = list[i].g.id; }
    return list;
  }
  // 這一點能不能站（平台、沒卡住的橋臂、沒在噴氣的鐵橋）
  function walkable(x, y, A, st) {
    for (const b of BRIDGES) if (inR(b.rect, x, y)) { if (b.nozzle && st.noz[b.nozzle]) return false; if (b.gapRect && inR(b.gapRect, x, y)) return false; return true; }
    for (const P of PLATS) if (inR(P, x, y)) return true;
    for (const a of A) if (!a.jam && inR(a.rect, x, y)) return true;
    return false;
  }
  // 平台之間的連通（解題器、迷你地圖用）
  function links(st, A = arms(st)) {
    const L = [];
    for (const b of BRIDGES) if (!b.broken && !(b.nozzle && st.noz[b.nozzle])) L.push([b.a, b.b]);
    for (const a of A) if (!a.jam && a.dir === a.g.side) { const t = a.g.to; if (t[0] >= 0 && t[1] >= 0 && t[0] < COLS && t[1] < ROWS) L.push([a.g.p, t]); }
    return L;
  }
  function reach(st, from) {
    const L = links(st), seen = new Set([from.join()]), q = [from];
    while (q.length) { const c = q.pop(); for (const [a, b] of L) for (const [u, v] of [[a, b], [b, a]]) if (u.join() === c.join() && !seen.has(v.join())) { seen.add(v.join()); q.push(v); } }
    return seen;
  }
  const platOf = (x, y) => PLATS.find((P) => inR(P, x, y)) || null;

  R.Gears = { S, G, OFF, COLS, ROWS, W, H, INSET, ARM_L, ARM_W, HUB, PLATS, pAt, NAMES, GEARS, BRIDGES, NOZZLES, VALVES, DX, DY, DIR_NAME, armRect, overlap, inR, fresh, arms, walkable, links, reach, platOf };

  const C = (i, j, dx = 0, dy = 0) => ({ x: pAt(i, j).x + S / 2 + dx, y: pAt(i, j).y + S / 2 + dy });
  // 鐘樓、零件、博覽會會場、升降梯、機關屋、協會
  const TOWER = { x: pAt(2, 0).x + 160, y: pAt(2, 0).y + 60, w: 280, h: 200 };
  const LIFT = C(4, 3, 60, 40);
  const PARTS = [
    { id: "spring", name: "主發條", ...C(0, 0, -120, -100) },
    { id: "escape", name: "擒縱輪", ...C(4, 1, 140, 60) },
    { id: "wheel", name: "大齒輪", ...C(0, 2, -100, 140) },
  ];
  const STAGE = C(4, 0, 0, -40);              // 伊卡洛斯號繫在博覽會會場的繫留塔上（在上空打轉）
  // 掉下來的制動人偶船員（SP10101-04）、氣送管的信箱（SP10101-05）
  const DOLLS = [{ id: "d1", p: [3, 0] }, { id: "d2", p: [1, 0] }, { id: "d3", p: [2, 2] }].map((d) => ({ ...d, ...C(d.p[0], d.p[1], 60, 80) }));
  const MAILBOXES = [{ id: "m1", p: [0, 0], to: "發條工坊街的鐘錶匠" }, { id: "m2", p: [4, 2], to: "煤倉的守夜人" }, { id: "m3", p: [0, 3], to: "下水管口的修管工" }].map((m) => ({ ...m, ...C(m.p[0], m.p[1], 160, 160) }));
  const HOUSE = { x: pAt(1, 3).x + 60, y: pAt(1, 3).y + 340, w: 220, h: 180 };     // 怪鼠機關屋（建築）
  const GUILD = { x: pAt(1, 2).x + 330, y: pAt(1, 2).y + 60, w: 220, h: 160 };      // 發明家協會（建築）

  R.MAPS.SP10101 = {
    indoor: true, battleRoom: "gearCity", gearCity: true, npcInk: "#fff0d0",
    bgm: "sounds/bgm-lab.mp3",                // 暫用（還沒有齒輪城的 BGM）
    w: W, h: H,
    // 走得到的範圍＝平台、鐵橋、每個齒輪四個方向的橋臂（真正能不能走由時空程式的 blocked 決定）
    miniWalk: [...PLATS, ...BRIDGES.filter((b) => !b.broken).map((b) => b.rect)],
    walk: [...PLATS, ...BRIDGES.map((b) => b.rect), ...GEARS.flatMap((g) => [0, 1, 2, 3].map((d) => armRect(g, d)))],
    solids: [TOWER, HOUSE, GUILD],
    // 斷橋中間：矮牆（霍夫曼的噴氣裝置可以跨過去）
    lowWalls: BRIDGES.filter((b) => b.broken).map((b) => b.gapRect),
    tower: TOWER, lift: LIFT, parts: PARTS, stage: STAGE, dolls: DOLLS, mailboxes: MAILBOXES, house: HOUSE, guild: GUILD,
    arrive: C(2, 3, 0, 160),
    portal: C(2, 3, 0, 240),
    zone: { dy: 62, r: 46 },
    shops: [], potions: [],
    enemyWander: 140, enemySpeed: 44,
    // 為了「轟動全國」做出來的大型機械（看到人會追過來）
    wolf: { aggro: 260, speed: 135, leash: 520, packs: { hounds: 2, tankMix: 2, mix3: 3 }, howl: "sounds/robot-move.mp3" },
    enemies: [
      { id: "sp-e1", kind: "hounds", ...C(0, 1) }, { id: "sp-e2", kind: "tankMix", ...C(1, 2, -120, 120) },
      { id: "sp-e3", kind: "hounds", ...C(3, 1, -100, -60) }, { id: "sp-e4", kind: "mix3", ...C(1, 0, 60, 120) },
      { id: "sp-e5", kind: "tankMix", ...C(3, 0, 0, 120) }, { id: "sp-e6", kind: "hounds", ...C(4, 2) },
      { id: "sp-e7", kind: "mix3", ...C(0, 2, 120, -80) },
    ],
    // 霍夫曼第一次到這裡（使用者授權 Claude 寫霍夫曼的台詞）
    arrival: { hoffman: "……齒輪的聲音。這座城，我閉著眼睛也認得。只是鐘樓不該是停的。" },
    npcs: [
      { id: "apprentice", name: "機關屋主人・沃爾特", face: "沃", ...C(1, 3, 140, -60), color: "#8a5a2a", quests: ["SP10101-01"],
        lines: ["齒輪橋要站在同一塊平台上才轉得動。轉之前，先想好你要回來的路。", "我的師父說過：機關不會騙人，會騙人的是以為自己懂了的人。……他長什麼樣子，我已經想不起來了。", "鐘樓停了以後，城裡的人連幾點吃飯都要吵架。"],
        asks: { hoffman: [
          { q: "你的師父，是什麼樣的人？", a: "很嚴格，手很巧，說話很慢。……奇怪，你問的時候，我好像差一點就想起他的臉了。你們長得有點像？不，大概是錯覺。" },
          { q: "第三號扳手，還放在工作台左邊的抽屜裡嗎？", a: "……你怎麼知道？那是我師父的習慣，我一直照著放。你到底是誰？" },
          { q: "（什麼都不說，只是看著機關屋）", a: "喜歡嗎？這間機關屋是我師父留下來的。我只是……一直在等一個能把鐘樓修好的人，來當我的學徒。" },
        ] } },
      { id: "guildHead", name: "協會會長・蓓拉", face: "蓓", ...C(1, 2, 140, 300), color: "#4a6a8a", quests: ["SP10101-02"],
        lines: ["發明家協會的規矩：沒有被做出來的東西，不算發明。", "最近蒸氣管會說話。它們說的都是一些……沒有人做得出來的點子。"],
        asks: { hoffman: [
          { q: "協會現在誰在審專利？", a: "還是那幾個老頑固。上禮拜退回了一台『能把時間存起來的機器』，理由是：做不出來。……你笑什麼？" },
        ] } },
      { id: "inventor", name: "伊卡洛斯號的發明者・蓋爾", face: "蓋", ...C(2, 3, 200, -120), color: "#a83a2a", quests: ["SP10101-03"],
        lines: ["我只是想讓全國的人都抬起頭來……我沒想過它會停不下來。", "伊卡洛斯號沒有煞車。我覺得發明應該是用來往上的。", "它飛得越高，往下噴的東西就越多。蒸氣、廢料……還有船員。"],
        asks: { hoffman: [
          { q: "你的飛艇，壓力閥裝在哪裡？", a: "壓力閥？……我、我覺得裝了會太重，飛不高，所以就……沒有裝。" },
          { q: "為什麼叫伊卡洛斯？", a: "那個用蠟做翅膀、飛得太靠近太陽的少年。大家都說那是警告——我覺得那是第一個飛起來的人。" },
        ] } },
      { id: "liftman", name: "升降梯的管理員・阿鉚", ...C(4, 3, -140, -80), color: "#5a5a6a",
        lines: ["往下是冷卻工廠。上面所有的機器，都靠底下的冷卻水撐著。", "升降梯的蒸氣噴嘴一直在噴？去黃銅大道轉一下蒸氣閥就好了——不過，別的地方大概會開始噴。"] },
      { id: "clerk", name: "專利局的職員", face: "專", ...C(2, 1, 120, 120), color: "#6a6a4a",
        lines: ["申請專利請排隊。排隊的號碼牌也有專利，請先申請號碼牌的專利。", "那艘飛艇？它的專利申請書寫著：『目的：讓全國抬頭』。審核通過了。"] },
      { id: "dollmaker", name: "人偶師・梅", ...C(0, 1, 120, 140), color: "#8a5a6a", quests: ["SP10101-04"],
        lines: ["發條人偶不會累，也不會想。上一次鍊，它就照著那一次的指令一直動下去。", "制動鈕在背後。按下去，它就會停下來——像睡著一樣。"] },
      { id: "postman", name: "郵差・皮普", ...C(2, 3, -220, 40), color: "#3a7a5a", quests: ["SP10101-05"],
        lines: ["氣送管比齒輪橋快多了。……前提是它沒有被齒輪橋夾斷。", "這座城的路每天都不一樣。郵差這份工作，其實是在解謎。"] },
      { id: "kid", name: "撿齒輪的小孩", face: "撿", ...C(3, 3, 100, 140), color: "#8a7a3a",
        lines: ["齒輪橋撞在一起的時候會冒火花，好漂亮。可是兩邊都過不去。", "有一個叔叔從斷掉的橋上飛過去了！咻——的一聲。"] },
    ],
  };
})();
