const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

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
};

// Get primary local IP for convenience
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// HTTP Server: Serves static assets
const server = http.createServer((req, res) => {
  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const filePath = path.join(PUBLIC_DIR, reqPath);

  // Security: prevent path traversal outside public
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA routing
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(indexPath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404);
          res.end('Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
        }
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        res.end('Server Error');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  });
});

// WebSocket Server: WebRTC Signaling
const wss = new WebSocketServer({ server });

// Map of roomId -> Set of WebSocket clients
const rooms = new Map();

wss.on('connection', (ws) => {
  let currentRoom = null;
  let clientId = Math.random().toString(36).substring(2, 9);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'join-room': {
          currentRoom = (data.room || '').trim().toUpperCase();
          if (!currentRoom) {
            currentRoom = Math.random().toString(36).substring(2, 7).toUpperCase();
          }

          if (!rooms.has(currentRoom)) {
            rooms.set(currentRoom, new Map());
          }

          const roomClients = rooms.get(currentRoom);

          // Allow max 2 peers per direct P2P room (e.g. PC & iPhone)
          if (roomClients.size >= 2) {
            ws.send(JSON.stringify({ type: 'error', message: 'Oda dolu (Maksimum 2 cihaz)' }));
            return;
          }

          roomClients.set(clientId, { ws, device: data.device || 'Bilinmeyen Cihaz' });

          // Send confirmation to joining client
          ws.send(JSON.stringify({
            type: 'room-joined',
            room: currentRoom,
            clientId: clientId,
            isInitiator: roomClients.size === 1
          }));

          // If there are now 2 clients in the room, notify them to start WebRTC handshake
          if (roomClients.size === 2) {
            const peers = Array.from(roomClients.entries());
            const [first, second] = peers;

            // Notify the initiator (1st client) to create WebRTC Offer
            first[1].ws.send(JSON.stringify({
              type: 'peer-joined',
              peerId: second[0],
              peerDevice: second[1].device,
              shouldInitiate: true
            }));

            // Notify 2nd client
            second[1].ws.send(JSON.stringify({
              type: 'peer-joined',
              peerId: first[0],
              peerDevice: first[1].device,
              shouldInitiate: false
            }));
          }
          break;
        }

        case 'signal': {
          // Relay WebRTC signals (offer, answer, candidate) to the other peer in the room
          if (currentRoom && rooms.has(currentRoom)) {
            const roomClients = rooms.get(currentRoom);
            for (const [id, client] of roomClients) {
              if (id !== clientId && client.ws.readyState === client.ws.OPEN) {
                client.ws.send(JSON.stringify({
                  type: 'signal',
                  from: clientId,
                  data: data.data
                }));
              }
            }
          }
          break;
        }

        default:
          break;
      }
    } catch (e) {
      console.error('[Signaling Error]', e);
    }
  });

  ws.on('close', () => {
    if (currentRoom && rooms.has(currentRoom)) {
      const roomClients = rooms.get(currentRoom);
      roomClients.delete(clientId);

      // Notify remaining peer that client left
      for (const [, client] of roomClients) {
        if (client.ws.readyState === client.ws.OPEN) {
          client.ws.send(JSON.stringify({ type: 'peer-left' }));
        }
      }

      if (roomClients.size === 0) {
        rooms.delete(currentRoom);
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log('==================================================');
  console.log(`📡 ODrop Web (P2P AirDrop) Aktif!`);
  console.log(`   Yerel Ağ   : http://${localIp}:${PORT}`);
  console.log(`   Localhost  : http://localhost:${PORT}`);
  console.log('==================================================');
});
