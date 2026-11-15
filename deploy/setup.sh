#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 server (Vultr Cloud Compute) for SystemWars.
# Safe to run again: it keeps the existing secrets, database and TURN password.
#
#   sudo bash setup.sh                       # uses https://<server-ip>.sslip.io (no domain needed)
#   sudo DOMAIN=play.example.com bash setup.sh   # with your own domain (point its A record here first)
#
# Installs: Node.js 22, Caddy (automatic HTTPS), coturn (voice relay), the app as a systemd service,
# a firewall, and daily database backups.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/IsaganiI/SystemWars.git}"
BRANCH="${BRANCH:-main}"
APP_DIR=/opt/systemwars
APP_USER=systemwars
PORT=3000
TURN_MIN_PORT=49160
TURN_MAX_PORT=49200

[ "$(id -u)" -eq 0 ] || { echo "Run as root: sudo bash setup.sh"; exit 1; }
. /etc/os-release
[ "${ID:-}" = "ubuntu" ] || echo "Warning: written for Ubuntu 24.04; this is ${PRETTY_NAME:-unknown}."

# Vultr puts the public IPv4 address on the main interface.
PUBLIC_IP="$(ip -4 route get 1.1.1.1 | awk '{for (i = 1; i < NF; i++) if ($i == "src") print $(i + 1)}')"
DOMAIN="${DOMAIN:-${PUBLIC_IP//./-}.sslip.io}"
echo "==> Setting up SystemWars at https://${DOMAIN} (server ${PUBLIC_IP})"

export DEBIAN_FRONTEND=noninteractive
echo "==> System packages"
apt-get update -y
apt-get install -y ca-certificates curl gnupg git build-essential python3 sqlite3 ufw coturn \
  debian-keyring debian-archive-keyring apt-transport-https

echo "==> Node.js 22"
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "==> Caddy (HTTPS)"
if ! command -v caddy >/dev/null; then
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi

echo "==> App user and code"
id "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --home-dir "/home/$APP_USER" --shell /usr/sbin/nologin "$APP_USER"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
else
  sudo -u "$APP_USER" -H git -C "$APP_DIR" fetch origin "$BRANCH"
  sudo -u "$APP_USER" -H git -C "$APP_DIR" checkout "$BRANCH"
  sudo -u "$APP_USER" -H git -C "$APP_DIR" reset --hard "origin/$BRANCH"
fi
mkdir -p "$APP_DIR/.data"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

echo "==> Secrets"
ENV_FILE="$APP_DIR/.env.local"
TURN_PASSWORD_FILE=/etc/systemwars-turn-password
[ -f "$TURN_PASSWORD_FILE" ] || { umask 077; openssl rand -hex 24 > "$TURN_PASSWORD_FILE"; }
TURN_PASSWORD="$(cat "$TURN_PASSWORD_FILE")"
AUTH_SECRET="$(grep -s '^BETTER_AUTH_SECRET=' "$ENV_FILE" | cut -d= -f2- || true)"
[ -n "$AUTH_SECRET" ] || AUTH_SECRET="$(openssl rand -hex 32)"
umask 077
cat > "$ENV_FILE" <<EOF
BETTER_AUTH_SECRET=${AUTH_SECRET}
BETTER_AUTH_URL=https://${DOMAIN}
SYSTEMWARS_STUN_URLS=stun:${DOMAIN}:3478
SYSTEMWARS_TURN_URLS=turn:${DOMAIN}:3478?transport=udp,turn:${DOMAIN}:3478?transport=tcp
SYSTEMWARS_TURN_USERNAME=systemwars
SYSTEMWARS_TURN_CREDENTIAL=${TURN_PASSWORD}
EOF
umask 022
chown "$APP_USER:$APP_USER" "$ENV_FILE"
chmod 600 "$ENV_FILE"

echo "==> Build (a few minutes)"
sudo -u "$APP_USER" -H bash -c "cd '$APP_DIR' && npm ci --no-audit --no-fund && npx --yes auth@latest migrate --yes && npm run build"

echo "==> Service"
cat > /etc/systemd/system/systemwars.service <<EOF
[Unit]
Description=SystemWars game server
After=network.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start -- --port ${PORT} --hostname 127.0.0.1
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=${APP_DIR}

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable systemwars
systemctl restart systemwars

echo "==> HTTPS reverse proxy"
cat > /etc/caddy/Caddyfile <<EOF
${DOMAIN} {
  encode zstd gzip
  reverse_proxy 127.0.0.1:${PORT}
}
EOF
systemctl enable caddy
systemctl reload caddy || systemctl restart caddy

echo "==> Voice relay (coturn)"
cat > /etc/turnserver.conf <<EOF
listening-port=3478
external-ip=${PUBLIC_IP}
realm=${DOMAIN}
fingerprint
lt-cred-mech
user=systemwars:${TURN_PASSWORD}
min-port=${TURN_MIN_PORT}
max-port=${TURN_MAX_PORT}
no-cli
no-multicast-peers
# Never relay into private or local networks (stops the relay being used to reach internal services).
denied-peer-ip=0.0.0.0-0.255.255.255
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=100.64.0.0-100.127.255.255
denied-peer-ip=127.0.0.0-127.255.255.255
denied-peer-ip=169.254.0.0-169.254.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
denied-peer-ip=::1
EOF
chmod 640 /etc/turnserver.conf
chown root:turnserver /etc/turnserver.conf 2>/dev/null || true
[ -f /etc/default/coturn ] && sed -i 's/^#\?TURNSERVER_ENABLED=.*/TURNSERVER_ENABLED=1/' /etc/default/coturn
systemctl enable coturn
systemctl restart coturn

echo "==> Firewall"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw allow 3478/tcp
ufw allow 3478/udp
ufw allow ${TURN_MIN_PORT}:${TURN_MAX_PORT}/udp
ufw --force enable

echo "==> Daily database backups (kept 14 days in /var/backups/systemwars)"
mkdir -p /var/backups/systemwars
cat > /etc/cron.daily/systemwars-backup <<EOF
#!/bin/sh
sqlite3 ${APP_DIR}/.data/systemwars.sqlite ".backup '/var/backups/systemwars/systemwars-\$(date +%F).sqlite'"
find /var/backups/systemwars -name '*.sqlite' -mtime +14 -delete
EOF
chmod 755 /etc/cron.daily/systemwars-backup

echo "==> Waiting for the app"
for _ in $(seq 1 30); do curl -fsS -o /dev/null "http://127.0.0.1:${PORT}/" && break; sleep 2; done
systemctl --no-pager --lines=0 status systemwars caddy coturn | grep -E "●|Active:" || true
echo
echo "SystemWars is live at: https://${DOMAIN}"
echo "(The HTTPS certificate can take up to a minute on the first visit.)"
