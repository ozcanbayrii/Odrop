# 📡 ODrop — 100% Lossless AirDrop for Windows & Web
### *Instant, Lossless Peer-to-Peer File Transfer for iPhone, PC, and Any Device*

<p align="left">
  <strong>Language:</strong> English | <a href="README_TR.md">Türkçe</a>
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: Windows | Web | iOS](https://img.shields.io/badge/Platform-Windows%20%7C%20Web%20%7C%20iOS-brightgreen.svg)]()
[![P2P: WebRTC DataChannel](https://img.shields.io/badge/P2P-WebRTC%20DataChannel-orange.svg)]()
[![Release](https://img.shields.io/github/v/release/ozcanbayrii/Odrop?color=purple)](https://github.com/ozcanbayrii/Odrop/releases)

> 🚀 **Live Web App:** [https://odrop.ozcan.work/](https://odrop.ozcan.work/)  
> *No app installation required — open in iPhone Safari & PC browser to pair via QR code and transfer files directly.*

---

## ⚡ Overview

**ODrop** is a modern, open-source file transfer tool built to bring Apple's AirDrop experience to Windows and the Web with **zero quality compression (100% Lossless)**.

It provides two flexible operating modes:
1. **🌐 WebRTC P2P Web Client (Zero-Install):** Open [https://odrop.ozcan.work/](https://odrop.ozcan.work/) on your PC and iPhone. Devices establish an end-to-end encrypted direct P2P data channel with 64KB chunk streaming.
2. **💻 Windows Desktop Client (Portable):** A standalone background client running 24/7 in the Windows System Tray that automatically saves incoming files directly to your `Downloads\ODrop` folder with native Windows 10/11 notifications.

---

## 💎 Key Features

- **🎯 100% Lossless Bit-for-Bit Quality:**
  - Preserves original Apple ProRAW (`.DNG`), HEIC, JPEG, 4K 60fps HDR MOV, ProRes videos, and large documents without any transcoding or lossy compression.
  - All **EXIF / Camera metadata** (aperture, ISO, lens info, timestamp, GPS) are fully preserved.
- **🔒 True Serverless Peer-to-Peer (WebRTC DataChannel):**
  - Files never pass through or get stored on any cloud server. Data flows directly between the two devices across your network.
- **📲 iOS Shortcuts (Share Sheet) Integration:**
  - Select photos in the iOS Photos app, tap **Share ➔ ODrop**, and send them directly to your PC with one tap.
- **🌐 Dual Language Support (EN / TR):**
  - Switch between English and Turkish on both the web interface and the desktop app with one click.
- **🔔 Native Windows 10 / 11 Notifications:**
  - Visual and audio chime when files arrive, with a quick-open button to reveal files in File Explorer.
- **🌓 Light / Dark Mode:**
  - Minimalist, distraction-free aesthetic with instant theme switching.

---

## 🚀 Quick Start

### 1. Zero-Install Web Mode (Recommended)
Simply open the live deployment on your devices:
👉 **[https://odrop.ozcan.work/](https://odrop.ozcan.work/)**

1. Open on your PC to generate an instant pairing QR code.
2. Scan the QR code with your iPhone camera.
3. Devices connect in under a second — pick photos and send!

### 2. Standalone Windows Desktop Client
Download the latest portable release:
👉 **[Download from GitHub Releases](https://github.com/ozcanbayrii/Odrop/releases)**

- No installation needed — double click `ODrop.exe` to run.
- Runs quietly in your system tray and listens for incoming transfers.

---

## 🛠️ Local Development & Self-Hosting

### Web App (Node.js & WebSocket Signaling)
```bash
cd web
npm install
npm start
```
Starts on `http://localhost:3000`.

### Python Desktop App & FastAPI Server
```bash
pip install -r requirements.txt
python main.py
```

To build a standalone Windows binary:
```bash
python -m PyInstaller --onefile --noconsole --name "ODrop" --version-file version.txt --add-data "app/static;app/static" --add-data "app/templates;app/templates" main.py
```

---

## 🛡️ Comparison: Why ODrop?

| Method | Quality Loss? | EXIF Metadata? | File Size Limit | Speed |
|---|---|---|---|---|
| **WhatsApp / Telegram** | ❌ Heavy compression | ❌ Stripped | Restricted | Consumes mobile quota |
| **Email** | ❌ Resizes images | ⚠️ Partial | 25 MB max | Slow |
| **Cloud (Drive/iCloud)** | ⚠️ Manual upload/download | Preserved | Storage quota limits | Limited by upload speed |
| **ODrop** | ✅ **100% Lossless** | ✅ **Full EXIF Preserved** | **Unlimited (4K/ProRes)** | **Full Network Bandwidth** |

---

## 🔗 Invite Links (Remote Transfers)

Someone on a different network can send files losslessly straight to your PC or browser via a single-use, time-limited invite link (`/s/<token>`). You approve each transfer; a self-hosted coturn relay is used when a direct P2P path isn't possible. See [docs/DAVET_LINKI.md](docs/DAVET_LINKI.md) (Turkish).

---

## 📄 License
Released under the [MIT License](LICENSE).
