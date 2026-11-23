/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/factions.js": "20261123215910" });
// S 級時空的陣營（使用者 11/23）：S 開始只有「選擇陣營」——進入時空前先表態，決定出生點、可接的委託、敵我、玩法
//   #SW00003 索德綜合學院：推薦信（js/recommend.js，這裡只是轉接）
//   #WW00001 壕溝和血：緊急徵集令——協約國／同盟國
//   #NP12091 諾底帕王國：詢問心中的信仰——力量（受難之日的混沌教派）／律法（王國一派）／榮耀（聖騎一派）
//   #PD11111 悖論：加入一個「假想時空」的學派——畸變博物／灰燼史觀／逆向造物，或自己創造學派
//     自創學派：用學派名稱在 C～A 級時空裡找「對應的時空」（遊戲放在 GitHub Pages，沒辦法真的問 AI，
//     所以是本機的關鍵字比對：每個時空一組關鍵字＋名稱、簡介的字詞重疊），那個時空會出現時間悖論現象：敵人變強、寶物變強
//   存在這輪冒險：adventure.factions[時空]；沒有冒險時（酒館預覽）存在 rpg.factionPreview
//   R.Factions.open(時空, 角色, onDone, {preview})、get(時空)、has(時空)、allows(時空, 委託 id)
//   出生點目前只是代號（地圖還沒做）；數值、對應都是 Claude 的暫定
(function () {
  const R = (window.RPG = window.RPG || {});
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // 悖論：時間悖論現象（敵人強度、寶物強度的倍率；暫定）
  const PARADOX = { enemy: 1.3, loot: 1.3 };

  const DEFS = {
    WW00001: {
      title: "緊急徵集令", kind: "draft", btn: "簽名並報到", preview: "📜 看看緊急徵集令（預覽）",
      intro: "戰爭已經開始。凡是收到本令者，限期向所屬陣營的前線指揮部報到。請選擇你要為哪一方而戰。",
      opts: {
        entente: { n: "協約國", sub: "法蘭西・不列顛・俄羅斯……", c: "#2a4a8a", faction: "協約國", spawn: { id: "ww/entente-trench", n: "西側的壕溝（協約國陣地）" }, foe: "同盟國的士兵", quests: ["WW00001-01", "WW00001-02"], play: "先活下來：炮擊、毒氣、補給線，在泥濘裡撐過每一個早上" },
        central: { n: "同盟國", sub: "德意志・奧匈・鄂圖曼……", c: "#5a4a2a", faction: "同盟國", spawn: { id: "ww/central-trench", n: "東側的壕溝（同盟國陣地）" }, foe: "協約國的士兵", quests: ["WW00001-01", "WW00001-02"], play: "先活下來：炮擊、毒氣、補給線，在泥濘裡撐過每一個早上" },
      },
    },
    NP12091: {
      title: "心中的信仰", kind: "faith", btn: "立下誓言", preview: "🕯 回答心中的信仰（預覽）",
      intro: "王國的告解室裡，一個看不見臉的聲音問你：「在你的心中，什麼才值得信仰？」",
      opts: {
        power: { n: "力量", sub: "信仰受難之日的混沌教派", c: "#7a1a4a", faction: "混沌教派", spawn: { id: "np/catacomb", n: "地下墓穴（混沌教的祭壇）" }, foe: "王國、聖騎士團", quests: [], play: "幫使徒用信徒的祈禱捏出偽神" },
        law: { n: "律法", sub: "王國一派", c: "#2a5a9a", faction: "王國一派", spawn: { id: "np/castle", n: "王城" }, foe: "混沌教派、聖騎士團", quests: ["NP12091-01", "NP12091-02"], play: "替國王守住王國：拆掉偽神的祭壇、和聖騎士談判" },
        glory: { n: "榮耀", sub: "聖騎一派", c: "#c8a020", faction: "聖騎一派", spawn: { id: "np/paladin-camp", n: "聖騎士團的營地" }, foe: "混沌教派、王國", quests: [], play: "以神之名拿下王冠，為自己帶來榮耀" },
      },
    },
    PD11111: {
      title: "學派入會申請", kind: "school", btn: "遞交申請", preview: "🔺 加入學派（預覽）",
      intro: "黑色晶體金字塔的每一面都通往一個「假想」時空。觀測員只收有學派的人：選一個學派，或者自己創立一個。",
      opts: {
        aberrant: { n: "畸變博物學派", sub: "假想：晶體與矽基的生態系", c: "#3aa8b8", faction: "畸變博物學派", spawn: { id: "pd/facet-aberrant", n: "金字塔的第一面：晶體森林" }, quests: ["PD11111-01", "PD11111-02"],
          world: "生命以「晶體與矽基」而非碳基形式演化的平行生態系。這裡的生物擁有違背現世解剖學的構造" },
        ash: { n: "灰燼史觀學派", sub: "假想：打了好幾百年的戰爭", c: "#8a5a3a", faction: "灰燼史觀學派", spawn: { id: "pd/facet-ash", n: "金字塔的第二面：灰燼戰線" }, quests: ["PD11111-01", "PD11111-02"],
          world: "發生了一場持續好幾百年的戰爭時代，整個世界的技術鍊完全投入戰爭" },
        reverse: { n: "逆向造物學派", sub: "假想：跳過幾個世紀的科技樹", c: "#6a4ac8", faction: "逆向造物學派", spawn: { id: "pd/facet-reverse", n: "金字塔的第三面：奇點之城" }, quests: ["PD11111-01", "PD11111-02"],
          world: "因為某個技術奇點的突然出現，科技樹跳過了數個世紀，然而人類的思維卻沒有跟上" },
        custom: { n: "自己創造學派", sub: "寫下學派名稱，金字塔會轉到最接近的那一面", c: "#c8c8d8", faction: null, quests: ["PD11111-01", "PD11111-02"], custom: true },
      },
    },
  };

  // ===== 自創學派的索引：C～A 級時空的關鍵字（Claude 整理；新的時空記得補） =====
  const INDEX = {
    CI00001: "漁 港 海盜 船 航海 市集 貿易 草原 魔物 鎮 碼頭 寶藏",
    HW01031: "萬聖 節慶 扮演 角色扮演 南瓜 鬼 旅館 慶典 樓層 年代 糖果 怪物 變裝",
    LB00042: "美食 料理 食 烹飪 微波 實驗 研究 科學 哲學 文學 廚 味",
    RT00317: "郵 信 書信 投遞 時間 遲到 午夜 送達 傳遞 寄 收件",
    RU20314: "遺跡 考古 古代 科考 文明 石門 機關 叢林 史前 探險 失落",
    MD01921: "藝術 繪畫 色彩 幾何 抽象 方塊 美學 構成 理想 畫 線條",
    BC00003: "都市 城市 無人機 交通 自動化 科技 未來 智慧 空中 計程車",
    KT33233: "昆蟲 甲蟲 生態 微小 縮小 巨人 蟲 飼育 生物 鍬形 兜蟲",
    MM22330: "蘑菇 菇 真菌 孢子 礦 精靈 魔法 寄生 發光 菌 礦坑",
    CO00756: "雲 天空 潛水 浮空 飛行 氣象 天上 漂浮",
    ER00119: "醫 手術 急診 病 治療 精準 完美 偏執 解剖 醫院 護理",
    BH03278: "抗議 政治 群眾 革命 稅 民主 社會 輿論 新聞 議員 示威",
    CD02016: "童年 懷舊 回憶 記憶 黑市 走私 禁止 過去 違法 懷念",
    MJ44444: "死亡 輪迴 冥 靈魂 因果 怨念 彼岸 往生 業 死者 轉生",
    LI44444: "凶宅 道士 驅邪 鬼 怨 中式 宅 風水 符 民俗 邪 詛咒",
    AQ00618: "水族 海洋 魚 深海 觀賞 珊瑚 鯨 演化 古生物 滄龍 海",
    SP10101: "齒輪 蒸氣 機械 發明 工業 鐘 機關 工程 技術 蒸汽 龐克",
    LG00412: "神話 希臘 眾神 英雄 城邦 神 傳說 雅典 神殿 試煉",
    KN59810: "遊戲 街機 射擊 像素 電玩 數位 程式 虛擬 飛機 空戰",
    LE01557: "文字 書 故事 敘事 小說 語言 結局 劇本 閱讀 作者",
    WP00716: "樂園 遊樂 泳池 水上 度假 療養 娛樂 主題",
    SN00512: "燈塔 冬 雪 寒 漁村 守夜 嚴寒 暴風",
    TR00088: "列車 鐵道 火車 軌道 旅行 循環 環狀 通勤 車站",
  };
  const bigrams = (s) => { const t = String(s || "").replace(/[\s「」『』（）()、，。！？・\-—…]/g, ""); const out = new Set(); for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2)); return out; };
  // 學派名稱 → 對應的時空（回傳 {world, name, why[], score}）
  function match(name) {
    const W = R.Commissions?.WORLDS || {}, q = String(name || "").trim();
    if (!q) return null;
    const qb = bigrams(q);
    let best = null;
    for (const [id, kw] of Object.entries(INDEX)) {
      const w = W[id]; if (!w || w.campaign) continue;
      const why = [];
      let score = 0;
      for (const k of kw.split(/\s+/)) if (k && q.includes(k)) { score += 2 + k.length; why.push(k); }
      const wb = bigrams(w.name + w.summary);
      let ov = 0; for (const g of qb) if (wb.has(g)) { ov++; if (why.length < 6 && !why.includes(g)) why.push(g); }
      score += ov;
      if (!best || score > best.score) best = { world: id, name: w.name, why, score };
    }
    // 完全對不上：金字塔隨便轉到一面（照名字決定，同一個名字永遠同一面）
    if (!best || best.score <= 0) {
      const ids = Object.keys(INDEX).filter((id) => W[id] && !W[id].campaign);
      let h = 0; for (const ch of q) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const id = ids[h % ids.length];
      return { world: id, name: W[id].name, why: [], score: 0, drift: true };
    }
    return best;
  }

  const PREV = "rpg.factionPreview";
  const rd = () => { try { return JSON.parse(localStorage.getItem(PREV)) || {}; } catch (e) { return {}; } };
  const wr = (v) => { try { localStorage.setItem(PREV, JSON.stringify(v)); } catch (e) { /* 忽略 */ } };
  const adv = () => R.Adventure?.get?.() || null;

  function get(world) {
    if (world === "SW00003") { const l = R.Recommend?.get(); return l ? { world, opt: l.school, faction: R.Recommend.SCHOOLS[l.school].faction, char: l.char } : null; }
    const a = adv(), f = (a && a.factions && a.factions[world]) || rd()[world];
    return f && DEFS[world]?.opts[f.opt] ? f : null;
  }
  function save(world, rec) {
    const a = adv();
    if (a) { a.factions = { ...(a.factions || {}), [world]: rec }; R.Adventure.save(a); }
    else { const p = rd(); p[world] = rec; wr(p); }
  }
  // 這個選擇的完整效果
  function effect(world, rec) {
    const D = DEFS[world], o = D?.opts[rec?.opt]; if (!o) return null;
    if (o.custom) { const W = R.Commissions?.WORLDS[rec.map]; return { faction: rec.school, spawn: { id: `pd/facet-${(rec.map || "").toLowerCase()}`, n: `金字塔轉到的那一面：${W?.name || "？"}（悖論版）` }, quests: o.quests, play: `${W?.name || "？"}的假想版本，充滿時間悖論`, paradox: PARADOX, map: rec.map }; }
    return { faction: o.faction, spawn: o.spawn, quests: o.quests, play: o.play || o.world, foe: o.foe, paradox: world === "PD11111" ? PARADOX : null };
  }
  const api = {
    DEFS, INDEX, PARADOX, match, get, effect,
    has: (world) => world === "SW00003" || !!DEFS[world],
    faction(world) { const f = get(world); return f ? f.faction : null; },
    allows(world, questId) { if (world === "SW00003") return R.Recommend?.allows(questId); const f = get(world); return !!f && (effect(world, f)?.quests || []).includes(questId); },
  };

  // ===== 介面 =====
  let root = null;
  function css() {
    if (document.getElementById("fcCss")) return;
    const st = document.createElement("style"); st.id = "fcCss";
    st.textContent = `
      .fc-ov { position: fixed; inset: 0; z-index: 9998; display: grid; place-items: center; overflow: auto; padding: 14px; background: rgba(6,6,10,.88); }
      .fc-paper { width: min(760px, 100%); position: relative; padding: 22px 26px 20px; border-radius: 4px; box-shadow: 0 14px 40px rgba(0,0,0,.6); }
      .fc-paper h2 { margin: 0 0 6px; text-align: center; letter-spacing: .3em; font-size: 26px; }
      .fc-intro { margin: 0 0 12px; font-size: 14px; line-height: 1.7; text-align: center; }
      .fc-row { display: flex; gap: 10px; align-items: baseline; margin: 8px 0; font-size: 15px; } .fc-row > b { flex: none; width: 5em; opacity: .75; }
      .fc-name { font-size: 20px; font-weight: 900; border-bottom: 2px solid currentColor; padding: 0 10px; }
      .fc-opts { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 10px 0 12px; }
      .fc-opt { text-align: left; font: inherit; cursor: pointer; padding: 10px; border: 2px solid var(--oc); border-radius: 4px; color: inherit; display: flex; flex-direction: column; gap: 4px; background: transparent; }
      .fc-opt b { font-size: 17px; color: var(--oc); } .fc-opt small { font-size: 12px; line-height: 1.5; opacity: .85; }
      .fc-opt[aria-pressed="true"] { box-shadow: 0 0 0 3px var(--oc); background: color-mix(in srgb, var(--oc) 16%, transparent); }
      .fc-eff { margin: 0; padding: 8px 10px; font-size: 13px; line-height: 1.75; min-height: 5.6em; background: rgba(127,127,127,.12); }
      .fc-custom { display: flex; gap: 8px; margin: 0 0 10px; } .fc-custom input { flex: 1; font: inherit; padding: 8px 10px; border: 2px solid currentColor; border-radius: 4px; background: rgba(255,255,255,.7); color: #1d1d1f; }
      .fc-btns { display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px; }
      .fc-btns button, .fc-custom button { font: inherit; padding: 8px 18px; border-radius: 4px; cursor: pointer; border: 2px solid currentColor; background: transparent; color: inherit; }
      .fc-btns button.go { background: #7a1f1f; color: #fff; border-color: #4a1010; } .fc-btns button:disabled { opacity: .4; cursor: not-allowed; }
      /* 緊急徵集令：泛黃的公文、打字機字體、紅色印章 */
      .fc-draft .fc-intro { padding: 0 64px; }
      .fc-draft { background: #e9e0c4; color: #2a2418; font-family: "Courier New", "Noto Serif TC", monospace; border: 2px solid #6a5a3a; }
      .fc-draft::after { content: "徵"; position: absolute; right: 26px; top: 18px; width: 54px; height: 54px; border: 4px solid #b02020; color: #b02020; border-radius: 50%; display: grid; place-items: center; font-size: 26px; font-weight: 900; transform: rotate(-14deg); opacity: .75; }
      /* 心中的信仰：昏暗的告解室、燭光 */
      .fc-faith { background: radial-gradient(circle at 50% 0%, #3a2c1a, #120c08 70%); color: #f2e6c8; font-family: "Noto Serif TC", serif; border: 2px solid #6a5020; }
      .fc-faith .fc-eff { background: rgba(255,220,160,.08); }
      /* 悖論的學派：黑色晶體、冷光 */
      .fc-school { background: linear-gradient(160deg, #141022, #06040c); color: #e6e0ff; font-family: "Noto Sans TC", sans-serif; border: 2px solid #4a3a7a; }
      .fc-school .fc-eff { background: rgba(160,140,255,.08); }
      .fc-why { font-size: 12px; opacity: .8; }
      @media (max-width: 600px) { .fc-paper { padding: 18px 14px; } }`;
    document.head.appendChild(st);
  }
  function close() { root?.remove(); root = null; }

  function open(world, charId, onDone, opts = {}) {
    if (world === "SW00003") return R.Recommend?.open(charId, onDone, opts);
    const D = DEFS[world], ch = R.CHARACTERS?.[charId];
    if (!D || !ch) { onDone?.(null); return; }
    const old = get(world);
    if (old && !opts.preview) { onDone?.(old); return; }
    css(); close();
    let pick = old?.opt || null, school = old?.school || "", m = old?.map ? match(school) : null;
    root = document.createElement("div"); root.className = "fc-ov"; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", D.title);
    const nameHtml = () => (R.Recommend ? R.Recommend.fullName(charId) : ch.name);
    const render = () => {
      const o = pick ? D.opts[pick] : null;
      const rec = o ? (o.custom ? (m ? { opt: pick, school, map: m.world } : null) : { opt: pick }) : null;
      const E = rec ? effect(world, rec) : null;
      const custom = o?.custom ? `<div class="fc-custom"><input type="text" maxlength="16" placeholder="學派名稱（例如：深海觀測學派）" value="${esc(school)}" aria-label="學派名稱"><button type="button" data-x="match">讓金字塔判斷</button></div>
        ${m ? `<p class="fc-why">${m.drift ? "金字塔找不到明確的對應，隨便轉到了一面：" : `比對到「${esc(m.why.slice(0, 5).join("、"))}」→ `}<b>${esc(m.name)}</b></p>` : ""}` : "";
      root.innerHTML = `<div class="fc-paper fc-${D.kind}">
        <h2>${esc(D.title)}</h2><p class="fc-intro">${esc(D.intro)}</p>
        <div class="fc-row"><b>${D.kind === "draft" ? "受徵集人" : D.kind === "faith" ? "告解者" : "申請人"}</b><span class="fc-name">${esc(nameHtml())}</span></div>
        <div class="fc-opts">${Object.entries(D.opts).map(([k, v]) => `<button type="button" class="fc-opt" style="--oc:${v.c}" data-k="${k}" aria-pressed="${pick === k}"><b>${esc(v.n)}</b><small>${esc(v.sub)}</small></button>`).join("")}</div>
        ${custom}
        <p class="fc-eff">${E ? `<b>陣營</b>　${esc(E.faction)}${E.foe ? `（敵對：${esc(E.foe)}）` : ""}<br><b>出生點</b>　${esc(E.spawn.n)}<br><b>可接委託</b>　${E.quests.length ? E.quests.length + " 張" : "這個陣營的委託還沒寫"}<br><b>${o.world ? "假想時空" : "玩法"}</b>　${esc(o.world || E.play)}${E.paradox ? `<br><b>時間悖論</b>　敵人強度 ×${E.paradox.enemy}、寶物強度 ×${E.paradox.loot}` : ""}` : o?.custom ? "寫下學派名稱，按「讓金字塔判斷」，金字塔會轉到最接近的那個時空（C～A 級）。" : "選一個之後，這裡會寫出陣營、出生點、可接的委託和玩法。"}</p>
        <div class="fc-btns"><button type="button" data-x="cancel">${opts.preview ? "關閉" : "還沒準備好"}</button><button type="button" class="go" data-x="send" ${rec ? "" : "disabled"}>${esc(D.btn)}</button></div></div>`;
      const inp = root.querySelector(".fc-custom input");
      if (inp) { inp.addEventListener("input", () => { school = inp.value; }); inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); root.querySelector('[data-x="match"]').click(); } }); }
    };
    render();
    document.body.appendChild(root);
    root.addEventListener("click", (e) => {
      const k = e.target.closest("[data-k]"), x = e.target.closest("[data-x]");
      if (k) { pick = k.dataset.k; if (!D.opts[pick].custom) m = null; render(); if (D.opts[pick].custom) root.querySelector(".fc-custom input")?.focus(); }
      else if (x?.dataset.x === "match") { school = (root.querySelector(".fc-custom input")?.value || "").trim(); m = match(school); render(); }
      else if (x?.dataset.x === "cancel") { close(); onDone?.(null); }
      else if (x?.dataset.x === "send" && pick) {
        const o = D.opts[pick];
        const rec = o.custom ? { opt: pick, school, map: m?.world, faction: school, char: charId, at: Date.now() } : { opt: pick, faction: o.faction, char: charId, at: Date.now() };
        if (o.custom && !rec.map) return;
        save(world, rec); close(); onDone?.(rec);
      }
    });
  }

  R.Factions = Object.assign(api, { open, close });
})();
