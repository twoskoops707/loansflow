/* LoansFlow charts: small, dependency-free SVG/HTML chart builders. Pure string functions, usable in the browser and in Node. */
(function (root) {
  'use strict';
  var C = {};
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var money = function (n) { return '$' + Math.round(n).toLocaleString('en-US'); };
  C.money = money;
  var title = function (t) { return t ? '<div class="ch-t">' + esc(t) + '</div>' : ''; };

  /** Horizontal stacked bar with a legend. parts: [{label, value, text?}] */
  C.stack = function (t, parts, fmt) {
    var total = parts.reduce(function (s, p) { return s + Math.max(0, p.value); }, 0) || 1;
    var f = fmt || money;
    return '<figure class="ch ch-stack">' + title(t) +
      '<div class="ch-bar" role="img" aria-label="' + esc(t + ': ' + parts.map(function (p) { return p.label + ' ' + (p.text || f(p.value)); }).join(', ')) + '">' +
      parts.map(function (p, i) { var w = Math.max(0, p.value) / total * 100; return w > 0 ? '<span class="ch-seg c' + (i % 5 + 1) + '" style="width:' + w.toFixed(2) + '%"><i>' + (w >= 9 ? Math.round(w) + '%' : '') + '</i></span>' : ''; }).join('') +
      '</div><ul class="ch-leg">' + parts.map(function (p, i) { return '<li><span class="sw c' + (i % 5 + 1) + '"></span>' + esc(p.label) + '<b>' + esc(p.text || f(p.value)) + '</b></li>'; }).join('') + '</ul></figure>';
  };

  /** Donut. parts: [{label, value, text?}] ; center: [top, bottom] */
  C.donut = function (t, parts, center, fmt) {
    var total = parts.reduce(function (s, p) { return s + Math.max(0, p.value); }, 0) || 1, r = 40, circ = 2 * Math.PI * r, off = 0, f = fmt || money;
    var segs = parts.map(function (p, i) {
      var len = Math.max(0, p.value) / total * circ;
      var s = '<circle class="ch-arc c' + (i % 5 + 1) + '" cx="60" cy="60" r="' + r + '" stroke-dasharray="' + len.toFixed(2) + ' ' + (circ - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 60 60)"/>';
      off += len; return s;
    }).join('');
    return '<figure class="ch ch-donut">' + title(t) + '<div class="ch-donutwrap"><svg viewBox="0 0 120 120" role="img" aria-label="' + esc(t) + '"><circle class="ch-track" cx="60" cy="60" r="' + r + '"/>' + segs +
      (center ? '<text x="60" y="57" text-anchor="middle" class="ch-c1">' + esc(center[0]) + '</text><text x="60" y="73" text-anchor="middle" class="ch-c2">' + esc(center[1]) + '</text>' : '') + '</svg>' +
      '<ul class="ch-leg">' + parts.map(function (p, i) { return '<li><span class="sw c' + (i % 5 + 1) + '"></span>' + esc(p.label) + '<b>' + esc(p.text || f(p.value)) + '</b></li>'; }).join('') + '</ul></div></figure>';
  };

  /** Semicircle gauge for DSCR (0 to 2x). */
  C.gauge = function (t, value) {
    var cx = 100, cy = 100, r = 80, max = 2;
    var pt = function (v, rad) { var a = Math.PI * (1 - Math.min(Math.max(v, 0), max) / max); return [cx + rad * Math.cos(a), cy - rad * Math.sin(a)]; };
    var arc = function (a, b, cls) { var p = pt(a, r), q = pt(b, r); return '<path class="ch-zone ' + cls + '" d="M' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ' A' + r + ' ' + r + ' 0 0 1 ' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + '"/>'; };
    var n = pt(value, r - 14), v = isFinite(value) ? value : max;
    var verdict = v >= 1.25 ? 'Comfortable' : v >= 1 ? 'Thin cushion' : 'Short of the payment';
    return '<figure class="ch ch-gauge">' + title(t) + '<svg viewBox="0 0 200 124" role="img" aria-label="' + esc(t + ' ' + v.toFixed(2) + 'x, ' + verdict) + '">' +
      arc(0, 1, 'z1') + arc(1, 1.25, 'z2') + arc(1.25, 2, 'z3') +
      '<path class="ch-needle" d="M' + cx + ' ' + cy + ' L' + n[0].toFixed(1) + ' ' + n[1].toFixed(1) + '"/><circle class="ch-hub" cx="' + cx + '" cy="' + cy + '" r="6"/>' +
      '<text x="100" y="92" text-anchor="middle" class="ch-big">' + (isFinite(value) ? value.toFixed(2) + 'x' : 'n/a') + '</text>' +
      '<text x="14" y="118" class="ch-tick">0</text><text x="100" y="22" text-anchor="middle" class="ch-tick">1.0</text><text x="186" y="118" text-anchor="end" class="ch-tick">2.0+</text></svg>' +
      '<div class="ch-verdict v' + (v >= 1.25 ? 3 : v >= 1 ? 2 : 1) + '">' + verdict + '</div></figure>';
  };

  /** Horizontal bars. rows: [{label, value, text, note?, on?}] ; opts: {scale:'log', max} */
  C.hbars = function (t, rows, opts) {
    opts = opts || {};
    var vals = rows.map(function (r) { return opts.scale === 'log' ? Math.log10(Math.max(r.value, 1)) : r.value; });
    var max = opts.max ? (opts.scale === 'log' ? Math.log10(opts.max) : opts.max) : Math.max.apply(null, vals) || 1;
    return '<figure class="ch ch-hbars">' + title(t) + rows.map(function (r, i) {
      var w = Math.max(2, vals[i] / max * 100);
      return '<div class="ch-row' + (r.on ? ' on' : '') + '"><span class="ch-lab">' + esc(r.label) + (r.note ? '<small>' + esc(r.note) + '</small>' : '') + '</span><span class="ch-track2"><span class="ch-fill' + (r.cls ? ' ' + r.cls : '') + '" style="width:' + w.toFixed(1) + '%"></span></span><b>' + esc(r.text) + '</b></div>';
    }).join('') + '</figure>';
  };

  /** Break-even line chart: cumulative savings versus one-time cost. */
  C.breakeven = function (t, monthlySavings, cost, breakEvenMonths) {
    if (!(monthlySavings > 0)) return '';
    var months = Math.min(120, Math.max(24, Math.ceil((breakEvenMonths || 24) * 2 / 12) * 12));
    var W = 320, H = 150, L = 8, R = 8, T = 14, B = 26, top = Math.max(cost, monthlySavings * months) * 1.08;
    var x = function (m) { return L + (W - L - R) * m / months; }, y = function (v) { return H - B - (H - T - B) * v / top; };
    var line = 'M' + x(0).toFixed(1) + ' ' + y(0).toFixed(1) + ' L' + x(months).toFixed(1) + ' ' + y(monthlySavings * months).toFixed(1);
    var be = breakEvenMonths && breakEvenMonths <= months ? '<line class="ch-be" x1="' + x(breakEvenMonths).toFixed(1) + '" x2="' + x(breakEvenMonths).toFixed(1) + '" y1="' + T + '" y2="' + (H - B) + '"/><circle class="ch-dot" cx="' + x(breakEvenMonths).toFixed(1) + '" cy="' + y(cost).toFixed(1) + '" r="4.5"/><text class="ch-tick" x="' + Math.min(x(breakEvenMonths) + 8, W - 70).toFixed(1) + '" y="' + (T + 8) + '">Break-even: month ' + Math.round(breakEvenMonths) + '</text>' : '';
    return '<figure class="ch ch-line">' + title(t) + '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(t) + '"><path class="ch-axis" d="M' + L + ' ' + (H - B) + ' H' + (W - R) + '"/>' +
      '<path class="ch-area" d="' + line + ' L' + x(months).toFixed(1) + ' ' + y(0).toFixed(1) + ' Z"/><path class="ch-cost" d="M' + x(0).toFixed(1) + ' ' + y(cost).toFixed(1) + ' H' + x(months).toFixed(1) + '"/><path class="ch-save" d="' + line + '"/>' + be +
      '<text class="ch-tick" x="' + L + '" y="' + (H - 8) + '">today</text><text class="ch-tick" x="' + (W - R) + '" y="' + (H - 8) + '" text-anchor="end">' + months + ' months</text></svg>' +
      '<ul class="ch-leg"><li><span class="sw c1"></span>Savings so far<b>' + money(monthlySavings * months) + ' by month ' + months + '</b></li><li><span class="sw c2"></span>Closing costs<b>' + money(cost) + '</b></li></ul></figure>';
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = C; else root.LFChart = C;
})(typeof window !== 'undefined' ? window : this);
