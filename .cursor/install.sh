#!/usr/bin/env bash
# Idempotent dependency refresh for the Giammaria Coach API dev environment.
# Runs after the repository is checked out. Safe to run repeatedly.
set -euo pipefail

cd "$(dirname "$0")/.."

# System dependency: PostgreSQL (backs the account/program storage endpoints).
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  echo "[install] Installing PostgreSQL..."
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-contrib
else
  echo "[install] PostgreSQL already present, skipping apt install."
fi

# Node dependencies.
if [ -f package-lock.json ]; then
  echo "[install] Installing Node dependencies with npm ci..."
  npm ci
else
  echo "[install] Installing Node dependencies with npm install..."
  npm install
fi

echo "[install] Done."
