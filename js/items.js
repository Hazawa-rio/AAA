/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/items.js": "20261110175453" });
// 寶物：玩家有 6 格寶物欄，放在欄裡的寶物都會生效
// 寶物存在角色的成長資料裡（R.Progress），戰鬥開始時帶進場
(function () {
  const R = window.RPG;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const RARITY = {
    common: { name: "普通", color: "#8a8478" },
    rare: { name: "稀有", color: "#3d7fe0" },
    epic: { name: "史詩", color: "#8a4fd1" },
    legendary: { name: "傳說", color: "#e08a00" },
  };

  // stats：直接加在數值上的寶物（商店賣的普通寶物）
  const LIST = {
    // ===== #CI00001 奇儂鎮：打倒變異發泡水母得到（稀有） =====
    mutantShell: {
      id: "mutantShell", name: "異變硬殼", rarity: "rare",
      desc: "變異發泡水母頭上剝下來的紅色硬殼，硬得連魔狼都咬不動。防禦 +6", stats: { df: 6 },
      source: "奇儂鎮・海上的變異發泡水母",
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 22 Q4 6 16 6 Q28 6 28 22 L24 18 L21 23 L17 18 L14 23 L11 18 L8 23 Z" fill="#9a1b2a" stroke="#5a0a14" stroke-width="2" stroke-linejoin="round"/><circle cx="5" cy="22" r="2.6" fill="#8fd6e8"/><circle cx="27" cy="22" r="2.6" fill="#8fd6e8"/><path d="M10 11 Q16 8 22 11" stroke="#d65a6a" stroke-width="1.5" fill="none"/></svg>',
    },
    // ===== #CI00001 奇儂鎮的商店（完成委託後開放，稀有度：普通） =====
    oilskin: {
      id: "oilskin", name: "漁夫的防水斗篷", rarity: "common", price: 140, shop: "fish",
      desc: "漁會特製、浸過魚油的厚斗篷。防禦 +3", stats: { df: 3 },
      source: "奇儂鎮・漁會",
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4 C10 4 8 8 8 12 L5 27 H27 L24 12 C24 8 22 4 16 4 Z" fill="#3f6f8f" stroke="#244a62" stroke-width="2" stroke-linejoin="round"/><path d="M12 12 H20" stroke="#cfe3ef" stroke-width="2"/></svg>',
    },
    pickleJar: {
      id: "pickleJar", name: "商隊的醃漬罐", rarity: "common", price: 120, shop: "guild",
      desc: "商人公會送給護衛的醃漬蔬菜，吃了很有精神。生命 +15", stats: { hp: 15 },
      source: "奇儂鎮・商人公會",
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="9" y="5" width="14" height="5" rx="1.5" fill="#8a5a3a"/><rect x="7" y="10" width="18" height="18" rx="4" fill="#b8d27a" stroke="#5a7a2a" stroke-width="2"/><circle cx="13" cy="18" r="2.4" fill="#6a9a3a"/><circle cx="19" cy="22" r="2.4" fill="#6a9a3a"/></svg>',
    },
    fangCharm: {
      id: "fangCharm", name: "魔狼牙護符", rarity: "common", price: 160, shop: "market",
      desc: "用魔狼的尖牙串成的護符。攻擊 +4", stats: { atk: 4 },
      source: "奇儂鎮・海上市集",
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 8 Q16 16 27 8" fill="none" stroke="#8a6a3a" stroke-width="2"/><path d="M11 11 L13 24 L15 12 Z M17 12 L19 25 L21 11 Z" fill="#efe6d2" stroke="#7a6a52" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    },
    luckyShell: {
      id: "luckyShell", name: "異國的幸運貝殼", rarity: "common", price: 130, shop: "market",
      desc: "海上市集攤販說是遠方海域的幸運物。速度 +1", stats: { spd: 1 },
      source: "奇儂鎮・海上市集",
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 27 L5 12 Q16 2 27 12 Z" fill="#f4c6d8" stroke="#b86a8a" stroke-width="2" stroke-linejoin="round"/><path d="M16 27 L11 9 M16 27 L16 6 M16 27 L21 9" stroke="#b86a8a" stroke-width="1.5"/></svg>',
    },

    // 擊敗試煉 Boss「受難之日」獲得
    crown: {
      id: "crown", name: "輝煌之冠", rarity: "legendary",
      desc: "所有範圍技能都附帶一道擴散圓環：對範圍內的敵人造成傷害，並依造成的傷害回復自己的生命",
      source: "擊敗試煉 Boss「受難之日」",
      ring: { radius: 150, base: 12, healRatio: 0.5 },     // 暫定
      // 黃色三角形，中間一個紅點
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4 L29 27 H3 Z" fill="#f2c200" stroke="#b8860b" stroke-width="2" stroke-linejoin="round"/><circle cx="16" cy="19" r="3.6" fill="#e8262c"/></svg>',
      onSkill(b, u, sk, center) {
        if (!sk.tags?.includes("area") || !center) return;
        const G = this.ring;
        b.emit({ type: "crownRing", x: center.x, y: center.y, radius: G.radius });
        let total = 0;
        for (const e of b.enemies()) if (R.dist(e.x, e.y, center.x, center.y) <= G.radius + e.r) total += b.damage(u, e, G.base, 1, "（輝煌之冠）");
        if (total > 0) b.heal(u, Math.max(1, Math.round(total * G.healRatio)), "（輝煌之冠）");
      },
    },
  };

  R.Items = {
    SLOTS: 6,
    RARITY,
    LIST,
    get(id) { return LIST[id]; },
    // 寶物格的 HTML（滑鼠停留顯示名稱與效果）
    slotHtml(id) {
      const it = LIST[id];
      if (!it) return `<span class="item-slot empty" aria-label="空的寶物格"></span>`;
      const r = RARITY[it.rarity];
      return `<span class="item-slot" style="--rc:${r.color}" title="${esc(`【${r.name}】${it.name}\n${it.desc}`)}" aria-label="${esc(it.name)}">${it.icon}</span>`;
    },
    // 用技能之後：寶物的附加效果
    afterSkill(b, u, sk, center) {
      for (const id of u.items || []) LIST[id]?.onSkill?.(b, u, sk, center);
    },
    // 獲得寶物：放進第一個空格。回傳 { ok, text }
    give(charId, id) {
      const P = R.Progress, it = LIST[id];
      if (!P || !it) return { ok: false, text: "" };
      const build = P.load(charId);
      build.items = build.items || [];
      if (build.items.includes(id)) return { ok: false, text: `已經擁有【${it.name}】` };
      if (build.items.length >= this.SLOTS) return { ok: false, text: `寶物欄已滿，無法放入【${it.name}】` };
      build.items.push(id);
      P.save(charId, build);
      return { ok: true, text: `獲得${RARITY[it.rarity].name}寶物【${it.name}】` };
    },
  };
})();
