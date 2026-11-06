# 📡 ODrop — 100% Lossless AirDrop for Windows & Web
### *iPhone, PC ve Tüm Cihazlar Arasında Sıfır Kalite Kaybıyla Dosya Aktarımı*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: Windows | Web | iOS](https://img.shields.io/badge/Platform-Windows%20%7C%20Web%20%7C%20iOS-brightgreen.svg)]()
[![P2P: WebRTC DataChannel](https://img.shields.io/badge/P2P-WebRTC%20DataChannel-orange.svg)]()

ODrop, iPhone ve Windows bilgisayarınız arasında **fotoğraf, 4K/ProRes video, ProRAW, PDF ve tüm dosyaları** hiçbir sıkıştırma veya kalite kaybı olmadan (**%100 Lossless**) aktarmanızı sağlayan modern, açık kaynaklı bir dosya paylaşım çözümüdür.

İki farklı kullanım modu sunar:
1. **🌐 WebRTC P2P (Sıfır Kurulum):** Tarayıcı üzerinden doğrudan cihazlar arası uçtan uca şifreli ve sunucusuz aktarım.
2. **💻 Windows Masaüstü Uygulaması:** Sistem tepsisinde (System Tray) arka planda 7/24 sessizce çalışan ve gelen dosyaları doğrudan `İndirilenler\ODrop` klasörüne kaydeden bağımsız istemci.

---

## 🚀 Öne Çıkan Özellikler / Key Features

- **💎 Sıfır Kalite Kaybı (%100 Lossless):**
  - HEIC, JPEG, Apple ProRAW (`.DNG`), 4K 60fps HDR MOV, ProRes videolar ve tüm formatlar bit düzeyinde orijinal haliyle korunur.
  - Kamera lens bilgisi, diyafram, ISO, çekim tarihi ve konum gibi tüm **EXIF / metadata verileri** eksiksiz kalır.
- **🌐 Tarayıcıdan Tarayıcıya Doğrudan P2P (WebRTC):**
  - Dosyalar hiçbir ara sunucuya yüklenmez, depolanmaz ve okunmaz; doğrudan iki cihaz arasında şifreli WebRTC DataChannel üzerinden akar.
- **📲 iOS Kestirmeler (Apple Shortcuts) Entegrasyonu:**
  - iPhone Galerisinde istediğiniz fotoğrafları seçip **Paylaş ➔ ODrop** diyerek tek dokunuşla bilgisayarınıza gönderebilirsiniz.
- **🌐 Çoklu Dil Desteği (TR / EN):**
  - Hem web arayüzünde hem de masaüstü uygulamasında tek tıkla Türkçe ve İngilizce geçişi.
- **🔔 Windows 10 / 11 Bildirimleri (Native Toast):**
  - Dosya aktarımı bittiğinde Windows bildirimi ve ses çalar, tek tıkla klasörü açabilirsiniz.
- **🌓 Aydınlık / Karanlık Tema:**
  - Modern, minimalist ve pürüzsüz arayüz tasarımı.

---

## 📦 Kurulum ve Çalıştırma

### 1. Web Sürümü (Node.js)
```bash
cd web
npm install
npm start
```
Tarayıcınızda açın: `http://localhost:3000`

### 2. Windows Masaüstü Sürümü (Python / Standalone)
Hazır `.exe` veya `.zip` sürümünü doğrudan çalıştırabilirsiniz:
- `ODrop-Windows.zip` arşivini açın ve `ODrop.exe` dosyasına çift tıklayın.
- Sağ alttaki Windows Sistem Tepsisinde ODrop logosu belirecektir.

Kaynak koddan çalıştırmak için:
```bash
pip install -r requirements.txt
python main.py
```

---

## 📱 iPhone Kurulumu (Apple Shortcuts / Web)

### Yöntem 1: WebRTC QR Kod (En Kolay & Sıfır Kurulum)
1. Bilgisayarınızda veya sunucunuzda ODrop Web sayfasını açın.
2. iPhone kameranızla ekrandaki QR kodu okutun.
3. Cihazlar 1 saniyede doğrudan eşleşir; fotoğrafları seçip gönderin!

### Yöntem 2: iOS Kestirmeler (Galeri Paylaşım Menüsü)
1. iPhone'da **Kestirmeler (Shortcuts)** uygulamasını açın.
2. Yeni kestirme oluşturup adını **ODrop** yapın.
3. Paylaşma Sayfasında Göster'i açın.
4. "URL İçeriğini Al" (POST /api/upload) adımıyla bilgisayarınızın yerel IP'sine bağlayın.

---

## 🛡️ Neden ODrop?

| Yöntem | Kalite Kaybı? | EXIF / Metadata? | Dosya Boyut Sınırı | Hız |
|---|---|---|---|---|
| **WhatsApp / Telegram** | ❌ Yeniden sıkıştırır | ❌ Silinir | Sınırlı | İnternet kotası harcar |
| **E-Posta** | ❌ Sıkıştırabilir | ⚠️ Kısmi | 25 MB limit | Yavaş |
| **Bulut (Drive/iCloud)** | ⚠️ İndirme zahmeti | Korunur | Kota sınırı | İnternet hızına bağlı |
| **ODrop** | ✅ **%100 Orijinal** | ✅ **Tüm EXIF korunur** | **Limitsiz (4K / ProRes)** | **Maksimum Donanım Hızı** |

---

## 📄 Lisans
Bu proje [MIT Lisansı](LICENSE) kapsamında açık kaynaklı olarak sunulmaktadır.
