#!/usr/bin/env bash
# Instala systemd de usuario (sin sudo).
#
#   bash deploy/install-systemd.sh
#
# Una vez en el VPS (sudo):
#   sudo loginctl enable-linger "$USER"
#   sudo systemctl disable --now raffle
#
# Variables:
#   RAFFLE_ROOT=/home/admin/raffle
#   SERVICE_NAME=raffle

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/release-common.sh
source "$SCRIPT_DIR/lib/release-common.sh"

RAFFLE_ROOT="${RAFFLE_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
SERVICE_NAME="${SERVICE_NAME:-raffle}"
ENV_FILE="${ENV_FILE:-$RAFFLE_ROOT/.env}"
BUN_BIN="${BUN_BIN:-$HOME/.bun/bin/bun}"
# Always the symlink so each release is picked up on restart.
APP_DIR="${RAFFLE_ROOT}/current/app"
UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
UNIT="${UNIT_DIR}/${SERVICE_NAME}.service"

[[ -f "$ENV_FILE" ]] || { echo "Falta $ENV_FILE" >&2; exit 1; }
[[ -x "$BUN_BIN" ]] || { echo "No encontré Bun en $BUN_BIN" >&2; exit 1; }
if [[ ! -f "$APP_DIR/.output/server/index.mjs" ]]; then
  echo "No hay release activo en $APP_DIR. Ejecuta deploy/vps-fast-deploy.sh primero." >&2
  exit 1
fi

release_user_systemd_env

mkdir -p "$UNIT_DIR"
cat > "$UNIT" <<EOF
[Unit]
Description=Raffle v2 (yoiberifas.com)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
EnvironmentFile=${ENV_FILE}
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=${BUN_BIN} run .output/server/index.mjs
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable "$SERVICE_NAME"
echo "Instalado $UNIT"
echo "  WorkingDirectory=${APP_DIR}"
echo "  systemctl --user restart $SERVICE_NAME"
echo "  journalctl --user -u $SERVICE_NAME -f"
