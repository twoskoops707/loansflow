#!/usr/bin/env node
/* Builds public/author.html from the about.html chrome. */
const fs = require('fs'); const path = require('path');
const PUB = path.join(__dirname, '..', 'public');
let h = fs.readFileSync(path.join(PUB, 'about.html'), 'utf8');
const head = h.slice(0, h.indexOf('<main'));
const tail = h.slice(h.indexOf('</main>') + 7);
const T = 'Joshua Miller, CPA — Author | LoansFlow';
const D = 'Joshua Miller is a licensed California CPA and the founder and author of LoansFlow, an independent educational site about SBA and small business financing.';
let head2 = head
  .replace(/<title>[\s\S]*?<\/title>/, `<title>${T}</title>`)
  .replace(/(<meta name="description" content=")[^"]*"/, `$1${D}"`)
  .replace(/(<link rel="canonical" href=")[^"]*"/, '$1https://loansflow.loan/author.html"')
  .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${T}"`)
  .replace(/(<meta property="og:description" content=")[^"]*"/, `$1${D}"`)
  .replace(/(<meta property="og:url" content=")[^"]*"/, '$1https://loansflow.loan/author.html"')
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g, '');
const ld = {
  '@context': 'https://schema.org', '@type': 'ProfilePage', url: 'https://loansflow.loan/author.html', name: T,
  mainEntity: { '@type': 'Person', '@id': 'https://loansflow.loan/author.html#person', name: 'Joshua Miller', honorificSuffix: 'CPA',
    jobTitle: 'Certified Public Accountant', worksFor: { '@type': 'Organization', name: 'LoansFlow' }, url: 'https://loansflow.loan/author.html' },
};
head2 = head2.replace('</head>', `<script type="application/ld+json">\n${JSON.stringify(ld, null, 2)}\n</script>\n</head>`);
const photo = '<img class="author-icon" src="/img/author-icon.svg" alt="" width="96" height="96" decoding="async" style="border-radius:20px">';
const main = `<main class="legal-page">
    <h1>Joshua Miller, CPA</h1>
    ${photo}
    <p><strong>Founder and author, LoansFlow</strong></p>
    <p>Joshua Miller is a licensed Certified Public Accountant (California, 2009) with nearly two decades in public accounting, advising small businesses on financing, tax and cash flow. He is a QuickBooks Certified ProAdvisor and the founder of LoansFlow.</p>
    <h2>What he writes about</h2>
    <ul>
      <li>SBA 7(a), 504, Express and Microloan programs, and how lenders read a borrower's cash flow</li>
      <li>Debt service coverage (DSCR), owner add-backs and normalized earnings</li>
      <li>Lines of credit, term loans and equipment financing</li>
      <li>How loan interest and fees show up on a business tax return</li>
    </ul>
    <h2>How he works</h2>
    <p>Program rules, fees and limits are checked against primary sources such as SBA.gov before they are published, and dated. See our <a href="/editorial-policy.html">editorial policy</a> and <a href="/methodology.html">methodology</a> for how figures are sourced and updated.</p>
    <h2>Independence</h2>
    <p>LoansFlow is educational and independent. It is not a lender, broker or marketplace, and nothing on the site is an offer of credit or personalized tax, legal or financial advice. Some pages carry advertising or affiliate links; see our <a href="/disclosure.html">advertising and affiliate disclosure</a>.</p>
    <p><a href="/contact.html">Contact LoansFlow</a></p>
  </main>`;
fs.writeFileSync(path.join(PUB, 'author.html'), head2 + main + tail);
console.log('wrote author.html');
