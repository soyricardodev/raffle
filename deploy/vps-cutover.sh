#!/usr/bin/env bash
# Cutover legacy MySQL → Raffle v2 SQLite en el mismo VPS.
# Ejecutar en ventana de mantenimiento (app legacy detenida).
#
# Uso:
#   sudo bash deploy/vps-cutover.sh
#
# Requiere en /opt/raffle/.env:
#   SOURCE_DATABASE_URL=mysql://...
#   TARGET_DATABASE_URL=file:/opt/raffle/data/raffle.db
#   MIGRATE_ADMIN_PASSWORD=...
#   UPLOAD_DIR=/opt/raffle/uploads

set -euo pipefail

RAFFLE_ROOT="${RAFFLE_ROOT:-/opt/raffle}"
ENV_FILE="${RAFFLE_ROOT}/.env"
BACKUP_DIR="${RAFFLE_ROOT}/backups"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

log() { echo "[cutover] $*"; }
die() { echo "[cutover] ERROR: $*" >&2; exit 1; }

[[ -f "$ENV_FILE" ]] || die "Falta $ENV_FILE"

# shellcheck disable=SC1090
set -a && source "$ENV_FILE" && set +a

[[ -n "${SOURCE_DATABASE_URL:-}" ]] || die "SOURCE_DATABASE_URL requerido"
[[ -n "${TARGET_DATABASE_URL:-}" ]] || die "TARGET_DATABASE_URL requerido"
[[ -n "${MIGRATE_ADMIN_PASSWORD:-}" ]] || die "MIGRATE_ADMIN_PASSWORD requerido"

command -v bun >/dev/null 2>&1 || die "Instala Bun"
command -v mysqldump >/dev/null 2>&1 || log "WARN: mysqldump no encontrado — haz backup manual"

SRC_DIR="${RAFFLE_ROOT}/src"
[[ -d "$SRC_DIR" ]] || die "Ejecuta vps-deploy.sh primero o clona el repo en $SRC_DIR"

mkdir -p "$BACKUP_DIR" "$(dirname "${TARGET_DATABASE_URL#file:}")"

log "=== 1/6 Backup MySQL ==="
if command -v mysqldump >/dev/null 2>&1 && [[ -n "${SOURCE_DATABASE_URL:-}" ]]; then
  DUMP_FILE="$BACKUP_DIR/mysql_${TIMESTAMP}.sql"
  # Parse mysql://user:pass@host:port/db desde SOURCE_DATABASE_URL
  read -r MYSQL_USER MYSQL_PASS MYSQL_HOST MYSQL_PORT MYSQL_DB <<EOF
$(SOURCE_DATABASE_URL="$SOURCE_DATABASE_URL" bun -e "
  const u = new URL(process.env.SOURCE_DATABASE_URL)
  console.log([
    decodeURIComponent(u.username),
    decodeURIComponent(u.password),
    u.hostname,
    u.port || '3306',
    u.pathname.replace(/^\\//, ''),
  ].join(' '))
")
EOF
  if mysqldump --single-transaction --routines --triggers \
    -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASS" \
    "$MYSQL_DB" > "$DUMP_FILE"; then
    log "Backup: $DUMP_FILE"
  else
    log "WARN: mysqldump falló — haz backup manual"
    rm -f "$DUMP_FILE"
  fi
else
  log "WARN: mysqldump o SOURCE_DATABASE_URL no disponible — backup manual recomendado"
fi

log "=== 2/6 Snapshot SQLite destino (si existe) ==="
DB_PATH="${TARGET_DATABASE_URL#file:}"
if [[ -f "$DB_PATH" ]]; then
  cp "$DB_PATH" "$BACKUP_DIR/raffle_${TIMESTAMP}.db.bak"
  log "Copia: $BACKUP_DIR/raffle_${TIMESTAMP}.db.bak"
  rm -f "$DB_PATH"
fi

log "=== 3/6 Schema SQLite vacío ==="
cd "$SRC_DIR"
export DATABASE_URL="$TARGET_DATABASE_URL"
export DATABASE_AUTH_TOKEN="${DATABASE_AUTH_TOKEN:-}"
corepack enable 2>/dev/null || true
pnpm db:migrate

log "=== 4/6 ETL MySQL → SQLite ==="
export SOURCE_DATABASE_URL
export TARGET_DATABASE_URL
export MIGRATE_ADMIN_PASSWORD
bun run scripts/migrate-mysql-to-libsql.ts

log "=== 5/6 Validación ==="
export UPLOAD_DIR="${UPLOAD_DIR:-$RAFFLE_ROOT/uploads}"
bun run scripts/validate-migration.ts

log "=== 6/6 Deploy app v2 ==="
bash "$SRC_DIR/deploy/vps-deploy.sh"

log ""
log "✅ Cutover completo"
log "   Admins: login con MIGRATE_ADMIN_PASSWORD (cámbiala en /admin/cuenta)"
log "   Verifica: compra de prueba, verificador, imágenes /uploads/"
log "   Apaga el proceso legacy (pm2/docker/node) si aún corre"
