#!/bin/sh
# Two overlapping registrations against an explicit development database.
# This commits one identity and temporarily sets the global registration cap
# to 1. The previous cap is restored on exit. Identities cannot be deleted.
# Requires KYA_ALLOW_DEV_WRITE=yes in addition to the connection guard.
set -eu

if [ "${KYA_ALLOW_DEV_WRITE:-}" != "yes" ]; then
  echo "Refusing the concurrent write without KYA_ALLOW_DEV_WRITE=yes." >&2
  exit 1
fi

root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
work=$(mktemp -d)
changed=0
old_limit=0

run_sql() {
  python3 "$root/supabase/tests/kya_psql.py" "$@"
}

restore_cap() {
  status=$?
  trap - EXIT
  if [ "$changed" -eq 1 ]; then
    printf '%s\n' \
      "update public.rate_limit_policies set global_hourly_limit = ${old_limit} where action = 'register';" \
      > "$work/restore.sql"
    if ! run_sql "$work/restore.sql"; then
      echo "Failed to restore the registration cap. Set global_hourly_limit for action register back before using this database." >&2
      status=1
    fi
  fi
  rm -rf "$work"
  exit "$status"
}

trap restore_cap EXIT

raw=$(run_sql --tuples "$root/supabase/tests/kya_03c_concurrent_read.sql" || true)
old_limit=$(printf '%s\n' "$raw" | awk 'NF { count++; value=$1 } END { if (count == 1 && value ~ /^[0-9]+$/) print value }')
case "$old_limit" in
  ''|*[!0-9]*)
    echo "Could not read the current registration cap. Refusing to change it." >&2
    exit 1
    ;;
esac

run_sql "$root/supabase/tests/kya_03c_concurrent_prepare.sql"
changed=1
printf '%s\n' \
  "update public.rate_limit_policies set global_hourly_limit = 1 where action = 'register';" \
  > "$work/cap.sql"
run_sql "$work/cap.sql"

run_sql "$root/supabase/tests/kya_03c_concurrent.sql" > "$work/a" 2>&1 &
pid_a=$!
run_sql "$root/supabase/tests/kya_03c_concurrent.sql" > "$work/b" 2>&1 &
pid_b=$!
wait "$pid_a" || true
wait "$pid_b" || true

if grep -q 'kya_mgmt_' "$work/a" "$work/b"; then
  echo "Refusing to print output that contains a management token." >&2
  exit 1
fi

ok=$(grep -h -o 'kya_concurrent_ok' "$work/a" "$work/b" | wc -l | tr -d '[:space:]')
limited=$(grep -h -o 'kya_concurrent_limited' "$work/a" "$work/b" | wc -l | tr -d '[:space:]')
echo "kya_concurrent_ok: $ok"
echo "kya_concurrent_limited: $limited"

if [ "$ok" != "1" ] || [ "$limited" != "1" ]; then
  grep -h -E 'ERROR|kya_test_failed' "$work/a" "$work/b" || true
  echo "Concurrent registration did not produce one success and one limit." >&2
  exit 1
fi
