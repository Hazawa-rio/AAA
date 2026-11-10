/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/explore.js": "20261110175453" });
// 地圖探索：走出酒館後抵達的時空
// 適格者在地圖上相當於「行動點無限」，但只能：移動、普攻（右鍵切換成攻擊模式）、地圖探索技能 Q（以秒冷卻）
// 魔物會在附近遊盪（魔狼看到人會撲過來）；被魔物碰到＝遇襲（先手值 −2），先攻擊魔物＝迎戰（先手值 +3）
// 委託：先到委託人面前的圓圈裡和他談 → 照委託做事 → 回去找委託人回報
// 這一趟的生命、金幣、行囊（20 格）都存在 trip.run；金幣和行囊會跟著這輪冒險帶回酒館
(function () {
  const R = window.RPG, P = R.Profile, CM = R.Commissions, BAG = R.Bag;
  if (R.Progress) R.Progress.useAdventure = true;          // 這輪冒險自己的成長與寶物
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

  function showError(e) {
    const el = $("#fatal");
    el.textContent = `發生錯誤：${e?.message || e}（請截圖回報）`;
    el.classList.remove("hidden");
  }
  window.addEventListener("error", (e) => showError(e.error || e.message));

  // ===== 這一趟 =====
  let trip = P.trip();
  if (trip.status !== "away" || !trip.accepted.length) { location.replace("tavern.html"); return; }
  trip.progress = trip.progress || {};
  trip.qcount = trip.qcount || {};
  if (!trip.run) trip.run = { hp: null, gold: 0, items: [], defeated: [], picked: [], traps: [], pos: null, cd: {} };
  const run = trip.run;
  const save = () => { trip.run = run; P.setTrip(trip); };
  const W0 = CM.WORLDS[trip.world];
  // 有些時空有好幾個場景（例如旅館的後院墓園）：trip.scene 決定用哪一張地圖
  const MAP = (trip.scene && R.MAPS[`${trip.world}/${trip.scene}`]) || R.MAPS[trip.world];
  if (MAP === R.MAPS[trip.world]) trip.scene = null;
  // 室內地圖（例如美食研究所）沒有海、城牆這些東西：補上空的清單
  for (const k of ["piers", "roads", "buildings", "stalls", "trees", "rocks", "traps", "pickups", "enemies", "npcs", "shops", "townsfolk", "potions", "solids"]) MAP[k] = MAP[k] || [];
  MAP.zone = MAP.zone || { dy: 62, r: 50 };
  MAP.questData = MAP.questData || {};
  let HOOK = {};                 // 各時空自己的玩法（js/worlds/*.js 用 R.WorldHooks 註冊）
  const CH = R.CHARACTERS[trip.char] || Object.values(R.CHARACTERS)[0];
  const FIELD = CH.field || { basicRange: 80, q: null };
  const drinkHp = run.drink ? P.bonusOf(run.drink).hp : 0;
  const stats = () => (R.Progress ? R.Progress.forBattle(CH) : { stats: CH.stats }).stats;
  const maxHp = () => stats().hp + drinkHp;              // 寶物（例如醃漬罐）會改變上限
  if (run.hp == null) run.hp = maxHp();
  run.hp = Math.min(run.hp, maxHp());
  if (run.respawn || !run.pos) { run.pos = { ...MAP.arrive }; run.respawn = false; }
  const SCARE = !!MAP.scare;      // 萬聖節旅館：沒有血條，只有驚嚇值（＝最大生命－生命）
  save();

  // ===== 音效、BGM =====
  let muted = false;
  try { muted = localStorage.getItem("rpg.muted") === "1"; } catch (e) { /* 忽略 */ }
  let bgm = null;
  function startBgm() {
    if (!MAP.bgm || muted) return;
    if (!bgm) { bgm = new Audio(MAP.bgm + "?v=" + (document.querySelector("meta[name=build]")?.content || "")); bgm.loop = true; bgm.volume = R.CONFIG.bgmVolume; }
    if (bgm.paused) bgm.play().catch(() => {});
  }
  function sfx(src) { if (muted || !src) return; const a = new Audio(src); a.volume = R.CONFIG.volume; a.play().catch(() => {}); }
  window.addEventListener("pointerdown", startBgm);
  window.addEventListener("keydown", startBgm);
  startBgm();
  function renderMute() { $("#muteBtn").textContent = muted ? "音效關" : "音效開"; $("#muteBtn").setAttribute("aria-pressed", String(!muted)); }

  // ===== 行囊 =====
  function heal(n, why) {
    const got = Math.min(n, maxHp() - run.hp);
    if (got <= 0) { toast("生命已經是滿的"); return false; }
    run.hp += got;
    fx.push({ k: "num", x: me.x, y: me.y - 40, text: `+${got}`, color: "#2e9e5b", t: performance.now(), dur: 1000 });
    toast(`${why}，回復 ${got} 點生命`);
    save();
    return true;
  }
  function useItem(id) {
    const it = BAG.get(id);
    if (!it?.field) { toast(it?.battle ? `${it.name}要在戰鬥中使用` : `${it?.name || "這個"}不能在這裡使用`); return false; }
    if (it.use?.hp && heal(Math.round(maxHp() * it.use.hp), `使用${it.name}`)) { BAG.remove(run.items, id, 1); save(); return true; }
    return false;
  }

  // ===== 地圖碰撞 =====
  const rectHit = (r, x, y, h) => x + h > r.x && x - h < r.x + r.w && y + h > r.y && y - h < r.y + r.h;
  const inRect = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  // 矮牆（lowWalls）：平常擋路，霍夫曼的噴氣裝置可以跨過去
  MAP.lowWalls = MAP.lowWalls || [];
  const SOLID = [...MAP.buildings, ...MAP.stalls, ...MAP.solids, ...MAP.lowWalls];
  const ROUND = [...MAP.trees, ...MAP.rocks, ...(MAP.fruitTree ? [MAP.fruitTree] : [])];
  const wallTop = MAP.indoor ? { x: -9, y: -9, w: 0, h: 0 } : { x: MAP.wallX, y: 0, w: MAP.wallW, h: MAP.gate.y1 };
  const wallBot = MAP.indoor ? { x: -9, y: -9, w: 0, h: 0 } : { x: MAP.wallX, y: MAP.gate.y2, w: MAP.wallW, h: MAP.h - MAP.gate.y2 };
  // 室內：只能走在房間（walk 長方形）裡；身體範圍內每隔幾格都要在某個房間裡（才不會穿過房間之間的薄牆）
  const inWalk = (x, y) => MAP.walk.some((r) => inRect(r, x, y));
  const boxInWalk = (x, y, h) => { const n = Math.max(2, Math.ceil((h * 2) / 6)); for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) if (!inWalk(x - h + (2 * h * i) / n, y - h + (2 * h * j) / n)) return false; return true; };
  function blocked(x, y, h) {
    if (x - h < 0 || y - h < 0 || x + h > MAP.w || y + h > MAP.h) return true;
    if (MAP.indoor) {
      if (!boxInWalk(x, y, h)) return true;
      for (const r of SOLID) if (rectHit(r, x, y, h)) return true;
      for (const c of ROUND) if (dist(x, y, c.x, c.y) < c.r + h * 0.8) return true;
      return !!HOOK.blocked?.(x, y, h);
    }
    if (x - h * 0.5 < MAP.shoreX(y) && !MAP.piers.some((p) => inRect(p, x, y))) return true;      // 海
    if (rectHit(wallTop, x, y, h) || rectHit(wallBot, x, y, h)) return true;
    for (const r of SOLID) if (rectHit(r, x, y, h)) return true;
    for (const c of ROUND) if (dist(x, y, c.x, c.y) < c.r + h * 0.8) return true;
    return false;
  }
  const outside = (x) => !MAP.indoor && x > MAP.wallX + MAP.wallW;

  // ===== 玩家 =====
  const me = { x: run.pos.x, y: run.pos.y, half: 17, speed: 170 + stats().spd * 7, target: null, then: null, stuck: 0 };
  const carrying = () => { const q = trip.accepted.map((id) => ({ id, st: CM.stage(trip, id) })).find((x) => x.st?.type === "carry"); return !!(q && trip.qdata?.[q.id]?.carrying); };
  let mode = "move";            // move | attack
  let aiming = false;           // Q 正在選方向／位置
  let charging = null;          // 伊爾舒的蓄力 { start, dur }
  let busy = false;             // 轉場中、面板開著
  let bubble = null;            // 角色頭上的台詞（只用設定好的台詞）
  const fx = [];

  // ===== 魔物 =====
  const WOLF = MAP.wolf || {};
  const isWolf = (k) => !!WOLF.packs?.[k];
  const enemies = MAP.enemies.filter((e) => !run.defeated.includes(e.id)).map((e) => ({ ...e, hx: e.x, hy: e.y, r: isWolf(e.kind) ? 30 : 26, tx: e.x, ty: e.y, wait: Math.random() * 2, chasing: false, face: 0 }));
  function updateEnemies(dt) {
    const grace = Date.now() < (run.grace || 0);
    for (const e of enemies) {
      // 魔狼：看到人就撲過來；離家太遠就放棄
      if (isWolf(e.kind) && !grace) {
        const dp = dist(e.x, e.y, me.x, me.y), dh = dist(e.x, e.y, e.hx, e.hy);
        if (!e.chasing && dp < WOLF.aggro && dh < WOLF.leash * 0.8) { e.chasing = true; fx.push({ k: "alert", e, t: performance.now(), dur: 700 }); sfx(WOLF.howl); }
        if (e.chasing && (dh > WOLF.leash || dp > WOLF.aggro * 1.8)) { e.chasing = false; e.tx = e.hx; e.ty = e.hy; e.wait = 0; }
        if (e.chasing) {
          // 正面被擋住就往旁邊偏一點繞過去（樹、石頭）
          const s = WOLF.speed * dt, a0 = Math.atan2(me.y - e.y, me.x - e.x);
          e.face = a0;
          for (const off of [0, 0.5, -0.5, 1, -1, 1.5, -1.5]) {
            const nx = e.x + Math.cos(a0 + off) * s, ny = e.y + Math.sin(a0 + off) * s;
            if (!blocked(nx, ny, e.r * 0.6)) { e.x = nx; e.y = ny; break; }
          }
          continue;
        }
      }
      if (e.wait > 0) { e.wait -= dt; continue; }
      const d = dist(e.x, e.y, e.tx, e.ty);
      if (d < 4) {
        e.wait = 0.8 + Math.random() * 2.2;
        const a = Math.random() * Math.PI * 2, r = Math.random() * MAP.enemyWander;
        e.tx = e.hx + Math.cos(a) * r; e.ty = e.hy + Math.sin(a) * r;
        continue;
      }
      const s = Math.min(d, MAP.enemySpeed * dt), nx = e.x + ((e.tx - e.x) / d) * s, ny = e.y + ((e.ty - e.y) / d) * s;
      e.face = Math.atan2(e.ty - e.y, e.tx - e.x);
      if (blocked(nx, ny, e.r * 0.8)) { e.tx = e.x; e.ty = e.y; continue; }
      e.x = nx; e.y = ny;
    }
  }

  // ===== 鎮民：只是在鎮上遊盪 =====
  const folk = (MAP.townsfolk || []).map((f) => ({ ...f, hx: f.x, hy: f.y, tx: f.x, ty: f.y, wait: Math.random() * 3 }));
  function updateFolk(dt) {
    for (const f of folk) {
      if (f.wait > 0) { f.wait -= dt; continue; }
      const d = dist(f.x, f.y, f.tx, f.ty);
      if (d < 3) {
        f.wait = 1.5 + Math.random() * 4;
        for (let i = 0; i < 8; i++) {
          const a = Math.random() * Math.PI * 2, r = 40 + Math.random() * 220, x = f.hx + Math.cos(a) * r, y = f.hy + Math.sin(a) * r;
          if (!blocked(x, y, 12) && !outside(x)) { f.tx = x; f.ty = y; break; }
        }
        continue;
      }
      const s = Math.min(d, 45 * dt), nx = f.x + ((f.tx - f.x) / d) * s, ny = f.y + ((f.ty - f.y) / d) * s;
      if (blocked(nx, ny, 12)) { f.tx = f.x; f.ty = f.y; continue; }
      f.x = nx; f.y = ny;
    }
  }

  // ===== 委託的地點（會合點、果樹…） =====
  // 目前要去的地點：接下的委託中，現在這個進度有 at 的
  function questSpots() {
    const out = [];
    for (const id of trip.accepted) {
      const st = CM.stage(trip, id);
      if (st?.at) out.push({ id, st, x: st.at.x, y: st.at.y });
      // 已經發現位置（感測、走近）但還沒調查的線索
      if (st?.type === "clues") for (const c of cluesOf(id, st)) if (c.shown && !c.found) out.push({ id, st: { type: "clue" }, clue: c, x: c.x, y: c.y });
    }
    return out;
  }

  // ===== 海盜相關的委託：線索、比對攤位、跟蹤、深夜搬運 =====
  // 每一趟的隨機內容存在 trip.qdata[委託]，戰鬥來回也不會變
  const QD = MAP.questData || {};
  const qd = (id) => { trip.qdata = trip.qdata || {}; return (trip.qdata[id] = trip.qdata[id] || {}); };
  const pickN = (arr, n) => { const a = arr.map((_, i) => i); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
  const stageOf = (type) => trip.accepted.map((id) => ({ id, st: CM.stage(trip, id) })).filter((x) => x.st?.type === type);
  // 線索：隨機挑 need 個；shown＝位置已知、hint＝鎮民說過大概的區域、found＝調查過
  function cluesOf(id, st) {
    const d = qd(id);
    if (!d.clues) {
      d.clues = pickN(QD[st.pool], st.need).map((i) => ({ i, shown: false, hint: null, found: false }));
      save();
    }
    return d.clues.map((c) => Object.assign(c, { x: QD[st.pool][c.i].x, y: QD[st.pool][c.i].y }));
  }
  function openClue(id, c) {
    const info = QD.pirateClues[c.i];
    openPanel("可疑的痕跡", `<p class="wx-p">${esc(info.text)}</p><div class="tv-row"><button type="button" class="primary" data-act="clue" data-id="${id}" data-i="${c.i}">記下這條線索</button></div>`);
  }
  // 向鎮民打聽：告訴你某條還沒找到的線索的大概區域
  function askFolk(f) {
    const q = stageOf("clues")[0];
    if (!q) return;
    const left = cluesOf(q.id, q.st).filter((c) => !c.found && !c.shown);
    let line;
    if (!left.length) line = "海盜？我知道的都跟你說了。";
    else {
      const c = left.find((x) => !x.hint) || left[Math.floor(Math.random() * left.length)];
      const a = Math.random() * Math.PI * 2, r = 40 + Math.random() * 90;
      c.hint = { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r, r: 190 };
      save();
      const tpl = QD.clueHints[Math.floor(Math.random() * QD.clueHints.length)];
      line = tpl.replace("{area}", QD.pirateClues[c.i].area);
    }
    openPanel("鎮民", `<div class="tv-npc"><span class="face" style="border-color:${f.color};color:${f.color}">民</span><p>${esc(line)}</p></div><p class="tv-note">打聽到的區域會在地圖和小地圖上用虛線圈出來。</p>`);
  }

  // 比對攤位：失竊物 3 件、銷贓的攤位、2 個擺著相似假貨的攤位
  function marketOf(id) {
    const d = qd(id), G = QD.stolenGoods;
    if (!d.market) {
      const list = pickN(G.stolen, 3), culprit = Math.floor(Math.random() * MAP.stalls.length);
      const others = pickN(MAP.stalls, MAP.stalls.length).filter((i) => i !== culprit);
      const decoyStalls = others.slice(0, 2), sellers = pickN(G.sellers, MAP.stalls.length);
      const stalls = MAP.stalls.map((_, si) => {
        const goods = pickN(G.normal, 3).map((k) => G.normal[k]);
        if (si === culprit) list.forEach((k, j) => { goods[j] = G.stolen[k]; });
        const di = decoyStalls.indexOf(si);
        if (di >= 0) goods[0] = G.decoy[list[di]];
        return { seller: G.sellers[sellers[si]], goods: goods.sort(() => Math.random() - 0.5) };
      });
      d.market = { list: list.map((k) => G.stolen[k]), culprit, stalls, wrong: 0 };
      save();
    }
    return d.market;
  }
  function openStall(si) {
    const q = stageOf("inspect")[0];
    if (!q) return;
    const m = marketOf(q.id), st = m.stalls[si];
    openPanel(`攤位：${st.seller}`, `<p class="tv-note">蒂娜的失竊清單：${m.list.map((x) => `<b>${esc(x)}</b>`).join("、")}</p>
      <p class="wx-p">攤位上擺著：</p><ul class="wx-list">${st.goods.map((g) => `<li>${esc(g)}</li>`).join("")}</ul>
      <div class="tv-row"><button type="button" class="primary" data-act="accuse" data-id="${q.id}" data-i="${si}">就是這個攤位</button><button type="button" class="ghost" data-close>再看看別攤</button></div>`);
  }

  // 跟蹤：攤主走向隨機的交貨地點；離太遠＝跟丟、太近或在他回頭時被看到＝被發現
  let seller = null;
  function tailState(id) {
    const d = qd(id);
    if (d.route == null) { d.route = Math.floor(Math.random() * QD.tailRoutes.length); save(); }
    const route = QD.tailRoutes[d.route], m = marketOf(id), sp = MAP.stalls[m.culprit];
    if (!seller || seller.id !== id) seller = { id, route, start: { x: sp.x + sp.w / 2, y: sp.y + sp.h + 24 }, name: m.stalls[m.culprit].seller };
    return seller;
  }
  function resetTail(why) {
    if (!seller) return;
    Object.assign(seller, { x: seller.start.x, y: seller.start.y, seg: 0, going: false, near: 0, lookT: 0, looking: 0, sus: 0 });
    toast(why);
  }
  function updateTail(dt) {
    const q = stageOf("tail")[0];
    if (!q) { seller = null; return; }
    const S = tailState(q.id);
    if (S.x == null) Object.assign(S, { x: S.start.x, y: S.start.y, seg: 0, going: false, near: 0, lookT: 0, looking: 0, sus: 0 });
    const d = dist(me.x, me.y, S.x, S.y);
    if (!S.going) {
      if (d < 260) { S.going = true; S.lookT = 4 + Math.random() * 3; toast(`${S.name}收拾東西離開了攤位——跟上去，別被發現！`); }
      return;
    }
    // 回頭看
    if (S.looking > 0) {
      S.looking -= dt;
      if (d < 210) { S.sus += dt * 2.2; if (S.sus >= 1) return resetTail(`被${S.name}發現了！他若無其事地回到了攤位……`); }
      return;
    }
    S.lookT -= dt;
    if (S.lookT <= 0) { S.looking = 1.4; S.lookT = 5 + Math.random() * 4; return; }
    if (d < 90) { S.sus += dt; if (S.sus >= 1) return resetTail(`跟得太近，被${S.name}發現了！他若無其事地回到了攤位……`); }
    else S.sus = Math.max(0, S.sus - dt * 0.3);
    if (d > 380) return resetTail(`跟丟了……${S.name}好像又回到了攤位`);
    const pts = S.route.points, tgt = pts[Math.min(S.seg, pts.length - 1)];
    const dd = dist(S.x, S.y, tgt[0], tgt[1]), sp = 95 * dt;
    if (dd <= sp) {
      S.x = tgt[0]; S.y = tgt[1]; S.seg++;
      if (S.seg >= pts.length) {
        CM.advance(trip, q.id); save(); seller = null;
        toast(`${S.name}在${S.route.name}把貨交給了一個戴著黑色魚鰭徽章的人。回去告訴蒂娜吧`);
      }
    } else { S.x += ((tgt[0] - S.x) / dd) * sp; S.y += ((tgt[1] - S.y) / dd) * sp; S.face = Math.atan2(tgt[1] - S.y, tgt[0] - S.x); }
  }

  // 深夜的貨箱：入夜、巡邏的守衛、一次搬一箱
  const nightOn = () => stageOf("carry").length > 0;
  const carryQ = () => stageOf("carry")[0] || null;
  const guards = (QD.guards || []).map((g) => ({ ...g, x: g.points[0][0], y: g.points[0][1], i: 1, face: 0 }));
  function updateNight(dt) {
    const q = carryQ();
    if (!q) return;
    const d = qd(q.id), st = q.st;
    d.delivered = d.delivered || 0;
    // 第一次入夜時把巡邏路線改成繞過建築物的路
    for (const g of guards) if (!g.routed) {
      g.routed = true;
      const pts = [], P = g.points;
      for (let k = 0; k < P.length; k++) {
        const a = { x: P[k][0], y: P[k][1] }, b = { x: P[(k + 1) % P.length][0], y: P[(k + 1) % P.length][1] };
        pts.push([a.x, a.y]);
        for (const w of findPath(a, b) || []) pts.push([w.x, w.y]);
      }
      g.points = pts; g.i = 1 % pts.length;
    }
    for (const g of guards) {
      const tgt = g.points[g.i], dd = dist(g.x, g.y, tgt[0], tgt[1]), sp = g.speed * dt;
      g.face = Math.atan2(tgt[1] - g.y, tgt[0] - g.x);
      if (dd <= sp) { g.x = tgt[0]; g.y = tgt[1]; g.i = (g.i + 1) % g.points.length; }
      else { g.x += ((tgt[0] - g.x) / dd) * sp; g.y += ((tgt[1] - g.y) / dd) * sp; }
      // 搬著貨箱被看到：委託失敗
      if (d.carrying) {
        const S = QD.guardSight, gd = dist(g.x, g.y, me.x, me.y);
        let da = Math.abs(Math.atan2(me.y - g.y, me.x - g.x) - g.face);
        if (da > Math.PI) da = Math.PI * 2 - da;
        if (gd < S.r && da < S.half) {
          d.carrying = false;
          me.target = null;
          CM.fail(trip, q.id);
          save(); renderHud();
          openPanel("被發現了", `<p class="wx-p">巡邏守衛的燈照了過來——「站住！那箱子是哪來的？」你只好丟下貨箱跑掉。</p>
            <p class="tv-note">委託「${esc(CM.get(q.id).title)}」失敗：回酒館時只照進度拿時空幣，這輪冒險也不能再接。</p>`);
          return;
        }
      }
    }
    // 拿箱子
    if (!d.carrying && d.delivered < st.n && dist(me.x, me.y, st.from.x, st.from.y) < 70) {
      if (!d.asked) { d.asked = true; save(); return openPeek(q.id); }
      d.carrying = true; save(); toast(`扛起了第 ${d.delivered + 1} 個貨箱（移動變慢、不能用技能）`);
    }
    // 放下箱子
    const to = d.alt ? st.alt : st.to;
    if (d.carrying && dist(me.x, me.y, to.x, to.y) < 80) {
      d.carrying = false; d.delivered++;
      if (d.delivered >= st.n) {
        CM.advance(trip, q.id);
        if (!d.alt) { trip.flags = { ...(trip.flags || {}), blackfin: "helped" }; toast("三個貨箱都搬完了。棧橋的木樁上多了一袋沉甸甸的錢——委託完成"); }
        else { trip.flags = { ...(trip.flags || {}), blackfin: "betrayed" }; toast("老伯恩：「這、這是我們的網子！……謝謝你。」——委託完成（改還給老伯恩）"); }
      } else toast(`放下了貨箱（${d.delivered} / ${st.n}），回倉庫搬下一箱`);
      save();
    }
  }
  function openPeek(id) {
    openPanel("用油布蓋住的貨箱", `<p class="wx-p">貨箱比想像中輕，裡面傳來一股魚腥味。紙條上寫著「別打開」。</p>
      <div class="tv-row"><button type="button" class="ghost" data-act="peek" data-id="${id}">偷看箱子</button><button type="button" class="primary" data-act="nopeek" data-id="${id}">不看，直接搬</button></div>`);
  }
  const stText = (id, st) => HOOK.stageText?.(id, st) || st?.text || "";
  const zoneOf = (n) => ({ x: n.x, y: n.y + (n.zdy ?? MAP.zone.dy), r: MAP.zone.r });
  const inZone = (n) => { const z = zoneOf(n); return dist(me.x, me.y, z.x, z.y) <= z.r; };
  const spotArmed = new Set();     // 走進範圍會自動打開一次；離開再回來才會再開

  // ===== 更新 =====
  function step(dx, dy) {
    let moved = false;
    if (dx && !blocked(me.x + dx, me.y, me.half)) { me.x += dx; moved = true; }
    if (dy && !blocked(me.x, me.y + dy, me.half)) { me.y += dy; moved = true; }
    return moved;
  }
  let saveTimer = 0;
  function update(dt, now) {
    if (busy) return;
    updateEnemies(dt);
    updateFolk(dt);
    if (charging) {
      if (now - charging.start >= charging.dur) finishSense();
    } else if (me.target) {
      const wp = !me.then?.follow && me.path?.length ? me.path[0] : null;
      const tg = me.then?.follow ? { x: me.then.follow.x, y: me.then.follow.y } : wp || me.target;
      const d = dist(me.x, me.y, tg.x, tg.y);
      const reach = wp ? 6 : me.then?.reach || 3;
      if (wp && d <= reach) me.path.shift();
      else if (d <= reach) arrive();
      else {
        const s = Math.min(d - reach + 1, me.speed * dt * (carrying() ? 0.55 : 1) * (HOOK.speedMul?.() || 1));
        const ok = step(((tg.x - me.x) / d) * s, ((tg.y - me.y) / d) * s);
        me.stuck = ok ? 0 : me.stuck + dt;
        if (me.stuck > 0.3) { me.target = null; me.then = null; me.stuck = 0; }
      }
    }
    // 撞到魔物：遇襲（剛撤退回來的幾秒內不會）
    if (Date.now() > (run.grace || 0)) for (const e of enemies) if (dist(me.x, me.y, e.x, e.y) < e.r + me.half) return battle(e, -2);
    // 陷阱
    for (const t of MAP.traps) {
      if (run.traps.includes(t.id) || dist(me.x, me.y, t.x, t.y) > 26) continue;
      run.traps.push(t.id);
      const dmg = Math.max(1, Math.round(maxHp() * MAP.trapDamage));
      run.hp = Math.max(1, run.hp - dmg);
      fx.push({ k: "num", x: me.x, y: me.y - 40, text: `-${dmg}`, color: "#e53935", t: now, dur: 1000 });
      fx.push({ k: "trap", x: t.x, y: t.y, t: now, dur: 900 });
      toast(`踩到陷阱了！失去 ${dmg} 點生命`);
      save();
    }
    // 撿東西
    for (const p of MAP.pickups) {
      if (run.picked.includes(p.id) || dist(me.x, me.y, p.x, p.y) > 30) continue;
      if (p.item) {
        if (!BAG.add(run.items, p.item, 1)) { if (!p.full) { toast("行囊滿了"); p.full = true; } continue; }
        toast(`撿到 ${BAG.get(p.item).name}`);
      } else { run.gold += p.gold; toast(`撿到 ${p.gold} 金幣`); }
      run.picked.push(p.id);
      save();
    }
    // 海盜相關的委託：跟蹤、深夜搬運、走近線索
    updateTail(dt);
    updateNight(dt);
    if (busy) return;
    HOOK.update?.(dt, now);
    if (busy) return;
    for (const q of stageOf("clues")) for (const c of cluesOf(q.id, q.st)) if (!c.found && !c.shown && dist(me.x, me.y, c.x, c.y) < 70) { c.shown = true; save(); openClue(q.id, c); return; }
    // 委託的地點：走進去就打開
    for (const s of questSpots()) {
      const d = dist(me.x, me.y, s.x, s.y), key = s.id + ":" + CM.progressOf(trip, s.id);
      if (d < 125 && !spotArmed.has(key)) { spotArmed.add(key); openSpot(s); return; }
      if (d > 200) spotArmed.delete(key);
    }
    saveTimer += dt;
    if (saveTimer > 1) { saveTimer = 0; run.pos = { x: Math.round(me.x), y: Math.round(me.y) }; save(); }
  }
  function arrive() {
    const then = me.then;
    me.target = null; me.then = null; me.stuck = 0;
    if (!then) return;
    if (then.type === "attack") attack(then.enemy);
    else if (then.type === "npc") talk(then.npc);
    else if (then.type === "shop") openShop(then.shop);
    else if (then.type === "spot") openSpot(then.spot);
    else if (then.type === "portal") openPortal();
    else if (then.type === "hook") then.fn();
    else if (then.type === "stall") openStall(then.si);
    else if (then.type === "folk") askFolk(then.folk);
  }

  // ===== 戰鬥 =====
  function go(url, label, ambush) {
    busy = true;
    run.pos = { x: Math.round(me.x), y: Math.round(me.y) };
    save();
    sfx(MAP.encounterSound || "sounds/encounter.mp3");
    bgm?.pause();
    $("#wxFadeText").textContent = label;
    $("#wxFade").classList.toggle("ambush", !!ambush);
    $("#wxFade").classList.toggle("scare", SCARE);
    $("#wxFade").classList.remove("hidden");
    setTimeout(() => { location.href = url; }, 900);
  }
  const base = () => `battle.html?char=${encodeURIComponent(CH.id)}&from=world`;
  function battle(e, init) {
    if (busy) return;
    // 遇襲的話往後退一點，回來時不會馬上又撞上
    if (init < 0) {
      const d = dist(me.x, me.y, e.x, e.y) || 1, x = Math.round(me.x + ((me.x - e.x) / d) * 70), y = Math.round(me.y + ((me.y - e.y) / d) * 70);
      if (!blocked(x, y, me.half)) { me.x = x; me.y = y; }
    }
    go(`${base()}&room=${MAP.battleRoom || "encounter"}&boss=${encodeURIComponent(e.kind)}&enc=${encodeURIComponent(e.id)}&init=${init}${outside(e.x) ? "&out=1" : ""}`, init > 0 ? (SCARE ? "嚇唬！" : "迎戰！") : SCARE ? "被嚇到！" : "遇襲！", init < 0);
  }
  // 地圖上突然冒出來的戰鬥（例如旅館樓梯跳出來的幽靈扮演者）：一律算遇襲
  function ambushBattle(variant) {
    if (busy) return;
    go(`${base()}&room=${MAP.battleRoom || "encounter"}&boss=${encodeURIComponent(variant)}&init=-2`, SCARE ? "被嚇到！" : "遇襲！", true);
  }
  // 換場景：記住位置、重新載入這一頁
  function changeScene(scene, pos, label) {
    if (busy) return;
    busy = true;
    trip.scene = scene || null;
    run.pos = { x: pos.x, y: pos.y };
    save();
    bgm?.pause();
    $("#wxFadeText").textContent = label || "";
    $("#wxFade").classList.remove("ambush", "scare");
    $("#wxFade").classList.remove("hidden");
    setTimeout(() => location.reload(), 500);
  }
  function questBattle(s) {
    if (s.st.type === "escort") go(`${base()}&room=escort&quest=${encodeURIComponent(s.id)}&out=1`, "護送開始！");
    else if (s.st.room) go(`${base()}&room=${encodeURIComponent(s.st.room)}&quest=${encodeURIComponent(s.id)}`, "突襲！");
    else go(`${base()}&room=encounter&boss=${encodeURIComponent(s.st.variant)}&quest=${encodeURIComponent(s.id)}&init=0&out=1`, "迎戰！");
  }
  function attack(e) {
    if (!enemies.includes(e)) return;
    if (dist(me.x, me.y, e.x, e.y) - e.r > FIELD.basicRange) { goTo({ x: e.x, y: e.y }, { type: "attack", enemy: e, follow: e, reach: FIELD.basicRange + e.r - 4 }); return; }
    fx.push({ k: "swing", x: me.x, y: me.y, a: Math.atan2(e.y - me.y, e.x - me.x), t: performance.now(), dur: 300 });
    battle(e, +3);
  }

  // ===== Q：地圖探索技能 =====
  const Q = FIELD.q;
  const cdLeft = () => Math.max(0, ((run.cd.q || 0) - Date.now()) / 1000);
  function pressQ() {
    if (!Q || busy) return;
    if (carrying()) return toast("扛著貨箱沒辦法用技能");
    if (cdLeft() > 0) return toast(`${Q.name} 冷卻中（${Math.ceil(cdLeft())} 秒）`);
    if (Q.type === "sense") { me.target = null; charging = { start: performance.now(), dur: Q.charge * 1000 }; return; }
    if (Q.type === "luck") {
      // 觀知命：占卜一個吉卦，一段時間內好事比較容易、壞事比較不容易
      startCd();
      run.luckUntil = Date.now() + Q.duration * 1000; save();
      sfx(Q.sound);
      fx.push({ k: "luck", x: me.x, y: me.y, t: performance.now(), dur: 1200 });
      toast(`卜到吉卦：${Q.duration} 秒內好事比較容易發生、壞事比較不容易發生`);
      renderHud();
      return;
    }
    aiming = !aiming;
    if (aiming) toast(Q.type === "arrow" ? "點選射箭的方向" : Q.type === "jet" ? "點選噴射的方向" : "點選拋出蘑菇的位置（點自己＝治療自己）");
  }
  function startCd() { run.cd.q = Date.now() + Q.cd * 1000; save(); }
  function useQ(p) {
    aiming = false;
    if (Q.type === "jet") {
      // 霍夫曼：朝方向短距離噴射，可以跨過矮牆；落地的位置不能卡在任何東西裡
      const a = Math.atan2(p.y - me.y, p.x - me.x), low = (x, y) => MAP.lowWalls.some((r) => rectHit(r, x, y, me.half));
      let land = null;
      for (let s = 8; s <= Q.dist; s += 8) {
        const x = me.x + Math.cos(a) * s, y = me.y + Math.sin(a) * s;
        if (blocked(x, y, me.half) && !low(x, y)) break;
        if (!blocked(x, y, me.half)) land = { x, y };
      }
      if (!land) return toast("前面被擋住了，噴不過去");
      sfx(Q.sound);
      startCd();
      fx.push({ k: "jet", x: me.x, y: me.y, x2: land.x, y2: land.y, t: performance.now(), dur: 500 });
      me.x = land.x; me.y = land.y; me.target = null; me.then = null;
      save();
      return;
    }
    if (Q.type === "arrow") {
      const a = Math.atan2(p.y - me.y, p.x - me.x);
      sfx(Q.sound);
      fx.push({ k: "arrow", x: me.x, y: me.y, a, len: Q.range, t: performance.now(), dur: (Q.range / Q.speed) * 1000 });
      const f = fx[fx.length - 1];
      startCd();
      // 箭的路線上第一隻魔物：射中就迎戰
      let best = null, bt = Q.range;
      for (const e of enemies) {
        const t = R.geo.rayCircle(me.x, me.y, Math.cos(a), Math.sin(a), e.x, e.y, e.r);
        if (t !== null && t < bt) { best = e; bt = t; }
      }
      // 被牆、建築擋住
      for (let s = 20; s < bt; s += 12) if (blocked(me.x + Math.cos(a) * s, me.y + Math.sin(a) * s, 2)) { best = null; bt = s; break; }
      f.len = bt;
      f.dur = (bt / Q.speed) * 1000;
      if (best) setTimeout(() => battle(best, +3), f.dur);
      return;
    }
    if (Q.type === "heal") {
      const d = dist(me.x, me.y, p.x, p.y);
      const tp = d > Q.range ? { x: me.x + ((p.x - me.x) / d) * Q.range, y: me.y + ((p.y - me.y) / d) * Q.range } : p;
      sfx(Q.sound);
      fx.push({ k: "toss", fx: me.x, fy: me.y, x: tp.x, y: tp.y, t: performance.now(), dur: 450 });
      startCd();
      setTimeout(() => {
        if (dist(me.x, me.y, tp.x, tp.y) <= me.half + 30) { say(Q.self); heal(Math.round(maxHp() * Q.heal), "吃下蘑菇"); }
        else toast("蘑菇滾走了……（隊友在旁邊時可以治療隊友，多人遊戲之後開放）");
      }, 460);
    }
  }
  function finishSense() {
    charging = null;
    startCd();
    const danger = enemies.some((e) => dist(me.x, me.y, e.x, e.y) <= Q.radius) ||
      MAP.traps.some((t) => !run.traps.includes(t.id) && dist(me.x, me.y, t.x, t.y) <= Q.radius);
    sfx(Q.sound);
    fx.push({ k: "sense", x: me.x, y: me.y, r: Q.radius, danger, t: performance.now(), dur: 900 });
    say(danger ? Q.yes : Q.no, 2600);
    // 疑心病也能察覺海盜留下的痕跡
    let n = 0;
    for (const q of stageOf("clues")) for (const c of cluesOf(q.id, q.st)) if (!c.found && !c.shown && dist(me.x, me.y, c.x, c.y) <= Q.radius) { c.shown = true; n++; }
    if (n) { save(); setTimeout(() => toast(`附近有 ${n} 處可疑的痕跡（已標在地圖上）`), 900); }
  }
  function say(t, dur = 2200) { bubble = { text: t, t: performance.now(), dur }; }

  // ===== 委託人：開始、回報委託 =====
  const npcQuests = (n) => (n.quests || []).filter((id) => trip.accepted.includes(id));
  const npcActive = (n) => !run.scared && npcQuests(n).some((id) => {
    const st = CM.stage(trip, id);
    return (st && (st.type === "talk" || st.type === "report") && st.npc === n.id) || (CM.get(id).wip && !trip.done.includes(id));
  });
  function talk(n) {
    if (run.scared) {
      if (dist(me.x, me.y, n.x, n.y) > 120) { goTo({ x: n.x, y: n.y + (n.zdy ?? MAP.zone.dy) }, { type: "npc", npc: n, reach: 30 }); return; }
      openPanel(n.name, `<p class="wx-p">你抖得連話都說不清楚……這一趟的委託都失敗了，先從酒館的門回去吧。</p>`);
      return;
    }
    if (HOOK.talk?.(n)) return;
    // 判定框：所有玩家都要站進委託人面前的圓圈（目前單人）
    if (npcActive(n) && !inZone(n)) { goTo(zoneOf(n), { type: "npc", npc: n, reach: 10 }); return; }
    if (!npcActive(n) && dist(me.x, me.y, n.x, n.y) > 90) { goTo({ x: n.x, y: n.y + (n.zdy ?? MAP.zone.dy) }, { type: "npc", npc: n, reach: 30 }); return; }
    const line = n.lines[Math.floor(Math.random() * n.lines.length)];
    let html = `<div class="tv-npc"><span class="face" style="border-color:${n.color};color:${n.color}">${esc(n.name[0])}</span><p>${esc(line)}</p></div>`;
    const qs = npcQuests(n);
    if (qs.length) html += `<p class="tv-note">判定框內的玩家：1 / 1（多人時要全員站進委託人面前的圓圈才能進行劇情）</p>`;
    for (const id of qs) {
      const c = CM.get(id), st = CM.stage(trip, id), k = CM.progressOf(trip, id), n0 = CM.steps(c), done = k >= n0;
      html += `<div class="wx-qrow"><b>${esc(c.title)}</b>`;
      if (done) html += `<span class="ok">已完成</span>`;
      else if (c.wip) html += `<span>玩法設計中（進度 ${k} / ${n0}）</span><button type="button" class="ghost" data-act="step" data-id="${id}">（測試）推進</button>`;
      else if (st && (st.type === "talk" || st.type === "report") && st.npc === n.id) {
        const need = st.take && !BAG.count(run.items, st.take);
        html += need ? `<span class="warn">還沒有帶來${esc(BAG.get(st.take).name)}</span>`
          : `<button type="button" class="primary" data-act="story" data-id="${id}">${st.type === "talk" ? "聽聽委託內容" : "回報"}</button>`;
      } else html += `<span>目前：${esc(st?.text || "")}</span>`;
      html += `</div>`;
    }
    // 角色專屬的對話選項（n.asks[角色 id] = [{ q: 角色說的話, a: NPC 的回答 }]）
    const asks = n.asks?.[CH.id] || [];
    if (asks.length) html += `<div class="wx-asks">${asks.map((x, i) => `<button type="button" class="ghost" data-act="ask" data-i="${i}">${esc(CH.name)}：${esc(x.q)}</button>`).join("")}</div>`;
    // 歐文：完成「草原的怪異樹莓」後，可以借樹莓去釣魚
    if (n.id === "owen") {
      const adv = R.Adventure.get(), fishing = trip.accepted.includes("CI00001-08") && !trip.done.includes("CI00001-08");
      const berryDone = trip.done.includes("CI00001-07") || adv?.done?.includes("CI00001-07");
      if (fishing && berryDone) {
        html += BAG.count(run.items, "baitBerry")
          ? `<p class="tv-note">歐文：「樹莓已經借你了，小心點用。」</p>`
          : `<div class="wx-qrow"><b>借用怪異樹莓</b><span>歐文：「拿去當魚餌？……好吧，總比讓它流到市面上好。」</span><button type="button" class="primary" data-act="borrow">借一顆</button></div>`;
      }
    }
    openPanel(n.name, html);
    panel.dataset.npc = n.id;
  }
  // 劇情：一句一句顯示，最後推進委託
  let storyNext = () => {}, storyEnd = () => {};
  function story(id) {
    const c = CM.get(id), st = CM.stage(trip, id), n = MAP.npcs.find((x) => x.id === st.npc) || {};
    let i = 0;
    const show = () => {
      const last = i >= st.lines.length - 1;
      $("#wxPanelBody").innerHTML = `<div class="tv-npc"><span class="face" style="border-color:${n.color};color:${n.color}">${esc((n.name || "?")[0])}</span><p>${esc(st.lines[i])}</p></div>
        <div class="tv-row"><button type="button" class="primary" data-act="${last ? "storyEnd" : "storyNext"}" data-id="${id}">${last ? (st.type === "talk" ? "接下這件事" : "收下報酬") : "繼續"}</button></div>`;
      panel.querySelector("[data-act]")?.focus();
    };
    storyNext = () => { i++; show(); };
    storyEnd = () => {
      if (st.take) BAG.remove(run.items, st.take, 1);
      const fin = CM.advance(trip, id);
      save();
      closePanel();
      if (fin) toast(`委託「${c.title}」完成！`);
      else toast(`「${c.title}」：${CM.stage(trip, id).text}`);
    };
    show();
  }

  // 委託地點（車隊會合點、果樹）
  function openSpot(s) {
    const st = s.st, c = CM.get(s.id);
    me.target = null;
    if (st.type === "fish") {
      // 選魚餌：行囊裡能當餌的東西
      const baits = ["wolfMeat", "slimeGel", "baitBerry"].filter((id) => BAG.count(run.items, id));
      openPanel("北碼頭・老伯恩的漁船", `<div class="tv-npc"><span class="face" style="border-color:#3f6f8f;color:#3f6f8f">伯</span><p>上船吧！餌掛好了就出海。只釣一次，釣到什麼我就照行情收購什麼。</p></div>
        <p class="tv-note">選一個魚餌（會用掉一個）：</p>
        <div class="shop">${baits.map((id) => `<div class="shop-row">${BAG.icon(id)}<span><b>${esc(BAG.get(id).name)} ×${BAG.count(run.items, id)}</b><small>${esc(R.Fishing.odds(id))}</small></span>
          <button type="button" class="primary" data-act="fish" data-id="${s.id}" data-bait="${id}">用這個出海</button></div>`).join("")}
          <div class="shop-row"><i class="bag-ic" style="--ic:#c9c3b6"></i><span><b>空鉤</b><small>${esc(R.Fishing.odds(null))}</small></span>
          <button type="button" class="ghost" data-act="fish" data-id="${s.id}" data-bait="">不用餌出海</button></div></div>
        <p class="tv-note">魔狼的肉：稀有的魚比較容易上鉤・黏液：稀有的非魚類比較容易上鉤${CM.ofWorld(trip.world).some((x) => x.id === "CI00001-07") ? "・怪異樹莓：完成「草原的怪異樹莓」後可以向歐文借" : ""}</p>`);
      return;
    }
    if (st.type === "clue") return openClue(s.id, s.clue);
    if (st.type === "spot") {
      openPanel("北碼頭倉庫", `${(st.lines || []).map((l) => `<p class="wx-p">${esc(l)}</p>`).join("")}
        <p class="tv-note">委託「${esc(c.title)}」：一次搬一箱，扛著貨箱時移動變慢、不能用技能。被巡邏守衛的燈照到，委託就失敗了。</p>
        <div class="tv-row"><button type="button" class="primary" data-act="spotGo" data-id="${s.id}">開始搬運</button><button type="button" class="ghost" data-close>等一下</button></div>`);
      return;
    }
    if (st.type === "pick") {
      openPanel("草原深處的果樹", `<p class="wx-p">果樹的枝頭掛著一串串泛著紫光的樹莓。</p>
        <div class="tv-row"><button type="button" class="primary" data-act="pick" data-id="${s.id}">摘下一顆${esc(BAG.get(st.item).name)}</button></div>`);
      return;
    }
    openPanel(st.type === "escort" ? "東門外的車隊" : st.room === "pirates" ? "北碼頭・老伯恩的漁船" : "草原深處的果樹", `${(st.lines || []).map((l) => `<p class="wx-p">${esc(l)}</p>`).join("")}
      <p class="tv-note">委託「${esc(c.title)}」：${esc(st.text)}${st.type === "escort" ? `<br>護送戰：沒有回合，行動點每 1.5 秒 +1。時間內打倒所有魔狼，至少保住 2 輛馬車` : ""}</p>
      <div class="tv-row"><button type="button" class="primary" data-act="qbattle" data-id="${s.id}">${st.type === "escort" ? "開始護送" : st.room === "pirates" ? "出海突襲" : "迎戰"}</button><button type="button" class="ghost" data-close>先不要</button></div>`);
  }

  // ===== 商店 =====
  function shopUnlocked() {
    const adv = R.Adventure.get();
    return CM.ofWorld(trip.world).some((c) => trip.done.includes(c.id) || adv?.done?.includes(c.id));
  }
  let shopTab = "buy";
  function openShop(s) {
    if (dist(me.x, me.y, s.x, s.y) > 80) { goTo({ x: s.x, y: s.y + 50 }, { type: "shop", shop: s, reach: 12 }); return; }
    const unlocked = shopUnlocked();
    const build = R.Progress.load(CH.id);
    const treasures = Object.values(R.Items.LIST).filter((t) => t.shop === s.id);
    let body = `<div class="tv-npc"><span class="face" style="border-color:${s.color};color:${s.color}">店</span><p>${esc(s.greet)}</p></div>
      <div class="tabs" role="tablist"><button type="button" class="tab${shopTab === "buy" ? " on" : ""}" data-act="shopTab" data-t="buy" data-shop="${s.id}">買</button><button type="button" class="tab${shopTab === "sell" ? " on" : ""}" data-act="shopTab" data-t="sell" data-shop="${s.id}">賣</button></div>
      <p class="tv-note">金幣：<b>${run.gold}</b>・行囊 ${run.items.length} / ${BAG.SIZE} 格</p><div class="shop">`;
    if (shopTab === "buy") {
      for (const id of MAP.potions) {
        const it = BAG.get(id);
        body += `<div class="shop-row">${BAG.icon(id)}<span><b>${esc(it.name)}</b><small>${esc(it.desc)}</small></span><em>${it.price} 金幣</em>
          <button type="button" class="primary" data-act="buy" data-id="${id}" data-shop="${s.id}" ${run.gold < it.price ? "disabled" : ""}>買</button></div>`;
      }
      for (const t of treasures) {
        const own = (build.items || []).includes(t.id), full = (build.items || []).length >= R.Items.SLOTS;
        body += `<div class="shop-row treasure${unlocked ? "" : " locked"}">${R.Items.slotHtml(t.id)}<span><b>${esc(t.name)}</b><small>【${R.Items.RARITY[t.rarity].name}】${esc(t.desc)}</small></span><em>${t.price} 金幣</em>
          ${!unlocked ? `<span class="lock">完成委託後開放</span>` : own ? `<span class="lock">已擁有</span>` : `<button type="button" class="primary" data-act="buyT" data-id="${t.id}" data-shop="${s.id}" ${run.gold < t.price || full ? "disabled" : ""}>買</button>`}</div>`;
      }
    } else {
      const sellable = [...new Set(run.items.map((x) => x.id))].filter((id) => BAG.get(id)?.sell && !BAG.get(id).quest);
      if (!sellable.length) body += `<p class="wx-p">沒有可以賣的東西。打倒魔物會掉落素材（黏液、魔狼的牙、魔狼的肉）。</p>`;
      for (const id of sellable) {
        const it = BAG.get(id), n = BAG.count(run.items, id);
        body += `<div class="shop-row">${BAG.icon(id)}<span><b>${esc(it.name)} ×${n}</b><small>${esc(it.desc)}</small></span><em>${it.sell} 金幣</em>
          <button type="button" class="ghost" data-act="sell" data-id="${id}" data-shop="${s.id}">賣 1 個</button><button type="button" class="ghost" data-act="sellAll" data-id="${id}" data-shop="${s.id}">全部</button></div>`;
      }
    }
    body += `</div>`;
    openPanel(s.name, body);
  }

  // ===== 酒館的門 =====
  function openPortal() {
    const left = trip.accepted.filter((x) => !trip.done.includes(x));
    if (run.scared) {
      openPanel("酒館的門", `<p class="wx-p">你還在發抖。這一趟的委託沒辦法再繼續了。</p>
        ${left.length ? `<p class="tv-note">沒完成的委託（${left.map((id) => esc(CM.get(id).title)).join("、")}）都算失敗：只能照進度拿時空幣，這輪冒險也不能再接。</p>` : ""}
        <div class="tv-row"><button type="button" class="primary" data-act="return">回到酒館結算</button></div>`);
      return;
    }
    if (left.length) {
      openPanel("酒館的門", `<p class="wx-p">門扉緊閉著。還有 ${left.length} 張委託沒有完成：</p><ul class="wx-list">${left.map((id) => `<li>${esc(CM.get(id).title)}<span class="muted">：${esc(CM.stage(trip, id)?.text || "（測試）推進")}</span></li>`).join("")}</ul>`);
      return;
    }
    openPanel("酒館的門", `<p class="wx-p">委託都完成了。門的另一邊傳來酒杯碰撞的聲音。</p>
      <p class="tv-note">金幣 ${run.gold} 和行囊裡的東西會跟著你回到酒館，下次出發時繼續帶著。</p>
      <div class="tv-row"><button type="button" class="primary" data-act="return">回到酒館</button></div>`);
  }
  function returnHome() {
    const st = CM.settle(trip, !!run.scared);
    P.addCoins(st.coins);
    if (st.xp && R.Progress) R.Progress.addXp(trip.char, st.xp);
    const rk = R.Adventure.finishTrip({ world: trip.world, done: trip.done, license: st.license, gold: run.gold, items: run.items, flags: trip.flags, failed: [...(run.scared ? trip.accepted.filter((x) => !trip.done.includes(x)) : []), ...(trip.failedQ || [])] });
    P.clearTrip();
    try { sessionStorage.setItem("rpg.lastReward", JSON.stringify({ coins: st.coins, xp: st.xp, license: st.license, world: W0.code + " " + W0.name, gold: run.gold, rank: rk, scared: !!run.scared, lines: run.scared || trip.failedQ?.length ? st.lines : undefined })); } catch (e) { /* 忽略 */ }
    location.href = "tavern.html";
  }

  // ===== 面板 =====
  const panel = $("#wxPanel");
  function openPanel(title, html) {
    busy = true; me.target = null;
    delete panel.dataset.npc;
    $("#wxPanelTitle").textContent = title;
    $("#wxPanelBody").innerHTML = html;
    panel.classList.remove("hidden");
    panel.querySelector("[data-close]").focus();
  }
  function closePanel() { panel.classList.add("hidden"); busy = false; renderHud(); }
  const shopById = (id) => MAP.shops.find((s) => s.id === id);
  panel.addEventListener("click", (e) => {
    if (e.target === panel || e.target.closest("[data-close]")) return closePanel();
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const a = b.dataset.act, id = b.dataset.id;
    if (HOOK.act?.(a, b)) return;
    if (a === "story") return story(id);
    if (a === "storyNext") return storyNext();
    if (a === "storyEnd") return storyEnd();
    if (a === "step" || a === "done") {
      const c = CM.get(id);
      if (a === "done") { while (!CM.advance(trip, id)); } else CM.advance(trip, id);
      save();
      toast(trip.done.includes(id) ? `委託「${c.title}」完成` : `「${c.title}」進度 ${CM.progressOf(trip, id)} / ${CM.steps(c)}`);
      if (panelTitle() === "委託") return openLog();
      const n = MAP.npcs.find((x) => x.id === panel.dataset.npc);
      return n ? talk(n) : closePanel();
    }
    if (a === "clue") {
      const q = stageOf("clues").find((x) => x.id === id), c = q && cluesOf(id, q.st).find((x) => x.i === Number(b.dataset.i));
      if (c && !c.found) {
        c.found = true; c.shown = true;
        const got = cluesOf(id, q.st).filter((x) => x.found).length;
        if (got >= q.st.need) { CM.advance(trip, id); toast(`找齊 ${q.st.need} 條線索了！線索都指向西岸的礁石——去北碼頭找老伯恩的船`); }
        else toast(`記下了線索（${got} / ${q.st.need}）`);
        save();
      }
      return closePanel();
    }
    if (a === "accuse") {
      const m = marketOf(id), si = Number(b.dataset.i);
      if (si === m.culprit) { CM.advance(trip, id); save(); closePanel(); return toast(`清單上的東西全在這裡！先別聲張——等${m.stalls[si].seller}收攤，跟上去看他把貨交給誰`); }
      m.wrong++; save(); closePanel();
      return toast(`冤枉好人了！那只是長得很像的東西……${m.stalls[si].seller}氣呼呼地瞪著你（指認錯誤 ${m.wrong} 次）`);
    }
    if (a === "spotGo") { CM.advance(trip, id); save(); closePanel(); return toast("夜深了……把三個貨箱搬到第七號棧橋，小心巡邏的守衛"); }
    if (a === "peek") {
      openPanel("箱子裡是……", `<p class="wx-p">掀開油布，箱子裡塞滿了漁網——每一張都綁著<b>漁會的木牌</b>。這是被海盜搶走的東西。</p>
        <div class="tv-row"><button type="button" class="ghost" data-act="peekChoice" data-id="${id}" data-c="deliver">還是照黑鰭說的送到棧橋</button><button type="button" class="primary" data-act="peekChoice" data-id="${id}" data-c="bern">拿去還給老伯恩</button></div>
        <p class="tv-note">還給老伯恩的話，就拿不到黑鰭的報酬（改成漁會的謝禮）。</p>`);
      return;
    }
    if (a === "nopeek" || a === "peekChoice") {
      const d = qd(id);
      if (b.dataset.c === "bern") { d.alt = "bern"; toast("決定把漁網還給老伯恩（搬到漁會前）"); }
      d.carrying = true; save(); closePanel();
      return toast(`扛起了第 ${(d.delivered || 0) + 1} 個貨箱（移動變慢、不能用技能）`);
    }
    if (a === "fish") {
      const bait = b.dataset.bait || null, qid = id;
      if (bait) BAG.remove(run.items, bait, 1);
      save();
      panel.classList.add("hidden");
      R.Fishing.start({
        host: $("#wxStage"), bait,
        onDone(r) {
          if (r.jelly) { go(`${base()}&room=jellyfish&quest=${encodeURIComponent(qid)}`, "迎戰！"); return; }
          run.gold += r.gold;
          CM.advance(trip, qid);
          save();
          busy = false;
          renderHud();
          toast(`釣到了${r.name}（${r.tierName}），得到 ${r.gold} 金幣。委託「${CM.get(qid).title}」完成！`);
        },
      });
      return;
    }
    if (a === "ask") {
      const n = MAP.npcs.find((x) => x.id === panel.dataset.npc), x = n?.asks?.[CH.id]?.[Number(b.dataset.i)];
      if (!x) return;
      say(x.q, 2600);
      openPanel(n.name, `<p class="wx-p" style="color:${CH.color};font-weight:700">${esc(CH.name)}：「${esc(x.q)}」</p>
        <div class="tv-npc"><span class="face" style="border-color:${n.color};color:${n.color}">${esc(n.name[0])}</span><p>${esc(x.a)}</p></div>
        <div class="tv-row"><button type="button" class="ghost" data-act="askBack">繼續聊</button></div>`);
      panel.dataset.npc = n.id;
      return;
    }
    if (a === "askBack") { const n = MAP.npcs.find((x) => x.id === panel.dataset.npc); if (n) talk(n); return; }
    if (a === "borrow") {
      if (!BAG.add(run.items, "baitBerry", 1)) return toast("行囊滿了");
      save(); toast("向歐文借了怪異樹莓（當魚餌）");
      return talk(MAP.npcs.find((x) => x.id === "owen"));
    }
    if (a === "qbattle") { const s = questSpots().find((x) => x.id === id); closePanel(); if (s) questBattle(s); return; }
    if (a === "pick") {
      const st = CM.stage(trip, id);
      if (!BAG.add(run.items, st.item, 1)) return toast("行囊滿了，先整理一下行囊");
      CM.advance(trip, id); save(); closePanel();
      return toast(`摘下了${BAG.get(st.item).name}。${CM.stage(trip, id)?.text || ""}`);
    }
    if (a === "return") return returnHome();
    if (a === "use") { useItem(run.items[Number(b.dataset.i)]?.id); return openBag(); }
    if (a === "shopTab") { shopTab = b.dataset.t; return openShop(shopById(b.dataset.shop)); }
    if (a === "buy") {
      const it = BAG.get(id);
      if (run.gold < it.price) return toast("金幣不夠");
      if (!BAG.add(run.items, id, 1)) return toast("行囊滿了");
      run.gold -= it.price; save(); toast(`買了${it.name}`);
      return openShop(shopById(b.dataset.shop));
    }
    if (a === "buyT") {
      const t = R.Items.get(id);
      if (run.gold < t.price) return toast("金幣不夠");
      const g = R.Items.give(CH.id, id);
      if (!g.ok) return toast(g.text);
      run.gold -= t.price; save(); toast(g.text);
      renderHud();
      return openShop(shopById(b.dataset.shop));
    }
    if (a === "sell" || a === "sellAll") {
      const it = BAG.get(id), n = a === "sell" ? 1 : BAG.count(run.items, id);
      const k = BAG.remove(run.items, id, n);
      run.gold += k * it.sell; save(); toast(`賣掉 ${it.name} ×${k}，得到 ${k * it.sell} 金幣`);
      return openShop(shopById(b.dataset.shop));
    }
  });
  const panelTitle = () => $("#wxPanelTitle").textContent;
  function openLog() {
    openPanel("委託", `<p class="tv-note" style="margin:0 0 10px">${esc(W0.code)} ${esc(W0.name)}：先到委託人面前的圓圈裡和他談，照委託做完之後再回去找他。委託全部完成後，回到抵達點的<b>酒館的門</b>就能回去。全員倒下的話冒險就會失敗，沒完成的委託只能照進度拿到部分時空幣。</p>
      <div class="wx-quests">${trip.accepted.map((id) => {
        const c = CM.get(id), done = trip.done.includes(id), k = CM.progressOf(trip, id), n = CM.steps(c), st = CM.stage(trip, id);
        const cnt = st?.type === "kill" ? `（${trip.qcount[id] || 0} / ${st.need}）` : "";
        return `<article class="slip${done ? " taken" : ""}" style="--wc:${W0.color}">
          <header><span class="stamp">${W0.code}</span><span class="wn">${esc(c.client)}</span>${done ? '<span class="got">完成</span>' : c.wip ? '<span class="got wip">玩法設計中</span>' : ""}</header>
          <h3>${esc(c.title)}</h3><p class="wx-p">${esc(c.content)}</p>
          <div class="wx-prog" aria-label="進度 ${k} / ${n}">${Array.from({ length: n }, (_, i) => `<i class="${i < k ? "on" : ""}"></i>`).join("")}<span>${done ? "完成" : st ? `下一步：${esc(stText(id, st))}${cnt}` : `進度 ${k} / ${n}`}</span></div>
          <footer><span class="rw">報酬：${esc(CM.rewardText(c.reward))}</span>${done ? "" : `<span><button type="button" class="ghost" data-act="step" data-id="${id}">（測試）推進</button> <button type="button" class="ghost" data-act="done" data-id="${id}">（測試）完成</button></span>`}</footer>
        </article>`;
      }).join("")}</div>`);
  }
  function openBag() {
    const slots = Array.from({ length: BAG.SIZE }, (_, i) => {
      const s = run.items[i];
      if (!s) return `<div class="bag-slot empty"></div>`;
      const it = BAG.get(s.id);
      const tip = `${it.name}：${it.desc}${it.field ? "（點一下使用）" : it.battle ? "（戰鬥中使用）" : ""}`;
      return `<button type="button" class="bag-slot${it.quest ? " quest" : ""}" data-act="use" data-i="${i}" title="${esc(tip)}">
        ${BAG.icon(s.id)}<span>${esc(it.name)}</span>${s.n > 1 ? `<b>×${s.n}</b>` : ""}</button>`;
    }).join("");
    const items = R.Progress.forBattle(CH).items || [];
    openPanel("行囊", `<p class="tv-note" style="margin:0 0 10px">任務道具、消耗品和素材放在這裡（${run.items.length} / ${BAG.SIZE} 格）。金幣：<b>${run.gold}</b>（這輪冒險都能用）</p><div class="bag">${slots}</div>
      <p class="tv-note" style="margin:12px 0 6px">寶物欄（這輪冒險）</p><div class="items">${Array.from({ length: R.Items.SLOTS }, (_, i) => R.Items.slotHtml(items[i])).join("")}</div>`);
  }

  // ===== 繪圖 =====
  const cv = $("#map"), ctx = cv.getContext("2d"), VW = 1280, VH = 720;
  const cam = { x: 0, y: 0 };
  function rr(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function text(t, x, y, color, size = 13, weight = 700) {
    ctx.font = `${weight} ${size}px "Noto Sans TC", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = color; ctx.fillText(t, x, y);
  }
  // 草地的紋理
  const grassPat = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"); g.fillStyle = "#a9cf86"; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = "#8fbc6c"; g.lineWidth = 1.5;
    for (const [x, y] of [[8, 12], [30, 6], [50, 20], [14, 40], [40, 44], [58, 56], [24, 58]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2, y - 6); g.lineTo(x + 4, y); g.stroke(); }
    return ctx.createPattern(c, "repeat");
  })();
  // 地圖上的魔狼（小）
  function wolfIcon(x, y, a, s, red) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2); ctx.scale(s, s);
    ctx.fillStyle = "rgba(0,0,0,.16)"; ctx.beginPath(); ctx.ellipse(2, 3, 10, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#767b92"; ctx.strokeStyle = red ? "#e53935" : "#4c5066"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 3, 8, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 3, -13); ctx.lineTo(sd * 8, -20); ctx.lineTo(sd * 7, -10); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(0, -11, 7, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#e53935"; ctx.beginPath(); ctx.arc(-3, -12, 1.5, 0, Math.PI * 2); ctx.arc(3, -12, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function marker(x, y, now, color) {
    const bob = Math.sin(now / 250) * 4;
    ctx.fillStyle = color; ctx.strokeStyle = "#5a3a00"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y - 60 + bob); ctx.lineTo(x + 12, y - 76 + bob); ctx.lineTo(x, y - 92 + bob); ctx.lineTo(x - 12, y - 76 + bob); ctx.closePath(); ctx.fill(); ctx.stroke();
    text("!", x, y - 76 + bob, "#5a3a00", 14, 900);
  }
  function drawMap(now) {
    const x0 = cam.x, y0 = cam.y;
    ctx.save(); ctx.translate(-x0, -y0);
    if (MAP.indoor) HOOK.drawFloor?.(now, x0, y0);
    else {
    // 地面
    ctx.fillStyle = "#e7dbbd"; ctx.fillRect(x0, y0, VW, VH);
    if (x0 + VW > MAP.wallX) { ctx.fillStyle = grassPat; ctx.fillRect(Math.max(x0, MAP.wallX), y0, VW, VH); }
    // 海（逐列畫海岸線）
    ctx.fillStyle = "#4f9cc7";
    ctx.beginPath(); ctx.moveTo(x0, y0);
    for (let y = y0; y <= y0 + VH + 20; y += 20) ctx.lineTo(MAP.shoreX(y), y);
    ctx.lineTo(x0, y0 + VH + 20); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#f2e6c4"; ctx.lineWidth = 10;
    ctx.beginPath(); for (let y = y0; y <= y0 + VH + 20; y += 20) { const x = MAP.shoreX(y) + 6; y === y0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 2;
    for (let y = Math.floor(y0 / 60) * 60; y < y0 + VH; y += 60) for (let x = Math.floor(x0 / 90) * 90; x < Math.min(x0 + VW, 760); x += 90) {
      const o = Math.sin(now / 700 + x * 0.05 + y * 0.03) * 8;
      ctx.beginPath(); ctx.moveTo(x + o, y); ctx.quadraticCurveTo(x + 15 + o, y - 6, x + 30 + o, y); ctx.stroke();
    }
    // 碼頭、市集平台
    for (const p of MAP.piers) {
      ctx.fillStyle = "#9a7650"; ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = "rgba(60,35,15,.4)"; ctx.lineWidth = 1;
      for (let x = p.x; x < p.x + p.w; x += 18) { ctx.beginPath(); ctx.moveTo(x, p.y); ctx.lineTo(x, p.y + p.h); ctx.stroke(); }
      ctx.strokeStyle = "#5a3a22"; ctx.lineWidth = 3; ctx.strokeRect(p.x, p.y, p.w, p.h);
      if (p.name) text(p.name, p.x + p.w / 2, p.y - 14, "#fff", 14, 900);
    }
    // 道路
    for (const r of MAP.roads) { ctx.fillStyle = r.dirt ? "#c9b07a" : r.plaza ? "#d8cba8" : "#d2c19d"; ctx.fillRect(r.x, r.y, r.w, r.h); }
    // 城牆
    for (const w of [wallTop, wallBot]) { ctx.fillStyle = "#8a7a64"; ctx.fillRect(w.x, w.y, w.w, w.h); }
    for (let y = 0; y < MAP.h; y += 160) if (y < MAP.gate.y1 - 40 || y > MAP.gate.y2) { ctx.fillStyle = "#6e604c"; ctx.fillRect(MAP.wallX - 8, y, MAP.wallW + 16, 40); }
    ctx.fillStyle = "#5a3a22"; ctx.fillRect(MAP.wallX - 12, MAP.gate.y1 - 20, MAP.wallW + 24, 20); ctx.fillRect(MAP.wallX - 12, MAP.gate.y2, MAP.wallW + 24, 20);
    text("東門", MAP.wallX + 20, MAP.gate.y1 - 34, "#3a2a1a", 14, 900);
    }
    // 建築、攤位
    for (const b of MAP.buildings) {
      if (b.x > x0 + VW || b.x + b.w < x0 || b.y > y0 + VH || b.y + b.h < y0) continue;
      ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(b.x + 8, b.y + 10, b.w, b.h);
      rr(b.x, b.y, b.w, b.h, 6); ctx.fillStyle = b.roof; ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fillRect(b.x, b.y, b.w, b.h / 2);
      ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(b.x, b.y + b.h / 2); ctx.lineTo(b.x + b.w, b.y + b.h / 2); ctx.stroke();
      if (b.name) { rr(b.x + b.w / 2 - 50, b.y + b.h / 2 - 13, 100, 26, 6); ctx.fillStyle = "rgba(255,250,240,.9)"; ctx.fill(); text(b.name, b.x + b.w / 2, b.y + b.h / 2, "#3a2a1a", 13, 900); }
    }
    for (const s of MAP.stalls) {
      ctx.fillStyle = "#c94848"; ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = "#fff"; for (let x = s.x; x < s.x + s.w; x += 18) ctx.fillRect(x, s.y, 9, s.h);
      ctx.strokeStyle = "#7a2a2a"; ctx.lineWidth = 2; ctx.strokeRect(s.x, s.y, s.w, s.h);
    }
    // 樹、石頭
    for (const t of MAP.trees) { ctx.fillStyle = "rgba(0,0,0,.15)"; ctx.beginPath(); ctx.ellipse(t.x + 6, t.y + 10, t.r, t.r * 0.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#4f8a3a"; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#64a04a"; ctx.beginPath(); ctx.arc(t.x - 8, t.y - 8, t.r * 0.55, 0, Math.PI * 2); ctx.fill(); }
    for (const r of MAP.rocks) { ctx.fillStyle = "#9a958a"; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#b8b3a6"; ctx.beginPath(); ctx.arc(r.x - 6, r.y - 6, r.r * 0.5, 0, Math.PI * 2); ctx.fill(); }
    // 傳聞的果樹：紫色的怪異樹莓
    if (MAP.fruitTree) {
      const t = MAP.fruitTree;
      ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(t.x + 8, t.y + 12, t.r * 1.2, t.r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#3f6a2c"; ctx.beginPath(); ctx.arc(t.x, t.y, t.r * 1.15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#4f7f36"; ctx.beginPath(); ctx.arc(t.x - 10, t.y - 10, t.r * 0.7, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.3, r = t.r * (0.35 + (i % 3) * 0.22); ctx.fillStyle = `rgba(170,90,230,${0.75 + 0.25 * Math.sin(now / 300 + i)})`; ctx.beginPath(); ctx.arc(t.x + Math.cos(a) * r, t.y + Math.sin(a) * r, 4.5, 0, Math.PI * 2); ctx.fill(); }
    }
    // 已經觸發的陷阱、可以撿的東西
    for (const t of MAP.traps) if (run.traps.includes(t.id)) { ctx.strokeStyle = "#6b5435"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(t.x, t.y, 14, 0, Math.PI * 2); ctx.stroke(); for (let i = 0; i < 6; i++) { const a = i * 1.05; ctx.beginPath(); ctx.moveTo(t.x + Math.cos(a) * 8, t.y + Math.sin(a) * 8); ctx.lineTo(t.x + Math.cos(a) * 18, t.y + Math.sin(a) * 18); ctx.stroke(); } }
    for (const p of MAP.pickups) {
      if (run.picked.includes(p.id)) continue;
      const bob = Math.sin(now / 300 + p.x) * 3;
      if (p.item) { ctx.fillStyle = BAG.get(p.item).color; ctx.beginPath(); ctx.ellipse(p.x, p.y + bob, 9, 13, 0.4, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#2e6b2e"; ctx.lineWidth = 2; ctx.stroke(); }
      else { ctx.fillStyle = "#d4a017"; ctx.beginPath(); ctx.arc(p.x, p.y + bob, 11, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#8a6a10"; ctx.lineWidth = 2; ctx.stroke(); text("$", p.x, p.y + bob + 1, "#fff", 12, 900); }
      ctx.strokeStyle = `rgba(255,255,255,${0.4 + 0.4 * Math.sin(now / 200)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y + bob, 18, 0, Math.PI * 2); ctx.stroke();
    }
    // 酒館的門（抵達點）
    const pt = MAP.portal, allDone = run.scared || trip.accepted.every((x) => trip.done.includes(x));
    if (pt) for (let i = 0; i < 3; i++) { ctx.strokeStyle = `hsla(${(now / 8 + i * 120) % 360},90%,${allDone ? 60 : 40}%,.8)`; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(pt.x, pt.y, 30 - i * 8, 40 - i * 10, Math.sin(now / 600 + i) * 0.3, 0, Math.PI * 2); ctx.stroke(); }
    if (pt) text(allDone ? "酒館的門（可以回去了）" : "酒館的門（委託完成才會打開）", pt.x, pt.y - 56, allDone ? "#2e7a46" : "#5a3a22", 12, 900);
    // 委託的地點：車隊、果樹的標記
    for (const s of questSpots()) {
      if (s.st.type === "escort") {
        for (let i = 0; i < 3; i++) {
          const x = s.x - 90 + i * 90, y = s.y;
          ctx.fillStyle = "rgba(0,0,0,.15)"; ctx.fillRect(x - 30, y + 6, 64, 10);
          ctx.fillStyle = "#9a6a3a"; ctx.fillRect(x - 32, y - 10, 64, 22); ctx.strokeStyle = "#5a3a1a"; ctx.lineWidth = 2; ctx.strokeRect(x - 32, y - 10, 64, 22);
          ctx.fillStyle = "#f2e6c4"; ctx.beginPath(); ctx.moveTo(x - 28, y - 10); ctx.quadraticCurveTo(x, y - 40, x + 28, y - 10); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#3a2a1a"; ctx.beginPath(); ctx.arc(x - 20, y + 14, 7, 0, Math.PI * 2); ctx.arc(x + 20, y + 14, 7, 0, Math.PI * 2); ctx.fill();
        }
        text("車隊", s.x, s.y + 38, "#3a2a1a", 13, 900);
      }
      marker(s.x, s.y - (s.st.type === "escort" ? 0 : 10), now, "#f2c200");
    }
    // 商店
    for (const s of MAP.shops) {
      rr(s.x - 16, s.y - 16, 32, 32, 7); ctx.fillStyle = "#fffaf0"; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = s.color; ctx.stroke();
      text("店", s.x, s.y + 1, s.color, 14, 900);
      rr(s.x - 34, s.y - 40, 68, 18, 9); ctx.fillStyle = "rgba(29,29,31,.72)"; ctx.fill();
      text(s.name, s.x, s.y - 31, "#ffe9a0", 11, 900);
    }
    // 鎮民
    for (const f of folk) {
      ctx.fillStyle = "rgba(0,0,0,.15)"; ctx.beginPath(); ctx.ellipse(f.x, f.y + 13, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
      rr(f.x - 11, f.y - 11, 22, 22, 6); ctx.fillStyle = "#fffaf0"; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = f.color; ctx.stroke();
      text("民", f.x, f.y + 1, f.color, 11, 900);
    }
    // 委託人：前面的圓形判定框
    for (const n of MAP.npcs) {
      const active = npcActive(n);
      if (active) {
        const z = zoneOf(n), inside = inZone(n);
        ctx.setLineDash([6, 5]); ctx.lineWidth = 2.5;
        ctx.strokeStyle = inside ? "rgba(46,158,91,.9)" : "rgba(242,194,0,.9)"; ctx.fillStyle = inside ? "rgba(46,158,91,.15)" : "rgba(242,194,0,.12)";
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
        text(inside ? "1 / 1" : "站進圓圈", z.x, z.y + z.r + 12, inside ? "#2e7a46" : "#7a5a00", 11, 900);
      }
      rr(n.x - 16, n.y - 16, 32, 32, 7); ctx.fillStyle = "#fff"; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = n.color; ctx.stroke();
      text(n.name[0], n.x, n.y + 1, n.color, 14, 900);
      text(n.name, n.x, n.y - 28, "#3a2a1a", 12, 700);
      if (active) { ctx.fillStyle = "#f2c200"; ctx.beginPath(); ctx.arc(n.x + 16, n.y - 16, 7, 0, Math.PI * 2); ctx.fill(); text("!", n.x + 16, n.y - 15, "#5a3a00", 10, 900); }
    }
    // 魔物
    for (const e of enemies) {
      const hov = hover === e, red = mode === "attack" || hov;
      if (isWolf(e.kind)) {
        const n = WOLF.packs[e.kind];
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + e.hx, ox = n > 1 ? Math.cos(a) * 16 : 0, oy = n > 1 ? Math.sin(a) * 12 : 0;
          wolfIcon(e.x + ox, e.y + oy + Math.sin(now / 120 + i) * (e.chasing ? 2 : 0.5), e.face, 0.9, red);
        }
        if (n > 2) text(`×${n}`, e.x + e.r, e.y - e.r, "#4c5066", 11, 900);
        continue;
      }
      ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(e.x, e.y + 20, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
      const sq = 1 + Math.sin(now / 250 + e.hx) * 0.06;
      ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r * sq, e.r / sq, 0, 0, Math.PI * 2); ctx.fillStyle = "#cfeccc"; ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = red ? "#e53935" : "#2bb24c"; ctx.stroke();
      ctx.fillStyle = "#1d1d1f"; ctx.beginPath(); ctx.arc(e.x - 8, e.y - 3, 3, 0, Math.PI * 2); ctx.arc(e.x + 8, e.y - 3, 3, 0, Math.PI * 2); ctx.fill();
      if (e.kind === "slimePack") text("×3", e.x + e.r, e.y - e.r, "#2e7a46", 11, 900);
    }
    // 特效
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i], k = (now - f.t) / f.dur;
      if (k >= 1) { fx.splice(i, 1); continue; }
      if (k < 0) continue;
      if (f.k === "num") { ctx.globalAlpha = 1 - k; text(f.text, f.x, f.y - k * 30, f.color, 18, 900); ctx.globalAlpha = 1; }
      if (f.k === "alert") { ctx.globalAlpha = 1 - k; text("!", f.e.x, f.e.y - 40 - k * 10, "#e53935", 26, 900); ctx.globalAlpha = 1; }
      if (f.k === "arrow") { const L = f.len * k; const x = f.x + Math.cos(f.a) * L, y = f.y + Math.sin(f.a) * L; ctx.strokeStyle = "#c2477a"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - Math.cos(f.a) * 26, y - Math.sin(f.a) * 26); ctx.lineTo(x, y); ctx.stroke(); }
      if (f.k === "toss") { const x = f.fx + (f.x - f.fx) * k, y = f.fy + (f.y - f.fy) * k - Math.sin(k * Math.PI) * 60; ctx.fillStyle = "#d64545"; ctx.beginPath(); ctx.arc(x, y, 8, Math.PI, 0); ctx.fill(); ctx.fillStyle = "#f4ead2"; ctx.fillRect(x - 3, y, 6, 7); }
      if (f.k === "luck") { ctx.strokeStyle = `rgba(212,160,23,${1 - k})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(f.x, f.y, 30 + 90 * k, 0, Math.PI * 2); ctx.stroke(); text("吉", f.x, f.y - 40 - 30 * k, `rgba(184,134,11,${1 - k})`, 22, 900); }
      if (f.k === "jet") { for (let i = 0; i < 6; i++) { const q = i / 5; ctx.fillStyle = `rgba(200,200,210,${(1 - k) * 0.5 * (1 - q)})`; ctx.beginPath(); ctx.arc(f.x + (f.x2 - f.x) * q, f.y + (f.y2 - f.y) * q, 16 - q * 8 + k * 10, 0, Math.PI * 2); ctx.fill(); } }
      if (f.k === "sense") { ctx.strokeStyle = f.danger ? `rgba(122,13,26,${1 - k})` : `rgba(75,63,143,${1 - k})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * k, 0, Math.PI * 2); ctx.stroke(); }
      if (f.k === "trap") { ctx.strokeStyle = `rgba(229,57,53,${1 - k})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(f.x, f.y, 20 + k * 30, 0, Math.PI * 2); ctx.stroke(); }
      if (f.k === "swing") { ctx.strokeStyle = `rgba(29,29,31,${1 - k})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(f.x, f.y, 40, f.a - 0.8, f.a - 0.8 + 1.6 * Math.min(1, k * 2)); ctx.stroke(); }
    }
    drawQuests(now);
    HOOK.draw?.(now);
    // 玩家
    drawMe(now);
    HOOK.drawTop?.(now);
    // Q 瞄準
    if (aiming && mouse) {
      ctx.setLineDash([6, 6]); ctx.strokeStyle = "rgba(29,29,31,.5)"; ctx.lineWidth = 2;
      if (Q.type === "arrow" || Q.type === "jet") { const a = Math.atan2(mouse.y - me.y, mouse.x - me.x), L = Q.range || Q.dist; ctx.beginPath(); ctx.moveTo(me.x, me.y); ctx.lineTo(me.x + Math.cos(a) * L, me.y + Math.sin(a) * L); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(me.x, me.y, Q.range, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 14, 0, Math.PI * 2); ctx.strokeStyle = "#d64545"; ctx.stroke(); }
      ctx.setLineDash([]);
    }
    if (mode === "attack") { ctx.setLineDash([4, 6]); ctx.strokeStyle = "rgba(229,57,53,.5)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(me.x, me.y, FIELD.basicRange + me.half, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    if (nightOn()) drawNight();
    if (me.target && !me.then?.follow) { ctx.strokeStyle = "rgba(29,29,31,.5)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(me.target.x, me.target.y, 6 + Math.sin(now / 120) * 2, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }
  // 海盜相關委託的畫面：線索的區域、攤位的標記、跟蹤的攤主、守衛、貨箱
  function drawQuests(now) {
    for (const q of stageOf("clues")) for (const c of cluesOf(q.id, q.st)) {
      if (c.hint && !c.shown && !c.found) {
        ctx.setLineDash([8, 7]); ctx.strokeStyle = "rgba(242,194,0,.85)"; ctx.lineWidth = 3; ctx.fillStyle = "rgba(242,194,0,.08)";
        ctx.beginPath(); ctx.arc(c.hint.x, c.hint.y, c.hint.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
        text("打聽到的區域", c.hint.x, c.hint.y - c.hint.r - 10, "#7a5a00", 12, 900);
      }
      if (c.shown && !c.found) { text("?", c.x, c.y - 30 + Math.sin(now / 250) * 3, "#c98a1a", 26, 900); ctx.strokeStyle = "rgba(201,138,26,.6)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c.x, c.y, 16, 0, Math.PI * 2); ctx.stroke(); }
    }
    if (stageOf("inspect").length) for (const t of MAP.stalls) text("?", t.x + t.w / 2, t.y - 12 + Math.sin(now / 300 + t.x) * 2, "#c98a1a", 18, 900);
    if (seller && seller.x != null) {
      const S = seller;
      rr(S.x - 13, S.y - 13, 26, 26, 6); ctx.fillStyle = "#fffaf0"; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = "#5a3a22"; ctx.stroke();
      text("攤", S.x, S.y + 1, "#5a3a22", 12, 900);
      text(S.looking > 0 ? "（回頭）" : S.going ? S.name : `${S.name}（還在攤位）`, S.x, S.y - 26, S.looking > 0 ? "#c62828" : "#3a2a1a", 12, 900);
      if (S.sus > 0) { ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(S.x - 20, S.y + 18, 40, 5); ctx.fillStyle = "#e53935"; ctx.fillRect(S.x - 20, S.y + 18, 40 * Math.min(1, S.sus), 5); }
      if (S.going) { ctx.setLineDash([3, 6]); ctx.strokeStyle = "rgba(90,58,34,.35)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(S.x, S.y, 90, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(S.x, S.y, 380, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    }
    const cq = carryQ();
    if (cq) {
      const d = qd(cq.id), st = cq.st, to = d.alt ? st.alt : st.to;
      for (let i = 0; i < st.n - (d.delivered || 0) - (d.carrying ? 1 : 0); i++) { ctx.fillStyle = "#8a6a3a"; ctx.fillRect(st.from.x - 40 + i * 28, st.from.y + 10, 24, 20); ctx.strokeStyle = "#4a3418"; ctx.lineWidth = 2; ctx.strokeRect(st.from.x - 40 + i * 28, st.from.y + 10, 24, 20); }
      marker(to.x, to.y + 40, now, "#f2c200");
      text(d.alt ? "還給老伯恩" : "第七號棧橋（放貨處）", to.x, to.y + 52, "#fff3c4", 12, 900);
      for (const g of guards) {
        const S = QD.guardSight;
        const lg = ctx.createRadialGradient(g.x, g.y, 10, g.x, g.y, S.r);
        lg.addColorStop(0, "rgba(255,230,140,.55)"); lg.addColorStop(1, "rgba(255,230,140,0)");
        ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.arc(g.x, g.y, S.r, g.face - S.half, g.face + S.half); ctx.closePath(); ctx.fill();
        rr(g.x - 12, g.y - 12, 24, 24, 6); ctx.fillStyle = "#e8eef8"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = "#2a3f6a"; ctx.stroke();
        text("守", g.x, g.y + 1, "#2a3f6a", 11, 900);
      }
    }
  }
  // 夜晚：整張地圖變暗，只有玩家身邊、守衛的燈看得清楚
  function drawNight() {
    const x0 = cam.x, y0 = cam.y;
    ctx.save();
    const g = ctx.createRadialGradient(me.x, me.y, 60, me.x, me.y, 260);
    g.addColorStop(0, "rgba(10,14,40,0)"); g.addColorStop(1, "rgba(10,14,40,.72)");
    ctx.fillStyle = g; ctx.fillRect(x0, y0, VW, VH);
    ctx.restore();
    // 扛著的貨箱、守衛的燈（畫在黑暗上面）
    const cq = carryQ();
    if (cq && qd(cq.id).carrying) { ctx.fillStyle = "#8a6a3a"; ctx.fillRect(me.x - 14, me.y - me.half - 52, 28, 20); ctx.strokeStyle = "#4a3418"; ctx.lineWidth = 2; ctx.strokeRect(me.x - 14, me.y - me.half - 52, 28, 20); }
    for (const gd of guards) { ctx.fillStyle = "rgba(255,220,120,.9)"; ctx.beginPath(); ctx.arc(gd.x + Math.cos(gd.face) * 16, gd.y + Math.sin(gd.face) * 16, 5, 0, Math.PI * 2); ctx.fill(); }
  }

  function drawMe(now) {
    if (run.scared) { ctx.save(); ctx.translate(Math.sin(now / 22) * 2.5, Math.cos(now / 31) * 1.2); drawMe0(now); ctx.restore(); text("發抖中……", me.x, me.y + me.half + 18, "#7a3fb0", 12, 900); return; }
    drawMe0(now);
  }
  function drawMe0(now) {
    const s = me.half * 2;
    if (Date.now() < (run.grace || 0) && Math.floor(now / 120) % 2) ctx.globalAlpha = 0.45;
    ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(me.x, me.y + me.half + 3, me.half, 5, 0, 0, Math.PI * 2); ctx.fill();
    const sc = CH.drawScale || 1, hs = me.half * sc;      // 霍夫曼的方塊比較大（只是畫面）
    rr(me.x - hs, me.y - hs, hs * 2, hs * 2, 7); ctx.fillStyle = "#fffaf0"; ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = CH.color; ctx.stroke();
    text(CH.letter || CH.name[0], me.x, me.y + 1, CH.color, Math.round(16 * sc), 900);
    if (Date.now() < (run.luckUntil || 0)) text("吉", me.x + hs + 10, me.y - hs, "#d4a017", 13, 900);
    ctx.globalAlpha = 1;
    const name = P.get()?.name || CH.name;
    ctx.font = '700 13px "Noto Sans TC", sans-serif';
    const w = ctx.measureText(name).width + 14;
    rr(me.x - w / 2, me.y - me.half - 28, w, 20, 10); ctx.fillStyle = "rgba(29,29,31,.75)"; ctx.fill();
    text(name, me.x, me.y - me.half - 18, "#fff", 13, 700);
    if (charging) {
      const k = Math.min(1, (now - charging.start) / charging.dur);
      ctx.strokeStyle = CH.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(me.x, me.y, 30, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke();
    }
    if (bubble && now - bubble.t < bubble.dur) {
      ctx.font = '700 14px "Noto Sans TC", sans-serif';
      const bw = ctx.measureText(bubble.text).width + 24, by = me.y - me.half - 64;
      rr(me.x - bw / 2, by - 16, bw, 32, 12); ctx.fillStyle = "#fff"; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = CH.color; ctx.stroke();
      text(bubble.text, me.x, by, "#1d1d1f", 14, 700);
    }
  }

  // 小地圖：整張地圖縮小，玩家、魔物、委託人、委託地點、酒館的門
  const mini = $("#mini"), mctx = mini.getContext("2d");
  const MS = Math.min(mini.width / MAP.w, mini.height / MAP.h);
  const miniBg = (() => {
    const c = document.createElement("canvas"); c.width = mini.width; c.height = mini.height;
    const g = c.getContext("2d");
    if (MAP.indoor) { g.fillStyle = "#2a2f3a"; g.fillRect(0, 0, c.width, c.height); g.fillStyle = "#cfd4dc"; for (const r of MAP.walk) g.fillRect(r.x * MS, r.y * MS, r.w * MS, r.h * MS); g.fillStyle = "#8a8f9a"; for (const r of MAP.solids) g.fillRect(r.x * MS, r.y * MS, Math.max(1, r.w * MS), Math.max(1, r.h * MS)); return c; }
    g.fillStyle = "#e7dbbd"; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#a9cf86"; g.fillRect(MAP.wallX * MS, 0, c.width, c.height);
    g.fillStyle = "#4f9cc7"; g.beginPath(); g.moveTo(0, 0); for (let y = 0; y <= MAP.h; y += 40) g.lineTo(MAP.shoreX(y) * MS, y * MS); g.lineTo(0, MAP.h * MS); g.fill();
    g.fillStyle = "#9a7650"; for (const p of MAP.piers) g.fillRect(p.x * MS, p.y * MS, p.w * MS, p.h * MS);
    g.fillStyle = "#d2c19d"; for (const r of MAP.roads) g.fillRect(r.x * MS, r.y * MS, Math.max(1, r.w * MS), Math.max(1, r.h * MS));
    g.fillStyle = "#8a6a4a"; for (const b of MAP.buildings) g.fillRect(b.x * MS, b.y * MS, b.w * MS, b.h * MS);
    g.fillStyle = "#6e604c"; g.fillRect(MAP.wallX * MS, 0, 2, MAP.gate.y1 * MS); g.fillRect(MAP.wallX * MS, MAP.gate.y2 * MS, 2, c.height);
    g.fillStyle = "#4f8a3a"; for (const t of MAP.trees) { g.beginPath(); g.arc(t.x * MS, t.y * MS, 2, 0, Math.PI * 2); g.fill(); }
    return c;
  })();
  function drawMini(now) {
    mctx.drawImage(miniBg, 0, 0);
    mctx.strokeStyle = "rgba(29,29,31,.6)"; mctx.lineWidth = 1; mctx.strokeRect(cam.x * MS, cam.y * MS, VW * MS, VH * MS);
    const dot = (x, y, r, c) => { mctx.fillStyle = c; mctx.beginPath(); mctx.arc(x * MS, y * MS, r, 0, Math.PI * 2); mctx.fill(); };
    for (const e of enemies) dot(e.x, e.y, 2.5, isWolf(e.kind) ? "#5a5f78" : "#e53935");
    for (const s of MAP.shops) dot(s.x, s.y, 2.5, "#8a5a1a");
    for (const n of MAP.npcs) if (npcActive(n)) dot(n.x, n.y, 3.5, "#f2c200");
    for (const s of questSpots()) dot(s.x, s.y, 4.5, `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`);
    if (MAP.portal) dot(MAP.portal.x, MAP.portal.y, 3.5, `hsl(${(now / 8) % 360},80%,55%)`);
    HOOK.mini?.(dot, now);
    dot(me.x, me.y, 4, "#fff"); mctx.strokeStyle = CH.color; mctx.lineWidth = 2; mctx.beginPath(); mctx.arc(me.x * MS, me.y * MS, 4, 0, Math.PI * 2); mctx.stroke();
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - (frame.last || now)) / 1000);
    frame.last = now;
    try {
      update(dt, now);
      cam.x = Math.max(0, Math.min(MAP.w - VW, me.x - VW / 2));
      cam.y = Math.max(0, Math.min(MAP.h - VH, me.y - VH / 2));
      ctx.clearRect(0, 0, VW, VH);
      drawMap(now);
      drawMini(now);
      renderQ();
    } catch (e) { showError(e); return; }
    requestAnimationFrame(frame);
  }

  // ===== 輸入 =====
  let mouse = null, hover = null;
  function worldPoint(e) {
    const r = cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * VW + cam.x, y: ((e.clientY - r.top) / r.height) * VH + cam.y };
  }
  function goTo(p, then) { me.target = { x: p.x, y: p.y }; me.then = then || null; me.stuck = 0; me.path = MAP.indoor ? findPath(me, me.target) : null; }
  // 室內地圖：牆很多，用格子 A* 找路，再把路徑拉直
  const PG = 20;
  let freeGrid = null;
  function findPath(a, b) {
    const C = Math.ceil(MAP.w / PG), Rw = Math.ceil(MAP.h / PG);
    if (!freeGrid) { freeGrid = new Uint8Array(C * Rw); for (let j = 0; j < Rw; j++) for (let i = 0; i < C; i++) freeGrid[j * C + i] = blocked(i * PG + PG / 2, j * PG + PG / 2, me.half) ? 0 : 1; }
    const cell = (x, y) => [Math.max(0, Math.min(C - 1, Math.floor(x / PG))), Math.max(0, Math.min(Rw - 1, Math.floor(y / PG)))];
    const nearFree = ([i, j]) => { if (freeGrid[j * C + i]) return [i, j]; for (let r = 1; r < 12; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const x = i + di, y = j + dj; if (x >= 0 && y >= 0 && x < C && y < Rw && freeGrid[y * C + x]) return [x, y]; } return [i, j]; };
    const sight = (p, q) => { const d = dist(p.x, p.y, q.x, q.y), n = Math.ceil(d / 8); for (let k = 1; k <= n; k++) if (blocked(p.x + ((q.x - p.x) * k) / n, p.y + ((q.y - p.y) * k) / n, me.half)) return false; return true; };
    if (sight(a, b)) return null;
    const s0 = nearFree(cell(a.x, a.y)), g0 = nearFree(cell(b.x, b.y));
    const S = s0[1] * C + s0[0], G = g0[1] * C + g0[0];
    const gs = new Float32Array(C * Rw).fill(Infinity), from = new Int32Array(C * Rw).fill(-1), closed = new Uint8Array(C * Rw);
    const open = [[0, S]]; gs[S] = 0;
    const h = (k) => Math.hypot((k % C) - g0[0], Math.floor(k / C) - g0[1]);
    let found = false, guard = 0;
    while (open.length && guard++ < 60000) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
      const [, k] = open[bi]; open[bi] = open[open.length - 1]; open.pop();
      if (closed[k]) continue; closed[k] = 1;
      if (k === G) { found = true; break; }
      const i = k % C, j = Math.floor(k / C);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const x = i + di, y = j + dj; if (x < 0 || y < 0 || x >= C || y >= Rw) continue;
        const n = y * C + x; if (!freeGrid[n] || closed[n]) continue;
        if (di && dj && (!freeGrid[j * C + x] || !freeGrid[y * C + i])) continue;
        const g = gs[k] + (di && dj ? 1.414 : 1);
        if (g < gs[n]) { gs[n] = g; from[n] = k; open.push([g + h(n), n]); }
      }
    }
    if (!found) return null;
    const pts = []; for (let k = G; k !== -1 && k !== S; k = from[k]) pts.push({ x: (k % C) * PG + PG / 2, y: Math.floor(k / C) * PG + PG / 2 });
    pts.reverse(); pts.push({ x: b.x, y: b.y });
    // 拉直：能直接看到的點就跳過中間
    const out = []; let cur = { x: a.x, y: a.y }, idx = 0;
    while (idx < pts.length) { let far = idx; for (let t = pts.length - 1; t > idx; t--) if (sight(cur, pts[t])) { far = t; break; } cur = pts[far]; out.push(cur); idx = far + 1; }
    out.pop();     // 最後一個就是目的地本身
    return out;
  }
  cv.addEventListener("mousemove", (e) => {
    mouse = worldPoint(e);
    hover = enemies.find((x) => dist(x.x, x.y, mouse.x, mouse.y) < x.r + 6) || null;
    cv.style.cursor = aiming ? "crosshair" : mode === "attack" ? (hover ? "crosshair" : "not-allowed") : "pointer";
  });
  cv.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    if (busy) return;
    if (aiming) { aiming = false; return; }
    mode = mode === "move" ? "attack" : "move";
    renderHud();
  });
  cv.addEventListener("click", (e) => {
    if (busy || charging) return;
    const p = worldPoint(e);
    if (aiming) return useQ(p);
    const enemy = enemies.find((x) => dist(x.x, x.y, p.x, p.y) < x.r + 8);
    if (mode === "attack") {
      if (enemy) return attack(enemy);
      return toast("攻擊模式：點魔物攻擊（右鍵切回移動）");
    }
    if (HOOK.click?.(p)) return;
    const npc = MAP.npcs.find((n) => dist(n.x, n.y, p.x, p.y) < 24);
    if (npc) return talk(npc);
    // 比對攤位
    if (stageOf("inspect").length) {
      const si = MAP.stalls.findIndex((t) => p.x >= t.x - 6 && p.x <= t.x + t.w + 6 && p.y >= t.y - 6 && p.y <= t.y + t.h + 6);
      if (si >= 0) return dist(me.x, me.y, MAP.stalls[si].x + 45, MAP.stalls[si].y + 30) < 130 ? openStall(si) : goTo({ x: MAP.stalls[si].x + 45, y: MAP.stalls[si].y + MAP.stalls[si].h + 22 }, { type: "stall", si, reach: 8 });
    }
    // 向鎮民打聽
    if (stageOf("clues").length) {
      const f = folk.find((x) => dist(x.x, x.y, p.x, p.y) < 22);
      if (f) return dist(me.x, me.y, f.x, f.y) < 90 ? askFolk(f) : goTo(f, { type: "folk", folk: f, follow: f, reach: 60 });
    }
    const shop = MAP.shops.find((s) => dist(s.x, s.y, p.x, p.y) < 24);
    if (shop) return openShop(shop);
    const spot = questSpots().find((s) => dist(s.x, s.y, p.x, p.y) < 70);
    if (spot) return dist(me.x, me.y, spot.x, spot.y) < 110 ? openSpot(spot) : goTo(spot, { type: "spot", spot, reach: 90 });
    if (MAP.portal && dist(p.x, p.y, MAP.portal.x, MAP.portal.y) < 44) return dist(me.x, me.y, MAP.portal.x, MAP.portal.y) < 80 ? openPortal() : goTo(MAP.portal, { type: "portal", reach: 60 });
    goTo(p);
  });
  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    const k = e.key.toLowerCase();
    if (k === "escape") { if (!panel.classList.contains("hidden")) closePanel(); else aiming = false; return; }
    if (busy) return;
    if (k === "q") pressQ();
    if (k === "i") openBag();
    if (k === "l") openLog();
  });
  $("#qBtn").addEventListener("click", pressQ);
  $("#bagBtn").addEventListener("click", () => { if (!busy) openBag(); });
  $("#logBtn").addEventListener("click", () => { if (!busy) openLog(); });
  $("#muteBtn").addEventListener("click", () => {
    muted = !muted;
    try { localStorage.setItem("rpg.muted", muted ? "1" : "0"); } catch (e) { /* 忽略 */ }
    if (muted) bgm?.pause(); else startBgm();
    renderMute();
  });
  $("#wxName").addEventListener("click", () => { if (busy) return; busy = true; P.renameDialog($("#wxStage"), () => { busy = false; renderHud(); }); });

  // ===== HUD =====
  let toastTimer = 0;
  function toast(msg) {
    const el = $("#wxToast");
    el.textContent = msg; el.classList.remove("hidden");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.add("hidden"), 2600);
  }
  function renderTracker() {
    $("#wxTrack").innerHTML = trip.accepted.map((id) => {
      const c = CM.get(id), done = trip.done.includes(id), st = CM.stage(trip, id);
      const cnt = st?.type === "kill" ? `（${trip.qcount[id] || 0} / ${st.need}）`
        : st?.type === "clues" ? `（${(trip.qdata?.[id]?.clues || []).filter((x) => x.found).length} / ${st.need}）`
        : st?.type === "carry" ? `（${trip.qdata?.[id]?.delivered || 0} / ${st.n}）${trip.qdata?.[id]?.alt ? "→ 改還給老伯恩" : ""}` : "";
      return `<li class="${done ? "done" : ""}"><b>${esc(c.title)}</b><span>${done ? "完成" : c.wip ? "玩法設計中" : esc(stText(id, st)) + cnt}</span></li>`;
    }).join("");
  }
  function renderHud() {
    const mh = maxHp();
    $("#wxFace").textContent = CH.name[0];
    $("#wxFace").style.setProperty("--c", CH.color);
    $("#wxName").textContent = P.get()?.name || "旅人";
    $("#wxWorld").textContent = `${W0.code} ${W0.name}・${CH.name}`;
    $("#wxHp").style.width = `${((SCARE ? mh - run.hp : run.hp) / mh) * 100}%`;
    $("#wxHp").parentElement.classList.toggle("scare", SCARE);
    $("#wxHpText").textContent = SCARE ? `驚嚇值 ${mh - run.hp} / ${mh}` : `生命 ${run.hp} / ${mh}`;
    $("#wxGold").textContent = run.gold;
    $("#modeChip").textContent = mode === "move" ? "移動模式" : "攻擊模式（點魔物）";
    $("#modeChip").classList.toggle("atk", mode === "attack");
    $("#qName").textContent = Q ? Q.name : "—";
    $("#qBtn").title = Q ? `${Q.name}：${Q.desc}（冷卻 ${Q.cd} 秒）` : "";
    renderTracker();
  }
  function renderQ() {
    if (!Q) return;
    const left = cdLeft();
    $("#qCd").textContent = left > 0 ? `${Math.ceil(left)}s` : "";
    $("#qMask").style.height = `${(left / Q.cd) * 100}%`;
    $("#qBtn").classList.toggle("on", aiming || !!charging);
    const key = `${run.hp}|${run.gold}|${JSON.stringify(trip.progress)}|${JSON.stringify(trip.qcount)}|${(trip.qdata && Object.values(trip.qdata).map((d) => `${(d.clues || []).filter((c) => c.found).length}.${d.delivered || 0}.${d.alt || ""}`).join()) || ""}`;
    if (frame.hudKey !== key) { frame.hudKey = key; renderHud(); }
  }

  // ===== 縮放 =====
  function fit() {
    const app = $("#wx"), wrap = $("#fit");
    app.style.transform = "none";
    const s = Math.min(window.innerWidth / app.offsetWidth, window.innerHeight / app.offsetHeight);
    app.style.transform = `scale(${s})`;
    wrap.style.width = `${app.offsetWidth * s}px`;
    wrap.style.height = `${app.offsetHeight * s}px`;
  }
  window.addEventListener("resize", fit);
  fit();
  document.fonts?.ready.then(fit);

  // 各時空自己的玩法
  if (R.WorldHooks?.[trip.world]) HOOK = R.WorldHooks[trip.world]({
    R, MAP, trip, run, me, CH, BAG, CM, save, toast, say, openPanel, closePanel, goTo, dist, esc, renderHud, panel,
    ctx: () => ctx, text, rr, marker, inRect, blocked, sfx, isMuted: () => muted, isBusy: () => busy, lucky: () => Date.now() < (run.luckUntil || 0), ambushBattle, changeScene, openPortal, setBusy: (v) => { busy = v; }, fx, $,
  });
  document.title = `${W0.code} ${W0.name}`;
  renderMute();
  renderHud();
  if (trip.lastResult) { toast(trip.lastResult); delete trip.lastResult; save(); }
  if (run.scared && !run.scaredSeen) {
    run.scaredSeen = true; save();
    setTimeout(() => openPanel("嚇破膽了", `<p class="wx-p">回過神來，你已經回到了大廳，渾身發抖。</p>
      <p class="tv-note">在這裡全員嚇破膽不算戰敗，冒險不會結束；但這一趟還沒完成的委託都算失敗（照進度拿時空幣），這輪冒險也不能再接。只能從酒館的門回去結算。</p>`), 300);
  }
  else if (!run.arrived) { run.arrived = true; save(); toast(`抵達 ${W0.code} ${W0.name}。先去找委託人吧（右上角「委託」可以看下一步）`); }
  requestAnimationFrame(frame);

  R.explore = { get hook() { return HOOK; }, openPortal, me, enemies, run, trip, battle, MAP, blocked, questSpots, talk, openShop, openSpot, folk, qd, stageOf, openStall, askFolk, marketOf, guards, get seller() { return seller; } };   // 除錯用
})();
