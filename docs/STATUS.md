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

## Content expansion — 2026-10-05 (AdSense "low value content" response)

AdSense rejected the site for low value content; the response is a substantial, original content layer — **deployed to `main` (commit 507d773) and live on loansflow.loan, verified 2026-10-05**:

- **Guides** (`/guides/`): SBA 7(a) 10-step playbook, SBA 504 explainer, loan documents by loan type, interactive 40-item checklist (localStorage + downloadable `.txt`/`.md`), choosing a lender, 45+ term glossary, calculator help for all 9 tools
- **Directory** (`/directory/`): searchable national directory — 67 SBA district offices, 9 SBA national contacts, 6 resource partners, 18 marketplaces/brokerages (`public/data/directory.json`); broker verification via NMLS Consumer Access noted
- Homepage: nav links (Guides, Directory) + "Resource library" section + footer links; `about` expanded (what we offer, editorial standards, what we are not); `sitemap.xml` lists every new URL
- All program facts verified against SBA.gov (guarantee 85%/75%, $5M 7(a) max, WCP rate caps, 504 50/40/10 structure and $5.5M max, forms 1919/912/413/159); pages stamped "Updated October 5, 2026"
- Live checks passed 2026-10-05: /guides/ hub, homepage Resource library, /directory/ (all 56 state/territory filters), /downloads/loan-document-checklist.txt, /sitemap.xml (16 URLs)
- Next step: request AdSense re-review in the AdSense dashboard (only the account holder can do this)

## Ads
| Channel | Status |
|---------|--------|
| **AdSense** `ca-pub-6588738221262894` | Code live and verified end-to-end (all ad requests succeed); **all slots report `unfilled`** — site approval state is the blocker, see [ADS.md](ADS.md) |
| **Ezoic** | **Removed 2026-10-02** — all Ezoic JS/CMP/analytics stripped from every page, `ezoic-boot.js` deleted. It cost ~3.2s of main-thread time per load, injected `height:auto!important` into ad containers, and had never been connected in Incubator. AdSense is now the only ad stack |
| **Rakuten** SID 4736231 | Live; site loansflow.loan; profile **3/4**; Keycloak `family_name=Partnerships` still drives “Hey LoansFlow Partnerships” (public site is clean) |
| Rakuten offers applied | EQ Bank + Masseys applied; Cleo pending earlier — **My Advertisers empty / no Links yet** |
| CJ / FlexOffers / Impact | Blocked on captcha / Gmail verify |

## Performance (Lighthouse 12.x, mobile emulation, live site, 2026-10-02)

| Page | Perf | A11y | BP | SEO | LCP | TBT | CLS | Weight |
|------|------|------|----|-----|-----|-----|-----|--------|
| `/` before | 32 | 96 | 79 | 100 | 6.6s | 4340ms | 0.117 | 966 KiB |
| `/` after | **55** | **100** | 79 | 100 | **4.0s** | **1310ms** | **0.079** | **366 KiB** |
| `/tools/` before | 19 | 95 | 79 | 100 | 6.5s (spiked to 12–20s) | 3070ms | 0.405 | 968 KiB |
| `/tools/` after | **66** | **100** | 75 | 100 | **3.1s** | **890ms** | **0.142** | **411 KiB** |

What moved the numbers:

- **Ezoic removed** — ~3.2s of main-thread blocking per load, gone (its CMP was also the only third-party cookie source besides Google's `test_cookie`, which is what the remaining BP finding is).
- **Market-news API** — the client requested `?fresh=1&t=<now>`, bypassing the Function's 30-minute edge cache and rebuilding six upstream feeds per visitor (measured 20.8s). Now the cacheable URL is used first, the Function fetches all sources in parallel, and each upstream is capped at 6s. That request time *was* the /tools/ LCP.
- **Ad slot late-fill** — a slot that filled after 1.4s stayed `display:none` forever; it now un-hides.
- **Sticky mobile ad bar** — kept its box from first paint (`.main` already pads for it), removing 0.247 of CLS on /tools/.
- **Contrast to WCAG AA** (`--muted`, dimmed wizard steps, footer note) — accessibility 96/95 → 100/100.
- **HSTS** added. Asset caching: Pages normalizes `/css /js /img` to `max-age=14400` + our `stale-while-revalidate=86400` (verified live) — so a deploy's CSS/JS can sit behind the CDN for up to ~4h. HTML is always `max-age=0`.
- `public/_redirects` carries the `www` → apex 301 but Pages did not apply it (still 200 after deploy). Until a Cloudflare zone rule is added (Bulk Redirect / Page Rule on `www.loansflow.loan/*`), the two hosts serve identical bytes; canonical tags point at the apex so SEO damage is minimal.

## Email
- Gmail still **Verify it’s you** (outreach + default profiles) — cannot read approval emails until you re-auth once in a real browser

## When an offer is approved
1. Paste tracking URL into `public/data/offers.json` (`url` + `"status": "live"`)
2. Deploy Pages
3. Optional: disclose “Related options” already labeled; keep FTC-friendly
