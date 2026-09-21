#!/usr/bin/env bash
# Despliegue rápido: descarga artefacto pre-construido desde GitHub (sin build en VPS).
#
#   cd ~/raffle && bash deploy/vps-fast-deploy.sh
#
# Opciones:
#   --rollback          Vuelve al release anterior (funciona tras deploy local o fast)
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
# shellcheck source=lib/release-common.sh
source "$SCRIPT_DIR/lib/release-common.sh"

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

release_layout_init "$RAFFLE_ROOT"
DOWNLOAD_URL="https://github.com/${RELEASE_REPO}/releases/download/${RELEASE_TAG}/raffle-release.tar.gz"
CHECKSUM_URL="${DOWNLOAD_URL}.sha256"

log() { echo "[fast] $*"; }
die() { echo "[fast] ERROR: $*" >&2; exit 1; }

if [[ "$ROLLBACK" == "1" ]]; then
  if ! release_rollback "$RAFFLE_ROOT" "$SERVICE_NAME" "$NO_RESTART"; then
    die "Rollback falló — ¿existe ~/raffle/logs/previous-release?"
  fi
  log "✅ Rollback OK"
  exit 0
fi

[[ -f "$ENV_FILE" ]] || die "Falta $ENV_FILE"

command -v curl >/dev/null 2>&1 || die "Instala curl"
command -v tar >/dev/null 2>&1 || die "Instala tar"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
WORK_DIR="$RELEASES_DIR/.work_${TIMESTAMP}"
STAGING_DIR="$RELEASES_DIR/${TIMESTAMP}"
ARCHIVE="$WORK_DIR/raffle-release.tar.gz"
CHECKSUM_FILE="$WORK_DIR/raffle-release.tar.gz.sha256"

log "Descargando $DOWNLOAD_URL"
mkdir -p "$WORK_DIR"
if ! curl -fL --retry 3 --retry-delay 5 -o "$ARCHIVE" "$DOWNLOAD_URL"; then
  die "No pude descargar el release. ¿Existe el tag ${RELEASE_TAG}? Ejecuta el workflow Release Yoiberifas en GitHub."
fi

# El tag `yoiberifas-latest` es mutable: puede cambiar de contenido sin cambiar
# de nombre. Por eso se prefiere `yoiberifas-<sha>`, que es inmutable.
EXPECTED_SHA=""
if [[ "$RELEASE_TAG" == yoiberifas-* && "$RELEASE_TAG" != "yoiberifas-latest" ]]; then
  EXPECTED_SHA="${RELEASE_TAG#yoiberifas-}"
else
  log "WARN: '$RELEASE_TAG' es un tag mutable. Preferí '--tag yoiberifas-<sha>'."
fi

if curl -fL --retry 2 --retry-delay 3 -o "$CHECKSUM_FILE" "$CHECKSUM_URL" 2>/dev/null; then
  if release_verify_checksum "$ARCHIVE" "$CHECKSUM_FILE"; then
    log "Checksum OK: $(cat "$CHECKSUM_FILE")"
  else
    die "Checksum inválido — el artefacto descargado no coincide con ${CHECKSUM_URL}"
  fi
else
  log "WARN: el release no publica .sha256 (artefacto antiguo); sin verificación de integridad."
fi

log "Extrayendo → $STAGING_DIR"
mkdir -p "$STAGING_DIR"
tar -xzf "$ARCHIVE" -C "$STAGING_DIR"
rm -rf "$WORK_DIR"

if ! release_validate_manifest "$STAGING_DIR" "$EXPECTED_SHA"; then
  die "Artefacto inválido (bundle incompleto, manifiesto ausente o SHA distinto al del tag)"
fi
log "Manifiesto OK: $(release_manifest_field "$STAGING_DIR/MANIFEST.json" shortSha) (migraciones: $(release_manifest_field "$STAGING_DIR/MANIFEST.json" migrationLatest))"

TARGET_DIR="$STAGING_DIR"
if [[ -f "$STAGING_DIR/RELEASE_SHA" ]]; then
  RELEASE_SHA="$(tr -d '\n' < "$STAGING_DIR/RELEASE_SHA")"
  log "Release SHA: $RELEASE_SHA"
  TARGET_DIR="$RELEASES_DIR/${RELEASE_SHA}_${TIMESTAMP}"
  mv "$STAGING_DIR" "$TARGET_DIR"
fi

if [[ "$RUN_MIGRATE" == "1" ]]; then
  log "Migraciones SQLite (desde el release desplegado)"
  if release_run_migrate "$RAFFLE_ROOT" "$ENV_FILE" "$TARGET_DIR"; then
    :
  else
    log "WARN: pnpm no encontrado — omite migraciones o instala Node+corepack"
  fi
fi

log "Activando release: $TARGET_DIR"
release_activate "$RAFFLE_ROOT" "$TARGET_DIR" 1

if [[ "$NO_RESTART" != "1" ]]; then
  log "Reiniciando $SERVICE_NAME"
  release_restart_service "$SERVICE_NAME"
  release_health_check || die "Health check falló — journalctl --user -u $SERVICE_NAME -n 80"
  log "Health OK"
fi

while IFS= read -r old; do
  [[ -n "$old" ]] && log "Eliminando release antiguo: $old"
done < <(release_prune_old "$KEEP_RELEASES" "$RELEASES_DIR" "$CURRENT_LINK" "$PREVIOUS_FILE" "$TARGET_DIR")

log "✅ Deploy rápido OK"
log "   current → $(readlink -f "$CURRENT_LINK")"
if [[ -f "$PREVIOUS_FILE" ]]; then
  log "   rollback: bash deploy/vps-fast-deploy.sh --rollback"
fi
