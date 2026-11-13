/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/md01921-house.js": "20261113212359" });
// #MD01921 蒙德里安的理想國・MD01921-02「豪宅還是山洞」
//   3×4 的黃色方形說自己住在豪宅，隔壁的 1×3 白色方形說那是山洞，還在門口掛了「小心落石」
//   走進黃色方形的家（場景 MD01921/house）：屋裡五樣說不清楚的東西，你看成什麼就是什麼（理想國的規則）
//     天花板的黃色尖塊：水晶吊燈／鐘乳石（看成鐘乳石，或還沒決定之前，會一直有落石掉下來）
//     牆上的線條：大理石的紋路／岩層・會傳回來的聲音：挑高大廳的迴音／洞穴的回音
//     角落的黃色小方塊：金磚／碎石・地上的藍色：室內泳池／地下水
//   五樣都看清楚之後，去找隔壁的 1×3 白色方形，把看到的告訴他：
//     豪宅的看法 4～5 樣＝豪宅（牌子拿下來）・2～3 樣＝山洞裡的豪宅（調解，報酬最好）・0～1 樣＝山洞
(function () {
  const R = (window.RPG = window.RPG || {});
  R.WorldHooks = R.WorldHooks || {};
  const base = R.WorldHooks.MD01921;
  const QID = "MD01921-02";

  R.WorldHooks.MD01921 = function (api) {
    const { MAP, trip, run, me, CM, toast, text, save, dist, esc } = api;
    const ctx = api.ctx();
    const active = () => trip.accepted.includes(QID) && !trip.done.includes(QID);
    const stage = () => (active() ? CM.stage(trip, QID) : null);
    trip.qdata = trip.qdata || {};
    const Q = (trip.qdata[QID] = trip.qdata[QID] || {});
    Q.picks = Q.picks || {};
    const mansionCount = () => Object.values(Q.picks).filter((v) => v === "m").length;
    const resultOf = (m) => (m >= 4 ? "mansion" : m >= 2 ? "both" : "cave");
    const NARR = { name: "你看到的東西", color: "#c8a800", face: "?", faceBg: "#f0d800" };

    return MAP.house ? house() : canvas();

    // ================= 畫布上：黃色方形的門、門口的牌子 =================
    function canvas() {
      const B = base(api), DOOR = MAP.houseDoor;
      const canEnter = () => trip.accepted.includes(QID) && (trip.done.includes(QID) || CM.progressOf(trip, QID) >= 1);
      function click(p) {
        if (p.x > DOOR.x - 50 && p.x < DOOR.x + DOOR.w / 2 + 30 && p.y > DOOR.y - 60 && p.y < DOOR.y + DOOR.h + 20) {
          const go = () => {
            if (!canEnter()) { toast(active() ? "先聽聽 3×4 的黃色方形怎麼說" : "3×4 的黃色方形的家。門口掛著一塊「小心落石」"); return; }
            api.changeScene("house", MAP_HOUSE().arrive, "打擾了——");
          };
          if (dist(me.x, me.y, DOOR.x, DOOR.y + 80) < 110) go(); else api.goTo({ x: DOOR.x, y: DOOR.y + 80 }, { type: "hook", reach: 90, fn: go });
          return true;
        }
        return B.click?.(p) || false;
      }
      function draw(now) {
        B.draw?.(now);
        // 門（黑色的方形）＋門口的牌子
        const d = DOOR;
        ctx.fillStyle = "#1d1d1f"; ctx.fillRect(d.x - d.w / 2 - 6, d.y - 6, d.w + 12, d.h + 6);        // 門框（黑線）
        ctx.fillStyle = "#e8262c"; ctx.fillRect(d.x - d.w / 2, d.y, d.w, d.h);                         // 紅色的門
        ctx.fillStyle = "#1d1d1f"; ctx.fillRect(d.x - 2, d.y, 4, d.h);
        ctx.fillStyle = "#f0d800"; ctx.beginPath(); ctx.arc(d.x + 10, d.y + d.h / 2, 4, 0, Math.PI * 2); ctx.arc(d.x - 10, d.y + d.h / 2, 4, 0, Math.PI * 2); ctx.fill();
        const r = trip.done.includes(QID) ? Q.result : null;
        if (r !== "mansion") {
          const sx = d.x + d.w / 2 + 50, sy = d.y + 10;
          ctx.fillStyle = "#fbfaf4"; ctx.fillRect(sx - 54, sy - 18, 108, 34); ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 3; ctx.strokeRect(sx - 54, sy - 18, 108, 34);
          ctx.fillStyle = "#1d1d1f"; ctx.fillRect(sx - 2, sy + 16, 4, 26);
          text(r === "both" ? "小心落石・歡迎光臨" : "小心落石", sx, sy, "#e8262c", r === "both" ? 11 : 14, 900);
        }
        if (stage()?.type === "mdHouse") api.marker(d.x, d.y + 30, now, "#f2c200");
      }
      function stageText(id, st) {
        if (id === QID && st?.type === "mdHouse") return `${st.text}（${Object.keys(Q.picks).length} / ${MAP_HOUSE().things.length}）`;
        return B.stageText?.(id, st);
      }
      function mini(dot, now) {
        B.mini?.(dot, now);
        if (stage()?.type === "mdHouse") dot(DOOR.x, DOOR.y, 4, `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`);
      }
      return { ...B, click, draw, stageText, mini };
    }

    // ================= 屋裡 =================
    function house() {
      const T = MAP.things, DR = MAP.door;
      const ceilingSafe = () => Q.picks.ceiling === "m";            // 看成水晶吊燈＝不會掉下來
      const rocks = [];                                               // { x, y, t0 }：0.9 秒影子變大，然後掉下來
      let nextRock = 3, iframe = 0;
      function look(t) {
        if (Q.picks[t.id]) {
          const m = Q.picks[t.id] === "m";
          return api.dlg(t.title, NARR, m ? t.mText : t.cText, "", `你把它看成了「${m ? t.m : t.c}」`);
        }
        if (stage()?.type !== "mdHouse") return api.dlg(t.title, NARR, t.see, "", "");
        api.dlg(t.title, NARR, t.see,
          `<button type="button" class="primary" data-act="mdSee" data-id="${t.id}" data-v="m">是${esc(t.m)}</button><button type="button" class="primary" data-act="mdSee" data-id="${t.id}" data-v="c">是${esc(t.c)}</button>`,
          "在理想國，你看成什麼，它就是什麼");
      }
      function see(id, v) {
        const t = T.find((x) => x.id === id);
        if (!t || Q.picks[id] || stage()?.type !== "mdHouse") return;
        Q.picks[id] = v; save();
        const m = v === "m";
        const left = T.filter((x) => !Q.picks[x.id]).length;
        api.dlg(t.title, NARR, m ? t.mText : t.cText, `<button type="button" class="ghost" data-close>${left ? "再看看別的" : "看完了"}</button>`, left ? `還有 ${left} 樣東西沒看清楚` : "");
        if (!left) {
          Q.result = resultOf(mansionCount());
          CM.advance(trip, QID); save();
          setTimeout(() => toast(`五樣都看清楚了（豪宅 ${mansionCount()}・山洞 ${T.length - mansionCount()}）。去找隔壁的 1×3 白色方形，告訴他你看到的東西`), 300);
        }
      }
      function click(p) {
        const t = T.find((x) => dist(p.x, p.y, x.x, x.y) < x.r);
        if (t) {
          const go = () => look(t);
          if (dist(me.x, me.y, t.x, t.y) < t.r + 70) go(); else api.goTo({ x: t.x, y: Math.min(t.y + t.r + 30, 840) }, { type: "hook", reach: 60, fn: go });
          return true;
        }
        if (dist(p.x, p.y, DR.x, DR.y) < 70) {
          const out = () => api.changeScene(null, MAP.outside, "回到畫布上");
          if (dist(me.x, me.y, DR.x, DR.y) < 110) out(); else api.goTo({ x: DR.x, y: DR.y - 40 }, { type: "hook", reach: 60, fn: out });
          return true;
        }
        return false;
      }
      function act(a, b) {
        if (a === "mdSee") { see(b.dataset.id, b.dataset.v); return true; }
        return false;
      }
      // 小心落石：天花板的黃色尖塊還沒看成吊燈之前，偶爾會有一塊掉在你附近（影子變大的地方會被砸到）
      function update(dt) {
        if (ceilingSafe() || api.isBusy()) return;
        nextRock -= dt;
        if (nextRock <= 0) {
          nextRock = 3.2 + Math.random() * 2;
          rocks.push({ x: me.x + (Math.random() - 0.5) * 160, y: me.y + (Math.random() - 0.5) * 120, t0: performance.now() });
        }
        for (let i = rocks.length - 1; i >= 0; i--) {
          const k = (performance.now() - rocks[i].t0) / 1000;
          if (k > 0.9 && !rocks[i].hit) {
            rocks[i].hit = true;
            if (dist(me.x, me.y, rocks[i].x, rocks[i].y) < 42 && Date.now() > iframe) {
              iframe = Date.now() + 800;
              const n = Math.min(Math.round(api.maxHp() * 0.08), Math.max(0, run.hp - 1));
              if (n > 0) { run.hp -= n; save(); api.renderHud(); api.fx.push({ k: "num", x: me.x, y: me.y - 40, text: `-${n}`, color: "#e53935", t: performance.now(), dur: 900 }); toast("落石！"); }
            }
          }
          if (k > 1.6) rocks.splice(i, 1);
        }
      }
      function drawFloor(now, x0, y0) {
        // 黃色的屋子：黑線把地板分成格子
        ctx.fillStyle = "#1d1d1f"; ctx.fillRect(x0, y0, 1280, 720);
        const W = MAP.walk[0];
        ctx.fillStyle = "#f0d800"; ctx.fillRect(W.x, W.y, W.w, W.h);
        ctx.fillStyle = "#1d1d1f";
        for (const x of [520, 880]) ctx.fillRect(x, W.y, 10, W.h);
        ctx.fillRect(W.x, 560, W.w, 10);
        // 牆（大理石／岩層）
        const wall = Q.picks.wall;
        for (let i = 0; i < 9; i++) {
          ctx.fillStyle = wall === "m" ? (i % 2 ? "#f4efe2" : "#e8dfc8") : wall === "c" ? (i % 2 ? "#a08a6a" : "#8a7458") : (i % 2 ? "#d8c070" : "#c8b060");
          ctx.fillRect(110, 360 + i * 24, 120, 22);
        }
        if (wall === "m") { ctx.strokeStyle = "rgba(160,140,100,.5)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(120, 380); ctx.bezierCurveTo(160, 420, 140, 470, 220, 520); ctx.stroke(); }
        // 地上的藍色（泳池／地下水）
        const pool = Q.picks.pool, P = T.find((x) => x.id === "pool");
        ctx.fillStyle = pool === "c" ? "#1a2a6a" : "#1a3ae8"; ctx.fillRect(P.x - 90, P.y - 55, 180, 110);
        if (pool === "m") { ctx.strokeStyle = "#fbfaf4"; ctx.lineWidth = 2; for (let i = -90; i <= 90; i += 30) { ctx.beginPath(); ctx.moveTo(P.x + i, P.y - 55); ctx.lineTo(P.x + i, P.y - 47); ctx.stroke(); } ctx.strokeRect(P.x - 90, P.y - 55, 180, 110); }
        ctx.strokeStyle = `rgba(255,255,255,${0.25 + 0.15 * Math.sin(now / 400)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(P.x - 50, P.y); ctx.lineTo(P.x + 30, P.y); ctx.stroke();
        // 角落的小方塊（金磚／碎石）
        const pile = Q.picks.pile, K = T.find((x) => x.id === "pile");
        for (let i = 0; i < 9; i++) {
          const bx = K.x - 50 + (i % 4) * 26 + (Math.floor(i / 4) % 2) * 13, by = K.y + 10 - Math.floor(i / 4) * 18;
          ctx.fillStyle = pile === "m" ? "#e8b800" : pile === "c" ? "#9a9488" : "#f6e47a"; ctx.fillRect(bx, by, 24, 16);
          ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, 24, 16);
          if (pile === "m" && (i + Math.floor(now / 500)) % 5 === 0) { ctx.fillStyle = "#fff"; ctx.fillRect(bx + 4, by + 3, 5, 3); }
        }
        // 出口
        ctx.fillStyle = "#1d1d1f"; ctx.fillRect(DR.x - 40, DR.y - 20, 80, 40);
        text("出口", DR.x, DR.y, "#f0d800", 12, 900);
      }
      function draw(now) {
        // 天花板的黃色尖塊（吊燈／鐘乳石）：從上往下看，畫成一圈尖角
        const C = T.find((x) => x.id === "ceiling"), cp = Q.picks.ceiling;
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2 + (cp === "m" ? now / 2500 : 0), rr = 46 + (i % 3) * 10, x = C.x + Math.cos(a) * rr, y = C.y + Math.sin(a) * rr * 0.6;
          ctx.fillStyle = cp === "m" ? "#fff6b0" : cp === "c" ? "#b8a878" : "#f6e47a"; ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x - 9, y - 14); ctx.lineTo(x + 9, y - 14); ctx.lineTo(x, y + 18); ctx.closePath(); ctx.fill(); ctx.stroke();
          if (cp === "m" && (i + Math.floor(now / 300)) % 4 === 0) { ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.beginPath(); ctx.arc(x, y - 4, 3, 0, Math.PI * 2); ctx.fill(); }
        }
        // 回音：說話的地方畫一圈一圈的聲波
        const E = T.find((x) => x.id === "echo"), ek = (now / 1600) % 1;
        ctx.strokeStyle = `rgba(29,29,31,${0.35 * (1 - ek)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(E.x, E.y, 20 + ek * 70, 0, Math.PI * 2); ctx.stroke();
        text(Q.picks.echo ? (Q.picks.echo === "m" ? "（大廳的迴音）" : "（洞穴的回音）") : "「喂……」", E.x, E.y, "#1d1d1f", 13, 900);
        // 每樣東西的名字（看清楚之前是問號）
        for (const t of T) {
          const v = Q.picks[t.id];
          text(v ? (v === "m" ? t.m : t.c) : `${t.title}？`, t.x, t.y + t.r - 6, v ? (v === "m" ? "#8a5a00" : "#5a4a3a") : "#1d1d1f", 12, 900);
          if (!v && stage()?.type === "mdHouse") api.marker(t.x, t.y - 10, now, "#f2c200");
        }
        // 落石：影子變大，然後一塊黃色方塊砸下來
        for (const r of rocks) {
          const k = (now - r.t0) / 1000;
          if (k < 0.9) { ctx.fillStyle = `rgba(0,0,0,${0.15 + k * 0.3})`; ctx.beginPath(); ctx.ellipse(r.x, r.y, 14 + k * 30, 8 + k * 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#c8a800"; ctx.fillRect(r.x - 10, r.y - 200 * (1 - k / 0.9) - 20, 20, 20); }
          else { const f = Math.max(0, 1 - (k - 0.9) / 0.7); ctx.globalAlpha = f; ctx.fillStyle = "#c8a800"; ctx.fillRect(r.x - 14, r.y - 14, 28, 28); ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 2; ctx.strokeRect(r.x - 14, r.y - 14, 28, 28); ctx.globalAlpha = 1; }
        }
        if (!ceilingSafe()) text("小心落石", 700, 170, "#e8262c", 14, 900);
      }
      function stageText(id, st) {
        if (id === QID && st?.type === "mdHouse") return `${st.text}（${Object.keys(Q.picks).length} / ${T.length}）`;
        return null;
      }
      function mini(dot, now) { for (const t of T) if (!Q.picks[t.id]) dot(t.x, t.y, 3, `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`); }
      return { update, click, act, draw, drawFloor, stageText, mini };
    }
  };
  const MAP_HOUSE = () => R.MAPS["MD01921/house"];
})();
