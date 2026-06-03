#!/usr/bin/env bash
# Despliegue Raffle v2 en VPS (Bun + pnpm).
#
# Uso (desde el repo, ej. /home/admin/raffle):
#   bash deploy/vps-deploy.sh
#
# Variables opcionales:
#   RAFFLE_ROOT=/home/admin/raffle   Raíz del repo (auto-detectada si omites)
#   ENV_FILE=/home/admin/raffle/.env
#   GIT_REPO=https://github.com/USER/raffle.git   Solo HTTPS si no tienes SSH key
#   GIT_BRANCH=master
#   SKIP_BUILD=1
#   SKIP_MIGRATE=1
#   SKIP_PULL=1          Útil si el código ya está en disco (sin git remoto)
#   SERVICE_NAME=raffle

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/release-common.sh
source "$SCRIPT_DIR/lib/release-common.sh"
DEFAULT_REPO="$(cd "$SCRIPT_DIR/.." && pwd)"
KEEP_RELEASES="${KEEP_RELEASES:-5}"

RAFFLE_ROOT="${RAFFLE_ROOT:-$DEFAULT_REPO}"
GIT_REPO="${GIT_REPO:-}"
GIT_BRANCH="${GIT_BRANCH:-master}"
SERVICE_NAME="${SERVICE_NAME:-raffle}"

# Repo en RAFFLE_ROOT o en RAFFLE_ROOT/src (layout /opt/raffle)
if [[ -d "$RAFFLE_ROOT/.git" ]]; then
  SRC_DIR="$RAFFLE_ROOT"
elif [[ -d "$RAFFLE_ROOT/src/.git" ]]; then
  SRC_DIR="$RAFFLE_ROOT/src"
else
  SRC_DIR="$RAFFLE_ROOT"
fi

ENV_FILE="${ENV_FILE:-}"
if [[ -z "$ENV_FILE" ]]; then
  if [[ -f "$RAFFLE_ROOT/.env" ]]; then
    ENV_FILE="$RAFFLE_ROOT/.env"
  elif [[ -f "$SRC_DIR/.env" ]]; then
    ENV_FILE="$SRC_DIR/.env"
  else
    ENV_FILE="$RAFFLE_ROOT/.env"
  fi
fi

log() { echo "[deploy] $*"; }
die() { echo "[deploy] ERROR: $*" >&2; exit 1; }

ensure_build_resources() {
  local mem_kb swap_kb total_mb swap_size
  mem_kb="$(awk '/MemTotal/ { print $2 }' /proc/meminfo 2>/dev/null || echo 0)"
  swap_kb="$(awk '/SwapTotal/ { print $2 }' /proc/meminfo 2>/dev/null || echo 0)"
  total_mb=$(((mem_kb + swap_kb) / 1024))
  swap_size="${BUILD_SWAP_SIZE:-4G}"

  log "Memoria build: RAM+swap=${total_mb}MB (swap=$((swap_kb / 1024))MB)"

  if [[ "${AUTO_SWAP:-1}" == "1" && "$total_mb" -lt 3500 ]]; then
    if ! swapon --show=NAME | grep -qx '/swapfile'; then
      log "RAM+swap bajo para Vite; creando swap temporal /swapfile (${swap_size})"
      if sudo fallocate -l "$swap_size" /swapfile 2>/dev/null; then
        true
      else
        log "fallocate falló; usando dd para crear /swapfile"
        sudo dd if=/dev/zero of=/swapfile bs=1M count="${BUILD_SWAP_MB:-4096}" status=progress
      fi
      sudo chmod 600 /swapfile
      sudo mkswap /swapfile >/dev/null
      sudo swapon /swapfile
      swapon --show
    else
      log "Swap /swapfile ya está activo"
    fi
  fi

  export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=${NODE_MAX_OLD_SPACE_SIZE:-3072}}"
  log "NODE_OPTIONS=$NODE_OPTIONS"
}

[[ -f "$ENV_FILE" ]] || die "Falta $ENV_FILE — copia deploy/env.yoiberifas.example o deploy/env.production.example"

# shellcheck disable=SC1090
set -a && source "$ENV_FILE" && set +a

[[ -n "${DATABASE_URL:-}" ]] || die "DATABASE_URL no definido en $ENV_FILE"
[[ -n "${BETTER_AUTH_SECRET:-}" ]] || die "BETTER_AUTH_SECRET no definido (mín. 32 chars)"

command -v bun >/dev/null 2>&1 || die "Instala Bun: curl -fsSL https://bun.sh/install | bash"

# Clone solo si no hay repo y se pasó GIT_REPO
if [[ ! -d "$SRC_DIR/.git" ]]; then
  if [[ -n "$GIT_REPO" ]]; then
    if ! git ls-remote --exit-code --heads "$GIT_REPO" "$GIT_BRANCH" >/dev/null 2>&1; then
      FALLBACK_BRANCH="$(git ls-remote --symref "$GIT_REPO" HEAD | awk '/^ref:/ { sub("refs/heads/", "", $2); print $2; exit }')"
      if [[ -n "$FALLBACK_BRANCH" ]]; then
        log "Rama '$GIT_BRANCH' no existe en remote — usando '$FALLBACK_BRANCH'"
        GIT_BRANCH="$FALLBACK_BRANCH"
      fi
    fi
    log "Clonando $GIT_REPO → $SRC_DIR"
    mkdir -p "$(dirname "$SRC_DIR")"
    git clone --branch "$GIT_BRANCH" "$GIT_REPO" "$SRC_DIR"
  else
    die "No hay .git en $SRC_DIR. Clona manualmente o export GIT_REPO=https://github.com/USER/raffle.git"
  fi
fi

cd "$SRC_DIR"

if [[ "${SKIP_PULL:-0}" != "1" ]]; then
  if git remote get-url origin &>/dev/null; then
    log "git pull ($GIT_BRANCH)"
    if ! git ls-remote --exit-code --heads origin "$GIT_BRANCH" >/dev/null 2>&1; then
      FALLBACK_BRANCH="$(git ls-remote --symref origin HEAD | awk '/^ref:/ { sub("refs/heads/", "", $2); print $2; exit }')"
      if [[ -n "$FALLBACK_BRANCH" ]]; then
        log "Rama '$GIT_BRANCH' no existe en origin — usando '$FALLBACK_BRANCH'"
        GIT_BRANCH="$FALLBACK_BRANCH"
      fi
    fi
    git fetch origin "$GIT_BRANCH" 2>/dev/null || log "WARN: git fetch falló (¿sin SSH key? usa GIT_REPO=https://... o SKIP_PULL=1)"
    git checkout "$GIT_BRANCH" 2>/dev/null || true
    git pull --ff-only origin "$GIT_BRANCH" 2>/dev/null || log "WARN: git pull falló — continúo con código local (SKIP_PULL=1 para silenciar)"
  else
    log "Sin remote git — usa SKIP_PULL=1 si el código ya está actualizado"
  fi
fi

log "Instalando dependencias (pnpm via corepack)"
corepack enable 2>/dev/null || true
corepack prepare pnpm@10.12.1 --activate
pnpm install --frozen-lockfile

if [[ "${SKIP_MIGRATE:-0}" != "1" ]]; then
  log "Aplicando migraciones SQLite (drizzle)"
  export DATABASE_URL
  export DATABASE_AUTH_TOKEN="${DATABASE_AUTH_TOKEN:-}"
  mkdir -p "$(dirname "${DATABASE_URL#file:}")" 2>/dev/null || true
  pnpm db:migrate
fi

if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  log "Build producción"
  export NODE_ENV=production
  ensure_build_resources
  pnpm build

  log "Empaquetando release local (mismo layout que fast deploy)"
  TARGET_DIR="$(release_create_from_repo "$SRC_DIR" "$RAFFLE_ROOT" "local")"
  log "Activando release: $TARGET_DIR"
  release_activate "$RAFFLE_ROOT" "$TARGET_DIR" 1
  release_layout_init "$RAFFLE_ROOT"
  while IFS= read -r old; do
    [[ -n "$old" ]] && log "Eliminando release antiguo: $old"
  done < <(release_prune_old "$KEEP_RELEASES" "$RELEASES_DIR" "$CURRENT_LINK" "$PREVIOUS_FILE" "$TARGET_DIR")
fi

log "Reiniciando servicio $SERVICE_NAME"
if systemctl list-unit-files "$SERVICE_NAME.service" &>/dev/null 2>&1 || systemctl cat "$SERVICE_NAME" &>/dev/null 2>&1; then
  release_restart_service "$SERVICE_NAME"
elif command -v pm2 >/dev/null 2>&1 && pm2 describe "$SERVICE_NAME" &>/dev/null; then
  pm2 restart "$SERVICE_NAME"
else
  log "Servicio no configurado — instala systemd:"
  RAFFLE_ROOT="$RAFFLE_ROOT" ENV_FILE="$ENV_FILE" bash "$SCRIPT_DIR/install-systemd.sh"
  release_restart_service "$SERVICE_NAME"
fi

HEALTH_URL="${APP_URL:-http://127.0.0.1:3000}"
log "Health check $HEALTH_URL/api/health/db"
if release_health_check "$HEALTH_URL"; then
  log "✅ Deploy OK"
  release_layout_init "$RAFFLE_ROOT"
  log "   current → $(readlink -f "$CURRENT_LINK")"
else
  die "Health check falló — revisa: journalctl -u $SERVICE_NAME -n 50 (o pm2 logs)"
fi
