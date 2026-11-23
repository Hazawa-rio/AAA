/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/sp10101-cool.js": "20261123215910" });
// #SP10101 遞廻齒輪鑲嵌之國・下層的冷卻工廠（場景 "cool"）
//   主泵：點一下開始搖，站在旁邊 3 秒就轉起來（離開就要重搖）
//   分流閥：點一下換一邊；冷卻水照地上的管子流到出水口。SP10101-03：主泵轉著、水流到「博覽會會場」就完成（spCoolant）
//   蒸氣幽靈（SP10101-02）：在六個排氣口之間跳來跳去；趁它在某個口裡的時候，點那個口旁邊的閥門關上＝抓到（三個）
//     還沒抓完之前，偶爾會有幽靈偷轉分流閥
//   升降梯：回上層
(function () {
  const R = (window.RPG = window.RPG || {});
  const base = R.WorldHooks.SP10101;
  R.WorldHooks.SP10101 = function (api) {
    if (api.MAP.coolFactory) return factory(api);
    return base(api);
  };

  function factory(api) {
    const { MAP, trip, me, toast, text, save, dist } = api, ctx = api.ctx();
    const K = R.BKit(api);
    const D = R.SPState(trip);
    let pumpT = 0, pumping = false;
    const ghost = { vent: Math.floor(Math.random() * MAP.vents.length), until: 0, out: false };
    let nextFlip = performance.now() + 18000;
    const ghostsOn = () => K.is("SP10101-02", "spGhosts");

    // 水流：從 j1 開始照分流閥走，走到出水口
    function flow() {
      const path = ["j1"]; let cur = "j1";
      for (let k = 0; k < 5; k++) { const nx = MAP.junc[cur][D.junc[cur] || "a"]; path.push(nx); if (!MAP.junc[nx]) break; cur = nx; }
      return path;
    }
    const target = () => flow().slice(-1)[0];
    function checkCool() {
      if (D.cooled || !D.pump) return;
      if (target() === "expo" && K.is("SP10101-03", "spCoolant")) {
        D.cooled = true; save();
        api.sfx("sounds/cangyou-bubbles.mp3");
        K.adv("SP10101-03", "冷卻水嘩啦啦地往上送——博覽會會場的管子接通了！回上層，到東北角讓伊卡洛斯號停下來");
      }
    }
    function toggleJ(id) {
      D.junc[id] = D.junc[id] === "a" ? "b" : "a"; save();
      api.sfx("sounds/hoffman-wrench.mp3");
      const t = target();
      toast(D.pump ? `冷卻水現在流向：${MAP.outlets[t].name}` : `分流閥轉到另一邊（主泵還沒轉起來，水還沒在流）`);
      checkCool();
    }
    function startPump() {
      if (D.pump) return toast(`主泵轟隆隆地轉著。冷卻水流向：${MAP.outlets[target()].name}`);
      pumping = true; pumpT = 0; toast("開始搖主泵……站在旁邊別走開");
    }
    function closeVent(i) {
      if (!ghostsOn()) return toast("關上了排氣口的閥門。……什麼事都沒發生，又打開了");
      if (ghost.vent === i && !ghost.out) {
        D.caught++; save();
        api.sfx("sounds/rope-tighten.mp3");
        ghost.out = true; ghost.until = performance.now() + 2500;
        ghost.vent = (i + 1 + Math.floor(Math.random() * (MAP.vents.length - 1))) % MAP.vents.length;
        if (D.caught >= 3) K.adv("SP10101-02", "抓到第三個蒸氣幽靈了！……主排氣塔的蒸氣開始聚在一起");
        else toast(`啪！閥門一關，裡面的蒸氣幽靈被關進了瓶子（${D.caught} / 3）`);
      } else toast("關了個空——幽靈不在這個口。看清楚它冒出來的地方");
    }

    function update(dt, now) {
      checkCool();               // 先接好水、後來才接委託的情況
      if (pumping) {
        if (dist(me.x, me.y, MAP.pump.x, MAP.pump.y) > 110) { pumping = false; pumpT = 0; toast("一離開主泵就停了。要站在旁邊搖"); }
        else { pumpT += dt; if (pumpT >= 3) { pumping = false; D.pump = true; save(); api.sfx("sounds/robot-move.mp3"); toast(`主泵轉起來了！冷卻水流向：${MAP.outlets[target()].name}`); checkCool(); } }
      }
      // 幽靈：在排氣口之間跳
      if (ghostsOn() && now > ghost.until) {
        if (ghost.out) { ghost.out = false; ghost.until = now + 3800 + Math.random() * 1800; }
        else { ghost.out = true; ghost.until = now + 700; ghost.vent = (ghost.vent + 1 + Math.floor(Math.random() * (MAP.vents.length - 1))) % MAP.vents.length; }
      }
      // 還沒抓完：偶爾有幽靈偷轉分流閥
      if (D.caught < 3 && !trip.done.includes("SP10101-02") && !D.cooled && D.pump && now > nextFlip) {
        nextFlip = now + 22000 + Math.random() * 10000;
        const ids = Object.keys(MAP.junc), id = ids[Math.floor(Math.random() * ids.length)];
        D.junc[id] = D.junc[id] === "a" ? "b" : "a"; save();
        toast("管子裡傳來嘻嘻的笑聲——有一個分流閥自己轉了！");
      }
    }
    function click(p) {
      if (dist(p.x, p.y, MAP.pump.x, MAP.pump.y) < 60) { K.reach(MAP.pump, 100, startPump); return true; }
      for (const [id, j] of Object.entries(MAP.junc)) if (dist(p.x, p.y, j.x, j.y) < 40) { K.reach(j, 80, () => toggleJ(id)); return true; }
      for (let i = 0; i < MAP.vents.length; i++) { const v = MAP.vents[i]; if (dist(p.x, p.y, v.x + 56, v.y) < 26 || dist(p.x, p.y, v.x, v.y) < 40) { K.reach({ x: v.x + 56, y: v.y + 30 }, 70, () => closeVent(i)); return true; } }
      if (dist(p.x, p.y, MAP.lift.x, MAP.lift.y) < 70) { K.reach(MAP.lift, 80, () => api.changeScene(null, { x: R.MAPS.SP10101.lift.x, y: R.MAPS.SP10101.lift.y - 110 }, "搭升降梯回到齒輪城……")); return true; }
      return false;
    }
    function stageText(id, s) {
      if (!s) return null;
      if (s.type === "spGhosts") return `${s.text}（${D.caught} / 3）`;
      if (s.type === "spCoolant") return D.pump ? `${s.text}（水現在流向：${MAP.outlets[target()].name}）` : `${s.text}（主泵還沒轉）`;
      return null;
    }

    // ===== 繪圖 =====
    const pt = (id) => MAP.junc[id] || MAP.outlets[id];
    function pipe(a, b, wet, now) {
      // 先橫再直的管子
      ctx.lineCap = "round";
      ctx.strokeStyle = "#3a4a54"; ctx.lineWidth = 26; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = wet ? "#5ad0ff" : "#26323a"; ctx.lineWidth = 12; ctx.setLineDash(wet ? [18, 14] : []); ctx.lineDashOffset = -now / 30; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]); ctx.lineCap = "butt";
    }
    function drawFloor(now, x0, y0) {
      ctx.fillStyle = "#16222a"; ctx.fillRect(x0, y0, 1280, 720);
      ctx.fillStyle = "#22323c"; ctx.fillRect(80, 80, MAP.w - 160, MAP.h - 160);
      ctx.strokeStyle = "rgba(90,170,210,.12)"; ctx.lineWidth = 2;
      for (let x = 80; x < MAP.w - 80; x += 100) { ctx.beginPath(); ctx.moveTo(x, 80); ctx.lineTo(x, MAP.h - 80); ctx.stroke(); }
      for (let y = 80; y < MAP.h - 80; y += 100) { ctx.beginPath(); ctx.moveTo(80, y); ctx.lineTo(MAP.w - 80, y); ctx.stroke(); }
      // 管線（水在流的那條會發光）
      const f = flow(), wetSet = new Set();
      if (D.pump) { wetSet.add("pump-j1"); for (let k = 0; k < f.length - 1; k++) wetSet.add(`${f[k]}-${f[k + 1]}`); }
      pipe(MAP.pump, MAP.junc.j1, D.pump, now);
      for (const [id, j] of Object.entries(MAP.junc)) for (const s of ["a", "b"]) pipe(j, pt(j[s]), wetSet.has(`${id}-${j[s]}`), now);
      // 冷卻水槽
      const T = MAP.tank;
      ctx.fillStyle = "#2a3a44"; api.rr(T.x, T.y, T.w, T.h, 20); ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = "#0a1418"; ctx.stroke();
      const lvl = 0.7 + Math.sin(now / 1200) * 0.03;
      ctx.fillStyle = "rgba(90,208,255,.55)"; ctx.fillRect(T.x + 14, T.y + T.h * (1 - lvl), T.w - 28, T.h * lvl - 14);
      text("冷卻水槽", T.x + T.w / 2, T.y - 14, "#a0e8ff", 14, 900);
      // 主泵
      const P = MAP.pump, spin = D.pump ? now / 120 : pumping ? now / 300 : 0;
      ctx.fillStyle = "#3a4a54"; ctx.fillRect(P.x - 50, P.y - 50, 100, 100); ctx.strokeStyle = "#0a1418"; ctx.lineWidth = 4; ctx.strokeRect(P.x - 50, P.y - 50, 100, 100);
      R.drawGear?.(ctx, P.x, P.y, 32, 10, spin, D.pump ? "#5ad0ff" : "#8a9aa4", "#1a2a32");
      text(D.pump ? "主泵（轉著）" : "主泵（點一下開始搖）", P.x, P.y - 66, "#d8f4ff", 13, 900);
      if (pumping) K.bar(P.x, P.y + 62, 90, pumpT / 3, "#5ad0ff");
      // 分流閥
      for (const [id, j] of Object.entries(MAP.junc)) {
        const to = pt(j[D.junc[id]]), a = Math.atan2(to.y - j.y, to.x - j.x);
        ctx.fillStyle = "#c8962a"; ctx.beginPath(); ctx.arc(j.x, j.y, 30, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#3a2a10"; ctx.lineWidth = 4; ctx.stroke();
        const dx = Math.abs(to.x - j.x) > Math.abs(to.y - j.y) ? Math.sign(to.x - j.x) : 0, dy = dx ? 0 : Math.sign(to.y - j.y);
        ctx.strokeStyle = "#1a1006"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(j.x - dx * 18, j.y - dy * 18); ctx.lineTo(j.x + dx * 22, j.y + dy * 22); ctx.stroke();
        ctx.fillStyle = "#1a1006"; ctx.beginPath(); ctx.arc(j.x + dx * 22, j.y + dy * 22, 6, 0, Math.PI * 2); ctx.fill();
        text("分流閥", j.x, j.y - 40, "#ffe0a0", 12, 900);
        void a;
      }
      // 出水口
      for (const [id, o] of Object.entries(MAP.outlets)) {
        const wet = D.pump && f[f.length - 1] === id;
        ctx.fillStyle = wet ? "#5ad0ff" : "#3a4a54"; api.rr(o.x - 46, o.y - 30, 92, 60, 10); ctx.fill(); ctx.strokeStyle = "#0a1418"; ctx.lineWidth = 3; ctx.stroke();
        text(id === "drain" ? "排水溝" : `往上層：${o.name}`, o.x, o.y + (id === "drain" ? 50 : -40), id === "expo" ? "#ffe080" : "#d8f4ff", 13, 900);
      }
      // 主排氣塔
      const S = MAP.stack;
      ctx.fillStyle = "#3a3a42"; api.rr(S.x, S.y, S.w, S.h, 16); ctx.fill(); ctx.strokeStyle = "#0a0a0e"; ctx.lineWidth = 4; ctx.stroke();
      R.drawPuff?.(ctx, S.x + S.w / 2, S.y + 10, 60, now, 0, 0.5);
      text("主排氣塔", S.x + S.w / 2, S.y + S.h + 24, "#d8f4ff", 13, 900);
      // 排氣口、旁邊的小閥門
      MAP.vents.forEach((v, i) => {
        ctx.fillStyle = "#0e161a"; ctx.beginPath(); ctx.ellipse(v.x, v.y, 40, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#5a6a74"; ctx.lineWidth = 4; ctx.stroke();
        ctx.strokeStyle = "#3a4a54"; ctx.lineWidth = 3; for (let k = -24; k <= 24; k += 12) { ctx.beginPath(); ctx.moveTo(v.x + k, v.y - 18); ctx.lineTo(v.x + k, v.y + 18); ctx.stroke(); }
        ctx.strokeStyle = "#d83a2a"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(v.x + 56, v.y, 14, 0, Math.PI * 2); ctx.stroke();
        R.drawPuff?.(ctx, v.x, v.y - 20, 22, now, i, 0.25);
      });
      // 升降梯
      const L = MAP.lift;
      ctx.fillStyle = "#2a2a30"; ctx.fillRect(L.x - 60, L.y - 60, 120, 120); ctx.strokeStyle = "#b8862a"; ctx.lineWidth = 5; ctx.strokeRect(L.x - 60, L.y - 60, 120, 120);
      text("↑ 齒輪城", L.x, L.y - 74, "#ffe0a0", 13, 900);
    }
    function draw(now) {
      // 蒸氣幽靈（只有接了 SP10101-02 才看得到）
      if (!ghostsOn()) return;
      const v = MAP.vents[ghost.vent];
      if (ghost.out) { R.EnemyArt?.steamGhost?.(ctx, { r: 24, x: v.x, alive: true, def: {} }, { x: v.x, y: v.y - 46 - Math.sin(now / 100) * 6 }, now); }
      else {
        // 在排氣口裡：口在抖、冒出一個「？」
        ctx.fillStyle = "rgba(242,194,0,.9)"; ctx.font = "900 26px sans-serif"; ctx.textAlign = "center"; ctx.fillText("？", v.x, v.y - 34 + Math.sin(now / 120) * 4);
        R.drawPuff?.(ctx, v.x, v.y - 18, 34, now, ghost.vent, 0.75);
        text("關閥門！", v.x + 56, v.y - 26, "#ff8a7a", 12, 900);
      }
    }
    const ART = { ghosts: [["steamGhost", -22], ["steamGhost", 22]], ghosts3: [["steamGhost", -36], ["steamGhost", 0], ["steamGhost", 36]] };
    function drawEnemy(e, now, red) {
      const L = ART[e.kind]; if (!L) return false;
      for (const [k, dx] of L) R.EnemyArt?.[k]?.(ctx, { r: 20, x: e.x + dx, alive: true, def: {} }, { x: e.x + dx, y: e.y }, now);
      if (red) { ctx.strokeStyle = "#e53935"; ctx.lineWidth = 3; ctx.strokeRect(e.x - 60, e.y - 40, 120, 76); }
      return true;
    }
    function mini(dot, now) {
      const blink = 0.6 + 0.4 * Math.sin(now / 200);
      if (K.is("SP10101-03", "spCoolant")) { dot(MAP.pump.x, MAP.pump.y, 5, `rgba(90,208,255,${blink})`); dot(MAP.outlets.expo.x, MAP.outlets.expo.y, 5, `rgba(242,194,0,${blink})`); }
      if (ghostsOn()) { const v = MAP.vents[ghost.vent]; dot(v.x, v.y, 5, `rgba(255,255,255,${blink})`); }
      dot(MAP.lift.x, MAP.lift.y, 5, "#ffe080");
    }
    return { update, click, stageText, drawFloor, draw, drawEnemy, mini, dbg: { D, ghost, flow, target, toggleJ, startPump, closeVent, setPump: () => { D.pump = true; checkCool(); } } };
  }
})();
