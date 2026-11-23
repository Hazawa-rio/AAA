/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/fate.js": "20261123215910" });
// 命路：取代原本 Q／E 各自二選一的技能強化；大招強化也屬於命路（每條路固定一個，Lv 20 拿到）
//   每個角色兩條命路（各有自己的名字）。冒險開始、進入第一個時空時選一條（js/fate-ui.js）；選了就沿著那條路往下走：
//     Lv 10 ○ 特化一：這條路的小技能特化（固定）
//     Lv 20 ★ 大招強化（固定）＋ ◆ 命運卡一
//     Lv 30 ○ 特化二
//     Lv 40 ◆ 命運卡二、Lv 50 ◆ 命運卡三
//   ◆ 命運卡：到了等級、離開戰鬥後，從這條命路的卡池抽兩張選一張。命運卡只給數值（效果＋考驗），不加機制
//   ○ 特化：{ spec: "id", skill, name, desc, ups: [順便拿到的原本強化] }（角色檔用 R.upHas 檢查），或 { up: 原本的強化 id }
//   mod（命運卡的效果和考驗）：
//     hp / mp / atk / df / spd ＝直接加減；hpPct / mpPct ＝生命／魔力上限 ±%（-0.1＝−10%）
//     dmg ＝造成的所有傷害 ×；basic ＝普攻 ×；skill: { 技能 id: × }＝某個技能 ×；summon ＝召喚物造成的傷害 ×
//     taken ＝受到的傷害 ×；heal ＝治療量 ×；shield ＝給的護盾 ×；mpCost ＝魔力消耗 ×；cd: { 技能 id: ±n }＝冷卻 ±n
// 數值全部暫定，之後使用者一個一個調
(function () {
  const R = (window.RPG = window.RPG || {});
  const LV = { circle: [10, 30], diamond: [20, 40, 50] };
  const ORDER = [10, 20, 30, 40, 50];

  // ===== 各角色的命路 =====
  //   n＝命路的名字；c＝線的顏色；desc＝這條路的玩法
  //   10 / 30：{ up }（或 { name, mod }）；20 / 40 / 50：{ a: 選項, b: 選項 }，選項＝{ up 或 name＋mod, trial: mod }
  // 命運卡（使用者 11/22）：只給數值、不加機制。每條命路一個卡池 cards: [[名字, 效果 mod, 考驗 mod], ...]
  const K = (list) => list.map(([name, mod, trial]) => ({ name, mod, trial }));
  const DATA = {
    firsler: [
      { n: "終幕閃擊", c: "#c8563a", desc: "以大招為主要輸出手段，部署煙霧射擊",
        10: { spec: "fs_powder", skill: "smoke", ups: ["plume"], name: "佈陣之煙", desc: "煙霧團上限 +1；每吐出一團煙霧，大招充能 +1" },
        30: { spec: "fs_fuse", skill: "load", name: "引信箭", desc: "箭穿過的煙霧會被點燃；煙霧爆發時，點燃的煙霧射出的尖刺傷害 ×1.5（看老娘結束這一切：點燃的煙霧算 1.5 根尖刺）" },
        cards: K([["尖刺淬煉", { skill: { burst: 1.15 } }, { hpPct: -0.1 }], ["火藥量", { skill: { burst: 1.25 } }, { taken: 1.15 }], ["濃煙", { cd: { smoke: -1 } }, { skill: { load: 0.85 } }],
          ["孤注", { dmg: 1.15 }, { taken: 1.15 }], ["疾射", { skill: { load: 1.2 } }, { df: -2 }], ["輕裝", { spd: 1 }, { hpPct: -0.1 }]]) },
      { n: "霧裡迷蹤", c: "#6a7a8a", desc: "躲藏在煙霧內用箭矢射擊",
        10: { spec: "fs_veil", skill: "smoke", ups: ["linger"], name: "藏身霧幕", desc: "煙霧持續 +1 回合；站在煙霧裡上膛不花行動點" },
        30: { spec: "fs_cold", skill: "load", name: "霧中冷箭", desc: "從煙霧裡射出的箭傷害 ×1.2，射箭後的冷卻 −1" },
        cards: K([["霧中瞄準", { skill: { load: 1.15 } }, { taken: 1.1 }], ["一箭封喉", { skill: { load: 1.3 } }, { spd: -1 }], ["快手上膛", { cd: { load: -1 } }, { hpPct: -0.15 }],
          ["獵人的耐心", { dmg: 1.1 }, { skill: { kick: 0.8 } }], ["藏身", { taken: 0.9 }, { skill: { burst: 0.8 } }], ["輕裝", { spd: 1 }, { df: -2 }]]) },
    ],
    ilshu: [
      { n: "積鬱之刃", c: "#5b3fa8", desc: "蒐集心魔一次爆發",
        10: { up: "heavy" }, 30: { up: "abyss" },
        cards: K([["積鬱", { dmg: 1.1 }, { spd: -1 }], ["沉默的劍", { basic: 1.2 }, { cd: { trial: 1 } }], ["負荷", { dmg: 1.15 }, { taken: 1.15 }],
          ["千鈞", { skill: { trial: 1.2 } }, { df: -2 }], ["決斷", { skill: { ult: 1.2 } }, { hpPct: -0.1 }], ["堅忍", { hp: 25 }, { basic: 0.85 }]]) },
      { n: "懺悔之火", c: "#a83a5a", desc: "引爆心魔為主",
        10: { up: "repay" }, 30: { up: "cycle" },
        cards: K([["引信", { skill: { karma: 1.2 } }, { spd: -1 }], ["連鎖業火", { dmg: 1.12 }, { taken: 1.15 }], ["懺悔", { skill: { karma: 1.3 } }, { hpPct: -0.15 }],
          ["償還", { cd: { karma: -1 } }, { basic: 0.8 }], ["灼心", { dmg: 1.1 }, { df: -2 }], ["贖罪", { taken: 0.9 }, { skill: { trial: 0.85 } }]]) },
    ],
    vivilla: [
      { n: "菇菇診所", c: "#4aa86a", desc: "回血輔助",
        10: { up: "concentrate" }, 30: { up: "farm" },
        cards: K([["急救", { heal: 1.15 }, { taken: 1.1 }], ["細心照護", { heal: 1.2 }, { basic: 0.8 }], ["妙手回春", { heal: 1.25 }, { hpPct: -0.15 }],
          ["節省藥材", { mpCost: 0.8 }, { df: -2 }], ["厚實菌傘", { hp: 25 }, { heal: 0.9 }], ["加量", { mp: 20 }, { spd: -1 }]]) },
      { n: "迷幻菌床", c: "#a85ac8", desc: "蘑菇控場",
        10: { up: "daze" }, 30: { up: "hormone" },
        cards: K([["孢子濃度", { dmg: 1.12 }, { mpPct: -0.15 }], ["迷幻深淵", { skill: { run: 1.3 } }, { taken: 1.15 }], ["菌絲蔓延", { skill: { run: 1.15 } }, { heal: 0.8 }],
          ["快長", { cd: { run: -1 } }, { hpPct: -0.1 }], ["毒蕈", { basic: 1.2 }, { df: -2 }], ["輕盈孢子", { spd: 1 }, { heal: 0.7 }]]) },
    ],
    guan: [
      { n: "趨吉之卦", c: "#c8a02a", desc: "護盾輔助",
        10: { up: "fortune" }, 30: { up: "double" },
        cards: K([["厚福", { shield: 1.2 }, { dmg: 0.85 }], ["福澤", { shield: 1.15 }, { mpCost: 1.2 }], ["安神", { taken: 0.9 }, { mpPct: -0.15 }],
          ["天官賜福", { shield: 1.3 }, { hpPct: -0.15 }], ["吉時", { cd: { omen: -1 } }, { spd: -1 }], ["福壽", { hp: 25 }, { shield: 0.9 }]]) },
      { n: "降禍之陣", c: "#5a3a6a", desc: "虛弱陣法",
        10: { up: "calamity" }, 30: { up: "greatEvil" },
        cards: K([["凶煞", { dmg: 1.12 }, { mpCost: 1.2 }], ["困局", { skill: { yinyang: 1.2 } }, { spd: -1 }], ["禍不單行", { dmg: 1.15 }, { df: -2 }],
          ["凶兆", { skill: { omen: 1.2 } }, { shield: 0.8 }], ["惡運", { basic: 1.2 }, { taken: 1.15 }], ["陰氣", { mp: 25 }, { hpPct: -0.1 }]]) },
    ],
    hoffman: [
      { n: "壓力閥", c: "#2a6ac8", desc: "累積盡可能多的行動值一次爆發",
        10: { spec: "hf_squeeze", skill: "jet", name: "擠壓時間", desc: "噴氣裝置多花 1 點行動點，多存進 1 層時間壓縮" },
        30: { spec: "hf_return", skill: "gear", ups: ["spin"], name: "齒輪回轉", desc: "齒輪飛盤回程時擊退路上的敵人" },
        cards: K([["緻密", { basic: 1.15 }, { taken: 1.15 }], ["臨界", { dmg: 1.12 }, { df: -3 }], ["超壓", { basic: 1.25 }, { hpPct: -0.15 }],
          ["加厚齒輪", { skill: { gear: 1.2 } }, { spd: -1 }], ["強化閥門", { skill: { compress: 1.2 } }, { cd: { jet: 1 } }], ["鉚釘", { df: 2 }, { skill: { gear: 0.85 } }]]) },
      { n: "制動杆", c: "#b8862a", desc: "將累積的行動值在關鍵時機使用",
        10: { spec: "hf_hedge", skill: "jet", name: "避險噴發", desc: "在應急時使用噴氣裝置：多付的那一倍行動點會變成 1 層時間壓縮（1 次行動＋1 層被動）" },
        30: { spec: "hf_keep", skill: "gear", name: "轉速維持", desc: "齒輪飛盤不飛回來，留在場上繼續轉，靠近的敵人會受到傷害；1 回合後消失" },
        cards: K([["精準", { skill: { gear: 1.2 } }, { df: -2 }], ["一秒不差", { dmg: 1.12 }, { spd: -1 }], ["潤滑", { cd: { gear: -1 } }, { basic: 0.85 }],
          ["輕量", { spd: 1 }, { hpPct: -0.1 }], ["高轉速", { skill: { gear: 1.3 } }, { taken: 1.15 }], ["避震", { taken: 0.9 }, { skill: { jet: 0.8 } }]]) },
    ],
    marika: [
      { n: "烈火連舞", c: "#d8402a", desc: "連續攻擊為主",
        10: { spec: "mk_frenzy", skill: "ignite", ups: ["frenzy"], name: "狂舞", desc: "燃火狀態下造成的傷害 ×1.15；火舌折磨多打 1 下（4 → 5 下）" },
        30: { spec: "mk_spin", skill: "grab", ups: ["spinPull"], name: "迴旋連斬", desc: "抓取把敵人勾過來之後順勢甩一圈；抓取之後的下一次普攻不花行動點" },
        cards: K([["火舌", { basic: 1.15 }, { mpCost: 1.2 }], ["連舞", { basic: 1.25 }, { mpCost: 1.3 }], ["豪火", { dmg: 1.15 }, { taken: 1.15 }],
          ["鏈節", { skill: { grab: 1.2 } }, { hpPct: -0.1 }], ["步法", { spd: 1 }, { df: -2 }], ["燃燒的劍", { dmg: 1.1 }, { spd: -1 }]]) },
      { n: "燎原之地", c: "#e8862a", desc: "滯留火焰為主",
        10: { spec: "mk_wild", skill: "ignite", ups: ["wildfire"], name: "燎原之焰", desc: "火焰範圍 ×1.4；燃起／延續火焰時，在身邊點起一大片火焰" },
        30: { spec: "mk_hook", skill: "grab", name: "熾熱鎖鏈", desc: "抓取的整條路線和被勾過來的敵人腳下都會留下火焰——不用燃火也會留下" },
        cards: K([["焦土", { dmg: 1.1 }, { spd: -1 }], ["永燃", { dmg: 1.15 }, { mpCost: 1.3 }], ["火種", { skill: { ignite: 1.25 } }, { basic: 0.85 }],
          ["耐熱", { taken: 0.9 }, { hpPct: -0.1 }], ["魔力薪柴", { mp: 25 }, { df: -2 }], ["熱浪", { skill: { salamander: 1.2 } }, { taken: 1.15 }]]) },
    ],
    cangyou: [
      { n: "滄海魚群", c: "#2a8ab8", desc: "慢慢養魚，利用魚群攻擊",
        10: { up: "trio" }, 30: { up: "loyal" },
        cards: K([["群聚", { summon: 1.15 }, { mpCost: 1.2 }], ["幽靈魚群", { summon: 1.25 }, { df: -2 }], ["餌料", { cd: { school: -1 } }, { basic: 0.85 }],
          ["厚泡", { shield: 1.2 }, { spd: -1 }], ["深海", { hp: 25 }, { summon: 0.9 }], ["水壓", { basic: 1.2 }, { taken: 1.1 }]]) },
      { n: "群游之潮", c: "#3a5ab8", desc: "利用魚群遊行打爆發",
        10: { up: "spit" }, 30: { spec: "cy_patrol", skill: "school", name: "海底巡迴", desc: "魚群只會在蒼幽周圍環繞，跟著大招出去遊行，最後回到身邊；蒼幽用普攻時，身邊每一條魚多噴出一道水柱（普通傷害），普攻的魔力消耗跟著加大" },
        cards: K([["洄游", { summon: 1.12 }, { hpPct: -0.1 }], ["潮湧", { dmg: 1.1 }, { df: -2 }], ["大潮", { summon: 1.25 }, { taken: 1.15 }],
          ["急流", { basic: 1.2 }, { mpCost: 1.2 }], ["遊行隊伍", { skill: { manta: 1.2 } }, { spd: -1 }], ["水花", { mp: 25 }, { summon: 0.9 }]]) },
    ],
    youyan: [
      { n: "雙子魔法", c: "#e86ab0", desc: "努力保住性命，完成三次詠唱變身",
        10: { spec: "yy_bless", skill: "crystal", name: "魔法祝福", desc: "結晶繞在身邊時，移動範圍變大（每顆 +15%）" }, 30: { up: "sturdy" },
        cards: K([["法陣庇護", { taken: 0.9 }, { spd: -1 }], ["結晶殼", { hpPct: 0.1 }, { df: -1 }], ["夢的預演", { dmg: 1.15 }, { taken: 1.15 }],
          ["詠唱", { mp: 25 }, { skill: { crystal: 0.85 } }], ["加固", { hp: 25 }, { basic: 0.85 }], ["法陣共鳴", { skill: { circle: 1.2 } }, { hpPct: -0.1 }]]) },
      { n: "我的魔法", c: "#8a3a6a", desc: "更頻繁地用變身換血續命",
        10: { up: "twin" }, 30: { up: "burst" },
        cards: K([["吸血", { heal: 1.2 }, { df: -1 }], ["短夢", { dmg: 1.1 }, { spd: -1 }], ["星屑", { skill: { crystal: 1.25 } }, { hpPct: -0.1 }],
          ["鋒利", { skill: { crystal: 1.15 } }, { mpCost: 1.2 }], ["夢的代價", { dmg: 1.15 }, { hpPct: -0.15 }], ["魔力湧出", { mpCost: 0.85 }, { taken: 1.1 }]]) },
    ],
    phantom: [
      { n: "暗夜魅影", c: "#3a2a5a", desc: "攻擊預告對象的刺客",
        10: { spec: "ph_treasure", skill: "notice", name: "今日祕寶", desc: "魅影敬上命中的敵人成為「目標」：這一回合只能對目標造成傷害；地上出現魅影標誌鎖住目標的移動（Boss 只會變慢）" },
        30: { up: "pick" },
        cards: K([["致命預告", { basic: 1.2 }, { spd: -1 }], ["處刑", { dmg: 1.15 }, { taken: 1.15 }], ["暗殺", { basic: 1.3 }, { hpPct: -0.15 }],
          ["預告函", { skill: { notice: 1.2 } }, { df: -1 }], ["夜色", { taken: 0.9 }, { basic: 0.85 }], ["怪盜的手", { dmg: 1.1 }, { mpPct: -0.2 }]]) },
      { n: "神偷怪盜", c: "#6a5a8a", desc: "用勾爪游離戰場的游擊",
        10: { up: "spare" }, 30: { up: "longline" },
        cards: K([["飛賊", { skill: { grapple: 1.2 } }, { hpPct: -0.1 }], ["身輕如燕", { spd: 1 }, { taken: 1.1 }], ["夜行", { dmg: 1.12 }, { mpPct: -0.2 }],
          ["快手", { cd: { grapple: -1 } }, { basic: 0.85 }], ["戰利品", { skill: { nightfall: 1.2 } }, { df: -1 }], ["脫身", { taken: 0.9 }, { skill: { grapple: 0.85 } }]]) },
    ],
    bastian: [
      { n: "破城先鋒", c: "#8a5a2a", desc: "衝鋒陷陣的前線",
        10: { up: "bulldoze" }, 30: { up: "rampart" },
        cards: K([["重壓", { skill: { charge: 1.25 } }, { shield: 0.8 }], ["衝陣", { dmg: 1.15 }, { spd: -1 }], ["破城槌", { skill: { charge: 1.15 } }, { df: -2 }],
          ["盾擊", { basic: 1.2 }, { hpPct: -0.1 }], ["鐵蹄", { spd: 1 }, { taken: 1.1 }], ["崩落", { skill: { gatefall: 1.2 } }, { basic: 0.85 }]]) },
      { n: "守護之門", c: "#5a6a7a", desc: "立下盾牌的守護",
        10: { spec: "bs_bold", skill: "brace", ups: ["plate"], name: "大膽迎戰", desc: "立盾時嘲諷前方扇形範圍的敵人；立起的城門可以用滑鼠決定方向" },
        30: { up: "allround" },
        cards: K([["堅守", { taken: 0.9 }, { basic: 0.85 }], ["厚盾", { shield: 1.25 }, { cd: { brace: 1 } }], ["不動", { hp: 30 }, { dmg: 0.85 }],
          ["鐵壁", { df: 3 }, { spd: -1 }], ["重盾", { shield: 1.15 }, { skill: { charge: 0.8 } }], ["城門", { hpPct: 0.1 }, { dmg: 0.9 }]]) },
    ],
    miyahime: [
      { n: "雷厲風行", c: "#7a3a8a", desc: "快速疊毒、快速引爆",
        10: { up: "brew" }, 30: { up: "punish" },
        cards: K([["猛毒", { dmg: 1.15 }, { hpPct: -0.1 }], ["一擊斃命", { skill: { plume: 1.25 } }, { cd: { plume: 1 } }], ["殘忍", { dmg: 1.12 }, { taken: 1.15 }],
          ["毒針", { basic: 1.2 }, { df: -1 }], ["速攻", { spd: 1 }, { hpPct: -0.1 }], ["飛羽", { skill: { plume: 1.15 } }, { mpCost: 1.2 }]]) },
      { n: "從長計議", c: "#3a6a5a", desc: "拉長戰線、慢慢掛毒",
        10: { up: "yomi" }, 30: { up: "low" },
        cards: K([["緩毒", { skill: { river: 1.2 } }, { hpPct: -0.1 }], ["蔓延", { dmg: 1.12 }, { df: -1 }], ["沉住氣", { taken: 0.9 }, { basic: 0.8 }],
          ["黃泉", { skill: { river: 1.3 } }, { spd: -1 }], ["護衛", { hp: 25 }, { dmg: 0.9 }], ["慢火", { mpCost: 0.85 }, { skill: { plume: 0.85 } }]]) },
    ],
  };

  // 特定角色的命運卡有自己的名字、標籤和卡面形狀（使用者 11/22）
  const DECK = {
    vivilla: { n: "菌絲培養", eff: "菌絲", trial: "寄生", shape: "mushroom" },
    hoffman: { n: "裝備改良", eff: "改裝", trial: "磨損", shape: "gear" },
    youyan: { n: "魔力流動", eff: "魔法", trial: "代價", shape: "crystal" },
    marika: { n: "劍術調整", eff: "劍術", trial: "破綻", shape: "blade" },
    miyahime: { n: "手段變更", eff: "手段", trial: "漏洞", shape: "fan" },
    guan: { n: "福禍相依", eff: "賜福", trial: "降禍", shape: "talisman" },
  };
  const deck = (ch) => Object.assign({ n: "命運卡", eff: "效果", trial: "考驗", shape: "card" }, DECK[ch?.id || ch] || {});

  // ===== 文字 =====
  const pct = (x) => `${x > 0 ? "+" : "−"}${Math.round(Math.abs(x) * 100)}%`;
  const mul = (x) => `×${Math.round(x * 100) / 100}`;
  function skillName(ch, id) { return ch?.skills?.[id]?.name || id; }
  function modText(ch, m) {
    if (!m) return "";
    const out = [];
    for (const [k, n] of [["hp", "生命"], ["mp", "魔力"], ["atk", "攻擊"], ["df", "防禦"], ["spd", "速度"]]) if (m[k]) out.push(`${n} ${m[k] > 0 ? "+" : "−"}${Math.abs(m[k])}`);
    if (m.hpPct) out.push(`生命上限 ${pct(m.hpPct)}`);
    if (m.mpPct) out.push(`魔力上限 ${pct(m.mpPct)}`);
    if (m.dmg) out.push(`造成的傷害 ${mul(m.dmg)}`);
    if (m.basic) out.push(`${skillName(ch, ch?.basic)}（普攻）傷害 ${mul(m.basic)}`);
    for (const [id, x] of Object.entries(m.skill || {})) out.push(`${skillName(ch, id)}傷害 ${mul(x)}`);
    if (m.summon) out.push(`召喚物造成的傷害 ${mul(m.summon)}`);
    if (m.taken) out.push(`受到的傷害 ${mul(m.taken)}`);
    if (m.heal) out.push(`治療量 ${mul(m.heal)}`);
    if (m.shield) out.push(`給的護盾 ${mul(m.shield)}`);
    if (m.mpCost) out.push(`魔力消耗 ${mul(m.mpCost)}`);
    for (const [id, x] of Object.entries(m.cd || {})) out.push(`${skillName(ch, id)}冷卻 ${x > 0 ? "+" : "−"}${Math.abs(x)}`);
    return out.join("、");
  }
  // 原本的技能強化：找名字、說明、在哪一格（q1、e2…）
  function findUp(ch, id) {
    for (const [slot, t] of Object.entries(ch?.upgrades || {})) {
      if (slot === "w") continue;
      for (let i = 0; i < (t.tiers || []).length; i++) for (const o of t.tiers[i]) if (o.id === id) return { ...o, slot: slot + (i + 1), skill: t.skill };
    }
    return null;
  }
  // 一個節點／選項的顯示資料
  function info(ch, o) {
    if (!o) return null;
    if (o.spec) return { name: o.name, desc: o.desc, skill: o.skill ? skillName(ch, o.skill) : "", trial: modText(ch, o.trial), spec: true };
    if (o.up) { const u = findUp(ch, o.up); return { name: u?.name || o.up, desc: u?.desc || "", skill: u ? skillName(ch, u.skill) : "", trial: modText(ch, o.trial) }; }
    return { name: o.name || "", desc: o.desc || modText(ch, o.mod), skill: "", trial: modText(ch, o.trial) };
  }

  // ===== 大招強化也屬於命路（使用者 11/21）=====
  //   每條命路固定一個大招強化（角色檔 upgrades.w 的選項 id），Lv 20 拿到；照 README 草案「命路 1／2（大招：…）」對應
  const W = {
    firsler: ["finale", "dance"], ilshu: ["guilt", "chain"], vivilla: ["thrive", "splash"], guan: ["bless", "calamityGod"],
    hoffman: ["suppress", "shuttle"], marika: ["dozen", "stage"], cangyou: ["shelter", "parade"], youyan: ["guri", "mine"],
    phantom: ["dawn", "spoils"], bastian: ["ridge", "gate"], miyahime: ["sparrow", "dark"],
  };
  for (const [id, ws] of Object.entries(W)) (DATA[id] || []).forEach((r, i) => { if (!r.w) r.w = ws[i]; });
  const W_LEVEL = 20;
  function wUp(ch, r) {
    for (const t of ch?.upgrades?.w?.tiers || []) for (const o of t) if (o.id === r?.w) return o;
    return null;
  }

  // ===== 計算：這個成長資料走到哪、合起來的效果 =====
  //   build.route＝0／1（第幾條；null＝還沒選）；build.nodes＝{ 20: "a", 40: "b", 50: "a" }
  function routes(ch) { return DATA[ch?.id] || null; }
  function compute(ch, build, level) {
    const rs = routes(ch), out = { ups: [], mods: [], taken: [] };
    if (!rs || build.route == null || !rs[build.route]) return out;
    const r = rs[build.route];
    if (r.w && level >= W_LEVEL) out.w = r.w;                  // 大招強化
    for (const L of ORDER) {
      if (level < L) break;
      let o = r[L];
      if (LV.diamond.includes(L)) { const pick = build.nodes?.[L]; o = pick != null ? pool(r)[pick] : null; }
      if (!o) continue;
      if (o.up) out.ups.push(o.up);
      if (o.ups) out.ups.push(...o.ups);
      if (o.spec) out.ups.push(o.spec);                           // 命路專屬的技能特化（角色檔用 R.upHas 檢查）
      if (o.mod) out.mods.push(o.mod);
      if (o.trial) out.mods.push(o.trial);
      out.taken.push(L);
    }
    return out;
  }
  // ===== 命運卡：◆ 節點不是固定的二選一，而是從這條命路的卡池抽兩張選一張 =====
  //   卡池＝r.cards（有寫的話）；沒寫就用 20／40／50 那幾個 a、b 選項（每條路 6 張）
  //   抽過的兩張存在 build.draws[等級]（重新整理不會重抽）；選了的存在 build.nodes[等級]（卡池裡的第幾張）
  //   已經選過的卡不會再被抽到
  function pool(r) { return r.cards || [20, 40, 50].flatMap((L) => (r[L] ? [r[L].a, r[L].b] : [])); }
  // 還沒抉擇的節點（到了等級、選了命路、還沒選卡）
  function pending(ch, build, level) {
    const rs = routes(ch);
    if (!rs || build.route == null) return null;
    for (const L of LV.diamond) if (level >= L && build.nodes?.[L] == null) return L;
    return null;
  }
  // 抽兩張（已經抽過就照舊）
  function draw(ch, build, L) {
    const r = routes(ch)[build.route], P = pool(r);
    build.draws = build.draws || {};
    if (build.draws[L]?.length) return build.draws[L];
    const used = new Set(Object.values(build.nodes || {}).map(Number));
    const left = P.map((_, i) => i).filter((i) => !used.has(i));
    for (let i = left.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [left[i], left[j]] = [left[j], left[i]]; }
    build.draws[L] = left.slice(0, 2);
    return build.draws[L];
  }
  // 把很多個 mod 合成一個（乘的相乘、加的相加）
  const MULT = ["dmg", "basic", "summon", "taken", "heal", "shield", "mpCost"];
  function merge(mods) {
    const m = { skill: {}, cd: {} };
    for (const x of mods) for (const [k, v] of Object.entries(x)) {
      if (k === "skill") for (const [id, f] of Object.entries(v)) m.skill[id] = (m.skill[id] || 1) * f;
      else if (k === "cd") for (const [id, n] of Object.entries(v)) m.cd[id] = (m.cd[id] || 0) + n;
      else if (MULT.includes(k)) m[k] = (m[k] || 1) * v;
      else m[k] = (m[k] || 0) + v;
    }
    return m;
  }

  // 角色檔檢查強化用：R.upHas(upg 物件, "強化 id")——命路可能同時拿到同一層的兩個強化
  R.upHas = (o, id) => !!o && (o._all ? o._all.includes(id) : Object.values(o).includes(id));

  R.Fate = { DATA, LV, ORDER, routes, compute, merge, modText, findUp, info, pool, pending, draw, wUp, W_LEVEL, deck };
})();
