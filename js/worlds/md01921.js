/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/md01921.js": "20261114045024" });
// #MD01921 蒙德里安的理想國：畫布的繪圖、長出眼睛的色塊、兩張委託的玩法
//   長眼睛的色塊：走近時問「我像什麼？」——回答物品就乖乖回去，回答野獸就變成野獸撲過來；
//                唱反調的色塊（看不出來）只認相反的答案。薇薇拉「像蘑菇」、弗爾斯勒「你就是個方塊」一定能破解
//   MD01921-01 霸王龍：說服居民「那只是一塊黑色方形」，說服越多，霸王龍越弱
//              （全部說服＝色塊小怪；部分＝自我懷疑的暗黑霸王龍；完全沒有＝十分恐怖的暗黑霸王龍之王）
//   MD01921-04 溢出的白色縫縫：向色塊野獸借三份墨水（打贏才肯借）→ 補上紅色長方形和高塔之間的白縫（補好之後那裡變成路）
//   黃色水面：大家都說某些黃色色塊是水，可以釣方塊魚（每一處三次），帶回酒館請桑恩烤
//   畫架（被認為是畫架的色塊）：做委託的過程中（每完成一個階段）會拿到隨機的顏料——紅藍黃白黑，每一罐都被色塊們「認為」有某種特質
//     （有生命力→生命、有力量感→攻擊、令人安定→防禦、相當神奇→魔力、充滿速度→速度）。在畫架的 6×6 畫布上用顏料畫畫（一罐塗 4 格），
//     自己命名，就變成一個自訂寶物（圖示就是那幅畫）。顏料跨冒險保留（rpg.paints）；地圖上偶爾滴下來的顏料也撿得到
//   MD01921-03 消失的黑線：黑線以為自己是毛毛蟲爬走了 → 帶牠到被認為是葉子的色塊 → 擋下天敵 → 結繭、變成蝴蝶飛走 → 帶回繭（黑線）
(function () {
  const R = (window.RPG = window.RPG || {});
  R.WorldHooks = R.WorldHooks || {};

  const OBJECTS = ["像一張桌子", "像一扇窗", "像一本書", "像一塊地毯", "像一個抽屜", "像一張郵票"];
  const BEASTS = ["像一頭犀牛", "像一隻熊", "像一條鯊魚", "像一頭公牛", "像一隻野豬"];
  const COLOR_KEY = { r: "Red", b: "Blue", y: "Yellow", w: "White" };

  R.WorldHooks.MD01921 = function (api) {
    const { MAP, trip, run, me, CM, BAG, toast, inRect, text, rr, save, openPanel, closePanel, dist, esc } = api;
    const ctx = api.ctx();
    const active = (id) => trip.accepted.includes(id) && !trip.done.includes(id);
    const stageOf = (id) => (active(id) ? CM.stage(trip, id) : null);
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const BL = MAP.blocks, rex = MAP.block("rex"), leaf = MAP.block("leaf");
    const cx = (b) => b.x + b.w / 2, cy = (b) => b.y + b.h / 2;
    trip.qdata = trip.qdata || {};
    const D = (trip.qdata.canvas = trip.qdata.canvas || (() => {
      const cands = BL.filter((b) => !b.id && b.c !== "k" && b.w * b.h < 160 * 400).map((b) => b.i).sort(() => Math.random() - 0.5).slice(0, 6);
      const far = BL.filter((b) => !b.id && b.c !== "k" && Math.hypot(cx(b) - cx(leaf), cy(b) - cy(leaf)) > 1200);
      const home = pick(far);
      return { eyes: cands.map((i, k) => ({ i, contra: k < 2, done: false })), convinced: [], cat: { x: cx(home), y: cy(home), following: false }, hatchT: 0, cocoonTaken: false };
    })());
    D.casts = D.casts || {}; D.ink = D.ink || 0;
    const SEAM = MAP.seam, PONDS = MAP.ponds.map((id) => MAP.block(id));
    const SEAM_ROAD = { x: SEAM.x - 30, y: SEAM.y, w: SEAM.w + 60, h: SEAM.h };
    if (D.painted && !MAP.walk.includes(SEAM_ROAD)) MAP.walk.push(SEAM_ROAD);          // 補好的白縫變成路

    // ===== 溢出的白色縫縫：打完仗回來（借墨水） =====
    const LB = run.lastBattle;
    if (LB && D.inkPending) {
      delete run.lastBattle; D.inkPending = false;
      const st = stageOf("MD01921-04");
      if (LB.result === "win" && st?.type === "mdInk") {
        D.ink++; BAG.add(run.items, "borrowedInk", 1);
        if (D.ink >= st.need) CM.advance(trip, "MD01921-04");
        setTimeout(() => toast(D.ink >= st.need ? `野獸把身上的黑線捲成一小罐墨水借給你。墨水湊齊了（${D.ink} / ${st.need}）——去補那條白縫吧！` : `野獸服氣了，把身上的黑色輪廓線捲成一小罐墨水借給你（${D.ink} / ${st.need}）`), 400);
      }
      save();
    }

    // ===== 長眼睛的色塊 =====
    let asking = null, snooze = new Set();
    function ask(e) {
      const b = BL[e.i];
      asking = e;
      const obj = pick(OBJECTS), beast = pick(BEASTS), id = api.CH?.id;
      const extra = id === "vivilla" ? `<button type="button" class="ghost" data-act="mdAns" data-a="crack" data-t="像蘑菇">像蘑菇</button>` : id === "firsler" ? `<button type="button" class="ghost" data-act="mdAns" data-a="crack" data-t="你就是個方塊">你就是個方塊</button>` : "";
      const inkBtn = stageOf("MD01921-04")?.type === "mdInk" ? `<button type="button" class="ghost" data-act="mdAns" data-a="ink" data-t="借墨水">借一點墨水</button>` : "";
      const opts = [`<button type="button" class="primary" data-act="mdAns" data-a="obj" data-t="${esc(obj)}">${esc(obj)}</button>`, `<button type="button" class="primary" data-act="mdAns" data-a="beast" data-t="${esc(beast)}">${esc(beast)}</button>`].sort(() => Math.random() - 0.5).join("");
      api.dlg(b.name, { name: b.name, color: "#1d1d1f", face: "◉", faceBg: b.color }, "（色塊上睜開了一雙眼睛）……我像什麼？", `${opts}${extra}${inkBtn}`);
    }
    function answer(kind, said) {
      const e = asking; asking = null;
      if (!e) return;
      const b = BL[e.i];
      e.done = true; save();
      if (kind === "ink") {
        closePanel();
        D.inkPending = true; save();
        toast(`${b.name}：「墨水？我身上的黑線可不是隨便借的——先讓我服氣！」它長出一圈濃黑的輪廓，變成了野獸！`);
        setTimeout(() => api.ambushBattle(`beast${COLOR_KEY[b.c] || "White"}`), 500);
        return;
      }
      const calm = kind === "crack" || (kind === "obj") !== e.contra;
      if (calm) {
        closePanel();
        toast(kind === "crack" ? `「${said}」——${b.name}愣了一下，眨眨眼睛，變回一塊普通的色塊` : `${b.name}：「${said.replace(/^像/, "")}……嗯，我是${said.replace(/^像/, "")}。」它閉上眼睛，乖乖變回色塊`);
        return;
      }
      closePanel();
      toast(e.contra && kind === "obj" ? `${b.name}：「才不是！」——它不認你的答案，變成了野獸！` : `${b.name}：「${said.replace(/^像/, "")}……對，我是野獸！」`);
      setTimeout(() => api.ambushBattle(`beast${COLOR_KEY[b.c] || "White"}`), 500);
    }

    // ===== 霸王龍：說服居民 =====
    const believers = () => MAP.npcs.map((n) => n.id);
    const rexVariant = () => { const n = D.convinced.length, all = believers().length; return n >= all ? "rexBlock" : n === 0 ? "rexKing" : "rexDoubt"; };
    const syncRex = () => { const c = CM.get("MD01921-01"); const st = c?.stages?.find((s) => s.type === "boss"); if (st) st.variant = rexVariant(); };
    syncRex();
    const canConvince = (id) => { const st = stageOf("MD01921-01"); return st && st.type === "boss" && !D.convinced.includes(id); };
    const REPLY = ["……你說得對。它從來沒有咬過我。是大家說它會咬人，我才害怕的。", "一塊 3×5 的黑色方形。……這樣看，它確實只是一塊方形。", "如果它不是霸王龍，那我昨晚聽到的吼聲是什麼？……風？好吧，是風。", "我會試著用新的眼光看它。用畫家的眼光。"];
    function npcExtra(n) {
      if (!canConvince(n.id)) return "";
      return `<div class="tv-row" style="margin-top:8px"><button type="button" class="primary" data-act="mdConvince" data-n="${n.id}">告訴他：那只是一塊 3×5 的黑色方形</button></div>`;
    }

    // ===== 消失的黑線（毛毛蟲） =====
    const cat = D.cat;
    function stText(id, st) {
      if (!st) return null;
      if (id === "MD01921-01" && st.type === "boss") { const n = D.convinced.length, all = believers().length; return `${st.text}（已說服 ${n} / ${all} 位居民：${n >= all ? "它只是一塊色塊了" : n === 0 ? "所有人都深信它是霸王龍" : "它開始懷疑自己了"}）`; }
      if (st.type === "mdInk") return `${st.text}（${D.ink} / ${st.need}）`;
      if (st.type === "mdCaterpillar") return cat.following ? "把毛毛蟲（黑線）帶到被認為是葉子的色塊上" : st.text;
      return null;
    }

    function refillEyes() {
      if (stageOf("MD01921-04")?.type !== "mdInk" || D.eyes.filter((e) => !e.done).length >= 2) return;
      const used = new Set(D.eyes.filter((e) => !e.done).map((e) => e.i));
      const cands = BL.filter((b) => !b.id && b.c !== "k" && b.w * b.h < 160 * 400 && !used.has(b.i) && dist(me.x, me.y, cx(b), cy(b)) > 400);
      if (!cands.length) return;
      D.eyes.push({ i: pick(cands).i, contra: false, done: false }); save();
    }
    // ===== 畫架：顏料、畫布、自訂寶物 =====
    const PZ = R.Items?.paints, N = 6;
    const EASEL = (() => { for (let r = 0; r < 600; r += 40) for (let i = 0; i < 12; i++) { const x = MAP.arrive.x + 260 + Math.cos(i * 0.52) * r, y = MAP.arrive.y - 40 + Math.sin(i * 0.52) * r * 0.6; if (!api.blocked(x, y, 40)) return { x: Math.round(x), y: Math.round(y) }; } return { x: MAP.arrive.x + 200, y: MAP.arrive.y }; })();
    const mdIds = () => (trip.accepted || []).filter((id) => id.startsWith("MD01921"));
    const progSum = () => mdIds().reduce((n, id) => n + CM.progressOf(trip, id), 0);
    if (D.paintSeen == null) { D.paintSeen = progSum(); save(); }
    function paintCheck() {
      if (!PZ) return;
      const n = progSum();
      if (n > D.paintSeen) {
        const got = PZ.add(n - D.paintSeen); D.paintSeen = n; save();
        toast(`委託有進展——旁邊的色塊塞給你顏料：${got.map((j) => PZ.label(j)).join("、")}（拿去畫架畫畫）`);
      }
    }
    let draft = null;          // { grid: [], use: { 罐子編號: 用掉幾格 }, sel: 罐子編號, name }
    const jarsLeft = () => { const a = PZ.list(); return a.map((j, i) => ({ ...j, i, left: j.left - (draft?.use[i] || 0) })); };
    function easelPanel(msg) {
      if (!PZ) return;
      draft = draft || { grid: Array(N * N).fill(null), use: {}, sel: null, name: "" };
      const jars = jarsLeft(), filled = draft.grid.filter(Boolean).length;
      const cell = (g, i) => `<button type="button" data-act="pzCell" data-i="${i}" title="${g ? esc(PZ.label(g)) : "空白"}" style="width:40px;height:40px;padding:0;border:0;border-radius:0;cursor:pointer;background:${g ? R.Items.PAINT.colors[g.c].hex : "repeating-linear-gradient(45deg,#d8d3c6 0 6px,#cfc9bb 6px 12px)"}"></button>`;
      const grid = `<div style="display:grid;grid-template-columns:repeat(${N},40px);gap:5px;background:#141416;padding:5px;width:max-content;border-radius:4px">${draft.grid.map(cell).join("")}</div>`;
      const pal = jars.length ? jars.map((j) => `<button type="button" class="${draft.sel === j.i ? "primary" : "ghost"}" data-act="pzJar" data-i="${j.i}" ${j.left <= 0 ? "disabled" : ""} style="display:flex;align-items:center;gap:6px;margin:0 6px 6px 0"><span style="display:inline-block;width:16px;height:16px;border:2px solid #141416;background:${R.Items.PAINT.colors[j.c].hex}"></span>${esc(PZ.label(j))}・剩 ${j.left} 格</button>`).join("")
        : `<p class="tv-note">還沒有顏料。做蒙德里安的委託（每完成一個階段給一罐），或是撿地圖上滴下來的顏料。</p>`;
      const prev = R.Items.previewCustom({ kind: "paint", n: N, grid: draft.grid, name: draft.name || "（未命名）" });
      const charId = trip.char, build = R.Progress?.load(charId), full = (build?.items || []).length >= (R.Items.SLOTS || 6);
      api.openPanel("被認為是畫架的色塊", `${msg ? `<p class="wx-p"><b>${esc(msg)}</b></p>` : ""}<p class="wx-p">「我是一個畫架。……大家都這麼說，所以我就是。來，畫點什麼吧。畫布只有這麼大，顏料要省著用。」</p>
        <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">${grid}
          <div style="flex:1;min-width:240px"><div class="tv-note" style="margin-bottom:6px">選一罐顏料，再點畫布的格子（點已經塗過的格子＝擦掉）。每一罐被認為的特質不一樣：生命力→生命、力量感→攻擊、安定→防禦、神奇→魔力、速度→速度</div>
          <div style="display:flex;flex-wrap:wrap">${pal}</div>
          <div class="tv-note" style="margin:6px 0">已經塗了 ${filled} / ${N * N} 格・預覽：${esc(prev?.desc.replace(/^.*?。/, "") || "")}（${R.Items.RARITY[prev?.rarity || "common"].name}）</div>
          <label class="tv-note">作品名稱 <input id="pzName" maxlength="14" value="${esc(draft.name)}" placeholder="幫這幅畫取個名字" style="width:180px"></label>
          <div class="tv-row" style="margin-top:8px"><button type="button" class="primary" data-act="pzDone" ${filled < 6 || full ? "disabled" : ""}>完成作品（變成寶物）</button><button type="button" class="ghost" data-act="pzClear">全部擦掉</button></div>
          ${full ? `<p class="tv-note" style="color:#c62828">寶物欄滿了（${R.Items.SLOTS} 格），先在酒館整理寶物欄再來</p>` : filled < 6 ? `<p class="tv-note">至少要塗 6 格</p>` : ""}</div></div>`);
    }
    function pzAct(a, b) {
      const nm = document.getElementById("pzName"); if (nm && draft) draft.name = nm.value.trim();
      if (a === "pzJar") { draft.sel = +b.dataset.i; return easelPanel(), true; }
      if (a === "pzCell") {
        const i = +b.dataset.i, g = draft.grid[i];
        if (g) { draft.use[g.j] = (draft.use[g.j] || 1) - 1; draft.grid[i] = null; return easelPanel(), true; }
        if (draft.sel == null) return easelPanel("先選一罐顏料"), true;
        const j = jarsLeft()[draft.sel];
        if (!j || j.left <= 0) return easelPanel("這罐用完了"), true;
        draft.grid[i] = { c: j.c, t: j.t, j: j.i }; draft.use[j.i] = (draft.use[j.i] || 0) + 1;
        return easelPanel(), true;
      }
      if (a === "pzClear") { draft = null; return easelPanel(), true; }
      if (a === "pzDone") {
        const filled = draft.grid.filter(Boolean).length;
        if (filled < 6) return easelPanel("至少要塗 6 格"), true;
        const name = (draft.name || "").slice(0, 14) || "無題";
        const grid = draft.grid.map((g) => (g ? { c: g.c, t: g.t } : null));
        const it = R.Items.createCustom({ kind: "paint", n: N, grid, name, by: R.Profile?.get?.()?.name || "你" });
        const g = R.Items.give(trip.char, it.id);
        // 用掉的顏料
        const jars = PZ.list();
        for (const [k, n] of Object.entries(draft.use)) if (jars[k]) jars[k].left -= n;
        PZ.save(jars.filter((j) => j.left > 0));
        draft = null;
        api.dlg("被認為是畫架的色塊", { name: "畫架", color: "#8a6a3a", face: "架" }, `「${name}」……好畫。色塊們圍過來看，七嘴八舌：「${it.desc.match(/「(.*?)」/)?.[1] || "很有感覺"}」`,
          `<button type="button" class="primary" data-close>收下</button>`, g.text);
        return true;
      }
      return false;
    }
    function drawEasel(now) {
      const { x, y } = EASEL;
      ctx.save();
      ctx.strokeStyle = "#5a3a1a"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x - 40, y + 50); ctx.lineTo(x, y - 70); ctx.lineTo(x + 40, y + 50); ctx.moveTo(x, y - 70); ctx.lineTo(x, y + 56); ctx.stroke();
      ctx.fillStyle = "#141416"; ctx.fillRect(x - 46, y - 64, 92, 76);
      const g = draft?.grid || [], c = 72 / N;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const q = g[j * N + i]; ctx.fillStyle = q ? R.Items.PAINT.colors[q.c].hex : "#c9c4b6"; ctx.fillRect(x - 44 + i * c + 1, y - 62 + j * c + 1, c - 2, c - 2); }
      ctx.restore();
      text("被認為是畫架的色塊", x, y - 84, "#1d1d1f", 12, 900);
      const n = PZ ? PZ.list().length : 0;
      if (n) text(`顏料 ${n} 罐`, x, y + 74, "#5a3a1a", 11, 900);
    }
    function update(dt, now) {
      paintCheck();
      if (api.isBusy()) return;
      refillEyes();
      // 色塊長眼睛：走近就問
      for (const e of D.eyes) {
        if (e.done) continue;
        const b = BL[e.i], near = inRect({ x: b.x - 60, y: b.y - 60, w: b.w + 120, h: b.h + 120 }, me.x, me.y);
        if (!near) { snooze.delete(e.i); continue; }
        if (snooze.has(e.i) || Date.now() < (run.grace || 0)) continue;
        snooze.add(e.i); ask(e); return;
      }
      // 毛毛蟲跟著走（像蟲一樣一伸一縮）
      if (cat.following) {
        const tx = me.x - 40, ty = me.y + 40, d = dist(cat.x, cat.y, tx, ty);
        const sp = (90 + 70 * Math.max(0, Math.sin(now / 160))) * dt;
        if (d > 50) { cat.x += ((tx - cat.x) / d) * Math.min(sp * 2.2, d); cat.y += ((ty - cat.y) / d) * Math.min(sp * 2.2, d); }
        if (stageOf("MD01921-03")?.type === "mdCaterpillar" && inRect(leaf, me.x, me.y) && inRect({ x: leaf.x - 40, y: leaf.y - 40, w: leaf.w + 80, h: leaf.h + 80 }, cat.x, cat.y)) {
          cat.following = false; cat.x = cx(leaf); cat.y = cy(leaf) - 60; save();
          const fin = CM.advance(trip, "MD01921-03"); save();
          toast(fin ? "委託完成！" : "毛毛蟲爬上了「葉子」，開始大口大口地啃——方塊鳥們發現牠了！");
        }
      }
    }
    // ===== 黃色水面：釣方塊魚 =====
    const FISH = [
      { name: "1×1 的紅色方塊魚", tier: "common" }, { name: "1×2 的藍色方塊魚", tier: "common" }, { name: "2×1 的白色方塊魚", tier: "common" },
      { name: "2×2 的黃色方塊魚", tier: "rare", note: "在黃色的水裡幾乎看不見牠" }, { name: "3×1 的藍色長方塊魚", tier: "rare" },
      { name: "黑線鰻", tier: "treasure", note: "一條自己游走的黑線。……牠應該不是那條失蹤的黑線吧？" }, { name: "5×5 的紅色方塊大魚", tier: "treasure" },
    ];
    const FT = { common: { name: "普通", color: "#6b7a8a", w: 70, n: 1, per: 6 }, rare: { name: "稀有", color: "#1a3ae8", w: 24, n: 2, per: 4.5 }, treasure: { name: "珍品", color: "#e8262c", w: 6, n: 3, per: 3.5, gold: 60 } };
    const castsLeft = (b) => 3 - (D.casts[b.id] || 0);
    function rollFish() {
      let r = Math.random() * 100;
      for (const t of ["treasure", "rare", "common"]) { r -= FT[t].w; if (r <= 0) return pick(FISH.filter((f) => f.tier === t)); }
      return FISH[0];
    }
    // 釣魚時的背景：一片平平的黃色水面，被黑線切成格子；遠方是紅藍白的色塊；方塊魚的影子在水下游
    function pondBg(ctx2, now, W, H) {
      const hz = 250;
      ctx2.fillStyle = "#f4f2ea"; ctx2.fillRect(0, 0, W, hz);
      const far = [[0, 60, 180, 190, "#e8262c"], [190, 120, 120, 130, "#f4f2ea"], [320, 30, 260, 220, "#1a3ae8"], [590, 150, 90, 100, "#f4f2ea"], [690, 80, 200, 170, "#f4f2ea"], [900, 40, 140, 210, "#e8262c"], [1050, 140, 230, 110, "#1a3ae8"]];
      for (const [x, y, w, h, c] of far) { ctx2.fillStyle = c; ctx2.fillRect(x, y, w, h); }
      ctx2.fillStyle = "#1d1d1f";
      for (const [x, y, w, h] of far) { ctx2.fillRect(x + w, y - 10, 10, h + 10); ctx2.fillRect(x, y - 10, w + 10, 10); }
      ctx2.fillRect(0, hz - 10, W, 12);
      ctx2.fillStyle = "#f0d800"; ctx2.fillRect(0, hz, W, H - hz);
      // 水面的格子線：輕輕地晃
      ctx2.fillStyle = "rgba(29,29,31,.85)";
      for (let i = 0; i < 6; i++) { const y = hz + 40 + i * i * 14 + Math.sin(now / 700 + i) * 3; ctx2.fillRect(0, y, W, 3 + i); }
      for (let i = -6; i <= 6; i++) { const x0 = 640 + i * 90, x1 = 640 + i * 260; ctx2.beginPath(); ctx2.moveTo(x0 - 1.5, hz); ctx2.lineTo(x0 + 1.5, hz); ctx2.lineTo(x1 + 4, H); ctx2.lineTo(x1 - 4, H); ctx2.closePath(); ctx2.globalAlpha = 0.18; ctx2.fill(); ctx2.globalAlpha = 1; }
      // 方塊魚的影子
      for (let i = 0; i < 5; i++) {
        const x = ((now / (30 + i * 9) + i * 300) % (W + 200)) - 100, y = hz + 90 + i * 70 + Math.sin(now / 500 + i) * 8, s = 18 + i * 5;
        ctx2.fillStyle = "rgba(160,120,0,.35)"; ctx2.fillRect(x, y, s * 1.4, s); ctx2.beginPath(); ctx2.moveTo(x, y + s / 2); ctx2.lineTo(x - s * 0.6, y); ctx2.lineTo(x - s * 0.6, y + s); ctx2.fill();
      }
      // 站的地方：一條粗黑線（路）
      ctx2.fillStyle = "#1d1d1f"; ctx2.fillRect(0, 600, W, 120);
      ctx2.fillStyle = "#f4f2ea"; ctx2.fillRect(0, 690, W, 30); ctx2.fillStyle = "#1d1d1f"; ctx2.fillRect(420, 690, 14, 30); ctx2.fillRect(980, 690, 14, 30);
    }
    function fishAt(b) {
      const left = castsLeft(b);
      if (left <= 0) { toast("這片水面的方塊魚都躲起來了（每一處只能釣三次）"); return; }
      api.dlg(`${b.name}（水面）`, { name: "水面", color: "#1d1d1f", face: "≈", faceBg: "#f0d800" }, "大家都說這塊黃色方形是一片水。你盯著它看——平平的黃色底下，真的有方形的影子游過去。",
        `<button type="button" class="primary" data-act="mdFish" data-b="${b.id}">下竿</button>`, `剩下 ${left} 次。釣到的方塊魚可以帶回酒館請桑恩烤。`);
    }
    function startFish(id) {
      const b = MAP.block(id);
      if (!b || castsLeft(b) <= 0) return;
      closePanel(); api.setBusy(true);
      R.Fishing.start({
        host: api.$("#wxStage"),
        theme: {
          title: `蒙德里安的理想國・${b.name}（大家都說這是水面）`, label: "在黃色水面上釣方塊魚", castText: "下竿了……浮標在黃色的平面上一動也不動（30 秒內會有魚上鉤）",
          roll: rollFish, per: (c) => FT[c.tier].per, drawBg: pondBg, button: "收竿",
          result: (c) => { const T = FT[c.tier]; return `<h3 style="color:${T.color}">${T.name}</h3><p class="fish-name">釣到了${esc(c.name)}！</p>
            <p>${c.note ? `${esc(c.note)}<br>` : ""}拿到 <b>方塊魚 ×${T.n}</b>${T.gold ? `，還有魚肚子裡的 <b>${T.gold} 金幣</b>` : ""}。帶回酒館請桑恩烤吧。</p>`; },
        },
        onDone(c) {
          const T = FT[c.tier];
          D.casts[b.id] = (D.casts[b.id] || 0) + 1;
          api.bark("pondFish");
          const k = BAG.add(run.items, "blockFish", T.n);
          if (T.gold) run.gold += T.gold;
          save(); api.setBusy(false); api.renderHud();
          toast(`釣到了${c.name}：方塊魚 ×${k}${k < T.n ? "（行囊滿了，放不下的放回水裡）" : ""}。這片水面還能釣 ${castsLeft(b)} 次`);
        },
      });
    }

    function click(p) {
      if (dist(p.x, p.y, EASEL.x, EASEL.y - 20) < 70) { if (dist(me.x, me.y, EASEL.x, EASEL.y) < 140) easelPanel(); else api.goTo({ x: EASEL.x, y: EASEL.y + 70 }, { type: "hook", reach: 60, fn: () => easelPanel() }); return true; }
      // 溢出的白縫：用墨水補上
      if (stageOf("MD01921-04")?.type === "mdPaint" && inRect({ x: SEAM.x - 40, y: SEAM.y, w: SEAM.w + 80, h: SEAM.h }, p.x, p.y)) {
        const paint = () => {
          D.painted = true; D.paintT = Date.now();
          BAG.remove(run.items, "borrowedInk", 9);
          if (!MAP.walk.includes(SEAM_ROAD)) MAP.walk.push(SEAM_ROAD);
          api.resetPaths();
          const fin = CM.advance(trip, "MD01921-04"); save();
          toast(fin ? "委託完成！" : "你把三罐墨水沿著白縫倒下去——黑色一路流到底，白縫不見了。紅色長方形和高塔之間，多了一條路");
        };
        const tx = SEAM.x - 30, ty = Math.min(Math.max(me.y, SEAM.y + 40), SEAM.y + SEAM.h - 40);
        if (dist(me.x, me.y, tx, ty) < 100) paint(); else api.goTo({ x: tx, y: ty }, { type: "hook", reach: 80, fn: paint });
        return true;
      }
      // 黃色水面
      const pond = PONDS.find((b) => inRect(b, p.x, p.y));
      if (pond) {
        const near = { x: Math.min(Math.max(me.x, pond.x - 30), pond.x + pond.w + 30), y: Math.min(Math.max(me.y, pond.y - 30), pond.y + pond.h + 30) };
        if (inRect({ x: pond.x - 120, y: pond.y - 120, w: pond.w + 240, h: pond.h + 240 }, me.x, me.y)) fishAt(pond); else api.goTo(near, { type: "hook", reach: 100, fn: () => fishAt(pond) });
        return true;
      }
      const s3 = stageOf("MD01921-03");
      if (s3?.type === "mdCaterpillar" && !cat.following && dist(p.x, p.y, cat.x, cat.y) < 70) {
        const go = () => {
          api.dlg("一條黑線", { name: "一條黑線", color: "#1d1d1f", face: "—", faceBg: "#1d1d1f", faceInk: "#fff" }, "（黑線一伸一縮地蠕動著）我不是線。我是毛毛蟲。毛毛蟲要吃葉子，才能長大。",
            `<button type="button" class="primary" data-act="mdFollow">跟我來</button>`, "牠會跟著你。帶牠到「被認為是葉子」的色塊上（畫布左下角那塊細長的黃色方形）。");
        };
        if (dist(me.x, me.y, cat.x, cat.y) < 110) go(); else api.goTo({ x: cat.x, y: cat.y + 40 }, { type: "hook", reach: 90, fn: go });
        return true;
      }
      if (s3?.type === "mdCocoon" && D.hatchT && Date.now() - D.hatchT > 2600 && dist(p.x, p.y, cx(leaf), cy(leaf) - 60) < 60) {
        const take = () => {
          D.cocoonTaken = true; save();
          const fin = CM.advance(trip, "MD01921-03"); save();
          openPanel("空的繭", `<p class="wx-p">蝴蝶飛走之後，葉子上留下一個空的繭。</p><p class="wx-p">你把它拿起來——繭在手裡慢慢伸直，變回了一條筆直的黑線。</p>`);
          if (fin) toast("委託完成！");
        };
        if (dist(me.x, me.y, cx(leaf), cy(leaf) - 60) < 110) take(); else api.goTo({ x: cx(leaf), y: cy(leaf) }, { type: "hook", reach: 90, fn: take });
        return true;
      }
      if (inRect(rex, p.x, p.y) && !stageOf("MD01921-01")) { toast(trip.done.includes("MD01921-01") ? "一塊 3×5 的黑色方形。安安靜靜的" : "一塊 3×5 的黑色方形。……大家都說它是霸王龍"); return true; }
      return false;
    }
    function act(a, b) {
      if (a.startsWith("pz")) return pzAct(a, b);
      if (a === "mdAns") { answer(b.dataset.a, b.dataset.t); return true; }
      if (a === "mdConvince") {
        const id = b.dataset.n;
        if (!canConvince(id)) return true;
        D.convinced.push(id); save(); syncRex();
        const n = MAP.npcs.find((x) => x.id === id), all = believers().length;
        api.dlg(n.name, n, REPLY[(D.convinced.length - 1) % REPLY.length], "", `已說服 ${D.convinced.length} / ${all} 位居民。${D.convinced.length >= all ? "再也沒有人認為它是霸王龍了。" : "還有人深信它是霸王龍。"}`);
        return true;
      }
      if (a === "mdFish") { startFish(b.dataset.b); return true; }
      if (a === "mdFollow") { closePanel(); cat.following = true; save(); toast("黑線一伸一縮地跟了上來"); return true; }
      return false;
    }
    function onBattleBack() {
      // 擋下天敵之後：結繭、變成蝴蝶飛走
      if (stageOf("MD01921-03")?.type === "mdCocoon" && !D.hatchT) { D.hatchT = Date.now(); setTimeout(() => toast("毛毛蟲吐絲結了繭……繭裂開了，一隻紅色方形的蝴蝶飛了出來！"), 300); }
    }
    onBattleBack();

    // ===== 繪圖 =====
    function eyes(x, y, s, look) {
      const ex = Math.cos(look) * s * 0.3, ey = Math.sin(look) * s * 0.3;
      for (const k of [-1, 1]) {
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x + k * s * 1.4, y, s, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = "#1d1d1f"; ctx.beginPath(); ctx.arc(x + k * s * 1.4 + ex, y + ey, s * 0.45, 0, Math.PI * 2); ctx.fill();
      }
    }
    function drawFloor(now, x0, y0) {
      ctx.fillStyle = "#e8e4d8"; ctx.fillRect(x0, y0, 1280, 720);
      ctx.fillStyle = "#1d1d1f"; for (const w of MAP.walk) ctx.fillRect(w.x, w.y, w.w, w.h);
      for (const b of BL) { if (b.c === "k") continue; ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h); }
      // 溢出的白色縫縫（補好了就是黑色的路；正在補的時候黑色從上往下流）
      const pk = D.painted ? Math.min(1, (Date.now() - (D.paintT || 0)) / 1500) : 0;
      ctx.fillStyle = "#fbfaf4"; ctx.fillRect(SEAM.x + 4, SEAM.y, SEAM.w - 8, SEAM.h);
      if (pk < 1) {
        // 溢出來的白色：一滴一滴往左右流
        for (let i = 0; i < 6; i++) {
          const y = SEAM.y + 40 + i * 70, k = ((now / 2400 + i * 0.37) % 1), len = 6 + k * 28;
          if (y > SEAM.y + SEAM.h * pk) { ctx.globalAlpha = 1 - k * 0.6; ctx.fillRect(SEAM.x + 4 - len, y, len, 6); ctx.fillRect(SEAM.x + SEAM.w - 4, y + 30, len * 0.8, 6); ctx.globalAlpha = 1; }
        }
        if (active("MD01921-04")) { ctx.strokeStyle = `rgba(232,38,44,${0.4 + 0.4 * Math.sin(now / 250)})`; ctx.lineWidth = 3; ctx.strokeRect(SEAM.x - 6, SEAM.y - 6, SEAM.w + 12, SEAM.h + 12); text("溢出的白縫", SEAM.x + SEAM.w / 2, SEAM.y - 14, "#e8262c", 14, 900); }
      }
      if (pk > 0) { ctx.fillStyle = "#1d1d1f"; ctx.fillRect(SEAM.x - 30, SEAM.y, SEAM.w + 60, SEAM.h * pk); }
      // 黃色水面：方形的水波
      for (const b of PONDS) {
        const left = castsLeft(b);
        for (let i = 0; i < 2; i++) {
          const k = ((now / 2200 + i * 0.5 + b.i * 0.13) % 1), w = 20 + k * Math.min(b.w, b.h) * 0.6, h = w * 0.5;
          ctx.strokeStyle = `rgba(29,29,31,${0.35 * (1 - k) * (left > 0 ? 1 : 0.3)})`; ctx.lineWidth = 3; ctx.strokeRect(cx(b) - w / 2, cy(b) - h / 2, w, h);
        }
        if (dist(me.x, me.y, cx(b), cy(b)) < 420) text(left > 0 ? `水面？（還能釣 ${left} 次）` : "水面？（魚都躲起來了）", cx(b), b.y - 12, "#1d1d1f", 13, 900);
      }
      // 消失的黑線：黃色和藍色黏在一起
      const ml = MAP.missingLine, fixed = trip.done.includes("MD01921-03") || D.cocoonTaken;
      if (!fixed) { ctx.fillStyle = "#f0d800"; ctx.fillRect(ml.x, ml.y - 4, ml.w, ml.h / 2 + 4); ctx.fillStyle = "#1a3ae8"; ctx.fillRect(ml.x, ml.y + ml.h / 2, ml.w, ml.h / 2 + 4); }
      // 被認為是葉子的色塊（委託中才看得出葉脈）
      if (active("MD01921-03")) {
        ctx.strokeStyle = "rgba(90,140,40,.55)"; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(cx(leaf), leaf.y + 20); ctx.lineTo(cx(leaf), leaf.y + leaf.h - 20); ctx.stroke();
        for (let y = leaf.y + 70; y < leaf.y + leaf.h - 40; y += 70) { ctx.beginPath(); ctx.moveTo(cx(leaf), y + 30); ctx.lineTo(leaf.x + 20, y); ctx.moveTo(cx(leaf), y + 30); ctx.lineTo(leaf.x + leaf.w - 20, y); ctx.stroke(); }
        text("葉子？", cx(leaf), leaf.y - 14, "#4a7a2a", 14, 900);
      }
      // 霸王龍（黑色方形）：大家深信不疑時，眼睛是紅的
      if (!trip.done.includes("MD01921-01")) {
        const all = believers().length, belief = 1 - D.convinced.length / all;
        if (belief > 0) { ctx.fillStyle = `rgba(232,38,44,${(0.4 + 0.4 * Math.sin(now / 400)) * belief})`; ctx.fillRect(cx(rex) + 40, rex.y + 80, 30, 22); ctx.fillRect(cx(rex) - 70, rex.y + 80, 30, 22); }
      }
      // 長眼睛的色塊（還沒回答的）
      for (const e of D.eyes) {
        if (e.done) continue;
        const b = BL[e.i], near = dist(me.x, me.y, cx(b), cy(b)) < 500;
        if (near) eyes(cx(b), cy(b), Math.min(18, b.w / 6, b.h / 4), Math.atan2(me.y - cy(b), me.x - cx(b)));
      }
    }
    function drawCaterpillar(x, y, now) {
      ctx.fillStyle = "#1d1d1f";
      for (let i = 0; i < 6; i++) { const w = Math.sin(now / 160 - i * 0.8) * 6; ctx.fillRect(x - 50 + i * 18, y - 10 + w, 18, 20); }
      ctx.fillStyle = "#fff"; ctx.fillRect(x + 48, y - 6 + Math.sin(now / 160) * 6, 5, 5);
    }
    function draw(now) {
      drawEasel(now);
      const s3 = stageOf("MD01921-03");
      if (s3 && (s3.type === "mdCaterpillar" || s3.type === "boss")) drawCaterpillar(cat.x, cat.y, now);
      if (s3?.type === "mdCocoon") {
        const x = cx(leaf), y = cy(leaf) - 60, t = D.hatchT ? (Date.now() - D.hatchT) / 1000 : 0;
        ctx.fillStyle = "#1d1d1f"; ctx.beginPath(); ctx.ellipse(x, y, 16, 40, 0, 0, Math.PI * 2); ctx.fill();
        if (t > 0.6 && t < 6) {
          // 紅色方形的蝴蝶飛走
          const k = Math.min(1, (t - 0.6) / 5), bx = x + k * 600, by = y - k * 900 + Math.sin(t * 6) * 20, f = Math.abs(Math.sin(now / 90));
          ctx.fillStyle = "#e8262c"; ctx.fillRect(bx - 34 * f - 4, by - 26, 34 * f, 30); ctx.fillRect(bx + 4, by - 26, 34 * f, 30);
          ctx.fillRect(bx - 22 * f - 4, by + 6, 22 * f, 20); ctx.fillRect(bx + 4, by + 6, 22 * f, 20);
          ctx.fillStyle = "#1d1d1f"; ctx.fillRect(bx - 4, by - 30, 8, 60);
        }
        if (t > 2.6) { ctx.strokeStyle = `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 50, 0, Math.PI * 2); ctx.stroke(); text("空的繭", x, y - 58, "#1d1d1f", 13, 900); }
      }
    }
    function mini(dot, now) {
      if (stageOf("MD01921-04")?.type === "mdPaint") dot(SEAM.x + SEAM.w / 2, SEAM.y + SEAM.h / 2, 4, `rgba(232,38,44,${0.6 + 0.4 * Math.sin(now / 200)})`);
      const s3 = stageOf("MD01921-03");
      if (s3?.type === "mdCaterpillar") dot(cat.following ? cx(leaf) : cat.x, cat.following ? cy(leaf) : cat.y, 4, `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`);
    }
    return { update, click, act, draw, drawFloor, mini, npcExtra, stageText: stText };
  };
})();
