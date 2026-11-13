/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/lg00412-forge.js": "20261113212359" });
// #LG00412-2 赫菲斯托斯的鍛造場（傳說的道路的裏時空）
//   入口：傳說的道路東北角的火山裂縫。完成傳說的道路全部五張委託（這一輪冒險裡做過就算）才會打開
//   三個任務拿素材（這一趟有效）：
//     鼓風（熔爐）：拉風箱讓爐溫留在金色區間——待在區間裡的時間＝神火的品質
//     採礦（礦坑）：三塊礦石出現在隨機的地方、種類隨機：隕鐵＝投射、青銅＝扇形、黑曜石＝投擲物；旁邊的熔岩口會噴發
//     淬火（水槽）：刀身的顏色一直在變，變成「櫻桃紅」的瞬間按下去——越準品質越好（每次三刀，取最好的）
//   鐵砧：選一個自己的技能、一種形式（要有那種礦石）、命名 → 打出一把武器（自訂寶物）：用那個技能時附加額外傷害
//     額外傷害 = 8 + 神火 × 0.07 + 淬火 × 0.07（8～22）；一趟只能打一把
//   挑戰（地圖上直接打，不會進入戰鬥）：
//     熔爐飛龍：用身上六個煙囪噴氣飛行、用嘴吐火（扇形，打到扣血）。每吐一次火會變熱，熱到滿就「過熱」墜地 6 秒
//       打牠會隨機掉金屬：青銅＞白銀＞黃金＞精金（越好越難掉）；沒過熱的時候，掉出來的金屬會被牠馬上燒掉
//       牠也會朝地上的金屬、寶石吐火——被火燒到的戰利品就沒了
//     晶簇烏龜：打牠有機率掉寶石（打完會縮進殼裡一下）
//   鐵砧上可以鑲一種金屬（綁定的那一招本身的傷害提高）和最多三顆寶石（附加攻擊的傷害、數量、射程）
(function () {
  const R = (window.RPG = window.RPG || {});
  const base = R.WorldHooks.LG00412;
  const LG_IDS = ["LG00412-01", "LG00412-02", "LG00412-03", "LG00412-04", "LG00412-05"];
  const DOOR = { x: 3560, y: 420 };
  const ORES = {
    projectile: { name: "隕鐵", col: "#5a6a8a", glow: "#8ab0ff", form: "投射" },
    fan: { name: "青銅", col: "#b8783a", glow: "#ffc87a", form: "扇形" },
    throw: { name: "黑曜石", col: "#1d1a24", glow: "#c86aff", form: "投擲物" },
  };

  R.WorldHooks.LG00412 = function (api) {
    if (api.MAP.forge) return forge(api);
    // ===== 傳說的道路：東北角的火山裂縫 =====
    const H = base(api);
    const { trip, me, toast, text, dist } = api, ctx = api.ctx();
    const doneAll = () => { const a = R.Adventure?.get(); const set = new Set([...(a?.done || []), ...(trip.done || [])]); return LG_IDS.every((id) => set.has(id)); };
    const left = () => { const a = R.Adventure?.get(); const set = new Set([...(a?.done || []), ...(trip.done || [])]); return LG_IDS.filter((id) => !set.has(id)).length; };
    let hintAt = 0;
    return Object.assign({}, H, {
      update(dt, now) {
        H.update?.(dt, now);
        if (dist(me.x, me.y, DOOR.x, DOOR.y) < 60) {
          if (doneAll()) api.changeScene("forge", R.MAPS["LG00412/forge"].arrive, "裏時空 #LG00412-2 赫菲斯托斯的鍛造場");
          else if (Date.now() > hintAt) { hintAt = Date.now() + 5000; toast(`裂縫深處傳來打鐵的聲音……（還差 ${left()} 張傳說的道路的委託，裂縫才會打開）`); }
        }
      },
      draw(now) {
        H.draw?.(now);
        const open = doneAll(), x = DOOR.x, y = DOOR.y;
        ctx.save();
        ctx.fillStyle = "#5a4a3a"; ctx.beginPath(); ctx.moveTo(x - 140, y + 60); ctx.lineTo(x - 50, y - 120); ctx.lineTo(x + 50, y - 120); ctx.lineTo(x + 140, y + 60); ctx.closePath(); ctx.fill();
        ctx.fillStyle = open ? `rgba(255,${120 + Math.sin(now / 200) * 40},30,.95)` : "#2a1a14";
        ctx.beginPath(); ctx.moveTo(x - 10, y - 90); ctx.lineTo(x + 18, y - 40); ctx.lineTo(x - 6, y); ctx.lineTo(x + 22, y + 50); ctx.lineTo(x - 22, y + 50); ctx.lineTo(x - 30, y); ctx.lineTo(x - 8, y - 40); ctx.closePath(); ctx.fill();
        if (open) for (let i = 0; i < 5; i++) { const k = ((now / 900) + i / 5) % 1; ctx.fillStyle = `rgba(255,170,60,${1 - k})`; ctx.beginPath(); ctx.arc(x - 10 + Math.sin(i * 2 + now / 300) * 20, y - 90 - k * 80, 3, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
        text(open ? "通往裏時空 #LG00412-2" : "冒煙的裂縫", x, y - 140, open ? "#c8641a" : "#5a4a3a", 13, 900);
        if (open) api.marker(x, y - 170, now, "#ff8a2a");
      },
      mini(dot, now) { H.mini?.(dot, now); if (doneAll()) dot(DOOR.x, DOOR.y, 5, `rgba(255,138,42,${0.6 + 0.4 * Math.sin(now / 200)})`); },
      click(p) { if (dist(p.x, p.y, DOOR.x, DOOR.y) < 90) { api.goTo({ x: DOOR.x, y: DOOR.y + 10 }, { type: "hook", reach: 30, fn: () => {} }); return true; } return H.click?.(p) || false; },
    });
  };

  // ================= 裏時空：赫菲斯托斯的鍛造場 =================
  function forge(api) {
    const { MAP, trip, run, me, CH, toast, text, save, dist, esc } = api;
    const ctx = api.ctx();
    trip.qdata = trip.qdata || {};
    const F = (trip.qdata.forge = trip.qdata.forge || {});
    if (!F.ores) {
      const spots = MAP.oreSpots.slice().sort(() => Math.random() - 0.5).slice(0, 3), types = Object.keys(ORES);
      F.ores = spots.map((p, i) => ({ id: `o${i}`, x: p.x, y: p.y, type: types[Math.floor(Math.random() * types.length)], got: false, vent: 0 }));
      F.fire = 0; F.quench = 0; F.forged = null; save();
    }
    const heph = MAP.npcs.find((n) => n.id === "hephaestus");
    const hephN = { name: heph.name, color: heph.color, face: heph.face };
    const near = (p, r) => dist(me.x, me.y, p.x, p.y) < r;
    const reach = (p, r, fn) => { if (near(p, r)) fn(); else api.goTo({ x: p.x, y: p.y }, { type: "hook", reach: r - 20, fn }); };
    // 熔岩口：每塊礦石旁邊一個，隨機的時間噴發（先冒泡一秒）
    const vents = F.ores.map((o) => ({ x: o.x + 70, y: o.y - 40, t: 2 + Math.random() * 4, phase: "idle" }));
    let iframe = 0;
    function hurt(pct, label) {
      if (Date.now() < iframe) return;
      iframe = Date.now() + 900;
      const n = Math.min(Math.round(api.maxHp() * pct), Math.max(0, run.hp - 1));
      if (n <= 0) return;
      run.hp -= n; save(); api.renderHud();
      api.fx.push({ k: "num", x: me.x, y: me.y - 40, text: `-${n}`, color: "#e53935", t: performance.now(), dur: 900 });
      toast(label);
    }
    let game = null;       // 正在玩的小遊戲（鼓風、淬火）
    // ===== 挑戰：熔爐飛龍、晶簇烏龜 =====
    const MET = R.Items.METALS, GEM = R.Items.GEMS;
    F.metals = F.metals || {}; F.gems = F.gems || {};
    const roll = (T) => { let r = Math.random() * Object.values(T).reduce((a, x) => a + x.w, 0); for (const [k, x] of Object.entries(T)) { r -= x.w; if (r <= 0) return k; } return Object.keys(T)[0]; };
    const M = MAP.mine;
    const wyrms = [{ x: 700, y: 1100 }, { x: 1700, y: 1200 }].map((p, i) => ({ id: i, x: p.x, y: p.y, hx: p.x, hy: p.y, a: Math.PI / 2, heat: 0, phase: "fly", t: 2 + i * 1.5, hitCd: 0, flash: 0, tgt: null }));
    const turtles = [{ x: 450, y: 1250 }, { x: 1200, y: 1250 }, { x: 1950, y: 1180 }].map((p, i) => ({ id: i, x: p.x, y: p.y, dir: Math.random() * 6.28, hide: 0, hitCd: 0, flash: 0 }));
    let loot = [];         // 地上的戰利品 { kind: metal|gem, type, x, y, t }
    let burnFx = [];
    const inCone = (w, x, y) => { const d = dist(w.hx, w.hy, x, y); if (d > 260) return false; let da = Math.abs(Math.atan2(y - w.hy, x - w.hx) - w.a) % (Math.PI * 2); if (da > Math.PI) da = Math.PI * 2 - da; return da < 0.5; };
    function burn(it, why) { loot = loot.filter((x) => x !== it); burnFx.push({ x: it.x, y: it.y, t: performance.now() }); if (why) toast(why); }
    function stepCreatures(dt) {
      for (const w of wyrms) {
        w.hitCd -= dt; w.flash -= dt; w.t -= dt;
        // 頭的位置（嘴巴在下面）
        w.hx = w.x + Math.cos(w.a) * 70; w.hy = w.y + Math.sin(w.a) * 70;
        if (w.phase === "overheat") { if (w.t <= 0) { w.phase = "fly"; w.heat = 0; w.t = 2; toast("熔爐飛龍的煙囪重新冒煙了——牠冷卻下來了"); } continue; }
        const target = (() => {
          // 附近有掉在地上的戰利品：先去燒它
          const l = loot.filter((x) => dist(x.x, x.y, w.x, w.y) < 420).sort((p, q) => dist(p.x, p.y, w.x, w.y) - dist(q.x, q.y, w.x, w.y))[0];
          if (l) return l;
          return dist(me.x, me.y, w.x, w.y) < 520 ? me : null;
        })();
        if (w.phase === "fly") {
          // 在礦坑上空盤旋；有目標就飛到牠旁邊
          const tx = target ? target.x - Math.cos(w.a) * 160 + (w.id ? 130 : -130) : M.x + M.w / 2 + Math.sin(performance.now() / 3000 + w.id * 2) * (M.w / 2 - 160);
          const ty = target ? target.y - 170 : M.y + 200 + Math.cos(performance.now() / 2400 + w.id) * 160;
          const L = Math.hypot(tx - w.x, ty - w.y) || 1, sp = 130;
          if (L > 8) { w.x += ((tx - w.x) / L) * sp * dt; w.y += ((ty - w.y) / L) * sp * dt; }
          const want = target ? Math.atan2(target.y - w.hy, target.x - w.hx) : Math.PI / 2;
          w.a += Math.max(-dt * 2.5, Math.min(dt * 2.5, ((want - w.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI));
          if (target && w.t <= 0 && dist(target.x, target.y, w.hx, w.hy) < 280) { w.phase = "aim"; w.t = 0.8; w.tgt = target; }
        } else if (w.phase === "aim") {
          if (w.t <= 0) { w.phase = "breath"; w.t = 1.4; }
        } else if (w.phase === "breath") {
          w.heat = Math.min(100, w.heat + 22 * dt);
          if (inCone(w, me.x, me.y)) hurt(0.1, "被熔爐飛龍的火噴到了！");
          for (const it of loot.slice()) if (inCone(w, it.x, it.y)) burn(it, `${it.kind === "gem" ? GEM[it.type].name : MET[it.type].name}被熔爐飛龍的火燒掉了！`);
          if (w.t <= 0) {
            if (w.heat >= 100) { w.phase = "overheat"; w.t = 6; toast("熔爐飛龍過熱了！牠掉到地上動不了——現在打牠，掉下來的金屬不會被燒掉"); }
            else { w.phase = "fly"; w.t = 1.6 + Math.random(); }
          }
        }
      }
      for (const t of turtles) {
        t.hitCd -= dt; t.flash -= dt;
        if (t.hide > 0) { t.hide -= dt; continue; }
        t.dir += (Math.random() - 0.5) * dt;
        const nx = t.x + Math.cos(t.dir) * 28 * dt, ny = t.y + Math.sin(t.dir) * 28 * dt;
        if (nx < M.x + 60 || nx > M.x + M.w - 60 || ny < M.y + 60 || ny > M.y + M.h - 60 || api.blocked(nx, ny, 30)) t.dir += Math.PI * 0.7; else { t.x = nx; t.y = ny; }
      }
      // 撿戰利品：走過去碰到
      for (const it of loot.slice()) if (dist(me.x, me.y, it.x, it.y) < 44) {
        loot = loot.filter((x) => x !== it);
        if (it.kind === "metal") F.metals[it.type] = (F.metals[it.type] || 0) + 1; else F.gems[it.type] = (F.gems[it.type] || 0) + 1;
        save(); api.renderHud();
        toast(`撿到了${it.kind === "metal" ? MET[it.type].name : GEM[it.type].name}！（${it.kind === "metal" ? MET[it.type].desc : GEM[it.type].desc}）`);
      }
    }
    // 地圖上的普攻打到牠們
    function basicHit(test) {
      for (const w of wyrms) {
        if (w.hitCd > 0 || !test(w.x, w.y, 46)) continue;
        w.hitCd = 0.5; w.flash = 0.2;
        if (Math.random() > (w.phase === "overheat" ? 0.6 : 0.45)) continue;
        const type = roll(MET), it = { kind: "metal", type, x: w.x + (Math.random() - 0.5) * 80, y: w.y + 60 + Math.random() * 40, t: performance.now() };
        if (w.phase === "overheat") { loot.push(it); toast(`熔爐飛龍掉下了${MET[type].name}！`); }
        else { burnFx.push({ x: it.x, y: it.y, t: performance.now() }); toast(`熔爐飛龍掉下了${MET[type].name}——馬上被牠肚子裡的火燒掉了！（要先讓牠吐火吐到過熱）`); }
      }
      for (const t of turtles) {
        if (t.hitCd > 0 || t.hide > 0 || !test(t.x, t.y, 36)) continue;
        t.hitCd = 0.4; t.flash = 0.2; t.hide = 2.2;
        if (Math.random() < 0.4) { const type = roll(GEM); loot.push({ kind: "gem", type, x: t.x + (Math.random() - 0.5) * 70, y: t.y + 40, t: performance.now() }); toast(`晶簇烏龜的背上掉下了一顆${GEM[type].name}！快撿——別讓熔爐飛龍燒掉`); }
        else toast("晶簇烏龜縮進殼裡了");
      }
    }

    // ===== 更新 =====
    function update(dt) {
      if (api.inRect(MAP.exit, me.x, me.y)) { api.changeScene(null, { x: DOOR.x, y: DOOR.y + 130 }, "回到傳說的道路"); return; }
      for (const v of vents) {
        v.t -= dt;
        if (v.phase === "idle" && v.t <= 0) { v.phase = "warn"; v.t = 1; }
        else if (v.phase === "warn" && v.t <= 0) { v.phase = "burst"; v.t = 0.9; }
        else if (v.phase === "burst") { if (dist(me.x, me.y, v.x, v.y) < 95) hurt(0.12, "熔岩噴出來了！好燙！"); if (v.t <= 0) { v.phase = "idle"; v.t = 3 + Math.random() * 3; } }
      }
      if (game && !document.getElementById(game.el)) { clearInterval(game.timer); game = null; }
      stepCreatures(dt);
    }
    const done = () => ({ fire: F.fire > 0, ore: F.ores.some((o) => o.got), quench: F.quench > 0 });

    // ===== 鼓風 =====
    function bellows() {
      if (F.forged) return toast("今天的爐火已經用來打過一把了");
      const st = { T: 30, t: 0, inZone: 0, dur: 20, over: false };
      const html = () => `<div id="fgBellows"><p class="wx-p">赫菲斯托斯頭也不回：「爐溫留在金色那一段。太冷打不動，太熱會燒壞。」</p>
        <div style="position:relative;height:28px;background:linear-gradient(90deg,#3a2a4a,#c83a1a 55%,#ffd84a 75%,#ffffff);border:2px solid #1d1d1f;border-radius:6px;margin:8px 0">
          <div style="position:absolute;left:60%;width:20%;top:-4px;bottom:-4px;border:3px solid #ffd84a;border-radius:4px;box-shadow:0 0 8px #ffd84a"></div>
          <div id="fgMark" style="position:absolute;top:-8px;width:6px;height:40px;background:#1d1d1f;left:30%"></div></div>
        <p class="tv-note" id="fgInfo">剩 20 秒・在金色區間裡 0.0 秒</p>
        <div class="tv-row"><button type="button" class="primary" data-act="fgPump" id="fgPump">拉風箱（空白鍵）</button><button type="button" class="ghost" data-close>不打了</button></div></div>`;
      api.openPanel("熔爐和風箱", html());
      const tick = () => {
        if (st.over) return;
        st.t += 0.05; st.T = Math.max(0, st.T - 18 * 0.05);
        if (st.T >= 60 && st.T <= 80) st.inZone += 0.05;
        const m = document.getElementById("fgMark"), inf = document.getElementById("fgInfo");
        if (!m) return;
        m.style.left = `calc(${Math.min(100, st.T)}% - 3px)`;
        inf.textContent = `剩 ${Math.max(0, st.dur - st.t).toFixed(1)} 秒・在金色區間裡 ${st.inZone.toFixed(1)} 秒・${st.T < 60 ? "太冷" : st.T > 80 ? (st.T > 95 ? "太熱了！" : "有點熱") : "剛好"}`;
        if (st.t >= st.dur) {
          st.over = true; clearInterval(game.timer);
          const q = Math.min(100, Math.round((st.inZone / 14) * 100));
          F.fire = Math.max(F.fire, q); save(); api.renderHud();
          api.dlg("熔爐和風箱", hephN, q >= 80 ? "「……還算像樣。」爐子裡的火是白金色的。" : q >= 40 ? "「火候普通。能用。」" : "「這是在烤地瓜嗎？」", `<button type="button" class="primary" data-act="fgBellows">再拉一次</button><button type="button" class="ghost" data-close>夠了</button>`, `神火的品質：${q}（取最好的一次：${F.fire}）`);
        }
      };
      game = { el: "fgBellows", st, timer: setInterval(tick, 50), pump: () => { if (!st.over) st.T = Math.min(100, st.T + 13); } };
    }
    // ===== 淬火 =====
    // 刀身的顏色在一圈裡變：暗紅 → 櫻桃紅 → 橘 → 黃 → 白（一圈 2.4 秒）。按下去的瞬間越接近櫻桃紅越好
    const HEAT = [{ at: 0, c: [90, 10, 10], n: "暗紅" }, { at: 0.22, c: [210, 20, 40], n: "櫻桃紅" }, { at: 0.45, c: [255, 120, 20], n: "橘" }, { at: 0.7, c: [255, 220, 60], n: "黃" }, { at: 0.9, c: [255, 255, 240], n: "白" }, { at: 1, c: [90, 10, 10], n: "暗紅" }];
    const heatCol = (k) => { for (let i = 0; i < HEAT.length - 1; i++) { const a = HEAT[i], b = HEAT[i + 1]; if (k >= a.at && k <= b.at) { const f = (k - a.at) / (b.at - a.at); return a.c.map((v, j) => Math.round(v + (b.c[j] - v) * f)); } } return HEAT[0].c; };
    function quench() {
      if (F.forged) return toast("水槽裡的水還在冒泡。今天已經打過一把了");
      if (!F.fire) return api.dlg("淬火的水槽", hephN, "「爐子都還沒熱，你要淬什麼？先去拉風箱。」", `<button type="button" class="primary" data-close>好</button>`);
      const st = { tries: 3, best: 0, t0: performance.now(), period: 2400 * (0.85 + Math.random() * 0.3) };
      api.openPanel("淬火的水槽", `<div id="fgQuench"><p class="wx-p">刀身在鉗子上慢慢變色。<b>變成櫻桃紅的那一瞬間</b>，把它插進水裡。</p>
        <div style="display:flex;align-items:center;gap:14px;margin:10px 0"><div id="fgBlade" style="width:260px;height:26px;border:2px solid #1d1d1f;border-radius:4px 14px 14px 4px"></div>
        <div style="width:28px;height:26px;border:2px solid #1d1d1f;background:rgb(210,20,40)" title="櫻桃紅"></div><span class="tv-note">← 要的是這個顏色</span></div>
        <p class="tv-note" id="fgQInfo">還有 3 刀</p>
        <div class="tv-row"><button type="button" class="primary" data-act="fgDip">淬火！（空白鍵）</button><button type="button" class="ghost" data-close>不淬了</button></div></div>`);
      const tick = () => { const el = document.getElementById("fgBlade"); if (!el) return; const k = ((performance.now() - st.t0) % st.period) / st.period, c = heatCol(k); el.style.background = `rgb(${c.join(",")})`; };
      game = { el: "fgQuench", st, timer: setInterval(tick, 30), dip() {
        const k = ((performance.now() - st.t0) % st.period) / st.period, d = Math.min(Math.abs(k - 0.22), 1 - Math.abs(k - 0.22));
        const q = Math.max(0, Math.round(100 - d * 520));
        st.best = Math.max(st.best, q); st.tries--;
        api.fx.push({ k: "ring", x: MAP.trough.x, y: MAP.trough.y, r: 60, color: "#8ad8ff", t: performance.now(), dur: 600 });
        const inf = document.getElementById("fgQInfo");
        if (st.tries > 0) { if (inf) inf.textContent = `嗤——！這一刀：${q}${q >= 85 ? "（漂亮）" : q >= 50 ? "" : "（太早或太晚了）"}・還有 ${st.tries} 刀`; st.t0 = performance.now() - Math.random() * st.period; return; }
        clearInterval(game.timer);
        F.quench = Math.max(F.quench, st.best); save(); api.renderHud();
        api.dlg("淬火的水槽", hephN, st.best >= 85 ? "「……嗯。這個顏色，我年輕的時候也抓不準。」" : st.best >= 50 ? "「硬度夠了。」" : "「軟趴趴的。再來。」", `<button type="button" class="primary" data-act="fgQuench">再淬一次</button><button type="button" class="ghost" data-close>夠了</button>`, `這次最好的一刀：${st.best}（取最好的一次：${F.quench}）`);
      } };
    }
    // ===== 採礦 =====
    function mineOre(o) {
      if (o.got) return;
      o.got = true; save(); api.renderHud();
      const O = ORES[o.type];
      api.fx.push({ k: "ring", x: o.x, y: o.y, r: 60, color: O.glow, t: performance.now(), dur: 700 });
      toast(`敲下了一塊${O.name}！（可以打成「${O.form}」的武器）`);
    }
    // ===== 鐵砧：打武器 =====
    let pick = { skill: null, form: null, name: "", metal: null, gems: [] };
    function anvil(msg) {
      if (F.forged) return api.dlg("鐵砧", hephN, `「${F.forged}」打好了。……今天的爐火用完了。下次再來。`, `<button type="button" class="primary" data-close>好</button>`);
      const D = done(), ok = D.fire && D.ore && D.quench;
      if (!ok) {
        const need = [!D.fire && "神火（熔爐：拉風箱）", !D.ore && "礦石（礦坑：隕鐵／青銅／黑曜石）", !D.quench && "淬火（水槽）"].filter(Boolean);
        return api.dlg("鐵砧", hephN, `「武器不是我給你的，是你自己打的。」他用槌子敲了敲鐵砧，「還缺：${need.join("、")}。」`, `<button type="button" class="primary" data-close>好</button>`);
      }
      const skills = Object.values(CH.skills || {}).filter((s) => s.key);
      const forms = [...new Set(F.ores.filter((o) => o.got).map((o) => o.type))];
      if (!pick.form || !forms.includes(pick.form)) pick.form = forms[0];
      const dmg = Math.round(8 + F.fire * 0.07 + F.quench * 0.07);
      const build = R.Progress?.load(trip.char), full = (build?.items || []).length >= (R.Items?.SLOTS || 6);
      api.openPanel("鐵砧", `${msg ? `<p class="wx-p"><b>${esc(msg)}</b></p>` : ""}<p class="wx-p">赫菲斯托斯把槌子遞給你：「說吧，這把武器要跟著你的哪一招？」</p>
        <p class="tv-note">素材：神火 ${F.fire}・淬火 ${F.quench} → 額外傷害 <b>${dmg}</b></p>
        <div class="tv-note" style="margin:6px 0 2px">跟著哪一招（${esc(CH.name)}）</div><div class="tv-row" style="flex-wrap:wrap">${skills.map((s) => `<button type="button" class="${pick.skill === s.key ? "primary" : "ghost"}" data-act="fgSkill" data-k="${s.key}">${esc(s.slot)}・${esc(s.name)}</button>`).join("")}</div>
        <div class="tv-note" style="margin:8px 0 2px">形式（要有那種礦石）</div><div class="tv-row" style="flex-wrap:wrap">${Object.entries(ORES).map(([k, O]) => `<button type="button" class="${pick.form === k ? "primary" : "ghost"}" data-act="fgForm" data-k="${k}" ${forms.includes(k) ? "" : "disabled"}>${O.form}（${O.name}）</button>`).join("")}</div>
        <p class="tv-note">${esc(R.Items?.FORMS?.[pick.form]?.desc || "")}</p>
        <div class="tv-note" style="margin:8px 0 2px">鑲一種金屬（綁定的那一招本身的傷害提高；熔爐飛龍掉的）</div><div class="tv-row" style="flex-wrap:wrap"><button type="button" class="${!pick.metal ? "primary" : "ghost"}" data-act="fgMetal" data-k="">不鑲</button>${Object.entries(MET).map(([k, x]) => `<button type="button" class="${pick.metal === k ? "primary" : "ghost"}" data-act="fgMetal" data-k="${k}" ${F.metals[k] ? "" : "disabled"}>${x.name}（${x.desc}）×${F.metals[k] || 0}</button>`).join("")}</div>
        <div class="tv-note" style="margin:8px 0 2px">鑲寶石（最多 3 顆，強化附加攻擊；晶簇烏龜掉的）：${pick.gems.length ? pick.gems.map((g) => GEM[g].name).join("、") : "沒有"}</div><div class="tv-row" style="flex-wrap:wrap">${Object.entries(GEM).map(([k, x]) => { const used = pick.gems.filter((g) => g === k).length; return `<button type="button" class="ghost" data-act="fgGem" data-k="${k}" ${(F.gems[k] || 0) > used && pick.gems.length < 3 ? "" : "disabled"}>＋${x.name}（${x.desc}）剩 ${(F.gems[k] || 0) - used}</button>`; }).join("")}${pick.gems.length ? `<button type="button" class="ghost" data-act="fgGemClear">拔掉寶石</button>` : ""}</div>
        <label class="tv-note">武器的名字 <input id="fgName" maxlength="12" value="${esc(pick.name)}" placeholder="幫它取個名字" style="width:180px"></label>
        <div class="tv-row" style="margin-top:8px"><button type="button" class="primary" data-act="fgForge" ${pick.skill && pick.form && !full ? "" : "disabled"}>開始鍛造</button><button type="button" class="ghost" data-close>再想想</button></div>
        ${full ? `<p class="tv-note" style="color:#c62828">寶物欄滿了，先回酒館整理寶物欄</p>` : ""}`);
    }
    function doForge() {
      const skills = Object.values(CH.skills || {});
      const sk = skills.find((s) => s.key === pick.skill);
      if (!sk || !pick.form) return anvil("先選好招式和形式");
      const name = (pick.name || "").slice(0, 12) || `${ORES[pick.form].name}之${sk.name}`;
      const dmg = Math.round(8 + F.fire * 0.07 + F.quench * 0.07);
      const it = R.Items.createCustom({ kind: "forge", name, charId: CH.id, charName: CH.name, skill: sk.key, skillName: sk.name, form: pick.form, base: dmg, fire: F.fire, quench: F.quench, metal: pick.metal || null, gems: pick.gems.slice() });
      if (pick.metal) F.metals[pick.metal]--;
      for (const g0 of pick.gems) F.gems[g0]--;
      const g = R.Items.give(trip.char, it.id);
      F.forged = name; for (const o of F.ores) if (o.got && o.type === pick.form) { o.used = true; break; }
      save(); api.renderHud();
      api.sfx?.("sounds/bastian-impact-1.mp3");
      api.dlg("鐵砧", hephN, `噹——噹——噹。火星濺了滿地。赫菲斯托斯把打好的「${name}」舉到爐火前看了很久。「……拿去。它只認得你那一招。」`, `<button type="button" class="primary" data-close>收下</button>`, g.text);
    }
    function act(a, b) {
      const nm = document.getElementById("fgName"); if (nm) pick.name = nm.value.trim();
      if (a === "fgPump") { game?.pump?.(); return true; }
      if (a === "fgDip") { game?.dip?.(); return true; }
      if (a === "fgBellows") { bellows(); return true; }
      if (a === "fgQuench") { quench(); return true; }
      if (a === "fgSkill") { pick.skill = b.dataset.k; anvil(); return true; }
      if (a === "fgForm") { pick.form = b.dataset.k; anvil(); return true; }
      if (a === "fgForge") { doForge(); return true; }
      if (a === "fgMetal") { pick.metal = b.dataset.k || null; anvil(); return true; }
      if (a === "fgGem") { if (pick.gems.length < 3) pick.gems.push(b.dataset.k); anvil(); return true; }
      if (a === "fgGemClear") { pick.gems = []; anvil(); return true; }
      return false;
    }
    // 空白鍵：拉風箱／淬火
    const onKey = (e) => { if (e.key !== " " || !game) return; e.preventDefault(); e.stopPropagation(); if (game.pump) game.pump(); else game.dip?.(); };
    window.addEventListener("keydown", onKey, true);
    function click(p) {
      if (dist(p.x, p.y, MAP.furnace.x, MAP.furnace.y) < 140) { reach({ x: MAP.furnace.x, y: MAP.furnace.y + 110 }, 120, bellows); return true; }
      if (dist(p.x, p.y, MAP.trough.x, MAP.trough.y) < 110) { reach({ x: MAP.trough.x, y: MAP.trough.y + 80 }, 110, quench); return true; }
      if (dist(p.x, p.y, MAP.anvil.x, MAP.anvil.y) < 90) { reach({ x: MAP.anvil.x, y: MAP.anvil.y + 90 }, 110, () => anvil()); return true; }
      const o = F.ores.find((x) => !x.got && dist(p.x, p.y, x.x, x.y) < 50);
      if (o) { reach(o, 90, () => mineOre(o)); return true; }
      return false;
    }
    function talk(n) {
      if (n.id !== "hephaestus") return false;
      const D = done();
      api.dlg(n.name, hephN, F.forged ? `「${F.forged}」好用嗎？……不用告訴我。用壞了再來。` : `「熔爐在西邊，礦坑在南邊，淬火槽在東邊。三樣都弄好了，到鐵砧來。」（${["神火", "礦石", "淬火"].filter((_, i) => [D.fire, D.ore, D.quench][i]).join("、") || "什麼都還沒有"}）`, `<button type="button" class="primary" data-close>好</button>`);
      return true;
    }

    // ===== 畫面 =====
    function drawFloor(now, x0, y0) {
      ctx.fillStyle = "#2a1a16"; ctx.fillRect(x0, y0, 1280, 720);
      ctx.fillStyle = "rgba(255,120,40,.05)"; for (let i = 0; i < 90; i++) { const x = (i * 811) % MAP.w, y = (i * 467) % MAP.h; ctx.beginPath(); ctx.ellipse(x, y, 60, 22, 0, 0, Math.PI * 2); ctx.fill(); }
      // 礦坑的地面
      const M = MAP.mine; ctx.fillStyle = "#1f1412"; api.rr(M.x, M.y, M.w, M.h, 40); ctx.fill();
      text("礦坑", M.x + 80, M.y + 30, "#a8786a", 15, 900);
      // 熔岩池
      for (const L of MAP.lava) { const g = ctx.createRadialGradient(L.x, L.y, 5, L.x, L.y, L.r); g.addColorStop(0, "#ffd84a"); g.addColorStop(0.5, "#ff6a1a"); g.addColorStop(1, "#8a1a0a"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(L.x, L.y, L.r + Math.sin(now / 400 + L.x) * 3, 0, Math.PI * 2); ctx.fill(); }
      // 熔爐和風箱
      const fu = MAP.furnace; ctx.fillStyle = "#4a3a34"; api.rr(fu.x - 130, fu.y - 120, 260, 150, 14); ctx.fill();
      ctx.fillStyle = `rgba(255,${130 + F.fire},40,${0.6 + Math.sin(now / 150) * 0.2})`; api.rr(fu.x - 60, fu.y - 60, 120, 70, 30); ctx.fill();
      ctx.fillStyle = "#7a4a2a"; ctx.beginPath(); ctx.moveTo(fu.x + 140, fu.y - 30); ctx.lineTo(fu.x + 220, fu.y - 70 + Math.sin(now / 300) * 10); ctx.lineTo(fu.x + 220, fu.y + 10 - Math.sin(now / 300) * 10); ctx.closePath(); ctx.fill();
      text("熔爐・風箱", fu.x, fu.y + 60, "#ffc87a", 13, 900);
      // 鐵砧
      const an = MAP.anvil; ctx.fillStyle = "#3a3a42"; ctx.beginPath(); ctx.moveTo(an.x - 80, an.y - 20); ctx.lineTo(an.x + 90, an.y - 20); ctx.quadraticCurveTo(an.x + 60, an.y, an.x + 30, an.y + 4); ctx.lineTo(an.x + 40, an.y + 40); ctx.lineTo(an.x - 40, an.y + 40); ctx.lineTo(an.x - 30, an.y + 4); ctx.lineTo(an.x - 60, an.y + 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#5a5a64"; ctx.fillRect(an.x - 80, an.y - 26, 170, 8);
      text("鐵砧", an.x, an.y + 64, "#c8c8d8", 13, 900);
      // 淬火的水槽
      const tr = MAP.trough; ctx.fillStyle = "#5a4a3a"; api.rr(tr.x - 90, tr.y - 40, 180, 70, 10); ctx.fill(); ctx.fillStyle = "#3a6a8a"; api.rr(tr.x - 78, tr.y - 30, 156, 48, 8); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.5)"; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(tr.x - 40 + i * 40, tr.y - 10 - ((now / 30 + i * 20) % 20), 3, 0, Math.PI * 2); ctx.fill(); }
      text("淬火的水槽", tr.x, tr.y + 54, "#8ad8ff", 13, 900);
      // 出口
      const ex = MAP.exit; ctx.fillStyle = "rgba(200,180,140,.3)"; ctx.fillRect(ex.x, ex.y, ex.w, ex.h); text("回到傳說的道路", ex.x + ex.w / 2, ex.y - 12, "#e8d8b8", 12, 900);
    }
    // 熔爐飛龍：灰色的熔爐身體、正面一扇燒著火的鐵柵窗、兩側六根煙囪（噴氣飛行），長脖子下面是長著尖角的頭骨（嘴巴吐火）
    function drawWyrm(w, now) {
      const over = w.phase === "overheat", bob = over ? 0 : Math.sin(now / 300 + w.id) * 6, lift = over ? 0 : 1;
      ctx.save();
      // 影子
      ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(w.x, w.y + (over ? 70 : 130), 50, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.translate(w.x, w.y + bob);
      ctx.rotate(w.a - Math.PI / 2);
      if (w.flash > 0) ctx.globalAlpha = 0.6;
      const gray = "#7a7a80", dark = "#1d1d1f";
      // 六根煙囪＋噴出來的氣
      for (const [sx, sy] of [[-1, -44], [-1, -8], [-1, 26], [1, -44], [1, -8], [1, 26]]) {
        ctx.fillStyle = gray; ctx.strokeStyle = dark; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.rect(sx * 44 - (sx < 0 ? 22 : 0), sy - 8, 22, 16); ctx.fill(); ctx.stroke();
        if (lift || over) for (let i = 0; i < 3; i++) { const k = ((((now / 500) + i / 3 + sy / 7) % 1) + 1) % 1; ctx.fillStyle = over ? `rgba(80,60,60,${0.5 * (1 - k)})` : `rgba(220,220,220,${0.45 * (1 - k)})`; ctx.beginPath(); ctx.arc(sx * (66 + k * 30), sy - k * 10, 6 + k * 8, 0, Math.PI * 2); ctx.fill(); }
      }
      // 熔爐身體
      ctx.fillStyle = over ? "#a85a3a" : gray; ctx.strokeStyle = dark; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-34, -64); ctx.lineTo(34, -64); ctx.lineTo(46, -50); ctx.lineTo(46, 30); ctx.lineTo(26, 50); ctx.lineTo(-26, 50); ctx.lineTo(-46, 30); ctx.lineTo(-46, -50); ctx.closePath(); ctx.fill(); ctx.stroke();
      // 燒著火的鐵柵窗
      ctx.fillStyle = "#c8c8cc"; ctx.fillRect(-26, -48, 52, 76); ctx.strokeRect(-26, -48, 52, 76);
      const fl = over ? "#ffe08a" : "#ff8a2a"; ctx.fillStyle = fl; ctx.beginPath(); ctx.moveTo(-12, 20); ctx.quadraticCurveTo(-16, -10 + Math.sin(now / 90) * 4, 0, -36); ctx.quadraticCurveTo(14, -10, 12, 20); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#5a5a60"; ctx.lineWidth = 3; for (const x of [-14, -2, 10, 22]) { ctx.beginPath(); ctx.moveTo(x, -46); ctx.lineTo(x - 4, 26); ctx.stroke(); }
      // 脖子和頭骨
      ctx.fillStyle = gray; ctx.strokeStyle = dark; ctx.lineWidth = 3;
      ctx.fillRect(-6, 50, 12, 40); ctx.strokeRect(-6, 50, 12, 40);
      ctx.beginPath(); ctx.moveTo(-22, 90); ctx.lineTo(22, 90); ctx.lineTo(18, 132); ctx.lineTo(-18, 132); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-20, 92); ctx.lineTo(-34, 56); ctx.lineTo(-12, 90); ctx.moveTo(20, 92); ctx.lineTo(34, 56); ctx.lineTo(12, 90); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = dark; for (const x of [-9, 0, 9]) { ctx.beginPath(); ctx.moveTo(x, 110); ctx.lineTo(x, 130); ctx.stroke(); }
      ctx.fillStyle = "#d8d8dc"; ctx.beginPath(); ctx.moveTo(0, 96); ctx.lineTo(5, 104); ctx.lineTo(0, 110); ctx.lineTo(-5, 104); ctx.closePath(); ctx.fill();
      ctx.restore();
      // 吐火：預告（虛線扇形）和火焰
      if (w.phase === "aim" || w.phase === "breath") {
        ctx.save(); ctx.translate(w.hx, w.hy + bob);
        if (w.phase === "aim") { ctx.strokeStyle = `rgba(255,106,26,${0.5 + 0.5 * Math.sin(now / 60)})`; ctx.setLineDash([8, 6]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 260, w.a - 0.5, w.a + 0.5); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]); }
        else { const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 260); g.addColorStop(0, "rgba(255,240,160,.95)"); g.addColorStop(0.5, "rgba(255,120,30,.8)"); g.addColorStop(1, "rgba(200,30,10,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 230 + Math.sin(now / 50) * 30, w.a - 0.5, w.a + 0.5); ctx.closePath(); ctx.fill(); }
        ctx.restore();
      }
      // 熱度條
      const k = w.heat / 100; ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(w.x - 40, w.y - 96, 80, 7); ctx.fillStyle = over ? "#ffe08a" : k > 0.7 ? "#ff3a1a" : "#ff8a2a"; ctx.fillRect(w.x - 40, w.y - 96, 80 * (over ? 1 : k), 7);
      text(over ? "過熱！（現在打牠）" : "熔爐飛龍", w.x, w.y - 106, over ? "#ffe08a" : "#ffc87a", 12, 900);
    }
    // 晶簇烏龜：灰色的硬殼身體、背上長著紅黃粉綠藍的晶簇
    function drawTurtle(t, now) {
      const hide = t.hide > 0, step = hide ? 0 : Math.sin(now / 160 + t.id) * 3;
      ctx.save(); ctx.translate(t.x, t.y);
      if (Math.cos(t.dir) < 0) ctx.scale(-1, 1);
      if (t.flash > 0) ctx.globalAlpha = 0.6;
      ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(0, 26, 50, 10, 0, 0, Math.PI * 2); ctx.fill();
      const C = [["#f2e01a", -26, -60], ["#e8262c", -12, -54], ["#f4a8c8", 0, -72], ["#a8e01a", 14, -58], ["#1aa0e8", 30, -54]];
      for (const [c, x, y] of C) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - 10, -14); ctx.lineTo(x, y); ctx.lineTo(x + 10, -14); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = "#c8c8cc"; ctx.strokeStyle = "#6a6a70"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-44, 10); ctx.quadraticCurveTo(-40, -20, 0, -20); ctx.quadraticCurveTo(40, -20, 46, 6); ctx.lineTo(60, 8); ctx.lineTo(46, 16); ctx.lineTo(-44, 16); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (!hide) {
        ctx.beginPath(); ctx.moveTo(-44, -6); ctx.lineTo(-66, 4); ctx.lineTo(-62, 14); ctx.lineTo(-42, 14); ctx.closePath(); ctx.fill(); ctx.stroke();      // 頭
        for (const x of [-30, 26]) { ctx.fillRect(x - 6, 14, 12, 12 + step); ctx.strokeRect(x - 6, 14, 12, 12 + step); }
      }
      ctx.restore();
      text(hide ? "（縮進殼裡）" : "晶簇烏龜", t.x, t.y - 80, "#e8e8f0", 11, 900);
    }
    function drawLoot(now) {
      for (const it of loot) {
        const c = it.kind === "metal" ? MET[it.type].col : GEM[it.type].col, bob = Math.sin(now / 250 + it.x) * 3;
        ctx.fillStyle = c + "44"; ctx.beginPath(); ctx.arc(it.x, it.y, 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = c; ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 2;
        if (it.kind === "metal") { ctx.beginPath(); ctx.moveTo(it.x - 14, it.y + 6 + bob); ctx.lineTo(it.x - 8, it.y - 6 + bob); ctx.lineTo(it.x + 8, it.y - 6 + bob); ctx.lineTo(it.x + 14, it.y + 6 + bob); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        else { ctx.beginPath(); ctx.moveTo(it.x, it.y - 12 + bob); ctx.lineTo(it.x + 10, it.y + bob); ctx.lineTo(it.x, it.y + 12 + bob); ctx.lineTo(it.x - 10, it.y + bob); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        text(it.kind === "metal" ? MET[it.type].name : GEM[it.type].name, it.x, it.y - 24, "#fff", 11, 900);
      }
      burnFx = burnFx.filter((b) => now - b.t < 900);
      for (const b of burnFx) { const k = (now - b.t) / 900; ctx.fillStyle = `rgba(255,120,30,${1 - k})`; ctx.beginPath(); ctx.arc(b.x, b.y - k * 30, 16 + k * 20, 0, Math.PI * 2); ctx.fill(); text("燒掉了", b.x, b.y - 30 - k * 30, `rgba(255,220,160,${1 - k})`, 11, 900); }
    }
    function draw(now) {
      drawLoot(now);
      for (const t of turtles) drawTurtle(t, now);
      for (const w of wyrms) drawWyrm(w, now);
      // 礦石
      for (const o of F.ores) {
        if (o.got) continue;
        const O = ORES[o.type];
        ctx.fillStyle = "#4a3a34"; ctx.beginPath(); ctx.ellipse(o.x, o.y + 6, 34, 20, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = O.col; ctx.beginPath(); ctx.moveTo(o.x - 16, o.y + 4); ctx.lineTo(o.x - 6, o.y - 26); ctx.lineTo(o.x + 10, o.y - 14); ctx.lineTo(o.x + 18, o.y + 4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = O.glow; ctx.globalAlpha = 0.5 + 0.4 * Math.sin(now / 250 + o.x); ctx.beginPath(); ctx.arc(o.x - 2, o.y - 12, 4, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        text(O.name, o.x, o.y - 40, O.glow, 12, 900);
      }
      // 熔岩口
      for (const v of vents) {
        ctx.fillStyle = "#1a0a08"; ctx.beginPath(); ctx.ellipse(v.x, v.y, 26, 12, 0, 0, Math.PI * 2); ctx.fill();
        if (v.phase === "warn") { ctx.strokeStyle = `rgba(255,106,26,${0.5 + 0.5 * Math.sin(now / 60)})`; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.arc(v.x, v.y, 95, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
        if (v.phase === "burst") { const g = ctx.createRadialGradient(v.x, v.y, 5, v.x, v.y, 95); g.addColorStop(0, "rgba(255,230,120,.95)"); g.addColorStop(1, "rgba(255,80,20,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(v.x, v.y, 95, 0, Math.PI * 2); ctx.fill(); }
      }
      const D = done();
      if (!F.forged) {
        if (!D.fire) api.marker(MAP.furnace.x, MAP.furnace.y - 150, now, "#ff8a2a");
        if (!D.quench && D.fire) api.marker(MAP.trough.x, MAP.trough.y - 70, now, "#ff8a2a");
        if (D.fire && D.ore && D.quench) api.marker(MAP.anvil.x, MAP.anvil.y - 60, now, "#f2c200");
      }
    }
    function mini(dot, now) {
      for (const o of F.ores) if (!o.got) dot(o.x, o.y, 4, ORES[o.type].glow);
      for (const w of wyrms) dot(w.x, w.y, 5, w.phase === "overheat" ? "#ffe08a" : "#ff6a1a");
      for (const t of turtles) dot(t.x, t.y, 4, "#c8c8cc");
      for (const it of loot) dot(it.x, it.y, 3, "#ffffff");
      dot(MAP.anvil.x, MAP.anvil.y, 4, "#f2c200");
    }
    return { update, click, act, talk, draw, drawFloor, mini, basicHit, stageText: () => null, _dbg: { wyrms, turtles, get loot() { return loot; } } };
  }
})();
