#!/usr/bin/env node
/* Regenerates public/llms.txt from the pages themselves (title + meta description), so AI crawlers always see every current page.
   noindex pages are skipped. Run after any page is added:  node scripts/build-llms.js */
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, '..', 'public'), BASE = 'https://loansflow.loan';
const info = (rel) => { const p = path.join(PUB, rel); if (!fs.existsSync(p)) return null; const h = fs.readFileSync(p, 'utf8'); if (/name="robots" content="[^"]*noindex/i.test(h)) return null;
  const t = (h.match(/<title>([\s\S]*?)<\/title>/) || [])[1], d = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1], c = (h.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  return t && c ? { t: t.replace(/\s*[|—]\s*LoansFlow\s*$/, '').replace(/&amp;/g, '&').trim(), d: (d || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"'), u: c } : null; };
const list = (dir, skipIndex = true) => fs.existsSync(path.join(PUB, dir)) ? fs.readdirSync(path.join(PUB, dir)).filter((f) => f.endsWith('.html') && (!skipIndex || f !== 'index.html')).sort().map((f) => info(path.join(dir, f))).filter(Boolean) : [];
const line = (x) => `- [${x.t}](${x.u})${x.d ? ': ' + x.d : ''}`;
const sec = (h, items) => items.length ? `## ${h}\n${items.map(line).join('\n')}\n` : '';
const one = (rel, label) => { const x = info(rel); return x ? Object.assign(x, label ? { t: label } : {}) : null; };
const head = fs.readFileSync(path.join(PUB, 'llms.txt'), 'utf8').split('\n## ')[0].trimEnd();
const out = [head + '\n',
  sec('Loan types', [one('loans/index.html', 'All loan types')].concat(list('loans')).filter(Boolean)),
  sec('Comparisons', [one('compare/index.html', 'Compare business loans')].concat(list('compare')).filter(Boolean)),
  sec('Calculators', [one('calculators/index.html', 'All calculators')].concat(list('calculators')).filter(Boolean)),
  sec('Guides', [one('guides/index.html', 'All guides')].concat(list('guides')).filter(Boolean)),
  sec('Free templates', [one('resources/index.html', 'Free loan templates and worksheets')].filter(Boolean).concat(fs.existsSync(path.join(PUB, 'downloads')) ? fs.readdirSync(path.join(PUB, 'downloads')).filter((f) => /\.(xlsx|txt)$/.test(f)).sort().map((f) => ({ t: f.replace(/\.[a-z]+$/, '').replace(/-/g, ' '), u: BASE + '/downloads/' + f, d: 'Downloadable ' + f.split('.').pop() + ' file' })) : [])),
  sec('Research (original analysis of SBA public data)', [one('research/index.html', 'Research hub'), one('research/sba-7a-loan-data.html'), one('research/sba-7a-by-state/index.html', 'SBA 7(a) loans by state')].filter(Boolean)),
  sec('Rates and data', [one('news/index.html', 'Rates and news'), { t: 'Rates data (JSON)', u: BASE + '/data/rates.json', d: 'Prime, SOFR, Treasury and mortgage rates with source and as-of dates' }, { t: 'SBA policy data (JSON)', u: BASE + '/data/sba-policy.json', d: 'SBA 7(a) fees, guarantee percentages and caps, with effective date and source links' }]
    .concat(fs.existsSync(path.join(PUB, 'data', 'sba-7a-foia.json')) && info('research/sba-7a-loan-data.html') ? [{ t: 'SBA 7(a) loan summary data (JSON)', u: BASE + '/data/sba-7a-foia.json', d: 'Approvals by year, state and industry from SBA FOIA data' }] : []).filter(Boolean)),
  sec('About and policies', [one('author.html', 'Author: Joshua Miller, CPA'), one('about.html', 'About LoansFlow'), one('methodology.html', 'Methodology: how our numbers work'), one('editorial-policy.html', 'Editorial policy'), one('disclosure.html', 'Advertising and affiliate disclosure'), one('privacy.html', 'Privacy policy'), one('terms.html', 'Terms of use'), one('disclaimer.html', 'Disclaimer'), one('contact.html', 'Contact')].filter(Boolean))].filter(Boolean).join('\n');
fs.writeFileSync(path.join(PUB, 'llms.txt'), out.trimEnd() + '\n');
console.log('llms.txt:', out.split('\n').filter((l) => l.startsWith('- [')).length, 'links');
