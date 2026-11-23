/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/wp00716.js": "20261123215910" });
// #WP00716 多利島主題公園：停車場（傳送門）→ 入園廣場／員工通道／海灘步道 → 水上樂園
// 進水上樂園要有手環（這一趟有效）：售票口買、失物招領送、員工通道的置物櫃拿、或從海灘游過去時救生員給
//   入園廣場：閘門（沒有手環過不去）、售票口、失物招領（找防水手機袋）、紀念品店、度假村服務台（加購住宿、outlet）
//   員工通道：巡邏的保全（被看到＝被請回停車場；拿到員工證就不管你）、置物櫃（備用手環）、清潔阿姨（拿拖把換員工證）
//   海灘步道：潟湖要抱著泳圈才能下水（租一個，或幫小孩從海鷗嘴裡搶回薯條、他爸爸借你）、碼頭上的海灘入口（通到造浪池區）
//   停車場：找不到車的阿伯（車子靠近時會嗶嗶叫）
// 水上樂園很大：中央大道（更衣室、販賣部、醫護站）＋水池區、滑水道區、漂漂河區、造浪池區
//   委託人是樂園的志願者（經營的製藥公司不直接露面）；泳池恐怖分子只是別家廠商派來的人，不用打戰鬥
//   WP00716-01 遊客滿意度問卷（中央大道・小芮）：躺椅阿伯（水池區）、漂漂河上睡著的大姐（下水漂過去）、高中生阿哲（滑水道區，陪他比一場）、
//              兒童池邊的媽媽（水池區；先去造浪池區淺水區撈蛙鏡）、排隊的上班族（中央大道，幫他排隊）
//   WP00716-02 泳池恐怖分子（水池區・阿淨）：四個區域的池子驗水 → 試紙變黃的池子裡找出「不太對勁」的泳客 → 他逃跑，追上他（碰到或潑兩下）
//   WP00716-03 滑水道的試滑員（滑水道區・海哥）：三條滑水道（js/race.js 的滑水道版）都在時間內滑到底；滑完會從出口噴進落水池
//   勇闖大浪（造浪池區）：深水區的塑膠尼斯水怪捲起大浪，被浪打到會像被推開一樣滑回去；從缺口鑽過去游到水怪面前＝獎品
//   水槍大戰（水池區）：搶旗子的小遊戲（js/watergun.js；現在是單機版，之後接 PeerJS 連線）
//   更衣室（中央大道）：換上泳裝（之後有立繪時換泳裝立繪）
// 二階段（準備中）：一階段的委託都完成、而且加購了住宿和 outlet，才會開始調查地下的藥物實驗廠（戰鬥留給藥物實驗體）
(function () {
  const R = (window.RPG = window.RPG || {});
  R.WorldHooks = R.WorldHooks || {};
  const PRICE = { band: 150, float: 60, hotel: 600, outlet: 400 };
  const PHASE1 = ["WP00716-01", "WP00716-02", "WP00716-03"];
  // 滑水道（js/race.js：theme "slide"）
  const SLIDES = {
    rainbow: { name: "彩虹滑水道", tube: "#e84a8a", lanes: 3, speed: 330, hazards: { bubble: 0.45 },
      course: [{ len: 500 }, { ang: 90, r: 260 }, { len: 400 }, { ang: -90, r: 260 }, { len: 400 }, { ang: 90, r: 260 }, { len: 500 }], slack: 1.18, desc: "三個大彎，最適合第一次滑" },
    black: { name: "黑洞滑水道", tube: "#2a1a4a", lanes: 3, speed: 340, dark: true, hazards: { bubble: 0.3 },
      course: [{ len: 300 }, { ang: 180, r: 240 }, { len: 250 }, { ang: -180, r: 240 }, { len: 300 }, { ang: 120, r: 220 }, { len: 400 }], slack: 1.22, desc: "全黑的管子，只看得到身邊；兩個迴轉的大彎" },
    funnel: { name: "大喇叭", tube: "#ffd23a", lanes: 5, speed: 360, hazards: { bubble: 0.25 },
      course: [{ len: 600 }, { ang: -120, r: 300 }, { len: 300 }, { ang: 120, r: 300 }, { len: 300 }, { ang: -90, r: 280 }, { len: 700 }], slack: 1.16, desc: "最寬的一條，漂著最多充氣小鴨" },
  };
  const slideGoal = (S) => Math.round((R.Race.build(S.course).L / S.speed) * S.slack * 10) / 10 + 1;

  R.WorldHooks.WP00716 = function (api) {
    const { MAP, trip, run, me, CM, BAG, toast, text, save, openPanel, closePanel, dist, esc, inRect } = api;
    const ctx = api.ctx(), K = R.BKit(api), SC = MAP.wpScene;
    const D = K.q("wp");
    D.down = D.down || {};
    const Q1 = K.q("WP00716-01"); Q1.got = Q1.got || {};
    const Q2 = K.q("WP00716-02"); Q2.tested = Q2.tested || {};
    const Q3 = K.q("WP00716-03"); Q3.slides = Q3.slides || {};
    const NARR = { name: "多利島主題公園", color: "#2aa8c8", face: "島" };
    const npcOf = (id) => MAP.npcs.find((n) => n.id === id) || { name: id, color: "#5a6a7a" };
    const hasFloat = () => BAG.count(run.items, "wpFloat") > 0;
    const doneAll = () => { const a = R.Adventure.get()?.done || []; return PHASE1.every((id) => trip.done.includes(id) || a.includes(id)); };
    const pay = (n) => { if (run.gold < n) { toast(`金幣不夠（要 ${n}）`); return false; } run.gold -= n; save(); api.renderHud(); return true; };
    const human = (x, y, col, ch, now, o) => K.human(x, y, col, ch, now, o);
    const sparkle = (x, y, now, col = "#fff") => { for (let i = 0; i < 4; i++) { const a = now / 300 + i * 1.57, r = 10 + Math.sin(now / 200 + i) * 3; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 2.5, 0, Math.PI * 2); ctx.fill(); } };

    // ===== 場景之間的出入口 =====
    let leaving = false;
    function exitTo(e) {
      if (leaving || api.isBusy()) return;
      leaving = true;
      const target = e.to ? R.MAPS[`WP00716/${e.to}`] : R.MAPS.WP00716;
      // 從海灘游進水上樂園：救生員給一條手環
      if (SC === "beach" && e.to === "wave" && !D.band) { D.band = true; D.bandWhy = "beach"; }
      save();
      api.changeScene(e.to, target.from[SC] || target.arrive, e.label);
    }
    function exitsUpdate() { for (const e of MAP.exits) if (inRect(e, me.x, me.y)) return exitTo(e); }
    function exitsClick(p) {
      const e = MAP.exits.find((x) => inRect({ x: x.x - 30, y: x.y - 30, w: x.w + 60, h: x.h + 60 }, p.x, p.y));
      if (!e) return false;
      api.goTo({ x: e.x + e.w / 2, y: e.y + e.h / 2 }, { type: "hook", reach: 10, fn: () => exitTo(e) });
      return true;
    }
    function drawExits(now) {
      for (const e of MAP.exits) {
        const cx = e.x + e.w / 2, cy = e.y + e.h / 2, k = 0.5 + 0.3 * Math.sin(now / 300);
        ctx.fillStyle = `rgba(255,210,58,${0.25 + 0.15 * k})`; ctx.fillRect(e.x, e.y, e.w, e.h);
        ctx.strokeStyle = "#c8a040"; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.strokeRect(e.x, e.y, e.w, e.h); ctx.setLineDash([]);
        const lx = Math.min(MAP.w - 90, Math.max(90, cx + (e.w < 80 ? (e.x < 100 ? 70 : -70) : 0))), ly = Math.min(MAP.h - 30, Math.max(30, cy + (e.h < 80 ? (e.y < 100 ? 50 : -50) : 0)));
        ctx.fillStyle = "rgba(29,29,31,.75)"; api.rr(lx - 74, ly - 16, 148, 32, 8); ctx.fill();
        text(`${e.arrow} ${e.label}`, lx, ly, "#ffd23a", 14, 900);
      }
    }
    // 地板的小工具
    const tiles = (x, y, w, h, c1, c2, step = 60) => { ctx.fillStyle = c1; ctx.fillRect(x, y, w, h); ctx.strokeStyle = c2; ctx.lineWidth = 2; ctx.beginPath(); for (let i = x; i <= x + w; i += step) { ctx.moveTo(i, y); ctx.lineTo(i, y + h); } for (let j = y; j <= y + h; j += step) { ctx.moveTo(x, j); ctx.lineTo(x + w, j); } ctx.stroke(); };
    const water = (r, now, deep) => {
      ctx.fillStyle = deep ? "#2a8ad8" : "#5ac8f0"; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 2;
      for (let j = r.y + 30; j < r.y + r.h; j += 50) { ctx.beginPath(); for (let i = r.x; i <= r.x + r.w; i += 20) { const yy = j + Math.sin(now / 500 + i / 40 + j) * 4; i === r.x ? ctx.moveTo(i, yy) : ctx.lineTo(i, yy); } ctx.stroke(); }
    };
    const palm = (x, y, now) => { ctx.fillStyle = "#8a6a3a"; ctx.fillRect(x - 4, y - 4, 8, 8); ctx.fillStyle = "#3d9a5b"; for (let i = 0; i < 6; i++) { const a = i * 1.05 + Math.sin(now / 900) * 0.08; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 16, y + Math.sin(a) * 16, 18, 6, a, 0, Math.PI * 2); ctx.fill(); } };
    const umbrella = (x, y, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 34, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 34, y + Math.sin(a) * 34); ctx.stroke(); } };
    const sign = (x, y, t, bg = "#2aa8c8") => { ctx.font = "900 14px sans-serif"; const w = ctx.measureText(t).width + 20; ctx.fillStyle = bg; api.rr(x - w / 2, y - 14, w, 28, 6); ctx.fill(); text(t, x, y, "#fff", 14, 900); };

    // ===== 委託的進度文字 =====
    function stageText(id, st) {
      const NAME = { parking: "停車場", plaza: "入園廣場", staff: "員工通道", beach: "海灘步道", park: "中央大道", wave: "造浪池區", river: "漂漂河區", slide: "滑水道區", pool: "水池區" };
      const inPark = ["park", "wave", "river", "slide", "pool"].includes(SC);
      if ((st?.type === "talk" || st?.type === "report") && st.scene && st.scene !== SC) return `${st.text}（你現在在${NAME[SC]}${inPark ? "" : "；先想辦法進水上樂園"}）`;
      if (st?.type === "wpChase" && Q2.flee) return `${st.text}（在${NAME[POOL_SCENE[Q2.flee.pid]]}）`;
      if (st?.type === "wpSurvey") return `${st.text}（${Object.keys(Q1.got).length} / ${st.need}）`;
      if (st?.type === "wpSample") return `${st.text}（${Object.keys(Q2.tested).length} / ${st.need}）`;
      if (st?.type === "wpSlides") return `${st.text}（${Object.keys(Q3.slides).length} / ${st.need}）`;
      return null;
    }

    // ================= 停車場 =================
    function parking() {
      // 找不到車的阿伯：他的車靠近時會嗶嗶叫
      const carOf = () => MAP.cars.find((c) => c.id === D.carId);
      function talk(n) {
        if (n.id !== "wpDriver") return false;
        K.reach(n, 100, () => {
          if (D.carDone) return api.dlg("停車場", n, "找到了找到了！原來是綠色的。……我從來沒買過綠色的車啊？算了，能開就好。", "");
          if (D.carId) return api.dlg("停車場", n, "我按了遙控器，車子應該會嗶嗶叫……你走到它旁邊就聽得到了。", "", "在車子之間走走看，靠近他的車時會聽到嗶嗶聲");
          api.dlg("停車場", n, "年輕人，幫個忙。我的車找不到了。我只記得按遙控器它會嗶嗶叫……可是我耳朵不好。", `<button type="button" class="primary" data-act="wpDriver">幫他找車</button><button type="button" class="ghost" data-close>不了</button>`);
        });
        return true;
      }
      function act(a) {
        if (a === "wpDriver") { const pool = MAP.cars.filter((c) => Math.abs(c.x - 1200) > 300); D.carId = pool[Math.floor(Math.random() * pool.length)].id; save(); closePanel(); toast("阿伯按下了遙控器。走到他的車旁邊，就會聽到嗶嗶聲"); return true; }
        return false;
      }
      function click(p) {
        const c = carOf();
        if (c && !D.carDone && inRect({ x: c.x - 44, y: c.y - 70, w: 88, h: 140 }, p.x, p.y)) {
          K.reach({ x: c.x, y: c.y + 80 }, 110, () => {
            D.carDone = true; run.gold += 60; save(); api.renderHud();
            api.dlg("停車場", npcOf("wpDriver"), "嗶嗶！就是這台！謝謝你啊年輕人，這點小錢拿去買冰淇淋。", "", "得到 60 金幣");
          });
          return true;
        }
        return false;
      }
      function drawFloor(now) {
        tiles(0, 0, MAP.w, MAP.h, "#6a6e76", "rgba(255,255,255,.04)", 120);
        // 車格線
        ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 3;
        for (const c of MAP.cars) { ctx.strokeRect(c.x - 50, c.y - 72, 100, 144); }
        // 中間的走道（往北）
        ctx.fillStyle = "rgba(255,210,58,.5)"; for (let y = 120; y < 1150; y += 60) ctx.fillRect(1192, y, 16, 30);
        // 接駁車站
        const s = MAP.shuttle; ctx.fillStyle = "#c8ccd2"; ctx.fillRect(s.x - 120, s.y - 30, 240, 60); ctx.fillStyle = "#2aa8c8"; ctx.fillRect(s.x - 120, s.y - 40, 240, 12);
        sign(s.x, s.y - 60, "度假村接駁車（住宿的客人）", "#c8a040");
        sign(1200, 1420, "多利島主題公園・遊客停車場");
      }
      function draw(now) {
        const c = carOf(), near = c && !D.carDone && dist(me.x, me.y, c.x, c.y) < 200;
        for (const k of MAP.cars) {
          ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.fillRect(k.x - 32, k.y - 52, 68, 116);
          api.rr(k.x - 34, k.y - 58, 68, 116, 14); ctx.fillStyle = k.color; ctx.fill(); ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = "rgba(150,210,240,.85)"; ctx.fillRect(k.x - 26, k.y - 40, 52, 22); ctx.fillRect(k.x - 26, k.y + 22, 52, 16);
          if (k === c && near) {
            const on = Math.floor(now / 250) % 2;
            if (on) { ctx.fillStyle = "rgba(255,230,120,.9)"; ctx.beginPath(); ctx.arc(k.x - 22, k.y - 60, 8, 0, Math.PI * 2); ctx.arc(k.x + 22, k.y - 60, 8, 0, Math.PI * 2); ctx.fill(); }
            text("嗶嗶！", k.x, k.y - 86 - (on ? 4 : 0), "#e84a4a", 16, 900);
          }
        }
        if (c && !D.carDone && !near && dist(me.x, me.y, c.x, c.y) < 420 && Math.floor(now / 500) % 3 === 0) text("（遠遠的，好像有嗶嗶聲……）", me.x, me.y - 50, "#ffd23a", 12, 900);
      }
      return { talk, act, click, drawFloor, draw };
    }

    // ================= 入園廣場 =================
    function plaza() {
      const G = MAP.gate;
      const blocked = (x, y, h) => {
        if (!D.band && x + h > G.x && x - h < G.x + G.w && y + h > G.y && y - h < G.y + G.h) return true;
        const f = MAP.fountain; return dist(x, y, f.x, f.y) < f.r + h * 0.8;
      };
      function talk(n) {
        if (n.id === "wpTicket") { K.reach({ x: n.x, y: n.y + 70 }, 110, ticket); return true; }
        if (n.id === "wpLost") { K.reach(n, 100, () => lost(n)); return true; }
        if (n.id === "wpResort") { K.reach({ x: n.x, y: n.y + 70 }, 110, resort); return true; }
        return false;
      }
      function ticket() {
        const n = npcOf("wpTicket");
        if (D.band) return api.dlg("售票口", n, "您已經戴著手環了！閘門會自動打開，祝您玩得愉快～", "");
        api.dlg("售票口", n, `一日券，一位 ${PRICE.band} 金幣。手環戴好，閘門才會開喔。`,
          `<button type="button" class="primary" data-act="wpBand" ${run.gold < PRICE.band ? "disabled" : ""}>買一日券（${PRICE.band} 金幣）</button><button type="button" class="ghost" data-close>再想想</button>`,
          `你有 ${run.gold} 金幣。錢不夠的話，也可以想想別的辦法進去`);
      }
      function lost(n) {
        if (D.pouchDone) return api.dlg("失物招領", n, "那位小姐領走手機袋的時候哭了。手機裡有她和她過世的狗的照片。謝謝你。", "");
        if (BAG.count(run.items, "wpPouch")) {
          BAG.remove(run.items, "wpPouch", 1); D.pouchDone = true;
          let note = "";
          if (!D.band) { D.band = true; note = "得到一條入園手環（閘門會打開了）"; } else { run.gold += 80; note = "得到 80 金幣"; }
          save(); api.renderHud(); api.resetPaths?.();
          return api.dlg("失物招領", n, D.band && note.includes("手環") ? "找到了！這是那位小姐的。……你還沒有入園手環？這條是之前有人掉的，沒人來領。拿去吧，我不會說出去的。" : "找到了！這是那位小姐的。謝謝你，這點心意你收下。", "", note);
        }
        if (D.pouchSpot != null) return api.dlg("失物招領", n, "藍色的防水手機袋，裡面的手機還在震動。她說可能掉在廣場的某個地方。", "", "在廣場上走走看，靠近時會看到閃光");
        api.dlg("失物招領", n, "有位小姐的防水手機袋掉在廣場上了，藍色的。我走不開——你能幫忙找找嗎？", `<button type="button" class="primary" data-act="wpLost">幫忙找</button><button type="button" class="ghost" data-close>不了</button>`);
      }
      function resort() {
        const n = npcOf("wpResort"), hotel = api.hasFlag("wpHotel"), outlet = api.hasFlag("wpOutlet");
        const row = (id, name, price, own, desc) => `<div class="wx-qrow"><b>${name}</b><span>${desc}</span>${own ? `<span class="ok">已加購</span>` : `<button type="button" class="primary" data-act="${id}" ${run.gold < price ? "disabled" : ""}>加購（${price} 金幣）</button>`}</div>`;
        const both = hotel && outlet, p1 = doneAll();
        api.dlg("度假村服務台", n,
          both ? (p1 ? "住宿和 outlet 都幫您登記好了。今晚請在度假村好好休息——（二階段準備中）" : "住宿和 outlet 都幫您登記好了。等您在樂園裡的事情忙完，接駁車會載您去度假村。") : "多利島度假村，住宿和 outlet 的加購都在這裡辦理。加購之後，可以在島上待得更久一點喔。",
          row("wpHotel", "度假村住宿", PRICE.hotel, hotel, "海景房，附早餐") + row("wpOutlet", "多利島 outlet", PRICE.outlet, outlet, "島上唯一的購物中心"),
          `你有 ${run.gold} 金幣。水上樂園的委託都完成、而且兩個都加購了，才會進入二階段`);
      }
      function act(a) {
        if (a === "wpBand") { if (!D.band && pay(PRICE.band)) { D.band = true; save(); api.resetPaths?.(); closePanel(); toast("戴上了入園手環。閘門打開了！"); } return true; }
        if (a === "wpLost") { D.pouchSpot = Math.floor(Math.random() * MAP.pouchSpots.length); save(); closePanel(); toast("在廣場上找找藍色的防水手機袋。靠近時會看到閃光"); return true; }
        if (a === "wpHotel" || a === "wpOutlet") { const k = a === "wpHotel" ? "hotel" : "outlet"; if (!api.hasFlag(a) && pay(PRICE[k])) { api.setFlag(a); toast(k === "hotel" ? "加購了度假村住宿" : "加購了 outlet"); resort(); } return true; }
        return false;
      }
      function click(p) {
        const ps = D.pouchSpot != null && !D.pouchDone && !BAG.count(run.items, "wpPouch") ? MAP.pouchSpots[D.pouchSpot] : null;
        if (ps && dist(p.x, p.y, ps.x, ps.y) < 40 && dist(me.x, me.y, ps.x, ps.y) < 260) {
          K.reach(ps, 70, () => { BAG.add(run.items, "wpPouch", 1); save(); toast(`在${ps.t}找到了藍色的防水手機袋！拿去失物招領`); });
          return true;
        }
        return false;
      }
      function drawFloor(now) {
        tiles(0, 0, MAP.w, MAP.h, "#f2ead8", "rgba(200,170,120,.25)", 80);
        tiles(40, 40, MAP.w - 80, 250, "#bfe6f2", "rgba(255,255,255,.4)", 50);                // 閘門裡面（樂園的入口大道）
        const f = MAP.fountain;
        ctx.fillStyle = "#c8ccd2"; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#5ac8f0"; ctx.beginPath(); ctx.arc(f.x, f.y, f.r - 14, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 8; i++) { const a = i * 0.785 + now / 1500, r = 30 + ((now / 10 + i * 20) % 50); ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r, 4, 0, Math.PI * 2); ctx.fill(); }
        // 塑膠尼斯水怪的雕像（噴水池中間）
        ctx.fillStyle = "#3ab86a"; ctx.beginPath(); ctx.ellipse(f.x, f.y + 6, 26, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(f.x + 10, f.y - 40, 10, 44); ctx.beginPath(); ctx.ellipse(f.x + 22, f.y - 42, 14, 8, 0, 0, Math.PI * 2); ctx.fill();
        // 花圃、長椅、垃圾桶、置物櫃
        ctx.fillStyle = "#3d9a5b"; ctx.fillRect(560, 1180, 180, 70); ctx.fillStyle = "#e84a8a"; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(575 + i * 19, 1200 + (i % 2) * 28, 5, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = "#a07850"; ctx.fillRect(270, 610, 130, 26);
        ctx.fillStyle = "#5a6a7a"; ctx.fillRect(1400, 1170, 40, 46);
        for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? "#3a8ad8" : "#5ac8f0"; ctx.fillRect(1700 + i * 34, 380, 30, 56); }
        sign(1800, 360, "置物櫃");
        // 售票口
        ctx.fillStyle = "#3ab86a"; ctx.fillRect(510, 380, 180, 70); ctx.fillStyle = "#fff"; ctx.fillRect(530, 395, 140, 30); text("售票口", 600, 410, "#3ab86a", 15, 900);
        // 度假村服務台
        ctx.fillStyle = "#c8a040"; ctx.fillRect(1520, 940, 260, 60); text("度假村服務台・住宿／outlet", 1650, 970, "#fff", 13, 900);
        sign(1000, 1340, "↓ 停車場");
      }
      function draw(now) {
        // 閘門（有手環就打開）
        const L = MAP.gateLine;
        ctx.fillStyle = "#9aa0aa"; ctx.fillRect(40, L.y, 900, L.h); ctx.fillRect(1100, L.y, 860, L.h);
        for (let x = 60; x < 940; x += 60) { ctx.fillStyle = "#c8ccd2"; ctx.fillRect(x, L.y - 6, 8, L.h + 12); }
        for (let x = 1120; x < 1960; x += 60) { ctx.fillStyle = "#c8ccd2"; ctx.fillRect(x, L.y - 6, 8, L.h + 12); }
        ctx.fillStyle = D.band ? "#3ab86a" : "#e84a4a";
        if (D.band) { ctx.fillRect(G.x, G.y + 10, 12, G.h - 20); ctx.fillRect(G.x + G.w - 12, G.y + 10, 12, G.h - 20); }
        else ctx.fillRect(G.x, G.y + G.h / 2 - 6, G.w, 12);
        text(D.band ? "手環感應：通過" : "請感應入園手環", G.x + G.w / 2, G.y - 18, D.band ? "#3ab86a" : "#e84a4a", 13, 900);
        // 掉在廣場上的手機袋（靠近才看得到）
        const ps = D.pouchSpot != null && !D.pouchDone && !BAG.count(run.items, "wpPouch") ? MAP.pouchSpots[D.pouchSpot] : null;
        if (ps && dist(me.x, me.y, ps.x, ps.y) < 260) { ctx.fillStyle = "#3a8ad8"; api.rr(ps.x - 9, ps.y - 13, 18, 26, 4); ctx.fill(); sparkle(ps.x, ps.y, now, "#bfe8ff"); }
      }
      function mini(dot, now) { if (!D.band) dot(G.x + G.w / 2, G.y + G.h / 2, 4, "#e84a4a"); }
      return { blocked, talk, act, click, drawFloor, draw, mini };
    }

    // ================= 員工通道 =================
    function staff() {
      const guards = MAP.guards.filter((g) => !D.down[g.id]).map((g) => ({ ...g, i: 0, x: g.path[0].x, y: g.path[0].y, face: 0, spot: 0 }));
      const solidAt = (x, y) => MAP.solids.some((r) => inRect(r, x, y));
      const sees = (g) => {
        const d = dist(g.x, g.y, me.x, me.y); if (d > 230) return false;
        let da = Math.abs(Math.atan2(me.y - g.y, me.x - g.x) - g.face) % (Math.PI * 2); if (da > Math.PI) da = Math.PI * 2 - da;
        if (da > 0.56) return false;
        for (let k = 20; k < d; k += 20) if (solidAt(g.x + ((me.x - g.x) * k) / d, g.y + ((me.y - g.y) * k) / d)) return false;
        return true;
      };
      let caught = false;
      function update(dt) {
        for (const g of guards) {
          if (g.spot > 0) { g.spot += dt; if (g.spot > 0.8 && !caught) { caught = true; save(); api.changeScene(null, R.MAPS.WP00716.from.staff, "被保全請回停車場"); } continue; }
          const tgt = g.path[(g.i + 1) % g.path.length], dx = tgt.x - g.x, dy = tgt.y - g.y, d = Math.hypot(dx, dy);
          if (d < 4) g.i = (g.i + 1) % g.path.length;
          else { g.face = Math.atan2(dy, dx); g.x += (dx / d) * g.speed * dt; g.y += (dy / d) * g.speed * dt; }
          if (!D.pass && !api.isBusy() && sees(g)) { g.spot = 0.01; g.face = Math.atan2(me.y - g.y, me.x - g.x); toast("保全：「喂！那邊那個！這裡是員工通道！請你出去！」"); }
        }
      }
      function talk(n) {
        if (n.id !== "wpCleaner") return false;
        K.reach(n, 100, () => {
          if (D.pass) return api.dlg("員工通道", n, "員工證戴好，保全就不會管你了。……你是哪個部門的？算了，不要告訴我。", "");
          if (D.mop) { D.pass = true; save(); return api.dlg("員工通道", n, "就是這支！謝謝你。這張員工證你拿去用吧——上個月離職的工讀生留下來的。戴著它，保全就不會攔你。", "", "得到一張員工證：這一趟員工通道的保全不會再管你"); }
          if (D.cleaner) return api.dlg("員工通道", n, "拖把在倉庫裡，上面那排房間中間那間。小心保全，他們最近很神經質。", "");
          api.dlg("員工通道", n, "唉，我的拖把被鎖在倉庫裡了，保全又不讓我進去拿。你……你看起來不像會被抓的人。幫我拿出來好不好？", `<button type="button" class="primary" data-act="wpCleaner">幫她拿拖把</button><button type="button" class="ghost" data-close>不了</button>`);
        });
        return true;
      }
      function act(a) {
        if (a === "wpCleaner") { D.cleaner = true; save(); closePanel(); toast("拖把在上排中間的倉庫裡"); return true; }
        return false;
      }
      function click(p) {
        const L = MAP.lockers, M = MAP.mop;
        if (dist(p.x, p.y, L.x, L.y) < 70) {
          K.reach({ x: L.x, y: L.y + 90 }, 110, () => {
            if (D.band) return toast("置物櫃裡只剩一條濕毛巾");
            D.band = true; save(); toast("備用的置物櫃裡有一條沒人用的入園手環！（這一趟進出閘門都沒問題了）");
          });
          return true;
        }
        if (D.cleaner && !D.mop && dist(p.x, p.y, M.x, M.y) < 60) {
          K.reach({ x: M.x, y: M.y + 70 }, 100, () => { D.mop = true; save(); toast("拿到了清潔阿姨的拖把"); });
          return true;
        }
        return false;
      }
      function drawFloor(now) {
        tiles(0, 0, MAP.w, MAP.h, "#c8ccd2", "rgba(90,100,110,.18)", 60);
        // 管線
        ctx.strokeStyle = "#8a9098"; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(40, 960); ctx.lineTo(2160, 960); ctx.stroke();
        ctx.strokeStyle = "#5a8aa8"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(40, 980); ctx.lineTo(2160, 980); ctx.stroke();
        // 機房
        const Mc = MAP.machine; ctx.fillStyle = "#9aa0aa"; ctx.fillRect(Mc.x, Mc.y, Mc.w, Mc.h);
        for (let i = 0; i < 4; i++) { const x = Mc.x + 60 + i * 130; ctx.fillStyle = "#5a6a7a"; ctx.fillRect(x, Mc.y + 40, 90, 120); ctx.fillStyle = Math.floor(now / 400 + i) % 2 ? "#3ab86a" : "#1d5a3a"; ctx.fillRect(x + 10, Mc.y + 50, 12, 12); }
        sign(Mc.x + Mc.w / 2, Mc.y - 20, "機房・過濾設備（閒人勿進）", "#5a6a7a");
        // 置物間、倉庫
        sign(600, 60, "置物間"); sign(1230, 60, "倉庫");
        for (let i = 0; i < 7; i++) { ctx.fillStyle = i % 2 ? "#7a8a9a" : "#8a9aaa"; ctx.fillRect(360 + i * 60, 90, 54, 110); ctx.fillStyle = "#1d1d1f"; ctx.fillRect(400 + i * 60, 140, 4, 12); }
        // 地下室的門（關著；二階段）
        ctx.fillStyle = "#3a3a42"; ctx.fillRect(1900, 1120, 120, 100); ctx.strokeStyle = "#e84a4a"; ctx.lineWidth = 3; ctx.strokeRect(1900, 1120, 120, 100);
        text("B1・關係者以外立入禁止", 1960, 1100, "#e84a4a", 11, 900);
      }
      function draw(now) {
        // 貨箱
        for (const r of MAP.solids.slice(-4)) { ctx.fillStyle = "#c8a070"; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.strokeStyle = "#7a5a3a"; ctx.lineWidth = 3; ctx.strokeRect(r.x, r.y, r.w, r.h); ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + r.w, r.y + r.h); ctx.stroke(); }
        for (const r of MAP.solids.slice(0, -4)) { ctx.fillStyle = "#5a6068"; ctx.fillRect(r.x, r.y, r.w, r.h); }
        // 拖把
        if (D.cleaner && !D.mop) { const M = MAP.mop; ctx.strokeStyle = "#8a6a3a"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(M.x - 20, M.y + 20); ctx.lineTo(M.x + 20, M.y - 30); ctx.stroke(); ctx.fillStyle = "#e8e4da"; ctx.beginPath(); ctx.ellipse(M.x - 22, M.y + 24, 16, 8, -0.6, 0, Math.PI * 2); ctx.fill(); api.marker(M.x, M.y + 30, now, "#ffd23a"); }
        if (!D.band) sparkle(MAP.lockers.x + 120, MAP.lockers.y + 40, now, "#ffd23a");
        // 保全：視線（扇形）
        for (const g of guards) {
          if (!D.pass) {
            ctx.fillStyle = g.spot ? "rgba(232,74,74,.35)" : "rgba(255,230,120,.22)";
            ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.arc(g.x, g.y, 230, g.face - 0.56, g.face + 0.56); ctx.closePath(); ctx.fill();
          }
          human(g.x, g.y, "#2a3a5a", "保", now, { k: g.x });
          if (g.spot) text("！", g.x, g.y - 34, "#e84a4a", 22, 900);
        }
      }
      function mini(dot) { for (const g of guards) dot(g.x, g.y, 3, D.pass ? "#9aa0aa" : "#e84a4a"); }
      return { update, talk, act, click, drawFloor, draw, mini };
    }

    // ================= 海灘步道 =================
    function beach() {
      const L = MAP.lagoon, PI = MAP.pier;
      const inLagoon = (x, y) => inRect(L, x, y) && !inRect(PI, x, y);
      const blocked = (x, y, h) => !hasFloat() && (inLagoon(x - h, y - h) || inLagoon(x + h, y - h) || inLagoon(x - h, y + h) || inLagoon(x + h, y + h));
      // 搶薯條的海鷗：在沙灘上空繞圈，偶爾停在地上；普攻打到或撞到停著的牠，薯條就會掉下來
      const gull = { x: 1000, y: 900, t: 0, land: 0, a: 0 };
      let fries = null;                                  // 掉在地上的薯條
      function update(dt, now) {
        if (D.kid !== "hunt" || D.fries) return;
        gull.t += dt;
        if (gull.land > 0) { gull.land -= dt; if (gull.land <= 0) gull.t = 0; }
        else {
          gull.a += dt * 0.9; gull.x = 900 + Math.cos(gull.a) * 380; gull.y = 960 + Math.sin(gull.a * 1.3) * 200;
          if (gull.t > 4) gull.land = 2.6;
        }
        if (gull.land > 0 && dist(me.x, me.y, gull.x, gull.y) < 40) dropFries();
        if (fries && dist(me.x, me.y, fries.x, fries.y) < 36) { fries = null; D.fries = true; BAG.add(run.items, "wpFries", 1); save(); toast("撿回了薯條！拿去給哭哭的小孩"); }
      }
      function dropFries() { if (fries || D.fries) return; fries = { x: gull.x, y: gull.y + 20 }; gull.land = 0; gull.a += 2; toast("海鷗嚇得把薯條丟下來了！"); }
      function basicHit(test) { if (D.kid === "hunt" && !D.fries && !fries && test(gull.x, gull.y, 20)) dropFries(); }
      function talk(n) {
        if (n.id === "wpRental") { K.reach(n, 100, () => {
          if (hasFloat()) return api.dlg("泳圈出租", n, "抱緊它！潟湖的水很平，游到碼頭就是水上樂園的海灘入口了。", "");
          api.dlg("泳圈出租", n, `火鶴、甜甜圈、獨角獸，什麼造型都有。租一個 ${PRICE.float} 金幣，抱著就能游過潟湖。`,
            `<button type="button" class="primary" data-act="wpRent" ${run.gold < PRICE.float ? "disabled" : ""}>租一個（${PRICE.float} 金幣）</button><button type="button" class="ghost" data-close>再想想</button>`, `你有 ${run.gold} 金幣`);
        }); return true; }
        if (n.id === "wpKid") { K.reach(n, 100, () => kid(n)); return true; }
        return false;
      }
      function kid(n) {
        if (D.kidDone) return api.dlg("海灘步道", n, "（小孩一邊吃薯條一邊跟你揮手。）", "");
        if (BAG.count(run.items, "wpFries")) {
          BAG.remove(run.items, "wpFries", 1); D.kidDone = true;
          const dad = { name: "小孩的爸爸", color: "#3a6a8a", face: "爸" };
          let note;
          if (!hasFloat()) { BAG.add(run.items, "wpFloat", 1); note = "借到了一個造型泳圈（可以游過潟湖了）"; } else { run.gold += 60; note = "得到 60 金幣"; }
          save(); api.renderHud(); api.resetPaths?.();
          return api.dlg("海灘步道", dad, note.includes("泳圈") ? "謝謝你幫我兒子搶回薯條！你要去水上樂園？這個泳圈借你，從潟湖游過去比走正門快多了。" : "謝謝你幫我兒子搶回薯條！這點小意思，拿去買飲料。", "", note);
        }
        if (D.kid === "hunt") return api.dlg("海灘步道", n, "那隻海鷗！牠還在飛！牠停下來的時候抓牠！", "", "海鷗停在地上的時候撞過去，或用攻擊模式打牠");
        api.dlg("海灘步道", n, "嗚嗚……海鷗……把我的薯條搶走了……", `<button type="button" class="primary" data-act="wpKid">幫他搶回來</button><button type="button" class="ghost" data-close>摸摸頭</button>`);
      }
      function act(a) {
        if (a === "wpRent") { if (!hasFloat() && pay(PRICE.float)) { BAG.add(run.items, "wpFloat", 1); save(); api.resetPaths?.(); closePanel(); toast("租了一個火鶴泳圈。可以游過潟湖了！"); } return true; }
        if (a === "wpKid") { D.kid = "hunt"; save(); closePanel(); toast("海鷗停在地上的時候撞過去，或用攻擊模式打牠"); return true; }
        return false;
      }
      const speedMul = () => (inLagoon(me.x, me.y) ? 0.7 : 1);
      function drawFloor(now) {
        ctx.fillStyle = "#f2dca8"; ctx.fillRect(0, 0, MAP.w, MAP.h);
        for (let i = 0; i < 60; i++) { ctx.fillStyle = "rgba(200,170,110,.5)"; ctx.fillRect((i * 397) % MAP.w, 700 + ((i * 211) % 680), 4, 4); }
        water(L, now, false);
        // 浪花（潟湖的岸邊）
        ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(L.x, L.y + L.h); ctx.lineTo(L.x + L.w, L.y + L.h); ctx.moveTo(L.x, L.y); ctx.lineTo(L.x, L.y + L.h); ctx.stroke();
        // 碼頭（木板）
        ctx.fillStyle = "#b8865a"; ctx.fillRect(PI.x, PI.y, PI.w, PI.h); ctx.strokeStyle = "#7a5a3a"; ctx.lineWidth = 2; for (let x = PI.x; x < PI.x + PI.w; x += 24) { ctx.beginPath(); ctx.moveTo(x, PI.y); ctx.lineTo(x, PI.y + PI.h); ctx.stroke(); }
        // 水上樂園的圍牆（遠遠看得到滑水道塔）
        ctx.fillStyle = "#e84a8a"; ctx.fillRect(2040, 40, 300, 20);
        for (const [x, y] of [[300, 300], [480, 520], [180, 1200], [1700, 1250], [2100, 1300]]) palm(x, y, now);
        for (const [x, y, c] of [[700, 1000, "#ffd23a"], [1200, 1180, "#e84a8a"], [1900, 820, "#3a8ad8"]]) umbrella(x, y, c);
        // 救生員的瞭望台
        const T = MAP.tower; ctx.fillStyle = "#e84a4a"; ctx.fillRect(T.x - 30, T.y - 30, 60, 60); ctx.fillStyle = "#fff"; ctx.fillRect(T.x - 22, T.y - 22, 44, 20); text("救生", T.x, T.y + 12, "#fff", 12, 900);
        sign(400, 760, "泳圈出租"); sign(1500, 720, hasFloat() ? "抱著泳圈就能下水" : "潟湖・沒有泳圈請勿下水", hasFloat() ? "#3ab86a" : "#e84a4a");
      }
      function draw(now) {
        if (D.kid === "hunt" && !D.fries) {
          // 海鷗（嘴裡叼著薯條）
          const fl = gull.land > 0 ? 0 : Math.sin(now / 80) * 6, y = gull.y - (gull.land > 0 ? 0 : 30);
          if (gull.land <= 0) { ctx.fillStyle = "rgba(0,0,0,.15)"; ctx.beginPath(); ctx.ellipse(gull.x, gull.y + 10, 14, 5, 0, 0, Math.PI * 2); ctx.fill(); }
          ctx.fillStyle = "#fff"; ctx.strokeStyle = "#5a6a7a"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(gull.x, y, 14, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(gull.x - 6, y); ctx.lineTo(gull.x - 30, y - 8 - fl); ctx.lineTo(gull.x - 4, y - 4); ctx.moveTo(gull.x + 6, y); ctx.lineTo(gull.x + 30, y - 8 - fl); ctx.lineTo(gull.x + 4, y - 4); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#ffb03a"; ctx.beginPath(); ctx.moveTo(gull.x + 12, y - 2); ctx.lineTo(gull.x + 22, y); ctx.lineTo(gull.x + 12, y + 3); ctx.fill();
          if (!fries) { ctx.fillStyle = "#f2c200"; ctx.fillRect(gull.x + 18, y - 4, 10, 3); ctx.fillRect(gull.x + 20, y + 1, 9, 3); }
          if (gull.land > 0) text("（停下來了！）", gull.x, gull.y - 30, "#e84a4a", 12, 900);
        }
        if (fries) { ctx.fillStyle = "#e84a4a"; ctx.fillRect(fries.x - 10, fries.y - 6, 20, 14); ctx.fillStyle = "#f2c200"; for (let i = 0; i < 4; i++) ctx.fillRect(fries.x - 8 + i * 5, fries.y - 14, 3, 10); sparkle(fries.x, fries.y, now, "#ffd23a"); }
        // 抱著泳圈游泳
        if (hasFloat() && inLagoon(me.x, me.y)) { ctx.strokeStyle = "#ff7ac8"; ctx.lineWidth = 9; ctx.beginPath(); ctx.ellipse(me.x, me.y + 10, 26, 13, 0, 0, Math.PI * 2); ctx.stroke(); }
      }
      return { blocked, update, basicHit, talk, act, speedMul, drawFloor, draw };
    }

    // ================= 水上樂園（中央大道＋四個區域）共用的東西 =================
    const POOL_SCENE = { wave: "wave", river: "river", splash: "slide", kids: "pool" };
    const POOL_NAME = { wave: "造浪池", river: "漂漂河", splash: "落水池", kids: "兒童池" };
    const surveyOn = () => K.is("WP00716-01", "wpSurvey");
    function survey(id, n, line) {
      Q1.got[id] = true; save(); api.renderHud();
      const got = Object.keys(Q1.got).length;
      api.dlg("問卷", n, line, "", got < 5 ? `收到一份問卷（${got} / 5）` : "五份問卷都收齊了！拿去中央大道給小芮");
      if (got >= 5) K.adv("WP00716-01", "五份問卷都收齊了！拿去中央大道給小芮");
    }
    // 被浪打到、被水沖到：像被巴斯提安推開一樣滑出去
    const push = { vx: 0, vy: 0 };
    function knock(vx, vy) { push.vx = vx; push.vy = vy; me.target = null; }
    function pushUpdate(dt) {
      if (Math.abs(push.vx) + Math.abs(push.vy) < 8) return;
      const nx = me.x + push.vx * dt, ny = me.y + push.vy * dt;
      if (!api.blocked(nx, ny, me.half)) { me.x = nx; me.y = ny; } else { push.vx = push.vy = 0; }
      const k = Math.max(0, 1 - 3.2 * dt); push.vx *= k; push.vy *= k; me.target = null;
    }
    // 換上泳裝（之後有立繪會換成泳裝立繪；現在先戴泳帽和蛙鏡）
    function drawSwim(now) {
      if (!D.swim) return;
      ctx.fillStyle = D.swim === "f" ? "#e84a8a" : "#3a8ad8"; api.rr(me.x - 15, me.y - 21, 30, 9, 4); ctx.fill();
      ctx.fillStyle = "rgba(150,220,255,.95)"; ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 1.5;
      for (const dx of [-7, 7]) { ctx.beginPath(); ctx.arc(me.x + dx, me.y - 9, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    }
    // --- 驗水（每個區域一個池子）、找犯人、追犯人 ---
    const LOOKS = [
      "他戴著蛙鏡，一直潛下去又浮上來。「我的婚戒掉在池底了……」",
      "她在水裡教小孩打水，一、二、一、二，喊得很認真。",
      "他在水裡做伸展操，手臂轉個不停，一刻都沒有停下來。",
      "他靠在池邊滑手機，手機套著防水袋，正在看股票。",
      "她抱著甜甜圈泳圈發呆，眼睛半閉著。她說她只是太陽曬太久了。",
      "他和朋友在比誰憋氣比較久，一直在數「一、二、三……」",
    ];
    const CULPRIT = "他已經站在同一個地方很久了，一動也不動。表情從緊繃，慢慢變得……放鬆。他身邊的水好像比較溫。肩上掛著一條濕毛巾。";
    const myPool = () => MAP.samples?.[0]?.id;
    function ensureBad() { if (!Q2.bad) { Q2.bad = Object.keys(POOL_SCENE).sort(() => Math.random() - 0.5).slice(0, 2); save(); } }
    function suspects() {
      if (!K.is("WP00716-02", "wpCulprit") || !Q2.bad) return [];
      if (Q2.culprit == null) { Q2.culprit = Math.floor(Math.random() * 4); Q2.looks = [0, 1, 2, 3].map((i) => (i * 2 + Math.floor(Math.random() * 2)) % LOOKS.length); save(); }
      const j = Q2.bad.indexOf(myPool());
      if (j < 0 || !MAP.suspects) return [];
      return MAP.suspects.map((p, k) => ({ i: j * 2 + k, x: p.x, y: p.y, pid: myPool() }));
    }
    function sample(sp) {
      ensureBad();
      if (Q2.tested[sp.id]) return toast(`${sp.name}已經驗過了：${Q2.bad.includes(sp.id) ? "黃色" : "沒有變色"}`);
      Q2.tested[sp.id] = true; save(); api.renderHud();
      const bad = Q2.bad.includes(sp.id), n = Object.keys(Q2.tested).length;
      api.fx.push({ k: "num", x: sp.x, y: sp.y - 40, text: bad ? "試紙變黃了！" : "沒有變色", color: bad ? "#c8a000" : "#3ab86a", t: performance.now(), dur: 1400 });
      if (n >= 4) K.adv("WP00716-02", `四個池子都驗完了。試紙變黃的是：${Q2.bad.map((id) => POOL_NAME[id]).join("、")}。去那裡找找「不太對勁」的泳客`);
      else toast(`${sp.name}：${bad ? "試紙變黃了！" : "沒有變色"}（${n} / 4）`);
    }
    function accuse(i) {
      closePanel();
      if (i !== Q2.culprit) { Q2.wrong = (Q2.wrong || 0) + 1; save(); return toast("他一臉莫名其妙地看著你……好像不是他"); }
      const s = suspects().find((x) => x.i === i);
      Q2.flee = { pid: s.pid, x: s.x, y: s.y }; save();
      K.adv("WP00716-02", "被認出來的泳客跳起來就跑！追上他——碰到他，或用攻擊模式潑他兩下");
      startChase();
    }
    // 逃跑的泳客：往遠離你的方向跑，跑一陣子要停下來喘氣
    let runner = null;
    function startChase() {
      if (!K.is("WP00716-02", "wpChase") || !Q2.flee || Q2.flee.pid !== myPool()) { runner = null; return; }
      runner = { x: Q2.flee.x, y: Q2.flee.y, a: Math.random() * 6.28, t: 0, rest: 0, hits: 0, caught: false };
    }
    function chaseUpdate(dt) {
      if (!runner || runner.caught) return;
      runner.t += dt;
      if (runner.rest > 0) { runner.rest -= dt; }
      else {
        if (runner.t > 3.4) { runner.t = 0; runner.rest = 1.1; }
        const away = Math.atan2(runner.y - me.y, runner.x - me.x), near = dist(runner.x, runner.y, me.x, me.y) < 420;
        let a = near ? away + Math.sin(performance.now() / 600) * 0.6 : runner.a;
        const sp = 205 * dt;
        for (let k = 0; k < 8; k++) {
          const nx = runner.x + Math.cos(a) * sp, ny = runner.y + Math.sin(a) * sp;
          if (!api.blocked(nx, ny, 16) && nx > 80 && ny > 80 && nx < MAP.w - 80 && ny < MAP.h - 80) { runner.x = nx; runner.y = ny; runner.a = a; break; }
          a += (k % 2 ? 1 : -1) * (0.6 + k * 0.35);
        }
      }
      if (dist(runner.x, runner.y, me.x, me.y) < 34) catchRunner();
    }
    function catchRunner() {
      if (!runner || runner.caught) return;
      runner.caught = true;
      const lg = { name: "救生員", color: "#e84a4a", face: "救" };
      Q2.flee = null; save();
      api.dlg("抓到了！", { name: "泳池恐怖分子", color: "#3a7a8a", face: "泳" },
        "……好啦好啦，我說。是別家公司付錢叫我來的。他們說這裡的水「太有效了」，叫我們想辦法讓它沒那麼有效。……我只是來游泳的，順便。真的。", "",
        "救生員把他帶走了。回水池區向阿淨回報");
      setTimeout(() => toast(`${lg.name}：「交給我們吧。」`), 400);
      K.adv("WP00716-02", "抓到泳池恐怖分子了，救生員把他帶走了。回水池區向阿淨回報");
      runner = null;
    }
    function chaseHit(test) { if (runner && !runner.caught && test(runner.x, runner.y, 18)) { runner.hits++; runner.rest = Math.max(runner.rest, 0.5); api.fx.push({ k: "num", x: runner.x, y: runner.y - 34, text: runner.hits >= 2 ? "滑倒了！" : "潑到了！", color: "#2a8ad8", t: performance.now(), dur: 800 }); if (runner.hits >= 2) catchRunner(); } }
    // 每個區域共用的：驗水、可疑的泳客、逃跑的泳客
    function zoneClick(p) {
      if (K.is("WP00716-02", "wpSample") && MAP.samples) { const sp = MAP.samples.find((s) => dist(p.x, p.y, s.x, s.y) < 50); if (sp) { K.reach(sp, 80, () => sample(sp)); return true; } }
      const su = suspects().find((s) => dist(p.x, p.y, s.x, s.y) < 30);
      if (su) {
        K.reach(su, 90, () => api.dlg("可疑的泳客？", { name: "泳客", color: "#3a7a8a", face: "泳" }, su.i === Q2.culprit ? CULPRIT : LOOKS[Q2.looks[su.i]],
          `<button type="button" class="primary" data-act="wpAccuse" data-i="${su.i}">就是他！</button><button type="button" class="ghost" data-close>再看看</button>`, `${POOL_NAME[su.pid]}裡的泳客`));
        return true;
      }
      return false;
    }
    function zoneDraw(now) {
      if (MAP.samples) for (const sp of MAP.samples) {
        if (K.is("WP00716-02", "wpSample") && !Q2.tested[sp.id]) api.marker(sp.x, sp.y, now, "#ffd23a");
        if (Q2.tested[sp.id] && Q2.bad) { const bad = Q2.bad.includes(sp.id); ctx.fillStyle = bad ? "#f2c200" : "#3ab86a"; ctx.fillRect(sp.x - 5, sp.y - 26, 10, 22); text(bad ? "黃" : "OK", sp.x, sp.y - 36, bad ? "#c8a000" : "#3ab86a", 13, 900); }
        else { ctx.fillStyle = "#fff"; ctx.strokeStyle = "#2a8aa8"; ctx.lineWidth = 2; ctx.fillRect(sp.x - 5, sp.y - 26, 10, 22); ctx.strokeRect(sp.x - 5, sp.y - 26, 10, 22); }
      }
      for (const s of suspects()) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(s.x, s.y + 10, 22, 9, 0, 0, Math.PI * 2); ctx.stroke(); human(s.x, s.y, "#3a7a8a", "泳", now, { k: s.i, s: 24 }); text("？", s.x, s.y - 26, "#e88a3a", 14, 900); }
      if (runner && !runner.caught) {
        human(runner.x, runner.y, "#3a7a8a", "泳", now, { s: 24 });
        text(runner.rest > 0 ? "（喘……）" : "溜了！", runner.x, runner.y - 30, runner.rest > 0 ? "#2a8ad8" : "#e84a4a", 13, 900);
        ctx.fillStyle = "#e8f4f8"; ctx.fillRect(runner.x + 8, runner.y - 4, 8, 18);
      }
    }
    function zoneMini(dot, now) {
      const blink = `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`;
      if (K.is("WP00716-02", "wpSample") && MAP.samples) for (const sp of MAP.samples) if (!Q2.tested[sp.id]) dot(sp.x, sp.y, 4, blink);
      for (const s of suspects()) dot(s.x, s.y, 3, blink);
      if (runner && !runner.caught) dot(runner.x, runner.y, 5, "#e84a4a");
    }
    function zoneAct(a, b) {
      if (a === "wpAccuse") { accuse(Number(b.dataset.i)); return true; }
      return false;
    }
    // 把區域自己的東西和共用的東西接起來
    function zone(Z) {
      startChase();
      return {
        ...Z,
        update(dt, now) { pushUpdate(dt); chaseUpdate(dt); Z.update?.(dt, now); },
        click(p) { return Z.click?.(p) || zoneClick(p); },
        act(a, b) { return Z.act?.(a, b) || zoneAct(a, b); },
        draw(now) { Z.draw?.(now); zoneDraw(now); drawSwim(now); },
        mini(dot, now) { Z.mini?.(dot, now); zoneMini(dot, now); },
        basicHit(test) { Z.basicHit?.(test); chaseHit(test); },
      };
    }
    const deck = () => tiles(0, 0, MAP.w, MAP.h, "#f2f0ea", "rgba(90,120,140,.12)", 60);

    // ================= 中央大道 =================
    function park() {
      if (D.bandWhy === "beach" && !D.bandToast) { D.bandToast = true; save(); }
      if (!D.band && !D.noBandToast) { D.noBandToast = true; save(); setTimeout(() => toast("沒有戴入園手環……被工作人員看到的話不太好，但也沒人在檢查"), 700); }
      let queueT = 0;
      function update(dt) {
        if (D.queue === "on" && !Q1.got.worker) {
          if (dist(me.x, me.y, MAP.queue.x, MAP.queue.y) < 60) { queueT += dt; if (queueT >= 8) { D.queue = "done"; save(); survey("worker", npcOf("wpWorker"), "你幫我排到了！謝謝！問卷我剛剛邊等邊填好了——「最近有沒有覺得身體變輕」？有啊，我請假來這裡泡水之後，腰痛都好了。"); } }
          else queueT = Math.max(0, queueT - dt * 2);
        }
      }
      function talk(n) {
        if (n.id !== "wpWorker") return false;
        K.reach(n, 100, () => {
          if (!surveyOn() || Q1.got.worker) return api.dlg("販賣部", n, n.lines[0], "");
          if (D.queue === "on") return api.dlg("販賣部", n, "幫我站在隊伍裡就好！我邊填邊盯著。", "", "站在販賣部旁邊的排隊位置 8 秒");
          api.dlg("販賣部", n, "問卷？我很想填，可是我在排隊——我只請了半天假。你幫我排一下隊，我就填。", `<button type="button" class="primary" data-act="wpQueue">幫他排隊</button><button type="button" class="ghost" data-close>不了</button>`);
        });
        return true;
      }
      function room(r) {
        const on = D.swim === r.id;
        api.dlg(r.name, { name: r.name, color: r.color, face: "更" }, on ? "要換回原本的衣服嗎？" : "置物櫃、淋浴間、吹風機。換上泳裝再去玩吧！", `<button type="button" class="primary" data-act="wpSwim" data-id="${on ? "" : r.id}">${on ? "換回原本的衣服" : "換上泳裝"}</button><button type="button" class="ghost" data-close>不用了</button>`, "之後有立繪的時候，會換成泳裝的立繪");
      }
      function act(a, b) {
        if (a === "wpQueue") { D.queue = "on"; save(); closePanel(); toast("站在販賣部旁邊的排隊位置，撐 8 秒"); return true; }
        if (a === "wpSwim") { D.swim = b.dataset.id || null; save(); closePanel(); toast(D.swim ? "換上泳裝了！" : "換回原本的衣服了"); return true; }
        return false;
      }
      function click(p) {
        const r = MAP.rooms.find((r) => inRect({ x: r.x, y: r.y, w: r.w, h: r.h + 50 }, p.x, p.y));
        if (r) { K.reach(r.door, 80, () => room(r)); return true; }
        return false;
      }
      function drawFloor(now) {
        tiles(0, 0, MAP.w, MAP.h, "#f2f0ea", "rgba(90,120,140,.12)", 60);
        // 中央大道（藍色的步道）
        ctx.fillStyle = "#bfe6f2"; ctx.fillRect(1080, 40, 240, 1520); ctx.fillRect(40, 640, 2320, 220); ctx.fillRect(1320, 1150, 1040, 220);
        for (let y = 80; y < 1540; y += 80) { ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.fillRect(1196, y, 8, 40); }
        // 更衣室
        for (const r of MAP.rooms) {
          ctx.fillStyle = "#fff"; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.strokeStyle = r.color; ctx.lineWidth = 5; ctx.strokeRect(r.x, r.y, r.w, r.h);
          ctx.fillStyle = r.color; ctx.fillRect(r.door.x - 30, r.y + r.h - 8, 60, 12); text(r.name, r.x + r.w / 2, r.y + r.h / 2, r.color, 18, 900);
          text("（點我換泳裝）", r.x + r.w / 2, r.y + r.h / 2 + 26, r.color, 12, 900);
        }
        // 醫護站（招牌上沒有公司的名字）
        const M = MAP.medical; ctx.fillStyle = "#fff"; ctx.fillRect(M.x, M.y, M.w, M.h); ctx.strokeStyle = "#e84a8a"; ctx.lineWidth = 4; ctx.strokeRect(M.x, M.y, M.w, M.h);
        ctx.fillStyle = "#e84a8a"; ctx.fillRect(M.x + M.w / 2 - 10, M.y + 20, 20, 56); ctx.fillRect(M.x + M.w / 2 - 28, M.y + 38, 56, 20); text("醫護站・志願者服務處", M.x + M.w / 2, M.y + M.h - 26, "#e84a8a", 13, 900);
        // 販賣部、排隊
        const Sn = MAP.snack; ctx.fillStyle = "#e88a3a"; ctx.fillRect(Sn.x, Sn.y, Sn.w, Sn.h); text("樂園販賣部", Sn.x + Sn.w / 2, Sn.y + Sn.h / 2, "#fff", 15, 900);
        ctx.strokeStyle = "rgba(29,29,31,.4)"; ctx.setLineDash([8, 6]); ctx.lineWidth = 2; ctx.strokeRect(MAP.queue.x - 40, MAP.queue.y - 40, 80, 80); ctx.setLineDash([]); text("排隊", MAP.queue.x, MAP.queue.y + 52, "#5a6a8a", 11, 900);
        // 園區地圖看板
        ctx.fillStyle = "#2aa8c8"; ctx.fillRect(1080, 760, 240, 60); text("多利島水上樂園・園區地圖", 1200, 790, "#fff", 13, 900);
        for (const [x, y] of [[200, 1000], [900, 1100], [1500, 600], [2000, 500], [700, 1450], [1700, 1450]]) palm(x, y, now);
        for (const [x, y, c] of [[400, 1100, "#ffd23a"], [1600, 1050, "#e84a8a"]]) umbrella(x, y, c);
      }
      function draw(now) {
        if (D.queue === "on" && !Q1.got.worker) { K.bar(MAP.queue.x, MAP.queue.y - 56, 80, queueT / 8, "#e88a3a"); if (dist(me.x, me.y, MAP.queue.x, MAP.queue.y) >= 60) api.marker(MAP.queue.x, MAP.queue.y, now, "#ffd23a"); }
        if (surveyOn() && !Q1.got.worker) { const n = npcOf("wpWorker"); api.marker(n.x, n.y, now, "#ffd23a"); }
      }
      return zone({ update, talk, act, click, drawFloor, draw });
    }

    // ================= 造浪池區 =================
    function wave() {
      const WV = MAP.wave;
      if (D.bandWhy === "beach" && !D.bandToast) { D.bandToast = true; save(); setTimeout(() => api.dlg("水上樂園・海灘入口", npcOf("wpLifeguard"), "……你是從潟湖游過來的？算了，這條手環拿去戴上，別跟別人說。", "", "得到入園手環"), 600); }
      const W = { on: false, waves: [], next: 1.2, entered: false };
      const blocked = (x, y, h) => !W.on && inRect(WV, x, y) && y - h < WV.shallow;      // 深水區：要開始挑戰才能進去
      // 平常的小浪（淺水區也會有，打到會被往岸邊推一點）；挑戰中的大浪有缺口
      let small = 3;
      function update(dt) {
        const inPool = inRect(WV, me.x, me.y);
        if (W.on) {
          if (inPool) W.entered = true;
          if (!inPool && W.entered) { W.on = false; W.waves = []; api.resetPaths?.(); toast("離開造浪池了。勇闖大浪結束（隨時可以再找阿浪挑戰）"); }
        }
        // 大浪
        if (W.on && W.entered) {
          W.next -= dt;
          if (W.next <= 0) { W.next = 2.2; const gw = 220, n = Math.random() < 0.5 ? 1 : 2, gaps = []; for (let i = 0; i < n; i++) gaps.push(WV.x + 60 + Math.random() * (WV.w - 120 - gw)); W.waves.push({ y: WV.y + 70, gaps, gw, big: true }); }
        }
        // 平常的小浪：只在淺水區
        small -= dt;
        if (!W.on && small <= 0) { small = 4.5; W.waves.push({ y: WV.shallow, gaps: [WV.x + 100 + Math.random() * (WV.w - 500)], gw: 300, big: false }); }
        for (const w of W.waves) {
          const py = w.y; w.y += (w.big ? 260 : 180) * dt;
          const inGap = w.gaps.some((gx) => me.x > gx && me.x < gx + w.gw);
          if (!w.hit && inPool && py < me.y && w.y >= me.y && !inGap) {
            w.hit = true;
            knock((Math.random() - 0.5) * 120, w.big ? 950 : 420);
            api.fx.push({ k: "num", x: me.x, y: me.y - 40, text: w.big ? "被大浪打回去了！" : "嘩啦！", color: "#2a8ad8", t: performance.now(), dur: 900 });
            api.sfx?.("sounds/slime-ram.mp3");
          }
        }
        W.waves = W.waves.filter((w) => w.y < WV.y + WV.h);
        if (W.on && me.y < MAP.nessie.y + 140) {
          W.on = false; W.waves = []; D.waveWon = true;
          BAG.add(run.items, "wpNessie", 1); run.gold += 80; save(); api.renderHud(); api.resetPaths?.();
          api.dlg("造浪池", npcOf("wpLifeguard"), "游到水怪面前了！你是今天第一個！這是獎品——縮小版的尼斯水怪泳圈。", "", "得到「尼斯水怪造型泳圈」和 80 金幣");
        }
      }
      function talk(n) {
        if (n.id !== "wpLifeguard") return false;
        K.reach(n, 100, () => {
          if (D.waveWon) return api.dlg("造浪池", n, "今天的大浪冠軍！水怪泳圈好用嗎？", "");
          if (W.on) return api.dlg("造浪池", n, "往深水區游！浪來的時候，找浪的缺口鑽過去！", "");
          api.dlg("造浪池", n, "想挑戰「勇闖大浪」嗎？從淺水區一路游到深水區的尼斯水怪面前就算贏——水怪會一直捲起大浪，被浪打到會被沖回來。浪有缺口，從缺口鑽過去！",
            `<button type="button" class="primary" data-act="wpWave">挑戰勇闖大浪</button><button type="button" class="ghost" data-close>先不要</button>`, "委託以外的遊樂設施：贏了有獎品");
        });
        return true;
      }
      function act(a) {
        if (a === "wpWave") { W.on = true; W.entered = false; W.waves = []; W.next = 1.2; api.resetPaths?.(); closePanel(); toast("勇闖大浪開始！往深水區的尼斯水怪游，從浪的缺口鑽過去"); return true; }
        return false;
      }
      function click(p) {
        if (D.momAsked && !Q1.got.mom && !BAG.count(run.items, "wpGoggles")) {
          const gs = MAP.gogglesSpots[D.goggles];
          if (gs && dist(p.x, p.y, gs.x, gs.y) < 40) { K.reach(gs, 70, () => { BAG.add(run.items, "wpGoggles", 1); save(); toast("撈到了一副兒童蛙鏡，綁帶上寫著「小宇」"); }); return true; }
        }
        return false;
      }
      const speedMul = () => (inRect(WV, me.x, me.y) ? (me.y < WV.shallow ? 0.7 : 0.82) : 1);
      function drawFloor(now) {
        ctx.fillStyle = "#f2dca8"; ctx.fillRect(0, 0, MAP.w, MAP.h);                      // 人工沙灘
        water({ x: WV.x, y: WV.y, w: WV.w, h: WV.shallow - WV.y }, now, true);
        water({ x: WV.x, y: WV.shallow, w: WV.w, h: WV.y + WV.h - WV.shallow }, now, false);
        // 淺水區像沙灘一樣慢慢變淺
        const gr = ctx.createLinearGradient(0, WV.shallow, 0, WV.y + WV.h); gr.addColorStop(0, "rgba(242,220,168,0)"); gr.addColorStop(1, "rgba(242,220,168,.6)"); ctx.fillStyle = gr; ctx.fillRect(WV.x, WV.shallow, WV.w, WV.y + WV.h - WV.shallow);
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 8; ctx.strokeRect(WV.x, WV.y, WV.w, WV.h);
        for (let x = WV.x + 10; x < WV.x + WV.w; x += 24) { ctx.fillStyle = (x / 24) % 2 < 1 ? "#e84a4a" : "#ffd23a"; ctx.beginPath(); ctx.arc(x, WV.shallow, 6, 0, Math.PI * 2); ctx.fill(); }
        text(W.on ? "勇闖大浪中！" : "深水區（勇闖大浪：找救生員阿浪）", WV.x + WV.w / 2, WV.shallow - 22, "#fff", 15, 900);
        for (const [x, y, c] of [[160, 900, "#ffd23a"], [3040, 1200, "#e84a8a"], [160, 2300, "#3a8ad8"], [3040, 2350, "#ffd23a"]]) umbrella(x, y, c);
        for (const [x, y] of [[150, 400], [3050, 600], [600, 2400], [2600, 2420]]) palm(x, y, now);
        // 救生員的高椅
        ctx.fillStyle = "#e84a4a"; ctx.fillRect(1560, 2190, 80, 24);
      }
      function nessie(now) {
        const N = MAP.nessie, sw = Math.sin(now / 700) * 14, S = 1.8;
        ctx.save(); ctx.translate(N.x, N.y); ctx.scale(S, S);
        ctx.fillStyle = "#3ab86a"; ctx.strokeStyle = "#1d6a3a"; ctx.lineWidth = 3;
        for (const [dx, r] of [[-120, 34], [-60, 44], [120, 30]]) { ctx.beginPath(); ctx.ellipse(dx, 30, r, r * 0.6, 0, Math.PI, 0); ctx.fill(); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(10, 40); ctx.quadraticCurveTo(20 + sw, -60, 60 + sw, -70); ctx.lineTo(70 + sw, -50); ctx.quadraticCurveTo(40 + sw, -40, 40, 40); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(72 + sw, -66, 24, 14, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(80 + sw, -72, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#1d1d1f"; ctx.beginPath(); ctx.arc(81 + sw, -72, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(26 + i * 6 + sw * (i / 4), 10 - i * 22, 14, 0.2, Math.PI - 0.2); ctx.stroke(); }
        ctx.restore();
        text("塑膠尼斯水怪", N.x, N.y + 90, "#fff", 15, 900);
      }
      function draw(now) {
        nessie(now);
        for (const w of W.waves) {
          let x = WV.x; const segs = [];
          for (const gx of [...w.gaps].sort((a, b) => a - b)) { if (gx > x) segs.push([x, gx]); x = Math.max(x, gx + w.gw); }
          if (x < WV.x + WV.w) segs.push([x, WV.x + WV.w]);
          for (const [a, b] of segs) {
            ctx.fillStyle = w.big ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.6)"; ctx.fillRect(a, w.y - (w.big ? 16 : 8), b - a, w.big ? 32 : 16);
            ctx.fillStyle = "rgba(42,138,216,.5)"; ctx.fillRect(a, w.y + (w.big ? 16 : 8), b - a, w.big ? 14 : 6);
          }
        }
        if (D.momAsked && !Q1.got.mom && !BAG.count(run.items, "wpGoggles")) { const gs = MAP.gogglesSpots[D.goggles]; if (gs && dist(me.x, me.y, gs.x, gs.y) < 240) { ctx.fillStyle = "#5ac8f0"; ctx.fillRect(gs.x - 12, gs.y - 5, 10, 10); ctx.fillRect(gs.x + 2, gs.y - 5, 10, 10); sparkle(gs.x, gs.y, now); } }
      }
      return zone({ blocked, update, talk, act, click, speedMul, drawFloor, draw });
    }

    // ================= 漂漂河區 =================
    function river() {
      const RV = MAP.river, IS = MAP.island;
      const inRiver = (x, y) => inRect(RV, x, y) && !inRect(IS, x, y);
      const blocked = (x, y, h) => x + h > IS.x && x - h < IS.x + IS.w && y + h > IS.y && y - h < IS.y + IS.h;
      const mid = { x0: (RV.x + IS.x) / 2, x1: (RV.x + RV.w + IS.x + IS.w) / 2, y0: (RV.y + IS.y) / 2, y1: (RV.y + RV.h + IS.y + IS.h) / 2 };
      const per = 2 * (mid.x1 - mid.x0 + mid.y1 - mid.y0);
      const loop = (t) => {
        let d = ((t % per) + per) % per; const w = mid.x1 - mid.x0, h = mid.y1 - mid.y0;
        if (d < w) return { x: mid.x0 + d, y: mid.y0 }; d -= w;
        if (d < h) return { x: mid.x1, y: mid.y0 + d }; d -= h;
        if (d < w) return { x: mid.x1 - d, y: mid.y1 }; d -= w;
        return { x: mid.x0, y: mid.y1 - d };
      };
      let girlT = Math.random() * per;
      function update(dt) {
        if (inRiver(me.x, me.y)) {
          let vx = 0, vy = 0;
          if (me.y < IS.y) vx = 1; else if (me.x > IS.x + IS.w) vy = 1; else if (me.y > IS.y + IS.h) vx = -1; else vy = -1;
          const nx = me.x + vx * 90 * dt, ny = me.y + vy * 90 * dt;
          if (!api.blocked(nx, ny, me.half)) { me.x = nx; me.y = ny; }
        }
        girlT += 70 * dt;
        if (surveyOn() && !Q1.got.river) { const g = loop(girlT); if (inRiver(me.x, me.y) && dist(me.x, me.y, g.x, g.y) < 54) survey("river", { name: "漂漂河上的大姐", color: "#3a8ad8", face: "姐" }, "（大姐被你撞醒了）……嗯？問卷？好啊。我在這條河上漂了……三圈？還是三天？泡在這裡好舒服，什麼都不用想。"); }
      }
      const speedMul = () => (inRiver(me.x, me.y) ? 0.82 : 1);
      function drawFloor(now) {
        deck();
        water(RV, now, false);
        ctx.fillStyle = "#c8e8a8"; ctx.fillRect(IS.x, IS.y, IS.w, IS.h);
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 6; ctx.strokeRect(RV.x, RV.y, RV.w, RV.h); ctx.strokeRect(IS.x, IS.y, IS.w, IS.h);
        for (let i = 0; i < 18; i++) palm(IS.x + 80 + ((i * 337) % (IS.w - 160)), IS.y + 80 + ((i * 211) % (IS.h - 160)), now);
        // 水流的箭頭
        ctx.fillStyle = "rgba(255,255,255,.75)";
        for (let i = 0; i < 28; i++) {
          const t = now / 11 + i * (per / 28), g = loop(t), h = loop(t + 6), a = Math.atan2(h.y - g.y, h.x - g.x);
          ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -7); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill(); ctx.restore();
        }
        // 漂著的泳圈（裝飾）
        for (let i = 0; i < 10; i++) { const g = loop(now / 14 + i * (per / 10) + 40); ctx.strokeStyle = ["#ff7ac8", "#ffd23a", "#3ab86a"][i % 3]; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(g.x, g.y, 20, 11, 0, 0, Math.PI * 2); ctx.stroke(); }
        sign(RV.x + RV.w / 2, RV.y - 24, "漂漂河（水會帶著你順時針漂；一圈要很久）");
      }
      function draw(now) {
        if (surveyOn() && !Q1.got.river) { const g = loop(girlT); ctx.strokeStyle = "#ffd23a"; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(g.x, g.y + 8, 24, 12, 0, 0, Math.PI * 2); ctx.stroke(); human(g.x, g.y, "#3a8ad8", "姐", now, { s: 24 }); text("Zzz", g.x + 20, g.y - 26, "#3a8ad8", 12, 900); api.marker(g.x, g.y, now, "#ffd23a"); }
      }
      function mini(dot, now) { if (surveyOn() && !Q1.got.river) { const g = loop(girlT); dot(g.x, g.y, 4, `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`); } }
      return zone({ blocked, update, speedMul, drawFloor, draw, mini });
    }

    // ================= 滑水道區 =================
    function slide() {
      const T = MAP.tower;
      // 從滑水道的出口噴進落水池
      let fly = null;
      function shootOut(id) {
        const P = MAP.pools[id], to = { x: P.x + P.w / 2 + (Math.random() - 0.5) * 120, y: P.y + P.h / 2 + 40 };
        Object.assign(me, { x: P.end.x, y: P.end.y, target: null });
        fly = { x0: P.end.x, y0: P.end.y, x1: to.x, y1: to.y, t: 0 };
      }
      function update(dt) {
        if (fly) {
          fly.t += dt / 0.7;
          const k = Math.min(1, fly.t);
          me.x = fly.x0 + (fly.x1 - fly.x0) * k; me.y = fly.y0 + (fly.y1 - fly.y0) * k; me.target = null;
          if (fly.t >= 1) { api.fx.push({ k: "num", x: me.x, y: me.y - 40, text: "噗通！", color: "#2a8ad8", t: performance.now(), dur: 900 }); api.sfx?.("sounds/slime-ram.mp3"); splash = { x: me.x, y: me.y, t: performance.now() }; fly = null; }
        }
      }
      let splash = null;
      function slidePanel() {
        const rows = Object.entries(SLIDES).map(([id, S]) => `<div class="wx-qrow"><b>${S.name}</b><span>${S.desc}・規定時間 ${slideGoal(S)} 秒${Q3.slides[id] ? "（已通過）" : ""}</span><button type="button" class="primary" data-act="wpSlide" data-id="${id}">滑下去</button></div>`).join("");
        api.dlg("滑水道塔頂", { name: "滑水道塔頂", color: "#e88a3a", face: "塔" }, K.is("WP00716-03", "wpSlides") ? "風好大。三條滑水道的入口都在這裡。海哥在下面拿著碼表。" : "風好大。三條滑水道的入口都在這裡。滑到底會直接噴進落水池。", rows,
          "左右鍵（A／D）換位置、彎道在判定框裡點擊畫面、空白鍵衝刺。撞到充氣小鴨會變慢，泡泡會加速量表");
      }
      function runSlide(id, rival) {
        const S = SLIDES[id], goal = slideGoal(S);
        api.closePanel?.();
        R.Race.play({
          ch: api.CH, course: S.course, lanes: S.lanes, speed: S.speed, theme: "slide", tube: S.tube, dark: S.dark, hazards: S.hazards,
          rival: rival || null, rivalThrows: false, rivalStart: 60, goal, anyFinish: !!rival,
          words: rival ? { go: "滑下去！", win: "贏了阿哲！", lose: "阿哲先到了……", quit: "不滑了" } : { go: "滑下去！", win: "在規定時間內！", lose: "太慢了……", again: "再滑一次", quit: "不滑了" },
          host: document.getElementById("wxStage"), busy: (v) => api.setBusy(v), muted: () => api.isMuted?.(), sfx: (src) => api.sfx?.(src),
          say: rival ? { start: ["輸的人請喝飲料！"], passed: ["欸？！你怎麼滑那麼快！"], win: ["哈，我第一百零一勝！"], lose: ["……可惡，第一次輸。"] } : null,
          onDone(r) {
            if (r.again) return runSlide(id, rival);
            if (r.quit) { Object.assign(me, { x: T.x - 120, y: T.y + 140, target: null }); return; }
            shootOut(id);
            if (rival) {
              if (surveyOn() && !Q1.got.student) setTimeout(() => survey("student", npcOf("wpStudent"), r.win ? "……你比我快。好吧，問卷給你。最後一題寫什麼「泡在水裡的時候，有沒有聽到聲音」？——有啊。滑到底的那一下，總覺得水裡有人在叫我。" : "哈，我贏了！問卷填好了，拿去。最後一題好奇怪——「泡在水裡的時候，有沒有聽到聲音」？……其實有。"), 800);
              return;
            }
            if (r.win && K.is("WP00716-03", "wpSlides") && !Q3.slides[id]) {
              Q3.slides[id] = true; save(); api.renderHud();
              const n = Object.keys(Q3.slides).length;
              if (n >= 3) setTimeout(() => K.adv("WP00716-03", "三條滑水道都在規定時間內滑到底了！回去向海哥回報"), 800);
              else setTimeout(() => toast(`${S.name}：通過！（${n} / 3）`), 800);
            } else if (r.win) setTimeout(() => toast(`${S.name}：${r.time.toFixed(1)} 秒`), 800);
          },
        });
      }
      function talk(n) {
        if (n.id !== "wpStudent") return false;
        K.reach(n, 110, () => {
          const need = surveyOn() && !Q1.got.student;
          api.dlg("滑水道塔", n, need ? "問卷？可以啊。不過——先陪我比一場彩虹滑水道。比完我就填。" : "這座塔我滑過一百次了。要比嗎？", `<button type="button" class="primary" data-act="wpStudentRace">比一場彩虹滑水道</button><button type="button" class="ghost" data-close>先不要</button>`, "和阿哲一起從彩虹滑水道滑下去，先滑到底的贏");
        });
        return true;
      }
      function act(a, b) {
        if (a === "wpStudentRace") { runSlide("rainbow", { name: "阿哲", face: "哲", color: "#3ab86a" }); return true; }
        if (a === "wpSlide") { runSlide(b.dataset.id); return true; }
        return false;
      }
      function click(p) {
        if (dist(p.x, p.y, T.x, T.y) < 100) { K.reach({ x: T.x, y: T.y + 140 }, 90, slidePanel); return true; }
        return false;
      }
      const speedMul = () => (Object.values(MAP.pools).some((P) => inRect(P, me.x, me.y)) ? 0.82 : 1);
      const PATH = { rainbow: [[T.x, T.y], [700, 300], [200, 900], [460, 1330]], black: [[T.x, T.y], [1700, 900], [900, 1100], [1300, 1450]], funnel: [[T.x, T.y], [1900, 300], [2500, 900], [2140, 1330]] };
      function drawFloor(now) {
        deck();
        for (const [id, P] of Object.entries(MAP.pools)) { water(P, now, false); ctx.strokeStyle = SLIDES[id].tube; ctx.lineWidth = 8; ctx.strokeRect(P.x, P.y, P.w, P.h); sign(P.x + P.w / 2, P.y + P.h + 24, `${SLIDES[id].name}的落水池`, SLIDES[id].tube === "#ffd23a" ? "#c8a000" : SLIDES[id].tube); }
        // 三條滑水道（從塔頂一路彎到各自的落水池）
        ctx.lineCap = "round";
        for (const [id, pts] of Object.entries(PATH)) {
          for (const [w, c] of [[30, "rgba(29,29,31,.15)"], [24, SLIDES[id].tube], [10, "rgba(255,255,255,.35)"]]) {
            ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]); ctx.stroke();
          }
        }
        ctx.lineCap = "butt";
        ctx.fillStyle = "#e88a3a"; ctx.fillRect(T.x - 80, T.y - 80, 160, 160); ctx.fillStyle = "#fff"; ctx.fillRect(T.x - 60, T.y - 60, 120, 120);
        text("滑水道塔", T.x, T.y - 10, "#e88a3a", 16, 900); text("（點我上塔）", T.x, T.y + 16, "#e88a3a", 12, 900);
        for (const [x, y] of [[200, 300], [2400, 300], [800, 900], [1900, 1000]]) palm(x, y, now);
      }
      function draw(now) {
        if (splash) { const k = (performance.now() - splash.t) / 700; if (k < 1) { ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 4; for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.ellipse(splash.x, splash.y + 10, 20 * i * (0.5 + k), 9 * i * (0.5 + k), 0, 0, Math.PI * 2); ctx.stroke(); } } else splash = null; }
        if (fly) { const k = Math.min(1, fly.t); ctx.fillStyle = "rgba(255,255,255,.8)"; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(me.x - (fly.x1 - fly.x0) * 0.05 * i, me.y - (fly.y1 - fly.y0) * 0.05 * i, 6 - i * 0.8, 0, Math.PI * 2); ctx.fill(); } }
        if (K.is("WP00716-03", "wpSlides")) api.marker(T.x, T.y - 40, now, "#ffd23a");
        if (surveyOn() && !Q1.got.student) { const n = npcOf("wpStudent"); api.marker(n.x, n.y, now, "#ffd23a"); }
      }
      return zone({ update, talk, act, click, speedMul, drawFloor, draw });
    }

    // ================= 水池區 =================
    function pool() {
      const inWater = (x, y) => inRect(MAP.lap, x, y) || inRect(MAP.kids, x, y);
      function talk(n) {
        if (n.id === "wpLounger") { K.reach(n, 100, () => {
          if (surveyOn() && !Q1.got.lounger) return survey("lounger", n, "問卷？好好好，我來填。……「還記得昨天晚餐吃什麼嗎」？哈哈，不記得了。我連自己是哪一年來的都不太記得了。");
          api.dlg("水池區", n, n.lines[0], "");
        }); return true; }
        if (n.id === "wpMom") { K.reach(n, 100, () => {
          if (!surveyOn() || Q1.got.mom) return api.dlg("兒童池", n, Q1.got.mom ? "小宇戴著蛙鏡玩得好開心。謝謝你！" : n.lines[0], "");
          if (BAG.count(run.items, "wpGoggles")) { BAG.remove(run.items, "wpGoggles", 1); return survey("mom", n, "小宇的蛙鏡！謝謝你！……問卷？當然好。小宇來這裡之後，氣喘都沒有再發作了。這裡的水真的好神奇。"); }
          if (!D.momAsked) { D.momAsked = true; D.goggles = Math.floor(Math.random() * R.MAPS["WP00716/wave"].gogglesSpots.length); save(); }
          api.dlg("兒童池", n, "問卷？……對不起，我現在沒心情。小宇的蛙鏡掉進造浪池了，他一直哭。如果能找回來的話……", "", "去造浪池區的淺水區找找（靠近時會看到閃光）");
        }); return true; }
        if (n.id === "wpGunHost") { K.reach(n, 110, () => {
          api.dlg("水槍大戰", n, `水槍大戰！三對三搶旗子：搶到中間的旗子、帶回自己的基地就得一分，先拿三分的贏！不能用原本的技能——Q 是水槍、E 是水球，左鍵發射，要自己瞄準喔！${D.gunWon ? "（今天的獎品已經發過了，可以再來玩）" : "（今天第一次贏有獎品）"}`,
            `<button type="button" class="primary" data-act="wpGun">開始水槍大戰</button><button type="button" class="ghost" data-close>先不要</button>`, "現在是單機版（你＋兩個電腦隊友 vs 三個電腦對手）；之後會開放和其他玩家連線對戰");
        }); return true; }
        return false;
      }
      function act(a) {
        if (a === "wpGun") {
          api.closePanel?.();
          const go = () => R.WaterGun.play({
            ch: api.CH, host: document.getElementById("wxStage"), busy: (v) => api.setBusy(v), sfx: (src) => api.sfx?.(src),
            onDone(r) {
              if (r.again) return go();
              if (r.quit) return;
              if (r.win && !D.gunWon) { D.gunWon = true; run.gold += 80; save(); api.renderHud(); api.dlg("水槍大戰", npcOf("wpGunHost"), `${r.score[0]}：${r.score[1]}，你們贏了！今天的獎品：80 金幣！`, ""); }
              else toast(r.draw ? "水槍大戰：平手！" : r.win ? `水槍大戰：贏了！（${r.score[0]}：${r.score[1]}）` : `水槍大戰：輸了……（${r.score[0]}：${r.score[1]}）`);
            },
          });
          go();
          return true;
        }
        return false;
      }
      const speedMul = () => (inWater(me.x, me.y) ? 0.8 : 1);
      function drawFloor(now) {
        deck();
        // 50 公尺標準泳池
        const L = MAP.lap; water(L, now, true); ctx.strokeStyle = "#fff"; ctx.lineWidth = 8; ctx.strokeRect(L.x, L.y, L.w, L.h);
        for (let k = 1; k < 8; k++) { const y = L.y + (L.h * k) / 8; for (let x = L.x + 10; x < L.x + L.w; x += 22) { ctx.fillStyle = k % 2 ? "#e84a4a" : "#ffd23a"; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); } }
        sign(L.x + L.w / 2, L.y - 22, "50 公尺標準泳池");
        // 兒童池
        water(MAP.kids, now, false); ctx.strokeStyle = "#ffd23a"; ctx.lineWidth = 6; ctx.strokeRect(MAP.kids.x, MAP.kids.y, MAP.kids.w, MAP.kids.h); sign(MAP.kids.x + MAP.kids.w / 2, MAP.kids.y - 22, "兒童池");
        // 水槍大戰的場地
        const A = MAP.arena; ctx.fillStyle = "rgba(90,200,240,.12)"; ctx.fillRect(A.x, A.y, A.w, A.h); ctx.strokeStyle = "#2a8ad8"; ctx.lineWidth = 4; ctx.setLineDash([16, 10]); ctx.strokeRect(A.x, A.y, A.w, A.h); ctx.setLineDash([]);
        ctx.fillStyle = "rgba(42,138,216,.25)"; ctx.fillRect(A.x + 20, A.y + 200, 120, 220); ctx.fillStyle = "rgba(232,74,74,.25)"; ctx.fillRect(A.x + A.w - 140, A.y + 200, 120, 220);
        for (const [x, y] of [[A.x + 280, A.y + 140], [A.x + 280, A.y + 420], [A.x + 680, A.y + 140], [A.x + 680, A.y + 420]]) { ctx.fillStyle = "#ffd23a"; api.rr(x, y, 46, 90, 12); ctx.fill(); }
        ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(A.x + A.w / 2, A.y + A.h / 2 + 14); ctx.lineTo(A.x + A.w / 2, A.y + A.h / 2 - 22); ctx.stroke(); ctx.fillStyle = "#ffd23a"; ctx.beginPath(); ctx.moveTo(A.x + A.w / 2, A.y + A.h / 2 - 22); ctx.lineTo(A.x + A.w / 2 + 22, A.y + A.h / 2 - 14); ctx.lineTo(A.x + A.w / 2, A.y + A.h / 2 - 6); ctx.closePath(); ctx.fill();
        sign(A.x + A.w / 2, A.y + A.h + 24, "水槍大戰的場地（找主持人阿翔）", "#2a8ad8");
        // 躺椅、水質檢驗站
        for (let i = 0; i < 6; i++) { ctx.fillStyle = "#fff"; ctx.strokeStyle = "#5a8a9a"; ctx.lineWidth = 2; ctx.fillRect(1200 + i * 90, 920, 60, 30); ctx.strokeRect(1200 + i * 90, 920, 60, 30); }
        ctx.fillStyle = "#2a8aa8"; ctx.fillRect(360, 860, 200, 70); text("水質檢驗站", 460, 895, "#fff", 14, 900);
        for (const [x, y, c] of [[1150, 1050, "#e84a8a"], [2300, 600, "#ffd23a"], [200, 600, "#3a8ad8"]]) umbrella(x, y, c);
        for (const [x, y] of [[300, 300], [2300, 300], [150, 1800], [2400, 1850]]) palm(x, y, now);
      }
      function draw(now) {
        if (surveyOn()) for (const [id, nid] of [["lounger", "wpLounger"], ["mom", "wpMom"]]) if (!Q1.got[id]) { const n = npcOf(nid); api.marker(n.x, n.y, now, "#ffd23a"); }
      }
      return zone({ talk, act, speedMul, drawFloor, draw });
    }
    // 每個場景自己的玩法
    const S = { parking, plaza, staff, beach, park, wave, river, slide, pool }[SC]();
    return {
      ...S,
      update(dt, now) { if (!leaving) exitsUpdate(); S.update?.(dt, now); },
      click(p) { return S.click?.(p) || exitsClick(p); },
      draw(now) { S.draw?.(now); drawExits(now); },
      stageText, mini(dot, now) { for (const e of MAP.exits) dot(e.x + e.w / 2, e.y + e.h / 2, 4, "#ffd23a"); S.mini?.(dot, now); },
    };
  };
})();
