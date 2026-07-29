# Launch checklist (when you're back)

## Done in repo
- [x] Redesigned landing + calculator suite
- [x] Working math (SBA / commercial / LOC / mortgage)
- [x] Ad placeholders + ads.js switch
- [x] Legal pages + contact loansflow707@gmail.com
- [x] GitHub repo + Cloudflare Pages wiring

## You do (10–20 min)
1. **Buy domain** — `loansflow.top` or `loansflow.io` (Namecheap / Cloudflare Registrar / Porkbun).
2. **Cloudflare Pages** — if GitHub Action secrets missing, connect repo in dashboard:
   - Output directory: `public`
   - Custom domain → add `loansflow.top`
3. **Add GitHub secrets** (for Actions deploy):
   - `CLOUDFLARE_API_TOKEN` (Pages edit)
   - `CLOUDFLARE_ACCOUNT_ID`
4. **AdSense** — apply with live URL; then set `window.LOANSFLOW_ADS` + real `ads.txt` pub line.
5. **Ezoic** — revisit after traffic; finance niches often clear higher RPM via mediation.

## Local preview
```bash
npm run dev
```
→ http://localhost:4173
