/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/bag.js": "20261110175453" });
// 冒險的行囊（道具欄 20 格）：任務道具、消耗品、素材
// 地圖探索、地圖上的戰鬥、酒館（酒保烤肉）都會用到
// use：{ hp: 回復最大生命的比例, mp: 回復最大魔力的比例 }；field = 地圖上可以用、battle = 戰鬥中可以用（花 1 行動點）
(function () {
  const R = (window.RPG = window.RPG || {});
  const ITEMS = {
    herb: { name: "回復藥草", desc: "回復 25% 生命", color: "#4caf50", icon: "leaf", stack: 9, use: { hp: 0.25 }, field: true, battle: true, sell: 6 },
    potionHp: { name: "小瓶生命藥水", desc: "回復 30% 生命", color: "#e0524a", icon: "bottle", stack: 9, use: { hp: 0.3 }, field: true, battle: true, price: 30, sell: 12 },
    potionMp: { name: "小瓶魔力藥水", desc: "回復 40% 魔力（戰鬥中使用）", color: "#4a8fe0", icon: "bottle", stack: 9, use: { mp: 0.4 }, battle: true, price: 30, sell: 12 },
    roastMeat: { name: "烤魔狼肉", desc: "桑恩烤的魔狼肉，回復 45% 生命", color: "#b5651d", icon: "meat", stack: 9, use: { hp: 0.45 }, field: true, battle: true, sell: 20 },
    slimeGel: { name: "黏液", desc: "史萊姆的黏液。可以賣給商店，也可以當魚餌（容易釣到稀有的非魚類）", color: "#8fd18a", icon: "drop", stack: 20, sell: 5, mat: true, bait: true },
    wolfFang: { name: "魔狼的牙", desc: "魔狼的尖牙。可以賣給商店", color: "#e8e2d0", icon: "fang", stack: 20, sell: 14, mat: true },
    wolfMeat: { name: "魔狼的肉", desc: "可以賣給商店、帶回酒館請桑恩烤成食物，也可以當魚餌（容易釣到稀有魚類）", color: "#c0504d", icon: "meat", stack: 20, sell: 9, mat: true, bait: true },
    baitBerry: { name: "借來的怪異樹莓", desc: "向歐文借來當魚餌的怪異樹莓。會釣出不得了的東西", color: "#a05ae0", icon: "berry", stack: 1, quest: true, bait: true },
    stolenNets: { name: "被搶的漁網", desc: "從海盜船上搶回來的漁網，綁著漁會的木牌", color: "#3f6f8f", icon: "drop", stack: 1, quest: true },
    homerEpic: { name: "荷馬史詩", desc: "理性倉庫裡照採購清單領出來的書。普羅說微波爐需要文學之美的領導", color: "#8a5a2a", icon: "drop", stack: 1, quest: true },
    hardEgg: { name: "難蛋", desc: "電腦印錯的蛋，冒著怪味。要丟進報廢室……還是說服普羅拿它做實驗？", color: "#6f7a4a", icon: "berry", stack: 1, quest: true },
    chickenEgg: { name: "雞蛋", desc: "完美的、毫無苦難的雞蛋", color: "#f4e6c8", icon: "berry", stack: 1, quest: true },
    failRecipe: { name: "必定失敗的配方", desc: "窒礙難行0號吐出來的紙，每一行都被劃掉了", color: "#9aa0aa", icon: "leaf", stack: 1, quest: true },
    weirdBerry: { name: "怪異樹莓", desc: "從草原果樹摘下、泛著紫光的樹莓。委託要交的東西", color: "#7a3fb0", icon: "berry", stack: 1, quest: true },
  };
  const SIZE = 20;

  R.Bag = {
    ITEMS, SIZE,
    get(id) { return ITEMS[id]; },
    count(items, id) { return items.filter((s) => s.id === id).reduce((a, s) => a + s.n, 0); },
    // 放得下幾個就放幾個，回傳實際放進去的數量
    add(items, id, n = 1) {
      const it = ITEMS[id];
      if (!it) return 0;
      let left = n;
      for (const s of items) {
        if (!left) break;
        if (s.id !== id) continue;
        const room = (it.stack || 1) - s.n;
        const k = Math.min(room, left);
        if (k > 0) { s.n += k; left -= k; }
      }
      while (left > 0 && items.length < SIZE) {
        const k = Math.min(it.stack || 1, left);
        items.push({ id, n: k });
        left -= k;
      }
      return n - left;
    },
    remove(items, id, n = 1) {
      let left = n;
      for (let i = items.length - 1; i >= 0 && left > 0; i--) {
        const s = items[i];
        if (s.id !== id) continue;
        const k = Math.min(s.n, left);
        s.n -= k; left -= k;
        if (s.n <= 0) items.splice(i, 1);
      }
      return n - left;
    },
    // 畫一個小圖示（HTML）
    icon(id) {
      const it = ITEMS[id];
      return `<i class="bag-ic ${it?.icon || ""}" style="--ic:${it?.color || "#999"}"></i>`;
    },
    // 戰鬥結束掉落：依掉落表擲骰
    rollDrops(kinds, cfg) {
      const got = {};
      for (const k of kinds) for (const d of cfg.enemies[k]?.drops || []) if (Math.random() < d.chance) got[d.item] = (got[d.item] || 0) + (d.n || 1);
      return got;
    },
  };
})();
