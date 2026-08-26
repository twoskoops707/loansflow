// ---------- LOANSFLOW HOMEPAGE ----------
// Live national mortgage rates band (same feed as the Market News tool) and a
// hero quick-estimate calculator. Both degrade gracefully: if the rates feed
// is unreachable the band stays hidden, and the estimator simply falls back to
// its defaults.
(function () {
  'use strict';

  // ---------- shared helpers ----------
  function fmt(num, decimals) {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals || 0,
      maximumFractionDigits: decimals || 0
    });
  }
  function fmtMoney(num, decimals) {
    return '$' + fmt(num, decimals);
  }
  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function monthlyPI(principal, annualRatePct, years) {
    const r = (annualRatePct / 100) / 12;
    const n = years * 12;
    if (r === 0) return principal / n;
    return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }
  function marketNewsUrlCandidates() {
    const bust = Date.now();
    return ['/api/market-news?fresh=1&t=' + bust, '/data/market-news.json?t=' + bust];
  }

  // ---------- live rates band ----------
  function renderRateBand(rates) {
    const band = document.getElementById('homeRateBand');
    if (!band) return;
    if (!rates || !rates.cells || !rates.cells.length) return;
    const cells = rates.cells
      .map(function (c) {
        return (
          '<div class="rate-cell">' +
            '<span class="rate-label">' + escapeHtml(c.label) + '</span>' +
            '<strong class="rate-value">' + escapeHtml(c.value) + '</strong>' +
            (c.note ? '<span class="rate-note">' + escapeHtml(c.note) + '</span>' : '') +
          '</div>'
        );
      })
      .join('');
    const asOf = rates.asOf
      ? ' As of ' + escapeHtml(rates.asOf) + ' &middot; ' + escapeHtml(rates.source || 'Freddie Mac PMMS') + '.'
      : '';
    band.innerHTML =
      '<div class="rate-band-head">' +
        '<div>' +
          '<div class="eyebrow">Live rates</div>' +
          '<h3>National mortgage averages</h3>' +
        '</div>' +
        '<a class="rate-band-link" href="tools/?step=8">Full market view &rarr;</a>' +
      '</div>' +
      '<div class="rate-strip">' + cells + '</div>' +
      '<p class="rate-strip-note">' + escapeHtml(rates.disclaimer || 'National averages. Individual rates vary. Not a rate quote.') + asOf + '</p>';
    band.hidden = false;
  }
  function loadRates() {
    const band = document.getElementById('homeRateBand');
    if (!band) return;
    const urls = marketNewsUrlCandidates();
    let idx = 0;
    (function attempt() {
      const url = urls[idx++];
      if (!url) return;
      fetch(url, { cache: 'no-store' })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function (data) {
          renderRateBand(data && data.rates);
        })
        .catch(function () {
          attempt();
        });
    })();
  }

  // ---------- hero quick estimate ----------
  function readNum(id, fallback) {
    const el = document.getElementById(id);
    const v = parseFloat(el && el.value);
    return Number.isFinite(v) && v >= 0 ? v : fallback;
  }
  function readTerm() {
    const el = document.getElementById('qeTerm');
    const v = parseInt(el && el.value, 10);
    return v >= 1 ? v : 30;
  }
  function estimateState() {
    return {
      homePrice: readNum('qeHomePrice', 425000),
      downPayment: readNum('qeDownPayment', 85000),
      rate: readNum('qeRate', 6.75),
      term: readTerm()
    };
  }
  function openFullUrl(s) {
    const state = { homePrice: s.homePrice, downPayment: s.downPayment, rate: s.rate, term: s.term };
    return 'tools/?step=3&lf=' + encodeURIComponent(JSON.stringify(state));
  }
  function updateEstimate() {
    const s = estimateState();
    const principal = Math.max(0, s.homePrice - s.downPayment);
    const pi = monthlyPI(principal, s.rate, s.term);
    const valueEl = document.getElementById('qeResult');
    const subEl = document.getElementById('qeResultSub');
    const openEl = document.getElementById('qeOpen');
    if (valueEl) valueEl.textContent = fmtMoney(pi, 0);
    if (subEl) subEl.textContent = fmtMoney(principal, 0) + ' financed at ' + s.rate + '% for ' + s.term + ' years';
    if (openEl) openEl.href = openFullUrl(s);
  }
  function initEstimate() {
    const ids = ['qeHomePrice', 'qeDownPayment', 'qeRate', 'qeTerm'];
    const first = document.getElementById(ids[0]);
    if (!first) return;
    ids.forEach(function (id) {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', updateEstimate);
        el.addEventListener('change', updateEstimate);
      }
    });
    updateEstimate();
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadRates();
    initEstimate();
  });
})();
