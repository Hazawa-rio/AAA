/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, { "js/net.js": "20261122223322" });
// 多人連線（懸掛電話）：房主說了算的星狀連線——房主收每個人的輸入、算完再發給大家
//   連線方式：
//     peer  ＝PeerJS（點對點；懸掛電話的 6 位數房號＝房主的連線代號 "dorrpg-<房號>"；第一次用時才從 CDN 載入 PeerJS）
//     local ＝同一個瀏覽器的兩個分頁（BroadcastChannel；開發、測試用：網址加 ?net=local，或 localStorage rpg.netLocal = "1"）
//   R.Net.host(code, me) / R.Net.join(code, me)：me = { name, char, letter, color }
//   R.Net.send(msg)：房主＝發給所有人；其他人＝發給房主
//   R.Net.on(type, fn)：收到某種訊息（fn(msg, fromId)）；特別的事件："lobby"（成員變了）、"hostLost"（房主斷線）、"left"（有人離開，fromId＝誰）
//   房主轉發：其他人之間不直接連線；需要讓大家知道的事都由房主發出去
//   成員表（lobby）：[{ id, name, char, letter, color, host }]；同一個房間裡角色不能重複（重複的會標出來，房主不能開始）
(function () {
  const R = (window.RPG = window.RPG || {});
  const PEER_JS = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";
  const PREFIX = "dorrpg-";
  const qs = new URLSearchParams(location.search);
  const useLocal = () => qs.get("net") === "local" || (() => { try { return localStorage.getItem("rpg.netLocal") === "1"; } catch (e) { return false; } })();

  const N = {
    role: null, code: null, myId: null, me: null, members: [], status: "", game: null,
    handlers: {}, conns: new Map(), hostConn: null, peer: null, chan: null,
    on(type, fn) { (this.handlers[type] = this.handlers[type] || []).push(fn); return () => { this.handlers[type] = this.handlers[type].filter((f) => f !== fn); }; },
    off(type) { delete this.handlers[type]; },
    emit(type, msg, from) { for (const f of this.handlers[type] || []) { try { f(msg, from); } catch (e) { console.error(e); } } },
    get online() { return !!this.role; },
    get isHost() { return this.role === "host"; },
  };

  // ===== 收到訊息 =====
  function handle(msg, from) {
    if (!msg || !msg.t) return;
    if (N.isHost) {
      if (msg.t === "hello") {
        const m = { id: from, name: msg.name, char: msg.char, letter: msg.letter, color: msg.color, host: false };
        const i = N.members.findIndex((x) => x.id === from);
        if (i >= 0) N.members[i] = m; else N.members.push(m);
        return pushLobby();
      }
      if (msg.t === "bye") return drop(from);
    } else {
      if (msg.t === "lobby") { N.members = msg.members; N.game = msg.game || null; N.emit("lobby", msg); return; }
      if (msg.t === "kick") { leave(); N.status = msg.why || "被請出房間了"; N.emit("lobby", {}); return; }
    }
    N.emit(msg.t, msg, from);
  }
  function pushLobby() { send({ t: "lobby", members: N.members, game: N.game }); N.emit("lobby", { members: N.members }); }
  function drop(id) {
    if (!N.isHost) return;
    const had = N.members.some((m) => m.id === id);
    N.members = N.members.filter((m) => m.id !== id);
    N.conns.get(id)?.close?.(); N.conns.delete(id);
    if (had) { N.emit("left", {}, id); pushLobby(); }
  }

  // ===== 發送 =====
  function send(msg) {
    if (!N.role) return;
    if (N.chan) { N.chan.postMessage({ room: N.code, from: N.myId, to: N.isHost ? "*" : "host", msg }); return; }
    if (N.isHost) for (const c of N.conns.values()) { if (c.open) c.send(msg); }
    else if (N.hostConn?.open) N.hostConn.send(msg);
  }
  // 房主發給某一個人
  function sendTo(id, msg) {
    if (!N.isHost) return send(msg);
    if (N.chan) { N.chan.postMessage({ room: N.code, from: N.myId, to: id, msg }); return; }
    const c = N.conns.get(id); if (c?.open) c.send(msg);
  }

  // ===== PeerJS =====
  let loading = null;
  function loadPeer() {
    if (window.Peer) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((ok, no) => {
      const s = document.createElement("script"); s.src = PEER_JS; s.onload = ok; s.onerror = () => { loading = null; no(new Error("載入連線元件失敗（請確認網路）")); };
      document.head.appendChild(s);
    });
    return loading;
  }
  const errText = (e) => ({ "unavailable-id": "這個房號已經有人在用了，重新產生一組", "peer-unavailable": "找不到這個房號（房主還沒開房，或已經關掉了）", network: "連不上配對伺服器（請確認網路）", "server-error": "配對伺服器出了問題，等一下再試", "browser-incompatible": "這個瀏覽器不支援點對點連線" })[e?.type] || `連線錯誤：${e?.type || e?.message || e}`;

  function wire(conn, id) {
    conn.on("data", (msg) => handle(msg, id));
    conn.on("close", () => {
      if (N.isHost) drop(id);
      else if (N.role) { N.status = "房主斷線了"; N.emit("hostLost", {}); }
    });
    conn.on("error", () => {});
  }
  async function hostPeer(code) {
    await loadPeer();
    return new Promise((ok, no) => {
      const peer = new window.Peer(PREFIX + code, { debug: 0 });
      N.peer = peer;
      peer.on("open", (id) => { N.myId = id; ok(); });
      peer.on("error", (e) => { if (!N.myId) no(new Error(errText(e))); else { N.status = errText(e); N.emit("lobby", {}); } });
      peer.on("connection", (conn) => {
        conn.on("open", () => {
          if (N.members.length >= 4) { conn.send({ t: "kick", why: "房間滿了（最多 4 人）" }); setTimeout(() => conn.close(), 300); return; }
          N.conns.set(conn.peer, conn); wire(conn, conn.peer);
        });
      });
      peer.on("disconnected", () => { try { peer.reconnect(); } catch (e) { /* 重連失敗就算了 */ } });
    });
  }
  async function joinPeer(code) {
    await loadPeer();
    return new Promise((ok, no) => {
      const peer = new window.Peer(undefined, { debug: 0 });
      N.peer = peer;
      let done = false;
      peer.on("error", (e) => { if (!done) { done = true; no(new Error(errText(e))); } else { N.status = errText(e); N.emit("lobby", {}); } });
      peer.on("open", (id) => {
        N.myId = id;
        const conn = peer.connect(PREFIX + code, { reliable: true });
        N.hostConn = conn;
        const t = setTimeout(() => { if (!done) { done = true; no(new Error("撥打沒有回應（找不到這個房號）")); } }, 12000);
        conn.on("open", () => { clearTimeout(t); wire(conn, "host"); if (!done) { done = true; ok(); } });
      });
    });
  }

  // ===== 同一個瀏覽器的分頁（BroadcastChannel） =====
  function localChan(code, asHost) {
    return new Promise((ok, no) => {
      const ch = new BroadcastChannel("dorrpg-net");
      N.chan = ch;
      N.myId = asHost ? "host" : "p" + Math.random().toString(36).slice(2, 8);
      let ready = asHost, probe = null;
      ch.onmessage = (ev) => {
        const d = ev.data; if (!d || d.room !== code || d.from === N.myId) return;
        if (asHost) {
          if (d.msg?.t === "ping") { ch.postMessage({ room: code, from: "host", to: d.from, msg: { t: "pong" } }); return; }
          if (d.msg?.t === "hostCheck") { ch.postMessage({ room: code, from: "host", to: d.from, msg: { t: "hostHere" } }); return; }
          if (d.to !== "host" && d.to !== "*") return;
          if (!N.members.some((m) => m.id === d.from) && d.msg?.t !== "hello") return;
          if (N.members.length >= 4 && d.msg?.t === "hello" && !N.members.some((m) => m.id === d.from)) { ch.postMessage({ room: code, from: "host", to: d.from, msg: { t: "kick", why: "房間滿了（最多 4 人）" } }); return; }
          handle(d.msg, d.from);
        } else {
          if (d.from !== "host") return;
          if (d.to !== "*" && d.to !== N.myId) return;
          if (d.msg?.t === "pong") { ready = true; clearTimeout(probe); ok(); return; }
          if (d.msg?.t === "hostGone") { N.status = "房主斷線了"; N.emit("hostLost", {}); return; }
          handle(d.msg, "host");
        }
      };
      if (asHost) {
        // 同一個房號只能有一個房主
        ch.postMessage({ room: code, from: N.myId + "?", to: "host", msg: { t: "hostCheck" } });
        const t = setTimeout(() => ok(), 250);
        const prev = ch.onmessage;
        ch.onmessage = (ev) => { if (ev.data?.msg?.t === "hostHere" && ev.data.room === code) { clearTimeout(t); ch.close(); N.chan = null; no(new Error("這個房號已經有人在用了，重新產生一組")); return; } prev(ev); };
      } else {
        ch.postMessage({ room: code, from: N.myId, to: "host", msg: { t: "ping" } });
        probe = setTimeout(() => { if (!ready) { ch.close(); N.chan = null; no(new Error("找不到這個房號（房主還沒開房，或已經關掉了）")); } }, 1500);
      }
      // 心跳：每秒報到一次；房主 4 秒沒收到某人的消息＝那個人斷線
      const beat = setInterval(() => {
        if (!N.chan) return clearInterval(beat);
        if (asHost) { const now = Date.now(); for (const m of N.members) if (!m.host && now - (seen[m.id] || now) > 4000) drop(m.id); }
        else ch.postMessage({ room: code, from: N.myId, to: "host", msg: { t: "beat" } });
      }, 1000);
      const seen = {};
      if (asHost) { const h = ch.onmessage; ch.onmessage = (ev) => { if (ev.data?.room === code) seen[ev.data.from] = Date.now(); h(ev); }; }
      else { let last = Date.now(); const h = ch.onmessage; ch.onmessage = (ev) => { if (ev.data?.room === code && ev.data.from === "host") last = Date.now(); h(ev); };
        const watch = setInterval(() => { if (!N.chan) return clearInterval(watch); if (ready && Date.now() - last > 4000 && N.role) { N.status = "房主斷線了"; N.emit("hostLost", {}); } }, 1000);
        // 房主那邊也會每秒發心跳
      }
      if (asHost) setInterval(() => { if (N.chan && N.isHost) ch.postMessage({ room: code, from: "host", to: "*", msg: { t: "beat" } }); }, 1000);
    });
  }

  // ===== 開房、加入、離開 =====
  async function host(code, me) {
    leave();
    N.role = "host"; N.code = code; N.me = me; N.status = "開房中……";
    try {
      if (useLocal()) await localChan(code, true); else await hostPeer(code);
      N.members = [{ id: N.myId, ...me, host: true }];
      N.status = useLocal() ? "（同一個瀏覽器的分頁模式）等朋友撥打這組房號" : "等朋友撥打這組房號";
      pushLobby();
      return true;
    } catch (e) { leave(); N.status = e.message; throw e; }
  }
  async function join(code, me) {
    leave();
    N.role = "guest"; N.code = code; N.me = me; N.status = "撥打中……";
    try {
      if (useLocal()) await localChan(code, false); else await joinPeer(code);
      send({ t: "hello", ...me });
      N.status = "已經連上房間";
      return true;
    } catch (e) { leave(); N.status = e.message; throw e; }
  }
  // 自己的資料變了（例如換了角色）
  function update(me) {
    if (!N.role) return;
    N.me = me;
    if (N.isHost) { N.members[0] = { id: N.myId, ...me, host: true }; pushLobby(); }
    else send({ t: "hello", ...me });
  }
  function leave() {
    if (N.role) { try { if (N.isHost) send({ t: "hostGone" }); else send({ t: "bye" }); } catch (e) { /* 已經斷了 */ } }
    if (N.chan) { try { if (N.isHost) N.chan.postMessage({ room: N.code, from: "host", to: "*", msg: { t: "hostGone" } }); } catch (e) { /* */ } N.chan.close(); N.chan = null; }
    for (const c of N.conns.values()) { try { c.close(); } catch (e) { /* */ } }
    N.conns.clear();
    try { N.hostConn?.close(); } catch (e) { /* */ }
    try { N.peer?.destroy(); } catch (e) { /* */ }
    N.peer = null; N.hostConn = null; N.role = null; N.code = null; N.myId = null; N.members = []; N.game = null;
  }
  // 同一個房間裡角色不能重複
  function dupChars() { const seen = {}, dup = new Set(); for (const m of N.members) { if (seen[m.char]) dup.add(m.char); seen[m.char] = true; } return dup; }
  function setGame(g) { if (N.isHost) { N.game = g; pushLobby(); } }
  window.addEventListener("beforeunload", () => leave());

  Object.assign(N, { host, join, leave, send, sendTo, update, dupChars, setGame, useLocal });
  R.Net = N;
})();
