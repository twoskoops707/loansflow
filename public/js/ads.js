/**
 * LoansFlow ad loader — Auto ads + labeled display slots (reasonable density).
 * Client: ca-pub-7523216981025331
 */
(function () {
  const CONFIG = window.LOANSFLOW_ADS || {
    provider: 'adsense',
    adsenseClient: 'ca-pub-7523216981025331',
    ezoicPrivacyId: '',
  };

  const FORMAT_PRESETS = {
    auto: { format: 'auto', fullWidth: true },
    horizontal: { format: 'horizontal', fullWidth: true },
    rectangle: { format: 'rectangle', fullWidth: false },
    fluid: { format: 'fluid', fullWidth: true },
    multipurpose: { format: 'autorelaxed', fullWidth: true },
  };

  function fillPlaceholders() {
    document.querySelectorAll('.ad-slot').forEach((el, i) => {
      if (el.dataset.hydrated) return;
      el.dataset.hydrated = '1';
      el.setAttribute('aria-label', 'Advertisement');

      if (CONFIG.provider === 'placeholder' || !CONFIG.adsenseClient) {
        el.innerHTML =
          '<span class="ad-label">Sponsored</span><span class="ad-size">Ad slot</span>';
        return;
      }

      if (CONFIG.provider !== 'adsense') return;

      const presetKey = (el.dataset.adFormat || 'auto').toLowerCase();
      const preset = FORMAT_PRESETS[presetKey] || FORMAT_PRESETS.auto;

      el.innerHTML = '';
      const ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      if (presetKey === 'rectangle') {
        ins.style.minWidth = '250px';
        ins.style.minHeight = '250px';
      } else if (presetKey === 'horizontal') {
        ins.style.minHeight = '90px';
      } else {
        ins.style.minHeight = '100px';
      }
      ins.setAttribute('data-ad-client', CONFIG.adsenseClient);
      // Omit fake slot IDs — Auto / responsive units fill by client + format
      if (el.dataset.adUnit) {
        ins.setAttribute('data-ad-slot', el.dataset.adUnit);
      }
      ins.setAttribute('data-ad-format', preset.format);
      if (preset.fullWidth) {
        ins.setAttribute('data-full-width-responsive', 'true');
      }
      el.appendChild(ins);
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (_) {
        /* script may still be loading */
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

  function boot() {
    loadAdSense();
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
