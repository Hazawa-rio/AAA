/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/volume.js": "20261113212359" });
// 音量：音效、音樂分開調（存在這台電腦的瀏覽器裡）。所有頁面共用
// R.CONFIG.volume／bgmVolume 讀出來的值會自動乘上玩家調的比例；調整時發出 "rpg:volume" 事件，正在播的音樂跟著變
// R.VolumeUI.mount(元素)：在元素後面放一個「音量」按鈕（點開兩條拉桿）
(function () {
  const R = (window.RPG = window.RPG || {});
  const C = R.CONFIG;
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* 忽略 */ } } };
  const read = (k) => { const v = parseFloat(store.get(k)); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1; };
  const V = (R.Volume = {
    sfx: read("rpg.vol.sfx"), bgm: read("rpg.vol.bgm"),
    set(kind, v) {
      V[kind] = Math.max(0, Math.min(1, v));
      store.set(`rpg.vol.${kind}`, String(V[kind]));
      window.dispatchEvent(new CustomEvent("rpg:volume", { detail: { kind } }));
    },
    music: (base) => base * V.bgm,          // 頁面自己的音樂（例如酒館的爵士樂）用這個乘
  });
  if (C) {
    const base = { volume: C.volume ?? 0.7, bgmVolume: C.bgmVolume ?? 0.35 };
    for (const [k, kind] of [["volume", "sfx"], ["bgmVolume", "bgm"]])
      Object.defineProperty(C, k, { get: () => Math.min(1, base[k] * V[kind]), set: (v) => { base[k] = v; }, enumerable: true, configurable: true });
  }

  // ===== 介面 =====
  const css = `.vol-wrap{position:relative;display:inline-flex}
    .vol-pop{position:fixed;z-index:9999;background:#fffaf0;border:2px solid #1d1d1f;border-radius:12px;padding:12px 14px;box-shadow:0 6px 18px rgba(0,0,0,.18);width:230px;font-size:13px;color:#1d1d1f}
    .vol-pop.hidden{display:none}.vol-row{display:grid;grid-template-columns:42px 1fr 40px;align-items:center;gap:8px;margin:6px 0}
    .vol-row input{width:100%;accent-color:#d64545}.vol-row b{font-weight:900}.vol-row span{text-align:right;font-variant-numeric:tabular-nums}
    .vol-note{margin:6px 0 0;color:#7a6a5a;font-size:11px}`;
  function mount(after, opt = {}) {
    if (!after || document.getElementById("volBtn")) return;
    if (!document.getElementById("volCss")) { const s = document.createElement("style"); s.id = "volCss"; s.textContent = css; document.head.appendChild(s); }
    const btn = document.createElement("button");
    btn.id = "volBtn"; btn.type = "button"; btn.className = opt.cls || "ghost"; btn.textContent = "音量";
    btn.setAttribute("aria-haspopup", "dialog"); btn.setAttribute("aria-expanded", "false");
    const pop = document.createElement("div");
    pop.className = "vol-pop hidden"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "音量");
    const row = (kind, label) => `<label class="vol-row"><b>${label}</b><input type="range" min="0" max="100" step="5" data-vol="${kind}" value="${Math.round(V[kind] * 100)}"><span data-vv="${kind}">${Math.round(V[kind] * 100)}%</span></label>`;
    pop.innerHTML = row("bgm", "音樂") + row("sfx", "音效") + `<p class="vol-note">${opt.note || "「音效開／關」是全部靜音的開關"}</p>`;
    after.insertAdjacentElement("afterend", btn);
    document.body.appendChild(pop);
    const place = () => { const r = btn.getBoundingClientRect(); pop.style.top = `${r.bottom + 6}px`; pop.style.left = `${Math.max(8, Math.min(window.innerWidth - 246, r.right - 230))}px`; };
    btn.addEventListener("click", (e) => { e.stopPropagation(); const open = pop.classList.toggle("hidden") === false; btn.setAttribute("aria-expanded", String(open)); if (open) place(); });
    pop.addEventListener("click", (e) => e.stopPropagation());
    pop.addEventListener("keydown", (e) => e.stopPropagation());
    pop.addEventListener("input", (e) => {
      const k = e.target.dataset.vol; if (!k) return;
      V.set(k, e.target.value / 100);
      pop.querySelector(`[data-vv="${k}"]`).textContent = `${e.target.value}%`;
    });
    // 放開音效拉桿時試播一聲
    pop.addEventListener("change", (e) => { if (e.target.dataset.vol === "sfx") { try { const a = new Audio("sounds/turn-start.mp3"); a.volume = Math.min(1, (C ? C.volume : 0.7)); a.play().catch(() => {}); } catch (err) { /* 忽略 */ } } });
    document.addEventListener("click", () => { pop.classList.add("hidden"); btn.setAttribute("aria-expanded", "false"); });
    window.addEventListener("resize", () => { if (!pop.classList.contains("hidden")) place(); });
  }
  R.VolumeUI = { mount };
})();
