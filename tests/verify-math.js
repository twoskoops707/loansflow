#!/usr/bin/env node
/* Independent verification of public/js/lf-math.js. References here are written separately from the library
   (payments solved by bisection on a month-by-month balance simulation, fees from the SBA notice tiers, identities that must hold).
   Run: node tests/verify-math.js   (exit code 1 on any mismatch) */
const LF = require('../public/js/lf-math.js');
let fails = 0, checks = 0;
const near = (a, b, tol, what, ctx) => { checks++; const ok = Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)); if (!ok) { fails++; console.log('FAIL', what, 'lib=', a, 'ref=', b, ctx || ''); } };
const rnd = (a, b) => a + Math.random() * (b - a);
// reference: month-by-month balance for a given payment; solve payment by bisection so the balance reaches 0 at month n
function endBalance(P, annualPct, n, pay) { const r = annualPct / 1200; let b = P; for (let i = 0; i < n; i++) b = b * (1 + r) - pay; return b; }
function refPmt(P, annualPct, years) { const n = Math.round(years * 12); let lo = 0, hi = P * 3 + 1; for (let k = 0; k < 200; k++) { const mid = (lo + hi) / 2; endBalance(P, annualPct, n, mid) > 0 ? lo = mid : hi = mid; } return (lo + hi) / 2; }
function refBal(P, annualPct, years, paid) { const n = Math.round(years * 12), pay = refPmt(P, annualPct, years), r = annualPct / 1200; let b = P; for (let i = 0; i < paid; i++) b = b * (1 + r) - pay; return b; }
function refFee(amount, guarPct, waived) { const g = amount * guarPct / 100; if (waived && amount <= 700000) return 0; if (amount <= 150000) return g * 0.02; if (amount <= 700000) return g * 0.03; return Math.min(g, 1e6) * 0.035 + Math.max(0, g - 1e6) * 0.0375; }

for (let t = 0; t < 150; t++) {
  const P = Math.round(rnd(5000, 5e6)), r = rnd(0.5, 25), y = Math.round(rnd(1, 30));
  near(LF.pmt(P, r, y), refPmt(P, r, y), 1e-6, 'pmt', [P, r, y]);
  const k = Math.floor(rnd(0, y * 12)); near(LF.balanceAfter(P, r, y, k), refBal(P, r, y, k), 1e-5, 'balanceAfter', [P, r, y, k]);
  const tl = LF.termLoan(P, r, y); near(tl.total, refPmt(P, r, y) * y * 12, 1e-6, 'termLoan.total'); near(tl.interest, tl.total - P, 1e-9, 'termLoan.interest');
  // schedule: final balance zero, sum of principal = P
  const sch = LF.schedule ? LF.schedule(P, r, y, 0, 0) : null;
  if (sch && sch.months && sch.months.length) { near(sch.months[sch.months.length - 1].balance, 0, 1e-4, 'schedule end balance', [P, r, y]); }
  const g = P <= 150000 ? 85 : 75, wv = Math.random() < .3; near(LF.sba7aFee(P, g, wv).fee, refFee(P, g, wv), 1e-12, 'sba7aFee', [P, g, wv]);
  // DSCR identity
  const noi = rnd(1e4, 1e6), ds = refPmt(P, r, y) * 12; near(LF.dscr(noi, ds), noi / ds, 1e-6, 'dscr');
}
// SBA fee tiers at the boundaries (FY 2027 notice 5000-881797)
[[150000, 85, 0.02], [150001, 75, 0.03], [700000, 75, 0.03], [700001, 75, 0.035], [2000000, 75, null]].forEach(([a, g, rate]) => {
  const f = LF.sba7aFee(a, g, false).fee, exp = rate !== null ? a * g / 100 * rate : (1e6 * 0.035 + (a * 0.75 - 1e6) * 0.0375);
  near(f, exp, 1e-12, 'fee boundary ' + a);
});
near(LF.sba7aFee(700000, 75, true).fee, 0, 1e-12, 'fee waived <= 700k'); near(LF.sba7aFee(700001, 75, true).fee > 0 ? 1 : 0, 1, 1e-12, 'fee waiver ends above 700k');
// spreads by loan size
[[50000, 6.5], [50001, 6], [250000, 6], [250001, 4.5], [350000, 4.5], [350001, 3]].forEach(([a, s]) => near(LF.sba7aMaxSpread(a), s, 1e-12, 'max spread ' + a));
// worked example from the site: $350,000, 10%, 10 years
near(LF.pmt(350000, 10, 10), 4625.2758, 1e-6, 'site example payment'); near(LF.sba7aFee(350000, 75, false).fee, 7875, 1e-12, 'site example fee');
// mortgage: PITI components
for (let t = 0; t < 60; t++) {
  const price = rnd(80000, 2e6), downPct = rnd(0, 40), rate = rnd(2, 10), tax = rnd(0.3, 2.5), ins = rnd(500, 5000), pmi = rnd(0.3, 1.5), yrs = [15, 20, 30][t % 3];
  const m = LF.mortgage(price, price * downPct / 100, rate, yrs, tax, ins, pmi);
  const loan = price - price * downPct / 100; near(m.loan, loan, 1e-9, 'mortgage loan'); near(m.pi, refPmt(loan, rate, yrs), 1e-6, 'mortgage P&I');
  near(m.tax, price * tax / 100 / 12, 1e-9, 'mortgage tax'); near(m.ins, ins / 12, 1e-9, 'mortgage ins');
  const expPmi = downPct < 20 ? loan * pmi / 100 / 12 : 0; near(m.pmi, expPmi, 1e-9, 'mortgage pmi', [downPct]);
  near(m.total, m.pi + m.tax + m.ins + m.pmi, 1e-9, 'mortgage total');
}
// affordability: housing cost at the returned price must equal the budget; budget = min(28%, 36% - debts)
for (let t = 0; t < 60; t++) {
  const inc = rnd(30000, 500000), debts = rnd(0, 3000), down = rnd(0, 150000), rate = rnd(3, 9), tax = rnd(0.5, 2), ins = rnd(600, 4000);
  const a = LF.afford(inc, debts, down, rate, tax, ins), mi = inc / 12, budget = Math.max(0, Math.min(mi * .28, mi * .36 - debts));
  near(a.budget, budget, 1e-9, 'afford budget');
  if (a.price > down) { const housing = refPmt(a.price - down, rate, 30) + a.price * tax / 1200 + ins / 12; near(housing, budget, 1e-6, 'afford housing cost == budget', [inc, debts, down, rate]); }
}
// refinance: new payment amortizes the remaining balance; break-even = closing / savings
for (let t = 0; t < 60; t++) {
  const orig = rnd(100000, 1e6), r = rnd(4, 9), yrs = 30, paid = Math.floor(rnd(0, 20)), nr = rnd(3, r), ny = [15, 20, 30][t % 3], cost = rnd(0, 20000);
  const x = LF.refi(orig, r, yrs, paid, nr, ny, cost), bal = refBal(orig, r, yrs, paid * 12);
  near(x.balance, bal, 1e-5, 'refi balance'); near(x.newPmt, refPmt(bal, nr, ny), 1e-6, 'refi new payment'); near(x.savings, refPmt(orig, r, yrs) - refPmt(bal, nr, ny), 1e-6, 'refi savings');
  if (x.savings > 0) near(x.breakEvenMonths, cost / x.savings, 1e-9, 'refi break-even');
}
// lease vs loan: PV of lease payments (at the lease rate) plus PV of the residual equals the price
for (let t = 0; t < 60; t++) {
  const price = rnd(20000, 1e6), down = rnd(0, price * .3), yrs = Math.round(rnd(1, 7)), lr = rnd(3, 15), rr = rnd(5, 25), res = rnd(0, 40);
  const L = LF.leaseVsLoan(price, down, yrs, lr, rr, res), n = yrs * 12, i = rr / 1200;
  let pv = 0; for (let k = 1; k <= n; k++) pv += L.leasePay / Math.pow(1 + i, k); pv += L.residual / Math.pow(1 + i, n);
  near(pv, price, 1e-6, 'lease PV identity'); near(L.loanPay, refPmt(price - down, lr, yrs), 1e-6, 'lease-vs-loan loan payment');
}
// CRE: loan, balloon, LTV
for (let t = 0; t < 40; t++) {
  const price = rnd(2e5, 1e7), dp = rnd(10, 50), rate = rnd(4, 11), am = [20, 25, 30][t % 3], term = [5, 7, 10][t % 3], noi = rnd(5e4, 1e6);
  const c = LF.cre(price, dp, rate, am, term, noi), loan = price * (1 - dp / 100);
  near(c.loan, loan, 1e-9, 'cre loan'); near(c.pmt, refPmt(loan, rate, am), 1e-6, 'cre pmt'); near(c.balloon, refBal(loan, rate, am, term * 12), 1e-5, 'cre balloon'); near(c.dscr, noi / (refPmt(loan, rate, am) * 12), 1e-6, 'cre dscr');
}
// SBA 504 structure and fees
for (let t = 0; t < 40; t++) {
  const cost = rnd(5e5, 1e7), nb = t % 2 === 0, sp = t % 3 === 0, s = LF.sba504Structure(cost, nb, sp), eq = 10 + (nb ? 5 : 0) + (sp ? 5 : 0);
  near(s.equity, cost * eq / 100, 1e-9, '504 equity'); near(s.bank, cost * .5, 1e-9, '504 bank'); near(s.bank + s.cdc + s.equity, cost, 1e-9, '504 sources = project cost');
  near(LF.sba504Fee(s.cdc, false).upfront, s.cdc * .005, 1e-9, '504 upfront fee'); near(LF.sba504Fee(s.cdc, false).annual, s.cdc * .00203, 1e-9, '504 annual fee');
}
// acquisition: sources = uses, the fee tier matches the final gross loan, DSCR identity
for (let t = 0; t < 80; t++) {
  const o = { price: rnd(2e5, 4e6), workingCapital: rnd(0, 3e5), closingCosts: rnd(0, 1e5), equityPct: rnd(10, 35), sellerNotePct: t % 3 === 0 ? rnd(0, 30) : 0, ratePct: rnd(6, 13), years: 10, noteRatePct: 6, noteYears: 10, financeFee: t % 2 === 0, sde: rnd(1e5, 1.5e6), ownerSalary: rnd(0, 2e5) };
  const a = LF.acquisition(o);
  near(a.uses, o.price + o.workingCapital + o.closingCosts, 1e-9, 'acq uses');
  near(a.equity + a.sellerNote + a.base, a.uses, 1e-9, 'acq sources = uses');
  const g = a.loan <= 150000 ? 85 : 75; near(a.fee, refFee(a.loan, g, false), 1e-6, 'acq fee at final loan size', [a.loan]);
  near(a.loan, a.base + (o.financeFee ? a.fee : 0), 1e-6, 'acq loan = base + financed fee');
  near(a.dscr, (o.sde - o.ownerSalary) / ((refPmt(a.loan, o.ratePct, 10) + (a.sellerNote > 0 ? refPmt(a.sellerNote, 6, 10) : 0)) * 12), 1e-6, 'acq dscr');
}
// cash to close: items sum
for (let t = 0; t < 40; t++) {
  const o = { projectCost: rnd(2e5, 5e6), downPct: rnd(10, 30), financeFee: t % 2 === 0, lenderFeePct: rnd(0, 3), thirdParty: rnd(0, 2e4), legal: rnd(0, 2e4), prepaid: rnd(0, 1e4), reserve: rnd(0, 1e5) };
  const c = LF.cashToClose(o); near(c.cash, c.items.reduce((s, x) => s + x[1], 0), 1e-9, 'cash to close sum'); near(c.down, o.projectCost * o.downPct / 100, 1e-9, 'cash to close down');
}
// equipment rate model stays inside its tier band
LF.CREDIT_TIERS.forEach((tr) => LF.EQUIPMENT_TYPES.forEach((ty) => [0, 10, 25].forEach((d) => [false, true].forEach((u) => { const r = LF.equipmentRate(tr.id, ty.id, u, d).rate; checks++; if (r < tr.low - 0.5 - 1e-9 || r > tr.high + 3 + 1e-9) { fails++; console.log('FAIL equipment rate out of band', tr.id, ty.id, d, u, r); } }))));
console.log(`${checks} checks, ${fails} failures`); process.exit(fails ? 1 : 0);
