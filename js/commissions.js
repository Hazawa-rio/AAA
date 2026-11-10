/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/commissions.js": "20261110175453" });
// 時空與委託單
// 每個時空有編號（#CI00001…）；委託單標記：時空、委託人、委託內容、報酬
// 同一個時空可以同時接多張委託；conflicts 裡的委託不能和這張同時接（例如幫海盜運貨 ↔ 追查海盜）
// stages：委託的流程（先找委託人 → 做事 → 回去找委託人）。冒險失敗時，沒完成的委託照進度比例拿時空幣
//   talk   找委託人談（要站進委託人前面的圓圈，多人時全員到齊才會開始）
//   kill   打倒 need 群魔物（outside：只算城牆外）
//   escort 到 at 和車隊會合，進行護送戰（特殊戰鬥）
//   boss   到 at 打倒 variant 這場戰鬥
//   pick   在 at 撿起 item
//   report 回去找委託人（take：要交出的道具）
// wip：玩法還沒設計（只有測試按鈕）；extra：額外委託，不能單獨接取
// 委託執照：C → B → A → S → SS → SSS，靠完成委託的「執照經驗」升級，越高級差距越大
(function () {
  const R = (window.RPG = window.RPG || {});

  const WORLDS = {
    CI00001: {
      code: "#CI00001",
      name: "奇儂鎮",
      summary: "規模不小的漁港與海上市集。西邊臨海設有港口，東邊是魔物出沒的草原，用簡單的城牆隔開，整座鎮呈南北走向。",
      geography: [
        "西側：港口、碼頭與海上市集",
        "中央：南北走向的鎮區",
        "東側：簡單的城牆，牆外是魔物出沒的草原",
      ],
      issues: [
        "農業不發達，農產品要靠商人用馬車載著醃漬農產運進來",
        "商人的馬車經常在草原上被魔狼襲擊",
        "草原上的魔物最近變得異常凶猛",
        "海運發達，但海盜會搶劫漁船和商船",
      ],
      rank: "C",                     // 需要的委託執照等級
      level: "建議 Lv 1～10",
      color: "#2f7fa8",
      ready: true,                   // 地圖做好了才能出發
    },
    HW01031: {
      code: "#HW01031",
      name: "永遠萬聖節旅館",
      summary: "永遠萬聖節旅館是個慶祝每一天的地方，因為這裡每一天都是萬聖節！這裡有太多層了，每一層都是某一年的萬聖節直到7746年的今天，這裡的樓層實在是多的數不清，這裡人人都是角色扮演者，因為實在太入戲了以至於他們或許真的成為了他們扮演的怪物，這裡不為喪屍提供套房，因為他們更偏好睡在後院的墓園，雖然這裡的大家本性並不壞，只是太過沉溺於他們的角色了，像是狼人和吸血鬼總會有爭執，死神會毫無理由的把別的住戶移動到稱作地獄的他的房間，這裡總體是個不錯的地方。",
      rank: "C",
      level: "建議 Lv 1～10",
      color: "#d9731e",
    },
    LB00042: {
      code: "#LB00042",             // 編號暫定
      name: "美食研究所",
      summary: "美食研究所並不是字面意義的研究食物，是個正經的科研機構，這裡有一台沒人知道能創造甚麼東西的神奇微波爐，即使這裡有著不同領域的研究學者，甚至哲學家、文學家或是魔法研究者都研究不明白這個微波爐，除此之外這裡有一個非常大的理性倉庫，理性倉庫非常理性，你只能按照電腦印出的採購清單挑選實驗素材，不在採購清單上的素材，你甚至不知道該怎麼拿起來，理性倉庫內偶爾會出現活著的素材，微波爐也或許會產出活物？",
      rank: "C",
      level: "建議 Lv 1～10",
      color: "#8a4fd1",
    },
    // ===== 準備中的時空（只有委託單；簡介是暫定稿） =====
    RT00317: {
      code: "#RT00317",
      name: "午夜郵局",
      summary: "午夜郵局只在午夜十二點開門，負責投遞所有「寄錯時間」的信件：寫給十年前自己的道歉信、寄給明天的帳單、遲到了一百年的情書。郵差們提著燈在不同的時間之間穿梭，只要信件送到收件人手上，那段錯開的時間就會被輕輕縫合。不過有些信，收件人並不想收到。",
      rank: "C",
      level: "建議 Lv 1～10",
      color: "#3a4a8f",
      ready: false,
    },
    SN00512: {
      code: "#SN00512",
      name: "燈塔小鎮",
      summary: "被暴風雪包圍的海岬小鎮，鎮上唯一的燈塔是漁船回家的方向。燈塔守最近病倒了，燈火時明時滅；鎮民們輪流守夜、拉著雪橇送柴火、在冰封的港口鑿洞釣魚。這裡沒有什麼怪事，只有很長的冬天，和一群努力把日子過下去的人。",
      rank: "C",
      level: "建議 Lv 1～10",
      color: "#4a8fb0",
      ready: false,
    },
    TR00088: {
      code: "#TR00088",
      name: "不停歇的月台",
      summary: "月台前的列車看起來永遠在離站，也永遠在進站——其實那是一條長得看不見頭尾的列車，沿著巨大的環狀軌道不停地轉圈。車上有人住了一輩子，車廂裡有市場、學校和墓地。整條路線只有東、南、西、北四座月台能下車，錯過了，就得再等它繞一整圈。",
      rank: "C",
      level: "建議 Lv 1～10",
      color: "#8a6a3a",
      ready: false,
    },
  };

  const LIST = [
    {
      id: "CI00001-01", world: "CI00001", title: "護送醃漬馬車",
      client: "商人公會・瑪莉莎", clientNote: "往來草原的醃漬品商人",
      content: "下一批醃漬蔬菜和果乾要從草原另一頭的農村運進鎮上。上次的車隊在半路被魔狼衝散了，這次希望有人全程護送，至少讓三輛馬車中的兩輛平安抵達東門。",
      reward: { coins: 120, xp: 300, license: 220 }, tags: ["護送", "草原"],
      stages: [
        { type: "talk", npc: "marisa", text: "到商人公會前找瑪莉莎",
          lines: ["你就是接下委託的人？太好了。", "車隊已經停在東門外的商路上，等護衛一到就出發。", "魔狼最喜歡從草叢裡撲上來咬拖車的馬……拜託了，至少讓兩輛車平安進城。"] },
        { type: "escort", at: { x: 2960, y: 2030 }, text: "到東門外的商路和車隊會合",
          lines: ["車隊停在商路上，車伕們不安地望著四周的草原。", "遠處傳來狼嚎——牠們來了。"] },
        { type: "report", npc: "marisa", text: "回商人公會向瑪莉莎回報",
          lines: ["車隊進城了！我在市集口就看到了。", "這批醃漬品夠全鎮吃上好一陣子。謝謝你，這是說好的報酬。"] },
      ],
    },
    {
      id: "CI00001-02", world: "CI00001", title: "清掃東牆外的魔物",
      client: "東牆守備隊長・哈根", clientNote: "守了城牆二十年的老兵",
      content: "最近牆外的魔物多得不正常，巡邏隊已經撐不住了。請到東牆外的草原清掉三群魔物，讓我的人能喘口氣。",
      reward: { coins: 100, xp: 250, license: 180 }, tags: ["討伐", "草原"],
      stages: [
        { type: "talk", npc: "hagen", text: "到東門旁的守備所找哈根",
          lines: ["來得正好。牆外的史萊姆和魔狼一天比一天多。", "魔狼會成群行動，一看到人就撲過來——別被包圍了。", "清掉三群就好。剩下的，我們守得住。"] },
        { type: "kill", need: 3, outside: true, text: "打倒東牆外的魔物群" },
        { type: "report", npc: "hagen", text: "回守備所向哈根回報",
          lines: ["從城牆上都看見了，幹得好。", "今晚巡邏隊總算能睡個好覺。這是報酬，收下吧。"] },
      ],
    },
    {
      id: "CI00001-07", world: "CI00001", title: "草原的怪異樹莓",
      client: "鎮公所・歐文", clientNote: "負責記錄鎮上大小事的書記官",
      content: "鎮上傳聞草原深處有一棵果樹，結的樹莓吃了會力量大增。最近牆外的魔狼特別凶猛，我懷疑兩者有關。請去查清楚——如果真有這種樹莓，帶一顆回來。",
      reward: { coins: 160, xp: 350, license: 260 }, tags: ["調查", "傳聞", "草原"],
      stages: [
        { type: "talk", npc: "owen", text: "到鎮公所前找歐文",
          lines: ["傳聞是從幾個醉醺醺的商人那裡傳出來的：草原東北邊有一棵會發光的果樹。", "吃了那樹莓，連魔狼都能一口咬斷木樁……", "如果是真的，這可是大事。麻煩你去看看。"] },
        { type: "boss", at: { x: 3010, y: 330 }, variant: "alphaWolf", text: "找到草原深處的果樹",
          lines: ["果樹下的草地被踩得一片狼藉，滿地都是吃剩的紫色樹莓。", "一隻體型大得異常的魔狼抬起頭——牠的身體兩側長出了刀刃般的骨刺。"] },
        { type: "pick", at: { x: 3010, y: 330 }, item: "weirdBerry", text: "從果樹摘下怪異樹莓" },
        { type: "report", npc: "owen", take: "weirdBerry", text: "把樹莓交給歐文",
          lines: ["這就是那個樹莓？……顏色真不吉利。", "你說吃了它的魔狼長出了刀刃？那就說得通了——這東西會讓魔物變異。", "人類吃了會怎樣，沒人敢試。這種東西不能流進鎮上。", "至少你阻止了那頭魔狼繼續變異下去。這份報酬，是鎮公所的一點心意。"] },
      ],
    },
    {
      id: "CI00001-04", world: "CI00001", title: "追查搶劫漁船的海盜",
      client: "漁會會長・老伯恩", clientNote: "在港口捕魚四十年",
      content: "這個月已經有五艘漁船被搶，連漁獲帶網子全沒了。聽說海盜的船藏在西岸的礁石後面，請找出他們的據點，把搶走的東西拿回來。",
      reward: { coins: 150, xp: 350, license: 280 }, tags: ["調查", "海上"],
      conflicts: ["CI00001-06"],
      stages: [
        { type: "talk", npc: "bern", text: "到漁會前找老伯恩",
          lines: ["海盜的事？……坐吧。", "他們從不在白天出手，搶完就消失在海上，連個影子都抓不到。", "鎮上一定有人看見過什麼。到處打聽打聽、四處看看，找到三條線索，應該就能摸到他們的窩。"] },
        // 線索：每一趟從地圖的線索池隨機挑 need 個（地點、內容都不一樣）
        // 找法：走到附近、伊爾舒的「疑心病」感測、向鎮民打聽（會告訴你大概的區域）
        { type: "clues", need: 3, pool: "pirateClues", text: "在鎮上打聽、搜查海盜的線索" },
        { type: "boss", at: { x: 760, y: 470 }, room: "pirates", variant: null, give: "stolenNets", text: "搭老伯恩的船突襲海盜船",
          lines: ["線索全都指向西岸的礁石後面。", "老伯恩已經把船推下水了：「上來吧，今晚就把網子拿回來！」"] },
        { type: "report", npc: "bern", take: "stolenNets", text: "把漁網還給老伯恩",
          lines: ["這是……我們漁會的網子！木牌都還綁著。", "那個戴黑色魚鰭徽章的船長……原來就是他們的頭子。", "謝謝你。這是漁會大家湊出來的報酬，收下吧。"] },
      ],
    },
    {
      id: "CI00001-05", world: "CI00001", title: "海上市集的贓物",
      client: "市集管理員・蒂娜", clientNote: "管理海上市集攤位的年輕管理員",
      content: "市集裡最近出現不少來路不明的貨，我懷疑是海盜搶來的商船貨物。請幫我找出是誰在銷贓，但不要在市集裡鬧事。",
      reward: { coins: 90, xp: 220, license: 160 }, tags: ["調查", "市集"],
      conflicts: ["CI00001-06"],
      stages: [
        { type: "talk", npc: "tina", text: "到海上市集找蒂娜",
          lines: ["這是漁會和商人公會交來的失竊清單。", "清單上的東西如果出現在哪個攤位上，那攤的老闆就有問題。", "拜託看仔細一點——冤枉了好人，市集的名聲就毀了。"] },
        // 比對：每一趟隨機挑失竊物、銷贓的攤位、有相似假貨的攤位
        { type: "inspect", pool: "stolenGoods", text: "比對攤位上的貨物，找出銷贓的攤位" },
        // 跟蹤：銷贓的攤主會走向隨機的交貨地點；不能跟丟、也不能被發現
        { type: "tail", pool: "tailRoutes", text: "跟蹤銷贓的攤主，找出交貨地點" },
        { type: "report", npc: "tina", text: "回市集向蒂娜回報",
          lines: ["交給了戴黑色魚鰭徽章的人？……果然和海盜有關。", "那個攤位我會處理，也會把消息告訴老伯恩。", "而且你一次都沒在市集裡動手，太感謝了。"] },
      ],
    },
    {
      id: "CI00001-06", world: "CI00001", title: "深夜的貨箱",
      client: "匿名（署名：黑鰭）", clientNote: "字跡潦草，信封上有海水的痕跡",
      content: "今晚把北碼頭倉庫裡的三個貨箱搬到第七號棧橋，別打開，也別問裡面是什麼。事成之後報酬加倍。",
      reward: { coins: 220, xp: 150, license: 120 }, tags: ["運送", "可疑"],
      // 偷看箱子後改成還給老伯恩：拿不到黑鰭的錢，但漁會會給一點謝禮
      altReward: { coins: 60, xp: 200, license: 160 }, altNote: "改成把漁網還給老伯恩",
      conflicts: ["CI00001-04", "CI00001-05"],
      shady: true,
      stages: [
        { type: "spot", at: { x: 500, y: 600 }, night: true, text: "入夜後到北碼頭倉庫",
          lines: ["夜深了。倉庫的門沒鎖，裡面堆著三個用油布蓋住的貨箱。", "門縫裡塞著一張紙條：「一次搬一箱，別讓巡邏的看見。」"] },
        // 搬運：一次一箱、變慢、不能用 Q；被巡邏的守衛看見，那一箱就被沒收（回倉庫重搬）
        { type: "carry", n: 3, from: { x: 500, y: 600 }, to: { x: 830, y: 1485 }, alt: { x: 1200, y: 892 }, text: "把貨箱搬到第七號棧橋" },
      ],
    },
    {
      id: "CI00001-08", world: "CI00001", title: "釣條大魚", extra: true,
      client: "漁會會長・老伯恩", clientNote: "在港口捕魚四十年",
      content: "漁會的船缺個幫手。跟著我上船出海釣一次魚吧——釣到的魚越好，我付的金幣越多。",
      reward: { coins: 0, xp: 0, license: 0 }, rewardNote: "依釣到的魚給金幣（只有金幣）", tags: ["額外", "海上", "釣魚"],
      stages: [
        { type: "talk", npc: "bern", text: "到漁會前找老伯恩",
          lines: ["想跟船出海？好啊，多一雙手總是好的。", "餌自己準備：史萊姆的黏液、魔狼的生肉都行。黏液招來的多半是墨魚、花枝那類怪東西，生肉嘛，大魚愛得很。", "船停在北碼頭，準備好了就上來。"] },
        { type: "fish", at: { x: 790, y: 630 }, text: "到北碼頭上船釣魚" },
      ],
    },
  ];

  // ===== #HW01031 永遠萬聖節旅館（只有委託單，時空還在準備中） =====
  LIST.push(
    {
      id: "HW01031-01", world: "HW01031", title: "302 號房的吸血伯爵", steps: 3,
      client: "旅館經理・骨骨", clientNote: "一絲不苟的骷髏經理，領結永遠打得端正",
      content: "302 號房的客人扮成吸血伯爵，已經三天不肯拉開窗簾，還把送餐的服務生「咬」進房裡當僕人。請在不弄壞他興致的前提下，把我的員工帶回來。",
      reward: { coins: 110, xp: 260, license: 190 }, tags: ["救援", "旅館"],
    },
    {
      id: "HW01031-02", world: "HW01031", title: "櫃檯前的狼人排隊潮", steps: 3,
      client: "旅館櫃檯・骸骸", clientNote: "手指骨敲鍵盤敲得飛快的櫃檯人員",
      content: "滿月主題週一開始，整排狼人扮演者在櫃檯前嚎叫著辦入住，後面的客人全被嚇跑了。請幫我維持秩序，讓大家乖乖排隊。",
      reward: { coins: 90, xp: 220, license: 160 }, tags: ["秩序", "旅館"],
      conflicts: ["HW01031-04"],
    },
    {
      id: "HW01031-03", world: "HW01031", title: "木乃伊的繃帶危機", steps: 2,
      client: "旅館清潔隊長・骼骼", clientNote: "拿著拖把巡遍每一層樓的清潔隊長",
      content: "木乃伊扮演者們把整棟樓的毛巾和床單都拆成繃帶纏在身上，洗衣房已經空了。請到各樓層把布料回收回來——記得留一條給他們，不然他們會哭。",
      reward: { coins: 80, xp: 200, license: 140 }, tags: ["回收", "旅館"],
    },
    {
      id: "HW01031-04", world: "HW01031", title: "午夜嚇人比賽", steps: 3,
      client: "旅館公關・骷骷", clientNote: "笑起來下顎會喀喀響的公關",
      content: "今晚要辦「午夜嚇人比賽」做宣傳，可是報名的扮演者太入戲，彩排就嚇昏了兩位評審。請你當評審兼保鑣，讓比賽順利辦完。",
      reward: { coins: 130, xp: 240, license: 200 }, tags: ["活動", "旅館"],
      conflicts: ["HW01031-02"],
    },
    {
      id: "HW01031-05", world: "HW01031", title: "找不到出口的幽靈", steps: 2,
      client: "旅館經理・骨骨", clientNote: "一絲不苟的骷髏經理，領結永遠打得端正",
      content: "一位扮幽靈的客人宣稱自己「穿牆迷路了」，從昨晚就在樓梯間徘徊，怎麼勸都不肯走樓梯下來。請陪他「穿牆」回到大廳。",
      reward: { coins: 70, xp: 180, license: 130 }, tags: ["護送", "旅館"],
    },
  );

  // ===== #LB00042 美食研究所 =====
  LIST.push(
    {
      id: "LB00042-01", world: "LB00042", title: "照單領料",
      client: "文學研究員・普羅", clientNote: "堅信微波爐讀得懂文學的文學研究員",
      content: "電腦印出的採購清單把「雞蛋」印成了「難蛋」，那顆冒著怪味的難蛋擋住了我的實驗！請到研究所來找我，幫我處理掉它，再照新的清單把雞蛋領出來。",
      reward: { coins: 140, xp: 230, license: 170 }, tags: ["跑腿", "倉庫"],
      // 普羅的滿意度：普羅米修斯小雞 > 噴出文字 > 史詩蛋；報廢了窒礙難行1號另外加報酬
      rewardBy: { chick: { coins: 200, xp: 300, license: 220 }, text: { coins: 140, xp: 230, license: 170 }, epicEgg: { coins: 90, xp: 180, license: 130 } },
      bonus: { coins: 60, xp: 80, license: 40 },
      stages: [
        { type: "talk", npc: "pro", text: "到研究室找普羅" },
        { type: "labFetch", text: "照採購清單到理性倉庫拿荷馬史詩和難蛋" },
        { type: "labEgg", text: "把難蛋丟進報廢室（左下角）" },
        { type: "labExp", text: "幫普羅下單雞蛋，看他做實驗" },
      ],
    },
    {
      id: "LB00042-02", world: "LB00042", title: "神奇微波爐的排隊表", steps: 2,
      client: "所長・瑪德蓮", clientNote: "研究所的所長，堅信微波爐裡藏著宇宙的真理",
      content: "研究所只有一台神奇微波爐，學者們為了排隊順序吵得不可開交，昨天還有人把排隊表塞進微波爐「加熱」。請幫我重新排好使用表，讓大家心服口服。",
      reward: { coins: 90, xp: 210, license: 160 }, tags: ["協調", "研究所"],
    },
    {
      id: "LB00042-03", world: "LB00042", title: "逃出倉庫的實驗素材", steps: 3,
      client: "倉庫值班員・拉格", clientNote: "只看採購清單不看人的值班員",
      content: "有人用微波爐熱過的「會動的布丁」跑回理性倉庫裡躲起來了，還把貨架弄得一團亂。請把它抓回來——依規定，你得先申請一張寫著「布丁（活）」的採購清單，才拿得起它。",
      reward: { coins: 120, xp: 260, license: 190 }, tags: ["捕捉", "倉庫"],
      conflicts: ["LB00042-04"],
    },
    {
      id: "LB00042-04", world: "LB00042", title: "微波爐的另一種用法", steps: 3,
      client: "匿名研究員", clientNote: "紙條上沾著焦糖，字跡很急",
      content: "那個會動的布丁是我的研究成果，別讓管理員把它關回倉庫！幫我把它偷偷帶到微波爐前，我要證明微波爐能「創造」新食材。",
      reward: { coins: 180, xp: 200, license: 150 }, tags: ["運送", "可疑"], shady: true,
      conflicts: ["LB00042-03"],
    },
    // ===== #RT00317 午夜郵局 =====
    {
      id: "RT00317-01", world: "RT00317", title: "寄給昨天的道歉信", steps: 3,
      client: "夜班郵差・艾德加", clientNote: "提燈總是比人先到的郵差",
      content: "有封道歉信必須在「昨天」送到，可是收件人昨天一整天都在搬家。請幫我追著他的搬家路線，在昨天結束前把信交給他。",
      reward: { coins: 100, xp: 240, license: 180 }, tags: ["跑腿", "時間"],
    },
    {
      id: "RT00317-02", world: "RT00317", title: "退件室的黑貓", steps: 3,
      client: "退件室管理員・諾拉", clientNote: "戴著三副眼鏡的管理員",
      content: "退件室裡住了一隻黑貓，牠會把找不到收件人的包裹拖去藏起來。今晚的退件堆得比天花板還高了，請幫我找到牠的藏寶處。",
      reward: { coins: 90, xp: 220, license: 160 }, tags: ["搜索", "動物"],
    },
    // ===== #SN00512 燈塔小鎮 =====
    {
      id: "SN00512-01", world: "SN00512", title: "燈塔的柴火", steps: 3,
      client: "燈塔守的女兒・莉亞", clientNote: "在父親病倒後接下守夜的女孩",
      content: "暴風雪把路埋住了，燈塔的柴火只夠撐到今晚。請幫我拉雪橇到森林邊的柴房，把柴火送上燈塔，船還在外面。",
      reward: { coins: 100, xp: 250, license: 180 }, tags: ["運送", "暴風雪"],
    },
    {
      id: "SN00512-02", world: "SN00512", title: "冰上的漁獲", steps: 2,
      client: "港口的老漁夫・哈康", clientNote: "鬍子上永遠結著冰",
      content: "港口結冰了，船出不去，只能在冰上鑿洞釣魚。我的手凍得握不住線，幫我釣夠今晚全鎮的晚餐吧。",
      reward: { coins: 80, xp: 200, license: 150 }, tags: ["釣魚", "冰上"],
    },
    // ===== #TR00088 不停歇的月台 =====
    {
      id: "TR00088-01", world: "TR00088", title: "錯過月台的旅客", steps: 3,
      client: "北月台站務員・卡洛", clientNote: "對著列車揮了一輩子旗子的站務員",
      content: "有位老先生在車上睡過頭，已經錯過東月台三圈了。他的家人在東月台等他。請上車找到他，在列車經過東月台時把他送下車。",
      reward: { coins: 110, xp: 260, license: 190 }, tags: ["護送", "列車"],
    },
    {
      id: "TR00088-02", world: "TR00088", title: "第四千節車廂的市場", steps: 3,
      client: "車上的商人・米拉", clientNote: "出生在列車上、從沒下過車的商人",
      content: "我的貨要在南月台交給地面上的買家，可是我從來沒下過車，不知道月台長什麼樣子。請幫我把貨搬過好幾節車廂，在南月台交貨。",
      reward: { coins: 100, xp: 230, license: 170 }, tags: ["運送", "列車"],
    },
  );

  // 還沒設計玩法的委託（沒有 stages）：只有測試按鈕
  for (const c of LIST) if (!c.stages && c.world !== "CI00001") c.wip = true;

  const RANKS = ["C", "B", "A", "S", "SS", "SSS"];
  // 升到各等級需要的累積執照經驗（越高級差距越大）
  const RANK_XP = { C: 0, B: 1500, A: 8000, S: 30000, SS: 100000, SSS: 300000 };
  const rankOfXp = (x) => { let r = "C"; for (const k of RANKS) if (x >= RANK_XP[k]) r = k; return r; };

  // 一輪冒險：從酒館第一次出發開始，執照從 C 起跳
  // 冒險中帶著走的：金幣、行囊（20 格）、已完成的委託（同一輪不能重複接）、執照經驗
  // 全員戰敗＝任務失敗，這輪冒險結束（全部歸零）
  const store = {
    get() { try { return JSON.parse(localStorage.getItem("rpg.adventure")) || null; } catch (e) { return null; } },
    set(v) { try { localStorage.setItem("rpg.adventure", JSON.stringify(v)); } catch (e) { /* 忽略 */ } },
    clear() { try { localStorage.removeItem("rpg.adventure"); } catch (e) { /* 忽略 */ } },
  };
  const fill = (a) => Object.assign({ rank: "C", lxp: 0, cleared: [], done: [], gold: 0, items: [], started: Date.now() }, a);
  R.Adventure = {
    RANKS, RANK_XP,
    get() { const a = store.get(); return a ? fill(a) : null; },
    save(a) { store.set(a); },
    rank() { return this.get()?.rank || "C"; },
    start() {
      let a = this.get();
      if (!a) { a = fill({}); R.Progress?.clearAdventure(); }   // 新的一輪：成長、寶物歸零
      store.set(a);
      return a;
    },
    // 執照：目前等級、經驗、下一級需要多少
    license(a = this.get()) {
      const lxp = a?.lxp || 0, rank = rankOfXp(lxp), i = RANKS.indexOf(rank), next = RANKS[i + 1];
      return { rank, lxp, next, need: next ? RANK_XP[next] : null, from: RANK_XP[rank] };
    },
    // 一趟成功回到酒館：帶回金幣與行囊、記錄完成的委託、加執照經驗
    finishTrip({ world, done, license, gold, items, flags, failed }) {
      const a = this.start(), before = a.rank;
      a.flags = { ...(a.flags || {}), ...(flags || {}) };     // 例如替黑鰭辦過事（之後的海盜劇情會用到）
      a.cleared.push(world);
      for (const id of done) if (!a.done.includes(id)) a.done.push(id);
      a.failed = a.failed || [];
      for (const id of failed || []) if (!a.failed.includes(id)) a.failed.push(id);     // 旅館嚇破膽：失敗的委託這輪不能再接
      a.lxp += license;
      a.rank = rankOfXp(a.lxp);
      a.gold = gold; a.items = items;
      store.set(a);
      return { before, after: a.rank, lxp: a.lxp, gained: license };
    },
    end() { const a = this.get(); store.clear(); R.Progress?.clearAdventure(); return a; },
  };

  R.Commissions = {
    RANKS,
    WORLDS,
    LIST,
    get(id) { return LIST.find((c) => c.id === id); },
    ofWorld(w) { return LIST.filter((c) => c.world === w); },
    steps(c) { return c.stages ? c.stages.length : c.steps || 1; },
    stage(trip, id) { const c = this.get(id); return c.stages ? c.stages[this.progressOf(trip, id)] || null : null; },
    // 能不能接：同一趟只能去一個時空；不能和已接的委託衝突；這輪冒險已經完成的不能再接
    canAccept(id, accepted, adv = R.Adventure.get()) {
      const c = this.get(id);
      if (!c) return { ok: false, why: "找不到這張委託" };
      if (accepted.includes(id)) return { ok: false, why: "已經接下了" };
      if (adv?.done?.includes(id)) return { ok: false, why: "這輪冒險已經完成過了" };
      if (adv?.failed?.includes(id)) return { ok: false, why: "這輪冒險已經失敗過了，不能重做" };
      if (WORLDS[c.world].ready === false) return { ok: false, why: "這個時空還在準備中，暫時無法前往" };
      const other = accepted.map((x) => this.get(x)).find((x) => x && x.world !== c.world);
      if (other) return { ok: false, why: `一次只能前往一個時空（已接 ${WORLDS[other.world].code} ${WORLDS[other.world].name} 的委託）` };
      const clash = accepted.map((x) => this.get(x)).find((x) => x && ((c.conflicts || []).includes(x.id) || (x.conflicts || []).includes(c.id)));
      if (clash) return { ok: false, why: `和已接的「${clash.title}」互相衝突` };
      return { ok: true };
    },
    // 出發前檢查：額外委託不能單獨接取
    canDepart(accepted) {
      if (!accepted.length) return { ok: false, why: "還沒有接委託" };
      if (accepted.every((id) => this.get(id)?.extra)) return { ok: false, why: "額外委託不能單獨接取，請再接一張一般委託" };
      return { ok: true };
    },
    rankOk(worldId, rank) { return RANKS.indexOf(rank) >= RANKS.indexOf(WORLDS[worldId].rank || "C"); },
    progressOf(trip, id) {
      const c = this.get(id), n = this.steps(c);
      if ((trip.done || []).includes(id)) return n;
      return Math.min(n, (trip.progress || {})[id] || 0);
    },
    // 推進一個進度；走完就算完成
    advance(trip, id) {
      const c = this.get(id), n = this.steps(c);
      trip.progress = trip.progress || {}; trip.done = trip.done || [];
      const k = Math.min(n, this.progressOf(trip, id) + 1);
      trip.progress[id] = k;
      if (k >= n && !trip.done.includes(id)) trip.done.push(id);
      return k >= n;
    },
    // 地圖戰鬥的結果推進委託：{ result, variant, outside, quest }
    onBattle(trip, ev) {
      const msgs = [];
      if (ev.result !== "win") return msgs;
      for (const id of trip.accepted || []) {
        const st = this.stage(trip, id);
        if (!st) continue;
        const c = this.get(id);
        if (st.type === "kill" && (!st.outside || ev.outside)) {
          trip.qcount = trip.qcount || {};
          trip.qcount[id] = (trip.qcount[id] || 0) + 1;
          if (trip.qcount[id] >= st.need) { this.advance(trip, id); msgs.push(`「${c.title}」：${st.text}（${st.need} / ${st.need}）完成`); }
          else msgs.push(`「${c.title}」：${st.text}（${trip.qcount[id]} / ${st.need}）`);
        }
        if ((st.type === "escort" || st.type === "boss" || st.type === "fish") && ev.quest === id) {
          this.advance(trip, id);
          msgs.push(`「${c.title}」：${st.text}——完成`);
          // 打贏後拿到的任務道具（例如被搶的漁網）
          if (st.give && ev.items && R.Bag) { R.Bag.add(ev.items, st.give, 1); msgs.push(`得到 ${R.Bag.get(st.give).name}`); }
        }
      }
      return msgs;
    },
    // 結算這一趟：完成的委託拿全部報酬；冒險失敗時，沒完成的委託只能照進度比例拿時空幣（沒有經驗、執照經驗）
    // 這一趟中途失敗：從進行中拿掉，回酒館時照進度結算，這輪冒險不能再接
    fail(trip, id) {
      trip.accepted = (trip.accepted || []).filter((x) => x !== id);
      trip.failedQ = trip.failedQ || [];
      if (!trip.failedQ.includes(id)) trip.failedQ.push(id);
    },
    settle(trip, failed) {
      let coins = 0, xp = 0, license = 0;
      const lines = [];
      // failedQ：這一趟中途失敗的委託（例如搬貨被守衛抓到）：只照進度拿時空幣
      for (const id of [...(trip.accepted || []), ...(trip.failedQ || [])]) {
        const c = this.get(id), n = this.steps(c), k = this.progressOf(trip, id), fail = failed || trip.failedQ?.includes(id);
        const q = trip.qdata?.[id] || {};
        let rw = q.alt && c.altReward ? c.altReward : c.rewardBy?.[q.result] || c.reward;
        if (c.bonus && q.bonus) rw = { coins: (rw.coins || 0) + (c.bonus.coins || 0), xp: (rw.xp || 0) + (c.bonus.xp || 0), license: (rw.license || 0) + (c.bonus.license || 0) };
        if (k >= n && !trip.failedQ?.includes(id)) { coins += rw.coins || 0; xp += rw.xp || 0; license += rw.license || 0; lines.push({ title: c.title, coins: rw.coins || 0, xp: rw.xp || 0, k, n }); }
        else if (fail) { const got = Math.floor(((c.reward.coins || 0) * k) / n); coins += got; lines.push({ title: c.title, coins: got, xp: 0, k, n, failed: true }); }
      }
      return { coins, xp, license, lines };
    },
    rewardText(r) { return [r.coins ? `時空幣 ${r.coins}` : "", r.xp ? `經驗 ${r.xp}` : "", r.license ? `執照經驗 ${r.license}` : ""].filter(Boolean).join("・") || "金幣"; },
  };
})();
