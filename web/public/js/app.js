/**
 * ODrop Web Controller — ozcan.work Design System Integration
 */

let p2p = null;
let ws = null;
let currentRoom = null;
let isConnected = false;

// File counts
const counts = { all: 0, photo: 0, video: 0, document: 0 };

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function getFileCategory(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (['jpg', 'jpeg', 'png', 'heic', 'heif', 'dng', 'webp', 'gif'].includes(ext)) return 'photo';
  if (['mov', 'mp4', 'm4v', 'mkv', 'avi'].includes(ext)) return 'video';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'pages', 'numbers'].includes(ext)) return 'document';
  return 'other';
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
  // Device label
  const devName = getDeviceName();
  const devEl = document.getElementById('sidebar-device-label');
  if (devEl) devEl.textContent = `📱 Bu Cihaz: ${devName}`;

  initTheme();
  initSignaling();
  initDropzone();
  initSidebarFilters();
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

  p2p.onConnectionStateChange = (state) => {
    updateConnectionUI(state === 'connected');
  };

  p2p.onProgress = (info) => {
    updateProgressUI(info);
  };

  p2p.onFileReceived = (fileData) => {
    playChime();
    showToast(`🎉 Dosya alındı: ${fileData.name}`);
    appendFileCard(fileData);
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
          document.getElementById('sidebar-status-text').textContent = `${data.peerDevice} ile Bağlandı`;
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

// Room UI & QR Code
function updateRoomUI(room) {
  const newUrl = `${window.location.origin}/?room=${room}`;
  window.history.replaceState({}, '', newUrl);

  const roomBtn = document.getElementById('room-code-btn');
  if (roomBtn) {
    roomBtn.textContent = `✨ Oda: #${room}`;
    roomBtn.onclick = () => copyText(newUrl, 'Oda bağlantısı kopyalandı! 📋');
  }

  const cardRoomLabel = document.getElementById('card-room-label');
  if (cardRoomLabel) cardRoomLabel.textContent = `Oda: #${room}`;

  const roomLinkText = document.getElementById('room-link-text');
  if (roomLinkText) roomLinkText.textContent = newUrl;

  const qrImg = document.getElementById('qr-img');
  if (qrImg) {
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(newUrl)}&bgcolor=ffffff&color=111827`;
  }
}

// Connection State UI
function updateConnectionUI(connected) {
  isConnected = connected;

  const dot = document.getElementById('status-dot');
  const text = document.getElementById('sidebar-status-text');
  const dropzone = document.getElementById('dropzone');
  const dropTitle = document.getElementById('drop-title');
  const dropIcon = document.getElementById('drop-icon');

  if (connected) {
    if (dot) dot.classList.add('connected');
    if (text) text.innerHTML = `<span style="color:#059669; font-weight:700;">🟢 P2P Bağlandı</span>`;
    if (dropzone) dropzone.classList.remove('disabled');
    if (dropTitle) dropTitle.textContent = 'Fotoğraf veya Dosyaları Buraya Bırakın';
    if (dropIcon) dropIcon.textContent = '📂';
    playChime();
    showToast('🚀 Cihazlar doğrudan birbirine bağlandı!');
  } else {
    if (dot) dot.classList.remove('connected');
    if (text) text.textContent = 'İkinci Cihaz Bekleniyor';
    if (dropzone) dropzone.classList.add('disabled');
    if (dropTitle) dropTitle.textContent = 'Önce iPhone ile Eşleşin';
    if (dropIcon) dropIcon.textContent = '📡';
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

// Dropzone & Sending
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

// Append Received File as ozcan.work Feed Card
function appendFileCard(file) {
  const container = document.getElementById('files-stream-container');
  if (!container) return;

  const category = getFileCategory(file.name);
  counts.all++;
  if (counts[category] !== undefined) counts[category]++;
  updateCountsUI();

  const catNames = {
    photo: 'FOTOĞRAF',
    video: 'VİDEO',
    document: 'BELGE',
    other: 'DOSYA'
  };
  const catPills = {
    photo: 'tag-blue',
    video: 'tag-purple',
    document: 'tag-yellow',
    other: 'tag-green'
  };

  const card = document.createElement('article');
  card.className = `feed-card file-card file-type-${category}`;

  card.innerHTML = `
    <div class="card-top-bar">
      <div class="domain-badge">
        <div class="domain-icon">📥</div>
        <span>odrop.ozcan.work</span>
      </div>
      <a href="${file.url}" download="${file.name}" class="card-arrow" title="İndir">↓</a>
    </div>

    <div class="card-meta-line">
      <span class="meta-category">${catNames[category] || 'DOSYA'}</span>
      <span>•</span>
      <span>${formatBytes(file.size)}</span>
      <span>•</span>
      <span>${file.date}</span>
      <span>•</span>
      <span>P2P DOĞRUDAN AKTARIM</span>
    </div>

    <h3 class="card-heading">
      ${file.name} [ İNDİRİLDİ ]
    </h3>

    <p class="card-desc">
      Orijinal çözünürlük, renk profili ve tüm EXIF metadata verileriyle doğrudan iPhone'dan kayıpsız olarak alındı ve tarayıcınızın İndirilenler klasörüne kaydedildi.
    </p>

    <div class="tags-row" style="margin-top:12px;">
      <span class="tag-pill ${catPills[category] || 'tag-green'}">${catNames[category]}</span>
      <span class="tag-pill tag-green">KAYDEDİLDİ</span>
      <span class="tag-pill tag-blue">100% ORİJİNAL</span>
      <a href="${file.url}" download="${file.name}" class="btn-black" style="padding:4px 12px; font-size:0.75rem; margin-left:auto;">
        💾 Tekrar Kaydet
      </a>
    </div>
  `;

  container.insertBefore(card, container.firstChild);
}

function updateCountsUI() {
  const allEl = document.getElementById('count-all');
  const photoEl = document.getElementById('count-photos');
  const videoEl = document.getElementById('count-videos');
  const docEl = document.getElementById('count-docs');

  if (allEl) allEl.textContent = counts.all;
  if (photoEl) photoEl.textContent = counts.photo;
  if (videoEl) videoEl.textContent = counts.video;
  if (docEl) docEl.textContent = counts.document;
}

// Sidebar filtering
function initSidebarFilters() {
  const items = document.querySelectorAll('.sidebar-menu .sidebar-item[data-type]');
  items.forEach(item => {
    item.onclick = () => {
      items.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      const filter = item.getAttribute('data-type');
      const cards = document.querySelectorAll('.file-card');
      cards.forEach(card => {
        if (filter === 'all' || card.classList.contains(`file-type-${filter}`)) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    };
  });
}
