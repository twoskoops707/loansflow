#!/usr/bin/env node
/* Loads every page of the site (served from public/) in jsdom with its scripts running and reports:
   uncaught JavaScript errors, console.error output, and any script/stylesheet/image/data file that fails to load.
   Usage: node scripts/check-js-errors.js        (starts its own local server; needs jsdom) */
const fs = require('fs'), path = require('path'), http = require('http');
const { JSDOM, VirtualConsole } = require('jsdom');
/* Only our own files run here. Third-party scripts (ads, analytics, embeds) are not ours to test: tags in the HTML are stripped
   below, and a script that a page adds at run time (js/ads.js adds the AdSense loader) is dropped by blockExternalScripts,
   so the result never depends on the network. Uses only DOM APIs, so it works with any jsdom version. */
function blockExternalScripts(w, base) {
  const external = (n) => n && n.tagName === 'SCRIPT' && n.src && !n.src.startsWith(base);
  for (const method of ['appendChild', 'insertBefore']) {
    const orig = w.Node.prototype[method];
    w.Node.prototype[method] = function (node, ...rest) { return external(node) ? node : orig.call(this, node, ...rest); };
  }
}
const PUB = path.join(__dirname, '..', 'public');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml' };
const fails = [];
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); let f = path.join(PUB, p);
  for (const c of [f, f + '.html', path.join(f, 'index.html')]) if (fs.existsSync(c) && fs.statSync(c).isFile()) { res.writeHead(200, { 'Content-Type': MIME[path.extname(c)] || 'application/octet-stream' }); return fs.createReadStream(c).pipe(res); }
  if (!req.url.startsWith('/api/')) fails.push(['404', req.url]); // /api/* are Cloudflare Functions, which only exist on the live site
   res.writeHead(404); res.end('not found');
});
const pages = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.html') && f !== '404.html') pages.push('/' + path.relative(PUB, p).replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '')); } })(PUB);
server.listen(0, async () => {
  const base = 'http://localhost:' + server.address().port; let errors = 0;
  for (const p of pages) {
    const vc = new VirtualConsole(), errs = [];
    vc.on('jsdomError', (e) => errs.push((e.detail && e.detail.message) || e.message)); vc.on('error', (...a) => errs.push('console.error: ' + a.join(' ').slice(0, 140)));
    try {
      // third-party scripts and fonts (ads, analytics) are not ours to test here, so strip them from the page before running it
      const html = (await (await fetch(base + p)).text()).replace(/<script[^>]+src="https?:\/\/[^"]*"[^>]*><\/script>/g, '').replace(/<link[^>]+href="https?:\/\/[^"]*"[^>]*>/g, '');
      const dom = new JSDOM(html, { url: base + p, runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
        beforeParse(w) { blockExternalScripts(w, base); w.fetch = (u, o) => { const t = new URL(u, base + p); return t.origin === base ? fetch(t, o) : Promise.reject(new Error('external request skipped in test')); }; w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })); w.scrollTo = () => {}; } });
      await new Promise((r) => setTimeout(r, 250)); dom.window.close();
    } catch (e) { errs.push('load failed: ' + e.message); }
    const real = errs.filter((e) => !/Could not parse CSS stylesheet|Not implemented: (navigation|window\.scrollTo|HTMLCanvasElement)|No slot size for availableWidth=0|non-zero width div container/i.test(e));
    if (real.length) { errors++; console.log('ERRORS', p, '\n   ', [...new Set(real)].slice(0, 3).join('\n    ')); }
  }
  const uniq = [...new Set(fails.map((x) => x.join(' ')))]; uniq.forEach((x) => console.log('FAILED LOAD', x));
  console.log(`${pages.length} pages loaded; ${errors} with script errors; ${uniq.length} files failed to load`); server.close(); process.exit(errors || uniq.length ? 1 : 0);
});
