// 戰鬥畫面與操作
(function () {
  const R = window.RPG, C = R.CONFIG;
  const $ = (s) => document.querySelector(s);
  const canvas = $("#arena"), ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const dist = R.dist;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };

  const charId = new URLSearchParams(location.search).get("char") || store.get("rpg.char") || Object.keys(R.CHARACTERS)[0];
  const CH = R.CHARACTERS[charId] || Object.values(R.CHARACTERS)[0];
  const roomParam = new URLSearchParams(location.search).get("room") || store.get("rpg.room");
  const ROOM = C.rooms[roomParam] ? roomParam : Object.keys(C.rooms)[0];
  const ROOMDEF = C.rooms[ROOM];

  let B = null;            // 目前的戰鬥
  let mode = "move";       // move 或技能 id
  const mouse = { x: -999, y: -999, in: false };
  const disp = new Map();  // 畫面位置（平滑移動）
  const fx = [];
  const zoneSeen = new Map();   // 煙霧第一次出現的時間（做浮現動畫）

  // ---------- 音效 ----------
  let muted = store.get("rpg.muted") === "1";
  const audioCache = new Map();
  function audio(src) {
    let a = audioCache.get(src);
    if (!a) { a = new Audio(src); a.preload = "auto"; audioCache.set(src, a); }
    return a;
  }
  function playSound(src) {
    if (muted || !src) return;
    const a = audio(src).cloneNode();    // 複製一份，連續觸發時才能重疊播放
    a.volume = C.volume;
    a.play().catch(() => {});            // 瀏覽器在使用者還沒點過頁面前會擋聲音
  }
  for (const e of Object.values(C.enemies)) for (const s of Object.values(e.sounds || {})) audio(s);
  for (const s of Object.values(CH.skills)) if (s.sound) audio(s.sound);
  if (C.turnSound) audio(C.turnSound);
  function renderMute() {
    $("#muteBtn").textContent = muted ? "🔇 音效關" : "🔊 音效開";
    $("#muteBtn").setAttribute("aria-pressed", String(!muted));
  }
  $("#muteBtn").addEventListener("click", () => {
    muted = !muted; store.set("rpg.muted", muted ? "1" : "0"); renderMute();
    if (muted) bgm?.pause(); else startBgm();
  });
  renderMute();

  // ---------- 背景音樂（Boss 房） ----------
  // 瀏覽器規定要使用者點過頁面才能播放，所以播放失敗時等第一次點擊或按鍵再試
  let bgm = null;
  function startBgm() {
    if (!ROOMDEF.bgm || muted) return;
    if (!bgm) { bgm = new Audio(ROOMDEF.bgm); bgm.loop = true; }
    bgm.volume = C.bgmVolume;
    if (bgm.paused) bgm.play().catch(() => {});
  }
  const kickBgm = () => startBgm();
  window.addEventListener("pointerdown", kickBgm);
  window.addEventListener("keydown", kickBgm);
  startBgm();

  // ---------- 開始 / 重新開始 ----------
  function newBattle() {
    if (B) B.destroy();
    disp.clear(); fx.length = 0; zoneSeen.clear(); mode = "move";
    B = new R.Battle(C, CH.id, ROOM);
    B.on(onEvent);
    B.start();
    renderUI();
  }

  function onEvent(ev) {
    const t = performance.now();
    switch (ev.type) {
      case "damage":
        fx.push({ k: "num", x: ev.unit.x, y: ev.unit.y - 30, text: `-${ev.amount}`, color: ev.boosted ? "#c2477a" : "#e53935", t });
        break;
      case "miss": fx.push({ k: "num", x: ev.x, y: ev.y - 34, text: "MISS", color: "#1aa3e8", t }); break;
      case "turn": if (ev.unit === B.player) playSound(C.turnSound); break;
      case "kick": fx.push({ k: "ring", x: ev.target.x, y: ev.target.y, r: 30, color: "#1d1d1f", t, dur: 350 }); break;
      case "sfx": playSound(ev.sound); break;
      case "move": if (ev.unit.team === "enemy") playSound(ev.unit.def.sounds?.move); break;
      case "leap": fx.push({ k: "leap", unit: ev.unit, from: ev.from, to: ev.to, t, dur: ev.duration * 1000 }); break;
      case "arrow": fx.push({ k: "arrow", from: ev.from, to: ev.to, boosted: ev.boosted, t, dur: 650 }); break;
      case "spikes":
        for (const z of ev.consumed) fx.push({ k: "smokeOut", zone: z, t, dur: 400 });
        ev.spikes.forEach((s, i) => fx.push({ k: "spike", from: s.from, to: s.to, t: t + i * 60, dur: 520 }));
        break;
      case "chargeCancel": for (const c of ev.charges) fx.push({ k: "chargeOut", c, t, dur: 450 }); break;
      case "zoneExpire": for (const z of ev.zones) fx.push({ k: "smokeOut", zone: z, t, dur: 700 }); break;
      case "strike":
        playSound(ev.sound);
        if (ev.kind === "tentacle" && ev.arm) {
          // 從靠近原本方向的那一側開始掃
          const a1 = ev.ang - ev.half, a2 = ev.ang + ev.half, rest = ev.arm.angle;
          const [from, to] = R.geo.angDiff(rest, a1) <= R.geo.angDiff(rest, a2) ? [a1, a2] : [a2, a1];
          fx.push({ k: "swing", arm: ev.arm, from, to, t, dur: 700 });
        }
        if (ev.kind === "laser") fx.push({ k: "laser", ...ev, t, dur: 500 });
        else if (ev.kind === "electric") fx.push({ k: "electric", ...ev, t, dur: 500 });
        else if (ev.shape === "sector") fx.push({ k: "sector", ...ev, t, dur: 450 });
        else if (ev.shape === "circle") fx.push({ k: "ring", x: ev.x, y: ev.y, r: ev.radius, color: "#e53935", t, dur: 600 });
        else fx.push({ k: "rect", ...ev, t });
        if (ev.lunge) fx.push({ k: "lunge", unit: ev.owner, ang: ev.ang, len: ev.length * 0.55, t, dur: 320 });
        break;
      case "blocked":
        fx.push({ k: "shield", unit: ev.unit, t, dur: 500 });
        fx.push({ k: "num", x: ev.unit.x, y: ev.unit.y - ev.unit.r - 18, text: "立場阻擋", color: "#3d7fe0", t });
        break;
      case "bulletHit": fx.push({ k: "ring", x: ev.x, y: ev.y, r: 14, color: "#e8262c", t, dur: 250 }); break;
      case "pulse": for (const m of ev.units) fx.push({ k: "ring", x: m.x, y: m.y, r: 60, color: "#e8262c", t, dur: 400 }); break;
      case "enemyDodge":
        fx.push({ k: "num", x: ev.unit.x, y: ev.unit.y - ev.unit.r - 24, text: "閃避！", color: "#3d7fe0", t, dur: 900 });
        break;
      case "bossUlt": fx.push({ k: "ring", x: ev.unit.x, y: ev.unit.y, r: 260, color: "#e8262c", t, dur: 700 }); break;
      case "death":
        if (ev.unit.part) fx.push({ k: "ring", x: ev.unit.x, y: ev.unit.y, r: 70, color: "#7a7a7a", t, dur: 700 });
        break;
    }
    // 正在瞄準的技能變得不能用（例如輪到敵人時的大招）就取消瞄準
    if (B.phase === "over") mode = "move";
    else if (mode !== "move" && (!statusOf(mode).ready || !usableNow(mode))) mode = "move";
    renderUI();
  }

  function act(fn) {
    try { fn(); } catch (e) { if (e instanceof R.ActionError) toast(e.message); else throw e; }
  }

  const myTurn = () => B && B.phase === "player";
  const canAct = () => B && B.canAct();                       // 自己回合或敵人回合都能行動
  const mult = () => (B ? B.costMult() : 1);                  // 非自己回合 ×2
  const effCost = (st) => st.cost * mult();
  const usableNow = (id) => !(B.offTurn() && id === CH.ultimate);
  const pos = (u) => disp.get(u.id) || u;
  // 部位（矩陣）優先，才不會被大大的核心擋住
  const unitAt = (p) => B.units.filter((u) => u.alive && dist(pos(u).x, pos(u).y, p.x, p.y) <= u.r + 4)
    .sort((a, b) => a.r - b.r)[0] || null;
  const statusOf = (id) => CH.skills[id].status(B, B.player);
  const smokes = () => B.zones.filter((z) => z.type === "smoke");

  // ---------- 輸入 ----------
  function toWorld(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }
  canvas.addEventListener("mousemove", (e) => { Object.assign(mouse, toWorld(e), { in: true }); inspect(unitAt(mouse)); });
  canvas.addEventListener("mouseleave", () => { mouse.in = false; inspect(null); });
  canvas.addEventListener("contextmenu", (e) => { e.preventDefault(); mode = "move"; renderUI(); });

  canvas.addEventListener("click", (e) => {
    if (!B || B.phase === "over") return;
    const p = toWorld(e);
    const hit = unitAt(p);
    if (!canAct()) return toast("現在不能行動");
    const enemy = hit && hit.team === "enemy" ? hit : null;

    if (mode === "move") {
      if (enemy) act(() => B.useSkill(CH.basic, { target: enemy }));
      else if (hit) toast("那裡有其他單位");
      else act(() => B.move(p.x, p.y));
      return;
    }
    const id = mode, aim = statusOf(id).aim || { type: "none" };
    if (aim.type === "enemy") {
      if (!enemy) return toast("請點選一個敵人");
      act(() => B.useSkill(id, { target: enemy }));
    } else if (aim.type === "point") {
      act(() => B.useSkill(id, clampToRange(p, aim.range)));
    } else if (aim.type === "direction") {
      act(() => B.useSkill(id, { x: p.x, y: p.y }));
    }
    mode = "move";
    renderUI();
  });

  function clampToRange(p, range) {
    const u = B.player;
    const d = dist(u.x, u.y, p.x, p.y);
    return d <= range ? { x: p.x, y: p.y } : { x: u.x + ((p.x - u.x) / d) * range, y: u.y + ((p.y - u.y) / d) * range };
  }

  // 按技能鍵：不用瞄準的直接施放，要瞄準的進入瞄準模式
  function pressSkill(id) {
    if (!id) return;
    if (!canAct()) return toast("現在不能行動");
    if (!usableNow(id)) return toast("大招只能在自己的回合使用");
    const st = statusOf(id);
    if (!st.ready) return toast(st.reason || "現在不能用");
    if (B.player.ap < effCost(st)) return toast(`行動點不足（需要 ${effCost(st)}）`);
    if (!st.aim || st.aim.type === "none") { mode = "move"; act(() => B.useSkill(id)); renderUI(); return; }
    mode = mode === id ? "move" : id;
    renderUI();
  }
  const slotButtons = [...document.querySelectorAll(".skill")];
  slotButtons.forEach((b) => b.addEventListener("click", () => pressSkill(CH.hud[b.dataset.pos])));
  $("#endBtn").addEventListener("click", () => act(() => B.endTurn()));
  $("#againBtn").addEventListener("click", newBattle);
  $("#restartBtn").addEventListener("click", newBattle);
  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    const k = e.key.toLowerCase();
    const sk = Object.entries(CH.skills).find(([, s]) => s.key === k);
    if (sk) pressSkill(sk[0]);
    else if (k === "escape") { mode = "move"; renderUI(); }
    else if (k === " ") {
      e.preventDefault();
      if (myTurn()) act(() => B.endTurn());
    }
  });

  // ---------- DOM 介面 ----------
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.remove("hidden");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add("hidden"), 1600);
  }

  const STAR = '<svg class="star CLS" viewBox="0 0 40 40"><path d="M20 3 L24 16 L37 20 L24 24 L20 37 L16 24 L3 20 L16 16 Z"/></svg>';
  function previewCost() {
    if (!canAct()) return 0;
    if (mode !== "move") return effCost(statusOf(mode));
    if (!mouse.in) return 0;
    const h = unitAt(mouse);
    return h && h.team === "enemy" ? effCost(statusOf(CH.basic)) : C.moveCost * mult();
  }
  function renderStars() {
    const u = B.player, cost = previewCost();
    let html = "";
    for (let i = 0; i < u.maxAp; i++) {
      const on = i < u.ap;
      const spend = on && cost > 0 && cost <= u.ap && i >= u.ap - cost;
      html += STAR.replace("CLS", spend ? "spend" : on ? "on" : "off");
    }
    $("#stars").innerHTML = html;
  }

  function renderUI() {
    if (!B) return;
    const u = B.player;
    $("#result").classList.toggle("hidden", B.phase !== "over");
    $("#resultTitle").textContent = B.result === "win" ? "勝利！" : "被打倒了…";
    $("#roundInfo").textContent = `第 ${B.round} 回合`;

    $("#order").innerHTML = B.order.map((x, i) => {
      const cls = ["chip", x.team, i === B.idx ? "now" : "", x.alive ? "" : "dead", i < B.idx ? "done" : ""].join(" ");
      return `<div class="${cls}" title="1d20 擲出 ${x.initRoll} ＋ 速度 ${x.spd}"><span class="dot"></span>${esc(x.name)}<span class="spd">🎲${x.initRoll}+${x.spd}=${x.initiative}</span></div>`;
    }).join("");

    for (const b of slotButtons) {
      const id = CH.hud[b.dataset.pos], sk = CH.skills[id], st = statusOf(id);
      b.querySelector(".key").textContent = sk.slot;
      b.querySelector(".nm").textContent = st.label;
      b.querySelector(".cost").textContent = `★${effCost(st)}${st.note ? " · " + st.note : ""}`;
      b.disabled = !canAct() || !st.ready || !usableNow(id) || u.ap < effCost(st);
      b.classList.toggle("active", mode === id);
      b.classList.toggle("cooling", !st.ready);
      b.classList.toggle("armed", id === "load" && !!u.state.loaded);
      b.title = `${sk.name}：${sk.desc}`;
    }
    $("#endBtn").disabled = !myTurn();
    setBar(".bar.hp", u.hp, u.maxHp, `HP ${u.hp} / ${u.maxHp}`);
    if (CH.ultimate) {
      const need = CH.skills[CH.ultimate].charge;
      setBar(".bar.charge", u.charge, need, u.charge >= need ? "大招就緒" : `大招充能 ${u.charge} / ${need}`);
    }

    const log = $("#log");
    log.innerHTML = B.log.map((l) => `<li class="${l.startsWith("──") ? "sep" : l.startsWith("順序") ? "muted" : ""}">${esc(l)}</li>`).join("");
    log.scrollTop = log.scrollHeight;

    const banner = $("#banner");
    banner.className = "";
    if (myTurn()) {
      const warn = B.charges.length ? "　⚠ 地上有壓制範圍" : B.projectiles.length ? "　⚠ 光彈還在飛" : "";
      let text = "你的回合：點地面移動、點敵人踢腿";
      if (mode !== "move") {
        const aim = statusOf(mode).aim?.type;
        text = `「${statusOf(mode).label}」：` + (aim === "direction" ? "點擊方向射出" : aim === "enemy" ? "點選敵人" : "點選位置") + "（右鍵 / Esc 取消）";
      } else if (u.ap === 0) text = "行動點用完了，還可以免費射箭，或按結束回合";
      banner.textContent = text + warn;
    } else if (B.offTurn()) {
      // 敵人回合（被攻擊時也一樣），不額外跳出攻擊提示
      banner.textContent = `${B.current?.name ?? "敵人"} 行動中…　你的行動消耗 ×${mult()}（大招除外）`;
    } else banner.classList.add("hidden");

    renderStars();
    if (hovered) inspect(hovered);
  }

  function setBar(sel, v, max, text) {
    $(sel + " i").style.width = `${Math.min(100, (v / max) * 100)}%`;
    $(sel + " span").textContent = text;
  }

  let hovered = null;
  function inspect(u) {
    hovered = u;
    const box = $("#inspect");
    if (!u || !B) { box.innerHTML = '<span class="muted">把滑鼠移到單位上</span>'; return; }
    if (u.part) {
      const core = u.parent, broken = core.parts.filter((p) => !p.alive).length;
      const rows = [["生命", `${u.hp} / ${u.maxHp}`], ["防禦", u.df],
        ["破壞後", `核心受傷 ×${core.def.coreMult[Math.min(3, broken + 1)]}`]];
      box.innerHTML = `<div class="nm">${esc(u.name)}</div><table>${rows.map(([a, b]) => `<tr><td class="muted">${a}</td><td>${b}</td></tr>`).join("")}</table>`;
      return;
    }
    const rows = [["生命", `${u.hp} / ${u.maxHp}`], ["攻擊", u.atk], ["防禦", u.df],
      ["速度", u.def.boss ? `${u.spd}（不會移動）` : `${u.spd}（移動 ${B.moveRadius(u)}）`], ["行動點", `${u.ap} / ${u.maxAp}`]];
    if (u.def.boss) {
      const k = u.def.incomingMult(B, u);
      rows.push(["核心立場", k === 0 ? "無敵（先破壞矩陣）" : `受到傷害 ×${k}`]);
      rows.push(["大招", B.round >= u.state.ultReady ? "就緒" : `第 ${u.state.ultReady} 回合起`]);
    } else if (u.team === "player") {
      for (const id of Object.values(CH.hud)) rows.push([CH.skills[id].name, statusOf(id).note || (statusOf(id).ready ? "就緒" : "")]);
      if (u.state.loaded) rows.push(["上膛", "已上膛"]);
    } else {
      const st = u.state;
      rows.push(["壓制", st.slamPending ? "蓄力中" : st.slamCd > 0 ? `冷卻中（${st.slamCd} 次行動）` : "就緒"]);
    }
    box.innerHTML = `<div class="nm">${esc(u.name)}</div><table>${rows.map(([a, b]) => `<tr><td class="muted">${a}</td><td>${b}</td></tr>`).join("")}</table>`;
  }

  // ---------- 數值調整面板 ----------
  const SL = C.enemies.slime, SK = CH.skills, MB = C.enemies.matrixBoss;
  const kinds = new Set(ROOMDEF.wave.map((w) => w.kind));
  const TUNE = [];
  if (kinds.has("matrixBoss")) TUNE.push(
    ["殲滅矩陣", null],
    ["預告反應時間（秒）", MB, "reaction", 0.3, 3, 0.1],
    ["光彈速度", MB.bullet, "speed", 80, 600, 10],
    ["觸手 基礎傷害", MB.swipe, "base", 1, 40, 1],
    ["觸手 揮動角度（半角°）", MB.swipe, "half", 10, 90, 5],
    ["保留閃避行動點", MB, "reserveAp", 0, 8, 1],
    ["電流 基礎傷害", MB.electric, "base", 1, 40, 1],
    ["電流 半徑", MB.electric, "radius", 50, 250, 5],
    ["核心射擊 每發傷害", MB.shot, "base", 1, 20, 1],
    ["激光 基礎傷害", MB.laser, "base", 1, 50, 1],
    ["激光 寬度", MB.laser, "width", 20, 200, 5],
    ["環狀光彈 每發傷害", MB.ring, "base", 1, 20, 1],
    ["環狀光彈 數量", MB.ring, "count", 4, 24, 1],
    ["大招 間隔（回合）", MB.ult, "every", 1, 8, 1],
    ["背景音樂音量", C, "bgmVolume", 0, 1, 0.05],
  );
  if (kinds.has("slime")) TUNE.push(
    ["史萊姆", null],
    ["撞擊 反應時間（秒）", SL.ram, "reaction", 0.3, 3, 0.1],
    ["撞擊 長度", SL.ram, "length", 40, 300, 5],
    ["撞擊 寬度", SL.ram, "width", 30, 160, 2],
    ["撞擊 基礎傷害", SL.ram, "base", 1, 40, 1],
    ["壓制 施放距離", SL.slam, "range", 150, 600, 10],
    ["壓制 範圍半徑", SL.slam, "radius", 50, 250, 5],
    ["壓制 基礎傷害", SL.slam, "base", 1, 50, 1],
    ["壓制 冷卻（次行動）", SL.slam, "cooldown", 0, 6, 1],
  );
  TUNE.push(
    [CH.name, null],
    ["箭 射程", SK.load, "range", 150, 800, 10],
    ["上膛 冷卻（次行動）", SK.load, "cooldown", 0, 8, 1],
    ["煙霧 施放距離", SK.smoke, "range", 60, 400, 10],
    ["煙霧 半徑", SK.smoke, "radius", 20, 140, 5],
    ["大招 行動點", SK.burst, "ap", 0, 6, 1],
    ["大招 尖刺寬度", SK.burst, "spikeWidth", 4, 60, 2],
    ["共用", null],
    ["非自己回合消耗倍率", C, "offTurnMultiplier", 1, 3, 1],
    ["敵人動作間隔（秒）", C, "aiDelay", 0.1, 1.5, 0.05],
    ["音量", C, "volume", 0, 1, 0.05],
  );
  $("#tunerBody").innerHTML = TUNE.map(([label, obj, , min, max, step], i) => obj === null
    ? `<h3>${esc(label)}</h3>`
    : `<label><span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" data-i="${i}"><output></output></label>`).join("");
  document.querySelectorAll("#tunerBody input").forEach((inp) => {
    const [, obj, key] = TUNE[+inp.dataset.i];
    const out = inp.nextElementSibling;
    inp.value = obj[key];
    out.textContent = obj[key];
    inp.addEventListener("input", () => {
      obj[key] = +inp.value; out.textContent = inp.value;
      if (bgm && key === "bgmVolume") bgm.volume = obj[key];
      renderUI();
    });
  });

  // ---------- 繪圖工具 ----------
  function circle(x, y, r, stroke, fill, width = 2, dash = null) {
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.setLineDash(dash || []); ctx.lineWidth = width; ctx.strokeStyle = stroke; ctx.stroke(); ctx.setLineDash([]); }
  }
  function line(ax, ay, bx, by, color, width = 2, dash = null) {
    ctx.setLineDash(dash || []); ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]);
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function label(text, x, y, color = "#1d1d1f", size = 13) {
    ctx.font = `bold ${size}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 4; ctx.strokeStyle = "#fffdf8"; ctx.strokeText(text, x, y);
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  }
  function arrowHead(x, y, ang, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - Math.cos(ang - 0.45) * size, y - Math.sin(ang - 0.45) * size);
    ctx.lineTo(x - Math.cos(ang + 0.45) * size, y - Math.sin(ang + 0.45) * size);
    ctx.closePath(); ctx.fill();
  }
  function facingArrow(x, y, ang, len = 46) {
    const sx = x + Math.cos(ang) * 24, sy = y + Math.sin(ang) * 24;
    const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
    ctx.strokeStyle = "#e53935"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
    ctx.moveTo(ex, ey); ctx.lineTo(ex - Math.cos(ang - 0.5) * 10, ey - Math.sin(ang - 0.5) * 10);
    ctx.moveTo(ex, ey); ctx.lineTo(ex - Math.cos(ang + 0.5) * 10, ey - Math.sin(ang + 0.5) * 10);
    ctx.stroke();
  }

  // 標靶：紅白同心圓
  function drawTarget(x, y, r) {
    circle(x, y, r + 2.5, null, "rgba(255,253,248,.95)");
    circle(x, y, r, "#d32f2f", "#d32f2f", 0);
    circle(x, y, r * 0.68, null, "#fff");
    circle(x, y, r * 0.38, null, "#d32f2f");
    circle(x, y, r * 0.12, null, "#fff");
  }

  function drawGrid() {
    ctx.fillStyle = "#fffdf8"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#f0ece3"; ctx.lineWidth = 1;
    for (let x = C.grid; x < W; x += C.grid) line(x, 0, x, H, "#f0ece3", 1);
    for (let y = C.grid; y < H; y += C.grid) line(0, y, W, y, "#f0ece3", 1);
  }

  // ---------- 煙霧 ----------
  // 每團煙霧由幾個淡粉色半透明圓組成，依序浮現、緩慢飄動
  function puffs(z) {
    if (z._puffs) return z._puffs;
    let seed = [...z.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const list = [{ dx: 0, dy: 0, r: z.r * 0.62, delay: 0, ph: rnd() * 6 }];
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd() * 0.6;
      const d = z.r * (0.35 + rnd() * 0.3);
      list.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d, r: z.r * (0.38 + rnd() * 0.22), delay: 90 + i * 110 + rnd() * 80, ph: rnd() * 6 });
    }
    return (z._puffs = list);
  }
  function drawSmoke(z, now, fade = 1, scale = 1) {
    if (!zoneSeen.has(z.id)) zoneSeen.set(z.id, now);
    const born = zoneSeen.get(z.id);
    for (const p of puffs(z)) {
      const k = Math.max(0, Math.min(1, (now - born - p.delay) / 600));
      if (k <= 0) continue;
      const e = 1 - Math.pow(1 - k, 3);
      const wob = Math.sin(now / 900 + p.ph) * 3;
      ctx.fillStyle = `rgba(244,170,200,${0.32 * e * fade})`;
      ctx.beginPath();
      ctx.arc(z.x + (p.dx + wob) * scale, z.y + (p.dy + Math.cos(now / 1100 + p.ph) * 3) * scale, p.r * (0.6 + 0.4 * e) * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function drawZones(now) {
    for (const z of smokes()) {
      drawSmoke(z, now);
      const left = z.turnsLeft;
      ctx.globalAlpha = 0.7;
      label(left <= 0 ? "下次輪到你時消散" : `還有 ${left} 回合`, z.x, z.y + z.r + 10, "#c2477a", 10);
      ctx.globalAlpha = 1;
    }
  }

  // ---------- 敵人預告 ----------
  function drawCharges(now) {
    for (const c of B.charges) {
      const pulse = 0.1 + Math.abs(Math.sin(now / 400)) * 0.08;
      circle(c.x, c.y, c.radius, "#c62828", `rgba(229,57,53,${pulse})`, 3, [12, 8]);
      const k = (now / 1600) % 1;
      circle(c.x, c.y, c.radius * (1 - k), "rgba(198,40,40,.35)", null, 2);
      const o = c.owner;
      line(pos(o).x, pos(o).y, c.x, c.y, "rgba(198,40,40,.35)", 2, [4, 6]);
      label("壓制・蓄力中", c.x, c.y - c.radius - 14, "#c62828");
    }
  }

  function threatPath(t) {
    ctx.beginPath();
    if (t.shape === "rect") {
      const c = Math.cos(t.ang), s2 = Math.sin(t.ang), hw = t.width / 2;
      ctx.moveTo(t.x - s2 * hw, t.y + c * hw);
      ctx.lineTo(t.x + c * t.length - s2 * hw, t.y + s2 * t.length + c * hw);
      ctx.lineTo(t.x + c * t.length + s2 * hw, t.y + s2 * t.length - c * hw);
      ctx.lineTo(t.x + s2 * hw, t.y - c * hw);
      ctx.closePath();
    } else if (t.shape === "sector") {
      ctx.moveTo(t.x, t.y);
      ctx.arc(t.x, t.y, t.radius, t.ang - t.half, t.ang + t.half);
      ctx.closePath();
    } else {
      ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
    }
  }
  // 預告範圍的中心（倒數數字的位置）
  function threatCenter(t) {
    if (t.shape === "rect") {
      const L = t.kind === "laser" ? Math.min(t.length, 260) : t.length / 2;
      return { x: t.x + Math.cos(t.ang) * L, y: t.y + Math.sin(t.ang) * L };
    }
    if (t.shape === "sector") return { x: t.x + Math.cos(t.ang) * t.radius * 0.6, y: t.y + Math.sin(t.ang) * t.radius * 0.6 };
    return { x: t.x, y: t.y };
  }
  function drawThreat(now) {
    for (const t of B.threats) {
      const left = Math.max(0, (t.deadline - now) / 1000), k = 1 - left / t.total;
      ctx.save();
      threatPath(t);
      ctx.fillStyle = `rgba(229,57,53,${0.14 + k * 0.26})`;
      ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = "#e53935"; ctx.stroke();
      // 由外往內縮的倒數線
      ctx.clip();
      if (t.shape === "circle") circle(t.x, t.y, t.radius * (1 - k), "rgba(229,57,53,.6)", null, 2);
      else if (t.shape === "sector") circle(t.x, t.y, t.radius * (1 - k), "rgba(229,57,53,.6)", null, 2);
      else {
        const c = Math.cos(t.ang), s2 = Math.sin(t.ang), L = t.length * k, hw = t.width / 2;
        line(t.x + c * L - s2 * hw, t.y + s2 * L + c * hw, t.x + c * L + s2 * hw, t.y + s2 * L - c * hw, "rgba(229,57,53,.6)", 3);
      }
      ctx.restore();
      if (t.kind === "electric") drawSparks(t.x, t.y, t.radius, now, 0.5);
    }
  }
  function drawThreatLabel(now) {
    for (const t of B.threats) {
      const left = Math.max(0, (t.deadline - now) / 1000), c = threatCenter(t);
      label(left.toFixed(1), c.x, c.y, "#c62828", 20);
    }
  }
  // 電流：圓周上隨機的折線
  function drawSparks(x, y, r, now, alpha) {
    const seed = Math.floor(now / 70);
    ctx.strokeStyle = `rgba(80,160,255,${alpha})`; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = ((seed * 37 + i * 61) % 360) * Math.PI / 180;
      ctx.beginPath();
      let px = x + Math.cos(a) * r * 0.3, py = y + Math.sin(a) * r * 0.3;
      ctx.moveTo(px, py);
      for (let j = 1; j <= 4; j++) {
        const rr = r * (0.3 + j * 0.175), jit = (((seed + i * 7 + j * 13) % 11) - 5) * 0.05;
        px = x + Math.cos(a + jit) * rr; py = y + Math.sin(a + jit) * rr;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }

  // ---------- Boss：古代遺跡的殲滅矩陣 ----------
  function hexagon(x, y, r, rot = -Math.PI / 2) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = rot + (i * Math.PI) / 3;
      i ? ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
  }
  // 觸手目前的角度：平常是固定方向，揮動時 原位 → 扇形一側 → 掃到另一側 → 回原位
  function armAngle(p, now) {
    const f = fx.find((x) => x.k === "swing" && x.arm === p);
    if (!f) return p.angle;
    const k = Math.max(0, Math.min(1, (now - f.t) / f.dur));
    const lerpA = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
    const ease = (t) => t * t * (3 - 2 * t);
    if (k < 0.2) return lerpA(p.angle, f.from, ease(k / 0.2));
    if (k < 0.55) return lerpA(f.from, f.to, ease((k - 0.2) / 0.35));
    return lerpA(f.to, p.angle, ease((k - 0.55) / 0.45));
  }
  function drawBoss(core, now) {
    const c = pos(core), D = core.def;
    const isCur = B.current === core && B.phase !== "over";
    ctx.globalAlpha = core.alive ? 1 : 0.3;

    // 觸手：從核心邊緣的根部長出一串灰色圓，末端接著能量矩陣
    // 揮動觸手時整條觸手（連同矩陣）以根部為軸轉動
    const L = D.armLength - core.r;                 // 根部到矩陣中心
    const armPos = new Map();
    for (const p of core.parts) {
      const a = armAngle(p, now);
      const ox = c.x + Math.cos(p.angle) * core.r, oy = c.y + Math.sin(p.angle) * core.r;
      const mx = ox + Math.cos(a) * L, my = oy + Math.sin(a) * L;
      armPos.set(p, { x: mx, y: my, a, ox, oy });
      const nx = -Math.sin(a), ny = Math.cos(a), n = 5;
      ctx.globalAlpha = core.alive ? (p.alive ? 1 : 0.5) : 0.3;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, d = (L - p.r * 0.4) * t;
        const wob = Math.sin(now / 520 + i * 0.9 + p.angle * 2) * 4 * Math.sin(t * Math.PI) * (p.alive ? 1 : 0.3);
        const r = 13 + 5 * Math.abs(Math.sin(i * 1.7 + p.angle * 3));
        circle(ox + Math.cos(a) * d + nx * wob, oy + Math.sin(a) * d + ny * wob, r, null, "#c4c4c4");
      }
    }
    ctx.globalAlpha = core.alive ? 1 : 0.3;

    // 能量矩陣：灰色菱形 + 紅色能量球（位置跟著觸手）
    for (const p of core.parts) {
      const m = armPos.get(p), s = p.r * 1.2;
      ctx.save();
      ctx.globalAlpha = core.alive ? (p.alive ? 1 : 0.45) : 0.3;
      ctx.translate(m.x, m.y); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#c9c9c9"; ctx.fillRect(-s / 2 * 1.2, -s / 2 * 1.2, s * 1.2, s * 1.2);
      ctx.lineWidth = 3.5; ctx.strokeStyle = "#7a7a7a"; ctx.strokeRect(-s / 2 * 1.2, -s / 2 * 1.2, s * 1.2, s * 1.2);
      ctx.restore();
      ctx.globalAlpha = core.alive ? (p.alive ? 1 : 0.45) : 0.3;
      if (p.alive) {
        const glow = 0.5 + Math.sin(now / 300 + p.angle) * 0.15;
        circle(m.x, m.y, p.r * 0.62, null, `rgba(232,38,44,${glow * 0.35})`);
        circle(m.x, m.y, p.r * 0.48, "#7a0d12", "#e8262c", 3);
      } else {
        circle(m.x, m.y, p.r * 0.48, "#6b6b6b", "#9a9a9a", 3);
        line(m.x - 10, m.y - 12, m.x + 4, m.y + 2, "#555", 2); line(m.x + 4, m.y + 2, m.x - 2, m.y + 13, "#555", 2);
      }
      if (p.alive) {
        const bw = 52, bx = m.x - bw / 2, by = m.y + p.r + 10;
        ctx.fillStyle = "#ece8df"; ctx.fillRect(bx, by, bw, 5);
        ctx.fillStyle = "#e8262c"; ctx.fillRect(bx, by, bw * (p.hp / p.maxHp), 5);
      }
      ctx.fillStyle = "#6b665d"; ctx.font = "11px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText(p.alive ? p.name : `${p.name}（已破壞）`, m.x, m.y + p.r + 18);
    }
    ctx.globalAlpha = core.alive ? 1 : 0.3;

    // 核心：外六角、內六角、三顆代表矩陣的紅點
    if (isCur) { hexagon(c.x, c.y, core.r + 10 + Math.sin(now / 200) * 3); ctx.strokeStyle = "rgba(232,38,44,.3)"; ctx.lineWidth = 3; ctx.stroke(); }
    hexagon(c.x, c.y, core.r); ctx.fillStyle = "#fffdf8"; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = "#7a7a7a"; ctx.stroke();
    hexagon(c.x, c.y, core.r * 0.5); ctx.lineWidth = 3.5; ctx.stroke();
    for (const p of core.parts) {
      const d = core.r * 0.42;
      circle(c.x + Math.cos(p.angle) * d, c.y + Math.sin(p.angle) * d, 7.5, null, p.alive ? "#e8262c" : "#b5b5b5");
    }

    // 立場：半透明泡泡，矩陣越少越淡，全破壞就消失
    const k = core.alive ? D.incomingMult(B, core) : 1.5;
    const strength = { 0: 1, 0.5: 0.6, 1: 0.32 }[k] ?? 0;
    if (strength > 0) {
      const wob = Math.sin(now / 700) * 2;
      circle(c.x, c.y, core.r + 18 + wob, `rgba(90,160,240,${0.55 * strength})`, `rgba(120,185,255,${0.14 * strength})`, 2);
      ctx.save(); ctx.beginPath(); ctx.arc(c.x, c.y, core.r + 18 + wob, 0, Math.PI * 2); ctx.clip();
      const sweep = ((now / 2200) % 1) * (core.r * 2 + 80) - core.r - 40;
      line(c.x + sweep - 20, c.y - core.r - 30, c.x + sweep + 20, c.y + core.r + 30, `rgba(255,255,255,${0.5 * strength})`, 8);
      ctx.restore();
    }

    // 核心血量
    if (core.alive) {
      const bw = 130, bx = c.x - bw / 2, by = c.y + core.r + 26;
      ctx.fillStyle = "#ece8df"; ctx.fillRect(bx, by, bw, 7);
      ctx.fillStyle = "#c62828"; ctx.fillRect(bx, by, bw * (core.hp / core.maxHp), 7);
      label(`${core.hp} / ${core.maxHp}${k === 0 ? "　立場" : k !== 1 ? `　受傷 ×${k}` : ""}`, c.x, by + 18, "#6b665d", 11);
    }
    ctx.globalAlpha = 1;
  }

  // 光彈：紅色膠囊形，沿飛行方向
  function drawProjectiles() {
    for (const b of B.projectiles) {
      ctx.save();
      ctx.translate(b.x, b.y); ctx.rotate(b.ang);
      ctx.fillStyle = "rgba(232,38,44,.18)";
      ctx.beginPath(); ctx.ellipse(0, 0, 16, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#e8262c"; ctx.lineCap = "round"; ctx.lineWidth = b.r * 1.5;
      ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.stroke();
      ctx.restore();
    }
  }

  // ---------- 玩家的預覽 ----------
  // 箭的路線：回傳 { to, hit, boosted }
  function arrowPath(u, tx, ty, range) {
    const L = Math.hypot(tx - u.x, ty - u.y) || 1, dx = (tx - u.x) / L, dy = (ty - u.y) / L;
    let hit = null, hitT = range;
    for (const e of B.enemies()) {
      const t = R.geo.rayCircle(u.x, u.y, dx, dy, e.x, e.y, e.r);
      if (t !== null && t < hitT) { hit = e; hitT = t; }
    }
    const to = { x: u.x + dx * hitT, y: u.y + dy * hitT };
    const boosted = smokes().some((z) => R.geo.pointSeg(z.x, z.y, u.x, u.y, to.x, to.y) <= z.r);
    return { to, hit, boosted };
  }

  function drawPlanning() {
    const u = B.player;
    if (!u.alive) return;
    const p = pos(u), BD = C.body;
    const hover = mouse.in ? unitAt(mouse) : null;

    if (canAct() && mode === "move") {
      const cost = C.moveCost * mult();
      const ok = u.ap >= cost;
      const r = B.moveRadius(u);
      circle(p.x, p.y, r, ok ? "#1aa3e8" : "#c9c4b9", ok ? "rgba(26,163,232,.06)" : null, 3);
      const basic = CH.skills[CH.basic];
      circle(p.x, p.y, basic.range, "rgba(29,29,31,.25)", null, 1, [4, 5]);
      if (ok && mouse.in && !hover && dist(p.x, p.y, mouse.x, mouse.y) <= r) {
        ctx.globalAlpha = 0.35; roundRect(mouse.x - BD, mouse.y - BD, BD * 2, BD * 2, 8);
        ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      if (hover && hover.team === "enemy") {
        const inR = B.reach(u, hover) <= basic.range;
        circle(pos(hover).x, pos(hover).y, hover.r + 6, inR ? "#e53935" : "#c9c4b9", null, 2, inR ? null : [4, 4]);
        if (!inR) label("太遠了", pos(hover).x, pos(hover).y - hover.r - 28);
      }
      return;
    }
    if (!canAct()) return;
    const st = statusOf(mode), aim = st.aim || {};
    const sk = CH.skills[mode];
    const color = sk.ultimate ? "#e0b800" : "#f08a2c";
    const fill = sk.ultimate ? "rgba(242,207,29,.18)" : "rgba(240,138,44,.15)";

    if (aim.type === "direction" && mouse.in) {
      // 射箭預覽：沿路線畫到命中點，穿過煙霧會變粉紅並標示 ×1.5
      const a = arrowPath(u, mouse.x, mouse.y, aim.range);
      const c = a.boosted ? "#c2477a" : "rgba(229,57,53,.75)";
      line(u.x, u.y, a.to.x, a.to.y, c, 2.5, [8, 6]);
      arrowHead(a.to.x, a.to.y, Math.atan2(a.to.y - u.y, a.to.x - u.x), 12, c);
      if (a.hit) circle(pos(a.hit).x, pos(a.hit).y, a.hit.r + 6, c, null, 3);
      if (a.boosted) label("穿過煙霧 ×1.5", (u.x + a.to.x) / 2, (u.y + a.to.y) / 2 - 14, "#c2477a", 12);
    } else if (aim.type === "point") {
      circle(p.x, p.y, aim.range, color, null, 2, [6, 5]);
      if (!mouse.in) return;
      const g = clampToRange(mouse, aim.range);
      if (mode === CH.ultimate) {
        // 大招預覽：每團煙霧連到目標點，標出每個敵人會被幾根尖刺打到
        const w = sk.spikeWidth, count = new Map();
        for (const z of smokes()) {
          line(z.x, z.y, g.x, g.y, "rgba(194,71,122,.55)", w, null);
          for (const e of B.enemies())
            if (R.geo.pointSeg(e.x, e.y, z.x, z.y, g.x, g.y) <= e.r + w / 2) count.set(e, (count.get(e) || 0) + 1);
        }
        for (const [e, n] of count) {
          circle(pos(e).x, pos(e).y, e.r + 6, "#c2477a", null, 3);
          label(`×${n}`, pos(e).x + e.r + 14, pos(e).y - e.r, "#c2477a", 15);
        }
        circle(g.x, g.y, 10, "#c2477a", "rgba(194,71,122,.3)", 2);
      } else if (mode === "smoke") {
        circle(g.x, g.y, aim.radius, "#c2477a", "rgba(244,170,200,.25)", 2, [5, 4]);
        const list = smokes();
        if (list.length >= sk.max) label("最舊的一團會消失", list[0].x, list[0].y - list[0].r - 12, "#c2477a", 11);
      } else {
        circle(g.x, g.y, aim.radius || 20, color, fill, 3);
      }
    } else if (aim.type === "enemy") {
      circle(p.x, p.y, aim.range, color, null, 2);
      if (hover && hover.team === "enemy") {
        const inR = B.reach(u, hover) <= aim.range;
        circle(pos(hover).x, pos(hover).y, hover.r + 6, inR ? color : "#c9c4b9", null, 3, inR ? null : [4, 4]);
      }
    }
  }

  function lungeOffset(u, now) {
    const f = fx.find((f) => f.k === "lunge" && f.unit === u);
    if (!f) return { x: 0, y: 0 };
    const k = Math.min(1, (now - f.t) / f.dur);
    const s = Math.sin(k * Math.PI) * f.len;
    return { x: Math.cos(f.ang) * s, y: Math.sin(f.ang) * s };
  }
  function leapProgress(u, now) {
    const f = fx.find((f) => f.k === "leap" && f.unit === u);
    return f ? { f, k: Math.max(0, Math.min(1, (now - f.t) / f.dur)) } : null;
  }

  function drawUnit(u, now) {
    if (u.part) return;
    if (u.def.boss) return drawBoss(u, now);
    const off = lungeOffset(u, now);
    const leap = leapProgress(u, now);
    if (leap) {
      const g = pos(u), h = Math.sin(leap.k * Math.PI);
      ctx.fillStyle = `rgba(29,29,31,${0.18 - h * 0.08})`;
      ctx.beginPath(); ctx.ellipse(g.x, g.y + C.body * 0.8, C.body * (1 - h * 0.35), C.body * 0.35 * (1 - h * 0.35), 0, 0, Math.PI * 2); ctx.fill();
      off.y -= h * 90;
    }
    const p = { x: pos(u).x + off.x, y: pos(u).y + off.y }, BD = C.body;
    const isCur = B.current === u && B.phase !== "over";
    ctx.globalAlpha = u.alive ? 1 : 0.25;

    if (isCur) {
      const pulse = 4 + Math.sin(now / 200) * 2;
      if (u.team === "player") { roundRect(p.x - BD - pulse, p.y - BD - pulse, (BD + pulse) * 2, (BD + pulse) * 2, 10); ctx.strokeStyle = "rgba(29,29,31,.25)"; ctx.lineWidth = 2; ctx.stroke(); }
      else circle(p.x, p.y, BD + pulse, "rgba(43,178,76,.35)", null, 2);
    }

    if (u.team === "player") {
      roundRect(p.x - BD, p.y - BD, BD * 2, BD * 2, 8);
      ctx.fillStyle = "#fff"; ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = CH.color || "#1d1d1f"; ctx.stroke();
      ctx.fillStyle = CH.color || "#1d1d1f"; ctx.font = "bold 16px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(CH.name[0], p.x, p.y + 1);

    } else {
      const squish = 1 + Math.sin(now / 260 + u.x) * 0.04;
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1 / squish, squish);
      circle(0, 0, BD, "#2bb24c", "rgba(43,178,76,.12)", 3);
      ctx.restore();
      circle(p.x - 7 + Math.cos(u.facing) * 4, p.y - 3 + Math.sin(u.facing) * 4, 2.6, null, "#1d1d1f");
      circle(p.x + 7 + Math.cos(u.facing) * 4, p.y - 3 + Math.sin(u.facing) * 4, 2.6, null, "#1d1d1f");
      if (u.alive) for (let i = 0; i < u.maxAp; i++) {
        circle(p.x + (i - (u.maxAp - 1) / 2) * 10, p.y - BD - 10, 3.5, "#2bb24c", i < u.ap && isCur ? "#2bb24c" : "#fffdf8", 1.5);
      }
      if (u.alive && u.state.slamCd > 0) label(`壓制 CD ${u.state.slamCd}`, p.x + BD + 34, p.y - BD + 2, "#8a8478", 11);
    }

    ctx.fillStyle = "#1d1d1f"; ctx.font = "12px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(u.name, p.x, p.y + BD + 13);
    if (u.alive) {
      const bw = 46, bx = p.x - bw / 2, by = p.y + BD + 5;
      ctx.fillStyle = "#ece8df"; ctx.fillRect(bx, by, bw, 5);
      ctx.fillStyle = u.team === "player" ? "#e0524a" : "#2bb24c"; ctx.fillRect(bx, by, bw * (u.hp / u.maxHp), 5);
    }
    ctx.globalAlpha = 1;

    if (u.alive && u.team === "player") {
      let ang = u.facing;
      if (canAct() && mouse.in) ang = Math.atan2(mouse.y - p.y, mouse.x - p.x);
      facingArrow(p.x, p.y, ang);
      // 上膛標示：頭上的標靶，畫在最上層才不會被擋
      if (u.state.loaded) drawTarget(p.x, p.y - 72, 14 + Math.sin(now / 250) * 1.2);
    }
  }

  function drawFx(now) {
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i], dur = f.dur || 700, k = (now - f.t) / dur;
      if (k >= 1) { fx.splice(i, 1); continue; }
      if (k < 0) continue;
      ctx.globalAlpha = 1 - k;
      switch (f.k) {
        case "ring": circle(f.x, f.y, f.r * (0.4 + k * 0.6), f.color, null, 4); break;
        case "num": label(f.text, f.x, f.y - k * 30, f.color, 20); break;
        case "rect":
          ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.ang);
          ctx.fillStyle = "rgba(229,57,53,.45)"; ctx.fillRect(0, -f.width / 2, f.length, f.width);
          ctx.restore(); break;
        case "sector":
          threatPath(f); ctx.fillStyle = "rgba(229,57,53,.4)"; ctx.fill();
          break;
        case "laser": {   // 激光：白芯紅邊，越來越細
          const w = f.width * (1 - k * 0.7);
          ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.ang);
          ctx.fillStyle = "rgba(232,38,44,.55)"; ctx.fillRect(0, -w / 2, f.length, w);
          ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fillRect(0, -w / 6, f.length, w / 3);
          ctx.restore();
          break;
        }
        case "electric":
          circle(f.x, f.y, f.radius, null, "rgba(80,160,255,.25)");
          drawSparks(f.x, f.y, f.radius, now, 1);
          break;
        case "shield":
          circle(f.unit.x, f.unit.y, f.unit.r + 18 + k * 8, "rgba(61,127,224,.9)", "rgba(120,185,255,.25)", 4);
          break;
        case "chargeOut":   // 蓄力範圍縮小淡出
          circle(f.c.x, f.c.y, f.c.radius * (1 - k * 0.6), "#c62828", `rgba(229,57,53,${0.15 * (1 - k)})`, 3, [12, 8]);
          break;
        case "smokeOut": {
          ctx.globalAlpha = 1;
          drawSmoke(f.zone, now, 1 - k, 1 + k * 0.4);
          break;
        }
        case "arrow": {
          // 淡紅色箭矢：前 30% 時間飛行，之後殘影淡出
          ctx.globalAlpha = 1;
          const fly = Math.min(1, k / 0.3), ang = Math.atan2(f.to.y - f.from.y, f.to.x - f.from.x);
          const hx = f.from.x + (f.to.x - f.from.x) * fly, hy = f.from.y + (f.to.y - f.from.y) * fly;
          const tail = Math.max(0, fly - 0.25);
          const tx = f.from.x + (f.to.x - f.from.x) * tail, ty = f.from.y + (f.to.y - f.from.y) * tail;
          const fade = k < 0.3 ? 1 : 1 - (k - 0.3) / 0.7;
          const col = f.boosted ? `rgba(214,92,140,${fade})` : `rgba(240,120,120,${fade})`;
          line(tx, ty, hx, hy, col, 4);
          arrowHead(hx + Math.cos(ang) * 6, hy + Math.sin(ang) * 6, ang, 16, col);
          break;
        }
        case "spike": {
          // 煙霧尖刺：粉色細長三角形從煙霧飛向目標點
          ctx.globalAlpha = 1;
          const fly = Math.min(1, k / 0.55), ang = Math.atan2(f.to.y - f.from.y, f.to.x - f.from.x);
          const e = fly * fly;
          const hx = f.from.x + (f.to.x - f.from.x) * e, hy = f.from.y + (f.to.y - f.from.y) * e;
          const fade = k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45;
          line(f.from.x + (hx - f.from.x) * 0.3, f.from.y + (hy - f.from.y) * 0.3, hx, hy, `rgba(244,170,200,${0.6 * fade})`, 10);
          ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
          ctx.fillStyle = `rgba(194,71,122,${0.9 * fade})`;
          ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-30, -7); ctx.lineTo(-22, 0); ctx.lineTo(-30, 7); ctx.closePath(); ctx.fill();
          ctx.restore();
          if (fly >= 1) circle(f.to.x, f.to.y, 18 + (k - 0.55) * 60, `rgba(194,71,122,${fade})`, null, 3);
          break;
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  let starKey = "";
  function frame(now) {
    drawGrid();
    if (B) {
      for (const u of B.units) {
        const d = disp.get(u.id) || (disp.set(u.id, { x: u.x, y: u.y }), disp.get(u.id));
        const leap = leapProgress(u, now);
        if (leap) {
          const e = leap.k * leap.k * (3 - 2 * leap.k);
          d.x = leap.f.from.x + (leap.f.to.x - leap.f.from.x) * e;
          d.y = leap.f.from.y + (leap.f.to.y - leap.f.from.y) * e;
        } else { d.x += (u.x - d.x) * 0.2; d.y += (u.y - d.y) * 0.2; }
      }
      drawZones(now);
      drawCharges(now);
      drawPlanning();
      drawThreat(now);
      [...B.units].sort((a, b) => a.alive - b.alive).forEach((u) => drawUnit(u, now));
      drawProjectiles();
      drawFx(now);
      drawThreatLabel(now);
      const key = `${mode}|${mouse.in}|${B.phase}|${B.player.ap}|${mouse.in && unitAt(mouse)?.id}`;
      if (key !== starKey) { starKey = key; renderStars(); }
    }
    requestAnimationFrame(frame);
  }

  R.getBattle = () => B;   // 除錯用：在 Console 輸入 RPG.getBattle()
  document.title = `${ROOMDEF.name} · 戰鬥測試`;
  $("#roomName").textContent = ROOMDEF.name;
  if (ROOMDEF.help) $("#roomHelp").innerHTML = ROOMDEF.help;
  newBattle();
  requestAnimationFrame(frame);
})();
