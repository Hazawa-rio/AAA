/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/lb00042-exp.js": "20261113040753" });
// #LB00042 美食研究所（擴充）：電腦 UI、素材編號、玩家實驗、失散的實驗紀錄、會動的布丁
// 疊在 lb00042.js（照單領料）上面：兩邊的 hook 都會被呼叫，這邊先處理
(function () {
  const R = (window.RPG = window.RPG || {});
  const base = R.WorldHooks.LB00042;
  const UNLOCK = 3;                                   // 完成幾張美食研究所的委託才能自己做實驗
  const COMMON = ["fruitCake", "mousseRazor", "steelToy"];          // 手稿上的實驗意外（普通寶物）
  const BETTER = ["hotdogDog", "hotdogDog", "mysteryMedal", "mysteryMedal", "fantasyFlask"];   // 每趟 5 個隨機配方的實驗意外
  const FAIL_GOLD = 40;                               // 絕對失敗的配方：所長收購價（暫定）
  const PUDDING = { r: 16, scare: 135, hop: 170, tired: 5 };

  R.WorldHooks.LB00042 = function (api) {
    const B = base(api);
    const { MAP, trip, run, me, BAG, CM, toast, openPanel, closePanel, goTo, dist, esc, inRect, text } = api;
    const ctx = api.ctx();
    const save = () => { api.save(); api.renderHud?.(); };
    const ROOM = MAP.rooms;
    const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const L = (trip.qdata = trip.qdata || {}).lab;
    const qd = (id) => (trip.qdata[id] = trip.qdata[id] || {});
    const active = (id) => trip.accepted.includes(id) && !trip.done.includes(id);
    const stageOf = (id) => (active(id) ? CM.stage(trip, id) : null);
    const doneAny = (id) => trip.done.includes(id) || R.Adventure.get()?.done?.includes(id);
    const inWarehouse = (x, y) => [ROOM.wTop, ROOM.wLeft, ROOM.wBot].some((r) => inRect(r, x, y));

    // ===== 每趟隨機：素材編號、5 個隨機配方、散落的紀錄 =====
    if (!L.nums) {
      const nums = shuffle(L.slots.map((_, i) => i + 1));
      L.slots.forEach((sl, i) => { sl.no = nums[i]; });
      L.nums = true;
      const names = shuffle(MAP.materials.filter((m) => m !== L.accident.a && m !== L.accident.b));
      const loot = shuffle(BETTER);
      L.recipes = Array.from({ length: 5 }, (_, i) => ({ a: names[i * 2], b: names[i * 2 + 1], item: loot[i] }));
      // 紀錄散落在研究室和倉庫的地上（避開擋路的東西）
      const spots = [];
      for (let k = 0; spots.length < 5 && k < 400; k++) {
        const room = [ROOM.lab, ROOM.wTop, ROOM.wLeft, ROOM.wBot][spots.length % 4];
        const x = room.x + 40 + Math.random() * (room.w - 80), y = room.y + 40 + Math.random() * (room.h - 80);
        if (!api.blocked(x, y, 18) && spots.every((s) => dist(s.x, s.y, x, y) > 200)) spots.push({ x: Math.round(x), y: Math.round(y), found: false });
      }
      L.pages = spots;
      save();
    }
    const nameOf = (no) => L.slots.find((s) => s.no === no)?.name || "？";
    const labDone = () => CM.ofWorld("LB00042").filter((c) => doneAny(c.id)).length;
    const unlocked = () => labDone() >= UNLOCK;

    // ===== 會動的布丁（史萊姆的變體） =====
    const PD = qd("pudding");
    const pudding = PD.caught || PD.gone ? null : { x: PD.x || 1600, y: PD.y || 300, hops: 0, tired: 0, hop: null };
    const catchStage = () => ["LB00042-03", "LB00042-04"].map((id) => ({ id, st: stageOf(id) })).find((x) => x.st?.type === "labCatch");
    // 布丁塔（友好實體）：微波爐產生的，在研究室裡晃來晃去
    let tower = PD.tower ? { x: 1150, y: 900, tx: 1150, ty: 900, wait: 0 } : null;
    let expAnim = null;          // 微波爐運轉中 { t0, then }

    // ===== 電腦 =====
    let pcTab = "catalog";
    function pcHtml() {
      const ok = unlocked(), st1 = stageOf("LB00042-01"), d1 = trip.qdata["LB00042-01"] || {};
      const st3 = stageOf("LB00042-03");
      const helps = [];
      if (st1?.type === "labExp" && !BAG.count(run.items, "chickenEgg") && !(d1.list || []).includes("chickenEgg")) helps.push(`<button type="button" class="pc-btn" data-act="lab" data-s="printEgg">普羅的委託：列印「雞蛋」的採購清單</button>`);
      if (st3?.type === "labSlip") helps.push(`<button type="button" class="pc-btn" data-act="pc" data-s="slip">拉格的委託：列印「布丁（活）」的採購清單</button>`);
      if (stageOf("LB00042-04")?.type === "labSlip") helps.push(`<button type="button" class="pc-btn" data-act="pc" data-s="slip4">安比的委託：列印「布丁（活）」的採購清單</button>`);
      const N = L.slots.length, ex = L.exp;
      const opts = (sel) => Array.from({ length: N }, (_, i) => `<option value="${i + 1}"${sel === i + 1 ? " selected" : ""}>#${String(i + 1).padStart(2, "0")}</option>`).join("");
      let body = "";
      if (pcTab === "catalog") {
        body = `<p class="pc-dim">理性倉庫素材目錄（本次編號）</p><div class="pc-grid">${L.slots.slice().sort((a, b) => a.no - b.no).map((s) => `<span><b>#${String(s.no).padStart(2, "0")}</b> ${esc(s.name)}</span>`).join("")}</div>`;
      } else if (pcTab === "help") {
        body = helps.length ? `<p class="pc-dim">研究員已登入。請協助操作：</p>${helps.join("")}` : `<p class="pc-dim">目前沒有需要協助的操作。</p>`;
      } else {
        if (!ok) body = `<p class="pc-err">ACCESS DENIED — 實驗權限不足</p><p class="pc-dim">完成 ${UNLOCK} 張美食研究所的委託後開放（目前 ${Math.min(labDone(), UNLOCK)} / ${UNLOCK}）。</p>`;
        else if (L.expDone) body = `<p class="pc-dim">本次實驗已經完成。下次再來吧。</p>${L.lastExp ? `<p>上一次：#${L.lastExp.a} ＋ #${L.lastExp.b} → ${esc(L.lastExp.text)}</p>` : ""}`;
        else if (ex) body = `<p>已列印採購清單：<b>#${ex.a}</b> ${esc(nameOf(ex.a))} ＋ <b>#${ex.b}</b> ${esc(nameOf(ex.b))}</p><p class="pc-dim">到理性倉庫拿齊兩樣素材（${ex.got.length} / 2），再放進微波爐室的神奇微波爐。</p><button type="button" class="pc-btn" data-act="pc" data-s="cancel">取消這張採購清單</button>`;
        else body = `<p class="pc-dim">輸入兩個素材編號，列印採購清單。一次只能做一個實驗。</p>
          <div class="pc-pick"><select id="pcA">${opts(1)}</select><span>＋</span><select id="pcB">${opts(2)}</select></div>
          <p id="pcNames" class="pc-dim"></p>
          <button type="button" class="pc-btn" data-act="pc" data-s="exp">列印採購清單</button>`;
      }
      return `<div class="lab-pc">
        <div class="pc-head">MICROWAVE RESEARCH TERMINAL <span>v4.2</span></div>
        <div class="pc-status">身分驗證：${ok ? '<b class="ok">通過</b>' : '<b class="ng">失敗</b>（只能協助研究員操作）'}　實驗權限 ${Math.min(labDone(), UNLOCK)} / ${UNLOCK}</div>
        <div class="pc-tabs">${[["catalog", "素材目錄"], ["help", `委託協助${helps.length ? ` (${helps.length})` : ""}`], ["exp", "實驗申請"]].map(([k, n]) => `<button type="button" class="pc-tab${pcTab === k ? " on" : ""}" data-act="pc" data-s="tab" data-tab="${k}">${n}</button>`).join("")}</div>
        <div class="pc-body">${body}</div></div>`;
    }
    function openPc() {
      openPanel("研究室的電腦", pcHtml());
      const a = document.getElementById("pcA"), b = document.getElementById("pcB"), n = document.getElementById("pcNames");
      const upd = () => { if (n) n.textContent = `${nameOf(Number(a.value))} ＋ ${nameOf(Number(b.value))}`; };
      if (a && b) { a.onchange = upd; b.onchange = upd; upd(); }
    }

    // ===== 手稿 =====
    function openNotes() {
      const known = doneAny("LB00042-02") ? L.recipes : L.recipes.filter((_, i) => L.pages[i]?.found);
      openPanel("桌上的手稿", `<p class="tv-note">研究員們的實驗紀錄，字跡潦草，還沾著咖啡漬：</p><ul class="wx-list">
        ${L.notes.map((n) => `<li>${esc(n.a)}＋${esc(n.b)}：${esc(n.r)}</li>`).join("")}
        <li><b>${esc(L.accident.a)}＋${esc(L.accident.b)}：實驗意外！</b></li></ul>
        ${known.length ? `<p class="tv-note" style="margin-top:10px">${doneAny("LB00042-02") ? "所長抄在旁邊的配方：" : "找回來的實驗紀錄："}</p><ul class="wx-list">${known.map((r) => `<li><b>${esc(r.a)}＋${esc(r.b)}：實驗意外！</b></li>`).join("")}</ul>` : ""}`);
    }

    // ===== 實驗 =====
    function runExperiment() {
      const ex = L.exp, A = nameOf(ex.a), Bn = nameOf(ex.b), pair = (x, y) => (x === A && y === Bn) || (x === Bn && y === A);
      let item = null, kind = "fail";
      const G = genius();
      if ((ex.a === 4 && ex.b === 2) || (ex.a === 2 && ex.b === 4)) { item = "cosmic42"; kind = "cosmic"; }
      else if (pair(G.a, G.b)) { item = "genius1"; kind = "genius"; }
      else if (pair(L.accident.a, L.accident.b)) { item = COMMON[Math.floor(Math.random() * COMMON.length)]; kind = "accident"; }
      else { const r = L.recipes.find((x) => pair(x.a, x.b)); if (r) { item = r.item; kind = "recipe"; } }
      L.exp = null; L.expDone = true;
      startAnim(() => {
        let html, txt;
        if (item) {
          const g = R.Items.give(api.CH.id, item), it = R.Items.get(item);
          txt = `實驗意外：${it.name}`;
          const fails = failCount();
          html = `<p class="wx-p">微波爐「叮」的一聲。門一打開——${kind === "cosmic" ? "一顆裝著小宇宙的玻璃珠靜靜地躺在盤子上，裡面的星星在轉。" : kind === "genius" ? "盤子上什麼都沒有。……不對，有一顆小小的燈泡，自己亮著。所長瑪德蓮跑過來，盯著它看了很久：「這個配方，沒有寫在任何一本手稿上。」" : "實驗意外！盤子上放著一樣誰也沒想到的東西。"}</p>
            ${kind === "genius" ? `<p class="tv-note">${fails ? `在這之前，你失敗了 ${fails} 次。那 99% 都算數。` : "第一次就成功了。……這才是真正的 1%。"}</p>` : ""}
            <div class="shop-row" style="margin:8px 0">${R.Items.slotHtml(item)}<span><b>${esc(it.name)}</b><small>${esc(it.desc)}</small></span></div>
            <p class="tv-note">${esc(g.text)}</p>`;
        } else {
          const ev = FAIL[Math.floor(Math.random() * FAIL.length)];
          BAG.add(run.items, "failRecipe", 1);
          addFail();
          L.lastExp = { a: ex.a, b: ex.b, text: `失敗（微波爐${ev.text}）` };
          save();
          // 失敗：先演出微波爐的事件，演完才跳出結果
          mwEv = { kind: ev.id, t0: performance.now(), hits: 0, dmg: 0, done: () => openPanel("實驗結果", `<p class="wx-p">微波爐${esc(ev.text)}。${esc(ev.after)}</p>${mwEv.dmg ? `<p class="tv-note">待在微波爐室裡被波及了：失去 ${mwEv.dmg} 點生命</p>` : ""}<p class="tv-note">印表機默默吐出一張「絕對失敗的配方」（可以交給所長換一點金幣）。這是你在這間研究所的第 ${failCount()} 次失敗。</p>`) };
          return;
        }
        L.lastExp = { a: ex.a, b: ex.b, text: txt };
        save();
        openPanel("實驗結果", html);
      });
    }
    // ===== 天才的1%靈感：沒有任何提示的隨機配方（每個存檔抽一次，之後都不會變；失敗次數也記在存檔裡） =====
    function genius() {
      let g = null;
      try { g = JSON.parse(localStorage.getItem("rpg.labGenius")); } catch (e) { /* 忽略 */ }
      if (!g || !MAP.materials.includes(g.a) || !MAP.materials.includes(g.b)) {
        const m = shuffle(MAP.materials.slice());
        g = { a: m[0], b: m[1], fails: g?.fails || 0 };
        try { localStorage.setItem("rpg.labGenius", JSON.stringify(g)); } catch (e) { /* 忽略 */ }
      }
      return g;
    }
    const failCount = () => genius().fails || 0;
    function addFail() { const g = genius(); g.fails = (g.fails || 0) + 1; try { localStorage.setItem("rpg.labGenius", JSON.stringify(g)); } catch (e) { /* 忽略 */ } }

    // ===== 實驗失敗時微波爐會發生的事（前兩個會傷到待在微波爐室的人） =====
    const FAIL = [
      { id: "fire", text: "噴出了火焰", after: "研究員們熟練地拿出滅火器。" },
      { id: "hail", text: "噴出一陣寒氣，接著微波爐室下起了冰雹", after: "冰雹下了一陣子才停。研究員們撐著傘出來掃地。" },
      { id: "grow", text: "突然變大了一下，又縮了回去", after: "大家假裝什麼都沒看到。" },
      { id: "jump", text: "跳了起來", after: "落地的時候，它好像有點得意。" },
      { id: "boom", text: "很電子地爆炸了", after: "閃光一明一暗地交替了好一陣子。等燈光恢復，微波爐完好如初，只是螢幕上寫著「ERROR」。" },
      { id: "thumb", text: "伸出一隻機械手，比了個倒讚", after: "它不喜歡這個配方。" },
    ];
    let mwEv = null;
    const EV_DUR = { fire: 2.4, hail: 3.4, grow: 2.0, jump: 2.0, boom: 3.4, thumb: 2.4 };
    const inMwRoom = () => inRect(ROOM.gray, me.x, me.y);
    function hurt(n, label) {
      if (!inMwRoom()) return;
      const d = Math.min(n, Math.max(0, run.hp - 1));
      if (d <= 0) return;
      run.hp -= d; mwEv.dmg += d; save();
      api.fx.push({ k: "num", x: me.x, y: me.y - 40, text: `-${d}`, color: "#e53935", t: performance.now(), dur: 900 });
      toast(label);
    }
    function updateEvent(now) {
      if (!mwEv) return;
      const k = (now - mwEv.t0) / 1000;
      if (mwEv.kind === "fire" && k > 0.4 && !mwEv.hits) { mwEv.hits = 1; hurt(12, "微波爐噴出的火焰燒到你了！"); }
      const HAIL = [1.0, 1.9, 2.8];
      while (mwEv.kind === "hail" && mwEv.hits < HAIL.length && k > HAIL[mwEv.hits]) { mwEv.hits++; hurt(6, "冰雹打在頭上！"); }
      if (k > EV_DUR[mwEv.kind]) { const f = mwEv.done; f(); mwEv = null; }
    }
    MAP.mwOn = () => !!expAnim;               // 研究所的實驗也讓微波爐運轉
    MAP.mwFx = (now) => {
      if (!mwEv) return null;
      const k = (now - mwEv.t0) / 1000;
      if (mwEv.kind === "grow") return { s: k < 0.5 ? 1 + 0.9 * (k / 0.5) : k < 1.0 ? 1.9 : k < 1.3 ? 1.9 - 0.9 * ((k - 1.0) / 0.3) : 1 };
      if (mwEv.kind === "jump") return { dy: k < 0.8 ? -130 * Math.sin((k / 0.8) * Math.PI) : k < 1.1 ? -25 * Math.sin(((k - 0.8) / 0.3) * Math.PI) : 0 };
      if (mwEv.kind === "boom") return { dx: Math.sin(now / 40) * 2 };
      return null;
    };
    function drawEvent(now) {
      if (!mwEv) return;
      const mw = MAP.microwave, g = ROOM.gray, k = (now - mwEv.t0) / 1000, cx = mw.x + mw.w / 2, cy = mw.y + mw.h / 2;
      if (mwEv.kind === "fire") {
        ctx.save(); ctx.beginPath(); ctx.rect(g.x, g.y, g.w, g.h); ctx.clip();          // 火焰只在微波爐室裡
        const a = Math.max(0, Math.min(1, k / 0.3)) * (k > 1.8 ? Math.max(0, 1 - (k - 1.8) / 0.6) : 1);
        for (let i = 0; i < 26; i++) {
          const q = ((now / 500 + i / 26) % 1), L = 40 + q * 260 * a, sp = (Math.sin(i * 7.1) * 0.5) * (0.4 + q);
          const x = mw.x - L, y = cy + sp * 140;
          ctx.fillStyle = `rgba(255,${120 + 100 * (1 - q)},40,${(1 - q) * 0.8 * a})`; ctx.beginPath(); ctx.arc(x, y, 10 + q * 26, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
      if (mwEv.kind === "hail") {
        if (k < 0.9) { ctx.fillStyle = `rgba(200,235,255,${0.5 * (1 - k / 0.9)})`; ctx.beginPath(); ctx.arc(cx, cy, 60 + k * 220, 0, Math.PI * 2); ctx.fill(); }
        else {
          ctx.save(); ctx.beginPath(); ctx.rect(g.x, g.y, g.w, g.h); ctx.clip();
          ctx.fillStyle = "rgba(180,210,240,.12)"; ctx.fillRect(g.x, g.y, g.w, g.h);
          for (let i = 0; i < 40; i++) {
            const q = ((now / 600 + i * 0.137) % 1), x = g.x + ((i * 97) % g.w), y = g.y + q * g.h;
            ctx.fillStyle = "#eef8ff"; ctx.strokeStyle = "#8ab4d8"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          }
          ctx.restore();
        }
      }
      if (mwEv.kind === "boom") {
        // 很電子的爆炸：慢慢交替的閃光＋方塊碎片
        const on = Math.floor(k / 0.45) % 2 === 0, fade = Math.max(0, 1 - k / EV_DUR.boom);
        ctx.fillStyle = on ? `rgba(80,240,255,${0.35 * fade})` : `rgba(255,60,220,${0.35 * fade})`;
        ctx.fillRect(g.x, g.y, g.w, g.h);
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * Math.PI * 2, r = 20 + Math.min(1, k / 0.6) * (90 + (i % 4) * 30);
          ctx.fillStyle = (i + Math.floor(k / 0.45)) % 2 ? `rgba(80,240,255,${fade})` : `rgba(255,60,220,${fade})`;
          ctx.fillRect(cx + Math.cos(a) * r - 5, cy + Math.sin(a) * r - 5, 10, 10);
        }
        if (k > 1.2) text("ERROR", cx, mw.y - 18, on ? "#30d0e0" : "#e030c0", 16, 900);
      }
      if (mwEv.kind === "thumb") {
        // 從微波爐頂伸出機械手，比倒讚
        const up = Math.min(1, k / 0.5), hx = cx, hy = mw.y - 30 - 40 * up;
        ctx.strokeStyle = "#6a707a"; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(cx, mw.y); ctx.lineTo(hx, hy + 20); ctx.stroke();
        ctx.fillStyle = "#b8bec8"; ctx.strokeStyle = "#4a4f58"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.rect(hx - 22, hy - 22, 44, 36); ctx.fill(); ctx.stroke();
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(hx - 22, hy - 12 + i * 10); ctx.lineTo(hx + 6, hy - 12 + i * 10); ctx.stroke(); }
        ctx.beginPath(); ctx.rect(hx + 8, hy + 10, 12, 30 * up); ctx.fill(); ctx.stroke();      // 往下的大拇指
      }
    }
    function startAnim(then) {
      expAnim = { t0: performance.now(), then };
      api.sfx("sounds/microwave-run.mp3");
      toast("神奇微波爐開始運轉……");
    }

    // ===== 每一幀 =====
    function update(dt, now) {
      updateEvent(now);
      if (expAnim && now - expAnim.t0 > 3600) { const f = expAnim.then; expAnim = null; api.sfx("sounds/microwave-done.mp3"); f(); return; }
      // 布丁：靠近會跳開，跳 3 次就累了
      if (pudding && !PD.caught) {
        const p = pudding;
        if (p.hop) {
          const k = Math.min(1, (now - p.hop.t0) / 380);
          p.x = p.hop.x0 + (p.hop.x1 - p.hop.x0) * k; p.y = p.hop.y0 + (p.hop.y1 - p.hop.y0) * k;
          if (k >= 1) { p.hop = null; PD.x = Math.round(p.x); PD.y = Math.round(p.y); if (p.hops >= 3) { p.tired = PUDDING.tired; p.hops = 0; } }
        } else if (p.tired > 0) p.tired -= dt;
        else if (catchStage() && dist(me.x, me.y, p.x, p.y) < PUDDING.scare) {
          const a0 = Math.atan2(p.y - me.y, p.x - me.x);
          for (let k = 0; k < 12; k++) {
            const a = a0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.45, x = p.x + Math.cos(a) * PUDDING.hop, y = p.y + Math.sin(a) * PUDDING.hop;
            if (inWarehouse(x, y) && !api.blocked(x, y, PUDDING.r)) { p.hop = { t0: now, x0: p.x, y0: p.y, x1: x, y1: y }; p.hops++; api.sfx("sounds/slime-move.mp3"); break; }
          }
        }
      }
      // 散落的紀錄：走到上面就撿起來
      const st2 = stageOf("LB00042-02");
      if (st2?.type === "labPages") for (const pg of L.pages) if (!pg.found && dist(me.x, me.y, pg.x, pg.y) < 34) {
        pg.found = true;
        const n = L.pages.filter((x) => x.found).length;
        toast(`撿到一頁實驗紀錄（${n} / 5）`);
        if (n >= 5) { CM.advance(trip, "LB00042-02"); toast("五頁實驗紀錄都找回來了！拿去給所長瑪德蓮"); }
        save();
      }
      // 布丁塔
      if (tower) {
        const c = tower;
        if (c.wait > 0) c.wait -= dt;
        else { const d = dist(c.x, c.y, c.tx, c.ty); if (d < 3) { c.wait = 1 + Math.random() * 3; c.tx = ROOM.lab.x + 60 + Math.random() * (ROOM.lab.w - 120); c.ty = ROOM.lab.y + 120 + Math.random() * (ROOM.lab.h - 240); } else { const sp = Math.min(d, 45 * dt); c.x += ((c.tx - c.x) / d) * sp; c.y += ((c.ty - c.y) / d) * sp; } }
      }
    }

    // ===== 點擊 =====
    function near(r, fn) {
      if (dist(me.x, me.y, r.x + r.w / 2, r.y + r.h / 2) < Math.max(r.w, r.h) / 2 + 60) fn();
      else goTo({ x: r.x + r.w / 2, y: r.y + r.h + 30 }, { type: "hook", reach: 8, fn });
      return true;
    }
    function useMicrowave() {
      const s4 = stageOf("LB00042-04");
      if (s4?.type === "labMicrowave" && BAG.count(run.items, "livePudding")) {
        openPanel("神奇微波爐", `<p class="wx-p">布丁在你手上抖得更厲害了。安比說，要證明微波爐能「創造」。</p>
          <div class="tv-row"><button type="button" class="primary" data-act="pc" data-s="puddingGo">把布丁放進微波爐</button><button type="button" class="ghost" data-close>再想想</button></div>`);
        return;
      }
      if (L.exp && L.exp.got.length >= 2) {
        openPanel("神奇微波爐", `<p class="wx-p">#${L.exp.a} ${esc(nameOf(L.exp.a))} ＋ #${L.exp.b} ${esc(nameOf(L.exp.b))}。研究員們退到觀察窗後面。</p>
          <div class="tv-row"><button type="button" class="primary" data-act="pc" data-s="run">啟動微波爐</button><button type="button" class="ghost" data-close>等一下</button></div>`);
        return;
      }
      toast(L.exp ? "素材還沒拿齊" : "神奇微波爐靜靜地待在那裡。沒有人知道它會做出什麼");
    }
    function click(p, arrived) {
      if (expAnim || mwEv) return true;
      // 布丁
      if (pudding && !PD.caught && dist(p.x, p.y, pudding.x, pudding.y) < 30) {
        const cs = catchStage();
        if (!cs) { toast("一個會動的布丁。它看起來很怕你"); return true; }
        if (pudding.tired <= 0) { toast("它太警覺了——讓它跳到累，才抓得住"); return true; }
        if (dist(me.x, me.y, pudding.x, pudding.y) > 70) { goTo({ x: pudding.x, y: pudding.y }, { type: "hook", reach: 50, fn: () => click(p) }); return true; }
        PD.caught = true; BAG.add(run.items, "livePudding", 1);
        CM.advance(trip, cs.id);
        save();
        toast(cs.id === "LB00042-03" ? "抓到會動的布丁了！拿去給拉格" : "抓到會動的布丁了！帶去微波爐室的神奇微波爐");
        return true;
      }
      // 實驗素材
      const sl = L.slots.find((s) => Math.abs(p.x - s.x) < 34 && Math.abs(p.y - s.y) < 34);
      if (sl && L.exp && [L.exp.a, L.exp.b].includes(sl.no) && !L.exp.got.includes(sl.no)) {
        if (!arrived && dist(me.x, me.y, sl.x, sl.y) > 80) { goTo({ x: sl.x, y: sl.y + (sl.h ? (me.y < sl.y ? -44 : 44) : 0) }, { type: "hook", reach: 60, fn: () => click(p, true) }); return true; }
        if (arrived && dist(me.x, me.y, sl.x, sl.y) > 160) { toast("走不過去，換個方向試試"); return true; }
        L.exp.got.push(sl.no); save();
        toast(`照著採購清單拿起了 #${sl.no}「${sl.name}」（${L.exp.got.length} / 2）`);
        return true;
      }
      if (inRect(MAP.computer, p.x, p.y)) return near(MAP.computer, openPc);
      if (inRect(MAP.desk, p.x, p.y)) return near(MAP.desk, openNotes);
      if (inRect(MAP.microwave, p.x, p.y)) return near(MAP.microwave, useMicrowave);
      return false;
    }
    function act(a, b) {
      if (a === "prometheus") {
        if (!canTellPrometheus()) return true;
        trip.progress["LB00042-04"] = AMBI_MADELEINE + 1;       // 直接到「把所長的話帶給安比」
        if (BAG.count(run.items, "livePudding") && !active3()) BAG.remove(run.items, "livePudding", 1);    // 布丁不用帶去微波爐了（放回去）
        save();
        const md = MAP.npcs.find((x) => x.id === "madeleine") || { name: "所長・瑪德蓮", color: "#c2471a" };
        api.dlgSeq("所長・瑪德蓮", [
          { n: md, text: "普羅米修斯是從微波爐裡孵出來的……一隻活生生的、雞冠上燒著火的小雞。" },
          { n: md, text: "那不是加熱，是創造。我們研究了這麼多年，一直把它當成一台加熱的機器。" },
          { n: md, text: "你說倉庫裡還有一位研究員，一直想證明這件事？請替我告訴他：不用等了，今天就來研究室吧。研究室有他的位置。", note: `「微波爐的另一種用法」：${CM.stage(trip, "LB00042-04").text}` },
        ]);
        toast(`「${CM.get("LB00042-04").title}」：${CM.stage(trip, "LB00042-04").text}`);
        return true;
      }
      if (a === "fail") {
        const n = BAG.count(run.items, "failRecipe");
        if (!n) return true;
        BAG.remove(run.items, "failRecipe", n); run.gold += FAIL_GOLD * n; save(); closePanel();
        toast(`所長收下了 ${n} 張絕對失敗的配方：「失敗也是紀錄。」（+${FAIL_GOLD * n} 金幣）`);
        return true;
      }
      if (a !== "pc") return false;
      const s = b.dataset.s;
      if (s === "tab") { pcTab = b.dataset.tab; openPc(); return true; }
      if (s === "slip4") { if (stageOf("LB00042-04")?.type === "labSlip") { CM.advance(trip, "LB00042-04"); save(); } closePanel(); toast("印出了採購清單：「布丁（活）」。去倉庫抓布丁吧——靠近它會跳開，跳累了才抓得住"); return true; }
      if (s === "slip") { if (stageOf("LB00042-03")?.type === "labSlip") { CM.advance(trip, "LB00042-03"); save(); } closePanel(); toast("印出了採購清單：「布丁（活）」。去倉庫抓布丁吧——靠近它會跳開，跳累了才抓得住"); return true; }
      if (s === "exp") {
        const A = Number(document.getElementById("pcA").value), Bv = Number(document.getElementById("pcB").value);
        if (A === Bv) { toast("要兩個不同的素材"); return true; }
        L.exp = { a: A, b: Bv, got: [] }; save(); closePanel();
        toast(`印出了採購清單：#${A} ${nameOf(A)} ＋ #${Bv} ${nameOf(Bv)}。去倉庫拿吧`);
        return true;
      }
      if (s === "cancel") { L.exp = null; save(); openPc(); return true; }
      if (s === "run") { closePanel(); runExperiment(); return true; }
      if (s === "puddingGo") {
        closePanel();
        BAG.remove(run.items, "livePudding", 1); PD.gone = true; save();
        const good = Math.random() < 0.75;
        startAnim(() => {
          if (good) {
            PD.tower = true; tower = { x: 1600, y: 1135, tx: 1300, ty: 1000, wait: 0.6 };
            CM.advance(trip, "LB00042-04"); CM.advance(trip, "LB00042-04");       // 不用打 Boss
            save();
            openPanel("實驗結果", `<p class="wx-p">微波爐「叮」的一聲。門一打開，一座三層的布丁塔晃了晃，用果凍做的小眼睛看著你，然後慢慢地走了出來。</p>
              <p class="wx-p">它很友善。它好像想跟著研究員們。</p><p class="tv-note">微波爐產生了活物！去告訴所長瑪德蓮</p>`);
          } else {
            CM.advance(trip, "LB00042-04"); save();
            openPanel("實驗結果", `<p class="wx-p">微波爐的門被撞開——一團不停彈跳、越彈越大的粉紅色黏液衝了出來！</p><p class="wx-p">它在微波爐室裡彈了兩下，撞開門，一路蹦進了理性倉庫！</p><p class="tv-note">彈跳噩夢跑進倉庫了！到倉庫下方找到它（地圖上的標記）</p>`);
          }
        });
        return true;
      }
      return true;
    }
    // 普羅米修斯從微波爐裡孵出來，也能啟發所長：接了安比的委託、和安比談過之後，可以直接告訴所長（跳過布丁）
    const AMBI_MADELEINE = 5;       // 安比的委託裡「去告訴所長」是第幾個階段（從 0 算）
    const prometheusHatched = () => (trip.qdata["LB00042-01"] || {}).result === "chick";
    const canTellPrometheus = () => prometheusHatched() && active4() && CM.progressOf(trip, "LB00042-04") >= 1 && CM.progressOf(trip, "LB00042-04") < AMBI_MADELEINE;
    function active3() { return trip.accepted.includes("LB00042-03") && !trip.done.includes("LB00042-03"); }
    function active4() { return trip.accepted.includes("LB00042-04") && !trip.done.includes("LB00042-04"); }
    function npcExtra(n) {
      if (n.id !== "madeleine") return "";
      let h = "";
      if (canTellPrometheus()) h += `<div class="tv-row" style="margin-top:8px"><button type="button" class="primary" data-act="prometheus">告訴所長：倉庫裡有位研究員，也一直想證明微波爐能「創造」</button></div>`;
      const k = BAG.count(run.items, "failRecipe");
      if (k) h += `<div class="tv-row" style="margin-top:8px"><button type="button" class="ghost" data-act="fail">交出絕對失敗的配方 ×${k}（+${FAIL_GOLD * k} 金幣）</button></div>`;
      return h;
    }
    function stageText(id, st) {
      if (id === "LB00042-02" && st?.type === "labPages") return `找回散落的實驗紀錄（${L.pages.filter((x) => x.found).length} / 5）`;
      if (st?.type === "labCatch" && pudding) return pudding.tired > 0 ? "布丁累了——快抓住它！" : "抓住倉庫裡會動的布丁（讓它跳到累）";
      return null;
    }

    // ===== 繪圖 =====
    function drawFloor(now, x0, y0) {
      B.drawFloor?.(now, x0, y0);
      // 素材編號
      for (const sl of L.slots) {
        if (sl.taken) continue;
        const want = L.exp && [L.exp.a, L.exp.b].includes(sl.no) && !L.exp.got.includes(sl.no);
        ctx.fillStyle = want ? "#2a8fd6" : "rgba(40,40,40,.72)";
        ctx.fillRect(sl.x - 13, sl.y - 23, 26, 12);
        text(`#${String(sl.no).padStart(2, "0")}`, sl.x, sl.y - 17, "#fff", 9, 800);
        if (want) { ctx.strokeStyle = `rgba(42,143,214,${0.5 + 0.4 * Math.sin(now / 200)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sl.x, sl.y, 24, 0, Math.PI * 2); ctx.stroke(); }
      }
      // 散落的紀錄
      if (stageOf("LB00042-02")?.type === "labPages") for (const pg of L.pages) if (!pg.found) {
        ctx.save(); ctx.translate(pg.x, pg.y); ctx.rotate(((pg.x * 7) % 10) / 10 - 0.5);
        ctx.fillStyle = "#fffaf0"; ctx.fillRect(-11, -14, 22, 28); ctx.strokeStyle = "#8a7a5a"; ctx.lineWidth = 1.5; ctx.strokeRect(-11, -14, 22, 28);
        ctx.strokeStyle = "rgba(60,60,80,.5)"; for (let i = -8; i < 10; i += 5) { ctx.beginPath(); ctx.moveTo(-7, i); ctx.lineTo(7, i); ctx.stroke(); }
        ctx.restore();
      }
      // 微波爐運轉中：發光和晃動交給 lb00042.js 畫微波爐的地方（跟普羅的委託一樣，只有門上的玻璃窗發光）
    }
    function draw(now) {
      B.draw?.(now);
      drawEvent(now);
      // 彈跳噩夢蹦進了理性倉庫：在迎戰的地點彈來彈去
      const s4 = stageOf("LB00042-04");
      if (s4?.type === "boss" && R.EnemyArt?.nightmare) { const jump = Math.abs(Math.sin(now / 260)) * 40; R.EnemyArt.nightmare(ctx, { r: 26, x: 0, facing: Math.PI / 2, alive: true }, { x: s4.at.x, y: s4.at.y - jump }, now); }
      if (pudding && !PD.caught) {
        const p = pudding, jump = p.hop ? Math.sin(Math.min(1, (now - p.hop.t0) / 380) * Math.PI) * 30 : 0, wob = Math.sin(now / 160) * 0.08;
        ctx.fillStyle = "rgba(0,0,0,.15)"; ctx.beginPath(); ctx.ellipse(p.x, p.y + 14, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.translate(p.x, p.y - jump); ctx.scale(1 + wob, 1 - wob);
        ctx.fillStyle = "#f2c86a"; ctx.strokeStyle = "#a8781a"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-15, 12); ctx.lineTo(-11, -8); ctx.quadraticCurveTo(0, -14, 11, -8); ctx.lineTo(15, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#7a4a1a"; ctx.beginPath(); ctx.ellipse(0, -9, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#1d1d1f"; ctx.beginPath(); ctx.arc(-5, 2, 1.8, 0, Math.PI * 2); ctx.arc(5, 2, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        if (p.tired > 0) text("累了…", p.x, p.y - 30, "#a8781a", 11, 900);
        else if (catchStage()) text("會動的布丁", p.x, p.y - 30, "#a8781a", 10, 800);
      }
      if (tower) {
        const c = tower, bob = Math.sin(now / 240) * 2;
        for (const [i, w] of [[0, 30], [1, 22], [2, 14]]) {
          const y = c.y - i * 13 + bob;
          ctx.fillStyle = ["#f2c86a", "#f6d88a", "#fae6aa"][i]; ctx.strokeStyle = "#a8781a"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(c.x - w / 2 - 3, y + 6); ctx.lineTo(c.x - w / 2, y - 6); ctx.lineTo(c.x + w / 2, y - 6); ctx.lineTo(c.x + w / 2 + 3, y + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        ctx.fillStyle = "#7a4a1a"; ctx.beginPath(); ctx.ellipse(c.x, c.y - 32 + bob, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#1d1d1f"; ctx.beginPath(); ctx.arc(c.x - 5, c.y + 1 + bob, 1.8, 0, Math.PI * 2); ctx.arc(c.x + 5, c.y + 1 + bob, 1.8, 0, Math.PI * 2); ctx.fill();
        text("布丁塔", c.x, c.y - 48, "#a8781a", 11, 900);
      }
    }
    function mini(dot, now) {
      B.mini?.(dot, now);
      if (pudding && !PD.caught && catchStage()) dot(pudding.x, pudding.y, 4, "#e0a020");
      if (stageOf("LB00042-02")?.type === "labPages") for (const pg of L.pages) if (!pg.found) dot(pg.x, pg.y, 3.5, "#8a7a5a");
    }

    // 兩邊的 hook 合起來：這邊先處理，沒處理再交給照單領料
    return {
      ...B,
      update(dt, now) { update(dt, now); B.update?.(dt, now); },
      drawFloor, draw, mini, npcExtra,
      click: (p) => click(p) || !!B.click?.(p),
      act: (a, b) => act(a, b) || !!B.act?.(a, b),
      stageText: (id, st) => stageText(id, st) ?? B.stageText?.(id, st) ?? null,
      speedMul: () => (B.speedMul?.() || 1) * (BAG.count(run.items, "livePudding") ? 0.85 : 1),
    };
  };
})();
