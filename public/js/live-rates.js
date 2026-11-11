/* Fills elements marked data-live with the latest rates from /data/market-news.json (refreshed daily from FRED and Freddie Mac).
   The HTML ships the last known values, so the page is correct even if this request fails. */
(function () {
  'use strict';
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function fmtIso(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? MONTHS[+m[2] - 1] + ' ' + +m[3] + ', ' + m[1] : ''; }
  function fmtUs(s) { var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s || ''); return m ? MONTHS[+m[1] - 1] + ' ' + +m[2] + ', ' + m[3] : ''; }
  function cell(d, label) { var c = (d.rates && d.rates.cells || []).filter(function (x) { return x.label === label; })[0]; return c ? c.value : ''; }
  var nodes = [].slice.call(document.querySelectorAll('[data-live]'));
  if (!nodes.length) return;
  fetch('/data/market-news.json').then(function (r) { return r.json(); }).then(function (d) {
    var v = {
      prime: d.prime && d.prime.value > 0 && d.prime.value < 30 ? d.prime.value.toFixed(2) + '%' : '',
      'prime-asof': d.prime ? fmtIso(d.prime.asOf) : '',
      m30: cell(d, '30-Yr Fixed'), m15: cell(d, '15-Yr Fixed'),
      'pmms-asof': d.rates ? fmtUs(d.rates.asOf) : ''
    };
    nodes.forEach(function (n) { var t = v[n.getAttribute('data-live')]; if (t) n.textContent = t; });
  }).catch(function () {});
})();
