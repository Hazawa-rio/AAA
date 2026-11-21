/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/fate-ui.js": "20261122024623" });
// 抉擇命運：命路的 ◆ 節點，到了等級、離開戰鬥之後（下一個頁面打開時）跳出來
//   從這條命路的命運卡池抽兩張，選一張（js/fate.js 的 R.Fate.draw）；連續升了好幾級就一張一張抉擇
//   命路：冒險開始、進入第一個時空時選（時空地圖頁、這輪冒險還沒選）
//   特定角色的命運卡有自己的牌組名、標籤、卡面形狀（R.Fate.deck）
//   R.FateUI.check(角色 id, onDone)：有要抉擇的就跳出來；頁面打開時會自己檢查一次（酒館、時空地圖、戰鬥頁）
(function () {
  const R = (window.RPG = window.RPG || {});
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let root = null, busy = false;

  function css() {
    if (document.getElementById("fateCss")) return;
    const st = document.createElement("style"); st.id = "fateCss";
    st.textContent = `
      .fate-ov { position: fixed; inset: 0; z-index: 9999; display: grid; place-items: center; background: radial-gradient(circle at 50% 40%, rgba(40,24,60,.82), rgba(6,4,12,.94)); font-family: "Noto Sans TC", sans-serif; padding: 16px; }
      .fate-box { width: min(760px, 100%); text-align: center; color: #f4eefc; }
      .fate-box h2 { margin: 0; font-size: clamp(24px, 4vw, 34px); letter-spacing: .3em; color: #e8d0ff; text-shadow: 0 0 18px rgba(200,150,255,.6); }
      .fate-box .sub { margin: 6px 0 18px; font-size: 13px; color: #c8b8e0; }
      .fate-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; perspective: 900px; }
      .fate-card { position: relative; text-align: left; display: flex; flex-direction: column; gap: 8px; padding: 18px 16px 16px; min-height: 220px; border-radius: 14px; border: 3px solid var(--fc); color: #1d1d1f;
        background: linear-gradient(170deg, #fffdf8, color-mix(in srgb, var(--fc) 12%, #fff)); box-shadow: 0 10px 30px rgba(0,0,0,.45); cursor: pointer; font: inherit;
        animation: fateIn .7s cubic-bezier(.2,.8,.3,1.2) both; transform-origin: 50% 100%; transition: transform .15s, box-shadow .15s; }
      .fate-card:nth-child(2) { animation-delay: .18s; }
      .fate-card:hover, .fate-card:focus-visible { transform: translateY(-6px) rotate(-.6deg); box-shadow: 0 16px 36px rgba(0,0,0,.55), 0 0 0 4px color-mix(in srgb, var(--fc) 40%, transparent); outline: none; }
      .fate-card .gem { position: absolute; top: -14px; left: 50%; transform: translateX(-50%) rotate(45deg); width: 22px; height: 22px; background: var(--fc); border: 3px solid #fff; }
      .fate-card b { font-size: 19px; }
      .fate-card small { color: #6a5a7a; font-size: 12px; }
      .fate-card .eff { font-size: 14px; line-height: 1.6; }
      .fate-card .trial { margin-top: auto; font-size: 13px; line-height: 1.55; color: #b0304a; background: rgba(176,48,74,.08); border-radius: 8px; padding: 6px 8px; }
      .fate-card.route { min-height: 160px; }
      /* 卡面形狀 */
      .fate-card.shape-mushroom { border-radius: 50% 50% 14px 14px / 34% 34% 14px 14px; padding-top: 34px;
        background: radial-gradient(circle at 22% 14%, rgba(255,255,255,.9) 0 9px, transparent 10px), radial-gradient(circle at 70% 9%, rgba(255,255,255,.9) 0 7px, transparent 8px), linear-gradient(170deg, #fffdf8, color-mix(in srgb, var(--fc) 16%, #fff)); }
      .fate-card.shape-gear { border-radius: 6px; clip-path: polygon(8% 0, 92% 0, 100% 6%, 100% 94%, 92% 100%, 8% 100%, 0 94%, 0 6%); box-shadow: inset 0 0 0 3px var(--fc), 0 10px 30px rgba(0,0,0,.45);
        background: repeating-linear-gradient(90deg, color-mix(in srgb, var(--fc) 35%, #fff) 0 14px, transparent 14px 28px) top / 100% 8px no-repeat, linear-gradient(170deg, #f8f6f0, #e8e2d4); }
      .fate-card.shape-crystal { clip-path: polygon(50% 0, 100% 9%, 100% 91%, 50% 100%, 0 91%, 0 9%); padding: 34px 18px 34px; box-shadow: inset 0 0 0 3px var(--fc); border-radius: 0; }
      .fate-card.shape-blade { clip-path: polygon(0 0, 86% 0, 100% 12%, 100% 100%, 14% 100%, 0 88%); box-shadow: inset 0 0 0 3px var(--fc); border-radius: 0; }
      .fate-card.shape-fan { border-radius: 50% 50% 12px 12px / 22% 22% 12px 12px; padding-top: 30px;
        background: repeating-conic-gradient(from 270deg at 50% 100%, color-mix(in srgb, var(--fc) 10%, #fff) 0 6deg, #fffdf8 6deg 12deg); }
      .fate-card.shape-talisman { border-radius: 3px; background: linear-gradient(#c83a2a 0 10px, #fbf0c8 10px); border-color: #c83a2a; }
      .fate-card.shape-talisman::after { content: "符"; position: absolute; right: 10px; bottom: 8px; width: 30px; height: 30px; display: grid; place-items: center; border: 2px solid #c83a2a; color: #c83a2a; font-weight: 900; transform: rotate(-8deg); }
      .fate-card .eff-k { font-weight: 900; color: color-mix(in srgb, var(--fc) 80%, #000); }
      @keyframes fateIn { from { opacity: 0; transform: rotateY(90deg) translateY(30px); } to { opacity: 1; transform: none; } }
      @media (max-width: 600px) { .fate-cards { grid-template-columns: 1fr; } }`;
    document.head.appendChild(st);
  }
  function show(html, onPick) {
    css();
    root?.remove();
    root = document.createElement("div"); root.className = "fate-ov"; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "抉擇命運");
    root.innerHTML = html;
    document.body.appendChild(root);
    root.addEventListener("click", (e) => { const b = e.target.closest("[data-pick]"); if (b) onPick(b.dataset.pick); });
    setTimeout(() => root?.querySelector("[data-pick]")?.focus(), 50);
  }
  function close() { root?.remove(); root = null; }

  function check(charId, onDone) {
    const ch = R.CHARACTERS?.[charId], P = R.Progress, F = R.Fate;
    if (!ch || !P || !F?.routes(ch) || busy) { onDone?.(); return false; }
    const build = P.load(ch.id), d = P.derive(ch, build), rs = F.routes(ch);
    // 先選命路：冒險開始、進入第一個時空時（時空地圖頁）
    if (build.route == null) {
      if (!/world\.html/.test(location.pathname)) { onDone?.(); return false; }
      busy = true;
      show(`<div class="fate-box"><h2>選擇命路</h2><p class="sub">${esc(ch.name)} 踏進了這輪冒險的第一個時空。兩條路，這輪冒險只能走一條</p>
        <div class="fate-cards">${rs.map((r, i) => `<button type="button" class="fate-card route" style="--fc:${r.c}" data-pick="${i}"><span class="gem"></span><b>${esc(r.n)}</b><span class="eff">${esc(r.desc)}</span>
          <small>Lv 10：${esc(F.info(ch, r[10]).name)}・Lv 20 大招：${esc(F.wUp(ch, r)?.name || "")}・Lv 30：${esc(F.info(ch, r[30]).name)}</small></button>`).join("")}</div></div>`,
        (k) => { build.route = Number(k); build.nodes = {}; build.draws = {}; P.save(ch.id, build); close(); busy = false; check(charId, onDone); });
      return true;
    }
    const L = F.pending(ch, build, d.level);
    if (L == null) { onDone?.(); return false; }
    busy = true;
    const r = rs[build.route], pool = F.pool(r), two = F.draw(ch, build, L), dk = F.deck(ch);
    P.save(ch.id, build);                              // 抽到的兩張先存起來（重新整理不會重抽）
    show(`<div class="fate-box"><h2>抉擇命運</h2><p class="sub">${esc(ch.name)}・${esc(r.n)}・Lv ${L}——從 ${pool.length} 張${esc(dk.n)}裡抽出了兩張。選一張，同時承受它的${esc(dk.trial)}</p>
      <div class="fate-cards">${two.map((i) => { const x = F.info(ch, pool[i]); return `<button type="button" class="fate-card shape-${dk.shape}" style="--fc:${r.c}" data-pick="${i}">${dk.shape === "card" ? `<span class="gem"></span>` : ""}
        <small>${esc(dk.n)}</small><b>${esc(x.name)}</b><span class="eff"><span class="eff-k">${esc(dk.eff)}</span>：${esc(x.desc)}</span><span class="trial">${esc(dk.trial)}：${esc(x.trial || "無")}</span></button>`; }).join("")}</div></div>`,
      (k) => {
        build.nodes = build.nodes || {}; build.nodes[L] = Number(k); delete build.draws[L];
        P.save(ch.id, build); close(); busy = false;
        check(charId, onDone);                          // 連升好幾級：下一張
      });
    return true;
  }

  // 頁面打開時檢查一次（離開戰鬥後回到的地方）
  function auto() {
    let id = null;
    try {
      const qs = new URLSearchParams(location.search);
      if (/world\.html/.test(location.pathname)) id = JSON.parse(localStorage.getItem("rpg.trip") || "null")?.char;
      else if (/battle\.html/.test(location.pathname)) id = qs.get("char");
      if (!id) id = localStorage.getItem("rpg.char");
    } catch (e) { id = null; }
    if (id) check(id);
  }
  window.addEventListener("load", () => setTimeout(auto, 400));

  R.FateUI = { check, close };
})();
