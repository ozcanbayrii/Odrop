# Davet Linki ile Uzaktan Kayıpsız Aktarım

Başka biri (farklı şehir, farklı ağ veya mobil veri fark etmeksizin) kendi telefonundan ya da bilgisayarından doğrudan bilgisayarınıza veya tarayıcınıza orijinal kalitede dosya gönderebilir.

```text
 Gönderen (iPhone Safari)                 VPS (your-domain.com)               Siz
 -----------------------                  ---------------------               ---
 /s/<davet> linkini açar  -- istek ->    sinyal sunucusu  -- bildirim ->     Windows uygulaması
                                          (dosya görmez)                      /inbox sekmesi
                          <--------- WebRTC P2P (DTLS şifreli) --------->    "Kabul Et"
                          (doğrudan olmazsa coturn röle; veri yine şifreli)
```

## Nasıl Kullanılır?

1. Davet linki oluşturun:
   - Tarayıcıdan: `https://<sunucu-adresi>/inbox` sayfasına girin, sahip anahtarını yazıp "Link Oluştur" butonuna basın.
   - Veya Windows uygulamasının tepsi menüsünden: "Davet Linki Oluştur (1 saat / 24 saat)" seçeneğini tıklayın. Link otomatik olarak panoya kopyalanır.
2. Linki karşı tarafa mesajlaşma uygulamalarıyla iletin.
3. Karşı taraf linki açar, adını yazar, galeriden veya dosyalardan seçim yaparak "Gönder" butonuna basar.
4. Bilgisayarınızda onay penceresi çıkar (Windows'ta sistem onay kutusu, tarayıcıda onay kartı). "Kabul Et" dendiğinde aktarım başlar.
5. Dosyalar:
   - Windows uygulamasında doğrudan `İndirilenler\ODrop` klasörüne parça parça yazılır (dosya boyut sınırı yoktur).
   - Masaüstü tarayıcısında (Chrome/Edge) seçilen klasöre doğrudan yazılır. Klasör seçilmezse veya Safari/Firefox kullanılıyorsa dosya önce belleğe alınır; büyük dosyalar için masaüstü uygulamasını kullanmanız önerilir.

Davet linkleri tek kullanımlık ve sürelidir (15 dakika ile 7 gün arası). Aktarım kabul edildiği anda link geçersiz olur. Bekleyen linkleri `/inbox` sayfasından iptal edebilirsiniz.

## Windows Uygulaması Ayarları

Uygulamanın kurulu olduğu dizindeki `odrop_settings.json` dosyasına ekleyin:

```json
{
  "remote_inbox_enabled": true,
  "remote_server_url": "wss://your-domain.com",
  "remote_owner_key": "SUNUCUDAKI_ODROP_OWNER_KEY",
  "remote_auto_accept": false
}
```

`remote_auto_accept: true` yapılırsa gelen dosyalarda onay sorulmadan doğrudan indirme başlar.

Gerekli Python bağımlılıkları:
```bash
pip install -r requirements.txt
```

Exe dosyasını yeniden derlemek için:
```bash
python -m PyInstaller ODrop.spec
```

## Sunucu Kurulumu (VPS)

```bash
cd /ODROP/KLASORU && git pull
sudo bash deploy/setup-vps.sh /ODROP/KLASORU your-domain.com
```

Kurulum scripti yalnızca ODrop klasörüne ve coturn servisine işlem yapar:

- `web/.env` dosyasını oluşturur: `ODROP_OWNER_KEY` (sahip anahtarı), `TURN_SECRET`, `TURN_HOST`
- coturn kurar ve `/etc/turnserver.conf` dosyasını yapılandırır. Kısa ömürlü kimlik bilgisi kullanılır ve iç ağa yetkisiz röle engellenir.
- Güvenlik duvarı (ufw) aktifse şu portları açar: `3478/udp+tcp`, `5349/tcp`, `49160-49260/udp`
- pm2 veya systemd sürecini bulup ODrop'u yeniden başlatır, işlem öncesi yedek alır (`/root/odrop-backup-*.tgz`).

Kurulum kontrolü:
```bash
curl https://your-domain.com/healthz
```
Beklenen yanıt: `{"ok":true,"invites":true,"turn":true}`

## iPhone Kalite Notu

Safari, Fotoğraflar uygulamasından seçilen bazı medyaları uyumlu biçime dönüştürebilir (örneğin HEIC fotoğraf JPEG'e, HEVC video H.264'e çevrilebilir). Bu durum tarayıcı seçicisinde gerçekleşir. Orijinal dosyayı garanti altına almak için:

- Seçicide "Seçenekler" görünüyorsa biçimi "Güncel" olarak belirleyin, veya
- Videoyu önce "Dosyalar" uygulamasına kaydedip "Dosyalardan Seç" seçeneğiyle gönderin.

Aktarım işlemi bit düzeyinde kayıpsızdır. Dosya boyutu alıcıda doğrulanır ve diske yazma işlemi tamamlandığında gönderene teslim edildi bilgisi iletilir.

## Güvenlik

- Dosyalar sunucuda saklanmaz. Sunucu yalnızca cihazları eşleştirir (sinyalleşme).
- TURN rölesi kullanılsa dahi tüm veri WebRTC DTLS ile uçtan uca şifrelenir.
- Davet token'ları 128 bit kriptografik rastgele değerlerden oluşur.
- TURN kimlik bilgileri 12 saat geçerlidir ve yalnızca eşleşmiş oturumlara sağlanır.
