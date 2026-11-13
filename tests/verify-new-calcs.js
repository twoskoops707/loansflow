#!/usr/bin/env node
/* Independent checks for the newer calculators (guarantee fee, MCA true cost, global DSCR, affordability, prepayment, SDE).
   Each identity is computed a different way from the calculator code. Run: node tests/verify-new-calcs.js */
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, '..', 'public');
const LF = require(path.join(PUB, 'js', 'lf-math.js'));
let checks = 0, fails = 0;
const near = (name, a, b, tol = 0.01) => { checks++; if (!(Math.abs(a - b) <= tol)) { fails++; console.log('FAIL', name, 'got', a, 'want', b); } };
const ok = (name, c) => { checks++; if (!c) { fails++; console.log('FAIL', name); } };

// MCA: the discounted value of the payments at the solved periodic rate must equal the cash received
for (const [adv, fac, n, py, fee] of [[50000, 1.35, 130, 250, 0], [100000, 1.25, 52, 52, 3], [25000, 1.5, 200, 250, 2], [75000, 1.1, 26, 52, 0]]) {
  const c = LF.mcaCost(adv, fac, n, py, fee); let pv = 0; for (let k = 1; k <= n; k++) pv += c.payment / Math.pow(1 + c.periodicRate, k);
  near(`mca pv ${adv}/${fac}/${n}`, pv, adv - adv * fee / 100, 0.5);
  near(`mca payback ${adv}`, c.payback, adv * fac, 0.001); near(`mca cost ${adv}`, c.cost, adv * fac - (adv - adv * fee / 100), 0.001);
  ok(`mca apr above factor-implied simple rate ${adv}`, c.apr > (fac - 1) * 100 * (py / n) * 0.99);
}
// max loan: the payment on the maximum loan must equal the budget
for (const [ds, r, y] of [[100000, 9.75, 10], [88000, 7.25, 25], [50000, 0, 5], [12000, 12, 3]]) near(`maxLoan ${ds}/${r}/${y}`, r === 0 ? LF.maxLoan(ds, r, y) / (y * 12) * 12 : LF.pmt(LF.maxLoan(ds, r, y), r, y) * 12, ds, 0.05);
// SBA prepayment rule (policy sba7a.prepayment)
const q = JSON.parse(fs.readFileSync(path.join(PUB, 'data', 'sba-policy.json'), 'utf8')).sba7a.prepayment;
for (const [pre, bal, mat, yr] of [[150000, 400000, 25, 1], [150000, 400000, 25, 2], [150000, 400000, 25, 3], [150000, 400000, 25, 4], [50000, 400000, 25, 2], [150000, 400000, 10, 2], [100000, 400000, 25, 2]]) {
  const r = LF.sba7aPrepayFee(pre, bal, mat, yr), applies = mat >= q.minMaturityYears && yr <= q.windowYears && pre / bal * 100 >= q.thresholdPctOfBalance;
  ok(`prepay applies ${pre}/${mat}/${yr}`, r.applies === applies); near(`prepay fee ${pre}/${mat}/${yr}`, r.fee, applies ? pre * q.pctOfAmountPrepaidByYear[yr - 1] / 100 : 0, 0.001);
}
// months to pay off: balance after that many payments is <= 0 and one fewer is > 0
const m = LF.monthsToPayOff(250000, 9.5, 3234), r = 9.5 / 1200, bal = (k) => 250000 * Math.pow(1 + r, k) - 3234 * (Math.pow(1 + r, k) - 1) / r;
ok('months to pay off', bal(m) <= 0.5 && bal(m - 1) > 0);

// render every new calculator headlessly: no NaN/undefined, a headline and rows
const { JSDOM } = require('jsdom'); const kinds = ['sbafee', 'mca', 'gdscr', 'affordloan', 'prepay', 'sde'];
const w = new JSDOM('<body>' + kinds.map((k) => `<div data-calc="${k}"></div>`).join('') + '</body>', { runScripts: 'outside-only' }).window; w.fetch = () => Promise.reject(new Error('offline'));
for (const s of ['lf-math.js', 'lf-charts.js', 'lf-calc.js']) w.eval(fs.readFileSync(path.join(PUB, 'js', s), 'utf8'));
w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
setTimeout(() => {
  for (const k of kinds) { const res = w.document.querySelector(`[data-calc="${k}"] .lf-result`); ok(`${k} renders`, !!res && res.querySelectorAll('.lf-rows > div').length >= 3 && !/NaN|undefined|Infinity/.test(res.textContent)); }
  // known values
  const t = (k) => w.document.querySelector(`[data-calc="${k}"] .lf-result`).textContent;
  ok('sde default headline', /\$220,000/.test(t('sde')) && /\$550,000/.test(t('sde')));
  ok('sbafee default headline', /\$7,875/.test(t('sbafee')));
  console.log(`${checks} new-calculator checks, ${fails} failures`); process.exit(fails ? 1 : 0);
}, 100);
