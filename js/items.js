/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/items.js": "20261112021356" });
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
    // ===== #LB00042 美食研究所：神奇微波爐的實驗產物 =====
    fruitCake: {
      id: "fruitCake", name: "水果蛋糕", rarity: "common",
      desc: "微波爐把兩樣毫不相干的素材「烤」成了一塊水果蛋糕，聞起來很正常。生命 +18", stats: { hp: 18 },
      source: "美食研究所・手稿上的實驗意外",
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 16 H27 V26 H5 Z" fill="#f6e3c6" stroke="#a8784e" stroke-width="2"/><path d="M5 16 Q16 10 27 16" fill="#fff" stroke="#a8784e" stroke-width="2"/><circle cx="11" cy="12" r="2.6" fill="#e0524a"/><circle cx="17" cy="10" r="2.6" fill="#f2b81a"/><circle cx="22" cy="12" r="2.6" fill="#6abf5a"/></svg>',
    },
    mousseRazor: {
      id: "mousseRazor", name: "慕斯剃刀", rarity: "common",
      desc: "刀刃是凝固的巧克力慕斯，卻鋒利得能刮鬍子。攻擊 +4", stats: { atk: 4 },
      source: "美食研究所・手稿上的實驗意外",
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 22 L22 6 L26 10 L10 26 Z" fill="#7a4a2a" stroke="#4a2a12" stroke-width="2" stroke-linejoin="round"/><path d="M9 25 L5 27 L7 23" fill="#c9cdd6"/><path d="M14 18 L18 14" stroke="#c99a6a" stroke-width="2"/></svg>',
    },
    steelToy: {
      id: "steelToy", name: "鋼鐵玩具", rarity: "common",
      desc: "一隻實心鋼鐵做的玩具熊，抱著它很有安全感。防禦 +3", stats: { df: 3 },
      source: "美食研究所・手稿上的實驗意外",
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="9" cy="8" r="4" fill="#9aa0aa" stroke="#5a6070" stroke-width="2"/><circle cx="23" cy="8" r="4" fill="#9aa0aa" stroke="#5a6070" stroke-width="2"/><circle cx="16" cy="17" r="10" fill="#b8bec8" stroke="#5a6070" stroke-width="2"/><circle cx="12.5" cy="15" r="1.6" fill="#2a2e36"/><circle cx="19.5" cy="15" r="1.6" fill="#2a2e36"/><ellipse cx="16" cy="20" rx="3" ry="2" fill="#5a6070"/></svg>',
    },
    cosmic42: {
      id: "cosmic42", name: "宇宙秘密 42 號", rarity: "rare",
      desc: "4 號素材加 2 號素材——微波爐吐出一顆裝著小宇宙的玻璃珠。使用投射技能時，額外射出一顆小星星打最近的敵人",
      source: "美食研究所・4 號＋2 號",
      star: { base: 6, range: 420 },
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12" fill="#1a1d3a" stroke="#5a6aa8" stroke-width="2"/><path d="M16 8 L18 14 L24 14 L19 18 L21 24 L16 20 L11 24 L13 18 L8 14 L14 14 Z" fill="#f2d45a"/><circle cx="9" cy="10" r="1" fill="#fff"/><circle cx="23" cy="22" r="1" fill="#fff"/></svg>',
      onSkill(b, u, sk) {
        if (!sk.tags?.includes("projectile")) return;
        const S = this.star, t = b.enemies().filter((e) => R.dist(e.x, e.y, u.x, u.y) <= S.range).sort((a, c) => R.dist(a.x, a.y, u.x, u.y) - R.dist(c.x, c.y, u.x, u.y))[0];
        if (!t) return;
        b.emit({ type: "talisman", from: { x: u.x, y: u.y }, to: { x: t.x, y: t.y }, star: true, dur: 280 });
        b.damage(u, t, S.base, 1, "（宇宙秘密 42 號）");
      },
    },
    hotdogDog: {
      id: "hotdogDog", name: "熱狗的狗", rarity: "rare",
      desc: "一隻夾在麵包裡的臘腸狗，搖著尾巴。召喚物受到攻擊時回復少量生命",
      source: "美食研究所・隨機配方的實驗意外",
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 18 Q16 30 28 18 Q16 24 4 18 Z" fill="#e8b46a" stroke="#a8784e" stroke-width="2"/><rect x="7" y="13" width="18" height="6" rx="3" fill="#b8562a" stroke="#7a3412" stroke-width="2"/><circle cx="24" cy="12" r="3" fill="#b8562a" stroke="#7a3412" stroke-width="1.5"/><circle cx="25" cy="11" r="0.9" fill="#1d1d1f"/></svg>',
      onSummonHurt(b, s) { if (s.alive) b.heal(s, Math.max(1, Math.round(s.maxHp * 0.05)), "（熱狗的狗）"); },
    },
    mysteryMedal: {
      id: "mysteryMedal", name: "神秘勳章", rarity: "rare",
      desc: "沒人知道是頒給誰的勳章，戴上去就覺得自己做了什麼了不起的事。魔力 +15、速度 +1", stats: { mp: 15, spd: 1 },
      source: "美食研究所・隨機配方的實驗意外",
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11 3 L16 12 L21 3" fill="none" stroke="#3a6ad6" stroke-width="4"/><circle cx="16" cy="20" r="9" fill="#f2c53a" stroke="#a8781a" stroke-width="2"/><text x="16" y="24" text-anchor="middle" font-size="10" font-weight="900" fill="#7a5a12">?</text></svg>',
    },
    fantasyFlask: {
      id: "fantasyFlask", name: "奇幻燒瓶", rarity: "epic",
      desc: "燒瓶裡的液體顏色一直在變，搖一搖會傳出歌聲。普攻傷害 ×1.25",
      source: "美食研究所・隨機配方的實驗意外",
      basicMult: 1.25,
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M12 3 H20 V11 L27 25 Q28 29 24 29 H8 Q4 29 5 25 L12 11 Z" fill="#e8f2ff" stroke="#5a4a8a" stroke-width="2" stroke-linejoin="round"/><path d="M7.5 22 L24.5 22 L26 26 Q26 27.5 24 27.5 H8 Q6 27.5 6.5 26 Z" fill="#b07ae0"/><circle cx="14" cy="18" r="1.5" fill="#f2b81a"/><circle cx="19" cy="15" r="1" fill="#6ad6c8"/></svg>',
      dmgMult(b, u) { return b.currentSkill && b.currentSkill === b.char.basic ? this.basicMult : 1; },
    },
    horrorGel: {
      id: "horrorGel", name: "恐怖黏液", rarity: "rare",
      desc: "彈跳噩夢留下的黏液，會黏住所有碰到它的東西。被攻擊時，攻擊者的速度 −1（每隻最多 −3）",
      source: "美食研究所・彈跳噩夢",
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 22 Q5 8 16 8 Q27 8 27 22 Q24 27 21 23 Q18 29 15 23 Q11 28 9 23 Q6 26 5 22 Z" fill="#c95a8a" stroke="#7a2a52" stroke-width="2"/><circle cx="12" cy="15" r="2" fill="#fff"/><circle cx="20" cy="15" r="2" fill="#fff"/><circle cx="12" cy="15.5" r="1" fill="#1d1d1f"/><circle cx="20" cy="15.5" r="1" fill="#1d1d1f"/></svg>',
      onHurt(b, u, src) {
        const e = src?.parent || src;
        if (!e || e.team === "player" || !e.alive) return;
        e.state.gelSlow = e.state.gelSlow || 0;
        if (e.state.gelSlow >= 3) return;
        e.state.gelSlow++; e.spd = Math.max(1, e.spd - 1);
        b.emit({ type: "buff", unit: e, text: "速度 −1（恐怖黏液）", color: "#c95a8a" });
      },
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

    // ===== #HW01031 永遠萬聖節旅館：自助餐廳（廚師髏髏）的商店 =====
    boneBowtie: {
      id: "boneBowtie", name: "骷髏領結", rarity: "common", price: 140, shop: "buffet",
      desc: "旅館員工制服的領結，骨骨經理說「骨盆以上、頸椎以下」。防禦 +3", stats: { df: 3 },
      source: "永遠萬聖節旅館・自助餐廳",
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 9 L14 16 L4 23 Z M28 9 L18 16 L28 23 Z" fill="#1d1d24" stroke="#7a3fb0" stroke-width="2" stroke-linejoin="round"/><rect x="13" y="12" width="6" height="8" rx="2" fill="#efe6d2" stroke="#7a3fb0" stroke-width="1.5"/></svg>',
    },
    pumpkinLantern: {
      id: "pumpkinLantern", name: "南瓜燈", rarity: "common", price: 150, shop: "buffet",
      desc: "永遠不會熄的南瓜燈，提著它膽子就大了。攻擊 +4", stats: { atk: 4 },
      source: "永遠萬聖節旅館・自助餐廳",
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><ellipse cx="16" cy="18" rx="12" ry="10" fill="#e8781e" stroke="#a84e10" stroke-width="2"/><rect x="14" y="5" width="4" height="5" fill="#4a7a2a"/><path d="M9 16 L12 13 L14 16 Z M23 16 L20 13 L18 16 Z M10 21 H22 L16 25 Z" fill="#ffe08a"/></svg>',
    },

    // ===== #SN00512 燈塔小鎮：雜貨店 =====
    eternalSnow: {
      id: "eternalSnow", name: "化不掉的雪花", rarity: "common", price: 140, shop: "general",
      desc: "裝在小玻璃瓶裡的一片雪花，放在暖爐旁邊也不會融。握著它，腦袋會變得很清醒。魔力 +15", stats: { mp: 15 },
      source: "燈塔小鎮・雜貨店",
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="8" y="5" width="16" height="23" rx="5" fill="#e8f4fa" stroke="#6a9ab8" stroke-width="2"/><g stroke="#4a8fb0" stroke-width="2" stroke-linecap="round"><path d="M16 10 V23 M10.5 13 L21.5 20 M21.5 13 L10.5 20"/></g></svg>',
    },

    // 美食研究所：沒有任何提示的隨機配方（每個存檔一組，不會變）才做得出來
    genius1: {
      id: "genius1", name: "天才的1%靈感", rarity: "legendary",
      desc: "天才是 1% 的靈感，加上 99% 的失敗。投射技能的射程 +30%；打中的敵人如果站在多出來的那段射程裡（比原本的射程還遠），受到的傷害 +50%",
      source: "美食研究所・神奇微波爐（沒有提示的配方）",
      reach: { mult: 1.3, far: 1.5 },                                   // 暫定
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4 a8 8 0 0 0 -5 14 V22 H21 V18 a8 8 0 0 0 -5 -14 Z" fill="#fff2a8" stroke="#c98a1a" stroke-width="2" stroke-linejoin="round"/><rect x="12" y="23" width="8" height="4" rx="1.5" fill="#8a8478"/><text x="16" y="16" text-anchor="middle" font-size="7" font-weight="900" fill="#c98a1a">1%</text></svg>',
      onStart(b) {
        for (const sk of Object.values(b.char.skills || {})) if (sk.tags?.includes("projectile") && typeof sk.range === "number") { sk._baseRange = sk._baseRange ?? sk.range; sk.range = Math.round(sk._baseRange * this.reach.mult); }
      },
      dmgMult(b, u, dst) {
        const sk = b.currentSkill && b.char.skills[b.currentSkill];
        if (!sk?.tags?.includes("projectile") || sk._baseRange == null || !dst) return 1;
        return R.dist(u.x, u.y, dst.x, dst.y) - (dst.r || 0) > sk._baseRange ? this.reach.far : 1;
      },
    },

    // ===== #RU20314 古代遺跡：寶箱裡開得到（觀知命的「趨吉避凶」會提高機率），寶庫一定有一樣 =====
    ruinCog: {
      id: "ruinCog", name: "古代齒輪護符", rarity: "rare", ruins: true,
      desc: "遺跡牆裡拆下來的小齒輪，到現在還在轉。防禦 +5、速度 +1", stats: { df: 5, spd: 1 },
      source: "古代遺跡科考隊・遺跡的寶箱",
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="9" fill="#b8ac94" stroke="#5a5040" stroke-width="2"/><g fill="#b8ac94" stroke="#5a5040" stroke-width="1.5"><rect x="14" y="3" width="4" height="6"/><rect x="14" y="23" width="4" height="6"/><rect x="3" y="14" width="6" height="4"/><rect x="23" y="14" width="6" height="4"/></g><circle cx="16" cy="16" r="3" fill="#5ad0e0"/></svg>',
    },
    ruinCell: {
      id: "ruinCell", name: "古代能量電池", rarity: "rare", ruins: true,
      desc: "守衛機關用的能量電池，摸起來麻麻的。攻擊 +5、魔力 +10", stats: { atk: 5, mp: 10 },
      source: "古代遺跡科考隊・遺跡的寶箱",
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="9" y="7" width="14" height="21" rx="3" fill="#3a4a5a" stroke="#1d1d1f" stroke-width="2"/><rect x="13" y="4" width="6" height="4" fill="#8a8478"/><path d="M17 11 L12 19 H16 L14 25 L20 16 H16 Z" fill="#5ad0e0"/></svg>',
    },
    ruinLens: {
      id: "ruinLens", name: "巡弋機關的透鏡", rarity: "epic", ruins: true,
      desc: "巡弋機關發射雷射用的紅色透鏡。投射技能的傷害 +15%",
      source: "古代遺跡科考隊・遺跡的寶箱",
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M27 6 L5 16 L27 26 Z" fill="#8a8e98" stroke="#1d1d1f" stroke-width="2" stroke-linejoin="round"/><circle cx="13" cy="16" r="4" fill="none" stroke="#e8262c" stroke-width="2.5"/></svg>',
      dmgMult(b) { const sk = b.currentSkill && b.char.skills[b.currentSkill]; return sk?.tags?.includes("projectile") ? 1.15 : 1; },
    },

    // 擊敗「十分恐怖的暗黑霸王龍之王」獲得
    vantaBlack: {
      id: "vantaBlack", name: "凡塔黑", rarity: "legendary",
      desc: "比黑色還黑的墨水，連光都逃不出去。使用近戰攻擊時，同時潑灑一團墨水：對附近的敵人造成中等傷害，並讓它們的速度 −1（每隻最多 −3）",
      source: "蒙德里安的理想國・十分恐怖的暗黑霸王龍之王",
      ink: { radius: 95, base: 14, melee: 220, maxSlow: 3 },           // 暫定
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4 C10 13 7 17 7 21 a9 9 0 0 0 18 0 C25 17 22 13 16 4 Z" fill="#050507" stroke="#3a3a44" stroke-width="2"/><circle cx="12.5" cy="20" r="2" fill="#2a2a34"/></svg>',
      // 近戰：不是投射技能、打到的敵人在身邊。每次出招只潑一次
      onHit(b, u, dst) {
        const I = this.ink, sk = b.currentSkill && b.char.skills[b.currentSkill];
        if (!sk || sk.tags?.includes("projectile") || dst.team === u.team || R.dist(u.x, u.y, dst.x, dst.y) > I.melee) return;
        if (b._inkSeq === b.skillSeq) return;
        b._inkSeq = b.skillSeq;
        b.emit({ type: "ink", x: dst.x, y: dst.y, r: I.radius });
        for (const e of b.enemies().filter((e) => R.dist(e.x, e.y, dst.x, dst.y) <= I.radius + e.r)) {
          b.damage(u, e, I.base, 1, "（凡塔黑）");
          e.inkSlow = e.inkSlow || 0;
          if (e.alive && e.inkSlow < I.maxSlow) { e.inkSlow++; e.spd = Math.max(1, e.spd - 1); b.say(`${e.name} 被墨水黏住，速度 −1`); }
        }
      },
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
    // 傷害倍率（例如奇幻燒瓶：普攻增傷）、受到攻擊、召喚物受到攻擊
    // 戰鬥開始：先把被寶物改過的射程還原，再讓寶物重新套用
    onStart(b, u) {
      for (const sk of Object.values(b.char?.skills || {})) if (sk._baseRange != null) sk.range = sk._baseRange;
      for (const id of u.items || []) LIST[id]?.onStart?.(b, u);
    },
    dmgMult(b, u, dst) { let m = 1; for (const id of u.items || []) m *= LIST[id]?.dmgMult?.(b, u, dst) || 1; return m; },
    onHurt(b, u, src) { for (const id of u.items || []) LIST[id]?.onHurt?.(b, u, src); },
    onHit(b, u, dst) { for (const id of u.items || []) LIST[id]?.onHit?.(b, u, dst); },
    onSummonHurt(b, s, src) { for (const id of b.player.items || []) LIST[id]?.onSummonHurt?.(b, s, src); },
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
