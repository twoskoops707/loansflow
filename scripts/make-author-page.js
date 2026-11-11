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
    jobTitle: 'Certified Public Accountant', knowsAbout: ['SBA loans', 'Small business financing', 'Business valuation', 'Business acquisitions', 'Tax planning for small businesses', 'S corporations', 'Multi-state taxation', 'Research and development tax credits'], worksFor: { '@type': 'Organization', name: 'LoansFlow' }, url: 'https://loansflow.loan/author.html' },
};
head2 = head2.replace('</head>', `<script type="application/ld+json">\n${JSON.stringify(ld, null, 2)}\n</script>\n</head>`);
const photo = '<img class="author-icon" src="/img/author-icon.svg" alt="" width="96" height="96" decoding="async" style="border-radius:20px">';
const main = `<main class="legal-page">
    <h1>Joshua Miller, CPA</h1>
    ${photo}
    <p><strong>Founder and author, LoansFlow</strong></p>
    <p>Joshua Miller is a licensed Certified Public Accountant (California, 2009) with nearly two decades in public accounting. He works with owner-operated and closely held businesses on the money decisions that matter most: how to finance growth, how to buy or sell a company, what a business is worth, and what it all means for the tax return and the cash flow behind it. He founded LoansFlow to put that practical, numbers-first view in front of borrowers before they sit down with a lender.</p>
    <h2>Where his experience sits</h2>
    <h3>Small business financing and cash flow</h3>
    <p>Lenders approve loans on cash flow, so much of his work is preparing the financial picture a lender will read: clean statements, a clear debt schedule, realistic projections and an honest debt service coverage ratio. See <a href="/guides/dscr-cpa-view.html">DSCR from a CPA&rsquo;s view</a> and the <a href="/loans/sba-7a.html">SBA 7(a) guide</a>.</p>
    <h3>Business valuations and normalized earnings</h3>
    <p>Whether a company is being bought, sold, financed or restructured, the starting point is a defensible earnings figure. That means adjusting reported profit for owner pay, personal expenses and one-time items, and documenting each adjustment so it holds up to a lender or a buyer. See <a href="/guides/owner-add-backs-ebitda.html">owner add-backs and EBITDA normalization</a>.</p>
    <h3>Acquisitions and deal structure</h3>
    <p>Buying a business adds questions a standard loan does not: how much equity the buyer must contribute, how a seller note is treated, how the purchase price is allocated, and how much cash is needed at closing. Try the <a href="/calculators/business-acquisition.html">business acquisition calculator</a> and the <a href="/calculators/cash-to-close.html">cash-to-close estimator</a>.</p>
    <h3>Tax planning for owners</h3>
    <p>Entity choice and structure change the tax result of a loan or a deal. His experience includes S corporations, multi-state businesses and the research and development credit, and how those facts show up in a lender&rsquo;s view of earnings. See <a href="/guides/sba-loan-interest-tax-treatment.html">tax treatment of SBA loan interest and fees</a>.</p>
    <h2>How he works</h2>
    <p>Program rules, fees and limits are checked against primary sources such as SBA.gov and the IRS before they are published, and every figure carries a date. See our <a href="/editorial-policy.html">editorial policy</a> and <a href="/methodology.html">methodology</a> for how figures are sourced and updated.</p>
    <h2>Independence</h2>
    <p>LoansFlow is educational and independent. It is not a lender, broker or marketplace, and nothing on the site is an offer of credit or personalized tax, legal or financial advice. Some pages carry advertising or affiliate links; see our <a href="/disclosure.html">advertising and affiliate disclosure</a>.</p>
    <p><a href="/contact.html">Contact LoansFlow</a></p>
  </main>`;
fs.writeFileSync(path.join(PUB, 'author.html'), head2 + main + tail);
console.log('wrote author.html');
