/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/home.js": "20261112133137" });
// 選角頁
(function () {
  const R = window.RPG;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };

  // 屬性條的滿格值（只影響畫面比例）
  const STATS = [["hp", "生命", 150, "var(--hp)"], ["mp", "魔力", 150, "#1a73c9"], ["atk", "攻擊", 30, "#d9822b"], ["df", "防禦", 15, "#8a8478"],
    ["spd", "速度", 20, "var(--blue)"], ["ap", "行動點", 8, "#1aa3e8"]];
  const chars = Object.values(R.CHARACTERS).filter((c) => !c.hidden);   // 教學專用角色不顯示
  let selected = null;

  $("#cards").innerHTML = chars.map((c) => `
    <button class="card" data-id="${c.id}" style="--c:${c.color}" type="button" aria-pressed="false">
      <span class="icon" style="--c:${c.color}">${esc(c.name[0])}</span>
      <b>${esc(c.name)}</b>
      <span class="role">${c.passive ? "被動：" + esc(c.passive.name) : esc(c.role || "測試角色")}</span>
      <span class="mini">
        <span>生命 <b>${c.stats.hp}</b></span><span>攻擊 <b>${c.stats.atk}</b></span>
        <span>防禦 <b>${c.stats.df}</b></span><span>速度 <b>${c.stats.spd}</b></span>
      </span>
    </button>`).join("") + `<div class="card placeholder" aria-hidden="true">更多角色設計中</div>`;
  document.querySelectorAll(".card[data-id]").forEach((el) => el.addEventListener("click", () => select(el.dataset.id)));

  function select(id) {
    selected = R.CHARACTERS[id];
    if (!selected) return;
    store.set("rpg.char", id);
    document.querySelectorAll(".card[data-id]").forEach((el) => {
      el.classList.toggle("sel", el.dataset.id === id);
      el.setAttribute("aria-pressed", String(el.dataset.id === id));
    });
    const c = selected;
    const st = c.stats;   // 成長在戰鬥中（局內）調整，這裡顯示基礎數值
    $("#detail").classList.remove("hidden");
    $("#dIcon").textContent = c.name[0];
    $("#dIcon").style.setProperty("--c", c.color);
    $("#dName").textContent = c.name;
    $("#dSub").textContent = `${st.ap} 點行動點・移動半徑 ${st.spd * R.CONFIG.movePerSpd}`;
    $("#dDesc").textContent = c.desc;
    $("#dStats").innerHTML = STATS.filter(([k]) => k !== "mp" || st.mp).map(([k, label, max, color]) => `
      <span class="lb">${label}</span>
      <span class="track"><i style="width:${Math.min(100, (st[k] / max) * 100)}%;background:${color}"></i></span>
      <span class="v">${st[k]}</span>`).join("");

    // 普攻、Q、W、E 的順序
    const order = [c.basic, c.hud.left, c.hud.center, c.hud.right];
    const passive = c.passive ? `<li class="passive-row">
        <span class="sk-icon"><span class="slot">被動</span></span>
        <div><div class="sn">${esc(c.passive.name)}</div><div class="sd">${esc(c.passive.desc)}</div></div>
        <div class="sc"></div>
      </li>` : "";
    $("#dSkills").innerHTML = passive + order.map((id) => {
      const s = c.skills[id];
      const icon = `<span class="slot">${s.slot}</span>`;
      const tags = [`★${s.ap}`];
      if (s.mp) tags.push(`魔力 ${s.mp}`);
      if (s.cooldown) tags.push(`冷卻 ${s.cooldown} 次行動`);
      if (s.charge) tags.push(`充能 ${s.charge} 次行動`);
      return `<li class="${s.ultimate ? "ult" : ""}">
        <span class="sk-icon">${icon}</span>
        <div><div class="sn"><span class="key">${s.slot}</span>${esc(s.name)}</div><div class="sd">${esc(s.desc)}</div></div>
        <div class="sc">${tags.map((t) => `<span>${t}</span>`).join("")}</div>
      </li>`;
    }).join("");
  }

  // ---------- 房間 ----------
  const rooms = R.CONFIG.rooms;
  let room = rooms[store.get("rpg.room")] && !rooms[store.get("rpg.room")].hidden ? store.get("rpg.room") : Object.keys(rooms)[0];
  // Boss 測試房：可以選擇要挑戰哪一隻 Boss
  let bossPick = store.get("rpg.boss");
  $("#rooms").innerHTML = Object.entries(rooms).filter(([, r]) => !r.hidden).map(([id, r]) => {
    const vs = r.variants ? Object.entries(r.variants) : null;
    return `
    <div class="room${vs ? " has-variants" : ""}" data-id="${id}" role="button" tabindex="0" aria-pressed="false">
      <b>${esc(r.name)}</b><span>${esc(r.desc)}</span>${r.bgm || vs ? '<span class="tag">BOSS</span>' : ""}
      ${vs ? `<div class="variants">${vs.map(([vid, v]) => `
        <button type="button" class="variant${v.trial ? " trial" : ""}" data-v="${vid}" aria-pressed="false">
          <b>${esc(v.name)}</b><small>${esc(v.level || "")}${v.trial ? "・試煉" : ""}</small>
        </button>`).join("")}</div>` : ""}
    </div>`;
  }).join("");
  function pickRoom(id, variant) {
    room = id; store.set("rpg.room", id);
    const r = rooms[id];
    if (r.variants) {
      if (variant) bossPick = variant;
      if (!r.variants[bossPick]) bossPick = Object.keys(r.variants)[0];
      store.set("rpg.boss", bossPick);
    }
    // 固定角色的房間：角色選擇暫時不作用
    const forced = r.forceChar;
    document.body.classList.toggle("char-forced", !!forced);
    $("#forcedNote").classList.toggle("hidden", !forced);
    document.querySelectorAll(".room").forEach((el) => {
      el.classList.toggle("sel", el.dataset.id === id);
      el.setAttribute("aria-pressed", String(el.dataset.id === id));
    });
    document.querySelectorAll(".variant").forEach((el) => {
      const on = el.closest(".room").dataset.id === id && el.dataset.v === bossPick;
      el.classList.toggle("sel", on);
      el.setAttribute("aria-pressed", String(on));
    });
  }
  document.querySelectorAll(".room").forEach((el) => {
    el.addEventListener("click", (e) => {
      const v = e.target.closest(".variant");
      pickRoom(el.dataset.id, v?.dataset.v);
    });
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickRoom(el.dataset.id); } });
  });
  pickRoom(room);

  $("#goBtn").addEventListener("click", () => {
    if (!selected) return;
    const c = rooms[room].forceChar || selected.id;
    const extra = rooms[room].variants ? `&boss=${encodeURIComponent(bossPick)}` : "";
    location.href = `battle.html?char=${encodeURIComponent(c)}&room=${encodeURIComponent(room)}${extra}`;
  });

  const saved = store.get("rpg.char");
  select(R.CHARACTERS[saved] ? saved : chars[0].id);
})();
