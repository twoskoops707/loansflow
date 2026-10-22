/* LoansFlow calculation library: pure functions, no DOM. Used by lf-calc.js and tested in Node. */
(function (root) {
  'use strict';
  const LF = {};

  /** Monthly payment on a fully amortizing loan. */
  LF.pmt = function (principal, ratePct, years) {
    const n = years * 12;
    const r = ratePct / 100 / 12;
    if (n <= 0) return 0;
    if (r === 0) return principal / n;
    return principal * r / (1 - Math.pow(1 + r, -n));
  };

  /** Balance remaining after `paid` monthly payments. */
  LF.balanceAfter = function (principal, ratePct, years, paid) {
    const n = years * 12;
    const r = ratePct / 100 / 12;
    if (r === 0) return principal * (1 - paid / n);
    return principal * (Math.pow(1 + r, n) - Math.pow(1 + r, paid)) / (Math.pow(1 + r, n) - 1);
  };

  /** Generic term loan summary. */
  LF.termLoan = function (amount, ratePct, years) {
    const payment = LF.pmt(amount, ratePct, years);
    const total = payment * years * 12;
    return { payment, total, interest: total - amount };
  };

  LF.dscr = function (noi, annualDebtService) {
    return annualDebtService > 0 ? noi / annualDebtService : Infinity;
  };

  /*
   * SBA fees, FY 2027 (loans approved Oct 1, 2026 - Sep 30, 2027).
   * 7(a): SBA Information Notice 5000-881797. Tier is chosen by GROSS loan amount; the percentage applies to the
   * guaranteed portion. >$700,000: 3.5% of the guaranteed portion up to $1M plus 3.75% above $1M.
   * The 0.55% lender annual service fee is paid by the lender and cannot be charged to the borrower.
   * 504: SBA Information Notice 5000-881796. 0.50% upfront and 0.203% annual on the debenture.
   * Manufacturers, listed food-supply-chain NAICS codes and rural businesses: 0% upfront on 7(a) loans of $700,000 or less.
   */
  LF.sba7aFee = function (loanAmount, guarantyPct, waived) {
    const guaranteed = loanAmount * guarantyPct / 100;
    let fee;
    if (waived && loanAmount <= 700000) fee = 0;
    else if (loanAmount <= 150000) fee = guaranteed * 0.02;
    else if (loanAmount <= 700000) fee = guaranteed * 0.03;
    else fee = Math.min(guaranteed, 1e6) * 0.035 + Math.max(0, guaranteed - 1e6) * 0.0375;
    return { guaranteed, fee, annualLenderFee: guaranteed * 0.0055 };
  };

  /** Maximum spread over the base rate for variable-rate 7(a) loans (sba.gov). */
  LF.sba7aMaxSpread = function (loanAmount) {
    if (loanAmount <= 50000) return 6.5;
    if (loanAmount <= 250000) return 6.0;
    if (loanAmount <= 350000) return 4.5;
    return 3.0;
  };

  /** Standard 7(a) guarantee: 85% up to $150,000, otherwise 75%. */
  LF.sba7aDefaultGuaranty = function (loanAmount) {
    return loanAmount <= 150000 ? 85 : 75;
  };

  /*
   * SBA 504 structure: third-party lender first lien (50%), CDC debenture (up to 40%), borrower equity (10%,
   * +5% for a new business, +5% for a special-purpose property). Extra equity reduces the CDC share.
   */
  LF.sba504Structure = function (projectCost, newBusiness, specialPurpose) {
    const equityPct = 10 + (newBusiness ? 5 : 0) + (specialPurpose ? 5 : 0);
    const bankPct = 50;
    const cdcPct = 100 - bankPct - equityPct;
    return {
      equityPct, bankPct, cdcPct,
      equity: projectCost * equityPct / 100,
      bank: projectCost * bankPct / 100,
      cdc: projectCost * cdcPct / 100
    };
  };
  LF.sba504Fee = function (debenture, waived) {
    return { upfront: waived ? 0 : debenture * 0.005, annual: waived ? 0 : debenture * 0.00203 };
  };

  /*
   * Equipment financing planning model. ILLUSTRATIVE, not a quote. Tier base rates sit inside the ranges that lenders and
   * rate guides publish publicly; real offers also depend on time in business, cash flow, collateral and lender.
   */
  LF.CREDIT_TIERS = [
    { id: 'excellent', label: 'Excellent (750+)', base: 7.5, low: 6.0, high: 11.0 },
    { id: 'good', label: 'Good (700-749)', base: 10.0, low: 8.0, high: 14.0 },
    { id: 'fair', label: 'Fair (650-699)', base: 14.0, low: 12.0, high: 20.0 },
    { id: 'weak', label: 'Weak (600-649)', base: 20.0, low: 18.0, high: 28.0 },
    { id: 'poor', label: 'Poor (below 600)', base: 28.0, low: 25.0, high: 40.0 }
  ];
  // adj = percentage-point adjustment to the tier base rate; life = typical useful life; maxTerm = longest sensible term (years)
  LF.EQUIPMENT_TYPES = [
    { id: 'construction', label: 'Construction and earth-moving', adj: 0, life: '10-15 years', maxTerm: 7, note: 'Strong resale market, so lenders are comfortable with the collateral.' },
    { id: 'trucks', label: 'Trucks, trailers and fleet vehicles', adj: 0.5, life: '7-12 years', maxTerm: 6, note: 'Liquid used-vehicle market; mileage and age matter.' },
    { id: 'manufacturing', label: 'Manufacturing and CNC machinery', adj: 0, life: '10-20 years', maxTerm: 7, note: 'Long useful life supports longer terms; very specialized machines can be harder to resell.' },
    { id: 'agriculture', label: 'Agricultural equipment', adj: -0.25, life: '10-20 years', maxTerm: 7, note: 'Seasonal payment schedules are common.' },
    { id: 'medical', label: 'Medical and dental equipment', adj: 0.5, life: '7-10 years', maxTerm: 7, note: 'Steady demand, but technology refresh cycles shorten the useful life.' },
    { id: 'restaurant', label: 'Restaurant and food service', adj: 1.0, life: '5-10 years', maxTerm: 5, note: 'Lower resale value because equipment is often installed and customized.' },
    { id: 'office', label: 'Office furniture and fixtures', adj: 1.0, life: '5-10 years', maxTerm: 5, note: 'Little resale value, so lenders price the risk higher.' },
    { id: 'it', label: 'Computers, IT and software-heavy gear', adj: 2.0, life: '3-5 years', maxTerm: 3, note: 'Loses value quickly, so terms are short and rates are higher.' }
  ];
  LF.equipmentRate = function (tierId, typeId, used, downPct) {
    const tier = LF.CREDIT_TIERS.find(function (t) { return t.id === tierId; }) || LF.CREDIT_TIERS[1];
    const type = LF.EQUIPMENT_TYPES.find(function (t) { return t.id === typeId; }) || LF.EQUIPMENT_TYPES[0];
    let rate = tier.base + type.adj;
    if (used) rate += 1.5;
    if (downPct >= 20) rate -= 0.5;
    else if (downPct < 5) rate += 1.0;
    rate = Math.min(Math.max(rate, tier.low - 0.5), tier.high + 3);
    return { rate: Math.round(rate * 100) / 100, tier: tier, type: type };
  };


  /** Commercial real estate: payment on the amortization schedule, balloon at the end of the term, LTV and DSCR. */
  LF.cre = function (price, downPct, ratePct, amortYears, termYears, noi) {
    const loan = price * (1 - downPct / 100);
    const pmt = LF.pmt(loan, ratePct, amortYears);
    const t = Math.min(termYears, amortYears);
    const balloon = LF.balanceAfter(loan, ratePct, amortYears, t * 12);
    return { loan, pmt, annual: pmt * 12, balloon, paidDown: loan - balloon, ltv: 100 - downPct, dscr: LF.dscr(noi, pmt * 12), down: price - loan, interestOverTerm: pmt * t * 12 - (loan - balloon) };
  };

  /*
   * SBA equity injection (down payment). Planning figures:
   * 7(a) startup or change of ownership: SBA requires at least 10% of the project cost as equity injection.
   * 7(a) expansion of an existing business: set by the lender.
   * 504: borrower equity 10%, plus 5% for a new business and 5% for a special-purpose property.
   */
  LF.equityInjection = function (cost, mode) {
    const m = {
      startup: { pct: 10, rule: 'SBA minimum for a 7(a) startup' },
      acquire: { pct: 10, rule: 'SBA minimum for buying a business (change of ownership)' },
      expand: { pct: 10, rule: 'Lender decides; 10% shown as a planning figure' },
      '504': { pct: 10, rule: 'Standard 504 borrower equity' },
      '504new': { pct: 15, rule: '504: 10% plus 5% for a new business' },
      '504special': { pct: 15, rule: '504: 10% plus 5% for a special-purpose property' },
      '504both': { pct: 20, rule: '504: 10% plus 5% new business plus 5% special-purpose property' }
    }[mode] || { pct: 10, rule: '' };
    return { pct: m.pct, rule: m.rule, equity: cost * m.pct / 100, loan: cost - cost * m.pct / 100 };
  };

  /*
   * Equipment lease versus loan, on financing cost only (no tax effects).
   * Lease payment amortizes (price minus the present value of the residual) at the lease rate.
   * Net cost = cash paid minus the value of equipment you still own at the end.
   */
  LF.leaseVsLoan = function (price, down, years, loanRatePct, leaseRatePct, residualPct) {
    const n = years * 12, i = leaseRatePct / 100 / 12, R = price * residualPct / 100;
    const loanPay = LF.pmt(Math.max(0, price - down), loanRatePct, years);
    const leasePay = i === 0 ? (price - R) / n : (price - R / Math.pow(1 + i, n)) * i / (1 - Math.pow(1 + i, -n));
    const loanCash = down + loanPay * n, leaseCash = down + leasePay * n;
    return { loanPay, leasePay, loanCash, leaseCash, residual: R, loanNet: loanCash - R, leaseNet: leaseCash, leaseBuyCash: leaseCash + R };
  };

  /** Equipment: monthly payment and interest for each term, same estimated rate. */
  LF.equipmentTerms = function (financed, ratePct, terms) {
    return terms.map(function (y) { const t = LF.termLoan(financed, ratePct, y); return { years: y, payment: t.payment, interest: t.interest, total: t.total }; });
  };

  /** Mortgage payment with tax and insurance. */
  LF.mortgage = function (price, down, ratePct, years, taxPct, insuranceYear, pmiPct) {
    const loan = Math.max(0, price - down);
    const pi = LF.pmt(loan, ratePct, years);
    const tax = price * taxPct / 100 / 12;
    const ins = insuranceYear / 12;
    const downPct = price > 0 ? down / price * 100 : 0;
    const pmi = downPct < 20 && pmiPct > 0 ? loan * pmiPct / 100 / 12 : 0;   // private mortgage insurance, typical on conventional loans under 20% down
    return { loan, pi, tax, ins, pmi, total: pi + tax + ins + pmi, interest: pi * years * 12 - loan, downPct };
  };

  /** Affordability: 28% of income for the whole housing payment, 36% for housing plus other debts. */
  LF.afford = function (income, monthlyDebts, down, ratePct, taxPct, insuranceYear) {
    const mi = income / 12;
    const budget = Math.max(0, Math.min(mi * 0.28, mi * 0.36 - monthlyDebts));
    const f = LF.pmt(1, ratePct, 30);
    const t = taxPct / 100 / 12;
    const room = budget - insuranceYear / 12;
    const price = room > 0 ? Math.max(0, (room + down * f) / (f + t)) : 0;
    return { budget, price, loan: Math.max(0, price - down), backEndDti: (monthlyDebts + budget) / mi * 100 };
  };

  /** Refinance: compare what is left on the current loan with a new loan on that balance. */
  LF.refi = function (origLoan, ratePct, years, yearsPaid, newRatePct, newYears, closingCosts) {
    const n = years * 12;
    const paid = Math.min(Math.max(0, Math.round(yearsPaid * 12)), n - 1);
    const balance = LF.balanceAfter(origLoan, ratePct, years, paid);
    const curPmt = LF.pmt(origLoan, ratePct, years);
    const newPmt = LF.pmt(balance, newRatePct, newYears);
    const curInterest = curPmt * (n - paid) - balance;
    const newInterest = newPmt * newYears * 12 - balance;
    const savings = curPmt - newPmt;
    return {
      balance, curPmt, newPmt, savings, curInterest, newInterest,
      interestChange: curInterest - newInterest,
      net: curInterest - newInterest - closingCosts,
      breakEvenMonths: savings > 0 ? closingCosts / savings : null,
      remainingMonths: n - paid
    };
  };

  /** Revolving line: interest on an average drawn balance. */
  LF.lineOfCredit = function (limit, ratePct, avgDrawnPct, months) {
    const avg = limit * avgDrawnPct / 100;
    const monthly = avg * ratePct / 100 / 12;
    return { avg, monthly, total: monthly * months, available: limit - avg };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = LF;
  else root.LF = LF;
})(typeof window !== 'undefined' ? window : this);
