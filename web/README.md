# 🌐 ODrop Web — Sunucusuz Doğrudan P2P Dosya Aktarımı (Web AirDrop)

Bu proje, Apple'ın AirDrop deneyimini **hiçbir program veya uygulama yüklemeden** doğrudan tarayıcı üzerinden sunan **WebRTC (Peer-to-Peer)** tabanlı kayıpsız dosya aktarım sistemidir.

---

## ⚡ Nasıl Çalışır?

1. **Bilgisayarda Açın:** Bilgisayar tarayıcısından siteye girilir (Örn: `http://192.168.1.100:3000` veya internet siteniz `https://odrop.onrender.com`).
2. **iPhone ile Eşleşin:** PC ekranında beliren **QR Kod** iPhone kamerasıyla okutulur.
3. **P2P Doğrudan Bağlantı:** WebRTC DataChannel sayesinde iki cihaz uçtan uca doğrudan birbirine bağlanır.
4. **Kayıpsız Aktarım:** iPhone'dan seçilen fotoğraflar veya 4K videolar **sunucuya hiç uğramadan** doğrudan telefondan bilgisayara akar ve bilgisayarın İndirilenler klasörüne iner.

---

## 🚀 Yerel Olarak Çalıştırma

Bilgisayarınızda `start_web.bat` dosyasına çift tıklayın veya:

```bash
cd web
npm install
npm start
```

Tarayıcınızda açın:
- **Bilgisayar:** `http://localhost:3000`
- **iPhone:** Ekranda çıkan QR kodu kamerayla okutun veya `http://192.168.1.X:3000` adresine girin.

---

## 🌍 İnternette Ücretsiz Yayınlama (Kız Arkadaşınız veya Herkes İçin)

Bu web uygulamasını tüm dünyaya açık, ücretsiz bir internet sitesi haline getirmek için:

### Render.com (Tamamen Ücretsiz & 2 Dakikada):
1. [Render.com](https://render.com) adresine ücretsiz üye olun.
2. **New + ➔ Web Service** seçeneğine tıklayın.
3. Bu GitHub projenizi bağlayın (veya `web` klasörünü yükleyin).
4. Otomatik olarak size `https://odrop-p2p.onrender.com` gibi **ücretsiz ve SSL sertifikalı (HTTPS)** bir internet sitesi verecektir!

Artık kız arkadaşınıza sadece sitenizin linkini atmanız yeterlidir; ne program kurması gerekir ne de teknik bir işlem yapması!
