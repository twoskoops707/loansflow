#!/usr/bin/env bash
set -euo pipefail
SRC=/mnt/c/Users/jsmil/.cursor/loansflow
DST=~/loansflow-cf
rm -rf "$DST/public"
cp -a "$SRC/public" "$DST/public"
cp "$SRC/wrangler.toml" "$DST/wrangler.toml"
cd "$DST"
# Apex/www CNAME → loansflow-live on Foremost Vole (owns loansflow.loan zone)
CLOUDFLARE_ACCOUNT_ID=8547be3ab2e2bccea6f0356fe6ba4a9c \
  npx wrangler pages deploy ./public --project-name=loansflow-live --commit-dirty=true
# Also keep Twskoops loansflow.pages.dev in sync (do NOT CNAME apex here)
CLOUDFLARE_ACCOUNT_ID=c8c1c5fd94fa89b259d5559a496e87d7 \
  npx wrangler pages deploy ./public --project-name=loansflow --commit-dirty=true
echo DEPLOY_OK
