/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/aq00618-wild.js": "20261122024623" });
// #AQ00618 如此靜謐的蔚藍・水族館外的原始水域（場景 "wild"；自由探索，不是委託）
//   食物鏈等級（trip.qdata.aq.chain，戰鬥時 js/config.js 的 R.Chain 會讀）：
//     0 小魚 →（吃掉 4 群小魚）→ 1 捕食者 →（吃掉 4 群捕食者）→ 2 掠食者
//     四個水域的掠食者（巨齒鯊、利維坦鯨、鄧氏魚、恐鱷）全部倒下：這片水域換了頂點
//       用蒼幽的話 → 3 原始獵手 → 所有的魚消失，大洋中央出現「滄游」：靠近時觸發對話（只有蒼幽能接話）
//       → 滄游從人形變成幽靈魚、幽靈墨魚、幽靈虎鯨，被泡沫埋沒 → 滄游・滄龍（Boss，js/ai-mosasaur.js）→ 打倒取得專武「滄龍名片」
//   吃掉的數量累計在 D.ate（每打倒一次記一次；魔物重生會從 run.defeated 拿掉，所以不能直接數 run.defeated）
//   等級只升不降（使用者 11/22：之前只數 run.defeated，重生後數量變少就降級了）
(function () {
  const R = (window.RPG = window.RPG || {});
  const base = R.WorldHooks.AQ00618;
  R.WorldHooks.AQ00618 = function (api) {
    if (api.MAP.wild) return wild(api);
    return base(api);
  };
  const NEED = { t0: 4, t1: 4 };

  function wild(api) {
    const { MAP, trip, me, toast, text, save, dist, run } = api, ctx = api.ctx();
    const K = R.BKit(api);
    trip.qdata = trip.qdata || {};
    const D = (trip.qdata.aq = trip.qdata.aq || { stamps: {}, invited: [], seen: {} });
    const NAMES = R.Chain?.NAMES || ["小魚", "捕食者", "掠食者", "原始獵手"];
    const isCy = trip.char === "cangyou";
    D.ate = D.ate || { t0: 0, t1: 0, preds: [], seen: {}, mosa: false };
    // 新打倒的（run.defeated 裡有、而且這一次打倒還沒記過：用打倒的時間當記號）
    function tally() {
      const A = D.ate; let ch = false;
      for (const id of run.defeated || []) {
        if (!id.startsWith("aqw-")) continue;
        const key = run.downAt?.[id] || 1;
        if (A.seen[id] === key) continue;
        A.seen[id] = key; ch = true;
        if (id.startsWith("aqw-t0-")) A.t0++;
        else if (id.startsWith("aqw-t1-")) A.t1++;
        else if (id.startsWith("aqw-t2-")) { if (!A.preds.includes(id)) A.preds.push(id); }
        else if (id === "aqw-mosasaur") A.mosa = true;
      }
      if (ch) save();
    }
    const eaten = () => { tally(); const A = D.ate; return { t0: A.t0, t1: A.t1, t2: A.preds.length, mosa: A.mosa }; };
    function rankFrom(e) {
      let r = 0;
      if (e.t0 >= NEED.t0) r = 1;
      if (r >= 1 && e.t1 >= NEED.t1) r = 2;
      if (r >= 2 && e.t2 >= MAP.predators.length && isCy) r = 3;
      return r;
    }
    let shown = D.chain ?? 0, banner = null;
    function sync(first) {
      const e = eaten(), r = Math.max(rankFrom(e), D.chain ?? 0);          // 只升不降
      if (r !== (D.chain ?? 0)) {
        D.chain = r; save();
        if (!first || r > shown) { banner = { text: `食物鏈：${NAMES[r]}`, t: performance.now() }; api.sfx("sounds/cangyou-whale.mp3"); }
        if (r === 1) toast("你吃掉了夠多的小魚。從現在起，你是捕食者——掠食者還是會把你當成食物");
        if (r === 2) toast("你成了掠食者。四片水域裡，各有一隻和你同一層的東西在等你");
        if (r === 3) toast("四隻掠食者都倒下了。蒼幽的影子在水裡拉長、變形——他成了原始獵手。……大洋的中央，有什麼東西浮上來了");
      }
      shown = r;
      // 四隻掠食者都倒下
      if (e.t2 >= MAP.predators.length && !D.apex) {
        D.apex = true; save();
        if (isCy) { D.primal = true; save(); setTimeout(() => api.changeScene("wild", { x: me.x, y: me.y }, "水面開始翻騰……"), 2600); }
        else { run.gold = (run.gold || 0) + 400; save(); api.renderHud(); toast("四隻掠食者都倒下了。這片水域，沒有比你更高的東西了（獲得 400 金幣）"); }
      }
      // 打倒滄龍：專武「滄龍名片」
      if (e.mosa && !D.mosaCard) {
        D.mosaCard = true; save();
        const g = R.Items?.giveSig?.("cangyou", "mosaCard");
        api.dlg("滄龍名片", { name: "滄龍名片", face: "滄", color: "#2a6a9a" },
          "滄龍沉進了大洋的深處。水面上漂著一張被泡軟的卡片——上面畫著一隻滄龍，背面用小孩的字寫著一個名字。<br><br>" + (g?.ok ? `<b>${g.text}</b>` : "（專武欄已經有東西了）"), [], "", true);
      }
    }
    sync(true);

    // ===== 滄游（使用者 11/22；台詞是使用者寫的）=====
    const CY = MAP.cangyuu;
    const N_CY = { name: "滄游", face: "滄", color: "#2a6a9a" }, N_ME = { name: "蒼幽", face: "蒼", color: "#1f3a8a" };
    let met = false, anim = null;
    function cyTalk() {
      if (anim) return;
      met = true;
      const steps = [{ n: N_CY, text: "和我一起待在這裡吧，蒼幽。" }];
      if (isCy) steps.push(
        { n: N_ME, text: "不...我還有...我的事情..." },
        { n: N_CY, text: "為甚麼...你明明能在這裡，作為金字塔的塔頂的...你就這麼甘願做館主的殘骸嗎？" },
        { n: N_ME, text: "這種野蠻的地方才不會是我的未來...不然館主才不會用文明建造這個水族館！" },
        { n: N_CY, text: "我可是你的驅動力..我哪會不知道你心中的飢渴！擁抱這片海洋吧！" });
      api.dlgSeq("滄游", steps, `<button type="button" class="primary" data-act="cyTransform">……</button>`);
    }
    function cyTransform() {
      api.closePanel();
      api.setBusy(true);
      anim = { t0: performance.now() };
      api.sfx("sounds/cangyou-whale.mp3");
      setTimeout(() => api.sfx("sounds/cangyou-bubbles.mp3"), 2600);
      setTimeout(() => { api.setBusy(false); api.go(`${api.base()}&room=wild&boss=mosasaur&enc=aqw-mosasaur&init=0`, "滄游・滄龍"); }, 4300);
    }
    const hash = (i) => { const x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); };
    // 滄游：和玩家一樣的方塊（中間一個「滄」字）；變身時依序變成幽靈魚、幽靈墨魚、幽靈虎鯨，最後被泡沫埋沒
    function drawCy(n, now) {
      const T = anim ? (now - anim.t0) / 1000 : -1, x = n.x, y = n.y + Math.sin(now / 500) * 3;
      const art = R.CHARACTERS?.cangyou?.drawFishArt;
      ctx.save();
      if (T < 0.9) {
        const sh = T > 0 ? Math.sin(now / 30) * 3 * T : 0, H = 46;
        ctx.globalAlpha = T > 0 ? 1 - T / 1.2 : 1;
        if (T > 0) { ctx.fillStyle = `rgba(143,211,234,${0.3 * T})`; ctx.beginPath(); ctx.arc(x, y, 50 + T * 40, 0, Math.PI * 2); ctx.fill(); }
        api.rr(x - H / 2 + sh, y - H / 2, H, H, 8); ctx.fillStyle = "#e8f4fb"; ctx.fill(); ctx.strokeStyle = n.color; ctx.lineWidth = 3; ctx.stroke();
        text("滄", x + sh, y + 7, n.color, 20, 900);
      } else if (art) {
        const stage = T < 1.8 ? 0 : T < 2.7 ? 1 : 2, sc = [2.2, 2.0, 1.6][stage], local = T - [0.9, 1.8, 2.7][stage];
        ctx.globalAlpha = Math.min(1, local * 4) * (T > 3.4 ? Math.max(0, 1 - (T - 3.4) / 0.6) : 1);
        ctx.translate(x, y); ctx.scale(sc, sc); art(ctx, 0, 0, -Math.PI / 2 + Math.sin(now / 400) * 0.2, stage, now, false);
      }
      ctx.restore();
      // 泡沫：變成虎鯨之後湧上來把牠埋沒
      if (T > 2.4) {
        const q = Math.min(1, (T - 2.4) / 1.4);
        for (let i = 0; i < 70 * q; i++) {
          const a = hash(i) * Math.PI * 2, d = hash(i + 3) * 130 * (0.4 + q), bx = x + Math.cos(a) * d, by = y + Math.sin(a) * d * 0.8 - ((now / 20 + i * 13) % 60), r = 4 + hash(i + 7) * 12;
          ctx.globalAlpha = 0.85; ctx.fillStyle = "rgba(170,220,250,.35)"; ctx.strokeStyle = "rgba(220,245,255,.95)"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      return true;
    }
    function update(dt, now) {
      if (now - (update.last || 0) > 400) { update.last = now; sync(false); }
      if (CY && !met && !anim && !api.isBusy() && dist(me.x, me.y, CY.x, CY.y) < 170) cyTalk();
    }
    function talkHook(n) { if (n.id === "cangyuu") { cyTalk(); return true; } return false; }
    function act(a) { if (a === "cyTransform") { cyTransform(); return true; } return false; }
    function drawNpc(n, now) { return n.id === "cangyuu" ? drawCy(n, now) : false; }
    function click(p) {
      if (dist(p.x, p.y, MAP.exit.x, MAP.exit.y) < 70) { K.reach(MAP.exit, 80, () => api.changeScene(null, { x: R.MAPS.AQ00618.wildDoor.x - 90, y: R.MAPS.AQ00618.wildDoor.y }, "回到水族館的大廳……")); return true; }
      return false;
    }
    // 地圖：看起來一樣是一座大型水族館（每片水域都是一個大水缸）
    function drawFloor(now, x0, y0) {
      ctx.fillStyle = "#04080e"; ctx.fillRect(x0, y0, 1280, 720);
      for (const l of MAP.links) { ctx.fillStyle = "#0e2232"; ctx.fillRect(l.x, l.y, l.w, l.h); }
      for (const g of Object.values(MAP.regions)) {
        const gr = ctx.createLinearGradient(0, g.y, 0, g.y + g.h); gr.addColorStop(0, g.water); gr.addColorStop(1, "#03060a");
        ctx.fillStyle = gr; ctx.fillRect(g.x, g.y, g.w, g.h);
        ctx.save(); ctx.beginPath(); ctx.rect(g.x, g.y, g.w, g.h); ctx.clip();
        let s2 = g.x + g.y; const r2 = () => ((s2 = (s2 * 9301 + 49297) % 233280) / 233280);
        if (g.id === "cold") { ctx.fillStyle = "rgba(235,248,255,.75)"; ctx.fillRect(g.x, g.y, g.w, 40); for (let i = 0; i < 10; i++) { const x = g.x + r2() * g.w, y = g.y + 60 + r2() * (g.h - 120); ctx.beginPath(); ctx.moveTo(x - 60, y); ctx.lineTo(x, y - 40 - r2() * 40); ctx.lineTo(x + 70, y); ctx.fill(); } }
        if (g.id === "swamp") for (let i = 0; i < 30; i++) { const x = g.x + r2() * g.w, y = g.y + r2() * g.h; ctx.strokeStyle = "rgba(90,120,50,.6)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y + 40); ctx.quadraticCurveTo(x + Math.sin(now / 900 + i) * 20, y, x + 6, y - 50); ctx.stroke(); }
        if (g.id === "deep") for (let i = 0; i < 40; i++) { const x = g.x + r2() * g.w, y = g.y + r2() * g.h; ctx.fillStyle = `rgba(150,170,255,${0.15 + 0.25 * Math.sin(now / 500 + i)})`; ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill(); }
        if (g.id === "sea") for (let i = 0; i < 12; i++) { const x = g.x + r2() * g.w; ctx.fillStyle = "rgba(220,200,150,.25)"; ctx.beginPath(); ctx.arc(x, g.y + g.h - 10, 20 + r2() * 30, Math.PI, 0); ctx.fill(); }
        ctx.strokeStyle = "rgba(255,255,255,.05)"; ctx.lineWidth = 3;
        for (let k = 0; k < Math.floor(g.h / 90); k++) { ctx.beginPath(); for (let x = g.x; x <= g.x + g.w; x += 40) ctx.lineTo(x, g.y + 40 + k * 90 + Math.sin(x / 80 + now / 700 + k) * 8); ctx.stroke(); }
        ctx.restore();
        // 玻璃和名牌（看起來還是一座水族館）
        ctx.strokeStyle = g.glass; ctx.globalAlpha = 0.5; ctx.lineWidth = 8; ctx.strokeRect(g.x, g.y, g.w, g.h); ctx.globalAlpha = 1;
        const lx = g.x + g.w / 2, ly = g.y + 30;
        api.rr(lx - 70, ly - 16, 140, 28, 6); ctx.fillStyle = "rgba(6,12,22,.85)"; ctx.fill(); ctx.strokeStyle = g.glass; ctx.lineWidth = 1.5; ctx.stroke();
        text(g.safe ? g.name : `${g.name}（原始）`, lx, ly + 3, "#d8ecff", 14, 900);
      }
      // 出口
      const X = MAP.exit;
      ctx.fillStyle = "#1a2a3a"; ctx.fillRect(X.x - 60, X.y - 50, 120, 90); ctx.strokeStyle = "#8ac8ff"; ctx.lineWidth = 3; ctx.strokeRect(X.x - 60, X.y - 50, 120, 90);
      text("回到水族館", X.x, X.y + 62, "#d8ecff", 13, 900);
    }
    // 地圖上的生物：照物種本來的樣子
    const SP = { sardines: ["沙丁魚群", 22], icefish: ["冰魚", 18], lanterns: ["燈籠魚", 18], loaches: ["泥鰍", 18], barracudas: ["梭魚", 24], seals: ["海豹", 26], vipers: ["蝰魚", 22], gars: ["鱷雀鱔", 24],
      megalodon: ["巨齒鯊", 54], livyatan: ["利維坦鯨", 58], dunkleosteus: ["鄧氏魚", 50], deinosuchus: ["恐鱷", 52], mosasaur: ["滄龍", 70] };
    function drawEnemy(e, now, red) {
      const s = SP[e.kind]; if (!s) return false;
      const face = e.tx != null ? Math.atan2(e.ty - e.y, e.tx - e.x) : 0;
      R.SeaArt?.draw(ctx, s[0], e.x, e.y, s[1], face, now, null, e.x / 50);
      const tier = e.kind === "mosasaur" ? 3 : /^aqw-t(\d)/.exec(e.id)?.[1] | 0, d = tier - (D.chain ?? 0);
      // 食物鏈：比你高的標紅色，和你一樣的標黃色，比你低的標綠色
      const col = d > 0 ? "#ff6a5a" : d === 0 ? "#f2c200" : "#6ad88a";
      text(NAMES[tier], e.x, e.y - s[1] - 14, col, 11, 900);
      if (red) { ctx.strokeStyle = "#e53935"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, e.y, s[1] + 14, 0, Math.PI * 2); ctx.stroke(); }
      return true;
    }
    function drawTop(now) {
      // 畫面左上：食物鏈等級
      const e = eaten(), r = D.chain ?? 0;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      const cw = ctx.canvas.width, k = cw / 1280;
      ctx.scale(k, k);
      const x = 20, y = 140;
      api.rr(x, y, 230, 96, 10); ctx.fillStyle = "rgba(6,14,24,.82)"; ctx.fill(); ctx.strokeStyle = "#5ab8d8"; ctx.lineWidth = 2; ctx.stroke();
      ctx.textAlign = "left"; ctx.fillStyle = "#d8ecff"; ctx.font = "900 15px 'Noto Sans TC', sans-serif"; ctx.fillText(`食物鏈：${NAMES[r]}`, x + 12, y + 24);
      ctx.font = "700 12px 'Noto Sans TC', sans-serif"; ctx.fillStyle = "#a8c8e8";
      const lines = [`小魚 ${Math.min(e.t0, NEED.t0)} / ${NEED.t0}${r >= 1 ? "（夠了）" : ""}`, `捕食者 ${Math.min(e.t1, NEED.t1)} / ${NEED.t1}${r >= 2 ? "（夠了）" : r < 1 ? "（先吃小魚）" : ""}`, `掠食者 ${e.t2} / ${MAP.predators.length}${r < 2 ? "（還打不贏）" : ""}`];
      lines.forEach((l, i) => ctx.fillText(l, x + 12, y + 46 + i * 17));
      if (banner) {
        const t = (now - banner.t) / 2600;
        if (t > 1) banner = null;
        else { ctx.textAlign = "center"; ctx.globalAlpha = Math.min(1, (1 - t) * 3); ctx.fillStyle = "#e8f6ff"; ctx.font = "900 44px 'Noto Sans TC', sans-serif"; ctx.fillText(banner.text, 640, 300); ctx.globalAlpha = 1; }
      }
      ctx.restore();
    }
    function mini(dot, now) {
      dot(MAP.exit.x, MAP.exit.y, 5, "#8ac8ff");
      if (CY) dot(CY.x, CY.y, 7, `rgba(90,184,216,${0.6 + 0.4 * Math.sin(now / 200)})`);
      if ((D.chain ?? 0) >= 2) for (const id of ["sea", "cold", "deep", "swamp"]) { const g = MAP.regions[id]; if (!D.ate.preds.includes(`aqw-t2-${id}`)) dot(g.x + g.w / 2, g.y + g.h / 2, 6, `rgba(255,106,90,${0.6 + 0.4 * Math.sin(now / 200)})`); }
    }
    return { update, click, drawFloor, drawEnemy, drawTop, mini, talk: talkHook, act, drawNpc, dbg: { D, eaten, sync, rankFrom } };
  }
})();
