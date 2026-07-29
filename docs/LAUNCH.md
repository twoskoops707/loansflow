# Launch checklist

## Done
- [x] Redesigned site live: https://twoskoops707.github.io/loansflow/
- [x] Repo: https://github.com/twoskoops707/loansflow
- [x] Ad placeholders + ads.txt + legal (loansflow707@gmail.com)
- [x] FamFlow LoansFlow sequences generated (8 unique stems) — pushed to FamFlow main
- [x] Ad-network watcher running (waits for Gmail password drop-file)

## BLOCKED — need one secret (no click required)
Google password for **loansflow707@gmail.com** is not saved in Chrome.
Create this file with the password on one line:

`C:\Users\jsmil\.cursor\loansflow\docs\automation\.secret-gmail-password.txt`

Watcher (`tools/browser/watch-and-apply.js`) will then auto-run:
1. Google AdSense application
2. Ezoic publisher signup
3. Mediavine publishing page
4. Amazon Associates

If 2FA challenges, automation writes `docs/automation/BLOCKED-2FA.txt` and stops.

## Still needs payment login (can't automate card checkout without vault access)
1. Buy **loansflow.top** or **loansflow.io**
2. Cloudflare Pages → connect `twoskoops707/loansflow`, output `public`, custom domain
3. Optional GitHub secrets: `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`

## Start farm (LoansFlow slug)
```powershell
cd C:\Users\jsmil\famflow
py scripts/generate_loansflow_sequences.py --clean
# Point farm site selector to slug: loansflow (unique-seq rules same as DabFlow)
```

Sequences: `automation/recordings/sequences/loansflow/`
