/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/sn00512.js": "20261112144644" });
// #SN00512 燈塔小鎮：雪地、針葉林、燈塔、結冰的港口
//   暴風雪會一陣一陣地變大（大約 70 秒一輪）：越大，走得越慢、看得越不清楚；最大的時候冰鈴草才會開花
//   SN00512-01 燈塔的柴火：柴房裝柴 → 拉雪橇（變慢）送到燈塔門口，兩趟
//   SN00512-02 冰上的漁獲：冰上三個洞各釣一條（冰上釣魚的畫面）
//   SN00512-03 守燈人的一日值班：燈塔頂樓（另一個場景）——上發條、添油、擦透鏡、記下經過的船；燈不能熄
//   SN00512-04 林中採藥：暴風雪最大時摘冰鈴草 → 被吵醒的熊媽媽
(function () {
  const R = (window.RPG = window.RPG || {});
  R.WorldHooks = R.WorldHooks || {};

  const SHIPS = ["北風號", "老海鷗號", "鱈魚三號", "銀鱗號", "歸港號", "小哈康號", "雪鴞號"];
  const ICE_FISH = [
    { name: "鱈魚", tier: "common" }, { name: "冰鰈", tier: "common" }, { name: "小鯡魚", tier: "common" },
    { name: "雪蟹", tier: "rare" }, { name: "北極紅點鮭", tier: "rare" },
    { name: "會唱歌的冰魚", tier: "treasure", note: "拉上來的時候，牠發出了像風鈴一樣的聲音" },
  ];
  const FT = { common: { name: "普通", color: "#6b7a8a", w: 70, gold: 8, per: 6 }, rare: { name: "稀有", color: "#3d7fe0", w: 24, gold: 18, per: 4.5 }, treasure: { name: "珍品", color: "#c98a1a", w: 6, gold: 40, per: 3.5 } };

  R.WorldHooks.SN00512 = function (api) {
    const { MAP, trip, run, me, CM, BAG, toast, inRect, text, save, openPanel, closePanel, dist, esc } = api;
    const ctx = api.ctx();
    const MAIN = R.MAPS.SN00512, LAMP = !!MAP.lampRoom;
    const active = (id) => trip.accepted.includes(id) && !trip.done.includes(id);
    const stageOf = (id) => (active(id) ? CM.stage(trip, id) : null);
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    trip.qdata = trip.qdata || {};
    const D = (trip.qdata.snow = trip.qdata.snow || { wood: 0, carrying: false, fished: {}, catches: [] });
    if (trip.done.includes("SN00512-04") && BAG.count(run.items, "iceBell")) { BAG.remove(run.items, "iceBell", 9); save(); }

    // ===== 暴風雪（0～1；大約 70 秒一輪） =====
    const storm = () => { const t = (Date.now() / 1000) % 70; return 0.5 - 0.5 * Math.cos((t / 70) * Math.PI * 2); };
    const bloom = () => storm() > 0.85;
    const near = (p, r) => dist(me.x, me.y, p.x, p.y) < r;
    const reach = (p, r, fn) => { if (near(p, r)) fn(); else api.goTo(p, { type: "hook", reach: r - 20, fn }); };

    // ===== 冰上釣魚 =====
    function rollIce() { let r = Math.random() * 100; for (const t of ["treasure", "rare", "common"]) { r -= FT[t].w; if (r <= 0) return pick(ICE_FISH.filter((f) => f.tier === t)); } return ICE_FISH[0]; }
    function iceBg(g, now, W, H) {
      const hz = 230;
      const sky = g.createLinearGradient(0, 0, 0, hz); sky.addColorStop(0, "#9ab0c4"); sky.addColorStop(1, "#dfe8ef");
      g.fillStyle = sky; g.fillRect(0, 0, W, hz);
      // 遠方的小鎮和燈塔
      g.fillStyle = "#6a7a8a"; for (let i = 0; i < 8; i++) { const x = 120 + i * 70; g.fillRect(x, hz - 40 - (i % 3) * 10, 50, 40 + (i % 3) * 10); g.fillStyle = "#fff"; g.fillRect(x - 4, hz - 44 - (i % 3) * 10, 58, 8); g.fillStyle = "#6a7a8a"; }
      g.fillStyle = "#f4f4f4"; g.fillRect(1040, hz - 150, 34, 150); g.fillStyle = "#c0392b"; g.fillRect(1040, hz - 110, 34, 22); g.fillRect(1040, hz - 60, 34, 22);
      g.fillStyle = `rgba(255,240,170,${0.5 + 0.4 * Math.sin(now / 300)})`; g.beginPath(); g.moveTo(1057, hz - 158); g.lineTo(1057 - 500, hz - 200 + Math.sin(now / 900) * 60); g.lineTo(1057 - 500, hz - 130 + Math.sin(now / 900) * 60); g.closePath(); g.fill();
      // 冰面
      const ice = g.createLinearGradient(0, hz, 0, H); ice.addColorStop(0, "#d8eaf4"); ice.addColorStop(1, "#b8d4e4");
      g.fillStyle = ice; g.fillRect(0, hz, W, H - hz);
      g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 2;
      for (const [x, y, a] of [[200, 400, 0.4], [520, 600, -0.3], [980, 520, 0.6], [1150, 650, -0.5], [360, 300, -0.2]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 120, y + Math.sin(a) * 40); g.lineTo(x + Math.cos(a) * 180, y + Math.sin(a) * 70 + 10); g.stroke(); }
      // 冰洞
      g.fillStyle = "#e8f2f8"; g.beginPath(); g.ellipse(760, 420, 140, 50, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#1f4a66"; g.beginPath(); g.ellipse(760, 420, 112, 38, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(255,255,255,.15)"; g.beginPath(); g.ellipse(740, 412, 60, 12, 0, 0, Math.PI * 2); g.fill();
      // 飄雪
      g.fillStyle = "rgba(255,255,255,.85)";
      for (let i = 0; i < 70; i++) { const x = ((i * 173 + now / 25) % (W + 40)) - 20, y = ((i * 97 + now / 18 * (1 + (i % 3) * 0.3)) % H); g.beginPath(); g.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2); g.fill(); }
      // 坐的小木凳、手套
      g.fillStyle = "#8a5a32"; g.fillRect(1130, 600, 120, 26); g.fillRect(1140, 626, 14, 60); g.fillRect(1226, 626, 14, 60);
    }
    function fishHole(h) {
      if (stageOf("SN00512-02")?.type !== "snIce") { toast("冰洞上結了一層薄薄的冰。哈康說：「一個洞一條就好。」"); return; }
      if (D.fished[h.id]) { toast("這個洞已經釣過了。一個洞釣一條就好"); return; }
      api.setBusy(true);
      R.Fishing.start({
        host: api.$("#wxStage"),
        theme: {
          title: "燈塔小鎮・結冰的港口（冰上的釣魚洞）", label: "冰上釣魚", castText: "線垂進冰洞裡……冰下面的魚咬鉤咬得慢（30 秒內）",
          roll: rollIce, per: (c) => FT[c.tier].per, drawBg: iceBg, button: "收線",
          result: (c) => { const T = FT[c.tier]; return `<h3 style="color:${T.color}">${T.name}</h3><p class="fish-name">釣到了${esc(c.name)}！</p><p>${c.note ? `${esc(c.note)}<br>` : ""}放進哈康的桶子裡。哈康塞給你 <b>${T.gold} 金幣</b>：「手腳挺俐落的嘛。」</p>`; },
        },
        onDone(c) {
          D.fished[h.id] = true; D.catches.push(c.name); run.gold += FT[c.tier].gold;
          api.bark("iceFish");
          const st = stageOf("SN00512-02");
          if (st && Object.keys(D.fished).length >= st.need) CM.advance(trip, "SN00512-02");
          save(); api.setBusy(false); api.renderHud();
          toast(`釣到了${c.name}（${Object.keys(D.fished).length} / 3）${Object.keys(D.fished).length >= 3 ? "——拿去給哈康吧！" : ""}`);
        },
      });
    }

    // ===== 燈塔頂樓的值班 =====
    const DUR = 110;
    const RATE = { fuel: 1.1, wind: 1.6, dirt: 0.9 };         // 每秒下降（透鏡＝每秒變髒）；比原本慢
    const LIGHTS = { red: { n: "紅色", c: "#ff5a4a" }, green: { n: "綠色", c: "#5ad06a" }, white: { n: "白色", c: "#f4f4f0" } };
    const SHIP_SEEN = 12, SHIP_LATE = 6;                       // 船在窗外 12 秒；離開之後 6 秒內還來得及記
    let S = null;          // { t, fuel, wind, dirt, stock, spilled, ships, next, logged, wrong, missed, si }
    let loopOn = false;
    function startShift() {
      closePanel();
      S = { t: 0, fuel: 100, wind: 100, dirt: 0, stock: 240, spilled: 0, ships: [], next: 8, logged: [], wrong: 0, missed: 0, si: 0 };
      toast("值班開始。燈不能熄——一次都不行");
      // 值班的時間在背景一直走（打開發條、透鏡、油桶、日誌的介面時也不會停）
      if (!loopOn) {
        loopOn = true; let last = performance.now();
        const tick = (now) => { if (!S) { loopOn = false; return; } const dt = Math.min(0.1, (now - last) / 1000); last = now; updateShift(dt); requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      }
    }
    function endShift(ok) {
      const s = S; S = null; mg = null;
      if (!ok) {
        openPanel("燈熄了", `<p class="wx-p">油燒完了，透鏡裡的火苗抖了一下，熄了。整個頂樓暗了下來。</p><p class="wx-p">窗外的海一片漆黑。</p>
          <p class="tv-note">燈不能熄。重新點燈、重新值一班吧。</p><div class="tv-row"><button type="button" class="primary" data-act="snStart">重新點燈，再值一班</button></div>`);
        return;
      }
      D.shiftLog = s.logged; D.shiftMissed = s.missed;
      const fin = CM.advance(trip, "SN00512-03"); save();
      openPanel("天亮了", `<p class="wx-p">窗外的海慢慢變成灰色，然後是淡藍色。燈整晚都亮著。</p>
        <p class="wx-p">日誌上記了 ${s.logged.length} 艘船：${s.logged.map(esc).join("、") || "（沒有）"}${s.wrong ? `；有 ${s.wrong} 筆記錯了` : ""}${s.missed ? `；有 ${s.missed} 艘沒來得及記下` : ""}。${s.spilled > 0 ? `地板上還有一灘灑出來的油（${Math.round(s.spilled)}）。` : ""}</p>
        <p class="tv-note">${fin ? "委託完成！" : "下樓去等莉亞回來交班吧。"}</p>`);
    }
    function updateShift(dt) {
      if (!S) return;
      S.t += dt;
      S.fuel -= RATE.fuel * dt; S.wind = Math.max(0, S.wind - RATE.wind * dt);
      if (mg?.k !== "lens") S.dirt = Math.min(100, S.dirt + RATE.dirt * dt);
      if (S.fuel <= 0) { endShift(false); return; }
      if (S.t >= S.next) {
        const pickL = Object.keys(LIGHTS)[Math.floor(Math.random() * 3)];
        S.ships.push({ name: SHIPS[S.si++ % SHIPS.length], t0: S.t, dir: Math.random() < 0.5 ? 1 : -1, light: pickL, logged: false });
        if (S.si === 1) api.bark("ship", 3000);          // 第一艘船經過時
        S.next += 15 + Math.random() * 5;
      }
      for (let i = S.ships.length - 1; i >= 0; i--) { const sh = S.ships[i]; if (S.t - sh.t0 > SHIP_SEEN + SHIP_LATE) { if (!sh.logged) S.missed++; S.ships.splice(i, 1); } }
      if (S.t >= DUR) endShift(true);
    }

    // ===== 值班的四個介面（在面板裡的小畫布） =====
    let mg = null;          // 目前打開的介面 { k, ... }
    function mgOpen(k, title, help) {
      openPanel(title, `<p class="tv-note" style="margin:0 0 8px">${help}</p><canvas id="snMg" width="520" height="320" style="width:100%;max-width:520px;display:block;margin:0 auto;border-radius:10px;touch-action:none;background:#1a2230"></canvas>
        <div id="snMgInfo" class="tv-note" style="margin-top:8px"></div>`);
      const cv = document.getElementById("snMg"), g = cv.getContext("2d");
      mg = { k, cv, g, down: false, x: 0, y: 0 };
      const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * cv.width, y: ((e.clientY - r.top) / r.height) * cv.height }; };
      cv.addEventListener("pointerdown", (e) => { const p = pos(e); mg.x = p.x; mg.y = p.y; mg.down = true; cv.setPointerCapture(e.pointerId); mg.onDown?.(p); });
      cv.addEventListener("pointermove", (e) => { const p = pos(e); mg.x = p.x; mg.y = p.y; mg.onMove?.(p); });
      const up = () => { if (!mg) return; mg.down = false; mg.onUp?.(); };
      cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
      const me0 = mg; let last = performance.now();
      const loop = (now) => {
        if (mg !== me0 || !cv.isConnected) { if (mg === me0) mg = null; return; }
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        me0.step?.(dt, now); me0.draw?.(now);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
      return mg;
    }
    const bar = (g, x, y, w, h, v, col, label) => {
      g.fillStyle = "#333"; g.fillRect(x, y, w, h); g.fillStyle = col; g.fillRect(x, y, w * Math.max(0, Math.min(1, v)), h);
      g.strokeStyle = "#e8dcc8"; g.lineWidth = 2; g.strokeRect(x, y, w, h);
      if (label) { g.fillStyle = "#e8dcc8"; g.font = "900 13px 'Noto Sans TC', sans-serif"; g.textAlign = "left"; g.textBaseline = "bottom"; g.fillText(label, x, y - 4); }
    };
    const txt = (g, t, x, y, c = "#e8dcc8", size = 14) => { g.fillStyle = c; g.font = `900 ${size}px 'Noto Sans TC', sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(t, x, y); };

    // 發條：按著握把，繞著圓心轉（順時針才算上緊）
    function openWind() {
      const M = mgOpen("wind", "上發條", "按住<b>握把</b>（紅色的圓），繞著中心<b>順時針</b>轉動滑鼠。轉一圈發條緊 25%。"), C = { x: 200, y: 165 }, Rw = 100;
      let th = -Math.PI / 2, grab = false, turned = 0, tick = 0;
      M.onDown = (p) => { const hx = C.x + Math.cos(th) * Rw, hy = C.y + Math.sin(th) * Rw; grab = Math.hypot(p.x - hx, p.y - hy) < 34; };
      M.onUp = () => { grab = false; };
      M.onMove = (p) => {
        if (!grab || !S) return;
        const a = Math.atan2(p.y - C.y, p.x - C.x); let d = a - th;
        while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
        if (d > 0) {                                            // 順時針：上緊
          if (S.wind < 100) { S.wind = Math.min(100, S.wind + (d / (Math.PI * 2)) * 25); turned += d; }
          th = a;
          tick += d; if (tick > Math.PI / 2) { tick = 0; api.sfx("sounds/hoffman-gear.mp3"); }
        } else if (d > -0.4) th = a;                           // 逆時針：棘輪卡住，只能稍微退一點
      };
      M.draw = (now) => {
        const g = M.g; g.fillStyle = "#2a1e14"; g.fillRect(0, 0, 520, 320);
        // 齒輪盤
        g.save(); g.translate(C.x, C.y); g.rotate(th);
        g.fillStyle = "#8a7a5a"; for (let i = 0; i < 16; i++) { g.rotate(Math.PI / 8); g.fillRect(-10, -Rw - 16, 20, 22); }
        g.restore();
        g.fillStyle = "#b8a070"; g.beginPath(); g.arc(C.x, C.y, Rw, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#6a5a3a"; g.beginPath(); g.arc(C.x, C.y, 22, 0, Math.PI * 2); g.fill();
        const hx = C.x + Math.cos(th) * Rw, hy = C.y + Math.sin(th) * Rw;
        g.strokeStyle = "#4a3a22"; g.lineWidth = 12; g.lineCap = "round"; g.beginPath(); g.moveTo(C.x, C.y); g.lineTo(hx, hy); g.stroke();
        g.fillStyle = grab ? "#ff8a6a" : "#e8262c"; g.beginPath(); g.arc(hx, hy, 24, 0, Math.PI * 2); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 3; g.stroke();
        // 順時針的箭頭
        g.strokeStyle = "rgba(255,240,170,.5)"; g.lineWidth = 4; g.beginPath(); g.arc(C.x, C.y, Rw + 34, -2.2, -0.9); g.stroke();
        txt(M.g, "→ 順時針", C.x + 70, C.y - Rw - 40, "#fff2a8", 13);
        bar(g, 360, 70, 130, 22, S ? S.wind / 100 : 1, S && S.wind < 30 ? "#e53935" : "#4a8fe0", "發條");
        txt(g, S ? `${Math.round(S.wind)}%` : "—", 425, 81, "#fff", 13);
        txt(g, `這次轉了 ${(turned / (Math.PI * 2)).toFixed(1)} 圈`, 425, 130, "#e8dcc8", 13);
        if (S && S.wind >= 100) txt(g, "已經上緊了", 425, 170, "#9ad0a0", 15);
      };
    }

    // 透鏡：按住抹布，在玻璃上抹掉積雪
    function openLens() {
      const M = mgOpen("lens", "擦透鏡", "按住左下角的<b>抹布</b>，在玻璃上來回擦，把雪抹掉。"), C = { x: 260, y: 160 }, RG = 130;
      const snow = document.createElement("canvas"); snow.width = 520; snow.height = 320; const sg = snow.getContext("2d");
      const coverage = () => {
        const d = sg.getImageData(0, 0, 520, 320).data; let n = 0, k = 0;
        for (let y = C.y - RG; y < C.y + RG; y += 8) for (let x = C.x - RG; x < C.x + RG; x += 8) { if (Math.hypot(x - C.x, y - C.y) > RG) continue; n++; if (d[(y * 520 + x) * 4 + 3] > 80) k++; }
        return n ? k / n : 0;
      };
      // 依照目前有多髒，堆上剛好那麼多的雪
      const want = (S ? S.dirt : 0) / 100;
      sg.fillStyle = "rgba(244,248,251,.96)";
      for (let i = 0; i < 400 && coverage() < want; i++) for (let j = 0; j < 6; j++) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * RG; sg.beginPath(); sg.arc(C.x + Math.cos(a) * r, C.y + Math.sin(a) * r, 10 + Math.random() * 18, 0, Math.PI * 2); sg.fill(); }
      const rag = { x: 70, y: 260 }; let held = false, dirty = 0;
      M.onDown = (p) => { held = Math.hypot(p.x - rag.x, p.y - rag.y) < 40; };
      M.onUp = () => { held = false; };
      M.onMove = (p) => {
        if (!held) return;
        rag.x = p.x; rag.y = p.y;
        sg.save(); sg.globalCompositeOperation = "destination-out"; sg.beginPath(); sg.ellipse(p.x, p.y, 34, 24, 0.4, 0, Math.PI * 2); sg.fill(); sg.restore();
        if (++dirty % 4 === 0 && S) { S.dirt = coverage() * 100; }
      };
      M.onUp = () => { held = false; if (S) S.dirt = coverage() * 100; };
      M.draw = (now) => {
        const g = M.g; g.fillStyle = "#2a3444"; g.fillRect(0, 0, 520, 320);
        g.fillStyle = "#4a5a6a"; g.beginPath(); g.arc(C.x, C.y, RG + 14, 0, Math.PI * 2); g.fill();
        const gr = g.createRadialGradient(C.x, C.y, 10, C.x, C.y, RG); gr.addColorStop(0, "#fff8c8"); gr.addColorStop(1, "#c8b060");
        g.fillStyle = gr; g.beginPath(); g.arc(C.x, C.y, RG, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "rgba(140,120,60,.5)"; g.lineWidth = 3; for (let i = 1; i < 6; i++) { g.beginPath(); g.arc(C.x, C.y, i * 22, 0, Math.PI * 2); g.stroke(); }
        g.save(); g.beginPath(); g.arc(C.x, C.y, RG, 0, Math.PI * 2); g.clip(); g.drawImage(snow, 0, 0); g.restore();
        // 抹布
        g.save(); g.translate(rag.x, rag.y); g.rotate(held ? Math.sin(now / 60) * 0.2 : 0.2);
        g.fillStyle = held ? "#d0645a" : "#c0392b"; g.fillRect(-30, -20, 60, 40); g.fillStyle = "rgba(255,255,255,.3)"; for (let i = -24; i < 30; i += 10) g.fillRect(i, -20, 4, 40);
        g.restore();
        txt(g, "抹布", rag.x, rag.y + 34, "#e8dcc8", 12);
        bar(g, 420, 60, 80, 20, S ? 1 - S.dirt / 100 : 1, S && S.dirt > 60 ? "#e53935" : "#9ad0f0", "乾淨");
        txt(g, S ? `${Math.round(100 - S.dirt)}%` : "—", 460, 70, "#fff", 12);
      };
    }

    // 油桶：按住倒油，按越久倒越多；倒太滿會灑出來（灑掉的油就沒了）
    function openOil() {
      const M = mgOpen("oil", "添油", "按住<b>油桶</b>倒油，按越久倒越多。放手後還會再流一下——倒太滿會灑出來，灑掉的油就浪費了。");
      const BAR = { x: 30, y: 70, w: 150, h: 190 }, TANK = { x: 330, y: 50, w: 110, h: 220 };
      let pour = 0, flow = 0, splash = 0;
      M.onDown = (p) => { if (inRect(BAR, p.x, p.y)) pour = 1; };
      M.onUp = () => { pour = 0; };
      M.step = (dt) => {
        if (!S) return;
        flow = pour ? Math.min(1, flow + dt * 3) : Math.max(0, flow - dt * 2.5);      // 放手後還會流一下
        const amt = Math.min(S.stock, flow * 32 * dt);
        if (amt <= 0) return;
        S.stock -= amt; S.fuel += amt;
        if (S.fuel > 100) { const sp = S.fuel - 100; S.fuel = 100; S.spilled += sp; splash = 1; if (sp > 0.5 && !M.warned) { M.warned = true; toast("油灑出來了！"); } }
        splash = Math.max(0, splash - dt);
      };
      M.draw = (now) => {
        const g = M.g; g.fillStyle = "#2a1e14"; g.fillRect(0, 0, 520, 320);
        // 油桶（往右傾）
        g.save(); g.translate(BAR.x + BAR.w / 2, BAR.y + BAR.h / 2); g.rotate(flow * 0.5);
        g.fillStyle = "#3a5a3a"; g.fillRect(-BAR.w / 2, -BAR.h / 2, BAR.w, BAR.h); g.strokeStyle = "#1a2a1a"; g.lineWidth = 4; g.strokeRect(-BAR.w / 2, -BAR.h / 2, BAR.w, BAR.h);
        g.fillStyle = "#2a4a2a"; g.fillRect(-BAR.w / 2, -50, BAR.w, 10); g.fillRect(-BAR.w / 2, 40, BAR.w, 10);
        txt(g, "油", 0, 0, "#e8dcc8", 28);
        g.restore();
        txt(g, pour ? "倒油中……" : "按住油桶", BAR.x + BAR.w / 2, BAR.y + BAR.h + 30, pour ? "#ffd54f" : "#e8dcc8", 14);
        // 油流
        if (flow > 0.02) { g.strokeStyle = `rgba(200,160,40,${0.4 + flow * 0.6})`; g.lineWidth = 4 + flow * 8; g.beginPath(); g.moveTo(BAR.x + BAR.w, BAR.y + 30); g.quadraticCurveTo(TANK.x - 30, TANK.y - 40, TANK.x + TANK.w / 2, TANK.y + 4); g.stroke(); }
        // 燈的油槽
        g.fillStyle = "#1a1a1a"; g.fillRect(TANK.x, TANK.y, TANK.w, TANK.h);
        const lv = S ? S.fuel / 100 : 1;
        g.fillStyle = "#c8a028"; g.fillRect(TANK.x, TANK.y + TANK.h * (1 - lv), TANK.w, TANK.h * lv);
        g.strokeStyle = "#e8dcc8"; g.lineWidth = 3; g.strokeRect(TANK.x, TANK.y, TANK.w, TANK.h);
        g.strokeStyle = "#e53935"; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(TANK.x - 8, TANK.y + 2); g.lineTo(TANK.x + TANK.w + 8, TANK.y + 2); g.stroke(); g.setLineDash([]);
        txt(g, "滿", TANK.x + TANK.w + 20, TANK.y + 4, "#e53935", 13);
        txt(g, S ? `燈油 ${Math.round(S.fuel)}%` : "", TANK.x + TANK.w / 2, TANK.y + TANK.h + 20, "#fff", 13);
        // 灑出來的油
        if (S?.spilled > 0) { g.fillStyle = `rgba(200,160,40,${0.4 + splash * 0.5})`; g.beginPath(); g.ellipse(TANK.x + TANK.w / 2, 300, 30 + Math.min(80, S.spilled * 2), 10, 0, 0, Math.PI * 2); g.fill(); txt(g, `灑掉 ${Math.round(S.spilled)}`, TANK.x + TANK.w / 2, 300, "#fff", 12); }
        bar(g, 220, 70, 80, 16, S ? S.stock / 240 : 0, "#8a6a2a", "桶裡的油");
        txt(g, S ? `${Math.round(S.stock)}` : "", 260, 100, "#e8dcc8", 12);
      };
    }

    // 航海日誌：用多選一填寫（船名、航向、船燈的顏色）——要先看清楚窗外的船
    let form = null;
    function logTarget() { return S?.ships.find((x) => !x.logged) || null; }
    function openLog() {
      const sh = logTarget();
      if (!sh) { toast("窗外現在沒有要記的船"); return; }
      if (!form || form.ship !== sh) {
        const others = SHIPS.filter((n) => n !== sh.name).sort(() => Math.random() - 0.5).slice(0, 3);
        form = { ship: sh, names: [sh.name, ...others].sort(() => Math.random() - 0.5), pick: {} };
      }
      const q = (key, label, opts) => `<div class="sn-logq"><b>${label}</b><div class="tv-row">${opts.map(([v, t]) => `<button type="button" class="${form.pick[key] === v ? "primary" : "ghost"}" data-act="snLogPick" data-q="${key}" data-v="${esc(v)}">${esc(t)}</button>`).join("")}</div></div>`;
      const ok = ["name", "dir", "light"].every((k) => form.pick[k] != null);
      const left = Math.max(0, SHIP_SEEN - (S.t - sh.t0));
      openPanel("航海日誌", `<p class="tv-note" style="margin:0 0 8px">第 ${S.logged.length + S.wrong + 1} 筆。${left > 0 ? `船還在窗外（大約 ${Math.ceil(left)} 秒）——關掉日誌可以再看一眼。` : "船已經開走了，憑記憶寫吧。"}</p>
        ${q("name", "船名", form.names.map((n) => [n, n]))}
        ${q("dir", "航向", [["1", "往右（東）"], ["-1", "往左（西）"]])}
        ${q("light", "船燈的顏色", Object.entries(LIGHTS).map(([k, v]) => [k, v.n]))}
        <div class="tv-row" style="margin-top:10px"><button type="button" class="primary" data-act="snLogSave" ${ok ? "" : "disabled"}>寫進日誌</button></div>`);
    }
    function saveLog() {
      const sh = form?.ship; if (!sh || !S) return;
      const right = form.pick.name === sh.name && Number(form.pick.dir) === sh.dir && form.pick.light === sh.light;
      sh.logged = true; form = null;
      if (right) { S.logged.push(sh.name); closePanel(); toast(`日誌：${sh.name}，${sh.dir > 0 ? "往東" : "往西"}，${LIGHTS[sh.light].n}的船燈。記好了`); }
      else { S.wrong++; closePanel(); toast(`寫錯了……那艘是${sh.name}，${sh.dir > 0 ? "往東" : "往西"}，${LIGHTS[sh.light].n}的船燈`); }
    }

    function station(k) {
      if (!S) { toast(stageOf("SN00512-03")?.type === "snShift" ? "先點燈開始值班吧" : MAP.stations[k].tip); return; }
      if (k === "wind") openWind();
      if (k === "oil") openOil();
      if (k === "lensSpot") openLens();
      if (k === "log") openLog();
    }

    // ===== 互動 =====
    function click(p) {
      if (LAMP) {
        for (const [k, st] of Object.entries(MAP.stations)) if (dist(p.x, p.y, st.x, st.y) < 60) { reach(st, 110, () => station(k)); return true; }
        return false;
      }
      // 燈塔的門：上頂樓
      if (dist(p.x, p.y, MAP.lightDoor.x, MAP.lightDoor.y) < 60) { reach(MAP.lightDoor, 90, () => api.changeScene("lamp", R.MAPS["SN00512/lamp"].arrive, "燈塔頂樓")); return true; }
      // 柴房：裝柴
      if (inRect({ x: MAP.shed.x - 30, y: MAP.shed.y - 30, w: MAP.shed.w + 60, h: MAP.shed.h + 60 }, p.x, p.y)) {
        const go = () => {
          if (stageOf("SN00512-01")?.type !== "snWood") { toast("柴房的門口停著一台雪橇。柴火堆得整整齊齊"); return; }
          if (D.carrying) { toast("雪橇上已經裝滿柴火了。拉到燈塔門口吧"); return; }
          D.carrying = true; save(); toast(`把柴火綁上雪橇（第 ${D.wood + 1} 趟）。拉著雪橇走得比較慢`);
        };
        reach({ x: MAP.shed.x + MAP.shed.w / 2, y: MAP.shed.y + MAP.shed.h + 30 }, 90, go); return true;
      }
      // 冰洞
      const h = MAP.holes.find((x) => dist(p.x, p.y, x.x, x.y) < 50);
      if (h) { reach(h, 100, () => fishHole(h)); return true; }
      // 冰鈴草
      if (dist(p.x, p.y, MAP.herb.x, MAP.herb.y) < 60) {
        reach(MAP.herb, 100, () => {
          if (stageOf("SN00512-04")?.type !== "snHerb") { toast(trip.done.includes("SN00512-04") ? "冰鈴草被摘走的地方，又冒出了新的花苞" : "雪地裡冒出一叢閉著的花苞。葛蕾塔應該知道這是什麼"); return; }
          if (!bloom()) { toast(`冰鈴草的花苞還閉著……要等暴風雪最大的時候（現在：${Math.round(storm() * 100)}%）`); return; }
          BAG.add(run.items, "iceBell", 1); CM.advance(trip, "SN00512-04"); save();
          toast("叮鈴——你摘下了一串冰做的小鈴鐺。旁邊的雪堆動了一下……");
          api.bark("herb");
        });
        return true;
      }
      return false;
    }
    function act(a, b) {
      if (a === "snStart") { startShift(); return true; }
      if (a === "snLogPick") { if (form) { form.pick[b.dataset.q] = b.dataset.v; openLog(); } return true; }
      if (a === "snLogSave") { saveLog(); return true; }
      return false;
    }

    let lampAsked = false;
    function update(dt) {
      if (LAMP) {
        if (!S && !lampAsked && stageOf("SN00512-03")?.type === "snShift" && !api.isBusy()) {
          lampAsked = true;
          openPanel("燈塔頂樓", `<p class="wx-p">頂樓很窄，正中間是一顆比你還高的透鏡。牆邊是發條、油桶，窗邊的桌上攤著航海日誌。</p>
            <ul class="wx-list"><li><b>發條</b>：按住握把順時針轉，上緊了燈才會轉（慢慢會鬆掉）</li><li><b>油桶</b>：按住倒油，倒太滿會灑——油燒完燈就熄，<b>燈熄了就要重來</b></li><li><b>透鏡</b>：按住抹布把玻璃上的雪擦掉，雪會讓燈變暗</li><li><b>航海日誌</b>：窗外有船經過時，看清楚船名、往哪邊開、船燈的顏色，再到日誌上選</li></ul>
            <p class="tv-note">值一班大約 ${DUR} 秒。走下右下角的樓梯會中斷值班。</p>
            <div class="tv-row"><button type="button" class="primary" data-act="snStart">點燈，開始值班</button></div>`);
        }
        if (inRect(MAP.stairs, me.x, me.y)) {
          if (S) { S = null; toast("值班中斷了。燈塔不能沒有人——要重新值一班"); }
          api.changeScene(null, { x: MAIN.lightDoor.x, y: MAIN.lightDoor.y + 80 }, "燈塔下");
        }
        return;
      }
      // 雪橇送到燈塔門口
      if (D.carrying && near(MAP.lightDoor, 130) && stageOf("SN00512-01")?.type === "snWood") {
        D.carrying = false; D.wood++;
        const st = stageOf("SN00512-01");
        const fin = D.wood >= st.need && CM.advance(trip, "SN00512-01");
        save();
        toast(D.wood >= st.need ? (fin ? "委託完成！" : "柴火都送到了！告訴莉亞吧") : `卸下柴火（${D.wood} / ${st.need}）。再回柴房拉一趟`);
      }
    }
    function speedMul() { return LAMP ? 1 : (1 - 0.3 * storm()) * (D.carrying ? 0.6 : 1); }
    function blocked(x, y, h) { if (LAMP) return false; for (const c of MAP.roundSolids) if (Math.abs(x - c.x) < c.r + h && Math.abs(y - c.y) < c.r + h && dist(x, y, c.x, c.y) < c.r + h * 0.8) return true; return false; }

    function stageText(id, st) {
      if (!st) return null;
      if (st.type === "snWood") return `${st.text}（${D.wood} / ${st.need}${D.carrying ? "・雪橇上有柴火" : ""}）`;
      if (st.type === "snIce") return `${st.text}（${Object.keys(D.fished).length} / ${st.need}）`;
      if (st.type === "snHerb") return `${st.text}（暴風雪：${Math.round(storm() * 100)}%${bloom() ? "・花開了！" : ""}）`;
      if (st.type === "snShift" && S) return `值班中：${Math.ceil(DUR - S.t)} 秒・油 ${Math.round(S.fuel)}%`;
      return null;
    }

    // ===== 繪圖 =====
    function pine(t, now) {
      const s = t.size, sway = Math.sin(now / 900 + t.x) * 2 * storm();
      ctx.fillStyle = "rgba(60,80,100,.18)"; ctx.beginPath(); ctx.ellipse(t.x + 8, t.y + 8, s * 0.6, s * 0.22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#5a3a22"; ctx.fillRect(t.x - 6, t.y - 14, 12, 22);
      for (let i = 0; i < 3; i++) {
        const w = s * (0.95 - i * 0.22), y = t.y - 10 - i * s * 0.42, top = y - s * 0.55;
        ctx.fillStyle = "#2f5a44"; ctx.beginPath(); ctx.moveTo(t.x - w + sway, y); ctx.lineTo(t.x + w + sway, y); ctx.lineTo(t.x + sway * 1.5, top); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#f4f8fb"; ctx.beginPath(); ctx.moveTo(t.x - w * 0.55 + sway, top + (y - top) * 0.5); ctx.lineTo(t.x + w * 0.55 + sway, top + (y - top) * 0.5); ctx.lineTo(t.x + sway * 1.5, top); ctx.closePath(); ctx.fill();
      }
    }
    function tower(now) {
      const L = MAP.light, x = L.x, y = L.y, top = y - 300;
      ctx.fillStyle = "rgba(60,80,100,.22)"; ctx.beginPath(); ctx.ellipse(x + 20, y + 10, L.r + 10, L.r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f4f4f2"; ctx.beginPath(); ctx.moveTo(x - L.r * 0.8, y); ctx.lineTo(x - L.r * 0.5, top); ctx.lineTo(x + L.r * 0.5, top); ctx.lineTo(x + L.r * 0.8, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#c0392b";
      for (const k of [0.25, 0.6]) { const yy = y - (y - top) * k, w0 = L.r * (0.8 - 0.3 * k); ctx.fillRect(x - w0, yy - 24, w0 * 2, 40); }
      ctx.strokeStyle = "#5a6a7a"; ctx.lineWidth = 3; ctx.strokeRect(x - L.r * 0.5, top, L.r, 1);
      ctx.fillStyle = "#3a4a5a"; ctx.fillRect(x - 50, top - 70, 100, 70);
      ctx.fillStyle = lampOn(now) ? "#fff2a8" : "#6a7a8a"; ctx.fillRect(x - 38, top - 60, 76, 50);
      ctx.fillStyle = "#c0392b"; ctx.beginPath(); ctx.moveTo(x - 60, top - 70); ctx.lineTo(x, top - 120); ctx.lineTo(x + 60, top - 70); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#4a3a2a"; ctx.fillRect(x - 22, y - 46, 44, 46);                           // 門
      text("燈塔", x, y - 58, "#3a4a5a", 13, 900);
    }
    // 燈塔守病倒之後，燈火時明時滅（值完一班之後就穩了）
    const lampOn = (now) => trip.done.includes("SN00512-03") || Math.sin(now / 700) + Math.sin(now / 263) > -0.9;
    function drawFloor(now, x0, y0) {
      if (LAMP) return drawLampRoom(now, x0, y0);
      ctx.fillStyle = "#eef3f7"; ctx.fillRect(x0, y0, 1280, 720);
      const F = MAP.forest;
      ctx.fillStyle = "#e2eaf0"; ctx.fillRect(F.x, F.y, F.w, F.h);
      ctx.fillStyle = "#dde5ec"; ctx.fillRect(MAP.path.x, MAP.path.y, MAP.path.w, MAP.path.h);
      // 小鎮的雪路
      ctx.fillStyle = "#dfe6ec"; ctx.fillRect(700, 1220, 1500, 110); ctx.fillRect(1360, 1220, 100, 520); ctx.fillRect(2000, 760, 110, 520); ctx.fillRect(2000, 760, 520, 100);
      // 結冰的港口、外面的海
      ctx.fillStyle = "#cfe5f1"; ctx.fillRect(0, MAP.iceY, MAP.w, MAP.h - MAP.iceY);
      ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 2;
      for (let i = 0; i < 14; i++) { const x = 120 + i * 190, y = MAP.iceY + 60 + (i % 4) * 50; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 70, y + 18); ctx.lineTo(x + 110, y + 4); ctx.stroke(); }
      ctx.fillStyle = "#3a6a8a"; ctx.fillRect(0, 2060, MAP.w, MAP.h - 2060);
      ctx.fillStyle = "rgba(255,255,255,.3)"; for (let x = 0; x < MAP.w; x += 140) ctx.fillRect(x + Math.sin(now / 800 + x) * 20, 2100, 60, 4);
      // 碼頭
      const P = MAP.pier;
      ctx.fillStyle = "#8a6a4a"; ctx.fillRect(P.x, P.y, P.w, P.h); ctx.strokeStyle = "rgba(60,35,15,.4)"; ctx.lineWidth = 1;
      for (let y = P.y; y < P.y + P.h; y += 18) { ctx.beginPath(); ctx.moveTo(P.x, y); ctx.lineTo(P.x + P.w, y); ctx.stroke(); }
      ctx.fillStyle = "#fff"; ctx.fillRect(P.x, P.y, P.w, 8);
      // 冰洞
      for (const h of MAP.holes) {
        ctx.fillStyle = "#f4f9fc"; ctx.beginPath(); ctx.ellipse(h.x, h.y, 38, 18, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = D.fished[h.id] ? "#6a8aa0" : "#1f4a66"; ctx.beginPath(); ctx.ellipse(h.x, h.y, 28, 12, 0, 0, Math.PI * 2); ctx.fill();
        if (stageOf("SN00512-02")?.type === "snIce" && !D.fished[h.id]) { ctx.strokeStyle = `rgba(242,194,0,${0.5 + 0.4 * Math.sin(now / 250)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(h.x, h.y, 50, 26, 0, 0, Math.PI * 2); ctx.stroke(); }
      }
      // 柴房
      const Sd = MAP.shed;
      ctx.fillStyle = "#6a4a2a"; ctx.fillRect(Sd.x, Sd.y, Sd.w, Sd.h); ctx.fillStyle = "#f4f8fb"; ctx.fillRect(Sd.x - 8, Sd.y - 10, Sd.w + 16, 22);
      ctx.fillStyle = "#a8743a"; for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) { ctx.beginPath(); ctx.arc(Sd.x + 24 + i * 30, Sd.y + 40 + j * 30, 12, 0, Math.PI * 2); ctx.fill(); }
      text("柴房", Sd.x + Sd.w / 2, Sd.y - 20, "#3a2a1a", 13, 900);
      if (!D.carrying && stageOf("SN00512-01")?.type === "snWood") { ctx.fillStyle = "#8a5a2a"; ctx.fillRect(Sd.x + Sd.w / 2 - 30, Sd.y + Sd.h + 14, 60, 22); }
      // 冰鈴草（暴風雪最大的時候發光、開花）
      const H = MAP.herb, b = bloom();
      {
        for (let i = 0; i < 5; i++) {
          const a = i * 1.25, x = H.x + Math.cos(a) * 18, y = H.y + Math.sin(a) * 10;
          ctx.strokeStyle = "#4a7a6a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.lineTo(x, y); ctx.stroke();
          ctx.fillStyle = b ? `rgba(200,236,255,${0.8 + 0.2 * Math.sin(now / 150 + i)})` : "#8ab0c0";
          ctx.beginPath(); b ? ctx.arc(x, y, 7, 0, Math.PI) : ctx.ellipse(x, y, 3, 6, 0, 0, Math.PI * 2); ctx.fill();
        }
        if (b) { ctx.strokeStyle = `rgba(160,220,255,${0.4 + 0.3 * Math.sin(now / 200)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(H.x, H.y, 36, 0, Math.PI * 2); ctx.stroke(); }
        if (active("SN00512-04")) text(b ? "冰鈴草（開花了！）" : "冰鈴草（花苞）", H.x, H.y - 30, "#2a5a7a", 12, 900);
      }
      // 房子的屋頂積雪（房子本身是 buildings，引擎畫）
    }
    function drawLampRoom(now, x0, y0) {
      ctx.fillStyle = "#1a2230"; ctx.fillRect(x0, y0, 1400, 980);
      const w = MAP.walk[0];
      ctx.fillStyle = "#8a6a4a"; ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeStyle = "rgba(60,35,15,.35)"; ctx.lineWidth = 1; for (let y = w.y; y < w.y + w.h; y += 30) { ctx.beginPath(); ctx.moveTo(w.x, y); ctx.lineTo(w.x + w.w, y); ctx.stroke(); }
      ctx.strokeStyle = "#3a2410"; ctx.lineWidth = 8; ctx.strokeRect(w.x, w.y, w.w, w.h);
      // 窗外的海（船從左往右經過）
      const Wn = MAP.window;
      ctx.fillStyle = "#0e2a44"; ctx.fillRect(Wn.x, Wn.y - 100, Wn.w, 100);
      ctx.fillStyle = "#1f4a66"; ctx.fillRect(Wn.x, Wn.y - 40, Wn.w, 40);
      if (S) for (const sh of S.ships) {
        const k = (S.t - sh.t0) / SHIP_SEEN; if (k > 1) continue;
        const x = sh.dir > 0 ? Wn.x + k * Wn.w : Wn.x + Wn.w - k * Wn.w, y = Wn.y - 44, f = sh.dir;
        ctx.fillStyle = "#3a2a1a"; ctx.beginPath(); ctx.moveTo(x - 30 * f, y); ctx.lineTo(x + 34 * f, y); ctx.lineTo(x + 20 * f, y + 12); ctx.lineTo(x - 20 * f, y + 12); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#e8e2d0"; ctx.beginPath(); ctx.moveTo(x, y - 34); ctx.lineTo(x, y - 2); ctx.lineTo(x + 22 * f, y - 2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = LIGHTS[sh.light].c; ctx.beginPath(); ctx.arc(x + 26 * f, y - 4, 5 + Math.sin(now / 200) * 1.2, 0, Math.PI * 2); ctx.fill();
        text(sh.name, x, y - 46, sh.logged ? "#9ad0a0" : "#ffe9a0", 12, 900);
      }
      ctx.strokeStyle = "#3a2410"; ctx.lineWidth = 6; ctx.strokeRect(Wn.x, Wn.y - 100, Wn.w, 100);
      text("窗外的海", Wn.x + Wn.w / 2, Wn.y + 16, "#e8dcc8", 12, 900);
      // 透鏡（中間）
      const L = MAP.lens, lit = !S || (S.wind > 0 && S.dirt < 75), on = !S || S.fuel > 0, rot = S && S.wind > 0 ? now / 600 : 0;
      ctx.fillStyle = "#3a4a5a"; ctx.fillRect(620, 380, 160, 160);
      ctx.fillStyle = on ? (lit ? "#fff2a8" : "#c8b880") : "#4a5a6a"; ctx.beginPath(); ctx.arc(L.x, L.y, 64, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(140,160,180,.8)"; ctx.lineWidth = 3; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(L.x, L.y, 18 + i * 8, rot + i, rot + i + 2.2); ctx.stroke(); }
      if (S) { ctx.fillStyle = `rgba(200,210,220,${S.dirt / 140})`; ctx.beginPath(); ctx.arc(L.x, L.y, 64, 0, Math.PI * 2); ctx.fill(); }
      if (on && lit) { ctx.fillStyle = "rgba(255,240,170,.18)"; ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.arc(L.x, L.y, 380, rot, rot + 0.5); ctx.closePath(); ctx.fill(); }
      // 各個工作的地方
      const ico = { wind: "⚙", oil: "油", lensSpot: "擦", log: "誌" };
      for (const [k, st] of Object.entries(MAP.stations)) {
        const warn = S && ((k === "wind" && S.wind < 30) || (k === "oil" && S.fuel < 35) || (k === "lensSpot" && S.dirt > 60) || (k === "log" && S.ships.some((x) => !x.logged)));
        ctx.fillStyle = "#5a3a1a"; ctx.fillRect(st.x - 34, st.y - 30, 68, 50);
        ctx.strokeStyle = warn ? `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 150)})` : "#2a1a0a"; ctx.lineWidth = warn ? 5 : 3; ctx.strokeRect(st.x - 34, st.y - 30, 68, 50);
        text(ico[k], st.x, st.y - 5, "#fff2d0", 20, 900); text(st.name, st.x, st.y - 44, "#fff2d0", 12, 900);
      }
      // 樓梯
      const sr = MAP.stairs; ctx.fillStyle = "#4a3420"; ctx.fillRect(sr.x, sr.y, sr.w, sr.h);
      ctx.strokeStyle = "#2a1a0a"; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(sr.x, sr.y + i * 16); ctx.lineTo(sr.x + sr.w, sr.y + i * 16); ctx.stroke(); }
      text("下樓", sr.x + sr.w / 2, sr.y - 10, "#fff2d0", 12, 900);
    }
    function draw(now) {
      if (LAMP) return;
      for (const t of MAP.forestTrees) if (t.y <= me.y) pine(t, now);
      if (MAP.light.y <= me.y + 40) tower(now);
      // 拉著的雪橇
      if (D.carrying) {
        const sx = me.x - 10, sy = me.y + 34;
        ctx.strokeStyle = "#5a3a22"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(me.x, me.y + 10); ctx.lineTo(sx, sy - 6); ctx.stroke();
        ctx.fillStyle = "#8a5a2a"; ctx.fillRect(sx - 30, sy - 8, 60, 18);
        ctx.fillStyle = "#a8743a"; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(sx - 22 + i * 15, sy - 12, 8, 0, Math.PI * 2); ctx.fill(); }
        ctx.strokeStyle = "#3a2410"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx - 34, sy + 12); ctx.lineTo(sx + 36, sy + 12); ctx.quadraticCurveTo(sx + 44, sy + 10, sx + 40, sy + 2); ctx.stroke();
      }
    }
    function drawTop(now) {
      const m = ctx.getTransform(), x0 = -m.e / m.a, y0 = -m.f / m.d;
      if (LAMP) {
        if (!S) return;
        // 值班的儀表（畫面左下）
        const bx = x0 + 24, by = y0 + 470;
        ctx.fillStyle = "rgba(20,26,36,.85)"; ctx.fillRect(bx, by, 300, 140);
        const bar = (i, label, v, col) => { text(label, bx + 40, by + 24 + i * 28, "#e8dcc8", 13, 900); ctx.fillStyle = "#333"; ctx.fillRect(bx + 80, by + 16 + i * 28, 200, 14); ctx.fillStyle = col; ctx.fillRect(bx + 80, by + 16 + i * 28, 2 * Math.max(0, v), 14); };
        bar(0, "油", S.fuel, S.fuel < 35 ? "#e53935" : "#e8b81e"); bar(1, "發條", S.wind, S.wind < 30 ? "#e53935" : "#4a8fe0"); bar(2, "透鏡", 100 - S.dirt, S.dirt > 60 ? "#e53935" : "#9ad0f0");
        text(`天亮還有 ${Math.ceil(DUR - S.t)} 秒・日誌 ${S.logged.length} 艘${S.wrong ? `（記錯 ${S.wrong}）` : ""}${S.missed ? `（漏記 ${S.missed}）` : ""}・桶裡的油 ${Math.round(S.stock)}`, bx + 150, by + 122, "#fff2a8", 13, 900);
        return;
      }
      for (const t of MAP.forestTrees) if (t.y > me.y) pine(t, now);
      if (MAP.light.y > me.y + 40) tower(now);
      // 燈塔的光：轉動的光束（燈塔守病倒時時明時滅）
      if (lampOn(now)) {
        const L = MAP.light, a = now / 1400, lx = L.x, ly = L.y - 335;
        const g = ctx.createRadialGradient(lx, ly, 10, lx, ly, 900); g.addColorStop(0, "rgba(255,240,170,.45)"); g.addColorStop(1, "rgba(255,240,170,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.arc(lx, ly, 900, a, a + 0.35); ctx.closePath(); ctx.fill();
      }
      // 暴風雪：雪花＋看不清楚（玩家身邊比較清楚）
      const s = storm();
      ctx.fillStyle = "rgba(255,255,255,.9)";
      const n = Math.round(40 + 160 * s);
      for (let i = 0; i < n; i++) {
        const x = x0 + ((i * 173 + now / (10 - s * 6)) % 1320) - 20, y = y0 + ((i * 97 + now / (14 - s * 8) * (1 + (i % 3) * 0.3)) % 740) - 10;
        ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 3) * (0.6 + s), 0, Math.PI * 2); ctx.fill();
      }
      const px = me.x, py = me.y, g2 = ctx.createRadialGradient(px, py, 120, px, py, 520);
      g2.addColorStop(0, "rgba(236,242,248,0)"); g2.addColorStop(1, `rgba(236,242,248,${0.7 * s})`);
      ctx.fillStyle = g2; ctx.fillRect(x0, y0, 1280, 720);
      if (s > 0.85) text("暴風雪最大的時候", x0 + 640, y0 + 92, "#2a5a7a", 15, 900);
    }
    function drawEnemy(e, now, red) {
      const n = MAP.wolf?.packs?.[e.kind];
      if (!n || !R.EnemyArt?.blockBear) return false;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + e.hx, ox = n > 1 ? Math.cos(a) * 20 : 0, oy = n > 1 ? Math.sin(a) * 14 : 0;
        R.EnemyArt.blockBear(ctx, { r: 15, x: e.x + i, facing: e.face, alive: true, def: {} }, { x: e.x + ox, y: e.y + oy + Math.sin(now / 160 + i) * (e.chasing ? 2 : 0.5) }, now);
      }
      if (red) { ctx.strokeStyle = "#e53935"; ctx.lineWidth = 3; ctx.strokeRect(e.x - 40, e.y - 36, 80, 72); }
      if (n > 2) text(`×${n}`, e.x + 34, e.y - 30, "#5a3218", 11, 900);
      return true;
    }
    function mini(dot, now) {
      if (LAMP) return;
      const blink = `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`;
      if (stageOf("SN00512-01")?.type === "snWood") dot(D.carrying ? MAP.lightDoor.x : MAP.shed.x + 80, D.carrying ? MAP.lightDoor.y : MAP.shed.y + 50, 4, blink);
      if (stageOf("SN00512-02")?.type === "snIce") for (const h of MAP.holes) if (!D.fished[h.id]) dot(h.x, h.y, 3.5, blink);
      if (stageOf("SN00512-03")?.type === "snShift") dot(MAP.lightDoor.x, MAP.lightDoor.y, 4, blink);
      if (stageOf("SN00512-04")?.type === "snHerb") dot(MAP.herb.x, MAP.herb.y, 4, bloom() ? "#9ad0f0" : blink);
      dot(MAP.light.x, MAP.light.y, 5, "#c0392b");
    }
    return { update, click, act, draw, drawFloor, drawTop, drawEnemy, mini, stageText, speedMul, blocked, dbg: { get S() { return S; }, D, storm } };
  };
})();
