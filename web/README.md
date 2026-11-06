# 🌐 ODrop Web — Zero-Install WebRTC P2P AirDrop

ODrop Web, herhangi bir program veya uygulama yüklemeye gerek kalmadan, doğrudan tarayıcılar üzerinden çalışan **WebRTC DataChannel (Peer-to-Peer)** tabanlı kayıpsız dosya aktarım modülüdür.

---

## ⚡ Özellikler

- **Sıfır Kurulum:** iPhone'da Safari, bilgisayarda Chrome/Edge/Firefox açarak anında çalışır.
- **Doğrudan P2P (Sunucusuz Veri Akışı):** Dosyalar hiçbir ara sunucuya yüklenmez, depolanmaz ve okunmaz; doğrudan iki cihaz arasında şifreli WebRTC DataChannel üzerinden akar.
- **%100 Orijinal Kalite:** HEIC, ProRAW, 4K 60fps ProRes videolar ve tüm dosyalar bit düzeyinde kayıpsız iletilir.
- **Çift Dil Desteği:** Sağ üstteki tek tıkla Türkçe ve İngilizce arayüz geçişi.
- **Aydınlık / Karanlık Tema:** Göz yormayan minimalist arayüz tasarımı.

---

## 🚀 Yerel Olarak Çalıştırma

```bash
cd web
npm install
npm start
```

Sunucu varsayılan olarak `http://localhost:3000` portunda başlar.

---

## 🏗️ Mimari & Teknolojiler

- **Backend:** Node.js, `ws` (WebSocket Sinyalleşme Sunucusu)
- **Frontend:** Modern Vanilla JS (WebRTC RTCPeerConnection & RTCDataChannel)
- **Veri Akışı:** 64 KB chunked streaming & backpressure (`bufferedAmountLowThreshold`) kontrolü
- **Arayüz:** Minimalist modern CSS, sıfır harici frontend bağımlılığı
