/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/kn59810.js": "20261113040753" });
// #KN59810 克亞貝魯巴斯諾（A 級：街機空戰射擊遊戲的內部）
//   關卡門 STAGE 1～3：進去是「射擊小遊戲」（直式捲軸）：滑鼠或方向鍵／WASD 移動（Shift 慢速），自動射擊
//     生命改成「殘機」（3 架），被打中就少一架；殘機用完是 CONTINUE 畫面：投 10 金幣接關，或放棄
//     分數：打倒敵機、頭目、剩下的殘機、沒有被打中（No Miss）都會加分
//   KN59810-01 吃了硬幣的頭目：撿齊三段除錯碼（地上閃爍的亂碼格子）→ STAGE 3：頭目吃了硬幣打不倒（∞），除錯碼讓牠肚子裡的硬幣露出來，打掉硬幣才打得倒
//   KN59810-02 最高分的名字：問大家「???」的事（粉色短髮、紅色的雙角）→ STAGE 2 打出比 ??? 更高的分數 → ??? 出現
//   KN59810-03 卡在接關畫面的人：替 1P 的機師小藍打完 STAGE 1
(function () {
  const R = (window.RPG = window.RPG || {});
  R.WorldHooks = R.WorldHooks || {};

  R.WorldHooks.KN59810 = function (api) {
    const { MAP, trip, run, me, CH, BAG, toast, text, save, dist, esc } = api;
    const K = R.BKit(api), ctx = api.ctx();
    const Q1 = K.q("KN59810-01"), Q2 = K.q("KN59810-02"), Q3 = K.q("KN59810-03");
    Q1.glitch = Q1.glitch || {}; Q2.asked = Q2.asked || {};
    const npc = (id) => MAP.npcs.find((n) => n.id === id);
    const best = () => trip.qdata.kn?.best || {};

    // ================= 射擊小遊戲 =================
    // 操作：方向鍵／WASD 移動（Shift 慢速），自動射擊，空白鍵＝駕駛員技能（量表滿了才能用），Esc 暫停
    // 駕駛員技能（照角色的大招）：弗爾斯勒＝強化大箭矢、伊爾舒＝揮砍前方（砍掉子彈）、薇薇拉＝周圍噴孢子、觀知命＝陰陽陣
    //   霍夫曼＝移動時留下殘影（期間不吃子彈）、瑪莉卡＝前方火焰鞭打、蒼幽＝蝠鱝夫人、巴斯提安＝前方舉盾
    //   悠魘＝觸手＋全畫面黑色抖動馬賽克、紅色 ERROR，秒殺所有敵機（這一趟只能用一次）
    // 隱藏：STAGE 1 往左下角的角落一直靠 18 秒 → 隱藏的機庫，拿到「她的戰機」（殘機 10、一直往前發射雷射、沒有駕駛員；只能在 STAGE 1 用，不算排行榜）
    const GW = 480, GH = 640;
    const SKILL = {
      firsler: { name: "強化大箭矢", charge: 12 }, ilshu: { name: "揮砍前方", charge: 9 }, vivilla: { name: "周圍噴孢子", charge: 10 },
      guan: { name: "陰陽陣", charge: 13 }, hoffman: { name: "殘影閃現", charge: 13 }, marika: { name: "火焰鞭打", charge: 10 },
      cangyou: { name: "蝠鱝夫人", charge: 12 }, bastian: { name: "舉盾", charge: 11 }, youyan: { name: "夢想變身", charge: 8, once: true },
    };
    const kn = () => (trip.qdata.kn = trip.qdata.kn || {});
    function playStage(stage, done, opt = {}) {
      api.setBusy(true);
      api.pauseBgm?.();
      const music = new Audio("sounds/bgm-kn-stg.mp3"); music.loop = true; music.volume = R.CONFIG.bgmVolume;
      if (!api.isMuted()) music.play().catch(() => {});
      const her = !!opt.her, pid = her ? null : SKILL[CH.id] ? CH.id : "ilshu", SK = pid ? SKILL[pid] : null;
      const wrap = document.createElement("div");
      wrap.style.cssText = "position:absolute;inset:0;z-index:60;background:rgba(4,4,20,.92);display:flex;align-items:center;justify-content:center;gap:24px";
      wrap.innerHTML = `<canvas width="${GW}" height="${GH}" style="height:660px;width:auto;border:4px solid ${her ? "#ff8ac8" : "#5a6aff"};border-radius:6px;image-rendering:pixelated;background:#0a0a24"></canvas>
        <div style="color:#e8e8ff;font:700 14px/1.6 monospace;width:250px"><div class="kn-info"></div><div class="kn-btns" style="margin-top:14px;display:flex;flex-direction:column;gap:8px"></div></div>`;
      document.getElementById("wxStage").appendChild(wrap);
      const cv = wrap.querySelector("canvas"), g = cv.getContext("2d"), info = wrap.querySelector(".kn-info"), btns = wrap.querySelector(".kn-btns");
      const G = { stage, her, t: 0, lives: her ? 10 : 3, score: 0, miss: 0, cont: 0, pl: { x: GW / 2, y: GH - 80, inv: 0, fire: 0, trail: [] }, shots: [], eb: [], foes: [], boss: null, wave: 0, over: null, keys: {}, pause: false, fx: [],
        sp: 0, skill: null, corner: 0, laserT: 0 };
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
      function hurtBoss(n) { const B = G.boss; if (B && Number.isFinite(B.hp)) B.hp = Math.max(0, B.hp - n); }
      const clearBullets = (pred) => { G.eb = G.eb.filter((b) => !pred(b)); };
      function startBoss() {
        G.boss = { ...S.boss, x: GW / 2, y: -60, ty: 110, maxHp: S.boss.hp, t: 0, pat: 0, cd: 1.5, coreHp: S.boss.coin ? 50 : 0, coreOpen: S.boss.coin && (Q1.code || BAG.count(run.items, "bugCode") >= 3) };
        if (S.boss.coin) G.bossTimer = 0;
      }
      function hitPlayer() {
        if (G.pl.inv > 0 || G.over) return;
        if (G.skill?.kind === "blink") return;                                // 霍夫曼：殘影期間不吃子彈
        G.lives--; G.miss++; G.pl.inv = 2.2;
        G.fx.push({ x: G.pl.x, y: G.pl.y, t: 0, big: true });
        clearBullets((b) => Math.hypot(b.x - G.pl.x, b.y - G.pl.y) < 140);
        if (G.lives <= 0) G.over = "continue";
      }
      // ===== 駕駛員技能 =====
      function useSkill() {
        if (!SK || G.over || G.pause || G.sp < 1 || G.skill) return;
        if (SK.once && kn().errorUsed) return;
        G.sp = 0;
        const P = G.pl, k = pid;
        G.skill = { kind: { firsler: "arrow", ilshu: "slash", vivilla: "spore", guan: "taiji", hoffman: "blink", marika: "whip", cangyou: "manta", bastian: "shield", youyan: "error" }[k], t: 0, x: P.x, y: P.y };
        const sk = G.skill;
        sk.dur = { arrow: 1.0, slash: 0.35, spore: 2.0, taiji: 5, blink: 5, whip: 0.6, manta: 1.2, shield: 5, error: 2.4 }[sk.kind];
        if (sk.kind === "slash") { for (const f of G.foes) if (f.y < P.y && Math.hypot(f.x - P.x, f.y - P.y) < 170) hurtFoe(f, 8); if (G.boss && Math.hypot(G.boss.x - P.x, G.boss.y - P.y) < 200) hurtBoss(25); clearBullets((b) => b.y < P.y + 10 && Math.hypot(b.x - P.x, b.y - P.y) < 170); }
        if (sk.kind === "spore") { for (const f of G.foes) if (Math.hypot(f.x - P.x, f.y - P.y) < 150) hurtFoe(f, 6); clearBullets((b) => Math.hypot(b.x - P.x, b.y - P.y) < 150); }
        if (sk.kind === "error") {
          kn().errorUsed = true; save();
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
      function finish(result) {
        cancelAnimationFrame(G.raf); wrap.remove(); window.removeEventListener("keydown", kd, true); window.removeEventListener("keyup", ku);
        music.pause(); api.resumeBgm?.();
        api.setBusy(false);
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
      window.addEventListener("keydown", kd, true); window.addEventListener("keyup", ku);
      btns.addEventListener("click", (e) => {
        const a = e.target.closest("[data-kn]")?.dataset.kn;
        if (a === "cont") { if (run.gold < 10) return; run.gold -= 10; save(); api.renderHud(); G.cont++; G.lives = 3; G.score = 0; G.over = null; G.pl.inv = 2.5; }
        if (a === "quit") finish({ clear: false, score: G.score, cont: G.cont, her, gotHer: G.gotHer });
        if (a === "ok") finish({ clear: true, score: G.score, cont: G.cont, miss: G.miss, her, gotHer: G.gotHer });
        if (a === "pause") G.pause = !G.pause;
        if (a === "skill") useSkill();
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
        if (stage === 1 && !her && !kn().herPlane && P.x <= 17 && P.y >= GH - 21) { G.corner += dt; if (G.corner >= 18) { G.corner = 0; G.over = "hangar"; G.hangar = true; G.gotHer = true; kn().herPlane = true; save(); } }
        else G.corner = 0;
        // 射擊：她的戰機＝一直往前的雷射；一般＝自動射擊
        if (her) { if ((G.laserT -= dt) <= 0) { G.laserT = 0.06; for (const f of G.foes) if (Math.abs(f.x - P.x) < 22 && f.y < P.y) hurtFoe(f, 1); if (G.boss && Math.abs(G.boss.x - P.x) < 66 && G.boss.y < P.y) { const B = G.boss; if (B.coin && B.coreOpen && B.coreHp > 0) { B.coreHp--; if (B.coreHp <= 0) { B.hp = 320; B.maxHp = 320; } } else hurtBoss(1); } } }
        else if ((P.fire -= dt) <= 0) { P.fire = 0.11; G.shots.push({ x: P.x - 7, y: P.y - 14 }, { x: P.x + 7, y: P.y - 14 }); }
        for (const s of G.shots) s.y -= 640 * dt;
        G.shots = G.shots.filter((s) => s.y > -10 && !s.dead);
        if (!her && SK && !(SK.once && kn().errorUsed)) G.sp = Math.min(1, G.sp + dt / SK.charge);
        stepSkill(dt);
        // 出怪
        if (!G.boss && G.t < S.len && G.t > G.wave * 3.4 + 0.5) spawnWave();
        if (!G.boss && G.t >= S.len && !G.foes.length) startBoss();
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
        for (let i = 0; i < 50; i++) { const x = (i * 97) % GW, y = (i * 61 + G.t * (40 + (i % 3) * 40)) % GH; g.fillStyle = i % 3 ? (her ? "#aa5a8a" : "#5a6aaa") : "#fff"; g.fillRect(x, y, 2, 2); }
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
        for (const b of G.eb) { g.fillStyle = b.col; g.beginPath(); g.arc(b.x, b.y, b.r, 0, Math.PI * 2); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(b.x, b.y, b.r * 0.45, 0, Math.PI * 2); g.fill(); }
        for (const f of G.fx) { g.strokeStyle = `rgba(255,216,74,${1 - f.t / 0.6})`; g.lineWidth = 3; g.beginPath(); g.arc(f.x, f.y, (f.big ? 60 : 24) * (0.3 + f.t / 0.6), 0, Math.PI * 2); g.stroke(); }
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
        if (G.t < 2.5 && !G.over) { g.font = "900 22px monospace"; g.fillText(her ? `${S.name}・她的戰機` : S.name, GW / 2, GH / 2 - 20); g.font = "700 13px monospace"; g.fillText(her ? "方向鍵移動・雷射一直往前射" : "方向鍵／WASD 移動・Shift 慢速・空白鍵 技能", GW / 2, GH / 2 + 10); }
        if (G.pause) { g.font = "900 26px monospace"; g.fillText("PAUSE", GW / 2, GH / 2); }
        if (G.over === "continue") { g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(0, 0, GW, GH); g.fillStyle = "#fff"; g.font = "900 30px monospace"; g.fillText("CONTINUE?", GW / 2, GH / 2 - 20); g.font = "900 48px monospace"; g.fillText(String(9 - (Math.floor(now / 1000) % 10)), GW / 2, GH / 2 + 40); }
        if (G.over === "clear") { g.fillStyle = "rgba(0,0,0,.5)"; g.fillRect(0, 0, GW, GH); g.fillStyle = "#ffd84a"; g.font = "900 30px monospace"; g.fillText("STAGE CLEAR!", GW / 2, GH / 2 - 10); g.fillStyle = "#fff"; g.font = "700 16px monospace"; g.fillText(her ? "（她的戰機：不計入排行榜）" : `SCORE ${G.score}`, GW / 2, GH / 2 + 22); }
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
      // 側邊（內容有變才重畫，按鈕才點得到）
      let lastInfo = "", lastBtns = "";
      function side() {
        const rival = MAP.rivalScore, b = best()[stage] || 0;
        const skillLine = her ? "駕駛員　（沒有）" : SK ? `技能　${SK.name}　${SK.once && kn().errorUsed ? "（已經用過了）" : G.sp >= 1 ? "<b style='color:#5aff9a'>就緒（空白鍵）</b>" : `${Math.floor(G.sp * 100)}%`}` : "";
        const inf = `<div style="font-size:18px;color:${her ? "#ff8ac8" : "#ffd84a"}">${esc(S.name)}</div>
          <div>SCORE　${her ? "—（不計分）" : G.score}</div><div>HI-SCORE　${Math.max(rival, b)}${rival >= b ? "（???）" : ""}</div>
          <div>殘機　${G.lives > 5 ? `✈ × ${G.lives}` : "✈".repeat(Math.max(0, G.lives))}</div><div>接關　${G.cont}</div><div>金幣　${run.gold}</div><div>${skillLine}</div>`;
        const bt = G.over === "continue" ? `<button type="button" class="primary" data-kn="cont" ${run.gold < 10 ? "disabled" : ""}>投幣接關（10 金幣）</button><button type="button" class="ghost" data-kn="quit">放棄</button>`
          : G.over === "clear" ? `<button type="button" class="primary" data-kn="ok">回到機台裡</button>`
          : G.over === "stuck" ? `<button type="button" class="ghost" data-kn="quit">離開</button>`
          : G.over === "hangar" ? `<button type="button" class="primary" data-kn="hangar">收下她的戰機，繼續 STAGE 1</button>`
          : `${!her && SK ? `<button type="button" class="ghost" data-kn="skill" ${G.sp >= 1 && !(SK.once && kn().errorUsed) ? "" : "disabled"}>駕駛員技能（空白鍵）</button>` : ""}<button type="button" class="ghost" data-kn="pause">${G.pause ? "繼續" : "暫停（Esc）"}</button><button type="button" class="ghost" data-kn="quit">離開關卡</button>`;
        if (inf !== lastInfo) { lastInfo = inf; info.innerHTML = inf; }
        if (bt !== lastBtns) { lastBtns = bt; btns.innerHTML = bt; }
      }
      G.raf = requestAnimationFrame(frame);
      R._knGame = G;            // 測試用
      return G;
    }
    const px = (g, x, y, s, rows, pal) => { for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) { const c = pal[rows[j][i]]; if (c) { g.fillStyle = c; g.fillRect(x + i * s, y + j * s, s, s); } } };

    // ================= 關卡門 =================
    function gatePanel(gt) {
      const b = best()[gt.stage], herOk = gt.stage === 1 && kn().herPlane;
      api.openPanel(gt.name, `<p class="wx-p">一道發光的關卡門。門上寫著：<b>${esc(gt.name)}</b>${gt.stage === 3 ? "——門縫裡傳出嚼硬幣的聲音" : ""}。</p>
        <p class="tv-note">射擊小遊戲：方向鍵／WASD 移動（Shift 慢速），自動射擊，<b>空白鍵＝駕駛員技能</b>（${esc(SKILL[CH.id]?.name || "揮砍前方")}；量表滿了才能用）。殘機 3 架；用完可以投 10 金幣接關。${b ? `<br>你在這一關的最高分：${b}` : ""}${herOk ? "<br>她的戰機：殘機 10 架、一直往前發射雷射、沒有駕駛員（沒有技能）。只能在這一關用，不算排行榜" : ""}</p>
        <div class="tv-row"><button type="button" class="primary" data-act="knPlay" data-s="${gt.stage}">投幣開始</button>${herOk ? `<button type="button" class="primary" data-act="knPlay" data-s="1" data-her="1" style="background:#e85aa8;border-color:#e85aa8">用她的戰機出擊</button>` : ""}<button type="button" class="ghost" data-close>先不要</button></div>`);
    }
    function play(stage, her) {
      api.closePanel();
      playStage(stage, (r) => {
        const k = kn(); k.best = k.best || {};
        if (r.clear && !r.her) k.best[stage] = Math.max(k.best[stage] || 0, r.score);     // 她的戰機不算排行榜
        save(); api.renderHud();
        if (r.gotHer && !r.clear) return toast("拿到了「她的戰機」！STAGE 1 的關卡門可以選它出擊");
        if (!r.clear) return toast(stage === 3 && !Q1.code ? "頭目吃了硬幣，打不倒……也許機台裡有什麼「除錯」的方法" : "沒有過關。再來一次吧");
        toast(`STAGE ${stage} CLEAR！${r.her ? "（她的戰機）" : `SCORE ${r.score}`}`);
        if (stage === 3 && K.is("KN59810-01", "knStage3")) K.adv("KN59810-01", "頭目吐出了硬幣！回去找投幣口的看守者");
        if (stage === 1 && K.is("KN59810-03", "knStage1")) K.adv("KN59810-03", "STAGE 1 過關了。回去找小藍");
        if (stage === 2 && K.is("KN59810-02", "knScore")) {
          if (r.score > MAP.rivalScore) { rivalAppears(r.score); K.adv("KN59810-02", "刷新了最高分！回去找 AAA"); }
          else toast(`分數 ${r.score}，還沒超過 ??? 的 ${MAP.rivalScore}。No Miss 和剩下的殘機都會加很多分`);
        }
      }, { her });
    }
    // ??? ：粉色短髮、紅色的雙角
    const RIVAL = { name: "???", color: "#e88ab8", face: "？" };
    function rivalAppears(score) {
      api.dlgSeq("排行榜", [
        { n: RIVAL, text: `（排行榜的第一行閃了一下：${score}——你的名字。接著，排行榜後面走出一個人。）` },
        { n: RIVAL, text: "（粉色的短髮，頭上兩支紅色的角。她看了看排行榜，又看了看你，笑了。）" },
        { n: RIVAL, text: "……被你刷新了啊。這台機台，我寫的時候可是很用心的。" },
        { n: RIVAL, text: "名字？現在還不能告訴你。等你走到更遠的地方——很遠很遠的地方——你就會知道了。" },
        { n: RIVAL, text: "（她按了三次 A，在排行榜第二行留下「???」，然後像沒存檔的進度一樣，消失了。）" },
      ], `<button type="button" class="primary" data-close>……</button>`);
    }

    // ================= 除錯碼、問 ??? 的事 =================
    function glitch(gl) {
      if (Q1.glitch[gl.id]) return toast("這格已經不閃了");
      if (!K.is("KN59810-01", "knBug")) return toast("地上的格子一閃一閃的，看起來像是亂碼");
      Q1.glitch[gl.id] = true;
      BAG.add(run.items, "bugCode", 1); save(); api.renderHud();
      api.sfx?.("sounds/robot-move.mp3");
      const n = Object.keys(Q1.glitch).length;
      if (n >= 3) { Q1.code = true; save(); K.adv("KN59810-01", "三段除錯碼都拼起來了：「SHOW_COIN」。去 STAGE 3"); }
      else toast(`撿到一段除錯碼（${n} / 3）：「${["SHOW_", "CO", "IN"][n - 1]}……」`);
    }
    const ASK = {
      p2: ["???？我看過她玩。她玩的時候，從來不看螢幕——好像她早就知道子彈會從哪裡來。", "她的頭髮是粉色的，短短的。……還有，她頭上有兩支紅色的角。我以為是髮飾，可是會動。"],
      cat: ["喵。（嗶）", "（像素貓叼來一根粉紅色的頭髮，放在你腳邊。）"],
      keeper: ["那個 ??? 從來沒有投過幣。她每次都是直接出現在關卡裡面。", "好像整台機台都是她的一樣。"],
    };
    function npcExtra(n) {
      if (ASK[n.id] && K.is("KN59810-02", "knAsk")) return `<button type="button" class="ghost dlg-ask" data-act="knAsk" data-n="${n.id}"><b>委託</b>：問問「???」的事${Q2.asked[n.id] ? "（問過了）" : ""}</button>`;
      return "";
    }
    function ask(id) {
      const n = npc(id);
      Q2.asked[id] = true; save(); api.renderHud();
      api.dlgSeq(n.name, ASK[id].map((t) => ({ n, text: t })), `<button type="button" class="ghost" data-close>謝謝</button>`);
      if (Object.keys(ASK).every((k) => Q2.asked[k])) K.adv("KN59810-02", `問到了：粉色的短髮、紅色的雙角。去 STAGE 2 打出比 ${MAP.rivalScore} 更高的分數`);
    }

    // ================= 點擊、選項 =================
    function click(p) {
      const gt = MAP.gates.find((x) => K.hit(p, x, 80));
      if (gt) { K.reach({ x: gt.x, y: gt.y + 100 }, 70, () => gatePanel(gt)); return true; }
      const gl = MAP.glitches.find((x) => K.hit(p, x, 40));
      if (gl) { K.reach(gl, 70, () => glitch(gl)); return true; }
      if (p.x > MAP.board.x - 20 && p.y > MAP.board.y && p.y < MAP.board.y + MAP.board.h) { K.reach({ x: MAP.board.x - 60, y: p.y }, 90, boardPanel); return true; }
      return false;
    }
    function boardPanel() {
      const rows = [["???", MAP.rivalScore], ["AAA", MAP.rivalScore - 100], ["CAT", 51200], ["2P", 0]];
      const mine = Math.max(...Object.values(best()), 0);
      if (mine) rows.push([CH.name, mine]);
      rows.sort((a, b) => b[1] - a[1]);
      api.openPanel("排行榜", `<div style="font:700 15px/1.9 monospace;background:#0a0a24;color:#e8e8ff;padding:14px 18px;border-radius:8px">${rows.map((r, i) => `<div style="display:flex;justify-content:space-between;${r[0] === CH.name ? "color:#ffd84a" : ""}"><span>${i + 1}. ${esc(r[0])}</span><span>${r[1]}</span></div>`).join("")}</div>
        <p class="tv-note">第一名的 ??? 只差 AAA 100 分。……好像是故意的。</p>`);
    }
    function act(a, b) {
      if (a === "knPlay") { play(+b.dataset.s, b.dataset.her === "1"); return true; }
      if (a === "knAsk") { ask(b.dataset.n); return true; }
      return false;
    }

    // ================= 畫面 =================
    function drawFloor(now, x0, y0) {
      ctx.fillStyle = "#0e0e2a"; ctx.fillRect(x0, y0, 1280, 720);
      ctx.strokeStyle = "rgba(90,120,255,.16)"; ctx.lineWidth = 1;
      for (let x = Math.floor(x0 / 64) * 64; x < x0 + 1280; x += 64) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + 720); ctx.stroke(); }
      for (let y = Math.floor(y0 / 64) * 64; y < y0 + 720; y += 64) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + 1280, y); ctx.stroke(); }
      // 標題畫面的廣場
      const T = MAP.title;
      ctx.fillStyle = "rgba(90,106,255,.12)"; ctx.fillRect(T.x - 420, T.y - 140, 840, 280);
      text("KYABERUBASUNO", T.x, T.y - 30, "#ff5ac8", 54, 900);
      text("克亞貝魯巴斯諾", T.x, T.y + 20, "#8ab0ff", 20, 900);
      if (Math.floor(now / 600) % 2) text("PRESS START", T.x, T.y + 80, "#ffffff", 18, 900);
      // 關卡門
      for (const gt of MAP.gates) {
        ctx.fillStyle = "#14143a"; ctx.fillRect(gt.x - 90, gt.y - 140, 180, 200);
        ctx.strokeStyle = gt.col; ctx.lineWidth = 6; ctx.strokeRect(gt.x - 90, gt.y - 140, 180, 200);
        ctx.fillStyle = gt.col; ctx.globalAlpha = 0.25 + 0.15 * Math.sin(now / 300 + gt.stage); ctx.fillRect(gt.x - 84, gt.y - 134, 168, 188); ctx.globalAlpha = 1;
        text(gt.name, gt.x, gt.y - 40, "#ffffff", 22, 900);
        if (best()[gt.stage]) text(`BEST ${best()[gt.stage]}`, gt.x, gt.y, "#ffd84a", 13, 900);
        if (gt.stage === 3 && !trip.done.includes("KN59810-01")) text("（嚼——嚼——）", gt.x, gt.y + 30, "#e83a8a", 12, 900);
      }
      // 排行榜
      const Bd = MAP.board; ctx.fillStyle = "#0a0a24"; ctx.fillRect(Bd.x, Bd.y, Bd.w, Bd.h); ctx.strokeStyle = "#5aff9a"; ctx.lineWidth = 4; ctx.strokeRect(Bd.x, Bd.y, Bd.w, Bd.h);
      text("HIGH SCORE", Bd.x + Bd.w / 2, Bd.y + 40, "#5aff9a", 16, 900);
      text("1. ???", Bd.x + Bd.w / 2, Bd.y + 90, "#ffd84a", 15, 900); text(String(MAP.rivalScore), Bd.x + Bd.w / 2, Bd.y + 114, "#ffd84a", 14, 900);
      text("2. AAA", Bd.x + Bd.w / 2, Bd.y + 160, "#e8e8ff", 15, 900);
      // 接關畫面的房間
      const C = MAP.continueRoom; ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(C.x, C.y, C.w, C.h);
      text("CONTINUE?", C.x + C.w / 2, C.y + 60, "#ffffff", 26, 900);
      text(trip.done.includes("KN59810-03") ? "GAME CLEAR" : String(9 - (Math.floor(now / 1000) % 10)), C.x + C.w / 2, C.y + 130, trip.done.includes("KN59810-03") ? "#5aff9a" : "#ffd84a", 46, 900);
      // 亂碼格子
      for (const gl of MAP.glitches) {
        if (Q1.glitch[gl.id]) continue;
        for (let i = 0; i < 9; i++) { ctx.fillStyle = ["#5aff9a", "#ff5ac8", "#5a6aff", "#ffd84a"][(i + Math.floor(now / 90)) % 4]; ctx.globalAlpha = 0.4 + 0.6 * ((Math.floor(now / 70) + i) % 3 === 0 ? 1 : 0.3); ctx.fillRect(gl.x - 30 + (i % 3) * 20, gl.y - 30 + Math.floor(i / 3) * 20, 18, 18); }
        ctx.globalAlpha = 1;
        if (K.is("KN59810-01", "knBug")) api.marker(gl.x, gl.y - 50, now, "#f2c200");
      }
      // 投幣口
      ctx.fillStyle = "#3a3a5a"; ctx.fillRect(MAP.portal.x - 40, MAP.portal.y + 40, 80, 14); text("INSERT COIN", MAP.portal.x, MAP.portal.y + 78, "#ffd84a", 13, 900);
    }
    function draw(now) {
      if (K.is("KN59810-01", "knStage3")) api.marker(MAP.gates[2].x, MAP.gates[2].y - 170, now, "#f2c200");
      if (K.is("KN59810-02", "knScore")) api.marker(MAP.gates[1].x, MAP.gates[1].y - 170, now, "#f2c200");
      if (K.is("KN59810-03", "knStage1")) api.marker(MAP.gates[0].x, MAP.gates[0].y - 170, now, "#f2c200");
    }
    function stageText(id, st) {
      if (st?.type === "knBug") return `${st.text}（${Object.keys(Q1.glitch).length} / 3）`;
      if (st?.type === "knAsk") return `${st.text}（${Object.keys(Q2.asked).length} / 3）`;
      if (st?.type === "knScore") return `${st.text}（你的最高分 ${best()[2] || 0}）`;
      return null;
    }
    function mini(dot, now) {
      const bl = `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`;
      if (K.is("KN59810-01", "knBug")) for (const gl of MAP.glitches) if (!Q1.glitch[gl.id]) dot(gl.x, gl.y, 4, bl);
      for (const gt of MAP.gates) dot(gt.x, gt.y, 4, gt.col);
    }
    function drawEnemy(e, now, red) { return K.enemyArt(e, now, red, { jets: ["pixelJet", 2], jets3: ["pixelJet", 3], grunts: ["pixelGrunt", 2] }); }
    return { click, act, npcExtra, draw, drawFloor, drawEnemy, stageText, mini, _play: playStage };
  };
})();
