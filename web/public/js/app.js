/**
 * ODrop Web Controller — Clean & Convenient Tool Interface
 */

let p2p = null;
let ws = null;
let currentRoom = null;
let isConnected = false;
let receivedFilesCount = 0;

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function getFileIcon(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (['jpg', 'jpeg', 'png', 'heic', 'heif', 'dng', 'webp', 'gif'].includes(ext)) return '📸';
  if (['mov', 'mp4', 'm4v', 'mkv', 'avi'].includes(ext)) return '🎬';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'].includes(ext)) return '📄';
  if (['zip', 'rar', '7z'].includes(ext)) return '📦';
  return '📁';
}

function getDeviceName() {
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Mac/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows PC';
  return 'Bilgisayar';
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {}
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function copyText(text, msg = 'Bağlantı kopyalandı! 📋') {
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

function copyRoomLink() {
  const fullUrl = `${window.location.origin}/?room=${currentRoom}`;
  copyText(fullUrl, 'Oda bağlantısı kopyalandı! 📋');
}

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  const devEl = document.getElementById('device-label');
  if (devEl) devEl.textContent = `📱 Bu Cihaz: ${getDeviceName()}`;

  initTheme();
  initSignaling();
  initDropzone();
});

// Theme Toggle
function initTheme() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  const saved = localStorage.getItem('odrop-theme');
  if (saved === 'dark') {
    document.body.classList.add('dark-mode');
    btn.textContent = '☀️';
  }

  btn.onclick = () => {
    const isDark = document.body.classList.toggle('dark-mode');
    btn.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('odrop-theme', isDark ? 'dark' : 'light');
  };
}

// WebSocket Signaling
function initSignaling() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  ws = new WebSocket(wsUrl);

  p2p = new P2PManager((signalData) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'signal', data: signalData }));
    }
  });

  p2p.onConnectionStateChange = (state) => {
    updateConnectionUI(state === 'connected');
  };

  p2p.onProgress = (info) => {
    updateProgressUI(info);
  };

  p2p.onFileReceived = (fileData) => {
    playChime();
    showToast(`🎉 Dosya alındı: ${fileData.name}`);
    appendReceivedFile(fileData);
    hideProgressUI();
  };

  p2p.onError = (errMsg) => {
    showToast(`⚠️ ${errMsg}`);
  };

  ws.onopen = () => {
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
          document.getElementById('status-text').textContent = `${data.peerDevice} ile eşleşildi...`;
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
    setTimeout(initSignaling, 3000);
  };
}

function updateRoomUI(room) {
  const newUrl = `${window.location.origin}/?room=${room}`;
  window.history.replaceState({}, '', newUrl);

  const roomBtn = document.getElementById('room-code-btn');
  if (roomBtn) roomBtn.textContent = `✨ Oda: #${room}`;

  const linkInput = document.getElementById('room-link-input');
  if (linkInput) linkInput.value = newUrl;

  const qrImg = document.getElementById('qr-img');
  if (qrImg) {
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(newUrl)}&bgcolor=ffffff&color=09090b`;
  }
}

function updateConnectionUI(connected) {
  isConnected = connected;

  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  const dropzone = document.getElementById('dropzone');
  const mainText = document.getElementById('drop-main-text');
  const subText = document.getElementById('drop-sub-text');
  const radarIcon = document.getElementById('radar-icon');

  if (connected) {
    if (dot) dot.classList.add('connected');
    if (text) text.innerHTML = `<span style="color:#059669; font-weight:600;">🟢 P2P Bağlandı (Doğrudan & Kayıpsız)</span>`;
    if (dropzone) dropzone.classList.remove('disabled');
    if (mainText) mainText.textContent = 'Dosyaları Buraya Bırakın';
    if (subText) subText.textContent = 'veya galeriden fotoğraf/video seçmek için dokunun';
    if (radarIcon) radarIcon.textContent = '⚡';
    playChime();
    showToast('🚀 Cihazlar doğrudan birbirine bağlandı!');
  } else {
    if (dot) dot.classList.remove('connected');
    if (text) text.textContent = 'İkinci cihaz bekleniyor... (QR Kodu okutun)';
    if (dropzone) dropzone.classList.add('disabled');
    if (mainText) mainText.textContent = 'Önce iPhone ile Eşleşin';
    if (subText) subText.textContent = 'QR kodu okuttuktan sonra dosya seçebilirsiniz';
    if (radarIcon) radarIcon.textContent = '📡';
  }
}

function updateProgressUI(info) {
  const card = document.getElementById('progress-panel');
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
    const card = document.getElementById('progress-panel');
    if (card) card.style.display = 'none';
  }, 1200);
}

// Dropzone & File Pickers
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

function appendReceivedFile(file) {
  const list = document.getElementById('file-list');
  const empty = list.querySelector('.empty-state');
  if (empty) empty.remove();

  receivedFilesCount++;
  const countEl = document.getElementById('history-count');
  if (countEl) countEl.textContent = `${receivedFilesCount} Dosya`;

  const item = document.createElement('div');
  item.className = 'file-item';

  const icon = getFileIcon(file.name);

  item.innerHTML = `
    <div class="file-left">
      <div class="file-icon">${icon}</div>
      <div>
        <div class="file-name" title="${file.name}">${file.name}</div>
        <div class="file-meta">${formatBytes(file.size)} • ${file.date} • %100 Orijinal</div>
      </div>
    </div>
    <a href="${file.url}" download="${file.name}" class="btn-outline" style="padding: 5px 12px; font-size: 0.78rem;">
      Kaydet 💾
    </a>
  `;

  list.insertBefore(item, list.firstChild);
}
