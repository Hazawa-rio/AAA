/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/b-kit.js": "20261114045024" });
// B 級時空共用的小工具（雲端上的海洋、急診室、魔法森林、比爾哈頓廣場、童年時的黑市、彼岸花盛開的事務所）
// const K = R.BKit(api)：K.active(id)、K.stage(id)、K.q(id)（這一趟的委託資料）、K.reach(位置, 距離, fn)、K.adv(id, 提示)
//   K.enemyArt(e, now, red, 表)：地圖上的魔物用戰鬥造型畫（表：{ 變體: [造型, 幾隻] }）
//   K.bar(x, y, w, k, 顏色)：小進度條；K.say(事件)：角色台詞（地圖的 barks）
(function () {
  const R = (window.RPG = window.RPG || {});
  R.BKit = function (api) {
    const { trip, me, CM, save, toast, dist } = api;
    const ctx = api.ctx();
    trip.qdata = trip.qdata || {};
    // B 級時空的 NPC：頭像用名字（「職稱・名字」的名字），不要大家都是「新」「精」
    for (const n of api.MAP.npcs || []) if (!n.face && n.name.includes("・")) { const nm = n.name.split("・").pop(); n.face = /^[老小阿]/.test(nm) && nm.length > 1 ? nm[1] : nm[0]; }
    const K = {
      active: (id) => trip.accepted.includes(id) && !trip.done.includes(id),
      stage: (id) => (K.active(id) ? CM.stage(trip, id) : null),
      is: (id, type) => K.stage(id)?.type === type,
      q: (id) => (trip.qdata[id] = trip.qdata[id] || {}),
      near: (p, r) => dist(me.x, me.y, p.x, p.y) < r,
      reach(p, r, fn) { if (K.near(p, r)) fn(); else api.goTo({ x: p.x, y: p.y }, { type: "hook", reach: Math.max(30, r - 20), fn }); },
      adv(id, msg) { CM.advance(trip, id); save(); api.renderHud?.(); if (msg) toast(msg); },
      hit: (p, q, r) => dist(p.x, p.y, q.x, q.y) < r,
      enemyArt(e, now, red, table) {
        const A = R.EnemyArt, t = table[e.kind];
        if (!A || !t || !A[t[0]]) return false;
        const n = t[1] || 1;
        for (let i = 0; i < n; i++) A[t[0]](ctx, { r: 16, x: e.x + i * 9, facing: e.face || 0, alive: true, def: {} }, { x: e.x + (i - (n - 1) / 2) * 30, y: e.y + (i % 2) * 8 }, now);
        if (red) { ctx.strokeStyle = "#e53935"; ctx.lineWidth = 3; ctx.strokeRect(e.x - 22 * n - 10, e.y - 34, 44 * n + 20, 66); }
        return true;
      },
      bar(x, y, w, k, col = "#3d9a5b") {
        ctx.fillStyle = "rgba(29,29,31,.25)"; ctx.fillRect(x - w / 2, y, w, 6);
        ctx.fillStyle = col; ctx.fillRect(x - w / 2, y, w * Math.max(0, Math.min(1, k)), 6);
      },
      say: (key) => api.bark?.(key),
      // 地圖上的人類：和玩家一樣的方塊，中間一個字（o.s＝大小、o.alpha＝透明度、o.k＝晃動的相位）
      human(x, y, col, ch, now = 0, o = {}) {
        const s = o.s || 26, b = o.k != null ? Math.sin(now / 320 + o.k) * 1.5 : 0;
        ctx.globalAlpha = o.alpha ?? 1;
        ctx.fillStyle = "rgba(0,0,0,.15)"; ctx.beginPath(); ctx.ellipse(x, y + s / 2 + 3, s * 0.42, s * 0.16, 0, 0, Math.PI * 2); ctx.fill();
        api.rr(x - s / 2, y - s / 2 + b, s, s, Math.max(4, s * 0.22)); ctx.fillStyle = o.fill || "#fffaf0"; ctx.fill(); ctx.lineWidth = s > 24 ? 2.5 : 2; ctx.strokeStyle = col; ctx.stroke();
        if (ch) api.text(ch, x, y + 1 + b, col, Math.round(s * 0.46), 900);
        ctx.globalAlpha = 1;
      },
    };
    return K;
  };
})();
