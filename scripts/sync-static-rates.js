#!/usr/bin/env node
/* Rewrites the static fallback rate text in the HTML from public/data/market-news.json so pages stay correct without JavaScript.
   Run after tools/news/refresh-market-news.mjs (the daily workflow does this). */
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, '..', 'public');
const d = JSON.parse(fs.readFileSync(path.join(PUB, 'data', 'market-news.json'), 'utf8'));
const M = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const iso = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? `${M[+m[2]-1]} ${+m[3]}, ${m[1]}` : ''; };
const us = (s) => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s || ''); return m ? `${M[+m[1]-1]} ${+m[2]}, ${m[3]}` : ''; };
const cell = (l) => ((d.rates.cells || []).find((c) => c.label === l) || {}).value || '';
const prime = d.prime && d.prime.value > 0 && d.prime.value < 30 ? d.prime.value : null;
const vals = { prime: prime ? prime.toFixed(2) + '%' : '', 'prime-asof': d.prime ? iso(d.prime.asOf) : '', m30: cell('30-Yr Fixed'), m15: cell('15-Yr Fixed'), 'pmms-asof': us(d.rates.asOf) };
let changed = 0;
for (const rel of ['loans/mortgage.html', 'loans/line-of-credit.html', 'loans/sba-7a.html', 'loans/sba-express.html', 'loans/commercial-term-loan.html']) {
  const p = path.join(PUB, rel); let h = fs.readFileSync(p, 'utf8'); const o = h;
  h = h.replace(/(<span data-live="([a-z0-9-]+)">)([^<]*)(<\/span>)/g, (m, a, k, t, z) => (vals[k] ? a + vals[k] + z : m));
  if (rel.endsWith('sba-7a.html') && prime) {
    h = h.replace(/(<strong id="sr-prime">)[^<]*/, '$1' + prime.toFixed(2) + '%').replace(/(<span id="sr-asof">)[^<]*/, '$1' + vals['prime-asof']);
    h = h.replace(/<tr data-spread="([\d.]+)">([\s\S]*?)<td class="sr-max">[^<]*<\/td>/g, (m, s, mid) => `<tr data-spread="${s}">${mid}<td class="sr-max">${(prime + +s).toFixed(2)}%</td>`);
  }
  if (h !== o) { fs.writeFileSync(p, h); changed++; }
}
console.log('static rate fallbacks refreshed in', changed, 'files');
