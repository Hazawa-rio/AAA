/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/version-check.js": "20261113040753" });
// 版本檢查：每個 js / css 檔都登記了自己的版本，跟 html 的 <meta name="build"> 比對
// 有檔案不一樣（上傳時漏掉、瀏覽器快取到舊檔、檔案不見）就在畫面最上方顯示紅色提示
// 這個檔案要放在所有 <script> 的最後
(function () {
  const want = document.querySelector('meta[name="build"]')?.content;
  if (!want) return;
  const files = (window.RPG && window.RPG.files) || {};
  const bad = [];
  // 檔案有沒有真的載到：404 代表檔案不見；有載到卻沒有版本標記，就是很舊的檔案
  const status = (src) => {
    const e = performance.getEntriesByName(new URL(src, location.href).href)[0];
    return e && typeof e.responseStatus === "number" ? e.responseStatus : null;
  };
  for (const s of document.querySelectorAll('script[src^="js/"]')) {
    const f = s.getAttribute("src").split("?")[0];
    if (f === "js/version-check.js") continue;
    if (!files[f]) bad.push(status(s.getAttribute("src")) === 404 ? `${f}（找不到檔案）` : `${f}（舊版，沒有版本標記）`);
    else if (files[f] !== want) bad.push(`${f}（舊版 ${files[f]}）`);
  }
  for (const l of document.querySelectorAll('link[rel="stylesheet"][href^="css/"]')) {
    const f = l.getAttribute("href").split("?")[0];
    const v = "--build-" + f.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const got = getComputedStyle(document.documentElement).getPropertyValue(v).trim().replace(/"/g, "");
    if (!got) bad.push(`${f}（沒有載入成功）`);
    else if (got !== want) bad.push(`${f}（舊版 ${got}）`);
  }
  if (!bad.length) return;
  const el = document.createElement("div");
  el.id = "versionWarn";
  el.innerHTML = `<b>檔案版本不一致（目前網頁版本 ${want}）</b>：以下檔案不是最新的，遊戲可能會出錯。` +
    `請重新上傳這些檔案，或按 Ctrl+F5 強制重新整理。<br>${bad.join("、")}`;
  document.body.prepend(el);
})();
