#!/usr/bin/env bash
# Setup inicial del VPS (ejecutar una vez como root).
#
#   sudo bash deploy/vps-setup.sh
#
# Variables:
#   RAFFLE_ROOT=/opt/raffle
#   RAFFLE_USER=raffle
#   GIT_REPO=git@github.com:USER/raffle.git

set -euo pipefail

RAFFLE_ROOT="${RAFFLE_ROOT:-/opt/raffle}"
RAFFLE_USER="${RAFFLE_USER:-raffle}"
GIT_REPO="${GIT_REPO:-}"

log() { echo "[setup] $*"; }

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Ejecuta como root: sudo bash deploy/vps-setup.sh" >&2
  exit 1
fi

log "Paquetes base"
apt-get update -qq
apt-get install -y -qq git curl nginx certbot python3-certbot-nginx rsync

if ! id "$RAFFLE_USER" &>/dev/null; then
  log "Creando usuario $RAFFLE_USER"
  useradd -m -s /bin/bash "$RAFFLE_USER"
fi

log "Directorios en $RAFFLE_ROOT"
mkdir -p "$RAFFLE_ROOT"/{data,uploads,backups,src}
chown -R "$RAFFLE_USER:$RAFFLE_USER" "$RAFFLE_ROOT"

log "Instalando Bun para $RAFFLE_USER"
sudo -u "$RAFFLE_USER" bash -c 'curl -fsSL https://bun.sh/install | bash'

log "Node.js 22 + corepack"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
corepack enable
corepack prepare pnpm@10.12.1 --activate

if [[ ! -f "$RAFFLE_ROOT/.env" ]]; then
  if [[ -f "$RAFFLE_ROOT/src/deploy/env.production.example" ]]; then
    cp "$RAFFLE_ROOT/src/deploy/env.production.example" "$RAFFLE_ROOT/.env"
  else
    log "Copia deploy/env.production.example → $RAFFLE_ROOT/.env después del clone"
  fi
  chown "$RAFFLE_USER:$RAFFLE_USER" "$RAFFLE_ROOT/.env" 2>/dev/null || true
  chmod 600 "$RAFFLE_ROOT/.env" 2>/dev/null || true
fi

if [[ -n "$GIT_REPO" ]] && [[ ! -d "$RAFFLE_ROOT/src/.git" ]]; then
  log "Clonando $GIT_REPO"
  sudo -u "$RAFFLE_USER" git clone "$GIT_REPO" "$RAFFLE_ROOT/src"
fi

log ""
log "✅ Setup base listo"
log "   1. Edita $RAFFLE_ROOT/.env"
log "   2. rsync uploads legacy → $RAFFLE_ROOT/uploads/"
log "   3. sudo cp nginx/raffle.conf.example /etc/nginx/sites-available/raffle"
log "   4. sudo cp deploy/raffle.service.example /etc/systemd/system/raffle.service"
log "   5. Cutover: sudo bash $RAFFLE_ROOT/src/deploy/vps-cutover.sh"
log "   Ver docs/DEPLOY_VPS.md"
