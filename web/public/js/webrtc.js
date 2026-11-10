/**
 * ODrop WebRTC P2P DataChannel Engine
 * STUN/TURN NAT traversal, chunked streaming, backpressure, lossless file transfer.
 *
 * Protokol (DataChannel):
 *   text  {action:'file-start', id, name, size, type, totalChunks}
 *   bin   ArrayBuffer parçaları (64 KB)
 *   text  {action:'file-end', id}
 *   text  {action:'file-saved', id, size, ok}   <- alıcı (yalnızca requireAck modunda gönderen bekler)
 *   text  {action:'batch-done'}                  <- gönderen tüm dosyaları bitirdi
 */

const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' }
];

const CHUNK_SIZE = 64 * 1024; // 64 KB per chunk
const BUFFER_HIGH_WATERMARK = 2 * 1024 * 1024; // 2 MB
const BUFFER_LOW_WATERMARK = 512 * 1024; // 512 KB

class P2PManager {
  constructor(sendSignalFn, options = {}) {
    this.sendSignal = sendSignalFn;
    this.peerConnection = null;
    this.dataChannel = null;
    this.isInitiator = false;
    this.iceServers = options.iceServers || DEFAULT_ICE_SERVERS;
    this.autoDownload = options.autoDownload !== false;
    this.requireAck = !!options.requireAck;

    /**
     * Opsiyonel: async (meta) => ({ write(ArrayBuffer), close() => fileData?, abort() })
     * Verilirse gelen dosya RAM'de toplanmaz, doğrudan bu hedefe (ör. diske) akar.
     */
    this.createSink = options.createSink || null;

    // Incoming file state
    this.currentIncomingFile = null;
    this.currentSink = null;
    this.receivedChunks = [];
    this.receivedBytes = 0;
    this.transferStartTime = 0;
    this._rxQueue = Promise.resolve();
    this._ackWaiters = new Map();

    // Event callbacks
    this.onConnectionStateChange = null;
    this.onProgress = null;
    this.onFileReceived = null;
    this.onBatchDone = null;
    this.onError = null;
    this.onRouteInfo = null;
  }

  setIceServers(servers) {
    if (Array.isArray(servers) && servers.length) this.iceServers = servers;
  }

  init(isInitiator) {
    this.isInitiator = isInitiator;
    this.cleanup();

    this.peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({ type: 'candidate', candidate: event.candidate });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection ? this.peerConnection.connectionState : 'closed';
      if (state === 'connected') this._reportRoute();
      if (this.onConnectionStateChange && state !== 'connected') {
        this.onConnectionStateChange(state);
      }
    };

    if (this.isInitiator) {
      this.dataChannel = this.peerConnection.createDataChannel('odropTransfer', { ordered: true });
      this.setupDataChannel(this.dataChannel);

      this.peerConnection.createOffer()
        .then((offer) => this.peerConnection.setLocalDescription(offer))
        .then(() => {
          this.sendSignal({ type: 'offer', sdp: this.peerConnection.localDescription });
        })
        .catch((err) => this.handleError('Offer oluşturulamadı', err));
    } else {
      this.peerConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel(this.dataChannel);
      };
    }
  }

  /** Bağlantının doğrudan mı (P2P) yoksa TURN üzerinden mi kurulduğunu bildirir. */
  async _reportRoute() {
    if (!this.onRouteInfo || !this.peerConnection) return;
    try {
      const stats = await this.peerConnection.getStats();
      let pair = null;
      stats.forEach((r) => {
        if (r.type === 'transport' && r.selectedCandidatePairId) pair = stats.get(r.selectedCandidatePairId);
      });
      if (!pair) {
        stats.forEach((r) => {
          if (r.type === 'candidate-pair' && (r.selected || (r.nominated && r.state === 'succeeded'))) pair = pair || r;
        });
      }
      const local = pair && stats.get(pair.localCandidateId);
      const remote = pair && stats.get(pair.remoteCandidateId);
      const relayed = (local && local.candidateType === 'relay') || (remote && remote.candidateType === 'relay');
      this.onRouteInfo({ relayed: !!relayed, local: local && local.candidateType, remote: remote && remote.candidateType });
    } catch (e) {}
  }

  setupDataChannel(channel) {
    channel.binaryType = 'arraybuffer';
    channel.bufferedAmountLowThreshold = BUFFER_LOW_WATERMARK;

    channel.onopen = () => {
      console.log('[WebRTC] DataChannel açıldı! P2P aktarım hazır.');
      if (this.onConnectionStateChange) this.onConnectionStateChange('connected');
    };

    channel.onclose = () => {
      console.log('[WebRTC] DataChannel kapandı.');
      for (const [, w] of this._ackWaiters) w.reject(new Error('Bağlantı kapandı'));
      this._ackWaiters.clear();
      if (this.currentSink) {
        try { this.currentSink.abort(); } catch (e) {}
        this.currentSink = null;
      }
      if (this.onConnectionStateChange) this.onConnectionStateChange('disconnected');
    };

    channel.onerror = (err) => {
      this.handleError('DataChannel hatası', err.error || err);
    };

    // Sıralı işleme: async disk yazımları sırayı bozmasın
    channel.onmessage = (event) => {
      const data = event.data;
      this._rxQueue = this._rxQueue
        .then(() => this.handleChannelMessage(data))
        .catch((err) => this.handleError('Alım hatası', err));
    };
  }

  async handleSignal(signal) {
    if (!this.peerConnection) return;
    try {
      if (signal.type === 'offer') {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        this.sendSignal({ type: 'answer', sdp: this.peerConnection.localDescription });
      } else if (signal.type === 'answer') {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      } else if (signal.type === 'candidate') {
        if (signal.candidate) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      }
    } catch (err) {
      this.handleError('Signal işleme hatası', err);
    }
  }

  _emitProgress(direction, name, size, done, startTime) {
    if (!this.onProgress) return;
    const progress = size > 0 ? Math.min(100, Math.round((done / size) * 100)) : 100;
    const elapsedSec = (Date.now() - startTime) / 1000;
    const speedMB = elapsedSec > 0 ? (done / (1024 * 1024) / elapsedSec).toFixed(1) : '0';
    this.onProgress({ direction, name, size, done, progress, speed: `${speedMB} MB/s` });
  }

  async handleChannelMessage(data) {
    if (typeof data === 'string') {
      let msg;
      try { msg = JSON.parse(data); } catch (e) { return; }

      if (msg.action === 'file-start') {
        this.currentIncomingFile = msg;
        this.receivedChunks = [];
        this.receivedBytes = 0;
        this.transferStartTime = Date.now();
        this.currentSink = this.createSink ? await this.createSink(msg) : null;
        this._emitProgress('receive', msg.name, msg.size, 0, this.transferStartTime);
      } else if (msg.action === 'file-end') {
        await this.finalizeIncomingFile();
      } else if (msg.action === 'file-saved') {
        const w = this._ackWaiters.get(msg.id);
        if (w) {
          this._ackWaiters.delete(msg.id);
          msg.ok === false ? w.reject(new Error(msg.error || 'Alıcı dosyayı kaydedemedi')) : w.resolve(msg);
        }
      } else if (msg.action === 'batch-done') {
        if (this.onBatchDone) this.onBatchDone();
      }
      return;
    }

    if (data instanceof ArrayBuffer && this.currentIncomingFile) {
      if (this.currentSink) {
        await this.currentSink.write(data);
      } else {
        this.receivedChunks.push(data);
      }
      this.receivedBytes += data.byteLength;
      this._emitProgress('receive', this.currentIncomingFile.name, this.currentIncomingFile.size, this.receivedBytes, this.transferStartTime);
    }
  }

  async finalizeIncomingFile() {
    const meta = this.currentIncomingFile;
    if (!meta) return;
    const sizeOk = this.receivedBytes === meta.size;
    let fileData = null;
    let error = null;

    try {
      if (!sizeOk) throw new Error(`Boyut uyuşmuyor (${this.receivedBytes}/${meta.size})`);

      if (this.currentSink) {
        fileData = (await this.currentSink.close()) || {};
        fileData = { name: meta.name, size: meta.size, ...fileData };
      } else {
        const blob = new Blob(this.receivedChunks, { type: meta.type || 'application/octet-stream' });
        fileData = { name: meta.name, size: meta.size, blob, url: URL.createObjectURL(blob) };
        if (this.autoDownload) {
          const a = document.createElement('a');
          a.href = fileData.url;
          a.download = fileData.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      }
      fileData.date = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } catch (err) {
      error = err;
      if (this.currentSink) {
        try { await this.currentSink.abort(); } catch (e) {}
      }
    }

    this._sendControl({ action: 'file-saved', id: meta.id, size: this.receivedBytes, ok: !error, error: error ? error.message : undefined });

    this.currentIncomingFile = null;
    this.currentSink = null;
    this.receivedChunks = [];
    this.receivedBytes = 0;

    if (error) {
      this.handleError(`${meta.name} kaydedilemedi`, error);
    } else if (this.onFileReceived) {
      this.onFileReceived(fileData);
    }
  }

  _sendControl(obj) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try { this.dataChannel.send(JSON.stringify(obj)); } catch (e) {}
    }
  }

  sendBatchDone() {
    this._sendControl({ action: 'batch-done' });
  }

  // Send a file with Backpressure Control
  async sendFile(file, onFileProgress) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('P2P bağlantısı aktif değil.');
    }
    const channel = this.dataChannel;

    const id = Math.random().toString(36).substring(2, 11);
    channel.send(JSON.stringify({
      action: 'file-start',
      id,
      name: file.name,
      size: file.size,
      type: file.type,
      totalChunks: Math.ceil(file.size / CHUNK_SIZE)
    }));

    let ackPromise = null;
    if (this.requireAck) {
      ackPromise = new Promise((resolve, reject) => this._ackWaiters.set(id, { resolve, reject }));
    }

    let offset = 0;
    const startTime = Date.now();

    const waitForBuffer = () => new Promise((resolve, reject) => {
      if (channel.bufferedAmount <= BUFFER_LOW_WATERMARK) return resolve();
      const onLow = () => { cleanupL(); resolve(); };
      const onClose = () => { cleanupL(); reject(new Error('Bağlantı koptu')); };
      const cleanupL = () => {
        channel.removeEventListener('bufferedamountlow', onLow);
        channel.removeEventListener('close', onClose);
      };
      channel.addEventListener('bufferedamountlow', onLow);
      channel.addEventListener('close', onClose);
    });

    // Bir sonraki parçayı gönderirken okumayı önceden başlat (pipeline)
    let nextRead = file.slice(0, CHUNK_SIZE).arrayBuffer();
    while (offset < file.size) {
      if (channel.readyState !== 'open') throw new Error('Bağlantı koptu');
      if (channel.bufferedAmount >= BUFFER_HIGH_WATERMARK) await waitForBuffer();

      const buffer = await nextRead;
      const nextOffset = offset + buffer.byteLength;
      if (nextOffset < file.size) nextRead = file.slice(nextOffset, nextOffset + CHUNK_SIZE).arrayBuffer();
      channel.send(buffer);
      offset = nextOffset;

      if (onFileProgress) {
        const progress = Math.min(100, Math.round((offset / file.size) * 100));
        const elapsedSec = (Date.now() - startTime) / 1000;
        const speedMB = elapsedSec > 0 ? (offset / (1024 * 1024) / elapsedSec).toFixed(1) : '0';
        onFileProgress({ direction: 'send', name: file.name, size: file.size, done: offset, progress, speed: `${speedMB} MB/s` });
      }
    }

    channel.send(JSON.stringify({ action: 'file-end', id }));

    if (ackPromise) {
      return await ackPromise; // alıcı diske yazmayı bitirince çözülür
    }
  }

  handleError(msg, err) {
    console.error(`[P2P Error] ${msg}:`, err);
    if (this.onError) this.onError(`${msg}: ${(err && err.message) || err}`);
  }

  cleanup() {
    if (this.dataChannel) {
      try { this.dataChannel.close(); } catch (e) {}
      this.dataChannel = null;
    }
    if (this.peerConnection) {
      try { this.peerConnection.close(); } catch (e) {}
      this.peerConnection = null;
    }
  }
}
