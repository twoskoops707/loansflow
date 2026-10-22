/* Home page search (type-ahead over loan types, guides and funding pages) and the rates strip used on the News page. */
(function () {
  'use strict';
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  /* ---------- rates strip ---------- */
  function rates() {
    var box = document.getElementById('lf-rates');
    if (!box) return;
    fetch('/data/market-news.json').then(function (r) { return r.json(); }).then(function (d) {
      var cells = (d.rates && d.rates.cells) || [];
      box.textContent = '';
      cells.forEach(function (c) { var s = el('span', null, c.label); s.appendChild(el('b', null, c.value)); box.appendChild(s); });
      if (d.prime && d.prime.value > 0 && d.prime.value < 30) { var p = el('span', null, 'Prime rate'); p.appendChild(el('b', null, d.prime.value.toFixed(2) + '%')); box.appendChild(p); }
      box.appendChild(el('small', null, (d.rates && d.rates.source ? d.rates.source + ', as of ' + d.rates.asOf + '. ' : '') + 'National averages, not a rate quote.'));
    }).catch(function () { box.hidden = true; });
  }

  /* ---------- search ---------- */
  var index = null, loading = null;
  function loadIndex() {
    if (index) return Promise.resolve(index);
    if (!loading) loading = fetch(window.LF_INDEX_URL || '/data/search-index.json').then(function (r) { return r.json(); }).then(function (j) { index = j; return j; });
    return loading;
  }
  function words(s) { return String(s).toLowerCase().replace(/[^a-z0-9$ ]+/g, ' ').split(/\s+/).filter(Boolean); }
  function search(q) {
    var toks = words(q);
    if (!toks.length) return [];
    return index.map(function (it) {
      var title = it.t.toLowerCase(), kw = ' ' + words(it.k).join(' ') + ' ', desc = it.d.toLowerCase(), score = 0;
      toks.forEach(function (t) {
        if (title.indexOf(t) > -1) score += 6;
        if (kw.indexOf(' ' + t) > -1) score += 3; else if (t.length > 3 && kw.indexOf(t) > -1) score += 1;
        if (desc.indexOf(t) > -1) score += 1;
      });
      return { it: it, score: score };
    }).filter(function (x) { return x.score > 0; }).sort(function (a, b) { return b.score - a.score; }).slice(0, 6).map(function (x) { return x.it; });
  }

  function initSearch() {
    var form = document.getElementById('home-search');
    if (!form) return;
    var input = document.getElementById('q'), list = document.getElementById('q-results'), active = -1, items = [];
    var icons = window.LF_ICONS || {};

    function close() { list.hidden = true; active = -1; input.setAttribute('aria-expanded', 'false'); }
    function paint() {
      list.textContent = '';
      if (!items.length) {
        var none = el('li', 'none'); none.appendChild(document.createTextNode('No exact match. ')); var a = el('a', null, 'Browse all loan types'); a.href = '/loans/'; none.appendChild(a); list.appendChild(none);
      }
      items.forEach(function (it, i) {
        var li = el('li'); li.setAttribute('role', 'option'); if (i === active) li.className = 'on';
        var a = el('a'); a.href = it.u;
        var b = el('span'); b.appendChild(el('strong', null, it.t)); b.appendChild(el('em', null, it.d));
        a.appendChild(b); li.appendChild(a); list.appendChild(li);
      });
      list.hidden = false; input.setAttribute('aria-expanded', 'true');
    }
    function run() {
      var q = input.value.trim();
      if (!q) { close(); return; }
      loadIndex().then(function () { items = search(q); active = items.length ? 0 : -1; paint(); }).catch(function () { close(); });
    }
    input.addEventListener('input', run);
    input.addEventListener('focus', function () { loadIndex().catch(function () {}); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); active = (active + 1) % items.length; paint(); }
      else if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); active = (active - 1 + items.length) % items.length; paint(); }
      else if (e.key === 'Escape') { close(); }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (!q) { input.focus(); return; }
      loadIndex().then(function () {
        var r = search(q);
        if (r.length) location.href = (active > -1 && items[active]) ? items[active].u : r[0].u; else { items = []; paint(); }
      });
    });
    document.addEventListener('click', function (e) { if (!form.contains(e.target)) close(); });
    document.querySelectorAll('.home-chips button').forEach(function (b) {
      b.addEventListener('click', function () { input.value = b.getAttribute('data-q'); input.focus(); run(); });
    });
  }

  document.addEventListener('DOMContentLoaded', function () { rates(); initSearch(); });
})();
