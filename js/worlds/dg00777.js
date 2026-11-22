/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/dg00777.js": "20261122223322" });
// #DG00777 致命賭局（A 級・戰役）：大莊家斯賓沃迪的賭場
//   一到這裡就直接坐上賭桌開戰（委託的第一步是 boss，房間 casino：js/casino.js）
//   打贏之後拿到「籌碼」（trip.qdata.casino.chips，只在這一趟有效），才能在賭場裡走動、到兌換櫃台消費：
//     牛排簡餐、冰咖啡（籌碼 20）、七件只有這裡換得到的寶物（照稀有度：普通 40／稀有 80／史詩 140／傳說 200）
//   最後找斯賓沃迪回報就完成戰役
(function () {
  const R = (window.RPG = window.RPG || {});
  R.WorldHooks = R.WorldHooks || {};
  const QID = "DG00777-01";
  const PRICE = { steakMeal: 20, icedCoffee: 20 };
  const STOCK = ["classicCards", "steelBall", "loadedDice", "betToken", "specialWheel", "diceCup", "dealerRevolver"];
  const TPRICE = { common: 40, rare: 80, epic: 140, legendary: 200 };

  R.WorldHooks.DG00777 = function (api) {
    const { MAP, trip, run, me, BAG, toast, text, save, dist } = api, ctx = api.ctx();
    const CM = R.Commissions, K = R.BKit(api);
    trip.qdata = trip.qdata || {};
    const Q = (trip.qdata.casino = trip.qdata.casino || { chips: 0 });
    const stage = () => CM.stage(trip, QID);
    let launched = false;
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

    // 櫃台的寶物：固定七件（只能用籌碼換）
    const stock = () => STOCK.filter((id) => R.Items?.LIST?.[id]);
    function openCounter() {
      if (!Q.won) return api.openPanel("籌碼兌換櫃台", `<p class="wx-p">荷官露露：「先去賭桌上贏一把，再來換東西。」</p><div class="tv-row" style="justify-content:flex-end"><button type="button" class="ghost" data-close>離開</button></div>`);
      const build = R.Progress?.load(trip.char) || { items: [] };
      const full = (build.items || []).length >= (R.Items?.SLOTS || 6);
      let rows = "";
      for (const [id, p] of Object.entries(PRICE)) {
        const it = BAG.get(id); if (!it) continue;
        rows += `<div class="shop-row">${BAG.icon(id)}<span><b>${esc(it.name)}</b><small>${esc(it.desc)}</small></span><em>${p} 籌碼</em><button type="button" class="primary" data-act="chipBuy" data-id="${id}" ${Q.chips < p ? "disabled" : ""}>換</button></div>`;
      }
      for (const id of stock()) {
        const t = R.Items.LIST[id], p = TPRICE[t.rarity], own = (build.items || []).includes(id);
        rows += `<div class="shop-row treasure">${R.Items.slotHtml(id)}<span><b>${esc(t.name)}</b><small>【${R.Items.RARITY[t.rarity].name}】${esc(t.desc)}</small></span><em>${p} 籌碼</em>
          ${own ? `<span class="lock">已擁有</span>` : `<button type="button" class="primary" data-act="chipBuyT" data-id="${id}" ${Q.chips < p || full ? "disabled" : ""}>換</button>`}</div>`;
      }
      api.openPanel("籌碼兌換櫃台", `<div class="tv-npc"><span class="face" style="border-color:#2a6a4a;color:#2a6a4a">荷</span><p>荷官露露：「籌碼換東西，不找零。櫃台上的寶物，外面買不到。」</p></div>
        <p class="tv-note">籌碼：<b>${Q.chips}</b>（只在這一趟有效，離開賭場就作廢）・行囊 ${run.items.length} / ${BAG.SIZE} 格${full ? "・寶物欄滿了" : ""}</p><div class="shop">${rows}</div>
        <div class="tv-row" style="justify-content:flex-end"><button type="button" class="ghost" data-close>離開</button></div>`);
    }
    function act(a, btn) {
      const id = btn.dataset.id;
      if (a === "chipBuy") {
        const p = PRICE[id]; if (Q.chips < p) return true;
        if (!BAG.add(run.items, id, 1)) { toast("行囊放不下了"); return true; }
        Q.chips -= p; save(); api.renderHud(); toast(`用 ${p} 枚籌碼換了${BAG.get(id).name}`); openCounter(); return true;
      }
      if (a === "chipBuyT") {
        const t = R.Items.LIST[id], p = TPRICE[t.rarity]; if (Q.chips < p) return true;
        const g = R.Items.give(trip.char, id);
        if (!g.ok) { toast(g.text || "換不了"); return true; }
        Q.chips -= p; save(); toast(`用 ${p} 枚籌碼換了寶物【${t.name}】`); openCounter(); return true;
      }
      return false;
    }
    function update() {
      // 一到賭場就直接坐上賭桌
      const st = stage();
      if (!launched && st?.type === "boss" && !api.isBusy()) { launched = true; setTimeout(() => api.questBattle({ id: QID, st }), 350); }
    }
    function click(p) {
      const C = MAP.counter;
      if (p.x > C.x - 20 && p.x < C.x + C.w + 20 && p.y > C.y - 20 && p.y < C.y + C.h + 20) { K.reach({ x: C.x + C.w / 2, y: C.y + C.h + 50 }, 70, openCounter); return true; }
      return false;
    }
    function drawFloor(now) {
      // 紅地毯＋金色花紋
      ctx.fillStyle = "#5a0e14"; ctx.fillRect(0, 0, MAP.w, MAP.h);
      ctx.strokeStyle = "rgba(232,192,80,.12)"; ctx.lineWidth = 2;
      for (let x = 0; x < MAP.w; x += 80) for (let y = 0; y < MAP.h; y += 80) { ctx.beginPath(); ctx.moveTo(x + 40, y + 10); ctx.lineTo(x + 70, y + 40); ctx.lineTo(x + 40, y + 70); ctx.lineTo(x + 10, y + 40); ctx.closePath(); ctx.stroke(); }
      ctx.fillStyle = "#2a0608"; ctx.fillRect(0, 0, MAP.w, 100);
      ctx.fillStyle = "#e8c050"; ctx.font = "900 34px 'Noto Sans TC', sans-serif"; ctx.textAlign = "center"; ctx.fillText("✦ 斯 賓 沃 迪 大 賭 場 ✦", MAP.w / 2, 64);
      // 大莊家的賭桌
      const T = MAP.table;
      ctx.fillStyle = "#3a1a0a"; ctx.beginPath(); ctx.ellipse(T.x + T.w / 2, T.y + T.h / 2, T.w / 2 + 24, T.h / 2 + 24, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1f7a4a"; ctx.beginPath(); ctx.ellipse(T.x + T.w / 2, T.y + T.h / 2, T.w / 2, T.h / 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#e8c050"; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = "rgba(232,192,80,.5)"; ctx.font = "900 22px 'Noto Sans TC', sans-serif"; ctx.fillText("致 命 賭 局", T.x + T.w / 2, T.y + T.h / 2 + 8);
      text(Q.won ? "大莊家的賭桌（已經贏過了）" : "大莊家的賭桌", T.x + T.w / 2, T.y - 34, "#ffe080", 13, 900);
      // 拉霸機
      for (const s of MAP.slots) {
        ctx.fillStyle = "#1a1a1e"; ctx.fillRect(s.x, s.y, s.w, s.h); ctx.strokeStyle = "#e8c050"; ctx.lineWidth = 3; ctx.strokeRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = "#e8f0f6"; ctx.fillRect(s.x + 10, s.y + 30, s.w - 20, 34);
        ctx.fillStyle = "#d8202a"; ctx.font = "900 22px Impact, sans-serif"; const k = Math.floor(now / 300 + s.x) % 3; ctx.fillText(["777", "7♦7", "☠7☠"][k], s.x + s.w / 2, s.y + 56);
        ctx.fillStyle = "#e82a2a"; ctx.beginPath(); ctx.arc(s.x + s.w + 8, s.y + 14, 7, 0, Math.PI * 2); ctx.fill();
      }
      text("拉霸機（只是擺設）", 470, 280, "#ffe080", 12, 900);
      // 輪盤桌
      for (const r of MAP.roulette) {
        ctx.fillStyle = "#3a1a0a"; ctx.beginPath(); ctx.arc(r.x, r.y, r.r + 14, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 12; i++) { const a0 = (i / 12) * Math.PI * 2 + now / 2000; ctx.fillStyle = i % 2 ? "#1d1d22" : "#b81e28"; ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.arc(r.x, r.y, r.r, a0, a0 + Math.PI / 6); ctx.closePath(); ctx.fill(); }
        ctx.fillStyle = "#e8c050"; ctx.beginPath(); ctx.arc(r.x, r.y, 20, 0, Math.PI * 2); ctx.fill();
      }
      // 兌換櫃台
      const C = MAP.counter;
      ctx.fillStyle = "#3a1a0a"; ctx.fillRect(C.x, C.y, C.w, C.h); ctx.fillStyle = "#e8c050"; ctx.fillRect(C.x, C.y, C.w, 16);
      for (let i = 0; i < 6; i++) { const cx = C.x + 40 + i * 56; ctx.fillStyle = ["#f4f0e6", "#d8323a", "#2a9a4a", "#1d1d22"][i % 4]; ctx.beginPath(); ctx.arc(cx, C.y + 60, 16, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#e8c050"; ctx.lineWidth = 2; ctx.stroke(); }
      text(`籌碼兌換櫃台${Q.won ? `（你有 ${Q.chips} 枚籌碼）` : ""}`, C.x + C.w / 2, C.y - 18, "#ffe080", 13, 900);
    }
    function mini(dot, now) {
      const C = MAP.counter; if (Q.won) dot(C.x + C.w / 2, C.y + C.h / 2, 5, `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`);
    }
    return { update, click, act, drawFloor, mini, dbg: { Q, stock } };
  };
})();
