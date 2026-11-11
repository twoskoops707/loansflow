/* Monthly SBA rate update sign-up. Renders only when /api/subscribe reports it is configured, so visitors never see a dead form. */
(function () {
  'use strict';
  var hosts = [].slice.call(document.querySelectorAll('[data-lf-subscribe]'));
  if (!hosts.length) return;
  fetch('/api/subscribe', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
    if (!d || !d.enabled) return;
    hosts.forEach(function (el) {
      el.className = 'lf-subscribe';
      el.innerHTML = '<h3>Monthly SBA rate update</h3><p>One short email a month: the prime rate, SBA maximum rates and any fee or rule changes. Unsubscribe any time.</p>' +
        '<form novalidate><label class="sr-only" for="lf-sub-email">Email address</label><input id="lf-sub-email" type="email" name="email" placeholder="you@example.com" autocomplete="email" required>' +
        '<input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">' +
        '<button class="lf-btn" type="submit">Subscribe</button></form><p class="lf-sub-msg" role="status" aria-live="polite"></p>' +
        '<p class="lf-sub-fine">We use your email only for this update. See our <a href="/privacy.html">privacy policy</a>.</p>';
      var form = el.querySelector('form'), msg = el.querySelector('.lf-sub-msg');
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = form.email.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { msg.textContent = 'Please enter a valid email address.'; return; }
        msg.textContent = 'Sending...';
        fetch('/api/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: email, website: form.website.value, source: location.pathname }) })
          .then(function (r) { return r.json(); })
          .then(function (d) { msg.textContent = d.ok ? 'Thanks. You are on the list.' : 'Something went wrong. Please try again later.'; if (d.ok) form.reset(); })
          .catch(function () { msg.textContent = 'Something went wrong. Please try again later.'; });
      });
    });
  }).catch(function () {});
})();
