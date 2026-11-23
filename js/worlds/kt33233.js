/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/kt33233.js": "20261123215910" });
// #KT33233 巨人的生態盒：你非常非常小；兩隻大魔王打不了，只能跑
//   恐怖的大魔王・長戟大兜蟲（右盒）：沿路線巡邏，看到你就衝過來
//   邪惡大魔王・長頸鹿鉅鍬形蟲（左盒）：睡在糧倉上，每隔一陣子翻身睜眼；睜眼時看到你就衝過來
//   被抓到：扣 20% 生命、被丟回去（扛著的東西會掉）
//   巨大的果凍（右盒）：大到吃不完，點一下吃一口回 25% 生命；但咬的聲音會被大魔王聽到
//     （兜蟲直接衝過來；鍬形蟲被果凍的味道吵醒，守在牆洞旁邊一陣子，大顎會從洞裡伸過來）
//   KT33233-01 穿過牆上的小洞：帶圓圓到果凍罐 → 扛回西瓜蟲的家
//   KT33233-02 邪惡大魔王的午睡：趁鍬形蟲睡著，從糧倉一粒一粒搬穀子回螞蟻窩
//   KT33233-03 沒蓋好的蓋子：搬三根樹枝到右盒南牆搭斜坡 → 爬進螳螂的盒子，在葉子底下找到小星 → 帶回七星身邊
//     狂暴大魔王・幽靈螳螂：只要你在牠的盒子裡、在視野內，就會主動追過來；靠近時先舉起鐮刀（預告）再揮下
//     誘餌：在螳螂的盒子裡從行囊丟出跳蛛的腳／蚜蟲的蜜露，牠會先去吃（之後地圖連線時，其他玩家也算「目標」：牠追最近的那個）
//   KT33233-04 透氣孔底下：鑽過左盒底下的透氣孔 → 割開蛛絲救出阿銀 → 扛回阿金身邊
//     狡猾大魔王・狼蛛：躲在土裡，每隔一陣子換到你「等一下會走到」的土堆底下；抖動的土堆靠近就會被撲（不會選你腳下的那堆）
(function () {
  const R = (window.RPG = window.RPG || {});
  R.WorldHooks = R.WorldHooks || {};

  R.WorldHooks.KT33233 = function (api) {
    const { MAP, trip, run, me, CM, BAG, toast, inRect, text, save, openPanel, dist, esc } = api;
    const ctx = api.ctx();
    const active = (id) => trip.accepted.includes(id) && !trip.done.includes(id);
    const stageOf = (id) => (active(id) ? CM.stage(trip, id) : null);
    trip.qdata = trip.qdata || {};
    const D = (trip.qdata.box = trip.qdata.box || { follow: false, pot: false, potHome: false, grain: false, grains: 0, bites: 0 });
    Object.assign(D, Object.assign({ twig: null, used: {}, ramp: 0, lady: false, ladyLeaf: null, silkAt: null, cut: 0, bundle: false, seenMan: false, seenTar: false }, D));
    if (D.ladyLeaf == null) D.ladyLeaf = MAP.leaves[Math.floor(Math.random() * MAP.leaves.length)].id;
    if (D.silkAt == null) D.silkAt = Math.floor(Math.random() * MAP.silkSpots.length);
    D.twig = null;                                                   // 換頁之後扛著的樹枝就放下了
    const near = (p, r) => dist(me.x, me.y, p.x, p.y) < r;
    const reach = (p, r, fn) => { if (near(p, r)) fn(); else api.goTo(p, { type: "hook", reach: r - 20, fn }); };
    const L = MAP.left, Rb = MAP.right, HOLE = MAP.hole;
    const TAR = MAP.tar, MAN = MAP.man, RAMP = MAP.ramp, VENT = MAP.vent;
    const inBox = (B, x = me.x, y = me.y) => x >= B.x && x <= B.x + B.w && y >= B.y && y <= B.y + B.h;
    const rampBuilt = () => D.ramp >= 3 || trip.done.includes("KT33233-03");
    const silk = () => MAP.silkSpots[D.silkAt];
    const roundyNpc = MAP.npcs.find((n) => n.id === "roundy");
    const dropNpc = () => { const i = MAP.npcs.indexOf(roundyNpc); if (i >= 0) MAP.npcs.splice(i, 1); };
    const restoreNpc = () => { if (!MAP.npcs.includes(roundyNpc)) MAP.npcs.push(roundyNpc); };
    if (D.follow) dropNpc();
    const pal = { x: me.x - 40, y: me.y + 20 }, lady = { x: me.x - 30, y: me.y + 24 };
    let noise = 0, grace = 0;

    // ===== 兩隻大魔王 =====
    const stag = { x: MAP.stag.x, y: MAP.stag.y, face: Math.PI / 2, st: "sleep", t: Math.random() * 5, guard: 0 };
    const BP = MAP.beetle.path;
    const beetle = { x: BP[0].x, y: BP[0].y, i: 1, face: 0, st: "patrol", t: 0 };
    const kingSpeed = () => me.speed * 0.93;
    const clampBox = (k, box) => { k.x = Math.max(box.x + 60, Math.min(box.x + box.w - 60, k.x)); k.y = Math.max(box.y + 60, Math.min(box.y + box.h - 60, k.y)); };
    function moveTo(k, tx, ty, sp, dt) { const d = dist(k.x, k.y, tx, ty); if (d < 2) return true; const s = Math.min(d, sp * dt); k.face = Math.atan2(ty - k.y, tx - k.x); k.x += Math.cos(k.face) * s; k.y += Math.sin(k.face) * s; return d <= sp * dt; }
    function caught(king, who) {
      const loss = Math.round(api.maxHp() * 0.2);
      run.hp = Math.max(1, run.hp - loss);
      let lost = "";
      if (D.pot) { D.pot = false; lost = "果凍罐掉回了原地。"; }
      if (D.grain) { D.grain = false; lost = "穀子掉了。"; }
      if (D.twig) { D.twig = null; lost = "樹枝掉回了原地。"; }
      if (D.lady) { D.lady = false; lost = "小星嚇得躲回葉子底下了。"; }
      if (D.bundle) { D.bundle = false; lost = "阿銀掉回了原地。"; }
      const to = { stag: { x: 1040, y: 1480 }, beetle: { x: 1280, y: 1010 }, mantis: { x: 2230, y: 1780 }, tarant: { x: 605, y: 1860 } }[who];
      me.x = to.x; me.y = to.y; me.target = null; pal.x = to.x - 40; pal.y = to.y + 20;
      grace = Date.now() + 3500; run.grace = Date.now() + 3000;
      if (king) king.st = who === "mantis" ? "recover" : "return";
      save(); api.renderHud();
      api.bark("kingHit", 3000);
      const how = { stag: "邪惡大魔王的大顎夾住了你——", beetle: "恐怖的大魔王用角把你挑了起來——", mantis: "狂暴大魔王的鐮刀把你夾了起來——", tarant: "土堆炸開，狡猾大魔王從土裡撲了上來——" }[who];
      toast(`${how}你被丟了出去！（生命 -${loss}）${lost}`);
    }
    function updateStag(dt) {
      const k = stag, H0 = MAP.stag.home, safe = Date.now() < grace;
      k.t += dt;
      if (k.st === "sleep" && k.t > 9) { k.st = "awake"; k.t = 0; }
      else if (k.st === "awake") { if (!safe && inBox(L) && dist(k.x, k.y, me.x, me.y) < MAP.stag.vision) { k.st = "chase"; k.t = 0; toast("邪惡大魔王翻身的時候看到你了！快跑！"); api.bark("kingChase"); } else if (k.t > 3.5) { k.st = "sleep"; k.t = 0; } }
      else if (k.st === "chase") {
        if (safe || !inBox(L) || k.t > 4.5 || dist(k.x, k.y, me.x, me.y) > MAP.stag.vision * 1.7) { k.st = "return"; k.t = 0; }
        else { moveTo(k, me.x, me.y, kingSpeed(), dt); clampBox(k, L); if (dist(k.x, k.y, me.x, me.y) < 78) caught(k, "stag"); }
      } else if (k.st === "return") { if (moveTo(k, H0.x, H0.y, 140, dt)) { k.st = "sleep"; k.t = 0; k.face = Math.PI / 2; } }
      else if (k.st === "guard") {
        const g = { x: HOLE.x - 120, y: HOLE.y + HOLE.h / 2 };
        moveTo(k, g.x, g.y, 200, dt); if (dist(k.x, k.y, g.x, g.y) < 4) k.face = 0;
        if (!safe && dist(me.x, me.y, HOLE.x + HOLE.w / 2, HOLE.y + HOLE.h / 2) < 140 && dist(k.x, k.y, g.x, g.y) < 30) caught(k, "stag");
        if (k.t > 10) { k.st = "return"; k.t = 0; }
      }
    }
    function updateBeetle(dt) {
      const k = beetle, safe = Date.now() < grace;
      k.t += dt;
      if (k.st === "patrol") {
        const t = BP[k.i]; if (moveTo(k, t.x, t.y, 85, dt)) k.i = (k.i + 1) % BP.length;
        if (!safe && inBox(Rb) && dist(k.x, k.y, me.x, me.y) < MAP.beetle.vision) { k.st = "chase"; k.t = 0; toast("恐怖的大魔王發現你了！快跑！"); api.bark("kingChase"); }
      } else if (k.st === "chase") {
        if (safe || !inBox(Rb) || k.t > 4.5) { k.st = "return"; k.t = 0; }
        else { moveTo(k, me.x, me.y, kingSpeed(), dt); clampBox(k, Rb); if (dist(k.x, k.y, me.x, me.y) < 82) caught(k, "beetle"); }
      } else if (k.st === "return") { const t = BP[k.i]; if (moveTo(k, t.x, t.y, 120, dt)) { k.st = "patrol"; k.t = 0; } }
    }

    // ===== 狂暴大魔王・幽靈螳螂（螳螂的盒子） =====
    const MT = MAP.mantis;
    const mantis = { x: MT.x, y: MT.y, face: Math.PI, st: "idle", t: 0, arm: 0 };
    const baits = [];                       // 丟出去的誘餌 { x, y, id, eat }
    let aimBait = null;
    // 牠追的「目標」：盒子裡的玩家（之後地圖連線時，其他玩家也放進來——牠追最近的那個）
    const targets = () => (inBox(MAN) ? [me] : []);
    function updateMantis(dt) {
      const k = mantis, safe = Date.now() < grace;
      k.t += dt;
      const sp = me.speed * MT.speed;
      if (k.st === "windup") {
        if (k.t >= MT.windup) {
          k.st = "recover"; k.t = 0; k.arm = 1;
          const hit = k.lock && dist(k.x, k.y, k.lock.x, k.lock.y) < MT.reach + 15;
          if (hit && !safe) caught(k, "mantis");
        }
        return;
      }
      if (k.st === "recover") { k.arm = Math.max(0, k.arm - dt * 2); if (k.t > 1.0) { k.st = "idle"; k.t = 0; } return; }
      // 有誘餌：先去吃最近的那個
      if (baits.length) {
        const b = baits.reduce((a, c) => (dist(k.x, k.y, c.x, c.y) < dist(k.x, k.y, a.x, a.y) ? c : a));
        if (dist(k.x, k.y, b.x, b.y) > 40) { k.st = "lured"; moveTo(k, b.x, b.y, sp * 1.1, dt); }
        else { k.st = "eat"; b.eat += dt; if (b.eat > 5) baits.splice(baits.indexOf(b), 1); }
        clampBox(k, MAN); return;
      }
      const ts = targets().filter((t) => dist(k.x, k.y, t.x, t.y) < MT.vision);
      if (!ts.length || safe) { k.st = "idle"; if (dist(k.x, k.y, MT.x, MT.y) > 20) moveTo(k, MT.x, MT.y, 70, dt); return; }
      const t = ts.reduce((a, c) => (dist(k.x, k.y, c.x, c.y) < dist(k.x, k.y, a.x, a.y) ? c : a));
      if (k.st !== "hunt") { k.st = "hunt"; k.t = 0; toast("狂暴大魔王盯上你了！牠舉起了鐮刀——"); api.bark("kingChase"); }
      const d = dist(k.x, k.y, t.x, t.y);
      if (d < MT.reach) { k.st = "windup"; k.t = 0; k.face = Math.atan2(t.y - k.y, t.x - k.x); k.lock = t; return; }
      moveTo(k, t.x, t.y, sp, dt); clampBox(k, MAN);
    }

    // ===== 狡猾大魔王・狼蛛（狼蛛的盒子，躲在土裡） =====
    const TA = MAP.tarant;
    const tarant = { at: -1, t: 0, pop: 0, popAt: null };
    let lastPos = { x: me.x, y: me.y }, vel = { x: 0, y: 0 };
    function updateTarant(dt) {
      const k = tarant, safe = Date.now() < grace;
      vel.x = vel.x * 0.85 + ((me.x - lastPos.x) / Math.max(dt, 1e-3)) * 0.15; vel.y = vel.y * 0.85 + ((me.y - lastPos.y) / Math.max(dt, 1e-3)) * 0.15;
      lastPos = { x: me.x, y: me.y };
      k.pop = Math.max(0, k.pop - dt);
      if (!inBox(TAR)) { k.at = -1; k.t = TA.every - 0.8; return; }
      k.t += dt;
      if (k.t >= TA.every || k.at < 0) {
        k.t = 0;
        // 狡猾：躲到你「等一下會走到」的土堆底下（但不會選你腳下、太近的那堆）
        const ahead = { x: me.x + vel.x * 1.3, y: me.y + vel.y * 1.3 };
        const c = MAP.mounds.filter((m) => m.i !== k.at && dist(m.x, m.y, me.x, me.y) > TA.near && dist(m.x, m.y, me.x, me.y) < TA.far);
        if (c.length) k.at = c.reduce((a, m) => (dist(m.x, m.y, ahead.x, ahead.y) < dist(a.x, a.y, ahead.x, ahead.y) ? m : a)).i;
      }
      const m = MAP.mounds[k.at];
      if (m && !safe && dist(me.x, me.y, m.x, m.y) < TA.danger) { k.pop = 1.2; k.popAt = { x: m.x, y: m.y }; caught(null, "tarant"); k.at = -1; k.t = 0; }
    }

    // ===== 巨大的果凍 =====
    let lastBite = 0;
    function bite() {
      if (Date.now() - lastBite < 700) return;
      if (run.hp >= api.maxHp()) { toast("肚子已經飽了（生命是滿的）。果凍還是一樣大"); return; }
      lastBite = Date.now();
      api.heal(Math.round(api.maxHp() * 0.25), "偷吃了一口巨大的果凍");
      api.bark("jelly");
      D.bites++; noise += 1; save(); api.renderHud();
      if (noise >= 3) {
        noise = 0;
        if (Math.random() < 0.5 || stag.st === "guard") { beetle.st = "chase"; beetle.t = 0; setTimeout(() => { toast("咕嚕——恐怖的大魔王聽到咬果凍的聲音，衝過來了！"); api.bark("kingChase"); }, 900); }
        else { stag.st = "guard"; stag.t = 0; setTimeout(() => toast("左邊的盒子傳來喀啦喀啦的聲音……邪惡大魔王被果凍的味道吵醒，守在牆洞旁邊！"), 900); }
      }
    }

    // ===== 委託 =====
    function update(dt, now) {
      noise = Math.max(0, noise - dt / 6);
      // 第一次看到巨大的果凍（這輪冒險只說一次）
      if (!api.hasFlag("ktJellySee") && dist(me.x, me.y, MAP.jelly.x, MAP.jelly.y) < MAP.jelly.r + 260) { api.setFlag("ktJellySee"); api.bark("jellySee"); }
      updateStag(dt); updateBeetle(dt); updateMantis(dt); updateTarant(dt);
      if (inBox(MAN) && !D.seenMan) { D.seenMan = true; save(); toast("螳螂的盒子。葉子一片一片的……有一片葉子，在看你。"); }
      if (inBox(TAR) && !D.seenTar) { D.seenTar = true; save(); toast("狼蛛的盒子。土堆一個一個的，很安靜。……太安靜了。抖動的土堆千萬別靠近"); }
      // KT33233-03：樹枝 → 斜坡
      if (stageOf("KT33233-03")?.type === "ktRamp" && D.twig && near(MAP.rampSite, 120)) {
        D.used[D.twig] = 1; D.twig = null; D.ramp++; api.resetPaths();
        const done = D.ramp >= 3; if (done) CM.advance(trip, "KT33233-03");
        save(); toast(done ? "斜坡搭好了！從南牆爬上去，就能從蓋子的縫鑽進螳螂的盒子" : `把樹枝靠在牆上（${D.ramp} / 3）`);
      }
      if (D.lady) { const tx = me.x - 30, ty = me.y + 24; lady.x += (tx - lady.x) * Math.min(1, dt * 5); lady.y += (ty - lady.y) * Math.min(1, dt * 5); }
      if (stageOf("KT33233-03")?.type === "ktLadyHome" && D.lady && near(MAP.ladyMom, 130)) { D.lady = false; CM.advance(trip, "KT33233-03"); save(); toast("小星飛回了媽媽身邊。跟七星說一聲吧"); }
      // KT33233-04：割開蛛絲 → 扛回去
      const s4 = stageOf("KT33233-04")?.type;
      if (s4 === "ktSilk") {
        if (near(silk(), 80)) { D.cut += dt; if (D.cut >= 2) { D.cut = 0; D.bundle = true; CM.advance(trip, "KT33233-04"); save(); toast("蛛絲割開了！阿銀：「……嗚。」扛起他，從透氣孔回去吧（走得很慢）"); } }
        else D.cut = Math.max(0, D.cut - dt);
      }
      if (s4 === "ktBundle" && !D.bundle && near(silk(), 80)) { D.bundle = true; save(); toast("重新扛起了阿銀"); }
      if (s4 === "ktBundle" && D.bundle && near(MAP.npcs.find((n) => n.id === "goldie"), 130)) { D.bundle = false; CM.advance(trip, "KT33233-04"); save(); toast("阿銀回到哥哥身邊了。跟阿金說一聲吧"); }
      const s1 = stageOf("KT33233-01");
      if (s1?.type === "ktEscort" && !D.follow) { D.follow = true; dropNpc(); save(); toast("圓圓一路滾著跟上來"); }
      if (D.follow) { const tx = me.x - 40, ty = me.y + 20; pal.x += (tx - pal.x) * Math.min(1, dt * 5); pal.y += (ty - pal.y) * Math.min(1, dt * 5); }
      if (s1?.type === "ktEscort" && near(MAP.pot, 130)) { CM.advance(trip, "KT33233-01"); D.pot = true; save(); toast("圓圓：「就是這個！」你把果凍罐扛了起來——好重。鑽回左邊的盒子吧"); }
      if (s1?.type === "ktPot" && !D.pot && near(MAP.pot, 100)) { D.pot = true; save(); toast("重新扛起了果凍罐"); }
      if (s1?.type === "ktPot" && D.pot && near(MAP.colony, 150)) {
        D.pot = false; D.potHome = true; D.follow = false; restoreNpc();
        const fin = CM.advance(trip, "KT33233-01"); save();
        toast(fin ? "委託完成！" : "果凍罐回家了！西瓜蟲們圍了上來。跟圓圓說一聲吧");
      }
      if (stageOf("KT33233-02")?.type === "ktGrain" && D.grain && near(MAP.antNest, 130)) {
        D.grain = false; D.grains++;
        const st = stageOf("KT33233-02"), done = D.grains >= st.need;
        if (done) CM.advance(trip, "KT33233-02");
        save(); toast(done ? "第五粒！螞蟻們歡呼了起來（很小聲）。告訴小隊長吧" : `螞蟻們接過穀子扛進窩裡（${D.grains} / ${st.need}）`);
      }
    }
    function click(p) {
      if (aimBait) {
        const id = aimBait; aimBait = null;
        const d = dist(me.x, me.y, p.x, p.y), k = d > 400 ? 400 / d : 1;
        const x = Math.max(MAN.x + 30, Math.min(MAN.x + MAN.w - 30, me.x + (p.x - me.x) * k)), y = Math.max(MAN.y + 30, Math.min(MAN.y + MAN.h - 30, me.y + (p.y - me.y) * k));
        if (!BAG.count(run.items, id)) return true;
        BAG.remove(run.items, id, 1); save();
        baits.push({ x, y, id, eat: 0 });
        toast(`丟出了${BAG.get(id).name}！狂暴大魔王轉過頭去……`);
        return true;
      }
      if (stageOf("KT33233-03")?.type === "ktRamp") {
        const t = MAP.looseTwigs.find((t) => !D.used[t.id] && D.twig !== t.id && dist(p.x, p.y, t.x, t.y) < 70);
        if (t) { reach(t, 80, () => { if (D.twig) return toast("一次只扛得動一根"); D.twig = t.id; save(); toast("扛起一根樹枝。搬到右邊盒子的南牆邊"); }); return true; }
      }
      const s3 = stageOf("KT33233-03")?.type;
      if (s3 === "ktLady" || (s3 === "ktLadyHome" && !D.lady)) {
        const l = MAP.leaves.find((l) => dist(p.x, p.y, l.x, l.y) < 80);
        if (l) {
          reach(l, 90, () => {
            if (l.id !== D.ladyLeaf) return toast("葉子底下只有露水");
            D.lady = true; if (s3 === "ktLady") CM.advance(trip, "KT33233-03"); save();
            toast("找到小星了！牠爬上你的肩膀。從斜坡爬回去吧");
          });
          return true;
        }
      }
      const J = MAP.jelly;
      if (dist(p.x, p.y, J.x, J.y) < J.r + 20) { reach({ x: J.x, y: J.y + J.r + 30 }, 80, bite); return true; }
      if (dist(p.x, p.y, MAP.granary.x, MAP.granary.y) < 90) {
        reach({ x: MAP.granary.x, y: MAP.granary.y + 90 }, 90, () => {
          if (stageOf("KT33233-02")?.type !== "ktGrain") { toast("一大堆穀子。每一粒都比你的頭還大"); return; }
          if (D.grain) { toast("一次只扛得動一粒"); return; }
          D.grain = true; save(); toast("扛起一粒穀子。別吵醒牠……");
        });
        return true;
      }
      return false;
    }
    const speedMul = () => (D.pot ? 0.6 : D.bundle ? 0.65 : D.grain ? 0.8 : D.twig ? 0.85 : 1);
    // 誘餌：只有在螳螂的盒子裡丟才有用
    function useItem(id, it) {
      if (!it.bait) return false;
      if (!inBox(MAN)) { toast(`${it.name}：在螳螂的盒子裡丟出去，可以引開狂暴大魔王`); return true; }
      aimBait = id; toast(`點一下地圖，選要把${it.name}丟到哪裡（400 以內）`); return "close";
    }
    const rectHit = (r, x, y, h) => x + h > r.x && x - h < r.x + r.w && y + h > r.y && y - h < r.y + r.h;
    function blocked(x, y, h) {
      if (!rampBuilt() && y + h > L.y + L.h + 2 && rectHit(RAMP, x, y, h)) return true;
      for (const c of MAP.roundSolids) if (dist(x, y, c.x, c.y) < c.r + h * 0.8) return true; return false; }
    function stageText(id, st) {
      if (!st) return null;
      if (st.type === "ktGrain") return `${st.text}（${D.grains} / ${st.need}${D.grain ? "・扛著一粒" : ""}）`;
      if (st.type === "ktPot" && !D.pot) return "果凍罐掉了！回右邊的盒子重新扛起來";
      if (st.type === "ktRamp") return `${st.text}（${D.ramp} / ${st.need}${D.twig ? "・扛著一根" : ""}）`;
      if (st.type === "ktLadyHome" && !D.lady) return "小星躲回葉子底下了！回螳螂的盒子再找一次";
      if (st.type === "ktSilk" && D.cut > 0) return `${st.text}（割開中 ${Math.round((D.cut / 2) * 100)}%）`;
      if (st.type === "ktBundle" && !D.bundle) return "阿銀掉了！回狼蛛的盒子重新扛起來";
      return null;
    }

    // ===== 繪圖 =====
    function drawFloor(now, x0, y0) {
      ctx.fillStyle = "#c8dce4"; ctx.fillRect(x0, y0, 1280, 720);
      for (const B of [L, Rb, TAR, MAN]) {
        ctx.fillStyle = "#6a4a2e"; ctx.fillRect(B.x, B.y, B.w, B.h);
        let s = B.x; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
        for (let i = 0; i < 260; i++) { ctx.fillStyle = rnd() < 0.5 ? "rgba(40,24,10,.35)" : "rgba(160,120,80,.3)"; ctx.fillRect(B.x + rnd() * B.w, B.y + rnd() * B.h, 4 + rnd() * 8, 3 + rnd() * 6); }
        for (let i = 0; i < 9; i++) {
          const x = B.x + 100 + rnd() * (B.w - 200), y = B.y + 100 + rnd() * (B.h - 200), a = rnd() * Math.PI;
          ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = rnd() < 0.5 ? "rgba(170,120,40,.6)" : "rgba(110,140,50,.55)";
          ctx.beginPath(); ctx.ellipse(0, 0, 160, 60, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "rgba(60,40,10,.4)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-160, 0); ctx.lineTo(160, 0); ctx.stroke(); ctx.restore();
        }
        ctx.strokeStyle = "rgba(220,240,250,.8)"; ctx.lineWidth = 10; ctx.strokeRect(B.x - 5, B.y - 5, B.w + 10, B.h + 10);
      }
      // 中間的玻璃牆＋小洞
      ctx.fillStyle = "rgba(200,230,240,.85)"; ctx.fillRect(L.x + L.w, 0, Rb.x - L.x - L.w, MAP.h);
      ctx.fillStyle = "#4a3420"; ctx.fillRect(HOLE.x, HOLE.y, HOLE.w, HOLE.h);
      ctx.strokeStyle = "#2a1a0a"; ctx.lineWidth = 3; ctx.strokeRect(HOLE.x + 10, HOLE.y, HOLE.w - 20, HOLE.h);
      text("牆上的小洞", HOLE.x + HOLE.w / 2, HOLE.y - 14, "#2a4a5a", 12, 900);
      // 上下盒子之間的玻璃
      ctx.fillStyle = "rgba(200,230,240,.85)"; ctx.fillRect(0, L.y + L.h + 5, MAP.w, TAR.y - L.y - L.h - 10);
      // 透氣孔（狼蛛的盒子）
      ctx.fillStyle = "#4a3420"; ctx.fillRect(VENT.x, VENT.y, VENT.w, VENT.h);
      ctx.fillStyle = "#c8dce4"; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2) ctx.fillRect(VENT.x + 8 + i * 28, VENT.y + 30 + j * 28, 14, 14);
      text("透氣孔（狼蛛的盒子）", VENT.x + VENT.w / 2, VENT.y - 14, "#2a4a5a", 12, 900);
      // 樹枝斜坡（螳螂的盒子）
      if (rampBuilt() || D.ramp > 0) {
        for (let i = 0; i < (rampBuilt() ? 3 : D.ramp); i++) { ctx.save(); ctx.translate(RAMP.x + 30 + i * 40, RAMP.y + RAMP.h / 2); ctx.rotate(0.12 * (i - 1)); ctx.fillStyle = "#7a5a32"; ctx.fillRect(-14, -RAMP.h / 2 - 10, 28, RAMP.h + 20); ctx.fillStyle = "rgba(255,255,255,.15)"; ctx.fillRect(-14, -RAMP.h / 2 - 10, 6, RAMP.h + 20); ctx.restore(); }
      }
      text(rampBuilt() ? "樹枝斜坡（螳螂的盒子）" : "沒蓋好的蓋子（爬不上去）", RAMP.x + RAMP.w / 2, RAMP.y - 14, "#2a4a5a", 12, 900);
      // 狼蛛盒的土堆（狼蛛在下面就會抖）
      const tk = tarant.at;
      for (const m of MAP.mounds) {
        const sh = m.i === tk ? Math.sin(now / 35) * 5 : 0;
        ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(m.x + 6, m.y + 16, 66, 22, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = m.i === tk ? "#8a5a34" : "#7a5634"; ctx.beginPath(); ctx.ellipse(m.x + sh, m.y, 60, 34, 0, Math.PI, 0); ctx.ellipse(m.x + sh, m.y, 60, 12, 0, 0, Math.PI); ctx.fill();
        if (m.i === tk) { for (let i = 0; i < 4; i++) { const a = now / 200 + i * 1.6; ctx.fillStyle = "rgba(60,40,20,.7)"; ctx.fillRect(m.x + Math.cos(a) * 50, m.y - 20 + Math.sin(a * 1.3) * 10 - ((now / 8 + i * 40) % 40), 5, 5); } ctx.strokeStyle = `rgba(232,38,44,${0.3 + 0.2 * Math.sin(now / 120)})`; ctx.lineWidth = 3; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.arc(m.x, m.y, TA.danger, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      }
      // 螳螂盒的葉子
      for (const l of MAP.leaves) { ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(0.5 + l.x * 0.001); ctx.fillStyle = "#5a8a3a"; ctx.beginPath(); ctx.ellipse(0, 0, 90, 44, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#3a5a22"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-90, 0); ctx.lineTo(90, 0); ctx.stroke(); ctx.restore();
        const s3 = stageOf("KT33233-03")?.type; if (s3 === "ktLady" || (s3 === "ktLadyHome" && !D.lady)) text("可以翻開的葉子", l.x, l.y - 56, "#fff", 12, 900); }
      // 散落的樹枝（搭斜坡用）
      if (stageOf("KT33233-03")?.type === "ktRamp") for (const t of MAP.looseTwigs) if (!D.used[t.id] && D.twig !== t.id) { ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(0.6); ctx.fillStyle = "#8a6a3a"; ctx.fillRect(-60, -7, 120, 14); ctx.restore(); text("樹枝", t.x, t.y - 26, "#fff", 12, 900); }
      // 被蛛絲纏住的阿銀
      const s4 = stageOf("KT33233-04")?.type;
      if ((s4 === "ktSilk" || (s4 === "ktBundle" && !D.bundle))) { const S = silk(); silkBall(S.x, S.y, s4 === "ktSilk"); text(s4 === "ktSilk" ? "被蛛絲纏住的阿銀" : "阿銀", S.x, S.y - 40, "#fff", 12, 900); }
      // 誘餌
      for (const b of baits) { ctx.fillStyle = b.id === "honeydew" ? "#d8e88a" : "#3a3a42"; ctx.beginPath(); ctx.arc(b.x, b.y, 10, 0, Math.PI * 2); ctx.fill(); }
      // 樹枝、小石頭
      for (const t of MAP.twigs) { ctx.fillStyle = "#7a5a32"; ctx.fillRect(t.x, t.y, t.w, t.h); ctx.fillStyle = "rgba(255,255,255,.15)"; ctx.fillRect(t.x, t.y, t.w, 6); }
      for (const p of MAP.pebbles) { ctx.fillStyle = "#8a8680"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#a8a49c"; ctx.beginPath(); ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.45, 0, Math.PI * 2); ctx.fill(); }
      // 西瓜蟲的家、螞蟻窩、糧倉
      const C = MAP.colony; ctx.fillStyle = "rgba(120,140,50,.8)"; ctx.beginPath(); ctx.ellipse(C.x, C.y, 120, 60, 0, 0, Math.PI * 2); ctx.fill(); text("西瓜蟲的家", C.x, C.y - 72, "#fff", 12, 900);
      if (D.potHome || trip.done.includes("KT33233-01")) drawPot(C.x + 40, C.y - 10);
      const A = MAP.antNest; ctx.fillStyle = "#8a6a4a"; ctx.beginPath(); ctx.ellipse(A.x, A.y, 90, 46, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#2a1a0a"; ctx.beginPath(); ctx.ellipse(A.x, A.y - 6, 18, 10, 0, 0, Math.PI * 2); ctx.fill(); text("螞蟻窩", A.x, A.y - 58, "#fff", 12, 900);
      const G = MAP.granary; for (let i = 0; i < 12; i++) { ctx.fillStyle = "#e8c87a"; ctx.strokeStyle = "#a8883a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(G.x - 60 + (i % 4) * 40, G.y - 20 + Math.floor(i / 4) * 26, 18, 12, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      text("糧倉", G.x, G.y + 60, "#fff", 12, 900);
      // 巨大的果凍
      const J = MAP.jelly;
      ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(J.x + 14, J.y + J.r * 0.7, J.r * 1.1, J.r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(232,70,110,.82)"; ctx.beginPath(); ctx.ellipse(J.x, J.y, J.r, J.r * 0.82 + Math.sin(now / 400) * 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,200,215,.6)"; ctx.beginPath(); ctx.ellipse(J.x - J.r * 0.35, J.y - J.r * 0.35, J.r * 0.3, J.r * 0.18, -0.4, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < Math.min(8, D.bites); i++) { ctx.fillStyle = "rgba(255,230,235,.7)"; ctx.beginPath(); ctx.arc(J.x - 60 + i * 17, J.y + J.r * 0.62, 8, 0, Math.PI); ctx.fill(); }
      text("巨大的果凍（吃不完）", J.x, J.y - J.r - 14, "#fff", 13, 900);
      // 被搬走的果凍罐
      if (active("KT33233-01") && !D.pot && !D.potHome) drawPot(MAP.pot.x, MAP.pot.y);
    }
    function drawPot(x, y) {
      ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(x, y + 22, 26, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(232,106,138,.9)"; ctx.fillRect(x - 22, y - 20, 44, 40); ctx.fillStyle = "#e8e4d8"; ctx.fillRect(x - 25, y - 28, 50, 10);
      ctx.strokeStyle = "#8a2a4a"; ctx.lineWidth = 2; ctx.strokeRect(x - 22, y - 20, 44, 40);
    }
    function silkBall(x, y, wrapped) {
      ctx.fillStyle = "#3a8a5a"; ctx.beginPath(); ctx.ellipse(x, y, 20, 16, 0, 0, Math.PI * 2); ctx.fill();
      if (wrapped) { ctx.strokeStyle = "rgba(240,240,240,.85)"; ctx.lineWidth = 2; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(x, y, 24, 18, i * 0.45, 0, Math.PI * 2); ctx.stroke(); } }
    }
    function ladybug(x, y) {
      ctx.fillStyle = "#c8282c"; ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1a1a1a"; ctx.beginPath(); ctx.arc(x + 9, y, 5, 0, Math.PI * 2); ctx.fill();
      for (const [dx, dy] of [[-4, -5], [-4, 5], [2, -6], [2, 6], [-7, 0], [4, 0], [-1, 0]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, 1.8, 0, Math.PI * 2); ctx.fill(); }
    }
    function drawMantis(k, now) {
      ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(k.face);
      ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.beginPath(); ctx.ellipse(-20, 20, 120, 40, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#5a3a1a"; ctx.lineWidth = 5;
      for (const sy of [-1, 1]) for (let i = 0; i < 2; i++) { const w = k.st === "hunt" || k.st === "lured" ? Math.sin(now / 90 + i * 2) * 8 : 0; ctx.beginPath(); ctx.moveTo(-50 + i * 40, 0); ctx.lineTo(-60 + i * 44 + w, sy * 70); ctx.lineTo(-80 + i * 50 + w, sy * 96); ctx.stroke(); }
      // 像枯葉一樣的身體（幽靈螳螂）
      ctx.fillStyle = "#8a6038"; ctx.beginPath(); ctx.moveTo(-150, 0); ctx.quadraticCurveTo(-80, -42, 0, -14); ctx.lineTo(0, 14); ctx.quadraticCurveTo(-80, 42, -150, 0); ctx.fill();
      ctx.strokeStyle = "#5a3a1a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-150, 0); ctx.lineTo(0, 0); ctx.stroke();
      ctx.fillStyle = "#6a4a28"; ctx.fillRect(0, -7, 70, 14);                                       // 細長的前胸
      ctx.beginPath(); ctx.moveTo(70, -16); ctx.lineTo(96, 0); ctx.lineTo(70, 16); ctx.closePath(); ctx.fill();   // 三角形的頭
      ctx.fillStyle = "#5a3a1a"; ctx.beginPath(); ctx.moveTo(78, -6); ctx.lineTo(70, -40); ctx.lineTo(86, -8); ctx.fill();   // 頭上的冠
      // 鐮刀：舉起（預告）→ 揮下
      const raise = k.st === "windup" ? Math.min(1, k.t / MT.windup) : 0, strike = k.arm || 0;
      for (const sy of [-1, 1]) {
        ctx.save(); ctx.translate(60, sy * 10); ctx.rotate(sy * (0.5 + raise * 0.9 - strike * 0.9));
        ctx.fillStyle = "#7a5030"; ctx.fillRect(0, -5, 70, 10); ctx.translate(70, 0); ctx.rotate(-sy * (1.6 - strike));
        ctx.fillRect(0, -4, 60, 8); ctx.fillStyle = "#3a2410"; for (let i = 1; i < 5; i++) ctx.fillRect(i * 12, sy * 4, 3, sy * 6);
        ctx.restore();
      }
      ctx.fillStyle = k.st === "hunt" || k.st === "windup" ? "#e8262c" : "#c8a24a"; ctx.beginPath(); ctx.arc(86, -9, 4, 0, Math.PI * 2); ctx.arc(86, 9, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (k.st === "windup") { ctx.fillStyle = `rgba(232,38,44,${0.12 + 0.25 * (k.t / MT.windup)})`; ctx.beginPath(); ctx.moveTo(k.x, k.y); ctx.arc(k.x, k.y, MT.reach + 15, k.face - 0.9, k.face + 0.9); ctx.closePath(); ctx.fill(); }
      const lab = { hunt: "狂暴大魔王（追過來了！）", windup: "狂暴大魔王（舉起鐮刀了！）", lured: "狂暴大魔王（被吃的引開了）", eat: "狂暴大魔王（正在吃）", recover: "狂暴大魔王" }[k.st] || "狂暴大魔王・幽靈螳螂";
      text(lab, k.x, k.y - 90, k.st === "hunt" || k.st === "windup" ? "#e8262c" : "#fff", 13, 900);
    }
    function pillbug(x, y, now, rolling) {
      ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(x, y + 14, 18, 5, 0, 0, Math.PI * 2); ctx.fill();
      if (rolling) { ctx.fillStyle = "#6a7a8a"; ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#3a4a5a"; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x, y, 14, now / 120 + i * 2, now / 120 + i * 2 + 1); ctx.stroke(); } return; }
      ctx.fillStyle = "#6a7a8a"; ctx.beginPath(); ctx.ellipse(x, y, 22, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#3a4a5a"; ctx.lineWidth = 2; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 7, y - 13); ctx.lineTo(x + i * 7, y + 13); ctx.stroke(); }
    }
    function drawBeetle(k, now) {
      const s = 1;
      ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(k.face);
      ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(-10, 20, 120, 60, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#1d1208"; ctx.lineWidth = 7;
      for (const sy of [-1, 1]) for (let i = 0; i < 3; i++) { const w = Math.sin(now / 90 + i * 2) * (k.st === "chase" ? 10 : 4); ctx.beginPath(); ctx.moveTo(-40 + i * 40, sy * 30); ctx.lineTo(-50 + i * 44 + w, sy * 80); ctx.lineTo(-60 + i * 50 + w, sy * 100); ctx.stroke(); }
      ctx.fillStyle = "#b8a050"; ctx.beginPath(); ctx.ellipse(-30, 0, 90 * s, 58, 0, 0, Math.PI * 2); ctx.fill();          // 鞘翅（長戟大兜蟲是黃褐色的）
      ctx.strokeStyle = "#5a4a1a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-120, 0); ctx.lineTo(40, 0); ctx.stroke();
      for (let i = 0; i < 7; i++) { ctx.fillStyle = "rgba(40,30,10,.5)"; ctx.beginPath(); ctx.arc(-90 + i * 18, (i % 2 ? 1 : -1) * 26, 5, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#1d1208"; ctx.beginPath(); ctx.ellipse(62, 0, 36, 40, 0, 0, Math.PI * 2); ctx.fill();               // 前胸
      ctx.beginPath(); ctx.moveTo(70, -10); ctx.lineTo(250, -6); ctx.quadraticCurveTo(262, 0, 250, 6); ctx.lineTo(70, 10); ctx.closePath(); ctx.fill();   // 上面的長角
      ctx.fillStyle = "#3a2a14"; ctx.fillRect(120, -12, 6, 4); ctx.fillRect(160, -10, 6, 4);
      ctx.fillStyle = "#1d1208"; ctx.beginPath(); ctx.moveTo(92, 6); ctx.lineTo(190, 18); ctx.lineTo(184, 26); ctx.lineTo(90, 18); ctx.closePath(); ctx.fill();   // 下面的短角
      ctx.fillStyle = k.st === "chase" ? "#e8262c" : "#c8a24a"; ctx.beginPath(); ctx.arc(96, -16, 5, 0, Math.PI * 2); ctx.arc(96, 16, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (k.st === "patrol") { ctx.strokeStyle = "rgba(232,38,44,.18)"; ctx.lineWidth = 3; ctx.setLineDash([10, 10]); ctx.beginPath(); ctx.arc(k.x, k.y, MAP.beetle.vision, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      text(k.st === "chase" ? "恐怖的大魔王（衝過來了！）" : "恐怖的大魔王・長戟大兜蟲", k.x, k.y - 110, k.st === "chase" ? "#e8262c" : "#fff", 13, 900);
    }
    function drawStag(k, now) {
      const asleep = k.st === "sleep";
      ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(k.face);
      ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(-10, 20, 110, 56, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#1d1208"; ctx.lineWidth = 6;
      for (const sy of [-1, 1]) for (let i = 0; i < 3; i++) { const w = asleep ? 0 : Math.sin(now / 90 + i * 2) * (k.st === "chase" ? 10 : 3); ctx.beginPath(); ctx.moveTo(-40 + i * 36, sy * 28); ctx.lineTo(-48 + i * 40 + w, sy * 76); ctx.lineTo(-56 + i * 46 + w, sy * 96); ctx.stroke(); }
      ctx.fillStyle = "#3a2410"; ctx.beginPath(); ctx.ellipse(-36, 0, 80, 50, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#1d1208"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-116, 0); ctx.lineTo(30, 0); ctx.stroke();
      ctx.fillStyle = "#2a1a0a"; ctx.beginPath(); ctx.ellipse(48, 0, 30, 34, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(70, -18, 36, 36);
      // 很長很長的大顎（像長頸鹿的脖子），尖端往內彎，內側有鋸齒
      const open = asleep ? 0.05 : k.st === "chase" ? 0.18 + Math.abs(Math.sin(now / 120)) * 0.12 : 0.12;
      for (const sy of [-1, 1]) {
        ctx.save(); ctx.translate(100, sy * 12); ctx.rotate(sy * open);
        ctx.fillStyle = "#4a2a10"; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(190, -sy * 4 - 4); ctx.quadraticCurveTo(214, -sy * 14, 206, -sy * 26); ctx.lineTo(188, sy * 2); ctx.lineTo(0, 6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#2a1a0a"; for (let i = 1; i < 6; i++) ctx.fillRect(i * 30, -sy * 8 - 3, 6, 6);
        ctx.restore();
      }
      ctx.fillStyle = asleep ? "#1d1208" : "#e8262c"; ctx.beginPath(); ctx.arc(80, -20, 5, 0, Math.PI * 2); ctx.arc(80, 20, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (asleep) { const z = (now / 900) % 1; ctx.globalAlpha = 1 - z; text("Z", k.x + 60 + z * 30, k.y - 80 - z * 40, "#e8e4d8", 20, 900); text("z", k.x + 90 + z * 20, k.y - 110 - z * 30, "#e8e4d8", 14, 900); ctx.globalAlpha = 1; }
      if (k.st === "awake") { ctx.fillStyle = `rgba(232,38,44,${0.08 + 0.05 * Math.sin(now / 150)})`; ctx.beginPath(); ctx.arc(k.x, k.y, MAP.stag.vision, 0, Math.PI * 2); ctx.fill(); }
      const lab = asleep ? "邪惡大魔王・長頸鹿鉅鍬形蟲（睡著了）" : k.st === "awake" ? "邪惡大魔王（翻身了！別被看到）" : k.st === "guard" ? "邪惡大魔王（守在牆洞旁）" : k.st === "chase" ? "邪惡大魔王（衝過來了！）" : "邪惡大魔王";
      text(lab, k.x, k.y - 104, asleep ? "#fff" : "#e8262c", 13, 900);
    }
    function draw(now) {
      if (D.follow) pillbug(pal.x, pal.y, now, api.moving());
      if (D.pot) drawPot(me.x, me.y - 46);
      if (D.twig) { ctx.save(); ctx.translate(me.x, me.y - 36); ctx.rotate(-0.3); ctx.fillStyle = "#8a6a3a"; ctx.fillRect(-60, -6, 120, 12); ctx.restore(); }
      if (D.lady) ladybug(lady.x, lady.y);
      if (D.bundle) silkBall(me.x, me.y - 44, false);
      if (D.grain) { ctx.fillStyle = "#e8c87a"; ctx.strokeStyle = "#a8883a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(me.x, me.y - 40, 20, 13, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    }
    function drawTop(now) {
      drawStag(stag, now); drawBeetle(beetle, now); drawMantis(mantis, now);
      if (tarant.pop > 0 && tarant.popAt) {
        const P = tarant.popAt, k = Math.min(1, (1.2 - tarant.pop) * 4);
        ctx.fillStyle = "#3a2a1a"; ctx.beginPath(); ctx.ellipse(P.x, P.y - 10, 70 * k, 50 * k, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#2a1a0a"; ctx.lineWidth = 8; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(P.x + Math.cos(a) * 40 * k, P.y + Math.sin(a) * 30 * k); ctx.lineTo(P.x + Math.cos(a) * 120 * k, P.y + Math.sin(a) * 80 * k); ctx.stroke(); }
        ctx.fillStyle = "#e8262c"; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(P.x - 15 + i * 10, P.y - 40 * k, 4, 0, Math.PI * 2); ctx.fill(); }
        text("狡猾大魔王・狼蛛", P.x, P.y - 110, "#e8262c", 13, 900);
      } else if (tarant.at >= 0) { const m = MAP.mounds[tarant.at]; text("土堆在抖……", m.x, m.y - 56, "#e8262c", 12, 900); }
      if (noise > 0.5) text("咕嚕咕嚕……".slice(0, 2 + Math.round(noise) * 2), MAP.jelly.x, MAP.jelly.y + MAP.jelly.r + 40, "#e8262c", 13, 900);
    }
    function drawEnemy(e, now, red) {
      const A = R.EnemyArt; if (!A) return false;
      if (e.kind === "spiders") { for (let i = 0; i < 2; i++) A.jumpSpider(ctx, { r: 13, facing: e.face || 0, alive: true, def: {} }, { x: e.x + (i ? 22 : -22), y: e.y + (i ? 6 : -6) }, now); }
      else if (e.kind === "aphids") { for (let i = 0; i < 3; i++) A.aphid(ctx, { r: 11, x: e.x + i * 7, facing: 0, alive: true, def: {} }, { x: e.x - 24 + i * 24, y: e.y + (i % 2) * 10 }, now); }
      else return false;
      if (red) { ctx.strokeStyle = "#e53935"; ctx.lineWidth = 3; ctx.strokeRect(e.x - 46, e.y - 30, 92, 60); }
      return true;
    }
    function mini(dot, now) {
      const blink = `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`;
      dot(stag.x, stag.y, 6, stag.st === "sleep" ? "#6a4a2a" : "#e8262c");
      dot(beetle.x, beetle.y, 6, beetle.st === "chase" ? "#e8262c" : "#b8a050");
      dot(MAP.jelly.x, MAP.jelly.y, 5, "#e8467e");
      dot(mantis.x, mantis.y, 6, mantis.st === "hunt" || mantis.st === "windup" ? "#e8262c" : "#8a6038");
      if (tarant.at >= 0) { const m = MAP.mounds[tarant.at]; dot(m.x, m.y, 5, "#e8262c"); }
      const s3 = stageOf("KT33233-03")?.type, s4 = stageOf("KT33233-04")?.type;
      if (s3 === "ktRamp") { if (D.twig) dot(MAP.rampSite.x, MAP.rampSite.y, 4, blink); else for (const t of MAP.looseTwigs) if (!D.used[t.id]) dot(t.x, t.y, 4, blink); }
      if (s3 === "ktLady" || (s3 === "ktLadyHome" && !D.lady)) for (const l of MAP.leaves) dot(l.x, l.y, 4, blink);
      if (s3 === "ktLadyHome" && D.lady) dot(MAP.ladyMom.x, MAP.ladyMom.y, 4, blink);
      if (s4 === "ktSilk" || (s4 === "ktBundle" && !D.bundle)) dot(silk().x, silk().y, 4, blink);
      if (s4 === "ktBundle" && D.bundle) { const g = MAP.npcs.find((n) => n.id === "goldie"); dot(g.x, g.y, 4, blink); }
      const s1 = stageOf("KT33233-01")?.type;
      if (s1 === "ktEscort" || (s1 === "ktPot" && !D.pot)) dot(MAP.pot.x, MAP.pot.y, 4, blink);
      if (s1 === "ktPot" && D.pot) dot(MAP.colony.x, MAP.colony.y, 4, blink);
      if (stageOf("KT33233-02")?.type === "ktGrain") dot(D.grain ? MAP.antNest.x : MAP.granary.x, D.grain ? MAP.antNest.y : MAP.granary.y, 4, blink);
    }
    return { update, click, draw, drawFloor, drawTop, drawEnemy, mini, stageText, speedMul, blocked, useItem, dbg: { stag, beetle, mantis, tarant, baits, D } };
  };
})();
