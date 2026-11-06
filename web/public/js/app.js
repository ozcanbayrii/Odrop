/**
 * ODrop Web Application Controller
 * Manages UI, WebSocket signaling, QR code generation, and P2P transfers.
 */

let p2p = null;
let ws = null;
let currentRoom = null;
let isConnected = false;

// Format file size
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

// Device detection
function getDeviceName() {
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return '📱 iPhone';
  if (/iPad/i.test(ua)) return '📱 iPad';
  if (/Android/i.test(ua)) return '📱 Android';
  if (/Mac/i.test(ua)) return '💻 Mac';
  if (/Windows/i.test(ua)) return '💻 Windows PC';
  return '💻 Bilgisayar';
}

// Audio Chime using Web Audio API (Zero external audio file dependency!)
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    // AudioContext might be blocked until user gesture
  }
}

// Toast notification
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Copy text helper
function copyText(text, msg = 'Kopyalandı! 📋') {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => showToast(msg));
  } else {
    const el = document.createElement('input');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast(msg);
  }
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('my-device-name').textContent = getDeviceName();

  initSignaling();
  initDropzone();
});

// Setup WebSocket Signaling
function initSignaling() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  ws = new WebSocket(wsUrl);

  p2p = new P2PManager((signalData) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'signal', data: signalData }));
    }
  });

  // P2P Event handlers
  p2p.onConnectionStateChange = (state) => {
    updateConnectionUI(state === 'connected');
  };

  p2p.onProgress = (info) => {
    updateProgressUI(info);
  };

  p2p.onFileReceived = (fileData) => {
    playChime();
    showToast(`🎉 Alındı: ${fileData.name}`);
    appendReceivedFile(fileData);
    hideProgressUI();
  };

  p2p.onError = (errMsg) => {
    showToast(`⚠️ ${errMsg}`);
  };

  ws.onopen = () => {
    console.log('[Signaling] WebSocket bağlandı.');

    // Check room from URL query
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');

    ws.send(JSON.stringify({
      type: 'join-room',
      room: roomParam || '',
      device: getDeviceName()
    }));
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'room-joined': {
          currentRoom = data.room;
          updateRoomUI(currentRoom);
          break;
        }

        case 'peer-joined': {
          showToast(`⚡ ${data.peerDevice} bağlandı!`);
          document.getElementById('conn-text').textContent = `${data.peerDevice} ile eşleşildi...`;
          p2p.init(data.shouldInitiate);
          break;
        }

        case 'signal': {
          p2p.handleSignal(data.data);
          break;
        }

        case 'peer-left': {
          showToast('Cihaz bağlantısı kesildi.');
          updateConnectionUI(false);
          break;
        }

        case 'error': {
          showToast(`Hata: ${data.message}`);
          break;
        }
      }
    } catch (e) {
      console.error('[Signaling Error]', e);
    }
  };

  ws.onclose = () => {
    console.log('[Signaling] Bağlantı kesildi, tekrar deneniyor...');
    setTimeout(initSignaling, 3000);
  };
}

// Update Room UI and QR Code
function updateRoomUI(room) {
  // Update browser URL without reloading
  const newUrl = `${window.location.origin}/?room=${room}`;
  window.history.replaceState({}, '', newUrl);

  const roomBtn = document.getElementById('room-code-btn');
  if (roomBtn) {
    roomBtn.textContent = `Oda: #${room}`;
    roomBtn.onclick = () => copyText(newUrl, 'Oda bağlantısı kopyalandı! 📋');
  }

  // Generate QR Code with free API
  const qrImg = document.getElementById('qr-img');
  if (qrImg) {
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(newUrl)}&bgcolor=ffffff&color=090d16`;
  }
}

// Update Connection UI
function updateConnectionUI(connected) {
  isConnected = connected;
  const bar = document.getElementById('connection-bar');
  const text = document.getElementById('conn-text');
  const dropzone = document.getElementById('dropzone');
  const dropTitle = document.getElementById('drop-title');

  if (connected) {
    bar.classList.add('connected');
    text.innerHTML = `<span style="color:#34d399">🟢 Doğrudan P2P Bağlandı (Sunucusuz & Kayıpsız)</span>`;
    dropzone.classList.remove('disabled');
    dropzone.classList.add('connected-active');
    dropTitle.textContent = 'Fotoğraf veya Dosyaları Buraya Bırakın';
    playChime();
    showToast('🚀 Doğrudan P2P bağlantı kuruldu!');
  } else {
    bar.classList.remove('connected');
    text.textContent = 'İkinci cihaz bekleniyor... (QR Kodu okutun)';
    dropzone.classList.add('disabled');
    dropzone.classList.remove('connected-active');
    dropTitle.textContent = 'Önce diğer cihazla bağlanın';
  }
}

// Progress UI
function updateProgressUI(info) {
  const card = document.getElementById('progress-card');
  const fill = document.getElementById('progress-bar');
  const text = document.getElementById('progress-text');
  const speed = document.getElementById('progress-speed');

  card.style.display = 'block';
  fill.style.width = `${info.progress}%`;

  const action = info.direction === 'send' ? 'Gönderiliyor' : 'Alınıyor';
  text.textContent = `${action}: ${info.name} (%${info.progress})`;
  speed.textContent = info.speed;
}

function hideProgressUI() {
  setTimeout(() => {
    const card = document.getElementById('progress-card');
    if (card) card.style.display = 'none';
  }, 1200);
}

// Dropzone & File Sending Logic
function initDropzone() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');

  dropzone.onclick = () => {
    if (!isConnected) {
      showToast('Lütfen önce iPhone ile QR kodu okutun!');
      return;
    }
    fileInput.click();
  };

  dropzone.ondragover = (e) => {
    e.preventDefault();
    if (isConnected) dropzone.classList.add('dragover');
  };

  dropzone.ondragleave = () => {
    dropzone.classList.remove('dragover');
  };

  dropzone.ondrop = (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (!isConnected) {
      showToast('Lütfen önce iPhone ile QR kodu okutun!');
      return;
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      sendFilesBatch(Array.from(e.dataTransfer.files));
    }
  };

  fileInput.onchange = () => {
    if (fileInput.files && fileInput.files.length > 0) {
      sendFilesBatch(Array.from(fileInput.files));
      fileInput.value = '';
    }
  };
}

// Batch file sender
async function sendFilesBatch(files) {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      await p2p.sendFile(file, (info) => {
        updateProgressUI(info);
      });
      showToast(`✓ Gönderildi [${i + 1}/${files.length}]: ${file.name}`);
    } catch (err) {
      showToast(`Hata: ${file.name} gönderilemedi.`);
      console.error(err);
      break;
    }
  }
  hideProgressUI();
}

// Append file to history table
function appendReceivedFile(file) {
  const container = document.getElementById('file-list');
  const empty = container.querySelector('.empty-state');
  if (empty) empty.remove();

  const item = document.createElement('div');
  item.className = 'file-item';

  item.innerHTML = `
    <div class="file-left">
      <div class="file-icon">📥</div>
      <div>
        <div class="file-name" title="${file.name}">${file.name}</div>
        <div class="file-subtext">${formatBytes(file.size)} • ${file.date}</div>
      </div>
    </div>
    <a href="${file.url}" download="${file.name}" class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;">
      Kaydet 💾
    </a>
  `;

  container.insertBefore(item, container.firstChild);
}
