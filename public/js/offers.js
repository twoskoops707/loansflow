/**
 * LoansFlow affiliate / partner offer renderer.
 * Loads /data/offers.json and shows only status=live items with a url.
 * Company brand: LoansFlow (never "Partnerships").
 */
(function () {
  const DATA_URL = '/data/offers.json';
  const MORTGAGE_PAGE = /mortgage|refinanc|home-afford|closing-cost/i.test(location.pathname);

  const esc = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const safeUrl = (u) => (/^(\/go\/[a-z0-9-]+|https:\/\/[^\s"<>]+)$/i.test(String(u)) ? u : '#');

  function mount(el, offers) {
    // RESPA Section 8: mortgage/refinance pages are affiliate-free. Never render these surfaces or pages.
    if (MORTGAGE_PAGE) { el.hidden = true; el.innerHTML = ''; return; }
    const live = offers.filter((o) => o.status === 'live' && o.url && !(o.surfaces || []).some((x) => /mortgage|refi/i.test(x)));
    if (!live.length) {
      el.hidden = true;
      el.innerHTML = '';
      return;
    }
    el.hidden = false;
    el.innerHTML =
      '<div class="lf-offers-head">Compare lenders and business banking (sponsored)</div><ul class="lf-offers-list">' +
      live
        .map(
          (o) =>
            `<li><a href="${esc(safeUrl(o.url))}" rel="sponsored nofollow noopener" target="_blank">${esc(o.title)}</a>` +
            (o.blurb ? `<span>${esc(o.blurb)}</span>` : '') +
            '</li>'
        )
        .join('') +
      '</ul><p class="lf-offers-note">Advertising disclosure: we may earn a commission if you apply or sign up through these links. It does not change how we describe any loan. <a href="/disclosure.html">Read our disclosure</a>.</p>';
  }

  function ensureStyle() {
    if (document.getElementById('lf-offers-style')) return;
    const s = document.createElement('style');
    s.id = 'lf-offers-style';
    s.textContent =
      '.lf-offers{margin:1.5rem 0;padding:1rem 0;border-top:1px solid rgba(255,255,255,.14)}.lf-offers-note{font-size:.78rem;opacity:.65;margin:.8rem 0 0}.lf-offers[hidden]{display:none}' +
      '.lf-offers-head{font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;opacity:.7;margin-bottom:.6rem}' +
      '.lf-offers-list{list-style:none;padding:0;margin:0;display:grid;gap:.65rem}' +
      '.lf-offers-list a{font-weight:700;color:var(--accent,#34d59a)}' +
      '.lf-offers-list span{display:block;font-size:.9rem;opacity:.75;margin-top:.15rem}';
    document.head.appendChild(s);
  }

  async function run() {
    ensureStyle();
    const hosts = [...document.querySelectorAll('[data-lf-offers]')];
    if (!hosts.length) return;
    let data;
    try {
      const res = await fetch(DATA_URL, { cache: 'no-cache' });
      data = await res.json();
    } catch (_) {
      return;
    }
    const offers = Array.isArray(data.offers) ? data.offers : [];
    hosts.forEach((el) => {
      const surface = el.getAttribute('data-lf-offers') || 'any';
      const filtered =
        surface === 'any' || surface === 'tools-footer'
          ? offers
          : offers.filter((o) => !o.surfaces || o.surfaces.includes(surface));
      mount(el, filtered);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
