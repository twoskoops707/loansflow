# Monetize hold — AdSense first, affiliates beside (not over)

**Rule:** Wait for live AdSense **fill** (`data-ad-status=filled`) before adding affiliate placements beside the ads.

## AdSense (primary display)
- Keep `ads.txt` Google line only until Authorized in AdSense UI.
- Auto ads already ON for `loansflow.loan` — do not thrash the AdSense dashboard.
- Watcher: `node tools/browser/watch-adsense-fill.js --loop` (site probe only; ntfy once on fill).

## Affiliates that won’t fight AdSense
Safe: text/deep links, result CTAs, “related lender” rows — **not** replacing AdSense slots or rewriting `ads.txt`.

| Partner | Status | Use when live |
|---------|--------|----------------|
| **Rakuten** SID 4736231 | Account live; finish profile/payment; fix site host to `loansflow.loan` if still dotted | Text links under calculator results |
| CJ / Impact / Ascend / FlexOffers | Outreach sent; finish apps when inbox opens | Same — outbound CPA/CPL, not display |
| Credible / Bankrate / QuinStreet | Direct finance | Offer widgets only if they are link-outs, not competing iframes in ad slots |

**Avoid until AdSense Ready:** Ezoic ads.txt takeover, second display network in the same slots, CF NS flip for Ezoic.
