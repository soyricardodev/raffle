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

release_run_migrate() {
  local repo_dir="${1:?}"
  local env_file="${2:?}"

  # shellcheck disable=SC1090
  set -a && source "$env_file" && set +a
  command -v pnpm >/dev/null 2>&1 || return 1
  (
    cd "$repo_dir"
    export DATABASE_URL
    export DATABASE_AUTH_TOKEN="${DATABASE_AUTH_TOKEN:-}"
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
