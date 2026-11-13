#!/usr/bin/env node
/* Writes crawlable, data-driven sections into existing pages (between <!--lf-data:NAME--> markers; idempotent):
   news/index.html   - dated rates snapshot (prime, Fed funds, SOFR, Treasuries, Freddie Mac mortgage averages with weekly and yearly change)
                       and the current headlines as static HTML (news.js replaces the headline list in the browser)
   compare/index.html - at-a-glance comparison table whose figures come from public/data/sba-policy.json
   Every figure carries its source and date. Run after the rates refresh (daily workflow). */
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, '..', 'public');
const rd = (f) => JSON.parse(fs.readFileSync(path.join(PUB, 'data', f), 'utf8'));
const N = rd('market-news.json'), R = rd('rates.json'), POL = rd('sba-policy.json');
const M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const long = (s) => `${M[+s.slice(5, 7) - 1]} ${+s.slice(8, 10)}, ${s.slice(0, 4)}`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pc = (n) => (Math.round(n * 100) / 100).toFixed(2) + '%', usd = (n) => '$' + n.toLocaleString('en-US');
const table = (cap, head, rows, cls = 'doc-table') => `<table class="${cls}"><caption>${cap}</caption><thead><tr>${head.map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => i ? `<td>${c}</td>` : `<th scope="row">${c}</th>`).join('')}</tr>`).join('')}</tbody></table>`;
const mark = (name, body) => `<!--lf-data:${name}:start-->${body}<!--lf-data:${name}:end-->`;
function put(file, name, body, anchorRe, mode) { // mode 'after' | 'before' | 'inside'
  const p = path.join(PUB, file); let h = fs.readFileSync(p, 'utf8'); const blk = mark(name, body), re = new RegExp(`<!--lf-data:${name}:start-->[\\s\\S]*?<!--lf-data:${name}:end-->`);
  if (re.test(h)) h = h.replace(re, () => blk);
  else { const m = h.match(anchorRe); if (!m) { console.log('anchor not found for', name, 'in', file); return; } const i = m.index;
    h = mode === 'before' ? h.slice(0, i) + blk + h.slice(i) : mode === 'inside' ? h.slice(0, i + m[0].length) + blk + h.slice(i + m[0].length) : h.slice(0, i + m[0].length) + blk + h.slice(i + m[0].length); }
  fs.writeFileSync(p, h);
}

/* ---- news: rates snapshot ---- */
{
  const mort = R.mortgage, hist = mort.history30 || [], last = hist.length ? hist[hist.length - 1] : null;
  const cell = (l) => (N.rates.cells || []).find((c) => c.label === l) || {};
  const wk = last && hist.length > 1 ? last[1] - hist[hist.length - 2][1] : null;
  const yr = hist.length ? hist[0] : null, yd = yr && last ? last[1] - yr[1] : null;
  const dir = (d) => d > 0.005 ? 'up' : d < -0.005 ? 'down' : 'unchanged';
  const rows = [
    ['Prime rate', pc(N.prime.value), `<a href="https://fred.stlouisfed.org/series/DPRIME" target="_blank" rel="noopener noreferrer">FRED DPRIME</a>, latest reading ${long(N.prime.asOf)}`],
    ['Federal funds target range', `${pc(R.fedFunds.targetFrom)} to ${pc(R.fedFunds.targetTo)}`, `<a href="https://www.newyorkfed.org/markets/reference-rates/effr" target="_blank" rel="noopener noreferrer">New York Fed</a>, ${long(R.fedFunds.asOf)}`],
    ['Effective federal funds rate', pc(R.fedFunds.effr), `<a href="https://www.newyorkfed.org/markets/reference-rates/effr" target="_blank" rel="noopener noreferrer">New York Fed</a>, ${long(R.fedFunds.asOf)}`],
    ['SOFR', pc(R.sofr.value), `<a href="https://www.newyorkfed.org/markets/reference-rates/sofr" target="_blank" rel="noopener noreferrer">New York Fed</a>, ${long(R.sofr.asOf)}`],
    ...[['2-year Treasury', 'y2'], ['5-year Treasury', 'y5'], ['10-year Treasury', 'y10'], ['30-year Treasury', 'y30']].map(([l, k]) => [l, pc(R.treasury[k]), `<a href="https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve" target="_blank" rel="noopener noreferrer">U.S. Treasury</a>, ${long(R.treasury.asOf)}`]),
    ['30-year fixed mortgage (average)', pc(mort.m30), `<a href="https://www.freddiemac.com/pmms" target="_blank" rel="noopener noreferrer">Freddie Mac PMMS</a>, ${long(mort.asOf)}${cell('30-Yr Fixed').note ? '; ' + esc(cell('30-Yr Fixed').note) : ''}`],
    ['15-year fixed mortgage (average)', pc(mort.m15), `<a href="https://www.freddiemac.com/pmms" target="_blank" rel="noopener noreferrer">Freddie Mac PMMS</a>, ${long(mort.asOf)}${cell('15-Yr Fixed').note ? '; ' + esc(cell('15-Yr Fixed').note) : ''}`]
  ];
  const sentence = last ? `<p>The Freddie Mac 30-year fixed average was <strong>${pc(last[1])}</strong> as of ${long(last[0])}${wk !== null ? `, ${dir(wk)}${Math.abs(wk) > 0.005 ? ' ' + Math.abs(wk).toFixed(2) + ' percentage points' : ''} from the previous week` : ''}${yd !== null ? ` and ${dir(yd)}${Math.abs(yd) > 0.005 ? ' ' + Math.abs(yd).toFixed(2) + ' points' : ''} from ${pc(yr[1])} a year earlier (${long(yr[0])})` : ''}. Prime is ${pc(N.prime.value)}, so variable-rate SBA 7(a) loans have a maximum rate of ${pc(N.prime.value + POL.sba7a.maxSpreadOverBase[POL.sba7a.maxSpreadOverBase.length - 1].pct)} to ${pc(N.prime.value + POL.sba7a.maxSpreadOverBase[0].pct)} depending on loan size (see <a href="/loans/sba-7a-rates">current SBA 7(a) rates</a>).</p>` : '';
  put('news/index.html', 'snapshot', `<section class="lf-box" style="max-width:80ch;margin:1.5rem 0"><h2>Rates snapshot</h2>${sentence}<details><summary>See every rate with its source and date</summary><div style="overflow-x:auto">${table('Key rates with source and date (page data refreshed ' + long(N.updatedAt.slice(0, 10)) + ')', ['Rate', 'Value', 'Source and date'], rows)}</div></details></section>`, /<p class="lf-lede">[\s\S]*?<\/p>/, 'after');
  const arts = (N.articles || []).slice(0, 24).map((a) => `<article><div class="lf-meta">${esc((a.category || 'News') + ' · ' + (a.source || 'Source'))}</div><h3><a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${esc(a.title)}</a></h3>${a.summary ? `<p>${esc(a.summary)}</p>` : ''}${a.publishedAt ? `<time>${long(a.publishedAt.slice(0, 10))}</time>` : ''}</article>`).join('');
  put('news/index.html', 'headlines', arts, /<div class="lf-news" id="lf-news"[^>]*>/, 'inside');
}

/* ---- compare hub: at a glance ---- */
{
  const s = POL.sba7a, k = POL.sba504, f = s.upfrontFee, tiers = f.tiers.map((t) => t.pctOfGuaranteed), top = f.above.pctRest;
  const rows = [
    ['Who makes the loan', 'A bank or other SBA-approved lender', 'A bank (first lien) plus an SBA-backed Certified Development Company (CDC)', 'A bank or credit union', 'A non-bank online lender'],
    ['Government role', `SBA guarantees ${s.guaranty.smallLoanPct}% up to ${usd(s.guaranty.smallLoanMax)} and ${s.guaranty.largeLoanPct}% above`, 'SBA backs the CDC portion (up to 40%)', 'None', 'None'],
    ['Size limit', `Up to ${usd(s.maxLoan)}`, 'Set by the project; see the 504 page', 'Whatever the lender will carry', 'Set by the lender'],
    ['Cash you put in', `At least ${s.equityInjectionMinPct}% equity for a change of ownership`, `About ${k.equityPct}%, plus ${k.newBusinessExtraPct} points for a new business and ${k.specialPurposeExtraPct} for special-purpose property`, 'Set by the lender; usually more than SBA', 'Set by the lender'],
    ['Interest rate', `Variable rates are capped at prime plus ${pc(s.maxSpreadOverBase[s.maxSpreadOverBase.length - 1].pct)} to ${pc(s.maxSpreadOverBase[0].pct)} by size`, 'CDC portion fixed for the full term', 'Fixed or variable, set by the lender', 'Often a factor rate or short term; compare the APR'],
    ['Upfront fees', `SBA fee of ${tiers.map((t) => pc(t).replace('.00', '')).join(' to ')} of the guaranteed portion, rising to ${pc(top)} on large loans`, `${pc(k.upfrontPct)} upfront and ${pc(k.annualPct)} a year on the debenture`, 'Lender fees only', 'Origination fees'],
    ['Best for', 'Flexible uses: working capital, equipment, a business purchase', 'Owner-occupied real estate and long-life equipment', 'Strong borrowers who want speed and fewer forms', 'Speed when time matters more than cost']
  ];
  put('compare/index.html', 'glance', `<h2>At a glance</h2><p>Figures for the SBA programs come from our <a href="/data/sba-policy.json">SBA policy data</a> (fiscal year ${POL.fiscalYear}, effective ${long(POL.effective)}; sources: <a href="${POL.sources.terms7a}" target="_blank" rel="noopener noreferrer">SBA 7(a) terms</a> and <a href="${POL.sources.fees7a}" target="_blank" rel="noopener noreferrer">fee notice</a>). Conventional and online terms vary by lender, so confirm them in writing.</p><div style="overflow-x:auto">${table('Business loan options compared', ['', 'SBA 7(a)', 'SBA 504', 'Conventional term loan', 'Online lender'], rows)}</div><p>Read the full comparisons for the reasoning: <a href="/compare/sba-7a-vs-504">7(a) vs 504</a>, <a href="/compare/sba-vs-conventional-term-loan">SBA vs conventional</a> and <a href="/compare/sba-vs-online-lender">SBA vs online lender</a>. Then test the numbers in the <a href="/calculators/sba-7a">7(a) calculator</a> or the <a href="/calculators/loan-payment">loan payment calculator</a>.</p>`, /<h2>The loan pages<\/h2>/, 'before');
}
console.log('data sections written (news snapshot + headlines, compare table)');
