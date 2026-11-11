/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/lb00042.js": "20261112021356" });
// #LB00042 美食研究所：地圖探索裡的專屬玩法
// - 理性倉庫：貨架上的素材只有「採購清單」上的拿得起來
// - 電腦：玩家通不過驗證，只能在委託中協助研究員操作；完成夠多委託後才開放玩家自己做實驗（之後再做）
// - 手稿：記錄微波爐爆炸、噴火、放電、下冰雹……其中某個隨機的組合會發生「實驗意外」＝產出有用的東西
// - 報廢室：把物質的概念送回微波爐裡
// - 委託「照單領料」（文學研究員・普羅）：難蛋、窒礙難行 0 號／1 號、普羅的實驗
(function () {
  const R = (window.RPG = window.RPG || {});
  R.WorldHooks = R.WorldHooks || {};

  const QID = "LB00042-01";
  const UNLOCK = 3;                     // 完成幾張美食研究所的委託才能自己做實驗
  const HATCH = { robot1: 0.1, robot0: 0.7 };   // 拿難蛋靠近報廢室時：10% 1 號、70% 0 號、其餘直接報廢
  const LIST_ITEMS = { homerEpic: "荷馬史詩", hardEgg: "難蛋", chickenEgg: "雞蛋" };
  const WORDS = ["憤怒", "女神", "歌唱", "阿基里斯", "黎明", "玫瑰色", "手指", "酒紅色的海", "特洛伊", "英雄", "命運", "諸神", "歸鄉", "奧德修斯", "木馬", "長矛", "海浪", "宴席", "詩", "榮耀"];

  R.WorldHooks.LB00042 = function (api) {
    const { MAP, trip, run, me, CH, BAG, CM, toast, openPanel, closePanel, goTo, dist, esc, inRect, text, rr } = api;
    const ctx = api.ctx();
    const save = () => { api.save(); api.renderHud?.(); };
    const ROOM = MAP.rooms;
    const qd = () => { trip.qdata = trip.qdata || {}; return (trip.qdata[QID] = trip.qdata[QID] || {}); };
    const lab = () => { trip.qdata = trip.qdata || {}; return (trip.qdata.lab = trip.qdata.lab || {}); };
    const active = () => trip.accepted.includes(QID) && !trip.done.includes(QID);
    const stage = () => (active() ? CM.stage(trip, QID) : null);
    const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

    // ===== 每趟隨機：貨架上的擺放、手稿 =====
    const L = lab();
    if (!L.slots) {
      const slots = [];
      for (const s of MAP.shelves) {
        const horiz = s.w > s.h, len = horiz ? s.w : s.h;
        for (let d = 50; d < len - 20; d += 120) slots.push(horiz ? { x: s.x + d, y: s.y + s.h / 2, h: true } : { x: s.x + s.w / 2, y: s.y + d, h: false });
      }
      const names = shuffle(MAP.materials);
      const idx = shuffle(slots.map((_, i) => i));
      slots.forEach((sl, i) => { sl.name = names[i % names.length]; });
      // 任務會用到的三樣東西，放在隨機的位置
      Object.keys(LIST_ITEMS).forEach((id, k) => { slots[idx[k]].name = LIST_ITEMS[id]; slots[idx[k]].item = id; });
      L.slots = slots;
      // 手稿：大多是事故，其中一個組合是「實驗意外」（有用）
      const mats = shuffle(MAP.materials);
      L.notes = Array.from({ length: 6 }, (_, i) => ({ a: mats[i * 2], b: mats[i * 2 + 1], r: MAP.outcomes[Math.floor(Math.random() * MAP.outcomes.length)] }));
      L.accident = { a: mats[13], b: mats[14] };
      save();
    }

    // ===== 窒礙難行 0 號／1 號、實驗的東西 =====
    const D = qd();
    const robot0 = D.robot0 ? { x: me.x - 40, y: me.y + 30 } : null;
    const robot1 = D.robot1 && !D.scrapped ? { x: D.robot1.x, y: D.robot1.y, a: Math.random() * Math.PI * 2, hits: 0, stun: 0, carried: !!D.carry1 } : null;
    let exp = null;                       // 正在做的實驗 { t0, result }
    const words = [];                     // 噴出來的實體文字
    let chickObj = D.result === "chick" ? { x: 1200, y: 1000, tx: 1200, ty: 1000, wait: 0 } : null;
    const inWarehouse = (x, y) => [ROOM.wTop, ROOM.wLeft, ROOM.wBot].some((r) => inRect(r, x, y));

    // ===== 對話：普羅 =====
    function npcFace(n) { return `<span class="face" style="border-color:${n.color};color:${n.color}">${esc(n.name[0])}</span>`; }
    function proPanel(html) { openPanel("普羅", `<div class="tv-npc">${npcFace(MAP.npcs[0])}<p>${html}</p></div>`); }
    function talkPro(n) {
      const st = stage();
      if (!st) return false;
      const zone = { x: n.x, y: n.y + MAP.zone.dy };
      if (dist(me.x, me.y, zone.x, zone.y) > MAP.zone.r) { goTo(zone, { type: "npc", npc: n, reach: 10 }); return true; }
      const d = qd();
      if (st.type === "talk") {
        openPanel("普羅", `<div class="tv-npc">${npcFace(n)}<p>你們可算來了！我本想將雞蛋和荷馬史詩做出奧菲斯蛋之類的東西！你知道的，那個能孵化宇宙的蛋！可是我的天啊，這台機器居然印出了一個難蛋，這個冒著怪味的蛋阻止我探險宇宙的真理阿！</p></div>
          <p class="tv-note">判定框內的玩家：1 / 1</p>
          <div class="tv-row">${CH.id === "firsler" ? `<button type="button" class="ghost" data-act="pro" data-s="ask">你真覺得一本書和一顆蛋能整出這種東西？</button>` : ""}<button type="button" class="primary" data-act="pro" data-s="go">繼續</button></div>`);
        return true;
      }
      if (st.type === "labFetch") { proPanel(`採購清單已經印給你了：<b>荷馬史詩</b>、<b>難蛋</b>。去理性倉庫拿吧，只有清單上的東西拿得起來。`); return true; }
      if (st.type === "labEgg") {
        const can = BAG.count(run.items, "hardEgg") && BAG.count(run.items, "homerEpic") && !d.robot0 && !d.robot1;
        openPanel("普羅", `<div class="tv-npc">${npcFace(n)}<p>難蛋拿到了吧？快把它丟進報廢室！那個房間在倉庫的左下角。</p></div>
          ${can ? `<div class="tv-row"><button type="button" class="ghost" data-act="pro" data-s="persuade">說服普羅用難蛋做實驗</button></div>` : ""}`);
        return true;
      }
      if (st.type === "labExp") {
        if (BAG.count(run.items, "chickenEgg")) {
          openPanel("普羅", `<div class="tv-npc">${npcFace(n)}<p>雞蛋！完美的、毫無苦難的雞蛋！把它和荷馬史詩一起給我！</p></div>
            <div class="tv-row"><button type="button" class="primary" data-act="pro" data-s="egg">把雞蛋和荷馬史詩交給普羅</button></div>`);
        } else proPanel(`難蛋處理掉了，現在可以重新下單了！幫我在電腦上輸入<b>雞蛋</b>的採購清單，再去倉庫拿來。`);
        return true;
      }
      return false;
    }
    // ===== 音效：窒礙難行移動（循環）、微波爐運轉、微波爐完成 =====
    const SND = { move: "sounds/robot-move.mp3", run: "sounds/microwave-run.mp3", done: "sounds/microwave-done.mp3" };
    const vol = () => R.CONFIG.volume ?? 0.5;
    const moveLoop = new Audio(SND.move); moveLoop.loop = true;
    let runAudio = null, moving = 0;     // moving：這一幀機器人移動的音量（0＝沒在動）
    function moveSound() {
      const want = moving > 0 && !api.isMuted() && !api.isBusy() && !document.hidden;
      if (want) { moveLoop.volume = Math.min(1, vol() * moving); if (moveLoop.paused) moveLoop.play().catch(() => {}); }
      else if (!moveLoop.paused) moveLoop.pause();
    }
    window.addEventListener("pagehide", () => { moveLoop.pause(); runAudio?.pause(); });
    // 實驗：微波爐運轉 → 結果
    const EXP_MS = 4500;
    function startExp(result) {
      exp = { t0: performance.now(), result };
      moving = 0; moveSound();
      if (!api.isMuted()) { runAudio = new Audio(SND.run); runAudio.volume = vol(); runAudio.play().catch(() => {}); }
      closePanel();
      toast("普羅把東西放進微波爐，按下了啟動鍵……");
    }
    function finishExp() {
      const d = qd(), r = exp.result;
      exp = null;
      runAudio?.pause(); runAudio = null;
      api.sfx(SND.done);
      d.result = r;
      while (!trip.done.includes(QID)) CM.advance(trip, QID);
      save();
      const n = MAP.npcs[0];
      if (r === "chick") {
        chickObj = { x: 1600, y: 1140, tx: 1300, ty: 1000, wait: 1.2, via: [{ x: 1400, y: 1045 }, { x: 1320, y: 1045 }] };
        openPanel("實驗結果", `<p class="wx-p">微波爐「叮」的一聲——門一打開，一隻小雞搖搖晃晃地走了出來，雞冠上燃著一簇小小的火苗。牠拍拍翅膀跳上觀察窗，從窗口鑽進了研究室。</p>
          <div class="tv-npc">${npcFace(n)}<p>普羅米修斯！你是普羅米修斯！你從諸神那裡偷來了火！……這是我這輩子最成功的實驗！</p></div><p class="tv-note">委託完成</p>`);
      } else if (r === "epicEgg") {
        openPanel("實驗結果", `<p class="wx-p">微波爐裡是一顆空心的蛋。輕輕一敲，蛋殼上就裂出一行一行的紋路——是荷馬史詩的節錄。</p>
          <div class="tv-npc">${npcFace(n)}<p>史詩蛋……很美，真的很美。只是……它孵不出宇宙。</p></div><p class="tv-note">委託完成</p>`);
      } else {
        for (let i = 0; i < 42; i++) { const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 160; words.push({ x: 1605, y: 1135, vx: Math.cos(a) * sp - 60, vy: Math.sin(a) * sp, t: performance.now(), life: 9000 + Math.random() * 6000, w: WORDS[Math.floor(Math.random() * WORDS.length)], rot: Math.random() - 0.5 }); }
        openPanel("實驗結果", `<p class="wx-p">微波爐的門被撞開——大量的「文字」噴了出來，一個一個實實在在地掉在地上、彈到牆上，過了一陣子才慢慢消失。</p>
          <div class="tv-npc">${npcFace(n)}<p>看到了嗎！它讀懂了！它在吟誦！雖然還不是宇宙之蛋……但這是文學的勝利！</p></div><p class="tv-note">委託完成</p>`);
      }
    }

    // ===== 地圖上的互動 =====
    function slotAt(p) { return L.slots.find((s) => Math.abs(p.x - s.x) < 34 && Math.abs(p.y - s.y) < 34); }
    function takeSlot(s) {
      const d = qd(), list = d.list || [];
      if (!s.item || !list.includes(s.item) || s.taken) { toast(`你盯著「${s.name}」看了半天，還是不知道該怎麼拿起來——它不在採購清單上`); return; }
      if (!BAG.add(run.items, s.item, 1)) { toast("行囊滿了"); return; }
      s.taken = true;
      d.list = list.filter((x) => x !== s.item);
      toast(`照著採購清單，順利拿起了「${s.name}」`);
      const st = stage();
      if (st?.type === "labFetch" && BAG.count(run.items, "homerEpic") && BAG.count(run.items, "hardEgg")) { CM.advance(trip, QID); toast("拿到荷馬史詩和難蛋了。把難蛋丟進左下角的報廢室——或回去說服普羅"); }
      save();
    }
    function openComputer() {
      const st = stage(), d = qd(), adv = R.Adventure.get();
      const doneN = CM.ofWorld("LB00042").filter((c) => trip.done.includes(c.id) || adv?.done?.includes(c.id)).length;
      if (st?.type === "labExp" && !BAG.count(run.items, "chickenEgg") && !(d.list || []).includes("chickenEgg")) {
        openPanel("研究室的電腦", `<p class="wx-p">螢幕上跳出「身分驗證失敗」——不過普羅在旁邊輸入了他的密碼：「幫我按列印就好！」</p>
          <div class="tv-row"><button type="button" class="primary" data-act="lab" data-s="printEgg">協助列印：雞蛋的採購清單</button></div>`);
        return;
      }
      openPanel("研究室的電腦", `<p class="wx-p">「身分驗證失敗。」</p>
        <p class="tv-note">實驗權限：${Math.min(doneN, UNLOCK)} / ${UNLOCK}</p>
        ${(d.list || []).length ? `<p class="tv-note">目前印出的採購清單：${d.list.map((x) => LIST_ITEMS[x]).join("、")}</p>` : ""}`);
    }
    function openNotes() {
      openPanel("桌上的手稿", `<p class="tv-note">研究員們的實驗紀錄，字跡潦草，還沾著咖啡漬：</p><ul class="wx-list">
        ${L.notes.map((n) => `<li>${esc(n.a)}＋${esc(n.b)}：${esc(n.r)}</li>`).join("")}
        <li><b>${esc(L.accident.a)}＋${esc(L.accident.b)}：實驗意外！</b></li></ul>`);
    }

    // ===== 每一幀 =====
    function update(dt, now) {
      const d = qd(), st = stage();
      if (exp) { if (now - exp.t0 > EXP_MS) finishExp(); return; }
      // 拿著難蛋靠近報廢室：可能孵出機器人
      if (st?.type === "labEgg" && BAG.count(run.items, "hardEgg") && !d.robot0 && !d.robot1 && dist(me.x, me.y, 320, 1540) < 110) {
        BAG.remove(run.items, "hardEgg", 1);
        const r = Math.random();
        if (r < HATCH.robot1) {
          d.robot1 = { x: 700, y: 1500 };
          Object.assign(robot1Ref, { x: 700, y: 1500, a: -0.4, hits: 0, stun: 0, carried: false, live: true });
          toast("難蛋裂開了——孵出一個長著機械手的機器人「窒礙難行1號」，一溜煙衝進了倉庫！");
        } else if (r < HATCH.robot1 + HATCH.robot0) {
          d.robot0 = true; robot0Ref.live = true; robot0Ref.x = me.x - 40; robot0Ref.y = me.y;
          toast("難蛋裂開了——孵出一個菱形的小機器人「窒礙難行0號」，乖乖跟在你身後。帶它回研究室吧");
        } else {
          CM.advance(trip, QID);
          toast("難蛋被丟進報廢室，化成一陣光，回到了微波爐裡。去電腦輸入雞蛋的採購清單吧");
        }
        save();
      }
      moving = 0;
      // 0 號：跟著玩家；回到研究室就遞出一張紙
      if (robot0Ref.live) {
        const ox = robot0Ref.x, oy = robot0Ref.y;
        // 沿著玩家走過的路跟過來（不會穿牆）
        const tr = trail, last = tr[tr.length - 1];
        if (!last || dist(last.x, last.y, me.x, me.y) > 12) tr.push({ x: me.x, y: me.y });
        if (dist(robot0Ref.x, robot0Ref.y, me.x, me.y) > 55 && tr.length) {
          let left = 240 * dt;
          while (left > 0 && tr.length && dist(robot0Ref.x, robot0Ref.y, me.x, me.y) > 55) {
            const t = tr[0], dd = dist(robot0Ref.x, robot0Ref.y, t.x, t.y);
            if (dd <= left) { robot0Ref.x = t.x; robot0Ref.y = t.y; left -= dd; tr.shift(); }
            else { robot0Ref.x += ((t.x - robot0Ref.x) / dd) * left; robot0Ref.y += ((t.y - robot0Ref.y) / dd) * left; left = 0; }
          }
        }
        if (dist(ox, oy, robot0Ref.x, robot0Ref.y) > 0.5) moving = Math.max(moving, 0.6);
        if (tr.length > 400 || dist(robot0Ref.x, robot0Ref.y, me.x, me.y) > 900) { robot0Ref.x = me.x - 30; robot0Ref.y = me.y; tr.length = 0; }
        if (!d.recipe && inRect(ROOM.lab, robot0Ref.x, robot0Ref.y) && inRect(ROOM.lab, me.x, me.y)) {
          d.recipe = true;
          BAG.add(run.items, "failRecipe", 1);
          if (stage()?.type === "labEgg") CM.advance(trip, QID);
          save();
          openPanel("窒礙難行0號", `<p class="wx-p">0 號的螢幕閃了閃，從身體裡吐出一張紙：「<b>絕對失敗的配方</b>」。上面的每一行都被劃掉了。</p><p class="tv-note">難蛋的事解決了。去電腦輸入雞蛋的採購清單吧。</p>`);
        }
      }
      // 1 號：在倉庫裡直線暴衝，撞牆就換方向；撞三次會暈眩
      if (robot1Ref.live && !robot1Ref.carried) {
        const b = robot1Ref;
        if (b.stun > 0) { b.stun -= dt; if (b.stun <= 0) { b.hits = 0; b.a = Math.random() * Math.PI * 2; } }
        else {
          const sp = 330 * dt, nx = b.x + Math.cos(b.a) * sp, ny = b.y + Math.sin(b.a) * sp;
          if (api.blocked(nx, ny, 16) || !inWarehouse(nx, ny)) {
            b.hits++;
            api.fx.push({ k: "num", x: b.x, y: b.y - 30, text: "碰！", color: "#e53935", t: now, dur: 600 });
            b.a = b.a + Math.PI * (0.6 + Math.random() * 0.8);
            if (b.hits >= 3) { b.stun = 6; toast("窒礙難行1號撞得頭昏眼花——趁現在把它舉起來！"); }
          } else { b.x = nx; b.y = ny; }
          moving = Math.max(moving, dist(me.x, me.y, b.x, b.y) < 700 ? 1 - dist(me.x, me.y, b.x, b.y) / 900 : 0);
        }
        d.robot1 = { x: Math.round(b.x), y: Math.round(b.y) };
      }
      if (robot1Ref.carried) {
        robot1Ref.x = me.x; robot1Ref.y = me.y - 40;
        if (inRect(ROOM.disp, me.x, me.y)) {
          robot1Ref.live = false; robot1Ref.carried = false; d.carry1 = false; d.scrapped = true; d.bonus = true;
          if (stage()?.type === "labEgg") CM.advance(trip, QID);
          save();
          toast("把窒礙難行1號丟進了報廢室——它化成一陣光回到了微波爐裡。去電腦輸入雞蛋的採購清單吧");
        }
      }
      // 普羅米修斯小雞：在研究室裡晃來晃去
      if (chickObj) {
        const c = chickObj;
        if (c.wait > 0) c.wait -= dt;
        else if (c.via?.length) {
          const v = c.via[0], dd = dist(c.x, c.y, v.x, v.y);
          if (dd < 3) c.via.shift();
          else { const sp = Math.min(dd, 90 * dt); c.x += ((v.x - c.x) / dd) * sp; c.y += ((v.y - c.y) / dd) * sp; }
        } else {
          const dd = dist(c.x, c.y, c.tx, c.ty);
          if (dd < 3) { c.wait = 1 + Math.random() * 3; c.tx = ROOM.lab.x + 40 + Math.random() * (ROOM.lab.w - 80); c.ty = ROOM.lab.y + 80 + Math.random() * (ROOM.lab.h - 160); }
          else { const sp = Math.min(dd, 70 * dt); c.x += ((c.tx - c.x) / dd) * sp; c.y += ((c.ty - c.y) / dd) * sp; }
        }
      }
    }
    const trail = [];
    const robot0Ref = { live: !!robot0, x: robot0?.x || 0, y: robot0?.y || 0 };
    const robot1Ref = robot1 ? { ...robot1, live: true } : { live: false };

    // ===== 繪圖 =====
    function drawRobot(x, y, arms, stun, now) {
      const bob = Math.sin(now / 200) * 2;
      ctx.save(); ctx.translate(x, y + bob);
      ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 3; ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(0, 22, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#1d1d1f"; ctx.beginPath(); ctx.arc(0, 22, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f4f4f4"; ctx.strokeStyle = "#b8b8b8"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(20, 0); ctx.lineTo(0, 14); ctx.lineTo(-20, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-8, -1); ctx.lineTo(8, -1); ctx.stroke();
      if (arms) {
        ctx.strokeStyle = "#c8c8c8"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-28, 0); ctx.quadraticCurveTo(-34, -2, -32, -12); ctx.stroke();
        ctx.strokeStyle = "#777"; ctx.beginPath(); ctx.moveTo(-36, -14); ctx.lineTo(-36, -22); ctx.moveTo(-36, -14); ctx.quadraticCurveTo(-30, -10, -28, -18); ctx.stroke();
        ctx.strokeStyle = "#c8c8c8"; ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(30, 0); ctx.stroke();
        ctx.strokeStyle = "#777"; ctx.beginPath(); ctx.moveTo(30, 0); ctx.quadraticCurveTo(38, -6, 40, 2); ctx.moveTo(30, 0); ctx.quadraticCurveTo(38, 6, 40, -2); ctx.stroke();
      }
      ctx.restore();
      if (stun > 0) text("@ @ 暈眩中", x, y - 40, "#c62828", 12, 900);
    }
    function drawFloor(now, x0, y0) {
      ctx.fillStyle = "#1f232b"; ctx.fillRect(x0, y0, 1280, 720);
      // 理性倉庫
      for (const r of [ROOM.wTop, ROOM.wLeft, ROOM.wBot]) { ctx.fillStyle = "#d9d4c7"; ctx.fillRect(r.x, r.y, r.w, r.h); }
      ctx.strokeStyle = "#7a1f2a"; ctx.lineWidth = 6;
      for (const r of [ROOM.wTop, ROOM.wLeft, ROOM.wBot]) ctx.strokeRect(r.x, r.y, r.w, r.h);
      for (const r of [ROOM.wTop, ROOM.wLeft, ROOM.wBot]) { ctx.fillStyle = "#d9d4c7"; ctx.fillRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6); }
      text("理性倉庫", ROOM.wTop.x + 110, ROOM.wTop.y + 40, "#7a1f2a", 20, 900);
      // 研究室
      const lb = ROOM.lab;
      ctx.fillStyle = "#e9f3fb"; ctx.fillRect(lb.x, lb.y, lb.w, lb.h);
      ctx.strokeStyle = "rgba(42,143,214,.18)"; ctx.lineWidth = 1;
      for (let x = lb.x; x < lb.x + lb.w; x += 40) { ctx.beginPath(); ctx.moveTo(x, lb.y); ctx.lineTo(x, lb.y + lb.h); ctx.stroke(); }
      for (let y = lb.y; y < lb.y + lb.h; y += 40) { ctx.beginPath(); ctx.moveTo(lb.x, y); ctx.lineTo(lb.x + lb.w, y); ctx.stroke(); }
      ctx.strokeStyle = "#2a8fd6"; ctx.lineWidth = 6; ctx.strokeRect(lb.x, lb.y, lb.w, lb.h);
      text("研究室", lb.x + 70, lb.y + 120, "#2a8fd6", 20, 900);
      // 微波爐室
      const g = ROOM.gray;
      ctx.fillStyle = "#c9ccd2"; ctx.fillRect(g.x, g.y, g.w, g.h);
      ctx.strokeStyle = "#7a7f88"; ctx.lineWidth = 6; ctx.strokeRect(g.x, g.y, g.w, g.h);
      text("微波爐室", g.x + g.w / 2, g.y + 28, "#4a4f58", 16, 900);
      // 報廢室
      const dp = ROOM.disp;
      ctx.fillStyle = "#2e2e32"; ctx.fillRect(dp.x, dp.y, dp.w, dp.h);
      ctx.strokeStyle = "#111"; ctx.lineWidth = 6; ctx.strokeRect(dp.x, dp.y, dp.w, dp.h);
      ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(dp.x + 50, dp.y + 40); ctx.lineTo(dp.x + dp.w - 50, dp.y + dp.h - 40); ctx.moveTo(dp.x + dp.w - 50, dp.y + 40); ctx.lineTo(dp.x + 50, dp.y + dp.h - 40); ctx.stroke();
      text("報廢室", dp.x + dp.w / 2, dp.y - 16, "#f2f2f2", 15, 900);
      // 安全門（橘）
      for (const dr of Object.values(MAP.doors)) { ctx.fillStyle = "#f6d0a8"; ctx.fillRect(dr.x, dr.y, dr.w, dr.h); ctx.strokeStyle = "#f08a24"; ctx.lineWidth = 4; ctx.strokeRect(dr.x, dr.y, dr.w, dr.h); }
      // 觀察窗
      ctx.fillStyle = "rgba(160,210,240,.8)"; ctx.fillRect(1380, 1010, 40, 70); ctx.strokeStyle = "#2a8fd6"; ctx.lineWidth = 3; ctx.strokeRect(1380, 1010, 40, 70);
      // 貨架與素材
      for (const s of MAP.shelves) { ctx.fillStyle = "#8a4a3a"; ctx.fillRect(s.x, s.y, s.w, s.h); ctx.strokeStyle = "#5a2a1f"; ctx.lineWidth = 2; ctx.strokeRect(s.x, s.y, s.w, s.h); }
      const d = qd(), list = d.list || [];
      for (const sl of L.slots) {
        if (sl.taken) continue;
        const want = sl.item && list.includes(sl.item);
        ctx.fillStyle = want ? "#ffe27a" : "#e8dcc4"; ctx.fillRect(sl.x - 14, sl.y - 11, 28, 22);
        ctx.strokeStyle = want ? "#c98a1a" : "#7a5a3a"; ctx.lineWidth = want ? 3 : 1.5; ctx.strokeRect(sl.x - 14, sl.y - 11, 28, 22);
        if (dist(me.x, me.y, sl.x, sl.y) < 160 || want) text(sl.name, sl.x, sl.y + (sl.h ? 26 : 0), want ? "#7a4a00" : "#4a3a2a", 11, want ? 900 : 700);
        if (want) { ctx.strokeStyle = `rgba(255,200,40,${0.5 + 0.4 * Math.sin(now / 200)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sl.x, sl.y, 22, 0, Math.PI * 2); ctx.stroke(); }
      }
      // 電腦、手稿桌、微波爐
      const cp = MAP.computer;
      ctx.fillStyle = "#c8ccd4"; ctx.fillRect(cp.x, cp.y, cp.w, cp.h); ctx.strokeStyle = "#8a8f9a"; ctx.lineWidth = 3; ctx.strokeRect(cp.x, cp.y, cp.w, cp.h);
      ctx.fillStyle = "#2a3a4a"; ctx.fillRect(cp.x + 18, cp.y + 12, 64, 40); ctx.fillStyle = `rgba(110,220,160,${0.6 + 0.3 * Math.sin(now / 300)})`; ctx.fillRect(cp.x + 22, cp.y + 16, 56, 32);
      text("電腦", cp.x + cp.w / 2, cp.y + cp.h + 14, "#4a4f58", 12, 900);
      const dk = MAP.desk;
      ctx.fillStyle = "#b5874f"; ctx.fillRect(dk.x, dk.y, dk.w, dk.h); ctx.strokeStyle = "#6b4a2a"; ctx.lineWidth = 3; ctx.strokeRect(dk.x, dk.y, dk.w, dk.h);
      const cols = ["#f4c6d8", "#a6e2f2", "#fff27a", "#c6f2c0", "#f6d0a8"];
      cols.forEach((c, i) => { ctx.save(); ctx.translate(dk.x + 22 + i * 21, dk.y + 30 + (i % 2) * 18); ctx.rotate((i - 2) * 0.2); ctx.fillStyle = c; ctx.fillRect(-12, -16, 24, 32); ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1; ctx.strokeRect(-12, -16, 24, 32); ctx.restore(); });
      text("手稿", dk.x + dk.w / 2, dk.y + dk.h + 14, "#6b4a2a", 12, 900);
      if (qd().result === "epicEgg") { ctx.fillStyle = "#f6efe0"; ctx.beginPath(); ctx.ellipse(dk.x + dk.w - 20, dk.y + 20, 12, 15, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#8a7a5a"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.beginPath(); ctx.moveTo(dk.x + dk.w - 28, dk.y + 16); ctx.lineTo(dk.x + dk.w - 22, dk.y + 22); ctx.lineTo(dk.x + dk.w - 16, dk.y + 14); ctx.lineTo(dk.x + dk.w - 12, dk.y + 22); ctx.stroke(); }
      const mw = MAP.microwave, shake = exp ? Math.sin(now / 30) * 3 : 0;
      const mf = MAP.mwFx?.(now) || {};          // 實驗失敗的事件：微波爐變大、跳起來（js/worlds/lb00042-exp.js）
      ctx.save(); ctx.translate(shake + (mf.dx || 0), mf.dy || 0);
      if (mf.s) { const cx = mw.x + mw.w / 2, cy = mw.y + mw.h; ctx.translate(cx, cy); ctx.scale(mf.s, mf.s); ctx.translate(-cx, -cy); }
      ctx.fillStyle = "#9aa0aa"; ctx.fillRect(mw.x, mw.y, mw.w, mw.h); ctx.strokeStyle = "#4a4f58"; ctx.lineWidth = 3; ctx.strokeRect(mw.x, mw.y, mw.w, mw.h);
      ctx.fillStyle = exp ? `rgba(255,${180 + 60 * Math.sin(now / 80)},80,.9)` : "#5a5f68"; ctx.fillRect(mw.x + 12, mw.y + 18, 46, 54);
      ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(mw.x + 12 + i * 9, mw.y + 72); ctx.lineTo(mw.x + 12 + i * 9 + 14, mw.y + 18); ctx.stroke(); }
      ctx.fillStyle = "#2a3a4a"; ctx.fillRect(mw.x + 66, mw.y + 20, 14, 50);
      text("神奇微波爐", mw.x + mw.w / 2, mw.y + mw.h + 16, "#4a4f58", 12, 900);
      ctx.restore();
    }
    function draw(now) {
      moveSound();
      if (robot0Ref.live) drawRobot(robot0Ref.x, robot0Ref.y, false, 0, now);
      if (robot1Ref.live) drawRobot(robot1Ref.x, robot1Ref.y, true, robot1Ref.stun, now);
      if (robot0Ref.live) text("窒礙難行0號", robot0Ref.x, robot0Ref.y - 34, "#4a4f58", 11, 900);
      if (robot1Ref.live && !(robot1Ref.stun > 0)) text("窒礙難行1號", robot1Ref.x, robot1Ref.y - 40, "#4a4f58", 11, 900);
      if (chickObj) {
        const c = chickObj;
        ctx.fillStyle = "#ffe27a"; ctx.beginPath(); ctx.arc(c.x, c.y, 11, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#c98a1a"; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = "#f08a24"; ctx.beginPath(); ctx.moveTo(c.x + 10, c.y); ctx.lineTo(c.x + 17, c.y + 2); ctx.lineTo(c.x + 10, c.y + 4); ctx.fill();
        ctx.fillStyle = "#1d1d1f"; ctx.beginPath(); ctx.arc(c.x + 4, c.y - 3, 1.8, 0, Math.PI * 2); ctx.fill();
        const fl = 1 + Math.sin(now / 90) * 0.2;
        ctx.fillStyle = "#ff6a1a"; ctx.beginPath(); ctx.moveTo(c.x - 3, c.y - 10); ctx.quadraticCurveTo(c.x - 6, c.y - 18 * fl, c.x, c.y - 24 * fl); ctx.quadraticCurveTo(c.x + 5, c.y - 16 * fl, c.x + 3, c.y - 10); ctx.fill();
        ctx.fillStyle = "#ffd23a"; ctx.beginPath(); ctx.moveTo(c.x - 1, c.y - 11); ctx.quadraticCurveTo(c.x - 2, c.y - 15 * fl, c.x, c.y - 18 * fl); ctx.quadraticCurveTo(c.x + 2, c.y - 14 * fl, c.x + 1, c.y - 11); ctx.fill();
        text("普羅米修斯", c.x, c.y - 34, "#c2471a", 11, 900);
      }
      for (let i = words.length - 1; i >= 0; i--) {
        const w = words[i], age = now - w.t;
        if (age > w.life) { words.splice(i, 1); continue; }
        const k = Math.min(1, age / 1200), tt = Math.min(age, 1200) / 1000;
        const g = ROOM.gray, x = Math.max(g.x + 30, Math.min(g.x + g.w - 30, w.x + w.vx * tt * (1 - k * 0.3))), y = Math.max(g.y + 20, Math.min(g.y + g.h - 14, w.y + w.vy * tt * (1 - k * 0.3)));
        ctx.save(); ctx.globalAlpha = Math.min(1, (w.life - age) / 1500); ctx.translate(x, y); ctx.rotate(w.rot);
        text(w.w, 0, 0, "#3a2a5a", 18, 900); ctx.restore();
      }
    }
    function click(p) {
      const d = qd();
      // 1 號暈眩時舉起來
      if (robot1Ref.live && robot1Ref.stun > 0 && !robot1Ref.carried && dist(p.x, p.y, robot1Ref.x, robot1Ref.y) < 40) {
        if (dist(me.x, me.y, robot1Ref.x, robot1Ref.y) > 80) { goTo({ x: robot1Ref.x, y: robot1Ref.y }, { type: "hook", reach: 60, fn: () => click(p) }); return true; }
        robot1Ref.carried = true; d.carry1 = true; save();
        toast("把窒礙難行1號舉了起來！搬去左下角的報廢室（移動變慢）");
        return true;
      }
      if (robot1Ref.live && !(robot1Ref.stun > 0) && dist(p.x, p.y, robot1Ref.x, robot1Ref.y) < 40) { toast("它跑太快了，抓不住！讓它撞牆撞到暈眩吧"); return true; }
      const sl = slotAt(p);
      if (sl && !sl.taken) {
        if (dist(me.x, me.y, sl.x, sl.y) > 80) { const s = MAP.shelves.find((r) => inRect({ x: r.x - 2, y: r.y - 2, w: r.w + 4, h: r.h + 4 }, sl.x, sl.y)); const side = sl.h ? { x: sl.x, y: me.y < sl.y ? s.y - 26 : s.y + s.h + 26 } : { x: me.x < sl.x ? s.x - 26 : s.x + s.w + 26, y: sl.y }; goTo(side, { type: "hook", reach: 6, fn: () => takeSlot(sl) }); }
        else takeSlot(sl);
        return true;
      }
      const near = (r, fn) => { if (dist(me.x, me.y, r.x + r.w / 2, r.y + r.h / 2) < Math.max(r.w, r.h) / 2 + 60) fn(); else goTo({ x: r.x + r.w / 2, y: r.y + r.h + 30 }, { type: "hook", reach: 8, fn }); return true; };
      if (inRect(MAP.computer, p.x, p.y)) return near(MAP.computer, openComputer);
      if (inRect(MAP.desk, p.x, p.y)) return near(MAP.desk, openNotes);
      if (inRect(MAP.microwave, p.x, p.y)) { toast("神奇微波爐靜靜地待在那裡。沒有人知道它會做出什麼"); return true; }
      return false;
    }
    function act(a, b) {
      if (a === "pro") {
        const s = b.dataset.s, n = MAP.npcs[0];
        if (s === "ask") {
          api.say("你真覺得一本書和一顆蛋能整出這種東西？", 3000);
          openPanel("普羅", `<div class="tv-npc">${npcFace(n)}<p>那肯定的阿，這台狡猾的機器是閱讀文字的，他需要文學之美的領導！</p></div><div class="tv-row"><button type="button" class="primary" data-act="pro" data-s="go">繼續</button></div>`);
          return true;
        }
        if (s === "go") {
          openPanel("普羅", `<div class="tv-npc">${npcFace(n)}<p>總之，在處理掉那個不知道是甚麼的難蛋前，我無法再下單我要的雞蛋，我需要你們的幫助！把那顆難蛋報廢了吧，把他丟進那個房間就行，那個房間能把任何物質的概念回歸到那個微波爐裡，這是我們唯一研究明白的東西。</p></div>
            <div class="tv-row"><button type="button" class="primary" data-act="pro" data-s="list">拿採購清單</button></div>`);
          return true;
        }
        if (s === "list") {
          const d = qd(); d.list = ["homerEpic", "hardEgg"];
          CM.advance(trip, QID); save(); closePanel();
          toast("拿到採購清單：荷馬史詩、難蛋。去理性倉庫找吧（清單上的東西會發光）");
          return true;
        }
        if (s === "persuade") {
          openPanel("普羅", `<div class="tv-npc">${npcFace(n)}<p>有道理啊，苦難確實是文學的根源，好的，我這就來試試。</p></div>
            <div class="tv-row"><button type="button" class="primary" data-act="pro" data-s="persuadeGo">看普羅做實驗</button></div>`);
          return true;
        }
        if (s === "persuadeGo") {
          BAG.remove(run.items, "hardEgg", 1); BAG.remove(run.items, "homerEpic", 1); save();
          startExp(Math.random() < 0.5 ? "epicEgg" : "chick");
          return true;
        }
        if (s === "egg") {
          BAG.remove(run.items, "chickenEgg", 1); BAG.remove(run.items, "homerEpic", 1); save();
          startExp("text");
          return true;
        }
      }
      if (a === "lab" && b.dataset.s === "printEgg") {
        const d = qd(); d.list = ["chickenEgg"]; save(); closePanel();
        toast("印出了採購清單：雞蛋。去倉庫拿吧");
        return true;
      }
      return false;
    }
    function stageText(id, st) {
      if (id !== QID || !st) return null;
      const d = qd();
      if (st.type === "labEgg") {
        if (robot1Ref.live) return robot1Ref.carried ? "把窒礙難行1號搬進報廢室" : "讓窒礙難行1號撞牆三次暈眩，再舉起來";
        if (d.robot0 && !d.recipe) return "帶窒礙難行0號回研究室";
      }
      if (st.type === "labExp") return BAG.count(run.items, "chickenEgg") ? "把雞蛋交給普羅" : (d.list || []).includes("chickenEgg") ? "去理性倉庫拿雞蛋" : "在研究室的電腦輸入雞蛋的採購清單";
      return null;
    }
    function mini(dot, now) {
      const d = qd();
      for (const sl of L.slots) if (!sl.taken && sl.item && (d.list || []).includes(sl.item)) dot(sl.x, sl.y, 4, `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`);
      if (robot1Ref.live) dot(robot1Ref.x, robot1Ref.y, 3.5, "#777");
    }
    api.debug = { L, qd, robot0Ref, robot1Ref, get chick() { return chickObj; }, words };
    return {
      debug: api.debug,
      update, drawFloor, draw, click, act, stageText, mini,
      talk: (n) => (n.id === "pro" ? talkPro(n) : false),
      speedMul: () => (robot1Ref.carried ? 0.6 : 1),
    };
  };
})();
