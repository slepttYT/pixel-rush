#!/usr/bin/env node
/* =====================================================================================
   PIXEL RUSH ONLINE SERVER
   One file, no installs: a dedicated game server + server registry + guest accounts + leaderboards.
   Run it:   double-click PixelRushServer.exe   or   node pixel-rush-server.js
   Options:  --port 7777 --name "My Server" --max 8 --password secret --region EU
             --registry http://registry-host:7777   (also list this server on another server's browser)
   Settings can also go in online_config.json next to this file (command line wins).
   Based on the "Plug-and-Play Multiplayer Architecture" plan, adapted for a browser game:
   WebSockets instead of ENet (browsers cannot use UDP), and built-in JSON storage for
   accounts and leaderboards instead of Nakama (no Docker or database to install).
   ===================================================================================== */
'use strict';
const http = require('http'), https = require('https'), crypto = require('crypto'), fs = require('fs'), path = require('path'), os = require('os');

const PROTOCOL = 1, GAME_VERSION = '0.5';
let isSea = false; try { isSea = require('node:sea').isSea(); } catch (e) {}
const BASE = isSea ? path.dirname(process.execPath) : __dirname;

/* ---------- configuration ---------- */
const DEFAULTS = { name: 'Pixel Rush Server', port: 7777, maxPlayers: 8, region: 'Local', password: '', registry: '', publicAddress: '', motd: 'Have fun!' };
function loadConfig() {
  const cfg = Object.assign({}, DEFAULTS);
  try { const f = path.join(BASE, 'online_config.json'); if (fs.existsSync(f)) Object.assign(cfg, JSON.parse(fs.readFileSync(f, 'utf8'))); } catch (e) { console.log('! online_config.json could not be read, using defaults'); }
  const a = process.argv.slice(2), map = { '--port': 'port', '--name': 'name', '--max': 'maxPlayers', '--password': 'password', '--registry': 'registry', '--region': 'region', '--public-address': 'publicAddress', '--motd': 'motd' };
  for (let i = 0; i < a.length; i++) if (map[a[i]] && a[i + 1] !== undefined) cfg[map[a[i]]] = a[++i];
  cfg.port = Math.max(1, Math.min(65535, parseInt(cfg.port, 10) || 7777));
  cfg.maxPlayers = Math.max(1, Math.min(16, parseInt(cfg.maxPlayers, 10) || 8));
  cfg.name = String(cfg.name).slice(0, 40); cfg.region = String(cfg.region).slice(0, 20);
  return cfg;
}
const CFG = loadConfig();
const SERVER_ID = crypto.createHash('sha1').update(CFG.name + ':' + CFG.port + ':' + os.hostname()).digest('hex').slice(0, 12);

/* ---------- tiny JSON storage (accounts and leaderboards) ---------- */
const DATA = path.join(BASE, 'pixel-rush-data');
try { fs.mkdirSync(DATA, { recursive: true }); } catch (e) {}
function loadJSON(name, def) { try { return JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8')); } catch (e) { return def; } }
const saveTimers = {};
function saveJSON(name, obj) { clearTimeout(saveTimers[name]); saveTimers[name] = setTimeout(() => { try { const f = path.join(DATA, name); fs.writeFileSync(f + '.tmp', JSON.stringify(obj)); fs.renameSync(f + '.tmp', f); } catch (e) { console.log('! could not save', name, e.message); } }, 300); }
const IDS = loadJSON('identities.json', {});      /* token -> { id, name, created, last } */
const LB = loadJSON('leaderboards.json', { wins: {}, best_wave: {}, races: {} });
for (const b of ['wins', 'best_wave', 'races']) if (!LB[b]) LB[b] = {};

/* ---------- helpers ---------- */
const now = () => Date.now();
const cleanName = n => (String(n || '').replace(/[^\w \-.!?]/g, '').trim().slice(0, 16) || 'Player');
const log = (...a) => console.log(new Date().toLocaleTimeString(), ...a);
function lanAddresses() { const out = []; for (const list of Object.values(os.networkInterfaces())) for (const n of list || []) if (n.family === 'IPv4' && !n.internal) out.push(n.address); return out; }
function isPrivate(ip) { return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|::1|fc|fd|fe80)/i.test(ip || ''); }
function cleanIp(ip) { return String(ip || '').replace(/^::ffff:/, ''); }

/* ---------- leaderboards: only the server writes them, from races it watched ---------- */
function lbSubmit(board, id, name, value, op) {
  const b = LB[board]; const cur = b[id];
  if (op === 'best') { if (!cur || value > cur.score) b[id] = { name, score: value, at: now() }; else cur.name = name; }
  else b[id] = { name, score: (cur ? cur.score : 0) + value, at: now() };
  saveJSON('leaderboards.json', LB);
}
function lbTop(board, n) { const b = LB[board] || {}; return Object.entries(b).map(([id, r]) => ({ id, name: r.name, score: r.score })).sort((a, c) => c.score - a.score).slice(0, n || 25); }

/* ---------- server registry (server browser) ---------- */
const REG = new Map(); /* id -> listing; entries vanish after 15 s without a heartbeat */
function selfListing(hostHint) {
  return { id: SERVER_ID, name: CFG.name, addr: CFG.publicAddress || hostHint || '', port: CFG.port, region: CFG.region, players: clients.size, max: CFG.maxPlayers, version: GAME_VERSION, protocol: PROTOCOL, password: !!CFG.password, mode: 'Versus Race', state: room.state, lastSeen: now() };
}
function regList(hostHint) {
  const t = now(); for (const [id, s] of REG) if (t - s.lastSeen > 15000) REG.delete(id);
  return [selfListing(hostHint)].concat([...REG.values()].filter(s => s.id !== SERVER_ID));
}
function heartbeatToRegistry() {
  if (!CFG.registry) return;
  let u; try { u = new URL('/heartbeat', CFG.registry); } catch (e) { return; }
  const body = JSON.stringify(Object.assign(selfListing(), { addr: CFG.publicAddress || '' }));
  const req = (u.protocol === 'https:' ? https : http).request(u, { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) }, timeout: 4000 }, r => r.resume());
  req.on('error', () => {}); req.on('timeout', () => req.destroy()); req.end(body);
}

/* ---------- HTTP: status page, /info, /servers, /heartbeat, /leaderboard ---------- */
const hbRate = new Map();
function send(res, code, obj, type) {
  res.writeHead(code, { 'content-type': type || 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'cache-control': 'no-store' });
  res.end(typeof obj === 'string' ? obj : JSON.stringify(obj));
}
const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, '');
  const u = new URL(req.url, 'http://x'), host = (req.headers.host || '').split(':')[0];
  if (u.pathname === '/info') return send(res, 200, selfListing(host));
  if (u.pathname === '/servers') return send(res, 200, { servers: regList(host) });
  if (u.pathname === '/leaderboard') { const b = u.searchParams.get('board') || 'wins'; return send(res, 200, { board: b, top: lbTop(b, 25) }); }
  if (u.pathname === '/heartbeat' && req.method === 'POST') {
    let body = ''; req.on('data', d => { body += d; if (body.length > 4096) req.destroy(); });
    req.on('end', () => {
      try {
        const s = JSON.parse(body), ip = cleanIp(req.socket.remoteAddress);
        if (!s || typeof s.id !== 'string' || !/^[a-f0-9]{6,32}$/.test(s.id)) return send(res, 400, { ok: false });
        const last = hbRate.get(s.id) || 0; if (now() - last < 2000) return send(res, 429, { ok: false }); hbRate.set(s.id, now());
        /* the address comes from where the heartbeat really came from (no fake listings for other machines) */
        const addr = (ip && !/^127\./.test(ip) && ip !== '::1') ? ip : String(s.addr || '').slice(0, 64);
        REG.set(s.id, { id: s.id, name: cleanName(s.name), addr, port: parseInt(s.port, 10) || 7777, region: String(s.region || '').slice(0, 20), players: +s.players || 0, max: +s.max || 8, version: String(s.version || '').slice(0, 10), protocol: +s.protocol || 0, password: !!s.password, mode: String(s.mode || '').slice(0, 20), state: String(s.state || '').slice(0, 12), lastSeen: now() });
        send(res, 200, { ok: true });
      } catch (e) { send(res, 400, { ok: false }); }
    });
    return;
  }
  if (u.pathname === '/' || u.pathname === '/index.html') {
    const rows = [...clients.values()].map(c => '<li>' + c.name + (c.id === room.leader ? ' (leader)' : '') + '</li>').join('') || '<li>nobody yet</li>';
    return send(res, 200, '<!doctype html><meta charset=utf8><title>' + CFG.name + '</title><body style="background:#0b0d12;color:#e9ffe0;font:16px monospace;padding:24px"><h1 style="color:#5fd07a">' + CFG.name + '</h1><p>Pixel Rush ' + GAME_VERSION + ' online server is running.</p><p>In the game: <b>ONLINE</b> &rarr; type <b>' + (host || 'this-pc-address') + ':' + CFG.port + '</b> &rarr; JOIN.</p><p>Players (' + clients.size + '/' + CFG.maxPlayers + '):</p><ul>' + rows + '</ul><p>Room: ' + room.state + '</p></body>', 'text/html; charset=utf-8');
  }
  send(res, 404, { error: 'not found' });
});

/* ---------- WebSocket (RFC 6455), written by hand so there is nothing to install ---------- */
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const ipConns = new Map();
server.on('upgrade', (req, sock) => {
  const ip = cleanIp(req.socket.remoteAddress);
  if (new URL(req.url, 'http://x').pathname !== '/ws' || !req.headers['sec-websocket-key']) { sock.destroy(); return; }
  if ((ipConns.get(ip) || 0) >= 6) { sock.destroy(); return; } /* rate limit: a few connections per address */
  const accept = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + WS_GUID).digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  sock.setNoDelay(true);
  ipConns.set(ip, (ipConns.get(ip) || 0) + 1);
  const ws = makeSocket(sock, ip);
  sock.on('close', () => { ipConns.set(ip, Math.max(0, (ipConns.get(ip) || 1) - 1)); ws.closed = true; onClose(ws); });
  sock.on('error', () => {});
});
function frame(op, payload) {
  const len = payload.length; let head;
  if (len < 126) head = Buffer.from([0x80 | op, len]);
  else if (len < 65536) { head = Buffer.alloc(4); head[0] = 0x80 | op; head[1] = 126; head.writeUInt16BE(len, 2); }
  else { head = Buffer.alloc(10); head[0] = 0x80 | op; head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
  return Buffer.concat([head, payload]);
}
function makeSocket(sock, ip) {
  const ws = { sock, ip, buf: Buffer.alloc(0), frag: [], closed: false, alive: now(), msgT: [], hello: false, born: now() };
  ws.send = obj => { if (ws.closed) return; try { sock.write(frame(1, Buffer.from(JSON.stringify(obj)))); } catch (e) {} };
  ws.close = () => { if (ws.closed) return; try { sock.write(frame(8, Buffer.alloc(0))); } catch (e) {} sock.end(); };
  sock.on('data', d => {
    ws.buf = Buffer.concat([ws.buf, d]);
    if (ws.buf.length > 70000) { ws.close(); return; }
    for (;;) {
      if (ws.buf.length < 2) return;
      const b0 = ws.buf[0], b1 = ws.buf[1], fin = b0 & 0x80, op = b0 & 0x0f, masked = b1 & 0x80; let len = b1 & 0x7f, off = 2;
      if (len === 126) { if (ws.buf.length < 4) return; len = ws.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (ws.buf.length < 10) return; const big = ws.buf.readBigUInt64BE(2); if (big > 65536n) { ws.close(); return; } len = Number(big); off = 10; }
      if (!masked) { ws.close(); return; } /* clients must mask */
      if (ws.buf.length < off + 4 + len) return;
      const mask = ws.buf.slice(off, off + 4), data = Buffer.from(ws.buf.slice(off + 4, off + 4 + len));
      for (let i = 0; i < data.length; i++) data[i] ^= mask[i & 3];
      ws.buf = ws.buf.slice(off + 4 + len);
      ws.alive = now();
      if (op === 8) { ws.close(); return; }
      if (op === 9) { try { sock.write(frame(10, data)); } catch (e) {} continue; }
      if (op === 10) continue;
      if (op === 1 || op === 0) { ws.frag.push(data); if (!fin) continue; const txt = Buffer.concat(ws.frag).toString('utf8'); ws.frag = []; if (txt.length > 4096) { ws.close(); return; } onText(ws, txt); }
    }
  });
  return ws;
}
setInterval(() => { /* keep-alive: ping everyone, drop silent sockets and slow hellos */
  const t = now();
  for (const ws of allSockets) { if (ws.closed) continue; if (t - ws.alive > 35000 || (!ws.hello && t - ws.born > 10000)) { ws.close(); continue; } try { ws.sock.write(frame(9, Buffer.alloc(0))); } catch (e) {} }
}, 15000);

/* ---------- game protocol ----------
   client -> server: hello{v,game,name,token,maxWorld,pw}  ready{on}  settings{world,target,diff,mods}  start  status{wave,hp,maxhp,score,kills}  clear{wave}  dead  finish  chat{text}  leave
   server -> client: welcome{id,token,name,motd}  room{...}  countdown{n}  go{world,target,diff,mods,t0}  race{players}  attack{from,n}  results{rows}  error{msg}  info{msg}
   The race is watched by the server: waves must go up one at a time and not faster than real play allows,
   scores must be possible for the wave reached. Anything odd is flagged and kept off the leaderboards. */
const allSockets = new Set(), clients = new Map(); /* ws -> player */
const MIN_WAVE_SEC = 3.5, TARGETS = [10, 20, 30], DIFFS = ['easy', 'medium', 'hard', 'nowin'], MODS = ['glass', 'swarm', 'fast', 'nodash', 'evolved', 'thrifty', 'iron'];
const room = { state: 'lobby', leader: null, settings: { world: 1, target: 20, diff: 'medium', mods: [] }, startedAt: 0, timer: null, results: null };
function players() { return [...clients.values()]; }
function broadcast(obj, except) { for (const [ws, p] of clients) if (ws !== except) ws.send(obj); }
function roomView() {
  return { t: 'room', state: room.state, leader: room.leader, settings: room.settings, maxWorld: Math.min(5, ...players().map(p => p.maxWorld || 1)), server: CFG.name, motd: CFG.motd,
    players: players().map(p => ({ id: p.id, name: p.name, ready: p.ready, wave: p.wave, alive: p.alive, done: p.done, hp: p.hp, maxhp: p.maxhp, score: p.score })) };
}
function sendRoom() { broadcast(roomView()); }
function pickLeader() { if (!players().some(p => p.id === room.leader)) room.leader = players()[0] ? players()[0].id : null; }
function onText(ws, txt) {
  /* rate limit: 20 messages a second */
  const t = now(); ws.msgT = ws.msgT.filter(x => t - x < 1000); ws.msgT.push(t); if (ws.msgT.length > 20) return;
  let m; try { m = JSON.parse(txt); } catch (e) { return; }
  if (!m || typeof m.t !== 'string') return;
  if (!ws.hello) {
    if (m.t !== 'hello') return;
    if (+m.v !== PROTOCOL) { ws.send({ t: 'error', msg: 'This server runs a different version of Pixel Rush (' + GAME_VERSION + '). Update your game.' }); ws.close(); return; }
    if (CFG.password && m.pw !== CFG.password) { ws.send({ t: 'error', msg: 'Wrong server password.' }); ws.close(); return; }
    if (clients.size >= CFG.maxPlayers) { ws.send({ t: 'error', msg: 'Server is full.' }); ws.close(); return; }
    let tok = typeof m.token === 'string' && IDS[m.token] ? m.token : null;
    if (!tok) { tok = crypto.randomBytes(16).toString('hex'); IDS[tok] = { id: crypto.randomBytes(6).toString('hex'), created: now() }; }
    const ident = IDS[tok]; ident.name = cleanName(m.name); ident.last = now(); saveJSON('identities.json', IDS);
    if (players().some(p => p.id === ident.id)) { ws.send({ t: 'error', msg: 'You are already connected from another window.' }); ws.close(); return; }
    ws.hello = true; allSockets.add(ws);
    const p = { id: ident.id, name: ident.name, ready: false, maxWorld: Math.max(1, Math.min(5, +m.maxWorld || 1)), wave: 0, alive: true, done: false, hp: 0, maxhp: 0, score: 0, kills: 0, flagged: false, lastWave: 0, lastWaveAt: 0, sentFor: 0, finishAt: 0 };
    clients.set(ws, p); pickLeader();
    ws.send({ t: 'welcome', id: p.id, token: tok, name: p.name, motd: CFG.motd, server: CFG.name });
    log('+', p.name, 'joined (' + clients.size + '/' + CFG.maxPlayers + ')');
    if (room.state === 'race') { p.done = true; p.alive = false; ws.send({ t: 'info', msg: 'A race is running. You can join the next one.' }); }
    sendRoom(); return;
  }
  const p = clients.get(ws); if (!p) return;
  switch (m.t) {
    case 'ready': if (room.state === 'lobby') { p.ready = !!m.on; sendRoom(); } break;
    case 'settings':
      if (room.state !== 'lobby' || p.id !== room.leader) break;
      { const s = room.settings, mw = Math.min(5, ...players().map(q => q.maxWorld || 1));
        if (m.world !== undefined) s.world = Math.max(1, Math.min(mw, +m.world || 1));
        if (TARGETS.includes(+m.target)) s.target = +m.target;
        if (DIFFS.includes(m.diff)) s.diff = m.diff;
        if (Array.isArray(m.mods)) s.mods = m.mods.filter(x => MODS.includes(x)).slice(0, 7); }
      for (const q of players()) q.ready = false; sendRoom(); break;
    case 'start':
      if (room.state !== 'lobby' || p.id !== room.leader) break;
      if (!players().every(q => q.ready || q.id === room.leader)) { ws.send({ t: 'info', msg: 'Everyone has to press READY first.' }); break; }
      startCountdown(); break;
    case 'status':
      if (room.state !== 'race' || p.done) break;
      { const w = Math.max(0, Math.floor(+m.wave || 0)), sc = Math.max(0, Math.floor(+m.score || 0)), el = (now() - room.startedAt) / 1000;
        if (w > p.lastWave + 1) p.flagged = true;                         /* skipped waves */
        if (w > 1 && el < (w - 1) * MIN_WAVE_SEC) p.flagged = true;       /* faster than possible */
        if (sc > 6000 * Math.max(1, w) + 20000) p.flagged = true;           /* impossible score */
        if (w > p.lastWave) { p.lastWave = w; p.lastWaveAt = now(); }
        p.wave = Math.max(p.wave, w); p.score = Math.max(p.score, sc); p.kills = Math.max(0, +m.kills || 0); p.hp = Math.max(0, +m.hp || 0); p.maxhp = Math.max(0, +m.maxhp || 0); }
      break;
    case 'clear': /* a cleared wave sends a few extra enemies to every rival still racing */
      if (room.state !== 'race' || p.done) break;
      { const w = Math.floor(+m.wave || 0); if (w <= p.sentFor || w > p.lastWave + 1) break; p.sentFor = w;
        const n = Math.min(6, 1 + Math.floor(w / 10));
        for (const [ows, o] of clients) if (o !== p && !o.done) ows.send({ t: 'attack', from: p.name, n }); }
      break;
    case 'dead': if (room.state === 'race' && !p.done) { p.alive = false; p.done = true; p.finishAt = 0; log(p.name, 'fell on wave', p.wave); checkEnd(); } break;
    case 'finish':
      if (room.state === 'race' && !p.done) {
        if (p.wave < room.settings.target) p.flagged = true;
        p.done = true; p.finishAt = now(); log(p.name, 'finished in', ((p.finishAt - room.startedAt) / 1000).toFixed(1) + 's'); checkEnd();
      }
      break;
    case 'chat': { const txt = String(m.text || '').replace(/[<>]/g, '').slice(0, 80).trim(); if (txt) broadcast({ t: 'chat', from: p.name, text: txt }); } break;
    case 'leave': ws.close(); break;
  }
}
function onClose(ws) {
  allSockets.delete(ws); const p = clients.get(ws); if (!p) return;
  clients.delete(ws); log('-', p.name, 'left');
  pickLeader();
  if (room.state === 'race') checkEnd(); else if (room.state === 'countdown' && clients.size === 0) resetRoom();
  sendRoom();
}
function startCountdown() {
  room.state = 'countdown'; let n = 3; sendRoom();
  const tick = () => {
    if (!clients.size) { resetRoom(); return; }
    if (n > 0) { broadcast({ t: 'countdown', n }); n--; room.timer = setTimeout(tick, 1000); return; }
    room.state = 'race'; room.startedAt = now();
    for (const q of players()) Object.assign(q, { wave: 0, alive: true, done: false, hp: 0, maxhp: 0, score: 0, kills: 0, flagged: false, lastWave: 0, lastWaveAt: now(), sentFor: 0, finishAt: 0, ready: false });
    broadcast({ t: 'go', world: room.settings.world, target: room.settings.target, diff: room.settings.diff, mods: room.settings.mods });
    log('race started: world', room.settings.world, 'first to wave', room.settings.target, 'with', clients.size, 'players');
    room.timer = setTimeout(() => endRace('time'), 30 * 60 * 1000); /* a race never lasts more than 30 minutes */
  };
  tick();
}
setInterval(() => { if (room.state === 'race') broadcast({ t: 'race', players: players().map(p => ({ id: p.id, name: p.name, wave: p.wave, hp: p.hp, maxhp: p.maxhp, alive: p.alive, done: p.done, score: p.score })) }); }, 1000);
function checkEnd() { if (room.state === 'race' && players().every(p => p.done)) endRace('done'); }
function endRace(why) {
  if (room.state !== 'race') return; clearTimeout(room.timer);
  const ps = players(), fin = ps.filter(p => p.finishAt).sort((a, b) => a.finishAt - b.finishAt), rest = ps.filter(p => !p.finishAt).sort((a, b) => b.wave - a.wave || b.score - a.score);
  const rows = fin.concat(rest).map((p, i) => ({ place: i + 1, id: p.id, name: p.name, wave: p.wave, score: p.score, time: p.finishAt ? Math.round((p.finishAt - room.startedAt) / 1000) : null, finished: !!p.finishAt, flagged: p.flagged }));
  /* trusted leaderboard writes: only results the server watched, never flagged ones */
  for (const r of rows) { if (r.flagged) continue; lbSubmit('races', r.id, r.name, 1, 'sum'); lbSubmit('best_wave', r.id, r.name, r.wave, 'best'); }
  if (rows.length >= 2 && !rows[0].flagged && rows[0].finished) lbSubmit('wins', rows[0].id, rows[0].name, 1, 'sum');
  broadcast({ t: 'results', rows, why });
  log('race over (' + why + '):', rows.map(r => r.place + '. ' + r.name + ' w' + r.wave).join('  '));
  resetRoom();
}
function resetRoom() { clearTimeout(room.timer); room.state = 'lobby'; for (const q of players()) q.ready = false; sendRoom(); }

/* ---------- start ---------- */
server.on('error', e => { if (e.code === 'EADDRINUSE') console.log('\n! Port ' + CFG.port + ' is already in use. Close the other server, or start with  --port 7778\n'); else console.log('! server error:', e.message); process.exitCode = 1; });
server.listen(CFG.port, () => {
  const ips = lanAddresses();
  console.log('\n  PIXEL RUSH ONLINE SERVER  (game ' + GAME_VERSION + ', protocol ' + PROTOCOL + ')');
  console.log('  ' + CFG.name + ' | up to ' + CFG.maxPlayers + ' players' + (CFG.password ? ' | password protected' : ''));
  console.log('\n  In Pixel Rush: ONLINE -> type one of these -> JOIN');
  console.log('    this PC:          localhost:' + CFG.port);
  for (const ip of ips) console.log('    same Wi-Fi/LAN:   ' + ip + ':' + CFG.port);
  console.log('    over the internet: forward port ' + CFG.port + ' (TCP) on your router, then share  <your public IP>:' + CFG.port);
  if (CFG.registry) console.log('\n  Listing this server on: ' + CFG.registry);
  console.log('\n  Leave this window open while people play. Close it to stop the server.\n');
  if (CFG.registry) { heartbeatToRegistry(); setInterval(heartbeatToRegistry, 5000); }
});
module.exports = { server, CFG };
