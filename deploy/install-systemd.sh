#!/usr/bin/env bash
# Instala systemd para el usuario actual (ej. admin en /home/admin/raffle).
#
#   bash deploy/install-systemd.sh
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
RUN_USER="${RUN_USER:-$(whoami)}"
ENV_FILE="${ENV_FILE:-$RAFFLE_ROOT/.env}"
BUN_BIN="${BUN_BIN:-$HOME/.bun/bin/bun}"

[[ -f "$ENV_FILE" ]] || { echo "Falta $ENV_FILE" >&2; exit 1; }
[[ -x "$BUN_BIN" ]] || { echo "No encontré Bun en $BUN_BIN" >&2; exit 1; }

if ! APP_DIR="$(release_resolve_app_dir "$RAFFLE_ROOT")"; then
  echo "No hay release activo. Ejecuta deploy/vps-deploy.sh o deploy/vps-fast-deploy.sh primero." >&2
  exit 1
fi

UNIT="/etc/systemd/system/${SERVICE_NAME}.service"

sudo tee "$UNIT" > /dev/null <<EOF
[Unit]
Description=Raffle v2 (yoiberifas.com)
After=network.target

[Service]
Type=simple
User=${RUN_USER}
Group=${RUN_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${ENV_FILE}
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=${BUN_BIN} run .output/server/index.mjs
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
echo "Instalado $UNIT"
echo "  WorkingDirectory=${APP_DIR}"
echo "  sudo systemctl start $SERVICE_NAME"
echo "  journalctl -u $SERVICE_NAME -f"
