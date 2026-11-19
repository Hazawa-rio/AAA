/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/race.js": "20261120001638" });
// 賽跑小遊戲（俯視、跑道會轉彎）：LG00412-02 和荷米斯賽跑用這一份；之後「爆裂時速」也預計用同一套機制
//   R.Race.play(env)：env = {
//     ch（角色）, rival: { name, face, color, wing }（對手的樣子）
//     host（蓋在哪個元素上，預設 body）, busy(v), muted(), sfx(src)
//     say: { start, throw, stun, passed, win, lose }（對手的台詞，陣列隨機挑一句；可以省略）
//     onDone(result) }  result = { win, time, quit }
//   其他時空可以換掉跑道（例如多利島主題公園的滑水道）：
//     course: [{ len }, { ang, r }…]（直線、彎道）, lanes（幾條跑道，預設 7）, speed（基本速度）, theme: "track"／"slide"（滑水道）, tube（滑水道的顏色）
//     rival: null＝沒有對手（計時賽：goal 秒內到終點就贏）；rivalThrows: false＝對手不丟東西
//     hazards: { duck, bubble }（沿路隨機擺好的東西：充氣小鴨＝要閃、泡泡＝撿到加速量表）
//     words: { title, win, lose, hint, go, again, quit }, dark: true＝黑暗的滑水道（只看得到身邊）, anyFinish: true＝輸了也只給「好」
// 規則：
//   跑道有 7 條，單人時從中間那條起跑，速度固定往前；←／→ 可以自由換跑道
//   對手會往後丟東西干擾：陶罐（只能閃）、金蘋果（會往你滾過來；可以打回去讓對手減速）、橄欖油（灑兩條，要閃到另一邊）
//   ←／→（或 A／D）往左右換一條跑道閃避；↑／W／滑鼠左鍵＝揮擊（把金蘋果打回去）
//   進入彎道時畫面上方出現判定條（QTE）：游標來回移動，移到判定框裡時點擊畫面任意位置（每個彎道判定一次）；
//     打中正中間＝完美、打在框裡＝好、打在框外＝失誤（踉蹌）；打得越準，過彎加速越多；彎道結束前沒打完，彎道裡就會變慢
//   加速量表：隨時間慢慢累積；閃過障礙、過彎、把東西打回去都會多加一些；滿了按空白鍵衝刺
//   Esc 暫停
(function () {
  const R = (window.RPG = window.RPG || {});
  const GW = 720, GH = 540, LW = 40, STEP = 8;
  // 跑道：直線＋彎道（ang 正＝右轉）
  const COURSE = [
    { len: 900 }, { ang: 90, r: 360 }, { len: 1100 }, { ang: -90, r: 340 }, { len: 800 }, { ang: 120, r: 380 },
    { len: 1300 }, { ang: -60, r: 420 }, { len: 900 }, { ang: 90, r: 340 }, { len: 1400 }, { ang: -90, r: 360 }, { len: 1100 },
  ];
  // 把跑道切成每 8 單位一個取樣點：位置、方向、屬於哪一個彎道
  function build(course) {
    const X = [], Y = [], A = [], C = [], curves = [];
    let x = 0, y = 0, a = -Math.PI / 2, s = 0;
    for (const seg of course) {
      if (seg.len) { for (let d = 0; d < seg.len; d += STEP) { X.push(x); Y.push(y); A.push(a); C.push(-1); x += Math.cos(a) * STEP; y += Math.sin(a) * STEP; } s += seg.len; continue; }
      const tot = Math.abs(seg.ang) * Math.PI / 180 * seg.r, n = Math.round(tot / STEP), da = (seg.ang * Math.PI / 180) / n, id = curves.length;
      curves.push({ s0: s, s1: s + n * STEP, ang: seg.ang, beats: 1 });
      for (let i = 0; i < n; i++) { X.push(x); Y.push(y); A.push(a); C.push(id); x += Math.cos(a + da / 2) * STEP; y += Math.sin(a + da / 2) * STEP; a += da; }
      s += n * STEP;
    }
    X.push(x); Y.push(y); A.push(a); C.push(-1);
    return { X, Y, A, C, curves, L: (X.length - 1) * STEP };
  }
  const DEFAULT_T = build(COURSE);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => (arr?.length ? arr[Math.floor(Math.random() * arr.length)] : null);

  function play(env) {
    const CH = env.ch || { name: "你", letter: "你", color: "#c0392b" };
    const SOLO = env.rival === null, RV = env.rival || { name: "荷米斯", face: "荷", color: "#e8c84a", wing: true };
    const T = env.course ? build(env.course) : DEFAULT_T, LANES = env.lanes || 7, MID = (LANES - 1) / 2, BASE = env.speed || 300;
    const SLIDE = env.theme === "slide", WD = env.words || {}, THROWS = !SOLO && env.rivalThrows !== false;
    const at = (s) => Math.max(0, Math.min(T.X.length - 1, Math.round(s / STEP)));
    // 跑道上的位置（lane＝0～LANES-1，可以是小數）
    function pos(s, lane) {
      const i = at(s), a = T.A[i], off = (lane - MID) * LW;
      return { x: T.X[i] + Math.cos(a + Math.PI / 2) * off, y: T.Y[i] + Math.sin(a + Math.PI / 2) * off, a };
    }
    env.busy?.(true);
    const sfx = (src) => { if (!env.muted?.()) env.sfx?.(src); };
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:fixed;inset:0;z-index:300;background:rgba(20,16,8,.88);display:flex;align-items:center;justify-content:center;gap:20px";
    wrap.innerHTML = `<canvas width="${GW}" height="${GH}" style="width:min(${GW}px,96vw,${Math.round(94 * GW / GH)}vh);height:auto;border:4px solid #c8a040;border-radius:6px;background:#d9c49a"></canvas>
      <div style="position:absolute;bottom:16px;left:50%;transform:translateX(-50%);display:flex;gap:8px" class="rc-btns"></div>`;
    (env.host || document.body).appendChild(wrap);
    const cv = wrap.querySelector("canvas"), g = cv.getContext("2d"), btns = wrap.querySelector(".rc-btns");
    const G = {
      t: -3, over: null, pause: false, keys: {},
      p: { s: 0, lat: Math.round(MID), want: Math.round(MID), slow: 0, slowMult: 1, boost: 0, gauge: 0.15, swing: 0, swingCd: 0, curveMult: 1, curveUntil: -1, shake: 0, stumble: 0 },
      h: { s: SOLO ? -1e9 : env.rivalStart ?? 240, lat: Math.max(0, Math.round(MID) - 1), want: Math.max(0, Math.round(MID) - 1), laneT: 2, throwT: 1.6, stun: 0, bubble: null },
      objs: [], fx: [], qte: null, curveSeen: {}, msg: null, camA: null,
    };
    const P = G.p, H = G.h;
    // 沿路擺好的東西（滑水道：充氣小鴨要閃、泡泡撿起來加速量表）
    if (env.hazards) {
      for (let s = 500; s < T.L - 300; s += rnd(260, 420)) {
        const lane = Math.floor(Math.random() * LANES), kind = Math.random() < (env.hazards.bubble || 0) ? "bubble" : "duck";
        G.objs.push({ kind, s, lanes: [lane], aim: lane, from: { s, lat: lane }, fly: 1, land: true, done: false, fixed: true });
      }
    }
    const bubble = (k) => { const s = pick(env.say?.[k]); if (s) H.bubble = { text: s, until: G.t + 1.8 }; };
    const flash = (text, col = "#fff") => { G.msg = { text, col, t: G.t }; };
    const gain = (n) => { P.gauge = Math.min(1, P.gauge + n); };

    // ===== 輸入 =====
    const sidestep = (d) => { if (G.t < 0 || G.over || G.pause) return; P.want = Math.max(0, Math.min(LANES - 1, P.want + d)); };
    const swing = () => {
      if (G.t < 0 || G.over || G.pause || P.swingCd > 0) return;
      P.swing = 0.25; P.swingCd = 0.35;
      const lane = Math.round(P.lat);
      const ap = G.objs.find((o) => o.kind === "apple" && o.land && !o.back && !o.done && o.s - P.s > -6 && o.s - P.s < 120 && o.lanes.includes(lane));
      if (!ap) return;
      ap.back = true; ap.done = true; ap.lat = P.lat;
      sfx("sounds/bastian-impact-1.mp3"); flash("打回去了！", "#ffe48a"); gain(0.2);
    };
    // QTE：游標在判定條上來回移動（一趟 0.55 秒），在判定框裡點擊
    const SWEEP = 0.55;
    const newBeat = (Q) => { Q.c = rnd(0.22, 0.78); Q.w = 0.17; Q.pw = 0.05; Q.bt = G.t; };
    const cursor = (Q) => { const k = ((G.t - Q.bt) / SWEEP) % 2; return k < 1 ? k : 2 - k; };
    const qteHit = () => {
      const Q = G.qte; if (!Q || Q.done || Q.fail) return false;
      const d = Math.abs(cursor(Q) - Q.c), sc = d <= Q.pw / 2 ? 1 : d <= Q.w / 2 ? 0.6 : 0;
      Q.res.push(sc); Q.pop = G.t;
      if (sc === 0) { P.stumble = 0.3; P.shake = 0.25; sfx("sounds/slime-move.mp3"); }
      else sfx("sounds/guan-chime.mp3");
      if (Q.res.length >= Q.n) {
        Q.done = true;
        const avg = Q.res.reduce((a, b) => a + b, 0) / Q.n, m = 1 + 0.55 * avg;
        P.curveMult = m; P.curveUntil = T.curves[Q.id].s1 + 300;
        gain(0.04 + avg * 0.2);
        flash(avg >= 0.99 ? `完美過彎！×${m.toFixed(2)}` : avg >= 0.6 ? `漂亮的過彎 ×${m.toFixed(2)}` : `過彎 ×${m.toFixed(2)}`, "#8affc8");
      } else newBeat(Q);
      return true;
    };
    const dash = () => { if (G.t < 0 || G.over || G.pause || P.gauge < 1) return; P.gauge = 0; P.boost = 2.6; sfx("sounds/hoffman-jet.mp3"); flash("衝刺！", "#ffcf4a"); };
    const kd = (e) => {
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
      if (e.repeat) { e.stopPropagation(); return; }
      if (k === "escape" && !G.over) G.pause = !G.pause;
      else if (k === "arrowleft" || k === "a") sidestep(-1);
      else if (k === "arrowright" || k === "d") sidestep(1);
      else if ((k === "arrowup" || k === "w") && THROWS) swing();
      else if (k === " ") dash();
      e.stopPropagation();
    };
    const md = (e) => { if (e.button !== 0) return; e.preventDefault(); if (!qteHit() && THROWS) swing(); };          // 彎道判定中：左鍵打判定；其他時候：揮擊
    window.addEventListener("keydown", kd, true); cv.addEventListener("mousedown", md);
    const setBtns = (html) => { btns.innerHTML = html; };
    setBtns(`<button type="button" class="ghost" data-rc="quit" style="background:#fff">${WD.quit || "放棄比賽"}</button>`);
    btns.addEventListener("click", (e) => {
      const a = e.target.closest("[data-rc]")?.dataset.rc;
      if (a === "quit") finish({ win: false, quit: true });
      if (a === "again") finish({ win: false, again: true });
      if (a === "ok") finish({ win: !!G.over?.win, time: G.over?.time });
    });
    function finish(result) {
      cancelAnimationFrame(G.raf); wrap.remove();
      window.removeEventListener("keydown", kd, true);
      env.busy?.(false);
      env.onDone?.(result);
    }

    // ===== 對手丟東西 =====
    function hermesThrow() {
      const gap = H.s - P.s;
      if (gap < 180 || gap > 950) return;
      const land = Math.max(H.s - rnd(240, 420), P.s + 150);               // 至少留半秒反應時間
      if (land > H.s - 30) return;
      const r = Math.random(), kind = r < 0.42 ? "pot" : r < 0.78 ? "apple" : "oil";
      // 瞄準玩家現在的跑道（有時候丟偏一條）
      const aim = Math.round(P.want), clampL = (l) => Math.max(0, Math.min(LANES - 1, l));
      let side = Math.random() < 0.5 ? -1 : 1;
      if (clampL(aim + side) === aim) side = -side;
      const lanes = kind === "oil" ? [aim, aim + side] : [Math.random() < 0.68 ? aim : aim + side];
      G.objs.push({ kind, s: land, lanes, aim, from: { s: H.s, lat: H.lat }, fly: 0, land: false, done: false });
      if (Math.random() < 0.35) bubble("throw");
      sfx("sounds/vivilla-throw.mp3");
    }

    // ===== 每一格 =====
    function step(dt) {
      G.t += dt;
      if (G.t < 0) return;                                   // 倒數
      // --- 玩家 ---
      P.lat += Math.sign(P.want - P.lat) * Math.min(Math.abs(P.want - P.lat), dt * 9);
      for (const k of ["slow", "boost", "swing", "swingCd", "stumble", "shake"]) P[k] = Math.max(0, P[k] - dt);
      const ci = T.C[at(P.s)];
      // 進入彎道：出現 QTE
      if (ci >= 0 && !G.curveSeen[ci]) {
        G.curveSeen[ci] = true;
        G.qte = { id: ci, n: T.curves[ci].beats, res: [], t0: G.t, done: false, fail: false };
        newBeat(G.qte);
        P.curveMult = 1; P.curveUntil = -1;
      }
      if (G.qte && !G.qte.done && !G.qte.fail && ci !== G.qte.id) { G.qte.fail = true; flash("過彎太慢了……", "#ffb0a0"); }
      if (G.qte && (G.qte.done || G.qte.fail) && P.s > T.curves[G.qte.id].s1 + 320) G.qte = null;
      let v = BASE;
      if (ci >= 0 && !(G.qte?.done && G.qte.id === ci)) v *= 0.8;                // 還沒按完：彎道裡變慢
      if (P.s < P.curveUntil) v *= P.curveMult;                                    // 過彎加速（一直到出彎後一小段）
      if (P.slow > 0) v *= P.slowMult;
      if (P.stumble > 0) v *= 0.82;
      if (P.boost > 0) v *= 1.55;
      P.v = v;
      P.s += v * dt;
      gain(dt / 15);
      // --- 對手 ---
      if (!SOLO) {
      H.stun = Math.max(0, H.stun - dt);
      H.laneT -= dt;
      if (H.laneT <= 0) { H.laneT = rnd(1.6, 3.4); H.want = Math.floor(Math.random() * LANES); }
      H.lat += Math.sign(H.want - H.lat) * Math.min(Math.abs(H.want - H.lat), dt * 2.4);
      const gap = H.s - P.s;
      let hv = BASE * 1.05;
      if (T.C[at(H.s)] >= 0) hv *= 0.9;
      if (gap > 700) hv *= 0.88; else if (gap < -120) hv *= 1.12;             // 不會跑太遠，也不會被丟太遠
      if (H.stun > 0) hv *= 0.42;
      H.s += hv * dt;
      if (gap < -60 && !H.saidPass) { H.saidPass = true; bubble("passed"); }
      if (gap > 60) H.saidPass = false;
      H.throwT -= dt;
      if (H.throwT <= 0) { H.throwT = rnd(1.3, 2.1); if (H.stun <= 0 && THROWS) hermesThrow(); }
      }
      // --- 丟出來的東西 ---
      for (const o of G.objs) {
        if (o.back) {
          // 被打回去：往前飛，追著對手
          o.s += 950 * dt; o.lat += (H.lat - o.lat) * Math.min(1, dt * 6);
          if (o.s >= H.s) { o.gone = true; H.stun = 1.5; bubble("stun"); sfx("sounds/slime-ram.mp3"); flash(`打中${RV.name}了！`, "#ffe48a"); G.fx.push({ s: H.s, lat: H.lat, t: G.t, kind: "star" }); }
          if (o.s > T.L) o.gone = true;
          continue;
        }
        if (!o.land) { o.fly += dt / 0.6; if (o.fly >= 1) { o.land = true; o.fly = 1; } continue; }
        if (o.kind === "apple") o.s -= 80 * dt;                              // 金蘋果會往後滾
        if (o.kind === "bubble") {
          if (!o.done && Math.abs(o.s - P.s) < 22 && o.lanes.includes(Math.round(P.lat))) { o.done = o.gone = true; gain(0.14); flash("泡泡！", "#bfe8ff"); sfx("sounds/guan-chime.mp3"); }
          else if (o.s < P.s - 400) o.gone = true;
          continue;
        }
        if (o.done) { if (o.s < P.s - 400) o.gone = true; continue; }
        const d = o.s - P.s, lane = Math.round(P.lat);
        if (Math.abs(d) < 18 && o.lanes.includes(lane)) {
          o.done = true; o.hit = true;
          const S = { pot: [0.45, 0.9, "陶罐砸到腳了！"], apple: [0.6, 0.7, "被金蘋果絆到了"], oil: [0.5, 1.3, "踩到橄欖油，滑了一跤！"], duck: [0.55, 0.8, "撞到充氣小鴨了！"] }[o.kind];
          P.slowMult = S[0]; P.slow = S[1]; P.shake = 0.35; flash(S[2], "#ffb0a0");
          sfx(o.kind === "pot" || o.kind === "duck" ? "sounds/bastian-impact-2.mp3" : "sounds/slime-move.mp3");
          G.fx.push({ s: o.s, lat: P.lat, t: G.t, kind: o.kind === "pot" ? "shard" : "splash" });
        } else if (d < -18) {
          o.done = true;
          if (o.lanes.includes(o.aim) && (!o.fixed || Math.abs(o.lanes[0] - P.lat) < 1.6)) { gain(0.1); flash("閃過了！", "#bfe8ff"); }       // 本來瞄準你的（或擦身而過），閃掉了
        }
      }
      G.objs = G.objs.filter((o) => !o.gone);
      G.fx = G.fx.filter((f) => G.t - f.t < 0.8);
      // --- 終點 ---
      if (P.s >= T.L || H.s >= T.L) {
        const win = SOLO ? G.t <= env.goal : P.s >= T.L && (H.s < T.L || P.s - T.L >= H.s - T.L);
        G.over = { win, time: G.t };
        bubble(win ? "win" : "lose");
        sfx(win ? "sounds/passion-bell.mp3" : "sounds/turn-start.mp3");
        setBtns(win || env.anyFinish ? `<button type="button" class="primary" data-rc="ok">好</button>` : `<button type="button" class="primary" data-rc="again">${WD.again || "再跑一次"}</button><button type="button" class="ghost" data-rc="quit" style="background:#fff">先不要</button>`);
      }
    }

    // ===== 畫面 =====
    function line(s0, s1, lane, stroke, w, dash) {
      g.strokeStyle = stroke; g.lineWidth = w; g.setLineDash(dash || []); g.beginPath();
      for (let s = s0; s <= s1; s += STEP) { const q = pos(s, lane); s === s0 ? g.moveTo(q.x, q.y) : g.lineTo(q.x, q.y); }
      g.stroke(); g.setLineDash([]);
    }
    function runner(s, lat, color, letter, fill, wing, now, lean) {
      const q = pos(s, lat);
      g.save(); g.translate(q.x, q.y); g.rotate(q.a + Math.PI / 2);
      g.fillStyle = "rgba(0,0,0,.18)"; g.beginPath(); g.ellipse(0, 12, 14, 5, 0, 0, Math.PI * 2); g.fill();
      const bob = Math.abs(Math.sin(now / 70)) * 3;
      g.translate(0, -bob); g.rotate(lean || 0);
      if (wing) {
        const fl = Math.sin(now / 60) * 4;
        g.fillStyle = "#fff"; g.strokeStyle = "#c8b88a"; g.lineWidth = 1.2;
        for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 14, -4); g.lineTo(sx * 28, -12 - fl); g.lineTo(sx * 24, -2); g.lineTo(sx * 30, 2 - fl / 2); g.lineTo(sx * 14, 6); g.closePath(); g.fill(); g.stroke(); }
      }
      g.fillStyle = fill || "#fff"; g.strokeStyle = color; g.lineWidth = 3;
      g.beginPath(); g.rect(-15, -15, 30, 30); g.fill(); g.stroke();
      g.fillStyle = color; g.font = "900 16px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(letter, 0, 1);
      g.restore();
    }
    function obj(o, now) {
      let q, h = 0;
      if (!o.land) {
        const a = pos(o.from.s, o.from.lat), b = pos(o.s, o.lanes[0]);
        q = { x: a.x + (b.x - a.x) * o.fly, y: a.y + (b.y - a.y) * o.fly, a: b.a }; h = Math.sin(o.fly * Math.PI) * 50;
      } else q = pos(o.s, o.back ? o.lat : o.lanes.length > 1 ? (o.lanes[0] + o.lanes[1]) / 2 : o.lanes[0]);
      g.save(); g.translate(q.x, q.y); g.rotate(q.a + Math.PI / 2);
      if (h) { g.fillStyle = "rgba(0,0,0,.15)"; g.beginPath(); g.ellipse(0, 0, 10, 4, 0, 0, Math.PI * 2); g.fill(); g.translate(0, -h); }
      if (o.kind === "pot") {
        g.fillStyle = "#b8643a"; g.strokeStyle = "#5a2a14"; g.lineWidth = 2;
        g.beginPath(); g.moveTo(-6, -14); g.lineTo(6, -14); g.lineTo(5, -9); g.quadraticCurveTo(14, -2, 9, 10); g.lineTo(-9, 10); g.quadraticCurveTo(-14, -2, -5, -9); g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = "#1d1d1f"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-9, 0); g.lineTo(9, 0); g.stroke();
      } else if (o.kind === "apple") {
        if (o.land && !o.back) g.rotate(-now / 150);
        g.fillStyle = "#f2c200"; g.strokeStyle = "#a07800"; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 10, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = "#fff6c0"; g.beginPath(); g.arc(-3, -3, 3, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "#5a7a2a"; g.beginPath(); g.moveTo(0, -10); g.lineTo(2, -15); g.stroke();
        if (o.land && !o.back && !o.done && o.s - P.s < 160 && o.s - P.s > -6) { g.rotate(now / 150); g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 17 + Math.sin(now / 80) * 2, 0, Math.PI * 2); g.stroke(); }
      } else if (o.kind === "duck") {
        // 充氣小鴨（滑水道裡漂著的）
        const bob = Math.sin(now / 200 + o.s) * 2;
        g.fillStyle = "#ffd23a"; g.strokeStyle = "#a07800"; g.lineWidth = 2;
        g.beginPath(); g.ellipse(0, 4 + bob, 15, 11, 0, 0, Math.PI * 2); g.fill(); g.stroke();
        g.beginPath(); g.arc(0, -8 + bob, 8, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = "#ff8a2a"; g.beginPath(); g.moveTo(-3, -14 + bob); g.lineTo(3, -14 + bob); g.lineTo(0, -20 + bob); g.closePath(); g.fill();
        g.fillStyle = "#1d1d1f"; g.fillRect(-4, -10 + bob, 2, 2); g.fillRect(2, -10 + bob, 2, 2);
      } else if (o.kind === "bubble") {
        const r = 9 + Math.sin(now / 150 + o.s) * 1.5;
        g.strokeStyle = "rgba(255,255,255,.95)"; g.fillStyle = "rgba(190,240,255,.35)"; g.lineWidth = 2;
        g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = "#fff"; g.beginPath(); g.arc(-r * 0.35, -r * 0.35, 2.5, 0, Math.PI * 2); g.fill();
      } else {
        const w = o.land ? LW * (o.lanes.length) * 0.48 : 10;
        g.fillStyle = "rgba(170,150,40,.75)"; g.beginPath(); g.ellipse(0, 0, w, o.land ? 16 : 8, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "rgba(255,250,200,.6)"; g.beginPath(); g.ellipse(-w * 0.3, -4, w * 0.25, 4, 0, 0, Math.PI * 2); g.fill();
        if (!o.land) { g.fillStyle = "#8a6a3a"; g.fillRect(-5, -10, 10, 14); }
      }
      g.restore();
    }
    function render(now) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = SLIDE ? "#bfe6f2" : "#d9c49a"; g.fillRect(0, 0, GW, GH);
      const me = pos(P.s, P.lat), ang = -Math.PI / 2 - me.a;
      if (G.camA == null) G.camA = ang;
      let da = ang - G.camA; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      G.camA += da * 0.12;
      const sh = P.shake > 0 ? (Math.random() - 0.5) * 8 : 0;
      g.save();
      g.translate(GW / 2 + sh, GH * 0.74);
      g.rotate(G.camA);
      const cen = pos(P.s, MID); g.translate(-cen.x, -cen.y);
      const s0 = Math.max(0, Math.floor((P.s - 420) / STEP) * STEP), s1 = Math.min(T.L, P.s + 900);
      // 地面上的點綴（橄欖樹、柱子；滑水道：底下遠遠的椰子樹和泳池），固定的位置
      if (SLIDE) for (let s = Math.ceil(s0 / 180) * 180; s <= s1; s += 180) {
        const k = s / 180, side = k % 2 ? 1 : -1, q = pos(s, MID + side * (LANES / 2 + 2 + (k % 3) * 0.8));
        if (k % 3 === 0) { g.fillStyle = "#5ac8f0"; g.beginPath(); g.ellipse(q.x, q.y, 34, 20, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 3; g.stroke(); }
        else { g.fillStyle = "#3d9a5b"; for (let i = 0; i < 5; i++) { const a = i * 1.26 + k; g.beginPath(); g.ellipse(q.x + Math.cos(a) * 10, q.y + Math.sin(a) * 10, 12, 5, a, 0, Math.PI * 2); g.fill(); } g.fillStyle = "#8a6a3a"; g.beginPath(); g.arc(q.x, q.y, 4, 0, Math.PI * 2); g.fill(); }
      }
      else for (let s = Math.ceil(s0 / 230) * 230; s <= s1; s += 230) {
        const k = s / 230, side = k % 2 ? 1 : -1, q = pos(s, MID + side * (4.6 + (k % 3) * 0.6));
        if (k % 4 === 1) { g.fillStyle = "#f4efe4"; g.fillRect(q.x - 9, q.y - 9, 18, 18); g.strokeStyle = "#c8bca0"; g.lineWidth = 2; g.strokeRect(q.x - 9, q.y - 9, 18, 18); }
        else { g.fillStyle = "#7a8a4a"; g.beginPath(); g.arc(q.x, q.y, 16, 0, Math.PI * 2); g.fill(); g.fillStyle = "#94a85a"; g.beginPath(); g.arc(q.x - 4, q.y - 4, 8, 0, Math.PI * 2); g.fill(); }
      }
      // 跑道（紅土；滑水道：管子的外殼＋水道）
      const band = (l0, l1, col) => { g.fillStyle = col; g.beginPath(); for (let s = s0; s <= s1; s += STEP) { const q = pos(s, l0); s === s0 ? g.moveTo(q.x, q.y) : g.lineTo(q.x, q.y); } for (let s = s1; s >= s0; s -= STEP) { const q = pos(s, l1); g.lineTo(q.x, q.y); } g.closePath(); g.fill(); };
      if (SLIDE) { band(-0.95, LANES - 0.05, env.tube || "#e84a8a"); band(-0.5, LANES - 0.5, "#5ac8f0"); }
      else band(-0.5, LANES - 0.5, "#b8583a");
      // 彎道：外側的箭頭記號
      for (const c of T.curves) {
        if (c.s1 < s0 || c.s0 > s1) continue;
        for (let s = Math.max(c.s0, s0); s <= Math.min(c.s1, s1); s += 70) {
          const lane = c.ang > 0 ? -1.1 : LANES + 0.1, q = pos(s, lane);
          g.save(); g.translate(q.x, q.y); g.rotate(q.a + Math.PI / 2); g.fillStyle = "#f2c200"; g.strokeStyle = "#1d1d1f"; g.lineWidth = 1.5;
          const d = c.ang > 0 ? 1 : -1; g.beginPath(); g.moveTo(-8 * d, -8); g.lineTo(6 * d, 0); g.lineTo(-8 * d, 8); g.closePath(); g.fill(); g.stroke(); g.restore();
        }
      }
      // 跑道線（滑水道：往後流的水紋）
      if (SLIDE) {
        const off = (now / 4) % 60;
        for (let k = 0; k < LANES; k++) { g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 2; g.setLineDash([18, 42]); g.lineDashOffset = off; g.beginPath(); for (let s = s0; s <= s1; s += STEP) { const q = pos(s, k); s === s0 ? g.moveTo(q.x, q.y) : g.lineTo(q.x, q.y); } g.stroke(); }
        g.setLineDash([]); g.lineDashOffset = 0;
        line(s0, s1, -0.5, "#fff", 3); line(s0, s1, LANES - 0.5, "#fff", 3);
      } else for (let k = 0; k <= LANES; k++) line(s0, s1, k - 0.5, k === 0 || k === LANES ? "#fff" : "rgba(255,255,255,.65)", k === 0 || k === LANES ? 4 : 2, k === 0 || k === LANES ? null : [14, 10]);
      // 起點、終點
      for (const [s, chk] of [[0, false], [T.L - 4, true]]) {
        if (s < s0 - 10 || s > s1 + 10) continue;
        for (let k = 0; k < LANES * 2; k++) for (let r = 0; r < 2; r++) {
          const q = pos(s - r * 10, -0.5 + (k + 0.5) / 2);
          g.fillStyle = chk ? ((k + r) % 2 ? "#1d1d1f" : "#fff") : "#fff";
          g.save(); g.translate(q.x, q.y); g.rotate(q.a + Math.PI / 2); g.fillRect(-10, -5, 20, 10); g.restore();
        }
      }
      // 東西、特效、跑者
      for (const o of G.objs) obj(o, now);
      for (const f of G.fx) {
        const q = pos(f.s, f.lat), k = (G.t - f.t) / 0.8;
        g.globalAlpha = 1 - k;
        if (f.kind === "star") { g.fillStyle = "#ffe48a"; for (let i = 0; i < 6; i++) { const a = i * 1.05 + k * 3; g.beginPath(); g.arc(q.x + Math.cos(a) * 24, q.y + Math.sin(a) * 24 - 10, 4, 0, Math.PI * 2); g.fill(); } }
        else if (f.kind === "shard") { g.fillStyle = "#b8643a"; for (let i = 0; i < 7; i++) { const a = i * 0.9; g.fillRect(q.x + Math.cos(a) * k * 40, q.y + Math.sin(a) * k * 40, 6, 4); } }
        else { g.fillStyle = "rgba(200,180,60,.7)"; for (let i = 0; i < 6; i++) { const a = i * 1.05; g.beginPath(); g.arc(q.x + Math.cos(a) * k * 30, q.y + Math.sin(a) * k * 30, 4, 0, Math.PI * 2); g.fill(); } }
        g.globalAlpha = 1;
      }
      // 衝刺的殘影
      if (P.boost > 0) for (let i = 1; i <= 4; i++) { g.globalAlpha = 0.18 * (5 - i) / 4; runner(P.s - i * 18, P.lat, CH.color, "", "#fff", false, now); }
      g.globalAlpha = 1;
      if (!SOLO) runner(H.s, H.lat, RV.color, RV.face, "#fffbe8", RV.wing, now, H.stun > 0 ? Math.sin(now / 60) * 0.3 : 0);
      runner(P.s, P.lat, CH.color, CH.letter || CH.name?.[0] || "你", "#fff", false, now, P.stumble > 0 || P.slow > 0 ? Math.sin(now / 50) * 0.2 : 0);
      // 揮擊
      if (P.swing > 0) {
        const q = pos(P.s + 30, P.lat), k = 1 - P.swing / 0.25;
        g.save(); g.translate(q.x, q.y); g.rotate(q.a + Math.PI / 2); g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 5; g.beginPath(); g.arc(0, 20, 34, -Math.PI / 2 - 1.2 + k * 1.2, -Math.PI / 2 + k * 1.4); g.stroke(); g.restore();
      }
      // 對手的對話框
      if (H.bubble && G.t < H.bubble.until) {
        const q = pos(H.s, H.lat);
        g.save(); g.translate(q.x, q.y); g.rotate(-G.camA);
        g.font = "700 13px sans-serif"; const w = g.measureText(H.bubble.text).width + 16;
        g.fillStyle = "#fff"; g.strokeStyle = RV.color; g.lineWidth = 2; g.beginPath(); g.rect(-w / 2, -54, w, 24); g.fill(); g.stroke();
        g.fillStyle = "#1d1d1f"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(H.bubble.text, 0, -42); g.restore();
      }
      g.restore();
      // 黑暗的滑水道（env.dark）：只看得到身邊一小圈
      if (env.dark) {
        const gr = g.createRadialGradient(GW / 2, GH * 0.74, 60, GW / 2, GH * 0.74, 230);
        gr.addColorStop(0, "rgba(5,5,15,0)"); gr.addColorStop(1, "rgba(5,5,15,.96)");
        g.fillStyle = gr; g.fillRect(0, 0, GW, GH);
        for (let i = 0; i < 18; i++) { const x = (i * 157 + now / 30) % GW, y = (i * 97) % (GH * 0.5); g.fillStyle = `rgba(200,180,255,${0.3 + 0.3 * Math.sin(now / 300 + i)})`; g.fillRect(x, y, 2, 2); }   // 黑洞裡的星星燈
      }
      hud(now);
    }
    function hud(now) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      const txt = (t, x, y, col = "#fff", size = 14, align = "center") => { g.font = `900 ${size}px sans-serif`; g.textAlign = align; g.textBaseline = "middle"; g.lineWidth = 4; g.strokeStyle = "rgba(29,29,31,.75)"; g.strokeText(t, x, y); g.fillStyle = col; g.fillText(t, x, y); };
      // 進度條
      const bx = 60, bw = GW - 120, by = 18;
      g.fillStyle = "rgba(29,29,31,.45)"; g.fillRect(bx, by, bw, 8);
      for (const c of T.curves) { g.fillStyle = "rgba(242,194,0,.6)"; g.fillRect(bx + (c.s0 / T.L) * bw, by, ((c.s1 - c.s0) / T.L) * bw, 8); }
      const mk = (s, col, l) => { const x = bx + Math.min(1, s / T.L) * bw; g.fillStyle = col; g.fillRect(x - 7, by - 6, 14, 20); g.fillStyle = "#fff"; g.font = "900 10px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(l, x, by + 4); };
      if (!SOLO) mk(H.s, RV.color, RV.face);
      mk(P.s, CH.color, CH.letter || CH.name?.[0] || "你");
      txt("終", bx + bw + 16, by + 4, "#fff", 13);
      if (SOLO) txt(`目標 ${env.goal} 秒內滑到底`, GW / 2, 46, G.t <= env.goal ? "#8affc8" : "#ffb0a0", 15);
      else { const gap = Math.round((P.s - H.s) / 10); txt(gap >= 0 ? `領先 ${gap} m` : `落後 ${-gap} m`, GW / 2, 46, gap >= 0 ? "#8affc8" : "#ffb0a0", 15); }
      txt(`${Math.max(0, G.t).toFixed(1)} 秒`, GW - 16, 46, "#fff", 13, "right");
      // 加速量表
      const gx = 16, gy = GH - 34, gw = 170;
      g.fillStyle = "rgba(29,29,31,.5)"; g.fillRect(gx, gy, gw, 14);
      g.fillStyle = P.gauge >= 1 ? `hsl(${(now / 4) % 360},90%,60%)` : "#ffcf4a"; g.fillRect(gx, gy, gw * P.gauge, 14);
      txt(P.gauge >= 1 ? "加速好了！按空白鍵" : "加速量表", gx, gy - 12, "#fff", 12, "left");
      txt(`${Math.round((P.v || 0) / 10)} km/h`, GW - 16, GH - 26, P.boost > 0 ? "#ffcf4a" : "#fff", 16, "right");
      txt(WD.hint || (THROWS ? "←／→（A／D）換跑道　↑／W／左鍵 把金蘋果打回去　彎道 判定框裡點擊　空白鍵 衝刺　Esc 暫停" : "←／→（A／D）換位置　彎道 判定框裡點擊　空白鍵 衝刺　Esc 暫停"), GW / 2, GH - 8, "rgba(255,255,255,.85)", 11);
      // QTE
      const Q = G.qte;
      if (Q && !(Q.done && G.t - Q.pop > 0.6) && !(Q.fail && P.s > T.curves[Q.id].s1 + 160)) {
        const bw = 360, bh = 22, x0 = GW / 2 - bw / 2, y0 = 96;
        g.fillStyle = "rgba(29,29,31,.6)"; g.fillRect(x0 - 14, y0 - 34, bw + 28, 84);
        txt(Q.done ? "過彎！" : Q.fail ? "太慢了" : "彎道！游標在框裡時點擊畫面", GW / 2, y0 - 18, Q.done ? "#8affc8" : Q.fail ? "#ffb0a0" : "#ffe48a", 13);
        g.fillStyle = "rgba(255,255,255,.25)"; g.fillRect(x0, y0, bw, bh);
        if (!Q.done && !Q.fail) {
          g.fillStyle = "rgba(242,194,0,.85)"; g.fillRect(x0 + (Q.c - Q.w / 2) * bw, y0, Q.w * bw, bh);
          g.fillStyle = "#fff6c0"; g.fillRect(x0 + (Q.c - Q.pw / 2) * bw, y0, Q.pw * bw, bh);
          const cx = x0 + cursor(Q) * bw;
          g.fillStyle = P.stumble > 0 ? "#e53935" : "#fff"; g.fillRect(cx - 2, y0 - 5, 4, bh + 10);
        }
        g.strokeStyle = "#fff"; g.lineWidth = 2; g.strokeRect(x0, y0, bw, bh);
        // 每一拍的結果
        for (let i = 0; i < Q.n; i++) {
          const x = GW / 2 + (i - (Q.n - 1) / 2) * 26, y = y0 + bh + 14, r = Q.res[i], pop = i === Q.res.length - 1 ? Math.max(0, 1 - (G.t - Q.pop) / 0.15) * 3 : 0;
          g.fillStyle = r === undefined ? "rgba(255,255,255,.3)" : r === 1 ? "#ffe48a" : r > 0 ? "#3d9a5b" : "#e53935";
          g.beginPath(); g.arc(x, y, 7 + pop, 0, Math.PI * 2); g.fill();
        }
      }
      // 訊息
      if (G.msg && G.t - G.msg.t < 1.1) { g.globalAlpha = Math.min(1, (1.1 - (G.t - G.msg.t)) / 0.3); txt(G.msg.text, GW / 2, GH * 0.55, G.msg.col, 20); g.globalAlpha = 1; }
      // 倒數
      if (G.t < 0) txt(String(Math.ceil(-G.t)), GW / 2, GH * 0.4, "#fff", 72);
      else if (G.t < 0.7) txt(WD.go || "起跑！", GW / 2, GH * 0.4, "#ffe48a", 56);
      if (G.pause) { g.fillStyle = "rgba(0,0,0,.5)"; g.fillRect(0, 0, GW, GH); txt("暫停（Esc 繼續）", GW / 2, GH / 2, "#fff", 28); }
      if (G.over) {
        g.fillStyle = "rgba(0,0,0,.45)"; g.fillRect(0, 0, GW, GH);
        txt(G.over.win ? WD.win || "贏了！" : WD.lose || (SOLO ? "太慢了……" : `${RV.name}先到了……`), GW / 2, GH * 0.42, G.over.win ? "#ffe48a" : "#ffb0a0", 44);
        txt(`${G.over.time.toFixed(1)} 秒${SOLO ? `（目標 ${env.goal} 秒）` : ""}`, GW / 2, GH * 0.42 + 46, "#fff", 18);
      }
    }
    let last = performance.now();
    function frame(now) {
      G.raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!G.over && !G.pause) step(dt);
      render(now);
    }
    if (env.say?.start) setTimeout(() => bubble("start"), 300);
    G.raf = requestAnimationFrame(frame);
    R._race = G;                                                  // 測試用
    return G;
  }
  R.Race = { play, track: DEFAULT_T, build };
})();
