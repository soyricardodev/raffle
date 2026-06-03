#!/usr/bin/env bash
# Migración + deploy completo — yoiberifas.com / VPS admin
#
#   cd ~/raffle && bash deploy/vps-yoiberifas-full.sh
#
# Opciones:
#   --skip-git           No hace git pull
#   --skip-migration     Solo build + restart
#   --skip-nginx         No cambia nginx ni detiene legacy
#   --force-db           Borra SQLite y re-migra desde MySQL
#   --no-systemd         No instala/reinicia systemd
#   --regenerate-secrets Nuevos BETTER_AUTH_SECRET / CRON / admin password

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAFFLE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LEGACY_ROOT="${LEGACY_ROOT:-$HOME/raffle-app}"
LEGACY_ENV="${LEGACY_ENV:-$LEGACY_ROOT/backend/.env}"
DOMAIN="${DOMAIN:-yoiberifas.com}"
GIT_REPO="${GIT_REPO:-https://github.com/soyricardodev/raffle.git}"
GIT_BRANCH="${GIT_BRANCH:-main}"
SERVICE_NAME="${SERVICE_NAME:-raffle}"
NGINX_SITE="${NGINX_SITE:-/etc/nginx/sites-available/raffle-app}"

SKIP_GIT=0
SKIP_MIGRATION=0
SKIP_NGINX=0
FORCE_DB=0
NO_SYSTEMD=0
REGENERATE_SECRETS=0

for arg in "$@"; do
  case "$arg" in
    --skip-git) SKIP_GIT=1 ;;
    --skip-migration) SKIP_MIGRATION=1 ;;
    --skip-nginx) SKIP_NGINX=1 ;;
    --force-db) FORCE_DB=1 ;;
    --no-systemd) NO_SYSTEMD=1 ;;
    --regenerate-secrets) REGENERATE_SECRETS=1 ;;
    -h|--help)
      grep '^#' "$0" | head -20
      exit 0
      ;;
    *) echo "Opción desconocida: $arg" >&2; exit 1 ;;
  esac
done

ENV_FILE="$RAFFLE_ROOT/.env"
BACKUP_DIR="$RAFFLE_ROOT/backups"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

log() { echo "[full] $*"; }
die() { echo "[full] ERROR: $*" >&2; exit 1; }

stop_legacy_backend() {
  if command -v pm2 >/dev/null 2>&1; then
    local json
    json="$(pm2 jlist 2>/dev/null || echo '[]')"
    echo "$json" | bun -e "
      const list = JSON.parse(await Bun.stdin.text())
      for (const p of list) {
        const cwd = String(p.pm2_env?.pm_cwd || '')
        if (cwd.includes('raffle-app')) console.log(p.name)
      }
    " 2>/dev/null | while read -r name; do
      [[ -n "$name" ]] || continue
      log "pm2 stop $name"
      pm2 stop "$name" 2>/dev/null || true
      pm2 delete "$name" 2>/dev/null || true
    done
  fi
  if ss -tlnp 2>/dev/null | grep -q ':5001 '; then
    log "WARN: puerto 5001 aún activo — detén el backend legacy manualmente si hace falta"
  fi
}

sqlite_user_count() {
  local db_path="$1"
  bun -e "
    import { createClient } from '@libsql/client'
    const c = createClient({ url: 'file:${db_path}' })
    const r = await c.execute('SELECT COUNT(*) AS n FROM users')
    console.log(String(r.rows[0].n ?? 0))
  " 2>/dev/null || echo "0"
}

log "=== Raffle v2 — migración completa ==="
log "Repo:    $RAFFLE_ROOT"
log "Legacy:  $LEGACY_ROOT"
log "Dominio: $DOMAIN"

[[ -d "$LEGACY_ROOT/backend" ]] || die "Legacy no encontrado: $LEGACY_ROOT"
[[ -f "$LEGACY_ENV" ]] || die "Falta $LEGACY_ENV"

if ! command -v bun >/dev/null 2>&1; then
  log "Instalando Bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
fi
command -v node >/dev/null 2>&1 || die "Instala Node.js 22"
corepack enable 2>/dev/null || true
corepack prepare pnpm@10.12.1 --activate 2>/dev/null || true
mkdir -p "$BACKUP_DIR" "$RAFFLE_ROOT/data"

cd "$RAFFLE_ROOT"

# ─── 1. Git (HTTPS, repo público) ────────────────────────────────
if [[ "$SKIP_GIT" != "1" ]]; then
  log "=== 1/9 git pull ==="
  git remote set-url origin "$GIT_REPO" 2>/dev/null || git remote add origin "$GIT_REPO"
  git fetch origin "$GIT_BRANCH"
  git checkout "$GIT_BRANCH" 2>/dev/null || git checkout -b "$GIT_BRANCH"
  git pull --ff-only origin "$GIT_BRANCH"
else
  log "=== 1/9 git omitido ==="
fi

# ─── 2. .env desde legacy ────────────────────────────────────────
log "=== 2/9 .env desde legacy ==="
ENV_ARGS=(--legacy-env "$LEGACY_ENV" --output "$ENV_FILE" --domain "$DOMAIN" --raffle-root "$RAFFLE_ROOT" --legacy-root "$LEGACY_ROOT")
[[ "$REGENERATE_SECRETS" == "1" ]] && ENV_ARGS+=(--regenerate-secrets)
bun run scripts/build-production-env.ts "${ENV_ARGS[@]}"
chmod 600 "$ENV_FILE"
# shellcheck disable=SC1090
set -a && source "$ENV_FILE" && set +a
[[ -d "$UPLOAD_DIR" ]] || die "No existe UPLOAD_DIR=$UPLOAD_DIR"

# ─── 3. Dependencias ─────────────────────────────────────────────
log "=== 3/9 pnpm install ==="
pnpm install --frozen-lockfile

DB_PATH="${TARGET_DATABASE_URL#file:}"
export DATABASE_URL="$TARGET_DATABASE_URL"
export DATABASE_AUTH_TOKEN="${DATABASE_AUTH_TOKEN:-}"
export SOURCE_DATABASE_URL

if [[ "$SKIP_MIGRATION" != "1" ]]; then
  # ─── 4. Backups ────────────────────────────────────────────────
  log "=== 4/9 backups ==="
  if command -v mysqldump >/dev/null 2>&1; then
    DUMP="$BACKUP_DIR/mysql_${TIMESTAMP}.sql"
    read -r MU MP MH MPORT MDB <<EOF
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
    if mysqldump --single-transaction -h "$MH" -P "$MPORT" -u "$MU" -p"$MP" "$MDB" > "$DUMP" 2>/dev/null; then
      log "MySQL: $DUMP"
    else
      log "WARN: mysqldump falló (¿cliente mysql instalado? apt install mysql-client)"
    fi
  fi
  if [[ -f "$DB_PATH" ]]; then
    cp "$DB_PATH" "$BACKUP_DIR/raffle_${TIMESTAMP}.db.bak"
    log "SQLite: $BACKUP_DIR/raffle_${TIMESTAMP}.db.bak"
  fi

  # ─── 5-6. SQLite + ETL ─────────────────────────────────────────
  RUN_ETL=0
  if [[ "$FORCE_DB" == "1" ]]; then
    log "=== 5/9 SQLite (--force-db) ==="
    rm -f "$DB_PATH"
    RUN_ETL=1
  elif [[ ! -f "$DB_PATH" ]]; then
    log "=== 5/9 SQLite (nuevo) ==="
    RUN_ETL=1
  else
    USERS="$(sqlite_user_count "$DB_PATH")"
    if [[ "$USERS" == "0" ]]; then
      log "=== 5/9 SQLite (vacío) ==="
      RUN_ETL=1
    else
      log "=== 5/9 SQLite ya migrado ($USERS admins) — skip ETL ==="
    fi
  fi

  pnpm db:migrate

  if [[ "$RUN_ETL" == "1" ]]; then
    log "=== 6/9 ETL MySQL → SQLite ==="
    bun run scripts/migrate-mysql-to-libsql.ts
  else
    log "=== 6/9 ETL omitido (usa --force-db para re-migrar) ==="
  fi

  log "=== 7/9 validación ==="
  bun run scripts/validate-migration.ts
else
  log "=== 4-7/9 migración omitida ==="
  pnpm db:migrate
fi

# ─── 8. Build + systemd ──────────────────────────────────────────
log "=== 8/9 build + servicio ==="
export NODE_ENV=production
pnpm build

if [[ "$NO_SYSTEMD" != "1" ]]; then
  RAFFLE_ROOT="$RAFFLE_ROOT" ENV_FILE="$ENV_FILE" bash "$RAFFLE_ROOT/deploy/install-systemd.sh"
  sudo systemctl restart "$SERVICE_NAME" 2>/dev/null || sudo systemctl start "$SERVICE_NAME"
  sleep 3
  curl -sf "http://127.0.0.1:3000/api/health/db" | grep -q '"ok":true' \
    || die "Health :3000 falló — journalctl -u $SERVICE_NAME -n 80"
  log "Health OK :3000"
fi

# ─── 9. nginx + legacy ─────────────────────────────────────────────
if [[ "$SKIP_NGINX" != "1" ]]; then
  log "=== 9/9 cutover nginx ==="
  stop_legacy_backend
  [[ -f "$NGINX_SITE" ]] && sudo cp "$NGINX_SITE" "$BACKUP_DIR/nginx_${TIMESTAMP}.bak"
  sudo cp "$RAFFLE_ROOT/deploy/nginx-yoiberifas.conf" "$NGINX_SITE"
  sudo nginx -t
  sudo systemctl reload nginx
  sleep 2
  if curl -sf "https://${DOMAIN}/api/health/db" | grep -q '"ok":true'; then
    log "✅ https://${DOMAIN} live"
  else
    log "WARN: prueba manual: curl -s https://${DOMAIN}/api/health/db"
  fi
else
  log "=== 9/9 nginx omitido (--skip-nginx) ==="
fi

log ""
log "✅ Listo"
log "   Admin password temporal:"
grep '^MIGRATE_ADMIN_PASSWORD=' "$ENV_FILE" | sed 's/^/   /'
log "   → https://${DOMAIN}/admin/cuenta para cambiarla"
