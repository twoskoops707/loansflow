/**
 * LoansFlow ad loader
 * Set window.LOANSFLOW_ADS = { provider: 'adsense'|'ezoic'|'placeholder', adsenseClient: 'ca-pub-XXXX' }
 * before this script, or edit CONFIG below after network approval.
 */
(function () {
  const CONFIG = window.LOANSFLOW_ADS || {
    provider: 'adsense', // 'adsense' | 'ezoic' | 'placeholder'
    adsenseClient: 'ca-pub-7523216981025331', // e.g. 'ca-pub-XXXXXXXXXXXXXXXX'
    ezoicPrivacyId: '',
  };

  function fillPlaceholders() {
    document.querySelectorAll('.ad-slot').forEach((el, i) => {
      if (el.dataset.hydrated) return;
      el.dataset.hydrated = '1';
      el.setAttribute('aria-hidden', 'true');
      if (CONFIG.provider === 'placeholder' || !CONFIG.adsenseClient) {
        el.innerHTML =
          '<span class="ad-label">Sponsored</span><span class="ad-size">Ad slot Â· finance CPM inventory</span>';
        return;
      }
      if (CONFIG.provider === 'adsense') {
        el.innerHTML = '';
        const ins = document.createElement('ins');
        ins.className = 'adsbygoogle';
        ins.style.display = 'block';
        ins.setAttribute('data-ad-client', CONFIG.adsenseClient);
        ins.setAttribute('data-ad-slot', el.dataset.adSlot || String(1000 + i));
        ins.setAttribute('data-ad-format', el.dataset.adFormat || 'auto');
        ins.setAttribute('data-full-width-responsive', 'true');
        el.appendChild(ins);
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (_) {
          /* ignore until script loads */
        }
      }
    });
  }

  function loadAdSense() {
    if (!CONFIG.adsenseClient || CONFIG.provider !== 'adsense') return;
    if (document.getElementById('lf-adsense')) return;
    const s = document.createElement('script');
    s.id = 'lf-adsense';
    s.async = true;
    s.src =
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' +
      encodeURIComponent(CONFIG.adsenseClient);
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
  }

  function loadEzoic() {
    if (CONFIG.provider !== 'ezoic') return;
    // After Ezoic approval, paste their header script in index shells
    // or set provider + privacy scripts per Ezoic dashboard instructions.
  }

  function boot() {
    loadAdSense();
    loadEzoic();
    fillPlaceholders();
    const obs = new MutationObserver(() => fillPlaceholders());
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

