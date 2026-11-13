/* LoansFlow embeddable calculators. Usage: <div data-calc="sba7a" data-title="..."></div>. Math lives in lf-math.js. */
(function () {
  'use strict';
  var LF = window.LF, CH = window.LFChart;
  var money = function (n, d) { return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
  var num = function (n, d) { return n.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };
  var livePrime = null, livePmms30 = null, liveNote = { prime: '', pmms30: '' };

  function f(id, label, value, o) { return Object.assign({ id: id, label: label, value: value, type: 'number', step: 1, min: (o && o.suffix === 'years') ? 1 : 0, max: (o && o.suffix === 'years') ? 100 : undefined }, o || {}); }
  function sel(id, label, value, options) { return { id: id, label: label, value: value, type: 'select', options: options }; }
  var YN = [['no', 'No'], ['yes', 'Yes']];

  var CALCS = {
    cre: function (d) {
      return {
        title: d.title || 'Commercial real estate loan calculator',
        fields: [
          f('price', 'Property price', 1500000, { prefix: '$', step: 25000 }), f('down', 'Down payment', 30, { suffix: '% of price', step: 1 }),
          f('rate', 'Interest rate', 7.25, { suffix: '%', step: 0.05, hint: 'Example rate; use your lender\'s quote' }), f('amort', 'Amortization', 25, { suffix: 'years', step: 1 }),
          f('term', 'Loan term', 10, { suffix: 'years', step: 1, hint: 'When the balance comes due' }), f('noi', 'Annual net operating income', 140000, { prefix: '$', step: 1000 })
        ],
        run: function (v) {
          var c = LF.cre(v.price, Math.min(v.down, 100), v.rate, v.amort, v.term, v.noi), notes = [];
          if (c.ltv > 80) notes.push('Loan-to-value above 80% is rare on commercial property; many lenders stop at 65% to 80%.');
          notes.push(c.dscr >= 1.25 ? 'DSCR meets the 1.25x level many lenders look for.' : 'DSCR is below the 1.25x level many lenders look for.');
          if (v.term < v.amort) notes.push('A balloon of ' + money(c.balloon) + ' comes due at the end of the term. Plan how you will refinance or repay it.');
          return {
            head: ['Monthly payment', money(c.pmt, 2)],
            sched: { amount: c.loan, rate: v.rate, years: v.amort, balloonYears: v.term },
            rows: [['Loan amount', money(c.loan)], ['Down payment', money(c.down)], ['Loan-to-value', num(c.ltv, 0) + '%'], ['Annual debt service', money(c.annual)], ['DSCR', num(c.dscr, 2) + 'x'], ['Balance due at the end of the term', money(c.balloon)]],
            notes: notes,
            charts: [CH.stack('At the end of a ' + v.term + '-year term', [{ label: 'Paid down', value: c.paidDown }, { label: 'Balloon still owed', value: c.balloon }]), CH.gauge('Debt service coverage', c.dscr)]
          };
        }
      };
    },

    acquire: function (d) {
      return {
        title: d.title || 'SBA business acquisition calculator',
        fields: [
          f('price', 'Purchase price', 750000, { prefix: '$', step: 10000 }), f('wc', 'Working capital to borrow', 50000, { prefix: '$', step: 5000 }),
          f('closing', 'Closing costs and fees', 25000, { prefix: '$', step: 1000 }), f('equityPct', 'Your equity injection', 10, { suffix: '% of total', step: 1, hint: 'SBA minimum is 10% for a change of ownership' }),
          f('notePct', 'Seller note', 0, { suffix: '% of price', step: 5, hint: 'Modeled as a separate loan; does not count as equity here' }),
          f('rate', 'SBA loan rate', livePrime ? livePrime + 3 : 10, { suffix: '%', step: 0.05, hint: 'Prime + 3.00% shown; your rate will differ' }), f('years', 'SBA loan term', 10, { suffix: 'years', step: 1 }),
          sel('finFee', 'Finance the SBA guarantee fee?', 'yes', YN),
          f('sde', "Seller's discretionary earnings (SDE)", 260000, { prefix: '$', step: 5000, hint: 'Net income plus owner pay and one-time add-backs' }),
          f('salary', 'Market salary for you as operator', 80000, { prefix: '$', step: 5000 })
        ],
        run: function (v) {
          var a = LF.acquisition({ price: v.price, workingCapital: v.wc, closingCosts: v.closing, equityPct: Math.min(v.equityPct, 100), sellerNotePct: v.notePct, ratePct: v.rate,
            years: v.years || 10, noteRatePct: 6, noteYears: 10, financeFee: v.finFee === 'yes', sde: v.sde, ownerSalary: v.salary }), notes = [];
          notes.push(a.dscr >= 1.25 ? 'DSCR is at or above 1.25x, the floor SBA lenders are reported to apply to first-time buyers under SOP 50 10 8.1.' : 'DSCR is below 1.25x, the floor SBA lenders are reported to apply to first-time buyers. A lower price, more equity or a longer term would help.');
          if (v.equityPct < 10) notes.push('The SBA requires at least 10% equity injection on a change of ownership.');
          if (a.sellerNote > 0) notes.push('Seller note modeled at 6% over 10 years. SBA rules limit how a seller note can count toward equity, and it may need to be on standby; ask your lender.');
          notes.push('Estimate only. Lenders also review the business valuation, add-backs, collateral and your experience.');
          return {
            head: ['Cash you bring to closing', money(a.cashAtClosing)],
            rows: [['Total uses (price + capital + costs)', money(a.uses)], ['SBA 7(a) loan', money(a.loan)], ['Seller note', money(a.sellerNote)],
              ['SBA guarantee fee (' + a.guaranty + '% guaranteed)', money(a.fee)], ['Monthly SBA payment', money(a.loanPmt, 2)], ['Monthly seller-note payment', money(a.notePmt, 2)],
              ['Cash flow after your salary', money(a.cashFlow)], ['Annual debt service', money(a.annualDS)], ['DSCR', num(a.dscr, 2) + 'x'], ['Max debt service at 1.25x', money(a.maxDebtService)], ['Price as a multiple of SDE', num(a.multiple, 2) + 'x']],
            notes: notes,
            charts: [CH.stack('Funding the purchase', [{ label: 'SBA loan', value: a.loan }, { label: 'Your equity', value: a.equity }, { label: 'Seller note', value: a.sellerNote }]), CH.gauge('Debt service coverage', a.dscr)]
          };
        }
      };
    },

    cashclose: function (d) {
      return {
        title: d.title || 'SBA cash-to-close estimator',
        fields: [
          f('cost', 'Total project cost', 700000, { prefix: '$', step: 10000 }), f('down', 'Down payment', 10, { suffix: '% of cost', step: 1 }),
          sel('finFee', 'Finance the SBA guarantee fee?', 'no', YN), f('lenderPct', 'Lender / packaging fee', 1, { suffix: '% of loan', step: 0.25, hint: 'Varies widely; ask your lender' }),
          f('third', 'Appraisal, environmental, valuation', 8000, { prefix: '$', step: 500 }), f('legal', 'Legal and title', 6000, { prefix: '$', step: 500 }),
          f('prepaid', 'Prepaid insurance and deposits', 4000, { prefix: '$', step: 500 }), f('reserve', 'Working capital reserve', 25000, { prefix: '$', step: 1000 })
        ],
        run: function (v) {
          var c = LF.cashToClose({ projectCost: v.cost, downPct: Math.min(v.down, 100), financeFee: v.finFee === 'yes', lenderFeePct: v.lenderPct, thirdParty: v.third, legal: v.legal, prepaid: v.prepaid, reserve: v.reserve });
          return {
            head: ['Estimated cash to close', money(c.cash)],
            rows: c.items.map(function (x) { return [x[0], money(x[1])]; }).concat([['Loan amount', money(c.loan)]]),
            notes: ['Planning estimate, not a quote. The SBA guarantee fee follows the FY 2027 schedule (3% of the guaranteed portion on loans of $150,001 to $700,000; 3.5% above that, up to $1 million guaranteed).', 'Ask your lender for a written estimate of every fee before you commit.']
          };
        }
      };
    },

    equity: function (d) {
      return {
        title: d.title || 'SBA down payment (equity injection) calculator',
        fields: [
          f('cost', 'Total project cost', 600000, { prefix: '$', step: 10000 }),
          sel('mode', 'What are you doing?', 'acquire', [['startup', 'Starting a business (7(a))'], ['acquire', 'Buying a business (7(a))'], ['expand', 'Expanding an existing business (7(a))'], ['504', 'Buying property or equipment (504)'], ['504new', '504 for a new business'], ['504special', '504 for a special-purpose property'], ['504both', '504: new business and special-purpose']])
        ],
        run: function (v) {
          var e = LF.equityInjection(v.cost, v.mode);
          return {
            head: ['Down payment needed', money(e.equity)],
            rows: [['Share of the project', num(e.pct, 0) + '%'], ['Left to borrow', money(e.loan)], ['Rule behind the number', e.rule]],
            notes: ['Lenders can require more than the SBA minimum. Ask which sources your lender counts toward the down payment, since seller notes and other funds follow specific rules.'],
            charts: [CH.stack('Funding the project', [{ label: 'Your equity', value: e.equity }, { label: 'Loan', value: e.loan }])]
          };
        }
      };
    },

    equipterms: function (d) {
      return {
        title: d.title || 'Equipment financing payment by term',
        fields: [
          f('price', 'Equipment price', 120000, { prefix: '$', step: 1000 }), f('down', 'Down payment', 12000, { prefix: '$', step: 500 }),
          sel('tier', 'Credit profile', d.tier || 'good', LF.CREDIT_TIERS.map(function (t) { return [t.id, t.label]; })),
          sel('type', 'Equipment type', d.type || 'construction', LF.EQUIPMENT_TYPES.map(function (t) { return [t.id, t.label]; })),
          sel('used', 'Condition', d.used || 'new', [['new', 'New'], ['used', 'Used']])
        ],
        run: function (v) {
          var downPct = v.price > 0 ? v.down / v.price * 100 : 0, est = LF.equipmentRate(v.tier, v.type, v.used === 'used', downPct), fin = Math.max(0, v.price - v.down);
          var rows = LF.equipmentTerms(fin, est.rate, [2, 3, 4, 5, 6, 7]), max = rows[rows.length - 1].payment === 0 ? 1 : rows[0].payment;
          return {
            head: ['Estimated rate', num(est.rate, 2) + '%'],
            rows: [['Amount financed', money(fin)], ['Down payment', num(downPct, 1) + '% of price'], ['Usual maximum term for this type', est.type.maxTerm + ' years']],
            notes: ['Same estimated rate at every term. In practice lenders often charge more for longer terms.', est.type.note, 'Planning estimate only, not an offer.'],
            charts: [CH.hbars('Monthly payment by term', rows.map(function (r) { return { label: r.years + ' years' + (r.years > est.type.maxTerm ? ' (long for this type)' : ''), value: r.payment, text: money(r.payment) + '/mo', note: 'interest ' + money(r.interest) }; }), { max: max })]
          };
        }
      };
    },

    leaseloan: function (d) {
      return {
        title: d.title || 'Equipment lease versus loan',
        fields: [
          f('price', 'Equipment price', 120000, { prefix: '$', step: 1000 }), f('down', 'Cash due at the start', 12000, { prefix: '$', step: 500 }),
          f('years', 'Term', 5, { suffix: 'years', step: 1 }), f('loanRate', 'Loan rate', 9.5, { suffix: '%', step: 0.05, hint: 'Example rate; use your lender\'s quote' }),
          f('leaseRate', 'Lease rate', 11, { suffix: '%', step: 0.05, hint: 'Leases often carry a higher effective rate' }), f('resid', 'Value of the equipment at the end', 20, { suffix: '% of price', step: 1 })
        ],
        run: function (v) {
          var r = LF.leaseVsLoan(v.price, v.down, v.years, v.loanRate, v.leaseRate, v.resid), cheaper = r.loanNet <= r.leaseNet ? 'Loan' : 'Lease', diff = Math.abs(r.loanNet - r.leaseNet);
          return {
            head: ['Lower net cost', cheaper + ' by ' + money(diff)],
            rows: [['Loan payment', money(r.loanPay, 2) + '/mo'], ['Lease payment (return at end)', money(r.leasePay, 2) + '/mo'], ['Cash paid, loan', money(r.loanCash)], ['Cash paid, lease', money(r.leaseCash)],
              ['Equipment value at the end', money(r.residual)], ['Net cost, loan (after keeping the equipment)', money(r.loanNet)], ['Net cost, lease', money(r.leaseNet)], ['Extra to buy the equipment at lease end', money(r.residual)]],
            notes: ['Compares financing cost only. Tax treatment, maintenance, usage limits and end-of-lease fees can change the answer, so ask your tax professional.', 'The result depends heavily on the end value you assume. Try a lower figure to see how sensitive it is.'],
            charts: [CH.hbars('Net cost over the term', [{ label: 'Loan', value: r.loanNet, text: money(r.loanNet), on: cheaper === 'Loan' }, { label: 'Lease', value: r.leaseNet, text: money(r.leaseNet), on: cheaper === 'Lease' }], { max: Math.max(r.loanNet, r.leaseNet) })]
          };
        }
      };
    },

    payment: function (d) {
      return {
        title: 'Loan payment calculator',
        fields: [
          f('amount', 'Loan amount', +d.amount || 100000, { prefix: '$', step: 1000, max: +d.maxAmount || 0 }),
          f('rate', 'Interest rate', +d.rate || 9, { suffix: '%', step: 0.05, hint: 'Example rate; use your lender\'s quote' }),
          f('years', 'Term', +d.years || 10, { suffix: 'years', step: 1, max: +d.maxYears || 40 }),
          f('noi', 'Annual net operating income (optional)', +d.noi || 0, { prefix: '$', step: 1000 }),
          f('extra', 'Extra monthly payment (optional)', 0, { prefix: '$', step: 50, hint: 'See how much interest and time it saves' })
        ],
        run: function (v) {
          var t = LF.termLoan(v.amount, v.rate, v.years), rows = [['Total interest', money(t.interest)], ['Total repaid', money(t.total)]], notes = [];
          if (v.noi > 0) {
            var ds = t.payment * 12, c = LF.dscr(v.noi, ds);
            rows.push(['Annual debt service', money(ds)], ['Debt service coverage (DSCR)', num(c, 2) + 'x']);
            notes.push(c >= 1.25 ? 'DSCR meets the 1.25x level many lenders look for.' : 'DSCR is below the 1.25x level many lenders look for.');
          }
          if (v.extra > 0) { var sx = LF.schedule(v.amount, v.rate, v.years, v.extra); rows.push(['Interest with extra payments', money(sx.totalInterest)], ['Interest saved', money(t.interest - sx.totalInterest)], ['Paid off in', num(sx.payoffMonths / 12, 1) + ' years (' + sx.payoffMonths + ' months)']); }
          if (+d.maxAmount && v.amount > +d.maxAmount) notes.push('This program caps loans at ' + money(+d.maxAmount) + '.');
          if (+d.maxYears && v.years > +d.maxYears) notes.push('This program caps terms at ' + d.maxYears + ' years.');
          return { head: ['Monthly payment', money(t.payment, 2)], rows: rows, notes: notes, sched: { amount: v.amount, rate: v.rate, years: v.years, extra: v.extra },
            charts: [CH.stack('Where your money goes over the loan', [{ label: 'Principal', value: v.amount }, { label: 'Interest', value: t.interest }]), v.noi > 0 ? CH.gauge('Debt service coverage', c) : ''] };
        }
      };
    },

    sba7a: function (d) {
      var express = d.variant === 'express';
      return {
        title: express ? 'SBA Express loan calculator' : 'SBA 7(a) loan calculator',
        fields: [
          f('amount', 'Loan amount', +d.amount || 350000, { prefix: '$', step: 5000 }),
          sel('use', 'Main use of proceeds', 'general', [['general', 'Working capital, equipment, business purchase (up to 10 years)'], ['realestate', 'Real estate (up to 25 years)']]),
          f('base', 'Base (prime) rate', livePrime || 7.0, { suffix: '%', step: 0.05, live: true }),
          f('spread', 'Lender spread over base', 3.0, { suffix: '%', step: 0.05 }),
          f('years', 'Term', 10, { suffix: 'years', step: 1 }),
          f('guar', 'SBA guarantee', express ? 50 : 0, { suffix: '%', step: 1, hint: express ? 'Express: 50%' : '0 = standard (85% up to $150,000, else 75%)' }),
          sel('waived', 'Manufacturer, food supply chain or rural business?', 'no', YN),
          f('noi', 'Annual net operating income', 120000, { prefix: '$', step: 1000 })
        ],
        run: function (v) {
          var guar = v.guar > 0 ? v.guar : LF.sba7aDefaultGuaranty(v.amount);
          var rate = v.base + v.spread, pay = LF.pmt(v.amount, rate, v.years), fee = LF.sba7aFee(v.amount, guar, v.waived === 'yes');
          var cap = LF.sba7aMaxSpread(v.amount), ds = pay * 12, c = LF.dscr(v.noi, ds), notes = [];
          if (v.spread > cap) notes.push('SBA caps the spread on a variable-rate 7(a) loan of this size at base + ' + cap + '%.');
          var maxY = v.use === 'realestate' ? 25 : 10;
          if (v.years > maxY) notes.push('Typical maximum term for this use is ' + maxY + ' years.');
          if (v.amount > (express ? 500000 : 5000000)) notes.push('Maximum loan size is ' + money(express ? 500000 : 5000000) + '.');
          notes.push(c >= 1.25 ? 'DSCR meets the 1.25x level many lenders look for.' : 'DSCR is below the 1.25x level many lenders look for.');
          notes.push('Fees follow SBA\'s FY 2027 schedule (effective Oct 1, 2026). The lender\'s ' + money(fee.annualLenderFee) + ' first-year service fee is paid by the lender, not billed to you.');
          return {
            head: ['Monthly payment', money(pay, 2)],
            sched: { amount: v.amount, rate: rate, years: v.years },
            rows: [['Interest rate', num(rate, 2) + '%'], ['SBA-guaranteed portion (' + guar + '%)', money(fee.guaranteed)], ['Upfront guaranty fee (may be passed to you)', money(fee.fee)],
              ['Total interest over the term', money(pay * v.years * 12 - v.amount)], ['Annual debt service', money(ds)], ['DSCR', num(c, 2) + 'x']],
            notes: notes,
            charts: [CH.stack('Who carries the risk', [{ label: 'SBA guarantees', value: fee.guaranteed }, { label: 'Lender carries', value: Math.max(0, v.amount - fee.guaranteed) }]), CH.gauge('Debt service coverage', c)]
          };
        }
      };
    },

    sba504: function () {
      return {
        title: 'SBA 504 loan calculator',
        fields: [
          f('cost', 'Total project cost', 2000000, { prefix: '$', step: 25000 }),
          f('bankRate', 'Bank loan rate (50%)', 7.5, { suffix: '%', step: 0.05, hint: 'Example rate; set by the lender' }),
          f('cdcRate', 'CDC debenture rate (up to 40%)', 6.5, { suffix: '%', step: 0.05, hint: 'Fixed at closing; ask a CDC for today\'s rate' }),
          sel('years', 'Term', '25', [['25', '25 years (real estate)'], ['20', '20 years'], ['10', '10 years (equipment)']]),
          sel('newBiz', 'New business (under 2 years)?', 'no', YN),
          sel('special', 'Special-purpose property?', 'no', YN),
          sel('waived', 'Manufacturer, food supply chain or rural business?', 'no', YN),
          f('noi', 'Annual net operating income', 260000, { prefix: '$', step: 1000 })
        ],
        run: function (v) {
          var s = LF.sba504Structure(v.cost, v.newBiz === 'yes', v.special === 'yes'), y = +v.years;
          var bank = LF.pmt(s.bank, v.bankRate, y), cdc = LF.pmt(s.cdc, v.cdcRate, y), fee = LF.sba504Fee(s.cdc, v.waived === 'yes');
          var total = bank + cdc, c = LF.dscr(v.noi, total * 12), blended = (s.bank * v.bankRate + s.cdc * v.cdcRate) / (s.bank + s.cdc);
          return {
            head: ['Combined monthly payment', money(total, 2)],
            rows: [['Bank loan (' + s.bankPct + '%)', money(s.bank) + ' / ' + money(bank, 2) + ' mo'], ['CDC debenture (' + s.cdcPct + '%)', money(s.cdc) + ' / ' + money(cdc, 2) + ' mo'],
              ['Your equity (' + s.equityPct + '%)', money(s.equity)], ['Blended rate on financed amount', num(blended, 2) + '%'],
              ['Upfront SBA guaranty fee (0.50%)', money(fee.upfront)], ['Annual SBA service fee (0.203%)', money(fee.annual) + ' in year 1'], ['DSCR', num(c, 2) + 'x']],
            notes: ['Structure: bank first lien 50%, CDC second lien up to 40%, borrower at least 10%. Extra equity is required for new businesses and special-purpose property.',
              'CDC processing fees, bank fees and closing costs are additional and vary by lender.', c >= 1.25 ? 'DSCR meets the 1.25x level many lenders look for.' : 'DSCR is below the 1.25x level many lenders look for.'],
            charts: [CH.stack('Where the project money comes from', [{ label: 'Bank loan', value: s.bank }, { label: 'CDC debenture', value: s.cdc }, { label: 'Your equity', value: s.equity }]), CH.gauge('Debt service coverage', c)]
          };
        }
      };
    },

    loc: function () {
      return {
        title: 'Business line of credit cost calculator',
        fields: [
          f('limit', 'Credit limit', 100000, { prefix: '$', step: 5000 }),
          f('base', 'Base (prime) rate', livePrime || 7.0, { suffix: '%', step: 0.05, live: true }),
          f('spread', 'Lender spread', 3.0, { suffix: '%', step: 0.05 }),
          f('drawn', 'Average amount drawn', 40, { suffix: '% of limit', step: 5 }),
          f('months', 'Months of use', 12, { suffix: 'months', step: 1 }),
          f('fee', 'Annual fee', 0, { prefix: '$', step: 50 })
        ],
        run: function (v) {
          var rate = v.base + v.spread, r = LF.lineOfCredit(v.limit, rate, v.drawn, v.months), fees = v.fee * v.months / 12;
          return {
            head: ['Interest per month', money(r.monthly, 2)],
            rows: [['Rate', num(rate, 2) + '%'], ['Average balance', money(r.avg)], ['Interest over ' + v.months + ' months', money(r.total)], ['Fees over the period', money(fees)], ['All-in cost', money(r.total + fees)], ['Still available to draw', money(r.available)]],
            notes: ['Interest is charged only on the amount you have drawn. Rates on most lines are variable and move with prime.'],
            charts: [CH.stack('Your line of credit', [{ label: 'Average drawn', value: r.avg }, { label: 'Still available', value: r.available }])]
          };
        }
      };
    },

    equipment: function (d) {
      return {
        title: 'Equipment financing estimator',
        fields: [
          f('price', 'Equipment price', +d.price || 120000, { prefix: '$', step: 1000 }),
          f('down', 'Down payment', d.down !== undefined ? +d.down : 12000, { prefix: '$', step: 500 }),
          sel('tier', 'Credit profile', d.tier || 'good', LF.CREDIT_TIERS.map(function (t) { return [t.id, t.label]; })),
          sel('type', 'Equipment type', d.type || 'construction', LF.EQUIPMENT_TYPES.map(function (t) { return [t.id, t.label]; })),
          sel('used', 'Condition', d.used || 'new', [['new', 'New'], ['used', 'Used']]),
          f('years', 'Term', 5, { suffix: 'years', step: 1 })
        ],
        run: function (v) {
          var downPct = v.price > 0 ? v.down / v.price * 100 : 0, used = v.used === 'used';
          var est = LF.equipmentRate(v.tier, v.type, used, downPct), fin = Math.max(0, v.price - v.down), t = LF.termLoan(fin, est.rate, v.years), notes = [];
          if (v.years > est.type.maxTerm) notes.push('Lenders usually keep ' + est.type.label.toLowerCase() + ' terms to ' + est.type.maxTerm + ' years or less (typical useful life ' + est.type.life + ').');
          notes.push(est.type.note);
          notes.push('Planning estimate only, not an offer. Real rates also depend on time in business, cash flow, collateral and the lender.');
          return {
            head: ['Monthly payment', money(t.payment, 2)],
            sched: { amount: fin, rate: est.rate, years: v.years },
            rows: [['Estimated rate', num(est.rate, 2) + '%'], ['Amount financed', money(fin)], ['Down payment', num(downPct, 1) + '% of price'], ['Total interest', money(t.interest)], ['Total cost of equipment', money(t.total + v.down)]],
            notes: notes,
            charts: [CH.hbars('Estimated rate by credit profile', LF.CREDIT_TIERS.map(function (c) { var q = LF.equipmentRate(c.id, v.type, used, downPct).rate; return { label: c.label, value: q, text: num(q, 2) + '%', note: 'lenders: ' + c.low + '% to ' + c.high + '%', on: c.id === v.tier }; }), { max: 35 })]
          };
        }
      };
    },

    mortgage: function () {
      return {
        title: 'Mortgage payment calculator',
        fields: [
          f('price', 'Home price', 425000, { prefix: '$', step: 5000 }), f('down', 'Down payment', 85000, { prefix: '$', step: 1000 }),
          f('rate', 'Interest rate', livePmms30 || 7.0, { suffix: '%', step: 0.05, live: 'pmms30', hint: 'Starts at the latest Freddie Mac 30-year average. Replace it with your quote.' }), f('years', 'Term', 30, { suffix: 'years', step: 5 }),
          f('tax', 'Property tax', 1.1, { suffix: '% of price', step: 0.05 }), f('ins', 'Homeowner\'s insurance', 1400, { prefix: '$', suffix: '/yr', step: 50 }),
          f('pmi', 'PMI rate (used when under 20% down)', 0.7, { suffix: '% of loan/yr', step: 0.05, hint: 'Typically 0.3% to 1.5% depending on credit and down payment' })
        ],
        run: function (v) {
          var m = LF.mortgage(v.price, v.down, v.rate, v.years, v.tax, v.ins, v.pmi), notes = [];
          if (m.pmi > 0) notes.push('Includes an estimated ' + money(m.pmi, 2) + ' a month of PMI because the down payment is under 20%. It usually ends once you build enough equity.');
          notes.push('Excludes HOA dues. Rates vary with credit, down payment and lender.');
          return { head: ['Monthly payment (PITI)', money(m.total, 2)], sched: { amount: m.loan, rate: v.rate, years: v.years }, rows: [['Principal and interest', money(m.pi, 2)], ['Property tax', money(m.tax, 2)], ['Insurance', money(m.ins, 2)], ['Mortgage insurance (PMI)', money(m.pmi, 2)], ['Loan amount', money(m.loan)], ['Down payment', num(m.downPct, 1) + '%'], ['Total interest over the loan', money(m.interest)]], notes: notes,
            charts: [CH.donut('Your monthly payment', [{ label: 'Principal and interest', value: m.pi }, { label: 'Property tax', value: m.tax }, { label: 'Insurance', value: m.ins }, { label: 'PMI', value: m.pmi }].filter(function (x) { return x.value > 0; }), [money(m.total), 'per month'], function (n) { return money(n) + '/mo'; })] };
        }
      };
    },

    refi: function () {
      return {
        title: 'Refinance break-even calculator',
        fields: [
          f('orig', 'Original loan amount', 340000, { prefix: '$', step: 5000 }), f('rate', 'Current rate', 7.5, { suffix: '%', step: 0.05 }),
          f('years', 'Original term', 30, { suffix: 'years', step: 5 }), f('paid', 'Years already paid', 2, { suffix: 'years', step: 1 }),
          f('nrate', 'New rate', 6.5, { suffix: '%', step: 0.05 }), f('nyears', 'New term', 30, { suffix: 'years', step: 5 }), f('cost', 'Closing costs', 6000, { prefix: '$', step: 250 })
        ],
        run: function (v) {
          var r = LF.refi(v.orig, v.rate, v.years, v.paid, v.nrate, v.nyears, v.cost);
          return {
            head: ['Monthly savings', r.savings >= 0 ? money(r.savings, 2) : '-' + money(-r.savings, 2)],
            rows: [['Balance today', money(r.balance)], ['Break-even on closing costs', r.breakEvenMonths === null ? 'No monthly savings' : num(r.breakEvenMonths, 1) + ' months'],
              ['Interest ' + (r.interestChange >= 0 ? 'saved' : 'added'), money(Math.abs(r.interestChange))], ['Net ' + (r.net >= 0 ? 'saving' : 'cost') + ' after closing costs', money(Math.abs(r.net))]],
            notes: ['Compares what you still owe with a new loan on that balance, paying closing costs out of pocket. A longer new term can lower the payment while adding interest.'],
            charts: [CH.breakeven('When the refinance pays for itself', r.savings, v.cost, r.breakEvenMonths)]
          };
        }
      };
    },

    afford: function () {
      return {
        title: 'Home affordability calculator',
        fields: [
          f('income', 'Annual household income', 95000, { prefix: '$', step: 1000 }), f('debts', 'Other monthly debt payments', 450, { prefix: '$', step: 25 }),
          f('down', 'Available down payment', 60000, { prefix: '$', step: 1000 }), f('rate', 'Interest rate', livePmms30 || 7.0, { suffix: '%', step: 0.05, live: 'pmms30', hint: 'Starts at the latest Freddie Mac 30-year average. Replace it with your quote.' }),
          f('tax', 'Property tax', 1.1, { suffix: '% of price', step: 0.05 }), f('ins', 'Insurance', 1400, { prefix: '$', suffix: '/yr', step: 50 })
        ],
        run: function (v) {
          var a = LF.afford(v.income, v.debts, v.down, v.rate, v.tax, v.ins);
          return { head: ['Estimated home price', money(a.price)], rows: [['Monthly housing budget (incl. tax and insurance)', money(a.budget)], ['Loan amount', money(a.loan)], ['Debt-to-income at that budget', num(a.backEndDti, 1) + '%']],
            notes: ['Uses the 28% housing and 36% total-debt guidelines on a 30-year loan. Lenders may allow more or less; PMI and HOA dues are not included.'],
            charts: [CH.donut('Where your monthly income goes at this budget', [{ label: 'Housing', value: a.budget }, { label: 'Other debts', value: v.debts }, { label: 'The rest', value: Math.max(0, v.income / 12 - a.budget - v.debts) }], [money(v.income / 12), 'per month'], function (n) { return money(n) + '/mo'; })] };
        }
      };
    },

    dscr: function () {
      return {
        title: 'Debt service coverage (DSCR) calculator',
        fields: [
          f('noi', 'Annual net operating income', 140000, { prefix: '$', step: 1000 }), f('amount', 'Loan amount', 1000000, { prefix: '$', step: 10000 }),
          f('rate', 'Interest rate', 9.75, { suffix: '%', step: 0.05 }), f('years', 'Term', 25, { suffix: 'years', step: 1 })
        ],
        run: function (v) {
          var ds = LF.pmt(v.amount, v.rate, v.years) * 12, c = LF.dscr(v.noi, ds);
          var max = LF.dscr(1, 1) && v.noi / 1.25;
          return { head: ['DSCR', num(c, 2) + 'x'], rows: [['Annual debt service', money(ds)], ['Income needed for 1.25x', money(ds * 1.25)], ['Cushion above debt service', money(v.noi - ds)]],
            notes: [c >= 1.25 ? 'Meets the 1.25x level many lenders look for.' : c >= 1 ? 'Covers the payment but with less cushion than many lenders want.' : 'Income does not cover the payment as structured.', max ? '' : ''].filter(Boolean),
            charts: [CH.gauge('Debt service coverage', c)] };
        }
      };
    },

    sbafee: function () {
      return {
        title: 'SBA 7(a) guarantee fee calculator',
        fields: [
          f('amount', 'Loan amount', 350000, { prefix: '$', step: 10000 }),
          f('gp', 'SBA guarantee', LF.sba7aDefaultGuaranty(350000), { suffix: '%', step: 1, hint: 'Standard 7(a) guarantee for this size; Express loans are 50%' }),
          sel('waived', 'Qualifies for the fee waiver?', 'no', YN),
          sel('finFee', 'Roll the fee into the loan?', 'no', YN)
        ],
        run: function (v) {
          var P = LF.policy.sba7a, w = v.waived === 'yes', r = LF.sba7aFee(v.amount, Math.min(v.gp, 100), w), notes = [];
          var tier = P.upfrontFee.tiers.filter(function (x) { return v.amount <= x.upToLoan; })[0];
          notes.push(w && v.amount <= P.upfrontFee.waiver.maxLoan ? 'The upfront fee is waived for qualifying loans of ' + money(P.upfrontFee.waiver.maxLoan) + ' or less (for example some manufacturers and rural businesses); confirm eligibility with your lender.' :
            tier ? 'The upfront fee is ' + num(tier.pctOfGuaranteed, 2) + '% of the guaranteed portion for loans up to ' + money(tier.upToLoan) + '.' :
            'Above ' + money(P.upfrontFee.tiers[P.upfrontFee.tiers.length - 1].upToLoan) + ' the fee is ' + num(P.upfrontFee.above.pctFirst, 2) + '% of the guaranteed portion up to ' + money(P.upfrontFee.above.firstGuaranteed) + ' plus ' + num(P.upfrontFee.above.pctRest, 2) + '% of any guaranteed amount above that.');
          notes.push('The lender pays the SBA annual service fee (' + num(P.lenderAnnualServiceFeePct, 2) + '% of the guaranteed balance) and may not pass it on to you.');
          notes.push('Fee schedule: SBA fiscal year ' + LF.policy.fiscalYear + ', effective ' + LF.policy.effective + '. Estimate only.');
          var total = v.finFee === 'yes' ? v.amount + r.fee : v.amount;
          return {
            head: ['Upfront guarantee fee', money(r.fee, 2)],
            rows: [['Guaranteed portion', money(r.guaranteed)], ['Fee as a share of the loan', num(v.amount ? r.fee / v.amount * 100 : 0, 2) + '%'], ['Lender annual service fee (not charged to you)', money(r.annualLenderFee, 2)],
              ['Loan balance including the fee', money(total, 2)], ['Cash due at closing for the fee', v.finFee === 'yes' ? '$0' : money(r.fee, 2)]],
            notes: notes,
            charts: [CH.stack('Loan and fee', [{ label: 'Loan amount', value: v.amount }, { label: 'Upfront fee', value: r.fee }])]
          };
        }
      };
    },

    mca: function () {
      return {
        title: 'True cost of a merchant cash advance (factor rate to APR)',
        fields: [
          f('advance', 'Advance amount', 50000, { prefix: '$', step: 1000 }), f('factor', 'Factor rate', 1.35, { step: 0.01, hint: 'Payback = advance x factor. Example only; use the rate in your offer' }),
          f('n', 'Number of payments', 130, { step: 1, hint: 'About 125 to 130 business days is roughly six months of daily payments' }),
          sel('freq', 'Payment frequency', 'daily', [['daily', 'Daily (business days, 250 a year)'], ['weekly', 'Weekly (52 a year)']]),
          f('fees', 'Fees taken from the advance', 0, { suffix: '% of advance', step: 0.5, hint: 'Origination or underwriting fees, if any' })
        ],
        run: function (v) {
          var py = v.freq === 'weekly' ? 52 : 250, c = LF.mcaCost(v.advance, v.factor, v.n, py, v.fees);
          return {
            head: ['Estimated APR', num(c.apr, 0) + '%'],
            rows: [['Total you repay', money(c.payback)], ['Total cost of the advance', money(c.cost)], ['Cost as a share of the advance', num(v.advance ? c.cost / v.advance * 100 : 0, 1) + '%'],
              ['Payment each ' + (v.freq === 'weekly' ? 'week' : 'business day'), money(c.payment, 2)], ['Cash you actually receive', money(c.net)], ['Same rate compounded for a year', num(c.effectiveApr, 0) + '%']],
            notes: ['A factor rate is a flat multiple, not an interest rate. Because you repay a little every payment, the money is outstanding for only part of the term, so the annualized rate is much higher than the factor suggests.',
              'APR here is the periodic rate that makes the payments equal the cash received, times payments per year. Paying early usually does not reduce the amount owed.', 'Estimate for comparison with other financing, not an offer or a legal APR disclosure.'],
            charts: [CH.stack('Where each repaid dollar goes', [{ label: 'Cash received', value: c.net }, { label: 'Cost', value: c.cost }])]
          };
        }
      };
    },

    gdscr: function () {
      return {
        title: 'Global and add-back DSCR calculator',
        fields: [
          f('ni', 'Business net income (after owner pay)', 150000, { prefix: '$', step: 1000 }), f('int', 'Interest expense', 20000, { prefix: '$', step: 1000 }),
          f('da', 'Depreciation and amortization', 25000, { prefix: '$', step: 1000 }), f('addb', 'Other add-backs (one-time or personal expenses)', 15000, { prefix: '$', step: 1000, hint: 'Only items you can document' }),
          f('bds', 'Business debt service (existing + proposed)', 110000, { prefix: '$', step: 1000 }),
          f('wage', 'Owner pay taken from the business', 90000, { prefix: '$', step: 1000 }), f('other', 'Other personal income', 40000, { prefix: '$', step: 1000 }),
          f('tax', 'Personal income taxes', 30000, { prefix: '$', step: 1000 }), f('live', 'Living expenses', 60000, { prefix: '$', step: 1000 }),
          f('pds', 'Personal debt payments (mortgage, loans)', 24000, { prefix: '$', step: 1000 })
        ],
        run: function (v) {
          var bcf = v.ni + v.int + v.da + v.addb, bd = LF.dscr(bcf, v.bds), gcf = bcf + v.wage + v.other - v.tax - v.live, gds = v.bds + v.pds, gd = LF.dscr(gcf, gds);
          return {
            head: ['Global DSCR', num(gd, 2) + 'x'],
            rows: [['Business cash flow (adjusted)', money(bcf)], ['Business DSCR', num(bd, 2) + 'x'], ['Global cash flow after taxes and living costs', money(gcf)], ['Total debt service (business + personal)', money(gds)], ['Cushion above debt service', money(gcf - gds)]],
            notes: [gd >= 1.25 ? 'Global DSCR meets the 1.25x level many lenders look for.' : 'Global DSCR is below the 1.25x level many lenders look for.',
              'Add-backs only help if you can document them. Owner pay is added back in the global view because it is also personal income.', 'Lender methods differ; some use a different treatment of taxes and living expenses.'],
            charts: [CH.gauge('Global DSCR', gd)]
          };
        }
      };
    },

    affordloan: function () {
      return {
        title: 'How much business loan can I afford? (from your P&L)',
        fields: [
          f('ni', 'Net income', 120000, { prefix: '$', step: 1000 }), f('int', 'Interest expense', 10000, { prefix: '$', step: 1000 }), f('da', 'Depreciation and amortization', 15000, { prefix: '$', step: 1000 }),
          f('addb', 'Documented add-backs', 10000, { prefix: '$', step: 1000 }), f('exist', 'Existing yearly debt payments', 36000, { prefix: '$', step: 1000, hint: 'Principal and interest on loans you already have' }),
          f('dscr', 'Coverage lenders want', 1.25, { suffix: 'x', step: 0.05 }), f('rate', 'Interest rate', livePrime ? livePrime + 2.75 : 9.75, { suffix: '%', step: 0.05, hint: 'Example rate; use your lender\'s quote' }), f('years', 'Term', 10, { suffix: 'years', step: 1 })
        ],
        run: function (v) {
          var cf = v.ni + v.int + v.da + v.addb, room = function (d) { return Math.max(0, cf / d - v.exist); }, ds = room(v.dscr), loan = LF.maxLoan(ds, v.rate, v.years);
          var rows = [['Cash flow before debt payments', money(cf)], ['Yearly payment room for a new loan', money(ds)], ['Monthly payment at that size', money(ds / 12, 2)]];
          [1.15, 1.35, 1.5].forEach(function (d) { rows.push(['Largest loan at ' + num(d, 2) + 'x coverage', money(LF.maxLoan(room(d), v.rate, v.years))]); });
          return {
            head: ['Largest loan at ' + num(v.dscr, 2) + 'x', money(loan)], rows: rows,
            notes: ['Cash flow = net income + interest + depreciation and amortization + add-backs. Existing debt payments reduce how much room is left.', 'Lenders also weigh collateral, credit and your industry, so treat this as a ceiling to discuss, not an approval.'],
            charts: [CH.stack('Cash flow split at the target coverage', [{ label: 'Existing debt', value: Math.min(v.exist, cf / v.dscr) }, { label: 'Room for new loan', value: ds }, { label: 'Cushion', value: Math.max(0, cf - cf / v.dscr) }])]
          };
        }
      };
    },

    prepay: function () {
      return {
        title: 'Prepayment penalty estimator',
        fields: [
          sel('mode', 'Loan type', 'sba7a', [['sba7a', 'SBA 7(a) (SBA rule)'], ['custom', 'Other loan (enter the penalty %)']]),
          f('balance', 'Current balance', 400000, { prefix: '$', step: 5000 }), f('pay', 'Amount you want to prepay', 150000, { prefix: '$', step: 5000 }),
          f('mat', 'Original loan term', 25, { suffix: 'years', step: 1 }), f('yr', 'Year of the loan you prepay in', 2, { step: 1, hint: '1 = first 12 months' }),
          f('cust', 'Penalty for other loans', 3, { suffix: '% of amount prepaid', step: 0.5 }), f('rate', 'Interest rate', 9.5, { suffix: '%', step: 0.05 }), f('left', 'Years left before prepaying', 24, { suffix: 'years', step: 1 })
        ],
        run: function (v) {
          var s = LF.sba7aPrepayFee(v.pay, v.balance, v.mat, v.yr), fee = v.mode === 'sba7a' ? s.fee : v.pay * v.cust / 100, q = LF.policy.sba7a.prepayment;
          var pmt = LF.pmt(v.balance, v.rate, v.left), m0 = Math.round(v.left * 12), m1 = LF.monthsToPayOff(Math.max(0, v.balance - v.pay), v.rate, pmt);
          var saved = isFinite(m1) ? pmt * m0 - pmt * Math.min(m1, m0) - v.pay : 0, notes = [];
          if (v.mode === 'sba7a') notes.push(s.applies ? 'The SBA rule applies: the loan term is ' + q.minMaturityYears + ' years or more, you prepay within the first ' + q.windowYears + ' years, and the prepayment is ' + q.thresholdPctOfBalance + '% or more of the balance. The fee is ' + q.pctOfAmountPrepaidByYear.join('%, ') + '% of the amount prepaid in years 1, 2 and 3.' :
            'The SBA fee does not apply here: it needs a term of ' + q.minMaturityYears + '+ years, a prepayment in the first ' + q.windowYears + ' years, and at least ' + q.thresholdPctOfBalance + '% of the balance prepaid. Your note may still have its own terms.');
          notes.push('Interest saved assumes you keep the same payment and finish early. Check your note for the actual prepayment terms.');
          return {
            head: ['Estimated prepayment fee', money(fee, 2)],
            rows: [['Prepayment as a share of the balance', num(v.balance ? v.pay / v.balance * 100 : 0, 1) + '%'], ['Fee as a share of the amount prepaid', num(v.pay ? fee / v.pay * 100 : 0, 1) + '%'],
              ['Interest saved by finishing early', money(Math.max(0, saved))], ['Savings after the fee', money(saved - fee)], ['Months left after prepaying', isFinite(m1) ? num(Math.min(m1, m0), 0) : 'n/a']],
            notes: notes
          };
        }
      };
    },

    sde: function () {
      return {
        title: 'Business valuation from seller discretionary earnings (SDE)',
        fields: [
          f('ni', 'Net profit', 110000, { prefix: '$', step: 1000 }), f('sal', 'Owner salary', 70000, { prefix: '$', step: 1000 }), f('perk', 'Owner perks run through the business', 12000, { prefix: '$', step: 500 }),
          f('int', 'Interest expense', 8000, { prefix: '$', step: 500 }), f('da', 'Depreciation and amortization', 14000, { prefix: '$', step: 500 }), f('one', 'One-time expenses', 6000, { prefix: '$', step: 500, hint: 'Documented, non-recurring only' }),
          f('lo', 'Low multiple', 2, { suffix: 'x SDE', step: 0.1, hint: 'Illustrative. Use multiples from comparable sales' }), f('mid', 'Middle multiple', 2.5, { suffix: 'x SDE', step: 0.1 }), f('hi', 'High multiple', 3, { suffix: 'x SDE', step: 0.1 })
        ],
        run: function (v) {
          var sde = v.ni + v.sal + v.perk + v.int + v.da + v.one;
          return {
            head: ['Seller discretionary earnings', money(sde)],
            rows: [['Value at ' + num(v.lo, 1) + 'x', money(sde * v.lo)], ['Value at ' + num(v.mid, 1) + 'x', money(sde * v.mid)], ['Value at ' + num(v.hi, 1) + 'x', money(sde * v.hi)], ['Add-backs on top of net profit', money(sde - v.ni)]],
            notes: ['SDE = net profit + owner salary + owner perks + interest + depreciation and amortization + one-time expenses. It shows what one owner-operator earns before paying themselves.', 'Multiples vary by industry, size and risk. The defaults are placeholders, not market data. A lender will test the price against cash flow after a market salary for the operator.'],
            charts: [CH.stack('Where SDE comes from', [{ label: 'Net profit', value: Math.max(0, v.ni) }, { label: 'Owner salary and perks', value: v.sal + v.perk }, { label: 'Interest, D&A, one-time', value: v.int + v.da + v.one }])]
          };
        }
      };
    },
  };

  /* Thousands separators: "1234567.5" -> "1,234,567.5" (digits and one decimal point only). */
  function commas(v) {
    var t = String(v).replace(/[^0-9.]/g, ''), i = t.indexOf('.');
    if (i >= 0) t = t.slice(0, i + 1) + t.slice(i + 1).replace(/\./g, '');
    var parts = t.split('.');
    parts[0] = parts[0].replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }
  function parseNum(str) { return parseFloat(String(str).replace(/,/g, '')); }


  /* Plain-English explanations for jargon inputs. First label match wins. A "?" button opens the card next to the label.
     Policy numbers come from LF.policy (data/sba-policy.json) so they update with it. */
  var GLOSS = [
    [/main use of proceeds/i, 'Use of proceeds', function () { return 'What the loan money will be spent on. The use sets the maximum term (real estate loans can run longer than working capital or equipment loans), and the SBA only allows eligible uses.'; }],
    [/^annual fee$/i, 'Annual fee', function () { return 'A yearly fee some lines of credit charge whether or not you borrow. It adds to the true cost of the line.'; }],
    [/months of use/i, 'Months of use', function () { return 'How many months you expect to keep the line in use. Fees and interest are added up over this period.'; }],
    [/net operating income/i, 'Net operating income (NOI)', function () { return 'Income left after the business pays its everyday operating costs, but before loan payments, income taxes and usually depreciation. Lenders compare it to your yearly loan payments to see whether the business can carry the debt.'; }],
    [/debt service|existing yearly debt/i, 'Debt service', function () { return 'The total principal and interest you pay on loans in a year. It is the figure lenders set your cash flow against. Include the new loan and any loans you already have.'; }],
    [/other monthly debt|personal debt payments/i, 'Monthly debt payments', function () { return 'The minimum payments you owe each period on loans and cards, such as a car loan, student loan or mortgage. Lenders count them when judging how much more debt you can carry.'; }],
    [/coverage lenders want|^DSCR/i, 'DSCR (debt service coverage ratio)', function () { return 'Cash flow divided by yearly debt payments. A DSCR of 1.25x means the business earns $1.25 for every $1.00 of loan payments. Many lenders look for 1.25x or more; the exact level depends on the lender and loan.'; }],
    [/depreciation and amortization/i, 'Depreciation and amortization (D&A)', function () { return 'Accounting costs that spread the price of equipment or other long-lived assets over several years. They lower reported profit but are not cash leaving the business, so lenders usually add them back when measuring cash flow.'; }],
    [/interest expense/i, 'Interest expense', function () { return 'Interest the business paid on its existing debt. It is added back to profit when measuring cash flow available for debt, because loan payments are counted separately.'; }],
    [/add-backs/i, 'Add-backs', function () { return 'Expenses that lowered reported profit but will not continue, or are personal to the owner, such as a one-time legal bill or a personal vehicle. Lenders and buyers accept only add-backs you can document.'; }],
    [/one-time expenses/i, 'One-time expenses', function () { return 'Costs unlikely to happen again, such as a lawsuit settlement or a move. Count only documented, non-recurring items; routine costs that merely look unusual do not qualify.'; }],
    [/owner perks/i, 'Owner perks', function () { return 'Personal benefits the owner runs through the business, such as a vehicle, phone or travel. A buyer would not necessarily keep paying them, so they are added back to find the true earnings.'; }],
    [/owner (salary|pay)/i, 'Owner pay', function () { return 'The salary the owner takes from the business. In seller-discretionary-earnings it is added back; in a global DSCR it is counted as personal income because it pays the owner’s household.'; }],
    [/market salary/i, 'Market salary for the operator', function () { return 'What it would cost to hire someone to run the business in your place. Lenders subtract it from the earnings so the business still covers the loan after paying a fair wage.'; }],
    [/discretionary|\bSDE\b/i, 'SDE (seller discretionary earnings)', function () { return 'Net profit plus the owner’s salary and perks, interest, depreciation and amortization, and documented one-time costs. It shows what one owner-operator earns from the business before paying themselves. Small business prices are usually quoted as a multiple of SDE.'; }],
    [/multiple/i, 'Valuation multiple', function () { return 'A number you multiply by SDE to estimate a price (price = SDE x multiple). Multiples vary by industry, size and risk, so use multiples from comparable sales rather than a rule of thumb. The defaults here are placeholders.'; }],
    [/equity injection|your equity|available down payment/i, 'Equity injection', function () { return 'Your own cash put into the deal. For an SBA change-of-ownership purchase the minimum is ' + LF.policy.sba7a.equityInjectionMinPct + '% of the project; your lender may require more.'; }],
    [/^SBA guarantee$/i, 'SBA guarantee', function () { var g = LF.policy.sba7a.guaranty; return 'The share of the loan the SBA promises to repay the lender if you default: ' + g.smallLoanPct + '% on standard 7(a) loans up to $' + g.smallLoanMax.toLocaleString('en-US') + ' and ' + g.largeLoanPct + '% above that (Express loans are ' + LF.policy.express.guarantyPct + '%). You still owe the whole loan.'; }],
    [/guarantee fee|roll the fee/i, 'Upfront guarantee fee', function () { return 'A one-time fee charged on the SBA-guaranteed part of the loan. The lender pays it to the SBA and usually passes it to you. Rolling it into the loan avoids cash at closing, but you pay interest on it.'; }],
    [/fee waiver|manufacturer, food supply/i, 'Fee waiver', function () { return 'The SBA waives the upfront fee on qualifying 7(a) loans of $' + LF.policy.sba7a.upfrontFee.waiver.maxLoan.toLocaleString('en-US') + ' or less for certain borrowers, such as manufacturers, listed food-supply-chain businesses and rural businesses. Ask your lender whether you qualify.'; }],
    [/base \(prime\)/i, 'Base (prime) rate', function () { return 'The benchmark rate that variable-rate loans are priced from. Your rate is the base rate plus the lender’s spread, so it moves when prime moves.'; }],
    [/spread/i, 'Spread', function () { return 'Percentage points the lender adds to the base rate. Your rate = base rate + spread. For variable-rate SBA 7(a) loans the SBA caps the maximum spread by loan size.'; }],
    [/^amortization$/i, 'Amortization', function () { return 'The schedule length used to figure the monthly payment, for example 25 years. It can be longer than the loan term, which leaves a balloon payment due at the end of the term.'; }],
    [/^loan term$/i, 'Loan term', function () { return 'How long until the loan comes due. If the term is shorter than the amortization, the unpaid balance (a balloon) is due when the term ends, and you must pay it or refinance.'; }],
    [/lease rate/i, 'Lease rate', function () { return 'The financing cost built into lease payments, shown as a yearly rate. Leases often state a payment but not a rate, so ask the lessor for the implied rate.'; }],
    [/value of the equipment at the end|residual/i, 'Residual value', function () { return 'What the equipment is expected to be worth at the end of the term. With a loan you own it; with many leases you return it or pay to buy it.'; }],
    [/credit profile/i, 'Credit profile', function () { return 'A rough tier based on credit scores and history. Better credit usually means a lower rate. These tiers are planning estimates, not lender quotes.'; }],
    [/special-purpose/i, 'Special-purpose property', function () { return 'A building suited to one use, such as a hotel, car wash or medical facility, that is hard to repurpose. SBA 504 lenders ask for ' + LF.policy.sba504.specialPurposeExtraPct + ' extra points of equity on these.'; }],
    [/new business/i, 'New business', function () { return 'A business under two years old. SBA 504 asks for ' + LF.policy.sba504.newBusinessExtraPct + ' extra points of equity from new businesses.'; }],
    [/total project cost/i, 'Total project cost', function () { return 'The all-in cost of the project: purchase or construction, equipment and related costs. The 504 structure splits it among the bank, the CDC and you.'; }],
    [/cdc debenture/i, 'CDC debenture', function () { return 'The SBA-backed loan from a Certified Development Company, up to 40% of an SBA 504 project. Its rate is fixed for the full term once the debenture is sold.'; }],
    [/bank loan rate/i, 'Bank first-lien loan', function () { return 'In an SBA 504 project the bank lends about ' + LF.policy.sba504.bankPct + '% and holds the first claim on the property (first lien).'; }],
    [/working capital reserve|working capital/i, 'Working capital', function () { return 'Money for day-to-day operations, such as inventory, payroll and receivables, rather than for buying a building or equipment.'; }],
    [/seller note/i, 'Seller note', function () { return 'Part of the price the seller finances and you repay to the seller over time. Lenders may require it to be on standby and may limit how it counts toward your equity.'; }],
    [/lender \/ packaging fee/i, 'Lender or packaging fee', function () { return 'A fee for preparing and processing the loan application, charged by the lender or a packager.'; }],
    [/appraisal, environmental/i, 'Third-party reports', function () { return 'Independent reports lenders order before closing, such as a property appraisal, an environmental review and a business valuation.'; }],
    [/legal and title/i, 'Legal and title', function () { return 'Attorney fees plus title insurance, which protects against defects in who owns the property.'; }],
    [/prepaid insurance/i, 'Prepaid items', function () { return 'Insurance and escrow deposits paid at closing ahead of time, so the lender can pay those bills for you later.'; }],
    [/^closing costs/i, 'Closing costs', function () { return 'Fees and expenses due when the loan closes: lender and packaging fees, title, appraisal, legal and similar items.'; }],
    [/pmi rate/i, 'PMI (private mortgage insurance)', function () { return 'Insurance you pay on a conventional mortgage when you put down less than 20%. It protects the lender, not you, and usually ends once you reach about 20% equity.'; }],
    [/property tax|homeowner|^insurance$/i, 'Taxes and insurance (PITI)', function () { return 'Property tax and homeowner’s insurance are usually collected monthly with your loan payment and held in escrow. Together with principal and interest they make up PITI.'; }],
    [/credit limit/i, 'Credit limit', function () { return 'The most you can borrow on the line at one time. You pay interest only on the amount you have actually drawn.'; }],
    [/average amount drawn/i, 'Average amount drawn', function () { return 'The typical balance you carry on the line over the year. Interest is charged on this amount, not on the full limit.'; }],
    [/factor rate/i, 'Factor rate', function () { return 'A flat multiplier, such as 1.35, used by merchant cash advances. You repay the advance times the factor. It is not an annual rate: because you repay a little each payment, the true annual cost is much higher.'; }],
    [/advance amount/i, 'Advance amount', function () { return 'The money you receive up front from a merchant cash advance, which is repaid from your daily or weekly receipts or payments.'; }],
    [/fees taken from the advance/i, 'Fees taken from the advance', function () { return 'Fees deducted when you are funded. You receive less cash than the advance but still repay the full payback amount.'; }],
    [/penalty for other loans|prepay/i, 'Prepayment penalty', function () { return 'A fee some loans charge when you pay off part or all of the balance early, usually a percentage of the amount prepaid. Check your note for its terms.'; }],
    [/cash due at the start/i, 'Cash due at the start', function () { return 'What you pay when you sign: a down payment or, for a lease, the first payment, fees and any deposit.'; }],
    [/net profit|^net income/i, 'Net profit (net income)', function () { return 'Profit after all expenses on the income statement (P&L). Take it from your tax return or your accountant’s statement for the period.'; }],
    [/personal income taxes/i, 'Personal income taxes', function () { return 'The income taxes you pay personally on the business and other income. A global cash-flow analysis subtracts them before measuring coverage.'; }],
    [/living expenses/i, 'Living expenses', function () { return 'Your household’s everyday costs. Lenders subtract an amount for them in a global cash-flow analysis because that money is not available for loan payments.'; }],
    [/other personal income/i, 'Other personal income', function () { return 'Income from outside the business, such as a spouse’s wages, rent or investment income, if you can document it.'; }]
  ];
  function glossFor(label) {
    for (var i = 0; i < GLOSS.length; i++) if (GLOSS[i][0].test(label)) return { term: GLOSS[i][1], text: GLOSS[i][2]() };
    return null;
  }


  function labelHtml(fd, id) {
    var g = fd.help ? { term: fd.label, text: fd.help } : glossFor(fd.label), lab = '<label for="' + id + '">' + esc(fd.label) + '</label>';
    if (!g) return lab;
    return '<div class="lf-labelrow">' + lab + '<button type="button" class="lf-help" aria-expanded="false" aria-controls="' + id + '-help" aria-label="What is ' + esc(g.term) + '?">?</button></div>' +
      '<div class="lf-help-card" id="' + id + '-help" role="region" aria-label="' + esc(g.term) + '" hidden><strong>' + esc(g.term) + '</strong><p>' + esc(g.text) + '</p></div>';
  }
  /* One document-level handler: open/close help cards, close on outside click or Escape. */
  if (!window.__lfHelpBound) {
    window.__lfHelpBound = true;
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.lf-help'), open = document.querySelectorAll('.lf-help[aria-expanded="true"]');
      [].forEach.call(open, function (x) { if (x !== b) { x.setAttribute('aria-expanded', 'false'); document.getElementById(x.getAttribute('aria-controls')).hidden = true; } });
      if (b) { var card = document.getElementById(b.getAttribute('aria-controls')), on = b.getAttribute('aria-expanded') !== 'true'; b.setAttribute('aria-expanded', on ? 'true' : 'false'); card.hidden = !on; }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      [].forEach.call(document.querySelectorAll('.lf-help[aria-expanded="true"]'), function (x) { x.setAttribute('aria-expanded', 'false'); document.getElementById(x.getAttribute('aria-controls')).hidden = true; x.focus(); });
    });
  }

  function fieldHtml(fd, uid) {
    var id = uid + '-' + fd.id, inner;
    if (fd.type === 'select') {
      inner = '<select id="' + id + '" data-f="' + fd.id + '">' + fd.options.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === fd.value ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
      return '<div class="lf-field">' + labelHtml(fd, id) + '<div class="lf-input lf-select">' + inner + '</div></div>';
    }
    inner = (fd.prefix ? '<span class="lf-affix">' + esc(fd.prefix) + '</span>' : '') +
      '<input id="' + id + '" data-f="' + fd.id + '" type="text" inputmode="decimal" autocomplete="off" data-max="' + (fd.max || '') + '" value="' + commas(fd.value) + '">' +
      (fd.suffix ? '<span class="lf-affix">' + esc(fd.suffix) + '</span>' : '');
    return '<div class="lf-field">' + labelHtml(fd, id) + '<div class="lf-input">' + inner + '</div>' + (fd.hint || fd.live ? '<small' + (fd.live ? ' data-live-note="' + (fd.live === true ? 'prime' : fd.live) + '"' : '') + '>' + esc(fd.hint || '') + '</small>' : '') + '</div>';
  }

  var seq = 0;
  function schedHtml(o) {
    if (!(o.amount > 0) || !(o.years > 0)) return '';
    var s = LF.schedule(o.amount, o.rate, o.years, o.extra, o.balloonYears);
    var head = '<thead><tr><th>#</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead>';
    var row = function (a, label) { return '<tr><td>' + label + '</td><td>' + money(a.payment) + '</td><td>' + money(a.principal) + '</td><td>' + money(a.interest) + '</td><td>' + money(a.balance) + '</td></tr>'; };
    var yr = s.yearly.map(function (a) { return row(a, a.year); }).join('');
    var mo = s.months.map(function (a) { return row(a, a.m); }).join('');
    var foot = s.balloon > 0 ? '<p class="lf-figcap">Balloon: ' + money(s.balloon) + ' is still owed when the ' + o.balloonYears + '-year term ends.</p>' : '';
    return '<details class="lf-sched"><summary>Amortization schedule (year by year)</summary><div class="lf-sched-wrap"><table class="lf-table lf-sched-t">' +
      '<caption>Year totals. Interest over the schedule: ' + money(s.totalInterest) + '</caption>' + head.replace('<th>#', '<th>Year') + '<tbody>' + yr + '</tbody></table></div>' + foot +
      '<details class="lf-sched-m"><summary>Month by month</summary><div class="lf-sched-wrap"><table class="lf-table lf-sched-t">' + head.replace('<th>#', '<th>Month') + '<tbody>' + mo + '</tbody></table></div></details></details>';
  }

  function mount(el) {
    var kind = el.getAttribute('data-calc'), make = CALCS[kind];
    if (!make) return;
    var spec = make(el.dataset), uid = 'lf' + (++seq), touched = {};
    el.classList.add('lf-calc');
    el.innerHTML = '<h3 class="lf-title">' + esc(el.dataset.title || spec.title) + '</h3><div class="lf-grid">' + spec.fields.map(function (fd) { return fieldHtml(fd, uid); }).join('') +
      '</div><div class="lf-result"></div>';
    var out = el.querySelector('.lf-result');
    function read() {
      var v = {};
      spec.fields.forEach(function (fd) {
        var node = el.querySelector('[data-f="' + fd.id + '"]');
        v[fd.id] = fd.type === 'select' ? node.value : (isFinite(parseNum(node.value)) ? Math.min(Math.max(fd.min || 0, parseNum(node.value)), +node.dataset.max || 1e12) : (fd.min || 0));
      });
      return v;
    }
    function draw() {
      var r = spec.run(read());
      out.innerHTML = '<div class="lf-head" role="status"><span>' + esc(r.head[0]) + '</span><strong>' + esc(r.head[1]) + '</strong></div>' +
        (r.charts && r.charts.filter(Boolean).length ? '<div class="lf-charts">' + r.charts.join('') + '</div>' : '') +
        '<dl class="lf-rows">' + r.rows.map(function (x) { return '<div><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></div>'; }).join('') + '</dl>' +
        (r.notes && r.notes.length ? '<ul class="lf-notes">' + r.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' : '') +
        (r.sched ? schedHtml(r.sched) : '');
      if (/NaN|Infinity|\u221e/.test(out.textContent)) out.innerHTML = '<p class="lf-notes" role="status">Enter an amount and a term greater than zero to see results.</p>';
    }
    el.addEventListener('input', function (e) {
      var t = e.target;
      if (t.dataset && t.dataset.f) {
        touched[t.dataset.f] = true;
        if (t.tagName === 'INPUT') {
          var pos = t.selectionStart, before = t.value.slice(0, pos).replace(/[^0-9.]/g, '').length, f = commas(t.value);
          if (f !== t.value) {
            t.value = f;
            for (pos = 0; pos < f.length && before > 0; pos++) if (/[0-9.]/.test(f[pos])) before--;
            if (t.setSelectionRange) t.setSelectionRange(pos, pos);
          }
        }
      }
      draw();
    });
    el.addEventListener('change', draw);
    draw();
    el._lfSyncPrime = function () {
      spec.fields.forEach(function (fd) {
        if (!fd.live) return;
        var kind = fd.live === true ? 'prime' : fd.live, val = kind === 'prime' ? livePrime : livePmms30, node = el.querySelector('[data-f="' + fd.id + '"]');
        if (val && !touched[fd.id]) node.value = commas(val);
        var note = el.querySelector('[data-live-note="' + kind + '"]');
        if (note && liveNote[kind] && val) note.textContent = liveNote[kind];
      });
      draw();
    };
  }

  function start() {
    var nodes = [].slice.call(document.querySelectorAll('[data-calc]'));
    nodes.forEach(mount);
    fetch('/data/market-news.json').then(function (r) { return r.json(); }).then(function (d) {
      var p = d && d.prime && d.prime.value;
      var c = (d && d.rates && d.rates.cells || []).filter(function (x) { return x.label === '30-Yr Fixed'; })[0], m = c ? parseFloat(c.value) : 0;
      if (p > 0 && p < 30) { livePrime = p; liveNote.prime = 'Latest prime rate (FRED DPRIME, ' + (d.prime.asOf || '') + '). Edit to use your own.'; }
      if (m > 0 && m < 30) { livePmms30 = m; liveNote.pmms30 = 'Latest Freddie Mac 30-year average (' + (d.rates.asOf || '') + '). Replace it with your quote.'; }
      if (livePrime || livePmms30) nodes.forEach(function (n) { if (n._lfSyncPrime) n._lfSyncPrime(); });
    }).catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
