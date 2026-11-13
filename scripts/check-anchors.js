#!/usr/bin/env node
/* Verifies every #fragment link (same-page and cross-page, internal) points to an id/name that exists on the target page. */
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, '..', 'public'); const cache = {}; let n = 0, bad = 0;
const ids = (f) => cache[f] || (cache[f] = new Set([...fs.readFileSync(f, 'utf8').matchAll(/\b(?:id|name)="([^"]+)"/g)].map((m) => m[1])));
const resolve = (u, from) => { let p = u.split('#')[0].split('?')[0]; if (!p) return from; if (!p.startsWith('/')) p = path.posix.join('/' + path.relative(PUB, path.dirname(from)).split(path.sep).join('/'), p);
  const c = path.join(PUB, p); for (const x of [c, c + '.html', path.join(c, 'index.html')]) if (fs.existsSync(x) && fs.statSync(x).isFile() && x.endsWith('.html')) return x; return null; };
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { walk(p); continue; } if (!f.endsWith('.html')) continue;
  for (const m of fs.readFileSync(p, 'utf8').matchAll(/href="([^"]*#[^"]+)"/g)) { const u = m[1]; if (/^https?:|^mailto:/.test(u)) continue; const frag = decodeURIComponent(u.split('#')[1]); if (!frag || frag === 'main' && false) continue;
    const t = resolve(u, p); n++; if (!t) continue; if (!ids(t).has(frag)) { bad++; console.log('DEAD ANCHOR', path.relative(PUB, p), '->', u); } } } })(PUB);
console.log(n, 'anchor links checked,', bad, 'dead'); process.exit(bad ? 1 : 0);
