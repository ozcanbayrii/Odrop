/**
 * ODrop Web Controller — Multi-language (TR / EN) & WebRTC P2P
 */

const I18N = {
  tr: {
    pageTitle: "ODrop — Kayıpsız Dosya Aktarımı",
    btnWinDownload: "Windows İndir (.exe)",
    btnExeDl: "ODrop.exe İndir",
    linkZipDl: "ZIP paketi olarak indir",
    roomPrefix: "Oda:",
    statusWaiting: "İkinci cihaz bekleniyor... (QR Kodu okutun)",
    statusConnected: "🟢 P2P Bağlandı (Doğrudan & Kayıpsız)",
    devicePrefix: "📱 Bu Cihaz:",
    pairTitle: "Cihaz Bağlantısı",
    pairDesc: "Farklı ağlardaki iki cihazı bağlantı koduyla eşleştirin.",
    myCodeLabel: "Bu Cihazın Bağlantı Kodu",
    yourCodeLabel: "Bu Cihazın Bağlantı Kodu",
    btnCopyCode: "Kodu Kopyala",
    btnCopyLink: "Linki Paylaş",
    btnToggleQR: "QR Kod",
    btnShowQR: "QR Kod",
    qrScanHint: "Karşı taraf iPhone veya telefonunun kamerasıyla bu QR kodu okutarak anında bağlanabilir.",
    joinCodeLabel: "Veya Karşı Tarafın Kodunu Girin:",
    joinLabel: "Veya Karşı Tarafın Kodunu Girin:",
    btnJoin: "Bağlan",
    btnConnect: "Bağlan",
    toastCodeCopied: "Bağlantı kodu kopyalandı! 📋",
    btnCopy: "Kopyala",
    pillEncrypted: "Uçtan Uca Şifreli",
    pillP2P: "Sunucusuz P2P",
    pillDirect: "Doğrudan Aktarım",
    pillLossless: "Kayıpsız & Orijinal",
    pillCellular: "Mobil Veri / Wi-Fi Destekli",
    sendTitle: "Kayıpsız Dosya Gönder",
    sendDesc: "Fotoğraf, 4K video veya belgeleri sürükleyin ya da galeriden seçin.",
    dropWaiting: "Önce iPhone ile Eşleşin",
    dropWaitingSub: "QR kodu okuttuktan sonra dosya seçebilirsiniz",
    dropReady: "Dosyaları Buraya Bırakın",
    dropReadySub: "veya galeriden fotoğraf/video seçmek için dokunun",
    pillOriginal: "%100 Orijinal Kalite",
    historyTitle: "Alınan Dosyalar",
    historyEmpty: "Henüz dosya alınmadı. Karşı tarafın gönderdiği dosyalar doğrudan inecek ve burada listelenecektir.",
    emptyState: "Henüz dosya alınmadı. Karşı tarafın gönderdiği dosyalar doğrudan inecek ve burada listelenecektir.",
    desktopTitle: "Windows İçin ODrop Masaüstü Uygulaması",
    desktopDesc: "Tarayıcıyı açık tutmak zorunda kalmadan sürekli dosya almak isteyenler için; Windows Sistem Tepsisinde (System Tray) arka planda 7/24 sessizce çalışan, gelen tüm fotoğrafları onay beklemeden doğrudan <b>İndirilenler\\ODrop</b> klasörüne kaydeden ve Windows 10/11 bildirimi veren masaüstü sürümünü indirin.",
    pillPortable: "Sıfır Kurulum (Portable)",
    pillTray: "7/24 Arka Plan Tepsisi",
    pillAutoSave: "Doğrudan Klasöre Kaydetme",
    pillNotif: "Windows 10 / 11 Bildirimleri",
    btnZipDl: "ODrop İndir (.ZIP)",
    zipTag: "(Önerilen • v1.0)",
    linkExeDl: "Doğrudan .exe olarak indir",
    noInstall: "Kurulum gerektirmez",
    securityNotice: "🛡️ GitHub Releases üzerinden güvenli, hızlı ve uyarısız doğrudan indirme.",
    toastCopied: "Oda bağlantısı kopyalandı! 📋",
    toastPeerJoined: "bağlandı!",
    toastPeerLeft: "Cihaz bağlantısı kesildi.",
    toastPairFirst: "Lütfen önce iPhone ile QR kodu okutun!",
    toastReceived: "🎉 Dosya alındı: ",
    toastSent: "✓ Gönderildi",
    btnSave: "Kaydet 💾",
    fileUnit: "Dosya",
    sending: "Gönderiliyor",
    receiving: "Alınıyor",
    toastConnected: "🟢 Cihazlar bağlandı! Dosya gönderebilirsiniz.",
    btnDisconnect: "Ayrıl",
    dropActiveTitle: "Fotoğraf, 4K Video veya Dosya Seçin",
    dropActiveSub: "Galeriden seçmek veya dosya yüklemek için dokunun (Sıfır Kalite Kaybı)",
    btnSelectFiles: "Galeriden / Dosyalardan Seç",
    toastDisconnected: "Bağlantı sonlandırıldı. Yeni bir oda oluşturuldu."
  },
  en: {
    pageTitle: "ODrop — Lossless File Transfer",
    btnWinDownload: "Download Windows (.exe)",
    btnExeDl: "Download ODrop.exe",
    linkZipDl: "Download as ZIP package",
    toastConnected: "🟢 Devices connected! Ready to transfer files.",
    btnDisconnect: "Disconnect",
    dropActiveTitle: "Select Photos, 4K Videos, or Files",
    dropActiveSub: "Tap to browse gallery or upload files (100% Lossless Quality)",
    btnSelectFiles: "Select From Gallery / Files",
    toastDisconnected: "Connection closed. New room generated.",
    roomPrefix: "Room:",
    statusWaiting: "Waiting for second device... (Scan QR code)",
    statusConnected: "🟢 P2P Connected (Direct & Lossless)",
    devicePrefix: "📱 This Device:",
    pairTitle: "Device Connection",
    pairDesc: "Pair any two devices across different networks using a connection code.",
    myCodeLabel: "This Device's Connection Code",
    yourCodeLabel: "This Device's Connection Code",
    btnCopyCode: "Copy Code",
    btnCopyLink: "Share Link",
    btnToggleQR: "QR Code",
    btnShowQR: "QR Code",
    qrScanHint: "The other person can scan this QR code with their iPhone or phone camera to connect instantly.",
    joinCodeLabel: "Or Enter The Other Device's Code:",
    joinLabel: "Or Enter The Other Device's Code:",
    btnJoin: "Connect",
    btnConnect: "Connect",
    toastCodeCopied: "Connection code copied! 📋",
    btnCopy: "Copy",
    pillEncrypted: "End-to-End Encrypted",
    pillP2P: "Serverless P2P",
    pillDirect: "Direct Transfer",
    pillLossless: "Lossless & Original",
    pillCellular: "Cellular & Wi-Fi Ready",
    sendTitle: "Send Lossless Files",
    sendDesc: "Drag & drop photos, 4K videos, documents or choose from gallery.",
    dropWaiting: "Pair with iPhone First",
    dropWaitingSub: "You can select files after scanning the QR code",
    dropReady: "Drop Photos or Files Here",
    dropReadySub: "or tap to browse your photo library or files",
    pillOriginal: "100% Lossless Quality",
    historyTitle: "Received Files",
    historyEmpty: "No files received yet. Files sent from the connected device will download directly and appear here.",
    emptyState: "No files received yet. Files sent from the connected device will download directly and appear here.",
    desktopTitle: "ODrop Desktop App for Windows",
    desktopDesc: "For continuous background transfers without keeping a browser open: download the standalone desktop client running 24/7 in your Windows system tray, automatically saving all photos directly to <b>Downloads\\ODrop</b> with native notifications.",
    pillPortable: "Zero Install (Portable)",
    pillTray: "24/7 System Tray",
    pillAutoSave: "Direct Folder Save",
    pillNotif: "Windows 10 / 11 Notifications",
    btnZipDl: "Download ODrop (.ZIP)",
    zipTag: "(Recommended • v1.0)",
    linkExeDl: "Download direct .exe",
    noInstall: "No installation needed",
    securityNotice: "🛡️ Fast, secure, warning-free direct download powered by GitHub Releases.",
    toastCopied: "Room link copied! 📋",
    toastPeerJoined: "connected!",
    toastPeerLeft: "Device disconnected.",
    toastPairFirst: "Please pair your iPhone by scanning the QR code first!",
    toastReceived: "🎉 File received: ",
    toastSent: "✓ Sent",
    btnSave: "Save 💾",
    fileUnit: "Files",
    sending: "Sending",
    receiving: "Receiving"
  }
};

let currentLang = localStorage.getItem('odrop-lang') || 'tr';
let p2p = null;
let ws = null;
let currentRoom = null;
let isConnected = false;
let receivedFilesCount = 0;

function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) || (I18N['tr'][key]) || key;
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('odrop-lang', lang);
  document.documentElement.lang = lang;

  // Update Lang button text (shows the NEXT language you can switch to)
  const langBtn = document.getElementById('lang-toggle');
  if (langBtn) {
    langBtn.textContent = lang === 'tr' ? 'EN' : 'TR';
  }

  // Update all elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (el.tagName === 'TITLE') {
      document.title = val;
    } else if (key === 'desktopDesc') {
      el.innerHTML = val;
    } else {
      el.textContent = val;
    }
  });

  // Update room prefix if room is already generated
  if (currentRoom) {
    const roomBtn = document.getElementById('room-code-btn');
    if (roomBtn) roomBtn.textContent = `✨ ${t('roomPrefix')} #${currentRoom}`;
  }

  // Update device label
  const devEl = document.getElementById('device-label');
  if (devEl) devEl.textContent = `${t('devicePrefix')} ${getDeviceName()}`;

  // Update history count
  const countEl = document.getElementById('history-count');
  if (countEl) countEl.textContent = `${receivedFilesCount} ${t('fileUnit')}`;

  // Update dropzone & connection state text
  updateConnectionUI(isConnected, true);
}

function toggleLanguage() {
  const newLang = currentLang === 'tr' ? 'en' : 'tr';
  setLanguage(newLang);
}

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
  return currentLang === 'tr' ? 'Bilgisayar' : 'Computer';
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

function copyText(text, msg) {
  msg = msg || t('toastCopied');
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

function formatRoomCode(code) {
  const s = String(code || '').trim();
  if (s.length === 6) return `${s.slice(0, 3)} ${s.slice(3)}`;
  return s;
}

function copyRoomCode() {
  if (!currentRoom) return;
  copyText(formatRoomCode(currentRoom), t('toastCodeCopied'));
}

function copyRoomLink() {
  if (!currentRoom) return;
  const fullUrl = `${window.location.origin}/?room=${currentRoom}`;
  copyText(fullUrl, t('toastCopied'));
}

let currentPeerDevice = '';

function triggerFileInput() {
  const fi = document.getElementById('file-input');
  if (fi) fi.click();
}

function disconnectRoom() {
  if (p2p) p2p.cleanup();
  currentPeerDevice = '';
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'join-room', room: '', device: getDeviceName() }));
  }
  updateConnectionUI(false);
  showToast(t('toastDisconnected') || 'Bağlantı sonlandırıldı.');
}

function toggleQRFrame() {
  const c = document.getElementById('qr-container');
  if (!c) return;
  const isHidden = c.style.display === 'none' || !c.style.display;
  c.style.display = isHidden ? 'block' : 'none';
  const btn = document.getElementById('toggle-qr-btn');
  if (btn) btn.style.background = isHidden ? 'var(--bg-hover)' : '';
}

function joinRoomFromInput() {
  const input = document.getElementById('join-code-input');
  const btn = document.getElementById('join-btn');
  if (!input) return;
  const raw = input.value.trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (!raw || raw.length < 3) {
    showToast(currentLang === 'tr' ? 'Lütfen 6 haneli bağlantı kodunu girin.' : 'Please enter the 6-digit code.');
    return;
  }
  if (currentRoom && raw === currentRoom.toUpperCase()) {
    showToast(currentLang === 'tr' ? 'Zaten bu odadasınız.' : 'Already in this room.');
    return;
  }
  if (ws && ws.readyState === WebSocket.OPEN) {
    if (btn) {
      btn.textContent = currentLang === 'tr' ? 'Bağlanılıyor...' : 'Connecting...';
      btn.disabled = true;
      setTimeout(() => {
        if (btn) {
          btn.innerHTML = `<span data-i18n="btnConnect">${t('btnConnect')}</span> →`;
          btn.disabled = false;
        }
      }, 4000);
    }
    showToast(currentLang === 'tr' ? `Odaya bağlanılıyor: #${formatRoomCode(raw)}` : `Connecting to room: #${formatRoomCode(raw)}`);
    ws.send(JSON.stringify({
      type: 'join-room',
      room: raw,
      device: getDeviceName()
    }));
    input.value = '';
  }
}

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  setLanguage(currentLang);
  initTheme();
  initSignaling();
  initDropzone();

  const joinInput = document.getElementById('join-code-input');
  if (joinInput) {
    joinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') joinRoomFromInput();
    });
  }
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
    showToast(`${t('toastReceived')}${fileData.name}`);
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
          currentPeerDevice = data.peerDevice || 'Uzak Cihaz';
          showToast(`⚡ ${currentPeerDevice} ${t('toastPeerJoined')}`);
          const statusText = document.getElementById('status-text');
          if (statusText) statusText.textContent = `${currentPeerDevice} ${t('statusConnected')}`;
          p2p.setIceServers(data.iceServers);
          p2p.init(data.shouldInitiate);
          break;
        }

        case 'signal': {
          p2p.handleSignal(data.data);
          break;
        }

        case 'peer-left': {
          currentPeerDevice = '';
          showToast(t('toastPeerLeft'));
          updateConnectionUI(false);
          break;
        }

        case 'error': {
          showToast(`Error: ${data.message}`);
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
  const formatted = formatRoomCode(room);
  const newUrl = `${window.location.origin}/?room=${room}`;
  window.history.replaceState({}, '', newUrl);

  const displayEl = document.getElementById('display-room-code');
  if (displayEl) displayEl.textContent = formatted;

  const roomBtn = document.getElementById('room-code-btn');
  if (roomBtn) roomBtn.textContent = `✨ ${t('roomPrefix')} #${formatted}`;

  const linkInput = document.getElementById('room-link-input');
  if (linkInput) linkInput.value = newUrl;

  const qrImg = document.getElementById('qr-img');
  if (qrImg) {
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(newUrl)}&bgcolor=ffffff&color=09090b`;
  }
}

function updateConnectionUI(connected, isLangSwitch = false) {
  isConnected = connected;

  const viewConnect = document.getElementById('view-connect');
  const viewTransfer = document.getElementById('view-transfer');
  const remotePeerTitle = document.getElementById('remote-peer-title');
  const localPeerTitle = document.getElementById('local-peer-title');

  // Smoothly transition between Connect View and Active Transfer View
  if (viewConnect && viewTransfer) {
    if (connected) {
      viewConnect.style.display = 'none';
      viewTransfer.style.display = 'block';
    } else {
      viewConnect.style.display = 'block';
      viewTransfer.style.display = 'none';
    }
  }

  // Update peer device badges in transfer view
  if (remotePeerTitle) {
    const peerName = currentPeerDevice || t('remoteDevice') || 'Uzak Cihaz';
    remotePeerTitle.textContent = `📱 ${peerName}`;
  }
  if (localPeerTitle) {
    localPeerTitle.textContent = `💻 ${getDeviceName()}`;
  }

  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  const dropzone = document.getElementById('dropzone');
  const mainText = document.getElementById('drop-main-text');
  const subText = document.getElementById('drop-sub-text');
  const radarIcon = document.getElementById('radar-icon');

  if (connected) {
    if (dot) dot.classList.add('connected');
    if (text) text.innerHTML = `<span style="color:#059669; font-weight:600;">${t('statusConnected')}</span>`;
    if (dropzone) dropzone.classList.remove('disabled');
    if (mainText) mainText.textContent = t('dropActiveTitle');
    if (subText) subText.textContent = t('dropActiveSub');
    if (radarIcon) radarIcon.textContent = '📁';
    if (!isLangSwitch) {
      playChime();
      showToast(t('toastConnected') || '🟢 Cihazlar bağlandı! Dosya gönderebilirsiniz.');
    }
  } else {
    if (dot) dot.classList.remove('connected');
    if (text) text.textContent = t('statusWaiting');
    if (dropzone) dropzone.classList.add('disabled');
    if (mainText) mainText.textContent = t('dropWaiting');
    if (subText) subText.textContent = t('dropWaitingSub');
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

  const action = info.direction === 'send' ? t('sending') : t('receiving');
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
      showToast(t('toastPairFirst'));
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
      showToast(t('toastPairFirst'));
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
      showToast(`${t('toastSent')} [${i + 1}/${files.length}]: ${file.name}`);
    } catch (err) {
      showToast(`Error: ${file.name}`);
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
  if (countEl) countEl.textContent = `${receivedFilesCount} ${t('fileUnit')}`;

  const item = document.createElement('div');
  item.className = 'file-item';

  const icon = getFileIcon(file.name);

  item.innerHTML = `
    <div class="file-left">
      <div class="file-icon">${icon}</div>
      <div>
        <div class="file-name" title="${file.name}">${file.name}</div>
        <div class="file-meta">${formatBytes(file.size)} • ${file.date} • ${t('pillOriginal')}</div>
      </div>
    </div>
    <a href="${file.url}" download="${file.name}" class="btn-outline" style="padding: 5px 12px; font-size: 0.78rem;">
      ${t('btnSave')}
    </a>
  `;

  list.insertBefore(item, list.firstChild);
}
