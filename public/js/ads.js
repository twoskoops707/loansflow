/**
 * LoansFlow AdSense loader — high-intent finance placements, reasonable density.
 * Client: ca-pub-7523216981025331
 *
 * Formats: auto | horizontal | rectangle | fluid (in-article) | infeed | multipurpose
 * Empty slots collapse so unfilled ads do not leave dashed boxes.
 */
(function () {
  const CONFIG = Object.assign(
    {
      provider: 'adsense',
      adsenseClient: 'ca-pub-7523216981025331',
      ezoicPrivacyId: '',
      // Shorter than AdSense's typical fill time, but keeps the blank-box
      // flash brief on slow/unfilled slots instead of holding full ad-sized
      // empty space for ~3s before collapsing.
      emptyCollapseMs: 1400,
    },
    window.LOANSFLOW_ADS || {}
  );

  const FORMAT_PRESETS = {
    auto: { format: 'auto', fullWidth: true, minHeight: '90px' },
    horizontal: { format: 'horizontal', fullWidth: true, minHeight: '90px' },
    rectangle: { format: 'rectangle', fullWidth: false, minHeight: '250px', minWidth: '250px' },
    fluid: { format: 'fluid', fullWidth: true, minHeight: '100px', layout: 'in-article' },
    infeed: { format: 'fluid', fullWidth: true, minHeight: '100px', layoutKey: '-fb+5w+4e-db+86' },
    multipurpose: { format: 'autorelaxed', fullWidth: true, minHeight: '120px' },
  };

  function ensureLabel(el) {
    if (el.querySelector('.ad-label')) return;
    const label = document.createElement('span');
    label.className = 'ad-label';
    label.textContent = 'Advertisement';
    el.insertBefore(label, el.firstChild);
  }

  function markEmpty(el) {
    el.dataset.adState = 'empty';
    el.setAttribute('aria-hidden', 'true');
    const anchor = el.closest('.ad-anchor');
    if (anchor) {
      const live = anchor.querySelectorAll('.ad-slot:not([data-ad-state="empty"])');
      if (!live.length) {
        anchor.dataset.adState = 'empty';
        anchor.setAttribute('aria-hidden', 'true');
      }
    }
  }

  function markFilled(el) {
    el.dataset.adState = 'filled';
    el.removeAttribute('aria-hidden');
    const anchor = el.closest('.ad-anchor');
    if (anchor) {
      anchor.dataset.adState = 'filled';
      anchor.removeAttribute('aria-hidden');
    }
  }

  function watchFill(el, ins) {
    const deadline = Date.now() + (CONFIG.emptyCollapseMs || 2800);
    const tick = () => {
      const status = (ins.getAttribute('data-ad-status') || '').toLowerCase();
      // Trust AdSense's own status attribute, not iframe presence: a
      // full-width-responsive unit creates its iframe shell to reserve
      // layout space *before* Google decides fill, so "has an iframe" is
      // not proof of a rendered ad — it was locking slots into "filled"
      // (never collapsing) even when nothing ever rendered inside them.
      if (status === 'filled') {
        markFilled(el);
        return;
      }
      if (status === 'unfilled') {
        markEmpty(el);
        return;
      }
      if (Date.now() >= deadline) {
        // No definitive status in time — collapse rather than risk holding
        // a large reserved-but-blank box on screen.
        markEmpty(el);
        return;
      }
      setTimeout(tick, 400);
    };
    setTimeout(tick, 600);
  }

  function fillPlaceholders() {
    document.querySelectorAll('.ad-slot').forEach((el) => {
      if (el.dataset.hydrated) return;
      el.dataset.hydrated = '1';
      el.setAttribute('aria-label', 'Advertisement');
      el.dataset.adState = 'pending';

      if (CONFIG.provider === 'placeholder' || !CONFIG.adsenseClient) {
        el.innerHTML =
          '<span class="ad-label">Advertisement</span><span class="ad-size">Ad slot</span>';
        el.dataset.adState = 'placeholder';
        return;
      }

      if (CONFIG.provider !== 'adsense') return;

      const presetKey = (el.dataset.adFormat || 'auto').toLowerCase();
      const preset = FORMAT_PRESETS[presetKey] || FORMAT_PRESETS.auto;
      const layout = el.dataset.adLayout || preset.layout || '';

      el.innerHTML = '';
      ensureLabel(el);

      const ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      if (layout === 'in-article') {
        ins.style.textAlign = 'center';
      }
      if (preset.minHeight) ins.style.minHeight = preset.minHeight;
      if (preset.minWidth) ins.style.minWidth = preset.minWidth;

      ins.setAttribute('data-ad-client', CONFIG.adsenseClient);
      if (el.dataset.adUnit) {
        ins.setAttribute('data-ad-slot', el.dataset.adUnit);
      }
      ins.setAttribute('data-ad-format', preset.format);
      if (layout) {
        ins.setAttribute('data-ad-layout', layout);
      }
      if (preset.layoutKey) {
        ins.setAttribute('data-ad-layout-key', preset.layoutKey);
      }
      if (preset.fullWidth) {
        ins.setAttribute('data-full-width-responsive', 'true');
      }

      el.appendChild(ins);
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (_) {
        /* script may still be loading */
      }
      watchFill(el, ins);
    });
  }

  function loadAdSense() {
    if (!CONFIG.adsenseClient || CONFIG.provider !== 'adsense') return;
    if (document.querySelector('script[src*="pagead/js/adsbygoogle.js"]')) return;
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
