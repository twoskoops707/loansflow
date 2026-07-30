/**
 * DEPRECATED — do not load this file.
 * Ezoic header scripts are now static tags in each HTML <head>
 * (Gatekeeper CMP → sa.min.js → ezstandalone.cmd → analytics.js)
 * so pubdash CHECK CONNECTION / crawlers see sa.min.js in page source.
 *
 * Canonical snippet: docs/automation/ezoic-snippet.txt
 * Docs: https://docs.ezoic.com/docs/ezoicads/integration/
 * Publisher userId (account): 652581 — JS integration is domain-bound (loansflow.loan); no fake site ID.
 */
(function () {
  if (typeof console !== 'undefined' && console.warn) {
    console.warn('[LoansFlow] ezoic-boot.js is deprecated; use static head tags.');
  }
})();
