/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/recommend.js": "20261122223322" });
// 索德綜合學院的推薦信（S 級時空 #SW00003）
//   進入前要先填一封「特殊交換學生」的推薦信：目前角色的全名＋選一間分校
//   分校決定：出生點、可接的委託、可玩的玩法（各校的特色技巧）、陣營
//   瑪莉卡固定進入自己的分校（埃里托德）。地圖還沒做，出生點先存成代號
//   R.Recommend.open(角色 id, onDone, {preview}) 跳出信；get / allows / spawn 給時空程式用
(function () {
  const R = (window.RPG = window.RPG || {});
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // 全名（使用者提供的原文）。flicker＝名字會閃成另一個；scrawl＝本名被塗改掉
  const NAMES = {
    firsler: { full: "弗爾斯勒" },
    ilshu: { full: "伊爾舒 諾底帕絲" },
    vivilla: { full: "薇薇拉 卡莉法" },
    guan: { full: "乾默存" },
    hoffman: { full: "霍夫曼 奧本" },
    marika: { full: "瑪莉卡 米迦勒" },
    cangyou: { full: "蒼幽" },
    youyan: { full: "魔法少女★悠魘", flicker: "六本木菜奈" },
    phantom: { full: "魅影", scrawl: "千彩媛" },
    bastian: { full: "巴斯提安 德爾特羅" },
    miyahime: { full: "彌華姬" },
  };

  // 三間分校（名稱、劍術流派來自使用者的設定；出生點代號、玩法、陣營是 Claude 的暫定）
  //   推薦人固定是酒保蓋里奧（使用者 11/22）
  const SCHOOLS = {
    lunshan: {
      n: "崙山分校", style: "中國劍術", c: "#3a8a6a", sign: "時空酒館的酒保・蓋里奧", sword: "邪劍／神兵",
      spawn: { id: "sw/lunshan-gate", n: "崙山山門", desc: "石階的盡頭、梅花樁和後山劍池的入口" },
      play: "輕功課：梅花樁、屋頂奔跑（崙山的師叔雲崖教）",
      faction: "崙山派", rel: "紅蓮流：中立　埃里托德：中立",
      quests: ["SW00003-04", "SW00003-07", "SW00003-08", "SW00003-13"],
    },
    guren: {
      n: "紅蓮流分校", style: "日本劍術", c: "#b83a3a", sign: "時空酒館的酒保・蓋里奧", sword: "妖刀／名刀",
      spawn: { id: "sw/guren-dojo", n: "紅蓮流道場", desc: "道場前的庭院、神社和鑄刀鋪在旁邊" },
      play: "居合課：坐禪、拔刀（紅蓮流的師範千鶴教）",
      faction: "紅蓮流派", rel: "崙山：中立　埃里托德：中立",
      quests: ["SW00003-05", "SW00003-09", "SW00003-10", "SW00003-14"],
    },
    erit: {
      n: "埃里托德分校", style: "西洋劍術", c: "#3a5ea8", sign: "時空酒館的酒保・蓋里奧", sword: "魔刃／神劍",
      spawn: { id: "sw/erit-gate", n: "埃里托德校門", desc: "騎士團的操場、禁劍室的圖書館和聖堂在裡面" },
      play: "決鬥禮：脫帽、報名號、丟手套，指名對手（埃里托德的騎士團長艾德蒙教）",
      faction: "埃里托德派", rel: "崙山：中立　紅蓮流：中立",
      quests: ["SW00003-06", "SW00003-11", "SW00003-12", "SW00003-15", "SW00003-16"],
    },
  };
  const COMMON = ["SW00003-01", "SW00003-02", "SW00003-03"];       // 三校交流賽、校旗、參訪證：不分校
  const LOCKED = { marika: "erit" };                                // 固定進入自己的分校

  const PREVIEW = "rpg.letterPreview";
  const rd = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 忽略 */ } };

  const api = {
    NAMES, SCHOOLS, COMMON,
    fullName(id) { return NAMES[id]?.full || R.CHARACTERS?.[id]?.name || ""; },
    locked(id) { return LOCKED[id] || null; },
    // 這輪冒險寫好的信（沒有冒險時看預覽用的）
    get(id) {
      const a = R.Adventure?.get?.(), l = (a && a.letter) || rd(PREVIEW);
      return l && (!id || l.char === id) && SCHOOLS[l.school] ? l : null;
    },
    write(id, school) {
      if (LOCKED[id]) school = LOCKED[id];
      if (!SCHOOLS[school]) return null;
      const l = { char: id, name: api.fullName(id), school, at: Date.now() }, a = R.Adventure?.get?.();
      if (a) { a.letter = l; R.Adventure.save(a); } else wr(PREVIEW, l);
      return l;
    },
    spawn(id) { const l = api.get(id); return l ? SCHOOLS[l.school].spawn : null; },
    faction(id) { const l = api.get(id); return l ? SCHOOLS[l.school].faction : null; },
    // 這封信允許的委託（沒寫信＝都不行）
    allows(questId, id) { const l = api.get(id); return !!l && (COMMON.includes(questId) || SCHOOLS[l.school].quests.includes(questId)); },
    questsOf(id) { const l = api.get(id); return l ? [...COMMON, ...SCHOOLS[l.school].quests] : []; },
  };

  let root = null;
  function css() {
    if (document.getElementById("rcCss")) return;
    const st = document.createElement("style"); st.id = "rcCss";
    st.textContent = `
      .rc-ov { position: fixed; inset: 0; z-index: 9998; display: grid; place-items: center; overflow: auto; padding: 14px; background: rgba(8,8,14,.86); font-family: "Noto Serif TC", "Noto Sans TC", serif; }
      .rc-paper { width: min(720px, 100%); background: #fbf5e4 linear-gradient(#fbf5e4, #f1e7cc); color: #2a2218; border: 2px solid #8a7550; border-radius: 4px; padding: 22px 26px 20px; box-shadow: 0 14px 40px rgba(0,0,0,.6); position: relative; }
      .rc-paper::before { content: ""; position: absolute; inset: 6px; border: 1px solid #c8b78a; pointer-events: none; }
      .rc-paper h2 { margin: 0 0 4px; text-align: center; letter-spacing: .4em; font-size: 24px; }
      .rc-paper .rc-to { text-align: center; font-size: 12px; color: #6a5a3a; margin-bottom: 14px; }
      .rc-row { display: flex; gap: 10px; align-items: baseline; margin: 8px 0; font-size: 15px; }
      .rc-row > b { flex: none; width: 5.5em; color: #6a5a3a; }
      .rc-name { font-size: 22px; font-weight: 900; border-bottom: 2px solid #2a2218; padding: 0 10px; min-width: 6em; position: relative; display: inline-block; }
      .rc-name .old { position: absolute; left: 10px; top: 2px; color: #7a6a50; text-decoration: line-through wavy #b02a2a; text-decoration-thickness: 2px; font-weight: 400; font-size: 20px; opacity: .8; }
      .rc-name.scrawl { padding-top: 14px; } .rc-name.scrawl .new { display: inline-block; transform: rotate(-4deg); color: #1a2a6a; font-style: italic; margin-left: 1.6em; }
      .rc-name.flicker .a, .rc-name.flicker .b { animation: rcFl 6s steps(1) infinite; }
      .rc-name.flicker .b { position: absolute; left: 10px; opacity: 0; animation-name: rcFl2; color: #c03a8a; }
      @keyframes rcFl { 0%, 86%, 92%, 100% { opacity: 1; } 87%, 91% { opacity: 0; } }
      @keyframes rcFl2 { 0%, 86%, 92%, 100% { opacity: 0; } 87%, 91% { opacity: 1; } }
      .rc-schools { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 10px 0 12px; }
      .rc-school { text-align: left; font: inherit; cursor: pointer; padding: 10px; border: 2px solid var(--sc); background: #fffaf0; color: inherit; border-radius: 4px; display: flex; flex-direction: column; gap: 4px; }
      .rc-school b { color: var(--sc); font-size: 16px; } .rc-school small { font-size: 12px; line-height: 1.5; color: #4a3f2c; }
      .rc-school[aria-pressed="true"] { background: color-mix(in srgb, var(--sc) 14%, #fffaf0); box-shadow: 0 0 0 3px var(--sc); }
      .rc-school:disabled { opacity: .35; cursor: not-allowed; }
      .rc-eff { margin: 0; padding: 8px 10px; background: rgba(120,100,60,.1); font-size: 13px; line-height: 1.7; min-height: 6.4em; }
      .rc-eff b { color: #6a5a3a; }
      .rc-sign { text-align: right; margin: 12px 0 8px; font-size: 14px; min-height: 1.5em; }
      .rc-btns { display: flex; justify-content: flex-end; gap: 10px; }
      .rc-btns button { font: inherit; padding: 8px 18px; border-radius: 4px; cursor: pointer; border: 2px solid #5a4a2a; background: #fffaf0; }
      .rc-btns button.go { background: #7a1f1f; color: #fff; border-color: #4a1010; } .rc-btns button:disabled { opacity: .4; cursor: not-allowed; }
      .rc-note { font-size: 12px; color: #8a2a2a; margin: 6px 0 0; }
      @media (max-width: 600px) { .rc-schools { grid-template-columns: 1fr; } }`;
    document.head.appendChild(st);
  }

  function nameHtml(id) {
    const n = NAMES[id] || { full: api.fullName(id) };
    if (n.scrawl) return `<span class="rc-name scrawl"><span class="old">${esc(n.scrawl)}</span><span class="new">${esc(n.full)}</span></span>`;
    if (n.flicker) return `<span class="rc-name flicker"><span class="a">${esc(n.full)}</span><span class="b">${esc(n.flicker)}</span></span>`;
    return `<span class="rc-name">${esc(n.full)}</span>`;
  }

  // 打開推薦信。onDone(信)：遞交之後；opts.preview：預覽（不是真的要進時空，可以重寫）
  function open(charId, onDone, opts = {}) {
    const ch = R.CHARACTERS?.[charId];
    if (!ch) { onDone?.(null); return; }
    css(); root?.remove();
    const lock = api.locked(charId), old = api.get(charId);
    if (old && !opts.preview) { onDone?.(old); return; }                 // 這輪冒險已經遞交過了
    let pick = lock || old?.school || null;
    root = document.createElement("div"); root.className = "rc-ov"; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "推薦信");
    const render = () => {
      const S = pick ? SCHOOLS[pick] : null;
      root.innerHTML = `<div class="rc-paper">
        <h2>推　薦　信</h2><div class="rc-to">致　索德綜合學院　中央競技場接待處（特殊交換學生）</div>
        <div class="rc-row"><b>被推薦人</b>${nameHtml(charId)}</div>
        <div class="rc-row"><b>就讀分校</b><span>${S ? esc(S.n) + "（" + esc(S.style) + "）" : "（請在下面選一間）"}</span></div>
        <div class="rc-schools">${Object.entries(SCHOOLS).map(([k, s]) => `<button type="button" class="rc-school" style="--sc:${s.c}" data-k="${k}" aria-pressed="${pick === k}" ${lock && lock !== k ? "disabled" : ""}><b>${esc(s.n)}</b><small>${esc(s.style)}・${esc(s.sword)}<br>出生點：${esc(s.spawn.n)}</small></button>`).join("")}</div>
        <p class="rc-eff">${S ? `<b>出生點</b>　${esc(S.spawn.n)}——${esc(S.spawn.desc)}<br><b>可接委託</b>　${COMMON.concat(S.quests).length} 張（三校共通 ${COMMON.length} 張＋${esc(S.n)} ${S.quests.length} 張）<br><b>玩法</b>　${esc(S.play)}<br><b>陣營</b>　${esc(S.faction)}（${esc(S.rel)}）` : "選了分校之後，這裡會寫出出生點、可接的委託、玩法和陣營。"}</p>
        ${lock ? `<p class="rc-note">${esc(ch.name)}是${esc(SCHOOLS[lock].n)}的人，只能回自己的分校。</p>` : ""}
        <div class="rc-sign">${S ? `推薦人：${esc(S.sign)}` : ""}</div>
        <div class="rc-btns"><button type="button" data-x="cancel">${opts.preview ? "關閉" : "還沒準備好"}</button><button type="button" class="go" data-x="send" ${pick ? "" : "disabled"}>封緘並遞交</button></div></div>`;
    };
    render();
    document.body.appendChild(root);
    root.addEventListener("click", (e) => {
      const k = e.target.closest("[data-k]"), x = e.target.closest("[data-x]");
      if (k && !k.disabled) { pick = k.dataset.k; render(); }
      else if (x?.dataset.x === "cancel") { close(); onDone?.(null); }
      else if (x?.dataset.x === "send" && pick) { const l = api.write(charId, pick); close(); onDone?.(l); }
    });
  }
  function close() { root?.remove(); root = null; }

  R.Recommend = Object.assign(api, { open, close });
})();
