/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/ft00021.js": "20261122223322" });
// #FT00021 命運的考驗（S 級・戰役）：命運的見證者・厄羅德
//   一到大教堂就直接開戰（委託的第一步是 boss，房間 erod：js/erod.js）
//   打贏之後（trip.qdata.erod.pending）跳出四張特殊命運卡選一張（js/tarot.js）；先等命路的「抉擇命運」選完，不會疊在一起
//   選完再找厄羅德回報就完成戰役
(function () {
  const R = (window.RPG = window.RPG || {});
  R.WorldHooks = R.WorldHooks || {};
  const QID = "FT00021-01";

  R.WorldHooks.FT00021 = function (api) {
    const { MAP, trip, toast, text, save } = api, ctx = api.ctx();
    const CM = R.Commissions;
    trip.qdata = trip.qdata || {};
    const Q = (trip.qdata.erod = trip.qdata.erod || {});
    const stage = () => CM.stage(trip, QID);
    let launched = false, opening = false;
    const t0 = performance.now();

    function pickCard() {
      if (opening || !Q.pending || !R.Tarot) return;
      if (document.querySelector(".fate-ov, .ta-ov") || performance.now() - t0 < 1200) return;      // 命路的抉擇視窗先跑完
      opening = true;
      const go = () => R.Tarot.open(trip.char, (id, drop) => {
        Q.pending = false; Q.card = id; save();
        const C = R.Tarot.CARDS[id];
        toast(`選了「${C.n}」：${C.up}；${C.down}${drop ? `（丟掉了【${R.Items?.get(drop)?.name || drop}】）` : ""}`);
        opening = false;
      });
      if (!R.FateUI?.check(trip.char, go)) { if (!document.querySelector(".ta-ov")) go(); }
    }
    function update() {
      const st = stage();
      if (!launched && st?.type === "boss" && !api.isBusy()) { launched = true; setTimeout(() => api.questBattle({ id: QID, st }), 350); }
      pickCard();
    }
    // 還沒選卡：不能回報
    function talk(n) {
      if (n.id === "erod" && Q.pending) { toast("先選一張特殊命運卡"); pickCard(); return true; }
      return false;
    }
    function drawFloor(now) {
      ctx.fillStyle = "#1c1a22"; ctx.fillRect(0, 0, MAP.w, MAP.h);
      for (let x = 0; x < MAP.w; x += 80) for (let y = 0; y < MAP.h; y += 80) { ctx.fillStyle = (x / 80 + y / 80) % 2 ? "#26232e" : "#211e28"; ctx.fillRect(x + 1, y + 1, 78, 78); }
      ctx.fillStyle = "#4a0e14"; ctx.fillRect(MAP.w / 2 - 100, 320, 200, MAP.h - 320);
      ctx.strokeStyle = "#c8a040"; ctx.lineWidth = 3; ctx.strokeRect(MAP.w / 2 - 100, 320, 200, MAP.h - 320);
      ctx.fillStyle = "#0e0c14"; ctx.fillRect(0, 0, MAP.w, 100);
      // 玫瑰窗：四個顏色
      const cols = ["#ff3a2a", "#2a8aff", "#7ae8b0", "#ffc820"], cx = MAP.w / 2, cy = 110;
      for (let i = 0; i < 8; i++) { ctx.fillStyle = cols[i % 4]; ctx.globalAlpha = 0.45 + 0.1 * Math.sin(now / 600 + i); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 80, (i / 8) * Math.PI * 2, ((i + 1) / 8) * Math.PI * 2); ctx.closePath(); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.strokeStyle = "#8a8070"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, 80, 0, Math.PI * 2); ctx.stroke();
      // 祭壇
      const A = MAP.altar;
      ctx.fillStyle = "#3a3640"; ctx.fillRect(A.x, A.y, A.w, A.h); ctx.strokeStyle = "#c8a040"; ctx.lineWidth = 3; ctx.strokeRect(A.x, A.y, A.w, A.h);
      ["wand", "cup", "sword", "coin"].forEach((id, i) => { const x = A.x + 60 + i * 93, y = A.y + 60; ctx.fillStyle = R.Tarot?.CARDS[id].c || "#fff"; ctx.globalAlpha = Q.card && Q.card !== id ? 0.25 : 0.9; ctx.fillRect(x - 22, y - 34, 44, 68); ctx.globalAlpha = 1; ctx.strokeStyle = "#e8e0cc"; ctx.lineWidth = 2; ctx.strokeRect(x - 22, y - 34, 44, 68); });
      text(Q.card ? `祭壇（你選了「${R.Tarot?.CARDS[Q.card]?.n}」）` : "祭壇：四張特殊命運卡", A.x + A.w / 2, A.y - 14, "#ffe080", 13, 900);
      // 鐵柱、骨頭
      for (const p of MAP.pillars) { ctx.fillStyle = "#3a3a44"; ctx.fillRect(p.x, p.y, p.w, p.h); ctx.strokeStyle = "#6a6a78"; ctx.lineWidth = 2; ctx.strokeRect(p.x, p.y, p.w, p.h); ctx.fillStyle = "#e8e0cc"; ctx.beginPath(); ctx.ellipse(p.x + p.w / 2, p.y + p.h + 14, 22, 7, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    return { update, talk, drawFloor, dbg: { Q } };
  };
})();
