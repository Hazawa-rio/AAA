/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/characters/ilshu-tutorial.js": "20261113145157" });
// 新手引導專用的伊爾舒（固定版）
// 技能的行為沿用 ilshu.js，但所有數值都寫死在這裡。
// 之後調整 ilshu.js 的平衡數值，不會影響這個教學版本；選角頁也不會顯示它。
(function () {
  const R = window.RPG;
  const base = R.CHARACTERS.ilshu;

  const FROZEN = {
    stats: { hp: 100, atk: 18, df: 7, spd: 9, ap: 6 },
    passive: { maxGloom: 5 },
    skills: {
      thrust: { ap: 1, base: 12, range: 150, halfDeg: 9, gloomBonus: 0.08 },
      trial: { ap: 1, pull: 220, base: 12, cooldown: 2, projectileSpeed: 600 },
      karma: { ap: 1, radius: 110, base: 20, cooldown: 3 },
      ult: { ap: 2, charge: 6, radius: 170, halfDeg: 50, base: 18, gloomBonus: 0.15, thirdBase: 24 },
    },
  };

  // 深複製設定物件（函式沿用同一份），再蓋上固定數值
  const copy = (o) => {
    if (Array.isArray(o)) return o.map(copy);
    if (o && typeof o === "object") return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, copy(v)]));
    return o;
  };
  const T = copy(base);
  T.id = "ilshu_tutorial";
  T.hidden = true;                 // 不出現在選角頁
  T.frozen = true;
  T.tune = [];                     // 數值面板不提供調整
  T.stats = { ...FROZEN.stats };
  Object.assign(T.passive, FROZEN.passive);
  for (const [id, v] of Object.entries(FROZEN.skills)) Object.assign(T.skills[id], v);
  // 開場不生成心魔，由教學劇本控制
  T.init = (b, u) => { u.state.gloom = 0; u.charge = 0; };

  R.CHARACTERS[T.id] = T;
})();
