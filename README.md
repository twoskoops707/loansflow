# LoansFlow

Free **SBA / commercial / mortgage** calculator suite — high-intent finance tools monetized with AdSense → Ezoic (Incubator), plus affiliate outreach.

**Live:** [https://loansflow.loan/](https://loansflow.loan/)  
**Pages:** [loansflow-live.pages.dev](https://loansflow-live.pages.dev/) · legacy [loansflow.pages.dev](https://loansflow.pages.dev/)  
**Contact:** loansflow707@gmail.com  
**Launch status:** [docs/LAUNCH.md](docs/LAUNCH.md)

## Features

- SBA 7(a), SBA 504, conventional commercial (payment, guaranty fee, DSCR)
- Commercial amortization + balloon
- Business line of credit (draws, interest-only / % balance)
- Mortgage PITI, amortization, refinance compare, affordability
- Market news / rates page
- Ad slots + `ads.txt` for Google AdSense (Ezoic JS for Incubator detection)
- Legal: About, Contact, Privacy, Disclaimer, Terms

## Market news (auto-updating)

The **Market News & Rates** step loads live data from:

1. Cloudflare Pages Function `GET /api/market-news` (Freddie Mac PMMS + Fed/news feeds, edge-cached ~30 min)
2. Fallback snapshot `public/data/market-news.json`

Refresh the snapshot locally or in CI:

```bash
npm run news:refresh
```

A scheduled GitHub Action (`.github/workflows/refresh-market-news.yml`) updates the JSON daily.
## Local

```bash
npm run dev
```

Open http://localhost:4173

## Deploy (Cloudflare Pages)

Primary project: **`loansflow-live`** on Foremost Vole (serves `loansflow.loan`). See [docs/DOMAIN.md](docs/DOMAIN.md).

```bash
# WSL example
bash tools/browser/deploy-pages-wsl.sh
```

Or:

```bash
npm run pages:deploy
```

## Ads

Publisher: `ca-pub-7523216981025331` (configured in page shells + `js/ads.js`).  
`public/ads.txt` must stay:

```
google.com, pub-7523216981025331, DIRECT, f08c47fec0942fa0
```

Slot map: [docs/ADS.md](docs/ADS.md). Do not rewrite ads.txt to Ezoic until AdSense is Ready — see [docs/automation/EZOIC.md](docs/automation/EZOIC.md).

## Stack

Static site on Cloudflare Pages. Calculator logic ported from the original LoansFlow HTML suite.
