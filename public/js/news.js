/* News page: headlines from data/market-news.json with category filters, plus opt-in Instagram embeds. */
(function () {
  'use strict';
  var EXPLAIN = {
    'Rates': 'Mortgage rates track long-term Treasury yields and Fed expectations. Small moves change a monthly payment by real money, so run the numbers before you lock.',
    'Fed Policy': 'The Federal Reserve sets short-term rates, which feed the prime rate that many business loans and lines of credit are priced from.',
    'Consumer Protection': 'The CFPB writes and enforces rules on lending disclosures, fees and servicing. Its actions often change what lenders must tell you.',
    'Small Business': 'Lending conditions for small businesses: approvals, rates and new programs.',
    'Equipment Finance': 'Trends in equipment loans and leases, including rates and demand by industry.',
    'Commercial Real Estate': 'Commercial property lending affects rates and availability for 504 and conventional real estate loans.',
    'SBA Policy': 'Changes to SBA programs, fees and rules, which can change what a loan costs.'
  };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : '#'; }
  var data = [], active = 'All';

  function fmtDate(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }

  function render() {
    var list = document.getElementById('lf-news');
    list.textContent = '';
    var shown = data.filter(function (a) { return active === 'All' || a.category === active; });
    document.getElementById('lf-explain').textContent = active === 'All' ? '' : (EXPLAIN[active] || '');
    shown.forEach(function (a) {
      var art = el('article');
      art.appendChild(el('div', 'lf-meta', (a.category || 'News') + ' · ' + (a.source || 'Source')));
      var h = el('h3'); var link = el('a', null, a.title); link.href = safeUrl(a.url); link.target = '_blank'; link.rel = 'noopener noreferrer'; h.appendChild(link); art.appendChild(h);
      if (a.summary) art.appendChild(el('p', null, a.summary));
      if (a.publishedAt) art.appendChild(el('time', null, fmtDate(a.publishedAt)));
      list.appendChild(art);
    });
    if (!shown.length) list.appendChild(el('p', null, 'No headlines in this category right now.'));
  }

  function filters() {
    var cats = ['All'];
    data.forEach(function (a) { if (a.category && cats.indexOf(a.category) < 0) cats.push(a.category); });
    var box = document.getElementById('lf-filter'); box.textContent = '';
    cats.forEach(function (c) {
      var b = el('button', null, c); b.type = 'button'; b.setAttribute('aria-pressed', String(c === active));
      b.addEventListener('click', function () { active = c; filters(); render(); });
      box.appendChild(b);
    });
  }

  function social() {
    var box = document.getElementById('lf-social-posts');
    if (!box) return;
    fetch('/data/social.json').then(function (r) { return r.json(); }).then(function (d) {
      var posts = (d.posts || []).filter(function (u) { return /^https:\/\/www\.instagram\.com\/(p|reel)\//.test(u); });
      var status = document.getElementById('lf-social-status');
      if (!posts.length) { status.textContent = 'No posts have been selected yet. Add Instagram post URLs to data/social.json to show them here.'; return; }
      var btn = el('button', 'lf-btn', 'Load ' + posts.length + ' Instagram post' + (posts.length > 1 ? 's' : ''));
      btn.type = 'button';
      status.textContent = 'Instagram content loads only when you click, because Instagram’s embed code sets its own cookies.';
      btn.addEventListener('click', function () {
        btn.remove();
        posts.forEach(function (u) {
          var bq = el('blockquote', 'instagram-media'); bq.setAttribute('data-instgrm-permalink', u); bq.setAttribute('data-instgrm-version', '14');
          var a = el('a', null, u); a.href = u; bq.appendChild(a); box.appendChild(bq);
        });
        var s = document.createElement('script'); s.async = true; s.src = 'https://www.instagram.com/embed.js'; document.body.appendChild(s);
      });
      box.appendChild(btn);
    }).catch(function () {});
  }

  document.addEventListener('DOMContentLoaded', function () {
    fetch('/data/market-news.json').then(function (r) { return r.json(); }).then(function (d) {
      data = d.articles || [];
      var up = document.getElementById('lf-updated');
      if (up && d.updatedAt) up.textContent = 'Headlines refreshed ' + fmtDate(d.updatedAt) + '. Links open the original publisher.';
      filters(); render();
    }).catch(function () { document.getElementById('lf-news').textContent = 'Headlines are temporarily unavailable.'; });
    social();
  });
})();
