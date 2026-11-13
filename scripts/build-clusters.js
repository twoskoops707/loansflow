#!/usr/bin/env node
/* Topic clusters (hub and spoke). Each loan page is a hub that links to its supporting guides, calculators and comparisons;
   each of those pages links back to its hub(s) plus related pages. Link text comes from each page's own <title>, so renamed pages stay correct.
   Idempotent: content lives between <!--lf-cluster--> / <!--lf-hub--> markers. Run:  node scripts/build-clusters.js */
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, '..', 'public');
const C = [
  { hub: 'loans/sba-7a', name: 'SBA 7(a)', guides: ['sba-7a-step-by-step', 'sba-loan-eligibility', 'loan-documents', 'checklist', 'business-plan-for-a-loan', 'dscr-explained', 'dscr-cpa-view', 'owner-add-backs-ebitda', 'sba-loan-interest-tax-treatment', 'choosing-lender'],
    calcs: ['sba-7a', 'sba-guarantee-fee', 'sba-equity-injection', 'business-acquisition', 'cash-to-close', 'prepayment-penalty', 'business-valuation-sde', 'global-dscr'], compare: ['sba-7a-vs-504', 'sba-vs-conventional-term-loan', 'sba-vs-online-lender'], extra: ['loans/sba-7a-rates', 'resources/'] },
  { hub: 'loans/sba-504', name: 'SBA 504', guides: ['sba-504', 'sba-loan-eligibility', 'loan-documents', 'business-plan-for-a-loan', 'dscr-explained'], calcs: ['sba-504', 'commercial-real-estate', 'dscr'], compare: ['sba-7a-vs-504', 'sba-vs-conventional-term-loan'], extra: ['resources/'] },
  { hub: 'loans/sba-express', name: 'SBA Express', guides: ['sba-express-microloans-caplines', 'sba-7a-step-by-step', 'loan-documents'], calcs: ['sba-express', 'sba-guarantee-fee', 'line-of-credit'], compare: ['sba-vs-online-lender', 'sba-vs-conventional-term-loan'], extra: ['loans/sba-7a-rates'] },
  { hub: 'loans/sba-microloan', name: 'SBA Microloan', guides: ['sba-express-microloans-caplines', 'business-plan-for-a-loan', 'loan-documents'], calcs: ['loan-payment', 'how-much-can-i-borrow'], compare: ['sba-vs-online-lender'], extra: ['resources/'] },
  { hub: 'loans/line-of-credit', name: 'business line of credit', guides: ['term-loan-vs-line-of-credit', 'choosing-lender', 'loan-documents'], calcs: ['line-of-credit', 'how-much-can-i-borrow', 'merchant-cash-advance-cost', 'dscr'], compare: ['sba-vs-online-lender'], extra: ['resources/'] },
  { hub: 'loans/commercial-term-loan', name: 'commercial term loan', guides: ['term-loan-vs-line-of-credit', 'dscr-explained', 'dscr-cpa-view', 'business-plan-for-a-loan', 'loan-documents', 'choosing-lender'], calcs: ['loan-payment', 'commercial-real-estate', 'how-much-can-i-borrow', 'global-dscr', 'prepayment-penalty', 'dscr'], compare: ['sba-vs-conventional-term-loan', 'sba-7a-vs-504'], extra: ['resources/'] },
  { hub: 'loans/equipment-financing', name: 'equipment financing', guides: ['choosing-lender', 'loan-documents', 'term-loan-vs-line-of-credit'], calcs: ['equipment-payment', 'equipment-term-comparison', 'lease-vs-loan', 'loan-payment'], compare: ['sba-vs-online-lender'], extra: ['resources/'] },
  { hub: 'loans/mortgage', name: 'mortgage', guides: ['mortgage-closing-costs', 'refinance-break-even', 'loan-documents', 'choosing-lender'], calcs: ['mortgage-payment', 'home-affordability', 'refinance-break-even', 'loan-payment'], compare: [], extra: [] }
];
const read = (rel) => { const p = path.join(PUB, rel.endsWith('.html') || rel.endsWith('/') ? rel : rel + '.html'); const f = rel.endsWith('/') ? path.join(PUB, rel, 'index.html') : p; return fs.existsSync(f) ? { f, h: fs.readFileSync(f, 'utf8') } : null; };
const titleOf = (rel) => { const r = read(rel); if (!r) return null; const m = r.h.match(/<title>([\s\S]*?)<\/title>/); return m ? m[1].replace(/\s*[|—]\s*LoansFlow\s*$/, '').replace(/&amp;/g, '&amp;').trim() : null; };
const urlOf = (rel) => '/' + rel.replace(/\.html$/, '').replace(/\/index$/, '/');
const li = (rel) => { const t = titleOf(rel); return t ? `<li><a href="${urlOf(rel)}">${t}</a></li>` : ''; };
const group = (h, rels) => { const items = rels.map(li).filter(Boolean); return items.length ? `<h3>${h}</h3><ul>${items.join('')}</ul>` : ''; };
const spokeOf = {}; // page rel -> [cluster]
for (const c of C) for (const [dir, list] of [['guides', c.guides], ['calculators', c.calcs], ['compare', c.compare]]) for (const s of list) (spokeOf[`${dir}/${s}`] = spokeOf[`${dir}/${s}`] || []).push(c);
let hubs = 0, spokes = 0;
for (const c of C) { // hubs
  const r = read(c.hub); if (!r) continue;
  const block = '<!--lf-cluster:start-->' + group('Guides', c.guides.map((g) => 'guides/' + g)) + group('Calculators', c.calcs.map((x) => 'calculators/' + x)) + group('Comparisons', c.compare.map((x) => 'compare/' + x)) + group('Rates, data and templates', c.extra) +
    '<ul><li><a href="/alternative-financing/">Uncommon ways to finance</a></li><li><a href="/grants/">Search federal grants</a></li></ul><!--lf-cluster:end-->';
  let h = r.h;
  if (h.includes('<!--lf-cluster:start-->')) h = h.replace(/<!--lf-cluster:start-->[\s\S]*?<!--lf-cluster:end-->/, () => block);
  else h = h.replace(/(<h2 id="more">Keep reading<\/h2>)\s*<ul>[\s\S]*?<\/ul>/, (m, a) => a + block);
  if (h !== r.h) { fs.writeFileSync(r.f, h); hubs++; }
}
for (const [rel, cs] of Object.entries(spokeOf)) { // spokes
  const r = read(rel); if (!r) continue;
  const hubLinks = cs.map((c) => `<a href="${urlOf(c.hub)}">${titleOf(c.hub).split(':')[0]}</a>`).join(' and ');
  const sib = [...new Set(cs.flatMap((c) => [...c.guides.map((g) => 'guides/' + g), ...c.calcs.map((x) => 'calculators/' + x), ...c.compare.map((x) => 'compare/' + x)]))].filter((x) => x !== rel).slice(0, 5);
  const box = `<!--lf-hub:start--><aside class="lf-box lf-hubbox" style="margin:2rem 0;max-width:72ch"><p><strong>Part of our ${cs.map((c) => c.name).join(' and ')} resources.</strong> Start at the ${hubLinks} page for requirements, rates and how to apply.</p><ul>${sib.map(li).join('')}</ul></aside><!--lf-hub:end-->`;
  let h = r.h;
  if (h.includes('<!--lf-hub:start-->')) h = h.replace(/<!--lf-hub:start-->[\s\S]*?<!--lf-hub:end-->/, () => box);
  else if (h.includes('<section class="author-box">')) h = h.replace('<section class="author-box">', box + '\n<section class="author-box">');
  else { console.log('no insertion point:', rel); continue; }
  if (h !== r.h) { fs.writeFileSync(r.f, h); spokes++; }
}
console.log(`clusters: ${hubs} hubs and ${spokes} spoke pages updated`);
