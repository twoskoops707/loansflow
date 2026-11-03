# Affiliate follow-up kit (2026-11-02)

Not sent. Send from loansflow707@gmail.com (the address on all July 2026 threads).

## Status as of the last record (2026-07-31 inbox snapshot, docs/automation/affiliate-inbox-monitor.md)

| Program | Last known state | Next move |
|---|---|---|
| Rakuten Advertising | Support case 404091 open; account SID 4736231 live; EQ Bank + Masseys applied, Cleo pending; "My Advertisers" empty, no links | Log in to Rakuten > Advertisers > My Advertisers; reply on case 404091 with the update below |
| Ascend by Partnerize | Request 695116 open, replied once | Reply on the same ticket with the update below |
| FlexOffers | Account created, email passcode verification unfinished | Finish OTP at publisherprobeta.flexoffers.com |
| CJ Affiliate | Signup blocked on captcha; email to pubdev@cj.com sent | Complete signup at cj.com/publisher |
| Awin | Page opened only; needs deposit | Optional; skip until traffic exists |
| Impact | Needs KYC | Optional |
| Credible Partners | Application submitted (Mortgages) | Check inbox/spam for a reply |
| Bankrate Credit Cards | Address bounced (partners@bankratecreditcards.com not found) | Use their web form instead |
| QuinStreet | Message blocked (customerservice@quinstreet.com) | Use their web form instead |
| digidip | Contact form blocked by reCAPTCHA | Submit the form by hand |
| MaxBounty, AvantLink | Email sent, no reply recorded | Resend update below |

I could not check the inbox today, so any replies since July 31 are unknown. Search Gmail for: `from:(rakuten OR partnerize OR flexoffers OR cj.com OR awin OR credible OR maxbounty OR avantlink)`.

## Updated pitch (replace the July text; it is more concrete and still makes no traffic claims)

Subject: LoansFlow publisher update: 14 loan calculators, 50+ pages, no lead forms

```
Hello,

Following up on our July introduction. LoansFlow (https://loansflow.loan/) is an independent, free resource for small business and home financing. Since then we have added:

- 14 stand-alone calculators (SBA 7(a), Express, 504, commercial real estate, equipment, line of credit, mortgage, refinance break-even, DSCR) with amortization schedules
- eight loan-type pages and 15 guides built on SBA fee notices and standard amortization math
- a live federal grants search and a lender/SBA office directory

We do not collect leads or run application forms. Visitors compare scenarios, then look for a lender, so we are a fit for compliant affiliate placements (CPA, CPL or revenue share) next to the calculator results. Partner links are labeled as sponsored.

We are early-stage and will not overstate traffic. If you have SBA, equipment, line-of-credit, mortgage or refinance offers, could you point us to your publisher application or approve our pending one?

Site: https://loansflow.loan/
Contact: loansflow707@gmail.com

Thank you,
LoansFlow
```

## Send to

- FlexOffers: support@flexoffers.com
- Awin: us-newbusiness@awin.com
- CJ Affiliate: pubdev@cj.com
- MaxBounty: joef@maxbounty.com
- Digidip: info@digidip.net
- AvantLink: am@avantlink.com
- Rakuten: reply on case 404091 (or pubsupport@rakuten.com)
- Ascend: reply on request 695116 (ascend.support@partnerize.com)

Do not resend to partners@bankratecreditcards.com or customerservice@quinstreet.com (bounced).

## What the site needs once a link is approved

Put the tracking URL in `public/data/offers.json` for that entry and set `"status": "live"`. `js/offers.js` then shows it with the sponsored label. Do not place affiliate links inside ad slots.
