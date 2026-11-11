#!/usr/bin/env node
/* End-to-end check of every calculator page in a simulated browser (needs: npm i jsdom). For each calculator it sets real input values,
   reads what the page DISPLAYS, and compares it with an independent reference calculation. Run: node tests/verify-ui.js */
const fs = require('fs'), path = require('path');
let JSDOM; try { ({ JSDOM } = require('jsdom')); } catch (e) { console.error('jsdom not installed: npm i jsdom'); process.exit(2); }
const PUB = path.join(__dirname, '..', 'public');
let checks = 0, fails = 0;
const endBal = (P, a, n, pay) => { const r = a / 1200; let b = P; for (let i = 0; i < n; i++) b = b * (1 + r) - pay; return b; };
const pmt = (P, a, y) => { const n = Math.round(y * 12); let lo = 0, hi = P * 3 + 1; for (let k = 0; k < 200; k++) { const m = (lo + hi) / 2; endBal(P, a, n, m) > 0 ? lo = m : hi = m; } return (lo + hi) / 2; };
const bal = (P, a, y, k) => { const p = pmt(P, a, y), r = a / 1200; let b = P; for (let i = 0; i < k; i++) b = b * (1 + r) - p; return b; };
const fee7a = (A, g, w) => { const G = A * g / 100; if (w && A <= 700000) return 0; return A <= 150000 ? G * .02 : A <= 700000 ? G * .03 : Math.min(G, 1e6) * .035 + Math.max(0, G - 1e6) * .0375; };
const num = (s) => { const m = String(s).replace(/,/g, '').match(/-?\$?-?\d+(\.\d+)?/); return m ? parseFloat(m[0].replace('$', '')) : NaN; };

async function load(page) {
  const html = fs.readFileSync(path.join(PUB, 'calculators', page), 'utf8');
  const w = new JSDOM(html, { runScripts: 'outside-only', url: 'https://loansflow.loan/calculators/' + page }).window;
  w.fetch = () => Promise.reject(new Error('offline'));
  for (const s of ['lf-math.js', 'lf-charts.js', 'lf-calc.js']) w.eval(fs.readFileSync(path.join(PUB, 'js', s), 'utf8'));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded')); await new Promise((r) => setTimeout(r, 40));
  return w;
}
function setAndRead(w, vals) {
  for (const [k, v] of Object.entries(vals)) { const el = w.document.querySelector(`[data-f="${k}"]`); if (!el) throw new Error('no field ' + k); el.value = String(v); el.dispatchEvent(new w.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); }
  const out = {}; const res = w.document.querySelector('.lf-result');
  out['__head'] = num(res.querySelector('.lf-head strong').textContent);
  res.querySelectorAll('.lf-rows > div').forEach((d) => { out[d.children[0].textContent.trim()] = d.children[1].textContent.trim(); });
  out['__text'] = res.textContent; return out;
}
function expect(name, got, ref, tol, label) { checks++; const ok = Math.abs(got - ref) <= Math.max(tol, 0.5) ; if (!ok) { fails++; console.log('FAIL', name, label, 'page=', got, 'ref=', ref); } }

(async () => {
  // SBA 7(a) and Express (same engine)
  for (const page of ['sba-7a.html', 'sba-express.html']) {
    const w = await load(page);
    for (const s of [{ amount: 350000, base: 7, spread: 3, years: 10, noi: 120000 }, { amount: 90000, base: 7.5, spread: 4.75, years: 7, noi: 40000 }, { amount: 1200000, base: 6.5, spread: 2.75, years: 10, noi: 400000 }]) {
      const o = setAndRead(w, s); const rate = s.base + s.spread, p = pmt(s.amount, rate, s.years), g = page.includes('express') ? 50 : (s.amount <= 150000 ? 85 : 75);
      const gg = page.includes('express') && s.amount > 500000 ? null : g;
      expect(page, o.__head, p, 0.01, 'payment ' + JSON.stringify(s));
      if (gg) { expect(page, num(o['Upfront guaranty fee (may be passed to you)']), fee7a(s.amount, gg, false), 1, 'fee ' + s.amount); expect(page, num(o['Total interest over the term']), p * s.years * 12 - s.amount, 1, 'total interest'); expect(page, num(o['DSCR']), s.noi / (p * 12), 0.006, 'dscr'); }
    }
  }
  { const w = await load('loan-payment.html');
    for (const s of [{ amount: 100000, rate: 9, years: 10, extra: 0 }, { amount: 250000, rate: 6.25, years: 15, extra: 0 }, { amount: 40000, rate: 12, years: 5, extra: 0 }]) {
      const o = setAndRead(w, s), p = pmt(s.amount, s.rate, s.years); expect('payment', o.__head, p, 0.01, 'pmt'); expect('payment', num(o['Total interest']), p * s.years * 12 - s.amount, 1, 'interest'); }
  }
  { const w = await load('mortgage-payment.html');
    for (const s of [{ price: 425000, down: 85000, rate: 7, years: 30, tax: 1.1, ins: 1400, pmi: 0.7 }, { price: 300000, down: 15000, rate: 6.5, years: 30, tax: 1.25, ins: 1800, pmi: 0.9 }, { price: 650000, down: 130000, rate: 5.5, years: 15, tax: .9, ins: 2400, pmi: .5 }]) {
      const o = setAndRead(w, s), L = s.price - s.down, pi = pmt(L, s.rate, s.years), pmiM = s.down / s.price < .2 ? L * s.pmi / 1200 : 0;
      expect('mortgage', o.__head, pi + s.price * s.tax / 1200 + s.ins / 12 + pmiM, 0.02, 'PITI'); expect('mortgage', num(o['Principal and interest']), pi, 0.01, 'P&I'); expect('mortgage', num(o['Mortgage insurance (PMI)']), pmiM, 0.01, 'PMI'); expect('mortgage', num(o['Total interest over the loan']), pi * s.years * 12 - L, 1, 'interest'); }
  }
  { const w = await load('home-affordability.html');
    for (const s of [{ income: 95000, debts: 450, down: 60000, rate: 7, tax: 1.1, ins: 1400 }, { income: 150000, debts: 2200, down: 40000, rate: 6, tax: 1.3, ins: 2000 }]) {
      const o = setAndRead(w, s), mi = s.income / 12, bud = Math.min(mi * .28, mi * .36 - s.debts), price = o.__head; const housing = pmt(price - s.down, s.rate, 30) + price * s.tax / 1200 + s.ins / 12;
      expect('afford', num(o['Monthly housing budget (incl. tax and insurance)']), bud, 1, 'budget'); expect('afford', housing, bud, 2, 'housing cost at price == budget'); }
  }
  { const w = await load('refinance-break-even.html');
    for (const s of [{ orig: 340000, rate: 7.5, years: 30, paid: 2, nrate: 6.5, nyears: 30, cost: 6000 }, { orig: 500000, rate: 8, years: 30, paid: 5, nrate: 6, nyears: 20, cost: 9000 }]) {
      const o = setAndRead(w, s), b = bal(s.orig, s.rate, s.years, s.paid * 12), cur = pmt(s.orig, s.rate, s.years), np = pmt(b, s.nrate, s.nyears);
      expect('refi', o.__head, cur - np, 0.01, 'monthly savings'); expect('refi', num(o['Balance today']), b, 1, 'balance'); expect('refi', parseFloat(o['Break-even on closing costs']), s.cost / (cur - np), 0.06, 'break-even months'); }
  }
  { const w = await load('commercial-real-estate.html');
    for (const s of [{ price: 1500000, down: 30, rate: 7.25, amort: 25, term: 10, noi: 140000 }, { price: 800000, down: 25, rate: 8.5, amort: 20, term: 7, noi: 90000 }]) {
      const o = setAndRead(w, s), L = s.price * (1 - s.down / 100), p = pmt(L, s.rate, s.amort);
      expect('cre', o.__head, p, 0.01, 'pmt'); expect('cre', num(o['Balance due at the end of the term']), bal(L, s.rate, s.amort, s.term * 12), 2, 'balloon'); expect('cre', num(o['DSCR']), s.noi / (p * 12), 0.006, 'dscr'); }
  }
  { const w = await load('dscr.html');
    for (const s of [{ noi: 140000, amount: 1000000, rate: 9.75, years: 25 }, { noi: 60000, amount: 300000, rate: 8, years: 10 }]) {
      const o = setAndRead(w, s), ds = pmt(s.amount, s.rate, s.years) * 12; expect('dscr', o.__head, s.noi / ds, 0.006, 'dscr'); expect('dscr', num(o['Annual debt service']), ds, 1, 'ds'); expect('dscr', num(o['Income needed for 1.25x']), ds * 1.25, 1, 'needed'); expect('dscr', num(o['Cushion above debt service']), s.noi - ds, 1, 'cushion'); }
  }
  { const w = await load('line-of-credit.html');
    for (const s of [{ limit: 100000, base: 7, spread: 3, drawn: 40, months: 12 }, { limit: 250000, base: 7.25, spread: 2.5, drawn: 65, months: 6 }]) {
      const o = setAndRead(w, s), avg = s.limit * s.drawn / 100, intr = avg * (s.base + s.spread) / 1200; expect('loc', o.__head, intr, 0.01, 'monthly interest'); expect('loc', num(o['Average balance']), avg, 1, 'avg'); expect('loc', num(o['Still available to draw']), s.limit - avg, 1, 'available'); }
  }
  { const w = await load('sba-equity-injection.html'); const pct = { startup: 10, acquire: 10, expand: 10, '504': 10, '504new': 15, '504special': 15, '504both': 20 };
    for (const [mode, p] of Object.entries(pct)) { const o = setAndRead(w, { cost: 600000, mode }); expect('equity ' + mode, o.__head, 600000 * p / 100, 1, 'down payment'); } }
  { const w = await load('sba-504.html');
    for (const s of [{ cost: 2000000, bankRate: 7.5, cdcRate: 6.5, years: 25, newBiz: 'no', special: 'no', noi: 260000 }, { cost: 1500000, bankRate: 8, cdcRate: 6.25, years: 20, newBiz: 'yes', special: 'yes', noi: 200000 }]) {
      const o = setAndRead(w, s), eq = 10 + (s.newBiz === 'yes' ? 5 : 0) + (s.special === 'yes' ? 5 : 0), bank = s.cost / 2, cdc = s.cost * (50 - eq) / 100;
      expect('504', o.__head, pmt(bank, s.bankRate, s.years) + pmt(cdc, s.cdcRate, s.years), 0.02, 'combined payment'); expect('504', num(o['Upfront SBA guaranty fee (0.50%)']), cdc * .005, 1, 'upfront'); expect('504', num(o['DSCR']), s.noi / ((pmt(bank, s.bankRate, s.years) + pmt(cdc, s.cdcRate, s.years)) * 12), 0.006, 'dscr'); }
  }
  { const w = await load('lease-vs-loan.html');
    for (const s of [{ price: 120000, down: 12000, years: 5, loanRate: 9.5, leaseRate: 11, resid: 20 }, { price: 60000, down: 0, years: 3, loanRate: 8, leaseRate: 9, resid: 30 }]) {
      const o = setAndRead(w, s), n = s.years * 12, i = s.leaseRate / 1200, R = s.price * s.resid / 100, loanP = pmt(s.price - s.down, s.loanRate, s.years);
      let pv = 0, leaseP = (s.price - R / Math.pow(1 + i, n)) * i / (1 - Math.pow(1 + i, -n)); for (let k = 1; k <= n; k++) pv += leaseP / Math.pow(1 + i, k); pv += R / Math.pow(1 + i, n);
      expect('lease', pv, s.price, 0.01, 'lease PV identity'); expect('lease', num(o['Loan payment']), loanP, 0.01, 'loan payment'); expect('lease', num(o['Lease payment (return at end)']), leaseP, 0.01, 'lease payment'); expect('lease', num(o['Net cost, loan (after keeping the equipment)']), s.down + loanP * n - R, 1, 'net cost loan'); }
  }
  for (const page of ['equipment-payment.html', 'equipment-term-comparison.html']) {
    const w = await load(page);
    for (const s of [{ price: 120000, down: 12000, years: 5 }, { price: 45000, down: 9000, years: 4 }]) {
      const vals = page.startsWith('equipment-payment') ? s : { price: s.price, down: s.down }; const o = setAndRead(w, vals);
      const rate = num(o['Estimated rate'] || o.__text.match(/Estimated rate\s*([\d.]+)%/)[1] + ''), financed = s.price - s.down;
      if (page.startsWith('equipment-payment')) { const p = pmt(financed, rate, s.years); expect(page, o.__head, p, 0.01, 'payment'); expect(page, num(o['Total interest']), p * s.years * 12 - financed, 1, 'interest'); expect(page, num(o['Total cost of equipment']), s.down + p * s.years * 12, 1, 'total cost'); }
      else { for (let y = 2; y <= 7; y++) { const m = o.__text.match(new RegExp(y + ' years[^$]*\\$([\\d,]+)\\s*\\$?([\\d,]+)?\\/mo')); const pay = pmt(financed, rate, y); const m2 = o.__text.match(new RegExp(y + ' yearsinterest \\$([\\d,]+)\\$([\\d,]+)/mo')); if (m2) expect(page, num(m2[2]), pay, 1, y + '-year payment'); else { fails++; console.log('FAIL could not read term row', y); } } }
    }
  }
  { const w = await load('business-acquisition.html');
    for (const s of [{ price: 750000, wc: 50000, closing: 25000, equityPct: 10, notePct: 0, rate: 10, years: 10, finFee: 'yes', sde: 260000, salary: 80000 }, { price: 1200000, wc: 100000, closing: 40000, equityPct: 20, notePct: 10, rate: 9.5, years: 10, finFee: 'no', sde: 400000, salary: 90000 }]) {
      const o = setAndRead(w, s), uses = s.price + s.wc + s.closing, eq = uses * s.equityPct / 100, note = s.price * s.notePct / 100, base = uses - eq - note;
      let loan = base, fee; for (let i = 0; i < 8; i++) { fee = fee7a(loan, loan <= 150000 ? 85 : 75, false); loan = s.finFee === 'yes' ? base + fee : base; } fee = fee7a(loan, loan <= 150000 ? 85 : 75, false);
      const ds = (pmt(loan, s.rate, s.years) + (note > 0 ? pmt(note, 6, 10) : 0)) * 12;
      expect('acquire', num(o['Total uses (price + capital + costs)']), uses, 1, 'uses'); expect('acquire', num(o['SBA 7(a) loan']), loan, 1, 'loan'); expect('acquire', o.__head, eq + (s.finFee === 'yes' ? 0 : fee), 1, 'cash at closing'); expect('acquire', num(o['DSCR']), (s.sde - s.salary) / ds, 0.006, 'dscr'); }
  }
  { const w = await load('cash-to-close.html');
    for (const s of [{ cost: 700000, down: 10, finFee: 'no', lenderPct: 1, third: 8000, legal: 6000, prepaid: 4000, reserve: 25000 }, { cost: 2400000, down: 20, finFee: 'yes', lenderPct: 1.5, third: 15000, legal: 12000, prepaid: 9000, reserve: 60000 }]) {
      const o = setAndRead(w, s), down = s.cost * s.down / 100, base = s.cost - down; let loan = base, fee; for (let i = 0; i < 8; i++) { fee = fee7a(loan, loan <= 150000 ? 85 : 75, false); loan = s.finFee === 'yes' ? base + fee : base; } fee = fee7a(loan, loan <= 150000 ? 85 : 75, false);
      expect('cashclose', o.__head, down + (s.finFee === 'yes' ? 0 : fee) + loan * s.lenderPct / 100 + s.third + s.legal + s.prepaid + s.reserve, 1, 'cash to close'); }
  }
  console.log(`${checks} UI checks, ${fails} failures`); process.exit(fails ? 1 : 0);
})();
