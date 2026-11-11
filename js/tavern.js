/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/tavern.js": "20261112021356" });
// 時空酒館（地圖測試）：玩家是只有名字的方塊，可以在酒館裡走動、和物件互動
// 互動：酒保桑恩（特調）、懸掛電話（多人房號）、天文望遠鏡（之後抽角色）、時空委託欄（開始戰鬥）、適格者名牌架（選角色）
(function () {
  const R = window.RPG, P = R.Profile;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 無法儲存 */ } },
  };
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

  // 錯誤直接顯示在畫面上，方便回報
  function showError(e) {
    const el = $("#fatal");
    el.textContent = `發生錯誤：${e?.message || e}（請截圖回報）`;
    el.classList.remove("hidden");
  }
  window.addEventListener("error", (e) => showError(e.error || e.message));

  // ===== 版面（畫布座標 1280 × 720） =====
  const W = 1280, H = 720, WALL = 112, SIDE = 14;
  const cv = $("#tavern"), ctx = cv.getContext("2d");

  // 桌椅（像參考圖：圓角方桌＋四張長椅，整組斜放）
  const TABLES = [
    { x: 245, y: 430, rot: -0.55 },
    { x: 470, y: 590, rot: 0.5 },
    { x: 930, y: 480, rot: -0.5 },
    { x: 1150, y: 598, rot: 0.6 },
  ];
  const BAR = { x: 790, y: 186, w: W - SIDE - 790, h: 52 };          // 吧檯（前面可以站，後面是酒保）
  const STOOLS = [860, 960, 1060, 1160].map((x) => ({ x, y: 266, r: 14 }));
  const BARTENDER = { x: 930, y: 140 };
  const RESERVED = { x: 1120, y: 140 };                                // 吧檯預留給之後的 NPC
  const RACK = { x: 668, y: WALL, w: 76, h: 34 };
  const TELESCOPE = { x: 165, y: 172, r: 26 };

  // 碰撞
  const RECTS = [BAR, { x: 774, y: WALL, w: 16, h: BAR.y + BAR.h - WALL }, RACK];
  const CIRCLES = [...TABLES.map((t) => ({ x: t.x, y: t.y, r: 84 })), ...STOOLS, TELESCOPE];

  // 可以互動的東西：at = 要站到哪裡互動；box = 點擊範圍
  const THINGS = [
    { id: "bartender", label: "酒保 桑恩", at: { x: 930, y: 282 }, box: { x: 880, y: 100, w: 100, h: 140 } },
    { id: "phone", label: "懸掛電話", at: { x: 340, y: 150 }, box: { x: 306, y: 18, w: 68, h: 86 } },
    { id: "board", label: "時空委託欄", at: { x: 535, y: 150 }, box: { x: 430, y: 12, w: 210, h: 88 } },
    { id: "radio", label: "收音機", at: { x: 1226, y: 302 }, box: { x: 1196, y: 150, w: 62, h: 56 } },
    { id: "rack", label: "適格者名牌架", at: { x: 706, y: 182 }, box: { x: 660, y: 70, w: 92, h: 82 } },
    { id: "telescope", label: "天文望遠鏡", at: { x: 165, y: 236 }, box: { x: 120, y: 120, w: 100, h: 96 } },
    { id: "bestiary", label: "魔物圖鑑", at: { x: 930, y: 590 }, box: { x: 890, y: 440, w: 80, h: 64 } },
    { id: "door", label: "出入口（前往時空）", at: { x: 640, y: 662 }, box: { x: 596, y: 684, w: 88, h: 36 } },
  ];

  // ===== 玩家 =====
  const me = { x: 640, y: 640, half: 17, speed: 260, target: null, then: null, stuck: 0 };
  const keys = new Set();
  let hover = null, near = null, panelOpen = false;

  function blocked(x, y) {
    const h = me.half;
    if (x - h < SIDE || x + h > W - SIDE || y - h < WALL || y + h > H - SIDE) return true;
    for (const r of RECTS) if (x + h > r.x && x - h < r.x + r.w && y + h > r.y && y - h < r.y + r.h) return true;
    for (const c of CIRCLES) {
      const cx = Math.max(x - h, Math.min(c.x, x + h)), cy = Math.max(y - h, Math.min(c.y, y + h));
      if (dist(cx, cy, c.x, c.y) < c.r) return true;
    }
    return false;
  }
  function step(dx, dy) {
    let moved = false;
    if (dx && !blocked(me.x + dx, me.y)) { me.x += dx; moved = true; }
    if (dy && !blocked(me.x, me.y + dy)) { me.y += dy; moved = true; }
    return moved;
  }
  function update(dt) {
    if (panelOpen) return;
    // 只用點擊移動
    if (me.target) {
      const d = dist(me.x, me.y, me.target.x, me.target.y);
      if (d < 3) arrive();
      else {
        const s = Math.min(d, me.speed * dt);
        const ok = step(((me.target.x - me.x) / d) * s, ((me.target.y - me.y) / d) * s);
        me.stuck = ok ? 0 : me.stuck + dt;
        if (me.stuck > 0.25) arrive();      // 被擋住就停下
      }
    }
    near = nearestThing();
  }
  function arrive() {
    const then = me.then;
    me.target = null; me.then = null; me.stuck = 0;
    if (then && dist(me.x, me.y, then.at.x, then.at.y) < 90) open(then.id);
  }
  function nearestThing() {
    let best = null, bd = 80;
    for (const t of THINGS) { const d = dist(me.x, me.y, t.at.x, t.at.y); if (d < bd) { best = t; bd = d; } }
    return best;
  }
  const inBox = (b, p) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;

  // ===== 繪圖 =====
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function text(t, x, y, color, size = 13, weight = 700, align = "center") {
    ctx.font = `${weight} ${size}px "Noto Sans TC", sans-serif`;
    ctx.textAlign = align; ctx.textBaseline = "middle"; ctx.fillStyle = color; ctx.fillText(t, x, y);
  }
  // 木地板：橫向木條，接縫錯開（固定亂數，每次畫都一樣）
  const planks = [];
  (function makePlanks() {
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let y = WALL, row = 0; y < H; y += 34, row++) {
      let x = -rnd() * 160;
      while (x < W) { const w = 140 + rnd() * 160; planks.push({ x, y, w, shade: rnd() }); x += w; }
    }
  })();
  function drawFloor() {
    for (const p of planks) {
      const c = 0.85 + p.shade * 0.2;
      ctx.fillStyle = `rgb(${Math.round(176 * c)},${Math.round(122 * c)},${Math.round(78 * c)})`;
      ctx.fillRect(p.x, p.y, p.w, 34);
      ctx.strokeStyle = "rgba(70,40,20,.35)"; ctx.lineWidth = 1.5; ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, 33);
      ctx.fillStyle = "rgba(255,230,190,.08)"; ctx.fillRect(p.x, p.y + 2, p.w, 3);
    }
    // 地毯
    ctx.save(); ctx.translate(640, 395);
    ctx.beginPath(); ctx.ellipse(0, 0, 150, 78, 0, 0, Math.PI * 2); ctx.fillStyle = "#7a2a2a"; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = "#d9b45a"; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, 122, 56, 0, 0, Math.PI * 2); ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.strokeStyle = "rgba(217,180,90,.8)"; ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
  function drawWalls(now) {
    // 後牆：深色直條木板
    ctx.fillStyle = "#5b3a24"; ctx.fillRect(0, 0, W, WALL);
    for (let x = 0; x < W; x += 46) { ctx.fillStyle = x % 92 ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.03)"; ctx.fillRect(x, 0, 46, WALL); ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(x, 0, 2, WALL); }
    ctx.fillStyle = "#3e2716"; ctx.fillRect(0, WALL - 10, W, 10);
    // 左右、下方的牆，下方中間是門
    ctx.fillStyle = "#3e2716";
    ctx.fillRect(0, WALL, SIDE, H - WALL); ctx.fillRect(W - SIDE, WALL, SIDE, H - WALL);
    ctx.fillRect(0, H - SIDE, 590, SIDE); ctx.fillRect(690, H - SIDE, W - 690, SIDE);
    ctx.fillStyle = "#6b4a2e"; ctx.fillRect(600, H - 30, 80, 30);          // 門口地墊
    text("出入口", 640, H - 14, "#f3e6d0", 11, 700);

    // 窗戶：窗外是異次元——不停變色的星雲漩渦、裂縫和漂浮的碎片
    const wx = 60, wy = 16, ww = 200, wh = 78, T = now / 1000;
    ctx.save();
    ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
    const h0 = (T * 25) % 360;
    const g = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh);
    g.addColorStop(0, `hsl(${h0},70%,18%)`); g.addColorStop(0.5, `hsl(${(h0 + 120) % 360},65%,22%)`); g.addColorStop(1, `hsl(${(h0 + 240) % 360},70%,16%)`);
    ctx.fillStyle = g; ctx.fillRect(wx, wy, ww, wh);
    // 會飄移的彩色星雲
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 6; i++) {
      const cx = wx + ww / 2 + Math.cos(T * (0.3 + i * 0.07) + i * 1.7) * ww * 0.42;
      const cy = wy + wh / 2 + Math.sin(T * (0.4 + i * 0.05) + i * 2.3) * wh * 0.45;
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 34 + (i % 3) * 10);
      rg.addColorStop(0, `hsla(${(h0 + i * 60) % 360},95%,62%,.55)`); rg.addColorStop(1, `hsla(${(h0 + i * 60) % 360},95%,50%,0)`);
      ctx.fillStyle = rg; ctx.fillRect(wx, wy, ww, wh);
    }
    // 漩渦
    const vx = wx + ww * 0.62, vy = wy + wh * 0.5;
    for (let arm = 0; arm < 3; arm++) {
      ctx.beginPath();
      for (let k = 0; k <= 40; k++) {
        const a = T * 1.2 + arm * 2.09 + k * 0.16, r = 2 + k * 1.6;
        const x = vx + Math.cos(a) * r, y = vy + Math.sin(a) * r * 0.6;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = `hsla(${(h0 + 180 + arm * 40) % 360},100%,75%,.55)`; ctx.lineWidth = 2; ctx.stroke();
    }
    // 星星（顏色亂跳）
    for (let i = 0; i < 26; i++) {
      const sx = wx + ((i * 53 + T * (8 + (i % 5) * 6)) % ww), sy = wy + ((i * 29) % wh), tw = 0.5 + 0.5 * Math.sin(T * 3 + i);
      ctx.fillStyle = `hsla(${(i * 47 + h0 * 2) % 360},100%,85%,${0.3 + 0.7 * tw})`; ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalCompositeOperation = "source-over";
    // 時空裂縫（閃爍的鋸齒線）
    const flick = 0.55 + 0.45 * Math.sin(T * 7) * Math.sin(T * 2.3);
    ctx.beginPath(); ctx.moveTo(wx + 22, wy + 4);
    [[34, 18], [28, 30], [44, 44], [36, 58], [50, 74]].forEach(([x, y]) => ctx.lineTo(wx + x + Math.sin(T * 5 + y) * 1.5, wy + y));
    ctx.strokeStyle = `rgba(255,255,255,${flick})`; ctx.lineWidth = 2; ctx.shadowColor = "#ff4fd8"; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0;
    // 漂浮的碎片（別的時空的殘骸）
    for (let i = 0; i < 4; i++) {
      const fx = wx + ((i * 61 + T * (10 + i * 4)) % (ww + 20)) - 10, fy = wy + 12 + i * 17 + Math.sin(T + i) * 4;
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(T * (0.6 + i * 0.3) + i);
      ctx.fillStyle = `hsla(${(h0 + 90 * i) % 360},40%,70%,.75)`;
      ctx.beginPath(); ctx.moveTo(-5, -3); ctx.lineTo(4, -5); ctx.lineTo(6, 3); ctx.lineTo(-3, 5); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    ctx.lineWidth = 6; ctx.strokeStyle = "#7a5230"; ctx.strokeRect(wx, wy, ww, wh);
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2); ctx.stroke();
    ctx.fillStyle = "#7a1f2b"; ctx.fillRect(wx - 18, wy - 6, 18, wh + 14); ctx.fillRect(wx + ww, wy - 6, 18, wh + 14);   // 窗簾

    // 懸掛電話
    rr(312, 22, 56, 74, 8); ctx.fillStyle = "#2b2b2e"; ctx.fill();
    ctx.beginPath(); ctx.arc(340, 64, 17, 0, Math.PI * 2); ctx.fillStyle = "#d9d2c3"; ctx.fill();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * 0.55; ctx.beginPath(); ctx.arc(340 + Math.cos(a) * 11, 64 + Math.sin(a) * 11, 2.6, 0, Math.PI * 2); ctx.fillStyle = "#2b2b2e"; ctx.fill(); }
    rr(316, 26, 48, 12, 6); ctx.fillStyle = "#121214"; ctx.fill();   // 話筒
    ctx.strokeStyle = "#121214"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(318, 34);
    for (let i = 0; i < 6; i++) ctx.quadraticCurveTo(306 - (i % 2) * 6, 44 + i * 9, 312, 48 + i * 9);
    ctx.stroke();

    // 時空委託欄（軟木板＋釘著的委託單）
    rr(430, 12, 210, 88, 6); ctx.fillStyle = "#6e4527"; ctx.fill();
    ctx.fillStyle = "#c79a5e"; ctx.fillRect(438, 20, 194, 72);
    const papers = [[452, 30, -0.08], [500, 26, 0.06], [552, 32, -0.04], [596, 28, 0.08], [470, 60, 0.05], [530, 62, -0.06], [586, 60, 0.03]];
    papers.forEach(([x, y, a], i) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.fillStyle = i === 3 ? "#f5d6d6" : "#fbf6e9"; ctx.fillRect(-14, 0, 30, 24);
      ctx.fillStyle = "rgba(90,58,34,.45)"; for (let k = 0; k < 3; k++) ctx.fillRect(-10, 6 + k * 5, 22 - k * 4, 1.5);
      ctx.beginPath(); ctx.arc(1, 2, 2.6, 0, Math.PI * 2); ctx.fillStyle = "#c62828"; ctx.fill();
      ctx.restore();
    });
    rr(486, 2, 98, 18, 4); ctx.fillStyle = "#3e2716"; ctx.fill();
    text("時空委託", 535, 11, "#f2d79a", 11, 900);

    // 適格者名牌架（靠牆的木架，掛著每位適格者的名牌）
    rr(RACK.x, RACK.y - 40, RACK.w, RACK.h + 40, 5); ctx.fillStyle = "#6e4527"; ctx.fill();
    ctx.fillStyle = "#3e2716"; ctx.fillRect(RACK.x + 6, RACK.y - 32, RACK.w - 12, 3); ctx.fillRect(RACK.x + 6, RACK.y - 6, RACK.w - 12, 3);
    const chars = featured().map((id) => R.CHARACTERS[id]);            // 只掛玩家精選的三位
    chars.forEach((c, i) => {
      const px = RACK.x + 10 + i * 21, py = RACK.y - 22;
      rr(px, py, 17, 20, 3); ctx.fillStyle = "#fffaf0"; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = c.color; ctx.stroke();
      text(c.letter || c.name[0], px + 8.5, py + 10.5, c.color, 10, 900);
    });
    text("適格者", RACK.x + RACK.w / 2, RACK.y + 22, "#f2d79a", 10, 900);

    // 吧檯後方的酒架
    rr(800, 14, W - SIDE - 810, 84, 6); ctx.fillStyle = "#4a2f1d"; ctx.fill();
    for (const sy of [44, 82]) { ctx.fillStyle = "#2e1c10"; ctx.fillRect(806, sy, W - SIDE - 822, 5); }
    const bottles = ["#2f6b3a", "#8a2d2d", "#c9a24a", "#3b5d8f", "#6b3f8f", "#d6d0c0", "#2f6b3a", "#b85a2a"];
    for (let i = 0; i < 26; i++) {
      const bx = 816 + i * 17, row = i % 2, by = row ? 82 : 44, h = 18 + ((i * 7) % 10);
      if (bx > W - SIDE - 24) break;
      ctx.fillStyle = bottles[i % bottles.length];
      rr(bx, by - h, 10, h, 3); ctx.fill(); ctx.fillRect(bx + 3, by - h - 6, 4, 7);
    }
  }
  function drawTelescope() {
    const { x, y } = TELESCOPE;
    ctx.strokeStyle = "#4a2f1d"; ctx.lineWidth = 4; ctx.lineCap = "round";
    for (const a of [2.0, 1.1, 0.2]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 30, y + Math.sin(a) * 30 + 6); ctx.stroke(); }
    ctx.save(); ctx.translate(x, y - 4); ctx.rotate(-2.3);
    rr(-10, -8, 62, 16, 6); ctx.fillStyle = "#c9a24a"; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "#7a5a1e"; ctx.stroke();
    ctx.fillStyle = "#7a5a1e"; ctx.fillRect(40, -10, 8, 20);
    ctx.restore();
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fillStyle = "#3e2716"; ctx.fill();
  }
  // ===== 名牌架：玩家精選三位掛出來（存在 rpg.rackShow；沒選過就掛前三位） =====
  const RACK_MAX = 3;
  function featured() {
    const owned = Object.values(R.CHARACTERS).filter((c) => !c.hidden && P.owns(c.id)).map((c) => c.id);
    let pick = null;
    try { pick = JSON.parse(store.get("rpg.rackShow") || "null"); } catch (e) { pick = null; }
    pick = Array.isArray(pick) ? pick.filter((id) => owned.includes(id)).slice(0, RACK_MAX) : null;
    return pick && pick.length ? pick : owned.slice(0, RACK_MAX);
  }
  let rackMsg = "";

  // ===== 吧檯上的收音機：平常播爵士樂，可以貼 YouTube 連結換成想聽的音樂 =====
  const RADIO = { x: 1226, y: 178 };
  const radio = (() => { try { return JSON.parse(store.get("rpg.radio") || "null") || { on: true, yt: null }; } catch (e) { return { on: true, yt: null }; } })();
  const saveRadio = () => store.set("rpg.radio", JSON.stringify(radio));
  const jazz = new Audio("sounds/tavern-jazz.mp3");
  jazz.loop = true; jazz.volume = 0.35;
  let radioMsg = "", gestured = false;
  // 從各種 YouTube 網址取出影片 id（watch?v=、youtu.be/、shorts/、embed/、live/）
  function ytId(url) {
    const m = String(url || "").trim().match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/|music\.youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/);
    return m ? m[1] : (/^[\w-]{11}$/.test(String(url || "").trim()) ? String(url).trim() : null);
  }
  // YouTube 播放器：右下角的小視窗（YouTube 規定播放器要看得到；可以收起成一條）
  function ytBox() {
    let box = document.getElementById("radioYt");
    if (!box) {
      box = document.createElement("div"); box.id = "radioYt"; box.className = "radio-yt";
      box.innerHTML = `<div class="radio-yt-bar"><span>📻 收音機・YouTube</span><button type="button" data-yt="fold" aria-label="收起或展開">▁</button><button type="button" data-yt="off" aria-label="關掉">✕</button></div><div class="radio-yt-frame"></div>`;
      box.addEventListener("click", (e) => {
        const k = e.target.closest("[data-yt]")?.dataset.yt;
        if (k === "fold") box.classList.toggle("folded");
        if (k === "off") { radio.on = false; saveRadio(); applyRadio(); if (panelId === "radio") renderPanel(); }
      });
      document.body.appendChild(box);
    }
    return box;
  }
  function applyRadio() {
    const id = radio.on && radio.yt ? ytId(radio.yt) : null;
    const box = document.getElementById("radioYt");
    if (id) {
      jazz.pause();
      const b = ytBox(), fr = b.querySelector(".radio-yt-frame");
      if (fr.dataset.id !== id) {
        fr.dataset.id = id;
        fr.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1&loop=1&playlist=${id}&rel=0" title="收音機（YouTube）" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
      }
      b.classList.remove("hidden");
      return;
    }
    if (box) { box.classList.add("hidden"); const fr = box.querySelector(".radio-yt-frame"); fr.innerHTML = ""; fr.dataset.id = ""; }
    if (radio.on && gestured) jazz.play().catch(() => {});
    else jazz.pause();
  }
  // 瀏覽器要等玩家先點一下才能放聲音
  const firstGesture = () => { if (gestured) return; gestured = true; applyRadio(); };
  window.addEventListener("pointerdown", firstGesture, { once: false });
  window.addEventListener("keydown", firstGesture, { once: false });
  function drawRadio(now) {
    const { x, y } = RADIO, playing = radio.on && (gestured || radio.yt);
    rr(x - 24, y - 16, 48, 30, 6); ctx.fillStyle = "#8a2d2d"; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "#3e2716"; ctx.stroke();
    ctx.fillStyle = "#e8d6b0"; ctx.beginPath(); ctx.arc(x - 9, y - 1, 9, 0, Math.PI * 2); ctx.fill();          // 喇叭
    ctx.strokeStyle = "#8a6a4a"; ctx.lineWidth = 1; for (let k = 3; k <= 7; k += 2) { ctx.beginPath(); ctx.arc(x - 9, y - 1, k, 0, Math.PI * 2); ctx.stroke(); }
    rr(x + 3, y - 9, 16, 7, 2); ctx.fillStyle = playing ? "#f2d79a" : "#5a4632"; ctx.fill();                      // 刻度窗
    ctx.fillStyle = "#3e2716"; ctx.beginPath(); ctx.arc(x + 7, y + 7, 3, 0, Math.PI * 2); ctx.arc(x + 15, y + 7, 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#3e2716"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 14, y - 16); ctx.lineTo(x + 22, y - 32); ctx.stroke();   // 天線
    if (playing) for (let i = 0; i < 3; i++) {
      const k = ((now / 1600) + i / 3) % 1;
      ctx.globalAlpha = 1 - k; text(i % 2 ? "♪" : "♫", x - 14 + i * 12 + Math.sin(now / 300 + i) * 4, y - 22 - k * 30, "#f2d79a", 13, 900); ctx.globalAlpha = 1;
    }
  }

  function drawBar() {
    // 吧檯：深色木頭、檯面亮邊、幾個杯子
    ctx.fillStyle = "#5a3820"; ctx.fillRect(774, WALL, 16, BAR.y - WALL);
    rr(BAR.x, BAR.y, BAR.w, BAR.h, 6); ctx.fillStyle = "#6b4226"; ctx.fill();
    ctx.fillStyle = "#8a5a34"; ctx.fillRect(BAR.x + 4, BAR.y + 4, BAR.w - 8, 16);
    ctx.fillStyle = "rgba(255,230,190,.18)"; ctx.fillRect(BAR.x + 4, BAR.y + 4, BAR.w - 8, 3);
    for (const gx of [880, 1010, 1190]) { ctx.beginPath(); ctx.arc(gx, BAR.y + 12, 6, 0, Math.PI * 2); ctx.fillStyle = "rgba(220,240,255,.8)"; ctx.fill(); ctx.strokeStyle = "#9fb6c6"; ctx.lineWidth = 1.5; ctx.stroke(); }
    for (const s of STOOLS) {
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fillStyle = "#3e2716"; ctx.fill();
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r - 4, 0, Math.PI * 2); ctx.fillStyle = "#8a2d2d"; ctx.fill();
    }
  }
  function drawTable(t) {
    ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.rot); ctx.scale(0.82, 0.82);
    ctx.lineWidth = 4; ctx.strokeStyle = "#efdfa0"; ctx.fillStyle = "#b87a56";
    for (let k = 0; k < 4; k++) {
      ctx.save(); ctx.rotate((k * Math.PI) / 2);
      // 椅子：桌子四邊各一張長方形，左右稍微錯開（像參考圖）
      ctx.beginPath(); ctx.rect(-50 + (k % 2 ? 14 : -14), -98, 100, 30); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    rr(-58, -58, 116, 116, 22); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  // 桌上的魔物圖鑑
  function drawBook() {
    const t = TABLES[2];
    ctx.save(); ctx.translate(t.x, t.y - 6); ctx.rotate(-0.25);
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(-28, -18, 60, 44);
    ctx.fillStyle = "#5a2a1a"; rr(-32, -24, 62, 46, 4); ctx.fill();
    ctx.fillStyle = "#f3e6d0"; ctx.fillRect(-28, -20, 26, 38); ctx.fillRect(0, -20, 26, 38);
    ctx.fillStyle = "#5a2a1a"; ctx.fillRect(-2, -22, 4, 42);
    ctx.strokeStyle = "rgba(90,58,34,.5)"; ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-24, -12 + i * 8); ctx.lineTo(-6, -12 + i * 8); ctx.moveTo(4, -12 + i * 8); ctx.lineTo(22, -12 + i * 8); ctx.stroke(); }
    ctx.fillStyle = "#7a3fb0"; ctx.beginPath(); ctx.arc(-15, 10, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawNpc(now) {
    const { x, y } = BARTENDER, s = 36;
    const bob = Math.sin(now / 700) * 1.5;
    rr(x - s / 2, y - s / 2 + bob, s, s, 7); ctx.fillStyle = "#fff"; ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = "#2f6f6a"; ctx.stroke();
    text("桑", x, y + bob + 1, "#2f6f6a", 16, 900);
    text("酒保 桑恩", x, y - 30, "#f3e6d0", 12, 700);
  }
  function drawMe() {
    const s = me.half * 2;
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(me.x, me.y + me.half + 3, me.half, 5, 0, 0, Math.PI * 2); ctx.fill();
    // 選好適格者後變成那位適格者的方塊（名字保留）
    const ch = curChar();
    rr(me.x - me.half, me.y - me.half, s, s, 7); ctx.fillStyle = "#fffaf0"; ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = picked() ? ch.color : "#1d1d1f"; ctx.stroke();
    if (picked()) text(ch.name[0], me.x, me.y + 1, ch.color, 16, 900);
    const name = P.get()?.name || "";
    if (!name) return;
    ctx.font = '700 13px "Noto Sans TC", sans-serif';
    const w = ctx.measureText(name).width + 14;
    rr(me.x - w / 2, me.y - me.half - 28, w, 20, 10); ctx.fillStyle = "rgba(29,29,31,.75)"; ctx.fill();
    text(name, me.x, me.y - me.half - 18, "#fff", 13, 700);
  }
  // 互動提示：顯示在玩家名字上方，並把物件框起來
  function drawPrompt(t, now) {
    const b = t.box;
    rr(b.x - 3, b.y - 3, b.w + 6, b.h + 6, 8); ctx.lineWidth = 2.5; ctx.strokeStyle = "rgba(242,215,154,.95)"; ctx.stroke();
    const msg = `E　${t.label}`;
    ctx.font = '700 13px "Noto Sans TC", sans-serif';
    const w = ctx.measureText(msg).width + 20, x = me.x;
    const ty = me.y - me.half - 46 + Math.sin(now / 250) * 2;
    rr(x - w / 2, ty - 12, w, 24, 12); ctx.fillStyle = "#fffaf0"; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "#d9b45a"; ctx.stroke();
    text(msg, x, ty, "#5a3a22", 13, 700);
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - (frame.last || now)) / 1000);
    frame.last = now;
    try {
      update(dt);
      ctx.clearRect(0, 0, W, H);
      drawFloor();
      drawWalls(now);
      drawTelescope();
      for (const t of TABLES) drawTable(t);
      drawBook();
      drawNpc(now);
      drawBar();
      drawRadio(now);
      if (hover && hover !== near) { const b = hover.box; rr(b.x - 3, b.y - 3, b.w + 6, b.h + 6, 8); ctx.lineWidth = 2; ctx.strokeStyle = "rgba(242,215,154,.7)"; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]); }
      if (me.target) { ctx.beginPath(); ctx.arc(me.target.x, me.target.y, 6 + Math.sin(now / 120) * 2, 0, Math.PI * 2); ctx.strokeStyle = "rgba(255,250,240,.8)"; ctx.lineWidth = 2; ctx.stroke(); }
      drawMe();
      if (near && !panelOpen) drawPrompt(near, now);
    } catch (e) { showError(e); return; }
    requestAnimationFrame(frame);
  }

  // ===== 輸入 =====
  function canvasPoint(e) {
    const r = cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }
  cv.addEventListener("mousemove", (e) => {
    const p = canvasPoint(e);
    hover = THINGS.find((t) => inBox(t.box, p)) || null;
  });
  cv.addEventListener("mouseleave", () => { hover = null; });
  cv.addEventListener("click", (e) => {
    if (panelOpen) return;
    const p = canvasPoint(e);
    const t = THINGS.find((x) => inBox(x.box, p));
    if (t) {
      if (dist(me.x, me.y, t.at.x, t.at.y) < 90) return open(t.id);
      me.target = { ...t.at }; me.then = t;            // 先走過去再互動
      return;
    }
    me.target = p; me.then = null;
  });
  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    const k = e.key.toLowerCase();
    if (k === "escape") { if (panelOpen) closePanel(); return; }
    if (panelOpen) return;
    if ((k === "e" || k === "enter" || k === " ") && near) { e.preventDefault(); open(near.id); return; }
  });
  window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener("blur", () => keys.clear());

  // ===== 面板 =====
  const panel = $("#tvPanel");
  let panelId = null, mixState = null, myCode = null, dialed = "", bxTab = null;
  function open(id) {
    panelId = id; panelOpen = true; keys.clear(); me.target = null;
    panel.classList.remove("hidden");
    if (id === "bartender") mixState = null;
    renderPanel();
    panel.querySelector("[data-close]").focus();
  }
  function closePanel() { panel.classList.add("hidden"); panelOpen = false; panelId = null; renderTop(); }
  panel.addEventListener("click", (e) => {
    if (e.target === panel || e.target.closest("[data-close]")) return closePanel();
    const b = e.target.closest("[data-act]");
    if (!b || b.disabled) return;
    act(b.dataset.act, b.dataset);
  });

  // 問桑恩的問題
  const TALK = {
    place: "這裡是夾在各個時空縫隙之間的異次元空間——一間能通往所有時空的酒館。來自不同時空的委託會被送到這裡，而我們負責把它們完成。窗外那片亂七八糟的顏色？那就是時空亂流，別盯著看太久。",
    chosen: "說好聽點是「適格者」，實際上都是被捲進時空亂流的受害者罷了。畢竟能在亂流裡苟活到被那支望遠鏡找到的，也只有對時空穿梭有耐性的人。",
    who: "我？很久以前也是個適格者。後來發現回不去了，就乾脆在這裡安頓下來。現在嘛，也只是個老酒保罷了。",
  };
  const LINES = [
    "每個適格者來自不同的時空，酒的口味也都不一樣。你喜歡哪一種？",
    "那支電話？撥對號碼的話，會接到其他時空的旅人。",
    "窗邊的望遠鏡看得到其他時空——偶爾會看到新的適格者。",
    "委託欄上的單子都是時空裂縫的修補工作，報酬可以拿來換我的特調。",
    "吧檯另一頭的位置？之後會有人來的，我先幫他留著。",
  ];

  function renderPanel() {
    const title = $("#tvPanelTitle"), body = $("#tvPanelBody");
    const name = esc(P.get()?.name || "旅人");
    if (panelId === "bartender") {
      title.textContent = "酒保 桑恩";
      if (!mixState) {
        const d = P.drink();
        body.innerHTML = `
          <div class="tv-npc"><span class="face">桑</span><p>${mixState === null && panel.dataset.chat ? esc(panel.dataset.chat) : `歡迎，${name}。要來杯特調嗎？加進去的調料，會在你下一次接委託時派上用場。`}</p></div>
          ${d ? `<p class="tv-note">你手上那杯：${esc(d.base)}特調（${d.adds.length} 份調料）→ 下一次進入委託時 ${esc(P.bonusText(d))}</p>` : ""}
          <div class="tv-row" style="margin-top:12px">
            <button type="button" class="primary" data-act="mix">來杯特調</button>
            <button type="button" class="ghost" data-act="ask" data-q="place">這間酒館是什麼地方？</button>
            <button type="button" class="ghost" data-act="ask" data-q="chosen">適格者是什麼？</button>
            <button type="button" class="ghost" data-act="ask" data-q="who">你是誰？</button>
            <button type="button" class="ghost" data-act="chat">隨便聊聊</button>
            ${meatCount() ? `<button type="button" class="primary" data-act="roast">請桑恩烤魔狼肉（×${meatCount()}）</button>` : ""}
            ${meatCount("blockFish") ? `<button type="button" class="primary" data-act="roast" data-id="blockFish">請桑恩烤方塊魚（×${meatCount("blockFish")}）</button>` : ""}
          </div>
          <p class="tv-note">時空幣：${P.coins()}（完成委託可以獲得）</p>`;
        return;
      }
      body.innerHTML = mixHtml();
      return;
    }
    if (panelId === "board") {
      title.textContent = "時空委託欄";
      const tabs = `<div class="tabs" role="tablist">
        <button type="button" role="tab" class="tab${boardTab === "time" ? " on" : ""}" aria-selected="${boardTab === "time"}" data-act="tab" data-t="time">時空委託</button>
        <button type="button" role="tab" class="tab${boardTab === "test" ? " on" : ""}" aria-selected="${boardTab === "test"}" data-act="tab" data-t="test">戰鬥測試</button></div>`;
      if (boardTab === "test") {
        body.innerHTML = tabs + `<p class="tv-note" style="margin:0 0 10px">直接進入戰鬥測試（不經過時空）。出發的適格者：<b>${esc(curChar().name)}</b></p><div class="quests">${questsHtml()}</div>`;
        return;
      }
      body.innerHTML = tabs + slipsHtml();
      return;
    }
    if (panelId === "door") {
      title.textContent = "出入口";
      const t = P.trip(), CM = R.Commissions;
      if (!t.accepted.length) {
        body.innerHTML = `<div class="tv-npc"><span class="face">桑</span><p>門外是時空亂流。沒有委託在身就走出去，可是會迷路的——先到委託欄接下委託吧。</p></div>
          <div class="tv-row"><button type="button" class="primary" data-act="toBoard">去看委託欄</button></div>`;
        return;
      }
      const W = CM.WORLDS[CM.get(t.accepted[0]).world], dep = CM.canDepart(t.accepted), adv = R.Adventure.get();
      body.innerHTML = `<div class="tv-npc"><span class="face">桑</span><p>${dep.ok ? "要出發了？記住，接下的委託全部完成之前，門是不會帶你回來的。" : "額外的委託只是順便做的。再接一張正經的委託吧。"}</p></div>
        <div class="depart" style="--wc:${W.color}">
          <div class="dh"><b>${W.code}</b> ${esc(W.name)}<span class="muted">${esc(W.level)}</span></div>
          <p>${esc(W.summary)}</p>
          <ul>${t.accepted.map((id) => `<li>${esc(CM.get(id).title)}<span class="muted">・${esc(CM.get(id).client)}</span></li>`).join("")}</ul>
          <p class="tv-note">適格者：<b>${esc(curChar().name)}</b>${P.drink() ? `・特調：${esc(P.bonusText(P.drink()))}` : ""}${adv ? `・帶著金幣 ${adv.gold}、行囊 ${adv.items.length} 格` : ""}</p>
        </div>
        <div class="tv-row" style="margin-top:12px">
          <button type="button" class="primary" data-act="depart" ${dep.ok ? "" : `disabled title="${esc(dep.why)}"`}>出發前往 ${W.code} ${esc(W.name)}</button>
          <button type="button" class="ghost" data-act="toBoard">再看看委託</button>
        </div>`;
      return;
    }
    if (panelId === "rack") {
      title.textContent = "適格者名牌架";
      const cur = curChar().id, all = Object.values(R.CHARACTERS).filter((c) => !c.hidden);
      const peekC = R.CHARACTERS[peek] || curChar();
      body.innerHTML = `<p class="tv-note" style="margin:0 0 10px">選擇要出發的適格者。每一位都來自不同的時空。</p>
        <div class="plates">${all.map((c) => {
          const lv = R.Progress ? R.Progress.forBattle(c).level : 1;
          if (!P.owns(c.id)) return `<button type="button" class="plate locked" style="--c:${c.color}" data-act="peek" data-id="${c.id}">
            <span class="pn"><span>${esc(c.letter || c.name[0])}</span>${esc(c.name)}</span>
            <small>尚未觀測到・用天文望遠鏡觀測</small></button>`;
          return `<button type="button" class="plate${c.id === cur ? " sel" : ""}" style="--c:${c.color}" data-act="pick" data-id="${c.id}" aria-pressed="${c.id === cur}">
            <span class="pn"><span>${esc(c.letter || c.name[0])}</span>${esc(c.name)}</span>
            <small>Lv ${lv}・${esc(c.passive ? "被動：" + c.passive.name : c.role || "")}</small>
            <small>生命 ${c.stats.hp}・攻擊 ${c.stats.atk}・防禦 ${c.stats.df}・速度 ${c.stats.spd}</small>
          </button>`;
        }).join("")}</div>
        <div class="rack-show"><b>掛在名牌架上的名牌</b><span class="muted">（最多 ${RACK_MAX} 位，點一下掛上或取下）</span>
          <div class="rack-chips">${all.filter((c) => P.owns(c.id)).map((c) => { const on = featured().includes(c.id); return `<button type="button" class="rack-chip${on ? " on" : ""}" style="--c:${c.color}" data-act="feature" data-id="${c.id}" aria-pressed="${on}"><span>${esc(c.letter || c.name[0])}</span>${esc(c.name)}</button>`; }).join("")}</div>
          ${rackMsg ? `<p class="tv-note" style="margin:6px 0 0">${esc(rackMsg)}</p>` : ""}</div>
        ${peekC?.profile ? `<div class="plate-profile" style="--c:${peekC.color}"><b>${esc(peekC.name)}</b>${P.owns(peekC.id) ? "" : '<span class="muted">・尚未觀測到</span>'}<p>${esc(peekC.profile)}</p></div>` : ""}
        <p class="tv-note">冒險中的等級、技能強化與寶物只屬於這輪冒險，冒險結束就重新開始。在戰鬥中的「角色成長」調整。</p>`;
      return;
    }
    if (panelId === "radio") {
      title.textContent = "收音機";
      const id = radio.yt ? ytId(radio.yt) : null;
      const now = !radio.on ? "關掉了" : id ? "YouTube" : "爵士樂（酒館平常放的）";
      body.innerHTML = `<p class="tv-note" style="margin:0 0 10px">吧檯上的老收音機。平常放爵士樂；貼上 YouTube 連結，就能換成你想聽的音樂。</p>
        <p style="margin:0 0 12px"><b>正在播放：</b>${now}${!gestured && radio.on && !id ? '<span class="muted">（點一下畫面就會開始播放）</span>' : ""}</p>
        <div class="tv-row" style="gap:8px;flex-wrap:wrap">
          <button type="button" class="${radio.on && !id ? "primary" : "ghost"}" data-act="radioJazz">播放爵士樂</button>
          <button type="button" class="ghost" data-act="radioOff" ${radio.on ? "" : "disabled"}>關掉收音機</button>
        </div>
        <label class="radio-url"><span>YouTube 連結</span>
          <input type="url" id="radioUrl" placeholder="https://www.youtube.com/watch?v=…" value="${esc(radio.yt || "")}" autocomplete="off"></label>
        <div class="tv-row" style="margin-top:8px"><button type="button" class="primary" data-act="radioYt">播放這個連結</button></div>
        ${radioMsg ? `<p class="tv-note" style="margin:8px 0 0">${esc(radioMsg)}</p>` : ""}
        <p class="tv-note">YouTube 的音樂會在右下角的小視窗播放（可以收起）。換到其他頁面（例如出發去時空）時音樂會停。</p>`;
      return;
    }
    if (panelId === "phone") {
      title.textContent = "懸掛電話";
      body.innerHTML = `<div class="phone">
          <section><h3>產生訊號</h3>
            <div class="code">${myCode || "------"}</div>
            <button type="button" class="primary" data-act="signal">${myCode ? "重新產生" : "產生訊號"}</button>
            <p class="status">${myCode ? "把這組房號告訴朋友，對方撥打就能加入（多人遊戲尚未開放）" : "產生一組房號，建立多人房間"}</p>
          </section>
          <section><h3>撥打號碼</h3>
            <div class="dial" aria-live="polite">${dialed || "&nbsp;"}</div>
            <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button type="button" class="ghost" data-act="digit" data-n="${n}">${n}</button>`).join("")}
              <button type="button" class="ghost" data-act="back" aria-label="刪除">⌫</button>
              <button type="button" class="ghost" data-act="digit" data-n="0">0</button>
              <button type="button" class="primary" data-act="call">撥打</button></div>
            <p class="status" id="callStatus">輸入 6 位數房號</p>
          </section>
        </div>`;
      return;
    }
    if (panelId === "bestiary") {
      title.textContent = "魔物圖鑑";
      const r = R.Bestiary.html(bxTab, esc);
      bxTab = r.tab;
      body.innerHTML = r.html;
      body.querySelectorAll("canvas[data-k]").forEach((cv) => R.Bestiary.thumb(cv));
      return;
    }
    if (panelId === "telescope") {
      title.textContent = "天文望遠鏡";
      const G = P.GACHA, pool = P.pool(), coins = P.coins(), sh = P.shards();
      const rates = P.charRates(lensTarget);
      const tierName = (id) => G.tiers.find((t) => t.id === id);
      const pullHtml = lastPull ? `<div class="pull-res">${lastPull.map((r) => r.kind === "char"
          ? `<div class="pr char" style="--c:${R.CHARACTERS[r.id].color}"><b>${esc(R.CHARACTERS[r.id].letter || R.CHARACTERS[r.id].name[0])}</b><span>適格者<br>${esc(R.CHARACTERS[r.id].name)}</span></div>`
          : `<div class="pr" style="--c:${tierName(r.tier).color}"><b>${r.n}</b><span>${tierName(r.tier).name}<br>時空碎片</span></div>`).join("")}</div>` : "";
      body.innerHTML = `<div class="tv-npc"><span class="face" style="border-color:#c9a24a;color:#7a5a1e">望</span>
        <p>鏡頭裡是一片陌生的星空。光點忽明忽暗——那是其他時空的適格者。</p></div>
        <div class="gacha-top"><span>時空幣 <b>${coins}</b></span><span>時空碎片 <b>${sh}</b></span></div>
        ${pool.length ? `<p class="tv-note" style="margin:8px 0 6px">定向觀測：先選一位適格者，抽到他的機率翻倍（${(G.charRate * 200).toFixed(1)}%）。不選的話，${(G.charRate * 100).toFixed(1)}% 平均分給下面的適格者。</p>
        <div class="lens-pool">${pool.map((c) => `<button type="button" class="lens-c${lensTarget === c.id ? " on" : ""}" style="--c:${c.color}" data-act="aimLens" data-id="${c.id}" aria-pressed="${lensTarget === c.id}">
            <span class="li">${esc(c.letter || c.name[0])}</span><b>${esc(c.name)}</b><small>${esc(c.profile || c.desc)}</small>
            <em>${((rates.find((x) => x.id === c.id)?.rate || 0) * 100).toFixed(2)}%</em></button>`).join("")}</div>`
        : `<p class="tv-note" style="margin:8px 0">目前觀測得到的適格者都已經在名牌架上了，觀測只會得到時空碎片。</p>`}
        <p class="tv-note">每次觀測：${G.tiers.map((t) => `<span style="color:${t.color};font-weight:800">${t.name}</span> ${t.min}～${t.max} 個時空碎片`).join("、")}，或是適格者。</p>
        <div class="tv-row" style="margin-top:10px">
          <button type="button" class="primary" data-act="observe" data-n="1" ${coins < G.single ? "disabled" : ""}>觀測 1 次（${G.single} 時空幣）</button>
          <button type="button" class="primary" data-act="observe" data-n="10" ${coins < G.ten ? "disabled" : ""}>觀測 10 次（${G.ten} 時空幣）</button>
          <button type="button" class="ghost" data-act="coins5k">（測試）+5000 時空幣</button>
        </div>
        ${Object.values(R.CHARACTERS).some((c) => c.gacha && P.owned().includes(c.id)) ? `<div class="tv-row" style="margin-top:8px;align-items:center"><span class="tv-note" style="margin:0">（測試）把抽到的角色還回去：</span>
          ${Object.values(R.CHARACTERS).filter((c) => c.gacha && P.owned().includes(c.id)).map((c) => `<button type="button" class="ghost small" data-act="disown" data-id="${c.id}">歸還 ${esc(c.name)}</button>`).join("")}</div>` : ""}
        ${gachaMsg ? `<p class="tv-note" style="color:#c0392b">${esc(gachaMsg)}</p>` : ""}
        ${pullHtml}
        ${pool.length ? `<div class="tv-row" style="margin-top:10px;align-items:center"><span class="tv-note" style="margin:0">兌換：${G.exchange} 個時空碎片換一位適格者</span>
          ${pool.map((c) => `<button type="button" class="ghost" data-act="exchange" data-id="${c.id}" ${sh < G.exchange ? "disabled" : ""}>兌換 ${esc(c.name)}</button>`).join("")}</div>` : ""}`;
    }
  }

  // ----- 特調 -----
  function mixHtml() {
    const s = mixState, ING = P.INGREDIENTS, cost = s.adds.length * P.PRICE, coins = P.coins(), full = s.adds.length >= P.MAX_ADDS;
    const d = { adds: s.adds };
    const layers = s.adds.map((id, i) => {
      const g = ING.find((x) => x.id === id), h = 26, y = 158 - (i + 1) * h;
      return `<rect x="34" y="${y}" width="82" height="${h}" fill="${g.color}" opacity=".85"/>`;
    }).join("");
    const glass = `<svg viewBox="0 0 150 190" aria-hidden="true">
        <defs><clipPath id="cup"><path d="M30 20 L120 20 L112 160 Q75 172 38 160 Z"/></clipPath></defs>
        <g clip-path="url(#cup)"><rect x="0" y="0" width="150" height="190" fill="#f6efe0"/><rect x="0" y="140" width="150" height="40" fill="#e9d9b6"/>${layers}</g>
        <path d="M30 20 L120 20 L112 160 Q75 172 38 160 Z" fill="none" stroke="#8a6a3a" stroke-width="3"/>
        <rect x="64" y="168" width="22" height="14" fill="#8a6a3a"/></svg>`;
    return `<div class="tv-npc"><span class="face">桑</span><p>${s.done ? esc(s.done) : `今天的基底是<b>${esc(s.base)}</b>。調料最多五份，順序就是我加進去的順序。`}</p></div>
      <div class="mix">
        <div class="glass">${glass}<span class="base">基底：${esc(s.base)}（隨機）</span></div>
        <div>
          <div class="ings">${ING.map((g) => `<button type="button" class="ing" style="--ic:${g.color}" data-act="add" data-id="${g.id}" ${full || s.done ? "disabled" : ""}>
            <i></i><span><b>${g.name}</b><small>${g.label} +${g.amount}・${P.PRICE} 時空幣</small></span></button>`).join("")}</div>
          <div class="order">${s.adds.length ? s.adds.map((id, i) => { const g = ING.find((x) => x.id === id); return `<span style="--ic:${g.color}"><i></i>${i + 1}. ${g.name}</span>`; }).join("") : `<span class="empty">還沒有加調料</span>`}</div>
          <p class="bonus">下一次進入委託時：<b>${esc(P.bonusText(d))}</b></p>
          <p class="price${cost > coins ? " bad" : ""}">價格 ${cost} 時空幣（持有 ${coins}）</p>
          <div class="tv-row">
            ${s.done ? `<button type="button" class="primary" data-act="mixDone">謝謝</button>` : `
            <button type="button" class="primary" data-act="serve" ${!s.adds.length || cost > coins ? "disabled" : ""}>請調吧</button>
            <button type="button" class="ghost" data-act="undo" ${s.adds.length ? "" : "disabled"}>拿掉最後一份</button>
            <button type="button" class="ghost" data-act="reset" ${s.adds.length ? "" : "disabled"}>重來</button>`}
            <button type="button" class="ghost" data-act="coins">（測試）+100 時空幣</button>
          </div>
          ${P.drink() && !s.done ? `<p class="tv-note">你手上已經有一杯特調了，調新的會取代它。</p>` : ""}
        </div>
      </div>`;
  }

  // ----- 委託 -----
  function quests() {
    const C = R.CONFIG, list = [];
    for (const [id, r] of Object.entries(C.rooms)) {
      if (r.hidden) continue;
      if (r.variants) for (const [v, x] of Object.entries(r.variants)) list.push({ room: id, boss: v, name: x.name, desc: x.desc, level: x.level, xp: x.xp, coins: x.coins, trial: x.trial });
      else list.push({ room: id, name: r.name, desc: r.desc, xp: r.xp, coins: r.coins, tutorial: !!r.forceChar });
    }
    return list;
  }
  // 時空委託單
  let boardTab = "time", slipMsg = "", boardWorld = null;   // boardWorld：委託單依時空分類，目前看哪一個
  function slipsHtml() {
    const CM = R.Commissions, t = P.trip();
    const AD = R.Adventure, adv = AD.get(), L = AD.license(adv), rank = L.rank;
    const pct = L.next ? Math.min(100, ((L.lxp - L.from) / (L.need - L.from)) * 100) : 100;
    let html = `<div class="license">
        <div class="lic-card"><small>委託執照</small><b>${rank}</b></div>
        <div class="lic-body">
          <ol class="lic-ladder">${CM.RANKS.map((r) => `<li class="${r === rank ? "on" : CM.RANKS.indexOf(r) < CM.RANKS.indexOf(rank) ? "past" : ""}">${r}</li>`).join("")}</ol>
          <div class="lic-xp"><i style="width:${pct}%"></i><span>執照經驗 ${L.lxp}${L.next ? ` / ${L.need}（升到 ${L.next}）` : "（最高等級）"}</span></div>
          <p class="tv-note">${adv ? `冒險進行中：已去過 ${adv.cleared.length} 次時空、完成 ${adv.done.length} 張委託。金幣 ${adv.gold}、行囊 ${adv.items.length} 格會帶到下一次出發。` : "每輪冒險從 C 級執照開始。完成委託可以得到執照經驗，執照越高，能前往越危險、報酬越豐厚的時空。"}同一輪冒險完成過的委託不能再接。全員戰敗＝委託失敗，冒險結束。</p>
          ${adv && t.status === "plan" ? `<button type="button" class="ghost small" data-act="endAdv">結束這輪冒險</button>` : ""}
          <div class="tv-row" style="margin-top:6px;align-items:center;gap:4px"><span class="tv-note" style="margin:0">測試：調整執照</span>${CM.RANKS.map((r) => `<button type="button" class="ghost small" data-act="setRank" data-r="${r}" ${r === rank || t.status !== "plan" ? "disabled" : ""}>${r}</button>`).join("")}</div>
        </div>
      </div>
      <p class="tv-note" style="margin:0 0 10px">接下委託後從<b>出入口</b>出發，就會抵達委託所在的時空；接下的委託全部完成才能回來。同一個時空可以同時接多張委託，彼此衝突的不行。出發前都可以更改。</p>`;
    if (slipMsg) html += `<p class="tv-err" role="alert">${esc(slipMsg)}</p>`;
    // 委託牆：先看到各時空的直幅（編號、名稱、簡介），點了才進入那個時空的委託單
    if (!boardWorld || !CM.WORLDS[boardWorld]) {
      const tilt = [-1.6, 1.1, -0.8, 1.4, -1.2];
      html += `<div class="tv-row" style="margin:0 0 6px;align-items:center"><span class="tv-note" style="margin:0">委託牆一次只貼出 ${BOARD_N} 個時空。</span>
        <button type="button" class="ghost small" data-act="boardRefresh" ${t.status === "plan" ? "" : "disabled"}>刷新委託牆</button>
        ${rank !== "C" ? `<label class="tv-note" style="margin:0;display:flex;align-items:center;gap:4px"><input type="checkbox" data-act="hideLow" ${hideLow() ? "checked" : ""}>隱藏低於 ${rank} 級的時空</label>` : ""}</div>
        <p class="tv-note" style="margin:0 0 8px">委託牆只會貼出有 ${rank} 級執照接得到的委託的時空。</p>`;
      html += `<div class="banners">${boardWorlds().map((wid) => [wid, CM.WORLDS[wid]]).map(([wid, W], i) => {
        const n = CM.ofWorld(wid).length, mine = t.accepted.filter((x) => CM.get(x).world === wid).length;
        return `<button type="button" class="banner${W.ready === false ? " soon" : ""}" style="--wc:${W.color};--tilt:${tilt[i % tilt.length]}deg" data-act="wtab" data-w="${wid}" aria-label="${W.code} ${esc(W.name)}">
          <span class="pin" aria-hidden="true"></span>
          <b class="code">${W.code}</b>
          <strong>${esc(W.name)}</strong>
          <span class="meta"><i class="rk">${W.rank || "C"}</i>${esc(W.level)}</span>
          <span class="intro">${esc(W.summary)}</span>
          ${W.issues ? `<span class="issues">${W.issues.map((x) => `<i>${esc(x)}</i>`).join("")}</span>` : ""}
          <span class="foot">${n} 張委託${mine ? `・已接 ${mine} 張` : ""}${W.ready === false ? "・準備中" : ""}</span>
        </button>`;
      }).join("")}</div>`;
      return html;
    }
    html += `<div class="tv-row" style="margin:0 0 10px"><button type="button" class="ghost" data-act="wtab" data-w="">← 回到委託牆</button></div>`;
    for (const [wid, W] of Object.entries(CM.WORLDS).filter(([wid]) => wid === boardWorld)) {
      const rankOk = CM.rankOk(wid, rank), anyOk = CM.RANKS.indexOf(rank) >= CM.RANKS.indexOf(CM.minRank(wid));
      html += `<div class="world-h${anyOk ? "" : " locked"}" style="--wc:${W.color}"><i class="rk">${W.rank || "C"}</i><b>${W.code}</b> ${esc(W.name)}<span>${esc(W.level)}</span></div>
        <p class="tv-note" style="margin:0 0 8px">${esc(W.summary)}${rankOk ? "" : anyOk ? `<br><b>大部分委託需要 ${W.rank} 級委託執照；標著 C 級的委託現在就能接</b>` : `<br><b>需要 ${W.rank} 級以上的委託執照</b>`}${W.ready === false ? `<br><b>這個時空還在準備中：目前只有委託單，暫時無法接取</b>` : ""}</p><div class="slips">`;
      for (const c of CM.ofWorld(wid)) {
        const on = t.accepted.includes(c.id), cleared = adv?.done?.includes(c.id), failed = adv?.failed?.includes(c.id);
        const cOk = CM.rankOk(wid, rank, c), cRank = c.rank || W.rank || "C";
        const chk = on ? { ok: true } : !cOk ? { ok: false, why: `需要 ${cRank} 級委託執照` } : CM.canAccept(c.id, t.accepted, adv);
        const conf = (c.conflicts || []).map((x) => CM.get(x)?.title).filter(Boolean);
        html += `<article class="slip${on ? " taken" : ""}${c.shady ? " shady" : ""}${cleared ? " cleared" : ""}" style="--wc:${W.color}">
          <header><span class="stamp">${W.code}</span><span class="wn">${esc(W.name)}</span>${on ? '<span class="got">已接下</span>' : cleared ? `<span class="got done">本輪已完成${c.id === "CI00001-06" && adv?.flags?.blackfin ? (adv.flags.blackfin === "helped" ? "・替黑鰭辦過事" : "・漁網還給了老伯恩") : ""}</span>` : failed ? '<span class="got fail">本輪已失敗</span>' : ""}${c.extra ? '<span class="got extra">額外</span>' : ""}${c.wip ? '<span class="got wip">玩法設計中</span>' : ""}${c.rank && c.rank !== W.rank ? `<span class="got rk-c">${c.rank} 級委託</span>` : ""}</header>
          <h3>${esc(c.title)}</h3>
          <dl>
            <dt>委託人</dt><dd>${esc(c.client)}<small>${esc(c.clientNote || "")}</small></dd>
            <dt>委託內容</dt><dd>${esc(c.content)}</dd>
            <dt>報酬</dt><dd class="rw">${esc(CM.rewardText(c.reward))}${c.rewardNote ? `（${esc(c.rewardNote)}）` : ""}<small>分 ${CM.steps(c)} 個進度；失敗時照進度拿時空幣${c.extra ? "・額外委託不能單獨接取" : ""}</small></dd>
          </dl>
          <footer>
            <span class="tags">${(c.tags || []).map((x) => `<i>${esc(x)}</i>`).join("")}</span>
            ${on ? `<button type="button" class="ghost" data-act="drop" data-id="${c.id}">取消</button>`
              : `<button type="button" class="primary" data-act="accept" data-id="${c.id}" ${chk.ok ? "" : `disabled title="${esc(chk.why)}"`}>接下委託</button>`}
          </footer>
          ${conf.length ? `<p class="conf">不能和「${conf.map(esc).join("」「")}」同時接取</p>` : ""}
        </article>`;
      }
      html += `</div>`;
    }
    return html;
  }

  function questsHtml() {
    return quests().map((q, i) => `
      <div class="quest">
        <b>${esc(q.name)}${q.tutorial ? '<span class="tag tut">新手教學</span>' : ""}${q.trial ? '<span class="tag trial">試煉</span>' : ""}</b>
        <span class="meta">${esc(q.desc)}${q.level ? `・${esc(q.level)}` : ""}${q.xp ? `・經驗 ${q.xp}` : ""}${q.coins ? `・時空幣 ${q.coins}` : ""}</span>
        <button type="button" class="primary" data-act="go" data-i="${i}">${q.tutorial ? "重新教學" : "接取委託"}</button>
      </div>`).join("");
  }
  function go(q) {
    const c = R.CONFIG.rooms[q.room].forceChar || curChar().id;
    location.href = `battle.html?char=${encodeURIComponent(c)}&room=${encodeURIComponent(q.room)}${q.boss ? `&boss=${encodeURIComponent(q.boss)}` : ""}&from=tavern`;
  }

  // 冒險行囊裡的魔狼肉（出發前才能交給酒保）
  const meatCount = (id = "wolfMeat") => (R.Bag && P.trip().status !== "away" ? R.Bag.count(R.Adventure.get()?.items || [], id) : 0);
  let peek = null, lensTarget = null, gachaMsg = "", lastPull = null;
  // 委託牆一次只貼出 BOARD_N 個時空（存起來；已接委託的時空一定留著）。刷新＝重新抽
  const BOARD_N = 4;
  // 委託牆能貼哪些時空：只貼「有目前執照接得到的委託」的時空（不會刷到更高等級的）；
  // 執照升級後可以選擇「隱藏低於執照等級的時空」（只貼有同等級委託的時空）
  const hideLow = () => store.get("rpg.hideLow") === "1";
  function boardEligible(wid, rank) {
    const CM = R.Commissions, RK = CM.RANKS, ri = RK.indexOf(rank);
    const ranks = CM.ofWorld(wid).map((c) => RK.indexOf(c.rank || CM.WORLDS[wid].rank || "C"));
    if (!ranks.length) return false;
    if (Math.min(...ranks) > ri) return false;                 // 全部都比執照高：接不到
    if (hideLow() && ri > 0 && !ranks.includes(ri)) return false;   // 隱藏低於執照等級的時空
    return true;
  }
  function boardWorlds(refresh) {
    const CM = R.Commissions, t = P.trip(), rank = R.Adventure.license(R.Adventure.get()).rank;
    const all = Object.keys(CM.WORLDS).filter((w) => boardEligible(w, rank));
    const keep = [...new Set((t.accepted || []).map((id) => CM.get(id)?.world).filter(Boolean))];
    let cur = [];
    try { cur = (JSON.parse(store.get("rpg.board")) || []).filter((w) => CM.WORLDS[w] && all.includes(w)); } catch (e) { cur = []; }
    if (refresh || cur.length < Math.min(BOARD_N, all.length)) {
      const rest = all.filter((w) => !keep.includes(w)).sort(() => Math.random() - 0.5);
      cur = [...keep, ...rest].slice(0, Math.max(BOARD_N, keep.length));
      store.set("rpg.board", JSON.stringify(cur));
    }
    for (const w of keep) if (!cur.includes(w)) cur.push(w);
    return cur;
  }
  // 有沒有在名牌架選過適格者（沒選過的新玩家是只有名字的方塊）
  const picked = () => !!store.get("rpg.char");
  if (R.Progress) R.Progress.useAdventure = true;            // 名牌架顯示這輪冒險的等級
  function curChar() {
    const id = store.get("rpg.char");
    const list = Object.values(R.CHARACTERS).filter((c) => !c.hidden && P.owns(c.id));
    return list.find((c) => c.id === id) || list[0];
  }

  function act(a, data) {
    if (a === "bxTab") { bxTab = data.w; return renderPanel(); }
    if (a === "ask") { panel.dataset.chat = TALK[data.q]; renderPanel(); delete panel.dataset.chat; return; }
    if (a === "chat") { panel.dataset.chat = LINES[Math.floor(Math.random() * LINES.length)]; renderPanel(); delete panel.dataset.chat; return; }
    if (a === "roast") {
      // 冒險行囊裡的魔狼肉 → 烤魔狼肉；方塊魚 → 烤方塊魚
      const adv = R.Adventure.get();
      if (!adv) return;
      const fish = data.id === "blockFish", raw = fish ? "blockFish" : "wolfMeat", done = fish ? "grilledBlockFish" : "roastMeat";
      const n = R.Bag.count(adv.items, raw);
      R.Bag.remove(adv.items, raw, n);
      const k = R.Bag.add(adv.items, done, n);
      if (k < n) R.Bag.add(adv.items, raw, n - k);
      R.Adventure.save(adv);
      panel.dataset.chat = !k ? "你的行囊塞不下了，先整理一下吧。"
        : fish ? `方塊魚？……第一次烤這種東西。翻面的時候要對齊格線，不然會烤成梯形。好了，${k} 條烤方塊魚，烤痕是正正方方的格子。${k < n ? "（行囊滿了，剩下的魚先還你）" : ""}`
        : `烤好了，${k} 塊烤魔狼肉。外皮烤得酥一點，路上餓了就拿出來吃吧。${k < n ? "（行囊滿了，剩下的肉先還你）" : ""}`;
      renderPanel(); delete panel.dataset.chat; return;
    }
    if (a === "mix") { mixState = { base: P.BASES[Math.floor(Math.random() * P.BASES.length)], adds: [] }; return renderPanel(); }
    if (a === "add") { if (mixState.adds.length < P.MAX_ADDS) mixState.adds.push(data.id); return renderPanel(); }
    if (a === "undo") { mixState.adds.pop(); return renderPanel(); }
    if (a === "reset") { mixState.adds = []; return renderPanel(); }
    if (a === "coins") { P.addCoins(100); renderTop(); return renderPanel(); }
    if (a === "serve") {
      const cost = mixState.adds.length * P.PRICE;
      if (cost > P.coins()) return;
      P.addCoins(-cost);
      const d = { base: mixState.base, adds: mixState.adds.slice() };
      P.setDrink(d);
      mixState.done = `好了，一杯${mixState.base}特調。喝下去之後，下一次接委託時 ${P.bonusText(d)}。`;
      renderTop();
      return renderPanel();
    }
    if (a === "mixDone") { mixState = null; return renderPanel(); }
    if (a === "go") return go(quests()[Number(data.i)]);
    if (a === "tab") { boardTab = data.t; return renderPanel(); }
    if (a === "setRank") { R.Adventure.setRank(data.r); boardWorlds(true); boardWorld = null; slipMsg = ""; renderTop(); return renderPanel(); }
    if (a === "hideLow") { store.set("rpg.hideLow", hideLow() ? "0" : "1"); boardWorlds(true); boardWorld = null; return renderPanel(); }
    if (a === "boardRefresh") { boardWorlds(true); boardWorld = null; slipMsg = ""; return renderPanel(); }
    if (a === "wtab") { boardWorld = data.w || null; slipMsg = ""; return renderPanel(); }
    if (a === "endAdv") { R.Adventure.end(); slipMsg = ""; renderTop(); return renderPanel(); }
    if (a === "accept" || a === "drop") {
      const t = P.trip();
      if (a === "accept") { const ok = R.Commissions.canAccept(data.id, t.accepted); if (!ok.ok) { slipMsg = ok.why; return renderPanel(); } t.accepted.push(data.id); }
      else t.accepted = t.accepted.filter((x) => x !== data.id);
      slipMsg = "";
      P.setTrip({ ...t, status: "plan" });
      renderTop();
      return renderPanel();
    }
    if (a === "toBoard") { panelId = "board"; boardTab = "time"; return renderPanel(); }
    if (a === "depart") {
      // 走出酒館＝開始一輪冒險：生命、金幣、道具欄（20 格）都從這裡開始；特調在這時候喝下
      const t = P.trip();
      if (!R.Commissions.canDepart(t.accepted).ok) return renderPanel();
      const adv = R.Adventure.start();        // 這輪冒險的第一次出發：執照從 C 開始
      // 金幣和行囊跟著這輪冒險；生命每次出發都是滿的
      const run = { hp: null, gold: adv.gold || 0, items: JSON.parse(JSON.stringify(adv.items || [])), defeated: [], picked: [], traps: [], pos: null, cd: {}, drink: P.takeDrink(), started: Date.now() };
      P.setTrip({ ...t, status: "away", done: [], progress: {}, qcount: {}, char: curChar().id, world: R.Commissions.get(t.accepted[0]).world, run });
      location.href = "world.html";
      return;
    }
    if (a === "pick") { if (!P.owns(data.id)) return; store.set("rpg.char", data.id); peek = data.id; renderTop(); return renderPanel(); }
    if (a === "peek") { peek = data.id; return renderPanel(); }
    if (a === "feature") {
      const cur = featured(), on = cur.includes(data.id);
      let next = on ? cur.filter((x) => x !== data.id) : [...cur, data.id];
      rackMsg = "";
      if (!on && cur.length >= RACK_MAX) { rackMsg = `名牌架最多掛 ${RACK_MAX} 位，先取下一位再掛上新的`; return renderPanel(); }
      if (!next.length) { rackMsg = "名牌架上至少要掛一位"; return renderPanel(); }
      store.set("rpg.rackShow", JSON.stringify(next));
      return renderPanel();
    }
    if (a === "radioJazz") { radio.on = true; radio.yt = null; radioMsg = ""; gestured = true; saveRadio(); applyRadio(); return renderPanel(); }
    if (a === "radioOff") { radio.on = false; radioMsg = ""; saveRadio(); applyRadio(); return renderPanel(); }
    if (a === "radioYt") {
      const url = $("#radioUrl")?.value || "";
      if (!ytId(url)) { radioMsg = "看不懂這個連結，請貼 YouTube 影片的網址（例如 https://www.youtube.com/watch?v=…）"; return renderPanel(); }
      radio.on = true; radio.yt = url.trim(); radioMsg = ""; gestured = true; saveRadio(); applyRadio(); return renderPanel();
    }
    // ----- 天文望遠鏡：觀測適格者 -----
    if (a === "aimLens") { lensTarget = lensTarget === data.id ? null : data.id; return renderPanel(); }
    if (a === "observe") {
      const n = Number(data.n), res = P.observe(n, lensTarget);
      if (!res.ok) { gachaMsg = res.why; return renderPanel(); }
      gachaMsg = "";
      if (lensTarget && P.owns(lensTarget)) lensTarget = null;
      renderTop();
      return R.GachaAnim.play(document.body, res.results, () => { lastPull = res.results; renderPanel(); });
    }
    if (a === "exchange") { const r = P.exchange(data.id); gachaMsg = r.ok ? `用 ${P.GACHA.exchange} 個時空碎片兌換了 ${R.CHARACTERS[data.id].name}！已經掛上名牌架` : r.why; if (r.ok && lensTarget === data.id) lensTarget = null; renderTop(); return renderPanel(); }
    if (a === "disown") { P.disown(data.id); gachaMsg = `（測試）${R.CHARACTERS[data.id].name} 已經還回去了，可以再觀測一次`; lastPull = null; renderTop(); return renderPanel(); }
    if (a === "coins5k") { P.addCoins(5000); renderTop(); return renderPanel(); }
    if (a === "signal") { myCode = String(Math.floor(100000 + Math.random() * 900000)); return renderPanel(); }
    if (a === "digit") { if (dialed.length < 6) dialed += data.n; return renderPanel(); }
    if (a === "back") { dialed = dialed.slice(0, -1); return renderPanel(); }
    if (a === "call") {
      renderPanel();
      const st = $("#callStatus");
      if (dialed.length !== 6) st.textContent = "房號是 6 位數";
      else if (dialed === myCode) st.textContent = "這是你自己的訊號";
      else st.textContent = `撥打 ${dialed}……沒有人接聽（多人遊戲尚未開放）`;
    }
  }

  // ===== 上方資訊 =====
  function renderTop() {
    const p = P.get();
    $("#tvName").textContent = p ? p.name : "未登入";
    $("#tvCoins").textContent = `時空幣 ${P.coins()}`;
    $("#tvRank").textContent = `執照 ${R.Adventure.rank()}${R.Adventure.get() ? "・冒險中" : ""}`;
    $("#tvChar").textContent = `適格者：${curChar().name}`;
    const t = P.trip(), CM = R.Commissions;
    $("#tvTrip").classList.toggle("hidden", !t.accepted.length);
    if (t.accepted.length) { const W = CM.WORLDS[CM.get(t.accepted[0]).world]; $("#tvTrip").textContent = `委託：${W.code} ${W.name} ×${t.accepted.length}`; }
    const d = P.drink();
    $("#tvDrink").classList.toggle("hidden", !d);
    if (d) $("#tvDrink").textContent = `特調：${P.bonusText(d)}`;
  }

  // ===== 登入、教學詢問 =====
  function startLogin() {
    $("#login").classList.remove("hidden");
    panelOpen = true;
  }
  $("#guestBtn").addEventListener("click", () => {
    $("#nameForm").classList.remove("hidden");
    $("#guestBtn").classList.add("hidden");
    $("#nameInput").focus();
  });
  $("#nameForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#nameInput").value.trim().replace(/\s+/g, " ");
    if (!name) { $("#nameErr").textContent = "請輸入名字"; return; }
    if ([...name].length > 12) { $("#nameErr").textContent = "名字最多 12 個字"; return; }
    P.login(name);
    $("#login").classList.add("hidden");
    renderTop();
    $("#askTutorial").classList.remove("hidden");
    $("#tutYes").focus();
  });
  $("#tutYes").addEventListener("click", () => { location.href = "battle.html?room=tutorial&from=tavern"; });
  $("#tutNo").addEventListener("click", () => { $("#askTutorial").classList.add("hidden"); panelOpen = false; });
  // 名字隨時可以改：點右上角的名字
  $("#tvName").addEventListener("click", () => {
    if (!P.get()) return;
    panelOpen = true;
    P.renameDialog($("#tvStage"), () => { panelOpen = false; renderTop(); });
  });
  $("#logoutBtn").addEventListener("click", () => {
    P.logout();
    $("#nameInput").value = ""; $("#nameErr").textContent = "";
    $("#nameForm").classList.add("hidden"); $("#guestBtn").classList.remove("hidden");
    renderTop();
    startLogin();
  });

  // ===== 縮放：整個畫面等比例放進視窗 =====
  function fit() {
    const app = $("#tv"), wrap = $("#fit");
    app.style.transform = "none";
    const s = Math.min(window.innerWidth / app.offsetWidth, window.innerHeight / app.offsetHeight);
    app.style.transform = `scale(${s})`;
    wrap.style.width = `${app.offsetWidth * s}px`;
    wrap.style.height = `${app.offsetHeight * s}px`;
  }
  window.addEventListener("resize", fit);
  fit();
  document.fonts?.ready.then(fit);

  renderTop();
  if (!P.get()) startLogin();
  else if (sessionStorage.getItem("rpg.lastReward")) {
    // 從時空回來：顯示報酬
    let r = null;
    try { r = JSON.parse(sessionStorage.getItem("rpg.lastReward")); sessionStorage.removeItem("rpg.lastReward"); } catch (e) { /* 忽略 */ }
    if (r) { panelId = "return"; panelOpen = true; panel.classList.remove("hidden");
      if (r.failed) {
        $("#tvPanelTitle").textContent = "冒險失敗";
        $("#tvPanelBody").innerHTML = `<div class="tv-npc"><span class="face">桑</span><p>……被時空亂流沖回來了啊。先坐下喝口水吧。</p></div>
          <p class="tv-note">在 ${esc(r.world)} 全員倒下，委託失敗。這輪冒險結束（完成了 ${r.cleared} 個時空、最高執照 ${esc(r.rank)}），下一輪從 C 級執照重新開始。</p>
          <ul class="ret-list">${(r.lines || []).map((x) => `<li>${esc(x.title)}<span>進度 ${x.k} / ${x.n}</span><b>時空幣 ${x.coins}${x.xp ? `・經驗 ${x.xp}` : ""}</b></li>`).join("")}</ul>
          <p class="tv-note">合計：時空幣 ${r.coins}${r.xp ? `、經驗 ${r.xp}` : ""}。這輪冒險的金幣、行囊、寶物和成長都歸零了。</p>`;
      } else {
        $("#tvPanelTitle").textContent = "歡迎回來";
        const L = R.Adventure.license();
        $("#tvPanelBody").innerHTML = (r.scared ? `<div class="tv-npc"><span class="face">桑</span><p>……臉色怎麼這麼白？被嚇壞了吧。先喝杯熱的。沒辦完的委託我會跟委託人說一聲。</p></div>
          <ul class="ret-list">${(r.lines || []).map((x) => `<li>${esc(x.title)}<span>進度 ${x.k} / ${x.n}</span><b>時空幣 ${x.coins}${x.xp ? `・經驗 ${x.xp}` : ""}</b></li>`).join("")}</ul>
          <p class="tv-note">在 ${esc(r.world)} 嚇破膽：沒完成的委託算失敗，只照進度拿時空幣，這輪冒險不能再接。冒險本身還會繼續。合計：時空幣 ${r.coins}、經驗 ${r.xp}。</p>` : `<div class="tv-npc"><span class="face">桑</span><p>從 ${esc(r.world)} 回來了啊。辛苦了，這是委託人託我轉交的報酬：時空幣 ${r.coins}、經驗 ${r.xp}。</p></div>${(r.lines || []).some((x) => x.failed) ? `
          <ul class="ret-list">${r.lines.map((x) => `<li>${esc(x.title)}${x.failed ? "（失敗）" : ""}<span>進度 ${x.k} / ${x.n}</span><b>時空幣 ${x.coins}${x.xp ? `・經驗 ${x.xp}` : ""}</b></li>`).join("")}</ul>
          <p class="tv-note">失敗的委託只照進度拿時空幣，這輪冒險不能再接。</p>` : ""}`) + `
          ${r.rank ? `<p class="tv-note">執照經驗 +${r.license || 0}（${L.lxp}${L.next ? ` / ${L.need}` : ""}）・委託執照 <b>${esc(r.rank.before)}${r.rank.before !== r.rank.after ? ` → ${esc(r.rank.after)}　升級了！` : ""}</b></p>` : ""}
          <p class="tv-note">金幣 ${r.gold || 0} 和行囊會帶到下一次出發。${R.Bag && R.Adventure.get() && R.Bag.count(R.Adventure.get().items, "wolfMeat") ? "行囊裡有魔狼的肉，可以請桑恩烤成食物。" : ""}</p>`;
      }
      renderTop(); }
  }
  else if (P.trip().status === "away") {
    // 還在時空裡：委託沒完成不能回來
    const t = P.trip(), W = R.Commissions.WORLDS[t.world];
    panelOpen = true;
    $("#awayNote").innerHTML = `你還在 <b>${W.code} ${esc(W.name)}</b>。接下的委託全部完成之前，回不了酒館。`;
    $("#away").classList.remove("hidden");
  }
  requestAnimationFrame(frame);

  // 除錯用
  R.tavern = { me, open, closePanel, THINGS, blocked };
})();
