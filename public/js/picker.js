/* Homepage: loan finder, live rates strip, rotating old-timer's tidbit. No dependencies. */
(function () {
  'use strict';
  var LOANS = window.LF_LOANS || [];
  var AMOUNTS = { u50: 25000, mid: 200000, large: 1500000, xl: 8000000 };
  var PURPOSE_LABEL = {
    'buy-property': 'buying or building a commercial building', equipment: 'buying equipment or vehicles', 'cash-flow': 'covering cash flow',
    'start-buy': 'starting or buying a business', refi: 'refinancing business debt', home: 'buying a home', 'refi-home': 'refinancing a home'
  };

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  function score(loan, purpose, amount) {
    var s = 0;
    if (loan.purposes.indexOf(purpose) > -1) s += 2;
    else return 0;
    if (amount >= loan.min && amount <= loan.max) s += 1;
    return s;
  }

  function card(loan, why) {
    var a = el('a', 'lf-card' + (why ? ' is-pick' : ''));
    a.href = '/loans/' + loan.slug + '.html';
    a.appendChild(el('h3', null, loan.name));
    a.appendChild(el('p', 'lf-for', loan.short));
    var chips = el('div', 'lf-facts');
    loan.chips.forEach(function (c) { chips.appendChild(el('span', 'lf-chip', c)); });
    a.appendChild(chips);
    if (why) a.appendChild(el('span', 'lf-why', why));
    a.appendChild(el('span', 'lf-go', 'Learn, calculate and apply →'));
    return a;
  }

  function runFinder() {
    var purpose = document.getElementById('f-purpose').value;
    var amountKey = document.getElementById('f-amount').value;
    var out = document.getElementById('lf-picks');
    out.textContent = '';
    if (!purpose) { out.hidden = true; return; }
    var amount = AMOUNTS[amountKey] || 200000;
    var ranked = LOANS.map(function (l) { return { l: l, s: score(l, purpose, amount) }; })
      .filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s; });
    out.hidden = false;
    out.appendChild(el('h2', null, ranked.length ? 'Good places to start for ' + PURPOSE_LABEL[purpose] : 'No close match. Browse all loan types below.'));
    var grid = el('div', 'lf-grid-cards');
    ranked.slice(0, 4).forEach(function (x, i) {
      var why = x.s >= 3 ? (i === 0 ? 'Best fit for your purpose and amount' : 'Fits your purpose and amount') : 'Fits your purpose; check the loan size limits';
      grid.appendChild(card(x.l, why));
    });
    out.appendChild(grid);
  }

  function rates() {
    var box = document.getElementById('lf-rates');
    if (!box) return;
    fetch('/data/market-news.json').then(function (r) { return r.json(); }).then(function (d) {
      var cells = (d.rates && d.rates.cells) || [];
      box.textContent = '';
      cells.forEach(function (c) {
        var s = el('span', null, c.label); s.appendChild(el('b', null, c.value)); box.appendChild(s);
      });
      if (d.prime && d.prime.value > 0 && d.prime.value < 30) { var p = el('span', null, 'Prime rate'); p.appendChild(el('b', null, d.prime.value.toFixed(2) + '%')); box.appendChild(p); }
      var note = el('small', null, (d.rates && d.rates.source ? d.rates.source + ', as of ' + d.rates.asOf + '. ' : '') + 'National averages, not a rate quote.');
      box.appendChild(note);
    }).catch(function () { box.hidden = true; });
  }

  function tidbit() {
    var box = document.getElementById('lf-rot');
    if (!box) return;
    fetch('/data/wisdom.json').then(function (r) { return r.json(); }).then(function (list) {
      if (!list.length) return;
      var t = list[Math.floor(Math.random() * list.length)];
      box.textContent = '';
      box.appendChild(el('q', null, t.text));
      var cite = el('cite', null, t.who + (t.where ? ', ' + t.where : ''));
      box.appendChild(cite);
    }).catch(function () {});
  }

  document.addEventListener('DOMContentLoaded', function () {
    var p = document.getElementById('f-purpose'), a = document.getElementById('f-amount');
    if (p && a) { p.addEventListener('change', runFinder); a.addEventListener('change', runFinder); }
    rates(); tidbit();
  });
})();
