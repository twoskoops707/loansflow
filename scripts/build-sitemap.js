#!/usr/bin/env node
/* Regenerates public/sitemap.xml from every indexable page's canonical URL. Skips noindex pages, 404 and redirect stubs.
   lastmod = today for a page changed in this run (not committed yet); otherwise the later of the date already in the sitemap and the
   page's last git commit. Scheduled jobs use a one-commit checkout, where git would report today's date for every page, so
   git dates are used only when the full history is present. */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const PUB = path.join(__dirname, '..', 'public');
const out = [];
const git = (args) => { try { return cp.execSync('git ' + args, { cwd: PUB, maxBuffer: 64 * 1024 * 1024 }).toString(); } catch (_) { return ''; } };
const today = new Date().toISOString().slice(0, 10);
const prev = {}; try { for (const m of fs.readFileSync(path.join(PUB, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g)) prev[m[1]] = m[2]; } catch (_) {}
const dirty = new Set(git('status --porcelain -- .').split('\n').filter(Boolean).map((l) => path.resolve(PUB, '..', l.slice(3).replace(/^"|"$/g, ''))));
const fullHistory = git('rev-parse --is-shallow-repository').trim() === 'false';
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
    const url = m[1];
    let d8 = prev[url] || '';
    if (dirty.has(p)) d8 = today;
    else if (fullHistory) { const g = git(`log -1 --format=%cs -- "${p}"`).trim(); if (g > d8) d8 = g; }
    const depth = url.replace('https://loansflow.loan', '').split('/').filter(Boolean).length;
    const pr = url === 'https://loansflow.loan/' ? 1 : /\/(loans|guides|calculators|compare)\/$/.test(url) ? 0.9 : /\/loans\//.test(url) ? 0.8 : depth <= 1 ? 0.6 : 0.7;
    out.push({ url, d8: d8 || today, pr });
  }
})(PUB);
out.sort((a, b) => b.pr - a.pr || a.url.localeCompare(b.url));
const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  out.map((o) => `  <url><loc>${o.url}</loc><lastmod>${o.d8}</lastmod><priority>${o.pr}</priority></url>`).join('\n') + '\n</urlset>\n';
fs.writeFileSync(path.join(PUB, 'sitemap.xml'), xml);
console.log(out.length + ' URLs');
