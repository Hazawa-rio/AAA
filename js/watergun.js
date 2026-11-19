/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/watergun.js": "20261120001638" });
// 水槍大戰（俯視的搶旗遊戲；多利島主題公園的水池區、懸掛電話的連線房間）
//   R.WaterGun.play(env)：env = { ch（角色）, host, busy(v), sfx(src), onDone(result), net }  result = { win, draw, score: [我方, 對方], quit, again }
// 規則：
//   兩隊各 3 人。單機版：你＋2 個電腦隊友 vs 3 個電腦對手；連線版：玩家輪流分到藍隊、紅隊，不夠的位置由電腦補上
//   旗子在場地正中間（淺水池裡）；搶到旗子帶回自己的基地＝得 1 分；先拿到 3 分、或 3 分鐘結束時分數高的贏
//   不能用原本的技能：Q＝水槍、E＝水球；左鍵發射（照滑鼠的方向，不會自動鎖定）；WASD／方向鍵移動
//     水槍：按住連射，射程短、每發一點點濕；水箱 40 發，回自己的基地補水
//     水球：丟到滑鼠的位置（最遠 340），飛過掩體，落地炸開一圈；一次帶 3 顆，回基地補
//   濕度滿了＝濕透：旗子掉在原地、3 秒後在基地重新出發。掉在地上的旗子 6 秒沒人撿會回到中間
// 連線（env.net = { role: "host"／"guest", myId, players: [{ id, name, letter, color }] }，透過 R.Net 收發）：
//   房主：跑整個遊戲（電腦、判定、計分），收其他人的輸入（"wgIn"），每 50ms 把畫面狀態（"wgS"）發給大家
//   其他人：只送自己的輸入、照房主發來的狀態畫畫面
//   有人掉線＝他的角色暫時消失；房主掉線＝遊戲暫停（畫面蓋上「房主斷線」）
(function () {
  const R = (window.RPG = window.RPG || {});
  const GW = 960, GH = 600;
  const BASE = { blue: { x: 20, y: 200, w: 120, h: 200 }, red: { x: 820, y: 200, w: 120, h: 200 } };
  const POOL = { x: 380, y: 200, w: 200, h: 200 };                    // 中間的淺水池（走起來比較慢）
  const COVER = [
    { x: 250, y: 110, w: 46, h: 96 }, { x: 250, y: 394, w: 46, h: 96 }, { x: 664, y: 110, w: 46, h: 96 }, { x: 664, y: 394, w: 46, h: 96 },
    { x: 455, y: 60, w: 50, h: 50 }, { x: 455, y: 490, w: 50, h: 50 },
  ];
  const CENTER = { x: 480, y: 300 };
  const GUN = { rate: 0.11, speed: 520, range: 330, wet: 6, ammo: 40 };
  const BALLOON = { cd: 1.3, range: 340, fly: 0.6, r: 72, wet: 34, max: 3 };
  const SPEED = 170, R_U = 15, WIN = 3, TIME = 180;
  const inRect = (r, x, y, pad = 0) => x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;
  const dist = (a, b, c, d) => Math.hypot(a - c, b - d);
  const COL = { blue: "#2a8ad8", red: "#e84a4a" };
  const TEAM_NAME = { blue: "藍隊", red: "紅隊" };

  function play(env) {
    const CH = env.ch || { name: "你", color: "#c0392b" };
    const NET = env.net || null, NetApi = R.Net, GUEST = NET?.role === "guest", HOST = NET?.role === "host";
    env.busy?.(true);
    const sfx = (s) => env.sfx?.(s);
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:fixed;inset:0;z-index:300;background:rgba(10,30,45,.88);display:flex;align-items:center;justify-content:center";
    wrap.innerHTML = `<canvas width="${GW}" height="${GH}" style="width:min(${GW}px,96vw,${Math.round(94 * GW / GH)}vh);height:auto;border:4px solid #5ac8f0;border-radius:6px;background:#f2f0ea;cursor:crosshair"></canvas>
      <div style="position:absolute;bottom:16px;left:50%;transform:translateX(-50%);display:flex;gap:8px" class="wg-btns"></div>`;
    (env.host || document.body).appendChild(wrap);
    const cv = wrap.querySelector("canvas"), g = cv.getContext("2d"), btns = wrap.querySelector(".wg-btns");
    const setBtns = (html) => { btns.innerHTML = html; };
    setBtns(`<button type="button" class="ghost" data-wg="quit" style="background:#fff">離開水槍大戰</button>`);

    // ===== 單位 =====
    const unit = (team, i, p) => {
      const b = BASE[team], sp = { x: b.x + b.w / 2, y: b.y + 30 + i * 70 };
      const cpu = !p;
      return { id: `${team}${i}`, pid: p?.id || null, team, me: !!p && (!NET || p.id === NET.myId), remote: !!p && !!NET && p.id !== NET.myId,
        name: p?.name || (team === "blue" ? `電腦${i + 1}` : `電腦${i + 4}`), letter: p?.letter || "電", color: p?.color || null, cpu,
        x: sp.x, y: sp.y, sx: sp.x, sy: sp.y, wet: 0, out: 0, ammo: GUN.ammo, balloons: BALLOON.max, weapon: "gun", gunCd: 0, ballCd: 0, lastHit: 99, face: team === "blue" ? 0 : Math.PI,
        role: i === 0 ? "attack" : i === 1 ? "hunt" : "guard", aiT: 0, aim: { x: 0, y: 0 } };
    };
    function makeUnits() {
      if (!NET) return [unit("blue", 0, { id: "me", name: CH.name, letter: CH.letter || CH.name?.[0] || "你", color: CH.color }), unit("blue", 1), unit("blue", 2), unit("red", 0), unit("red", 1), unit("red", 2)];
      const teams = { blue: [], red: [] };
      NET.players.forEach((p, i) => teams[i % 2 ? "red" : "blue"].push(p));
      const out = [];
      for (const t of ["blue", "red"]) for (let i = 0; i < 3; i++) out.push(unit(t, i, teams[t][i]));
      return out;
    }
    const G = {
      t: -3, left: TIME, score: { blue: 0, red: 0 }, over: null, pause: false, hostLost: false,
      units: GUEST ? [] : makeUnits(),
      flag: { x: CENTER.x, y: CENTER.y, holder: null, dropT: 0 }, shots: [], balls: [], fx: [], msg: null,
    };
    const meUnit = () => G.units.find((u) => (NET ? u.pid === NET.myId : u.me));
    const myTeam = () => meUnit()?.team || (NET ? (NET.players.findIndex((p) => p.id === NET.myId) % 2 ? "red" : "blue") : "blue");
    // 訊息存成「發生了什麼事」，各自照自己的隊伍換成文字
    const flash = (kind, team) => { G.msg = { kind, team, t: G.t }; };
    function msgText(m) {
      const mine = m.team === myTeam(), who = mine ? "我方" : "對方";
      return {
        score: [`${who}得分了！（${G.score[myTeam()]}：${G.score[myTeam() === "blue" ? "red" : "blue"]}）`, mine ? "#8affc8" : "#ffb0a0"],
        grab: [`${who}搶到旗子了！${mine ? "掩護他回基地！" : "攔住他！"}`, mine ? "#8affc8" : "#ffb0a0"],
        drop: [`${who}的旗子掉了！`, "#ffe48a"], back: ["旗子回到中間了", "#fff"],
      }[m.kind] || ["", "#fff"];
    }

    // ===== 輸入（自己） =====
    const keys = {}, mouse = { x: CENTER.x, y: CENTER.y, down: false, click: false };
    let myWeapon = "gun";
    const kd = (e) => {
      if (e.target?.tagName === "INPUT") return;              // 在聊天欄打字
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
      keys[k] = true;
      if (k === "escape" && !G.over && !NET) G.pause = !G.pause;             // 連線時不能暫停
      if (k === "q") myWeapon = "gun";
      if (k === "e") myWeapon = "balloon";
      e.stopPropagation();
    };
    const ku = (e) => { keys[e.key.toLowerCase()] = false; if (e.target?.tagName !== "INPUT") e.stopPropagation(); };
    const toArena = (e) => { const r = cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * GW, y: ((e.clientY - r.top) / r.height) * GH }; };
    const mm = (e) => Object.assign(mouse, toArena(e));
    const md = (e) => { if (e.button !== 0) return; e.preventDefault(); Object.assign(mouse, toArena(e)); mouse.down = true; mouse.click = true; };
    const mu = () => { mouse.down = false; };
    window.addEventListener("keydown", kd, true); window.addEventListener("keyup", ku, true);
    cv.addEventListener("mousemove", mm); cv.addEventListener("mousedown", md); window.addEventListener("mouseup", mu);
    cv.addEventListener("contextmenu", (e) => e.preventDefault());
    function playerInput() {
      let mx = 0, my = 0;
      if (keys.a || keys.arrowleft) mx -= 1; if (keys.d || keys.arrowright) mx += 1;
      if (keys.w || keys.arrowup) my -= 1; if (keys.s || keys.arrowdown) my += 1;
      const inp = { mx, my, aim: { x: Math.round(mouse.x), y: Math.round(mouse.y) }, fire: myWeapon === "gun" ? mouse.down : mouse.click, weapon: myWeapon };
      return inp;
    }

    // ===== 連線：收發 =====
    const offs = [];
    const remote = {};                                         // 房主：其他玩家最新的輸入
    if (NET) {
      if (HOST) {
        offs.push(NetApi.on("wgIn", (m, from) => { remote[from] = { ...m.inp, fire: !!(m.inp.fire || m.inp.click) }; }));
        offs.push(NetApi.on("wgQuit", (m, from) => dropPlayer(from)));
        offs.push(NetApi.on("left", (m, from) => dropPlayer(from)));
      } else {
        offs.push(NetApi.on("wgS", (m) => applySnap(m.s)));
        offs.push(NetApi.on("wgEnd", () => { if (!G.ended) finish({ quit: true, hostEnded: true }); }));
        offs.push(NetApi.on("hostLost", () => { G.hostLost = true; setBtns(`<button type="button" class="ghost" data-wg="quit" style="background:#fff">離開</button>`); }));
      }
    }
    // 掉線（或離開遊戲）的玩家：角色暫時消失
    function dropPlayer(id) {
      const u = G.units.find((x) => x.pid === id); if (!u) return;
      if (G.flag.holder === u) { G.flag.holder = null; G.flag.x = u.x; G.flag.y = u.y; G.flag.dropT = 6; flash("drop", u.team); }
      G.units = G.units.filter((x) => x !== u);
    }
    function snap() {
      const r1 = (n) => Math.round(n);
      return {
        t: +G.t.toFixed(2), left: +G.left.toFixed(1), score: G.score, over: G.over, msg: G.msg,
        flag: { x: r1(G.flag.x), y: r1(G.flag.y), holder: G.flag.holder?.id || null, dropT: +G.flag.dropT.toFixed(1) },
        units: G.units.map((u) => ({ id: u.id, pid: u.pid, team: u.team, name: u.name, letter: u.letter, color: u.color, cpu: u.cpu, x: r1(u.x), y: r1(u.y), wet: r1(u.wet), out: +u.out.toFixed(1), ammo: r1(u.ammo), balloons: u.balloons, weapon: u.weapon })),
        shots: G.shots.map((s) => [r1(s.x), r1(s.y)]),
        balls: G.balls.map((b) => ({ x0: r1(b.x0), y0: r1(b.y0), x1: r1(b.x1), y1: r1(b.y1), t: +b.t.toFixed(2), team: b.team })),
        fx: G.fx.map((f) => ({ k: f.k, x: r1(f.x), y: r1(f.y), t: f.t })),
      };
    }
    let lastScore = 0;
    function applySnap(s) {
      Object.assign(G, { t: s.t, left: s.left, score: s.score, msg: s.msg, units: s.units, shots: s.shots.map(([x, y]) => ({ x, y })), balls: s.balls, fx: s.fx });
      G.flag = { ...s.flag, holder: s.units.find((u) => u.id === s.flag.holder) || null };
      const tot = s.score.blue + s.score.red; if (tot > lastScore) { sfx(s.msg?.team === myTeam() ? "sounds/passion-bell.mp3" : "sounds/turn-start.mp3"); lastScore = tot; }
      if (s.over && !G.over) { G.over = s.over; setBtns(`<button type="button" class="primary" data-wg="ok">好</button>`); }
    }
    let sendT = 0, sentClick = false;
    function guestSend(dt) {
      sendT -= dt;
      const inp = playerInput();
      if (mouse.click) sentClick = true;
      if (sendT > 0 && !mouse.click) return;
      sendT = 0.033;
      NetApi.send({ t: "wgIn", inp: { ...inp, click: sentClick } });
      sentClick = false; mouse.click = false;
    }

    btns.addEventListener("click", (e) => {
      const a = e.target.closest("[data-wg]")?.dataset.wg;
      if (a === "quit") finish({ quit: true });
      if (a === "again") finish({ again: true });
      if (a === "ok") finish({ win: G.over && !G.over.draw && G.over.winner === myTeam(), draw: G.over?.draw, score: [G.score[myTeam()], G.score[myTeam() === "blue" ? "red" : "blue"]] });
    });
    function finish(result) {
      if (G.ended) return; G.ended = true;
      cancelAnimationFrame(G.raf); wrap.remove();
      window.removeEventListener("keydown", kd, true); window.removeEventListener("keyup", ku, true); window.removeEventListener("mouseup", mu);
      for (const f of offs) f();
      if (NET && GUEST && result.quit && !result.hostEnded) NetApi.send({ t: "wgQuit" });
      if (NET && HOST && !result.again) NetApi.send({ t: "wgEnd" });
      env.busy?.(false); env.onDone?.(result);
    }

    // ===== 電腦 =====
    const enemiesOf = (u) => G.units.filter((v) => v.team !== u.team && !v.out);
    const clearLine = (a, b) => { const d = dist(a.x, a.y, b.x, b.y); for (let k = 10; k < d; k += 14) { const x = a.x + ((b.x - a.x) * k) / d, y = a.y + ((b.y - a.y) * k) / d; if (COVER.some((c) => inRect(c, x, y))) return false; } return true; };
    function ai(u, dt) {
      const F = G.flag, foes = enemiesOf(u), b = BASE[u.team];
      let goal;
      if (F.holder === u) goal = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
      else if (F.holder && F.holder.team !== u.team) goal = F.holder;
      else if (F.holder && F.holder.team === u.team) { const near = foes.sort((p, q) => dist(p.x, p.y, F.holder.x, F.holder.y) - dist(q.x, q.y, F.holder.x, F.holder.y))[0]; goal = near || F.holder; }
      else if (u.role === "guard" && dist(F.x, F.y, b.x + b.w / 2, b.y + b.h / 2) > 300) goal = { x: (u.team === "blue" ? 240 : 720), y: 300 + Math.sin(G.t + u.x) * 120 };
      else goal = F;
      if (u.ammo <= 0 || (u.balloons === 0 && u.ammo < 8 && !F.holder)) goal = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
      let dx = goal.x - u.x, dy = goal.y - u.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      const ahead = { x: u.x + dx * 40, y: u.y + dy * 40 };
      if (COVER.some((c) => inRect(c, ahead.x, ahead.y, R_U))) { const s = (u.id.charCodeAt(u.id.length - 1) % 2 ? 1 : -1); [dx, dy] = [dx * 0.3 - dy * s, dy * 0.3 + dx * s]; }
      const inp = { mx: d > 8 ? dx : 0, my: d > 8 ? dy : 0, aim: u.aim, fire: false, weapon: "gun" };
      const tgt = foes.filter((f) => dist(f.x, f.y, u.x, u.y) < 360).sort((p, q) => dist(p.x, p.y, u.x, u.y) - dist(q.x, q.y, u.x, u.y))[0];
      if (tgt) {
        u.aiT -= dt; if (u.aiT <= 0) { u.aiT = 0.25; u.aim = { x: tgt.x + (Math.random() - 0.5) * 90, y: tgt.y + (Math.random() - 0.5) * 90 }; }
        inp.aim = u.aim;
        const dd = dist(tgt.x, tgt.y, u.x, u.y);
        if (u.balloons > 0 && u.ballCd <= 0 && dd > 140 && dd < BALLOON.range && (!clearLine(u, tgt) || Math.random() < 0.01)) { inp.weapon = "balloon"; inp.fire = true; }
        else if (dd < GUN.range && clearLine(u, tgt)) inp.fire = true;
      }
      return inp;
    }

    // ===== 每一格（單機版、房主） =====
    function move(u, mx, my, dt) {
      const l = Math.hypot(mx, my); if (!l) return;
      const sp = SPEED * (inRect(POOL, u.x, u.y) ? 0.6 : 1) * (G.flag.holder === u ? 0.72 : 1);
      const nx = u.x + (mx / l) * sp * dt, ny = u.y + (my / l) * sp * dt;
      const ok = (x, y) => x > R_U && x < GW - R_U && y > R_U + 40 && y < GH - R_U && !COVER.some((c) => inRect(c, x, y, R_U));
      if (ok(nx, ny)) { u.x = nx; u.y = ny; } else if (ok(nx, u.y)) u.x = nx; else if (ok(u.x, ny)) u.y = ny;
      u.face = Math.atan2(my, mx);
    }
    function soak(u) {
      u.out = 3; u.wet = 100;
      if (G.flag.holder === u) { G.flag.holder = null; G.flag.x = u.x; G.flag.y = u.y; G.flag.dropT = 6; flash("drop", u.team); }
      G.fx.push({ k: "soak", x: u.x, y: u.y, t: G.t });
      if (u.me) sfx("sounds/slime-move.mp3");
    }
    function wetten(u, n) { if (u.out) return; u.wet = Math.min(100, u.wet + n); u.lastHit = 0; if (u.wet >= 100) soak(u); }
    function fire(u, inp) {
      const w = inp.weapon || u.weapon;
      if (w === "gun") {
        if (u.gunCd > 0 || u.ammo <= 0) return;
        u.gunCd = GUN.rate; u.ammo--;
        const a = Math.atan2(inp.aim.y - u.y, inp.aim.x - u.x) + (Math.random() - 0.5) * 0.08;
        G.shots.push({ x: u.x + Math.cos(a) * 18, y: u.y + Math.sin(a) * 18, vx: Math.cos(a) * GUN.speed, vy: Math.sin(a) * GUN.speed, left: GUN.range, team: u.team });
        if (u.me && Math.random() < 0.3) sfx("sounds/slime-move.mp3");
      } else {
        if (u.ballCd > 0 || u.balloons <= 0) return;
        u.ballCd = BALLOON.cd; u.balloons--;
        let tx = inp.aim.x, ty = inp.aim.y; const d = dist(tx, ty, u.x, u.y);
        if (d > BALLOON.range) { tx = u.x + ((tx - u.x) / d) * BALLOON.range; ty = u.y + ((ty - u.y) / d) * BALLOON.range; }
        G.balls.push({ x0: u.x, y0: u.y, x1: tx, y1: ty, t: 0, team: u.team });
        sfx("sounds/vivilla-throw.mp3");
      }
    }
    function inputOf(u, dt) {
      if (u.me) { const inp = playerInput(); mouse.click = false; return inp; }
      if (u.remote) {
        const r = remote[u.pid]; if (!r) return { mx: 0, my: 0, aim: { x: u.x, y: u.y }, fire: false, weapon: u.weapon };
        const inp = { ...r };
        if (r.weapon === "balloon") r.fire = false;                       // 水球：一次點擊只丟一顆
        return inp;
      }
      return ai(u, dt);
    }
    function step(dt) {
      G.t += dt;
      if (G.t < 0) return;
      G.left -= dt;
      for (const u of G.units) {
        u.gunCd = Math.max(0, u.gunCd - dt); u.ballCd = Math.max(0, u.ballCd - dt); u.lastHit += dt;
        if (u.out) { u.out = Math.max(0, u.out - dt); if (!u.out) { u.x = u.sx; u.y = u.sy; u.wet = 0; } continue; }
        if (u.lastHit > 2) u.wet = Math.max(0, u.wet - 6 * dt);
        if (inRect(BASE[u.team], u.x, u.y)) { u.ammo = Math.min(GUN.ammo, u.ammo + 30 * dt); if (u.ballCd <= 0 && u.balloons < BALLOON.max) { u.balloons++; u.ballCd = 0.4; } }
        const inp = inputOf(u, dt);
        if (inp.weapon) u.weapon = inp.weapon;
        move(u, inp.mx, inp.my, dt);
        if (inp.fire) fire(u, inp);
      }
      const F = G.flag;
      if (F.holder) {
        F.x = F.holder.x; F.y = F.holder.y - 20;
        if (inRect(BASE[F.holder.team], F.holder.x, F.holder.y)) {
          G.score[F.holder.team]++;
          flash("score", F.holder.team);
          sfx(F.holder.team === myTeam() ? "sounds/passion-bell.mp3" : "sounds/turn-start.mp3");
          F.holder = null; F.x = CENTER.x; F.y = CENTER.y;
        }
      } else {
        if (F.dropT > 0) { F.dropT -= dt; if (F.dropT <= 0) { F.x = CENTER.x; F.y = CENTER.y; flash("back"); } }
        const p = G.units.find((u) => !u.out && dist(u.x, u.y, F.x, F.y) < 22);
        if (p) { F.holder = p; F.dropT = 0; flash("grab", p.team); }
      }
      for (const s of G.shots) {
        const st = Math.hypot(s.vx, s.vy) * dt;
        s.x += s.vx * dt; s.y += s.vy * dt; s.left -= st;
        if (s.left <= 0 || COVER.some((c) => inRect(c, s.x, s.y))) { s.gone = true; continue; }
        const hit = G.units.find((u) => u.team !== s.team && !u.out && dist(u.x, u.y, s.x, s.y) < R_U + 3);
        if (hit) { s.gone = true; wetten(hit, GUN.wet); }
      }
      G.shots = G.shots.filter((s) => !s.gone);
      for (const b of G.balls) {
        b.t += dt / BALLOON.fly;
        if (b.t >= 1) {
          b.gone = true; G.fx.push({ k: "splash", x: b.x1, y: b.y1, t: G.t });
          for (const u of G.units) if (u.team !== b.team && !u.out && dist(u.x, u.y, b.x1, b.y1) < BALLOON.r + R_U) wetten(u, BALLOON.wet);
          sfx("sounds/slime-ram.mp3");
        }
      }
      G.balls = G.balls.filter((b) => !b.gone);
      G.fx = G.fx.filter((f) => G.t - f.t < 0.7);
      if (G.score.blue >= WIN || G.score.red >= WIN || G.left <= 0) {
        const draw = G.score.blue === G.score.red;
        G.over = { draw, winner: draw ? null : G.score.blue > G.score.red ? "blue" : "red" };
        setBtns(HOST ? `<button type="button" class="primary" data-wg="again">大家再玩一場</button><button type="button" class="ghost" data-wg="ok" style="background:#fff">結束</button>`
          : NET ? `<button type="button" class="primary" data-wg="ok">好</button>` : `<button type="button" class="primary" data-wg="ok">好</button><button type="button" class="ghost" data-wg="again" style="background:#fff">再玩一場</button>`);
      }
    }

    // ===== 畫面 =====
    const txt = (t, x, y, col = "#fff", size = 14, align = "center") => { g.font = `900 ${size}px sans-serif`; g.textAlign = align; g.textBaseline = "middle"; g.lineWidth = Math.max(2, size / 5); g.lineJoin = "round"; g.strokeStyle = "rgba(29,29,31,.75)"; g.strokeText(t, x, y); g.fillStyle = col; g.fillText(t, x, y); };
    function render(now) {
      const ME = meUnit(), MT = myTeam(), OT = MT === "blue" ? "red" : "blue";
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = "#f2f0ea"; g.fillRect(0, 0, GW, GH);
      g.strokeStyle = "rgba(90,120,140,.15)"; g.lineWidth = 2; for (let x = 0; x < GW; x += 40) { g.beginPath(); g.moveTo(x, 40); g.lineTo(x, GH); g.stroke(); } for (let y = 40; y < GH; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(GW, y); g.stroke(); }
      for (const [team, b] of Object.entries(BASE)) { g.fillStyle = team === "blue" ? "rgba(42,138,216,.18)" : "rgba(232,74,74,.18)"; g.fillRect(b.x, b.y, b.w, b.h); g.strokeStyle = COL[team]; g.lineWidth = 4; g.setLineDash([12, 8]); g.strokeRect(b.x, b.y, b.w, b.h); g.setLineDash([]); txt(team === MT ? `我方基地（${TEAM_NAME[team]}）` : `對方基地（${TEAM_NAME[team]}）`, b.x + b.w / 2, b.y - 14, COL[team], 12); txt("補水", b.x + b.w / 2, b.y + b.h + 14, COL[team], 11); }
      g.fillStyle = "#5ac8f0"; g.fillRect(POOL.x, POOL.y, POOL.w, POOL.h); g.strokeStyle = "#fff"; g.lineWidth = 6; g.strokeRect(POOL.x, POOL.y, POOL.w, POOL.h);
      g.strokeStyle = "rgba(255,255,255,.4)"; g.lineWidth = 2; for (let y = POOL.y + 30; y < POOL.y + POOL.h; y += 40) { g.beginPath(); for (let x = POOL.x; x <= POOL.x + POOL.w; x += 20) { const yy = y + Math.sin(now / 400 + x / 30) * 3; x === POOL.x ? g.moveTo(x, yy) : g.lineTo(x, yy); } g.stroke(); }
      for (const c of COVER) { g.fillStyle = "#ffd23a"; g.strokeStyle = "#a07800"; g.lineWidth = 3; g.beginPath(); g.roundRect(c.x, c.y, c.w, c.h, 12); g.fill(); g.stroke(); g.strokeStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.moveTo(c.x + 8, c.y + 10); g.lineTo(c.x + 8, c.y + c.h - 10); g.stroke(); }
      const F = G.flag;
      g.strokeStyle = "#1d1d1f"; g.lineWidth = 3; g.beginPath(); g.moveTo(F.x, F.y + 14); g.lineTo(F.x, F.y - 22); g.stroke();
      g.fillStyle = F.holder ? COL[F.holder.team] : "#ffd23a"; g.beginPath(); g.moveTo(F.x, F.y - 22); g.lineTo(F.x + 22, F.y - 14); g.lineTo(F.x, F.y - 6); g.closePath(); g.fill();
      if (!F.holder && F.dropT > 0) txt(`${Math.ceil(F.dropT)}`, F.x, F.y + 24, "#ffe48a", 12);
      for (const u of G.units) {
        const isMe = u === ME;
        if (u.out) g.globalAlpha = 0.35;
        g.fillStyle = "rgba(0,0,0,.15)"; g.beginPath(); g.ellipse(u.x, u.y + 14, 14, 5, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#fff"; g.strokeStyle = u.color && !u.cpu ? u.color : COL[u.team]; g.lineWidth = isMe ? 5 : 3;
        g.beginPath(); g.roundRect(u.x - R_U, u.y - R_U, R_U * 2, R_U * 2, 5); g.fill(); g.stroke();
        txt(u.letter, u.x, u.y + 1, u.color && !u.cpu ? u.color : COL[u.team], 14);
        g.fillStyle = COL[u.team]; g.fillRect(u.x - R_U, u.y + R_U + 3, R_U * 2, 3);
        g.fillStyle = "rgba(29,29,31,.25)"; g.fillRect(u.x - R_U, u.y - R_U - 8, R_U * 2, 4); g.fillStyle = "#2aa8f0"; g.fillRect(u.x - R_U, u.y - R_U - 8, (R_U * 2 * u.wet) / 100, 4);
        if (NET && !u.cpu) txt(isMe ? "你" : u.name, u.x, u.y - R_U - 18, COL[u.team], 11);
        if (u.out) txt(`${Math.ceil(u.out)}`, u.x, u.y - 30, "#bfe8ff", 14);
        g.globalAlpha = 1;
      }
      g.fillStyle = "#2aa8f0"; for (const s of G.shots) { g.beginPath(); g.arc(s.x, s.y, 3.5, 0, Math.PI * 2); g.fill(); }
      for (const b of G.balls) {
        const x = b.x0 + (b.x1 - b.x0) * b.t, y = b.y0 + (b.y1 - b.y0) * b.t - Math.sin(b.t * Math.PI) * 70;
        g.fillStyle = "rgba(0,0,0,.15)"; g.beginPath(); g.ellipse(b.x0 + (b.x1 - b.x0) * b.t, b.y0 + (b.y1 - b.y0) * b.t, 8, 3, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = b.team === "blue" ? "#5ac8f0" : "#ff7ac8"; g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.fill(); g.stroke();
        g.strokeStyle = "rgba(29,29,31,.3)"; g.setLineDash([4, 4]); g.beginPath(); g.arc(b.x1, b.y1, BALLOON.r, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      }
      for (const f of G.fx) { const k = Math.max(0, (G.t - f.t) / 0.7); g.globalAlpha = Math.max(0, 1 - k); g.strokeStyle = "#5ac8f0"; g.lineWidth = 4; g.beginPath(); g.arc(f.x, f.y, (f.k === "splash" ? BALLOON.r : 30) * (0.4 + k * 0.6), 0, Math.PI * 2); g.stroke(); for (let i = 0; i < 8; i++) { const a = i * 0.785; g.fillStyle = "#bfe8ff"; g.beginPath(); g.arc(f.x + Math.cos(a) * 40 * k, f.y + Math.sin(a) * 40 * k, 4, 0, Math.PI * 2); g.fill(); } g.globalAlpha = 1; }
      // 瞄準線（不會自動鎖定，照滑鼠的方向）
      if (ME && !ME.out && G.t >= 0 && !G.over) {
        if (myWeapon === "gun") { const a = Math.atan2(mouse.y - ME.y, mouse.x - ME.x); g.strokeStyle = "rgba(42,168,240,.45)"; g.lineWidth = 2; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(ME.x, ME.y); g.lineTo(ME.x + Math.cos(a) * GUN.range, ME.y + Math.sin(a) * GUN.range); g.stroke(); g.setLineDash([]); }
        else { let tx = mouse.x, ty = mouse.y; const d = dist(tx, ty, ME.x, ME.y); if (d > BALLOON.range) { tx = ME.x + ((tx - ME.x) / d) * BALLOON.range; ty = ME.y + ((ty - ME.y) / d) * BALLOON.range; } g.strokeStyle = "rgba(255,122,200,.7)"; g.lineWidth = 2; g.setLineDash([6, 6]); g.beginPath(); g.arc(tx, ty, BALLOON.r, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }
      }
      // HUD
      g.fillStyle = "rgba(29,29,31,.8)"; g.fillRect(0, 0, GW, 40);
      txt(`我方 ${G.score[MT]}`, GW / 2 - 90, 20, COL[MT], 20); txt(`${G.score[OT]} 對方`, GW / 2 + 90, 20, COL[OT], 20);
      txt(`${Math.max(0, Math.ceil(G.left / 60 - 1))}:${String(Math.max(0, Math.ceil(G.left) % 60)).padStart(2, "0")}`, GW / 2, 20, "#fff", 16);
      txt(NET ? `連線中・你在${TEAM_NAME[MT]}・先拿到 ${WIN} 分的贏` : `先拿到 ${WIN} 分的贏`, 16, 20, "#ffe48a", 12, "left");
      txt(`Q 水槍${myWeapon === "gun" ? "◀" : ""}　E 水球${myWeapon === "balloon" ? "◀" : ""}`, GW - 16, 20, "#fff", 13, "right");
      if (ME) {
        g.fillStyle = "rgba(29,29,31,.6)"; g.fillRect(12, GH - 56, 300, 46);
        txt(`水箱 ${Math.floor(ME.ammo)} / ${GUN.ammo}`, 24, GH - 42, "#bfe8ff", 13, "left");
        txt(`水球 ${"●".repeat(ME.balloons)}${"○".repeat(Math.max(0, BALLOON.max - ME.balloons))}`, 170, GH - 42, "#ffb0e0", 13, "left");
        g.fillStyle = "rgba(255,255,255,.25)"; g.fillRect(24, GH - 26, 270, 8); g.fillStyle = "#2aa8f0"; g.fillRect(24, GH - 26, (270 * ME.wet) / 100, 8);
        txt("濕度", 300, GH - 22, "#fff", 11, "left");
        if (ME.out) txt("你濕透了！等一下在基地重新出發", GW / 2, GH * 0.6, "#bfe8ff", 18);
      }
      g.fillStyle = "rgba(29,29,31,.6)"; g.fillRect(GW / 2 - 110, GH - 28, 560, 22); txt(`WASD／方向鍵 移動　滑鼠 瞄準　左鍵 發射（水槍按住連射）　回基地補水${NET ? "" : "　Esc 暫停"}`, GW / 2 + 170, GH - 17, "#fff", 11);
      if (G.msg && G.t - G.msg.t < 1.6) { const [m, c] = msgText(G.msg); g.globalAlpha = Math.min(1, (1.6 - (G.t - G.msg.t)) / 0.4); txt(m, GW / 2, 78, c, 20); g.globalAlpha = 1; }
      if (GUEST && !G.units.length) txt("等待房主……", GW / 2, GH * 0.45, "#2a8ad8", 28);
      else if (G.t < 0) { txt(String(Math.ceil(-G.t)), GW / 2, GH * 0.45, COL[MT], 72); txt(`搶中間的旗子，帶回${MT === "blue" ? "左" : "右"}邊的我方基地！`, GW / 2, GH * 0.45 + 60, "#1d1d1f", 18); }
      if (G.pause) { g.fillStyle = "rgba(0,0,0,.5)"; g.fillRect(0, 0, GW, GH); txt("暫停（Esc 繼續）", GW / 2, GH / 2, "#fff", 28); }
      if (G.hostLost) { g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(0, 0, GW, GH); txt("房主斷線了，遊戲暫停", GW / 2, GH / 2 - 10, "#fff", 28); txt("等房主回來，或先離開", GW / 2, GH / 2 + 30, "#bfe8ff", 16); }
      if (G.over) {
        g.fillStyle = "rgba(0,0,0,.45)"; g.fillRect(0, 0, GW, GH);
        const won = G.over.winner === MT;
        txt(G.over.draw ? "平手！" : won ? "我們贏了！" : "輸了……", GW / 2, GH * 0.42, won ? "#ffe48a" : "#bfe8ff", 46);
        txt(`${G.score[MT]}：${G.score[OT]}`, GW / 2, GH * 0.42 + 50, "#fff", 22);
        if (GUEST) txt("房主可以開下一場", GW / 2, GH * 0.42 + 84, "#bfe8ff", 14);
      }
    }
    let last = performance.now(), snapT = 0;
    function frame(now) {
      G.raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (GUEST) { if (!G.over && !G.hostLost) guestSend(dt); }
      else if (!G.over && !G.pause) step(dt);
      if (HOST) { snapT -= dt; if (snapT <= 0 || G.over) { snapT = 0.05; NetApi.send({ t: "wgS", s: snap() }); } }
      render(now);
    }
    G.raf = requestAnimationFrame(frame);
    G.close = () => finish({ quit: true, hostEnded: true, silent: true });
    R._wg = G;                         // 測試用
    return G;
  }
  R.WaterGun = { play };
})();
