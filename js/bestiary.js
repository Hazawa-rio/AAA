/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/bestiary.js": "20261113212359" });
// 魔物圖鑑（酒館桌上的那本書）：以時空分類列出會戰鬥的生物
// 遇到過＝顯示名字；完成一次戰鬥（打贏）＝顯示技能和數值
// 同一個物種可以出現在好幾個時空（例如奇儂鎮和科考隊森林邊的魔狼）；遇到、打贏的紀錄是全部時空共用的
// 紀錄存在 localStorage 的 rpg.bestiary：{ seen: { 物種: 1 }, known: { 物種: 1 } }
(function () {
  const R = (window.RPG = window.RPG || {});
  const get = () => { try { return JSON.parse(localStorage.getItem("rpg.bestiary")) || { seen: {}, known: {} }; } catch (e) { return { seen: {}, known: {} }; } };
  const set = (v) => { try { localStorage.setItem("rpg.bestiary", JSON.stringify(v)); } catch (e) { /* 無法儲存就算了 */ } };
  const E = () => R.CONFIG.enemies;
  const speciesOf = (kind) => E()[kind]?.species || kind;

  // 每個時空會出現的物種（新增敵人時記得加在這裡）
  const BY_WORLD = {
    CI00001: ["slime", "wolf", "alphaWolf", "jelly", "pirate", "pirateGunner", "pirateCaptain"],
    HW01031: ["ghostActor", "werewolfActor", "mummyActor", "zombieActor", "bat", "vampire", "samuraiArmor", "greatWhite", "reaper"],
    LB00042: ["nightmare", "pinkSlime"],
    RT00317: ["selfBlame", "regret", "longing", "joy", "anxiety", "regretBig", "longingBig", "finalNotice"],
    RU20314: ["slime", "wolf", "mossSlime", "forestWolf", "ruinGuard", "ruinCruiser", "matrixBoss", "matrixNode", "ongergon"],
    MD01921: ["blockBeast", "blockBird", "rexBlock", "rexDoubt", "rexKing"],
    SN00512: ["blockBear", "blockBearMom"],
    TR00088: ["ticketBot", "dodger", "dodgerBoss"],
    BC00003: ["rogueDrone", "tourNav"],
    KT33233: ["jumpSpider", "aphid"],
    CO00756: ["skyCatcher", "catcherBoss"],
    ER00119: ["stitched", "surgeonBoss"],
    MM22330: ["sporeMole", "sporeKing"],
    BH03278: ["looter", "instigator"],
    CD02016: ["eraAgent", "eraCaptain"],
    MJ44444: ["grudge", "grudgeSpirit"],
    LI44444: ["paperMan", "xiBone", "xiFlesh"],
    KN59810: ["pixelJet", "pixelGrunt", "galaxyMarshal"],
    LG00412: ["bronzeBird", "centaur", "prideLion", "dionysus"],
    TRIAL: ["matrixBoss", "matrixNode", "passion", "cultist", "pope", "xiBone", "xiFlesh"],
  };
  // 物種的代表（species 指到一組敵人時，用哪一隻的資料）
  const REP = { blockBeast: "blockBeastRed" };
  const NAME = { blockBeast: "色塊野獸", matrixNode: "能量矩陣" };
  const DESC = {
    dionysus: "酒神狄俄倪索斯。頭戴葡萄藤冠，走路永遠搖搖晃晃。打不倒——要贏祂，只能比祂先喝滿十杯。輸的人明天負責洗杯子。",
    pixelJet: "克亞貝魯巴斯諾裡的像素敵機。照著固定路線飛，子彈一排一排地撒下來。",
    galaxyMarshal: "傳說中的隱藏關卡「扭曲次元」的主人。彈幕密得像銀河，到最後乾脆整個畫面一起打下來。從來沒有人在射擊遊戲裡打贏過它——要等戰機全部墜落之後，才能在戰鬥裡跟它正面交手。",
    pixelGrunt: "像素小兵。走路的時候一格一格地跳，撞到人會發出「嗶」的聲音。",
    bronzeBird: "斯廷法羅斯的怪鳥。羽毛是青銅做的，會像箭一樣射出來。",
    centaur: "傳說的道路荒野裡的半人馬。手上永遠拿著酒壺，喝醉了就會衝過來踢人。",
    prideLion: "眾神考驗裡的獅子。牠說自己從來沒輸過——三個勇士都把牠打趴了，牠趴在地上還是說牠沒輸。全身像大理石一樣白，沒有臉。被說動搖之前，毛皮硬得像青銅。",
    paperMan: "李家大宅裡的紙紮人。臉上畫著笑，兩團胭脂紅得像血。子時抬著喜轎，平時在院子裡飄來飄去。",
    xiBone: "試煉 Boss「囍」的骨：王小妹的骨骸，披著紅紗，坐在子時的喜轎上。李家的小妹為了還二哥的債，被嫁去王家換聘金，在王家被家暴致死。娘家賣了她、婆家打死她，兩個家都不要她，所以她誰也不嫁——骨頭嫁給皮肉。",
    xiFlesh: "試煉 Boss「囍」的皮肉：王小妹的皮肉，從後門外的土丘裡爬出來。和骨同生共死：其中一個倒下，另一個會把它拉回來。",
    skyCatcher: "開船到雲端上的海洋盜採深海雲朵的人。深海的雲蓬鬆、乾淨，賣到別的時空可以做枕頭。",
    catcherBoss: "天空捕手的頭目霍克。扛著吸雲機，堅信這片海的雲都是他的。",
    stitched: "只是來看個小病，卻被「完美縫合」到停不下來的病人。多出來的手臂針腳整齊得嚇人。他們還記得自己是誰。",
    surgeonBoss: "有點偏執的急診室的首席外科醫師。技術無可挑剔，只是從不停手。每一針都精準到小數點第五位。",
    sporeMole: "被毒蘑菇寄生的鼴鼠。蘑菇借牠的身體在礦道裡四處散播孢子。",
    sporeKing: "寄生在發光菇群上的巨大毒菇。把整片菇群的光吸走，用來長大自己。",
    looter: "趁比爾哈頓廣場的混亂，打算洗劫精品店的暴民。抗議喊的口號，他們一句也沒在聽。",
    instigator: "在廣場上煽動洗劫的人。手上拿著兩年前的購物收據，嘴裡說的卻跟那張收據一點關係也沒有。",
    eraAgent: "時代蓋世太保的臥底。混進黑市，記下每一個還在懷念過去的人。",
    eraCaptain: "時代蓋世太保的隊長。他的信念是「過去已經過去了」——說的時候，聲音有一點點抖。",
    grudge: "死者生前斷不開的怨念。沒有剪斷它，死者就沒辦法辦完輪迴的手續。",
    grudgeSpirit: "纏了一百年的怨念。早就忘了當初在恨什麼，只記得不能原諒。",
    slime: "奇儂鎮草原上最常見的魔物。會撞人，也會跳起來壓下來。其實沒什麼敵意，只是漫無目的地亂跳。",
    wolf: "成群行動的魔狼。看到人就會追，會繞到側面撲咬。",
    alphaWolf: "狼群的首領。會嚎叫叫來更多魔狼。",
    jelly: "海裡的水母。漁船最討厭的東西。",
    pirate: "搶劫漁船的海盜。",
    pirateGunner: "帶著火槍的海盜，喜歡保持距離開火。",
    pirateCaptain: "海盜船的船長。會叫手下跳上船。",
    ghostActor: "永遠萬聖節旅館的幽靈扮演者，喜歡躲在樓梯間嚇人。旅館的戰鬥是互相嚇唬。",
    werewolfActor: "滿月主題週的狼人扮演者。一戴上耳朵就忘了怎麼排隊。討厭蘑菇。",
    mummyActor: "把整棟樓的床單拆成繃帶的木乃伊扮演者。哭起來繃帶會濕掉。",
    zombieActor: "住在後院墓園的喪屍住戶。很餓，最愛髏髏的腦漿蛋糕。",
    bat: "吸血伯爵的眷屬。吱吱叫。",
    vampire: "302 號房的客人。三天不肯拉開窗簾，把送餐的服務生咬進房裡擦棺材。",
    samuraiArmor: "午夜嚇人比賽的黑馬選手：戴著頭盔、拿著刀的方塊。盔甲很硬。",
    greatWhite: "午夜嚇人比賽的熱門選手。會從地板裡衝出來。",
    reaper: "午夜嚇人比賽的衛冕選手，連贏了七千多年。",
    nightmare: "會動的布丁（史萊姆的變體）在微波爐裡變成的小 Boss。會噴泡泡糖。",
    pinkSlime: "彈跳噩夢噴出的泡泡糖，黏在地上鼓起來變成的史萊姆。",
    selfBlame: "信件夾帶的自責變成的煙霧。會喃喃自語：「都是我的錯」。",
    regret: "信件夾帶的悔恨。沉重的嘆息會壓上來。",
    longing: "寄不出去的思念。說話的聲音很遠很遠。",
    joy: "信件夾帶的快樂。又快又吵，但不太會傷人。",
    anxiety: "未來帳單上的焦慮。一直在催繳。",
    regretBig: "一封道歉信裡塞滿的悔恨，從信封裡湧了出來。",
    longingBig: "退件室裡找不到收件人的信，聚在一起的思念。",
    finalNotice: "繳不了的未來帳單黏在一起，變成的巨大催繳單。",
    mossSlime: "古代遺跡外的森林裡，長滿青苔的史萊姆。比草原上的兇。",
    forestWolf: "遺跡森林裡的狼。牙齒比魔狼更長。",
    blockBeast: "被看成野獸的色塊。外觀還是原本的色塊，但會撲過來。回答「像物品」通常就會乖乖回去。",
    blockBird: "專吃毛毛蟲的方塊鳥。翅膀是藍色的方塊，嘴是黃色的三角形。",
    rexBlock: "大家不再認為它是霸王龍之後，它只是一塊 3×5 的黑色方形。",
    rexDoubt: "還有人深信它是霸王龍，所以它是。但它自己也開始懷疑了。",
    rexKing: "所有人都深信不疑時的完全體。強度接近 S 級的受難之日。",
    blockBear: "燈塔小鎮森林裡的熊。冬天特別餓，看到人就會追過來，揮著熊掌拍人。",
    blockBearMom: "睡在冰鈴草旁邊的熊媽媽，圍著一條紅圍巾。其實一直在替花擋風。",
    ticketBot: "離開崗位、在月台上遊蕩的剪票機。看到人就想剪票，不管你有沒有票。",
    dodger: "專挑列車經過月台時跳上跳下的逃票客。跑得很快，跳閘門跳得更快。",
    dodgerBoss: "逃票客的老大「跳閘的傑克」。口袋裡永遠有叮噹響的硬幣，小時候是車掌剪的第一百萬張票。",
    rogueDrone: "黑原市失控的巡邏無人機。會用警示雷射趕人——它以為自己在維持秩序。",
    tourNav: "以為自己是觀光巴士的計程車導航系統。很愛它的觀光客，愛到不讓他們下車。",
    jumpSpider: "生態盒裡的跳蛛。前面那對大眼睛看得很遠，一跳就是好幾個你那麼遠。",
    aphid: "葉子上的蚜蟲。軟軟綠綠的，會撞人，也會跳起來壓下來。",
    ruinGuard: "古代遺跡裡巡邏的守衛機關。拿著一把紅色矛頭的能量槌矛：刺、掃、衝鋒。核心是朵拉眼中「這輩子見過最漂亮的東西」。",
    ruinCruiser: "會飛的古代巡弋機關。不受柱子影響，喜歡保持距離射雷射；躲在柱子或矮牆後面擋得住。",
    matrixBoss: "古代遺跡寶庫的守護者・殲滅矩陣。",
    ongergon: "古代遺跡秘密寶庫裡的超古代兵器。雙肩是能量炮，手裡是能量雙刃長槍。很快、很會閃，正面的投射物會被旋轉的雙刃擋下；被它打到會露出破綻。撞上能量水晶會暈眩。",
    matrixNode: "殲滅矩陣的能量矩陣。",
    passion: "S 級試煉：受難之日。",
    cultist: "受難之日的信徒。",
    pope: "受難之日的教宗。",
  };
  const SK = { bite: "撕咬", pounce: "撲擊", ram: "撞擊", slam: "壓制", sweep: "橫掃", shot: "射擊", call: "召喚", spin: "迴旋", rend: "撕裂撲擊", gum: "噴泡泡糖", howl: "嚎叫", slash: "揮砍" };

  function defOf(sp) {
    if (REP[sp]) return E()[REP[sp]];
    if (E()[sp]) return E()[sp];
    if (sp === "matrixNode") return E().matrixBoss?.part;
    return null;
  }
  const nameOf = (sp) => NAME[sp] || defOf(sp)?.name || sp;

  R.Bestiary = {
    BY_WORLD, speciesOf,
    data: get,
    markSeen(kinds) { const d = get(); for (const k of kinds) d.seen[speciesOf(k)] = 1; set(d); },
    markKnown(kinds) { const d = get(); for (const k of kinds) { const s = speciesOf(k); d.seen[s] = 1; d.known[s] = 1; } set(d); },
    // 圖鑑的內容（酒館的面板）
    html(tab, esc) {
      const W = R.Commissions?.WORLDS || {}, d = get();
      const tabs = [...Object.keys(BY_WORLD).filter((w) => W[w]), "TRIAL"];
      tab = tabs.includes(tab) ? tab : tabs[0];
      const list = BY_WORLD[tab];
      const seenN = list.filter((s) => d.seen[s]).length;
      const tabHtml = tabs.map((w) => `<button type="button" class="bx-tab${w === tab ? " on" : ""}" data-act="bxTab" data-w="${w}" style="--c:${W[w]?.color || "#7a6a5a"}">${esc(W[w]?.name || "試煉")}</button>`).join("");
      const cards = list.map((sp) => {
        const D = defOf(sp), seen = d.seen[sp], known = d.known[sp];
        if (!seen) return `<div class="bx-card unknown"><canvas width="72" height="72" data-k="${sp}" data-shadow="1"></canvas><b>？？？</b><p>還沒遇到過</p></div>`;
        let body = `<p>${esc(DESC[sp] || "")}</p>`;
        if (!known) body += `<p class="bx-lock">完成一次戰鬥（打贏）後解鎖技能和數值</p>`;
        else if (D) {
          const st = [["生命", D.hp], ["攻擊", D.atk], ["防禦", D.df], ["速度", D.spd], ["行動點", D.ap]].filter(([, v]) => v != null);
          const sks = Object.entries(D).filter(([k, v]) => v && typeof v === "object" && !Array.isArray(v) && (v.base != null || v.kind || (SK[k] && v.ap != null)) && k !== "part").map(([k, v]) => {
            const bits = [];
            if (v.ap != null) bits.push(`行動點 ${v.ap}`);
            if (v.base != null) bits.push(`傷害 ${v.base}`);
            if (v.radius) bits.push(`範圍 ${v.radius}`);
            if (v.kind) bits.push(`叫來${nameOf(speciesOf(v.kind))}`);
            if (v.ranged) bits.push("遠距離");
            return `<li><b>${esc(v.name || SK[k] || k)}</b>${bits.length ? `<span>${bits.join("・")}</span>` : ""}</li>`;
          });
          body += `<div class="bx-stats">${st.map(([k, v]) => `<span>${k} <b>${v}</b></span>`).join("")}</div>${sks.length ? `<ul class="bx-skills">${sks.join("")}</ul>` : ""}`;
          const also = Object.entries(BY_WORLD).filter(([w, l]) => w !== tab && l.includes(sp)).map(([w]) => W[w]?.name || "試煉");
          if (also.length) body += `<p class="bx-also">也出現在：${esc(also.join("、"))}</p>`;
        }
        return `<div class="bx-card${known ? " known" : ""}"><canvas width="72" height="72" data-k="${sp}"></canvas><b>${esc(nameOf(sp))}</b>${body}</div>`;
      }).join("");
      return { tab, html: `<div class="bx-tabs">${tabHtml}</div><p class="tv-note" style="margin:6px 0 10px">${esc(W[tab]?.name || "試煉")}：已遇到 ${seenN} / ${list.length} 種。遇到過會記下名字，打贏一次後才會寫下技能和數值。</p><div class="bx-grid">${cards}</div>` };
    },
    // 小圖：有專屬造型的用 enemy-art.js，其他畫成彩色方塊／圓
    thumb(cv) {
      const sp = cv.dataset.k, D = defOf(sp), g = cv.getContext("2d"), shadow = !!cv.dataset.shadow;
      g.clearRect(0, 0, cv.width, cv.height);
      const kind = REP[sp] || sp, art = R.EnemyArt?.[kind];
      const r = D?.rex ? 14 : 20, u = { r, x: 0, facing: Math.PI / 2, alive: true, def: D || {}, kind, _rexT0: 1 };
      if (shadow) { g.fillStyle = "rgba(90,74,58,.25)"; g.beginPath(); g.arc(36, 38, 22, 0, Math.PI * 2); g.fill(); g.fillStyle = "rgba(90,74,58,.6)"; g.font = "900 22px 'Noto Sans TC', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("?", 36, 39); return; }
      g.save();
      if (art && D) { try { art(g, u, { x: 36, y: 40 }, 5000); } catch (e) { /* 畫不出來就算了 */ } }
      else {
        const col = D?.color || (D?.ai === "slime" ? "#2bb24c" : D?.ai === "wolf" || D?.ai === "alphaWolf" ? "#5a5f78" : "#7a7a7a");
        g.fillStyle = "#fff"; g.strokeStyle = col; g.lineWidth = 4;
        if (D?.ai === "slime" || D?.ai === "jelly") { g.beginPath(); g.arc(36, 40, 20, 0, Math.PI * 2); g.fillStyle = col; g.globalAlpha = 0.3; g.fill(); g.globalAlpha = 1; g.stroke(); g.fillStyle = "#1d1d1f"; g.beginPath(); g.arc(30, 37, 2.5, 0, Math.PI * 2); g.arc(42, 37, 2.5, 0, Math.PI * 2); g.fill(); }
        else { g.beginPath(); g.roundRect ? g.roundRect(16, 20, 40, 40, 8) : g.rect(16, 20, 40, 40); g.fill(); g.stroke(); g.fillStyle = col; g.font = "900 18px 'Noto Sans TC', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText((nameOf(sp) || "?")[0], 36, 41); }
      }
      g.restore();
    },
  };
})();
