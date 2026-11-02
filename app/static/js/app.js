let systemInfo = null;
let ws = null;

// Initialize on DOM Load
document.addEventListener("DOMContentLoaded", () => {
  fetchInfo();
  fetchFiles();
  initWebSocket();
  initDropzone();
  initTabs();
});

// Toast message helper
function showToast(message) {
  const toast = document.getElementById("copy-toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

// Copy to clipboard helper
function copyToClipboard(text, msg = "Adres panoya kopyalandı! 📋") {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => showToast(msg));
  } else {
    const input = document.createElement("input");
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
    showToast(msg);
  }
}

// Fetch System Info
async function fetchInfo() {
  try {
    const res = await fetch("/api/info");
    systemInfo = await res.json();
    renderInfo();
  } catch (err) {
    console.error("Info error:", err);
  }
}

// Render System Info
function renderInfo() {
  if (!systemInfo) return;

  // Device Name
  const devEl = document.getElementById("device-name");
  if (devEl) devEl.textContent = systemInfo.device_name;

  // Active address
  const activeUrl = systemInfo.tunnel_url || systemInfo.local_url;
  const activeUploadUrl = `${activeUrl}/api/upload`;

  // Update IP pills
  const pillsEl = document.getElementById("ip-pills");
  if (pillsEl) {
    pillsEl.innerHTML = "";
    (systemInfo.all_ips || [systemInfo.primary_ip]).forEach(ip => {
      const pill = document.createElement("div");
      pill.className = "ip-pill";
      const fullAddr = `http://${ip}:${systemInfo.port}`;
      pill.innerHTML = `<span>📡 ${ip}:${systemInfo.port}</span>`;
      pill.title = "Kopyalamak için tıklayın";
      pill.onclick = () => copyToClipboard(fullAddr, `${fullAddr} kopyalandı!`);
      pillsEl.appendChild(pill);
    });
  }

  // Update QR Code Image
  const qrImg = document.getElementById("qr-image");
  if (qrImg) {
    // Generate QR for the web setup/upload page
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(activeUrl)}&bgcolor=ffffff&color=0f172a`;
    qrImg.alt = "ODrop QR Code";
  }

  // Update Shortcut Setup Instructions URLs
  const snippet = document.getElementById("instruction-url-snippet");
  if (snippet) {
    snippet.textContent = activeUploadUrl;
  }

  // Update Tunnel Status Card
  const tunnelStatusEl = document.getElementById("tunnel-status-text");
  const tunnelBtn = document.getElementById("tunnel-toggle-btn");
  const tunnelUrlBox = document.getElementById("tunnel-url-box");

  if (systemInfo.tunnel_running && systemInfo.tunnel_url) {
    if (tunnelStatusEl) tunnelStatusEl.innerHTML = `<span style="color:#34d399">🟢 Aktif (İnternet Dış Ağ Erişimi Açık)</span>`;
    if (tunnelBtn) tunnelBtn.textContent = "Tüneli Kapat";
    if (tunnelUrlBox) {
      tunnelUrlBox.style.display = "block";
      document.getElementById("tunnel-public-url").textContent = systemInfo.tunnel_url;
    }
  } else {
    if (tunnelStatusEl) tunnelStatusEl.innerHTML = `<span style="color:#94a3b8">⚪ Kapalı (Yalnızca Aynı Wi-Fi Ağı)</span>`;
    if (tunnelBtn) tunnelBtn.textContent = "Dış Ağ Tünelini Başlat";
    if (tunnelUrlBox) tunnelUrlBox.style.display = "none";
  }
}

// Fetch Files
async function fetchFiles() {
  try {
    const res = await fetch("/api/files");
    const data = await res.json();
    renderFileList(data.files || []);
  } catch (err) {
    console.error("Files error:", err);
  }
}

// Render File List
function renderFileList(files) {
  const container = document.getElementById("file-list-container");
  if (!container) return;

  if (!files || files.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span>📥</span>
        <p>Henüz aktarılan dosya yok.</p>
        <p style="font-size:0.8rem; margin-top:4px;">iPhone'unuzdan Kestirme veya yukarıdaki alandan dosya gönderin.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = "";
  files.forEach(file => {
    container.appendChild(createFileItemElement(file));
  });
}

function createFileItemElement(file) {
  const item = document.createElement("div");
  item.className = "file-item";

  const iconMap = {
    photo: "📸",
    video: "🎬",
    document: "📄",
    audio: "🎵",
    archive: "📦",
    other: "📁"
  };
  const icon = iconMap[file.category] || "📁";
  const badgeClass = `badge-${file.category || "other"}`;

  item.innerHTML = `
    <div class="file-meta">
      <div class="file-icon-badge ${badgeClass}">${icon}</div>
      <div class="file-info">
        <div class="file-name" title="${file.name}">${file.name}</div>
        <div class="file-subtext">
          <span>${file.formatted_size}</span>
          <span>•</span>
          <span>${file.timestamp}</span>
          ${file.speed && file.speed !== "-" ? `<span>•</span><span style="color:#38bdf8">${file.speed}</span>` : ""}
        </div>
      </div>
    </div>
    <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;" onclick="openFolder()">
      Aç ↗
    </button>
  `;

  return item;
}

// WebSocket Setup
function initWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log("[WS] Connected to ODrop server");
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.event === "file_received") {
        onNewFileReceived(msg.data);
      } else if (msg.event === "tunnel_updated") {
        fetchInfo();
      }
    } catch (err) {
      console.error("[WS] Parse error:", err);
    }
  };

  ws.onclose = () => {
    console.log("[WS] Disconnected, retrying in 3s...");
    setTimeout(initWebSocket, 3000);
  };
}

function onNewFileReceived(file) {
  const container = document.getElementById("file-list-container");
  if (!container) return;

  const empty = container.querySelector(".empty-state");
  if (empty) {
    container.innerHTML = "";
  }

  const el = createFileItemElement(file);
  container.insertBefore(el, container.firstChild);
  showToast(`🎉 Yeni dosya alındı: ${file.name}`);
}

// Open Folder Action
async function openFolder() {
  try {
    await fetch("/api/open-folder", { method: "POST" });
  } catch (err) {
    console.error("Open folder error:", err);
  }
}

// Toggle Tunnel Action
async function toggleTunnel() {
  const btn = document.getElementById("tunnel-toggle-btn");
  if (btn) btn.textContent = "İşlem yapılıyor...";
  try {
    await fetch("/api/tunnel/toggle", { method: "POST" });
    setTimeout(fetchInfo, 1000);
  } catch (err) {
    console.error("Tunnel toggle error:", err);
  }
}

// Dropzone & File Upload Logic
function initDropzone() {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");

  if (!dropzone || !fileInput) return;

  dropzone.onclick = () => fileInput.click();

  dropzone.ondragover = (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  };

  dropzone.ondragleave = () => {
    dropzone.classList.remove("dragover");
  };

  dropzone.ondrop = (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  fileInput.onchange = () => {
    if (fileInput.files && fileInput.files.length > 0) {
      uploadFiles(fileInput.files);
      fileInput.value = "";
    }
  };
}

function uploadFiles(fileList) {
  const progressBox = document.getElementById("upload-progress-box");
  const fill = document.getElementById("progress-fill");
  const status = document.getElementById("upload-status-text");

  if (progressBox) progressBox.style.display = "block";

  const totalFiles = fileList.length;
  let completed = 0;

  function uploadSingleFile(index) {
    if (index >= totalFiles) {
      if (status) status.textContent = `Tüm dosyalar başarıyla gönderildi! (${totalFiles} adet)`;
      if (fill) fill.style.width = "100%";
      setTimeout(() => {
        if (progressBox) progressBox.style.display = "none";
        fetchFiles();
      }, 2000);
      return;
    }

    const file = fileList[index];
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload", true);

    const startTime = Date.now();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        const overallPercent = Math.round(((index + (e.loaded / e.total)) / totalFiles) * 100);
        if (fill) fill.style.width = `${overallPercent}%`;

        const elapsedSec = (Date.now() - startTime) / 1000;
        const speedMb = elapsedSec > 0 ? (e.loaded / (1024 * 1024) / elapsedSec).toFixed(1) : 0;

        if (status) {
          status.textContent = `Gönderiliyor [${index + 1}/${totalFiles}]: ${file.name} (${percent}%) - ${speedMb} MB/s`;
        }
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        completed++;
        uploadSingleFile(index + 1);
      } else {
        if (status) status.textContent = `Hata: ${file.name} yüklenemedi.`;
      }
    };

    xhr.onerror = () => {
      if (status) status.textContent = "Bağlantı hatası oluştu.";
    };

    xhr.send(formData);
  }

  uploadSingleFile(0);
}

// Tab Switching
function initTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(btn => {
    btn.onclick = () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

      btn.classList.add("active");
      const targetId = btn.getAttribute("data-tab");
      const target = document.getElementById(targetId);
      if (target) target.classList.add("active");
    };
  });
}
