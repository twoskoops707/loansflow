# LoansFlow — Autonomous Ops Blocker + Resume

## Hard blocker (needs one secret)

Google AdSense / Ezoic / most ad networks require sign-in as **loansflow707@gmail.com**.

- Chrome Profile 3 has that account listed, but **no saved password** and **no active Google session**.
- Automation reached the AdSense password screen and stopped.

### Resume without clicking

Create this file (one line, password only):

`C:\Users\jsmil\.cursor\loansflow\docs\automation\.secret-gmail-password.txt`

Then run:

```powershell
cd C:\Users\jsmil\.cursor\loansflow\tools\browser
node watch-and-apply.js
```

Or drop the file while the watcher is already running — it will continue AdSense → Ezoic → Mediavine waitlist → Cloudflare domain attach.

**Do not commit that file.** It is gitignored.

## Already live

- Site: https://loansflow.pages.dev/
- Repo: https://github.com/twoskoops707/loansflow
- Contact: loansflow707@gmail.com

## Networks targeted once password available

1. Google AdSense (primary)
2. Ezoic (apply early; activate ~10k sessions)
3. Mediavine / Raptive waitlist (high CPM; traffic gate)
4. Amazon Associates (mortgage/finance book/tools)
5. Impact / FlexOffers SBA/lending affiliates (later)
