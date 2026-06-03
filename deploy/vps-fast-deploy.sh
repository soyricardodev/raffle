#!/usr/bin/env bash
# Despliegue rápido: descarga artefacto pre-construido desde GitHub (sin build en VPS).
#
#   cd ~/raffle && bash deploy/vps-fast-deploy.sh
#
# Opciones:
#   --rollback          Vuelve al release anterior
#   --migrate           Corre pnpm db:migrate antes de reiniciar
#   --no-restart        No reinicia systemd
#   --tag TAG           Tag de release (default: yoiberifas-latest)
#
# Variables:
#   RAFFLE_ROOT=/home/admin/raffle
#   RELEASE_REPO=soyricardodev/raffle
#   SERVICE_NAME=raffle
#   KEEP_RELEASES=5

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAFFLE_ROOT="${RAFFLE_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
RELEASE_REPO="${RELEASE_REPO:-soyricardodev/raffle}"
RELEASE_TAG="${RELEASE_TAG:-yoiberifas-latest}"
SERVICE_NAME="${SERVICE_NAME:-raffle}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
ENV_FILE="${ENV_FILE:-$RAFFLE_ROOT/.env}"

ROLLBACK=0
RUN_MIGRATE=0
NO_RESTART=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --rollback) ROLLBACK=1; shift ;;
    --migrate) RUN_MIGRATE=1; shift ;;
    --no-restart) NO_RESTART=1; shift ;;
    --tag) RELEASE_TAG="${2:?--tag requiere valor}"; shift 2 ;;
    -h|--help)
      sed -n '2,18p' "$0"
      exit 0
      ;;
    *) echo "Opción desconocida: $1" >&2; exit 1 ;;
  esac
done

RELEASES_DIR="$RAFFLE_ROOT/releases"
CURRENT_LINK="$RAFFLE_ROOT/current"
PREVIOUS_FILE="$RAFFLE_ROOT/logs/previous-release"
LOG_DIR="$RAFFLE_ROOT/logs"
DOWNLOAD_URL="https://github.com/${RELEASE_REPO}/releases/download/${RELEASE_TAG}/raffle-release.tar.gz"

log() { echo "[fast] $*"; }
die() { echo "[fast] ERROR: $*" >&2; exit 1; }

mkdir -p "$RELEASES_DIR" "$LOG_DIR"

rollback_release() {
  [[ -f "$PREVIOUS_FILE" ]] || die "No hay release anterior registrado en $PREVIOUS_FILE"
  local prev
  prev="$(cat "$PREVIOUS_FILE")"
  [[ -d "$prev" ]] || die "Release anterior no existe: $prev"

  log "Rollback → $prev"
  ln -sfn "$prev" "$CURRENT_LINK"

  if [[ "$NO_RESTART" != "1" ]]; then
    sudo systemctl restart "$SERVICE_NAME"
    sleep 2
    curl -sf "http://127.0.0.1:3000/api/health/db" | grep -q '"ok":true' \
      || die "Health check falló tras rollback"
  fi
  log "✅ Rollback OK"
  exit 0
}

[[ "$ROLLBACK" == "1" ]] && rollback_release

[[ -f "$ENV_FILE" ]] || die "Falta $ENV_FILE"

command -v curl >/dev/null 2>&1 || die "Instala curl"
command -v tar >/dev/null 2>&1 || die "Instala tar"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
WORK_DIR="$RELEASES_DIR/.work_${TIMESTAMP}"
TARGET_DIR="$RELEASES_DIR/${TIMESTAMP}"
ARCHIVE="$WORK_DIR/raffle-release.tar.gz"

log "Descargando $DOWNLOAD_URL"
mkdir -p "$WORK_DIR"
if ! curl -fL --retry 3 --retry-delay 5 -o "$ARCHIVE" "$DOWNLOAD_URL"; then
  die "No pude descargar el release. ¿Existe el tag ${RELEASE_TAG}? Ejecuta el workflow Release Yoiberifas en GitHub."
fi

STAGING_DIR="$RELEASES_DIR/${TIMESTAMP}"
log "Extrayendo → $STAGING_DIR"
mkdir -p "$STAGING_DIR"
tar -xzf "$ARCHIVE" -C "$STAGING_DIR"
rm -rf "$WORK_DIR"

[[ -f "$STAGING_DIR/app/.output/server/index.mjs" ]] \
  || die "Artefacto inválido: falta app/.output/server/index.mjs"

if [[ -f "$STAGING_DIR/RELEASE_SHA" ]]; then
  RELEASE_SHA="$(tr -d '\n' < "$STAGING_DIR/RELEASE_SHA")"
  log "Release SHA: $RELEASE_SHA"
  TARGET_DIR="$RELEASES_DIR/${RELEASE_SHA}_${TIMESTAMP}"
  mv "$STAGING_DIR" "$TARGET_DIR"
else
  TARGET_DIR="$STAGING_DIR"
fi

if [[ "$RUN_MIGRATE" == "1" ]]; then
  log "Migraciones SQLite"
  # shellcheck disable=SC1090
  set -a && source "$ENV_FILE" && set +a
  if command -v pnpm >/dev/null 2>&1; then
  (
    cd "$RAFFLE_ROOT"
    export DATABASE_URL
    export DATABASE_AUTH_TOKEN="${DATABASE_AUTH_TOKEN:-}"
    pnpm db:migrate
  )
  else
    log "WARN: pnpm no encontrado — omite migraciones o instala Node+corepack"
  fi
fi

if [[ -L "$CURRENT_LINK" ]] || [[ -e "$CURRENT_LINK" ]]; then
  readlink -f "$CURRENT_LINK" > "$PREVIOUS_FILE" 2>/dev/null || true
fi

log "Activando release: $TARGET_DIR"
ln -sfn "$TARGET_DIR" "$CURRENT_LINK"

# Reinstalar systemd si hace falta (apunta a current/app)
if [[ -x "$SCRIPT_DIR/install-systemd.sh" ]]; then
  RAFFLE_ROOT="$RAFFLE_ROOT" ENV_FILE="$ENV_FILE" bash "$SCRIPT_DIR/install-systemd.sh" >/dev/null 2>&1 || true
fi

if [[ "$NO_RESTART" != "1" ]]; then
  log "Reiniciando $SERVICE_NAME"
  sudo systemctl restart "$SERVICE_NAME" 2>/dev/null || sudo systemctl start "$SERVICE_NAME"
  sleep 2
  curl -sf "http://127.0.0.1:3000/api/health/db" | grep -q '"ok":true' \
    || die "Health check falló — journalctl -u $SERVICE_NAME -n 80"
  log "Health OK"
fi

# Limpiar releases viejos (mantener los N más recientes)
mapfile -t OLD_RELEASES < <(ls -1dt "$RELEASES_DIR"/*/ 2>/dev/null | tail -n +$((KEEP_RELEASES + 1)) || true)
CURRENT_REAL="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
for dir in "${OLD_RELEASES[@]}"; do
  dir="${dir%/}"
  [[ -z "$dir" ]] && continue
  [[ "$(readlink -f "$dir" 2>/dev/null)" == "$CURRENT_REAL" ]] && continue
  [[ "$(readlink -f "$dir" 2>/dev/null)" == "$(readlink -f "$TARGET_DIR")" ]] && continue
  [[ -f "$PREVIOUS_FILE" ]] && [[ "$(readlink -f "$dir" 2>/dev/null)" == "$(cat "$PREVIOUS_FILE")" ]] && continue
  log "Eliminando release antiguo: $dir"
  rm -rf "$dir"
done

log "✅ Deploy rápido OK"
log "   current → $(readlink -f "$CURRENT_LINK")"
if [[ -f "$PREVIOUS_FILE" ]]; then
  log "   rollback: bash deploy/vps-fast-deploy.sh --rollback"
fi
