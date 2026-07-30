/**
 * Ezoic header bootstrap — same scripts as docs/automation/ezoic-snippet.txt
 * Publisher userId: 652581 (account; domain-bound JS for loansflow.loan; no site ID).
 * Does NOT replace AdSense. Official: https://docs.ezoic.com/docs/ezoicads/integration/
 *
 * Pages also inline the official tags so CHECK CONNECTION sees sa.min.js in HTML source.
 * This file is a no-op when those tags are already present.
 */
(function () {
  if (window.__LF_EZOIC_BOOT__) return;
  if (document.querySelector('script[src*="ezojs.com/ezoic/sa.min.js"]')) {
    window.__LF_EZOIC_BOOT__ = true;
    window.ezstandalone = window.ezstandalone || {};
    window.ezstandalone.cmd = window.ezstandalone.cmd || [];
    return;
  }
  window.__LF_EZOIC_BOOT__ = true;

  function add(src, attrs) {
    const s = document.createElement('script');
    s.src = src;
    if (attrs) Object.keys(attrs).forEach((k) => s.setAttribute(k, attrs[k]));
    document.head.appendChild(s);
  }

  // Exact order from ezoic-snippet.txt
  add('https://cmp.gatekeeperconsent.com/min.js', { 'data-cfasync': 'false' });
  add('https://the.gatekeeperconsent.com/cmp.min.js', { 'data-cfasync': 'false' });
  add('https://www.ezojs.com/ezoic/sa.min.js', { async: '' });
  window.ezstandalone = window.ezstandalone || {};
  window.ezstandalone.cmd = window.ezstandalone.cmd || [];
  add('https://ezoicanalytics.com/analytics.js');
})();
