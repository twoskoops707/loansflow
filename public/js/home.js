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
  // How many days old `asOf` is decides the freshness badge tone. This is a
  // pure display cue (green/amber/red) so a stale snapshot reads as stale
  // instead of silently posing as "live".
  function rateFreshness(asOf) {
    if (!asOf) return null;
    const d = new Date(asOf);
    if (isNaN(d.getTime())) return null;
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    let tone = 'fresh';
    if (days > 10) tone = 'stale';
    else if (days > 3) tone = 'aging';
    const label = days <= 0 ? 'Updated today' : days === 1 ? 'Updated yesterday' : 'Updated ' + days + ' days ago';
    return { tone: tone, label: label };
  }
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
    const fresh = rateFreshness(rates.asOf);
    const freshBadge = fresh
      ? '<span class="rate-freshness rate-freshness--' + fresh.tone + '">' + escapeHtml(fresh.label) + '</span>'
      : '';
    band.innerHTML =
      '<div class="rate-band-head">' +
        '<div>' +
          '<div class="eyebrow">Live rates</div>' +
          '<h3>National mortgage averages</h3>' +
        '</div>' +
        '<div class="rate-band-actions">' +
          freshBadge +
          '<a class="rate-band-link" href="tools/?step=8">Full market view &rarr;</a>' +
        '</div>' +
      '</div>' +
      '<div class="rate-strip">' + cells + '</div>' +
      '<p class="rate-strip-note">' + escapeHtml(rates.disclaimer || 'National averages. Individual rates vary. Not a rate quote.') + asOf + '</p>';
    band.hidden = false;
  }
  // Pulls a numeric rate out of the "30-Yr Fixed" cell (falls back to the
  // first cell) so the hero estimator can sync to it once it's loaded.
  function firstFixedRatePct(rates) {
    if (!rates || !rates.cells || !rates.cells.length) return null;
    const cell = rates.cells.filter(function (c) { return /30.?yr fixed/i.test(c.label || ''); })[0] || rates.cells[0];
    const m = cell && String(cell.value).match(/[\d.]+/);
    return m ? parseFloat(m[0]) : null;
  }
  function syncLiveRate(rates) {
    if (rateTouchedByUser) return;
    const pct = firstFixedRatePct(rates);
    const el = document.getElementById('qeRate');
    if (pct == null || !el) return;
    el.value = pct;
    updateEstimate();
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
          syncLiveRate(data && data.rates);
        })
        .catch(function () {
          attempt();
        });
    })();
  }

  // ---------- hero quick estimate ----------
  // Once the visitor edits the rate field themselves, stop overwriting it
  // with the live feed value.
  let rateTouchedByUser = false;
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
        const onEdit = function () {
          if (id === 'qeRate') rateTouchedByUser = true;
          updateEstimate();
        };
        el.addEventListener('input', onEdit);
        el.addEventListener('change', onEdit);
      }
    });
    updateEstimate();
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadRates();
    initEstimate();
  });
})();
