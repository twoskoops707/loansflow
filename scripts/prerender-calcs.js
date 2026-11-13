#!/usr/bin/env node
/* Pre-renders every calculator at its default inputs so the page has real, crawlable numbers without JavaScript.
   It runs the SAME lf-math.js / lf-calc.js the browser runs (in jsdom) with the live prime/mortgage rate from
   public/data/market-news.json, then writes a static block + <noscript> note inside each <div data-calc>.
   When JS runs, lf-calc.js replaces the block with the interactive calculator.
   Needs jsdom (npm i --no-save jsdom). Re-run whenever rates change; the daily workflow does this.
   Usage: node scripts/prerender-calcs.js            */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const PUB = path.join(__dirname, '..', 'public');
const news = JSON.parse(fs.readFileSync(path.join(PUB, 'data', 'market-news.json'), 'utf8'));
const M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const long = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? `${M[+m[2] - 1]} ${+m[3]}, ${m[1]}` : ''; };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const START = '<!--lf-static:start-->', END = '<!--lf-static:end-->';

async function render(file) {
  const html = fs.readFileSync(file, 'utf8');
  const w = new JSDOM(html, { runScripts: 'outside-only', url: 'https://loansflow.loan/calculators/x' }).window;
  w.fetch = () => Promise.resolve({ json: () => Promise.resolve(news) });
  for (const s of ['lf-math.js', 'lf-charts.js', 'lf-calc.js']) w.eval(fs.readFileSync(path.join(PUB, 'js', s), 'utf8'));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  await new Promise((r) => setTimeout(r, 80));
  const el = w.document.querySelector('[data-calc]');
  const q = (n, s) => [...n.querySelectorAll(s)];
  const inputs = q(el, '.lf-field').map((f) => {
    const label = f.querySelector('label').textContent.trim(), c = f.querySelector('[data-f]');
    const val = c.tagName === 'SELECT' ? c.options[c.selectedIndex].textContent : c.value;
    const aff = q(f, '.lf-affix').map((a) => a.textContent.trim());
    const pre = f.querySelector('.lf-input > .lf-affix:first-child') && c.tagName !== 'SELECT' ? aff[0] : '';
    const suf = aff.length > (pre ? 1 : 0) ? aff[aff.length - 1] : '';
    return [label, `${pre || ''}${val}${suf ? (suf[0] === '%' ? suf : ' ' + suf) : ''}`];
  });
  const res = el.querySelector('.lf-result');
  const head = res.querySelector('.lf-head');
  const rows = q(res, '.lf-rows > div').map((d) => [d.children[0].textContent, d.children[1].textContent]);
  const notes = q(res, '.lf-notes li').map((n) => n.textContent);
  return { title: el.querySelector('.lf-title').textContent, inputs, head: head ? [head.children[0].textContent, head.children[1].textContent] : null, rows, notes, text: res.textContent };
}

function block(r) {
  const asof = news.prime && news.prime.asOf ? long(news.prime.asOf) : '';
  return START + '<div class="lf-static">' +
    '<noscript><p class="lf-calc-nojs">JavaScript is off, so the interactive calculator is hidden. The worked result below uses the calculator&rsquo;s default inputs.</p></noscript>' +
    `<h3 class="lf-title">${esc(r.title)}: default example</h3>` +
    '<table class="lf-table"><caption>Default inputs</caption><tbody>' + r.inputs.map((i) => `<tr><th scope="row">${esc(i[0])}</th><td>${esc(i[1])}</td></tr>`).join('') + '</tbody></table>' +
    (r.head ? `<p class="lf-head"><span>${esc(r.head[0])}</span> <strong>${esc(r.head[1])}</strong></p>` : '') +
    '<table class="lf-table"><caption>Results at those inputs</caption><tbody>' + r.rows.map((i) => `<tr><th scope="row">${esc(i[0])}</th><td>${esc(i[1])}</td></tr>`).join('') + '</tbody></table>' +
    (r.notes.length ? '<ul class="lf-notes">' + r.notes.map((n) => `<li>${esc(n)}</li>`).join('') + '</ul>' : '') +
    `<p class="lf-figcap">Computed from the formulas on our <a href="/methodology">methodology</a> page${asof ? `, with the latest FRED DPRIME prime reading (${asof}) where a rate is pre-filled` : ''}. Estimates, not offers.</p>` +
    '</div>' + END;
}

(async () => {
  let changed = 0, n = 0, bad = 0;
  for (const f of fs.readdirSync(path.join(PUB, 'calculators')).filter((x) => x.endsWith('.html') && x !== 'index.html')) {
    const p = path.join(PUB, 'calculators', f); const h = fs.readFileSync(p, 'utf8');
    if (!/data-calc="/.test(h)) continue;
    n++;
    const r = await render(p);
    if (!r.rows.length || /NaN|Infinity|undefined/.test(r.text)) { console.log('SKIP (bad render)', f); bad++; continue; }
    const b = block(r);
    let out;
    if (h.includes(START)) out = h.replace(new RegExp(START + '[\\s\\S]*?' + END), () => b);
    else out = h.replace(/<p class="lf-calc-nojs">[^<]*<\/p>/, () => b);
    if (out === h && !h.includes(START)) { console.log('NO ANCHOR', f); bad++; continue; }
    if (out !== h) { fs.writeFileSync(p, out); changed++; }
  }
  console.log(`prerendered ${n} calculators, ${changed} files updated${bad ? ', ' + bad + ' problems' : ''}`);
  process.exit(bad ? 1 : 0);
})();
