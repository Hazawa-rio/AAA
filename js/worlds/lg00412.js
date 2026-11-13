/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/worlds/lg00412.js": "20261113145157" });
// #LG00412 傳說的道路（A 級）
//   宙斯的噴嚏：在城裡走動時，偶爾地上會亮起一個金色的圈，一下子就會打雷（站在裡面會受傷）
//   LG00412-01 眾神的考驗：向三位哲學家請教 → 到獅子洞跟獅子辯論（三輪，選錯了從頭來）→ 獅子被說動搖了，打一場 → 牠承認自己輸了
//   LG00412-02 失蹤的橄欖枝：抓住在市集亂竄的荷米斯三次（他出現之前，會先有一根羽毛飄下來）→ 把橄欖枝放回雅典娜的祭壇
//   LG00412-03 代罰：替普羅米修斯趕走老鷹三次（這輪冒險孵出了普羅米修斯小雞的話：保護小雞別被吃掉）
//                    → 替西西弗斯把石頭推上山頂 → 站上石頭，和西西弗斯一起高速滑到山底（他只是想分享他的快樂）
(function () {
  const R = (window.RPG = window.RPG || {});
  R.WorldHooks = R.WorldHooks || {};

  R.WorldHooks.LG00412 = function (api) {
    const { MAP, trip, run, me, CH, BAG, toast, text, save, dist, esc } = api;
    const K = R.BKit(api), ctx = api.ctx();
    const Q1 = K.q("LG00412-01"), Q2 = K.q("LG00412-02"), Q3 = K.q("LG00412-03"), Q4 = K.q("LG00412-04"), Q5 = K.q("LG00412-05");
    Q1.learned = Q1.learned || {}; Q2.caught = Q2.caught || 0; Q3.shoo = Q3.shoo || 0;
    const npc = (id) => MAP.npcs.find((n) => n.id === id);
    const chickMode = () => api.hasFlag?.("prometheusChick");
    const inCity = () => me.x < 1800;
    const hurt = (pct, msg) => {
      const n = Math.min(Math.round(api.maxHp() * pct), Math.max(0, run.hp - 1));
      if (n > 0) { run.hp -= n; save(); api.renderHud(); api.fx.push({ k: "num", x: me.x, y: me.y - 40, text: `-${n}`, color: "#e53935", t: performance.now(), dur: 900 }); }
      if (msg) toast(msg);
    };

    // ===== 宙斯的噴嚏（城裡隨機打雷） =====
    let bolt = null, boltNext = performance.now() + 20000;
    function updateBolt(now) {
      if (!bolt && now > boltNext && inCity() && !api.isBusy()) {
        const a = Math.random() * Math.PI * 2, d = Math.random() * 160;
        bolt = { x: me.x + Math.cos(a) * d, y: me.y + Math.sin(a) * d, r: 90, at: now + 1600, hit: false };
      }
      if (bolt && !bolt.hit && now >= bolt.at) {
        bolt.hit = true; boltNext = now + 25000 + Math.random() * 20000;
        api.sfx?.("sounds/boss-electric.mp3");
        if (dist(me.x, me.y, bolt.x, bolt.y) < bolt.r + 10) hurt(0.06, "轟！——天上傳來一聲「哈啾」。宙斯打了個噴嚏");
      }
      if (bolt && bolt.hit && now > bolt.at + 600) bolt = null;
    }

    // ===== LG-01：哲學家、辯論 =====
    const TEACH = {
      socrates: { q: "請教：怎麼讓一頭獅子承認自己輸了？", lines: ["獅子說牠從沒輸過？那很好，我們先別急著反駁。", "先問牠：「你說的『輸』，到底是什麼意思？」", "一個人連自己用的詞都說不清楚，就已經站不穩了。獅子也一樣。"], card: "先問「輸」是什麼意思" },
      diogenes: { q: "請教：怎麼讓一頭獅子承認自己輸了？", lines: ["獅子？我昨天還看到牠在地上打滾，睡得跟死了一樣。", "牠要是說「倒在地上就是輸」——那牠每天都輸給床。", "你去問問牠。順便，你擋到我的陽光了。"], card: "用牠自己的定義，找一個牠「倒在地上」的時候" },
      aristotle: { q: "請教：怎麼讓一頭獅子承認自己輸了？", lines: ["牠說了什麼，你就記住什麼。最後拿牠自己說過的話，推出結論。", "如果牠說「輸，是想做卻沒做到」，而牠昨天想抓羚羊卻沒抓到——", "那麼，結論是什麼？讓牠自己說出來。"], card: "拿牠自己說過的話推出結論" },
    };
    const DEBATE = [
      { lion: "我是最強的。最強的，就不會輸。我從來沒有輸過——一次都沒有！", ok: "什麼叫做「輸」？你說說看。", bad: ["你明明就輸過！大家都看到了！", "我比你強，我現在就證明給你看！"], next: "……輸？輸就是被打倒，倒在地上，爬不起來。這有什麼好問的？" },
      { lion: "輸就是被打倒，倒在地上，爬不起來。這有什麼好問的？", ok: "那你每天睡覺的時候倒在地上，是輸給床了嗎？", bad: ["所以你從來沒被打倒過？好厲害喔。", "那我現在就把你打倒！"], next: "……那、那不算！睡覺是我自己要躺的！輸，是……是想做的事沒做到！" },
      { lion: "輸，是……是想做的事沒做到！", ok: "昨天你想抓那隻羚羊，結果沒抓到。照你剛剛說的，那是什麼？", bad: ["那你想做的事都做到了嗎？", "你說的不對，輸就是輸。"], next: "……………………（獅子張著嘴，很久很久都說不出話來）" },
    ];
    const LION = { name: "不肯認輸的獅子", color: "#a8a090", face: "　", faceBg: "#fbfaf6" };          // 沒有臉
    function npcExtra(n) {
      if (n.id === "kros" && K.is("LG00412-05", "lgFeast") && !BAG.count(run.items, "wineJar")) return `<button type="button" class="ghost dlg-ask" data-act="lgWine"><b>委託</b>：可以借一罈酒給酒神的餐宴嗎？</button>`;
      const T = TEACH[n.id];
      if (T && K.is("LG00412-01", "lgLearn")) return `<button type="button" class="ghost dlg-ask" data-act="lgLearn" data-n="${n.id}"><b>委託</b>：${esc(T.q)}${Q1.learned[n.id] ? "（問過了）" : ""}</button>`;
      return "";
    }
    function learn(id) {
      const T = TEACH[id], n = npc(id);
      Q1.learned[id] = true; save(); api.renderHud();
      api.dlgSeq(n.name, T.lines.map((t) => ({ n, text: t })), `<button type="button" class="primary" data-close>記下來：「${esc(T.card)}」</button>`);
      if (Object.keys(TEACH).every((k) => Q1.learned[k])) K.adv("LG00412-01", "三位哲學家都問過了。去西北邊的獅子洞，跟獅子講道理");
    }
    function debate(i, msg) {
      const D = DEBATE[i];
      const opts = [D.ok, ...D.bad].map((t, k) => ({ t, k })).sort(() => Math.random() - 0.5);
      api.dlg("獅子洞", LION, msg || D.lion, opts.map((o) => `<button type="button" class="ghost dlg-ask" data-act="lgSay" data-i="${i}" data-k="${o.k}">${esc(o.t)}</button>`).join(""), `辯論（${i + 1} / ${DEBATE.length}）`);
    }
    function say(i, k) {
      if (k !== 0) {
        hurt(0.06);
        api.sfx?.("sounds/bear-roar.mp3");
        return api.dlg("獅子洞", LION, "吼——！（獅子一爪拍在你旁邊的地上）少廢話！我是最強的，最強的就不會輸！", `<button type="button" class="primary" data-act="lgDebate">重新開始辯論</button><button type="button" class="ghost" data-close>先離開</button>`, "被吼回來了。想想三位哲學家教你的：先問定義、用牠的定義、拿牠的話推出結論");
      }
      if (i + 1 >= DEBATE.length) {
        api.dlg("獅子洞", LION, `${DEBATE[i].next}……我、我還沒輸！我要用爪子證明給你看！`, `<button type="button" class="primary" data-close>……</button>`, "獅子被說動搖了——牠的傲氣還在，但已經不是刀槍不入");
        K.adv("LG00412-01", "獅子被說動搖了，牠要用爪子證明自己");
        return;
      }
      debate(i + 1, DEBATE[i].next);
    }

    // ===== LG-02：荷米斯 =====
    const H = { spot: null, next: null, showUntil: 0, nextAt: performance.now() + 1500, featherAt: 0 };
    function updateHermes(now) {
      if (!K.is("LG00412-02", "lgHermes")) { H.spot = null; return; }
      if (H.spot && now > H.showUntil) { H.spot = null; H.nextAt = now + 1400; }
      if (!H.spot && !H.next && now > H.nextAt - 1400) { let s; do s = MAP.hermesSpots[Math.floor(Math.random() * MAP.hermesSpots.length)]; while (s === H.last); H.next = s; H.featherAt = now; }
      if (!H.spot && H.next && now > H.nextAt) { H.spot = H.next; H.last = H.next; H.next = null; H.showUntil = now + 2600; }
    }
    function catchHermes() {
      if (!H.spot) return;
      if (dist(me.x, me.y, H.spot.x, H.spot.y) > 170) return toast("太遠了——荷米斯對你揮揮手，咻地不見了");
      Q2.caught++; save(); api.renderHud();
      api.sfx?.("sounds/guan-chime.mp3");
      api.fx.push({ k: "ring", x: H.spot.x, y: H.spot.y, r: 60, color: "#e8c84a", t: performance.now(), dur: 600 });
      H.spot = null; H.nextAt = performance.now() + 2400;
      const HM = { name: "荷米斯", color: "#e8c84a", face: "荷" };
      if (Q2.caught >= 3) {
        BAG.add(run.items, "oliveBranch", 1); save();
        api.dlg("市集", HM, "好啦好啦，被你抓到三次，算你厲害。橄欖枝還你——我只是想看看祭司們找東西的樣子嘛。雅典娜那傢伙，連生氣都很有智慧，好無聊。", `<button type="button" class="primary" data-close>收下橄欖枝</button>`);
        K.adv("LG00412-02", "拿回橄欖枝了。放回雅典娜神殿的祭壇");
      } else toast(["抓到了！……荷米斯從你手裡溜走：「再一次！」（1 / 3）", "又抓到了！「欸欸欸，你怎麼知道我會出現在這裡？」（2 / 3）"][Q2.caught - 1]);
    }
    function altar() {
      if (!K.is("LG00412-02", "lgAltar")) return api.dlg("雅典娜的祭壇", { name: "祭壇", color: "#7a9a4a", face: "壇" }, "大理石的祭壇，中間有一個插橄欖枝的小洞。洞是空的。");
      BAG.remove(run.items, "oliveBranch", 1); save();
      api.sfx?.("sounds/passion-bell.mp3");
      api.dlg("雅典娜的祭壇", { name: "祭壇", color: "#7a9a4a", face: "壇" }, "你把橄欖枝插回祭壇。一陣風從神殿深處吹出來，帶著淡淡的橄欖香——好像有人輕輕點了點頭。", `<button type="button" class="primary" data-close>好</button>`);
      K.adv("LG00412-02", "橄欖枝放回去了。回去找祭司");
    }

    // ===== LG-03：老鷹（普羅米修斯／普羅米修斯小雞） =====
    const P = MAP.prometheus;
    const chick = { x: P.x + 60, y: P.y + 50, tx: P.x + 60, ty: P.y + 50, wait: 0, flee: 0 };
    const eagle = { a: 0, dive: null, nextDive: performance.now() + 4000, away: 0 };
    const eagleTarget = () => (chickMode() ? chick : P);
    function updateEagle(dt, now) {
      // 小雞在普羅米修斯身邊走來走去
      if (chickMode()) {
        if ((chick.wait -= dt) <= 0) { const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 100; chick.tx = P.x + Math.cos(a) * d; chick.ty = P.y + 60 + Math.sin(a) * d * 0.6; chick.wait = 1.5 + Math.random() * 2; }
        const sp = chick.flee > 0 ? 160 : 50; chick.flee -= dt;
        const d = dist(chick.x, chick.y, chick.tx, chick.ty); if (d > 2) { chick.x += ((chick.tx - chick.x) / d) * Math.min(d, sp * dt); chick.y += ((chick.ty - chick.y) / d) * Math.min(d, sp * dt); }
      }
      eagle.a += dt * 0.9;
      if (!K.is("LG00412-03", "lgEagle")) return;
      if (!eagle.dive && now > eagle.nextDive && dist(me.x, me.y, P.x, P.y) < 700) {
        const t = eagleTarget();
        eagle.dive = { x: t.x, y: t.y, at: now + 1700 };
        toast(chickMode() ? "老鷹盯上了小雞——快站到牠身邊！" : "老鷹要俯衝了——快站到普羅米修斯身邊！");
      }
      if (eagle.dive) {
        const t = eagleTarget(); eagle.dive.x = t.x; eagle.dive.y = t.y;          // 小雞會跑，影子跟著牠
        if (now >= eagle.dive.at) {
          const ok = dist(me.x, me.y, t.x, t.y) < 95;
          eagle.dive = null; eagle.nextDive = now + 6500 + Math.random() * 2000;
          if (ok) {
            Q3.shoo++; save(); api.renderHud(); eagle.away = now + 2500;
            api.sfx?.("sounds/wolf-howl-short.mp3");
            api.fx.push({ k: "ring", x: t.x, y: t.y, r: 80, color: "#e8c84a", t: now, dur: 600 });
            if (Q3.shoo >= 3) {
              const PM = { name: "普羅米修斯", color: "#c2471a", face: "普" };
              api.dlg("山崖", PM, chickMode() ? "……那隻小雞，雞冠上燒著的，是我偷來的火嗎？（他看著躲在他腳邊的小雞，笑了）謝謝你保護牠。今天的痛，好像輕了一點。" : "……今天，牠沒能碰到我。（他閉上眼睛，鎖鏈輕輕地響）你知道嗎，被罰的不是痛。是每一天都一樣。今天不一樣。謝謝你。", `<button type="button" class="primary" data-close>……</button>`);
              K.adv("LG00412-03", "趕走老鷹了。回冥河渡口找卡戎");
            } else toast(`你張開手臂擋在前面——老鷹拍拍翅膀飛走了（${Q3.shoo} / 3）`);
          } else {
            api.sfx?.("sounds/wolf-bite.mp3");
            if (chickMode()) { chick.flee = 2; chick.tx = P.x - 30; chick.ty = P.y + 20; toast("老鷹撲了下來——小雞嚇得躲到普羅米修斯的鎖鏈後面，差一點就被叼走了！"); }
            else toast("老鷹撲到普羅米修斯身上……他咬著牙，一聲都沒出");
          }
        }
      }
    }

    // ===== LG-03：西西弗斯的石頭 =====
    const HL = MAP.hill;
    const boulder = { x: HL.cx, y: HL.bottom - 10 };
    let ride = null, rideDone = false;
    const PUSH = 42, BACK = 38;                     // 推石頭的速度（很慢）、沒人推時滾回去的速度
    function updateBoulder(dt) {
      if (ride) return;
      const on = K.is("LG00412-04", "lgBoulder");
      const pushing = on && Math.abs(me.x - boulder.x) < 70 && me.y > boulder.y && me.y - boulder.y < 95;
      if (pushing && me.y - 62 < boulder.y) {
        // 石頭很重：一次只能推一點點，人也被石頭擋著，走不快
        boulder.y = Math.max(HL.top, boulder.y - PUSH * dt);
        if (me.y - 62 < boulder.y) me.y = boulder.y + 62;
        boulder.x += (me.x - boulder.x) * Math.min(1, dt * 2); boulder.x = Math.max(HL.x + 50, Math.min(HL.x + HL.w - 50, boulder.x));
        Q4.pushT = (Q4.pushT || 0) + dt; if (Q4.pushT > 3) { Q4.pushT = 0; api.renderHud(); }
      } else if (!pushing && boulder.y < HL.bottom - 10) {
        boulder.y = Math.min(HL.bottom - 10, boulder.y + BACK * dt);          // 沒人推，就慢慢滾回去
        if (dist(me.x, me.y, boulder.x, boulder.y) < 52 && me.y > boulder.y) { me.y = boulder.y + 56; }
      }
      if (on && boulder.y <= HL.top + 2 && !Q4.topped) {
        Q4.topped = true; save();
        api.dlg("山頂", npc("sisyphus"), "（西西弗斯從後面一路跑上來，喘著氣，笑得比太陽還亮）到了到了！你推得真好！——來，站上來！站到石頭上面！", `<button type="button" class="primary" data-act="lgRide">站上石頭</button>`);
      }
    }
    // 滑行：先沿著山坡越滑越快滑到山腳，再往東邊的平原一路滾過去，慢慢停下來
    const SLIDE = 3400, ROLL = 6200, ROLL_DIST = 1050;
    function startRide() {
      api.closePanel(); api.setBusy(true);
      ride = { t0: performance.now(), from: boulder.y, x0: boulder.x };
      api.sfx?.("sounds/slime-ram.mp3");
    }
    function stepRide(now) {
      if (!ride) return;
      const t = now - ride.t0, bottom = HL.bottom - 10;
      if (t < SLIDE) {
        const k = t / SLIDE, e = k * k;                                            // 越滑越快
        boulder.y = ride.from + (bottom - ride.from) * e;
        boulder.x = ride.x0 + (HL.cx - ride.x0) * k + Math.sin(k * 10) * 26;
      } else {
        const k = Math.min(1, (t - SLIDE) / ROLL), e = 1 - (1 - k) ** 3;              // 往東滾，越滾越慢
        boulder.x = HL.cx + ROLL_DIST * e; boulder.y = bottom - Math.abs(Math.sin(k * 14)) * 22 * (1 - k);   // 一路彈跳
      }
      me.x = boulder.x; me.y = boulder.y - 46; me.target = null;
      if (Math.random() < 0.45) api.fx.push({ k: "ring", x: boulder.x + (Math.random() - 0.5) * 60, y: boulder.y + 40, r: 10, color: "#c8b890", t: now, dur: 400 });
      if (t >= SLIDE + ROLL) {
        ride = null; rideDone = true; api.setBusy(false);
        me.x = boulder.x - 70; me.y = boulder.y + 10;
        npc("sisyphus").x = boulder.x + 80; npc("sisyphus").y = boulder.y + 20;
        api.dlgSeq("平原", [
          { n: npc("sisyphus"), text: "哈哈哈哈哈！！是不是！是不是很快樂！" },
          { n: npc("sisyphus"), text: "大家都以為我在受罰。推上去、滾下來、推上去、滾下來——好可憐喔，對吧？" },
          { n: npc("sisyphus"), text: "可是你看，推上去的時候，每一步都是我自己走的。滾下來的時候……就是剛剛那樣！哈哈！" },
          { n: npc("sisyphus"), text: "我只是想分享這個而已。謝謝你陪我推一次。……要不要再來一次？" },
        ], `<button type="button" class="primary" data-close>下次一定</button>`);
        K.adv("LG00412-04", "和西西弗斯一起滑下山、滾過了平原。跟他說說話吧");
      }
    }

    // ===== LG-05：酒神的餐宴 =====
    const FEAST = ["grapes", "figs", "wineJar"];
    const feastReady = () => FEAST.every((id) => BAG.count(run.items, id));
    function gotFeast(id, msg) {
      if (BAG.count(run.items, id)) return toast("這個已經準備好了");
      BAG.add(run.items, id, 1); save(); api.renderHud();
      toast(`${msg}（${FEAST.filter((x) => BAG.count(run.items, x)).length} / 3）`);
      if (feastReady() && K.is("LG00412-05", "lgFeast")) K.adv("LG00412-05", "三樣都準備好了。把餐宴擺在市集中央");
    }
    function setTable() {
      for (const id of FEAST) BAG.remove(run.items, id, 1);
      Q5.table = true; save();
      api.sfx?.("sounds/guan-chime.mp3");
      api.dlg("市集中央", { name: "酒神的女信徒・邁娜", color: "#7a3a8a", face: "邁" }, "葡萄、無花果、葡萄酒——擺好了！好漂亮！……你聞到了嗎？葡萄的香味。酒神大人來了！", `<button type="button" class="primary" data-close>好</button>`);
      K.adv("LG00412-05", "酒神來了！");
    }

    // ===== 點擊、選項 =====
    function click(p) {
      if (H.spot && K.hit(p, H.spot, 50)) { catchHermes(); return true; }
      if (K.hit(p, MAP.vine, 70)) { K.reach(MAP.vine, 100, () => (K.is("LG00412-05", "lgFeast") ? gotFeast("grapes", "摘了一串葡萄，紫得發亮") : toast("一大片葡萄藤，結滿了葡萄"))); return true; }
      const fig = MAP.stalls.find((x) => x.name === "無花果");
      if (K.hit(p, fig, 60) && K.is("LG00412-05", "lgFeast")) { K.reach(fig, 100, () => gotFeast("figs", "攤販送了你一籃無花果：「酒神大人的餐宴？那不用錢！」")); return true; }
      if (K.hit(p, MAP.feast, 70) && K.is("LG00412-05", "lgTable")) { K.reach(MAP.feast, 110, setTable); return true; }
      if (K.hit(p, MAP.altar, 60)) { K.reach({ x: MAP.altar.x, y: MAP.altar.y + 70 }, 70, altar); return true; }
      if (K.hit(p, MAP.den, 80)) { K.reach({ x: MAP.den.x + 40, y: MAP.den.y + 120 }, 80, denPanel); return true; }
      if (K.hit(p, P, 70) && !K.is("LG00412-03", "lgEagle")) { K.reach({ x: P.x, y: P.y + 90 }, 90, () => api.dlg("山崖", { name: "普羅米修斯", color: "#c2471a", face: "普" }, trip.done.includes("LG00412-03") ? "……謝謝你。今天，我想試著睡一下。" : "（被鎖在山崖上的人抬起頭）……又有人來看熱鬧嗎？", `<button type="button" class="ghost" data-close>……</button>`)); return true; }
      if (K.hit(p, boulder, 50)) { toast(K.is("LG00412-04", "lgBoulder") ? "站到石頭下面（坡道的下方），往山頂走，就能推著它上去" : "一塊很大、很圓、表面被磨得很光滑的石頭"); return true; }
      return false;
    }
    function denPanel() {
      if (trip.done.includes("LG00412-01")) return api.dlg("獅子洞", LION, "（獅子趴在洞口，下巴擱在爪子上）……好啦，我輸了。滿意了吧。……下次再來辯論。", `<button type="button" class="ghost" data-close>好</button>`);
      if (K.is("LG00412-01", "lgDebate")) return debate(0);
      if (K.is("LG00412-01", "lgLearn")) return api.dlg("獅子洞", LION, "人類？來投降的嗎？我是最強的，我從來沒有輸過！", `<button type="button" class="ghost" data-close>先離開</button>`, "先去向三位哲學家請教怎麼辯論");
      api.dlg("獅子洞", LION, "吼——！我是最強的！", `<button type="button" class="ghost" data-close>先離開</button>`);
    }
    function act(a, b) {
      if (a === "lgLearn") { learn(b.dataset.n); return true; }
      if (a === "lgDebate") { debate(0); return true; }
      if (a === "lgSay") { say(+b.dataset.i, +b.dataset.k); return true; }
      if (a === "lgRide") { startRide(); return true; }
      if (a === "lgWine") { api.dlg("東門外", npc("kros"), "酒神大人的餐宴？那當然要用我最好的酒！……拿去拿去。喝的時候記得想起我——不過你大概會什麼都想不起來，哈哈！", `<button type="button" class="primary" data-close>謝謝</button>`); gotFeast("wineJar", "克洛斯把一罈葡萄酒塞到你懷裡"); return true; }
      return false;
    }
    function update(dt, now) { updateBolt(now); updateHermes(now); updateEagle(dt, now); updateBoulder(dt); }
    // 石頭擋路（滑行時不擋）
    function blocked(x, y, h) { return !ride && dist(x, y, boulder.x, boulder.y) < 40 + h * 0.6 && y < boulder.y; }

    // ===== 畫面 =====
    const dot = (x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
    function column(x, y, h) { ctx.fillStyle = "#f4efe4"; ctx.fillRect(x - 14, y - h, 28, h); ctx.fillStyle = "#d8d0bc"; for (let k = -8; k <= 8; k += 6) ctx.fillRect(x + k, y - h, 2, h); ctx.fillStyle = "#e8e2d4"; ctx.fillRect(x - 20, y - h - 8, 40, 10); ctx.fillRect(x - 18, y - 4, 36, 8); }
    function drawFloor(now, x0, y0) {
      // 城：大理石地；荒野：乾草地
      ctx.fillStyle = "#e4dccb"; ctx.fillRect(x0, y0, 1280, 720);
      ctx.fillStyle = "#c8b888"; ctx.fillRect(1836, 40, MAP.w - 1876, MAP.h - 80);
      ctx.strokeStyle = "rgba(150,140,120,.25)"; ctx.lineWidth = 1.5;
      for (let x = Math.max(40, Math.floor(x0 / 100) * 100); x < Math.min(1800, x0 + 1280); x += 100) { ctx.beginPath(); ctx.moveTo(x, Math.max(40, y0)); ctx.lineTo(x, Math.min(2160, y0 + 720)); ctx.stroke(); }
      for (let y = Math.max(40, Math.floor(y0 / 100) * 100); y < Math.min(2160, y0 + 720); y += 100) { ctx.beginPath(); ctx.moveTo(Math.max(40, x0), y); ctx.lineTo(Math.min(1800, x0 + 1280), y); ctx.stroke(); }
      // 市集廣場
      const A = MAP.agora; ctx.fillStyle = "#efe8d8"; ctx.beginPath(); ctx.arc(A.x, A.y, A.r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#cfc4a8"; ctx.lineWidth = 6; ctx.stroke();
      text("市集（Agora）", A.x, A.y - A.r + 30, "#8a7a5a", 15, 900);
      // 餐宴的長桌（擺好以後才有菜）
      if (Q5.table || trip.done.includes("LG00412-05") || K.is("LG00412-05", "lgTable")) {
        const F = MAP.feast; ctx.fillStyle = "#8a6a3a"; ctx.fillRect(F.x - 120, F.y - 24, 240, 48); ctx.fillStyle = "#f4efe4"; ctx.fillRect(F.x - 116, F.y - 20, 232, 40);
        if (Q5.table || trip.done.includes("LG00412-05")) { for (let i = 0; i < 6; i++) dot(F.x - 90 + i * 8, F.y - 4 + (i % 2) * 6, 5, "#6a2a7a"); for (let i = 0; i < 4; i++) dot(F.x - 10 + i * 12, F.y + 2, 7, "#8a4a8a"); ctx.fillStyle = "#7a3a8a"; ctx.fillRect(F.x + 60, F.y - 16, 22, 30); ctx.fillStyle = "#c8a040"; for (const cx of [F.x - 40, F.x + 30, F.x + 100]) { ctx.fillRect(cx - 5, F.y - 18, 10, 8); } }
      }
      for (const s of MAP.stalls) { ctx.fillStyle = "#a8845a"; ctx.fillRect(s.x - 50, s.y - 20, 100, 40); ctx.fillStyle = s.col; ctx.fillRect(s.x - 56, s.y - 34, 112, 16); text(s.name, s.x, s.y + 4, "#fff", 12, 900); }
      // 兩座雕像（宙斯、雅典娜）
      for (const [x, nm] of [[1020, "宙斯像"], [1180, "雅典娜像"]]) { ctx.fillStyle = "#b8a888"; ctx.fillRect(x - 40, 940, 80, 50); K.human(x, 920, "#a89a7a", nm[0], now, { s: 34, fill: "#f4efe4" }); text(nm, x, 1006, "#7a6a4a", 11, 900); }
      // 雅典娜神殿
      const T = MAP.temple; ctx.fillStyle = "#f2ecdc"; ctx.fillRect(T.x, T.y, T.w, T.h);
      for (const w of MAP.templeWalls) { ctx.fillStyle = "#d8ceb4"; ctx.fillRect(w.x, w.y, w.w, w.h); }
      for (let x = T.x + 40; x < T.x + T.w; x += 75) column(x, T.y + T.h + 30, 46);
      text("雅典娜神殿", T.x + T.w / 2, T.y - 14, "#7a6a3a", 16, 900);
      ctx.fillStyle = "#e8e0c8"; ctx.fillRect(MAP.altar.x - 40, MAP.altar.y - 20, 80, 40); ctx.strokeStyle = "#a89a7a"; ctx.lineWidth = 3; ctx.strokeRect(MAP.altar.x - 40, MAP.altar.y - 20, 80, 40);
      if (trip.done.includes("LG00412-02") || K.stage("LG00412-02")?.type === "report") { ctx.strokeStyle = "#5a7a2a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(MAP.altar.x, MAP.altar.y); ctx.lineTo(MAP.altar.x + 6, MAP.altar.y - 46); ctx.stroke(); for (let i = 0; i < 5; i++) { ctx.fillStyle = "#7a9a4a"; ctx.beginPath(); ctx.ellipse(MAP.altar.x + 3 + (i % 2 ? 8 : -8), MAP.altar.y - 12 - i * 8, 7, 3, i % 2 ? 0.5 : -0.5, 0, Math.PI * 2); ctx.fill(); } }
      // 柱廊
      const S = MAP.stoa; ctx.fillStyle = "#ece4d2"; ctx.fillRect(S.x, S.y, S.w, S.h); text("柱廊", S.x + S.w / 2, S.y - 12, "#7a6a3a", 14, 900);
      for (const c of MAP.cols) column(c.x, c.y + 20, 40);
      // 第歐根尼的木桶
      const Bz = MAP.barrel; ctx.fillStyle = "#8a6a3a"; ctx.beginPath(); ctx.ellipse(Bz.x, Bz.y, 40, 28, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#4a3418"; ctx.lineWidth = 3; for (const k of [-14, 0, 14]) { ctx.beginPath(); ctx.moveTo(Bz.x + k, Bz.y - 27); ctx.lineTo(Bz.x + k, Bz.y + 27); ctx.stroke(); }
      // 獅子洞
      const D = MAP.den; ctx.fillStyle = "#8a7a5a"; ctx.beginPath(); ctx.ellipse(D.x, D.y, 170, 120, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#2a2018"; ctx.beginPath(); ctx.ellipse(D.x, D.y + 10, 90, 64, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(D.x - 90, D.y + 10, 180, 14);
      text("獅子洞", D.x, D.y - 130, "#5a4a2a", 14, 900);
      // 東門
      for (const g of MAP.gateWalls) { ctx.fillStyle = "#cfc4a8"; ctx.fillRect(g.x, g.y, g.w, g.h); }
      text("東門・往神話的荒野", 1818, 980, "#7a6a3a", 13, 900);
      // 冥河
      const X = MAP.styx; const sg = ctx.createLinearGradient(X.x, 0, X.x + X.w, 0); sg.addColorStop(0, "#1a2a3a"); sg.addColorStop(0.5, "#2a3a5a"); sg.addColorStop(1, "#1a2a3a");
      ctx.fillStyle = sg; ctx.fillRect(X.x, X.y, X.w, X.h);
      for (let i = 0; i < 8; i++) { ctx.strokeStyle = "rgba(160,180,220,.25)"; ctx.lineWidth = 2; const y = X.y + ((now / 20 + i * 150) % X.h); ctx.beginPath(); ctx.moveTo(X.x + 10, y); ctx.quadraticCurveTo(X.x + X.w / 2, y + 10, X.x + X.w - 10, y); ctx.stroke(); }
      ctx.fillStyle = "#4a3418"; ctx.beginPath(); ctx.moveTo(X.x + 10, 1180); ctx.lineTo(X.x + X.w - 10, 1180); ctx.lineTo(X.x + X.w - 24, 1220); ctx.lineTo(X.x + 24, 1220); ctx.closePath(); ctx.fill();
      text("冥河", X.x + X.w / 2, X.y - 12, "#3a4a6a", 14, 900);
      // 山崖
      ctx.fillStyle = "#8a7a6a"; ctx.beginPath(); ctx.moveTo(2340, 600); ctx.lineTo(2420, 200); ctx.lineTo(2620, 160); ctx.lineTo(2720, 560); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#6a5a4a"; ctx.beginPath(); ctx.arc(2520, 360, 70, 0, Math.PI * 2); ctx.fill();
      text("高加索的山崖", 2520, 150, "#5a4a3a", 14, 900);
      // 西西弗斯的山坡
      const HLd = MAP.hill; const hg = ctx.createLinearGradient(0, HLd.y, 0, HLd.y + HLd.h); hg.addColorStop(0, "#8a7a5a"); hg.addColorStop(1, "#b8a878");
      ctx.fillStyle = hg; ctx.beginPath(); ctx.moveTo(HLd.x, HLd.y + HLd.h); ctx.lineTo(HLd.x + 40, HLd.y); ctx.lineTo(HLd.x + HLd.w - 40, HLd.y); ctx.lineTo(HLd.x + HLd.w, HLd.y + HLd.h); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(90,70,40,.35)"; ctx.lineWidth = 3; ctx.setLineDash([12, 10]); ctx.beginPath(); ctx.moveTo(HLd.cx, HLd.bottom); ctx.lineTo(HLd.cx, HLd.top); ctx.stroke(); ctx.setLineDash([]);
      const PL = MAP.plain; ctx.fillStyle = "#b8c888"; ctx.fillRect(PL.x, PL.y, PL.w, PL.h);
      for (let i = 0; i < 14; i++) { const gx = PL.x + 40 + ((i * 197) % (PL.w - 80)), gy = PL.y + 30 + ((i * 113) % (PL.h - 60)); ctx.strokeStyle = "#7a9a4a"; ctx.lineWidth = 2; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(gx + k * 5, gy); ctx.lineTo(gx + k * 8, gy - 12); ctx.stroke(); } }
      text("東邊的平原", PL.x + PL.w / 2, PL.y - 14, "#5a6a3a", 13, 900);
      // 葡萄藤
      const V = MAP.vine; for (let i = -2; i <= 2; i++) { ctx.fillStyle = "#6a4a2a"; ctx.fillRect(V.x + i * 40 - 3, V.y - 50, 6, 60); }
      ctx.strokeStyle = "#5a8a3a"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(V.x - 90, V.y - 46); ctx.lineTo(V.x + 90, V.y - 46); ctx.stroke();
      for (let i = 0; i < 6; i++) { const gx = V.x - 75 + i * 30; ctx.fillStyle = "#6a9a4a"; ctx.beginPath(); ctx.ellipse(gx, V.y - 54, 12, 7, i, 0, Math.PI * 2); ctx.fill(); for (let k = 0; k < 5; k++) dot(gx - 4 + (k % 2) * 8, V.y - 38 + Math.floor(k / 2) * 7, 4, "#6a2a7a"); }
      text("葡萄藤", V.x, V.y + 26, "#5a6a3a", 12, 900);
      text("山頂", HLd.cx, HLd.top - 30, "#5a4a2a", 13, 900); text("西西弗斯的山坡", HLd.cx, HLd.y + HLd.h + 18, "#5a4a2a", 13, 900);
    }
    function draw(now) {
      stepRide(now);
      // 打雷的預兆
      if (bolt) {
        const k = Math.min(1, 1 - (bolt.at - now) / 1600);
        if (!bolt.hit) { ctx.strokeStyle = `rgba(232,200,60,${0.5 + 0.5 * Math.sin(now / 80)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(bolt.x, bolt.y, bolt.r, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = `rgba(232,200,60,${0.15 + 0.2 * k})`; ctx.fill(); }
        else { ctx.strokeStyle = "#fff6c0"; ctx.lineWidth = 6; ctx.beginPath(); let x = bolt.x, y = bolt.y - 600; ctx.moveTo(x, y); while (y < bolt.y) { x += (Math.random() - 0.5) * 50; y += 60; ctx.lineTo(x, Math.min(y, bolt.y)); } ctx.stroke(); }
      }
      // 獅子
      const D = MAP.den, lionDone = trip.done.includes("LG00412-01");
      R.EnemyArt?.prideLion?.(ctx, { r: lionDone ? 34 : 40, x: 0, alive: true, def: {} }, { x: D.x, y: D.y + 40 }, now);
      if (lionDone) text("（趴著）", D.x, D.y + 100, "#5a4a2a", 11, 900);
      // 荷米斯和羽毛
      if (H.next) { const k = Math.min(1, (now - H.featherAt) / 1400); ctx.save(); ctx.translate(H.next.x + Math.sin(now / 200) * 14, H.next.y - 120 + k * 110); ctx.rotate(Math.sin(now / 250) * 0.6); ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#c8b88a"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, 5, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); }
      if (H.spot) {
        const s = H.spot, fade = Math.min(1, (H.showUntil - now) / 400);
        ctx.globalAlpha = fade;
        K.human(s.x, s.y, "#e8c84a", "荷", now, { s: 30, k: 1 });
        for (const sd of [-1, 1]) { ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.ellipse(s.x + sd * 20, s.y - 16, 10, 5, sd * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(s.x + sd * 12, s.y + 18, 7, 3, sd * 0.5, 0, Math.PI * 2); ctx.fill(); }   // 有翅膀的帽子和涼鞋
        ctx.globalAlpha = 1;
        text("荷米斯", s.x, s.y - 34, "#8a6a1a", 12, 900);
        api.marker(s.x, s.y - 52, now, "#f2c200");
      }
      // 普羅米修斯（被鎖在山崖上）、小雞
      ctx.strokeStyle = "#5a5a62"; ctx.lineWidth = 3; for (const [dx, dy] of [[-50, -30], [50, -30], [-40, 40], [40, 40]]) { ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(P.x + dx, P.y + dy); ctx.stroke(); }
      K.human(P.x, P.y, "#c2471a", "普", now, { s: 34 });
      if (chickMode()) {
        const c = chick; ctx.fillStyle = "#ffe08a"; ctx.beginPath(); ctx.arc(c.x, c.y, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#e8781e"; ctx.beginPath(); ctx.moveTo(c.x + 8, c.y); ctx.lineTo(c.x + 14, c.y + 2); ctx.lineTo(c.x + 8, c.y + 4); ctx.fill();
        ctx.fillStyle = `rgba(255,${120 + Math.sin(now / 90) * 40},40,.95)`; ctx.beginPath(); ctx.ellipse(c.x - 1, c.y - 12, 4, 7 + Math.sin(now / 70) * 2, 0, 0, Math.PI * 2); ctx.fill();   // 雞冠上的火
        text("普羅米修斯", c.x, c.y - 26, "#c2471a", 10, 900);
      }
      // 老鷹：在山崖上空盤旋；俯衝前，地上出現牠的影子
      if (eagle.dive) { const k = 1 - (eagle.dive.at - now) / 1700; ctx.fillStyle = `rgba(0,0,0,${0.15 + 0.3 * k})`; ctx.beginPath(); ctx.ellipse(eagle.dive.x, eagle.dive.y, 60 - 30 * k, 26 - 12 * k, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "rgba(229,57,53,.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(eagle.dive.x, eagle.dive.y, 95, 0, Math.PI * 2); ctx.stroke(); }
      const ex = eagle.dive ? eagle.dive.x + (eagle.dive.at - now) * 0.12 : P.x + Math.cos(eagle.a) * 200, ey = eagle.dive ? eagle.dive.y - (eagle.dive.at - now) * 0.15 : P.y - 160 + Math.sin(eagle.a) * 60;
      if (now > eagle.away) { const fl = Math.sin(now / 110) * 10; ctx.fillStyle = "#4a3a2a"; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - 34, ey - 8 - fl); ctx.lineTo(ex - 12, ey + 4); ctx.lineTo(ex, ey + 10); ctx.lineTo(ex + 12, ey + 4); ctx.lineTo(ex + 34, ey - 8 - fl); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#f4f0e6"; ctx.beginPath(); ctx.arc(ex, ey - 2, 5, 0, Math.PI * 2); ctx.fill(); }
      // 石頭（滑行時西西弗斯也站在上面）
      ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(boulder.x, boulder.y + 40, 46, 12, 0, 0, Math.PI * 2); ctx.fill();
      const rot = boulder.y / 40;
      ctx.save(); ctx.translate(boulder.x, boulder.y); ctx.rotate(rot); ctx.fillStyle = "#9a9080"; ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#6a6050"; ctx.lineWidth = 3; ctx.stroke(); ctx.beginPath(); ctx.arc(-12, -8, 10, 0, Math.PI * 2); ctx.moveTo(18, 12); ctx.arc(14, 12, 6, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      if (ride) { K.human(boulder.x + 26, boulder.y - 44, "#c8784a", "西", now, { s: 28 }); for (let i = 0; i < 6; i++) { ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 2; const yy = boulder.y - 60 - i * 26 - ((now / 3) % 26); ctx.beginPath(); ctx.moveTo(boulder.x - 60 + i * 20, yy); ctx.lineTo(boulder.x - 60 + i * 20, yy - 30); ctx.stroke(); } }
      // 任務標記
      if (K.is("LG00412-01", "lgDebate")) api.marker(D.x, D.y - 160, now, "#f2c200");
      if (K.is("LG00412-02", "lgAltar")) api.marker(MAP.altar.x, MAP.altar.y - 60, now, "#f2c200");
      if (K.is("LG00412-03", "lgEagle") && !eagle.dive) api.marker(P.x, P.y - 70, now, "#f2c200");
      if (K.is("LG00412-04", "lgBoulder")) api.marker(boulder.x, boulder.y - 70, now, "#f2c200");
      if (K.is("LG00412-05", "lgFeast")) { if (!BAG.count(run.items, "grapes")) api.marker(MAP.vine.x, MAP.vine.y - 80, now, "#f2c200"); if (!BAG.count(run.items, "figs")) api.marker(1100, 1290, now, "#f2c200"); }
      if (K.is("LG00412-05", "lgTable")) api.marker(MAP.feast.x, MAP.feast.y - 50, now, "#f2c200");
    }
    function stageText(id, st) {
      if (st?.type === "lgFeast") return `${st.text}（${FEAST.filter((x) => BAG.count(run.items, x)).length} / 3）`;
      if (st?.type === "lgLearn") return `${st.text}（${Object.keys(Q1.learned).length} / 3）`;
      if (st?.type === "lgHermes") return `${st.text}（${Q2.caught} / 3）`;
      if (st?.type === "lgEagle") return chickMode() ? `到高加索的山崖：保護普羅米修斯小雞，別讓老鷹吃掉（${Q3.shoo} / 3）` : `${st.text}（${Q3.shoo} / 3）`;
      if (st?.type === "lgBoulder") return `${st.text}（離山頂還有 ${Math.max(0, Math.round((boulder.y - HL.top) / 10))} 步）`;
      return null;
    }
    function mini(dot, now) {
      const bl = `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`;
      if (K.is("LG00412-01", "lgDebate")) dot(MAP.den.x, MAP.den.y, 5, bl);
      if (K.is("LG00412-02", "lgHermes") && H.spot) dot(H.spot.x, H.spot.y, 5, bl);
      if (K.is("LG00412-02", "lgAltar")) dot(MAP.altar.x, MAP.altar.y, 5, bl);
      if (K.is("LG00412-03", "lgEagle")) dot(P.x, P.y, 5, bl);
      if (K.is("LG00412-04", "lgBoulder")) dot(boulder.x, boulder.y, 5, bl);
      if (K.is("LG00412-05", "lgFeast")) { if (!BAG.count(run.items, "grapes")) dot(MAP.vine.x, MAP.vine.y, 5, bl); if (!BAG.count(run.items, "figs")) dot(1100, 1340, 5, bl); if (!BAG.count(run.items, "wineJar")) dot(npc("kros").x, npc("kros").y, 5, bl); }
      if (K.is("LG00412-05", "lgTable")) dot(MAP.feast.x, MAP.feast.y, 5, bl);
    }
    function drawEnemy(e, now, red) { return K.enemyArt(e, now, red, { birds: ["bronzeBird", 2], birds3: ["bronzeBird", 3], centaurs: ["centaur", 2] }); }
    return { update, click, act, npcExtra, draw, drawFloor, drawEnemy, stageText, mini, blocked, _dbg: { H, eagle, boulder, chick } };
  };
})();
