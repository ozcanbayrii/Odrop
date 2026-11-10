# 🔗 Davet Linki ile Uzaktan Kayıpsız Aktarım

Başka biri (farklı şehir, farklı ağ, mobil veri fark etmez) kendi telefonundan ya da bilgisayarından **doğrudan senin bilgisayarına veya tarayıcına** orijinal kalitede dosya gönderebilir.

```
 Gönderen (iPhone Safari)                 VPS (odrop.ozcan.work)              Sen
 ───────────────────────                  ──────────────────────              ───
 /s/<davet> linkini açar  ── istek ──▶   sinyal sunucusu  ── bildirim ──▶  💻 Windows uygulaması
                                           (dosya görmez)                    🌐 /inbox sekmesi
                          ◀────────── WebRTC P2P (DTLS şifreli) ──────────▶  "Kabul Et"
                          (doğrudan olmazsa coturn röle; veri yine şifreli)
```

## Nasıl kullanılır?

1. **Davet linki oluştur**
   - Tarayıcıdan: `https://odrop.ozcan.work/inbox` → sahip anahtarını gir → *Link Oluştur*.
   - Ya da Windows uygulamasının tepsi menüsünden: **🔗 Davet Linki Oluştur (1 saat / 24 saat)**. Link panoya kopyalanır.
2. Linki karşı tarafa WhatsApp vb. ile gönder.
3. Karşı taraf linki açar, adını yazar, **Galeriden Seç** veya **Dosyalardan Seç** ile dosyaları seçip **Gönder**'e basar.
4. Sende onay penceresi çıkar (Windows'ta sistem penceresi, tarayıcıda kart). **Kabul Et** dediğinde aktarım başlar.
5. Dosyalar:
   - Windows uygulamasında doğrudan `İndirilenler\ODrop` klasörüne parça parça yazılır (boyut sınırı yok).
   - Tarayıcıda (Chrome/Edge masaüstü) seçtiğin klasöre parça parça yazılır. Klasör seçmezsen ya da Safari/Firefox kullanıyorsan dosya önce belleğe alınır, bu yüzden çok büyük videolar için uygulamayı kullan.

Davet linkleri **tek kullanımlık** ve **süreli** (15 dk – 7 gün). Kabul ettiğin anda link tükenir. Bekleyen linkleri `/inbox` sayfasından iptal edebilirsin.

## Windows uygulaması ayarı

`odrop_settings.json` dosyasına ekle:

```json
{
  "remote_inbox_enabled": true,
  "remote_server_url": "wss://odrop.ozcan.work",
  "remote_owner_key": "SUNUCUDAKI_ODROP_OWNER_KEY",
  "remote_auto_accept": false
}
```

`remote_auto_accept: true` yaparsan onay sorulmaz. Linkler zaten tek kullanımlık, ama yine de önerilmez.

Yeni bağımlılıklar: `pip install -r requirements.txt` (aiortc, websockets). Exe'yi yeniden derlemek için README'deki PyInstaller komutunu `ODrop.spec` ile çalıştır: `python -m PyInstaller ODrop.spec`.

## Sunucu kurulumu (VPS)

```bash
cd /ODROP/KLASORU && git pull
sudo bash deploy/setup-vps.sh /ODROP/KLASORU odrop.ozcan.work
```

Script yalnızca ODrop klasörüne ve coturn'e dokunur:

- `web/.env` oluşturur: `ODROP_OWNER_KEY` (sahip anahtarı), `TURN_SECRET`, `TURN_HOST`
- coturn kurar ve `/etc/turnserver.conf` dosyasını yazar. Kısa ömürlü kimlik bilgisi kullanılır ve iç ağa röle engellenir. Sunucuda başka amaçla çalışan bir coturn varsa hiçbir şeyi değiştirmeden durur.
- ufw aktifse yalnızca şu portları açar: `3478/udp+tcp`, `5349/tcp`, `49160-49260/udp`
- pm2 ya da systemd sürecini bulup ODrop'u yeniden başlatır, önce de yedek alır (`/root/odrop-backup-*.tgz`)

Kontrol: `curl https://odrop.ozcan.work/healthz` → `{"ok":true,"invites":true,"turn":true}`

## iPhone'da kalite notu

Safari, Fotoğraflar'dan seçilen içeriği bazen uyumlu biçime dönüştürebilir. Örneğin HEIC fotoğraf JPEG'e, HEVC video H.264'e dönebilir. Bu, ODrop'tan önce, iOS seçicisinde olur. Garanti orijinal için:

- Seçicide **Seçenekler** görünüyorsa biçimi **Güncel** yap, ya da
- Videoyu önce **Dosyalar**'a kaydet ve **Dosyalardan Seç** ile gönder.

Aktarımın kendisi bit düzeyinde kayıpsızdır. Her dosyanın boyutu alıcıda doğrulanır ve gönderen ancak alıcı diske yazmayı bitirince "Teslim edildi" görür.

## Güvenlik

- Dosyalar sunucuda saklanmaz. Sunucu sadece eşleştirme (sinyal) yapar.
- TURN rölesi kullanılsa bile veri WebRTC DTLS ile uçtan uca şifreli kalır. Röle içeriği göremez.
- Davet token'ı 128 bit rastgeledir. Sayfalarda `Referrer-Policy: no-referrer` ve `noindex` vardır, QR kod tarayıcıda yerel üretilir.
- TURN kimlik bilgileri 12 saat geçerlidir ve sadece eşleşmiş oturumlara verilir.
