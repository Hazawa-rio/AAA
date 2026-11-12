/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/build-panel.js": "20261112144644" });
// 角色成長介面：等級（可手動調整）、強化點分配、技能強化樹
// 選角頁和戰鬥頁共用：R.BuildPanel.open(角色 id, { onClose(changed) {} })
(function () {
  const R = window.RPG;
  const P = () => R.Progress;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = (n) => (Math.round(n * 10) / 10).toString();

  let root = null, ch = null, build = null, changed = false, opts = {}, notes = [];

  function ensureRoot() {
    if (root) return root;
    root = document.createElement("div");
    root.id = "buildPanel";
    root.className = "bp-overlay hidden";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "角色成長");
    document.body.appendChild(root);
    root.addEventListener("click", onClick);
    root.addEventListener("input", onInput);
    root.addEventListener("change", onInput);
    document.addEventListener("keydown", (e) => {
      if (!root.classList.contains("hidden") && e.key === "Escape") { e.stopPropagation(); close(); }
    }, true);
    return root;
  }

  function open(charId, o = {}) {
    ch = R.CHARACTERS[charId];
    if (!ch) return;
    opts = o; changed = false; notes = [];
    build = P().load(ch.id);
    notes = P().normalize(ch, build);
    ensureRoot().classList.remove("hidden");
    render();
    root.querySelector(".bp-close")?.focus();
  }

  function close() {
    if (!root || root.classList.contains("hidden")) return;
    root.classList.add("hidden");
    opts.onClose?.(changed);
  }

  function commit(msg) {
    notes = P().normalize(ch, build);
    if (msg) notes.unshift(msg);
    P().save(ch.id, build);
    changed = true;
    render();
  }

  // ---------- 技能強化的規則 ----------
  function pickOf(skill, tier) { return build.picks.find((p) => p.skill === skill && p.tier === tier); }
  function choose(skill, tier, id) {
    const d = P().derive(ch, build);
    if (skill === "w") {
      if (!d.wUnlocked) return commit(`大招強化要 Lv ${P().W_LEVEL} 才能選`);
      build.w = build.w === id ? null : id;
      return commit();
    }
    const cur = pickOf(skill, tier);
    if (cur && cur.choice === id) {           // 再點一次：取消
      if (tier === 1 && pickOf(skill, 2)) return commit("要先取消第二次強化，才能取消第一次");
      build.picks = build.picks.filter((p) => p !== cur);
      return commit();
    }
    if (cur) { cur.choice = id; return commit(); }   // 同一層換另一個
    if (tier === 2 && !pickOf(skill, 1)) return commit("要先選第一次強化");
    if (d.eqUsed >= d.eqTotal) {
      const next = P().EQ_LEVELS.find((l) => l > d.level);
      return commit(next ? `沒有可用的強化次數（下一次在 Lv ${next}）` : "強化次數已經用完");
    }
    build.picks.push({ skill, tier, choice: id });
    commit();
  }

  // ---------- 事件 ----------
  function onClick(e) {
    if (e.target === root) return close();
    const b = e.target.closest("[data-act]");
    if (!b || b.disabled) return;
    const a = b.dataset.act;
    if (a === "close") return close();
    if (a === "xp") {
      build.xp = Math.min(P().xpForLevel(P().MAX_LEVEL), build.xp + Number(b.dataset.v));
      return commit();
    }
    if (a === "lv") return setLevel(P().derive(ch, build).level + Number(b.dataset.v));
    if (a === "reset") {
      if (!confirmReset()) return;
      const items = build.items || [];
      build = P().empty();
      build.items = items;                 // 寶物不會因為重置成長而消失
      return commit("已重置成長（寶物保留）");
    }
    if (a === "pt") {
      const k = b.dataset.k, d = P().derive(ch, build), v = Number(b.dataset.v);
      if (v > 0 && d.pointsUsed >= d.pointsTotal) return commit(`沒有強化點了（每 ${P().POINT_EVERY} 等 1 點）`);
      if (v < 0 && !build.points[k]) return;
      build.points[k] += v;
      return commit();
    }
    if (a === "upg") return choose(b.dataset.skill, Number(b.dataset.tier), b.dataset.id);
    if (a === "itemDrop") {
      build.items = (build.items || []).filter((x) => x !== b.dataset.id);
      return commit(`拿掉了【${R.Items.get(b.dataset.id).name}】`);
    }
    if (a === "itemAdd") {
      build.items = build.items || [];
      if (build.items.length >= R.Items.SLOTS) return commit("寶物欄已滿");
      build.items.push(b.dataset.id);
      return commit(`放入了【${R.Items.get(b.dataset.id).name}】（測試用）`);
    }
  }
  // 重置要再按一次確認（不用瀏覽器的對話框）
  let resetArmed = 0;
  function confirmReset() {
    const now = Date.now();
    if (now - resetArmed < 2500) { resetArmed = 0; return true; }
    resetArmed = now;
    const btn = root.querySelector('[data-act="reset"]');
    if (btn) { btn.textContent = "再按一次確認重置"; btn.classList.add("warn"); }
    setTimeout(() => { if (resetArmed && Date.now() - resetArmed >= 2500 && btn?.isConnected) { btn.textContent = "重置成長"; btn.classList.remove("warn"); } }, 2600);
    return false;
  }
  function onInput(e) {
    const t = e.target;
    if (t.dataset.act !== "lvInput") return;
    const v = Number(t.value);
    if (!Number.isFinite(v)) return;
    if (e.type === "input") {               // 拖曳中只更新數字，放開（change）才套用
      if (t.type === "range") root.querySelector('input[type="number"][data-act="lvInput"]').value = v;
      return;
    }
    setLevel(v);
  }
  function setLevel(v) {
    const L = Math.max(1, Math.min(P().MAX_LEVEL, Math.round(v)));
    const n = P().setLevel(ch, build, L);
    P().save(ch.id, build);
    changed = true; notes = n;
    render();
    root.querySelector('input[type="range"]')?.focus();
  }

  // ---------- 畫面 ----------
  function render() {
    const d = P().derive(ch, build), Pr = P();
    const pct = d.xpNeed ? Math.min(100, (d.xpInto / d.xpNeed) * 100) : 100;
    const left = d.pointsTotal - d.pointsUsed;
    const nextAp = d.apBonus < Pr.AP_MAX_BONUS ? `下一次 Lv ${(d.apBonus + 1) * Pr.AP_EVERY}` : "已達上限";

    const statRows = Pr.STATS.map(([k, name]) => {
      const part = d.parts[k], n = build.points[k] || 0;
      return `<tr>
        <th scope="row">${name}</th>
        <td>${fmt(part.base)}</td>
        <td class="g">+${fmt(part.level)}</td>
        <td class="pt">
          <button type="button" class="bp-mini" data-act="pt" data-k="${k}" data-v="-1" ${n ? "" : "disabled"} aria-label="${name} 減少強化點">−</button>
          <span>${n ? `${n} 點 +${fmt(part.points)}` : "—"}</span>
          <button type="button" class="bp-mini" data-act="pt" data-k="${k}" data-v="1" ${left > 0 ? "" : "disabled"} aria-label="${name} 增加強化點">＋</button>
        </td>
        <td class="tot">${d.stats[k]}</td>
      </tr>`;
    }).join("");

    root.innerHTML = `
      <div class="bp-panel" style="--c:${ch.color}">
        <header class="bp-head">
          <span class="bp-icon">${esc(ch.name[0])}</span>
          <div><h2>${esc(ch.name)} <span class="bp-lv">Lv ${d.level}</span></h2>
            <p class="muted">局內成長：等級可以直接調整，關閉介面後立刻套用到這場戰鬥；勝利也會獲得經驗值</p></div>
          <button type="button" class="ghost bp-close" data-act="close" aria-label="關閉">關閉</button>
        </header>

        <div class="bp-body">
          <section class="bp-col">
            <h3>等級</h3>
            <div class="bp-level">
              <button type="button" class="bp-mini" data-act="lv" data-v="-1" aria-label="降一級">−</button>
              <input type="range" min="1" max="${Pr.MAX_LEVEL}" value="${d.level}" data-act="lvInput" aria-label="等級">
              <button type="button" class="bp-mini" data-act="lv" data-v="1" aria-label="升一級">＋</button>
              <input type="number" min="1" max="${Pr.MAX_LEVEL}" value="${d.level}" data-act="lvInput" aria-label="等級數字">
            </div>
            <div class="bp-xp"><i style="width:${pct}%"></i><span>${d.xpNeed ? `經驗 ${d.xpInto} / ${d.xpNeed}` : "已達最高等級"}</span></div>
            <div class="bp-row">
              <button type="button" class="ghost" data-act="xp" data-v="100">+100 經驗</button>
              <button type="button" class="ghost" data-act="xp" data-v="1000">+1000 經驗</button>
              <button type="button" class="ghost" data-act="reset">重置成長</button>
            </div>

            <h3>數值 <span class="bp-pill ${left ? "on" : ""}">強化點 ${left} / ${d.pointsTotal}</span></h3>
            <table class="bp-stats">
              <thead><tr><th></th><th>基礎</th><th>等級</th><th>強化點</th><th>合計</th></tr></thead>
              <tbody>${statRows}
                <tr><th scope="row">行動點</th><td>${ch.stats.ap}</td><td class="g">+${d.apBonus}</td><td class="pt muted">${nextAp}</td><td class="tot">${d.stats.ap}</td></tr>
              </tbody>
            </table>
            <p class="muted bp-small">每 ${Pr.POINT_EVERY} 等 1 個強化點：生命 +${Pr.POINT_VALUE.hp}、魔力 +${Pr.POINT_VALUE.mp}、攻擊 +${Pr.POINT_VALUE.atk}、防禦 +${Pr.POINT_VALUE.df}、速度 +${Pr.POINT_VALUE.spd}。每 ${Pr.AP_EVERY} 等行動點 +1（最多 +${Pr.AP_MAX_BONUS}）</p>
            ${itemsHtml()}
          </section>

          <section class="bp-col">
            <h3>技能強化 <span class="bp-pill ${d.eqTotal - d.eqUsed > 0 ? "on" : ""}">Q / E 強化 ${d.eqTotal - d.eqUsed} / ${d.eqTotal}</span></h3>
            <p class="muted bp-small">Lv ${Pr.EQ_LEVELS.join(" / ")} 各可強化一次 Q 或 E（每個技能兩次：先強化技能本身，再強化附加效果）；Lv ${Pr.W_LEVEL} 強化大招。再點一次已選的可以取消</p>
            ${tree(d)}
          </section>
        </div>
        ${notes.length ? `<p class="bp-notes" role="status">${notes.map(esc).join("<br>")}</p>` : ""}
      </div>`;
  }

  // 寶物欄：6 格，可以拿掉；測試用可以直接放入
  function itemsHtml() {
    const I = R.Items;
    if (!I) return "";
    const items = build.items || [];
    const empty = I.SLOTS - items.length;
    const slots = items.map((id) => {
      const it = I.get(id);
      if (!it) return "";
      const r = I.RARITY[it.rarity];
      return `<div class="bp-item" style="--rc:${r.color}">${I.slotHtml(id)}
        <div><b>${esc(it.name)}</b> <span class="bp-rar">${r.name}</span><p>${esc(it.desc)}</p></div>
        <button type="button" class="bp-mini" data-act="itemDrop" data-id="${id}" aria-label="拿掉${esc(it.name)}">×</button></div>`;
    }).join("");
    const missing = Object.values(I.LIST).filter((it) => !items.includes(it.id));
    return `<h3>寶物欄 <span class="bp-pill ${items.length ? "on" : ""}">${items.length} / ${I.SLOTS}</span></h3>
      <div class="bp-items">${slots}${empty ? `<div class="bp-empty-slots">${'<span class="item-slot empty"></span>'.repeat(empty)}<span class="muted">${empty} 個空格</span></div>` : ""}</div>
      ${missing.length ? `<div class="bp-row">${missing.map((it) => `<button type="button" class="ghost" data-act="itemAdd" data-id="${it.id}">測試：放入【${esc(it.name)}】</button>`).join("")}</div>
      <p class="muted bp-small">正式取得方式：${missing.map((it) => `【${esc(it.name)}】${esc(it.source || "")}`).join("、")}</p>` : ""}`;
  }

  function tree(d) {
    const U = ch.upgrades;
    if (!U) return `<p class="bp-empty">這個角色的技能強化還在設計中</p>`;
    return ["q", "e", "w"].filter((s) => U[s]).map((slot) => {
      const t = U[slot], sk = ch.skills[t.skill];
      const tags = (sk.tags || []).map((g) => `<span class="bp-tag">${esc(P().TAG_NAMES[g] || g)}</span>`).join("");
      const tiers = t.tiers.map((opts, i) => {
        const tier = i + 1;
        const chosen = slot === "w" ? build.w : pickOf(slot, tier)?.choice;
        let lock = "";
        if (slot === "w" && !d.wUnlocked) lock = `Lv ${P().W_LEVEL} 解鎖`;
        else if (slot !== "w" && !chosen) {
          if (tier === 2 && !pickOf(slot, 1)) lock = "先選第一次強化";
          else if (d.eqUsed >= d.eqTotal) lock = d.eqTotal ? "沒有強化次數" : `Lv ${P().EQ_LEVELS[0]} 解鎖`;
        }
        const label = slot === "w" ? "大招強化" : tier === 1 ? "第一次：技能本身" : "第二次：附加效果";
        return `<div class="bp-tier ${lock ? "locked" : ""}">
          <div class="bp-tier-h">${label}${lock ? `<span class="muted">・${lock}</span>` : ""}</div>
          <div class="bp-opts">${opts.map((o) => `
            <button type="button" class="bp-opt ${chosen === o.id ? "sel" : ""}" data-act="upg" data-skill="${slot}" data-tier="${tier}" data-id="${o.id}"
              aria-pressed="${chosen === o.id}" ${lock ? "disabled" : ""}>
              <b>${esc(o.name)}</b><span>${esc(o.desc)}</span>
            </button>`).join("")}</div>
        </div>`;
      }).join("");
      return `<div class="bp-skill ${sk.ultimate ? "ult" : ""}">
        <div class="bp-skill-h"><span class="bp-key">${sk.slot}</span><b>${esc(sk.name)}</b>${tags}</div>
        ${tiers}
      </div>`;
    }).join("");
  }

  R.BuildPanel = { open, close };
})();
