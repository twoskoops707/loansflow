#!/usr/bin/env node
/**
 * Builds public/data/rates.json from free, keyless public sources:
 *  - NY Fed Markets API: SOFR and effective fed funds rate (with target range)
 *  - U.S. Treasury daily par yield curve (XML): 2, 5, 10, 30-year
 *  - Freddie Mac PMMS history CSV: 30- and 15-year fixed, last 52 weeks
 *  - Prime rate: read from public/data/market-news.json (refreshed from FRED by refresh-market-news.mjs)
 * Any source that fails keeps its previous value from the existing file, so one outage never blanks the widget.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const DIR = dirname(fileURLToPath(import.meta.url));
const OUT = join(DIR, '../../public/data/rates.json');
const NEWS = join(DIR, '../../public/data/market-news.json');
const UA = 'LoansFlowRatesBot/1.0 (+https://loansflow.loan/; educational)';
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const get = async (u) => { const r = await fetch(u, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) }); if (!r.ok) throw new Error(u + ' ' + r.status); return r; };
const out = { updatedAt: new Date().toISOString(), sources: {} };
const keep = (k, why) => { console.warn(`keeping previous ${k}: ${why}`); if (prev[k]) out[k] = prev[k]; };

try { const j = await (await get('https://markets.newyorkfed.org/api/rates/secured/sofr/last/1.json')).json(); const r = j.refRates[0]; out.sofr = { value: r.percentRate, asOf: r.effectiveDate }; } catch (e) { keep('sofr', e.message); }
try { const j = await (await get('https://markets.newyorkfed.org/api/rates/unsecured/effr/last/1.json')).json(); const r = j.refRates[0]; out.fedFunds = { effr: r.percentRate, targetFrom: r.targetRateFrom, targetTo: r.targetRateTo, asOf: r.effectiveDate }; } catch (e) { keep('fedFunds', e.message); }
try {
  const now = new Date(); const ym = (d) => `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  let entries = [];
  for (const d of [now, new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))]) {
    const x = await (await get(`https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value_month=${ym(d)}`)).text();
    entries = x.match(/<entry>[\s\S]*?<\/entry>/g) || []; if (entries.length) break;
  }
  const last = entries[entries.length - 1], v = (t) => parseFloat((last.match(new RegExp(`<d:${t}[^>]*>([^<]*)<`)) || [])[1]);
  out.treasury = { asOf: (last.match(/<d:NEW_DATE[^>]*>([^<T]*)/) || [])[1], y2: v('BC_2YEAR'), y5: v('BC_5YEAR'), y10: v('BC_10YEAR'), y30: v('BC_30YEAR') };
  if (![out.treasury.y5, out.treasury.y10].every(Number.isFinite)) throw new Error('unparseable yields');
} catch (e) { keep('treasury', e.message); }
try {
  const csv = await (await get('https://www.freddiemac.com/pmms/docs/PMMS_history.csv')).text();
  const rows = csv.trim().split('\n').slice(1).map((l) => l.split(',')).filter((c) => c[1] && !isNaN(parseFloat(c[1])));
  const tail = rows.slice(-52), l = rows[rows.length - 1];
  const iso = (s) => { const [m, d, y] = s.split('/'); return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`; };
  out.mortgage = { asOf: iso(l[0]), m30: parseFloat(l[1]), m15: parseFloat(l[3]), history30: tail.map((c) => [iso(c[0]), parseFloat(c[1])]) };
} catch (e) { keep('mortgage', e.message); }
try { const n = JSON.parse(readFileSync(NEWS, 'utf8')); if (n.prime && n.prime.value > 0 && n.prime.value < 30) out.prime = { value: n.prime.value, asOf: n.prime.asOf }; else throw new Error('no prime'); } catch (e) { keep('prime', e.message); }
out.sources = {
  prime: 'https://fred.stlouisfed.org/series/DPRIME', fedFunds: 'https://www.newyorkfed.org/markets/reference-rates/effr', sofr: 'https://www.newyorkfed.org/markets/reference-rates/sofr',
  treasury: 'https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve', mortgage: 'https://www.freddiemac.com/pmms',
};
writeFileSync(OUT, JSON.stringify(out) + '\n');
console.log('rates.json updated:', Object.keys(out).filter((k) => k !== 'sources' && k !== 'updatedAt').join(', '));
