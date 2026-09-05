#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
[ $# -ge 1 ] || { echo "usage: scripts/db-migrate.sh supabase/migrations/<version>_<name>.sql ..."; exit 1; }
for f in "$@"; do
  version=$(basename "$f" | cut -d_ -f1)
  npx supabase db query --linked -f "$f"
  npx supabase migration repair --linked --status applied "$version"
done
npx supabase migration list --linked
