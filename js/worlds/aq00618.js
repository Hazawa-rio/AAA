/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/aq00618.js": "20261122024623" });
// #AQ00618 如此靜謐的蔚藍（A 級）：燈光幽暗、夢一樣安靜的大型水族館
//   視角互換：站在大廳（＝大洋水缸）時，水缸裡的是魚、大廳裡的是人；走進某個水缸時，那個缸裡的魚變成人，大廳裡的人變成大洋的生物
//   燈光：大廳很暗，只有水缸和舞台的燈、身邊一小圈看得清楚
//   委託：
//     AQ00618-01 找不到的大洋：走進五個水缸蓋章（aqStamps）→ 從水缸裡往外看，點一個大廳裡的「人」（aqOcean）
//     AQ00618-02 請來看我們的表演：邀請四位大廳裡的觀眾到珊瑚礁前面（aqAudience）→ 表演變成了餵食秀（戰鬥）
//     AQ00618-03 餵食秀：躲過巡場的聚光燈，溜到舞台後台的籠子（aqSneak）→ 餵食秀的明星・虎鯨（戰鬥）
//     AQ00618-04 從缸裡看的表演：在暖海水缸裡，趕在劊子手走到之前解開三根柱子上的餌（aqRescue）→ 上流・大白鯊（戰鬥）
//     AQ00618-05 沙龍的名單：見過七位上層階級（aqNobles）→ 拿走沙龍桌上的名單（aqList）
//     AQ00618-06 館長室：找到館長的三張舊照片（aqPhotos）→ 打開館長室（aqOffice）
//   這是一個「觀賞的社會」：正常的捕食、優勝劣汰；稀少或強大的生物（大白鯊、虎鯨、藍鯨、鱷魚、酸漿魷、大鱷龜、海象）是上層階級
//   餵食秀在人類的角度（從缸裡看）是在表演性地虐殺人類
//   狀態存在 trip.qdata.aq
(function () {
  const R = (window.RPG = window.RPG || {});
  R.WorldHooks = R.WorldHooks || {};

  R.WorldHooks.AQ00618 = function (api) {
    const { MAP, trip, me, toast, text, save, dist } = api, ctx = api.ctx();
    const K = R.BKit(api);
    trip.qdata = trip.qdata || {};
    const D = (trip.qdata.aq = trip.qdata.aq || { stamps: {}, invited: [], seen: {} });
    D.stamps = D.stamps || {}; D.invited = D.invited || []; D.seen = D.seen || {};
    // 這裡是蒼幽的家：用蒼幽來的時候，館裡的人（和魚）認得他（NPC 的台詞換成 homeLines）
    if (trip.char === "cangyou") for (const n of MAP.npcs) if (n.homeLines) n.lines = n.homeLines;
    const TK = MAP.tanks;
    const tankOf = (x, y) => TK.find((t) => x > t.x && x < t.x + t.w && y > t.y && y < t.y + t.h) || null;
    const inStage = (x, y) => api.inRect(MAP.showStage, x, y);
    const inHall = (x, y) => x > 120 && y > 120 && x < MAP.w - 120 && y < MAP.h - 120 && !tankOf(x, y) && !inStage(x, y) && !MAP.pillars.some((p) => api.inRect({ x: p.x - 30, y: p.y - 30, w: p.w + 60, h: p.h + 60 }, x, y)) && !api.inRect({ x: MAP.salon.x - 30, y: MAP.salon.y - 30, w: MAP.salon.w + 60, h: MAP.salon.h + 60 }, x, y) && !api.inRect({ x: MAP.board.x - 30, y: MAP.board.y - 30, w: MAP.board.w + 60, h: MAP.board.h + 60 }, x, y);
    // 固定的亂數（每一趟一樣）
    let seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const randIn = (t, pad = 60) => ({ x: t.x + pad + rnd() * (t.w - pad * 2), y: t.y + pad + rnd() * (t.h - pad * 2) });
    // 水缸裡的魚
    const fish = [];
    for (const t of TK) for (const f of t.fish) { const p = randIn(t); fish.push({ ...f, tank: t, x: p.x, y: p.y, tx: p.x, ty: p.y, wait: rnd() * 3, face: 0 }); }
    // 大廳裡的「人」（＝大洋的生物）
    const visitors = [];
    for (let i = 0; i < 10; i++) {
      let p; for (let k = 0; k < 60; k++) { p = { x: 200 + rnd() * (MAP.w - 400), y: 860 + rnd() * (MAP.h - 1000) }; if (inHall(p.x, p.y)) break; }
      if (api.inRect({ x: MAP.salon.x - 40, y: MAP.salon.y - 40, w: MAP.salon.w + 80, h: MAP.salon.h + 80 }, p.x, p.y)) p = { x: 2600, y: 2200 };
      visitors.push({ i, ...MAP.ocean[i % MAP.ocean.length], x: p.x, y: p.y, tx: p.x, ty: p.y, wait: rnd() * 3, face: 0, col: ["#6a8ab8", "#8a6ab8", "#5a9a8a", "#b86a8a", "#8a8a5a"][i % 5] });
    }
    // 被邀請到珊瑚礁前面的觀眾：站成一排
    const seat = (k) => ({ x: 330 + k * 150, y: 900 + (k % 2) * 34 });
    D.invited.forEach((vi, k) => { const v = visitors[vi]; if (v) { const s = seat(k); Object.assign(v, s, { tx: s.x, ty: s.y, seated: true }); } });

    let inT = tankOf(me.x, me.y), caughtUntil = 0, spotGrace = 0;
    const spotAng = (s, now) => s.a0 + (s.a1 - s.a0) * (0.5 + 0.5 * Math.sin((now / s.period) * Math.PI * 2));
    const SPOT_LEN = 1150, SPOT_HALF = 0.11;
    function inSpot(x, y, now) {
      for (const s of MAP.spots) {
        const d = dist(x, y, s.x, s.y); if (d > SPOT_LEN || d < 30) continue;
        let da = Math.atan2(y - s.y, x - s.x) - spotAng(s, now); da = Math.atan2(Math.sin(da), Math.cos(da));
        if (Math.abs(da) < SPOT_HALF) return s;
      }
      return null;
    }

    // ===== 走動 =====
    function wander(o, dt, area, speed) {
      if (o.wait > 0) { o.wait -= dt; return; }
      const d = dist(o.x, o.y, o.tx, o.ty);
      if (d < 4) { if (o.seated) return; o.wait = 1 + Math.random() * 3; for (let k = 0; k < 12; k++) { const p = area(); if (p) { o.tx = p.x; o.ty = p.y; break; } } return; }
      const s = Math.min(d, speed * dt); o.face = Math.atan2(o.ty - o.y, o.tx - o.x);
      o.x += ((o.tx - o.x) / d) * s; o.y += ((o.ty - o.y) / d) * s;
    }
    const hallPoint = (o) => () => { const p = { x: o.x + (Math.random() - 0.5) * 500, y: o.y + (Math.random() - 0.5) * 400 }; return inHall(p.x, p.y) ? p : null; };

    function update(dt, now) {
      for (const f of fish) wander(f, dt, () => ({ x: f.tank.x + 60 + Math.random() * (f.tank.w - 120), y: f.tank.y + 60 + Math.random() * (f.tank.h - 120) }), 34);
      for (const v of visitors) wander(v, dt, hallPoint(v), v.seated ? 60 : 26);
      // 進出水缸
      const t = tankOf(me.x, me.y);
      if (t !== inT) {
        inT = t;
        if (t) {
          if (!api.hasFlag("aqSwap")) { api.setFlag("aqSwap"); toast("你穿過了玻璃。……一點也不濕。水缸裡的魚轉過頭來——牠們是人。玻璃外面的人，變成了魚"); }
          else if (trip.char === "cangyou" && !D.seen[t.id]) toast(`走進了「${t.name}」水缸。缸裡的人們轉過頭來，小聲地說：「……是他。他回來了。」`);
          else toast(`走進了「${t.name}」水缸`);
          D.seen[t.id] = true;
          if (K.is("AQ00618-01", "aqStamps") && !D.stamps[t.id]) {
            D.stamps[t.id] = true; save(); api.sfx("sounds/guan-chime.mp3");
            const n = Object.keys(D.stamps).length;
            if (n >= 5) K.adv("AQ00618-01", `在「${t.name}」的集章台蓋了章——五個水缸都蓋好了。可是第六格「大洋」還是空的……`);
            else setTimeout(() => toast(`在「${t.name}」的集章台蓋了章（${n} / 5）`), 1600);
          }
        }
      }
      // 餵食秀前的巡場：被聚光燈照到就被請回入口
      if (K.is("AQ00618-03", "aqSneak") && !inT && now > spotGrace && inSpot(me.x, me.y, now)) {
        caughtUntil = now + 1200; spotGrace = now + 2500;
        me.x = MAP.arrive.x; me.y = MAP.arrive.y; me.target = null; me.path = null; save();
        api.sfx("sounds/passion-bell.mp3");
        toast("聚光燈照到你了——黑暗裡所有的眼睛同時轉過來。「觀眾請回到座位上。」你被請回了入口");
      }
      updateShow(dt, now);
      if (K.is("AQ00618-03", "aqSneak") && dist(me.x, me.y, MAP.cage.x, MAP.cage.y) < 80) {
        D.freed = true; save(); api.sfx("sounds/rope-tighten.mp3");
        K.adv("AQ00618-03", "你打開了後台的籠子，小燈的妹妹發著微光游回了深海。——舞台的燈全亮了。今晚的明星，沒有餌了");
      }
    }

    // ===== AQ00618-04：暖海水缸裡的「餵食秀」——在缸外看是大白鯊吃魚；在缸裡看，是劊子手在觀眾面前一個一個處決綁在柱子上的人 =====
    const WARM = TK.find((t) => t.id === "warm");
    const show = { on: false, ex: { x: WARM.x + WARM.w / 2, y: WARM.y + 70 }, freed: [false, false, false], untie: [0, 0, 0], cheerAt: 0 };
    const showStage = () => K.is("AQ00618-04", "aqRescue");
    function resetShow() { show.on = false; show.ex = { x: WARM.x + WARM.w / 2, y: WARM.y + 70 }; show.freed = [false, false, false]; show.untie = [0, 0, 0]; }
    function updateShow(dt, now) {
      if (!showStage()) return;
      if (!show.on) { if (inT === WARM) { show.on = true; show.cheerAt = now + 2000; toast("缸外的燈全亮了。玻璃外面，一雙雙魚的眼睛貼了上來——表演開始。戴著紅面具的劊子手，朝第一根柱子走過去"); api.sfx("sounds/passion-bell.mp3"); } return; }
      // 解開：站在柱子旁邊 1.5 秒
      MAP.posts.forEach((p, i) => {
        if (show.freed[i]) return;
        if (dist(me.x, me.y, p.x, p.y) < 70) { show.untie[i] += dt; if (show.untie[i] >= 1.5) { show.freed[i] = true; api.sfx("sounds/rope-tighten.mp3"); toast(`解開了第 ${show.freed.filter(Boolean).length} 個人的繩子。他躲進了珊瑚後面`); } }
        else show.untie[i] = Math.max(0, show.untie[i] - dt);
      });
      if (show.freed.every(Boolean)) {
        D.rescued = true; save(); resetShow();
        K.adv("AQ00618-04", "三個人都解開了。玻璃外的觀眾安靜了一下——然後開始噓。燈光轉向缸頂：上流的大白鯊親自下來了");
        return;
      }
      // 劊子手走向下一根還綁著的柱子
      const i = show.freed.findIndex((f) => !f), P = MAP.posts[i], d = dist(show.ex.x, show.ex.y, P.x, P.y);
      if (d < 30) {
        toast("劊子手在柱子前停下，舉起了刀——缸外的燈一下子全暗了。觀眾的歡呼聲隔著玻璃悶悶地傳進來。……燈再亮起來的時候，柱子上又綁好了新的人。表演重新開始");
        api.sfx("sounds/explosion.mp3");
        resetShow(); show.on = false;
        me.x = WARM.x + WARM.w / 2; me.y = WARM.y + WARM.h + 60; me.target = null; me.path = null; save();
        return;
      }
      const sp = 58 * dt; show.ex.x += ((P.x - show.ex.x) / d) * sp; show.ex.y += ((P.y - show.ex.y) / d) * sp;
      if (now > show.cheerAt) { show.cheerAt = now + 4500 + Math.random() * 2000; toast(["（玻璃外傳來悶悶的歡呼聲）", "（缸外的魚擠在玻璃前，眼睛一眨也不眨）", "（有人在外面敲玻璃，催劊子手快一點）"][Math.floor(Math.random() * 3)]); }
    }
    // ===== AQ00618-05：沙龍的名單 =====
    D.met = D.met || {};
    const nobles = MAP.npcs.filter((n) => n.noble);
    function talk(n) {
      if (!n.noble || !K.is("AQ00618-05", "aqNobles") || D.met[n.id]) return false;
      if (dist(me.x, me.y, n.x, n.y) > 110) return false;           // 先走過去（走到了會再呼叫一次）
      D.met[n.id] = true; save();
      const k = Object.keys(D.met).length;
      api.dlg("上層階級", { name: n.name, face: n.face || "虎", color: n.color }, n.lines[Math.floor(Math.random() * n.lines.length)], [], `（見過 ${k} / ${nobles.length} 位上層階級）`);
      if (k >= nobles.length) K.adv("AQ00618-05", "七位都見過了。沙龍裡間最裡面的桌上，放著今晚的名單");
      return true;
    }
    function takeList() {
      if (!K.is("AQ00618-05", "aqList")) return toast("沙龍的桌上放著一疊燙金的紙。上面寫著一排一排的名字，有些被劃掉了");
      D.list = true; save(); api.sfx("sounds/rope-tighten.mp3");
      api.dlg("今晚的名單", { name: "名單", face: "名", color: "#b8862a" }, "燙金的紙上，簽著七個上層階級的名字。<br>下面一排一排，是今晚的餌：寒帶・企鵝三隻、珊瑚礁・雀鯛五隻、雨林・神仙魚兩隻……<br>每個名字旁邊，都寫著預定的「觀賞人數」。", [], "", true);
      K.adv("AQ00618-05", "你把名單揣進懷裡。回寒帶水缸找小白吧");
    }
    // ===== AQ00618-06：館長室 =====
    D.photos = D.photos || {};
    function takePhoto(ph) {
      if (D.photos[ph.id]) return;
      D.photos[ph.id] = true; save(); api.sfx("sounds/guan-chime.mp3");
      const n = Object.keys(D.photos).length;
      const txt = ["一張褪色的照片：一個小男孩把臉貼在深海的玻璃上。玻璃另一邊，有一群像幽靈一樣的魚。", "第二張：同一個男孩，手指尖長出了細細的鰭。他在笑。", "第三張：男孩的半邊臉映在玻璃上——映出來的那一半，是魚。背面寫著：「就是這一刻。」"][n - 1];
      if (n >= 3) K.adv("AQ00618-06", `${txt} ……三張照片都找到了。館長室在雨林和寒帶水缸之間的走廊盡頭`);
      else toast(`${txt}（${n} / 3）`);
    }
    function openOffice() {
      if (!K.is("AQ00618-06", "aqOffice")) return toast("「館長室」。門鎖著，門縫裡透出很淡的藍光");
      D.office = true; save();
      const extra = trip.char === "cangyou" ? "<br><br>（日誌最後一頁夾著第四張照片。照片上的孩子，和你長得一模一樣。）" : "";
      api.dlg("館長室", { name: "館長的日誌", face: "誌", color: "#2a5a8a" },
        "館長室裡沒有人。椅子上積了很厚的灰，桌上攤著一本日誌：<br><br>「小時候，我把臉貼在深海的玻璃上，貼了太久。那一刻，我不再完全是人，也還不是魚。<br>後來我長大了，當上了館長。可是那一刻沒有跟著我長大——它還留在玻璃前面，卡在人和魚的中間，被一群幽靈一樣的魚陪著。<br>我蓋了這座館，讓所有的生命都能被看見。我以為這樣，那一刻就不會寂寞。」" + extra, [], "", true);
      K.adv("AQ00618-06", "回去告訴導覽員汐吧");
    }

    // ===== 點擊 =====
    function clickVisitor(v) {
      if (inT && K.is("AQ00618-01", "aqOcean")) {
        D.oceanSeen = true; save();
        api.dlg("大洋", { name: v.n, face: "？", color: v.c }, `你隔著「${inT.name}」的玻璃往外看。<br>剛剛還在大廳裡散步的人，現在是一隻${v.n}——牠正從外面看著你。<br>大廳裡沒有一個人是人。<b>大廳本身，就是最大的那個水缸。</b>`, [], "", true);
        K.adv("AQ00618-01", "找到大洋了。回去告訴導覽員汐吧");
        return;
      }
      if (inT) return toast(`玻璃外面游著一隻${v.n}。……牠剛剛明明是個人`);
      if (K.is("AQ00618-02", "aqAudience") && !v.seated) {
        const k = D.invited.length; const s = seat(k);
        D.invited.push(v.i); v.seated = true; v.tx = s.x; v.ty = s.y; v.wait = 0; save();
        if (D.invited.length >= 4) K.adv("AQ00618-02", "四位觀眾都在珊瑚礁前面坐好了。表演要開始了——到珊瑚礁前面看吧");
        else toast(`「表演？……好啊，反正我們本來就是來看的。」（${D.invited.length} / 4）`);
        return;
      }
      toast(["「好安靜喔。」", "「你也是來看的嗎？」", "「我在看那條魚。牠也在看我。」", "「餵食秀快開始了吧？」", "「我在這裡很久了……我是從哪裡進來的？」"][v.i % 5]);
    }
    function openBoard() {
      const rows = TK.map((t) => `<li>${t.name}${D.stamps[t.id] ? "（已蓋章）" : ""}</li>`).join("");
      const ocean = trip.done.includes("AQ00618-01") || D.oceanSeen ? "大洋——<b>你現在的位置</b>" : "大洋（？？？）";
      api.openPanel("館內導覽圖", `<p class="wx-p">如此靜謐的蔚藍・館內導覽：</p><ol class="wx-p">${rows}<li>${ocean}</li></ol><p class="tv-note">請保持安靜。這裡的每一個生命，都很在意有沒有被好好地看著。</p><div class="tv-row" style="justify-content:flex-end"><button type="button" class="ghost" data-close>離開</button></div>`);
    }
    function click(p) {
      for (const v of visitors) if (dist(p.x, p.y, v.x, v.y) < 26) { if (inT) clickVisitor(v); else K.reach(v, 120, () => clickVisitor(v)); return true; }   // 在水缸裡：隔著玻璃看就好，不用走過去
      if (dist(p.x, p.y, MAP.listDesk.x, MAP.listDesk.y) < 50) { K.reach(MAP.listDesk, 70, takeList); return true; }
      if (K.is("AQ00618-06", "aqPhotos")) for (const ph of MAP.photos) if (!D.photos[ph.id] && dist(p.x, p.y, ph.x, ph.y) < 36) { K.reach(ph, 60, () => takePhoto(ph)); return true; }
      // 通往外面的門（水族館的外面＝原始水域，js/worlds/aq00618-wild.js）
      if (dist(p.x, p.y, MAP.wildDoor.x, MAP.wildDoor.y) < 60) { K.reach({ x: MAP.wildDoor.x - 90, y: MAP.wildDoor.y }, 60, () => api.changeScene("wild", { x: 2375, y: 3540 }, "推開了寫著「員工以外禁止進入」的門……外面，也是一座水族館")); return true; }
      if (dist(p.x, p.y, MAP.office.x, MAP.office.y) < 60) { K.reach({ x: MAP.office.x, y: MAP.office.y + 80 }, 60, openOffice); return true; }
      const B = MAP.board;
      if (api.inRect({ x: B.x - 10, y: B.y - 10, w: B.w + 20, h: B.h + 20 }, p.x, p.y)) { K.reach({ x: B.x + B.w / 2, y: B.y + B.h + 40 }, 70, openBoard); return true; }
      for (const f of fish) if (dist(p.x, p.y, f.x, f.y) < 24) {
        const same = inT === f.tank;
        toast(same ? `一位「${f.ch}」先生轉過頭來：「你也是被看的那一邊了呢。」` : `一隻${f.n}隔著玻璃看著你。`);
        return true;
      }
      return false;
    }
    function stageText(id, s) {
      if (!s) return null;
      if (s.type === "aqStamps") return `${s.text}（${Object.keys(D.stamps).length} / 5）`;
      if (s.type === "aqAudience") return `${s.text}（${D.invited.length} / 4）`;
      if (s.type === "aqRescue") return show.on ? `${s.text}（解開 ${show.freed.filter(Boolean).length} / 3）` : s.text;
      if (s.type === "aqNobles") return `${s.text}（${Object.keys(D.met).length} / ${nobles.length}）`;
      if (s.type === "aqPhotos") return `${s.text}（${Object.keys(D.photos).length} / 3）`;
      return null;
    }

    // ===== 繪圖 =====
    // 魚的樣子（s＝大小、col＝顏色）
    // sp＝物種名：有專屬外型的（js/sea-art.js）照本來的樣子畫，沒有的才畫成一般的魚
    function fishShape(x, y, s, col, face, now, k = 0, sp) {
      if (sp && R.SeaArt?.has(sp)) { R.SeaArt.draw(ctx, sp, x, y, s, face, now, col, k); return; }
      const f = Math.cos(face || 0) >= 0 ? 1 : -1, w = Math.sin(now / 200 + k) * 0.25;
      ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-s * 0.9, 0); ctx.lineTo(-s * 1.45, -s * (0.45 + w)); ctx.lineTo(-s * 1.45, s * (0.45 - w)); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s * 0.5, -s * 0.12, s * 0.16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(s * 0.55, -s * 0.12, s * 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    const OSIZE = { 鯨鯊: 34, 鬼蝠魟: 28, 大白鯊: 30, 翻車魚: 26, 虎鯨: 34, 藍鯨: 46, 酸漿魷: 30, 鱷魚: 26, 大鱷龜: 24, 海象: 28 };
    const seenAsFish = (tank) => inT !== tank;           // 從現在的位置看，這個（在 tank 裡的）東西是不是魚
    function drawFloor(now, x0, y0) {
      ctx.fillStyle = "#06101c"; ctx.fillRect(x0, y0, 1280, 720);
      ctx.fillStyle = "#0c1a2a"; ctx.fillRect(80, 80, MAP.w - 160, MAP.h - 160);
      // 水光（大廳的地板上也有波紋——這裡本來就在水裡）
      ctx.strokeStyle = "rgba(120,190,255,.07)"; ctx.lineWidth = 3;
      for (let k = 0; k < 18; k++) { const y = y0 + ((k * 61 + now / 40) % 760) - 20; ctx.beginPath(); for (let x = x0; x <= x0 + 1280; x += 40) ctx.lineTo(x, y + Math.sin(x / 90 + now / 900 + k) * 10); ctx.stroke(); }
      // 水缸
      for (const t of TK) {
        const g = ctx.createLinearGradient(0, t.y, 0, t.y + t.h); g.addColorStop(0, t.water); g.addColorStop(1, "#04080e");
        ctx.fillStyle = g; ctx.fillRect(t.x, t.y, t.w, t.h);
        // 缸底的造景
        ctx.save(); ctx.beginPath(); ctx.rect(t.x, t.y, t.w, t.h); ctx.clip();
        let s2 = t.x; const r2 = () => ((s2 = (s2 * 9301 + 49297) % 233280) / 233280);
        if (t.id === "coral") for (let i = 0; i < 14; i++) { const x = t.x + r2() * t.w, y = t.y + t.h - 20 - r2() * 120; ctx.fillStyle = ["#ff7a8a", "#ffb05a", "#c85aff"][i % 3]; for (let b = 0; b < 4; b++) { ctx.beginPath(); ctx.arc(x + (b - 1.5) * 12, y - b * 10 + Math.sin(now / 900 + i) * 2, 10, 0, Math.PI * 2); ctx.fill(); } }
        if (t.id === "rain") for (let i = 0; i < 16; i++) { const x = t.x + r2() * t.w; ctx.strokeStyle = "#3a8a3a"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, t.y + t.h); ctx.quadraticCurveTo(x + Math.sin(now / 800 + i) * 30, t.y + t.h - 150, x + Math.sin(now / 600 + i) * 20, t.y + t.h - 260 - r2() * 120); ctx.stroke(); }
        if (t.id === "polar") { ctx.fillStyle = "rgba(240,250,255,.8)"; for (let i = 0; i < 6; i++) { const x = t.x + r2() * t.w; ctx.beginPath(); ctx.moveTo(x - 80, t.y + t.h); ctx.lineTo(x, t.y + t.h - 90 - r2() * 60); ctx.lineTo(x + 90, t.y + t.h); ctx.fill(); } ctx.fillRect(t.x, t.y, t.w, 26); }
        if (t.id === "warm") for (let i = 0; i < 18; i++) { const x = t.x + r2() * t.w; ctx.fillStyle = "#e8d8a8"; ctx.beginPath(); ctx.arc(x, t.y + t.h - 6, 16 + r2() * 20, Math.PI, 0); ctx.fill(); }
        if (t.id === "deep") for (let i = 0; i < 20; i++) { const x = t.x + r2() * t.w, y = t.y + r2() * t.h; ctx.fillStyle = `rgba(150,170,255,${0.2 + 0.3 * Math.sin(now / 500 + i)})`; ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill(); }
        // 光的波紋
        ctx.strokeStyle = "rgba(255,255,255,.06)"; ctx.lineWidth = 2;
        for (let k = 0; k < 8; k++) { ctx.beginPath(); for (let x = t.x; x <= t.x + t.w; x += 30) ctx.lineTo(x, t.y + 40 + k * 70 + Math.sin(x / 70 + now / 700 + k) * 8); ctx.stroke(); }
        ctx.restore();
        // 玻璃
        ctx.strokeStyle = t.glass; ctx.globalAlpha = 0.55 + 0.15 * Math.sin(now / 1300 + t.x); ctx.lineWidth = 6; ctx.strokeRect(t.x, t.y, t.w, t.h); ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(t.x + 30, t.y + t.h - 30); ctx.lineTo(t.x + 140, t.y + 30); ctx.stroke();
        // 名牌
        const lx = t.x + t.w / 2, ly = t.y + t.h + 26;
        api.rr(lx - 60, ly - 16, 120, 28, 6); ctx.fillStyle = "rgba(10,20,34,.85)"; ctx.fill(); ctx.strokeStyle = t.glass; ctx.lineWidth = 1.5; ctx.stroke();
        text(t.name, lx, ly + 3, "#d8ecff", 14, 900);
        if (K.is("AQ00618-01", "aqStamps") && !D.stamps[t.id]) { ctx.fillStyle = `rgba(242,194,0,${0.5 + 0.4 * Math.sin(now / 250)})`; ctx.beginPath(); ctx.arc(lx + 70, ly - 2, 7, 0, Math.PI * 2); ctx.fill(); }
      }
      // 表演廳的舞台
      const S = MAP.showStage;
      ctx.fillStyle = "#2a1a2a"; api.rr(S.x, S.y, S.w, S.h, 30); ctx.fill(); ctx.strokeStyle = "#c8a0ff"; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = "rgba(200,160,255,.2)"; ctx.lineWidth = 2; for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.arc(S.x + S.w / 2, S.y + S.h + 40, k * 90, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
      text("— 餵 食 秀 —", S.x + S.w / 2, S.y + 44, "#ffb0d8", 20, 900);
      // 觀眾席
      ctx.fillStyle = "rgba(60,40,70,.6)"; for (let r = 0; r < 3; r++) for (let k = 0; k < 9; k++) ctx.fillRect(S.x + 40 + k * 90, S.y + S.h + 50 + r * 60, 60, 26);
      // 後台的籠子
      const Cg = MAP.cage, empty = D.freed || trip.done.includes("AQ00618-03");
      ctx.strokeStyle = "#8a8a9a"; ctx.lineWidth = 3; ctx.strokeRect(Cg.x - 40, Cg.y - 40, 80, 80); for (let k = -30; k <= 30; k += 15) { ctx.beginPath(); ctx.moveTo(Cg.x + k, Cg.y - 40); ctx.lineTo(Cg.x + k, Cg.y + 40); ctx.stroke(); }
      if (!empty) { ctx.fillStyle = `rgba(160,200,255,${0.5 + 0.3 * Math.sin(now / 300)})`; ctx.beginPath(); ctx.arc(Cg.x, Cg.y, 10, 0, Math.PI * 2); ctx.fill(); }
      text(empty ? "後台（籠子空了）" : "後台的籠子", Cg.x, Cg.y - 52, "#c8d8ff", 12, 900);
      // 上流沙龍（貴賓席）
      const SL = MAP.salon;
      ctx.fillStyle = "#3a1a24"; api.rr(SL.x, SL.y, SL.w, SL.h, 20); ctx.fill(); ctx.strokeStyle = "#e8c050"; ctx.lineWidth = 4; ctx.stroke();
      ctx.strokeStyle = "rgba(232,192,80,.18)"; ctx.lineWidth = 2; for (let x = SL.x + 40; x < SL.x + SL.w; x += 60) { ctx.beginPath(); ctx.moveTo(x, SL.y + 10); ctx.lineTo(x, SL.y + SL.h - 10); ctx.stroke(); }
      for (const cx of [SL.x + 220, SL.x + 680]) { const g = ctx.createRadialGradient(cx, SL.y + 120, 5, cx, SL.y + 120, 120); g.addColorStop(0, "rgba(255,230,160,.35)"); g.addColorStop(1, "rgba(255,230,160,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, SL.y + 120, 120, 0, Math.PI * 2); ctx.fill(); }
      text("— 上 流 沙 龍・貴 賓 席 —", SL.x + SL.w / 2, SL.y + 36, "#ffe080", 16, 900);
      const LD = MAP.listDesk; ctx.fillStyle = "#6a3a1a"; ctx.fillRect(LD.x - 50, LD.y - 20, 100, 40); ctx.fillStyle = "#f4ead0"; ctx.fillRect(LD.x - 20, LD.y - 14, 40, 26);
      text(D.list ? "（名單被拿走了）" : "燙金的名單", LD.x, LD.y - 30, "#ffe0a0", 12, 900);
      // 通往外面的門
      const WD = MAP.wildDoor; ctx.fillStyle = "#0e1a26"; ctx.fillRect(WD.x - 40, WD.y - 70, 80, 130); ctx.strokeStyle = "#5ab8d8"; ctx.lineWidth = 3; ctx.strokeRect(WD.x - 40, WD.y - 70, 80, 130);
      ctx.fillStyle = `rgba(90,184,216,${0.25 + 0.15 * Math.sin(now / 700)})`; ctx.fillRect(WD.x - 36, WD.y + 54, 72, 4);
      text("員工以外禁止進入", WD.x, WD.y - 84, "#a8d8f0", 12, 900);
      // 館長室的門
      const OF = MAP.office; ctx.fillStyle = "#1a2a3a"; ctx.fillRect(OF.x - 50, OF.y - 70, 100, 120); ctx.strokeStyle = "#8ac8ff"; ctx.lineWidth = 3; ctx.strokeRect(OF.x - 50, OF.y - 70, 100, 120);
      ctx.fillStyle = `rgba(120,200,255,${0.3 + 0.2 * Math.sin(now / 800)})`; ctx.fillRect(OF.x - 46, OF.y + 44, 92, 4);
      text("館長室", OF.x, OF.y - 84, "#d8ecff", 14, 900);
      // 導覽圖、柱子
      const B = MAP.board; ctx.fillStyle = "#1a2a3a"; ctx.fillRect(B.x, B.y, B.w, B.h); ctx.strokeStyle = "#8ac8ff"; ctx.lineWidth = 2; ctx.strokeRect(B.x, B.y, B.w, B.h);
      text("館內導覽圖", B.x + B.w / 2, B.y + 30, "#d8ecff", 14, 900); text("（六個水缸）", B.x + B.w / 2, B.y + 52, "#8aa8c8", 11, 700);
      for (const p of MAP.pillars) { ctx.fillStyle = "#1a2838"; ctx.fillRect(p.x, p.y, p.w, p.h); ctx.strokeStyle = "rgba(140,200,255,.3)"; ctx.strokeRect(p.x, p.y, p.w, p.h); }
    }
    function draw(now) {
      // 聚光燈
      const sneak = K.is("AQ00618-03", "aqSneak");
      for (const s of MAP.spots) {
        const a = spotAng(s, now);
        const g = ctx.createRadialGradient(s.x, s.y, 20, s.x, s.y, SPOT_LEN); g.addColorStop(0, `rgba(255,240,200,${sneak ? 0.42 : 0.12})`); g.addColorStop(1, "rgba(255,240,200,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.arc(s.x, s.y, SPOT_LEN, a - SPOT_HALF, a + SPOT_HALF); ctx.closePath(); ctx.fill();
      }
      // 水缸裡的魚：在同一個缸裡＝人；在外面＝魚
      for (const f of fish) {
        if (seenAsFish(f.tank)) fishShape(f.x, f.y, 16, f.c, f.face, now, f.x, f.n);
        else K.human(f.x, f.y, f.c, f.ch, now, { k: f.x });
      }
      // 暖海的表演：柱子、餌、劊子手（在缸裡看是人；在缸外看是魚）
      if (showStage()) {
        const inside = inT === WARM;
        MAP.posts.forEach((p, i) => {
          ctx.fillStyle = "#5a4a3a"; ctx.fillRect(p.x - 5, p.y - 40, 10, 60);
          if (show.freed[i]) return;
          if (inside) { K.human(p.x, p.y - 8, "#6a8ab8", "人", now, { s: 24 }); ctx.strokeStyle = "#c8b890"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x - 14, p.y - 4); ctx.lineTo(p.x + 14, p.y - 12); ctx.stroke(); if (show.untie[i] > 0) K.bar(p.x, p.y + 20, 50, show.untie[i] / 1.5, "#7ad8ff"); }
          else fishShape(p.x, p.y - 8, 10, "#e8d8a8", 0, now, i);
        });
        if (show.on || inside) {
          const e = show.ex;
          if (inside) { K.human(e.x, e.y, "#c83a3a", "鯊", now, { s: 32, fill: "#fff0f0" }); ctx.fillStyle = "#c83a3a"; ctx.fillRect(e.x - 16, e.y - 6, 32, 8); ctx.strokeStyle = "#e8e8f0"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(e.x + 18, e.y - 10); ctx.lineTo(e.x + 30, e.y - 30); ctx.stroke(); }
          else fishShape(e.x, e.y, 26, "#8a9aa8", Math.atan2(MAP.posts[0].y - e.y, MAP.posts[0].x - e.x), now, 9, "大白鯊");
        }
      }
      // 館長的照片（AQ00618-06）
      if (K.is("AQ00618-06", "aqPhotos")) for (const ph of MAP.photos) if (!D.photos[ph.id]) {
        ctx.fillStyle = `rgba(200,230,255,${0.3 + 0.2 * Math.sin(now / 300)})`; ctx.beginPath(); ctx.arc(ph.x, ph.y, 26, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#e8e0c8"; ctx.fillRect(ph.x - 12, ph.y - 15, 24, 30); ctx.fillStyle = "#4a6a8a"; ctx.fillRect(ph.x - 9, ph.y - 12, 18, 18);
      }
      // 大廳裡的人：在大廳＝人；在水缸裡往外看＝大洋的生物
      for (const v of visitors) {
        if (inT) { fishShape(v.x, v.y, OSIZE[v.n] || 22, v.c, v.face, now, v.i, v.n); text(v.n, v.x, v.y + 34, "rgba(200,230,255,.8)", 11, 700); }
        else K.human(v.x, v.y, v.col, "人", now, { k: v.i, s: 24 });
      }
    }
    function drawNpc(n, now) {
      if (n.tank) {
        const T = TK.find((t) => t.id === n.tank);
        if (seenAsFish(T)) { fishShape(n.x, n.y, 20, n.color, 0, now, 1, n.species); return true; }
        return false;
      }
      if (n.noble && n.id !== "keeper" && !inT) {
        // 上層階級：體面的方塊（金色的邊、頭上一頂小小的冠）
        K.human(n.x, n.y, n.color, n.face, now, { s: 34, fill: "#fff8e8" });
        ctx.fillStyle = "#e8c050"; ctx.beginPath(); ctx.moveTo(n.x - 9, n.y - 17); ctx.lineTo(n.x - 9, n.y - 24); ctx.lineTo(n.x - 4, n.y - 20); ctx.lineTo(n.x, n.y - 25); ctx.lineTo(n.x + 4, n.y - 20); ctx.lineTo(n.x + 9, n.y - 24); ctx.lineTo(n.x + 9, n.y - 17); ctx.closePath(); ctx.fill();
        return true;
      }
      if (inT) { const o = n.ocean || (n.id === "keeper" ? { n: "虎鯨", c: "#1a1a22" } : n.id === "kid" ? { n: "沙丁魚", c: "#c8d8e8" } : { n: "魚", c: n.color }); fishShape(n.x, n.y, OSIZE[o.n] || 20, o.c, 0, now, 2, o.n); text(`（${o.n}）`, n.x, n.y + 36, "rgba(200,230,255,.85)", 11, 700); return true; }
      return false;
    }
    // 掠食者：在同一個缸裡看是人，在外面看是魚
    const PRED = { morays: [["海鰻", "#6a7a3a", "鰻"], 2], piranhas: [["食人魚", "#c84a3a", "食"], 3], seals: [["豹斑海豹", "#8a8a9a", "豹"], 2], anglers: [["鮟鱇", "#3a3a5a", "鮟"], 2] };
    function drawEnemy(e, now, red) {
      const P = PRED[e.kind]; if (!P) return false;
      const [[, col, ch], n] = P, T = tankOf(e.hx, e.hy);
      for (let i = 0; i < n; i++) {
        const x = e.x + (i - (n - 1) / 2) * 30, y = e.y + (i % 2) * 10;
        if (T && !seenAsFish(T)) K.human(x, y, "#c83a3a", ch, now, { k: i, fill: "#fff0f0" });
        else fishShape(x, y, e.kind === "seals" ? 22 : 15, col, e.face, now, i, { morays: "海鰻", piranhas: "食人魚", seals: "豹斑海豹", anglers: "鮟鱇" }[e.kind]);
      }
      if (red) { ctx.strokeStyle = "#e53935"; ctx.lineWidth = 3; ctx.strokeRect(e.x - 22 * n - 8, e.y - 30, 44 * n + 16, 60); }
      return true;
    }
    // 幽暗的燈光；在水缸裡時，玻璃外面像隔著一層水
    const dark = document.createElement("canvas");
    function drawTop(now) {
      const m = ctx.getTransform(), cw = ctx.canvas.width, ch = ctx.canvas.height;
      if (dark.width !== cw || dark.height !== ch) { dark.width = cw; dark.height = ch; }
      const d = dark.getContext("2d");
      d.globalCompositeOperation = "source-over"; d.clearRect(0, 0, cw, ch);
      d.fillStyle = "rgba(2,6,16,.66)"; d.fillRect(0, 0, cw, ch);
      d.globalCompositeOperation = "destination-out";
      const S = (x, y) => [m.a * x + m.e, m.d * y + m.f];
      const hole = (x, y, r, k = 1) => { const [sx, sy] = S(x, y), sr = r * m.a; if (sx < -sr || sy < -sr || sx > cw + sr || sy > ch + sr) return; const g = d.createRadialGradient(sx, sy, sr * 0.45, sx, sy, sr); g.addColorStop(0, `rgba(0,0,0,${k})`); g.addColorStop(1, "rgba(0,0,0,0)"); d.fillStyle = g; d.beginPath(); d.arc(sx, sy, sr, 0, Math.PI * 2); d.fill(); };
      hole(me.x, me.y, 320);
      for (const n of MAP.npcs) hole(n.x, n.y, 90, 0.8);                 // 人（和魚）身上都有一點光：大家都想被看見
      for (const v of visitors) hole(v.x, v.y, 60, 0.6);
      // 水缸自己會發光
      for (const t of TK) { const [sx, sy] = S(t.x, t.y); d.fillStyle = "rgba(0,0,0,.55)"; d.fillRect(sx, sy, t.w * m.a, t.h * m.d); }
      hole(MAP.showStage.x + MAP.showStage.w / 2, MAP.showStage.y + MAP.showStage.h / 2, 420, 0.6);
      hole(MAP.arrive.x, MAP.arrive.y, 200, 0.7);
      hole(MAP.salon.x + MAP.salon.w / 2, MAP.salon.y + MAP.salon.h / 2, 520, 0.75);          // 上流沙龍總是很亮
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(dark, 0, 0);
      if (inT) {
        // 玻璃外面：一層藍色的水、晃動的光
        const [tx, ty] = S(inT.x, inT.y), tw = inT.w * m.a, th = inT.h * m.d;
        ctx.fillStyle = `rgba(40,110,190,${0.22 + 0.04 * Math.sin(now / 900)})`;
        ctx.beginPath(); ctx.rect(0, 0, cw, ch); ctx.rect(tx, ty, tw, th); ctx.fill("evenodd");
        ctx.strokeStyle = "rgba(200,235,255,.5)"; ctx.lineWidth = 3; ctx.strokeRect(tx, ty, tw, th);
      }
      if (now < caughtUntil) { ctx.fillStyle = `rgba(255,240,200,${(caughtUntil - now) / 1200 * 0.6})`; ctx.fillRect(0, 0, cw, ch); }
      ctx.restore();
      // 夢一樣的字（偶爾浮出來）
      const k = Math.floor(now / 9000) % 4, a = Math.sin(((now % 9000) / 9000) * Math.PI);
      if (a > 0.05) text(["這裡很安靜。", "你在看誰？", "誰在看你？", "請不要拍打玻璃。"][k], me.x + 180, me.y - 140 - a * 20, `rgba(200,225,255,${a * 0.5})`, 16, 700);
    }
    function mini(dot, now) {
      const blink = 0.6 + 0.4 * Math.sin(now / 200);
      for (const t of TK) dot(t.x + t.w / 2, t.y + t.h / 2, 6, K.is("AQ00618-01", "aqStamps") && !D.stamps[t.id] ? `rgba(242,194,0,${blink})` : "rgba(90,170,255,.6)");
      if (K.is("AQ00618-03", "aqSneak")) dot(MAP.cage.x, MAP.cage.y, 5, `rgba(242,194,0,${blink})`);
      if (showStage()) for (const p of MAP.posts) dot(p.x, p.y, 4, `rgba(242,194,0,${blink})`);
      if (K.is("AQ00618-05", "aqNobles")) for (const n of nobles) if (!D.met[n.id]) dot(n.x, n.y, 4, `rgba(232,192,80,${blink})`);
      if (K.is("AQ00618-05", "aqList")) dot(MAP.listDesk.x, MAP.listDesk.y, 5, `rgba(242,194,0,${blink})`);
      if (K.is("AQ00618-06", "aqPhotos")) for (const ph of MAP.photos) if (!D.photos[ph.id]) dot(ph.x, ph.y, 4, `rgba(200,230,255,${blink})`);
      if (K.is("AQ00618-06", "aqOffice")) dot(MAP.office.x, MAP.office.y, 5, `rgba(242,194,0,${blink})`);
    }
    function speedMul() { return inT ? 0.8 : 1; }           // 在水裡走慢一點
    return { update, click, talk, stageText, drawFloor, draw, drawNpc, drawEnemy, drawTop, mini, speedMul, dbg: { D, visitors, fish, clickVisitor, tankOf, inSpot, openBoard, goTo: api.goTo, show, talk, takeList, takePhoto, openOffice, nobles } };
  };
})();
