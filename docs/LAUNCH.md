# Launch checklist

**Canonical:** https://loansflow.loan/  
**Repo:** https://github.com/twoskoops707/loansflow  
**Brand:** LoansFlow · Contact: loansflow707@gmail.com  
**Pages project:** `loansflow-live` (Foremost Vole) · legacy `loansflow.pages.dev` still mirrors

Last verified: 2026-07-31 (PDT)

---

## Done

- [x] Calculators + landing redesign live on apex
- [x] Custom domain **loansflow.loan** (+ www) on Cloudflare Pages
- [x] Logo D (`public/img/logo.svg`) live in nav/hero
- [x] Legal pages (About / Contact / Privacy / Disclaimer / Terms) with loansflow707@gmail.com
- [x] AdSense pub `ca-pub-7523216981025331` — ownership **Verified** on loansflow.loan
- [x] `ads.txt` live (apex / www / pages.dev) — AdSense column **Authorized** on loansflow.loan
- [x] Ad units shipped (home + tools slots via `js/ads.js`; empty-fill hide)
- [x] Ezoic JS headers live (Gatekeeper + `sa.min.js` + analytics) — Incubator path; AdSense stays primary
- [x] FamFlow LoansFlow profile + Path1/2/3 sequences + remapped farm coords (`loansflow.loan`)
- [x] Affiliate outreach emails sent (10 networks) + Credible form submitted
- [x] Contract templates in `docs/legal/` (draft — counsel review)
- [x] Rakuten publisher account created + **email verified** (onboarding incomplete — site attach pending)
- [x] robots.txt + sitemap.xml on apex

## Waiting on third party

- [ ] **AdSense site review** — loansflow.loan still **Getting ready** (cannot force; wait for Ready / serving)
- [ ] **Ezoic Incubator** — JS live; pubdash **CHECK CONNECTION** / review in progress (do **not** flip CF nameservers or rewrite ads.txt yet)
- [ ] Affiliate replies — Ascend #695116, FlexOffers ticket, CJ/Awin/etc. (watch inbox)

## Needs you (manual / OTP / CAPTCHA / payment)

1. **FlexOffers (one click)** — https://publisherprobeta.flexoffers.com/login as `loansflow707@gmail.com` → solve Turnstile → request new email OTP → enter code → add https://loansflow.loan/. Mark ticket **47332464239** Not Spam if still in Spam.
2. **Rakuten (one click)** — https://publisher.rakutenadvertising.com/onboarding/start (email already verified) → **Get started** → set country **United States** → finish wizard → attach **https://loansflow.loan/**. Agent automation keeps crashing on the country react-select.
3. **Awin** — publisher signup (~$1 refundable deposit)
4. **Impact / MaxBounty** — interactive KYC / phone signup
5. **digidip / Nav** — solve reCAPTCHA and submit
6. **QuinStreet / Bankrate** — find alternate publisher contacts (prior emails bounced)
7. **AdSense Payments / tax** — Payments → Verification is **threshold-gated** (“once earnings reach verification threshold”). No urgent form blocker today; complete identity/tax when Google prompts.
8. **Google Search Console** — see `docs/automation/SEARCH-CONSOLE.md` — verify loansflow.loan → submit sitemap (paste HTML meta tag for agent deploy if using meta method)

## Needs agent next (when unblocked)

- After AdSense **Ready**: create named ad units / confirm fill; optionally append Ezoic ads.txt seller lines (keep Google line)
- Re-check Ezoic connection after traffic; enable mediation only when AdSense serves
- Finish affiliate network onboarding as replies arrive; use `docs/legal/` templates
- Optional: remove unused AdSense sites (`pages.dev` / `github.io`) — public ads.txt is already live on both; AdSense UI still **Not found** (crawl lag). Safe to delete those rows anytime; keep **loansflow.loan**.
- Keep FamFlow farm warming with unique-seq locks on

## Ops notes

- Domain / DNS: see `docs/DOMAIN.md`
- Ads map: `docs/ADS.md`
- Ezoic policy: `docs/automation/EZOIC.md`
- Affiliate log: `docs/automation/affiliate-outreach-log.md`
- Password drop-files (gitignored): `.secret-gmail-password.txt`, `.secret-rakuten-password.txt`, `.secret-ezoic-password.txt`
