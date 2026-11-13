#!/usr/bin/env node
/* Drift check: SBA policy figures in calculators and page text must match public/data/sba-policy.json.
   Run: node tests/verify-policy.js   (the daily workflow runs it; a failure means a page or the built-in defaults are stale) */
const fs = require('fs'), path = require('path'), vm = require('vm');
const PUB = path.join(__dirname, '..', 'public');
const P = JSON.parse(fs.readFileSync(path.join(PUB, 'data', 'sba-policy.json'), 'utf8'));
let checks = 0, fails = 0;
const eq = (name, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) { fails++; console.log('FAIL', name, 'found', JSON.stringify(got), 'policy', JSON.stringify(want)); } };

// 1. calculator math (loaded from the JSON) vs an independent calculation from the JSON
const LF = require(path.join(PUB, 'js', 'lf-math.js'));
const u = P.sba7a.upfrontFee;
const refFee = (loan, g) => { const G = loan * g / 100; const t = u.tiers.find((x) => loan <= x.upToLoan); return t ? G * t.pctOfGuaranteed / 100 : Math.min(G, u.above.firstGuaranteed) * u.above.pctFirst / 100 + Math.max(0, G - u.above.firstGuaranteed) * u.above.pctRest / 100; };
for (const loan of [50000, 150000, 150001, 350000, 700000, 700001, 1200000, 5000000]) {
  const g = LF.sba7aDefaultGuaranty(loan);
  eq('guaranty ' + loan, g, loan <= P.sba7a.guaranty.smallLoanMax ? P.sba7a.guaranty.smallLoanPct : P.sba7a.guaranty.largeLoanPct);
  eq('fee ' + loan, Math.round(LF.sba7aFee(loan, g, false).fee * 100), Math.round(refFee(loan, g) * 100));
}
// 2. the built-in fallback defaults in lf-math.js must equal the JSON (used if the policy script fails to load)
const ctx = { module: { exports: {} }, console }; ctx.window = undefined;
vm.runInNewContext(fs.readFileSync(path.join(PUB, 'js', 'lf-math.js'), 'utf8').replace(/typeof require !== 'undefined'/g, 'false'), ctx);
const D = (ctx.module.exports.policy || (ctx.LF && ctx.LF.policy) || {});
if (D.sba7a) { eq('fallback fiscalYear', D.fiscalYear, P.fiscalYear); eq('fallback effective', D.effective, P.effective); for (const k of ['guaranty', 'upfrontFee', 'lenderAnnualServiceFeePct', 'maxSpreadOverBase']) eq('fallback ' + k, D.sba7a[k], P.sba7a[k]); eq('fallback 504', D.sba504, P.sba504); }
else { checks++; fails++; console.log('FAIL could not read fallback policy from lf-math.js'); }
// 3. prose on the site
const money = (n) => '$' + n.toLocaleString('en-US');
const files = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.html')) files.push(p); } })(PUB);
const g = P.sba7a.guaranty;
for (const f of files) {
  const rel = path.relative(PUB, f); const t = fs.readFileSync(f, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  for (const m of t.matchAll(/(\d+)% (?:of the loan )?up to \$150,000/g)) eq(rel + ': guaranty small-loan %', +m[1], g.smallLoanPct);
  for (const m of t.matchAll(/guarant[^.]{0,80}?(\d+)% above that/gi)) eq(rel + ': guaranty large-loan %', +m[1], g.largeLoanPct);
  for (const m of t.matchAll(/([\d.]+)% on the first \$1M guaranteed, ([\d.]+)% above/g)) { eq(rel + ': fee first $1M', +m[1], u.above.pctFirst); eq(rel + ': fee above $1M', +m[2], u.above.pctRest); }
  for (const m of t.matchAll(/up to (\$[\d,]+|\$\d+ million)(?= for 7\(a\)| 7\(a\)|\. SBA 7\(a\)| on a 7\(a\))/g)) { const v = m[1].includes('million') ? +m[1].match(/\d+/)[0] * 1e6 : +m[1].replace(/[$,]/g, ''); eq(rel + ': 7(a) max', v, P.sba7a.maxLoan); }
}
console.log(`${checks} policy checks, ${fails} failures`); process.exit(fails ? 1 : 0);
