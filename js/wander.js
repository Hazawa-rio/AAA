/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/wander.js": "20261114045024" });
// 委託以外的探索：每一趟從時空的事件池隨機挑幾個，在隨機的時間、隨機的地點冒出來（地圖上的「？」）
//   R.WanderPools[時空]：{ pick（一趟挑幾個）, every: [最短, 最長]（兩個事件之間隔幾秒）, events: [...] }
//   事件的種類（kind）：
//     pickup：走過去撿（text、reward）；timed：限時出現的東西（life 秒後消失）
//     choice：一個人問你問題／遇到狀況（variants 裡隨機挑一題；options：ok＝答對、battle＝打起來、其他＝再想想）
//     gamble：花金幣碰運氣（cost、table：[{ w, text, reward }]，uses 次）
//     chase：會跑走的東西（靠近就逃、偶爾停下來；追到就拿到 reward）
//     follow：帶一個人到隨機的目的地（destName）
//     ambush：突然冒出來的戰鬥（variant＝地圖戰鬥房間的變體）
//   reward：{ gold, item, n, heal（生命比例）, luck（幸運秒數） }
//   存檔：trip.qdata._wander[時空]（這一趟挑到的事件、正在地圖上的事件、下一個事件冒出來的時間）
(function () {
  const R = (window.RPG = window.RPG || {});
  const rand = (a, b) => a + Math.random() * (b - a);

  R.Wander = {
    make(api, P) {
      const { MAP, trip, run, me, BAG, toast, text, save, dist, esc } = api;
      const ctx = api.ctx();
      const key = trip.scene ? `${trip.world}/${trip.scene}` : trip.world;
      trip.qdata = trip.qdata || {};
      const ALL = (trip.qdata._wander = trip.qdata._wander || {});
      if (!ALL[key]) {
        const ids = P.events.map((e) => e.id).sort(() => Math.random() - 0.5);
        ALL[key] = { queue: ids.slice(0, P.pick || 3), active: [], done: [], next: Date.now() + rand(8, 16) * 1000 };
        save();
      }
      const W = ALL[key];
      const def = (id) => P.events.find((e) => e.id === id);
      const every = P.every || [25, 50];

      // 隨機的地點：走得到、離自己和 NPC 有點距離
      function spot(far = 320) {
        const rects = MAP.walk || [{ x: 0, y: 0, w: MAP.w, h: MAP.h }];
        for (let k = 0; k < 80; k++) {
          const r = rects[Math.floor(Math.random() * rects.length)];
          const x = r.x + 60 + Math.random() * Math.max(10, r.w - 120), y = r.y + 60 + Math.random() * Math.max(10, r.h - 120);
          if (api.blocked(x, y, 22)) continue;
          if (dist(x, y, me.x, me.y) < (k < 60 ? far : 120)) continue;
          if ((MAP.npcs || []).some((n) => dist(x, y, n.x, n.y) < 90)) continue;
          if (MAP.portal && dist(x, y, MAP.portal.x, MAP.portal.y) < 120) continue;
          return { x: Math.round(x), y: Math.round(y) };
        }
        return { x: me.x + 80, y: me.y };
      }
      function spawn() {
        const id = W.queue.shift(), e = def(id);
        if (!e) return;
        const p = spot();
        const a = { id, uid: `${id}_${Date.now()}`, x: p.x, y: p.y, vi: e.variants ? Math.floor(Math.random() * e.variants.length) : 0, until: e.life ? Date.now() + e.life * 1000 : 0, uses: e.uses || 0 };
        if (e.kind === "chase") Object.assign(a, { home: { ...p }, pause: rand(2, 4), fit: 0 });
        W.active.push(a); save();
        toast(e.spawnMsg || `附近好像發生了什麼事……（地圖上的「${e.mark || "？"}」）`);
      }
      const finish = (a) => { W.active = W.active.filter((x) => x !== a); W.done.push(a.id); save(); api.renderHud?.(); };
      // 給獎勵，回傳一段文字
      function grant(rw) {
        if (!rw) return "";
        const out = [];
        if (rw.gold) { run.gold += rw.gold; out.push(`${rw.gold} 金幣`); }
        if (rw.item && BAG) { const k = BAG.add(run.items, rw.item, rw.n || 1); if (k) out.push(`${BAG.get(rw.item).name} ×${k}`); else out.push("（行囊滿了，東西沒拿到）"); }
        if (rw.heal) { const n = Math.round(api.maxHp() * rw.heal); const got = Math.min(n, api.maxHp() - run.hp); if (got > 0) { run.hp += got; out.push(`回復 ${got} 生命`); } }
        if (rw.paint && R.Items?.paints) { const got = R.Items.paints.add(rw.paint); out.push(got.map((j) => `顏料：${R.Items.paints.label(j)}`).join("、")); }
        if (rw.luck) { run.luckUntil = Math.max(run.luckUntil || 0, Date.now()) + rw.luck * 1000; out.push(`幸運 ${Math.round(rw.luck / 60)} 分鐘`); }
        save(); api.renderHud?.();
        return out.length ? `得到：${out.join("、")}` : "";
      }
      const who = (e) => e.npc || { name: e.name, color: e.color || "#8a6a3a", face: e.face || e.icon || (e.name || "？")[0] };

      // ===== 更新 =====
      function update(dt) {
        const now = Date.now();
        if (W.queue.length && now >= W.next && !api.isBusy()) { spawn(); W.next = now + rand(every[0], every[1]) * 1000; }
        for (const a of W.active.slice()) {
          const e = def(a.id);
          if (!e) { finish(a); continue; }
          if (a.until && now > a.until && !a.follow) { W.active = W.active.filter((x) => x !== a); save(); toast(e.goneMsg || `${e.name}不見了……`); continue; }
          if (e.kind === "chase" && !a.caught) {
            if (a.fit > 0) { a.fit -= dt; continue; }
            if ((a.pause -= dt) <= 0) { a.pause = rand(3, 5.5); a.fit = e.rest || 1.4; continue; }
            const d = dist(me.x, me.y, a.x, a.y);
            if (d < 70) { a.caught = true; save(); toast(e.caughtMsg || `抓到${e.name}了！`); open(a); continue; }
            let tx, ty, sp;
            if (d < 260) { tx = a.x + ((a.x - me.x) / d) * 100; ty = a.y + ((a.y - me.y) / d) * 100; sp = e.speed || 165; }
            else { tx = a.home.x + Math.sin(performance.now() / 2000 + a.home.x) * 140; ty = a.home.y + Math.cos(performance.now() / 2600) * 100; sp = 50; }
            const L = Math.hypot(tx - a.x, ty - a.y) || 1, nx = a.x + ((tx - a.x) / L) * sp * dt, ny = a.y + ((ty - a.y) / L) * sp * dt;
            if (!api.blocked(nx, ny, 18)) { a.x = nx; a.y = ny; } else a.home = spot(0);
          }
          if (a.follow) {
            const tx = me.x - 42, ty = me.y + 24;
            a.x += (tx - a.x) * Math.min(1, dt * 4); a.y += (ty - a.y) * Math.min(1, dt * 4);
            if (dist(me.x, me.y, a.dest.x, a.dest.y) < 110) {
              finish(a);
              const msg = grant(e.reward);
              api.dlg(e.title || e.name, who(e), e.endText || "到了！謝謝你。", `<button type="button" class="primary" data-close>不客氣</button>`, msg);
            }
          }
        }
      }

      // ===== 打開事件 =====
      function open(a) {
        const e = def(a.id);
        if (!e || !W.active.includes(a)) return;
        if (e.kind === "pickup" || e.kind === "timed") {
          finish(a);
          const v = e.variants ? e.variants[a.vi] : e;
          const msg = grant(v.reward || e.reward);
          return api.dlg(e.title || e.name, who(e), v.text || e.text || "撿起來了。", `<button type="button" class="primary" data-close>好</button>`, msg);
        }
        if (e.kind === "chase") {
          if (!a.caught) return toast(`${e.name}又跑開了……等牠停下來的時候追上去`);
          finish(a);
          const msg = grant(e.reward);
          return api.dlg(e.title || e.name, who(e), e.text || "抓到了！", `<button type="button" class="primary" data-close>好</button>`, msg);
        }
        if (e.kind === "ambush") { finish(a); toast(e.text || "被包圍了！"); return setTimeout(() => api.ambushBattle(e.variant), 600); }
        if (e.kind === "follow") {
          if (a.follow) return toast(`${e.name}跟在你後面。帶他到「${e.destName}」`);
          return api.dlg(e.title || e.name, who(e), e.text, `<button type="button" class="primary" data-act="wander" data-u="${a.uid}" data-o="go">帶他去${esc(e.destName)}</button><button type="button" class="ghost" data-close>等一下</button>`);
        }
        if (e.kind === "gamble") {
          return api.dlg(e.title || e.name, who(e), e.text, `<button type="button" class="primary" data-act="wander" data-u="${a.uid}" data-o="pay" ${run.gold < e.cost ? "disabled" : ""}>付 ${e.cost} 金幣</button><button type="button" class="ghost" data-close>不用了</button>`, `還可以玩 ${a.uses} 次・你有 ${run.gold} 金幣`);
        }
        if (e.kind === "choice") {
          const v = e.variants[a.vi];
          return api.dlg(e.title || e.name, who(e), a.reply || v.text, v.options.map((o, i) => `<button type="button" class="ghost dlg-ask" data-act="wander" data-u="${a.uid}" data-o="${i}">${esc(o.t)}</button>`).join(""));
        }
      }
      function act(name, b) {
        if (name !== "wander") return false;
        const a = W.active.find((x) => x.uid === b.dataset.u), e = a && def(a.id);
        if (!a || !e) { api.closePanel(); return true; }
        const o = b.dataset.o;
        if (e.kind === "follow" && o === "go") {
          a.follow = true; a.dest = spot(600); save(); api.closePanel();
          toast(`${e.name}跟上來了。目的地：${e.destName}（地圖上的旗子）`);
          return true;
        }
        if (e.kind === "gamble" && o === "pay") {
          if (run.gold < e.cost) return true;
          run.gold -= e.cost; a.uses--;
          let r = Math.random() * e.table.reduce((s, x) => s + x.w, 0), pick = e.table[0];
          for (const x of e.table) { r -= x.w; if (r <= 0) { pick = x; break; } }
          const msg = grant(pick.reward);
          if (a.uses <= 0) finish(a); else save();
          api.renderHud?.();
          api.dlg(e.title || e.name, who(e), pick.text, a.uses > 0 ? `<button type="button" class="primary" data-act="wander" data-u="${a.uid}" data-o="pay" ${run.gold < e.cost ? "disabled" : ""}>再一次（${e.cost} 金幣）</button><button type="button" class="ghost" data-close>夠了</button>` : `<button type="button" class="primary" data-close>好</button>`, [msg, a.uses > 0 ? `還可以玩 ${a.uses} 次` : `${e.name}收攤了`].filter(Boolean).join("・"));
          return true;
        }
        if (e.kind === "choice") {
          const v = e.variants[a.vi], opt = v.options[+o];
          if (opt.ok) {
            finish(a);
            const msg = grant(opt.reward || v.reward || e.reward);
            api.dlg(e.title || e.name, who(e), opt.r || "……說得好。", `<button type="button" class="primary" data-close>好</button>`, msg);
          } else if (opt.battle) {
            finish(a); api.closePanel(); toast(opt.r || "打起來了！");
            setTimeout(() => api.ambushBattle(opt.battle), 700);
          } else { a.reply = opt.r || "……不對。再想想。"; open(a); a.reply = null; }
          return true;
        }
        return true;
      }
      function click(p) {
        const a = W.active.find((x) => !x.follow && dist(p.x, p.y, x.x, x.y) < 50);
        if (!a) return false;
        if (dist(me.x, me.y, a.x, a.y) < 90) open(a);
        else api.goTo({ x: a.x, y: a.y }, { type: "hook", reach: 70, fn: () => open(a) });
        return true;
      }

      // ===== 畫面 =====
      function human(x, y, col, ch, now, k) {
        const s = 26, b = Math.sin(now / 320 + k) * 1.5;
        ctx.fillStyle = "rgba(0,0,0,.15)"; ctx.beginPath(); ctx.ellipse(x, y + s / 2 + 3, s * 0.42, s * 0.16, 0, 0, Math.PI * 2); ctx.fill();
        api.rr(x - s / 2, y - s / 2 + b, s, s, 6); ctx.fillStyle = "#fffaf0"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = col; ctx.stroke();
        text(ch, x, y + 1 + b, col, 12, 900);
      }
      // 不是人的東西（人類一律是方塊）：動物、機台、蘑菇、像素、色塊
      function look(kind, x, y, col, now) {
        const b = Math.sin(now / 280 + x) * 2;
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,.15)"; ctx.beginPath(); ctx.ellipse(x, y + 16, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
        if (kind === "beast") {
          ctx.fillStyle = col; ctx.strokeStyle = "rgba(0,0,0,.45)"; ctx.lineWidth = 2;
          for (const dx of [-9, 9]) { ctx.beginPath(); ctx.moveTo(x + dx - 5, y - 8 + b); ctx.lineTo(x + dx, y - 20 + b); ctx.lineTo(x + dx + 5, y - 8 + b); ctx.closePath(); ctx.fill(); ctx.stroke(); }
          ctx.beginPath(); ctx.ellipse(x, y + b, 18, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#1d1d1f"; ctx.beginPath(); ctx.arc(x - 6, y - 2 + b, 2.5, 0, Math.PI * 2); ctx.arc(x + 6, y - 2 + b, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillRect(x - 10, y + 11 + b, 4, 6); ctx.fillRect(x + 6, y + 11 + b, 4, 6);
        } else if (kind === "machine") {
          api.rr(x - 18, y - 24, 36, 42, 6); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,.45)"; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.beginPath(); ctx.arc(x, y - 8, 10, 0, Math.PI * 2); ctx.fill();
          for (let i = 0; i < 3; i++) { ctx.fillStyle = ["#ff5a5a", "#ffd84a", "#5ab0ff"][i]; ctx.beginPath(); ctx.arc(x - 5 + i * 5, y - 7 + (i % 2) * 4, 3, 0, Math.PI * 2); ctx.fill(); }
          ctx.fillStyle = "#1d1d1f"; ctx.fillRect(x - 6, y + 8, 12, 5);
        } else if (kind === "mushroom") {
          ctx.fillStyle = "#efe4cc"; ctx.fillRect(x - 6, y - 4 + b, 12, 18);
          ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y - 6 + b, 20, 13, 0, Math.PI, 0); ctx.fill();
          ctx.fillStyle = "#fff"; for (const [dx, dy] of [[-9, -12], [4, -15], [12, -9]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy + b, 3, 0, Math.PI * 2); ctx.fill(); }
          ctx.fillStyle = "#1d1d1f"; ctx.beginPath(); ctx.arc(x - 3, y + 3 + b, 1.6, 0, Math.PI * 2); ctx.arc(x + 3, y + 3 + b, 1.6, 0, Math.PI * 2); ctx.fill();
        } else if (kind === "pixel") {
          for (let i = 0; i < 7; i++) { ctx.fillStyle = (Math.floor(now / 150) + i) % 3 ? col : "#ffffff"; ctx.fillRect(x - 15 + (i % 3) * 10, y - 15 + Math.floor(i / 3) * 10 + b, 9, 9); }
        } else if (kind === "block") {
          ctx.fillStyle = col; ctx.fillRect(x - 15, y - 15 + b, 30, 30); ctx.strokeStyle = "#1d1d1f"; ctx.lineWidth = 4; ctx.strokeRect(x - 15, y - 15 + b, 30, 30);
        }
        ctx.restore();
      }
      function draw(now) {
        for (const a of W.active) {
          const e = def(a.id); if (!e) continue;
          const col = e.color || (e.kind === "ambush" ? "#e53935" : "#ff9a2a"), bob = Math.sin(now / 260 + a.x) * 3;
          if (e.kind === "follow" && a.follow) {
            if (e.look) look(e.look, a.x, a.y, who(e).color, now); else human(a.x, a.y, who(e).color, who(e).face, now, a.x);
            const d = a.dest;
            ctx.strokeStyle = "#5a3a22"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(d.x, d.y + 20); ctx.lineTo(d.x, d.y - 40); ctx.stroke();
            ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(d.x, d.y - 40); ctx.lineTo(d.x + 28, d.y - 30); ctx.lineTo(d.x, d.y - 20); ctx.closePath(); ctx.fill();
            text(e.destName, d.x, d.y - 52, "#3a2a1a", 12, 900);
            api.marker(d.x, d.y - 70, now, "#f2c200");
            continue;
          }
          if (e.look) look(e.look, a.x, a.y, who(e).color, now);
          else if (e.npc || e.kind === "choice" || e.kind === "gamble" || e.kind === "follow" || (e.kind === "chase" && e.face)) human(a.x, a.y, who(e).color, who(e).face, now, a.x);
          else {
            ctx.fillStyle = col + "33"; ctx.beginPath(); ctx.arc(a.x, a.y, 24 + Math.sin(now / 300) * 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#fffaf0"; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(a.x, a.y + bob * 0.3, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            text(e.icon || "？", a.x, a.y + 1 + bob * 0.3, col, 13, 900);
          }
          // 頭上的「？」／「！」（黑暗的地圖：畫在黑暗上面，見 drawTop）
          if (!MAP.dark) badge(a, e, now);
          if (a.until) { const k = Math.max(0, (a.until - Date.now()) / (e.life * 1000)); ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(a.x - 22, a.y + 24, 44, 5); ctx.fillStyle = k > 0.3 ? col : "#e53935"; ctx.fillRect(a.x - 22, a.y + 24, 44 * k, 5); }
          if (e.kind === "chase" && a.fit > 0) text(e.restText || "（停下來了！）", a.x, a.y + 38, "#a83a2a", 11, 900);
        }
      }
      function badge(a, e, now) {
        const col = e.color || (e.kind === "ambush" ? "#e53935" : "#ff9a2a"), bob = Math.sin(now / 260 + a.x) * 3;
        if (!a.caught) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(a.x, a.y - 40 + bob, 11, 0, Math.PI * 2); ctx.fill(); text(e.mark || (e.kind === "ambush" ? "！" : "？"), a.x, a.y - 39 + bob, "#fff", 13, 900); }
        text(e.name, a.x, a.y - 60 + bob, MAP.dark ? "#f4eefc" : "#3a2a1a", 11, 900);
      }
      // 黑暗的地圖（例如魔法森林的礦洞）：只把頭上的「？」和名字畫在黑暗上面，事件本身要走近才看得到
      function drawTop(now) { if (MAP.dark) for (const a of W.active) { const e = def(a.id); if (e && !a.follow) badge(a, e, now); } }
      function mini(dot, now) {
        for (const a of W.active) { const e = def(a.id); if (!e) continue; dot(a.x, a.y, 4, e.kind === "ambush" ? "#e53935" : "#ff9a2a"); if (a.follow) dot(a.dest.x, a.dest.y, 5, `rgba(242,194,0,${0.6 + 0.4 * Math.sin(now / 200)})`); }
      }
      return { update, click, act, draw, drawTop, mini, _W: W };
    },
    // 把探索事件接在時空自己的程式後面（畫面、更新都做；點擊、按鈕先給時空自己處理）
    mix(H, X) {
      return Object.assign({}, H, {
        update(dt, now) { H.update?.(dt, now); X.update(dt, now); },
        draw(now) { H.draw?.(now); X.draw(now); },
        drawTop(now) { H.drawTop?.(now); X.drawTop(now); },
        mini(dot, now) { H.mini?.(dot, now); X.mini(dot, now); },
        click(p) { return H.click?.(p) || X.click(p); },
        act(a, b) { return H.act?.(a, b) || X.act(a, b); },
        wander: X,
      });
    },
  };

  // ===================== 各時空的事件池 =====================
  const q = (text, options) => ({ text, options });
  R.WanderPools = {
    // ----- #BH03278 比爾哈頓廣場 -----
    BH03278: { pick: 4, every: [25, 45], events: [
      { id: "soapbox", kind: "choice", name: "街頭演講台", title: "街頭演講台", npc: { name: "台下挑釁的人", color: "#8a5a3a", face: "嗆" }, reward: { gold: 40 },
        variants: [
          q("你上來講什麼？稅金又不是你在繳！", [{ t: "「我也繳稅。所以我才想知道錢花去哪裡。」", ok: true, r: "……台下安靜了一下，然後有人開始鼓掌。挑釁的人摸摸鼻子走了。" }, { t: "「你說得對，大家回家吧。」", r: "台下一片噓聲：「那你上來幹嘛？」" }, { t: "「你才閉嘴！」", battle: "looters", r: "挑釁的人和他的朋友衝上台了！" }]),
          q("抗議有什麼用？議員根本不會看！", [{ t: "「所以我們把問題寫清楚，讓記者、讓每個人都看得到。」", ok: true, r: "「……好吧，寫清楚一點。」他把手上的寶特瓶放下了。" }, { t: "「他不看，我們就砸他的店！」", battle: "looters", r: "旁邊幾個人跟著起鬨——場面失控了！" }, { t: "「對啊，沒用。」", r: "「那你站在上面幹嘛？」……" }]),
          q("警察都是壞人！大家衝過去！", [{ t: "「封鎖線後面的人也在咳嗽。我們要的是答案，不是傷口。」", ok: true, r: "衝在最前面的人停了下來。……有人遞了一瓶水給對面的警察。" }, { t: "「衝啊！」", battle: "looters3", r: "人群往前湧——你被捲進混戰裡了！" }, { t: "「……」（沉默）", r: "沒有人聽你的。挑釁的人喊得更大聲了。" }]),
        ] },
      { id: "lostKid", kind: "follow", name: "走失的小孩", npc: { name: "走失的小孩", color: "#d86a8a", face: "童" }, destName: "穿紅外套的媽媽",
        text: "（小孩拉著你的衣角，哭得上氣不接下氣）……我找不到媽媽。人好多……媽媽穿紅色的外套。", endText: "「媽媽！」小孩撲進穿紅外套的女人懷裡。女人一直向你鞠躬：「謝謝、謝謝……這些給你，路上小心瓦斯。」", reward: { gold: 25, item: "potionHp" } },
      { id: "snatch", kind: "chase", name: "搶包包的人", face: "搶", npc: { name: "搶包包的人", color: "#6a3a2a", face: "搶" }, speed: 170, restText: "（被瓦斯嗆到了！）", caughtMsg: "抓住搶包包的人了！",
        text: "你把包包搶了回來。路過的外送員跑過來：「那是我的！裡面是今天的營業額……謝謝你！」", reward: { gold: 55 } },
      { id: "medkit", kind: "timed", life: 40, name: "掉在地上的醫療包", icon: "＋", color: "#c84a4a", text: "一個掉在地上的志工醫療包。裡面還有一瓶藥水。", reward: { item: "potionHp" }, goneMsg: "地上的醫療包被別人撿走了" },
      { id: "scratch", kind: "gamble", uses: 3, cost: 10, name: "書報攤的刮刮樂", npc: { name: "書報攤的老龐", color: "#8a6a3a", face: "龐" },
        text: "「刮刮樂，一張十塊。革命的時候特別好賣——大家都想翻身嘛。」",
        table: [{ w: 50, text: "（刮開……銘謝惠顧。）「下一張會中的。」" }, { w: 32, text: "（刮開……中了二十！）「看吧！」", reward: { gold: 20 } }, { w: 14, text: "（刮開……兌換獎品：一瓶魔力藥水。）", reward: { item: "potionMp" } }, { w: 4, text: "（刮開……頭獎！）老龐的眼鏡掉了下來：「我在這裡賣了三十年……」", reward: { gold: 120 } }] },
      { id: "riot", kind: "ambush", name: "趁亂洗劫的人", variant: "looters", text: "一群人砸破了旁邊的店——他們看到你了！" },
    ] },
    // ----- #CD02016 童年時的黑市 -----
    CD02016: { pick: 4, every: [25, 45], events: [
      { id: "gacha", kind: "gamble", look: "machine", uses: 3, cost: 15, name: "扭蛋機", npc: { name: "扭蛋機", color: "#e85aa8", face: "蛋" },
        text: "一台掉漆的扭蛋機。投幣口旁邊貼著：「2016 年限定・一次一個童年」。",
        table: [{ w: 38, text: "（喀啦喀啦——）一顆裝著「暑假最後一天」的扭蛋。", reward: { item: "memoryToken" } }, { w: 27, text: "（喀啦喀啦——）扭出一顆空殼。裡面只有一張紙條：「長大了」。" }, { w: 25, text: "（喀啦喀啦——）扭出一瓶彈珠汽水口味的藥水。", reward: { item: "potionHp" } }, { w: 10, text: "（喀啦喀啦——）扭蛋裡塞滿了遊戲幣！", reward: { gold: 60 } }] },
      { id: "quiz", kind: "choice", name: "彈珠攤的老闆", npc: { name: "彈珠攤的老闆", color: "#4a8ac8", face: "珠" }, reward: { item: "memoryToken" },
        variants: [
          q("答對了送你一顆回憶：《Pokémon GO》是哪一年上市的？", [{ t: "2014 年", r: "「太早啦！那時候大家還在玩別的。」" }, { t: "2016 年", ok: true, r: "「對！那年夏天，全世界的人都在路上走來走去。」" }, { t: "2018 年", r: "「太晚啦！那時候熱潮都過了。」" }]),
          q("答對了送你一顆回憶：動畫電影《你的名字。》在日本上映是哪一年？", [{ t: "2013 年", r: "「不對不對。」" }, { t: "2016 年", ok: true, r: "「對！我到現在還記得那顆彗星。」" }, { t: "2019 年", r: "「那是別部啦。」" }]),
          q("答對了送你一顆回憶：第一代 iPhone 是哪一年發表的？", [{ t: "2007 年", ok: true, r: "「對！那時候還有人說『沒有按鍵怎麼打字』。」" }, { t: "2010 年", r: "「那時候已經第四代了。」" }, { t: "2001 年", r: "「那年發表的是會放音樂的那個。」" }]),
        ] },
      { id: "thief", kind: "chase", name: "偷回憶的小偷", face: "偷", npc: { name: "偷回憶的小偷", color: "#5a5a6a", face: "偷" }, speed: 175, restText: "（抱著罐子喘氣）",
        text: "小偷手上的玻璃罐滾了出來。裡面是兩顆亮晶晶的回憶。「……我只是想要一個暑假而已。」他小聲說。", reward: { item: "memoryToken", n: 2 } },
      { id: "dropMem", kind: "timed", life: 45, name: "掉在地上的童年", icon: "憶", color: "#e8c84a", text: "地上滾著一顆發光的珠子。握在手裡，聞到了暑假午後的西瓜味。", reward: { item: "memoryToken" }, goneMsg: "地上的那顆童年，被別的小孩撿走了" },
      { id: "lostStall", kind: "follow", name: "找不到攤位的攤主", npc: { name: "迷路的攤主", color: "#8a6a3a", face: "攤" }, destName: "他的攤位",
        text: "「我的攤位……明明就在這附近。黑市每天晚上都會換位置，我又忘記今天在哪裡了。」", endText: "「就是這裡！」攤主拍拍棚子，塞給你一把銅板：「謝啦，回憶不能給你，這個可以。」", reward: { gold: 45 } },
      { id: "raid", kind: "ambush", name: "取締小隊", variant: "agents", text: "時代蓋世太保的取締小隊從巷子裡衝出來了！" },
    ] },
    // ----- #ER00119 有點偏執的急診室 -----
    ER00119: { pick: 4, every: [25, 45], events: [
      { id: "bell", kind: "timed", life: 30, name: "響個不停的呼叫鈴", icon: "鈴", color: "#d86a8a", spawnMsg: "叮——叮——有病房的呼叫鈴在響！（地圖上的「？」，要快）",
        text: "你按掉呼叫鈴。病人只是點滴打完了，你幫他換了一袋。「……謝謝。這裡的護理師都在忙著把床擺正。」", reward: { gold: 30, item: "potionHp" }, goneMsg: "呼叫鈴停了……有別人去了吧" },
      { id: "precise", kind: "choice", name: "主治醫師的抽考", npc: { name: "主治醫師・精準", color: "#2a8a7a", face: "精" }, reward: { gold: 45 },
        variants: [
          q("抽考。1 ÷ 3，到小數點第五位。", [{ t: "0.33", r: "「兩位？你是在侮辱這間醫院嗎？」" }, { t: "0.33333", ok: true, r: "「……0.33333。完美。你可以在這裡實習。」" }, { t: "三分之一", r: "「我要的是數字，不是感覺。」" }]),
          q("抽考。圓周率，到小數點第五位。", [{ t: "3.14", r: "「3.14？那是小學生的圓。」" }, { t: "3.14159", ok: true, r: "「3.14159。完美的圓。」" }, { t: "3.14160", r: "「四捨五入？在我的手術室裡沒有『差不多』。」" }]),
          q("抽考。0.1 + 0.2，到小數點第五位。", [{ t: "0.30000", ok: true, r: "「0.30000。完美。電腦會算錯，你不會。」" }, { t: "0.3", r: "「後面那四個零呢？」" }, { t: "0.30001", r: "「多出來的那個 1，是你的良心不安嗎？」" }]),
        ] },
      { id: "runaway", kind: "chase", name: "推著點滴架亂跑的病人", face: "跑", npc: { name: "推著點滴架亂跑的病人", color: "#9a7a8a", face: "跑" }, speed: 160, restText: "（點滴架卡住了！）",
        text: "「我、我只是想回家……」你陪他慢慢走回病房。他把枕頭底下的藥水塞給你：「這個，我不需要了。」", reward: { item: "potionMp" } },
      { id: "chart", kind: "pickup", name: "掉在走廊的病歷", icon: "歷", color: "#4a8ac8",
        variants: [{ text: "病歷上寫著：「主訴：打噴嚏一次。處置：全身重新縫合（待完美）。」……你把它交回護理站。", reward: { gold: 20 } }, { text: "病歷的最後一頁，有人用很小的字寫著：「我只是想要一個不完美的醫生。」", reward: { gold: 20 } }] },
      { id: "family", kind: "follow", name: "迷路的家屬", npc: { name: "迷路的家屬", color: "#5a9a5a", face: "家" }, destName: "家人的病床",
        text: "「請問……我先生在哪一床？護理師說『在完美的位置』，我找了一個小時……」", endText: "「老公！」病床上的人虛弱地揮揮手。家屬塞給你一瓶藥水：「醫院的福利社買的，給你。」", reward: { item: "potionHp", gold: 15 } },
      { id: "loose", kind: "ambush", name: "從病房跑出來的病人", variant: "stitched", text: "病房的門被撞開了——被縫合的病人撲了出來！" },
    ] },
    // ----- #MM22330 或許是魔法森林 -----
    MM22330: { pick: 4, every: [25, 45], events: [
      { id: "starcap", kind: "timed", life: 35, name: "稀有的星光菇", icon: "星", color: "#ffe02a", spawnMsg: "礦道的某個角落亮起了星星一樣的光……（限時）",
        text: "一朵傘蓋上有星星斑點的蘑菇。輕輕一碰，它就分成兩朵，掉進你手心。", reward: { item: "glowCap", n: 2 }, goneMsg: "星光菇的光暗下去了……" },
      { id: "soup", kind: "gamble", uses: 3, cost: 12, name: "菇婆的試喝攤", npc: { name: "精靈・菇婆", color: "#5a3a8a", face: "菇" },
        text: "「新口味的蘑菇湯，一碗十二。喝了會發生什麼事？我也不知道，這就是試喝的意思呀。」",
        table: [{ w: 35, text: "（咕嚕……）身體暖了起來。", reward: { heal: 0.3 } }, { w: 25, text: "（咕嚕……）好像有點想睡……還好只是一下下。" }, { w: 25, text: "（咕嚕……）喝到碗底，撈到一朵發光的小蘑菇。", reward: { item: "glowCap" } }, { w: 15, text: "（咕嚕……）菇婆：「哎呀，這碗加錯了，是魔力湯！」", reward: { item: "potionMp" } }] },
      { id: "riddle", kind: "choice", look: "mushroom", name: "會說話的蘑菇", npc: { name: "會說話的蘑菇", color: "#c84a8a", face: "謎" }, reward: { item: "glowCap" },
        variants: [
          q("猜猜看：什麼東西越洗越髒？", [{ t: "衣服", r: "「衣服洗了會變乾淨呀，笨笨。」" }, { t: "水", ok: true, r: "「答對了！」蘑菇抖了抖，掉下一片會發光的傘蓋。" }, { t: "碗", r: "「碗洗了也是乾淨的呀。」" }]),
          q("猜猜看：我有傘卻從來不撐，住在土裡卻不是蟲。我是誰？", [{ t: "蚯蚓", r: "「蚯蚓就是蟲呀！」" }, { t: "雨傘", r: "「雨傘不住在土裡呀。」" }, { t: "蘑菇", ok: true, r: "「就是我！」蘑菇開心地跳了一下。" }]),
          q("猜猜看：什麼東西你給了別人，自己卻還留著？", [{ t: "知識", ok: true, r: "「答對了！你很聰明，給你一片光。」" }, { t: "金幣", r: "「金幣給了別人就沒了呀。」" }, { t: "孢子", r: "「……好像也對？可是不是我想的那個。」" }]),
        ] },
      { id: "babyMole", kind: "chase", look: "beast", name: "抱著發光菇的鼴鼠寶寶", face: "鼴", npc: { name: "鼴鼠寶寶", color: "#7a5a4a", face: "鼴" }, speed: 150, restText: "（抱著蘑菇打瞌睡）",
        text: "鼴鼠寶寶身上沒有長寄生菇。牠把抱著的發光菇推給你，然後鑽回土裡了。", reward: { item: "glowCap" } },
      { id: "lostElf", kind: "follow", name: "迷路的精靈小孩", npc: { name: "迷路的精靈小孩", color: "#5aa86a", face: "精" }, destName: "精靈村",
        text: "「礦道好黑……我的發光菇被鼴鼠搶走了，看不到回村子的路。」", endText: "「到了！」小孩跑進蘑菇屋，又跑出來，塞給你一瓶藥水：「奶奶說要謝謝你。」", reward: { item: "potionHp" } },
      { id: "moles", kind: "ambush", name: "從土裡鑽出的鼴鼠", variant: "moles", text: "腳下的土隆起來了——被寄生的鼴鼠鑽出來了！" },
    ] },
    // ----- #CO00756 雲端上的海洋 -----
    CO00756: { pick: 4, every: [25, 45], events: [
      { id: "school", kind: "timed", life: 30, name: "漂過來的雲朵魚群", icon: "魚", color: "#5ab0e8", spawnMsg: "一群雲朵做的小魚游過來了！（限時）",
        text: "你伸手一撈，抓到兩團魚形狀的雲。魚群散開，又在不遠處聚在一起。", reward: { item: "cloudFluff", n: 2 }, goneMsg: "雲朵魚群游走了" },
      { id: "bottle", kind: "pickup", name: "漂流瓶", icon: "瓶", color: "#4a9ad8",
        variants: [{ text: "瓶子裡的紙條：「給撿到這個的人：天空的下面也是天空。」瓶底還有幾枚硬幣。", reward: { gold: 25 } }, { text: "瓶子裡的紙條：「今天捕手又來了。我把最好的雲藏在港口的第三根柱子下面。」……字跡被水暈開了。", reward: { gold: 25 } }, { text: "瓶子裡什麼也沒有，只有一小團雲在裡面慢慢轉。", reward: { item: "cloudFluff" } }] },
      { id: "angler", kind: "choice", name: "雲朵港的老釣客", npc: { name: "老釣客", color: "#3a6a9a", face: "釣" }, reward: { item: "cloudFluff", gold: 20 },
        variants: [
          q("年輕人，考考你：地上的雲，是什麼做的？", [{ t: "小水滴或小冰晶", ok: true, r: "「對。我們這裡的雲比較特別——是會游泳的。」" }, { t: "棉花", r: "「哈哈，那是我們這裡。」" }, { t: "煙", r: "「煙是煙，雲是雲。」" }]),
          q("考考你：地上的天空，為什麼是藍色的？", [{ t: "因為海是藍的", r: "「反了，是海映著天。」" }, { t: "藍光被空氣散射得比較多", ok: true, r: "「有讀書！」老釣客把今天的漁獲分了你一點。" }, { t: "天空本來就是藍色的", r: "「本來就是？那晚上呢？」" }]),
        ] },
      { id: "whale", kind: "chase", look: "beast", name: "偷吃雲的小鯨", face: "鯨", npc: { name: "偷吃雲的小鯨", color: "#6a8ab8", face: "鯨" }, speed: 160, restText: "（打了個嗝，噴出一團雲）",
        text: "小鯨被你抓住，噗地吐出兩團剛吃下去的雲，然後一臉無辜地游走了。", reward: { item: "cloudFluff", n: 2 } },
      { id: "net", kind: "gamble", uses: 3, cost: 10, name: "撈雲網攤", npc: { name: "撈雲網攤的小販", color: "#4a9ad8", face: "撈" },
        text: "「一次十塊，網子撈到什麼都歸你！」",
        table: [{ w: 45, text: "（撈……）網子破了個洞，什麼都沒撈到。" }, { w: 35, text: "（撈……）一團 Q 彈的雲！", reward: { item: "cloudFluff" } }, { w: 15, text: "（撈……）撈到一瓶不知道誰掉的藥水。", reward: { item: "potionHp" } }, { w: 5, text: "（撈……）撈到一個沉甸甸的錢袋！小販的臉綠了。", reward: { gold: 80 } }] },
      { id: "catch", kind: "ambush", name: "天空捕手", variant: "catchers", text: "天空捕手的網子從頭上撒下來了！" },
    ] },
    // ----- #MJ44444 彼岸花盛開的事務所 -----
    MJ44444: { pick: 4, every: [25, 45], events: [
      { id: "lostSoul", kind: "follow", name: "迷路的亡魂", npc: { name: "迷路的亡魂", color: "#9a9ab8", face: "魂" }, destName: "該去的窗口",
        text: "「請問……我該去哪一個窗口？號碼牌上的字，我已經看不清楚了。」", endText: "亡魂在窗口前停下來，對你深深鞠了一躬。他的身影慢慢變淡，留下一片花瓣。", reward: { item: "lilyPetal", gold: 20 } },
      { id: "whiteLily", kind: "timed", life: 40, name: "白色的彼岸花", icon: "花", color: "#e8e8f0", spawnMsg: "花田裡開了一朵白色的彼岸花……（限時）",
        variants: [{ text: "白色的彼岸花，花語是「想念」。花瓣落在你手上，暖暖的。", reward: { item: "lilyPetal", n: 2 } }, { text: "白色的彼岸花，花語是「再也不會相見」。……你輕輕摘下兩片花瓣。", reward: { item: "lilyPetal", n: 2 } }], goneMsg: "白色的彼岸花謝了" },
      { id: "queue", kind: "choice", name: "排隊的亡魂", npc: { name: "排隊的亡魂", color: "#8a8aa8", face: "排" }, reward: { item: "lilyPetal" },
        variants: [
          q("我排了好久……可是我還沒想好，要不要把那件事放下。", [{ t: "「不用急。想好了再去窗口也可以。」", ok: true, r: "「……謝謝。那我再排一次。」他笑了，把一片花瓣放在你手裡。" }, { t: "「快去啦，後面還有人在排。」", r: "亡魂縮了一下，往隊伍的最後面飄去了。" }, { t: "「忘掉就好了。」", r: "「……忘不掉才會在這裡呀。」" }]),
          q("我生前有一句話沒說出口。現在說，還來得及嗎？", [{ t: "「說吧。我會幫你記下來，交給辦事員。」", ok: true, r: "亡魂在你耳邊說了一句話。……那句話很短，你答應會幫他轉交。" }, { t: "「來不及了。」", r: "亡魂低下頭，飄走了。" }, { t: "「那句話不重要。」", r: "「……對你來說不重要。」" }]),
        ] },
      { id: "thread", kind: "pickup", name: "飄落的紅線", icon: "線", color: "#c83a3a",
        variants: [{ text: "一段紅線，兩頭都已經斷了。……你把它收好，交給剪線師處理。", reward: { gold: 25 } }, { text: "一段紅線，上面打了一個很小的結。結裡面，好像有人在笑。", reward: { gold: 25 } }] },
      { id: "omikuji", kind: "gamble", look: "machine", uses: 3, cost: 10, name: "事務所的抽籤筒", npc: { name: "抽籤筒", color: "#c83a3a", face: "籤" },
        text: "等候區角落的抽籤筒。牌子上寫著：「一支十元，抽到的不一定是你的命，但可以參考。」",
        table: [{ w: 15, text: "大吉。「所求皆得，所失皆歸。」", reward: { gold: 60 } }, { w: 45, text: "吉。「花開有時，不必急。」", reward: { item: "potionHp" } }, { w: 40, text: "凶。「……」籤上什麼都沒寫。辦事員小聲說：「凶的那一支，我們一直沒印好。」" }] },
      { id: "grudge", kind: "ambush", name: "斷不開的怨念", variant: "grudges", text: "花田裡的紅線纏了上來——怨念！" },
    ] },
    // ----- #RU20314 古代遺跡科考隊（森林） -----
    RU20314: { pick: 4, every: [25, 45], events: [
      { id: "moss", kind: "pickup", name: "發光的苔蘚", icon: "苔", color: "#5ac88a", text: "石頭上的苔蘚一明一暗，像是在呼吸。你刮下一點，聞起來有薄荷味——是很好的魔力藥材。", reward: { item: "potionMp" } },
      { id: "cartographer", kind: "choice", name: "迷路的見習測繪員", npc: { name: "見習測繪員", color: "#4a6a3a", face: "測" }, reward: { gold: 40 },
        variants: [
          q("我、我迷路了。等等，先考你一題，讓我確定你不是機關變的：太陽從哪邊升起？", [{ t: "東邊", ok: true, r: "「……是人！營地在南邊，我自己走回去就好，謝謝你！」" }, { t: "西邊", r: "「機關！？」他嚇得躲到樹後面。" }, { t: "北邊", r: "「……你也迷路了嗎？」" }]),
          q("地圖上的等高線，畫得越密代表什麼？", [{ t: "坡越陡", ok: true, r: "「對！難怪我剛剛爬得那麼累。」" }, { t: "地勢越平", r: "「那我剛剛怎麼爬得半死……」" }, { t: "那裡有寶藏", r: "「真的嗎！？……不對，賽勒斯說不是。」" }]),
        ] },
      { id: "cog", kind: "timed", life: 40, name: "露出地面的古代齒輪", icon: "齒", color: "#c8a84a", spawnMsg: "地面震了一下，有什麼東西從土裡露出來了……（限時）",
        text: "一個巴掌大的古代齒輪，還在慢慢地轉。朵拉一定會很想要——或者，商店也會。", reward: { gold: 50 }, goneMsg: "齒輪又沉回土裡了" },
      { id: "fox", kind: "chase", look: "beast", name: "叼走地圖的狐狸", face: "狐", npc: { name: "叼走地圖的狐狸", color: "#c87a3a", face: "狐" }, speed: 165, restText: "（狐狸在聞地上的東西）",
        text: "狐狸把地圖放下，歪著頭看你。地圖背面包著一點肉乾——原來牠要的是這個。你把地圖拿回來，肉乾留給牠。", reward: { gold: 40, item: "potionHp" } },
      { id: "cards", kind: "gamble", uses: 3, cost: 15, name: "營地外的牌局", npc: { name: "打牌的隊員", color: "#7a8a3a", face: "牌" },
        text: "「休息時間，來一把？一局十五。輸了不准哭。」",
        table: [{ w: 45, text: "你輸了。「哈哈，再來！」" }, { w: 40, text: "你贏了！", reward: { gold: 30 } }, { w: 15, text: "同花順！隊員把整個背包倒出來給你。", reward: { gold: 45, item: "potionMp" } }] },
      { id: "wolves", kind: "ambush", name: "森林邊的魔狼", variant: "edgeWolves", text: "樹叢裡有好幾雙眼睛在看著你——魔狼！" },
    ] },
    // ----- #LG00412 傳說的道路 -----
    LG00412: { pick: 4, every: [25, 45], events: [
      { id: "oracle", kind: "gamble", uses: 2, cost: 20, name: "德爾菲的神諭", npc: { name: "德爾菲的女祭司", color: "#c8a84a", face: "諭" },
        text: "煙霧裡傳來女祭司的聲音：「獻上二十枚銀幣，神會回答你一個你沒有問的問題。」",
        table: [{ w: 30, text: "「你今天走的路，神都看見了。」——你覺得腳步輕快了起來。", reward: { luck: 180 } }, { w: 40, text: "「渴的時候，喝水。」……神諭好像只是叫你照顧好自己。女祭司遞給你一瓶藥水。", reward: { item: "potionHp" } }, { w: 30, text: "「認識你自己。」……好像在哪裡聽過。" }] },
      { id: "philosopher", kind: "choice", name: "市集的哲學家", npc: { name: "市集的哲學家", color: "#8a6a4a", face: "哲" }, reward: { gold: 60 },
        variants: [
          q("年輕人，蘇格拉底常說：「我唯一知道的事，就是……」", [{ t: "「我一無所知。」", ok: true, r: "「正是！承認無知，才是智慧的開始。」他把攤位上的銀幣推給你。" }, { t: "「我什麼都知道。」", r: "「……那你一定不是蘇格拉底。」" }, { t: "「明天會下雨。」", r: "「那是天氣，不是哲學。」" }]),
          q("你知道亞里斯多德教過哪一位有名的學生嗎？", [{ t: "亞歷山大大帝", ok: true, r: "「對。老師教得再好，學生還是會去打仗。」" }, { t: "蘇格拉底", r: "「反了反了，蘇格拉底是老師的老師的……」" }, { t: "第歐根尼", r: "「那個住在木桶裡的？他才不會當誰的學生。」" }]),
          q("亞歷山大大帝問第歐根尼想要什麼，第歐根尼怎麼回答？", [{ t: "「請你讓開，你擋到我的陽光了。」", ok: true, r: "「哈哈！就是這樣。全世界最有權力的人，也比不上一點陽光。」" }, { t: "「給我一座城。」", r: "「他連房子都不要，要城做什麼？」" }, { t: "「讓我當你的老師。」", r: "「那是亞里斯多德的工作。」" }]),
        ] },
      { id: "satyr", kind: "chase", look: "beast", name: "偷了供品的薩堤爾", face: "羊", npc: { name: "薩堤爾", color: "#8a6a3a", face: "羊" }, speed: 175, restText: "（停下來偷吃葡萄）",
        text: "薩堤爾被你抓住，嘴裡還塞著葡萄。牠把剩下的供品還給你，咩了一聲跑掉了。", reward: { item: "grapes" } },
      { id: "laurel", kind: "timed", life: 30, name: "隨風飄來的桂冠", icon: "冠", color: "#5a9a3a", spawnMsg: "一頂桂冠被風吹了過來……（限時）",
        text: "一頂奧林匹亞的勝利桂冠，不知道是哪位選手弄丟的。桂冠裡夾著一袋銀幣。", reward: { gold: 80 }, goneMsg: "桂冠被風吹到海裡去了" },
      { id: "sheep", kind: "follow", look: "beast", name: "走失的羊", npc: { name: "走失的羊", color: "#e8e0d0", face: "羊" }, destName: "牧羊人",
        text: "「咩——」一隻脖子上掛著鈴鐺的羊，一直跟在你的腳邊。鈴鐺上刻著主人的名字。", endText: "牧羊人老遠就看到了：「我的羊！」他把一袋起司和銀幣塞給你。", reward: { gold: 40, item: "potionHp" } },
      { id: "birds", kind: "ambush", name: "青銅怪鳥", variant: "birds", text: "天空暗了下來——青銅怪鳥俯衝下來了！" },
    ] },
    // ----- #KN59810 克亞貝魯巴斯諾 -----
    KN59810: { pick: 3, every: [25, 45], events: [
      { id: "oneUp", kind: "timed", life: 25, name: "閃爍的 1UP", icon: "１", color: "#3ae86a", spawnMsg: "叮叮叮——畫面的某處出現了 1UP！（限時）", text: "你碰到了 1UP。身體閃了兩下，好像多了一條命——至少多了一點血。", reward: { heal: 0.35 }, goneMsg: "1UP 閃了兩下，消失了" },
      { id: "claw", kind: "gamble", look: "machine", uses: 3, cost: 10, name: "夾娃娃機", npc: { name: "夾娃娃機", color: "#e85aa8", face: "夾" },
        text: "機台角落藏著一台小小的夾娃娃機。玻璃裡塞滿了像素做的娃娃。",
        table: [{ w: 55, text: "（夾子鬆掉了……）娃娃掉回去了。" }, { w: 30, text: "（夾到了！）一個像素碎片做的娃娃。", reward: { item: "pixelChip" } }, { w: 15, text: "（夾到了兩個！）", reward: { item: "pixelChip", n: 2 } }] },
      { id: "konami", kind: "choice", name: "輸入密技的小孩", npc: { name: "輸入密技的小孩", color: "#3ab0e8", face: "密" }, reward: { gold: 50 },
        variants: [q("傳說中，輸入那串密技就會變超強……可是我忘記順序了！是哪一個？", [{ t: "上上下下左右左右 B A", ok: true, r: "（嗶嗶嗶——）畫面閃了一下，掉出一把金幣！「真的有用！」" }, { t: "左右左右上上下下 A B", r: "（嗶——）什麼都沒發生。" }, { t: "A A A A A A", r: "「那是 AAA 輸入名字的方法吧……」" }])] },
      { id: "chips", kind: "chase", look: "pixel", name: "逃跑的像素碎片", face: "碎", npc: { name: "逃跑的像素碎片", color: "#8a8a9a", face: "碎" }, speed: 170, restText: "（卡在亂碼格子裡）", text: "你抓住了那幾格亂跑的像素。它們在你手心排成一個笑臉，然後不動了。", reward: { item: "pixelChip", n: 2 } },
      { id: "jets", kind: "ambush", name: "像素敵機", variant: "jets", text: "WARNING——敵機編隊從畫面外面飛進來了！" },
    ] },
    // ----- #MD01921 蒙德里安的理想國 -----
    MD01921: { pick: 3, every: [25, 45], events: [
      { id: "paint", kind: "timed", life: 35, name: "滴下來的原色顏料", icon: "色", color: "#e8262c", spawnMsg: "畫布的某個角落滴下了一灘顏料……（限時）", text: "一灘還沒乾的顏料。你用瓶子裝起來——可以拿去畫架那裡用。", reward: { paint: 1, gold: 10 }, goneMsg: "顏料乾掉了" },
      { id: "colorQuiz", kind: "choice", look: "block", name: "愛考試的色塊", npc: { name: "1×2 的藍色方形", color: "#2a5aa8", face: "藍" }, reward: { gold: 40 },
        variants: [
          q("考考你：紅色加黃色會變成什麼顏色？", [{ t: "橙色", ok: true, r: "「對！……不過在這裡，紅就是紅，黃就是黃，不准混。」" }, { t: "綠色", r: "「那是藍加黃。」" }, { t: "紫色", r: "「那是紅加藍。」" }]),
          q("考考你：這幅畫裡，色塊和色塊之間的黑線是做什麼的？", [{ t: "把色塊分開", ok: true, r: "「對。所以黑線不見的時候，大家都很緊張。」" }, { t: "裝飾用的", r: "「我們是很認真的！」" }, { t: "是毛毛蟲", r: "「……有時候是。」" }]),
        ] },
      { id: "runSquare", kind: "chase", look: "block", name: "跑掉的小方塊", face: "方", npc: { name: "跑掉的小方塊", color: "#e8c84a", face: "方" }, speed: 170, restText: "（撞到黑線了）", text: "小方塊乖乖地被你抱回原來的位置。整幅畫看起來又平衡了。旁邊的色塊塞給你一把金幣。", reward: { gold: 45 } },
      { id: "fishTip", kind: "pickup", name: "被沖上岸的方塊魚", icon: "魚", color: "#e8c84a", text: "一條方塊魚在地上啪啪跳。你把牠收好了。", reward: { item: "blockFish" } },
    ] },
  };
})();
