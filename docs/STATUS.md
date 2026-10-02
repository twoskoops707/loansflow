# LoansFlow status — 2026-10-02

## Brand
- Company: **LoansFlow** (not “LoansFlow Partnerships”)
- Site: https://loansflow.loan/
- Contact: loansflow707@gmail.com
- Repo: `main` @ GitHub twoskoops707/loansflow

## Website
- Static Cloudflare Pages (`loansflow-live`)
- AdSense script + meta + ads.txt Google line live
- Copy tightened (removed internal monetize/SEO pitch from hero sections)
- Affiliate hooks: `public/data/offers.json` + `public/js/offers.js` (renders only `status=live` + url)

## Ads
| Channel | Status |
|---------|--------|
| **AdSense** `ca-pub-6588738221262894` | Code live and verified end-to-end (all ad requests succeed); **all slots report `unfilled`** — site approval state is the blocker, see [ADS.md](ADS.md) |
| **Ezoic** | **Removed 2026-10-02** — all Ezoic JS/CMP/analytics stripped from every page, `ezoic-boot.js` deleted. It cost ~3.2s of main-thread time per load, injected `height:auto!important` into ad containers, and had never been connected in Incubator. AdSense is now the only ad stack |
| **Rakuten** SID 4736231 | Live; site loansflow.loan; profile **3/4**; Keycloak `family_name=Partnerships` still drives “Hey LoansFlow Partnerships” (public site is clean) |
| Rakuten offers applied | EQ Bank + Masseys applied; Cleo pending earlier — **My Advertisers empty / no Links yet** |
| CJ / FlexOffers / Impact | Blocked on captcha / Gmail verify |

## Performance (Lighthouse 12.x, mobile emulation, live site, 2026-10-02)

| Page | Perf | A11y | Best practices | SEO | LCP | TBT | CLS | Weight |
|------|------|------|----------------|-----|-----|-----|-----|--------|
| `/` | 32 | 96 | 79 | 100 | 6.6s | 4340ms | 0.12 | 966 KiB |
| `/tools/` | 19 | 95 | 79 | 100 | 6.5s | 3070ms | 0.41 | 968 KiB |

- Cause is third-party JS, not our code: Ezoic blocks the main thread ~3.2s (ezojs 2.36s + ezodn 0.61s + CMP 0.14s + analytics 0.11s) vs AdSense 0.48s. Deferring/removing Ezoic is the single biggest lever.
- Fixed on this pass: HSTS, day-long `stale-while-revalidate` caching for `/css /js /img`, ad slot late-fill visibility, WCAG AA contrast for `--muted` and the dimmed wizard steps.
- Cloudflare Pages serves assets at `max-age=14400, must-revalidate` by default — the `_headers` rules raise that (verified live).
- `public/_redirects` carries the `www` → apex 301 but Pages did not apply it (still 200 after deploy). Until a Cloudflare zone rule is added (Bulk Redirect / Page Rule on `www.loansflow.loan/*`), the two hosts serve identical bytes; canonical tags point at the apex so SEO damage is minimal.

## Email
- Gmail still **Verify it’s you** (outreach + default profiles) — cannot read approval emails until you re-auth once in a real browser

## Farm sequences
- Held in `sequences/loansflow/` until AdSense fills + your GO

## When an offer is approved
1. Paste tracking URL into `public/data/offers.json` (`url` + `"status": "live"`)
2. Deploy Pages
3. Optional: disclose “Related options” already labeled; keep FTC-friendly
