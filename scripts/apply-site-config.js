#!/usr/bin/env node
/* Injects the Search Console verification meta tag and the Cloudflare Web Analytics beacon (cookieless) from site.config.json
   into every page, between marker comments. Empty values remove the block. Idempotent. */
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, '..', 'public');
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'site.config.json'), 'utf8'));
const safe = (v) => /^[A-Za-z0-9_\-]{8,}$/.test(v || '');
const parts = [];
if (safe(cfg.gscVerificationToken)) parts.push(`<meta name="google-site-verification" content="${cfg.gscVerificationToken}">`);
if (safe(cfg.cloudflareBeaconToken)) parts.push(`<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${cfg.cloudflareBeaconToken}"}'></script>`);
const block = parts.length ? `<!-- site-config:start -->\n  ${parts.join('\n  ')}\n  <!-- site-config:end -->` : '';
const re = /\n?\s*<!-- site-config:start -->[\s\S]*?<!-- site-config:end -->/;
const PRIV = /<p id="analytics-note">[\s\S]*?<\/p>\s*/;
let n = 0;
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) { walk(p); continue; }
    if (!f.endsWith('.html')) continue;
    let h = fs.readFileSync(p, 'utf8'); const o = h;
    h = h.replace(re, '');
    if (block) h = h.replace('</head>', `  ${block}\n</head>`);
    if (path.relative(PUB, p) === 'privacy.html') {
      h = h.replace(PRIV, '');
      if (safe(cfg.cloudflareBeaconToken)) h = h.replace('<p><strong>Cookies:</strong>', '<p id="analytics-note"><strong>Analytics:</strong> We use Cloudflare Web Analytics to count visits and see which pages are read. It does not use cookies or track individual visitors across sites.</p>\n    <p><strong>Cookies:</strong>');
    }
    if (h !== o) { fs.writeFileSync(p, h); n++; }
  }
})(PUB);
console.log(parts.length ? `injected ${parts.length} item(s) into ${n} pages` : `config empty; removed any previous block (${n} pages changed)`);
