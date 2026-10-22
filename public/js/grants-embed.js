/* Small live Grants.gov results block: <div class="lf-embed" data-kw="veteran" data-elig="23" data-rows="6"></div> */
(function () {
  'use strict';
  var API = 'https://api.grants.gov/v1/api/search2';
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function run(box) {
    var body = { keyword: box.getAttribute('data-kw') || '', rows: +box.getAttribute('data-rows') || 6, startRecordNum: 0, oppStatuses: box.getAttribute('data-status') || 'forecasted|posted' };
    if (box.getAttribute('data-elig')) body.eligibilities = box.getAttribute('data-elig');
    if (box.getAttribute('data-cat')) body.fundingCategories = box.getAttribute('data-cat');
    box.textContent = '';
    box.appendChild(el('div', 'ch-t', 'Live from Grants.gov'));
    var status = el('p', 'lf-figcap', 'Loading current federal opportunities…'); box.appendChild(status);
    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.json(); }).then(function (j) {
      var d = j.data || {}, hits = d.oppHits || [];
      status.textContent = (d.hitCount || 0) + ' matching federal opportunit' + ((d.hitCount || 0) === 1 ? 'y' : 'ies') + ' right now. Most federal grants fund organizations and research, not general business costs.';
      var list = el('div', 'lf-news');
      hits.forEach(function (o) {
        var art = el('article'); art.appendChild(el('div', 'lf-meta', (o.oppStatus === 'posted' ? 'Open' : 'Coming soon') + ' · ' + (o.agency || 'Federal agency')));
        var h = el('h3'), a = el('a', null, o.title || 'Opportunity'); a.href = 'https://www.grants.gov/search-results-detail/' + encodeURIComponent(o.id); a.target = '_blank'; a.rel = 'noopener noreferrer'; h.appendChild(a); art.appendChild(h);
        art.appendChild(el('p', null, o.closeDate ? 'Closes ' + o.closeDate : 'Close date not yet announced')); list.appendChild(art);
      });
      box.appendChild(list);
      var more = el('p', null); var a2 = el('a', null, 'Search all federal grants →'); a2.href = '/grants/'; more.appendChild(a2); box.appendChild(more);
    }).catch(function () { status.textContent = 'Grants.gov could not be reached right now. You can search it directly at grants.gov.'; });
  }
  document.addEventListener('DOMContentLoaded', function () { [].forEach.call(document.querySelectorAll('.lf-embed'), run); });
})();
