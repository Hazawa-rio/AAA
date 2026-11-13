/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/characters/youyan.js": "20261114042342" });
// 角色：悠魘（洋紅色的「悠」，卡池角色）
// 表面上：來自■■■■的魔法少女，和使魔咕哩咕妞簽了契約，用魔法守護愛與正義
// 隱藏簡介（酒館名牌架滑鼠移到簡介上才看得到）：鮫島事件時空的少女，人格被那裡的「異常現象」吃掉，成了高危異常現象的容器
//
// 兩個型態：
//   悠（平常）：魔力角色。被動「為愛奉獻」：普攻也花魔力；魔力不夠就用同樣多的生命支付（最多用到剩一半生命）
//   魘（變身後）：所有技能換成隱藏名、大幅強化，動畫變成血肉；只用生命支付、無法回復生命；生命耗盡＝變回一半生命的悠；不能用大招
// 普攻「揮動法杖」（魘：人格抽離）：短距離扇形
// Q「魔導法陣」（魘：血肉囚牢）：法陣把「整個被關在裡面」的敵人困住（走不出去），但我方也打不到裡面的敵人（打下去會打在法陣上）；
//   法陣有耐久，被打壞（我方打、裡面的敵人撞）會立刻噴出較弱的光束；沒被打壞的話，下次輪到悠魘時向上噴出光束
// E「魔法結晶」（魘：詭異血繭）：做出一顆結晶，湊滿三顆就一起射向最近的敵人
// W「夢想變身」（10 次行動充能；隱藏名：攝食至死）：伸出觸手吸取指定的敵人，傷害多少就回復多少，
//   回到滿血或回復了一半生命就變身：一瞬間露出「真身」→ 被抖動的黑色馬賽克蓋住 → 變成魘
// 大招強化（四選一）：
//   奧秘之瞳：部分特效太獵奇——全場的悠魘都改用和諧特效（血肉→紅色的光、真身→紅色光球、黑色馬賽克→黑屏）
//   夢想變身：變身時 +2 行動值；變回悠時補滿生命，但這場戰鬥的最大生命少掉原本的 25%（累積）；一場最多用三次
//   咕哩咕妞：吸完血不變成魘，而是變成巨大的咕哩咕妞（不可操作）——全螢幕抖動的黑色馬賽克、黑屏中間抖動的紅字「Samejima Jiken」
//     （不時閃成 Wingdings），動畫結束後消耗所有生命，對全地圖的敵人造成巨大傷害，然後變回悠（一半生命）
//   我的夢想：獵奇的變身動畫後再被粉紅色的星星罩住，變成在兩個樣子之間閃爍切換的型態（其實還是魘）；每次用技能都會附加一圈粉紅星星（打到周圍的敵人）
// 數值都是暫定；個性台詞之後由使用者提供；音效暫用現有的
(function () {
  const R = window.RPG;
  R.CHARACTERS = R.CHARACTERS || {};
  const err = (m) => { throw new R.ActionError(m); };
  const DEG = Math.PI / 180;
  const upg = (u) => u.upg || {};
  const now = () => performance.now();
  const yan = (u) => u?.state?.form === "yan";
  const dirOf = (u, arg) => {
    const t = arg.target ? arg.target : arg;
    if (!t || !Number.isFinite(t.x)) err("請點選方向");
    const L = Math.hypot(t.x - u.x, t.y - u.y);
    if (L < 1) err("請點選方向");
    return { dx: (t.x - u.x) / L, dy: (t.y - u.y) / L, ang: Math.atan2(t.y - u.y, t.x - u.x) };
  };
  // 音效：暫用現有的（使用者之後可以換）
  // youyan-magic＝閃耀的魔法、youyan-grow＝血肉生長、youyan-flesh＝血肉；其他暫用現有的
  const SND = { staff: "sounds/ilshu-slash.mp3", flesh: "sounds/youyan-flesh.mp3", magic: "sounds/youyan-magic.mp3", grow: "sounds/youyan-grow.mp3", beam: "sounds/boss-laser.mp3", shot: "sounds/boss-bullet.mp3", tentacle: "sounds/boss-tentacle.mp3" };
  const PINK = "#d4147a", RED = "#c40a1e";
  // 奧秘之瞳：場上只要有一個悠魘選了它，全場的悠魘都用和諧特效
  let CALM = false;
  const calmOf = (b) => !!b?.units?.some((x) => x.team === "player" && x.upg?.w1 === "eye");
  // Wingdings：Samejima Jiken
  const WING = { S: "☂", a: "♋", m: "❍", e: "♏", j: "🙰", i: "♓", J: "☺", k: "🙵", n: "■", " ": " " };
  const wing = (str) => [...str].map((c) => (WING[c] ? WING[c] + "\uFE0E" : c)).join("");      // \uFE0E：用文字樣式（黑白），不要彩色表情符號

  const C = {
    id: "youyan",
    name: "悠魘",
    letter: "悠",
    color: PINK,
    role: "中距離・魔法少女（魔力）",
    gacha: true,
    profile: "來自■■■■的魔法少女！和使魔咕哩咕妞簽訂契約後使用神奇的魔法守護愛與正義！",
    // 名牌架上，滑鼠移到簡介上才會出現（黑底紅字）
    profileHidden: "來自鮫島事件時空的少女，位於那裏的「異常現象」吃掉了她的人格，她成了某個高危異常現象的容器，她的認知被修改成了一位魔法少女，咕哩咕妞並不需要寄生在人類身上生存，只是對於一位為了虛假的幻象活著的人，感到有趣而已",
    desc: "揮動法杖的魔法少女。法陣困住敵人再噴出光束、湊滿三顆魔法結晶一起射擊；普攻也要花魔力，不夠就用生命支付。大招吸取敵人的生命變身成「魘」，所有技能大幅強化，但只能用生命支付、無法回復。",
    style: { role: "中距離・魔法少女（魔力）", text: "用法陣把敵人關起來、等光束噴發的魔法少女。法陣裡的敵人走不出來，但我方也打不到裡面，要算好時機；魔法結晶湊滿三顆就一起射出。魔力不夠時會用生命支付。大招吸取敵人的生命變身，變身後的技能強得多，代價是只能用生命、無法回復。" },
    stats: { hp: 80, mp: 110, atk: 15, df: 3, spd: 11, ap: 6 },     // 暫定
    growth: { hp: 3.4, mp: 3.5, atk: 0.9, df: 0.25, spd: 0.1 },
    mpRegen: 0.25,
    field: {
      basicRange: 120,
      // 探索技能：使魔咕哩咕妞在耳邊說話，察覺附近的魔物和陷阱
      q: { name: "使魔的耳語", type: "sense", sound: SND.magic, cd: 25, charge: 1, radius: 480, yes: "（咕哩咕妞在耳邊竊笑）", no: "（咕哩咕妞安靜了下來）", desc: "使魔咕哩咕妞在耳邊說話，察覺周遭有沒有陷阱或魔物" },
    },
    // 個性台詞（使用者提供）：每個事件的 lines，chance＝說出來的機率。lines 空著＝不說話
    barks: {
      staff: { chance: 0.3, lines: ["我會打敗你！"] },
      circle: { chance: 0.7, lines: ["這就是愛的力量！"] },
      trapped: { chance: 0.5, lines: ["這就是身為邪惡的存在的下場！"] },
      circleBreak: { chance: 0.8, lines: ["這是沒用的，趕緊投降吧！"] },
      beam: { chance: 0.7, lines: ["這招如何啊！"] },
      shots: { chance: 0.6, lines: ["發射！"] },
      devote: { chance: 0.4, lines: ["為了世界的和平，這樣的犧牲我也在所不惜！"] },
      hurt: { chance: 0.3, lines: ["哎呀!"] },
      // 變身：先說一串亂碼，馬賽克蓋上來時，台詞也跟著變成「■■■■■■■■」
      // （chance 大於 1＝一定說，而且蓋得掉 2.5 秒內的上一句）
      dream: { chance: 1, lines: ["％何＊儺＠考！皆"] },
      dreamMosaic: { chance: 1.01, lines: ["■■■■■■■■"] },
      morph: { chance: 1.02, lines: ["擊潰邪惡的存在...僅此而已..."] },
      revert: { chance: 1.03, lines: ["哎呀...我恍神了..."] },
      yanStaff: { chance: 0.3, lines: ["受死吧"] },
      yanCircle: { chance: 0.7, lines: ["即便如此，這也是正義之舉。"] },
      yanTrapped: { chance: 0.5, lines: ["看阿，我是正義...是愛與正義的化身。"] },
      yanCircleBreak: { chance: 0.8, lines: ["別想掙扎！"] },
      yanBeam: { chance: 0.7, lines: ["感受到了吧，愛和友情噴發的力量！"] },
      yanShots: { chance: 0.6, lines: ["迸發...為正義犧牲吧！"] },
      noHeal: { chance: 0.6, lines: ["我...我正在成為一位英雄...這就足夠了..."] },
      yanHurt: { chance: 0.3, lines: ["我從來不會畏懼...因為我要守護這個世界！"] },
    },
    basic: "staff",
    ultimate: "dream",
    hud: { left: "circle", center: "dream", right: "crystal" },

    passive: {
      get name() { return yan(R.getBattle?.()?.player) ? "人格抽離" : "為愛奉獻"; },
      desc: "普攻也花魔力；魔力不夠時用同樣多的生命支付（最多用到剩一半生命）。變身成魘之後：只用生命支付、無法回復生命，生命耗盡就變回一半生命的悠",
      floor: 0.5,                      // 為愛奉獻：用生命支付時，最多用到剩下這個比例
      status(b, u) {
        if (yan(u)) return { text: "魘：只用生命支付・無法回復生命・生命耗盡變回悠", on: true };
        return { text: `魔力不夠時用生命支付（最多用到剩 ${Math.round(this.floor * 100)}%）`, on: u.mp < 10 };
      },
    },

    upgrades: {
      q: {
        skill: "circle",
        tiers: [
          [
            { id: "sturdy", name: "加固法陣", desc: "法陣的耐久 ×1.6" },
            { id: "wide", name: "擴大法陣", desc: "法陣的半徑 ×1.25" },
          ],
          [
            { id: "burst", name: "聖光爆發", desc: "法陣噴出的光束傷害 ×1.35" },
            { id: "chain", name: "反撲法陣", desc: "法陣被打壞時，噴出的光束不會變弱" },
          ],
        ],
      },
      e: {
        skill: "crystal",
        tiers: [
          [
            { id: "sharp", name: "鋒利結晶", desc: "結晶射擊的傷害 ×1.3" },
            { id: "twin", name: "雙生結晶", desc: "每次做出兩顆結晶" },
          ],
          [
            { id: "spread", name: "分散射擊", desc: "三顆結晶分別射向最近的三個敵人（不夠三個就重複）" },
            { id: "guard", name: "結晶護盾", desc: "每做出一顆結晶，得到 4 點護盾" },
          ],
        ],
      },
      w: {
        skill: "dream",
        tiers: [
          [
            { id: "eye", name: "奧秘之瞳", desc: "悠魘的部分技能特效太過獵奇——改用簡化的和諧特效（場上所有的悠魘都會用和諧特效）" },
            { id: "morph", name: "夢想變身", desc: "變身時多 2 點行動值；變回悠時生命補滿，但這場戰鬥的最大生命少掉 25%（會累積）。一場戰鬥最多只能用三次" },
            { id: "guri", name: "咕哩咕妞", desc: "吸完血不會變成魘，而是變成巨大的咕哩咕妞（不可操作）。動畫結束後消耗所有生命，對全地圖的敵人造成巨大傷害，然後變回悠" },
            { id: "mine", name: "我的夢想", desc: "變身後再被粉紅色的星星罩住，變成在兩個樣子之間閃爍的型態（其實還是魘）；每次用技能，身邊都會炸開一圈粉紅星星，打到周圍的敵人" },
          ],
        ],
      },
    },

    tune: [
      ["每回合回復魔力（比例）", "char", "mpRegen", 0, 1, 0.05],
      ["為愛奉獻 生命下限（比例）", "passive", "floor", 0, 0.9, 0.05],
      ["揮動法杖 魔力", "staff", "mp", 0, 30, 1],
      ["揮動法杖 每下基礎", "staff", "base", 0, 30, 0.5],
      ["魔導法陣 魔力", "circle", "mp", 0, 80, 1],
      ["魔導法陣 半徑", "circle", "radius", 50, 250, 5],
      ["魔導法陣 光束基礎", "circle", "beam", 1, 60, 1],
      ["魔法結晶 魔力", "crystal", "mp", 0, 60, 1],
      ["魔法結晶 每顆基礎", "crystal", "base", 1, 40, 1],
      ["夢想變身 每下吸取基礎", "dream", "base", 1, 30, 1],
    ],

    // ===== 型態、支付 =====
    init(b, u) { u.state.form = "you"; u.name = "悠"; u.state.crystals = 0; u.state.dreamUses = 0; CALM = calmOf(b); },
    // 角色方塊的樣子：魘＝紅底、灰色的「魘」字
    barkKey(b, u, key) { return yan(u) && key === "hurt" ? "yanHurt" : key; },
    look(b, u) {
      if (u.state.guriUntil > now()) return { letter: "咕", fill: "#e8262c", color: "#8a0f14", ink: "#1d1d1f" };
      if (!yan(u) || u.state.morphAt > now()) return null;                          // 變身動畫播完才換樣子
      // 我的夢想：在悠和魘兩個樣子之間閃爍切換（其實還是魘）
      if (upg(u).w1 === "mine" && Math.floor(now() / 380) % 2) return { letter: "悠", fill: "#ffe0f0", color: PINK, ink: PINK };
      return { letter: "魘", fill: "#e8262c", color: "#8a0f14", ink: "#5a5a5a" };
    },
    // 技能要付多少：悠＝魔力（不夠就用生命，最多用到剩一半）；魘＝只用生命
    cost(b, u, base, yanHp) {
      if (yan(u)) {
        const hp = Math.max(1, Math.round(yanHp));
        return { ok: true, mp: 0, hp, note: `${hp} 生命` };
      }
      if (!base) return { ok: true, mp: 0, hp: 0 };
      if (u.mp >= base) return { ok: true, mp: base, hp: 0, note: `${base} MP` };
      const floor = Math.ceil(u.maxHp * this.passive.floor);
      if (u.hp - base >= floor) return { ok: true, mp: 0, hp: base, note: `${base} 生命` };
      return { ok: false, mp: base, hp: base, note: `${base} MP`, reason: `魔力不夠，生命也不夠（為愛奉獻最多用到剩 ${Math.round(this.passive.floor * 100)}% 生命）` };
    },
    pay(b, u, c, what) {
      if (!c.hp) return;
      u.hp = Math.max(0, u.hp - c.hp);
      b.say(`${u.name} 用 ${c.hp} 點生命支付${what}${yan(u) ? "" : "（為愛奉獻）"}`);
      b.emit({ type: "damage", unit: u, amount: c.hp, text: `-${c.hp} 生命` });
      if (!yan(u)) b.bark(u, "devote", 0.3);
      if (u.hp <= 0) this.onLethal(b, u);
    },
    // 生命歸零：魘會變回一半生命的悠（悠就是真的倒下）
    onLethal(b, u) {
      if (!yan(u)) return false;
      u.state.form = "you"; u.name = "悠";
      if (upg(u).w1 === "morph") {
        // 夢想變身：變回悠時補滿生命，但這場戰鬥的最大生命永久少掉原本的 25%（用三次只剩 25%）
        u.state.baseMaxHp = u.state.baseMaxHp || u.maxHp;
        u.maxHp = Math.max(1, Math.round(u.maxHp - u.state.baseMaxHp * 0.25));
        u.hp = u.maxHp;
        b.say(`魘的生命耗盡了……變回了悠（生命補滿，但最大生命剩 ${u.maxHp}）`);
        b.emit({ type: "buff", unit: u, text: "最大生命 −25%", color: RED });
      } else {
        u.hp = Math.max(1, Math.round(u.maxHp * 0.5));
        b.say("魘的生命耗盡了……變回了悠（生命剩一半）");
      }
      b.emit({ type: "yyRevert", unit: u });
      b.emit({ type: "buff", unit: u, text: "變回悠", color: PINK });
      b.emit({ type: "sfx", sound: SND.magic });
      b.bark(u, "revert", 0.4);
      return true;
    },
    // 魘：無法接受任何回復
    noHeal(b, u) { const no = u === b.player && yan(u); if (no) b.bark(u, "noHeal", 0.3); return no; },
    // 打不到法陣裡的敵人：我方的攻擊打在法陣上（法陣被打壞就噴出較弱的光束）
    // 變身成魘以後，行動不會替大招充能
    noCharge(b, u) { return yan(u); },
    intercept(b, src, dst, base, mult) {
      if (dst.team !== "enemy" || !src || src.team !== "player") return false;
      const z = b.zones.find((q) => q.type === "yyCircle" && q.trapped.includes(dst.id));
      if (!z) return false;
      const n = Math.max(1, Math.round(b.cfg.damage(base, src.atk || 0, 0) * (mult || 1)));
      b.emit({ type: "miss", x: dst.x, y: dst.y, text: "法陣擋下" });
      this.hurtCircle(b, z, n, "（我方的攻擊打在法陣上）");
      return true;
    },
    hurtCircle(b, z, n, why) {
      if (z.broken) return;
      z.hp = Math.max(0, z.hp - n);
      b.emit({ type: "miss", x: z.x, y: z.y - z.r * 0.4, text: `-${n} 法陣` });
      if (z.hp <= 0) { z.broken = true; b.bark(b.player, z.yan ? "yanCircleBreak" : "circleBreak"); b.say(`${z.yan ? "血肉囚牢" : "魔導法陣"}被打壞了${why}——光束提早噴了出來！`); this.erupt(b, z, true); }
    },
    // 光束：向上噴發，打中法陣範圍裡的敵人
    erupt(b, z, early) {
      const u = b.player, sk = this.skills.circle, up = upg(u);
      b.zones = b.zones.filter((q) => q !== z);
      const k = (early && up.q2 !== "chain" ? 0.55 : 1) * (up.q2 === "burst" ? 1.35 : 1);
      const base = (z.yan ? sk.yanBeam + u.atk * 0.95 : sk.beam + u.atk * 0.45) * k;
      b.emit({ type: "sfx", sound: SND.beam });
      if (z.yan) b.emit({ type: "sfx", sound: SND.flesh });
      if (!early) b.bark(u, z.yan ? "yanBeam" : "beam");
      b.emit({ type: "yyBeam", x: z.x, y: z.y, r: z.r, yan: z.yan, weak: early && up.q2 !== "chain" });
      const name = z.yan ? "血肉囚牢" : "魔導法陣";
      for (const e of b.targetsFor(u)) if (e.alive && R.dist(e.x, e.y, z.x, z.y) <= z.r + e.r * 0.5) b.damage(u, e, base, 1, `（${name}的光束${early ? "・提早噴發" : ""}）`);
    },
    // 被關在法陣裡的敵人走不出去：被推回法陣裡，順便撞法陣
    onEnemyAction(b, e, from) {
      if (!from || !e.alive) return;
      for (const z of b.zones) {
        if (z.type !== "yyCircle" || !z.trapped.includes(e.id)) continue;
        const d = R.dist(e.x, e.y, z.x, z.y);
        if (d + e.r <= z.r + 1) continue;
        const a = Math.atan2(e.y - z.y, e.x - z.x), keep = Math.max(0, z.r - e.r - 2);
        const at = { x: e.x, y: e.y };
        e.x = z.x + Math.cos(a) * Math.min(d, keep); e.y = z.y + Math.sin(a) * Math.min(d, keep);
        b.emit({ type: "leap", unit: e, from: at, to: { x: e.x, y: e.y }, duration: 0.2, height: 0 });
        b.say(`${e.name} 撞上了${z.yan ? "血肉囚牢" : "魔導法陣"}，走不出去！`);
        b.bark(b.player, z.yan ? "yanTrapped" : "trapped");
        this.hurtCircle(b, z, Math.max(3, Math.round(e.atk || 6)), `（${e.name}撞破的）`);
      }
    },
    onTurnStart(b, unit) {
      if (unit !== b.player) return;
      // 上回合放的法陣：向上噴出光束
      for (const z of b.zones.filter((q) => q.type === "yyCircle" && q.round < b.round)) this.erupt(b, z, false);
    },
    outgoingMult(b, src) { return null; },
    // 我的夢想：魘每次用技能，身邊炸開一圈粉紅星星（打到周圍的敵人）
    onAction(b, u, id) {
      if (!yan(u) || upg(u).w1 !== "mine" || id === "dream" || id === "move") return;
      const r = 130;
      b.emit({ type: "yyStarRing", x: u.x, y: u.y, r });
      for (const e of b.targetsFor(u)) if (e.alive && R.dist(e.x, e.y, u.x, u.y) <= r + e.r) b.damage(u, e, 4 + u.atk * 0.3, 1, "（我的夢想・粉紅星星）");
    },

    skills: {
      // ---------- 普攻 揮動法杖（魘：人格抽離） ----------
      staff: {
        name: "揮動法杖", yanName: "人格抽離", slot: "普攻", key: "a", sound: SND.staff, magicSound: SND.magic,
        tags: ["melee"],
        ap: 1, mp: 5, yanHp: 4, radius: 120, halfDeg: 50, base: 2, atkScale: 0.24,      // 悠比較弱、魘比較強（拉開兩個型態的差距）
        yanRadius: 150, yanHalfDeg: 65, yanBase: 6, yanScale: 0.65,
        desc: "揮動法杖，打到前方短距離扇形裡的敵人（也要花魔力；魘：人格抽離，範圍更大、傷害更高，花生命）",
        sec(u, arg) { const d = dirOf(u, arg), y = yan(u); return { x: u.x, y: u.y, ang: d.ang, half: (y ? this.yanHalfDeg : this.halfDeg) * DEG, radius: y ? this.yanRadius : this.radius }; },
        status(b, u) {
          const c = C.cost(b, u, this.mp, this.yanHp), y = yan(u), r = y ? this.yanRadius : this.radius;
          if (!c.ok) return { ready: false, cost: this.ap, mp: c.mp, label: this.name, note: c.note, reason: c.reason };
          return { ready: true, cost: this.ap, mp: c.mp, label: y ? this.yanName : this.name, note: c.note, aim: { type: "enemy", range: r, free: true, sector: { radius: r, half: (y ? this.yanHalfDeg : this.halfDeg) * DEG } } };
        },
        predict(b, u, arg) {
          const t = arg.target;
          if (t && (!t.alive || t.team === u.team)) err("請點選一個敵人");
          const s = this.sec(u, arg);
          return b.targetsFor(u).filter((e) => R.geo.inSector(e.x, e.y, s, e.r));
        },
        preview(b, u, arg) { const s = this.sec(u, arg); return { shapes: [{ shape: "sector", ...s }], hits: this.predict(b, u, arg) }; },
        use(b, u, arg) {
          const c = C.cost(b, u, this.mp, this.yanHp), y = yan(u), s = this.sec(u, arg);
          u.facing = s.ang;
          C.pay(b, u, c, y ? "人格抽離" : "揮動法杖");
          b.say(`${u.name}「${y ? this.yanName : this.name}」`);
          b.bark(u, y ? "yanStaff" : "staff");
          b.emit({ type: "sfx", sound: y ? SND.flesh : this.sound });
          b.emit({ type: "yySwing", x: u.x, y: u.y, ang: s.ang, half: s.half, radius: s.radius, yan: y });
          const hits = b.targetsFor(u).filter((e) => R.geo.inSector(e.x, e.y, s, e.r));
          if (!hits.length) b.emit({ type: "miss", x: u.x + Math.cos(s.ang) * s.radius * 0.7, y: u.y + Math.sin(s.ang) * s.radius * 0.7 });
          for (const e of hits) b.damage(u, e, y ? this.yanBase + u.atk * this.yanScale : this.base + u.atk * this.atkScale);
        },
      },

      // ---------- Q 魔導法陣（魘：血肉囚牢） ----------
      circle: {
        name: "魔導法陣", yanName: "血肉囚牢", slot: "Q", key: "q", sound: SND.magic,
        tags: ["area"],
        ap: 1, mp: 25, yanHp: 14, cooldown: 3, range: 380, radius: 110, yanRadius: 140, hp: 30, yanHpWall: 50, beam: 14, yanBeam: 34,
        desc: "在指定位置創造法陣：整個被關在裡面的敵人走不出去，但我方也打不到裡面的敵人（攻擊會打在法陣上）。下次輪到自己時，法陣向上噴出光束；法陣被打壞會提早噴出較弱的光束",
        r(u) { return (yan(u) ? this.yanRadius : this.radius) * (upg(u).q1 === "wide" ? 1.25 : 1); },
        status(b, u) {
          const c = C.cost(b, u, this.mp, this.yanHp), cd = u.cd.circle || 0, label = yan(u) ? this.yanName : this.name;
          if (cd > 0) return { ready: false, cost: this.ap, mp: c.mp, label, note: `CD ${cd}`, reason: `冷卻中（還要 ${cd} 次行動）` };
          if (!c.ok) return { ready: false, cost: this.ap, mp: c.mp, label, note: c.note, reason: c.reason };
          return { ready: true, cost: this.ap, mp: c.mp, label, note: c.note, aim: { type: "point", range: this.range, radius: this.r(u) } };
        },
        inside(b, u, p) { const r = this.r(u); return b.targetsFor(u).filter((e) => e.alive && R.dist(e.x, e.y, p.x, p.y) + e.r <= r); },
        predict(b, u, arg) { return this.inside(b, u, arg); },
        preview(b, u, arg) { return { shapes: [{ shape: "circle", x: arg.x, y: arg.y, radius: this.r(u), color: yan(u) ? RED : PINK }], hits: this.inside(b, u, arg) }; },
        areaCenter(b, u, arg) { return { x: arg.x, y: arg.y }; },
        use(b, u, arg) {
          if (!Number.isFinite(arg?.x)) err("請點選位置");
          const c = C.cost(b, u, this.mp, this.yanHp), y = yan(u), r = this.r(u), trapped = this.inside(b, u, arg);
          C.pay(b, u, c, y ? "血肉囚牢" : "魔導法陣");
          b.setCooldown(u, "circle", this.cooldown);
          const hp = Math.round(((y ? this.yanHpWall : this.hp) + u.atk * (y ? 2 : 1.5)) * (upg(u).q1 === "sturdy" ? 1.6 : 1));
          b.zones.push({ id: "yc" + Math.random().toString(36).slice(2, 7), type: "yyCircle", owner: u, x: arg.x, y: arg.y, r, hp, maxHp: hp, yan: y, round: b.round, turnsLeft: 99, trapped: trapped.map((e) => e.id), born: now() });
          b.emit({ type: "sfx", sound: y ? SND.grow : this.sound });
          b.bark(u, y ? "yanCircle" : "circle");
          b.say(`${u.name}「${y ? this.yanName : this.name}」${trapped.length ? `：關住了 ${trapped.map((e) => e.name).join("、")}` : "（裡面沒有敵人）"}`);
          for (const e of trapped) b.emit({ type: "buff", unit: e, text: y ? "囚禁" : "困住", color: y ? RED : PINK });
        },
      },

      // ---------- E 魔法結晶（魘：詭異血繭） ----------
      crystal: {
        name: "魔法結晶", yanName: "詭異血繭", slot: "E", key: "e", sound: SND.magic,
        tags: ["projectile"],
        ap: 1, mp: 15, yanHp: 8, base: 5, atkScale: 0.16, yanBase: 15, yanScale: 0.5, need: 3,          // 三顆一起射：悠每顆約 6、魘每顆約 18
        desc: "做出一顆魔法結晶，湊滿三顆就一起射向最近的敵人（魘：詭異血繭，傷害更高）",
        status(b, u) {
          const c = C.cost(b, u, this.mp, this.yanHp), n = u.state.crystals || 0, label = yan(u) ? this.yanName : this.name;
          if (!c.ok) return { ready: false, cost: this.ap, mp: c.mp, label, note: c.note, reason: c.reason };
          return { ready: true, cost: this.ap, mp: c.mp, label, note: `${n}/${this.need}・${c.note || ""}`, aim: { type: "none" } };
        },
        predict(b, u) { return (u.state.crystals || 0) + (upg(u).e1 === "twin" ? 2 : 1) >= this.need ? this.targets(b, u) : []; },
        preview(b, u) { return { shapes: [{ shape: "circle", x: u.x, y: u.y, radius: u.r + 24, color: yan(u) ? RED : PINK }], hits: this.predict(b, u) }; },
        targets(b, u) {
          const foes = b.targetsFor(u).filter((e) => e.alive).sort((a, c) => R.dist(a.x, a.y, u.x, u.y) - R.dist(c.x, c.y, u.x, u.y));
          if (!foes.length) return [];
          return upg(u).e2 === "spread" ? [0, 1, 2].map((i) => foes[i % foes.length]) : [foes[0], foes[0], foes[0]];
        },
        use(b, u) {
          const c = C.cost(b, u, this.mp, this.yanHp), y = yan(u), add = upg(u).e1 === "twin" ? 2 : 1;
          C.pay(b, u, c, y ? "詭異血繭" : "魔法結晶");
          u.state.crystals = (u.state.crystals || 0) + add;
          b.emit({ type: "sfx", sound: y ? SND.grow : this.sound });
          if (upg(u).e2 === "guard") b.addShield(u, 4 * add, "（結晶護盾）");
          b.say(`${u.name}「${y ? this.yanName : this.name}」（${Math.min(u.state.crystals, this.need)} / ${this.need}）`);
          if (u.state.crystals < this.need) return;
          // 湊滿三顆：一起射向最近的敵人
          u.state.crystals = 0;
          const ts = this.targets(b, u);
          if (!ts.length) { b.say("……沒有敵人，結晶碎掉了"); return; }
          const base = (y ? this.yanBase + u.atk * this.yanScale : this.base + u.atk * this.atkScale) * (upg(u).e1 === "sharp" ? 1.3 : 1);
          b.emit({ type: "sfx", sound: SND.shot });
          b.bark(u, y ? "yanShots" : "shots");
          b.emit({ type: "yyShots", x: u.x, y: u.y, to: ts.map((e) => ({ x: e.x, y: e.y })), yan: y });
          ts.forEach((e, i) => { b.hitDelay = 0.15 + i * 0.12; if (e.alive) b.damage(u, e, base, 1, `（${y ? "血繭" : "結晶"}・第 ${i + 1} 顆）`); });
          b.hitDelay = 0;
        },
      },

      // ---------- W 夢想變身（隱藏名：攝食至死） ----------
      dream: {
        name: "夢想變身", hiddenName: "攝食至死", slot: "W", key: "w", ultimate: true, sound: SND.tentacle,
        tags: ["melee"],
        ap: 2, charge: 10, range: 380, base: 6, atkScale: 0.3, ticks: 10,
        desc: "伸出觸手吸取指定的敵人：造成多少傷害就回復多少生命，回到滿血或回復了一半生命就變身成「魘」（所有技能換成隱藏名、大幅強化；只用生命支付、無法回復；生命耗盡變回悠）。魘型態不能使用",
        status(b, u) {
          if (yan(u)) return { ready: false, cost: this.ap, label: this.hiddenName, note: "魘", reason: "魘型態不能使用大招" };
          if (upg(u).w1 === "morph" && (u.state.dreamUses || 0) >= 3) return { ready: false, cost: this.ap, label: this.name, note: "3/3", reason: "夢想變身一場最多用三次" };
          if (u.charge < this.charge) return { ready: false, cost: this.ap, label: this.name, note: `${u.charge}/${this.charge}`, reason: `還要 ${this.charge - u.charge} 次行動才能使用` };
          return { ready: true, cost: this.ap, label: this.name, aim: { type: "enemy", range: this.range } };
        },
        predict(b, u, arg) {
          const t = arg.target;
          if (!t || !t.alive || t.team === u.team) err("請點選一個敵人");
          if (b.reach(u, t) > this.range) err("距離太遠");
          return [t];
        },
        preview(b, u, arg) { const t = arg.target; return { shapes: t ? [{ shape: "line", x1: u.x, y1: u.y, x2: t.x, y2: t.y, width: 14 }] : [], hits: t ? [t] : [] }; },
        use(b, u, arg) {
          let t = arg.target;
          u.charge = 0;
          b.say(`${u.name}：「夢想變身」！`);
          b.bark(u, "dream");
          b.emit({ type: "sfx", sound: this.sound });
          const want = u.maxHp * 0.5, gain = 1, W = upg(u).w1;
          u.state.dreamUses = (u.state.dreamUses || 0) + 1;
          let healed = 0, i = 0;
          const path = [];
          for (; i < this.ticks; i++) {
            if (!t?.alive) {
              t = b.targetsFor(u).filter((e) => e.alive && b.reach(u, e) <= this.range).sort((a, c) => R.dist(a.x, a.y, u.x, u.y) - R.dist(c.x, c.y, u.x, u.y))[0];
              if (!t) break;
            }
            path.push({ x: t.x, y: t.y });
            b.hitDelay = 0.3 + i * 0.16;
            const n = b.damage(u, t, this.base + u.atk * this.atkScale, 1, `（觸手・第 ${i + 1} 下）`);
            const got = b.heal(u, Math.round(n * gain), "（觸手吸取）");
            healed += got;
            if (healed >= want || u.hp >= u.maxHp) { i++; break; }
          }
          b.hitDelay = 0;
          b.emit({ type: "yyTentacle", x: u.x, y: u.y, path, ticks: Math.max(1, i) });
          const delay = 0.3 + Math.max(1, i) * 0.16;
          // 咕哩咕妞：變成巨大的咕哩咕妞（不可操作）→ 黑屏 → 消耗所有生命打全地圖 → 變回悠
          if (W === "guri") return this.guri(b, u, delay);
          // 變身：真身 → 黑色馬賽克 → 魘
          u.state.form = "yan"; u.name = "魘";
          u.state.morphAt = now() + delay * 1000;
          b.emit({ type: "yyMorph", unit: u, delay });
          b.emit({ type: "sfx", sound: SND.grow, delay: delay * 0.6 });
          b.bark(u, "dreamMosaic", delay + 0.9);       // 馬賽克蓋上來的時候
          b.bark(u, "morph", delay + 2.1);
          b.say("……變身。");
          b.emit({ type: "buff", unit: u, text: "魘", color: RED });
          if (W === "morph") { u.ap += 2; b.emit({ type: "buff", unit: u, text: "行動值 +2", color: PINK }); b.say(`夢想變身：多 2 點行動值（這場還能用 ${3 - u.state.dreamUses} 次）`); }
          if (W === "mine") { b.emit({ type: "yyStars", unit: u, delay: delay + 2 }); u.state.morphAt = now() + (delay + 2.6) * 1000; }
        },
        // 咕哩咕妞：全螢幕演出（約 5.5 秒，不可操作），結束時消耗所有生命，對全地圖的敵人造成巨大傷害
        guri(b, u, delay) {
          const D = 5.6, total = delay + D;
          u.state.guriUntil = now() + total * 1000;
          b.lockUntil = now() + total * 1000;
          b.emit({ type: "yyGuri", unit: u, delay, dur: D });
          b.emit({ type: "sfx", sound: SND.grow, delay });
          b.emit({ type: "sfx", sound: SND.flesh, delay: delay + 1.2 });
          b.say("……咕哩咕妞。");
          const spent = u.hp, foes = b.targetsFor(u).filter((e) => e.alive);
          b.hitDelay = total;
          for (const e of foes) b.damage(u, e, spent * 1.4 + u.atk * 2, 1, `（咕哩咕妞・消耗 ${spent} 生命）`);
          b.hitDelay = 0;
          setTimeout(() => {
            if (b.phase === "over" || !u.alive) return;
            u.state.form = "you"; u.name = "悠";
            u.hp = Math.max(1, Math.round(u.maxHp * 0.5));
            b.say(`咕哩咕妞消耗了所有生命（${spent}），變回了悠（生命剩一半）`);
            b.emit({ type: "damage", unit: u, amount: spent, text: `-${spent} 生命` });
            b.emit({ type: "yyRevert", unit: u });
            b.emit();
          }, total * 1000);
        },
      },
    },

    // ===== 畫面 =====
    fxEvents: {
      yySwing: () => 360, yyBeam: (ev) => (ev.weak ? 700 : 1000), yyShots: () => 600,
      yyTentacle: (ev) => 300 + ev.ticks * 160 + 300, yyMorph: () => 2000, yyRevert: () => 900,
      yyStars: () => 900, yyStarRing: () => 600, yyGuri: (ev) => ev.dur * 1000,
    },
    drawFx(ctx, ev, k, t, H) {
      switch (ev.type) {
        case "yySwing": {
          // 悠：粉紅色的弧光和星星；魘：一道帶著血管的肉色弧
          const a0 = ev.ang - ev.half, a1 = ev.ang - ev.half + ev.half * 2 * Math.min(1, k * 1.4);
          ctx.globalAlpha = 1 - k * 0.7;
          ctx.strokeStyle = ev.yan ? "rgba(160,10,30,.8)" : "rgba(212,20,122,.75)"; ctx.lineWidth = ev.yan ? 16 : 10;
          ctx.beginPath(); ctx.arc(ev.x, ev.y, ev.radius * 0.8, a0, a1); ctx.stroke();
          if (ev.yan && CALM) for (let i = 0; i < 5; i++) { const a = a0 + (a1 - a0) * ((i + 0.5) / 5), r = ev.radius * (0.6 + 0.1 * (i % 3)); star(ctx, ev.x + Math.cos(a) * r, ev.y + Math.sin(a) * r, 5, "#ff9a9a"); }
          else if (ev.yan) { ctx.strokeStyle = "rgba(90,0,10,.8)"; ctx.lineWidth = 2; for (let i = 0; i < 6; i++) { const a = a0 + (a1 - a0) * (i / 6), r = ev.radius * 0.8; ctx.beginPath(); ctx.moveTo(ev.x + Math.cos(a) * (r - 8), ev.y + Math.sin(a) * (r - 8)); ctx.quadraticCurveTo(ev.x + Math.cos(a + 0.05) * r, ev.y + Math.sin(a + 0.05) * r, ev.x + Math.cos(a + 0.1) * (r + 9), ev.y + Math.sin(a + 0.1) * (r + 9)); ctx.stroke(); } }
          else for (let i = 0; i < 5; i++) { const a = a0 + (a1 - a0) * ((i + 0.5) / 5), r = ev.radius * (0.6 + 0.1 * (i % 3)); star(ctx, ev.x + Math.cos(a) * r, ev.y + Math.sin(a) * r, 5 + (i % 2) * 2, "#ffd6ec"); }
          // 法杖
          const sa = a1, sl = ev.radius * 0.75;
          ctx.globalAlpha = 1 - k * 0.5; ctx.strokeStyle = ev.yan ? "#7a0010" : "#8a1a5a"; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(ev.x, ev.y); ctx.lineTo(ev.x + Math.cos(sa) * sl, ev.y + Math.sin(sa) * sl); ctx.stroke();
          ctx.fillStyle = ev.yan ? "#c40a1e" : "#ff8ac4"; ctx.beginPath(); ctx.arc(ev.x + Math.cos(sa) * sl, ev.y + Math.sin(sa) * sl, 7, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case "yyBeam": {
          // 向上噴發的光束（魘：血柱）
          const w = ev.r * (ev.weak ? 0.55 : 0.85) * (k < 0.2 ? k / 0.2 : 1 - Math.max(0, k - 0.6) / 0.4), top = ev.y - 520;
          const g = ctx.createLinearGradient(0, top, 0, ev.y);
          if (ev.yan) { g.addColorStop(0, "rgba(120,0,15,0)"); g.addColorStop(0.5, "rgba(196,10,30,.8)"); g.addColorStop(1, "rgba(120,0,15,.9)"); }
          else { g.addColorStop(0, "rgba(255,200,230,0)"); g.addColorStop(0.5, "rgba(255,140,200,.75)"); g.addColorStop(1, "rgba(255,255,255,.95)"); }
          ctx.fillStyle = g; ctx.fillRect(ev.x - w, top, w * 2, ev.y - top);
          ctx.globalAlpha = 1 - k; H.circle(ev.x, ev.y, ev.r * (0.8 + k * 0.5), ev.yan ? RED : PINK, null, 4);
          for (let i = 0; i < 8; i++) {
            const q = (k * 1.6 + i / 8) % 1, x = ev.x + Math.sin(i * 2.3) * w * 0.8, y = ev.y - q * 480;
            if (ev.yan && CALM) star(ctx, x, y, 5, "#ffb0b0");
            else if (ev.yan) { ctx.fillStyle = "rgba(140,0,20,.85)"; ctx.beginPath(); ctx.arc(x, y, 5 + (i % 3) * 2, 0, Math.PI * 2); ctx.fill(); }
            else star(ctx, x, y, 5, "#fff");
          }
          break;
        }
        case "yyShots": {
          ev.to.forEach((p, i) => {
            const q = Math.min(1, Math.max(0, (k - i * 0.15) / 0.45)), x = ev.x + (p.x - ev.x) * q, y = ev.y + (p.y - ev.y) * q;
            if (q <= 0 || q >= 1) return;
            ctx.globalAlpha = 1;
            if (ev.yan && !CALM) drawCocoon(ctx, x, y, 9, t); else drawCrystal(ctx, x, y, 10, Math.atan2(p.y - ev.y, p.x - ev.x), ev.yan);
          });
          break;
        }
        case "yyTentacle": {
          // 觸手：紅色的柄上纏著一條彎曲的觸手，尖端捲成漩渦（照設定圖）
          const q = Math.min(1, k * 2.2), p = ev.path[Math.min(ev.path.length - 1, Math.floor(k * ev.path.length))] || ev.path[0];
          if (!p) break;
          const L = Math.hypot(p.x - ev.x, p.y - ev.y) * Math.min(1, q), a = Math.atan2(p.y - ev.y, p.x - ev.x);
          ctx.save(); ctx.translate(ev.x, ev.y); ctx.rotate(a); ctx.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1;
          if (CALM) {
            // 和諧：一條紅色的光帶，尖端一顆光點
            ctx.strokeStyle = "rgba(232,38,44,.35)"; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.stroke();
            ctx.strokeStyle = "#ffb0b0"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.stroke();
            star(ctx, L, 0, 9, "#fff"); ctx.restore(); break;
          }
          ctx.strokeStyle = "#c40a1e"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.stroke();
          ctx.strokeStyle = "#e8262c"; ctx.lineWidth = 3.5; ctx.beginPath();
          for (let x = 0; x <= L; x += 4) { const y = Math.sin(x / 14 + t / 90) * 9; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
          ctx.stroke();
          ctx.strokeStyle = "#8a0f14"; ctx.lineWidth = 3; ctx.beginPath();
          for (let i = 0; i < 26; i++) { const aa = i * 0.45 + t / 120, rr = 2 + i * 0.45; i ? ctx.lineTo(L + Math.cos(aa) * rr, Math.sin(aa) * rr) : ctx.moveTo(L, 0); }
          ctx.stroke(); ctx.restore();
          break;
        }
        case "yyMorph": {
          // 0～0.45：一瞬間露出真身（紅色的肉球、一隻流著黑淚的眼睛、紅色的觸絲）
          // 0.45～0.85：被抖動的黑色馬賽克蓋住；0.85～1：閃一下，變成魘
          const u = ev.unit, p = H.pos ? H.pos(u) : u;
          if (CALM) {
            // 和諧：被一顆紅色的光球罩住變身
            const r = 18 + Math.min(1, k / 0.3) * 40 + Math.sin(t / 90) * 3;
            ctx.globalAlpha = k > 0.85 ? 1 - (k - 0.85) / 0.15 : 1;
            const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, r);
            g.addColorStop(0, "rgba(255,240,240,1)"); g.addColorStop(0.45, "rgba(232,38,44,.95)"); g.addColorStop(1, "rgba(196,10,30,0)");
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
            break;
          }
          if (k < 0.45) { ctx.globalAlpha = Math.min(1, k / 0.08); drawTrueForm(ctx, p.x, p.y, 1 + k * 0.4, t); }
          else if (k < 0.85) {
            ctx.globalAlpha = 1;
            drawTrueForm(ctx, p.x, p.y, 1.18, t);
            const s = 9, n = 9, cover = Math.min(1, (k - 0.45) / 0.12);
            for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
              if (((i * 7 + j * 13) % 10) / 10 > cover) continue;
              const jx = (Math.random() - 0.5) * 4, jy = (Math.random() - 0.5) * 4, g = Math.floor(Math.random() * 40);
              ctx.fillStyle = `rgb(${g},${g},${g})`; ctx.fillRect(p.x - (n * s) / 2 + i * s + jx, p.y - (n * s) / 2 + j * s + jy, s + 1, s + 1);
            }
          } else { ctx.globalAlpha = 1 - (k - 0.85) / 0.15; H.circle(p.x, p.y, 40 + (k - 0.85) * 300, "#1d1d1f", "rgba(196,10,30,.25)", 4); }
          break;
        }
        case "yyStars": {
          // 我的夢想：粉紅色的星星罩住（往內收）
          const u = ev.unit, p = H.pos ? H.pos(u) : u;
          ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
          if (k < 0.5) { ctx.fillStyle = `rgba(255,200,230,${0.6 * (1 - k * 2) + 0.3})`; ctx.beginPath(); ctx.arc(p.x, p.y, 34, 0, Math.PI * 2); ctx.fill(); }
          for (let i = 0; i < 18; i++) { const a = i * 0.349 + k * 5, rr = (1 - k) * 90 + 14 + (i % 3) * 6; star(ctx, p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr, 5 + (i % 2) * 3, i % 2 ? "#ff8ac4" : "#ffd6ec"); }
          break;
        }
        case "yyStarRing": {
          // 我的夢想：每個魔法附帶的一圈粉紅星星
          const rr = ev.r * (0.3 + k * 0.7);
          ctx.globalAlpha = 1 - k;
          H.circle(ev.x, ev.y, rr, "rgba(255,138,196,.8)", "rgba(255,200,230,.12)", 2);
          for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2 + k * 1.5; star(ctx, ev.x + Math.cos(a) * rr, ev.y + Math.sin(a) * rr, 6, i % 2 ? PINK : "#ff8ac4"); }
          break;
        }
        case "yyGuri": {
          // 咕哩咕妞：巨大的咕哩咕妞 → 全螢幕抖動的黑色馬賽克 → 黑屏、抖動的紅字 Samejima Jiken（不時閃成 Wingdings）
          // 和諧：直接轉黑、只有抖動的紅字
          const u = ev.unit, p = H.pos ? H.pos(u) : u, cv = ctx.canvas, W = cv.width, Hh = cv.height;
          const grow = CALM ? 0 : 0.22, cover = CALM ? 0.1 : 0.16;
          if (k < grow + cover && !CALM) { ctx.globalAlpha = Math.min(1, k / 0.05); drawGiantGuri(ctx, p.x, p.y - 40, 0.6 + Math.min(1, k / grow) * 2.6, t); }
          ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
          const fade = k > 0.93 ? (1 - k) / 0.07 : 1;
          if (k >= grow) {
            const c = Math.min(1, (k - grow) / cover);
            if (!CALM && c < 1) {
              // 抖動的黑色馬賽克，從咕哩咕妞的位置往外蓋滿整個螢幕
              const s = Math.max(24, Math.round(W / 34));
              for (let x = 0; x < W; x += s) for (let y = 0; y < Hh; y += s) {
                if (((((x / s) * 73856093) ^ ((y / s) * 19349663)) >>> 0) % 100 / 100 > c * 1.05) continue;
                const g = Math.floor(Math.random() * 45);
                ctx.fillStyle = `rgb(${g},${g},${g})`; ctx.fillRect(x + (Math.random() - 0.5) * 6, y + (Math.random() - 0.5) * 6, s + 2, s + 2);
              }
            } else {
              ctx.globalAlpha = fade * (CALM ? Math.min(1, c) : 1);
              ctx.fillStyle = "#050505"; ctx.fillRect(0, 0, W, Hh);
              if (!CALM) for (let i = 0; i < 60; i++) { const g = Math.floor(Math.random() * 30), s = W / 34; ctx.fillStyle = `rgb(${g},${g},${g})`; ctx.fillRect(Math.random() * W, Math.random() * Hh, s, s); }
              // 抖動的紅字
              const sz = Math.round(W / 14), wingNow = Math.floor(t / 110) % 9 === 0 || Math.floor(t / 70) % 23 === 0;
              ctx.textAlign = "center"; ctx.textBaseline = "middle";
              ctx.font = `bold ${sz}px ${wingNow ? '"Wingdings", "Segoe UI Symbol", "Noto Sans Symbols 2", serif' : '"Times New Roman", serif'}`;
              const txt = wingNow ? wing("Samejima Jiken") : "Samejima Jiken";
              const jx = (Math.random() - 0.5) * sz * 0.12, jy = (Math.random() - 0.5) * sz * 0.12;
              if (!CALM) { ctx.fillStyle = "rgba(120,0,10,.6)"; ctx.fillText(txt, W / 2 + jx * 2.5, Hh / 2 + jy * 2.5); }
              ctx.fillStyle = "#d0101c"; ctx.fillText(txt, W / 2 + jx, Hh / 2 + jy);
            }
          }
          ctx.restore();
          break;
        }
        case "yyRevert": {
          const u = ev.unit;
          ctx.globalAlpha = 1 - k; H.circle(u.x, u.y, 30 + k * 60, PINK, "rgba(255,180,220,.25)", 3);
          for (let i = 0; i < 8; i++) { const a = i * 0.785 + k * 2; star(ctx, u.x + Math.cos(a) * (24 + k * 50), u.y + Math.sin(a) * (24 + k * 50), 6, "#ff8ac4"); }
          break;
        }
      }
    },
    drawBattle(ctx, t, b, H) {
      const u = b.player;
      CALM = calmOf(b);
      // 法陣
      for (const z of b.zones) {
        if (z.type !== "yyCircle") continue;
        const appear = Math.min(1, (t - z.born) / 400);
        ctx.save(); ctx.globalAlpha = appear;
        if (z.yan && CALM) {
          // 和諧：紅色的法陣
          ctx.fillStyle = "rgba(196,10,30,.1)"; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = RED; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.stroke();
          ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * 0.82, 0, Math.PI * 2); ctx.stroke();
          for (let i = 0; i < 12; i++) { const a = t / 1600 + (i / 12) * Math.PI * 2; star(ctx, z.x + Math.cos(a) * z.r * 0.91, z.y + Math.sin(a) * z.r * 0.91, 3, RED); }
        } else if (z.yan) {
          // 血肉囚牢：肉色的地面＋一根一根向內彎的肋骨
          ctx.fillStyle = "rgba(150,10,25,.18)"; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "#8a0f14"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.stroke();
          const n = 14, pul = Math.sin(t / 260) * 3;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2, x0 = z.x + Math.cos(a) * z.r, y0 = z.y + Math.sin(a) * z.r;
            ctx.strokeStyle = "#e8d6c8"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x0, y0);
            ctx.quadraticCurveTo(z.x + Math.cos(a + 0.25) * (z.r + 18 + pul), z.y + Math.sin(a + 0.25) * (z.r + 18 + pul) - 20, z.x + Math.cos(a + 0.35) * (z.r - 16), z.y + Math.sin(a + 0.35) * (z.r - 16) - 26);
            ctx.stroke();
          }
        } else {
          // 魔導法陣：兩圈洋紅色的圓、轉動的六芒星和符文
          ctx.fillStyle = "rgba(212,20,122,.08)"; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = PINK; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.stroke();
          ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * 0.82, 0, Math.PI * 2); ctx.stroke();
          const rot = t / 2400;
          for (const off of [0, Math.PI / 3]) { ctx.beginPath(); for (let i = 0; i <= 3; i++) { const a = rot + off + (i / 3) * Math.PI * 2, x = z.x + Math.cos(a) * z.r * 0.8, y = z.y + Math.sin(a) * z.r * 0.8; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
          for (let i = 0; i < 12; i++) { const a = -rot * 1.5 + (i / 12) * Math.PI * 2; star(ctx, z.x + Math.cos(a) * z.r * 0.91, z.y + Math.sin(a) * z.r * 0.91, 3, PINK); }
        }
        // 耐久
        const w = 60, by = z.y + z.r + 10;
        ctx.globalAlpha = appear; ctx.fillStyle = "rgba(29,29,31,.2)"; ctx.fillRect(z.x - w / 2, by, w, 5);
        ctx.fillStyle = z.yan ? RED : PINK; ctx.fillRect(z.x - w / 2, by, (w * z.hp) / z.maxHp, 5);
        H.label(`${z.yan ? "血肉囚牢" : "魔導法陣"} ${z.hp}／下回合噴發`, z.x, by + 14, z.yan ? "#8a0f14" : PINK, 10);
        ctx.restore();
      }
      // 身邊的結晶（魘：血繭）
      const n = Math.min(3, u.state.crystals || 0);
      if (n && u.alive) {
        const p = H.pos ? H.pos(u) : u;
        for (let i = 0; i < n; i++) {
          const a = t / 700 + (i / 3) * Math.PI * 2, x = p.x + Math.cos(a) * 36, y = p.y + Math.sin(a) * 26 - 6;
          if (yan(u) && !CALM) drawCocoon(ctx, x, y, 8, t); else drawCrystal(ctx, x, y, 8, a, yan(u));
        }
      }
    },
  };

  // ---------- 畫圖 ----------
  function star(ctx, x, y, r, col) {
    ctx.save(); ctx.fillStyle = col; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, rr = i % 2 ? r * 0.35 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function drawCrystal(ctx, x, y, r, a, red) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = red ? "rgba(232,60,60,.9)" : "rgba(255,150,210,.9)"; ctx.strokeStyle = red ? RED : PINK; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(r * 1.3, 0); ctx.lineTo(0, -r * 0.7); ctx.lineTo(-r, 0); ctx.lineTo(0, r * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.beginPath(); ctx.moveTo(r * 0.5, -r * 0.15); ctx.lineTo(0, -r * 0.45); ctx.lineTo(-r * 0.2, -r * 0.1); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawCocoon(ctx, x, y, r, t) {
    const p = 1 + Math.sin(t / 180 + x) * 0.08;
    ctx.save(); ctx.translate(x, y); ctx.scale(p, 1 / p);
    ctx.fillStyle = "#a0081a"; ctx.strokeStyle = "#5a0008"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.8, r * 1.15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "rgba(255,120,120,.6)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.6); ctx.quadraticCurveTo(r * 0.3, -r * 0.1, -r * 0.2, r * 0.7); ctx.stroke();
    ctx.restore();
  }
  // 真身：一團紅色的肉球、中間一隻流著黑淚的眼睛、往外伸的紅色觸絲（照設定圖）
  function drawTrueForm(ctx, x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = "#e8262c"; ctx.lineWidth = 2.5;
    for (const [a, l] of [[-2.4, 46], [-0.6, 52], [0.9, 50], [2.2, 44], [1.6, 58]]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(Math.cos(a) * l * 0.4 + 10, Math.sin(a) * l * 0.4, Math.cos(a + 0.5) * l * 0.8, Math.sin(a + 0.5) * l * 0.8, Math.cos(a) * l + Math.sin(t / 200) * 3, Math.sin(a) * l); ctx.stroke(); }
    const balls = [[-18, -22, 13], [6, -27, 12], [22, -12, 15], [-25, -2, 12], [24, 10, 13], [-14, 18, 14], [10, 22, 15], [-2, -4, 16]];
    for (const [bx, by, br] of balls) {
      const g = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.3, 1, bx, by, br);
      g.addColorStop(0, "#e8262c"); g.addColorStop(1, "#a0081a");
      ctx.fillStyle = g; ctx.strokeStyle = "#7a0010"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(bx, by + Math.sin(t / 240 + bx) * 1.2, br, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(0, -6, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#7a0010"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = "#1d1d1f"; ctx.beginPath(); ctx.arc(0, -6, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, 24); ctx.stroke();      // 黑色的淚
    ctx.restore();
  }

  // 巨大的咕哩咕妞：一團長著眼睛的紅色肉球、往外伸的觸手手臂、中間一隻流著黑淚的大眼睛（照設定圖）
  function drawGiantGuri(ctx, x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // 觸手手臂（尖端捲起來）
    ctx.strokeStyle = "#c40a1e"; ctx.lineCap = "round";
    for (const [a, l] of [[-2.7, 70], [-2.0, 62], [-0.5, 66], [0.3, 72], [2.5, 60], [0.95, 58], [1.9, 64], [-1.2, 56]]) {
      const w = Math.sin(t / 260 + a * 3) * 6;
      ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 0);
      const ex = Math.cos(a) * l + w, ey = Math.sin(a) * l - w * 0.5;
      ctx.bezierCurveTo(Math.cos(a - 0.4) * l * 0.5, Math.sin(a - 0.4) * l * 0.5, Math.cos(a + 0.35) * l * 0.85, Math.sin(a + 0.35) * l * 0.85, ex, ey); ctx.stroke();
      ctx.lineWidth = 3; ctx.beginPath();
      for (let i = 0; i < 14; i++) { const aa = a + i * 0.5, rr = 9 - i * 0.6; i ? ctx.lineTo(ex + Math.cos(aa) * rr, ey + Math.sin(aa) * rr) : ctx.moveTo(ex + Math.cos(aa) * rr, ey + Math.sin(aa) * rr); }
      ctx.stroke();
    }
    // 長著眼睛的肉球
    const balls = [[-26, -30, 14], [0, -38, 13], [26, -26, 15], [-38, -4, 13], [38, 0, 14], [-28, 24, 15], [0, 34, 14], [28, 26, 14], [-12, -16, 12], [14, 12, 12]];
    for (const [bx, by, br] of balls) {
      const yy = by + Math.sin(t / 220 + bx) * 1.5;
      const g = ctx.createRadialGradient(bx - br * 0.3, yy - br * 0.3, 1, bx, yy, br);
      g.addColorStop(0, "#f03a3a"); g.addColorStop(1, "#9a0818");
      ctx.fillStyle = g; ctx.strokeStyle = "#6a000c"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(bx, yy, br, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      const la = Math.atan2(-by, -bx) + Math.sin(t / 500 + bx) * 0.6;
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(bx, yy, br * 0.45, br * 0.32, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1d1d1f"; ctx.beginPath(); ctx.arc(bx + Math.cos(la) * br * 0.18, yy + Math.sin(la) * br * 0.1, br * 0.16, 0, Math.PI * 2); ctx.fill();
    }
    // 中間的大眼睛和黑色的淚
    ctx.fillStyle = "#b00c1e"; ctx.beginPath(); ctx.arc(0, -2, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(0, -4, 16, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#6a000c"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#1d1d1f"; ctx.beginPath(); ctx.arc(Math.sin(t / 400) * 4, -4, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(0, 6); ctx.quadraticCurveTo(3, 30, -1, 56 + Math.sin(t / 300) * 3); ctx.stroke();
    ctx.restore();
  }

  R.CHARACTERS[C.id] = C;
})();
