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
    jobTitle: 'Certified Public Accountant', knowsAbout: ["SBA loans", "Small business financing", "Business valuation", "Business acquisitions", "Business succession planning", "Tax planning for small businesses", "S corporations", "C corporations", "Partnerships", "Nonprofit accounting", "Payroll tax", "Sales tax", "Business personal property tax valuation", "Payroll audits", "School audits", "Cash flow analysis", "Interim CFO services", "Negotiations", "Permitting", "Multi-state taxation", "Research and development tax credits"], alumniOf: { '@type': 'CollegeOrUniversity', name: 'Cal Poly Humboldt', alternateName: 'Humboldt State University' }, worksFor: { '@type': 'Organization', name: 'LoansFlow' }, url: 'https://loansflow.loan/author.html' },
};
head2 = head2.replace('</head>', `<script type="application/ld+json">\n${JSON.stringify(ld, null, 2)}\n</script>\n</head>`);
const photo = '<img class="author-icon ap-icon" src="/img/author-icon.svg" alt="Joshua Miller, CPA" width="112" height="112" decoding="async">';
const main = `<main class="legal-page author-page">
    <section class="ap-hero">
      ${photo}
      <div>
        <p class="ap-kicker">Founder and author, LoansFlow</p>
        <h1>Joshua Miller, CPA</h1>
        <p class="ap-sub">Small business financing, valuations, acquisitions and succession, from a CPA&rsquo;s point of view.</p>
        <ul class="ap-chips">
          <li>Licensed CPA, California (2009)</li>
          <li>B.S., Cal Poly Humboldt</li>
          <li>Nearly two decades in public accounting</li>
        </ul>
      </div>
    </section>
    <p class="ap-lede">Joshua works with owner-operated and closely held businesses on the money decisions that matter most: how to finance growth, how to buy or sell a company, what a business is worth, how it passes to the next owner, and what it all means for the tax return and the cash flow behind it. He holds a Bachelor of Science from Cal Poly Humboldt (formerly Humboldt State University) and founded LoansFlow to put that practical, numbers-first view in front of borrowers before they sit down with a lender.</p>
    <h2>What he helps with</h2>
    <div class="ap-grid">
      <a class="ap-card" href="/guides/dscr-cpa-view.html"><h3>Financing and cash flow</h3><p>Lenders approve loans on cash flow. Clean statements, a clear debt schedule and an honest coverage ratio, prepared the way a lender will read them.</p></a>
      <a class="ap-card" href="/guides/owner-add-backs-ebitda.html"><h3>Valuations</h3><p>A defensible earnings figure, adjusted for owner pay, personal expenses and one-time items, with every adjustment documented.</p></a>
      <a class="ap-card" href="/calculators/business-acquisition.html"><h3>Acquisitions</h3><p>Equity, seller notes, price allocation and cash at closing: the questions a standard loan never raises.</p></a>
      <a class="ap-card" href="/loans/sba-7a.html"><h3>Succession and life events</h3><p>Retirement, a partner&rsquo;s exit, a family transition, or a death, disability, divorce or estate plan that forces a decision about the business.</p></a>
      <a class="ap-card" href="/guides/sba-loan-interest-tax-treatment.html"><h3>Tax planning for owners</h3><p>S corporations, C corporations, partnerships and nonprofits; multi-state businesses; research credits; and how structure changes the result of a loan or a deal.</p></a>
      <a class="ap-card" href="/methodology.html"><h3>Management and advisory</h3><p>Temporary and interim CFO work, negotiations, and permitting work, alongside financial statements and cash flow worksheets.</p></a>
    </div>
    <h2>Breadth of experience</h2>
    <p>His practice has covered a wide range of clients and engagements, which is why the guides here look at a loan the way a lender, a buyer and a tax preparer each would.</p>
    <ul>
      <li><strong>Entity types:</strong> sole proprietors, partnerships, S corporations, C corporations and nonprofits</li>
      <li><strong>Tax:</strong> business and individual returns, payroll tax returns, sales tax, and business property tax valuations</li>
      <li><strong>Audits and payroll:</strong> payroll audits and school audits</li>
      <li><strong>Reporting:</strong> financial statements and cash flow worksheets for lenders and owners</li>
      <li><strong>Transactions:</strong> business valuations, acquisitions, successions and divorces</li>
      <li><strong>Financing and investments:</strong> loan preparation and financing, and investment help</li>
    </ul>
    <h2>How he works</h2>
    <p>Program rules, fees and limits are checked against primary sources such as SBA.gov and the IRS before they are published, and every figure carries a date. See our <a href="/editorial-policy.html">editorial policy</a> and <a href="/methodology.html">methodology</a> for how figures are sourced and updated.</p>
    <h2>Independence</h2>
    <p>LoansFlow is educational and independent. It is not a lender, broker or marketplace, and nothing on the site is an offer of credit or personalized tax, legal or financial advice. Some pages carry advertising or affiliate links; see our <a href="/disclosure.html">advertising and affiliate disclosure</a>.</p>
    <p><a class="lf-btn" href="/contact.html">Contact LoansFlow</a></p>
  </main>`;
fs.writeFileSync(path.join(PUB, 'author.html'), head2 + main + tail);
console.log('wrote author.html');
