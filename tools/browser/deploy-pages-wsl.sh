#!/usr/bin/env bash
set -euo pipefail
SRC=/mnt/c/Users/jsmil/.cursor/loansflow
DST=~/loansflow-cf
rm -rf "$DST/public"
cp -a "$SRC/public" "$DST/public"
cp "$SRC/wrangler.toml" "$DST/wrangler.toml"
cd "$DST"
npx wrangler pages deploy ./public --project-name=loansflow --commit-dirty=true
echo DEPLOY_OK
