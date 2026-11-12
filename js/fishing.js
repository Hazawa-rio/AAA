/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/fishing.js": "20261112133137" });
// 海上釣魚（#CI00001 奇儂鎮「釣條大魚」）
// 跟著老伯恩的船出海釣一次魚：選魚餌 → 下竿 → 30 秒內會有魚上鉤（水面出現水波）
// → 「快拉！」時快速點擊、「停！」時停手，交替累積進度，進度滿就釣起來
// 魚餌：魔狼的肉＝稀有魚類比較容易上鉤；黏液＝稀有的非魚類比較容易上鉤；
//       借來的怪異樹莓＝一定釣出稀世珍品「變異發泡水母」，接著進入戰鬥
// 依釣到的魚的稀有度給金幣（只有金幣）
(function () {
  const R = (window.RPG = window.RPG || {});

  const TIERS = {
    common: { name: "普通", color: "#6b7a8a", gold: 15, weight: 75, per: 6 },
    rare: { name: "稀有", color: "#3d7fe0", gold: 45, weight: 20, per: 4.5 },
    treasure: { name: "珍品", color: "#c98a1a", gold: 120, weight: 5, per: 3.5 },
  };
  // fish：是不是魚（魔狼肉餌料偏好魚類、黏液偏好非魚類）
  const CATCH = [
    { name: "鱈魚", tier: "common", fish: true }, { name: "鰻魚", tier: "common", fish: true },
    { name: "石斑魚", tier: "common", fish: true }, { name: "墨魚", tier: "common", fish: false },
    { name: "大石斑魚", tier: "rare", fish: true }, { name: "帶魚", tier: "rare", fish: true }, { name: "花枝", tier: "rare", fish: false },
    { name: "大嘴海膽", tier: "treasure", fish: false }, { name: "發泡水母", tier: "treasure", fish: false }, { name: "三腕章魚", tier: "treasure", fish: false },
    { name: "怪獸魚", tier: "treasure", fish: true }, { name: "船尾魚", tier: "treasure", fish: true },
  ];
  const JELLY = { name: "變異發泡水母", tier: "legend", jelly: true };
  const BAIT_BOOST = 3;          // 對應魚餌讓稀有、珍品那一類的機率 ×3

  function roll(bait) {
    if (bait === "baitBerry") return JELLY;
    const list = CATCH.map((c) => {
      const T = TIERS[c.tier];
      let w = T.weight / CATCH.filter((x) => x.tier === c.tier).length;
      if (c.tier !== "common" && ((bait === "wolfMeat" && c.fish) || (bait === "slimeGel" && !c.fish))) w *= BAIT_BOOST;
      if (bait === "vivMushroom") w *= c.tier === "treasure" ? BAIT_BOOST : c.tier === "rare" ? 0 : 1;     // 薇薇拉的蘑菇：珍品容易、稀有釣不到
      return { c, w };
    });
    let r = Math.random() * list.reduce((a, x) => a + x.w, 0);
    for (const x of list) { r -= x.w; if (r <= 0) return x.c; }
    return list[0].c;
  }
  // 各魚餌下的機率（顯示用）
  function odds(bait) {
    if (bait === "baitBerry") return "必定釣出稀世珍品";
    const sum = { common: 0, rare: 0, treasure: 0 };
    let all = 0;
    for (const c of CATCH) {
      let w = TIERS[c.tier].weight / CATCH.filter((x) => x.tier === c.tier).length;
      if (c.tier !== "common" && ((bait === "wolfMeat" && c.fish) || (bait === "slimeGel" && !c.fish))) w *= BAIT_BOOST;
      if (bait === "vivMushroom") w *= c.tier === "treasure" ? BAIT_BOOST : c.tier === "rare" ? 0 : 1;
      sum[c.tier] += w; all += w;
    }
    return Object.entries(sum).map(([k, v]) => `${TIERS[k].name} ${Math.round((v / all) * 100)}%`).join("・");
  }

  // ===== 釣魚畫面 =====
  // theme（可選）：別的時空的釣魚（例如蒙德里安的理想國的黃色水面）
  //   { title, label, roll() → 漁獲, per(漁獲), drawBg(ctx, now, W, H), result(漁獲) → HTML, button, castText }
  function start({ host, bait, onDone, theme }) {
    const wrap = document.createElement("div");
    wrap.className = "fish";
    wrap.innerHTML = `<canvas width="1280" height="720" aria-label="${theme?.label || "海上釣魚"}"></canvas>
      <div class="fish-hud"><b class="fish-title">${theme?.title || "北碼頭外的海上・老伯恩的漁船"}</b><span class="fish-msg" role="status"></span></div>
      <div class="fish-phase" aria-live="polite"></div>
      <div class="fish-bar hidden" aria-label="進度"><i></i></div>
      <button type="button" class="fish-btn hidden">拉竿！</button>
      <div class="fish-result hidden" role="dialog" aria-modal="true"></div>`;
    host.appendChild(wrap);
    const cv = wrap.querySelector("canvas"), ctx = cv.getContext("2d");
    const msg = wrap.querySelector(".fish-msg"), phaseEl = wrap.querySelector(".fish-phase"), bar = wrap.querySelector(".fish-bar"), barI = bar.querySelector("i");
    const btn = wrap.querySelector(".fish-btn"), res = wrap.querySelector(".fish-result");
    const catchIt = theme ? theme.roll() : roll(bait);
    const per = theme ? theme.per(catchIt) : catchIt.jelly ? 3 : TIERS[catchIt.tier].per;
    // 30 秒內上鉤（偏向 5～15 秒）
    const waitMs = (3 + Math.pow(Math.random(), 1.5) * 27) * 1000;
    const st = { mode: "cast", t0: performance.now(), biteAt: performance.now() + 900 + waitMs, prog: 0, phase: "pull", phaseEnd: 0, shake: 0, done: false };
    msg.textContent = theme?.castText || "下竿了……等魚上鉤（30 秒內）";

    function newPhase(now) {
      st.phase = st.phase === "pull" ? "stop" : "pull";
      st.phaseEnd = now + (st.phase === "pull" ? 1000 + Math.random() * 700 : 650 + Math.random() * 550);
      phaseEl.textContent = st.phase === "pull" ? "快拉！（連點）" : "停！（別點）";
      phaseEl.className = `fish-phase ${st.phase}`;
    }
    function bite(now) {
      st.mode = "bite";
      msg.textContent = "上鉤了！水面起了波紋——";
      bar.classList.remove("hidden"); btn.classList.remove("hidden");
      st.phase = "stop"; newPhase(now);
      btn.focus();
    }
    btn.addEventListener("click", () => {
      if (st.mode !== "bite") return;
      if (st.phase === "pull") { st.prog = Math.min(100, st.prog + per); barI.style.width = `${st.prog}%`; }
      else { st.prog = Math.max(0, st.prog - 8); st.shake = performance.now() + 250; msg.textContent = "線繃得太緊了！"; }
    });
    function finish() {
      st.mode = "caught";
      btn.classList.add("hidden"); bar.classList.add("hidden"); phaseEl.textContent = "";
      if (theme) {
        res.innerHTML = `${theme.result(catchIt)}<button type="button" class="primary" data-go>${theme.button || "收竿"}</button>`;
      } else if (catchIt.jelly) {
        res.innerHTML = `<h3 class="legend">稀世珍品</h3><p class="fish-name">${catchIt.name}！</p>
          <p>水面炸開一大片泡沫——拉上來的不是魚，而是頭頂長著紅色硬殼的巨大水母！牠甩開魚線，攀上了船邊。</p>
          <button type="button" class="primary" data-go>迎戰！</button>`;
      } else {
        const T = TIERS[catchIt.tier];
        res.innerHTML = `<h3 style="color:${T.color}">${T.name}</h3><p class="fish-name">釣到了${catchIt.name}！</p>
          <p>老伯恩：「${catchIt.tier === "treasure" ? "這、這可是珍品啊！" : catchIt.tier === "rare" ? "喔，不錯的貨色。" : "還行，今晚的湯有著落了。"}」照行情收購，付了 <b>${T.gold} 金幣</b>。</p>
          <button type="button" class="primary" data-go>回到碼頭</button>`;
      }
      res.classList.remove("hidden");
      res.querySelector("[data-go]").focus();
      res.querySelector("[data-go]").addEventListener("click", () => {
        st.done = true;
        wrap.remove();
        onDone(theme ? catchIt : catchIt.jelly ? { jelly: true, name: catchIt.name } : { name: catchIt.name, tier: catchIt.tier, tierName: TIERS[catchIt.tier].name, gold: TIERS[catchIt.tier].gold });
      });
    }

    // 畫面
    const bob = { x: 760, y: 410 };
    function drawLine(now) {
      // 浮標
      let bx = bob.x, by = bob.y + Math.sin(now / 400) * 4;
      if (st.mode === "bite") { by += Math.sin(now / 60) * 5; bx += (now < st.shake ? Math.sin(now / 20) * 6 : 0); }
      if (st.mode === "bite" || (st.mode === "cast" && now > st.biteAt - 1500 && now < st.biteAt)) {
        for (let i = 0; i < 3; i++) {
          const k = ((now / 900 + i / 3) % 1);
          ctx.strokeStyle = theme ? `rgba(29,29,31,${0.8 * (1 - k)})` : `rgba(255,255,255,${0.7 * (1 - k)})`; ctx.lineWidth = theme ? 5 : 3;
          if (theme) ctx.strokeRect(bx - 20 - k * 90, by + 6 - 6 - k * 26, 40 + k * 180, 12 + k * 52);         // 方塊的水波
          else { ctx.beginPath(); ctx.ellipse(bx, by + 6, 20 + k * 90, 6 + k * 26, 0, 0, Math.PI * 2); ctx.stroke(); }
        }
      }
      // 釣線
      ctx.strokeStyle = now < st.shake ? "#e53935" : theme ? "#1d1d1f" : "rgba(255,255,255,.85)"; ctx.lineWidth = theme ? 2.5 : 1.5;
      ctx.beginPath(); ctx.moveTo(1020, 330); ctx.quadraticCurveTo(900, st.mode === "bite" ? 360 : 400, bx, by - 8); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(bx, by, 8, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "#e53935"; ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI); ctx.fill();
      if (theme) {
        ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 10; ctx.lineCap = "butt";
        ctx.beginPath(); ctx.moveTo(1220, 640); ctx.lineTo(1020, 330 + (st.mode === "bite" && st.phase === "pull" ? Math.sin(now / 50) * 6 : 0)); ctx.stroke();
      }
    }
    function draw(now) {
      const W = 1280, H = 720, hz = 250;
      if (theme) { theme.drawBg(ctx, now, W, H); drawLine(now); return; }
      const sky = ctx.createLinearGradient(0, 0, 0, hz); sky.addColorStop(0, "#9fd0f0"); sky.addColorStop(1, "#e4f3fb");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hz);
      ctx.fillStyle = "#fff8e0"; ctx.beginPath(); ctx.arc(1080, 90, 46, 0, Math.PI * 2); ctx.fill();
      // 遠方的奇儂鎮
      ctx.fillStyle = "#8aa0b0"; for (let i = 0; i < 9; i++) ctx.fillRect(80 + i * 46, hz - 30 - (i % 3) * 12, 36, 30 + (i % 3) * 12);
      const sea = ctx.createLinearGradient(0, hz, 0, H); sea.addColorStop(0, "#3f8fbf"); sea.addColorStop(1, "#1f5a82");
      ctx.fillStyle = sea; ctx.fillRect(0, hz, W, H - hz);
      ctx.strokeStyle = "rgba(255,255,255,.28)"; ctx.lineWidth = 2;
      for (let y = hz + 20; y < H; y += 36) for (let x = -40; x < W; x += 110) {
        const o = Math.sin(now / 800 + x * 0.03 + y * 0.05) * 14;
        ctx.beginPath(); ctx.moveTo(x + o, y); ctx.quadraticCurveTo(x + 20 + o, y - 7, x + 40 + o, y); ctx.stroke();
      }
      drawLine(now);
      // 釣竿、船頭
      ctx.strokeStyle = "#6b4a2a"; ctx.lineWidth = 8; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(1200, 620); ctx.lineTo(1020, 330 + (st.mode === "bite" && st.phase === "pull" ? Math.sin(now / 50) * 6 : 0)); ctx.stroke();
      ctx.fillStyle = "#8a5a32"; ctx.strokeStyle = "#4a2e14"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, 600); ctx.quadraticCurveTo(640, 540, 1280, 600); ctx.lineTo(1280, 720); ctx.lineTo(0, 720); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(0,0,0,.2)"; ctx.lineWidth = 2;
      for (let y = 625; y < 720; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.quadraticCurveTo(640, y - 40, 1280, y); ctx.stroke(); }
    }
    function frame(now) {
      if (st.done || !wrap.isConnected) return;
      const dt = st.last ? Math.min(0.1, (now - st.last) / 1000) : 0; st.last = now;
      if (st.mode === "cast" && now >= st.biteAt) bite(now);
      if (st.mode === "bite") {
        if (now >= st.phaseEnd) newPhase(now);
        if (st.prog >= 100) finish();
        else {
          // 進度自然下滑：連點期間每秒 -3.6，「停！」期間放慢成每秒 -1.2
          st.prog = Math.max(0, st.prog - dt * (st.phase === "stop" ? 1.2 : 3.6)); barI.style.width = `${st.prog}%`;
        }
      }
      draw(now);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    // 除錯：馬上上鉤
    R.Fishing.debug = { skip() { st.biteAt = performance.now(); }, fill() { st.prog = 100; }, st, catchIt };
  }

  R.Fishing = { TIERS, CATCH, roll, odds, start };
})();
