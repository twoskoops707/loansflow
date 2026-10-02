# Ezoic — LoansFlow status & checklist

**Status: dropped from the site 2026-10-02.** All Ezoic JS, Gatekeeper CMP and analytics were removed from every page and `public/js/ezoic-boot.js` deleted. Incubator was never connected, so it earned nothing while costing ~3.2s of main-thread time per load, injecting styles into our ad containers, and adding third-party cookies. This checklist is kept for history only — do not reinstate it without re-measuring the performance cost. AdSense is the sole ad stack.

**Verdict (2026-07-30): Started account + site + JS path; deferred Cloud/DNS, ads.txt rewrite, and AdSense strip.**

## Why this split

| Action | Now? | Why |
|--------|------|-----|
| Create Ezoic publisher account | **Done** | loansflow707 path; site `loansflow.loan` on pubdash |
| Complete account setup | **Done** (reached Connect Your Site) | Incubator requires connect step |
| Choose **JavaScript** integration | **Selected** | Safe for CF Pages; avoids NS move |
| Cloudflare / Nameserver integration | **Deferred** | Ezoic would manage CF DNS and can overwrite records — breaks Pages custom domain mid AdSense review |
| Header scripts (static `<head>` tags) | **Shipped** | Gatekeeper + `sa.min.js` + analytics in HTML source for crawler detection; does **not** remove AdSense |
| Ezoic ad placements replacing AdSense slots | **Deferred** | AdSense site status is **Getting ready** — dual fill risk |
| ads.txt redirect to Ezoic manager | **Deferred** | Keep Google line authoritative until AdSense crawl shows Authorized |
| Supplemental Ezoic ads.txt lines | **Later** | Add *in addition to* Google when dashboard gives the list |
| AdSense Mediation in Ezoic | **Later** | After AdSense serves + Ezoic accepts site; match email/phone/zip |

## Traffic gate (critical)

As of **2026-02-19**, Ezoic requires **~250,000 monthly active users** for normal approval. LoansFlow is far below (farm warming / ~12k sessions/mo theoretical). Path is **Incubator** (20 sites/month, competitive). Account/site must stay on JS integration for detection; growing past 250k can auto-approve later.

## Account / site

- Dashboard: https://pubdash.ezoic.com/setup (Connect Your Site → JavaScript)
- Domain shown: **LOANSFLOW.LOAN**
- Email: loansflow707@gmail.com
- Publisher account **userId**: **652581** (from pubdash conversion pixels; not embedded in JS)
- Per-site script / privacy ID: **none shown** — standalone JS is domain-bound
- Ezoic password drop-file (gitignored): `docs/automation/.secret-ezoic-password.txt`
- Snippet file: `docs/automation/ezoic-snippet.txt`
- CHECK CONNECTION: re-run after static headers deploy

## Site code policy

- `public/js/ads.js` — keep `provider: 'adsense'` and `ca-pub-6588738221262894`
- `public/ads.txt` — keep `google.com, pub-6588738221262894, DIRECT, f08c47fec0942fa0` (no Ezoic seller lines until dashboard provides them)
- Static Ezoic tags in every `public/**/*.html` `<head>` (from `ezoic-snippet.txt` — crawlers need `sa.min.js` in source)
- `public/js/ezoic-boot.js` — same snippet; loaded on all pages; no-op if static tags already present
- No Ezoic `showAds` / placeholder divs while AdSense is primary

## User later

1. After deploy: pubdash → **CHECK CONNECTION** until detected → Incubator **Review In Progress**.
2. Wait for AdSense **Ready** / filling on loansflow.loan.
3. In Ezoic Ads.txt app: append seller lines (never drop Google); avoid 301 redirect while AdSense crawler still shows Not found.
4. Enable **AdSense Mediation** with exact AdSense contact match.
5. Only then consider Ezoic placements / mediation vs raw AdSense Auto ads.
6. Do **not** flip to Cloudflare API integration unless you have a documented DNS cutover (Pages CNAMEs + SSL).

## Evidence

- `docs/automation/ezoic-connect-RESULT.json`
- `docs/automation/ezoic-fill-01.txt` (Connect Your Site / Incubator copy)
