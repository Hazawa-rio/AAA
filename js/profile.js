/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/profile.js": "20261113145157" });
// 玩家資料（局外）：名字、時空幣、手上的特調
// 測試版存在瀏覽器（localStorage）；線上版之後改成帳號資料
(function () {
  const R = (window.RPG = window.RPG || {});
  const get = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
  const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 無法儲存就算了 */ } };

  // 特調的調料：依序對應 生命、魔力、攻擊、防禦、速度（數值暫定）
  const INGREDIENTS = [
    { id: "cherry", name: "櫻桃汁", stat: "hp", label: "生命", amount: 5, color: "#d6304a" },
    { id: "ice", name: "魔力冰塊", stat: "mp", label: "魔力", amount: 5, color: "#5aa9e6" },
    { id: "chili", name: "辣椒根", stat: "atk", label: "攻擊", amount: 3, color: "#e8662c" },
    { id: "fig", name: "無花果結晶", stat: "df", label: "防禦", amount: 2, color: "#8e5bb5" },
    { id: "herb", name: "天界香草", stat: "spd", label: "速度", amount: 1, color: "#58b368" },
  ];
  const BASES = ["琴酒", "蘭姆酒", "伏特加", "龍舌蘭", "威士忌", "白蘭地", "清酒"];

  R.Profile = {
    INGREDIENTS, BASES,
    MAX_ADDS: 5,
    PRICE: 10,                 // 每份調料的價格（時空幣，暫定）
    START_COINS: 100,          // 新帳號的時空幣（測試用）

    get() { return get("rpg.profile", null); },
    login(name) {
      const p = { name, guest: true, created: Date.now() };
      set("rpg.profile", p);
      if (get("rpg.coins", null) === null) set("rpg.coins", this.START_COINS);
      return p;
    },
    rename(name) { const p = this.get(); if (!p) return; p.name = name; set("rpg.profile", p); },
    // 改名字的小視窗（酒館、時空裡都可以用）；host = 要蓋在上面的容器
    renameDialog(host, onDone) {
      const old = this.get()?.name || "";
      const wrap = document.createElement("div");
      wrap.className = "tv-overlay";
      wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-modal", "true");
      wrap.innerHTML = `<form class="tv-card login" style="text-align:left">
          <h2 style="text-align:center">更改名字</h2>
          <div class="name-row" style="margin-top:12px"><input maxlength="12" autocomplete="off" aria-label="新的名字" required><button type="submit" class="primary">確定</button></div>
          <p class="tv-err" role="alert"></p>
          <div class="tv-row" style="justify-content:flex-end"><button type="button" class="ghost" data-x>取消</button></div>
        </form>`;
      host.appendChild(wrap);
      const input = wrap.querySelector("input"), errEl = wrap.querySelector(".tv-err");
      input.value = old; input.focus(); input.select();
      const close = (changed) => { wrap.remove(); onDone?.(changed); };
      wrap.querySelector("[data-x]").addEventListener("click", () => close(false));
      wrap.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); close(false); } });
      wrap.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
        const name = input.value.trim().replace(/\s+/g, " ");
        if (!name) { errEl.textContent = "請輸入名字"; return; }
        if ([...name].length > 12) { errEl.textContent = "名字最多 12 個字"; return; }
        this.rename(name);
        close(true);
      });
    },
    logout() { try { localStorage.removeItem("rpg.profile"); } catch (e) { /* 忽略 */ } },

    coins() { return get("rpg.coins", 0); },
    // 永久解鎖（不會隨冒險結束消失）：knGalaxy＝打倒了銀河大元帥（可以買街機）、knArcade＝酒館裡擺了克亞貝魯巴斯諾、knHer＝拿過她的戰機
    unlocks() { return get("rpg.unlocks", {}) || {}; },
    unlocked(k) { return !!this.unlocks()[k]; },
    unlock(k, v = true) { const u = this.unlocks(); u[k] = v; set("rpg.unlocks", u); },
    addCoins(n) { const c = Math.max(0, this.coins() + n); set("rpg.coins", c); return c; },

    // 特調：{ base, adds: ["cherry", ...] }，下一次進入戰鬥時生效
    drink() { return get("rpg.drink", null); },
    setDrink(d) { set("rpg.drink", d); },
    takeDrink() { const d = this.drink(); try { localStorage.removeItem("rpg.drink"); } catch (e) { /* 忽略 */ } return d; },
    // 這一趟的委託：{ status: "plan"（在酒館準備）| "away"（已出發）, accepted: [委託 id], done: [已完成], char }
    trip() { return get("rpg.trip", null) || { status: "plan", accepted: [], done: [] }; },
    setTrip(t) { set("rpg.trip", t); },
    clearTrip() { try { localStorage.removeItem("rpg.trip"); } catch (e) { /* 忽略 */ } },

    // ===== 適格者：已經擁有的角色、時空碎片、觀測（抽角色） =====
    OWNED_DEFAULT: ["firsler", "ilshu", "vivilla"],
    owned() { return get("rpg.owned", null) || this.OWNED_DEFAULT.slice(); },
    owns(id) { const c = R.CHARACTERS?.[id]; return !c?.gacha || this.owned().includes(id); },
    disown(id) { set("rpg.owned", this.owned().filter((x) => x !== id || !R.CHARACTERS?.[x]?.gacha)); try { if (localStorage.getItem("rpg.char") === id) localStorage.setItem("rpg.char", this.OWNED_DEFAULT[0]); } catch (e) { /* 忽略 */ } },
    own(id) { const o = this.owned(); if (!o.includes(id)) { o.push(id); set("rpg.owned", o); } },
    shards() { return get("rpg.shards", 0); },
    addShards(n) { const v = Math.max(0, this.shards() + n); set("rpg.shards", v); return v; },
    // 觀測的設定（數值暫定，稀有／史詩／傳奇的機率是暫定）
    GACHA: {
      single: 500, ten: 5000, exchange: 1000,
      charRate: 0.015,                 // 抽到適格者的機率；定向觀測的角色 ×2
      tiers: [                         // 時空碎片：機率（扣掉適格者之後依比例）、數量範圍
        { id: "legend", name: "傳奇", rate: 0.04, min: 25, max: 32, color: "#f2b81a" },
        { id: "epic", name: "史詩", rate: 0.195, min: 10, max: 17, color: "#9b4fe0" },
        { id: "rare", name: "稀有", rate: 0.75, min: 1, max: 7, color: "#3a8ee6" },
      ],
    },
    // 還沒擁有、可以觀測到的適格者
    pool() { return Object.values(R.CHARACTERS || {}).filter((c) => c.gacha && !this.owned().includes(c.id)); },
    charRates(target) {
      const pool = this.pool(), G = this.GACHA;
      if (!pool.length) return [];
      const t = pool.find((c) => c.id === target);
      // 定向觀測：那個角色的機率翻倍；沒有定向時 1.5% 平均分給池子裡的角色
      return pool.map((c) => ({ id: c.id, rate: t ? (c === t ? G.charRate * 2 : 0) : G.charRate / pool.length }));
    },
    rollOnce(target) {
      const G = this.GACHA, rates = this.charRates(target);
      let r = Math.random();
      for (const x of rates) { if (r < x.rate) return { kind: "char", id: x.id }; r -= x.rate; }
      const left = 1 - rates.reduce((a, x) => a + x.rate, 0);
      let q = Math.random() * left, acc = 0;
      for (const t of G.tiers) {
        acc += t.rate * left / G.tiers.reduce((a, x) => a + x.rate, 0);
        if (q < acc) return { kind: "shard", tier: t.id, n: t.min + Math.floor(Math.random() * (t.max - t.min + 1)) };
      }
      const t = G.tiers[G.tiers.length - 1];
      return { kind: "shard", tier: t.id, n: t.min };
    },
    // 觀測 n 次（1 或 10）：扣時空幣、發碎片、擁有角色
    observe(n, target) {
      const cost = n >= 10 ? this.GACHA.ten : this.GACHA.single * n;
      if (this.coins() < cost) return { ok: false, why: `時空幣不足（需要 ${cost}）` };
      this.addCoins(-cost);
      const out = [];
      for (let i = 0; i < n; i++) {
        const res = this.rollOnce(target);
        if (res.kind === "char") this.own(res.id);
        else this.addShards(res.n);
        out.push(res);
      }
      return { ok: true, results: out, cost };
    },
    exchange(id) {
      const c = R.CHARACTERS?.[id];
      if (!c || !c.gacha || this.owned().includes(id)) return { ok: false, why: "不能兌換這個角色" };
      if (this.shards() < this.GACHA.exchange) return { ok: false, why: `時空碎片不足（需要 ${this.GACHA.exchange}）` };
      this.addShards(-this.GACHA.exchange);
      this.own(id);
      return { ok: true };
    },

    bonusOf(d) {
      const b = { hp: 0, mp: 0, atk: 0, df: 0, spd: 0 };
      for (const id of d?.adds || []) { const g = INGREDIENTS.find((x) => x.id === id); if (g) b[g.stat] += g.amount; }
      return b;
    },
    bonusText(d) {
      const b = this.bonusOf(d);
      return INGREDIENTS.filter((g) => b[g.stat]).map((g) => `${g.label} +${b[g.stat]}`).join("、") || "沒有加成";
    },
  };
})();
