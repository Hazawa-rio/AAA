/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/maps/aq00618-wild.js": "20261122024623" });
// 地圖：#AQ00618 如此靜謐的蔚藍・水族館的外面＝未文明化的原始水域（場景 "wild"）
// 看起來一樣是一座大型水族館（大水缸的玻璃、名牌），可是這裡沒有觀眾，只有食物鏈
// 照使用者的草圖：上＝深海、左＝寒帶、中＝大洋、右＝沼澤，下面是從水族館走出來的玻璃迴廊（安全）
// 魔物在地圖載入時就建立，所以「沉溺原始的蒼幽・滄龍」要在這裡照存檔決定要不要出現
(function () {
  const R = (window.RPG = window.RPG || {});
  R.MAPS = R.MAPS || {};
  const W = 4400, H = 3900;
  const REG = {
    deep: { id: "deep", name: "深海", x: 900, y: 120, w: 2600, h: 880, water: "#071228", glass: "#5a6ab0" },
    cold: { id: "cold", name: "寒帶", x: 120, y: 1100, w: 1250, h: 1450, water: "#3a5a78", glass: "#e0f4ff" },
    sea: { id: "sea", name: "大洋", x: 1470, y: 1100, w: 1830, h: 1300, water: "#14466a", glass: "#8ae0ff" },
    swamp: { id: "swamp", name: "沼澤", x: 3400, y: 1100, w: 880, h: 1300, water: "#2a3a1e", glass: "#a8d86a" },
    entry: { id: "entry", name: "玻璃迴廊", x: 1650, y: 2500, w: 1450, h: 1250, water: "#0c1a2a", glass: "#8ac8ff", safe: true },
  };
  const LINKS = [
    { x: 2200, y: 980, w: 400, h: 140 }, { x: 1000, y: 980, w: 300, h: 140 }, { x: 3300, y: 980, w: 260, h: 140 },
    { x: 1350, y: 1600, w: 140, h: 400 }, { x: 3280, y: 1600, w: 140, h: 400 }, { x: 2200, y: 2380, w: 400, h: 140 },
  ];
  // 每個水域的生物：t0＝小魚、t1＝捕食者、t2＝掠食者（一隻）
  const LIFE = {
    sea: { t0: ["sardines", 4], t1: ["barracudas", 3], t2: "megalodon" },
    cold: { t0: ["icefish", 3], t1: ["seals", 3], t2: "livyatan" },
    deep: { t0: ["lanterns", 4], t1: ["vipers", 3], t2: "dunkleosteus" },
    swamp: { t0: ["loaches", 3], t1: ["gars", 3], t2: "deinosuchus" },
  };
  const PREDATORS = ["megalodon", "livyatan", "dunkleosteus", "deinosuchus"];
  let seed = 61; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const enemies = [];
  for (const [rid, L] of Object.entries(LIFE)) {
    const g = REG[rid];
    const at = (pad) => ({ x: g.x + pad + rnd() * (g.w - pad * 2), y: g.y + pad + rnd() * (g.h - pad * 2) });
    for (const t of ["t0", "t1"]) { const [kind, n] = L[t]; for (let i = 0; i < n; i++) enemies.push({ id: `aqw-${t}-${rid}-${i}`, kind, tier: +t[1], ...at(140) }); }
    enemies.push({ id: `aqw-t2-${rid}`, kind: L.t2, tier: 2, x: g.x + g.w / 2, y: g.y + g.h / 2 });
  }
  // 蒼幽成為原始獵手之後（使用者 11/22）：所有的魚都消失，大洋的中央出現「滄游」（靠近時觸發對話 → 變身 → 滄龍 Boss 戰）
  let Q = null, done = false;
  try { const t = JSON.parse(localStorage.getItem("rpg.trip") || "null"); Q = t?.qdata?.aq || null; done = !!(Q?.mosaCard || Q?.ate?.mosa || t?.run?.defeated?.includes("aqw-mosasaur")); } catch (e) { Q = null; }
  const CANGYOU = !!(Q?.primal && !done);
  if (CANGYOU) enemies.length = 0;
  const CY = { id: "cangyuu", name: "滄游", face: "滄", x: REG.sea.x + REG.sea.w / 2, y: REG.sea.y + REG.sea.h / 2, color: "#2a6a9a", lines: ["……"] };

  R.MAPS["AQ00618/wild"] = {
    indoor: true, battleRoom: "wild", wild: true, npcInk: "#d8ecff",
    bgm: CANGYOU ? "sounds/bgm-mosasaur.mp3" : "sounds/bgm-post.mp3",      // 滄游出現時：滄游的音樂（使用者 11/22 提供）
    w: W, h: H,
    walk: [...Object.values(REG), ...LINKS],
    regions: REG, links: LINKS, predators: PREDATORS, cangyuu: CANGYOU ? CY : null,
    exit: { x: 2375, y: 3680 },
    arrive: { x: 2375, y: 3540 },
    portal: null,
    zone: { dy: 62, r: 46 },
    shops: [], potions: [],
    enemyWander: 180, enemySpeed: 46,
    // 捕食者和掠食者看到人會追過來（小魚只會游來游去）
    wolf: { aggro: 240, speed: 125, leash: 480, packs: { barracudas: 2, seals: 2, vipers: 2, gars: 2, megalodon: 1, livyatan: 1, dunkleosteus: 1, deinosuchus: 1, mosasaur: 1 }, howl: "sounds/cangyou-whale.mp3" },
    enemies,
    npcs: [
      { id: "wildGuide", name: "迴廊盡頭的導覽員", face: "導", x: 2120, y: 3400, color: "#4a8ab8",
        lines: ["這裡是水族館的外面。……看起來也是一座水族館，對吧？只是這裡的玻璃，不是給人看的。", "外面有外面的規矩：先吃小的，才能吃大的。還是一條小魚的時候，別去招惹掠食者。", "大洋、深海、寒帶、沼澤，每一片水都有一隻最大的。四隻都倒下的時候，這裡就會換一個頂點。"] },
      ...(CANGYOU ? [CY] : []),
    ],
  };
})();
