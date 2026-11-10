/** ODrop — Davet & Gelen Kutusu sayfalarının ortak yardımcıları */

const ODrop = (() => {
  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      if (val === null) localStorage.removeItem(key);
      else localStorage.setItem(key, val);
    } catch (e) { return null; }
  }

  function formatBytes(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  function fileIcon(name) {
    const ext = (String(name).split('.').pop() || '').toLowerCase();
    if (['jpg', 'jpeg', 'png', 'heic', 'heif', 'dng', 'webp', 'gif', 'tif', 'tiff'].includes(ext)) return '📸';
    if (['mov', 'mp4', 'm4v', 'mkv', 'avi', 'webm'].includes(ext)) return '🎬';
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'ppt', 'pptx'].includes(ext)) return '📄';
    if (['zip', 'rar', '7z'].includes(ext)) return '📦';
    if (['m4a', 'mp3', 'wav', 'aac', 'flac'].includes(ext)) return '🎵';
    return '📁';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  let toastTimer = null;
  function toast(msg, ms = 3200) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  }

  function chime() {
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

  function initTheme() {
    const btn = document.getElementById('theme-toggle');
    if (store('odrop-theme') === 'dark') {
      document.body.classList.add('dark-mode');
      if (btn) btn.textContent = '☀️';
    }
    if (btn) {
      btn.onclick = () => {
        const isDark = document.body.classList.toggle('dark-mode');
        btn.textContent = isDark ? '☀️' : '🌙';
        store('odrop-theme', isDark ? 'dark' : 'light');
      };
    }
  }

  function wsUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    return Promise.resolve();
  }

  function deviceName() {
    const ua = navigator.userAgent;
    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua)) return 'iPad';
    if (/Android/i.test(ua)) return 'Android';
    if (/Mac/i.test(ua)) return 'Mac';
    if (/Windows/i.test(ua)) return 'Windows PC';
    return 'Tarayıcı';
  }

  /** Ekranın kapanmasını engelle (destekleyen tarayıcılarda). */
  let wakeLock = null;
  async function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      } else if (!on && wakeLock) {
        await wakeLock.release();
        wakeLock = null;
      }
    } catch (e) {}
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && keepAwake._wanted) keepAwake(true);
  });
  const keepAwakeWrapper = (on) => { keepAwake._wanted = on; return keepAwake(on); };

  return { store, formatBytes, fileIcon, escapeHtml, toast, chime, initTheme, wsUrl, copy, deviceName, keepAwake: keepAwakeWrapper };
})();
