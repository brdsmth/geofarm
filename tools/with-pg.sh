#!/usr/bin/env bash
# Run a command against a throwaway PostgreSQL cluster (P-17 local
# integration; CI uses a service container instead). Requires initdb/pg_ctl.
set -euo pipefail

PORT="${GEOFARM_PG_PORT:-55432}"
PGDATA="$(mktemp -d)"
trap 'pg_ctl -D "$PGDATA" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$PGDATA"' EXIT

initdb -D "$PGDATA" -U geofarm --auth=trust >/dev/null
pg_ctl -D "$PGDATA" -l "$PGDATA/log" \
  -o "-p $PORT -k $PGDATA -c listen_addresses=127.0.0.1" start >/dev/null
createdb -h 127.0.0.1 -p "$PORT" -U geofarm geofarm

GEOFARM_PG_URL="postgres://geofarm@127.0.0.1:$PORT/geofarm" "$@"
