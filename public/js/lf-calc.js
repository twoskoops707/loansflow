/* LoansFlow embeddable calculators. Usage: <div data-calc="sba7a" data-title="..."></div>. Math lives in lf-math.js. */
(function () {
  'use strict';
  var LF = window.LF;
  var money = function (n, d) { return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
  var num = function (n, d) { return n.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };
  var livePrime = null;

  function f(id, label, value, o) { return Object.assign({ id: id, label: label, value: value, type: 'number', step: 1 }, o || {}); }
  function sel(id, label, value, options) { return { id: id, label: label, value: value, type: 'select', options: options }; }
  var YN = [['no', 'No'], ['yes', 'Yes']];

  var CALCS = {
    payment: function (d) {
      return {
        title: 'Loan payment calculator',
        fields: [
          f('amount', 'Loan amount', +d.amount || 100000, { prefix: '$', step: 1000, max: +d.maxAmount || 0 }),
          f('rate', 'Interest rate', +d.rate || 9, { suffix: '%', step: 0.05 }),
          f('years', 'Term', +d.years || 10, { suffix: 'years', step: 1, max: +d.maxYears || 40 }),
          f('noi', 'Annual net operating income (optional)', +d.noi || 0, { prefix: '$', step: 1000 })
        ],
        run: function (v) {
          var t = LF.termLoan(v.amount, v.rate, v.years), rows = [['Total interest', money(t.interest)], ['Total repaid', money(t.total)]], notes = [];
          if (v.noi > 0) {
            var ds = t.payment * 12, c = LF.dscr(v.noi, ds);
            rows.push(['Annual debt service', money(ds)], ['Debt service coverage (DSCR)', num(c, 2) + 'x']);
            notes.push(c >= 1.25 ? 'DSCR meets the 1.25x level many lenders look for.' : 'DSCR is below the 1.25x level many lenders look for.');
          }
          if (+d.maxAmount && v.amount > +d.maxAmount) notes.push('This program caps loans at ' + money(+d.maxAmount) + '.');
          if (+d.maxYears && v.years > +d.maxYears) notes.push('This program caps terms at ' + d.maxYears + ' years.');
          return { head: ['Monthly payment', money(t.payment, 2)], rows: rows, notes: notes };
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
            rows: [['Interest rate', num(rate, 2) + '%'], ['SBA-guaranteed portion (' + guar + '%)', money(fee.guaranteed)], ['Upfront guaranty fee (may be passed to you)', money(fee.fee)],
              ['Total interest over the term', money(pay * v.years * 12 - v.amount)], ['Annual debt service', money(ds)], ['DSCR', num(c, 2) + 'x']],
            notes: notes
          };
        }
      };
    },

    sba504: function () {
      return {
        title: 'SBA 504 loan calculator',
        fields: [
          f('cost', 'Total project cost', 2000000, { prefix: '$', step: 25000 }),
          f('bankRate', 'Bank loan rate (50%)', 7.5, { suffix: '%', step: 0.05 }),
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
              'CDC processing fees, bank fees and closing costs are additional and vary by lender.', c >= 1.25 ? 'DSCR meets the 1.25x level many lenders look for.' : 'DSCR is below the 1.25x level many lenders look for.']
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
            notes: ['Interest is charged only on the amount you have drawn. Rates on most lines are variable and move with prime.']
          };
        }
      };
    },

    equipment: function () {
      return {
        title: 'Equipment financing estimator',
        fields: [
          f('price', 'Equipment price', 120000, { prefix: '$', step: 1000 }),
          f('down', 'Down payment', 12000, { prefix: '$', step: 500 }),
          sel('tier', 'Credit profile', 'good', LF.CREDIT_TIERS.map(function (t) { return [t.id, t.label]; })),
          sel('type', 'Equipment type', 'construction', LF.EQUIPMENT_TYPES.map(function (t) { return [t.id, t.label]; })),
          sel('used', 'Condition', 'new', [['new', 'New'], ['used', 'Used']]),
          f('years', 'Term', 5, { suffix: 'years', step: 1 })
        ],
        run: function (v) {
          var downPct = v.price > 0 ? v.down / v.price * 100 : 0, used = v.used === 'used';
          var est = LF.equipmentRate(v.tier, v.type, used, downPct), fin = Math.max(0, v.price - v.down), t = LF.termLoan(fin, est.rate, v.years), notes = [];
          if (v.years > est.type.maxTerm) notes.push('Lenders usually keep ' + est.type.label.toLowerCase() + ' terms to ' + est.type.maxTerm + ' years or less (typical useful life ' + est.type.life + ').');
          notes.push(est.type.note);
          notes.push('Planning estimate only, not an offer. Real rates also depend on time in business, cash flow, collateral and the lender.');
          var table = '<table class="lf-table"><caption>Estimated rate for ' + esc(est.type.label.toLowerCase()) + ' by credit profile</caption><thead><tr><th>Credit profile</th><th>Planning rate</th><th>Typical lender range</th></tr></thead><tbody>' +
            LF.CREDIT_TIERS.map(function (c) {
              var r = LF.equipmentRate(c.id, v.type, used, downPct).rate;
              return '<tr' + (c.id === v.tier ? ' class="is-selected"' : '') + '><td>' + esc(c.label) + '</td><td>' + num(r, 2) + '%</td><td>' + c.low + '% - ' + c.high + '%</td></tr>';
            }).join('') + '</tbody></table>';
          return {
            head: ['Monthly payment', money(t.payment, 2)],
            rows: [['Estimated rate', num(est.rate, 2) + '%'], ['Amount financed', money(fin)], ['Down payment', num(downPct, 1) + '% of price'], ['Total interest', money(t.interest)], ['Total cost of equipment', money(t.total + v.down)]],
            notes: notes, extra: table
          };
        }
      };
    },

    mortgage: function () {
      return {
        title: 'Mortgage payment calculator',
        fields: [
          f('price', 'Home price', 425000, { prefix: '$', step: 5000 }), f('down', 'Down payment', 85000, { prefix: '$', step: 1000 }),
          f('rate', 'Interest rate', 7.0, { suffix: '%', step: 0.05 }), f('years', 'Term', 30, { suffix: 'years', step: 5 }),
          f('tax', 'Property tax', 1.1, { suffix: '% of price', step: 0.05 }), f('ins', 'Homeowner\'s insurance', 1400, { prefix: '$', suffix: '/yr', step: 50 })
        ],
        run: function (v) {
          var m = LF.mortgage(v.price, v.down, v.rate, v.years, v.tax, v.ins), notes = [];
          if (m.downPct < 20) notes.push('With under 20% down, most conventional loans add private mortgage insurance (PMI), which is not included here.');
          notes.push('Excludes HOA dues and PMI. Rates vary with credit, down payment and lender.');
          return { head: ['Monthly payment (PITI)', money(m.total, 2)], rows: [['Principal and interest', money(m.pi, 2)], ['Property tax', money(m.tax, 2)], ['Insurance', money(m.ins, 2)], ['Loan amount', money(m.loan)], ['Down payment', num(m.downPct, 1) + '%'], ['Total interest over the loan', money(m.interest)]], notes: notes };
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
            notes: ['Compares what you still owe with a new loan on that balance, paying closing costs out of pocket. A longer new term can lower the payment while adding interest.']
          };
        }
      };
    },

    afford: function () {
      return {
        title: 'Home affordability calculator',
        fields: [
          f('income', 'Annual household income', 95000, { prefix: '$', step: 1000 }), f('debts', 'Other monthly debt payments', 450, { prefix: '$', step: 25 }),
          f('down', 'Available down payment', 60000, { prefix: '$', step: 1000 }), f('rate', 'Interest rate', 7.0, { suffix: '%', step: 0.05 }),
          f('tax', 'Property tax', 1.1, { suffix: '% of price', step: 0.05 }), f('ins', 'Insurance', 1400, { prefix: '$', suffix: '/yr', step: 50 })
        ],
        run: function (v) {
          var a = LF.afford(v.income, v.debts, v.down, v.rate, v.tax, v.ins);
          return { head: ['Estimated home price', money(a.price)], rows: [['Monthly housing budget (incl. tax and insurance)', money(a.budget)], ['Loan amount', money(a.loan)], ['Debt-to-income at that budget', num(a.backEndDti, 1) + '%']],
            notes: ['Uses the 28% housing and 36% total-debt guidelines on a 30-year loan. Lenders may allow more or less; PMI and HOA dues are not included.'] };
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
            notes: [c >= 1.25 ? 'Meets the 1.25x level many lenders look for.' : c >= 1 ? 'Covers the payment but with less cushion than many lenders want.' : 'Income does not cover the payment as structured.', max ? '' : ''].filter(Boolean) };
        }
      };
    }
  };

  function fieldHtml(fd, uid) {
    var id = uid + '-' + fd.id, inner;
    if (fd.type === 'select') {
      inner = '<select id="' + id + '" data-f="' + fd.id + '">' + fd.options.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === fd.value ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
      return '<div class="lf-field"><label for="' + id + '">' + esc(fd.label) + '</label><div class="lf-input lf-select">' + inner + '</div></div>';
    }
    inner = (fd.prefix ? '<span class="lf-affix">' + esc(fd.prefix) + '</span>' : '') +
      '<input id="' + id + '" data-f="' + fd.id + '" type="number" inputmode="decimal" min="0"' + (fd.max ? ' max="' + fd.max + '"' : '') + ' step="' + fd.step + '" value="' + fd.value + '">' +
      (fd.suffix ? '<span class="lf-affix">' + esc(fd.suffix) + '</span>' : '');
    return '<div class="lf-field"><label for="' + id + '">' + esc(fd.label) + '</label><div class="lf-input">' + inner + '</div>' + (fd.hint ? '<small>' + esc(fd.hint) + '</small>' : '') + '</div>';
  }

  var seq = 0;
  function mount(el) {
    var kind = el.getAttribute('data-calc'), make = CALCS[kind];
    if (!make) return;
    var spec = make(el.dataset), uid = 'lf' + (++seq), touched = {};
    el.classList.add('lf-calc');
    el.innerHTML = '<h3 class="lf-title">' + esc(el.dataset.title || spec.title) + '</h3><div class="lf-grid">' + spec.fields.map(function (fd) { return fieldHtml(fd, uid); }).join('') +
      '</div><div class="lf-result" aria-live="polite"></div>';
    var out = el.querySelector('.lf-result');
    function read() {
      var v = {};
      spec.fields.forEach(function (fd) {
        var node = el.querySelector('[data-f="' + fd.id + '"]');
        v[fd.id] = fd.type === 'select' ? node.value : (isFinite(parseFloat(node.value)) ? Math.max(0, parseFloat(node.value)) : 0);
      });
      return v;
    }
    function draw() {
      var r = spec.run(read());
      out.innerHTML = '<div class="lf-head"><span>' + esc(r.head[0]) + '</span><strong>' + esc(r.head[1]) + '</strong></div>' +
        '<dl class="lf-rows">' + r.rows.map(function (x) { return '<div><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></div>'; }).join('') + '</dl>' +
        (r.extra || '') + (r.notes && r.notes.length ? '<ul class="lf-notes">' + r.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' : '');
    }
    el.addEventListener('input', function (e) { if (e.target.dataset && e.target.dataset.f) touched[e.target.dataset.f] = true; draw(); });
    el.addEventListener('change', draw);
    draw();
    el._lfSyncPrime = function () {
      spec.fields.forEach(function (fd) {
        if (fd.live && livePrime && !touched[fd.id]) el.querySelector('[data-f="' + fd.id + '"]').value = livePrime;
      });
      draw();
    };
  }

  function start() {
    var nodes = [].slice.call(document.querySelectorAll('[data-calc]'));
    nodes.forEach(mount);
    fetch('/data/market-news.json').then(function (r) { return r.json(); }).then(function (d) {
      var p = d && d.prime && d.prime.value;
      if (p > 0 && p < 30) { livePrime = p; nodes.forEach(function (n) { if (n._lfSyncPrime) n._lfSyncPrime(); }); }
    }).catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
