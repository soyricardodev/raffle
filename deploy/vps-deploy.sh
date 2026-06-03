#!/usr/bin/env bash
# Despliegue Raffle v2 en VPS (Bun + pnpm, código desde GitHub).
#
# Uso:
#   sudo bash deploy/vps-deploy.sh
#
# Variables opcionales:
#   RAFFLE_ROOT=/opt/raffle   Raíz de instalación
#   GIT_REPO=git@github.com:USER/raffle.git
#   GIT_BRANCH=main
#   SKIP_BUILD=1              Solo pull + migrate + restart
#   SKIP_MIGRATE=1            No corre drizzle migrate
#   SKIP_PULL=1               No hace git pull

set -euo pipefail

RAFFLE_ROOT="${RAFFLE_ROOT:-/opt/raffle}"
GIT_REPO="${GIT_REPO:-}"
GIT_BRANCH="${GIT_BRANCH:-main}"
SRC_DIR="${RAFFLE_ROOT}/src"
ENV_FILE="${RAFFLE_ROOT}/.env"
SERVICE_NAME="${SERVICE_NAME:-raffle}"

log() { echo "[deploy] $*"; }
die() { echo "[deploy] ERROR: $*" >&2; exit 1; }

[[ -f "$ENV_FILE" ]] || die "Falta $ENV_FILE — copia deploy/env.production.example"

# shellcheck disable=SC1090
set -a && source "$ENV_FILE" && set +a

[[ -n "${DATABASE_URL:-}" ]] || die "DATABASE_URL no definido en $ENV_FILE"
[[ -n "${BETTER_AUTH_SECRET:-}" ]] || die "BETTER_AUTH_SECRET no definido (mín. 32 chars)"

command -v bun >/dev/null 2>&1 || die "Instala Bun: curl -fsSL https://bun.sh/install | bash"
command -v git >/dev/null 2>&1 || die "git no encontrado"

if [[ ! -d "$SRC_DIR/.git" ]]; then
  [[ -n "$GIT_REPO" ]] || die "Primera vez: export GIT_REPO=git@github.com:USER/raffle.git"
  log "Clonando $GIT_REPO → $SRC_DIR"
  mkdir -p "$(dirname "$SRC_DIR")"
  git clone --branch "$GIT_BRANCH" "$GIT_REPO" "$SRC_DIR"
fi

cd "$SRC_DIR"

if [[ "${SKIP_PULL:-0}" != "1" ]]; then
  log "git pull ($GIT_BRANCH)"
  git fetch origin "$GIT_BRANCH"
  git checkout "$GIT_BRANCH"
  git pull --ff-only origin "$GIT_BRANCH"
fi

log "Instalando dependencias (pnpm via corepack)"
corepack enable
corepack prepare pnpm@10.12.1 --activate
pnpm install --frozen-lockfile

if [[ "${SKIP_MIGRATE:-0}" != "1" ]]; then
  log "Aplicando migraciones SQLite (drizzle)"
  export DATABASE_URL
  export DATABASE_AUTH_TOKEN="${DATABASE_AUTH_TOKEN:-}"
  pnpm db:migrate
fi

if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  log "Build producción"
  export NODE_ENV=production
  pnpm build
fi

log "Reiniciando servicio $SERVICE_NAME"
if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
  sudo systemctl restart "$SERVICE_NAME"
else
  log "Servicio no activo — instala deploy/raffle.service.example primero"
  log "Arranque manual: cd $SRC_DIR/app && bun run .output/server/index.mjs"
  exit 0
fi

sleep 2
APP_URL="${APP_URL:-http://127.0.0.1:3000}"
log "Health check $APP_URL/api/health/db"
if curl -sf "$APP_URL/api/health/db" | grep -q '"ok":true'; then
  log "✅ Deploy OK"
else
  die "Health check falló — revisa: journalctl -u $SERVICE_NAME -n 50"
fi
