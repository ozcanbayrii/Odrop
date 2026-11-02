# 📡 ODrop — iPhone'dan PC'ye Kayıpsız Dosya Aktarımı
### *(AirDrop for Windows & iOS Shortcuts Integration)*

ODrop, iPhone’unuzdan Windows bilgisayarınıza **fotoğraf, 4K/ProRes video, ProRAW, PDF ve tüm dosyaları** hiçbir kalite/çözünürlük kaybı yaşamadan (100% Lossless) tek dokunuşla aktarmanızı sağlayan modern bir açık kaynaklı projedir.

iOS **Kestirmeler (Apple Shortcuts)** uygulaması sayesinde, iPhone'da fotoğrafları veya videoları seçip **Paylaş** dediğinizde en alttaki menüden tek tıkla doğrudan bilgisayarınıza fırlatabilirsiniz.

---

## 🚀 Öne Çıkan Özellikler

- **💎 Sıfır Kalite Kaybı (100% Lossless):**
  - HEIC, JPEG, Apple ProRAW (`.DNG`), 4K 60fps HDR MOV, ProRes videolar, ses kayıtları ve PDF'ler yeniden sıkıştırılmadan (transcoding yapılmadan) bit düzeyinde orijinal haliyle diske yazılır.
  - Kamera lens bilgisi, diyafram, ISO, çekim tarihi ve konum gibi tüm **EXIF / metadata verileri** eksiksiz korunur.
- **📲 iOS Kestirmeler (Share Sheet) Entegrasyonu:**
  - iPhone Galerisinde 1 veya 50 fotoğraf/video seçin, **Paylaş** simgesine dokunun ve listeden **ODrop**'u seçin.
- **⚡ Yerel Ağda (Wi-Fi / Hotspot) Maksimum Hız:**
  - Ev/ofis Wi-Fi ağınızda veya iPhone kişisel erişim noktasında (Hotspot) internet kotanızı harcamadan yerel ağ hızında (40-80+ MB/sn) saniyeler içinde aktarır.
- **🌐 Farklı Ağlardan (İnternet / 4G / 5G) Gönderim:**
  - Dahili **Cloudflare Quick Tunnel** desteği sayesinde, evde olmasanız bile (dışarıda mobil veriyle) güvenli SSL tüneli üzerinden doğrudan bilgisayarınıza dosya gönderebilirsiniz. Port yönlendirme gerektirmez!
- **🔔 Windows 10 / 11 Bildirimleri (Toast Notifications):**
  - Dosya aktarımı tamamlandığında Windows ekranında "Fotoğraf Alındı: IMG_1234.HEIC (12.4 MB)" bildirimi ve ses çalar.
  - Bildirimdeki **"📁 Klasörü Aç"** butonuna basarak doğrudan ilgili klasöre gidebilirsiniz.
- **🖥️ Modern Masaüstü Arayüzü & Sistem Tepsisi (Tray):**
  - Windows Sistem Tepsisinde (System Tray) arka planda sessizce çalışır.
  - Dahili QR kod ve canlı gelen dosya tablosu.
- **🌐 AirDrop Tarzı Web Dashboard:**
  - iPhone Safari'den QR kod okutarak veya tarayıcıdan sürükle-bırak yaparak da dosya gönderebilirsiniz.

---

## 📁 Proje Dizin Yapısı

```
c:\Users\User\Desktop\genel\odrop\
├── app/
│   ├── config.py             # Uygulama ayarları, port ve kayıt dizini
│   ├── core/
│   │   ├── receiver.py       # Çakışma önlemeli, akışlı (streaming) kayıpsız dosya alıcısı
│   │   ├── network.py        # Yerel IP algılama, QR kod üretimi ve mDNS (Bonjour)
│   │   ├── notifier.py       # Windows Toast bildirimleri ve ses yönetimi
│   │   ├── tunnel.py         # Cloudflare Quick Tunnel (Dış ağ erişimi)
│   │   └── shortcut_gen.py   # Dinamik Apple Shortcut (.shortcut) plist üreticisi
│   ├── server/
│   │   ├── main.py           # FastAPI motoru ve yaşam döngüsü
│   │   └── routes.py         # /api/upload, /api/info, /shortcut, WebSocket
│   ├── static/               # CSS, JS, SVG logoları (Glassmorphism arayüz)
│   └── templates/
│       └── index.html        # Responsive web paneli ve iPhone kurulum rehberi
├── gui/
│   ├── app_window.py         # Tkinter masaüstü penceresi
│   └── tray.py               # Windows sistem tepsisi (pystray)
├── main.py                   # Ana başlatıcı
├── start.bat                 # Tek tıkla başlatma betiği
├── start_silent.vbs          # Arka planda konsol penceresiz sessiz başlatıcı
├── requirements.txt          # Gerekli Python kütüphaneleri
└── README.md                 # Bu dokümantasyon
```

---

## 🛠️ Kurulum ve Başlatma

### 1. Adım: Başlatma
Klasör içindeki `start.bat` dosyasına çift tıklayarak uygulamayı başlatın:
```bash
start.bat
```
*(Veya terminalden: `python main.py`)*

Ekranda ODrop Masaüstü Arayüzü açılacak ve bilgisayarınızın yerel IP adresiyle bir **QR Kod** görüntülenecektir.

> **İpucu (Windows Açılışında Otomatik Başlatma):**  
> `start_silent.vbs` dosyasının kısayolunu oluşturup `shell:startup` (Başlangıç) klasörüne atarsanız, bilgisayar açıldığında hiçbir siyah konsol penceresi çıkmadan arka planda sessizce hazır bekler.

---

## 📱 iPhone Kestirmeler (Apple Shortcuts) Kurulumu

ODrop ile iki farklı şekilde kestirme kurabilirsiniz:

### 🌟 Yöntem 1: Kestirmeler Uygulamasında Kendin Oluştur (30 Saniye - En Kararlı)

1. iPhone'unuzda yüklü olan **Kestirmeler (Shortcuts)** uygulamasını açın.
2. Sağ üst köşedeki **`+`** (Yeni Kestirme) simgesine dokunun.
3. Kestirmenin üst başlığına dokunup adını **"ODrop (PC'ye Gönder)"** yapın.
4. Alt kısımdaki bilgi simgesine **`(i)`** dokunun ve **"Paylaşma Sayfasında Göster"** seçeneğini aktif edin. *(Girdi Türü olarak Fotoğraflar, Medya, Dosyalar seçili olsun)*.
5. **İşlem Ekle** butonuna basarak sırasıyla şu blokları ekleyin:
   - **"Yinelenen Öğelerin Her Biri İçin"** *(Repeat with Each)*
   - Döngünün içine **"URL İçeriğini Al"** *(Get Contents of URL)* işlemini sürükleyin:
     - **URL:** `http://<BILGISAYAR_IP>:5252/api/upload` *(Örn: `http://192.168.1.100:5252/api/upload`)*
     - **Daha Fazla Göster**'e dokunun.
     - **Yöntem:** `POST`
     - **İstek Gövdesi:** `Form`
     - **+ (Ekle)** ➔ Anahtar Adı: `file` ➔ Tür: `Dosya` ➔ Değer: `Yinelenen Öğe` *(Repeat Item)*
   - Döngünün hemen sonuna (Bittiğinde):
     - **"Bildirim Göster"** ➔ Metin: *"Tüm dosyalar bilgisayara aktarıldı! 🎉"*
6. Sağ üstteki **Bitti** butonuna dokunun.

---

### 📲 Yöntem 2: Hazır Kestirme Dosyasını İndirme

1. iPhone Safari tarayıcısından `http://<BILGISAYAR_IP>:5252` adresini açın veya bilgisayar ekranındaki QR kodu kamerayla okutun.
2. Web panelindeki **"📲 Kestirmeyi İndir (.shortcut)"** butonuna dokunun.
3. Safari dosyayı indirdikten sonra **Dosyalar (Files)** uygulamasını açın.
4. `ODrop_Gonder.shortcut` dosyasına **basılı tutun (uzun basın)** ➔ **Paylaş** ➔ **Kestirmeler** uygulamasını seçin ve onaylayın.

---

## 📸 Nasıl Kullanılır? (Fotoğraf & Video Gönderme)

1. iPhone **Fotoğraflar** uygulamasını açın.
2. Bilgisayara aktarmak istediğiniz fotoğraf ve videoları seçin.
3. Sol alttaki **Paylaş** simgesine dokunun.
4. Paylaşım menüsünde aşağı kaydırın ve **"ODrop (PC'ye Gönder)"** kestirmesine dokunun.
5. Dosyalar orijinal boyutunda ve kalitesinde anında Windows bilgisayarınıza aktarılacaktır!
6. Bilgisayar ekranınızda Windows bildirimi belirecek; bildirime veya masaüstü uygulamasındaki **"📁 Klasörü Aç"** butonuna tıklayarak dosyalara ulaşabilirsiniz.

---

## 🌐 Farklı Ağlardan (İnternet / 4G / 5G) Gönderim

Eğer ev veya ofis dışındaysanız ve iPhone'unuz hücresel verideyken (4G/5G) bilgisayarınıza dosya göndermek istiyorsanız:
1. ODrop arayüzünde **"⚡ Dış Ağ Tüneli Başlat"** butonuna tıklayın.
2. Cloudflare Tunnel otomatik olarak güvenli bir HTTPS adresi oluşturur (örneğin: `https://ornek-alan-adi.trycloudflare.com`).
3. iPhone Kestirmenizdeki URL adresini bu yeni HTTPS adresiyle güncelleyin:  
   `https://ornek-alan-adi.trycloudflare.com/api/upload`
4. Artık dünyanın neresinde olursanız olun dosyalarınız doğrudan bilgisayarınıza kayıpsız aktarılır!

---

## 🛡️ Neden Sıfır Kalite Kaybı?

| Aktarım Yöntemi | Kalite Kaybı? | EXIF / Metadata? | Dosya Boyut Limiti | Hız |
|---|---|---|---|---|
| **WhatsApp / Telegram** | ❌ Yeniden sıkıştırır (720p/1080p yapar) | ❌ Silinir | Sınırlı | İnternet kotası harcar |
| **E-Posta** | ❌ Bazen sıkıştırır | ⚠️ Kısmi | 25 MB limitli | Yavaş |
| **Bulut (Drive/iCloud)** | ⚠️ İndirme zahmeti | Korunur | Depolama kotası harcar | İnternet hızına bağlı |
| **ODrop (Bu Proje)** | ✅ **%100 Orijinal (Bit-for-bit)** | ✅ **Tüm EXIF korunur** | **Limitsiz (4K 60fps/ProRes)** | **Yerel Ağ Hızı (Çok Hızlı)** |

---

## 🧪 Testleri Çalıştırma

Tüm uç noktaları, akışlı yükleme motorunu ve ikili Apple Shortcut üretimini test etmek için:
```bash
python test_odrop.py
```
Çıktı:
```text
==================================================
  ODrop Otomatik Testleri Başlatılıyor...
==================================================
[1/6] Web arayüzü kontrol ediliyor...
  [OK] Web arayüzü başarıyla yanıt verdi (200 OK)
[2/6] /api/info uç noktası kontrol ediliyor...
  [OK] Sistem bilgisi alındı: IP=192.168.1.100, Port=5252
[3/6] Apple Shortcut (.shortcut) üretimi test ediliyor...
  [OK] Geçerli Apple Shortcut ikili plist dosyası üretildi (1451 bayt)
[4/6] Kayıpsız dosya aktarımı (/api/upload - Multipart) test ediliyor...
  [OK] Dosya sıfır kayıpla kaydedildi: IMG_0492.HEIC (44 bayt)
[5/6] Çakışma önleme (aynı isimli dosya koruması) test ediliyor...
  [OK] Önceki dosyanın üzerine yazılmadı, benzersiz isim verildi: IMG_0492_1.HEIC
[6/6] /api/files dosya listeleme kontrol ediliyor...
  [OK] Aktarılan dosyalar listelendi (2 adet dosya)

==================================================
  TUM TESTLER BASARIYLA GECTI! (6/6)
==================================================
```
