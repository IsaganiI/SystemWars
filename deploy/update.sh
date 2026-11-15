#!/usr/bin/env bash
# Deploys the latest code from GitHub to the server. Keeps the database and secrets.
#   sudo bash /opt/systemwars/deploy/update.sh            # latest main
#   sudo BRANCH=some-branch bash /opt/systemwars/deploy/update.sh
set -euo pipefail
APP_DIR=/opt/systemwars
APP_USER=systemwars
BRANCH="${BRANCH:-main}"
[ "$(id -u)" -eq 0 ] || { echo "Run as root: sudo bash update.sh"; exit 1; }

echo "==> Backing up the database first"
mkdir -p /var/backups/systemwars
[ -f "$APP_DIR/.data/systemwars.sqlite" ] && sqlite3 "$APP_DIR/.data/systemwars.sqlite" ".backup '/var/backups/systemwars/pre-update-$(date +%F-%H%M).sqlite'"

echo "==> Pulling ${BRANCH}"
sudo -u "$APP_USER" -H git -C "$APP_DIR" fetch origin "$BRANCH"
sudo -u "$APP_USER" -H git -C "$APP_DIR" checkout "$BRANCH"
sudo -u "$APP_USER" -H git -C "$APP_DIR" reset --hard "origin/$BRANCH"

echo "==> Building"
sudo -u "$APP_USER" -H bash -c "cd '$APP_DIR' && npm ci --no-audit --no-fund && npx --yes auth@latest migrate --yes && npm run build"

echo "==> Restarting"
systemctl restart systemwars
for _ in $(seq 1 30); do curl -fsS -o /dev/null http://127.0.0.1:3000/ && break; sleep 2; done
echo "Deployed $(git -C "$APP_DIR" log --oneline -1)"
