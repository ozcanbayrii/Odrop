/**
 * ODrop WebRTC P2P DataChannel Engine
 * Handles STUN NAT traversal, chunked streaming, backpressure, and lossless file transfer.
 */

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

const CHUNK_SIZE = 64 * 1024; // 64 KB per chunk for optimal speed
const BUFFER_HIGH_WATERMARK = 2 * 1024 * 1024; // 2 MB
const BUFFER_LOW_WATERMARK = 512 * 1024; // 512 KB

class P2PManager {
  constructor(sendSignalFn) {
    this.sendSignal = sendSignalFn;
    this.peerConnection = null;
    this.dataChannel = null;
    this.isInitiator = false;

    // Incoming file state
    this.currentIncomingFile = null;
    this.receivedChunks = [];
    this.receivedBytes = 0;
    this.transferStartTime = 0;

    // Event callbacks
    this.onConnectionStateChange = null;
    this.onProgress = null;
    this.onFileReceived = null;
    this.onError = null;
  }

  init(isInitiator) {
    this.isInitiator = isInitiator;
    this.cleanup();

    this.peerConnection = new RTCPeerConnection(RTC_CONFIG);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({ type: 'candidate', candidate: event.candidate });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection ? this.peerConnection.connectionState : 'closed';
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(state);
      }
    };

    if (this.isInitiator) {
      // Create DataChannel
      this.dataChannel = this.peerConnection.createDataChannel('odropTransfer', {
        ordered: true
      });
      this.setupDataChannel(this.dataChannel);

      // Create & send Offer
      this.peerConnection.createOffer()
        .then((offer) => this.peerConnection.setLocalDescription(offer))
        .then(() => {
          this.sendSignal({ type: 'offer', sdp: this.peerConnection.localDescription });
        })
        .catch((err) => this.handleError('Offer oluşturulamadı', err));
    } else {
      // Wait for DataChannel from initiator
      this.peerConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel(this.dataChannel);
      };
    }
  }

  setupDataChannel(channel) {
    channel.binaryType = 'arraybuffer';
    channel.bufferedAmountLowThreshold = BUFFER_LOW_WATERMARK;

    channel.onopen = () => {
      console.log('[WebRTC] DataChannel açıldı! P2P aktarım hazır.');
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange('connected');
      }
    };

    channel.onclose = () => {
      console.log('[WebRTC] DataChannel kapandı.');
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange('disconnected');
      }
    };

    channel.onerror = (err) => {
      this.handleError('DataChannel hatası', err);
    };

    channel.onmessage = (event) => this.handleChannelMessage(event);
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

  handleChannelMessage(event) {
    // If text message: file metadata or control signal
    if (typeof event.data === 'string') {
      try {
        const msg = JSON.parse(event.data);
        if (msg.action === 'file-start') {
          this.currentIncomingFile = msg;
          this.receivedChunks = [];
          this.receivedBytes = 0;
          this.transferStartTime = Date.now();

          if (this.onProgress) {
            this.onProgress({
              direction: 'receive',
              name: msg.name,
              size: msg.size,
              progress: 0,
              speed: '0 MB/s'
            });
          }
        } else if (msg.action === 'file-end') {
          this.finalizeIncomingFile();
        }
      } catch (e) {
        console.error('JSON parse error on channel message', e);
      }
      return;
    }

    // Binary message: File ArrayBuffer chunk
    if (event.data instanceof ArrayBuffer && this.currentIncomingFile) {
      this.receivedChunks.push(event.data);
      this.receivedBytes += event.data.byteLength;

      const progress = Math.min(100, Math.round((this.receivedBytes / this.currentIncomingFile.size) * 100));
      const elapsedSec = (Date.now() - this.transferStartTime) / 1000;
      const speedMB = elapsedSec > 0 ? (this.receivedBytes / (1024 * 1024) / elapsedSec).toFixed(1) : '0';

      if (this.onProgress) {
        this.onProgress({
          direction: 'receive',
          name: this.currentIncomingFile.name,
          size: this.currentIncomingFile.size,
          progress: progress,
          speed: `${speedMB} MB/s`
        });
      }
    }
  }

  finalizeIncomingFile() {
    if (!this.currentIncomingFile) return;

    // Create 100% original lossless Blob
    const blob = new Blob(this.receivedChunks, {
      type: this.currentIncomingFile.type || 'application/octet-stream'
    });

    const fileData = {
      name: this.currentIncomingFile.name,
      size: this.currentIncomingFile.size,
      blob: blob,
      url: URL.createObjectURL(blob),
      date: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    };

    // Auto-trigger browser download
    const a = document.createElement('a');
    a.href = fileData.url;
    a.download = fileData.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (this.onFileReceived) {
      this.onFileReceived(fileData);
    }

    this.currentIncomingFile = null;
    this.receivedChunks = [];
    this.receivedBytes = 0;
  }

  // Send a file with Backpressure Control
  async sendFile(file, onFileProgress) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('P2P bağlantısı aktif değil.');
    }

    // 1. Send file metadata header
    const fileHeader = {
      action: 'file-start',
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      totalChunks: Math.ceil(file.size / CHUNK_SIZE)
    };
    this.dataChannel.send(JSON.stringify(fileHeader));

    let offset = 0;
    const startTime = Date.now();

    // Helper: wait if buffer exceeds watermark
    const waitForBuffer = () => {
      return new Promise((resolve) => {
        if (this.dataChannel.bufferedAmount <= BUFFER_LOW_WATERMARK) {
          resolve();
        } else {
          const onLow = () => {
            this.dataChannel.removeEventListener('bufferedamountlow', onLow);
            resolve();
          };
          this.dataChannel.addEventListener('bufferedamountlow', onLow);
        }
      });
    };

    while (offset < file.size) {
      // Backpressure check
      if (this.dataChannel.bufferedAmount >= BUFFER_HIGH_WATERMARK) {
        await waitForBuffer();
      }

      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const buffer = await slice.arrayBuffer();
      this.dataChannel.send(buffer);

      offset += buffer.byteLength;

      const progress = Math.min(100, Math.round((offset / file.size) * 100));
      const elapsedSec = (Date.now() - startTime) / 1000;
      const speedMB = elapsedSec > 0 ? (offset / (1024 * 1024) / elapsedSec).toFixed(1) : '0';

      if (onFileProgress) {
        onFileProgress({
          direction: 'send',
          name: file.name,
          size: file.size,
          progress: progress,
          speed: `${speedMB} MB/s`
        });
      }
    }

    // 3. Send file-end signal
    this.dataChannel.send(JSON.stringify({ action: 'file-end' }));
  }

  handleError(msg, err) {
    console.error(`[P2P Error] ${msg}:`, err);
    if (this.onError) {
      this.onError(`${msg}: ${err.message || err}`);
    }
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
