/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/bag.js": "20261114045024" });
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
    lactoDrink: { name: "乳酸飲料", desc: "月台自動販賣機的乳酸飲料，酸酸甜甜。解除一個負面狀態（破綻、麻痺、破防、虛弱……；戰鬥中使用）", color: "#e8a0c0", icon: "bottle", stack: 9, use: { cleanse: 1 }, battle: true, price: 20, sell: 6 },
    colaCan: { name: "鋁罐可樂", desc: "月台自動販賣機的鋁罐可樂，冰得發麻。喝了之後 30 秒內，地圖探索的移動速度 ×1.5", color: "#c0392b", icon: "bottle", stack: 9, use: { rush: 30 }, field: true, price: 20, sell: 6 },
    snowPelt: { name: "熊的毛皮", desc: "熊身上掉下來的一塊毛皮，很暖。可以賣給商店", color: "#8a5a32", icon: "block", stack: 20, sell: 12, mat: true },
    oldTicket: { name: "舊車票", desc: "剪票機肚子裡掉出來的舊車票，日期是好幾圈以前。可以賣給商店", color: "#d8c8a0", icon: "leaf", stack: 20, sell: 6, mat: true },
    droneChip: { name: "無人機晶片", desc: "失控無人機掉下來的晶片。可以賣給商店", color: "#3a8a6a", icon: "block", stack: 20, sell: 12, mat: true },
    iceBell: { name: "冰鈴草", desc: "只在暴風雪最大的時候開花的藥草，花像一串冰做的小鈴鐺", color: "#a8d8f0", icon: "leaf", stack: 1, quest: true },
    miraGoods: { name: "米拉的貨", desc: "一箱用列車上的報紙包著的貨，要在南月台交給買家", color: "#8a6a3a", icon: "block", stack: 1, quest: true },
    jellyPot: { name: "西瓜蟲們的果凍罐", desc: "比你還大的果凍罐，扛著走得很慢", color: "#e86a8a", icon: "drop", stack: 1, quest: true },
    grain: { name: "一粒糧食", desc: "比你的頭還大的穀粒", color: "#e8c87a", icon: "berry", stack: 9, quest: true },
    // ===== B 級時空 =====
    cloudFluff: { name: "深海雲朵", desc: "雲端上的海洋最底層的雲朵。捏得動、Q 彈、有點涼。可以拿來補洞，也可以賣給商店", color: "#e8f4ff", icon: "berry", stack: 20, sell: 14, mat: true },
    divingCamera: { name: "潛水相機", desc: "雲朵做的防水殼裡裝著一台相機。這片海的魚抓不到，只拍得到", color: "#3a6a9a", icon: "block", stack: 1, quest: true },
    suture: { name: "完美的縫線", desc: "被完美縫合的病人身上掉下來的縫線，針腳整齊得嚇人。可以賣給商店", color: "#9a7a8a", icon: "block", stack: 20, sell: 14, mat: true },
    sedative: { name: "訂製的鎮靜針", desc: "精準到小數點第五位的鎮靜針。只適合那一位病人", color: "#2a8a7a", icon: "bottle", stack: 9, quest: true },
    glowCap: { name: "發光的蘑菇傘", desc: "礦洞裡發光蘑菇的傘蓋。拿在手上能照亮一小塊地方，也可以賣給商店", color: "#9ad8ff", icon: "berry", stack: 20, sell: 14, mat: true },
    memoryToken: { name: "2016 年的回憶", desc: "黑市裡流通的童年回憶，摸起來是溫的。可以賣給商店", color: "#e8b84a", icon: "berry", stack: 20, sell: 16, mat: true },
    bronzeFeather: { name: "青銅羽毛", desc: "斯廷法羅斯怪鳥的羽毛，邊緣利得可以削水果。可以賣給商店", color: "#b8863a", icon: "block", stack: 20, sell: 22, mat: true },
    pixelChip: { name: "像素碎片", desc: "像素敵機掉下來的一格方塊，摸起來是平的。可以賣給商店", color: "#e83a8a", icon: "block", stack: 20, sell: 22, mat: true },
    bugCode: { name: "除錯碼", desc: "機台裡撿到的三段亂碼，拼起來好像是某個指令", color: "#5aff9a", icon: "block", stack: 3, quest: true },
    grapes: { name: "一串葡萄", desc: "東邊平原的葡萄藤上摘的，紫得發亮", color: "#6a2a7a", icon: "berry", stack: 1, quest: true },
    figs: { name: "一籃無花果", desc: "市集攤位買的無花果，甜得黏手", color: "#8a4a8a", icon: "berry", stack: 1, quest: true },
    wineJar: { name: "一罈葡萄酒", desc: "半人馬克洛斯珍藏的葡萄酒。打開蓋子就醉了一半", color: "#7a3a8a", icon: "bottle", stack: 1, quest: true },
    oliveBranch: { name: "雅典娜的橄欖枝", desc: "供奉在雅典娜神殿裡的橄欖枝。拿在手上，好像有人在背後看著你", color: "#7a9a4a", icon: "block", stack: 1, quest: true },
    joss: { name: "燒剩的紙錢", desc: "紙紮人身上掉下來的紙錢，邊緣燒焦了。可以賣給商店", color: "#d8c890", icon: "block", stack: 20, sell: 22, mat: true },
    baguaMirror: { name: "八卦鏡", desc: "第七位道士留下的八卦鏡。照一下，能看見宅子裡本來看不見的東西（陰氣會上升）", color: "#c8a040", icon: "block", stack: 1, quest: true },
    lilyPetal: { name: "彼岸花的花瓣", desc: "事務所外面彼岸花田的花瓣。據說能讓人想起已經忘記的事。可以賣給商店", color: "#c40a1e", icon: "berry", stack: 20, sell: 16, mat: true },
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
