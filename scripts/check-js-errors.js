#!/usr/bin/env node
/* Loads every page of the site (served from public/) in jsdom with its scripts running and reports:
   uncaught JavaScript errors, console.error output, and any script/stylesheet/image/data file that fails to load.
   Usage: node scripts/check-js-errors.js        (starts its own local server; needs jsdom) */
const fs = require('fs'), path = require('path'), http = require('http');
const { JSDOM, VirtualConsole } = require('jsdom');
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
        beforeParse(w) { w.fetch = (u, o) => fetch(new URL(u, base + p), o); w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })); w.scrollTo = () => {}; } });
      await new Promise((r) => setTimeout(r, 250)); dom.window.close();
    } catch (e) { errs.push('load failed: ' + e.message); }
    const real = errs.filter((e) => !/Could not parse CSS stylesheet|Not implemented: (navigation|window\.scrollTo|HTMLCanvasElement)|No slot size for availableWidth=0|non-zero width div container/i.test(e));
    if (real.length) { errors++; console.log('ERRORS', p, '\n   ', [...new Set(real)].slice(0, 3).join('\n    ')); }
  }
  const uniq = [...new Set(fails.map((x) => x.join(' ')))]; uniq.forEach((x) => console.log('FAILED LOAD', x));
  console.log(`${pages.length} pages loaded; ${errors} with script errors; ${uniq.length} files failed to load`); server.close(); process.exit(errors || uniq.length ? 1 : 0);
});
