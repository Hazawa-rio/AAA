/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/rt00317.js": "20261114042342" });
// #RT00317 午夜郵局：繪圖、情緒煙霧的樣子、委託的玩法
//   rtChase  追上「昨天」正在搬家的梅森先生：他抱著箱子照著昨天的路線走，追上一次他就搬到下一個地方；
//            昨天剩下的時間用完，時間投遞口會把昨天倒回去（從頭開始）
//   rtCat    跟著黑貓午夜的腳印：靠近牠就跑到下一個地方，最後回到藏寶處
(function () {
  const R = (window.RPG = window.RPG || {});
  R.WorldHooks = R.WorldHooks || {};

  const CHASE_TIME = 150;       // 昨天剩下的時間（秒）
  const MOVE_LINES = ["箱子好重……下一箱放哪裡？", "咦，你是誰？我現在沒空，我在搬家。", "這個時鐘一直往回走，好怪。", "最後一箱了，放大廳……"];

  R.WorldHooks.RT00317 = function (api) {
    const { MAP, trip, run, me, CM, BAG, toast, inRect, text, rr, save, openPanel, dist } = api;
    const ctx = api.ctx();
    const ART = R.EnemyArt || {};
    const active = (id) => trip.accepted.includes(id) && !trip.done.includes(id);
    const stageOf = (id) => (active(id) ? CM.stage(trip, id) : null);
    trip.qdata = trip.qdata || {};
    const D = (trip.qdata.post = trip.qdata.post || { chase: { i: 0, left: CHASE_TIME }, cat: { i: 0 }, paws: [] });
    const advance = (id) => { const fin = CM.advance(trip, id); save(); const c = CM.get(id); toast(fin ? `委託「${c.title}」完成！` : `「${c.title}」：${stText(id, CM.stage(trip, id))}`); };

    // ===== 梅森先生（昨天的他） =====
    const MP = MAP.movePath;
    const mason = { x: MP[D.chase.i].x, y: MP[D.chase.i].y, moving: false };
    if (stageOf("RT00317-01")?.type === "rtChase" && !BAG.count(run.items, "apologyLetter")) { BAG.add(run.items, "apologyLetter", 1); save(); setTimeout(() => toast("艾德加把道歉信交給了你。信很重"), 500); }
    function updateChase(dt) {
      const st = stageOf("RT00317-01");
      if (st?.type !== "rtChase") return;
      D.chase.left -= dt;
      if (D.chase.left <= 0) {
        D.chase = { i: 0, left: CHASE_TIME }; save();
        Object.assign(mason, MP[0], { moving: false });
        openPanel("昨天結束了", `<p class="wx-p">牆上的時鐘敲了十二下。昨天結束了。</p><p class="wx-p">時間投遞口「喀啦喀啦」地轉了一圈——艾德加把昨天倒回了早上。梅森先生又抱著第一箱東西，出現在分信室。</p>`);
        return;
      }
      if (mason.moving) {
        const tg = mason.route[0], d = dist(mason.x, mason.y, tg.x, tg.y), s = 260 * dt;
        if (d <= s) { mason.x = tg.x; mason.y = tg.y; mason.route.shift(); if (!mason.route.length) mason.moving = false; }
        else { mason.x += ((tg.x - mason.x) / d) * s; mason.y += ((tg.y - mason.y) / d) * s; }
        return;
      }
      if (dist(me.x, me.y, mason.x, mason.y) < 90) {
        if (D.chase.i >= MP.length - 1) {
          BAG.remove(run.items, "apologyLetter", 1);
          advance("RT00317-01");             // 下一步：大廳的 Boss（走到那裡就會打開）
          return;
        }
        toast(`梅森先生：「${MOVE_LINES[Math.min(D.chase.i, MOVE_LINES.length - 1)]}」——他抱著箱子往下一個地方走了`);
        D.chase.i++; mason.moving = true; mason.route = [...(MP[D.chase.i].via || []), MP[D.chase.i]]; save();
      }
    }

    // ===== 黑貓午夜 =====
    const CP = MAP.catPath;
    const cat = { x: CP[D.cat.i].x, y: CP[D.cat.i].y, moving: false, face: 0 };
    let pawT = 0;
    function updateCat(dt, now) {
      const st = stageOf("RT00317-02");
      if (st?.type !== "rtCat") return;
      if (cat.moving) {
        const tg = cat.route[0], d = dist(cat.x, cat.y, tg.x, tg.y), s = 480 * dt;
        cat.face = Math.atan2(tg.y - cat.y, tg.x - cat.x);
        pawT += s;
        if (pawT > 34) { pawT = 0; D.paws.push({ x: Math.round(cat.x), y: Math.round(cat.y), a: cat.face, t: Date.now() }); if (D.paws.length > 160) D.paws.shift(); }
        if (d <= s && cat.route.length > 1) { cat.x = tg.x; cat.y = tg.y; cat.route.shift(); }
        else if (d <= s) {
          cat.x = tg.x; cat.y = tg.y; cat.moving = false; save();
          if (D.cat.i >= CP.length - 1) { toast("黑貓午夜跳上了信格，鑽進最上面一排的後面——那裡就是牠的藏寶處！"); advance("RT00317-02"); }
        } else { cat.x += ((tg.x - cat.x) / d) * s; cat.y += ((tg.y - cat.y) / d) * s; }
        return;
      }
      if (D.cat.i < CP.length - 1 && dist(me.x, me.y, cat.x, cat.y) < 120) {
        D.cat.i++; cat.moving = true; cat.route = [...(CP[D.cat.i].via || []), CP[D.cat.i]]; save();
        toast("喵——！黑貓午夜一溜煙跑掉了。跟著腳印走吧");
      }
    }

    // ===== 堆積如山的帳單 =====
    const BILLS = ["電費・2087 年 3 月：一顆小行星", "房租・月球背面 B 棟：逾期 40 年", "小行星停車費：第 7 次催繳", "時光機保養費：請於昨天前繳納", "未來的健身房會費：你一次都沒去", "機器人管家的加班費：214 小時", "雲端記憶儲存費：容量已滿", "第三次世界博覽會門票：已過期"];
    if (!D.bills) {
      const pool = MAP.billSpots.slice().sort(() => Math.random() - 0.5);
      const texts = BILLS.slice().sort(() => Math.random() - 0.5);
      D.bills = pool.slice(0, 6).map((p, i) => ({ x: p.x, y: p.y, got: false, text: texts[i % texts.length] }));
    }
    const billsGot = () => D.bills.filter((b) => b.got).length;
    function takeBill(i) {
      const b = D.bills[i], st = stageOf("RT00317-03");
      if (b.got || st?.type !== "rtBills") return;
      b.got = true; save();
      const n = billsGot();
      toast(`收回一疊帳單：「${b.text}」（${n} / ${st.need}）`);
      if (n >= st.need) { setTimeout(() => advance("RT00317-03"), 700); return; }
      // 帳單上的焦慮有時會跑出來
      if (Math.random() < 0.3) setTimeout(() => { if (!api.isBusy()) { toast("帳單上的「逾期未繳」浮了起來——焦慮跑出來了！"); api.ambushBattle("anxiety"); } }, 900);
    }

    function stText(id, st) {
      if (!st) return "";
      if (st.type === "rtBills") return `${st.text}（${billsGot()} / ${st.need}）`;
      if (st.type === "rtChase") return `${st.text}（昨天還剩 ${Math.max(0, Math.ceil(D.chase.left))} 秒）`;
      return st.text;
    }

    function update(dt, now) {
      if (api.isBusy()) return;
      updateChase(dt);
      updateCat(dt, now);
    }
    function click(p) {
      if (inRect({ x: MAP.slot.x - 10, y: MAP.slot.y - 20, w: MAP.slot.w + 20, h: MAP.slot.h + 40 }, p.x, p.y)) { toast("時間投遞口。投進去的信，會掉進信封上寫的那個時間"); return true; }
      if (stageOf("RT00317-03")?.type === "rtBills") {
        const i = D.bills.findIndex((b) => !b.got && dist(p.x, p.y, b.x, b.y) < 34);
        if (i >= 0) { const b = D.bills[i]; if (dist(me.x, me.y, b.x, b.y) < 80) takeBill(i); else api.goTo({ x: b.x, y: b.y + 30 }, { type: "hook", reach: 60, fn: () => takeBill(i) }); return true; }
      }
      if (active("RT00317-02") && dist(p.x, p.y, cat.x, cat.y) < 30) { toast(stageOf("RT00317-02")?.type === "rtCat" ? "黑貓午夜盯著你，尾巴一甩一甩" : "黑貓午夜窩在包裹山上睡覺"); return true; }
      if (active("RT00317-01") && stageOf("RT00317-01")?.type === "rtChase" && dist(p.x, p.y, mason.x, mason.y) < 34) { api.goTo({ x: mason.x, y: mason.y + 40 }, null); return true; }
      return false;
    }

    // ===== 繪圖 =====
    const RM = MAP.rooms;
    function letter(x, y, a, s, alpha = 1) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = alpha;
      ctx.fillStyle = "#f0e8d2"; ctx.fillRect(-s, -s * 0.66, s * 2, s * 1.32);
      ctx.strokeStyle = "#a08a6a"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-s, -s * 0.66); ctx.lineTo(0, s * 0.1); ctx.lineTo(s, -s * 0.66); ctx.stroke();
      ctx.fillStyle = "#c0392b"; ctx.beginPath(); ctx.arc(0, s * 0.12, s * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    function clock(x, y, r, now, back) {
      ctx.fillStyle = "#f4ecd8"; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#5a4a2a"; ctx.lineWidth = 3; ctx.stroke();
      const a = (back ? -1 : 1) * now / 900;
      ctx.strokeStyle = "#2a2a3a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75); ctx.stroke();
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a / 12) * r * 0.5, y + Math.sin(a / 12) * r * 0.5); ctx.stroke();
    }
    function drawFloor(now, x0, y0) {
      ctx.fillStyle = "#121628"; ctx.fillRect(x0, y0, 1280, 720);
      for (const r of Object.values(RM)) { ctx.strokeStyle = "#0a0c18"; ctx.lineWidth = 14; ctx.strokeRect(r.x - 7, r.y - 7, r.w + 14, r.h + 14); }
      for (const [k, r] of Object.entries(RM)) {
        const tile = k === "lobby" ? ["#2b3658", "#26304f"] : k === "corridor" || k.startsWith("link") ? ["#3a2e48", "#342a42"] : ["#28304a", "#232a42"];
        for (let y = r.y; y < r.y + r.h; y += 50) for (let x = r.x; x < r.x + r.w; x += 50) { ctx.fillStyle = ((x - r.x) / 50 + (y - r.y) / 50) % 2 ? tile[0] : tile[1]; ctx.fillRect(x, y, Math.min(50, r.x + r.w - x), Math.min(50, r.y + r.h - y)); }
      }
      // 時鐘走廊：牆上一排倒著走的鐘
      const c = RM.corridor;
      for (let y = c.y + 80; y < c.y + c.h - 40; y += 150) { clock(c.x + 26, y, 20, now, true); clock(c.x + c.w - 26, y + 70, 20, now, true); }
      ctx.fillStyle = "#5a2a3a"; ctx.fillRect(c.x + 70, c.y, c.w - 140, c.h);
      // 分信室：信格、分信桌、輸送帶
      for (const pg of MAP.pigeon) {
        ctx.fillStyle = "#5a4030"; ctx.fillRect(pg.x, pg.y, pg.w, pg.h);
        ctx.strokeStyle = "#3a2a1a"; ctx.lineWidth = 2;
        const horiz = pg.w > pg.h, n = Math.floor((horiz ? pg.w : pg.h) / 40);
        for (let i = 0; i < n; i++) {
          const x = horiz ? pg.x + i * 40 : pg.x, y = horiz ? pg.y : pg.y + i * 40;
          ctx.strokeRect(x + 2, y + 2, horiz ? 36 : pg.w - 4, horiz ? pg.h - 4 : 36);
          if ((i * 7) % 3) { ctx.fillStyle = "#e8dcc0"; ctx.fillRect(x + 8, y + 10, horiz ? 22 : pg.w - 16, horiz ? 12 : 10); }
        }
      }
      for (const t of MAP.sort) {
        ctx.fillStyle = "#6a4a32"; ctx.fillRect(t.x, t.y, t.w, t.h); ctx.strokeStyle = "#3a2a1a"; ctx.lineWidth = 4; ctx.strokeRect(t.x, t.y, t.w, t.h);
        for (let i = 0; i < 6; i++) letter(t.x + 30 + (i % 3) * 70, t.y + 32 + Math.floor(i / 3) * 46, (i - 2.5) * 0.2, 14);
      }
      const belt = { x: 220, y: 880, w: 940, h: 34 };
      ctx.fillStyle = "#3a3a44"; ctx.fillRect(belt.x, belt.y, belt.w, belt.h);
      ctx.strokeStyle = "#5a5a64"; ctx.lineWidth = 2; for (let x = belt.x + ((now / 20) % 30); x < belt.x + belt.w; x += 30) { ctx.beginPath(); ctx.moveTo(x, belt.y); ctx.lineTo(x, belt.y + belt.h); ctx.stroke(); }
      for (let i = 0; i < 6; i++) letter(belt.x + ((now / 20 + i * 160) % belt.w), belt.y + 17, 0, 12);
      // 退件室：包裹山
      for (const pk of MAP.parcels) {
        for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
          const w = pk.w / 4, h = pk.h / 4, x = pk.x + i * w + ((j % 2) * 8), y = pk.y + j * h;
          if (x + w - 4 > pk.x + pk.w) continue;
          ctx.fillStyle = (i + j) % 3 ? "#b88a5a" : "#a8784a"; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
          ctx.strokeStyle = "#6a4a2a"; ctx.lineWidth = 2; ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
          ctx.strokeStyle = "#e8dcc0"; ctx.beginPath(); ctx.moveTo(x + w / 2, y + 2); ctx.lineTo(x + w / 2, y + h - 2); ctx.stroke();
        }
        ctx.fillStyle = "#c0392b"; ctx.save(); ctx.translate(pk.x + pk.w / 2, pk.y + 14); ctx.rotate(-0.15); ctx.fillRect(-26, -9, 52, 18); ctx.fillStyle = "#fff"; ctx.font = "900 11px 'Noto Sans TC', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("退件", 0, 1); ctx.restore();
      }
      // 大廳：窗口、時間投遞口
      const ct = MAP.counter;
      ctx.fillStyle = "#5a4030"; ctx.fillRect(ct.x, ct.y, ct.w, ct.h); ctx.fillStyle = "#8a6a4a"; ctx.fillRect(ct.x, ct.y, ct.w, 8);
      for (let i = 0; i < 4; i++) { const x = ct.x + 40 + i * 140; ctx.fillStyle = `rgba(255,210,120,${0.5 + 0.2 * Math.sin(now / 500 + i)})`; ctx.beginPath(); ctx.arc(x + 30, ct.y - 14, 10, 0, Math.PI * 2); ctx.fill(); text(`${i + 1} 號窗口`, x + 30, ct.y + 30, "#d8c8a0", 11, 900); }
      const sl = MAP.slot;
      ctx.fillStyle = "#1a1a24"; ctx.fillRect(sl.x, sl.y, sl.w, sl.h);
      ctx.strokeStyle = `rgba(150,180,255,${0.6 + 0.4 * Math.sin(now / 300)})`; ctx.lineWidth = 4; ctx.strokeRect(sl.x - 3, sl.y - 3, sl.w + 6, sl.h + 6);
      text("時間投遞口", sl.x + sl.w / 2, sl.y + sl.h + 18, "#b8c8ff", 12, 900);
      clock(sl.x + sl.w / 2, sl.y - 40, 26, now, active("RT00317-01"));
      // 空中飄過的信
      for (let i = 0; i < 9; i++) {
        const r = Object.values(RM)[i % 6], k = ((now / 9000 + i * 0.37) % 1);
        letter(r.x + ((i * 173 + k * r.w) % r.w), r.y + r.h * (0.15 + 0.7 * ((i * 0.31 + k * 0.5) % 1)), Math.sin(now / 700 + i) * 0.5, 9, 0.35);
      }
      text("分信室", RM.sorting.x + RM.sorting.w / 2, RM.sorting.y + RM.sorting.h - 14, "rgba(216,200,160,.5)", 16, 900);
      text("退件室", RM.returns.x + RM.returns.w / 2, RM.returns.y + RM.returns.h - 14, "rgba(216,200,160,.5)", 16, 900);
      text("時鐘走廊", c.x + c.w / 2, c.y + c.h - 30, "rgba(216,200,160,.5)", 14, 900);
    }
    function drawMason(now) {
      const x = mason.x, y = mason.y + (mason.moving ? Math.sin(now / 80) * 2 : 0);
      ctx.save(); ctx.globalAlpha = 0.75;          // 昨天的人：有一點透明
      ctx.fillStyle = "#fff"; rr(x - 16, y - 16, 32, 32, 7); ctx.fill(); ctx.strokeStyle = "#7a6a5a"; ctx.lineWidth = 3; ctx.stroke();
      text("梅", x, y + 1, "#7a6a5a", 14, 900);
      ctx.fillStyle = "#b88a5a"; ctx.fillRect(x - 20, y - 42, 40, 26); ctx.strokeStyle = "#6a4a2a"; ctx.lineWidth = 2; ctx.strokeRect(x - 20, y - 42, 40, 26);
      ctx.restore();
      text("梅森先生（昨天）", x, y - 54, "#d8c8a0", 11, 900);
      text(`昨天還剩 ${Math.max(0, Math.ceil(D.chase.left))} 秒`, x, y - 70, D.chase.left < 30 ? "#ff8a8a" : "#b8c8ff", 12, 900);
    }
    function drawCat(now) {
      const x = cat.x, y = cat.y, f = cat.moving ? cat.face : Math.PI / 2;
      ctx.fillStyle = "#14141a";
      ctx.beginPath(); ctx.ellipse(x, y, 16, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + Math.cos(f) * 14, y - 8 + Math.sin(f) * 4, 9, 0, Math.PI * 2); ctx.fill();
      const hx = x + Math.cos(f) * 14, hy = y - 8 + Math.sin(f) * 4;
      ctx.beginPath(); ctx.moveTo(hx - 8, hy - 3); ctx.lineTo(hx - 6, hy - 14); ctx.lineTo(hx - 1, hy - 7); ctx.moveTo(hx + 8, hy - 3); ctx.lineTo(hx + 6, hy - 14); ctx.lineTo(hx + 1, hy - 7); ctx.fill();
      ctx.strokeStyle = "#14141a"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x - Math.cos(f) * 14, y); ctx.quadraticCurveTo(x - Math.cos(f) * 26, y - 20 + Math.sin(now / 200) * 6, x - Math.cos(f) * 22, y - 30); ctx.stroke(); ctx.lineCap = "butt";
      ctx.fillStyle = "#e8d84a"; ctx.beginPath(); ctx.arc(hx - 3, hy - 1, 1.8, 0, Math.PI * 2); ctx.arc(hx + 3, hy - 1, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    function draw(now) {
      // 腳印（20 秒後慢慢淡掉）
      if (active("RT00317-02")) for (const p of D.paws) {
        const age = (Date.now() - p.t) / 20000; if (age > 1) continue;
        ctx.fillStyle = `rgba(210,200,240,${0.55 * (1 - age)})`;
        const s = (D.paws.indexOf(p) % 2 ? 1 : -1) * 5;
        ctx.beginPath(); ctx.arc(p.x - Math.sin(p.a) * s, p.y + Math.cos(p.a) * s, 4, 0, Math.PI * 2); ctx.fill();
        for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.arc(p.x - Math.sin(p.a) * s + Math.cos(p.a + k * 0.6) * 6, p.y + Math.cos(p.a) * s + Math.sin(p.a + k * 0.6) * 6, 1.8, 0, Math.PI * 2); ctx.fill(); }
      }
      if (stageOf("RT00317-03")?.type === "rtBills") for (const b of D.bills) {
        if (b.got) continue;
        for (let k = 0; k < 4; k++) {
          ctx.save(); ctx.translate(b.x + (k % 2) * 4, b.y - k * 6); ctx.rotate((k - 1.5) * 0.12 + Math.sin(now / 600 + k) * 0.04);
          ctx.fillStyle = "#f4ecd8"; ctx.fillRect(-18, -12, 36, 24); ctx.strokeStyle = "#8a7a5a"; ctx.lineWidth = 1.5; ctx.strokeRect(-18, -12, 36, 24);
          ctx.restore();
        }
        ctx.save(); ctx.translate(b.x, b.y - 22); ctx.rotate(-0.2); ctx.strokeStyle = "#c0392b"; ctx.lineWidth = 2; ctx.strokeRect(-14, -8, 28, 16);
        ctx.fillStyle = "#c0392b"; ctx.font = "900 10px 'Noto Sans TC', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("催繳", 0, 1); ctx.restore();
      }
      if (active("RT00317-02")) drawCat(now);
      if (stageOf("RT00317-01")?.type === "rtChase") drawMason(now);
    }
    // 地圖上的情緒煙霧：和戰鬥裡同一個樣子（小一號）
    function drawEnemy(e, now, red) {
      const f = ART[e.kind];
      if (!f) return false;
      f(ctx, { r: 22, x: e.hx, facing: e.face || 0, alive: true }, { x: e.x, y: e.y }, now);
      if (red) { ctx.strokeStyle = "#e53935"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, e.y, 30, 0, Math.PI * 2); ctx.stroke(); }
      return true;
    }
    function mini(dot, now) {
      if (stageOf("RT00317-01")?.type === "rtChase") dot(mason.x, mason.y, 4, `rgba(216,200,160,${0.6 + 0.4 * Math.sin(now / 200)})`);
      if (stageOf("RT00317-02")?.type === "rtCat") dot(cat.x, cat.y, 3.5, "#14141a");
      if (stageOf("RT00317-03")?.type === "rtBills") for (const b of D.bills) if (!b.got) dot(b.x, b.y, 3, "#e09a4a");
    }
    return { update, click, draw, drawFloor, drawEnemy, mini, stageText: stText };
  };
})();
