/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/ru20314-ruins.js": "20261112133137" });
// #RU20314 古代遺跡科考隊：隱藏的石門開關、皮普的行跡、遺跡內部（場景 RU20314/ruins）
// 森林：跟著皮普一路掉的東西走，一定找得到藏在森林裡的石門開關（不跟也有機會自己撞見）
//       找到之後：特寫石門，符文一個一個變成紅色，石門打開 → 走進石門就是遺跡
// 遺跡：房間＋長走廊。陷阱（噴火機關、鋸片、地刺、雷射＋鏡子）、寶箱（金幣，可能開到這個時空的寶物；觀知命的「趨吉避凶」提高機率）、
//       守衛機關／巡弋機關（打得動）、寶庫（殲滅矩陣）、皮普的藏身處、封著的秘密寶庫（翁爾貢，還沒設計）
//   噴火機關：有東西經過就噴火，每噴一次用掉一格燃油（橘色的條），燃油用完就不噴；普攻打得壞；弗爾斯勒的箭、薇薇拉丟的蘑菇可以讓它提早噴
//   鋸片：走進走廊才出現，從走廊頭尾往正中間鋸；正中間的按鈕近距離按、或被弗爾斯勒的箭射中就會關掉
//   地刺：突然刺出來又收回去；霍夫曼的噴氣裝置可以跳過去
//   雷射：一直開著，經過會受傷；會被鏡子反射；發射器打得壞
(function () {
  const R = (window.RPG = window.RPG || {});
  R.WorldHooks = R.WorldHooks || {};
  const base = R.WorldHooks.RU20314;

  const TRAIL = [
    { t: "一支斷掉的鉛筆", d: "鉛筆上刻著「皮普」。斷口很新，筆尖朝著北邊。" },
    { t: "一張採樣標籤", d: "「苔蘚樣本 #12・這裡的苔蘚會發光？・往北再看看」字跡越寫越潦草。" },
    { t: "一排腳印", d: "一個人的腳印，步伐很大，像是在追著什麼東西跑。" },
    { t: "無線電的電池蓋", d: "科考隊的無線電電池蓋。蓋子背面貼著一張貼紙：「皮普的，不要拿」。" },
    { t: "一張揉爛的筆記", d: "「石頭上的紋路在發光。一圈一圈的，和石門一樣。它在呼吸。」" },
    { t: "皮普的帽子", d: "掛在樹枝上的一頂帽子。帽子下面那塊長滿青苔的石頭，好像有一圈紋路。" },
  ];
  const SW_CANDS = [{ x: 420, y: 640 }, { x: 2760, y: 1180 }, { x: 2380, y: 380 }, { x: 860, y: 1560 }, { x: 2920, y: 760 }, { x: 350, y: 1250 }];
  const RUIN_ITEMS = ["ruinCog", "ruinCell", "ruinLens"];

  R.WorldHooks.RU20314 = function (api) {
    const { MAP, trip, run, me, CM, toast, inRect, text, save, openPanel, closePanel, dist, esc } = api;
    const ctx = api.ctx();
    const active = (id) => trip.accepted.includes(id) && !trip.done.includes(id);
    const stageOf = (id) => (active(id) ? CM.stage(trip, id) : null);
    trip.qdata = trip.qdata || {};
    const D = (trip.qdata.ruins = trip.qdata.ruins || {});
    D.trailFound = D.trailFound || [];
    const near = (p, r) => dist(me.x, me.y, p.x, p.y) < r;
    const reach = (p, r, fn) => { if (near(p, r)) fn(); else api.goTo(p, { type: "hook", reach: r - 20, fn }); };
    // 機關傷人：最多扣到剩 1，受傷後 0.8 秒內不會再被同一類機關打到
    let iframe = 0;
    function hurt(pct, label) {
      if (Date.now() < iframe) return;
      iframe = Date.now() + 800;
      const n = Math.min(Math.round(api.maxHp() * pct), Math.max(0, run.hp - 1));
      if (n <= 0) return;
      run.hp -= n; save(); api.renderHud();
      api.fx.push({ k: "num", x: me.x, y: me.y - 40, text: `-${n}`, color: "#e53935", t: performance.now(), dur: 900 });
      toast(label);
    }
    return MAP.ruins ? ruins() : forest();

    // ================= 森林：皮普的行跡、石門的開關 =================
    function forest() {
      const B = base(api);
      const free = (x, y) => !MAP.roundSolids.some((c) => dist(x, y, c.x, c.y) < c.r + 34) && !MAP.solids.some((r) => x > r.x - 30 && x < r.x + r.w + 30 && y > r.y - 30 && y < r.y + r.h + 30);
      const nudge = (p) => { if (free(p.x, p.y)) return p; for (let r = 20; r < 300; r += 20) for (let i = 0; i < 12; i++) { const x = p.x + Math.cos(i * 0.52) * r, y = p.y + Math.sin(i * 0.52) * r; if (free(x, y)) return { x: Math.round(x), y: Math.round(y) }; } return p; };
      if (!D.trail) {
        const sw = nudge(SW_CANDS[Math.floor(Math.random() * SW_CANDS.length)]), st = { x: 1600, y: 1040 };
        const pts = TRAIL.map((_, i) => { const f = i === TRAIL.length - 1 ? 0.93 : 0.1 + i * 0.16; return nudge({ x: Math.round(st.x + (sw.x - st.x) * f + (i % 2 ? 40 : -40)), y: Math.round(st.y + (sw.y - st.y) * f) }); });
        D.trail = { sw, pts }; save();
      }
      const SW = D.trail.sw, G = MAP.gate;
      const trailOn = () => stageOf("RU20314-02")?.type === "ruTrail";
      function openTrail(i) {
        if (!D.trailFound.includes(i)) { D.trailFound.push(i); save(); }
        const t = TRAIL[i];
        openPanel(t.t, `<p class="wx-p">${esc(t.d)}</p><p class="tv-note">皮普的東西：${D.trailFound.length} / ${TRAIL.length}${i < TRAIL.length - 1 ? "（繼續往下一個走）" : ""}</p>`);
      }
      // 特寫：石門的符文一個一個變成紅色，然後石門打開
      function cutscene(done) {
        api.setBusy(true);
        const host = api.$("#wxStage"), wrap = document.createElement("div");
        wrap.style.cssText = "position:absolute;inset:0;z-index:30;background:#0d0c0a";
        wrap.innerHTML = `<canvas width="1280" height="720" style="width:100%;height:100%;display:block" aria-label="石門打開的特寫"></canvas>`;
        host.appendChild(wrap);
        const g = wrap.querySelector("canvas").getContext("2d"), t0 = performance.now();
        const RUNES = 8, cx = 640, cy = 380;
        let lit = 0;
        api.sfx("sounds/boss-electric.mp3");
        const frame = (now) => {
          const t = (now - t0) / 1000;
          g.fillStyle = "#0d0c0a"; g.fillRect(0, 0, 1280, 720);
          const open = Math.max(0, Math.min(1, (t - 3.0) / 1.6)), slide = open * 300;
          // 門後的黑暗
          g.fillStyle = "#050404"; g.fillRect(cx - 300, cy - 300, 600, 600);
          if (open > 0) { const gr = g.createRadialGradient(cx, cy, 10, cx, cy, 300 * open); gr.addColorStop(0, `rgba(232,38,44,${0.35 * open})`); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(cx - 300, cy - 300, 600, 600); }
          // 兩扇石門
          for (const s of [-1, 1]) {
            const x0 = s < 0 ? cx - 300 - slide : cx + slide;
            g.fillStyle = "#5a5a54"; g.fillRect(x0, cy - 300, 300, 600);
            g.strokeStyle = "#2a2a28"; g.lineWidth = 6; g.strokeRect(x0, cy - 300, 300, 600);
            g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 2; for (let y = cy - 260; y < cy + 300; y += 70) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + 300, y); g.stroke(); }
          }
          // 符文（一圈 8 個）：0.6 秒之後一個一個變紅
          const n = Math.max(0, Math.min(RUNES, Math.floor((t - 0.6) / 0.28)));
          if (n > lit) { lit = n; api.sfx("sounds/firsler-load.mp3"); }
          g.save(); g.beginPath(); g.rect(cx - 300 - slide, cy - 300, 300, 600); g.rect(cx + slide, cy - 300, 300, 600); g.clip();
          for (let i = 0; i < RUNES; i++) {
            const a = (i / RUNES) * Math.PI * 2 - Math.PI / 2, rx = cx + Math.cos(a) * 190 + (Math.cos(a) < 0 ? -slide : slide), ry = cy + Math.sin(a) * 190, red = i < n;
            g.strokeStyle = red ? "#e8262c" : "rgba(90,220,230,.55)"; g.lineWidth = 5; g.shadowColor = red ? "#e8262c" : "transparent"; g.shadowBlur = red ? 18 : 0;
            g.beginPath(); g.moveTo(rx - 16, ry - 20); g.lineTo(rx + 16, ry - 20); g.lineTo(rx, ry + 4); g.closePath(); g.moveTo(rx, ry + 4); g.lineTo(rx, ry + 24); g.stroke();
          }
          g.shadowBlur = 0;
          const ring = n >= RUNES;
          g.strokeStyle = ring ? `rgba(232,38,44,${0.6 + 0.4 * Math.sin(now / 90)})` : "rgba(90,220,230,.45)"; g.lineWidth = 6;
          for (const s of [-1, 1]) { g.beginPath(); g.arc(cx + s * slide, cy, 120, s < 0 ? Math.PI / 2 : -Math.PI / 2, s < 0 ? Math.PI * 1.5 : Math.PI / 2); g.stroke(); }
          g.restore();
          if (t > 2.9 && t < 3.05) api.sfx("sounds/slime-slam.mp3");
          g.fillStyle = "#e8dcc8"; g.font = "900 22px 'Noto Sans TC', sans-serif"; g.textAlign = "center";
          g.fillText(t < 3 ? "石門上的符文一個一個亮了起來……" : "石門打開了。", cx, 690);
          const fade = t < 0.4 ? 1 - t / 0.4 : t > 5.0 ? Math.min(1, (t - 5.0) / 0.6) : 0;
          if (fade > 0) { g.fillStyle = `rgba(13,12,10,${fade})`; g.fillRect(0, 0, 1280, 720); }
          if (t < 5.6) requestAnimationFrame(frame); else { wrap.remove(); api.setBusy(false); done(); }
        };
        requestAnimationFrame(frame);
      }
      function pressSwitch() {
        if (D.gateOpen) { toast("石頭上的紋路是紅色的。石門已經開了"); return; }
        D.gateOpen = true; save();
        api.bark("gate");
        cutscene(() => {
          if (stageOf("RU20314-02")?.type === "ruTrail") CM.advance(trip, "RU20314-02");
          save();
          toast("石門打開了！走進石門就是古代遺跡");
        });
      }
      function click(p) {
        if (dist(p.x, p.y, SW.x, SW.y) < 50 && (near(SW, 260) || D.trailFound.length >= TRAIL.length - 1)) { reach(SW, 90, pressSwitch); return true; }
        for (let i = 0; i < D.trail.pts.length; i++) { const q = D.trail.pts[i]; if (dist(p.x, p.y, q.x, q.y) < 34) { reach(q, 80, () => openTrail(i)); return true; } }
        if (inRect({ x: G.x - 10, y: G.y - 10, w: G.w + 20, h: G.h + 40 }, p.x, p.y)) {
          if (D.gateOpen) reach({ x: G.x + G.w / 2, y: G.y + G.h + 40 }, 60, enter);
          else toast("石門緊閉。門上的紋路一圈一圈地亮著，像是在呼吸。……開關不在這裡。");
          return true;
        }
        return B.click?.(p) || false;
      }
      function enter() { api.changeScene("ruins", R.MAPS["RU20314/ruins"].arrive, "古代遺跡"); }
      function update(dt, now) {
        B.update?.(dt, now);
        if (D.gateOpen && me.y < G.y + G.h + 34 && me.x > G.x && me.x < G.x + G.w) enter();
      }
      function drawFloor(now, x0, y0) {
        B.drawFloor?.(now, x0, y0);
        if (D.gateOpen) {
          ctx.fillStyle = "#0d0c0a"; ctx.fillRect(G.x + 20, G.y + 10, G.w - 40, G.h - 10);
          ctx.strokeStyle = `rgba(232,38,44,${0.6 + 0.3 * Math.sin(now / 300)})`; ctx.lineWidth = 4; ctx.strokeRect(G.x + 20, G.y + 10, G.w - 40, G.h - 10);
          ctx.fillStyle = "#5a5a54"; ctx.fillRect(G.x - 40, G.y, 60, G.h); ctx.fillRect(G.x + G.w - 20, G.y, 60, G.h);
          text("石門開了（走進去）", G.x + G.w / 2, G.y + G.h + 26, "#ffb0a8", 14, 900);
        }
        // 皮普一路掉的東西（委託進行中會發光）
        D.trail.pts.forEach((q, i) => {
          const got = D.trailFound.includes(i);
          if (i < D.trail.pts.length - 1) { ctx.fillStyle = "rgba(60,40,20,.35)"; for (let k = 0; k < 3; k++) ctx.fillRect(q.x - 30 + k * 22, q.y + 18 + (k % 2) * 8, 8, 12); }
          ctx.fillStyle = got ? "#8a7a5a" : "#d8c890"; ctx.strokeStyle = "#5a4a2a"; ctx.lineWidth = 2;
          if (i === TRAIL.length - 1) { ctx.beginPath(); ctx.ellipse(q.x, q.y, 16, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillRect(q.x - 8, q.y - 14, 16, 10); }
          else { ctx.fillRect(q.x - 10, q.y - 6, 20, 12); ctx.strokeRect(q.x - 10, q.y - 6, 20, 12); }
          if (trailOn() && !got) { ctx.strokeStyle = `rgba(255,236,150,${0.5 + 0.4 * Math.sin(now / 300 + i)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(q.x, q.y, 24, 0, Math.PI * 2); ctx.stroke(); }
        });
        // 藏在青苔下的開關：靠近（或跟完皮普的行跡）才看得出來
        const seen = near(SW, 260) || D.trailFound.length >= TRAIL.length - 1 || D.gateOpen;
        if (seen) {
          ctx.fillStyle = "#6a7a5a"; ctx.beginPath(); ctx.ellipse(SW.x, SW.y, 34, 24, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "rgba(61,94,48,.7)"; ctx.beginPath(); ctx.arc(SW.x - 12, SW.y - 6, 12, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = D.gateOpen ? "#e8262c" : `rgba(90,220,230,${0.4 + 0.4 * Math.sin(now / 500)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(SW.x, SW.y, 14, 0, Math.PI * 2); ctx.stroke();
          if (!D.gateOpen) text("長滿青苔的石頭（有一圈紋路）", SW.x, SW.y - 36, "#d8f0f0", 12, 900);
        }
        // 找到皮普之後：他回營地了
        if (D.pipFound) { ctx.fillStyle = "#fffaf0"; ctx.fillRect(1660, 1290, 28, 28); ctx.strokeStyle = "#7a8a3a"; ctx.lineWidth = 3; ctx.strokeRect(1660, 1290, 28, 28); text("皮", 1674, 1305, "#7a8a3a", 14, 900); text("皮普（在寫報告）", 1674, 1276, "#3a2a1a", 11, 700); }
      }
      function stageText(id, st) {
        if (st?.type === "ruTrail") return `${st.text}（皮普的東西：${D.trailFound.length} / ${TRAIL.length}）`;
        return B.stageText?.(id, st) || null;
      }
      function mini(dot, now) {
        B.mini?.(dot, now);
        const blink = `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`;
        if (trailOn()) { const i = D.trail.pts.findIndex((_, k) => !D.trailFound.includes(k)); if (i >= 0) dot(D.trail.pts[i].x, D.trail.pts[i].y, 4, blink); }
        if (D.gateOpen) dot(G.x + G.w / 2, G.y + G.h, 5, "#e8262c");
      }
      return Object.assign({}, B, { click, update, drawFloor, stageText, mini });
    }

    // ================= 遺跡內部 =================
    function ruins() {
      const ROOMS = MAP.rooms, CORR = MAP.corridors;
      const roomAt = (x, y) => Object.values(ROOMS).find((r) => inRect(r, x, y));
      const corrAt = (x, y) => CORR.find((c) => inRect(c, x, y));
      // 封著的秘密寶庫：走廊被一道刻滿符文的門擋住
      const SEAL = MAP.seal;

      // ===== 機關的資料（位置是算出來的；燃油、壞掉、關掉存在 D） =====
      const FL = [];             // 噴火機關
      for (const c of CORR) {
        const o = D.corr[c.id]; if (o?.k !== "flame") continue;
        const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
        FL.push(c.horiz ? { o, ex: cx, ey: c.y + 8, fire: { x: cx - 45, y: c.y, w: 90, h: c.h }, trig: (x, y) => inRect(c, x, y) && Math.abs(x - cx) < 180, down: true }
          : { o, ex: c.x + 8, ey: cy, fire: { x: c.x, y: cy - 45, w: c.w, h: 90 }, trig: (x, y) => inRect(c, x, y) && Math.abs(y - cy) < 180, down: false });
      }
      for (const [id, ro] of Object.entries(D.rooms)) for (const f of ro.flames) { const rm = ROOMS[id]; FL.push({ o: f, ex: f.x, ey: f.y, fire: { x: f.x - 45, y: rm.y, w: 90, h: f.len }, trig: (x, y) => inRect(rm, x, y) && Math.abs(x - f.x) < 150, down: true }); }
      for (const f of FL) { f.burst = 0; f.cd = 0; }
      const SAWS = CORR.filter((c) => D.corr[c.id]?.k === "saw").map((c) => {
        const mid = { x: c.x + c.w / 2, y: c.y + c.h / 2 };
        const e1 = c.horiz ? { x: c.x + 50, y: mid.y } : { x: mid.x, y: c.y + 50 }, e2 = c.horiz ? { x: c.x + c.w - 50, y: mid.y } : { x: mid.x, y: c.y + c.h - 50 };
        const btn = c.horiz ? { x: mid.x, y: c.y + 18 } : { x: c.x + 18, y: mid.y };
        return { c, o: D.corr[c.id], mid, e1, e2, btn, on: false, t0: 0 };
      });
      const SPK = [];           // 地刺：{ rect, ph }
      for (const c of CORR) { const o = D.corr[c.id]; if (o?.k !== "spikes") continue; for (const z of o.zones) SPK.push({ ph: z.ph, r: c.horiz ? { x: c.x + c.w * z.f - 45, y: c.y, w: 90, h: c.h } : { x: c.x, y: c.y + c.h * z.f - 45, w: c.w, h: 90 } }); }
      for (const ro of Object.values(D.rooms)) for (const s of ro.spikes) SPK.push({ ph: s.ph, r: s });
      const LAS = [];
      for (const [id, ro] of Object.entries(D.rooms)) for (const L of ro.lasers) LAS.push({ L, rm: ROOMS[id], mirrors: ro.mirrors });
      const spikeState = (s, now) => { const k = (now / 1000 + s.ph) % 3; return k < 0.5 ? "warn" : k < 1.4 ? "out" : "in"; };
      const laserPts = (x) => R.Ruins.laserPath(x.L.x, x.L.y, x.L.dx, x.L.dy, x.mirrors, x.rm);

      // ===== 拆掉機關（清除陷阱的委託會算） =====
      function disarm(label) {
        D.disarmed = (D.disarmed || 0) + 1;
        const st = stageOf("RU20314-05");
        let extra = "";
        if (st?.type === "ruTraps") { const n = Math.min(st.need, (D.trapCount = (D.trapCount || 0) + 1)); extra = `（清除陷阱 ${n} / ${st.need}）`; if (n >= st.need) CM.advance(trip, "RU20314-05"); }
        save(); toast(label + extra);
      }
      function ignite(f, why) {
        if (f.o.broken || f.o.fuel <= 0) return false;
        f.o.fuel--; f.burst = performance.now() + 1100; f.cd = performance.now() + 3400; save();
        api.sfx("sounds/firsler-burst.mp3");
        if (why) toast(why);
        return true;
      }
      function sawOff(s, how) { if (s.o.off) return; s.o.off = true; s.on = false; api.sfx("sounds/firsler-load.mp3"); disarm(how); }

      // ===== 寶箱 =====
      function chestLoot(c) {
        const luck = api.lucky(), have = (R.Progress?.load(api.CH.id).items) || [];
        let gold = 25 + Math.floor(Math.random() * 66);
        if (luck) gold = Math.round(gold * 1.5);
        const pool = RUIN_ITEMS.filter((id) => !have.includes(id));
        const chance = c.vault ? 1 : luck ? 0.35 : 0.12;
        let html = `<p class="wx-p">${c.vault ? "寶庫最深處的箱子。蓋子上刻著和石門一樣的紋路。" : "一個古老的寶箱。蓋子比想像中輕。"}</p>`;
        if (pool.length && Math.random() < chance) {
          const id = pool[Math.floor(Math.random() * pool.length)], g = R.Items.give(api.CH.id, id), it = R.Items.get(id);
          html += `<div class="shop-row" style="margin:8px 0">${R.Items.slotHtml(id)}<span><b>${esc(it.name)}</b><small>${esc(it.desc)}</small></span></div><p class="tv-note">${esc(g.text)}</p>`;
          if (!g.ok) gold += 60;
        } else if (c.vault) gold += 150;
        run.gold += gold; save(); api.renderHud();
        html += `<p class="tv-note">得到 ${gold} 金幣${luck ? "（吉卦：開得比較多）" : ""}</p>`;
        openPanel(c.vault ? "寶庫的寶箱" : "寶箱", html);
      }
      function openChest(c) { if (c.opened) return toast("空的寶箱"); c.opened = true; api.sfx("sounds/firsler-load.mp3"); chestLoot(c); }

      // ===== 打完仗回來 =====
      const LB = run.lastBattle;
      if (LB) {
        if (LB.result === "win" && LB.room === "ruins") {
          delete run.lastBattle;
          const st = stageOf("RU20314-04");
          if (st?.type === "ruCores") { D.cores = (D.cores || 0) + 1; if (D.cores >= st.need) CM.advance(trip, "RU20314-04"); save(); setTimeout(() => toast(D.cores >= st.need ? "核心湊齊了！回營地交給朵拉" : `從殘骸裡拆出了核心（${D.cores} / ${st.need}）`), 400); }
        }
        if (LB.result === "win" && LB.variant === "ongergon") { delete run.lastBattle; D.ongDown = true; save(); setTimeout(() => toast("超古代兵器・翁爾貢停止運轉了。秘密寶庫安靜了下來"), 400); }
        if (LB.result === "win" && LB.variant === "matrix") { delete run.lastBattle; D.vaultOpen = true; save(); setTimeout(() => toast("殲滅矩陣停了下來。寶庫最深處的寶箱，蓋子上的紋路亮了"), 400); }
      }
      const vaultChest = { id: "vault", x: MAP.vault.cx, y: MAP.vault.y + 120, vault: true, get opened() { return !!D.vaultChest; }, set opened(v) { D.vaultChest = v; } };

      // ===== 皮普：說完話就跟著你 =====
      const pal = { x: me.x - 40, y: me.y + 20 };
      const pipFollow = () => D.pipFound && !trip.done.includes("RU20314-02");

      // ===== 互動 =====
      function click(p) {
        const ch = [...D.chests, vaultChest].find((c) => (c !== vaultChest || D.vaultOpen) && !c.opened && dist(p.x, p.y, c.x, c.y) < 40);
        if (ch) { reach({ x: ch.x, y: ch.y + 40 }, 80, () => openChest(ch)); return true; }
        const s = SAWS.find((x) => !x.o.off && dist(p.x, p.y, x.btn.x, x.btn.y) < 34);
        if (s) { reach(s.btn, 80, () => sawOff(s, "按下了走廊正中間的按鈕——鋸片停了下來")); return true; }
        if (!D.vaultOpen && inRect({ x: SEAL.x - 10, y: SEAL.y - 10, w: SEAL.w + 20, h: SEAL.h + 20 }, p.x, p.y)) {
          openPanel("封著的門", `<p class="wx-p">一道比石門還古老的門。門上的符文是暗紅色的，一動也不動。</p><p class="wx-p">門縫裡寫著一個名字：「翁爾貢」。</p><p class="tv-note">符文的線一路連到遺跡正中央的寶庫。……也許要先讓寶庫的守護者停下來。</p>`);
          return true;
        }
        // 秘密寶庫：沉睡的超古代兵器・翁爾貢（試煉 Boss）
        const SR = MAP.secret;
        if (D.vaultOpen && inRect(SR, p.x, p.y) && dist(p.x, p.y, SR.cx, SR.cy) < 120) {
          reach({ x: SR.cx, y: SR.cy + 170 }, 100, () => (!D.ongDown && api.bark("ongergon"), openPanel("超古代兵器・翁爾貢", D.ongDown
            ? `<p class="wx-p">倒在地上的超古代兵器。雙肩的能量炮已經暗了，長槍斜插在地上。</p><div class="tv-row"><button type="button" class="ghost" data-act="ruOng">再挑戰一次</button></div>`
            : `<p class="wx-p">秘密寶庫的正中央，跪著一具灰色的巨大兵器。雙肩是兩顆紅色的球，手裡握著一把兩頭都是刃的長槍。</p>
              <p class="wx-p">房間的四周插著幾塊紅色的水晶，一明一暗地發著光。</p>
              <p class="tv-note">試煉 Boss。它很快、很會閃，正面的投射物會被擋下；引誘它的「噴射突刺」撞上能量水晶，它會暈眩。</p>
              <div class="tv-row"><button type="button" class="primary" data-act="ruOng">喚醒翁爾貢</button></div>`)));
          return true;
        }
        const V = MAP.vault;
        if (!D.vaultOpen && inRect(V, p.x, p.y) && dist(p.x, p.y, V.cx, V.cy) < 120 && stageOf("RU20314-03")?.type !== "boss") {
          reach({ x: V.cx, y: V.cy + 160 }, 100, () => openPanel("寶庫的守護者", `<p class="wx-p">一顆發光的核心浮在半空中，三個能量矩陣繞著它慢慢轉。它還沒發現你。</p>
            <div class="tv-row"><button type="button" class="primary" data-act="ruVault">喚醒殲滅矩陣</button></div>`));
          return true;
        }
        return false;
      }
      function act(a) {
        if (a === "ruOng") { closePanel(); api.go(`${api.base()}&room=boss&boss=ongergon&init=0`, "執行——"); return true; }
        if (a === "ruVault") { closePanel(); api.go(`${api.base()}&room=boss&boss=matrix&init=0`, "殲滅矩陣！"); return true; }
        return false;
      }
      // 普攻打得壞噴火機關、雷射發射器
      function basicHit(test) {
        for (const f of FL) if (!f.o.broken && test(f.ex, f.ey, 22)) { f.o.broken = true; f.burst = 0; disarm("噴火機關被打壞了"); }
        for (const x of LAS) if (!x.L.broken && test(x.L.x, x.L.y, 20)) { x.L.broken = true; disarm("雷射發射器被打壞了，光線消失了"); }
      }
      // 弗爾斯勒的箭：射中鋸片的按鈕、讓噴火機關提早噴
      function qRay(x, y, dx, dy, maxT) {
        let best = null;
        const hit = (cx, cy, r, fn) => { const t = R.geo.rayCircle(x, y, dx, dy, cx, cy, r); if (t !== null && t < maxT && (!best || t < best.t)) best = { t, fn }; };
        for (const s of SAWS) if (!s.o.off) hit(s.btn.x, s.btn.y, 26, () => sawOff(s, "箭射中了走廊中間的按鈕——鋸片停了下來"));
        for (const f of FL) if (!f.o.broken && f.o.fuel > 0) hit(f.ex, f.ey, 28, () => ignite(f, "箭射中了噴火機關——它提早噴了！趁現在過去"));
        return best;
      }
      // 薇薇拉丟的蘑菇：落在噴火機關或火焰的範圍上，讓它提早噴
      function qLand(x, y) {
        const f = FL.find((f) => !f.o.broken && f.o.fuel > 0 && (dist(x, y, f.ex, f.ey) < 70 || inRect(f.fire, x, y)));
        if (!f) return false;
        ignite(f, "蘑菇砸中了噴火機關——它提早噴了！趁現在過去");
        return true;
      }
      // 伊爾舒的疑心病也感覺得到機關
      function sense(x, y, r) {
        const nearP = (px, py) => dist(x, y, px, py) <= r;
        return FL.some((f) => !f.o.broken && f.o.fuel > 0 && nearP(f.ex, f.ey)) || SAWS.some((s) => !s.o.off && nearP(s.mid.x, s.mid.y)) || LAS.some((l) => !l.L.broken && nearP(l.L.x, l.L.y)) || SPK.some((s) => nearP(s.r.x + s.r.w / 2, s.r.y + s.r.h / 2));
      }

      function update(dt, now) {
        // 走出入口＝回到森林
        if (inRect(MAP.exit, me.x, me.y)) { api.changeScene(null, { x: 1600, y: 400 }, "回到森林"); return; }
        // 皮普：說完話之後跟著你
        if (stageOf("RU20314-02")?.type === "report" && !D.pipFound) { D.pipFound = true; const i = MAP.npcs.findIndex((n) => n.id === "pip"); if (i >= 0) MAP.npcs.splice(i, 1); save(); toast("皮普抱著筆記本跟在你後面。帶他回營地吧"); }
        if (pipFollow()) { const tx = me.x - 40, ty = me.y + 20; pal.x += (tx - pal.x) * Math.min(1, dt * 5); pal.y += (ty - pal.y) * Math.min(1, dt * 5); }
        const t = performance.now(), jumped = t - (me.jetAt || 0) < 400;
        // 噴火機關
        for (const f of FL) {
          if (!f.o.broken && f.o.fuel > 0 && t > f.cd && f.trig(me.x, me.y)) ignite(f);
          if (t < f.burst && inRect(f.fire, me.x, me.y)) hurt(0.1, "被噴出來的火燒到了！");
        }
        // 鋸片：走進走廊才出現
        for (const s of SAWS) {
          if (s.o.off) continue;
          if (!s.on && inRect(s.c, me.x, me.y)) { s.on = true; s.t0 = t; toast("鋸片從走廊的兩頭冒了出來！（正中間有一個按鈕）"); api.sfx("sounds/hoffman-gear.mp3"); }
          if (!s.on) continue;
          for (const p of sawPos(s, t)) if (dist(me.x, me.y, p.x, p.y) < 26 + me.half) hurt(0.12, "被鋸片割到了！");
        }
        // 地刺
        if (!jumped) for (const s of SPK) if (spikeState(s, t) === "out" && inRect({ x: s.r.x - me.half * 0.5, y: s.r.y - me.half * 0.5, w: s.r.w + me.half, h: s.r.h + me.half }, me.x, me.y)) hurt(0.08, "地刺刺了出來！");
        // 雷射
        for (const x of LAS) if (!x.L.broken && R.Ruins.distToPath(me.x, me.y, laserPts(x)) < me.half) hurt(0.09, "被雷射燙到了！");
      }
      function sawPos(s, t) {
        const f = 0.92 * (0.5 - 0.5 * Math.cos(((t - s.t0) / 3400) * Math.PI * 2));
        return [{ x: s.e1.x + (s.mid.x - s.e1.x) * f, y: s.e1.y + (s.mid.y - s.e1.y) * f }, { x: s.e2.x + (s.mid.x - s.e2.x) * f, y: s.e2.y + (s.mid.y - s.e2.y) * f }];
      }
      function stageText(id, st) {
        if (!st) return null;
        if (st.type === "ruCores") return `${st.text}（${D.cores || 0} / ${st.need}）`;
        if (st.type === "ruTraps") return `${st.text}（${Math.min(st.need, D.trapCount || 0)} / ${st.need}）`;
        return null;
      }

      // ===== 繪圖 =====
      const BORDER = { [MAP.entrance.id]: "#3aa8e0", [MAP.vault.id]: "#f0d800", [MAP.secret.id]: "#7a1020", r10: "#e8262c", r14: "#e8262c" };
      function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
      function drawFloor(now, x0, y0) {
        ctx.fillStyle = "#1e1b17"; ctx.fillRect(x0, y0, 1280, 720);
        const vis = (r) => r.x < x0 + 1280 && r.x + r.w > x0 && r.y < y0 + 720 && r.y + r.h > y0;
        for (const rm of Object.values(ROOMS)) {
          if (!vis(rm)) continue;
          rrect(rm.x, rm.y, rm.w, rm.h, 46); ctx.fillStyle = "#8a8070"; ctx.fill();
          ctx.save(); ctx.clip();
          for (let y = rm.y; y < rm.y + rm.h; y += 80) for (let x = rm.x + (((y - rm.y) / 80) % 2 ? -40 : 0); x < rm.x + rm.w; x += 80) { ctx.fillStyle = ((x + y) / 40) % 3 < 1 ? "#958b7a" : "#857b6a"; ctx.fillRect(x + 2, y + 2, 76, 76); }
          ctx.restore();
          rrect(rm.x, rm.y, rm.w, rm.h, 46); ctx.strokeStyle = BORDER[rm.id] || "#6a6a64"; ctx.lineWidth = 14; ctx.stroke();
        }
        // 走廊（長長的灰色石廊，兩條細線）
        for (const c of CORR) {
          if (!vis(c)) continue;
          ctx.fillStyle = "#a8a29a"; ctx.fillRect(c.x, c.y, c.w, c.h);
          ctx.fillStyle = "#7a7670"; if (c.horiz) { ctx.fillRect(c.x + 12, c.y, c.w - 24, 12); ctx.fillRect(c.x + 12, c.y + c.h - 12, c.w - 24, 12); } else { ctx.fillRect(c.x, c.y + 12, 12, c.h - 24); ctx.fillRect(c.x + c.w - 12, c.y + 12, 12, c.h - 24); }
          ctx.strokeStyle = "rgba(90,86,80,.8)"; ctx.lineWidth = 3; ctx.beginPath();
          if (c.horiz) { ctx.moveTo(c.x + 12, c.y + 38); ctx.lineTo(c.x + c.w - 12, c.y + 38); ctx.moveTo(c.x + 12, c.y + c.h - 38); ctx.lineTo(c.x + c.w - 12, c.y + c.h - 38); }
          else { ctx.moveTo(c.x + 38, c.y + 12); ctx.lineTo(c.x + 38, c.y + c.h - 12); ctx.moveTo(c.x + c.w - 38, c.y + 12); ctx.lineTo(c.x + c.w - 38, c.y + c.h - 12); }
          ctx.stroke();
        }
        // 入口的石台
        const PL = MAP.plinth; rrect(PL.x, PL.y, PL.w, PL.h, 34); ctx.fillStyle = "#9a9284"; ctx.fill(); ctx.strokeStyle = "#6a6a64"; ctx.lineWidth = 8; ctx.stroke();
        text("古代遺跡・入口", PL.x + PL.w / 2, PL.y + PL.h / 2, "#4a4438", 15, 900);
        const ex = MAP.exit; ctx.fillStyle = "#3a3630"; ctx.fillRect(ex.x, ex.y, ex.w, ex.h); text("↓ 回到森林", ex.x + ex.w / 2, ex.y - 14, "#e8dcc8", 12, 900);
        // 秘密寶庫的封印門
        if (!D.vaultOpen) {
          ctx.fillStyle = "#3a1a1a"; ctx.fillRect(SEAL.x, SEAL.y, SEAL.w, SEAL.h); ctx.strokeStyle = "#7a1020"; ctx.lineWidth = 4; ctx.strokeRect(SEAL.x, SEAL.y, SEAL.w, SEAL.h);
          for (let i = 0; i < 4; i++) { ctx.strokeStyle = "rgba(160,30,40,.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(SEAL.x + 26 + i * 34, SEAL.y + SEAL.h / 2, 9, 0, Math.PI * 2); ctx.stroke(); }
        } else { ctx.strokeStyle = "rgba(232,38,44,.7)"; ctx.lineWidth = 3; ctx.strokeRect(SEAL.x, SEAL.y, 14, SEAL.h); ctx.strokeRect(SEAL.x + SEAL.w - 14, SEAL.y, 14, SEAL.h); }
        // 秘密寶庫：能量水晶、沉睡（或倒下）的翁爾貢
        const SR = MAP.secret;
        if (vis(SR)) {
          for (const [fx, fy] of [[0.08, 0.3], [0.92, 0.3], [0.08, 0.75], [0.92, 0.75]]) R.drawCrystal?.(ctx, { x: SR.x + SR.w * fx, y: SR.y + SR.h * fy, r: 22 }, now);
          if (R.EnemyArt?.ongergon) R.EnemyArt.ongergon(ctx, { r: 46, x: SR.cx, facing: Math.PI / 2, alive: !D.ongDown, def: {}, state: {} }, { x: SR.cx, y: SR.cy + 10 }, now);
          text(D.ongDown ? "超古代兵器・翁爾貢（停止運轉）" : D.vaultOpen ? "超古代兵器・翁爾貢（沉睡中）" : "", SR.cx, SR.cy - 90, "#ff8a80", 14, 900);
        }
        // 房間的地刺、矮牆、柱子
        for (const s of SPK) if (vis(s.r)) drawSpikes(s, now);
        for (const o of MAP.lowWalls) { ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.fillRect(o.x + 4, o.y + 6, o.w, o.h); ctx.fillStyle = "#a89a80"; ctx.fillRect(o.x, o.y, o.w, o.h); ctx.strokeStyle = "#5a5040"; ctx.lineWidth = 2; ctx.strokeRect(o.x, o.y, o.w, o.h); }
        for (const ro of Object.values(D.rooms)) for (const o of ro.pillars) { ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(o.x + 8, o.y + 10, o.w, o.h); ctx.fillStyle = "#b8ac94"; ctx.fillRect(o.x, o.y, o.w, o.h); ctx.strokeStyle = "#5a5040"; ctx.lineWidth = 3; ctx.strokeRect(o.x, o.y, o.w, o.h); ctx.fillStyle = "#c8bca4"; ctx.fillRect(o.x + 8, o.y + 8, o.w - 16, o.h - 16); }
        // 寶庫：沉睡的殲滅矩陣
        const V = MAP.vault;
        if (!D.vaultOpen) {
          const a = now / 1600;
          for (let i = 0; i < 3; i++) { const q = a + (i * Math.PI * 2) / 3; ctx.fillStyle = "#5a5e66"; ctx.beginPath(); ctx.arc(V.cx + Math.cos(q) * 110, V.cy + Math.sin(q) * 70, 18, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "rgba(90,220,230,.6)"; ctx.lineWidth = 2; ctx.stroke(); }
          ctx.fillStyle = `rgba(90,220,230,${0.5 + 0.3 * Math.sin(now / 400)})`; ctx.beginPath(); ctx.arc(V.cx, V.cy, 34, 0, Math.PI * 2); ctx.fill();
          text("寶庫的守護者・殲滅矩陣（沉睡中）", V.cx, V.cy - 70, "#f0d800", 13, 900);
        } else text("寶庫", V.cx, V.y + 40, "#f0d800", 15, 900);
        // 房間的名字（進到房間裡才顯示）
        const here = roomAt(me.x, me.y);
        if (here && D.rooms[here.id]) { const nm = MAP.types[D.rooms[here.id].type] || (D.rooms[here.id].type === "pipHide" || D.rooms[here.id].type === "pipOld" ? "紅色的房間" : ""); if (nm) text(nm, here.cx, here.y + 36, "#e8dcc8", 14, 900); }
      }
      function drawSpikes(s, now) {
        const st = spikeState(s, now), r = s.r;
        ctx.fillStyle = "#6a6258"; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.strokeStyle = "#4a4238"; ctx.lineWidth = 2; ctx.strokeRect(r.x, r.y, r.w, r.h);
        for (let yy = r.y + 15; yy < r.y + r.h; yy += 30) for (let xx = r.x + 15; xx < r.x + r.w; xx += 30) {
          if (st === "out") { ctx.fillStyle = "#f4f2ea"; ctx.strokeStyle = "#5a5a54"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xx - 7, yy + 8); ctx.lineTo(xx, yy - 16); ctx.lineTo(xx + 7, yy + 8); ctx.closePath(); ctx.fill(); ctx.stroke(); }
          else { ctx.fillStyle = st === "warn" ? "#c86a3a" : "#2a2620"; ctx.beginPath(); ctx.arc(xx, yy, 4, 0, Math.PI * 2); ctx.fill(); }
        }
      }
      function drawChest(c, now) {
        const x = c.x, y = c.y;
        ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(x - 30, y + 18, 64, 8);
        rrect(x - 32, y - 10, 64, 32, 6); ctx.fillStyle = "#b8784a"; ctx.fill(); ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 3; ctx.stroke();
        if (c.opened) { ctx.fillStyle = "#3a2010"; ctx.fillRect(x - 28, y - 8, 56, 8); }
        else { rrect(x - 32, y - 24, 64, 18, 8); ctx.fillStyle = "#8a3a2a"; ctx.fill(); ctx.stroke(); ctx.fillStyle = "#fff"; ctx.fillRect(x - 5, y - 10, 10, 12); ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 2; ctx.strokeRect(x - 5, y - 10, 10, 12);
          ctx.strokeStyle = `rgba(255,230,140,${0.4 + 0.4 * Math.sin(now / 300 + x)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 46, 0, Math.PI * 2); ctx.stroke(); }
      }
      function vine(x, y, s) {
        ctx.strokeStyle = "#2fae4c"; ctx.lineWidth = 7; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(x, y - 60 * s); ctx.bezierCurveTo(x + 40 * s, y - 30 * s, x - 40 * s, y, x + 10 * s, y + 40 * s); ctx.bezierCurveTo(x + 40 * s, y + 70 * s, x - 20 * s, y + 90 * s, x - 10 * s, y + 120 * s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 10 * s, y + 40 * s); ctx.bezierCurveTo(x + 50 * s, y + 30 * s, x + 30 * s, y + 70 * s, x + 50 * s, y + 90 * s); ctx.stroke();
      }
      function draw(now) {
        const t = performance.now();
        for (const c of D.chests) if (!c.vine) drawChest(c, now);
        if (D.vaultOpen) drawChest(vaultChest, now);
        // 噴火機關（燃油＝橘色的條）
        for (const f of FL) {
          ctx.save(); ctx.translate(f.ex, f.ey); ctx.rotate(f.down ? Math.PI / 2 : 0);
          ctx.fillStyle = f.o.broken ? "#5a5650" : "#c8c4bc"; ctx.strokeStyle = "#6a6a64"; ctx.lineWidth = 3;
          rrect(-34, -14, 56, 28, 10); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(22, -10); ctx.lineTo(34, -16); ctx.lineTo(40, -12); ctx.lineTo(40, 12); ctx.lineTo(34, 16); ctx.lineTo(22, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = "#f08a1e"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-26 + 44 * (f.o.broken ? 0 : f.o.fuel / 4), 0); ctx.stroke();
          ctx.restore();
          if (t < f.burst) {
            const k = 1 - (f.burst - t) / 1100, F = f.fire;
            for (let i = 0; i < 12; i++) {
              const q = ((i / 12 + t / 400) % 1), fx = f.down ? F.x + F.w / 2 + Math.sin(i * 2.3 + t / 80) * F.w * 0.35 : F.x + q * F.w, fy = f.down ? F.y + q * F.h : F.y + F.h / 2 + Math.sin(i * 2.3 + t / 80) * F.h * 0.35;
              ctx.fillStyle = `rgba(${240},${120 + Math.round(100 * (1 - q))},30,${0.75 * (1 - q * 0.6)})`; ctx.beginPath(); ctx.arc(fx, fy, 16 + 14 * (1 - q) * (1 - k * 0.3), 0, Math.PI * 2); ctx.fill();
            }
          }
          if (f.o.broken) text("壞掉了", f.ex, f.ey - 26, "#c8c4bc", 11, 900); else if (f.o.fuel <= 0) text("燃油用完了", f.ex, f.ey - 26, "#f08a1e", 11, 900);
        }
        // 鋸片（白色的菱形，轉著鋸過來）、正中間的按鈕
        for (const s of SAWS) {
          ctx.fillStyle = s.o.off ? "#4caf50" : "#e8262c"; ctx.beginPath(); ctx.arc(s.btn.x, s.btn.y, 13, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#3a3630"; ctx.lineWidth = 3; ctx.stroke();
          if (!s.o.off && s.on) for (const p of sawPos(s, t)) {
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(t / 60);
            ctx.fillStyle = "#fff"; ctx.strokeStyle = "#7a7670"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(11, 0); ctx.lineTo(0, 30); ctx.lineTo(-11, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.restore();
          }
          if (!s.o.off && s.on) text("按鈕", s.btn.x, s.btn.y + (s.c.horiz ? 26 : 0) - (s.c.horiz ? 0 : 24), "#fff", 11, 900);
        }
        // 雷射、鏡子、發射器
        for (const x of LAS) {
          for (const m of x.mirrors) { ctx.strokeStyle = "#9ad8ec"; ctx.lineWidth = 10; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(m.x1, m.y1); ctx.lineTo(m.x2, m.y2); ctx.stroke(); }
          const L = x.L;
          if (!L.broken) { const pts = laserPts(x); ctx.strokeStyle = `rgba(232,38,44,${0.7 + 0.25 * Math.sin(t / 80)})`; ctx.lineWidth = 5; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke(); }
          ctx.save(); ctx.translate(L.x, L.y); ctx.rotate(Math.atan2(L.dy, L.dx));
          ctx.strokeStyle = "#6a6a64"; ctx.lineWidth = 3; ctx.fillStyle = "#b8b4ac"; ctx.fillRect(10, -10, 26, 20); ctx.strokeRect(10, -10, 26, 20);
          ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = L.broken ? "#5a5650" : "#e8262c"; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        // 入口的藤蔓（藤蔓下可能藏著寶箱）
        const vc = D.chests.find((c) => c.vine);
        if (vc) drawChest(vc, now);
        MAP.vines.forEach((v, i) => vine(v.x, v.y - 40, i === 1 ? 1.2 : 0.9));
        if (pipFollow()) { ctx.fillStyle = "#fffaf0"; ctx.fillRect(pal.x - 13, pal.y - 13, 26, 26); ctx.strokeStyle = "#7a8a3a"; ctx.lineWidth = 3; ctx.strokeRect(pal.x - 13, pal.y - 13, 26, 26); text("皮", pal.x, pal.y + 1, "#7a8a3a", 13, 900); text("皮普", pal.x, pal.y - 26, "#e8dcc8", 11, 900); }
      }
      function drawEnemy(e, now, red) {
        const A = R.EnemyArt; if (!A?.ruinGuard) return false;
        const list = e.kind === "ruinGuards" ? ["ruinGuard", "ruinGuard"] : e.kind === "ruinCruisers" ? ["ruinCruiser", "ruinCruiser", "ruinCruiser"] : e.kind === "ruinMixed" ? ["ruinCruiser", "ruinGuard", "ruinCruiser"] : null;
        if (!list) return false;
        list.forEach((k, i) => A[k](ctx, { r: k === "ruinGuard" ? 17 : 14, x: e.x + i * 5, facing: e.face || Math.PI / 2, alive: true, def: {} }, { x: e.x + (i - (list.length - 1) / 2) * 36, y: e.y + (i % 2) * 10 }, now));
        if (red) { ctx.strokeStyle = "#e53935"; ctx.lineWidth = 3; ctx.strokeRect(e.x - 66, e.y - 50, 132, 90); }
        return true;
      }
      function mini(dot, now) {
        for (const c of D.chests) if (!c.opened) dot(c.x, c.y, 3, "#d8a84a");
        if (D.vaultOpen && !D.vaultChest) dot(vaultChest.x, vaultChest.y, 4, "#f0d800");
        if (pipFollow()) dot(pal.x, pal.y, 3, "#7a8a3a");
        const pip = MAP.npcs.find((n) => n.id === "pip"); if (pip) dot(pip.x, pip.y, 4, `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`);
      }
      return { update, click, act, draw, drawFloor, drawEnemy, mini, stageText, basicHit, qRay, qLand, sense, dbg: { D, FL, SAWS, SPK, LAS } };
    }
  };
})();
