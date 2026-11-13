/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/li44444.js": "20261114042342" });
// #LI44444 李家大宅（A 級：中式恐怖、規則怪談）
//   時辰：戌 → 亥 → 子 → 丑 一直輪（一輪約 4 分鐘；子時 70 秒）。子時喜轎會從正廳飄出來，繞前院三圈，再從後門出去
//   陰氣（0～100）：違反規矩、被幻影碰到、子時待在正廳都會上升；站在長明燈旁會慢慢散掉
//     陰氣越高看得越少；70 以上開始看到不該看到的東西；滿了就昏過去（失去 25% 生命，醒來在大門外）
//   宅中規矩（門上貼的五條；第四條是假的）：子時莫叩門、二房的簾子不可揭、廚房的紅花不可摘、（假）子時到正廳避一避、有人叫全名不要應
//   幻影（紅衣鬼、無頭鬼、斷腿鬼、斷臂鬼）：打不了，碰到會受傷（戰鬥外）。完成「好冤呀」之後就安息了
//   八卦鏡（第七位道士的遺物）：照一下（M）6 秒內看得見幻影和血案的痕跡，陰氣 +6
//   LI44444-01 第七位道士的遺物：找到三張道士的筆記 → 到正廳供桌下拿八卦鏡
//   LI44444-02 子時的喜轎：子時跟著喜轎繞前院三圈（不能擋在轎子前面）→ 後門外打試煉 Boss「囍」（王小妹的骨和皮肉）
//   LI44444-03 好冤呀：用八卦鏡找到童謠裡的五個痕跡 → 回答孩子李家血案的始末
(function () {
  const R = (window.RPG = window.RPG || {});
  R.WorldHooks = R.WorldHooks || {};

  R.WorldHooks.LI44444 = function (api) {
    const { MAP, trip, run, me, CH, BAG, toast, text, save, dist, esc, panel } = api;
    const K = R.BKit(api), ctx = api.ctx();
    const S = (trip.qdata.li = trip.qdata.li || {});
    S.t = S.t ?? 0; S.yin = S.yin ?? 0; S.notes = S.notes || {}; S.traces = S.traces || {};
    const Q2 = K.q("LI44444-02");
    const rested = () => trip.done.includes("LI44444-03");
    const ACT = (id) => K.active(id);
    const anyActive = () => ["LI44444-01", "LI44444-02", "LI44444-03"].some(ACT);

    // ===== 時辰 =====
    const HOURS = [{ name: "戌時", len: 60 }, { name: "亥時", len: 60 }, { name: "子時", len: 70 }, { name: "丑時", len: 60 }];
    const CYCLE = HOURS.reduce((a, h) => a + h.len, 0);
    function hourAt(t) { let x = t % CYCLE; for (const h of HOURS) { if (x < h.len) return { ...h, at: x }; x -= h.len; } return HOURS[0]; }
    const ZI_START = HOURS[0].len + HOURS[1].len;
    const isZi = () => hourAt(S.t).name === "子時";
    const ziAt = () => (S.t % CYCLE) - ZI_START;              // 子時開始後幾秒

    // ===== 陰氣 =====
    let blackout = false;
    function addYin(n, why) {
      if (rested() && n > 0) n = Math.ceil(n / 2);
      const before = S.yin;
      S.yin = Math.max(0, Math.min(100, S.yin + n));
      if (why && n > 0) toast(why);
      if (S.yin >= 70 && before < 70) toast("……你開始看見一些不該看見的東西");
      save();
      if (S.yin >= 100 && !blackout) faint();
    }
    function faint() {
      blackout = true;
      const n = Math.min(Math.round(api.maxHp() * 0.25), Math.max(0, run.hp - 1));
      run.hp -= n; S.yin = 45; save(); api.renderHud();
      api.dlg("……", { name: "？？？", color: "#1d1d1f", face: "　" }, `眼前一黑。等你回過神來，已經躺在李家的大門外了。身上冷得像剛從井裡撈起來。（失去 ${n} 生命，陰氣降到 45）`, `<button type="button" class="ghost" data-close>……</button>`);
      Object.assign(me, { x: MAP.arrive.x, y: MAP.arrive.y, target: null, then: null });
      setTimeout(() => { blackout = false; }, 1500);
    }
    const viewR = () => Math.max(110, 270 - S.yin * 1.5) * (S.mirrorUntil > performance.now() ? 1.15 : 1);
    const hurt = (pct, label) => {
      const n = Math.min(Math.round(api.maxHp() * pct), Math.max(0, run.hp - 1));
      if (n > 0) { run.hp -= n; save(); api.renderHud(); api.fx.push({ k: "num", x: me.x, y: me.y - 40, text: `-${n}`, color: "#c40a1e", t: performance.now(), dur: 900 }); }
      if (label) toast(label);
    };

    // ===== 場景：在哪個房間 =====
    const inRoom = (id, x = me.x, y = me.y) => { const r = MAP.rooms[id]; return x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h; };
    const inside = () => me.y > 230 && me.y < 2060;

    // ===== 喜轎 =====
    const LAP = 18, LAPS = 3, Y = MAP.yard;
    function sedanPos() {
      if (!isZi()) return null;
      const a = ziAt();
      if (a < LAP * LAPS) { const th = -Math.PI / 2 + (a / LAP) * Math.PI * 2; return { x: Y.cx + Math.cos(th) * Y.rx, y: Y.cy + Math.sin(th) * Y.ry, ang: th + Math.PI / 2, lap: Math.floor(a / LAP) + 1 }; }
      const k = Math.min(1, (a - LAP * LAPS) / 14), top = { x: Y.cx, y: Y.cy - Y.ry };
      return { x: top.x, y: top.y + (MAP.grave.y + 40 - top.y) * k, ang: -Math.PI / 2, out: true, k };
    }

    // ===== 幻影 =====
    const ph = MAP.phantoms.map((p, i) => ({ ...p, hx: p.x, hy: p.y, tx: p.x, ty: p.y, wait: i, hitAt: 0, chaseUntil: 0 }));
    function updatePhantoms(dt, now) {
      if (rested()) return;
      for (const p of ph) {
        const chasing = p.chaseUntil > now;
        if (p.id === "arm" && !S.curtain && !chasing && S.yin < 60) continue;          // 二哥：簾子沒揭開、陰氣不高的時候不出來
        const sp = p.id === "legs" ? 34 : chasing ? 120 : 58;
        if (chasing) { p.tx = me.x; p.ty = me.y; }
        else if ((p.wait -= dt) <= 0) { const a = Math.random() * Math.PI * 2, d = Math.random() * p.r; p.tx = p.hx + Math.cos(a) * d; p.ty = p.hy + Math.sin(a) * d; p.wait = 2 + Math.random() * 3; }
        const d = dist(p.x, p.y, p.tx, p.ty);
        if (d > 2) { p.x += ((p.tx - p.x) / d) * Math.min(d, sp * dt); p.y += ((p.ty - p.y) / d) * Math.min(d, sp * dt); }
        if (dist(p.x, p.y, me.x, me.y) < 46 && now > p.hitAt && !api.isBusy()) {
          p.hitAt = now + 2500;
          const zi = isZi() && p.id === "headless";
          hurt(zi ? 0.14 : 0.07, `${p.name}從你身上穿了過去——冷得骨頭都在痛`);
          addYin(8);
        }
      }
    }

    // ===== 叫全名（第五條） =====
    let callAt = performance.now() + 60000;
    function nameCall(now) {
      if (now < callAt || S.yin < 30 || api.isBusy() || !inside() || rested()) return;
      callAt = now + 70000 + Math.random() * 40000;
      const full = CH.name;
      api.dlg("背後", { name: "？？？", color: "#1d1d1f", face: "　" }, `背後很近的地方，有人用很輕的聲音叫你：「${full}——」那聲音……很像你認識的人。`,
        `<button type="button" class="ghost dlg-ask" data-act="liCall" data-k="turn">回頭：「誰？」</button><button type="button" class="ghost dlg-ask" data-act="liCall" data-k="still">不回頭、不出聲，繼續往前走</button>`);
    }
    function answerCall(k) {
      if (k === "turn") {
        api.dlg("背後", { name: "？？？", color: "#1d1d1f", face: "　" }, "你回頭了。……後面什麼都沒有。可是從這一刻起，你的影子好像比你慢了半拍。", `<button type="button" class="ghost" data-close>……</button>`, "違反第五條規矩：陰氣 +25");
        addYin(25); hurt(0.06);
      } else { api.closePanel(); toast("你沒有回頭。那個聲音在耳邊停了一下，然後慢慢走遠了"); }
    }

    // ===== 規矩 =====
    function rulesPanel() {
      const guan = CH.id === "guan";
      api.openPanel("宅中規矩（貼在大門上）", `<p class="wx-p">大門上貼著一張泛黃的紙，字是用毛筆寫的。有一條的墨，顏色不太一樣。</p>
        <ol class="wx-list">${MAP.rules.map((r) => `<li style="${r.red ? "color:#c40a1e" : ""}">${esc(r.text)}${guan && !r.real ? "　<b>✗</b>" : ""}</li>`).join("")}</ol>
        ${guan ? `<p class="tv-note">（觀知命看過這張紙。上一次，就是第四條害死了人。）</p>` : ""}
        <p class="tv-note">時辰：${hourAt(S.t).name}・陰氣 ${Math.round(S.yin)} / 100。違反規矩、被幻影碰到，陰氣都會上升；陰氣滿了會昏過去。長明燈旁邊陰氣會慢慢散掉。${BAG.count(run.items, "baguaMirror") ? "<br>八卦鏡：按 M 照一下（6 秒，陰氣 +6）" : ""}</p>`);
    }

    // ===== 八卦鏡 =====
    function useMirror() {
      if (!BAG.count(run.items, "baguaMirror")) return toast("你沒有八卦鏡");
      const now = performance.now();
      if (S.mirrorCd > now) return toast("鏡面還霧霧的，等一下");
      S.mirrorUntil = now + 6000; S.mirrorCd = now + 10000;
      api.sfx?.("sounds/passion-bell.mp3");
      addYin(6, "你舉起八卦鏡——鏡子裡的宅子，和眼前的不一樣");
    }

    // ===== 點擊 =====
    const mirrorOn = () => S.mirrorUntil > performance.now();
    function knock(d, then) {
      if (isZi()) {
        api.sfx?.("sounds/boss-bullet.mp3");
        addYin(30);
        return api.dlg(d.name, { name: d.name, color: "#3a1a1a", face: "門" }, "叩、叩。……門的另一邊，也有人叩了兩下。", `<button type="button" class="ghost" data-close>……</button>`, "違反第一條規矩（子時莫叩門）：陰氣 +30");
      }
      then?.();
    }
    function click(p) {
      // 長明燈：守夜等子時
      if (K.hit(p, MAP.lamp, 50)) { K.reach(MAP.lamp, 90, lampPanel); return true; }
      // 規矩：大門
      if (K.hit(p, { x: 1200, y: 2075 }, 60)) { K.reach({ x: 1200, y: 2120 }, 80, rulesPanel); return true; }
      // 簾子
      if (K.hit(p, { x: 688, y: 1130 }, 55)) { K.reach({ x: 740, y: 1130 }, 70, curtainPanel); return true; }
      // 門
      const d = MAP.doors.find((x) => K.hit(p, x, 26) && !(x.id === "back" && S.backOpen));       // 後門開著以後就只是門口
      if (d) { K.reach(d, 90, () => knock(d, () => doorPanel(d))); return true; }
      // 供桌（八卦鏡）
      if (K.hit(p, MAP.altar, 70)) { K.reach({ x: MAP.altar.x, y: MAP.altar.y + 80 }, 70, altarPanel); return true; }
      // 紅花
      if (K.hit(p, MAP.flowers, 60)) { K.reach(MAP.flowers, 100, flowerPanel); return true; }
      // 筆記
      const n = MAP.notes.find((x) => K.hit(p, x, 40));
      if (n && !S.notes[n.id]) { K.reach(n, 80, () => readNote(n)); return true; }
      // 痕跡（只有鏡子照得到）
      const c = MAP.clues.find((x) => K.hit(p, x, 60) && x.id !== "c3");
      if (c && mirrorOn()) { K.reach(c, 100, () => clue(c)); return true; }
      return false;
    }
    function lampPanel() {
      api.dlg("長明燈", { name: "長明燈", color: "#c8a040", face: "燈" }, `一盞不知道點了多少年的燈。燈旁邊比較暖，身上的寒氣會慢慢散掉。現在是${hourAt(S.t).name}。`,
        isZi() ? `<button type="button" class="ghost" data-close>離開</button>` : `<button type="button" class="ghost dlg-ask" data-act="liWait">在燈旁守夜，等到子時</button><button type="button" class="ghost" data-close>離開</button>`);
    }
    function doorPanel(d) {
      if (d.id === "back") {
        if (S.backOpen) return toast("後門開著。門外黑得什麼都看不見");
        S.backOpen = true; save(); api.resetPaths?.();
        api.sfx?.("sounds/robot-move.mp3");
        return api.dlg("後門", { name: "後門", color: "#3a1a1a", face: "門" }, "你推開了後門。門軸發出很長的一聲「吱——」。門外是一條小路，路邊好像有一個小小的土丘。", `<button type="button" class="ghost" data-close>好</button>`);
      }
      const T = { hall: "正廳的門半開著。門檻上積了很厚的灰，只有中間被踩出一條路——是往裡面走的腳印，沒有往外的。", kitchen: "廚房的門上貼著一張褪色的「囍」。裡面傳出很淡的、像鐵一樣的味道。", tower: "繡樓的門。樓上的窗戶開著，窗框缺了一角。" };
      api.dlg(d.name, { name: d.name, color: "#3a1a1a", face: "門" }, T[d.id], `<button type="button" class="ghost" data-close>好</button>`);
    }
    function curtainPanel() {
      if (S.curtain) return toast("簾子已經揭開了。裡面的東西……也知道了");
      const c3 = MAP.clues.find((x) => x.id === "c3"), need = ACT("LI44444-03") && !S.traces.c3;
      api.dlg("二房的簾子", { name: "簾子", color: "#3a1a1a", face: "簾" }, "二房的門口掛著一片暗紅色的簾子。簾子後面點著燈，有個人影坐在桌前，一動也不動。",
        `<button type="button" class="ghost dlg-ask" data-act="liCurtain" data-k="lift">揭開簾子</button><button type="button" class="ghost dlg-ask" data-act="liCurtain" data-k="look">隔著簾子看影子${mirrorOn() ? "（八卦鏡）" : ""}</button><button type="button" class="ghost" data-close>離開</button>`,
        need && !mirrorOn() ? `（${c3.title}：要用八卦鏡才看得清楚）` : "");
    }
    function curtainAct(k) {
      if (k === "lift") {
        S.curtain = true; save(); api.resetPaths?.();
        const arm = ph.find((p) => p.id === "arm"); arm.chaseUntil = performance.now() + 12000; arm.x = 640; arm.y = 1130;
        addYin(40);
        api.sfx?.("sounds/ilshu-demon.mp3");
        return api.dlg("二房", { name: "斷臂鬼", color: "#3a3a4a", face: "　" }, "你揭開了簾子。桌前的人影慢慢轉過頭來——他少了一隻手臂。他站了起來。", `<button type="button" class="primary" data-close>快跑</button>`, "違反第二條規矩：陰氣 +40，斷臂鬼追了出來");
      }
      if (mirrorOn() && ACT("LI44444-03")) return clue(MAP.clues.find((x) => x.id === "c3"));
      api.dlg("二房的簾子", { name: "簾子", color: "#3a1a1a", face: "簾" }, "影子低著頭，好像在數什麼東西。一張、兩張、三張……看不清楚。", `<button type="button" class="ghost" data-close>離開</button>`, ACT("LI44444-03") ? "用八卦鏡照著看，也許看得清楚" : "");
    }
    function flowerPanel() {
      api.dlg("廚房", { name: "紅花", color: "#c40a1e", face: "花" }, "廚房的地上，磚縫裡開著一叢一叢的紅花。很香——香得像生鏽的鐵。",
        `<button type="button" class="ghost dlg-ask" data-act="liFlower" data-k="pick">摘一朵聞聞看</button><button type="button" class="ghost" data-close>不碰它</button>`);
    }
    function altarPanel() {
      const have = BAG.count(run.items, "baguaMirror");
      if (have) return api.dlg("供桌", { name: "供桌", color: "#5a3a1a", face: "供" }, "供桌上擺著五個牌位。其中一個是新的，上面沒有寫名字。", `<button type="button" class="ghost" data-close>離開</button>`);
      if (!anyActive()) return api.dlg("供桌", { name: "供桌", color: "#5a3a1a", face: "供" }, "供桌下面好像塞著什麼東西，用黃布包著。", `<button type="button" class="ghost" data-close>離開</button>`);
      if (isZi()) { addYin(20); return api.dlg("供桌", { name: "供桌", color: "#5a3a1a", face: "供" }, "你彎下腰的時候，頭頂上有什麼東西輕輕碰了一下你的頭髮。……是一雙懸著的腳。", `<button type="button" class="ghost" data-close>……</button>`, "道士的筆記說過：別在子時去。陰氣 +20"); }
      BAG.add(run.items, "baguaMirror", 1); save(); api.renderHud(); setupButtons();
      api.sfx?.("sounds/passion-bell.mp3");
      api.dlg("供桌", { name: "八卦鏡", color: "#c8a040", face: "鏡" }, "供桌下面，用黃布包著一面八卦鏡。鏡面裂了一道，背面刻著七道刻痕——前面六道都被劃掉了。", `<button type="button" class="primary" data-close>收下（按 M 照鏡子）</button>`);
      if (K.is("LI44444-01", "liMirror")) K.adv("LI44444-01", "拿到八卦鏡了。回大門外找李守仁");
    }
    function readNote(n) {
      S.notes[n.id] = true; save(); api.renderHud();
      api.dlg(`道士的筆記・${n.where}`, { name: "第七位道士", color: "#5a4a2a", face: "符" }, n.text, `<button type="button" class="ghost" data-close>收起來</button>`);
      if (K.is("LI44444-01", "liNote") && MAP.notes.every((x) => S.notes[x.id])) K.adv("LI44444-01", "三張筆記都找到了。八卦鏡在正廳的供桌下面——別在子時去");
    }
    function clue(c) {
      if (!ACT("LI44444-03")) return api.dlg(c.title, { name: "八卦鏡", color: "#c8a040", face: "鏡" }, c.text, `<button type="button" class="ghost" data-close>……</button>`);
      if (S.traces[c.id]) return toast(`${c.title}：已經看過了`);
      S.traces[c.id] = true; save(); api.renderHud();
      api.dlg(c.title, { name: "八卦鏡", color: "#c8a040", face: "鏡" }, c.text, `<button type="button" class="ghost" data-close>記下來</button>`, `童謠的痕跡（${Object.keys(S.traces).length} / 5）`);
      if (K.is("LI44444-03", "liClue") && MAP.clues.every((x) => S.traces[x.id])) K.adv("LI44444-03", "五個痕跡都找到了。回去找唱童謠的孩子");
    }

    // ===== LI-03：回答孩子 =====
    const QUIZ = [
      { q: "二哥欠了一大筆債。家裡的人決定怎麼還？", a: ["賣掉祖宅", "把小妹嫁去王家，拿聘金還債", "去跟別人借更多的錢"], ok: 1 },
      { q: "家裡誰反對這件事？", a: ["李太太", "李先生", "大哥"], ok: 2 },
      { q: "小妹嫁去王家以後呢？", a: ["過得很好，再也沒回來", "被王家打死了，葬在後門外", "逃走了"], ok: 1 },
      { q: "大哥後來怎麼了？", a: ["和二哥吵架的時候，被推出了繡樓的窗戶", "離家出走，再也沒有回來", "生病過世了"], ok: 0 },
      { q: "李先生為什麼殺了太太？", a: ["太太賣了小妹", "太太出了軌，孩子不是他的；再加上二哥欠債的事", "太太要帶著二哥逃走"], ok: 1 },
      { q: "二哥最後怎麼了？", a: ["被討債的人打死了", "上吊了", "被大哥推下了樓"], ok: 0 },
      { q: "……那，我是誰？", a: ["小妹的孩子", "二哥的孩子", "當時在李太太肚子裡的孩子"], ok: 2 },
    ];
    const KID = () => MAP.npcs.find((n) => n.id === "child");
    function npcExtra(n) {
      if (n.id === "child" && K.is("LI44444-03", "liTruth")) return `<button type="button" class="ghost dlg-ask" data-act="liQuiz" data-i="0"><b>委託</b>：把童謠裡的事說給他聽</button>`;
      return "";
    }
    function quiz(i, msg) {
      if (i >= QUIZ.length) {
        api.dlg("唱童謠的孩子", KID(), "……嗯。全部都對。（他第一次眨了眨眼睛，空空的眼睛裡好像有了一點光。）原來大家，都很痛啊。", `<button type="button" class="primary" data-close>……</button>`);
        K.adv("LI44444-03", "孩子不唱了。宅子裡好像安靜了一點");
        return;
      }
      const Qz = QUIZ[i];
      api.dlg("唱童謠的孩子", KID(), msg || Qz.q, Qz.a.map((t, k) => `<button type="button" class="ghost dlg-ask" data-act="liAns" data-i="${i}" data-k="${k}">${esc(t)}</button>`).join(""), `（${i + 1} / ${QUIZ.length}）`);
    }
    function answer(i, k) {
      if (k === QUIZ[i].ok) return quiz(i + 1);
      addYin(15);
      quiz(i, `（孩子空空的眼睛盯著你，盯了很久。）……不對。${QUIZ[i].q}`);
    }

    // ===== HUD 按鈕：規矩、八卦鏡 =====
    function setupButtons() {
      const bar = document.querySelector(".wx-hud.bl");
      if (!bar) return;
      if (!document.getElementById("liRules")) { const b = document.createElement("button"); b.id = "liRules"; b.type = "button"; b.className = "ghost"; b.textContent = "規矩（R）"; b.addEventListener("click", () => { if (!api.isBusy()) rulesPanel(); }); bar.appendChild(b); }
      if (BAG.count(run.items, "baguaMirror") && !document.getElementById("liMirror")) { const b = document.createElement("button"); b.id = "liMirror"; b.type = "button"; b.className = "ghost"; b.textContent = "八卦鏡（M）"; b.addEventListener("click", () => { if (!api.isBusy()) useMirror(); }); bar.appendChild(b); }
    }
    setupButtons();
    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || api.isBusy()) return;
      const k = e.key.toLowerCase();
      if (k === "m") useMirror();
      if (k === "r") rulesPanel();
    });
    // 觀知命：李守仁認得他
    if (CH.id === "guan") { const ls = MAP.npcs.find((n) => n.id === "lishouren"); ls.lines = ["……觀先生？您又來了。上次的事，鎮上的人到現在都還記得。", ...ls.lines]; }
    // 第一次來：先看門上的規矩
    if (!S.seenRules) { S.seenRules = true; save(); setTimeout(rulesPanel, 600); }

    function act(a, b) {
      if (a === "liCall") { answerCall(b.dataset.k); return true; }
      if (a === "liCurtain") { curtainAct(b.dataset.k); return true; }
      if (a === "liFlower") { api.closePanel(); addYin(25, "你伸手去摘——指尖碰到的不是花瓣，是半乾的、黏黏的紅。……這些「花」，是血。違反第三條規矩：陰氣 +25"); const red = ph.find((p) => p.id === "red"); red.chaseUntil = performance.now() + 8000; return true; }
      if (a === "liWait") { api.closePanel(); S.t = Math.floor(S.t / CYCLE) * CYCLE + ZI_START - 3; save(); toast("你在長明燈旁坐了很久。……遠遠地，好像有嗩吶的聲音"); return true; }
      if (a === "liQuiz") { quiz(0); return true; }
      if (a === "liAns") { answer(+b.dataset.i, +b.dataset.k); return true; }
      return false;
    }

    // ===== 更新 =====
    let lastHour = hourAt(S.t).name, wasInHall = false, front = 0;
    function update(dt, now) {
      if (blackout) return;
      S.t += dt;
      if (K.is("LI44444-01", "liMirror") && BAG.count(run.items, "baguaMirror")) K.adv("LI44444-01", "八卦鏡已經在你身上了。回大門外找李守仁");
      const h = hourAt(S.t).name;
      if (h !== lastHour) {
        lastHour = h;
        if (h === "子時") { toast("子時到了。……遠處響起了嗩吶"); Q2.follow = 0; Q2.lost = false; }
        if (h === "丑時") toast("丑時。嗩吶聲停了");
      }
      // 長明燈：陰氣慢慢散掉
      if (dist(me.x, me.y, MAP.lamp.x, MAP.lamp.y) < 140) S.yin = Math.max(0, S.yin - 3 * dt);
      // 假規矩：子時躲在正廳
      const inHall = inRoom("hall");
      if (isZi() && inHall && !rested()) { if (!wasInHall) toast("你躲進了正廳。……頭頂上，好像有什麼在輕輕晃"); addYin(4 * dt); }
      wasInHall = inHall;
      updatePhantoms(dt, now);
      nameCall(now);
      // 喜轎：跟著繞三圈，不能擋在前面
      const sd = sedanPos();
      if (sd && !sd.out && K.is("LI44444-02", "liSedan") && !Q2.lost) {
        const d = dist(me.x, me.y, sd.x, sd.y), dx = me.x - sd.x, dy = me.y - sd.y, ahead = (dx * Math.cos(sd.ang) + dy * Math.sin(sd.ang)) / Math.max(1, d);
        if (d < 110 && ahead > 0.5) {
          front += dt;
          if (front > 0.4) {
            Q2.lost = true; front = 0; save();
            toast("你擋在了喜轎前面。……轎夫們停下來，慢慢轉過了紙糊的臉");
            setTimeout(() => api.ambushBattle("papers3"), 800);
            return;
          }
        } else front = 0;
        if (d < 320) Q2.follow = (Q2.follow || 0) + dt;
      }
      if (sd && sd.out && K.is("LI44444-02", "liSedan") && !Q2.lost && (Q2.follow || 0) >= LAP * LAPS * 0.6 && !Q2.sent) {
        Q2.sent = true; S.backOpen = true; save(); api.resetPaths?.();
        K.adv("LI44444-02", "喜轎穿過正廳，從後門飄了出去。後門……自己開了");
      }
      if (!isZi()) Q2.sent = false;
      if (sd && sd.out && K.is("LI44444-02", "liSedan") && !Q2.lost && (Q2.follow || 0) < LAP * LAPS * 0.6 && !Q2.missMsg) { Q2.missMsg = true; toast("喜轎走了。你跟得不夠近……等下一個子時吧"); }
      if (!isZi()) Q2.missMsg = false;
    }
    const speedMul = () => (S.yin >= 70 ? 0.85 : 1);
    // 簾子和後門：沒打開就過不去
    const rectHit = (r, x, y, h) => x + h > r.x && x - h < r.x + r.w && y + h > r.y && y - h < r.y + r.h;
    function blocked(x, y, h) {
      if (!S.curtain && rectHit(MAP.curtain, x, y, h)) return true;
      if (!S.backOpen && rectHit(MAP.backGate, x, y, h)) return true;
      return false;
    }

    // ===== 畫面 =====
    function drawFloor(now, x0, y0) {
      ctx.fillStyle = "#151417"; ctx.fillRect(x0, y0, 1280, 720);
      // 街和後門外的小路
      ctx.fillStyle = "#24221f"; ctx.fillRect(40, 2085, 2320, 275); ctx.fillRect(40, 40, 2320, 165);
      // 宅子裡：青磚
      ctx.fillStyle = "#2a2a2e"; ctx.fillRect(230, 230, 1940, 1830);
      ctx.strokeStyle = "rgba(90,90,100,.22)"; ctx.lineWidth = 1;
      for (let y = Math.max(230, Math.floor(y0 / 40) * 40); y < Math.min(2060, y0 + 720); y += 40) { ctx.beginPath(); ctx.moveTo(Math.max(230, x0), y); ctx.lineTo(Math.min(2170, x0 + 1280), y); ctx.stroke(); }
      // 房間的地板（木頭）
      for (const r of Object.values(MAP.rooms)) { ctx.fillStyle = "#2e2420"; ctx.fillRect(r.x, r.y, r.w, r.h); text(r.name, r.x + 40, r.y + 22, "#6a5a4a", 13, 900); }
      // 前院喜轎的路（地上有被踩出來的圈）
      const Yd = MAP.yard; ctx.strokeStyle = "rgba(160,40,40,.18)"; ctx.lineWidth = 34; ctx.beginPath(); ctx.ellipse(Yd.cx, Yd.cy, Yd.rx, Yd.ry, 0, 0, Math.PI * 2); ctx.stroke();
      // 牆
      for (const w of MAP.walls) { ctx.fillStyle = "#3a3236"; ctx.fillRect(w.x, w.y, w.w, w.h); ctx.fillStyle = "#4a1a1a"; ctx.fillRect(w.x, w.y, w.w, Math.min(6, w.h)); }
      // 大門、後門
      ctx.fillStyle = "#6a1a1a"; ctx.fillRect(1140, 2060, 18, 34); ctx.fillRect(1242, 2060, 18, 34);
      text("李府", 1200, 2045, "#c8a040", 16, 900);
      ctx.fillStyle = "#e8e0c8"; ctx.fillRect(1164, 2070, 22, 30); text("規", 1175, 2087, "#7a1a1a", 11, 900);
      if (!S.backOpen) { ctx.fillStyle = "#4a1414"; ctx.fillRect(1140, 200, 120, 30); } else { ctx.fillStyle = "#4a1414"; ctx.fillRect(1140, 200, 14, 30); ctx.fillRect(1246, 200, 14, 30); }
      // 各個門旁邊的春聯（點它＝叩門）
      for (const d of MAP.doors) { if (d.id === "back" && S.backOpen) continue; ctx.fillStyle = "#a8141e"; ctx.fillRect(d.x - 7, d.y - 22, 14, 44); ctx.fillStyle = "#e8c85a"; ctx.font = "900 9px serif"; ctx.textAlign = "center"; for (let i = 0; i < 3; i++) ctx.fillText("福壽安"[i], d.x, d.y - 9 + i * 13); }
      // 簾子
      if (!S.curtain) { const c = MAP.curtain; ctx.fillStyle = "#6a1418"; ctx.fillRect(c.x, c.y, c.w, c.h); for (let i = 0; i < 4; i++) { ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(c.x + 3, c.y + 6 + i * 24 + Math.sin(now / 900 + i) * 2, c.w - 6, 2); } }
      // 井、供桌、樑、灶、窗
      ctx.fillStyle = "#1a1a1e"; ctx.beginPath(); ctx.arc(MAP.well.x, MAP.well.y, 40, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#5a5a62"; ctx.lineWidth = 8; ctx.stroke();
      ctx.fillStyle = "#4a2414"; ctx.fillRect(1100, 852, 200, 46); for (let i = 0; i < 5; i++) { ctx.fillStyle = "#1d1d1f"; ctx.fillRect(1118 + i * 36, 830, 14, 26); }
      ctx.fillStyle = "#3a2a20"; ctx.fillRect(924, 990, 552, 12);
      ctx.fillStyle = "#3a3a3a"; ctx.fillRect(1990, 944, 150, 70);
      ctx.fillStyle = "#1a1a24"; ctx.fillRect(560, 650, 80, 30); ctx.strokeStyle = "#5a4a3a"; ctx.lineWidth = 3; ctx.strokeRect(560, 650, 80, 30);
      // 紅花
      // 「紅花」：其實是李先生砍死李太太時濺在地上的血。平常看起來是花；八卦鏡照著、或陰氣很高的時候，就看得出是血
      const F = MAP.flowers, real = S.mirrorUntil > performance.now() || S.yin >= 70;
      for (let i = 0; i < 9; i++) {
        const fx = F.x + Math.cos(i * 1.7) * 60, fy = F.y + Math.sin(i * 2.3) * 40;
        if (!real) { R.drawLily?.(ctx, fx, fy, 9); continue; }
        ctx.fillStyle = "rgba(110,6,14,.85)"; ctx.beginPath(); ctx.ellipse(fx, fy, 12 + (i % 3) * 4, 8 + (i % 2) * 3, i, 0, Math.PI * 2); ctx.fill();
        for (let k = 0; k < 5; k++) { const a = k * 1.26 + i; ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 16, fy + Math.sin(a) * 11, 3.5, 0, Math.PI * 2); ctx.fill(); }
      }
      // 墳
      if (S.backOpen) { ctx.fillStyle = "#3a3024"; ctx.beginPath(); ctx.ellipse(MAP.grave.x, MAP.grave.y, 40, 18, 0, Math.PI, 0); ctx.fill(); ctx.strokeStyle = "#c40a1e"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(MAP.grave.x + 12, MAP.grave.y - 12); ctx.lineTo(MAP.grave.x + 16, MAP.grave.y - 34); ctx.stroke(); }
      // 長明燈
      const L = MAP.lamp; ctx.fillStyle = "#5a4a2a"; ctx.fillRect(L.x - 6, L.y - 10, 12, 34); ctx.fillStyle = `rgba(255,220,140,${0.8 + Math.sin(now / 300) * 0.15})`; ctx.beginPath(); ctx.arc(L.x, L.y - 18, 10, 0, Math.PI * 2); ctx.fill();
      // 筆記
      for (const n of MAP.notes) if (!S.notes[n.id]) { ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(0.3); ctx.fillStyle = "#e8d890"; ctx.fillRect(-10, -14, 20, 28); ctx.strokeStyle = "#c40a1e"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-5, -8); ctx.lineTo(5, -8); ctx.moveTo(0, -8); ctx.lineTo(0, 10); ctx.stroke(); ctx.restore(); }
      // 燈籠
      for (const l of MAP.lanterns) { ctx.fillStyle = "#c4141e"; ctx.beginPath(); ctx.ellipse(l.x, l.y + Math.sin(now / 800 + l.x) * 2, 10, 13, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    // 幻影：和人一樣是方塊，但半透明、缺了什麼
    function phantomArt(p, now, clear) {
      const a = clear ? 0.9 : 0.22 + (S.yin / 100) * 0.3, x = p.x, y = p.y + Math.sin(now / 600 + p.hx) * 3, s = 30;
      ctx.save(); ctx.globalAlpha = a;
      if (p.id === "red") { api.rr(x - s / 2, y - s / 2, s, s, 6); ctx.fillStyle = "#b0101a"; ctx.fill(); ctx.fillStyle = "#0a0a0a"; ctx.fillRect(x - s / 2, y - s / 2 - 4, s, s * 0.7); for (let i = 0; i < 5; i++) ctx.fillRect(x - s / 2 + i * 7, y, 4, 14 + (i % 2) * 8); }
      if (p.id === "headless") { ctx.fillStyle = "#d8d4cc"; ctx.fillRect(x - s / 2, y - s * 0.15, s, s * 0.65); ctx.fillStyle = "#6a0a0a"; ctx.fillRect(x - s / 2, y - s * 0.15, s, 4); ctx.strokeStyle = "#e8e0c8"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - s * 0.15); ctx.lineTo(x, y - s * 1.3); ctx.stroke(); }
      if (p.id === "legs") { ctx.fillStyle = "#c8c8d0"; api.rr(x - s / 2, y - s / 2, s, s * 0.55, 6); ctx.fill(); ctx.fillStyle = "#6a0a0a"; ctx.fillRect(x - s / 2, y + s * 0.05 - 3, s, 3); ctx.fillStyle = "rgba(106,10,10,.5)"; ctx.fillRect(x - 4, y + s * 0.05, 8, 26); }
      if (p.id === "arm") { api.rr(x - s / 2, y - s / 2, s, s, 6); ctx.fillStyle = "#b8b8c4"; ctx.fill(); ctx.fillStyle = "#b8b8c4"; ctx.fillRect(x + s / 2, y - 2, 12, 7); ctx.fillStyle = "#6a0a0a"; ctx.fillRect(x - s / 2 - 4, y - 4, 4, 10); }
      ctx.restore();
      if (clear) text(p.name, x, y - 34, "#ff8a9a", 12, 900);
    }
    // 喜轎的周圍：播「囍」的 Boss 戰音樂，越靠近越大聲（大宅本身沒有音樂）
    const xiMusic = new Audio("sounds/bgm-xi.mp3"); xiMusic.loop = true; xiMusic.volume = 0;
    let xiVol = 0;
    function sedanMusic() {
      const sd = sedanPos();
      const want = sd && !api.isMuted() ? Math.max(0, 1 - dist(me.x, me.y, sd.x, sd.y) / 900) ** 1.6 * R.CONFIG.bgmVolume * 1.6 : 0;
      xiVol += (Math.min(1, want) - xiVol) * 0.08;                  // 慢慢變大聲／變小聲
      if (xiVol < 0.005) { if (!xiMusic.paused) xiMusic.pause(); return; }
      xiMusic.volume = Math.min(1, xiVol);
      if (xiMusic.paused) xiMusic.play().catch(() => {});
    }
    window.addEventListener("pagehide", () => xiMusic.pause());
    function draw(now) {
      sedanMusic();
      const clear = mirrorOn();
      if (!rested()) for (const p of ph) { if (p.id === "arm" && !S.curtain && p.chaseUntil < now && S.yin < 60 && !clear) continue; phantomArt(p, now, clear); }
      // 痕跡（鏡子照得到的時候）
      if (!clear && K.is("LI44444-03", "liClue")) for (const c of MAP.clues) if (!S.traces[c.id] && dist(me.x, me.y, c.x, c.y) < 260) { ctx.strokeStyle = `rgba(200,180,120,${0.18 + 0.14 * Math.sin(now / 300)})`; ctx.lineWidth = 2; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.arc(c.x, c.y, 34, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); if (dist(me.x, me.y, c.x, c.y) < 140) text("（按 M 照八卦鏡）", c.x, c.y - 44, "#c8b880", 11, 700); }
      if (clear && ACT("LI44444-03")) for (const c of MAP.clues) if (!S.traces[c.id]) { ctx.strokeStyle = `rgba(232,200,90,${0.6 + 0.4 * Math.sin(now / 200)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c.x, c.y, 30, 0, Math.PI * 2); ctx.stroke(); text("？", c.x, c.y + 5, "#e8c85a", 16, 900); }
      // 喜轎
      const sd = sedanPos();
      if (sd) {
        ctx.save(); ctx.globalAlpha = sd.out ? 1 - sd.k * 0.8 : 0.92; ctx.translate(sd.x, sd.y); ctx.rotate(sd.ang + Math.PI / 2);
        ctx.strokeStyle = "#3a1a0a"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-26, -60); ctx.lineTo(-26, 60); ctx.moveTo(26, -60); ctx.lineTo(26, 60); ctx.stroke();
        api.rr(-30, -36, 60, 72, 8); ctx.fillStyle = "#b0101a"; ctx.fill(); ctx.strokeStyle = "#e8b84a"; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = "#e8b84a"; ctx.font = "900 22px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("囍", 0, 2); ctx.textBaseline = "alphabetic";
        for (const [bx, by] of [[-26, -70], [26, -70], [-26, 70], [26, 70]]) { ctx.fillStyle = "#f4f0e6"; api.rr(bx - 9, by - 9, 18, 18, 3); ctx.fill(); ctx.fillStyle = "rgba(220,40,60,.8)"; ctx.beginPath(); ctx.arc(bx - 4, by + 2, 2.5, 0, Math.PI * 2); ctx.arc(bx + 4, by + 2, 2.5, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
        if (!sd.out) text(`喜轎・第 ${sd.lap} 圈`, sd.x, sd.y - 86, "#ff8a9a", 12, 900);
        if (K.is("LI44444-02", "liSedan") && !sd.out) api.marker(sd.x, sd.y - 104, now, "#f2c200");
      }
      // 孩子唱的童謠
      const kid = KID();
      if (dist(me.x, me.y, kid.x, kid.y) < 600 && !rested()) { const i = Math.floor(now / 3200) % MAP.rhyme.length; ctx.globalAlpha = 0.75; text(`♪ ${MAP.rhyme[i]}`, kid.x, kid.y - 58, "#c8c8d8", 12, 700); ctx.globalAlpha = 1; }
      // 任務標記
      if (K.is("LI44444-01", "liNote")) for (const n of MAP.notes) if (!S.notes[n.id]) api.marker(n.x, n.y - 40, now, "#f2c200");
      if (K.is("LI44444-01", "liMirror")) api.marker(MAP.altar.x, MAP.altar.y - 70, now, "#f2c200");
      // 陰氣高：幻覺（不存在的孩子在視野邊緣出現又消失）
      if (S.yin >= 70 && !rested() && Math.sin(now / 1700) > 0.6) { const a = now / 2300, r = viewR() * 0.85; ctx.globalAlpha = 0.35; K.human(me.x + Math.cos(a) * r, me.y + Math.sin(a) * r, "#6a6a7a", "孩", now, { s: 22 }); ctx.globalAlpha = 1; }
    }
    // 黑暗＋時辰、陰氣
    const dark = document.createElement("canvas");
    function drawTop(now) {
      const m = ctx.getTransform(), cw = ctx.canvas.width, ch = ctx.canvas.height;
      if (dark.width !== cw || dark.height !== ch) { dark.width = cw; dark.height = ch; }
      const d = dark.getContext("2d");
      d.globalCompositeOperation = "source-over"; d.clearRect(0, 0, cw, ch);
      d.fillStyle = isZi() ? "rgba(4,2,4,.96)" : "rgba(6,4,8,.9)"; d.fillRect(0, 0, cw, ch);
      d.globalCompositeOperation = "destination-out";
      const hole = (x, y, r) => { const sx = m.a * x + m.e, sy = m.d * y + m.f, sr = r * m.a; if (sx < -sr || sy < -sr || sx > cw + sr || sy > ch + sr) return; const g = d.createRadialGradient(sx, sy, sr * 0.3, sx, sy, sr); g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)"); d.fillStyle = g; d.beginPath(); d.arc(sx, sy, sr, 0, Math.PI * 2); d.fill(); };
      hole(me.x, me.y, viewR());
      for (const l of MAP.lanterns) hole(l.x, l.y, 70);
      hole(MAP.lamp.x, MAP.lamp.y, 150);
      const sd = sedanPos(); if (sd) hole(sd.x, sd.y, 120);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(dark, 0, 0);
      if (mirrorOn()) { ctx.strokeStyle = "rgba(200,160,64,.6)"; ctx.lineWidth = 10; ctx.strokeRect(5, 5, cw - 10, ch - 10); }
      // 時辰和陰氣（畫面上方正中）
      const hr = hourAt(S.t), cx = cw / 2, top = 18 * (cw / 1280);
      const sc = cw / 1280;
      ctx.fillStyle = "rgba(20,10,12,.8)"; ctx.fillRect(cx - 120 * sc, top, 240 * sc, 46 * sc);
      ctx.fillStyle = hr.name === "子時" ? "#ff5a5a" : "#e8d8c0"; ctx.font = `900 ${Math.round(16 * sc)}px serif`; ctx.textAlign = "center"; ctx.fillText(`${hr.name}${hr.name === "子時" ? "・嗩吶聲" : ""}`, cx, top + 19 * sc);
      ctx.fillStyle = "rgba(255,255,255,.15)"; ctx.fillRect(cx - 100 * sc, top + 28 * sc, 200 * sc, 8 * sc);
      ctx.fillStyle = S.yin >= 70 ? "#c40a1e" : "#7a5aa8"; ctx.fillRect(cx - 100 * sc, top + 28 * sc, 200 * sc * (S.yin / 100), 8 * sc);
      ctx.font = `700 ${Math.round(10 * sc)}px sans-serif`; ctx.fillStyle = "#c8b8d8"; ctx.fillText(`陰氣 ${Math.round(S.yin)}`, cx + 130 * sc, top + 36 * sc);
      ctx.restore();
    }
    function stageText(id, st) {
      if (st?.type === "liNote") return `${st.text}（${MAP.notes.filter((n) => S.notes[n.id]).length} / 3）`;
      if (st?.type === "liClue") { const left = MAP.clues.filter((c) => !S.traces[c.id]).map((c) => c.title); return `${st.text}（${5 - left.length} / 5）${BAG.count(run.items, "baguaMirror") ? "" : "・八卦鏡在正廳的供桌下"}${left.length ? `・還差：${left.join("、")}` : ""}`; }
      if (st?.type === "liSedan") return `${st.text}${isZi() ? `（跟了 ${Math.round(Q2.follow || 0)} 秒）` : `（現在是${hourAt(S.t).name}）`}`;
      return null;
    }
    function mini(dot, now) {
      const bl = `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`;
      dot(MAP.lamp.x, MAP.lamp.y, 4, "#ffd88a");
      if (K.is("LI44444-01", "liNote")) for (const n of MAP.notes) if (!S.notes[n.id]) dot(n.x, n.y, 4, bl);
      if (K.is("LI44444-01", "liMirror")) dot(MAP.altar.x, MAP.altar.y, 4, bl);
      if (K.is("LI44444-03", "liClue")) for (const c of MAP.clues) if (!S.traces[c.id]) dot(c.x, c.y, 4, bl);
      const sd = sedanPos(); if (sd) dot(sd.x, sd.y, 5, "#c40a1e");
    }
    function drawEnemy(e, now, red) { return K.enemyArt(e, now, red, { papers: ["paperMan", 2], papers3: ["paperMan", 3] }); }
    return { update, click, act, npcExtra, draw, drawTop, drawFloor, drawEnemy, stageText, mini, speedMul, blocked, _S: S };
  };
})();
