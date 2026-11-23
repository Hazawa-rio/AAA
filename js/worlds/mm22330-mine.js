/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/mm22330-mine.js": "20261123215910" });
// #MM22330 或許是魔法森林・礦井（自由探索，不算委託）
//   地面（精靈村東南角）：
//     礦井入口：走進去就下到第 1 層。每次從地面下去都是新的礦洞（隨機結構）
//     礦井看守的裝備攤（時空裡的金幣）：礦燈（光圈變大；沒有礦燈下不去第 3 層）、採菇刀（採得快）、逃生繩（行囊裡用，直接回到地面）
//     菇婆的湯鍋：把採到的蘑菇（最多 5 朵）煮成一碗湯，能力加成持續整趟（像特調；再煮一碗會取代上一碗）
//   礦井裡：
//     越深越暗（光圈每層縮小）、魔物越多越危險（第 3 層以下有深處的菌絲獸）；第 5 層是最深處
//     蘑菇：點一下、站在旁邊採（要一點時間）；越深越會長出稀有的蘑菇
//     受困的礦工：有機率出現；挖開落石救出來會給金幣和一朵蘑菇
(function () {
  const R = (window.RPG = window.RPG || {});
  const base = R.WorldHooks.MM22330;
  const SHAFT = { x: 2560, y: 1960 }, STALL = { x: 2340, y: 2040 }, POT = { x: 2080, y: 1790 };
  const GEAR = {
    lamp: { name: "礦燈", price: 40, desc: "礦井裡的光圈變大很多。沒有礦燈的話，第 3 層以下黑到什麼都看不見（下不去）" },
    knife: { name: "採菇刀", price: 25, desc: "採蘑菇快很多（2 秒 → 0.6 秒）" },
    rope: { name: "逃生繩", price: 20, desc: "放進行囊。在礦井裡使用，直接拉回地面（用完就沒了）", item: "escapeRope" },
  };
  const M0 = () => ({ seed: 0, depth: 1, gear: {}, shrooms: {}, picked: {}, rescued: {}, rescuedN: 0, deepest: 0 });

  R.WorldHooks.MM22330 = function (api) {
    const { trip } = api;
    trip.qdata = trip.qdata || {};
    const M = (trip.qdata.mine = Object.assign(M0(), trip.qdata.mine || {}));
    if (api.MAP.mine) return mine(api, M);
    return surface(api, M);
  };

  // ================= 地面：礦井入口、裝備攤、湯鍋 =================
  function surface(api, M) {
    const { MAP, run, me, BAG, toast, text, save, dist } = api, ctx = api.ctx();
    const Mi = R.Mine;
    // 礦井口的提燈、湯鍋的爐火也算光源（地面是暗的）
    if (!MAP.lights.some((l) => l.mine)) MAP.lights.push({ x: SHAFT.x - 60, y: SHAFT.y, r: 200, col: "#ffd88a", mine: true }, { x: POT.x, y: POT.y, r: 150, col: "#ff9a5a", mine: true });
    const H = base(api);
    const K = R.BKit(api);
    let pick = {};
    const total = () => Object.values(pick).reduce((a, b) => a + b, 0);

    function openStall() {
      const rows = Object.entries(GEAR).map(([id, g]) => {
        const have = id === "rope" ? `行囊裡 ${BAG.count(run.items, g.item)} 條` : M.gear[id] ? "已經有了" : "";
        const can = id === "rope" ? run.gold >= g.price : !M.gear[id] && run.gold >= g.price;
        return `<div class="tv-row" style="justify-content:space-between;align-items:center;gap:10px;margin:6px 0"><div><b>${g.name}</b>（${g.price} 金幣）${have ? `・<span class="dim">${have}</span>` : ""}<div class="tv-note">${g.desc}</div></div><button type="button" class="primary" data-act="mineBuy" data-id="${id}"${can ? "" : " disabled"}>買</button></div>`;
      }).join("");
      api.openPanel("礦井看守・老鐵的裝備攤", `<p class="wx-p">「下去之前先準備好。底下的東西，看得到你，你看不到牠。」</p>${rows}
        <p class="tv-note">身上的金幣：${run.gold}。裝備只在這一趟有效。目前最深到過第 ${M.deepest || 0} 層、救出 ${M.rescuedN} 位礦工</p>
        <div class="tv-row" style="justify-content:flex-end"><button type="button" class="ghost" data-close>離開</button></div>`);
    }
    function openPot() {
      const have = Object.entries(M.shrooms).filter(([, n]) => n > 0);
      const b = Mi.soupBonus(pick);
      const rows = have.length ? have.map(([id, n]) => {
        const s = Mi.SHROOMS[id], p = pick[id] || 0;
        return `<div class="tv-row" style="justify-content:space-between;align-items:center;gap:10px;margin:6px 0"><div><b style="color:${s.col}">${s.name}</b>（${s.label}）・有 ${n} 朵</div><div><button type="button" data-act="soupSub" data-id="${id}"${p ? "" : " disabled"}>－</button> <b>${p}</b> <button type="button" data-act="soupAdd" data-id="${id}"${p < n && total() < Mi.SOUP_MAX ? "" : " disabled"}>＋</button></div></div>`;
      }).join("") : `<p class="tv-note">還沒有蘑菇。礦井入口在東南角，下去採一些回來吧。</p>`;
      const cur = run.soup ? `現在喝著：${run.soup.text}` : "現在沒有喝湯";
      api.openPanel("菇婆的湯鍋", `<p class="wx-p">「蘑菇湯呢，不是越多越好，是放對的。一碗最多五朵。」</p>${rows}
        <p class="tv-note">這一碗：${total() ? Mi.soupText(b) || "（沒有效果）" : "還沒放蘑菇"}（${total()} / ${Mi.SOUP_MAX}）。效果持續整趟冒險；再煮一碗會取代上一碗。${cur}</p>
        <div class="tv-row" style="justify-content:flex-end"><button type="button" class="ghost" data-close>離開</button><button type="button" class="primary" data-act="soupCook"${total() ? "" : " disabled"}>煮成一碗湯</button></div>`);
    }
    function act(a, btn) {
      const id = btn.dataset.id;
      if (a === "mineBuy") {
        const g = GEAR[id]; if (!g || run.gold < g.price) return true;
        if (id === "rope") { const r = BAG.add(run.items, g.item, 1); if (!r) { toast("行囊放不下了"); return true; } }
        else { if (M.gear[id]) return true; M.gear[id] = true; }
        run.gold -= g.price; save(); api.renderHud(); toast(`買了${g.name}`); openStall(); return true;
      }
      if (a === "soupAdd") { if ((pick[id] || 0) < (M.shrooms[id] || 0) && total() < Mi.SOUP_MAX) pick[id] = (pick[id] || 0) + 1; openPot(); return true; }
      if (a === "soupSub") { if (pick[id]) pick[id]--; openPot(); return true; }
      if (a === "soupCook") {
        if (!total()) return true;
        for (const [k, n] of Object.entries(pick)) M.shrooms[k] = Math.max(0, (M.shrooms[k] || 0) - n);
        const bonus = Mi.soupBonus(pick);
        run.soup = { adds: Object.assign({}, pick), bonus, text: Mi.soupText(bonus) || "沒有效果" };
        pick = {}; save(); api.renderHud(); api.closePanel();
        toast(`喝下一碗熱騰騰的蘑菇湯：${run.soup.text}（持續整趟）`);
        return true;
      }
      return H.act?.(a, btn) || false;
    }
    return Object.assign({}, H, {
      act,
      update(dt, now) {
        H.update?.(dt, now);
        if (dist(me.x, me.y, SHAFT.x, SHAFT.y) < 50) {
          M.seed = 1 + Math.floor(Math.random() * 1e9); M.depth = 1; M.deepest = Math.max(M.deepest, 1);
          api.changeScene("mine", Mi.gen(M.seed, 1).entry, "礦井・第 1 層");
        }
      },
      click(p) {
        if (dist(p.x, p.y, STALL.x, STALL.y) < 70) { K.reach({ x: STALL.x, y: STALL.y - 60 }, 90, openStall); return true; }
        if (dist(p.x, p.y, POT.x, POT.y) < 60) { K.reach({ x: POT.x, y: POT.y + 60 }, 90, () => { pick = {}; openPot(); }); return true; }
        if (dist(p.x, p.y, SHAFT.x, SHAFT.y) < 70) { api.goTo({ x: SHAFT.x, y: SHAFT.y }, { type: "hook", reach: 20, fn: () => {} }); return true; }
        return H.click?.(p) || false;
      },
      drawFloor(now, x0, y0) {
        H.drawFloor?.(now, x0, y0);
        // 礦井口
        ctx.fillStyle = "#4a3a2a"; ctx.fillRect(SHAFT.x - 70, SHAFT.y - 50, 140, 100);
        ctx.fillStyle = "#0a0608"; ctx.fillRect(SHAFT.x - 54, SHAFT.y - 36, 108, 72);
        ctx.strokeStyle = "#8a6a3a"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(SHAFT.x - 60, SHAFT.y - 50); ctx.lineTo(SHAFT.x - 60, SHAFT.y - 110); ctx.lineTo(SHAFT.x + 60, SHAFT.y - 110); ctx.lineTo(SHAFT.x + 60, SHAFT.y - 50); ctx.stroke();
        ctx.strokeStyle = "#c8b89a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(SHAFT.x, SHAFT.y - 110); ctx.lineTo(SHAFT.x, SHAFT.y - 10 + Math.sin(now / 600) * 6); ctx.stroke();
        text("礦井（通往深處）", SHAFT.x, SHAFT.y - 124, "#ffd88a", 13, 900);
        // 裝備攤
        ctx.fillStyle = "#6a4a2a"; ctx.fillRect(STALL.x - 60, STALL.y - 30, 120, 50); ctx.fillStyle = "#c8a04a"; ctx.fillRect(STALL.x - 66, STALL.y - 44, 132, 16);
        ctx.fillStyle = "#ffd88a"; ctx.beginPath(); ctx.arc(STALL.x - 30, STALL.y - 6, 9, 0, Math.PI * 2); ctx.fill();   // 礦燈
        ctx.strokeStyle = "#c8c0b0"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(STALL.x + 10, STALL.y - 16); ctx.lineTo(STALL.x + 40, STALL.y + 4); ctx.stroke();
        K.human(STALL.x, STALL.y - 74, "#6a5a4a", "鐵", now, { k: 1 });
        text("礦井看守・老鐵的裝備攤", STALL.x, STALL.y + 40, "#ffd88a", 12, 900);
        // 湯鍋
        ctx.fillStyle = "#ff8a3a"; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(POT.x - 18 + i * 18, POT.y + 30 + Math.sin(now / 120 + i) * 2, 8, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = "#2a2a30"; ctx.beginPath(); ctx.ellipse(POT.x, POT.y + 6, 44, 30, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#c89a5a"; ctx.beginPath(); ctx.ellipse(POT.x, POT.y - 10, 38, 12, 0, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 3; i++) { const k = ((now / 1400) + i / 3) % 1; ctx.fillStyle = `rgba(240,230,220,${0.4 * (1 - k)})`; ctx.beginPath(); ctx.arc(POT.x - 14 + i * 14, POT.y - 20 - k * 50, 8 + k * 6, 0, Math.PI * 2); ctx.fill(); }
        text("菇婆的湯鍋（蘑菇湯）", POT.x, POT.y - 74, "#ffd88a", 12, 900);
      },
      mini(dot, now) { H.mini?.(dot, now); dot(SHAFT.x, SHAFT.y, 5, "#ffd88a"); dot(POT.x, POT.y, 4, "#ff9a5a"); },
    });
  }

  // ================= 礦井裡 =================
  function mine(api, M) {
    const { MAP, trip, run, me, BAG, toast, text, save, dist } = api, ctx = api.ctx();
    const Mi = R.Mine, K = R.BKit(api), Lv = MAP.level, depth = MAP.depth, seed = MAP.seed;
    const C = Mi.CELL, COLS = Mi.COLS, ROWS = Mi.ROWS;
    const wall = (x, y) => { const i = Math.floor(x / C), j = Math.floor(y / C); return i < 0 || j < 0 || i >= COLS || j >= ROWS || Lv.grid[j * COLS + i] === 1; };
    const key = (id) => `${seed}-${depth}-${id}`;
    const lamp = () => !!M.gear.lamp;
    const lightR = () => Math.max(lamp() ? 170 : 90, (lamp() ? 380 : 250) - depth * (lamp() ? 30 : 35));
    let harvest = null, hProg = 0, dig = 0, digging = false;
    // 一到這一層就站在樓梯上：先離開一點才會再觸發
    let armUp = dist(me.x, me.y, Lv.entry.x, Lv.entry.y) > 120, armDown = !Lv.down || dist(me.x, me.y, Lv.down.x, Lv.down.y) > 120, warned = 0;
    M.depth = depth; M.deepest = Math.max(M.deepest || 0, depth);
    if (M.seed !== seed) M.seed = seed;
    save();
    setTimeout(() => toast(`礦井・第 ${depth} 層${depth === Mi.MAX_DEPTH ? "（最深處）" : ""}${lamp() ? "" : "・沒有礦燈，很暗"}。採到的蘑菇：${Object.values(M.shrooms).reduce((a, b) => a + b, 0)} 朵`), 400);

    // 洞穴先畫在一張大圖上（每一格都畫太慢）
    const cave = document.createElement("canvas"); cave.width = MAP.w; cave.height = MAP.h;
    (() => {
      const g = cave.getContext("2d");
      g.fillStyle = "#1e1824"; g.fillRect(0, 0, MAP.w, MAP.h);
      let s = seed % 233280; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
      for (let i = 0; i < 900; i++) { g.fillStyle = rnd() < 0.5 ? "rgba(70,56,80,.6)" : "rgba(20,14,26,.5)"; g.fillRect(rnd() * MAP.w, rnd() * MAP.h, 6 + rnd() * 14, 4 + rnd() * 8); }
      for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) if (Lv.grid[j * COLS + i]) {
        g.fillStyle = "#6a6074"; g.fillRect(i * C - 6, j * C - 6, C + 12, C + 12);
        g.fillStyle = "#4e4658"; g.fillRect(i * C + 4, j * C + 4, C - 8, C - 8);
        g.fillStyle = "#5a5262"; g.beginPath(); g.arc(i * C + 30 + rnd() * 40, j * C + 30 + rnd() * 40, 18 + rnd() * 16, 0, Math.PI * 2); g.fill();
      }
      for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) if (Lv.grid[j * COLS + i] && rnd() < 0.08) { g.fillStyle = ["#9ad8ff", "#c8a0ff", "#9affc8"][Math.floor(rnd() * 3)]; g.globalAlpha = 0.5; g.beginPath(); g.arc(i * C + rnd() * C, j * C + rnd() * C, 4, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
    })();
    const dark = document.createElement("canvas");

    function goUp() {
      if (depth <= 1) return api.changeScene(null, { x: SHAFT.x, y: SHAFT.y - 100 }, "回到地面");
      M.depth = depth - 1; save();
      const up = Mi.gen(seed, depth - 1).down;
      api.changeScene("mine", up, `礦井・第 ${depth - 1} 層`);
    }
    function goDown() {
      if (depth >= 2 && !lamp()) { if (Date.now() > warned) { warned = Date.now() + 5000; toast("再往下黑到什麼都看不見了。回地面跟老鐵買一盞礦燈吧"); } return; }
      M.depth = depth + 1; M.deepest = Math.max(M.deepest, depth + 1); save();
      api.changeScene("mine", Mi.gen(seed, depth + 1).entry, `礦井・第 ${depth + 1} 層${depth + 1 === Mi.MAX_DEPTH ? "（最深處）" : ""}`);
    }
    function update(dt) {
      if (api.isBusy()) return;
      const dUp = dist(me.x, me.y, Lv.entry.x, Lv.entry.y), dDown = Lv.down ? dist(me.x, me.y, Lv.down.x, Lv.down.y) : 9999;
      if (dUp > 120) armUp = true; if (dDown > 120) armDown = true;
      if (armUp && dUp < 45) return goUp();
      if (armDown && dDown < 45) { armDown = false; return goDown(); }
      // 採蘑菇
      if (harvest) {
        if (M.picked[key(harvest.id)]) harvest = null;
        else if (dist(me.x, me.y, harvest.x, harvest.y) < 70) {
          hProg += dt;
          if (hProg >= (M.gear.knife ? 0.6 : 2)) {
            const s = Mi.SHROOMS[harvest.type];
            M.picked[key(harvest.id)] = 1; M.shrooms[harvest.type] = (M.shrooms[harvest.type] || 0) + 1; save();
            toast(`採到一朵${s.name}（${s.label}）・現在有 ${M.shrooms[harvest.type]} 朵`);
            api.fx.push({ k: "ring", x: harvest.x, y: harvest.y, r: 40, color: s.col, t: performance.now(), dur: 600 });
            harvest = null; hProg = 0;
          }
        } else hProg = 0;
      }
      // 挖開落石救礦工
      const mn = Lv.miner;
      if (mn && !M.rescued[key("miner")] && digging) {
        if (dist(me.x, me.y, mn.x, mn.y) < 90) {
          dig += dt;
          if (dig >= 2.5) {
            digging = false; M.rescued[key("miner")] = 1; M.rescuedN = (M.rescuedN || 0) + 1;
            const gold = 30 + depth * 15; run.gold += gold;
            const pool = Object.entries(Mi.SHROOMS).filter(([, s]) => s.from <= depth).sort((a, b) => b[1].from - a[1].from);
            const [sid, s] = pool[0]; M.shrooms[sid] = (M.shrooms[sid] || 0) + 1;
            save(); api.renderHud();
            api.dlg(mn.name, { name: mn.name, face: mn.name.split("・").pop()[0], color: "#7a5a3a" }, `「得救了……我在這裡被困了不知道幾天，只靠礦燈菇的光撐著。」<br>「這是我身上所有的錢，還有一朵我捨不得吃的${s.name}。我自己拉繩子上去就好，你小心。」`, `<button type="button" class="primary" data-close>好</button>`, `得到 ${gold} 金幣、${s.name} ×1`, true);
          }
        } else dig = Math.max(0, dig - dt);
      }
    }
    function click(p) {
      const s = Lv.shrooms.find((s) => !M.picked[key(s.id)] && dist(p.x, p.y, s.x, s.y) < 40);
      if (s) { harvest = s; hProg = 0; K.reach(s, 70, () => {}); return true; }
      const mn = Lv.miner;
      if (mn && !M.rescued[key("miner")] && dist(p.x, p.y, mn.x, mn.y) < 70) {
        K.reach(mn, 90, () => { if (!digging) { digging = true; dig = 0; toast(`「誰？……有人嗎？」落石底下有人！站在旁邊把石頭挖開`); } });
        return true;
      }
      if (dist(p.x, p.y, Lv.entry.x, Lv.entry.y) < 60) { armUp = true; api.goTo(Lv.entry, { type: "hook", reach: 20, fn: () => {} }); return true; }
      if (Lv.down && dist(p.x, p.y, Lv.down.x, Lv.down.y) < 60) { armDown = true; api.goTo(Lv.down, { type: "hook", reach: 20, fn: () => {} }); return true; }
      return false;
    }
    function blocked(x, y, h) {
      const k = h * 0.85;
      return wall(x - k, y - k) || wall(x + k, y - k) || wall(x - k, y + k) || wall(x + k, y + k) || wall(x, y);
    }
    function useItem(id, it) {
      if (id !== "escapeRope") return false;
      BAG.remove(run.items, id, 1); save();
      api.changeScene(null, { x: SHAFT.x, y: SHAFT.y - 100 }, "拉著逃生繩回到地面");
      return "close";
    }
    function shroom(x, y, col, now, r = 14) {
      ctx.fillStyle = "#e8dcc8"; ctx.fillRect(x - 3, y - r * 0.4, 6, r);
      ctx.fillStyle = col; ctx.globalAlpha = 0.75 + 0.25 * Math.sin(now / 300 + x); ctx.beginPath(); ctx.ellipse(x, y - r * 0.4, r, r * 0.6, 0, Math.PI, 0); ctx.fill(); ctx.globalAlpha = 1;
    }
    function drawFloor(now, x0, y0) { ctx.drawImage(cave, 0, 0); }
    function draw(now) {
      for (const s of Lv.shrooms) if (!M.picked[key(s.id)]) { const c = Mi.SHROOMS[s.type].col; shroom(s.x - 10, s.y + 4, c, now, 11); shroom(s.x + 8, s.y, c, now, 15); }
      if (harvest) { const t = M.gear.knife ? 0.6 : 2; K.bar(harvest.x, harvest.y - 34, 50, hProg / t, "#ffd88a"); }
      // 樓梯
      const E = Lv.entry;
      ctx.fillStyle = "#6a5a4a"; ctx.fillRect(E.x - 30, E.y - 30, 60, 60); ctx.strokeStyle = "#c8b89a"; ctx.lineWidth = 3; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(E.x - 22, E.y - 22 + i * 14); ctx.lineTo(E.x + 22, E.y - 22 + i * 14); ctx.stroke(); }
      text(depth === 1 ? "往上（回到地面）" : `往上（第 ${depth - 1} 層）`, E.x, E.y - 42, "#e8d8b8", 12, 900);
      if (Lv.down) {
        const D = Lv.down; ctx.fillStyle = "#0a0608"; ctx.beginPath(); ctx.ellipse(D.x, D.y, 40, 26, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#8a6a3a"; ctx.lineWidth = 5; ctx.stroke();
        text(`往下（第 ${depth + 1} 層）`, D.x, D.y - 40, "#c8a0ff", 12, 900);
      } else { const D = Lv.deepest; text("礦井的最深處", D.x, D.y - 20, "#c8a0ff", 14, 900); }
      // 受困的礦工
      const mn = Lv.miner;
      if (mn && !M.rescued[key("miner")]) {
        for (let i = 0; i < 5; i++) { ctx.fillStyle = "#6a6270"; ctx.beginPath(); ctx.arc(mn.x - 34 + i * 17, mn.y + 8 - (i % 2) * 14, 14, 0, Math.PI * 2); ctx.fill(); }
        K.human(mn.x, mn.y - 24, "#7a5a3a", "礦", now, { k: 2, alpha: 0.9 });
        text(digging ? `挖開落石中…… ${Math.round(Math.min(1, dig / 2.5) * 100)}%` : "落石底下好像有人", mn.x, mn.y - 60, "#ffd88a", 12, 900);
      }
    }
    function drawTop(now) {
      const m = ctx.getTransform(), cw = ctx.canvas.width, ch = ctx.canvas.height;
      if (dark.width !== cw || dark.height !== ch) { dark.width = cw; dark.height = ch; }
      const d = dark.getContext("2d");
      d.globalCompositeOperation = "source-over"; d.clearRect(0, 0, cw, ch);
      d.fillStyle = `rgba(4,2,8,${Math.min(0.985, 0.92 + depth * 0.013)})`; d.fillRect(0, 0, cw, ch);
      d.globalCompositeOperation = "destination-out";
      const hole = (x, y, r) => {
        const sx = m.a * x + m.e, sy = m.d * y + m.f, sr = r * m.a;
        if (sx < -sr || sy < -sr || sx > cw + sr || sy > ch + sr) return;
        const g = d.createRadialGradient(sx, sy, sr * 0.35, sx, sy, sr);
        g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
        d.fillStyle = g; d.beginPath(); d.arc(sx, sy, sr, 0, Math.PI * 2); d.fill();
      };
      hole(me.x, me.y, lightR());
      for (const s of Lv.shrooms) if (!M.picked[key(s.id)]) hole(s.x, s.y, 55);                      // 蘑菇自己會發光（遠遠看得到一小點）
      hole(Lv.entry.x, Lv.entry.y, 90);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(dark, 0, 0); ctx.restore();
    }
    function drawEnemy(e, now, red) { return K.enemyArt(e, now, red, { moles: ["sporeMole", 2], moles3: ["sporeMole", 3], beasts: ["hyphaBeast", 2], deepMix: ["hyphaBeast", 3] }); }
    function mini(dot, now) {
      for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) if (Lv.grid[j * COLS + i]) dot(i * C + C / 2, j * C + C / 2, 3, "#6a6074");
      dot(Lv.entry.x, Lv.entry.y, 5, "#e8d8b8");
      if (Lv.down && M.deepest > depth) dot(Lv.down.x, Lv.down.y, 5, "#c8a0ff");
      if (Lv.miner && !M.rescued[key("miner")] && dist(me.x, me.y, Lv.miner.x, Lv.miner.y) < 500) dot(Lv.miner.x, Lv.miner.y, 4, `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`);
    }
    return { update, click, blocked, useItem, drawFloor, draw, drawTop, drawEnemy, mini, dbg: { M, Lv } };
  }
})();
