/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/maps/kt33233.js": "20261113040753" });
// 地圖：#KT33233 巨人的生態盒（C 級時空）
// 兩個並排的巨大生態盒，中間隔著一道玻璃牆，牆上有一個剛好讓你鑽過去的小洞
// 左盒：西瓜蟲的家、螞蟻窩、糧倉（邪惡大魔王・長頸鹿鉅鍬形蟲睡在糧倉上面）
// 右盒：巨大的果凍（吃不完）、被搬走的果凍罐（恐怖的大魔王・長戟大兜蟲在這裡巡邏）
(function () {
  const R = (window.RPG = window.RPG || {});
  R.MAPS = R.MAPS || {};

  const W = 3000, H = 2000;
  const LEFT = { x: 40, y: 40, w: 1420, h: 1920 }, RIGHT = { x: 1540, y: 40, w: 1420, h: 1920 };
  const HOLE = { x: 1450, y: 975, w: 100, h: 70 };
  // 小石頭（圓形障礙物）、樹枝（長方形障礙物）
  const PEBBLES = [{ x: 300, y: 300, r: 60 }, { x: 1150, y: 300, r: 48 }, { x: 260, y: 1050, r: 70 }, { x: 1200, y: 1300, r: 56 }, { x: 1900, y: 1250, r: 66 }, { x: 2750, y: 300, r: 52 }, { x: 2050, y: 1750, r: 58 }, { x: 2800, y: 1000, r: 46 }];
  const TWIGS = [{ x: 520, y: 1260, w: 520, h: 34, a: 0 }, { x: 1700, y: 900, w: 34, h: 300 }, { x: 2300, y: 1150, w: 460, h: 30 }, { x: 160, y: 760, w: 380, h: 30 }];
  R.MAPS.KT33233 = {
    indoor: true, battleRoom: "soil", vivarium: true,
    arrival: { ilshu: "周圍好大...", vivilla: "這裡的土...很適合種蘑菇...", marika: "那裏有個無比巨大的怪獸！", cangyou: "這裡的環境...怎麼那麼大..." },
    // 事件台詞：kingHit＝被大魔王攻擊；kingChase＝大魔王衝過來；jelly＝偷吃巨大果凍；jellySee＝第一次看到巨大果凍
    barks: {
      kingHit: { firsler: "可惡！老娘一定會讓你們這些臭蟲付出代價！", ilshu: "嗚...衣服被勾破了...", marika: "再來！" },
      kingChase: { vivilla: "別過來別過來別過來我錯了行吧！！！" },
      jelly: { vivilla: "沒什麼味道呢..." },
      jellySee: { cangyou: "哇...好香啊" },
    },
    bgm: "sounds/bgm-chinon.mp3",            // 暫用（還沒有生態盒的 BGM）
    w: W, h: H, left: LEFT, right: RIGHT, hole: HOLE,
    walk: [LEFT, RIGHT, HOLE],
    pebbles: PEBBLES, twigs: TWIGS,
    roundSolids: PEBBLES,
    solids: TWIGS,
    jelly: { x: 2250, y: 560, r: 130 },                         // 巨大的果凍（吃不完）
    pot: { x: 2620, y: 1560 },                                   // 被搬走的果凍罐
    colony: { x: 420, y: 1640 },                                 // 西瓜蟲的家
    granary: { x: 720, y: 560 },                                 // 糧倉（鍬形蟲睡在上面）
    antNest: { x: 1000, y: 1760 },                               // 螞蟻窩
    // 兩隻大魔王（打不了，只能跑）
    stag: { x: 720, y: 430, home: { x: 720, y: 430 }, vision: 360, speed: 250 },
    beetle: { path: [{ x: 1900, y: 400 }, { x: 2700, y: 600 }, { x: 2750, y: 1300 }, { x: 2200, y: 1500 }, { x: 1800, y: 1100 }], vision: 280, speed: 245 },
    arrive: { x: 600, y: 1800 },
    portal: { x: 260, y: 1860 },
    zone: { dy: 62, r: 46 },
    // 打得動的小生物：跳蛛會撲過來（像魔狼一樣追人），蚜蟲在葉子上慢慢爬
    wolf: { aggro: 240, speed: 160, leash: 480, packs: { spiders: 2 }, howl: "sounds/wolf-move.mp3" },
    enemyWander: 110, enemySpeed: 30,
    enemies: [
      { id: "sp1", kind: "spiders", x: 2700, y: 1820 },
      { id: "sp2", kind: "spiders", x: 1950, y: 260 },
      { id: "ap1", kind: "aphids", x: 300, y: 560 },
      { id: "ap2", kind: "aphids", x: 2050, y: 1500 },
    ],
    npcs: [
      { id: "roundy", name: "西瓜蟲・圓圓", x: 420, y: 1560, color: "#5a6a7a", quests: ["KT33233-01"],
        asks: { cangyou: [{ q: "和那樣的東西生活在一起...真可怕啊...", a: "也不是過的那麼差啦...我們能偷吃到的很多東西都是多虧了這裏的大魔王。" }], firsler: [{ q: "喔喔！足球是吧！", a: "我的殼很硬...踢上去小心受傷..." }], guan: [{ q: "你緊張的時候，會縮成一顆球。", a: "……被你看出來了。現在我也有點想縮起來。" }], hoffman: [{ q: "你的殼一共有幾節？十三？", a: "十三節！你是第一個數對的。大家都以為是十二，因為最後一節藏在屁股底下。" }] },
        lines: ["我們的果凍罐被搬到隔壁的盒子了。那是我們整個冬天的食物。", "隔壁住著恐怖的大魔王。牠的角比我們全家加起來還長。"] },
      { id: "antCap", name: "螞蟻小隊長", x: 1000, y: 1660, color: "#7a2a1a", quests: ["KT33233-02"],
        asks: { marika: [{ q: "我要打翻他！", a: "大魔王恐怕會先把你撞飛呢...就和我們滿腔熱血的隊員一樣" }], guan: [{ q: "你的隊員都很信任你。", a: "因為我從不讓任何一隻螞蟻落單。……除了現在。糧倉那邊，我不敢派任何一隻過去。" }], hoffman: [{ q: "每一粒穀子的重量是你的四十倍？", a: "四十二倍。我們訓練有素。但我們跑不快——跑得快的是你。" }] },
        lines: ["邪惡大魔王睡在我們的糧倉上面。牠每隔一陣子就會翻身。", "翻身的時候牠會睜開眼睛。那時候千萬不要在牠旁邊。"] },
      { id: "snail", name: "蝸牛", x: 1200, y: 980, color: "#8a6a3a",
        asks: { vivilla: [{ q: "土的底下有著怎樣的菌絲呢...", a: "巨人使用的是秀珍菇的菌瓶呢" }], firsler: [{ q: "這樣的洞老娘一箭就射穿了！", a: "這是巨人使用的塑膠...說大話還是有點限度吧..." }] },
        lines: ["牆上那個洞，是我花了三年磨出來的。……開玩笑的，是巨人的鉛筆戳的。", "隔壁那顆果凍，大到吃一輩子都吃不完。可是大魔王會聽到你咬的聲音。"] },
    ],
  };
})();
