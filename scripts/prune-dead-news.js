#!/usr/bin/env node
/* After the daily news refresh: drops any article in public/data/market-news.json whose link does not return a final 2xx,
   so the news page never links to a 403/404/405/5xx. Run by the daily workflow before committing. */
const fs = require('fs'), path = require('path');
const F = path.join(__dirname, '..', 'public', 'data', 'market-news.json');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const ok = async (u) => { for (let i = 0; i < 2; i++) { try { const r = await fetch(u, { redirect: 'follow', headers: { 'User-Agent': UA, Accept: 'text/html,*/*;q=0.8' }, signal: AbortSignal.timeout(25000) }); if (r.status >= 200 && r.status < 300) return true; if (r.status < 500 && r.status !== 429 && i) return false; } catch (e) {} await new Promise((z) => setTimeout(z, 1500)); } return false; };
(async () => {
  const d = JSON.parse(fs.readFileSync(F, 'utf8')); const before = (d.articles || []).length, keep = [];
  await Promise.all((d.articles || []).map(async (a) => { a._ok = !a.url || await ok(a.url); }));
  for (const a of d.articles || []) { if (a._ok) { delete a._ok; keep.push(a); } else console.log('dropped dead link:', a.url); }
  d.articles = keep; fs.writeFileSync(F, JSON.stringify(d, null, 2));
  console.log(`news links: kept ${keep.length} of ${before}`);
})();
