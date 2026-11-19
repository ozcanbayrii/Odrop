# ODrop — Windows ve Web İçin %100 Kayıpsız AirDrop
### *iPhone, PC ve Tüm Cihazlar Arasında Sıfır Kalite Kaybıyla Doğrudan Dosya Aktarımı*

<p align="left">
  <strong>Dil:</strong> <a href="README.md">English</a> | Türkçe
</p>

[![License: MIT](https://img.shields.io/badge/Lisans-MIT-blue.svg)](LICENSE)
[![Platform: Windows | Web | iOS](https://img.shields.io/badge/Platform-Windows%20%7C%20Web%20%7C%20iOS-brightgreen.svg)]()
[![P2P: WebRTC DataChannel](https://img.shields.io/badge/P2P-WebRTC%20DataChannel-orange.svg)]()
[![Release](https://img.shields.io/github/v/release/ozcanbayrii/Odrop?color=purple)](https://github.com/ozcanbayrii/Odrop/releases)

---

## Genel Bakış

**ODrop**, Apple'ın AirDrop deneyimini **hiçbir kalite veya çözünürlük kaybı olmadan (%100 Kayıpsız)** Windows ve Web ortamına taşıyan açık kaynaklı bir dosya paylaşım aracıdır.

İki farklı kullanım modu sunar:
1. **WebRTC P2P Web İstemcisi (Sıfır Kurulum):** Bilgisayarınızda ve iPhone'unuzda web arayüzünü açın. Cihazlar uçtan uca şifreli doğrudan P2P kanalı üzerinden 64KB parçalı akışla bağlanır.
2. **Windows Masaüstü İstemcisi (Taşınabilir):** Windows Sistem Tepsisinde (System Tray) arka planda 7/24 çalışan, gelen tüm dosyaları onay beklemeden doğrudan `İndirilenler\ODrop` klasörüne kaydeden ve Windows 10/11 bildirimi veren masaüstü sürümüdür.

---

## Temel Özellikler

- **%100 Orijinal (Bit-for-Bit) Kalite:**
  - Orijinal Apple ProRAW (`.DNG`), HEIC, JPEG, 4K 60fps HDR MOV, ProRes videolar ve tüm belgeler yeniden sıkıştırılmadan (transcoding yapılmadan) bit düzeyinde orijinal haliyle korunur.
  - Kamera lens bilgisi, diyafram, ISO, çekim tarihi ve konum gibi tüm **EXIF / metadata verileri** eksiksiz kalır.
- **Gerçek Sunucusuz P2P (WebRTC DataChannel):**
  - Dosyalar internetteki hiçbir bulut sunucusuna yüklenmez, depolanmaz veya okunmaz. Veri doğrudan iki cihaz arasında akar.
- **iOS Kestirmeler (Apple Shortcuts) Entegrasyonu:**
  - iPhone Galerisinde istediğiniz fotoğrafları seçip **Paylaş -> ODrop** diyerek tek dokunuşla bilgisayarınıza gönderebilirsiniz.
- **Çift Dil Desteği (TR / EN):**
  - Hem web arayüzünde hem de masaüstü uygulamasında tek tıkla Türkçe ve İngilizce geçişi.
- **Windows 10 / 11 Bildirimleri (Native Toast):**
  - Dosya aktarımı tamamlandığında ses ve görsel bildirim verir, tek tıkla klasörü açabilirsiniz.
- **Aydınlık / Karanlık Tema:**
  - Modern, minimalist ve pürüzsüz arayüz tasarımı.

---

## Hızlı Başlangıç

### 1. Web Modu
1. Bilgisayarınızda web arayüzünü açarak anlık eşleşme QR kodunu veya 6 haneli bağlantı kodunu görüntüleyin.
2. iPhone kameranızla QR kodu okutun veya 6 haneli kodu girin.
3. Cihazlar 1 saniyede birbirine bağlanır — fotoğrafları seçip gönderin!

### 2. Bağımsız Windows Masaüstü Uygulaması
En son taşınabilir sürümü indirin:  
- **[GitHub Releases Sayfasından İndir](https://github.com/ozcanbayrii/Odrop/releases)**
- Kurulum gerektirmez — `ODrop.exe` dosyasına çift tıklayarak çalıştırın.
- Sistem tepsisinde hazır bekler ve gelen dosyaları doğrudan klasöre kaydeder.

---

## iPhone Kestirmeler (Apple Shortcuts) Kurulumu

1. iPhone'unuzda yüklü olan **Kestirmeler (Shortcuts)** uygulamasını açın.
2. Yeni kestirme oluşturup adını **"ODrop"** yapın.
3. Bilgi simgesine **`(i)`** dokunup **"Paylaşma Sayfasında Göster"** seçeneğini aktif edin.
4. **"URL İçeriğini Al"** *(POST /api/upload)* adımını ekleyerek bilgisayarınızın yerel IP adresine veya tünel adresine bağlayın.
5. Galeriden fotoğrafları seçip tek tıkla aktarın!

---

## Yerel Geliştirme ve Sunucu Kurulumu

### Web Uygulaması (Node.js & WebSocket Sinyalleşme)
```bash
cd web
npm install
npm start
```
Varsayılan olarak `http://localhost:3000` portunda başlar.

### Python Masaüstü Uygulaması & FastAPI Sunucusu
```bash
pip install -r requirements.txt
python main.py
```

Bağımsız Windows .exe çıktısı almak için:
```bash
python -m PyInstaller ODrop.spec
```

---

## Karşılaştırma: Neden ODrop?

| Aktarım Yöntemi | Kalite Kaybı? | EXIF / Metadata? | Dosya Boyut Sınırı | Hız |
|---|---|---|---|---|
| **WhatsApp / Telegram** | Ağır sıkıştırma uygular | Silinir | Sınırlı | İnternet kotası harcar |
| **E-Posta** | Bazen sıkıştırır | Kısmi | 25 MB limit | Yavaş |
| **Bulut (Drive/iCloud)** | Manuel yükleme ve indirme | Korunur | Kota sınırı | İnternet yükleme hızına bağlı |
| **ODrop** | **%100 Orijinal (Kayıpsız)** | **Tüm EXIF korunur** | **Limitsiz (4K / ProRes)** | **Maksimum Ağ Hızı** |

---

## Uzaktan Aktarım (Davet Linki ve Kod ile)

Başka biri, farklı bir ağdan bile, davet linki veya 6 haneli oda kodu ile doğrudan bilgisayarınıza veya tarayıcınıza kayıpsız dosya gönderebilir. Linkler tek kullanımlık ve sürelidir, her gönderimde alıcı onayı istenir. Detaylı kurulum ve kullanım kılavuzu: [docs/DAVET_LINKI.md](docs/DAVET_LINKI.md)

---

## Lisans
Bu proje [MIT Lisansı](LICENSE) altında açık kaynaklıdır.
