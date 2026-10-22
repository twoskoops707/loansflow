/* Header: mobile menu toggle. Desktop menus open with CSS hover and keyboard focus, no JavaScript needed. */
(function () {
  'use strict';
  var header = document.getElementById('site-nav');
  if (!header) return;
  var btn = header.querySelector('.nav-toggle');
  if (!btn) return;
  function set(open) {
    header.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  btn.addEventListener('click', function () { set(!header.classList.contains('open')); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { set(false); if (document.activeElement) document.activeElement.blur(); } });
  header.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.nav-links a') && window.innerWidth <= 980) set(false); });
})();
