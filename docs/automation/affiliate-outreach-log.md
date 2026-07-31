# LoansFlow affiliate / ad partner outreach log

**Site:** https://loansflow.loan/  
**From:** loansflow707@gmail.com  
**Campaign date:** 2026-07-30 (PDT) / 2026-07-31 UTC  
**Positioning:** New calculator suite (SBA / commercial / mortgage); high-intent finance audience; AdSense live while traffic warms; open to CPA / CPL / rev-share and compliant display. No inflated traffic claims.

---

## Pitch used (all emails)

**Subject:** Publisher intro — LoansFlow loan calculators seeking affiliate/ad partners

```
Hello,

I'm reaching out from LoansFlow (https://loansflow.loan/), a new suite of free calculators for SBA, commercial, and mortgage loan modeling. Our visitors are operators and borrowers actively comparing financing scenarios — a high-intent finance audience.

We are launching the calculator suite and seeking affiliate networks and direct advertisers open to CPA, CPL, or revenue-share placements (alongside compliant display). Google AdSense is already on the site while traffic warms; we are exploring additional monetization with reputable finance partners.

If you have loan, mortgage, credit, or small-business finance offers that fit educational calculator contexts, I would welcome a conversation or your preferred publisher application path. We will not make inflated traffic claims — we are early-stage and looking for the right long-term partners.

Site: https://loansflow.loan/
Contact: loansflow707@gmail.com

Thank you for your time,
LoansFlow Partnerships
```

---

## Emails sent (Gmail, individual — verified in Sent)

| Time (UTC) | Who | Email | Status |
|---|---|---|---|
| 2026-07-31T03:34:42Z | FlexOffers publisher support | support@flexoffers.com | **sent** (Gmail Sent confirmed) |
| 2026-07-31T03:34:52Z | Awin US New Business | us-newbusiness@awin.com | **sent** |
| 2026-07-31T03:35:01Z | Bankrate Credit Cards Affiliate | partners@bankratecreditcards.com | **sent** |
| 2026-07-31T03:35:11Z | CJ Affiliate Publisher Development | pubdev@cj.com | **sent** |
| 2026-07-31T03:35:20Z | MaxBounty (Joe Ferguson) | joef@maxbounty.com | **sent** |
| 2026-07-31T03:35:29Z | Ascend by Partnerize (ex-Pepperjam) | ascend.support@partnerize.com | **sent** |
| 2026-07-31T03:35:38Z | digidip publisher inquiries | info@digidip.net | **sent** |
| 2026-07-31T03:35:48Z | QuinStreet Media / Customer Service | customerservice@quinstreet.com | **sent** |
| 2026-07-31T03:35:57Z | AvantLink Account Management | am@avantlink.com | **sent** |
| 2026-07-31T03:36:06Z | Rakuten Advertising Publisher Support | pubsupport@rakuten.com | **sent** |

Evidence: `docs/automation/outreach-shots/verify-sent.png`, `affiliate-outreach-results.json`.

---

## Applications / forms

| Time (UTC) | Who | Channel | Status |
|---|---|---|---|
| 2026-07-31T03:39:26Z | Credible Partners | https://www.credible.com/partners | **submitted** (“Thank you!” confirmation) — Mortgages interest selected |
| 2026-07-31T03:38:41Z | digidip contact form | https://digidip.net/contact | **blocked — reCAPTCHA** (form filled + consent checked; Send not completed) |
| 2026-07-31T03:40:33Z | FlexOffers publisher signup | publisherprobeta.flexoffers.com | **partial** — account created for loansflow707@gmail.com; email passcode verification still incomplete (OTP UI + Cloudflare Turnstile on login). Login resumes at verify step. |
| 2026-07-31T03:40:21Z | Bankrate Credit Cards | bankratecreditcards.com | **flow opened** (#publishers); email already sent |
| 2026-07-31T03:40:39Z | Awin publisher signup | ui.awin.com/publisher-signup/us/awin | **page opened** — needs interactive multi-step + refundable deposit |
| 2026-07-31T03:40:45Z | Impact partner signup | app.impact.com registration/partner | **page opened** — KYC / property verification required |
| 2026-07-31T03:40:53Z | MaxBounty affiliate | maxbounty.com/affiliate | **page opened** — phone/Skype + traffic details typical |
| 2026-07-31T03:40:05Z | Nav Partnerships | nav.com/partnerships | **blocked — reCAPTCHA** on form attempt |
| 2026-07-31T03:40:12Z | QuinStreet contact page | quinstreet.com/contact-us | **no web form** (phone HQ); email already sent |
| 2026-07-31T05:03:47Z | Rakuten Advertising publisher | http://publisher.rakutenadvertising.com/register | **account created** for loansflow707@gmail.com (LoansFlow Partnerships). Auth registration succeeded → Publisher Dashboard. **Email verification still required** (`/onboarding/verify-email`). “Activate your Rakuten Advertising Login” mail received; activation link opened; after re-login still on verify-email. Site https://loansflow.loan/ not yet attached in onboarding. Password drop-file: `docs/automation/.secret-rakuten-password.txt` (gitignored locally — do not commit). |

---

## Rakuten registration follow-up (2026-07-31 ≈05:03–05:07Z)

Madhu (Case 404091) directed free **publisher** signup (not advertiser). Automation completed account creation:

1. Opened register URL → Keycloak registration form on `auth.rakutenmarketing.com`
2. Filled email / first / last / password (+ confirm); all password rules green
3. Clicked **Register** → redirected to `publisher.rakutenadvertising.com` **Publisher Dashboard** (JWT subject created; `email_verified=false` initially)
4. Onboarding gate: **Verify your email** for `loansflow707@gmail.com` (+ Resend verification)
5. Gmail: “Activate your Rakuten Advertising Login” from `noreply@rakutenadvertising.com` — Activate Login link opened
6. Subsequent login works (reCAPTCHA badge present; no hard CAPTCHA wall that blocked submit). Still lands on verify-email until activation fully sticks in headed/manual click if needed

**Status:** Publisher account **exists**; finish email activate + attach https://loansflow.loan/ in onboarding manually if verify link is one-shot / already consumed.

Evidence: `outreach-shots/rakuten-01-start.png` … `rakuten-42-settled.png`, `rakuten-register-RESULT.json`, `rakuten-dashboard-RESULT.json`, `rakuten-login2-RESULT.json`.

---

## Target shortlist researched (12)

1. FlexOffers — network + finance merchants  
2. Awin (ShareASale successor) — US new business  
3. CJ Affiliate — publisher development  
4. Impact — marketplace (signup path)  
5. Ascend by Partnerize (Pepperjam) — network support  
6. Rakuten Advertising — publisher support  
7. AvantLink — publisher AM  
8. MaxBounty — CPA network  
9. digidip — commerce/affiliate aggregation  
10. Bankrate Credit Cards — direct publisher program  
11. QuinStreet Media Network — performance / loan lead marketplace  
12. Credible Partners — loan marketplace affiliates  
(+ Nav partnerships researched; CAPTCHA blocked)

---

## Blockers

| Blocker | Detail |
|---|---|
| Gmail SMTP | Account password rejected for SMTP (needs App Password). Used Chromium + Chrome channel browser login instead. |
| digidip | Google reCAPTCHA on contact form |
| Nav | Invisible/hidden reCAPTCHA field blocked autofill submit |
| FlexOffers | Incomplete signup: email OTP + Cloudflare Turnstile; account exists, finish manually |
| Rakuten | Account created; stuck on `/onboarding/verify-email` after Activate Login email (link may be one-shot / needs headed confirm). Site not yet added. |
| Awin / Impact / MaxBounty | Multi-step interactive signup (deposit / KYC / phone) — not fully completable headless |
| Bright Data MCP | 401 (token/zone not configured in this session) — research used WebSearch/WebFetch |

---

## Inbox monitor (2026-07-31 ≈04:49–04:58Z / evening PDT 2026-07-30)

Checked Gmail **Inbox** + **Spam** for `loansflow707@gmail.com` (Chrome profile `.chrome-gmail-outreach2`). Artifacts: `affiliate-inbox-monitor.json`, `affiliate-inbox-monitor.md`, `affiliate-reply-results.json`.

### Partner / delivery responses

| Who | What arrived | Action taken |
|---|---|---|
| **Rakuten Advertising — Madhu Chatterjee** | Case **404091**: human reply directing LoansFlow to free **publisher** signup at http://publisher.rakutenadvertising.com/register (vs advertiser form). Ticket auto-marked solved. | **Reply sent** (verified in Sent): confirm publisher path, site URL, early-stage honesty, will complete registration. |
| **Ascend / Partnerize — Zia (AI) + ticket ack** | Request **#695116** received + “looking into your request.” | **Reply sent** (verified in Sent): clarify publisher/affiliate intent; ask for application URL / onboarding checklist. |
| **FlexOffers** | (1) Email OTP passcodes (e.g. `899939`) — **expired** (~30 min). (2) Support ticket **47332464239** ack landed in **Spam**. | OTP not usable without fresh code + Turnstile — **left for manual finish**. Attempted Not Spam on ticket (retry if still in Spam). |
| **QuinStreet** | Bounce: message **blocked** (Mimecast `554` security policy) to `customerservice@quinstreet.com`. | No reply possible to that alias; need alternate contact/form. |
| **Bankrate Credit Cards** | Bounce: `partners@bankratecreditcards.com` **address not found / access denied** (EXO 550). | Need alternate publisher contact; site flow still open. |
| **Awin, CJ, MaxBounty, digidip, AvantLink, Credible** | No reply yet in inbox/spam at monitor time. | Waiting. |

### Replies sent (body summary)

**Rakuten / Madhu:** Thanked for Case 404091; confirmed publisher (not advertiser); pointed at register URL; offered analytics later; no fake traffic claims.

**Ascend #695116:** Clarified publisher join intent for https://loansflow.loan/; asked for preferred application URL / checklist.

### Contract templates added

Under `docs/legal/` (draft — counsel review):

- `affiliate-insertion-order.md` — CPA/CPL/rev-share IO (Net-30, FTC disclosure, invalid traffic, CA governing law placeholder)  
- `display-ad-insertion-order.md` — flat CPM / monthly display IO  
- `publisher-terms-short-form.md` — short network/partner terms  
- `rate-card.md` — placeholder CPMs + honest reply blurb  
- `README.md` — index; governing law defaults to **California** (AdSense timezone Los Angeles)

## Artifacts

- `docs/automation/affiliate_outreach_send.py` — Gmail send script  
- `docs/automation/affiliate_outreach_apply.py` — form/signup attempts  
- `docs/automation/affiliate_inbox_monitor.py` / `affiliate_send_replies3.py` — inbox monitor + replies  
- `docs/automation/affiliate_rakuten_register.py` / `affiliate_rakuten_login2.py` — Rakuten publisher register + login  
- `docs/automation/affiliate-outreach-results.json`  
- `docs/automation/affiliate-application-results.json`  
- `docs/automation/affiliate-inbox-monitor.json` / `affiliate-reply-results.json`  
- `docs/automation/rakuten-*-RESULT.json` — Rakuten signup evidence (tokens redacted)  
- `docs/automation/outreach-shots/` — screenshots (incl. `rakuten-*.png`)  
- `docs/legal/` — IO / terms / rate card templates  
- Chrome profile: `docs/automation/.chrome-gmail-outreach2` (logged-in Gmail session; may re-challenge)

## Suggested next manual steps

1. Finish FlexOffers OTP in a headed browser (request new passcode → Turnstile → add https://loansflow.loan/ as traffic source). Mark ticket 47332464239 Not Spam if still in Spam.  
2. Rakuten: in headed browser, Resend verification / open fresh Activate Login link → confirm past `/onboarding/verify-email` → add https://loansflow.loan/ as media property.  
3. Solve digidip reCAPTCHA and click Send (form already drafted).  
4. Complete Awin publisher signup ($1 refundable deposit) and Impact partner registration.  
5. Find alternate QuinStreet / Bankrate publisher contacts (prior emails bounced).  
6. Watch for human follow-up on Ascend #695116 and FlexOffers ticket 47332464239.
