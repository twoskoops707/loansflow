#!/usr/bin/env node
/* Checks every external URL the site links to (page hrefs plus URLs in public/data/*.json that pages render as links).
   Reports anything that is not a final 2xx after redirects: 4xx (403/404/405...), 5xx, DNS or timeout failures.
   Usage: node scripts/check-external-links.js [--json out.json]   (exit 1 if any link fails) */
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, '..', 'public');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const urls = new Map(); // url -> [files]
const add = (u, f) => { u = u.replace(/&amp;/g, '&').replace(/[#].*$/, '').replace(/[.,;)]+$/, ''); if (!/^https?:\/\//.test(u) || /loansflow\.loan/.test(u)) return; (urls.get(u) || urls.set(u, []).get(u)).push(f); };
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f), rel = path.relative(PUB, p);
  if (fs.statSync(p).isDirectory()) { walk(p); continue; }
  if (f.endsWith('.html')) { const h = fs.readFileSync(p, 'utf8'); for (const m of h.matchAll(/(?:href|src)="(https?:[^"]+)"/g)) add(m[1], rel); }
  else if (f.endsWith('.json') && !/market-news|sba-7a-foia|search-index/.test(f)) { for (const m of fs.readFileSync(p, 'utf8').matchAll(/https?:\/\/[^"\s\\]+/g)) add(m[0], rel); } } })(PUB);
async function check(u) {
  const t = (m) => fetch(u, { method: m, redirect: 'follow', headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9' }, signal: AbortSignal.timeout(30000) });
  try { let r = await t('GET'); if (r.status >= 400) { await new Promise((z) => setTimeout(z, 1500)); r = await t('GET'); } return { status: r.status, final: r.url }; }
  catch (e) { return { status: 0, error: (e.cause && (e.cause.code || e.cause.message)) || e.message }; }
}
(async () => {
  const list = [...urls.keys()].sort(), out = [], q = list.slice(); let bad = 0;
  await Promise.all(Array.from({ length: 8 }, async () => { while (q.length) { const u = q.shift(), r = await check(u); out.push(Object.assign({ url: u, files: [...new Set(urls.get(u))] }, r)); } }));
  out.sort((a, b) => a.url.localeCompare(b.url));
  for (const r of out) if (!(r.status >= 200 && r.status < 300)) { bad++; console.log(`FAIL ${r.status || 'ERR'} ${r.error || ''} ${r.url}\n     in: ${r.files.slice(0, 3).join(', ')}${r.files.length > 3 ? ' +' + (r.files.length - 3) : ''}`); }
  console.log(`${out.length} external URLs checked, ${bad} failing`);
  const j = process.argv.indexOf('--json'); if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify(out, null, 1));
  process.exit(bad ? 1 : 0);
})();
