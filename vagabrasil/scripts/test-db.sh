#!/usr/bin/env bash
# Aplica as migrations em um PostgreSQL local descartável e executa os testes de RLS.
set -euo pipefail
cd "$(dirname "$0")/.."
PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
DATA=$(mktemp -d)
PORT=${PGPORT_TEST:-54329}
chown postgres "$DATA" 2>/dev/null || true
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
run "$PGBIN/initdb -D $DATA -U postgres >/dev/null"
run "$PGBIN/pg_ctl -D $DATA -o '-p $PORT -k /tmp' -l $DATA/log start >/dev/null"
trap 'run "$PGBIN/pg_ctl -D $DATA stop -m fast >/dev/null"; rm -rf "$DATA"' EXIT
PSQL="psql -h /tmp -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -c "create database vb_test" postgres
$PSQL -f tests/supabase_stub.sql vb_test
for f in supabase/migrations/*.sql; do echo "→ $f"; $PSQL -f "$f" vb_test; done
$PSQL -o /dev/null -f tests/rls_test.sql vb_test 2>&1 | sed 's/^psql:[^ ]* NOTICE:  /  /'
