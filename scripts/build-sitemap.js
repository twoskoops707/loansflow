#!/usr/bin/env node
/* Regenerates public/sitemap.xml from every indexable page's canonical URL. Skips noindex pages, 404 and redirect stubs.
   lastmod = date of the last git commit touching the file. */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const PUB = path.join(__dirname, '..', 'public');
const out = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) { walk(p); continue; }
    if (!f.endsWith('.html')) continue;
    const rel = path.relative(PUB, p);
    if (rel === '404.html' || rel === 'tools/index.html') continue;
    const h = fs.readFileSync(p, 'utf8');
    if (/<meta name="robots" content="[^"]*noindex/i.test(h)) continue;
    const m = h.match(/<link rel="canonical" href="([^"]+)"/); if (!m) continue;
    let d8 = '';
    try { d8 = cp.execSync(`git log -1 --format=%cs -- "${p}"`, { cwd: PUB }).toString().trim(); } catch (_) {}
    const url = m[1];
    const depth = url.replace('https://loansflow.loan', '').split('/').filter(Boolean).length;
    const pr = url === 'https://loansflow.loan/' ? 1 : /\/(loans|guides|calculators|compare)\/$/.test(url) ? 0.9 : /\/loans\//.test(url) ? 0.8 : depth <= 1 ? 0.6 : 0.7;
    out.push({ url, d8: d8 || new Date().toISOString().slice(0, 10), pr });
  }
})(PUB);
out.sort((a, b) => b.pr - a.pr || a.url.localeCompare(b.url));
const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  out.map((o) => `  <url><loc>${o.url}</loc><lastmod>${o.d8}</lastmod><priority>${o.pr}</priority></url>`).join('\n') + '\n</urlset>\n';
fs.writeFileSync(path.join(PUB, 'sitemap.xml'), xml);
console.log(out.length + ' URLs');
