# Shared release layout for VPS deploys.
#
#   ~/raffle/current  →  ~/raffle/releases/<id>/
#   ~/raffle/         =  git repo (migraciones, scripts)
#
# Sourced by vps-fast-deploy.sh, vps-deploy.sh, install-systemd.sh

release_layout_init() {
  local raffle_root="${1:?}"
  RELEASES_DIR="$raffle_root/releases"
  CURRENT_LINK="$raffle_root/current"
  PREVIOUS_FILE="$raffle_root/logs/previous-release"
  LOG_DIR="$raffle_root/logs"
  mkdir -p "$RELEASES_DIR" "$LOG_DIR"
}

release_validate_bundle() {
  local dir="${1:?}"
  [[ -f "$dir/app/.output/server/index.mjs" ]]
}

release_resolve_app_dir() {
  local raffle_root="${1:?}"
  local current="${raffle_root}/current"
  local resolved

  if [[ -L "$current" ]] || [[ -e "$current" ]]; then
    resolved="$(readlink -f "$current" 2>/dev/null || true)"
    if [[ -n "$resolved" && -f "$resolved/app/.output/server/index.mjs" ]]; then
      echo "$resolved/app"
      return 0
    fi
  fi

  if [[ -f "${raffle_root}/app/.output/server/index.mjs" ]]; then
    echo "${raffle_root}/app"
    return 0
  fi

  return 1
}

release_stage_from_repo() {
  local repo_dir="${1:?}"
  local target_dir="${2:?}"

  mkdir -p "$target_dir/app"
  cp "$repo_dir/package.json" "$repo_dir/pnpm-workspace.yaml" "$target_dir/"
  cp "$repo_dir/app/package.json" "$target_dir/app/"
  cp -a "$repo_dir/app/.output" "$target_dir/app/.output"
  cp -a "$repo_dir/packages" "$target_dir/packages"
  cp -a "$repo_dir/node_modules" "$target_dir/node_modules"
  if [[ -d "$repo_dir/app/node_modules" ]]; then
    cp -a "$repo_dir/app/node_modules" "$target_dir/app/node_modules"
  fi

  local sha short_sha
  if sha="$(git -C "$repo_dir" rev-parse HEAD 2>/dev/null)"; then
    short_sha="$(git -C "$repo_dir" rev-parse --short HEAD)"
    printf '%s\n' "$short_sha" > "$target_dir/RELEASE_SHA"
    printf '%s\n' "$sha" > "$target_dir/RELEASE_FULL_SHA"
  fi
  printf '%s\n' "${RELEASE_SOURCE:-local}" > "$target_dir/RELEASE_SOURCE"
}

release_create_from_repo() {
  local repo_dir="${1:?}"
  local raffle_root="${2:?}"
  local prefix="${3:-local}"

  release_layout_init "$raffle_root"

  local timestamp short_sha target_dir
  timestamp="$(date +%Y%m%d_%H%M%S)"
  short_sha="$(git -C "$repo_dir" rev-parse --short HEAD 2>/dev/null || echo "local")"
  target_dir="${RELEASES_DIR}/${prefix}_${short_sha}_${timestamp}"

  release_stage_from_repo "$repo_dir" "$target_dir"
  release_validate_bundle "$target_dir"
  echo "$target_dir"
}

release_save_previous() {
  local current_link="${1:?}"
  local previous_file="${2:?}"
  if [[ -L "$current_link" ]] || [[ -e "$current_link" ]]; then
    readlink -f "$current_link" > "$previous_file" 2>/dev/null || true
  fi
}

release_activate() {
  local raffle_root="${1:?}"
  local target_dir="${2:?}"
  local install_systemd="${3:-0}"

  release_layout_init "$raffle_root"
  release_validate_bundle "$target_dir"

  release_save_previous "$CURRENT_LINK" "$PREVIOUS_FILE"
  ln -sfn "$target_dir" "$CURRENT_LINK"

  if [[ "$install_systemd" == "1" ]]; then
    local lib_dir
    lib_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    RAFFLE_ROOT="$raffle_root" bash "${lib_dir}/../install-systemd.sh" >/dev/null 2>&1 || true
  fi
}

release_user_systemd_env() {
  export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
}

release_restart_service() {
  local service_name="${1:?}"
  release_user_systemd_env
  systemctl --user restart "$service_name" 2>/dev/null || systemctl --user start "$service_name"
}

release_health_check() {
  local base_url="${1:-http://127.0.0.1:3000}"
  local i
  for i in $(seq 1 20); do
    if curl -sf "${base_url%/}/api/health/db" | grep -q '"ok":true'; then
      return 0
    fi
    sleep 1
  done
  return 1
}

# Verifica el checksum del artefacto descargado.
#   release_verify_checksum <archivo> <archivo.sha256>
release_verify_checksum() {
  local archive="${1:?}"
  local checksum_file="${2:?}"
  local expected actual
  [[ -f "$checksum_file" ]] || return 1
  expected="$(tr -d '\n\r ' < "$checksum_file")"
  [[ -n "$expected" ]] || return 1
  actual="$(sha256sum "$archive" | awk '{print $1}')"
  [[ "$actual" == "$expected" ]]
}

# Lee un campo string del MANIFEST.json sin depender de jq.
release_manifest_field() {
  local manifest="${1:?}"
  local field="${2:?}"
  grep -o "\"${field}\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" "$manifest" 2>/dev/null \
    | head -1 | sed 's/.*"\([^"]*\)"$/\1/'
}

# Valida que el bundle esté completo y, si se pasa un SHA esperado, que el
# artefacto sea el commit que se cree estar desplegando.
#   release_validate_manifest <release_dir> [expected_short_sha]
release_validate_manifest() {
  local dir="${1:?}"
  local expected_sha="${2:-}"
  local manifest="$dir/MANIFEST.json"

  release_validate_bundle "$dir" || return 1
  [[ -f "$manifest" ]] || { echo "[release] MANIFEST.json ausente" >&2; return 1; }

  local short_sha entry
  short_sha="$(release_manifest_field "$manifest" shortSha)"
  [[ -n "$short_sha" ]] || { echo "[release] MANIFEST sin shortSha" >&2; return 1; }

  if [[ -n "$expected_sha" && "$short_sha" != "$expected_sha" ]]; then
    echo "[release] El manifiesto dice ${short_sha} pero se esperaba ${expected_sha}" >&2
    return 1
  fi

  entry="$(release_manifest_field "$manifest" entrypoint)"
  [[ -n "$entry" && -f "$dir/$entry" ]] || {
    echo "[release] entrypoint del manifiesto ausente: ${entry:-<vacío>}" >&2
    return 1
  }
  return 0
}

# Snapshot previo a migrar. Best-effort: si no se puede, no bloquea el deploy.
release_snapshot_db() {
  local env_file="${1:?}"
  # shellcheck disable=SC1090
  set -a && source "$env_file" && set +a

  local url="${DATABASE_URL:-}"
  if [[ "$url" != file:* ]]; then
    echo "[migrate] DB remota (${url%%:*}): sin snapshot local"
    return 0
  fi

  local db_path="${url#file:}"
  [[ -f "$db_path" ]] || { echo "[migrate] WARN: no existe $db_path"; return 0; }
  command -v sqlite3 >/dev/null 2>&1 || { echo "[migrate] WARN: sqlite3 ausente"; return 0; }

  local snap="${db_path}.pre-migrate-$(date -u +%Y%m%dT%H%M%SZ)"
  if sqlite3 "$db_path" ".backup '$snap'"; then
    echo "[migrate] Snapshot previo: $snap"
  else
    echo "[migrate] WARN: el snapshot falló; revisá el disco antes de migrar"
  fi
}

# Aplica las migraciones DEL RELEASE desplegado, no las del clone git.
#
# El clone es solo el entorno de ejecución (pnpm + drizzle-kit): puede estar
# desactualizado, y antes eso hacía que un `--migrate` aplicara migraciones
# viejas contra un esquema nuevo. El artefacto es la única fuente de verdad.
#   release_run_migrate <repo_dir> <env_file> [release_dir]
release_run_migrate() {
  local repo_dir="${1:?}"
  local env_file="${2:?}"
  local release_dir="${3:-}"

  command -v pnpm >/dev/null 2>&1 || return 1

  local migrations_dir="$repo_dir/packages/shared/drizzle-sqlite"
  if [[ -n "$release_dir" && -f "$release_dir/packages/shared/drizzle-sqlite/meta/_journal.json" ]]; then
    migrations_dir="$release_dir/packages/shared/drizzle-sqlite"
  fi
  echo "[migrate] Migraciones desde: $migrations_dir"

  release_snapshot_db "$env_file"

  # shellcheck disable=SC1090
  set -a && source "$env_file" && set +a
  (
    cd "$repo_dir"
    export DATABASE_URL
    export DATABASE_AUTH_TOKEN="${DATABASE_AUTH_TOKEN:-}"
    export DRIZZLE_MIGRATIONS_DIR="$migrations_dir"
    pnpm db:migrate
  )
}

release_prune_old() {
  local keep="${1:-5}"
  local releases_dir="${2:?}"
  local current_link="${3:?}"
  local previous_file="${4:?}"
  local target_dir="${5:?}"

  mapfile -t OLD_RELEASES < <(ls -1dt "$releases_dir"/*/ 2>/dev/null | tail -n +$((keep + 1)) || true)
  local current_real target_real dir dir_real prev_real
  current_real="$(readlink -f "$current_link" 2>/dev/null || true)"
  target_real="$(readlink -f "$target_dir" 2>/dev/null || true)"

  for dir in "${OLD_RELEASES[@]}"; do
    dir="${dir%/}"
    [[ -z "$dir" ]] && continue
    dir_real="$(readlink -f "$dir" 2>/dev/null || true)"
    [[ "$dir_real" == "$current_real" ]] && continue
    [[ "$dir_real" == "$target_real" ]] && continue
    if [[ -f "$previous_file" ]]; then
      prev_real="$(readlink -f "$(cat "$previous_file")" 2>/dev/null || true)"
      [[ "$dir_real" == "$prev_real" ]] && continue
    fi
    rm -rf "$dir"
    echo "$dir"
  done
}

release_rollback() {
  local raffle_root="${1:?}"
  local service_name="${2:?}"
  local no_restart="${3:-0}"

  release_layout_init "$raffle_root"
  [[ -f "$PREVIOUS_FILE" ]] || return 1
  local prev
  prev="$(cat "$PREVIOUS_FILE")"
  [[ -d "$prev" ]] || return 1

  ln -sfn "$prev" "$CURRENT_LINK"
  if [[ "$no_restart" != "1" ]]; then
    release_restart_service "$service_name"
    release_health_check || return 1
  fi
}
