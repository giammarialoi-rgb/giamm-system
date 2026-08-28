#!/usr/bin/env bash
# Per-boot startup for the Giammaria Coach API dev environment.
# Starts PostgreSQL and ensures the application role and database exist.
# Idempotent: tolerates an already-running cluster and existing role/db.
set -euo pipefail

PG_VERSION="$(ls /etc/postgresql 2>/dev/null | sort -V | tail -1 || echo 16)"

echo "[start] Starting PostgreSQL cluster ${PG_VERSION}/main..."
sudo pg_ctlcluster "${PG_VERSION}" main start 2>/dev/null || true

# Wait until the server accepts connections.
for i in $(seq 1 30); do
  if sudo -u postgres pg_isready -q; then break; fi
  sleep 1
done

echo "[start] Ensuring 'coach' role and database exist..."
sudo -u postgres psql -v ON_ERROR_STOP=1 <<'SQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'coach') THEN
    CREATE ROLE coach LOGIN PASSWORD 'coach';
  END IF;
END $$;
SQL
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='coach'" | grep -q 1 \
  || sudo -u postgres createdb -O coach coach

echo "[start] PostgreSQL ready at postgresql://coach:coach@localhost:5432/coach"
