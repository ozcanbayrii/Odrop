const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const { InviteStore } = require('./invites');

// --------------------------------------------------------------------------
// .env yükleyici (harici bağımlılık yok)
// --------------------------------------------------------------------------
(function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = val;
  }
})();

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const OWNER_KEY = process.env.ODROP_OWNER_KEY || '';
const OWNER_NAME = process.env.ODROP_OWNER_NAME || 'ODrop';
const TURN_SECRET = process.env.TURN_SECRET || '';
const TURN_HOST = process.env.TURN_HOST || '';
const TURN_TLS = process.env.TURN_TLS !== '0';
const TURN_TTL_SEC = 12 * 60 * 60;
const REQUEST_TIMEOUT_MS = 3 * 60 * 1000;

const invites = new InviteStore(path.join(__dirname, 'data', 'invites.json'));

// MIME types dictionary for static file serving
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.exe': 'application/vnd.microsoft.portable-executable',
  '.zip': 'application/zip',
};

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/** coturn "use-auth-secret" (TURN REST API) için kısa ömürlü kimlik bilgisi üretir. */
function getIceServers() {
  const servers = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ];
  if (TURN_SECRET && TURN_HOST) {
    const username = `${Math.floor(Date.now() / 1000) + TURN_TTL_SEC}:odrop`;
    const credential = crypto.createHmac('sha1', TURN_SECRET).update(username).digest('base64');
    const urls = [
      `turn:${TURN_HOST}:3478?transport=udp`,
      `turn:${TURN_HOST}:3478?transport=tcp`,
    ];
    if (TURN_TLS) urls.push(`turns:${TURN_HOST}:5349?transport=tcp`);
    servers.push({ urls: [`stun:${TURN_HOST}:3478`] });
    servers.push({ urls, username, credential });
  }
  return servers;
}

// --------------------------------------------------------------------------
// HTTP: statik dosyalar
// --------------------------------------------------------------------------
function sendFile(res, filePath, extraHeaders = {}) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const headers = {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Content-Length': stats.size,
      ...extraHeaders,
    };
    if (ext === '.exe' || ext === '.zip') {
      headers['Content-Disposition'] = `attachment; filename="${path.basename(filePath)}"`;
    }
    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer'); // davet token'ı başka sitelere sızmasın

  let reqPath = decodeURIComponent(req.url.split('?')[0]);

  if (reqPath === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, invites: !!OWNER_KEY, turn: !!(TURN_SECRET && TURN_HOST) }));
    return;
  }

  // Davet sayfası: /s/<token>
  if (/^\/s\/[A-Za-z0-9_-]+\/?$/.test(reqPath)) {
    sendFile(res, path.join(PUBLIC_DIR, 'send.html'), { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
    return;
  }
  if (reqPath === '/inbox' || reqPath === '/inbox/') {
    sendFile(res, path.join(PUBLIC_DIR, 'inbox.html'), { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
    return;
  }

  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(PUBLIC_DIR, reqPath);
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      sendFile(res, path.join(PUBLIC_DIR, 'index.html'));
      return;
    }
    sendFile(res, filePath);
  });
});

// --------------------------------------------------------------------------
// WebSocket: sinyalleşme
// --------------------------------------------------------------------------
const wss = new WebSocketServer({ server, maxPayload: 256 * 1024 });

const rooms = new Map();            // klasik QR odaları: roomId -> Map(clientId -> {ws, device})
const receivers = new Map();        // sahibin çevrimiçi alıcıları: clientId -> {ws, device, kind}
const pendingRequests = new Map();  // requestId -> {token, senderWs, senderName, files, timer}
const sessions = new Map();         // sessionId -> {senderWs, receiverWs}
const openRateLimit = new Map();    // ip -> {count, resetAt}

function send(ws, obj) {
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
}

function rateLimited(ip) {
  const now = Date.now();
  let entry = openRateLimit.get(ip);
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + 60 * 1000 };
    openRateLimit.set(ip, entry);
  }
  entry.count++;
  return entry.count > 30;
}

function receiverList() {
  return Array.from(receivers.values()).map((r) => ({ device: r.device, kind: r.kind }));
}

function broadcastToReceivers(obj, exceptWs = null) {
  for (const r of receivers.values()) {
    if (r.ws !== exceptWs) send(r.ws, obj);
  }
}

function publicInvite(inv) {
  return {
    token: inv.token,
    label: inv.label,
    createdAt: inv.createdAt,
    expiresAt: inv.expiresAt,
    usedAt: inv.usedAt,
    usedBy: inv.usedBy,
    status: inv.status,
  };
}

function pushInviteState() {
  const payload = {
    type: 'invites',
    invites: invites.listRecent().map(publicInvite),
    receivers: receiverList(),
  };
  broadcastToReceivers(payload);
}

function cleanText(s, max = 60) {
  return String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);
}

function endSession(sessionId, reason, fromWs) {
  const s = sessions.get(sessionId);
  if (!s) return;
  sessions.delete(sessionId);
  const other = fromWs === s.senderWs ? s.receiverWs : s.senderWs;
  send(other, { type: 'session-ended', sessionId, reason });
}

setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    try { ws.ping(); } catch (e) {}
  }
  invites.prune();
}, 30 * 1000);

wss.on('connection', (ws, req) => {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const clientId = crypto.randomBytes(6).toString('hex');
  let currentRoom = null;
  let isOwner = false;
  let senderToken = null;          // gönderen olarak açtığı davet
  let senderRequestId = null;
  const mySessions = new Set();

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      return;
    }

    switch (data.type) {
      // ------------------------------------------------------------------
      // Klasik QR oda modu (değişmedi, sadece TURN bilgisi eklendi)
      // ------------------------------------------------------------------
      case 'join-room': {
        currentRoom = cleanText(data.room, 12).toUpperCase();
        if (!currentRoom) currentRoom = crypto.randomBytes(4).toString('hex').slice(0, 5).toUpperCase();
        if (!rooms.has(currentRoom)) rooms.set(currentRoom, new Map());
        const roomClients = rooms.get(currentRoom);

        if (roomClients.size >= 2) {
          send(ws, { type: 'error', message: 'Oda dolu (Maksimum 2 cihaz)' });
          currentRoom = null;
          return;
        }

        roomClients.set(clientId, { ws, device: cleanText(data.device, 30) || 'Bilinmeyen Cihaz' });
        send(ws, { type: 'room-joined', room: currentRoom, clientId, isInitiator: roomClients.size === 1 });

        if (roomClients.size === 2) {
          const [first, second] = Array.from(roomClients.entries());
          const iceServers = getIceServers();
          send(first[1].ws, { type: 'peer-joined', peerId: second[0], peerDevice: second[1].device, shouldInitiate: true, iceServers });
          send(second[1].ws, { type: 'peer-joined', peerId: first[0], peerDevice: first[1].device, shouldInitiate: false, iceServers });
        }
        break;
      }

      case 'signal': {
        // Davet oturumu sinyali
        if (data.sessionId) {
          const s = sessions.get(data.sessionId);
          if (!s || (s.senderWs !== ws && s.receiverWs !== ws)) return;
          const target = s.senderWs === ws ? s.receiverWs : s.senderWs;
          send(target, { type: 'signal', sessionId: data.sessionId, data: data.data });
          return;
        }
        // Oda sinyali
        if (currentRoom && rooms.has(currentRoom)) {
          for (const [id, client] of rooms.get(currentRoom)) {
            if (id !== clientId) send(client.ws, { type: 'signal', from: clientId, data: data.data });
          }
        }
        break;
      }

      // ------------------------------------------------------------------
      // Sahip (alıcı) tarafı
      // ------------------------------------------------------------------
      case 'owner-auth': {
        if (!OWNER_KEY) {
          send(ws, { type: 'owner-error', code: 'disabled', message: 'Sunucuda ODROP_OWNER_KEY tanımlı değil.' });
          return;
        }
        if (rateLimited(ip) || !safeEqual(data.key || '', OWNER_KEY)) {
          send(ws, { type: 'owner-error', code: 'bad-key', message: 'Anahtar hatalı.' });
          return;
        }
        isOwner = true;
        receivers.set(clientId, {
          ws,
          device: cleanText(data.device, 30) || 'Alıcı',
          kind: data.kind === 'desktop' ? 'desktop' : 'browser',
        });
        send(ws, { type: 'owner-ok', clientId, ownerName: OWNER_NAME, iceServers: getIceServers() });
        pushInviteState();
        break;
      }

      case 'invite-create': {
        if (!isOwner) return;
        try {
          const inv = invites.create({ ttlMinutes: data.ttlMinutes, label: cleanText(data.label, 40) });
          send(ws, { type: 'invite-created', invite: publicInvite({ ...inv, status: 'active' }), reqId: data.reqId });
          pushInviteState();
        } catch (e) {
          send(ws, { type: 'owner-error', code: 'invite-failed', message: e.message, reqId: data.reqId });
        }
        break;
      }

      case 'invite-revoke': {
        if (!isOwner) return;
        invites.revoke(String(data.token || ''));
        pushInviteState();
        break;
      }

      case 'invite-list': {
        if (!isOwner) return;
        pushInviteState();
        break;
      }

      case 'transfer-accept':
      case 'transfer-reject': {
        if (!isOwner) return;
        const r = pendingRequests.get(data.requestId);
        if (!r) {
          send(ws, { type: 'request-closed', requestId: data.requestId, reason: 'gone' });
          return;
        }
        clearTimeout(r.timer);
        pendingRequests.delete(data.requestId);
        broadcastToReceivers({ type: 'request-closed', requestId: data.requestId, reason: 'handled' }, ws);

        if (data.type === 'transfer-reject') {
          send(r.senderWs, { type: 'transfer-rejected' });
          return;
        }

        const check = invites.check(r.token);
        if (check.error) {
          send(r.senderWs, { type: 'invite-error', code: check.error });
          send(ws, { type: 'request-closed', requestId: data.requestId, reason: check.error });
          return;
        }
        invites.consume(r.token, r.senderName);
        pushInviteState();

        const sessionId = crypto.randomBytes(8).toString('hex');
        sessions.set(sessionId, { senderWs: r.senderWs, receiverWs: ws });
        mySessions.add(sessionId);
        if (r.senderWs._odropSessions) r.senderWs._odropSessions.add(sessionId);

        const iceServers = getIceServers();
        const me = receivers.get(clientId);
        send(ws, { type: 'session-start', sessionId, requestId: data.requestId, shouldInitiate: false, senderName: r.senderName, files: r.files, iceServers });
        send(r.senderWs, { type: 'transfer-accepted', sessionId, shouldInitiate: true, peerDevice: me ? me.device : 'Alıcı', iceServers });
        break;
      }

      // ------------------------------------------------------------------
      // Gönderen (davetli) tarafı
      // ------------------------------------------------------------------
      case 'invite-open': {
        if (rateLimited(ip)) {
          send(ws, { type: 'invite-error', code: 'rate' });
          return;
        }
        const check = invites.check(data.token);
        if (check.error) {
          send(ws, { type: 'invite-error', code: check.error });
          return;
        }
        senderToken = check.invite.token;
        ws._odropSessions = mySessions;
        send(ws, {
          type: 'invite-ok',
          ownerName: OWNER_NAME,
          expiresAt: check.invite.expiresAt,
          receiversOnline: receivers.size,
        });
        break;
      }

      case 'transfer-request': {
        if (!senderToken) return;
        const check = invites.check(senderToken);
        if (check.error) {
          send(ws, { type: 'invite-error', code: check.error });
          return;
        }
        if (receivers.size === 0) {
          send(ws, { type: 'invite-error', code: 'offline' });
          return;
        }
        // Aynı davet için aynı anda yalnızca bir bekleyen istek
        for (const [rid, r] of pendingRequests) {
          if (r.token === senderToken) {
            clearTimeout(r.timer);
            pendingRequests.delete(rid);
            broadcastToReceivers({ type: 'request-closed', requestId: rid, reason: 'replaced' });
          }
        }
        const files = (Array.isArray(data.files) ? data.files : []).slice(0, 500).map((f) => ({
          name: cleanText(f.name, 200),
          size: Math.max(0, Number(f.size) || 0),
          type: cleanText(f.type, 80),
        }));
        if (files.length === 0) return;
        const senderName = cleanText(data.senderName, 40) || 'Misafir';
        const requestId = crypto.randomBytes(8).toString('hex');
        const timer = setTimeout(() => {
          if (pendingRequests.delete(requestId)) {
            send(ws, { type: 'transfer-timeout' });
            broadcastToReceivers({ type: 'request-closed', requestId, reason: 'timeout' });
          }
        }, REQUEST_TIMEOUT_MS);
        pendingRequests.set(requestId, { token: senderToken, senderWs: ws, senderName, files, timer });
        senderRequestId = requestId;

        const totalSize = files.reduce((a, f) => a + f.size, 0);
        broadcastToReceivers({ type: 'transfer-request', requestId, senderName, files, totalSize, inviteLabel: check.invite.label });
        send(ws, { type: 'request-pending', receiversOnline: receivers.size });
        break;
      }

      case 'transfer-cancel': {
        if (senderRequestId && pendingRequests.has(senderRequestId)) {
          clearTimeout(pendingRequests.get(senderRequestId).timer);
          pendingRequests.delete(senderRequestId);
          broadcastToReceivers({ type: 'request-closed', requestId: senderRequestId, reason: 'cancelled' });
        }
        break;
      }

      case 'session-end': {
        if (mySessions.has(data.sessionId)) {
          mySessions.delete(data.sessionId);
          endSession(data.sessionId, cleanText(data.reason, 30) || 'done', ws);
        }
        break;
      }

      default:
        break;
    }
  });

  ws.on('close', () => {
    // Oda temizliği
    if (currentRoom && rooms.has(currentRoom)) {
      const roomClients = rooms.get(currentRoom);
      roomClients.delete(clientId);
      for (const [, client] of roomClients) send(client.ws, { type: 'peer-left' });
      if (roomClients.size === 0) rooms.delete(currentRoom);
    }
    // Alıcı temizliği
    if (isOwner) {
      receivers.delete(clientId);
      pushInviteState();
    }
    // Bekleyen istek temizliği
    if (senderRequestId && pendingRequests.has(senderRequestId)) {
      clearTimeout(pendingRequests.get(senderRequestId).timer);
      pendingRequests.delete(senderRequestId);
      broadcastToReceivers({ type: 'request-closed', requestId: senderRequestId, reason: 'cancelled' });
    }
    // Oturum temizliği
    for (const sid of mySessions) endSession(sid, 'disconnected', ws);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log('==================================================');
  console.log(`📡 ODrop Web (P2P AirDrop) Aktif!`);
  console.log(`   Yerel Ağ   : http://${localIp}:${PORT}`);
  console.log(`   Localhost  : http://localhost:${PORT}`);
  console.log(`   Davet modu : ${OWNER_KEY ? 'AÇIK (/inbox)' : 'KAPALI (ODROP_OWNER_KEY yok)'}`);
  console.log(`   TURN       : ${TURN_SECRET && TURN_HOST ? TURN_HOST : 'KAPALI (sadece STUN)'}`);
  console.log('==================================================');
});
