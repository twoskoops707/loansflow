/* Searchable federal grants via the public Grants.gov search2 API (no key needed, CORS enabled). */
(function () {
  'use strict';
  var API = 'https://api.grants.gov/v1/api/search2', ROWS = 15, start = 0, lastHits = 0;
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function call(body) {
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
    }).then(function (j) { if (j.errorcode !== 0 && j.errorcode !== undefined) throw new Error(j.msg || 'API error'); return j.data; });
  }
  function params() {
    var st = document.getElementById('g-status').value;
    var b = {
      keyword: document.getElementById('g-keyword').value.trim(), rows: ROWS, startRecordNum: start,
      oppStatuses: st === 'both' ? 'forecasted|posted' : st
    };
    var e = document.getElementById('g-elig').value, c = document.getElementById('g-cat').value;
    if (e) b.eligibilities = e; if (c) b.fundingCategories = c;
    return b;
  }
  function row(o) {
    var li = el('article');
    li.appendChild(el('div', 'lf-meta', (o.oppStatus === 'posted' ? 'Open' : 'Coming soon') + ' · ' + (o.agency || 'Federal agency') + ' · ' + (o.number || '')));
    var h = el('h3'); var a = el('a', null, o.title || 'Untitled opportunity'); a.href = 'https://www.grants.gov/search-results-detail/' + encodeURIComponent(o.id); a.target = '_blank'; a.rel = 'noopener noreferrer'; h.appendChild(a); li.appendChild(h);
    var dates = [];
    if (o.openDate) dates.push('Opens ' + o.openDate); if (o.closeDate) dates.push('Closes ' + o.closeDate);
    li.appendChild(el('p', null, dates.join(' · ') || 'Dates not yet announced'));
    return li;
  }
  function search(append) {
    var out = document.getElementById('g-results'), status = document.getElementById('g-count'), more = document.getElementById('g-more');
    if (!append) { start = 0; out.textContent = ''; }
    status.textContent = 'Searching Grants.gov…'; more.hidden = true;
    call(params()).then(function (d) {
      lastHits = d.hitCount || 0;
      (d.oppHits || []).forEach(function (o) { out.appendChild(row(o)); });
      status.textContent = lastHits + ' matching opportunit' + (lastHits === 1 ? 'y' : 'ies') + ' · showing ' + out.children.length;
      more.hidden = out.children.length >= lastHits;
      if (!lastHits) out.appendChild(el('p', null, 'Nothing matched. Try fewer filters or a broader keyword.'));
    }).catch(function () {
      status.textContent = 'Grants.gov could not be reached right now. You can search directly at grants.gov.';
    });
  }
  function stats() {
    var box = document.getElementById('g-stats');
    var base = { keyword: '', rows: 1, oppStatuses: 'forecasted|posted' };
    Promise.all([call(base), call(Object.assign({ eligibilities: '23' }, base)), call(Object.assign({ eligibilities: '21' }, base)), call(Object.assign({ fundingCategories: 'BC' }, base))]).then(function (r) {
      box.textContent = 'Right now Grants.gov lists ' + r[0].hitCount.toLocaleString() + ' open or upcoming federal opportunities. ' + r[1].hitCount.toLocaleString() +
        ' are open to small businesses (most are research grants), ' + r[2].hitCount.toLocaleString() + ' are open to individuals, and only ' + r[3].hitCount.toLocaleString() + ' are in the Business and Commerce category.';
    }).catch(function () { box.hidden = true; });
  }
  document.addEventListener('DOMContentLoaded', function () {
    var f = document.getElementById('g-form'); if (!f) return;
    f.addEventListener('submit', function (e) { e.preventDefault(); search(false); });
    document.getElementById('g-more').addEventListener('click', function () { start += ROWS; search(true); });
    stats(); search(false);
  });
})();
