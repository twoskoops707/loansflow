#!/usr/bin/env node
/* Builds the SBA 7(a) data study and the per-state pages from public/data/sba-7a-foia.json (see aggregate.py).
   EVERY number on these pages is computed from that JSON or from public/data/sba-policy.json; nothing is typed in.
   Re-run after aggregate.py (the refresh workflow does): node scripts/sba-foia/build-pages.js
   Visibility: pages are built noindex and left out of the sitemap until site.config.json has "publishSbaDataStudy": true. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..'), PUB = path.join(ROOT, 'public');
const D = JSON.parse(fs.readFileSync(path.join(PUB, 'data', 'sba-7a-foia.json'), 'utf8'));
const POL = JSON.parse(fs.readFileSync(path.join(PUB, 'data', 'sba-policy.json'), 'utf8'));
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const PUBLISH = cfg.publishSbaDataStudy === true;
const MIN_STATE_LOANS_5Y = 300; // a state page is generated only with at least this many approvals in the 5-year window
const M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (s) => `${M[+s.slice(5, 7) - 1]} ${+s.slice(8, 10)}, ${s.slice(0, 4)}`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const int = (n) => Math.round(n).toLocaleString('en-US');
const usdS = (n) => n == null ? 'n/a' : n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : '$' + int(n);
const usdL = (n) => n >= 1e9 ? `$${(n / 1e9).toFixed(1)} billion` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)} million` : '$' + int(n);
const pct = (x, d = 0) => (x * 100).toFixed(d) + '%';
const slug = (n) => n.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
const money0 = (n) => '$' + int(n);
const dir = (a, b) => b > a * 1.005 ? 'rose' : b < a * 0.995 ? 'fell' : 'was about flat';
const chg = (a, b) => Math.abs(b / a - 1);

const Y = D.years, L = Y[Y.length - 1], PRV = Y[Y.length - 2];
const Y5 = Y.find((y) => y.fy === L.fy - 5), Y10 = Y.filter((y) => y.fy > L.fy - 10);
const asOf = longDate(D.meta.asOf), W = D.window, src = D.meta.sourceUrl;
const gp = POL.sba7a.guaranty;
const published = (() => { // first build date, kept so datePublished never moves
  const p = path.join(__dirname, 'published.json');
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8')).datePublished;
  fs.writeFileSync(p, JSON.stringify({ datePublished: D.meta.generated }, null, 2) + '\n'); return D.meta.generated;
})();

/* ---------- charts (static inline SVG, theme variables, with a data table next to each) ---------- */
function niceMax(v) { const raw = v / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p; return [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((x) => x >= f - 1e-9) * p * 4; }
function axisFmt(v, kind) { return kind === 'usd' ? (v >= 1e9 ? `$${+(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${+(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${+(v / 1e3).toFixed(0)}K` : '$' + v) : kind === 'pct' ? v + '%' : int(v); }
function barChart(id, title, desc, rows, kind) {
  const w = 720, h = 300, l = 62, r = 10, t = 14, b = 38, pw = w - l - r, ph = h - t - b;
  const max = niceMax(Math.max(...rows.map((x) => x.y)) * 1.04), bw = pw / rows.length;
  let s = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${id}-t ${id}-d"><title id="${id}-t">${esc(title)}</title><desc id="${id}-d">${esc(desc)}</desc>`;
  for (let i = 0; i <= 4; i++) { const v = max * i / 4, y = t + ph - ph * i / 4; s += `<line class="gr" x1="${l}" x2="${w - r}" y1="${y}" y2="${y}"/><text x="${l - 6}" y="${y + 4}" text-anchor="end">${axisFmt(v, kind)}</text>`; }
  rows.forEach((x, i) => {
    const bh = ph * x.y / max, bx = l + i * bw + bw * 0.14;
    s += `<rect class="bar" x="${bx.toFixed(1)}" y="${(t + ph - bh).toFixed(1)}" width="${(bw * 0.72).toFixed(1)}" height="${bh.toFixed(1)}"><title>${esc(x.x)}: ${axisFmt(x.y, kind)}</title></rect>`;
    if (rows.length <= 14 || i % 2 === rows.length % 2) s += `<text x="${(l + i * bw + bw / 2).toFixed(1)}" y="${h - 14}" text-anchor="middle">${esc(x.x)}</text>`;
  });
  return s + `<line class="ax" x1="${l}" x2="${w - r}" y1="${t + ph}" y2="${t + ph}"/></svg>`;
}
function lineChart(id, title, desc, xs, series, kind) {
  const w = 720, h = 300, l = 62, r = 14, t = 28, b = 38, pw = w - l - r, ph = h - t - b;
  const all = series.flatMap((x) => x.v.filter((q) => q != null)), max = niceMax(Math.max(...all) * 1.05);
  const X = (i) => l + (xs.length === 1 ? pw / 2 : pw * i / (xs.length - 1)), Yy = (v) => t + ph - ph * v / max;
  let s = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${id}-t ${id}-d"><title id="${id}-t">${esc(title)}</title><desc id="${id}-d">${esc(desc)}</desc>`;
  for (let i = 0; i <= 4; i++) { const v = max * i / 4, y = t + ph - ph * i / 4; s += `<line class="gr" x1="${l}" x2="${w - r}" y1="${y}" y2="${y}"/><text x="${l - 6}" y="${y + 4}" text-anchor="end">${axisFmt(+v.toFixed(2), kind)}</text>`; }
  xs.forEach((x, i) => { if (xs.length <= 14 || i % 2 === xs.length % 2) s += `<text x="${X(i).toFixed(1)}" y="${h - 14}" text-anchor="middle">${esc(x)}</text>`; });
  series.forEach((se, k) => {
    let d = '', pen = false;
    se.v.forEach((v, i) => { if (v == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${X(i).toFixed(1)} ${Yy(v).toFixed(1)} `; pen = true; });
    s += `<path class="l${k + 1}" d="${d.trim()}"/>`;
    s += `<rect class="lg${k + 1}" x="${l + k * 190}" y="6" width="12" height="12" rx="2"/><text x="${l + k * 190 + 18}" y="16">${esc(se.name)}</text>`;
  });
  return s + `<line class="ax" x1="${l}" x2="${w - r}" y1="${t + ph}" y2="${t + ph}"/></svg>`;
}
const fig = (svg, cap) => `<figure class="dv">${svg}<figcaption>${cap}</figcaption></figure>`;
const table = (cap, head, rows) => `<table class="doc-table"><caption>${cap}</caption><thead><tr>${head.map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

/* ---------- shell: reuse the header, footer and head of an existing article page ---------- */
const shell = fs.readFileSync(path.join(PUB, 'guides', 'sba-504.html'), 'utf8').replace(/(href|src)="\.\.\//g, '$1="/');
const headRaw = shell.slice(0, shell.indexOf('</head>')), mid = shell.slice(shell.indexOf('</head>'), shell.indexOf('<main')), tail = shell.slice(shell.indexOf('</main>'));
/* These pages are computed from SBA data, not written by an individual: attribute them to LoansFlow, not to the author. */
const authorBox = '<section class="author-box"><p><strong>Prepared by LoansFlow</strong><br>Original analysis of the SBA&rsquo;s public 7(a) loan data, rebuilt automatically when SBA publishes a new quarterly file. See <a href="/methodology">how our numbers work</a> and our <a href="/editorial-policy">editorial policy</a>. LoansFlow is educational and independent, not a lender.</p></section>';
const CSS = `<style>.dv{margin:1.5rem 0;max-width:90ch}.dv svg{width:100%;height:auto;display:block}.dv text{fill:var(--muted);font:12px Inter,system-ui,sans-serif}.dv .gr{stroke:var(--line)}.dv .ax{stroke:var(--line-strong)}.dv .bar{fill:var(--accent)}.dv .l1{stroke:var(--accent);fill:none;stroke-width:2.5}.dv .l2{stroke:#7aa2ff;fill:none;stroke-width:2.5}.dv .lg1{fill:var(--accent)}.dv .lg2{fill:#7aa2ff}.dv figcaption{color:var(--muted);font-size:.85rem;margin-top:.4rem}.tbl-wrap{overflow-x:auto}.legal-page .doc-table td:nth-child(n+2){text-align:right;font-variant-numeric:tabular-nums}.legal-page .doc-table th:nth-child(n+2){text-align:right}.legal-page .doc-table td:first-child a{color:var(--accent)}</style>`;

function page({ url, title, desc, crumbs, body, ld }) {
  let head = headRaw.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*"/, `$1${esc(desc)}"`).replace(/(<link rel="canonical" href=")[^"]*"/, `$1${url}"`)
    .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${esc(title)}"`).replace(/(<meta property="og:description" content=")[^"]*"/, `$1${esc(desc)}"`)
    .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${url}"`).replace(/(<meta name="robots" content=")[^"]*"/, `$1${PUBLISH ? 'index, follow' : 'noindex, nofollow'}"`);
  const bc = { '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => Object.assign({ '@type': 'ListItem', position: i + 1, name: c[0] }, c[1] ? { item: 'https://loansflow.loan' + c[1] } : {})) };
  const blocks = [].concat(ld, bc).map((o) => `<script type="application/ld+json">${JSON.stringify(Object.assign({ '@context': 'https://schema.org' }, o))}</script>`).join('\n');
  const trail = crumbs.map((c, i) => c[1] && i < crumbs.length - 1 ? `<a href="${c[1]}">${esc(c[0])}</a>` : esc(c[0])).join(' / ');
  return `${head}\n${CSS}\n${blocks}${mid}<main id="main" class="legal-page">\n<p class="lf-crumbs">${trail}</p>\n${body}\n${authorBox}\n</main>\n  ${tail.slice(tail.indexOf('<footer'))}`;
}
const article = (url, headline, desc) => ({ '@type': 'Article', headline, description: desc, mainEntityOfPage: url, datePublished: published, dateModified: D.meta.generated,
  author: { '@type': 'Organization', name: 'LoansFlow', url: 'https://loansflow.loan/' }, publisher: { '@type': 'Organization', name: 'LoansFlow', url: 'https://loansflow.loan/' } });
const write = (rel, html) => { const p = path.join(PUB, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, html); };

const secName = (c) => D.sectors[c], stName = (s) => D.stateNames[s];
const winYears = (rec) => Object.entries(rec).filter(([fy]) => +fy >= W.fromFY && +fy <= W.toFY).map(([, v]) => v);
const stateTotals = {}; // 5-year window totals and latest FY per state
for (const [s, byFy] of Object.entries(D.byState)) {
  const w = winYears(byFy); stateTotals[s] = { n5: w.reduce((a, b) => a + b.n, 0), usd5: w.reduce((a, b) => a + b.usd, 0), latest: byFy[L.fy] || null };
}
const eligible = Object.keys(stateTotals).filter((s) => stateTotals[s].n5 >= MIN_STATE_LOANS_5Y && stateTotals[s].latest && stateTotals[s].latest.n > 0).sort((a, b) => stName(a).localeCompare(stName(b)));
const rankBy = (key) => { const o = eligible.slice().sort((a, b) => stateTotals[b].latest[key] - stateTotals[a].latest[key]); return Object.fromEntries(o.map((s, i) => [s, i + 1])); };
const rkN = rankBy('n'), rkUsd = rankBy('usd'), rkMed = (() => { const o = eligible.filter((s) => stateTotals[s].latest.med != null).sort((a, b) => stateTotals[b].latest.med - stateTotals[a].latest.med); return Object.fromEntries(o.map((s, i) => [s, i + 1])); })();
const ord = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10 > 3 ? 0 : n % 10]);
const natSecTotal = Object.values(D.sectors5y).reduce((a, b) => a + b.n, 0);
const secRows = (obj, tot) => Object.entries(obj).sort((a, b) => b[1].usd - a[1].usd).slice(0, 10).map(([c, v]) => [esc(secName(c)), int(v.n), usdS(v.usd), v.med == null ? 'n/a' : usdS(v.med), pct(v.n / tot, 1)]);
const lenderRows = (arr, n) => arr.slice(0, n).map((x) => [esc(x.name), int(x.n), usdS(x.usd)]);
const defs = D.meta.definitions;
const dataNote = `<h2>Where the numbers come from</h2>
<p>All figures come from the U.S. Small Business Administration&rsquo;s public <a href="${src}" target="_blank" rel="noopener noreferrer">7(a) &amp; 504 FOIA loan data</a> (publisher: SBA; license: U.S. Government Works, public domain). The files used here are dated <strong>${asOf}</strong>. SBA updates the data quarterly, typically about a month after each quarter ends, and these pages are rebuilt from the newest file when it appears. Dollar amounts are nominal (not adjusted for inflation).</p>
<ul><li><strong>Loan:</strong> ${esc(defs.loan)}</li><li><strong>Dollars:</strong> ${esc(defs.dollars)}</li><li><strong>Fiscal year:</strong> ${esc(defs.fiscalYear)}</li><li><strong>State:</strong> ${esc(defs.state)}</li><li><strong>Industry:</strong> ${esc(defs.industry)}</li><li><strong>Medians</strong> are shown only for groups with at least ${D.meta.minGroupForMedian} loans.</li></ul>
<p>The summary behind these pages is published as <a href="/data/sba-7a-foia.json">one JSON file</a> with no borrower names or individual loan records. Approvals are not a forecast of whether a particular application will be approved, and they are not rate quotes.</p>`;
const disclaimer = `<p class="updated">General information, not financial, tax or legal advice. LoansFlow is not a lender.</p>`;

/* ---------- the data study ---------- */
function study() {
  const url = 'https://loansflow.loan/research/sba-7a-loan-data';
  const peak = Y.slice().sort((a, b) => b.usd - a.usd)[0];
  const top5 = D.lenders5y.slice(0, 5), n5 = Y.filter((y) => y.fy >= W.fromFY).reduce((a, b) => a + b.n, 0), top5share = top5.reduce((a, b) => a + b.n, 0) / n5;
  const secByUsd = Object.entries(D.sectors5y).sort((a, b) => b[1].usd - a[1].usd), secByN = Object.entries(D.sectors5y).sort((a, b) => b[1].n - a[1].n);
  const st10 = eligible.slice().sort((a, b) => stateTotals[b].latest.usd - stateTotals[a].latest.usd).slice(0, 10);
  const stateLink = (s) => `<a href="/research/sba-7a-by-state/${slug(stName(s))}">${esc(stName(s))}</a>`;
  const title = `SBA 7(a) Loan Data: FY${L.fy} Size, Rates, Industries`;
  const short = `In fiscal year ${L.fy}, SBA&rsquo;s public data shows ${int(L.n)} 7(a) loan approvals totaling ${usdL(L.usd)}. The median loan was ${usdS(L.med)}, the average was ${usdS(L.avg)}, and ${pct(L.le150k)} of loans were ${money0(gp.smallLoanMax)} or less (data as of ${asOf}).`;
  const rateTxt = (L.variableMedRate != null && L.fixedMedRate != null) ? `<p>At approval, the median initial interest rate was <strong>${L.variableMedRate}%</strong> on variable-rate loans and <strong>${L.fixedMedRate}%</strong> on fixed-rate loans in FY${L.fy}${Y5 && Y5.variableMedRate != null ? `, compared with ${Y5.variableMedRate}% and ${Y5.fixedMedRate}% in FY${Y5.fy}` : ''}. Variable rates are priced as a base rate plus a spread, and SBA caps the spread by loan size; the current maximum rates are on our <a href="/loans/sba-7a#rates">7(a) rates table</a>.</p>` : '';
  const ratioAvgMed = L.avg / L.med;
  const body = `<h1>${esc(title)}</h1>
${disclaimer}
<div class="lf-answer"><strong>Short answer:</strong> ${short}</div>
<h2>Loan volume and size, FY${Y10[0].fy}&ndash;FY${L.fy}</h2>
<p>SBA 7(a) approvals ${dir(PRV.n, L.n)} from ${int(PRV.n)} loans in FY${PRV.fy} to ${int(L.n)} in FY${L.fy}${chg(PRV.n, L.n) >= 0.005 ? ` (${pct(chg(PRV.n, L.n), 1)})` : ''}, while approved dollars ${dir(PRV.usd, L.usd)} from ${usdL(PRV.usd)} to ${usdL(L.usd)}${chg(PRV.usd, L.usd) >= 0.005 ? ` (${pct(chg(PRV.usd, L.usd), 1)})` : ''}. ${Y5 ? `Against FY${Y5.fy}, the number of loans ${dir(Y5.n, L.n)} ${pct(chg(Y5.n, L.n))} and dollars ${dir(Y5.usd, L.usd)} ${pct(chg(Y5.usd, L.usd))}. ` : ''}Dollar approvals in the data peaked in FY${peak.fy} at ${usdL(peak.usd)}.</p>
${fig(barChart('c1', 'SBA 7(a) approved dollars by fiscal year', `Bar chart of total 7(a) approved dollars for FY${Y10[0].fy} through FY${L.fy}.`, Y10.map((y) => ({ x: String(y.fy), y: y.usd })), 'usd'), `Total gross approval dollars by fiscal year. Source: SBA 7(a) FOIA data as of ${asOf}.`)}
${fig(lineChart('c2', 'Median and average 7(a) loan size by fiscal year', 'Line chart comparing the median and the average approved loan amount.', Y10.map((y) => String(y.fy)), [{ name: 'Median loan', v: Y10.map((y) => y.med) }, { name: 'Average loan', v: Y10.map((y) => y.avg) }], 'usd'), 'The average sits above the median because a small number of very large loans pull it up.')}
<p>The median is the better guide for a typical borrower. In FY${L.fy} the average loan was ${usdS(L.avg)} but the median was ${usdS(L.med)}${ratioAvgMed >= 1.5 ? `, so the average was ${ratioAvgMed.toFixed(1)} times the median` : ''}: half of all loans were ${usdS(L.med)} or smaller. ${Y5 ? `Loans of ${money0(gp.smallLoanMax)} or less, the range where SBA&rsquo;s standard guarantee is ${gp.smallLoanPct}% rather than ${gp.largeLoanPct}%, were ${pct(L.le150k)} of approvals in FY${L.fy} versus ${pct(Y5.le150k)} in FY${Y5.fy}. ` : ''}${L.cancelledShare != null ? `About ${pct(L.cancelledShare, 1)} of FY${L.fy} approvals are marked cancelled in the file.` : ''}</p>
${table(`Approvals by fiscal year (FY${Y10[0].fy}&ndash;FY${L.fy})`, ['Fiscal year', 'Loans', 'Dollars', 'Median', 'Average', `Loans &le; ${usdS(gp.smallLoanMax)}`], Y10.slice().reverse().map((y) => [`FY${y.fy}`, int(y.n), usdS(y.usd), usdS(y.med), usdS(y.avg), pct(y.le150k)]))}
<h2>Interest rates and terms</h2>
${rateTxt}
${L.medTermMonths ? `<p>The median loan term in FY${L.fy} was ${(L.medTermMonths / 12).toFixed(0)} years (${L.medTermMonths} months). Terms are set by use of proceeds, and real estate loans run longer than working-capital loans.</p>` : ''}
<h2>Which industries get 7(a) loans</h2>
<p>Over FY${W.fromFY}&ndash;FY${W.toFY}, ${esc(secName(secByN[0][0]))} had the most approvals (${int(secByN[0][1].n)} loans, ${pct(secByN[0][1].n / natSecTotal, 1)} of the total), and ${esc(secName(secByUsd[0][0]))} had the most dollars (${usdL(secByUsd[0][1].usd)}).</p>
${table(`Top industries by dollars, FY${W.fromFY}&ndash;FY${W.toFY}`, ['Industry (NAICS sector)', 'Loans', 'Dollars', 'Median loan', 'Share of loans'], secRows(D.sectors5y, natSecTotal))}
<h2>Where the loans go</h2>
<p>These ten states had the most 7(a) dollars approved in FY${L.fy}. Each links to a page with that state&rsquo;s trend, industries and most active lenders.</p>
${table(`Top states by dollars, FY${L.fy}`, ['State', 'Loans', 'Dollars', 'Median loan'], st10.map((s) => [stateLink(s), int(stateTotals[s].latest.n), usdS(stateTotals[s].latest.usd), usdS(stateTotals[s].latest.med)]))}
<p><a href="/research/sba-7a-by-state/">See all ${eligible.length} states and territories &rarr;</a></p>
<h2>Who makes the loans</h2>
<p>The five most active lenders wrote ${pct(top5share)} of all 7(a) approvals in FY${W.fromFY}&ndash;FY${W.toFY}. Lender activity is concentrated, which is useful to know when you shop: a lender that regularly writes loans of your size and in your industry will know the paperwork. See <a href="/guides/choosing-lender">how to choose a lender</a>.</p>
${table(`Most active 7(a) lenders, FY${W.fromFY}&ndash;FY${W.toFY}`, ['Lender', 'Loans', 'Dollars'], lenderRows(D.lenders5y, 10))}
<h2>How to read this as a borrower</h2>
<ul>
<li><strong>Plan around the median, not the average.</strong> ${usdS(L.med)} was the middle loan in FY${L.fy}. A larger request is not unusual, but it will be underwritten on your own cash flow, not on a national figure. Test yours with the <a href="/calculators/dscr">DSCR calculator</a>.</li>
<li><strong>The guarantee is the lender&rsquo;s protection, not yours.</strong> SBA guarantees ${gp.smallLoanPct}% of loans up to ${money0(gp.smallLoanMax)} and ${gp.largeLoanPct}% above that (FY${POL.fiscalYear} rules, effective ${longDate(POL.effective)}); you remain responsible for the full loan. See the <a href="/loans/sba-7a">SBA 7(a) page</a>.</li>
<li><strong>Cost is more than the rate.</strong> Run the payment and the upfront SBA fee together in the <a href="/calculators/sba-7a">7(a) calculator</a>.</li>
<li><strong>Buying a business?</strong> Lenders look at the earnings behind the price. Start with <a href="/guides/owner-add-backs-ebitda">add-backs and EBITDA</a> and the <a href="/calculators/business-acquisition">acquisition calculator</a>.</li></ul>
${dataNote}`;
  const desc = `${int(L.n)} SBA 7(a) approvals worth ${usdL(L.usd)} in FY${L.fy}: median loan ${usdS(L.med)}, rates, industries, states and lenders, from SBA public data.`;
  const ld = [article(url, title, desc), { '@type': 'Dataset', name: 'SBA 7(a) loan approvals by fiscal year, state and industry (summary of SBA FOIA data)', description: desc,
    url, creator: { '@type': 'Organization', name: 'LoansFlow' }, isBasedOn: src, license: 'https://www.usa.gov/publicdomain/label/1.0/',
    temporalCoverage: `${D.meta.firstFY - 1}-10-01/${D.meta.asOf}`, dateModified: D.meta.generated, spatialCoverage: 'United States',
    distribution: { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: 'https://loansflow.loan/data/sba-7a-foia.json' } }];
  write('research/sba-7a-loan-data.html', page({ url, title: `${title} | LoansFlow`.length > 62 ? `SBA 7(a) Loan Data FY${L.fy} | LoansFlow` : `${title} | LoansFlow`, desc, crumbs: [['Home', '/'], ['Research', '/research/'], ['SBA 7(a) loan data']], body, ld }));
}

/* ---------- state index and state pages ---------- */
function stateIndex() {
  const url = 'https://loansflow.loan/research/sba-7a-by-state/';
  const rows = eligible.slice().sort((a, b) => stateTotals[b].latest.usd - stateTotals[a].latest.usd).map((s) => [`<a href="/research/sba-7a-by-state/${slug(stName(s))}">${esc(stName(s))}</a>`, int(stateTotals[s].latest.n), usdS(stateTotals[s].latest.usd), usdS(stateTotals[s].latest.med), int(stateTotals[s].n5)]);
  const title = 'SBA 7(a) Loans by State';
  const desc = `SBA 7(a) loan approvals in FY${L.fy} for ${eligible.length} states and territories: loans, dollars and median loan size, from SBA public data.`;
  const body = `<h1>${title}</h1>${disclaimer}<div class="lf-answer"><strong>Short answer:</strong> In FY${L.fy}, ${stName(eligible.slice().sort((a, b) => stateTotals[b].latest.usd - stateTotals[a].latest.usd)[0])} had the most 7(a) dollars approved (${usdL(Math.max(...eligible.map((s) => stateTotals[s].latest.usd)))}). The table ranks every state with at least ${MIN_STATE_LOANS_5Y} approvals in FY${W.fromFY}&ndash;FY${W.toFY} (data as of ${asOf}).</div>
<div class="tbl-wrap">${table(`7(a) approvals by state, FY${L.fy}`, ['State', 'Loans', 'Dollars', 'Median loan', `Loans FY${W.fromFY}&ndash;${W.toFY}`], rows)}</div>
<p>For the national picture, read the <a href="/research/sba-7a-loan-data">SBA 7(a) loan data study</a>.</p>${dataNote}`;
  write('research/sba-7a-by-state/index.html', page({ url, title: `${title} | LoansFlow`, desc, crumbs: [['Home', '/'], ['Research', '/research/'], ['By state']], body, ld: [article(url, title, desc)] }));
}
function statePage(s) {
  const name = stName(s), url = `https://loansflow.loan/research/sba-7a-by-state/${slug(name)}`, by = D.byState[s], T = stateTotals[s], a = T.latest;
  const yrs = Object.keys(by).map(Number).sort((x, y) => x - y).filter((fy) => fy > L.fy - 10);
  const prev = by[L.fy - 1], five = by[L.fy - 5];
  const secs = D.stateSectors5y[s] || {}, tot = Object.values(secs).reduce((x, y) => x + y.n, 0);
  const secList = Object.entries(secs).sort((x, y) => y[1].usd - x[1].usd).slice(0, 8);
  const lend = D.stateLenders5y[s] || [];
  const natShare = (c) => D.sectors5y[c].n / natSecTotal;
  const natMedDiff = a.med && L.med ? (a.med / L.med - 1) : null;
  const title = `SBA 7(a) Loans in ${name}`;
  const rank = `${ord(rkN[s])} by number of loans, ${ord(rkUsd[s])} by dollars${rkMed[s] ? ` and ${ord(rkMed[s])} by median loan size` : ''}`;
  const short = `In FY${L.fy}, ${name} projects received ${int(a.n)} SBA 7(a) loan approvals totaling ${usdL(a.usd)}, with a median loan of ${usdS(a.med)}. That ranks ${rank} among ${eligible.length} states and territories (data as of ${asOf}).`;
  const trend = prev ? `<p>${esc(name)}&rsquo;s approvals ${dir(prev.n, a.n)} from ${int(prev.n)} loans in FY${L.fy - 1} to ${int(a.n)} in FY${L.fy}, and dollars ${dir(prev.usd, a.usd)} from ${usdL(prev.usd)} to ${usdL(a.usd)}.${five ? ` Compared with FY${L.fy - 5}, loans ${dir(five.n, a.n)} ${pct(chg(five.n, a.n))} and dollars ${dir(five.usd, a.usd)} ${pct(chg(five.usd, a.usd))}.` : ''}</p>` : '';
  const natTxt = natMedDiff == null ? '' : `<p>The median ${esc(name)} loan in FY${L.fy} (${usdS(a.med)}) was ${Math.abs(natMedDiff) < 0.01 ? 'about the same as' : pct(Math.abs(natMedDiff)) + (natMedDiff > 0 ? ' above' : ' below')} the national median (${usdS(L.med)}).</p>`;
  const secTxt = secList.length ? `<p>By dollars over FY${W.fromFY}&ndash;FY${W.toFY}, the largest industry for ${esc(name)} was ${esc(secName(secList[0][0]))} (${usdL(secList[0][1].usd)}, ${pct(secList[0][1].n / tot, 1)} of the state&rsquo;s loans).</p>` : '';
  const body = `<h1>${esc(title)}</h1>${disclaimer}
<div class="lf-answer"><strong>Short answer:</strong> ${short}</div>
<h2>${esc(name)} 7(a) approvals by fiscal year</h2>${trend}${natTxt}
${fig(barChart('s1', `${name} 7(a) approved dollars by fiscal year`, `Bar chart of approved 7(a) dollars in ${name}, FY${yrs[0]} to FY${yrs[yrs.length - 1]}.`, yrs.map((fy) => ({ x: String(fy), y: by[fy].usd })), 'usd'), `Total gross approval dollars for projects in ${esc(name)}. Source: SBA 7(a) FOIA data as of ${asOf}.`)}
<div class="tbl-wrap">${table(`${esc(name)} approvals, FY${yrs[0]}&ndash;FY${yrs[yrs.length - 1]}`, ['Fiscal year', 'Loans', 'Dollars', 'Median loan', 'Average loan'], yrs.slice().reverse().map((fy) => [`FY${fy}`, int(by[fy].n), usdS(by[fy].usd), usdS(by[fy].med), usdS(by[fy].avg)]))}</div>
<h2>Industries in ${esc(name)}</h2>${secTxt}
<div class="tbl-wrap">${table(`Top industries by dollars in ${esc(name)}, FY${W.fromFY}&ndash;FY${W.toFY}`, ['Industry (NAICS sector)', 'Loans', 'Dollars', 'Share of state loans', 'Share nationally'], secList.map(([c, v]) => [esc(secName(c)), int(v.n), usdS(v.usd), pct(v.n / tot, 1), pct(natShare(c), 1)]))}</div>
<h2>Most active 7(a) lenders in ${esc(name)}</h2>
<p>These lenders wrote the most 7(a) loans for ${esc(name)} projects in FY${W.fromFY}&ndash;FY${W.toFY}. The lender may be headquartered elsewhere. Activity is not a recommendation; see <a href="/guides/choosing-lender">how to choose a lender</a>.</p>
<div class="tbl-wrap">${table(`Most active lenders, ${esc(name)}, FY${W.fromFY}&ndash;FY${W.toFY}`, ['Lender', 'Loans', 'Dollars'], lenderRows(lend, 10))}</div>
<h2>Run your own numbers</h2>
<ul><li><a href="/calculators/sba-7a">SBA 7(a) loan calculator</a>: payment and upfront guarantee fee</li><li><a href="/loans/sba-7a">SBA 7(a) loan requirements and how to apply</a></li><li><a href="/research/sba-7a-loan-data">National SBA 7(a) data study</a> and <a href="/research/sba-7a-by-state/">all states</a></li></ul>
${dataNote}`;
  const desc = `${name} SBA 7(a) loans in FY${L.fy}: ${int(a.n)} approvals, ${usdL(a.usd)}, median ${usdS(a.med)}. Trend, top industries and lenders from SBA data.`;
  write(`research/sba-7a-by-state/${slug(name)}.html`, page({ url, title: `${title} (FY${L.fy} Data) | LoansFlow`, desc, crumbs: [['Home', '/'], ['Research', '/research/'], ['By state', '/research/sba-7a-by-state/'], [name]], body, ld: [article(url, title, desc)] }));
}
function hub() {
  const url = 'https://loansflow.loan/research/', title = 'LoansFlow Research: SBA Loan Data';
  const desc = 'Original analysis of SBA 7(a) loan data by year, state, industry and lender, rebuilt from SBA public files as they update.';
  const topState = eligible.slice().sort((x, y) => stateTotals[y].latest.usd - stateTotals[x].latest.usd)[0], ts = stateTotals[topState].latest;
  const body = `<h1>${title}</h1>${disclaimer}
<div class="lf-answer"><strong>Short answer:</strong> LoansFlow turns the SBA&rsquo;s public loan-level data into plain-English pages: how many 7(a) loans are approved, how large they are, which industries and states get them and which lenders make them. In fiscal year ${L.fy} the data shows ${int(L.n)} approvals totaling ${usdL(L.usd)}, with a median loan of ${usdS(L.med)} (data as of ${asOf}).</div>
<p>Everything here is rebuilt automatically from the SBA&rsquo;s own files whenever SBA posts a new quarterly update, so the numbers do not go stale. Each page states its source, its definitions and its date.</p>
<h2>What is here</h2>
<ul><li><a href="/research/sba-7a-loan-data">SBA 7(a) loan data study</a>: volume, loan size, interest rates, industries and the most active lenders, FY${Y10[0].fy}&ndash;FY${L.fy}.</li><li><a href="/research/sba-7a-by-state/">SBA 7(a) loans by state</a>: ${eligible.length} states and territories, each with its own trend, industry mix and top lenders. ${esc(stName(topState))} had the most dollars approved in FY${L.fy} (${usdL(ts.usd)} across ${int(ts.n)} loans).</li><li><a href="/data/sba-7a-foia.json">The summary data as JSON</a>, free to reuse with attribution. It contains only totals, with no borrower names or individual loans.</li></ul>
<h2>Questions this data helps answer</h2>
<ul><li>How big is a typical 7(a) loan, and how much does the average overstate it? See the <a href="/research/sba-7a-loan-data">study</a>.</li><li>Where does my state rank, and which industries get funded there? Start with the <a href="/research/sba-7a-by-state/">state pages</a>.</li><li>What do borrowers actually pay compared with the SBA maximum? Compare the study with the <a href="/loans/sba-7a-rates">current maximum rates</a>.</li><li>Which lenders are active for my kind of project? The state pages list the most active ones; then read <a href="/guides/choosing-lender">how to choose a lender</a>.</li></ul>
<h2>How to use it and what it cannot tell you</h2>
<p>Use these pages to set expectations and to see how your request compares with others. Approvals are not a forecast of whether a particular application will be approved, the rates shown are initial rates recorded at approval and not quotes, and dollar amounts are not adjusted for inflation. To test your own numbers, use the <a href="/calculators/sba-7a">SBA 7(a) calculator</a> and the <a href="/calculators/dscr">DSCR calculator</a>.</p>`;
  write('research/index.html', page({ url, title: `${title} | LoansFlow`, desc, crumbs: [['Home', '/'], ['Research']], body, ld: [{ '@type': 'CollectionPage', name: title, description: desc, url }] }));
}

fs.rmSync(path.join(PUB, 'research'), { recursive: true, force: true });
study(); stateIndex(); hub(); eligible.forEach(statePage);
console.log(`built study, hub, index and ${eligible.length} state pages (FY${L.fy}, data as of ${D.meta.asOf}); ${PUBLISH ? 'PUBLISHED (indexable)' : 'noindex until publishSbaDataStudy is true'}`);
