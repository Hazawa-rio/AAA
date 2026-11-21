/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/characters/phantom.js": "20261122024623" });
// 角色：魅影（卡池角色・怪盜・近戰突進）
// 本名不詳，以「魅影」為代號的怪盜。利用穿梭時空的能力來往各個時空盜竊（簡介是使用者寫的）
// 被動「掠奪本能」：每件寶物（寶物欄）讓造成的傷害 +6%；無法接受任何來自隊友給予的道具（連線時：隊友不能從背包給她東西）
// 普攻「匕首刺擊」：用短刀向前突刺（細長的矩形）
// Q「怪盜勾爪」：朝一個方向射出勾爪——勾到敵人或地圖場景（障礙物、場地邊緣）就把自己拉過去；
//   勾到隊友：偷走對方的一個小技能（Q 或 E），下一次按 Q＝不花行動點地放一次（連線之後才會有隊友）
// E「魅影敬上」：射出一張犯罪預告信，打中的第一個單位——敵人：被預告（受到的所有攻擊傷害變多）；
//   隊友：被預告而防備魅影，移動範圍變大
// W「夜幕降臨」：甩動披風隱藏自己，突進到一個敵人身邊揮出 X 形斬擊；有幾件寶物就追擊幾次，每一斬都向周圍噴出財寶
// 大招強化（二選一）：
//   豐厚戰果：隱形後不突進，向一個方向甩動披風，財寶像海浪一樣持續潑灑（寶物越多灑越久）；所有財寶只打中同一個敵人＝對單補正
//   清晨終幕：隱身連斬（1＋寶物數，最多 7），每一斬穿過目標、沿路炸開名字煙火 P・H・A・N・T・O・M；最後一斬一定是大大的 M
// 財寶的樣子（使用者的設計圖）：水晶項鍊、鈔票、金幣、紅色鑽石；煙火＝字母在中間、一圈尾端帶圓點的放射線
// 數值都是暫定；個性台詞之後由使用者提供；音效暫用現有的
(function () {
  const R = window.RPG;
  R.CHARACTERS = R.CHARACTERS || {};
  const err = (m) => { throw new R.ActionError(m); };
  const DEG = Math.PI / 180;
  const upg = (u) => u.upg || {};
  const now = () => performance.now();
  const dirOf = (u, arg) => {
    const t = arg.target ? arg.target : arg;
    if (!t || !Number.isFinite(t.x)) err("請點選方向");
    const L = Math.hypot(t.x - u.x, t.y - u.y);
    if (L < 1) err("請點選方向");
    return { dx: (t.x - u.x) / L, dy: (t.y - u.y) / L, ang: Math.atan2(t.y - u.y, t.x - u.x) };
  };
  const heavy = (e) => e.def.boss || e.def.bigBar || e.def.trial || e.part || e.def.block;
  const SND = { stab: "sounds/ilshu-thrust.mp3", hook: "sounds/marika-whip.mp3", card: "sounds/vivilla-throw.mp3", cloak: "sounds/firsler-smoke.mp3", slash: "sounds/pirate-slash.mp3", coin: "sounds/phantom-coin-short.mp3", coinLong: "sounds/phantom-coin.mp3", firework: "sounds/phantom-firework.mp3", tighten: "sounds/rope-tighten.mp3" };   // tighten：勾爪勾到東西、拉緊繩索（尼龍束帶的聲音）
  // 財寶的種類（使用者的設計圖）：水晶項鍊、鈔票、金幣、紅色鑽石
  const LOOT = ["coin", "necklace", "ruby", "bill", "coin", "ruby"];
  // 名字煙火：P 紅、H 藍、A 綠、N 橘、T 紫、O 粉、M 黃
  const FW = { P: "#e8262c", H: "#1a9ee0", A: "#2aaa4a", N: "#f58220", T: "#9a4aa8", O: "#f5a8c8", M: "#f2d81e" };
  const COL = "#8a1a4a", GOLD = "#f2c14e";
  const loot = (u) => Math.min(6, (u.items || []).length);          // 寶物數量（寶物欄最多 6 格）
  // 隊友：連線時的其他玩家角色、我方的召喚物、要保護的東西
  const alliesOf = (b, u) => b.units.filter((x) => x.alive && x !== u && (x.team === "player" || x.team === "ally" || x.summon));
  const isPlayerChar = (x) => x.team === "player" && x.def?.skills && x.def.hud;

  const C = {
    id: "phantom",
    name: "魅影",
    letter: "影",
    color: COL,
    role: "近戰・怪盜（寶物）",
    gacha: true,
    noGifts: true,            // 掠奪本能：不接受隊友給的道具（連線時背包「給予」要擋掉）
    profile: "本名不詳，以魅影為代號的怪盜，利用穿梭時空的能力來往各個時空盜竊，在許多時空掀起軒然大波。對她而言，這只是在實現作為寶物獵人對珍寶進行狩獵的生物本能，並沒有任何的過錯，而是沒有本事把握住自己珍貴事物的人應該負被盜竊的責任。",
    desc: "以魅影為代號的怪盜。寶物越多傷害越高；用勾爪把自己拉到敵人或牆邊、對敵人寄出犯罪預告，最後甩動披風隱身突進，一邊斬擊一邊噴出財寶。",
    style: { role: "近戰・怪盜（寶物）", text: "寶物越多越強的怪盜：每件寶物讓傷害 +6%，夜幕降臨的追擊次數也照寶物數量算。怪盜勾爪把自己拉到敵人身邊、或拉到牆邊脫身；魅影敬上的預告信讓敵人受到的傷害變多。不接受隊友給的道具——想要的東西，她自己偷。" },
    stats: { hp: 84, mp: 40, atk: 15, df: 3, spd: 12, ap: 6 },      // 暫定
    growth: { hp: 4, mp: 1, atk: 0.9, df: 0.3, spd: 0.1 },
    mpRegen: 0,
    field: {
      basicRange: 110,
      // 探索技能：射出勾爪把自己拉過去（可以越過矮牆）
      q: { name: "怪盜勾爪", type: "jet", sound: SND.hook, cd: 18, dist: 200, desc: "朝指定方向射出勾爪，把自己拉過去（可以越過矮牆）" },
    },
    // 個性台詞（使用者提供；lines 是空的就不會說話）
    barks: {
      stab: { chance: 0.3, lines: [] },
      hook: { chance: 0.5, lines: [] },
      steal: { chance: 1, lines: [] },
      notice: { chance: 0.7, lines: [] },
      ult: { chance: 0.95, lines: [] },
      hurt: { chance: 0.3, lines: [] },
    },
    basic: "stab",
    ultimate: "nightfall",
    hud: { left: "grapple", center: "nightfall", right: "notice" },

    passive: {
      name: "掠奪本能",
      desc: "每件寶物（寶物欄）讓造成的傷害 +6%（最多 6 件＝+36%）。無法接受任何來自隊友給予的道具",
      per: 0.06,
      status(b, u) { const n = loot(u); return { text: `寶物 ${n} 件・傷害 +${Math.round(n * C.passive.per * 100)}%`, on: n > 0 }; },
    },

    upgrades: {
      q: {
        skill: "grapple",
        tiers: [
          [
            { id: "longline", name: "長索", desc: "怪盜勾爪的射程 ×1.4" },
            { id: "pick", name: "順手牽羊", desc: "勾到敵人時順手摸走它的東西：那個敵人虛弱 1 回合（造成的傷害 ×0.75）" },
          ],
          [
            { id: "kick", name: "飛身踢", desc: "被勾爪拉到敵人身邊時，順勢把它踢開" },
            { id: "spare", name: "游刃有餘", desc: "勾爪勾到東西（敵人、隊友、場景）時，退還 1 行動點" },
          ],
        ],
      },
      e: {
        skill: "notice",
        tiers: [
          [
            { id: "twin", name: "雙重預告", desc: "多射出一張預告信，寄給離第一個目標最近的另一個敵人" },
            { id: "declare", name: "宣戰", desc: "預告持續 2 回合，被預告的敵人受到的傷害 ×1.35（原本 ×1.25）" },
          ],
          [
            { id: "panic", name: "恐慌", desc: "被預告的敵人下一回合少 1 行動點" },
            { id: "done", name: "預告達成", desc: "被預告的敵人倒下時，大招充能 +2，在自己的回合還會退還 1 行動點" },
          ],
        ],
      },
      w: {
        skill: "nightfall",
        tiers: [
          [
            { id: "spoils", name: "豐厚戰果", desc: "甩動披風隱形後不突進，而是向一個方向再次甩動披風，財寶像海浪一樣持續潑灑出去——寶物越多灑得越久；所有財寶只打中一個目標時，有對單補正傷害（×1.6）" },
            { id: "dawn", name: "清晨終幕", desc: "隱身連斬（1＋寶物數，最多 7 次），每一斬都穿越目標、沿路炸開名字煙火 P・H・A・N・T・O・M（第幾斬就放幾朵）；最後一斬一定是 M：更大的煙火、更高的傷害" },
          ],
        ],
      },
    },

    // ===== 掠奪本能：寶物越多傷害越高 =====
    outgoingMult(b, src, dst) {
      // 命路「今日祕寶」：標記了目標，這一回合只能對目標造成傷害
      const tr = src.state?.treasure;
      if (tr && tr.alive && dst && dst !== tr && dst.team === "enemy") return { mult: 0, note: "（今日祕寶：只能傷害目標）" };
      const n = loot(src);
      return n ? { mult: 1 + n * C.passive.per, note: `（掠奪本能 +${Math.round(n * C.passive.per * 100)}%）` } : null;
    },
    // 被預告的隊友：防備魅影而提速（到期就恢復）；被預告的敵人：恐慌
    onTurnStart(b, unit) {
      // 今日祕寶：到魅影自己的下一個回合就解除
      if (unit === b.player && unit.state.treasure) { const x = unit.state.treasure; if (x.state) x.state.rooted = false; unit.state.treasure = null; }
      for (const x of b.units) if (x.state?.waryUntil && x.state.waryUntil < b.round) { x.state.waryUntil = 0; x.state.speedBoost = 0; }
    },
    // 預告達成：被預告的敵人倒下
    onUnitDeath(b, e) {
      const u = b.player;
      if (e.team !== "enemy" || !R.upHas(upg(u), "done") || !(e.state.noticedBy === u && e.state.flawUntil >= b.round)) return;
      const need = u.def.skills.nightfall.charge, before = u.charge;
      u.charge = Math.min(need, u.charge + 2);
      let t = `預告達成！充能 +${u.charge - before}`;
      if (b.phase === "player" && b.current === u) { u.ap += 1; t += "・行動點 +1"; }
      b.say(`${e.name} 被預告之後倒下了——${t}`);
      b.emit({ type: "buff", unit: u, text: "預告達成", color: COL });
    },
    // 隱身中（大招的披風）：畫面不畫自己
    hideUnit(b, u, t) { return u === b.player && C._hide && t < C._hide.until && t > C._hide.from; },

    tune: [
      ["掠奪本能 每件寶物增傷", "passive", "per", 0, 0.2, 0.01],
      ["匕首刺擊 基礎", "stab", "base", 0, 40, 1],
      ["匕首刺擊 長度", "stab", "length", 60, 240, 5],
      ["怪盜勾爪 射程", "grapple", "range", 120, 600, 10],
      ["怪盜勾爪 勾到敵人的傷害", "grapple", "base", 0, 30, 1],
      ["魅影敬上 基礎", "notice", "base", 0, 30, 1],
      ["魅影敬上 預告倍率", "notice", "mark", 1, 2, 0.05],
      ["夜幕降臨 X 斬擊 基礎", "nightfall", "base", 0, 60, 1],
      ["夜幕降臨 追擊 基礎", "nightfall", "chase", 0, 40, 1],
      ["夜幕降臨 噴出財寶 基礎", "nightfall", "spray", 0, 30, 1],
      ["豐厚戰果 每枚財寶", "nightfall", "coin", 0, 20, 1],
      ["豐厚戰果 每件寶物多灑幾秒", "nightfall", "wavePer", 0, 1, 0.05],
      ["清晨終幕 每一斬", "nightfall", "dawnSlash", 0, 30, 1],
      ["清晨終幕 沿路煙火", "nightfall", "dawnBlast", 0, 20, 1],
      ["清晨終幕 最後的 M 斬擊", "nightfall", "finalBase", 0, 60, 1],
      ["清晨終幕 M 煙火", "nightfall", "finalBlast", 0, 40, 1],
    ],

    skills: {
      // ---------- 普攻 匕首刺擊 ----------
      stab: {
        name: "匕首刺擊", slot: "普攻", key: "a", sound: SND.stab,
        tags: ["melee"],
        ap: 1, length: 115, width: 46, base: 12,
        desc: "用短刀向前突刺，打到前方細長範圍裡的敵人",
        shape(u, arg) { const d = dirOf(u, arg); return { shape: "rect", x: u.x + d.dx * u.r * 0.4, y: u.y + d.dy * u.r * 0.4, ang: d.ang, length: this.length, width: this.width }; },
        status() { return { ready: true, cost: this.ap, label: this.name, aim: { type: "enemy", range: this.length + 10, free: true } }; },
        predict(b, u, arg) {
          const t = arg.target;
          if (t && (!t.alive || t.team === u.team)) err("請點選一個敵人");
          const s = this.shape(u, arg);
          return b.targetsFor(u).filter((e) => R.geo.inRect(e.x, e.y, s, e.r));
        },
        preview(b, u, arg) { return { shapes: [this.shape(u, arg)], hits: this.predict(b, u, arg) }; },
        use(b, u, arg) {
          const s = this.shape(u, arg), hits = this.predict(b, u, arg);
          u.facing = s.ang;
          b.say(`${u.name}「匕首刺擊」`);
          b.bark(u, "stab");
          b.emit({ type: "sfx", sound: this.sound });
          b.emit({ type: "myStab", x: u.x, y: u.y, ang: s.ang, length: this.length });
          if (!hits.length) { b.say("……刺空了"); b.emit({ type: "miss", x: u.x + Math.cos(s.ang) * this.length * 0.7, y: u.y + Math.sin(s.ang) * this.length * 0.7 }); return; }
          for (const e of hits) b.damage(u, e, this.base);
        },
      },

      // ---------- Q 怪盜勾爪（偷到技能時：放一次偷來的技能） ----------
      grapple: {
        name: "怪盜勾爪", slot: "Q", key: "q", sound: SND.hook,
        tags: ["melee"],
        ap: 1, cooldown: 2, range: 300, base: 6, kick: 80,
        desc: "朝一個方向射出勾爪：勾到敵人或地圖場景（障礙物、場地邊緣）就把自己拉過去；勾到隊友可以偷走對方的一個小技能，下一次按 Q 不花行動點地放一次",
        rng(u) { return this.range * (R.upHas(upg(u), "longline") ? 1.4 : 1); },
        // 偷來的技能（{ charId, id }）
        stolen(u) { const s = u.state.stolen; const sk = s && R.CHARACTERS[s.charId]?.skills?.[s.id]; return sk || null; },
        // 勾爪的路徑：第一個碰到的東西（敵人／隊友／場景），以及自己會停在哪裡
        path(b, u, arg) {
          const d = dirOf(u, arg), L = this.rng(u), A = b.cfg.arena;
          let hit = null, kind = null, t = L;
          for (const e of b.targetsFor(u)) { const h = R.geo.rayCircle(u.x, u.y, d.dx, d.dy, e.x, e.y, e.r + u.r * 0.3); if (h !== null && h > 0 && h < t) { hit = e; kind = "enemy"; t = h; } }
          for (const a of alliesOf(b, u)) { const h = R.geo.rayCircle(u.x, u.y, d.dx, d.dy, a.x, a.y, a.r + u.r * 0.3); if (h !== null && h > 0 && h < t) { hit = a; kind = "ally"; t = h; } }
          // 場景：障礙物、場地邊緣
          for (let s = 8; s <= t; s += 6) {
            const x = u.x + d.dx * s, y = u.y + d.dy * s;
            if (x < 4 || y < 4 || x > A.w - 4 || y > A.h - 4 || b.obstacleAt({ ...u, r: 2 }, x, y)) { hit = null; kind = "wall"; t = s; break; }
          }
          // 停的位置：碰到的東西前面（一路往前走到第一個站不下的地方）
          const end = kind === "wall" ? t : kind ? Math.max(0, t - u.r * 0.7 - 4) : 0;
          let stop = { x: u.x, y: u.y };
          for (let s = 6; s <= end; s += 6) { const x = u.x + d.dx * s, y = u.y + d.dy * s; if (b.onObstacle(u, x, y) || b.blocked(u, x, y) || x < u.r || y < u.r || x > A.w - u.r || y > A.h - u.r) break; stop = { x, y }; }
          return { d, hit, kind, tip: { x: u.x + d.dx * t, y: u.y + d.dy * t }, stop };
        },
        status(b, u) {
          const sk = this.stolen(u);
          if (sk) {
            let st = {};
            try { st = sk.status(b, u) || {}; } catch (e) { st = {}; }
            return { ready: true, cost: 0, label: `偷來的「${sk.name}」`, note: "免費一次", aim: st.aim || { type: "none" } };
          }
          const cd = u.cd.grapple || 0;
          if (cd > 0) return { ready: false, cost: this.ap, label: this.name, note: `CD ${cd}`, reason: `冷卻中（還要 ${cd} 次行動）` };
          return { ready: true, cost: this.ap, label: this.name, aim: { type: "direction", range: this.rng(u) } };
        },
        predict(b, u, arg, st) {
          const sk = this.stolen(u);
          if (sk) return sk.predict ? sk.predict.call(sk, b, u, arg, st) : [];
          const p = this.path(b, u, arg); return p.kind === "enemy" ? [p.hit] : [];
        },
        preview(b, u, arg) {
          const sk = this.stolen(u);
          if (sk) return sk.preview ? sk.preview.call(sk, b, u, arg) : { shapes: [], hits: [] };
          const p = this.path(b, u, arg), L = this.rng(u);
          return { shapes: [{ shape: "line", x1: u.x, y1: u.y, x2: u.x + p.d.dx * L, y2: u.y + p.d.dy * L, width: 10, color: COL }, ...(p.kind ? [{ shape: "circle", x: p.stop.x, y: p.stop.y, radius: u.r, color: COL }] : [])], hits: p.kind === "enemy" ? [p.hit] : [] };
        },
        use(b, u, arg, st) {
          const sk = this.stolen(u);
          if (sk) return this.useStolen(b, u, arg, st, sk);
          const p = this.path(b, u, arg), from = { x: u.x, y: u.y };
          u.facing = p.d.ang;
          b.setCooldown(u, "grapple", this.cooldown);
          b.emit({ type: "sfx", sound: this.sound });
          b.emit({ type: "myHook", x1: from.x, y1: from.y, x2: p.tip.x, y2: p.tip.y, back: !p.kind });
          if (!p.kind) { b.say(`${u.name} 射出勾爪——什麼都沒勾到`); return; }
          b.bark(u, "hook", 0.2);
          if (p.kind) b.emit({ type: "sfx", sound: SND.tighten });                 // 勾到了：拉緊繩索
          if (R.dist(from.x, from.y, p.stop.x, p.stop.y) > 4) { u.x = p.stop.x; u.y = p.stop.y; b.emit({ type: "leap", unit: u, from, to: { ...p.stop }, duration: 0.25 }); b.emit({ type: "move", unit: u }); }
          if (R.upHas(upg(u), "spare")) { u.ap += 1; b.emit({ type: "buff", unit: u, text: "游刃有餘 +1", color: COL }); }
          if (p.kind === "wall") { b.say(`${u.name}「怪盜勾爪」勾住了場景，把自己拉了過去`); return; }
          const e = p.hit;
          if (p.kind === "ally") {
            b.say(`${u.name}「怪盜勾爪」勾住了 ${e.name}`);
            if (isPlayerChar(e)) this.steal(b, u, e);
            return;
          }
          b.say(`${u.name}「怪盜勾爪」勾住 ${e.name}，把自己拉了過去！`);
          b.hitDelay = 0.25;
          b.damage(u, e, this.base);
          b.hitDelay = 0;
          if (!e.alive) return;
          if (R.upHas(upg(u), "pick")) b.weaken(e, 0.75, 1, "被偷走了東西");
          if (R.upHas(upg(u), "kick") && !heavy(e)) { b.knockback(e, u.x, u.y, this.kick); b.emit({ type: "buff", unit: e, text: "飛身踢", color: COL }); }
        },
        // 勾到隊友：偷走對方的 Q 或 E（隨機一個）
        steal(b, u, ally) {
          const ids = [ally.def.hud.left, ally.def.hud.right].filter((id) => id && ally.def.skills[id] && id !== ally.def.ultimate && id !== ally.def.basic);
          if (!ids.length) return;
          const id = ids[Math.floor(Math.random() * ids.length)];
          u.state.stolen = { charId: ally.def.id, id };
          b.say(`${u.name} 從 ${ally.name} 身上偷走了「${ally.def.skills[id].name}」！（下一次按 Q 不花行動點地放一次）`);
          b.bark(u, "steal", 0.3);
          b.emit({ type: "buff", unit: u, text: `偷到「${ally.def.skills[id].name}」`, color: GOLD });
        },
        useStolen(b, u, arg, st, sk) {
          u.state.stolen = null;
          b.say(`${u.name} 用了偷來的「${sk.name}」`);
          if (sk.sound) b.emit({ type: "sfx", sound: sk.sound });
          let s2 = st;
          try { s2 = sk.status(b, u) || st; } catch (e) { s2 = st; }
          const mp = u.mp;
          try { sk.use.call(sk, b, u, arg, s2); } finally { u.mp = Math.max(u.mp, mp); }     // 不花魔力
        },
      },

      // ---------- E 魅影敬上 ----------
      notice: {
        name: "魅影敬上", slot: "E", key: "e", sound: SND.card,
        tags: ["projectile"],
        ap: 1, cooldown: 2, range: 440, base: 5, mark: 1.25, speed: 900,
        desc: "射出一張犯罪預告信，打中的第一個單位——敵人：被預告 1 回合（受到的所有攻擊傷害 ×1.25）；隊友：被預告而防備魅影，移動範圍 ×1.35",
        get projectileSpeed() { return this.speed; },
        first(b, u, d, from, skip) {
          let hit = null, t = this.range;
          for (const e of [...b.targetsFor(u), ...alliesOf(b, u)]) { if (e === skip) continue; const h = R.geo.rayCircle(from.x, from.y, d.dx, d.dy, e.x, e.y, e.r + 6); if (h !== null && h > 0 && h < t) { hit = e; t = h; } }
          for (let s = 8; s <= t; s += 8) { if (b.obstacleAt({ r: 2, def: { fly: true } }, from.x + d.dx * s, from.y + d.dy * s)) { hit = null; t = s; break; } }
          return { hit, t };
        },
        status(b, u) {
          const cd = u.cd.notice || 0;
          if (cd > 0) return { ready: false, cost: this.ap, label: this.name, note: `CD ${cd}`, reason: `冷卻中（還要 ${cd} 次行動）` };
          return { ready: true, cost: this.ap, label: this.name, aim: { type: "direction", range: this.range } };
        },
        predict(b, u, arg) { const d = dirOf(u, arg), f = this.first(b, u, d, u); return f.hit && f.hit.team === "enemy" ? [f.hit] : []; },
        preview(b, u, arg) { const d = dirOf(u, arg), f = this.first(b, u, d, u); return { shapes: [{ shape: "line", x1: u.x, y1: u.y, x2: u.x + d.dx * f.t, y2: u.y + d.dy * f.t, width: 14, color: COL }], hits: f.hit && f.hit.team === "enemy" ? [f.hit] : [] }; },
        use(b, u, arg) {
          const d = dirOf(u, arg), f = this.first(b, u, d, u);
          u.facing = d.ang;
          b.setCooldown(u, "notice", this.cooldown);
          b.say(`${u.name}「魅影敬上」——射出一張犯罪預告信`);
          b.bark(u, "notice");
          b.emit({ type: "sfx", sound: this.sound });
          const fly = f.t / this.speed;
          b.emit({ type: "myCard", x1: u.x, y1: u.y, x2: u.x + d.dx * f.t, y2: u.y + d.dy * f.t, dur: fly });
          if (!f.hit) { b.say("預告信沒有寄到任何人手上"); return; }
          this.deliver(b, u, f.hit, fly);
          // 雙重預告：再寄一張給離第一個目標最近的另一個敵人
          if (R.upHas(upg(u), "twin") && f.hit.team === "enemy") {
            const o = b.targetsFor(u).filter((e) => e !== f.hit && e.alive).sort((a, c) => R.dist(a.x, a.y, f.hit.x, f.hit.y) - R.dist(c.x, c.y, f.hit.x, f.hit.y))[0];
            if (o) {
              const L = R.dist(u.x, u.y, o.x, o.y), fly2 = L / this.speed + 0.12;
              b.emit({ type: "myCard", x1: u.x, y1: u.y, x2: o.x, y2: o.y, dur: fly2, delay: 0.12 });
              this.deliver(b, u, o, fly2);
            }
          }
        },
        deliver(b, u, x, fly) {
          if (x.team !== "enemy") {
            // 隊友：防備魅影，移動範圍變大
            x.state.speedBoost = 1.35; x.state.waryUntil = b.round + 1;
            b.say(`${x.name} 收到了犯罪預告——提防著魅影，腳步變快了`);
            b.emit({ type: "buff", unit: x, text: "防備魅影", color: COL, delay: fly });
            return;
          }
          const declare = R.upHas(upg(u), "declare");
          b.hitDelay = fly;
          b.damage(u, x, this.base, 1, "（預告信）");
          b.hitDelay = 0;
          if (!x.alive) return;
          x.state.flawUntil = b.round + (declare ? 2 : 1);
          x.state.flawMult = declare ? 1.35 : this.mark;
          x.state.flawNote = "（預告）"; x.state.flawLabel = "預告"; x.state.flawColor = COL;
          x.state.noticedBy = u;
          b.say(`${x.name} 被預告了：受到的傷害 ×${x.state.flawMult}`);
          b.emit({ type: "buff", unit: x, text: "犯罪預告", color: COL, delay: fly });
          // 命路「今日祕寶」：成為目標——地上出現魅影標誌，鎖住移動（Boss 只會變慢）
          if (R.upHas(upg(u), "ph_treasure")) {
            const old = u.state.treasure; if (old?.state) old.state.rooted = false;
            u.state.treasure = x;
            if (b.isBossUnit(x)) { x.state.slowUntil = b.round + 1; x.state.slowMult = 0.5; b.say(`今日祕寶：${x.name} 被魅影標誌盯上，腳步變慢了`); }
            else { x.state.rooted = true; b.say(`今日祕寶：${x.name} 被魅影標誌鎖住，動不了了。這一回合只能對牠造成傷害`); }
            b.emit({ type: "buff", unit: x, text: "今日祕寶", color: COL, delay: fly });
          }
          if (R.upHas(upg(u), "panic")) { x.state.apPenalty = (x.state.apPenalty || 0) + 1; b.emit({ type: "buff", unit: x, text: "恐慌：行動點 −1", color: "#7a3fb0", delay: fly }); }
        },
      },

      // ---------- W 夜幕降臨 ----------
      nightfall: {
        name: "夜幕降臨", slot: "W", key: "w", ultimate: true, sound: SND.slash,
        tags: ["melee", "area"],
        ap: 2, charge: 5, range: 380, base: 18, chase: 9, spray: 5, sprayR: 120, step: 0.2,
        coin: 5, coinHalf: 22, coinRange: 360, coinSpeed: 520, solo: 1.6, waveBase: 0.8, wavePer: 0.35, waveRate: 7,
        dawnStep: 0.32, dawnReach: 120, dawnSlash: 6, dawnBlast: 2, dawnBlastPer: 0.5, dawnR: 60, finalBase: 12, finalPer: 3, finalBlast: 8, finalBlastPer: 1, finalR: 120,
        desc: "甩動披風隱藏自己，突進到一個敵人身邊揮出 X 形斬擊；有幾件寶物就追擊幾次，每一斬都向周圍噴出財寶，打到旁邊的敵人",
        mode(u) { return upg(u).w1 || "base"; },
        status(b, u) {
          const lb = { base: this.name, spoils: "豐厚戰果", dawn: "清晨終幕" }[this.mode(u)];
          if (u.charge < this.charge) return { ready: false, cost: this.ap, label: lb, note: `${u.charge}/${this.charge}`, reason: `還要 ${this.charge - u.charge} 次行動才能使用` };
          return { ready: true, cost: this.ap, label: lb, note: `寶物 ${loot(u)}`, aim: this.mode(u) === "spoils" ? { type: "direction", range: this.coinRange } : { type: "enemy", range: this.range } };
        },
        // 突進到目標身邊（從自己這一側）
        beside(b, u, e) {
          const L = R.dist(u.x, u.y, e.x, e.y) || 1, k = e.r + u.r + 4;
          return b.landingSpot(u, e.x - ((e.x - u.x) / L) * k, e.y - ((e.y - u.y) / L) * k, { x: u.x, y: u.y });
        },
        pick(b, u, arg) {
          const e = arg.target;
          if (!e || !e.alive || e.team === u.team) err("請點選一個敵人");
          if (R.dist(u.x, u.y, e.x, e.y) > this.range + e.r) err("太遠了");
          return e;
        },
        // 豐厚戰果：像寶物海浪一樣持續潑灑——寶物越多灑越久；每一枚的方向在扇形裡來回擺動
        waveDur(u) { return this.waveBase + this.wavePer * loot(u); },
        coins(b, u, arg) {
          const d = dirOf(u, arg), dur = this.waveDur(u), n = Math.max(1, Math.round(dur * this.waveRate)), H = this.coinHalf * DEG, out = [];
          for (let i = 0; i < n; i++) {
            const a = d.ang + H * Math.sin(i * 1.13), dx = Math.cos(a), dy = Math.sin(a);
            let hit = null, t = this.coinRange;
            for (const e of b.targetsFor(u)) { const h = R.geo.rayCircle(u.x, u.y, dx, dy, e.x, e.y, e.r + 10); if (h !== null && h > 0 && h < t) { hit = e; t = h; } }
            out.push({ a, hit, t, at: (i / n) * dur, kind: LOOT[i % LOOT.length] });
          }
          return { d, dur, list: out };
        },
        // 清晨終幕：連斬的次數（1＋寶物數，最多 7＝P・H・A・N・T・O・M），最後一斬一定是 M
        dawnLetters(u) { const k = Math.min(7, 1 + loot(u)); return [..."PHANTO".slice(0, k - 1), "M"]; },
        // 第 j 個落點：繞著目標的圓上，每次跨過目標
        dawnPt(b, u, e, j, th0) {
          const rr = e.r + u.r + this.dawnReach, a = th0 + Math.PI + j * (Math.PI + 0.62), A = b.cfg.arena;
          return { x: Math.min(Math.max(e.x + Math.cos(a) * rr, u.r), A.w - u.r), y: Math.min(Math.max(e.y + Math.sin(a) * rr, u.r), A.h - u.r) };
        },
        predict(b, u, arg) {
          const m = this.mode(u);
          if (m === "spoils") return [...new Set(this.coins(b, u, arg).list.map((c) => c.hit).filter(Boolean))];
          const e = this.pick(b, u, arg);
          if (m === "dawn") return [e, ...b.targetsFor(u).filter((x) => x !== e && R.dist(x.x, x.y, e.x, e.y) <= this.finalR + x.r)];
          return [e, ...b.targetsFor(u).filter((x) => x !== e && R.dist(x.x, x.y, e.x, e.y) <= this.sprayR + x.r)];
        },
        preview(b, u, arg) {
          const m = this.mode(u);
          if (m === "spoils") {
            const c = this.coins(b, u, arg);
            return { shapes: [{ shape: "sector", x: u.x, y: u.y, ang: c.d.ang, half: this.coinHalf * DEG, radius: this.coinRange, color: GOLD }], hits: this.predict(b, u, arg) };
          }
          const e = this.pick(b, u, arg);
          return { shapes: [{ shape: "circle", x: e.x, y: e.y, radius: m === "dawn" ? this.finalR : this.sprayR, color: GOLD }], hits: this.predict(b, u, arg) };
        },
        cloak(b, u, dur) {
          const t = now();
          C._hide = { from: t + 150, until: t + dur * 1000 };
          b.emit({ type: "sfx", sound: SND.cloak });
          b.emit({ type: "myCloak", x: u.x, y: u.y });
        },
        use(b, u, arg) {
          const m = this.mode(u), n = loot(u);
          u.charge = 0;
          b.bark(u, "ult");
          if (m === "spoils") return this.spoils(b, u, arg, n);
          const e = this.pick(b, u, arg), from = { x: u.x, y: u.y };
          if (m === "dawn") return this.dawn(b, u, e, n);
          // 夜幕降臨：隱身 → 突進 → X 斬擊＋追擊（寶物數量次），每一斬都噴財寶
          b.say(`${u.name}：「夜幕降臨」——披風一甩，身影消失在夜色裡（寶物 ${n} 件＝追擊 ${n} 次）`);
          this.cloak(b, u, 0.55);
          const to = this.beside(b, u, e);
          u.facing = Math.atan2(e.y - to.y, e.x - to.x);
          u.x = to.x; u.y = to.y;
          b.emit({ type: "leap", unit: u, from, to: { ...to }, duration: 0.3 });
          b.emit({ type: "move", unit: u });
          let tgt = e, t0 = 0.55;
          for (let i = 0; i <= n; i++) {
            if (!tgt.alive) {
              // 目標倒下：換最近的敵人
              tgt = b.targetsFor(u).filter((x) => x.alive && R.dist(x.x, x.y, u.x, u.y) <= 240 + x.r).sort((a, c) => R.dist(a.x, a.y, u.x, u.y) - R.dist(c.x, c.y, u.x, u.y))[0];
              if (!tgt) break;
            }
            const at = t0 + i * this.step;
            b.emit({ type: "myX", x: tgt.x, y: tgt.y, r: tgt.r + 24, delay: at, big: i === 0 });
            b.emit({ type: "sfx", sound: SND.slash, delay: at });
            b.emit({ type: "myLoot", x: tgt.x, y: tgt.y, r: this.sprayR, delay: at + 0.05 });
            b.emit({ type: "sfx", sound: SND.coin, delay: at + 0.05 });
            b.hitDelay = at;
            b.damage(u, tgt, i === 0 ? this.base : this.chase, 1, i === 0 ? "（X 斬擊）" : `（追擊 ${i}）`);
            b.hitDelay = at + 0.08;
            for (const x of b.targetsFor(u)) if (x !== tgt && x.alive && R.dist(x.x, x.y, tgt.x, tgt.y) <= this.sprayR + x.r) b.damage(u, x, this.spray, 1, "（噴出的財寶）");
            b.hitDelay = 0;
          }
          b.lockUntil = now() + (t0 + (n + 1) * this.step + 0.4) * 1000;
        },
        // 豐厚戰果：甩動披風，財寶像海浪一樣持續潑出去
        spoils(b, u, arg, n) {
          const c = this.coins(b, u, arg), hits = [...new Set(c.list.map((x) => x.hit).filter(Boolean))], solo = hits.length === 1, T0 = 0.45;
          u.facing = c.d.ang;
          b.say(`${u.name}：「豐厚戰果」——再一次甩動披風，財寶像海浪一樣湧出（${c.dur.toFixed(1)} 秒、${c.list.length} 件）${solo ? "（全部打中同一個目標：對單補正）" : ""}`);
          this.cloak(b, u, 0.5);
          b.emit({ type: "myWave", x: u.x, y: u.y, ang: c.d.ang, half: this.coinHalf * DEG, dur: c.dur, coins: c.list.map((x) => ({ a: x.a, t: x.t, at: x.at, kind: x.kind })), delay: T0 });
          b.emit({ type: "sfx", sound: SND.coinLong, delay: T0 });
          for (let s2 = 0.9; s2 < c.dur; s2 += 0.9) b.emit({ type: "sfx", sound: SND.coin, delay: T0 + s2 });
          c.list.forEach((x) => {
            if (!x.hit?.alive) return;
            b.hitDelay = T0 + x.at + x.t / this.coinSpeed;
            b.damage(u, x.hit, this.coin, solo ? this.solo : 1, solo ? "（財寶・對單補正）" : "（財寶）");
          });
          b.hitDelay = 0;
          b.lockUntil = now() + (T0 + c.dur + this.coinRange / this.coinSpeed + 0.3) * 1000;
        },
        // 清晨終幕：隱身連斬，每一斬都跨過目標、沿路放出名字煙火；最後一斬是大大的 M
        dawn(b, u, e, n) {
          const L = this.dawnLetters(u), k = L.length, th0 = Math.atan2(u.y - e.y, u.x - e.x) - Math.PI, from = { x: u.x, y: u.y }, t0 = 0.5;
          b.say(`${u.name}：「清晨終幕」——在夜色裡連斬 ${k} 次，天空炸開了「${L.join("")}」`);
          const total = t0 + (k - 1) * this.dawnStep + 0.35;
          C._hide = { from: now() + 150, until: now() + (total + 0.15) * 1000 };
          b.emit({ type: "sfx", sound: SND.cloak });
          b.emit({ type: "myCloak", x: u.x, y: u.y });
          let p = this.dawnPt(b, u, e, -1, th0);
          for (let i = 0; i < k; i++) {
            if (!e.alive) break;
            const last = i === k - 1, q = this.dawnPt(b, u, e, i, th0), at = t0 + i * this.dawnStep + (last ? 0.15 : 0), col = FW[L[i]];
            b.emit({ type: "myDash", x1: p.x, y1: p.y, x2: q.x, y2: q.y, color: col, delay: at - 0.08 });
            b.emit({ type: "myX", x: e.x, y: e.y, r: e.r + (last ? 46 : 24), delay: at, big: last, color: col });
            b.emit({ type: "sfx", sound: SND.slash, delay: at });
            b.hitDelay = at;
            b.damage(u, e, last ? this.finalBase + this.finalPer * n : this.dawnSlash, 1, last ? "（終幕・M）" : `（連斬 ${i + 1}・${L[i]}）`);
            // 沿路的煙火：第 i 斬放 i＋1 朵（最後的 M 是一朵大的）
            const pts = [];
            if (last) pts.push({ x: e.x, y: e.y });
            else for (let j = 0; j <= i; j++) { const f = (j + 1) / (i + 2); pts.push({ x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f, d: j * 0.06 }); }
            const r = last ? this.finalR : this.dawnR, bt = at + 0.18;
            b.emit({ type: "myFirework", pts, letter: L[i], color: col, r, big: last, delay: bt });
            b.emit({ type: "sfx", sound: SND.firework, delay: bt, rate: last ? 0.85 : 1 + i * 0.04 });
            b.emit({ type: "myLoot", x: e.x, y: e.y, r: last ? 150 : 90, delay: bt + 0.05, big: last });
            if (last) { b.emit({ type: "sfx", sound: SND.coinLong, delay: bt + 0.1 }); }
            b.hitDelay = bt;
            for (const x of b.targetsFor(u)) if (x.alive && pts.some((pt) => R.dist(x.x, x.y, pt.x, pt.y) <= r + x.r)) b.damage(u, x, last ? this.finalBlast + this.finalBlastPer * n : this.dawnBlast + this.dawnBlastPer * n, 1, last ? "（M 煙火）" : `（${L[i]} 煙火）`);
            b.hitDelay = 0;
            p = q;
          }
          // 現身在最後的落點
          u.facing = Math.atan2(e.y - p.y, e.x - p.x);
          if (!b.onObstacle(u, p.x, p.y) && !b.blocked(u, p.x, p.y)) { u.x = p.x; u.y = p.y; } else { const s3 = this.beside(b, u, e); u.x = s3.x; u.y = s3.y; }
          b.emit({ type: "leap", unit: u, from, to: { x: u.x, y: u.y }, duration: 0.2 });
          b.emit({ type: "move", unit: u });
          b.lockUntil = now() + (total + 0.9) * 1000;
        },
      },
    },

    // ===== 畫面 =====
    drawFx(ctx, ev, k, t, H) {
      if (!OWN_FX[ev.type]) {
        // 偷來的技能：交給原本的角色畫
        const o = Object.values(R.CHARACTERS).find((c) => c !== C && c.fxEvents && Object.prototype.hasOwnProperty.call(c.fxEvents, ev.type));
        o?.drawFx?.(ctx, ev, k, t, H);
        return;
      }
      switch (ev.type) {
        case "myStab": {
          const L = ev.length * Math.min(1, k * 3);
          ctx.save(); ctx.translate(ev.x, ev.y); ctx.rotate(ev.ang); ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = "rgba(138,26,74,.35)"; ctx.lineWidth = 16; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(L, 0); ctx.stroke();
          ctx.fillStyle = "#e8e4ee"; ctx.strokeStyle = "#2a1020"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(L - 26, -4); ctx.lineTo(L, 0); ctx.lineTo(L - 26, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = COL; ctx.fillRect(L - 34, -6, 8, 12);
          ctx.restore();
          break;
        }
        case "myHook": {
          // 勾爪飛出去（沒勾到就收回來）
          const go = ev.back ? (k < 0.5 ? k * 2 : 2 - k * 2) : Math.min(1, k * 2.5);
          const x = ev.x1 + (ev.x2 - ev.x1) * go, y = ev.y1 + (ev.y2 - ev.y1) * go, a = Math.atan2(ev.y2 - ev.y1, ev.x2 - ev.x1);
          ctx.globalAlpha = k > 0.8 ? (1 - k) * 5 : 1;
          ctx.strokeStyle = "#3a2a30"; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
          ctx.beginPath(); ctx.moveTo(ev.x1, ev.y1); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
          ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.strokeStyle = "#c8c0d0"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(0, -7, 7, Math.PI * 0.5, Math.PI * 1.6); ctx.stroke();
          ctx.beginPath(); ctx.arc(0, 7, 7, Math.PI * 0.4, -Math.PI * 0.5, true); ctx.stroke();
          ctx.restore();
          break;
        }
        case "myCard": {
          // 犯罪預告信：一張轉著飛的卡片
          const D = ev.dur * 1000, tot = D + 500, now2 = k * tot, p = Math.min(1, now2 / D);
          const x = ev.x1 + (ev.x2 - ev.x1) * p, y = ev.y1 + (ev.y2 - ev.y1) * p;
          ctx.save(); ctx.translate(x, y); ctx.rotate(now2 / 60); ctx.globalAlpha = now2 > D ? Math.max(0, 1 - (now2 - D) / 500) : 1;
          ctx.fillStyle = "#fbf6ee"; ctx.strokeStyle = COL; ctx.lineWidth = 2;
          ctx.fillRect(-11, -7, 22, 14); ctx.strokeRect(-11, -7, 22, 14);
          ctx.fillStyle = COL; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("影", 0, 1);
          ctx.restore();
          break;
        }
        case "myCloak": {
          // 披風一甩：深紅色的布捲成一圈，再散開
          ctx.save(); ctx.translate(ev.x, ev.y); ctx.globalAlpha = 1 - k;
          for (let i = 0; i < 3; i++) {
            const r = 20 + k * 50 + i * 8, a0 = k * 6 + i * 2.1;
            ctx.strokeStyle = i % 2 ? "#2a0c1c" : COL; ctx.lineWidth = 12 - i * 3;
            ctx.beginPath(); ctx.arc(0, 0, r, a0, a0 + Math.PI * 1.3); ctx.stroke();
          }
          ctx.restore();
          break;
        }
        case "myX": {
          // X 形斬擊：兩道交叉的刀光
          const r = ev.r * (ev.big ? 1.3 : 1), p = Math.min(1, k * 4);
          ctx.save(); ctx.translate(ev.x, ev.y); ctx.globalAlpha = 1 - k; ctx.lineCap = "round";
          for (const [s, c] of [[1, "#fff"], [0.6, ev.color || COL]]) {
            ctx.strokeStyle = c; ctx.lineWidth = (ev.big ? 9 : 6) * s;
            ctx.beginPath(); ctx.moveTo(-r, -r); ctx.lineTo(-r + 2 * r * p, -r + 2 * r * p); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(r, -r); ctx.lineTo(r - 2 * r * p, -r + 2 * r * p); ctx.stroke();
          }
          ctx.restore();
          break;
        }
        case "myLoot": {
          // 噴出的財寶：水晶項鍊、鈔票、金幣、紅色鑽石，往四周拋出去再落下
          const N = ev.big ? 18 : 10, p2 = Math.min(1, k * 1.4);
          ctx.save(); ctx.translate(ev.x, ev.y); ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
          for (let i = 0; i < N; i++) {
            const a = (i / N) * Math.PI * 2 + 0.3, d = ev.r * p2 * (0.75 + (i % 3) * 0.12);
            drawLoot(ctx, LOOT[i % LOOT.length], Math.cos(a) * d, Math.sin(a) * d * 0.8 - Math.sin(p2 * Math.PI) * 34, ev.big ? 1.25 : 1, a + k * 8);
          }
          ctx.restore();
          break;
        }
        case "myWave": {
          // 豐厚戰果：披風來回甩動，財寶像海浪一樣一件一件湧出去
          const T = k * (ev.dur * 1000 + 1100) / 1000;           // 這段特效開始後過了幾秒
          ctx.save(); ctx.translate(ev.x, ev.y);
          if (T < ev.dur) {
            // 甩動的披風（扇形邊緣的深紅色布浪）
            const sw = ev.ang + ev.half * Math.sin(T * 7);
            ctx.globalAlpha = 0.75; ctx.strokeStyle = COL; ctx.lineWidth = 14; ctx.lineCap = "round";
            ctx.beginPath(); ctx.arc(0, 0, 40, sw - 0.6, sw + 0.6); ctx.stroke();
            ctx.strokeStyle = "#2a0c1c"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 52, sw - 0.45, sw + 0.45); ctx.stroke();
            ctx.globalAlpha = 1;
          }
          ev.coins.forEach((c, n) => {
            // 一件財寶旁邊還跟著兩件（只是畫面，傷害算一次）
            for (let m = 0; m < 3; m++) {
              const age = T - c.at - m * 0.05; if (age < 0) continue;
              const sp = 520 * (1 - m * 0.08), d = age * sp, end = c.t + 30; if (d > end + 30) continue;
              const off = (m - 1) * 0.07, f = Math.min(1, d / Math.max(1, c.t)), dd = Math.min(d, end);
              const x = Math.cos(c.a + off) * dd, y = Math.sin(c.a + off) * dd - Math.sin(f * Math.PI) * (18 + m * 10);
              ctx.globalAlpha = d > end ? Math.max(0, 1 - (d - end) / 30) : 1;
              drawLoot(ctx, LOOT[(n + m * 2) % LOOT.length], x, y, m ? 0.9 : 1.15, age * 10 + m);
            }
          });
          ctx.restore();
          break;
        }
        case "myDash": {
          // 隱身連斬的軌跡：一道帶顏色的殘影
          ctx.save(); ctx.globalAlpha = (1 - k) * 0.9; ctx.lineCap = "round";
          ctx.strokeStyle = ev.color; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(ev.x1, ev.y1); ctx.lineTo(ev.x2, ev.y2); ctx.stroke();
          ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ev.x1, ev.y1); ctx.lineTo(ev.x2, ev.y2); ctx.stroke();
          ctx.restore();
          break;
        }
        case "myFirework": {
          // 名字煙火：字母在中間，四周一圈尾端帶圓點的放射線（使用者的設計圖）
          const D = ev.big ? 1500 : 1000 + ev.pts.length * 60, base = ev.big ? 1500 : 1000;
          for (const p of ev.pts) { const kk = (k * D - (p.d || 0) * 1000) / base; if (kk > 0) drawBurst(ctx, p.x, p.y, ev.letter, ev.color, Math.min(1, kk), ev.big ? ev.r : ev.r * 0.8, ev.big); }
          break;
        }
      }
      ctx.globalAlpha = 1;
    },
    // 偷到技能時：頭上飄著一張小小的金色卡片
    drawBattle(ctx, t, b, H) {
      const u = b.player;
      const tr = u?.state?.treasure;
      if (tr?.alive) { const p = H.pos ? H.pos(tr) : tr; drawMark(ctx, p.x, p.y + tr.r * 0.4, tr.r + 26, t); }
      if (!u?.alive || !u.state.stolen) return;
      const p = H.pos ? H.pos(u) : u, y = p.y - u.r - 26 + Math.sin(t / 300) * 3;
      ctx.save(); ctx.fillStyle = GOLD; ctx.strokeStyle = "#7a5a10"; ctx.lineWidth = 1.5;
      ctx.fillRect(p.x - 8, y - 6, 16, 12); ctx.strokeRect(p.x - 8, y - 6, 16, 12);
      ctx.restore();
    },
  };
  // 魅影標誌（使用者的圖１）：上面一片尖角的葉子形狀，下面一顆圓點、兩道彎彎的眼睛和一個大大的笑——畫成地上的印記
  function drawMark(ctx, x, y, R0, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.55);
    ctx.globalAlpha = 0.75 + 0.2 * Math.sin(t / 260);
    ctx.strokeStyle = COL; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.fillStyle = "rgba(138,26,74,.12)"; ctx.beginPath(); ctx.arc(0, 0, R0, 0, Math.PI * 2); ctx.fill();
    const k = R0 / 100;
    ctx.beginPath();     // 葉子（尖角）
    ctx.moveTo(-8 * k, -18 * k); ctx.lineTo(-34 * k, -40 * k); ctx.quadraticCurveTo(-30 * k, -62 * k, -36 * k, -84 * k); ctx.quadraticCurveTo(-8 * k, -76 * k, 8 * k, -90 * k);
    ctx.quadraticCurveTo(16 * k, -68 * k, 36 * k, -58 * k); ctx.quadraticCurveTo(18 * k, -48 * k, 20 * k, -30 * k); ctx.moveTo(0, -18 * k); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 9 * k, 0, Math.PI * 2); ctx.stroke();                       // 圓點
    ctx.beginPath(); ctx.moveTo(-42 * k, -14 * k); ctx.quadraticCurveTo(-12 * k, -24 * k, -6 * k, -12 * k); ctx.moveTo(42 * k, -14 * k); ctx.quadraticCurveTo(12 * k, -24 * k, 6 * k, -12 * k); ctx.stroke();   // 上面兩道
    ctx.beginPath(); ctx.moveTo(-36 * k, 6 * k); ctx.quadraticCurveTo(-26 * k, 0, -14 * k, 12 * k); ctx.moveTo(36 * k, 6 * k); ctx.quadraticCurveTo(26 * k, 0, 14 * k, 12 * k); ctx.stroke();   // 眼睛
    ctx.beginPath(); ctx.moveTo(-30 * k, 26 * k); ctx.quadraticCurveTo(0, 48 * k, 34 * k, 22 * k); ctx.quadraticCurveTo(4 * k, 36 * k, -30 * k, 26 * k); ctx.stroke();       // 笑
    ctx.restore();
  }
  const OWN_FX = { myStab: () => 300, myHook: () => 500, myCard: (ev) => ev.dur * 1000 + 500, myCloak: () => 550, myX: () => 450, myLoot: (ev) => (ev.big ? 1100 : 800), myWave: (ev) => ev.dur * 1000 + 1100, myDash: () => 320, myFirework: (ev) => (ev.big ? 1500 : 1000 + ev.pts.length * 60) };

  // ===== 財寶和煙火的畫法 =====
  function drawLoot(ctx, kind, x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(Math.sin(rot) * 0.5);
    if (kind === "coin") {            // 金幣：黃色外圈、橘色的內圈和記號
      ctx.fillStyle = "#f7d21e"; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f5b21e"; ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#f07a1e"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(2, -2.5); ctx.lineTo(-2.5, 0); ctx.lineTo(2, 2.5); ctx.closePath(); ctx.stroke();
    } else if (kind === "necklace") { // 水晶項鍊：黑色鍊子＋藍色水晶，閃著光
      ctx.strokeStyle = "#1a1418"; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.ellipse(1, -8, 8, 9, 0.3, Math.PI * 0.55, Math.PI * 2.35); ctx.stroke();
      ctx.fillStyle = "#3ab0f0"; ctx.beginPath(); ctx.arc(-3, 1, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#bfe8ff"; ctx.beginPath(); ctx.arc(-4, 0, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#3ab0f0"; ctx.lineWidth = 1.2;
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.78; ctx.beginPath(); ctx.moveTo(-3 + Math.cos(a) * 5, 1 + Math.sin(a) * 5); ctx.lineTo(-3 + Math.cos(a) * 8, 1 + Math.sin(a) * 8); ctx.stroke(); }
    } else if (kind === "ruby") {     // 紅色鑽石：深紅的切面＋兩點反光
      ctx.fillStyle = "#c8141e"; ctx.beginPath(); ctx.moveTo(-6, 8); ctx.lineTo(-2, -9); ctx.lineTo(9, 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#e8262c"; ctx.beginPath(); ctx.moveTo(-2, -9); ctx.lineTo(9, 3); ctx.lineTo(2, 1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(3, -1, 1.6, 0, Math.PI * 2); ctx.arc(-1, 4, 1.2, 0, Math.PI * 2); ctx.fill();
    } else {                          // 鈔票：飄動的綠色紙鈔＋黑色的 $
      ctx.fillStyle = "#2aaa4a"; ctx.beginPath(); ctx.moveTo(-11, -4); ctx.quadraticCurveTo(-4, -9, 2, -5); ctx.quadraticCurveTo(8, -1, 11, -7); ctx.lineTo(11, 4); ctx.quadraticCurveTo(5, 9, -1, 5); ctx.quadraticCurveTo(-6, 2, -11, 7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#111"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("$", 0, 0);
    }
    ctx.restore();
  }
  // 名字煙火：先往上竄一點，炸開成一圈「線＋圓點」，字母在中間，最後慢慢落下淡出
  function drawBurst(ctx, x, y, letter, color, k, R, big) {
    const rise = Math.min(1, k * 6), open = Math.max(0, Math.min(1, (k - 0.12) * 2.6)), fade = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
    ctx.save(); ctx.translate(x, y + (1 - rise) * 30 + Math.max(0, k - 0.5) * 16);
    if (open <= 0) {                   // 還在升空：一顆亮點
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, big ? 5 : 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore(); return;
    }
    ctx.globalAlpha = fade;
    if (big) { ctx.fillStyle = color; ctx.globalAlpha = fade * 0.18 * (1 - open * 0.5); ctx.beginPath(); ctx.arc(0, 0, R * open * 1.1, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = fade; }
    const rays = big ? 16 : 9, ease = 1 - Math.pow(1 - open, 3);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineCap = "round"; ctx.lineWidth = big ? 5 : 3.5;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2 + (letter.charCodeAt(0) % 7) * 0.3, r1 = R * 0.38 * ease, r2 = R * (0.7 + (i % 2) * 0.22) * ease;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.quadraticCurveTo(Math.cos(a + 0.12) * (r1 + r2) / 2, Math.sin(a + 0.12) * (r1 + r2) / 2, Math.cos(a) * r2, Math.sin(a) * r2); ctx.stroke();
      ctx.beginPath(); ctx.arc(Math.cos(a) * r2, Math.sin(a) * r2, big ? 6 : 4, 0, Math.PI * 2); ctx.fill();
    }
    if (big) for (let i = 0; i < 24; i++) { const a = i * 0.9 + k * 3, d = R * (0.9 + (i % 4) * 0.15) * ease; ctx.globalAlpha = fade * (i % 3 ? 0.9 : 0.5); ctx.fillStyle = ["#fff", color, "#ffe9a8"][i % 3]; ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d + k * 20, 2.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = fade;
    const fs = (big ? R * 0.62 : R * 0.6) * (0.6 + 0.4 * ease);
    ctx.font = `bold ${fs}px "Comic Sans MS", "Chalkboard SE", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.strokeText(letter, 0, 2); ctx.fillStyle = color; ctx.fillText(letter, 0, 2);
    ctx.restore();
  }
  // fxEvents：自己的特效＋偷來的技能（交給原本的角色）
  C.fxEvents = new Proxy(OWN_FX, {
    get(o, k) {
      if (k in o) return o[k];
      for (const c of Object.values(R.CHARACTERS)) if (c !== C && c.fxEvents && Object.prototype.hasOwnProperty.call(c.fxEvents, k)) return c.fxEvents[k];
      return undefined;
    },
  });

  R.CHARACTERS[C.id] = C;
})();
