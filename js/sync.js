// Shared journal: peer-to-peer sync with PeerJS (no own server needed).
// The PeerJS public broker is only used to connect browsers; journal data
// then flows directly between players. The library is loaded on demand.
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const PEERJS_URL = "https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js";
  const PREFIX = "phasmahelp-";
  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

  let peer = null, room = null, isHost = false;
  const conns = new Set();
  let applying = false;

  const msg = (t) => { $("#sync-msg").textContent = t || ""; };

  function loadLib() {
    if (window.Peer) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = PEERJS_URL;
      s.onload = res;
      s.onerror = () => rej(new Error("Could not load the sync library. Check your connection."));
      document.head.append(s);
    });
  }

  const makeCode = () => Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");

  function render() {
    const live = !!room;
    $("#sync-idle").hidden = live;
    $("#sync-live").hidden = !live;
    if (live) {
      $("#sync-room").textContent = room;
      const n = conns.size;
      $("#sync-peers").textContent = isHost
        ? n ? `${n} teammate${n > 1 ? "s" : ""} connected (you are hosting)` : "Waiting for teammates… (you are hosting)"
        : n ? "Connected to the host" : "Reconnecting…";
    }
  }

  function send(data, except) {
    conns.forEach((c) => { if (c !== except && c.open) c.send(data); });
  }

  function wire(conn) {
    conn.on("open", () => {
      conns.add(conn);
      if (isHost) conn.send({ type: "state", state: window.PH.sharedState() });
      render();
    });
    conn.on("data", (d) => {
      if (!d || d.type !== "state" || typeof d.state !== "object") return;
      applying = true;
      window.PH.applyRemote(d.state);
      applying = false;
      if (isHost) send(d, conn); // relay to everyone else
    });
    conn.on("close", () => { conns.delete(conn); render(); if (!isHost && room) msg("Host left the room."); });
    conn.on("error", () => { conns.delete(conn); render(); });
  }

  async function create() {
    msg("Creating room…");
    try { await loadLib(); } catch (e) { msg(e.message); return; }
    leave(true);
    isHost = true;
    const code = makeCode();
    peer = new window.Peer(PREFIX + code);
    peer.on("open", () => { room = code; msg(""); render(); });
    peer.on("connection", wire);
    peer.on("error", (e) => {
      if (e.type === "unavailable-id") { create(); return; } // code taken, try another
      msg("Sync error: " + e.type);
    });
  }

  async function join(code) {
    code = (code || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{5}$/.test(code)) { msg("Enter the 5-character room code."); return; }
    msg("Joining…");
    try { await loadLib(); } catch (e) { msg(e.message); return; }
    leave(true);
    isHost = false;
    peer = new window.Peer();
    peer.on("open", () => {
      const conn = peer.connect(PREFIX + code, { reliable: true });
      wire(conn);
      room = code;
      msg("");
      render();
    });
    peer.on("error", (e) => {
      msg(e.type === "peer-unavailable" ? "Room not found. Check the code." : "Sync error: " + e.type);
      if (e.type === "peer-unavailable") leave(true);
    });
  }

  function leave(quiet) {
    conns.forEach((c) => c.close());
    conns.clear();
    if (peer) peer.destroy();
    peer = null; room = null;
    if (!quiet) msg("Left the room.");
    render();
  }

  // Broadcast local changes.
  window.PH.onChange(() => {
    if (!room || applying) return;
    send({ type: "state", state: window.PH.sharedState() });
  });

  $("#sync-create").onclick = create;
  $("#sync-join").onclick = () => join($("#sync-code").value);
  $("#sync-code").addEventListener("keydown", (e) => { if (e.key === "Enter") join(e.target.value); });
  $("#sync-leave").onclick = () => leave(false);
  $("#sync-copy").onclick = async () => {
    const url = `${location.origin}${location.pathname}#room=${room}`;
    try { await navigator.clipboard.writeText(url); msg("Invite link copied."); }
    catch (_) { msg(url); }
  };

  // Auto-join from an invite link (#room=ABCDE).
  const m = /room=([A-Z0-9]{5})/i.exec(location.hash);
  if (m) {
    if (window.PHTools) window.PHTools.showTab("team");
    $("#sync-code").value = m[1].toUpperCase();
    join(m[1]);
    history.replaceState(null, "", location.pathname);
  }
  render();
})();
