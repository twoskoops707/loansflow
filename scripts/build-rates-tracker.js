#!/usr/bin/env node
/* Builds /loans/sba-7a-rates ("Current SBA 7(a) rates") from data only:
   prime (public/data/market-news.json, FRED DPRIME), maximum spreads (public/data/sba-policy.json), and, when present,
   SBA FOIA median initial rates (public/data/sba-7a-foia.json). Nothing is typed in. Run daily after the rates refresh. */
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, '..', 'public');
const rd = (f) => JSON.parse(fs.readFileSync(path.join(PUB, 'data', f), 'utf8'));
const news = rd('market-news.json'), POL = rd('sba-policy.json'), foia = fs.existsSync(path.join(PUB, 'data', 'sba-7a-foia.json')) ? rd('sba-7a-foia.json') : null;
const M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const long = (s) => `${M[+s.slice(5, 7) - 1]} ${+s.slice(8, 10)}, ${s.slice(0, 4)}`;
const money = (n) => '$' + n.toLocaleString('en-US'), pc = (n) => (Math.round(n * 100) / 100).toFixed(2) + '%';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const stamps = [news.updatedAt, rd('rates.json').updatedAt].filter(Boolean).map((s) => s.slice(0, 10)).sort(), ASOF = stamps[stamps.length - 1];
if (!news.prime || !(news.prime.value > 0)) { console.error('no prime rate in market-news.json; tracker not built'); process.exit(1); }
const prime = news.prime.value, primeAsOf = news.prime.asOf, hist = (news.prime.history || []).filter((h) => h.date && h.value > 0);
const sp = POL.sba7a.maxSpreadOverBase;
const label = (r, i) => r.upToLoan === null ? `Over ${money(sp[i - 1].upToLoan)}` : i === 0 ? `${money(r.upToLoan)} or less` : `${money(sp[i - 1].upToLoan + 1)} to ${money(r.upToLoan)}`;
const rowsNow = sp.map((r, i) => [label(r, i), pc(r.pct), pc(prime + r.pct)]);

const shell = fs.readFileSync(path.join(PUB, 'guides', 'sba-504.html'), 'utf8').replace(/(href|src)="\.\.\//g, '$1="/');
const headRaw = shell.slice(0, shell.indexOf('</head>')), mid = shell.slice(shell.indexOf('</head>'), shell.indexOf('<main')), tail = shell.slice(shell.indexOf('</main>'));
const authorBox = shell.match(/<section class="author-box">[\s\S]*?<\/section>/)[0];
const url = 'https://loansflow.loan/loans/sba-7a-rates';
const smallest = sp[0], largest = sp[sp.length - 1];
const title = 'Current SBA 7(a) Interest Rates | LoansFlow', h1 = 'Current SBA 7(a) interest rates';
const desc = `SBA 7(a) maximum interest rates today: prime ${pc(prime)} plus a spread of ${pc(largest.pct)} to ${pc(smallest.pct)} by loan size, with prime rate history.`;
const table = (cap, head, rows) => `<table class="doc-table"><caption>${cap}</caption><thead><tr>${head.map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

let historySec = '';
if (hist.length >= 2) {
  const h = hist.slice().reverse();
  const maxRate = (v, r) => pc(v + r.pct);
  historySec = `<h2>Prime rate history and the 7(a) maximum rate</h2>
<p>Variable 7(a) rates move when prime moves. This table lists each recent change in the prime rate (FRED series DPRIME) and what the maximum variable rate would have been at that prime rate, using today&rsquo;s maximum spreads. Spreads are shown as of ${long(POL.effective)} and are not a record of past SBA limits.</p>
${table('Recent prime rate changes', ['Prime rate took effect', 'Prime rate', `Maximum rate, ${label(sp[0], 0).toLowerCase()}`, `Maximum rate, ${label(largest, sp.length - 1).toLowerCase()}`], h.map((x) => [long(x.date), pc(x.value), maxRate(x.value, smallest), maxRate(x.value, largest)]))}`;
}
let marketSec = '';
if (foia && foia.years) {
  const ys = foia.years.filter((y) => y.variableMedRate != null && y.fixedMedRate != null).slice(-6).reverse();
  if (ys.length) marketSec = `<h2>What approved loans actually carried</h2>
<p>The maximum is a ceiling. In SBA&rsquo;s public loan data, the median initial rate on approved 7(a) loans was ${ys[0].variableMedRate}% on variable-rate loans and ${ys[0].fixedMedRate}% on fixed-rate loans in fiscal year ${ys[0].fy}. Our <a href="/research/sba-7a-loan-data">7(a) loan data study</a> has the full breakdown.</p>
${table(`Median initial interest rate by fiscal year (SBA FOIA data as of ${long(foia.meta.asOf)})`, ['Fiscal year', 'Variable-rate loans', 'Fixed-rate loans'], ys.map((y) => [`FY${y.fy}`, y.variableMedRate + '%', y.fixedMedRate + '%']))}
<p>Source: <a href="${foia.meta.sourceUrl}" target="_blank" rel="noopener noreferrer">SBA 7(a) &amp; 504 FOIA data</a>. Medians use the initial rate recorded at approval.</p>`;
}
const body = `<p class="lf-crumbs"><a href="/">Home</a> / <a href="/loans/">Loan types</a> / <a href="/loans/sba-7a">SBA 7(a)</a> / Current rates</p>
<h1>${h1}</h1>
<p class="lf-figcap">Updated ${long(ASOF)}.</p>
<div class="lf-answer"><strong>Short answer:</strong> The SBA sets a maximum interest rate on variable-rate 7(a) loans: the prime rate plus a spread that depends on loan size. With prime at <strong>${pc(prime)}</strong> (FRED DPRIME, latest reading ${long(primeAsOf)}), the maximum is <strong>${pc(prime + smallest.pct)}</strong> for loans of ${money(smallest.upToLoan)} or less and <strong>${pc(prime + largest.pct)}</strong> for loans over ${money(sp[sp.length - 2].upToLoan)}. Your lender may charge less.</div>
<h2>Maximum variable rate by loan size</h2>
${table('SBA 7(a) maximum variable rate (prime plus maximum spread)', ['Loan amount', 'Maximum spread over prime', `Maximum rate at prime ${pc(prime)}`], rowsNow)}
<p>Source for spreads: <a href="${POL.sources.terms7a}" target="_blank" rel="noopener noreferrer">SBA 7(a) terms, conditions and eligibility</a> (as of ${long(POL.effective)}). Prime rate: <a href="https://fred.stlouisfed.org/series/DPRIME" target="_blank" rel="noopener noreferrer">FRED DPRIME</a>. Lenders may price below these maximums, and fixed-rate loans are priced by the lender within SBA&rsquo;s limits.</p>
<h2>How to use these rates</h2>
<p>Take the maximum for your loan size as a ceiling when you compare offers, then see what the payment and the SBA upfront fee add in the <a href="/calculators/sba-7a">7(a) loan calculator</a> and the <a href="/calculators/sba-guarantee-fee">guarantee fee calculator</a>. Because variable rates follow prime, your payment can change when prime changes. The <a href="/loans/sba-7a">SBA 7(a) page</a> explains requirements, and <a href="/compare/sba-vs-conventional-term-loan">SBA vs conventional</a> shows how the pricing compares.</p>
${historySec}
${marketSec}
<h2>How this page stays current</h2>
<p>The prime rate comes from FRED and is refreshed every day. The spreads come from our <a href="/data/sba-policy.json">SBA policy data file</a>, which records the effective date and sources. This page is rebuilt from those files, so the numbers above change when the data changes. The page was last built on ${long(ASOF)}. See <a href="/methodology">how our numbers work</a>.</p>
<p class="updated">General information, not financial advice. LoansFlow is not a lender; rates and rules change, so confirm with a lender and the SBA.</p>`;
let head = headRaw.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`).replace(/(<meta name="description" content=")[^"]*"/, `$1${desc}"`).replace(/(<link rel="canonical" href=")[^"]*"/, `$1${url}"`)
  .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${title}"`).replace(/(<meta property="og:description" content=")[^"]*"/, `$1${desc}"`).replace(/(<meta property="og:url" content=")[^"]*"/, `$1${url}"`);
const ld = [{ '@context': 'https://schema.org', '@type': 'Article', headline: h1, description: desc, mainEntityOfPage: url, datePublished: '2026-11-13', dateModified: ASOF, author: { '@id': 'https://loansflow.loan/author#person' }, publisher: { '@type': 'Organization', name: 'LoansFlow', url: 'https://loansflow.loan/' } },
  { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [['Home', '/'], ['Loan types', '/loans/'], ['SBA 7(a)', '/loans/sba-7a'], ['Current rates']].map((c, i) => Object.assign({ '@type': 'ListItem', position: i + 1, name: c[0] }, c[1] ? { item: 'https://loansflow.loan' + c[1] } : {})) }]
  .map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n');
fs.writeFileSync(path.join(PUB, 'loans', 'sba-7a-rates.html'), `${head}\n${ld}${mid}<main id="main" class="legal-page">\n${body}\n${authorBox}\n</main>\n  ${tail.slice(tail.indexOf('<footer'))}`);
console.log(`built /loans/sba-7a-rates (prime ${prime}% as of ${primeAsOf}; history rows: ${hist.length}; foia section: ${marketSec ? 'yes' : 'no'})`);
