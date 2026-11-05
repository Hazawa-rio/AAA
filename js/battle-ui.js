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

  let B = null;            // 目前的戰鬥
  let mode = "move";       // move 或技能 id
  const mouse = { x: -999, y: -999, in: false };
  const disp = new Map();  // 畫面位置（平滑移動）
  const fx = [];
  const zoneSeen = new Map();   // 煙霧第一次出現的時間（做浮現動畫）

  // ---------- 圖片 ----------
  const images = {};
  function img(src) {
    if (!images[src]) { images[src] = new Image(); images[src].src = src; }
    return images[src];
  }
  const LOADED_MARK = img("assets/icons/loaded-mark.png");

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
  function renderMute() {
    $("#muteBtn").textContent = muted ? "🔇 音效關" : "🔊 音效開";
    $("#muteBtn").setAttribute("aria-pressed", String(!muted));
  }
  $("#muteBtn").addEventListener("click", () => { muted = !muted; store.set("rpg.muted", muted ? "1" : "0"); renderMute(); });
  renderMute();

  // ---------- 開始 / 重新開始 ----------
  function newBattle() {
    if (B) B.destroy();
    disp.clear(); fx.length = 0; zoneSeen.clear(); mode = "move";
    B = new R.Battle(C, CH.id);
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
        if (ev.shape === "circle") {
          fx.push({ k: "ring", x: ev.x, y: ev.y, r: ev.radius, color: "#e53935", t, dur: 600 });
          playSound(ev.unit.def.sounds?.slam);
        } else {
          fx.push({ k: "rect", ...ev, t }, { k: "lunge", unit: ev.owner, ang: ev.ang, len: ev.length * 0.55, t, dur: 320 });
          playSound(ev.owner.def.sounds?.ram);
        }
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
  const unitAt = (p) => B.units.find((u) => u.alive && dist(pos(u).x, pos(u).y, p.x, p.y) <= C.body + 4) || null;
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
      const im = b.querySelector("img");
      if (sk.icon && im.getAttribute("src") !== sk.icon) im.src = sk.icon;
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
      const warn = B.charges.length ? "　⚠ 地上有壓制範圍" : "";
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
    const rows = [["生命", `${u.hp} / ${u.maxHp}`], ["攻擊", u.atk], ["防禦", u.df],
      ["速度", `${u.spd}（移動 ${B.moveRadius(u)}）`], ["行動點", `${u.ap} / ${u.maxAp}`]];
    if (u.team === "player") {
      for (const id of Object.values(CH.hud)) rows.push([CH.skills[id].name, statusOf(id).note || (statusOf(id).ready ? "就緒" : "")]);
      if (u.state.loaded) rows.push(["上膛", "已上膛"]);
    } else {
      const st = u.state;
      rows.push(["壓制", st.slamPending ? "蓄力中" : st.slamCd > 0 ? `冷卻中（${st.slamCd} 次行動）` : "就緒"]);
    }
    box.innerHTML = `<div class="nm">${esc(u.name)}</div><table>${rows.map(([a, b]) => `<tr><td class="muted">${a}</td><td>${b}</td></tr>`).join("")}</table>`;
  }

  // ---------- 數值調整面板 ----------
  const SL = C.enemies.slime, SK = CH.skills;
  const TUNE = [
    ["史萊姆", null],
    ["撞擊 反應時間（秒）", SL.ram, "reaction", 0.3, 3, 0.1],
    ["撞擊 長度", SL.ram, "length", 40, 300, 5],
    ["撞擊 寬度", SL.ram, "width", 30, 160, 2],
    ["撞擊 基礎傷害", SL.ram, "base", 1, 40, 1],
    ["壓制 施放距離", SL.slam, "range", 150, 600, 10],
    ["壓制 範圍半徑", SL.slam, "radius", 50, 250, 5],
    ["壓制 基礎傷害", SL.slam, "base", 1, 50, 1],
    ["壓制 冷卻（次行動）", SL.slam, "cooldown", 0, 6, 1],
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
  ];
  $("#tunerBody").innerHTML = TUNE.map(([label, obj, , min, max, step], i) => obj === null
    ? `<h3>${esc(label)}</h3>`
    : `<label><span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" data-i="${i}"><output></output></label>`).join("");
  document.querySelectorAll("#tunerBody input").forEach((inp) => {
    const [, obj, key] = TUNE[+inp.dataset.i];
    const out = inp.nextElementSibling;
    inp.value = obj[key];
    out.textContent = obj[key];
    inp.addEventListener("input", () => { obj[key] = +inp.value; out.textContent = inp.value; renderUI(); });
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
      const left = z.expiresRound - B.round;
      ctx.globalAlpha = 0.7;
      label(left <= 1 ? "本回合結束後消散" : `剩 ${left} 回合`, z.x, z.y + z.r + 10, "#c2477a", 10);
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

  function drawThreat(now) {
    const t = B.threat;
    if (!t) return;
    const left = Math.max(0, (t.deadline - now) / 1000);
    ctx.save();
    ctx.translate(t.x, t.y); ctx.rotate(t.ang);
    ctx.fillStyle = `rgba(229,57,53,${0.18 + (1 - left / t.total) * 0.25})`;
    ctx.fillRect(0, -t.width / 2, t.length, t.width);
    ctx.lineWidth = 3; ctx.strokeStyle = "#e53935";
    ctx.strokeRect(0, -t.width / 2, t.length, t.width);
    ctx.fillStyle = "#e53935";
    ctx.fillRect(0, t.width / 2 - 4, t.length * (left / t.total), 4);
    ctx.restore();
  }
  function drawThreatLabel(now) {
    const t = B.threat;
    if (!t) return;
    const left = Math.max(0, (t.deadline - now) / 1000);
    label(left.toFixed(1), t.x + Math.cos(t.ang) * t.length / 2, t.y + Math.sin(t.ang) * t.length / 2, "#c62828", 20);
  }

  // ---------- 玩家的預覽 ----------
  // 箭的路線：回傳 { to, hit, boosted }
  function arrowPath(u, tx, ty, range) {
    const L = Math.hypot(tx - u.x, ty - u.y) || 1, dx = (tx - u.x) / L, dy = (ty - u.y) / L;
    let hit = null, hitT = range;
    for (const e of B.enemies()) {
      const t = R.geo.rayCircle(u.x, u.y, dx, dy, e.x, e.y, C.body);
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
        const inR = dist(p.x, p.y, hover.x, hover.y) <= basic.range;
        circle(pos(hover).x, pos(hover).y, BD + 6, inR ? "#e53935" : "#c9c4b9", null, 2, inR ? null : [4, 4]);
        if (!inR) label("太遠了", pos(hover).x, pos(hover).y - BD - 28);
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
      if (a.hit) circle(pos(a.hit).x, pos(a.hit).y, BD + 6, c, null, 3);
      if (a.boosted) label("穿過煙霧 ×1.5", (u.x + a.to.x) / 2, (u.y + a.to.y) / 2 - 14, "#c2477a", 12);
    } else if (aim.type === "point") {
      circle(p.x, p.y, aim.range, color, null, 2, [6, 5]);
      if (!mouse.in) return;
      const g = clampToRange(mouse, aim.range);
      if (mode === CH.ultimate) {
        // 大招預覽：每團煙霧連到目標點，標出會被尖刺打到的敵人
        const w = sk.spikeWidth;
        for (const z of smokes()) {
          line(z.x, z.y, g.x, g.y, "rgba(194,71,122,.55)", w, null);
          for (const e of B.enemies())
            if (R.geo.pointSeg(e.x, e.y, z.x, z.y, g.x, g.y) <= BD + w / 2) circle(pos(e).x, pos(e).y, BD + 6, "#c2477a", null, 3);
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
        const inR = dist(p.x, p.y, hover.x, hover.y) <= aim.range;
        circle(pos(hover).x, pos(hover).y, BD + 6, inR ? color : "#c9c4b9", null, 3, inR ? null : [4, 4]);
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
      // 上膛標示：頭上、在面向箭頭之外，畫在最上層才不會被擋
      if (u.state.loaded && LOADED_MARK.complete) {
        const s = 32 + Math.sin(now / 250) * 2;
        circle(p.x, p.y - 54 - s / 2 + 2, s / 2 + 3, null, "rgba(255,253,248,.9)");
        ctx.drawImage(LOADED_MARK, p.x - s / 2, p.y - 54 - s, s, s);
      }
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
      drawFx(now);
      drawThreatLabel(now);
      const key = `${mode}|${mouse.in}|${B.phase}|${B.player.ap}|${mouse.in && unitAt(mouse)?.id}`;
      if (key !== starKey) { starKey = key; renderStars(); }
    }
    requestAnimationFrame(frame);
  }

  R.getBattle = () => B;   // 除錯用：在 Console 輸入 RPG.getBattle()
  document.title = `${CH.name} · 戰鬥測試`;
  newBattle();
  requestAnimationFrame(frame);
})();
