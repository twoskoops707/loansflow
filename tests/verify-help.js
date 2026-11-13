#!/usr/bin/env node
/* Checks the "?" help cards on every calculator page: cards exist for jargon inputs, open on click, close on Escape / outside click,
   and lists inputs that have NO help so new jargon gets reviewed. Run: node tests/verify-help.js */
const fs = require('fs'), path = require('path'); const { JSDOM } = require('jsdom');
const PUB = path.join(__dirname, '..', 'public'); let checks = 0, fails = 0; const noHelp = new Set();
const ok = (n, c) => { checks++; if (!c) { fails++; console.log('FAIL', n); } };
(async () => {
  for (const f of fs.readdirSync(path.join(PUB, 'calculators')).filter((x) => x.endsWith('.html') && x !== 'index.html')) {
    const html = fs.readFileSync(path.join(PUB, 'calculators', f), 'utf8'); if (!/data-calc="/.test(html)) continue;
    const w = new JSDOM(html, { runScripts: 'outside-only', url: 'https://loansflow.loan/calculators/' + f }).window; w.fetch = () => Promise.reject(new Error('offline'));
    for (const s of ['sba-policy.js', 'lf-math.js', 'lf-charts.js', 'lf-calc.js']) w.eval(fs.readFileSync(path.join(PUB, 'js', s), 'utf8'));
    w.document.dispatchEvent(new w.Event('DOMContentLoaded')); await new Promise((r) => setTimeout(r, 40));
    const d = w.document, fields = [...d.querySelectorAll('.lf-field')], btns = [...d.querySelectorAll('.lf-help')];
    fields.forEach((fl) => { if (!fl.querySelector('.lf-help')) noHelp.add(fl.querySelector('label').textContent.trim()); });
    for (const b of btns) { const card = d.getElementById(b.getAttribute('aria-controls')); ok(`${f}: card exists for ${b.getAttribute('aria-label')}`, !!card && card.textContent.length > 40 && !/undefined|NaN/.test(card.textContent)); ok(`${f}: card starts hidden`, card.hidden === true); }
    if (btns.length) {
      const b = btns[0], card = d.getElementById(b.getAttribute('aria-controls'));
      b.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); ok(`${f}: click opens`, !card.hidden && b.getAttribute('aria-expanded') === 'true');
      d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); ok(`${f}: Escape closes`, card.hidden && b.getAttribute('aria-expanded') === 'false');
      b.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); d.body.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); ok(`${f}: outside click closes`, card.hidden);
      if (btns[1]) { b.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); btns[1].dispatchEvent(new w.MouseEvent('click', { bubbles: true })); ok(`${f}: only one card open`, card.hidden); }
    }
  }
  console.log('Inputs without a help card (review for jargon):', [...noHelp].sort().join(' | '));
  console.log(`${checks} help checks, ${fails} failures`); process.exit(fails ? 1 : 0);
})();
