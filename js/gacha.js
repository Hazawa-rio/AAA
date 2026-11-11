/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/gacha.js": "20261112021356" });
// 觀測（抽角色）的動畫：圓形的鏡框在時空亂流中掃視，最後找到一顆星星
// 星星的顏色＝這次結果裡最好的：稀有藍、史詩紫、傳奇金；抽到適格者是角色自己的顏色＋額外的閃光（抽到多個就隨機挑一個）
(function () {
  const R = (window.RPG = window.RPG || {});
  const COLORS = { rare: "#3a8ee6", epic: "#9b4fe0", legend: "#f2b81a" };
  const RANK = { rare: 1, epic: 2, legend: 3 };

  function best(results) {
    const chars = results.filter((r) => r.kind === "char");
    if (chars.length) { const c = R.CHARACTERS[chars[Math.floor(Math.random() * chars.length)].id]; return { color: c.color, char: c }; }
    const top = results.reduce((a, r) => (RANK[r.tier] > RANK[a.tier] ? r : a), results[0]);
    return { color: COLORS[top.tier], tier: top.tier };
  }

  function play(host, results, onDone) {
    const B = best(results);
    const wrap = document.createElement("div");
    wrap.className = "gacha-overlay";
    wrap.innerHTML = `<canvas width="960" height="560" aria-label="觀測中"></canvas><p class="gacha-cap">觀測中……</p><button type="button" class="ghost gacha-skip">跳過</button>`;
    host.appendChild(wrap);
    const cv = wrap.querySelector("canvas"), ctx = cv.getContext("2d"), cap = wrap.querySelector(".gacha-cap");
    const W = cv.width, H = cv.height, t0 = performance.now();
    const SCAN = 3200, FOUND = 1500;
    // 亂流：很多條沿著漩渦流動的光痕
    const streaks = Array.from({ length: 260 }, () => ({ a: Math.random() * Math.PI * 2, r: 30 + Math.random() * 520, sp: 0.15 + Math.random() * 0.5, len: 0.05 + Math.random() * 0.25, hue: 200 + Math.random() * 120, w: 1 + Math.random() * 2.5 }));
    const dots = Array.from({ length: 140 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 1.8 + 0.4, tw: Math.random() * 6 }));
    // 星星的位置：鏡框最後停下來的地方
    const star = { x: W * (0.3 + Math.random() * 0.4), y: H * (0.3 + Math.random() * 0.35) };
    let done = false, raf = 0;
    const lensAt = (t) => {
      // 前段：沿著 Lissajous 曲線掃視；後段：慢慢靠近星星
      const k = Math.min(1, t / SCAN);
      const sx = W / 2 + Math.sin(t / 520) * W * 0.32, sy = H / 2 + Math.sin(t / 380 + 1) * H * 0.28;
      const e = k < 0.7 ? 0 : (k - 0.7) / 0.3, ee = e * e * (3 - 2 * e);
      return { x: sx + (star.x - sx) * ee, y: sy + (star.y - sy) * ee };
    };
    function frame(now) {
      if (done) return;
      const t = now - t0, found = t > SCAN;
      ctx.fillStyle = "#0a0b1e"; ctx.fillRect(0, 0, W, H);
      for (const d of dots) { ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.3 * Math.sin(now / 400 + d.tw)})`; ctx.fillRect(d.x, d.y, d.s, d.s); }
      // 漩渦亂流
      ctx.save(); ctx.translate(W / 2, H / 2);
      for (const s of streaks) {
        const a = s.a + (now / 1000) * s.sp;
        ctx.strokeStyle = `hsla(${s.hue},80%,65%,0.35)`; ctx.lineWidth = s.w;
        ctx.beginPath(); ctx.arc(0, 0, s.r * (0.9 + 0.1 * Math.sin(now / 700 + s.hue)), a, a + s.len); ctx.stroke();
      }
      ctx.restore();
      const L = lensAt(Math.min(t, SCAN)), R0 = 88;
      // 鏡框裡：比較亮、看得到星星
      ctx.save(); ctx.beginPath(); ctx.arc(L.x, L.y, R0, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = "rgba(120,160,255,.12)"; ctx.fillRect(L.x - R0, L.y - R0, R0 * 2, R0 * 2);
      for (const d of dots) if (Math.hypot(d.x - L.x, d.y - L.y) < R0) { ctx.fillStyle = "#fff"; ctx.fillRect(d.x - 0.5, d.y - 0.5, d.s * 1.8, d.s * 1.8); }
      if (found || Math.hypot(star.x - L.x, star.y - L.y) < R0) drawStar(star.x, star.y, found ? Math.min(1, (t - SCAN) / 500) : 0.35, now, false);
      ctx.restore();
      // 鏡框本身
      ctx.strokeStyle = "#c9a24a"; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(L.x, L.y, R0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "#7a5a1e"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(L.x, L.y, R0 + 6, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + now / 2000; ctx.beginPath(); ctx.moveTo(L.x + Math.cos(a) * (R0 + 6), L.y + Math.sin(a) * (R0 + 6)); ctx.lineTo(L.x + Math.cos(a) * (R0 + 14), L.y + Math.sin(a) * (R0 + 14)); ctx.stroke(); }
      if (found) {
        const k = (t - SCAN) / FOUND;
        drawStar(star.x, star.y, 1, now, true, k);
        if (B.char && k < 0.6) { ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - k / 0.6)})`; ctx.fillRect(0, 0, W, H); }    // 適格者：額外的閃光
        if (!wrap.dataset.found) {
          wrap.dataset.found = "1";
          try { const au = new Audio("sounds/guan-chime.mp3"); au.volume = R.CONFIG?.volume ?? 0.5; au.play().catch(() => {}); } catch (e) { /* 沒聲音就算了 */ }
          cap.textContent = B.char ? `觀測到適格者：${B.char.name}！` : `找到了${{ rare: "稀有", epic: "史詩", legend: "傳奇" }[B.tier]}的星光`;
          cap.style.color = B.color;
        }
        if (k >= 1) return finish();
      }
      raf = requestAnimationFrame(frame);
    }
    function drawStar(x, y, a, now, big, k = 0) {
      const s = (big ? 26 + 10 * Math.sin(now / 160) : 14) * (0.4 + 0.6 * a);
      const g = ctx.createRadialGradient(x, y, 0, x, y, s * 4);
      g.addColorStop(0, B.color); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s * 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? s * 0.42 : s, an = -Math.PI / 2 + (i * Math.PI) / 5; i ? ctx.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r) : ctx.moveTo(x + Math.cos(an) * r, y + Math.sin(an) * r); }
      ctx.closePath(); ctx.fill(); ctx.strokeStyle = B.color; ctx.lineWidth = 3; ctx.stroke();
      if (big && B.char) {   // 角色：放射狀的光芒
        ctx.strokeStyle = B.color; ctx.lineWidth = 3;
        for (let i = 0; i < 16; i++) { const an = (i / 16) * Math.PI * 2 + now / 900, r1 = s * 1.4, r2 = s * (2.4 + k * 3); ctx.globalAlpha = a * (1 - k * 0.6); ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * r1, y + Math.sin(an) * r1); ctx.lineTo(x + Math.cos(an) * r2, y + Math.sin(an) * r2); ctx.stroke(); }
      }
      ctx.globalAlpha = 1;
    }
    function finish() {
      if (done) return;
      done = true; cancelAnimationFrame(raf);
      wrap.remove();
      onDone?.();
    }
    wrap.querySelector(".gacha-skip").addEventListener("click", finish);
    raf = requestAnimationFrame(frame);
    return { finish };
  }

  R.GachaAnim = { play, best };
})();
