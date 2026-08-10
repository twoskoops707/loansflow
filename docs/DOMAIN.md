# Domain — production

## Live production URL
**https://loansflow.loan/**

| URL | Role |
|-----|------|
| https://loansflow.loan/ | Canonical production |
| https://www.loansflow.loan/ | www → same site |
| https://loansflow-live.pages.dev/ | Cloudflare Pages (Foremost Vole account) |
| https://loansflow.pages.dev/ | Older Pages project on Twskoops account (fallback / legacy) |

## Cloudflare layout (important)

| | ID |
|--|----|
| **Account ID** (Foremost Vole) | `8547be3ab2e2bccea6f0356fe6ba4a9c` |
| **Zone ID** (`loansflow.loan`) | `1610d82be843c0ecdaa25d9da9af0436` |

- **Registrar + active DNS zone** live under Cloudflare account **Foremost Vole**, nameservers `elisabeth` / `khalid`.
- **Pages project serving the custom domain:** `loansflow-live` on Foremost Vole (Git-connected to `twoskoops707/loansflow` → auto-deploys on push to `main`).
- DNS: proxied CNAMEs `@` and `www` → `loansflow-live.pages.dev`.
- Twskoops account still has Pages project `loansflow` (`loansflow.pages.dev`) and a **pending** zone for `loansflow.loan` (josh/kelly) — do not point the apex there (cross-account CNAME causes Cloudflare **1014**).

## AdSense

Pub: `ca-pub-7523216981025331` · account `loansflow707@gmail.com`

**ads.txt (must be crawlable at apex):**
```
https://loansflow.loan/ads.txt
```
Body (exact):
```
google.com, pub-7523216981025331, DIRECT, f08c47fec0942fa0
```

AdSense Sites list also shows `loansflow.pages.dev` and `twoskoops707.github.io` — crawler checks each host’s own `/ads.txt`. Apex status can stay **Not found** for up to ~24h after the file is live; there is no manual “recheck” button in the UI.

Ownership for **loansflow.loan** is verified (meta) and review requested. Public curl on apex/www/live/pages.dev returns 200 `text/plain` with the line above.

## Ops

**Preferred:** push to `main` — Cloudflare Pages Git integration deploys `loansflow-live` automatically.

Direct Upload (needs `CLOUDFLARE_API_TOKEN` with Pages Edit):

```bash
cd ~/loansflow-cf   # or this repo root
CLOUDFLARE_ACCOUNT_ID=8547be3ab2e2bccea6f0356fe6ba4a9c \
  npx wrangler pages deploy --project-name=loansflow-live --branch=main --commit-dirty=true
```
