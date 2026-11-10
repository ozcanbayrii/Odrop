/**
 * ODrop — Gelen Kutusu (sahip paneli)
 * Davet linki üretir, gelen istekleri onaylar, dosyaları P2P alır.
 * Chrome/Edge masaüstünde seçilen klasöre doğrudan diske yazar (RAM'de biriktirmez).
 */
(() => {
  const $ = (id) => document.getElementById(id);
  const KEY_STORE = 'odrop-owner-key';
  const MEMORY_WARN_BYTES = 1.5 * 1024 * 1024 * 1024;

  let ws = null;
  let ownerKey = ODrop.store(KEY_STORE) || '';
  let authed = false;
  let iceServers = null;
  let reconnectTimer = null;
  let invitesState = [];
  let receiversState = [];
  const requests = new Map(); // requestId -> request
  let activeRequestId = null;
  const sessions = new Map(); // sessionId -> {p2p}
  let recvCount = 0;

  // ------------------------------------------------------------ Kayıt klasörü (File System Access API)
  const fsSupported = typeof window.showDirectoryPicker === 'function';
  let dirHandle = null;

  function idb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('odrop-inbox', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function idbGet(key) {
    try {
      const db = await idb();
      return await new Promise((res) => {
        const r = db.transaction('kv').objectStore('kv').get(key);
        r.onsuccess = () => res(r.result);
        r.onerror = () => res(undefined);
      });
    } catch (e) { return undefined; }
  }
  async function idbSet(key, val) {
    try {
      const db = await idb();
      db.transaction('kv', 'readwrite').objectStore('kv').put(val, key);
    } catch (e) {}
  }

  async function dirPermission(request) {
    if (!dirHandle) return false;
    try {
      const opts = { mode: 'readwrite' };
      if ((await dirHandle.queryPermission(opts)) === 'granted') return true;
      if (request && (await dirHandle.requestPermission(opts)) === 'granted') return true;
    } catch (e) {}
    return false;
  }

  async function updateSaveUI() {
    const status = $('save-status');
    if (!fsSupported) {
      $('save-desc').textContent = 'Bu tarayıcı doğrudan klasöre yazmayı desteklemiyor. Dosyalar önce belleğe alınıp indirilir.';
      status.className = 'notice small';
      status.textContent = '⚠️ Birkaç GB\'lık videolarda bellek yetmeyebilir. Büyük dosyalar için Chrome/Edge (masaüstü) ya da ODrop Windows uygulamasını kullan.';
      return;
    }
    $('pick-dir-btn').classList.remove('hidden');
    $('save-desc').textContent = 'Bir klasör seç; gelen dosyalar parça parça doğrudan diske yazılır, boyut sınırı yoktur.';
    if (dirHandle && (await dirPermission(false))) {
      status.className = 'notice ok small';
      status.textContent = `✓ Kayıt klasörü: ${dirHandle.name}`;
    } else if (dirHandle) {
      status.className = 'notice info small';
      status.textContent = `Kayıt klasörü: ${dirHandle.name} (izin, ilk kabul ettiğinde tekrar istenecek)`;
    } else {
      status.className = 'notice small';
      status.textContent = 'Klasör seçilmedi. Seçmezsen dosyalar belleğe alınıp normal indirme olarak kaydedilir.';
    }
  }

  async function pickDir() {
    try {
      dirHandle = await window.showDirectoryPicker({ id: 'odrop-inbox', mode: 'readwrite', startIn: 'downloads' });
      await idbSet('dir', dirHandle);
    } catch (e) {}
    updateSaveUI();
  }

  function sanitizeName(name) {
    return (String(name || 'dosya').split(/[\\/]/).pop().replace(/[<>:"|?*\u0000-\u001f]/g, '_').trim() || 'dosya').slice(0, 200);
  }

  async function uniqueFileHandle(name) {
    const clean = sanitizeName(name);
    const dot = clean.lastIndexOf('.');
    const stem = dot > 0 ? clean.slice(0, dot) : clean;
    const ext = dot > 0 ? clean.slice(dot) : '';
    for (let i = 0; i < 1000; i++) {
      const candidate = i === 0 ? clean : `${stem}_${i}${ext}`;
      try {
        await dirHandle.getFileHandle(candidate);
      } catch (e) {
        if (e.name === 'NotFoundError') {
          return { handle: await dirHandle.getFileHandle(candidate, { create: true }), name: candidate };
        }
        throw e;
      }
    }
    throw new Error('Benzersiz dosya adı bulunamadı');
  }

  async function createDiskSink(meta) {
    if (!dirHandle || !(await dirPermission(false))) return null; // bellek modu
    const { handle, name } = await uniqueFileHandle(meta.name);
    const writable = await handle.createWritable();
    return {
      write: (buf) => writable.write(buf),
      close: async () => {
        await writable.close();
        return { savedAs: name, onDisk: true };
      },
      abort: async () => {
        try { await writable.abort(); } catch (e) {}
        try { await dirHandle.removeEntry(name); } catch (e) {}
      },
    };
  }

  // ------------------------------------------------------------ UI helpers
  function setStatus(online, text) {
    $('status-dot').classList.toggle('connected', online);
    $('status-text').textContent = text;
  }

  function fmtDate(ts) {
    return new Date(ts).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function inviteUrl(token) {
    return `${location.origin}/s/${token}`;
  }

  function renderReceivers() {
    const n = receiversState.length;
    const parts = receiversState.map((r) => (r.kind === 'desktop' ? '💻 ' : '🌐 ') + r.device);
    $('receivers-pill').textContent = n ? `Çevrimiçi: ${parts.join(', ')}` : 'Çevrimiçi alıcı yok';
  }

  const STATUS_LABEL = {
    active: ['Aktif', 'pill-green'],
    used: ['Kullanıldı', 'pill-gray'],
    expired: ['Süresi doldu', 'pill-yellow'],
    revoked: ['İptal edildi', 'pill-gray'],
  };

  function renderInvites() {
    const list = $('invite-list');
    list.innerHTML = '';
    const activeCount = invitesState.filter((i) => i.status === 'active').length;
    $('invite-count').textContent = `${activeCount} aktif`;
    if (!invitesState.length) {
      list.innerHTML = '<div class="empty-state">Henüz davet yok.</div>';
      return;
    }
    for (const inv of invitesState) {
      const [label, cls] = STATUS_LABEL[inv.status] || ['?', 'pill-gray'];
      const el = document.createElement('div');
      el.className = 'invite-item';
      let meta = `Oluşturuldu ${fmtDate(inv.createdAt)} · Bitiş ${fmtDate(inv.expiresAt)}`;
      if (inv.status === 'used') meta = `${ODrop.escapeHtml(inv.usedBy || 'Misafir')} kullandı · ${fmtDate(inv.usedAt)}`;
      el.innerHTML = `
        <div class="top">
          <span class="label">${ODrop.escapeHtml(inv.label || 'İsimsiz davet')}</span>
          <span class="pill ${cls}">${label}</span>
        </div>
        <div class="meta">${meta}</div>`;
      if (inv.status === 'active') {
        const row = document.createElement('div');
        row.className = 'btn-row';
        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn-outline';
        copyBtn.textContent = 'Linki Kopyala';
        copyBtn.onclick = () => ODrop.copy(inviteUrl(inv.token)).then(() => ODrop.toast('Davet linki kopyalandı 📋'));
        const revokeBtn = document.createElement('button');
        revokeBtn.className = 'btn-outline btn-danger';
        revokeBtn.textContent = 'İptal Et';
        revokeBtn.onclick = () => wsSend({ type: 'invite-revoke', token: inv.token });
        row.append(copyBtn, revokeBtn);
        el.appendChild(row);
      }
      list.appendChild(el);
    }
  }

  function showNewInvite(inv) {
    const url = inviteUrl(inv.token);
    $('new-invite').classList.remove('hidden');
    $('new-invite-url').value = url;
    $('new-invite-qr').src = typeof window.ODropQR === 'function' ? window.ODropQR(url) : '';
    $('copy-invite-btn').onclick = () => ODrop.copy(url).then(() => ODrop.toast('Davet linki kopyalandı 📋'));
    if (navigator.share) {
      $('share-invite-btn').classList.remove('hidden');
      $('share-invite-btn').onclick = () => navigator.share({ title: 'ODrop', text: 'Bana dosya göndermek için bu linki aç:', url }).catch(() => {});
    }
    ODrop.copy(url).then(() => ODrop.toast('Davet linki oluşturuldu ve kopyalandı 📋')).catch(() => {});
  }

  // ------------------------------------------------------------ İstek onayı
  function nextRequest() {
    if (activeRequestId && requests.has(activeRequestId)) return;
    const first = requests.keys().next();
    activeRequestId = first.done ? null : first.value;
    if (!activeRequestId) {
      $('request-overlay').classList.add('hidden');
      document.title = 'ODrop — Gelen Kutusu';
      return;
    }
    const r = requests.get(activeRequestId);
    $('req-title').textContent = `${r.senderName} dosya göndermek istiyor`;
    $('req-desc').textContent = `${r.files.length} dosya · toplam ${ODrop.formatBytes(r.totalSize)}${r.inviteLabel ? ` · Davet: ${r.inviteLabel}` : ''}`;
    const list = $('req-files');
    list.innerHTML = '';
    for (const f of r.files.slice(0, 100)) {
      const row = document.createElement('div');
      row.className = 'sel-item';
      row.innerHTML = `<span>${ODrop.fileIcon(f.name)}</span><span class="name">${ODrop.escapeHtml(f.name)}</span><span class="size">${ODrop.formatBytes(f.size)}</span>`;
      list.appendChild(row);
    }
    const warn = $('req-warn');
    if ((!fsSupported || !dirHandle) && r.totalSize > MEMORY_WARN_BYTES) {
      warn.classList.remove('hidden');
      warn.textContent = '⚠️ Dosyalar büyük ve kayıt klasörü seçili değil; tarayıcı belleği yetmeyebilir. Mümkünse Windows uygulamasından kabul et.';
    } else {
      warn.classList.add('hidden');
    }
    $('request-overlay').classList.remove('hidden');
    document.title = `📨 ${r.senderName} — ODrop`;
    ODrop.chime();
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      try { new Notification('ODrop: gelen dosya', { body: `${r.senderName}: ${r.files.length} dosya (${ODrop.formatBytes(r.totalSize)})` }); } catch (e) {}
    }
  }

  async function acceptActive() {
    const id = activeRequestId;
    if (!id) return;
    if (fsSupported && dirHandle) await dirPermission(true); // kullanıcı tıklaması içinde izin iste
    wsSend({ type: 'transfer-accept', requestId: id });
    requests.delete(id);
    activeRequestId = null;
    nextRequest();
  }

  function rejectActive() {
    const id = activeRequestId;
    if (!id) return;
    wsSend({ type: 'transfer-reject', requestId: id });
    requests.delete(id);
    activeRequestId = null;
    nextRequest();
  }

  // ------------------------------------------------------------ Oturum (alım)
  function startSession(m) {
    const p2p = new P2PManager(
      (signal) => wsSend({ type: 'signal', sessionId: m.sessionId, data: signal }),
      { iceServers: m.iceServers || iceServers, autoDownload: true, createSink: createDiskSink }
    );
    sessions.set(m.sessionId, { p2p, senderName: m.senderName, files: m.files });

    const panel = $('progress-panel');
    p2p.onProgress = (info) => {
      panel.style.display = 'block';
      $('progress-bar').style.width = `${info.progress}%`;
      $('progress-text').textContent = `${m.senderName}: ${info.name} (%${info.progress})`;
      $('progress-speed').textContent = info.speed;
    };
    p2p.onRouteInfo = (r) => {
      $('progress-route').textContent = r.relayed ? '🛰️ TURN röle üzerinden (uçtan uca şifreli)' : '⚡ Doğrudan P2P';
    };
    p2p.onFileReceived = (file) => {
      addReceived(file, m.senderName);
    };
    p2p.onBatchDone = () => {
      ODrop.chime();
      ODrop.toast(`🎉 ${m.senderName} gönderimi tamamladı`);
      setTimeout(() => (panel.style.display = 'none'), 1500);
    };
    p2p.onConnectionStateChange = (st) => {
      if (st === 'failed') ODrop.toast('⚠️ P2P bağlantı kurulamadı');
    };
    p2p.onError = (e) => ODrop.toast(`⚠️ ${e}`);
    p2p.init(false);
  }

  function addReceived(file, sender) {
    const list = $('recv-list');
    const empty = list.querySelector('.empty-state');
    if (empty) empty.remove();
    recvCount++;
    $('recv-count').textContent = `${recvCount} Dosya`;
    const item = document.createElement('div');
    item.className = 'file-item';
    const where = file.onDisk ? `📂 ${ODrop.escapeHtml(dirHandle ? dirHandle.name : '')}/${ODrop.escapeHtml(file.savedAs)}` : 'İndirilenler';
    item.innerHTML = `
      <div class="file-left">
        <div class="file-icon">${ODrop.fileIcon(file.name)}</div>
        <div>
          <div class="file-name" title="${ODrop.escapeHtml(file.name)}">${ODrop.escapeHtml(file.name)}</div>
          <div class="file-meta">${ODrop.formatBytes(file.size)} • ${ODrop.escapeHtml(sender)} • ${file.date} • ${where}</div>
        </div>
      </div>`;
    if (file.url) {
      const a = document.createElement('a');
      a.href = file.url;
      a.download = file.name;
      a.className = 'btn-outline';
      a.style.cssText = 'padding:5px 12px; font-size:0.78rem;';
      a.textContent = 'Kaydet 💾';
      item.appendChild(a);
    }
    list.insertBefore(item, list.firstChild);
  }

  // ------------------------------------------------------------ WebSocket
  function wsSend(obj) {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  }

  function connect() {
    clearTimeout(reconnectTimer);
    setStatus(false, 'Sunucuya bağlanıyor...');
    ws = new WebSocket(ODrop.wsUrl());
    ws.onopen = () => wsSend({ type: 'owner-auth', key: ownerKey, device: ODrop.deviceName() === 'Tarayıcı' ? 'Tarayıcı' : `${ODrop.deviceName()} (tarayıcı)`, kind: 'browser' });
    ws.onclose = () => {
      setStatus(false, 'Bağlantı koptu, yeniden deneniyor...');
      if (ownerKey) reconnectTimer = setTimeout(connect, 3000);
    };
    ws.onmessage = (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      switch (m.type) {
        case 'owner-ok':
          authed = true;
          iceServers = m.iceServers;
          ODrop.store(KEY_STORE, ownerKey);
          showMain();
          setStatus(true, `🟢 Gelen kutusu açık — davet linkleriyle gönderilen dosyaları bekliyor`);
          break;
        case 'owner-error':
          if (m.code === 'bad-key' || m.code === 'disabled') {
            ownerKey = '';
            ODrop.store(KEY_STORE, null);
            showLogin(m.message);
            ws.onclose = null;
            ws.close();
          } else {
            ODrop.toast(`⚠️ ${m.message}`);
          }
          break;
        case 'invites':
          invitesState = m.invites || [];
          receiversState = m.receivers || [];
          renderInvites();
          renderReceivers();
          break;
        case 'invite-created':
          showNewInvite(m.invite);
          break;
        case 'transfer-request':
          requests.set(m.requestId, m);
          nextRequest();
          break;
        case 'request-closed':
          if (requests.delete(m.requestId)) {
            if (activeRequestId === m.requestId) activeRequestId = null;
            if (m.reason === 'handled') ODrop.toast('İstek diğer cihazınızdan yanıtlandı.');
            if (m.reason === 'cancelled') ODrop.toast('Gönderen isteği iptal etti.');
            if (m.reason === 'timeout') ODrop.toast('İstek zaman aşımına uğradı.');
            nextRequest();
          }
          break;
        case 'session-start':
          startSession(m);
          break;
        case 'signal': {
          const s = sessions.get(m.sessionId);
          if (s) s.p2p.handleSignal(m.data);
          break;
        }
        case 'session-ended': {
          const s = sessions.get(m.sessionId);
          if (s) {
            sessions.delete(m.sessionId);
            setTimeout(() => s.p2p.cleanup(), 3000);
          }
          break;
        }
      }
    };
  }

  function showLogin(err) {
    $('view-login').classList.remove('hidden');
    $('view-main').classList.add('hidden');
    $('logout-btn').classList.add('hidden');
    const e = $('login-error');
    if (err) {
      e.textContent = err;
      e.classList.remove('hidden');
    } else {
      e.classList.add('hidden');
    }
  }

  function showMain() {
    $('view-login').classList.add('hidden');
    $('view-main').classList.remove('hidden');
    $('logout-btn').classList.remove('hidden');
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }

  // ------------------------------------------------------------ Init
  document.addEventListener('DOMContentLoaded', async () => {
    ODrop.initTheme();
    if (fsSupported) dirHandle = (await idbGet('dir')) || null;
    updateSaveUI();

    $('pick-dir-btn').onclick = pickDir;
    $('login-btn').onclick = () => {
      ownerKey = $('key-input').value.trim();
      if (!ownerKey) return;
      connect();
    };
    $('key-input').onkeydown = (e) => { if (e.key === 'Enter') $('login-btn').click(); };
    $('logout-btn').onclick = () => {
      ODrop.store(KEY_STORE, null);
      ownerKey = '';
      if (ws) { ws.onclose = null; ws.close(); }
      showLogin();
    };
    $('create-btn').onclick = () => {
      wsSend({ type: 'invite-create', ttlMinutes: Number($('inv-ttl').value), label: $('inv-label').value.trim() });
      $('inv-label').value = '';
    };
    $('req-accept').onclick = acceptActive;
    $('req-reject').onclick = rejectActive;

    if (ownerKey) {
      showMain();
      connect();
    } else {
      showLogin();
    }
  });
})();
