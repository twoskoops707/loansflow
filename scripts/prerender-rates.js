#!/usr/bin/env node
/* Pre-renders the live rates cards (js/rates-widget.js) into every page that has <div data-lf-rates>, from public/data/rates.json.
   The browser script later replaces the cards with identical markup, so nothing shifts when it loads (fixes layout shift),
   and crawlers see the rates without JavaScript. Run after the rates refresh (daily workflow). Needs jsdom. */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const PUB = path.join(__dirname, '..', 'public');
const rates = fs.readFileSync(path.join(PUB, 'data', 'rates.json'), 'utf8');
const widget = fs.readFileSync(path.join(PUB, 'js', 'rates-widget.js'), 'utf8');
const files = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.html')) files.push(p); } })(PUB);
(async () => {
  let n = 0, changed = 0;
  for (const f of files) {
    let h = fs.readFileSync(f, 'utf8'); if (!h.includes('data-lf-rates')) continue;
    const dom = new JSDOM(h, { runScripts: 'outside-only', url: 'https://loansflow.loan/' }); const w = dom.window;
    w.fetch = () => Promise.resolve({ json: () => Promise.resolve(JSON.parse(rates)) });
    w.eval(widget); await new Promise((r) => setTimeout(r, 30));
    const hosts = [...w.document.querySelectorAll('[data-lf-rates]')]; let i = 0;
    const out = h.replace(/<div data-lf-rates(="[a-z]*")?( class="lfr")?>(<!--lf-rates-->[\s\S]*?<!--\/lf-rates-->)?<\/div>/g, (m, mode) => {
      const el = hosts[i++]; if (!el || el.hidden || !el.innerHTML) return m;
      return `<div data-lf-rates${mode || ''} class="lfr"><!--lf-rates-->${el.innerHTML}<!--/lf-rates--></div>`;
    });
    n++; if (out !== h) { fs.writeFileSync(f, out); changed++; }
  }
  console.log(`rates cards pre-rendered on ${n} pages (${changed} updated)`);
})();
