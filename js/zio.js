/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/zio.js": "20261120001638" });
// 戰役 #ZI00021 祝福之刻：開場動畫（目前只有動畫，看完只能退出）
// 參考原作為《RIDER TIME 假面騎士ZI-O VS Decade / 7人的ZI-O！》
// 流程：荒漠裡時王和異域者戰鬥 → 上方的庄吾說話、和時王合二為一 → 變身逢魔時王（音效 sounds/zio-ohma.mp3）
//       → 下方的門矢士用 K-Touch 21 變身 Decade 神主21（音效 sounds/zio-21.mp3）
// 騎士都是方塊，頭部的設計照使用者的草稿（shots/ref-zio/）
// 特效字出現的時間（秒）在下面的 OHMA_T、D21_T：照音效裡喊出來的時間對齊；按 T 會在左下角顯示時間，方便調
(function () {
  const R = (window.RPG = window.RPG || {});
  const cv = document.getElementById("zio"), ctx = cv.getContext("2d");
  const W = 1280, H = 720;
  const CJK = '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif';
  const LAT = 'Impact, "Arial Black", "Noto Sans TC", sans-serif';

  // ===== 時間軸（秒） =====
  const S2 = 7;              // 庄吾出現、說話
  const MERGE = [11.6, 13.6]; // 時王化成光，和庄吾合二為一
  const S3 = 14;             // 逢魔時王的變身（音效從這裡開始，長 19 秒）
  const OHMA_T = { array: 0.2, split: 1.6, glow: 2.6, title: 3.58, words: [6.0, 7.42, 8.62, 10.62], bands: [4.0, 12.8], merge: 13.16 };
  const S4 = 34.5;           // 門矢士的變身（音效從這裡開始，長 29 秒）
  const D21_T = { touch: 0.6, names: 5.2, gap: 0.49, finalKR: 11.26, cards: 12.6, ghosts: 13.2, decade: 13.8, fly: [14.6, 15.6], binary: [15.4, 17.4], complete: 17.5 };
  const END = S4 + 28.8;

  // ===== 位置 =====
  const SOUGO = { x: 640, y: 190 }, ZIO0 = { x: 640, y: 420 }, TSU = { x: 640, y: 560 };

  // ===== 音效 =====
  const sndOhma = new Audio("sounds/zio-ohma.mp3"), snd21 = new Audio("sounds/zio-21.mp3");
  let vol = 1; try { const v = parseFloat(localStorage.getItem("rpg.vol.sfx")); if (Number.isFinite(v)) vol = Math.max(0, Math.min(1, v)); } catch (e) { /* 沒存過就用預設 */ }
  for (const a of [sndOhma, snd21]) { a.preload = "auto"; a.volume = 0.85 * vol; }     // 音效音量跟著右上角的設定

  // ===== 小工具 =====
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (k) => (k = clamp(k), k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  const back = (k) => { k = clamp(k); const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  const win = (t, a, b) => clamp((t - a) / (b - a));
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  let seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);

  // ===== 荒漠（先畫好） =====
  const desert = document.createElement("canvas"); desert.width = W; desert.height = H;
  (() => {
    const g = desert.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#c89858"); gr.addColorStop(0.5, "#d8ac68"); gr.addColorStop(1, "#c08a4a");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) {                         // 沙丘的稜線
      const y0 = 30 + i * 52 + rnd() * 20, amp = 10 + rnd() * 18, ph = rnd() * 6;
      g.strokeStyle = `rgba(150,96,44,${0.18 + rnd() * 0.15})`; g.lineWidth = 3 + rnd() * 4;
      g.beginPath(); for (let x = -20; x <= W + 20; x += 20) g.lineTo(x, y0 + Math.sin(x / (120 + i * 7) + ph) * amp); g.stroke();
      g.strokeStyle = "rgba(255,236,190,.18)"; g.lineWidth = 2;
      g.beginPath(); for (let x = -20; x <= W + 20; x += 20) g.lineTo(x, y0 - 6 + Math.sin(x / (120 + i * 7) + ph) * amp); g.stroke();
    }
    for (let i = 0; i < 260; i++) { g.fillStyle = rnd() < 0.5 ? "rgba(120,80,40,.35)" : "rgba(255,230,180,.3)"; g.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 3, 2); }
    for (let i = 0; i < 16; i++) { const x = rnd() * W, y = rnd() * H, r = 6 + rnd() * 14; g.fillStyle = "rgba(0,0,0,.18)"; g.beginPath(); g.ellipse(x + 4, y + 4, r, r * 0.6, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "#8a6a4a"; g.beginPath(); g.ellipse(x, y, r, r * 0.65, 0, 0, Math.PI * 2); g.fill(); }
    for (let i = 0; i < 10; i++) { const x = rnd() * W, y = rnd() * H; g.strokeStyle = "#6a5030"; g.lineWidth = 2; for (let k = 0; k < 7; k++) { const a = k * 0.9 + rnd(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 10); g.stroke(); } }
  })();

  // ===== 粒子 =====
  let parts = [];
  function burst(x, y, n, col, sp = 260, life = 0.8, size = 4) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = sp * (0.3 + Math.random() * 0.7); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, col, size: size * (0.5 + Math.random()) }); } }
  function stepParts(dt) {
    for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; p.life -= dt; }
    parts = parts.filter((p) => p.life > 0);
  }
  function drawParts() { for (const p of parts) { ctx.globalAlpha = clamp(p.life / p.max); ctx.fillStyle = p.col; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); } ctx.globalAlpha = 1; }

  // ===== 角色（方塊＋頭部設計） =====
  function human(x, y, s, col, ch, ink = "#1a1a1a") {
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(x + 4, y + s * 0.62, s * 0.55, s * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    rr(x - s / 2, y - s / 2, s, s, s * 0.18); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.55)"; ctx.stroke();
    ctx.fillStyle = ink; ctx.font = `900 ${s * 0.56}px ${CJK}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(ch, x, y + 2);
  }
  // 「ライダー」複眼：用粗線畫成形狀（字太小，跟原本佔滿整張臉的複眼差太多）
  //   左眼＝ラ、イ，右眼＝ダ、ー；座標是臉的比例（-0.5～0.5），k＝整體縮放，dy＝上下位移
  const EYES = [
    [[-0.42, -0.34], [-0.1, -0.34]],                                          // ラ：上面一橫
    [[-0.46, -0.2], [-0.06, -0.2], [-0.12, -0.02], [-0.32, 0.16]],           // ラ：第二橫往左下勾
    [[-0.04, -0.06], [-0.2, 0.1]],                                            // イ：撇
    [[-0.13, 0.02], [-0.13, 0.3]],                                            // イ：直
    [[0.12, -0.36], [0.04, -0.16]],                                           // ダ：左邊的撇
    [[0.08, -0.28], [0.4, -0.28], [0.34, -0.06], [0.14, 0.14]],               // ダ：上面一橫往左下勾
    [[0.14, -0.14], [0.3, -0.06]],                                            // ダ：中間一點
    [[0.36, -0.44], [0.4, -0.36]], [[0.44, -0.46], [0.48, -0.38]],           // ダ：濁點
    [[0.1, 0.24], [0.46, 0.24]],                                              // ー
  ];
  function riderEyes(x, y, s, col, glow, k = 1, dy = 0) {
    ctx.save(); ctx.translate(x, y + dy * s); ctx.scale(k, k);
    ctx.shadowColor = col; ctx.shadowBlur = glow;
    ctx.strokeStyle = col; ctx.lineWidth = s * 0.1; ctx.lineCap = "square"; ctx.lineJoin = "miter";
    for (const st of EYES) { ctx.beginPath(); st.forEach(([a, b], i) => (i ? ctx.lineTo(a * s, b * s) : ctx.moveTo(a * s, b * s))); ctx.stroke(); }
    ctx.shadowBlur = 0; ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = s * 0.025;     // 亮邊
    for (const st of EYES) { ctx.beginPath(); st.forEach(([a, b], i) => (i ? ctx.lineTo(a * s, b * s - s * 0.02) : ctx.moveTo(a * s, b * s - s * 0.02))); ctx.stroke(); }
    ctx.restore();
  }
  // 臉上的複眼：照使用者的草稿——左邊是一大塊粗粗的「ラ」「イ」（塗滿的形狀），右邊是比較細的「ダ」「ー」
  //   不用寫得完整，可以蓋到灰色的 V，但不會蓋到外面的框（畫的時候裁在框裡面）（法陣中間的「ライダー」還是用上面的 EYES）
  const FACE_FILL = [
    [[-0.42, -0.22], [-0.06, -0.28], [-0.04, -0.19], [-0.4, -0.13]],                                                       // ラ：上面的厚板
    [[-0.46, -0.08], [-0.12, -0.13], [-0.1, -0.04], [-0.23, 0.0], [-0.28, 0.32], [-0.4, 0.32], [-0.35, 0.02], [-0.45, 0.01]], // ラ：往下的粗腳
    [[-0.13, 0.02], [0.02, -0.17], [0.08, -0.11], [-0.06, 0.07]],                                                          // イ：撇
    [[-0.11, 0.02], [-0.03, 0.01], [-0.05, 0.32], [-0.13, 0.32]],                                                          // イ：直
  ];
  const FACE_LINE = [
    [[0.1, 0.02], [0.25, -0.3]],                          // ダ：左撇
    [[0.17, -0.2], [0.35, -0.21], [0.24, 0.14]],          // ダ：橫折
    [[0.15, -0.06], [0.29, 0.01]],                        // ダ：點
    [[0.36, -0.02], [0.48, -0.03]],                       // ー
    [[0.28, -0.37], [0.3, -0.3]], [[0.35, -0.39], [0.37, -0.32]],   // 濁點
  ];
  function faceEyes(x, y, s, col, glow) {
    ctx.save();
    const m = s * 0.075; rr(x - s / 2 + m, y - s / 2 + m, s - m * 2, s - m * 2, s * 0.1); ctx.clip();   // 只畫在框框裡面，不蓋到框
    ctx.translate(x, y); ctx.shadowColor = col; ctx.shadowBlur = glow;
    ctx.fillStyle = col;
    for (const poly of FACE_FILL) { ctx.beginPath(); poly.forEach(([a, b], i) => (i ? ctx.lineTo(a * s, b * s) : ctx.moveTo(a * s, b * s))); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = col; ctx.lineWidth = s * 0.05; ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (const st of FACE_LINE) { ctx.beginPath(); st.forEach(([a, b], i) => (i ? ctx.lineTo(a * s, b * s) : ctx.moveTo(a * s, b * s))); ctx.stroke(); }
    ctx.restore();
  }
  // 時王（基本型）：黑色、銀色的框、洋紅色的「ライダー」複眼、頭上兩根錶針
  function zio(x, y, s, glow = 0) {
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(x + 4, y + s * 0.62, s * 0.55, s * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#c8ccd4"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x - 4, y - s / 2); ctx.lineTo(x - s * 0.3, y - s * 0.95); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 4, y - s / 2); ctx.lineTo(x + s * 0.18, y - s * 0.8); ctx.stroke();
    rr(x - s / 2, y - s / 2, s, s, s * 0.16); ctx.fillStyle = "#141418"; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = "#a8acb8"; ctx.stroke();
    ctx.fillStyle = "#8a8e98"; ctx.fillRect(x - s * 0.3, y + s * 0.38, s * 0.6, s * 0.05);
    faceEyes(x, y, s, "#ff3a96", 8 + glow * 20);
  }
  // 逢魔時王：照使用者的草稿——黑底金框、兩片金色的刃、頭頂三個金環、暗紅色的「ライダー」、灰色的 V
  function ohma(x, y, s, glow = 0) {
    ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(x + 5, y + s * 0.62, s * 0.6, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    for (const sx of [-1, 1]) {                               // 兩片金色的刃
      ctx.save(); ctx.translate(x + sx * s * 0.42, y - s * 0.44); ctx.rotate(sx * 0.75);
      ctx.fillStyle = "#f2b83a"; ctx.strokeStyle = "#8a5a10"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(sx * s * 0.08, -s * 0.3); ctx.lineTo(0, -s * 0.62); ctx.lineTo(-sx * s * 0.08, -s * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -s * 0.06); ctx.lineTo(0, -s * 0.56); ctx.strokeStyle = "rgba(255,240,180,.8)"; ctx.stroke();
      ctx.restore();
    }
    rr(x - s / 2, y - s / 2, s, s, s * 0.18); ctx.fillStyle = "#0c0a0a"; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = "#f2b83a"; ctx.stroke();
    ctx.strokeStyle = "#f2b83a"; ctx.lineWidth = 3;                      // 頭頂的金環
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.ellipse(x + i * s * 0.16, y - s * 0.36 + Math.abs(i) * s * 0.03, s * 0.06, s * 0.055, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.strokeStyle = "#f2b83a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - s * 0.46, y - s * 0.44); ctx.lineTo(x, y - s * 0.12); ctx.lineTo(x + s * 0.46, y - s * 0.44); ctx.stroke();
    faceEyes(x, y, s, "#9a1418", 6 + glow * 26);
    ctx.strokeStyle = "#8a8a90"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - s * 0.4, y + s * 0.44); ctx.lineTo(x, y + s * 0.2); ctx.lineTo(x + s * 0.4, y + s * 0.44); ctx.stroke();
    ctx.fillStyle = "#f2b83a"; for (const fx of [-0.36, -0.2, 0.2, 0.36]) ctx.fillRect(x + fx * s - 2, y + s * 0.42, 4, s * 0.1);
  }
  // Decade：照草稿——粉紅色的方塊、綠色的複眼、黑色的直條、中間一點黃
  function decade(x, y, s, alpha = 1, gray = false) {
    ctx.save(); ctx.globalAlpha = alpha;
    if (!gray) { ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(x + 4, y + s * 0.62, s * 0.55, s * 0.18, 0, 0, Math.PI * 2); ctx.fill(); }
    rr(x - s / 2, y - s / 2, s, s, s * 0.16); ctx.fillStyle = gray ? "#9a9aa2" : "#ffa8cc"; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = gray ? "#6a6a72" : "#ff1a78"; ctx.stroke();
    ctx.fillStyle = gray ? "#6a7a6a" : "#22b04a";
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + sx * s * 0.25, y - s * 0.02, s * 0.17, s * 0.22, sx * -0.25, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = "#111"; ctx.lineWidth = 3;
    for (const bx of [-0.36, -0.24, -0.12, 0.04, 0.16, 0.28]) { ctx.beginPath(); ctx.moveTo(x + bx * s, y - s * 0.68); ctx.lineTo(x + bx * s + 2, y + s * 0.62); ctx.stroke(); }
    ctx.fillStyle = gray ? "#c8c8a0" : "#ffcc22"; ctx.fillRect(x - s * 0.04, y - s * 0.3, s * 0.07, s * 0.12);
    ctx.restore();
  }
  // Decade 神主21：照草稿——灰色身體、粉紅色的翼、黑色直條、頭上的卡片（黃、粉紅）、灰色肩甲、洋紅色披風
  function d21(x, y, s, t) {
    ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(x + 5, y + s * 0.78, s * 0.85, s * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ff1a78"; ctx.beginPath(); ctx.moveTo(x - s * 0.62, y + s * 0.3);    // 披風
    for (let i = 0; i <= 8; i++) { const k = i / 8; ctx.lineTo(x - s * 0.95 + k * s * 1.9, y + s * 0.78 + Math.sin(k * 9 + t * 3) * s * 0.06); }
    ctx.lineTo(x + s * 0.62, y + s * 0.3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#ff3a96"; ctx.lineWidth = 3; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + sx * s * 0.36, y - s * 1.05); ctx.lineTo(x + sx * s * 0.36, y + s * 0.45); ctx.stroke(); }
    rr(x - s / 2, y - s / 2, s, s, s * 0.12); ctx.fillStyle = "#8c8c92"; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = "#b8b8c0"; ctx.stroke();
    ctx.fillStyle = "#ff1a78";
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + sx * s * 0.08, y - s * 0.2); ctx.quadraticCurveTo(x + sx * s * 0.42, y - s * 0.3, x + sx * s * 0.4, y + s * 0.05); ctx.quadraticCurveTo(x + sx * s * 0.3, y + s * 0.3, x + sx * s * 0.12, y + s * 0.18); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = "#111"; ctx.lineWidth = 3;
    for (const [bx, a, b] of [[-0.3, -0.35, 0.45], [-0.12, -0.5, 0.48], [0.02, -0.5, 0.5], [0.16, -0.5, 0.48], [0.3, -0.3, 0.45]]) { ctx.beginPath(); ctx.moveTo(x + bx * s, y + a * s); ctx.lineTo(x + bx * s + 1, y + b * s); ctx.stroke(); }
    for (const sx of [-1, 1]) {                                     // 肩甲
      rr(x + sx * s * 0.62 - s * 0.12, y + s * 0.02, s * 0.24, s * 0.3, 6); ctx.fillStyle = "#9a9aa0"; ctx.fill(); ctx.strokeStyle = "#c8c8d0"; ctx.lineWidth = 3; ctx.stroke();
      rr(x + sx * s * 0.86 - s * 0.08, y + s * 0.08, s * 0.16, s * 0.18, 5); ctx.fillStyle = "#8a8a90"; ctx.fill(); ctx.stroke();
    }
    rr(x - s * 0.22, y - s * 1.06, s * 0.44, s * 0.56, 5); ctx.fillStyle = "#f4f4f4"; ctx.fill(); ctx.strokeStyle = "#111"; ctx.lineWidth = 4; ctx.stroke();   // 頭上的卡片
    ctx.fillStyle = "#ffd820"; ctx.beginPath(); ctx.ellipse(x, y - s * 0.92, s * 0.05, s * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#111"; for (let i = 0; i < 4; i++) ctx.fillRect(x - s * 0.13 + i * s * 0.07, y - s * 0.78, s * 0.04, s * 0.04);
    ctx.fillStyle = "#ff3a7a"; ctx.beginPath(); ctx.ellipse(x, y - s * 0.62, s * 0.05, s * 0.07, 0, 0, Math.PI * 2); ctx.fill();
  }
  // 異域者：比較小、歪七扭八的方塊，裂開的紋路、不對稱的紅眼
  function another(x, y, s, i, alpha = 1) {
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.beginPath(); ctx.ellipse(x + 3, y + s * 0.6, s * 0.5, s * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(x, y); ctx.rotate(Math.sin(i * 3.1) * 0.15);
    const col = ["#3a4a3a", "#4a3a3a", "#3a3a4a", "#4a4a32", "#2e3e44", "#463040"][i % 6];
    rr(-s / 2, -s / 2, s, s, 4); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = "#141010"; ctx.stroke();
    ctx.strokeStyle = "#e8742a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-s * 0.4, -s * 0.1); ctx.lineTo(-s * 0.1, s * 0.05); ctx.lineTo(-s * 0.2, s * 0.35); ctx.moveTo(s * 0.1, -s * 0.45); ctx.lineTo(s * 0.05, -s * 0.2); ctx.lineTo(s * 0.35, -s * 0.05); ctx.stroke();
    ctx.fillStyle = "#ff2a20"; ctx.beginPath(); ctx.ellipse(-s * 0.18, -s * 0.12, s * 0.12, s * 0.07, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(s * 0.2, -s * 0.16, s * 0.07, s * 0.1, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#141010"; ctx.beginPath(); ctx.moveTo(-s * 0.3, -s / 2); ctx.lineTo(-s * 0.2, -s * 0.8); ctx.lineTo(-s * 0.1, -s / 2); ctx.fill();
    ctx.restore();
  }
  function label(t, x, y, col = "#fff", size = 14) {
    ctx.font = `900 ${size}px ${CJK}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,.65)"; ctx.strokeText(t, x, y); ctx.fillStyle = col; ctx.fillText(t, x, y);
  }

  // ===== 特效字 =====
  // fill：顏色；或 parts：[[字, 顏色], …]（一段一段不同顏色）；split：[左色, 右色]（左右各半）
  function fxText(o, k, x, y) {
    const pop = back(win(k, 0, 0.18)), out = 1 - win(k, 0.8, 1);
    const sc = (o.scale || 1) * (0.4 + 0.6 * pop) * (1 + win(k, 0.2, 1) * 0.06);
    const sh = (1 - win(k, 0, 0.25)) * 8;
    ctx.save(); ctx.globalAlpha = out; ctx.translate(x + (Math.random() - 0.5) * sh, y + (Math.random() - 0.5) * sh); ctx.scale(sc, sc); ctx.rotate(o.rot || 0);
    if (o.bg) o.bg(k);
    const size = o.size || 110, font = `${o.cjk ? 900 : 400} ${size}px ${o.cjk ? CJK : LAT}`;
    ctx.font = font; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    const segs = o.parts || [[o.text, o.fill || "#fff"]];
    const total = segs.reduce((a, [s]) => a + ctx.measureText(s).width + (o.spacing || 0), 0);
    let cx = -total / 2;
    segs.forEach(([s, col], i) => {
      const w = ctx.measureText(s).width;
      const show = o.seq ? win(k, i * o.seq, i * o.seq + 0.06) : 1;          // 一個一個出現
      if (show > 0) {
        ctx.save(); ctx.globalAlpha *= show;
        ctx.lineJoin = "round"; ctx.lineWidth = size * 0.14; ctx.strokeStyle = o.stroke || "#1a0a10"; ctx.strokeText(s, cx, 0);
        ctx.shadowColor = o.glow || col; ctx.shadowBlur = 24;
        if (o.split) {
          ctx.save(); ctx.beginPath(); ctx.rect(cx - 10, -size, w / 2 + 10, size * 2); ctx.clip(); ctx.fillStyle = o.split[0]; ctx.fillText(s, cx, 0); ctx.restore();
          ctx.save(); ctx.beginPath(); ctx.rect(cx + w / 2, -size, w / 2 + 10, size * 2); ctx.clip(); ctx.fillStyle = o.split[1]; ctx.fillText(s, cx, 0); ctx.restore();
        } else { ctx.fillStyle = col; ctx.fillText(s, cx, 0); }
        ctx.shadowBlur = 0; ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.strokeText(s, cx, 0);
        ctx.restore();
      }
      cx += w + (o.spacing || 0);
    });
    ctx.restore();
  }
  // 字後面的背景圖案
  const BG = {
    rocket: () => { ctx.save(); ctx.globalAlpha *= 0.35; ctx.fillStyle = "#fff"; ctx.rotate(-0.5); ctx.beginPath(); ctx.moveTo(0, -150); ctx.quadraticCurveTo(60, -80, 50, 60); ctx.lineTo(-50, 60); ctx.quadraticCurveTo(-60, -80, 0, -150); ctx.fill(); ctx.beginPath(); ctx.moveTo(-50, 20); ctx.lineTo(-95, 90); ctx.lineTo(-50, 60); ctx.moveTo(50, 20); ctx.lineTo(95, 90); ctx.lineTo(50, 60); ctx.fill(); ctx.fillStyle = "#ffb040"; ctx.beginPath(); ctx.moveTo(-30, 66); ctx.lineTo(0, 150 + Math.random() * 20); ctx.lineTo(30, 66); ctx.fill(); ctx.restore(); },
    circle: (k) => { ctx.save(); ctx.rotate(k * 2); ctx.globalAlpha *= 0.55; ctx.strokeStyle = "#ff4a3a"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 150, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 124, 0, Math.PI * 2); ctx.stroke(); for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; ctx.fillStyle = "#ff8a5a"; ctx.fillRect(Math.cos(a) * 137 - 3, Math.sin(a) * 137 - 3, 6, 6); } ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.lineTo(Math.cos(a) * 124, Math.sin(a) * 124); } ctx.closePath(); ctx.stroke(); ctx.restore(); },
    katana: () => { ctx.save(); ctx.globalAlpha *= 0.6; ctx.rotate(-0.35); ctx.fillStyle = "#e8eef4"; ctx.beginPath(); ctx.moveTo(-260, 6); ctx.quadraticCurveTo(0, -18, 230, -10); ctx.lineTo(260, 0); ctx.lineTo(230, 6); ctx.quadraticCurveTo(0, 0, -260, 18); ctx.fill(); ctx.fillStyle = "#ff8a1a"; ctx.fillRect(-275, -14, 14, 42); ctx.fillStyle = "#3a2010"; ctx.fillRect(-360, 0, 86, 16); ctx.restore(); },
    tire: (k) => { ctx.save(); ctx.globalAlpha *= 0.6; ctx.rotate(k * 4); ctx.fillStyle = "#1a1a1e"; ctx.beginPath(); ctx.arc(0, 0, 150, 0, Math.PI * 2); ctx.arc(0, 0, 80, 0, Math.PI * 2, true); ctx.fill(); ctx.fillStyle = "#3a3a40"; for (let i = 0; i < 20; i++) { ctx.save(); ctx.rotate((i / 20) * Math.PI * 2); ctx.fillRect(126, -8, 24, 16); ctx.restore(); } ctx.fillStyle = "#c8c8d0"; ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.fill(); ctx.restore(); },
    eye: (k) => { ctx.save(); ctx.globalAlpha *= 0.6; ctx.fillStyle = "#1a1010"; ctx.beginPath(); ctx.ellipse(0, 0, 210, 110, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#ff8a1a"; ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#1a1010"; ctx.beginPath(); ctx.arc(0, 0, 28 + Math.sin(k * 20) * 4, 0, Math.PI * 2); ctx.fill(); ctx.restore(); },
    clock: (k) => { ctx.save(); ctx.globalAlpha *= 0.55; ctx.strokeStyle = "#ff6ab0"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 140, 0, Math.PI * 2); ctx.stroke(); ctx.lineCap = "round"; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(-1.9 - k * 2) * 90, Math.sin(-1.9 - k * 2) * 90); ctx.stroke(); ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(-1.2 + k * 3) * 130, Math.sin(-1.2 + k * 3) * 130); ctx.stroke(); ctx.restore(); },
  };
  // K-Touch 21 按下去時跳出來的字（使用者指定的顏色、背景）
  const NAMES = [
    { text: "W", split: ["#141414", "#22c04a"], stroke: "#e8e8e8", size: 150 },
    { parts: [["O", "#e8262c"], ["O", "#ffd020"], ["O", "#22b04a"]], seq: 0.12, size: 140, spacing: 10 },
    { text: "FOURZE", fill: "#ffffff", bg: BG.rocket },
    { text: "WIZARD", fill: "#ff2a2a", bg: BG.circle },
    { text: "鎧武", fill: "#ff8a1a", bg: BG.katana, cjk: true, size: 120 },
    { text: "DRIVE", split: ["#e8202a", "#ffffff"], bg: BG.tire },
    { text: "GHOST", fill: "#ff8a1a", bg: BG.eye },
    { parts: [["EX", "#ff4aa8"], ["-AID", "#3ae070"]] },
    { parts: [["BU", "#2a8aff"], ["ILD", "#ff2a2a"]] },
    { text: "時王", fill: "#ff6ab0", bg: BG.clock, cjk: true, size: 120 },
    { text: "ZERO-ONE", fill: "#e4ff1a", glow: "#e4ff1a" },
  ];
  const OHMA_WORDS = ["至仁！", "至善！", "至高！", "至強之王！"];
  const goldText = { fill: "#ffd060", stroke: "#5a1a08", glow: "#ff8a20", cjk: true };

  // ===== 時鐘法陣（逢魔時王） =====
  function clockArray(x, y, t, a, merge) {
    if (a <= 0) return;
    const r = 210 * (1 - merge * 0.85);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
    const g = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.15); g.addColorStop(0, "rgba(255,120,30,.55)"); g.addColorStop(0.7, "rgba(200,40,10,.35)"); g.addColorStop(1, "rgba(200,40,10,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#ffc040"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2); ctx.stroke();
    ctx.save(); ctx.rotate(t * 0.15);
    for (let i = 0; i < 12; i++) {                                // 金色的錶片（像金條一樣排一圈）
      ctx.save(); ctx.rotate((i / 12) * Math.PI * 2); ctx.translate(0, -r * 1.07);
      ctx.fillStyle = "#ffcc4a"; ctx.shadowColor = "#ffaa20"; ctx.shadowBlur = 14; ctx.fillRect(-14, -9, 28, 18); ctx.shadowBlur = 0;
      ctx.strokeStyle = "#a86a10"; ctx.lineWidth = 2; ctx.strokeRect(-14, -9, 28, 18); ctx.restore();
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(255,200,80,.8)"; ctx.lineWidth = 3;
    for (let i = 0; i < 60; i++) { const ang = (i / 60) * Math.PI * 2, l = i % 5 ? 0.04 : 0.1; ctx.beginPath(); ctx.moveTo(Math.cos(ang) * r * 0.86, Math.sin(ang) * r * 0.86); ctx.lineTo(Math.cos(ang) * r * (0.86 - l), Math.sin(ang) * r * (0.86 - l)); ctx.stroke(); }
    // 時針分開
    const sp = ease(win(t, OHMA_T.split, OHMA_T.split + 1.2));
    ctx.lineCap = "round";
    for (const [ang, len, w] of [[-Math.PI / 2 - sp * 1.05, 0.62, 16], [-Math.PI / 2 + sp * 1.05, 0.8, 10]]) {
      ctx.strokeStyle = "#ffd060"; ctx.lineWidth = w; ctx.shadowColor = "#ffaa20"; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(ang) * r * len, Math.sin(ang) * r * len); ctx.stroke(); ctx.shadowBlur = 0;
    }
    // 中間的「ライダー」一起發光
    const gl = win(t, OHMA_T.glow, OHMA_T.glow + 0.6);
    if (gl > 0) { ctx.save(); ctx.globalAlpha *= gl; riderEyes(0, -r * 0.42, 120 * (1 - merge * 0.6), "#fff4c0", 30 + Math.sin(t * 12) * 10, 1); ctx.restore(); }
    ctx.restore();
  }
  // 黃金錶帶環繞全身
  function bands(x, y, t, k, tight) {
    if (k <= 0) return;
    ctx.save(); ctx.translate(x, y);
    for (let i = 0; i < 5; i++) {
      const rr0 = lerp(140, 52, tight) + i * 6, ang = t * (1.6 + i * 0.3) + i * 1.3, tilt = 0.35 + i * 0.12;
      ctx.save(); ctx.rotate(tilt); ctx.globalAlpha = k;
      ctx.strokeStyle = "#e8a82a"; ctx.lineWidth = 12; ctx.beginPath(); ctx.ellipse(0, 0, rr0, rr0 * 0.3, 0, ang, ang + Math.PI * 1.3 * k); ctx.stroke();
      ctx.strokeStyle = "#fff0b0"; ctx.lineWidth = 2; ctx.setLineDash([4, 10]); ctx.beginPath(); ctx.ellipse(0, 0, rr0, rr0 * 0.3, 0, ang, ang + Math.PI * 1.3 * k); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    }
    ctx.restore();
  }

  // ===== 對話框 =====
  const LINE = "剩下的你，就是全次元最為優秀的庄吾，和我合二為一，實現成為世界之王的夢想吧！";
  function speech(t) {
    const k = win(t, S2 + 0.6, S2 + 0.9), out = 1 - win(t, S3 - 0.3, S3);
    if (k <= 0 || out <= 0) return;
    const n = Math.floor(clamp((t - S2 - 0.9) / 3.6) * LINE.length);
    ctx.save(); ctx.globalAlpha = k * out;
    rr(140, 560, 1000, 120, 14); ctx.fillStyle = "rgba(12,8,6,.86)"; ctx.fill(); ctx.strokeStyle = "#e8c050"; ctx.lineWidth = 3; ctx.stroke();
    rr(160, 540, 110, 36, 8); ctx.fillStyle = "#e8c050"; ctx.fill();
    ctx.fillStyle = "#1a1006"; ctx.font = `900 20px ${CJK}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("庄吾", 215, 559);
    ctx.fillStyle = "#f4ead0"; ctx.font = `700 26px ${CJK}`; ctx.textAlign = "left";
    const s = LINE.slice(0, n), cut = 22;
    ctx.fillText(s.slice(0, cut), 176, 604); ctx.fillText(s.slice(cut), 176, 644);
    ctx.restore();
  }

  // ===== 主畫面 =====
  let T = 0, last = 0, running = false, showTime = false, startAt = 0;
  let fired = {};
  const once = (key, fn) => { if (!fired[key]) { fired[key] = true; fn(); } };
  const cam = { x: 640, y: 360, z: 1 };
  function camAt(t) {
    const keys = [[0, 640, 360, 1], [S2, 640, 360, 1], [S3 - 0.5, 640, 270, 1.28], [S3 + 18, 640, 270, 1.28], [S4 - 0.4, 640, 430, 1.1], [S4 + 26, 640, 430, 1.1], [END, 640, 360, 1]];
    for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (t >= a[0] && t <= b[0]) { const k = ease((t - a[0]) / Math.max(0.001, b[0] - a[0])); return [lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3], b[3], k)]; } }
    return [640, 360, 1];
  }

  function frame(t, dt) {
    [cam.x, cam.y, cam.z] = camAt(t);
    const shake = Math.max(win(t, S3 + OHMA_T.merge, S3 + OHMA_T.merge + 0.02) * (1 - win(t, S3 + OHMA_T.merge, S3 + OHMA_T.merge + 0.8)), win(t, S4 + D21_T.complete, S4 + D21_T.complete + 0.02) * (1 - win(t, S4 + D21_T.complete, S4 + D21_T.complete + 0.8))) * 12;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2 + (Math.random() - 0.5) * shake, H / 2 + (Math.random() - 0.5) * shake); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
    ctx.drawImage(desert, 0, 0);
    ctx.fillStyle = "rgba(255,230,180,.25)";                        // 風沙
    for (let i = 0; i < 40; i++) { const y = (i * 37) % H, x = ((t * (120 + (i % 5) * 40) + i * 211) % (W + 200)) - 100; ctx.fillRect(x, y, 30 + (i % 4) * 10, 2); }

    // ---- 逢魔時王（上方） ----
    const ot = t - S3;
    const merged = ot >= OHMA_T.merge;
    const mergeK = win(ot, OHMA_T.merge - 0.35, OHMA_T.merge);
    clockArray(SOUGO.x, SOUGO.y, ot, t < S3 ? 0 : win(ot, OHMA_T.array, OHMA_T.array + 1.8) * (1 - win(ot, OHMA_T.merge, OHMA_T.merge + 0.2)), mergeK);
    if (t >= S2) {
      const appear = ease(win(t, S2, S2 + 0.8));
      if (!merged) human(SOUGO.x, SOUGO.y - (1 - appear) * 60, 58, "#f2e8d8", "庄");
      else ohma(SOUGO.x, SOUGO.y, 78, 1 - win(ot, OHMA_T.merge, OHMA_T.merge + 1.5));
      label(merged ? "逢魔時王" : "庄吾", SOUGO.x, SOUGO.y + (merged ? 62 : 48), merged ? "#ffd060" : "#fff", 15);
      bands(SOUGO.x, SOUGO.y, ot, t < S3 ? 0 : win(ot, OHMA_T.bands[0], OHMA_T.bands[0] + 0.8) * (1 - win(ot, OHMA_T.merge, OHMA_T.merge + 0.15)), win(ot, OHMA_T.bands[0], OHMA_T.bands[1]));
      if (t >= S3 && ot < OHMA_T.merge && Math.random() < 0.5) parts.push({ x: SOUGO.x + (Math.random() - 0.5) * 360, y: SOUGO.y + 120, vx: 0, vy: -60 - Math.random() * 80, life: 1.4, max: 1.4, col: Math.random() < 0.5 ? "#ffb040" : "#ff6a20", size: 3 + Math.random() * 3 });
      once("ohmaFlash", () => {}); if (merged) once("ohmaBurst", () => { burst(SOUGO.x, SOUGO.y, 90, "#ffd060", 520, 1.1, 6); burst(SOUGO.x, SOUGO.y, 50, "#ff4a20", 380, 1, 5); });
    }

    // ---- 時王和異域者（中間） ----
    const mk = win(t, MERGE[0], MERGE[1]);
    const zx = lerp(ZIO0.x + Math.sin(t * 2.2) * 90 * (1 - win(t, S2, S2 + 1)), SOUGO.x, ease(mk)), zy = lerp(ZIO0.y + Math.cos(t * 1.7) * 20 * (1 - win(t, S2, S2 + 1)), SOUGO.y, ease(mk));
    const blow = win(t, S3 + OHMA_T.merge, S3 + OHMA_T.merge + 1.6);
    for (let i = 0; i < 7; i++) {
      const base = (i / 7) * Math.PI * 2 + t * 0.4;
      const lunge = Math.max(0, Math.sin(t * 2.6 + i * 1.7));
      const fightR = 150 - lunge * 70 * (t < S2 ? 1 : 0.2);
      const r0 = fightR + blow * 900;
      const ax = ZIO0.x + Math.cos(base) * r0, ay = ZIO0.y + Math.sin(base) * r0 * 0.55;
      another(ax, ay, 40, i, 1 - blow);
      if (blow < 0.3 && t > 0.6) label("異域者", ax, ay + 34, "#ffb0a0", 11);
      if (t < S2 && lunge > 0.97 && Math.random() < 0.3) burst((ax + zx) / 2, (ay + zy) / 2, 6, "#ffe0a0", 200, 0.3, 3);
    }
    if (mk < 1) {
      ctx.save(); ctx.globalAlpha = 1 - mk;
      zio(zx, zy, 64, mk);
      if (t < S2) {                                                 // 揮擊的弧線
        const sw = (t * 1.3) % 1; if (sw < 0.35) { ctx.strokeStyle = `rgba(255,90,170,${0.8 - sw * 2})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(zx, zy, 70, t * 3, t * 3 + 2.2); ctx.stroke(); }
      }
      label("時王", zx, zy + 50, "#ffb0d8", 14);
      ctx.restore();
      if (mk > 0 && Math.random() < 0.8) parts.push({ x: zx + (Math.random() - 0.5) * 50, y: zy + (Math.random() - 0.5) * 50, vx: (SOUGO.x - zx) * 0.8, vy: (SOUGO.y - zy) * 0.8, life: 0.7, max: 0.7, col: "#ffe080", size: 4 });
    }

    // ---- 門矢士（下方） ----
    const dt4 = t - S4;
    const tsuIn = ease(win(t, S4 - 1.6, S4 - 0.4));
    if (tsuIn > 0) {
      const tx = TSU.x, ty = TSU.y + (1 - tsuIn) * 140;
      const isDecade = dt4 >= D21_T.decade, is21 = dt4 >= D21_T.complete;
      const ghostK = win(dt4, D21_T.ghosts, D21_T.decade);
      if (ghostK > 0 && !is21) for (const sx of [-1, 1]) decade(tx + sx * lerp(150, 0, ease(ghostK)), ty, 64, 0.55 * (1 - win(dt4, D21_T.decade, D21_T.decade + 0.3)) + (ghostK < 1 ? 0 : 0), true);
      if (is21) d21(tx, ty, 88, t);
      else if (isDecade) decade(tx, ty, 64);
      else human(tx, ty, 56, "#e0287a", "士", "#fff");
      label(is21 ? "假面騎士 Decade 神主21" : isDecade ? "假面騎士 Decade" : "門矢士", tx, ty + (is21 ? 86 : 50), "#ffb0d8", 15);
      // K-Touch 21
      if (dt4 >= D21_T.touch && dt4 < D21_T.finalKR) {
        const kx = tx + 54, ky = ty - 6;
        rr(kx - 16, ky - 26, 32, 52, 6); ctx.fillStyle = "#1a1a1e"; ctx.fill(); ctx.strokeStyle = "#ff1a78"; ctx.lineWidth = 2; ctx.stroke();
        const lit = Math.floor((dt4 - D21_T.names) / D21_T.gap);
        for (let i = 0; i < 12; i++) { ctx.fillStyle = i <= lit && dt4 >= D21_T.names ? "#ff6ab0" : "#3a3a44"; ctx.fillRect(kx - 11 + (i % 3) * 8, ky - 20 + Math.floor(i / 3) * 10, 6, 7); }
        label("K-Touch 21", kx, ky - 38, "#ff9ac8", 11);
      }
      // 兩張大卡牌：噴出 → 飛向 Decade
      const cK = win(dt4, D21_T.cards, D21_T.cards + 0.5), fK = ease(win(dt4, D21_T.fly[0], D21_T.fly[1]));
      if (cK > 0 && fK < 1) for (const sx of [-1, 1]) {
        const cx = lerp(tx + sx * 230 * back(cK), tx, fK), cy = lerp(ty - 120 * back(cK), ty, fK);
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(sx * (0.25 - fK * 0.25) + (1 - cK) * 6); ctx.globalAlpha = 1 - fK * 0.6;
        rr(-46, -66, 92, 132, 8); ctx.fillStyle = "#f8f4f0"; ctx.fill(); ctx.strokeStyle = "#ff1a78"; ctx.lineWidth = 4; ctx.stroke();
        ctx.fillStyle = "#ff1a78"; ctx.fillRect(-36, -54, 72, 84); decade(0, -12, 46);
        ctx.fillStyle = "#1a1a1a"; ctx.font = `400 14px ${LAT}`; ctx.textAlign = "center"; ctx.fillText(sx < 0 ? "DECADE" : "21", 0, 50);
        ctx.restore();
      }
      // 洋紅色的 0、1 閃動
      const bK = win(dt4, D21_T.binary[0], D21_T.binary[0] + 0.2) * (1 - win(dt4, D21_T.binary[1] - 0.2, D21_T.binary[1]));
      if (bK > 0) { ctx.save(); ctx.font = `400 26px ${LAT}`; ctx.textAlign = "center"; for (let i = 0; i < 26; i++) { if (Math.random() < 0.45) continue; const a = (i / 26) * Math.PI * 2 + t, rr1 = 60 + ((i * 37) % 70); ctx.globalAlpha = bK * (0.4 + Math.random() * 0.6); ctx.fillStyle = "#ff1a9a"; ctx.shadowColor = "#ff1a9a"; ctx.shadowBlur = 12; ctx.fillText(Math.random() < 0.5 ? "0" : "1", tx + Math.cos(a) * rr1, ty + Math.sin(a) * rr1 * 0.8); } ctx.restore(); }
      if (isDecade) once("decBurst", () => burst(tx, ty, 40, "#ff6ab0", 360, 0.7, 5));
      if (is21) once("d21Burst", () => { burst(tx, ty, 100, "#ff1a78", 560, 1.2, 6); burst(tx, ty, 40, "#ffffff", 400, 0.9, 4); });
    }

    stepParts(dt); drawParts();
    ctx.restore();

    // ---- 畫面上的特效字（不跟著鏡頭） ----
    // 白光：合體、變身完成
    for (const [at, col] of [[S3 + OHMA_T.merge, "255,230,150"], [S4 + D21_T.decade, "255,160,210"], [S4 + D21_T.complete, "255,255,255"]]) {
      const f = 1 - win(t, at, at + 0.5); if (t >= at && f > 0) { ctx.fillStyle = `rgba(${col},${f * 0.8})`; ctx.fillRect(0, 0, W, H); }
    }
    // 開頭的標題
    const ti = win(t, 0.3, 1) * (1 - win(t, 3.2, 4));
    if (ti > 0) { ctx.save(); ctx.globalAlpha = ti; ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(0, 300, W, 120); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#e8c050"; ctx.font = `900 54px ${CJK}`; ctx.fillText("祝福之刻", W / 2, 345); ctx.fillStyle = "#d8ccb0"; ctx.font = `700 18px ${CJK}`; ctx.fillText("#ZI00021・戰役", W / 2, 392); ctx.restore(); }
    speech(t);
    // 逢魔時王：祝福時刻 → 至仁！至善！至高！至強之王！ → OHMA-ZIO 逢魔時王
    if (t >= S3) {
      const st = OHMA_T.title;
      if (ot >= st && ot < OHMA_T.words[0]) fxText(Object.assign({ text: "祝福時刻", size: 120 }, goldText), win(ot, st, OHMA_T.words[0]), W / 2, 90);
      OHMA_WORDS.forEach((w, i) => { const a = OHMA_T.words[i], b = OHMA_T.words[i + 1] ?? OHMA_T.merge; if (ot >= a && ot < b) fxText(Object.assign({ text: w, size: i === 3 ? 120 : 130 }, goldText), win(ot, a, b), W / 2, 90); });
      if (ot >= OHMA_T.merge && ot < OHMA_T.merge + 4.5) {
        const k = win(ot, OHMA_T.merge, OHMA_T.merge + 4.5);
        fxText({ text: "OHMA-ZIO", fill: "#ffd060", stroke: "#5a1a08", glow: "#ff8a20", size: 104 }, k, W / 2, 70);
        fxText(Object.assign({ text: "逢魔時王", size: 60 }, goldText), clamp(k * 1.05 - 0.05), W / 2, 150);
      }
    }
    // 門矢士：K-Touch 21 的騎士們 → FINAL KAMENRIDE
    if (t >= S4) {
      NAMES.forEach((n, i) => { const a = D21_T.names + i * D21_T.gap, b = a + D21_T.gap * 1.6; if (dt4 >= a && dt4 < b) fxText(n, win(dt4, a, b), W / 2 + ((i % 3) - 1) * 70, 280 + (i % 2) * 30); });
      const fk = win(dt4, D21_T.finalKR, D21_T.finalKR + 1.3);
      if (fk > 0 && fk < 1) {
        const grow = ease(win(fk, 0, 0.45)), out = 1 - win(fk, 0.85, 1), bw = 760 * grow, bx = W / 2 - 380;
        ctx.save(); ctx.globalAlpha = out;
        rr(bx, 250, Math.max(40, bw), 96, 48); ctx.fillStyle = "rgba(255,120,190,.55)"; ctx.fill(); ctx.strokeStyle = "#ff1a78"; ctx.lineWidth = 5; ctx.stroke();
        ctx.save(); rr(bx, 250, Math.max(40, bw), 96, 48); ctx.clip();
        ctx.fillStyle = "#ff1a78"; ctx.font = `400 56px ${LAT}`; ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.fillText("FINAL", bx + 60, 300); ctx.textAlign = "right"; ctx.fillText("KAMENRIDE", bx + 720, 300);
        ctx.restore(); ctx.restore();
      }
    }
    if (showTime) { ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(8, H - 34, 330, 26); ctx.fillStyle = "#fff"; ctx.font = "14px monospace"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(`T ${t.toFixed(2)}  逢魔 ${(t - S3).toFixed(2)}  21 ${(t - S4).toFixed(2)}`, 16, H - 21); }
  }

  // ===== 播放 =====
  function clockTime() {
    // 音效在播的時候，用音效的時間（才不會越跑越不準）
    // （差太多就是音效還沒載好、跳不過去，那就照時鐘走）
    const c = (performance.now() - startAt) / 1000;
    if (!sndOhma.paused && T >= S3 && T < S3 + (sndOhma.duration || 19) && Math.abs(S3 + sndOhma.currentTime - c) < 0.6) return S3 + sndOhma.currentTime;
    if (!snd21.paused && T >= S4 && Math.abs(S4 + snd21.currentTime - c) < 0.6) return S4 + snd21.currentTime;
    return c;
  }
  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    const nt = clockTime();
    if (Math.abs(nt - T - dt) > 0.15) startAt = performance.now() - nt * 1000;          // 對齊音效
    T = nt;
    if (T >= S3 && !fired.sOhma) { fired.sOhma = true; try { sndOhma.currentTime = Math.max(0, T - S3); sndOhma.play().catch(() => {}); } catch (e) { /* 沒聲音也照放 */ } }
    if (T >= S4 && !fired.s21) { fired.s21 = true; try { snd21.currentTime = Math.max(0, T - S4); snd21.play().catch(() => {}); } catch (e) { /* 沒聲音也照放 */ } }
    frame(T, dt);
    if (T >= END) { running = false; document.getElementById("zioEnd").classList.remove("hidden"); return; }
    requestAnimationFrame(loop);
  }
  function play(from = 0) {
    fired = {}; parts = [];
    sndOhma.pause(); snd21.pause();
    if (from > S3) fired.sOhma = from > S3 + 19;
    startAt = performance.now() - from * 1000; T = from; last = performance.now(); running = true;
    document.getElementById("zioStart").classList.add("hidden"); document.getElementById("zioEnd").classList.add("hidden");
    requestAnimationFrame(loop);
  }
  function fit() {
    const k = Math.min(window.innerWidth / W, window.innerHeight / H);
    cv.style.width = `${W * k}px`; cv.style.height = `${H * k}px`; cv.style.marginTop = `${(window.innerHeight - H * k) / 2}px`;
  }
  window.addEventListener("resize", fit); fit();
  window.addEventListener("keydown", (e) => { if (e.key === "t" || e.key === "T") showTime = !showTime; });
  document.getElementById("zioPlay").addEventListener("click", () => play(+(new URLSearchParams(location.search).get("t") || 0)));
  document.getElementById("zioAgain").addEventListener("click", () => play(0));
  frame(0, 0);
  R.Zio = { play, frame, get T() { return T; }, S3, S4, END, OHMA_T, D21_T };
})();
