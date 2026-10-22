/* SBA rates page: fills the maximum variable-rate table from the daily prime-rate data file. */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var box = document.getElementById('sr-prime'); if (!box) return;
    fetch('/data/market-news.json').then(function (r) { return r.json(); }).then(function (d) {
      var p = d && d.prime && d.prime.value;
      if (!(p > 0 && p < 30)) throw new Error('no prime');
      box.textContent = p.toFixed(2) + '%';
      var asof = document.getElementById('sr-asof'); if (asof) asof.textContent = d.prime.asOf || '';
      [].forEach.call(document.querySelectorAll('[data-spread]'), function (tr) {
        var s = parseFloat(tr.getAttribute('data-spread')), cell = tr.querySelector('.sr-max'); if (cell) cell.textContent = (p + s).toFixed(2) + '%';
      });
    }).catch(function () {
      box.textContent = 'not available right now';
      [].forEach.call(document.querySelectorAll('.sr-max'), function (c) { c.textContent = 'prime + spread'; });
    });
  });
})();
