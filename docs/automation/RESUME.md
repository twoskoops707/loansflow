# LoansFlow — Autonomous Ops Blocker + Resume

## AdSense status (2026-07-30, loansflow707@gmail.com)

Publisher: `ca-pub-7523216981025331`

| Site | Ownership | Site review | ads.txt (AdSense column) |
|------|-----------|-------------|---------------------------|
| **loansflow.loan** | **Verified** (meta) | **Getting ready** (review requested) | UI may still show Not found (crawl lag; file is live) |
| **loansflow.pages.dev** / loansflow-live | Attached | — | Live Google ads.txt line |
| twoskoops707.github.io | Getting ready | — | Not found |

Evidence: `docs/automation/adsense-apex-SUBMIT-RESULT.json`, `adsense-adstxt-loansflow-loan-RESULT.json`.

## Live URLs

- Production: https://loansflow.loan/
- Pages project: `loansflow-live`
- ads.txt: `google.com, pub-7523216981025331, DIRECT, f08c47fec0942fa0`

## Ezoic (2026-07-30)

**JS headers live** on apex (static Gatekeeper + `sa.min.js` + analytics in `<head>`). Publisher userId **652581**; no per-site script ID (domain-bound). **Deferred** Cloudflare/NS takeover, ads.txt rewrite, and AdSense slot replacement.

See `docs/automation/EZOIC.md` + `ezoic-snippet.txt`. After deploy → pubdash **CHECK CONNECTION**.

Traffic: Ezoic wants ~250k MAU (post-2026-02); site is Incubator-only until then.

## Password drop-files (gitignored)

- Gmail: `docs/automation/.secret-gmail-password.txt`
- Ezoic: `docs/automation/.secret-ezoic-password.txt`
