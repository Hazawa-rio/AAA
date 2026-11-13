/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/er00119.js": "20261113145157" });
// #ER00119 有點偏執的急診室
//   ER00119-01 只是打了個噴嚏：在心電圖監視器上排出正常的竇性心律（P → QRS → T，三拍；選錯就從頭來）
//   ER00119-02 被完美縫合的病人們：為三位病人算出鎮靜劑量（體重 × 係數 ÷ 濃度，剛好小數點第五位）→ 手術室打首席外科醫師
//   ER00119-03 風水上的完美：把四張病床轉回羅盤牌上的角度（±45°、±7.5°）
(function () {
  const R = (window.RPG = window.RPG || {});
  R.WorldHooks = R.WorldHooks || {};

  R.WorldHooks.ER00119 = function (api) {
    const { MAP, trip, run, toast, text, save, esc, panel } = api;
    const K = R.BKit(api), ctx = api.ctx();
    const Q1 = K.q("ER00119-01"), Q2 = K.q("ER00119-02"), Q3 = K.q("ER00119-03");
    Q2.dosed = Q2.dosed || {}; Q3.ang = Q3.ang || {};
    const N = (name, color, face) => ({ name, color, face });
    const DOC = N("主治醫師・精準", "#2a8a7a", "精");

    // ===== ER-01：心電圖 =====
    const WAVES = {
      P: { name: "P 波", d: "q 10 -14 20 0", w: 20 },
      QRS: { name: "QRS 波群", d: "l 4 6 l 6 -46 l 6 52 l 4 -12", w: 20 },
      T: { name: "T 波", d: "q 14 -22 28 0", w: 28 },
      F: { name: "顫動波", d: "l 4 -5 l 4 8 l 4 -7 l 4 6 l 4 -2", w: 20, bad: "那是心房顫動的波形。竇性心律不會有這個。" },
      ST: { name: "ST 段上升", d: "l 6 -16 l 16 0 l 6 16", w: 28, bad: "ST 段上升？那是心肌梗塞的徵兆，不是正常的心律。" },
      U: { name: "多一個 U 波", d: "q 6 -8 12 0", w: 12, bad: "多了一個 U 波。不夠完美。" },
    };
    const ORDER = ["P", "QRS", "T"];
    let ecg = [];
    function ecgSvg() {
      let d = "M 0 60 l 14 0";
      for (const k of ecg) d += ` ${WAVES[k].d} l 14 0`;
      return `<svg viewBox="0 0 560 100" style="width:100%;height:110px;background:#0a1a14;border-radius:8px;display:block">
        <defs><pattern id="ecgGrid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1a4a34" stroke-width="1"/></pattern></defs>
        <rect width="560" height="100" fill="url(#ecgGrid)"/><path d="${d}" fill="none" stroke="#5aff9a" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
    }
    function ecgPanel(msg) {
      const beats = Math.floor(ecg.length / 3), keys = Object.keys(WAVES).sort(() => Math.random() - 0.5);
      api.openPanel("三號床・心電圖監視器", `${ecgSvg()}
        <p class="wx-p">${esc(msg || "病人緊張得心跳亂成一團。一個波形一個波形，幫他把心跳「排好」：正常的竇性心律，每一拍都是 P 波 → QRS 波群 → T 波。")}</p>
        <p class="tv-note">已經排好 ${beats} / 3 拍（這一拍：${ecg.length % 3} / 3）・選錯就要從頭來。按鈕的順序每次都會打亂。</p>
        <div class="tv-row" style="flex-wrap:wrap">${keys.map((k) => `<button type="button" class="ghost" data-act="erWave" data-k="${k}">${esc(WAVES[k].name)}</button>`).join("")}</div>`);
    }
    function pickWave(k) {
      const want = ORDER[ecg.length % 3];
      if (k !== want) {
        ecg = []; api.sfx?.("sounds/boss-electric.mp3");
        api.dlg("三號床・心電圖監視器", DOC, `嗶——！${WAVES[k].bad || `順序不對，${WAVES[want].name}應該在這裡。`}這張心電圖不夠完美，重來。`, `<button type="button" class="primary" data-act="erEcg">再排一次</button>`);
        return;
      }
      ecg.push(k);
      if (ecg.length >= 9) {
        ecg = []; K.adv("ER00119-01", "正常的竇性心律！出院單蓋好了，回去找安娜");
        api.dlg("三號床・心電圖監視器", DOC, "P、QRS、T……P、QRS、T……P、QRS、T。完美的竇性心律。……可惜了這個鼻子。好吧，准予出院。", `<button type="button" class="ghost" data-close>好</button>`);
        return;
      }
      ecgPanel(ecg.length % 3 === 0 ? `一拍完成了。再來一拍。` : null);
    }

    // ===== ER-02：訂製的鎮靜劑量 =====
    const doseOf = (p) => (Math.round((p.w * p.k / p.c) * 1e5) / 1e5).toFixed(5);
    function dosePanel(p, msg) {
      const done = Q2.dosed[p.id];
      api.openPanel(`地下病房・${p.name}`, `<p class="wx-p">${esc(p.was)}進來的。${esc(p.now)}。他看著你，很慢很慢地說出了自己的名字。</p>
        <div class="tv-npc"><span class="face" style="border-color:#2a8a7a;color:#2a8a7a">牌</span><p>床頭的公式：<b>劑量（毫升）＝體重 × 係數 ÷ 濃度</b><br>體重 ${p.w} 公斤・係數 ${p.k}・藥劑濃度 ${p.c}</p></div>
        ${done ? `<p class="tv-note">已經打過鎮靜針了（${doseOf(p)} 毫升）。他睡得很熟。</p>` : `<p class="tv-note">${esc(msg || "訂製單：劑量要剛好算到小數點第五位（四捨五入），多一位少一位，藥房都不收。")}</p>
        <div class="tv-row"><input id="erDoseIn" type="text" inputmode="decimal" placeholder="例如 0.12345" style="flex:1;min-width:0;padding:8px 10px;border-radius:8px;border:2px solid #c9c3b6;font:inherit">
        <button type="button" class="primary" data-act="erDose" data-id="${p.id}">送出訂製單</button></div>`}`);
      setTimeout(() => panel.querySelector("#erDoseIn")?.focus(), 30);
    }
    function submitDose(p) {
      const v = (panel.querySelector("#erDoseIn")?.value || "").trim();
      if (!/^\d+\.\d{5}$/.test(v)) return dosePanel(p, `藥房退件：「${v || "（空白）"}」——要剛好寫到小數點第五位，不多不少。`);
      if (v !== doseOf(p)) {
        const n = Math.min(Math.round(api.maxHp() * 0.06), Math.max(0, run.hp - 1));
        if (n > 0) { run.hp -= n; save(); api.renderHud(); }
        return dosePanel(p, `針送來了，可是劑量不對——${p.name.slice(-3)}痛得揮了一下多出來的手臂（-${n}）。再算一次。`);
      }
      Q2.dosed[p.id] = true; save(); api.renderHud();
      api.sfx?.("sounds/guan-chime.mp3");
      const n = Object.keys(Q2.dosed).length;
      api.closePanel();
      if (n >= 3) K.adv("ER00119-02", "三位病人都睡著了。去東北邊的手術室找首席外科醫師");
      else toast(`牆上的管子「咻」地送來一支針：${v} 毫升，剛剛好。${p.name}慢慢睡著了（${n} / 3）`);
    }

    // ===== ER-03：風水角度 =====
    const angOf = (b) => ((Q3.ang[b.id] ?? 0) % 360 + 360) % 360;
    const bedOk = (b) => Math.abs(angOf(b) - b.goal) < 0.01;
    function bedPanel(b) {
      const a = angOf(b), ok = bedOk(b);
      api.openPanel("急診區的病床", `<div style="display:flex;gap:16px;align-items:center">
        <svg viewBox="-70 -70 140 140" style="width:150px;height:150px;flex:none;background:#f4f0e6;border-radius:50%">
          <circle r="66" fill="none" stroke="#c9c3b6" stroke-width="2"/>${[0, 90, 180, 270].map((d, i) => `<text x="${Math.sin(d * Math.PI / 180) * 56}" y="${-Math.cos(d * Math.PI / 180) * 56 + 4}" text-anchor="middle" font-size="11" font-weight="900" fill="#8a6a3a">${"北東南西"[i]}</text>`).join("")}
          <line x1="0" y1="0" x2="${Math.sin(b.goal * Math.PI / 180) * 60}" y2="${-Math.cos(b.goal * Math.PI / 180) * 60}" stroke="#e5b800" stroke-width="3" stroke-dasharray="4 3"/>
          <g transform="rotate(${a})"><rect x="-16" y="-34" width="32" height="68" rx="5" fill="${ok ? "#bfe8c8" : "#ffffff"}" stroke="#3a5a6a" stroke-width="3"/><rect x="-12" y="-30" width="24" height="12" rx="3" fill="#dfe8f0"/></g></svg>
        <div><p class="wx-p">床尾的羅盤牌：<b>${b.goal}°</b>（床頭朝向，北＝0°，順時針）</p><p class="wx-p">現在：<b>${a}°</b>${ok ? "　<span style='color:#2e7a46'>✓ 一度都不差</span>" : ""}</p></div></div>
        <div class="tv-row" style="flex-wrap:wrap">${[-45, -7.5, 7.5, 45].map((d) => `<button type="button" class="ghost" data-act="erTurn" data-id="${b.id}" data-d="${d}">${d > 0 ? "順時針" : "逆時針"} ${Math.abs(d)}°</button>`).join("")}</div>`);
    }
    function turn(b, d) {
      Q3.ang[b.id] = (angOf(b) + d + 360) % 360; save();
      api.sfx?.("sounds/robot-move.mp3");
      const n = MAP.beds.filter(bedOk).length;
      api.renderHud();
      if (bedOk(b) && n >= MAP.beds.length) { api.closePanel(); K.adv("ER00119-03", "四張病床都轉回去了。回去找魏先生"); return; }
      bedPanel(b);
      if (bedOk(b)) toast(`這張床的角度對了（${n} / ${MAP.beds.length}）`);
    }

    // ===== 點擊 =====
    function click(p) {
      const m = MAP.sneeze.monitor;
      if (K.hit(p, m, 50) || K.hit(p, MAP.sneeze, 60)) {
        K.reach(m, 100, () => {
          if (K.is("ER00119-01", "erEcg")) { ecg = []; ecgPanel(); }
          else api.dlg("三號床", { name: "打噴嚏的病人", color: "#8a8a8a", face: "嚏" }, K.active("ER00119-01") || !trip.done.includes("ER00119-01") ? "哈——啾！……對不起。他們說我的鼻子不夠完美。我只是想回家。" : "（空床。床單被摺成了完美的直角。）");
        });
        return true;
      }
      const pt = MAP.patients.find((x) => K.hit(p, x, 60));
      if (pt) { K.reach(pt, 100, () => (K.is("ER00119-02", "erDose") || Q2.dosed[pt.id] ? dosePanel(pt) : api.dlg("地下病房", { name: pt.name, color: "#9a7a8a", face: pt.ch }, `……我……是${pt.name.slice(-3)}。我是因為${pt.was}來的。……我想回家。`))); return true; }
      const b = MAP.beds.find((x) => K.hit(p, x, 60));
      if (b) { K.reach(b, 110, () => (K.is("ER00119-03", "erBed") ? bedPanel(b) : toast(`床尾掛著羅盤牌：${b.goal}°`))); return true; }
      return false;
    }
    function act(a, b) {
      if (a === "erWave") { pickWave(b.dataset.k); return true; }
      if (a === "erEcg") { ecg = []; ecgPanel(); return true; }
      if (a === "erDose") { submitDose(MAP.patients.find((x) => x.id === b.dataset.id)); return true; }
      if (a === "erTurn") { turn(MAP.beds.find((x) => x.id === b.dataset.id), +b.dataset.d); return true; }
      return false;
    }

    // ===== 畫面 =====
    function bed(x, y, a, col = "#ffffff", used) {
      ctx.save(); ctx.translate(x, y); ctx.rotate((a * Math.PI) / 180);
      ctx.fillStyle = "rgba(0,0,0,.12)"; ctx.fillRect(-26, -50, 60, 108);
      ctx.fillStyle = col; ctx.strokeStyle = "#3a5a6a"; ctx.lineWidth = 3; api.rr(-28, -56, 56, 112, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#dfe8f0"; api.rr(-22, -50, 44, 22, 5); ctx.fill();
      if (used) { ctx.fillStyle = used; api.rr(-22, -20, 44, 66, 5); ctx.fill(); }
      ctx.restore();
    }
    function drawFloor(now, x0, y0) {
      ctx.fillStyle = "#e9eef0"; ctx.fillRect(x0, y0, 1280, 720);
      // 磁磚（完美對齊）
      ctx.strokeStyle = "rgba(120,150,160,.18)"; ctx.lineWidth = 1;
      for (let x = Math.floor(x0 / 80) * 80; x < x0 + 1280; x += 80) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + 720); ctx.stroke(); }
      for (let y = Math.floor(y0 / 80) * 80; y < y0 + 720; y += 80) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + 1280, y); ctx.stroke(); }
      const Rm = MAP.rooms;
      ctx.fillStyle = "#d8ece6"; ctx.fillRect(Rm.surgery.x, Rm.surgery.y, Rm.surgery.w, Rm.surgery.h);
      ctx.fillStyle = "#cfc8d4"; ctx.fillRect(Rm.basement.x, Rm.basement.y, Rm.basement.w, Rm.basement.h);
      ctx.fillStyle = "#f2ece0"; ctx.fillRect(Rm.lobby.x, Rm.lobby.y, Rm.lobby.w, Rm.lobby.h);
      // 地上的綠線（往急診）
      ctx.fillStyle = "#3a9a8a"; ctx.fillRect(300, 1300, 1900, 8);
      text("手術室", Rm.surgery.x + 90, Rm.surgery.y + 34, "#2a6a5a", 16, 900);
      text("地下病房", Rm.basement.x + 90, Rm.basement.y + 830, "#5a4a5a", 16, 900);
      text("掛號大廳", 300, 1380, "#8a6a3a", 16, 900);
      text("急診病床區", 1300, 640, "#2a6a5a", 16, 900);
      for (const s of MAP.solids) { ctx.fillStyle = "#8a9aa2"; ctx.fillRect(s.x, s.y, s.w, s.h); }
      text("掛號", 910, 1505, "#fff", 13, 900);
      // 手術燈
      const sx = 2160, sy = 300; ctx.fillStyle = "rgba(255,255,230,.6)"; ctx.beginPath(); ctx.arc(sx, sy, 90 + Math.sin(now / 600) * 3, 0, Math.PI * 2); ctx.fill();
      bed(sx, sy, 0, "#e8f4f0");
      // 裝飾：本來就歪的床
      for (const o of MAP.oddBeds) bed(o.x, o.y, o.a);
      // 三號床＋心電圖監視器
      const sn = MAP.sneeze, m = sn.monitor;
      bed(sn.x, sn.y, 0, "#ffffff", trip.done.includes("ER00119-01") ? null : "#c8d8f0");
      if (!trip.done.includes("ER00119-01")) K.human(sn.x, sn.y - 14, "#8a8a8a", "嚏", now, { s: 30 });
      ctx.fillStyle = "#1d2a2a"; api.rr(m.x - 34, m.y - 26, 68, 46, 6); ctx.fill();
      ctx.strokeStyle = "#5aff9a"; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= 60; i++) { const k = ((i + now / 30) % 60) / 60, sp = k > 0.45 && k < 0.52 ? -14 * Math.sin((k - 0.45) / 0.07 * Math.PI) : 0; ctx.lineTo(m.x - 30 + i, m.y + sp); }
      ctx.stroke();
      text("三號床", sn.x, sn.y + 74, "#3a5a6a", 12, 900);
      // 地下病房的病人
      for (const p of MAP.patients) { bed(p.x, p.y, 0, "#f4eef4", Q2.dosed[p.id] ? "#d8e8f8" : "#e8c8d0"); K.human(p.x, p.y - 14, "#9a7a8a", p.ch, now, { s: 30, fill: "#f4eef2", k: Q2.dosed[p.id] ? null : p.x }); text(p.name, p.x, p.y + 74, "#5a4a5a", 12, 900); if (Q2.dosed[p.id]) text("Zzz", p.x + 30, p.y - 60 - Math.sin(now / 500) * 4, "#4a7aa8", 13, 900); }
      // 風水病床
      for (const b of MAP.beds) { bed(b.x, b.y, angOf(b), bedOk(b) && K.active("ER00119-03") ? "#e4f6e8" : "#ffffff"); text(`羅盤牌 ${b.goal}°`, b.x, b.y + 78, "#8a6a3a", 11, 900); }
    }
    function draw(now) {
      if (K.is("ER00119-01", "erEcg")) api.marker(MAP.sneeze.monitor.x, MAP.sneeze.monitor.y - 50, now, "#f2c200");
      if (K.is("ER00119-02", "erDose")) for (const p of MAP.patients) if (!Q2.dosed[p.id]) api.marker(p.x, p.y - 80, now, "#f2c200");
      if (K.is("ER00119-03", "erBed")) for (const b of MAP.beds) if (!bedOk(b)) api.marker(b.x, b.y - 80, now, "#f2c200");
    }
    function stageText(id, st) {
      if (st?.type === "erEcg") return `${st.text}`;
      if (st?.type === "erDose") return `${st.text}（${Object.keys(Q2.dosed).length} / 3）`;
      if (st?.type === "erBed") return `${st.text}（${MAP.beds.filter(bedOk).length} / 4）`;
      return null;
    }
    function mini(dot, now) {
      const bl = `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`;
      if (K.is("ER00119-01", "erEcg")) dot(MAP.sneeze.x, MAP.sneeze.y, 4, bl);
      if (K.is("ER00119-02", "erDose")) for (const p of MAP.patients) if (!Q2.dosed[p.id]) dot(p.x, p.y, 4, bl);
      if (K.is("ER00119-03", "erBed")) for (const b of MAP.beds) if (!bedOk(b)) dot(b.x, b.y, 4, bl);
    }
    function drawEnemy(e, now, red) { return K.enemyArt(e, now, red, { stitched: ["stitched", 2], stitched3: ["stitched", 3] }); }
    return { click, act, draw, drawFloor, drawEnemy, stageText, mini, _dose: doseOf };
  };
})();
