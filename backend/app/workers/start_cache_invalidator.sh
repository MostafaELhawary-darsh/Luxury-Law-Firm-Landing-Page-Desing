#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../../.."

export DATABASE_URL="${DATABASE_URL:-postgresql://user:password@localhost:5432/legal_db}"
export REDIS_URL="${REDIS_URL:-redis://localhost:6379/0}"

python -m backend.app.workers.cache_invalidator_worker
