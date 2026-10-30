#!/usr/bin/env bash
# Admin UAT release operations. Admin has no database: deploy and rollback both
# pull one exact image and replace the running container, restoring the previous
# image when the new one fails readiness. Never prunes Docker images host-wide.
set -Eeuo pipefail

operation=${1:-}
uat_dir=${UAT_DIR:-/opt/admin}
release_dir=${RELEASE_DIR:-"$uat_dir/releases"}
container=${ADMIN_CONTAINER:-kuquest-uat-admin}
admin_image_pattern='^ghcr\.io/kuquest/kuquest-admin:uat-[0-9a-f]{40}$'

fail() {
  printf 'UAT operation failed: %s\n' "$*" >&2
  exit 1
}

running_image() {
  docker inspect --format '{{.Config.Image}}' "$container" 2>/dev/null || true
}

rollout_admin() {
  docker compose up -d --no-deps --remove-orphans --wait --wait-timeout 90 admin
}

record_release() {
  install -d -m 700 "$release_dir"
  printf '%s\n' "$APP_IMAGE" >"$release_dir/current"
  printf '%s %s %s previous=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" "$APP_IMAGE" \
    "${previous_image:-none}" >>"$release_dir/history.log"
}

release() {
  local mode=$1
  local rollout_status restore_status

  [[ "${APP_IMAGE:-}" =~ $admin_image_pattern ]] ||
    fail 'APP_IMAGE must be ghcr.io/kuquest/kuquest-admin:uat-<40-character commit SHA>'

  # One release at a time on this host, independent of the workflow concurrency group.
  install -d -m 700 "$release_dir"
  exec 9>"$release_dir/.lock"
  flock --nonblock 9 || fail 'another UAT release is running'

  cd "$uat_dir"
  export APP_IMAGE
  docker compose config --quiet
  previous_image=$(running_image)

  docker compose pull admin

  set +e
  rollout_admin
  rollout_status=$?
  set -e

  if ((rollout_status != 0)); then
    printf 'New Admin image failed readiness: %s\n' "$APP_IMAGE" >&2
    docker compose logs --no-color --tail 200 admin >&2 || true
    [[ -n "$previous_image" ]] || fail 'no previous Admin image is available to restore'

    APP_IMAGE=$previous_image
    export APP_IMAGE
    set +e
    rollout_admin
    restore_status=$?
    set -e
    ((restore_status == 0)) || fail "restore also failed; previous image was $previous_image"
    printf 'Previous Admin image restored: %s\n' "$previous_image" >&2
    return "$rollout_status"
  fi

  docker compose ps admin
  record_release "$mode"
  printf 'UAT %s succeeded: %s (previous: %s)\n' "$mode" "$APP_IMAGE" "${previous_image:-none}"
}

case "$operation" in
  deploy | rollback) release "$operation" ;;
  *) fail 'usage: uat-operations.sh <deploy|rollback>' ;;
esac
