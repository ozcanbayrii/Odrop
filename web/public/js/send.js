/**
 * ODrop — Davet ile gönderim sayfası (/s/<token>)
 * Akış: davet kontrolü → dosya seçimi → istek → alıcı onayı → P2P aktarım → teslim onayı
 */
(() => {
  const L = {
    tr: {
      loading: 'Davet kontrol ediliyor...',
      pillLossless: '%100 Orijinal Kalite',
      pillP2P: 'Uçtan Uca Şifreli',
      yourName: 'Adın',
      namePh: 'Örn. Ayşe',
      pickGallery: 'Galeriden Seç',
      pickFiles: 'Dosyalardan Seç',
      sendBtn: 'Gönder',
      cancel: 'Vazgeç',
      keepOpen: 'Aktarım bitene kadar bu sayfayı açık tut ve ekranı kilitleme.',
      readyTitle: (o) => `Dosyalarını ${o} ile paylaş`,
      readyDesc: 'Seçtiğin fotoğraf ve videolar sıkıştırılmadan, doğrudan karşı cihaza aktarılır. Hiçbir sunucuda saklanmaz.',
      iosTip: '💡 iPhone\'da en iyi kalite için: galeriden seçerken ekranda <b>Seçenekler</b> görürsen biçimi <b>Güncel</b> (orijinal) yap. Video için "sıkıştırılıyor" yazısı çıkarsa, videoyu önce <b>Dosyalar</b>\'a kaydedip <b>Dosyalardan Seç</b> ile gönder.',
      offline: (o) => `${o} şu anda çevrimdışı görünüyor. Gönder'e bastığında çevrimiçi değilse tekrar denemen gerekecek.`,
      expires: (d) => `Bu davet ${d} tarihine kadar geçerli ve tek kullanımlık.`,
      nFiles: (n) => `${n} dosya`,
      invalid: {
        invalid: ['Davet bulunamadı', 'Bağlantı hatalı ya da eksik kopyalanmış olabilir. Linki tekrar kontrol et.'],
        expired: ['Davetin süresi dolmuş', 'Gönderdiğin kişiden yeni bir davet linki iste.'],
        used: ['Bu davet zaten kullanıldı', 'Davet linkleri tek kullanımlık. Yeni dosya göndermek için yeni bir link iste.'],
        revoked: ['Davet iptal edildi', 'Bu bağlantı sahibi tarafından iptal edilmiş.'],
        rate: ['Çok fazla deneme', 'Bir dakika bekleyip sayfayı yenile.'],
        conn: ['Sunucuya bağlanılamadı', 'İnternet bağlantını kontrol edip sayfayı yenile.'],
      },
      pendingTitle: 'Onay bekleniyor',
      pendingDesc: (o) => `${o} isteğini kabul ettiğinde aktarım otomatik başlayacak. Bu sayfayı kapatma.`,
      connecting: 'Güvenli bağlantı kuruluyor...',
      sending: 'Gönderiliyor...',
      routeDirect: '⚡ Doğrudan P2P bağlantı',
      routeRelay: '🛰️ Şifreli röle (TURN) üzerinden — veriler yine uçtan uca şifreli',
      stWaiting: 'Sırada',
      stSending: 'Gönderiliyor',
      stDone: '✓ Teslim edildi',
      stFail: '✗ Hata',
      doneTitle: 'Teslim edildi!',
      doneDesc: (n, s, o) => `${n} dosya (${s}) orijinal kalitesiyle teslim edildi ve ${o} tarafında kaydedildi.`,
      rejectedTitle: 'İstek reddedildi',
      rejectedDesc: 'Karşı taraf bu aktarımı kabul etmedi.',
      timeoutTitle: 'Yanıt gelmedi',
      timeoutDesc: 'Belirli süre içinde onay gelmedi. Sayfayı yenileyip tekrar deneyebilirsin.',
      offlineTitle: 'Alıcı çevrimdışı',
      offlineDesc: (o) => `${o} şu anda bağlı değil. Biraz sonra sayfayı yenileyip tekrar dene.`,
      failTitle: 'Aktarım yarıda kaldı',
      failDesc: (n) => `${n} dosya teslim edildi, kalanlar gönderilemedi. Yeni bir davet linkiyle kalanları tekrar gönderebilirsin.`,
      connFailTitle: 'Bağlantı kurulamadı',
      connFailDesc: 'İki cihaz arasında bağlantı kurulamadı. Farklı bir ağ (Wi-Fi / mobil veri) ile tekrar dene.',
      retry: 'Tekrar Dene',
      tooMany: 'Tek seferde en fazla 500 dosya seçebilirsin.',
    },
    en: {
      loading: 'Checking invite...',
      pillLossless: '100% Original Quality',
      pillP2P: 'End-to-End Encrypted',
      yourName: 'Your name',
      namePh: 'e.g. Alex',
      pickGallery: 'Photo Library',
      pickFiles: 'Browse Files',
      sendBtn: 'Send',
      cancel: 'Cancel',
      keepOpen: 'Keep this page open and the screen on until the transfer finishes.',
      readyTitle: (o) => `Send files to ${o}`,
      readyDesc: 'Your photos and videos are sent uncompressed, directly to the other device. Nothing is stored on any server.',
      iosTip: '💡 For best quality on iPhone: if you see <b>Options</b> in the photo picker, set the format to <b>Current</b> (original). If a video shows "compressing", save it to <b>Files</b> first and use <b>Browse Files</b>.',
      offline: (o) => `${o} appears to be offline right now. If still offline when you tap Send, you'll need to try again.`,
      expires: (d) => `This single-use invite is valid until ${d}.`,
      nFiles: (n) => `${n} file${n === 1 ? '' : 's'}`,
      invalid: {
        invalid: ['Invite not found', 'The link may be wrong or incomplete. Please check it again.'],
        expired: ['This invite has expired', 'Ask the person for a new invite link.'],
        used: ['This invite was already used', 'Invite links are single-use. Ask for a new one to send more files.'],
        revoked: ['Invite revoked', 'The owner has revoked this link.'],
        rate: ['Too many attempts', 'Wait a minute and refresh the page.'],
        conn: ['Could not reach the server', 'Check your internet connection and refresh.'],
      },
      pendingTitle: 'Waiting for approval',
      pendingDesc: (o) => `The transfer will start automatically once ${o} accepts. Don't close this page.`,
      connecting: 'Establishing secure connection...',
      sending: 'Sending...',
      routeDirect: '⚡ Direct P2P connection',
      routeRelay: '🛰️ Via encrypted relay (TURN) — data is still end-to-end encrypted',
      stWaiting: 'Queued',
      stSending: 'Sending',
      stDone: '✓ Delivered',
      stFail: '✗ Failed',
      doneTitle: 'Delivered!',
      doneDesc: (n, s, o) => `${n} file(s) (${s}) were saved on ${o}'s device in original quality.`,
      rejectedTitle: 'Request declined',
      rejectedDesc: 'The receiver did not accept this transfer.',
      timeoutTitle: 'No response',
      timeoutDesc: 'No approval was received in time. Refresh the page to try again.',
      offlineTitle: 'Receiver offline',
      offlineDesc: (o) => `${o} is not connected right now. Refresh and try again a bit later.`,
      failTitle: 'Transfer interrupted',
      failDesc: (n) => `${n} file(s) were delivered, the rest could not be sent. Use a new invite link to send the remaining files.`,
      connFailTitle: 'Could not connect',
      connFailDesc: 'A connection between the two devices could not be established. Try another network (Wi-Fi / mobile data).',
      retry: 'Try Again',
      tooMany: 'You can select up to 500 files at once.',
    },
  };

  let lang = ODrop.store('odrop-lang') || ((navigator.language || 'tr').toLowerCase().startsWith('tr') ? 'tr' : 'en');
  const T = (k) => L[lang][k];

  const token = (location.pathname.match(/^\/s\/([A-Za-z0-9_-]+)/) || [])[1] || '';
  const $ = (id) => document.getElementById(id);

  let ws = null;
  let ownerName = 'ODrop';
  let expiresAt = 0;
  let receiversOnline = 0;
  let selected = [];
  let state = 'loading';
  let sessionId = null;
  let p2p = null;
  let connectTimer = null;
  let deliveredCount = 0;
  let deliveredBytes = 0;
  let lastInvalidCode = null;

  // ---------------------------------------------------------------- UI
  const VIEWS = ['loading', 'invalid', 'ready', 'pending', 'transfer', 'result'];
  function show(view) {
    state = view;
    for (const v of VIEWS) $('view-' + v).classList.toggle('hidden', v !== view);
  }

  function applyLang() {
    document.documentElement.lang = lang;
    $('lang-toggle').textContent = lang === 'tr' ? 'EN' : 'TR';
    document.querySelectorAll('[data-t]').forEach((el) => {
      const v = T(el.getAttribute('data-t'));
      if (typeof v === 'string') el.textContent = v;
    });
    $('sender-name').placeholder = T('namePh');
    $('ready-title').textContent = T('readyTitle')(ownerName);
    $('ready-desc').textContent = T('readyDesc');
    $('ios-tip').innerHTML = T('iosTip');
    $('pending-title').textContent = T('pendingTitle');
    $('pending-desc').textContent = T('pendingDesc')(ownerName);
    if (expiresAt) {
      const d = new Date(expiresAt).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
      $('expiry-note').textContent = T('expires')(d);
    }
    updateOfflineNotice();
    renderSelected();
    if (lastInvalidCode) showInvalid(lastInvalidCode);
  }

  function updateOfflineNotice() {
    const n = $('offline-notice');
    if (receiversOnline > 0) {
      n.classList.add('hidden');
    } else {
      n.classList.remove('hidden');
      n.textContent = T('offline')(ownerName);
    }
  }

  function showInvalid(code) {
    lastInvalidCode = code;
    const [title, desc] = T('invalid')[code] || T('invalid').invalid;
    $('invalid-title').textContent = title;
    $('invalid-desc').textContent = desc;
    show('invalid');
  }

  function showResult(emoji, title, desc, withRetry = false) {
    $('result-emoji').textContent = emoji;
    $('result-title').textContent = title;
    $('result-desc').textContent = desc;
    const old = document.getElementById('retry-btn');
    if (old) old.remove();
    if (withRetry) {
      const b = document.createElement('button');
      b.id = 'retry-btn';
      b.className = 'btn-black btn-lg';
      b.style.cssText = 'width:100%; justify-content:center;';
      b.textContent = T('retry');
      b.onclick = () => location.reload();
      $('view-result').appendChild(b);
    }
    ODrop.keepAwake(false);
    show('result');
  }

  function renderSelected() {
    const list = $('selected-list');
    list.innerHTML = '';
    selected.forEach((f, i) => {
      const row = document.createElement('div');
      row.className = 'sel-item';
      row.innerHTML = `<span>${ODrop.fileIcon(f.name)}</span><span class="name" title="${ODrop.escapeHtml(f.name)}">${ODrop.escapeHtml(f.name)}</span><span class="size">${ODrop.formatBytes(f.size)}</span><button class="rm" aria-label="Kaldır">✕</button>`;
      row.querySelector('.rm').onclick = () => {
        selected.splice(i, 1);
        renderSelected();
      };
      list.appendChild(row);
    });
    const total = selected.reduce((a, f) => a + f.size, 0);
    $('selected-summary').classList.toggle('hidden', selected.length === 0);
    $('selected-count').textContent = T('nFiles')(selected.length);
    $('selected-size').textContent = ODrop.formatBytes(total);
    $('send-btn').disabled = selected.length === 0;
  }

  function addFiles(fileList) {
    const seen = new Set(selected.map((f) => `${f.name}|${f.size}|${f.lastModified}`));
    for (const f of fileList) {
      const key = `${f.name}|${f.size}|${f.lastModified}`;
      if (!seen.has(key)) {
        selected.push(f);
        seen.add(key);
      }
    }
    if (selected.length > 500) {
      selected = selected.slice(0, 500);
      ODrop.toast(T('tooMany'));
    }
    renderSelected();
  }

  // ---------------------------------------------------------------- Transfer list
  let totalBytes = 0;
  let overallStart = 0;
  function renderTransferList() {
    const list = $('transfer-list');
    list.innerHTML = '';
    selected.forEach((f, i) => {
      const row = document.createElement('div');
      row.className = 'sel-item';
      row.id = 'tx-' + i;
      row.innerHTML = `<span>${ODrop.fileIcon(f.name)}</span><span class="name">${ODrop.escapeHtml(f.name)}</span><span class="size">${ODrop.formatBytes(f.size)}</span><span class="state muted">${T('stWaiting')}</span>`;
      list.appendChild(row);
    });
  }
  function setRowState(i, text, color) {
    const el = document.querySelector(`#tx-${i} .state`);
    if (el) {
      el.textContent = text;
      el.style.color = color || '';
    }
  }
  function updateOverall(doneBytes) {
    const pct = totalBytes > 0 ? Math.min(100, Math.floor((doneBytes / totalBytes) * 100)) : 100;
    $('overall-bar').style.width = pct + '%';
    $('overall-text').textContent = `${pct}% · ${ODrop.formatBytes(doneBytes)} / ${ODrop.formatBytes(totalBytes)}`;
    const sec = (Date.now() - overallStart) / 1000;
    $('overall-speed').textContent = sec > 0 ? `${(doneBytes / 1048576 / sec).toFixed(1)} MB/s` : '';
  }

  async function runTransfer() {
    $('transfer-title').textContent = T('sending');
    totalBytes = selected.reduce((a, f) => a + f.size, 0);
    overallStart = Date.now();
    let baseDone = 0;
    for (let i = 0; i < selected.length; i++) {
      const f = selected[i];
      setRowState(i, T('stSending'));
      try {
        await p2p.sendFile(f, (info) => {
          setRowState(i, `${info.progress}%`);
          updateOverall(baseDone + info.done);
        });
        baseDone += f.size;
        deliveredCount++;
        deliveredBytes += f.size;
        setRowState(i, T('stDone'), 'var(--pill-green-text)');
        updateOverall(baseDone);
      } catch (err) {
        console.error(err);
        setRowState(i, T('stFail'), '#dc2626');
        finishSession('failed');
        showResult('⚠️', T('failTitle'), T('failDesc')(deliveredCount), false);
        return;
      }
    }
    p2p.sendBatchDone();
    finishSession('done');
    ODrop.chime();
    showResult('🎉', T('doneTitle'), T('doneDesc')(deliveredCount, ODrop.formatBytes(deliveredBytes), ownerName));
  }

  function finishSession(reason) {
    if (ws && ws.readyState === WebSocket.OPEN && sessionId) {
      ws.send(JSON.stringify({ type: 'session-end', sessionId, reason }));
    }
    setTimeout(() => p2p && p2p.cleanup(), 1500);
  }

  // ---------------------------------------------------------------- Signaling
  function connect() {
    ws = new WebSocket(ODrop.wsUrl());
    ws.onopen = () => ws.send(JSON.stringify({ type: 'invite-open', token }));
    ws.onerror = () => {};
    ws.onclose = () => {
      if (state === 'loading') showInvalid('conn');
      else if (state === 'pending') showResult('⚠️', T('invalid').conn[0], T('invalid').conn[1], true);
      // Aktarım sırasında WS koparsa P2P kanal etkilenmez.
    };
    ws.onmessage = (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      switch (m.type) {
        case 'invite-ok':
          ownerName = m.ownerName || ownerName;
          expiresAt = m.expiresAt;
          receiversOnline = m.receiversOnline;
          document.title = `ODrop — ${T('readyTitle')(ownerName)}`;
          applyLang();
          show('ready');
          break;
        case 'invite-error':
          if (m.code === 'offline') {
            showResult('😴', T('offlineTitle'), T('offlineDesc')(ownerName), true);
          } else if (state === 'transfer') {
            // oturum zaten başladıysa yok say
          } else {
            showInvalid(m.code);
          }
          break;
        case 'request-pending':
          show('pending');
          ODrop.keepAwake(true);
          break;
        case 'transfer-rejected':
          showResult('🙅', T('rejectedTitle'), T('rejectedDesc'));
          break;
        case 'transfer-timeout':
          showResult('⌛', T('timeoutTitle'), T('timeoutDesc'), true);
          break;
        case 'transfer-accepted':
          startP2P(m);
          break;
        case 'signal':
          if (p2p && m.sessionId === sessionId) p2p.handleSignal(m.data);
          break;
        case 'session-ended':
          if (state === 'transfer' && deliveredCount < selected.length && p2p && (!p2p.dataChannel || p2p.dataChannel.readyState !== 'open')) {
            showResult('⚠️', T('failTitle'), T('failDesc')(deliveredCount));
          }
          break;
      }
    };
  }

  function startP2P(m) {
    sessionId = m.sessionId;
    renderTransferList();
    $('transfer-title').textContent = T('connecting');
    $('transfer-route').textContent = '';
    show('transfer');
    ODrop.keepAwake(true);

    p2p = new P2PManager(
      (signal) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type: 'signal', sessionId, data: signal })),
      { iceServers: m.iceServers, requireAck: true, autoDownload: false }
    );
    let started = false;
    p2p.onConnectionStateChange = (st) => {
      if (st === 'connected' && !started) {
        started = true;
        clearTimeout(connectTimer);
        runTransfer();
      } else if (st === 'failed' && !started) {
        clearTimeout(connectTimer);
        finishSession('connect-failed');
        showResult('📵', T('connFailTitle'), T('connFailDesc'), false);
      }
    };
    p2p.onRouteInfo = (r) => {
      $('transfer-route').textContent = r.relayed ? T('routeRelay') : T('routeDirect');
    };
    p2p.onError = (e) => console.warn(e);
    p2p.init(true);

    connectTimer = setTimeout(() => {
      if (!started) {
        finishSession('connect-timeout');
        showResult('📵', T('connFailTitle'), T('connFailDesc'), false);
      }
    }, 45000);
  }

  // ---------------------------------------------------------------- Init
  document.addEventListener('DOMContentLoaded', () => {
    ODrop.initTheme();
    $('lang-toggle').onclick = () => {
      lang = lang === 'tr' ? 'en' : 'tr';
      ODrop.store('odrop-lang', lang);
      applyLang();
    };
    $('sender-name').value = ODrop.store('odrop-sender-name') || '';
    $('pick-gallery').onclick = () => $('input-gallery').click();
    $('pick-files').onclick = () => $('input-files').click();
    for (const id of ['input-gallery', 'input-files']) {
      $(id).onchange = (e) => {
        addFiles(Array.from(e.target.files || []));
        e.target.value = '';
      };
    }
    $('send-btn').onclick = () => {
      if (!selected.length || !ws || ws.readyState !== WebSocket.OPEN) return;
      const senderName = $('sender-name').value.trim();
      ODrop.store('odrop-sender-name', senderName);
      ws.send(JSON.stringify({
        type: 'transfer-request',
        senderName: senderName || (lang === 'tr' ? 'Misafir' : 'Guest'),
        files: selected.map((f) => ({ name: f.name, size: f.size, type: f.type })),
      }));
      $('send-btn').disabled = true;
    };
    $('cancel-btn').onclick = () => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'transfer-cancel' }));
      ODrop.keepAwake(false);
      $('send-btn').disabled = selected.length === 0;
      show('ready');
    };
    applyLang();
    if (!token) return showInvalid('invalid');
    connect();
  });
})();
