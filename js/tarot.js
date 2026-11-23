/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/tarot.js": "20261123215910" });
// 特殊命運卡（塔羅）：戰役「命運的考驗」打倒命運的見證者・厄羅德之後，從四張裡選一張（使用者 11/22）
//   每張都有正位（效果）和逆位（考驗）：選了就兩個一起承受（和命路的命運卡「效果＋考驗」一樣；這是 Claude 的假設）
//   「所有玩家」：目前是單人，只套用在自己身上；存在這輪冒險（adventure.flags.tarot），冒險結束就沒了
//   效果在 js/progression.js 的 derive 套用（R.Tarot.mod()）；權杖逆位的寶物格少一格＝R.Items.SLOTS；聖杯正位的回血在 js/battle.js
//   R.Tarot.open(角色 id, onDone)：選卡視窗（寶物欄滿 6 格又選了權杖：先選一個丟掉）
(function () {
  const R = (window.RPG = window.RPG || {});
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // 數值：使用者給的；聖杯正位的「少量生命」＝最大生命的 5%（Claude 暫定）
  const REGEN = 0.05;
  const CARDS = {
    wand: { n: "權杖", c: "#e8302a", up: "所有玩家寶物的增益提升 1.5 倍", down: "所有玩家失去一個寶物格（6 個寶物的話選一個丟棄）", m: { itemMult: 1.5, slotsLost: 1 } },
    cup: { n: "聖杯", c: "#3a6ae8", up: "輪到自己的回合時，回復少量生命（最大生命的 5%）", down: "所有玩家造成的傷害減少至 0.85 倍", m: { regen: REGEN, dmg: 0.85 } },
    sword: { n: "寶劍", c: "#8ab8a0", up: "所有玩家造成的傷害提升 1.5 倍", down: "所有玩家的最大生命值減少至 0.85 倍", m: { dmg: 1.5, hpMult: 0.85 } },
    coin: { n: "金幣", c: "#e8b820", up: "所有玩家增加一點行動點", down: "所有玩家的速度減少至 0.65 倍", m: { ap: 1, spdMult: 0.65 } },
  };
  const ORDER = ["wand", "cup", "sword", "coin"];

  const adv = () => R.Adventure?.get?.() || null;
  // 這輪冒險選了哪張（只在冒險的成長裡生效：選角頁、戰鬥測試用的測試存檔不套用）
  function get() {
    if (!R.Progress?.useAdventure) return null;
    const id = adv()?.flags?.tarot;
    return CARDS[id] ? id : null;
  }
  function mod() { const id = get(); return id ? CARDS[id].m : null; }

  // 圖示：照使用者畫的四把武器（權杖＝紅、聖杯＝藍、寶劍＝淡綠；金幣＝金色的硬幣）
  function icon(id, s = 64) {
    const P = {
      wand: `<line x1="32" y1="26" x2="32" y2="62" stroke="#e8302a" stroke-width="3"/><path d="M32 2 l3 6 6 3-6 3-3 6-3-6-6-3 6-3z" fill="#8a0a1a" stroke="#e8302a" stroke-width="2"/><circle cx="26" cy="19" r="5" fill="#8a0a1a" stroke="#e8302a" stroke-width="2"/><circle cx="38" cy="19" r="5" fill="#8a0a1a" stroke="#e8302a" stroke-width="2"/><path d="M24 30 l8-9 8 9-2 7h-12z" fill="#8a0a1a" stroke="#e8302a" stroke-width="2"/>`,
      cup: `<path d="M16 14 h32 l-10 18 10 22 h-32 l10-22z" fill="#3a46c8" stroke="#1aa0e8" stroke-width="3" stroke-linejoin="round"/><ellipse cx="32" cy="14" rx="16" ry="4" fill="#3a46c8" stroke="#1aa0e8" stroke-width="3"/><path d="M27 34 l5-8 5 8z" fill="none" stroke="#1aa0e8" stroke-width="2"/>`,
      sword: `<path d="M32 2 l4 6 -2 34 h-4 l-2-34z" fill="#c8e4d4" stroke="#b8c8dc" stroke-width="2"/><path d="M20 42 q12-2 24 0 q-12 3 -24 0z" fill="#c8e4d4" stroke="#b8c8dc" stroke-width="2"/><path d="M30 44 h4 l1 12 3 6h-12l3-6z" fill="#c8e4d4" stroke="#b8c8dc" stroke-width="2"/>`,
      coin: `<circle cx="32" cy="32" r="22" fill="#f8c818" stroke="#c89000" stroke-width="3"/><circle cx="32" cy="32" r="15" fill="none" stroke="#c89000" stroke-width="2"/><path d="M32 21 l7 11-7 11-7-11z" fill="#fff3a0" stroke="#c89000" stroke-width="2"/>`,
    };
    return `<svg viewBox="0 0 64 64" width="${s}" height="${s}" aria-hidden="true">${P[id] || ""}</svg>`;
  }

  let root = null;
  function css() {
    if (document.getElementById("taCss")) return;
    const st = document.createElement("style"); st.id = "taCss";
    st.textContent = `
      .ta-ov { position: fixed; inset: 0; z-index: 9999; display: grid; place-items: center; overflow: auto; padding: 14px; background: radial-gradient(circle at 50% 35%, rgba(30,26,60,.9), rgba(4,4,10,.96)); font-family: "Noto Sans TC", sans-serif; color: #f2ecff; }
      .ta-box { width: min(980px, 100%); text-align: center; }
      .ta-box h2 { margin: 0; letter-spacing: .35em; font-size: clamp(22px, 4vw, 32px); color: #e8d8ff; text-shadow: 0 0 18px rgba(170,140,255,.6); }
      .ta-box .sub { margin: 6px 0 16px; font-size: 13px; color: #c4b8e0; }
      .ta-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; perspective: 900px; }
      .ta-card { font: inherit; color: #1d1a28; cursor: pointer; display: flex; flex-direction: column; align-items: stretch; gap: 0; min-height: 330px; padding: 0; border: 3px solid var(--tc); border-radius: 12px; overflow: hidden;
        background: linear-gradient(#fbf6e8, #efe6cc); box-shadow: 0 10px 28px rgba(0,0,0,.5); animation: taIn .7s cubic-bezier(.2,.8,.3,1.2) backwards; transition: transform .45s cubic-bezier(.3,.7,.3,1.15), box-shadow .15s; }
      .ta-card:nth-child(2) { animation-delay: .12s; } .ta-card:nth-child(3) { animation-delay: .24s; } .ta-card:nth-child(4) { animation-delay: .36s; }
      /* 滑鼠擺上去（或鍵盤選到）：整張卡反過來，看逆位的效果 */
      .ta-card:hover, .ta-card:focus-visible { transform: rotate(180deg); box-shadow: 0 16px 34px rgba(0,0,0,.6), 0 0 0 4px color-mix(in srgb, var(--tc) 50%, transparent); outline: none; }
      .ta-half { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 4px; padding: 10px 12px; font-size: 13px; line-height: 1.55; }
      .ta-half b { font-size: 12px; letter-spacing: .2em; color: color-mix(in srgb, var(--tc) 75%, #000); }
      .ta-mid { display: grid; place-items: center; gap: 2px; padding: 8px 0; background: color-mix(in srgb, var(--tc) 18%, #1d1a28); color: #fff; }
      .ta-mid strong { font-size: 22px; letter-spacing: .5em; padding-left: .5em; }
      .ta-half.down { transform: rotate(180deg); background: rgba(120,20,40,.07); color: #6a1a2a; }
      .ta-half.down b { color: #8a1a2a; }
      .ta-half { transition: opacity .3s, background .3s; }
      .ta-card:hover .ta-half:not(.down), .ta-card:focus-visible .ta-half:not(.down) { opacity: .45; }
      .ta-card:hover .ta-half.down, .ta-card:focus-visible .ta-half.down { background: rgba(160,30,50,.16); }
      .ta-hint { margin: 10px 0 0; font-size: 12px; color: #a89cc8; }
      .ta-list { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 8px; }
      .ta-list button { font: inherit; cursor: pointer; padding: 10px 14px; border-radius: 8px; border: 2px solid #c8b8e8; background: #2a2440; color: #f2ecff; display: flex; gap: 8px; align-items: center; }
      .ta-list button:hover, .ta-list button:focus-visible { background: #3a3260; outline: none; }
      @keyframes taIn { from { opacity: 0; transform: rotateY(90deg) translateY(30px); } to { opacity: 1; transform: none; } }
      @media (max-width: 760px) { .ta-cards { grid-template-columns: 1fr 1fr; } }`;
    document.head.appendChild(st);
  }
  function show(html, onClick) {
    css(); root?.remove();
    root = document.createElement("div"); root.className = "ta-ov"; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "特殊命運卡");
    root.innerHTML = html; document.body.appendChild(root);
    root.addEventListener("click", (e) => { const b = e.target.closest("[data-pick]"); if (b) onClick(b.dataset.pick); });
    setTimeout(() => root?.querySelector(".ta-list [data-pick]")?.focus(), 60);     // 選卡的時候不自動選到第一張（不然它一打開就是反過來的）
  }
  function close() { root?.remove(); root = null; }

  // 存起來（這輪冒險）
  function choose(id) {
    const a = adv(); if (!a || !CARDS[id]) return false;
    a.flags = { ...(a.flags || {}), tarot: id };
    R.Adventure.save(a);
    return true;
  }

  // 選卡視窗：onDone(選的卡 id)
  function open(charId, onDone) {
    show(`<div class="ta-box"><h2>命運的考驗</h2><p class="sub">命運的見證者・厄羅德留下了四張特殊命運卡。選一張——正位的效果和逆位的考驗會一起落在所有玩家身上（這輪冒險有效）</p>
      <div class="ta-cards">${ORDER.map((id) => { const C = CARDS[id]; return `<button type="button" class="ta-card" style="--tc:${C.c}" data-pick="${id}" aria-label="「${C.n}」正位：${esc(C.up)}；逆位：${esc(C.down)}">
        <span class="ta-half"><b>正位</b>${esc(C.up)}</span><span class="ta-mid">${icon(id, 70)}<strong>${C.n}</strong></span><span class="ta-half down"><b>逆位</b>${esc(C.down)}</span></button>`; }).join("")}</div><p class="ta-hint">滑鼠擺在卡上會把卡反過來，看逆位的考驗</p></div>`,
    (id) => {
      const P = R.Progress, build = P?.load(charId);
      // 權杖逆位：寶物欄少一格；6 個寶物的話先選一個丟掉
      if (id === "wand" && build && (build.items || []).length >= 6) {
        const items = build.items.slice(0, 6);
        show(`<div class="ta-box"><h2>權杖・逆位</h2><p class="sub">寶物格少了一格。選一個寶物丟掉</p>
          <div class="ta-list">${items.map((t) => { const it = R.Items?.get(t); return `<button type="button" data-pick="${esc(t)}">${R.Items?.slotHtml(t) || ""}<span>${esc(it?.name || t)}</span></button>`; }).join("")}</div></div>`,
        (drop) => {
          const b2 = P.load(charId); b2.items = (b2.items || []).filter((x) => x !== drop); P.save(charId, b2);
          choose(id); close(); onDone?.(id, drop);
        });
        return;
      }
      choose(id); close(); onDone?.(id, null);
    });
  }

  R.Tarot = { CARDS, ORDER, REGEN, get, mod, choose, open, close, icon };
})();
