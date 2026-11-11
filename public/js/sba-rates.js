/* SBA rates page: the HTML ships a dated static prime rate and maximum rates. This refreshes them from the
   daily prime-rate data file when it loads; on any failure the dated static values stay in place. */
(function () {
  'use strict';
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function fmt(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? MONTHS[+m[2] - 1] + ' ' + +m[3] + ', ' + m[1] : ''; }
  document.addEventListener('DOMContentLoaded', function () {
    var box = document.getElementById('sr-prime'); if (!box) return;
    fetch('/data/market-news.json').then(function (r) { return r.json(); }).then(function (d) {
      var p = d && d.prime && d.prime.value;
      if (!(p > 0 && p < 30)) return;
      box.textContent = p.toFixed(2) + '%';
      var asof = document.getElementById('sr-asof'); if (asof && fmt(d.prime.asOf)) asof.textContent = fmt(d.prime.asOf);
      [].forEach.call(document.querySelectorAll('[data-spread]'), function (tr) {
        var s = parseFloat(tr.getAttribute('data-spread')), cell = tr.querySelector('.sr-max'); if (cell) cell.textContent = (p + s).toFixed(2) + '%';
      });
    }).catch(function () { /* keep static dated values */ });
  });
})();
