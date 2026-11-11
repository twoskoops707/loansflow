# Affiliate application pack (2026-11-11)

Prepared, not submitted. Every program below needs you to accept its terms, and most need a CAPTCHA, email/OTP check or identity/tax details that only you can provide. Contact on file: loansflow707@gmail.com (from docs/STATUS.md).

## Rules that apply to every application
- Be accurate about traffic. The site is new; say so. Do not claim audience numbers you cannot show.
- Mortgage and refinance offers: no per-lead or per-funded-loan payments (RESPA Section 8). Do not apply to mortgage lead-gen programs. Display-only flat-fee advertising is the only mortgage monetization on this site.
- Links go through /go/<slug> (see `public/data/offers.json`); after approval paste the tracking URL into `target`, set `status: "live"`, run `node scripts/build-affiliate-redirects.js`, push.

## Copy-paste answers
- **Company / site name:** LoansFlow, https://loansflow.loan/
- **Site description:** Independent, educational site by Joshua Miller, CPA, with plain-English guides, side-by-side comparisons and 16 free calculators (SBA 7(a), 504, Express, business acquisition, cash to close, DSCR, line of credit, equipment). Not a lender; no application forms; no lead collection.
- **Audience:** Small business owners researching SBA loans, lines of credit, term loans, equipment financing and business banking in the U.S.
- **Promotion methods:** Editorial placements beside calculator results and in loan-comparison pages, labeled "Sponsored" with rel="sponsored nofollow", plus an FTC affiliate disclosure page (https://loansflow.loan/disclosure). No paid search, no email blasts, no incentivized traffic, no coupon or toolbar methods.
- **Traffic:** Early-stage site (launched 2026). Provide screenshots from Cloudflare Web Analytics or Search Console if asked; do not estimate.
- **Content review:** Authored by a licensed California CPA (2009), QuickBooks Certified ProAdvisor; sources are cited inline (SBA, IRS, FRED).

## Programs (priority order)
| Program | Fits | Where to apply | Status |
|---|---|---|---|
| Lendio | SBA / term / LOC marketplace | https://www.lendio.com/partners (PartnerStack or FlexOffers) | Not applied |
| SmartBiz | SBA | https://smartbizbank.com/refer-a-friend | Not applied |
| National Funding | Equipment / term | via Impact: https://impact.com (search the brand after creating a publisher account; needs KYC) | Not applied |
| Relay | Business banking | https://relayfi.com/partners | Not applied |
| Bluevine | Banking + line of credit | https://www.bluevine.com/partners | Not applied |
| Ramp | Banking / cards | https://ramp.com/partner-program | Not applied |
| Rakuten (SID 4736231) | EQ Bank, Cleo (non-mortgage) | existing account; reply on case 404091 | Open since July |
| Ascend by Partnerize | various | reply on request 695116 | Open |
| FlexOffers | Lendio route, others | finish email OTP at publisherprobeta.flexoffers.com | Unfinished |
| CJ Affiliate | various | https://www.cj.com/publisher (captcha) | Blocked |

(All the URLs above returned HTTP 200 on 2026-11-11.)

## Only you can do
1. Solve CAPTCHAs and email/OTP checks; log in to Rakuten, FlexOffers, CJ, Impact, PartnerStack.
2. Accept each program's terms and enter tax details (W-9) and payout/bank information.
3. Use your real identity for KYC. I will not enter these or accept terms on your behalf without you reviewing each one.

## Fastest path
Open the five direct links (SmartBiz, Relay, Bluevine, Ramp, Lendio), paste the answers above, submit. Tell me when each is approved and I will wire the tracking URLs in, rebuild redirects and push.
