/**
 * LoansFlow AdSense loader — high-intent finance placements, reasonable density.
 * Client: ca-pub-6588738221262894
 *
 * Formats: auto | horizontal | rectangle | fluid (in-article) | infeed | multipurpose
 * Empty slots collapse so unfilled ads do not leave dashed boxes.
 */
(function () {
  const CONFIG = Object.assign(
    {
      provider: 'adsense',
      adsenseClient: 'ca-pub-6588738221262894',
      // How long an unfilled slot keeps its reserved height before it is
      // collapsed away. Short enough to avoid holding full ad-sized blank
      // space, long enough that a normal ad request resolves first.
      emptyCollapseMs: 2500,
      // Keep watching after the collapse: AdSense can report "filled" well
      // after the collapse deadline (CMP handshake, slow network, cold
      // cache). A collapsed slot that later fills is un-hidden again, so a
      // real ad can never stay invisible because it arrived late.
      lateFillWatchMs: 90000,
      // Named ad units. Create each unit in AdSense (Ads > By ad unit), then paste its slot ID here.
      // A slot whose name is not listed (or is empty) still requests by client + format.
      units: {
        'home-top': '7525616235',
        // 'loans-index': '', 'news-mid': '', 'wisdom-mid': '', 'alt-mid': '', 'grants-mid': '', 'calc-help-side': '',
        // per loan page: 'sba-7a-mid', 'sba-7a-side', 'sba-504-mid', 'sba-504-side', 'sba-express-mid', 'sba-express-side',
        // 'sba-microloan-mid', 'sba-microloan-side', 'line-of-credit-mid', 'line-of-credit-side',
        // 'commercial-term-loan-mid', 'commercial-term-loan-side', 'equipment-financing-mid', 'equipment-financing-side',
        // 'mortgage-mid', 'mortgage-side'
      },
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
    const collapseAt = Date.now() + (CONFIG.emptyCollapseMs || 2800);
    const watchUntil = Date.now() + (CONFIG.lateFillWatchMs || 90000);
    let collapsed = false;
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
      // unfilled = Google answered, nothing to show; blocked (an extension or
      // a network policy ate the request) and error = this request is done.
      // All three are final, so stop polling.
      if (status === 'unfilled' || status === 'blocked' || status === 'error') {
        markEmpty(el);
        return;
      }
      if (Date.now() >= watchUntil) {
        if (!collapsed) markEmpty(el);
        return;
      }
      if (!collapsed && Date.now() >= collapseAt) {
        collapsed = true;
        markEmpty(el);
      }
      setTimeout(tick, collapsed ? 1500 : 400);
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
      const unitId = el.dataset.adUnit || (CONFIG.units || {})[el.dataset.adName || ''] || '';
      if (unitId) {
        ins.setAttribute('data-ad-slot', unitId);
        el.dataset.adUnitState = 'wired';
      } else {
        el.dataset.adUnitState = 'client-only';
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
