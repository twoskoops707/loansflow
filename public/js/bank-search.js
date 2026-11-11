/* FDIC-insured bank search. Usage: <div data-lf-banks></div>. Data: FDIC BankFind Suite public API (no key). */
(function () {
  'use strict';
  var el = document.querySelector('[data-lf-banks]'); if (!el) return;
  var STATES = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY PR GU VI'.split(' ');
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function assets(k) { var n = +k * 1000; return n >= 1e9 ? '$' + (n / 1e9).toFixed(1) + ' billion' : '$' + Math.round(n / 1e6).toLocaleString('en-US') + ' million'; }
  function site(u) { if (!u) return ''; u = String(u).trim(); if (!/^https?:\/\//i.test(u)) u = 'https://' + u; return /^https:\/\/[^\s"<>]+$/i.test(u) ? u : ''; }
  el.className = 'lf-banks';
  el.innerHTML = '<h3>Find FDIC-insured banks in your area</h3><p>Many SBA loans are made by community and regional banks. Pick a state (and optionally a city) to see banks, largest first. This is a directory of banks, not a recommendation, and not every bank makes SBA loans, so ask each one.</p>' +
    '<form novalidate><label for="lfb-state">State</label><select id="lfb-state">' + STATES.map(function (s) { return '<option' + (s === 'CA' ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>' +
    '<label for="lfb-city">City (optional)</label><input id="lfb-city" type="text" autocomplete="off" placeholder="e.g. Eureka"><button class="lf-btn" type="submit">Search banks</button></form>' +
    '<div class="lfb-out" role="status" aria-live="polite"></div><p class="lfb-fine">Source: <a href="https://banks.data.fdic.gov/" target="_blank" rel="noopener noreferrer">FDIC BankFind</a>. Your state and city are sent to the FDIC to run the search.</p>';
  var form = el.querySelector('form'), out = el.querySelector('.lfb-out');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var st = form.querySelector('#lfb-state').value, city = form.querySelector('#lfb-city').value.trim().replace(/[^A-Za-z .'-]/g, '').toLowerCase().replace(/(^|[\s.'-])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); });
    var f = 'STALP:' + st + ' AND ACTIVE:1' + (city ? ' AND CITY:"' + city + '"' : '');
    var url = 'https://api.fdic.gov/banks/institutions?filters=' + encodeURIComponent(f) + '&fields=' + encodeURIComponent('NAME,CITY,STALP,ASSET,WEBADDR') + '&sort_by=ASSET&sort_order=DESC&limit=15';
    out.textContent = 'Searching...';
    fetch(url).then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); }).then(function (d) {
      var rows = (d.data || []).map(function (x) { return x.data; });
      if (!rows.length) { out.textContent = 'No banks found. Check the spelling of the city, or leave it blank.'; return; }
      out.innerHTML = '<p>' + rows.length + ' of ' + (d.meta && d.meta.total || rows.length) + ' banks shown, largest first.</p><div style="overflow-x:auto"><table class="lf-table"><thead><tr><th>Bank</th><th>City</th><th>Total assets</th><th>Website</th></tr></thead><tbody>' +
        rows.map(function (b) { var u = site(b.WEBADDR); return '<tr><td>' + esc(b.NAME) + '</td><td>' + esc(b.CITY) + ', ' + esc(b.STALP) + '</td><td>' + esc(assets(b.ASSET)) + '</td><td>' + (u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">visit</a>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    }).catch(function () { out.textContent = 'The FDIC search is not available right now. Please try again later.'; });
  });
})();
