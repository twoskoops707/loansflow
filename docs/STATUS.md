# LoansFlow status — 2026-08-10

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
| **AdSense** `ca-pub-7523216981025331` | Code live; Auto ads ON; site still **Getting ready**; live fill = **0 filled** |
| **Ezoic** | Incubator JS only — do not replace AdSense / ads.txt yet |
| **Rakuten** SID 4736231 | Live; site loansflow.loan; profile **3/4**; Keycloak `family_name=Partnerships` still drives “Hey LoansFlow Partnerships” (public site is clean) |
| Rakuten offers applied | EQ Bank + Masseys applied; Cleo pending earlier — **My Advertisers empty / no Links yet** |
| CJ / FlexOffers / Impact | Blocked on captcha / Gmail verify |

## Email
- Gmail still **Verify it’s you** (outreach + default profiles) — cannot read approval emails until you re-auth once in a real browser

## Farm sequences
- Held in `sequences/loansflow/` until AdSense fills + your GO

## When an offer is approved
1. Paste tracking URL into `public/data/offers.json` (`url` + `"status": "live"`)
2. Deploy Pages
3. Optional: disclose “Related options” already labeled; keep FTC-friendly
