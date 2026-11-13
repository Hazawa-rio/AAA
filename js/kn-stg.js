/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/kn-stg.js": "20261113145157" });
// #KN59810 克亞貝魯巴斯諾的射擊小遊戲（直式捲軸）：時空裡的關卡門、酒館裡買下來的街機都用這一份
//   R.KnStg.play(env)：env = {
//     stage, ch（角色）, her（她的戰機）, host（蓋在哪個元素上，預設 body）, music（預設 sounds/bgm-kn.mp3）
//     muted(), busy(v), pauseBgm(), resumeBgm()                 // 外面的音樂：開始時暫停，結束後接回來
//     gold()／pay(n)／contCost                                     // 接關要花的金幣；沒給 gold＝免費接關（酒館的街機）
//     coinOpen()（STAGE 3 的除錯碼）, rival（??? 的分數）, best(stage)
//     errorUsed()／useError()（悠魘的 ERROR 只能用一次）, herOwned()／gainHer()（STAGE 1 的隱藏機庫）
//     tickets: { left(stage) → 還沒撿的編號, take(stage, i) }（KN59810-04 吐不出的兌換券）
//     legend（false＝關掉傳說中的隱藏關卡）, onFall（在扭曲次元墜落之後：迎戰銀河大元帥的戰機）
//     onDone(result) }  result = { clear, score, cont, miss, her, gotHer, fall }
// 操作：方向鍵／WASD 移動（Shift 慢速），自動射擊，空白鍵＝駕駛員技能（量表滿了才能用），Esc 暫停
// 駕駛員技能（照角色的大招）：弗爾斯勒＝發光的箭頭、伊爾舒＝揮砍前方（砍掉子彈）、薇薇拉＝周圍噴孢子、觀知命＝陰陽陣
//   霍夫曼＝移動時留下殘影（期間不吃子彈）、瑪莉卡＝前方火焰鞭打、蒼幽＝蝠鱝夫人、巴斯提安＝前方舉盾
//   悠魘＝觸手＋全畫面黑色抖動馬賽克、紅色 ERROR，秒殺所有敵機（這一趟只能用一次）
// 隱藏：STAGE 1 往左下角的角落一直靠 18 秒 → 隱藏的機庫，拿到「她的戰機」（殘機 10、一直往前發射雷射、沒有駕駛員；只能在 STAGE 1 用，不算排行榜）
// 傳說中的隱藏關卡：STAGE 3 剩兩架殘機時，不打頭目、直接繞到牠身後 → 扭曲次元（隕石、黑洞、銀河大元帥；最後全圖攻擊，被打光＝墜落）
(function () {
  const R = (window.RPG = window.RPG || {});
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const GW = 480, GH = 640;
  const SKILL = {
    firsler: { name: "強化大箭矢", charge: 12 }, ilshu: { name: "揮砍前方", charge: 9 }, vivilla: { name: "周圍噴孢子", charge: 10 },
    guan: { name: "陰陽陣", charge: 13 }, hoffman: { name: "殘影閃現", charge: 13 }, marika: { name: "火焰鞭打", charge: 10 },
    cangyou: { name: "蝠鱝夫人", charge: 12 }, bastian: { name: "舉盾", charge: 11 }, youyan: { name: "夢想變身", charge: 8, once: true },
  };
  function play(env) {
    const stage = env.stage, CH = env.ch, done = env.onDone;
    env.busy?.(true);
    env.pauseBgm?.();
    if (R._knMusic) R._knMusic.pause();                     // 保險：不讓兩首重疊
    const music = (R._knMusic = new Audio(env.music || "sounds/bgm-kn.mp3")); music.loop = true; music.volume = R.CONFIG.bgmVolume;
    if (!env.muted?.()) music.play().catch(() => {});
    const onVol = () => { music.volume = R.CONFIG.bgmVolume; };
    window.addEventListener("rpg:volume", onVol);
    const her = !!env.her, pid = her ? null : SKILL[CH.id] ? CH.id : "ilshu", SK = pid ? SKILL[pid] : null;
    const CONT = env.contCost || 10, canCont = () => !env.gold || env.gold() >= CONT;
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:fixed;inset:0;z-index:300;background:rgba(4,4,20,.92);display:flex;align-items:center;justify-content:center;gap:24px";
    wrap.innerHTML = `<canvas width="${GW}" height="${GH}" style="height:min(660px,94vh);width:auto;border:4px solid ${her ? "#ff8ac8" : "#5a6aff"};border-radius:6px;image-rendering:pixelated;background:#0a0a24"></canvas>
      <div style="color:#e8e8ff;font:700 14px/1.6 monospace;width:250px"><div class="kn-info"></div><div class="kn-btns" style="margin-top:14px;display:flex;flex-direction:column;gap:8px"></div></div>`;
    (env.host || document.body).appendChild(wrap);
    const cv = wrap.querySelector("canvas"), g = cv.getContext("2d"), info = wrap.querySelector(".kn-info"), btns = wrap.querySelector(".kn-btns");
    const G = { stage, her, t: 0, lives: her ? 10 : 3, score: 0, miss: 0, cont: 0, pl: { x: GW / 2, y: GH - 80, inv: 0, fire: 0, trail: [] }, shots: [], eb: [], foes: [], boss: null, wave: 0, over: null, keys: {}, pause: false, fx: [],
      sp: 0, skill: null, corner: 0, laserT: 0, tix: [], tixT: {}, warp: null, mets: [], holes: [], marshal: null, banner: null };
    const STAGES = {
      1: { name: "STAGE 1・練習空域", len: 22, boss: { name: "巡邏艦", hp: 140, col: "#3ab0e8" } },
      2: { name: "STAGE 2・點陣雲海", len: 34, boss: { name: "雙翼要塞", hp: 260, col: "#e8c84a" } },
      3: { name: "STAGE 3・吃了硬幣的頭目", len: 30, boss: { name: "貪吃艦長", hp: Infinity, col: "#e83a8a", coin: true } },
    };
    const S = STAGES[stage];
    const rnd = (a, b) => a + Math.random() * (b - a);
    const spawnWave = () => {
      const k = G.wave++, kind = ["pop", "zig", "pop", "turret", "zig", "pop"][k % 6], hard = stage - 1;
      if (kind === "pop") { const n = 4 + hard; for (let i = 0; i < n; i++) G.foes.push({ kind, x: 60 + (i * (GW - 120)) / (n - 1), y: -20 - i * 18, hp: 3, vy: 110 + hard * 15, shot: false }); }
      if (kind === "zig") { const x0 = rnd(120, GW - 120); for (let i = 0; i < 4; i++) G.foes.push({ kind, x0, x: x0, y: -30 - i * 50, hp: 4, vy: 90, ph: i, cd: 1 + i * 0.3 }); }
      if (kind === "turret") G.foes.push({ kind, x: rnd(100, GW - 100), y: -30, hp: 12 + hard * 4, vy: 80, stay: 4.5, cd: 1 });
    };
    const shoot = (x, y, ang, sp, col = "#ff5a8a", r = 5) => G.eb.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r, col });
    const aim = (x, y) => Math.atan2(G.pl.y - y, G.pl.x - x);
    const row = (y, n, sp) => { const hole = Math.floor(Math.random() * (n - 2)) + 1; for (let i = 0; i < n; i++) if (Math.abs(i - hole) > 0) shoot(20 + (i * (GW - 40)) / (n - 1), y, Math.PI / 2, sp, "#ffd84a", 6); };
    // 打敵機、打頭目
    function hurtFoe(f, n) {
      if (f.dead) return;
      f.hp -= n;
      if (f.hp <= 0) { f.dead = true; G.score += { pop: 500, zig: 800, turret: 2500 }[f.kind]; G.fx.push({ x: f.x, y: f.y, t: 0 }); if (!G.her) G.sp = Math.min(1, G.sp + 0.04); }
    }
    function hurtBoss(n) {
      const B = G.boss; if (!B) return;
      B.hits = (B.hits || 0) + n;
      if (B.hits >= 40 && !B.dropped) { B.dropped = true; dropTicket(2, B.x, B.y + 30); }      // 頭目分走的那張兌換券
      if (Number.isFinite(B.hp)) B.hp = Math.max(0, B.hp - n);
    }
    // ===== 兌換券（KN59810-04）：每一關有三張——兩張散在關卡裡，一張被頭目分走（打頭目 40 下就會掉出來） =====
    const TIX = { 1: [{ t: 6, x: 110 }, { t: 14, x: 370 }], 2: [{ t: 8, x: 360 }, { t: 20, x: 120 }], 3: [{ t: 7, x: 250 }, { t: 17, x: 400 }] };
    const tixLeft = (i) => !her && env.tickets && env.tickets.left(stage).includes(i);
    function dropTicket(i, x, y) { if (tixLeft(i) && !G.tix.some((q) => q.i === i)) G.tix.push({ i, x, y, x0: x, t: 0 }); }
    function stepTickets(dt) {
      if (!env.tickets || her || G.warp) return;
      (TIX[stage] || []).forEach((q, i) => { if (!G.tixT[i] && G.t >= q.t) { G.tixT[i] = true; dropTicket(i, q.x, -20); } });
      const P = G.pl;
      for (const q of G.tix) {
        q.t += dt; q.y += 70 * dt; q.x = q.x0 + Math.sin(q.t * 2.2) * 30;
        if (Math.hypot(q.x - P.x, q.y - P.y) < 30) { q.got = true; env.tickets.take(stage, q.i); G.fx.push({ x: q.x, y: q.y, t: 0, text: "兌換券！" }); }
      }
      G.tix = G.tix.filter((q) => !q.got && q.y < GH + 30);
    }
    // ===== 傳說中的隱藏關卡（KN59810-05）：STAGE 3、剩兩架殘機時，不打頭目、直接繞到牠身後 → 扭曲次元 =====
    function enterWarp() {
      G.warp = { t: 0, metT: 1, holeT: 3.5 };
      G.boss = null; G.foes = []; G.eb = []; G.tix = [];
      G.pl.inv = 2; G.banner = { t: 0, a: "WARNING", b: "扭曲次元" };
      G.fx.push({ x: G.pl.x, y: G.pl.y, t: 0, big: true });
    }
    const MARSHAL = ["......aaaa......", "....aabbbbaa....", "..aaabbccbbaaa..", "aaaabbbccbbbaaaa", "addaaabbbbaaadda", "a..aaaaddaaaa..a", ".....aa..aa....."];
    function stepWarp(dt) {
      const W = G.warp, P = G.pl;
      W.t += dt;
      // 隕石：從上面、斜斜的兩邊飛進來，碰到就少一架（子彈打不碎）
      if ((W.metT -= dt) <= 0) {
        W.metT = G.marshal ? 2.2 : 1.1;
        const side = Math.random(), r = rnd(16, 34);
        const m = side < 0.6 ? { x: rnd(20, GW - 20), y: -40 } : side < 0.8 ? { x: -40, y: rnd(0, GH / 2) } : { x: GW + 40, y: rnd(0, GH / 2) };
        const a = Math.atan2(rnd(GH * 0.5, GH) - m.y, rnd(60, GW - 60) - m.x), sp = rnd(140, 230);
        G.mets.push({ ...m, r, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: 0 });
      }
      for (const m of G.mets) {
        m.x += m.vx * dt; m.y += m.vy * dt; m.rot += dt * 2;
        for (const s of G.shots) if (!s.dead && Math.hypot(s.x - m.x, s.y - m.y) < m.r) s.dead = true;
        if (Math.hypot(m.x - P.x, m.y - P.y) < m.r + 5) hitPlayer();
      }
      G.mets = G.mets.filter((m) => m.y < GH + 60 && m.x > -80 && m.x < GW + 80);
      // 黑洞：先出現一圈預告，接著突然張開，把飛機吸過去、把子彈吞掉
      if ((W.holeT -= dt) <= 0) {
        W.holeT = rnd(4.5, 6.5);
        let x, y; for (let k = 0; k < 10; k++) { x = rnd(60, GW - 60); y = rnd(160, GH - 120); if (Math.hypot(x - P.x, y - P.y) > 170) break; }
        G.holes.push({ x, y, t: 0 });
      }
      for (const h of G.holes) {
        h.t += dt;
        if (h.t < 1 || h.t > 5) continue;
        const d = Math.hypot(P.x - h.x, P.y - h.y);
        if (d < 250 && d > 1) { const f = 150 * (1 - d / 250); P.x -= ((P.x - h.x) / d) * f * dt; P.y -= ((P.y - h.y) / d) * f * dt; }
        if (d < 20) hitPlayer();
        clearBullets((b) => Math.hypot(b.x - h.x, b.y - h.y) < 46);
      }
      G.holes = G.holes.filter((h) => h.t < 5.4);
      // 銀河大元帥：彈幕一層一層加密，最後乾脆全圖攻擊
      if (!G.marshal && W.t > 8) { G.marshal = { x: GW / 2, y: -90, t: 0, ang: 0, ang2: 0, sp: 0, ring: 1.5, fan: 2.5, full: null, fullCd: 0 }; G.banner = { t: 0, a: "WARNING", b: "銀河大元帥" }; }
      const M = G.marshal;
      if (!M) return;
      M.t += dt; M.y += (120 - M.y) * Math.min(1, dt * 1.5); M.x = GW / 2 + Math.sin(M.t * 0.5) * 120;
      const star = (x, y, a, sp, col, txt) => G.eb.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 7, col, text: txt });
      if (M.t > 2) {
        if ((M.sp -= dt) <= 0) {
          M.sp = M.t > 20 ? 0.06 : 0.08;
          for (let k = 0; k < 3; k++) shoot(M.x, M.y + 20, M.ang + (k * Math.PI * 2) / 3, 150, "#c86aff");
          M.ang += 0.23;
          if (M.t > 20) { for (let k = 0; k < 3; k++) shoot(M.x, M.y + 20, -M.ang2 + (k * Math.PI * 2) / 3, 130, "#5ac8ff"); M.ang2 += 0.19; }
        }
        if ((M.ring -= dt) <= 0) { M.ring = M.t > 20 ? 0.9 : 1.3; const n = M.t > 20 ? 40 : 30, off = Math.random(); for (let i = 0; i < n; i++) star(M.x, M.y + 20, off + (i / n) * Math.PI * 2, 120, "#ffd84a", "★"); }
        if ((M.fan -= dt) <= 0) { M.fan = 1.8; const a0 = aim(M.x, M.y + 30); for (let i = -5; i <= 5; i++) shoot(M.x, M.y + 30, a0 + i * 0.09, 230, "#ffffff", 5); }
      }
      // 全圖攻擊：畫面整個變紅、閃兩下，然後整片打下來（躲不掉）
      if (M.t > 32) {
        if (!M.full && (M.fullCd -= dt) <= 0) M.full = { t: 0 };
        if (M.full) {
          M.full.t += dt;
          if (M.full.t >= 1.6 && !M.full.hit) { M.full.hit = true; hitPlayer(true); }
          if (M.full.t >= 2.1) { M.full = null; M.fullCd = 2.4; }
        }
      }
      for (const s of G.shots) if (!s.dead && Math.abs(s.x - M.x) < 70 && Math.abs(s.y - M.y) < 34) { s.dead = true; G.fx.push({ x: s.x, y: s.y, t: 0.4 }); }
    }
    const clearBullets = (pred) => { G.eb = G.eb.filter((b) => !pred(b)); };
    function startBoss() {
      G.boss = { ...S.boss, x: GW / 2, y: -60, ty: 110, maxHp: S.boss.hp, t: 0, pat: 0, cd: 1.5, coreHp: S.boss.coin ? 50 : 0, coreOpen: S.boss.coin && !!env.coinOpen?.() };
      if (S.boss.coin) G.bossTimer = 0;
    }
    function hitPlayer(force) {
      if (G.pl.inv > 0 || G.over) return;
      if (!force && G.skill?.kind === "blink") return;                      // 霍夫曼：殘影期間不吃子彈（全圖攻擊躲不掉）
      G.lives--; G.miss++; G.pl.inv = 2.2;
      G.fx.push({ x: G.pl.x, y: G.pl.y, t: 0, big: true });
      clearBullets((b) => Math.hypot(b.x - G.pl.x, b.y - G.pl.y) < 140);
      if (G.lives <= 0) G.over = G.warp ? "fall" : "continue";             // 扭曲次元裡被打光不算失敗：墜落
    }
    // ===== 駕駛員技能 =====
    function useSkill() {
      if (!SK || G.over || G.pause || G.sp < 1 || G.skill) return;
      if (SK.once && env.errorUsed?.()) return;
      G.sp = 0;
      const P = G.pl, k = pid;
      G.skill = { kind: { firsler: "arrow", ilshu: "slash", vivilla: "spore", guan: "taiji", hoffman: "blink", marika: "whip", cangyou: "manta", bastian: "shield", youyan: "error" }[k], t: 0, x: P.x, y: P.y };
      const sk = G.skill;
      sk.dur = { arrow: 1.0, slash: 0.35, spore: 2.0, taiji: 5, blink: 5, whip: 0.6, manta: 1.2, shield: 5, error: 2.4 }[sk.kind];
      if (sk.kind === "slash") { for (const f of G.foes) if (f.y < P.y && Math.hypot(f.x - P.x, f.y - P.y) < 170) hurtFoe(f, 8); if (G.boss && Math.hypot(G.boss.x - P.x, G.boss.y - P.y) < 200) hurtBoss(25); clearBullets((b) => b.y < P.y + 10 && Math.hypot(b.x - P.x, b.y - P.y) < 170); }
      if (sk.kind === "spore") { for (const f of G.foes) if (Math.hypot(f.x - P.x, f.y - P.y) < 150) hurtFoe(f, 6); clearBullets((b) => Math.hypot(b.x - P.x, b.y - P.y) < 150); }
      if (sk.kind === "error") {
        env.useError?.();
        for (const f of G.foes) hurtFoe(f, 999);
        if (G.boss && Number.isFinite(G.boss.hp)) G.boss.hp = 0;
        G.eb = [];
      }
    }
    function stepSkill(dt) {
      const sk = G.skill; if (!sk) return;
      const P = G.pl;
      sk.t += dt;
      if (sk.kind === "arrow") {                     // 一支很粗的箭，一路往上貫穿
        sk.ay = P.y - 20 - sk.t * 900; sk.x = sk.x ?? P.x;
        for (const f of G.foes) if (Math.abs(f.x - sk.x) < 34 && f.y > sk.ay - 30 && f.y < sk.ay + 60) hurtFoe(f, 12);
        if (G.boss && !sk.hitBoss && Math.abs(G.boss.x - sk.x) < 70 && sk.ay < G.boss.y + 40) { sk.hitBoss = true; hurtBoss(45); }
        clearBullets((b) => Math.abs(b.x - sk.x) < 30 && b.y > sk.ay - 30 && b.y < sk.ay + 80);
      }
      if (sk.kind === "spore") { if (Math.floor(sk.t * 5) !== sk.tick) { sk.tick = Math.floor(sk.t * 5); for (const f of G.foes) if (Math.hypot(f.x - P.x, f.y - P.y) < 110) hurtFoe(f, 1); clearBullets((b) => Math.hypot(b.x - P.x, b.y - P.y) < 90); } }
      if (sk.kind === "taiji") { clearBullets((b) => Math.hypot(b.x - P.x, b.y - P.y) < 120); if (Math.floor(sk.t * 5) !== sk.tick) { sk.tick = Math.floor(sk.t * 5); for (const f of G.foes) if (Math.hypot(f.x - P.x, f.y - P.y) < 130) hurtFoe(f, 1); } }
      if (sk.kind === "blink") { P.trail.push({ x: P.x, y: P.y, t: G.t }); P.trail = P.trail.filter((q) => G.t - q.t < 0.4); }
      if (sk.kind === "whip") {                      // 前方扇形的火焰鞭，打三下
        const tick = Math.floor(sk.t / 0.2); if (tick !== sk.tick && tick < 3) { sk.tick = tick; for (const f of G.foes) { const a = Math.atan2(f.y - P.y, f.x - P.x); if (Math.hypot(f.x - P.x, f.y - P.y) < 300 && Math.abs(a + Math.PI / 2) < 0.55) hurtFoe(f, 6); } if (G.boss) { const a = Math.atan2(G.boss.y - P.y, G.boss.x - P.x); if (Math.hypot(G.boss.x - P.x, G.boss.y - P.y) < 340 && Math.abs(a + Math.PI / 2) < 0.6) hurtBoss(10); } }
        clearBullets((b) => { const a = Math.atan2(b.y - P.y, b.x - P.x); return Math.hypot(b.x - P.x, b.y - P.y) < 300 && Math.abs(a + Math.PI / 2) < 0.55; });
      }
      if (sk.kind === "manta") {                     // 蝠鱝夫人從下往上衝過整個畫面
        sk.my = GH + 60 - (sk.t / sk.dur) * (GH + 160);
        for (const f of G.foes) if (Math.abs(f.x - sk.x) < 90 && Math.abs(f.y - sk.my) < 50) hurtFoe(f, 6);
        if (G.boss && !sk.hitBoss && Math.abs(G.boss.x - sk.x) < 110 && Math.abs(G.boss.y - sk.my) < 60) { sk.hitBoss = true; hurtBoss(35); }
        clearBullets((b) => Math.abs(b.x - sk.x) < 80 && Math.abs(b.y - sk.my) < 50);
      }
      if (sk.kind === "shield") clearBullets((b) => { const d = Math.hypot(b.x - P.x, b.y - (P.y - 6)); return d < 56 && d > 26 && b.y < P.y + 4; });
      if (sk.t >= sk.dur) { G.skill = null; P.trail = []; }
    }
    function finish(result, leaving) {
      cancelAnimationFrame(G.raf); wrap.remove(); window.removeEventListener("keydown", kd, true); window.removeEventListener("keyup", ku, true); window.removeEventListener("rpg:volume", onVol);
      music.pause(); if (R._knMusic === music) R._knMusic = null;
      env.busy?.(false);
      if (!leaving) env.resumeBgm?.();                 // 要直接去戰鬥的話，不把地圖音樂叫回來
      done?.(result);
    }
    // 輸入（只用鍵盤；滑鼠不能移動飛機）
    const kd = (e) => {
      const k = e.key.toLowerCase();
      G.keys[k] = true;
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
      if (k === " ") useSkill();
      if (e.key === "Escape" && !G.over) G.pause = !G.pause;
      e.stopPropagation();
    };
    const ku = (e) => { G.keys[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", kd, true); window.addEventListener("keyup", ku, true);
    btns.addEventListener("click", (e) => {
      const a = e.target.closest("[data-kn]")?.dataset.kn;
      if (a === "cont") { if (!canCont()) return; env.pay?.(CONT); G.cont++; G.lives = 3; G.score = 0; G.over = null; G.pl.inv = 2.5; }
      if (a === "quit") finish({ clear: false, score: G.score, cont: G.cont, her, gotHer: G.gotHer });
      if (a === "ok") finish({ clear: true, score: G.score, cont: G.cont, miss: G.miss, her, gotHer: G.gotHer });
      if (a === "pause") G.pause = !G.pause;
      if (a === "skill") useSkill();
      if (a === "fall") { finish({ clear: false, fall: true, score: 0, cont: G.cont, her }, true); env.onFall?.(); }
      if (a === "hangar") { G.over = null; G.hangar = false; G.pl.x = GW / 2; G.pl.y = GH - 80; G.pl.inv = 2; }
    });
    let last = performance.now();
    function frame(now) {
      G.raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!G.over && !G.pause) step(dt);
      render(now);
      side(now);
    }
    function step(dt) {
      G.t += dt;
      const P = G.pl, slow = G.keys.shift ? 0.45 : 1;
      const mx = (G.keys.arrowright || G.keys.d ? 1 : 0) - (G.keys.arrowleft || G.keys.a ? 1 : 0), my = (G.keys.arrowdown || G.keys.s ? 1 : 0) - (G.keys.arrowup || G.keys.w ? 1 : 0);
      if (mx || my) { const L = Math.hypot(mx, my); P.x += (mx / L) * 320 * slow * dt; P.y += (my / L) * 320 * slow * dt; }
      P.x = Math.max(16, Math.min(GW - 16, P.x)); P.y = Math.max(40, Math.min(GH - 20, P.y));
      if (P.inv > 0) P.inv -= dt;
      // 隱藏：STAGE 1 往左下角一直靠 18 秒
      if (stage === 1 && !her && env.gainHer && !env.herOwned?.() && P.x <= 17 && P.y >= GH - 21) { G.corner += dt; if (G.corner >= 18) { G.corner = 0; G.over = "hangar"; G.hangar = true; G.gotHer = true; env.gainHer(); } }
      else G.corner = 0;
      // 射擊：她的戰機＝一直往前的雷射；一般＝自動射擊
      if (her) { if ((G.laserT -= dt) <= 0) { G.laserT = 0.06; for (const f of G.foes) if (Math.abs(f.x - P.x) < 22 && f.y < P.y) hurtFoe(f, 1); if (G.boss && Math.abs(G.boss.x - P.x) < 66 && G.boss.y < P.y) { const B = G.boss; if (B.coin && B.coreOpen && B.coreHp > 0) { B.coreHp--; if (B.coreHp <= 0) { B.hp = 320; B.maxHp = 320; } } else hurtBoss(1); } } }
      else if ((P.fire -= dt) <= 0) { P.fire = 0.11; G.shots.push({ x: P.x - 7, y: P.y - 14 }, { x: P.x + 7, y: P.y - 14 }); }
      for (const s of G.shots) s.y -= 640 * dt;
      G.shots = G.shots.filter((s) => s.y > -10 && !s.dead);
      if (!her && SK && !(SK.once && env.errorUsed?.())) G.sp = Math.min(1, G.sp + dt / SK.charge);
      stepSkill(dt);
      stepTickets(dt);
      if (G.warp) stepWarp(dt);
      if (G.banner) { G.banner.t += dt; if (G.banner.t > 2.6) G.banner = null; }
      // 出怪
      if (!G.warp && !G.boss && G.t < S.len && G.t > G.wave * 3.4 + 0.5) spawnWave();
      if (!G.warp && !G.boss && G.t >= S.len && !G.foes.length) startBoss();
      // 敵機
      for (const f of G.foes) {
        f.y += f.vy * dt;
        if (f.kind === "pop" && !f.shot && f.y > 160) { f.shot = true; for (const a of [-0.3, 0, 0.3]) shoot(f.x, f.y, Math.PI / 2 + a, 170); }
        if (f.kind === "zig") { f.x = f.x0 + Math.sin(G.t * 2.5 + f.ph) * 90; if ((f.cd -= dt) <= 0) { f.cd = 1.4; shoot(f.x, f.y, aim(f.x, f.y), 190, "#ff8a3a"); } }
        if (f.kind === "turret") { if (f.y > 150 && f.stay > 0) { f.y = 150; f.stay -= dt; if ((f.cd -= dt) <= 0) { f.cd = 1.5; const off = G.t; for (let i = 0; i < 12; i++) shoot(f.x, f.y, off + (i / 12) * Math.PI * 2, 130, "#c86aff"); } } }
        for (const s of G.shots) if (!s.dead && Math.abs(s.x - f.x) < 18 && Math.abs(s.y - f.y) < 16) { s.dead = true; hurtFoe(f, 1); }
        if (!f.dead && Math.hypot(f.x - P.x, f.y - P.y) < 18) hitPlayer();
      }
      G.foes = G.foes.filter((f) => !f.dead && f.y < GH + 40);
      // 頭目
      const B = G.boss;
      if (B) {
        B.t += dt; B.y += (B.ty - B.y) * Math.min(1, dt * 2); B.x = GW / 2 + Math.sin(B.t * 0.7) * 150;
        if (stage === 3 && !her && env.legend !== false && G.lives === 2 && B.t > 1.5 && P.y < B.y - 30 && Math.abs(P.x - B.x) < 64) { enterWarp(); return; }
        if ((B.cd -= dt) <= 0) {
          const p = B.pat++ % 3;
          if (p === 0) { for (let k = 0; k < 3; k++) setTimeout(() => !G.over && G.boss && row(G.boss.y + 30, 11, 150 + stage * 15), k * 450); B.cd = 2.6; }
          if (p === 1) { const n = 24 + stage * 4; for (let i = 0; i < n; i++) shoot(B.x, B.y + 20, B.t + (i / n) * Math.PI * 2, 140 + stage * 10, B.col); B.cd = 2.0; }
          if (p === 2) { for (let k = 0; k < 5; k++) setTimeout(() => { if (!G.over && G.boss) shoot(G.boss.x, G.boss.y + 30, aim(G.boss.x, G.boss.y + 30), 240, "#ffffff", 6); }, k * 140); B.cd = 1.6; }
        }
        for (const s of G.shots) {
          if (s.dead) continue;
          if (B.coin && B.coreOpen && B.coreHp > 0 && Math.hypot(s.x - B.x, s.y - (B.y + 26)) < 16) { s.dead = true; B.coreHp--; if (B.coreHp <= 0) { B.hp = 320; B.maxHp = 320; G.fx.push({ x: B.x, y: B.y + 26, t: 0, big: true }); } continue; }
          if (Math.abs(s.x - B.x) < 60 && Math.abs(s.y - B.y) < 34) { s.dead = true; hurtBoss(1); }
        }
        if (B.coin && !B.coreOpen) { G.bossTimer += dt; if (G.bossTimer > 40 && !G.over) G.over = "stuck"; }
        if (Number.isFinite(B.hp) && B.hp <= 0) {
          G.score += stage === 2 ? 30000 : 20000;
          if (!G.miss) G.score += 20000;
          G.score += Math.min(G.lives, 3) * 10000;
          G.fx.push({ x: B.x, y: B.y, t: 0, big: true });
          G.boss = null; G.eb = []; G.over = "clear";
        }
      }
      // 子彈
      for (const b of G.eb) { b.x += b.vx * dt; b.y += b.vy * dt; if (Math.hypot(b.x - P.x, b.y - P.y) < b.r + 4) { b.dead = true; hitPlayer(); } }
      G.eb = G.eb.filter((b) => !b.dead && b.x > -20 && b.x < GW + 20 && b.y > -20 && b.y < GH + 20);
      for (const f of G.fx) f.t += dt;
      G.fx = G.fx.filter((f) => f.t < 0.6);
    }
    // ===== 畫面 =====
    function drawPlane(x, y, now, ghost) {
      g.save(); if (ghost) g.globalAlpha = ghost;
      if (her) {
        // 她的戰機：粉紅色的機身、兩片像紅色雙角的尾翼，沒有駕駛員
        g.fillStyle = "#ff8ac8"; g.beginPath(); g.moveTo(x, y - 20); g.lineTo(x + 20, y + 12); g.lineTo(x - 20, y + 12); g.closePath(); g.fill();
        g.fillStyle = "#e8263a"; g.beginPath(); g.moveTo(x - 10, y + 2); g.lineTo(x - 16, y - 22); g.lineTo(x - 5, y - 4); g.closePath(); g.fill(); g.beginPath(); g.moveTo(x + 10, y + 2); g.lineTo(x + 16, y - 22); g.lineTo(x + 5, y - 4); g.closePath(); g.fill();
        g.fillStyle = "#1d1d3a"; g.fillRect(x - 5, y - 6, 10, 10);           // 空空的駕駛艙
      } else {
        g.fillStyle = "#c8c8e8"; g.beginPath(); g.moveTo(x - 22, y + 10); g.lineTo(x, y - 6); g.lineTo(x + 22, y + 10); g.closePath(); g.fill();
        g.fillStyle = "#fffaf0"; g.fillRect(x - 10, y - 12, 20, 20); g.strokeStyle = CH.color; g.lineWidth = 3; g.strokeRect(x - 10, y - 12, 20, 20);
        g.fillStyle = CH.color; g.font = "900 12px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(CH.letter || CH.name[0], x, y - 1); g.textBaseline = "alphabetic";
      }
      g.fillStyle = Math.floor(now / 60) % 2 ? "#ffd84a" : "#ff8a3a"; g.fillRect(x - 4, y + 10, 8, 6);
      if (!ghost) { g.fillStyle = "#ff3a5a"; g.beginPath(); g.arc(x, y - 2, 3, 0, Math.PI * 2); g.fill(); }
      g.restore();
    }
    function render(now) {
      g.fillStyle = her ? "#1a0a24" : "#0a0a24"; g.fillRect(0, 0, GW, GH);
      if (G.warp) drawWarpBg(now);
      else for (let i = 0; i < 50; i++) { const x = (i * 97) % GW, y = (i * 61 + G.t * (40 + (i % 3) * 40)) % GH; g.fillStyle = i % 3 ? (her ? "#aa5a8a" : "#5a6aaa") : "#fff"; g.fillRect(x, y, 2, 2); }
      // 左下角：靠著的時候會微微閃爍（隱藏的入口）
      if (stage === 1 && G.corner > 3) { g.fillStyle = `rgba(255,138,200,${Math.min(0.5, G.corner / 36) * (0.6 + 0.4 * Math.sin(now / 90))})`; g.fillRect(0, GH - 60, 60, 60); }
      const P = G.pl, sk = G.skill;
      // 技能（畫在飛機下面的）
      if (sk?.kind === "taiji") { const R0 = 120, h = R0 / 2; g.save(); g.translate(P.x, P.y); g.rotate(now / 600); g.globalAlpha = 0.38;
        g.fillStyle = "#f2c83c"; g.beginPath(); g.arc(0, 0, R0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#7a141e"; g.beginPath(); g.arc(0, 0, R0, -Math.PI / 2, Math.PI / 2); g.arc(0, h, h, Math.PI / 2, -Math.PI / 2, true); g.arc(0, -h, h, Math.PI / 2, -Math.PI / 2); g.fill();
        g.fillStyle = "#f2c83c"; g.beginPath(); g.arc(0, h, h / 4, 0, Math.PI * 2); g.fill(); g.fillStyle = "#7a141e"; g.beginPath(); g.arc(0, -h, h / 4, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 0.9; g.strokeStyle = "#2f6fd6"; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, R0, 0, Math.PI * 2); g.stroke(); g.restore(); }
      if (sk?.kind === "spore") { for (let i = 0; i < 24; i++) { const a = i * 0.26 + sk.t * 2, r = 30 + ((sk.t * 120 + i * 13) % 130); g.fillStyle = `rgba(200,140,255,${0.7 - r / 220})`; g.beginPath(); g.arc(P.x + Math.cos(a) * r, P.y + Math.sin(a) * r, 5, 0, Math.PI * 2); g.fill(); } }
      if (sk?.kind === "blink") for (const q of P.trail) drawPlane(q.x, q.y, now, 0.25);
      // 我方
      if (!(P.inv > 0 && Math.floor(now / 80) % 2)) drawPlane(P.x, P.y, now);
      if (her) { g.fillStyle = "rgba(255,138,200,.35)"; g.fillRect(P.x - 12, 0, 24, P.y - 16); g.fillStyle = "#ffe0f0"; g.fillRect(P.x - 4, 0, 8, P.y - 16); }
      g.fillStyle = "#8affd8"; for (const s of G.shots) g.fillRect(s.x - 2, s.y - 8, 4, 12);
      // 技能（畫在飛機上面的）
      if (sk?.kind === "arrow") {                    // 發光的箭頭
        const x = sk.x, y = sk.ay, arrow = () => { g.beginPath(); g.moveTo(x, y - 40); g.lineTo(x + 26, y + 6); g.lineTo(x + 9, y + 6); g.lineTo(x + 9, y + 70); g.lineTo(x - 9, y + 70); g.lineTo(x - 9, y + 6); g.lineTo(x - 26, y + 6); g.closePath(); };
        g.save(); const tr = g.createLinearGradient(x, y + 70, x, y + 200); tr.addColorStop(0, "rgba(140,220,255,.45)"); tr.addColorStop(1, "rgba(140,220,255,0)"); g.fillStyle = tr; g.fillRect(x - 14, y + 70, 28, 130);
        g.shadowColor = "#8adcff"; g.shadowBlur = 28; g.fillStyle = "#8adcff"; arrow(); g.fill(); g.shadowBlur = 10; g.fillStyle = "#eaffff"; g.save(); g.translate(x, y + 10); g.scale(0.55, 0.55); g.translate(-x, -(y + 10)); arrow(); g.fill(); g.restore(); g.restore();
      }
      if (sk?.kind === "slash") { g.strokeStyle = `rgba(220,240,255,${1 - sk.t / sk.dur})`; g.lineWidth = 10; g.beginPath(); g.arc(P.x, P.y, 140, Math.PI * 1.1, Math.PI * 1.1 + Math.PI * 0.8 * Math.min(1, sk.t / 0.15)); g.stroke(); }
      if (sk?.kind === "whip") { for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (i - 1) * 0.4 + Math.sin(sk.t * 20 + i) * 0.15; g.strokeStyle = i % 2 ? "#ff8a2a" : "#e8402a"; g.lineWidth = 8; g.beginPath(); g.moveTo(P.x, P.y - 10); g.quadraticCurveTo(P.x + Math.cos(a + 0.4) * 150, P.y + Math.sin(a + 0.4) * 150, P.x + Math.cos(a) * 300, P.y + Math.sin(a) * 300); g.stroke(); } }
      if (sk?.kind === "manta") { const y = sk.my; g.fillStyle = "rgba(90,130,200,.85)"; g.beginPath(); g.moveTo(sk.x, y - 40); g.quadraticCurveTo(sk.x + 100, y - 10, sk.x + 70, y + 30); g.lineTo(sk.x, y + 10); g.lineTo(sk.x - 70, y + 30); g.quadraticCurveTo(sk.x - 100, y - 10, sk.x, y - 40); g.fill(); g.strokeStyle = "#2a4a8a"; g.lineWidth = 3; g.beginPath(); g.moveTo(sk.x, y + 10); g.lineTo(sk.x, y + 60); g.stroke(); }
      if (sk?.kind === "shield") { g.strokeStyle = "#d8a040"; g.lineWidth = 10; g.beginPath(); g.arc(P.x, P.y - 6, 40, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.strokeStyle = "#5a3a10"; g.lineWidth = 2; g.stroke(); }
      for (const f of G.foes) { g.save(); g.translate(f.x, f.y); g.rotate(Math.PI); const s = f.kind === "turret" ? 5 : 3.4; px(g, -3.5 * s, -3 * s, s, ["...a...", "..aba..", ".aabaa.", "aaabaaa", "a.aaa.a"], { a: f.kind === "turret" ? "#c86aff" : f.kind === "zig" ? "#ff8a3a" : "#e83a8a", b: "#fff" }); g.restore(); }
      for (const q of G.tix) drawTicket(q.x, q.y, now);
      if (G.warp) drawWarp(now);
      const B = G.boss;
      if (B) {
        px(g, B.x - 64, B.y - 40, 8, ["..aaaaaaaaaaaa..", ".aabbaaaaaabbaa.", "aaaaaaaaaaaaaaaa", "aaccaaaaaaaaccaa", ".aaaaaddddaaaaa.", "..aa..dddd..aa.."], { a: B.col, b: "#fff", c: "#1d1d3a", d: "#3a1a3a" });
        if (B.coin) { const open = B.coreOpen && B.coreHp > 0; g.fillStyle = open ? `rgba(255,216,74,${0.7 + 0.3 * Math.sin(now / 100)})` : "rgba(255,216,74,.25)"; g.beginPath(); g.arc(B.x, B.y + 26, 12, 0, Math.PI * 2); g.fill(); if (open) { g.strokeStyle = "#fff"; g.lineWidth = 2; g.stroke(); } }
        g.fillStyle = "rgba(255,255,255,.2)"; g.fillRect(40, 14, GW - 80, 8);
        g.fillStyle = B.col; g.fillRect(40, 14, Number.isFinite(B.hp) ? (GW - 80) * (B.hp / B.maxHp) : GW - 80, 8);
        g.fillStyle = "#fff"; g.font = "700 11px monospace"; g.textAlign = "center"; g.fillText(`${B.name}  HP ${Number.isFinite(B.hp) ? B.hp : "∞"}`, GW / 2, 36);
        if (B.coin && !B.coreOpen) g.fillText("……打不倒？肚子裡好像卡著什麼", GW / 2, 52);
        if (B.coin && B.coreOpen && B.coreHp > 0) g.fillText(`除錯碼生效：打牠肚子上的硬幣！（${B.coreHp}）`, GW / 2, 52);
      }
      for (const b of G.eb) { if (b.text) { g.fillStyle = b.col; g.font = "900 16px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(b.text, b.x, b.y); g.textBaseline = "alphabetic"; continue; } g.fillStyle = b.col; g.beginPath(); g.arc(b.x, b.y, b.r, 0, Math.PI * 2); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(b.x, b.y, b.r * 0.45, 0, Math.PI * 2); g.fill(); }
      for (const f of G.fx) { if (f.text) { g.fillStyle = `rgba(255,170,60,${1 - f.t / 0.6})`; g.font = "900 14px monospace"; g.textAlign = "center"; g.fillText(f.text, f.x, f.y - f.t * 40); continue; } g.strokeStyle = `rgba(255,216,74,${1 - f.t / 0.6})`; g.lineWidth = 3; g.beginPath(); g.arc(f.x, f.y, (f.big ? 60 : 24) * (0.3 + f.t / 0.6), 0, Math.PI * 2); g.stroke(); }
      // 悠魘：觸手＋全畫面黑色抖動馬賽克＋紅色 ERROR
      if (sk?.kind === "error") {
        for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.3; g.strokeStyle = "#7a0a1e"; g.lineWidth = 7; g.beginPath(); g.moveTo(P.x, P.y - 10); for (let k = 1; k <= 8; k++) { const r = k * 40 * Math.min(1, sk.t * 3); g.lineTo(P.x + Math.cos(a) * r + Math.sin(now / 60 + k + i) * 10, P.y + Math.sin(a) * r); } g.stroke(); }
        const n = 16;
        for (let j = 0; j < GH / 32; j++) for (let i = 0; i < GW / 32; i++) { if (Math.random() < 0.55) { g.fillStyle = Math.random() < 0.85 ? `rgba(0,0,0,${0.5 + Math.random() * 0.5})` : "rgba(160,0,20,.7)"; g.fillRect(i * 32 + (Math.random() - 0.5) * n, j * 32 + (Math.random() - 0.5) * n, 32, 32); } }
        g.save(); g.translate((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 10);
        g.fillStyle = "#ff1a2a"; g.font = "900 64px monospace"; g.textAlign = "center"; g.fillText("ERROR", GW / 2, GH / 2);
        g.fillStyle = "rgba(255,26,42,.5)"; g.fillText("ERROR", GW / 2 + 6, GH / 2 + 3);
        g.restore();
      }
      // 文字
      g.textAlign = "center"; g.fillStyle = "#fff";
      if (G.marshal?.full) { const k = G.marshal.full.t; g.fillStyle = k < 1.6 ? `rgba(255,30,60,${Math.floor(now / 120) % 2 ? 0.35 : 0.1})` : `rgba(255,240,250,${Math.max(0, 1 - (k - 1.6) / 0.5)})`; g.fillRect(0, 0, GW, GH); if (k < 1.6) { g.fillStyle = "#fff"; g.font = "900 20px monospace"; g.textAlign = "center"; g.fillText("全圖攻擊", GW / 2, GH / 2 + 90); } }
      if (G.banner) { const a = Math.min(1, G.banner.t * 3, (2.6 - G.banner.t) * 3); g.fillStyle = `rgba(160,0,40,${0.55 * a})`; g.fillRect(0, GH / 2 - 60, GW, 100); g.globalAlpha = a; g.fillStyle = "#ffd84a"; g.font = "900 30px monospace"; g.textAlign = "center"; g.fillText(G.banner.a, GW / 2, GH / 2 - 18); g.fillStyle = "#fff"; g.font = "900 20px monospace"; g.fillText(G.banner.b, GW / 2, GH / 2 + 18); g.globalAlpha = 1; }
      if (G.t < 2.5 && !G.over) { g.font = "900 22px monospace"; g.fillText(her ? `${S.name}・她的戰機` : S.name, GW / 2, GH / 2 - 20); g.font = "700 13px monospace"; g.fillText(her ? "方向鍵移動・雷射一直往前射" : "方向鍵／WASD 移動・Shift 慢速・空白鍵 技能", GW / 2, GH / 2 + 10); }
      if (G.pause) { g.font = "900 26px monospace"; g.fillText("PAUSE", GW / 2, GH / 2); }
      if (G.over === "continue") { g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(0, 0, GW, GH); g.fillStyle = "#fff"; g.font = "900 30px monospace"; g.fillText("CONTINUE?", GW / 2, GH / 2 - 20); g.font = "900 48px monospace"; g.fillText(String(9 - (Math.floor(now / 1000) % 10)), GW / 2, GH / 2 + 40); }
      if (G.over === "clear") { g.fillStyle = "rgba(0,0,0,.5)"; g.fillRect(0, 0, GW, GH); g.fillStyle = "#ffd84a"; g.font = "900 30px monospace"; g.fillText("STAGE CLEAR!", GW / 2, GH / 2 - 10); g.fillStyle = "#fff"; g.font = "700 16px monospace"; g.fillText(her ? "（她的戰機：不計入排行榜）" : `SCORE ${G.score}`, GW / 2, GH / 2 + 22); }
      if (G.over === "fall") {
        g.fillStyle = "rgba(0,0,0,.75)"; g.fillRect(0, 0, GW, GH);
        g.save(); g.translate(GW / 2, GH / 2 - 120 + ((now / 8) % 120)); g.rotate(now / 300); drawPlane(0, 0, now, 0.8); g.restore();
        g.fillStyle = "#ff3a5a"; g.font = "900 34px monospace"; g.fillText("墜落……", GW / 2, GH / 2 + 40);
        g.fillStyle = "#fff"; g.font = "700 13px monospace";
        ["戰機全部被銀河大元帥打下來了。", env.onFall ? "……可是駕駛員還在。戰鬥還沒有結束。" : "（這台機台外面，沒有地方可以繼續打）"].forEach((t, i) => g.fillText(t, GW / 2, GH / 2 + 76 + i * 22));
      }
      if (G.over === "stuck") { g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(0, 0, GW, GH); g.fillStyle = "#e83a8a"; g.font = "900 22px monospace"; g.fillText("機台卡住了……", GW / 2, GH / 2 - 10); g.fillStyle = "#fff"; g.font = "700 13px monospace"; g.fillText("頭目吃了硬幣，怎麼打都打不倒", GW / 2, GH / 2 + 20); }
      if (G.over === "hangar") {
        // 隱藏的機庫
        g.fillStyle = "#1a0a24"; g.fillRect(0, 0, GW, GH);
        g.strokeStyle = "rgba(255,138,200,.25)"; for (let x = 0; x < GW; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, GH); g.stroke(); } for (let y = 0; y < GH; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(GW, y); g.stroke(); }
        g.fillStyle = "#ff8ac8"; g.font = "900 22px monospace"; g.fillText("HIDDEN HANGAR", GW / 2, 120);
        g.save(); g.translate(GW / 2, GH / 2 - 20); g.scale(3, 3); const keep = her; drawHer(g, now); g.restore();
        g.fillStyle = "#fff"; g.font = "700 14px monospace";
        ["機庫最深處，停著一架粉紅色的戰機。", "兩片尾翼紅紅的、翹起來——像一對角。", "駕駛艙是空的。座位上貼著一張便條：", "「借你飛。只能在第一關喔。」"].forEach((t, i) => g.fillText(t, GW / 2, GH / 2 + 90 + i * 24));
      }
    }
    function drawHer(gg, now) {
      gg.fillStyle = "#ff8ac8"; gg.beginPath(); gg.moveTo(0, -20); gg.lineTo(20, 12); gg.lineTo(-20, 12); gg.closePath(); gg.fill();
      gg.fillStyle = "#e8263a"; gg.beginPath(); gg.moveTo(-10, 2); gg.lineTo(-16, -22); gg.lineTo(-5, -4); gg.closePath(); gg.fill(); gg.beginPath(); gg.moveTo(10, 2); gg.lineTo(16, -22); gg.lineTo(5, -4); gg.closePath(); gg.fill();
      gg.fillStyle = "#1d1d3a"; gg.fillRect(-5, -6, 10, 10);
    }
    // 兌換券：橘色的長條票，邊緣鋸齒
    function drawTicket(x, y, now) {
      g.save(); g.translate(x, y); g.rotate(Math.sin(now / 300 + x) * 0.25);
      g.fillStyle = "rgba(255,200,90,.25)"; g.beginPath(); g.arc(0, 0, 22, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#ff9a2a"; g.fillRect(-16, -8, 32, 16); g.fillStyle = "#0a0a24"; for (let i = -6; i <= 6; i += 4) { g.fillRect(-17, i - 1, 2, 2); g.fillRect(15, i - 1, 2, 2); }
      g.fillStyle = "#fff"; g.font = "900 8px monospace"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("TICKET", 0, 0); g.textBaseline = "alphabetic"; g.restore();
    }
    // 扭曲次元：紫色的漩渦、往中心拉長的星星
    function drawWarpBg(now) {
      g.fillStyle = "#12041f"; g.fillRect(0, 0, GW, GH);
      for (let i = 0; i < 7; i++) { g.save(); g.translate(GW / 2, GH / 2); g.rotate(now / (1600 + i * 300) * (i % 2 ? -1 : 1)); g.strokeStyle = `rgba(${140 + i * 15},60,255,${0.18 + 0.03 * i})`; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, 50 + i * 55, 24 + i * 34, 0, 0, Math.PI * 2); g.stroke(); g.restore(); }
      for (let i = 0; i < 60; i++) { const a = i * 2.4, k = ((now / 1400 + i * 0.137) % 1), r = 20 + k * 420; const x = GW / 2 + Math.cos(a) * r, y = GH / 2 + Math.sin(a) * r * 0.9; g.strokeStyle = `rgba(220,200,255,${k})`; g.lineWidth = 1 + k * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(a) * 10 * k, y - Math.sin(a) * 10 * k); g.stroke(); }
    }
    function drawWarp(now) {
      for (const h of G.holes) {
        if (h.t < 1) { g.strokeStyle = `rgba(200,106,255,${0.4 + 0.4 * Math.sin(now / 60)})`; g.setLineDash([6, 6]); g.lineWidth = 2; g.beginPath(); g.arc(h.x, h.y, 60 * (1 - h.t) + 22, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); continue; }
        const k = Math.min(1, (h.t - 1) * 4, (5.4 - h.t) * 3);
        g.save(); g.translate(h.x, h.y); g.scale(k, k);
        g.fillStyle = "rgba(120,40,200,.18)"; g.beginPath(); g.arc(0, 0, 250, 0, Math.PI * 2); g.fill();
        for (let i = 0; i < 3; i++) { g.save(); g.rotate(now / 200 + i * 2.1); g.strokeStyle = ["#c86aff", "#ff5ac8", "#5ac8ff"][i]; g.lineWidth = 4; g.beginPath(); g.ellipse(0, 0, 40, 16, 0, 0, Math.PI * 1.3); g.stroke(); g.restore(); }
        g.fillStyle = "#000"; g.beginPath(); g.arc(0, 0, 24, 0, Math.PI * 2); g.fill(); g.strokeStyle = "#e8d0ff"; g.lineWidth = 2; g.stroke();
        g.restore();
      }
      for (const m of G.mets) {
        g.save(); g.translate(m.x, m.y);
        const a = Math.atan2(m.vy, m.vx); g.fillStyle = "rgba(255,120,40,.35)"; g.beginPath(); g.moveTo(-Math.cos(a) * m.r * 3, -Math.sin(a) * m.r * 3); g.lineTo(Math.cos(a + 1.57) * m.r, Math.sin(a + 1.57) * m.r); g.lineTo(Math.cos(a - 1.57) * m.r, Math.sin(a - 1.57) * m.r); g.fill();
        g.rotate(m.rot); g.fillStyle = "#6a5a4a"; g.beginPath(); for (let i = 0; i < 8; i++) { const r = m.r * (0.85 + ((i * 37) % 5) * 0.05); g.lineTo(Math.cos((i / 8) * Math.PI * 2) * r, Math.sin((i / 8) * Math.PI * 2) * r); } g.closePath(); g.fill();
        g.fillStyle = "#4a3a2a"; g.beginPath(); g.arc(m.r * 0.3, -m.r * 0.2, m.r * 0.25, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(-m.r * 0.35, m.r * 0.3, m.r * 0.18, 0, Math.PI * 2); g.fill();
        g.restore();
      }
      const M = G.marshal;
      if (M) {
        px(g, M.x - 72, M.y - 32, 9, MARSHAL, { a: "#6a3ab8", b: "#ffd84a", c: Math.floor(now / 150) % 2 ? "#ff3a5a" : "#ffffff", d: "#c8c8e8" });
        g.fillStyle = "#ffd84a"; g.font = "900 16px sans-serif"; g.textAlign = "center"; g.fillText("★", M.x, M.y - 1);
        const hue = (now / 10) % 360; g.fillStyle = `hsl(${hue},90%,60%)`; g.fillRect(40, 14, GW - 80, 8);
        g.fillStyle = "#fff"; g.font = "700 11px monospace"; g.fillText("銀河大元帥  HP ∞", GW / 2, 36);
      }
    }
    // 側邊（內容有變才重畫，按鈕才點得到）
    let lastInfo = "", lastBtns = "";
    function side() {
      const rival = env.rival || 0, b = env.best?.(stage) || 0;
      const skillLine = her ? "駕駛員　（沒有）" : SK ? `技能　${SK.name}　${SK.once && env.errorUsed?.() ? "（已經用過了）" : G.sp >= 1 ? "<b style='color:#5aff9a'>就緒（空白鍵）</b>" : `${Math.floor(G.sp * 100)}%`}` : "";
      const inf = `<div style="font-size:18px;color:${G.warp ? "#c86aff" : her ? "#ff8ac8" : "#ffd84a"}">${esc(G.warp ? "???・扭曲次元" : S.name)}</div>
        <div>SCORE　${her ? "—（不計分）" : G.warp ? "—" : G.score}</div><div>HI-SCORE　${Math.max(rival, b)}${rival && rival >= b ? "（???）" : ""}</div>
        <div>殘機　${G.lives > 5 ? `✈ × ${G.lives}` : "✈".repeat(Math.max(0, G.lives))}</div><div>接關　${G.cont}</div>${env.gold ? `<div>金幣　${env.gold()}</div>` : ""}<div>${skillLine}</div>`;
      const bt = G.over === "continue" ? `<button type="button" class="primary" data-kn="cont" ${canCont() ? "" : "disabled"}>${env.gold ? `投幣接關（${CONT} 金幣）` : "接關（免費）"}</button><button type="button" class="ghost" data-kn="quit">放棄</button>`
        : G.over === "clear" ? `<button type="button" class="primary" data-kn="ok">回到機台裡</button>`
        : G.over === "fall" ? (env.onFall ? `<button type="button" class="primary" data-kn="fall">迎戰銀河大元帥的戰機</button>` : `<button type="button" class="ghost" data-kn="quit">離開</button>`)
        : G.over === "stuck" ? `<button type="button" class="ghost" data-kn="quit">離開</button>`
        : G.over === "hangar" ? `<button type="button" class="primary" data-kn="hangar">收下她的戰機，繼續 STAGE 1</button>`
        : `${!her && SK ? `<button type="button" class="ghost" data-kn="skill" ${G.sp >= 1 && !(SK.once && env.errorUsed?.()) ? "" : "disabled"}>駕駛員技能（空白鍵）</button>` : ""}<button type="button" class="ghost" data-kn="pause">${G.pause ? "繼續" : "暫停（Esc）"}</button><button type="button" class="ghost" data-kn="quit">離開關卡</button>`;
      if (inf !== lastInfo) { lastInfo = inf; info.innerHTML = inf; }
      if (bt !== lastBtns) { lastBtns = bt; btns.innerHTML = bt; }
    }
    G.raf = requestAnimationFrame(frame);
    R._knGame = G;            // 測試用
    return G;
  }
  const px = (g, x, y, s, rows, pal) => { for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) { const c = pal[rows[j][i]]; if (c) { g.fillStyle = c; g.fillRect(x + i * s, y + j * s, s, s); } } };
  R.KnStg = { play, SKILL };
})();
