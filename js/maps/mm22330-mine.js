/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/maps/mm22330-mine.js": "20261122024623" });
// 地圖：#MM22330 或許是魔法森林・礦井（自由探索，不算委託）
// 礦井通往深處：每一層都是隨機的洞穴（同一趟、同一層換頁也一樣；從地面重新下去就是新的礦洞）
// 越深越暗、魔物越多越危險；第 5 層是最深處
// 這個檔案在地圖載入時就要把這一層蓋好（地圖上的魔物在時空程式之前就建立了），所以產生器放在這裡
(function () {
  const R = (window.RPG = window.RPG || {});
  R.MAPS = R.MAPS || {};
  const CELL = 100, COLS = 30, ROWS = 22, MAX_DEPTH = 5;

  // ===== 蘑菇（煮湯用；每一種加一點能力，像特調一樣）=====
  //   from＝從第幾層開始長、w＝出現的權重
  const SHROOMS = {
    lampcap: { name: "礦燈菇", col: "#ffd88a", from: 1, w: 5, bonus: { hp: 6 }, label: "生命 +6" },
    bluebell: { name: "藍鈴菇", col: "#7ab8ff", from: 1, w: 4, bonus: { mp: 6 }, label: "魔力 +6" },
    flametongue: { name: "火舌菇", col: "#ff7a4a", from: 2, w: 3, bonus: { atk: 3 }, label: "攻擊 +3" },
    rockshell: { name: "岩殼菇", col: "#a8a0b8", from: 2, w: 3, bonus: { df: 2 }, label: "防禦 +2" },
    gale: { name: "疾風菇", col: "#9affc8", from: 3, w: 2, bonus: { spd: 1 }, label: "速度 +1" },
    stardust: { name: "星屑菇", col: "#f4eefc", from: 4, w: 1, bonus: { hp: 4, mp: 4, atk: 1, df: 1, spd: 1 }, label: "全部 +1（生命、魔力 +4）" },
    abyss: { name: "深淵菇", col: "#b04aff", from: 5, w: 1, bonus: { atk: 6, df: -1 }, label: "攻擊 +6、防禦 -1" },
  };
  const SOUP_MAX = 5;                       // 一碗湯最多放幾朵
  const soupBonus = (adds) => {
    const b = { hp: 0, mp: 0, atk: 0, df: 0, spd: 0 };
    for (const [id, n] of Object.entries(adds || {})) for (const [k, v] of Object.entries(SHROOMS[id]?.bonus || {})) b[k] += v * n;
    return b;
  };
  const soupText = (b) => [["hp", "生命"], ["mp", "魔力"], ["atk", "攻擊"], ["df", "防禦"], ["spd", "速度"]].filter(([k]) => b[k]).map(([k, n]) => `${n} ${b[k] > 0 ? "+" : ""}${b[k]}`).join("、");

  // 每一層的魔物（越深越多、越危險）
  const ENEMY_TABLE = { 1: ["moles"], 2: ["moles", "moles3"], 3: ["moles3", "beasts"], 4: ["beasts", "deepMix"], 5: ["deepMix", "beasts"] };

  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // 產生一層：cellular automaton 的洞穴 → 只留最大的一塊 → 入口、往下的樓梯（離入口最遠）、蘑菇、魔物、受困的礦工
  function gen(seed, depth) {
    const rnd = rng(seed * 31 + depth * 7919);
    let g = [];
    for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) g.push(i === 0 || j === 0 || i === COLS - 1 || j === ROWS - 1 ? 1 : rnd() < 0.44 ? 1 : 0);
    const at = (a, i, j) => (i < 0 || j < 0 || i >= COLS || j >= ROWS ? 1 : a[j * COLS + i]);
    for (let it = 0; it < 4; it++) {
      const n = g.slice();
      for (let j = 1; j < ROWS - 1; j++) for (let i = 1; i < COLS - 1; i++) {
        let c = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) if (di || dj) c += at(g, i + di, j + dj);
        n[j * COLS + i] = c >= 5 ? 1 : c <= 3 ? 0 : g[j * COLS + i];
      }
      g = n;
    }
    // 最大的一塊空地（其他的填起來，才不會有走不到的地方）
    const region = new Int32Array(COLS * ROWS).fill(-1); let best = -1, bestN = 0, rid = 0;
    for (let k = 0; k < g.length; k++) if (!g[k] && region[k] < 0) {
      const q = [k]; region[k] = rid; let n = 0;
      while (q.length) { const c = q.pop(); n++; const i = c % COLS, j = (c / COLS) | 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + di, y = j + dj, m = y * COLS + x; if (x >= 0 && y >= 0 && x < COLS && y < ROWS && !g[m] && region[m] < 0) { region[m] = rid; q.push(m); } } }
      if (n > bestN) { bestN = n; best = rid; } rid++;
    }
    for (let k = 0; k < g.length; k++) if (!g[k] && region[k] !== best) g[k] = 1;
    // 入口：最靠南的空地（隨機挑一格）
    const floor = []; for (let k = 0; k < g.length; k++) if (!g[k]) floor.push(k);
    // 入口要有一點空間（四周都是空地）
    const roomy = (k) => { const i = k % COLS, j = (k / COLS) | 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) if (at(g, i + di, j + dj)) return false; return true; };
    const south = floor.filter(roomy).sort((a, b) => b - a);
    const entryK = south.length ? south[Math.floor(rnd() * Math.min(12, south.length))] : floor[0];
    // 從入口算步數
    const step = new Int32Array(COLS * ROWS).fill(-1); step[entryK] = 0; const q = [entryK];
    for (let h = 0; h < q.length; h++) { const c = q[h], i = c % COLS, j = (c / COLS) | 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + di, y = j + dj, m = y * COLS + x; if (!at(g, x, y) && step[m] < 0) { step[m] = step[c] + 1; q.push(m); } } }
    const far = floor.filter((k) => step[k] >= 0).sort((a, b) => step[b] - step[a]);
    const downK = far.find(roomy) ?? far[0];
    const ctr = (k) => ({ x: (k % COLS) * CELL + CELL / 2, y: ((k / COLS) | 0) * CELL + CELL / 2 });
    const used = new Set([entryK, downK]);
    const pickFar = (minStep) => { for (let t = 0; t < 200; t++) { const k = floor[Math.floor(rnd() * floor.length)]; if (step[k] >= minStep && !used.has(k)) { used.add(k); return k; } } return null; };
    // 蘑菇
    const pool = Object.entries(SHROOMS).filter(([, s]) => s.from <= depth);
    const tot = pool.reduce((a, [, s]) => a + s.w, 0);
    const shrooms = [];
    for (let n = 0; n < 6 + depth; n++) {
      const k = pickFar(3); if (k == null) break;
      let r = rnd() * tot, type = pool[0][0]; for (const [id, s] of pool) { r -= s.w; if (r <= 0) { type = id; break; } }
      const c = ctr(k); shrooms.push({ id: `s${n}`, type, x: c.x + (rnd() - 0.5) * 30, y: c.y + (rnd() - 0.5) * 30 });
    }
    // 魔物
    const kinds = ENEMY_TABLE[depth] || ENEMY_TABLE[MAX_DEPTH];
    const enemies = [];
    for (let n = 0; n < Math.min(6, 1 + depth); n++) { const k = pickFar(6); if (k == null) break; const c = ctr(k); enemies.push({ id: `mine-${seed}-${depth}-e${n}`, kind: kinds[Math.floor(rnd() * kinds.length)], x: c.x, y: c.y }); }
    // 受困的礦工（有機率）
    let miner = null;
    if (rnd() < 0.4) { const k = pickFar(5); if (k != null) miner = Object.assign(ctr(k), { name: ["礦工・阿土", "礦工・小石", "礦工・老岩", "礦工・菇菇"][Math.floor(rnd() * 4)] }); }
    return { grid: g, entry: ctr(entryK), down: depth < MAX_DEPTH ? ctr(downK) : null, deepest: ctr(downK), shrooms, enemies, miner, steps: step };
  }

  // 這一趟現在在第幾層（讀存檔；還沒進礦井就先用第 1 層）
  let M = null;
  try { const t = JSON.parse(localStorage.getItem("rpg.trip") || "null"); M = t?.qdata?.mine || null; } catch (e) { M = null; }
  const seed = M?.seed || 1, depth = Math.max(1, Math.min(MAX_DEPTH, M?.depth || 1));
  const L = gen(seed, depth);
  const W = COLS * CELL, H = ROWS * CELL;

  R.Mine = { CELL, COLS, ROWS, MAX_DEPTH, SHROOMS, SOUP_MAX, gen, soupBonus, soupText };
  R.MAPS["MM22330/mine"] = {
    indoor: true, battleRoom: "mine", mine: true, dark: true,
    bgm: "sounds/bgm-mm.mp3",
    w: W, h: H,
    walk: [{ x: 0, y: 0, w: W, h: H }],
    level: L, seed, depth,
    arrive: { x: L.entry.x, y: L.entry.y },
    portal: null,
    zone: { dy: 62, r: 46 },
    shops: [], potions: [],
    enemyWander: 100, enemySpeed: 38,
    enemies: L.enemies,
    npcs: [],
  };
})();
