/* Live rates dashboard. Usage: <div data-lf-rates></div> (full) or <div data-lf-rates="compact"></div>.
   Data: /data/rates.json, rebuilt daily from the NY Fed, U.S. Treasury, Freddie Mac and FRED (see tools/rates/refresh-rates.mjs). */
(function () {
  'use strict';
  var hosts = [].slice.call(document.querySelectorAll('[data-lf-rates]'));
  if (!hosts.length) return;
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function fmtDate(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? MONTHS[+m[2] - 1] + ' ' + +m[3] + ', ' + m[1] : ''; }
  function pct(v) { return (typeof v === 'number' && isFinite(v)) ? v.toFixed(2) + '%' : 'n/a'; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function spark(hist) {
    if (!hist || hist.length < 3) return '';
    var vals = hist.map(function (p) { return p[1]; }), min = Math.min.apply(null, vals), max = Math.max.apply(null, vals), w = 120, h = 32, rng = (max - min) || 1;
    var pts = vals.map(function (v, i) { return (i / (vals.length - 1) * w).toFixed(1) + ',' + (h - 3 - (v - min) / rng * (h - 6)).toFixed(1); }).join(' ');
    return '<svg class="lfr-spark" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="30-year mortgage rate, last 52 weeks: low ' + min.toFixed(2) + '%, high ' + max.toFixed(2) + '%"><polyline points="' + pts + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }
  function card(label, value, asOf, src, note, extra) {
    return '<div class="lfr-card"><div class="lfr-label">' + esc(label) + '</div><div class="lfr-value">' + esc(value) + '</div>' + (extra || '') +
      '<div class="lfr-meta">' + (asOf ? 'as of ' + esc(fmtDate(asOf)) + ' &middot; ' : '') + (src ? '<a href="' + esc(src) + '" target="_blank" rel="noopener noreferrer">source</a>' : '') + '</div>' + (note ? '<div class="lfr-note">' + esc(note) + '</div>' : '') + '</div>';
  }
  function render(d, compact) {
    var S = d.sources || {}, c = [];
    if (d.prime) c.push(card('Prime rate', pct(d.prime.value), d.prime.asOf, S.prime, 'Base for many lines of credit and variable SBA loans'));
    if (d.fedFunds && typeof d.fedFunds.targetFrom === 'number' && typeof d.fedFunds.targetTo === 'number' && !compact) c.push(card('Fed funds target', d.fedFunds.targetFrom.toFixed(2) + '% to ' + d.fedFunds.targetTo.toFixed(2) + '%', d.fedFunds.asOf, S.fedFunds, 'Effective rate ' + pct(d.fedFunds.effr)));
    if (d.sofr) c.push(card('SOFR', pct(d.sofr.value), d.sofr.asOf, S.sofr, 'Overnight secured financing rate'));
    if (d.treasury) { if (!compact) c.push(card('5-year Treasury', pct(d.treasury.y5), d.treasury.asOf, S.treasury, 'Equipment and 504 pricing context')); c.push(card('10-year Treasury', pct(d.treasury.y10), d.treasury.asOf, S.treasury, 'Long-term benchmark')); }
    if (d.mortgage) { c.push(card('30-yr fixed mortgage', pct(d.mortgage.m30), d.mortgage.asOf, S.mortgage, 'National weekly average, not a quote', spark(d.mortgage.history30))); if (!compact) c.push(card('15-yr fixed mortgage', pct(d.mortgage.m15), d.mortgage.asOf, S.mortgage, 'National weekly average, not a quote')); }
    var sba = d.prime ? '<p class="lfr-foot">SBA 7(a) maximum variable rate: prime + 3.00% on loans over $350,000 = <strong>' + pct(d.prime.value + 3) + '</strong>; prime + 6.50% on loans of $50,000 or less = <strong>' + pct(d.prime.value + 6.5) + '</strong>. Your lender may charge less. <a href="/loans/sba-7a#rates">See all tiers</a>.</p>' : '';
    return '<div class="lfr-grid' + (compact ? ' lfr-compact' : '') + '">' + c.join('') + '</div>' + (compact ? '' : sba) + '<p class="lfr-foot">Updated daily from the Federal Reserve Bank of New York, the U.S. Treasury, Freddie Mac and FRED. Rates change; confirm with your lender.</p>';
  }
  fetch('/data/rates.json').then(function (r) { return r.json(); }).then(function (d) {
    hosts.forEach(function (el) { el.classList.add('lfr'); el.innerHTML = render(d, el.getAttribute('data-lf-rates') === 'compact'); });
  }).catch(function () {
    // The page ships the cards already rendered (scripts/prerender-rates.js). Keep them if the refresh fails; hide only an empty box.
    hosts.forEach(function (el) { if (!el.querySelector('.lfr-card')) el.hidden = true; });
  });
})();
