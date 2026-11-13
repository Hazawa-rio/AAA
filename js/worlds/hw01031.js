/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/hw01031.js": "20261114042342" });
// #HW01031 永遠萬聖節旅館：1F、後院墓園、2F～4F 的繪圖、換場景、樓梯間的幽靈扮演者、委託的玩法
// 委託的玩法：
//   hwQueue   請大廳的狼人扮演者排隊（太入戲的要先嚇唬；薇薇拉可以拿出蘑菇）
//   hwLinen   到 2F～4F 打得開的客房回收布料（有些纏在木乃伊身上，要先嚇唬）；留一份給他們
//   hwGhost   找到迷路的幽靈客人（他會跟著你，但不肯走樓梯）
//   hwWall    帶他到直走廊盡頭的牆，一起「穿牆」回到大廳
//   hwCake    把腦漿蛋糕放到後院墓園的餐桌上；放下之前喪屍住戶會一直衝過來
(function () {
  const R = (window.RPG = window.RPG || {});
  R.WorldHooks = R.WorldHooks || {};

  const GHOST_CHANCE = 0.4;      // 經過樓梯時跳出幽靈扮演者的機率
  const GHOST_CD = 20000;        // 跳出來之後至少隔多久才會再跳（毫秒）
  const QUEUE = [0, 1, 2, 3, 4, 5].map((i) => ({ x: 300, y: 1172 + i * 62 }));   // 櫃檯前排隊的位置
  const LOCKED = ["門把上掛著「請勿打擾」。", "門後傳來鐵鍊拖地的聲音……", "門縫底下滲出乾冰的白霧。", "裡面的人喊：「還沒化好妝！」", "你敲了敲門，門也敲了回來。", "鑰匙孔裡有一隻眼睛在看你。", "門上貼著：「本房客人正在扮演一扇門」。", "門後傳來很有禮貌的低吼聲。"];
  const POLITE = ["啊，抱歉抱歉，戴上耳朵就忘了。嗷嗚。", "排隊？好的。……嗷嗚（小聲）。", "我只是想快點拿到房卡，今晚的月亮很圓。", "對不起！我以為嚎得越大聲，入住越快。"];

  R.WorldHooks.HW01031 = function (api) {
    const { MAP, trip, run, me, CM, BAG, toast, inRect, text, rr, save, openPanel, closePanel, esc, dist, goTo } = api;
    const WOLF = { name: "狼人扮演者", color: "#7a5a3a" };          // 對話框上的說話者
    const ctx = api.ctx();
    const YARD = !!MAP.yard, FLOOR = MAP.floor || 0, LOBBY = !YARD && !FLOOR;
    const ART = R.EnemyArt || {};
    const active = (id) => trip.accepted.includes(id) && !trip.done.includes(id);
    const stageOf = (id) => (active(id) ? CM.stage(trip, id) : null);
    const advance = (id) => { const fin = CM.advance(trip, id); save(); const c = CM.get(id); toast(fin ? `委託「${c.title}」完成！` : `「${c.title}」：${stText(id, CM.stage(trip, id))}`); };
    const near = (x, y, d, fn) => { if (dist(me.x, me.y, x, y) <= d) { fn(); return; } goTo({ x, y }, { type: "hook", reach: d - 10, fn }); };
    const pick = (a) => a[Math.floor(Math.random() * a.length)];

    // ===== 這一趟的旅館（打得開的房間、布料、狼人、迷路的幽靈）：第一次進來時決定 =====
    trip.qdata = trip.qdata || {};
    const H = (trip.qdata.hotel = trip.qdata.hotel || makeHotel());
    function makeHotel() {
      const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
      const open = {};
      for (const f of [2, 3, 4]) open[f] = shuffle([...Array(12).keys()].filter((i) => !(f === 3 && i === 1))).slice(0, 4);   // 302 另外處理（要鑰匙）
      // 布料：6 份，放在打得開的房間裡；其中 2 份纏在木乃伊身上
      const spots = shuffle([2, 3, 4].flatMap((f) => [...Array(12).keys()].filter((i) => !(f === 3 && i === 1)).map((i) => [f, i]))).slice(0, 6);
      const linen = spots.map(([f, i], k) => {
        if (!open[f].includes(i)) open[f].push(i);
        const rm = R.MAPS[`HW01031/f${f}`].hotelRooms[i];
        return { f, i, x: Math.round(rm.x + rm.w * (0.3 + Math.random() * 0.4)), y: Math.round(rm.y + rm.h * (0.35 + Math.random() * 0.3)), mummy: k < 2, taken: false };
      });
      const wolves = [0, 1, 2, 3, 4, 5].map(() => ({ x: 140 + Math.random() * 540, y: 1220 + Math.random() * 420, line: -1 }));
      const angry = shuffle([0, 1, 2, 3, 4, 5]).slice(0, 2);
      angry.forEach((i) => { wolves[i].angry = true; });
      const gf = 2 + Math.floor(Math.random() * 3);
      return { open, linen, wolves, ghost: { floor: gf, x: 800 + Math.random() * 100, y: 600 + Math.random() * 200, following: false }, cakePlaced: false };
    }
    const isOpen = (f, i) => (f === 3 && i === 1 ? CM.progressOf(trip, "HW01031-01") >= 1 && trip.accepted.includes("HW01031-01") : H.open[f].includes(i));
    if (FLOOR) MAP.hotelRooms.forEach((rm, i) => { if (isOpen(FLOOR, i)) MAP.walk.push(rm, rm.door); });

    // ===== 打完仗回來（狼人、木乃伊、喪屍） =====
    const LB = run.lastBattle;
    if (LB) {
      delete run.lastBattle;
      if (LB.result === "win") {
        if (LB.variant === "werewolf" && H.pendingWolf != null) { lineUp(H.pendingWolf, "被嚇得夾著尾巴排進了隊伍"); }
        if (LB.variant === "mummy" && H.pendingLinen != null) { setTimeout(() => takeLinen(H.pendingLinen, true), 400); }
      }
      if (LB.variant === "zombies") H.zombieGrace = Date.now() + 3000;
      H.pendingWolf = null;
      if (LB.variant !== "mummy" || LB.result !== "win") H.pendingLinen = null;
      save();
    }

    function stText(id, st) {
      if (!st) return "";
      if (st.type === "hwQueue") return `${st.text}（${H.wolves.filter((w) => w.line >= 0).length} / ${st.need}）`;
      if (st.type === "hwLinen") return `${st.text}（${H.linen.filter((l) => l.taken).length} / ${st.need}）`;
      if (st.type === "hwWall" && !H.ghost.following) return `回 ${H.ghost.floor}F 找幽靈客人`;
      if (st.type === "hwWall") return `${st.text}（他在你身後飄著）`;
      return st.text;
    }

    // ===== 狼人排隊 =====
    function lineUp(i, why) {
      const w = H.wolves[i];
      if (w.line >= 0) return;
      w.line = H.wolves.filter((x) => x.line >= 0).length;
      save();
      const n = H.wolves.filter((x) => x.line >= 0).length, st = stageOf("HW01031-02");
      toast(`狼人扮演者${why || "乖乖排進了隊伍"}（${n} / 6）`);
      if (st?.type === "hwQueue" && n >= st.need) setTimeout(() => advance("HW01031-02"), 600);
    }
    function wolfPanel(i) {
      const w = H.wolves[i], st = stageOf("HW01031-02");
      if (w.line >= 0) return toast("他乖乖排著隊，偶爾小聲地嗷嗚一下");
      if (st?.type !== "hwQueue") return toast(trip.accepted.includes("HW01031-02") ? "先去櫃檯聽聽骸骸怎麼說吧" : "狼人扮演者對著櫃檯嚎了一聲，後面的客人嚇得退了一步");
      if (!w.tried) {
        api.dlg("狼人扮演者", WOLF, "嗷嗚——！我要入住！現在！馬上！", `<button type="button" class="primary" data-act="hwWolf" data-i="${i}">請他排隊</button><button type="button" class="ghost" data-close>再想想</button>`);
        return;
      }
      angryPanel(i);
    }
    function angryPanel(i) {
      api.dlg("太入戲的狼人", WOLF, "嗷嗚——！本大爺是滿月之王，滿月之王不排隊！",
        `<button type="button" class="primary" data-act="hwWolfScare" data-i="${i}">嚇唬他</button>${api.CH.id === "vivilla" ? `<button type="button" class="ghost" data-act="hwWolfShroom" data-i="${i}">拿出蘑菇</button>` : ""}<button type="button" class="ghost" data-close>先不要</button>`,
        "他太入戲了。嚇唬他（旅館的戰鬥），讓他回過神來。");
    }

    // ===== 布料回收 =====
    function takeLinen(i, afterScare) {
      const l = H.linen[i], st = stageOf("HW01031-03");
      if (l.taken || st?.type !== "hwLinen") return;
      l.taken = true; H.pendingLinen = null; save();
      const n = H.linen.filter((x) => x.taken).length;
      toast(afterScare ? `木乃伊扮演者嚇得鬆開了手。回收了一份布料（${n} / ${st.need}）` : `回收了一份布料（${n} / ${st.need}）`);
      if (n >= st.need) setTimeout(() => advance("HW01031-03"), 600);
    }
    function linenClick(i) {
      const l = H.linen[i], st = stageOf("HW01031-03");
      if (CM.progressOf(trip, "HW01031-03") >= 2) return toast("夠了。最後這份留給他們吧");
      if (st?.type !== "hwLinen") return toast(trip.accepted.includes("HW01031-03") ? "先去找骼骼吧" : "一大堆拆下來的毛巾和床單");
      const n = H.linen.filter((x) => x.taken).length;
      if (n >= st.need) return toast("夠了。最後這份留給他們吧");
      if (!l.mummy) return takeLinen(i);
      api.dlg("抱著床單的木乃伊", { name: "木乃伊扮演者", color: "#b89a5a" }, "還——給——我——……這是我的……繃帶……",
        `<button type="button" class="primary" data-act="hwMummy" data-i="${i}">嚇唬他</button><button type="button" class="ghost" data-close>先不要</button>`, "床單纏在木乃伊扮演者身上。嚇唬他一下，他就會鬆手。");
    }

    // ===== 迷路的幽靈 =====
    const G = H.ghost;
    if (G.following && FLOOR) { G.floor = FLOOR; G.x = me.x - 40; G.y = me.y + 30; }
    function ghostClick() {
      const s5 = stageOf("HW01031-05");
      if (G.following) return toast("幽靈客人：「穿牆、穿牆……我們要去穿牆對吧？」");
      if (s5?.type !== "hwGhost" && s5?.type !== "hwWall") return toast("一位披著白床單的客人在走廊上飄來飄去");
      api.dlg("迷路的幽靈客人", { name: "幽靈客人", color: "#7a3fb0" }, s5.type === "hwWall" ? "你回來了！剛剛那些扮幽靈的好可怕……我是說，我也是幽靈，但是他們好可怕。" : "你、你看得見我？我是幽靈！我昨晚穿牆穿到一半，就迷路了。樓梯？幽靈不走樓梯！要穿牆！……可是我一個人不敢。",
        `<button type="button" class="primary" data-act="hwGhost">${s5.type === "hwWall" ? "跟上來吧" : "我陪你穿牆"}</button><button type="button" class="ghost" data-close>等一下</button>`);
    }

    // ===== 喪屍與腦漿蛋糕 =====
    const zombies = [];
    let zNext = Date.now() + 1500;
    const carryingCake = () => stageOf("HW01031-06")?.type === "hwCake" && BAG.count(run.items, "brainCake") > 0;
    if (stageOf("HW01031-06")?.type === "hwCake" && !H.cakePlaced && !BAG.count(run.items, "brainCake")) {
      BAG.add(run.items, "brainCake", 1); save();
      setTimeout(() => toast("髏髏把腦漿蛋糕交給了你。聞起來像草莓"), 500);
    }
    function placeCake() {
      if (!carryingCake()) return;
      BAG.remove(run.items, "brainCake", 1);
      H.cakePlaced = true; zombies.length = 0; save();
      openPanel("喪屍們的餐桌", `<p class="wx-p">你把腦漿蛋糕放上石頭餐桌。</p><p class="wx-p">喪屍住戶們停下腳步，圍著餐桌坐了下來，發出滿足的「嗚啊——」。</p>`);
      advance("HW01031-06");
    }

    // ===== 換樓層 =====
    const sceneMap = (n) => (n === 1 ? R.MAPS.HW01031 : R.MAPS[`HW01031/f${n}`]);
    function toFloor(n, from) {
      if (G.following) { toast("幽靈客人：「幽靈不走樓梯！我們要穿牆！」"); return; }
      const m = sceneMap(n);
      api.changeScene(n === 1 ? null : `f${n}`, from === "up" ? m.fromUp : m.fromDown, `${n}F`);
    }

    // ===== 每一幀 =====
    const stairsZone = LOBBY ? { x: 920, y: MAP.stairs.y, w: 150, h: MAP.stairs.h } : FLOOR ? { x: 720, y: 300, w: 240, h: 260 } : null;
    let wasIn = stairsZone ? inRect(stairsZone, me.x, me.y) : false;
    let nextHop = Date.now() + 8000 + Math.random() * 12000;     // 弗爾斯勒在旅館裡走路時，偶爾會突然跳起來「哇！」一聲
    function update(dt, now) {
      if (api.CH?.id === "firsler" && !YARD && api.moving() && Date.now() > nextHop) {
        nextHop = Date.now() + 15000 + Math.random() * 20000;
        api.hop(); api.say("哇！", 1400);
      }
      if (api.isBusy()) return;
      if (YARD) {
        if (me.y > MAP.backDoor.y - 12 && me.x > MAP.backDoor.x && me.x < MAP.backDoor.x + MAP.backDoor.w) { api.changeScene(null, R.MAPS.HW01031.fromYard, "回到旅館"); return; }
        updateZombies(dt);
        return;
      }
      if (LOBBY && me.y < MAP.door.y + MAP.door.h + 22 && me.x > MAP.door.x && me.x < MAP.door.x + MAP.door.w) { api.changeScene("yard", R.MAPS["HW01031/yard"].arrive, "後院墓園"); return; }
      // 狼人：排好隊的走到隊伍裡
      if (LOBBY) for (const w of H.wolves) if (w.line >= 0) { const q = QUEUE[w.line]; w.x += (q.x - w.x) * Math.min(1, dt * 3); w.y += (q.y - w.y) * Math.min(1, dt * 3); }
      // 迷路的幽靈：跟在後面（穿牆過去，不管牆壁）
      if (G.following) {
        const tx = me.x - 46, ty = me.y + 26, d = dist(G.x, G.y, tx, ty);
        if (d > 4) { G.x += (tx - G.x) * Math.min(1, dt * 2.5); G.y += (ty - G.y) * Math.min(1, dt * 2.5); }
        const s5 = stageOf("HW01031-05");
        if (FLOOR && s5?.type === "hwWall" && dist(me.x, me.y, MAP.fakeWall.x + MAP.fakeWall.w / 2, MAP.fakeWall.y) < 70) {
          G.following = false; save();
          api.setBusy(true);
          openPanel("直走廊盡頭的牆", `<p class="wx-p">牆上的壁紙翹起了一角。你輕輕一推——整面牆無聲地轉開了。</p><p class="wx-p">幽靈客人倒抽一口氣：「穿、穿過去了！我們穿牆了！」</p>
            <p class="wx-p">牆後面是一條窄窄的員工通道，一路往下，通到大廳。</p><div class="tv-row"><button type="button" class="primary" data-act="hwThrough">一起「穿牆」</button></div>`);
          return;
        }
      }
      // 經過樓梯：可能有幽靈扮演者跳出來嚇人
      const inS = inRect(stairsZone, me.x, me.y);
      if (inS && !wasIn && !run.scared && Date.now() > (run.cd.ghost || 0) && Date.now() > (run.grace || 0) && Math.random() < GHOST_CHANCE * (api.lucky?.() ? 0.5 : 1)) {
        run.cd.ghost = Date.now() + GHOST_CD;
        save();
        api.ambushBattle(Math.random() < 0.35 ? "ghostPair" : "ghostActor");
      }
      wasIn = inS;
    }
    function updateZombies(dt) {
      if (!carryingCake() || H.cakePlaced) { zombies.length = 0; return; }
      const grace = Date.now() < (H.zombieGrace || 0);
      if (!grace && Date.now() > zNext && zombies.length < 5) {
        zNext = Date.now() + 1300 + Math.random() * 900;
        const gs = MAP.graves.filter((g) => dist(g.x + g.w / 2, g.y + g.h + 30, me.x, me.y) > 220);
        const g = pick(gs.length ? gs : MAP.graves);
        zombies.push({ x: g.x + g.w / 2, y: g.y + g.h + 36, spd: 95 + Math.random() * 35, face: 0, born: performance.now() });
        api.sfx?.("sounds/slime-move.mp3");
      }
      if (grace) return;
      for (const z of zombies) {
        if (performance.now() - z.born < 700) continue;       // 從土裡爬出來
        const a = Math.atan2(me.y - z.y, me.x - z.x), s = z.spd * dt;
        z.face = a;
        for (const off of [0, 0.6, -0.6, 1.2, -1.2]) {
          const nx = z.x + Math.cos(a + off) * s, ny = z.y + Math.sin(a + off) * s;
          if (!api.blocked(nx, ny, 12)) { z.x = nx; z.y = ny; break; }
        }
        if (dist(z.x, z.y, me.x, me.y) < 36) {
          zombies.splice(zombies.indexOf(z), 1);
          save();
          api.ambushBattle("zombies");
          return;
        }
      }
    }

    // ===== 點擊 =====
    function click(p) {
      if (YARD) {
        if (inRect(MAP.backDoor, p.x, p.y)) { goTo({ x: p.x, y: MAP.backDoor.y + 20 }, null); return true; }
        if (inRect({ x: MAP.altar.x - 20, y: MAP.altar.y - 20, w: MAP.altar.w + 40, h: MAP.altar.h + 50 }, p.x, p.y)) {
          const ax = MAP.altar.x + MAP.altar.w / 2, ay = MAP.altar.y + MAP.altar.h + 30;
          if (carryingCake()) near(ax, ay, 90, placeCake);
          else toast(H.cakePlaced ? "喪屍住戶們圍著蛋糕，吃得很開心" : "墓園最裡面的石頭餐桌。桌上刻著：「喪屍住戶專用」");
          return true;
        }
        const g = MAP.graves.find((r) => inRect({ x: r.x - 10, y: r.y - 30, w: r.w + 20, h: r.h + 40 }, p.x, p.y));
        if (g) { toast(g.zzz ? "墳墓裡傳來打呼聲。喪屍住戶睡得正熟" : "墓碑上寫著：「這裡不提供喪屍套房，請自備墳墓」"); return true; }
        return false;
      }
      // 迷路的幽靈
      if (!G.following && FLOOR === G.floor && trip.accepted.includes("HW01031-05") && !trip.done.includes("HW01031-05") && dist(p.x, p.y, G.x, G.y) < 36) { near(G.x, G.y + 40, 90, ghostClick); return true; }
      if (LOBBY) {
        if (inRect(MAP.door, p.x, p.y)) { goTo({ x: p.x, y: MAP.door.y + MAP.door.h + 10 }, null); return true; }
        if (inRect({ x: MAP.stairs.x - 20, y: MAP.stairs.y, w: MAP.stairs.w + 40, h: MAP.stairs.h }, p.x, p.y)) { near(MAP.stairs.x + MAP.stairs.w + 30, Math.max(MAP.stairs.y + 30, Math.min(MAP.stairs.y + MAP.stairs.h - 30, p.y)), 40, () => toFloor(2, "down")); return true; }
        if (trip.accepted.includes("HW01031-02")) {
          const i = H.wolves.findIndex((w) => dist(p.x, p.y, w.x, w.y) < 30);
          if (i >= 0) { const w = H.wolves[i]; near(w.x, w.y + 40, 90, () => wolfPanel(i)); return true; }
        }
        return false;
      }
      // 2F～4F
      if (inRect({ x: MAP.down.x - 10, y: MAP.down.y, w: MAP.down.w + 40, h: MAP.down.h }, p.x, p.y)) { near(MAP.down.x + MAP.down.w + 30, MAP.down.y + MAP.down.h / 2, 40, () => toFloor(FLOOR - 1, "up")); return true; }
      if (inRect({ x: MAP.up.x, y: MAP.up.y - 10, w: MAP.up.w, h: MAP.up.h + 40 }, p.x, p.y)) {
        if (FLOOR >= 4) { toast("樓梯一直往上延伸，看不到盡頭。5F 以上的萬聖節，今天還沒開放給客人"); return true; }
        near(MAP.up.x + MAP.up.w / 2, MAP.up.y + MAP.up.h + 30, 40, () => toFloor(FLOOR + 1, "down")); return true;
      }
      if (inRect({ x: MAP.fakeWall.x, y: MAP.fakeWall.y - 20, w: MAP.fakeWall.w, h: MAP.fakeWall.h + 20 }, p.x, p.y)) {
        const s5 = stageOf("HW01031-05");
        if (G.following && s5?.type === "hwWall") { goTo({ x: MAP.fakeWall.x + MAP.fakeWall.w / 2, y: MAP.fakeWall.y - 24 }, null); return true; }
        toast(s5 && (s5.type === "hwWall" || s5.type === "hwGhost") ? (G.following ? "就是這面牆。走過去吧" : "壁紙翹起了一角……先找到幽靈客人吧") : "走廊盡頭的牆。壁紙上的南瓜圖案好像有一個是歪的");
        return true;
      }
      // 布料
      const li = H.linen.findIndex((l) => !l.taken && l.f === FLOOR && dist(p.x, p.y, l.x, l.y) < 34);
      if (li >= 0 && trip.accepted.includes("HW01031-03")) { const l = H.linen[li]; near(l.x, l.y + 40, 80, () => linenClick(li)); return true; }
      // 鎖著的房門
      const ri = MAP.hotelRooms.findIndex((rm) => inRect(rm, p.x, p.y) || inRect({ x: rm.door.x - 10, y: rm.door.y - 10, w: rm.door.w + 20, h: rm.door.h + 20 }, p.x, p.y));
      if (ri >= 0 && !isOpen(FLOOR, ri)) {
        const rm = MAP.hotelRooms[ri];
        if (FLOOR === 3 && ri === 1) toast(trip.accepted.includes("HW01031-01") ? "302 號房門上掛著「永夜，請勿打擾」。先向骨骨經理拿鑰匙吧" : "302 號房門上掛著「永夜，請勿打擾」。門縫裡一絲光都沒有");
        else toast(`${rm.no} 號房：${LOCKED[rm.no % LOCKED.length]}`);
        return true;
      }
      return false;
    }

    function act(a, b) {
      if (a === "hwWolf") {
        const i = +b.dataset.i, w = H.wolves[i];
        w.tried = true; save();
        if (w.angry) { angryPanel(i); return true; }
        closePanel();
        lineUp(i, `：「${pick(POLITE)}」——乖乖排進了隊伍`);
        return true;
      }
      if (a === "hwWolfScare") { H.pendingWolf = +b.dataset.i; save(); closePanel(); api.go(`${api.base()}&room=scare&boss=werewolf&init=3`, "嚇唬！"); return true; }
      if (a === "hwWolfShroom") {
        closePanel();
        toast("狼人扮演者：「蘑、蘑菇！？拿開拿開！我排、我排就是了！」");
        lineUp(+b.dataset.i, "一看到蘑菇就逃進了隊伍");
        return true;
      }
      if (a === "hwMummy") { H.pendingLinen = +b.dataset.i; save(); closePanel(); api.go(`${api.base()}&room=scare&boss=mummy&init=3`, "嚇唬！"); return true; }
      if (a === "hwGhost") {
        closePanel();
        G.following = true; G.floor = FLOOR; save();
        if (stageOf("HW01031-05")?.type === "hwGhost") advance("HW01031-05");
        else toast("幽靈客人又跟上來了");
        return true;
      }
      if (a === "hwThrough") {
        closePanel();
        G.through = true; save();
        advance("HW01031-05");
        api.setBusy(false);
        api.changeScene(null, { x: 420, y: 1560 }, "穿牆！");
        return true;
      }
      return false;
    }

    // ===== 繪圖 =====
    function wall(r) { ctx.strokeStyle = "#2a1424"; ctx.lineWidth = 12; ctx.strokeRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12); }
    function pumpkin(x, y, s, now) {
      ctx.fillStyle = "#e8781e"; ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#a84e10"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, s * 0.4, s * 0.8, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#4a7a2a"; ctx.fillRect(x - 3, y - s * 0.8 - 8, 6, 9);
      ctx.fillStyle = `rgba(255,${200 + 40 * Math.sin(now / 160 + x)},80,.95)`;
      ctx.beginPath(); ctx.moveTo(x - s * 0.5, y - s * 0.15); ctx.lineTo(x - s * 0.25, y - s * 0.4); ctx.lineTo(x - s * 0.1, y - s * 0.15); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + s * 0.5, y - s * 0.15); ctx.lineTo(x + s * 0.25, y - s * 0.4); ctx.lineTo(x + s * 0.1, y - s * 0.15); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - s * 0.5, y + s * 0.2); ctx.lineTo(x + s * 0.5, y + s * 0.2); ctx.lineTo(x, y + s * 0.45); ctx.fill();
    }
    function web(x, y, s, flipX, flipY) {
      ctx.save(); ctx.translate(x, y); ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      ctx.strokeStyle = "rgba(230,225,240,.45)"; ctx.lineWidth = 1.5;
      for (let i = 0; i <= 4; i++) { const a = (i / 4) * Math.PI / 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s); ctx.stroke(); }
      for (let k = 1; k <= 3; k++) { ctx.beginPath(); for (let i = 0; i <= 4; i++) { const a = (i / 4) * Math.PI / 2, rr2 = (s * k) / 3.3; i ? ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2) : ctx.moveTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } ctx.stroke(); }
      ctx.restore();
    }
    const fake = (r, x, facing = Math.PI / 2) => ({ r, x, facing, alive: true });
    function stairsBlock(r, col, edge, label, vertical) {
      ctx.fillStyle = col; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.strokeStyle = edge; ctx.lineWidth = 4; ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 3;
      if (vertical) for (let y = r.y + 26; y < r.y + r.h; y += 26) { ctx.beginPath(); ctx.moveTo(r.x, y); ctx.lineTo(r.x + r.w, y); ctx.stroke(); }
      else for (let x = r.x + 26; x < r.x + r.w; x += 26) { ctx.beginPath(); ctx.moveTo(x, r.y); ctx.lineTo(x, r.y + r.h); ctx.stroke(); }
      text(label, r.x + r.w / 2, vertical ? r.y - 14 : r.y - 14, edge, 13, 900);
    }
    function drawHotel(now, x0, y0) {
      ctx.fillStyle = "#2a1424"; ctx.fillRect(x0, y0, 1280, 720);
      const RM = MAP.rooms;
      for (const r of Object.values(RM)) wall(r);
      for (const k of ["lobby", "back", "hall", "corridor", "link"]) {
        const r = RM[k];
        ctx.fillStyle = k === "back" ? "#8a7488" : "#c4b0c0"; ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = "rgba(0,0,0,.18)"; ctx.lineWidth = 1;
        for (let y = r.y + 40; y < r.y + r.h; y += 40) { ctx.beginPath(); ctx.moveTo(r.x, y); ctx.lineTo(r.x + r.w, y); ctx.stroke(); }
      }
      const rs = RM.restaurant;
      for (let y = rs.y; y < rs.y + rs.h; y += 60) for (let x = rs.x; x < rs.x + rs.w; x += 60) { ctx.fillStyle = ((x - rs.x) / 60 + (y - rs.y) / 60) % 2 ? "#a898a8" : "#ece4d8"; ctx.fillRect(x, y, Math.min(60, rs.x + rs.w - x), Math.min(60, rs.y + rs.h - y)); }
      const cp = MAP.carpet;
      ctx.fillStyle = "#6b3f8f"; ctx.fillRect(cp.x, cp.y, cp.w, cp.h);
      ctx.strokeStyle = "#9a6ac0"; ctx.lineWidth = 6;
      ctx.save(); ctx.beginPath(); ctx.rect(cp.x, cp.y, cp.w, cp.h); ctx.clip();
      for (let x = cp.x - cp.h; x < cp.x + cp.w; x += 40) { ctx.beginPath(); ctx.moveTo(x, cp.y + cp.h); ctx.lineTo(x + cp.h, cp.y); ctx.stroke(); }
      ctx.restore();
      ctx.strokeStyle = "#d9a441"; ctx.lineWidth = 4; ctx.strokeRect(cp.x, cp.y, cp.w, cp.h);
      const ct = MAP.counter;
      ctx.fillStyle = "#c8742a"; ctx.fillRect(ct.x, ct.y, ct.w, ct.h); ctx.fillStyle = "#e8a050"; ctx.fillRect(ct.x, ct.y, ct.w, 8);
      const cb = MAP.cabinet;
      ctx.fillStyle = "#151015"; ctx.fillRect(cb.x, cb.y, cb.w, cb.h);
      ctx.fillStyle = "#d9a441"; for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) ctx.fillRect(cb.x + 20 + i * 30, cb.y + 22 + j * 38, 8, 14);
      for (const t of MAP.tables) { ctx.fillStyle = "#e8c23a"; ctx.fillRect(t.x, t.y, t.w, t.h); ctx.strokeStyle = "#a8861a"; ctx.lineWidth = 4; ctx.strokeRect(t.x, t.y, t.w, t.h); ctx.fillStyle = "#fff6e0"; ctx.beginPath(); ctx.arc(t.x + t.w / 2, t.y + t.h / 2, 16, 0, Math.PI * 2); ctx.fill(); }
      for (const c of MAP.chairs) { ctx.fillStyle = "#f2d45a"; ctx.fillRect(c.x, c.y, c.w, c.h); ctx.strokeStyle = "#a8861a"; ctx.lineWidth = 3; ctx.strokeRect(c.x, c.y, c.w, c.h); }
      const food = ["#c0392b", "#7a3fb0", "#3a9a4a", "#e8781e"];
      MAP.buffet.forEach((b, i) => {
        ctx.fillStyle = "#b8b8c0"; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.strokeStyle = "#6a6a74"; ctx.lineWidth = 4; ctx.strokeRect(b.x, b.y, b.w, b.h);
        for (let k = 0; k < 3; k++) { ctx.fillStyle = food[(i + k) % 4]; ctx.beginPath(); ctx.ellipse(b.x + b.w / 2, b.y + 28 + k * ((b.h - 50) / 2), b.w * 0.3, 12, 0, 0, Math.PI * 2); ctx.fill(); }
      });
      // 午夜嚇人比賽的舞台
      if (active("HW01031-04")) {
        const sx = 2240, sy = 1330;
        ctx.fillStyle = "#4a2a3a"; ctx.fillRect(sx - 150, sy - 120, 300, 90);
        ctx.fillStyle = "#8a1a2a"; for (let i = 0; i < 6; i++) ctx.fillRect(sx - 150 + i * 50, sy - 120, 22, 90);
        ctx.fillStyle = "#6a4a3a"; ctx.fillRect(sx - 170, sy - 30, 340, 26); ctx.fillStyle = "#d9a441"; ctx.fillRect(sx - 170, sy - 30, 340, 5);
        text("午夜嚇人比賽", sx, sy - 136, "#ffd06a", 14, 900);
      }
      const d = MAP.door;
      ctx.fillStyle = "#2a6fae"; ctx.fillRect(d.x, d.y, d.w, d.h); ctx.strokeStyle = "#5ab4f0"; ctx.lineWidth = 5; ctx.strokeRect(d.x, d.y, d.w, d.h);
      ctx.strokeStyle = "#173a5a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(d.x + d.w / 2, d.y); ctx.lineTo(d.x + d.w / 2, d.y + d.h); ctx.stroke();
      text("後院墓園", d.x + d.w / 2, d.y - 16, "#9fd4ff", 13, 900);
      stairsBlock(MAP.stairs, "#2a6fae", "#5ab4f0", "↑ 2F", true);
      for (const [x, y, z] of [[120, 1160, 20], [700, 1160, 20], [120, 1820, 18], [960, 1440, 16], [2440, 1820, 18], [1560, 640, 18]]) pumpkin(x, y, z, now);
      web(RM.corridor.x, RM.corridor.y, 90, false, false); web(RM.restaurant.x + RM.restaurant.w, RM.restaurant.y, 110, true, false); web(RM.lobby.x, RM.lobby.y + RM.lobby.h, 80, false, true);
      ctx.strokeStyle = "rgba(200,40,60,.5)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(1470, 1440); for (let i = 1; i <= 8; i++) ctx.lineTo(1470 + i * 26, 1440 + Math.sin(i * 1.4) * 14); ctx.stroke();
      // 穿牆回來的幽靈客人，在大廳開心地飄
      if (G.through && !trip.done.includes("HW01031-05")) drawGhostGuest(560, 1500 + Math.sin(now / 400) * 6, now, true);
    }
    function drawFloorScene(now, x0, y0) {
      ctx.fillStyle = "#1a0e18"; ctx.fillRect(x0, y0, 1280, 720);
      const V = MAP.corridorV, Hc = MAP.corridorH;
      // 客房
      MAP.hotelRooms.forEach((rm, i) => {
        const open = isOpen(FLOOR, i);
        wall(rm);
        if (open) {
          ctx.fillStyle = "#6a4a3a"; ctx.fillRect(rm.x, rm.y, rm.w, rm.h);
          ctx.strokeStyle = "rgba(0,0,0,.2)"; ctx.lineWidth = 1; for (let x = rm.x + 30; x < rm.x + rm.w; x += 30) { ctx.beginPath(); ctx.moveTo(x, rm.y); ctx.lineTo(x, rm.y + rm.h); ctx.stroke(); }
          // 床、地毯、裝飾
          const bx = rm.x + 24, by = rm.y + 24, bw = Math.min(150, rm.w * 0.35), bh = Math.min(110, rm.h * 0.4);
          ctx.fillStyle = "#efe8f4"; ctx.fillRect(bx, by, bw, bh); ctx.fillStyle = "#6b3f8f"; ctx.fillRect(bx, by + bh * 0.35, bw, bh * 0.65); ctx.strokeStyle = "#3a1a4a"; ctx.lineWidth = 3; ctx.strokeRect(bx, by, bw, bh);
          ctx.fillStyle = "rgba(160,40,60,.35)"; ctx.beginPath(); ctx.ellipse(rm.x + rm.w * 0.6, rm.y + rm.h * 0.62, rm.w * 0.22, rm.h * 0.18, 0, 0, Math.PI * 2); ctx.fill();
          if (rm.no % 3 === 0) pumpkin(rm.x + rm.w - 40, rm.y + 40, 16, now);
          else if (rm.no % 3 === 1) { ctx.fillStyle = "#f4e6c8"; for (let k = 0; k < 3; k++) ctx.fillRect(rm.x + rm.w - 50 + k * 12, rm.y + 34 - k * 4, 6, 18 + k * 4); for (let k = 0; k < 3; k++) { ctx.fillStyle = `rgba(255,200,80,${0.7 + 0.3 * Math.sin(now / 130 + k)})`; ctx.beginPath(); ctx.arc(rm.x + rm.w - 47 + k * 12, rm.y + 30 - k * 4, 4, 0, Math.PI * 2); ctx.fill(); } }
          else web(rm.x + rm.w, rm.y, 60, true, false);
          // 302 號房：棺材和伯爵
          if (FLOOR === 3 && i === 1) {
            const cx = rm.x + rm.w / 2, cy = rm.y + rm.h / 2;
            ctx.fillStyle = "#1d1018"; ctx.beginPath(); ctx.moveTo(cx - 70, cy - 22); ctx.lineTo(cx - 50, cy - 36); ctx.lineTo(cx + 70, cy - 30); ctx.lineTo(cx + 70, cy + 30); ctx.lineTo(cx - 50, cy + 36); ctx.lineTo(cx - 70, cy + 22); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#8a1a2a"; ctx.lineWidth = 3; ctx.stroke();
            if (!trip.done.includes("HW01031-01") && ART.vampire) ART.vampire(ctx, fake(22, rm.x), { x: cx + 120, y: cy - 60 }, now);
            else text("伯爵在角落看月亮", cx, cy - 60, "#d9a441", 12, 900);
          }
        } else {
          ctx.fillStyle = "#120a10"; ctx.fillRect(rm.x, rm.y, rm.w, rm.h);
          text(String(rm.no), rm.x + rm.w / 2, rm.y + rm.h / 2, "rgba(217,164,65,.18)", 40, 900);
        }
      });
      // 走廊（暗紅色長地毯）
      for (const r of [V, Hc]) { wall(r); ctx.fillStyle = "#3a2030"; ctx.fillRect(r.x, r.y, r.w, r.h); }
      ctx.fillStyle = "#6a1a2a"; ctx.fillRect(V.x + 50, V.y + 20, V.w - 100, V.h - 20); ctx.fillRect(Hc.x, Hc.y + 50, Hc.w - 20, Hc.h - 100);
      ctx.strokeStyle = "#d9a441"; ctx.lineWidth = 3; ctx.strokeRect(V.x + 50, V.y + 20, V.w - 100, V.h - 20); ctx.strokeRect(Hc.x, Hc.y + 50, Hc.w - 20, Hc.h - 100);
      ctx.fillStyle = "#3a2030"; ctx.fillRect(V.x + 4, Hc.y + 4, V.w - 8, Hc.h - 8); ctx.fillStyle = "#6a1a2a"; ctx.fillRect(V.x + 50, Hc.y + 50, V.w - 50, Hc.h - 100);
      // 房門
      MAP.hotelRooms.forEach((rm, i) => {
        const d = rm.door, open = isOpen(FLOOR, i);
        ctx.fillStyle = open ? "#3a2030" : "#5a2a1a"; ctx.fillRect(d.x, d.y, d.w, d.h);
        if (!open) { ctx.strokeStyle = "#d9a441"; ctx.lineWidth = 2; ctx.strokeRect(d.x + 3, d.y + 3, d.w - 6, d.h - 6); ctx.fillStyle = "#d9a441"; ctx.beginPath(); ctx.arc(d.x + d.w / 2 + (d.w > d.h ? 14 : 0), d.y + d.h / 2 + (d.w > d.h ? 0 : 14), 3, 0, Math.PI * 2); ctx.fill(); }
        // 門牌（在走廊那一側）
        const lx = d.w > d.h ? d.x + d.w / 2 : d.x + (d.x < V.x ? d.w + 26 : -26), ly = d.w > d.h ? d.y + (d.y < Hc.y ? d.h + 16 : -16) : d.y - 12;
        rr(lx - 20, ly - 9, 40, 18, 5); ctx.fillStyle = "rgba(29,16,24,.85)"; ctx.fill();
        text(String(rm.no), lx, ly + 1, open ? "#9fe0a0" : "#d9a441", 11, 900);
      });
      // 樓梯
      stairsBlock(MAP.down, "#a8262c", "#ff7a7a", `↓ ${FLOOR - 1}F`, true);
      stairsBlock(MAP.up, "#2a6fae", "#5ab4f0", FLOOR >= 4 ? "↑ ……" : `↑ ${FLOOR + 1}F`, false);
      // 直走廊盡頭的牆
      const fw = MAP.fakeWall, glow = G.following && stageOf("HW01031-05")?.type === "hwWall";
      ctx.fillStyle = "#4a2a3a"; ctx.fillRect(fw.x, fw.y - 6, fw.w, fw.h);
      for (let x = fw.x + 20; x < fw.x + fw.w; x += 50) pumpkin(x, fw.y + 4, 8, now);
      ctx.fillStyle = "#d9c8a0"; ctx.beginPath(); ctx.moveTo(fw.x + fw.w - 30, fw.y - 6); ctx.lineTo(fw.x + fw.w - 6, fw.y - 6); ctx.lineTo(fw.x + fw.w - 6, fw.y + 14); ctx.closePath(); ctx.fill();
      if (glow) { ctx.strokeStyle = `rgba(190,150,255,${0.5 + 0.5 * Math.sin(now / 200)})`; ctx.lineWidth = 5; ctx.strokeRect(fw.x - 4, fw.y - 10, fw.w + 8, fw.h + 8); text("穿牆點？", fw.x + fw.w / 2, fw.y - 26, "#d8c0ff", 13, 900); }
      // 樓層名稱
      rr(V.x - 520, 1880 - 30, 420, 44, 10); ctx.fillStyle = "rgba(29,16,24,.85)"; ctx.fill();
      text(`${FLOOR}F・${MAP.year} 年的萬聖節`, V.x - 310, 1872, "#ffb04a", 18, 900);
      web(V.x, V.y, 80, false, false); web(Hc.x + Hc.w, Hc.y, 90, true, false);
    }
    function drawYard(now, x0, y0) {
      ctx.fillStyle = "#151d18"; ctx.fillRect(x0, y0, 1280, 720);
      const w = MAP.walk[0];
      ctx.fillStyle = "#2f3f33"; ctx.fillRect(w.x, w.y, w.w, w.h);
      let seed = 3; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
      ctx.strokeStyle = "rgba(120,150,110,.35)"; ctx.lineWidth = 1.5;
      for (let i = 0; i < 500; i++) { const x = w.x + rnd() * w.w, y = w.y + rnd() * w.h; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2, y - 7); ctx.stroke(); }
      ctx.strokeStyle = "#0e0e12"; ctx.lineWidth = 5; ctx.strokeRect(w.x, w.y, w.w, w.h);
      for (let x = w.x; x <= w.x + w.w; x += 40) { ctx.beginPath(); ctx.moveTo(x, w.y); ctx.lineTo(x, w.y - 26); ctx.stroke(); }
      for (let i = 0; i < 6; i++) { const fx = ((now / 60 + i * 420) % (w.w + 600)) - 300; ctx.fillStyle = "rgba(200,210,230,.06)"; ctx.beginPath(); ctx.ellipse(w.x + fx, w.y + 200 + i * 200, 260, 60, 0, 0, Math.PI * 2); ctx.fill(); }
      MAP.graves.forEach((g, i) => {
        g.zzz = i % 4 === 1;
        ctx.fillStyle = "#3a2a20"; ctx.beginPath(); ctx.ellipse(g.x + g.w / 2, g.y + g.h + 30, g.w * 0.6, 26, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#8a8a92"; rr(g.x, g.y - 20, g.w, g.h + 20, 26); ctx.fill(); ctx.strokeStyle = "#4a4a52"; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = "#5a5a62"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(g.x + g.w / 2, g.y - 6); ctx.lineTo(g.x + g.w / 2, g.y + 22); ctx.moveTo(g.x + g.w / 2 - 12, g.y + 4); ctx.lineTo(g.x + g.w / 2 + 12, g.y + 4); ctx.stroke();
        if (g.zzz && !carryingCake()) { const k = (now / 1400 + i) % 1; text("z", g.x + g.w + 10 + k * 18, g.y - 10 - k * 30, `rgba(200,220,255,${1 - k})`, 14 + k * 8, 900); }
      });
      for (const t of MAP.trees) { ctx.fillStyle = "#1a1418"; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#2a2024"; ctx.lineWidth = 6; for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.x + Math.cos(a) * t.r * 1.5, t.y + Math.sin(a) * t.r * 1.5); ctx.stroke(); } }
      // 喪屍們的餐桌
      const al = MAP.altar;
      ctx.fillStyle = "#6a6a72"; rr(al.x, al.y, al.w, al.h, 10); ctx.fill(); ctx.strokeStyle = "#3a3a42"; ctx.lineWidth = 4; ctx.stroke();
      text("喪屍住戶專用", al.x + al.w / 2, al.y - 14, "#b8d8a8", 12, 900);
      if (H.cakePlaced) {
        const cx = al.x + al.w / 2, cy = al.y + al.h / 2;
        ctx.fillStyle = "#e8a0b0"; ctx.beginPath(); ctx.ellipse(cx, cy, 30, 20, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#b85a70"; ctx.lineWidth = 2; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.arc(cx + k * 8, cy, 9, 0.5, 2.6); ctx.stroke(); }
        [[-110, 30], [110, 30], [-60, 110], [60, 110]].forEach(([dx, dy], k) => ART.zombieActor?.(ctx, fake(18, k * 100, Math.atan2(-dy, -dx)), { x: cx + dx, y: cy + dy + Math.sin(now / 300 + k) * 2 }, now));
      }
      const d = MAP.backDoor;
      ctx.fillStyle = "#2a6fae"; ctx.fillRect(d.x, d.y, d.w, d.h); ctx.strokeStyle = "#5ab4f0"; ctx.lineWidth = 5; ctx.strokeRect(d.x, d.y, d.w, d.h);
      text("回旅館", d.x + d.w / 2, d.y - 16, "#9fd4ff", 13, 900);
      for (const [x, y] of [[700, 1300], [1700, 1300]]) pumpkin(x, y, 18, now);
    }
    function drawGhostGuest(x, y, now, happy) {
      ctx.save(); ctx.globalAlpha = 0.82;
      const r = 20;
      ctx.beginPath(); ctx.moveTo(x - r, y + r * 0.9);
      ctx.quadraticCurveTo(x - r * 1.05, y - r * 1.3, x, y - r * 1.2); ctx.quadraticCurveTo(x + r * 1.05, y - r * 1.3, x + r, y + r * 0.9);
      for (let i = 4; i >= 0; i--) ctx.lineTo(x - r + (i * r * 2) / 4, y + r * 0.9 + (i % 2 ? -5 : 3));
      ctx.closePath(); ctx.fillStyle = "#fbf8ff"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = "#9a7ad0"; ctx.stroke();
      ctx.fillStyle = "#1d1d1f"; ctx.beginPath(); ctx.arc(x - 7, y - 6, 3, 0, Math.PI * 2); ctx.arc(x + 7, y - 6, 3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 2; ctx.beginPath(); if (happy) ctx.arc(x, y + 2, 6, 0.2, Math.PI - 0.2); else ctx.arc(x, y + 9, 5, Math.PI + 0.3, -0.3); ctx.stroke();
      ctx.restore();
      if (!happy && !G.following) text("?", x + 22, y - 30 + Math.sin(now / 300) * 3, "#c8a8ff", 18, 900);
    }
    function draw(now) {
      if (LOBBY && trip.accepted.includes("HW01031-02")) {
        H.wolves.forEach((w, i) => {
          const bob = w.line >= 0 ? 0 : Math.sin(now / 200 + i) * 3;
          ART.werewolfActor?.(ctx, fake(18, i * 50, w.line >= 0 ? -Math.PI / 2 : Math.sin(now / 900 + i) * 3), { x: w.x, y: w.y + bob }, now);
          if (w.line < 0 && !trip.done.includes("HW01031-02") && Math.sin(now / 700 + i * 2) > 0.85) text("嗷嗚！", w.x, w.y - 40, "#ffd06a", 12, 900);
        });
      }
      if (FLOOR && trip.accepted.includes("HW01031-03") && !trip.done.includes("HW01031-03")) {
        for (const l of H.linen) {
          if (l.taken || l.f !== FLOOR) continue;
          if (l.mummy) ART.mummyActor?.(ctx, fake(18, l.x), { x: l.x, y: l.y }, now);
          ctx.fillStyle = "#f4f0e8"; for (let k = 0; k < 3; k++) { rr(l.x - 22 + k * 3 + (l.mummy ? 26 : 0), l.y + 6 - k * 8, 40, 10, 4); ctx.fill(); ctx.strokeStyle = "#b8a888"; ctx.lineWidth = 1.5; ctx.stroke(); }
        }
      }
      const s5 = trip.accepted.includes("HW01031-05") && !trip.done.includes("HW01031-05");
      if (s5 && (G.following || FLOOR === G.floor) && !G.through) drawGhostGuest(G.x, G.y + Math.sin(now / 400) * 5, now, G.following);
      if (YARD) for (const z of zombies) {
        const k = Math.min(1, (performance.now() - z.born) / 700);
        ctx.save(); ctx.beginPath(); ctx.rect(z.x - 40, z.y - 60, 80, 60 + 26 * k); ctx.clip();
        ART.zombieActor?.(ctx, fake(18, z.born, z.face), { x: z.x, y: z.y + (1 - k) * 30 }, now);
        ctx.restore();
      }
    }
    function mini(dot, now) {
      if (LOBBY && active("HW01031-02")) for (const w of H.wolves) if (w.line < 0) dot(w.x, w.y, 3, "#a0784a");
      if (FLOOR && active("HW01031-03")) for (const l of H.linen) if (!l.taken && l.f === FLOOR) dot(l.x, l.y, 3, "#f4f0e8");
      if (YARD && carryingCake()) { dot(MAP.altar.x + MAP.altar.w / 2, MAP.altar.y + MAP.altar.h / 2, 4.5, `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`); for (const z of zombies) dot(z.x, z.y, 3, "#5a8a4a"); }
      if (FLOOR && G.following && stageOf("HW01031-05")?.type === "hwWall") dot(MAP.fakeWall.x + MAP.fakeWall.w / 2, MAP.fakeWall.y, 4.5, `rgba(190,150,255,${0.6 + 0.4 * Math.sin(now / 200)})`);
    }
    function speedMul() { return 1; }

    return {
      update, click, act, draw, mini, speedMul,
      stageText: stText,
      drawFloor: YARD ? drawYard : FLOOR ? drawFloorScene : drawHotel,
      drawTop() {
        if (stairsZone) { ctx.fillStyle = "rgba(60,0,80,.10)"; ctx.fillRect(stairsZone.x - (LOBBY ? 70 : 0), stairsZone.y, stairsZone.w + (LOBBY ? 70 : 0), stairsZone.h); }
      },
    };
  };
})();
