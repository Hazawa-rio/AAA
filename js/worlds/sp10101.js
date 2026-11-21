/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/sp10101.js": "20261122024623" });
// #SP10101 遞廻齒輪鑲嵌之國（A 級）——上層：齒輪城
//   齒輪橋：點齒輪（要站在同一塊平台上）→ 橋臂轉 90°。指向隔壁平台才走得過去；兩條橋臂撞在一起就卡住（冒火花，兩條都不能走）
//   蒸氣閥：轉一下，連著的噴嘴全部反過來（關掉一個、別的地方就開始噴）；鐵橋上的噴嘴在噴，就過不去
//   斷橋：只有霍夫曼的噴氣裝置跨得過去（矮牆）
//   委託：
//     SP10101-01 停擺的鐘樓：找回三個零件（spParts）→ 裝回鐘樓（spClock）
//     SP10101-02 齒輪裡的蒸氣幽靈：在下層的冷卻工廠抓幽靈（js/worlds/sp10101-cool.js）
//     SP10101-03 伊卡洛斯號：下層接冷卻水到繫留塔（spCoolant）→ 博覽會會場打伊卡洛斯號（冷卻之前，它在上空往下噴蒸氣、掉廢料，靠不近）
//     SP10101-04 掉下來的船員：在平台上追三個制動人偶，按下背後的制動鈕（spDolls；人偶看到你會跑）
//     SP10101-05 氣送管的信：把三封信送到三個街區的信箱（spMail）
//   狀態都存在 trip.qdata.sp（戰鬥來回、換場景都不會變）
(function () {
  const R = (window.RPG = window.RPG || {});
  R.WorldHooks = R.WorldHooks || {};
  const G = () => R.Gears;

  // 這一趟的齒輪城狀態（上下層共用）
  R.SPState = function (trip) {
    trip.qdata = trip.qdata || {};
    const D = (trip.qdata.sp = trip.qdata.sp || {});
    if (!D.st) D.st = G().fresh();
    D.parts = D.parts || {};
    D.caught = D.caught || 0;
    D.junc = D.junc || { j1: "b", j2: "a", j3: "a" };
    return D;
  };
  const bridgeName = (b) => { const N = G().NAMES; return `${N[b.a.join()]}和${N[b.b.join()]}之間的鐵橋`; };

  R.WorldHooks.SP10101 = function (api) {
    const { MAP, trip, me, toast, text, save, dist, CM } = api, ctx = api.ctx();
    const K = R.BKit(api), Gm = G();
    const D = R.SPState(trip);
    const st = D.st;
    let A = Gm.arms(st);
    const anims = [];              // 轉動中的齒輪（只是畫面）：{ id, from, t }
    const sparks = [];
    let heatToast = 0, lastJam = new Set(A.filter((a) => a.jam).map((a) => a.g.id));
    const refresh = () => { A = Gm.arms(st); api.resetPaths(); };
    const enemies = () => R.explore?.enemies || [];

    const colDown = () => trip.done.includes("SP10101-03") || ["report"].includes(K.stage("SP10101-03")?.type);
    const hot = () => !D.cooled && !colDown();
    const COL = MAP.stage;

    // ===== 能不能走：平台、沒卡住的橋臂、沒在噴氣的鐵橋；繫留塔、冷卻之前的蒸氣和廢料雨擋路 =====
    function blocked(x, y, h) {
      const n = 2;
      for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) if (!Gm.walkable(x - h + (2 * h * i) / n, y - h + (2 * h * j) / n, A, st)) return true;
      if (dist(x, y, COL.x, COL.y + 60) < 44 + h) return true;          // 繫留塔
      if (hot() && dist(x, y, COL.x, COL.y) < 250 + h) return true;
      return false;
    }
    // 換了狀態以後：卡在不能走的地方的魔物送回家
    function rescueEnemies() {
      for (const e of enemies()) if (blocked(e.x, e.y, e.r * 0.6)) { e.x = e.hx; e.y = e.hy; e.tx = e.hx; e.ty = e.hy; e.chasing = false; }
    }
    const onPlat = (p) => { const P = Gm.platOf(me.x, me.y); return P && P.i === p[0] && P.j === p[1]; };

    function rotate(g) {
      if (!onPlat(g.p)) return toast(`要站在「${Gm.NAMES[g.p.join()]}」這塊平台上，才轉得動這個齒輪`);
      const from = st.dirs[g.id];
      st.dirs[g.id] = (from + 1) % 4;
      refresh();
      // 身體有一部分還在這條橋臂上：轉了會掉下去，不准轉
      if (blocked(me.x, me.y, me.half)) { st.dirs[g.id] = from; refresh(); return toast("你還站在橋臂上，先退回平台再轉"); }
      anims.push({ id: g.id, from, t: performance.now() });
      rescueEnemies(); save();
      api.sfx("sounds/hoffman-gear.mp3");
      const jam = new Set(A.filter((a) => a.jam).map((a) => a.g.id));
      const mine = A.find((a) => a.g.id === g.id);
      if (mine.jam && !lastJam.has(g.id)) { toast("喀——！兩條橋臂撞在一起卡住了。兩邊都過不去"); sparks.push({ x: (mine.rect.x + mine.rect.w / 2), y: mine.rect.y + mine.rect.h / 2, t: performance.now() }); api.sfx("sounds/slime-slam.mp3"); }
      else if (!mine.jam && lastJam.has(g.id)) toast("橋臂鬆開了");
      else if (mine.dir === g.side && !mine.jam) { const t = g.to; const N = Gm.NAMES[t.join()]; toast(N ? `橋臂接上了「${N}」` : "橋臂伸向深谷，什麼都沒接到"); }
      lastJam = jam;
    }
    function turnValve(v) {
      if (!onPlat(v.p)) return toast("要站在蒸氣閥旁邊才轉得動");
      const msg = [];
      for (const f of v.flips) {
        st.noz[f] = !st.noz[f];
        const b = Gm.NOZZLES[f].bridge;
        msg.push(`${bridgeName(b)}${st.noz[f] ? "開始噴氣" : "的蒸氣停了"}`);
      }
      refresh(); rescueEnemies(); save();
      api.sfx("sounds/hoffman-jet.mp3");
      toast(`轉動蒸氣閥：${msg.join("；")}`);
    }

    // ===== 委託 =====
    function pickPart(p) {
      if (!K.is("SP10101-01", "spParts")) return toast(`${p.name}。好像是鐘樓的零件`);
      if (D.parts[p.id]) return;
      D.parts[p.id] = true; save();
      const n = Object.keys(D.parts).length;
      api.sfx("sounds/hoffman-wrench.mp3");
      if (n >= 3) K.adv("SP10101-01", "三個零件都找到了！帶去北邊的鐘樓廣場");
      else toast(`撿到了「${p.name}」（${n} / 3）`);
    }
    function towerClick() {
      if (D.clock) return api.dlg("鐘樓", { name: "鐘樓", face: "鐘", color: "#b8862a" }, "鐘樓的指針正一格一格地走著。每到整點，整座城都會聽到鐘聲。", [], "");
      if (!K.is("SP10101-01", "spClock")) return toast("鐘樓停在三點四十七分。好像少了什麼零件");
      D.clock = true; D.clockAt = Date.now(); save();
      api.sfx("sounds/guan-chime.mp3");
      setTimeout(() => api.sfx("sounds/passion-bell.mp3"), 700);
      K.adv("SP10101-01", "主發條、擒縱輪、大齒輪——裝好了。指針動了起來，鐘聲響遍整座城！回去找沃爾特吧");
    }
    // ===== SP10101-04 掉下來的船員：人偶在自己的平台上跑，看到你會逃 =====
    D.dolls = D.dolls || {};
    const dolls = MAP.dolls.map((d) => ({ ...d, hx: d.x, hy: d.y, tx: d.x, ty: d.y, wait: 0 }));
    const dollsOn = () => K.is("SP10101-04", "spDolls");
    function updateDolls(dt) {
      if (!dollsOn()) return;
      for (const d of dolls) {
        if (D.dolls[d.id]) continue;
        const P = Gm.pAt(d.p[0], d.p[1]), dm = dist(me.x, me.y, d.x, d.y);
        if (dm < 170) { const a = Math.atan2(d.y - me.y, d.x - me.x); d.tx = d.x + Math.cos(a) * 120; d.ty = d.y + Math.sin(a) * 120; d.wait = 0; }
        else if (d.wait > 0) { d.wait -= dt; continue; }
        d.tx = Math.max(P.x + 50, Math.min(P.x + P.w - 50, d.tx)); d.ty = Math.max(P.y + 50, Math.min(P.y + P.h - 50, d.ty));
        const dd = dist(d.x, d.y, d.tx, d.ty);
        if (dd < 4) { d.wait = 0.5 + Math.random(); d.tx = P.x + 60 + Math.random() * (P.w - 120); d.ty = P.y + 60 + Math.random() * (P.h - 120); continue; }
        const sp = (dm < 170 ? 120 : 55) * dt; d.x += ((d.tx - d.x) / dd) * Math.min(dd, sp); d.y += ((d.ty - d.y) / dd) * Math.min(dd, sp);
      }
    }
    function brakeDoll(d) {
      if (D.dolls[d.id]) return;
      if (dist(me.x, me.y, d.x, d.y) > 80) return toast("喀啦喀啦——人偶從你手邊溜走了。把它逼到平台的角落再按");
      D.dolls[d.id] = true; save(); api.sfx("sounds/rope-tighten.mp3");
      const n = Object.keys(D.dolls).length;
      if (n >= 3) K.adv("SP10101-04", "喀。第三個人偶也停下來了，像睡著一樣。回去找人偶師梅吧");
      else toast(`按下制動鈕，人偶停了下來（${n} / 3）`);
    }
    // ===== SP10101-05 氣送管的信 =====
    D.mail = D.mail || {};
    function deliver(m) {
      if (!K.is("SP10101-05", "spMail")) return toast("一個氣送管的信箱。管子被齒輪橋夾斷了");
      if (D.mail[m.id]) return toast("這封信已經送到了");
      D.mail[m.id] = true; save(); api.sfx("sounds/hoffman-jet.mp3");
      const n = Object.keys(D.mail).length;
      if (n >= 3) K.adv("SP10101-05", `把最後一封信交給${m.to}。三封都送到了！回南門廣場找皮普`);
      else toast(`把信交給${m.to}（${n} / 3）`);
    }

    function goDown() {
      api.changeScene("cool", { x: 400, y: 1480 }, "搭升降梯，下到冷卻工廠……");
    }

    function update(dt, now) {
      updateDolls(dt);
      if (hot() && dist(me.x, me.y, COL.x, COL.y) < 330 && now - heatToast > 6000) {
        heatToast = now;
        toast(K.active("SP10101-03") ? "伊卡洛斯號在上空打轉，往下噴著滾燙的蒸氣、掉下一塊一塊的廢料——靠不近。先去下層的冷卻工廠，把冷卻水接到繫留塔" : "一艘黃銅的飛艇在博覽會會場上空打轉，蒸氣和廢料像雨一樣往下掉。靠不近");
      }
      for (let i = anims.length - 1; i >= 0; i--) if (now - anims[i].t > 450) anims.splice(i, 1);
      for (let i = sparks.length - 1; i >= 0; i--) if (now - sparks[i].t > 900) sparks.splice(i, 1);
    }
    function click(p) {
      for (const g of Gm.GEARS) if (dist(p.x, p.y, g.x, g.y) < 48) { K.reach({ x: g.x - Gm.DX[g.side] * 90, y: g.y - Gm.DY[g.side] * 90 }, 50, () => rotate(g)); return true; }   // 站到齒輪內側（平台上）再轉
      for (const v of Gm.VALVES) if (dist(p.x, p.y, v.x, v.y) < 40) { K.reach(v, 80, () => turnValve(v)); return true; }
      if (K.is("SP10101-01", "spParts")) for (const pt of MAP.parts) if (!D.parts[pt.id] && dist(p.x, p.y, pt.x, pt.y) < 40) { K.reach(pt, 60, () => pickPart(pt)); return true; }
      if (dollsOn()) for (const d of dolls) if (!D.dolls[d.id] && dist(p.x, p.y, d.x, d.y) < 34) { K.reach(d, 60, () => brakeDoll(d)); return true; }
      for (const m of MAP.mailboxes) if (dist(p.x, p.y, m.x, m.y) < 40) { K.reach(m, 70, () => deliver(m)); return true; }
      const T = MAP.tower;
      if (api.inRect({ x: T.x - 10, y: T.y - 60, w: T.w + 20, h: T.h + 80 }, p.x, p.y)) { K.reach({ x: T.x + T.w / 2, y: T.y + T.h + 40 }, 80, towerClick); return true; }
      if (dist(p.x, p.y, MAP.lift.x, MAP.lift.y) < 70) { K.reach(MAP.lift, 80, goDown); return true; }
      return false;
    }
    function stageText(id, s) {
      if (!s) return null;
      if (s.type === "spParts") return `${s.text}（${Object.keys(D.parts).length} / 3）`;
      if (s.type === "spCoolant" && D.cooled) return "冷卻水接好了";
      if (s.type === "spDolls") return `${s.text}（${Object.keys(D.dolls).length} / 3）`;
      if (s.type === "spMail") return `${s.text}（${Object.keys(D.mail).length} / 3）`;
      return null;
    }

    // ===== 繪圖 =====
    const inView = (r, x0, y0) => r.x + r.w > x0 - 40 && r.x < x0 + 1320 && r.y + r.h > y0 - 40 && r.y < y0 + 760;
    function drawPlat(P, now) {
      ctx.fillStyle = "#7a5a32"; api.rr(P.x, P.y, P.w, P.h, 18); ctx.fill();
      ctx.lineWidth = 6; ctx.strokeStyle = "#3a2a14"; ctx.stroke();
      ctx.strokeStyle = "rgba(40,26,10,.35)"; ctx.lineWidth = 2;
      for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.moveTo(P.x + 10, P.y + k * 120); ctx.lineTo(P.x + P.w - 10, P.y + k * 120); ctx.stroke(); }
      ctx.fillStyle = "rgba(30,20,8,.55)"; for (let k = 0; k < 12; k++) { ctx.beginPath(); ctx.arc(P.x + 25 + k * 50, P.y + 14, 3, 0, Math.PI * 2); ctx.arc(P.x + 25 + k * 50, P.y + P.h - 14, 3, 0, Math.PI * 2); ctx.fill(); }
      text(Gm.NAMES[`${P.i},${P.j}`], P.x + P.w / 2, P.y + 40, "rgba(255,230,170,.75)", 15, 900);
    }
    function drawBridge(b, now) {
      const r = b.rect, on = b.nozzle && st.noz[b.nozzle];
      ctx.fillStyle = "#5a5a62"; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = "#2a2a30"; ctx.lineWidth = 3; ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = "rgba(20,20,24,.5)"; ctx.lineWidth = 2;
      if (b.horiz) for (let x = r.x + 20; x < r.x + r.w; x += 30) { ctx.beginPath(); ctx.moveTo(x, r.y); ctx.lineTo(x, r.y + r.h); ctx.stroke(); }
      else for (let y = r.y + 20; y < r.y + r.h; y += 30) { ctx.beginPath(); ctx.moveTo(r.x, y); ctx.lineTo(r.x + r.w, y); ctx.stroke(); }
      if (b.gapRect) { const g = b.gapRect; ctx.fillStyle = "#1a120a"; ctx.fillRect(g.x, g.y, g.w, g.h); ctx.strokeStyle = "#d8a840"; ctx.setLineDash([8, 6]); ctx.strokeRect(g.x, g.y, g.w, g.h); ctx.setLineDash([]); text("斷橋", b.x, b.y + 5, "#ffd890", 13, 900); }
      if (b.nozzle) {
        // 噴嘴：鐵橋兩邊各一個
        for (const s of [-1, 1]) {
          const nx = b.horiz ? b.x + s * 40 : r.x - 8, ny = b.horiz ? r.y - 8 : b.y + s * 40;
          ctx.fillStyle = on ? "#d84a2a" : "#4a4a52"; ctx.beginPath(); ctx.arc(nx, ny, 10, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#1a1a1e"; ctx.lineWidth = 2; ctx.stroke();
        }
        if (on) for (let k = 0; k < 4; k++) R.drawPuff?.(ctx, b.x + (b.horiz ? (k - 1.5) * 50 : 0), b.y + (b.horiz ? 0 : (k - 1.5) * 50), 48, now, k + b.x, 0.7);
      }
    }
    function drawArm(a, now) {
      const g = a.g, an = anims.find((x) => x.id === g.id);
      let ang = (a.dir * Math.PI) / 2;
      if (an) { const k = Math.min(1, (now - an.t) / 450), from = (an.from * Math.PI) / 2; let d = ang - from; if (d < 0) d += Math.PI * 2; ang = from + d * (1 - Math.pow(1 - k, 3)); }
      ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(ang);
      // 橋臂：橘色的長條（使用者的設計圖：黃色的齒輪圈、橘色的齒、橘色的長橋）
      ctx.fillStyle = a.jam ? "#a8502a" : "#e8862a"; api.rr(0, -Gm.ARM_W / 2, Gm.ARM_L, Gm.ARM_W, 14); ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = "#5a2a0a"; ctx.stroke();
      ctx.strokeStyle = "rgba(90,42,10,.4)"; ctx.lineWidth = 2; for (let x = 70; x < Gm.ARM_L; x += 34) { ctx.beginPath(); ctx.moveTo(x, -Gm.ARM_W / 2 + 6); ctx.lineTo(x, Gm.ARM_W / 2 - 6); ctx.stroke(); }
      ctx.restore();
      R.drawGear?.(ctx, g.x, g.y, 46, 12, ang + now / 3000 * (an ? 6 : 0), "#e8862a", "#5a2a0a");
      ctx.fillStyle = "#f2c200"; ctx.beginPath(); ctx.arc(g.x, g.y, 34, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#8a5a0a"; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.arc(g.x, g.y, 22, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#5a2a0a"; ctx.beginPath(); ctx.arc(g.x, g.y, 8, 0, Math.PI * 2); ctx.fill();
      if (a.jam) {
        for (let k = 0; k < 6; k++) { const t = now / 80 + k * 2.1; ctx.strokeStyle = k % 2 ? "#fff3a0" : "#ff9a2a"; ctx.lineWidth = 2; const cx = a.core.x + a.core.w / 2, cy = a.core.y + a.core.h / 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(t) * 26, cy + Math.sin(t * 1.3) * 26); ctx.stroke(); }
      }
    }
    function drawFloor(now, x0, y0) {
      // 蒸氣深谷
      const gr = ctx.createLinearGradient(0, y0, 0, y0 + 720); gr.addColorStop(0, "#241a12"); gr.addColorStop(1, "#3a2414");
      ctx.fillStyle = gr; ctx.fillRect(x0, y0, 1280, 720);
      for (let k = 0; k < 10; k++) { const x = x0 + ((k * 173 + now / 30) % 1400) - 60, y = y0 + 720 - ((now / 22 + k * 97) % 800); ctx.fillStyle = "rgba(255,200,140,.05)"; ctx.beginPath(); ctx.arc(x, y, 60 + (k % 3) * 20, 0, Math.PI * 2); ctx.fill(); }
      for (const P of Gm.PLATS) if (inView(P, x0, y0)) drawPlat(P, now);
      for (const b of Gm.BRIDGES) if (inView(b.rect, x0, y0)) drawBridge(b, now);
      // 齒輪和橋臂（地板的一部分：人走在上面）
      for (const a of A) if (inView({ x: a.g.x - Gm.ARM_L, y: a.g.y - Gm.ARM_L, w: Gm.ARM_L * 2, h: Gm.ARM_L * 2 }, x0, y0)) drawArm(a, now);
      // 建築：機關屋、協會
      for (const [B, name, col] of [[MAP.house, "怪鼠機關屋", "#8a5a2a"], [MAP.guild, "發明家協會", "#4a6a8a"]]) {
        ctx.fillStyle = col; api.rr(B.x, B.y, B.w, B.h, 10); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = "#2a1a0a"; ctx.stroke();
        R.drawGear?.(ctx, B.x + B.w - 34, B.y + 30, 18, 8, now / 900, "#d8a840", "#3a2a10");
        text(name, B.x + B.w / 2, B.y + B.h / 2 + 6, "#fff4dc", 15, 900);
      }
      // 鐘樓
      const T = MAP.tower;
      ctx.fillStyle = "#6a4a2a"; api.rr(T.x, T.y, T.w, T.h, 10); ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = "#2a1a0a"; ctx.stroke();
      const cx = T.x + T.w / 2, cy = T.y + 20;
      ctx.fillStyle = "#f4ead0"; ctx.beginPath(); ctx.arc(cx, cy, 72, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = "#b8862a"; ctx.stroke();
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; ctx.fillStyle = "#3a2a10"; ctx.fillRect(cx + Math.cos(a) * 60 - 2, cy + Math.sin(a) * 60 - 2, 5, 5); }
      const t = D.clock ? (Date.now() - (D.clockAt || 0)) / 1000 + 3 * 3600 + 47 * 60 : 3 * 3600 + 47 * 60;
      const hA = ((t / 3600) % 12) / 12 * Math.PI * 2 - Math.PI / 2, mA = ((t / 60) % 60) / 60 * Math.PI * 2 - Math.PI / 2;
      ctx.strokeStyle = "#1a1006"; ctx.lineCap = "round"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(hA) * 32, cy + Math.sin(hA) * 32); ctx.stroke();
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(mA) * 50, cy + Math.sin(mA) * 50); ctx.stroke(); ctx.lineCap = "butt";
      text(D.clock ? "鐘樓（走著）" : "鐘樓（停在 3:47）", cx, T.y + T.h - 18, "#ffe0a0", 14, 900);
      // 零件
      if (K.is("SP10101-01", "spParts")) for (const p of MAP.parts) if (!D.parts[p.id]) {
        const s = 1 + Math.sin(now / 250) * 0.1;
        ctx.fillStyle = "rgba(255,220,120,.25)"; ctx.beginPath(); ctx.arc(p.x, p.y, 34 * s, 0, Math.PI * 2); ctx.fill();
        R.drawGear?.(ctx, p.x, p.y, 16, 10, now / 600, "#f2c200", "#5a3a0a");
        text(p.name, p.x, p.y - 30, "#fff0b0", 13, 900);
      }
      // 蒸氣閥
      for (const v of Gm.VALVES) {
        ctx.fillStyle = "#3a3a42"; ctx.fillRect(v.x - 8, v.y - 4, 16, 34);
        ctx.strokeStyle = "#d83a2a"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(v.x, v.y - 10, 22, 0, Math.PI * 2); ctx.stroke();
        for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + (v.p[0] + v.p[1]); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(v.x, v.y - 10); ctx.lineTo(v.x + Math.cos(a) * 22, v.y - 10 + Math.sin(a) * 22); ctx.stroke(); }
        text("蒸氣閥", v.x, v.y - 42, "#ffd0c0", 12, 900);
      }
      // 氣送管的信箱
      for (const m of MAP.mailboxes) {
        ctx.fillStyle = "#3a6a5a"; api.rr(m.x - 20, m.y - 30, 40, 50, 6); ctx.fill(); ctx.strokeStyle = "#1a2a20"; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = "#b8862a"; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(m.x, m.y - 30); ctx.lineTo(m.x, m.y - 70); ctx.lineTo(m.x + 30, m.y - 90); ctx.stroke();
        const need = K.is("SP10101-05", "spMail") && !D.mail[m.id];
        text(D.mail[m.id] ? "信箱（送到了）" : "氣送管的信箱", m.x, m.y + 38, need ? "#ffe080" : "#d8f0e0", 12, 900);
      }
      // 升降梯
      const L = MAP.lift;
      ctx.fillStyle = "#2a2a30"; ctx.fillRect(L.x - 60, L.y - 60, 120, 120); ctx.strokeStyle = "#b8862a"; ctx.lineWidth = 5; ctx.strokeRect(L.x - 60, L.y - 60, 120, 120);
      ctx.strokeStyle = "#5a5a62"; ctx.lineWidth = 2; for (let k = -50; k <= 50; k += 20) { ctx.beginPath(); ctx.moveTo(L.x + k, L.y - 60); ctx.lineTo(L.x + k, L.y + 60); ctx.stroke(); }
      text("↓ 冷卻工廠", L.x, L.y + 84, "#a0e0ff", 13, 900);
      // 博覽會會場：展台、繫留塔
      ctx.fillStyle = "#4a3a2a"; ctx.fillRect(COL.x - 160, COL.y + 110, 320, 50); ctx.strokeStyle = "#e8c050"; ctx.lineWidth = 3; ctx.strokeRect(COL.x - 160, COL.y + 110, 320, 50);
      text("全國博覽會・展台", COL.x, COL.y + 142, "#ffe080", 13, 900);
      ctx.fillStyle = "#3a3a42"; ctx.beginPath(); ctx.arc(COL.x, COL.y + 60, 40, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#b8862a"; ctx.lineWidth = 4; ctx.stroke();
      text("繫留塔", COL.x, COL.y + 66, "#ffe0a0", 12, 900);
      if (D.cooled && !colDown()) for (let k = 0; k < 3; k++) R.drawPuff?.(ctx, COL.x + (k - 1) * 30, COL.y + 20 - ((now / 8 + k * 30) % 90), 18, now, k, 0.5);   // 冷卻水往上噴
      if (hot()) { const k = 0.25 + 0.1 * Math.sin(now / 200); const hg = ctx.createRadialGradient(COL.x, COL.y, 60, COL.x, COL.y, 260); hg.addColorStop(0, `rgba(255,90,30,${k})`); hg.addColorStop(1, "rgba(255,90,30,0)"); ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(COL.x, COL.y, 260, 0, Math.PI * 2); ctx.fill(); }
    }
    function draw(now) {
      // 伊卡洛斯號：冷卻之前在上空打轉（高、繞圈、往下掉廢料）；冷卻之後降下來繫在塔邊；打完以後安靜地停著
      const down = colDown(), h = hot();
      const ax = COL.x + (h ? Math.cos(now / 2200) * 140 : 0), ay = COL.y + (h ? Math.sin(now / 2200) * 70 : 0);
      if (h) for (let k = 0; k < 5; k++) { const t = ((now / 900 + k * 0.37) % 1), sx = ax + Math.sin(k * 7.3) * 150, sy = ay - 120 + t * 260; ctx.fillStyle = `rgba(90,80,70,${1 - t})`; ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 6 + k); ctx.fillRect(-8, -5, 16, 10); ctx.restore(); }
      R.EnemyArt?.icarus?.(ctx, { r: 80, x: ax, alive: !down, state: { alt: h ? 5 : down ? 0 : 1 }, def: {} }, { x: ax, y: ay }, down ? 0 : now);
      if (h) { ctx.strokeStyle = "rgba(60,50,40,.6)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(COL.x, COL.y + 30); ctx.lineTo(ax, ay - 80); ctx.stroke(); }   // 繫留索
      if (down) text("（降落了）", COL.x, COL.y - 110, "#ffe0a0", 13, 900);
      if (dollsOn()) for (const d of dolls) R.EnemyArt?.automatonCrew?.(ctx, { r: 16, x: d.x, alive: !D.dolls[d.id], def: {} }, { x: d.x, y: d.y }, D.dolls[d.id] ? 0 : now);
      for (const s of sparks) { const k = (now - s.t) / 900; for (let i = 0; i < 10; i++) { const a = i * 0.63; ctx.fillStyle = `rgba(255,${200 - i * 10},60,${1 - k})`; ctx.beginPath(); ctx.arc(s.x + Math.cos(a) * k * 80, s.y + Math.sin(a) * k * 80, 4, 0, Math.PI * 2); ctx.fill(); } }
    }
    // 地圖上的大型機械
    const ART = { hounds: [["steamHound", -24], ["steamHound", 24]], tankMix: [["rivetTank", -20], ["steamHound", 30]], mix3: [["rivetTank", -40], ["steamHound", 0], ["rivetTank", 40]] };
    function drawEnemy(e, now, red) {
      const L = ART[e.kind]; if (!L) return false;
      for (const [k, dx] of L) R.EnemyArt?.[k]?.(ctx, { r: 22, x: e.x + dx, facing: e.face || 0, alive: true, def: {} }, { x: e.x + dx, y: e.y + (dx ? 6 : -4) }, now);
      if (red) { ctx.strokeStyle = "#e53935"; ctx.lineWidth = 3; ctx.strokeRect(e.x - 70, e.y - 44, 140, 80); }
      return true;
    }
    function mini(dot, now, M) {
      // 迷你地圖：能走的橋臂（橘色）、在噴氣的鐵橋（紅色）
      if (M) { for (const a of A) if (!a.jam) M.rect(a.rect.x, a.rect.y, a.rect.w, a.rect.h, "#e8a860"); for (const b of Gm.BRIDGES) if (b.nozzle && st.noz[b.nozzle]) M.rect(b.rect.x, b.rect.y, b.rect.w, b.rect.h, "#d84a2a"); }
      const blink = 0.6 + 0.4 * Math.sin(now / 200);
      if (K.is("SP10101-01", "spParts")) for (const p of MAP.parts) if (!D.parts[p.id]) dot(p.x, p.y, 5, `rgba(242,194,0,${blink})`);
      if (K.is("SP10101-01", "spClock")) dot(MAP.tower.x + MAP.tower.w / 2, MAP.tower.y + 40, 6, `rgba(242,194,0,${blink})`);
      dot(MAP.lift.x, MAP.lift.y, 5, "#7ad8ff");
      if (dollsOn()) for (const d of dolls) if (!D.dolls[d.id]) dot(d.x, d.y, 4, `rgba(242,194,0,${blink})`);
      if (K.is("SP10101-05", "spMail")) for (const m of MAP.mailboxes) if (!D.mail[m.id]) dot(m.x, m.y, 5, `rgba(242,194,0,${blink})`);
      for (const a of A) if (a.jam) dot(a.g.x, a.g.y, 4, "#ff6a2a");
    }
    return { update, click, blocked, stageText, drawFloor, draw, drawEnemy, mini, dbg: { D, st, rotate, turnValve, arms: () => A, pickPart, towerClick, goDown, G: Gm, goTo: api.goTo, dolls, brakeDoll, deliver } };
  };
})();
