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
  const STATS = [["hp", "生命", 150, "var(--hp)"], ["atk", "攻擊", 30, "#d9822b"], ["df", "防禦", 15, "#8a8478"],
    ["spd", "速度", 20, "var(--blue)"], ["ap", "行動點", 8, "#1aa3e8"]];
  const chars = Object.values(R.CHARACTERS).filter((c) => !c.hidden);   // 教學專用角色不顯示
  let selected = null;

  $("#cards").innerHTML = chars.map((c) => `
    <button class="card" data-id="${c.id}" style="--c:${c.color}" type="button" aria-pressed="false">
      <span class="icon" style="--c:${c.color}">${esc(c.name[0])}</span>
      <b>${esc(c.name)}</b>
      <span class="role">${c.passive ? "被動：" + esc(c.passive.name) : "測試角色"}</span>
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
    $("#detail").classList.remove("hidden");
    $("#dIcon").textContent = c.name[0];
    $("#dIcon").style.setProperty("--c", c.color);
    $("#dName").textContent = c.name;
    $("#dSub").textContent = `${c.stats.ap} 點行動點・移動半徑 ${c.stats.spd * R.CONFIG.movePerSpd}`;
    $("#dDesc").textContent = c.desc;
    $("#dStats").innerHTML = STATS.map(([k, label, max, color]) => `
      <span class="lb">${label}</span>
      <span class="track"><i style="width:${Math.min(100, (c.stats[k] / max) * 100)}%;background:${color}"></i></span>
      <span class="v">${c.stats[k]}</span>`).join("");

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
  let room = rooms[store.get("rpg.room")] ? store.get("rpg.room") : Object.keys(rooms)[0];
  $("#rooms").innerHTML = Object.entries(rooms).map(([id, r]) => `
    <button class="room" data-id="${id}" type="button" aria-pressed="false">
      <b>${esc(r.name)}</b><span>${esc(r.desc)}</span>${r.bgm ? '<span class="tag">BOSS</span>' : ""}
    </button>`).join("");
  function pickRoom(id) {
    room = id; store.set("rpg.room", id);
    // 固定角色的房間：角色選擇暫時不作用
    const forced = rooms[id].forceChar;
    document.body.classList.toggle("char-forced", !!forced);
    $("#forcedNote").classList.toggle("hidden", !forced);
    document.querySelectorAll(".room").forEach((el) => {
      el.classList.toggle("sel", el.dataset.id === id);
      el.setAttribute("aria-pressed", String(el.dataset.id === id));
    });
  }
  document.querySelectorAll(".room").forEach((el) => el.addEventListener("click", () => pickRoom(el.dataset.id)));
  pickRoom(room);

  $("#goBtn").addEventListener("click", () => {
    if (!selected) return;
    const c = rooms[room].forceChar || selected.id;
    location.href = `battle.html?char=${encodeURIComponent(c)}&room=${encodeURIComponent(room)}`;
  });

  const saved = store.get("rpg.char");
  select(R.CHARACTERS[saved] ? saved : chars[0].id);
})();
