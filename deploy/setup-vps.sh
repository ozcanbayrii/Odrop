#!/usr/bin/env bash
# ==========================================================================
#  ODrop — VPS kurulum scripti (davet linkleri + TURN sunucusu)
#
#  Ne yapar (yalnızca ODrop ve coturn'e dokunur):
#    1. ODrop web klasörünü bulur ve yedeğini alır
#    2. web/.env dosyasını oluşturur (yoksa): sahip anahtarı + TURN sırrı
#    3. coturn kurar ve /etc/turnserver.conf yazar (önceden başka amaçla
#       yapılandırılmış bir coturn varsa DURUR, hiçbir şeyi değiştirmez)
#    4. Güvenlik duvarında (ufw aktifse) yalnızca TURN portlarını açar
#    5. ODrop Node sürecini yeniden başlatır (pm2 / systemd algılanırsa)
#
#  Kullanım:
#    sudo bash setup-vps.sh [ODROP_KLASÖRÜ] [ALAN_ADI]
#    ör: sudo bash setup-vps.sh /var/www/odrop odrop.ozcan.work
# ==========================================================================
set -euo pipefail

DOMAIN="${2:-odrop.ozcan.work}"
RELAY_MIN=49160
RELAY_MAX=49260
MARKER="# managed-by: odrop-setup"

say()  { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[!] %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m[x] %s\033[0m\n' "$*"; exit 1; }

[ "$(id -u)" -eq 0 ] || die "root olarak çalıştır (sudo)."

# --------------------------------------------------------------------------
# 1) ODrop klasörünü bul
# --------------------------------------------------------------------------
ODROP_DIR="${1:-}"
if [ -z "$ODROP_DIR" ]; then
  say "ODrop klasörü aranıyor..."
  ODROP_DIR=$(grep -rl --include=server.js "ODrop Web" /var/www /opt /srv /root /home 2>/dev/null \
               | grep -v node_modules | head -n1 | xargs -r dirname || true)
  # server.js web/ altındaysa repo kökü bir üst klasördür
fi
[ -n "$ODROP_DIR" ] || die "ODrop bulunamadı. Klasörü parametre olarak ver: sudo bash setup-vps.sh /yol/odrop"
if [ -f "$ODROP_DIR/web/server.js" ]; then WEB_DIR="$ODROP_DIR/web"; else WEB_DIR="$ODROP_DIR"; fi
[ -f "$WEB_DIR/server.js" ] || die "$WEB_DIR/server.js bulunamadı."
REPO_DIR=$(git -C "$WEB_DIR" rev-parse --show-toplevel 2>/dev/null || echo "")
echo "   Web klasörü : $WEB_DIR"
echo "   Git deposu  : ${REPO_DIR:-yok}"

# --------------------------------------------------------------------------
# 2) Yedek + güncel kod
# --------------------------------------------------------------------------
TS=$(date +%Y%m%d-%H%M%S)
BACKUP="/root/odrop-backup-$TS.tgz"
say "Yedek alınıyor: $BACKUP"
tar --exclude=node_modules --exclude='public/downloads/*.exe' --exclude='public/downloads/*.zip' \
    -czf "$BACKUP" -C "$(dirname "$WEB_DIR")" "$(basename "$WEB_DIR")"

if [ -n "$REPO_DIR" ] && [ "${SKIP_GIT_PULL:-0}" != "1" ]; then
  say "Kod güncelleniyor (git pull)..."
  if [ -n "$(git -C "$REPO_DIR" status --porcelain --untracked-files=no)" ]; then
    warn "Depoda commit edilmemiş değişiklik var; git pull atlandı. (Yedek: $BACKUP)"
  else
    git -C "$REPO_DIR" pull --ff-only
  fi
fi
[ -f "$WEB_DIR/invites.js" ] || die "Yeni kod yok (web/invites.js bulunamadı). Önce güncel kodu sunucuya aktar."

if command -v npm >/dev/null; then
  (cd "$WEB_DIR" && npm install --omit=dev --no-audit --no-fund >/dev/null)
fi

# --------------------------------------------------------------------------
# 3) .env
# --------------------------------------------------------------------------
ENV_FILE="$WEB_DIR/.env"
touch "$ENV_FILE"
chmod 600 "$ENV_FILE"
getenv() { grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- || true; }
setenv() {
  if grep -qE "^$1=" "$ENV_FILE"; then sed -i "s|^$1=.*|$1=$2|" "$ENV_FILE"; else echo "$1=$2" >> "$ENV_FILE"; fi
}

PORT_VAL=$(getenv PORT)
if [ -z "$PORT_VAL" ]; then
  DETECTED_PORT=$(pm2 jlist 2>/dev/null | node -e '
    let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{
      const dir=process.argv[1];
      const p=JSON.parse(d).find(x=>x.pm2_env&&((x.pm2_env.pm_cwd||"").startsWith(dir)||(x.pm2_env.pm_exec_path||"").startsWith(dir)));
      if(p&&p.pm2_env&&p.pm2_env.PORT)process.stdout.write(String(p.pm2_env.PORT));}catch(e){}})' "$WEB_DIR" 2>/dev/null || true)
  setenv PORT "${DETECTED_PORT:-3550}"
fi

OWNER_KEY=$(getenv ODROP_OWNER_KEY)
if [ -z "$OWNER_KEY" ]; then
  OWNER_KEY=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-28)
  setenv ODROP_OWNER_KEY "$OWNER_KEY"
  NEW_KEY=1
fi
[ -n "$(getenv ODROP_OWNER_NAME)" ] || setenv ODROP_OWNER_NAME "Özcan"
TURN_SECRET=$(getenv TURN_SECRET)
if [ -z "$TURN_SECRET" ]; then
  TURN_SECRET=$(openssl rand -hex 32)
  setenv TURN_SECRET "$TURN_SECRET"
fi
setenv TURN_HOST "$DOMAIN"

# --------------------------------------------------------------------------
# 4) coturn
# --------------------------------------------------------------------------
say "coturn kuruluyor..."
if [ -f /etc/turnserver.conf ] && grep -qvE '^\s*(#|$)' /etc/turnserver.conf && ! grep -q "$MARKER" /etc/turnserver.conf; then
  if systemctl is-active --quiet coturn 2>/dev/null; then
    die "Sunucuda başka amaçla yapılandırılmış, ÇALIŞAN bir coturn var. Diğer projeleri bozmamak için durdum. (.env hazır, TURN ayarlarını elle birleştirmek gerekiyor.)"
  fi
  cp /etc/turnserver.conf "/etc/turnserver.conf.bak-$TS"
fi

export DEBIAN_FRONTEND=noninteractive
command -v turnserver >/dev/null || { apt-get update -qq && apt-get install -y -qq coturn; }

PUBLIC_IP=$(curl -4 -fsS https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
PRIVATE_IP=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}')
if [ -n "$PRIVATE_IP" ] && [ "$PRIVATE_IP" != "$PUBLIC_IP" ]; then EXTERNAL="$PUBLIC_IP/$PRIVATE_IP"; else EXTERNAL="$PUBLIC_IP"; fi

# TLS (turns:5349) — Let's Encrypt sertifikası varsa kullan
TLS_LINES="no-tls
no-dtls"
LE_DIR="/etc/letsencrypt/live/$DOMAIN"
if [ -f "$LE_DIR/fullchain.pem" ]; then
  mkdir -p /etc/coturn/certs
  cp -L "$LE_DIR/fullchain.pem" /etc/coturn/certs/fullchain.pem
  cp -L "$LE_DIR/privkey.pem" /etc/coturn/certs/privkey.pem
  chown -R turnserver:turnserver /etc/coturn/certs 2>/dev/null || true
  chmod 600 /etc/coturn/certs/privkey.pem
  TLS_LINES="tls-listening-port=5349
cert=/etc/coturn/certs/fullchain.pem
pkey=/etc/coturn/certs/privkey.pem
no-tlsv1
no-tlsv1_1
no-dtls"
  # Sertifika yenilendiğinde coturn'e kopyala
  if [ -d /etc/letsencrypt/renewal-hooks/deploy ]; then
    cat > /etc/letsencrypt/renewal-hooks/deploy/odrop-coturn.sh <<EOF
#!/bin/sh
# $MARKER
cp -L $LE_DIR/fullchain.pem /etc/coturn/certs/fullchain.pem
cp -L $LE_DIR/privkey.pem /etc/coturn/certs/privkey.pem
chown -R turnserver:turnserver /etc/coturn/certs 2>/dev/null || true
systemctl restart coturn
EOF
    chmod +x /etc/letsencrypt/renewal-hooks/deploy/odrop-coturn.sh
  fi
  setenv TURN_TLS 1
else
  warn "$LE_DIR bulunamadı, TURN-TLS (5349) kapalı. UDP/TCP 3478 yeterli olur."
  setenv TURN_TLS 0
fi

cat > /etc/turnserver.conf <<EOF
$MARKER
# ODrop TURN sunucusu — kimlik bilgileri ODrop sinyal sunucusu tarafından
# kısa ömürlü (12 saat) olarak üretilir (TURN REST API / use-auth-secret).
listening-port=3478
$TLS_LINES
external-ip=$EXTERNAL
realm=$DOMAIN
server-name=$DOMAIN
fingerprint
use-auth-secret
static-auth-secret=$TURN_SECRET
min-port=$RELAY_MIN
max-port=$RELAY_MAX
total-quota=40
user-quota=6
stale-nonce=600
no-multicast-peers
no-cli
no-software-attribute
# Röle üzerinden iç ağa / VPS'teki diğer servislere erişimi engelle
denied-peer-ip=0.0.0.0-0.255.255.255
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=100.64.0.0-100.127.255.255
denied-peer-ip=127.0.0.0-127.255.255.255
denied-peer-ip=169.254.0.0-169.254.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
denied-peer-ip=::1
denied-peer-ip=fc00::-fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff
denied-peer-ip=$PUBLIC_IP
log-file=syslog
simple-log
EOF
[ -f /etc/default/coturn ] && sed -i 's/^#\?TURNSERVER_ENABLED=.*/TURNSERVER_ENABLED=1/' /etc/default/coturn
systemctl enable coturn >/dev/null 2>&1 || true
systemctl restart coturn
sleep 1
systemctl is-active --quiet coturn && echo "   coturn: çalışıyor" || die "coturn başlamadı: journalctl -u coturn -n 50"

# --------------------------------------------------------------------------
# 5) Güvenlik duvarı (yalnızca ufw aktifse)
# --------------------------------------------------------------------------
if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  say "ufw: TURN portları açılıyor"
  ufw allow 3478/udp comment 'odrop-turn' >/dev/null
  ufw allow 3478/tcp comment 'odrop-turn' >/dev/null
  [ -f /etc/coturn/certs/fullchain.pem ] && ufw allow 5349/tcp comment 'odrop-turn-tls' >/dev/null
  ufw allow $RELAY_MIN:$RELAY_MAX/udp comment 'odrop-turn-relay' >/dev/null
else
  warn "ufw aktif değil. Sağlayıcının panelinde güvenlik duvarı varsa şu portları aç: 3478 udp+tcp, 5349 tcp, $RELAY_MIN-$RELAY_MAX udp"
fi

# --------------------------------------------------------------------------
# 6) ODrop'u yeniden başlat
# --------------------------------------------------------------------------
say "ODrop yeniden başlatılıyor..."
RESTARTED=0
if command -v pm2 >/dev/null; then
  PM2_NAME=$(pm2 jlist 2>/dev/null | node -e '
    let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{
      const dir=process.argv[1];
      const p=JSON.parse(d).find(x=>x.pm2_env&&((x.pm2_env.pm_cwd||"").startsWith(dir)||(x.pm2_env.pm_exec_path||"").startsWith(dir)));
      if(p)process.stdout.write(p.name);}catch(e){}})' "$WEB_DIR" || true)
  if [ -n "$PM2_NAME" ]; then
    pm2 restart "$PM2_NAME" --update-env >/dev/null && pm2 save >/dev/null && RESTARTED=1
    echo "   pm2 süreci yeniden başlatıldı: $PM2_NAME"
  fi
fi
if [ "$RESTARTED" = 0 ]; then
  UNIT=$(grep -rl "$WEB_DIR" /etc/systemd/system/*.service 2>/dev/null | head -n1 | xargs -r basename || true)
  if [ -n "$UNIT" ]; then
    systemctl restart "$UNIT" && RESTARTED=1
    echo "   systemd servisi yeniden başlatıldı: $UNIT"
  fi
fi
[ "$RESTARTED" = 1 ] || warn "ODrop sürecini otomatik bulamadım; kendin yeniden başlat (ör. pm2 restart <ad>)."

sleep 2
PORT=$(getenv PORT); PORT=${PORT:-3550}
HEALTH=$(curl -fsS "http://127.0.0.1:$PORT/healthz" 2>/dev/null || echo "")
echo "   healthz: ${HEALTH:-yanıt yok}"

# --------------------------------------------------------------------------
say "Kurulum tamam!"
echo "   Gelen kutusu : https://$DOMAIN/inbox"
if [ "${NEW_KEY:-0}" = 1 ]; then
  echo "   Sahip anahtarı (bir kez gösteriliyor, sakla):"
  echo "      $OWNER_KEY"
else
  echo "   Sahip anahtarı: $ENV_FILE içinde (ODROP_OWNER_KEY)"
fi
echo "   Yedek        : $BACKUP"
