# Search Console and analytics — LoansFlow

**Property:** https://loansflow.loan/  **Sitemap:** https://loansflow.loan/sitemap.xml (63 URLs, rebuilt by `node scripts/build-sitemap.js`)

## What is already running
- `.github/workflows/site-health.yml` runs daily, checks every sitemap URL (status, title, canonical, noindex, speed), ads.txt, robots.txt and rate-data freshness, and appends one line to `monitoring/history.jsonl`. A failed run emails the repo owner. First snapshot: 2026-11-11, 63/63 pages OK.
- `.github/workflows/refresh-market-news.yml` refreshes rates daily from FRED and Freddie Mac, rewrites the static rate text in the pages, and rebuilds the sitemap.

## Two things only you can do (about 5 minutes)
1. **Search Console** (https://search.google.com/search-console): Add property > URL prefix `https://loansflow.loan/` > choose the *HTML tag* method > copy the `content` value. Put it in `site.config.json` as `gscVerificationToken`, then run `node scripts/apply-site-config.js`, commit and push, and click Verify. Then Sitemaps > submit `sitemap.xml`. (DNS TXT on Cloudflare also works and needs no code.)
2. **Cloudflare Web Analytics** (cookieless, no consent banner needed): Cloudflare dashboard > Web Analytics > Add a site > `loansflow.loan`. Either enable the one-click option for the Pages project or copy the beacon token into `site.config.json` as `cloudflareBeaconToken` and run `node scripts/apply-site-config.js` (it also adds an analytics sentence to the privacy page).

## Why history matters
Search Console keeps 16 months of data from the day you verify, so verify now even if traffic is near zero. For AdSense and for any future sale, a dated record of impressions, clicks, indexed pages and visits is the evidence.

## After verifying
- Use URL Inspection > Request indexing on: home, /loans/sba-7a, /compare/, the three CPA guides, /author.
- Check Pages > Indexing weekly; record impressions/clicks monthly in a note.
