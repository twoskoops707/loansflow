#!/usr/bin/env node
/* One "as of" date for the whole site, sourced once.
   ASOF = the date the live figures were last refreshed and checked against their sources
   (newest of market-news.json / rates.json "updatedAt"). This script writes it into every rate-bearing page
   (loan pages and calculators): the "Updated" stamp, the "Figures as of" line and JSON-LD dateModified,
   so they cannot disagree. Source observation dates (e.g. the FRED prime reading) are labeled "latest reading"
   and are NOT the page date. Fee-schedule dates stay "effective <date>". Run by the daily workflow after sync-static-rates.js. */
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, '..', 'public');
const rd = (f) => JSON.parse(fs.readFileSync(path.join(PUB, 'data', f), 'utf8'));
const stamps = [rd('market-news.json').updatedAt, rd('rates.json').updatedAt].filter(Boolean).map((s) => s.slice(0, 10)).sort();
const ISO = stamps[stamps.length - 1];
if (!/^\d{4}-\d{2}-\d{2}$/.test(ISO)) { console.error('no valid updatedAt'); process.exit(1); }
const M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const LONG = `${M[+ISO.slice(5, 7) - 1]} ${+ISO.slice(8)}, ${ISO.slice(0, 4)}`;
const D = '(?:' + M.join('|') + ') \\d{1,2}, 20\\d\\d';
let changed = 0;
for (const dir of ['loans', 'calculators']) for (const f of fs.readdirSync(path.join(PUB, dir)).filter((x) => x.endsWith('.html') && x !== 'index.html')) {
  const p = path.join(PUB, dir, f); const h = fs.readFileSync(p, 'utf8');
  const o = h
    .replace(new RegExp('Updated ' + D, 'g'), 'Updated ' + LONG)
    .replace(new RegExp('Figures as of ' + D, 'g'), 'Figures as of ' + LONG)
    .replace(/("dateModified": ?")\d{4}-\d{2}-\d{2}/g, '$1' + ISO)
    .replace(/\(as of (<span (?:id="sr-asof"|data-live="(?:prime|pmms)-asof")>)/g, '(latest reading $1');
  if (o !== h) { fs.writeFileSync(p, o); changed++; }
}
{ const p = path.join(PUB, 'news', 'index.html'); const h = fs.readFileSync(p, 'utf8'); const o = h.replace(new RegExp('updated ' + D, 'g'), 'updated ' + LONG); if (o !== h) { fs.writeFileSync(p, o); changed++; } }
console.log(`as-of ${LONG}: ${changed} files updated`);
