/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/battle-ui.js": "20261112030517" });
// 戰鬥畫面與操作
(function () {
  const R = window.RPG, C = R.CONFIG;
  const $ = (s) => document.querySelector(s);
  const canvas = $("#arena"), ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const dist = R.dist;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };

  const roomParam = new URLSearchParams(location.search).get("room") || store.get("rpg.room");
  const ROOM = C.rooms[roomParam] ? roomParam : Object.keys(C.rooms)[0];
  // Boss 測試房：選擇要挑戰哪一隻 Boss
  const bossParam = new URLSearchParams(location.search).get("boss") || store.get("rpg.boss");
  const ROOMDEF = R.resolveRoom(C, ROOM, bossParam);
  // 萬聖節旅館的戰鬥：互相嚇唬。沒有血條，只有驚嚇值（＝最大生命－生命），紫色字
  const SCARE = !!ROOMDEF.scare, PURPLE = "#8a3fd1";
  const scareText = (l) => (SCARE ? l.replace(/受到 (\d+) 點傷害/g, "驚嚇值 +$1").replace(/回復 (\d+) 點生命/g, "驚嚇值 −$1").replace(/倒下了/g, "嚇破膽了") : l);
  // 有些房間固定角色（新手引導固定用教學版伊爾舒）
  const charId = ROOMDEF.forceChar || new URLSearchParams(location.search).get("char") || store.get("rpg.char") || Object.keys(R.CHARACTERS)[0];
  const CH = R.CHARACTERS[charId] || Object.values(R.CHARACTERS)[0];
  const QS0 = new URLSearchParams(location.search);
  // 地圖戰鬥：用這輪冒險自己的成長與寶物
  if (QS0.get("from") === "world" && R.Progress) R.Progress.useAdventure = true;
  // 地圖探索來的：返回地圖，不能「再來一場」
  // 不能直接離開：地圖小怪戰要用「撤退」碰運氣；戰敗＝冒險失敗
  if (QS0.get("from") === "world") {
    const top = document.querySelector("#roominfo a.back");
    if (top) { const sp = document.createElement("span"); sp.className = "muted"; sp.textContent = "地圖探索"; top.replaceWith(sp); }
    document.querySelectorAll("a.back").forEach((el) => { el.href = "world.html"; el.textContent = "回到地圖"; });
    document.getElementById("againBtn").classList.add("hidden");
    document.getElementById("restartBtn")?.classList.add("hidden");
  }
  // 從酒館來的：返回連結改回酒館
  if (QS0.get("from") === "tavern") {
    document.querySelectorAll("a.back").forEach((el, i) => { el.href = "tavern.html"; el.textContent = i === 0 ? "← 酒館" : "回到酒館"; });
  }
  // 角色專屬的操作說明（例如薇薇拉：A 鍵把普攻丟到地面）
  const basicSk = CH.skills[CH.basic];
  if (basicSk?.key) {
    const el = document.getElementById("charHelp");
    if (el) el.innerHTML = `<b>${basicSk.key.toUpperCase()}</b>：${esc(basicSk.name)}不用指定敵人，點地面就朝那裡出手${basicSk.aimAlly ? "・點自己或召喚物：丟過去補血" : ""}`;
    el?.classList.remove("hidden");
  }

  let B = null;            // 目前的戰鬥
  let mode = "move";       // move 或技能 id
  const mouse = { x: -999, y: -999, in: false };
  const disp = new Map();  // 畫面位置（平滑移動）
  const fx = [];
  const zoneSeen = new Map();   // 煙霧第一次出現的時間（做浮現動畫）
  const hold = new Map();
  const poses = new Map();  // Boss 的動作（揮劍、瞄準、舉手…）：單位 id → { pose, t, dur, ... }
  let lastSporeSound = 0;
  let lastSpikesEnd = 0;    // 最後一根尖刺飛完的時間（看老娘的飛箭要等）
  let shakeUntil = 0;       // 單位 id → 在這個時間前畫面不移動（敵人閃避的時機）

  // ---------- 音效 ----------
  let muted = store.get("rpg.muted") === "1";
  const audioCache = new Map();
  function audio(src) {
    let a = audioCache.get(src);
    if (!a) { a = new Audio(src); a.preload = "auto"; audioCache.set(src, a); }
    return a;
  }
  // rate：播放速度（< 1 會放慢並降調，例如偽神變身時的光柱）
  function playSound(src, rate = 1) {
    if (muted || !src) return;
    const a = audio(src).cloneNode();    // 複製一份，連續觸發時才能重疊播放
    a.volume = C.volume;
    if (rate !== 1) { a.preservesPitch = false; a.mozPreservesPitch = false; a.webkitPreservesPitch = false; a.playbackRate = rate; }
    a.play().catch(() => {});            // 瀏覽器在使用者還沒點過頁面前會擋聲音
  }
  for (const e of Object.values(C.enemies)) for (const s of Object.values(e.sounds || {})) audio(s);
  for (const s of Object.values(CH.skills)) {
    if (s.sound) audio(s.sound);
    for (const x of Object.values(s.sounds || {})) audio(x);
  }
  if (CH.passive?.sound) audio(CH.passive.sound);
  if (C.turnSound) audio(C.turnSound);
  if (C.enemyTurnSound) audio(C.enemyTurnSound);
  function renderMute() {
    // 不用 emoji：各瀏覽器的 emoji 字型不同，改用 SVG 喇叭圖示
    const ico = `<svg class="mute-ico" viewBox="0 0 16 16"><path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor"/>${muted
      ? '<path d="M11 6l4 4M15 6l-4 4" stroke="currentColor" stroke-width="1.6" fill="none"/>'
      : '<path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.5 3.5a6 6 0 0 1 0 9" stroke="currentColor" stroke-width="1.4" fill="none"/>'}</svg>`;
    $("#muteBtn").innerHTML = ico + (muted ? "音效關" : "音效開");
    $("#muteBtn").setAttribute("aria-pressed", String(!muted));
  }
  $("#muteBtn").addEventListener("click", () => {
    muted = !muted; store.set("rpg.muted", muted ? "1" : "0"); renderMute();
    if (muted) bgm?.pause(); else startBgm();
  });
  renderMute();

  // ---------- 背景音樂（Boss 房） ----------
  // 瀏覽器規定要使用者點過頁面才能播放，所以播放失敗時等第一次點擊或按鍵再試
  let bgm = null;
  function startBgm() {
    if (!ROOMDEF.bgm || muted) return;
    if (!bgm) { bgm = new Audio(ROOMDEF.bgm + "?v=" + (document.querySelector("meta[name=build]")?.content || "")); bgm.loop = true; }
    bgm.volume = C.bgmVolume;
    if (bgm.paused) bgm.play().catch(() => {});
  }
  const kickBgm = () => startBgm();
  window.addEventListener("pointerdown", kickBgm);
  window.addEventListener("keydown", kickBgm);
  startBgm();

  // ---------- 經驗值與角色成長 ----------
  let xpNote = "";
  function grantXp() {
    xpNote = "";
    if (B.result !== "win" || CH.frozen || !R.Progress) return;
    // 擊敗試煉 Boss 的寶物
    let reward = "";
    if (ROOMDEF.reward && R.Items) {
      const g = R.Items.give(CH.id, ROOMDEF.reward);
      reward = `<span class="reward${g.ok ? "" : " dim"}">${R.Items.slotHtml(ROOMDEF.reward)}<span>${esc(g.text)}</span></span>`;
      if (g.ok) { B.player.items = R.Progress.forBattle(CH).items; B.say(`${g.text}！`); }
    }
    // 時空幣（局外貨幣）
    if (ROOMDEF.coins && R.Profile) {
      const c = R.Profile.addCoins(ROOMDEF.coins);
      reward += `<span class="reward coin">獲得 ${ROOMDEF.coins} 時空幣（持有 ${c}）</span>`;
    }
    if (!ROOMDEF.xp) { xpNote = reward; return; }
    const r = R.Progress.addXp(CH.id, ROOMDEF.xp);
    xpNote = `獲得 ${ROOMDEF.xp} 經驗值` + (r.after > r.before ? `，升到 <b>Lv ${r.after}</b>！` : `（Lv ${r.after}）`) + reward;
  }
  const growBtn = $("#growBtn");
  if (growBtn) {
    if (CH.frozen || !R.BuildPanel) growBtn.remove();
    else growBtn.addEventListener("click", () => {
      // 局內使用：關掉介面時立刻套用到目前的戰鬥
      R.BuildPanel.open(CH.id, { onClose(changed) { if (changed && B) { B.applyGrowth(); renderUI(); } } });
    });
  }

  // ---------- 酒館的特調：進入戰鬥時生效（這一頁的「再來一場」也繼續有效） ----------
  // 地圖探索中的遭遇戰：from=world、enc=地圖上魔物群的 id、init=先後手修正（迎戰 +3／遇襲 −2）
  const QS = new URLSearchParams(location.search);
  const FROM_WORLD = QS.get("from") === "world" && R.Profile;
  const ENC = QS.get("enc"), INIT = Number(QS.get("init")) || 0;
  let drink = null;
  if (FROM_WORLD) drink = R.Profile.trip().run?.drink || null;          // 這一輪冒險出發前喝的特調
  else if (R.Profile && !CH.frozen && !ROOMDEF.forceChar) drink = R.Profile.takeDrink();
  function applyDrink() {
    if (!drink) return;
    const u = B.player, b = R.Profile.bonusOf(drink);
    u.maxHp += b.hp; u.hp += b.hp;
    if (b.mp) { u.maxMp += b.mp; u.mp += b.mp; }
    u.atk += b.atk; u.df += b.df; u.spd += b.spd;
    B.say(`喝下${drink.base}特調：${R.Profile.bonusText(drink)}`);
  }

  // ---------- 地圖探索：戰鬥結果寫回這一輪冒險 ----------
  function worldResult() {
    if (!FROM_WORLD) return;
    const t = R.Profile.trip();
    if (!t.run) return;
    const u = B.player, run = t.run;
    let msg;
    if (B.result === "fled") {
      // 撤退成功：保留生命，魔物還留在地圖上；回去後幾秒內不會再被撞到
      run.hp = u.hp;
      run.grace = Date.now() + 3500;
      msg = `從${ROOMDEF.name}的戰鬥中撤退了`;
      xpNote += `<span class="reward dim">撤退成功，魔物還留在原地</span>`;
    } else if (B.result === "win") {
      run.hp = u.hp;
      if (ENC && !run.defeated.includes(ENC)) run.defeated.push(ENC);
      const [g0, g1] = ROOMDEF.gold || [0, 0];
      const gold = g0 + Math.floor(Math.random() * (g1 - g0 + 1));
      run.gold += gold;
      msg = `${ROOMDEF.escort ? "護送成功" : `擊敗了${ROOMDEF.name}`}，獲得 ${gold} 金幣`;
      xpNote += `<span class="reward coin">獲得 ${gold} 金幣（這次冒險持有 ${run.gold}）</span>`;
      // 掉落物：打倒的每一隻敵人各擲一次
      if (R.Bag) {
        const kinds = B.units.filter((x) => x.team === "enemy" && !x.part && !x.alive).map((x) => x.kind);
        const got = R.Bag.rollDrops(kinds, C), parts = [];
        let full = false;
        for (const [id, n] of Object.entries(got)) {
          const k = R.Bag.add(run.items, id, n);
          if (k) parts.push(`${R.Bag.get(id).name} ×${k}`);
          if (k < n) full = true;
        }
        if (parts.length) { xpNote += `<span class="reward">掉落：${esc(parts.join("、"))}${full ? "（行囊滿了，有些沒撿到）" : ""}</span>`; msg += `，撿到 ${parts.join("、")}`; }
      }
      // 打倒後得到寶物（例如變異發泡水母的異變硬殼）
      if (ROOMDEF.treasure && R.Items) {
        const g = R.Items.give(t.char, ROOMDEF.treasure);
        xpNote += `<span class="reward quest">${esc(g.text || "")}</span>`;
        if (g.ok) msg += `，得到寶物「${R.Items.get(ROOMDEF.treasure).name}」`;
      }
      // 委託進度（討伐、護送、果樹的魔狼…）
      const qm = R.Commissions.onBattle(t, { result: "win", variant: ROOMDEF.variant, outside: QS.get("out") === "1", quest: QS.get("quest"), items: run.items });
      for (const m of qm) xpNote += `<span class="reward quest">${esc(m)}</span>`;
      if (qm.length) msg += "。" + qm.join("；");
      // 連續戰鬥（例如午夜嚇人比賽）：下一個階段也是連戰，就直接進入下一場，不回地圖
      const qid = QS.get("quest"), nst = qid && QS.get("chain") ? R.Commissions.stage(t, qid) : null;
      if (nst?.chain) {
        const url = `battle.html?char=${encodeURIComponent(t.char)}&from=world&room=${encodeURIComponent(nst.room)}&boss=${encodeURIComponent(nst.variant)}&quest=${encodeURIComponent(qid)}&chain=1`;
        chainNext = { url, name: nst.chainName || "下一場" };
        xpNote += `<span class="reward quest">${esc(nst.chainNote || "比賽還沒結束——下一位選手已經在場邊等著了")}</span>`;
      }
    } else if (B.result === "escortFail") {
      // 護送失敗：委託沒有推進，可以回去再試一次
      run.hp = u.hp;
      run.grace = Date.now() + 3500;
      msg = "護送失敗了……車隊退回了會合點，可以再試一次";
      xpNote += `<span class="reward dim">護送失敗：委託進度沒有推進，回到會合點可以再試一次</span>`;
    } else if (SCARE) {
      // 旅館裡全員嚇破膽：不算戰敗、冒險不會結束；傳送回大廳發抖，這趟沒完成的委託都算失敗
      run.hp = Math.max(1, Math.round(u.maxHp * 0.3));
      run.scared = true; run.scaredSeen = false;
      run.respawn = true; t.scene = null;
      msg = "嚇破膽了……回過神來已經在大廳發抖";
      xpNote += `<span class="reward dim">嚇破膽了：被送回大廳發抖。這趟沒完成的委託都算失敗，只能回酒館結算</span>`;
    } else {
      // 全員戰敗：委託失敗，這輪冒險結束，回到酒館
      // 完成的委託照常拿報酬；沒完成的只能照進度比例拿時空幣
      const CM = R.Commissions, W = CM.WORLDS[t.world];
      const st = CM.settle(t, true);
      R.Profile.addCoins(st.coins);
      if (st.xp && R.Progress) R.Progress.addXp(t.char, st.xp);
      const adv = R.Adventure.end();
      R.Profile.clearTrip();
      try { sessionStorage.setItem("rpg.lastReward", JSON.stringify({ failed: true, coins: st.coins, xp: st.xp, lines: st.lines, world: `${W.code} ${W.name}`, gold: run.gold, rank: adv?.rank || "C", cleared: adv?.cleared?.length || 0 })); } catch (e) { /* 忽略 */ }
      xpNote += `<span class="reward dim">委託失敗，這輪冒險結束。依委託進度獲得 ${st.coins} 時空幣</span>`;
      document.querySelectorAll("#result a.back").forEach((el) => { el.href = "tavern.html"; el.textContent = "回到酒館"; });
      return;
    }
    run.lastBattle = { result: B.result, room: ROOM, variant: ROOMDEF.variant, quest: QS.get("quest"), at: Date.now() };     // 時空的玩法用得到（例如狼人排隊：嚇跑的是哪一隻）
    t.lastResult = msg;
    R.Profile.setTrip(t);
    if (chainNext) document.querySelectorAll("#result a.back").forEach((el) => { el.href = chainNext.url; el.textContent = `下一場：${chainNext.name}`; });
  }
  let chainNext = null;

  // ---------- 行囊：地圖戰鬥中可以用消耗品（花 1 行動點，非自己回合 ×2） ----------
  if (FROM_WORLD && R.Bag) {
    const btn = document.createElement("button");
    btn.id = "bagBtn"; btn.type = "button"; btn.textContent = "道具";
    const pop = document.createElement("div");
    pop.id = "bagPop"; pop.className = "hidden";
    $("#endBtn").before(btn);
    $("#vitals").appendChild(pop);
    const usable = () => (R.Profile.trip().run?.items || []).filter((x) => R.Bag.get(x.id)?.battle);
    const renderPop = () => {
      const list = usable();
      pop.innerHTML = list.length
        ? list.map((x) => { const it = R.Bag.get(x.id); return `<button type="button" data-id="${x.id}">${R.Bag.icon(x.id)}<span>${esc(it.name)}<small>${esc(it.desc)}</small></span><b>×${R.Bag.count(usable(), x.id)}</b></button>`; })
            .filter((h, i, a) => a.indexOf(h) === i).join("") + `<p>使用一次花 ${mult()} 點行動點</p>`
        : `<p>行囊裡沒有戰鬥中能用的道具</p>`;
    };
    btn.addEventListener("click", () => { renderPop(); pop.classList.toggle("hidden"); });
    pop.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-id]");
      if (!b) return;
      act(() => {
        const u = B.player, it = R.Bag.get(b.dataset.id), cost = 1 * mult();
        if (!B.canAct()) throw new R.ActionError("現在不能行動");
        if (u.ap < cost) throw new R.ActionError(`行動點不夠（要 ${cost} 點）`);
        if (it.use.hp && u.hp >= u.maxHp) throw new R.ActionError("生命已經是滿的");
        if (it.use.mp && !it.use.hp && (!u.maxMp || u.mp >= u.maxMp)) throw new R.ActionError(u.maxMp ? "魔力已經是滿的" : "沒有魔力可以回復");
        const t = R.Profile.trip();
        if (!R.Bag.remove(t.run.items, b.dataset.id, 1)) throw new R.ActionError("道具用完了");
        R.Profile.setTrip(t);
        u.ap -= cost;
        B.say(`${u.name} 使用了${it.name}`);
        if (it.use.hp) B.heal(u, Math.round(u.maxHp * it.use.hp), `（${it.name}）`);
        if (it.use.mp && u.maxMp) { const n = Math.min(u.maxMp - u.mp, Math.round(u.maxMp * it.use.mp)); u.mp += n; B.emit({ type: "mpRegen", unit: u, amount: n }); }
        B.countAction(u, "item", cost);
        B.afterPlayerAction();
      });
      renderPop();
      renderUI();
    });
    window.addEventListener("keydown", (e) => { if (e.key === "Escape") pop.classList.add("hidden"); });
  }

  // ---------- 撤退（只有地圖上的小怪戰） ----------
  // 離最近的敵人越遠，成功率越高；失敗就直接結束回合
  const RETREAT = FROM_WORLD && ROOMDEF.retreat;
  function fleeChance() {
    if (!B || !RETREAT) return 0;
    const u = B.player, foes = B.enemies();
    if (!foes.length) return RETREAT.max;
    const d = Math.min(...foes.map((e) => dist(u.x, u.y, e.x, e.y) - (e.r || 0)));
    const k = Math.max(0, Math.min(1, (d - RETREAT.near) / (RETREAT.far - RETREAT.near)));
    return RETREAT.min + (RETREAT.max - RETREAT.min) * k;
  }
  if (RETREAT) {
    const btn = document.createElement("button");
    btn.id = "fleeBtn"; btn.type = "button";
    btn.title = "離最近的敵人越遠，成功率越高。失敗會直接結束回合";
    $("#endBtn").before(btn);
    btn.addEventListener("click", () => act(() => {
      if (!myTurn()) return;
      const p = fleeChance();
      if (Math.random() < p) B.finish("fled", `撤退成功！（成功率 ${Math.round(p * 100)}%）`);
      else { B.say(`撤退失敗……（成功率 ${Math.round(p * 100)}%）`); B.endTurn(); }
      renderUI();
    }));
  }

  // ---------- 開始 / 重新開始 ----------
  // 魔物圖鑑：遇到就記名字，打贏就記技能和數值（js/bestiary.js）
  function foes() { return [...new Set(B.units.filter((u) => u.team === "enemy" && !u.npc).map((u) => u.kind))]; }
  function recordBestiary() {
    if (!R.Bestiary || !B) return;
    if (B.result === "win") R.Bestiary.markKnown(foes()); else R.Bestiary.markSeen(foes());
  }
  function newBattle() {
    xpNote = "";
    if (B) B.destroy();
    disp.clear(); fx.length = 0; zoneSeen.clear(); hold.clear(); mode = "move";
    $("#ultBanner").classList.add("hidden");
    closeDialog();
    bubbles.length = 0;
    lastBark.clear();
    poses.clear();
    B = new R.Battle(C, CH.id, ROOM, ROOMDEF.variant);
    B.on(onEvent);
    if (R.Bestiary) R.Bestiary.markSeen(foes());
    // 午夜嚇人比賽之類的開場白；暗黑霸王龍變形完會咆哮
    if (ROOMDEF.intro) { B.say(ROOMDEF.intro); fx.push({ k: "bigText", text: ROOMDEF.intro.replace(/^[^：]+：/, ""), color: "#ffb04a", t: performance.now(), dur: 2600 }); }
    if (B.units.some((u) => u.def?.rex)) setTimeout(() => playSound("sounds/dino-roar.mp3"), 1300);    // 紅色方塊冒完、黑色方塊開始變白時咆哮
    applyDrink();
    if (FROM_WORLD) {
      const run = R.Profile.trip().run;
      B.player.initMod = INIT;                       // 迎戰 +3／遇襲 −2
      if (run && run.hp != null) B.player.hp = Math.max(1, Math.min(B.player.maxHp, run.hp));   // 冒險中的生命延續
      B.say(INIT > 0 ? "迎戰！先手值 +3" : INIT < 0 ? "遇襲！先手值 −2" : "遭遇魔物");
    }
    if (ROOMDEF.script === "tutorial") R.Tutorial.attach(B, { dialog, bubble, error: showError });
    else B.start();
    renderUI();
  }

  function onEvent(ev) {
    const t = performance.now();
    // 角色自己畫的特效（例如蒼幽的泡泡、蝠鱝）：角色檔的 fxEvents[事件] 回傳持續時間，drawFx 負責畫
    if (ev?.type && CH.fxEvents?.[ev.type]) { const d = CH.fxEvents[ev.type](ev); if (d) fx.push({ k: "char", ev, t: t + (ev.delay || 0) * 1000, dur: d }); }
    switch (ev.type) {
      case "damage":
        fx.push({ k: "num", x: ev.unit.x, y: ev.unit.y - (ev.unit.def.bigBar ? 110 : 30), text: ev.text || (SCARE ? `+${ev.amount} 驚嚇` : `-${ev.amount}`), color: SCARE ? PURPLE : ev.unit.cage ? "#b8860b" : ev.boosted ? "#c2477a" : "#e53935", t });
        break;
      case "bushCut": for (const g of ev.bushes) for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2; fx.push({ k: "leaf", x: g.x, y: g.y, vx: Math.cos(a) * (60 + Math.random() * 120), vy: Math.sin(a) * (60 + Math.random() * 120) - 60, rot: Math.random() * 6, t, dur: 800 }); } break;
      case "miss": fx.push({ k: "num", x: ev.x, y: ev.y - 34, text: ev.text || "MISS", color: ev.text ? "#c2477a" : "#1aa3e8", t }); break;
      case "slash": {
        const delay = [0, 240, 520][ev.n || 0];
        const dur = ev.style === "thrust" ? 420 : ev.style === "strong" ? 700 : 520;
        fx.push({ k: "slash", ...ev, t: t + delay, dur });
        if (ev.style === "strong") shakeUntil = t + delay + 260;      // 第三斬：畫面震一下
        break;
      }
      case "explode": fx.push({ k: "explode", ...ev, t, dur: 600 }); break;
      case "demonPull": fx.push({ k: "trail", from: ev.from, to: ev.to, t, dur: 500 }); break;
      case "demonSpawn": fx.push({ k: "ring", x: ev.unit.x, y: ev.unit.y, r: 34, color: "#5b3fa8", t, dur: 600 }); break;
      case "demonDeath": fx.push({ k: "ring", x: ev.unit.x, y: ev.unit.y, r: 40, color: "#3a2d70", t, dur: 500 }); break;
      case "gloom": fx.push({ k: "num", x: ev.unit.x, y: ev.unit.y - 52, text: "+1 陰霾", color: "#4b3f8f", t, dur: 1000 }); break;
      case "knockback": fx.push({ k: "num", x: ev.unit.x, y: ev.unit.y - 40, text: "擊退", color: "#e53935", t }); break;
      case "apDrain": fx.push({ k: "num", x: ev.unit.x + 26, y: ev.unit.y - 20, text: `-${ev.amount} ★`, color: "#1aa3e8", t, dur: 900 }); break;
      case "turn": if (ev.unit === B.player) playSound(C.turnSound); break;
      case "enemyWarn":   // 怪物回合開始：警告音效 + 頭上的驚嘆號
        playSound(ev.sound);
        fx.push({ k: "warn", unit: ev.unit, t, dur: ev.duration * 1000 + 150 });
        break;
      case "kick": fx.push({ k: "ring", x: ev.target.x, y: ev.target.y, r: 30, color: "#1d1d1f", t, dur: 350 }); break;
      case "bossPose": poses.set(ev.unit.id, { ...ev, t }); break;
      case "redemption": playSound(ev.sound); fx.push({ k: "redemption", ...ev, t, dur: 1100 }); shakeUntil = t + 300; break;
      case "revive":
        fx.push({ k: "beam", from: R.AI.passion.fingertip(ev.by), to: { x: ev.unit.x, y: ev.unit.y }, t, dur: 700 });
        fx.push({ k: "ring", x: ev.unit.x, y: ev.unit.y, r: 46, color: "#d4a017", t, dur: 700 });
        fx.push({ k: "num", x: ev.unit.x, y: ev.unit.y - 44, text: "復甦", color: "#b8860b", t, dur: 1000 });
        disp.set(ev.unit.id, { x: ev.unit.x, y: ev.unit.y });
        break;
      case "sacrifice": fx.push({ k: "pillar", x: ev.unit.x, y: ev.unit.y, radius: 40, gold: true, t, dur: 1500 }); break;
      case "orb": fx.push({ k: "orb", unit: ev.unit, t, dur: ev.dur }); break;
      case "phase2":
        fx.push({ k: "ring", x: ev.unit.x, y: ev.unit.y, r: 320, color: "#c62828", t, dur: 900 });
        shakeUntil = t + 600;
        break;
      case "cage": playSound(C.enemies.pope.sounds.bell); fx.push({ k: "ring", x: ev.unit.x, y: ev.unit.y, r: ev.unit.size * 0.7, color: "#d4a017", t, dur: 600 }); break;
      case "shroomThrow":
        fx.push({ k: "shroomFly", from: ev.from, to: ev.to, t, dur: ev.flight * 1000 });
        if (!ev.plant) fx.push({ k: "shroomFuse", x: ev.to.x, y: ev.to.y, radius: ev.radius, t: t + ev.flight * 1000, dur: ev.fuse * 1000 });
        break;
      case "shroomBoom":
        playSound(ev.sound);
        fx.push({ k: "shroomBoom", x: ev.x, y: ev.y, radius: ev.radius, farm: ev.farm, t, dur: 600 });
        break;
      case "spore":
        if (t - lastSporeSound > 600) { playSound(ev.sound); lastSporeSound = t; }
        fx.push({ k: "sporeCloud", x: ev.x, y: ev.y, radius: ev.radius, t, dur: 900 });
        for (const e of ev.targets) fx.push({ k: "ring", x: e.x, y: e.y, r: e.r + 8, color: "#a0b43c", t, dur: 500 });
        break;
      case "summon": fx.push({ k: "ring", x: ev.unit.x, y: ev.unit.y, r: 60, color: "#3d9a5b", t, dur: 700 }); break;
      case "summonDeath": if (!ev.quiet) fx.push(ev.unit.kind === "giantShroom" ? { k: "shroomBoom", x: ev.unit.x, y: ev.unit.y, radius: 50, t, dur: 600 } : { k: "ring", x: ev.unit.x, y: ev.unit.y, r: 40, color: "#8fd3ea", t, dur: 600 }); break;
      case "mpRegen": fx.push({ k: "num", x: ev.unit.x + 20, y: ev.unit.y - 44, text: `+${ev.amount} MP`, color: "#1a73c9", t, dur: 900 }); break;
      case "crownRing": fx.push({ k: "bellWave", x: ev.x, y: ev.y, radius: ev.radius, crown: true, t, dur: 650 }); break;
      case "cageTick": fx.push({ k: "ring", x: ev.unit.holds?.x ?? ev.unit.x, y: ev.unit.holds?.y ?? ev.unit.y, r: 40, color: "#d4a017", t, dur: 400 }); break;
      case "cageBreak":
        fx.push({ k: "ring", x: ev.unit.x, y: ev.unit.y, r: ev.unit.size * 0.8, color: "#b8860b", t, dur: 600 });
        fx.push({ k: "num", x: ev.unit.x, y: ev.unit.y - ev.unit.size / 2 - 10, text: "牢籠破碎", color: "#b8860b", t, dur: 1000 });
        break;
      case "sfx":
        if (ev.delay) setTimeout(() => playSound(ev.sound, ev.rate || 1), ev.delay * 1000);   // 配合連斬的節奏
        else playSound(ev.sound, ev.rate || 1);
        break;
      case "gloomSpent": fx.push({ k: "num", x: ev.unit.x, y: ev.unit.y - 56, text: "陰霾耗盡", color: "#3a2d70", t: t + 520, dur: 1100 }); break;
      case "move": if (ev.unit.team === "enemy") playSound(ev.unit.def.sounds?.move); break;
      case "leap": fx.push({ k: "leap", unit: ev.unit, from: ev.from, to: ev.to, height: ev.height, t, dur: ev.duration * 1000 }); break;
      // 霍夫曼的超光速制壓：吸入、下砸的藍色震盪
      case "suction": fx.push({ k: "suction", x: ev.x, y: ev.y, r: ev.r, units: ev.units, t, dur: ev.duration * 1000 }); break;
      // 瑪莉卡：蛇腹劍的甩動（一節一節的劍刃連成弧線，左右來回掃過扇形）、伸長勾取
      case "lash": fx.push({ k: "lash", x: ev.x, y: ev.y, ang: ev.ang, half: ev.half, radius: ev.radius, hits: ev.hits, fire: ev.fire, circle: ev.circle, t, dur: 260 * ev.hits + 240 }); if (ev.circle) shakeUntil = t + 260 * ev.hits; break;
      case "grab": fx.push({ k: "grab", from: ev.from, to: ev.to, fire: ev.fire, t, dur: 700 }); break;
      case "blueQuake": fx.push({ k: "blueQuake", x: ev.x, y: ev.y, r: ev.r, t, dur: 1100 }); shakeUntil = t + 550; break;
      case "arrow": {
        // 每支箭依距離飛行，分裂箭等主箭飛到煙霧另一側才出發
        const sp = ev.speed || 900;
        for (const a of ev.arrows || [{ from: ev.from, to: ev.to, boosted: ev.boosted }]) {
          const fly = (dist(a.from.x, a.from.y, a.to.x, a.to.y) / sp) * 1000;
          const t0 = t + ((a.delayDist || 0) / sp) * 1000;
          fx.push({ k: "arrow", from: a.from, to: a.to, boosted: a.boosted, pierce: a.pierce, split: a.split, t: t0, fly, dur: fly + (a.pierce ? 700 : 450) });
          if (a.split) fx.push({ k: "ring", x: a.from.x, y: a.from.y, r: 18, color: "#c2477a", t: t0, dur: 380 });
        }
        break;
      }
      case "spikes": {
        for (const z of ev.consumed) fx.push({ k: "smokeOut", zone: z, t, dur: 400 });
        const sp = ev.speed || 1100;
        let end = t;
        ev.spikes.forEach((s, i) => {
          const pts = s.points || [s.from, s.to];
          let len = 0;
          for (let j = 1; j < pts.length; j++) len += dist(pts[j - 1].x, pts[j - 1].y, pts[j].x, pts[j].y);
          const fly = Math.max(260, (len / sp) * 1000);
          const t0 = t + i * 60 + ((s.delayDist || 0) / sp) * 1000;
          fx.push({ k: "spike", pts, len, side: s.side, t: t0, fly, dur: fly + 300 });
          end = Math.max(end, t0 + fly);
        });
        lastSpikesEnd = end;
        break;
      }
      case "finale": {
        // 尖刺聚到面前之後才射出
        const t0 = Math.max(t + 200, lastSpikesEnd) + 120;
        fx.push({ k: "finaleCharge", x: ev.from.x, y: ev.from.y, count: ev.count, t, dur: t0 - t });
        fx.push({ k: "finale", from: ev.from, to: ev.to, width: ev.width, count: ev.count, t: t0, dur: 1100 });
        setTimeout(() => { shakeUntil = performance.now() + 380; }, t0 - performance.now());
        break;
      }
      case "heal": fx.push({ k: "num", x: ev.unit.x, y: ev.unit.y - 34, text: SCARE ? `−${ev.amount} 驚嚇` : `+${ev.amount}`, color: SCARE ? "#b07ae0" : "#2e9e5b", t }); break;
      case "buff": fx.push({ k: "num", x: ev.unit.x, y: ev.unit.y - 58, text: ev.text, color: ev.color || "#1aa3e8", t, dur: 1100 }); break;
      // 通用的範圍閃光（角色技能用）：shape 是 rect / sector / circle / line
      case "fxShape": fx.push({ k: "shape", shape: ev.shape, color: ev.color || "#1d1d1f", t, dur: ev.dur || 400 }); break;
      case "shieldGain": fx.push({ k: "num", x: ev.unit.x, y: ev.unit.y - 46, text: `+${ev.amount} 護盾`, color: "#2f8fd6", t, dur: 1000 }); fx.push({ k: "ring", x: ev.unit.x, y: ev.unit.y, r: 40, color: "#7fc4ff", t, dur: 500 }); break;
      case "shieldHit": fx.push({ k: "num", x: ev.unit.x - 18, y: ev.unit.y - 30, text: ev.broke ? "護盾破了" : `護盾 −${ev.amount}`, color: "#2f8fd6", t }); break;
      case "talisman": fx.push({ k: "talisman", from: ev.from, to: ev.to, star: ev.star, t, dur: ev.dur || 300 }); break;
      case "taiji": fx.push({ k: "taiji", x: ev.x, y: ev.y, r: ev.r, t, dur: 1400 }); break;
      case "afterimage": fx.push({ k: "afterimage", from: ev.from, to: ev.to, color: ev.color, t, dur: 650 }); break;
      case "plague":
        fx.push({ k: "ring", x: ev.unit.x, y: ev.unit.y, r: ev.unit.r + 10, color: "#8a9a6a", t, dur: 600 });
        fx.push({ k: "num", x: ev.unit.x, y: ev.unit.y - ev.unit.r - 30, text: "瘟疫", color: "#6f7d52", t, dur: 900 });
        break;
      case "chargeCancel": for (const c of ev.charges) fx.push({ k: "chargeOut", c, t, dur: 450 }); break;
      case "zoneExpire": for (const z of ev.zones) fx.push({ k: "smokeOut", zone: z, t, dur: 700 }); break;
      case "ink":        // 凡塔黑的墨水
        fx.push({ k: "ink", x: ev.x, y: ev.y, r: ev.r, t, dur: 1400 });
        break;
      case "dive": fx.push({ k: "splash", x: ev.x, y: ev.y, r: 70, t, dur: 700 }); if (ev.sound) playSound(ev.sound, 0.7); break;
      case "surface": fx.push({ k: "splash", x: ev.x, y: ev.y, r: 60, t, dur: 600 }); disp.set(ev.unit.id, { x: ev.x, y: ev.y }); break;
      case "bigText": fx.push({ k: "bigText", text: ev.text, color: ev.color || "#c62828", style: ev.style, t, dur: ev.style === "warn" ? 2800 : 2200 }); break;
      case "gumStick":   // 泡泡糖黏在地上
        for (const sp of ev.spots) fx.push({ k: "gum", x: sp.x, y: sp.y, t, dur: 2200 });
        break;
      case "strike":
        playSound(ev.sound, ev.rate || 1);
        if (ev.kind === "passionSlash") { fx.push({ k: "bigSlash", ...ev, t, dur: 600 }); shakeUntil = t + 250; break; }
        if (ev.kind === "judgment") { fx.push({ k: "laser", ...ev, t, dur: 450 }); break; }
        if (ev.kind === "bellRing") { fx.push({ k: "bellWave", x: ev.x, y: ev.y, radius: ev.radius, t, dur: 650 }); break; }
        if (ev.kind === "pillar") { fx.push({ k: "pillar", x: ev.x, y: ev.y, radius: ev.radius, t, dur: 750 }); break; }
        if (ev.kind === "cage") break;
        if (ev.kind === "crossSwing") fx.push({ k: "crossSwing", unit: ev.owner, ang: ev.ang, t, dur: 420 });
        if (ev.kind === "scythe") {
          const side = ev.sweep || 1;
          fx.push({ k: "scythe", unit: ev.owner, from: ev.ang - side * (ev.half + 0.35), to: ev.ang + side * ev.half, side, t, dur: 650 });
        }
        if (ev.kind === "tentacle" && ev.arm) {
          // 從靠近原本方向的那一側開始掃
          const a1 = ev.ang - ev.half, a2 = ev.ang + ev.half, rest = ev.arm.angle;
          const [from, to] = R.geo.angDiff(rest, a1) <= R.geo.angDiff(rest, a2) ? [a1, a2] : [a2, a1];
          fx.push({ k: "swing", arm: ev.arm, from, to, t, dur: 700 });
        }
        if (ev.kind === "laser") fx.push({ k: "laser", ...ev, t, dur: 500 });
        else if (ev.kind === "electric") fx.push({ k: "electric", ...ev, t, dur: 500 });
        else if (ev.shape === "sector") fx.push({ k: "sector", ...ev, t, dur: 450 });
        else if (ev.shape === "circle") fx.push({ k: "ring", x: ev.x, y: ev.y, r: ev.radius, color: "#e53935", t, dur: 600 });
        else fx.push({ k: "rect", ...ev, t });
        if (ev.lunge) fx.push({ k: "lunge", unit: ev.owner, ang: ev.ang, len: ev.length * 0.55, t, dur: 320 });
        if (ev.shot) fx.push({ k: "tracer", x: ev.owner.x, y: ev.owner.y, ang: ev.ang, length: ev.length, r: ev.owner.r, t, dur: 260 });
        if (ev.bigSlash) { fx.push({ k: "bigSlash", x: ev.x, y: ev.y, ang: ev.ang, length: ev.length, width: ev.width, t, dur: 700 }); shakeUntil = t + 350; }
        if (ev.fire) {
          const blue = ev.fire === "blue", fx0 = ev.fromX ?? ev.x, fy0 = ev.fromY ?? ev.y;
          if (ev.shape === "circle") {
            fx.push({ k: "fireball", x: fx0, y: fy0, tx: ev.x, ty: ev.y, blue, t, dur: 260 });          // 從鬼火裡射出的火球
            fx.push({ k: "fireBurst", x: ev.x, y: ev.y, r: ev.radius, blue, t: t + 200, dur: 700 });
          } else {
            const ex = ev.x + Math.cos(ev.ang) * ev.length, ey = ev.y + Math.sin(ev.ang) * ev.length;
            fx.push({ k: "fireball", x: fx0, y: fy0, tx: ex, ty: ey, blue, t, dur: 420 });
          }
        }
        if (ev.burst) { fx.push({ k: "splash", x: ev.x, y: ev.y, r: ev.radius, t, dur: 800 }); shakeUntil = t + 300; }
        if (ev.words) fx.push(ev.shape === "circle" ? { k: "wordRing", x: ev.x, y: ev.y, r: ev.radius, text: ev.words, color: ev.owner.def.color || "#5a3a8a", t, dur: 700 }
          : { k: "words", x: ev.owner.x, y: ev.owner.y, ang: ev.ang, length: ev.length, text: ev.words, color: ev.owner.def.color || "#5a3a8a", t, dur: 650 });
        break;
      case "blocked":
        fx.push({ k: "shield", unit: ev.unit, t, dur: 500 });
        fx.push({ k: "num", x: ev.unit.x, y: ev.unit.y - ev.unit.r - 18, text: "立場阻擋", color: "#3d7fe0", t });
        break;
      case "bulletHit": fx.push({ k: "ring", x: ev.x, y: ev.y, r: 14, color: "#e8262c", t, dur: 250 }); break;
      case "pulse": for (const m of ev.units) fx.push({ k: "ring", x: m.x, y: m.y, r: 60, color: "#e8262c", t, dur: 400 }); break;
      case "enemyDodge":
        // 攻擊靠近時才開始移動：在這之前畫面維持原位
        for (const m of ev.group || [ev.unit]) hold.set(m.id, t + ev.delay * 1000);
        fx.push({ k: "num", x: ev.unit.x, y: ev.unit.y - ev.unit.r - 24, text: ev.failed ? "閃避失敗" : "閃避！", color: ev.failed ? "#8a8478" : "#3d7fe0", t: t + ev.delay * 1000, dur: 900 });
        break;
      case "bossUlt":
        fx.push({ k: "ring", x: ev.unit.x, y: ev.unit.y, r: 260, color: "#e8262c", t, dur: 700 });
        showUltBanner(ev.text, ev.style);
        break;
      case "bossUltEnd": hideUltBanner(); break;
      case "crystalBreak": fx.push({ k: "ring", x: ev.x, y: ev.y, r: 90, color: "#e8262c", t, dur: 700 }); fx.push({ k: "num", x: ev.x, y: ev.y - 50, text: "水晶碎了！", color: "#e8262c", t, dur: 1100 }); shakeUntil = t + 400; break;
      case "over": grantXp(); worldResult(); recordBestiary(); break;
      case "bark": {
        // 個性台詞：依機率出現，同一個角色 2.5 秒內不重複跳（比較特別的台詞可以蓋掉）
        const set = ev.unit.def.barks?.[ev.key];
        if (!set || !ev.unit.alive) break;
        if (Math.random() >= (set.chance ?? 0.4)) break;
        const last = lastBark.get(ev.unit.id);
        const at = t + (ev.delay || 0) * 1000;
        if (last && at - last.t < 2500 && (set.chance ?? 0.4) <= last.chance) break;
        lastBark.set(ev.unit.id, { t: at, chance: set.chance ?? 0.4 });
        const text = set.lines[Math.floor(Math.random() * set.lines.length)];
        if (ev.delay) setTimeout(() => bubble(ev.unit, text, ev.unit.def.color), ev.delay * 1000);
        else bubble(ev.unit, text, ev.unit.def.color);
        break;
      }
      case "growth":
        fx.push({ k: "ring", x: ev.unit.x, y: ev.unit.y, r: 46, color: "#e0b800", t, dur: 700 });
        fx.push({ k: "num", x: ev.unit.x, y: ev.unit.y - 60, text: `Lv ${ev.level}`, color: "#c79a00", t, dur: 1200 });
        break;
      case "death":
        if (SCARE) fx.push({ k: "num", x: ev.unit.x, y: ev.unit.y - 50, text: "嚇破膽！", color: PURPLE, t, dur: 1400 });
        if (ev.unit.part) fx.push({ k: "ring", x: ev.unit.x, y: ev.unit.y, r: 70, color: "#7a7a7a", t, dur: 700 });
        break;
    }
    // 正在瞄準的技能變得不能用（例如輪到敵人時的大招）就取消瞄準
    if (B.phase === "over") mode = "move";
    else if (mode !== "move" && (!statusOf(mode).ready || !usableNow(mode))) mode = "move";
    renderUI();
  }

  function act(fn) {
    try { fn(); } catch (e) { if (e instanceof R.ActionError) toast(e.message); else throw e; }
  }

  const myTurn = () => B && B.phase === "player";
  const canAct = () => B && B.canAct();                       // 自己回合或敵人回合都能行動
  const mult = () => (B ? B.costMult() : 1);                  // 非自己回合 ×2
  const effCost = (st) => (B.freeAP ? 0 : st.cost * mult());
  const allowedNow = (id) => !B.allowed || B.allowed.has(id);
  const usableNow = (id) => !(B.offTurn() && id === CH.ultimate) && allowedNow(id);
  const pos = (u) => disp.get(u.id) || u;
  // 部位（矩陣）優先，才不會被大大的核心擋住
  // 聖牢籠很大：只有點在框線附近才算點到它（框裡面可以照常移動）
  const onCageEdge = (c, p) => {
    const dx = Math.abs(p.x - c.x), dy = Math.abs(p.y - c.y), h = c.size / 2;
    return Math.max(dx, dy) <= h + 12 && Math.max(dx, dy) >= h - 16;
  };
  const unitAt = (p) => B.units.filter((u) => u.alive && !u.state?.dived && (u.cage ? onCageEdge(u, p) : dist(pos(u).x, pos(u).y, p.x, p.y) <= u.r + 4))
    .sort((a, b) => (a.cage ? 1 : 0) - (b.cage ? 1 : 0) || a.r - b.r)[0] || null;
  const statusOf = (id) => CH.skills[id].status(B, B.player);
  const smokes = () => B.zones.filter((z) => z.type === "smoke");

  // ---------- 輸入 ----------
  function toWorld(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }
  canvas.addEventListener("mousemove", (e) => { Object.assign(mouse, toWorld(e), { in: true }); inspect(unitAt(mouse)); });
  canvas.addEventListener("mouseleave", () => { mouse.in = false; inspect(null); });
  canvas.addEventListener("contextmenu", (e) => { e.preventDefault(); mode = "move"; renderUI(); });

  canvas.addEventListener("click", (e) => {
    if (dlg.active) return advanceDialog();
    if (!B || B.phase === "over") return;
    const p = toWorld(e);
    const hit = unitAt(p);
    if (!canAct()) return toast("現在不能行動");
    const enemy = hit && hit.team === "enemy" ? hit : null;

    if (mode === "move") {
      if (enemy) act(() => B.useSkill(CH.basic, { target: enemy }));
      // 普攻可以丟向自己人的角色（薇薇拉）：點自己或召喚物 → 丟過去補血
      else if (hit && (hit === B.player || hit.summon) && CH.skills[CH.basic].aimAlly) act(() => B.useSkill(CH.basic, { x: hit.x, y: hit.y }));
      else if (hit) toast("那裡有其他單位");
      else act(() => B.move(p.x, p.y));
      return;
    }
    const id = mode, aim = statusOf(id).aim || { type: "none" };
    if (aim.type === "enemy") {
      // 普攻按 A：不用指定敵人，點地面就朝那個方向打
      if (!enemy && aim.free) act(() => B.useSkill(id, { x: p.x, y: p.y }));
      else if (!enemy) return toast("請點選一個敵人");
      else act(() => B.useSkill(id, { target: enemy }));
    } else if (aim.type === "point") {
      act(() => B.useSkill(id, clampToRange(p, aim.range)));
    } else if (aim.type === "direction") {
      act(() => B.useSkill(id, { x: p.x, y: p.y }));
    }
    mode = "move";
    renderUI();
  });

  function clampToRange(p, range) {
    const u = B.player;
    const d = dist(u.x, u.y, p.x, p.y);
    return d <= range ? { x: p.x, y: p.y } : { x: u.x + ((p.x - u.x) / d) * range, y: u.y + ((p.y - u.y) / d) * range };
  }

  // 按技能鍵：不用瞄準的直接施放，要瞄準的進入瞄準模式
  function pressSkill(id) {
    if (!id) return;
    if (!canAct()) return toast("現在不能行動");
    if (!allowedNow(id)) return toast("教學中還不能使用");
    if (!usableNow(id)) return toast("大招只能在自己的回合使用");
    const st = statusOf(id);
    if (!st.ready) return toast(st.reason || "現在不能用");
    if (B.player.ap < effCost(st)) return toast(`行動點不足（需要 ${effCost(st)}）`);
    if ((st.mp || 0) > B.player.mp) return toast(`魔力不足（需要 ${st.mp}）`);
    if (!st.aim || st.aim.type === "none") { mode = "move"; act(() => B.useSkill(id)); renderUI(); return; }
    mode = mode === id ? "move" : id;
    renderUI();
  }
  const slotButtons = [...document.querySelectorAll(".skill")];
  slotButtons.forEach((b) => b.addEventListener("click", () => pressSkill(CH.hud[b.dataset.pos])));
  let hoverSkill = null;   // 滑鼠停在技能按鈕上：預覽不用瞄準的技能（例如試煉、業障）
  slotButtons.forEach((b) => {
    b.addEventListener("mouseenter", () => { hoverSkill = CH.hud[b.dataset.pos]; });
    b.addEventListener("mouseleave", () => { hoverSkill = null; });
  });
  $("#endBtn").addEventListener("click", () => act(() => B.endTurn()));
  $("#againBtn").addEventListener("click", newBattle);
  $("#restartBtn").addEventListener("click", newBattle);
  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    if (document.querySelector("#buildPanel:not(.hidden)")) return;   // 角色成長介面開著時不操作戰鬥
    const k = e.key.toLowerCase();
    if (dlg.active) {   // 對話中：空白鍵 / Enter 推進，其他按鍵不動作
      if (k === " " || k === "enter") { e.preventDefault(); advanceDialog(); }
      return;
    }
    if (k === "e" && B?.tutorial?.pressE()) return;   // 教學：在 NPC 旁按 E
    const sk = Object.entries(CH.skills).find(([, s]) => s.key === k);
    if (sk) pressSkill(sk[0]);
    else if (k === "escape") { mode = "move"; renderUI(); }
    else if (k === " ") {
      e.preventDefault();
      if (myTurn()) act(() => B.endTurn());
    }
  });

  // ---------- Boss 大招標示：大招期間顯示，結束後淡出 ----------
  let ultFadeTimer;
  function showUltBanner(text, style) {
    const el = $("#ultBanner");
    clearTimeout(ultFadeTimer);
    el.textContent = text;
    el.classList.toggle("passion", style === "passion");
    el.classList.remove("hidden", "out");
    void el.offsetWidth;            // 重新觸發進場動畫
    el.classList.add("in");
  }
  function hideUltBanner() {
    const el = $("#ultBanner");
    el.classList.remove("in");
    el.classList.add("out");
    ultFadeTimer = setTimeout(() => el.classList.add("hidden"), 900);
  }

  // ---------- 對話框（打字效果；顯示完再點一下才到下一句） ----------
  const dlg = { active: false, lines: [], i: 0, shown: 0, timer: null, resolve: null };
  function dialog(lines, speaker = "羽澤璃央") {
    return new Promise((resolve) => {
      closeDialog();
      Object.assign(dlg, { active: true, lines, i: 0, shown: 0, resolve });
      $("#dialogName").textContent = speaker;
      $("#dialog").classList.remove("hidden");
      typeLine();
      renderUI();
    });
  }
  function typeLine() {
    clearInterval(dlg.timer);
    dlg.shown = 0;
    const text = dlg.lines[dlg.i];
    $("#dialogNext").classList.add("hidden");
    dlg.timer = setInterval(() => {
      dlg.shown = Math.min(text.length, dlg.shown + 1);
      $("#dialogText").textContent = text.slice(0, dlg.shown);
      if (dlg.shown >= text.length) { clearInterval(dlg.timer); $("#dialogNext").classList.remove("hidden"); }
    }, 32);
  }
  function advanceDialog() {
    if (!dlg.active) return;
    const text = dlg.lines[dlg.i];
    if (dlg.shown < text.length) {        // 還在打字：直接顯示整句
      clearInterval(dlg.timer);
      dlg.shown = text.length;
      $("#dialogText").textContent = text;
      $("#dialogNext").classList.remove("hidden");
      return;
    }
    dlg.i++;
    if (dlg.i < dlg.lines.length) return typeLine();
    const done = dlg.resolve;
    closeDialog();
    renderUI();
    done?.();
  }
  function closeDialog() {
    clearInterval(dlg.timer);
    dlg.active = false; dlg.resolve = null;
    $("#dialog").classList.add("hidden");
  }
  $("#dialog").addEventListener("click", advanceDialog);

  // 頭上的對話泡泡
  const bubbles = [];
  const lastBark = new Map();
  function bubble(unit, text, color) {
    for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].unit === unit) bubbles.splice(i, 1);
    bubbles.push({ unit, text, color, t: performance.now(), dur: Math.max(2400, 1200 + text.length * 120) });
  }
  function drawBubbles(now) {
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i], k = (now - b.t) / b.dur;
      if (k >= 1) { bubbles.splice(i, 1); continue; }
      const p = pos(b.unit);
      ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
      ctx.font = "bold 14px 'Noto Sans TC', sans-serif";
      const w = ctx.measureText(b.text).width + 22, h = 30, x = p.x - w / 2, y = p.y - b.unit.r - 58;
      roundRect(x, y, w, h, 8);
      ctx.fillStyle = "#fff"; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = b.color || "#f4a6c7"; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p.x - 7, y + h); ctx.lineTo(p.x, y + h + 9); ctx.lineTo(p.x + 7, y + h); ctx.closePath();
      ctx.fillStyle = "#fff"; ctx.fill();
      ctx.fillStyle = "#1d1d1f"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(b.text, p.x, y + h / 2 + 1);
      ctx.globalAlpha = 1;
    }
  }

  // 嚴重錯誤：紅色橫條一直顯示
  function showError(msg) {
    const el = $("#fatal");
    el.textContent = msg;
    el.classList.remove("hidden");
  }

  // ---------- DOM 介面 ----------
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.remove("hidden");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add("hidden"), 1600);
  }

  function previewCost() {
    if (!canAct()) return 0;
    if (mode !== "move") return effCost(statusOf(mode));
    if (!mouse.in) return 0;
    const h = unitAt(mouse);
    return h && h.team === "enemy" ? effCost(statusOf(CH.basic)) : C.moveCost * mult();
  }
  // 頭上的行動點：藍色小菱形，要花掉的那幾點變紅；教學中不消耗時顯示 ∞
  function drawApPips(u, x, y) {
    if (B.freeAP) { label("∞", x, y, "#1aa3e8", 14); return; }
    const cost = previewCost(), n = Math.max(u.maxAp, u.ap), gap = 11;     // 霍夫曼的加速機：行動點可以超過上限
    for (let i = 0; i < n; i++) {
      const on = i < u.ap, spend = on && cost > 0 && cost <= u.ap && i >= u.ap - cost;
      const px = x - ((n - 1) * gap) / 2 + i * gap, s = 4.6;
      ctx.beginPath();
      ctx.moveTo(px, y - s); ctx.lineTo(px + s, y); ctx.lineTo(px, y + s); ctx.lineTo(px - s, y); ctx.closePath();
      ctx.fillStyle = spend ? "#e53935" : on ? "#1aa3e8" : "#fffdf8"; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = spend ? "#e53935" : on ? "#1577b0" : "#c9c4b9"; ctx.stroke();
    }
  }

  function renderUI() {
    if (!B) return;
    const u = B.player;
    $("#result").classList.toggle("hidden", B.phase !== "over");
    $("#resultTitle").textContent = SCARE && B.result === "win" ? "把對手嚇跑了！" : SCARE && B.result === "lose" ? "嚇破膽了……" : B.result === "win" ? (ROOMDEF.escort ? "護送成功！" : "勝利！") : B.result === "escortFail" ? "護送失敗" : B.result === "fled" ? "撤退成功" : FROM_WORLD && B.result === "lose" ? "全員倒下……委託失敗" : "被打倒了…";
    $("#resultXp").innerHTML = xpNote;
    const prefight = B.scripted && !B.inFight;      // 教學的說明階段：沒有回合
    $("#roundInfo").textContent = prefight ? "" : B.realtime ? `剩餘 ${Math.ceil(B.escortLeft())} 秒` : `第 ${B.round} 回合`;

    $("#order").innerHTML = prefight ? "" : B.order.map((x, i) => {
      const cls = ["chip", x.team, i === B.idx ? "now" : "", x.alive ? "" : "dead", i < B.idx ? "done" : ""].join(" ");
      const mod = x.initMod ? `${x.initMod > 0 ? "+" : ""}${x.initMod}` : "";
      const roll = x.def.alwaysFirst ? "必定先手" : `d20 ${x.initRoll}+${x.spd}${mod}=${x.initiative}`;
      const tip = x.def.alwaysFirst ? "必定先手" : `1d20 擲出 ${x.initRoll} ＋ 速度 ${x.spd}${mod ? `，${x.initMod > 0 ? "迎戰" : "遇襲"} ${mod}` : ""}`;
      return `<div class="${cls}" title="${tip}"><span class="dot"></span>${esc(x.name)}<span class="spd">${roll}</span></div>`;
    }).join("");

    for (const b of slotButtons) {
      const id = CH.hud[b.dataset.pos], sk = CH.skills[id], st = statusOf(id);
      b.querySelector(".key").textContent = sk.slot;
      b.querySelector(".nm").textContent = st.label;
      b.querySelector(".cost").textContent = `★${effCost(st)}${st.note ? " · " + st.note : ""}`;
      b.disabled = !canAct() || !st.ready || !usableNow(id) || u.ap < effCost(st) || (st.mp || 0) > u.mp || dlg.active;
      b.classList.toggle("locked", !allowedNow(id));
      b.classList.toggle("active", mode === id);
      b.classList.toggle("cooling", !st.ready);
      b.classList.toggle("armed", id === "load" && !!u.state.loaded);
      b.title = `${sk.name}：${sk.desc}`;
    }
    $("#endBtn").disabled = !myTurn() || (B.scripted && !B.inFight) || dlg.active;
    $("#endBtn").classList.toggle("hidden", !!ROOMDEF.escort);
    const fb = $("#fleeBtn");
    if (fb) { fb.disabled = !myTurn() || dlg.active || B.phase === "over"; fb.textContent = `撤退 ${Math.round(fleeChance() * 100)}%`; }
    if (SCARE) { setBar(".bar.hp", u.maxHp - u.hp, u.maxHp, `驚嚇值 ${u.maxHp - u.hp} / ${u.maxHp}`); $(".bar.hp").classList.add("scare"); }
    else setBar(".bar.hp", u.hp, u.maxHp, `HP ${u.hp} / ${u.maxHp}${u.shield ? `（護盾 ${u.shield}）` : ""}`);
    // 魔力條：有魔力的角色才顯示
    const mpBar = $(".bar.mp");
    if (mpBar) {
      mpBar.classList.toggle("hidden", !u.maxMp || !CH.mpRegen);   // 有魔力回復的角色才顯示
      if (u.maxMp) setBar(".bar.mp", u.mp, u.maxMp, `MP ${u.mp} / ${u.maxMp}`);
    }
    // 寶物欄（6 格）
    const itemsEl = $("#items");
    if (itemsEl && R.Items) {
      const key = (u.items || []).join(",");
      if (itemsEl.dataset.key !== key || !itemsEl.childElementCount) {
        itemsEl.dataset.key = key;
        itemsEl.innerHTML = Array.from({ length: R.Items.SLOTS }, (_, i) => R.Items.slotHtml((u.items || [])[i])).join("");
      }
    }
    if (CH.passive) {
      const ps = CH.passive.status(B, u);
      const el = $("#passive");
      el.innerHTML = `<b>${esc(CH.passive.name)}</b><span>${esc(ps.text)}</span>`;
      el.classList.toggle("on", !!ps.on);
      el.title = CH.passive.desc;
    }
    if (CH.ultimate) {
      const need = CH.skills[CH.ultimate].charge;
      setBar(".bar.charge", u.charge, need, u.charge >= need ? "大招就緒" : `大招充能 ${u.charge} / ${need}`);
    }

    // Boss 的大血條（畫面正上方）
    const big = B.units.find((x) => x.def.bigBar && !x.part);
    const bar = $("#bossBar");
    if (bar) {
      bar.classList.toggle("hidden", !big);
      $("#canvasWrap").classList.toggle("has-bossbar", !!big);
      if (big) {
        const P2 = big.state.phase === 2;
        bar.classList.toggle("p2", P2);
        bar.querySelector(".bn").textContent = big.name;
        bar.querySelector(".bb i").style.width = `${(big.hp / big.maxHp) * 100}%`;
        bar.querySelector(".bb s").style.left = `${big.def.phase2At * 100}%`;
        bar.querySelector(".bb s").classList.toggle("hidden", P2 || !big.def.phase2At);
        bar.querySelector(".bv").textContent = `${big.hp} / ${big.maxHp}`;
        bar.querySelector(".bp").textContent = big.alive ? (big.def.phase2At ? (P2 ? "第二階段" : "第一階段") : "") : "擊敗";
      }
    }

    const log = $("#log");
    log.innerHTML = B.log.map((l) => `<li class="${l.startsWith("──") ? "sep" : l.startsWith("順序") ? "muted" : ""}">${esc(scareText(l))}</li>`).join("");
    log.scrollTop = log.scrollHeight;

    const banner = $("#banner");
    banner.className = "";
    const obj = B.tutorial?.objective?.();
    if (dlg.active) banner.classList.add("hidden");
    else if (obj && !(B.inFight && B.tutorial?.stage === "fight")) {
      banner.classList.add("tutorial");
      banner.textContent = obj;
    } else if (B.realtime && B.phase !== "over") {
      const left = Math.ceil(B.escortLeft()), carts = B.wards.filter((w) => w.alive).length;
      let text = `護送戰：剩 ${left} 秒・馬車 ${carts} / ${B.wards.length}（至少保住 ${ROOMDEF.need} 輛）・行動點每 ${ROOMDEF.apEvery} 秒 +1`;
      if (mode !== "move") {
        const aim = statusOf(mode).aim?.type;
        text = `「${statusOf(mode).label}」：` + (aim === "direction" ? "點擊方向射出" : aim === "enemy" ? "點選敵人" : "點選位置") + "（右鍵 / Esc 取消）";
      }
      banner.textContent = text;
      banner.classList.toggle("warn", left <= 15);
    } else if (myTurn()) {
      const warn = B.charges.length ? "　注意：地上有壓制範圍" : B.projectiles.length ? "　注意：光彈還在飛" : "";
      let text = `你的回合：點地面移動、點敵人${CH.skills[CH.basic].name}`;
      if (mode !== "move") {
        const aim = statusOf(mode).aim?.type;
        text = `「${statusOf(mode).label}」：` + (aim === "direction" ? "點擊方向射出" : aim === "enemy" ? "點選敵人" : "點選位置") + "（右鍵 / Esc 取消）";
      } else if (u.ap === 0) text = "行動點用完了，還有不花行動點的動作可以做，或按結束回合";
      banner.textContent = text + warn;
    } else if (B.offTurn()) {
      // 敵人回合（被攻擊時也一樣），不額外跳出攻擊提示
      banner.textContent = `${B.current?.name ?? "敵人"} 行動中…　你的行動消耗 ×${mult()}（大招除外）`;
    } else banner.classList.add("hidden");

    if (hovered) inspect(hovered);
  }

  function setBar(sel, v, max, text) {
    $(sel + " i").style.width = `${Math.min(100, (v / max) * 100)}%`;
    $(sel + " span").textContent = text;
  }

  let hovered = null;
  // 角色身上選到的技能強化名稱
  function upgradeNames(u) {
    const out = [];
    for (const [slot, tree] of Object.entries(CH.upgrades || {}))
      tree.tiers.forEach((opts, i) => {
        const o = opts.find((x) => x.id === u.upg?.[slot + (i + 1)]);
        if (o) out.push(o.name);
      });
    return out;
  }

  function inspect(u) {
    hovered = u;
    const box = $("#inspect");
    if (!u || !B) { box.innerHTML = '<span class="muted">把滑鼠移到單位上</span>'; return; }
    if (u.kind === "mentor") {
      const rows = u.npc ? [["身分", "教學 NPC"], ["說明", "打她不會受傷，只會吐槽"]]
        : [["生命", `${u.hp} / ${u.maxHp}`], ["攻擊", u.atk], ["防禦", u.df], ["行動點", `${u.ap} / ${u.maxAp}`], ["招式", "移動、鐮刀揮砍"]];
      box.innerHTML = `<div class="nm">${esc(u.name)}</div><table>${rows.map(([a, b]) => `<tr><td class="muted">${a}</td><td>${b}</td></tr>`).join("")}</table>`;
      return;
    }
    if (u.demon) {
      box.innerHTML = `<div class="nm">心魔</div><table><tr><td class="muted">生命</td><td>1（一擊就倒）</td></tr>
        <tr><td class="muted">說明</td><td>只有${esc(u.owner.name)}能攻擊</td></tr></table>`;
      return;
    }
    const table = (rows) => `<div class="nm">${esc(u.name)}</div><table>${rows.map(([a, b]) => `<tr><td class="muted">${a}</td><td>${b}</td></tr>`).join("")}</table>`;
    const own = u.summon && CH.summonInfo?.(u);
    if (own) { box.innerHTML = table(own); return; }
    if (u.kind === "giantShroom") {
      const sk = CH.skills.bloom;
      box.innerHTML = table([["生命", `${u.hp} / ${u.maxHp}`], ["防禦", u.df], ["剩餘", `${u.turnsLeft} 回合`],
        ["胞子", `半徑 ${sk.sporeRadius} 內的敵人回合開始時受到傷害並麻痺`], ["吸引火力", "低智力的敵人會優先攻擊它"]]);
      return;
    }
    if (u.cage) {
      box.innerHTML = table([["耐久", `再攻擊 ${u.hp} 次就會破`], ["效果", "困在裡面無法離開；每個敵人回合開始時受到傷害"], ["攻擊方式", "點框線攻擊，或用技能打到它"]]);
      return;
    }
    if (u.def.ai === "passion") {
      const D = u.def, P2 = u.state.phase === 2;
      const rows = [["階段", P2 ? "第二階段（會移動、會閃避）" : `第一階段（不會移動，剩 ${Math.round(D.phase2At * 100)}% 生命時變身）`],
        ["生命", `${u.hp} / ${u.maxHp}`], ["攻擊", u.atk], ["防禦", u.df], ["速度", P2 ? `${u.spd}（移動 ${B.moveRadius(u)}）` : `${u.spd}（不會移動）`],
        ["行動點", `${u.ap} / ${u.maxAp}（保留 ${D.reserveAp} 點${P2 ? "閃避" : "搶先出手"}）`]];
      if (u.state.plunged) rows.push(["狀態", "劍插在地上蓄力（不能揮劍）"]);
      rows.push(["神的狂怒", P2 ? (B.round >= u.state.ultReady ? "就緒" : `第 ${u.state.ultReady} 回合起`) : "第二階段才會使用"]);
      if (!P2) rows.push(["受苦的詛咒", "教徒、教皇倒下時馬上復活（偽神失去 3% / 10% 生命）"]);
      box.innerHTML = table(rows);
      return;
    }
    if (u.def.minion) {
      const boss = B.mainEnemies().find((e) => e.def.ai === "passion");
      const rows = [["生命", `${u.hp} / ${u.maxHp}`], ["攻擊", u.atk], ["防禦", u.df], ["行動點", `${u.ap} / ${u.maxAp}`]];
      if (u.def.minion === "cultist") rows.push(["強化", u.state.buff ? `傷害 ×${(1 + u.state.buff * u.def.buffPer).toFixed(1)}` : "沒有"]);
      if (u.def.minion === "pope") rows.push(["招式", "擴散圓環（強化教徒）、聖牢籠"]);
      if (boss) rows.push(["倒下時", `偽神失去 ${Math.round(boss.def.minionLoss[u.def.minion] * 100)}% 生命`]);
      box.innerHTML = table(rows);
      return;
    }
    if (u.part) {
      const core = u.parent, broken = core.parts.filter((p) => !p.alive).length;
      const rows = [["生命", `${u.hp} / ${u.maxHp}`], ["防禦", u.df],
        ["破壞後", `核心受傷 ×${core.def.coreMult[Math.min(3, broken + 1)]}`]];
      box.innerHTML = `<div class="nm">${esc(u.name)}</div><table>${rows.map(([a, b]) => `<tr><td class="muted">${a}</td><td>${b}</td></tr>`).join("")}</table>`;
      return;
    }
    const rows = [["生命", `${u.hp} / ${u.maxHp}`], ["攻擊", u.atk], ["防禦", u.df],
      ["速度", u.def.boss ? `${u.spd}（不會移動）` : `${u.spd}（移動 ${B.moveRadius(u)}）`], ["行動點", `${u.ap} / ${u.maxAp}`]];
    if (u.def.boss && u.def.incomingMult) {
      const k = u.def.incomingMult(B, u);
      rows.push(["核心立場", k === 0 ? "無敵（先破壞矩陣）" : `受到傷害 ×${k}`]);
      rows.push(["大招", B.round >= u.state.ultReady ? "就緒" : `第 ${u.state.ultReady} 回合起`]);
    } else if (u.team === "player") {
      rows.unshift(["等級", `Lv ${u.level || 1}`]);
      if (u.maxMp) rows.splice(2, 0, ["魔力", `${u.mp} / ${u.maxMp}`]);
      const names = upgradeNames(u);
      if (names.length) rows.push(["技能強化", names.join("、")]);
      if (CH.passive) rows.push([CH.passive.name, CH.passive.status(B, u).text]);
      for (const id of Object.values(CH.hud)) rows.push([CH.skills[id].name, statusOf(id).note || (statusOf(id).ready ? "就緒" : "")]);
      if (u.state.loaded) rows.push(["上膛", "已上膛"]);
    } else {
      const st = u.state;
      rows.push(["壓制", st.slamPending ? "蓄力中" : st.slamCd > 0 ? `冷卻中（${st.slamCd} 次行動）` : "就緒"]);
    }
    box.innerHTML = `<div class="nm">${esc(u.name)}</div><table>${rows.map(([a, b]) => `<tr><td class="muted">${a}</td><td>${b}</td></tr>`).join("")}</table>`;
  }

  // ---------- 數值調整面板 ----------
  const SL = C.enemies.slime, SK = CH.skills, MB = C.enemies.matrixBoss;
  const kinds = new Set(ROOMDEF.wave.map((w) => w.kind));
  const TUNE = [];
  if (kinds.has("matrixBoss")) TUNE.push(
    ["殲滅矩陣", null],
    ["預告反應時間（秒）", MB, "reaction", 0.3, 3, 0.1],
    ["光彈速度", MB.bullet, "speed", 80, 600, 10],
    ["觸手 基礎傷害", MB.swipe, "base", 1, 40, 1],
    ["觸手 揮動角度（半角°）", MB.swipe, "half", 10, 90, 5],
    ["保留閃避行動點", MB, "reserveAp", 0, 8, 1],
    ["閃避機率（遠距離）", MB.dodge, "maxChance", 0, 1, 0.05],
    ["閃避機率（近身）", MB.dodge, "minChance", 0, 1, 0.05],
    ["電流 基礎傷害", MB.electric, "base", 1, 40, 1],
    ["電流 半徑", MB.electric, "radius", 50, 250, 5],
    ["核心射擊 每發傷害", MB.shot, "base", 1, 20, 1],
    ["激光 基礎傷害", MB.laser, "base", 1, 50, 1],
    ["激光 寬度", MB.laser, "width", 20, 200, 5],
    ["環狀光彈 每發傷害", MB.ring, "base", 1, 20, 1],
    ["環狀光彈 數量", MB.ring, "count", 4, 24, 1],
    ["大招 間隔（回合）", MB.ult, "every", 1, 8, 1],
    ["背景音樂音量", C, "bgmVolume", 0, 1, 0.05],
  );
  if (kinds.has("passion")) {
    const PS = C.enemies.passion, CU = C.enemies.cultist, PO = C.enemies.pope;
    TUNE.push(
      ["受難之日", null],
      ["預告反應時間（秒）", PS, "reaction", 0.3, 3, 0.1],
      ["變身門檻（剩餘生命比例）", PS, "phase2At", 0.1, 0.9, 0.05],
      ["搶先出手機率", PS, "preemptChance", 0, 1, 0.05],
      ["揮砍 基礎傷害", PS.slash, "base", 1, 80, 1],
      ["揮砍 長度", PS.slash, "length", 200, 900, 10],
      ["揮砍 寬度", PS.slash, "width", 100, 500, 10],
      ["制裁 基礎傷害", PS.judgment, "base", 1, 80, 1],
      ["救贖 基礎傷害", PS.redemption, "base", 1, 80, 1],
      ["救贖 圓圈寬度", PS.redemption, "band", 20, 150, 2],
      ["救贖 空隙寬度", PS.redemption, "gap", 40, 200, 2],
      ["苦難 圓環半徑", PS.suffering, "radius", 100, 500, 10],
      ["苦難 基礎傷害", PS.suffering, "base", 1, 60, 1],
      ["神的狂怒 光柱數", PS.ult, "count", 1, 30, 1],
      ["神的狂怒 光柱半徑", PS.ult, "radius", 30, 160, 2],
      ["神的狂怒 基礎傷害", PS.ult, "base", 1, 80, 1],
      ["教徒 揮砍傷害", CU.swing, "base", 1, 60, 1],
      ["教徒 每層強化", CU, "buffPer", 0, 1, 0.05],
      ["教皇 圓環半徑", PO.ring, "radius", 80, 400, 10],
      ["教皇 圓環傷害", PO.ring, "base", 1, 60, 1],
      ["聖牢籠 大小", PO.cage, "size", 100, 400, 10],
      ["聖牢籠 耐久（次）", PO.cage, "hits", 1, 12, 1],
      ["聖牢籠 每次傷害", PO.cage, "base", 1, 60, 1],
      ["背景音樂音量", C, "bgmVolume", 0, 1, 0.05],
    );
  }
  if (kinds.has("slime")) TUNE.push(
    ["史萊姆", null],
    ["撞擊 反應時間（秒）", SL.ram, "reaction", 0.3, 3, 0.1],
    ["撞擊 長度", SL.ram, "length", 40, 300, 5],
    ["撞擊 寬度", SL.ram, "width", 30, 160, 2],
    ["撞擊 基礎傷害", SL.ram, "base", 1, 40, 1],
    ["壓制 施放距離", SL.slam, "range", 150, 600, 10],
    ["壓制 範圍半徑", SL.slam, "radius", 50, 250, 5],
    ["壓制 基礎傷害", SL.slam, "base", 1, 50, 1],
    ["壓制 冷卻（次行動）", SL.slam, "cooldown", 0, 6, 1],
  );
  if (CH.tune?.length) TUNE.push([CH.name, null]);
  for (const [lab, key, field, min, max, step] of CH.tune || [])
    TUNE.push([lab, key === "passive" ? CH.passive : key === "char" ? CH : SK[key], field, min, max, step]);
  TUNE.push(
    ["共用", null],
    ["非自己回合消耗倍率", C, "offTurnMultiplier", 1, 3, 1],
    ["敵人動作間隔（秒）", C, "aiDelay", 0.1, 1.5, 0.05],
    ["怪物回合開始停頓（秒）", C, "enemyTurnDelay", 0, 3, 0.1],
    ["音量", C, "volume", 0, 1, 0.05],
  );
  $("#tunerBody").innerHTML = TUNE.map(([label, obj, , min, max, step], i) => obj === null
    ? `<h3>${esc(label)}</h3>`
    : `<label><span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" data-i="${i}"><output></output></label>`).join("");
  document.querySelectorAll("#tunerBody input").forEach((inp) => {
    const [, obj, key] = TUNE[+inp.dataset.i];
    const out = inp.nextElementSibling;
    inp.value = obj[key];
    out.textContent = obj[key];
    inp.addEventListener("input", () => {
      obj[key] = +inp.value; out.textContent = inp.value;
      if (bgm && key === "bgmVolume") bgm.volume = obj[key];
      renderUI();
    });
  });

  // ---------- 繪圖工具 ----------
  function circle(x, y, r, stroke, fill, width = 2, dash = null) {
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.setLineDash(dash || []); ctx.lineWidth = width; ctx.strokeStyle = stroke; ctx.stroke(); ctx.setLineDash([]); }
  }
  function line(ax, ay, bx, by, color, width = 2, dash = null) {
    ctx.setLineDash(dash || []); ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]);
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function label(text, x, y, color = "#1d1d1f", size = 13) {
    ctx.font = `bold ${size}px 'Noto Sans TC', sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 4; ctx.strokeStyle = "#fffdf8"; ctx.strokeText(text, x, y);
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  }
  function arrowHead(x, y, ang, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - Math.cos(ang - 0.45) * size, y - Math.sin(ang - 0.45) * size);
    ctx.lineTo(x - Math.cos(ang + 0.45) * size, y - Math.sin(ang + 0.45) * size);
    ctx.closePath(); ctx.fill();
  }
  function facingArrow(x, y, ang, len = 46) {
    const sx = x + Math.cos(ang) * 24, sy = y + Math.sin(ang) * 24;
    const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
    ctx.strokeStyle = "#e53935"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
    ctx.moveTo(ex, ey); ctx.lineTo(ex - Math.cos(ang - 0.5) * 10, ey - Math.sin(ang - 0.5) * 10);
    ctx.moveTo(ex, ey); ctx.lineTo(ex - Math.cos(ang + 0.5) * 10, ey - Math.sin(ang + 0.5) * 10);
    ctx.stroke();
  }

  // 標靶：紅白同心圓
  function drawTarget(x, y, r) {
    circle(x, y, r + 2.5, null, "rgba(255,253,248,.95)");
    circle(x, y, r, "#d32f2f", "#d32f2f", 0);
    circle(x, y, r * 0.68, null, "#fff");
    circle(x, y, r * 0.38, null, "#d32f2f");
    circle(x, y, r * 0.12, null, "#fff");
  }

  // 草原背景（房間 terrain: "grass"）
  const GRASS = ROOMDEF.terrain === "grass";
  const grassBg = GRASS ? (() => {
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, "#b4d891"); grd.addColorStop(1, "#a3cc7e");
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    let seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    // 深淺不一的草地斑塊
    for (let i = 0; i < 14; i++) { g.fillStyle = rnd() < 0.5 ? "rgba(140,190,100,.18)" : "rgba(200,228,165,.2)"; g.beginPath(); g.ellipse(rnd() * W, rnd() * H, 50 + rnd() * 70, 26 + rnd() * 30, 0, 0, Math.PI * 2); g.fill(); }
    // 小草
    g.strokeStyle = "rgba(82,140,58,.55)"; g.lineWidth = 1.5;
    for (let i = 0; i < 520; i++) { const x = rnd() * W, y = rnd() * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2, y - 6 - rnd() * 4); g.moveTo(x + 3, y); g.lineTo(x + 6, y - 5 - rnd() * 3); g.stroke(); }
    // 小花
    for (let i = 0; i < 40; i++) { g.fillStyle = ["#fff6d8", "#f6e27a", "#f4c6d8"][i % 3]; g.beginPath(); g.arc(rnd() * W, rnd() * H, 2.2, 0, Math.PI * 2); g.fill(); }
    return c;
  })() : null;
  // 萬聖節旅館（房間 terrain: "hotel"）：深色木地板＋紫色地毯
  const HOTEL = ROOMDEF.terrain === "hotel";
  const hotelBg = HOTEL ? (() => {
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.fillStyle = "#4a3348"; g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 40) { g.fillStyle = y % 80 ? "#523a50" : "#46304a"; g.fillRect(0, y, W, 40); g.strokeStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.fillStyle = "#6b3f8f"; g.fillRect(W * 0.3, 0, W * 0.4, H);
    g.strokeStyle = "#d9a441"; g.lineWidth = 4; g.strokeRect(W * 0.3 + 10, -10, W * 0.4 - 20, H + 20);
    g.fillStyle = "rgba(217,164,65,.35)";
    for (let y = 40; y < H; y += 120) for (const x of [W * 0.4, W * 0.5, W * 0.6]) { g.beginPath(); g.moveTo(x, y - 14); g.lineTo(x + 14, y); g.lineTo(x, y + 14); g.lineTo(x - 14, y); g.closePath(); g.fill(); }
    return c;
  })() : null;
  // 午夜郵局（房間 terrain: "post"）：深藍色的地磚，地上散著寄錯時間的信
  const POST = ROOMDEF.terrain === "post";
  const postBg = POST ? (() => {
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.fillStyle = "#26304f"; g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 64) for (let x = 0; x < W; x += 64) { g.fillStyle = (x / 64 + y / 64) % 2 ? "#2b3658" : "#232c48"; g.fillRect(x, y, 64, 64); }
    let seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W, y = rnd() * H, a = (rnd() - 0.5) * 1.2;
      g.save(); g.translate(x, y); g.rotate(a);
      g.fillStyle = "rgba(240,232,210,.55)"; g.fillRect(-16, -11, 32, 22);
      g.strokeStyle = "rgba(160,140,110,.6)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-16, -11); g.lineTo(0, 2); g.lineTo(16, -11); g.stroke();
      g.restore();
    }
    return c;
  })() : null;
  // 蒙德里安的理想國（房間 terrain: "canvas"）：白色畫布、黑色粗線、紅黃藍色塊
  const CANVAS = ROOMDEF.terrain === "canvas";
  const canvasBg = CANVAS ? (() => {
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.fillStyle = "#1d1d1f"; g.fillRect(0, 0, W, H);
    const xs = [0, 210, 470, 520, 860, 1040, W], ys = [0, 150, 330, 380, 560, H];
    const col = ["#f4f2ea", "#f4f2ea", "#f4f2ea", "#e8262c", "#f4f2ea", "#1a3ae8", "#f4f2ea", "#f0d800", "#f4f2ea"];
    let n = 0;
    for (let j = 0; j < ys.length - 1; j++) for (let i = 0; i < xs.length - 1; i++) {
      const L = 9, x = xs[i] + L, y = ys[j] + L, w = xs[i + 1] - xs[i] - L * 2, h = ys[j + 1] - ys[j] - L * 2;
      g.fillStyle = col[(i * 7 + j * 5 + n++) % col.length]; g.fillRect(x, y, w, h);
    }
    // 中間的戰鬥區淡一點，看得清楚紅框
    g.fillStyle = "rgba(244,242,234,.55)"; g.fillRect(0, 0, W, H);
    return c;
  })() : null;
  // 理性倉庫（房間 terrain: "warehouse"）：水泥地＋黃色安全線；貨架（room.obstacles）畫在背景上，不能站上去、可以當掩體
  const WARE = ROOMDEF.terrain === "warehouse";
  const wareBg = WARE ? (() => {
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.fillStyle = "#d8d4cc"; g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(0,0,0,.06)"; g.lineWidth = 1;
    for (let x = 0; x < W; x += 80) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y < H; y += 80) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.fillStyle = "#e8c23a"; g.fillRect(0, H - 40, W, 8); g.fillRect(0, 32, W, 8);
    const cols = ["#c0392b", "#2f7fa8", "#3a9a4a", "#e8781e", "#7a3fb0", "#d9a441"];
    for (const o of ROOMDEF.obstacles || []) {
      g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(o.x + 6, o.y + 8, o.w, o.h);
      g.fillStyle = "#7a7f88"; g.fillRect(o.x, o.y, o.w, o.h); g.strokeStyle = "#3a3f48"; g.lineWidth = 3; g.strokeRect(o.x, o.y, o.w, o.h);
      const horiz = o.w > o.h, n = Math.floor((horiz ? o.w : o.h) / 30);
      for (let i = 0; i < n; i++) {
        g.fillStyle = cols[(i * 5 + o.x) % cols.length];
        if (horiz) g.fillRect(o.x + 6 + i * 30, o.y + 8, 20, o.h - 16); else g.fillRect(o.x + 8, o.y + 6 + i * 30, o.w - 16, 20);
      }
    }
    return c;
  })() : null;
  // 海上（房間 terrain: "sea"）：海面＋船（玩家只能站在船上 room.walk）
  const SEA = ROOMDEF.terrain === "sea";
  function drawSea(now) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#3f8fbf"); g.addColorStop(1, "#24618a");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 2;
    for (let y = 20; y < H; y += 42) for (let x = -60; x < W; x += 120) {
      const o = Math.sin(now / 900 + x * 0.03 + y * 0.07) * 16;
      ctx.beginPath(); ctx.moveTo(x + o, y); ctx.quadraticCurveTo(x + 22 + o, y - 7, x + 44 + o, y); ctx.stroke();
    }
    const w = ROOMDEF.walk, rock = Math.sin(now / 1100) * 2;
    ctx.save(); ctx.translate(0, rock);
    // 海盜船（右邊）：黑帆、骷髏旗；兩艘船之間搭著跳板
    const S = ROOMDEF.pirateShip;
    if (S) {
      ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(S.x + S.w / 2 + 8, S.y + S.h / 2 + 14, S.w / 2 + 50, S.h / 2 + 24, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#3a2a22"; ctx.strokeStyle = "#1d1410"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(S.x + 30, S.y); ctx.lineTo(S.x + S.w + 10, S.y); ctx.quadraticCurveTo(S.x + S.w + 70, S.y + S.h / 2, S.x + S.w + 10, S.y + S.h);
      ctx.lineTo(S.x + 30, S.y + S.h); ctx.quadraticCurveTo(S.x - 40, S.y + S.h / 2, S.x + 30, S.y); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#6a5040"; ctx.fillRect(S.x + 20, S.y + 20, S.w - 20, S.h - 40);
      ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.lineWidth = 1.5;
      for (let y = S.y + 42; y < S.y + S.h - 20; y += 22) { ctx.beginPath(); ctx.moveTo(S.x + 20, y); ctx.lineTo(S.x + S.w, y); ctx.stroke(); }
      circle(S.x + S.w * 0.62, S.y + S.h / 2, 11, "#1d1410", "#3a2a22", 3);
      ctx.fillStyle = "#1d1d1f"; ctx.fillRect(S.x + S.w * 0.62 + 4, S.y + S.h / 2 - 60, 46, 30);
      ctx.fillStyle = "#e8e2d0"; ctx.beginPath(); ctx.arc(S.x + S.w * 0.62 + 27, S.y + S.h / 2 - 47, 7, 0, Math.PI * 2); ctx.fill();
      const w0 = ROOMDEF.walk;
      ctx.fillStyle = "#9a7650"; ctx.strokeStyle = "#5a3a22"; ctx.lineWidth = 2;
      for (const yy of [w0.y + 40, w0.y + w0.h - 60]) { ctx.fillRect(w0.x + w0.w, yy, S.x + 20 - (w0.x + w0.w), 22); ctx.strokeRect(w0.x + w0.w, yy, S.x + 20 - (w0.x + w0.w), 22); }
    }
    // 船身（比甲板大一圈）
    ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(w.x + w.w / 2 + 8, w.y + w.h / 2 + 14, w.w / 2 + 70, w.h / 2 + 30, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6b4426"; ctx.strokeStyle = "#3a2410"; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(w.x - 30, w.y - 18); ctx.lineTo(w.x + w.w + 10, w.y - 18);
    ctx.quadraticCurveTo(w.x + w.w + 110, w.y + w.h / 2, w.x + w.w + 10, w.y + w.h + 18);
    ctx.lineTo(w.x - 30, w.y + w.h + 18); ctx.quadraticCurveTo(w.x - 60, w.y + w.h / 2, w.x - 30, w.y - 18);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // 甲板
    ctx.fillStyle = "#b5874f"; ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = "rgba(60,35,15,.35)"; ctx.lineWidth = 1.5;
    for (let y = w.y + 22; y < w.y + w.h; y += 22) { ctx.beginPath(); ctx.moveTo(w.x, y); ctx.lineTo(w.x + w.w, y); ctx.stroke(); }
    ctx.strokeStyle = "#5a3a1a"; ctx.lineWidth = 3; ctx.strokeRect(w.x, w.y, w.w, w.h);
    // 桅杆、漁網
    circle(w.x + w.w * 0.3, w.y + w.h * 0.5, 9, "#4a2e14", "#7a5a32", 3);
    ctx.fillStyle = "rgba(220,210,180,.5)"; ctx.fillRect(w.x + w.w - 90, w.y + 14, 70, 40);
    ctx.restore();
  }
  // 其他時空的地形（js/enemy-art-c.js 的 R.Terrains）：bg(g, W, H, ROOMDEF) 畫一次；draw(ctx, now, W, H) 每一格都畫（會動的部分）
  const TER = R.Terrains?.[ROOMDEF.terrain] || null;
  const terBg = TER?.bg ? (() => { const c = document.createElement("canvas"); c.width = W; c.height = H; TER.bg(c.getContext("2d"), W, H, ROOMDEF); return c; })() : null;
  function drawGrid() {
    if (TER) { if (terBg) ctx.drawImage(terBg, 0, 0); TER.draw?.(ctx, performance.now(), W, H, ROOMDEF); return; }
    if (SEA) return drawSea(performance.now());
    if (HOTEL) { ctx.drawImage(hotelBg, 0, 0); return; }
    if (POST) { ctx.drawImage(postBg, 0, 0); return; }
    if (WARE) { ctx.drawImage(wareBg, 0, 0); return; }
    if (CANVAS) { ctx.drawImage(canvasBg, 0, 0); return; }
    if (GRASS) {
      ctx.drawImage(grassBg, 0, 0);
      ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.lineWidth = 1;
      for (let x = C.grid; x < W; x += C.grid) line(x, 0, x, H, "rgba(255,255,255,.12)", 1);
      for (let y = C.grid; y < H; y += C.grid) line(0, y, W, y, "rgba(255,255,255,.12)", 1);
      return;
    }
    ctx.fillStyle = "#fffdf8"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#f0ece3"; ctx.lineWidth = 1;
    for (let x = C.grid; x < W; x += C.grid) line(x, 0, x, H, "#f0ece3", 1);
    for (let y = C.grid; y < H; y += C.grid) line(0, y, W, y, "#f0ece3", 1);
  }

  // ---------- 草叢 ----------
  // 底層：整叢草；上層（畫在單位上面）：半透明的草葉，讓躲在裡面的單位看起來被遮住
  function bushShape(g) {
    if (g._blobs) return g._blobs;
    let seed = Math.floor(g.seed * 1000) + 1; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const blobs = [];
    for (let i = 0; i < 9; i++) { const a = rnd() * Math.PI * 2, d = rnd() * g.r * 0.55; blobs.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, r: g.r * (0.38 + rnd() * 0.22), c: rnd() }); }
    const blades = [];
    for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2 + rnd() * 0.2; blades.push({ a, len: 12 + rnd() * 14, w: rnd() - 0.5 }); }
    return (g._blobs = { blobs, blades });
  }
  function bushK(g, now) { return g.cutAt ? Math.min(1, (now - g.cutAt) / 700) : 0; }
  function drawBush(g, now, top) {
    const { blobs, blades } = bushShape(g), k = bushK(g, now), sway = Math.sin(now / 900 + g.seed) * 2;
    if (k >= 1) return;
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.scale(1 - k * 0.5, 1 - k * 0.7);
    ctx.globalAlpha = (top ? 0.75 : 1) * (1 - k);
    if (!top) { ctx.fillStyle = "rgba(40,70,25,.22)"; ctx.beginPath(); ctx.ellipse(6, 10, g.r * 1.02, g.r * 0.9, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = "#3f7a2c"; ctx.lineWidth = 3; ctx.lineCap = "round";
    for (const bl of blades) {
      const x0 = Math.cos(bl.a) * g.r * 0.8, y0 = Math.sin(bl.a) * g.r * 0.8;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + Math.cos(bl.a) * bl.len * 0.6 + sway, y0 + Math.sin(bl.a) * bl.len * 0.6, x0 + Math.cos(bl.a + bl.w) * bl.len + sway, y0 + Math.sin(bl.a + bl.w) * bl.len); ctx.stroke();
    }
    if (top) { ctx.restore(); return; }        // 上層只畫外圍的草葉，裡面的單位看得到
    for (const b of blobs) { ctx.fillStyle = b.c < 0.33 ? "#4f8f36" : b.c < 0.66 ? "#5ea33f" : "#6db54a"; ctx.beginPath(); ctx.arc(b.x + sway * 0.4, b.y, b.r, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "rgba(255,255,255,.14)";
    for (const b of blobs.slice(0, 4)) { ctx.beginPath(); ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.4, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  function drawBushes(now, top) {
    for (const g of B.bushes || []) {
      // 上層只畫有人躲在裡面的草叢
      if (top && !B.units.some((u) => u.alive && dist(u.x, u.y, g.x, g.y) <= g.r)) continue;
      drawBush(g, now, top);
    }
  }
  const inBush = (u) => GRASS && u.alive && (B.bushes || []).some((g) => !g.cutAt && dist(u.x, u.y, g.x, g.y) <= g.r);

  // ---------- 煙霧 ----------
  // 每團煙霧由幾個淡粉色半透明圓組成，依序浮現、緩慢飄動
  function puffs(z) {
    if (z._puffs) return z._puffs;
    let seed = [...z.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const list = [{ dx: 0, dy: 0, r: z.r * 0.62, delay: 0, ph: rnd() * 6 }];
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd() * 0.6;
      const d = z.r * (0.35 + rnd() * 0.3);
      list.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d, r: z.r * (0.38 + rnd() * 0.22), delay: 90 + i * 110 + rnd() * 80, ph: rnd() * 6 });
    }
    return (z._puffs = list);
  }
  function drawSmoke(z, now, fade = 1, scale = 1) {
    if (!zoneSeen.has(z.id)) zoneSeen.set(z.id, now);
    const born = zoneSeen.get(z.id);
    for (const p of puffs(z)) {
      const k = Math.max(0, Math.min(1, (now - born - p.delay) / 600));
      if (k <= 0) continue;
      const e = 1 - Math.pow(1 - k, 3);
      const wob = Math.sin(now / 900 + p.ph) * 3;
      ctx.fillStyle = `rgba(244,170,200,${0.32 * e * fade})`;
      ctx.beginPath();
      ctx.arc(z.x + (p.dx + wob) * scale, z.y + (p.dy + Math.cos(now / 1100 + p.ph) * 3) * scale, p.r * (0.6 + 0.4 * e) * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function drawZones(now) {
    for (const c of B.cages()) drawCage(c, now);
    // 循環試煉的殘影：半透明的心魔輪廓＋虛線範圍
    for (const z of B.zones) {
      if (z.type !== "echo") continue;
      const pul = 0.5 + 0.5 * Math.sin(now / 200);
      circle(z.x, z.y, z.r, `rgba(91,63,168,${0.35 + 0.3 * pul})`, "rgba(91,63,168,.08)", 2, [5, 5]);
      ctx.globalAlpha = 0.35 + 0.2 * pul;
      circle(z.x, z.y, 16, null, "#3a2d70");
      circle(z.x - 5, z.y - 3, 2.4, null, "#e9d8ff"); circle(z.x + 5, z.y - 3, 2.4, null, "#e9d8ff");
      ctx.globalAlpha = 0.8;
      label("殘影：敵人回合開始時爆炸", z.x, z.y + z.r + 10, "#5b3fa8", 10);
      ctx.globalAlpha = 1;
    }
    // 觀知命：吉位（金）、兇位（暗紅）；霍夫曼：齒輪領域（藍）
    for (const z of B.zones) {
      if (z.type === "lucky" || z.type === "unlucky") {
        const good = z.type === "lucky", pul = 0.5 + 0.5 * Math.sin(now / 300 + (good ? 0 : 1));
        circle(z.x, z.y, z.r, good ? "rgba(212,160,23,.9)" : "rgba(150,30,40,.9)", good ? `rgba(242,200,60,${0.1 + 0.06 * pul})` : `rgba(120,20,30,${0.1 + 0.06 * pul})`, 3, [10, 6]);
        label(good ? "吉" : "兇", z.x, z.y, good ? "#b8860b" : "#8a1a24", 22);
        ctx.globalAlpha = 0.7; label(z.turnsLeft <= 0 ? "下次輪到你時消失" : `還有 ${z.turnsLeft} 回合`, z.x, z.y + z.r + 10, good ? "#b8860b" : "#8a1a24", 10); ctx.globalAlpha = 1;
      } else if (z.type === "taijiField") {
        ctx.globalAlpha = 0.55; drawTaiji(z.x, z.y, z.r, now / 1500); ctx.globalAlpha = 1;
        label(`難神降禍・${z.turnsLeft <= 0 ? "下次輪到你時停止" : `還有 ${z.turnsLeft} 回合`}`, z.x, z.y - z.r - 14, "#7a3fb0", 11);
      } else if (z.type === "fire") {
        // 瑪莉卡的烈火之舞：地上一團搖曳的火焰
        const pul = 0.5 + 0.5 * Math.sin(now / 160 + z.x);
        const g = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r);
        g.addColorStop(0, `rgba(255,200,80,${0.42 + 0.12 * pul})`); g.addColorStop(0.6, `rgba(240,100,30,${0.3 + 0.1 * pul})`); g.addColorStop(1, "rgba(200,40,20,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.fill();
        const n = Math.max(4, Math.round(z.r / 14));
        for (let i = 0; i < n; i++) {   // 一小簇一小簇往上竄的火舌
          const a = (i / n) * Math.PI * 2 + i * 0.7, rr = z.r * (0.25 + 0.5 * ((i * 53) % 10) / 10), fx0 = z.x + Math.cos(a) * rr, fy0 = z.y + Math.sin(a) * rr * 0.7;
          const h = 14 + 10 * Math.sin(now / 120 + i * 1.9);
          ctx.fillStyle = i % 2 ? "rgba(255,140,30,.85)" : "rgba(255,210,90,.85)";
          ctx.beginPath(); ctx.moveTo(fx0 - 6, fy0); ctx.quadraticCurveTo(fx0 - 4, fy0 - h * 0.6, fx0 + Math.sin(now / 90 + i) * 3, fy0 - h); ctx.quadraticCurveTo(fx0 + 4, fy0 - h * 0.6, fx0 + 6, fy0); ctx.closePath(); ctx.fill();
        }
        ctx.globalAlpha = 0.7; label(z.turnsLeft <= 0 ? "火焰・下次輪到你時熄滅" : `火焰・還有 ${z.turnsLeft} 回合`, z.x, z.y + z.r + 10, "#c8501a", 10); ctx.globalAlpha = 1;
      } else if (z.type === "gearField") {
        const rot = now / 900;
        circle(z.x, z.y, z.r, "rgba(47,111,214,.85)", "rgba(80,150,240,.07)", 4);
        ctx.save(); ctx.translate(z.x, z.y); ctx.rotate(rot);
        ctx.strokeStyle = "rgba(47,111,214,.6)"; ctx.lineWidth = 6;
        for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * (z.r - 2), Math.sin(a) * (z.r - 2)); ctx.lineTo(Math.cos(a) * (z.r + 10), Math.sin(a) * (z.r + 10)); ctx.stroke(); }
        ctx.restore();
        label("壓縮加速領域", z.x, z.y - z.r - 20, "#2f6fd6", 12);
      }
    }
    for (const z of smokes()) {
      drawSmoke(z, now);
      const left = z.turnsLeft;
      ctx.globalAlpha = 0.7;
      label(left <= 0 ? "下次輪到你時消散" : `還有 ${left} 回合`, z.x, z.y + z.r + 10, "#c2477a", 10);
      ctx.globalAlpha = 1;
    }
  }

  // ---------- 敵人預告 ----------
  function drawCharges(now) {
    for (const c of B.charges) {
      if (c.kind === "dive") {
        // 深海狂潛：地上一圈圈的漣漪（不畫出牠在哪裡）
        const k = (now / 900) % 1;
        circle(c.x, c.y, c.radius, "#1a5a8a", `rgba(40,110,170,${0.12 + Math.abs(Math.sin(now / 400)) * 0.08})`, 3, [12, 8]);
        for (const q of [k, (k + 0.5) % 1]) circle(c.x, c.y, c.radius * q, `rgba(40,110,170,${0.5 * (1 - q)})`, null, 2);
        label("深海狂潛・下次輪到大白鯊時從這裡衝出", c.x, c.y - c.radius - 14, "#1a5a8a");
        continue;
      }
      if (c.kind === "redemption") {
        // 無序者的救贖：一圈圈的紅色同心圓（空隙是安全區）
        const pulse = 0.12 + Math.abs(Math.sin(now / 380)) * 0.1;
        for (const [a, z] of c.bands) {
          ctx.beginPath(); ctx.arc(c.x, c.y, z, 0, Math.PI * 2); ctx.arc(c.x, c.y, a, 0, Math.PI * 2, true);
          ctx.fillStyle = `rgba(229,57,53,${pulse})`; ctx.fill();
          circle(c.x, c.y, a, "rgba(198,40,40,.6)", null, 1.5, [8, 6]);
          circle(c.x, c.y, z, "rgba(198,40,40,.6)", null, 1.5, [8, 6]);
        }
        label("無序者的救贖・蓄力中（下次輪到偽神時擴散）", c.x, c.y + 118, "#c62828", 13);
        continue;
      }
      const pulse = 0.1 + Math.abs(Math.sin(now / 400)) * 0.08;
      circle(c.x, c.y, c.radius, "#c62828", `rgba(229,57,53,${pulse})`, 3, [12, 8]);
      const k = (now / 1600) % 1;
      circle(c.x, c.y, c.radius * (1 - k), "rgba(198,40,40,.35)", null, 2);
      const o = c.owner;
      line(pos(o).x, pos(o).y, c.x, c.y, "rgba(198,40,40,.35)", 2, [4, 6]);
      label("壓制・蓄力中", c.x, c.y - c.radius - 14, "#c62828");
    }
  }

  function threatPath(t) {
    ctx.beginPath();
    if (t.shape === "rect") {
      const c = Math.cos(t.ang), s2 = Math.sin(t.ang), hw = t.width / 2;
      ctx.moveTo(t.x - s2 * hw, t.y + c * hw);
      ctx.lineTo(t.x + c * t.length - s2 * hw, t.y + s2 * t.length + c * hw);
      ctx.lineTo(t.x + c * t.length + s2 * hw, t.y + s2 * t.length - c * hw);
      ctx.lineTo(t.x + s2 * hw, t.y - c * hw);
      ctx.closePath();
    } else if (t.shape === "sector") {
      ctx.moveTo(t.x, t.y);
      ctx.arc(t.x, t.y, t.radius, t.ang - t.half, t.ang + t.half);
      ctx.closePath();
    } else {
      ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
    }
  }
  // 預告範圍的中心（倒數數字的位置）
  function threatCenter(t) {
    if (t.shape === "rect") {
      const L = t.kind === "laser" ? Math.min(t.length, 260) : t.length / 2;
      return { x: t.x + Math.cos(t.ang) * L, y: t.y + Math.sin(t.ang) * L };
    }
    if (t.shape === "sector") return { x: t.x + Math.cos(t.ang) * t.radius * 0.6, y: t.y + Math.sin(t.ang) * t.radius * 0.6 };
    return { x: t.x, y: t.y };
  }
  function drawThreat(now) {
    for (const t of B.threats) {
      const left = Math.max(0, (t.deadline - now) / 1000), k = 1 - left / t.total;
      ctx.save();
      threatPath(t);
      ctx.fillStyle = `rgba(229,57,53,${0.14 + k * 0.26})`;
      ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = "#e53935"; ctx.stroke();
      // 由外往內縮的倒數線
      ctx.clip();
      if (t.shape === "circle") circle(t.x, t.y, t.radius * (1 - k), "rgba(229,57,53,.6)", null, 2);
      else if (t.shape === "sector") circle(t.x, t.y, t.radius * (1 - k), "rgba(229,57,53,.6)", null, 2);
      else {
        const c = Math.cos(t.ang), s2 = Math.sin(t.ang), L = t.length * k, hw = t.width / 2;
        line(t.x + c * L - s2 * hw, t.y + s2 * L + c * hw, t.x + c * L + s2 * hw, t.y + s2 * L - c * hw, "rgba(229,57,53,.6)", 3);
      }
      ctx.restore();
      if (t.kind === "electric") drawSparks(t.x, t.y, t.radius, now, 0.5);
    }
  }
  function drawThreatLabel(now) {
    for (const t of B.threats) {
      const left = Math.max(0, (t.deadline - now) / 1000), c = threatCenter(t);
      label(left.toFixed(1), c.x, c.y, "#c62828", 20);
    }
  }
  // 電流：圓周上隨機的折線
  function drawSparks(x, y, r, now, alpha) {
    const seed = Math.floor(now / 70);
    ctx.strokeStyle = `rgba(80,160,255,${alpha})`; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = ((seed * 37 + i * 61) % 360) * Math.PI / 180;
      ctx.beginPath();
      let px = x + Math.cos(a) * r * 0.3, py = y + Math.sin(a) * r * 0.3;
      ctx.moveTo(px, py);
      for (let j = 1; j <= 4; j++) {
        const rr = r * (0.3 + j * 0.175), jit = (((seed + i * 7 + j * 13) % 11) - 5) * 0.05;
        px = x + Math.cos(a + jit) * rr; py = y + Math.sin(a + jit) * rr;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }

  // ---------- Boss：古代遺跡的殲滅矩陣 ----------
  function hexagon(x, y, r, rot = -Math.PI / 2) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = rot + (i * Math.PI) / 3;
      i ? ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
  }
  // 觸手目前的角度：平常是固定方向，揮動時 原位 → 扇形一側 → 掃到另一側 → 回原位
  function armAngle(p, now) {
    const f = fx.find((x) => x.k === "swing" && x.arm === p);
    if (!f) return p.angle;
    const k = Math.max(0, Math.min(1, (now - f.t) / f.dur));
    const lerpA = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
    const ease = (t) => t * t * (3 - 2 * t);
    if (k < 0.2) return lerpA(p.angle, f.from, ease(k / 0.2));
    if (k < 0.55) return lerpA(f.from, f.to, ease((k - 0.2) / 0.35));
    return lerpA(f.to, p.angle, ease((k - 0.55) / 0.45));
  }
  function drawBoss(core, now) {
    const c = pos(core), D = core.def;
    const isCur = B.current === core && B.phase !== "over";
    ctx.globalAlpha = core.alive ? 1 : 0.3;

    // 觸手：從核心邊緣的根部長出一串灰色圓，末端接著能量矩陣
    // 揮動觸手時整條觸手（連同矩陣）以根部為軸轉動
    const L = D.armLength - core.r;                 // 根部到矩陣中心
    const armPos = new Map();
    for (const p of core.parts) {
      const a = armAngle(p, now);
      const ox = c.x + Math.cos(p.angle) * core.r, oy = c.y + Math.sin(p.angle) * core.r;
      const mx = ox + Math.cos(a) * L, my = oy + Math.sin(a) * L;
      armPos.set(p, { x: mx, y: my, a, ox, oy });
      const nx = -Math.sin(a), ny = Math.cos(a), n = 5;
      ctx.globalAlpha = core.alive ? (p.alive ? 1 : 0.5) : 0.3;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, d = (L - p.r * 0.4) * t;
        const wob = Math.sin(now / 520 + i * 0.9 + p.angle * 2) * 4 * Math.sin(t * Math.PI) * (p.alive ? 1 : 0.3);
        const r = 13 + 5 * Math.abs(Math.sin(i * 1.7 + p.angle * 3));
        circle(ox + Math.cos(a) * d + nx * wob, oy + Math.sin(a) * d + ny * wob, r, null, "#c4c4c4");
      }
    }
    ctx.globalAlpha = core.alive ? 1 : 0.3;

    // 能量矩陣：灰色菱形 + 紅色能量球（位置跟著觸手）
    for (const p of core.parts) {
      const m = armPos.get(p), s = p.r * 1.2;
      ctx.save();
      ctx.globalAlpha = core.alive ? (p.alive ? 1 : 0.45) : 0.3;
      ctx.translate(m.x, m.y); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#c9c9c9"; ctx.fillRect(-s / 2 * 1.2, -s / 2 * 1.2, s * 1.2, s * 1.2);
      ctx.lineWidth = 3.5; ctx.strokeStyle = "#7a7a7a"; ctx.strokeRect(-s / 2 * 1.2, -s / 2 * 1.2, s * 1.2, s * 1.2);
      ctx.restore();
      ctx.globalAlpha = core.alive ? (p.alive ? 1 : 0.45) : 0.3;
      if (p.alive) {
        const glow = 0.5 + Math.sin(now / 300 + p.angle) * 0.15;
        circle(m.x, m.y, p.r * 0.62, null, `rgba(232,38,44,${glow * 0.35})`);
        circle(m.x, m.y, p.r * 0.48, "#7a0d12", "#e8262c", 3);
      } else {
        circle(m.x, m.y, p.r * 0.48, "#6b6b6b", "#9a9a9a", 3);
        line(m.x - 10, m.y - 12, m.x + 4, m.y + 2, "#555", 2); line(m.x + 4, m.y + 2, m.x - 2, m.y + 13, "#555", 2);
      }
      if (p.alive) {
        const bw = 52, bx = m.x - bw / 2, by = m.y + p.r + 10;
        ctx.fillStyle = "#ece8df"; ctx.fillRect(bx, by, bw, 5);
        ctx.fillStyle = "#e8262c"; ctx.fillRect(bx, by, bw * (p.hp / p.maxHp), 5);
      }
      ctx.fillStyle = "#6b665d"; ctx.font = "11px 'Noto Sans TC', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText(p.alive ? p.name : `${p.name}（已破壞）`, m.x, m.y + p.r + 18);
    }
    ctx.globalAlpha = core.alive ? 1 : 0.3;

    // 核心：外六角、內六角、三顆代表矩陣的紅點
    if (isCur) { hexagon(c.x, c.y, core.r + 10 + Math.sin(now / 200) * 3); ctx.strokeStyle = "rgba(232,38,44,.3)"; ctx.lineWidth = 3; ctx.stroke(); }
    hexagon(c.x, c.y, core.r); ctx.fillStyle = "#fffdf8"; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = "#7a7a7a"; ctx.stroke();
    hexagon(c.x, c.y, core.r * 0.5); ctx.lineWidth = 3.5; ctx.stroke();
    for (const p of core.parts) {
      const d = core.r * 0.42;
      circle(c.x + Math.cos(p.angle) * d, c.y + Math.sin(p.angle) * d, 7.5, null, p.alive ? "#e8262c" : "#b5b5b5");
    }

    // 立場：半透明泡泡，矩陣越少越淡，全破壞就消失
    const k = core.alive ? D.incomingMult(B, core) : 1.5;
    const strength = { 0: 1, 0.5: 0.6, 1: 0.32 }[k] ?? 0;
    if (strength > 0) {
      const wob = Math.sin(now / 700) * 2;
      circle(c.x, c.y, core.r + 18 + wob, `rgba(90,160,240,${0.55 * strength})`, `rgba(120,185,255,${0.14 * strength})`, 2);
      ctx.save(); ctx.beginPath(); ctx.arc(c.x, c.y, core.r + 18 + wob, 0, Math.PI * 2); ctx.clip();
      const sweep = ((now / 2200) % 1) * (core.r * 2 + 80) - core.r - 40;
      line(c.x + sweep - 20, c.y - core.r - 30, c.x + sweep + 20, c.y + core.r + 30, `rgba(255,255,255,${0.5 * strength})`, 8);
      ctx.restore();
    }

    // 核心血量
    if (core.alive) {
      const bw = 130, bx = c.x - bw / 2, by = c.y + core.r + 26;
      ctx.fillStyle = "#ece8df"; ctx.fillRect(bx, by, bw, 7);
      ctx.fillStyle = "#c62828"; ctx.fillRect(bx, by, bw * (core.hp / core.maxHp), 7);
      label(`${core.hp} / ${core.maxHp}${k === 0 ? "　立場" : k !== 1 ? `　受傷 ×${k}` : ""}`, c.x, by + 18, "#6b665d", 11);
    }
    ctx.globalAlpha = 1;
  }

  // 光彈：紅色膠囊形，沿飛行方向
  function drawProjectiles() {
    for (const b of B.projectiles) {
      ctx.save();
      ctx.translate(b.x, b.y); ctx.rotate(b.ang);
      ctx.fillStyle = "rgba(232,38,44,.18)";
      ctx.beginPath(); ctx.ellipse(0, 0, 16, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#e8262c"; ctx.lineCap = "round"; ctx.lineWidth = b.r * 1.5;
      ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.stroke();
      ctx.restore();
    }
  }

  // ---------- 玩家的預覽 ----------
  function sectorPreview(u, ang, sec, color) {
    threatPath({ shape: "sector", x: u.x, y: u.y, ang, half: sec.half, radius: sec.radius });
    ctx.fillStyle = "rgba(75,63,143,.12)"; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]);
  }
  function highlight(list, color) {
    for (const e of list || []) circle(pos(e).x, pos(e).y, e.r + 6, color, null, 3);
  }
  const posHist = [];
  function drawTaiji(x, y, r, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath(); ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2); ctx.arc(0, r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true); ctx.arc(0, -r / 2, r / 2, Math.PI / 2, -Math.PI / 2); ctx.closePath();
    ctx.fillStyle = "rgba(242,200,60,.35)"; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r, Math.PI / 2, -Math.PI / 2); ctx.arc(0, -r / 2, r / 2, -Math.PI / 2, Math.PI / 2, true); ctx.arc(0, r / 2, r / 2, -Math.PI / 2, Math.PI / 2); ctx.closePath();
    ctx.fillStyle = "rgba(120,20,30,.3)"; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.strokeStyle = "#2f6fd6"; ctx.lineWidth = 4; ctx.stroke();
    ctx.restore();
  }
  // 通用的形狀（技能的 preview() 回傳、fxShape 事件）：rect / sector / circle / line
  function drawShape(sh, stroke, fill, alpha = 0.14, dash = null) {
    if (!sh) return;
    ctx.save();
    if (sh.shape === "line") {
      ctx.globalAlpha *= alpha * 1.6; line(sh.x1, sh.y1, sh.x2, sh.y2, fill, sh.width || 6, null); ctx.globalAlpha /= alpha * 1.6;
      line(sh.x1, sh.y1, sh.x2, sh.y2, stroke, 2, dash || [8, 6]);
    } else if (sh.shape === "rect") {
      ctx.translate(sh.x, sh.y); ctx.rotate(sh.ang);
      ctx.globalAlpha *= alpha; ctx.fillStyle = fill; ctx.fillRect(0, -sh.width / 2, sh.length, sh.width); ctx.globalAlpha /= alpha;
      ctx.strokeStyle = stroke; ctx.lineWidth = 2; if (dash) ctx.setLineDash(dash); ctx.strokeRect(0, -sh.width / 2, sh.length, sh.width); ctx.setLineDash([]);
    } else if (sh.shape === "sector") {
      threatPath(sh); ctx.globalAlpha *= alpha; ctx.fillStyle = fill; ctx.fill(); ctx.globalAlpha /= alpha;
      ctx.strokeStyle = stroke; ctx.lineWidth = 2; if (dash) ctx.setLineDash(dash); ctx.stroke(); ctx.setLineDash([]);
    } else {
      ctx.beginPath(); ctx.arc(sh.x, sh.y, sh.radius, 0, Math.PI * 2);
      ctx.globalAlpha *= alpha; ctx.fillStyle = fill; ctx.fill(); ctx.globalAlpha /= alpha;
      ctx.strokeStyle = stroke; ctx.lineWidth = 2; if (dash) ctx.setLineDash(dash); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
    if (sh.label) label(sh.label, sh.lx ?? sh.x ?? sh.x2, (sh.ly ?? sh.y ?? sh.y2) - 18, stroke, 12);
  }
  // 技能有 preview()：用它畫範圍、標出會打到的敵人
  function genericPreview(sk, arg, color) {
    let pv = null;
    try { pv = sk.preview(B, B.player, arg); } catch (e) { return false; }
    if (!pv) return false;
    for (const sh of pv.shapes || []) drawShape(sh, sh.color || color, sh.color || color, 0.14, [6, 4]);
    highlight(pv.hits, color);
    if (pv.allies) for (const a of pv.allies) circle(pos(a).x, pos(a).y, (a.r || C.body) + 8, "#2f8fd6", null, 3, [4, 3]);
    if (pv.note) label(pv.note, pv.nx ?? arg.x, (pv.ny ?? arg.y) - 26, color, 12);
    return true;
  }

  function drawPlanning() {
    const u = B.player;
    if (!u.alive) return;
    const p = pos(u), BD = C.body;
    const hover = mouse.in ? unitAt(mouse) : null;

    // 技能按鈕滑過時的預覽（不用瞄準的技能）
    if (canAct() && hoverSkill && mode === "move") {
      const st = statusOf(hoverSkill), sk = CH.skills[hoverSkill];
      if (st.ready && st.aim?.type === "none" && sk.preview) genericPreview(sk, { x: u.x, y: u.y }, sk.ultimate ? "#e0b800" : "#f08a2c");
      else if (st.ready && st.aim?.type === "none" && sk.predict) {
        try {
          if (sk.path) {                       // 試煉：心魔（或伊爾舒自己）的路線
            const pa = sk.path(B, u), r = pa.r || pa.d.r;
            line(pa.from.x, pa.from.y, pa.to.x, pa.to.y, "rgba(91,63,168,.35)", r * 2);
            circle(pa.to.x, pa.to.y, r, "#5b3fa8", null, 2, [4, 4]);
            if (u.upg?.q2 === "cycle") circle(pa.from.x, pa.from.y, sk.echoRadius, "rgba(91,63,168,.6)", null, 1.5, [3, 5]);
          } else if (sk.radius && sk.hits) {    // 業障：爆炸範圍
            const d = B.demons().find((x) => x.owner === u);
            const rr = sk.radiusFor ? sk.radiusFor(u) : sk.radius;
            if (d) circle(d.x, d.y, rr, "#5b3fa8", "rgba(91,63,168,.15)", 2, [6, 5]);
          }
          highlight(sk.predict(B, u, {}), "#5b3fa8");
        } catch (e) { /* 預覽失敗就不畫 */ }
      }
    }

    if (canAct() && mode === "move") {
      const cost = C.moveCost * mult();
      const ok = u.ap >= cost;
      const r = B.moveRadius(u);
      circle(p.x, p.y, r, ok ? "#1aa3e8" : "#c9c4b9", ok ? "rgba(26,163,232,.06)" : null, 3);
      const basic = CH.skills[CH.basic];
      const bAim = statusOf(CH.basic).aim || {};
      const bRange = bAim.type === "enemy" || bAim.type === "point" ? bAim.range ?? basic.range : 9999;   // 霍夫曼的亞光速撞擊：不限距離
      if (bRange < 9999) circle(p.x, p.y, bRange, "rgba(29,29,31,.25)", null, 1, [4, 5]);
      if (ok && mouse.in && !hover && dist(p.x, p.y, mouse.x, mouse.y) <= r) {
        ctx.globalAlpha = 0.35; roundRect(mouse.x - BD, mouse.y - BD, BD * 2, BD * 2, 8);
        ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      if (hover && hover.team === "enemy") {
        const inR = B.reach(u, hover) <= bRange;
        const bst = statusOf(CH.basic);
        if (inR && bst.aim?.sector) sectorPreview(u, Math.atan2(hover.y - u.y, hover.x - u.x), bst.aim.sector, "#4b3f8f");
        let shown = inR && basic.preview ? genericPreview(basic, { target: hover }, "#e53935") : false;
        if (!shown && inR && basic.predict) { try { highlight(basic.predict(B, u, { target: hover }), "#e53935"); shown = true; } catch (e) {} }
        if (!shown) circle(pos(hover).x, pos(hover).y, hover.r + 6, inR ? "#e53935" : "#c9c4b9", null, 2, inR ? null : [4, 4]);
        if (!inR) label("太遠了", pos(hover).x, pos(hover).y - hover.r - 28);
      }
      return;
    }
    if (!canAct()) return;
    const st = statusOf(mode), aim = st.aim || {};
    const sk = CH.skills[mode];
    const color = sk.ultimate ? "#e0b800" : "#f08a2c";
    const fill = sk.ultimate ? "rgba(242,207,29,.18)" : "rgba(240,138,44,.15)";
    // 技能自己提供預覽（新角色、弗爾斯勒的踢腿…）
    if (sk.preview && mouse.in) {
      if (aim.range) circle(p.x, p.y, aim.range, color, null, 2, [6, 5]);
      const tgt = hover && hover.team === "enemy" ? { target: hover } : aim.type === "point" ? clampToRange(mouse, aim.range || 9999) : { x: mouse.x, y: mouse.y };
      genericPreview(sk, tgt, color);
      return;
    }
    // 普攻按 A（不用指定敵人）：扇形朝滑鼠方向
    if (aim.type === "enemy" && aim.free && aim.sector && mouse.in && !(hover && hover.team === "enemy")) {
      circle(p.x, p.y, aim.range, color, null, 2);
      sectorPreview(u, Math.atan2(mouse.y - u.y, mouse.x - u.x), aim.sector, color);
      try { highlight(sk.predict(B, u, { x: mouse.x, y: mouse.y }), color); } catch (e) {}
      return;
    }

    if (aim.type === "direction" && mouse.in && aim.sector) {
      // 扇形預覽（例如伊爾舒的大招）
      const ang = Math.atan2(mouse.y - u.y, mouse.x - u.x);
      sectorPreview(u, ang, aim.sector, color);
      // 負罪前行：心魔會站到對面一起斬
      const pt = sk.partner ? sk.partner(B, u, ang) : null;
      if (pt) {
        line(pt.d.x, pt.d.y, pt.x, pt.y, "rgba(20,16,26,.35)", 3, [4, 5]);
        circle(pt.x, pt.y, pt.d.r, "#1d1d1f", "rgba(20,16,26,.2)", 2, [4, 4]);
        sectorPreview({ x: pt.x, y: pt.y }, pt.ang, aim.sector, "#1d1d1f");
      }
      try { highlight(sk.predict(B, u, { x: mouse.x, y: mouse.y }), color); } catch (e) {}
    } else if (aim.type === "direction" && mouse.in) {
      // 射箭預覽：用技能自己的路線計算，畫出每支箭（分裂、穿透）
      let pa = null;
      try { pa = sk.path(B, u, { x: mouse.x, y: mouse.y }); } catch (e) {}
      if (pa) {
        circle(p.x, p.y, pa.range, "rgba(229,57,53,.25)", null, 1, [3, 6]);
        for (const a of pa.arrows) {
          const c = a.pierce ? "#c2477a" : a.boosted ? "#c2477a" : "rgba(229,57,53,.75)";
          line(a.from.x, a.from.y, a.to.x, a.to.y, c, a.pierce ? 5 : 2.5, [8, 6]);
          arrowHead(a.to.x, a.to.y, Math.atan2(a.to.y - a.from.y, a.to.x - a.from.x), 12, c);
          for (const h of a.hits) circle(pos(h.unit).x, pos(h.unit).y, h.unit.r + 6, c, null, 3);
        }
        // 分裂箭同時命中同一個目標：標出支數
        const cnt = new Map();
        for (const a of pa.arrows) if (a.split) for (const h of a.hits) cnt.set(h.unit, (cnt.get(h.unit) || 0) + 1);
        for (const [e, n] of cnt) if (n > 1) label(`×${n}`, pos(e).x + e.r + 14, pos(e).y - e.r, "#c2477a", 15);
        const m = pa.arrows[0], tag = pa.arrows.some((a) => a.pierce) ? `穿雲之箭 ×${sk.pierceMult}` : pa.arrows.some((a) => a.split) ? "分裂成三支 ×1.5" : m.boosted ? "穿過煙霧 ×1.5" : "";
        if (tag) label(tag, (m.from.x + m.to.x) / 2, (m.from.y + m.to.y) / 2 - 14, "#c2477a", 12);
      }
    } else if (aim.type === "point") {
      circle(p.x, p.y, aim.range, color, null, 2, [6, 5]);
      if (!mouse.in) return;
      const g = clampToRange(mouse, aim.range);
      if (aim.preview === "spikes") {
        // 煙霧爆發預覽：每根尖刺的第一段（迷煙亂舞的反彈不預覽），標出每個敵人會被幾根尖刺打到
        const w = sk.spikeWidth, count = new Map();
        let list = [];
        try { list = sk.spikes(B, u, g); } catch (e) {}
        for (const sp of list) {
          if (sp.side) continue;
          const A = sp.points[0], Bp = sp.points[1];
          line(A.x, A.y, Bp.x, Bp.y, "rgba(194,71,122,.55)", w, null);
        }
        // 命中數只算第一段看得到的部分，反彈後的命中留給玩家自己發現
        for (const sp of list) {
          if (sp.side) continue;
          const A = sp.points[0], Bp = sp.points[1];
          for (const e of B.enemies())
            if (R.geo.pointSeg(e.x, e.y, A.x, A.y, Bp.x, Bp.y) <= e.r + w / 2) count.set(e, (count.get(e) || 0) + 1);
        }
        for (const [e, n] of count) {
          circle(pos(e).x, pos(e).y, e.r + 6, "#c2477a", null, 3);
          label(`×${n}`, pos(e).x + e.r + 14, pos(e).y - e.r, "#c2477a", 15);
        }
        circle(g.x, g.y, 10, "#c2477a", "rgba(194,71,122,.3)", 2);
      } else if (aim.preview === "finale") {
        // 看老娘結束這一切：煙霧聚到面前，一發穿透飛箭直到牆
        let fp = null;
        try { fp = sk.finalePath(B, u, g); } catch (e) {}
        if (fp) {
          for (const z of smokes()) line(z.x, z.y, fp.F.x, fp.F.y, "rgba(194,71,122,.3)", 3, [4, 5]);
          line(fp.F.x, fp.F.y, fp.end.x, fp.end.y, "rgba(194,71,122,.22)", sk.finaleWidth, null);
          line(fp.F.x, fp.F.y, fp.end.x, fp.end.y, "#c2477a", 2, [8, 6]);
          highlight(fp.hits, "#c2477a");
          label(`${fp.count} 根尖刺 → ${sk.finalePerSpike * fp.count} 基礎傷害`, fp.F.x, fp.F.y - 26, "#c2477a", 13);
        }
      } else if (aim.preview === "smoke") {
        circle(g.x, g.y, aim.radius, "#c2477a", "rgba(244,170,200,.25)", 2, [5, 4]);
        const list = smokes();
        if (list.length >= (aim.max || sk.max)) label("最舊的一團會消失", list[0].x, list[0].y - list[0].r - 12, "#c2477a", 11);
      } else if (aim.preview === "toss") {
        // 投擲蘑菇：爆炸範圍（生長激素是三顆），標出會被炸到的敵人，自己在範圍內會回血
        let drops = [g];
        try { drops = sk.drops(B, u, g); } catch (e) {}
        for (const d of drops) circle(d.x, d.y, sk.radius, "#d64545", "rgba(214,69,69,.12)", 2, [5, 4]);
        try { highlight(sk.predict(B, u, g), "#d64545"); } catch (e) {}
        if (drops.some((d) => dist(u.x, u.y, d.x, d.y) <= sk.radius + u.r)) label("回血", p.x, p.y - u.r - 34, "#2e9e5b", 12);
        if (u.upg?.q1 === "farm" && B.zones.some((z) => z.type === "trap" && !z.farm && drops.some((d) => dist(d.x, d.y, z.x, z.y) <= z.r + 10)))
          label("變成菇菇農場", g.x, g.y - sk.radius - 12, "#2e7a46", 12);
        shroom(g.x, g.y + 4, 1, "#d64545", 0.6);
      } else if (aim.preview === "run") {
        // 菇菇快跑：種下的位置（感應範圍）＋往反方向退的位置
        const sz = sk.sizes(u), to = sk.dashTo(B, u, g);
        circle(g.x, g.y, sz.trigger, "#3d9a5b", "rgba(61,154,91,.1)", 2, [4, 4]);
        circle(g.x, g.y, sz.blast, "rgba(214,69,69,.6)", null, 1.5, [2, 5]);
        shroom(g.x, g.y + 4, 1, "#d64545", 0.6);
        if (to.x !== u.x || to.y !== u.y) {
          line(p.x, p.y, to.x, to.y, "rgba(29,29,31,.4)", 2, [4, 4]);
          roundRect(to.x - C.body, to.y - C.body, C.body * 2, C.body * 2, 6); ctx.strokeStyle = "rgba(29,29,31,.4)"; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
        }
        try { highlight(sk.predict(B, u, g), "#3d9a5b"); } catch (e) {}
      } else if (aim.preview === "bloom") {
        circle(g.x, g.y, sk.sporeRadius, "#8a9a2a", "rgba(170,195,70,.12)", 2, [6, 5]);
        shroom(g.x, g.y + 8, 2.6, "#c0392b", 0.55);
        try { highlight(sk.predict(B, u, g), "#8a9a2a"); } catch (e) {}
      } else {
        circle(g.x, g.y, aim.radius || 20, color, fill, 3);
      }
    } else if (aim.type === "enemy") {
      circle(p.x, p.y, aim.range, color, null, 2);
      if (hover && hover.team === "enemy" && aim.sector && B.reach(u, hover) <= aim.range) {
        sectorPreview(u, Math.atan2(hover.y - u.y, hover.x - u.x), aim.sector, color);
        try { highlight(sk.predict(B, u, { target: hover }), color); } catch (e) {}
      } else if (hover && hover.team === "enemy") {
        const inR = B.reach(u, hover) <= aim.range;
        circle(pos(hover).x, pos(hover).y, hover.r + 6, inR ? color : "#c9c4b9", null, 3, inR ? null : [4, 4]);
      }
    }
  }


  // ---------- 試煉 Boss：受難之日 ----------
  const PASSION_RED = "#e8262c", DARK_RED = "#7a0d1a", GOLD = "#f2c200";
  function poseOf(u, now) {
    const q = poses.get(u.id);
    return q && now < q.t + q.dur ? q : null;
  }
  // 四角星
  function star4(x, y, R1, r1, fill, stroke, width = 2) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 4, rr = i % 2 ? r1 : R1;
      i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = width; ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  // 劍目前的角度：平常斜舉在左上；揮砍時先往後蓄、倒數結束瞬間掃過；瞄準時指向目標；插地時朝下
  function swordAngle(u, now) {
    const rest = -2.25;
    if (u.state.plunged) return Math.PI / 2;
    const q = poseOf(u, now);
    if (!q) return rest + Math.sin(now / 900) * 0.04;
    const el = now - q.t;
    if (q.pose === "aim") return q.ang;
    if (q.pose === "raiseSword") return -Math.PI / 2;
    if (q.pose === "slash") {
      const dir = q.angs[0], windup = q.dur - 600;
      const lerpA = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
      if (el < windup) return lerpA(rest, dir - 1.5, Math.min(1, el / 300));
      const k = Math.min(1, (el - windup) / 160);
      if (k < 1) return lerpA(dir - 1.5, dir + 0.7, k);
      return lerpA(dir + 0.7, rest, Math.min(1, (el - windup - 160) / 440));
    }
    return rest;
  }
  function drawPassion(u, now) {
    const c = pos(u), P2 = u.state.phase === 2, q = poseOf(u, now);
    const isCur = B.current === u && B.phase !== "over";
    ctx.save();
    ctx.globalAlpha = u.alive ? 1 : 0.3;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (isCur) circle(c.x, c.y, u.r + 18 + Math.sin(now / 200) * 3, "rgba(232,38,44,.3)", null, 3);

    // 第二階段：四隻長腳
    if (P2) {
      const legs = [[-160, 150, -105, 40], [-60, 182, -48, 70], [60, 182, 48, 70], [160, 150, 105, 40]];
      legs.forEach(([fx2, fy, kx, ky], i) => {
        const sway = Math.sin(now / 420 + i * 1.3) * 5;
        for (const off of [-4, 4]) {
          ctx.beginPath();
          ctx.moveTo(c.x + off * 0.6 + (i < 2 ? -18 : 18), c.y + 44);
          ctx.lineTo(c.x + kx + off, c.y + ky - 20 + sway);
          ctx.lineTo(c.x + fx2 + off * 0.5, c.y + fy + sway * 0.4);
          ctx.strokeStyle = PASSION_RED; ctx.lineWidth = 3.5; ctx.stroke();
        }
      });
      // 腰部的環與脊椎
      roundRect(c.x - 26, c.y + 36, 52, 16, 6); ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = DARK_RED; ctx.lineWidth = 3.5; ctx.stroke();
      line(c.x, c.y + 6, c.x - 12, c.y + 36, DARK_RED, 3.5); line(c.x, c.y + 6, c.x + 12, c.y + 36, DARK_RED, 3.5);
      roundRect(c.x - 9, c.y + 2, 18, 12, 4); ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = DARK_RED; ctx.stroke();
    }

    // 長袍（第二階段是破碎的短袍）
    ctx.beginPath();
    ctx.moveTo(c.x - 20, c.y - 32); ctx.lineTo(c.x + 20, c.y - 32);
    ctx.lineTo(c.x + 42, c.y - 16);
    if (P2) {
      ctx.lineTo(c.x + 34, c.y + 8);
      for (let i = 0; i <= 6; i++) ctx.lineTo(c.x + 34 - i * (68 / 6), c.y + 8 + (i % 2 ? 18 : 0));
    } else {
      ctx.quadraticCurveTo(c.x + 38, c.y + 30, c.x + 48, c.y + 80);
      ctx.quadraticCurveTo(c.x, c.y + 88, c.x - 48, c.y + 80);
      ctx.quadraticCurveTo(c.x - 38, c.y + 30, c.x - 42, c.y - 16);
    }
    ctx.lineTo(c.x - 42, c.y - 16);
    ctx.closePath();
    ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 4; ctx.stroke();
    // 領口
    ctx.beginPath(); ctx.moveTo(c.x - 42, c.y - 16);
    for (let i = 1; i <= 6; i++) ctx.quadraticCurveTo(c.x - 42 + (i - 0.5) * 14, c.y - 8 - (i % 2) * 4, c.x - 42 + i * 14, c.y - 16);
    ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 3; ctx.stroke();

    // 右手（畫面右側）：平常垂著，施法時舉起
    const raised = q && (q.pose === "raise");
    const sh = { x: c.x + 40, y: c.y - 14 };
    const el = raised ? { x: c.x + 64, y: c.y - 28 } : { x: c.x + 60, y: c.y + 2 };
    const hd = raised ? { x: c.x + 76, y: c.y - 54 } : { x: c.x + 72, y: c.y + 18 };
    line(sh.x, sh.y, el.x, el.y, DARK_RED, 6); line(el.x, el.y, hd.x, hd.y, DARK_RED, 6);
    const fa = raised ? -Math.PI / 2 : -Math.PI / 2.6;
    for (const off of [-0.35, 0, 0.35]) line(hd.x, hd.y, hd.x + Math.cos(fa + off) * 16, hd.y + Math.sin(fa + off) * 16, DARK_RED, 4);
    if (raised) {
      const f = R.AI.passion.fingertip({ x: c.x, y: c.y });
      circle(f.x, f.y, 9 + Math.sin(now / 90) * 2, null, "rgba(242,194,0,.55)");
      circle(f.x, f.y, 4, null, "#fff");
    }

    // 左手（畫面左側）握著反十字劍
    const ang = swordAngle(u, now);
    const hand = { x: c.x - 64, y: c.y + 18 };
    line(c.x - 40, c.y - 14, c.x - 56, c.y + 4, DARK_RED, 6); line(c.x - 56, c.y + 4, hand.x, hand.y, DARK_RED, 6);
    const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
    const L = u.state.plunged ? 110 : 150;          // 插地時有一段在地下
    const tip = { x: hand.x + ux * L, y: hand.y + uy * L };
    const glow = q && (q.pose === "aim" || q.pose === "raiseSword");
    if (glow) { ctx.save(); ctx.shadowColor = PASSION_RED; ctx.shadowBlur = 24; }
    line(hand.x - ux * 22, hand.y - uy * 22, tip.x, tip.y, PASSION_RED, 10);
    if (glow) ctx.restore();
    // 十字護手（靠近握把）＋小十字記號
    const g1 = { x: hand.x + ux * 34, y: hand.y + uy * 34 };
    line(g1.x - nx * 26, g1.y - ny * 26, g1.x + nx * 26, g1.y + ny * 26, PASSION_RED, 8);
    const g2 = { x: hand.x + ux * 52, y: hand.y + uy * 52 };
    line(g2.x - nx * 9, g2.y - ny * 9, g2.x + nx * 9, g2.y + ny * 9, "#fff", 2.5);
    // 末端方塊
    if (!u.state.plunged) {
      ctx.save(); ctx.translate(tip.x, tip.y); ctx.rotate(ang);
      ctx.fillStyle = PASSION_RED; ctx.fillRect(-4, -12, 24, 24);
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5;
      for (let i = -8; i <= 12; i += 6) { ctx.beginPath(); ctx.moveTo(i, -12); ctx.lineTo(i + 8, 12); ctx.stroke(); }
      ctx.restore();
    } else {
      // 插進地面的裂痕
      for (let i = 0; i < 5; i++) { const a = i * 1.25 + 0.3; line(tip.x, tip.y, tip.x + Math.cos(a) * 26, tip.y + Math.sin(a) * 10, "rgba(122,13,26,.7)", 2); }
    }
    // 握劍的手
    circle(hand.x, hand.y, 7, DARK_RED, DARK_RED, 2);

    // 頭：黑色圓、黃色外圈與王冠、紅色四角星
    const hx = c.x, hy = c.y - 60;
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI + (i / 12) * Math.PI, rr = i % 2 ? 34 : 56 + (i % 4 === 0 ? 6 : 0);
      const x = hx + Math.cos(a) * rr, y = hy + Math.sin(a) * rr;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = GOLD; ctx.lineWidth = 4.5; ctx.stroke();
    circle(hx, hy - 52, 4.5, null, PASSION_RED);
    circle(hx, hy, 32, GOLD, "#111", 5);
    star4(hx, hy, 22, 6, null, PASSION_RED, 3.5);
    circle(hx, hy, 3.5, null, PASSION_RED);
    ctx.restore();
  }

  // 復甦的混亂教徒：深紅色圓角方塊，旁邊拿著紅色十字架
  function drawCultist(u, now) {
    const off = lungeOffset(u, now);
    const p = { x: pos(u).x + off.x, y: pos(u).y + off.y }, BD = C.body;
    const isCur = B.current === u && B.phase !== "over";
    ctx.globalAlpha = u.alive ? 1 : 0.25;
    if (isCur) circle(p.x, p.y, BD + 6 + Math.sin(now / 200) * 2, "rgba(122,13,26,.35)", null, 2);
    roundRect(p.x - BD + 2, p.y - BD + 2, BD * 2 - 4, BD * 2 - 4, 9);
    ctx.fillStyle = "#fff"; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = DARK_RED; ctx.stroke();
    // 十字架：平常立在右側，揮砍時繞著自己轉
    const sw = fx.find((f) => f.k === "crossSwing" && f.unit === u && now >= f.t);
    let a = -Math.PI / 2 + 0.25;
    if (sw) { const k = Math.min(1, (now - sw.t) / sw.dur); a = sw.ang - 1 + k * 2; }
    const cx = p.x + Math.cos(a + Math.PI / 2) * (BD + 6), cy = p.y + Math.sin(a + Math.PI / 2) * (BD + 6);
    const ux = Math.cos(a), uy = Math.sin(a);
    line(cx - ux * 10, cy - uy * 10, cx + ux * 26, cy + uy * 26, PASSION_RED, 5);
    line(cx + ux * 12 - uy * 9, cy + uy * 12 + ux * 9, cx + ux * 12 + uy * 9, cy + uy * 12 - ux * 9, PASSION_RED, 5);
    // 被教皇強化
    const bf = u.state.buff || 0;
    for (let i = 0; i < bf; i++) star4(p.x - (bf - 1) * 7 + i * 14, p.y - BD - 22, 5, 2, GOLD);
    minionFooter(u, p, isCur);
  }
  // 復甦的混亂教皇：方塊裡有黃色四角星，頭上一個紅色十字
  function drawPope(u, now) {
    const p = pos(u), BD = C.body + 2;
    const isCur = B.current === u && B.phase !== "over";
    ctx.globalAlpha = u.alive ? 1 : 0.25;
    if (isCur) circle(p.x, p.y, BD + 6 + Math.sin(now / 200) * 2, "rgba(122,13,26,.35)", null, 2);
    roundRect(p.x - BD, p.y - BD, BD * 2, BD * 2, 10);
    ctx.fillStyle = "#fff"; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = DARK_RED; ctx.stroke();
    star4(p.x, p.y, 15, 5, null, GOLD, 3.5);
    line(p.x, p.y - BD - 4, p.x, p.y - BD - 30, PASSION_RED, 5);
    line(p.x - 11, p.y - BD - 21, p.x + 11, p.y - BD - 21, PASSION_RED, 5);
    minionFooter(u, p, isCur, 18);
  }
  function minionFooter(u, p, isCur, extra = 0) {
    const BD = C.body;
    if (u.alive) for (let i = 0; i < u.maxAp; i++)
      circle(p.x + (i - (u.maxAp - 1) / 2) * 10, p.y - BD - 10 - extra - ((u.state.buff || 0) ? 12 : 0), 3.5, DARK_RED, i < u.ap && isCur ? DARK_RED : "#fffdf8", 1.5);
    ctx.fillStyle = "#1d1d1f"; ctx.font = "11px 'Noto Sans TC', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(u.name.replace("復甦的混亂", ""), p.x, p.y + BD + 13);
    if (u.alive) {
      const bw = 46, bx = p.x - bw / 2, by = p.y + BD + 5;
      ctx.fillStyle = "#ece8df"; ctx.fillRect(bx, by, bw, 5);
      ctx.fillStyle = DARK_RED; ctx.fillRect(bx, by, bw * (u.hp / u.maxHp), 5);
    }
    ctx.globalAlpha = 1;
  }
  // 聖牢籠：金色框、直條欄杆、上方十字
  function drawCage(u, now) {
    if (!u.alive) return;
    const S = u.size, x0 = u.x - S / 2, y0 = u.y - S / 2;
    ctx.fillStyle = "rgba(242,194,0,.07)"; ctx.fillRect(x0, y0, S, S);
    for (let x = x0 + 20; x < x0 + S; x += 20) line(x, y0, x, y0 + S, "rgba(184,134,11,.35)", 2);
    ctx.lineWidth = 5; ctx.strokeStyle = "#d4a017"; ctx.strokeRect(x0, y0, S, S);
    ctx.lineWidth = 2; ctx.strokeStyle = DARK_RED; ctx.strokeRect(x0 - 4, y0 - 4, S + 8, S + 8);
    line(u.x, y0 - 4, u.x, y0 - 30, PASSION_RED, 5); line(u.x - 10, y0 - 22, u.x + 10, y0 - 22, PASSION_RED, 5);
    label(`聖牢籠：再打 ${u.hp} 次`, u.x, y0 + S + 14, "#b8860b", 12);
  }

  function lungeOffset(u, now) {
    const f = fx.find((f) => f.k === "lunge" && f.unit === u);
    if (!f) return { x: 0, y: 0 };
    const k = Math.min(1, (now - f.t) / f.dur);
    const s = Math.sin(k * Math.PI) * f.len;
    return { x: Math.cos(f.ang) * s, y: Math.sin(f.ang) * s };
  }
  function leapProgress(u, now) {
    const f = fx.find((f) => f.k === "leap" && f.unit === u);
    return f ? { f, k: Math.max(0, Math.min(1, (now - f.t) / f.dur)) } : null;
  }

  // 心魔：深紫色、會搖晃的火焰狀影子，有兩隻發亮的眼睛
  function drawDemon(u, now) {
    const p = pos(u), r = u.r;
    const flick = Math.sin(now / 160 + u.x) * 2;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = "rgba(58,45,112,.18)";
    ctx.beginPath(); ctx.arc(0, 0, r + 8 + flick, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3a2d70";
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.6);
    ctx.quadraticCurveTo(-r * 1.1, -r * 0.4, -r * 0.35, -r * 1.1 - flick);
    ctx.quadraticCurveTo(-r * 0.1, -r * 0.5, 0, -r * 1.5 - flick);
    ctx.quadraticCurveTo(r * 0.15, -r * 0.6, r * 0.45, -r * 1.15 + flick);
    ctx.quadraticCurveTo(r * 1.1, -r * 0.3, r, r * 0.6);
    ctx.quadraticCurveTo(0, r * 1.15, -r, r * 0.6);
    ctx.fill();
    ctx.fillStyle = "#e9d8ff";
    ctx.beginPath(); ctx.ellipse(-r * 0.32, -r * 0.05, 3, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r * 0.32, -r * 0.05, 3, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#4b3f8f"; ctx.font = "11px 'Noto Sans TC', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText("心魔", p.x, p.y + r + 10);
  }

  // 教學 NPC 羽澤璃央：粉色圓角方塊、中間「澤」字，手上拿著鐮刀
  // 鐮刀的姿勢：平常立在身體右邊；預告攻擊時舉到扇形一側蓄力；揮下時掃過整個扇形再收回
  const SCYTHE_REST = -Math.PI / 2;
  function scythePose(u, now) {
    const lerpA = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
    const ease = (t) => t * t * (3 - 2 * t);
    const sw = fx.find((f) => f.k === "scythe" && f.unit === u);
    if (sw) {
      const k = Math.max(0, Math.min(1, (now - sw.t) / sw.dur));
      if (k < 0.45) return { phi: lerpA(sw.from, sw.to, ease(k / 0.45)), off: 0, side: sw.side, trail: true, k };
      const r = ease((k - 0.45) / 0.55);
      return { phi: lerpA(sw.to, SCYTHE_REST, r), off: r, side: sw.side };
    }
    const t = B.threats.find((x) => x.owner === u && x.kind === "scythe");
    if (t) {
      // 蓄力：慢慢往後舉，快揮下時微微顫動
      const left = Math.max(0, (t.deadline - now) / 1000), k = 1 - left / t.total;
      const side = t.sweep || 1;
      const back = t.ang - side * (t.half + 0.35);
      const shake = k > 0.6 ? Math.sin(now / 30) * 0.04 * k : 0;
      return { phi: lerpA(SCYTHE_REST, back, ease(Math.min(1, k * 2.5))) + shake, off: Math.max(0, 1 - k * 3), side };
    }
    return { phi: SCYTHE_REST, off: 1, side: 1 };
  }
  function drawScythe(u, p, now) {
    const BD = C.body, pose = scythePose(u, now);
    const dx = Math.cos(pose.phi), dy = Math.sin(pose.phi);
    const nx = -dy * pose.side, ny = dx * pose.side;           // 刀刃朝揮動的方向
    // 平常握在身體右邊，攻擊時移到正中間轉動
    const ox = p.x + (BD + 10) * pose.off, oy = p.y + 6 * pose.off;
    const a0 = { x: ox - dx * 22, y: oy - dy * 22 }, tip = { x: ox + dx * 52, y: oy + dy * 52 };
    if (pose.trail) {   // 揮動殘影
      const sw = fx.find((f) => f.k === "scythe" && f.unit === u);
      ctx.lineWidth = 16; ctx.lineCap = "round"; ctx.strokeStyle = `rgba(224,96,154,${0.35 * (1 - pose.k)})`;
      const lo = Math.min(sw.from, pose.phi), hi = Math.max(sw.from, pose.phi);
      ctx.beginPath(); ctx.arc(ox, oy, 60, lo, hi); ctx.stroke();
    }
    line(a0.x, a0.y, tip.x, tip.y, "#1d1d1f", 3);
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tip.x - dx * 17 + nx * 30, tip.y - dy * 17 + ny * 30);
    ctx.lineTo(tip.x - dx * 17, tip.y - dy * 17);
    ctx.closePath();
    ctx.fillStyle = "#fff"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = "#1d1d1f"; ctx.stroke();
  }
  function drawMentor(u, now) {
    const p = pos(u), BD = C.body;
    const isCur = B.current === u && B.inFight;
    if (isCur) { roundRect(p.x - BD - 6, p.y - BD - 6, BD * 2 + 12, BD * 2 + 12, 11); ctx.strokeStyle = "rgba(244,166,199,.5)"; ctx.lineWidth = 3; ctx.stroke(); }
    roundRect(p.x - BD, p.y - BD, BD * 2, BD * 2, 9);
    ctx.fillStyle = "#fff"; ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = "#f4a6c7"; ctx.stroke();
    ctx.fillStyle = "#d0588f"; ctx.font = "bold 16px 'Noto Sans TC', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("澤", p.x, p.y + 1);
    drawScythe(u, p, now);
    ctx.fillStyle = "#1d1d1f"; ctx.font = "12px 'Noto Sans TC', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(u.name, p.x, p.y + BD + 13);
    if (!u.npc) {     // 戰鬥中才有血條
      const bw = 52, bx = p.x - bw / 2, by = p.y + BD + 5;
      ctx.fillStyle = "#ece8df"; ctx.fillRect(bx, by, bw, 5);
      ctx.fillStyle = "#e0609a"; ctx.fillRect(bx, by, bw * (u.hp / u.maxHp), 5);
    }
    if (B.tutorial?.nearNpc?.()) label("按 E 繼續", p.x, p.y - BD - 40 + Math.sin(now / 300) * 2, "#c2477a", 13);
  }


  // ---------- 薇薇拉：蘑菇 ----------
  // 紅色菇傘＋白點、米白色菇柄
  function shroom(x, y, s, cap = "#d64545", alpha = 1) {
    ctx.save(); ctx.globalAlpha *= alpha;
    roundRect(x - 4 * s, y - 2 * s, 8 * s, 10 * s, 3 * s); ctx.fillStyle = "#f4ead2"; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = "#8a7a5a"; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y - 2 * s, 11 * s, 9 * s, 0, Math.PI, 0); ctx.closePath();
    ctx.fillStyle = cap; ctx.fill(); ctx.strokeStyle = "#7a2222"; ctx.lineWidth = 1.5; ctx.stroke();
    for (const [dx, dy, r] of [[-5, -6, 2], [2, -8, 1.6], [6, -4, 1.4], [-1, -4, 1.2]]) circle(x + dx * s, y + dy * s, r * s, null, "#fff");
    ctx.restore();
  }
  function drawTraps(now) {
    for (const z of B.zones) {
      if (z.type !== "trap") continue;
      const pulse = 0.5 + 0.5 * Math.sin(now / 300);
      circle(z.x, z.y, z.r, `rgba(61,154,91,${0.35 + 0.25 * pulse})`, "rgba(61,154,91,.06)", 1.5, [4, 5]);
      if (z.farm) {
        circle(z.x, z.y, z.blast * (CH.skills.run?.farmMult || 1.6), "rgba(61,154,91,.35)", "rgba(120,200,120,.08)", 1.5, [2, 6]);
        shroom(z.x - 12, z.y + 6, 0.8, "#d64545"); shroom(z.x + 12, z.y + 7, 0.75, "#e0a03a"); shroom(z.x, z.y - 4, 1, "#d64545");
      } else shroom(z.x, z.y + 4, 1);
    }
  }
  // 魔狼：朝面向的方向畫（身體、頭、耳朵、尾巴）；領頭更大，兩側有對稱的骨刃
  function drawWolf(u, p, now) {
    const alpha = u.def.ai === "alphaWolf", s = u.r / 22;
    const run = Math.sin(now / 140 + u.x) * 0.06;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(u.facing + Math.PI / 2);          // 頭朝上（面向方向）
    ctx.scale(s, s);
    const body = alpha ? "#5d4b7c" : "#767b92", dark = alpha ? "#3a2a55" : "#4c5066", light = alpha ? "#8a72b0" : "#a5aabd";
    // 影子
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(3, 4, 15, 25, 0, 0, Math.PI * 2); ctx.fill();
    // 骨刃（領頭）：身體左右兩側對稱的彎刀
    if (alpha) {
      for (const side of [-1, 1]) {
        ctx.save(); ctx.scale(side, 1);
        ctx.fillStyle = "#efe6d2"; ctx.strokeStyle = "#7a6a52"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(10, 6); ctx.quadraticCurveTo(34, -2, 38, -26); ctx.quadraticCurveTo(28, -10, 12, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(11, 12); ctx.quadraticCurveTo(30, 16, 36, 30); ctx.quadraticCurveTo(24, 22, 11, 18); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }
    // 尾巴
    ctx.strokeStyle = dark; ctx.lineWidth = 6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0, 18); ctx.quadraticCurveTo(8 * Math.sin(now / 200 + u.x), 30, 3 * Math.sin(now / 160), 38); ctx.stroke();
    // 腳
    ctx.fillStyle = dark;
    for (const [x, y, k] of [[-10, -8, 1], [10, -8, -1], [-9, 12, -1], [9, 12, 1]]) { ctx.beginPath(); ctx.ellipse(x, y + k * run * 40, 4, 6, 0, 0, Math.PI * 2); ctx.fill(); }
    // 身體
    ctx.fillStyle = body; ctx.strokeStyle = dark; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 4, 12, 19, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = light; ctx.beginPath(); ctx.ellipse(0, 2, 5, 12, 0, 0, Math.PI * 2); ctx.fill();
    // 異變的紫色紋路
    if (alpha) { ctx.strokeStyle = `rgba(200,120,255,${0.55 + 0.35 * Math.sin(now / 300)})`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(-2, 4); ctx.lineTo(-7, 14); ctx.moveTo(6, -6); ctx.lineTo(2, 4); ctx.lineTo(7, 14); ctx.stroke(); }
    // 頭、耳朵、嘴
    ctx.fillStyle = body; ctx.strokeStyle = dark; ctx.lineWidth = 2;
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * 4, -22); ctx.lineTo(side * 11, -32); ctx.lineTo(side * 10, -18); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(0, -19, 10, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -28, 5, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#1d1d1f"; ctx.beginPath(); ctx.arc(0, -33, 2.2, 0, Math.PI * 2); ctx.fill();
    // 眼睛
    ctx.fillStyle = alpha ? "#d27bff" : "#e53935";
    ctx.beginPath(); ctx.arc(-4.5, -21, 2, 0, Math.PI * 2); ctx.arc(4.5, -21, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // 海盜：紅頭巾、眼罩、彎刀／火槍；船長戴黑色三角帽、穿紅大衣
  // 幽靈扮演者：披著白床單的人（床單下面露出方塊人的鞋子）
  function drawGhostActor(u, p, now) {
    const r = u.r, x = p.x, y = p.y + Math.sin(now / 300 + u.x) * 3;
    ctx.fillStyle = "#3a2a3a"; ctx.fillRect(x - r * 0.55, y + r * 0.85, r * 0.4, r * 0.25); ctx.fillRect(x + r * 0.15, y + r * 0.85, r * 0.4, r * 0.25);
    ctx.beginPath(); ctx.moveTo(x - r, y + r * 0.9);
    ctx.quadraticCurveTo(x - r * 1.05, y - r * 1.3, x, y - r * 1.2); ctx.quadraticCurveTo(x + r * 1.05, y - r * 1.3, x + r, y + r * 0.9);
    for (let i = 4; i >= 0; i--) ctx.lineTo(x - r + (i * r * 2) / 4, y + r * 0.9 + (i % 2 ? -6 : 4));
    ctx.closePath(); ctx.fillStyle = "#fbf8ff"; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = "#7a3fb0"; ctx.stroke();
    ctx.fillStyle = "#1d1d1f"; ctx.beginPath(); ctx.ellipse(x - r * 0.32, y - r * 0.35, r * 0.13, r * 0.2, 0, 0, Math.PI * 2); ctx.ellipse(x + r * 0.32, y - r * 0.35, r * 0.13, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.1, r * 0.18, r * 0.24, 0, 0, Math.PI * 2); ctx.fill();
  }
  // 海盜：和其他人類一樣的圓角方塊；船長大一號、紅框；槍手藍框
  function drawPirate(u, p, now) {
    const cap = u.kind === "pirateCaptain", gun = u.kind === "pirateGunner", r = u.r;
    const col = cap ? "#a3202a" : gun ? "#3f5f7f" : "#6b4a2a";
    roundRect(p.x - r, p.y - r, r * 2, r * 2, Math.max(8, r * 0.35));
    ctx.fillStyle = "#fff"; ctx.fill(); ctx.lineWidth = cap ? 5 : 4; ctx.strokeStyle = col; ctx.stroke();
    ctx.fillStyle = col; ctx.font = `900 ${Math.round(r * 0.9)}px 'Noto Sans TC', sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(cap ? "鰭" : gun ? "槍" : "盜", p.x, p.y + 1);
    // 武器（朝面向的方向）
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(u.facing || 0);
    if (gun || cap) { ctx.strokeStyle = "#5a3a1a"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(r * 0.9, r * 0.4); ctx.lineTo(r * 1.5, r * 0.4); ctx.stroke(); ctx.strokeStyle = "#555"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(r * 1.3, r * 0.4); ctx.lineTo(r * 1.8, r * 0.4); ctx.stroke(); }
    if (!gun) { ctx.strokeStyle = "#9aa4ac"; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(r * 1.0, -r * 0.5); ctx.quadraticCurveTo(r * 1.5, -r * 0.8, r * 1.7, -r * 0.1); ctx.stroke(); }
    ctx.restore();
  }

  // 變異發泡水母：暗紅色帶鋸齒邊的硬殼、兩側淺藍色的圓珠、粉紅色的裙邊和長觸手
  // shell＝只探出硬殼（半浸在海裡）；air＝跳出海面，整隻露出來
  function drawJelly(u, p, now) {
    const air = u.state.mode === "air", s = u.r / 40;
    const lift = air ? 26 + Math.sin(now / 300) * 6 : 0;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(s, s);
    if (air) { ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(0, 40, 40, 10, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.translate(0, -lift);
    if (air) {
      // 觸手
      ctx.strokeStyle = "#f7a8c4"; ctx.lineWidth = 7; ctx.lineCap = "round";
      for (let i = 0; i < 5; i++) {
        const x0 = -24 + i * 12, sw = Math.sin(now / 220 + i) * 10;
        ctx.beginPath(); ctx.moveTo(x0, 6); ctx.bezierCurveTo(x0 + sw, 30, x0 - sw, 56, x0 + sw * 0.6, 84); ctx.stroke();
      }
      // 裙邊
      ctx.fillStyle = "#fbc6d8"; ctx.strokeStyle = "#f08fb0"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-30, 0);
      for (let i = 0; i <= 6; i++) ctx.quadraticCurveTo(-30 + i * 10 - 5, 14, -30 + i * 10, 4);
      ctx.lineTo(30, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      // 本體（露出、脆弱）：淡粉色的發光
      ctx.fillStyle = `rgba(255,200,220,${0.5 + 0.3 * Math.sin(now / 150)})`; ctx.beginPath(); ctx.ellipse(0, -2, 30, 10, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      // 海面的波紋（只露出硬殼）
      ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, 4, 50 + Math.sin(now / 300) * 4, 12, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // 硬殼：暗紅色的圓頂，下緣是鋸齒
    ctx.fillStyle = air ? "#8a1c2a" : "#a01e30"; ctx.strokeStyle = "#5a0a14"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-40, 0);
    ctx.bezierCurveTo(-42, -52, 42, -52, 40, 0);
    const teeth = [[32, -10], [24, 2], [14, -12], [6, 2], [-4, -12], [-12, 2], [-22, -12], [-30, 2]];
    for (const [x, y] of teeth) ctx.lineTo(x, y);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "rgba(255,120,140,.5)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, -10, 26, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    if (!air) { ctx.strokeStyle = `rgba(255,80,80,${0.4 + 0.3 * Math.sin(now / 200)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -16, 46, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); }
    // 兩側的淺藍圓珠
    for (const sd of [-1, 1]) circle(sd * 42, -4, 7, "#5aaac4", "#a6e2f2", 3);
    ctx.restore();
    label(air ? "本體露出！" : "硬殼", p.x, p.y - u.r * 1.6 - lift * s, air ? "#c2185b" : "#7a0a14", 12);
  }

  // 護送戰的馬車
  function drawWagon(u, now) {
    const p = pos(u), w = 74, h = 48;
    ctx.save();
    ctx.globalAlpha = u.alive ? 1 : 0.45;
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(p.x + 4, p.y + h / 2 + 4, w / 2 + 6, 9, 0, 0, Math.PI * 2); ctx.fill();
    // 車輪
    for (const dx of [-w / 2 + 12, w / 2 - 12]) { circle(p.x + dx, p.y + h / 2 - 2, 10, "#3a2a1a", "#6b4a2a", 3); }
    // 車身
    roundRect(p.x - w / 2, p.y - 6, w, h / 2 + 4, 4); ctx.fillStyle = u.alive ? "#9a6a3a" : "#6a5a4a"; ctx.fill(); ctx.strokeStyle = "#5a3a1a"; ctx.lineWidth = 2.5; ctx.stroke();
    // 車篷
    if (u.alive) {
      ctx.fillStyle = "#f2e6c4"; ctx.strokeStyle = "#a08a5a";
      ctx.beginPath(); ctx.moveTo(p.x - w / 2 + 4, p.y - 6); ctx.quadraticCurveTo(p.x, p.y - h + 2, p.x + w / 2 - 4, p.y - 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      for (const dx of [-14, 0, 14]) { ctx.beginPath(); ctx.moveTo(p.x + dx, p.y - 6); ctx.lineTo(p.x + dx * 0.8, p.y - h * 0.7); ctx.stroke(); }
      // 醃漬罐
      for (const dx of [-20, 20]) { roundRect(p.x + dx - 6, p.y - 2, 12, 14, 3); ctx.fillStyle = "#b8d27a"; ctx.fill(); ctx.strokeStyle = "#5a7a2a"; ctx.lineWidth = 1.5; ctx.stroke(); }
    } else {
      ctx.strokeStyle = "#3a2a1a"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(p.x - 20, p.y - 14); ctx.lineTo(p.x + 6, p.y + 4); ctx.moveTo(p.x + 18, p.y - 18); ctx.lineTo(p.x - 4, p.y + 8); ctx.stroke();
    }
    ctx.restore();
    label(u.name, p.x, p.y + h / 2 + 18, u.alive ? "#3a2a1a" : "#8a8478", 12);
    if (u.alive) {
      const bw = 70, bx = p.x - bw / 2, by = p.y - h - 6;
      ctx.fillStyle = "#ece8df"; ctx.fillRect(bx, by, bw, 7);
      ctx.fillStyle = u.hp / u.maxHp > 0.4 ? "#c98a2a" : "#e53935"; ctx.fillRect(bx, by, bw * (u.hp / u.maxHp), 7);
      ctx.strokeStyle = "#5a3a1a"; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, 7);
    }
  }

  function drawGiant(u, now) {
    const p = pos(u), sway = Math.sin(now / 500) * 1.5;
    const B2 = CH.skills.bloom;
    if (B2?.sporeRadius) circle(p.x, p.y, B2.sporeRadius, "rgba(160,190,60,.45)", "rgba(190,210,90,.07)", 1.5, [6, 6]);
    // 飄著的胞子
    for (let i = 0; i < 10; i++) {
      const a = now / 1600 + i * 0.63, rr = 40 + ((now / 25 + i * 37) % (B2?.sporeRadius || 140 - 40));
      circle(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr * 0.8, 2.2, null, "rgba(180,200,80,.55)");
    }
    ctx.save(); ctx.translate(p.x, p.y + 8); ctx.rotate(sway * 0.01);
    shroom(0, 0, 2.6, "#c0392b");
    ctx.restore();
    const bw = 60, bx = p.x - bw / 2, by = p.y + 36;
    ctx.fillStyle = "#ece8df"; ctx.fillRect(bx, by, bw, 6);
    ctx.fillStyle = "#3d9a5b"; ctx.fillRect(bx, by, bw * (u.hp / u.maxHp), 6);
    label(`巨大蘑菇（剩 ${u.turnsLeft} 回合）`, p.x, by + 16, "#2e7a46", 11);
  }
  // 減速、破防的小標記
  function drawDebuffs(u, p) {
    if (!u.alive || u.team !== "enemy") return;
    const marks = [];
    if (B.slowed(u.parent || u)) marks.push(["麻痺", "#8a9a2a"]);
    if (u.state.defDownUntil >= B.round) marks.push(["破防", "#b05a1e"]);
    marks.forEach(([t, c], i) => label(t, p.x - (marks.length - 1) * 16 + i * 32, p.y + u.r + 44, c, 10));
  }

  function drawUnit(u, now) {
    if (u.state?.dived) return;                 // 潛到地底：看不到
    if (u.kind === "giantShroom") return drawGiant(u, now);
    if (u.summon && CH.drawSummon && u.alive) { ctx.save(); const done = CH.drawSummon(ctx, u, now, { pos, label, circle, line }); ctx.restore(); if (done) return; }   // 角色自己畫的召喚物（例如蒼幽的魚群）
    if (u.team === "enemy" && !u.demon && !u.cage) drawDebuffs(u, pos(u));
    if (u.demon) return drawDemon(u, now);
    if (u.kind === "mentor") return drawMentor(u, now);
    if (u.part) return;
    if (u.cage) return;                 // 聖牢籠畫在地面層（drawZones）
    if (u.def.ai === "passion") return drawPassion(u, now);
    if (u.def.minion && !u.alive && u.state.sacrificed) return;   // 化作光柱的教徒、教皇不留殘影
    if (u.def.ai === "cultist") return drawCultist(u, now);
    if (u.def.ai === "pope") return drawPope(u, now);
    if (u.def.boss) return drawBoss(u, now);
    if (u.ward) return drawWagon(u, now);
    const off = lungeOffset(u, now);
    const leap = leapProgress(u, now);
    if (leap) {
      const g = pos(u), kk = leap.k;
      // 高高躍起（有 height 的）：快速升空、在空中停一下、猛然下砸
      const h = leap.f.height ? (kk < 0.65 ? Math.sin((kk / 0.65) * Math.PI / 2) : 1 - Math.pow((kk - 0.65) / 0.35, 2)) : Math.sin(kk * Math.PI);
      ctx.fillStyle = `rgba(29,29,31,${0.18 - h * 0.08})`;
      ctx.beginPath(); ctx.ellipse(g.x, g.y + C.body * 0.8, C.body * (1 - h * 0.35), C.body * 0.35 * (1 - h * 0.35), 0, 0, Math.PI * 2); ctx.fill();
      off.y -= h * (leap.f.height || 90);
    }
    const p = { x: pos(u).x + off.x, y: pos(u).y + off.y }, BD = C.body;
    const isCur = B.current === u && B.phase !== "over";
    ctx.globalAlpha = u.alive ? 1 : 0.25;

    if (isCur) {
      const pulse = 4 + Math.sin(now / 200) * 2;
      if (u.team === "player") { roundRect(p.x - BD - pulse, p.y - BD - pulse, (BD + pulse) * 2, (BD + pulse) * 2, 10); ctx.strokeStyle = "rgba(29,29,31,.25)"; ctx.lineWidth = 2; ctx.stroke(); }
      else circle(p.x, p.y, BD + pulse, "rgba(43,178,76,.35)", null, 2);
    }

    // 隱蔽中：半透明、外圍有粉色霧氣
    const hidden = u.team === "player" && u.alive && CH.passive?.evade && CH.passive.evade(B, u) > 0;
    if (hidden) {
      circle(p.x, p.y, BD + 10 + Math.sin(now / 400) * 2, "rgba(194,71,122,.5)", "rgba(244,170,200,.18)", 2, [4, 4]);
      ctx.globalAlpha = 0.55;
    } else if (inBush(u)) ctx.globalAlpha = 0.6;     // 躲在草叢裡
    if (u.team === "player") {
      const S = BD * (CH.drawScale || 1);     // 霍夫曼的方塊比較大
      roundRect(p.x - S, p.y - S, S * 2, S * 2, 8);
      ctx.fillStyle = "#fff"; ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = CH.color || "#1d1d1f"; ctx.stroke();
      ctx.fillStyle = CH.color || "#1d1d1f"; ctx.font = `bold ${Math.round(16 * (CH.drawScale || 1))}px 'Noto Sans TC', sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(CH.letter || CH.name[0], p.x, p.y + 1);
      // 霍夫曼的超壓縮穿梭：0.77 秒前（照著走過的路慢一拍）和 0.66 秒後的自己
      if (u.state.clones) {
        posHist.push({ t: now, x: p.x, y: p.y });
        while (posHist.length && now - posHist[0].t > 1500) posHist.shift();
        for (const cl of u.state.clones) {
          let q = p;
          if (cl.lag) { const want = now - cl.lag * 1000; q = posHist.find((h) => h.t >= want) || p; }
          const cx = q.x + cl.dx, cy = q.y + cl.dy, col = cl.lag ? "rgba(229,57,53," : "rgba(46,158,91,";
          ctx.globalAlpha = 0.55;
          roundRect(cx - S, cy - S, S * 2, S * 2, 8); ctx.fillStyle = col + "0.12)"; ctx.fill(); ctx.strokeStyle = col + "0.9)"; ctx.lineWidth = 3; ctx.stroke();
          roundRect(cx - S + 4, cy - S - 3, S * 2, S * 2, 8); ctx.strokeStyle = "rgba(47,111,214,.6)"; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = col + "0.9)"; ctx.font = `bold ${Math.round(16 * (CH.drawScale || 1))}px 'Noto Sans TC', sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(CH.letter || CH.name[0], cx, cy + 1);
          ctx.globalAlpha = 1;
          label(cl.label, cx, cy + S + 14, col + "1)", 10);
        }
      } else if (posHist.length) posHist.length = 0;
      // 護盾：外面一圈淡藍色的框
      if (u.shield > 0 && u.alive) { roundRect(p.x - S - 6, p.y - S - 6, (S + 6) * 2, (S + 6) * 2, 12); ctx.strokeStyle = `rgba(47,143,214,${0.55 + 0.25 * Math.sin(now / 250)})`; ctx.lineWidth = 3; ctx.stroke(); }

    } else if (R.EnemyArt?.[u.kind]) {
      // 旅館的扮演者、郵局的情緒煙霧…（js/enemy-art.js）
      R.EnemyArt[u.kind](ctx, u, p, now);
      const top = p.y - u.r - (R.EnemyArt[u.kind].top || 16), col = u.def.color || "#7a3fb0";
      if (u.alive && !B.realtime) for (let i = 0; i < u.maxAp; i++) circle(p.x + (i - (u.maxAp - 1) / 2) * 10, top, 3.5, col, i < u.ap && isCur ? col : "#fffdf8", 1.5);
    } else if (u.kind === "ghostActor") {
      drawGhostActor(u, p, now);
      const top = p.y - u.r - 22;
      if (u.alive) for (let i = 0; i < u.maxAp; i++) circle(p.x + (i - (u.maxAp - 1) / 2) * 10, top, 3.5, "#7a3fb0", i < u.ap && isCur ? "#7a3fb0" : "#fffdf8", 1.5);
    } else if (u.kind && u.kind.startsWith("pirate")) {
      drawPirate(u, p, now);
      const top = p.y - u.r - 12;
      if (u.alive) for (let i = 0; i < u.maxAp; i++) circle(p.x + (i - (u.maxAp - 1) / 2) * 10, top, 3.5, "#5a3a22", i < u.ap && isCur ? "#5a3a22" : "#fffdf8", 1.5);
    } else if (u.def.ai === "jelly") {
      drawJelly(u, p, now);
    } else if (u.def.ai === "wolf" || u.def.ai === "alphaWolf") {
      drawWolf(u, p, now);
      const top = p.y - u.r - 10;
      if (u.alive && !B.realtime) for (let i = 0; i < u.maxAp; i++) circle(p.x + (i - (u.maxAp - 1) / 2) * 10, top, 3.5, "#6b6f86", i < u.ap && isCur ? "#6b6f86" : "#fffdf8", 1.5);
    } else {
      const squish = 1 + Math.sin(now / 260 + u.x) * 0.04;
      const SC = u.def.color || "#2bb24c";      // 史萊姆的變體（例如彈跳噩夢）可以換顏色
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1 / squish, squish);
      circle(0, 0, BD, SC, u.def.fill || "rgba(43,178,76,.12)", 3);
      ctx.restore();
      circle(p.x - 7 + Math.cos(u.facing) * 4, p.y - 3 + Math.sin(u.facing) * 4, 2.6, null, "#1d1d1f");
      circle(p.x + 7 + Math.cos(u.facing) * 4, p.y - 3 + Math.sin(u.facing) * 4, 2.6, null, "#1d1d1f");
      if (u.alive) for (let i = 0; i < u.maxAp; i++) {
        circle(p.x + (i - (u.maxAp - 1) / 2) * 10, p.y - BD - 10, 3.5, SC, i < u.ap && isCur ? SC : "#fffdf8", 1.5);
      }
      if (u.alive && u.state.slamCd > 0) label(`壓制 CD ${u.state.slamCd}`, p.x + BD + 34, p.y - BD + 2, "#8a8478", 11);
    }

    const BL = Math.max(BD, u.team === "player" ? BD : u.r);    // 大型單位的名字往下放
    ctx.fillStyle = "#1d1d1f"; ctx.font = "12px 'Noto Sans TC', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(u.team === "player" && u.level ? `Lv${u.level} ${u.name}` : u.name, p.x, p.y + BL + 13);
    if (u.alive && !u.def.bigBar) {
      const bw = 46, bx = p.x - bw / 2, by = p.y + BL + 5;
      ctx.fillStyle = "#ece8df"; ctx.fillRect(bx, by, bw, 5);
      if (SCARE) { ctx.fillStyle = PURPLE; ctx.fillRect(bx, by, bw * (1 - u.hp / u.maxHp), 5); }
      else { ctx.fillStyle = u.team === "player" ? "#e0524a" : "#2bb24c"; ctx.fillRect(bx, by, bw * (u.hp / u.maxHp), 5); }
      if (u.shield > 0) { ctx.fillStyle = "rgba(47,143,214,.85)"; ctx.fillRect(bx, by - 4, bw * Math.min(1, u.shield / u.maxHp), 3); }
    }
    ctx.globalAlpha = 1;

    if (u.alive && u.team === "player") {
      let ang = u.facing;
      if (canAct() && mouse.in) ang = Math.atan2(mouse.y - p.y, mouse.x - p.x);
      facingArrow(p.x, p.y, ang);
      // 上膛標示：頭上的標靶，畫在最上層才不會被擋
      if (u.state.loaded) drawTarget(p.x, p.y - 72, 14 + Math.sin(now / 250) * 1.2);
      if (hidden) label("隱蔽", p.x + BD + 18, p.y - BD, "#c2477a", 11);
      // 陰霾層數：頭上一排深紫色小點
      const g = u.state.gloom || 0;
      for (let i = 0; i < g; i++) circle(p.x - (g - 1) * 4.5 + i * 9, p.y - BD - 11, 3.5, null, "#4b3f8f");
      // 行動點：畫在面向箭頭之後，才不會被箭頭蓋住
      drawApPips(u, p.x, p.y - BD - (g ? 24 : 12));
    }
  }

  function drawFx(now) {
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i], dur = f.dur || 700, k = (now - f.t) / dur;
      if (k >= 1) { fx.splice(i, 1); continue; }
      if (k < 0) continue;
      ctx.globalAlpha = 1 - k;
      switch (f.k) {
        case "ring": circle(f.x, f.y, f.r * (0.4 + k * 0.6), f.color, null, 4); break;
        case "shape": drawShape(f.shape, f.color, f.color, 0.35); break;
        case "char": ctx.save(); CH.drawFx?.(ctx, f.ev, k, now, { circle, line, label }); ctx.restore(); break;
        case "lash": {   // 蛇腹劍：劍柄在角色手上，劍刃一節一節沿著弧線甩出去
          const per = 1 / f.hits, i = Math.min(f.hits - 1, Math.floor(k / per)), q = (k - i * per) / per;
          const side = i % 2 ? -1 : 1, sweep = f.half * 2 + 0.3;
          const a = f.ang + side * (-f.half - 0.15 + sweep * Math.min(1, q * 1.25));
          const reach = f.radius * (0.55 + 0.45 * Math.sin(Math.min(1, q * 1.4) * Math.PI / 2));
          const segs = 11, pts = [];
          for (let j = 0; j <= segs; j++) {
            const r = (j / segs) * reach, lag = (j / segs) * (j / segs) * side * 0.5 * (1 - q);   // 尖端比較慢，拖出弧度
            pts.push([f.x + Math.cos(a - lag) * r, f.y + Math.sin(a - lag) * r]);
          }
          ctx.globalAlpha = Math.min(1, 1.6 - k);
          if (f.fire) { ctx.strokeStyle = "rgba(255,120,30,.45)"; ctx.lineWidth = 16; ctx.beginPath(); pts.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
          ctx.strokeStyle = "#3a3a42"; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();   // 串起劍節的鋼索
          for (let j = 1; j <= segs; j++) {   // 一節一節的劍刃（菱形）
            const [x0, y0] = pts[j - 1], [x1, y1] = pts[j], aa = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0);
            ctx.save(); ctx.translate(x0, y0); ctx.rotate(aa);
            ctx.fillStyle = f.fire ? (j % 2 ? "#ffb347" : "#ff6a1a") : "#d9dde3"; ctx.strokeStyle = f.fire ? "#a8320f" : "#5a5f6a"; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L * 0.5, -5); ctx.lineTo(L * 0.95, 0); ctx.lineTo(L * 0.5, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.restore();
          }
          // 掃過的殘光
          ctx.globalAlpha = 0.35 * (1 - q); ctx.strokeStyle = f.fire ? "#ff7a1e" : "#9aa3b0"; ctx.lineWidth = 6;
          ctx.beginPath(); ctx.arc(f.x, f.y, reach * 0.92, Math.min(a, f.ang + side * (-f.half - 0.15)), Math.max(a, f.ang + side * (-f.half - 0.15))); ctx.stroke();
          if (f.circle) { ctx.globalAlpha = 0.25 * (1 - k); circle(f.circle.x, f.circle.y, f.circle.radius, f.fire ? "#e8781e" : "#8a8478", f.fire ? "rgba(255,120,30,.12)" : "rgba(80,80,90,.06)", 3, [8, 6]); }
          break;
        }
        case "grab": {   // 抓取：劍刃伸長出去，再收回來
          const out = k < 0.45 ? k / 0.45 : 1 - (k - 0.45) / 0.55, x = f.from.x + (f.to.x - f.from.x) * out, y = f.from.y + (f.to.y - f.from.y) * out;
          const L = Math.hypot(x - f.from.x, y - f.from.y), aa = Math.atan2(f.to.y - f.from.y, f.to.x - f.from.x), n = Math.max(2, Math.round(L / 22));
          ctx.globalAlpha = 1;
          line(f.from.x, f.from.y, x, y, "#3a3a42", 2);
          for (let j = 0; j < n; j++) {
            const r0 = (j / n) * L, r1 = ((j + 1) / n) * L;
            ctx.save(); ctx.translate(f.from.x + Math.cos(aa) * r0, f.from.y + Math.sin(aa) * r0); ctx.rotate(aa + Math.sin(j * 1.7 + now / 60) * 0.08);
            ctx.fillStyle = f.fire ? "#ff8a2a" : "#d9dde3"; ctx.strokeStyle = f.fire ? "#a8320f" : "#5a5f6a"; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo((r1 - r0) * 0.5, -5); ctx.lineTo(r1 - r0, 0); ctx.lineTo((r1 - r0) * 0.5, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.restore();
          }
          // 勾爪狀的劍尖
          ctx.save(); ctx.translate(x, y); ctx.rotate(aa); ctx.fillStyle = f.fire ? "#ff6a1a" : "#c9ced6"; ctx.strokeStyle = "#3a3a42"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-4, -9); ctx.lineTo(0, 0); ctx.lineTo(-4, 9); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
          break;
        }
        case "suction": {   // 吸入：從四周往中心捲的藍色氣流，被吸的敵人身上拉出線
          const n = 26;
          for (let i = 0; i < n; i++) {
            const ph = ((now / 900) + i / n) % 1, a = (i / n) * Math.PI * 2 + ph * 2.2, rr2 = f.r * (1.5 - ph * 1.1);
            ctx.globalAlpha = (1 - k * 0.5) * Math.sin(ph * Math.PI) * 0.8;
            ctx.strokeStyle = "#4a90f0"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(f.x, f.y, rr2, a, a + 0.35); ctx.stroke();
          }
          ctx.globalAlpha = 0.6 * (1 - k * 0.5);
          for (const e of f.units || []) if (e.alive) line(pos(e).x, pos(e).y, f.x + (pos(e).x - f.x) * 0.55, f.y + (pos(e).y - f.y) * 0.55, "#7fb4ff", 3, [10, 6]);
          break;
        }
        case "blueQuake": {   // 下砸：藍色震盪波＋地面裂痕＋齒輪狀的衝擊環
          const e1 = 1 - Math.pow(1 - k, 3);
          ctx.globalAlpha = Math.max(0, 0.55 - k * 0.8); ctx.fillStyle = "#8ec5ff"; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * Math.min(1, k * 5), 0, Math.PI * 2); ctx.fill();
          for (let i = 0; i < 3; i++) {
            const q = Math.max(0, e1 - i * 0.15);
            if (q <= 0) continue;
            ctx.globalAlpha = (1 - q) * 0.95; ctx.strokeStyle = i === 1 ? "#ffffff" : "#2f6fd6"; ctx.lineWidth = 10 - i * 3;
            ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 1.15 * q, 0, Math.PI * 2); ctx.stroke();
          }
          ctx.globalAlpha = 1 - k; ctx.strokeStyle = "#2f6fd6"; ctx.lineWidth = 3;
          for (let i = 0; i < 14; i++) {
            const a = (i / 14) * Math.PI * 2 + 0.2, L = f.r * (0.45 + 0.35 * ((i * 37) % 10) / 10) * Math.min(1, k * 4);
            ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + Math.cos(a) * L * 0.5, f.y + Math.sin(a) * L * 0.5 + 8); ctx.lineTo(f.x + Math.cos(a) * L, f.y + Math.sin(a) * L); ctx.stroke();
          }
          ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(k * 1.5); ctx.globalAlpha = (1 - k) * 0.8; ctx.strokeStyle = "#5aa0ff"; ctx.lineWidth = 6;
          const R1 = f.r * 0.35 * (0.6 + e1);
          for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R1, Math.sin(a) * R1); ctx.lineTo(Math.cos(a) * (R1 + 18), Math.sin(a) * (R1 + 18)); ctx.stroke(); }
          ctx.restore();
          break;
        }
        case "taiji": {   // 觀知命的陰陽陣：旋轉的太極圖
          ctx.globalAlpha = k < 0.7 ? 0.8 : (1 - k) / 0.3 * 0.8;
          drawTaiji(f.x, f.y, f.r * Math.min(1, k * 4), k * Math.PI * 2);
          break;
        }
        case "taijiOld": {
          ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(k * Math.PI * 2);
          const r = f.r * Math.min(1, k * 4);
          ctx.beginPath(); ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2); ctx.arc(0, r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true); ctx.arc(0, -r / 2, r / 2, Math.PI / 2, -Math.PI / 2); ctx.closePath();
          ctx.fillStyle = "rgba(242,200,60,.35)"; ctx.fill();
          ctx.beginPath(); ctx.arc(0, 0, r, Math.PI / 2, -Math.PI / 2); ctx.arc(0, -r / 2, r / 2, -Math.PI / 2, Math.PI / 2, true); ctx.arc(0, r / 2, r / 2, -Math.PI / 2, Math.PI / 2); ctx.closePath();
          ctx.fillStyle = "rgba(120,20,30,.3)"; ctx.fill();
          ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.strokeStyle = "#2f6fd6"; ctx.lineWidth = 4; ctx.stroke();
          ctx.restore();
          break;
        }
        case "talisman": {   // 觀知命的符咒：黃紙飛過去
          const kk = Math.min(1, k * 1.6), x = f.from.x + (f.to.x - f.from.x) * kk, y = f.from.y + (f.to.y - f.from.y) * kk;
          ctx.globalAlpha = 1;
          if (f.star) {   // 宇宙秘密 42 號的小星星
            ctx.save(); ctx.translate(x, y); ctx.rotate(now / 80); ctx.fillStyle = "#f2d45a"; ctx.strokeStyle = "#a8781a"; ctx.lineWidth = 1.5;
            ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 4 : 10, a = -Math.PI / 2 + (i * Math.PI) / 5; i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.restore();
            break;
          }
          ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(f.to.y - f.from.y, f.to.x - f.from.x) + Math.PI / 2);
          ctx.fillStyle = "#f6d55c"; ctx.fillRect(-7, -11, 14, 22); ctx.strokeStyle = "#c0392b"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(0, 7); ctx.moveTo(-4, -2); ctx.lineTo(4, -2); ctx.stroke();
          ctx.restore();
          break;
        }
        case "afterimage": {  // 霍夫曼：紅藍綠的殘影
          const cols = f.color ? [f.color] : ["rgba(229,57,53,", "rgba(47,111,214,", "rgba(46,158,91,"];
          const n = 6;
          for (let i = 0; i < n; i++) {
            const q = i / (n - 1), x = f.from.x + (f.to.x - f.from.x) * q, y = f.from.y + (f.to.y - f.from.y) * q;
            const c = cols[(i + Math.floor(f.t)) % cols.length];
            ctx.globalAlpha = (1 - k) * (0.25 + 0.5 * q);
            roundRect(x - C.body, y - C.body, C.body * 2, C.body * 2, 8); ctx.strokeStyle = c + "0.9)"; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = c + "0.18)"; ctx.fill();
          }
          break;
        }
        case "num": label(f.text, f.x, f.y - k * 30, f.color, 20); break;
        case "leaf": {
          const tt = k * dur / 1000, x = f.x + f.vx * tt, y = f.y + f.vy * tt + 160 * tt * tt;
          ctx.save(); ctx.translate(x, y); ctx.rotate(f.rot + k * 8);
          ctx.fillStyle = "#5ea33f"; ctx.beginPath(); ctx.ellipse(0, 0, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          break;
        }
        case "rect":
          ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.ang);
          ctx.fillStyle = "rgba(229,57,53,.45)"; ctx.fillRect(0, -f.width / 2, f.length, f.width);
          ctx.restore(); break;
        case "sector":
          threatPath(f); ctx.fillStyle = "rgba(229,57,53,.4)"; ctx.fill();
          break;
        case "slash": {     // 伊爾舒：突刺（細長、往前戳）／斬擊（弧形刀光掃過）；dark＝心魔的黑色斬擊
          const o = f.origin || pos(f.unit);
          if (f.style === "thrust") {
            // 前 40% 時間往前刺出，之後淡出
            const go = Math.min(1, k / 0.4), L = f.radius * (0.35 + 0.75 * go), w = Math.max(f.half, 0.12);
            ctx.globalAlpha = k < 0.4 ? 1 : 1 - (k - 0.4) / 0.6;
            threatPath({ shape: "sector", x: o.x, y: o.y, ang: f.ang, half: w * 1.3, radius: L });
            ctx.fillStyle = "rgba(75,63,143,.4)"; ctx.fill();
            const tx = o.x + Math.cos(f.ang) * L, ty = o.y + Math.sin(f.ang) * L;
            line(o.x, o.y, tx, ty, "rgba(58,45,112,.9)", 9);
            line(o.x, o.y, tx, ty, "rgba(255,255,255,.95)", 3.5);
            arrowHead(tx + Math.cos(f.ang) * 10, ty + Math.sin(f.ang) * 10, f.ang, 20, "rgba(58,45,112,.9)");
          } else {
            // 弧形刀光：從一側掃到另一側，粗刀光 + 白色刀刃 + 淡淡的扇形殘影
            const strong = f.style === "strong";
            const sweep = f.n === 1 ? -1 : 1;
            const prog = Math.min(1, k / 0.45);
            const a0 = f.ang - f.half * sweep, a1 = a0 + 2 * f.half * sweep * prog;
            const lo = Math.min(a0, a1), hi = Math.max(a0, a1);
            ctx.globalAlpha = k < 0.45 ? 1 : 1 - (k - 0.45) / 0.55;
            threatPath({ shape: "sector", x: o.x, y: o.y, ang: f.ang, half: f.half, radius: f.radius });
            ctx.fillStyle = f.dark ? (strong ? "rgba(10,8,14,.3)" : "rgba(20,16,26,.18)") : strong ? "rgba(58,45,112,.22)" : "rgba(75,63,143,.14)"; ctx.fill();
            ctx.lineCap = "round";
            ctx.lineWidth = strong ? 30 : 20;
            ctx.strokeStyle = f.dark ? (strong ? "rgba(0,0,0,.95)" : "rgba(12,10,16,.85)") : strong ? "rgba(40,28,85,.9)" : f.n ? "rgba(58,45,112,.8)" : "rgba(75,63,143,.7)";
            ctx.beginPath(); ctx.arc(o.x, o.y, f.radius * 0.82, lo, hi); ctx.stroke();
            ctx.lineWidth = strong ? 7 : 4; ctx.strokeStyle = f.dark ? "rgba(150,40,90,.9)" : "rgba(255,255,255,.95)";
            ctx.beginPath(); ctx.arc(o.x, o.y, f.radius * 0.82 + (strong ? 8 : 5), lo, hi); ctx.stroke();
            if (strong) {   // 第三斬：外圈再多一道紅紫色衝擊
              ctx.lineWidth = 6; ctx.strokeStyle = `rgba(160,40,90,${0.8 * (1 - k)})`;
              ctx.beginPath(); ctx.arc(o.x, o.y, f.radius * (1 + k * 0.25), f.ang - f.half, f.ang + f.half); ctx.stroke();
            }
          }
          break;
        }
        case "warn": {
          ctx.globalAlpha = 1;
          const w = pos(f.unit), pop = Math.min(1, k * 6), y = w.y - f.unit.r - 46 - (1 - pop) * 8;
          circle(w.x, y, 13 * pop, "#c62828", "#fff", 2.5);
          label("!", w.x, y + 1, "#c62828", 18);
          break;
        }
        case "explode":
          circle(f.x, f.y, f.radius * (0.3 + k * 0.8), "#3a2d70", `rgba(91,63,168,${0.4 * (1 - k)})`, 6);
          circle(f.x, f.y, f.radius * (0.15 + k * 0.5), null, `rgba(233,216,255,${0.5 * (1 - k)})`);
          break;
        case "trail":
          line(f.from.x, f.from.y, f.to.x, f.to.y, "rgba(91,63,168,.45)", 14);
          break;
        case "laser": {   // 激光：白芯紅邊，越來越細
          const w = f.width * (1 - k * 0.7);
          ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.ang);
          ctx.fillStyle = "rgba(232,38,44,.55)"; ctx.fillRect(0, -w / 2, f.length, w);
          ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fillRect(0, -w / 6, f.length, w / 3);
          ctx.restore();
          break;
        }
        case "bigSlash": {     // 鬼一文字：沿著紅框一閃而過的刀光
          const c = Math.cos(f.ang), s2 = Math.sin(f.ang), L = f.length * Math.min(1, k * 4);
          ctx.save(); ctx.globalAlpha = k < 0.5 ? 1 : (1 - k) * 2;
          ctx.translate(f.x, f.y); ctx.rotate(f.ang);
          const g = ctx.createLinearGradient(0, 0, L, 0); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.7, "rgba(255,255,255,.95)"); g.addColorStop(1, "rgba(255,80,60,.9)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -6); ctx.quadraticCurveTo(L * 0.5, -f.width * 0.45, L, 0); ctx.quadraticCurveTo(L * 0.5, -f.width * 0.25, 0, 6); ctx.fill();
          ctx.strokeStyle = "rgba(200,30,30,.8)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(L * 0.5, -f.width * 0.35, L, 0); ctx.stroke();
          ctx.restore();
          if (k < 0.6) { ctx.save(); ctx.globalAlpha = 1 - k / 0.6; ctx.font = "900 44px 'Noto Serif TC', serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = 8; ctx.strokeStyle = "#fff"; const tx = f.x + c * f.length * 0.5, ty = f.y + s2 * f.length * 0.5 - 40; ctx.strokeText("鬼一文字", tx, ty); ctx.fillStyle = "#b81a20"; ctx.fillText("鬼一文字", tx, ty); ctx.restore(); }
          break;
        }
        case "fireball": {     // 火球（藍色＝死神的鬼火）：從起點飛到終點，拖著尾巴
          if (k < 0) break;
          const ang = Math.atan2(f.ty - f.y, f.tx - f.x), x = f.x + (f.tx - f.x) * k, y = f.y + (f.ty - f.y) * k;
          ctx.save(); if (f.blue) { ctx.shadowColor = "#5ab4ff"; ctx.shadowBlur = 14; }
          for (let i = 0; i < 6; i++) { const q = i / 6, xx = x - Math.cos(ang) * q * 60, yy = y - Math.sin(ang) * q * 60; ctx.fillStyle = f.blue ? `rgba(${60 + 120 * (1 - q)},${150 + 80 * (1 - q)},255,${(1 - q) * 0.9})` : `rgba(255,${100 + 120 * (1 - q)},30,${(1 - q) * (1 - k * 0.5)})`; ctx.beginPath(); ctx.arc(xx, yy, 16 * (1 - q * 0.6), 0, Math.PI * 2); ctx.fill(); }
          ctx.restore();
          break;
        }
        case "fireBurst": {
          if (k < 0) break;
          const a = 1 - k;
          ctx.save(); if (f.blue) { ctx.shadowColor = "#5ab4ff"; ctx.shadowBlur = 16; }
          for (let i = 0; i < 10; i++) { const an = (i / 10) * Math.PI * 2 + k, rr = f.r * (0.2 + 0.8 * k); ctx.fillStyle = f.blue ? `rgba(${50 + (i % 3) * 40},${140 + (i % 3) * 40},255,${a * 0.8})` : `rgba(255,${90 + (i % 3) * 50},30,${a * 0.8})`; ctx.beginPath(); ctx.arc(f.x + Math.cos(an) * rr * 0.6, f.y + Math.sin(an) * rr * 0.6 - k * 30, 18 * a + 6, 0, Math.PI * 2); ctx.fill(); }
          ctx.fillStyle = f.blue ? `rgba(210,240,255,${a * 0.6})` : `rgba(255,220,120,${a * 0.6})`; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.5 * (1 - k * 0.5), 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          break;
        }
        case "splash": {
          ctx.save(); ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = "#2a6aa8"; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * (0.4 + k), f.r * (0.25 + k * 0.6), 0, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = "#8a6a4a"; for (let i = 0; i < 8; i++) { const an = (i / 8) * Math.PI * 2; ctx.fillRect(f.x + Math.cos(an) * f.r * k * 1.1 - 5, f.y + Math.sin(an) * f.r * k * 0.8 - 5 - Math.sin(k * Math.PI) * 30, 10, 10); }
          ctx.restore();
          break;
        }
        case "bigText": {   // 畫面中央的大字（例如死神的警告）
          if (f.style === "warn") {
            // 警告條：黑紅斜紋的長條＋閃爍的警告文字
            const a = k < 0.1 ? k / 0.1 : k > 0.85 ? (1 - k) / 0.15 : 1, y0 = H * 0.66, bh = 84, open = Math.min(1, k / 0.12);
            ctx.save(); ctx.globalAlpha = a;
            ctx.fillStyle = "rgba(20,0,0,.88)"; ctx.fillRect(0, y0 - (bh / 2) * open, W, bh * open);
            ctx.beginPath(); ctx.rect(0, y0 - bh / 2, W, 12); ctx.rect(0, y0 + bh / 2 - 12, W, 12); ctx.clip();
            const off = (now / 20) % 40;
            for (let x = -40 + off; x < W + 40; x += 40) { ctx.fillStyle = "#e8262c"; ctx.beginPath(); ctx.moveTo(x, y0 - bh / 2); ctx.lineTo(x + 20, y0 - bh / 2); ctx.lineTo(x + 8, y0 + bh / 2); ctx.lineTo(x - 12, y0 + bh / 2); ctx.closePath(); ctx.fill(); }
            ctx.restore();
            ctx.save(); ctx.globalAlpha = a * (0.75 + 0.25 * Math.sin(now / 70));
            ctx.font = "900 38px 'Noto Sans TC', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillStyle = "#ff4a4a"; ctx.fillText(`⚠ ${f.text} ⚠`, W / 2, y0 + 2);
            ctx.restore();
            break;
          }
          const a = k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1, sc = 1 + 0.08 * Math.sin(k * 30);
          ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, H * 0.7); ctx.scale(sc, sc);
          ctx.font = "900 46px 'Noto Sans TC', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.lineWidth = 10; ctx.strokeStyle = "rgba(20,0,0,.85)"; ctx.strokeText(f.text, 0, 0); ctx.fillStyle = f.color; ctx.fillText(f.text, 0, 0);
          ctx.restore();
          break;
        }
        case "ink": {
          const g = Math.min(1, k * 4), a = k < 0.7 ? 1 : (1 - k) / 0.3;
          ctx.save(); ctx.globalAlpha = 0.9 * a; ctx.fillStyle = "#050507"; ctx.beginPath();
          for (let i = 0; i < 9; i++) { const an = (i / 9) * Math.PI * 2 + i, rr = f.r * g * (0.55 + 0.35 * ((i * 7) % 3) / 2); ctx.moveTo(f.x + Math.cos(an) * rr + 16, f.y + Math.sin(an) * rr); ctx.arc(f.x + Math.cos(an) * rr, f.y + Math.sin(an) * rr, 16 * g, 0, Math.PI * 2); }
          ctx.arc(f.x, f.y, f.r * 0.6 * g, 0, Math.PI * 2); ctx.fill(); ctx.restore();
          break;
        }
        case "gum": {
          const a = k < 0.8 ? 1 : (1 - k) * 5;
          ctx.save(); ctx.globalAlpha = a;
          ctx.fillStyle = "rgba(244,140,190,.85)"; ctx.beginPath();
          for (let i = 0; i < 7; i++) { const an = (i / 7) * Math.PI * 2, rr = 26 + (i % 3) * 6; ctx.moveTo(f.x + Math.cos(an) * rr + 12, f.y + Math.sin(an) * rr * 0.6); ctx.arc(f.x + Math.cos(an) * rr, f.y + Math.sin(an) * rr * 0.6, 12, 0, Math.PI * 2); }
          ctx.arc(f.x, f.y, 24, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.beginPath(); ctx.arc(f.x - 8, f.y - 6, 5, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          break;
        }
        case "words": {    // 噴出來的文字：沿著攻擊方向飛出去
          const L = f.length * Math.min(1, k * 1.6), x = f.x + Math.cos(f.ang) * L, y = f.y + Math.sin(f.ang) * L;
          ctx.save(); ctx.globalAlpha = k < 0.75 ? 1 : (1 - k) * 4;
          ctx.font = `900 ${Math.round(20 + 6 * Math.sin(k * Math.PI))}px 'Noto Sans TC', sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.lineWidth = 5; ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.strokeText(f.text, x, y); ctx.fillStyle = f.color; ctx.fillText(f.text, x, y);
          ctx.restore();
          break;
        }
        case "wordRing": { // 圓形攻擊：文字往四周散開
          ctx.save(); ctx.globalAlpha = 1 - k; ctx.font = "900 16px 'Noto Sans TC', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + k, rr = f.r * (0.3 + 0.7 * k); ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.strokeText(f.text, f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr); }
          ctx.restore();
          break;
        }
        case "tracer": {   // 火槍：槍口火光＋子彈軌跡（人不會衝出去）
          ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.ang);
          ctx.strokeStyle = `rgba(255,214,90,${1 - k})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(f.r * 1.6, f.r * 0.4); ctx.lineTo(f.r * 1.6 + f.length * Math.min(1, k * 3), f.r * 0.4); ctx.stroke();
          if (k < 0.4) { ctx.fillStyle = `rgba(255,170,40,${1 - k * 2.5})`; ctx.beginPath(); ctx.arc(f.r * 1.9, f.r * 0.4, 12 * (1 - k), 0, Math.PI * 2); ctx.fill(); }
          ctx.restore();
          break;
        }
        case "electric":
          circle(f.x, f.y, f.radius, null, "rgba(80,160,255,.25)");
          drawSparks(f.x, f.y, f.radius, now, 1);
          break;
        case "shield":
          circle(f.unit.x, f.unit.y, f.unit.r + 18 + k * 8, "rgba(61,127,224,.9)", "rgba(120,185,255,.25)", 4);
          break;
        case "chargeOut":   // 蓄力範圍縮小淡出
          circle(f.c.x, f.c.y, f.c.radius * (1 - k * 0.6), "#c62828", `rgba(229,57,53,${0.15 * (1 - k)})`, 3, [12, 8]);
          break;
        case "shroomFly": {   // 蘑菇拋物線
          ctx.globalAlpha = 1;
          const x = f.from.x + (f.to.x - f.from.x) * k, y = f.from.y + (f.to.y - f.from.y) * k - Math.sin(k * Math.PI) * 70;
          shroom(x, y, 0.9);
          break;
        }
        case "shroomFuse": {  // 落地等爆炸：閃爍的範圍
          ctx.globalAlpha = 1;
          const blink = Math.sin(now / (60 - k * 40)) > 0;
          circle(f.x, f.y, f.radius, blink ? "rgba(214,69,69,.8)" : "rgba(214,69,69,.35)", "rgba(214,69,69,.08)", 2, [5, 4]);
          shroom(f.x, f.y + 4, 1 + k * 0.25);
          break;
        }
        case "shroomBoom": {
          ctx.globalAlpha = 1;
          const r = f.radius * Math.min(1, k * 2.5);
          circle(f.x, f.y, r, `rgba(214,69,69,${0.8 * (1 - k)})`, `rgba(240,160,120,${0.35 * (1 - k)})`, 4);
          for (let i = 0; i < 12; i++) {
            const a = i * 0.52, rr = r * (0.4 + (i % 3) * 0.25);
            circle(f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr, 3.5 * (1 - k), null, i % 2 ? "rgba(255,255,255,.9)" : "rgba(214,69,69,.85)");
          }
          if (f.farm) circle(f.x, f.y, r * 0.8, `rgba(61,154,91,${1 - k})`, null, 3);
          break;
        }
        case "sporeCloud": {
          ctx.globalAlpha = 1;
          for (let i = 0; i < 26; i++) {
            const a = i * 0.9 + k, rr = f.radius * ((i % 7) / 7) * (0.5 + k * 0.6);
            circle(f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr, 4 + (i % 3), null, `rgba(170,195,70,${0.55 * (1 - k)})`);
          }
          break;
        }
        case "bigSlash": {   // 偽神的揮砍：整片範圍閃一下，加上一道大弧形刀光
          ctx.globalAlpha = 1;
          ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.ang);
          ctx.fillStyle = `rgba(232,38,44,${0.35 * (1 - k)})`; ctx.fillRect(0, -f.width / 2, f.length, f.width);
          ctx.restore();
          const sweep = Math.min(1, k * 2.2), a0 = f.ang - 1.1, a1 = a0 + 2.2 * sweep;
          ctx.save(); ctx.lineCap = "round";
          ctx.lineWidth = 46 * (1 - k * 0.6); ctx.strokeStyle = `rgba(122,13,26,${0.75 * (1 - k)})`;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.length * 0.45, a0, a1); ctx.stroke();
          ctx.lineWidth = 9; ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - k)})`;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.length * 0.45, a0, a1); ctx.stroke();
          ctx.restore();
          break;
        }
        case "bellWave": {   // 擴散圓環：金色的波往外推
          ctx.globalAlpha = 1;
          const r = f.radius * Math.min(1, k * 1.6);
          circle(f.x, f.y, r, `rgba(242,194,0,${1 - k})`, `rgba(242,194,0,${0.12 * (1 - k)})`, 9);
          circle(f.x, f.y, r * 0.9, `rgba(232,38,44,${0.6 * (1 - k)})`, null, 3);
          break;
        }
        case "pillar": {     // 向上的光柱
          ctx.globalAlpha = 1;
          const grow = Math.min(1, k * 4), fade = k < 0.4 ? 1 : 1 - (k - 0.4) / 0.6, w = f.radius * 1.3 * (0.6 + 0.4 * fade);
          const top = f.y - (f.y + 40) * grow;
          const g = ctx.createLinearGradient(0, top, 0, f.y);
          const col = f.gold ? "242,194,0" : "232,38,44";
          g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.6, `rgba(${col},${0.45 * fade})`); g.addColorStop(1, `rgba(255,255,255,${0.9 * fade})`);
          ctx.fillStyle = g; ctx.fillRect(f.x - w / 2, top, w, f.y - top);
          ctx.fillStyle = `rgba(255,255,255,${0.8 * fade})`; ctx.fillRect(f.x - w / 8, top, w / 4, f.y - top);
          circle(f.x, f.y, f.radius * (0.6 + k * 0.6), `rgba(${col},${fade})`, `rgba(${col},${0.2 * fade})`, 4);
          break;
        }
        case "redemption": { // 同心圓從中心一路推到全圖
          ctx.globalAlpha = 1;
          const sc = Math.min(1, k / 0.5), fade = k < 0.5 ? 0.6 : 0.6 * (1 - (k - 0.5) / 0.5);
          for (const [a, z] of f.bands) {
            ctx.beginPath(); ctx.arc(f.x, f.y, z * sc, 0, Math.PI * 2); ctx.arc(f.x, f.y, a * sc, 0, Math.PI * 2, true);
            ctx.fillStyle = `rgba(232,38,44,${fade})`; ctx.fill();
          }
          break;
        }
        case "beam":         // 指尖連到復甦的單位
          line(f.from.x, f.from.y, f.to.x, f.to.y, `rgba(242,194,0,${1 - k})`, 5);
          break;
        case "orb": {        // 變身：紅色光球包覆
          ctx.globalAlpha = 1;
          const w = pos(f.unit), r = 40 + Math.min(1, k * 2.5) * 130 + Math.sin(now / 70) * 4;
          ctx.save(); ctx.shadowColor = "#ff1a1a"; ctx.shadowBlur = 50;
          circle(w.x, w.y, r, "rgba(232,38,44,.9)", `rgba(232,38,44,${0.35 + 0.35 * k})`, 5);
          ctx.restore();
          circle(w.x, w.y, r * 0.6, null, `rgba(255,120,120,${0.4 + 0.4 * k})`);
          break;
        }
        case "smokeOut": {
          ctx.globalAlpha = 1;
          drawSmoke(f.zone, now, 1 - k, 1 + k * 0.4);
          break;
        }
        case "arrow": {
          // 淡紅色箭矢；穿雲之箭更粗、帶發光拖尾
          ctx.globalAlpha = 1;
          const el = now - f.t, fly = Math.min(1, el / f.fly), ang = Math.atan2(f.to.y - f.from.y, f.to.x - f.from.x);
          const hx = f.from.x + (f.to.x - f.from.x) * fly, hy = f.from.y + (f.to.y - f.from.y) * fly;
          const tail = Math.max(0, fly - (f.pierce ? 0.6 : 0.25));
          const tx = f.from.x + (f.to.x - f.from.x) * tail, ty = f.from.y + (f.to.y - f.from.y) * tail;
          const fade = el < f.fly ? 1 : 1 - (el - f.fly) / (f.dur - f.fly);
          if (f.pierce) {
            ctx.save(); ctx.shadowColor = "#ff7fb6"; ctx.shadowBlur = 22;
            line(tx, ty, hx, hy, `rgba(255,190,220,${0.55 * fade})`, 16);
            line(tx, ty, hx, hy, `rgba(194,71,122,${fade})`, 6);
            line(tx, ty, hx, hy, `rgba(255,255,255,${0.9 * fade})`, 2);
            ctx.restore();
            arrowHead(hx + Math.cos(ang) * 8, hy + Math.sin(ang) * 8, ang, 24, `rgba(194,71,122,${fade})`);
            // 沿路飄出的光點
            for (let i = 0; i < 6; i++) {
              const q = tail + ((fly - tail) * i) / 6, px = f.from.x + (f.to.x - f.from.x) * q, py = f.from.y + (f.to.y - f.from.y) * q;
              const off = Math.sin(now / 60 + i * 1.7) * 9;
              circle(px - Math.sin(ang) * off, py + Math.cos(ang) * off, 2.5, null, `rgba(255,160,200,${0.8 * fade})`);
            }
            break;
          }
          const col = f.boosted ? `rgba(214,92,140,${fade})` : `rgba(240,120,120,${fade})`;
          line(tx, ty, hx, hy, col, 4);
          arrowHead(hx + Math.cos(ang) * 6, hy + Math.sin(ang) * 6, ang, 16, col);
          break;
        }
        case "spike": {
          // 煙霧尖刺：沿折線（反彈）飛行的粉色細長三角形
          ctx.globalAlpha = 1;
          const el = now - f.t, fly = Math.min(1, el / f.fly);
          const fade = el < f.fly ? 1 : 1 - (el - f.fly) / (f.dur - f.fly);
          const at = (d) => {               // 折線上走 d 距離的位置與方向
            for (let j = 1; j < f.pts.length; j++) {
              const A = f.pts[j - 1], Bp = f.pts[j], L = dist(A.x, A.y, Bp.x, Bp.y);
              if (d <= L || j === f.pts.length - 1) {
                const q = L ? Math.min(1, d / L) : 1;
                return { x: A.x + (Bp.x - A.x) * q, y: A.y + (Bp.y - A.y) * q, ang: Math.atan2(Bp.y - A.y, Bp.x - A.x) };
              }
              d -= L;
            }
            return { x: f.pts[0].x, y: f.pts[0].y, ang: 0 };
          };
          const d = f.len * fly, h = at(d);
          // 拖尾：往回取幾個點
          ctx.lineCap = "round";
          for (let i = 1; i <= 5; i++) {
            const q = at(Math.max(0, d - i * 22));
            circle(q.x, q.y, (f.side ? 4 : 5.5) - i * 0.6, null, `rgba(244,170,200,${(0.55 - i * 0.08) * fade})`);
          }
          ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.ang);
          ctx.fillStyle = `rgba(194,71,122,${0.9 * fade})`;
          const sc = f.side ? 0.75 : 1;
          ctx.beginPath(); ctx.moveTo(14 * sc, 0); ctx.lineTo(-30 * sc, -7 * sc); ctx.lineTo(-22 * sc, 0); ctx.lineTo(-30 * sc, 7 * sc); ctx.closePath(); ctx.fill();
          ctx.restore();
          if (fly >= 1) circle(h.x, h.y, 14 + (1 - fade) * 20, `rgba(194,71,122,${fade})`, null, 3);
          break;
        }
        case "finaleCharge": {
          // 尖刺聚集：面前的光球越來越大
          ctx.globalAlpha = 1;
          const r = 8 + Math.min(1, k * 1.2) * (10 + f.count * 4);
          ctx.save(); ctx.shadowColor = "#ff7fb6"; ctx.shadowBlur = 30;
          circle(f.x, f.y, r, null, `rgba(255,190,220,${0.35 + k * 0.4})`);
          circle(f.x, f.y, r * 0.5, null, `rgba(255,255,255,${0.5 + k * 0.4})`);
          ctx.restore();
          circle(f.x, f.y, r + 10 + Math.sin(now / 50) * 4, "#c2477a", null, 2);
          break;
        }
        case "finale": {
          // 極強的穿透飛箭：瞬間貫穿到牆，粗光柱慢慢收窄淡出
          ctx.globalAlpha = 1;
          const grow = Math.min(1, k / 0.18), fade = k < 0.3 ? 1 : 1 - (k - 0.3) / 0.7;
          const ex = f.from.x + (f.to.x - f.from.x) * grow, ey = f.from.y + (f.to.y - f.from.y) * grow;
          const w = f.width * (1 + (1 - fade) * 0.3) * (k < 0.3 ? 1 : fade);
          ctx.save(); ctx.lineCap = "round"; ctx.shadowColor = "#ff5fa2"; ctx.shadowBlur = 40;
          line(f.from.x, f.from.y, ex, ey, `rgba(255,170,210,${0.5 * fade})`, w * 1.8);
          line(f.from.x, f.from.y, ex, ey, `rgba(194,71,122,${0.9 * fade})`, w);
          line(f.from.x, f.from.y, ex, ey, `rgba(255,255,255,${fade})`, w * 0.3);
          ctx.restore();
          const ang = Math.atan2(f.to.y - f.from.y, f.to.x - f.from.x);
          arrowHead(ex + Math.cos(ang) * 14, ey + Math.sin(ang) * 14, ang, 40 + f.count * 3, `rgba(194,71,122,${fade})`);
          if (k < 0.4) circle(f.from.x, f.from.y, 30 + k * 160, `rgba(255,120,180,${1 - k / 0.4})`, null, 5);
          break;
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  function frame(now) {
    ctx.save();
    if (now < shakeUntil) ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
    drawGrid();
    if (B) {
      for (const u of B.units) {
        const d = disp.get(u.id) || (disp.set(u.id, { x: u.x, y: u.y }), disp.get(u.id));
        const leap = leapProgress(u, now);
        if (leap) {
          const e = leap.k * leap.k * (3 - 2 * leap.k);
          d.x = leap.f.from.x + (leap.f.to.x - leap.f.from.x) * e;
          d.y = leap.f.from.y + (leap.f.to.y - leap.f.from.y) * e;
        } else if (!(hold.get(u.id) > now)) { d.x += (u.x - d.x) * 0.25; d.y += (u.y - d.y) * 0.25; }
      }
      drawZones(now);
      drawBushes(now, false);
      drawTraps(now);
      drawCharges(now);
      drawPlanning();
      drawThreat(now);
      [...B.units].sort((a, b) => a.alive - b.alive).forEach((u) => drawUnit(u, now));
      // 死神的收割目標：紅色的瞄準圈
      for (const e of B.units) {
        const m = e.alive && e.state?.mark;
        if (!m || !m.alive) continue;
        const p = pos(m), k = (now / 600) % 1;
        circle(p.x, p.y, (m.r || 22) + 14 + k * 8, `rgba(198,40,40,${0.9 - k * 0.6})`, null, 3, [6, 5]);
        label("☠ 收割目標", p.x, p.y + (m.r || 22) + 34, "#c62828", 12);
      }
      drawBushes(now, true);
      for (const u of B.units) if (inBush(u) && !u.def.bigBar) { const p = pos(u); label("草叢", p.x, p.y - (u.team === "player" ? 44 : u.r + 22), "#2e6b1e", 11); }
      drawProjectiles();
      // 霍夫曼的齒輪飛盤（飛行中）
      const disc = B.player.state.disc;
      if (disc) {
        ctx.save(); ctx.translate(disc.x, disc.y); ctx.rotate(now / 60); ctx.scale(disc.size || 1, disc.size || 1);
        ctx.fillStyle = "#c9cdd6"; ctx.strokeStyle = "#5a6070"; ctx.lineWidth = 2.5;
        ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, rr = i % 2 ? 15 : 20; i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#5a6070"; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        if (disc.back) line(disc.x, disc.y, pos(B.player).x, pos(B.player).y, "rgba(90,96,112,.35)", 2, [4, 6]);
      }
      // 角色場上的東西（例如蒼幽的泡泡、幽靈魚、海馬先生）
      if (CH.drawBattle) { ctx.save(); CH.drawBattle(ctx, now, B, { circle, line, label, pos }); ctx.restore(); }
      drawFx(now);
      drawThreatLabel(now);
      const key = `${mode}|${mouse.in}|${B.phase}|${B.player.ap}|${mouse.in && unitAt(mouse)?.id}`;
      drawBubbles(now);
    }
    ctx.restore();
    requestAnimationFrame(frame);
  }

  // ---------- 整頁等比例縮放 ----------
  // 版面固定以 1600px 寬設計，依視窗大小縮放到剛好放得下遊戲區（場地 + 下方技能列）
  // 這樣不同瀏覽器、側邊欄、瀏覽器縮放比例下看起來都一樣
  function fit() {
    const app = $("#app"), wrap = $("#fit");
    app.style.transform = "none";
    const designW = app.offsetWidth;
    const mainH = $("#hud").offsetTop + $("#hud").offsetHeight + 12;   // 不含下方的數值面板
    const s = Math.min(window.innerWidth / designW, window.innerHeight / mainH);
    app.style.transform = `scale(${s})`;
    wrap.style.width = `${designW * s}px`;
    wrap.style.height = `${app.offsetHeight * s}px`;
  }
  window.addEventListener("resize", fit);
  $("#tuner").addEventListener("toggle", fit);
  fit();
  document.fonts?.ready.then(fit);

  R.getBattle = () => B;   // 除錯用：在 Console 輸入 RPG.getBattle()
  document.title = `${ROOMDEF.name} · 戰鬥測試`;
  $("#roomName").textContent = ROOMDEF.name;
  if (ROOMDEF.help && $("#roomHelp")) $("#roomHelp").innerHTML = ROOMDEF.help;
  newBattle();
  requestAnimationFrame(frame);
})();
