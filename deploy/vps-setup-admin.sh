#!/usr/bin/env bash
# Setup para /home/admin/raffle (sin /opt/raffle, sin git SSH).
# Ejecutar como admin:
#
#   cd ~/raffle
#   bash deploy/vps-setup-admin.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAFFLE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LEGACY_UPLOADS="${LEGACY_UPLOADS:-$HOME/raffle-app/backend/uploads}"

log() { echo "[setup] $*"; }

log "Directorios en $RAFFLE_ROOT"
mkdir -p "$RAFFLE_ROOT/data" "$RAFFLE_ROOT/backups"

if [[ ! -f "$RAFFLE_ROOT/.env" ]]; then
  if [[ -f "$RAFFLE_ROOT/deploy/env.yoiberifas.example" ]]; then
    cp "$RAFFLE_ROOT/deploy/env.yoiberifas.example" "$RAFFLE_ROOT/.env"
    log "Creado $RAFFLE_ROOT/.env — edítalo antes de continuar"
  else
    cp "$RAFFLE_ROOT/deploy/env.production.example" "$RAFFLE_ROOT/.env"
  fi
  chmod 600 "$RAFFLE_ROOT/.env"
fi

if [[ -d "$LEGACY_UPLOADS" ]]; then
  log "Uploads legacy OK: $LEGACY_UPLOADS (no hace falta copiar)"
else
  log "WARN: no encontré $LEGACY_UPLOADS"
fi

if ! command -v bun >/dev/null 2>&1; then
  log "Instalando Bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
fi

if ! command -v node >/dev/null 2>&1; then
  log "WARN: instala Node 22 (nodesource) para pnpm build"
else
  corepack enable 2>/dev/null || true
  corepack prepare pnpm@10.12.1 --activate 2>/dev/null || true
fi

log ""
log "✅ Setup listo"
log ""
log "Migración + deploy completo (un comando):"
log "  bash deploy/vps-yoiberifas-full.sh"
log ""
log "Prueba sin cutover nginx:"
log "  bash deploy/vps-yoiberifas-full.sh --skip-nginx"
