# LoansFlow

Free **SBA / commercial / mortgage** calculator suite â€” high-intent finance tools designed to monetize with AdSense â†’ Ezoic.

**Live:** [https://loansflow.pages.dev/](https://loansflow.pages.dev/) (free)  
**Custom domain later:** optional cheap TLD — see [docs/DOMAIN.md](docs/DOMAIN.md)  
**Contact:** loansflow707@gmail.com


## Features

- SBA 7(a), SBA 504, conventional commercial (payment, guaranty fee, DSCR)
- Commercial amortization + balloon
- Business line of credit (draws, interest-only / % balance)
- Mortgage PITI, amortization, refinance compare, affordability
- Market news / rates page
- Ad slots + `ads.txt` ready for Google AdSense / Ezoic
- Legal: About, Contact, Privacy, Disclaimer, Terms

## Local

```bash
npm run dev
```

Open http://localhost:4173

## Deploy (Cloudflare Pages)

1. Push to GitHub (`twoskoops707/loansflow`).
2. Cloudflare Dashboard â†’ Workers & Pages â†’ Create â†’ Connect repo â†’ output directory `public`.
3. Buy **loansflows.com** (or `.io`) â†’ add domain in Pages â†’ point nameservers / CNAME to Cloudflare.

Or CLI (needs `CLOUDFLARE_API_TOKEN`):

```bash
npm run pages:deploy
```

## Turn on ads

1. Apply [Google AdSense](https://www.google.com/adsense/) with site URL + `ads.txt`.
2. Set in page shells / `js/ads.js` config:

```js
window.LOANSFLOW_ADS = {
  provider: 'adsense',
  adsenseClient: 'ca-pub-XXXXXXXXXXXXXXXX'
};
```

3. Replace placeholder line in `public/ads.txt` with your real `pub-` ID.
4. At ~10k sessions/mo, evaluate **Ezoic** mediation (often higher finance RPM).

## Stack

Static site on Cloudflare Pages. Calculator logic ported from the original LoansFlow HTML suite.
