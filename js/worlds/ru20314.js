/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/ru20314.js": "20261113145157" });
// #RU20314 古代遺跡科考隊：森林、營地、石門的繪圖，C 級委託「森林外的魔物痕跡」
//   ruTraces  在森林外的草地調查魔物痕跡（每趟隨機 5 處，金屬碎片一定在；找到 need 處就完成）
(function () {
  const R = (window.RPG = window.RPG || {});
  R.WorldHooks = R.WorldHooks || {};

  R.WorldHooks.RU20314 = function (api) {
    const { MAP, trip, me, CM, toast, inRect, text, rr, save, openPanel, dist, esc } = api;
    const ctx = api.ctx();
    const active = (id) => trip.accepted.includes(id) && !trip.done.includes(id);
    const stageOf = (id) => (active(id) ? CM.stage(trip, id) : null);
    trip.qdata = trip.qdata || {};
    // trip.qdata.ruins 也被遺跡（js/worlds/ru20314-ruins.js、地圖的 prepare）共用：缺的欄位各自補上，不要整個覆蓋
    const D = (trip.qdata.ruins = trip.qdata.ruins || {});
    if (!Array.isArray(D.traces)) D.traces = ["metal", ...MAP.traces.filter((t) => t.id !== "metal").sort(() => Math.random() - 0.5).slice(0, 4).map((t) => t.id)];
    if (!Array.isArray(D.found)) D.found = [];
    const traces = () => MAP.traces.filter((t) => D.traces.includes(t.id));
    const tracing = () => stageOf("RU20314-01")?.type === "ruTraces";

    function examine(t) {
      if (D.found.includes(t.id)) return toast(`已經記錄過了：${t.title}`);
      D.found.push(t.id); save();
      const st = stageOf("RU20314-01"), n = D.found.length;
      openPanel(t.title, `<p class="wx-p">${esc(t.text)}</p><p class="tv-note">記錄下來了（${n} / ${st.need}）</p>`);
      if (n >= st.need) { const fin = CM.advance(trip, "RU20314-01"); save(); toast(fin ? "委託完成！" : `「${CM.get("RU20314-01").title}」：${CM.stage(trip, "RU20314-01").text}`); }
    }
    function click(p) {
      if (inRect({ x: MAP.gate.x - 10, y: MAP.gate.y - 10, w: MAP.gate.w + 20, h: MAP.gate.h + 40 }, p.x, p.y)) {
        toast("石門緊閉。門上的紋路一圈一圈地亮著，像是在呼吸。（遺跡內部還在準備中）");
        return true;
      }
      if (tracing()) {
        const t = traces().find((t) => !D.found.includes(t.id) && dist(p.x, p.y, t.x, t.y) < 40);
        if (t) {
          if (dist(me.x, me.y, t.x, t.y) < 90) examine(t);
          else api.goTo({ x: t.x, y: t.y + 36 }, { type: "hook", reach: 70, fn: () => examine(t) });
          return true;
        }
      }
      if (inRect(MAP.table, p.x, p.y)) { toast("桌上攤著賽勒斯畫的森林地圖。北邊的石門那一格，是一片空白"); return true; }
      return false;
    }
    function stageText(id, st) {
      if (st?.type === "ruTraces") return `${st.text}（${D.found.length} / ${st.need}）`;
      return null;
    }

    // ===== 繪圖 =====
    let gseed = 7; const grnd = () => ((gseed = (gseed * 9301 + 49297) % 233280) / 233280);
    const tufts = Array.from({ length: 900 }, () => ({ x: grnd() * MAP.w, y: grnd() * MAP.h, s: 4 + grnd() * 5 }));
    function drawFloor(now, x0, y0) {
      ctx.fillStyle = "#2e4a28"; ctx.fillRect(x0, y0, 1280, 720);
      // 森林地面
      ctx.fillStyle = "#3d5e30"; ctx.fillRect(0, 0, MAP.w, MAP.meadowY);
      // 森林外的草地
      ctx.fillStyle = "#7aa850"; ctx.fillRect(0, MAP.meadowY, MAP.w, MAP.h - MAP.meadowY);
      const edge = ctx.createLinearGradient(0, MAP.meadowY - 60, 0, MAP.meadowY + 40);
      edge.addColorStop(0, "rgba(61,94,48,1)"); edge.addColorStop(1, "rgba(122,168,80,0)");
      ctx.fillStyle = edge; ctx.fillRect(0, MAP.meadowY - 60, MAP.w, 100);
      ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.lineWidth = 1.5;
      for (const t of tufts) { if (t.x < x0 - 20 || t.x > x0 + 1300 || t.y < y0 - 20 || t.y > y0 + 740) continue; ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.x + 2, t.y - t.s); ctx.moveTo(t.x + 4, t.y); ctx.lineTo(t.x + 5, t.y - t.s * 0.8); ctx.stroke(); }
      // 小路、營地空地、石門前的石板
      ctx.fillStyle = "#8a7450";
      for (const p of [MAP.pathS, MAP.pathN]) { rr(p.x + 30, p.y, p.w - 60, p.h, 30); ctx.fill(); }
      ctx.fillStyle = "#9a8458"; ctx.beginPath(); ctx.ellipse(MAP.camp.x, MAP.camp.y, MAP.camp.rx, MAP.camp.ry, 0, 0, Math.PI * 2); ctx.fill();
      const gc = MAP.gateClear;
      ctx.fillStyle = "#8a8a80"; ctx.fillRect(gc.x, gc.y, gc.w, gc.h);
      ctx.strokeStyle = "rgba(0,0,0,.15)"; ctx.lineWidth = 2;
      for (let y = gc.y; y < gc.y + gc.h; y += 60) for (let x = gc.x + ((y / 60) % 2) * 40; x < gc.x + gc.w; x += 80) ctx.strokeRect(x, y, 80, 60);
      ctx.fillStyle = "rgba(61,94,48,.5)"; for (let i = 0; i < 30; i++) { const x = gc.x + ((i * 173) % gc.w), y = gc.y + ((i * 97) % gc.h); ctx.beginPath(); ctx.arc(x, y, 14 + (i % 3) * 6, 0, Math.PI * 2); ctx.fill(); }    // 青苔
      // 石門
      const g = MAP.gate;
      ctx.fillStyle = "#6a6a64"; ctx.fillRect(g.x - 40, g.y - 30, g.w + 80, g.h + 30);
      ctx.fillStyle = "#4a4a46"; ctx.fillRect(g.x, g.y, g.w, g.h);
      ctx.strokeStyle = "#2a2a28"; ctx.lineWidth = 4; ctx.strokeRect(g.x, g.y, g.w, g.h);
      const glow = 0.35 + 0.35 * Math.sin(now / 900);
      ctx.strokeStyle = `rgba(90,220,230,${glow})`; ctx.lineWidth = 3;
      for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.arc(g.x + g.w / 2, g.y + g.h / 2, k * 26, 0, Math.PI * 2); ctx.stroke(); }
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(g.x + g.w / 2 + Math.cos(a) * 80, g.y + g.h / 2 + Math.sin(a) * 80); ctx.lineTo(g.x + g.w / 2 + Math.cos(a) * 160, g.y + g.h / 2 + Math.sin(a) * 160 * 0.55); ctx.stroke(); }
      text("古代遺跡的石門", g.x + g.w / 2, g.y + g.h + 26, "#d8f0f0", 14, 900);
      for (const p of MAP.pillars) { ctx.fillStyle = "#7a7a72"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#4a4a46"; ctx.lineWidth = 4; ctx.stroke(); ctx.strokeStyle = `rgba(90,220,230,${glow * 0.7})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.5, 0, Math.PI * 2); ctx.stroke(); }
      // 營地
      for (const t of MAP.tents) {
        ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.fillRect(t.x + 8, t.y + 10, t.w, t.h);
        ctx.fillStyle = t.color; ctx.beginPath(); ctx.moveTo(t.x, t.y + t.h); ctx.lineTo(t.x + t.w / 2, t.y); ctx.lineTo(t.x + t.w, t.y + t.h); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.beginPath(); ctx.moveTo(t.x + t.w / 2 - 16, t.y + t.h); ctx.lineTo(t.x + t.w / 2, t.y + t.h * 0.45); ctx.lineTo(t.x + t.w / 2 + 16, t.y + t.h); ctx.fill();
      }
      for (const c of MAP.crates) { ctx.fillStyle = "#a8783a"; ctx.fillRect(c.x, c.y, c.w, c.h); ctx.strokeStyle = "#5a3a1a"; ctx.lineWidth = 3; ctx.strokeRect(c.x, c.y, c.w, c.h); ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + c.w, c.y + c.h); ctx.stroke(); }
      const tb = MAP.table;
      ctx.fillStyle = "#7a5a3a"; ctx.fillRect(tb.x, tb.y, tb.w, tb.h); ctx.fillStyle = "#e8dcc0"; ctx.fillRect(tb.x + 14, tb.y + 10, tb.w - 28, tb.h - 20);
      ctx.strokeStyle = "#4a7a3a"; ctx.lineWidth = 2; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(tb.x + 30 + i * 22, tb.y + 30 + (i % 2) * 10, 6, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = "#fff"; ctx.fillRect(tb.x + tb.w / 2 - 6, tb.y + 12, 12, 10);
      // 營火
      const f = MAP.fire;
      ctx.fillStyle = "#5a3a1a"; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * 26, f.y + Math.sin(a) * 18, 8, 0, Math.PI * 2); ctx.fill(); }
      for (let i = 0; i < 6; i++) { const k = ((now / 700 + i / 6) % 1); ctx.fillStyle = `rgba(255,${150 + 80 * (1 - k)},40,${0.85 * (1 - k)})`; ctx.beginPath(); ctx.arc(f.x + Math.sin(i * 2 + now / 200) * 6, f.y - 6 - k * 34, 12 * (1 - k * 0.6), 0, Math.PI * 2); ctx.fill(); }
      // 科考隊的旗子
      ctx.strokeStyle = "#3a2a1a"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(1990, 1460); ctx.lineTo(1990, 1350); ctx.stroke();
      ctx.fillStyle = "#e8c23a"; ctx.beginPath(); ctx.moveTo(1990, 1350); ctx.lineTo(1990 + 46 + Math.sin(now / 300) * 4, 1365); ctx.lineTo(1990, 1380); ctx.fill();
      text("科考隊營地", MAP.camp.x, MAP.camp.y + MAP.camp.ry - 30, "rgba(255,250,230,.75)", 15, 900);
      text("森林外", 260, MAP.meadowY + 50, "rgba(255,255,255,.6)", 15, 900);
      // 樹（樹幹＋樹冠）
      for (const t of MAP.forestTrees) {
        if (t.x < x0 - 100 || t.x > x0 + 1380 || t.y < y0 - 100 || t.y > y0 + 820) continue;
        ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.beginPath(); ctx.ellipse(t.x + 10, t.y + 14, t.canopy, t.canopy * 0.6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#5a3a22"; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#2f5a26"; ctx.beginPath(); ctx.arc(t.x, t.y - 22, t.canopy, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#3f7230"; ctx.beginPath(); ctx.arc(t.x - 12, t.y - 34, t.canopy * 0.6, 0, Math.PI * 2); ctx.fill();
      }
    }
    function draw(now) {
      if (!tracing()) return;
      for (const t of traces()) {
        if (D.found.includes(t.id)) continue;
        const k = 0.5 + 0.5 * Math.sin(now / 300 + t.x);
        ctx.strokeStyle = `rgba(255,236,150,${0.5 + 0.4 * k})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(t.x, t.y, 22 + k * 6, 0, Math.PI * 2); ctx.stroke();
        text("?", t.x, t.y + 1, "#fff2b0", 20, 900);
      }
    }
    function mini(dot, now) {
      if (tracing()) for (const t of traces()) if (!D.found.includes(t.id)) dot(t.x, t.y, 3.5, `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`);
    }
    function blocked(x, y, h) { for (const c of MAP.roundSolids) if (Math.abs(x - c.x) < c.r + h && Math.abs(y - c.y) < c.r + h && dist(x, y, c.x, c.y) < c.r + h * 0.8) return true; return false; }
    return { click, drawFloor, draw, mini, stageText, blocked };
  };
})();
