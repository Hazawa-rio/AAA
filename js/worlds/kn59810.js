/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/kn59810.js": "20261114042342" });
// #KN59810 克亞貝魯巴斯諾（A 級：街機空戰射擊遊戲的內部）
//   關卡門 STAGE 1～3：進去是「射擊小遊戲」（直式捲軸）：滑鼠或方向鍵／WASD 移動（Shift 慢速），自動射擊
//     生命改成「殘機」（3 架），被打中就少一架；殘機用完是 CONTINUE 畫面：投 10 金幣接關，或放棄
//     分數：打倒敵機、頭目、剩下的殘機、沒有被打中（No Miss）都會加分
//   KN59810-01 吃了硬幣的頭目：撿齊三段除錯碼（地上閃爍的亂碼格子）→ STAGE 3：頭目吃了硬幣打不倒（∞），除錯碼讓牠肚子裡的硬幣露出來，打掉硬幣才打得倒
//   KN59810-02 最高分的名字：問大家「???」的事（粉色短髮、紅色的雙角）→ STAGE 2 打出比 ??? 更高的分數 → ??? 出現
//   KN59810-03 卡在接關畫面的人：替 1P 的機師小藍打完 STAGE 1
(function () {
  const R = (window.RPG = window.RPG || {});
  R.WorldHooks = R.WorldHooks || {};

  R.WorldHooks.KN59810 = function (api) {
    const { MAP, trip, run, me, CH, BAG, toast, text, save, dist, esc } = api;
    const K = R.BKit(api), ctx = api.ctx();
    const Q1 = K.q("KN59810-01"), Q2 = K.q("KN59810-02"), Q3 = K.q("KN59810-03");
    Q1.glitch = Q1.glitch || {}; Q2.asked = Q2.asked || {};
    const npc = (id) => MAP.npcs.find((n) => n.id === id);
    const best = () => trip.qdata.kn?.best || {};
    // 從銀河大元帥的戰鬥回來
    const LB = run.lastBattle;
    if (LB && LB.variant === "galaxy") {
      delete run.lastBattle; save();
      if (LB.result === "win") {
        (trip.qdata.kn = trip.qdata.kn || {}).galaxy = true;
        R.Profile.unlock?.("knGalaxy");
        setTimeout(() => {
          if (K.is("KN59810-05", "knLegend")) K.adv("KN59810-05", "打倒了銀河大元帥！回去告訴 2P");
          toast("銀河大元帥的戰機墜落了。……回到酒館後，好像可以把這台機台買下來");
        }, 400);
      }
    }

    // ================= 射擊小遊戲 =================
    // 操作：方向鍵／WASD 移動（Shift 慢速），自動射擊，空白鍵＝駕駛員技能（量表滿了才能用），Esc 暫停
    // 駕駛員技能（照角色的大招）：弗爾斯勒＝強化大箭矢、伊爾舒＝揮砍前方（砍掉子彈）、薇薇拉＝周圍噴孢子、觀知命＝陰陽陣
    //   霍夫曼＝移動時留下殘影（期間不吃子彈）、瑪莉卡＝前方火焰鞭打、蒼幽＝蝠鱝夫人、巴斯提安＝前方舉盾
    //   悠魘＝觸手＋全畫面黑色抖動馬賽克、紅色 ERROR，秒殺所有敵機（這一趟只能用一次）
    // 隱藏：STAGE 1 往左下角的角落一直靠 18 秒 → 隱藏的機庫，拿到「她的戰機」（殘機 10、一直往前發射雷射、沒有駕駛員；只能在 STAGE 1 用，不算排行榜）
    const SKILL = R.KnStg.SKILL;
    const kn = () => (trip.qdata.kn = trip.qdata.kn || {});
    const Q4 = K.q("KN59810-04"); Q4.got = Q4.got || {};
    const TIX_NEED = 9;
    const tixCount = () => Object.keys(Q4.got).length;
    // 射擊小遊戲（js/kn-stg.js）：時空裡的設定
    function playStage(stage, done, opt = {}) {
      return R.KnStg.play({
        stage, ch: CH, her: !!opt.her, host: document.getElementById("wxStage"), music: "sounds/bgm-kn.mp3",
        muted: () => api.isMuted(), busy: (v) => api.setBusy(v), pauseBgm: api.pauseBgm, resumeBgm: api.resumeBgm,
        gold: () => run.gold, pay: (n) => { run.gold -= n; save(); api.renderHud(); }, contCost: 10,
        coinOpen: () => !!(Q1.code || BAG.count(run.items, "bugCode") >= 3),
        rival: MAP.rivalScore, best: (st) => best()[st] || 0,
        errorUsed: () => !!kn().errorUsed, useError: () => { kn().errorUsed = true; save(); },
        herOwned: () => !!kn().herPlane, gainHer: () => { kn().herPlane = true; save(); R.Profile.unlock?.("knHer"); },
        // 兌換券：接了委託才會出現
        tickets: K.is("KN59810-04", "knTicket") ? {
          left: (st) => [0, 1, 2].filter((i) => !Q4.got[`${st}-${i}`]),
          take: (st, i) => { Q4.got[`${st}-${i}`] = true; save(); api.renderHud(); },
        } : null,
        onFall: () => {
          // 在扭曲次元墜落：在戰鬥系統裡和銀河大元帥的戰機打
          kn().fell = true; save();
          api.go(`${api.base()}&room=arcade&boss=galaxy&init=0&out=1`, "銀河大元帥！");
        },
        onDone: done,
      });
    }

    // ================= 關卡門 =================
    function gatePanel(gt) {
      const b = best()[gt.stage], herOk = gt.stage === 1 && kn().herPlane;
      api.openPanel(gt.name, `<p class="wx-p">一道發光的關卡門。門上寫著：<b>${esc(gt.name)}</b>${gt.stage === 3 ? "——門縫裡傳出嚼硬幣的聲音" : ""}。</p>
        <p class="tv-note">射擊小遊戲：方向鍵／WASD 移動（Shift 慢速），自動射擊，<b>空白鍵＝駕駛員技能</b>（${esc(SKILL[CH.id]?.name || "揮砍前方")}；量表滿了才能用）。殘機 3 架；用完可以投 10 金幣接關。${K.is("KN59810-04", "knTicket") ? `<br>兌換券：關卡裡會飄下來，碰到就撿起來；頭目分走的那張要打牠 40 下才會掉（這一關還差 ${[0, 1, 2].filter((i) => !Q4.got[`${gt.stage}-${i}`]).length} 張）` : ""}${b ? `<br>你在這一關的最高分：${b}` : ""}${herOk ? "<br>她的戰機：殘機 10 架、一直往前發射雷射、沒有駕駛員（沒有技能）。只能在這一關用，不算排行榜" : ""}</p>
        <div class="tv-row"><button type="button" class="primary" data-act="knPlay" data-s="${gt.stage}">投幣開始</button>${herOk ? `<button type="button" class="primary" data-act="knPlay" data-s="1" data-her="1" style="background:#e85aa8;border-color:#e85aa8">用她的戰機出擊</button>` : ""}<button type="button" class="ghost" data-close>先不要</button></div>`);
    }
    function play(stage, her) {
      api.closePanel();
      playStage(stage, (r) => {
        if (r.fall) return;                                   // 已經去戰鬥了
        const k = kn(); k.best = k.best || {};
        if (r.clear && !r.her) k.best[stage] = Math.max(k.best[stage] || 0, r.score);     // 她的戰機不算排行榜
        save(); api.renderHud();
        if (K.is("KN59810-04", "knTicket") && tixCount() >= TIX_NEED) K.adv("KN59810-04", "九張兌換券都撿回來了！回去找出票口的小票");
        if (r.gotHer && !r.clear) return toast("拿到了「她的戰機」！STAGE 1 的關卡門可以選它出擊");
        if (!r.clear) return toast(stage === 3 && !Q1.code ? "頭目吃了硬幣，打不倒……也許機台裡有什麼「除錯」的方法" : "沒有過關。再來一次吧");
        toast(`STAGE ${stage} CLEAR！${r.her ? "（她的戰機）" : `SCORE ${r.score}`}`);
        if (stage === 3 && K.is("KN59810-01", "knStage3")) K.adv("KN59810-01", "頭目吐出了硬幣！回去找投幣口的看守者");
        if (stage === 1 && K.is("KN59810-03", "knStage1")) K.adv("KN59810-03", "STAGE 1 過關了。回去找小藍");
        if (stage === 2 && K.is("KN59810-02", "knScore")) {
          if (r.score > MAP.rivalScore) { rivalAppears(r.score); K.adv("KN59810-02", "刷新了最高分！回去找 AAA"); }
          else toast(`分數 ${r.score}，還沒超過 ??? 的 ${MAP.rivalScore}。No Miss 和剩下的殘機都會加很多分`);
        }
      }, { her });
    }
    // ??? ：粉色短髮、紅色的雙角
    const RIVAL = { name: "???", color: "#e88ab8", face: "？" };
    function rivalAppears(score) {
      api.dlgSeq("排行榜", [
        { n: RIVAL, text: `（排行榜的第一行閃了一下：${score}——你的名字。接著，排行榜後面走出一個人。）` },
        { n: RIVAL, text: "（粉色的短髮，頭上兩支紅色的角。她看了看排行榜，又看了看你，笑了。）" },
        { n: RIVAL, text: "……被你刷新了啊。這台機台，我寫的時候可是很用心的。" },
        { n: RIVAL, text: "名字？現在還不能告訴你。等你走到更遠的地方——很遠很遠的地方——你就會知道了。" },
        { n: RIVAL, text: "（她按了三次 A，在排行榜第二行留下「???」，然後像沒存檔的進度一樣，消失了。）" },
      ], `<button type="button" class="primary" data-close>……</button>`);
    }

    // ================= 除錯碼、問 ??? 的事 =================
    function glitch(gl) {
      if (Q1.glitch[gl.id]) return toast("這格已經不閃了");
      if (!K.is("KN59810-01", "knBug")) return toast("地上的格子一閃一閃的，看起來像是亂碼");
      Q1.glitch[gl.id] = true;
      BAG.add(run.items, "bugCode", 1); save(); api.renderHud();
      api.sfx?.("sounds/robot-move.mp3");
      const n = Object.keys(Q1.glitch).length;
      if (n >= 3) { Q1.code = true; save(); K.adv("KN59810-01", "三段除錯碼都拼起來了：「SHOW_COIN」。去 STAGE 3"); }
      else toast(`撿到一段除錯碼（${n} / 3）：「${["SHOW_", "CO", "IN"][n - 1]}……」`);
    }
    const ASK = {
      p2: ["???？我看過她玩。她玩的時候，從來不看螢幕——好像她早就知道子彈會從哪裡來。", "她的頭髮是粉色的，短短的。……還有，她頭上有兩支紅色的角。我以為是髮飾，可是會動。"],
      cat: ["喵。（嗶）", "（像素貓叼來一根粉紅色的頭髮，放在你腳邊。）"],
      keeper: ["那個 ??? 從來沒有投過幣。她每次都是直接出現在關卡裡面。", "好像整台機台都是她的一樣。"],
    };
    function npcExtra(n) {
      if (ASK[n.id] && K.is("KN59810-02", "knAsk")) return `<button type="button" class="ghost dlg-ask" data-act="knAsk" data-n="${n.id}"><b>委託</b>：問問「???」的事${Q2.asked[n.id] ? "（問過了）" : ""}</button>`;
      return "";
    }
    function ask(id) {
      const n = npc(id);
      Q2.asked[id] = true; save(); api.renderHud();
      api.dlgSeq(n.name, ASK[id].map((t) => ({ n, text: t })), `<button type="button" class="ghost" data-close>謝謝</button>`);
      if (Object.keys(ASK).every((k) => Q2.asked[k])) K.adv("KN59810-02", `問到了：粉色的短髮、紅色的雙角。去 STAGE 2 打出比 ${MAP.rivalScore} 更高的分數`);
    }

    // ================= 點擊、選項 =================
    function click(p) {
      const gt = MAP.gates.find((x) => K.hit(p, x, 80));
      if (gt) { K.reach({ x: gt.x, y: gt.y + 100 }, 70, () => gatePanel(gt)); return true; }
      const gl = MAP.glitches.find((x) => K.hit(p, x, 40));
      if (gl) { K.reach(gl, 70, () => glitch(gl)); return true; }
      if (p.x > MAP.board.x - 20 && p.y > MAP.board.y && p.y < MAP.board.y + MAP.board.h) { K.reach({ x: MAP.board.x - 60, y: p.y }, 90, boardPanel); return true; }
      return false;
    }
    function boardPanel() {
      const rows = [["???", MAP.rivalScore], ["AAA", MAP.rivalScore - 100], ["CAT", 51200], ["2P", 0]];
      const mine = Math.max(...Object.values(best()), 0);
      if (mine) rows.push([CH.name, mine]);
      rows.sort((a, b) => b[1] - a[1]);
      api.openPanel("排行榜", `<div style="font:700 15px/1.9 monospace;background:#0a0a24;color:#e8e8ff;padding:14px 18px;border-radius:8px">${rows.map((r, i) => `<div style="display:flex;justify-content:space-between;${r[0] === CH.name ? "color:#ffd84a" : ""}"><span>${i + 1}. ${esc(r[0])}</span><span>${r[1]}</span></div>`).join("")}</div>
        <p class="tv-note">第一名的 ??? 只差 AAA 100 分。……好像是故意的。</p>`);
    }
    function act(a, b) {
      if (a === "knPlay") { play(+b.dataset.s, b.dataset.her === "1"); return true; }
      if (a === "knAsk") { ask(b.dataset.n); return true; }
      return false;
    }

    // ================= 畫面 =================
    function drawFloor(now, x0, y0) {
      ctx.fillStyle = "#0e0e2a"; ctx.fillRect(x0, y0, 1280, 720);
      ctx.strokeStyle = "rgba(90,120,255,.16)"; ctx.lineWidth = 1;
      for (let x = Math.floor(x0 / 64) * 64; x < x0 + 1280; x += 64) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + 720); ctx.stroke(); }
      for (let y = Math.floor(y0 / 64) * 64; y < y0 + 720; y += 64) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + 1280, y); ctx.stroke(); }
      // 標題畫面的廣場
      const T = MAP.title;
      ctx.fillStyle = "rgba(90,106,255,.12)"; ctx.fillRect(T.x - 420, T.y - 140, 840, 280);
      text("KYABERUBASUNO", T.x, T.y - 30, "#ff5ac8", 54, 900);
      text("克亞貝魯巴斯諾", T.x, T.y + 20, "#8ab0ff", 20, 900);
      if (Math.floor(now / 600) % 2) text("PRESS START", T.x, T.y + 80, "#ffffff", 18, 900);
      // 關卡門
      for (const gt of MAP.gates) {
        ctx.fillStyle = "#14143a"; ctx.fillRect(gt.x - 90, gt.y - 140, 180, 200);
        ctx.strokeStyle = gt.col; ctx.lineWidth = 6; ctx.strokeRect(gt.x - 90, gt.y - 140, 180, 200);
        ctx.fillStyle = gt.col; ctx.globalAlpha = 0.25 + 0.15 * Math.sin(now / 300 + gt.stage); ctx.fillRect(gt.x - 84, gt.y - 134, 168, 188); ctx.globalAlpha = 1;
        text(gt.name, gt.x, gt.y - 40, "#ffffff", 22, 900);
        if (best()[gt.stage]) text(`BEST ${best()[gt.stage]}`, gt.x, gt.y, "#ffd84a", 13, 900);
        if (gt.stage === 3 && !trip.done.includes("KN59810-01")) text("（嚼——嚼——）", gt.x, gt.y + 30, "#e83a8a", 12, 900);
      }
      // 排行榜
      const Bd = MAP.board; ctx.fillStyle = "#0a0a24"; ctx.fillRect(Bd.x, Bd.y, Bd.w, Bd.h); ctx.strokeStyle = "#5aff9a"; ctx.lineWidth = 4; ctx.strokeRect(Bd.x, Bd.y, Bd.w, Bd.h);
      text("HIGH SCORE", Bd.x + Bd.w / 2, Bd.y + 40, "#5aff9a", 16, 900);
      text("1. ???", Bd.x + Bd.w / 2, Bd.y + 90, "#ffd84a", 15, 900); text(String(MAP.rivalScore), Bd.x + Bd.w / 2, Bd.y + 114, "#ffd84a", 14, 900);
      text("2. AAA", Bd.x + Bd.w / 2, Bd.y + 160, "#e8e8ff", 15, 900);
      // 接關畫面的房間
      const C = MAP.continueRoom; ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(C.x, C.y, C.w, C.h);
      text("CONTINUE?", C.x + C.w / 2, C.y + 60, "#ffffff", 26, 900);
      text(trip.done.includes("KN59810-03") ? "GAME CLEAR" : String(9 - (Math.floor(now / 1000) % 10)), C.x + C.w / 2, C.y + 130, trip.done.includes("KN59810-03") ? "#5aff9a" : "#ffd84a", 46, 900);
      // 亂碼格子
      for (const gl of MAP.glitches) {
        if (Q1.glitch[gl.id]) continue;
        for (let i = 0; i < 9; i++) { ctx.fillStyle = ["#5aff9a", "#ff5ac8", "#5a6aff", "#ffd84a"][(i + Math.floor(now / 90)) % 4]; ctx.globalAlpha = 0.4 + 0.6 * ((Math.floor(now / 70) + i) % 3 === 0 ? 1 : 0.3); ctx.fillRect(gl.x - 30 + (i % 3) * 20, gl.y - 30 + Math.floor(i / 3) * 20, 18, 18); }
        ctx.globalAlpha = 1;
        if (K.is("KN59810-01", "knBug")) api.marker(gl.x, gl.y - 50, now, "#f2c200");
      }
      // 投幣口
      ctx.fillStyle = "#3a3a5a"; ctx.fillRect(MAP.portal.x - 40, MAP.portal.y + 40, 80, 14); text("INSERT COIN", MAP.portal.x, MAP.portal.y + 78, "#ffd84a", 13, 900);
    }
    function draw(now) {
      if (K.is("KN59810-01", "knStage3")) api.marker(MAP.gates[2].x, MAP.gates[2].y - 170, now, "#f2c200");
      if (K.is("KN59810-02", "knScore")) api.marker(MAP.gates[1].x, MAP.gates[1].y - 170, now, "#f2c200");
      if (K.is("KN59810-03", "knStage1")) api.marker(MAP.gates[0].x, MAP.gates[0].y - 170, now, "#f2c200");
      if (K.is("KN59810-05", "knLegend") && !K.is("KN59810-01", "knStage3")) api.marker(MAP.gates[2].x, MAP.gates[2].y - 170, now, "#c86aff");
      if (K.is("KN59810-04", "knTicket")) MAP.gates.forEach((gt) => { if ([0, 1, 2].some((i) => !Q4.got[`${gt.stage}-${i}`])) text("兌換券", gt.x, gt.y - 190, "#ff9a2a", 13, 900); });
    }
    function stageText(id, st) {
      if (st?.type === "knBug") return `${st.text}（${Object.keys(Q1.glitch).length} / 3）`;
      if (st?.type === "knAsk") return `${st.text}（${Object.keys(Q2.asked).length} / 3）`;
      if (st?.type === "knTicket") return `${st.text}（${tixCount()} / ${TIX_NEED}）`;
      if (st?.type === "knScore") return `${st.text}（你的最高分 ${best()[2] || 0}）`;
      return null;
    }
    function mini(dot, now) {
      const bl = `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`;
      if (K.is("KN59810-01", "knBug")) for (const gl of MAP.glitches) if (!Q1.glitch[gl.id]) dot(gl.x, gl.y, 4, bl);
      for (const gt of MAP.gates) dot(gt.x, gt.y, 4, gt.col);
    }
    function drawEnemy(e, now, red) { return K.enemyArt(e, now, red, { jets: ["pixelJet", 2], jets3: ["pixelJet", 3], grunts: ["pixelGrunt", 2] }); }
    return { click, act, npcExtra, draw, drawFloor, drawEnemy, stageText, mini, _play: playStage };
  };
})();
