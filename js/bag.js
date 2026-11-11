/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/bag.js": "20261112021356" });
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
    vivMushroom: { name: "薇薇拉的蘑菇", desc: "薇薇拉隨身帶著的蘑菇。當魚餌容易釣出珍品，但釣不出稀有的魚", color: "#d0645a", icon: "berry", stack: 1, bait: true, virtual: true },
    stolenNets: { name: "被搶的漁網", desc: "從海盜船上搶回來的漁網，綁著漁會的木牌", color: "#3f6f8f", icon: "drop", stack: 1, quest: true },
    homerEpic: { name: "荷馬史詩", desc: "理性倉庫裡照採購清單領出來的書。普羅說微波爐需要文學之美的領導", color: "#8a5a2a", icon: "drop", stack: 1, quest: true },
    hardEgg: { name: "難蛋", desc: "電腦印錯的蛋，冒著怪味。要丟進報廢室……還是說服普羅拿它做實驗？", color: "#6f7a4a", icon: "berry", stack: 1, quest: true },
    chickenEgg: { name: "雞蛋", desc: "完美的、毫無苦難的雞蛋", color: "#f4e6c8", icon: "berry", stack: 1, quest: true },
    failRecipe: { name: "絕對失敗的配方", desc: "每一行都被劃掉了的配方。所長瑪德蓮會用一點金幣收下它", color: "#9aa0aa", icon: "leaf", stack: 9, quest: true },
    livePudding: { name: "會動的布丁", desc: "史萊姆的變體，在你手上抖個不停", color: "#f2c86a", icon: "drop", stack: 1, quest: true },
    pumpkinPie: { name: "南瓜派", desc: "髏髏烤的南瓜派，回復 35% 生命（旅館裡＝降低驚嚇值）", color: "#e8781e", icon: "meat", stack: 9, use: { hp: 0.35 }, field: true, battle: true, price: 40, sell: 15 },
    ghostSoda: { name: "幽靈汽水", desc: "冒著白煙的汽水，回復 40% 魔力（戰鬥中使用）", color: "#b8a8e8", icon: "bottle", stack: 9, use: { mp: 0.4 }, battle: true, price: 30, sell: 12 },
    brainCake: { name: "腦漿蛋糕", desc: "髏髏做給喪屍住戶的蛋糕。看起來像腦，聞起來像草莓", color: "#e8a0b0", icon: "berry", stack: 1, quest: true },
    apologyLetter: { name: "寄給昨天的道歉信", desc: "信封上的郵戳是「昨天」。信很重，重得不像只有一張紙", color: "#d8c8a0", icon: "leaf", stack: 1, quest: true },
    blockFish: { name: "方塊魚", desc: "蒙德里安的理想國的黃色水面裡釣到的方塊形的魚。帶回酒館請桑恩烤，或賣給商店", color: "#e8262c", icon: "block", stack: 20, sell: 8, mat: true },
    grilledBlockFish: { name: "烤方塊魚", desc: "桑恩烤的方塊魚，烤出了整齊的格子紋。回復 35% 生命、20% 魔力", color: "#c8742a", icon: "block", stack: 9, use: { hp: 0.35, mp: 0.2 }, field: true, battle: true, sell: 18 },
    borrowedInk: { name: "借來的墨水", desc: "色塊野獸借給你的黑色輪廓線，化成了一小罐墨水。拿來補畫布上的白縫", color: "#1d1d1f", icon: "bottle", stack: 9, quest: true },
    hotCocoa: { name: "熱可可", desc: "月台自動販賣機的熱可可，罐子燙手。回復 20% 生命", color: "#7a4a2a", icon: "bottle", stack: 9, use: { hp: 0.2 }, field: true, battle: true, price: 15, sell: 5 },
    snowPelt: { name: "熊的毛皮", desc: "熊身上掉下來的一塊毛皮，很暖。可以賣給商店", color: "#8a5a32", icon: "block", stack: 20, sell: 12, mat: true },
    oldTicket: { name: "舊車票", desc: "剪票機肚子裡掉出來的舊車票，日期是好幾圈以前。可以賣給商店", color: "#d8c8a0", icon: "leaf", stack: 20, sell: 6, mat: true },
    droneChip: { name: "無人機晶片", desc: "失控無人機掉下來的晶片。可以賣給商店", color: "#3a8a6a", icon: "block", stack: 20, sell: 12, mat: true },
    iceBell: { name: "冰鈴草", desc: "只在暴風雪最大的時候開花的藥草，花像一串冰做的小鈴鐺", color: "#a8d8f0", icon: "leaf", stack: 1, quest: true },
    miraGoods: { name: "米拉的貨", desc: "一箱用列車上的報紙包著的貨，要在南月台交給買家", color: "#8a6a3a", icon: "block", stack: 1, quest: true },
    jellyPot: { name: "西瓜蟲們的果凍罐", desc: "比你還大的果凍罐，扛著走得很慢", color: "#e86a8a", icon: "drop", stack: 1, quest: true },
    grain: { name: "一粒糧食", desc: "比你的頭還大的穀粒", color: "#e8c87a", icon: "berry", stack: 9, quest: true },
    ruinCore: { name: "古代機關的核心", desc: "古代守衛機關、巡弋機關裡拆下來的發光核心。朵拉想要，也可以賣給商店", color: "#5ad0e0", icon: "berry", stack: 20, sell: 18, mat: true },
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
